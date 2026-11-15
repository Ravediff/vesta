const { Events, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const store = require('../lib/store');
const log = require('../lib/logger');
const config = require('../config');
const { welcomeCard } = require('../lib/cards');
const { logEmbed } = require('../lib/modlog');

const NEW_ACCOUNT_DAYS = 7;

// Gives the auto-role. Exported so guildMemberUpdate can use it once a member
// finishes the server's rules screening.
async function giveAutoRole(member) {
  const roleId = store.guild(member.guild.id).config.autoRole;
  if (!roleId || member.roles.cache.has(roleId)) return;
  try {
    await member.roles.add(roleId, 'Auto-role for new members');
  } catch (err) {
    log.warn(`Could not give auto-role in ${member.guild.name}: ${err.message}`);
  }
}

// Join entry for the mod log, flagging brand-new accounts (often alts or spam).
function joinLog(member) {
  const created = Math.floor(member.user.createdTimestamp / 1000);
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  const isNew = ageDays < NEW_ACCOUNT_DAYS;

  return new EmbedBuilder()
    .setColor(isNew ? config.colors.warning : config.colors.success)
    .setAuthor({ name: `${member.user.tag} joined`, iconURL: member.user.displayAvatarURL() })
    .setDescription(
      `${member} · member #${member.guild.memberCount}` +
      (member.user.bot ? '\n🤖 This is a bot.' : '') +
      (isNew ? `\n⚠️ **New account** — created ${Math.floor(ageDays * 24)} hours ago.` : '')
    )
    .addFields({ name: 'Account created', value: `<t:${created}:D> (<t:${created}:R>)` })
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();
}

module.exports = {
  name: Events.GuildMemberAdd,
  giveAutoRole,
  async execute(member) {
    await logEmbed(member.guild, joinLog(member));

    // Members still on the rules screen get the role once they accept (see guildMemberUpdate).
    if (!member.pending) await giveAutoRole(member);
    if (member.user.bot) return;

    const cfg = store.guild(member.guild.id).config;
    const channelId = cfg.welcomeChannel ?? config.defaultWelcomeChannel;
    const channel = channelId && member.guild.channels.cache.get(channelId);
    if (!channel) return;

    try {
      const image = await welcomeCard(member);
      await channel.send({
        content: `Welcome to **${member.guild.name}**, ${member}! 👋`,
        files: [new AttachmentBuilder(image, { name: 'welcome.png' })],
        allowedMentions: { users: [member.id] }
      });
    } catch (err) {
      log.warn(`Could not send welcome card in ${member.guild.name}: ${err.message}`);
    }
  }
};
