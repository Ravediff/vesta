// What happens when a member levels up (from chat or voice): give reward
// roles, then post a level-up card.
const { AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const levels = require('./levels');
const store = require('./store');
const log = require('./logger');
const { levelUpCard } = require('./cards');

// fallbackChannel: where to post if no level-up channel is set (e.g. the chat
// channel they leveled up in). For voice there is none, so it's skipped.
async function handleLevelUp(member, from, to, fallbackChannel = null) {
  const newRoleIds = await levels.syncLevelRoles(member);

  const cfg = store.guild(member.guild.id).config;
  if (!cfg.levelUpEnabled) return;

  const channel = (cfg.levelUpChannel && member.guild.channels.cache.get(cfg.levelUpChannel)) || fallbackChannel;
  if (!channel) return;

  const perms = channel.permissionsFor(member.guild.members.me);
  if (!perms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles])) return;

  try {
    const unlocked = newRoleIds.map(id => member.guild.roles.cache.get(id)?.name).filter(Boolean);
    const image = await levelUpCard(member, { from, to, unlocked });
    await channel.send({
      content:
        `🎉 ${member} reached **level ${to}**!` +
        (newRoleIds.length ? ` Unlocked ${newRoleIds.map(id => `<@&${id}>`).join(' ')}` : ''),
      files: [new AttachmentBuilder(image, { name: 'level-up.png' })],
      allowedMentions: { parse: [] }
    });
  } catch (err) {
    log.warn(`Could not send level-up card in ${member.guild.name}: ${err.message}`);
  }
}

module.exports = { handleLevelUp };
