// render/canvas.mjs - draws one engine frame onto a 2D canvas.  The renderer knows NOTHING about tiles beyond the display-tile fields of skins/contract.mjs: every ink decision is the skin's.
//
// Order (back to front):  backdrop -> fx (registry) -> leaders -> aggregate member dots -> chips (faint ones first) -> name labels -> pins -> popups layer (DOM, separate)
//   A chip is drawn with ctx.setTransform = dpr * scale at its screen position and globalAlpha = its opacity, so a skin draws a plain box centred on (0,0).
//   The pin of a displaced tile is drawn ON TOP of its chip so the true position stays visible even when the chip is only a few pixels away.
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

  function draw(frame, { hoverKey = null, popupLeaders = [] } = {}) {
    const t0 = performance.now(); const tok = engine.tok; const c = ctx;
    const skin = engine.kernel.skins.has(tok('skin.id')) ? engine.kernel.skins.get(tok('skin.id')) : fallbackSkin;
    const spec = frame.spec; const view = frame.view; const cam = engine.camera;
    const env = { dpr, zoom: frame.zoom, timeMs: frame.tau * 500, tok, spec };
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    // 1. backdrop
    const bid = tok('backdrop.id'); const bd = engine.kernel.backdrops.has(bid) ? engine.kernel.backdrops.get(bid) : null;
    if (bd) bd.draw(c, { w: cssW, h: cssH, camera: cam, mpp: cam.mpp(), toScreen: (lng, lat) => cam.toScreen(lng, lat) }, data, tok); else { c.fillStyle = '#ddd'; c.fillRect(0, 0, cssW, cssH); }
    // 2. fx modules
    for (const fx of engine.kernel.fx.list()) if (fx.draw) { c.save(); fx.draw(c, frame, env); c.restore(); }
    const on = (t) => { const x = t.x + view.dx; const y = t.y + view.dy; return x > -120 && x < cssW + 120 && y > -60 && y < cssH + 60; };
    const D = skin.draw; let drawn = 0;
    // 3. leaders and aggregate member dots (beneath every chip)
    for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      c.globalAlpha = t.opacity;
      if (t.displaced && tok('scene.leaders') && D.leader) D.leader(c, t, env, [t.ax + view.dx, t.ay + view.dy], [t.x + view.dx, t.y + view.dy]);
      if (t.kind === 'agg' && t.members && tok('scene.hulls') && D.hull) D.hull(c, t, env, t.members.map((m) => [m.ax + view.dx, m.ay + view.dy]));
    }
    // 4. chips
    for (const t of frame.tiles) {
      if (!on(t) || t.opacity < 0.02) continue;
      const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity;
      D.tile(c, t, env); drawn++;
      if (hoverKey === t.key && t.solid) { c.globalAlpha = 1; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 1; c.strokeRect(-t.w / 2 + 1.5, -t.h / 2 + 1.5, t.w - 3, t.h - 3); c.strokeStyle = 'rgba(0,0,0,0.55)'; c.strokeRect(-t.w / 2 + 0.5, -t.h / 2 + 0.5, t.w - 1, t.h - 1); }
    }
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
    stats.drawMs = performance.now() - t0; stats.tilesDrawn = drawn; lastMs = stats.drawMs;
    return stats;
  }
  return { draw, resize, stats, get dpr() { return dpr; }, get lastDrawMs() { return lastMs; }, get size() { return [cssW, cssH]; } };
}
