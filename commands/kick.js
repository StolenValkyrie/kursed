const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a user from the server',
  usage: '<@user> [reason]',
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption((opt) => opt.setName('user').setDescription('Who to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(ctx) {
    const member = await ctx.getMember('user', 0);
    const reason = ctx.isSlash ? ctx.getString('reason') || 'No reason provided' : ctx.rawText(1) || 'No reason provided';

    if (!member) {
      return ctx.reply(ctx.client.errorV2('Usage: `kick <@user> [reason]`'));
    }

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to kick members."));
    }

    if (!member.kickable) {
      return ctx.reply(ctx.client.errorV2(`I can't kick ${member.user.tag} (role hierarchy).`));
    }

    try {
      await member.kick(`${reason} | by ${ctx.user.tag}`);
    } catch (err) {
      return ctx.reply(ctx.client.errorV2(`Failed to kick ${member.user.tag}: ${err.message}`));
    }

    return ctx.reply(ctx.client.successV2(`**${member.user.tag}** was kicked.\n**Reason:** ${reason}`));
  },
};