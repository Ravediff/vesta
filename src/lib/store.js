// Small JSON store: one file per server in data/guilds, plus data/meta.json.
// Writes are batched (debounced) and atomic (temp file + rename), so a crash
// can't leave a half-written file behind.
const fs = require('fs');
const path = require('path');
const { dataDir } = require('../config');
const log = require('./logger');

const GUILD_DIR = path.join(dataDir, 'guilds');
const META_FILE = path.join(dataDir, 'meta.json');
const SAVE_DELAY_MS = 5000;

fs.mkdirSync(GUILD_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    log.error(`Could not read ${file}:`, err);
  }
  return fallback;
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function defaultGuild() {
  return {
    config: {
      welcomeChannel: null,
      leaveChannel: null,
      levelUpChannel: null, // null = same channel the message was sent in
      levelUpEnabled: true,
      voiceXp: true,
      modLogChannel: null,
      autoRole: null,
      levelRoles: {} // { "5": "roleId" }
    },
    users: {}, // { userId: { total, weekly, monthly } }
    warnings: {}, // { userId: [{ id, reason, moderator, at }] }
    nextCaseId: 1
  };
}

// Fill in any fields added in newer versions so old files keep working.
function withDefaults(data) {
  const base = defaultGuild();
  return {
    ...base,
    ...data,
    config: { ...base.config, ...(data.config || {}) }
  };
}

const guilds = new Map();
const dirty = new Set();
let saveTimer = null;

for (const file of fs.readdirSync(GUILD_DIR)) {
  if (!file.endsWith('.json')) continue;
  const id = file.slice(0, -5);
  guilds.set(id, withDefaults(readJson(path.join(GUILD_DIR, file), {})));
}

const meta = readJson(META_FILE, { week: null, month: null, legacyMigrated: false });

function guild(id) {
  if (!guilds.has(id)) guilds.set(id, defaultGuild());
  return guilds.get(id);
}

function save(id) {
  dirty.add(id);
  if (!saveTimer) saveTimer = setTimeout(flush, SAVE_DELAY_MS);
}

function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  for (const id of dirty) {
    try {
      writeJsonAtomic(path.join(GUILD_DIR, `${id}.json`), guilds.get(id));
    } catch (err) {
      log.error(`Could not save guild ${id}:`, err);
    }
  }
  dirty.clear();
}

function saveMeta() {
  writeJsonAtomic(META_FILE, meta);
}

module.exports = {
  guild,
  save,
  flush,
  meta,
  saveMeta,
  allGuildIds: () => [...guilds.keys()],
  readJson
};
