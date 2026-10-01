// Field extraction from the entry titles and description lines of Gettysburg_Sources_v2.docx.
// Everything here is a PARSE of what the document says. It does not say the claim is true.

export const RANKS = [
  'Lieut. Gen.', 'Maj. Gen.', 'Brig. Gen.', 'Lieut. Col.', 'Asst. Surg.', 'Medical Inspector', 'Medical Director',
  'Surg.', 'Gen.', 'Col.', 'Maj.', 'Capt.', 'Lieut.', 'Chaplain', 'Rev.', 'Hon.', 'Governor', 'Gov.',
  'Pvt.', 'Sgt.', 'Corp.', 'Prof.', 'Dr.', 'Commodore', 'Adjt.', 'Quartermaster',
];

const DOC_PREFIXES = [
  [/^Return of\b/i, 'return'],
  [/^General Return\b/i, 'return'],
  [/^Abstract from\b/i, 'return'],
  [/^Organization of\b/i, 'order_of_battle'],
  [/^Itinerary of\b/i, 'itinerary'],
  [/^Congratulatory\b/i, 'order'],
  [/^Roll of\b/i, 'roster'],
  [/^Roster\b/i, 'roster'],
  [/^Testimony\b/i, 'testimony'],
];

/** "pp. 14-21." -> {start:14,end:21}; "p. 24." -> {start:24,end:24}; also tolerates en dash and "pp. 1,020-1,030". */
export function parsePageRange(text) {
  const t = String(text ?? '');
  let m = /\bVol\.\s*(\d+),\s*Pt\.\s*(\d+),\s*pp\.\s*([\d,]+)\s*[-\u2013\u2014]\s*([\d,]+)/.exec(t);
  if (m) return { vol: +m[1], part: +m[2], start: num(m[3]), end: num(m[4]) };
  m = /\bVol\.\s*(\d+),\s*Pt\.\s*(\d+),\s*p\.\s*([\d,]+)/.exec(t);
  if (m) return { vol: +m[1], part: +m[2], start: num(m[3]), end: num(m[3]) };
  return null;
}
const num = (s) => Number(String(s).replace(/,/g, ''));

export function splitRank(s) {
  const t = s.trim();
  for (const r of RANKS) {
    if (t.startsWith(r + ' ')) return { rank: r, rest: t.slice(r.length + 1).trim() };
  }
  return { rank: null, rest: t };
}

/** Parse "Report No. 196: Col. Joshua L. Chamberlain, Twentieth Maine Infantry, of the battle ..." */
export function parseOrTitle(titleNoNumber) {
  const m = /^Report No\.\s*(\d+):\s*(.*)$/.exec(titleNoNumber.trim());
  if (!m) return null;
  const report_no = Number(m[1]);
  const body = m[2].trim();
  for (const [re, kind] of DOC_PREFIXES) {
    if (re.test(body)) return { report_no, doc_kind: kind, rank: null, author: null, unit_text: body, raw: body };
  }
  const { rank, rest } = splitRank(body);
  const c = rest.indexOf(',');
  const author = (c < 0 ? rest : rest.slice(0, c)).trim();
  const unit_text = c < 0 ? '' : rest.slice(c + 1).trim();
  return { report_no, doc_kind: 'report', rank, author, unit_text, raw: body };
}

const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
export function ordinalWordToNumber(w) { return ORDINALS[String(w).toLowerCase()] ?? null; }

export function surnameOf(author) {
  if (!author) return null;
  const t = author.replace(/\b(Jr|Sr)\.?$/i, '').trim().split(/\s+/);
  return t[t.length - 1] ?? null;
}

/** description lines (those that are not Link / Transcribed lines) -> classification of the document type + notes */
export function parseOrDescription(descLines) {
  const text = descLines.join(' ');
  let doc_kind_desc = null;
  if (/^Official after-action report/.test(text)) doc_kind_desc = 'report';
  else if (/^Official tabulated casualty return/.test(text)) doc_kind_desc = 'return';
  else if (/^Official strength returns/.test(text)) doc_kind_desc = 'return';
  else if (/^Official order of battle/.test(text)) doc_kind_desc = 'order_of_battle';
  else if (/^Verbatim testimony/.test(text)) doc_kind_desc = 'testimony';
  else if (/^Official roster/.test(text)) doc_kind_desc = 'roster';
  const range = parsePageRange(text);
  const reportNoInDesc = /\(Report No\.\s*(\d+)\)/.exec(text)?.[1];
  const dixon = /Flagged by B\. Y\. Dixon's guide to the OR as (.*?)\.(?:\s|$)/.exec(text)?.[1] ?? null;
  return {
    doc_kind_desc,
    range,
    report_no_in_desc: reportNoInDesc ? Number(reportNoInDesc) : null,
    dixon_flag: dixon,
    template: text.replace(/\d[\d,]*/g, '#').replace(/\s+/g, ' ').slice(0, 160),
  };
}

/** Part XIII title: "OR Vol. 27, Part 3, p. 3 — Union correspondence" */
export function parsePageEntryTitle(titleNoNumber) {
  const m = /^OR Vol\.\s*(\d+),\s*Part\s*(\d+),\s*p\.\s*(\d+)\s*[\u2014\u2013-]\s*(.+)$/.exec(titleNoNumber.trim());
  if (!m) return null;
  return { vol: +m[1], part: +m[2], page: +m[3], label: m[4].trim(), side: /^Union/i.test(m[4]) ? 'union' : /^Confederate/i.test(m[4]) ? 'confederate' : 'unknown' };
}

const NAME_TOKEN = String.raw`(?:[A-Z][A-Za-z'\u2019.-]*|[A-Z]\.)`;
const PERSON_RE = new RegExp(String.raw`^((?:${RANKS.map((r) => r.replace('.', '\\.')).join('|')})\s+)?(${NAME_TOKEN}(?:\s+(?:[a-z]{2,3}\s+)?${NAME_TOKEN}){1,4})\s*(?:,|\s+(?:account|letter|diary|recollection|memoir|recollections|journal|narrative)\b)`);

/** Best-effort fields from a non-OR (Parts IV-XII) title. Everything may be null; none of it is verified. */
export function parseNonOrTitle(title) {
  const t = title.trim();
  const out = { author: null, rank: null, work_title: null, venue: null, year: null, years_in_title: [], date_text: null, parse_rule: 'none' };
  // quoted title: straight or curly double quotes
  const q = /(?:"|\u201c)(.+?)(?:"|\u201d)(?=[\s,.)(]|$)/.exec(t);
  if (q) out.work_title = q[1].replace(/[,.]$/, '').trim();
  // years
  const years = [...t.matchAll(/\b(1[6-9]\d\d|20[0-2]\d)\b/g)].map((m) => Number(m[1]));
  out.years_in_title = years;
  const paren = /\((?:[A-Za-z.]+\s+)?(?:\d{1,2},\s*)?(1[6-9]\d\d|20[0-2]\d)\)/.exec(t);
  if (paren) out.year = Number(paren[1]);
  const dated = /\b((?:Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:-\d{1,2})?,\s*(?:1[6-9]\d\d))/.exec(t);
  if (dated) out.date_text = dated[1];
  const vol = /\b((?:SHSP|Pennsylvania History|Gettysburg College Journal of the Civil War Era|Pennsylvania Magazine of History and Biography|Gettysburg Magazine|Rebellion Record)[^,(]*)/.exec(t);
  if (vol) out.venue = vol[1].trim();
  // author
  let m = /^(?:"|\u201c)[^"\u201d]+(?:"|\u201d)[^,]*?,?\s*by\s+(.+?),\s*(?:SHSP|[A-Z][A-Za-z ]*Vol)/.exec(t);
  if (m) {
    const { rank, rest } = splitRank(m[1]);
    out.author = rest; out.rank = rank; out.parse_rule = 'quoted_by';
  } else if ((m = PERSON_RE.exec(t))) {
    const rank = m[1]?.trim() ?? null;
    const name = m[2].trim();
    // reject if the "name" is really an institution / generic phrase
    if (!/^(The|A|An|Official|National|Civil|Valley|Franklin|Southern|Gettysburg|Broadside|Report|Diary|Letter)\b/.test(name)) {
      out.author = name; out.rank = rank; out.parse_rule = 'leading_person';
    }
  }
  return out;
}

/** Link kind: scan (page images), transcription (typed text of the same pages), primary (the item itself, text), other (index/finding aid/collection) */
export function classifyLink({ label, host, url, entryKind, title, description }) {
  if (label && /^Transcribed/i.test(label)) return 'transcription';
  if (host === 'ehistory.osu.edu') return /\/\d{3}\/\d{4}\/?$/.test(url) ? 'transcription' : 'other';
  if (host === 'babel.hathitrust.org' || host === 'hdl.handle.net') return 'scan';
  const d = `${title} ${description}`.toLowerCase();
  if (/(link is to the issue page|index to|finding aid|collection page|\(all volumes\)|browsable|index used to build|linked index|companion index|overview)/.test(d)) return 'other';
  if (host === 'archive.org' || host === 'web.archive.org') return /\/details\/|\/stream\//.test(url) ? 'scan' : 'primary';
  if (host === 'ebooks.library.cornell.edu' || host === 'texashistory.unt.edu') return 'scan';
  if (host === 'books.google.com') return 'scan';
  if (host === 'chroniclingamerica.loc.gov') return 'scan';
  return 'primary';
}
