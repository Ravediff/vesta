const {
  SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  PermissionFlagsBits, InteractionContextType, ChannelType, MessageFlags
} = require('discord.js');
const { success, replyError } = require('../lib/embeds');

const COLORS = {
  green: 0x22c55e, blue: 0x3b82f6, purple: 0xa855f7, gold: 0xf59e0b, red: 0xef4444, pink: 0xec4899
};

// Options picked in the slash command, waiting for the popup to be submitted.
// Keyed by the command's interaction ID; popups expire after 15 minutes.
const pending = new Map();
const EXPIRY_MS = 15 * 60_000;
const MODAL_PREFIX = 'announce:';

module.exports = {
  category: 'Admin',
  MODAL_PREFIX,
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Write a good-looking announcement (opens a writing popup)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addChannelOption(o =>
      o.setName('channel').setDescription('Where to post (default: here)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addRoleOption(o => o.setName('ping').setDescription('Role to ping (pick @everyone to ping everyone)'))
    .addStringOption(o =>
      o.setName('color').setDescription('Accent colour (default: green)')
        .addChoices(...Object.keys(COLORS).map(c => ({ name: c[0].toUpperCase() + c.slice(1), value: c })))
    )
    .addAttachmentOption(o => o.setName('image').setDescription('Image to show in the announcement')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const ping = interaction.options.getRole('ping');
    const image = interaction.options.getAttachment('image');

    if (image && !image.contentType?.startsWith('image/')) return replyError(interaction, 'The attachment must be an image.');
    if (!channel.permissionsFor(interaction.guild.members.me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return replyError(interaction, `I can’t post in ${channel}.`);
    }
    if (ping && !ping.mentionable && !interaction.memberPermissions.has(PermissionFlagsBits.MentionEveryone)) {
      return replyError(interaction, `You need the **Mention @everyone** permission to ping ${ping}.`);
    }

    pending.set(interaction.id, {
      channelId: channel.id,
      pingId: ping?.id ?? null,
      color: COLORS[interaction.options.getString('color') ?? 'green'],
      imageUrl: image?.url ?? null,
      expires: Date.now() + EXPIRY_MS
    });

    const modal = new ModalBuilder()
      .setCustomId(MODAL_PREFIX + interaction.id)
      .setTitle('New announcement')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('body').setLabel('Message').setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true)
            .setPlaceholder('Supports **bold**, *italics*, links and line breaks.')
        )
      );
    return interaction.showModal(modal);
  },

  // Called by interactionCreate when the popup is submitted.
  async submitModal(interaction) {
    const key = interaction.customId.slice(MODAL_PREFIX.length);
    const options = pending.get(key);
    pending.delete(key);
    for (const [id, p] of pending) if (p.expires < Date.now()) pending.delete(id);

    if (!options || options.expires < Date.now()) {
      return replyError(interaction, 'This announcement expired (or Vesta restarted). Run /announce again.');
    }

    const { guild } = interaction;
    const channel = guild.channels.cache.get(options.channelId);
    if (!channel) return replyError(interaction, 'That channel no longer exists.');

    const embed = new EmbedBuilder()
      .setColor(options.color)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
      .setTitle(interaction.fields.getTextInputValue('title'))
      .setDescription(interaction.fields.getTextInputValue('body'))
      .setFooter({ text: `Posted by ${interaction.member.displayName}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    if (options.imageUrl) embed.setImage(options.imageUrl);

    const everyone = options.pingId === guild.id;
    const content = options.pingId ? (everyone ? '@everyone' : `<@&${options.pingId}>`) : undefined;
    const allowedMentions = everyone ? { parse: ['everyone'] } : { roles: options.pingId ? [options.pingId] : [] };

    const message = await channel.send({ content, embeds: [embed], allowedMentions });
    return interaction.reply({ embeds: [success(`Announcement posted: ${message.url}`)], flags: MessageFlags.Ephemeral });
  }
};
