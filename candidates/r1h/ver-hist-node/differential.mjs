#!/usr/bin/env node
// differential.mjs - evidence for ver-hist-node: the rewrite of tools/historian/ingest/times.mjs (no regular-expression modifier group) reads exactly what the old file read.
//
//   node differential.mjs [--old <times.mjs of the old text>] [--new <times.mjs>] [--out <result.json>] [--fuzz N] [--grammar N] [--seed S] [--sections corpus,claims,exhaustive,fuzz,grammar]
//
// Under Node 24 (or any V8 that reads modifier groups) it loads BOTH the old text of times.mjs (the git blob that held the group; default: the blob of the tree before the change, written to
// tmp/r1h-cand/ver-hist-node/times-old.mjs) and the new tools/historian/ingest/times.mjs, runs parseClock of both over the same inputs and compares the full result rows (JSON). Under Node 22 the old
// text cannot be compiled (that is the defect); the run then only digests the new module's output, and the digest must equal the one Node 24 gives for the old and the new module.
// Inputs (all fixed by seed, so every run sees the same ones):
//   corpus      the three OCR texts of Official Records vol. 27 in tmp/library/or27: every line and every 3-line window as the scan prints them, and every paragraph and every sentence (splitSentences) of the
//               text with its spaces collapsed and its lines joined (the shape of a passage of the corpus), each with and without ctx
//   claims      the 5,572 clock expressions of the committed corpus claims (historian-src/corpus/or27/time_claims.json), alone and with four contexts
//   exhaustive  the 14 frames below (a clock, a range, a spelled hour, an o'clock, in digits and words) each followed by EVERY string of up to 5 characters over the 11-character alphabet a A p P m M . , space newline x
//               (every case, stop and space variant of the meridiem and what follows it)
//   fuzz        random sequences of 2 to 22 tokens (clock words, meridiem spellings, numbers, punctuation, case-folding traps such as the long s, the dotless i and the Kelvin sign), each with and without ctx
//   grammar     random well-formed expressions of every kind the file reads (clock, range, spelled, o'clock) with the meridiem, the o'clock word and the number words in random case, stops and spaces and OCR variants
//                of "clock", set in random surroundings, each with and without ctx
// Nothing here changes a file of the tree except the --out result and the scratch copy of the old text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const OLD_BLOB = 'cdc9c0a17c0b433fec6fc50092f3368e9428c50e';       // tools/historian/ingest/times.mjs as committed before this change (git cat-file blob <id>)
const FUZZ = Number(arg('--fuzz', 400000));
const GRAMMAR = Number(arg('--grammar', 400000));
const SEED = Number(arg('--seed', 20261113));
const SECTIONS = (arg('--sections', 'corpus,claims,exhaustive,fuzz,grammar')).split(',');
const OUT = arg('--out', null);
const major = Number(process.versions.node.split('.')[0]);

const newPath = arg('--new', path.join(REPO, 'tools/historian/ingest/times.mjs'));       // another file only for the self-test that a wrong rewrite is caught
const newMod = await import(pathToFileURL(path.resolve(newPath)).href);
let oldMod = null, oldWhy = null;
const oldPath = arg('--old', path.join(REPO, 'tmp/r1h-cand/ver-hist-node/times-old.mjs'));
if (major >= 24) {
  if (!arg('--old')) { fs.mkdirSync(path.dirname(oldPath), { recursive: true }); fs.writeFileSync(oldPath, execFileSync('git', ['cat-file', 'blob', OLD_BLOB], { cwd: REPO, maxBuffer: 1 << 24 })); }
  oldMod = await import(pathToFileURL(path.resolve(oldPath)).href);
} else oldWhy = `node ${process.versions.node}: the old text holds a modifier group and cannot be compiled here (that is the defect); only the new module is digested`;

const { splitSentences } = await import(pathToFileURL(path.join(REPO, 'historian-src/core/text.js')).href);

// ---- inputs ------------------------------------------------------------------------------------------------------------------------------------------------------------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const CORPUS_FILES = ['cu31924077699761_djvu.txt', 'cu31924077700262_djvu.txt', 'cu31924077728255_djvu.txt'].map((f) => path.join(REPO, 'tmp/library/or27', f));
function* corpusInputs(info) {
  for (const f of CORPUS_FILES) {
    if (!fs.existsSync(f)) { (info.absent ||= []).push(path.relative(REPO, f)); continue; }
    const txt = fs.readFileSync(f, 'utf8'); (info.files ||= []).push({ file: path.relative(REPO, f), bytes: Buffer.byteLength(txt) });
    const lines = txt.split('\n');
    for (let i = 0; i < lines.length; i++) { yield lines[i]; if (i % 3 === 0) yield lines.slice(i, i + 3).join('\n'); }
    const flat = txt.replace(/[ \t]+/g, ' ');
    for (const raw of flat.split(/\n\s*\n/)) { const para = raw.replace(/\s*\n\s*/g, ' ').trim(); if (!para) continue; yield para; for (const x of splitSentences(para)) yield para.slice(x.s, x.e); }
  }
}
function* claimInputs(info) {
  const f = path.join(REPO, 'historian-src/corpus/or27/time_claims.json');
  if (!fs.existsSync(f)) { info.absent = [path.relative(REPO, f)]; return; }
  const t = JSON.parse(fs.readFileSync(f, 'utf8')); const i = t.fields.indexOf('text'); info.claims = t.rows.length;
  for (const r of t.rows) yield r[i];
}
const FRAMES = ['4', '10:30', 'between 3 and 5', 'from 3 to 5', 'half past four', 'a quarter before five', 'ten minutes before 4', "4 o'clock", "between 4 and 5 o'clock", 'at 12', 'twenty-five minutes past 9', 'two minutes to 6', "4 o'cleck", 'from 3 to 5 oclcck'];
const ALPHA = ['a', 'A', 'p', 'P', 'm', 'M', '.', ',', ' ', '\n', 'x'];
function* exhaustiveInputs() {
  const tails = [''];
  let layer = [''];
  for (let len = 1; len <= 5; len++) { const next = []; for (const w of layer) for (const c of ALPHA) next.push(w + c); for (const w of next) tails.push(w); layer = next; }
  for (const f of FRAMES) for (const w of tails) yield f + w;
}
const TOKENS = ['1', '2', '3', '4', '5', '9', '10', '11', '12', '13', '0', '30', '15', '45', ':', '.', ',', ';', '-', '\u2014', '/', '(', ')', ' ', ' ', ' ', '  ', '\n', '\t', '\u00a0',
  'a. m.', 'p. m.', 'a.m.', 'p.m.', 'A. M.', 'P. M.', 'A.M.', 'P.M.', 'a. m', 'p. m', 'a . m', 'a, m', 'a.m', 'AM', 'PM', 'A M', 'P M', 'am', 'pm', 'Am', 'Pm', 'aM', 'pM', 'a m', 'p m', 'a', 'p', 'm', 'M', 'm.', 'M.', 'A', 'P', 'I',
  "o'clock", 'oclock', 'o\u2019clock', "o' clock", 'O\'CLOCK', "o'cleck", "o'clcck", "o'clack", "o'  clock", 'between', 'Between', 'from', 'FROM', 'and', 'AND', 'to', 'TO', 'half past', 'Half Past', 'a quarter before', 'A QUARTER TO', 'a quarter past', 'ten minutes before', 'Five minutes past', 'twenty-five minutes after',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'Twelve', 'ELEVEN', 'fifteen', 'twenty', 'minute', 'minutes', 'quarter', 'noon', 'midnight', 'sunset', 'daylight', 'at', 'about', 'the', 'morning', 'afternoon', 'evening', 'at night', 'in the', 'July', '2d', '3d', 'Brigade', 'informed', 'glad', 'sir',
  '\u017f', '\u0131', '\u0130', '\u212a', '\u00df', '\uff41', '\uff11', 'k', 'K', 's', 'S', 'i', 'I'];
function* fuzzInputs() {
  const rnd = mulberry32(SEED);
  for (let i = 0; i < FUZZ; i++) { const n = 2 + Math.floor(rnd() * 21); let s = ''; for (let k = 0; k < n; k++) { s += TOKENS[Math.floor(rnd() * TOKENS.length)]; if (rnd() < 0.55) s += ' '; } yield s; }
}

const NUMWORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'zero'];
const MINWORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'ten', 'fifteen', 'twenty', 'twenty-five', 'twelve'];
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
const TRAPS = { s: '\u017f', k: '\u212a', i: '\u0131', I: '\u0130', S: '\u017f', K: '\u212a' };                                          // long s, Kelvin sign, dotless i, dotted capital I: they fold to ASCII letters only under the u flag
const mixCase = (rnd, str, p) => [...str].map((c) => (rnd() < p ? (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()) : rnd() < 0.015 && TRAPS[c] ? TRAPS[c] : c)).join('');
function* grammarInputs() {
  const rnd = mulberry32(SEED ^ 0x5eed);
  const P = 0.35;                                                                                                   // probability that a letter of a word of the expression is flipped to the other case
  const num = () => (rnd() < 0.05 ? pick(rnd, ['0', '13', '24', '99']) : String(1 + Math.floor(rnd() * 12)));
  const hm = () => num() + (rnd() < 0.5 ? pick(rnd, [':', '.', ' . ', ' : ', ' ', '. ']) + String(Math.floor(rnd() * 60)).padStart(2, '0') : '');
  const mer = () => mixCase(rnd, pick(rnd, ['a', 'p']), 0.5) + pick(rnd, ['', ' ', '.', '. ', ' .', ',', ', ', ' . ', '.  ', '-', '..']) + mixCase(rnd, 'm', 0.5) + pick(rnd, ['', '', '.', ',', ' ', 'x', 'a', '-', '..']);
  const ocl = () => mixCase(rnd, 'o' + pick(rnd, ['', "'", '\u2019', ' ', "' ", '-', '  ', "'  ", '.']) + 'cl' + pick(rnd, ['o', 'e', 'c', 'a', 'i']) + 'ck', P);
  const sp = () => pick(rnd, [' ', ' ', ' ', '  ', '\n', '', '\t', '\u00a0']);
  const word = (w) => mixCase(rnd, w, P);
  const meropt = () => (rnd() < 0.7 ? sp() + mer() : rnd() < 0.5 ? sp() + ocl() : '');
  const expr = () => {
    const k = rnd();
    if (k < 0.3) return hm() + (rnd() < 0.2 ? sp() + ocl() : '') + sp() + mer();
    if (k < 0.55) return word(pick(rnd, ['between', 'from'])) + sp() + hm() + meropt() + sp() + word(pick(rnd, ['and', 'to'])) + sp() + hm() + (rnd() < 0.15 ? sp() + ocl() : '') + meropt();
    if (k < 0.85) {
      const lead = pick(rnd, [() => word('half') + sp() + word('past'), () => word('a') + sp() + word('quarter') + sp() + word(pick(rnd, ['before', 'past', 'to', 'after'])), () => word(pick(rnd, MINWORDS)) + sp() + word(rnd() < 0.8 ? 'minutes' : 'minute') + sp() + word(pick(rnd, ['before', 'past', 'to', 'after']))])();
      return lead + sp() + (rnd() < 0.5 ? String(1 + Math.floor(rnd() * 13)) : word(pick(rnd, NUMWORDS))) + meropt();
    }
    return (rnd() < 0.5 ? hm() : word(pick(rnd, NUMWORDS))) + sp() + ocl() + (rnd() < 0.5 ? sp() + pick(rnd, ['in the ', 'at ', '']) + word(pick(rnd, ['morning', 'afternoon', 'evening', 'forenoon', 'night'])) : '') + (rnd() < 0.2 ? sp() + mer() : '');
  };
  for (let i = 0; i < GRAMMAR; i++) {
    let s = ''; const pre = Math.floor(rnd() * 4), post = Math.floor(rnd() * 4);
    for (let k = 0; k < pre; k++) s += pick(rnd, TOKENS) + (rnd() < 0.6 ? ' ' : '');
    s += expr(); if (rnd() < 0.15) s += sp() + expr();
    for (let k = 0; k < post; k++) s += (rnd() < 0.6 ? ' ' : '') + pick(rnd, TOKENS);
    yield s;
  }
}

// ---- the comparison -----------------------------------------------------------------------------------------------------------------------------------------------
function section(name, gen, ctxMode) {
  const t0 = Date.now(); const info = {};
  const hNew = crypto.createHash('sha256'), hOld = oldMod ? crypto.createHash('sha256') : null;
  let inputs = 0, calls = 0, rows = 0, mismatches = 0; const kinds = {}; const firstMismatches = []; let tricky = 0;
  for (const text of gen(info)) {
    inputs++;
    if (/(?<![A-Za-z])[aApP]\s?[mM](?![A-Za-z])/.test(text)) tricky++;                       // the input holds a meridiem-shaped token without a stop ("am", "AM", "A M"), the case that separates the readings
    for (const ctx of ctxMode === 'text' ? [null, text] : ctxMode === 'claims' ? [null, text, 'in the morning', 'in the afternoon', 'at night'] : [null]) {
      const opts = ctx === null ? {} : { ctx };
      const a = newMod.parseClock(text, opts); const sa = JSON.stringify(a);
      hNew.update(sa + '\n'); calls++; rows += a.length; for (const r of a) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
      if (oldMod) {
        const sb = JSON.stringify(oldMod.parseClock(text, opts)); hOld.update(sb + '\n');
        if (sa !== sb) { mismatches++; if (firstMismatches.length < 10) firstMismatches.push({ text: text.slice(0, 300), ctx: ctx !== null, old: sb.slice(0, 600), new: sa.slice(0, 600) }); }
      }
    }
  }
  const o = { name, inputs, calls, rows, kinds, bare_am_shaped_inputs: tricky, new_digest: hNew.digest('hex'), old_digest: hOld ? hOld.digest('hex') : null, compared_with_old: Boolean(oldMod), mismatches, ms: Date.now() - t0, ...info };
  if (firstMismatches.length) o.first_mismatches = firstMismatches;
  console.log(`${name}: ${inputs} inputs, ${calls} parseClock calls, ${rows} readings, ${oldMod ? mismatches + ' mismatches against the old text' : 'new module only'}; new ${o.new_digest.slice(0, 16)}${o.old_digest ? ' old ' + o.old_digest.slice(0, 16) : ''} (${o.ms} ms)`);
  return o;
}

const newBlob = execFileSync('git', ['hash-object', path.resolve(newPath)], { cwd: REPO }).toString().trim();
const result = { node: process.version, date: new Date().toISOString(), old_blob: OLD_BLOB, new_file: path.relative(REPO, path.resolve(newPath)), new_blob: newBlob, old_text_loaded: Boolean(oldMod), old_note: oldWhy, seed: SEED, fuzz: FUZZ, grammar: GRAMMAR, sections: {} };
if (SECTIONS.includes('corpus')) result.sections.corpus = section('corpus', corpusInputs, 'text');
if (SECTIONS.includes('claims')) result.sections.claims = section('claims', claimInputs, 'claims');
if (SECTIONS.includes('exhaustive')) result.sections.exhaustive = section('exhaustive', exhaustiveInputs, 'none');
if (SECTIONS.includes('fuzz')) result.sections.fuzz = section('fuzz', fuzzInputs, 'text');
if (SECTIONS.includes('grammar')) result.sections.grammar = section('grammar', grammarInputs, 'text');
const mism = Object.values(result.sections).reduce((n, s) => n + s.mismatches, 0);
const digestsAgree = Object.values(result.sections).every((s) => !s.old_digest || s.old_digest === s.new_digest);
result.total_mismatches = mism; result.old_equals_new = oldMod ? mism === 0 && digestsAgree : null;
if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n'); }
console.log(oldMod ? (result.old_equals_new ? 'IDENTICAL: the old and the new times.mjs give the same readings on every input' : `DIFFERENT: ${mism} mismatches`) : 'digests written (compare with the Node 24 run)');
process.exit(oldMod && !result.old_equals_new ? 1 : 0);
