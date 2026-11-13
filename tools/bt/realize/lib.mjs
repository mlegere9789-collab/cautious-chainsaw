// Shared helpers of the realization harness (gate Q17): repository paths, the theatre clock, text normalisation, hashing.
// Nothing here knows about a realization record; see schema.mjs, query.mjs, checks.mjs and check.mjs.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

export const HARNESS = 'bt-realize-1';                                  // version of the record format and of the check semantics; bump on any change of a rule
const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../..');
export const BT = path.join(ROOT, 'docs/battle-theatre');
export const APP = path.join(BT, 'app');
export const GOV = path.join(BT, 'GOVERNANCE');
export const REAL = path.join(GOV, 'realizations');
export const rel = p => path.relative(ROOT, p).split(path.sep).join('/');

// Every file the harness reads goes through readText (or is noted with noteRead): the digest of the inputs of a run (check.mjs, query.mjs inputsDigest) hashes exactly the files read, so a change to any
// of them changes the digest, whichever record asked for it. The shell's own loaders read through the fetch shim of query.mjs, which notes its reads too.
const READS = new Set();
export const noteRead = p => { READS.add(rel(p)); };
export const trackedReads = () => [...READS].sort();
export const readText = p => { noteRead(p); return fs.readFileSync(p, 'utf8'); };
export const readJSON = p => JSON.parse(readText(p));
export const readJSONL = p => readText(p).split(/\r?\n/).filter(l => l.trim()).map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`${rel(p)} line ${i + 1}: ${e.message}`); } });
export const exists = p => fs.existsSync(p);
export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = p => sha256(fs.readFileSync(p));
// every file below a directory (sorted, forward slashes), optionally only those matching a pattern
export function walkFiles(dir, re = null) {
  const out = []; const go = d => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) { const p = path.join(d, e.name); if (e.isDirectory()) go(p); else if (!re || re.test(e.name)) out.push(p); } };
  if (fs.existsSync(dir)) go(dir); return out;
}

// ---- the theatre clock: minutes since 1863-06-01 00:00 local mean time (the unit of app/src/clock.mjs and of GOVERNANCE/timeline_windows.jsonl)
const MDAYS = { 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30 };
const MSTART = {}; { let d = 0; for (const m of [6, 7, 8, 9, 10, 11]) { MSTART[m] = d; d += MDAYS[m]; } }
export const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
export const minOf = (month, day, hh = 0, mm = 0) => (MSTART[month] + day - 1) * 1440 + hh * 60 + mm;
// 'YYYY-MM-DDTHH:MM' (1863, June to November) or a number of minutes -> minutes; anything else throws (a record with a bad time is invalid, never silently skipped)
export function toMin(x) {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  const r = /^1863-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?$/.exec(String(x ?? ''));
  if (!r || !(+r[1] in MSTART) || +r[2] < 1 || +r[2] > MDAYS[+r[1]] || +(r[3] || 0) > 24 || +(r[4] || 0) > 59) throw new Error(`bad time "${x}" (want 1863-MM-DDTHH:MM, June to November 1863)`);
  return minOf(+r[1], +r[2], +(r[3] || 0), +(r[4] || 0));
}
export function isoOf(min) {
  if (min == null || !Number.isFinite(min)) return null;
  const m = Math.round(min), day = Math.floor(m / 1440), mod = m - day * 1440; let mo = 11; while (MSTART[mo] > day) mo--;
  const p2 = n => String(n).padStart(2, '0');
  return `1863-${p2(mo)}-${p2(day - MSTART[mo] + 1)}T${p2(Math.floor(mod / 60))}:${p2(mod % 60)}`;
}

// ---- text: the same folding for the row text and for a quote, so that a quote is found only if its words are printed in the row.
// U+FFFD stands for a lost apostrophe or quotation mark in the PDF extraction (app/src/data.mjs tidy); every apostrophe and quote form folds to nothing.
export const fold = s => String(s ?? '').replace(/ \| /g, ' ').replace(/[’‘´`�'"“”]/g, '').replace(/[‐‑‒–—]/g, '-').replace(/-\s+(?=[a-z])/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
// true when the folded quote occurs in the folded text on word boundaries
export function hasQuote(text, quote) {
  const t = fold(text), q = fold(quote); if (q.length < 3) return false;
  let i = -1; while ((i = t.indexOf(q, i + 1)) >= 0) { const a = i === 0 || !/[a-z0-9]/.test(t[i - 1]), b = i + q.length >= t.length || !/[a-z0-9]/.test(t[i + q.length]); if (a && b) return true; }
  return false;
}
// words of a name for the unit binding: lower case, punctuation dropped, generic military words dropped
const GENERIC = new Set(['the', 'of', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'with', 'from', 'by', 'under', 'vs', 'corps', 'division', 'div', 'brigade', 'bde', 'regiment', 'regt', 'battalion', 'bn', 'battery', 'btty', 'company', 'co', 'army', 'cavalry', 'cav', 'infantry', 'inf', 'artillery', 'art', 'reserve', 'volunteers', 'vols', 'st', 'nd', 'rd', 'th',
  'col', 'lt', 'gen', 'maj', 'capt', 'brig', 'mg', 'bg', 'ltg', 'general', 'colonel', 'captain', 'major', 'lieutenant', 'men', 'troops', 'command', 'headquarters', 'hq', 'union', 'confederate', 'federal', 'line', 'column', 'main', 'body', 'rest', 'part', 'his', 'their', 'its', 'two', 'three', 'four', 'five', 'six', 'i', 'ii', 'iii', 'v', 'vi', 'xi', 'xii']);
// possessives are stripped before folding ("Early’s" -> "early", "Meredith's" -> "meredith"; U+FFFD stands for a lost apostrophe), ordinals and bare numbers are dropped
export const unpossess = s => String(s ?? '').replace(/[’'‘´`\ufffd]s\b/g, '');
export const tokens = s => fold(unpossess(s)).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !GENERIC.has(w) && !/^\d+(?:st|nd|rd|th)?$/.test(w));
// state names as the order of battle abbreviates them (history/units.json name_printed, e.g. "136th NY", "19th IN"); used only to match a printed "6th Wisconsin" with the unit "6th WI"
export const STATES = { alabama: 'al', arkansas: 'ar', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga', illinois: 'il', indiana: 'in', louisiana: 'la', maine: 'me', maryland: 'md', massachusetts: 'ma', mass: 'ma', michigan: 'mi', mich: 'mi', minnesota: 'mn', mississippi: 'ms', miss: 'ms',
  'new hampshire': 'nh', 'new jersey': 'nj', 'new york': 'ny', 'north carolina': 'nc', ohio: 'oh', pennsylvania: 'pa', penn: 'pa', pa: 'pa', 'rhode island': 'ri', 'south carolina': 'sc', tennessee: 'tn', tenn: 'tn', texas: 'tx', vermont: 'vt', virginia: 'va', va: 'va', 'west virginia': 'wv', wisconsin: 'wi', wis: 'wi' };
// regiment designators found in a text, as "<number><state>" keys (e.g. "6wi"); a designator ties a quote to a regiment far more firmly than a single word does
export function designators(s) {
  const t = fold(s).replace(/[^a-z0-9]+/g, ' '), out = new Set();
  const names = Object.keys(STATES).sort((a, b) => b.length - a.length).join('|'), abbr = [...new Set(Object.values(STATES))].join('|');
  const re = new RegExp(`\\b(\\d{1,3})(?:st|nd|rd|th)?\\s+(${names}|${abbr})\\b`, 'g'); let m;
  while ((m = re.exec(t))) out.add(m[1] + (STATES[m[2]] || m[2]));
  return out;
}
// the regiment designators of a text WITH their context: [{ key: '6wi', index, after: 'the next 40 characters, folded' }], so that "26th Pennsylvania Emergency Militia" is not taken for the 26th Pennsylvania Volunteers
export function designatorHits(s) {
  const t = fold(unpossess(s)).replace(/[^a-z0-9]+/g, ' '), out = [];
  const names = Object.keys(STATES).sort((a, b) => b.length - a.length).join('|'), abbr = [...new Set(Object.values(STATES))].join('|');
  const re = new RegExp(`\\b(\\d{1,3})(?:st|nd|rd|th)?\\s+(${names}|${abbr})\\b`, 'g'); let m;
  while ((m = re.exec(t))) out.push({ key: m[1] + (STATES[m[2]] || m[2]), index: m.index, after: t.slice(m.index + m[0].length, m.index + m[0].length + 40).trim() });
  return out;
}
export const round = (x, d = 1) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 10 ** d) / 10 ** d);

// ---- the words of a text with their case and their naming context (query.mjs unitsNamedIn). A surname names a unit only as a PROPER NOUN: capitalised in the text; and where the same word is also an
// ordinary word of the timeline (day, stone, early, hill, iron ...: lower case somewhere in the printed rows) only in a naming context: a possessive ("Day's brigade"), a unit noun after it
// ("Iron Brigade", "Stone division") or a title before it ("Gen. Early"). Otherwise "all day" would name Day's brigade and "stone wall" Stone's.
export const wordKey = w => fold(unpossess(w)).replace(/[^a-z0-9]/g, '');
export const UNIT_NOUN = new Set(['division', 'divisions', 'div', 'brigade', 'brigades', 'bde', 'bdes', 'corps', 'battalion', 'battalions', 'bn', 'battery', 'batteries', 'btty', 'btry', 'regiment', 'regiments', 'command', 'men', 'troops', 'infantry', 'cavalry', 'artillery', 'column', 'staff', 'hq', 'headquarters', 'guns', 'legion', 'rangers', 'sharpshooters', 'volunteers']);
export const TITLE = new Set(['gen', 'general', 'col', 'colonel', 'lt', 'lieutenant', 'maj', 'major', 'capt', 'captain', 'brig', 'mg', 'bg', 'ltg', 'sgt', 'cpl', 'pvt', 'dr', 'rev', 'prof', 'gov', 'surg', 'asst']);
export function wordInfo(text) {
  const t = String(text ?? '').replace(/\ufffd/g, '\u2019'), re = /[A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f\u2019']*/g, ws = []; let m;
  while ((m = re.exec(t))) {
    const raw = m[0], pm = /^(.*?)(?:[\u2019']s|[\u2019'])$/i.exec(raw), base = pm ? pm[1] : raw; if (!base) continue;
    ws.push({ key: wordKey(base), cap: /^[A-Z\u00c0-\u00de]/.test(base), poss: !!pm });
  }
  // -> Map key -> { cap: capitalised somewhere, ctx: capitalised in a naming context somewhere, prev: first letters of the words directly before its capitalised occurrences ("Fitz Lee", "F. Lee": f) }
  const out = new Map();
  ws.forEach((w, i) => {
    if (!w.key) return; const nx = ws[i + 1], pv = ws[i - 1], ctx = w.poss || (nx && UNIT_NOUN.has(nx.key)) || (pv && TITLE.has(pv.key)), cur = out.get(w.key) || { cap: false, ctx: false, prev: new Set() };
    if (w.cap) { cur.cap = true; if (ctx) cur.ctx = true; if (pv && pv.key) cur.prev.add(pv.key[0]); } out.set(w.key, cur);
  });
  return out;
}
