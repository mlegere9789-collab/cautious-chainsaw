// layout-lab/lib/synth.mjs - synthetic adversarial scenes built from REAL units (real ids, short codes, strengths, order-of-battle chains)
// but with invented anchor positions, to probe the guarantee outside what the 1,804 keyframes happen to contain.
import { chipSize, labelSize } from './spec.mjs';
import { leafPriority } from './tiles.mjs';

export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** pattern: 'uniform' | 'gauss' | 'point' (all identical) | 'line' | 'grid' | 'twoPoints' (two identical-coordinate piles); spread in px */
export function synthLeaves(all, spec, { n, pattern, spread = 200, seed = 1, sidesMixed = true }) {
  const rnd = mulberry32(seed);
  const ids = [...all.units.keys()];
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }   // deterministic shuffle
  const pick = ids.slice(0, Math.min(n, ids.length));
  const gauss = () => { let u = 0; let v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const leaves = [];
  pick.forEach((id, i) => {
    const u = all.units.get(id);
    let ax; let ay;
    if (pattern === 'uniform') { ax = rnd() * spread; ay = rnd() * spread; }
    else if (pattern === 'gauss') { ax = gauss() * spread / 3; ay = gauss() * spread / 3; }
    else if (pattern === 'point') { ax = 0; ay = 0; }
    else if (pattern === 'line') { ax = i * (spread / n); ay = 0; }
    else if (pattern === 'grid') { const c = Math.ceil(Math.sqrt(n)); ax = (i % c) * (spread / c); ay = Math.floor(i / c) * (spread / c); }
    else { ax = i % 2 ? 0 : spread; ay = 0; }                  // twoPoints
    const cs = chipSize(spec, u.short); const ls = labelSize(spec, u.label);
    leaves.push({ key: u.id, kind: 'leaf', ids: [u.id], u, ax, ay, chipW: cs.w, chipH: cs.h, labelW: ls.w, labelH: ls.h, labelText: u.label, short: u.short, side: sidesMixed ? u.side : 'union',
      arm: u.arm, strength: u.strengthRef, ratio: 1, lca: u.id, n: 1, echelon: u.echelon, prio: leafPriority(u, null), moving: false, depth: u.depth, chain: u.chain });
  });
  return leaves;
}
