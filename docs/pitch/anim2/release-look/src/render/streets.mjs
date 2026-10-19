// render/streets.mjs - THE NAMES OF ROADS AND STREAMS (round 2).  The basemap would letter them itself, once, into its cached picture, under the marks (so "Hancock Ave" ran through a mark's name in three of eight
// scenes of round 1).  Here they are set AROUND the marks, every frame, like the place names (render/places.mjs): each name has a handful of candidate places along its road (a straight run, on screen), keeps the
// one it has while it stays free of every mark, every place name and every other road name, and otherwise fades out, moves and fades in; a name that finds no free run is simply not shown (a road name is
// orientation, not data: the units are never dropped, the names may be).  The lettering is full-strength ink on a heavy paper halo (4.5:1 against what lies under it), 12 px, upright for roads, italic for streams.
const FADE = 0.22;                                          // fraction of the way to the target per drawn frame (about 110 ms at 60 fps)

export function createStreets({ vectors }) {
  const groups = vectors ? vectors.groups : null; const widths = new Map();
  let cache = null; const state = new Map(); let sig = '';
  const width = (c, font, s) => { const k = font + '|' + s; let w = widths.get(k); if (w === undefined) { c.font = font; w = c.measureText(s).width; widths.set(k, w); } return w; };

  /** every candidate place of every name in the view and a margin: { id, text, kind, tw, cands: [{ ux, uy, ang }] } (unit-square world coordinates, so they stand still while the camera moves) */
  function build(c, z, ox, oy, W, H, font, ifont) {
    const S = 512 * 2 ** z; const M = 360; const out = []; const X0 = ox - M; const Y0 = oy - M; const RW = W + 2 * M; const RH = H + 2 * M;
    const add = (layer, filter, kind, f, minZ) => {
      if (z < minZ) return; let gi = 0;
      for (const grp of groups[layer] || []) {
        gi++; if (!grp.name || !filter(grp) || /^(US Hwy|State Rte)/.test(grp.name)) continue;
        const tw = width(c, f, grp.name) + 8; let li = 0;
        for (const l of grp.lines) {
          li++; const p = l.pts; const n = p.length / 2; if (n < 2) continue;
          if (l.maxx * S - X0 < 0 || l.minx * S - X0 > RW || l.maxy * S - Y0 < 0 || l.miny * S - Y0 > RH) continue;
          const pts = new Float64Array(p.length); for (let i = 0; i < n; i++) { pts[i * 2] = p[i * 2] * S - X0; pts[i * 2 + 1] = p[i * 2 + 1] * S - Y0; }
          const cum = new Float64Array(n); for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]); const total = cum[n - 1]; if (total < tw + 16) continue;
          const at = (s) => { let i = 1; while (i < n - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [pts[(i - 1) * 2] + (pts[i * 2] - pts[(i - 1) * 2]) * t, pts[(i - 1) * 2 + 1] + (pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]) * t]; };
          const cands = [];
          for (let s = tw / 2 + 4; s <= total - tw / 2 - 4; s += 14) {
            const a = at(s - tw / 2); const b = at(s + tw / 2); const ct = at(s); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); let ok = true;
            for (let i = 1; i < n && ok; i++) if (cum[i] > s - tw / 2 && cum[i - 1] < s + tw / 2) { const sa = Math.atan2(pts[i * 2 + 1] - pts[i * 2 - 1], pts[i * 2] - pts[i * 2 - 2]); let d = Math.abs(sa - ang); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 0.19) ok = false; }
            if (!ok) continue; let a2 = ang; if (a2 > Math.PI / 2) a2 -= Math.PI; else if (a2 < -Math.PI / 2) a2 += Math.PI;
            cands.push({ ux: (ct[0] + X0) / S, uy: (ct[1] + Y0) / S, ang: a2 });
          }
          if (cands.length) out.push({ id: `${layer}${gi}.${li}`, text: grp.name, kind, tw, cands, grp: `${layer}${gi}` });
        }
      }
    };
    add('streams', () => true, 'stream', ifont, 14.6);
    add('roads', (g) => g.cls === 'primary' || g.cls === 'secondary', 'road', font, 14.2);
    add('roads', (g) => g.cls === 'local' && g.label, 'road', font, 15.4);
    return { z, items: out, cx: (ox + W / 2) / S, cy: (oy + H / 2) / S, S };
  }

  /** @param {object} v { w, h, camera, tiles, view, stage, avoid (rects: place names and rings), look, font } returns the rectangles it set (for nothing else yet) */
  function draw(c, v) {
    if (!groups) return; const { w: W, h: H, camera, tiles, view, stage, look } = v; const z = camera.zoom; const L = look.labels; const font = L.roadFont; const ifont = 'italic ' + L.roadFont;
    const F = 1 - Math.pow(1 - FADE, v.steps || 1); const F2 = 1 - Math.pow(1 - FADE * 1.5, v.steps || 1);
    const S = 512 * 2 ** z; const cam = camera.origin(); const ox = cam[0]; const oy = cam[1];
    const key = [Math.round(z * 8), look.id, W, H].join('|');
    if (!cache || cache.key !== key || Math.abs(ox + W / 2 - cache.cxp) > 150 || Math.abs(oy + H / 2 - cache.cyp) > 150) { cache = build(c, z, ox, oy, W, H, font, ifont); cache.key = key; cache.cxp = ox + W / 2; cache.cyp = oy + H / 2; cache.sx = S; }
    // obstacles: the solid marks (their whole footprint, plus 3 px), the place names and rings, the strips outside the stage
    const obst = [];
    for (const t of tiles) { if (t.opacity < 0.3 || (t.stageA !== undefined && t.stageA < 0.3)) continue; const hw = t.w * t.scale / 2 + 3; const hh = t.h * t.scale / 2 + 3; const x = t.x + view.dx; const y = t.y + view.dy; if (x + hw < -10 || x - hw > W + 10 || y + hh < -10 || y - hh > H + 10) continue; obst.push({ x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh }); }
    for (const r of v.avoid || []) obst.push(r);
    const free = (x, y, tw, ang, taken) => {                                  // a text of width tw centred at (x, y), rotated: sampled along its baseline
      const ca = Math.cos(ang); const sa = Math.sin(ang); const n = Math.max(3, Math.ceil(tw / 14)); const hh = 8.5;
      for (let i = 0; i <= n; i++) { const d = (i / n - 0.5) * tw; const px = x + ca * d; const py = y + sa * d;
        if (px - 3 < stage.x0 || px + 3 > stage.x1 || py - hh < stage.y0 || py + hh > stage.y1) return false;
        for (const o of obst) if (px + 2 > o.x0 && px - 2 < o.x1 && py + hh > o.y0 && py - hh < o.y1) return false;
        for (const o of taken) if (px + 2 > o.x0 && px - 2 < o.x1 && py + hh > o.y0 && py - hh < o.y1) return false; }
      return true;
    };
    const box = (x, y, tw, ang) => { const ca = Math.abs(Math.cos(ang)); const sa = Math.abs(Math.sin(ang)); const bw = tw * ca + 18 * sa; const bh = tw * sa + 18 * ca; return { x0: x - bw / 2 - 2, x1: x + bw / 2 + 2, y0: y - bh / 2, y1: y + bh / 2 }; };
    const taken = []; const seenIds = new Set(); const perGroup = new Map();
    c.save(); c.lineJoin = 'round'; c.textBaseline = 'middle'; c.textAlign = 'center';
    for (const it of cache.items) {
      let st = state.get(it.id); if (!st) { st = { a: 0, cand: -1, want: -1 }; state.set(it.id, st); }
      seenIds.add(it.id);
      const sc = cache.sx; const screen = (cd) => [cd.ux * sc - cam[0], cd.uy * sc - cam[1]];
      let pick = -1; const used = perGroup.get(it.grp) || 0;
      if (used < 2) {
        if (st.cand >= 0 && st.cand < it.cands.length) { const [x, y] = screen(it.cands[st.cand]); if (free(x, y, it.tw, it.cands[st.cand].ang, taken)) pick = st.cand; }
        if (pick < 0) {                                                       // the free candidate nearest the middle of the stage
          let best = Infinity; const mx = (stage.x0 + stage.x1) / 2; const my = (stage.y0 + stage.y1) / 2;
          for (let i = 0; i < it.cands.length; i++) { const [x, y] = screen(it.cands[i]); if (x < stage.x0 || x > stage.x1 || y < stage.y0 || y > stage.y1) continue; const d = Math.abs(x - mx) + Math.abs(y - my) * 1.2; if (d < best && free(x, y, it.tw, it.cands[i].ang, taken)) { best = d; pick = i; } }
        }
      }
      if (pick >= 0) { const [x, y] = screen(it.cands[pick]); taken.push(box(x, y, it.tw, it.cands[pick].ang)); perGroup.set(it.grp, used + 1); }
      st.want = pick;
      if (st.cand >= 0 && st.want >= 0 && st.cand !== st.want) { st.a += (0 - st.a) * F2; if (st.a < 0.05) { st.cand = st.want; } }       // fade out before moving to another place
      else if (st.want >= 0) { if (st.cand < 0) st.cand = st.want; st.a += (1 - st.a) * F; }
      else { st.a += (0 - st.a) * F; if (st.a < 0.02) { st.a = 0; st.cand = -1; } }
      if (st.a > 0.97 && st.want === st.cand) st.a = 1;
      if (st.a < 0.02 || st.cand < 0) continue;
      const cd = it.cands[Math.min(st.cand, it.cands.length - 1)]; const [x, y] = screen(cd);
      if (st.a < 1 && v.onBusy) v.onBusy();
      const fill = it.kind === 'stream' ? L.water : L.road; const f = it.kind === 'stream' ? ifont : font;
      c.save(); c.translate(x, y); c.rotate(cd.ang); c.globalAlpha = c.globalAlpha * st.a; c.font = f; c.lineWidth = 4; c.strokeStyle = L.roadHalo; c.strokeText(it.text, 0, 0.5); c.fillStyle = fill; c.fillText(it.text, 0, 0.5); c.restore();
    }
    c.restore();
    if (state.size > 400) for (const k of state.keys()) if (!seenIds.has(k)) state.delete(k);
    return taken;
  }
  return { draw, reset() { cache = null; state.clear(); sig = ''; void sig; } };
}
