// text.js - normalisation, tokenisation, stemming, sentence splitting.
// One implementation shared by the build (tools/historian) and the runtime (browser + node). Dependency free, ES module.
//
// Rules (docs/plan/FINAL/14-ask-the-historian-expansion.md D.6, hist-current QW-1):
//   NFKD -> strip accents -> lowercase -> curly quotes -> drop possessive 's / s' and stray ' -> "&" -> "and" -> non-alphanumerics to space
//   -> corps rewrite ("first|1st|i corps" -> corpsi) -> ordinal words and numbers to "#n".
//   State abbreviations expand ONLY when preceded by a number ("20 ME", "84th NY") so me/in/us/la/al stay ordinary words.

export const nfc = (s) => String(s == null ? '' : s).normalize('NFC');

// ---- ordinals ------------------------------------------------------------------------------------------------------
const UNITS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
  tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19 };
const CARD_UNITS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS_ORD = { twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100 };
const TENS_CARD = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
// Words that are unambiguous ordinals or tens (safe to convert anywhere). Bare cardinals below 20 are NOT converted
// ("one", "two" ... are ordinary words) unless they follow a tens word ("twenty one" -> 21).
export const ORD_WORDS = { ...UNITS, ...TENS_ORD };

/** Parse a spoken ordinal starting at raw[i]: "twenty first", "one hundred and fortieth", "fifty seventh". Returns {n, len} or null. */
export function parseOrdinalWords(raw, i) {
  let j = i, n = 0, any = false;
  // "one hundred [and]" / "two hundred [and]"
  if ((raw[j] === 'one' || raw[j] === 'two') && raw[j + 1] === 'hundred') {
    n = (raw[j] === 'one' ? 100 : 200); j += 2; any = true;
    if (raw[j] === 'and') j++;
  }
  const w = raw[j];
  if (w === undefined) return any ? { n, len: j - i } : null;
  if (TENS_ORD[w] !== undefined) return { n: n + TENS_ORD[w], len: j - i + 1 };
  if (TENS_CARD[w] !== undefined) {
    const nxt = raw[j + 1];
    if (nxt !== undefined && UNITS[nxt] !== undefined && UNITS[nxt] < 10) return { n: n + TENS_CARD[w] + UNITS[nxt], len: j - i + 2 };
    if (nxt !== undefined && CARD_UNITS[nxt] !== undefined && CARD_UNITS[nxt] < 10 && raw[j - 1] !== 'and') return { n: n + TENS_CARD[w] + CARD_UNITS[nxt], len: j - i + 2 };
    return any ? { n: n + TENS_CARD[w], len: j - i + 1 } : null; // bare "twenty" stays a word unless part of "one hundred twenty"
  }
  if (UNITS[w] !== undefined) return { n: n + UNITS[w], len: j - i + 1 };
  if (any && CARD_UNITS[w] !== undefined && CARD_UNITS[w] < 20) return { n: n + CARD_UNITS[w], len: j - i + 1 };
  return any ? { n, len: j - i } : null;
}

// ---- stop words -----------------------------------------------------------------------------------------------------
export const STOP = new Set(('a an the of in on at to was were is are am be been being do does did done has have had it its this that these those there their ' +
  'they them he she his her him i my me we our you your and or but if then than so as by for with from into over under about after before between during ' +
  'also not no yes any all some more most much many very just can could would should will shall may might what who whom whose which when where why how ' +
  'tell show give find please regarding know want').split(' '));

// ---- corps rewrite --------------------------------------------------------------------------------------------------
const CORPS_MAP = { '1st': 'i', first: 'i', i: 'i', '2nd': 'ii', second: 'ii', ii: 'ii', '3rd': 'iii', third: 'iii', iii: 'iii', '5th': 'v', fifth: 'v', v: 'v',
  '6th': 'vi', sixth: 'vi', vi: 'vi', '11th': 'xi', eleventh: 'xi', xi: 'xi', '12th': 'xii', twelfth: 'xii', xii: 'xii', cavalry: 'cav' };
const CORPS_RE = /\b(1st|first|i|2nd|second|ii|3rd|third|iii|5th|fifth|v|6th|sixth|vi|11th|eleventh|xi|12th|twelfth|xii|cavalry) corps\b/g;
export const corpsNorm = (s) => s.replace(CORPS_RE, (m, a) => 'corps' + CORPS_MAP[a]);

// "84th N.Y." / "1 M.N." / "20 Me." -> letters only, but only when a number precedes (initials elsewhere are left alone).
const PERIOD_ABBR = /(\d+\s*(?:st|nd|rd|th|d)?)\s+((?:[A-Za-z]\.\s?){2,3}|[A-Z][a-z]{1,4}\.)(?=\s|$)/g;
function collapseStateAbbr(s) {
  return s.replace(PERIOD_ABBR, (m, num, ab) => `${num} ${ab.replace(/[.\s]/g, '')}`);
}

/** Normalise free text to lowercase space-separated alphanumerics. Idempotent. */
export function baseNorm(s) {
  let t = String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '');
  t = collapseStateAbbr(t).toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/'s\b/g, '')
    .replace(/s'(?=\s|$)/g, 's')
    .replace(/'/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return corpsNorm(t);
}

// ---- stemming -------------------------------------------------------------------------------------------------------
/** Light stemmer (plural, -ed, -ing, trailing e), applied identically at index and query time. Never touches "#n" or digits. */
export function stem(w) {
  if (w.length <= 3 || w.charCodeAt(0) === 35 /* # */ || /\d/.test(w)) return w;
  let x = w;
  if (/ies$/.test(x) && x.length > 4) x = x.slice(0, -3) + 'y';
  else if (/ing$/.test(x) && x.length > 5) x = x.slice(0, -3);
  else if (/ed$/.test(x) && x.length > 4) x = x.slice(0, -2);
  else if (/es$/.test(x) && x.length > 4 && !/(ses|xes|zes|ches|shes)$/.test(x)) x = x.slice(0, -1);
  else if (/s$/.test(x) && !/ss$/.test(x) && x.length > 3) x = x.slice(0, -1);
  if (/e$/.test(x) && x.length > 4) x = x.slice(0, -1);
  return x;
}

/** Tokenise: returns lowercase tokens; ordinals/numbers become "#n"; stop words kept unless keepStop === false. */
export function tokenize(s, { keepStop = true } = {}) {
  const raw = baseNorm(s).split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    let m;
    if ((m = w.match(/^(\d+)(?:st|nd|rd|th|d)?$/))) { out.push('#' + parseInt(m[1], 10)); continue; }
    const ord = parseOrdinalWords(raw, i);
    if (ord) { out.push('#' + ord.n); i += ord.len - 1; continue; }
    if (!keepStop && STOP.has(w)) continue;
    out.push(w);
  }
  return out;
}
export const stemAll = (a) => a.map(stem);
/** Tokenise + stem, dropping stop words: the form used for BM25 fields and alias phrases. */
export const contentStems = (s) => stemAll(tokenize(s, { keepStop: false }));

// ---- display cleanup ------------------------------------------------------------------------------------------------
/** Site strings use " -- " as a dash; typographic dash for display. Also collapses whitespace. Never lower-cases anything. */
export function cleanSite(s) {
  return String(s == null ? '' : s)
    .replace(/ /g, ' ')
    .replace(/\s--\s/g, ' — ')
    .replace(/--/g, '—')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .trim();
}
export const normalizeWs = (s) => String(s).replace(/\s+/g, ' ').trim();

// ---- sentence splitter ------------------------------------------------------------------------------------------------
const ABBREV = /(?:\b(?:Col|Lt|Lieut|Gen|Maj|Capt|Brig|Sgt|Cpl|Pvt|Dr|Mr|Mrs|Ms|St|Ft|Mt|No|Nos|vs|Jr|Sr|Co|Cos|Vol|Vols|Inf|Cav|Art|Reg|Regt|Bvt|Hon|Rev|Cmdr|Adj|Corp|Gov|Pres|Sen|Rep|Messrs|etc|approx|ca|Gettysburg Pa)\.|\b(?:[ap]\.m|U\.S|C\.S|U\.S\.A|N\.Y|N\.J|N\.C|S\.C|W\.Va|D\.C)\.|\b[A-Z]\.)$/;

/** Split into sentences; returns [{s, e}] UTF-16 offsets into `text` (e exclusive). Abbreviations (Col., Lt., a.m., No., single initials) are protected. */
export function splitSentences(text) {
  const out = [];
  const t = String(text);
  let start = 0;
  const re = /[.!?]+["'”’)\]]*(?=\s+|$)/g;
  let m;
  while ((m = re.exec(t))) {
    const end = m.index + m[0].length;
    const head = t.slice(start, m.index + 1);
    if (m[0] === '.' && ABBREV.test(head)) continue;
    // a sentence must be followed by a capital, digit, quote or end of text (else keep joining)
    const rest = t.slice(end).replace(/^\s+/, '');
    if (rest && !/^[A-Z0-9"'“‘(\[<]/.test(rest)) continue;
    out.push({ s: start, e: end });
    start = end;
    while (start < t.length && /\s/.test(t[start])) start++;
  }
  if (start < t.length) out.push({ s: start, e: t.length });
  return out.filter((x) => t.slice(x.s, x.e).trim().length > 0);
}
export const sentencesOf = (text) => splitSentences(text).map(({ s, e }) => text.slice(s, e).trim());

/** True when a sentence carries a clock time ("1:00pm", "4 p.m.", "10:15 a.m.", "noon"). Used by invariant I5. */
export const CLOCK_RE = /\b\d{1,2}(?::\d{2})?\s?(?:a\.?\s?m\.?|p\.?\s?m\.?|am|pm)\b|\b\d{1,2}:\d{2}\b|\bo['’]clock\b|\b(?:noon|midnight)\b/i;

// ---- hashing (FNV-1a 32) used for bucket routing, in browser and node --------------------------------------------------
export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
export const bucketOf = (term, n) => fnv1a32(term) % n;

/** Bounded Damerau-Levenshtein (optimal string alignment). Returns max+1 when the distance exceeds max. */
export function dl(a, b, max) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (a === b) return 0;
  let prev2 = null, prev = new Array(lb + 1), cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur; cur = new Array(lb + 1);
  }
  return prev[lb];
}
