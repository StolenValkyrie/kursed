const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../utils/storage');

const QUARANTINE_ROLE_ID = '1546121902911791157';

module.exports = {
  name: 'honeypot-setup',
  description: 'Create (or re-point) the honeypot trap channel - anyone who posts in it gets quarantined',
  usage: '[channel-name]',
  slashData: new SlashCommandBuilder()
    .setName('honeypot-setup')
    .setDescription('Create the honeypot trap channel')
    .addStringOption((opt) =>
      opt.setName('name').setDescription('Channel name (default: nsfw-unlock)').setRequired(false)
    ),

  async execute(ctx) {
    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to manage channels."));
    }
    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to manage roles (needed for the trap to work)."));
    }

    const quarantineRole = ctx.guild.roles.cache.get(QUARANTINE_ROLE_ID);
    if (!quarantineRole) {
      return ctx.reply(ctx.client.errorV2(`Quarantine role \`${QUARANTINE_ROLE_ID}\` doesn't exist in this server.`));
    }
    if (quarantineRole.position >= ctx.guild.members.me.roles.highest.position) {
      return ctx.reply(ctx.client.errorV2(`I can't assign **${quarantineRole.name}** - it's above my highest role.`));
    }

    const name = (ctx.isSlash ? ctx.getString('name') : ctx.args[0]) || 'nsfw-unlock';

    const channel = await ctx.guild.channels.create({
      name,
      type: ChannelType.GuildText,
      topic: '⚠️ Honeypot channel managed by kursed - do not delete the config entry.',
      permissionOverwrites: [
        {
          id: ctx.guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    const honeypot = storage.read('honeypot', {});
    honeypot[ctx.guild.id] = { channelId: channel.id, quarantineRoleId: QUARANTINE_ROLE_ID };
    storage.write('honeypot', honeypot);

    return ctx.reply(
      ctx.client.successV2(`Honeypot channel created: ${channel}\nAnyone who sends a message there will be given **${quarantineRole.name}** automatically.`)
    );
  },
};