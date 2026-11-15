const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const log = require('./lib/logger');
const store = require('./lib/store');
const { loadCommands } = require('./lib/commands');

if (!config.token) {
  log.error('No bot token. Copy .env.example to .env and set TOKEN.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates // voice XP
  ],
  partials: [Partials.GuildMember],
  // Safe default: bot messages never ping anyone unless a message opts in.
  allowedMentions: { parse: [], repliedUser: false }
});

client.commands = loadCommands();
client.commandIds = new Map();

const eventsDir = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsDir, file));
  const run = (...args) =>
    Promise.resolve(event.execute(...args)).catch(err => log.error(`Event ${event.name} failed:`, err));
  client[event.once ? 'once' : 'on'](event.name, run);
}

client.on('error', err => log.error('Client error:', err));
client.on('warn', msg => log.warn(msg));
process.on('unhandledRejection', err => log.error('Unhandled rejection:', err));

// Save pending data before the process exits (Ctrl+C, host restart).
let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info('Shutting down…');
    store.flush();
    await client.destroy();
    process.exit(0);
  });
}

client.login(config.token).catch(err => {
  log.error('Login failed:', err.message);
  process.exit(1);
});

module.exports = client;
