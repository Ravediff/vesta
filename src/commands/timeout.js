const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { modLog, checkHierarchy, notify } = require('../lib/modlog');
const { parseDuration, formatDuration } = require('../lib/time');
const { success, replyError } = require('../lib/embeds');

const MAX_MS = 28 * 86_400_000; // Discord's limit

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Stop a member from chatting or speaking for a while')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild)
    .addUserOption(o => o.setName('user').setDescription('Member to time out').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('e.g. 10m, 1h, 1d (max 28d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setMaxLength(500)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason given';
    const ms = parseDuration(interaction.options.getString('duration'));

    if (!member) return replyError(interaction, 'That user isn’t in this server.');
    if (!ms) return replyError(interaction, 'Invalid duration. Use something like `10m`, `2h`, `1d` or `1h30m`.');
    if (ms > MAX_MS) return replyError(interaction, 'Timeouts can be at most 28 days.');

    const problem = checkHierarchy(interaction, member, 'time out');
    if (problem) return replyError(interaction, problem);
    if (!member.moderatable) return replyError(interaction, `I can’t time out ${member.user.username}.`);

    const length = formatDuration(ms);
    await member.timeout(ms, `${reason} (by ${interaction.user.tag})`);
    await notify(member.user, interaction.guild, `🔇 You were timed out for **${length}**.\n**Reason:** ${reason}`);
    await modLog(interaction.guild, {
      action: 'Timeout', target: member.user, moderator: interaction.user, reason, extra: `Duration: ${length}`
    });

    return interaction.reply({ embeds: [success(`Timed out ${member} for **${length}**.`)], allowedMentions: { parse: [] } });
  }
};
