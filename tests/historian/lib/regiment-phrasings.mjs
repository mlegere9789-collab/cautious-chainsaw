// regiment-phrasings.mjs - ground truth and phrasing generator for "does the engine resolve a regiment however a reader writes its name".
// The truth is read from the raw data files (lib/data.mjs), never from the engine's own index, so a defect in the registry cannot hide itself.
// A regiment is "plain" when its id is <side>-<number><state code> (U-19IN, C-26NC, U-2US): one infantry record per (ordinal, state), no battalion / cavalry / legion / detachment variants.
import { load } from './data.mjs';

const ONES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
const CARD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TENS_O = { 20: 'twentieth', 30: 'thirtieth', 40: 'fortieth', 50: 'fiftieth', 60: 'sixtieth', 70: 'seventieth', 80: 'eightieth', 90: 'ninetieth' };
const TENS_C = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };

/** 1 -> "1st", 22 -> "22nd", 111 -> "111th" */
export const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
/** spelled ordinal: 24 -> "twenty-fourth" (hyphen) or "twenty fourth", 140 -> "one hundred and fortieth" */
export function ordWords(n, hyphen = true) {
  if (n < 20) return ONES[n];
  if (n < 100) { const t = Math.floor(n / 10) * 10, o = n % 10; return o === 0 ? TENS_O[t] : `${TENS_C[t]}${hyphen ? '-' : ' '}${ONES[o]}`; }
  const h = Math.floor(n / 100), r = n % 100;
  return r === 0 ? `${CARD[h]} hundredth` : `${CARD[h]} hundred and ${ordWords(r, hyphen)}`;
}

// USPS codes and the period abbreviations a reader (or a regimental history) actually uses
export const ABBR = {
  Alabama: ['AL', 'Ala.'], Arkansas: ['AR', 'Ark.'], Connecticut: ['CT', 'Conn.'], Delaware: ['DE', 'Del.'], Florida: ['FL', 'Fla.'], Georgia: ['GA', 'Ga.'], Illinois: ['IL', 'Ill.'], Indiana: ['IN', 'Ind.'],
  Kentucky: ['KY', 'Ky.'], Louisiana: ['LA', 'La.'], Maine: ['ME', 'Me.'], Maryland: ['MD', 'Md.'], Massachusetts: ['MA', 'Mass.'], Michigan: ['MI', 'Mich.'], Minnesota: ['MN', 'Minn.'], Mississippi: ['MS', 'Miss.'],
  'New Hampshire': ['NH', 'N.H.'], 'New Jersey': ['NJ', 'N.J.'], 'New York': ['NY', 'N.Y.'], 'North Carolina': ['NC', 'N.C.'], Ohio: ['OH', 'O.'], Pennsylvania: ['PA', 'Penn.', 'Pa.'], 'Rhode Island': ['RI', 'R.I.'],
  'South Carolina': ['SC', 'S.C.'], Tennessee: ['TN', 'Tenn.'], Texas: ['TX', 'Tex.'], Vermont: ['VT', 'Vt.'], Virginia: ['VA', 'Va.'], 'West Virginia': ['WV', 'W.Va.'], Wisconsin: ['WI', 'Wis.'], 'United States': ['US', 'U.S.'],
};
// "O." for Ohio is a one-letter abbreviation nobody types; keep it out of the sample
ABBR.Ohio = ['OH'];

/** plain regiments from the raw data: [{ id, n, state, side }] (the US regulars carry state "United States", the form a reader types) */
export function plainRegiments() {
  const d = load();
  const out = [];
  for (const r of d.regs) {
    if (!/^(U|C)-\d+[A-Z]{2}$/.test(r.regiment_id) || r.alias_for) continue;
    const n = +r.designation.match(/^(\d+)/)[1];
    const state = r.state === 'Regular Army' ? 'United States' : r.state;
    if (!ABBR[state]) continue;
    out.push({ id: r.regiment_id, n, state, side: r.regiment_id[0], designation: r.designation });
  }
  return out;
}

/** phrasings: name -> (regiment) => query text */
export const PHRASINGS = {
  '<N> <State>': (r) => `${ordinal(r.n)} ${r.state}`,
  '<N> <State> Regiment': (r) => `${ordinal(r.n)} ${r.state} Regiment`,
  'the <N> <State> regiment': (r) => `the ${ordinal(r.n)} ${r.state} regiment`,
  '<N> <State> Infantry Regiment': (r) => `${ordinal(r.n)} ${r.state} Infantry Regiment`,
  '<N> <State> Volunteers': (r) => `${ordinal(r.n)} ${r.state} Volunteers`,
  '<N> <State> Volunteer Infantry': (r) => `${ordinal(r.n)} ${r.state} Volunteer Infantry`,
  '<N> Regiment, <State>': (r) => `${ordinal(r.n)} Regiment, ${r.state}`,
  '<N> Regiment <State> Infantry': (r) => `${ordinal(r.n)} Regiment ${r.state} Infantry`,
  '<N> <Abbr.> (period abbreviation)': (r) => `${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]}`,
  '<number> <USPS>': (r) => `${r.n} ${ABBR[r.state][0]}`,
  '<N> <USPS> Regiment': (r) => `${ordinal(r.n)} ${ABBR[r.state][0]} Regiment`,
  '<number> <State> (no suffix)': (r) => `${r.n} ${r.state}`,
  'spelled ordinal, hyphen': (r) => `${ordWords(r.n, true)} ${r.state}`,
  'spelled ordinal, space': (r) => `${ordWords(r.n, false)} ${r.state} Regiment`,
  'lower case, all': (r) => `${ordinal(r.n)} ${r.state} regiment`.toLowerCase(),
  'UPPER CASE': (r) => `${ordinal(r.n)} ${r.state} REGIMENT`.toUpperCase(),
  'Who commanded the <N> <State> Regiment?': (r) => `Who commanded the ${ordinal(r.n)} ${r.state} Regiment?`,
  'What did the <N> <State> Regiment do at Gettysburg?': (r) => `What did the ${ordinal(r.n)} ${r.state} Regiment do at Gettysburg?`,
  'How many men did the <N> <State> Regiment lose?': (r) => `How many men did the ${ordinal(r.n)} ${r.state} Regiment lose?`,
  "<State>'s <N>": (r) => `${r.state}'s ${ordinal(r.n)}`,
  '<State> <N>': (r) => `${r.state} ${ordinal(r.n)}`,
  '<N> <State> Volunteer Infantry Regiment': (r) => `${ordinal(r.n)} ${r.state} Volunteer Infantry Regiment`,
  '<N> <Abbr.> Inf.': (r) => `${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]} Inf.`,
  'tell me about the <N> <State> Infantry Regiment': (r) => `tell me about the ${ordinal(r.n)} ${r.state} Infantry Regiment`,
};
