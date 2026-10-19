// host/render.mjs - draws one engine frame onto the app's unit canvas (2D).  The renderer knows NOTHING about tiles beyond the display-tile fields of skins/contract.mjs: every ink decision is the skin's.
//
// Order (back to front):  trails -> leaders of displaced marks -> member dots of crowds -> marks (faint ones first) -> pins of displaced marks.
//   * DPR-aware: the backing store is css size x min(devicePixelRatio, render.dprCap); every mark is drawn with ctx.setTransform = dpr * scale at its (sub-pixel) screen position, so motion is sub-pixel exact;
//   * culling: a mark farther than render.cullPx outside the canvas is not drawn (its crowd is still laid out);
//   * a canvas the app resized behind our back (its ResizeObserver assigns width/height in css px) is detected and sized again before drawing, so the picture is never drawn on a reset store.
export function createRenderer({ canvas, engine }) {
  let dpr = 1; let cssW = 0; let cssH = 0; let ctx = null;
  const stats = { drawMs: 0, tilesDrawn: 0, culled: 0, resizes: 0 };
  const fallbackSkin = { draw: { tile(c, t) { c.fillStyle = '#777'; c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h); } } };

  /** size the backing store to the css size of the canvas' container; returns true when it changed */
  function fit(w, h) {
    const cap = engine.tok('render.dprCap'); const ratio = Math.max(1, Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, cap));
    const pw = Math.round(w * ratio); const ph = Math.round(h * ratio);
    if (canvas.width === pw && canvas.height === ph && cssW === w && cssH === h && dpr === ratio) return false;
    dpr = ratio; cssW = w; cssH = h; canvas.width = pw; canvas.height = ph; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; ctx = null; stats.resizes++; return true;
  }
  const g2 = () => ctx || (ctx = canvas.getContext('2d'));

  function clear() { const c = g2(); if (!c) return; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); }

  /** @param {object} frame  engine frame  @param {{trails?:object, hoverKey?:string|null, extra?:(c:CanvasRenderingContext2D, env:object)=>void}} [o] */
  function draw(frame, o = {}) {
    const t0 = performance.now(); const tok = engine.tok; const c = g2(); if (!c) return stats;
    const skin = engine.kernel.skins.has(tok('skin.id')) ? engine.kernel.skins.get(tok('skin.id')) : fallbackSkin;
    const view = frame.view; const spec = frame.spec; const D = skin.draw;
    const env = { dpr, zoom: frame.zoom, timeMs: frame.tau * 500, tok, spec, view };
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    if (o.trails) o.trails(c, env);
    const m = tok('render.cullPx'); const x0 = -m; const x1 = cssW + m; const y0 = -m; const y1 = cssH + m; let drawn = 0; let culled = 0;
    const on = (t) => { const x = t.x + view.dx; const y = t.y + view.dy; return x > x0 - t.w && x < x1 + t.w && y > y0 - t.h && y < y1 + t.h; };
    // 1. leaders and crowd member dots (beneath every mark)
    for (const t of frame.tiles) {
      if (t.opacity < 0.02 || !on(t)) continue; c.globalAlpha = t.opacity;
      if (t.displaced && D.leader) D.leader(c, t, env, [t.ax + view.dx, t.ay + view.dy], [t.x + view.dx, t.y + view.dy]);
      if (t.kind === 'agg' && t.members && D.hull) D.hull(c, t, env, t.members.map((q) => [q.ax + view.dx, q.ay + view.dy]));
    }
    // 2. the marks
    for (const t of frame.tiles) {
      if (t.opacity < 0.02) continue; if (!on(t)) { culled++; continue; }
      const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity;
      D.tile(c, t, env); drawn++;
    }
    // 3. pins of displaced marks on top (the true place of the unit stays visible even when its mark stands a little way off)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (D.pin) for (const t of frame.tiles) {
      if (!t.displaced || t.opacity < 0.02 || !on(t)) continue;
      c.setTransform(dpr, 0, 0, dpr, (t.ax + view.dx) * dpr, (t.ay + view.dy) * dpr); c.globalAlpha = t.opacity; D.pin(c, t, env);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    if (o.extra) o.extra(c, env);
    stats.drawMs = performance.now() - t0; stats.tilesDrawn = drawn; stats.culled = culled; return stats;
  }
  return { draw, fit, clear, stats, get dpr() { return dpr; }, get size() { return [cssW, cssH]; } };
}
