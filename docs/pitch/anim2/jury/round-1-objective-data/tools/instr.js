// instr.js - init script: records every fillText / strokeText with its full transform, propagates the records through drawImage (sprite canvases) so that the text of the MAIN canvas is known in
// device pixels, and (by window.__OC_MODE) suppresses text so that the backdrop behind it can be sampled from real pixels.
//   __OC_MODE = 'full' (default) | 'notext' (no fillText, no strokeText) | 'nofill' (no fillText: halos only)
(() => {
  const MODE = window.__OC_MODE || 'full';
  const store = new WeakMap();
  const R = (c) => { let r = store.get(c); if (!r) { r = []; store.set(c, r); } return r; };
  const protos = [CanvasRenderingContext2D.prototype]; if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') protos.push(OffscreenCanvasRenderingContext2D.prototype);
  const str = (v) => (typeof v === 'string' ? v : null);
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  for (const P of protos) {
    const oF = P.fillText; const oS = P.strokeText; const oD = P.drawImage; const oC = P.clearRect;
    const rec = (ctx, kind, s, x, y, mw) => {
      let mt = null; try { mt = ctx.measureText(String(s)); } catch (e) { return; }
      const m = ctx.getTransform();
      R(ctx.canvas).push({ kind, s: String(s), x, y, mw: mw === undefined ? null : mw, m: [m.a, m.b, m.c, m.d, m.e, m.f], font: ctx.font, al: ctx.textAlign, bl: ctx.textBaseline, fill: str(ctx.fillStyle), stroke: str(ctx.strokeStyle), lw: ctx.lineWidth, ga: ctx.globalAlpha, gco: ctx.globalCompositeOperation,
        w: mt.width, bl_: mt.actualBoundingBoxLeft, br_: mt.actualBoundingBoxRight, ba: mt.actualBoundingBoxAscent, bd: mt.actualBoundingBoxDescent, fa: mt.fontBoundingBoxAscent, fd: mt.fontBoundingBoxDescent, cw: ctx.canvas.width, ch: ctx.canvas.height });
    };
    P.fillText = function (s, x, y, mw) { if (MODE === 'full') rec(this, 'fill', s, x, y, mw); if (MODE === 'notext' || MODE === 'nofill') return undefined; return oF.apply(this, arguments); };
    P.strokeText = function (s, x, y, mw) { if (MODE === 'full') rec(this, 'stroke', s, x, y, mw); if (MODE === 'notext') return undefined; return oS.apply(this, arguments); };
    P.clearRect = function (x, y, w, h) { if (MODE === 'full') { const c = this.canvas; if (x <= 0 && y <= 0 && w >= c.width && h >= c.height) { const t = this.getTransform(); if (t.a === 1 && t.d === 1 && t.b === 0 && t.c === 0) store.set(c, []); } } return oC.apply(this, arguments); };
    P.drawImage = function (src, ...a) {
      if (MODE === 'full' && src && store.has(src)) {
        const srecs = store.get(src); if (srecs.length) {
          let sx = 0; let sy = 0; let sw = src.width; let sh = src.height; let dx; let dy; let dw; let dh;
          if (a.length === 2) { dx = a[0]; dy = a[1]; dw = sw; dh = sh; } else if (a.length === 4) { dx = a[0]; dy = a[1]; dw = a[2]; dh = a[3]; } else { sx = a[0]; sy = a[1]; sw = a[2]; sh = a[3]; dx = a[4]; dy = a[5]; dw = a[6]; dh = a[7]; }
          const t = this.getTransform(); const M = [t.a, t.b, t.c, t.d, t.e, t.f]; const sc = dw / sw; const sd = dh / sh;
          const map = mul(M, [sc, 0, 0, sd, dx - sx * sc, dy - sy * sd]);       // source bitmap px -> destination bitmap px
          const out = R(this.canvas);
          for (const r of srecs) {
            const cx = r.m[4] + (r.x - r.bl_ + r.x + r.br_) / 2 * r.m[0]; const cy = r.m[5] + (r.y - (r.ba - r.bd) / 2) * r.m[3];       // centre of the glyph box in source px (approx.)
            if (cx < sx - 1 || cx > sx + sw + 1 || cy < sy - 1 || cy > sy + sh + 1) continue;
            out.push({ ...r, m: mul(map, r.m), ga: r.ga * this.globalAlpha, via: 1 });
          }
        }
      }
      return oD.apply(this, [src, ...a]);
    };
  }
  const setW = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'); const setH = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', { ...setW, set(v) { store.set(this, []); setW.set.call(this, v); } });
  Object.defineProperty(HTMLCanvasElement.prototype, 'height', { ...setH, set(v) { store.set(this, []); setH.set.call(this, v); } });
  window.__OC = { mode: MODE, take: (c) => (store.get(c) || []).slice(), reset: (c) => store.set(c, []), count: (c) => (store.get(c) || []).length };
})();
