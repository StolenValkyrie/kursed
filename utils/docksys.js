const { DOCKSYS_API_BASE, DOCKSYS_PID } = require('../config');

/**
 * Wrapper around the real Dock API - see https://docs.docksys.xyz/api/introduction.
 * Auth is `Authorization: Bearer <DOCKSYS_API_KEY>`, confirmed against Dock's
 * published docs (not guessed).
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

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(body?.error || `Docksys API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

/**
 * Looks up whatever Roblox ID is already linked to a Discord ID in a given
 * guild. Returns the Roblox ID string, or null if there's no link (Dock
 * returns 404) or the bot/key isn't authorized for that guild (403).
 * Anything else (401, 429, 500) throws.
 */
async function getLinkByDiscordId(discordId, guildId) {
  try {
    const res = await docksysRequest(
      `/api/v1/public/discord-to-roblox?discordId=${encodeURIComponent(discordId)}&guildId=${encodeURIComponent(guildId)}`
    );
    return res?.data?.robloxId || null;
  } catch (err) {
    if (err.status === 404 || err.status === 403) return null;
    throw err;
  }
}

/**
 * Starts a Dock verification session for a Discord user. Returns Dock's
 * session data: { sid, pid, clientId, expiresAt, reusedExisting, verifyUrl }.
 * Send the user to verifyUrl, then poll getVerificationSessionStatus(sid).
 */
async function createVerificationSession(discordId, guildId) {
  const res = await docksysRequest('/api/v1/verify/session', {
    method: 'POST',
    body: JSON.stringify({ pid: DOCKSYS_PID, clientId: discordId, guildId }),
  });
  return res.data;
}

/**
 * Checks (or long-polls, via `wait` seconds, capped at 25) a verification
 * session. Returns Dock's raw `data` object - either
 * { status: 'pending' | 'expired' | 'cancelled', result: null } or
 * { result: { discordId, robloxId, ... } } once the user completes it.
 */
async function getVerificationSessionStatus(sid, wait) {
  const query = wait ? `?wait=${Math.min(25, Math.max(1, wait))}` : '';
  const res = await docksysRequest(`/api/v1/verify/session/${encodeURIComponent(sid)}${query}`);
  return res.data;
}

module.exports = { getLinkByDiscordId, createVerificationSession, getVerificationSessionStatus };