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
const strip = [];                                               // scratch: the forbidden rects whose x-range contains the column being scanned (the same predicate as free(), split in two, so a column is filtered once and not once per candidate row)
let HT = new Float64Array(1024); let HS = new Uint32Array(1024); let HG = 0;     // scratch open-addressing set for the 1e-5 de-duplication
const nextGen = (n) => { if (n * 4 > HT.length) { let m = HT.length; while (m < n * 4) m *= 2; HT = new Float64Array(m); HS = new Uint32Array(m); HG = 0; } if (++HG >= 4294967295) { HS.fill(0); HG = 1; } return HG; };
const HOLD_PX = 0.75;

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
    // key = the four edges rounded to 1e-4 px relative to the anchor, packed in two numbers (the old string key cost a third of the solve at the whole-field view)
    const seen = new Map(); let rare = null; let w = 0; const OFF = 4194304; const S = 8388608;
    for (let i = 0; i < F.length; i++) {
      const f = F[i]; const k1 = (Math.round((f.x0 - A.x) * 1e4) + OFF) * S + (Math.round((f.x1 - A.x) * 1e4) + OFF); const k2 = (Math.round((f.y0 - A.y) * 1e4) + OFF) * S + (Math.round((f.y1 - A.y) * 1e4) + OFF);
      const v = seen.get(k1);
      if (v === undefined) seen.set(k1, k2);
      else if (v === k2) continue;
      else { if (!rare) rare = new Set(); const k = k1 + ',' + k2; if (rare.has(k)) continue; rare.add(k); }
      F[w++] = f;
    }
    F.length = w;
  }
  const free = (x, y) => { for (let i = 0; i < F.length; i++) { const f = F[i]; if (x > f.x0 + EPS && x < f.x1 - EPS && y > f.y0 + EPS && y < f.y1 - EPS) return false; } return true; };
  if (Math.hypot(P0.x - A.x, P0.y - A.y) <= dMax + EPS && free(P0.x, P0.y)) return { x: P0.x, y: P0.y };
  if (F.length > kCap) { if (stats) stats.kcapFails = (stats.kcapFails || 0) + 1; return null; }   // saturated neighbourhood: conservative failure (never an overlap)
  const X = [P0.x]; const Y = [P0.y];
  for (const f of F) { X.push(f.x0, f.x1); Y.push(f.y0, f.y1); }
  // candidate columns and rows: de-duplicated to 1e-5 px (first one wins), then only those that can be tested at all (inside the displacement circle's bounding box and the move limit), then
  // delivered in order of increasing distance from the desired centre (ties in insertion order, as the stable sort did).  The order is produced lazily by a heap: the loop below almost always
  // stops after the first few, so a full sort of every candidate (a quarter of the whole-field frame) was wasted.  A dropped value could only ever have been skipped by the tests below.
  const lim = dMax + EPS;
  const axis = (a, c, c0) => {
    const u = []; const d = []; const g = nextGen(a.length); const mask = HT.length - 1;
    for (let i = 0; i < a.length; i++) {
      const v = a[i]; const k = Math.round(v * 1e5); let h = (Math.imul(k | 0, 0x9E3779B1) >>> 7) & mask; let dup = false;
      while (HS[h] === g) { if (HT[h] === k) { dup = true; break; } h = (h + 1) & mask; }
      if (dup) continue; HS[h] = g; HT[h] = k;
      if (Math.abs(v - c0) > lim) continue; const dv = Math.abs(v - c); if (dv > maxMove) continue; u.push(v); d.push(dv);
    }
    const n = u.length; const hp = new Array(n); for (let i = 0; i < n; i++) hp[i] = i; let size = n; const out = [];
    const less = (p, q2) => d[p] < d[q2] || (d[p] === d[q2] && p < q2);
    const down = (i) => { const x = hp[i]; for (;;) { let c = 2 * i + 1; if (c >= size) break; if (c + 1 < size && less(hp[c + 1], hp[c])) c++; if (!less(hp[c], x)) break; hp[i] = hp[c]; i = c; } hp[i] = x; };
    for (let i = (n >> 1) - 1; i >= 0; i--) down(i);
    return { out, more: (k) => { while (out.length <= k && size > 0) { out.push(u[hp[0]]); size--; if (size > 0) { hp[0] = hp[size]; down(0); } } return out.length > k; } };
  };
  const xo = axis(X, P0.x, A.x); const yo = axis(Y, P0.y, A.y);
  let best = Infinity; let out = null; let tested = 0;           // branch and bound over X x Y in order of increasing |dx| / |dy|
  for (let i = 0; xo.more(i); i++) {
    const x = xo.out[i]; const dx = Math.abs(x - P0.x); if (dx >= best || dx > maxMove) break;
    strip.length = 0; for (let k = 0; k < F.length; k++) { const f = F[k]; if (x > f.x0 + EPS && x < f.x1 - EPS) strip.push(f); }
    for (let j = 0; yo.more(j); j++) {
      const y = yo.out[j]; const dy = Math.abs(y - P0.y); const d = Math.hypot(dx, dy); if (d >= best || d > maxMove) break;
      if (Math.hypot(x - A.x, y - A.y) > dMax + EPS) continue;
      tested++;
      let ok = true; for (let k = 0; k < strip.length; k++) { const f = strip[k]; if (y > f.y0 + EPS && y < f.y1 - EPS) { ok = false; break; } }
      if (ok) { best = d; out = { x, y }; break; }
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
// FORK: the pin guards the TRUE position (t.px, t.py: where the pip or the foot of the staff stands), not the anchor of the box (t.ax, t.ay), which is only where the box hangs when the mark stands on its place
export const pinRect = (t, spec, kind = 'pin') => { const x = t.px ?? t.ax; const y = t.py ?? t.ay; return { x0: x - spec.pinHalf, y0: y - spec.pinHalf, x1: x + spec.pinHalf, y1: y + spec.pinHalf, owner: t.key, kind }; };
export const plain = (r) => ({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });

// ---- neighbourhood signatures (the REST LATCH) --------------------------------------------------------------------------------------------------------
// Measured on the real data (tmp/pitch-anim/assemble, paused, camera still): the sticky split trials never settled.  The Angle at zoom 14 changed its aggregate set 347 times in 60 s
// (a limit cycle: a split succeeds, the neighbours that were pushed away relax into the space it freed, the new tiles no longer fit, they merge again, and the dwell timer starts the
// next trial), the whole field at zoom 13.5 needed about 40 s to quiet down.  A static picture must be static.  So a split is tried only when something in the neighbourhood of the
// aggregate has CHANGED since the aggregate last formed (or last failed a trial): a unit moved, appeared or vanished, the zoom, the budget, a chip size or the selection changed.
// While the picture is still the ratchet only ever merges (the tile count falls, so it terminates); the first change releases the trials again.  The signature is an order-independent
// hash of the quantised anchors, chip widths and priorities of every leaf within the interaction radius of the aggregate's members.
const FNV = new Map();
const hstr = (s) => { let h = FNV.get(s); if (h === undefined) { h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0; if (FNV.size < 20000) FNV.set(s, h); } return h; };
const mix = (a, b) => { let x = Math.imul((a ^ b) >>> 0, 0x9E3779B1); x ^= x >>> 15; x = Math.imul(x, 0x85EBCA6B); return (x ^ (x >>> 13)) >>> 0; };
function makeSigner(leaves, cfg, spec) {
  let maxDiag = 0; for (const t of leaves) maxDiag = Math.max(maxDiag, Math.hypot(t.chipW, t.chipH));
  const cell = 2 * cfg.dMax + maxDiag + spec.gap + 1; const grid = new Map(); const lh = new Map();
  const base = mix(hstr(`${cfg.dMax}|${spec.gap}|${spec.band}|${spec.kCap}|${spec.chipH}|${spec.labels}|${cfg.z.toFixed(3)}|${cfg.pinProtect}`), 7);
  for (const t of leaves) {
    const h = mix(mix(mix(hstr(t.key), Math.round(t.ax * 4) | 0), mix(Math.round(t.ay * 4) | 0, Math.round(t.chipW * 2) | 0)), Math.round(t.prio) | 0);
    lh.set(t.key, h); const k = Math.floor(t.ax / cell) + ',' + Math.floor(t.ay / cell); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(t);
  }
  const byId = new Map(leaves.map((t) => [t.ids[0], t]));
  return (ids) => {
    const seen = new Set(); let acc = base;
    for (const id of ids) {
      const m = byId.get(id); if (!m) continue; const cx = Math.floor(m.ax / cell); const cy = Math.floor(m.ay / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = grid.get((cx + dx) + ',' + (cy + dy)); if (!a) continue; for (const t of a) if (!seen.has(t.key)) { seen.add(t.key); acc = (acc + lh.get(t.key)) >>> 0; } }
    }
    return mix(acc, seen.size);
  };
}

const hashJitter = (str, mod) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % mod; };

export function newState() { return { time: 0, solves: 0, age: new Map(), off: new Map(), tgt: new Map(), splits: new Map(), aggs: new Map(), label: new Map(), assign: new Map() }; }

/** connected components of tiles under the interaction radius: tiles in different components cannot influence each other's chip placement */
function components(tiles, dMax, gap) {
  const diag = tiles.map((t) => Math.hypot(t.chipW, t.chipH)); let maxDiag = 0; for (const d of diag) maxDiag = Math.max(maxDiag, d);
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
        const R = 2 * dMax + 0.5 * (diag[i] + diag[j]) + gap; const ddx = u.ax - t.ax; const ddy = u.ay - t.ay; const d2 = ddx * ddx + ddy * ddy;     // squared compare, the hypot only on the knife edge
        if (d2 < (R - 1e-6) * (R - 1e-6) || (d2 <= (R + 1e-6) * (R + 1e-6) && Math.hypot(ddx, ddy) < R)) parent[find(i)] = find(j);
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
    let c = nearestFree(part, A, P0, budget, occ, t.key, gap, stats, spec.kCap, po && spec.continuity > 0 ? spec.continuity * Math.max(1, dt) : Infinity);
    if (!c) { failed.push(t); continue; }
    // TARGET HOLD.  A tile that is settled must keep the SAME target: the relaxation (2 px per frame toward the true position, clipped by the neighbours) makes the nearest free point creep along an
    // obstacle's edge by thousandths of a pixel, so a still picture never came to rest (measured: 150 to 200 tiles with a target 0.3 to 0.7 px off their offset, for ever).  When the new target is
    // within HOLD_PX of the previous one, and the previous one is still free, the previous one stays.
    if (!cfg.static && po) {
      const pt = state.tgt && state.tgt.get(t.key);
      if (pt) { const Q = { x: A.x + pt.ox, y: A.y + pt.oy }; const dq = Math.hypot(c.x - Q.x, c.y - Q.y); if (dq > 0 && dq < HOLD_PX && Math.hypot(pt.ox, pt.oy) <= budget + EPS) { const keep = nearestFree(part, A, Q, budget, occ, t.key, gap, null, spec.kCap); if (keep && keep.x === Q.x && keep.y === Q.y) c = Q; } }
    }
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
    let signer = null; const sigOf = (ids) => (signer || (signer = makeSigner(leaves, cfg, spec)))(ids);
    for (const [k, rec] of state.aggs) {
      const ids = rec.ids.filter((id) => leafById.has(id));
      if (ids.length < 2) continue;                                   // fewer than two members left: the aggregate dissolves
      if (frame >= rec.next) {
        if (cfg.restLatch !== false && rec.sig !== undefined && ids.length === rec.ids.length && sigOf(ids) === rec.sig) { rec.next = frame + Math.max(1, spec.splitDwell); keep.push({ k, rec, ids }); stats.latched = (stats.latched || 0) + 1; }   // nothing around it changed: no trial
        else due.push({ k, rec, ids });
      } else keep.push({ k, rec, ids });
    }
    stats.sigOf = sigOf;
    due.sort((x, y) => x.rec.next - y.rec.next || (x.k < y.k ? -1 : 1));       // split trials are staggered: at most maxSplitTries aggregates per frame
    const tries = spec.maxSplitTries ?? 2;
    due.forEach((d, i) => { if (i < tries) { for (const id of d.ids) tentative.set(id, { k: d.k, ids: d.ids }); } else keep.push(d); });
    const aggs = [];
    for (const d of keep) {
      const members = d.ids.map((id) => leafById.get(id));
      const agg = makeAggregate(all, members, spec, d.rec.created); agg.next = d.rec.next; agg.sig = d.rec.sig;
      for (const id of d.ids) leafById.delete(id);
      aggs.push(agg);
    }
    tiles = [...leafById.values(), ...nonLeaf, ...aggs];
  }
  // ---- B. per group of interacting tiles: place, on failure aggregate and place again; then CERTIFY across groups -------------------------------
  let rounds = 0; const placedAll = []; const droppedAll = [];
  // a split that succeeded is only kept when it would also hold once the neighbours have settled: the neighbours of an aggregate were pushed away by its chip and relax back into the space a split
  // frees, so a split that fits NOW can fail a few frames later (measured: 1 to 20 frames).  The look-ahead places the group once more from the true anchors (no inertia: everyone settled) and,
  // if any tile fails, keeps the aggregates instead.  One extra pass, only in a frame that has a successful trial.
  const remergeTentative = (cur) => {
    const groups = new Map(); for (const t of cur) if (t.kind === 'leaf') { const tent = tentative.get(t.ids[0]); if (tent) { let g = groups.get(tent.k); if (!g) groups.set(tent.k, g = []); g.push(t); } }
    if (!groups.size) return null; const gone = new Set(); const merged = [];
    for (const group of groups.values()) { for (const g of group) tentative.delete(g.ids[0]); if (group.length >= 2) { for (const g of group) gone.add(g.key); merged.push(makeAggregate(all, group, spec, frame)); } }
    return merged.length ? [...cur.filter((t) => !gone.has(t.key)), ...merged] : null;
  };
  const solveGroup = (cur) => {
    for (let guard = 0; ; guard++) {
      rounds++;
      const { placed, failed } = placePass(cur, cfg, state, tentative, dt, stats);
      if (failed.length === 0) {
        if (cfg.splitLookahead !== false && cur.some((t) => t.kind === 'leaf' && tentative.has(t.ids[0]))) {
          const cold = placePass(cur, { ...cfg, inertia: false }, state, tentative, dt, stats); stats.lookaheads = (stats.lookaheads || 0) + 1;
          if (cold.failed.length > 0) { const keepAgg = remergeTentative(cur); if (keepAgg) { stats.splitsRefused = (stats.splitsRefused || 0) + 1; cur = keepAgg; continue; } }
        }
        return { tiles: cur, placed, dropped: [] };
      }
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
    const next = new Map(); let sigFn = null; const BACKOFF_WINDOW = 1800; const BACKOFF_CAP = 1200;
    // SPLIT BACKOFF.  A trial whose members stayed leaves is a split; an aggregate that forms again from members split less than 30 s ago is a failed split, and each repeat doubles the wait
    // before the next trial (the dwell, then 2x, 4x ... at most 20 s), so a cluster that cannot hold its split stops flickering instead of trying every second.
    if (!state.splits) state.splits = new Map();
    for (const [id] of tentative) { const prev = state.splits.get(id); state.splits.set(id, { frame, k: prev && frame - prev.frame < BACKOFF_WINDOW ? prev.k : 0 }); }
    for (const p of placedAll) if (p.t.kind === 'agg') {
      let sig = p.t.sig; if (sig === undefined && cfg.restLatch !== false) { if (!sigFn) sigFn = stats.sigOf || makeSigner(leaves, cfg, spec); sig = sigFn(p.t.ids); }           // a newly formed aggregate: the neighbourhood as it is NOW
      let nextAt = p.t.next;
      if (nextAt === undefined) {
        let k = -1; for (const id of p.t.ids) { const r = state.splits.get(id); if (r && frame - r.frame < BACKOFF_WINDOW) k = Math.max(k, r.k); }
        const wait = k >= 0 && cfg.splitBackoff !== false ? Math.min(BACKOFF_CAP, spec.splitDwell * 2 ** (k + 1)) : spec.splitDwell;
        if (k >= 0) for (const id of p.t.ids) { const r = state.splits.get(id); state.splits.set(id, { frame: r ? r.frame : frame, k: k + 1 }); }
        nextAt = frame + wait + hashJitter(p.t.key, Math.max(1, Math.round(spec.splitDwell)));
      }
      next.set(p.t.key, { ids: p.t.ids, created: p.t.createdFrame ?? frame, next: nextAt, sig });
    }
    if (state.splits.size > 600) for (const [id, r] of state.splits) if (frame - r.frame >= BACKOFF_WINDOW) state.splits.delete(id);
    { let sg = 0; for (const [k, r] of next) sg = (sg + mix(hstr(k), r.ids.length)) >>> 0; if (sg !== state.aggSig || next.size !== state.aggCount) { state.stamp = (state.stamp || 0) + 1; state.aggSig = sg; state.aggCount = next.size; } }   // the aggregate set changed: the engine keeps stepping until the next trials have had their chance
    state.aggs = next;
  }
  const nextOff = new Map(); const nextTgt = new Map(); for (const p of placedAll) { nextOff.set(p.t.key, { ox: p.off.ox, oy: p.off.oy }); nextTgt.set(p.t.key, { ox: p.off.ox, oy: p.off.oy }); } state.off = nextOff; state.tgt = nextTgt;      // copies: the display layer writes the picture it shows into state.off, the result keeps the solver's own targets
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
