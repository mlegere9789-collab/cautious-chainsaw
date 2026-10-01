// clock.js - reading a clock-of-day question ("at 3pm on July 2", "noon on July 3", "the morning of July 1", "between 2 and 4 pm on July 3") and printing the model's minutes.
// Dependency free. The clock itself never lives here: the numbers come from facts.clock (tools/historian/lib/clock.mjs), which bakes the canonical time model's output.
//
// Minutes are counted from 1863-07-01T00:00 local mean time, like the time model: July d, hh:mm = (d - 1) * 1440 + hh * 60 + mm.

import { stripInvisible } from './text.js';

export const DAY = 1440;

const WORD_DAY = { one: 1, two: 2, three: 3, first: 1, second: 2, third: 3 };

const NUM_WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ORD_WORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const NUMW = Object.keys(NUM_WORD).join('|'), ORDW = Object.keys(ORD_WORD).join('|');
const OTHER_MONTH = '(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|august|aug|september|sept|sep|october|oct|november|nov|december|dec)';
const RANGE_SEP = '(?:-|to|through|thru|till|until)', LIST_SEP = '(?:,|and|&|or)';
const isTimeAfter = (rest) => /^\s*(?:a\.?\s?m|p\.?\s?m|o['’]?\s?clock|:\d)/i.test(rest);   // "July 2, 3 pm": the 3 is an hour, not another day
const span = (a, b) => { const out = []; if (b < a || b - a > 40) return [a, b].filter((x, i, arr) => arr.indexOf(x) === i); for (let d = a; d <= b; d++) out.push(d); return out; };
const isRangeSep = (w) => new RegExp('^' + RANGE_SEP + '$').test(w);

/**
 * Every day a question names, read as one class: "July 2", "the 3rd of July", "day two", "the second day", "July 1-3", "July 1 to 3", "July 1 through July 3", "July 2 and 3", "1 to 3 July",
 * "days one through three", "the first two days", "all three days", "day 4", "July 4", "June 28".
 * Returns { days: [1..3 in battle order], outside: [{ m, d }], single: { m, d } | null, range: boolean, n }
 *   days     the days of the battle (July 1 to 3) the question names, each once
 *   outside  dates the records do not cover: July 4 and later, and any other month
 *   single   the one date named, when exactly one is (a question about one day)
 *   range    true when the question names more than one day (a stretch or a list)
 */
export function readDays(text) {
  let t = ' ' + String(text || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ') + ' ';
  const found = [];       // { m: 'july' | 'day' | another month, d, range? }
  const take = (re, fn) => { t = t.replace(re, (...a) => { fn(a); return ' '; }); };
  // 1. month first: "July 1-3", "July 1 to 3", "July 1 through July 3", "July 2 and 3rd", "July 1, 2 and 3", "June 28"
  const MONTH_FIRST = new RegExp('\\b(july|jul|' + OTHER_MONTH + ')\\.?\\s*(?:the\\s*)?(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)', 'g');
  const CONT = new RegExp('^\\s*(' + RANGE_SEP + '|' + LIST_SEP + ')\\s*(?:and\\s*)?(?:the\\s*)?(?:(?:july|jul)\\.?\\s*)?(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)');
  let out = '', last = 0, m;
  while ((m = MONTH_FIRST.exec(t))) {
    const mon = /^jul/.test(m[1]) ? 'july' : m[1]; const days = [+m[2]]; let end = MONTH_FIRST.lastIndex, isRange = false;
    for (;;) {
      const c = CONT.exec(t.slice(end));
      if (!c) break;
      if (isTimeAfter(t.slice(end + c[0].length)) || /^\s*(?:,\s*)?(?:18|19)\d\d/.test(t.slice(end + c[1].length))) break;
      if (isRangeSep(c[1]) || (c[1] === 'and' && days.length === 1 && /\bbetween\s*(?:the\s*)?$/.test(t.slice(0, m.index)))) { days.push(...span(days[days.length - 1], +c[2]).slice(1)); isRange = true; } else days.push(+c[2]);
      end += c[0].length;
    }
    for (const d of days) found.push({ m: mon, d, range: isRange || days.length > 1 });
    out += t.slice(last, m.index) + ' '; last = end; MONTH_FIRST.lastIndex = end;
  }
  t = out + t.slice(last);
  // 2. day first: "the 2nd of July", "1 to 3 July", "the 1st through the 3rd of July"
  take(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(' + RANGE_SEP + '|' + LIST_SEP + ')\\s*(?:the\\s*)?(\\d{1,2})(?:st|nd|rd|th)?)?\\s*(?:of\\s*)?(?:july|jul)\\b\\.?', 'g'), (a) => {
    if (a[3] === undefined) found.push({ m: 'july', d: +a[1] }); else for (const d of isRangeSep(a[2]) ? span(+a[1], +a[3]) : [+a[1], +a[3]]) found.push({ m: 'july', d, range: true });
  });
  // 3. "day 4", "days 1-3", "days one through three", "day 1 to day 3", "day two and three"
  const DN = '(\\d{1,2}|' + NUMW + ')'; const dn = (x) => (/^\d/.test(x) ? +x : NUM_WORD[x]);
  take(new RegExp('\\bdays?\\s*(?:number\\s*|no\\.?\\s*|#)?' + DN + '(?![0-9])(?:\\s*(' + RANGE_SEP + '|' + LIST_SEP + ')\\s*(?:day\\s*)?' + DN + '(?![0-9]))?', 'g'), (a) => {
    if (a[3] === undefined) found.push({ m: 'day', d: dn(a[1]) }); else for (const d of isRangeSep(a[2]) ? span(dn(a[1]), dn(a[3])) : [dn(a[1]), dn(a[3])]) found.push({ m: 'day', d, range: true });
  });
  // 4. "the first two days", "the first three days", "all three days", "the last two days", "first through third day", "first and second days"
  take(/\b(first|last)\s+(two|three|2|3)\s+days?\b/g, (a) => { const k = dn(a[2]); for (const d of a[1] === 'first' ? span(1, k) : span(4 - k, 3)) found.push({ m: 'day', d, range: true }); });
  take(/\b(?:all|the)\s+(?:three|3)\s+days?\b|\bthree days of (?:the )?battle\b/g, () => { for (const d of [1, 2, 3]) found.push({ m: 'day', d, range: true }); });
  take(new RegExp('\\b(' + ORDW + ')\\s*(-|to|through|thru|and|&|,)\\s*(?:the\\s*)?(' + ORDW + ')\\s+days?\\b', 'g'), (a) => { for (const d of isRangeSep(a[2]) ? span(ORD_WORD[a[1]], ORD_WORD[a[3]]) : [ORD_WORD[a[1]], ORD_WORD[a[3]]]) found.push({ m: 'day', d, range: true }); });
  // 5. "the second day", "2nd day", "the last day"
  take(new RegExp('\\b(?:(' + ORDW + ')|(\\d{1,2})(?:st|nd|rd|th))[ -]+day\\b', 'g'), (a) => found.push({ m: 'day', d: a[1] ? ORD_WORD[a[1]] : +a[2] }));
  take(/\b(?:last|final)\s+day\b/g, () => found.push({ m: 'day', d: 3 }));
  take(new RegExp('\\b(' + ORDW + ')\\s+of\\s+july\\b', 'g'), (a) => found.push({ m: 'july', d: ORD_WORD[a[1]] }));
  // the battle's days, and the dates the records do not cover
  const inBattle = (f) => (f.m === 'july' || f.m === 'day') && f.d >= 1 && f.d <= 3;
  const days = [...new Set(found.filter(inBattle).map((f) => f.d))].sort((x, y) => x - y);
  const outside = []; for (const f of found) if (!inBattle(f) && !outside.some((o) => o.m === (f.m === 'day' ? 'july' : f.m) && o.d === f.d)) outside.push({ m: f.m === 'day' ? 'july' : f.m, d: f.d });
  const uniq = new Set(found.map((f) => (f.m === 'day' ? 'july' : f.m) + '|' + f.d));
  const range = found.some((f) => f.range) || uniq.size > 1;
  return { days, outside, single: !range && found.length >= 1 ? { m: found[0].m === 'day' ? 'july' : found[0].m, d: found[0].d } : null, range, n: found.length };
}

/** the July date a question names (calendar date, 1 to 31), or null: "July 10" is 10, never 1; "the second day" is 2 (the Day tab and the date agree by day, not by night); a stretch ("July 1-3") is no single date */
export function julyDate(text) {
  const r = readDays(text);
  return r.single && r.single.m === 'july' && r.single.d >= 1 && r.single.d <= 31 ? r.single.d : null;
}

const to24 = (h, mer) => (mer === 'a' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12);

/** minutes after midnight -> "3:00 PM", "12:00 PM", "12:40 AM" (rounded to 5 minutes, the time model's own display rule) */
export function hm12(mod) {
  let m = Math.round((((mod % DAY) + DAY) % DAY) / 5) * 5; if (m >= DAY) m -= DAY;
  const h = Math.floor(m / 60), mi = m % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${mi < 10 ? '0' : ''}${mi} ${h >= 12 ? 'PM' : 'AM'}`;
}
export const dateOf = (abs) => 1 + Math.floor(abs / DAY);
export const modOf = (abs) => ((abs % DAY) + DAY) % DAY;

/** phase words -> [from, to) in minutes after midnight of the named date (the night runs into the next morning) */
export function phaseWindow(word, solar) {
  const s = solar || { dawn: 243, sunrise: 275, sunset: 1172, nautical: 1246 };
  switch (word) {
    case 'dawn': return [s.dawn - 20, s.sunrise + 60];
    case 'early morning': return [240, 480];
    case 'late morning': return [600, 720];
    case 'morning': return [240, 720];
    case 'early afternoon': return [720, 840];
    case 'late afternoon': return [900, 1050];
    case 'afternoon': return [720, 1050];
    case 'dusk': return [s.sunset - 30, s.nautical];
    case 'late evening': return [1140, 1260];
    case 'evening': return [1050, 1260];
    case 'night': return [1260, 1680];
    default: return null;
  }
}

const MER = '(a\\.?\\s?m|p\\.?\\s?m)\\b\\.?';
const SPELL = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const SPELLW = Object.keys(SPELL).join('|');
const CLOCK_RES = {
  range: new RegExp('\\b(?:between|from)\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:' + MER + ')?\\s*(?:and|to|-|–|until)\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER, 'i'),
  meridiem: new RegExp('(?<![\\d:.])(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER, 'i'),
  h24: /\b([01]\d|2[0-3])([0-5]\d)\s*(?:hours?|hrs?)\b/i,
  colon: /(?<![\d:.])(\d{1,2}):(\d{2})\b(?!\s*(?:a\.?\s?m|p\.?\s?m))/i,
  oclock: /(?<![\d:.])(\d{1,2})\s*o['’]?\s?clock\b/i,
  inThe: /(?<![\d:.])(\d{1,2})(?:[:.](\d{2}))?\s+(?:o['’]?\s?clock\s+)?(?:in the|at)\s+(morning|afternoon|evening|night)\b/i,
};
const PHASE_RE = /\b(?:(early|late)\s+)?(morning|forenoon|afternoon|evening|night|dawn|daybreak|sunrise|first light|dusk|sundown|sunset|twilight|nightfall)\b/i;
const PHASE_CANON = { forenoon: 'morning', daybreak: 'dawn', sunrise: 'dawn', 'first light': 'dawn', sundown: 'dusk', sunset: 'dusk', twilight: 'dusk', nightfall: 'dusk' };

// "at 3", "around 5", "by 4": a bare hour counts as a clock only right after one of these, and not when a unit or an ordinal follows ("at 3 corps", "by 4th")
const TIME_PREP = '(?:at|around|about|by|before|after|until|till|since|near|towards?|approximately|roughly)';
const UNIT_AFTER = /^\s*(?:st\b|nd\b|rd\b|th\b|men\b|soldiers?\b|troops\b|miles?\b|guns?\b|cannons?\b|regiments?\b|brigades?\b|divisions?\b|corps\b|batter|casualt|killed|wounded|dead\b|days?\b|hours?\b|minutes?\b|feet\b|foot\b|yards?\b|rounds?\b|prisoners?\b|horses\b|companies\b|%|percent\b|years?\b|of\b|to\s+\d|-\s*\d)/i;
// words that may follow "noon" / "midnight" when it is a time and not part of a name ("noon on July 2", "noon that day"); any other word makes it a modifier ("the noon lull")
const NEXT_OK = /^(?:on|of|in|at|and|or|to|the|a|an|that|this|these|those|july|jul|day|for|with|during|by|from|until|till|when|what|who|whom|how|why|did|does|do|was|were|is|are|had|has|have|last|lasted|lasts|begin|began|start|started|end|ended|ends|through|throughout|between|around|about|near|into|onto|after|before|since|as|if|while|which|where|i|we|you|it|they|he|she|lee|meade|today|yesterday|tomorrow)$/i;
const PREP_BEFORE = /\b(?:at|around|about|by|near|until|till|before|after|since|toward|towards|from|between|past|approximately)\s*$/i;
const TIME_PRE = '(?:at|around|about|by|near|until|till|before|after|since)';

/** "half past three", "quarter to four", "ten past two", "three o'clock", "four pm", "three thirty in the afternoon" -> digit forms the readers below understand */
function spelledClock(t) {
  const H = '(' + SPELLW + '|\\d{1,2})', hv = (x) => (/^\d/.test(x) ? +x : SPELL[x.toLowerCase()]);
  const spell = (m, w, dir, h) => {
    const key = w.toLowerCase().replace(/[- ]five$/, '');
    const mins = { half: 30, quarter: 15, ten: 10, five: 5, twenty: 20 }[key] + (/^twenty[- ]five$/i.test(w) ? 5 : 0);
    if (/^(?:to|before)$/i.test(dir)) { if (/^half$/i.test(w)) return m; const hh = hv(h) - 1; return (hh < 1 ? 12 : hh) + ':' + String(60 - mins).padStart(2, '0'); }
    return hv(h) + ':' + String(mins).padStart(2, '0');
  };
  let s = t;
  // "half past three" and "quarter to four" are times wherever they stand; "ten to two" / "five past three" only after a time word ("outnumbered five to one" is a ratio)
  s = s.replace(new RegExp('\\b(half|quarter)\\s+(past|after|to|before)\\s+' + H + '\\b', 'gi'), spell);
  s = s.replace(new RegExp('\\b(ten|five|twenty|twenty[- ]five)\\s+(past|after|to|before)\\s+' + H + '\\b', 'gi'), (m, w, dir, h, off, str) => (new RegExp('\\b' + TIME_PRE + '\\s$', 'i').test(str.slice(0, off)) || /^\s*(?:a\.?\s?m|p\.?\s?m|in the|o['’]?\s?clock)/i.test(str.slice(off + m.length)) ? spell(m, w, dir, h) : m));
  s = s.replace(new RegExp('\\b' + H + '\\s+(fifteen|thirty|forty[- ]five)\\b(?=\\s*(?:a\\.?\\s?m|p\\.?\\s?m|in the|at night|o))', 'gi'), (m, h, mm) => hv(h) + ':' + ({ fifteen: '15', thirty: '30' }[mm.toLowerCase()] || '45'));
  s = s.replace(new RegExp('\\b(' + SPELLW + ')\\b(?=\\s*(?:o[\'’]?\\s?clock|a\\.?\\s?m\\b|p\\.?\\s?m\\b|in the (?:morning|afternoon|evening)|at night))', 'gi'), (m, h) => String(SPELL[h.toLowerCase()]));
  return s;
}

/** a time that cannot exist ("13pm", "25:00", "15:75", "0 pm"): named so the caller can say so instead of answering as if no time had been asked */
function invalidClock(t) {
  let m;
  if ((m = t.match(new RegExp('(?<![\\d:.])(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER, 'i'))) && (+m[1] < 1 || +m[1] > 12 || (m[2] !== undefined && +m[2] > 59))) return m[0].trim();
  if ((m = t.match(/(?<![\d:.])(\d{1,2}):(\d{2})\b/)) && (+m[1] > 23 || +m[2] > 59)) return m[0];
  if ((m = t.match(/(?<![\d:.])(\d{1,2})\s*o['’]?\s?clock\b/i)) && (+m[1] < 1 || +m[1] > 12)) return m[0];
  return null;
}

/**
 * Read the clock of day out of a question. Returns null when the question names no clock time and no part of the day.
 *   { kind: 'point', mod }                     a clock time ("3pm", "15:00", "noon", "midnight", "0300")
 *   { kind: 'window', from, to, phase? }       a stretch of the day ("the morning", "between 2 and 4 pm"); with rel 'before' | 'after' the stretch of the day before / after a time ("before 4 pm", "after noon")
 *   { ambiguous: 'meridiem', hour }            "3 o'clock" / "3:30" / "at 3" with no am / pm and no part of the day: the caller asks which
 *   { invalid: true }                          a time that cannot exist ("13pm", "25:00")
 * plus { date: <July date or null>, text: <what matched>, norm: <the question with spelled-out clocks written as digits> }. A part of the day next to a clock ("3 in the afternoon") settles the meridiem.
 */
export function parseClock(text, { solar = null } = {}) {
  const t = spelledClock(stripInvisible(String(text || '')).replace(/[‘’]/g, "'"));
  const date = julyDate(t);
  const pm = t.match(PHASE_RE);
  const phase = pm ? ((pm[1] ? pm[1].toLowerCase() + ' ' : '') + (PHASE_CANON[pm[2].toLowerCase()] || pm[2].toLowerCase())) : null;
  const phaseMer = phase ? (/morning|dawn/.test(phase) ? 'a' : /afternoon|evening|dusk|night/.test(phase) ? 'p' : null) : null;
  const res = (o) => ({ date, norm: t, ...o });
  // "before 4 pm" / "by 4 pm" / "until 4" ask for what had happened up to that time; "after" / "since" for what followed: a stretch of the day, never the moment itself
  const relOf = (idx) => {
    const before = t.slice(0, idx);
    if (/\b(?:before|prior to|earlier than|by|until|till|up to|ahead of|through)\s*(?:about|around|roughly|approximately)?\s*$/i.test(before)) return 'before';
    if (/\b(?:after|since|following|later than|past)\s*(?:about|around|roughly|approximately)?\s*$/i.test(before)) return 'after';
    return null;
  };
  const span = (mod, rel, txt, extra = {}) => (rel === 'before' ? res({ kind: 'window', from: 0, to: mod, rel, at: mod, text: txt, ...extra }) : rel === 'after' ? res({ kind: 'window', from: mod, to: DAY, rel, at: mod, text: txt, ...extra }) : res({ kind: 'point', mod, text: txt, ...extra }));
  const point = (mod, m, extra = {}) => span(mod, relOf(m.index), m[0], extra);
  const prepRel = (p) => (/^(?:before|by|until|till)$/i.test(p) ? 'before' : /^(?:after|since)$/i.test(p) ? 'after' : null);
  let m;
  if ((m = t.match(CLOCK_RES.range))) {
    const mer2 = m[6].replace(/[.\s]/g, '')[0].toLowerCase(); let mer1 = m[3] ? m[3].replace(/[.\s]/g, '')[0].toLowerCase() : mer2;
    const h1 = +m[1], h2 = +m[4];
    if (h1 >= 1 && h1 <= 12 && h2 >= 1 && h2 <= 12) {
      const a = to24(h1, mer1) * 60 + (+m[2] || 0), b = to24(h2, mer2) * 60 + (+m[5] || 0);
      if (!m[3] && a > b) mer1 = mer2 === 'p' ? 'a' : 'p';
      const from = to24(h1, mer1) * 60 + (+m[2] || 0);
      if (from < b) return res({ kind: 'window', from, to: b, text: m[0] });
    }
  }
  const bad = invalidClock(t); if (bad) return res({ invalid: true, text: bad });
  if ((m = t.match(CLOCK_RES.meridiem))) {
    const h = +m[1]; if (h >= 1 && h <= 12) return point(to24(h, m[3].replace(/[.\s]/g, '')[0].toLowerCase()) * 60 + (+m[2] || 0), m);
  }
  if ((m = t.match(CLOCK_RES.h24))) return point(+m[1] * 60 + +m[2], m);
  // a military time written without "hours": "at 0300", "around 1500" (a year such as 1863 is not one: its minutes are over 59)
  if ((m = t.match(new RegExp('\\b(' + TIME_PREP + ')\\s+([01]\\d|2[0-3])([0-5]\\d)\\b(?!\\s*[-\\d,])', 'i'))) && !UNIT_AFTER.test(t.slice(m.index + m[0].length))) return span(+m[2] * 60 + +m[3], prepRel(m[1]), m[2] + m[3]);
  if ((m = t.match(CLOCK_RES.inThe)) && +m[1] >= 1 && +m[1] <= 12) return point(to24(+m[1], /morning/i.test(m[3]) || (/night/i.test(m[3]) && (+m[1] <= 4 || +m[1] === 12)) ? 'a' : 'p') * 60 + (+m[2] || 0), m);
  // "noon" / "midnight" as a time ("at noon", "noon on July 2"), not as part of a name ("the noon lull", "the midnight council")
  const mk = /\b(?:(?:high )?noon|midday|midnight)\b/i.exec(t);
  if (mk) {
    const after = t.slice(mk.index + mk[0].length), nw = /^\s*([A-Za-z][A-Za-z'-]*)/.exec(after), sep = /^\s*[,.;?!]/.test(after);
    if (PREP_BEFORE.test(t.slice(0, mk.index)) || !nw || sep || NEXT_OK.test(nw[1])) { const mid = /midnight/i.test(mk[0]); return span(mid ? DAY : 720, relOf(mk.index), mid ? 'midnight' : 'noon'); }
  }
  if ((m = t.match(CLOCK_RES.colon)) || (m = t.match(CLOCK_RES.oclock))) {
    const h = +m[1], mi = +(m[2] || 0);
    if (m[2] !== undefined && h >= 13 && h <= 23) return point(h * 60 + mi, m);
    if (h >= 1 && h <= 12) {
      if (phaseMer) return point(to24(h, phaseMer) * 60 + mi, m);
      return res({ ambiguous: 'meridiem', hour: h, minute: mi, text: m[0], rel: relOf(m.index) });
    }
  }
  // "at 3", "around 5", "by 4": a bare hour right after a time word. It is asked about (am or pm), not guessed.
  if ((m = t.match(new RegExp('\\b(' + TIME_PREP + ')\\s+(\\d{1,2})\\b(?![:.]\\d)', 'i'))) && +m[2] >= 1 && +m[2] <= 12 && !UNIT_AFTER.test(t.slice(m.index + m[0].length))) {
    const h = +m[2];
    if (phaseMer) return span(to24(h, phaseMer) * 60, prepRel(m[1]), m[2]);
    return res({ ambiguous: 'meridiem', hour: h, minute: 0, text: m[0], rel: prepRel(m[1]) });
  }
  if (phase) { const w = phaseWindow(phase, solar); if (w) return res({ kind: 'window', from: w[0], to: w[1], phase, text: pm[0] }); }
  return null;
}
