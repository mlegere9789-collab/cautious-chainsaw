// lint.js - render lint (invariants I1-I8, the subset checkable from an answer object alone). Runs on every answer; the test suite runs it over
// all 1,600+ entity cards' answers and over the golden run. A non-empty result means a defect shipped to the reader.
import { normalizeWs } from './text.js';

const FORBIDDEN = [
  [/\bundefined\b/i, 'undefined'], [/\bNaN\b/, 'NaN'], [/\bnull\b/, 'null'], [/\s--\s/, 'double-hyphen'],
  [/\b[UC]-(?:[IVX]+|ART|CAV|HAB|\d{1,3}[A-Z]{1,3})(?:-[A-Za-z0-9]+)*\b/, 'raw-unit-id'], [/\b(?:BDE|DIV|CORPS|ARMY|ART|ABDE|SUCC|ROAD|STR|TF|CAS|SITE|MON):/, 'namespaced-id'],
  [/\b(?:US|CS)-\d{3}\b/, 'succession-id'], [/\bLOC-\d{3}\b/, 'location-id'], [/\bD[123]T\d+\b/, 'event-id'], [/\bV-\d{3}\b/, 'vignette-id'],
  [/\bsite clock\b/i, 'site-clock'], [/\btick\b/i, 'tick'], [/DATA NOTE|must be shown|CRITICAL:|keyframe|flag_notes|\banimation\b/, 'dev-note'], [/\bYouTube\b/, 'youtube-note'],
  [/\bAI[- ]?(?:style|generated|powered)\b|search-and-synthesis/i, 'overclaim'],
];

export function lintAnswer(kb, a) {
  const out = [];
  // a verbatim quotation of a primary source (the Official Records, 1863-1889 print) is data, not the site's copy: the copy rules (no "null", no id-like tokens) are applied to everything around it
  let main = a.text || '';
  for (const b of a.blocks || []) if (b.t === 'quote' && /^or27-/.test(String(b.source || '')) && b.text) main = main.split(b.text).join(' ');
  const texts = [main];
  for (const b of a.blocks || []) {
    if (b.t === 'quote') {
      if (!(b.s >= 0 && b.e > b.s && b.text)) out.push({ rule: 'I3', msg: 'quote without valid offsets' });
      if (!b.attrib) out.push({ rule: 'I4', msg: 'quote without attribution' });
      texts.push(b.attrib || '');
    }
  }
  for (const t of texts) for (const [re, name] of FORBIDDEN) if (re.test(t)) out.push({ rule: 'I6/V06', msg: `forbidden ${name}`, ctx: (t.match(re) || [''])[0] });
  for (const c of (a.chips && a.chips.follow) || []) for (const [re, name] of FORBIDDEN) if (re.test(c.label) || re.test(c.q)) out.push({ rule: 'V06', msg: `forbidden ${name} in chip`, ctx: c.label });
  return out;
}
export const FORBIDDEN_PATTERNS = FORBIDDEN;
