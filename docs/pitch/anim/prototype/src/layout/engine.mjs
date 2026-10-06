// layout/engine.mjs - the CERTIFIED layout: the placement engine of 06-layout.md (ported from layout-lab/lib/engine.mjs; tier merging, the escalated budget and the growth ramp
// of the lab are NOT carried over: they were measured and rejected or left off).  What it guarantees on every frame it emits:
//   (i)   no two chips closer than the clearance, (ii) no chip covers another tile's true position (pin), (iii) no label overlaps a chip, a pin or another label,
//   (iv)  every unit on the field is represented by exactly one tile (as itself or inside an aggregate).
// How: every tile is placed by an EXACT minimum-displacement search (nearestFree); a tile that cannot be placed within the budget is MERGED into an aggregate (nothing is dropped);
// after the groups are solved the union of the placements is checked exactly across groups, conflicting groups are merged and re-solved, and the loop only ends when the check passes.
// Temporal coherence (06 section 4.1): sticky aggregates (merge now, split later), inertia (a displaced chip relaxes toward its true position), seniority (older tiles are
// placed first, a newcomer yields), label show delay and slot memory.  Time is counted in frame equivalents (1 = 1/60 s) so the behaviour does not depend on the refresh rate.
import { Hash, clearance } from './geom.mjs';
import { makeAggregate } from './tiles.mjs';

const EPS = 1e-7;

export class Occ {
  constructor(cell = 64) { this.h = new Hash(cell); }
  add(rect) { this.h.add(rect); return rect; }
  query(x0, y0, x1, y1, cb) { this.h.query(x0, y0, x1, y1, cb); }
}

/** parts = [{x0,y0,x1,y1}] relative to the tile centre; returns {x,y} (absolute centre) or null.  A = true anchor, P0 = desired centre, dMax = displacement budget (px). */
export function nearestFree(parts, A, P0, dMax, occ, owner, gap, stats, kCap = Infinity, maxMove = Infinity) {
  let ext = 0; for (const p of parts) ext = Math.max(ext, -p.x0, p.x1, -p.y0, p.y1);
  if (stats) stats.nf++;
  // FAST PATH (prototype): the desired centre itself is feasible.  Same predicate as free() below (strictly inside an obstacle's forbidden rectangle), but only the obstacles near P0
  // are visited, so the common case never builds the forbidden-rectangle list.  The result is identical (checked by test/layout.test.mjs against a fingerprint of real frames).
  if (Math.hypot(P0.x - A.x, P0.y - A.y) <= dMax + EPS) {
    let ok = true; const r = ext + gap + 1;
    occ.query(P0.x - r, P0.y - r, P0.x + r, P0.y + r, (o) => {
      if (!ok || o.owner === owner) return;
      for (const p of parts) if (P0.x > o.x0 - gap - p.x1 + EPS && P0.x < o.x1 + gap - p.x0 - EPS && P0.y > o.y0 - gap - p.y1 + EPS && P0.y < o.y1 + gap - p.y0 - EPS) { ok = false; return; }
    });
    if (ok) return { x: P0.x, y: P0.y };
  }
  const F = [];
  const q = dMax + ext + 140;                                  // 140 >= half the widest obstacle rect, so every obstacle that can matter is queried
  occ.query(A.x - q, A.y - q, A.x + q, A.y + q, (o) => {
    if (o.owner === owner) return;
    for (const p of parts) {
      const f = { x0: o.x0 - gap - p.x1, x1: o.x1 + gap - p.x0, y0: o.y0 - gap - p.y1, y1: o.y1 + gap - p.y0 };
      if (f.x1 > A.x - dMax && f.x0 < A.x + dMax && f.y1 > A.y - dMax && f.y0 < A.y + dMax) F.push(f);
    }
  });
  if (F.length > 1) {                                           // identical forbidden rects (60 anchors at one coordinate) are one obstacle
    const seen = new Set(); let w = 0;
    for (let i = 0; i < F.length; i++) { const f = F[i]; const k = f.x0.toFixed(4) + ',' + f.x1.toFixed(4) + ',' + f.y0.toFixed(4) + ',' + f.y1.toFixed(4); if (seen.has(k)) continue; seen.add(k); F[w++] = f; }
    F.length = w;
  }
  const free = (x, y) => { for (let i = 0; i < F.length; i++) { const f = F[i]; if (x > f.x0 + EPS && x < f.x1 - EPS && y > f.y0 + EPS && y < f.y1 - EPS) return false; } return true; };
  if (Math.hypot(P0.x - A.x, P0.y - A.y) <= dMax + EPS && free(P0.x, P0.y)) return { x: P0.x, y: P0.y };
  if (F.length > kCap) { if (stats) stats.kcapFails = (stats.kcapFails || 0) + 1; return null; }   // saturated neighbourhood: conservative failure (never an overlap)
  const X = [P0.x]; const Y = [P0.y];
  for (const f of F) { X.push(f.x0, f.x1); Y.push(f.y0, f.y1); }
  const uniq = (a) => { const m = new Map(); for (const v of a) { const k = Math.round(v * 1e5); if (!m.has(k)) m.set(k, v); } return [...m.values()]; };
  const xs = uniq(X).sort((p, q2) => Math.abs(p - P0.x) - Math.abs(q2 - P0.x)); const ys = uniq(Y).sort((p, q2) => Math.abs(p - P0.y) - Math.abs(q2 - P0.y));
  let best = Infinity; let out = null; let tested = 0;           // branch and bound over X x Y in order of increasing |dx| / |dy|
  for (let i = 0; i < xs.length; i++) {
    const dx = Math.abs(xs[i] - P0.x); if (dx >= best || dx > maxMove) break;
    for (let j = 0; j < ys.length; j++) {
      const dy = Math.abs(ys[j] - P0.y); const d = Math.hypot(dx, dy); if (d >= best || d > maxMove) break;
      if (Math.hypot(xs[i] - A.x, ys[j] - A.y) > dMax + EPS) continue;
      tested++;
      if (free(xs[i], ys[j])) { best = d; out = { x: xs[i], y: ys[j] }; break; }
    }
  }
  if (stats) stats.cand += tested;
  return out;
}

/** is a rect free of every obstacle of another owner (clearance >= gap)? */
export function rectFree(r, occ, owner, gap) {
  let ok = true;
  occ.query(r.x0 - gap - 1, r.y0 - gap - 1, r.x1 + gap + 1, r.y1 + gap + 1, (o) => { if (!ok || o.owner === owner) return; if (clearance(r, o) < gap - EPS) ok = false; });
  return ok;
}

export const chipRect = (t, cx, cy) => ({ x0: cx - t.chipW / 2, y0: cy - t.chipH / 2, x1: cx + t.chipW / 2, y1: cy + t.chipH / 2 });
export const labelRect = (t, cx, cy, slot, spec) => {
  const g = spec.labelGap; const w = t.labelW; const h = t.labelH;
  if (slot === 'r') return { x0: cx + t.chipW / 2 + g, y0: cy - h / 2, x1: cx + t.chipW / 2 + g + w, y1: cy + h / 2 };
  if (slot === 'l') return { x0: cx - t.chipW / 2 - g - w, y0: cy - h / 2, x1: cx - t.chipW / 2 - g, y1: cy + h / 2 };
  if (slot === 'b') return { x0: cx - w / 2, y0: cy + t.chipH / 2 + g, x1: cx + w / 2, y1: cy + t.chipH / 2 + g + h };
  return { x0: cx - w / 2, y0: cy - t.chipH / 2 - g - h, x1: cx + w / 2, y1: cy - t.chipH / 2 - g };
};
export const SLOTS = ['r', 'l', 'b', 't'];
export const pinRect = (t, spec, kind = 'pin') => ({ x0: t.ax - spec.pinHalf, y0: t.ay - spec.pinHalf, x1: t.ax + spec.pinHalf, y1: t.ay + spec.pinHalf, owner: t.key, kind });
export const plain = (r) => ({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });

const hashJitter = (str, mod) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % mod; };

export function newState() { return { time: 0, solves: 0, age: new Map(), off: new Map(), aggs: new Map(), label: new Map(), assign: new Map() }; }

/** connected components of tiles under the interaction radius: tiles in different components cannot influence each other's chip placement */
function components(tiles, dMax, gap) {
  let maxDiag = 0; for (const t of tiles) maxDiag = Math.max(maxDiag, Math.hypot(t.chipW, t.chipH));
  const cell = 2 * dMax + maxDiag + gap + 1;
  const grid = new Map(); const parent = tiles.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  tiles.forEach((t, i) => { const k = Math.floor(t.ax / cell) + ',' + Math.floor(t.ay / cell); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); });
  tiles.forEach((t, i) => {
    const cx = Math.floor(t.ax / cell); const cy = Math.floor(t.ay / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const a = grid.get((cx + dx) + ',' + (cy + dy)); if (!a) continue;
      for (const j of a) {
        if (j <= i) continue; const u = tiles[j];
        if (Math.hypot(u.ax - t.ax, u.ay - t.ay) < 2 * dMax + 0.5 * (Math.hypot(t.chipW, t.chipH) + Math.hypot(u.chipW, u.chipH)) + gap) parent[find(i)] = find(j);
      }
    }
  });
  const comps = new Map(); tiles.forEach((t, i) => { const r = find(i); let a = comps.get(r); if (!a) comps.set(r, a = []); a.push(t); });
  return [...comps.values()];
}

const lcaDepth = (all, a, b) => { const sb = new Set(b.chain); for (const id of a.chain) if (sb.has(id)) return all.nodes.get(id)?.depth ?? 0; return 0; };

/** best merge partner of F among `cur`: deepest common ancestor first, then nearest */
function bestPartner(all, F, cur, reach, skip = null) {
  let best = null; let bs = -1e18;
  for (const b of cur) {
    if (b === F || (skip && skip.has(b.key))) continue;
    const d = Math.hypot(b.ax - F.ax, b.ay - F.ay);
    if (d > reach + 0.5 * (Math.hypot(F.chipW, F.chipH) + Math.hypot(b.chipW, b.chipH))) continue;
    const dep = lcaDepth(all, F, b); const sc = dep * 1e6 - d;
    if (sc > bs) { bs = sc; best = { b, depth: dep, d }; }
  }
  return best;
}

/** one greedy chip pass over a set of tiles (highest priority first).  Returns { placed, failed }. */
function placePass(cur, cfg, state, tentative, dt, stats) {
  const spec = cfg.spec; const gap = spec.gap;
  const occ = new Occ(64);
  if (cfg.pinProtect) for (const t of cur) occ.add(pinRect(t, spec));
  // seniority: a tile that has existed longer is placed first, so a newcomer yields instead of pushing tiles that were already there
  const eff = (t) => t.prio + (cfg.seniority ? Math.min(state.age.get(t.key) ?? -1, 900) * cfg.seniority : 0);
  const order = [...cur].sort((a, b) => eff(b) - eff(a) || (a.key < b.key ? -1 : 1));
  const placed = []; const failed = [];
  for (const t of order) {
    const A = { x: t.ax, y: t.ay };
    const po = cfg.inertia ? state.off.get(t.key) : null;
    let P0 = A;
    if (po) { const m = Math.hypot(po.ox, po.oy); const s = m > 0 ? Math.max(0, m - spec.relax * dt) / m : 0; P0 = { x: A.x + po.ox * s, y: A.y + po.oy * s }; }
    const budget = (tentative.has(t.ids[0]) && t.kind === 'leaf') ? Math.max(0, cfg.dMax - spec.band) : cfg.dMax;
    { const m2 = Math.hypot(P0.x - A.x, P0.y - A.y); if (m2 > budget) P0 = { x: A.x + (P0.x - A.x) * budget / m2, y: A.y + (P0.y - A.y) * budget / m2 }; }   // an inherited offset never exceeds the current budget
    const part = [{ x0: -t.chipW / 2, y0: -t.chipH / 2, x1: t.chipW / 2, y1: t.chipH / 2 }];
    const c = nearestFree(part, A, P0, budget, occ, t.key, gap, stats, spec.kCap, po && spec.continuity > 0 ? spec.continuity * Math.max(1, dt) : Infinity);
    if (!c) { failed.push(t); continue; }
    const rect = chipRect(t, c.x, c.y); rect.owner = t.key; rect.kind = 'chip'; occ.add(rect);
    placed.push({ t, cx: c.x, cy: c.y, off: { ox: c.x - t.ax, oy: c.y - t.ay }, chip: rect, label: null });
  }
  return { placed, failed };
}

/** Aggregation round: every failed tile is merged with its best partner.  A failed member of a tentatively split aggregate goes back into that aggregate.
 *  Strictly reduces the number of tiles when `failed` is non-empty. */
function mergeFailures(all, cur, failed, cfg, tentative, frame) {
  const spec = cfg.spec; const consumed = new Set(); const merged = [];
  for (const F of [...failed].sort((a, b) => b.prio - a.prio)) {
    if (consumed.has(F.key)) continue;
    const tent = F.kind === 'leaf' ? tentative.get(F.ids[0]) : null;
    if (tent) {
      const group = cur.filter((t) => t.kind === 'leaf' && tent.ids.includes(t.ids[0]) && !consumed.has(t.key));
      if (group.length >= 2) { for (const g of group) { consumed.add(g.key); tentative.delete(g.ids[0]); } merged.push(makeAggregate(all, group, spec, frame)); continue; }
    }
    let bp = bestPartner(all, F, cur, 2 * cfg.dMax, consumed);
    if (!bp) bp = bestPartner(all, F, cur, 1e9, consumed);          // safety net: no partner in reach -> the nearest tile of the group (progress is guaranteed while the group has >= 2 tiles)
    const partner = bp ? bp.b : null;
    if (!partner) continue;
    consumed.add(F.key); consumed.add(partner.key);
    merged.push(makeAggregate(all, [F, partner], spec, frame));
  }
  if (merged.length === 0) return null;
  const gone = new Set(); for (const m of merged) for (const t of m.members) gone.add(t.key);
  return [...cur.filter((t) => !gone.has(t.key)), ...merged];
}

/** exact all-pairs check ACROSS groups: the set of group indices involved in a conflict (chip vs chip, or a chip covering a foreign true position) */
function crossConflicts(groups, spec, cfg) {
  const gap = spec.gap; const bad = new Set(); if (groups.length < 2) return bad;
  const occ = new Occ(64);
  groups.forEach((g, gi) => {
    for (const p of g.res.placed) { p.chip._g = gi; occ.add(p.chip); }
    if (cfg.pinProtect) for (const t of g.res.tiles) { const r = pinRect(t, spec); r._g = gi; occ.add(r); }
  });
  groups.forEach((g, gi) => {
    for (const p of g.res.placed) {
      occ.query(p.chip.x0 - gap - 1, p.chip.y0 - gap - 1, p.chip.x1 + gap + 1, p.chip.y1 + gap + 1, (o) => {
        if (o._g === gi || o.owner === p.t.key) return;
        const dx = Math.max(p.chip.x0 - o.x1, o.x0 - p.chip.x1); const dy = Math.max(p.chip.y0 - o.y1, o.y0 - p.chip.y1);
        if (Math.max(dx, dy) < gap - EPS) { bad.add(gi); bad.add(o._g); }
      });
    }
  });
  return bad;
}

/** One frame.  cfg: { spec, z, dMax, pinProtect, inertia, sticky, seniority, labels, aggregate, dt (frame equivalents), static }
 *  returns { placed:[{t,cx,cy,off,chip,label,displaced}], dropped:[tile], rounds, items, labelsShown, ms, stats } */
export function solve(all, leaves, cfg, state) {
  const spec = cfg.spec; const gap = spec.gap; const t0 = performance.now();
  const dt = cfg.dt ?? 1; const frame = state.time; state.time += dt; state.solves++;
  const stats = { nf: 0, cand: 0 };
  // ---- A. initial tile set: leaves, plus the aggregates of the previous frame (sticky) ------------------------------------------------------
  let tiles = leaves.map((t) => ({ ...t }));
  const tentative = new Map();             // leaf id -> { k, ids }  (members of an aggregate whose split is being tried this frame)
  if (cfg.aggregate && cfg.sticky) {
    const leafById = new Map(tiles.filter((t) => t.kind === 'leaf').map((t) => [t.ids[0], t])); const nonLeaf = tiles.filter((t) => t.kind !== 'leaf');
    const keep = []; const due = [];
    for (const [k, rec] of state.aggs) {
      const ids = rec.ids.filter((id) => leafById.has(id));
      if (ids.length < 2) continue;                                   // fewer than two members left: the aggregate dissolves
      if (frame >= rec.next) due.push({ k, rec, ids }); else keep.push({ k, rec, ids });
    }
    due.sort((x, y) => x.rec.next - y.rec.next || (x.k < y.k ? -1 : 1));       // split trials are staggered: at most maxSplitTries aggregates per frame
    const tries = spec.maxSplitTries ?? 2;
    due.forEach((d, i) => { if (i < tries) { for (const id of d.ids) tentative.set(id, { k: d.k, ids: d.ids }); } else keep.push(d); });
    const aggs = [];
    for (const d of keep) {
      const members = d.ids.map((id) => leafById.get(id));
      const agg = makeAggregate(all, members, spec, d.rec.created); agg.next = d.rec.next;
      for (const id of d.ids) leafById.delete(id);
      aggs.push(agg);
    }
    tiles = [...leafById.values(), ...nonLeaf, ...aggs];
  }
  // ---- B. per group of interacting tiles: place, on failure aggregate and place again; then CERTIFY across groups -------------------------------
  let rounds = 0; const placedAll = []; const droppedAll = [];
  const solveGroup = (cur) => {
    for (let guard = 0; ; guard++) {
      rounds++;
      const { placed, failed } = placePass(cur, cfg, state, tentative, dt, stats);
      if (failed.length === 0) return { tiles: cur, placed, dropped: [] };
      if (!cfg.aggregate) return { tiles: cur, placed, dropped: failed };
      const next = mergeFailures(all, cur, failed, cfg, tentative, frame);
      if (!next) {                                                         // only possible when the group is a single tile: no obstacle exists inside the group
        if (cur.length !== 1) throw new Error('no merge partner in a group of ' + cur.length + ' tiles: invariant violated');
        const t = cur[0]; const rect = chipRect(t, t.ax, t.ay); rect.owner = t.key; rect.kind = 'chip';
        return { tiles: cur, placed: [{ t, cx: t.ax, cy: t.ay, off: { ox: 0, oy: 0 }, chip: rect, label: null }], dropped: [] };
      }
      cur = next;
      if (guard > 5000) throw new Error('aggregation did not terminate');
    }
  };
  let groups = components(tiles, cfg.dMax, gap).map((g) => ({ in: g, res: null }));
  let certRounds = 0;
  for (;;) {
    for (const g of groups) if (!g.res) g.res = solveGroup(g.in);
    const conflicts = crossConflicts(groups, spec, cfg);
    if (conflicts.size === 0) break;
    certRounds++;
    const keep = []; const merge = [];
    groups.forEach((g, i) => (conflicts.has(i) ? merge : keep).push(g));
    const union = []; for (const g of merge) union.push(...g.res.tiles);
    groups = [...keep, { in: union, res: null }];
    if (certRounds > 500) throw new Error('certification did not terminate');
  }
  for (const g of groups) { placedAll.push(...g.res.placed); droppedAll.push(...g.res.dropped); }
  stats.certRounds = certRounds;
  // ---- C. bookkeeping: aggregate records, offsets for inertia ------------------------------------------------------------------------------------
  if (cfg.aggregate) {
    const next = new Map();
    for (const p of placedAll) if (p.t.kind === 'agg') next.set(p.t.key, { ids: p.t.ids, created: p.t.createdFrame ?? frame, next: p.t.next ?? (frame + spec.splitDwell + hashJitter(p.t.key, Math.max(1, Math.round(spec.splitDwell)))) });
    state.aggs = next;
  }
  const nextOff = new Map(); for (const p of placedAll) nextOff.set(p.t.key, p.off); state.off = nextOff;
  { const na = new Map(); for (const p of placedAll) na.set(p.t.key, (state.age.get(p.t.key) ?? -1) + dt); state.age = na; }
  // ---- D. labels (secondary): best effort in the free space left by every chip and pin -----------------------------------------------------------
  const occ2 = new Occ(64);
  for (const p of placedAll) { p.displaced = Math.hypot(p.off.ox, p.off.oy) > 1.5; occ2.add(p.chip); if (p.displaced) occ2.add(pinRect(p.t, spec)); }
  const labelNext = new Map(); let labelsShown = 0;
  if (cfg.labels && cfg.z >= spec.labelMinZoom) {
    const order = placedAll.filter((p) => p.t.kind === 'leaf').sort((a, b) => b.t.prio - a.t.prio || (a.t.key < b.t.key ? -1 : 1));
    const tryPlace = (p, slots) => {
      for (const s of slots) { const r = labelRect(p.t, p.cx, p.cy, s, spec); if (rectFree(r, occ2, p.t.key, gap)) { r.owner = p.t.key; r.kind = 'label'; occ2.add(r); return { slot: s, rect: r }; } }
      return null;
    };
    const prevL = state.label;
    for (const p of order) {            // pass A: labels shown last frame keep their slot (or move to another one) while they fit
      const pl = prevL.get(p.t.key);
      if (pl && pl.vis) { const got = tryPlace(p, [pl.slot, ...SLOTS.filter((s) => s !== pl.slot)]); if (got) { p.label = got; labelNext.set(p.t.key, { slot: got.slot, vis: true, feas: 999 }); } }
    }
    for (const p of order) {            // pass B: new labels appear only after labelShowDelay frame-equivalents of continuous feasibility
      if (p.label) continue;
      const pl = prevL.get(p.t.key);
      const probe = SLOTS.some((s) => rectFree(labelRect(p.t, p.cx, p.cy, s, spec), occ2, p.t.key, gap));
      const feas = probe ? ((pl && !pl.vis ? pl.feas : 0) + dt) : 0;
      if (probe && (cfg.static || feas >= spec.labelShowDelay)) { const got = tryPlace(p, SLOTS); if (got) { p.label = got; labelNext.set(p.t.key, { slot: got.slot, vis: true, feas: 999 }); continue; } }
      labelNext.set(p.t.key, { slot: pl?.slot || 'r', vis: false, feas });
    }
  }
  state.label = labelNext;
  // ---- E. render items for the independent verifier ----------------------------------------------------------------------------------------------
  const items = [];
  for (const p of placedAll) {
    items.push({ owner: p.t.key, kind: 'chip', ...plain(p.chip) });
    if (p.label) { labelsShown++; items.push({ owner: p.t.key, kind: 'label', ...plain(p.label.rect) }); }
    if (p.displaced) items.push({ owner: p.t.key, kind: 'pin', ...plain(pinRect(p.t, spec)) });
  }
  const assign = new Map(); for (const p of placedAll) for (const id of p.t.ids) assign.set(id, p.t.key);
  state.assign = assign;
  return { placed: placedAll, dropped: droppedAll, rounds, items, labelsShown, ms: performance.now() - t0, stats };
}
