const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'serverinfo',
  description: 'Show information about this server',
  usage: '',
  slashData: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server'),

  async execute(ctx) {
    const guild = ctx.guild;
    await guild.fetch();

    const owner = await guild.fetchOwner().catch(() => null);

    return ctx.reply(
      ctx.client.buildV2({
        heading: guild.name,
        fields: [
          { name: 'Owner', value: owner ? owner.user.tag : 'Unknown' },
          { name: 'Members', value: `${guild.memberCount}` },
          { name: 'Roles', value: `${guild.roles.cache.size}` },
          { name: 'Channels', value: `${guild.channels.cache.size}` },
          { name: 'Boost Level', value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)` },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` },
        ],
        footer: `Server ID: ${guild.id}`,
      })
    );
  },
};