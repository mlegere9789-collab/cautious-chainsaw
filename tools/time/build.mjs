#!/usr/bin/env node
// Builds every artifact derived from data-src/time/time_anchors.json (CANDIDATE; nothing ships without owner/historian sign-off):
//   src/lib/time/anchors.generated.js         the FULL anchors document (25 KB with labels, facts, evidence): tooling and tests only
//   src/lib/time/anchors.runtime.generated.js the runtime subset (about 4 KB) the ES-module route bundles as its default model
//   tests/time/golden/tick-clock.csv          675-row golden table (TM-V11): any anchor edit is a reviewable diff
//   tools/time/build/ticks.json               675 rows for Node consumers (Historian index build, static exports)
//   tools/time/build/uncertainty.json         675 rows: the per-tick uncertainty bound (minutes), the 'about' decision, the adjudicated evidence status and the earliest/latest clock
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
  '// GENERATED from data-src/time/time_anchors.json by tools/time/build.mjs. Do not edit. CANDIDATE release: anchors adjudicated 2026-10-18 (state reviewed or contested), none signed.\n' +
  '// The FULL document (labels, facts, evidence): tooling and tests import this; no runtime module does (see anchors.runtime.generated.js).\n' +
  'export default ' + JSON.stringify(doc, null, 2) + ';\n');
const runtime = runtimeDoc(doc);
outputs.set(P('src', 'lib', 'time', 'anchors.runtime.generated.js'),
  '// GENERATED from data-src/time/time_anchors.json by tools/time/build.mjs (tools/time/slim.mjs). Do not edit. CANDIDATE release: anchors adjudicated 2026-10-18 (state reviewed or contested), none signed.\n' +
  '// The runtime subset the ES-module route (src/lib/time/index.js) bundles: no labels, facts, sources or evidence text.\n' +
  'export default ' + formatRuntime(runtime) + ';\n');

// 2. golden + ticks.json (from a model built on the SAME document)
const model = makeTimeModel(doc);
outputs.set(P('tests', 'time', 'golden', 'tick-clock.csv'), model.goldenCsv());
outputs.set(P('tools', 'time', 'build', 'ticks.json'), JSON.stringify({ version: doc.version, dv: doc.dv, columns: ['tick', 'iso', 'tab', 'date', 'mpt'], rows: model.ticksJson() }) + '\n');

// 2b. per-tick uncertainty bound (adjudication 2026-10-18). Each anchor carries uncertainty_min, the larger distance from its time to either end of its
// window; earlier/later are the two distances. The clock is the linear interpolation of the anchor times, so the interpolation of the anchors' distances is
// a valid bound for every tick in between. 'about' is the model's own decision (isApprox). status = the weaker adjudicated status of the bounding anchors
// (Contested < Estimated < Documented).
const RANK = { Documented: 2, Estimated: 1, Contested: 0 };
const hmMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const dev = (a) => { // [earlier, later] distances in minutes
  const tm = hmMin(a.t.slice(11)), u = a.uncertainty_min;
  if (!a.range || a.status === 'D' || a.circular) return [u, u];
  return [Math.max(tm - hmMin(a.range[0]), 0), Math.max(hmMin(a.range[1]) - tm, 0)];
};
const unc = (tick) => {
  const A = doc.anchors; let lo = A[0], hi = A[A.length - 1];
  for (const a of A) { if (a.tick <= tick) lo = a; if (a.tick >= tick) { hi = a; break; } }
  const w = hi.tick === lo.tick ? 0 : (tick - lo.tick) / (hi.tick - lo.tick), mix = (x, y) => x * (1 - w) + y * w;
  const dl = dev(lo), dh = dev(hi);
  const st = [lo, hi].map((a) => a.adj_status).filter(Boolean);
  return { u: mix(lo.uncertainty_min, hi.uncertainty_min), early: mix(dl[0], dh[0]), late: mix(dl[1], dh[1]), status: st.length ? st.reduce((x, y) => (RANK[x] <= RANK[y] ? x : y)) : null };
};
const uncRows = [];
for (let t = 1; t <= model.tickMax; t++) {
  const c = model.tickToClock(t), q = unc(t), m0 = model.tickToMinutes(t), r2 = (x) => Math.round(x * 100) / 100;
  uncRows.push([t, c.iso, r2(q.u), c.approx || q.u > doc.approx_sigma_min ? 1 : 0, c.contested ? 1 : 0, q.status, r2(m0 - q.early), r2(m0 + q.late)]);
}
outputs.set(P('tools', 'time', 'build', 'uncertainty.json'), JSON.stringify({
  version: doc.version, dv: doc.dv, approx_sigma_min: doc.approx_sigma_min,
  note: 'Per-tick uncertainty bound of the tick-to-clock map (docs/time/ANCHORS-FINAL.md). uncertainty_min is the larger distance to either end of the window; earliest_min/latest_min are the clock minus/plus the interpolated distances (minutes since 1863-07-01T00:00 LMT). A bound, not a standard deviation. about = 1 when the clock must be printed with "about" (uncertainty above approx_sigma_min, or an unreviewed anchor).',
  columns: ['tick', 'iso', 'uncertainty_min', 'about', 'contested', 'status', 'earliest_min', 'latest_min'], rows: uncRows }) + '\n');

// 3. IIFE / inline builds: core (pruned) + bridge, minified; anchors slimmed to what the bridge reads
const { inline } = await buildInline(doc);
const banner = `/* GTBGTime ${doc.version} dv${doc.dv} CANDIDATE (adjudicated 2026-10-18, not signed) */`;
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
