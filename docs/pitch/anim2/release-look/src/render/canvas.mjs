// render/canvas.mjs - draws one engine frame onto a 2D canvas.  The renderer knows NOTHING about tiles beyond the display-tile fields of skins/contract.mjs: every ink decision is the skin's.
//
// Order (back to front):  backdrop -> fx (registry) -> leaders -> aggregate member dots -> chips (faint ones first) -> name labels -> pins -> popups layer (DOM, separate)
//   A chip is drawn with ctx.setTransform = dpr * scale at its screen position and globalAlpha = its opacity, so a skin draws a plain box centred on (0,0).
//   The pin of a displaced tile is drawn ON TOP of its chip so the true position stays visible even when the chip is only a few pixels away.
import { drawBeneath, drawAbove } from '../popups/fxdraw.mjs';
import { createPlaces } from './places.mjs';
import { createStreets } from './streets.mjs';
import { stageRect, boxInStage } from './stage.mjs';
import { drawScaleBar, scaleBarRect } from './scalebar.mjs';
export function createRenderer({ canvas, engine, data, places = null, vectors = null }) {
  const placeNames = places ? createPlaces({ places }) : null;       // FORK: the real ground's place names, set around the marks (render/places.mjs)
  const streetNames = vectors ? createStreets({ vectors }) : null;   // ROUND 2: and its road and stream names (render/streets.mjs)
  const stageA = new Map();                                          // display tile key -> how much of the mark is shown (0..1): a mark is whole or absent, eased in time
  const ctx = canvas.getContext('2d', { alpha: false });
  let dpr = 1; let cssW = 0; let cssH = 0; let lastMs = 0; let lastFrames = 0;
  const stats = { drawMs: 0, tilesDrawn: 0 };
  const fallbackSkin = { draw: { tile(c, t) { c.fillStyle = '#777'; c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h); } } };

  function resize(w, h, ratio) {
    dpr = Math.max(1, Math.min(ratio || 1, 2));                 // capped at 2: a phone at 3x would triple the fill cost for no visible gain on 20 px chips
    cssW = w; cssH = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  }

  function draw(frame, { hoverKey = null, popupLeaders = [], popupFx = null, mapRect = null, toneColors = null, cardRects = [] } = {}) {
    const t0 = performance.now(); const tok = engine.tok; const c = ctx;
    const steps = Math.max(1, Math.min(60, (engine.frames || 0) - lastFrames)); lastFrames = engine.frames || 0;      // engine frames since the last drawing: every fade below runs per ENGINE frame, so a harness that steps 240 frames and draws once still shows the settled picture

    const skin = engine.kernel.skins.has(tok('skin.id')) ? engine.kernel.skins.get(tok('skin.id')) : fallbackSkin;
    const spec = frame.spec; const view = frame.view; const cam = engine.camera;
    const env = { dpr, zoom: frame.zoom, timeMs: frame.tau * 500, tok, spec, view };
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    if (mapRect) { c.save(); c.beginPath(); c.rect(0, 0, mapRect.w, mapRect.h); c.clip(); }      // the map viewport (it shrinks when the reading rail is open)
    // 1. backdrop
    const bid = tok('backdrop.id'); const bd = engine.kernel.backdrops.has(bid) ? engine.kernel.backdrops.get(bid) : null;
    if (bd) bd.draw(c, { w: cssW, h: cssH, camera: cam, mpp: cam.mpp(), toScreen: (lng, lat) => cam.toScreen(lng, lat) }, data, tok); else { c.fillStyle = '#ddd'; c.fillRect(0, 0, cssW, cssH); }
    const stage = stageRect(engine.safe, cssW, cssH, mapRect);
    // 1b. fx modules (the casualty memory) come BEFORE any lettering of the ground: a ground mark is drawn under every place name, road name and the scale bar (director fix 2), and keeps out of the scale bar's box
    const keepOut = []; if (stage.x1 - stage.x0 >= 420) { const sb = scaleBarRect(stage, cam); keepOut.push({ x0: sb.x0 - 14, x1: sb.x1 + 14, y0: sb.y0 - 14, y1: sb.y1 + 14 }); }
    env.keepOut = keepOut;
    for (const fx of engine.kernel.fx.list()) if (fx.draw) { c.save(); fx.draw(c, frame, env); c.restore(); }
    const memFx = engine.kernel.fx.list().find((f) => f.id === 'memory'); const ground = memFx && memFx.countNear ? (x, y, r) => memFx.countNear(x, y, r) : null;      // the casualty marks drawn this frame: the lettering keeps to the quieter side of the field
    if (bd && bd.look) {
      let avoid = cardRects.slice(); if (stage.x1 - stage.x0 >= 420) avoid.push(scaleBarRect(stage, cam));
      if (placeNames && tok('backdrop.places')) avoid = avoid.concat(placeNames.draw(c, { w: cssW, h: cssH, camera: cam, tiles: frame.tiles, view, stage, look: bd.look, cards: avoid, steps, ground }) || []);
      if (streetNames) streetNames.draw(c, { w: cssW, h: cssH, camera: cam, tiles: frame.tiles, view, stage, look: bd.look, avoid, steps, ground, onBusy: () => { engine.dirty = true; } });
      const sbObst = []; for (const t of frame.tiles) { if (t.opacity < 0.3) continue; const x = t.x + view.dx; const y = t.y + view.dy; sbObst.push({ x0: x - t.w * t.scale / 2, x1: x + t.w * t.scale / 2, y0: y - t.h * t.scale / 2, y1: y + t.h * t.scale / 2 }); }
      drawScaleBar(c, stage, cam, bd.look, sbObst, steps);
    }
    // 2. (the fx modules were drawn above, beneath the lettering of the ground)
    const on = (t) => { const x = t.x + view.dx; const y = t.y + view.dy; return x > -120 && x < cssW + 120 && y > -60 && y < cssH + 60; };
    // ROUND 2 (render/stage.mjs): a mark is drawn WHOLE or not at all.  The frame (masthead, dock, rail, columns) is the edge of the stage; a mark whose whole footprint lies inside the stage and clear of the floating interface is
    // shown, any other is eased out as one piece; at rest every mark is either fully shown or absent (never half-transparent under a bar, never cut by the screen edge).
    const extra = engine.chromeRects ? engine.chromeRects() : []; let easing = false; const seenKeys = new Set();
    for (const t of frame.tiles) {
      const x = t.x + view.dx; const y = t.y + view.dy; const want = boxInStage(stage, x, y, t.w * t.scale, t.h * t.scale, extra) ? 1 : 0; seenKeys.add(t.key);
      let a = stageA.get(t.key); if (a === undefined) a = want; else { a += (want - a) * (1 - Math.pow(0.7, steps)); if (Math.abs(a - want) < 0.03) a = want; }
      stageA.set(t.key, a); t.stageA = a; if (a !== want) easing = true;
    }
    if (stageA.size > frame.tiles.length + 64) for (const k of stageA.keys()) if (!seenKeys.has(k)) stageA.delete(k);
    if (easing) engine.dirty = true;
    const fadeOf = (t) => { const a = t.stageA; return a >= 1 ? 1 : a <= 0 ? 0 : a * a * (3 - 2 * a); };
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
  return { draw, resize, stats, get labels() { return { places: placeNames ? placeNames.last : [], streets: streetNames ? streetNames.last : [] }; }, get dpr() { return dpr; }, get lastDrawMs() { return lastMs; }, get size() { return [cssW, cssH]; } };
}
