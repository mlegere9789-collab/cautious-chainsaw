// Shared "tick -> clock" detectors for TM-V9 / TM-V16 / TM-V17 (tools/time/rules.mjs) and the formula inventory (tools/time/surfaces.mjs).
// CANDIDATE tooling (WP-TIME-20). One definition, two consumers, so a variant one of them misses cannot slip through the other.
//
// They look for the SHAPES of the legacy formulas, not their exact spelling (the bundle is minified, so names carry no meaning there), and for
// the VALUES that make a constant a clock constant, not the digits a developer happened to type:
//   date       a month name plus a constant: template `July ${l+2}`, concatenation `"July " + (tab + 2)`, array `["July ", tab + 2]`, a literal date
//              table indexed by the tab (`["July 1","July 2","July 3"][tab - 1]`, an object keyed by day, a ternary or switch of dates), a Date built
//              in code (Date.UTC, new Date(1863, ..), a Date whose arguments carry a tick, 1863 or a 5-minute constant) and Date setters
//   tick5      tick -> minutes arithmetic: (x - k) * 5, tickName * 5, the 5-minute step in ms/s in ANY spelling (300000, 300_000, 3e5, 300e3,
//              300 * 1000, 5 * 60 * 1000, 60 * 1000 * 5, 0x493E0 ...) next to a tick-shaped operand, a step constant named for a tick (STEP_MS,
//              minutesPerTick = 5), and tick -> hour arithmetic with 12 ticks per hour ((tick - 1) / 12)
//   minutes    the 4/5/6 hour bases in minutes, seconds or ms in any spelling (5 * 60, 60 * 5, 5 * 3600, 5 * 60 * 60 * 1000, 18_000, 1.8e4)
//   locale     time-of-day formatters (toLocaleTimeString, toLocaleString with hour/minute options, toTimeString, getHours, Intl.DateTimeFormat);
//              allowed ONLY on the visitor's own clock (`new Date()`, `new Date(Date.now())`), wherever it sits
//   ampm       a typed AM/PM marker literal, with or without a space or dots: "PM", " PM", 'a.m.', `${h} PM`
//   clocktext  a hand-typed clock inside a string or in markup text: "Pickett steps off at 3:00 PM", '7:30am', <div>July 1, 5:00 AM</div>
//              (TX-05 "no hand-typed clock"; comments are not printed and are not counted)
//   copy       banned clock-implying words (real time, five-minute, minute-by-minute)
//
// PRECISION. A bare constant is not a clock: `ttl = 5 * 60 * 1000`, `setTimeout(f, 300000)`, `browserVersion < 3e5`, `x * 60000` (a minutes -> ms
// conversion), `Math.floor(months / 12)` are everywhere in unrelated code. A constant counts when it is (a) multiplied by an operand that looks like
// a tick ("(x - 1) * 5" is the legacy frame offset, a name made of the words tick/frame/step/slot), (b) named like a tick step, or (c) sitting in a
// statement that is about a clock (hours, minutes, AM/PM, a Date that is not the visitor's own) and not about a timer (timeout, ttl, cache, delay ...).
// tests/time/detectors-sweep.test.mjs sweeps both directions (spellings x shapes x wrappers, and a corpus of real-world code that must stay quiet).
//
// The module's own inlined text (tools/time/build/gtbg-time.inline.js, exact bytes) is exempt: the clock has to be formatted somewhere.
// An edited copy of it is NOT exempt, so tampering inside the module is seen as what it is.
import fs from 'node:fs';
import * as acorn from 'acorn';
import { P } from './lib.mjs';
import { uncertaintyFnSource } from '../t0/clock/uncertainty-fn.mjs';

// month names: full names in any case (july, JULY), abbreviations capitalised or upper case (Jul, JUL); not `may`, `mar`, `sep`, `oct`, `dec` in lower case (modal verbs, prose)
const ci = (w) => w.replace(/[A-Za-z]/g, (c) => `[${c.toUpperCase()}${c.toLowerCase()}]`);
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], ABBR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sept?', 'Oct', 'Nov', 'Dec'];
const monthAlt = (skip = []) => '(?:' + [...FULL_MONTHS.filter((n) => !skip.includes(n)).map(ci), ...(skip.includes('May') ? [] : ['May|MAY']), ...ABBR_MONTHS.filter((a) => !skip.includes(a)).map((a) => `${a}|${a.toUpperCase()}`)].join('|') + ')';
const MONTH = monthAlt();
const MONTH_NOT_WORDS = monthAlt(['March', 'Mar', 'May']); // March and May are also words: a label such as "Line of March" is not a date
const Q = '["\'`]';                                  // any JS string quote
const MONTH_LIT = `${Q}[^"'\`\\w]*${MONTH}\\.?\\s*${Q}`; // the literal "July " (a month name and nothing else but spacing/punctuation)
// a literal that ENDS with a month and a space ("Gettysburg, July ", "Day 2 - July "): text in front is fine
const MONTH_TAIL = `${Q}[^"'\`\n]{1,40}?(?<![A-Za-z])${MONTH_NOT_WORDS}\\.?\\s+${Q}`;
const OPERAND = '\\(?\\s*[\\w$.\\[\\]]+(?:\\s*\\([^()]*\\))?\\s*';

// ------------------------------------------------------------------------------------------------------------- numbers
/** a JS numeric literal in any spelling: 300000, 300_000, 3e5, 3E+5, .5, 5., 0x493E0, 0b101, 0o17 */
const NUM_SRC = '(?:0[xX][\\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\\d[\\d_]*(?:\\.[\\d_]*)?|\\.\\d[\\d_]*)(?:[eE][+-]?\\d[\\d_]*)?)';
const numValue = (raw) => Number(raw.replace(/_/g, ''));
const NUM_STICKY = new RegExp(NUM_SRC + '(?![\\w$])', 'y');
const WS_STICKY = /\s*/y;
const OP_STICKY = /\s*([*/])(?![=*/])\s*/y; // a lone * or / (not **, *=, /= or the start of a comment)

function parseTerm(text, i, depth) {
  WS_STICKY.lastIndex = i; WS_STICKY.exec(text); i = WS_STICKY.lastIndex;
  if (text[i] === '(') {
    if (depth > 4) return null;
    const inner = parseMul(text, i + 1, depth + 1); if (!inner) return null;
    WS_STICKY.lastIndex = inner.end; WS_STICKY.exec(text); const j = WS_STICKY.lastIndex;
    return text[j] === ')' ? { end: j + 1, value: inner.value, atoms: inner.atoms } : null;
  }
  NUM_STICKY.lastIndex = i; const m = NUM_STICKY.exec(text); if (!m) return null;
  const v = numValue(m[0]); return { end: i + m[0].length, value: v, atoms: [v] };
}
/** term (('*' | '/') term)* with numeric terms and parenthesised groups: -> { end, value, atoms } or null */
function parseMul(text, i, depth) {
  const first = parseTerm(text, i, depth); if (!first) return null;
  let { end, value } = first; const atoms = [...first.atoms];
  for (;;) {
    OP_STICKY.lastIndex = end; const o = OP_STICKY.exec(text); if (!o) break;
    const n = parseTerm(text, OP_STICKY.lastIndex, depth); if (!n) break;
    value = o[1] === '*' ? value * n.value : value / n.value; atoms.push(...n.atoms); end = n.end;
  }
  return { end, value, atoms };
}
const CHAIN_START = new RegExp(`(?<![\\w$.\\])])(?:\\(|${NUM_SRC}(?![\\w$]))`, 'g');
/**
 * Every maximal constant product/quotient in a text, folded: `5 * 60 * 1000`, `300 * 1000`, `(5 * 60) * 1000`, `3e5` and `300_000` all come out as
 * { value: 300000 }. -> [{ start, end, value, atoms, raw }] (a number on its own is a chain of one atom).
 */
export function constantChains(text) {
  const out = []; let covered = 0, m; CHAIN_START.lastIndex = 0;
  while ((m = CHAIN_START.exec(text))) {
    if (m.index < covered) continue;
    const before = charBefore(text, m.index); if (before && before.ch === '*' && text[before.at - 1] === '*') continue; // `a ** 2 * 5`: the 2 is an exponent
    const r = parseMul(text, m.index, 0); if (!r) continue;
    out.push({ start: m.index, end: r.end, value: r.value, atoms: r.atoms, raw: text.slice(m.index, r.end) });
    covered = r.end; CHAIN_START.lastIndex = r.end;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------- operands and names
const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';
function matchBack(text, close, open, shut, limit = 200) { let depth = 0; for (let i = close; i >= 0 && close - i < limit; i--) { const c = text[i]; if (c === shut) depth++; else if (c === open && --depth === 0) return i; } return -1; }
function matchFwd(text, from, open, shut, limit = 200) { let depth = 0; for (let i = from; i < text.length && i - from < limit; i++) { const c = text[i]; if (c === open) depth++; else if (c === shut && --depth === 0) return i; } return -1; }
/** the operand that ends just before `pos`: an identifier/member, a call, an index or a parenthesised group */
function operandBefore(text, pos) {
  let i = pos - 1; while (i >= 0 && isSpace(text[i])) i--;
  if (i < 0) return null;
  const c = text[i]; let start, kind;
  if (c === ')' || c === ']') {
    const o = c === ')' ? matchBack(text, i, '(', ')') : matchBack(text, i, '[', ']'); if (o < 0) return null;
    start = o; kind = c === ')' ? 'group' : 'index';
    let k = start - 1; while (k >= 0 && /[\w$.]/.test(text[k])) k--;
    if (k + 1 < start) { start = k + 1; kind = 'call'; }
  } else if (/[\w$.]/.test(c)) { let k = i; while (k >= 0 && /[\w$.]/.test(text[k])) k--; start = k + 1; kind = 'ident'; } else return null;
  return { start, end: i + 1, text: text.slice(start, i + 1), kind };
}
/** the operand that starts at or after `pos` */
function operandAfter(text, pos) {
  let i = pos; while (i < text.length && isSpace(text[i])) i++;
  if (i >= text.length) return null;
  let end, kind;
  if (text[i] === '(') { const c = matchFwd(text, i, '(', ')'); if (c < 0) return null; end = c + 1; kind = 'group'; }
  else if (/[\w$]/.test(text[i])) {
    let k = i; while (k < text.length && /[\w$.]/.test(text[k])) k++; end = k; kind = 'ident';
    if (text[k] === '(') { const c = matchFwd(text, k, '(', ')'); if (c > 0) { end = c + 1; kind = 'call'; } }
  } else return null;
  return { start: i, end, text: text.slice(i, end), kind };
}
/** the `*` that directly multiplies the chain on its left / right (not `**`, `*=`), with that operand */
function mulLeft(text, c) {
  let i = c.start - 1; while (i >= 0 && isSpace(text[i])) i--;
  if (i < 0 || text[i] !== '*' || text[i - 1] === '*') return null;
  return operandBefore(text, i);
}
function mulRight(text, c) {
  let i = c.end; while (i < text.length && isSpace(text[i])) i++;
  if (text[i] !== '*' || text[i + 1] === '*' || text[i + 1] === '=') return null;
  return operandAfter(text, i + 1);
}
/** is the chain the numerator of a division by something that is not a number (`5 * 60 / elapsed`)? */
function divisorFollows(text, c) { let i = c.end; while (i < text.length && isSpace(text[i])) i++; return text[i] === '/' && !'/*='.includes(text[i + 1] || ' '); }
/** the character (and its index) directly before a position, spaces skipped */
function charBefore(text, pos) { let i = pos - 1; while (i >= 0 && isSpace(text[i])) i--; return i < 0 ? null : { ch: text[i], at: i }; }

/**
 * A frame offset: a parenthesised group whose LAST top-level subtraction takes off a 1 (ticks are 1-based: `(x - 1)`, `(c - (f === 1 ? 0 : 225) - 1)`) or
 * a tab boundary (225, 226, 450, 451). `(a - b)`, `(end - start)`, `(max - min)` and `(1 - t)` are not (a group with a tick NAME in it is tickShaped anyway).
 */
function hasTopSubtraction(group) {
  const s = group.startsWith('(') && group.endsWith(')') ? group.slice(1, -1) : group; let depth = 0, last = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++; else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '-' && depth === 0 && s[i + 1] !== '-' && s[i + 1] !== '=' && s[i + 1] !== '>' && s[i - 1] !== '-') {
      let k = i - 1; while (k >= 0 && isSpace(s[k])) k--;
      if (k < 0 || !/[\w$)\]]/.test(s[k])) continue;                        // a unary minus
      if (/[eE]/.test(s[k]) && /[\d.]/.test(s[k - 1] || '')) continue;      // the exponent of 1e-5
      if (/^[\d._]+(?:[eE][+-]?\d+)?$/.test((/[\w$.]+$/.exec(s.slice(0, k + 1)) || [''])[0])) continue; // `1 - t`: a number minus something is interpolation, not a frame offset
      last = i;
    }
  }
  if (last < 0) return false;
  const sub = s.slice(last + 1).trim();
  return /^1(?:\.0+)?$/.test(sub) || /(?<![\w.])(?:225|226|450|451)(?![\w.])/.test(sub);
}
const idWords = (id) => id.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase().split(/[_$]+/).filter(Boolean);
const TICK_WORDS = new Set(['tick', 'ticks', 'frame', 'frames', 'step', 'steps', 'slot', 'slots']);
/** an identifier made of the WORDS tick / frame / step / slot (currentTick, frameIdx, TICK_MS, dayStartTick): not iframe, ticket, keyframe, requestAnimationFrame */
export function isTickName(id) { const w = idWords(id); return w.some((x, i) => TICK_WORDS.has(x) && !(x.startsWith('frame') && w[i - 1] === 'animation')); }
const hasTickName = (s) => (s.match(/[A-Za-z_$][\w$]*/g) || []).some(isTickName);
/** does this operand look like a tick: a name made of tick words, or a frame offset `(x - k)` */
const tickShaped = (op) => !!op && (hasTickName(op.text) || (op.kind === 'group' && hasTopSubtraction(op.text)));
const UNIT_WORDS = new Set(['ms', 'milli', 'millis', 'millisecond', 'milliseconds', 'sec', 'secs', 'second', 'seconds', 'min', 'mins', 'minute', 'minutes', 'hour', 'hours', 'per']);
const tickStepName = (id) => { const w = idWords(id); return w.some((x) => TICK_WORDS.has(x)) && w.some((x) => UNIT_WORDS.has(x)); };
const BASE_WORDS = new Set(['base', 'start', 'first', 'origin', 'dawn', 'open', 'opening', 'begin']);
const CLOCKUNIT_WORDS = new Set(['min', 'mins', 'minute', 'minutes', 'hour', 'hours', 'clock', 'day']);
const DURATION_WORDS = new Set(['sec', 'secs', 'second', 'seconds', 'timeout', 'interval', 'delay', 'ttl', 'duration', 'expiry', 'wait', 'period', 'lifetime']);
const baseName = (id) => { const w = idWords(id); return w.some((x) => BASE_WORDS.has(x)) && w.some((x) => CLOCKUNIT_WORDS.has(x)); };

// the statement a constant sits in: bounded by ; { } and line breaks, at most `r` characters each way
function windowAround(text, i, j, r = 140) {
  const lo = Math.max(0, i - r), hi = Math.min(text.length, j + r), left = text.slice(lo, i), right = text.slice(j, hi);
  const a = Math.max(left.lastIndexOf(';'), left.lastIndexOf('{'), left.lastIndexOf('}'), left.lastIndexOf('\n')), b = right.search(/[;{}\n]/);
  return text.slice(a < 0 ? lo : lo + a + 1, b < 0 ? hi : j + b);
}
/** a statement about a timer, not a clock */
const TIMER = /timeout|cache|expir|delay|debounce|throttle|retry|retries|backoff|heartbeat|lifetime|cooldown|sleep|keepalive|deadline|cookie|max-?age|setInterval|\b(?:ttl|poll\w*|idle\w*|stale\w*|wait\w*|animat\w*|session\w*|threshold|budget|duration)\b/i;
/** a statement about the time of day */
const CLOCKY = /\b(?:hours?|minutes?|clock|midnight|noon|ampm|meridiem|getHours|getMinutes|getUTCHours|getUTCMinutes|dayStart\w*|startOfDay)\b|toLocale(?:Time|Date)?String|["'`]\s*[AaPp]\.?[Mm]\.?\s*["'`]|1863/;
const WALL_NOW = /Date\.now\s*\(|performance\.now\s*\(|new Date\(\s*\)/;
const DATE_BUILD = /Date\.UTC|new Date\s*\(|Intl\.DateTimeFormat/;
const clockContext = (w) => ((DATE_BUILD.test(w) && !WALL_NOW.test(w)) || CLOCKY.test(w)) && !TIMER.test(w);

const near = (v, x) => Math.abs(v - x) <= 1e-9 * Math.max(1, Math.abs(x));
const bareDate = (text, i) => /new Date\(\s*(?:Date\.now\(\)\s*)?\)\s*\.?\s*$/.test(text.slice(Math.max(0, i - 40), i)); // `new Date()` / `new Date(Date.now())`, with or without the dot, directly before the match

// ------------------------------------------------------------------------------------------------------------- balanced helpers for new Date(
/** balanced text of the parenthesis that opens at text[open] (at most 240 chars) */
function balanced(text, open) {
  let depth = 0;
  for (let i = open; i < Math.min(text.length, open + 240); i++) { const c = text[i]; if (c === '(') depth++; else if (c === ')' && --depth === 0) return text.slice(open + 1, i); }
  return text.slice(open + 1, open + 240);
}
/** the arguments of a Date built in code carry a tick, 1863, a 5-minute constant or the 1-minute unit; the visitor's own clock (Date.now()) does not make one */
function tickyDateArgs(args) {
  if (hasTickName(args) || /1863/.test(args)) return true;
  if (WALL_NOW.test(args)) return false;
  return /\*\s*5(?![\w.])/.test(args) || constantChains(args).some((c) => near(c.value, 300000) || near(c.value, 60000));
}

/** ampm: a marker after a } must follow a template placeholder; a marker that is one item of a list (["pl", "pm"]: file extensions, mime tables) is not a formatter */
function markerKept(t, m) {
  if (m[0][0] === '}') return /\$\{[^}]*$/.test(t.slice(Math.max(0, m.index - 120), m.index));
  const b = charBefore(t, m.index), a = /^\s*(\S)/.exec(t.slice(m.index + m[0].length, m.index + m[0].length + 20));
  return !(b && (b.ch === '[' || b.ch === ',') && a && (a[1] === ',' || a[1] === ']'));
}

// ------------------------------------------------------------------------------------------------------------- custom finders
const site = (start, end, text) => ({ index: start, end, text: text.slice(start, end) });

/** tick5: (x - k) * 5, tickName * 5, 5 * tickName, the same with 300 (seconds), * 5 / 60 (hours), and `value * 5` in a statement about the clock */
function findTickTimes5(text, cx) {
  const out = [];
  for (const c of cx.chains()) {
    const isFive = near(c.value, 5), isSeconds = near(c.value, 300) && c.atoms.length === 1, isHourFraction = c.atoms.length === 2 && near(c.value, 1 / 12) && c.atoms[0] === 5;
    if (!(isFive || isSeconds || isHourFraction)) continue;
    const left = mulLeft(text, c), right = mulRight(text, c), shaped = isSeconds ? (o) => !!o && hasTickName(o.text) : tickShaped;
    const op = shaped(left) ? left : shaped(right) ? right : null;
    if (op) { out.push(site(Math.min(op.start, c.start), Math.max(op.end, c.end), text)); continue; }
    if (!isFive) continue;
    const single = [left, right].find((o) => o && (o.kind === 'ident' || o.kind === 'call'));   // (a number times a number is one chain, never an operand)
    if (single && clockContext(windowAround(text, c.start, c.end))) out.push(site(Math.min(single.start, c.start), Math.max(single.end, c.end), text));
  }
  return out;
}
/** tick5: the 5-minute step in ms (or s) next to a tick-shaped operand or in a clock statement, the 1-minute unit next to a tick (a step constant NAMED for a tick is findTickConst's) */
function findTickMs(text, cx) {
  const out = [];
  for (const c of cx.chains()) {
    const ms5 = near(c.value, 300000), sec5 = near(c.value, 300) && c.atoms.length >= 2, ms1 = near(c.value, 60000);
    if (!(ms5 || sec5 || ms1)) continue;
    const before = charBefore(text, c.start);
    if (before && before.ch === '/' && text[before.at - 1] !== '/') continue;     // x / 60000 * ...: a quotient, not this product
    const left = mulLeft(text, c), right = mulRight(text, c), op = tickShaped(left) ? left : tickShaped(right) ? right : null;
    if (op) { out.push(site(Math.min(op.start, c.start), Math.max(op.end, c.end), text)); continue; }
    if (ms5 && clockContext(windowAround(text, c.start, c.end))) out.push(site(c.start, c.end, text));
  }
  return out;
}
const STEP_UNIT_WORDS = new Set(['ms', 'milli', 'millis', 'millisecond', 'milliseconds', 'mins', 'minute', 'minutes', 'sec', 'secs', 'second', 'seconds', 'five', 'step', 'steps', 'tick', 'ticks']);
/** tick5: a frame offset times a constant named for the step, written elsewhere: (t - 1) * FIVE_MIN, MS_PER_STEP * (tick - 1) (not `min`: minWidth is a width) */
function findOffsetTimesUnit(text) {
  const out = [], re = /\*\s*([A-Za-z_$][\w$.]*)(?![\w$.(])|([A-Za-z_$][\w$.]*)\s*\*(?![*=])/g; let m;
  while ((m = re.exec(text))) {
    const name = m[1] || m[2], words = idWords(name.split('.').pop());
    if (!words.some((w) => STEP_UNIT_WORDS.has(w))) continue;
    const op = m[1] ? operandBefore(text, m.index) : operandAfter(text, m.index + m[0].length);
    if (!op || op.kind !== 'group' || !(hasTopSubtraction(op.text) || hasTickName(op.text))) continue;   // a frame offset (x - 1), not a bare name times a name
    out.push(site(Math.min(op.start, m.index), Math.max(op.end, m.index + m[0].length), text));
  }
  return out;
}
/** tick5: a name made of tick words and a unit word assigned a step value (MINUTES_PER_TICK = 5, ticksPerHour: 12, TICK_MS = 300000) */
function findTickConst(text) {
  const out = [], re = /([A-Za-z_$][\w$]*)\s*(?::|=(?![=>]))\s*/g; let m;
  while ((m = re.exec(text))) {
    if (!tickStepName(m[1])) continue;
    const r = parseMul(text, m.index + m[0].length, 0); if (!r) continue;
    if ([5, 300, 300000, 12, 60000].some((v) => near(r.value, v))) out.push(site(m.index, r.end, text));
  }
  return out;
}
/** tick5: hours from 12 ticks per hour: `(tick - 1) / 12`, `tickName / 12`, `% 12` on them, `5 + Math.floor(t / 12)` (a base hour plus the quotient), or a quotient in a clock statement */
function findTickPer12(text) {
  const out = [], re = /([/%])\s*12(?:\.0*)?(?![\w.])/g; let m;
  while ((m = re.exec(text))) {
    if (m[1] === '/' && (text[m.index - 1] === '/' || text[m.index + 1] === '/' || text[m.index + 1] === '*')) continue;  // comments
    const op = operandBefore(text, m.index); if (!op) continue;
    const shaped = tickShaped(op);
    const baseHour = /(?:^|[^\w$.])[456]\s*\+\s*(?:Math\.(?:floor|trunc|round)\s*)?\(?\s*$/.test(text.slice(Math.max(0, op.start - 40), op.start));
    const single = m[1] === '/' && (op.kind === 'ident' || op.kind === 'call') && !/^[\d.]+$/.test(op.text); // `hours % 12` is a 12-hour formatter (the ampm detector's business), not ticks per hour
    if (shaped || baseHour || (single && clockContext(windowAround(text, op.start, m.index + m[0].length)))) out.push(site(op.start, m.index + m[0].length, text));
  }
  return out;
}
/**
 * minutes: the 4/5/6 hour base. As a product of a base hour and the unit (5 * 60, 60 * 5, 5 * 3600, 5 * 60 * 60 * 1000) it is a clock constant in any
 * spelling; as a bare 14400/18000/21600 (s) or 14400000/18000000/21600000 (ms), or a product without a base hour (18 * 1000), it needs a reason (a
 * name like `base`/`dayStart`, or a statement about the clock): 18e3 is also a random-number constant. Never in a timer statement.
 */
function findHourBase(text, cx) {
  const out = [], SEC = [14400, 18000, 21600], MS = SEC.map((x) => x * 1000), UNITS = [60, 3600, 1000, 60000, 3600000];
  for (const c of cx.chains()) {
    const baseHour = [4, 5, 6].find((h) => c.atoms.includes(h)), rest = baseHour === undefined ? [] : c.atoms.filter((a, i, all) => a !== baseHour || all.indexOf(a) !== i);
    const product = baseHour !== undefined && rest.length >= 1 && rest.every((a) => UNITS.includes(a)) && ([240, 300, 360].some((v) => near(c.value, v)) || [...SEC, ...MS].some((v) => near(c.value, v)));
    const big = [...SEC, ...MS].some((v) => near(c.value, v));
    if (!(product || big)) continue;
    const before = charBefore(text, c.start);
    if (before && before.ch === '/' && text[before.at - 1] !== '/') continue;
    if (divisorFollows(text, c)) continue;                                          // 5 * 60 / elapsed: a rate, not a base
    if (tickShaped(mulLeft(text, c)) || tickShaped(mulRight(text, c))) continue;   // seconds per tick: findTickMs reports it
    const w = windowAround(text, c.start, c.end);
    if (TIMER.test(w)) continue;
    const from = Math.max(0, c.start - 80), assigned = /([A-Za-z_$][\w$]*)\s*[:=]\s*\(*\s*$/.exec(text.slice(from, c.start)), words = assigned ? idWords(assigned[1]) : [];
    if (words.some((x) => DURATION_WORDS.has(x)) && !words.some((x) => BASE_WORDS.has(x))) continue;                      // `const secs = 5 * 60`, `timeoutMs = 18000`: a duration
    if (!product && !words.some((x) => BASE_WORDS.has(x)) && !clockContext(w)) continue;
    out.push(site(c.start, c.end, text));
  }
  return out;
}
/** minutes: a base constant named for it (BASE_MIN = 300, dayStartHour: 5) */
function findBaseConst(text) {
  const out = [], re = /([A-Za-z_$][\w$]*)\s*(?::|=(?![=>]))\s*(\d+)(?![\w.])/g; let m;
  while ((m = re.exec(text))) {
    if (!baseName(m[1])) continue;
    const n = +m[2], hours = idWords(m[1]).some((w) => w === 'hour' || w === 'hours');
    if (hours ? [4, 5, 6].includes(n) : [240, 300, 360].includes(n)) out.push(site(m.index, m.index + m[0].length, text));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------- date tables
const WEEKDAY = '(?:Mon|Tues?|Wed(?:nes)?|Thu(?:rs?)?|Fri|Sat(?:ur)?|Sun)[a-z]*\\.?,?\\s+';
const DATE_LIT = `${Q}\\s*(?:${WEEKDAY})?(?:(?<![A-Za-z])${MONTH}\\.?(?:\\s|&nbsp;|\\u00a0)*\\d{1,2}(?:st|nd|rd|th)?|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?)(?:,?\\s*1863)?\\s*${Q}`;
const DATE_ARRAY = new RegExp(`\\[\\s*${DATE_LIT}(?:\\s*,\\s*${DATE_LIT})+\\s*,?\\s*\\]`, 'gi');
const KEY = '(?:\\d{1,3}|["\'`]\\d{1,3}["\'`])';
const DATE_OBJECT = new RegExp(`\\{\\s*${KEY}\\s*:\\s*${DATE_LIT}(?:\\s*,\\s*${KEY}\\s*:\\s*${DATE_LIT})+\\s*,?\\s*\\}`, 'gi');
const DATE_TERNARY = new RegExp(`\\?\\s*${DATE_LIT}\\s*:\\s*(?:[^;{}]{0,80}?\\?\\s*)?${DATE_LIT}`, 'gi');
const DATE_CASE = new RegExp(`\\bcase\\s+\\d+\\s*:\\s*(?:return\\s*)?${DATE_LIT}`, 'gi');
/** literal date tables: an array or object of "July N" strings that is indexed (directly, or through the name it is assigned to), a ternary chain or a switch of dates -> [{ kind, index, end, text, ident }] */
export function dateTables(text) {
  const out = [];
  const indexed = (end, open) => {
    const direct = /^\s*\[\s*([^\]]{1,60})\]/.exec(text.slice(end, end + 80)); if (direct) return direct[1].trim();
    const name = /([A-Za-z_$][\w$]*)\s*=\s*$/.exec(text.slice(Math.max(0, open - 60), open)); if (!name) return null;
    const use = new RegExp(`(?<![\\w$.])${name[1].replace(/\$/g, '\\$')}\\s*\\[\\s*([^\\]]{1,60})\\]`).exec(text.slice(end, end + 6000)); return use ? use[1].trim() : null;
  };
  for (const [re, kind] of [[DATE_ARRAY, 'table'], [DATE_OBJECT, 'table']]) { re.lastIndex = 0; let m; while ((m = re.exec(text))) { const ident = indexed(m.index + m[0].length, m.index); if (ident !== null) out.push({ kind, index: m.index, end: m.index + m[0].length, text: m[0], ident }); } }
  for (const [re, kind] of [[DATE_TERNARY, 'ternary'], [DATE_CASE, 'case']]) { re.lastIndex = 0; let m; while ((m = re.exec(text))) out.push({ kind, index: m.index, end: m.index + m[0].length, text: m[0], ident: '' }); }
  return out.sort((a, b) => a.index - b.index);
}
const findDateTables = (text) => dateTables(text).map((t) => site(t.index, t.end, text));

// ------------------------------------------------------------------------------------------------------------- typed clocks in strings and markup
const CLOCK_LIT = /(?<![\w:.$-])(?:1[0-2]|0?[1-9])(?::[0-5]\d){0,2}(?:\s|&nbsp;|&#160;|&#xa0;|\u00a0)?[AaPp]\.?[Mm]\.?(?![A-Za-z0-9])/g;
const looksMarkup = (t) => /^\s*<(?:!doctype|html|head|body|\?xml|svg|!--|[a-z][\w:-]*[\s>/])/i.test(t.slice(0, 400));
function clocksIn(text, from, to, out) { CLOCK_LIT.lastIndex = 0; const s = text.slice(from, to); let m; while ((m = CLOCK_LIT.exec(s))) out.push(site(from + m.index, from + m.index + m[0].length, text)); }
/** [start, end) of every string and template chunk of a script, or null when the script does not tokenise (then the caller scans it whole) */
function stringRanges(code) {
  try {
    const out = [], T = acorn.tokTypes;
    for (const tok of acorn.tokenizer(code, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true })) if (tok.type === T.string || tok.type === T.template) out.push([tok.start, tok.end]);
    return out;
  } catch { return null; }
}
function scriptClocks(text, from, to, out) {
  const code = text.slice(from, to), ranges = stringRanges(code);
  if (!ranges) return clocksIn(text, from, to, out);
  for (const [a, b] of ranges) clocksIn(text, from + a, from + b, out);
}
const CLOCK_CACHE = new Map(); // text -> { js, html }: a file is scanned by TM-V9, TM-V17 and the inventory in one process
/** hand-typed clocks ("3:00 PM", "7:30am", "5 p.m.") in the strings of a script and in the text/attributes of markup; comments, styles and tokens inside words are not counted */
export function typedClocks(text, kind) {
  kind = kind || (looksMarkup(text) ? 'html' : 'js');
  let slot = CLOCK_CACHE.get(text); if (slot && slot[kind]) return slot[kind];
  const out = [];
  if (kind === 'js') scriptClocks(text, 0, text.length, out);
  else {
    const re = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi; let last = 0, m;
    while ((m = re.exec(text))) {
      clocksIn(text, last, m.index, out); last = m.index + m[0].length;
      if (m[2] !== undefined) {
        const bodyStart = m.index + m[0].indexOf('>') + 1, type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[1] || '');
        if (type && /json|importmap|template|text\/(?!javascript|ecmascript)/i.test(type[1])) clocksIn(text, bodyStart, bodyStart + m[2].length, out); else scriptClocks(text, bodyStart, bodyStart + m[2].length, out);
      }
    }
    clocksIn(text, last, text.length, out);
  }
  if (!slot) { if (CLOCK_CACHE.size > 6) CLOCK_CACHE.delete(CLOCK_CACHE.keys().next().value); slot = {}; CLOCK_CACHE.set(text, slot); }
  slot[kind] = out; return out;
}
/** is the typed clock hedged in the same breath ("about 3:00 PM", "~3pm")? the text before a typed clock site */
export const hedgedBefore = (text, index) => /(?:approximately|approx\.?|about|around|roughly|nearly|almost|circa|c\.|~)\s*$/i.test(text.slice(Math.max(0, index - 16), index));

// ------------------------------------------------------------------------------------------------------------- the detector table
/**
 * id: stable name; bucket: what TM-V9 counts it under; surface: the name in the formula inventory's detector table (baselined);
 * formula: true when a match is a tick -> clock implementation (an unattributed match fails the inventory); keep(text, match) filters;
 * a detector has a regexp `re` or a function `find(text, cx) -> [{ index, end, text }]` (cx.chains() is the folded constants of the text, computed once).
 */
export const DETECTORS = [
  // ---- date
  { id: 'date-template', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: new RegExp(`(?<![A-Za-z])${MONTH}\\s*\\$\\{(?:[^}]*[+-]\\s*\\d|\\s*\\d+\\s*[+-])`, 'g') },
  { id: 'date-concat', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: new RegExp(`${MONTH_LIT}\\s*[+,]\\s*(?:${OPERAND}[+-]\\s*\\d|\\(?\\s*\\d+\\s*[+-]\\s*${OPERAND})`, 'g') },
  { id: 'date-concat-call', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: new RegExp(`${MONTH_LIT}\\s*(?:\\+\\s*(?:String|Number|parseInt)\\s*\\(|\\.concat\\s*\\()\\s*[\\w$.\\[\\]]+\\s*[+-]\\s*\\d`, 'g') },
  { id: 'date-build', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /Date\.UTC\(/g },
  { id: 'date-build', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /new Date\(|Date\.parse\(/g, keep: (t, m) => tickyDateArgs(balanced(t, m.index + m[0].length - 1)) },
  { id: 'date-mutate', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /\.set(?:UTC)?(?:Hours|Minutes|Date|Time)\(/g },
  { id: 'date-lib', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /\b(?:moment|dayjs)(?:\.(?:utc|tz|unix|duration))?\(|\bTemporal\.(?:PlainDateTime|ZonedDateTime|Instant|PlainDate|PlainTime)\b|\bDateTime\.(?:fromObject|fromMillis|fromSeconds|fromISO|local|utc)\(|(?:from|require\()\s*["'](?:moment|moment-timezone|dayjs|luxon|date-fns)["']/g },
  { id: 'date-table', bucket: 'date', surface: 'literal date table', formula: false, find: findDateTables }, // a hand-typed date per Day tab: TM-V9 date and TM-V16, but not a tick -> clock formula of the inventory
  // ---- tick -> minutes / hours
  { id: 'tick-times-5', bucket: 'tick5', surface: 'tick*5', formula: true, find: findTickTimes5 },
  { id: 'tick-ms', bucket: 'tick5', surface: 'tick*5', formula: true, find: findTickMs },
  { id: 'tick-const', bucket: 'tick5', surface: 'tick*5', formula: true, find: findTickConst },
  { id: 'tick-times-unit', bucket: 'tick5', surface: 'tick*5', formula: true, find: findOffsetTimesUnit },
  { id: 'tick-per-12', bucket: 'tick5', surface: 'tick*5', formula: true, find: findTickPer12 },
  // ---- 4/5/6 hour bases
  { id: 'hour-base', bucket: 'minutes', surface: '5*60|6*60|4*60', formula: true, find: findHourBase },
  { id: 'hour-base-offset', bucket: 'minutes', surface: '5*60|6*60|4*60', formula: true, re: /\b(?:240|300|360)\s*\+\s*\(\s*[\w$.]+\s*-\s*1\b|\b(?:240|300|360)\s*\+\s*[\w$.]*[tT]ick/g },
  { id: 'hour-base-named', bucket: 'minutes', surface: '5*60|6*60|4*60', formula: true, find: findBaseConst },
  // ---- time-of-day formatters (allowed only on the visitor's own clock)
  { id: 'locale', bucket: 'locale', surface: 'toLocale*String|getHours|Intl.DateTimeFormat', formula: true, allowed: bareDate,
    re: /(?<=\.)toLocale(?:Time|Date)String|(?<=\[\s*["'`])toLocale(?:Time|Date)String(?=["'`]\s*\]\s*\()|(?<=\.)toLocaleString\(\s*[^)]*\b(?:hour|minute|second|timeStyle|dateStyle|weekday|hour12|hourCycle|month|era)\b|(?<=\.)to(?:Time|Date)String\(|\bget(?:UTC)?(?:Hours|Minutes)\(|Intl\.DateTimeFormat/g },
  // ---- typed AM/PM markers
  { id: 'ampm', bucket: 'ampm', surface: 'typed AM/PM literal', formula: true, re: new RegExp(`(?:${Q}\\s*[AaPp]\\.?[Mm]\\.?\\s*(?:${Q}|\\$\\{)|\\}\\s?[AaPp]\\.?[Mm]\\.?(?![A-Za-z0-9]))`, 'g'), keep: markerKept },
  // ---- hand-typed clocks inside strings / markup text
  { id: 'clocktext', bucket: 'clocktext', surface: 'typed clock literal', formula: false, find: (text, cx) => typedClocks(text, cx.kind) },
];

/** the same matcher for every consumer: [{ id, bucket, surface, formula, index, end, text, allowed }] for one file's text. opts.kind: 'js' | 'html' (default: sniffed) */
export function findMatches(text, only, opts = {}) {
  const out = []; let chains = null;
  const cx = { kind: opts.kind, chains: () => chains || (chains = constantChains(text)) };
  for (const d of DETECTORS) {
    if (only && !only.includes(d.bucket)) continue;
    const add = (index, end, t) => out.push({ id: d.id, bucket: d.bucket, surface: d.surface, formula: d.formula, index, end, text: t, allowed: d.allowed ? d.allowed(text, index) : false });
    if (d.find) { for (const h of d.find(text, cx)) add(h.index, h.end, h.text); continue; }
    d.re.lastIndex = 0; let m;
    while ((m = d.re.exec(text))) {
      if (m[0].length === 0) { d.re.lastIndex++; continue; }
      if (d.keep && !d.keep(text, m)) continue;
      add(m.index, m.index + m[0].length, m[0]);
    }
  }
  // two detectors of a family can land on one expression (e.g. `(t - 1) * 5 * 60000` or ` * 60000` and `5 * 60000`): one site, counted once
  out.sort((a, b) => a.index - b.index || b.end - a.end);
  const kept = [], lastEnd = {};
  for (const h of out) { if (lastEnd[h.bucket] !== undefined && h.index < lastEnd[h.bucket]) continue; kept.push(h); lastEnd[h.bucket] = h.end; }
  return kept;
}

/** the prose scan: real time / five-minute / minute-by-minute (TM-V9 "copy") */
export const COPY_RE = /real[- ]time|five[- ]minute|minute-by-minute/gi;

/** "a month name + a tab/day number" constructions that are NOT constant sums: `children:["July ",x]`, `"July " + x`, `` `July ${x}` ``, a literal date table indexed by the tab (TM-V16) */
export function monthSites(text) {
  const out = [];
  const re = [
    [new RegExp(`\\[\\s*${MONTH_LIT}\\s*,\\s*([\\w$]+)\\s*[\\],]`, 'g'), 'array'],
    [new RegExp(`${MONTH_LIT}\\s*\\+\\s*\\(?\\s*([\\w$]+)\\b(?!\\s*\\()`, 'g'), 'concat'],
    [new RegExp(`${MONTH_TAIL}\\s*\\+\\s*\\(?\\s*([\\w$]+)\\b(?!\\s*\\()`, 'g'), 'concat'],
    [new RegExp(`${MONTH}\\s*\\$\\{([^}]*)\\}`, 'g'), 'template'],
  ];
  for (const [r, kind] of re) { let m; while ((m = r.exec(text))) out.push({ kind, index: m.index, text: m[0], ident: m[1] }); }
  for (const t of dateTables(text)) out.push({ kind: t.kind === 'table' ? 'table' : t.kind, index: t.index, text: t.text, ident: t.ident });
  return out.sort((a, b) => a.index - b.index);
}

// ------------------------------------------------------------------------------------------------ the module's own text
const INLINE = P('tools', 'time', 'build', 'gtbg-time.inline.js');
/** exact inlined module text, or null when it has not been built */
export const moduleInline = () => (fs.existsSync(INLINE) ? fs.readFileSync(INLINE, 'utf8').trim() : null);
/** files with every exact copy of the module replaced by `null` plus spaces (an expression that still parses; same length, so offsets and line numbers are unchanged) */
export function exemptModule(files) {
  const inl = moduleInline();
  if (!inl) return files;
  // The module's own text is more than the inlined module: the CLOCK group appends the "how sure is the clock" tooltip function (GTBGT.u / GTBGTime.u), generated from the anchors
  // file by tools/t0/clock/uncertainty-fn.mjs. Its `Math.round(u/5)*5` rounds an UNCERTAINTY to five minutes (u is a bound in minutes, not a frame number) and was reported as
  // an unattributed tick formula in every patched tree. It is exempt by exact bytes, like the module: an edited copy of it is not (the mutation tests keep that true).
  const own = [inl];
  try { const doc = JSON.parse(fs.readFileSync(P('data-src', 'time', 'time_anchors.json'), 'utf8')); own.push(uncertaintyFnSource(doc)); } catch { /* no anchors file: only the module itself is exempt */ }
  const out = {};
  for (const [f, t] of Object.entries(files)) { let s = t; for (const x of own) if (x && s.includes(x)) s = s.split(x).join('null'.padEnd(x.length)); out[f] = s; }
  return out;
}
