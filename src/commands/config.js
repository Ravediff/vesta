const {
  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType, ChannelType
} = require('discord.js');
const store = require('../lib/store');
const config = require('../config');
const { success, replyError } = require('../lib/embeds');

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

// Bot needs these in a channel to post cards/embeds there.
const POST_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles
];

const channelOption = (description) => o =>
  o.setName('channel').setDescription(description).addChannelTypes(...TEXT_CHANNELS);

function canPost(channel) {
  return channel.permissionsFor(channel.guild.members.me).has(POST_PERMS);
}

const { roleProblem } = require('../lib/roles');

const show = id => (id ? `<#${id}>` : '*off*');

module.exports = {
  category: 'Admin',
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure Vesta for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(s => s.setName('view').setDescription('Show current settings'))
    .addSubcommand(s =>
      s.setName('welcome').setDescription('Where welcome cards are posted (leave empty to turn off)')
        .addChannelOption(channelOption('Welcome channel'))
    )
    .addSubcommand(s =>
      s.setName('goodbye').setDescription('Where goodbye cards are posted (leave empty to turn off)')
        .addChannelOption(channelOption('Goodbye channel'))
    )
    .addSubcommand(s =>
      s.setName('modlog').setDescription('Where moderation actions are logged (leave empty to turn off)')
        .addChannelOption(channelOption('Mod-log channel'))
    )
    .addSubcommand(s =>
      s.setName('levelup').setDescription('Where level-up messages go')
        .addBooleanOption(o => o.setName('enabled').setDescription('Send level-up messages at all').setRequired(true))
        .addChannelOption(channelOption('Fixed channel (leave empty = the channel they leveled up in)'))
    )
    .addSubcommand(s =>
      s.setName('voicexp').setDescription('Turn XP for time spent in voice channels on or off')
        .addBooleanOption(o => o.setName('enabled').setDescription('Earn XP in voice').setRequired(true))
    )
    .addSubcommand(s =>
      s.setName('autorole').setDescription('Role given to every new member (leave empty to turn off)')
        .addRoleOption(o => o.setName('role').setDescription('Role'))
    )
    .addSubcommandGroup(g =>
      g.setName('levelrole').setDescription('Roles rewarded for reaching a level')
        .addSubcommand(s =>
          s.setName('add').setDescription('Give a role when members reach a level')
            .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true).setMinValue(2).setMaxValue(1000))
            .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('remove').setDescription('Stop rewarding a role at a level')
            .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true).setMinValue(2).setMaxValue(1000))
        )
    ),

  async execute(interaction) {
    const { guild } = interaction;
    const data = store.guild(guild.id);
    const cfg = data.config;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');
    const reply = text => interaction.reply({ embeds: [success(text)], allowedMentions: { parse: [] } });

    if (channel && !canPost(channel)) {
      return replyError(
        interaction,
        `I can’t post in ${channel}. Give me **View Channel**, **Send Messages**, **Embed Links** and **Attach Files** there.`
      );
    }

    const save = () => store.save(guild.id);

    if (group === 'levelrole') {
      const level = interaction.options.getInteger('level');
      if (sub === 'add') {
        const role = interaction.options.getRole('role');
        const problem = roleProblem(guild, role);
        if (problem) return replyError(interaction, problem);
        cfg.levelRoles[level] = role.id;
        save();
        return reply(`Members who reach **level ${level}** will get ${role}. Existing members get it next time they earn XP.`);
      }
      if (!cfg.levelRoles[level]) return replyError(interaction, `There’s no role reward at level ${level}.`);
      delete cfg.levelRoles[level];
      save();
      return reply(`Removed the role reward at level ${level}. (Nobody loses the role.)`);
    }

    switch (sub) {
      case 'welcome':
        cfg.welcomeChannel = channel?.id ?? null;
        save();
        return reply(channel ? `Welcome cards will be posted in ${channel}.` : 'Welcome cards turned off.');

      case 'goodbye':
        cfg.leaveChannel = channel?.id ?? null;
        save();
        return reply(channel ? `Goodbye cards will be posted in ${channel}.` : 'Goodbye cards turned off.');

      case 'modlog':
        cfg.modLogChannel = channel?.id ?? null;
        save();
        return reply(channel ? `Moderation actions will be logged in ${channel}.` : 'Mod log turned off.');

      case 'levelup': {
        cfg.levelUpEnabled = interaction.options.getBoolean('enabled');
        cfg.levelUpChannel = channel?.id ?? null;
        save();
        if (!cfg.levelUpEnabled) return reply('Level-up messages turned off.');
        return reply(`Level-up messages will be sent ${channel ? `in ${channel}` : 'in the channel where people level up'}.`);
      }

      case 'voicexp':
        cfg.voiceXp = interaction.options.getBoolean('enabled');
        save();
        return reply(cfg.voiceXp
          ? 'Members now earn XP in voice channels (2+ people, not deafened, not in AFK).'
          : 'Voice XP turned off.');

      case 'autorole': {
        const role = interaction.options.getRole('role');
        if (role) {
          const problem = roleProblem(guild, role);
          if (problem) return replyError(interaction, problem);
        }
        cfg.autoRole = role?.id ?? null;
        save();
        return reply(role ? `New members will get ${role}.` : 'Auto-role turned off.');
      }

      case 'view': {
        // Show env fallbacks as the effective value until /config overrides them.
        const welcome = cfg.welcomeChannel ?? config.defaultWelcomeChannel;
        const leave = cfg.leaveChannel ?? config.defaultLeaveChannel;
        const levelRoles = Object.entries(cfg.levelRoles)
          .sort((a, b) => a[0] - b[0])
          .map(([level, role]) => `Level ${level} → <@&${role}>`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(config.colors.brand)
          .setTitle(`⚙️ Vesta settings — ${guild.name}`)
          .addFields(
            { name: 'Welcome cards', value: show(welcome), inline: true },
            { name: 'Goodbye cards', value: show(leave), inline: true },
            { name: 'Mod log', value: show(cfg.modLogChannel), inline: true },
            {
              name: 'Level-up messages',
              value: cfg.levelUpEnabled ? (cfg.levelUpChannel ? `<#${cfg.levelUpChannel}>` : 'Same channel') : '*off*',
              inline: true
            },
            { name: 'Auto-role', value: cfg.autoRole ? `<@&${cfg.autoRole}>` : '*off*', inline: true },
            { name: 'Voice XP', value: cfg.voiceXp === false ? '*off*' : 'On', inline: true },
            { name: 'Level roles', value: levelRoles || '*none*' }
          );
        return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
      }
    }
  }
};
