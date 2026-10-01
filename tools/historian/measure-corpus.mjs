#!/usr/bin/env node
// measure-corpus.mjs - what the Official Records corpus costs: files and bytes of the build, the bytes of first paint with and without the corpus, and per question the files fetched, their bytes (raw and
// brotli), the CPU time in Node and a modelled mobile latency, over the golden questions of the corpus (tests/historian/fixtures/golden-or27*.json) and the site's own battery.
//   node tools/historian/measure-corpus.mjs [--hx historian-src/dist/hx-or27] [--base historian-src/dist/hx] [--out historian-src/corpus/or27/measurements.json]
// The latency model is arithmetic over measured bytes, not a measurement on a phone: a question is four dependent waves (the corpus file list, the postings, the entity postings, the text shards), each one round trip
// of 150 ms, plus the brotli bytes at 1.6 Mbit/s (the Lighthouse "slow 4G" profile of the site's own performance gates), plus the measured Node time multiplied by 4 (a mid-range phone's CPU, chapter 14 S-3 asks for a real device).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { openKB } from '../../historian-src/core/kb.js';
import { createEngine } from '../../historian-src/core/engine.js';
import { loadGolden } from '../../tests/historian/lib/or27-golden.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const hx = path.resolve(root, arg('hx', 'historian-src/dist/hx-or27')), base = path.resolve(root, arg('base', 'historian-src/dist/hx'));
const br = (buf) => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const rd = (dir, rel) => fs.readFileSync(path.join(dir, rel));
const man = JSON.parse(rd(hx, 'manifest.json')), manBase = JSON.parse(rd(base, 'manifest.json'));

// ---- the build: files and bytes ------------------------------------------------------------------------------------------------------------------------------
const c = man.corpora.or27; const lst = JSON.parse(rd(hx, c.files.path));
const sum = (a) => a.reduce((x, f) => x + f.bytes, 0);
const brSum = (a) => a.reduce((x, f) => x + br(rd(hx, f.path)), 0);
const build = {
  passages: c.count, words: c.words, files: lst.index.files.length + lst.entpost.files.length + lst.text.files.length, vocabulary_terms: c.lexicon.terms,
  postings: { files: lst.index.files.length, raw: sum(lst.index.files), brotli: brSum(lst.index.files), largest_file: Math.max(...lst.index.files.map((f) => f.bytes)) },
  entity_postings: { files: lst.entpost.files.length, raw: sum(lst.entpost.files), brotli: brSum(lst.entpost.files) },
  text: { files: lst.text.files.length, raw: sum(lst.text.files), brotli: brSum(lst.text.files), largest_file: Math.max(...lst.text.files.map((f) => f.bytes)), passages_per_file: c.text.per_shard },
  file_list: { path: c.files.path, raw: c.files.bytes, brotli: br(rd(hx, c.files.path)) },
};
build.total = { raw: build.postings.raw + build.entity_postings.raw + build.text.raw + build.file_list.raw, brotli: build.postings.brotli + build.entity_postings.brotli + build.text.brotli + build.file_list.brotli };

// ---- first paint: what the page fetches before the first question (manifest + T1) with and without the corpus --------------------------------------------------------
const t1 = ['entity', 'entix', 'facts', 'lexicon'];
const firstPaint = (m, dir) => ({ manifest: { raw: rd(dir, 'manifest.json').length, brotli: br(rd(dir, 'manifest.json')) }, t1: t1.map((k) => ({ file: m.tiers[k].path, raw: rd(dir, m.tiers[k].path).length, brotli: br(rd(dir, m.tiers[k].path)) })) });
const fpBase = firstPaint(manBase, base), fpOr = firstPaint(man, hx);
const tot = (fp) => ({ raw: fp.manifest.raw + fp.t1.reduce((a, x) => a + x.raw, 0), brotli: fp.manifest.brotli + fp.t1.reduce((a, x) => a + x.brotli, 0) });
const firstPaintOut = { without_corpus: { ...fpBase, total: tot(fpBase) }, with_corpus: { ...fpOr, total: tot(fpOr) }, t1_files_identical: t1.every((k) => manBase.tiers[k].path === man.tiers[k].path), delta: { raw: tot(fpOr).raw - tot(fpBase).raw, brotli: tot(fpOr).brotli - tot(fpBase).brotli } };

// ---- per question ---------------------------------------------------------------------------------------------------------------------------------------------------
const memoT1 = new Map();
const countingFetcher = () => { const st = { files: 0, raw: 0, brotli: 0, paths: [] }; const fn = async (rel) => { const isT1 = rel === 'manifest.json' || /^f\/(entity|entix|facts|lexicon)\./.test(rel); if (isT1) { if (!memoT1.has(rel)) memoT1.set(rel, JSON.parse(rd(hx, rel))); return memoT1.get(rel); } const buf = rd(hx, rel); st.files++; st.raw += buf.length; st.brotli += br(buf); st.paths.push(rel); return JSON.parse(buf); }; return { fn, st }; };
const questions = [];
for (const set of ['A', 'H']) for (const it of loadGolden(set).items) questions.push({ set: 'OR-' + set, id: it.id, q: it.q });
for (const q of ['20th Maine', 'who commanded the Iron Brigade?', 'what happened at the Peach Orchard', 'how many casualties did the 1st Minnesota have', 'what time did Pickett\'s Charge begin', 'where was the 24th Michigan on July 1', 'who commanded the Union Eleventh Corps']) questions.push({ set: 'site', id: q, q });
const rows = [];
for (const it of questions) {
  const { fn, st } = countingFetcher();
  const t0 = performance.now(); const kb = await openKB(fn, { manifest: man, cache: 512 }); const tOpen = performance.now() - t0;
  const eng = createEngine(kb); const t1_ = performance.now(); await eng.ask(it.q); const ms = performance.now() - t1_;
  const waves = st.files ? (st.paths.some((p) => /\/files\./.test(p)) ? 4 : 3) : 0;
  rows.push({ set: it.set, id: it.id, files: st.files, raw: st.raw, brotli: st.brotli, ms: Math.round(ms * 10) / 10, modelled_phone_ms: Math.round(waves * 150 + st.brotli * 8 / 1.6e6 * 1000 + ms * 4) });
}
const stat = (a) => { const s = a.slice().sort((x, y) => x - y); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return { p50: q(0.5), p95: q(0.95), max: s[s.length - 1] }; };
const group = (f) => { const r = rows.filter(f); return { n: r.length, files: stat(r.map((x) => x.files)), raw_bytes: stat(r.map((x) => x.raw)), brotli_bytes: stat(r.map((x) => x.brotli)), node_ms: stat(r.map((x) => x.ms)), modelled_phone_ms: stat(r.map((x) => x.modelled_phone_ms)) }; };
const out = { measured_at: new Date().toISOString().slice(0, 10), node: process.version, hx: path.relative(root, hx), build, first_paint: firstPaintOut, per_question: { corpus_questions: group((r) => r.set !== 'site'), site_questions: group((r) => r.set === 'site'), all: group(() => true) }, model: 'four dependent waves x 150 ms + brotli bytes at 1.6 Mbit/s + 4 x Node ms; arithmetic over measured bytes, not a phone measurement' };
console.log(JSON.stringify(out, null, 1));
if (arg('out')) fs.writeFileSync(path.resolve(root, arg('out')), JSON.stringify(out, null, 1) + '\n');
