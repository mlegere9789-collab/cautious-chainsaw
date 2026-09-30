#!/usr/bin/env node
// Builds every artifact derived from data-src/time/time_anchors.json (CANDIDATE; nothing ships without owner/historian sign-off):
//   src/lib/time/anchors.generated.js       the anchors document as an ES module (the default model of src/lib/time/index.js)
//   tests/time/golden/tick-clock.csv        675-row golden table (TM-V11): any anchor edit is a reviewable diff
//   tools/time/build/ticks.json             675 rows for Node consumers (Historian index build, static exports)
//   tools/time/build/gtbg-time.iife.js      classic-script global GTBGTime for static pages   (window.GTBGTime)
//   tools/time/build/gtbg-time.inline.js    expression `(function(){...})()` inlined by tools/t0/patches-next/CLOCK.json into the bundle
//   tools/time/build/size.json              raw / gzip / brotli sizes (TX-12 budget: 2.5 KB brotli)
//
//   node tools/time/build.mjs          write everything
//   node tools/time/build.mjs --check  exit 1 when a generated file is stale (CI, TM-V11)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { P, readJson, readText, writeIfChanged, parseArgs } from './lib.mjs';
import { minify } from './minify.mjs';
import { makeTimeModel } from '../../src/lib/time/model.js';
import { validateAnchors } from '../../src/lib/time/anchors.js';

const { flags } = parseArgs(process.argv.slice(2));
const doc = readJson(P('data-src', 'time', 'time_anchors.json'));
const rep = validateAnchors(doc);
if (!rep.ok) { console.error('time_anchors.json is invalid:\n' + rep.errors.map((e) => `  ${e.code} ${e.msg}`).join('\n')); process.exit(2); }

const outputs = new Map();

// 1. generated ES module
outputs.set(P('src', 'lib', 'time', 'anchors.generated.js'),
  '// GENERATED from data-src/time/time_anchors.json by tools/time/build.mjs. Do not edit. CANDIDATE anchors: all state "proposed".\n' +
  'export default ' + JSON.stringify(doc, null, 2) + ';\n');

// 2. golden + ticks.json (from a model built on the SAME document)
const model = makeTimeModel(doc);
outputs.set(P('tests', 'time', 'golden', 'tick-clock.csv'), model.goldenCsv());
outputs.set(P('tools', 'time', 'build', 'ticks.json'), JSON.stringify({ version: doc.version, dv: doc.dv, columns: ['tick', 'iso', 'tab', 'date', 'mpt'], rows: model.ticksJson() }) + '\n');

// 3. IIFE / inline builds: core + bridge, exports stripped, anchors slimmed to what the runtime reads
const strip = (s) => s.replace(/^import .*$/gm, '').replace(/^export (class|function|const|let|var) /gm, '$1 ').replace(/^export \{[^}]*\}.*$/gm, '').replace(/^export default .*$/gm, '');
const core = strip(readText(P('src', 'lib', 'time', 'core.js')));
const bridge = strip(readText(P('src', 'lib', 'time', 'bridge.js')));
const slim = {
  version: doc.version, dv: doc.dv, release: doc.release, tick_max: doc.tick_max, tab_days: doc.tab_days, approx_sigma_min: doc.approx_sigma_min, gaps: doc.gaps,
  solar: { '1863-07-01': doc.solar['1863-07-01'] },
  anchors: doc.anchors.map((a) => { const o = { tick: a.tick, t: a.t, sigma_min: a.sigma_min, status: a.status }; if (a.state !== 'proposed') o.state = a.state; if (a.review_flag && a.review_flag !== 'none') o.review_flag = a.review_flag; if (a.circular) o.circular = true; return o; }),
};
const body = `${core}\n${bridge}\nreturn makeBridge(makeCore(${JSON.stringify(slim)}));`;
const inline = '(function(){' + minify(body) + '})()';
const banner = `/* GTBGTime ${doc.version} dv${doc.dv} CANDIDATE (proposed, unreviewed anchors) */`;
outputs.set(P('tools', 'time', 'build', 'gtbg-time.inline.js'), inline + '\n');
outputs.set(P('tools', 'time', 'build', 'gtbg-time.iife.js'), `${banner}\n(function(g){g.GTBGTime=${inline};})(typeof globalThis!=="undefined"?globalThis:window);\n`);
const buf = Buffer.from(inline);
const size = { raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length, brotli: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length, budget_brotli: 2560 };
outputs.set(P('tools', 'time', 'build', 'size.json'), JSON.stringify(size, null, 2) + '\n');

let stale = 0;
for (const [p, text] of outputs) {
  if (flags.check) {
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    if (cur !== text) { stale++; console.error('STALE ' + p); }
  } else if (writeIfChanged(p, text)) console.log('wrote ' + p.replace(P() + '\\', '').replace(P() + '/', ''));
}
if (flags.check) { console.log(stale ? `${stale} generated file(s) stale: run node tools/time/build.mjs` : `generated files current (${outputs.size})`); process.exit(stale ? 1 : 0); }
console.log(`inline module: ${size.raw} B raw, ${size.gzip} B gzip, ${size.brotli} B brotli (budget ${size.budget_brotli})`);
