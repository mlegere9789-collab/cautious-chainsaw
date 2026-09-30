// units.js - grammar-based unit linker pieces: state tables, arm words, and the "N-th <state> [arm]" mention parser.
// Shared by the build (deriving unit keys from designations) and the runtime (linking a query). Dependency free.
//
// UNIT   := ORDLIST STATE [ARM]           ("Forty-ninth and Seventy-seventh New York", "20th ME", "1 MN", "84th N.Y. Volunteers")
// ORDLIST:= "#n" ( ("and"|"&"|",") "#m" )*  (tokens produced by text.tokenize: ordinals/numbers -> "#n")
// State abbreviations expand only after a number ("in", "me", "us", "la", "al" stay ordinary words elsewhere).

import { tokenize } from './text.js';

export const STATES = ['alabama', 'arkansas', 'connecticut', 'delaware', 'florida', 'georgia', 'illinois', 'indiana', 'iowa', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'new hampshire', 'new jersey', 'new york', 'north carolina', 'ohio',
  'pennsylvania', 'rhode island', 'south carolina', 'tennessee', 'texas', 'vermont', 'virginia', 'west virginia', 'wisconsin', 'united states', 'brooklyn'];

// abbreviation (after a number) -> state; first entry per state is the canonical 2-letter code used in aliases
export const STATE_ABBR = {
  al: 'alabama', ala: 'alabama', ar: 'arkansas', ark: 'arkansas', ct: 'connecticut', conn: 'connecticut', de: 'delaware', del: 'delaware', fl: 'florida', fla: 'florida',
  ga: 'georgia', il: 'illinois', ill: 'illinois', in: 'indiana', ind: 'indiana', ia: 'iowa', ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland',
  ma: 'massachusetts', mass: 'massachusetts', mi: 'michigan', mich: 'michigan', mn: 'minnesota', minn: 'minnesota', ms: 'mississippi', miss: 'mississippi', mo: 'missouri',
  nh: 'new hampshire', nj: 'new jersey', ny: 'new york', nc: 'north carolina', oh: 'ohio', pa: 'pennsylvania', penn: 'pennsylvania', ri: 'rhode island', sc: 'south carolina',
  tn: 'tennessee', tenn: 'tennessee', tx: 'texas', tex: 'texas', vt: 'vermont', va: 'virginia', wv: 'west virginia', wva: 'west virginia', wi: 'wisconsin', wis: 'wisconsin',
  us: 'united states', usa: 'united states', usv: 'united states',
};
export const STATE_CODE = { alabama: 'AL', arkansas: 'AR', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', illinois: 'IL', indiana: 'IN', iowa: 'IA', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new york': 'NY', 'north carolina': 'NC', ohio: 'OH', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', tennessee: 'TN', texas: 'TX', vermont: 'VT', virginia: 'VA',
  'west virginia': 'WV', wisconsin: 'WI', 'united states': 'US', brooklyn: 'NY' };
export const STATE_TITLE = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

// arm words -> arm code
export const ARM_WORDS = { infantry: 'inf', inf: 'inf', volunteer: 'inf', volunteers: 'inf', vol: null, vols: null, cavalry: 'cav', cav: 'cav', reserves: 'res', reserve: 'res', battalion: 'bn', sharpshooters: 'ss',
  sharpshooter: 'ss', battery: 'art', artillery: 'art', zouaves: 'inf', militia: 'inf', legion: 'inf', regiment: null, regt: null, regiments: null };

const isOrd = (t) => t && t.charCodeAt(0) === 35 && /^#\d+$/.test(t);
// abbreviations that are also everyday words; "on July 3 in Pennsylvania" must not read as "3rd Indiana"
const AMBIG_ABBR = new Set(['in', 'me', 'la', 'al', 'us', 'de', 'ma', 'mo', 'oh', 'ar', 'ia', 'mi']);
const BLOCK_NEXT = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'of', 'at', 'on', 'by', 'to', 'is', 'was', 'were', 'are', 'be', 'from', 'with', 'my', 'your', 'our', 'his', 'her', 'their', 'it', 'its']);
// words that may stand between the ordinal and the state name ("19th Regiment, Indiana", "1st Infantry Michigan")
const PRE_FILLER = new Set(['regiment', 'regt', 'infantry', 'inf', 'volunteer', 'volunteers', 'vol', 'vols', 'cavalry']);
// words that join a regiment to its state when a reader writes the relation out ("the 6th regiment FROM Wisconsin", "the 24th Infantry OUT OF Michigan", "the 19th regiment raised IN Indiana"); query time only
const CONNECT_PAIR = new Set(['out of', 'raised in', 'raised from', 'raised by', 'recruited in', 'recruited from', 'organized in', 'organised in', 'enlisted in', 'enlisted from', 'mustered in', 'mustered from', 'hailing from', 'coming from', 'belonging to', 'originating in', 'originating from']);
const CONNECT_ONE = new Set(['of', 'from', 'in', 'for', 'representing']);
const CONNECT_FILL = new Set(['the', 'state', 'commonwealth', 'great']);
// a bare ordinal ("the 24th from Michigan") takes only "of" and "from": "in" and "for" after a number are ordinary English ("the 3rd in Pennsylvania's line")
/** index just past a connector phrase that starts at tokens[k] ("from", "out of", "of the state of"), or -1 */
function connectorEnd(tokens, k, hasFiller) {
  const w = tokens[k], w2 = tokens[k + 1]; let e = -1;
  if (w !== undefined && w2 !== undefined && CONNECT_PAIR.has(`${w} ${w2}`)) { if (!hasFiller && w !== 'out') return -1; e = k + 2; }
  else if (CONNECT_ONE.has(w)) { if (!hasFiller && w !== 'of' && w !== 'from') return -1; e = k + 1; }
  else return -1;
  for (let g = 0; g < 4 && e < tokens.length; g++) { const x = tokens[e]; if (CONNECT_FILL.has(x) || (x === 'of' && g > 0)) e++; else break; }
  return e;
}
const BLOCK_PREV = new Set(['july', 'day', 'days', 'on', 'at', 'by', 'about', 'than', 'around', 'of', 'to', 'until', 'since', 'from', 'for', 'these', 'those', 'last', 'next', 'top', 'first']);

/** the state (or abbreviation) that starts at tokens[j]: { state, used, abbr } or null. Ambiguous abbreviations ("in", "me") obey the same blocks as before; opts.noAmbig refuses them outright. */
export function stateAt(tokens, j, { prev = null, last = 0, noAmbig = false } = {}) {
  const three = tokens.slice(j, j + 3).join(' '), two = tokens.slice(j, j + 2).join(' '), one = tokens[j];
  if (STATES.includes(two)) return { state: two, used: 2, abbr: false };
  if (one && STATES.includes(one)) return { state: one, used: 1, abbr: false };
  if (one && STATE_ABBR[one] && !(AMBIG_ABBR.has(one) && (noAmbig || BLOCK_PREV.has(prev) || BLOCK_NEXT.has(tokens[j + 1]) || last > 200))) return { state: STATE_ABBR[one], used: 1, abbr: true };
  if (three === 'us colored troops') return { state: 'united states', used: 1, abbr: false };
  return null;
}

/**
 * Find unit mentions in a token array (output of text.tokenize with stop words kept).
 * Returns [{ ords:[n..], state, arm|null, start, end, abbr }] where [start,end) is the token span consumed (ordinals, state, arm word).
 */
export function findUnitMentions(tokens, { reversed = false, loose = false } = {}) {
  const out = findForward(tokens, loose);
  if (reversed) {
    // "Wisconsin's 2nd", "Wisconsin 2nd Infantry", "Michigan Regiment No. 24", "Wis. 6th": the state first (query-time only; the build keeps the designation grammar)
    const taken = new Array(tokens.length).fill(false);
    for (const m of out) for (let k = m.start; k < m.end; k++) taken[k] = true;
    for (let i = 0; i < tokens.length; i++) {
      if (taken[i]) continue;
      const two = tokens.slice(i, i + 2).join(' ');
      let used = STATES.includes(two) ? 2 : STATES.includes(tokens[i]) ? 1 : 0, state = used === 2 ? two : tokens[i];
      // an abbreviation ("wis 6th", "ny 104th", "mich regiment 24") counts only when it is not an everyday word and a regiment number follows
      if (!used && loose && STATE_ABBR[tokens[i]] && !AMBIG_ABBR.has(tokens[i])) { used = 1; state = STATE_ABBR[tokens[i]]; }
      if (!used || tokens[i] === 'brooklyn' || tokens[i] === 'united') continue;
      // "Michigan regiment 24", "Wisconsin Volunteer Infantry, Regiment No. 6": words between the state and its number
      let oi = i + used;
      for (let g = 0; g < 5 && oi < tokens.length && (PRE_FILLER.has(tokens[oi]) || tokens[oi] === 'number' || tokens[oi] === 'no' || tokens[oi] === 'num' || tokens[oi] === 'state' || tokens[oi] === 'of'); g++) oi++;
      if (oi > i + used && !loose) continue;
      const o = tokens[oi];
      if (!isOrd(o) || taken[oi] || +o.slice(1) > 200) continue;
      let end = oi + 1, arm = null;
      for (let g = 0; g < 2 && end < tokens.length; g++) { const w = tokens[end]; if (w in ARM_WORDS) { if (ARM_WORDS[w]) arm = arm || ARM_WORDS[w]; end++; } else break; }
      out.push({ ords: [+o.slice(1)], state, arm, start: i, end, abbr: used === 1 && !STATES.includes(state), reversed: true });
      for (let k = i; k < end; k++) taken[k] = true;
      i = end - 1;
    }
    out.sort((a, b) => a.start - b.start);
  }
  return out;
}

function findForward(tokens, loose = false) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!isOrd(tokens[i])) continue;
    const ords = [];
    let j = i;
    while (j < tokens.length && isOrd(tokens[j])) {
      ords.push(+tokens[j].slice(1)); j++;
      if ((tokens[j] === 'and' || tokens[j] === 'or') && isOrd(tokens[j + 1])) j++;
    }
    // words a reader puts between the ordinal and the state: "19th Regiment, Indiana", "19th Regiment of Indiana Volunteers", "1st Cavalry Michigan"
    let pre = null, preArm = null, preSeen = false, afterFill = j;
    for (let g = 0, k = j; g < 3 && k < tokens.length; g++) {
      const w = tokens[k];
      if (PRE_FILLER.has(w)) { if (w in ARM_WORDS && ARM_WORDS[w]) preArm = preArm || ARM_WORDS[w]; preSeen = true; k++; pre = k; afterFill = k; }
      else if (preSeen && w === 'of') { k++; pre = k; }
      else break;
    }
    let sj = pre !== null && stateAt(tokens, pre, { noAmbig: true }) ? pre : j;
    // the relation written out: "the 24th regiment FROM Michigan", "the 19th Infantry OUT OF Indiana", "the 24th OF Michigan" (query time: loose)
    if (loose && !(sj !== j || stateAt(tokens, j, { prev: tokens[i - 1], last: ords[ords.length - 1] }))) {
      const last = ords[ords.length - 1];
      if (last <= 200 && (preSeen || !BLOCK_PREV.has(tokens[i - 1]))) {
        const ce = connectorEnd(tokens, afterFill, preSeen);
        if (ce > 0 && stateAt(tokens, ce, { noAmbig: true })) sj = ce;
      }
    }
    // state (multi-word first), abbreviation only valid here because a number precedes
    let state = null, used = 0, abbr = false;
    const st = stateAt(tokens, sj, { prev: tokens[i - 1], last: ords[ords.length - 1] });
    if (st) { state = st.state; used = st.used; abbr = st.abbr; }
    if (!state) { i = j - 1; continue; }
    j = sj;
    // "1 n y" (unpunctuated) and "n c"/"s c" split forms: try to glue two single letters
    let end = j + used;
    let arm = preArm;
    // skip filler between state and arm ("New York State Volunteers", "Pennsylvania Volunteer Infantry")
    let k = end;
    for (let g = 0; g < 3 && k < tokens.length; g++) {
      const w = tokens[k];
      if (w in ARM_WORDS) { if (ARM_WORDS[w]) arm = arm || ARM_WORDS[w]; k++; end = k; }
      else if (w === 'state' || w === 'us' || w === 'regiment' || w === 'regt' || w === 'regulars') { k++; }
      else break;
    }
    out.push({ ords, state, arm, start: i, end, abbr });
    i = end - 1;
  }
  return out;
}

/** Split "Nth <state> ..." out of a designation string (build time). Returns {ord, state, arm} or null. */
export function parseDesignation(designation) {
  const toks = tokenize(designation.replace(/\([^)]*\)/g, ' '));
  const m = findUnitMentions(toks)[0];
  if (!m || m.start !== 0) return null;
  let arm = m.arm;
  const rest = toks.slice(m.end).join(' ');
  if (!arm) {
    if (/\bcav|cavalry\b/.test(toks.join(' '))) arm = 'cav';
    else if (/reserves/.test(toks.join(' '))) arm = 'res';
    else if (/sharpshooters/.test(toks.join(' '))) arm = 'ss';
    else if (/battalion/.test(toks.join(' '))) arm = 'bn';
    else if (/battery|artillery/.test(toks.join(' '))) arm = 'art';
    else arm = 'inf';
  }
  return { ord: m.ords[0], state: m.state, arm, rest };
}

/** Same grammar over the parenthetical alias text ("14th Brooklyn", "42nd Pennsylvania / Original Bucktails"). Returns [{ord,state,arm}]. */
export function parseParenKeys(designation) {
  const out = [];
  for (const p of designation.matchAll(/\(([^)]*)\)/g)) {
    for (const part of p[1].split('/')) {
      const toks = tokenize(part);
      for (const m of findUnitMentions(toks)) if (m.ords.length === 1) out.push({ ord: m.ords[0], state: m.state, arm: m.arm || 'inf' });
    }
  }
  return out;
}

/** Preference among candidate arms when the user gave no arm: infantry first, then reserves, sharpshooters, battalions, cavalry, artillery. */
export const ARM_RANK = { inf: 0, res: 1, ss: 2, bn: 3, cav: 4, art: 5 };
