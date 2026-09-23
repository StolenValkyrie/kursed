const DOCKSYS_API_BASE = process.env.DOCKSYS_API_BASE || 'https://api.docksys.xyz';
const DOCKSYS_API_KEY = process.env.DOCKSYS_API_KEY;

if (!DOCKSYS_API_KEY) {
  console.warn('[docksys] DOCKSYS_API_KEY is not set in .env - verification will fail.');
}

async function getLinkByDiscordId(discordId) {
  const res = await fetch(`${DOCKSYS_API_BASE}/v1/links/${discordId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${DOCKSYS_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Docksys API returned ${res.status}: ${body}`);
  }

  const data = await res.json();

  if (data && (data.linked === false || data.success === false)) {
    return null;
  }

  return data.link || data;
}

module.exports = { getLinkByDiscordId };