const { SlashCommandBuilder, AttachmentBuilder, InteractionContextType } = require('discord.js');
const levels = require('../lib/levels');
const { rankCard } = require('../lib/cards');
const { replyError } = require('../lib/embeds');

module.exports = {
  category: 'Levels',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level card, or someone else’s')
    .addUserOption(o => o.setName('user').setDescription('Whose rank to show (default: you)'))
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const member = interaction.options.getMember('user') ?? interaction.member;
    if (!member) return replyError(interaction, 'That user isn’t in this server.');
    if (member.user.bot) return replyError(interaction, 'Bots don’t earn XP.');

    await interaction.deferReply();
    const { total } = levels.getUser(interaction.guild.id, member.id);
    const image = await rankCard(member, {
      ...levels.progress(total),
      total,
      rank: levels.rankOf(interaction.guild.id, member.id)
    });

    return interaction.editReply({ files: [new AttachmentBuilder(image, { name: 'rank.png' })] });
  }
};
