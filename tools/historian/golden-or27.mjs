#!/usr/bin/env node
// golden-or27.mjs - run the Official Records golden set against a corpus KB and print the result.
//   node tools/historian/golden-or27.mjs [--hx historian-src/dist/hx-or27] [--set A|H] [--json out.json] [--verbose]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openKB, nodeFetcher } from '../../historian-src/core/kb.js';
import { createEngine } from '../../historian-src/core/engine.js';
import { loadGolden, loadCorpusPassages, runGolden, summarize } from '../../tests/historian/lib/or27-golden.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const hx = path.resolve(root, arg('hx', 'historian-src/dist/hx-or27'));
const set = arg('set', 'A'); const g = loadGolden(set);
const kb = await openKB(await nodeFetcher(hx), { cache: 512 });
const eng = createEngine(kb);
const C = loadCorpusPassages(hx);
const rows = await runGolden(eng, g.items, C, { onItem: (r) => { if (args.includes('--verbose') || !r.pass) console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.id} [${r.type}] ${r.q}\n       ${r.pass ? r.docs.join(' ') : r.reasons.join(' | ')} (${r.ms} ms, ${r.mode}/${r.intent})`); } });
const s = summarize(rows);
console.log(`\nOR golden ${set}: ${s.pass}/${s.n} pass (${(100 * s.pass / s.n).toFixed(1)}%) ` + Object.entries(s.by).map(([k, v]) => `${k} ${v.pass}/${v.n}`).join(', '));
const ms = rows.map((r) => r.ms).sort((a, b) => a - b); const q = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
console.log(`latency in Node over the KB on disk: p50 ${q(0.5)} ms, p95 ${q(0.95)} ms, max ${ms[ms.length - 1]} ms (first question includes opening the corpus)`);
if (arg('json')) fs.writeFileSync(path.resolve(root, arg('json')), JSON.stringify({ set, hx: path.relative(root, hx), summary: s, rows }, null, 1));
process.exit(0);
