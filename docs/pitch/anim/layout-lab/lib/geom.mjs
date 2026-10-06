// layout-lab/lib/geom.mjs  - rectangles, a spatial hash, and the INDEPENDENT overlap verifier.
// The verifier shares no code with any solver: it receives the final render items and tests every unordered pair.

/** rect = {x0,y0,x1,y1}.  Clearance between two rects (negative = penetration depth along the shallowest axis). */
export function clearance(a, b) {
  const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1);
  if (dx > 0 && dy > 0) return Math.hypot(dx, dy);
  return Math.max(dx, dy);          // <= 0 : touching or overlapping (max of the two axis gaps)
}
export const intersects = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Verify a rendered frame.
 *  items: [{ owner, kind:'chip'|'label'|'pin', x0,y0,x1,y1 }]
 *  Rules (see 06-layout.md section 2): for two items of DIFFERENT owners
 *     chip-chip, chip-label, label-label, chip-pin, label-pin must not intersect (overlap = 0); clearance < gap is reported separately.
 *     pin-pin is exempt (two true positions may coincide; they are points, not tiles).
 *  Returns { overlaps, clearanceViolations, byKind, worst } (counts of unordered pairs, brute force O(n^2)).  */
export function verifyFrame(items, gap = 2, collect = false) {
  const n = items.length; let overlaps = 0; let clr = 0; let worst = 0; const byKind = {}; const pairs = [];
  // sort by x0 for an early exit (still exact: every pair whose x-ranges can touch is tested)
  const idx = items.map((_, i) => i).sort((a, b) => items[a].x0 - items[b].x0);
  for (let ii = 0; ii < n; ii++) {
    const a = items[idx[ii]];
    for (let jj = ii + 1; jj < n; jj++) {
      const b = items[idx[jj]];
      if (b.x0 >= a.x1 + gap) break;                 // sorted by x0: nothing further can be within `gap` in x
      if (a.owner === b.owner) continue;
      if (a.kind === 'pin' && b.kind === 'pin') continue;
      const c = clearance(a, b);
      if (c < 0 || (c === 0 && intersects(a, b))) { overlaps++; if (collect) pairs.push([idx[ii], idx[jj]]); const key = a.kind < b.kind ? a.kind + '+' + b.kind : b.kind + '+' + a.kind; byKind[key] = (byKind[key] || 0) + 1; worst = Math.max(worst, -c); }
      else if (c < gap) clr++;
    }
  }
  return { overlaps, clearanceViolations: clr, byKind, worstPenetration: worst, pairs };
}

/** brute-force reference (no sorting, no early exit) used by the self-test to cross-check verifyFrame */
export function verifyFrameBrute(items, gap = 2) {
  let overlaps = 0; let clr = 0;
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i]; const b = items[j];
    if (a.owner === b.owner) continue; if (a.kind === 'pin' && b.kind === 'pin') continue;
    const c = clearance(a, b);
    if (intersects(a, b)) overlaps++; else if (c < gap) clr++;
  }
  return { overlaps, clearanceViolations: clr };
}

/** uniform-grid spatial hash of rects.  The visited-stamp is GLOBAL (one counter for every Hash instance): a rect object may be stored in several
 *  hashes (chips live in the placement hash and in the label hash), so per-instance counters could collide and silently skip an obstacle. */
let STAMP = 0;
export class Hash {
  constructor(cell = 64) { this.cell = cell; this.m = new Map(); }
  add(r) { const k = (x, y) => x + ',' + y; const c = this.cell; const x0 = Math.floor(r.x0 / c); const x1 = Math.floor(r.x1 / c); const y0 = Math.floor(r.y0 / c); const y1 = Math.floor(r.y1 / c);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const key = k(x, y); let a = this.m.get(key); if (!a) this.m.set(key, a = []); a.push(r); } }
  /** call cb(rect) once for every stored rect whose cells touch the query box */
  query(x0, y0, x1, y1, cb) {
    const c = this.cell; const s = ++STAMP;
    const cx0 = Math.floor(x0 / c); const cx1 = Math.floor(x1 / c); const cy0 = Math.floor(y0 / c); const cy1 = Math.floor(y1 / c);
    for (let x = cx0; x <= cx1; x++) for (let y = cy0; y <= cy1; y++) {
      const a = this.m.get(x + ',' + y); if (!a) continue;
      for (const r of a) { if (r._s === s) continue; r._s = s; cb(r); }
    }
  }
}
