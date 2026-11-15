const { Events } = require('discord.js');
const log = require('../lib/logger');
const { registerCommands } = require('../lib/commands');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    log.info(`Joined server ${guild.name} (${guild.id})`);
    await registerCommands(guild);
  }
};
