// render/canvas.mjs - draws one engine frame onto a 2D canvas.  The renderer knows NOTHING about tiles beyond the display-tile fields of skins/contract.mjs: every ink decision is the skin's.
//
// Order (back to front):  backdrop -> fx (registry) -> leaders -> aggregate member dots -> chips (faint ones first) -> name labels -> pins -> popups layer (DOM, separate)
//   A chip is drawn with ctx.setTransform = dpr * scale at its screen position and globalAlpha = its opacity, so a skin draws a plain box centred on (0,0).
//   The pin of a displaced tile is drawn ON TOP of its chip so the true position stays visible even when the chip is only a few pixels away.
import { drawBeneath, drawAbove } from '../popups/fxdraw.mjs';
import { createPlaces } from './places.mjs';
export function createRenderer({ canvas, engine, data, places = null }) {
  const placeNames = places ? createPlaces({ places }) : null;       // FORK: the real ground's place names, set around the marks (render/places.mjs)
  const ctx = canvas.getContext('2d', { alpha: false });
  let dpr = 1; let cssW = 0; let cssH = 0; let lastMs = 0;
  const stats = { drawMs: 0, tilesDrawn: 0 };
  const fallbackSkin = { draw: { tile(c, t) { c.fillStyle = '#777'; c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h); } } };

  function resize(w, h, ratio) {
    dpr = Math.max(1, Math.min(ratio || 1, 2));                 // capped at 2: a phone at 3x would triple the fill cost for no visible gain on 20 px chips
    cssW = w; cssH = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  }

  function draw(frame, { hoverKey = null, popupLeaders = [], popupFx = null, mapRect = null, toneColors = null } = {}) {
    const t0 = performance.now(); const tok = engine.tok; const c = ctx;
    const skin = engine.kernel.skins.has(tok('skin.id')) ? engine.kernel.skins.get(tok('skin.id')) : fallbackSkin;
    const spec = frame.spec; const view = frame.view; const cam = engine.camera;
    const env = { dpr, zoom: frame.zoom, timeMs: frame.tau * 500, tok, spec, view };
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    if (mapRect) { c.save(); c.beginPath(); c.rect(0, 0, mapRect.w, mapRect.h); c.clip(); }      // the map viewport (it shrinks when the reading rail is open)
    // 1. backdrop
    const bid = tok('backdrop.id'); const bd = engine.kernel.backdrops.has(bid) ? engine.kernel.backdrops.get(bid) : null;
    if (bd) bd.draw(c, { w: cssW, h: cssH, camera: cam, mpp: cam.mpp(), toScreen: (lng, lat) => cam.toScreen(lng, lat) }, data, tok); else { c.fillStyle = '#ddd'; c.fillRect(0, 0, cssW, cssH); }
    if (placeNames && bd && bd.look && tok('backdrop.places')) { const sf0 = engine.safe || { top: 0, bottom: 0, left: 0, right: 0 }; const sf1 = mapRect ? { ...sf0, bottom: Math.max(sf0.bottom, cssH - mapRect.h), right: Math.max(sf0.right, cssW - mapRect.w) } : sf0; placeNames.draw(c, { w: cssW, h: cssH, camera: cam, tiles: frame.tiles, view, safe: sf1, look: bd.look }); }      // POLISH 1: the reading rail or sheet narrows the map: a place name is never set across its edge
    // 2. fx modules
    for (const fx of engine.kernel.fx.list()) if (fx.draw) { c.save(); fx.draw(c, frame, env); c.restore(); }
    const on = (t) => { const x = t.x + view.dx; const y = t.y + view.dy; return x > -120 && x < cssW + 120 && y > -60 && y < cssH + 60; };
    // POLISH 1: a mark that reaches into what the interface covers (a control group of the top bar, the dock, the side panel: engine.chromeRects) dissolves over the last RAMP px before it, so it is never cut in
    // half by a bar and never hides under one, exactly as a mark dissolves at the edge of a scrolled map; the gaps between the controls stay open map; the reading rail narrows the map (mapRect) and works the same way.  The window's own edge is not a margin.
    const rects = engine.chromeRects ? engine.chromeRects() : []; const RAMP = 16; const mapW = mapRect ? mapRect.w : cssW;
    const fadeOf = (t) => {
      const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + view.dx; const y = t.y + view.dy; let k = 1;
      for (const r of rects) { const d = Math.max(r.x0 - (x + hw), (x - hw) - r.x1, r.y0 - (y + hh), (y - hh) - r.y1); if (d < RAMP) k = Math.min(k, d / RAMP); }
      if (mapRect && mapRect.w < cssW) k = Math.min(k, (mapW - (x + hw)) / RAMP + 1);
      return k >= 1 ? 1 : k <= 0 ? 0 : k * k * (3 - 2 * k);
    };
    const D = skin.draw; let drawn = 0;
    // 2b. popup ink beneath the tiles: leader lines, place rings, arrows, pulses (a tile always paints over them)
    if (popupFx) drawBeneath(c, popupFx, toneColors);
    // 3. leaders and aggregate member dots (beneath every chip)
    for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      const fk = fadeOf(t); if (fk <= 0.003) continue; c.globalAlpha = t.opacity * fk;
      if (t.displaced && tok('scene.leaders') && D.leader) D.leader(c, t, env, [t.ax + view.dx, t.ay + view.dy], [t.x + view.dx, t.y + view.dy]);
      if (t.kind === 'agg' && t.members && tok('scene.hulls') && D.hull) D.hull(c, t, env, t.members.map((m) => [m.ax + view.dx, m.ay + view.dy]));
    }
    // 4. chips
    for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      const fk = fadeOf(t); if (fk <= 0.003) continue; const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity * fk;
      D.tile(c, t, env); drawn++;
    }
    if (popupFx) { c.setTransform(dpr, 0, 0, dpr, 0, 0); drawAbove(c, popupFx, toneColors); }       // the subject ring, inside each chip's own reserved band
    // 5. labels, then pins on top
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (D.label) for (const t of frame.tiles) {
      const L = t.label; if (!L || !on(t)) continue;
      c.setTransform(dpr, 0, 0, dpr, (L.x0 + view.dx) * dpr, (L.y0 + view.dy) * dpr); c.globalAlpha = Math.min(1, L.opacity) * Math.min(1, t.opacity + 0.0); D.label(c, t, env);
    }
    if (D.pin && tok('scene.pins')) for (const t of frame.tiles) {
      if (!t.displaced || !on(t) || t.opacity < 0.02) continue;
      c.setTransform(dpr, 0, 0, dpr, (t.ax + view.dx) * dpr, (t.ay + view.dy) * dpr); c.globalAlpha = t.opacity; D.pin(c, t, env);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    for (const l of popupLeaders) { c.strokeStyle = 'rgba(238,243,248,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); c.fillStyle = 'rgba(238,243,248,0.85)'; c.beginPath(); c.arc(l[0], l[1], 2, 0, Math.PI * 2); c.fill(); }
    if (mapRect) c.restore();
    stats.drawMs = performance.now() - t0; stats.tilesDrawn = drawn; lastMs = stats.drawMs;
    return stats;
  }
  return { draw, resize, stats, get dpr() { return dpr; }, get lastDrawMs() { return lastMs; }, get size() { return [cssW, cssH]; } };
}
