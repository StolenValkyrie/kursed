const { resolveMember, resolveRole, resolveChannel } = require('./resolve');

/**
 * Wraps a ChatInputCommandInteraction into the same shape a prefix message
 * context uses, so command files never need to know which one they got.
 */
function fromInteraction(interaction) {
  return {
    isSlash: true,
    client: interaction.client,
    guild: interaction.guild,
    channel: interaction.channel,
    member: interaction.member,
    user: interaction.user,
    args: [],

    async reply(payload) {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload);
      }
      return interaction.reply(payload);
    },

    getString(name) {
      return interaction.options.getString(name);
    },
    getInteger(name) {
      return interaction.options.getInteger(name);
    },
    async getUser(name) {
      return interaction.options.getUser(name);
    },
    async getMember(name) {
      const user = interaction.options.getUser(name);
      if (!user) return null;
      try {
        return await interaction.guild.members.fetch(user.id);
      } catch {
        return null;
      }
    },
    getRole(name) {
      return interaction.options.getRole(name);
    },
    getChannel(name) {
      return interaction.options.getChannel(name);
    },
    rawText(name) {
      return interaction.options.getString(name) || '';
    },
  };
}

/**
 * Wraps a prefix (`command) Message + its parsed args array. Argument
 * getters take a positional index instead of a name, since text commands
 * don't have named parameters.
 */
function fromMessage(message, args) {
  const guild = message.guild;
  return {
    isSlash: false,
    client: message.client,
    guild,
    channel: message.channel,
    member: message.member,
    user: message.author,
    args,

    async reply(payload) {
      return message.reply(payload);
    },

    getString(_name, index = 0) {
      return args[index] ?? null;
    },
    getInteger(_name, index = 0) {
      const n = Number(args[index]);
      return Number.isFinite(n) ? n : null;
    },
    async getUser(_name, index = 0) {
      const member = await resolveMember(guild, args[index]);
      return member ? member.user : null;
    },
    async getMember(_name, index = 0) {
      return resolveMember(guild, args[index]);
    },
    getRole(_name, index = 0) {
      return resolveRole(guild, args[index]);
    },
    getChannel(_name, index = 0) {
      return resolveChannel(guild, args[index]);
    },
    /** Everything from `fromIndex` onward, rejoined into one string. */
    rawText(fromIndex = 0) {
      return args.slice(fromIndex).join(' ');
    },
  };
}

module.exports = { fromInteraction, fromMessage };