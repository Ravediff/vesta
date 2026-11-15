const { Events } = require('discord.js');
const levels = require('../lib/levels');
const store = require('../lib/store');
const { handleLevelUp } = require('../lib/levelup');
const { xp: xpConfig } = require('../config');

const cooldowns = new Map(); // "guildId:userId" → last award time

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.inGuild() || message.system) return;

    // Every message counts towards the stats on the rank card.
    levels.getUser(message.guildId, message.author.id).messages++;
    store.save(message.guildId);

    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    if (now - (cooldowns.get(key) ?? 0) < xpConfig.cooldownMs) return;
    cooldowns.set(key, now);

    const gained = xpConfig.min + Math.floor(Math.random() * (xpConfig.max - xpConfig.min + 1));
    const { before, after } = levels.addXp(message.guildId, message.author.id, gained);
    if (after <= before) return;

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (member) await handleLevelUp(member, before, after, message.channel);
  }
};

// Drop stale cooldown entries every 10 minutes so the map can't grow forever.
setInterval(() => {
  const cutoff = Date.now() - xpConfig.cooldownMs;
  for (const [key, time] of cooldowns) if (time < cutoff) cooldowns.delete(key);
}, 600_000).unref();
