const { PermissionFlagsBits: P } = require('discord.js');

// Permissions that must never be handed out by a button or automatically.
const DANGEROUS = [
  P.Administrator, P.ManageGuild, P.ManageRoles, P.ManageChannels, P.BanMembers,
  P.KickMembers, P.ModerateMembers, P.ManageMessages, P.MentionEveryone, P.ManageWebhooks
];

// Everything the bot needs to give out a role. Returns an error string or null.
function roleProblem(guild, role, { selfAssign = false } = {}) {
  const me = guild.members.me;
  if (role.managed) return `${role} is managed by an integration and can’t be given out.`;
  if (role.id === guild.id) return 'You can’t use @everyone.';
  if (!me.permissions.has(P.ManageRoles)) return 'I need the **Manage Roles** permission.';
  if (role.position >= me.roles.highest.position) {
    return `${role} is above my highest role. Move my role higher in Server Settings → Roles.`;
  }
  if (selfAssign && DANGEROUS.some(p => role.permissions.has(p, false))) {
    return `${role} has moderator/admin permissions, so it can’t be self-assignable.`;
  }
  return null;
}

module.exports = { roleProblem };
