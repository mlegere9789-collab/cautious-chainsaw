// vectors.mjs - the vector layers of the backdrop: water, roads, railroad, contours and the place marks.  They are stored once, quantised, and projected per frame with two
// multiplications per vertex (unit-square mercator x scale - origin), culled by bounding box.  Public domain sources: Census TIGER/Line (roads, rail, streams, water), contours
// from the USGS 3DEP DEM, place marks from the site's terrain.json (see README).
import { unitX, unitY } from './geo.mjs';
import { stops } from './looks.mjs';

function unb64(s) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** zigzag varints -> polylines.  stream = [npts, x0, y0, dx, dy, ...] repeated; q = zoom of the integer grid */
function decodeLines(b64, q) {
  const b = unb64(b64); let p = 0; const inv = 1 / 2 ** (q + 9);
  const next = () => { let v = 0, sh = 0, c; do { c = b[p++]; v |= (c & 127) << sh; sh += 7; } while (c & 128); return (v >>> 1) ^ -(v & 1); };
  const lines = [];
  while (p < b.length) {
    const n = next(); const pts = new Float64Array(n * 2); let x = 0, y = 0;
    let minx = 1, miny = 1, maxx = 0, maxy = 0;
    for (let i = 0; i < n; i++) {
      x += next(); y += next(); const ux = x * inv, uy = y * inv; pts[i * 2] = ux; pts[i * 2 + 1] = uy;
      if (ux < minx) minx = ux; if (ux > maxx) maxx = ux; if (uy < miny) miny = uy; if (uy > maxy) maxy = uy;
    }
    lines.push({ pts, minx, miny, maxx, maxy });
  }
  return lines;
}

export class Vectors {
  constructor(data) {
    this.data = data; const q = data.q;
    this.groups = {};                                                      // layer -> [{ cls, name, lines[], ... }]
    for (const layer of Object.keys(data.layers)) {
      this.groups[layer] = data.layers[layer].map((g) => ({ ...g, lines: decodeLines(g.d, q), d: undefined }));
    }
    this.tw = new Map(); this.lay = null;
    this.places = (data.places || []).map((p) => ({ ...p, ux: unitX(p.lng), uy: unitY(p.lat), pux: unitX(p.plng ?? p.lng), puy: unitY(p.plat ?? p.lat) }));
  }

  /** draw everything under the place marks; returns the label candidates (drawn by drawLabels) */
  draw(ctx, view, look, opts, dpr) {
    const z = view.z; const S = 512 * 2 ** z; const ox = view.ox, oy = view.oy, W = view.w, H = view.h;
    const g = this.groups;
    const path = (line, close) => {
      const p = line.pts; const n = p.length / 2; let lx = -1e9, ly = -1e9; let first = true;
      for (let i = 0; i < n; i++) {
        const x = p[i * 2] * S - ox, y = p[i * 2 + 1] * S - oy;
        if (!first && i < n - 1 && Math.abs(x - lx) + Math.abs(y - ly) < 0.8) continue;       // sub-pixel vertices add nothing
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); lx = x; ly = y;
      }
      if (close) ctx.closePath();
    };
    const vis = (l) => !(l.maxx * S - ox < -8 || l.minx * S - ox > W + 8 || l.maxy * S - oy < -8 || l.miny * S - oy > H + 8);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // water bodies, then streams
    if (opts.water !== false && look.water) {
      const w = look.water;
      for (const grp of g.water || []) {
        ctx.beginPath(); for (const l of grp.lines) if (vis(l)) path(l, true);
        ctx.fillStyle = w.fill; ctx.fill();
      }
      ctx.strokeStyle = w.lineColor; ctx.globalAlpha = stops(w.lineAlpha, z); ctx.lineWidth = stops(w.line, z);
      for (const grp of g.streams || []) {
        if (grp.minZoom && z < grp.minZoom) continue;
        ctx.beginPath(); for (const l of grp.lines) if (vis(l)) path(l, false); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // contours: index (50 ft) first, then the 10 ft lines when zoomed in
    if (opts.contours !== false && look.contours) {
      const c = look.contours;
      for (const kind of ['minor', 'major']) {
        const a = stops(c[kind].alpha, z); if (a <= 0.004) continue;
        ctx.globalAlpha = a; ctx.strokeStyle = c.color; ctx.lineWidth = stops(c[kind].width, z); ctx.beginPath();
        for (const grp of g.contours || []) if (grp.kind === kind) for (const l of grp.lines) if (vis(l)) path(l, false);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // roads: casing for every class first, then the fills, so crossings read as junctions
    if (opts.roads !== false && look.roads) {
      const R = look.roads; const classes = ['trail', 'local', 'secondary', 'primary'];
      const fade = R.fade ? stops(R.fade, z) : 1;                                       // zoomed right in the aerial shows the real road: the overlay thins out so it never reads as a second, thinner road drawn inside the first
      ctx.globalAlpha = fade;
      const pass = (casing) => {
        for (const cls of classes) {
          const st = R[cls]; if (!st || (st.minZoom && z < st.minZoom)) continue;
          const wd = stops(st.width, z); if (wd <= 0.05) continue;
          ctx.setLineDash(st.dash && !casing ? st.dash : []);
          ctx.strokeStyle = casing ? R.casing.color : st.color; ctx.lineWidth = casing ? wd + R.casing.extra : wd;
          if (casing && cls === 'trail') continue;
          ctx.beginPath();
          for (const grp of g.roads || []) if (grp.cls === cls) for (const l of grp.lines) if (vis(l)) path(l, false);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      };
      if (fade > 0.01) { pass(true); pass(false); }
      const rs = R.rail;
      if (rs && (g.rail || []).length) {
        ctx.strokeStyle = rs.color; ctx.lineWidth = stops(rs.width, z); ctx.beginPath();
        for (const grp of g.rail) for (const l of grp.lines) if (vis(l)) path(l, false);
        ctx.stroke();
        if (rs.tick) { ctx.lineWidth = stops(rs.width, z) * 3.4; ctx.setLineDash([1.1, 5.5]); ctx.lineCap = 'butt'; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'round'; }
      }
      ctx.globalAlpha = 1;
    }
  }

  /** labels: water names, road names along their lines, then the place marks.  The placement (greedy collision in screen space) is computed once per zoom step and reused while the
   *  camera pans inside the margin, with every label anchored in world coordinates: labels move with the ground and never flicker; per frame this is a loop of ~50 text draws. */
  drawLabels(ctx, view, look, opts) {
    const z = view.z; const S = 512 * 2 ** z; const ox = view.ox, oy = view.oy, W = view.w, H = view.h;
    const key = [Math.round(z * 8), look.id, look.version || 0, W, H, opts.places, opts.placeFrame, opts.labels].join('|');
    const cxw = ox + W / 2, cyw = oy + H / 2; const MARGIN = 360;
    const lay = this.lay;
    if (!lay || lay.key !== key || Math.abs(cxw / S - lay.cx) * S > MARGIN * 0.45 || Math.abs(cyw / S - lay.cy) * S > MARGIN * 0.45) this.lay = this.layout(ctx, view, look, opts, key, MARGIN);
    const L = look.labels; const items = this.lay.items;
    ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const it of items) {
      const x = it.ux * S - ox, y = it.uy * S - oy; if (x < -120 || x > W + 120 || y < -120 || y > H + 120) continue;
      ctx.font = it.font;
      if (it.k === 'line') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(it.ang); ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = it.halo; ctx.strokeText(it.text, 0, 0); ctx.fillStyle = it.fill; ctx.fillText(it.text, 0, 0); ctx.restore();
      } else {
        const r = it.r;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.lineWidth = 3; ctx.strokeStyle = L.dotRing; ctx.stroke(); ctx.lineWidth = 1.4; ctx.strokeStyle = L.dot; ctx.stroke();
        if (it.measured) { ctx.beginPath(); ctx.arc(x, y, r - 1.9, 0, 6.2832); ctx.fillStyle = L.dot; ctx.fill(); }          // a filled dot: this position was measured against the ground; the rings are the data's own claim (Modelled)
        if (it.dashed) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
        ctx.textAlign = it.side > 0 ? 'left' : 'right'; const tx = it.side > 0 ? x + r + 8 : x - r - 8;
        ctx.lineWidth = 3.4; ctx.strokeStyle = L.placeHalo; ctx.strokeText(it.text, tx, y); ctx.fillStyle = L.place; ctx.fillText(it.text, tx, y);
      }
    }
  }

  textW(ctx, font, t) {
    const k = font + '|' + t; let w = this.tw.get(k);
    if (w === undefined) { ctx.font = font; w = ctx.measureText(t).width; this.tw.set(k, w); }
    return w;
  }

  /** the greedy placement over the view plus a margin; items are stored in unit-square world coordinates */
  layout(ctx, view, look, opts, key, MARGIN) {
    const z = view.z; const S = 512 * 2 ** z; const ox = view.ox - MARGIN, oy = view.oy - MARGIN, W = view.w + 2 * MARGIN, H = view.h + 2 * MARGIN;
    const L = look.labels; const placed = []; const items = [];
    const hit = (r) => { for (const p of placed) if (r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y) return true; return false; };
    const unit = (x, y) => [(x + ox) / S, (y + oy) / S];
    // place marks first so they win collisions
    const marks = [];
    if (opts.places !== false && this.places.length) {
      const frame = opts.placeFrame || 'ground'; const seen = new Set(); const order = { loc: 0, struct: 1, feat: 2 };
      for (const p of [...this.places].sort((a, b) => order[a.k] - order[b.k])) {
        if (p.k === 'loc' ? z < 12.5 : z < 14.5) continue;
        if (seen.has(p.n)) continue; seen.add(p.n);                                                  // the same name twice (a place and its farm) is one mark
        let ux = p.ux, uy = p.uy;
        if (frame === 'production') { ux = p.pux; uy = p.puy; } else if (frame === 'ground') { if (p.glng != null) { ux = unitX(p.glng); uy = unitY(p.glat); } else { ux = p.pux; uy = p.puy; } }     // ground = production frame, with the hills the DEM places elsewhere moved to their summits
        const x = ux * S - ox, y = uy * S - oy; if (x < -80 || x > W + 220 || y < -20 || y > H + 20) continue;
        marks.push({ p, x, y, ux, uy });
      }
    }
    if (opts.labels !== false) {
      const lineLabels = (layer, filter, font, fill, halo, minZ) => {
        if (z < minZ) return;
        for (const grp of this.groups[layer] || []) {
          if (!grp.name || !filter(grp) || /^(US Hwy|State Rte)/.test(grp.name)) continue; let count = 0;
          const tw = this.textW(ctx, font, grp.name) + 6;
          for (const l of grp.lines) {
            if (count >= 2) break; const p = l.pts; const n = p.length / 2; if (n < 2) continue;
            if (l.maxx * S - ox < -4 || l.minx * S - ox > W + 4 || l.maxy * S - oy < -4 || l.miny * S - oy > H + 4) continue;
            const pts = new Float64Array(p.length);
            for (let i = 0; i < n; i++) { pts[i * 2] = p[i * 2] * S - ox; pts[i * 2 + 1] = p[i * 2 + 1] * S - oy; }
            const s = bestRun(pts, tw, W, H, placed, 12 + MARGIN * 0.25); if (!s) continue;
            const [ux, uy] = unit(s.x, s.y); items.push({ k: 'line', text: grp.name, font, fill, halo, ux, uy, ang: s.ang }); placed.push(s.rect); count++;
          }
        }
      };
      lineLabels('streams', () => true, 'italic ' + L.roadFont, L.water, L.roadHalo, 14.6);
      lineLabels('roads', (gp) => gp.cls === 'primary' || gp.cls === 'secondary', L.roadFont, L.road, L.roadHalo, 14.2);
      lineLabels('roads', (gp) => gp.cls === 'local' && gp.label, L.roadFont, L.road, L.roadHalo, 15.4);
    }
    for (const m of marks) {
      const name = m.p.n; const tw = this.textW(ctx, L.placeFont, name); const r = m.p.k === 'loc' ? 4 : 3;
      const ring = { x: m.x - r - 3, y: m.y - r - 3, w: 2 * r + 6, h: 2 * r + 6 };
      if (hit(ring)) continue;                                                                                    // the ring would sit on another label or mark
      let side = 1; let rect = { x: m.x + r + 5, y: m.y - 8, w: tw + 6, h: 16 };
      if (hit(rect)) { side = -1; rect = { x: m.x - r - 5 - tw - 6, y: m.y - 8, w: tw + 6, h: 16 }; if (hit(rect)) continue; }       // no room for the name: no mark either (a bare ring reads as a glitch)
      items.push({ k: 'mark', text: name, font: L.placeFont, r, side, ux: m.ux, uy: m.uy, measured: m.p.ev === 'Measured' && (opts.placeFrame || 'ground') === 'ground', dashed: !!m.p.off || (!!m.p.d && (opts.placeFrame || 'ground') === 'legacy') });      // dashed ring: the two frames disagree about this place (legacy frame), or the landmark check found nothing of this name at the mark (README 7.2)
      placed.push(ring, rect);
    }
    return { key, items, cx: (view.ox + view.w / 2) / S, cy: (view.oy + view.h / 2) / S };
  }
}

/** the best place along a screen-space polyline for a label of width tw: a run that is straight to within 11 degrees, fully on screen, free of other labels */
function bestRun(pts, tw, W, H, placed, pad) {
  const n = pts.length / 2; const cum = new Float64Array(n); for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
  const total = cum[n - 1]; if (total < tw + 20) return null;
  const at = (s) => { let i = 1; while (i < n - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [pts[(i - 1) * 2] + (pts[i * 2] - pts[(i - 1) * 2]) * t, pts[(i - 1) * 2 + 1] + (pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]) * t]; };
  let best = null;
  for (let s = tw / 2 + 4; s <= total - tw / 2 - 4; s += 18) {
    const a = at(s - tw / 2), b = at(s + tw / 2), c = at(s); if (c[0] < pad || c[0] > W - pad || c[1] < pad || c[1] > H - pad) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); let ok = true;
    for (let i = 1; i < n && ok; i++) if (cum[i] > s - tw / 2 && cum[i - 1] < s + tw / 2) { const sa = Math.atan2(pts[i * 2 + 1] - pts[i * 2 - 1], pts[i * 2] - pts[i * 2 - 2]); let d = Math.abs(sa - ang); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 0.19) ok = false; }
    if (!ok) continue;
    let a2 = ang; if (a2 > Math.PI / 2) a2 -= Math.PI; else if (a2 < -Math.PI / 2) a2 += Math.PI;
    const cx = c[0], cy = c[1]; const rr = { x: cx - tw / 2 - 2, y: cy - 8, w: tw + 4, h: 16 };
    // rotated box approximated by its bounding box
    const ca = Math.abs(Math.cos(a2)), sa2 = Math.abs(Math.sin(a2)); const bw = tw * ca + 14 * sa2, bh = tw * sa2 + 14 * ca;
    const rect = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
    let clash = false; for (const p of placed) if (rect.x < p.x + p.w && rect.x + rect.w > p.x && rect.y < p.y + p.h && rect.y + rect.h > p.y) { clash = true; break; }
    if (clash) continue; void rr;
    const score = -Math.abs(c[0] - W / 2) - Math.abs(c[1] - H / 2) * 1.2;      // prefer the middle of the screen
    if (!best || score > best.score) best = { x: cx, y: cy, ang: a2, rect, score };
  }
  return best;
}
