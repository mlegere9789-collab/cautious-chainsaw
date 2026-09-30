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
export const ARM_WORDS = { infantry: 'inf', volunteer: 'inf', volunteers: 'inf', cavalry: 'cav', cav: 'cav', reserves: 'res', reserve: 'res', battalion: 'bn', sharpshooters: 'ss',
  sharpshooter: 'ss', battery: 'art', artillery: 'art', zouaves: 'inf', militia: 'inf', legion: 'inf', regiment: null, regt: null };

const isOrd = (t) => t && t.charCodeAt(0) === 35 && /^#\d+$/.test(t);
// abbreviations that are also everyday words; "on July 3 in Pennsylvania" must not read as "3rd Indiana"
const AMBIG_ABBR = new Set(['in', 'me', 'la', 'al', 'us', 'de', 'ma', 'mo', 'oh', 'ar', 'ia', 'mi']);
const BLOCK_NEXT = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'of', 'at', 'on', 'by', 'to', 'is', 'was', 'were', 'are', 'be', 'from', 'with', 'my', 'your', 'our', 'his', 'her', 'their', 'it', 'its']);
const BLOCK_PREV = new Set(['july', 'day', 'days', 'on', 'at', 'by', 'about', 'than', 'around', 'of', 'to', 'until', 'since', 'from', 'for', 'these', 'those', 'last', 'next', 'top', 'first']);

/**
 * Find unit mentions in a token array (output of text.tokenize with stop words kept).
 * Returns [{ ords:[n..], state, arm|null, start, end, abbr }] where [start,end) is the token span consumed (ordinals, state, arm word).
 */
export function findUnitMentions(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!isOrd(tokens[i])) continue;
    const ords = [];
    let j = i;
    while (j < tokens.length && isOrd(tokens[j])) {
      ords.push(+tokens[j].slice(1)); j++;
      if ((tokens[j] === 'and' || tokens[j] === 'or') && isOrd(tokens[j + 1])) j++;
    }
    // state (multi-word first), abbreviation only valid here because a number precedes
    let state = null, used = 0, abbr = false;
    const three = tokens.slice(j, j + 3).join(' '), two = tokens.slice(j, j + 2).join(' '), one = tokens[j];
    if (STATES.includes(two)) { state = two; used = 2; }
    else if (one && STATES.includes(one)) { state = one; used = 1; }
    else if (one && STATE_ABBR[one] && !(AMBIG_ABBR.has(one) && (BLOCK_PREV.has(tokens[i - 1]) || BLOCK_NEXT.has(tokens[j + 1]) || ords[ords.length - 1] > 200))) { state = STATE_ABBR[one]; used = 1; abbr = true; }
    else if (three === 'us colored troops') { state = 'united states'; used = 1; }
    if (!state) { i = j - 1; continue; }
    // "1 n y" (unpunctuated) and "n c"/"s c" split forms: try to glue two single letters
    let end = j + used;
    let arm = null;
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
