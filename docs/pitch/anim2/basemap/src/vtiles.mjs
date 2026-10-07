// vtiles.mjs - the vector layers (water, streams, contours, roads, rail) baked into bitmap tiles, so a moving camera pays for a few image draws instead of thousands of stroked paths.
//
// Why: stroking ~500 road polylines and ~1,000 contour lines costs the GPU more than the whole aerial (measured: at DPR 2 a frame with live vectors is 37 ms, without roads and contours 20 ms,
// README section 7.5): the cost is in rasterising big stroked paths every frame, and it grows with the square of the device pixel ratio.  Baked once per tile, the same lines are drawn as images.
//
// How: the tile grid of level L = floor(zq), zq = the camera zoom rounded to a half level (`step`), each tile a bitmap of 512 * 2^(zq - L) css px at the device pixel ratio, with a 4 px gutter of the
// real neighbouring lines all round, line widths and alphas taken from the look at zoom zq.  A tile is drawn scaled by 2^(zoom - zq) (at most 19 % either way: lines 0.3 to 0.6 px thinner or thicker
// than the formula, no visible step when zq changes).  A tile that is not baked yet is replaced by the nearest baked one (another half level, or the parent level) clipped to its cell, so there is
// never a hole and never a double line; baking is limited per frame by PIXELS, not by milliseconds (never fewer than one tile): recording a bake costs the main thread under a millisecond, but the GPU then rasterises the strokes, 20 to 30 ms for a DPR 2 tile, and four bakes in one frame were measured as a 128 ms stall.  Labels are not baked: text is cheap and must stay sharp.
const G = 4;                                                                // gutter, device px
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class VectorTiles {
  /** vectors: the Vectors instance whose draw() renders into a view; options: { step: 0.5, maxBytes: 160e6, bakePx: 0.6e6 (device px baked per frame: one DPR 2 tile, two DPR 1 tiles) } */
  constructor(vectors, options = {}) {
    this.v = vectors; this.step = options.step || 0.5; this.maxBytes = options.maxBytes || 160e6; this.bakePx = options.bakePx || 0.6e6;
    this.map = new Map(); this.bytes = 0; this.frameNo = 0; this.stat = { baked: 0, msBake: 0, fallbacks: 0 };
  }
  qz(z) { return Math.round(z / this.step) * this.step; }
  keyOf(look, vopts, L, qz, x, y, dpr) { return look.id + ':' + (look.version || 0) + '|' + vopts + '|' + L + '|' + qz + '|' + x + '|' + y + '|' + dpr; }

  bake(look, opts, L, qz, x, y, dpr, mk) {
    const t0 = now(); const k = 2 ** (qz - L); const inner = Math.max(1, Math.round(512 * k * dpr)); const sc = inner / (512 * k);          // device px per css px at zoom qz
    const P = inner + 2 * G; const c = mk(P, P); const g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0);
    const gc = G / sc;                                                                                                                         // the gutter in css px
    this.v.draw(g, { z: qz, w: P / sc, h: P / sc, ox: x * 512 * k - gc, oy: y * 512 * k - gc }, look, opts, sc);
    this.stat.baked++; this.stat.msBake += now() - t0; this.bytes += P * P * 4;
    return { canvas: c, L, qz, x, y, inner, last: this.frameNo, bytes: P * P * 4 };
  }

  /** draw entry e into the frame; `clip` = the cell { x, y, s } (screen css px) when e only stands in for it */
  put(g, e, view, dpr, clip) {
    const size = 512 * 2 ** (view.z - e.L); const dx = e.x * size - view.ox, dy = e.y * size - view.oy;
    const sc = size / e.inner; const bl = Math.min(G, 0.5 / dpr / sc);                                                                          // half a device px of the screen as overdraw, taken from the gutter
    if (clip) { g.save(); g.beginPath(); g.rect(clip.x, clip.y, clip.s, clip.s); g.clip(); }
    g.drawImage(e.canvas, G, G, e.inner + bl, e.inner + bl, dx, dy, size + bl * sc, size + bl * sc);
    if (clip) g.restore();
  }

  /** the nearest baked stand-in for cell (x, y) of level L: the other half level of the same octave, then the parent octave */
  fallback(look, vopts, L, qz, x, y, dpr) {
    const tryK = (L2, q2, x2, y2) => { const e = this.map.get(this.keyOf(look, vopts, L2, q2, x2, y2, dpr)); return e || null; };
    let e = null;
    for (let q = L; q < L + 1 - 1e-9 && !e; q += this.step) if (Math.abs(q - qz) > 1e-9) e = tryK(L, q, x, y);
    if (!e && L > 0) for (let q = L - 1; q < L - 1e-9 && !e; q += this.step) e = tryK(L - 1, q, x >> 1, y >> 1);
    return e;
  }

  /** paint the vector layers into g (css px, the context's scale is kept).  Returns true while tiles are still missing (draw again next frame). */
  paint(g, view, look, opts, dpr, mk, force) {
    this.frameNo++;
    const vopts = (opts.water !== false ? 1 : 0) + '' + (opts.contours !== false ? 1 : 0) + (opts.roads !== false ? 1 : 0);
    const qz = this.qz(view.z); const L = Math.max(0, Math.floor(qz + 1e-9)); const ts = 512 * 2 ** (view.z - L);
    const x0 = Math.floor(view.ox / ts), x1 = Math.floor((view.ox + view.w) / ts), y0 = Math.floor(view.oy / ts), y1 = Math.floor((view.oy + view.h) / ts);
    const vo = { water: opts.water, contours: opts.contours, roads: opts.roads };
    const budget = force ? Infinity : this.bakePx; let spent = 0, baked = 0, more = false;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const key = this.keyOf(look, vopts, L, qz, tx, ty, dpr); let e = this.map.get(key);
        if (!e) {
          const fb = this.fallback(look, vopts, L, qz, tx, ty, dpr);
          if ((fb && baked > 0 && spent >= budget) || (!fb && baked > 0 && spent >= budget * 2)) { if (fb) { e = fb; this.stat.fallbacks++; } more = true; if (!e) continue; this.put(g, e, view, dpr, { x: tx * ts - view.ox, y: ty * ts - view.oy, s: ts }); e.last = this.frameNo; continue; }
          e = this.bake(look, vo, L, qz, tx, ty, dpr, mk); spent += e.bytes / 4; baked++; this.map.set(key, e);
        }
        e.last = this.frameNo; this.put(g, e, view, dpr, null);
      }
    }
    if (this.bytes > this.maxBytes) {                                                       // evict the least recently used, never what this frame drew
      const arr = [...this.map.entries()].sort((a, b) => a[1].last - b[1].last);
      for (let i = 0; i < arr.length && this.bytes > this.maxBytes * 0.8; i++) { if (arr[i][1].last >= this.frameNo - 1) break; this.bytes -= arr[i][1].bytes; this.map.delete(arr[i][0]); }
    }
    return more;
  }
}
