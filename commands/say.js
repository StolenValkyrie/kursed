const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'say',
  description: 'Make the bot send a plain message in this channel',
  usage: '<message>',
  slashData: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a plain message in this channel')
    .addStringOption((opt) =>
      opt.setName('message').setDescription('What the bot should say').setRequired(true)
    ),

  async execute(ctx) {
    const text = ctx.isSlash ? ctx.getString('message') : ctx.rawText(0);
    if (!text) {
      return ctx.reply(ctx.client.errorV2('You need to give me something to say.'));
    }

    await ctx.channel.send({ content: text });

    if (ctx.isSlash) {
      return ctx.reply({ content: 'Sent.', flags: 64 }); // ephemeral
    }
    return ctx.channel.send('✅');
  },
};