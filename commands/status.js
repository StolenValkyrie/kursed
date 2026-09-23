const { SlashCommandBuilder, ActivityType } = require('discord.js');

const TYPE_MAP = {
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
};

module.exports = {
  name: 'status',
  description: "Set the bot's presence/status",
  usage: '<playing|watching|listening|competing> <text>',
  // Restricted to config.STATUS_ALLOWED_USERS instead of the shared role.
  ownerOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('status')
    .setDescription("Set the bot's presence")
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Activity type')
        .setRequired(true)
        .addChoices(
          { name: 'Playing', value: 'playing' },
          { name: 'Watching', value: 'watching' },
          { name: 'Listening', value: 'listening' },
          { name: 'Competing', value: 'competing' }
        )
    )
    .addStringOption((opt) =>
      opt.setName('text').setDescription('Status text').setRequired(true)
    ),

  async execute(ctx) {
    let type, text;

    if (ctx.isSlash) {
      type = ctx.getString('type');
      text = ctx.getString('text');
    } else {
      type = ctx.args[0]?.toLowerCase();
      text = ctx.rawText(1);
    }

    const activityType = TYPE_MAP[type];
    if (!activityType || !text) {
      return ctx.reply(ctx.client.errorV2('Usage: `status <playing|watching|listening|competing> <text>`'));
    }

    ctx.client.user.setPresence({
      activities: [{ name: text, type: activityType }],
      status: 'online',
    });

    return ctx.reply(ctx.client.successV2(`Status set to **${type} ${text}**.`));
  },
};