// tools/agg-census.mjs - which aggregate marks does the real battle need?  Runs the prototype's certified layout solver (read-only import) over a ladder of ticks and zooms on the real data and counts the aggregate
// tiles it produces by (side, arms present, depth).  The result (results/agg-census.json) is what the atlas ships for aggregates; `node build.mjs --all` ships the whole vocabulary instead.
// Usage: node tools/agg-census.mjs [--ticks=every10] [--zooms=13.5,14,15,16]
import fs from 'node:fs'; import path from 'node:path';
import { makeEngine, loadDocs, REPO } from '../../../anim/prototype/src/headless.mjs';
import { FRAME_MS } from '../../../anim/prototype/src/layout/spec.mjs';
const zooms = (process.argv.find((a) => a.startsWith('--zooms=')) || '--zooms=13.5,14,15,16').slice(8).split(',').map(Number);
const { dataset } = loadDocs(); const reg = new Map(JSON.parse(fs.readFileSync(path.join(REPO, 'data-src/build/unit_registry.json'), 'utf8')).units.map((u) => [u.id, u]));
const e = makeEngine({}); const spec = e.spec();
const keyTicks = new Set(); for (const u of dataset.units) for (const kf of u.kf) keyTicks.add(kf[0]);
const ticks = [...new Set([...keyTicks, ...Array.from({ length: 68 }, (_, i) => 1 + i * 10), 675])].sort((a, b) => a - b);
const letterOf = (id) => { const u = e.battle.units.get(id); if (!u) return 'F'; if (['brigade', 'division', 'corps', 'army'].includes(u.kind)) return 'F'; const r = reg.get(id); const arm = (r && r.arm) || u.arm; return arm === 'cavalry' ? 'C' : arm === 'artillery' || arm === 'horse_artillery' ? 'A' : 'I'; };
const counts = new Map(); let aggTiles = 0; let tilesTotal = 0; let solves = 0; const nHist = {};
const t0 = Date.now();
for (const tick of ticks) {
  const vis = e.battle.visibleAt(tick);
  for (const z of zooms) {
    const s = e.kernel.layout.get('certified').create({ all: e.battle, tok: e.tok }); const r = s.solve({ vis, z, dtMs: FRAME_MS, selectedId: null, spec, cold: true }); solves++;
    for (const p of r.placed) { tilesTotal++; if (p.t.kind !== 'agg') continue; aggTiles++;
      const letters = [...new Set(p.t.ids.map(letterOf))]; const armset = ['I', 'C', 'A', 'F'].filter((l) => letters.includes(l)).join(''); const depth = p.t.ids.length >= 3 ? 3 : 2;
      const key = `${p.t.side}/${armset}/${depth}`; const c = counts.get(key) || { side: p.t.side, armset, depth, tiles: 0, maxMembers: 0 }; c.tiles++; c.maxMembers = Math.max(c.maxMembers, p.t.ids.length); counts.set(key, c);
      const b = p.t.ids.length >= 20 ? '20+' : p.t.ids.length >= 10 ? '10-19' : p.t.ids.length >= 5 ? '5-9' : String(p.t.ids.length); nHist[b] = (nHist[b] || 0) + 1; }
  }
}
const out = { generated: new Date().toISOString(), method: 'prototype certified layout solver, cold solves, real data, visibility rule carry-forward (the shipped rule: the worst case)', ticks: ticks.length, zooms, solves, seconds: Math.round((Date.now() - t0) / 1000), tilesTotal, aggregateTiles: aggTiles, membersHistogram: nHist,
  combos: [...counts.values()].sort((a, b) => b.tiles - a.tiles), vocabulary: 4 * 15 * 2 };
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'results', 'agg-census.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...out, combos: out.combos.length }, null, 1)); console.log(out.combos.map((c) => `${c.side}/${c.armset}/${c.depth} tiles ${c.tiles} max members ${c.maxMembers}`).join('\n'));
