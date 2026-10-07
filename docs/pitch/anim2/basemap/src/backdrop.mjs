// backdrop.mjs - the ground under the battle: a real, open-data backdrop for the Battle Studio prototypes.
//
//   import { createBackdrop, drawBackdrop, configureBackdrop } from './backdrop.mjs';
//   configureBackdrop({ manifest, vectors, base: './basemap/assets/' });       // or { manifest, vectors, pack } with data: URIs; no network is ever assumed
//   ... in the frame loop, before the tiles:  drawBackdrop(ctx, camera, 'dim');   // camera = { lng, lat, zoom, w, h }, ctx in CSS px (a DPR scale transform is read from it)
//
// What it draws: NAIP aerial (24 April to 10 May 2022, public domain) graded by a LOOK (looks.mjs), lit by 3DEP hillshade, with contours, water, roads, railroad and the site's place marks.
// How: 512-px tiles indexed by the camera zoom (the same world the Studio's projection uses), a decoded-image LRU, a graded ("baked") canvas per tile and look, a coarser ancestor
// under any tile that has not arrived, a cross-fade between zoom levels, and a one-blit frame cache while the camera stands still (the units can animate at 60 fps for free).
import { TILE, viewOf, metresPerPx } from './geo.mjs';
import { TileSet } from './tiles.mjs';
import { Vectors } from './vectors.mjs';
import { VectorTiles } from './vtiles.mjs';
import { LOOKS, registerLook } from './looks.mjs';

const FADE_MS = 240;
const smoothstep = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
function makeCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class Backdrop {
  /** options: { manifest, vectors, base | pack | urlOf, maxBakes, bakeBudget } */
  constructor(options = {}) {
    this.options = options; this.manifest = options.manifest || null;
    const urlOf = options.urlOf || (options.pack
      ? (layer, z, x, y) => options.pack[layer][z + '/' + x + '_' + y]
      : (layer, z, x, y) => (options.base || './assets/') + layer + '/' + z + '/' + x + '_' + y + '.' + this.manifest.layers[layer].ext);
    this.pad = (this.manifest && this.manifest.pad) || 0; this.P = TILE + 2 * this.pad;      // tiles are stored with a gutter of `pad` px of real neighbouring pixels all round
    this.aerial = null; this.shade = null; this.vectors = null;
    if (this.manifest) {
      const L = this.manifest.layers || {};
      if (L.aerial) this.aerial = new TileSet('aerial', L.aerial, urlOf, { maxImages: options.maxImages || 160 });
      if (L.shade) this.shade = new TileSet('shade', L.shade, urlOf, { maxImages: options.maxShade || 100 });
      for (const t of [this.aerial, this.shade]) if (t) t.onLoad = () => this.changed();
    }
    if (options.vectors) { this.vectors = new Vectors(options.vectors); this.vtiles = options.vectorTiles === false ? null : new VectorTiles(this.vectors, options.vectorTiles || {}); }      // vectorTiles: false = stroke them live every frame
    this.baked = new Map(); this.maxBakes = options.maxBakes || 110; this.bakeBudget = options.bakeBudget || 8; this.bakeMs = options.bakeMs || 3;      // per frame: at most bakeBudget tiles and about bakeMs of baking (never fewer than one)
    this.frame = null; this.cacheValid = false; this.sig = ''; this.epoch = 1; this.drawnEpoch = 0; this.frameNo = 0; this.animating = false; this.onchange = null;
    this.stat = { frames: 0, renders: 0, bakes: 0, lastRenderMs: 0, lastTiles: 0, msTiles: 0, msVectors: 0, msLabels: 0, msBake: 0, msFx: 0, msBlit: 0 };
  }
  changed() { this.epoch++; if (this.onchange) this.onchange(); }
  /** the bounding box of the data in lng/lat, from the manifest */
  get bounds() { return this.manifest ? this.manifest.bbox : null; }

  /** start loading the coarse levels so the first view never shows bare ground */
  prefetch(maxLevel = 14) {
    if (!this.aerial) return;
    for (let z = this.aerial.minZ; z <= Math.min(maxLevel, this.aerial.maxZ); z++) {
      const L = this.aerial.levels[z];
      for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) { this.aerial.want(z, L.x0 + c, L.y0 + r); if (this.shade && this.shade.levels[z]) this.shade.want(z, L.x0 + c, L.y0 + r); }
    }
  }
  /** resolves when nothing is loading and nothing is fading (use before taking a picture) */
  whenIdle(timeoutMs = 20000) {
    return new Promise((res) => {
      const t0 = now(); const tick = () => {
        const busy = (this.aerial && !this.aerial.idle()) || (this.shade && !this.shade.idle()) || this.animating;
        if (!busy || now() - t0 > timeoutMs) res(!busy); else setTimeout(tick, 40);
      }; tick();
    });
  }

  // ---- one tile, graded -------------------------------------------------------------------------------------------------------------------------------------------------
  bakedTile(look, z, x, y, force) {
    const key = look.id + ':' + (look.version || 0) + ':' + z + '/' + x + '/' + y; let b = this.baked.get(key);
    if (b) { b.last = this.frameNo; return b; }
    if (!this.aerial.has(z, x, y)) return null;
    const img = this.aerial.ready(z, x, y); if (!img) return null;
    // the hillshade for this tile: its own tile, or a coarser ancestor's quarter; wait for it if one exists but has not arrived
    let sh = null; const useShade = this.shade && look.shade && look.shade.alpha > 0;
    if (useShade) {
      let exists = false;
      for (let k = 0; z - k >= this.shade.minZ; k++) {
        const zz = z - k, xx = x >> k, yy = y >> k;
        if (!this.shade.has(zz, xx, yy)) continue; exists = true;
        const si = this.shade.ready(zz, xx, yy); if (si) { sh = { img: si, k }; } break;
      }
      if (exists && !sh) return null;
    }
    if (!force && this.bakesNow > 0 && (this.bakesNow >= this.bakeBudget || this.bakeSpent >= this.bakeMs)) { this.moreToBake = true; return null; }      // at least one bake per frame, then until the frame's bake time is used up
    this.bakesNow++; this.stat.bakes++; const tb = now();
    const P = this.P, pad = this.pad;
    const c = makeCanvas(P, P); const g = c.getContext('2d');
    g.drawImage(img, 0, 0, P, P);
    for (const s of look.grade || []) {
      g.globalAlpha = s.alpha == null ? 1 : s.alpha;
      if (s.self) { g.globalCompositeOperation = s.self; g.drawImage(c, 0, 0); }          // the tile blended with itself ('overlay' = a contrast curve, 'soft-light' = a gentle one)
      else { g.globalCompositeOperation = s.op; g.fillStyle = s.color; g.fillRect(0, 0, P, P); }
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (sh) {
      const n = 2 ** sh.k, sub = TILE / n; g.globalCompositeOperation = look.shade.op || 'soft-light'; g.globalAlpha = look.shade.alpha; g.imageSmoothingEnabled = true; const q = 'medium';      // the hillshade is a smooth gray surface: bilinear is as good as 'high' to the eye and measurably cheaper when a coarser tile is scaled up
      g.imageSmoothingQuality = q;
      // the part of the (possibly coarser) hillshade tile that covers this tile and its gutter
      const sx = pad + (x & (n - 1)) * sub - pad / n, sy = pad + (y & (n - 1)) * sub - pad / n, sw = P / n;
      if (look.shade.invert) {                                           // the hillshade is lit from the photo's side (SSE); inverted it is lit from the opposite side (NNW), the map convention
        const t = makeCanvas(P, P), tg = t.getContext('2d'); tg.imageSmoothingQuality = q;
        tg.drawImage(sh.img, sx, sy, sw, sw, 0, 0, P, P); tg.globalCompositeOperation = 'difference'; tg.fillStyle = '#ffffff'; tg.fillRect(0, 0, P, P);
        g.drawImage(t, 0, 0);
      } else g.drawImage(sh.img, sx, sy, sw, sw, 0, 0, P, P);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    const dt = now() - tb; this.stat.msBake += dt; this.bakeSpent += dt;
    b = { canvas: c, last: this.frameNo, born: this.fadeOn ? now() : -1e9 }; this.baked.set(key, b);
    if (this.baked.size > this.maxBakes) {
      const arr = [...this.baked.entries()].sort((p, q) => p[1].last - q[1].last);
      for (let i = 0; i < arr.length && this.baked.size > this.maxBakes * 0.85; i++) { if (arr[i][1].last >= this.frameNo - 1) break; this.baked.delete(arr[i][0]); }
    }
    return b;
  }

  // ---- one pass over a zoom level ---------------------------------------------------------------------------------------------------------------------------------------
  paintLevel(g, view, look, L, alpha, fallback, force) {
    const s = 2 ** (view.z - L), ts = TILE * s; const ox = view.ox, oy = view.oy; const pad = this.pad; const eps = 0.5 / this.dpr;      // eps: half a device pixel of overdraw, taken from the gutter, so the scale stays exact
    const tx0 = Math.floor(ox / ts), tx1 = Math.floor((ox + view.w) / ts), ty0 = Math.floor(oy / ts), ty1 = Math.floor((oy + view.h) / ts);
    const minZ = this.aerial.minZ; let drawn = 0;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const dx = tx * ts - ox, dy = ty * ts - oy;
        const exact = this.bakedTile(look, L, tx, ty, force);
        let a = alpha;
        if (exact) { const f = Math.min(1, (now() - exact.born) / FADE_MS); if (f < 1) { this.animating = true; a = alpha * f; } }
        if (fallback && (!exact || a < alpha)) {                     // a coarser ancestor underneath (z-1, z-2, ...) until the exact tile has arrived
          for (let k = 1; k <= 6 && L - k >= minZ; k++) {
            const an = this.bakedTile(look, L - k, tx >> k, ty >> k, force);
            if (an) { const n = 2 ** k, sub = TILE / n, bl = Math.min(pad, eps * sub / ts); g.globalAlpha = alpha; g.drawImage(an.canvas, pad + (tx & (n - 1)) * sub, pad + (ty & (n - 1)) * sub, sub + bl, sub + bl, dx, dy, ts + bl * ts / sub, ts + bl * ts / sub); drawn++; break; }
          }
        }
        if (exact && a > 0.002) { const bl = Math.min(pad, eps / s); g.globalAlpha = a; g.drawImage(exact.canvas, pad, pad, TILE + bl, TILE + bl, dx, dy, ts + bl * s, ts + bl * s); drawn++; }
      }
    }
    g.globalAlpha = 1; return drawn;
  }

  /** past the edge of the data: the ground colour, with the last `fadePx` of imagery fading into it (no hard cut when the camera runs off the map) */
  edgeFade(g, view, look) {
    const b = this.manifest && this.manifest.bbox; const fw = look.edge ? look.edge.fadePx : 0; if (!b || !fw) return;
    const S = 512 * 2 ** view.z; const W = view.w, H = view.h;
    const ux = (lng) => (lng + 180) / 360, uy = (lat) => { const sn = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + sn) / (1 - sn)) / (4 * Math.PI); };
    const x0 = ux(b.w) * S - view.ox, x1 = ux(b.e) * S - view.ox, y0 = uy(b.n) * S - view.oy, y1 = uy(b.s) * S - view.oy;
    if (x0 < -fw && y0 < -fw && x1 > W + fw && y1 > H + fw) return;                        // the whole view is well inside the data
    const col = look.ground; g.globalAlpha = 1;
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = col; g.fill('evenodd'); g.restore();     // outside the data
    const strip = (xa, ya, xb, yb, x, y, w, h) => { const gr = g.createLinearGradient(xa, ya, xb, yb); gr.addColorStop(0, col); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    if (x0 > -fw) strip(x0, 0, x0 + fw, 0, x0, 0, fw, H);
    if (x1 < W + fw) strip(x1, 0, x1 - fw, 0, x1 - fw, 0, fw, H);
    if (y0 > -fw) strip(0, y0, 0, y0 + fw, 0, y0, W, fw);
    if (y1 < H + fw) strip(0, y1, 0, y1 - fw, 0, y1 - fw, W, fw);
  }

  /** render the whole backdrop into `target` (the host's context while the camera moves) or, without one, into the frame cache; CSS px, the host context's own scale is kept when drawing direct */
  renderFrame(view, look, opts, dpr, target) {
    const t0 = now(); const W = view.w, H = view.h; const direct = !!target;
    let g = target;
    if (!direct) {
      const pw = Math.max(1, Math.round(W * dpr)), ph = Math.max(1, Math.round(H * dpr));
      if (!this.frame || this.frame.canvas.width !== pw || this.frame.canvas.height !== ph) { const c = makeCanvas(pw, ph); this.frame = { canvas: c, ctx: c.getContext('2d') }; }
      g = this.frame.ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else g.save();
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = direct ? (opts.quality || 'low') : 'high';      // 'low' (plain bilinear) while the camera moves: 'medium' and 'high' add mipmaps and cost 20 ms instead of 17 ms per frame at DPR 2 (measured); 'high' for the frame that stays on screen
    g.fillStyle = look.ground; g.fillRect(0, 0, W, H);
    this.dpr = dpr; this.animating = false; this.bakesNow = 0; this.bakeSpent = 0; this.moreToBake = false; this.fadeOn = opts.fade !== false;
    const force = this.baked.size === 0 || opts.forceBake === true; if (force) this.bakeBudget = 400; else this.bakeBudget = this.options.bakeBudget || 8;
    const tt = now();
    if (this.aerial) {
      this.aerial.tick(); if (this.shade) this.shade.tick(); this.frameNo++;
      const zNeed = view.z + Math.log2(dpr); const minZ = this.aerial.minZ, maxZ = this.aerial.maxZ;
      let L0 = Math.floor(zNeed + 1e-9), f = zNeed - L0; if (L0 < minZ) { L0 = minZ; f = 0; } if (L0 >= maxZ) { L0 = maxZ; f = 0; }
      let n = this.paintLevel(g, view, look, L0, 1, true, force);
      if (L0 < maxZ) { const a1 = smoothstep(0.03, 0.55, f); if (a1 > 0.003) n += this.paintLevel(g, view, look, L0 + 1, a1, false, force); }
      else if (L0 === maxZ && view.z + Math.log2(dpr) > maxZ + 0.01) { /* beyond the finest level: the finest tiles are stretched (bilinear), by design */ }
      this.stat.lastTiles = n; if (this.moreToBake) this.animating = true;
    }
    this.stat.msTiles += now() - tt; const tf = now();
    this.edgeFade(g, view, look);
    const v = look.vignette; if (v && v.alpha > 0 && opts.vignette !== false) {
      const gr = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * v.inner * 0.5, W / 2, H * 0.48, Math.hypot(W, H) * 0.62);
      gr.addColorStop(0, hexA(v.color, 0)); gr.addColorStop(1, hexA(v.color, v.alpha)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    this.stat.msFx += now() - tf;
    if (this.vectors) {
      const tv = now();
      if (this.vtiles && opts.live !== true) { if (this.vtiles.paint(g, view, look, opts, dpr, makeCanvas, force)) this.animating = true; }
      else this.vectors.draw(g, view, look, opts, dpr);
      const tl = now(); this.stat.msVectors += tl - tv; this.vectors.drawLabels(g, view, look, opts); this.stat.msLabels += now() - tl;
    }
    if (direct) g.restore();
    this.stat.renders++; this.stat.lastRenderMs = now() - t0;
  }

  /** draw the backdrop for `camera` ({lng, lat, zoom, w, h}) into ctx (CSS px; a DPR scale on the context is honoured).  variant: a look id or a look object.
   *  returns { animating, pending }: when either is true, draw again soon (tiles arriving, fades).  Cheap while the camera is still: one blit. */
  draw(ctx, camera, variant = 'dim', opts = {}) {
    const look = typeof variant === 'string' ? (LOOKS[variant] || LOOKS.dim) : variant;
    let dpr = opts.dpr; if (!dpr) { try { dpr = ctx.getTransform().a || 1; } catch (e) { dpr = 1; } } dpr = Math.min(3, Math.max(1, dpr));
    const view = viewOf(camera); this.stat.frames++;
    const sig = [view.z.toFixed(5), camera.lng.toFixed(7), camera.lat.toFixed(7), view.w, view.h, dpr, look.id, look.version || 0, optsKey(opts)].join('|');
    const changed = sig !== this.sig;
    if (changed || this.animating || this.epoch !== this.drawnEpoch || this.moreToBake) {
      this.sig = sig; this.drawnEpoch = this.epoch;
      if (changed && opts.direct !== false) {                  // the camera (or the size, or the look) moved: paint straight into the host's canvas, one pass, no intermediate frame and no full-frame copy
        this.renderFrame(view, look, opts, dpr, ctx); this.cacheValid = false;
        if (opts.scaleBar) drawScaleBar(ctx, camera, look, opts.scaleBar);
        return { animating: this.animating, pending: this.pending() };
      }
      this.renderFrame(view, look, opts, dpr); this.cacheValid = true;
    } else if (!this.cacheValid) { this.renderFrame(view, look, opts, dpr); this.cacheValid = true; }     // the camera has just come to rest: one render into the cache, then one blit per frame
    const tb = now(); ctx.drawImage(this.frame.canvas, 0, 0, view.w, view.h); this.stat.msBlit += now() - tb;
    if (opts.scaleBar) drawScaleBar(ctx, camera, look, opts.scaleBar);
    return { animating: this.animating, pending: this.pending() };
  }
  pending() { return !!((this.aerial && !this.aerial.idle()) || (this.shade && !this.shade.idle())); }
  /** a one-line caption for the corner of the screen: what this ground is (never 1863) */
  caption() { return this.manifest ? this.manifest.caption : ''; }
  attribution() { return this.manifest ? this.manifest.attribution : ''; }
  stats() { return { ...this.stat, aerialLoaded: this.aerial ? this.aerial.loaded : 0, aerialFailed: this.aerial ? this.aerial.failed : 0, bakedTiles: this.baked.size }; }
}

function optsKey(o) { return [o.places, o.placeFrame, o.roads, o.contours, o.water, o.labels, o.vignette, o.fade].join(','); }
function hexA(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex; const n = parseInt(m[1], 16);
  return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
}
function niceLength(mpp, targetPx) { const raw = targetPx * mpp, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
/** optional scale bar: { x, y } bottom-left anchor in CSS px */
export function drawScaleBar(ctx, camera, look, o) {
  const mpp = metresPerPx(camera.lat, camera.zoom); const len = niceLength(mpp, 96), px = len / mpp; const x = o.x ?? 16, y = o.y ?? camera.h - 16; const L = look.labels;
  ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = L.placeHalo; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y); ctx.lineTo(x + px, y); ctx.lineTo(x + px, y - 4); ctx.stroke();
  ctx.strokeStyle = L.place; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = '600 10px "Segoe UI", system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
  const t = len >= 1000 ? len / 1000 + ' km' : len + ' m'; ctx.lineWidth = 3; ctx.strokeStyle = L.placeHalo; ctx.strokeText(t, x + px + 7, y + 3); ctx.fillStyle = L.place; ctx.fillText(t, x + px + 7, y + 3); ctx.restore();
}

// ---- a shared default instance, so the host's frame loop is one call --------------------------------------------------------------------------------------------------------
let shared = null;
/** (re)configure the shared backdrop: { manifest, vectors, base | pack | urlOf } */
export function configureBackdrop(options) { shared = new Backdrop(options); return shared; }
export function createBackdrop(options) { return new Backdrop(options); }
export function sharedBackdrop() { return shared; }
/** drawBackdrop(ctx, camera, variant): the whole API for a host that only wants the ground.  Does nothing (draws flat ground) until configureBackdrop has run. */
export function drawBackdrop(ctx, camera, variant = 'dim', opts = {}) {
  if (!shared) { const look = LOOKS[variant] || LOOKS.dim; ctx.fillStyle = look.ground; ctx.fillRect(0, 0, camera.w, camera.h); return { animating: false, pending: false }; }
  return shared.draw(ctx, camera, variant, opts);
}
/** entries for the Studio's backdrop registry (render/backdrops.mjs shape: { id, label, doc, draw(c, view, data, tok) }), one per look.
 *  options.placeFrame: which coordinates the 30 place marks use: 'ground' (default: the production terrain.json frame, with the hills moved to the summits the elevation model measures),
 *  'production' (terrain.json as shipped) or 'legacy' (the frame the unit placements were authored in; the Studio's schematic backdrop uses it).  A token 'backdrop.frame', when the host has one, wins. */
export function backdropEntries(backdrop = null, options = {}) {
  const read = (tok, id) => { try { return tok ? tok(id) : undefined; } catch (e) { return undefined; } };       // a host without that token just gets the default
  return Object.values(LOOKS).map((look) => ({
    id: 'real-' + look.id, label: look.label + ' (real ground)', doc: look.doc, theme: look.theme,
    draw: (c, view, data, tok) => (backdrop || shared || createBackdrop({})).draw(c, view.camera, look, { places: read(tok, 'backdrop.places') !== false, placeFrame: read(tok, 'backdrop.frame') || options.placeFrame || 'ground' }),
  }));
}
