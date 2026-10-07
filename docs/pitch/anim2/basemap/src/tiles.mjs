// tiles.mjs - a TileSet is one image layer (aerial, shade) of the 512-px pyramid: which tiles exist (a bitmask per zoom), loading with a small queue, and an LRU of decoded images.
// No network is assumed: the host supplies urlOf(layer, z, x, y) (files next to the page, or data: URIs from the pack).  A tile that is not in the manifest never produces a request.
import { TILE } from './geo.mjs';

function b64bytes(s) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class TileSet {
  /** meta = { ext, levels: { z: { x0, y0, cols, rows, bits: base64 } } } (bit i = row-major index of the tile in the level's rectangle) */
  constructor(name, meta, urlOf, opts = {}) {
    this.name = name; this.meta = meta; this.urlOf = urlOf;
    this.levels = {}; this.minZ = Infinity; this.maxZ = -Infinity;
    for (const z of Object.keys(meta.levels)) {
      const L = meta.levels[z]; const zi = +z;
      this.levels[zi] = { x0: L.x0, y0: L.y0, cols: L.cols, rows: L.rows, bits: b64bytes(L.bits) };
      this.minZ = Math.min(this.minZ, zi); this.maxZ = Math.max(this.maxZ, zi);
    }
    this.maxImages = opts.maxImages || 220; this.maxActive = opts.maxActive || 8;
    this.images = new Map();            // key -> { img, state: 0 loading | 1 ready | 2 failed, last }
    this.queue = []; this.active = 0; this.onLoad = null; this.frame = 0; this.loaded = 0; this.failed = 0; this.requested = 0;
  }
  has(z, x, y) {
    const L = this.levels[z]; if (!L) return false;
    const c = x - L.x0, r = y - L.y0; if (c < 0 || r < 0 || c >= L.cols || r >= L.rows) return false;
    const i = r * L.cols + c; return (L.bits[i >> 3] >> (i & 7) & 1) === 1;
  }
  /** the decoded image if it is ready; otherwise null (and a load is queued when the tile exists) */
  ready(z, x, y) {
    const k = z + '/' + x + '/' + y; const e = this.images.get(k);
    if (e) { e.last = this.frame; return e.state === 1 ? e.img : null; }
    if (!this.has(z, x, y)) return null;
    this.request(k, z, x, y); return null;
  }
  /** ask for a tile without needing it now (prefetch) */
  want(z, x, y) { const k = z + '/' + x + '/' + y; const e = this.images.get(k); if (e) { e.last = this.frame; return; } if (this.has(z, x, y)) this.request(k, z, x, y, true); }
  request(k, z, x, y, keep) {
    const e = { img: null, state: 0, last: this.frame, z, x, y }; this.images.set(k, e); this.queue.push({ k, z, x, y, frame: this.frame, keep: !!keep }); this.requested++; this.pump();
  }
  /** called once per drawn frame: drops queued loads nobody asked for in the last frames, evicts old images */
  tick() {
    this.frame++;
    if (this.queue.length) {
      const keep = []; for (const q of this.queue) { if (q.keep || q.frame >= this.frame - 3) keep.push(q); else this.images.delete(q.k); }
      this.queue = keep;
    }
    if (this.images.size > this.maxImages) {
      const arr = [...this.images.entries()].filter(([, e]) => e.state !== 0).sort((a, b) => a[1].last - b[1].last);
      for (let i = 0; i < arr.length && this.images.size > this.maxImages * 0.8; i++) { if (arr[i][1].last >= this.frame - 1) break; this.images.delete(arr[i][0]); }
    }
  }
  pump() {
    while (this.active < this.maxActive && this.queue.length) {
      const q = this.queue.pop();                         // newest request first: the view the user is looking at now
      const e = this.images.get(q.k); if (!e || e.state !== 0) continue;
      this.active++;
      const img = new Image(); img.decoding = 'async';
      const done = (ok) => { this.active--; e.state = ok ? 1 : 2; e.img = ok ? img : null; if (ok) this.loaded++; else this.failed++; if (this.onLoad) this.onLoad(this.name, q.z, q.x, q.y, ok); this.pump(); };
      let fin = false; const once = (ok) => { if (!fin) { fin = true; done(ok); } };
      img.onerror = () => once(false);
      img.src = this.urlOf(this.name, q.z, q.x, q.y);
      // a tile counts as ready only when it is DECODED (the browser does that off the main thread): otherwise the first drawImage of an AVIF decodes it on the spot, in the middle of a frame
      if (typeof img.decode === 'function') img.decode().then(() => once(true), () => once(false)); else img.onload = () => once(true);
    }
  }
  /** are all requested tiles settled */
  idle() { return this.active === 0 && this.queue.length === 0; }
  coverage(z) { const L = this.levels[z]; if (!L) return null; return { x0: L.x0, y0: L.y0, x1: L.x0 + L.cols - 1, y1: L.y0 + L.rows - 1 }; }
}

/** best ready ancestor of tile (z,x,y) in a TileSet: { img, z, x, y, k } (k = levels up) or null.  The exact tile is also requested when it exists. */
export function ancestorChain(set, z, x, y, minZ) {
  const out = [];
  for (let k = 0; z - k >= minZ; k++) {
    const zz = z - k, xx = x >> k, yy = y >> k;
    const img = set.ready(zz, xx, yy);
    if (img) { out.push({ img, z: zz, x: xx, y: yy, k }); break; }
  }
  return out;
}
