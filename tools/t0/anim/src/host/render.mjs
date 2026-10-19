// host/render.mjs - draws one engine frame onto the app's unit canvas (2D).  The renderer knows NOTHING about tiles beyond the display-tile fields of skins/contract.mjs: every ink decision is the skin's.
//
// Order (back to front):  trails -> leaders of displaced marks -> member dots of crowds -> marks (faint ones first) -> pins of displaced marks.
//   * DPR-aware: the backing store is css size x min(devicePixelRatio, render.dprCap); every mark is drawn with ctx.setTransform = dpr * scale at its (sub-pixel) screen position, so motion is sub-pixel exact;
//   * culling: a mark farther than render.cullPx outside the canvas is not drawn (its crowd is still laid out);
//   * a canvas the app resized behind our back (its ResizeObserver assigns width/height in css px) is detected and sized again before drawing, so the picture is never drawn on a reset store.
export function createRenderer({ canvas, engine }) {
  let dpr = 1; let cssW = 0; let cssH = 0; let ctx = null;
  const stats = { drawMs: 0, tilesDrawn: 0, culled: 0, resizes: 0, eased: 0 };
  const stageA = new Map();                                      // mark key -> how much of the mark is shown (0..1): a mark is WHOLE or absent, eased in time (never half under a bar, never cut by the screen edge)
  const EDGE = 6;
  const inStage = (st, extra, x, y, w, h) => {
    const x0 = x - w / 2; const x1 = x + w / 2; const y0 = y - h / 2; const y1 = y + h / 2;
    if (x0 < st.x0 || x1 > st.x1 || y0 < st.y0 || y1 > st.y1) return false;
    for (const r of extra) if (x0 < r.x1 + EDGE && x1 > r.x0 - EDGE && y0 < r.y1 + EDGE && y1 > r.y0 - EDGE) return false;
    return true;
  };
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
    // the stage: the part of the canvas the interface leaves to the map.  A mark is whole or it is eased out as one piece.
    const stg = o.stage || null; const extra = o.extraRects || []; const steps = Math.max(0.2, Math.min(6, (frame.dtMs || 16.7) / 16.667)); let easing = false; const seen = new Set();
    if (stg) {
      for (const t of frame.tiles) {
        const want = t.life === 'live' && inStage(stg, extra, t.x + view.dx, t.y + view.dy, t.w * t.scale, t.h * t.scale) ? 1 : (t.life === 'live' ? 0 : 1); seen.add(t.key);
        let a = stageA.get(t.key); if (a === undefined) a = want; else a += (want - a) * (1 - Math.pow(0.7, steps));
        if (Math.abs(a - want) < 0.03) a = want; stageA.set(t.key, a); t.stageA = a; if (a !== want) easing = true;
      }
      if (stageA.size > frame.tiles.length + 64) for (const k of stageA.keys()) if (!seen.has(k)) stageA.delete(k);
    }
    stats.eased = easing ? 1 : 0;
    const fadeOf = (t) => { const a = t.stageA === undefined ? 1 : t.stageA; return a >= 1 ? 1 : a <= 0 ? 0 : a * a * (3 - 2 * a); };
    const m = tok('render.cullPx'); const x0 = -m; const x1 = cssW + m; const y0 = -m; const y1 = cssH + m; let drawn = 0; let culled = 0;
    const on = (t) => { const x = t.x + view.dx; const y = t.y + view.dy; return x > x0 - t.w && x < x1 + t.w && y > y0 - t.h && y < y1 + t.h; };
    // 1. leaders and crowd member dots (beneath every mark)
    for (const t of frame.tiles) {
      const fk = fadeOf(t); if (t.opacity < 0.02 || fk <= 0.003 || !on(t)) continue; c.globalAlpha = t.opacity * fk;
      if (t.displaced && D.leader) D.leader(c, t, env, [t.ax + view.dx, t.ay + view.dy], [t.x + view.dx, t.y + view.dy]);
      if (t.kind === 'agg' && t.members && D.hull) D.hull(c, t, env, t.members.map((q) => [q.ax + view.dx, q.ay + view.dy]));
    }
    // 2. the marks
    for (const t of frame.tiles) {
      const fk = fadeOf(t); if (t.opacity < 0.02 || fk <= 0.003) continue; if (!on(t)) { culled++; continue; }
      const s = dpr * t.scale; c.setTransform(s, 0, 0, s, (t.x + view.dx) * dpr, (t.y + view.dy) * dpr); c.globalAlpha = t.opacity * fk;
      D.tile(c, t, env); drawn++;
    }
    // 3. pins of displaced marks on top (the true place of the unit stays visible even when its mark stands a little way off)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (D.pin) for (const t of frame.tiles) {
      if (!t.displaced || t.opacity < 0.02 || !on(t)) continue;
      c.setTransform(dpr, 0, 0, dpr, (t.ax + view.dx) * dpr, (t.ay + view.dy) * dpr); c.globalAlpha = t.opacity * fadeOf(t); D.pin(c, t, env);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1;
    if (o.extra) o.extra(c, env);
    stats.drawMs = performance.now() - t0; stats.tilesDrawn = drawn; stats.culled = culled; return stats;
  }
  return { draw, fit, clear, stats, stageEasing: () => stats.eased === 1, get dpr() { return dpr; }, get size() { return [cssW, cssH]; } };
}
