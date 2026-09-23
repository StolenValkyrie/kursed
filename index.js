require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  REST,
  Routes,
} = require('discord.js');

const config = require('./config');
const { hasRequiredRole, isStatusAllowed } = require('./utils/permissions');
const { fromInteraction, fromMessage } = require('./utils/context');
const automod = require('./utils/automod');
const storage = require('./utils/storage');
const docksys = require('./utils/docksys');

// ---------------------------------------------------------------------------
// Components V2 container builders (formerly utils/components.js)
// ---------------------------------------------------------------------------

/**
 * Build a Components V2 "container" message payload.
 *
 * @param {Object} opts
 * @param {string} [opts.heading] - Bold heading line (rendered as ### heading).
 * @param {string} [opts.body] - Main text content (markdown supported).
 * @param {{name:string, value:string}[]} [opts.fields] - Rendered as **name**\nvalue blocks.
 * @param {string} [opts.footer] - Small trailing line, separated by a divider.
 * @param {number} [opts.color] - Accent color, defaults to the bot's brand color.
 * @param {import('discord.js').ActionRowBuilder[]} [opts.rows] - Buttons/selects to attach below the text.
 * @returns {{components: any[], flags: number}} Spread this into reply()/send()/editReply().
 */
function buildV2({ heading, body, fields = [], footer, color = config.BRAND_COLOR, rows = [] } = {}) {
  const container = new ContainerBuilder().setAccentColor(color);

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(config.CONTAINER_TOP_IMAGE)
    )
  );

  if (heading) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${heading}`));
  }

  if (body) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }

  for (const field of fields) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`)
    );
  }

  if (footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
  }

  for (const row of rows) {
    container.addActionRowComponents(row);
  }

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(config.CONTAINER_BOTTOM_IMAGE)
    )
  );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

/** Shorthand for a quick error container. */
function errorV2(message) {
  return buildV2({ heading: '⚠️ Error', body: message, color: 0xed4245 });
}

/** Shorthand for a quick success container. */
function successV2(message) {
  return buildV2({ heading: '✅ Success', body: message, color: 0x57f287 });
}

/** Adds the Ephemeral flag on top of whatever a buildV2/errorV2/successV2 payload already has. */
function ephemeral(payload) {
  return { ...payload, flags: payload.flags | MessageFlags.Ephemeral };
}

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Commands access these the same way they access ctx.client - no separate
// utils/components.js import needed.
client.buildV2 = buildV2;
client.errorV2 = errorV2;
client.successV2 = successV2;

// ---------------------------------------------------------------------------
// Command loading
// ---------------------------------------------------------------------------
client.commands = new Collection();
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  client.commands.set(command.name, command);
}

// ---------------------------------------------------------------------------
// Shared permission gate + dispatch
// ---------------------------------------------------------------------------
async function canRun(command, ctx) {
  if (command.ownerOnly) {
    return isStatusAllowed(ctx.user.id);
  }
  return true; // TEMP: bypass role check for debugging - revert this after
  // return hasRequiredRole(ctx.member);
}

async function runCommand(command, ctx) {
  const allowed = await canRun(command, ctx);
  if (!allowed) {
    const denied = command.ownerOnly
      ? "You're not authorized to use this command."
      : `You need the <@&${config.REQUIRED_ROLE_ID}> role to use this command.`;
    return ctx.reply(errorV2(denied));
  }

  try {
    await command.execute(ctx);
  } catch (err) {
    console.error(`[command:${command.name}]`, err);
    try {
      await ctx.reply(errorV2('Something went wrong running that command.'));
    } catch {
      /* already replied/failed */
    }
  }
}

// ---------------------------------------------------------------------------
// Slash command deployment (formerly deploy-commands.js) - runs on every boot
// ---------------------------------------------------------------------------
async function deploySlashCommands() {
  const commandData = [...client.commands.values()]
    .filter((c) => c.slashData)
    .map((c) => c.slashData.toJSON());

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const applicationId = client.application.id;

  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(applicationId, process.env.GUILD_ID)
    : Routes.applicationCommands(applicationId);

  try {
    await rest.put(route, { body: commandData });
    console.log(
      `Deployed ${commandData.length} slash commands${process.env.GUILD_ID ? ' (guild)' : ' (global, can take up to 1 hour to show up)'}.`
    );
  } catch (err) {
    console.error('Failed to deploy slash commands:', err);
  }
}

client.once('ready', async () => {
  console.log(`kursed is online as ${client.user.tag}`);
  await deploySlashCommands();
});

// ---------------------------------------------------------------------------
// Interactions: slash commands, verify button, ticket buttons
// ---------------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    const ctx = fromInteraction(interaction);
    return runCommand(command, ctx);
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'kursed_verify_btn') return handleVerifyButton(interaction);
    if (interaction.customId === 'kursed_ticket_open') return handleTicketOpen(interaction);
    if (interaction.customId === 'kursed_ticket_close') return handleTicketClose(interaction);
  }
});

async function handleVerifyButton(interaction) {
  const verification = storage.read('verification', {});
  const config_ = verification[interaction.guild.id];

  if (!config_) {
    return interaction.reply(ephemeral(errorV2('Verification is not set up on this server yet.')));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let link;
  try {
    link = await docksys.getLinkByDiscordId(interaction.user.id);
  } catch (err) {
    console.error('[verify] docksys lookup failed:', err);
    return interaction.editReply(errorV2('Could not reach Docksys right now. Try again shortly.'));
  }

  if (!link) {
    return interaction.editReply(
      errorV2(`No linked Roblox account found. Link your account at **${config.DOCKSYS_SITE}**, then click Verify again.`)
    );
  }

  const role = interaction.guild.roles.cache.get(config_.roleId);
  if (!role) {
    return interaction.editReply(errorV2('The configured verified role no longer exists - ask staff to run `verification-setup` again.'));
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, 'Verified via Docksys');
    }
  } catch (err) {
    console.error('[verify] role add failed:', err);
    return interaction.editReply(errorV2("Verified, but I couldn't assign your role - check my permissions."));
  }

  const robloxLabel = link.robloxUsername || link.username || link.robloxId || 'your Roblox account';
  return interaction.editReply(
    buildV2({
      heading: 'Verified ✅',
      body: `You're now verified as **${robloxLabel}** and have been given **${role.name}**.`,
    })
  );
}

async function handleTicketOpen(interaction) {
  const tickets = storage.read('tickets', {});
  const guildTickets = tickets[interaction.guild.id] || { staffRoleId: config.REQUIRED_ROLE_ID, open: {} };

  const existingChannelId = Object.entries(guildTickets.open || {}).find(
    ([, t]) => t.userId === interaction.user.id
  )?.[0];

  if (existingChannelId && interaction.guild.channels.cache.has(existingChannelId)) {
    return interaction.reply(
      ephemeral(errorV2(`You already have an open ticket: <#${existingChannelId}>`))
    );
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase().slice(0, 90),
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: guildTickets.staffRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ],
  });

  guildTickets.open[channel.id] = { userId: interaction.user.id, openedAt: Date.now() };
  tickets[interaction.guild.id] = guildTickets;
  storage.write('tickets', tickets);

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kursed_ticket_close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await channel.send({
    content: `<@${interaction.user.id}> <@&${guildTickets.staffRoleId}>`,
    ...buildV2({
      heading: 'Ticket opened',
      body: `Thanks for reaching out, <@${interaction.user.id}>. Staff will be with you shortly.`,
      rows: [closeRow],
    }),
  });

  return interaction.editReply(
    buildV2({ heading: 'Ticket opened', body: `Your ticket: ${channel}` })
  );
}

async function handleTicketClose(interaction) {
  const tickets = storage.read('tickets', {});
  const guildTickets = tickets[interaction.guild.id];
  const ticket = guildTickets?.open?.[interaction.channel.id];

  if (!ticket) {
    return interaction.reply(ephemeral(errorV2('This channel is not a tracked ticket.')));
  }

  await interaction.reply(
    buildV2({ heading: 'Closing ticket', body: 'This channel will be deleted in 5 seconds.' })
  );

  delete guildTickets.open[interaction.channel.id];
  tickets[interaction.guild.id] = guildTickets;
  storage.write('tickets', tickets);

  setTimeout(() => {
    interaction.channel.delete('Ticket closed').catch(() => {});
  }, 5000);
}

// ---------------------------------------------------------------------------
// Messages: prefix commands, automod, sticky repost, honeypot trap
// ---------------------------------------------------------------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Honeypot: anyone posting in the trap channel gets quarantined immediately.
  const honeypot = storage.read('honeypot', {});
  const trapConfig = honeypot[message.guild.id];
  if (trapConfig && message.channel.id === trapConfig.channelId) {
    await message.delete().catch(() => {});
    if (message.member && trapConfig.quarantineRoleId) {
      await message.member.roles.add(trapConfig.quarantineRoleId, 'Triggered honeypot trap channel').catch(() => {});
    }
    return;
  }

  // Automod: scan for filtered language before anything else.
  const scanResult = automod.scan(message.content);
  if (scanResult.flagged) {
    await message.delete().catch(() => {});
    const warning = await message.channel
      .send(errorV2(`${message.author}, please keep the language appropriate.`))
      .catch(() => null);
    if (warning) setTimeout(() => warning.delete().catch(() => {}), 6000);
    return;
  }

  // Prefix commands.
  if (message.content.startsWith(config.PREFIX)) {
    const withoutPrefix = message.content.slice(config.PREFIX.length).trim();
    const [cmdName, ...args] = withoutPrefix.split(/\s+/);
    const command = client.commands.get(cmdName?.toLowerCase());
    if (command) {
      const ctx = fromMessage(message, args);
      await runCommand(command, ctx);
      return;
    }
  }

  // Sticky repost - runs after everything else so it doesn't fight automod deletes.
  const sticky = storage.read('sticky', {});
  const guildStickies = sticky[message.guild.id];
  const stickyConfig = guildStickies?.[message.channel.id];
  if (stickyConfig) {
    if (stickyConfig.lastMessageId) {
      const old = await message.channel.messages.fetch(stickyConfig.lastMessageId).catch(() => null);
      if (old) await old.delete().catch(() => {});
    }
    const resent = await message.channel
      .send(buildV2({ body: stickyConfig.text, footer: 'Sticky message' }))
      .catch(() => null);
    if (resent) {
      stickyConfig.lastMessageId = resent.id;
      guildStickies[message.channel.id] = stickyConfig;
      sticky[message.guild.id] = guildStickies;
      storage.write('sticky', sticky);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);