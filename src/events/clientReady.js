const { Events, ActivityType } = require('discord.js');
const log = require('../lib/logger');
const { registerCommands } = require('../lib/commands');
const { checkResets } = require('../lib/resets');
const { migrateLegacyXp } = require('../lib/migrate');
const { startVoiceXp } = require('../lib/voice');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    log.info(`Logged in as ${client.user.tag} — in ${client.guilds.cache.size} server(s)`);
    client.user.setActivity('/help', { type: ActivityType.Watching });

    for (const guild of client.guilds.cache.values()) await registerCommands(guild);

    migrateLegacyXp(client);
    checkResets();
    setInterval(checkResets, 60_000);
    startVoiceXp(client);
  }
};
