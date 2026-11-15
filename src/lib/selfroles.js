// Self-role button panels. Each button's ID holds its role ID, so panels keep
// working after restarts without storing anything.
//   selfrole:m:<roleId>  multi-pick panel: toggle this role
//   selfrole:x:<roleId>  pick-one panel: give this role, remove the panel's others
const { MessageFlags, ComponentType } = require('discord.js');
const { roleProblem } = require('./roles');
const { success, error, replyError } = require('./embeds');
const log = require('./logger');

const PREFIX = 'selfrole:';

const LEADING_EMOJI = /^(\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*)/u;

// "🎮Gaming" → { emoji: '🎮', label: 'Gaming' }
function splitRoleName(role) {
  const match = role.name.match(LEADING_EMOJI);
  const emoji = role.unicodeEmoji || match?.[1] || null;
  const label = (match ? role.name.slice(match[1].length) : role.name).replace(/^[\s・·|:\-→]+/u, '').trim();
  return { emoji, label: (label || role.name).slice(0, 80) };
}

function customId(roleId, exclusive) {
  return `${PREFIX}${exclusive ? 'x' : 'm'}:${roleId}`;
}

const parse = id => {
  const [, mode, roleId] = id.split(':');
  return { exclusive: mode === 'x', roleId };
};

async function handleButton(interaction) {
  const { exclusive, roleId } = parse(interaction.customId);
  const { guild } = interaction;
  const member = interaction.member;
  const role = guild.roles.cache.get(roleId);

  if (!role) return replyError(interaction, 'That role no longer exists. Ask a staff member to update this panel.');
  // Re-checked on every click in case the role was changed after the panel was posted.
  const problem = roleProblem(guild, role, { selfAssign: true });
  if (problem) return replyError(interaction, problem);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId, 'Self-role panel');
      return interaction.editReply({ embeds: [success(`Removed ${role}.`)] });
    }

    let removed = [];
    if (exclusive) {
      // Other roles on this same panel.
      const siblings = interaction.message.components
        .flatMap(row => row.components)
        .filter(c => c.type === ComponentType.Button && c.customId?.startsWith(PREFIX))
        .map(c => parse(c.customId).roleId)
        .filter(id => id !== roleId && member.roles.cache.has(id));
      if (siblings.length) {
        await member.roles.remove(siblings, 'Self-role panel (pick one)');
        removed = siblings;
      }
    }

    await member.roles.add(roleId, 'Self-role panel');
    return interaction.editReply({
      embeds: [success(`Added ${role}.` + (removed.length ? ` Removed ${removed.map(id => `<@&${id}>`).join(' ')}.` : ''))]
    });
  } catch (err) {
    log.warn(`Self-role failed in ${guild.name}: ${err.message}`);
    return interaction.editReply({ embeds: [error('I couldn’t change your roles. Please tell a staff member.')] });
  }
}

module.exports = { PREFIX, splitRoleName, customId, handleButton };
