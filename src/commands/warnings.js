const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const store = require('../lib/store');
const { modLog } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');
const { colors } = require('../config');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or remove a member’s warnings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(s =>
      s.setName('list').setDescription('List a member’s warnings')
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    )
    .addSubcommand(s =>
      s.setName('remove').setDescription('Remove one warning by its case number')
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .addIntegerOption(o => o.setName('case').setDescription('Case number from /warnings list').setRequired(true).setMinValue(1))
    )
    .addSubcommand(s =>
      s.setName('clear').setDescription('Remove all of a member’s warnings')
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const data = store.guild(interaction.guild.id);
    const list = data.warnings[user.id] ?? [];

    if (sub === 'list') {
      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setAuthor({ name: `Warnings for ${user.tag}`, iconURL: user.displayAvatarURL() })
        .setDescription(
          list.length
            ? list
                .slice(-15)
                .map(w => `**#${w.id}** · <t:${Math.floor(w.at / 1000)}:d> by <@${w.moderator}>\n${w.reason}`)
                .join('\n\n')
            : 'No warnings. 🎉'
        )
        .setFooter({ text: `${list.length} total` + (list.length > 15 ? ' · showing latest 15' : '') });
      return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('case');
      const index = list.findIndex(w => w.id === id);
      if (index === -1) return replyError(interaction, `${user.username} has no warning with case #${id}.`);
      const [removed] = list.splice(index, 1);
      store.save(interaction.guild.id);
      await modLog(interaction.guild, {
        action: 'Warnings cleared', target: user, moderator: interaction.user,
        reason: `Removed case #${id}: ${removed.reason}`
      });
      return interaction.reply({ embeds: [success(`Removed warning #${id} from ${user}.`)], allowedMentions: { parse: [] } });
    }

    // clear
    if (list.length === 0) return replyError(interaction, `${user.username} has no warnings.`);
    delete data.warnings[user.id];
    store.save(interaction.guild.id);
    await modLog(interaction.guild, {
      action: 'Warnings cleared', target: user, moderator: interaction.user,
      reason: `Cleared all ${list.length} warnings`
    });
    return interaction.reply({
      embeds: [success(`Cleared **${list.length}** warning${list.length === 1 ? '' : 's'} from ${user}.`)],
      allowedMentions: { parse: [] }
    });
  }
};
