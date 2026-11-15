const { SlashCommandBuilder, EmbedBuilder, InteractionContextType, PermissionsBitField } = require('discord.js');
const { colors } = require('../config');

const ORDER = ['Levels', 'Utility', 'Moderation', 'Admin'];

module.exports = {
  category: 'Utility',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List everything Vesta can do')
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const perms = interaction.memberPermissions;
    const ids = interaction.client.commandIds.get(interaction.guild.id) ?? new Map();
    const groups = {};

    for (const command of interaction.client.commands.values()) {
      // Only show commands this member is allowed to use.
      const required = command.data.default_member_permissions;
      if (required && !perms.has(new PermissionsBitField(BigInt(required)))) continue;

      // Clickable command mention if we know its ID, plain text otherwise.
      const id = ids.get(command.data.name);
      const name = id ? `</${command.data.name}:${id}>` : `\`/${command.data.name}\``;
      (groups[command.category] ??= []).push(`${name} — ${command.data.description}`);
    }

    const embed = new EmbedBuilder()
      .setColor(colors.brand)
      .setAuthor({ name: 'Vesta', iconURL: interaction.client.user.displayAvatarURL() })
      .setDescription('Chat to earn XP and level up. Here are my commands:')
      .setFooter({ text: `${interaction.guild.name}` });

    for (const category of ORDER) {
      if (groups[category]) embed.addFields({ name: category, value: groups[category].join('\n') });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
