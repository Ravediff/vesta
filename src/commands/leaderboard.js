const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  InteractionContextType, ComponentType
} = require('discord.js');
const levels = require('../lib/levels');
const { colors } = require('../config');

const PER_PAGE = 10;
const LABELS = { all: 'All time', weekly: 'This week', monthly: 'This month' };
const MEDALS = ['🥇', '🥈', '🥉'];

function page(guild, userId, period, index) {
  const board = levels.leaderboard(guild.id, period);
  const pages = Math.max(1, Math.ceil(board.length / PER_PAGE));
  index = Math.min(Math.max(index, 0), pages - 1);

  const lines = board.slice(index * PER_PAGE, (index + 1) * PER_PAGE).map((entry, i) => {
    const place = index * PER_PAGE + i;
    const badge = MEDALS[place] ?? `\`#${String(place + 1).padStart(2)}\``;
    return `${badge} <@${entry.id}> — **${entry.value.toLocaleString()}** XP · lvl ${entry.level}`;
  });

  const mine = board.findIndex(e => e.id === userId);
  const embed = new EmbedBuilder()
    .setColor(colors.brand)
    .setTitle(`🏆 ${guild.name} leaderboard — ${LABELS[period]}`)
    .setDescription(lines.join('\n') || 'Nobody has earned XP yet. Start chatting!')
    .setFooter({
      text: `Page ${index + 1}/${pages}` + (mine >= 0 ? ` · You are #${mine + 1}` : '')
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lb:prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(index === 0),
    new ButtonBuilder().setCustomId('lb:next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(index >= pages - 1)
  );

  return { embeds: [embed], components: pages > 1 ? [row] : [], allowedMentions: { parse: [] }, index };
}

module.exports = {
  category: 'Levels',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the most active members')
    .addStringOption(o =>
      o.setName('period').setDescription('Which leaderboard (default: all time)').addChoices(
        { name: 'All time', value: 'all' },
        { name: 'This week', value: 'weekly' },
        { name: 'This month', value: 'monthly' }
      )
    )
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const period = interaction.options.getString('period') ?? 'all';
    let current = page(interaction.guild, interaction.user.id, period, 0);
    const reply = await interaction.reply({ ...current, withResponse: true });
    if (current.components.length === 0) return;

    // Page buttons work for 2 minutes, only for the person who ran the command.
    const collector = reply.resource.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async button => {
      const step = button.customId === 'lb:next' ? 1 : -1;
      current = page(interaction.guild, interaction.user.id, period, current.index + step);
      await button.update(current);
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};
