// pagelib.mjs - shared page-side helpers of the round-1 objective checks (run inside the page through page.evaluate).
import fs from 'node:fs';
import path from 'node:path';
import { HERE } from './lib.mjs';
export const INSTR = fs.readFileSync(path.join(HERE, 'instr.js'), 'utf8');
export const initOff = `window.__OC_MODE = 'off';\n` + INSTR;               // no recording, no suppression (the page is drawn exactly as a viewer sees it)
export const initFull = `window.__OC_MODE = 'full';\n` + INSTR;
export const ANGLE = { lat: 39.8117, lng: -77.2347 }; export const FIELD = { lat: 39.81592, lng: -77.23677 }; export const WHEAT = { lat: 39.7992, lng: -77.2414 }; export const CEM = { lat: 39.8189, lng: -77.2262 }; export const HERBST = { lat: 39.8278, lng: -77.2528 };
// installs window.__skinSwap, __drawNow, __png, __groundIdle (same as capture.mjs) and the in-page recorders
export async function installHelpers(page) {
  await page.evaluate(() => {
    window.__skinOrig = null;
    window.__skinSwap = (target, kinds) => {
      const S = window.__studio; const E = S.engine; const sk = E.kernel.skins.get(E.tok('skin.id')); const D = sk.draw;
      if (!window.__skinOrig) window.__skinOrig = { ...D };
      const O = window.__skinOrig;
      for (const k of ['tile', 'label', 'pin', 'leader', 'hull', 'shadow']) {
        if (!O[k]) continue;
        if (target === 'restore') D[k] = O[k]; else if (target === null || (kinds && !kinds.includes(k))) D[k] = () => undefined; else D[k] = function (c, t, ...r) { return t === target ? O[k].call(D, c, t, ...r) : undefined; };
      }
    };
    window.__drawNow = (popupFx = 'keep') => { const S = window.__studio; const o = S.lastOut || {}; return S.renderer.draw(S.engine.frame, { popupFx: popupFx === 'keep' ? (o.fx || null) : popupFx, mapRect: o.mapRect || null, toneColors: S.layer.toneColors ? S.layer.toneColors() : null }); };
    window.__png = () => document.getElementById('map').toDataURL('image/png').split(',')[1];
    window.__groundIdle = async () => { for (const g of [globalThis.__ground, globalThis.__realBackdrop]) if (g && g.whenIdle) await g.whenIdle(25000); };
    // the chrome fade the renderer applies to a mark near the interface (D1): 1 = fully drawn
    window.__fadeOf = () => {
      const S = window.__studio; const E = S.engine; const f = E.frame; const view = f.view; const rects = E.chromeRects ? E.chromeRects() : []; const o = S.lastOut || {}; const mapRect = o.mapRect || null; const cssW = S.renderer.size[0]; const RAMP = 16; const mapW = mapRect ? mapRect.w : cssW;
      return (t) => {
        const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + view.dx; const y = t.y + view.dy; let k = 1;
        for (const r of rects) { const d = Math.max(r.x0 - (x + hw), (x - hw) - r.x1, r.y0 - (y + hh), (y - hh) - r.y1); if (d < RAMP) k = Math.min(k, d / RAMP); }
        if (mapRect && mapRect.w < cssW) k = Math.min(k, (mapW - (x + hw)) / RAMP + 1);
        return k >= 1 ? 1 : k <= 0 ? 0 : k * k * (3 - 2 * k);
      };
    };
    // the marks a viewer can see: live, layout opacity 0.5 or more, drawn alpha (after the interface's dissolve) 0.5 or more, inside the map's viewport (the stage the rail leaves)
    window.__visKeys = () => {
      const S = window.__studio; const E = S.engine; const f = E.frame; const view = f.view; const fadeOf = window.__fadeOf(); const o = S.lastOut || {}; const mr = o.mapRect || null; const cw = mr ? mr.w : S.renderer.size[0]; const ch = mr ? mr.h : S.renderer.size[1]; const m = new Map();
      for (const t of f.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const x = t.x + view.dx; const y = t.y + view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; if (x + hw <= 0 || x - hw >= cw || y + hh <= 0 || y - hh >= ch) continue; if (t.opacity * fadeOf(t) < 0.5) continue; m.set(t.key, t.fname || t.short || t.key); }
      return m;
    };
    // fast isolated ink of each candidate tile: the tile is drawn alone on a copy of the ground-only picture; the ink masks are those of ink-pass.mjs (soft >= 12, core >= 64 of 255 difference)
    window.__inkFast = (o) => {
      const { minOpacity = 0.1, margin = 24, only = null, keepMasks = false, allInView = false } = o || {};
      const S = window.__studio; const E = S.engine; const f = E.frame; const view = f.view; const dpr = S.renderer.dpr; const cv = document.getElementById('map'); const W = cv.width; const H = cv.height; const ctx = cv.getContext('2d', { willReadFrequently: true });
      const sk = E.kernel.skins.get(E.tok('skin.id')); const D = sk.draw; if (!window.__skinOrig) window.__skinOrig = { ...D }; const O = window.__skinOrig; const fadeOf = window.__fadeOf();
      const tiles = f.tiles.filter((t) => t.life === 'live' && t.opacity >= minOpacity && t.opacity * fadeOf(t) >= minOpacity);
      const rect = (t) => [t.x + view.dx - t.w * t.scale / 2, t.y + view.dy - t.h * t.scale / 2, t.x + view.dx + t.w * t.scale / 2, t.y + view.dy + t.h * t.scale / 2];
      const inview = (r) => r[2] > 0 && r[0] < W / dpr && r[3] > 0 && r[1] < H / dpr;
      const R = tiles.map(rect); const cand = new Set();
      for (let i = 0; i < tiles.length; i++) {
        if (!inview(R[i])) continue; if (allInView) { cand.add(i); continue; }
        for (let j = i + 1; j < tiles.length; j++) { const a = R[i]; const b = R[j]; const gap = Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]); if (gap < margin) { cand.add(i); cand.add(j); } }
      }
      if (only) for (let i = 0; i < tiles.length; i++) if (only.includes(tiles[i].key)) cand.add(i);
      // the ground-only picture (the skin's own draw functions off)
      window.__skinSwap(null); window.__drawNow(); const base = ctx.getImageData(0, 0, W, H); window.__skinSwap('restore'); window.__drawNow();
      const sc = document.createElement('canvas'); sc.width = W; sc.height = H; const c = sc.getContext('2d', { willReadFrequently: true }); c.putImageData(base, 0, 0);
      const env = { dpr, zoom: f.zoom, timeMs: f.tau * 500, tok: E.tok, spec: f.spec, view };
      const bodies = []; const PAD = 6;
      for (const i of cand) {
        const t = tiles[i]; const r = R[i]; const fk = fadeOf(t);
        const x0 = Math.max(0, Math.floor((r[0] - PAD) * dpr)); const y0 = Math.max(0, Math.floor((r[1] - PAD) * dpr)); const x1 = Math.min(W, Math.ceil((r[2] + PAD) * dpr)); const y1 = Math.min(H, Math.ceil((r[3] + PAD) * dpr)); const w = x1 - x0; const h = y1 - y0; if (w <= 0 || h <= 0) continue;
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
        const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity * fk; try { O.tile(c, t, env); } catch (e) { /* the skin cannot draw this tile */ }
        const L = t.label; if (O.label && L) { c.setTransform(dpr, 0, 0, dpr, (L.x0 + view.dx) * dpr, (L.y0 + view.dy) * dpr); c.globalAlpha = Math.min(1, L.opacity) * Math.min(1, t.opacity); try { O.label(c, t, env); } catch (e) { /* ignore */ } }
        c.restore();
        const img = c.getImageData(x0, y0, w, h).data; const mask = new Uint8Array(w * h); let soft = 0; let core = 0; let bx0 = 1e9; let by0 = 1e9; let bx1 = -1; let by1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const q = (y * w + x) * 4; const g = ((y0 + y) * W + (x0 + x)) * 4; const d = Math.max(Math.abs(img[q] - base.data[g]), Math.abs(img[q + 1] - base.data[g + 1]), Math.abs(img[q + 2] - base.data[g + 2]));
          if (d < 12) continue; mask[y * w + x] = d >= 64 ? 2 : 1; soft++; if (d >= 64) core++; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
        }
        c.putImageData(base, 0, 0, x0, y0, w, h);
        bodies.push({ key: t.key, kind: t.kind, side: t.side, op: t.opacity, fk, x0, y0, w, h, mask, soft, core, bbox: soft ? [x0 + bx0, y0 + by0, x0 + bx1 + 1, y0 + by1 + 1] : null, name: t.fname || t.short || (t.label && t.label.text) || '', n: t.n, ids: t.ids ? t.ids.length : 1 });
      }
      const pairs = [];
      for (let a = 0; a < bodies.length; a++) for (let b = a + 1; b < bodies.length; b++) {
        const A = bodies[a]; const B = bodies[b]; if (!A.bbox || !B.bbox) continue;
        const x0 = Math.max(A.bbox[0], B.bbox[0]); const x1 = Math.min(A.bbox[2], B.bbox[2]); const y0 = Math.max(A.bbox[1], B.bbox[1]); const y1 = Math.min(A.bbox[3], B.bbox[3]); if (x1 <= x0 || y1 <= y0) continue;
        let soft = 0; let core = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const ma = A.mask[(y - A.y0) * A.w + (x - A.x0)]; if (!ma) continue; const mb = B.mask[(y - B.y0) * B.w + (x - B.x0)]; if (!mb) continue; soft++; if (ma === 2 && mb === 2) core++; }
        if (soft) pairs.push({ a: A.key, b: B.key, an: A.name, bn: B.name, ao: +A.op.toFixed(2), bo: +B.op.toFixed(2), soft, core });
      }
      const outB = bodies.map((B) => {
        const o2 = { key: B.key, kind: B.kind, side: B.side, op: B.op, fk: B.fk, bbox: B.bbox, soft: B.soft, core: B.core, name: B.name, n: B.n, ids: B.ids };
        if (keepMasks && B.bbox) {
          const bw = B.bbox[2] - B.bbox[0]; const bh = B.bbox[3] - B.bbox[1]; const bits = new Uint8Array(Math.ceil(bw * bh / 8));
          for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (B.mask[(B.bbox[1] + y - B.y0) * B.w + (B.bbox[0] + x - B.x0)] === 2) { const k = y * bw + x; bits[k >> 3] |= 1 << (k & 7); }
          let s = ''; for (let i = 0; i < bits.length; i++) s += String.fromCharCode(bits[i]); o2.coreBits = btoa(s); o2.bw = bw; o2.bh = bh;
        }
        return o2;
      });
      return { cand: cand.size, tiles: tiles.length, inview: R.filter(inview).length, pairs, corePairs: pairs.filter((p) => p.core > 0), softPairs: pairs.length, bodies: outB };
    };
  });
}
