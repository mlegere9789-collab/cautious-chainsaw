// names.mjs - person-name parsing, ordinals, and small display helpers used by the registry.

export const RANKS = ['Lieutenant General', 'Major General', 'Brigadier General', 'Lieutenant Colonel', 'General', 'Colonel', 'Major', 'Captain', 'Lieutenant', 'Sergeant',
  'Corporal', 'Private', 'Commodore', 'Surgeon', 'Chaplain'];
const RANK_RE = new RegExp('^(' + RANKS.join('|') + ')\\s+');
// rank order for choosing the "most senior" title a person held in the records
export const RANK_ORDER = { 'Lieutenant General': 9, 'Major General': 8, 'Brigadier General': 7, General: 9, Colonel: 6, 'Lieutenant Colonel': 5, Major: 4, Captain: 3, Lieutenant: 2, Sergeant: 1, Corporal: 0, Private: 0 };
export const isGeneral = (rank) => /General$/.test(rank || '');

const PARTICLES = new Set(['van', 'von', 'de', 'du', 'la', 'le', 'st.', 'st', 'mc', 'o']);

/** "Colonel Joshua Lawrence Chamberlain" -> {rank, name, given, surname, key}. Handles "Augustus Van Horne Ellis", "J.H. Hobart Ward", "K. Oscar Broady". */
export function parseName(full) {
  const raw = String(full || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const m = raw.match(RANK_RE);
  const rank = m ? m[1] : '';
  const name = raw.replace(RANK_RE, '').trim();
  const parts = name.split(' ');
  let surname = parts[parts.length - 1];
  let sIdx = parts.length - 1;
  // particles: "Van Horne Ellis" -> surname "Ellis" (keep last token); "von Gilsa" -> "von Gilsa" is fine for display, surname key = last
  if (/^(Jr\.?|Sr\.?|II|III)$/i.test(surname) && parts.length > 1) { sIdx--; surname = parts[sIdx]; }
  const given = parts.slice(0, sIdx).join(' ');
  // identity key: first given name + surname ("John F. Reynolds" and "John Reynolds" are one person; middle names and initials are dropped)
  const g1 = (given.split(' ')[0] || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const key = `${g1 ? g1 + '-' : ''}${surname.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
  return { rank, name, given, surname, key };
}

export const shortRank = (r) => ({ 'Lieutenant General': 'Lt. Gen.', 'Major General': 'Maj. Gen.', 'Brigadier General': 'Brig. Gen.', 'Lieutenant Colonel': 'Lt. Col.', Colonel: 'Col.', Captain: 'Capt.', Lieutenant: 'Lt.' }[r] || r);

// ---- ordinals -----------------------------------------------------------------------------------------------------------
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const ONES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
const TENS_O = { 20: 'twentieth', 30: 'thirtieth', 40: 'fortieth', 50: 'fiftieth', 60: 'sixtieth', 70: 'seventieth', 80: 'eightieth', 90: 'ninetieth' };
const TENS_C = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };
export function ordinalWord(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return n % 10 === 0 ? TENS_O[n] : `${TENS_C[n - (n % 10)]}-${ONES[n % 10]}`;
  if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return `${['', 'one', 'two', 'three'][h]} hundred${r ? ' and ' + ordinalWord(r) : 'th'}`.replace('hundredth and', 'hundred and'); }
  return String(n);
}
export const capitalize = (s) => s.replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

export const CORPS_ROMAN = { I: 'First', II: 'Second', III: 'Third', V: 'Fifth', VI: 'Sixth', XI: 'Eleventh', XII: 'Twelfth', CAV: 'Cavalry' };
