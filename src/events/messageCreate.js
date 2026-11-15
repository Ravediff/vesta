const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const levels = require('../lib/levels');
const store = require('../lib/store');
const log = require('../lib/logger');
const { xp: xpConfig, colors } = require('../config');

const cooldowns = new Map(); // "guildId:userId" → last award time

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.inGuild() || message.system) return;

    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    if (now - (cooldowns.get(key) ?? 0) < xpConfig.cooldownMs) return;
    cooldowns.set(key, now);

    const gained = xpConfig.min + Math.floor(Math.random() * (xpConfig.max - xpConfig.min + 1));
    const { before, after } = levels.addXp(message.guildId, message.author.id, gained);
    if (after <= before) return;

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    const newRoles = member ? await levels.syncLevelRoles(member) : [];

    const cfg = store.guild(message.guildId).config;
    if (!cfg.levelUpEnabled) return;

    const channel = (cfg.levelUpChannel && message.guild.channels.cache.get(cfg.levelUpChannel)) || message.channel;
    const me = message.guild.members.me;
    if (!channel.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) return;

    const embed = new EmbedBuilder()
      .setColor(colors.brand)
      .setAuthor({ name: message.member?.displayName ?? message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(
        `🎉 ${message.author} reached **level ${after}**!` +
        (newRoles.length ? `\nUnlocked: ${newRoles.map(id => `<@&${id}>`).join(' ')}` : '')
      );

    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(err =>
      log.warn(`Could not send level-up message: ${err.message}`)
    );
  }
};

// Drop stale cooldown entries every 10 minutes so the map can't grow forever.
setInterval(() => {
  const cutoff = Date.now() - xpConfig.cooldownMs;
  for (const [key, time] of cooldowns) if (time < cutoff) cooldowns.delete(key);
}, 600_000).unref();
