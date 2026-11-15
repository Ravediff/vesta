// One-time import of the old root xp.json (from before per-server data).
// The old file is left untouched.
const fs = require('fs');
const store = require('./store');
const log = require('./logger');
const { legacyXpFile } = require('../config');

function migrateLegacyXp(client) {
  if (store.meta.legacyMigrated || !fs.existsSync(legacyXpFile)) return;

  const legacy = store.readJson(legacyXpFile, {});
  const entries = Object.entries(legacy).filter(([, u]) => u && typeof u === 'object');
  if (entries.length === 0) {
    store.meta.legacyMigrated = true;
    store.saveMeta();
    return;
  }

  // Old data wasn't per-server, so it needs exactly one target server.
  const guildId = process.env.GUILD_ID || (client.guilds.cache.size === 1 ? client.guilds.cache.first().id : null);
  if (!guildId) {
    log.warn('Old xp.json found but Vesta is in several servers. Set GUILD_ID in .env to import it.');
    return;
  }

  const users = store.guild(guildId).users;
  let imported = 0;
  for (const [userId, old] of entries) {
    if (users[userId]) continue;
    const level = old.level ?? 1;
    users[userId] = {
      total: old.total ?? (100 * (level - 1) * level) / 2 + (old.xp ?? 0),
      weekly: old.weekly ?? 0,
      monthly: old.monthly ?? 0
    };
    imported++;
  }

  store.save(guildId);
  store.flush();
  store.meta.legacyMigrated = true;
  store.saveMeta();
  log.info(`Imported ${imported} members from the old xp.json`);
}

module.exports = { migrateLegacyXp };
