const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const log = require('./logger');

function loadCommands() {
  const commands = new Collection();
  const dir = path.join(__dirname, '..', 'commands');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(dir, file));
    commands.set(command.data.name, command);
  }
  return commands;
}

// Server commands update instantly (global ones can take a while), so each
// server gets its own copy. Saves the IDs so /help can link to commands.
async function registerCommands(guild) {
  const { client } = guild;
  const body = client.commands.map(c => c.data.toJSON());
  try {
    const registered = await guild.commands.set(body);
    client.commandIds.set(guild.id, new Map(registered.map(c => [c.name, c.id])));
    log.info(`Registered ${registered.size} commands in ${guild.name}`);
  } catch (err) {
    log.error(`Could not register commands in ${guild.name}: ${err.message}`);
  }
}

module.exports = { loadCommands, registerCommands };
