const { Events, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const store = require('../lib/store');
const log = require('../lib/logger');
const config = require('../config');
const { goodbyeCard } = require('../lib/cards');
const { logEmbed } = require('../lib/modlog');

// Leave entry for the mod log: how long they stayed and which roles they had.
function leaveLog(member) {
  const roles = member.roles?.cache
    ?.filter(r => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map(r => `${r}`) ?? [];

  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setAuthor({ name: `${member.user.tag} left`, iconURL: member.user.displayAvatarURL() })
    .setDescription(`${member} · ${member.guild.memberCount} members now`)
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();

  if (member.joinedTimestamp) {
    const joined = Math.floor(member.joinedTimestamp / 1000);
    embed.addFields({ name: 'Joined', value: `<t:${joined}:D> (<t:${joined}:R>)` });
  }
  if (roles.length) {
    embed.addFields({ name: `Roles (${roles.length})`, value: roles.slice(0, 20).join(' ') + (roles.length > 20 ? ' …' : '') });
  }
  return embed;
}

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await logEmbed(member.guild, leaveLog(member));
    if (member.user.bot) return;

    const cfg = store.guild(member.guild.id).config;
    const channelId = cfg.leaveChannel ?? config.defaultLeaveChannel;
    const channel = channelId && member.guild.channels.cache.get(channelId);
    if (!channel) return;

    try {
      const image = await goodbyeCard(member);
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
