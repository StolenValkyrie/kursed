const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'dm',
  description: 'Send a direct message to a user',
  usage: '<@user> <message>',
  slashData: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a direct message to a user')
    .addUserOption((opt) => opt.setName('user').setDescription('Who to DM').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('message').setDescription('What to send').setRequired(true)
    ),

  async execute(ctx) {
    const user = await ctx.getUser('user', 0);
    const text = ctx.isSlash ? ctx.getString('message') : ctx.rawText(1);

    if (!user || !text) {
      return ctx.reply(ctx.client.errorV2('Usage: `dm <@user> <message>`'));
    }

    try {
      await user.send(
        ctx.client.buildV2({
          heading: `Message from ${ctx.guild.name}`,
          body: text,
          footer: `Sent by ${ctx.user.tag}`,
        })
      );
    } catch {
      return ctx.reply(ctx.client.errorV2(`Couldn't DM ${user.tag} - they may have DMs closed.`));
    }

    return ctx.reply(ctx.client.successV2(`DM sent to ${user.tag}.`));
  },
};