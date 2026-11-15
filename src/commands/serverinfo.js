const { SlashCommandBuilder, EmbedBuilder, InteractionContextType, ChannelType } = require('discord.js');
const { colors } = require('../config');

module.exports = {
  category: 'Utility',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server')
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const { guild } = interaction;
    const channels = guild.channels.cache;
    const created = Math.floor(guild.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(colors.brand)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: String(guild.memberCount), inline: true },
        { name: 'Created', value: `<t:${created}:D> (<t:${created}:R>)`, inline: true },
        {
          name: 'Channels',
          value:
            `💬 ${channels.filter(c => c.type === ChannelType.GuildText).size} text · ` +
            `🔊 ${channels.filter(c => c.type === ChannelType.GuildVoice).size} voice`,
          inline: true
        },
        { name: 'Roles', value: String(guild.roles.cache.size - 1), inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0} (tier ${guild.premiumTier})`, inline: true }
      )
      .setFooter({ text: `ID: ${guild.id}` });

    if (guild.description) embed.setDescription(guild.description);
    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
};
