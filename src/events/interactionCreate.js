const { Events, RESTJSONErrorCodes } = require('discord.js');
const log = require('../lib/logger');
const { replyError } = require('../lib/embeds');
const selfroles = require('../lib/selfroles');
const announce = require('../commands/announce');

// Runs a handler and turns any error into a friendly private reply.
async function safely(interaction, label, fn) {
  try {
    await fn();
  } catch (err) {
    const missingPerms = err.code === RESTJSONErrorCodes.MissingPermissions;
    if (!missingPerms) log.error(`${label} failed in ${interaction.guild?.name}:`, err);
    const text = missingPerms
      ? 'I don’t have permission to do that. Check my role’s permissions and make sure it’s high enough in Server Settings → Roles.'
      : 'Something went wrong. It’s been logged.';
    await replyError(interaction, text).catch(() => {});
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.inGuild()) return;

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      try {
        await command?.autocomplete?.(interaction);
      } catch (err) {
        log.warn(`Autocomplete for /${interaction.commandName} failed: ${err.message}`);
      }
      return;
    }

    // Self-role panel buttons. (Leaderboard page buttons are handled by their own collector.)
    if (interaction.isButton() && interaction.customId.startsWith(selfroles.PREFIX)) {
      return safely(interaction, 'Self-role button', () => selfroles.handleButton(interaction));
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith(announce.MODAL_PREFIX)) {
      return safely(interaction, 'Announcement', () => announce.submitModal(interaction));
    }

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    return safely(interaction, `/${interaction.commandName}`, () => command.execute(interaction));
  }
};
