const { Events, AttachmentBuilder } = require('discord.js');
const store = require('../lib/store');
const log = require('../lib/logger');
const config = require('../config');
const { memberCard } = require('../lib/cards');

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

module.exports = {
  name: Events.GuildMemberAdd,
  giveAutoRole,
  async execute(member) {
    // Members still on the rules screen get the role once they accept (see guildMemberUpdate).
    if (!member.pending) await giveAutoRole(member);
    if (member.user.bot) return;

    const cfg = store.guild(member.guild.id).config;
    const channelId = cfg.welcomeChannel ?? config.defaultWelcomeChannel;
    const channel = channelId && member.guild.channels.cache.get(channelId);
    if (!channel) return;

    try {
      const image = await memberCard(member, {
        title: 'WELCOME',
        color: '#22c55e',
        subtitle: `member #${member.guild.memberCount} of ${member.guild.name}`
      });
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
