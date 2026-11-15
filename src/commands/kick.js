const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { modLog, checkHierarchy, notify } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Remove a member from the server (they can rejoin with an invite)')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setContexts(InteractionContextType.Guild)
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setMaxLength(500)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason given';
    if (!member) return replyError(interaction, 'That user isn’t in this server.');

    const problem = checkHierarchy(interaction, member, 'kick');
    if (problem) return replyError(interaction, problem);
    if (!member.kickable) return replyError(interaction, `I can’t kick ${member.user.username}.`);

    // DM first — after the kick we no longer share a server with them.
    await notify(member.user, interaction.guild, `👢 You were kicked.\n**Reason:** ${reason}`);
    await member.kick(`${reason} (by ${interaction.user.tag})`);
    await modLog(interaction.guild, { action: 'Kick', target: member.user, moderator: interaction.user, reason });

    return interaction.reply({ embeds: [success(`Kicked **${member.user.tag}**.`)] });
  }
};
