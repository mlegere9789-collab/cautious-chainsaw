// Shared "tick -> clock" detectors for TM-V9 / TM-V16 / TM-V17 (tools/time/rules.mjs) and the formula inventory (tools/time/surfaces.mjs).
// CANDIDATE tooling (WP-TIME-20). One definition, two consumers, so a variant one of them misses cannot slip through the other.
//
// They look for the SHAPES of the legacy formulas, not their exact spelling (the bundle is minified, so names carry no meaning there):
//   date     a month name plus a constant: template `July ${l+2}`, concatenation `"July " + (tab + 2)`, array `["July ", tab + 2]`, a Date built in
//            code (Date.UTC(..), new Date(1863, ..), a Date whose arguments carry a tick, 1863 or a 5-minute constant) and Date setters
//   tick5    tick -> minutes arithmetic: (x - k) * 5, tick * 5, a 5-minute constant in ms (300000, 3e5, 5 * 60000, 5 * 60 * 1000, * 60000) and
//            tick -> hour arithmetic with 12 ticks per hour ((tick - 1) / 12, Math.floor(t / 12))
//   minutes  the 4/5/6 hour bases: 5 * 60, 60 * 5, 5 * 3600(000), 18000(000), and 300 + (tick - 1)
//   locale   time-of-day formatters (toLocaleTimeString, toLocaleDateString, getHours, getMinutes, Intl.DateTimeFormat); allowed ONLY on a bare
//            `new Date()` (the visitor's own clock), wherever it sits: an allow-list by file name hid `new Date(tick..).toLocaleTimeString()`
//   ampm     a typed AM/PM marker literal, with or without a space or dots: "PM", " PM", 'a.m.'
//   copy     banned clock-implying words (real time, five-minute, minute-by-minute)
//
// The module's own inlined text (tools/time/build/gtbg-time.inline.js, exact bytes) is exempt: the clock has to be formatted somewhere.
// An edited copy of it is NOT exempt, so tampering inside the module is seen as what it is.
import fs from 'node:fs';
import { P } from './lib.mjs';

const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)';
const Q = '["\'`]';                                  // any JS string quote
const MONTH_LIT = `${Q}[^"'\`\\w]*${MONTH}\\.?\\s*${Q}`; // the literal "July " (a month name and nothing else but spacing/punctuation)
const OPERAND = '\\(?\\s*[\\w$.\\[\\]]+(?:\\s*\\([^()]*\\))?\\s*';
const TICKY = /\btick\w*|\bframe\w*|1863|\b300000\b|\b3e5\b|\b60000\b|\b6e4\b|\*\s*5\b/i;
const NOT_WORD = '(?![\\w.])';

/** balanced text of the parenthesis that opens at text[open] (at most 240 chars) */
function balanced(text, open) {
  let depth = 0;
  for (let i = open; i < Math.min(text.length, open + 240); i++) { const c = text[i]; if (c === '(') depth++; else if (c === ')' && --depth === 0) return text.slice(open + 1, i); }
  return text.slice(open + 1, open + 240);
}
const bareDate = (text, i) => /new Date\(\)\s*\.\s*$/.test(text.slice(Math.max(0, i - 30), i)); // `new Date().` directly before the match

/**
 * id: stable name; bucket: what TM-V9 counts it under; surface: the name in the formula inventory's detector table (baselined);
 * formula: true when a match is a tick -> clock implementation (an unattributed match fails the inventory); keep(text, match) filters.
 */
export const DETECTORS = [
  // ---- date
  { id: 'date-template', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: new RegExp(`${MONTH}\\s*\\$\\{[^}]*[+-]\\s*\\d`, 'g') },
  { id: 'date-concat', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: new RegExp(`${MONTH_LIT}\\s*[+,]\\s*${OPERAND}[+-]\\s*\\d`, 'g') },
  { id: 'date-build', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /Date\.UTC\(/g },
  { id: 'date-build', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /new Date\(/g, keep: (t, m) => TICKY.test(balanced(t, m.index + m[0].length - 1)) },
  { id: 'date-mutate', bucket: 'date', surface: 'July ${..+-N}', formula: true, re: /\.set(?:UTC)?(?:Hours|Minutes|Date|Time)\(/g },
  // ---- tick -> minutes / hours
  { id: 'tick-times-5', bucket: 'tick5', surface: 'tick*5', formula: true, re: /\)\s*\*\s*5(?![\w.])/g },
  { id: 'tick-times-5-named', bucket: 'tick5', surface: 'tick*5', formula: true, re: /\b\w*(?:tick|frame|step)\w*\s*\*\s*5(?![\w.])|(?<![\w.])5\s*\*\s*\(?\s*\w*(?:tick|frame|step)\w*/gi },
  { id: 'tick-ms', bucket: 'tick5', surface: 'tick*5', formula: true, re: /\b300000\b|\b3e5\b|\*\s*(?:60000|6e4)\b|\b(?:60000|6e4)\s*\*|(?<![\w.])5\s*\*\s*60\s*\*\s*1000\b/g },
  { id: 'tick-per-12', bucket: 'tick5', surface: 'tick*5', formula: true, re: new RegExp(`\\(\\s*[\\w$.]+\\s*-\\s*1\\s*\\)\\s*/\\s*12${NOT_WORD}|\\b\\w*(?:tick|frame)\\w*\\s*/\\s*12${NOT_WORD}|Math\\.floor\\(\\s*[\\w$.]+\\s*/\\s*12\\s*\\)`, 'gi') },
  // ---- 4/5/6 hour bases
  { id: 'hour-base', bucket: 'minutes', surface: '5*60|6*60|4*60', formula: true, re: /\b[456]\s*\*\s*60\b|(?<![\w.])60\s*\*\s*[456]\b|\b[456]\s*\*\s*3600(?:000|e3)?\b|\b(?:14400|18000|21600)(?:000)?\b/g },
  { id: 'hour-base-offset', bucket: 'minutes', surface: '5*60|6*60|4*60', formula: true, re: /\b(?:240|300|360)\s*\+\s*\(\s*[\w$.]+\s*-\s*1\b|\b(?:240|300|360)\s*\+\s*[\w$.]*[tT]ick/g },
  // ---- time-of-day formatters (allowed only on a bare `new Date()`)
  { id: 'locale', bucket: 'locale', surface: 'toLocale*String|getHours|Intl.DateTimeFormat', formula: true, re: /toLocale(?:Time|Date)String|\bget(?:UTC)?(?:Hours|Minutes)\(|Intl\.DateTimeFormat/g, allowed: bareDate },
  // ---- typed AM/PM markers
  { id: 'ampm', bucket: 'ampm', surface: 'typed AM/PM literal', formula: true, re: new RegExp(`${Q}\\s*[AaPp]\\.?[Mm]\\.?\\s*${Q}`, 'g') },
];

/** the same matcher for every consumer: [{ id, bucket, surface, formula, index, end, text, allowed }] for one file's text */
export function findMatches(text, only) {
  const out = [];
  for (const d of DETECTORS) {
    if (only && !only.includes(d.bucket)) continue;
    d.re.lastIndex = 0; let m;
    while ((m = d.re.exec(text))) {
      if (m[0].length === 0) { d.re.lastIndex++; continue; }
      if (d.keep && !d.keep(text, m)) continue;
      out.push({ id: d.id, bucket: d.bucket, surface: d.surface, formula: d.formula, index: m.index, end: m.index + m[0].length, text: m[0], allowed: d.allowed ? d.allowed(text, m.index) : false });
    }
  }
  // two detectors of a family can land on one spot (e.g. ` * 60000` and `5 * 60000`): one site, counted once
  const seen = new Set();
  return out.filter((h) => { const k = h.bucket + '@' + h.index; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.index - b.index);
}

/** the prose scan: real time / five-minute / minute-by-minute (TM-V9 "copy") */
export const COPY_RE = /real[- ]time|five[- ]minute|minute-by-minute/gi;

/** "a month name + a tab/day number" constructions that are NOT constant sums: `children:["July ",x]`, `"July " + x`, `` `July ${x}` `` (TM-V16) */
export function monthSites(text) {
  const out = [];
  const re = [
    [new RegExp(`\\[\\s*${MONTH_LIT}\\s*,\\s*([\\w$]+)\\s*[\\],]`, 'g'), 'array'],
    [new RegExp(`${MONTH_LIT}\\s*\\+\\s*\\(?\\s*([\\w$]+)\\b(?!\\s*\\()`, 'g'), 'concat'],
    [new RegExp(`${MONTH}\\s*\\$\\{([^}]*)\\}`, 'g'), 'template'],
  ];
  for (const [r, kind] of re) { let m; while ((m = r.exec(text))) out.push({ kind, index: m.index, text: m[0], ident: m[1] }); }
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
  const out = {};
  for (const [f, t] of Object.entries(files)) out[f] = t.includes(inl) ? t.split(inl).join('null'.padEnd(inl.length)) : t;
  return out;
}
