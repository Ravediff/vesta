const { Events, AttachmentBuilder } = require('discord.js');
const store = require('../lib/store');
const log = require('../lib/logger');
const config = require('../config');
const { memberCard } = require('../lib/cards');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user.bot) return;

    const cfg = store.guild(member.guild.id).config;
    const channelId = cfg.leaveChannel ?? config.defaultLeaveChannel;
    const channel = channelId && member.guild.channels.cache.get(channelId);
    if (!channel) return;

    try {
      const image = await memberCard(member, {
        title: 'GOODBYE',
        color: '#ef4444',
        subtitle: `${member.guild.name} now has ${member.guild.memberCount} members`
      });
      await channel.send({
        content: `**${member.user.username}** left the server.`,
        files: [new AttachmentBuilder(image, { name: 'goodbye.png' })],
        allowedMentions: { parse: [] }
      });
    } catch (err) {
      log.warn(`Could not send goodbye card in ${member.guild.name}: ${err.message}`);
    }
  }
};
