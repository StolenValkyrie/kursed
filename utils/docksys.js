const { DOCKSYS_API_BASE } = require('../config');

/**
 * NOTE: Docksys's exact request/response shape isn't something I could
 * confirm from public docs, so this wrapper uses common REST conventions.
 * Check https://docksys.xyz (or whatever API reference they gave you) and
 * adjust the endpoint paths / field names below if they differ.
 */

async function docksysRequest(pathname, options = {}) {
  const res = await fetch(`${DOCKSYS_API_BASE}${pathname}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.DOCKSYS_API_KEY
        ? { Authorization: `Bearer ${process.env.DOCKSYS_API_KEY}` }
        : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Docksys API error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

/** Look up a Roblox account by username. */
async function getRobloxByUsername(username) {
  return docksysRequest(`/roblox/users/${encodeURIComponent(username)}`);
}

/** Look up whatever Roblox account is already linked to a Discord ID, if any. */
async function getLinkByDiscordId(discordId) {
  try {
    return await docksysRequest(`/discord/${discordId}`);
  } catch {
    return null;
  }
}

/** Persist a verified Discord <-> Roblox link on Docksys's side. */
async function createLink(discordId, robloxId) {
  return docksysRequest('/verify', {
    method: 'POST',
    body: JSON.stringify({ discordId, robloxId }),
  });
}

module.exports = { getRobloxByUsername, getLinkByDiscordId, createLink };