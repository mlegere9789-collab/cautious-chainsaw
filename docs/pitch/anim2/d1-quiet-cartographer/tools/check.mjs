// tools/check.mjs - the independent verifier of one settled frame, as a function source that runs INSIDE the page (it shares no code with the engine's layout or verifier, like the prototype's
// verify-sweep).  VITAL CORE of a mark = its whole footprint (everything the skin paints for it lives inside it: the pip or flag, the lettering, the name, the hairline, the selection ring) plus the pin
// on its true position when the mark is displaced.  There are no separate labels in this skin (layout.labels is off): the name is part of the footprint.
//   core overlap     two solid marks (opacity >= 0.5) of different identity whose footprints overlap (strictly; touching is allowed, the design clearance is layout.gapPx)
//   pin covered      a footprint lying on another mark's pin box
//   unrepresented    a unit on the field that no live mark stands for (a mark, or an aggregate that lists it)
export const CHECK_JS = `(() => {
  const S = window.__studio; const E = S.engine; const f = E.frame; const W = f.view.w; const H = f.view.h;
  const solid = f.tiles.filter((t) => t.opacity >= 0.5); const ph = f.spec.pinHalf;
  const chips = solid.map((t) => ({ k: t.key, x0: t.x - t.w * t.scale / 2, x1: t.x + t.w * t.scale / 2, y0: t.y - t.h * t.scale / 2, y1: t.y + t.h * t.scale / 2 }));
  const DX = f.view.dx; const DY = f.view.dy;      // layout px -> screen px
  const pins = solid.filter((t) => t.displaced).map((t) => ({ k: t.key, x0: t.ax - ph, x1: t.ax + ph, y0: t.ay - ph, y1: t.ay + ph }));
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  let coreOverlaps = 0; let pinCovered = 0; let minClear = Infinity; const ex = [];
  for (let i = 0; i < chips.length; i++) {
    for (let j = i + 1; j < chips.length; j++) { const a = chips[i]; const b = chips[j]; const g = Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1); if (g < minClear) minClear = g; if (hit(a, b)) { coreOverlaps++; if (ex.length < 3) ex.push(a.k + ' x ' + b.k); } }
    for (const p of pins) if (p.k !== chips[i].k && hit(chips[i], p)) pinCovered++;
  }
  const onField = new Set(E.battle.visibleAt(f.tau).map((e) => e.u.id)); const have = new Set(); for (const t of f.tiles) if (t.life === 'live') for (const id of t.ids) have.add(id); let unrepresented = 0; for (const id of onField) if (!have.has(id)) unrepresented++;
  const live = f.tiles.filter((t) => t.life === 'live'); const aggs = live.filter((t) => t.kind === 'agg'); let merged = 0; for (const a of aggs) merged += a.n;
  const onScreen = (c) => c.x1 + DX > 0 && c.x0 + DX < W && c.y1 + DY > 0 && c.y0 + DY < H; const inView = chips.filter(onScreen).length;
  // what the interface covers (engine.chromeRects: each control group of the top bar, the dock, the panel): a visible mark whose footprint lies on it (underChrome) or within the 16 px ramp before it (inMargin) is dissolved by the renderer (render/canvas.mjs); the scenes are framed to keep it few
  const sf = E.safe || { top: 0, bottom: 0, left: 0, right: 0 }; const RAMP = 16; const CR = E.chromeRects ? E.chromeRects(true) : []; const inMargin = []; const under = [];
  for (const c of chips) { if (!onScreen(c)) continue; let dmin = Infinity; for (const r of CR) { const d = Math.max(r.x0 - (c.x1 + DX), (c.x0 + DX) - r.x1, r.y0 - (c.y1 + DY), (c.y0 + DY) - r.y1); if (d < dmin) dmin = d; } if (dmin < 0) under.push(c.k); if (dmin < RAMP) inMargin.push(c.k); }
  return { marks: live.length, solid: solid.length, inView, units: onField.size, aggregates: aggs.length, unitsInAggregates: merged, coreOverlaps, pinCovered, unrepresented, minClear: Number.isFinite(minClear) ? +minClear.toFixed(2) : null, inMargin: inMargin.length, underChrome: under.length, inMarginKeys: inMargin.slice(0, 6), safe: sf, engineOverlaps: f.overlaps, displaced: solid.filter((t) => t.displaced).length };
})()`;

/** the busiest w x h CSS-px window of the screen (most solid marks whose centre lies inside it), clear of the top bar and the dock: returns { x, y, w, h } */
export const BUSIEST_JS = (w, h) => `(() => {
  const S = window.__studio; const f = S.engine.frame; const vw = f.view.w; const vh = f.view.h; const top = 64; const bottom = vh - ${h > 0 ? 0 : 0};
  const dockTop = (document.getElementById('dock') || { getBoundingClientRect: () => ({ top: vh }) }).getBoundingClientRect().top;
  const pts = f.tiles.filter((t) => t.opacity >= 0.5).map((t) => [t.x + f.view.dx, t.y + f.view.dy]);
  let best = { n: -1, x: 0, y: top }; const W = ${w}; const H = ${h};
  for (let x = 0; x + W <= vw; x += 20) for (let y = top; y + H <= Math.min(dockTop - 6, vh); y += 20) { let n = 0; for (const p of pts) if (p[0] >= x && p[0] < x + W && p[1] >= y && p[1] < y + H) n++; if (n > best.n) best = { n, x, y }; }
  if (best.n < 0) best = { n: 0, x: 0, y: top };
  return { x: best.x, y: best.y, w: W, h: Math.min(H, vh - best.y - 4), marks: best.n };
})()`;
