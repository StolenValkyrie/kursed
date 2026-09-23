const MENTION_RE = /^<@!?(\d+)>$/;
const ROLE_MENTION_RE = /^<@&(\d+)>$/;
const CHANNEL_MENTION_RE = /^<#(\d+)>$/;

function idFromMention(raw, re) {
  if (!raw) return null;
  const match = raw.match(re);
  if (match) return match[1];
  if (/^\d{15,25}$/.test(raw)) return raw;
  return null;
}

async function resolveMember(guild, raw) {
  const id = idFromMention(raw, MENTION_RE);
  if (!id) return null;
  try {
    return await guild.members.fetch(id);
  } catch {
    return null;
  }
}

function resolveRole(guild, raw) {
  const id = idFromMention(raw, ROLE_MENTION_RE);
  if (!id) return null;
  return guild.roles.cache.get(id) || null;
}

function resolveChannel(guild, raw) {
  const id = idFromMention(raw, CHANNEL_MENTION_RE);
  if (!id) return null;
  return guild.channels.cache.get(id) || null;
}

module.exports = { resolveMember, resolveRole, resolveChannel };