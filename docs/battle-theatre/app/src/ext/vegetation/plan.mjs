// Trampling that follows the troops (requirement R20: "trampling follows documented troop movement"). The theatre knows where every drawn unit stands at every minute (the stage and the
// event cache are pure functions of time); this module asks it, step by step, which ground each formation covered, and writes down for every cell of the ground the FIRST minute any
// formation stood on it. The picture then needs nothing but that table and the clock: a cell is trampled when the clock is past its first visit, so scrubbing backward un-tramples
// exactly as it should and the same minute always gives the same ground. Pure: the provider (the stage, or a stand-in in the tests) is the only source of positions.
//
//   provider = { at(tMin, out) }   fills `out` (an array reused between calls) with one entry per formation on the field at tMin: { x, z, c, s, b0, b1, b2, b3 }
//                                  x, z the unit's place (metres of the theatre's frame), c, s the cosine and sine of its heading, b0..b3 the extents of the formation in the
//                                  unit's own frame (lateral min, lateral max, depth min, depth max), world = (x + lx c + lz s, z - lx s + lz c). Returns the number of entries.
import { clamp } from './model.mjs';

export const NEVER = 1e9;
export function makeGrid(W, H, cell) { const nx = Math.ceil(W / cell), nz = Math.ceil(H / cell); return { W, H, cell, nx, nz, x0: -W / 2, z0: -H / 2, visit: new Float32Array(nx * nz).fill(NEVER), mask: new Uint8Array(nx * nz) }; }

/** the cells whose centre lies inside a unit that can be trampled (a field, the Wheatfield, the cleared slope, an orchard's grass): the only cells the plan records */
export function rasterMask(model, project, grid, classes = ['field', 'wheatfield', 'cleared', 'orchard']) {
  const { cell, nx, nz, x0, z0 } = grid; let n = 0;
  for (const u of model.units) {
    if (!classes.includes(u.cls)) continue;
    const r = u.rings[0], ring = []; for (let i = 0; i < r.length; i += 2) ring.push(project(r[i], r[i + 1]));
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of ring) { if (x < a) a = x; if (x > c) c = x; if (z < b) b = z; if (z > d) d = z; }
    const i0 = clamp(Math.floor((a - x0) / cell), 0, nx - 1), i1 = clamp(Math.floor((c - x0) / cell), 0, nx - 1), j0 = clamp(Math.floor((b - z0) / cell), 0, nz - 1), j1 = clamp(Math.floor((d - z0) / cell), 0, nz - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell; let inside = false;
      for (let p = 0, q = ring.length - 1; p < ring.length; q = p++) { const A = ring[p], B = ring[q]; if ((A[1] > z) !== (B[1] > z) && x < (B[0] - A[0]) * (z - A[1]) / (B[1] - A[1]) + A[0]) inside = !inside; }
      if (inside && !grid.mask[j * nx + i]) { grid.mask[j * nx + i] = 1; n++; }
    }
  }
  return n;
}

/** one step: every formation of the provider at tMin marks the cells it covers (inside the mask) that no earlier step marked */
export function stepVisits(grid, entries, n, tMin) {
  const { cell, nx, nz, x0, z0, visit, mask } = grid; let marked = 0;
  for (let k = 0; k < n; k++) {
    const e = entries[k], c = e.c, s = e.s;
    const xs = [], zs = []; for (const lx of [e.b0, e.b1]) for (const lz of [e.b2, e.b3]) { xs.push(e.x + lx * c + lz * s); zs.push(e.z - lx * s + lz * c); }
    const i0 = clamp(Math.floor((Math.min(...xs) - x0) / cell), 0, nx - 1), i1 = clamp(Math.floor((Math.max(...xs) - x0) / cell), 0, nx - 1), j0 = clamp(Math.floor((Math.min(...zs) - z0) / cell), 0, nz - 1), j1 = clamp(Math.floor((Math.max(...zs) - z0) / cell), 0, nz - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const idx = j * nx + i; if (!mask[idx] || visit[idx] <= tMin) continue;
      const X = x0 + (i + 0.5) * cell - e.x, Z = z0 + (j + 0.5) * cell - e.z, lx = X * c - Z * s, lz = X * s + Z * c;
      if (lx >= e.b0 - cell * 0.35 && lx <= e.b1 + cell * 0.35 && lz >= e.b2 - cell * 0.35 && lz <= e.b3 + cell * 0.35) { visit[idx] = tMin; marked++; }
    }
  }
  return marked;
}

/** the planner: steps through [from, to] every `step` minutes, a few steps per call so that a frame is never held up; `done` says when the table is whole */
export class VisitPlanner {
  constructor(grid, provider, from, to, step = 8) { this.grid = grid; this.provider = provider; this.from = from; this.to = to; this.step = step; this.t = from; this.entries = []; this.done = false; this.steps = 0; this.marked = 0; this.version = 0; }
  /** run until the budget (ms, by `now()`) is spent or the plan is done; returns true while more is to do */
  run(budgetMs, now) {
    const t0 = now();
    while (!this.done) {
      const n = this.provider.at(this.t, this.entries); this.marked += stepVisits(this.grid, this.entries, n, this.t); this.steps++; this.t += this.step;
      if (this.t > this.to) { this.done = true; this.version++; }
      if (now() - t0 >= budgetMs) break;
    }
    return !this.done;
  }
  reset() { this.grid.visit.fill(NEVER); this.t = this.from; this.done = false; this.steps = 0; this.marked = 0; }
  /** the first-visit minute of the cell under (x, z), or NEVER */
  visitAt(x, z) { const g = this.grid, i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell); return i < 0 || j < 0 || i >= g.nx || j >= g.nz ? NEVER : g.visit[j * g.nx + i]; }
}

/**
 * The stage as a provider: the places the theatre itself draws. Reads the event cache and the presence windows exactly as Stage.apply does, and touches nothing.
 * Units that are not on the field at that minute give no entry; a unit whose formation has no extent (a staff, a flag) gives a 2 m square.
 */
export function stageProvider(stage) {
  const o2 = [0, 0, 0];
  return {
    at(tMin, out) {
      const tSec = tMin * 60, st = stage.cache.at(tSec), ids = stage.layer.units, pres = stage.presence || {}; let n = 0;
      for (let i = 0; i < stage.nL; i++) {
        const rec = st.u[i]; if (!rec) continue; const p = pres[ids[i].id]; if (p && (tSec < p.from || (p.to != null && tSec > p.to))) continue;
        stage._pos(rec, tSec, o2); const h = stage._heading(rec, tSec), bb = stage.bbox[i] || [-1, 1, -1, 1];
        const e = out[n] || (out[n] = {}); e.x = o2[0]; e.z = o2[1]; e.c = Math.cos(h); e.s = Math.sin(h); e.b0 = bb[0]; e.b1 = bb[1]; e.b2 = bb[2]; e.b3 = bb[3]; n++;
      }
      return n;
    },
  };
}
