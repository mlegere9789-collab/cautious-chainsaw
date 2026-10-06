// layout-lab/lib/strategies.mjs - the layout strategies under test.  Every strategy has the same shape:
//     const s = makeStrategy(name, all, spec, opts);   s.step(leaves, ctx) -> result   (stateful: carries hysteresis state between frames)
//   ctx = { z, dt }   result = { placed[], dropped[], items[], labelsShown, ms, rounds }   (see engine.solve)
// Names:  raw         tiles at their true positions, nothing else (the size of the problem)
//         disclose    (d) progressive disclosure only: labels placed in free space, chips never move
//         displace    (b) constrained displacement + leader lines + inertia/hysteresis; a tile that cannot be placed is DROPPED (counted as hidden)
//         aggregate   (a) aggregation along the order of battle only, driven by the data (merge exactly when tiles would overlap; dMax = 0)
//         aggregateTier (a) semantic zoom: a zoom-keyed echelon (corps < z11.6 <= division < z12.6 <= brigade < z14 <= regiment) + the same forced merges
//         fanout      (c) fixed-slot rosters for co-located clusters; roster blocks displaced as units; failures dropped
//         hybrid      (a)+(b)+(c)+(d): displacement within a budget, labels collapse first, aggregation is the guaranteed fallback
//         legacy      the shipped canvas relaxation, ported (separate module legacy.mjs, different footprint)
import { solve, newState, nearestFree, rectFree, chipRect, labelRect, Occ } from './engine.mjs';
import { makeAggregate } from './tiles.mjs';

const SLOTS = ['r', 'l', 'b', 't'];
const plain = (r) => ({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });

function result(placed, dropped, items, ms, extra = {}) {
  return { placed, dropped, items, labelsShown: placed.filter((p) => p.label).length, ms, rounds: 1, stats: {}, ...extra };
}

function labelPass(placed, cfg, state, dt) {
  // identical to engine step D but for strategies that do not use solve(): chips are already in `occ`
  const spec = cfg.spec; const gap = spec.gap; const occ = new Occ(64);
  for (const p of placed) { occ.add(p.chip); if (p.displaced) occ.add({ x0: p.t.ax - spec.pinHalf, y0: p.t.ay - spec.pinHalf, x1: p.t.ax + spec.pinHalf, y1: p.t.ay + spec.pinHalf, owner: p.t.key, kind: 'pin' }); }
  const next = new Map();
  if (cfg.z < spec.labelMinZoom) { state.label = next; return; }
  const order = placed.filter((p) => p.t.kind === 'leaf').sort((a, b) => b.t.prio - a.t.prio || (a.t.key < b.t.key ? -1 : 1));
  const tryPlace = (p, slots) => { for (const s of slots) { const r = labelRect(p.t, p.cx, p.cy, s, spec); if (rectFree(r, occ, p.t.key, gap)) { r.owner = p.t.key; r.kind = 'label'; occ.add(r); return { slot: s, rect: r }; } } return null; };
  const prev = state.label;
  if (cfg.sticky) for (const p of order) { const pl = prev.get(p.t.key); if (pl && pl.vis) { const got = tryPlace(p, [pl.slot, ...SLOTS.filter((s) => s !== pl.slot)]); if (got) { p.label = got; next.set(p.t.key, { slot: got.slot, vis: true, feas: 999 }); } } }
  for (const p of order) {
    if (p.label) continue;
    const pl = prev.get(p.t.key);
    const ok = SLOTS.some((s) => rectFree(labelRect(p.t, p.cx, p.cy, s, spec), occ, p.t.key, gap));
    const feas = ok ? ((pl && !pl.vis ? pl.feas : 0) + dt) : 0;
    if (ok && (cfg.static || !cfg.sticky || feas >= spec.labelShowDelay)) { const got = tryPlace(p, SLOTS); if (got) { p.label = got; next.set(p.t.key, { slot: got.slot, vis: true, feas: 999 }); continue; } }
    next.set(p.t.key, { slot: pl?.slot || 'r', vis: false, feas });
  }
  state.label = next;
}

function itemsOf(placed, spec) {
  const items = [];
  for (const p of placed) {
    items.push({ owner: p.t.key, kind: 'chip', ...plain(p.chip) });
    if (p.label) items.push({ owner: p.t.key, kind: 'label', ...plain(p.label.rect) });
    if (p.displaced) items.push({ owner: p.t.key, kind: 'pin', x0: p.t.ax - spec.pinHalf, y0: p.t.ay - spec.pinHalf, x1: p.t.ax + spec.pinHalf, y1: p.t.ay + spec.pinHalf });
  }
  return items;
}

// ---- raw ---------------------------------------------------------------------------------------------------------------------
function rawStrategy(all, spec, opts) {
  const state = newState();
  return { name: 'raw', state, step(leaves, ctx) {
    const t0 = performance.now();
    const placed = leaves.map((t) => { const chip = chipRect(t, t.ax, t.ay); chip.owner = t.key; chip.kind = 'chip'; return { t, cx: t.ax, cy: t.ay, off: { ox: 0, oy: 0 }, chip, label: null, displaced: false }; });
    if (ctx.z >= spec.labelMinZoom) for (const p of placed) { const r = labelRect(p.t, p.cx, p.cy, 'r', spec); r.owner = p.t.key; r.kind = 'label'; p.label = { slot: 'r', rect: r }; }
    state.assignPrev = state.assign; state.assign = new Map(placed.map((p) => [p.t.ids[0], p.t.key]));
    return result(placed, [], itemsOf(placed, spec), performance.now() - t0, { assign: state.assign });
  } };
}

// ---- (d) progressive disclosure only -----------------------------------------------------------------------------------------
function discloseStrategy(all, spec, opts) {
  const state = newState();
  return { name: 'disclose', state, step(leaves, ctx) {
    const t0 = performance.now();
    const placed = leaves.map((t) => { const chip = chipRect(t, t.ax, t.ay); chip.owner = t.key; chip.kind = 'chip'; return { t, cx: t.ax, cy: t.ay, off: { ox: 0, oy: 0 }, chip, label: null, displaced: false }; });
    labelPass(placed, { spec, z: ctx.z, sticky: true, static: !!ctx.static }, state, ctx.dt ?? 1);
    state.assignPrev = state.assign; state.assign = new Map(placed.map((p) => [p.t.ids[0], p.t.key]));
    return result(placed, [], itemsOf(placed, spec), performance.now() - t0);
  } };
}

// ---- engine-based strategies --------------------------------------------------------------------------------------------------
function engineStrategy(name, cfgBase) {
  return (all, spec, opts) => {
    const state = newState();
    return { name, state, step(leaves, ctx) {
      const cfg = { spec, z: ctx.z, dt: ctx.dt ?? 1, pinProtect: true, labels: true, inertia: true, sticky: true, seniority: 1e7, static: !!ctx.static, ...cfgBase, ...(opts || {}) };
      if (cfg.dMax == null) cfg.dMax = spec.dMax;
      const r = solve(all, leaves, cfg, state);
      r.assign = state.assign; r.cfg = cfg; return r;
    } };
  };
}

// ---- (c) fixed-slot roster fan-out --------------------------------------------------------------------------------------------
function fanoutStrategy(all, spec, opts = {}) {
  const state = newState(); state.rost = new Map();
  const dRoster = opts.dRoster ?? 96; const maxRoster = opts.maxRoster ?? 999;
  return { name: 'fanout', state, step(leaves, ctx) {
    const t0 = performance.now(); const gap = spec.gap;
    // 1. clusters = connected components of chips that overlap (or touch within `gap`) at their true positions, or whose anchors lie inside another chip
    const n = leaves.length; const parent = leaves.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const cell = 200; const grid = new Map();
    leaves.forEach((t, i) => { const k = Math.floor(t.ax / cell) + ',' + Math.floor(t.ay / cell); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); });
    leaves.forEach((t, i) => { const cx = Math.floor(t.ax / cell); const cy = Math.floor(t.ay / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = grid.get((cx + dx) + ',' + (cy + dy)); if (!a) continue;
        for (const j of a) { if (j <= i) continue; const u = leaves[j];
          if (Math.abs(u.ax - t.ax) < (t.chipW + u.chipW) / 2 + gap && Math.abs(u.ay - t.ay) < (t.chipH + u.chipH) / 2 + gap) parent[find(i)] = find(j); } } });
    const groups = new Map(); leaves.forEach((t, i) => { const r = find(i); let a = groups.get(r); if (!a) groups.set(r, a = []); a.push(t); });
    // 2. macro tiles: a singleton is a tile; a cluster is a roster block with fixed slots in OOB order (stable order = chain string then id)
    const macros = [];
    for (const g of groups.values()) {
      if (g.length === 1) { macros.push({ key: g[0].key, prio: g[0].prio, ax: g[0].ax, ay: g[0].ay, parts: [{ x0: -g[0].chipW / 2, y0: -g[0].chipH / 2, x1: g[0].chipW / 2, y1: g[0].chipH / 2 }], members: [{ t: g[0], dx: 0, dy: 0 }], single: true }); continue; }
      const sorted = [...g].sort((a, b) => (a.chain.slice().reverse().join('>') + a.key < b.chain.slice().reverse().join('>') + b.key ? -1 : 1));
      const cw = Math.max(...g.map((t) => t.chipW)) + gap; const ch = g[0].chipH + gap;
      const cols = Math.max(1, Math.min(g.length, Math.round(Math.sqrt(g.length * ch / cw * 3.2))));
      const rows = Math.ceil(g.length / cols);
      const gx = g.reduce((s, t) => s + t.ax, 0) / g.length; const gy = g.reduce((s, t) => s + t.ay, 0) / g.length;
      const members = sorted.map((t, i) => ({ t, dx: ((i % cols) - (cols - 1) / 2) * cw, dy: (Math.floor(i / cols) - (rows - 1) / 2) * ch }));
      macros.push({ key: 'roster:' + sorted[0].key, prio: Math.max(...g.map((t) => t.prio)) + 5e5, ax: gx, ay: gy,
        parts: members.map((m) => ({ x0: m.dx - m.t.chipW / 2, y0: m.dy - m.t.chipH / 2, x1: m.dx + m.t.chipW / 2, y1: m.dy + m.t.chipH / 2 })), members, single: false, cols, rows });
    }
    // 3. place the macro tiles (greedy by priority, exact nearest-free, all true positions reserved)
    const occ = new Occ(64); const placed = []; const dropped = []; const rosters = [];
    for (const t of leaves) occ.add({ x0: t.ax - spec.pinHalf, y0: t.ay - spec.pinHalf, x1: t.ax + spec.pinHalf, y1: t.ay + spec.pinHalf, owner: t.key, kind: 'pin' });
    const stats = { nf: 0, cand: 0 };
    for (const m of macros.sort((a, b) => b.prio - a.prio || (a.key < b.key ? -1 : 1))) {
      const A = { x: m.ax, y: m.ay };
      // a singleton may sit on its own true position; a roster block may NOT cover the true positions of its own members (their pins stay visible)
      const c = nearestFree(m.parts, A, A, m.single ? spec.dMax : dRoster, occ, m.single ? m.members[0].t.key : '<roster>', gap, stats, 300);
      if (!c) { for (const x of m.members) dropped.push(x.t); continue; }
      const absRects = m.members.map((x) => { const r = chipRect(x.t, c.x + x.dx, c.y + x.dy); r.owner = x.t.key; r.kind = 'chip'; occ.add(r); return r; });
      m.members.forEach((x, i) => { const cx = c.x + x.dx; const cy = c.y + x.dy; placed.push({ t: x.t, cx, cy, off: { ox: cx - x.t.ax, oy: cy - x.t.ay }, chip: absRects[i], label: null, rosterOf: m.single ? null : m.key }); });
      if (!m.single) rosters.push({ key: m.key, n: m.members.length, cols: m.cols, rows: m.rows, dx: c.x - m.ax, dy: c.y - m.ay });
    }
    for (const p of placed) p.displaced = Math.hypot(p.off.ox, p.off.oy) > 1.5;
    // labels (secondary) of singleton tiles only; every roster chip is an obstacle
    const single = placed.filter((p) => !p.rosterOf);
    for (const p of single) p.label = null;
    {
      const occL = new Occ(64);
      for (const p of placed) { occL.add(p.chip); if (p.displaced) occL.add({ x0: p.t.ax - spec.pinHalf, y0: p.t.ay - spec.pinHalf, x1: p.t.ax + spec.pinHalf, y1: p.t.ay + spec.pinHalf, owner: p.t.key, kind: 'pin' }); }
      if (ctx.z >= spec.labelMinZoom) for (const p of single.sort((a, b) => b.t.prio - a.t.prio)) {
        for (const s of SLOTS) { const r = labelRect(p.t, p.cx, p.cy, s, spec); if (rectFree(r, occL, p.t.key, gap)) { r.owner = p.t.key; r.kind = 'label'; occL.add(r); p.label = { slot: s, rect: r }; break; } }
      }
    }
    state.assignPrev = state.assign; state.assign = new Map(placed.map((p) => [p.t.ids[0], p.rosterOf || p.t.key]));
    return result(placed, dropped, itemsOf(placed, spec), performance.now() - t0, { rosters, stats });
  } };
}

export const STRATEGIES = {
  raw: rawStrategy,
  disclose: discloseStrategy,
  displace: engineStrategy('displace', { aggregate: false }),
  aggregate: engineStrategy('aggregate', { aggregate: true, dMax: 0 }),
  aggregateTier: engineStrategy('aggregateTier', { aggregate: true, dMax: 0, tier: [[0, 'corps'], [11.6, 'division'], [12.6, 'brigade'], [14, 'regiment']] }),
  fanout: fanoutStrategy,
  hybrid: engineStrategy('hybrid', { aggregate: true }),
};
export function makeStrategy(name, all, spec, opts) {
  const f = STRATEGIES[name]; if (!f) throw new Error('unknown strategy ' + name);
  return f(all, spec, opts);
}
