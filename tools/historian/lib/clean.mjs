// clean.mjs - text hygiene at the data boundary. Everything shown to a reader goes through here (validator rules V05/V06 re-check the output).
//   * " -- " becomes a typographic dash; nothing is ever lower-cased (the deployed page printed "survived gettysburg -- lost arm at petersburg")
//   * sentences that are developer / animation notes are dropped ("across several ticks", "YouTube vignette", "Commander succession US-017 activates.")
//   * raw internal ids are replaced by display names, or the sentence is dropped when no name exists
import { cleanSite, splitSentences } from '../../../historian-src/core/text.js';

// case-sensitive developer markers
const DEV_CS = /CRITICAL(?: ANIMATION)?:|HIGHEST PRIORITY|DATA NOTE|must be shown|\bkeyframes?\b|flag_notes|Unique placement|\bunique placement\b/;
// case-insensitive markers
const DEV_CI = /\bYouTube\b|\bticks?\b|Commander succession [A-Z]{2}-\d+ activates|Dual designation alias|Skirmish Line disposition|\banimation\b|\bplacement note/i;

export const RAW_ID = /\b(?:[UC]-(?:[IVX]+|ART|CAV|HAB|\d{1,3}[A-Z]{1,3}|[A-Z][A-Za-z]+)(?:-[A-Za-z0-9]+)*|(?:US|CS)-\d{3})\b/g;

/** Replace raw ids using nameOf(id) -> string|null. Returns the text with ids humanised; unresolved ids leave a marker the caller must treat as dropped. */
export function humanizeIds(text, nameOf) {
  let unresolved = false;
  const out = text.replace(RAW_ID, (id) => {
    const n = nameOf ? nameOf(id) : null;
    if (n) return n;
    unresolved = true;
    return id;
  });
  return { text: out, unresolved };
}

/** Full cleaning of one prose field. dropIfId: sentences that still contain an unresolvable raw id are dropped. */
export function cleanProse(text, { nameOf = null, keepDevWords = false } = {}) {
  let t = cleanSite(text);
  if (!t) return '';
  const paras = t.split(/\n{2,}/);
  const out = [];
  for (const para of paras) {
    const sents = splitSentences(para);
    const kept = [];
    for (const { s, e } of sents) {
      let sent = para.slice(s, e).trim();
      if (!keepDevWords && (DEV_CS.test(sent) || DEV_CI.test(sent))) continue;
      const h = humanizeIds(sent, nameOf);
      if (h.unresolved) continue;
      kept.push(h.text);
    }
    if (kept.length) out.push(kept.join(' '));
  }
  return out.join('\n\n');
}

/** Short fields (fate, notes): same rules, single paragraph. Returns '' when nothing safe remains. */
export function cleanShort(text, opts) {
  const t = cleanProse(text, opts);
  return t.replace(/\n+/g, ' ').trim();
}

/** Strip a trailing period-less fragment issue: ensure a sentence ends with punctuation. */
export const endSentence = (s) => (s && !/[.!?"'”)]$/.test(s.trim()) ? s.trim() + '.' : s.trim());

/** Fates like "See U-11PA" point at another record: not a fate. */
export const isCrossRef = (s) => /^See\s+[UC]-/i.test(String(s || '').trim());

export const hasDevNote = (s) => DEV_CS.test(s) || DEV_CI.test(s);
export const hasRawId = (s) => { RAW_ID.lastIndex = 0; const r = RAW_ID.test(s); RAW_ID.lastIndex = 0; return r; };
