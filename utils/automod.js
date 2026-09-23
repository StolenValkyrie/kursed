const fs = require('fs');
const path = require('path');

const BADWORDS_PATH = path.join(__dirname, '..', 'data', 'badwords.json');

// Seed list is intentionally minimal - add your own filtered terms to
// data/badwords.json (a plain JSON array of lowercase strings/substrings).
// The file is created automatically on first run if it doesn't exist.
const DEFAULT_LIST = [];

function loadList() {
  try {
    const raw = fs.readFileSync(BADWORDS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_LIST;
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.mkdirSync(path.dirname(BADWORDS_PATH), { recursive: true });
      fs.writeFileSync(BADWORDS_PATH, JSON.stringify(DEFAULT_LIST, null, 2));
      return DEFAULT_LIST;
    }
    console.error('[automod] failed to load badwords.json:', err);
    return DEFAULT_LIST;
  }
}

// Collapses leetspeak substitutions, repeated letters, and separators
// (spaces, dots, dashes, underscores) so "v.i l3--e" still matches "vile".
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z]/g, '');
}

/**
 * Checks message content against the word list.
 * @returns {{flagged: boolean, matched?: string}}
 */
function scan(content) {
  const list = loadList();
  if (list.length === 0) return { flagged: false };

  const normalized = normalize(content);
  for (const word of list) {
    const cleanWord = normalize(word);
    if (cleanWord && normalized.includes(cleanWord)) {
      return { flagged: true, matched: word };
    }
  }
  return { flagged: false };
}

module.exports = { scan, loadList };