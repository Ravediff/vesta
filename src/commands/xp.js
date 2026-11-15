const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const levels = require('../lib/levels');
const { success, replyError } = require('../lib/embeds');

module.exports = {
  category: 'Admin',
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Adjust a member’s XP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(s =>
      s.setName('add').setDescription('Give XP to a member')
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('XP to add').setRequired(true).setMinValue(1).setMaxValue(1_000_000))
    )
    .addSubcommand(s =>
      s.setName('remove').setDescription('Take XP from a member')
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('XP to remove').setRequired(true).setMinValue(1).setMaxValue(1_000_000))
    )
    .addSubcommand(s =>
      s.setName('reset').setDescription('Reset a member to level 1')
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    if (user.bot) return replyError(interaction, 'Bots don’t earn XP.');
    const guildId = interaction.guild.id;

    if (sub === 'reset') {
      levels.setTotal(guildId, user.id, 0);
      const u = levels.getUser(guildId, user.id);
      u.weekly = 0;
      u.monthly = 0;
      return interaction.reply({ embeds: [success(`Reset ${user} to level 1.`)], allowedMentions: { parse: [] } });
    }

    const amount = interaction.options.getInteger('amount') * (sub === 'remove' ? -1 : 1);
    const { after } = levels.addXp(guildId, user.id, amount, { counts: false });

    const member = interaction.options.getMember('user');
    if (member) await levels.syncLevelRoles(member);

    const { total } = levels.getUser(guildId, user.id);
    const verb = sub === 'add' ? `Gave **${amount}** XP to` : `Removed **${-amount}** XP from`;
    return interaction.reply({
      embeds: [success(`${verb} ${user}. They are now level **${after}** (${total.toLocaleString()} XP).`)],
      allowedMentions: { parse: [] }
    });
  }
};
