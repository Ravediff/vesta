// Retro pixel-art image cards: welcome, goodbye, rank and level-up.
const { createCanvas, loadImage } = require('canvas');
const pixel = require('./pixelfont');
const log = require('./logger');

const C = {
  bgTop: '#0a0f1f',
  bgBottom: '#141d3a',
  panel: '#1b2547',
  panelDark: '#0f1630',
  text: '#ffffff',
  muted: '#8b9bb4',
  shadow: '#05070f'
};

const ACCENTS = {
  welcome: '#22c55e',
  goodbye: '#ef4444',
  rank: '#22c55e',
  levelUp: '#f59e0b'
};

const NAME_FONT = '"Segoe UI", "Noto Sans", "DejaVu Sans", Arial, sans-serif';

// ---------- helpers ----------

// Lighten (amt > 0) or darken (amt < 0) a hex colour.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join('')}`;
}

// Deterministic random numbers, so a member's card always looks the same.
function rng(seedText) {
  let seed = 0;
  for (const ch of String(seedText)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Emoji often render as boxes on servers without emoji fonts; drop them.
const clean = text => String(text ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').trim();

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
  return text + '…';
}

const compact = n =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1e4 ? `${Math.round(n / 1e3)}K`
      : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
        : String(n);

function voiceTime(minutes) {
  const h = Math.floor(minutes / 60);
  return h >= 100 ? `${compact(h)}H` : h > 0 ? `${h}H ${minutes % 60}M` : `${minutes}M`;
}

async function loadSafe(url) {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch (err) {
    log.warn(`Could not load image: ${err.message}`);
    return null;
  }
}

// ---------- building blocks ----------

function background(ctx, w, h, accent, seed) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, C.bgTop);
  grad.addColorStop(1, C.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft accent glow from the left, drawn in 8px bands so it stays pixel-y.
  for (let x = 0; x < w * 0.45; x += 8) {
    ctx.globalAlpha = 0.10 * (1 - x / (w * 0.45));
    ctx.fillStyle = accent;
    ctx.fillRect(x, 0, 8, h);
  }
  ctx.globalAlpha = 1;

  // Pixel starfield
  const rand = rng(seed);
  for (let i = 0; i < 90; i++) {
    const size = rand() < 0.8 ? 2 : 4;
    ctx.globalAlpha = 0.15 + rand() * 0.55;
    ctx.fillStyle = rand() < 0.25 ? accent : '#ffffff';
    ctx.fillRect(Math.floor(rand() * w / 2) * 2, Math.floor(rand() * h / 2) * 2, size, size);
  }
  ctx.globalAlpha = 1;

  // Pixel "ground" strip along the bottom
  const strip = 14;
  for (let x = 0; x < w; x += 16) {
    const tone = rand();
    ctx.fillStyle = tone < 0.33 ? accent : tone < 0.66 ? shade(accent, -0.35) : shade(accent, -0.6);
    ctx.fillRect(x, h - strip, 16, strip);
  }
}

// Border with notched (cut) corners, like a retro game window.
function frame(ctx, w, h, accent, t = 8) {
  ctx.fillStyle = accent;
  ctx.fillRect(t, 0, w - 2 * t, t);
  ctx.fillRect(t, h - t, w - 2 * t, t);
  ctx.fillRect(0, t, t, h - 2 * t);
  ctx.fillRect(w - t, t, t, h - 2 * t);
  // corner steps
  ctx.fillRect(t, t, t, t);
  ctx.fillRect(w - 2 * t, t, t, t);
  ctx.fillRect(t, h - 2 * t, t, t);
  ctx.fillRect(w - 2 * t, h - 2 * t, t, t);
  // inner highlight
  ctx.fillStyle = shade(accent, 0.45);
  ctx.fillRect(2 * t, t, w - 4 * t, 2);
}

// Square avatar with a chunky pixel frame and drop shadow.
function avatarBox(ctx, image, x, y, size, accent) {
  const b = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x + b + 6, y + b + 6, size + b * 2, size + b * 2);

  ctx.fillStyle = accent;
  ctx.fillRect(x + b, y, size, b);
  ctx.fillRect(x + b, y + size + b, size, b);
  ctx.fillRect(x, y + b, b, size);
  ctx.fillRect(x + size + b, y + b, b, size);

  if (image) {
    ctx.drawImage(image, x + b, y + b, size, size);
  } else {
    ctx.fillStyle = C.panel;
    ctx.fillRect(x + b, y + b, size, size);
    pixel.draw(ctx, '?', x + b + size / 2, y + b + size / 2 - 21, { scale: 6, color: C.muted, align: 'center' });
  }
  // inner shine on the top-left
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + b, y + b, size, 3);
  ctx.fillRect(x + b, y + b, 3, size);
}

// Small labelled box ("chip"). Uses the pixel font when it can, else a normal font.
function chip(ctx, text, x, y, { bg = C.panel, fg = C.text, scale = 3, maxWidth = 400 } = {}) {
  const pad = scale * 3;
  const h = pixel.HEIGHT * scale + pad * 2;
  const label = String(text).toUpperCase();

  let w;
  if (pixel.supports(label) && pixel.measure(label, scale) + pad * 2 <= maxWidth) {
    w = pixel.measure(label, scale) + pad * 2;
    ctx.fillStyle = shade(bg, -0.4);
    ctx.fillRect(x + scale, y + scale, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    pixel.draw(ctx, label, x + pad, y + pad, { scale, color: fg });
  } else {
    ctx.font = `bold ${Math.round(h * 0.55)}px ${NAME_FONT}`;
    const shown = fitText(ctx, clean(text), maxWidth - pad * 2);
    w = ctx.measureText(shown).width + pad * 2;
    ctx.fillStyle = shade(bg, -0.4);
    ctx.fillRect(x + scale, y + scale, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.fillText(shown, x + pad, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
  return w;
}

function nameText(ctx, text, x, y, size, maxWidth) {
  ctx.font = `bold ${size}px ${NAME_FONT}`;
  const shown = fitText(ctx, clean(text) || 'Member', maxWidth);
  ctx.fillStyle = C.shadow;
  ctx.fillText(shown, x + 3, y + 3);
  ctx.fillStyle = C.text;
  ctx.fillText(shown, x, y);
}

const avatarOf = member => loadSafe(member.user.displayAvatarURL({ extension: 'png', size: 256 }));

// ---------- cards ----------

async function memberCard(member, { title, accent, chips }) {
  const w = 1000;
  const h = 340;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  background(ctx, w, h, accent, member.user.id);
  frame(ctx, w, h, accent);

  const [avatar, icon] = await Promise.all([
    avatarOf(member),
    loadSafe(member.guild.iconURL?.({ extension: 'png', size: 128 }))
  ]);
  avatarBox(ctx, avatar, 56, 62, 196, accent);

  const textX = 310;
  pixel.draw(ctx, title, textX, 66, { scale: 8, color: accent, shadow: C.shadow });
  nameText(ctx, member.displayName, textX, 178, 46, w - textX - 60);

  let x = textX;
  chips.forEach((c, i) => {
    x += chip(ctx, c, x, 206, { bg: i === 0 ? accent : C.panel, fg: i === 0 ? C.shadow : C.text, scale: 3, maxWidth: w - x - 50 }) + 14;
  });

  if (icon) {
    const s = 64;
    const ix = w - s - 44;
    const iy = 40;
    ctx.fillStyle = accent;
    ctx.fillRect(ix - 4, iy - 4, s + 8, s + 8);
    ctx.drawImage(icon, ix, iy, s, s);
  }

  return canvas.toBuffer('image/png');
}

function welcomeCard(member) {
  return memberCard(member, {
    title: 'WELCOME',
    accent: ACCENTS.welcome,
    chips: [`MEMBER #${member.guild.memberCount}`, member.guild.name]
  });
}

function goodbyeCard(member) {
  const chips = [];
  if (member.joinedTimestamp) {
    const days = Math.max(0, Math.floor((Date.now() - member.joinedTimestamp) / 86_400_000));
    chips.push(days === 0 ? 'LEFT ON DAY ONE' : `STAYED ${days} DAY${days === 1 ? '' : 'S'}`);
  }
  chips.push(`${member.guild.memberCount} MEMBERS NOW`);
  return memberCard(member, { title: 'GOODBYE', accent: ACCENTS.goodbye, chips });
}

// stats: { level, xp, needed, rank, total, messages, voiceMinutes, nextReward: { level, name } | null }
async function rankCard(member, stats) {
  const w = 1000;
  const h = 330;
  const accent = ACCENTS.rank;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  background(ctx, w, h, accent, member.user.id);
  frame(ctx, w, h, accent);
  const avatarSize = 176;
  avatarBox(ctx, await avatarOf(member), 48, 44, avatarSize, accent);

  const left = 300;
  const right = w - 52;

  // Level and rank, top right
  const lvlW = pixel.measure(String(stats.level), 8);
  pixel.draw(ctx, String(stats.level), right, 46, { scale: 8, color: accent, shadow: C.shadow, align: 'right' });
  pixel.draw(ctx, 'LVL', right - lvlW - 14, 74, { scale: 4, color: C.muted, align: 'right' });
  pixel.draw(ctx, `RANK #${stats.rank ?? '-'}`, right, 112, { scale: 3, color: C.text, align: 'right' });

  nameText(ctx, member.displayName, left, 96, 42, right - left - lvlW - 140);

  // Segmented XP bar
  const barY = 146;
  const barH = 36;
  const barW = right - left;
  ctx.fillStyle = C.panelDark;
  ctx.fillRect(left, barY, barW, barH);
  ctx.fillStyle = C.panel;
  ctx.fillRect(left + 4, barY + 4, barW - 8, barH - 8);

  const pct = Math.min(1, stats.xp / stats.needed);
  const seg = 12;
  const gap = 3;
  const segments = Math.floor((barW - 8 + gap) / (seg + gap));
  const lit = Math.round(segments * pct);
  for (let i = 0; i < lit; i++) {
    const x = left + 4 + i * (seg + gap);
    ctx.fillStyle = accent;
    ctx.fillRect(x, barY + 4, seg, barH - 8);
    ctx.fillStyle = shade(accent, 0.4);
    ctx.fillRect(x, barY + 4, seg, 5);
  }

  pixel.draw(ctx, `${compact(stats.xp)} / ${compact(stats.needed)} XP`, left, barY + barH + 12, { scale: 3, color: C.muted });
  pixel.draw(ctx, `${Math.floor(pct * 100)}%`, right, barY + barH + 12, { scale: 3, color: accent, align: 'right' });

  // Stat boxes
  const boxes = [
    ['MESSAGES', compact(stats.messages ?? 0)],
    ['VOICE', voiceTime(stats.voiceMinutes ?? 0)],
    ['TOTAL XP', compact(stats.total)]
  ];
  const boxY = 238;
  const boxH = 60;
  const boxW = Math.floor((barW - 2 * 14) / 3);
  boxes.forEach(([label, value], i) => {
    const x = left + i * (boxW + 14);
    ctx.fillStyle = C.panelDark;
    ctx.fillRect(x + 4, boxY + 4, boxW, boxH);
    ctx.fillStyle = C.panel;
    ctx.fillRect(x, boxY, boxW, boxH);
    ctx.fillStyle = accent;
    ctx.fillRect(x, boxY, 4, boxH);
    pixel.draw(ctx, label, x + 16, boxY + 10, { scale: 2, color: C.muted });
    pixel.draw(ctx, value, x + 16, boxY + 28, { scale: 4, color: C.text });
  });

  // Next reward hint, under the avatar
  if (stats.nextReward) {
    const cx = 48 + (avatarSize + 16) / 2; // centre under the avatar
    pixel.draw(ctx, `NEXT AT LVL ${stats.nextReward.level}`, cx, 262, { scale: 2, color: C.muted, align: 'center' });
    ctx.font = `bold 18px ${NAME_FONT}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.fillText(fitText(ctx, clean(stats.nextReward.name), 220), cx, 296);
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}

// { from, to, unlocked: [roleName] }
async function levelUpCard(member, { from, to, unlocked = [] }) {
  const w = 900;
  const h = 260;
  const accent = ACCENTS.levelUp;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  background(ctx, w, h, accent, `${member.user.id}:${to}`);
  frame(ctx, w, h, accent);
  avatarBox(ctx, await avatarOf(member), 44, 42, 150, accent);

  const left = 240;
  pixel.draw(ctx, 'LEVEL UP!', left, 46, { scale: 6, color: accent, shadow: C.shadow });
  nameText(ctx, member.displayName, left, 136, 36, 380);

  // "4 > 5" on the right
  const right = w - 56;
  const toW = pixel.measure(String(to), 10);
  pixel.draw(ctx, String(to), right, 60, { scale: 10, color: C.text, shadow: C.shadow, align: 'right' });
  pixel.draw(ctx, '>', right - toW - 22, 78, { scale: 6, color: accent, align: 'right' });
  pixel.draw(ctx, String(from), right - toW - 22 - pixel.measure('>', 6) - 22, 84, { scale: 5, color: C.muted, align: 'right' });

  let x = left;
  if (unlocked.length) {
    x += chip(ctx, 'UNLOCKED', x, 160, { bg: accent, fg: C.shadow, scale: 3 }) + 12;
    for (const name of unlocked) x += chip(ctx, name, x, 160, { scale: 3, maxWidth: w - x - 50 }) + 12;
  } else {
    chip(ctx, `NOW LEVEL ${to}`, x, 160, { bg: accent, fg: C.shadow, scale: 3 });
  }

  return canvas.toBuffer('image/png');
}

module.exports = { welcomeCard, goodbyeCard, rankCard, levelUpCard, compact, voiceTime };
