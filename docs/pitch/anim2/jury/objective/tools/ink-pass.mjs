// ink-pass.mjs - runs INSIDE the page (via page.evaluate).  For every live tile of the settled frame it draws that tile alone (the skin's draw functions of every other tile are switched off),
// compares the result with the skin-less baseline and keeps an ink mask: 1 = soft ink (any channel differs by >= 12/255: halos, shadows, hairlines), 2 = core ink (>= 64/255: fills, glyphs, rings).
// Three kinds of mark are kept apart: BODY (tile + label + shadow = what the layout reserves a footprint for), PIN (the dot on the true position of a displaced mark), LEADER/HULL (drawn beneath every mark).
export async function inkPass() {
  const S = window.__studio; const E = S.engine; const cv = document.getElementById('map'); const ctx = cv.getContext('2d', { willReadFrequently: true }); const dpr = S.renderer.dpr; const W = cv.width; const H = cv.height;
  const f = E.frame; const vw = f.view; const tiles = f.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.5);
  window.__OC.reset(cv); window.__skinSwap(null); window.__drawNow(); const base = ctx.getImageData(0, 0, W, H).data;
  // pixels of the ground that are not stable from one draw to the next (tile seams, hairlines, place markers re-laid): drawn three times without the skin, any pixel that moves by >= 6/255 is noise, widened by 2 px, and never counts as ink
  const noise = new Uint8Array(W * H); let nNoise = 0;
  for (let rep = 0; rep < 2; rep++) { window.__drawNow(); const b2 = ctx.getImageData(0, 0, W, H).data; for (let i = 0, p = 0; i < b2.length; i += 4, p++) { if (Math.max(Math.abs(b2[i] - base[i]), Math.abs(b2[i + 1] - base[i + 1]), Math.abs(b2[i + 2] - base[i + 2])) >= 6) noise[p] = 1; } }
  { const t1 = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!noise[y * W + x]) continue; for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx >= 0 && xx < W) t1[y * W + xx] = 1; } } for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!t1[y * W + x]) continue; for (let dy = -2; dy <= 2; dy++) { const yy = y + dy; if (yy >= 0 && yy < H) noise[yy * W + x] = 1; } } for (let i = 0; i < noise.length; i++) nNoise += noise[i]; } const baseSig = new Set(window.__OC.take(cv).map((r) => r.kind + '|' + r.s + '|' + r.m[4].toFixed(1) + '|' + r.m[5].toFixed(1)));
  const isolate = (t, kinds, x0, y0, w, h, allow = null) => {
    window.__skinSwap(t, kinds); window.__OC.reset(cv); window.__drawNow(); const recs = window.__OC.take(cv).filter((r) => !baseSig.has(r.kind + '|' + r.s + '|' + r.m[4].toFixed(1) + '|' + r.m[5].toFixed(1)));
    const glyphs = recs.filter((r) => r.kind === 'fill' && r.ga > 0.05 && !r.m.some((v) => !Number.isFinite(v)) && Number.isFinite(r.bl_) && Number.isFinite(r.br_)).map((r) => { const m = r.m; const lx0 = r.x - r.bl_; const lx1 = r.x + r.br_; const ly0 = r.y - r.ba; const ly1 = r.y + r.bd; const pts = [[lx0, ly0], [lx1, ly0], [lx1, ly1], [lx0, ly1]].map(([px, py]) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]]); return [Math.min(...pts.map((p) => p[0])) - 1, Math.min(...pts.map((p) => p[1])) - 1, Math.max(...pts.map((p) => p[0])) + 1, Math.max(...pts.map((p) => p[1])) + 1, r.s]; });
    const inGlyph = (gx, gy) => { for (const g of glyphs) if (gx >= g[0] && gx <= g[2] && gy >= g[1] && gy <= g[3]) return true; return false; };
    const img = ctx.getImageData(x0, y0, w, h).data; const mask = new Uint8Array(w * h); let soft = 0; let core = 0; let bx0 = 1e9; let by0 = 1e9; let bx1 = -1; let by1 = -1; const hist = new Map(); const histNT = new Map(); let edge = 0; let reach = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; const j = ((y0 + y) * W + (x0 + x)) * 4; const d = Math.max(Math.abs(img[i] - base[j]), Math.abs(img[i + 1] - base[j + 1]), Math.abs(img[i + 2] - base[j + 2]));
        if (d < 12 || noise[(y0 + y) * W + (x0 + x)]) continue;
        if (allow) { const gx = x0 + x; const gy = y0 + y; if (gx < allow[0] || gy < allow[1] || gx >= allow[2] || gy >= allow[3]) continue; if (gx === allow[0] || gy === allow[1] || gx === allow[2] - 1 || gy === allow[3] - 1) reach++; }
        mask[y * w + x] = d >= 64 ? 2 : 1; soft++; if (d >= 64) core++;
        if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++;
        if (d >= 64) { const key = ((img[i] >> 4) << 8) | ((img[i + 1] >> 4) << 4) | (img[i + 2] >> 4); const e = hist.get(key); if (e) { e.n++; e.r += img[i]; e.g += img[i + 1]; e.b += img[i + 2]; } else hist.set(key, { n: 1, r: img[i], g: img[i + 1], b: img[i + 2] }); }
        if (d >= 64 && !inGlyph(x0 + x, y0 + y)) { const key = ((img[i] >> 4) << 8) | ((img[i + 1] >> 4) << 4) | (img[i + 2] >> 4); const e = histNT.get(key); if (e) { e.n++; e.r += img[i]; e.g += img[i + 1]; e.b += img[i + 2]; } else histNT.set(key, { n: 1, r: img[i], g: img[i + 1], b: img[i + 2] }); }
      }
    }
    const top = [...hist.values()].sort((a, b) => b.n - a.n).slice(0, 6).map((e) => ({ n: e.n, rgb: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)] }));
    const topNT = [...histNT.values()].sort((a, b) => b.n - a.n).slice(0, 6).map((e) => ({ n: e.n, rgb: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)] }));
    return { x0, y0, w, h, mask, soft, core, edge, bbox: soft ? [x0 + bx0, y0 + by0, x0 + bx1 + 1, y0 + by1 + 1] : null, top, topNT, nrec: recs.length, glyphs, reach };
  };
  const PAD = 40; const bodies = []; const pins = [];
  for (const t of tiles) {
    const cx = (t.x + vw.dx) * dpr; const cy = (t.y + vw.dy) * dpr; if (cx < -200 || cx > W + 200 || cy < -200 || cy > H + 200) continue;
    const x0 = Math.max(0, Math.floor(cx - (t.w * t.scale / 2 + PAD) * dpr)); const x1 = Math.min(W, Math.ceil(cx + (t.w * t.scale / 2 + PAD) * dpr)); const y0 = Math.max(0, Math.floor(cy - (t.h * t.scale / 2 + PAD) * dpr)); const y1 = Math.min(H, Math.ceil(cy + (t.h * t.scale / 2 + PAD) * dpr));
    if (x1 <= x0 || y1 <= y0) continue;
    // the ink of a mark is looked for inside its reserved box (footprint, plus the label rectangle where the skin has one) widened by 10 CSS px: ink further out is not counted as the mark's (it is reported as `reach`)
    let ax0 = (t.x + vw.dx - t.w * t.scale / 2) * dpr; let ay0 = (t.y + vw.dy - t.h * t.scale / 2) * dpr; let ax1 = (t.x + vw.dx + t.w * t.scale / 2) * dpr; let ay1 = (t.y + vw.dy + t.h * t.scale / 2) * dpr;
    if (t.label && Number.isFinite(t.label.x0) && Number.isFinite(t.label.x1)) { ax0 = Math.min(ax0, (t.label.x0 + vw.dx) * dpr); ay0 = Math.min(ay0, (t.label.y0 + vw.dy) * dpr); ax1 = Math.max(ax1, (t.label.x1 + vw.dx) * dpr); ay1 = Math.max(ay1, (t.label.y1 + vw.dy) * dpr); }
    const allow = [Math.round(ax0 - 10 * dpr), Math.round(ay0 - 10 * dpr), Math.round(ax1 + 10 * dpr), Math.round(ay1 + 10 * dpr)];
    const wx0 = Math.max(0, Math.min(x0, allow[0])); const wy0 = Math.max(0, Math.min(y0, allow[1])); const wx1 = Math.min(W, Math.max(x1, allow[2])); const wy1 = Math.min(H, Math.max(y1, allow[3]));
    const B = isolate(t, ['tile', 'label', 'shadow'], wx0, wy0, wx1 - wx0, wy1 - wy0, allow); B.key = t.key; B.kind = t.kind; B.side = t.side; B.sel = !!t.selected;
    B.foot = [(t.x + vw.dx - t.w * t.scale / 2) * dpr, (t.y + vw.dy - t.h * t.scale / 2) * dpr, (t.x + vw.dx + t.w * t.scale / 2) * dpr, (t.y + vw.dy + t.h * t.scale / 2) * dpr]; bodies.push(B);
    if (t.displaced) {
      const pxp = (t.px !== undefined ? t.px : t.ax); const pyp = (t.py !== undefined ? t.py : t.ay); const qx = (pxp + vw.dx) * dpr; const qy = (pyp + vw.dy) * dpr; const r = 16 * dpr;
      const px0 = Math.max(0, Math.floor(qx - r)); const py0 = Math.max(0, Math.floor(qy - r)); const px1 = Math.min(W, Math.ceil(qx + r)); const py1 = Math.min(H, Math.ceil(qy + r));
      if (px1 > px0 && py1 > py0) { const P = isolate(t, ['pin'], px0, py0, px1 - px0, py1 - py0); P.key = t.key; pins.push(P); }
    }
  }
  // leaders and hulls: their ink under other marks (drawn beneath every mark: a mark covers them, never the reverse)
  const aux = { leaderTiles: 0, hullTiles: 0, underCore: 0 };
  for (const t of tiles) {
    if (!(t.displaced || t.kind === 'agg')) continue;
    const ax = (t.ax + vw.dx) * dpr; const ay = (t.ay + vw.dy) * dpr; const tx = (t.x + vw.dx) * dpr; const ty = (t.y + vw.dy) * dpr;
    const wx0 = Math.max(0, Math.floor(Math.min(ax, tx) - 30)); const wy0 = Math.max(0, Math.floor(Math.min(ay, ty) - 30)); const wx1 = Math.min(W, Math.ceil(Math.max(ax, tx) + 30)); const wy1 = Math.min(H, Math.ceil(Math.max(ay, ty) + 30));
    const ww = wx1 - wx0; const wh = wy1 - wy0; if (ww <= 0 || wh <= 0 || ww * wh > 2.5e6) continue;
    const L = isolate(t, ['leader', 'hull'], wx0, wy0, ww, wh); if (!L.soft) continue;
    if (t.kind === 'agg') aux.hullTiles++; if (t.displaced) aux.leaderTiles++;
    let hit = false;
    for (let y = 0; y < wh && !hit; y++) for (let x = 0; x < ww && !hit; x++) {
      if (!L.mask[y * ww + x]) continue; const gx = wx0 + x; const gy = wy0 + y;
      for (const B of bodies) { if (B.key === t.key || gx < B.x0 || gy < B.y0 || gx >= B.x0 + B.w || gy >= B.y0 + B.h) continue; if (B.mask[(gy - B.y0) * B.w + (gx - B.x0)] === 2) { hit = true; break; } }
    }
    if (hit) aux.underCore++;
  }
  window.__skinSwap('restore'); window.__drawNow();
  const mpx = (it, x, y) => { const xx = x - it.x0; const yy = y - it.y0; if (xx < 0 || yy < 0 || xx >= it.w || yy >= it.h) return 0; return it.mask[yy * it.w + xx]; };
  const pairs = (A, B) => {
    const ix0 = Math.max(A.x0, B.x0); const ix1 = Math.min(A.x0 + A.w, B.x0 + B.w); const iy0 = Math.max(A.y0, B.y0); const iy1 = Math.min(A.y0 + A.h, B.y0 + B.h); if (ix1 <= ix0 || iy1 <= iy0 || !A.bbox || !B.bbox) return null;
    const x0 = Math.max(ix0, A.bbox[0], B.bbox[0]); const x1 = Math.min(ix1, A.bbox[2], B.bbox[2]); const y0 = Math.max(iy0, A.bbox[1], B.bbox[1]); const y1 = Math.min(iy1, A.bbox[3], B.bbox[3]); if (x1 <= x0 || y1 <= y0) return null;
    let soft = 0; let core = 0; let fx = null;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const ma = A.mask[(y - A.y0) * A.w + (x - A.x0)]; if (!ma) continue; const mb = B.mask[(y - B.y0) * B.w + (x - B.x0)]; if (!mb) continue; soft++; if (ma === 2 && mb === 2) { core++; if (!fx) fx = [x, y]; } }
    return soft ? { soft, core, at: fx } : null;
  };
  const res = { noisePx: nNoise, aux, tiles: bodies.length, pins: pins.length, bodySoftPairs: 0, bodyCorePairs: 0, pinOnBodyPairs: 0, pinPinPairs: 0, textTouched: 0, textCovered: 0, glyphBoxes: 0, inkBeyondPad: 0, examples: [], pinExamples: [] };
  for (let a = 0; a < bodies.length; a++) {
    const A = bodies[a]; if (A.edge > 0) res.inkBeyondPad++;
    for (let b = a + 1; b < bodies.length; b++) { const r = pairs(A, bodies[b]); if (r) { res.bodySoftPairs++; if (r.core) { res.bodyCorePairs++; if (res.examples.length < 8) res.examples.push([A.key, bodies[b].key, r.soft, r.core, r.at, A.bbox, bodies[b].bbox, A.foot, bodies[b].foot]); } } }
    for (const g of A.glyphs) {
      res.glyphBoxes++; let touched = false; let covered = false;
      for (let b = 0; b < bodies.length && !covered; b++) {
        if (b === a) continue; const B = bodies[b]; if (!B.bbox || B.bbox[0] >= g[2] || B.bbox[2] <= g[0] || B.bbox[1] >= g[3] || B.bbox[3] <= g[1]) continue;
        for (let y = Math.max(Math.floor(g[1]), B.bbox[1]); y < Math.min(Math.ceil(g[3]), B.bbox[3]) && !covered; y++) for (let x = Math.max(Math.floor(g[0]), B.bbox[0]); x < Math.min(Math.ceil(g[2]), B.bbox[2]); x++) { const m = mpx(B, x, y); if (m) { touched = true; if (m === 2) { covered = true; break; } } }
      }
      if (touched) res.textTouched++; if (covered) res.textCovered++;
    }
  }
  for (const P of pins) for (const B of bodies) { if (B.key === P.key) continue; const r = pairs(P, B); if (r && r.core) { res.pinOnBodyPairs++; if (res.pinExamples.length < 6) res.pinExamples.push([P.key, B.key, r.soft, r.core, r.at]); } }
  for (let a = 0; a < pins.length; a++) for (let b = a + 1; b < pins.length; b++) { const r = pairs(pins[a], pins[b]); if (r && r.core) res.pinPinPairs++; }
  return { summary: res, perTile: bodies.map((i) => ({ key: i.key, kind: i.kind, side: i.side, sel: i.sel, soft: i.soft, core: i.core, bbox: i.bbox, foot: i.foot, top: i.top, topNT: i.topNT, nrec: i.nrec, edge: i.edge, reach: i.reach })) };
}
