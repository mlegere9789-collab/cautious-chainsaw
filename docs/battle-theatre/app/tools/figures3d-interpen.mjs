// Numerical interpenetration report for the garment layers over all 12 body shapes (node only). node docs/battle-theatre/app/tools/figures3d-interpen.mjs   (about 25 s: run at below-normal priority)
// Layers checked (LOD0): (1) every coat cut's torso loft against the implicit body torso (clearance of every vertex, mm); (2) trousers inside the coat skirt (each trouser cut under each long coat cut, y above the hem);
// (3) trousers inside the footwear opening (every trouser cut in every footwear kind, band = the overlap height). Writes data/figures3d/interpenetration.json.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { FigureLibrary, trouserEnv } from '../src/figures3d/library.mjs';
import { BODY_SHAPES, torsoAt } from '../src/figures3d/body.mjs';
import { COAT_CUTS, TROUSER_CUTS } from '../src/figures3d/garments.mjs';
import { layerReport, buildGrid } from '../src/figures3d/interpen.mjs';
const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), L = new FigureLibrary(), FC = new Map(), fin = (id, sh) => { const k = id + sh.id; let m = FC.get(k); if (!m) { m = L.mesh(id, 0, sh).finalize(); FC.set(k, m); } return m; };
export function runInterpen({ shapes = BODY_SHAPES, coats = Object.keys(COAT_CUTS), longCoats = ['sack', 'frock', 'frock_double', 'civilian', 'tunic6'], feet = ['brogan', 'boot_tall', 'gaiter', 'legging'], tol = 1.0 } = {}) {
  const sub = (m, keep) => { const idx = []; for (let t = 0; t < m.idx.length; t += 3) if (keep(m.idx[t]) && keep(m.idx[t + 1]) && keep(m.idx[t + 2])) idx.push(m.idx[t], m.idx[t + 1], m.idx[t + 2]); return { ...m, idx: Uint32Array.from(idx) }; };
  const out = { tolerance_mm: tol, coat_vs_body: [], trousers_in_skirt: [], trousers_in_footwear: [] }, top = { brogan: 0.14, boot_tall: 0.34, gaiter: 0.26, legging: 0.29 };
  for (const sh of shapes) {
    for (const cut of coats) { const c = fin('coat:' + cut, sh), nT = c.meta.torsoNv; let worst = 1e9; for (let i = 0; i < nT; i++) { const y = c.pos[i * 3 + 1]; if (y < 0.5) continue; const t = torsoAt(Math.min(1.46, y), sh), q = Math.hypot(c.pos[i * 3] / t.rx, (c.pos[i * 3 + 2] - t.cz) / t.rz), clr = (q - 1) * (t.rx + t.rz) / 2; worst = Math.min(worst, clr); }
      out.coat_vs_body.push({ shape: sh.id, coat: cut, min_clearance_mm: +(worst * 1000).toFixed(2) }); }
    for (const cut of longCoats) { const cf = fin('coat:' + cut, sh), coat = sub(cf, v => v < cf.meta.baseNv), grid = buildGrid(coat); for (const tr of Object.keys(TROUSER_CUTS)) { const t = fin(`trousers:${tr}:0:0:${trouserEnv(cut)}`, sh), r = layerReport(coat, t, { grid, y0: COAT_CUTS[cut].hem + 0.03, y1: 0.9, tolMm: tol }); out.trousers_in_skirt.push({ shape: sh.id, coat: cut, trousers: tr, ...r }); } }
    for (const ft of feet) { const f = fin('foot:' + ft, sh), ranges = f.meta.baseRanges, fo = sub(f, v => ranges.some(([a, b]) => v >= a && v < b)), grid = buildGrid(fo); for (const tr of Object.keys(TROUSER_CUTS)) { const t = fin(`trousers:${tr}:0:0:0`, sh), r = layerReport(fo, t, { grid, y0: 0.12, y1: top[ft], tolMm: tol, maxD: 0.05 }); out.trousers_in_footwear.push({ shape: sh.id, foot: ft, trousers: tr, ...r }); } }
  }
  const w = a => Math.max(...a.map(x => x.worst_pokeout_mm ?? 0));
  out.summary = { shapes: shapes.length, worst_coat_clearance_mm: Math.min(...out.coat_vs_body.map(x => x.min_clearance_mm)), worst_skirt_pokeout_mm: w(out.trousers_in_skirt), worst_footwear_pokeout_mm: w(out.trousers_in_footwear), skirt_over_tolerance: out.trousers_in_skirt.reduce((a, x) => a + x.over_tolerance, 0), footwear_over_tolerance: out.trousers_in_footwear.reduce((a, x) => a + x.over_tolerance, 0) };
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('figures3d-interpen.mjs')) {
  const t0 = Date.now(), r = runInterpen(); fs.writeFileSync(path.join(APP, 'data/figures3d/interpenetration.json'), JSON.stringify({ schema: 'figures3d-interpenetration-1', method: 'interpen.mjs: inner-layer vertices vs the outer layer surface along its smooth normal; coat vs body: elliptical clearance against the torso table', ...r }, null, 1) + '\n');
  console.log(JSON.stringify(r.summary), (Date.now() - t0) + ' ms');
}
