const { Events } = require('discord.js');
const { giveAutoRole } = require('./guildMemberAdd');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Member just accepted the server rules (membership screening).
    if (oldMember.pending && !newMember.pending) await giveAutoRole(newMember);
  }
};
