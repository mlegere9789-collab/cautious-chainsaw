#!/usr/bin/env node
// gen-pins.mjs - writes the table of pinned readings of tests/historian/times-node22.test.mjs from the OLD text of tools/historian/ingest/times.mjs (the one with the modifier group), so the pins are what
// the file read before the change, not what the new text happens to read.
//
//   node gen-pins.mjs <out.js>         needs a Node that reads modifier groups (24); the old text is the git blob below
//
// Inputs: hand-written phrasings (every meridiem spelling in one frame, every kind the file reads, the OCR's own damage) and, when tmp/library/or27 is present, real sentences of the Official Records
// (vol. 27 OCR, public domain), one or two per combination of kinds, picked in file order so the choice is repeatable. Each pin is [input, ctx, rows]: ctx is null (parseClock(input)), true (parseClock(input, { ctx: input }), the way the corpus reads a sentence) or a string; a row is the fields that carry the reading.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OLD_BLOB = 'cdc9c0a17c0b433fec6fc50092f3368e9428c50e';
if (Number(process.versions.node.split('.')[0]) < 24) { console.error('gen-pins: run it under Node 24 (the old text needs modifier groups)'); process.exit(2); }
const out = process.argv[2]; if (!out) { console.error('usage: node gen-pins.mjs <out.js>'); process.exit(64); }
const tmp = path.join(REPO, 'tmp/r1h-cand/ver-hist-node'); fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, 'times-old.mjs'), execFileSync('git', ['cat-file', 'blob', OLD_BLOB], { cwd: REPO, maxBuffer: 1 << 24 }));
const old = await import(pathToFileURL(path.join(tmp, 'times-old.mjs')).href);
const { splitSentences } = await import(pathToFileURL(path.join(REPO, 'historian-src/core/text.js')).href);

// ---- hand-written inputs -----------------------------------------------------------------------------------------------------------------------------------------
const frame = (m) => `Left camp at 4 ${m} and crossed the river.`;
const READ = ['a. m.', 'a.m.', 'a. m', 'a.m', 'A. M.', 'A.M.', 'A. M', 'P. M.', 'P.M.', 'p. m.', 'p.m', 'P. m.', 'a. M.', 'a,m.', 'a, m', 'a .m.', 'a . m.', 'AM', 'PM', 'A M', 'P M', 'A.M', 'AM.', 'PM,', 'AM and'];
const NOT = ['am', 'pm', 'Am', 'Pm', 'aM', 'pM', 'a m', 'p m', 'A m', 'a  m', 'A  M', 'a..m', 'A-M', 'AMs', 'AMERICAN', 'a. -m.', 'p. im'];
const hand = [];
for (const m of [...READ, ...NOT]) hand.push([frame(m), null]);
for (const t of ['10 a. m.', '10.30 a. m.', '3:15 p.m.', '4.30 p. m.', '4 : 30 P. M.', '12 p. m.', '12 a. m.', '12 P. M.', '1 a. m.', '11.59 p. m.', '13 p. m.', '0 a. m.', '9.75 a. m.', '10 AM', '10.30 PM', '12 m.', '12 M.', 'twelve m.', '12 m. and', '12 meridian'])
  hand.push([`The order came at ${t} to advance.`, null]);
for (const w of ['about', 'near', 'nearly', 'before', 'by', 'after', 'until', 'till', 'at', 'exactly', 'shortly after', 'not later than', 'probably']) hand.push([`It was ${w} 4 p. m. when the firing began.`, null]);
for (const t of ['between 4 and 5 p. m.', 'between 4 and 5 P. M.', 'between 4 and 5 PM', 'between 4 and 5 pm', 'between 4 AM and 5 AM', 'between 11 a. m. and 1 p. m.', 'from 10.30 a. m. to 1 p. m.', 'from 3 to 5 o\'clock p. m.', 'from 3 to 5 o\'clock, p. m.',
  'between 2 and 4', 'between 3 o\'clock and 5 o\'clock p. m.', 'from 9 p. m. to 4 a. m.', 'between 12 and 1 P. M.', 'FROM 3 TO 5 P.M.', 'between 4 and 5 a. m. and 6 p. m.']) hand.push([`The enemy attacked ${t} on the left.`, null]);
for (const t of ['half past four P. M.', 'half past four', 'half past 4 pm', 'Half Past Four A.M.', 'a quarter before five AM', 'a quarter to five a. m.', 'a quarter past five p. m.', 'A QUARTER AFTER SIX P. M.', 'ten minutes before four p. m.', 'twenty minutes past 9 A. M.',
  'twenty-five minutes before 4 p. m.', 'five minutes to six PM', 'one minute past twelve p. m.', 'fifteen minutes past 7 o\'clock', 'half past four o\'clock', 'half past four and the guns']) hand.push([`We halted at ${t}, and the guns opened.`, null]);
for (const t of ['at 10 o\'clock', 'at 10 O\'CLOCK', 'at ten o\'clock', 'at five o\'clock in the afternoon', 'at 5 o\'clock in the morning', 'at 3 o\'clock p. m.', 'at 3 o\'clock, p. m.', 'at 3 o\'clock PM', 'at 8 o\'clock at night', 'at 3 oclock', 'at 3 o\'cleck',
  'at 3 o\'clcck', 'at 3 o\'clack', 'at 3 o\u2019clock', 'at 3 o\' clock', 'at 3 o\'  clock', 'at 10.30 o\'clock', 'at 3 in the afternoon', 'about 8 in the morning', 'at 4 in the evening']) hand.push([`The brigade moved ${t} on the Taneytown road.`, null]);
for (const t of ['noon', 'at midnight', 'at daylight', 'at sunrise', 'near sunset', 'at dusk', 'at nightfall', 'at daybreak', 'at sun-up', 'about mid-day', 'at break of day']) hand.push([`The attack was ordered ${t} and failed.`, null]);
const ctxs = ['in the afternoon', 'in the morning', 'at night', 'p. m.', 'a. m.', 'evening'];
for (const c of ctxs) { hand.push(['At 4 o\'clock we advanced.', c]); hand.push(['A quarter before five we advanced.', c]); hand.push(['Between 2 and 4 the enemy left.', c]); }
// the OCR's own damage and the false clocks the case-sensitive branch exists for
for (const t of ['as 1 am informed by him, made by Maj. Gen. A. A. Humphreys', '1 am, sir, very respectfully, your obedient servant', 'and 1 am glad to report that no individual cases', 'I am 5 feet tall and 1 pm informed',
  'June 6, 1863 \u2014 10 a.', 'at 10.15 p. im', 'at 11 a. -m.', 'June 10. 1863\u201410 a. m.', 'on the 4 Am Brigade', 'The 1 PM unit and the 10 AM report', 'No. 4 AM', '5 pm', '5 PM', '5 Pm', '5 p.m', '5 P.M', '2d Brigade, 3 p. m. to 4 p. m.',
  '4 p. m.4 p. m.', '4 p. m. 5 a. m. 6 AM 7 am', 'a. m. p. m. 4 5 a m', '', '   ', 'no clock here', '123456 a. m.', '4.30.30 p. m.', '4:3 p. m.', '(4 p. m.)', '"4 p. m."', '4\np. m.', '4\n a. m.', '4\u00a0p.\u00a0m.']) hand.push([t, null]);

// ---- real sentences ----------------------------------------------------------------------------------------------------------------------------------------------
const files = ['cu31924077699761_djvu.txt', 'cu31924077700262_djvu.txt', 'cu31924077728255_djvu.txt'].map((f) => path.join(REPO, 'tmp/library/or27', f));
const real = []; const seen = new Map(); const WANT = Number(process.env.PIN_REAL || 70);
const feature = (rows) => rows.map((r) => r.kind + (r.min === null ? '?' : '') + (r.mod !== 'at' && r.mod ? ':' + r.mod : '')).join(' ');
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const flat = fs.readFileSync(f, 'utf8').replace(/[ \t]+/g, ' ');
  for (const raw of flat.split(/\n\s*\n/)) {
    const para = raw.replace(/\s*\n\s*/g, ' ').trim(); if (!para) continue;
    for (const x of splitSentences(para)) {
      const s = para.slice(x.s, x.e); if (s.length < 30 || s.length > 190 || /[^\x20-\x7e\u2014\u2019\u201c\u201d]/.test(s)) continue;
      const rows = old.parseClock(s, { ctx: s }); if (!rows.length) continue;
      const key = feature(rows); const n = seen.get(key) || 0;
      if (n >= (rows.length === 1 ? 2 : 1) || real.length >= WANT) continue;
      seen.set(key, n + 1); real.push([s, s]);
    }
  }
}
// the false clock "1 am" (the OCR's "I am"): the first few sentences of the volumes that hold it
for (const f of files) {
  if (!fs.existsSync(f)) continue; let k = 0;
  const flat = fs.readFileSync(f, 'utf8').replace(/[ \t]+/g, ' ');
  for (const raw of flat.split(/\n\s*\n/)) { const para = raw.replace(/\s*\n\s*/g, ' ').trim(); for (const x of splitSentences(para)) { const s = para.slice(x.s, x.e); if (/(?<![\w.])1 am\b/.test(s) && s.length < 200 && k < 3) { real.push([s, s]); k++; } } }
}

// ---- the table ---------------------------------------------------------------------------------------------------------------------------------------------------
// the table is ASCII only: a no-break space or a curly quote in a JS string is invisible or easily mistaken for another character
const asciiJson = (v) => JSON.stringify(v).replace(/[^\x20-\x7e]/g, (c) => String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const proj = (r) => { const o = { s: r.s, e: r.e, kind: r.kind, min: r.min, ampm: r.ampm ?? null, tol: r.tol, mod: r.mod }; if (r.cand) o.cand = r.cand; if (r.from !== undefined) { o.from = r.from; o.to = r.to; } if (r.word) o.word = r.word; return o; };
const lines = []; let readings = 0; const kinds = {};
const emit = (input, ctx) => {
  const rows = old.parseClock(input, ctx === null ? {} : { ctx }); readings += rows.length; for (const r of rows) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  for (const r of rows) if (input.slice(r.s, r.e) !== r.text) throw new Error('span/text disagree: ' + JSON.stringify(input));
  lines.push(`  [${asciiJson(input)}, ${ctx === null ? 'null' : ctx === input ? 'true' : asciiJson(ctx)}, [${rows.map((r) => asciiJson(proj(r))).join(', ')}]],`);
};
const all = [...hand, ...real]; const dup = new Set();
for (const [i, c] of all) { const k = JSON.stringify([i, c]); if (dup.has(k)) continue; dup.add(k); emit(i, c); }
fs.writeFileSync(out, `// ${lines.length} inputs, ${readings} readings (${Object.entries(kinds).map(([k, n]) => k + ' ' + n).join(', ')}), read by the text of times.mjs at git blob ${OLD_BLOB} under Node ${process.version}\nconst PINS = [\n${lines.join('\n')}\n];\n`);
console.log(`${lines.length} pins (${hand.length} hand-written, ${real.length} real sentences), ${readings} readings`, kinds);
