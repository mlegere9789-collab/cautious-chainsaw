// Turns results/*.json into the markdown tables of 05-architecture.md (median over repetitions).  node docs/pitch/anim/05-bench/summarize.mjs > results/tables.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(HERE, 'results');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const med = (a) => { const b = a.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };
const fmt = (x, d = 1) => (x == null ? '-' : Number(x).toFixed(d));
const NAMES = {
  base: 'A0 current routine (verbatim lS), Canvas2D 1x', 'c2d-naive': 'A1 same rich tile drawn per frame, Canvas2D', 'c2d-atlas1': 'A2 Canvas2D sprite atlas, 1 drawImage per tile', 'c2d-atlas2': 'A3 Canvas2D atlas, body + rotated chevron (2 draws)',
  'gl-overlay': 'B1 own WebGL2 canvas, instanced sprites', 'mbx-custom': 'B2 Mapbox custom layer, instanced sprites', 'mbx-hybrid': 'B3 hybrid: custom layer bodies + Canvas2D text overlay',
  'mbx-sym-set': 'C1 Mapbox symbol layers, source.setData per frame', 'mbx-sym-upd': 'C2 Mapbox symbol layers, GeoJSONSource.updateData per frame', 'mbx-fs': 'C3 feature-state only (static positions, 66 glows)',
};
function group(rs) { const g = {}; for (const r of rs) (g[r.cand] ||= []).push(r); return g; }
function table(file, title) {
  if (!fs.existsSync(path.join(R, file))) return `(missing ${file})\n`;
  const j = rd(file); const out = [`### ${title}`, '', `n = ${j.n} units requested; ${j.sec} s measured after ${j.warm} s warm-up; Chrome ${j.chrome}; ${j.when}`, ''];
  const cfgs = [...new Set(j.results.map((r) => r.cfg))];
  for (const c of cfgs) {
    const rs = j.results.filter((r) => r.cfg === c); const first = rs[0];
    out.push(`**${c}: ${first.label}** (zoom ${first.zoom}; alive ${first.alive}, visible ${first.visible}; repetitions per row: ${Math.max(...Object.values(group(rs)).map((a) => a.length))})`, '');
    out.push('| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |');
    out.push('|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|');
    for (const [cand, a] of Object.entries(group(rs))) {
      const ok = a.filter((x) => !x.error); if (!ok.length) { out.push(`| ${NAMES[cand] || cand} | error: ${String(a[0].error).split('\n')[0].slice(0, 60)} |||||||||`); continue; }
      const m = (f) => med(ok.map(f));
      const gcr = ok.find((x) => x.gc);
      out.push(`| ${NAMES[cand] || cand} | ${fmt(m((x) => x.fps))} | ${fmt(m((x) => x.interval.p50))} / ${fmt(m((x) => x.interval.p95))} / ${fmt(m((x) => x.interval.max))} | ${fmt(m((x) => x.over33), 0)} | ${fmt(m((x) => x.drawMs.p50), 2)} / ${fmt(m((x) => x.drawMs.p95), 2)} | ${fmt(m((x) => x.mainBusyPct), 0)} | ${fmt(m((x) => x.rendererCpuPct), 0)} | ${fmt(m((x) => x.gpuCpuPct), 0)} | ${gcr ? `${gcr.gc.minor}+${gcr.gc.major}, ${gcr.gc.ms}` : '-'} | ${fmt(m((x) => x.heapMB.end), 0)} | ${fmt(m((x) => x.canvasMB + x.atlasMB), 0)} |`);
    }
    const sym = rs.filter((r) => r.stale); if (sym.length) { out.push('', 'Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): ' + [...new Set(sym.map((r) => r.cand))].map((c) => { const a = sym.filter((r) => r.cand === c); return `${c}: p50 ${fmt(med(a.map((r) => r.stale.p50)), 0)} frames (${fmt(med(a.map((r) => r.stale.p50)) / med(a.map((r) => r.fps)), 2)} s at ${fmt(med(a.map((r) => r.fps)))} fps), p95 ${fmt(med(a.map((r) => r.stale.p95)), 0)}`; }).join('; ')); }
    out.push('');
  }
  return out.join('\n');
}
const NL = String.fromCharCode(10);
const parts = [], named = {};
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
parts.push(named['main-D1'] = table('main-D1.json', 'Main matrix, desktop, 462 tiles (first scene, see the loader note)'));
parts.push(named['main-D2'] = table('main-D2.json', 'Main matrix, desktop retina (2x), 462 tiles'));
parts.push(named['main-P4'] = table('main-P4.json', 'Main matrix, phone proxy (390x844 @3x, 4x CPU throttle), 462 tiles'));
parts.push(named['main-P4c'] = table('main-P4c.json', 'Phone proxy with the device pixel ratio capped at 2'));
parts.push(named['confirm-478'] = table('confirm-478.json', 'Confirmation on the corrected scene: 478 units (all of the data; the first matrix ran on 462 units because of a loader bug, see 05-architecture.md appendix)'));
parts.push(named['scale-570'] = table('scale-570.json', 'Scaling: 570 tiles (the brief\'s figure; 108 are clones of real units at +-300 m)'));
parts.push(named['scale-900'] = table('scale-900.json', 'Scaling: 900 tiles (headroom; 438 clones)'));
if (fs.existsSync(path.join(R, 'sync.json'))) {
  const j = rd('sync.json'); const startIdx = parts.length; parts.push('### Overlay lag behind the map while the map pans at 667 px/s (px, 1440x852, 8 s, three repetitions)\n\n| overlay drawn from | mean abs mismatch px | p95 | max | share of frames > 1 px |\n|---|---:|---:|---:|---:|');
  const by = {}; for (const r of j.results) (by[r.mode] ||= []).push(r);
  for (const [m, a] of Object.entries(by)) parts.push(`| ${{ raf: 'own rAF loop armed after the map started animating', rafpre: 'own rAF loop armed before the map (the order when Play is pressed first)', render: "map.on('render') (+ triggerRepaint)" }[m]} | ${fmt(med(a.map((r) => r.absMismatchPx.mean)), 2)} | ${fmt(med(a.map((r) => r.absMismatchPx.p95)), 2)} | ${fmt(med(a.map((r) => r.absMismatchPx.max)), 2)} | ${fmt(med(a.map((r) => r.shareFramesOver1px)), 2)} |`);
  parts.push(''); named.sync = parts.slice(startIdx).join(NL);
}
for (const f of ['solver-D1.json', 'solver-P4.json']) if (fs.existsSync(path.join(R, f))) {
  const startIdx2 = parts.length;
  const j = rd(f); const r0 = j.results[0]; parts.push(`### Layout-solver budget on real positions (${f.replace('.json', '')}, ${r0.label})\n\n| zoom | visible | overlapping pairs raw | L0 current loops: ms p50 / p95, residual, extra px per frame mean / p95 / max | L1 grid warm start: ms p50 / p95, residual, extra px mean / p95 / max |\n|---|---:|---:|---|---|`);
  for (const w of r0.rows) parts.push(`| ${w.zoom} | ${w.visible} | ${w.overlapsRaw} | ${w.L0.ms.p50} / ${w.L0.ms.p95}, ${w.L0.residual}, ${w.L0.extraJitter.meanPx} / ${w.L0.extraJitter.p95Px} / ${w.L0.extraJitter.maxPx} | ${w.L1.ms.p50} / ${w.L1.ms.p95}, ${w.L1.residual}, warm ${w.L1.extraJitterWarm.meanPx} / ${w.L1.extraJitterWarm.p95Px} / ${w.L1.extraJitterWarm.maxPx} (cold ${w.L1.extraJitterCold.meanPx}) |`);
  parts.push(''); named[f.replace('.json', '')] = parts.slice(startIdx2).join(NL);
}
console.log(only ? (named[only] || '(unknown table ' + only + ')') : parts.join(NL));
