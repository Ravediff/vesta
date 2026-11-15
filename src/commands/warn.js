const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const store = require('../lib/store');
const { modLog, checkHierarchy, notify } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (they get a DM and it is recorded)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild)
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setRequired(true).setMaxLength(500)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');
    if (!member) return replyError(interaction, 'That user isn’t in this server.');
    if (member.user.bot) return replyError(interaction, 'You can’t warn a bot.');

    const problem = checkHierarchy(interaction, member, 'warn');
    if (problem) return replyError(interaction, problem);

    const data = store.guild(interaction.guild.id);
    const id = data.nextCaseId++;
    (data.warnings[member.id] ??= []).push({
      id,
      reason,
      moderator: interaction.user.id,
      at: Date.now()
    });
    store.save(interaction.guild.id);

    const count = data.warnings[member.id].length;
    const dmed = await notify(member.user, interaction.guild, `⚠️ You were warned.\n**Reason:** ${reason}`);
    await modLog(interaction.guild, {
      action: 'Warn', target: member.user, moderator: interaction.user, reason,
      extra: `Case #${id} · ${count} warning${count === 1 ? '' : 's'} total`
    });

    return interaction.reply({
      embeds: [success(
        `Warned ${member} (case #${id}). They now have **${count}** warning${count === 1 ? '' : 's'}.` +
        (dmed ? '' : '\n-# Couldn’t DM them — their DMs are closed.')
      )],
      allowedMentions: { parse: [] }
    });
  }
};
