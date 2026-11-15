const { Events, RESTJSONErrorCodes } = require('discord.js');
const log = require('../lib/logger');
const { replyError } = require('../lib/embeds');

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

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      const missingPerms = err.code === RESTJSONErrorCodes.MissingPermissions;
      if (!missingPerms) {
        log.error(`/${interaction.commandName} failed in ${interaction.guild?.name}:`, err);
      }
      const text = missingPerms
        ? 'I don’t have permission to do that. Check my role’s permissions and make sure it’s high enough in Server Settings → Roles.'
        : 'Something went wrong running that command. It’s been logged.';
      await replyError(interaction, text).catch(() => {});
    }
  }
};
