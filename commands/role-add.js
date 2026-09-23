const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'role-add',
  description: 'Add a role to a user',
  usage: '<@user> <@role>',
  slashData: new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('Add a role to a user')
    .addUserOption((opt) => opt.setName('user').setDescription('Who to give the role to').setRequired(true))
    .addRoleOption((opt) => opt.setName('role').setDescription('Role to add').setRequired(true)),

  async execute(ctx) {
    const member = await ctx.getMember('user', 0);
    const role = ctx.getRole('role', 1);

    if (!member || !role) {
      return ctx.reply(ctx.client.errorV2('Usage: `role-add <@user> <@role>`'));
    }

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply(ctx.client.errorV2("I don't have permission to manage roles."));
    }

    if (role.position >= ctx.guild.members.me.roles.highest.position) {
      return ctx.reply(ctx.client.errorV2(`I can't assign **${role.name}** - it's above my highest role.`));
    }

    if (member.roles.cache.has(role.id)) {
      return ctx.reply(ctx.client.errorV2(`${member.user.tag} already has **${role.name}**.`));
    }

    try {
      await member.roles.add(role);
    } catch (err) {
      return ctx.reply(ctx.client.errorV2(`Failed to add role: ${err.message}`));
    }

    return ctx.reply(ctx.client.successV2(`Added **${role.name}** to **${member.user.tag}**.`));
  },
};