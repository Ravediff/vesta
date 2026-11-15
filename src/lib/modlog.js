const { EmbedBuilder } = require('discord.js');
const store = require('./store');
const log = require('./logger');
const { colors } = require('../config');

const ACTION_COLORS = {
  Warn: colors.warning,
  Timeout: colors.warning,
  'Timeout removed': colors.info,
  Kick: colors.error,
  Ban: colors.error,
  Unban: colors.info,
  Purge: colors.muted,
  'Warnings cleared': colors.info
};

// Posts a moderation action to the server's mod-log channel, if one is set.
async function modLog(guild, { action, target, moderator, reason, extra }) {
  const channelId = store.guild(guild.id).config.modLogChannel;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[action] ?? colors.muted)
    .setTitle(action)
    .addFields({ name: 'Moderator', value: `${moderator} (${moderator.id})`, inline: true })
    .setTimestamp();

  if (target) {
    embed.addFields({ name: 'User', value: `${target} (${target.id})`, inline: true });
    if (target.displayAvatarURL) embed.setThumbnail(target.displayAvatarURL());
  }
  if (extra) embed.addFields({ name: 'Details', value: extra });
  embed.addFields({ name: 'Reason', value: reason || 'No reason given' });

  try {
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (err) {
    log.warn(`Could not post to mod log in ${guild.name}: ${err.message}`);
  }
}

// Checks role hierarchy before a moderator acts on a member. Returns an error string or null.
function checkHierarchy(interaction, target, action) {
  const { guild, member: moderator } = interaction;
  if (!target) return null; // user isn't in the server (e.g. ban by ID)
  if (target.id === moderator.id) return `You can't ${action} yourself.`;
  if (target.id === guild.ownerId) return `You can't ${action} the server owner.`;
  if (target.id === interaction.client.user.id) return `I can't ${action} myself.`;
  if (
    moderator.id !== guild.ownerId &&
    target.roles.highest.position >= moderator.roles.highest.position
  ) {
    return `You can't ${action} someone with a role equal to or higher than yours.`;
  }
  if (target.roles.highest.position >= guild.members.me.roles.highest.position) {
    return `I can't ${action} ${target.user.username} — their highest role is above or equal to mine. Move my role higher in Server Settings → Roles.`;
  }
  return null;
}

// Tries to DM a user about an action; silently skips if their DMs are closed.
async function notify(user, guild, text) {
  try {
    await user.send({
      embeds: [new EmbedBuilder().setColor(colors.warning).setTitle(guild.name).setDescription(text)]
    });
    return true;
  } catch {
    return false;
  }
}

module.exports = { modLog, checkHierarchy, notify };
