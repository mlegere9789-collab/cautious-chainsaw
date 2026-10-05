// Machine derivation of the agreement fields from a reviewer's own words. Pure functions: no I/O, no clock, no network.
//
// The first partial run hand-wrote qc/review-norm.json (source_key, adapters_read, text_state per reviewer). That does not
// scale to 110 entries with two to four reviewers each, and a hand-typed table is exactly what a test cannot trust. So the
// fields the merge rules need are DERIVED here, by rule, from the text each reviewer wrote, and every derived value carries
// the verbatim token it was read from (`token`, `phrase`) so tests/sources-qc can check that the token really occurs in the
// reviewer's output. Nothing derived here is a new finding: it is the reviewer's statement, parsed.
//
//   source ids   which text source / edition the reviewer read (an Internet Archive item, a Gutenberg number, a Google Books
//                id, a page URL). Taken from the reviewer's replacement_url and extraction_notes: the source the reviewer
//                recommends extracting from. If the reviewer names none, the listed URL stands for itself when the reviewer
//                says it read it live.
//   adapters     the extraction path the reviewer names (archive-fulltext, gutenberg, pdf-text, html, loc-ocr,
//                manual-transcription). When the notes name none, the host of the named source says (marked adapters_from).
//   text state   machine-text, ocr-text, image-only.
//   years        the imprint years the reviewer states in rights_basis (used only to tell that two different scans of one
//                work are the same edition).
//
// The derivation is deliberately conservative: when it cannot see a source or a path it returns nothing, and an entry with
// nothing to compare is never agreed on. The calibration against the 12 hand-normalised reviews of the first run (entries
// 586-597) is a test.

import { canonicalKey, hostOf, normalizeUrl } from './urlnorm.mjs';

export const ADAPTERS = ['archive-fulltext', 'gutenberg', 'pdf-text', 'html', 'loc-ocr', 'manual-transcription'];
/** the order in which the queue prefers an agreed adapter: the Internet Archive scans first, hand transcription last */
export const ADAPTER_PREFERENCE = ['archive-fulltext', 'gutenberg', 'pdf-text', 'html', 'loc-ocr', 'manual-transcription'];
/** hosts a program must never extract from (robots.txt or bot blocks); no adapter is ever derived for them */
export const FORBIDDEN_TEXT_HOSTS = ['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net', 'perseus.tufts.edu'];
export const RELATIVE_TO_BATTLE = ['before', 'during', 'after', 'composed-years-after', 'composed-decades-after', 'undated'];
export const BATTLE_FIRST_DAY = '1863-07-01';
export const BATTLE_LAST_DAY = '1863-07-03';

const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:org|edu|com|gov|net|io|us|uk)(?:\/[^\s"'<>()[\]{}|]*)?/gi;
const IA_SUFFIX = /_(?:djvu|page_numbers|hocr|hocr_pageindex|hocr_searchtext|meta|files|jp2|chocr|scandata|marc|archive|abbyy|text|raw_jp2|dc)[a-z0-9._]*$/i;

const trimUrl = (s) => s.replace(/[.,;:'"”’>)\]]+$/, '');

/** canonical key of one URL-ish token (scheme optional); null when it is not a document address */
export function keyOfToken(token) {
  let t = trimUrl(String(token ?? '').trim());
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  // a Wayback capture stands for the page it captured (the capture flags id_, if_, im_ do not change the page)
  const wb = /^https?:\/\/web\.archive\.org\/web\/(?:\d+[a-z_]*\/)(.+)$/i.exec(t);
  if (wb) { const inner = wb[1]; return keyOfToken(/^https?:\/\//i.test(inner) ? inner : `https://${inner}`); }
  const host = hostOf(t);
  if (!host) return null;
  let u;
  try { u = new URL(normalizeUrl(t) ?? t); } catch { return null; }
  if (/\/robots\.txt$/i.test(u.pathname)) return null; // a robots.txt is evidence of politeness, not a text source
  let m;
  // a Chronicling America / Library of Congress newspaper page: the LCCN and the issue date identify it, whatever the viewer URL
  if ((host === 'loc.gov' || host === 'chroniclingamerica.loc.gov' || host === 'tile.loc.gov') && (m = /(sn\d{8})\/(\d{4}-\d{2}-\d{2})/.exec(u.pathname))) return `lccn:${m[1]}/${m[2]}`;
  if (host === 'archive.org' && (m = /^\/(?:details|stream|download|embed)\/([^/?#]+)/.exec(u.pathname))) return `ia:${m[1].replace(IA_SUFFIX, '').replace(/[._-]+$/, '').toLowerCase()}`;
  if (host === 'archive.org') return null;
  if (host === 'gutenberg.org' && (m = /^\/(?:ebooks|files|cache\/epub)\/(\d+)/.exec(u.pathname))) return `pg:${m[1]}`;
  if (host === 'books.google.com' && u.searchParams.get('id')) return `gb:${u.searchParams.get('id')}`;
  const ck = canonicalKey(t);
  if (ck && /^(?:hathi|ehistory|perseus):/.test(ck)) return ck.split('#')[0];
  const path = u.pathname.replace(/\/+$/, '');
  if (!path) return null; // a bare host names no document
  return `url:${host}${path}`.toLowerCase();
}

/** every URL-like token in a text, with its canonical key */
export function urlTokens(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(URL_RE)) {
    const token = trimUrl(m[0]);
    const key = keyOfToken(token);
    if (key) out.push({ token, key });
  }
  return out;
}

/** the Internet Archive item ids any reviewer named by URL anywhere: lets a bare mention ("southernhistoric7187sout") count */
export function buildVocab(texts) {
  const ids = new Set();
  for (const t of texts) for (const x of urlTokens(t)) if (x.key.startsWith('ia:')) ids.add(x.key.slice(3));
  return ids;
}

function bareIaIds(text, vocab) {
  const out = [];
  for (const m of String(text ?? '').matchAll(/[a-z0-9][a-z0-9._-]{6,}/gi)) {
    const raw = m[0];
    const id = raw.replace(IA_SUFFIX, '').replace(/[._-]+$/, '').toLowerCase();
    if (vocab.has(id)) out.push({ token: raw, key: `ia:${id}` });
  }
  return out;
}

/**
 * An Internet Archive identifier written bare, with no URL anywhere ("ourcampaignaroun00lock_djvu.txt"). The shape of a scan
 * identifier is letters, two to five digits, letters; it counts only when the words around it say it is an archive item.
 */
function bareIaIdsByShape(text) {
  const out = [];
  const t = String(text ?? '');
  for (const m of t.matchAll(/\b([a-z]{5,}\d{2,5}[a-z]{2,10})(?:_djvu[a-z.]*)?\b/g)) {
    const ctx = t.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
    if (/archive|\bIA\b|djvu|\bscan\b|\bitem\b/i.test(ctx)) out.push({ token: m[1], key: `ia:${m[1].toLowerCase()}` });
  }
  return out;
}

/** a Project Gutenberg e-text named by number ("Gutenberg #31258", "Gutenberg eBook #31258") */
function barePg(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(/\bGutenberg\s+(?:e-?book\s+|text\s+)?#\s?(\d{3,6})\b/gi)) out.push({ token: m[0], key: `pg:${m[1]}` });
  return out;
}

/** an LCCN with an issue date written without a host ("/lccn/sn84024735/1863-07-17/ed-1/seq-1") */
function bareLccn(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(/(sn\d{8})\/(\d{4}-\d{2}-\d{2})/g)) out.push({ token: m[0], key: `lccn:${m[1]}/${m[2]}` });
  return out;
}

const FIELDS_FOR_SOURCE = ['replacement_url', 'extraction_notes', 'extraction_notes_extra', 'extraction_notes_note'];

/**
 * The text sources a reviewer names. `listed` is the entry's own URL key when the reviewer says it read the listed page.
 * @returns {{text_ids: {id:string, token:string, field:string}[], listed_id: string|null, listed_read: boolean}}
 */
export function sourceIdsOf(item, entry, vocab = new Set()) {
  const seen = new Set();
  const text_ids = [];
  for (const field of FIELDS_FOR_SOURCE) {
    const text = item[field];
    if (!text) continue;
    for (const x of [...urlTokens(text), ...bareIaIds(text, vocab), ...bareIaIdsByShape(text), ...barePg(text), ...bareLccn(text)]) {
      if (seen.has(x.key)) continue;
      seen.add(x.key);
      text_ids.push({ id: x.key, token: x.token, field });
    }
  }
  const listedKey = entry?.links?.[0]?.url ? keyOfToken(entry.links[0].url) : null;
  const listed_read = ['live', 'redirected'].includes(item.link_status) && !!listedKey;
  return { text_ids, listed_id: listed_read ? listedKey : null, listed_read, listed_key: listedKey };
}

const NEG = /\b(?:not|never|no|without|instead of|rather than|don't|do not|nor)\s+(?:\S+\s+){0,2}$/i;
const negated = (text, idx) => NEG.test(text.slice(Math.max(0, idx - 30), idx));

const ADAPTER_RULES = [
  ['archive-fulltext', /archive-fulltext|_djvu\.txt|djvu(?:\.txt)?|abbyy|\bhocr\b|internet archive (?:scan|text|full ?text|ocr|copy)|\bIA (?:scan|text|djvu|ocr|item|copy)/i],
  ['gutenberg', /\bgutenberg\b/i],
  ['pdf-text', /pdf-text|pdf text layer|text layer|text-layer|born-digital|text pdf|clean (?:text )?pdf|pypdf|content stream/i],
  ['html', /\bhtml\b|\bTEI\b|\bxml\b|wordpress|blog post|web ?page|page text|full text of article/i],
  ['loc-ocr', /\bALTO\b|text-services|chronicling america ocr|loc\.gov[^.]{0,40}\bocr\b/i],
  ['manual-transcription', /manual[- ]transcription|human transcription|(?:a )?(?:person|human) (?:must |has to |needs to )?transcribe|transcribe (?:it |them |the \w+ )?(?:by hand|from the)|needs? a human|image[- ]only|handwriting|handwritten/i],
];

/**
 * The extraction paths a reviewer names in extraction_notes. Phrases are the verbatim matches (the test finds them again).
 * A path mentioned only to be refused ("not Perseus", "never Gutenberg") is skipped.
 */
export function adaptersOf(item) {
  const text = [item.extraction_notes, item.extraction_notes_extra, item.extraction_notes_note].filter(Boolean).join(' ');
  const found = new Map();
  for (const [adapter, re] of ADAPTER_RULES) {
    const m = re.exec(text);
    if (m && !negated(text, m.index)) found.set(adapter, { adapter, phrase: m[0], field: 'extraction_notes' });
  }
  return [...found.values()];
}

/** fall back to the kind of the named source when the notes say nothing about a path */
export function adaptersFromSources(src, item) {
  const out = [];
  const pdf = (s) => /\.pdf(?:$|[?#])/i.test(s.token);
  for (const s of src.text_ids) {
    if (s.id.startsWith('ia:')) out.push({ adapter: 'archive-fulltext', phrase: s.token, field: s.field });
    else if (s.id.startsWith('pg:')) out.push({ adapter: 'gutenberg', phrase: s.token, field: s.field });
    else if (s.id.startsWith('lccn:')) out.push({ adapter: 'loc-ocr', phrase: s.token, field: s.field });
    else if (pdf(s)) out.push({ adapter: 'pdf-text', phrase: s.token, field: s.field });
  }
  if (!out.length && src.listed_read && src.listed_key && item.verdict === 'APPROVE') {
    // the reviewer read the listed page itself and approved quoting from it
    const key = src.listed_key;
    if (key.startsWith('ia:')) out.push({ adapter: 'archive-fulltext', phrase: key, field: 'link_status' });
    else if (key.startsWith('pg:')) out.push({ adapter: 'gutenberg', phrase: key, field: 'link_status' });
    else if (key.startsWith('url:') && /\.pdf$/i.test(key)) out.push({ adapter: 'pdf-text', phrase: key, field: 'link_status' });
    else if (key.startsWith('url:')) out.push({ adapter: 'html', phrase: key, field: 'link_status' });
  }
  return out;
}

export function textStateOf(adapters) {
  const a = adapters.map((x) => x.adapter);
  if (!a.length) return 'none';
  if (a.every((x) => x === 'manual-transcription')) return 'image-only';
  if (a.includes('archive-fulltext') && !a.some((x) => ['gutenberg', 'html', 'pdf-text'].includes(x))) return 'ocr-text';
  if (a.includes('loc-ocr') && a.length === 1) return 'ocr-text';
  return 'machine-text';
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const monthNo = (w) => MONTHS[String(w).slice(0, 4).toLowerCase().replace(/\.$/, '')] ?? MONTHS[String(w).slice(0, 3).toLowerCase()] ?? null;

/** first date the reviewer's `written` text states: {iso, precision} or null */
export function firstDate(text) {
  const s = String(text ?? '');
  let m = /\b(1[5-9]\d\d|20[0-2]\d)-(\d\d)-(\d\d)\b/.exec(s);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}`, precision: 'day', token: m[0] };
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Z][a-z]{2,8})\.?,?\s+(1[5-9]\d\d)\b/.exec(s);
  if (m && monthNo(m[2])) return { iso: `${m[3]}-${pad(monthNo(m[2]))}-${pad(m[1])}`, precision: 'day', token: m[0] };
  m = /\b([A-Z][a-z]{2,8})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(1[5-9]\d\d)\b/.exec(s);
  if (m && monthNo(m[1])) return { iso: `${m[3]}-${pad(monthNo(m[1]))}-${pad(m[2])}`, precision: 'day', token: m[0] };
  m = /\b([A-Z][a-z]{2,8})\.?,?\s+(1[5-9]\d\d)\b/.exec(s);
  if (m && monthNo(m[1])) return { iso: `${m[2]}-${pad(monthNo(m[1]))}`, precision: 'month', token: m[0] };
  m = /\b(1[5-9]\d\d)\b/.exec(s);
  if (m) return { iso: m[1], precision: 'year', token: m[0] };
  return null;
}

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** every date a text states, at any precision (used to find the composition date of a retrospective work) */
export function datesIn(text) {
  const s = String(text ?? '');
  const out = [];
  const add = (iso, precision, token) => out.push({ iso, precision, token });
  for (const m of s.matchAll(/\b(1[5-9]\d\d|20[0-2]\d)-(\d\d)-(\d\d)\b/g)) add(`${m[1]}-${m[2]}-${m[3]}`, 'day', m[0]);
  for (const m of s.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Z][a-z]{2,8})\.?,?\s+(1[5-9]\d\d)\b/g)) if (monthNo(m[2])) add(`${m[3]}-${pad(monthNo(m[2]))}-${pad(m[1])}`, 'day', m[0]);
  for (const m of s.matchAll(/\b([A-Z][a-z]{2,8})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(1[5-9]\d\d)\b/g)) if (monthNo(m[1])) add(`${m[3]}-${pad(monthNo(m[1]))}-${pad(m[2])}`, 'day', m[0]);
  for (const m of s.matchAll(/\b([A-Z][a-z]{2,8})\.?,?\s+(1[5-9]\d\d)\b/g)) if (monthNo(m[1])) add(`${m[2]}-${pad(monthNo(m[1]))}`, 'month', m[0]);
  for (const m of s.matchAll(/\b(1[5-9]\d\d)\b/g)) add(m[1], 'year', m[0]);
  return out;
}

/**
 * When the work was written, as far as the reviewer's text says. For an ordinary (contemporaneous) letter, diary or report
 * the first date stated is the date of writing. For a RETROSPECTIVE work (the reviewer's kind says memoir or recollection)
 * the text also names the events it describes, so the date taken is the earliest one after 1865: the composition or
 * publication date, not the date of the battle.
 */
export function writtenOf(item) {
  const text = String(item.written ?? '');
  const retro = isRetrospectiveKind(item.kind);
  let d = null;
  let basis = "first date in the reviewer's text";
  if (retro) {
    const later = datesIn(text).filter((x) => Number(x.iso.slice(0, 4)) >= 1866).sort((a, b) => a.iso.localeCompare(b.iso));
    if (later.length) { d = later[0]; basis = "earliest date after 1865 in the reviewer's text (the work is retrospective: the dates before it are the events it describes)"; }
  }
  if (!d) d = firstDate(item.written);
  if (!d) return { text, from: null, to: null, precision: null, relative_to_battle: 'undated', lag_days: null, basis: 'reviewer text; no date could be read' };
  const year = Number(d.iso.slice(0, 4));
  let rel;
  if (d.precision === 'day') rel = d.iso < BATTLE_FIRST_DAY ? 'before' : d.iso <= BATTLE_LAST_DAY ? 'during' : year <= 1865 ? 'after' : year < 1880 ? 'composed-years-after' : 'composed-decades-after';
  else if (year < 1863) rel = 'before';
  else if (year === 1863) rel = d.precision === 'month' && d.iso < '1863-07' ? 'before' : 'after';
  else rel = year <= 1865 ? 'after' : year < 1880 ? 'composed-years-after' : 'composed-decades-after';
  return { text, from: d.iso, to: d.iso, precision: d.precision, relative_to_battle: rel, lag_days: d.precision === 'day' ? daysBetween(BATTLE_LAST_DAY, d.iso) : null, basis: `${basis}: ${d.token}` };
}

const GENRE_BY_KIND = {
  'official-report': 'official-report',
  'dispatch-or-order': 'order',
  newspaper: 'newspaper',
  'eyewitness-retrospective-memoir': 'memoir',
  'secondary-scholarship-peer-reviewed': 'scholarship',
  'secondary-other': 'secondary',
  'edited-collection': 'collection',
  'compiled-volume-or-finding-aid': 'volume-or-finding-aid',
  'civilian-account': 'civilian-account',
  'eyewitness-contemporary': 'eyewitness-account',
};

/** a short genre in a closed vocabulary, from the reviewer's kind refined by the words in their `written` text */
export function genreOf(item) {
  const w = String(item.written ?? '').toLowerCase();
  if (/\bletter\b/.test(w)) return 'letter';
  if (/\b(diary|journal)\b/.test(w)) return 'diary';
  if (/\bbroadside\b/.test(w)) return 'broadside';
  if (/\b(requisition|demand for)\b/.test(w)) return 'requisition';
  return GENRE_BY_KIND[item.kind] ?? 'other';
}

export function isRetrospectiveKind(kind) { return /retrospective/.test(String(kind ?? '')); }

/**
 * The imprint or publication years a reviewer states in rights_basis. Death years ("d. 1897", "died 1892") and life spans
 * ("1837-1892") are not imprints and are dropped. Used only to tell that two different scans are the same edition.
 */
export function imprintYears(text) {
  const t = String(text ?? '')
    .replace(/\(\s*1[5-9]\d\d\s*[-–]\s*1[5-9]\d\d\s*\)/g, ' ')
    .replace(/\b(?:d\.|died|death|b\.|born)\s*(?:in\s*)?(?:c\.\s*)?1[5-9]\d\d/gi, ' ');
  return [...new Set([...t.matchAll(/\b(1[7-9]\d\d)\b/g)].map((m) => Number(m[1])).filter((y) => y <= 1930))].sort();
}

/** the capture-independent form of a replacement URL (a Wayback capture's id_ / if_ flag does not change the page) */
export function canonReplacement(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  return s.replace(/^http:/i, 'https:').replace(/\/web\/(\d+)[a-z]{1,3}_\//i, '/web/$1/').replace(/\/+$/, '');
}

/** everything the merge rules and the registry need from one review, in one object */
export function deriveReview(review, entry, vocab) {
  const it = review.item;
  const src = sourceIdsOf(it, entry, vocab);
  let adapters = adaptersOf(it);
  let adapters_from = adapters.length ? 'extraction_notes' : null;
  if (!adapters.length) { adapters = adaptersFromSources(src, it); adapters_from = adapters.length ? 'kind-of-named-source' : null; }
  adapters = adapters.filter((a) => !FORBIDDEN_TEXT_HOSTS.some((h) => String(a.phrase).includes(h)));
  const state = textStateOf(adapters);
  const w = writtenOf(it);
  return {
    source: src,
    adapters,
    adapters_from,
    text_state: state,
    written: w,
    genre: genreOf(it),
    retrospective: isRetrospectiveKind(it.kind) || ['composed-years-after', 'composed-decades-after'].includes(w.relative_to_battle),
    years: imprintYears(it.rights_basis),
  };
}

const hostPart = (key) => (key.startsWith('url:') ? key.slice(4).split('/')[0] : null);
const slugOf = (key) => (key.startsWith('url:') ? key.slice(4).split('/').slice(1).at(-1) : null);
export const registrableDomain = (host) => String(host ?? '').split('.').slice(-2).join('.');

/** two keys name the same item: identical, or the same long slug on the same host (a site that moved the page) */
export function sameItem(a, b) {
  if (a === b) return true;
  const ha = hostPart(a), hb = hostPart(b);
  if (!ha || ha !== hb) return false;
  const sa = slugOf(a), sb = slugOf(b);
  return !!sa && sa === sb && sa.length >= 15;
}

/** the URL to put in the ingest queue for a source key, from the tokens the reviewers wrote */
export function urlForKey(key, tokens = []) {
  if (key.startsWith('ia:')) return `https://archive.org/details/${key.slice(3)}`;
  if (key.startsWith('pg:')) return `https://www.gutenberg.org/ebooks/${key.slice(3)}`;
  const t = tokens.find((x) => x.id === key)?.token;
  if (t) return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return null;
}
