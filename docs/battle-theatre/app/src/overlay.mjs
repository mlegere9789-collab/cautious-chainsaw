// 2D layer over the battlefield: evidence marks (tier colour + outline pattern + glyph, so tier never depends on colour alone), the selected unit with its
// position uncertainty, labels, placeholder objects (works), and hit testing for clicks. Reads the stage's per-frame unit table; draws nothing else.
import { TIER_STYLE } from './config.mjs';

const GLYPH = {
  circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); },
  diamond(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); },
  triangle(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .95, y + r * .8); c.lineTo(x - r * .95, y + r * .8); c.closePath(); },
  square(c, x, y, r) { c.beginPath(); c.rect(x - r * .8, y - r * .8, r * 1.6, r * 1.6); },
};
export function glyphSVG(tier, size = 14) {
  const s = TIER_STYLE[tier] || TIER_STYLE['open gap'], c = size / 2, r = size * .36;
  const shape = { circle: `<circle cx="${c}" cy="${c}" r="${r}"`, diamond: `<path d="M${c} ${c - r}L${c + r} ${c}L${c} ${c + r}L${c - r} ${c}Z"`, triangle: `<path d="M${c} ${c - r}L${c + r * .95} ${c + r * .8}L${c - r * .95} ${c + r * .8}Z"`, square: `<rect x="${c - r * .8}" y="${c - r * .8}" width="${r * 1.6}" height="${r * 1.6}"` }[s.glyph];
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${shape} fill="${s.color}" fill-opacity=".28" stroke="${s.color}" stroke-width="1.5"${s.dash.length ? ` stroke-dasharray="${s.dash.map(d => d * .5).join(' ')}"` : ''}/></svg>`;
}

export class Overlay {
  constructor({ canvas, stage, layer, cam, T, scope }) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.stage = stage; this.layer = layer; this.cam = cam; this.T = T; this.show = false; this.selected = -1; this.hover = -1; this.dpr = 1; this.w = 0; this.h = 0;
    this.tmp = { x: 0, z: 0, c: 1, s: 0, b: null }; this.sx = new Float32Array(8); this.proj = [0, 0, 0]; this.screen = new Float32Array(stage.n * 3); this.objectsOn = true; this.tMin = 0; this.sigma = 0;
    this.ids = layer.units; this.font = '12px system-ui, sans-serif';
    scope.add(() => { this.cv.width = 0; this.c = null; });
  }
  resize(w, h, dpr) { this.dpr = dpr; this.w = w; this.h = h; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); }
  // world -> css pixels. returns false when behind the camera
  project(x, y, z, out) {
    const m = this.cam.vp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.05) return false; out[0] = (cx / cw * .5 + .5) * this.w; out[1] = (1 - (cy / cw * .5 + .5)) * this.h; out[2] = cw; return true;
  }
  corners(i, pad = 0) {
    const f = this.stage.footprint(i, this.tmp), b = f.b, T = this.T, p = this.proj, s = this.sx; let n = 0;
    const pts = [[b[0] - pad, b[2] - pad], [b[1] + pad, b[2] - pad], [b[1] + pad, b[3] + pad], [b[0] - pad, b[3] + pad]];
    for (const [lx, lz] of pts) { const wx = f.x + lx * f.c + lz * f.s, wz = f.z - lx * f.s + lz * f.c; if (!this.project(wx, T.h(wx, wz) + 1.2, wz, p)) return 0; s[n * 2] = p[0]; s[n * 2 + 1] = p[1]; n++; }
    return n;
  }
  draw(tMin, opts) {
    const c = this.c; if (!c) return; const { w, h, dpr } = this; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); this.tMin = tMin;
    const st = this.stage, p = this.proj, units = this.ids; let labels = 0;
    if (this.show) {
      c.lineWidth = 1.4; c.font = this.font;
      for (let i = 0, nU = units.length; i < nU; i++) {                      // the layer's units (a drawn gun's detachment is appended after them and has no card)
        if (!st.present[i]) continue;
        if (!this.project(st.cx[i], this.T.h(st.cx[i], st.cz[i]) + 1.5, st.cz[i], p)) continue;
        if (p[0] < -60 || p[0] > w + 60 || p[1] < -60 || p[1] > h + 60) continue;
        const tier = units[i].tier, S = TIER_STYLE[tier], big = p[2] < 2200; let drawn = false;
        if (big && this.corners(i, 1.5) === 4) {
          const s = this.sx, area = Math.abs((s[0] * s[3] - s[1] * s[2]) + (s[2] * s[5] - s[3] * s[4]) + (s[4] * s[7] - s[5] * s[6]) + (s[6] * s[1] - s[7] * s[0])) / 2;
          if (area > 140) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.lineTo(s[4], s[5]); c.lineTo(s[6], s[7]); c.closePath(); c.fillStyle = S.color + '33'; c.fill(); c.strokeStyle = S.color; c.setLineDash(S.dash); c.stroke(); c.setLineDash([]); drawn = true; }
        }
        if (!drawn) { const r = 5; GLYPH[S.glyph](c, p[0], p[1], r); c.fillStyle = S.color + '55'; c.fill(); c.strokeStyle = S.color; c.setLineDash(S.dash.length ? [3, 2] : []); c.stroke(); c.setLineDash([]); }
        if (p[2] < 420 && labels < 14) { labels++; c.fillStyle = '#ecebe6'; c.globalAlpha = .85; c.fillText(units[i].short, p[0] + 8, p[1] - 6); c.globalAlpha = 1; }
      }
    }
    if (opts.objects) this.drawObjects(c, opts);
    if (this.hover >= 0 && this.hover !== this.selected && st.present[this.hover]) this.ring(c, this.hover, '#ffffff', 1.4, false);
    if (this.selected >= 0 && st.present[this.selected]) this.ring(c, this.selected, '#e8d5a3', 2.2, true);
  }
  ring(c, i, color, lw, label) {
    const p = this.proj, st = this.stage;
    if (this.corners(i, 2) === 4) { const s = this.sx; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.lineTo(s[4], s[5]); c.lineTo(s[6], s[7]); c.closePath(); c.fillStyle = color + '22'; c.fill(); c.lineWidth = lw; c.strokeStyle = color; c.stroke(); c.lineWidth = 1.4; }
    if (!this.project(st.cx[i], this.T.h(st.cx[i], st.cz[i]) + 1.5, st.cz[i], p)) return;
    if (label) {
      // position uncertainty: a ring on the ground of radius sigma_m
      const r = st.sig[i]; if (r > 0) { c.beginPath(); let ok = true; const q = [0, 0, 0]; for (let k = 0; k <= 40; k++) { const a = k / 40 * 6.2832, wx = st.cx[i] + Math.cos(a) * r, wz = st.cz[i] + Math.sin(a) * r; if (!this.project(wx, this.T.h(wx, wz) + 1, wz, q)) { ok = false; break; } k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } if (ok) { c.setLineDash([2, 5]); c.strokeStyle = '#e8d5a3'; c.lineWidth = 1.2; c.stroke(); c.setLineDash([]); c.lineWidth = 1.4; } }
      const t = this.ids[i].short; c.font = '600 12.5px system-ui, sans-serif'; const tw = c.measureText(t).width;
      c.fillStyle = 'rgba(14,14,25,.82)'; c.fillRect(p[0] + 10, p[1] - 24, tw + 14, 20); c.fillStyle = '#e8d5a3'; c.fillText(t, p[0] + 17, p[1] - 10); c.font = this.font;
    }
  }
  drawObjects(c, opts) {
    const { objects, progress, geo } = opts, p = [0, 0, 0], T = this.T; this.objPts = this.objPts || new Map();
    for (const o of objects) {
      const prog = progress(o, this.tMin); if (prog <= 0) continue; const S = TIER_STYLE[o.tier] || TIER_STYLE['plausible-procedural'];
      if (!o.line) {                      // known only to a named place (no mapped line): a ring of the place's sigma, labelled with the place
        let g = this.objPts.get(o.id); if (!g) { g = geo.xz(o.at.lng, o.at.lat); this.objPts.set(o.id, g); }
        const r = o.at.sigma_m; c.beginPath(); let ok = true, f0 = null;
        for (let k = 0; k <= 36; k++) { const a = k / 36 * 6.2832, wx = g[0] + Math.cos(a) * r, wz = g[1] + Math.sin(a) * r; if (!this.project(wx, T.h(wx, wz) + 1.5, wz, p)) { ok = false; break; } if (!f0) f0 = [p[0], p[1], p[2]]; k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
        if (ok) { c.lineWidth = 1.6; c.strokeStyle = S.color; c.setLineDash(o.pre_existing ? [2, 3] : [8, 3]); c.stroke(); c.setLineDash([]); c.lineWidth = 1.4; if (f0 && f0[2] < 1800) { c.fillStyle = S.color; c.font = '11.5px system-ui'; c.fillText(`${o.name} · at ${o.at.place} (no mapped line)${o.pre_existing ? '' : ` · ${Math.round(prog * 100)}% built`}`, f0[0] + 6, f0[1] - 6); } }
        continue;
      }
      let pts = this.objPts.get(o.id); if (!pts) { pts = o.line.map(q => geo.xz(q.lng, q.lat)); this.objPts.set(o.id, pts); }
      let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      let left = len * prog, started = false, first = null; c.beginPath();
      for (let k = 0; k < pts.length && left >= 0; k++) {
        let x = pts[k][0], z = pts[k][1];
        if (k > 0) { const seg = Math.hypot(x - pts[k - 1][0], z - pts[k - 1][1]); if (left < seg) { const f = left / seg; x = pts[k - 1][0] + (x - pts[k - 1][0]) * f; z = pts[k - 1][1] + (z - pts[k - 1][1]) * f; } left -= seg; }
        if (!this.project(x, T.h(x, z) + 1.5, z, p)) continue; started ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); if (!started) first = [p[0], p[1], p[2]]; started = true;
      }
      c.lineWidth = o.pre_existing ? 2 : 3; c.strokeStyle = S.color; c.setLineDash(o.pre_existing ? [] : [8, 3]); c.stroke(); c.setLineDash([]); c.lineWidth = 1.4;
      if (first && first[2] < 900) { c.fillStyle = S.color; c.font = '11.5px system-ui'; c.fillText(o.name + (o.pre_existing ? '' : ` (${Math.round(prog * 100)}% built)`), first[0] + 6, first[1] - 6); }
    }
  }
  // click -> unit index (or -1): footprint containing the point, else the nearest mark within 22 px
  pick(px, py) {
    const st = this.stage, p = this.proj, s = this.sx; let best = -1, bd = 1e9;
    for (let i = 0, nU = this.ids.length; i < nU; i++) {
      if (!st.present[i]) continue; if (!this.project(st.cx[i], this.T.h(st.cx[i], st.cz[i]) + 1.5, st.cz[i], p)) continue;
      const d = Math.hypot(p[0] - px, p[1] - py);
      if (p[2] < 2200 && this.corners(i, 2) === 4) { let inside = false; for (let a = 0, b = 3; a < 4; b = a++) { const xi = s[a * 2], yi = s[a * 2 + 1], xj = s[b * 2], yj = s[b * 2 + 1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; } if (inside && d - 1000 < bd) { bd = d - 1000; best = i; continue; } }
      if (d < 22 && d < bd) { bd = d; best = i; }
    }
    return best;
  }
}
