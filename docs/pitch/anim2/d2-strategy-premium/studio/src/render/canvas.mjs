// render/canvas.mjs - draws one engine frame onto a 2D canvas.  The renderer knows NOTHING about tiles beyond the display-tile fields of skins/contract.mjs: every ink decision is the skin's.
//
// Order (back to front):  backdrop -> fx (registry) -> leaders -> member dots of the pointed-at crowd -> ground shadows -> marks (faint ones first) -> name labels -> pins -> popups layer (DOM, separate)
//   A chip is drawn with ctx.setTransform = dpr * scale at its screen position and globalAlpha = its opacity, so a skin draws a plain box centred on (0,0).
//   The pin of a displaced tile is drawn ON TOP of its chip so the true position stays visible even when the chip is only a few pixels away.
import { drawBeneath, drawAbove } from '../popups/fxdraw.mjs';
import { drawPlaces } from './places.mjs';
import { nowMs } from '../skins/kit.mjs';
export function createRenderer({ canvas, engine, data }) {
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
    const env = { dpr, zoom: frame.zoom, timeMs: frame.tau * 500, tok, spec };
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    if (mapRect) { c.save(); c.beginPath(); c.rect(0, 0, mapRect.w, mapRect.h); c.clip(); }      // the map viewport (it shrinks when the reading rail is open)
    // 1. backdrop
    const bid = tok('backdrop.id'); const bd = engine.kernel.backdrops.has(bid) ? engine.kernel.backdrops.get(bid) : null;
    if (bd) bd.draw(c, { w: cssW, h: cssH, camera: cam, mpp: cam.mpp(), toScreen: (lng, lat) => cam.toScreen(lng, lat) }, data, tok); else { c.fillStyle = '#ddd'; c.fillRect(0, 0, cssW, cssH); }
    // 1b. the place names, on the first free side of each place (never under a mark); the part of the ground the units do not cover
    let placesBusy = false; if (bd && bd.ownPlaces && tok('backdrop.places')) placesBusy = drawPlaces(c, cam, frame.tiles, frame.view, nowMs());
    if (placesBusy) engine.dirty = true;
    // 2. fx modules
    for (const fx of engine.kernel.fx.list()) if (fx.draw) { c.save(); fx.draw(c, frame, env); c.restore(); }
    const on = (t) => { const x = t.x + view.dx; const y = t.y + view.dy; return x > -120 && x < cssW + 120 && y > -60 && y < cssH + 60; };
    const D = skin.draw; let drawn = 0;
    // 2b. popup ink beneath the tiles: leader lines, place rings, arrows, pulses (a tile always paints over them)
    if (popupFx) drawBeneath(c, popupFx, toneColors);
    // 3. leaders and aggregate member dots (beneath every chip)
    for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      c.globalAlpha = t.opacity;
      if (t.displaced && tok('scene.leaders') && D.leader) D.leader(c, t, env, [t.ax + view.dx, t.ay + view.dy], [t.x + view.dx, t.y + view.dy]);
      if (t.kind === 'agg' && t.members && tok('scene.hulls') && D.hull && (hoverKey === t.key || t.selected)) D.hull(c, t, env, t.members.map((m) => [m.ax + view.dx, m.ay + view.dy]));      // the true places of a crowd's records are shown when you point at it, not as dots all over the map
    }
    // 3c. hover unfold: the pointed-at mark may grow to its named size, but only into ground nothing else stands on (every other mark's box, every pin) and only while the battle is paused
    if (D.grow && !engine.transport.playing) {
      for (const h0 of frame.tiles) {
        if (!(h0.solid && !h0.entering && (h0.key === hoverKey || (h0.selected && h0.kind === 'leaf')))) continue;
        const gb = D.grow(h0, env);
        if (gb) {
          const gap = spec.gap + 1; const cx = h0.x + view.dx; const cy = h0.y + view.dy; const r = { x0: cx - gb.w / 2 - gap, y0: cy - gb.h / 2 - gap, x1: cx + gb.w / 2 + gap, y1: cy + gb.h / 2 + gap }; let free = true;
          for (const q of frame.tiles) {
            if (q === h0 || q.opacity < 0.05) continue; const qx = q.x + view.dx; const qy = q.y + view.dy; const qw = q.w * q.scale / 2; const qh = q.h * q.scale / 2;
            if (qx - qw < r.x1 && qx + qw > r.x0 && qy - qh < r.y1 && qy + qh > r.y0) { free = false; break; }
            if (q.displaced && q.ax + view.dx > r.x0 - spec.pinHalf && q.ax + view.dx < r.x1 + spec.pinHalf && q.ay + view.dy > r.y0 - spec.pinHalf && q.ay + view.dy < r.y1 + spec.pinHalf) { free = false; break; }
          }
          if (free) h0.hoverGrow = gb;
        }
      }
    }
    // 3b. ground shadows: one pass beneath every mark, so a shadow lies on the ground and never on another mark
    if (D.shadow) for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity; D.shadow(c, t, env);
    }
    // 4. chips
    for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity;
      D.tile(c, t, env); drawn++;                                                                      // hover is the skin's own eased state (the lift and the warm edge), never a hard box drawn by the renderer
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
    for (const l of popupLeaders) { c.strokeStyle = 'rgba(30,30,30,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); c.fillStyle = 'rgba(30,30,30,0.85)'; c.beginPath(); c.arc(l[0], l[1], 2.5, 0, Math.PI * 2); c.fill(); }
    if (mapRect) c.restore();
    stats.drawMs = performance.now() - t0; stats.tilesDrawn = drawn; lastMs = stats.drawMs;
    return stats;
  }
  return { draw, resize, stats, get dpr() { return dpr; }, get lastDrawMs() { return lastMs; }, get size() { return [cssW, cssH]; } };
}
