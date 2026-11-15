const store = require('./store');
const log = require('./logger');

// XP needed to go from `level` to `level + 1` (same curve the bot always used).
const neededFor = level => level * 100;

// Players are stored as a lifetime total; level and progress are derived from it.
function progress(total) {
  let level = 1;
  let xp = total;
  while (xp >= neededFor(level)) {
    xp -= neededFor(level);
    level++;
  }
  return { level, xp, needed: neededFor(level) };
}

function getUser(guildId, userId) {
  const data = store.guild(guildId);
  if (!data.users[userId]) data.users[userId] = { total: 0, weekly: 0, monthly: 0 };
  return data.users[userId];
}

// Adds (or removes, if negative) XP. Returns { before, after } levels.
function addXp(guildId, userId, amount, { counts = true } = {}) {
  const user = getUser(guildId, userId);
  const before = progress(user.total).level;

  user.total = Math.max(0, user.total + amount);
  if (counts) {
    user.weekly = Math.max(0, user.weekly + amount);
    user.monthly = Math.max(0, user.monthly + amount);
  }

  store.save(guildId);
  return { before, after: progress(user.total).level };
}

function setTotal(guildId, userId, total) {
  const user = getUser(guildId, userId);
  user.total = Math.max(0, total);
  store.save(guildId);
}

const PERIODS = { all: 'total', weekly: 'weekly', monthly: 'monthly' };

function leaderboard(guildId, period = 'all') {
  const field = PERIODS[period] || 'total';
  return Object.entries(store.guild(guildId).users)
    .filter(([, u]) => u[field] > 0)
    .sort((a, b) => b[1][field] - a[1][field])
    .map(([id, u]) => ({ id, value: u[field], ...progress(u.total) }));
}

function rankOf(guildId, userId) {
  const index = leaderboard(guildId).findIndex(entry => entry.id === userId);
  return index === -1 ? null : index + 1;
}

// Gives every reward role the member has reached. Safe to call any time.
async function syncLevelRoles(member) {
  const { levelRoles } = store.guild(member.guild.id).config;
  const { level } = progress(getUser(member.guild.id, member.id).total);

  const earned = Object.entries(levelRoles)
    .filter(([needed, roleId]) => level >= Number(needed) && !member.roles.cache.has(roleId))
    .map(([, roleId]) => roleId)
    .filter(roleId => member.guild.roles.cache.has(roleId));

  if (earned.length === 0) return [];
  try {
    await member.roles.add(earned, `Reached level ${level}`);
    return earned;
  } catch (err) {
    log.warn(`Could not give level roles in ${member.guild.name}: ${err.message}`);
    return [];
  }
}

module.exports = { neededFor, progress, getUser, addXp, setTotal, leaderboard, rankOf, syncLevelRoles };
