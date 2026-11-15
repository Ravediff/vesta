// Weekly (Sunday) and monthly (1st) leaderboard resets. Compares against the
// last period reset, so a reset is never skipped (bot offline at midnight)
// or done twice.
const store = require('./store');
const log = require('./logger');

const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function weekKey(now) {
  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return dateKey(sunday);
}
const monthKey = now => `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

function resetField(field) {
  for (const id of store.allGuildIds()) {
    for (const user of Object.values(store.guild(id).users)) user[field] = 0;
    store.save(id);
  }
}

function checkResets(now = new Date()) {
  const { meta } = store;
  const week = weekKey(now);
  const month = monthKey(now);
  let changed = false;

  if (meta.week !== week) {
    if (meta.week !== null) {
      resetField('weekly');
      log.info('Weekly leaderboard reset');
    }
    meta.week = week;
    changed = true;
  }

  if (meta.month !== month) {
    if (meta.month !== null) {
      resetField('monthly');
      log.info('Monthly leaderboard reset');
    }
    meta.month = month;
    changed = true;
  }

  if (changed) {
    store.saveMeta();
    store.flush();
  }
}

module.exports = { checkResets, weekKey, monthKey };
