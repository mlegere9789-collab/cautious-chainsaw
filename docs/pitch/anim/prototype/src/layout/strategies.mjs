// layout/strategies.mjs - the layout strategies registered by name in kernel.layout.
//   certified   the certified hybrid of 06-layout.md: zero overlap by construction (see engine.mjs).  THE DEFAULT.
//   raw         DIAGNOSTIC: every unit a tile at its true position, no layout at all.  Shows the size of the problem (thousands of overlapping pairs at low zoom);
//               never use it to judge a design, only to see what the certified layout is doing.
// A strategy is { id, label, create(ctx) -> { solve(input) -> LayoutResult, reset(), feedback(offsets) } }.
//   ctx   = { all: battle, tok }
//   input = { vis, z, dtMs, selectedId, spec, cold }
//   LayoutResult = { placed:[{t, cx, cy, off:{ox,oy}, chip, label, displaced}], dropped:[], items:[...], labelsShown, ms, rounds, stats }   (layout px, origin = tiles.ORIGIN at zoom z)
import { solve, newState, chipRect, pinRect, plain } from './engine.mjs';
import { buildLeaves } from './tiles.mjs';
import { FRAME_MS } from './spec.mjs';

const certified = {
  id: 'certified', label: 'Certified hybrid (zero overlap)',
  doc: 'Exact minimum-displacement placement within a budget, aggregation along the order of battle as the guaranteed fallback, exact all-pairs certification before a frame is emitted.',
  create(ctx) {
    let state = newState();
    return {
      reset() { state = newState(); },
      solve({ vis, z, dtMs, selectedId, spec, cold = false }) {
        const leaves = buildLeaves(vis, z, spec, selectedId);
        const cfg = { spec, z, dMax: spec.dMax, pinProtect: spec.pinProtect, inertia: true, sticky: true, seniority: 1e7, labels: spec.labels, aggregate: true, dt: Math.max(0.01, dtMs / FRAME_MS), static: cold };
        const r = solve(ctx.all, leaves, cfg, state);
        r.leaves = leaves; return r;
      },
      /** the display layer reports where tiles ACTUALLY are (offsets from their true positions) so the next solve starts from the picture the viewer sees */
      feedback(offsets) { for (const [key, o] of offsets) { const cur = state.off.get(key); if (cur) { cur.ox = o.ox; cur.oy = o.oy; } } },
      get state() { return state; },
    };
  },
};

const raw = {
  id: 'raw', label: 'Raw (no layout, diagnostic)',
  doc: 'Every unit is a tile at its true position.  Overlaps are not resolved: this is the problem, not a solution.',
  create() {
    let state = newState();
    return {
      reset() { state = newState(); },
      solve({ vis, z, spec }) {
        const t0 = performance.now(); const leaves = buildLeaves(vis, z, spec, null);
        const placed = leaves.map((t) => { const chip = chipRect(t, t.ax, t.ay); chip.owner = t.key; chip.kind = 'chip'; return { t, cx: t.ax, cy: t.ay, off: { ox: 0, oy: 0 }, chip, label: null, displaced: false }; });
        const items = placed.map((p) => ({ owner: p.t.key, kind: 'chip', ...plain(p.chip) }));
        return { placed, dropped: [], items, labelsShown: 0, ms: performance.now() - t0, rounds: 0, stats: {}, leaves };
      },
      feedback() {},
      get state() { return state; },
    };
  },
};

export const LAYOUTS = [certified, raw];
export { pinRect };
