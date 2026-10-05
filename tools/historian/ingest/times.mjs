// times.mjs - clock-time claims in the Official Records: what a report or dispatch SAYS about the hour, read by grammar, with the day it says it about.
//
//   parseClock(text)      every clock expression in a string, with its span, the minute of the day it names (1863 local clock, never a tick), a tolerance, a modifier and a kind:
//                           clock    "4.30 p. m.", "10 a. m.", "3:15 p.m.", "12 m." (noon), "about 4 p. m."
//                           oclock   "at 10 o'clock", "five o'clock in the afternoon" (the meridiem is taken from the words around it when they say it; otherwise it is AMBIGUOUS: min is null, cand holds both readings)
//                           spelled  "half past four", "a quarter before five", "ten minutes before four"
//                           range    "between 4 and 5 p. m.", "from 3 to 5 o'clock p. m." (min = the middle, tol = half the range)
//                           noon / midnight / sun   "noon", "midnight", "daybreak", "sunrise", "sunset", "dusk", "nightfall", "at daylight" (min is the Gettysburg value for July 1863, tol 25 minutes)
//   dayRefs(sentence, st) the day a sentence names: "July 2", "the 2d instant", "on the 3d", "the 30th ultimo", a weekday, "the next morning", "the same day" ("the 2d Brigade" is a unit, not a day)
//   claimsOf(...)         the clock claims of one document (a report or a dispatch), each with its day, how the day was found, and its evidence class
// A clock claim is the author's own statement: it is testimony (a report written days or months after the fact), not a measurement; dispatch headers are the exception, written as they were sent.
// Nothing here guesses past what the words say: an hour without a meridiem the context does not give stays ambiguous, and a day that is not named or carried stays null.

const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const NUMW_RE = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
// the meridiem as the OCR prints it: "a. m.", "a.m.", "p. m", "A. M.", "P. M."; a bare "am" or "pm" is not read (it is "I am")
// "a. m." / "a.m." / "A. M." / "AM": a lower-case "am" or "pm" with no stop in it is not read ("1 am informed" is the OCR's "I am informed": the printer's letter I read as the digit 1)
const MER = String.raw`(?:[ap]\s?[.,]\s?m|(?-i:[AP]\.?\s?M))\b\.?`;
const OCL = String.raw`o.{0,2}cl[oec]ck`;
const HM = String.raw`(\d{1,2})(?:\s?[.:]\s?(\d{2}))?`;

// Gettysburg, July 1863 (local mean time): the same values the time model's solar table gives, rounded; they are the reading of a WORD, tolerance 25 minutes
export const SOLAR = { dawn: 4 * 60 + 25, daybreak: 4 * 60 + 25, sunrise: 4 * 60 + 55, noon: 12 * 60 + 5, sunset: 19 * 60 + 25, sundown: 19 * 60 + 25, dusk: 19 * 60 + 55, twilight: 19 * 60 + 55, nightfall: 20 * 60 + 10, midnight: 0 };

const RES = [
  { kind: 'range', re: new RegExp(String.raw`\b(between|from)\s+${HM}\s*(?:${MER}|${OCL})?\s+(and|to)\s+${HM}\s*((?:${OCL})?\s*(?:${MER})?)`, 'gi') },
  { kind: 'clock', re: new RegExp(String.raw`(?<![\d.,:/\-])${HM}\s*(?:${OCL}\s*)?(${MER})`, 'gi') },
  { kind: 'noon12', re: new RegExp(String.raw`(?<![\d.,:/\-])(?:12|twelve)\s*m\b\.?(?=\s*[,;.]|\s+(?:and|to|on|the|in|when|we|I|my|our|a|an|while|with|at|he|it|they|then)\b|\s*$)`, 'gi') },
  { kind: 'oclock', re: new RegExp(String.raw`(?<![\d.,:/\-])${HM}\s*${OCL}(?:\s*(?:in\s+the\s+)?(morning|forenoon|afternoon|evening|at\s+night|a\.?\s?m|p\.?\s?m)\b)?`, 'gi') },
  { kind: 'spelled-oclock', re: new RegExp(String.raw`\b(${NUMW_RE})\s+${OCL}(?:\s*(?:in\s+the\s+)?(morning|forenoon|afternoon|evening|at\s+night)\b)?`, 'gi') },
  { kind: 'spelled', re: new RegExp(String.raw`\b(half\s+past|a\s+quarter\s+(?:before|past|to|after)|(?:one|two|three|four|five|ten|twenty|twenty-five|fifteen)\s+minutes?\s+(?:before|past|to|after))\s+(\d{1,2}|${NUMW_RE})\b(?:\s*(${MER}|${OCL}))?`, 'gi') },
  { kind: 'hour-in-the', re: new RegExp(String.raw`(?<![\d.,:/\-])((?:at|about|near|until|till|by|nearly|before|after|since)\s+)(\d{1,2})(?:\s?[.:]\s?(\d{2}))?\s+in\s+the\s+(morning|forenoon|afternoon|evening)\b`, 'gi') },
  { kind: 'sun', re: /\b(daybreak|break\s+of\s+day|dawn|sunrise|sun-?up|sunset|sun-?down|dusk|twilight|nightfall|midnight|noon|mid-?day)\b/gi },
  { kind: 'sun', re: /\b(?:at|before|by|until|till|after|about|near|toward|towards)\s+(daylight)\b/gi },
];
const MODS = [
  [/(?:about|near|nearly|some|almost|toward|towards|abou[lt]|close\s+(?:on|upon|to)|shortly\s+(?:after|before)|probably)\s*$/i, 'about'],
  [/(?:before|ere|prior\s+to|earlier\s+than|not\s+later\s+than)\s*$/i, 'before'],
  [/(?:by)\s*$/i, 'by'],
  [/(?:after|past|subsequent\s+to|later\s+than)\s*$/i, 'after'],
  [/(?:until|till|up\s+to)\s*$/i, 'until'],
  [/(?:at|exactly|precisely)\s*$/i, 'at'],
];
const modOf = (text, s) => { const before = text.slice(Math.max(0, s - 24), s); for (const [re, m] of MODS) if (re.test(before)) return m; return 'at'; };
const wordNum = (x) => (/^\d/.test(x) ? +x : NUMW[x.toLowerCase()] || null);

/** the meridiem the words around an hour give: 'am' | 'pm' | null */
export function ampmFromContext(h, ctx) {
  const t = ' ' + String(ctx || '').toLowerCase() + ' ';
  if (/\b(?:p\.?\s?m|afternoon|evening)\b/.test(t) && !/\ba\.?\s?m\b|morning|forenoon/.test(t)) return 'pm';
  if (/\b(?:a\.?\s?m|morning|forenoon)\b/.test(t) && !/\bp\.?\s?m\b|afternoon|evening/.test(t)) return 'am';
  if (/\bat\s+night\b|\bin\s+the\s+night\b|\bnight\b/.test(t) && !/\bmorning|afternoon|evening\b/.test(t)) return h >= 6 && h <= 11 ? 'pm' : (h === 12 || h <= 5 ? 'am' : null);
  return null;
}
const minOf = (h, m, ampm) => { if (ampm === null || h < 1 || h > 12 || m > 59) return null; return ((h % 12) + (ampm === 'pm' ? 12 : 0)) * 60 + m; };

/** every clock expression in `text`: [{ s, e, text, kind, min, ampm, h, m, tol, mod, cand, word }] in order, non-overlapping */
export function parseClock(text, { ctx = null } = {}) {
  const src = String(text == null ? '' : text); const found = [];
  for (const { kind, re } of RES) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(src))) {
      const s = m.index, e = s + m[0].length;
      let row = null;
      if (kind === 'clock') {
        const h = +m[1], mi = m[2] === undefined ? 0 : +m[2]; if (h < 1 || h > 12 || mi > 59) continue;
        const ap = /^p/i.test(m[3].replace(/^[^ap]*/i, '')) ? 'pm' : 'am';
        row = { kind, h, m: mi, ampm: ap, min: minOf(h, mi, ap), tol: m[2] !== undefined ? 5 : 10, explicitMinutes: m[2] !== undefined };
        // "12 p. m." and "12 a. m." are noon or midnight depending on the writer ("bivouacked at 12 p. m."): the hour is kept, the reading is not guessed
        if (h === 12 && mi === 0 && m[2] === undefined) { row.cand = [0, 720]; row.min = null; row.ampm = null; row.twelve = true; }
      } else if (kind === 'noon12') {
        row = { kind: 'noon', h: 12, m: 0, ampm: 'pm', min: 720, tol: 10, word: '12 m.' };
      } else if (kind === 'oclock') {
        const h = +m[1], mi = m[2] === undefined ? 0 : +m[2]; if (h < 1 || h > 12 || mi > 59) continue;
        let ap = null; const w = (m[3] || '').toLowerCase().replace(/\s/g, '');
        if (/^(?:afternoon|evening|p\.?m)$/.test(w)) ap = 'pm'; else if (/^(?:morning|forenoon|a\.?m)$/.test(w)) ap = 'am'; else if (w === 'atnight') ap = h >= 6 && h <= 11 ? 'pm' : h === 12 || h <= 5 ? 'am' : null;
        if (ap === null && ctx) ap = ampmFromContext(h, ctx);
        row = { kind, h, m: mi, ampm: ap, min: minOf(h, mi, ap), tol: 10, cand: ap === null ? [minOf(h, mi, 'am'), minOf(h, mi, 'pm')] : null, ctxAmpm: !m[3] && ap !== null };
      } else if (kind === 'spelled-oclock') {
        const h = NUMW[m[1].toLowerCase()]; let ap = null; const w = (m[2] || '').toLowerCase().replace(/\s/g, '');
        if (/^(?:afternoon|evening)$/.test(w)) ap = 'pm'; else if (/^(?:morning|forenoon)$/.test(w)) ap = 'am'; else if (w === 'atnight') ap = h >= 6 && h <= 11 ? 'pm' : h === 12 || h <= 5 ? 'am' : null;
        if (ap === null && ctx) ap = ampmFromContext(h, ctx);
        row = { kind: 'oclock', h, m: 0, ampm: ap, min: minOf(h, 0, ap), tol: 10, cand: ap === null ? [minOf(h, 0, 'am'), minOf(h, 0, 'pm')] : null, ctxAmpm: !m[2] && ap !== null, spelledHour: true };
      } else if (kind === 'spelled') {
        const base = wordNum(m[2]); if (!base || base > 12) continue;
        const phrase = m[1].toLowerCase().replace(/\s+/g, ' '); let off = 0, hour = base;
        if (phrase === 'half past') off = 30; else if (/quarter (?:past|after)/.test(phrase)) off = 15; else if (/quarter (?:before|to)/.test(phrase)) { off = -15; } else { const k = phrase.match(/^(\w[\w-]*) minutes?\s+(before|past|to|after)/); const n = k ? (wordNum(k[1]) || ({ fifteen: 15, twenty: 20, 'twenty-five': 25 })[k[1]] || null) : null; if (!n) continue; off = /before|to/.test(k[2]) ? -n : n; }
        const tail = (m[3] || '').toLowerCase(); let ap = /^p/.test(tail.replace(/^[^ap]*/, '')) && /m/.test(tail) ? 'pm' : /^a/.test(tail.replace(/^[^ap]*/, '')) && /m/.test(tail) ? 'am' : null;
        if (ap === null && ctx) ap = ampmFromContext(hour, ctx);
        const total = hour * 60 + off; const h2 = Math.floor(total / 60), m2 = ((total % 60) + 60) % 60;
        row = { kind: 'spelled', h: ((h2 + 11) % 12) + 1, m: m2, ampm: ap, min: ap === null ? null : (((h2 % 12) + (ap === 'pm' ? 12 : 0)) * 60 + m2), tol: 10, cand: ap === null ? [(h2 % 12) * 60 + m2, (h2 % 12 + 12) * 60 + m2] : null, ctxAmpm: ap !== null && !/m/.test(tail) };
      } else if (kind === 'hour-in-the') {
        const h = +m[2], mi = m[3] === undefined ? 0 : +m[3]; if (h < 1 || h > 12 || mi > 59) continue;
        const ap = /afternoon|evening/i.test(m[4]) ? 'pm' : 'am';
        row = { kind: 'oclock', h, m: mi, ampm: ap, min: minOf(h, mi, ap), tol: 10, cand: null, cueLen: m[1].length };
      } else if (kind === 'range') {
        const h1 = +m[2], m1 = m[3] === undefined ? 0 : +m[3], h2 = +m[5], m2 = m[6] === undefined ? 0 : +m[6]; if (h1 < 1 || h1 > 12 || h2 < 1 || h2 > 12 || m1 > 59 || m2 > 59) continue;
        if (!m[7] || !m[7].trim()) continue;
        const tail = m[7].replace(/^.*?(?=[apAP]\s?[.,]|[AP]\.?\s?M)/, ''); const ap2 = /^p/i.test(tail) && /m/i.test(m[7]) ? 'pm' : /^a/i.test(tail) && /m/i.test(m[7]) && !/o.{0,2}cl/i.test(tail.slice(0, 3)) ? 'am' : (ctx ? ampmFromContext(h2, ctx) : null);
        if (ap2 === null) continue;
        const a2 = minOf(h2, m2, ap2); let a1 = minOf(h1, m1, ap2); if (a1 > a2) a1 = minOf(h1, m1, ap2 === 'pm' ? 'am' : 'pm');
        if (a1 === null || a1 > a2) continue;
        row = { kind: 'range', h: h2, m: m2, ampm: ap2, min: Math.round((a1 + a2) / 2), tol: Math.max(10, Math.round((a2 - a1) / 2)), from: a1, to: a2, rangeWord: m[1].toLowerCase() };
      } else if (kind === 'sun') {
        const w = (m[1] || m[2] || '').toLowerCase().replace(/[\s-]+/g, '');
        const key = { breakofday: 'daybreak', sunup: 'sunrise', sundown: 'sunset', midday: 'noon', daylight: 'dawn' }[w] || w;
        if (!(key in SOLAR)) continue;
        row = { kind: key === 'noon' ? 'noon' : key === 'midnight' ? 'midnight' : 'sun', word: w, min: SOLAR[key], ampm: key === 'midnight' ? null : (SOLAR[key] < 720 ? 'am' : 'pm'), tol: key === 'noon' ? 10 : key === 'midnight' ? 10 : 25 };
      }
      if (!row) continue;
      const s2 = s + (row.cueLen || 0); delete row.cueLen;           // "at 3 in the afternoon": the cue word is read for the modifier but is not part of the expression
      found.push({ ...row, s: s2, e, text: src.slice(s2, e), cue: s2 > s ? src.slice(s, s2).trim() : null });
    }
  }
  // non-overlapping: longer spans first (a range holds its two ends, an o'clock phrase holds its hour), then earlier
  found.sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.s - b.s);
  const keep = []; for (const f of found) if (!keep.some((k) => f.s < k.e && k.s < f.e)) keep.push(f);
  keep.sort((a, b) => a.s - b.s);
  for (const k of keep) { k.mod = k.kind === 'range' ? 'between' : modOf(src, k.s); }
  return keep;
}

// ---- days -------------------------------------------------------------------------------------------------------------------------------------------------------------------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
// the OCR sets the first letter of a month apart ("J uly 22", "J une 3"): allowed
const MON_RE = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|J\\s?une?|J\\s?uly?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const ORD = String.raw`(\d{1,2})\s?(?:st|d|nd|rd|th|\^|d)?`;
const WEEKDAY = { sunday: [[6, 28], [7, 5]], monday: [[6, 29]], tuesday: [[6, 30]], wednesday: [[7, 1]], thursday: [[7, 2]], friday: [[7, 3]], saturday: [[7, 4]] };
// words that follow an ordinal when it is part of a unit's name ("the 2d Brigade", "the 3d New York"): then it is not a day
const UNITISH = /^(?:brigade|brigades|division|divisions|corps|regiment|regiments|battery|batteries|battalion|battalions|cavalry|infantry|artillery|army|volunteers|vols?|reserves?|u\.?\s?s|new|maine|massachusetts|vermont|connecticut|rhode|pennsylvania|ohio|indiana|illinois|michigan|wisconsin|minnesota|maryland|delaware|virginia|carolina|georgia|alabama|mississippi|louisiana|texas|tennessee|arkansas|florida|kentucky|west|north|south|n|s|e|w|pa|va|md|ny|nj|me|nh|vt|ct|ri|oh|in|il|mi|wi|mn|mass|penn|corps\.|bat|batt|light|heavy|u|c|company|co|squadron|section|sharpshooters|zouaves|legion|regulars|colored)\b/i;
const PRE_DAY = /(?:on|of|until|till|by|since|from|to|during|upon|and|or|for|about|before|after|that|which|whole|early|late|next|night|morning|evening|afternoon|day)\s+the\s*$/i;

/** the dates a sentence names: [{ m, d, kind, at }] (kind 'date' = month and day, 'ord' = the Nth, 'weekday', 'rel' = relative), using the report's own month for "instant" and "ultimo" */
export function dayRefs(sentence, { month = 7 } = {}) {
  const s = String(sentence); const out = [];
  for (const m of s.matchAll(new RegExp(String.raw`\b(${MON_RE})\.?\s*${ORD}(?![\d:.]\s?\d{2}\s?[ap])(?!\s?(?:[ap]\.?\s?m\b|o.?clock))`, 'gi'))) {
    const mo = MONTHS[m[1].replace(/\s/g, '').slice(0, 3).toLowerCase()], d = +m[2]; if (d >= 1 && d <= 31) out.push({ m: mo, d, kind: 'date', at: m.index });
  }
  for (const m of s.matchAll(new RegExp(String.raw`\b${ORD}\s+(instant|inst\b\.?|ultimo|ult\b\.?|proximo|prox\b\.?)`, 'gi'))) {
    const d = +m[1]; if (d < 1 || d > 31) continue; const w = m[2].toLowerCase();
    out.push({ m: /^ult/.test(w) ? (month === 1 ? 12 : month - 1) : /^prox/.test(w) ? month + 1 : month, d, kind: 'ord', at: m.index, rel: w });
  }
  for (const m of s.matchAll(new RegExp(String.raw`\bthe\s+${ORD}(?=\W|$)`, 'gi'))) {
    const d = +m[1]; if (d < 1 || d > 31) continue;
    const after = s.slice(m.index + m[0].length).replace(/^[\s,]*/, '');
    const next = after.match(/^[A-Za-z.]+/); const nx = next ? next[0] : '';
    const before = s.slice(Math.max(0, m.index - 30), m.index + 3);
    if (/^(?:instant|inst|ultimo|ult)/i.test(nx)) continue;                                  // read by the instant/ultimo rule above
    // "on the morning of the 3d, in compliance with your order": a comma right after the ordinal parts it from what follows, and a unit's name never has one ("the 3d Indiana"); a list of units ("the 2d, 3d and 5th Corps") has an ordinal after the comma
    const comma = /^\s*,/.test(s.slice(m.index + m[0].length));
    if (comma && /^\d/.test(nx)) continue;
    if (!comma && UNITISH.test(nx) && !(/^(?:in|me)$/i.test(nx) && !/^\s*(?:In|Me)\./.test(after)) || !comma && /^[A-Z]/.test(nx) && !/^(?:I|We|The|At|About|In|My|Our|He|It|On|After|Before|Early|A|An|When|While|Then|During|Colonel|General|Major|Captain|Lieutenant|This|That|There|These|Those|They|Their|But|And|So|For|As|Soon|Immediately|Shortly|Until|From|With|Having|Upon|Not|All)\b/.test(nx)) continue;
    if (!PRE_DAY.test(before) && !/^[,;.]/.test(s.slice(m.index + m[0].length))) continue;
    out.push({ m: null, d, kind: 'ord', at: m.index });
  }
  for (const m of s.matchAll(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/gi)) {
    const c = WEEKDAY[m[1].toLowerCase()]; if (!c) continue;
    if (c.length === 1) out.push({ m: c[0][0], d: c[0][1], kind: 'weekday', at: m.index });
    else out.push({ m: null, d: null, kind: 'weekday-amb', at: m.index, cands: c });
  }
  const rel = [[/\b(?:the\s+)?(?:next|following)\s+(?:day|morning|afternoon|evening|night)\b|\bthe\s+(?:morning|day|afternoon|evening)\s+(?:after|following)\b/i, 1, 'next'], [/\bthe\s+same\s+(?:day|morning|afternoon|evening|night)\b|\bthis\s+(?:day|morning|afternoon|evening)\b|\bto-?day\b/i, 0, 'same'], [/\byesterday\b/i, -1, 'prev'], [/\bto-?morrow\b/i, 1, 'tomorrow']];
  for (const [re, delta, w] of rel) { const m = re.exec(s); if (m) out.push({ kind: 'rel', delta, w, at: m.index }); }
  return out.sort((a, b) => a.at - b.at);
}

const daysIn = { 6: 30, 7: 31, 8: 31, 5: 31, 9: 30 };
const addDay = (st, delta) => { if (!st) return null; let d = st.d + delta, m = st.m; const dim = daysIn[m] || 31; if (d > dim) { d -= dim; m++; } else if (d < 1) { m--; d += daysIn[m] || 31; } return { m, d }; };
export const isoDay = (st, y = 1863) => (st ? `${y}-${String(st.m).padStart(2, '0')}-${String(st.d).padStart(2, '0')}` : null);

/**
 * The day register of a document read in order: every sentence that names a day sets it; later sentences inherit it. Returns a function day(sentence) -> { day: {m, d} | null, basis }
 *   basis 'same'     the sentence names its own day (a date, "the 2d", a weekday)
 *   basis 'carried'  the day was named in an earlier sentence of the document
 *   basis 'rel'      "the next morning": the register moved by one day
 *   basis 'none'     no day has been named yet
 * ctx.month is the month of the document's own date (for "instant" and "ultimo"); ctx.start is a day the document opens with (a dispatch's dateline)
 */
export function dayTracker({ month = 7, start = null } = {}) {
  let cur = start ? { m: start.m, d: start.d } : null;
  let age = 0, touched = false;                                   // sentences since the register was set; whether this sentence set it
  const inWindow = (m, d) => m === 6 ? d >= 28 : m === 7 ? d <= 5 : false;
  const apply = (r) => {
    if (r.kind === 'date') { cur = { m: r.m, d: r.d }; age = 0; touched = true; return 'same'; }
    // a weekday names a day of the battle week only where the report is about that week (the register is in it, or nothing is known): "Thursday" in a report of June 25 is not July 2
    if (r.kind === 'weekday') { if (cur && !inWindow(cur.m, cur.d)) return null; cur = { m: r.m, d: r.d }; age = 0; touched = true; return 'same'; }
    if (r.kind === 'ord') { cur = { m: ordMonth(r), d: r.d }; age = 0; touched = true; return 'same'; }
    if (r.kind === 'weekday-amb') { const near = cur ? r.cands.find(([m, d]) => Math.abs((m * 31 + d) - (cur.m * 31 + cur.d)) <= 3) : null; if (near) { cur = { m: near[0], d: near[1] }; age = 0; touched = true; return 'same'; } return null; }
    if (r.kind === 'rel' && cur) { if (r.w === 'tomorrow' || r.w === 'prev') return 'rel-once'; if (r.delta !== 0) { cur = addDay(cur, r.delta); age = 0; touched = true; } return 'rel'; }
    return null;
  };
  // the month of a bare ordinal ("the 1st"): the register's month, but at the turn of the campaign the days run across it: "On the night of June 30 ... on the morning of the 1st" is July 1 and, in a narrative at the start of July, "On the 28th" is June 28
  const ordMonth = (r) => { if (r.m && !(cur && /^inst/.test(r.rel || ''))) return r.m; if (!cur) return month; if (cur.m === 6 && r.d <= 5 && cur.d >= 25) return 7; if (cur.m === 7 && r.d >= 26 && cur.d <= 12) return 6; return cur.m; };       // "the 1st instant" is of the month the narrative is in (a document that holds two reports, the second written a month after the first), else the document's own
  const dayOfRef = (r) => (r.kind === 'date' || r.kind === 'weekday') ? { m: r.m, d: r.d } : r.kind === 'ord' ? { m: ordMonth(r), d: r.d } : null;
  // a date written right after the clock reads as the clock's day: "arriving at 7 a. m. on the 2d", "until about 10 a. m. July 5", "at daylight on July 4", "3.30 a. m. on Tuesday, July 7", "4 o'clock on the morning of the 3d"
  const AFTER = /^[\s,;.()\-—]*(?:(?:on|of|in|the|morning|afternoon|evening|night|day|and|following)[\s,]+){0,6}$/i;
  const after = (sentence, e, refs) => {
    // "Your telegram of 10 p. m., 23d," "(10 a. m. 15th)": the day written bare right behind the clock (not "10 p. m. 14th Pennsylvania": a unit's number)
    { const mb = /^[\s,;]*\(?(\d{1,2})(?:st|d|nd|rd|th)\b(?!\s*(?:ultimo|ult))/i.exec(sentence.slice(e));
      if (mb) { const nx2 = (sentence.slice(e + mb[0].length).replace(/^[\s,]*/, '').match(/^[A-Za-z.]+/) || [''])[0]; const d = +mb[1];
        if (d >= 1 && d <= 31 && !(UNITISH.test(nx2) && !/^(?:in|me)$/i.test(nx2)) && !/^[A-Z]/.test(nx2) || d >= 1 && d <= 31 && /^[,;.)]/.test(sentence.slice(e + mb[0].length).trim())) return { kind: 'ord', d, m: null, at: e }; } }
    for (let k = 0; k < refs.length; k++) {
      const r = refs[k]; if (r.at < e) continue; if (r.at - e > 36) break;
      if (r.kind === 'rel' && r.w === 'next' && /^[\s,;]*(?:on\s+|of\s+|in\s+)?$/i.test(sentence.slice(e, r.at))) return r;                  // "at 4 a. m. on the following morning": the register's next day
      if (!(r.kind === 'date' || r.kind === 'weekday' || r.kind === 'ord')) continue;
      if (!AFTER.test(sentence.slice(e, r.at))) continue;
      const nx = refs[k + 1];                                                      // "Tuesday, July 7": the date that follows the weekday is the day
      if (r.kind === 'weekday' && nx && nx.kind === 'date' && nx.at - r.at <= 22) return nx;
      return r;
    }
    return null;
  };
  /**
   * The day each clock of a sentence is said about, reading left to right. `spans` are [{ s, e }] (or bare start offsets). Order of evidence for a clock:
   *   a date written right AFTER it ("at 7 a. m. on the 2d")                                      'same'
   *   a day named BEFORE it in the sentence (a date, "the 2d", a weekday, "the next day")          'same' / 'rel'
   *   the register as the sentence found it, from an earlier sentence                              'carried' (age = sentences since it was set)
   *   a day named only AFTER it at a distance, when nothing else is known                          'later'
   */
  const at = (sentence, spans, ahead = '') => {
    const refs = dayRefs(sentence, { month }).sort((a, b) => a.at - b.at);
    const startAge = age; touched = false;
    const out = [];
    let ri = 0, basis = null, once = null;
    for (const sp of spans) {
      const pos = typeof sp === 'number' ? sp : sp.s, end = typeof sp === 'number' ? sp : sp.e;
      while (ri < refs.length && refs[ri].at < pos) { const b = apply(refs[ri]); if (b === 'rel-once') once = refs[ri]; else { once = null; if (b) basis = b; } ri++; }
      const aft = typeof sp === 'number' ? null : after(sentence + ahead, end, refs);
      const ad = aft ? (aft.kind === 'rel' ? (cur ? addDay(cur, aft.delta) : null) : dayOfRef(aft)) : null;
      if (ad) out.push({ day: ad, basis: aft.kind === 'rel' ? 'rel' : 'same', age: 0 });
      else if (once && cur) out.push({ day: { ...addDay(cur, once.delta) }, basis: 'rel', age: 0 });
      else if (basis && cur) out.push({ day: { ...cur }, basis, age: 0 });
      else if (cur) out.push({ day: { ...cur }, basis: 'carried', age: startAge + 1 });
      else {
        const later = refs.slice(ri).find((r) => r.kind === 'date' || r.kind === 'weekday' || r.kind === 'ord');
        out.push(later ? { day: { m: later.m || month, d: later.d }, basis: 'later', age: 0 } : { day: null, basis: 'none', age: 0 });
      }
    }
    while (ri < refs.length) { const b = apply(refs[ri]); ri++; if (b && b !== 'rel-once') basis = b; }
    if (!touched) age++;
    return out;
  };
  const tracker = (sentence) => at(sentence, [String(sentence).length])[0];
  tracker.at = at;
  tracker.state = () => (cur ? { m: cur.m, d: cur.d } : null);                      // the day register as it stands (a passage reads the day it opens on)
  return tracker;
}
