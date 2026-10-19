// tools/probes/nf-diff.mjs - differential check of the fork's nearestFree (strip filter, scratch-set de-duplication, lazy heap order) against the prototype's original (read-only, same signature)
// on random scenes with ties, duplicates, several parts, finite move limits and caps.  Prints the number of scenes, how many reached the slow path, and any difference.
//   node tools/probes/nf-diff.mjs [--scenes=40000]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { nearestFree as mine, Occ as OccMine } from '../../src/layout/engine.mjs';
import { PROTO } from '../../src/headless.mjs';
const P = await import(pathToFileURL(path.join(PROTO, '..', '..', 'anim', 'prototype', 'src', 'layout', 'engine.mjs')).href);
const N = +((process.argv.find((a) => a.startsWith('--scenes=')) || '--scenes=40000').split('=')[1]);
let s = 12345; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
let diffs = 0; let slow = 0; let nulls = 0; let tied = 0;
for (let k = 0; k < N; k++) {
  const grid = k % 3 === 0;                                      // a third of the scenes on an integer grid so exact ties and exact-edge candidates are common
  const q = (v) => (grid ? Math.round(v) : v);
  const n = 2 + Math.floor(rnd() * (k % 7 === 0 ? 70 : 14)); const rects = [];
  for (let i = 0; i < n; i++) { const x = q((rnd() - 0.5) * 120); const y = q((rnd() - 0.5) * 80); const w = q(10 + rnd() * 40); const h = q(8 + rnd() * 14); const r = { x0: x, y0: y, x1: x + w, y1: y + h, owner: 'o' + (i % 9) }; rects.push(r); if (rnd() < 0.15) rects.push({ ...r, owner: 'o' + ((i + 1) % 9) }); }
  const a = new OccMine(64); const b = new P.Occ(64); for (const r of rects) { a.add({ ...r }); b.add({ ...r }); }
  const parts = rnd() < 0.3 ? [{ x0: -12, y0: -7, x1: 12, y1: 7 }, { x0: 14, y0: -5, x1: 40, y1: 5 }] : [{ x0: q(-10 - rnd() * 14), y0: q(-5 - rnd() * 6), x1: q(10 + rnd() * 14), y1: q(5 + rnd() * 6) }];
  const A = { x: q((rnd() - 0.5) * 20), y: q((rnd() - 0.5) * 20) }; const P0 = rnd() < 0.5 ? { ...A } : { x: A.x + q((rnd() - 0.5) * 30), y: A.y + q((rnd() - 0.5) * 30) };
  const dMax = [24, 40, 56, 64][k % 4]; const gap = [1, 2][k % 2]; const kCap = [Infinity, 60, 20][k % 3 === 0 ? 0 : (k % 5) % 3]; const maxMove = k % 4 === 0 ? 6 + rnd() * 20 : Infinity;
  const sa = { nf: 0, cand: 0 }; const sb = { nf: 0, cand: 0 };
  const ra = mine(parts, A, P0, dMax, a, 'o3', gap, sa, kCap, maxMove); const rb = P.nearestFree(parts, A, P0, dMax, b, 'o3', gap, sb, kCap, maxMove);
  if (sa.cand > 0 || sb.cand > 0) slow++; if (!ra) nulls++; if (grid && ra && rb && ra.x !== P0.x) tied++;
  const same = (!ra && !rb) || (ra && rb && Math.abs(ra.x - rb.x) < 1e-9 && Math.abs(ra.y - rb.y) < 1e-9);
  if (!same || sa.cand !== sb.cand) { diffs++; if (diffs <= 5) console.log('DIFF scene', k, JSON.stringify({ ra, rb, candMine: sa.cand, candProto: sb.cand })); }
}
console.log(`nearestFree differential: ${N} scenes, ${slow} on the slow path, ${nulls} returned null, ${tied} displaced on the integer grid, ${diffs} differences`);
