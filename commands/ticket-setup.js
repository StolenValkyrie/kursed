const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const storage = require('../utils/storage');
const { REQUIRED_ROLE_ID } = require('../config');

module.exports = {
  name: 'ticket-setup',
  description: 'Post the ticket panel with an Open Ticket button',
  usage: '[#channel]',
  slashData: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Post the ticket panel')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to post the panel in (default: here)').setRequired(false)
    ),

  async execute(ctx) {
    const channel = ctx.getChannel('channel', 0) || ctx.channel;

    if (!channel.isTextBased()) {
      return ctx.reply(ctx.client.errorV2('Please pick a text channel for the ticket panel.'));
    }

    // Ticket creation later needs ManageRoles too (permissionOverwrites on the
    // new channel), so check both up front instead of failing at ticket-open time.
    if (
      !ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels) ||
      !ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)
    ) {
      return ctx.reply(
        ctx.client.errorV2("I need both Manage Channels and Manage Roles to create and lock down ticket channels.")
      );
    }

    // Acknowledge now - posting the panel (two external images) can take
    // longer than Discord's 3s window, and we don't want a silent timeout.
    await ctx.defer();

    const tickets = storage.read('tickets', {});
    tickets[ctx.guild.id] = { ...(tickets[ctx.guild.id] || {}), staffRoleId: REQUIRED_ROLE_ID, open: tickets[ctx.guild.id]?.open || {} };
    storage.write('tickets', tickets);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kursed_ticket_open')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );

    try {
      await channel.send(
        ctx.client.buildV2({
          heading: 'Support Tickets',
          body: 'Need help? Click below to open a private ticket with the staff team.',
          rows: [row],
        })
      );
    } catch (err) {
      return ctx.reply(ctx.client.errorV2(`Couldn't post the panel in ${channel} - check my permissions there.`));
    }

    return ctx.reply(ctx.client.successV2(`Ticket panel posted in ${channel}.`));
  },
};