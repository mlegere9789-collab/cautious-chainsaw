// Canvas2D candidates: the verbatim current routine (base), the same rich tile drawn immediately every frame (c2d-naive), and sprite-atlas drawImage (c2d-atlas1 / c2d-atlas2)
import { Atlas, drawTile, drawGlow, drawRing, drawChevron, chevPos, TIERS, PAD, tierOf, spriteWH, COL, POSTURE } from './lib.js';
import { TileSprites } from './tiles.js';
import { lS } from './base-ls.js';

export async function create(env, name) {
  const { tl, host, W, H, dpr } = env;
  const cv = document.createElement('canvas'); cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`; host.appendChild(cv);
  const X = new Float64Array(tl.n), Y = new Float64Array(tl.n);
  if (name === 'base') {
    cv.width = W; cv.height = H;                                                    // the app sizes the canvas in CSS px: no devicePixelRatio handling
    env.canvasBytes = W * H * 4;
    const map = { getZoom: () => env.cam.zoom, project: ([lng, lat]) => { const c = env.cam, x = (lng + 180) / 360, s = Math.sin(lat * Math.PI / 180), y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); return { x: (x - c.cx) * c.ws + c.W / 2, y: (y - c.cy) * c.ws + c.H / 2 }; } };
    const flash = {}; const filters = {};
    return {
      frame(t, cam, sec) {
        const units = new Array(tl.nAlive);                                         // the app builds fresh unit objects every frame (y1 / F4)
        for (let j = 0; j < tl.nAlive; j++) { const i = tl.alive[j]; units[j] = { unit_id: tl.units[i].id, lng: tl.lng[i], lat: tl.lat[i], bearing: tl.b[i], disposition: tl.disp[tl.d[i]], strength: Math.round(tl.s[i]) }; }
        lS(cv, map, units, null, null, filters, flash, performance.now());
      }, dispose() { cv.remove(); },
    };
  }
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  env.canvasBytes = cv.width * cv.height * 4;
  const g = cv.getContext('2d', { alpha: true, desynchronized: false });
  const sel = 0;
  if (name === 'c2d-naive') {
    const spec = { side: 0, type: 0, tier: 0, text: '', frac: 1, posture: 0, chev: 0 };
    return {
      frame(t, cam, sec) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); cam.projectAll(tl, X, Y);
        const pulse = 0.35 + 0.55 * Math.abs(Math.sin(sec * 3.3));
        for (let j = 0; j < tl.nAlive; j++) {
          const i = tl.alive[j], x = X[i], y = Y[i]; if (x < -100 || x > W + 100 || y < -60 || y > H + 60) continue;
          const tier = tierOf(tl.s[i]), { w, h } = TIERS[tier]; spec.side = tl.side[i]; spec.type = tl.type[i]; spec.tier = tier; spec.text = tl.units[i].name; spec.frac = tl.s[i] / tl.maxS[i]; spec.posture = tl.d[i]; spec.chev = tl.b[i];
          g.save(); g.translate(x - PAD - w / 2, y - PAD - h / 2);
          if (tl.engaged[i]) { g.globalAlpha = pulse; drawGlow(g, dpr, spec.side, tier); g.globalAlpha = 1; }
          drawTile(g, dpr, spec); if (i === sel) drawRing(g, tier); g.restore();
        }
      }, dispose() { cv.remove(); },
    };
  }
  // atlas variants
  const atlas = new Atlas(dpr, 4096); const ts = new TileSprites(atlas, tl, { text: true, bakedChev: name === 'c2d-atlas1' });
  const two = name === 'c2d-atlas2'; env.atlasBytes = () => atlas.bytes; env.atlasUsed = () => atlas.usedPx; env.spriteMisses = () => ts.misses;
  return {
    frame(t, cam, sec) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); cam.projectAll(tl, X, Y);
      const pulse = 0.3 + 0.6 * Math.abs(Math.sin(sec * 3.3)), P = atlas.pages;
      for (let j = 0; j < tl.nAlive; j++) {                                          // glow pass (engaged tiles only)
        const i = tl.alive[j]; if (!tl.engaged[i]) continue; const x = X[i], y = Y[i]; if (x < -100 || x > W + 100 || y < -60 || y > H + 60) continue;
        const tier = tierOf(tl.s[i]), e = ts.glow[tl.side[i]][tier], a = TIERS[tier]; g.globalAlpha = pulse;
        g.drawImage(P[e.page].c, e.sx, e.sy, e.sw, e.sh, x - PAD - a.w / 2, y - PAD - a.h / 2, e.w, e.h);
      }
      g.globalAlpha = 1;
      for (let j = 0; j < tl.nAlive; j++) {
        const i = tl.alive[j], x = X[i], y = Y[i]; if (x < -100 || x > W + 100 || y < -60 || y > H + 60) continue;
        const e = ts.resolve(i), tier = ts.tier[i], a = TIERS[tier]; const al = tl.a[i]; if (al < 1) g.globalAlpha = al;
        g.drawImage(P[e.page].c, e.sx, e.sy, e.sw, e.sh, x - PAD - a.w / 2, y - PAD - a.h / 2, e.w, e.h);
        if (al < 1) g.globalAlpha = 1;
        if (two) {                                                                    // facing chevron as its own rotated sprite (continuous angle)
          const c = chevPos(a.w, a.h, tl.b[i]), ce = ts.chevE[tl.side[i]], cs = Math.cos(c.rot) * dpr, sn = Math.sin(c.rot) * dpr;
          g.setTransform(cs, sn, -sn, cs, (x + c.x) * dpr, (y + c.y) * dpr); g.drawImage(P[ce.page].c, ce.sx, ce.sy, ce.sw, ce.sh, -8, -8, 16, 16); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
      { const i = sel, tier = tierOf(tl.s[i]); if (tl.a[i] > 0) { const e = ts.ring[tier], a = TIERS[tier]; g.drawImage(P[e.page].c, e.sx, e.sy, e.sw, e.sh, X[i] - PAD - a.w / 2, Y[i] - PAD - a.h / 2, e.w, e.h); } }
    }, dispose() { cv.remove(); },
  };
}
