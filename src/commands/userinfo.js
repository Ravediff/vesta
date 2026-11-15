const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const { colors } = require('../config');
const levels = require('../lib/levels');
const store = require('../lib/store');

module.exports = {
  category: 'Utility',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a member')
    .addUserOption(o => o.setName('user').setDescription('Who to look up (default: you)'))
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.options.getMember('user') ?? (user.id === interaction.user.id ? interaction.member : null);
    const ts = t => `<t:${Math.floor(t / 1000)}:D> (<t:${Math.floor(t / 1000)}:R>)`;

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || colors.brand)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields({ name: 'Account created', value: ts(user.createdTimestamp) });

    if (member) {
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `${r}`);
      const stats = store.guild(interaction.guild.id).users[user.id];
      const { level } = levels.progress(stats?.total ?? 0);
      const warnings = store.guild(interaction.guild.id).warnings[user.id]?.length ?? 0;

      embed.addFields(
        { name: 'Joined server', value: ts(member.joinedTimestamp) },
        { name: 'Level', value: String(level), inline: true },
        { name: 'Rank', value: `#${levels.rankOf(interaction.guild.id, user.id) ?? '–'}`, inline: true },
        { name: 'Warnings', value: String(warnings), inline: true },
        {
          name: `Roles (${roles.length})`,
          value: roles.length ? roles.slice(0, 20).join(' ') + (roles.length > 20 ? ' …' : '') : 'None'
        }
      );
    } else {
      embed.setDescription('Not a member of this server.');
    }

    embed.setFooter({ text: `ID: ${user.id}` });
    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
};
