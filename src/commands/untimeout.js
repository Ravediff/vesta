const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { modLog } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('End a member’s timeout early')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild)
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setMaxLength(500)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason given';
    if (!member) return replyError(interaction, 'That user isn’t in this server.');
    if (!member.isCommunicationDisabled()) return replyError(interaction, `${member.user.username} isn’t timed out.`);
    if (!member.moderatable) return replyError(interaction, `I can’t change ${member.user.username}’s timeout.`);

    await member.timeout(null, `${reason} (by ${interaction.user.tag})`);
    await modLog(interaction.guild, { action: 'Timeout removed', target: member.user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [success(`Removed the timeout for ${member}.`)], allowedMentions: { parse: [] } });
  }
};
