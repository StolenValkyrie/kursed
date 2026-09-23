const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'v2say',
  description: 'Make the bot send a Components V2 container message',
  usage: '<heading> | <body>',
  slashData: new SlashCommandBuilder()
    .setName('v2say')
    .setDescription('Make the bot send a Components V2 container message')
    .addStringOption((opt) =>
      opt.setName('heading').setDescription('Bold heading line').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('body').setDescription('Body text').setRequired(true)
    ),

  async execute(ctx) {
    let heading, body;

    if (ctx.isSlash) {
      heading = ctx.getString('heading');
      body = ctx.getString('body');
    } else {
      const full = ctx.rawText(0);
      const [h, ...rest] = full.split('|');
      heading = (h || '').trim();
      body = rest.join('|').trim();
    }

    if (!heading || !body) {
      return ctx.reply(ctx.client.errorV2('Usage: `v2say <heading> | <body>`'));
    }

    await ctx.channel.send(ctx.client.buildV2({ heading, body }));

    if (ctx.isSlash) {
      return ctx.reply({ content: 'Sent.', flags: 64 });
    }
    return ctx.channel.send('✅');
  },
};