const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  category: 'Utility',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check that Vesta is online and how fast it responds')
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const sent = Date.now();
    await interaction.deferReply();
    const roundTrip = Date.now() - sent;
    const ws = Math.round(interaction.client.ws.ping);
    return interaction.editReply({
      embeds: [info(`🏓 Pong!\nResponse: **${roundTrip} ms** · Gateway: **${ws < 0 ? '–' : ws + ' ms'}**`)]
    });
  }
};
