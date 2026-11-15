const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');
const { modLog } = require('../lib/modlog');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setContexts(InteractionContextType.Guild)
    .addIntegerOption(o => o.setName('amount').setDescription('How many (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user')),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const { channel } = interaction;
    if (!channel?.bulkDelete) return replyError(interaction, 'I can’t purge messages in this channel.');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messages = await channel.messages.fetch({ limit: 100 });
    if (user) messages = messages.filter(m => m.author.id === user.id);
    messages = messages.first(amount);

    // Discord can't bulk-delete messages older than 14 days; those are skipped.
    const deleted = await channel.bulkDelete(messages, true);
    const skipped = messages.length - deleted.size;

    await modLog(interaction.guild, {
      action: 'Purge', moderator: interaction.user,
      reason: `Deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'} in ${channel}` + (user ? ` from ${user}` : '')
    });

    return interaction.editReply({
      embeds: [success(
        `Deleted **${deleted.size}** message${deleted.size === 1 ? '' : 's'}` + (user ? ` from ${user}` : '') + '.' +
        (skipped > 0 ? `\n-# ${skipped} skipped — Discord can’t bulk-delete messages older than 14 days.` : '')
      )]
    });
  }
};
