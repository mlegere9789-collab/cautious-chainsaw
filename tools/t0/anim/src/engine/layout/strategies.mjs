// layout/strategies.mjs - the layout strategies registered by name in kernel.layout.
//   certified   the certified hybrid of 06-layout.md: zero overlap by construction (see engine.mjs).  THE DEFAULT.
//   raw         DIAGNOSTIC: every unit a tile at its true position, no layout at all.  Shows the size of the problem (thousands of overlapping pairs at low zoom);
//               never use it to judge a design, only to see what the certified layout is doing.
// A strategy is { id, label, create(ctx) -> { solve(input) -> LayoutResult, reset(), feedback(offsets) } }.
//   ctx   = { all: battle, tok }
//   input = { vis, z, dtMs, selectedId, spec, cold }
//   LayoutResult = { placed:[{t, cx, cy, off:{ox,oy}, chip, label, displaced}], dropped:[], items:[...], labelsShown, ms, rounds, stats }   (layout px, origin = tiles.ORIGIN at zoom z)
import { solve, newState, chipRect, pinRect, plain } from './engine.mjs';
import { buildLeaves, refreshTile } from './tiles.mjs';
import { FRAME_MS } from './spec.mjs';
import { updateCrowdSuffixes } from './crowdnames.mjs';

const certified = {
  id: 'certified', label: 'Certified hybrid (zero overlap)',
  doc: 'Exact minimum-displacement placement within a budget, aggregation along the order of battle as the guaranteed fallback, exact all-pairs certification before a frame is emitted.',
  create(ctx) {
    let state = newState();
    // ROUND 2: SELECTION MOVES NOTHING.  A selected unit grows its name (the skin's sizer) only where the layout has VERIFIED free ground for the grown box beside the pip: the picture is first solved with the unit as small as
    // it is when nothing is selected, the grown box is tested against every chip, label and pin of that solution, and only a box that touches nothing is adopted (then no neighbour has to move, merge or be re-counted).  Otherwise the
    // selection is a ring and the code stays.  The decision is made once per selection and zoom regime (never per frame).
    const grow = { id: null, selects: null, on: false };
    const growTest = (r0, sel, z, spec) => {
      const p = r0.placed.find((q) => q.t.key === sel && q.t.kind === 'leaf'); if (!p || !spec.sizer) return false;
      const t = p.t; const big = spec.sizer.leaf(spec, t.u, z, true); const sm = p.chip; const w = big.w; const h = big.h; const sgn = t.sgn || 1; const cy = (sm.y0 + sm.y1) / 2;
      const box = sgn > 0 ? { x0: sm.x0, x1: sm.x0 + w } : { x0: sm.x1 - w, x1: sm.x1 }; box.y0 = cy - h / 2; box.y1 = cy + h / 2; const gap = spec.gap + 0.5;
      for (const o of r0.items) { if (o.owner === sel) continue; if (box.x0 - gap < o.x1 && box.x1 + gap > o.x0 && box.y0 - gap < o.y1 && box.y1 + gap > o.y0) return false; }
      return true;
    };
    return {
      reset() { state = newState(); grow.id = null; grow.on = false; },
      solve({ vis, z, dtMs, selectedId, spec, view = null, cold = false }) {
        spec.crowdSuffix = state.suffix;                       // director fix 9: the words that tell two crowds of the same name apart (layout/crowdnames.mjs)
        const cfg = { spec, z, dMax: spec.dMax, pinProtect: spec.pinProtect, inertia: true, sticky: true, seniority: 1e7, labels: spec.labels, aggregate: true, dt: Math.max(0.01, dtMs / FRAME_MS), static: cold };
        const selects = !!selectedId && (!spec.sizer || !spec.sizer.selects || spec.sizer.selects(z));
        if (!selects) { grow.id = null; grow.on = false; }
        else if (grow.id !== selectedId) {                                      // a new selection: solve it small, then test the grown box on that solution
          grow.id = selectedId; const small = buildLeaves(vis, z, spec, selectedId, false); const r0 = solve(ctx.all, small, cfg, state); r0.leaves = small;
          const inCrowd = !!(spec.sizer && spec.sizer.selects) && r0.placed.some((q) => q.t.kind === 'agg' && q.t.ids.includes(selectedId));      // director fix 6: a selected unit that stands inside a crowd steps out of it, whatever it costs the neighbours, so its own flag and name are on the map
          grow.on = inCrowd || growTest(r0, selectedId, z, spec);
          if (!grow.on) return r0;
        }
        const leaves = buildLeaves(vis, z, spec, selectedId, grow.on);
        if (grow.on && selectedId) for (const rec of state.aggs.values()) { const i = rec.ids.indexOf(selectedId); if (i >= 0) rec.ids = rec.ids.filter((id) => id !== selectedId); }      // the sticky crowds let go of it
        if (grow.on && selectedId) cfg.protect = selectedId;
        // the words that tell two crowds apart are part of the crowd's footprint: when they change, the same frame is laid out again from the same start with them (until no crowd needs words it has not got: the assignment only ever adds, so it ends), so the picture never
        // shows words its boxes were not sized for, and the solver's own history (timers, offsets) is that of ONE solve
        state.sfxClock = (state.sfxClock || 0) + 1; const start = { ...state, splits: new Map(state.splits) }; let r = solve(ctx.all, leaves, cfg, state); let stamped = false;
        for (let pass = 0; pass < 12 && updateCrowdSuffixes(r.placed, view, state, state.sfxClock); pass++) { stamped = true; Object.assign(state, start, { splits: new Map(start.splits), suffix: state.suffix }); r = solve(ctx.all, leaves, cfg, state); }
        if (stamped) state.stamp = (state.stamp || 0) + 1;
        r.leaves = leaves; return r;
      },
      /** the rest canon (core.mjs): the same picture solved from clean state.  Adopted (and the sticky history replaced by it) only when it shows more marks than the layout on screen; null otherwise, the history untouched. */
      canon(inp) {
        const saved = state; const sel = grow.id; const on = grow.on; const before = inp.against ? inp.against.placed.length : 0;
        state = newState(); state.time = saved.time; state.stamp = saved.stamp || 0; let r = null;
        try { r = this.solve({ ...inp, cold: false }); } catch { r = null; }
        if (r && r.placed.length > before && r.dropped.length === 0) { state.stamp = (state.stamp || 0) + 1; return r; }
        state = saved; grow.id = sel; grow.on = on; return null;
      },
      /** between two solves: move the solved tiles with their units (same offsets, new true positions).  false = the set of units changed, solve again. */
      refresh(L, { vis, z, spec, selectedId }) {
        if (!L || vis.length !== L.leaves.length) return false;
        const leaves = buildLeaves(vis, z, spec, selectedId, grow.on); const map = new Map(leaves.map((l) => [l.ids[0], l]));
        for (const l of L.leaves) if (!map.has(l.ids[0])) return false;
        for (const p of L.placed) { refreshTile(p.t, map); p.cx = p.t.ax + p.off.ox; p.cy = p.t.ay + p.off.oy; }
        L.leaves = leaves; L.ms = 0; return true;
      },
      /** the display layer reports where tiles ACTUALLY are (offsets from their true positions) so the next solve starts from the picture the viewer sees */
      feedback(offsets) { for (const [key, o] of offsets) { const cur = state.off.get(key); if (cur) { cur.ox = o.ox; cur.oy = o.oy; } } },
      get state() { return state; },
      /** counts every change of the set of aggregates: the engine keeps stepping for a moment after it moves, so that every aggregate gets its split trial before the picture comes to rest */
      get stamp() { return state.stamp || 0; },
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
        return { placed, dropped: [], items, labelsShown: 0, ms: performance.now() - t0, rounds: 0, stats: {}, leaves, diagnostic: true };
      },
      feedback() {},
      get state() { return state; },
    };
  },
};

export const LAYOUTS = [certified, raw];
export { pinRect };
