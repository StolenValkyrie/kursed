const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'rename',
  description: "Change a user's nickname",
  usage: '<@user> <new nickname>',
  slashData: new SlashCommandBuilder()
    .setName('rename')
    .setDescription("Change a user's nickname")
    .addUserOption((opt) => opt.setName('user').setDescription('Who to rename').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('nickname').setDescription('New nickname').setRequired(true)
    ),

  async execute(ctx) {
    const member = await ctx.getMember('user', 0);
    const nickname = ctx.isSlash ? ctx.getString('nickname') : ctx.rawText(1);

    if (!member || !nickname) {
      return ctx.reply(ctx.client.errorV2('Usage: `rename <@user> <new nickname>`'));
    }

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to manage nicknames."));
    }

    const oldName = member.displayName;

    try {
      await member.setNickname(nickname, `Renamed by ${ctx.user.tag}`);
    } catch (err) {
      return ctx.reply(ctx.client.errorV2(`Failed to rename: ${err.message}`));
    }

    return ctx.reply(ctx.client.successV2(`Renamed **${oldName}** → **${nickname}**.`));
  },
};