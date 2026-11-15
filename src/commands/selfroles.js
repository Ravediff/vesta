const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, InteractionContextType, ChannelType, MessageFlags
} = require('discord.js');
const { roleProblem } = require('../lib/roles');
const { splitRoleName, customId } = require('../lib/selfroles');
const { success, replyError } = require('../lib/embeds');
const { colors } = require('../config');

const MAX_ROLES = 10;

const builder = new SlashCommandBuilder()
  .setName('selfroles')
  .setDescription('Post a panel of buttons members click to get roles')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setContexts(InteractionContextType.Guild)
  .addStringOption(o => o.setName('title').setDescription('Panel title, e.g. "Pick your games"').setRequired(true).setMaxLength(100))
  .addRoleOption(o => o.setName('role1').setDescription('Role').setRequired(true));

for (let i = 2; i <= MAX_ROLES; i++) {
  builder.addRoleOption(o => o.setName(`role${i}`).setDescription('Role (optional)'));
}

builder
  .addBooleanOption(o => o.setName('pick_one').setDescription('Members can only have one role from this panel (e.g. age groups)'))
  .addStringOption(o => o.setName('description').setDescription('Text above the buttons').setMaxLength(500))
  .addChannelOption(o =>
    o.setName('channel').setDescription('Where to post (default: here)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );

module.exports = {
  category: 'Admin',
  data: builder,

  async execute(interaction) {
    const { guild } = interaction;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const pickOne = interaction.options.getBoolean('pick_one') ?? false;

    const roles = [];
    for (let i = 1; i <= MAX_ROLES; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role && !roles.some(r => r.id === role.id)) roles.push(role);
    }

    for (const role of roles) {
      const problem = roleProblem(guild, role, { selfAssign: true });
      if (problem) return replyError(interaction, problem);
    }

    const me = guild.members.me;
    if (!channel.permissionsFor(me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return replyError(interaction, `I can’t post in ${channel}.`);
    }

    const embed = new EmbedBuilder()
      .setColor(colors.brand)
      .setTitle(interaction.options.getString('title'))
      .setDescription(
        (interaction.options.getString('description') ?? 'Click a button to get the role. Click again to remove it.') +
        '\n\n' + roles.map(r => `${splitRoleName(r).emoji ?? '•'} ${r}`).join('\n')
      )
      .setFooter({ text: pickOne ? 'You can pick one role from this panel.' : 'Pick as many as you like.' });

    const buttons = roles.map(role => {
      const { emoji, label } = splitRoleName(role);
      const button = new ButtonBuilder()
        .setCustomId(customId(role.id, pickOne))
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary);
      if (emoji) button.setEmoji(emoji);
      return button;
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    const message = await channel.send({ embeds: [embed], components: rows, allowedMentions: { parse: [] } });
    return interaction.reply({
      embeds: [success(`Posted a self-role panel with ${roles.length} role${roles.length === 1 ? '' : 's'} in ${channel}: ${message.url}`)],
      flags: MessageFlags.Ephemeral
    });
  }
};
