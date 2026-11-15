// Voice XP: once a minute, everyone actually hanging out in a voice channel
// earns a little XP and a minute of voice time on their rank card.
const levels = require('./levels');
const store = require('./store');
const log = require('./logger');
const { handleLevelUp } = require('./levelup');
const { xp: xpConfig } = require('../config');

// To stop AFK farming, a member only earns in a channel that:
//  - isn't the server's AFK channel
//  - has at least 2 real (non-bot) people who aren't deafened
// and the member themself isn't deafened.
function earners(channel) {
  if (channel.id === channel.guild.afkChannelId) return [];
  const listening = channel.members.filter(m => !m.user.bot && !m.voice.deaf);
  return listening.size >= 2 ? [...listening.values()] : [];
}

async function tick(client) {
  for (const guild of client.guilds.cache.values()) {
    if (store.guild(guild.id).config.voiceXp === false) continue;

    const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased());
    for (const channel of voiceChannels.values()) {
      for (const member of earners(channel)) {
        levels.getUser(guild.id, member.id).voiceMinutes++;
        const gained = xpConfig.voiceMin + Math.floor(Math.random() * (xpConfig.voiceMax - xpConfig.voiceMin + 1));
        const { before, after } = levels.addXp(guild.id, member.id, gained);
        if (after > before) await handleLevelUp(member, before, after);
      }
    }
  }
}

function startVoiceXp(client) {
  setInterval(() => tick(client).catch(err => log.error('Voice XP tick failed:', err)), 60_000);
}

module.exports = { startVoiceXp, tick, earners };
