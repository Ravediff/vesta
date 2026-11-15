const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
const NAMES = { d: 'day', h: 'hour', m: 'minute', s: 'second' };

// "10m", "2h", "1d12h" → milliseconds. Returns null if invalid.
function parseDuration(text) {
  const parts = String(text).toLowerCase().replace(/\s+/g, '').match(/\d+[smhdw]/g);
  if (!parts || parts.join('') !== String(text).toLowerCase().replace(/\s+/g, '')) return null;
  return parts.reduce((ms, part) => ms + Number(part.slice(0, -1)) * UNITS[part.slice(-1)], 0);
}

// 90061000 → "1 day, 1 hour, 1 minute"
function formatDuration(ms) {
  const out = [];
  for (const unit of ['d', 'h', 'm', 's']) {
    const n = Math.floor(ms / UNITS[unit]);
    if (n > 0) {
      out.push(`${n} ${NAMES[unit]}${n === 1 ? '' : 's'}`);
      ms -= n * UNITS[unit];
    }
  }
  return out.slice(0, 3).join(', ') || '0 seconds';
}

module.exports = { parseDuration, formatDuration };
