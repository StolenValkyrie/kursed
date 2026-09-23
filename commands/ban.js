const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Ban a user from the server',
  usage: '<@user> [reason]',
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((opt) => opt.setName('user').setDescription('Who to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(ctx) {
    const user = await ctx.getUser('user', 0);
    const reason = ctx.isSlash ? ctx.getString('reason') || 'No reason provided' : ctx.rawText(1) || 'No reason provided';

    if (!user) {
      return ctx.reply(ctx.client.errorV2('Usage: `ban <@user> [reason]`'));
    }

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to ban members."));
    }

    try {
      await ctx.guild.members.ban(user.id, { reason: `${reason} | by ${ctx.user.tag}` });
    } catch (err) {
      return ctx.reply(ctx.client.errorV2(`Failed to ban ${user.tag}: ${err.message}`));
    }

    return ctx.reply(ctx.client.successV2(`**${user.tag}** was banned.\n**Reason:** ${reason}`));
  },
};