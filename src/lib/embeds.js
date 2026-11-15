const { EmbedBuilder, MessageFlags } = require('discord.js');
const { colors } = require('../config');

const make = (color, text) => new EmbedBuilder().setColor(color).setDescription(text);

const success = text => make(colors.success, `✅ ${text}`);
const error = text => make(colors.error, `❌ ${text}`);
const info = text => make(colors.info, text);

// Replies privately with an error, whether or not the interaction was already answered.
async function replyError(interaction, text) {
  const payload = { embeds: [error(text)], flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
  return interaction.reply(payload);
}

module.exports = { success, error, info, replyError };
