const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'bans',
  description: 'List everyone currently banned from the server',
  usage: '',
  slashData: new SlashCommandBuilder()
    .setName('bans')
    .setDescription('List everyone currently banned from the server'),

  async execute(ctx) {
    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to view bans."));
    }

    const banList = await ctx.guild.bans.fetch();
    if (banList.size === 0) {
      return ctx.reply(ctx.client.buildV2({ heading: 'Server Bans', body: 'No one is currently banned.' }));
    }

    const lines = [...banList.values()]
      .slice(0, 25)
      .map((b) => `• **${b.user.tag}** (${b.user.id})${b.reason ? ` - ${b.reason}` : ''}`)
      .join('\n');

    return ctx.reply(
      ctx.client.buildV2({
        heading: `Server Bans (${banList.size})`,
        body: lines,
        footer: banList.size > 25 ? `Showing 25 of ${banList.size}` : undefined,
      })
    );
  },
};