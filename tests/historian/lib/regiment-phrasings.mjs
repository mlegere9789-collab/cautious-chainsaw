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
  // ---- the relation written out: "the 6th regiment FROM / IN / OUT OF / FOR Wisconsin" (verifier R-19: 327 of 370 regiments returned the state roll-up) ----------------------------------------------------
  'the <N> regiment from <State>': (r) => `the ${ordinal(r.n)} regiment from ${r.state}`,
  'the <N> regiment in <State>': (r) => `the ${ordinal(r.n)} regiment in ${r.state}`,
  'the <N> regiment out of <State>': (r) => `the ${ordinal(r.n)} regiment out of ${r.state}`,
  'the <N> regiment for <State>': (r) => `the ${ordinal(r.n)} regiment for ${r.state}`,
  'the <N> regiment of <State>': (r) => `the ${ordinal(r.n)} regiment of ${r.state}`,
  'the <N> Regiment of the State of <State>': (r) => `the ${ordinal(r.n)} Regiment of the State of ${r.state}`,
  '<N> Infantry from <State>': (r) => `${ordinal(r.n)} Infantry from ${r.state}`,
  'the <N> of <State>': (r) => `the ${ordinal(r.n)} of ${r.state}`,
  'the <N> from <State>': (r) => `the ${ordinal(r.n)} from ${r.state}`,
  'the <N> Volunteer Infantry Regiment out of <State>': (r) => `the ${ordinal(r.n)} Volunteer Infantry Regiment out of ${r.state}`,
  'spelled <N> regiment from <State>': (r) => `the ${ordWords(r.n, true)} regiment from ${r.state}`,
  'Tell me about the <N> regiment from <State>': (r) => `Tell me about the ${ordinal(r.n)} regiment from ${r.state}`,
  'What did the <N> regiment from <State> do at Gettysburg?': (r) => `What did the ${ordinal(r.n)} regiment from ${r.state} do at Gettysburg?`,
  'Who commanded the <N> regiment in <State>?': (r) => `Who commanded the ${ordinal(r.n)} regiment in ${r.state}?`,
  // ---- the state first: "Michigan Regiment 24", "Wisconsin Infantry Regiment No. 6" -------------------------------------------------------------------------------------------------------------------
  '<State> Regiment <number>': (r) => `${r.state} Regiment ${r.n}`,
  '<State> regiment number <number>': (r) => `${r.state} regiment number ${r.n}`,
  '<State> Infantry Regiment No. <number>': (r) => `${r.state} Infantry Regiment No. ${r.n}`,
  '<State> Volunteers, <N> Regiment': (r) => `${r.state} Volunteers, ${ordinal(r.n)} Regiment`,
  '<State> Volunteer Infantry <N>': (r) => `${r.state} Volunteer Infantry ${ordinal(r.n)}`,
  '<USPS> <N>': (r) => `${ABBR[r.state][0]} ${ordinal(r.n)}`,
  '<Abbr.> <N> (period abbreviation first)': (r) => `${ABBR[r.state][ABBR[r.state].length - 1]} ${ordinal(r.n)}`,
  // ---- abbreviations and punctuation -----------------------------------------------------------------------------------------------------------------------------------------------------------------
  'the <N> <Abbr.> Regiment': (r) => `the ${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]} Regiment`,
  '<N> <Abbr.> Vols.': (r) => `${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]} Vols.`,
  '<N> <Abbr.> Vol. Inf.': (r) => `${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]} Vol. Inf.`,
  '<N> <USPS> Volunteer Infantry': (r) => `${ordinal(r.n)} ${ABBR[r.state][0]} Volunteer Infantry`,
  '<N> <State>.': (r) => `${ordinal(r.n)} ${r.state}.`,
  '<N> <State>?': (r) => `${ordinal(r.n)} ${r.state}?`,
  '"<N> <State>" (quoted)': (r) => `"${ordinal(r.n)} ${r.state}"`,
  '<N> (<State>)': (r) => `${ordinal(r.n)} (${r.state})`,
  '<N>, <State>': (r) => `${ordinal(r.n)}, ${r.state}`,
  '<N>-<State>': (r) => `${ordinal(r.n)}-${r.state}`,
  '<N> <State>  (double space)': (r) => `${ordinal(r.n)}  ${r.state}`,
  '<N> <State> regiment please': (r) => `${ordinal(r.n)} ${r.state} regiment please`,
  'spelled ordinal, no hyphen, <State> Infantry': (r) => `${ordWords(r.n, false)} ${r.state} Infantry`,
  '<N> sp-suffix ("24 th <State>")': (r) => `${r.n} ${['th', 'st', 'nd', 'rd'][(r.n % 100 >= 11 && r.n % 100 <= 13) ? 0 : (r.n % 10 < 4 ? r.n % 10 : 0)]} ${r.state}`,
  // ---- period abbreviations of the arm and the word "regiment", and the way a regimental history names a unit --------------------------------------------------------------------------------------------
  '<N> <State> Regt.': (r) => `${ordinal(r.n)} ${r.state} Regt.`,
  '<N> <State> Reg.': (r) => `${ordinal(r.n)} ${r.state} Reg.`,
  '<N> <State> Regt. Vol. Inf.': (r) => `${ordinal(r.n)} ${r.state} Regt. Vol. Inf.`,
  '<N> <State> Inf. Regt.': (r) => `${ordinal(r.n)} ${r.state} Inf. Regt.`,
  'the <N> <State> Vols': (r) => `the ${ordinal(r.n)} ${r.state} Vols`,
  '<N> <State> Volunteers Regiment': (r) => `${ordinal(r.n)} ${r.state} Volunteers Regiment`,
  'Company K, <N> <State>': (r) => `Company K, ${ordinal(r.n)} ${r.state}`,
  '<N> <State> at Gettysburg': (r) => `${ordinal(r.n)} ${r.state} at Gettysburg`,
  'the <N> <State> in the Battle of Gettysburg': (r) => `the ${ordinal(r.n)} ${r.state} in the Battle of Gettysburg`,
  'the <N> regiment, <State> Volunteers': (r) => `the ${ordinal(r.n)} regiment, ${r.state} Volunteers`,
  'the <N> raised in <State>': (r) => `the ${ordinal(r.n)} regiment raised in ${r.state}`,
  'the <N> regiment that came from <State>': (r) => `the ${ordinal(r.n)} regiment that came from ${r.state}`,
  // ---- found by probing beyond the templates above: the abbreviation "reg.", capitals with periods, the number after the word regiment, a request wrapped around the name ---------------------------------------------
  '<N> reg. <State>': (r) => `${ordinal(r.n)} reg. ${r.state}`,
  'UPPER <N> <Abbr.>': (r) => `${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]}`.toUpperCase(),
  '<State> <number> regiment': (r) => `${r.state} ${r.n} regiment`,
  '<State> <N spelled>': (r) => `${r.state} ${ordWords(r.n, true)}`,
  'Regiment <number> from <State>': (r) => `Regiment ${r.n} from ${r.state}`,
  'No. <number> <State>': (r) => `No. ${r.n} ${r.state}`,
  '<State> Infantry <N> Regiment': (r) => `${r.state} Infantry ${ordinal(r.n)} Regiment`,
  "I'd like to know about the <N> regiment from <State>, please.": (r) => `I'd like to know about the ${ordinal(r.n)} regiment from ${r.state}, please.`,
  'Where was the <N> <State> Infantry on July 3?': (r) => `Where was the ${ordinal(r.n)} ${r.state} Infantry on July 3?`,
  'How many men did the <N> regiment from <State> have?': (r) => `How many men did the ${ordinal(r.n)} regiment from ${r.state} have?`,
  'the <State> <N>': (r) => `the ${r.state} ${ordinal(r.n)}`,
  '<N> (<State>) abbreviated number': (r) => `${r.n} (${r.state})`,
};

// cavalry regiments with a simple designation ("8th Illinois Cavalry"): the same grammar with the arm word, ground truth from the raw designations
export function cavalryRegiments() {
  const d = load(); const out = [];
  for (const r of d.regs) {
    if (!/^U-\d+[A-Z]{2}-CAV$|^C-\d+[A-Z]{2}-CAV$/.test(r.regiment_id) || r.alias_for) continue;
    const m = r.designation.match(/^(\d+)(?:st|nd|rd|th) ([A-Za-z ]+?) Cavalry\b/); if (!m) continue;
    const state = r.state === 'Regular Army' ? 'United States' : r.state;
    if (!ABBR[state]) continue;
    out.push({ id: r.regiment_id, n: +m[1], state, side: r.regiment_id[0], designation: r.designation });
  }
  return out;
}
export const CAVALRY_PHRASINGS = {
  '<N> <State> Cavalry': (r) => `${ordinal(r.n)} ${r.state} Cavalry`,
  '<N> <State> Cavalry Regiment': (r) => `${ordinal(r.n)} ${r.state} Cavalry Regiment`,
  'the <N> <State> cavalry': (r) => `the ${ordinal(r.n)} ${r.state} cavalry`,
  '<N> <State> Volunteer Cavalry': (r) => `${ordinal(r.n)} ${r.state} Volunteer Cavalry`,
  '<N> Cavalry, <State>': (r) => `${ordinal(r.n)} Cavalry, ${r.state}`,
  'the <N> cavalry regiment from <State>': (r) => `the ${ordinal(r.n)} cavalry regiment from ${r.state}`,
  'the <N> cavalry of <State>': (r) => `the ${ordinal(r.n)} cavalry of ${r.state}`,
  '<N> <Abbr.> Cav.': (r) => `${ordinal(r.n)} ${ABBR[r.state][ABBR[r.state].length - 1]} Cav.`,
  '<N> <USPS> Cavalry': (r) => `${ordinal(r.n)} ${ABBR[r.state][0]} Cavalry`,
  'spelled <N> <State> Cavalry': (r) => `${ordWords(r.n, true)} ${r.state} Cavalry`,
  '<State> Cavalry <N>': (r) => `${r.state} Cavalry ${ordinal(r.n)}`,
  'Who commanded the <N> <State> Cavalry?': (r) => `Who commanded the ${ordinal(r.n)} ${r.state} Cavalry?`,
};
