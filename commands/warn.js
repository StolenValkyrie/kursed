const { SlashCommandBuilder } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: 'warn',
  description: 'Warn a user (logged, visible via /bans-style history)',
  usage: '<@user> <reason>',
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption((opt) => opt.setName('user').setDescription('Who to warn').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(true)
    ),

  async execute(ctx) {
    const user = await ctx.getUser('user', 0);
    const reason = ctx.isSlash ? ctx.getString('reason') : ctx.rawText(1);

    if (!user || !reason) {
      return ctx.reply(ctx.client.errorV2('Usage: `warn <@user> <reason>`'));
    }

    const warnings = storage.read('warnings', {});
    const guildWarns = warnings[ctx.guild.id] || {};
    const userWarns = guildWarns[user.id] || [];

    userWarns.push({
      reason,
      moderator: ctx.user.id,
      timestamp: Date.now(),
    });

    guildWarns[user.id] = userWarns;
    warnings[ctx.guild.id] = guildWarns;
    storage.write('warnings', warnings);

    try {
      await user.send(
        ctx.client.successV2(`You were warned in **${ctx.guild.name}**.\n**Reason:** ${reason}`)
      );
    } catch {
      // DMs closed, ignore
    }

    return ctx.reply(
      ctx.client.successV2(
        `**${user.tag}** has been warned (total: ${userWarns.length}).\n**Reason:** ${reason}`
      )
    );
  },
};