const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const storage = require('../utils/storage');
const { DOCKSYS_SITE } = require('../config');

module.exports = {
  name: 'verification-setup',
  description: 'Post the Roblox verification panel (via Docksys) in a channel',
  usage: '<@role> [#channel]',
  slashData: new SlashCommandBuilder()
    .setName('verification-setup')
    .setDescription('Post the Roblox verification panel')
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Role to grant once verified').setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to post the panel in (default: here)').setRequired(false)
    ),

  async execute(ctx) {
    const role = ctx.getRole('role', 0);
    const channel = ctx.getChannel('channel', 1) || ctx.channel;

    if (!role) {
      return ctx.reply(ctx.client.errorV2('Usage: `verification-setup <@role> [#channel]`'));
    }

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to manage roles."));
    }

    // Acknowledge now - posting the panel (two external images) can take
    // longer than Discord's 3s window, and we don't want a silent timeout.
    await ctx.defer();

    const verification = storage.read('verification', {});
    verification[ctx.guild.id] = { roleId: role.id, channelId: channel.id };
    storage.write('verification', verification);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kursed_verify_btn')
        .setLabel('Verify with Roblox')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await channel.send(
      ctx.client.buildV2({
        heading: 'Roblox Verification',
        body: `Click the button below to verify your Roblox account through Docksys.\n\nHaven't linked your account yet? Head to **${DOCKSYS_SITE}** first, then come back and click Verify.`,
        rows: [row],
      })
    );

    return ctx.reply(ctx.client.successV2(`Verification panel posted in ${channel}, granting **${role.name}**.`));
  },
};