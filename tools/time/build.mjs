#!/usr/bin/env node
// Builds every artifact derived from data-src/time/time_anchors.json (CANDIDATE; nothing ships without owner/historian sign-off):
//   src/lib/time/anchors.generated.js         the FULL anchors document (25 KB with labels, facts, evidence): tooling and tests only
//   src/lib/time/anchors.runtime.generated.js the runtime subset (about 4 KB) the ES-module route bundles as its default model
//   tests/time/golden/tick-clock.csv          675-row golden table (TM-V11): any anchor edit is a reviewable diff
//   tools/time/build/ticks.json               675 rows for Node consumers (Historian index build, static exports)
//   tools/time/build/gtbg-time.iife.js        classic-script global GTBGTime for static pages   (window.GTBGTime)
//   tools/time/build/gtbg-time.inline.js      expression `(function(){...})()` inlined by tools/t0/patches-next/CLOCK.json into the bundle
//   tools/time/build/size.json                raw / gzip / brotli sizes of the inline build (TX-12 budget: 2.5 KB brotli) and of the ES route's data
//
//   node tools/time/build.mjs          write everything
//   node tools/time/build.mjs --check  exit 1 when a generated file is stale (CI, TM-V11)
//
// The inline build is pruned and minified by tools/time/inline.mjs (terser, pinned exact in package.json).
import fs from 'node:fs';
import { P, readJson, writeIfChanged, parseArgs } from './lib.mjs';
import { runtimeDoc } from './slim.mjs';
import { buildInline, sizeOf } from './inline.mjs';
import { makeTimeModel } from '../../src/lib/time/model.js';
import { validateAnchors } from '../../src/lib/time/anchors.js';

const { flags } = parseArgs(process.argv.slice(2));
const doc = readJson(P('data-src', 'time', 'time_anchors.json'));
const rep = validateAnchors(doc);
if (!rep.ok) { console.error('time_anchors.json is invalid:\n' + rep.errors.map((e) => `  ${e.code} ${e.msg}`).join('\n')); process.exit(2); }

const outputs = new Map();
/** one line per top-level key and per anchor: a reviewable diff without the 25 KB of pretty-printing */
const formatRuntime = (rt) => '{\n' + Object.entries(rt).map(([k, v]) => (k === 'anchors' ? `  "anchors": [\n${v.map((a) => '    ' + JSON.stringify(a)).join(',\n')}\n  ]` : `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)).join(',\n') + '\n}';

// 1. generated ES modules: the full document (tooling) and the runtime subset (the ES route)
outputs.set(P('src', 'lib', 'time', 'anchors.generated.js'),
  '// GENERATED from data-src/time/time_anchors.json by tools/time/build.mjs. Do not edit. CANDIDATE anchors: all state "proposed".\n' +
  '// The FULL document (labels, facts, evidence): tooling and tests import this; no runtime module does (see anchors.runtime.generated.js).\n' +
  'export default ' + JSON.stringify(doc, null, 2) + ';\n');
const runtime = runtimeDoc(doc);
outputs.set(P('src', 'lib', 'time', 'anchors.runtime.generated.js'),
  '// GENERATED from data-src/time/time_anchors.json by tools/time/build.mjs (tools/time/slim.mjs). Do not edit. CANDIDATE anchors: all state "proposed".\n' +
  '// The runtime subset the ES-module route (src/lib/time/index.js) bundles: no labels, facts, sources or evidence text.\n' +
  'export default ' + formatRuntime(runtime) + ';\n');

// 2. golden + ticks.json (from a model built on the SAME document)
const model = makeTimeModel(doc);
outputs.set(P('tests', 'time', 'golden', 'tick-clock.csv'), model.goldenCsv());
outputs.set(P('tools', 'time', 'build', 'ticks.json'), JSON.stringify({ version: doc.version, dv: doc.dv, columns: ['tick', 'iso', 'tab', 'date', 'mpt'], rows: model.ticksJson() }) + '\n');

// 3. IIFE / inline builds: core (pruned) + bridge, minified; anchors slimmed to what the bridge reads
const { inline } = await buildInline(doc);
const banner = `/* GTBGTime ${doc.version} dv${doc.dv} CANDIDATE (proposed, unreviewed anchors) */`;
outputs.set(P('tools', 'time', 'build', 'gtbg-time.inline.js'), inline + '\n');
outputs.set(P('tools', 'time', 'build', 'gtbg-time.iife.js'), `${banner}\n(function(g){g.GTBGTime=${inline};})(typeof globalThis!=="undefined"?globalThis:window);\n`);
const size = { ...sizeOf(inline), budget_brotli: 2560, es_route_data: sizeOf(JSON.stringify(runtime)), full_document: sizeOf(JSON.stringify(doc)) };
outputs.set(P('tools', 'time', 'build', 'size.json'), JSON.stringify(size, null, 2) + '\n');

let stale = 0;
for (const [p, text] of outputs) {
  if (flags.check) {
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    if (cur !== text) { stale++; console.error('STALE ' + p); }
  } else if (writeIfChanged(p, text)) console.log('wrote ' + p.replace(P() + '\\', '').replace(P() + '/', ''));
}
if (flags.check) { console.log(stale ? `${stale} generated file(s) stale: run node tools/time/build.mjs` : `generated files current (${outputs.size})`); process.exit(stale ? 1 : 0); }
console.log(`inline module: ${size.raw} B raw, ${size.gzip} B gzip, ${size.brotli} B brotli (budget ${size.budget_brotli}); ES-route data ${size.es_route_data.raw} B raw / ${size.es_route_data.brotli} B brotli vs ${size.full_document.raw} B for the full document`);
