require('dotenv').config({ quiet: true });
const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  token: process.env.TOKEN,

  // Optional fallbacks used until a server sets its own channels with /config.
  defaultWelcomeChannel: process.env.WELCOME_CHANNEL_ID || null,
  defaultLeaveChannel: process.env.LEAVE_CHANNEL_ID || null,

  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
  legacyXpFile: path.join(ROOT, 'xp.json'),

  colors: {
    brand: 0x22c55e,
    success: 0x22c55e,
    error: 0xef4444,
    warning: 0xf59e0b,
    info: 0x3b82f6,
    muted: 0x64748b
  },

  xp: {
    cooldownMs: 30_000, // one XP award per user per 30 seconds
    min: 10,
    max: 20
  }
};
