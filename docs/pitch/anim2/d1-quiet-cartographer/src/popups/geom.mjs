// popups/geom.mjs - the geometry of placement, pure and DOM-free: an occupancy grid with a summed-area table, exact rectangle and segment tests, and the spot search.
//
// Why a grid: a card may be placed anywhere inside the map, so "is this rectangle free of every tile?" has to be answered thousands of times per placement.  The obstacles (chips, labels, pins,
// aggregate member dots, displaced-tile leaders, chrome) are rasterised once per frame into cells of `cell` px, inflated by the clear gap; a summed-area table then answers any rectangle in four
// lookups.  The test is CONSERVATIVE BY CONSTRUCTION (a cell touched by any obstacle counts as occupied, and a query covers every cell the rectangle touches), so "free" can only be wrong in
// the safe direction.  test/popups.test.mjs checks every accepted spot against an exact rectangle test that shares no code with this file.

export const rectOf = (x, y, w, h) => ({ x0: x, y0: y, x1: x + w, y1: y + h });
export const overlaps = (a, b, gap = 0) => a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap;
export const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
export const center = (r) => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
export const inflate = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
export const clampPt = (r, x, y) => [Math.max(r.x0, Math.min(r.x1, x)), Math.max(r.y0, Math.min(r.y1, y))];
/** intersection area of two rectangles */
export const overlapArea = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** does the segment (x0,y0)-(x1,y1) pass through the rectangle (Liang-Barsky)?  Touching an edge does not count. */
export function segHitsRect(x0, y0, x1, y1, r) {
  const dx = x1 - x0; const dy = y1 - y0; let t0 = 0; let t1 = 1;
  const clip = (p, q) => { if (p === 0) return q > 0; const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
  return clip(-dx, x0 - r.x0) && clip(dx, r.x1 - x0) && clip(-dy, y0 - r.y0) && clip(dy, r.y1 - y0) && t1 - t0 > 1e-9 && (r.x1 - r.x0) > 0 && (r.y1 - r.y0) > 0;
}

export class Occupancy {
  /** @param {number} w map width px  @param {number} h map height px  @param {number} cell cell size px */
  constructor(w, h, cell = 8) {
    this.w = w; this.h = h; this.cell = cell; this.cols = Math.max(1, Math.ceil(w / cell)); this.rows = Math.max(1, Math.ceil(h / cell));
    this.occ = new Uint8Array(this.cols * this.rows); this.sat = new Int32Array((this.cols + 1) * (this.rows + 1)); this.rects = []; this.built = false;
  }
  /** mark a rectangle (inflated by pad) as occupied; the raw rectangle is kept for exact tests (leader crossings) */
  add(r, pad = 0, meta = null) {
    this.rects.push(meta ? { ...r, ...meta } : r); this.built = false;
    const c = this.cell; const x0 = Math.max(0, Math.floor((r.x0 - pad) / c)); const x1 = Math.min(this.cols - 1, Math.ceil((r.x1 + pad) / c) - 1);
    const y0 = Math.max(0, Math.floor((r.y0 - pad) / c)); const y1 = Math.min(this.rows - 1, Math.ceil((r.y1 + pad) / c) - 1);
    for (let y = y0; y <= y1; y++) { const o = y * this.cols; for (let x = x0; x <= x1; x++) this.occ[o + x] = 1; }
  }
  build() {
    const { cols, rows, occ, sat } = this; const W = cols + 1;
    for (let y = 0; y < rows; y++) { let run = 0; for (let x = 0; x < cols; x++) { run += occ[y * cols + x]; sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + run; } }
    this.built = true;
  }
  /** is the rectangle (x, y, w, h) inside the map and free of every occupied cell it touches? */
  isFree(x, y, w, h) {
    if (!this.built) this.build();
    if (x < 0 || y < 0 || x + w > this.w + 1e-6 || y + h > this.h + 1e-6) return false;
    const c = this.cell; const x0 = Math.floor(x / c); const x1 = Math.min(this.cols, Math.ceil((x + w) / c)); const y0 = Math.floor(y / c); const y1 = Math.min(this.rows, Math.ceil((y + h) / c));
    const W = this.cols + 1; const s = this.sat;
    return s[y1 * W + x1] - s[y0 * W + x1] - s[y1 * W + x0] + s[y0 * W + x0] === 0;
  }
  /** the fraction of occupied cells (for tests and the metrics) */
  load() { let n = 0; for (let i = 0; i < this.occ.length; i++) n += this.occ[i]; return n / this.occ.length; }
}

/** how many of the occupancy's raw rectangles (other than `skipOwner`) a straight line from a to b crosses */
export function crossings(occ, ax, ay, bx, by, skipOwner) {
  let n = 0; const minx = Math.min(ax, bx) - 1; const maxx = Math.max(ax, bx) + 1; const miny = Math.min(ay, by) - 1; const maxy = Math.max(ay, by) + 1;
  for (const r of occ.rects) { if (r.x1 < minx || r.x0 > maxx || r.y1 < miny || r.y0 > maxy) continue; if (skipOwner !== undefined && r.owner === skipOwner) continue; if (r.kind === 'chrome') continue; if (segHitsRect(ax, ay, bx, by, r)) n++; }
  return n;
}

/**
 * Find the best free place for a w x h card.
 *   anchor   { x0,y0,x1,y1 } of the subject (a point is a zero-size rectangle) or null
 *   occ      Occupancy of the MAP (tiles, chrome ...), already inflated by the clear gap
 *   taken    rectangles of cards already placed this frame (exact test, with `gap`)
 *   prefer   the card's current top-left, when it has one (a small pull toward staying put)
 * Candidates: the four sides of the anchor, three alignments each (right-centre, left-centre, below, above, then slid), then every free grid position of the map.  The best of the nearest
 * few is chosen by distance to the anchor, a pull toward `prefer`, and a penalty for each tile the leader line would cross.  Returns { x, y, score, crossings } or null.
 */
export function findSpot({ w, h, anchor, occ, taken = [], gap = 8, margin = 10, prefer = null, tok = {}, skipOwner }) {
  const off = tok.offset ?? 14; const penalty = tok.crossPenalty ?? 40; const pull = tok.pull ?? 0.35; const K = tok.topK ?? 8;
  const mapW = occ.w; const mapH = occ.h; const maxX = mapW - margin - w; const maxY = mapH - margin - h; if (maxX < margin || maxY < margin) return null;
  const ac = anchor ? center(anchor) : [mapW / 2, mapH / 2];
  const ok = (x, y) => { if (x < margin || y < margin || x > maxX || y > maxY) return false; if (!occ.isFree(x, y, w, h)) return false; const r = rectOf(x, y, w, h); for (const t of taken) if (overlaps(r, t, gap)) return false; return true; };
  const score = (x, y) => {
    const cx = x + w / 2; const cy = y + h / 2; const edge = clampPt(rectOf(x, y, w, h), ac[0], ac[1]);
    let s = Math.hypot(cx - ac[0], cy - ac[1]);
    if (prefer) s += pull * Math.hypot(x - prefer.x, y - prefer.y);
    const cr = anchor ? crossings(occ, edge[0], edge[1], ac[0], ac[1], skipOwner) : 0;
    return { s: s + penalty * cr, cr };
  };
  const cands = [];
  if (anchor) {
    const a = anchor; const mx = (a.x0 + a.x1) / 2; const my = (a.y0 + a.y1) / 2;
    const pos = [[a.x1 + off, my - h / 2], [a.x0 - off - w, my - h / 2], [mx - w / 2, a.y1 + off], [mx - w / 2, a.y0 - off - h], [a.x1 + off, a.y0 - h + 4], [a.x1 + off, a.y1 - 4], [a.x0 - off - w, a.y0 - h + 4], [a.x0 - off - w, a.y1 - 4],
      [mx - w / 2, a.y1 + off + 0], [a.x0 - w + 4, a.y1 + off], [a.x1 - 4, a.y1 + off], [a.x0 - w + 4, a.y0 - off - h], [a.x1 - 4, a.y0 - off - h]];
    for (const [x, y] of pos) { const px = Math.max(margin, Math.min(maxX, x)); const py = Math.max(margin, Math.min(maxY, y)); if (ok(px, py)) cands.push({ x: px, y: py }); }
  }
  if (prefer && ok(prefer.x, prefer.y)) cands.push({ x: prefer.x, y: prefer.y });
  if (!cands.length) {
    const step = Math.max(occ.cell, tok.scanStep ?? 8); const near = [];                                              // nearest K free grid positions by plain distance, then judged by score
    for (let y = margin; y <= maxY; y += step) for (let x = margin; x <= maxX; x += step) {
      if (!ok(x, y)) continue; const d = Math.hypot(x + w / 2 - ac[0], y + h / 2 - ac[1]);
      if (near.length < K) { near.push({ x, y, d }); near.sort((p, q) => p.d - q.d); } else if (d < near[K - 1].d) { near[K - 1] = { x, y, d }; near.sort((p, q) => p.d - q.d); }
    }
    for (const n of near) cands.push({ x: n.x, y: n.y });
  }
  let best = null;
  for (const c of cands) { const sc = score(c.x, c.y); if (!best || sc.s < best.score) best = { x: c.x, y: c.y, score: sc.s, crossings: sc.cr }; }
  return best;
}

/** place a rectangle that must sit in one of the given slots, in preference order; a slot is { x, y } top-left (already inside the map).  First free slot wins. */
export function firstFreeSlot(slots, w, h, occ, taken = [], gap = 8) {
  for (const s of slots) { if (!occ.isFree(s.x, s.y, w, h)) continue; const r = rectOf(s.x, s.y, w, h); if (taken.some((t) => overlaps(r, t, gap))) continue; return { ...s }; }
  return null;
}
