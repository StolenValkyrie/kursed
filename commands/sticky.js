const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: 'sticky',
  description: 'Set (or remove) a sticky message that reposts to the bottom of a channel',
  usage: '<#channel> <message | off>',
  slashData: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Set or remove a sticky message for a channel')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to stick the message in').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('message')
        .setDescription('Sticky text, or "off" to remove the current sticky')
        .setRequired(true)
    ),

  async execute(ctx) {
    const channel = ctx.getChannel('channel', 0);
    const text = ctx.isSlash ? ctx.getString('message') : ctx.rawText(1);

    if (!channel || !text) {
      return ctx.reply(ctx.client.errorV2('Usage: `sticky <#channel> <message | off>`'));
    }

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to manage messages in that channel."));
    }

    const sticky = storage.read('sticky', {});
    const guildStickies = sticky[ctx.guild.id] || {};

    if (['off', 'remove', 'stop', 'none'].includes(text.toLowerCase())) {
      const existing = guildStickies[channel.id];
      if (existing?.lastMessageId) {
        const msg = await channel.messages.fetch(existing.lastMessageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }
      delete guildStickies[channel.id];
      sticky[ctx.guild.id] = guildStickies;
      storage.write('sticky', sticky);
      return ctx.reply(ctx.client.successV2(`Sticky removed from ${channel}.`));
    }

    const sent = await channel.send(ctx.client.buildV2({ body: text, footer: 'Sticky message' }));

    guildStickies[channel.id] = { text, lastMessageId: sent.id };
    sticky[ctx.guild.id] = guildStickies;
    storage.write('sticky', sticky);

    return ctx.reply(ctx.client.successV2(`Sticky set in ${channel}.`));
  },
};