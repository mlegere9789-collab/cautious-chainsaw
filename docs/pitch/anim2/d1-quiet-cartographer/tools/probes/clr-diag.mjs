import { makeEngine } from '../../src/headless.mjs';
import { verifyFrame, clearance } from '../../src/layout/geom.mjs';
import { FRAME_MS } from '../../src/layout/spec.mjs';
for (const settings of [{}, { 'layout.dMaxPx': 48 }, { 'layout.dMaxPx': 64 }, { 'layout.gapPx': 2 }, { 'layout.labels': true }]) {
  const e = makeEngine({ settings }); const spec = e.spec(); const vis = e.battle.visibleAt(346);
  const s = e.kernel.layout.get('certified').create({ all: e.battle, tok: e.tok }); const r = s.solve({ vis, z: 12.5, dtMs: FRAME_MS, selectedId: null, spec, cold: true });
  const v = verifyFrame(r.items, spec.gap - 1e-6, false);
  // find the min clearance pair
  let best = { c: 1e9 }; const items = r.items; for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i]; const b = items[j]; if (a.owner === b.owner || (a.kind === 'pin' && b.kind === 'pin')) continue; const c = clearance(a, b); if (c < best.c) best = { c, a: a.owner + ':' + a.kind, b: b.owner + ':' + b.kind }; }
  console.log(JSON.stringify(settings), 'gap', spec.gap, 'dMax', spec.dMax, 'labels', spec.labels, '| overlaps', v.overlaps, 'clr', v.clearanceViolations, '| min clearance', best.c.toFixed(6), best.a, best.b);
}
