// Pixel-style image cards (welcome, goodbye, rank), drawn with canvas.
const { createCanvas, loadImage } = require('canvas');
const log = require('./logger');

const BG = '#0f172a';
const PANEL = '#1e293b';
const TEXT = '#ffffff';
const MUTED = '#94a3b8';
const FONT = 'monospace';

// Shortens text with "…" until it fits in maxWidth pixels.
function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + '…';
}

function frame(ctx, w, h, color, thickness) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, thickness);
  ctx.fillRect(0, h - thickness, w, thickness);
  ctx.fillRect(0, 0, thickness, h);
  ctx.fillRect(w - thickness, 0, thickness, h);
}

// Avatar with a square pixel border; a solid block if the image can't load.
async function avatar(ctx, user, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 6, y - 6, size + 12, size + 12);
  try {
    const image = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(image, x, y, size, size);
  } catch (err) {
    log.warn(`Could not load avatar for ${user.tag}: ${err.message}`);
    ctx.fillStyle = PANEL;
    ctx.fillRect(x, y, size, size);
  }
}

async function memberCard(member, { title, color, subtitle }) {
  const w = 800;
  const h = 300;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  frame(ctx, w, h, color, 12);
  await avatar(ctx, member.user, 60, 70, 160, color);

  ctx.fillStyle = color;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(title, 270, 110);

  ctx.fillStyle = TEXT;
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText(fitText(ctx, member.displayName, 480), 270, 165);

  ctx.fillStyle = MUTED;
  ctx.font = `22px ${FONT}`;
  ctx.fillText(fitText(ctx, subtitle, 480), 270, 210);

  return canvas.toBuffer('image/png');
}

async function rankCard(member, { level, xp, needed, rank, total }) {
  const w = 900;
  const h = 260;
  const accent = '#22c55e';
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  frame(ctx, w, h, accent, 10);
  await avatar(ctx, member.user, 50, 50, 160, accent);

  ctx.fillStyle = TEXT;
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText(fitText(ctx, member.displayName, 380), 250, 85);

  // Rank and level, right-aligned
  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  ctx.font = `22px ${FONT}`;
  ctx.fillText(`RANK #${rank ?? '-'}   LEVEL`, w - 120, 85);
  ctx.fillStyle = accent;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(String(level), w - 45, 88);
  ctx.textAlign = 'left';

  // Progress bar made of pixel blocks
  const barX = 250;
  const barY = 130;
  const barW = w - barX - 45;
  const barH = 34;
  ctx.fillStyle = PANEL;
  ctx.fillRect(barX, barY, barW, barH);

  const filled = Math.round((barW - 8) * Math.min(1, xp / needed));
  const block = 14;
  ctx.fillStyle = accent;
  for (let x = 0; x + block <= filled; x += block + 2) {
    ctx.fillRect(barX + 4 + x, barY + 4, block, barH - 8);
  }

  ctx.fillStyle = MUTED;
  ctx.font = `20px ${FONT}`;
  ctx.fillText(`${xp} / ${needed} XP`, barX, barY + 70);
  ctx.textAlign = 'right';
  ctx.fillText(`${total} total XP`, w - 45, barY + 70);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { memberCard, rankCard };
