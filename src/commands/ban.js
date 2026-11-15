const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { modLog, checkHierarchy, notify } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setContexts(InteractionContextType.Guild)
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setMaxLength(500))
    .addIntegerOption(o =>
      o.setName('delete_messages').setDescription('Also delete their recent messages').addChoices(
        { name: 'Don’t delete any', value: 0 },
        { name: 'Last hour', value: 3600 },
        { name: 'Last 24 hours', value: 86400 },
        { name: 'Last 7 days', value: 604800 }
      )
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason given';
    const deleteMessageSeconds = interaction.options.getInteger('delete_messages') ?? 0;

    if (member) {
      const problem = checkHierarchy(interaction, member, 'ban');
      if (problem) return replyError(interaction, problem);
      if (!member.bannable) return replyError(interaction, `I can’t ban ${user.username}.`);
      await notify(user, interaction.guild, `🔨 You were banned.\n**Reason:** ${reason}`);
    } else if (user.id === interaction.user.id) {
      return replyError(interaction, 'You can’t ban yourself.');
    }

    await interaction.guild.members.ban(user, {
      reason: `${reason} (by ${interaction.user.tag})`,
      deleteMessageSeconds
    });
    await modLog(interaction.guild, { action: 'Ban', target: user, moderator: interaction.user, reason });

    return interaction.reply({ embeds: [success(`Banned **${user.tag}**.`)] });
  }
};
