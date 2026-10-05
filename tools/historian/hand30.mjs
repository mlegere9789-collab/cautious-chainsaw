#!/usr/bin/env node
// hand30.mjs - run the 30 hand questions (tests/historian/or27-hand30.json) against a corpus KB and print what passes.
//   node tools/historian/hand30.mjs [--hx historian-src/dist/hx-or27] [--core historian-src/core] [--claims historian-src/corpus/or27/time_claims.json] [--verbose]
// --core names the directory of the engine to load (kb.js, engine.js ...): a copy of an earlier commit's core against the KB built at that commit gives the "before" figure.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadHand30, runHand, claimsIndex } from '../../tests/historian/lib/or27-hand30.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const hx = path.resolve(root, arg('hx', 'historian-src/dist/hx-or27')), core = path.resolve(root, arg('core', 'historian-src/core'));
const { openKB, nodeFetcher } = await import(pathToFileURL(path.join(core, 'kb.js')).href);
const { createEngine } = await import(pathToFileURL(path.join(core, 'engine.js')).href);
const kb = await openKB(await nodeFetcher(hx), { cache: 512 }); const eng = createEngine(kb);
const rows = await runHand((q) => eng.ask(q), loadHand30().items, claimsIndex(path.resolve(root, arg('claims', 'historian-src/corpus/or27/time_claims.json'))));
for (const r of rows) if (args.includes('--verbose') || !r.pass) console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.id} [${r.class}] ${r.q}\n       ${r.pass ? `${r.mode}, ${r.quotes} quote(s)` : r.reasons.join(' | ')}`);
const by = {}; for (const r of rows) { const k = (by[r.class] ||= { n: 0, pass: 0 }); k.n++; if (r.pass) k.pass++; }
console.log(`\nhand30: ${rows.filter((r) => r.pass).length}/${rows.length} pass; ` + Object.entries(by).map(([k, v]) => `${k} ${v.pass}/${v.n}`).join(', '));
process.exit(0);
