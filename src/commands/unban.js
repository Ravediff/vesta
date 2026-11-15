const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { modLog } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setContexts(InteractionContextType.Guild)
    .addStringOption(o => o.setName('user_id').setDescription('The banned user’s ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setMaxLength(500)),

  // Suggests banned users as you type.
  async autocomplete(interaction) {
    const query = interaction.options.getFocused().toLowerCase();
    const bans = await interaction.guild.bans.fetch({ limit: 1000 }).catch(() => null);
    if (!bans) return interaction.respond([]);
    return interaction.respond(
      bans
        .filter(b => b.user.username.toLowerCase().includes(query) || b.user.id.includes(query))
        .first(25)
        .map(b => ({ name: `${b.user.username} (${b.user.id})`, value: b.user.id }))
    );
  },

  async execute(interaction) {
    const id = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason') ?? 'No reason given';
    if (!/^\d{17,20}$/.test(id)) return replyError(interaction, 'That isn’t a valid user ID.');

    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) return replyError(interaction, 'That user isn’t banned.');

    await interaction.guild.members.unban(id, `${reason} (by ${interaction.user.tag})`);
    await modLog(interaction.guild, { action: 'Unban', target: ban.user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [success(`Unbanned **${ban.user.tag}**.`)] });
  }
};
