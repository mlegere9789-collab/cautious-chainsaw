// 2D marks over the picture for the structures: the Evidence outlines (tier colour + dash + glyph, as for units), labels of markers near the camera, hospital badges, and the
// selected object. Drawn on the overlay canvas after the units; reads the model, draws nothing else.
import { TIER_STYLE } from '../config.mjs';

const GL = {
  circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); },
  diamond(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); },
  triangle(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .95, y + r * .8); c.lineTo(x - r * .95, y + r * .8); c.closePath(); },
  square(c, x, y, r) { c.beginPath(); c.rect(x - r * .8, y - r * .8, r * 1.6, r * 1.6); },
};
const RANGE = { buildings: 2200, masses: 1100, fences: 1500, markers: 1800, roads: 4000 };
export function drawStructureMarks(th, ov) {
  const S = th.structs; if (!S || !S.model || !ov.c) return;
  const m = S.model, c = ov.c, on = th.state.layers, cam = th.cam, T = th.T, p = [0, 0, 0], t = th.state.t, sel = th.state.selectedObj;
  const dist = (x, z) => Math.hypot(x - cam.x, z - cam.z), W = ov.w, H = ov.h; let labels = 0;
  c.save(); c.lineWidth = 1.3;
  const path = (pts, y, closed) => { let started = false, any = false; c.beginPath(); for (let k = 0; k < pts.length; k++) { const q = pts[k]; if (!ov.project(q[0], typeof y === 'function' ? y(q) : y, q[1], p)) { started = false; continue; } any = true; started ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); started = true; } if (closed && any) c.closePath(); return any; };
  const sampled = (pts, max) => (pts.length <= max ? pts : pts.filter((_, i) => i % Math.ceil(pts.length / max) === 0 || i === pts.length - 1));
  if (ov.show) {                                                                          // the Evidence outlines
    for (const o of m.objects) {
      if (o.dropped || !on[o.cls]) continue; const st = TIER_STYLE[o.tier] || TIER_STYLE['plausible-procedural'];
      const cx = o.c ? o.c[0] : o.bbox ? (o.bbox[0] + o.bbox[2]) / 2 : null, cz = o.c ? o.c[1] : o.bbox ? (o.bbox[1] + o.bbox[3]) / 2 : null;
      if (o.cls !== 'roads' && cx != null && dist(cx, cz) > RANGE[o.cls]) continue;
      c.strokeStyle = st.color; c.setLineDash(st.dash); c.fillStyle = st.color + '26';
      if (o.cls === 'buildings' || o.cls === 'masses') { if (path(sampled(o.ring, 60), q => (o.form ? o.form.floorY + o.form.eaveH + o.form.rise : T.h(q[0], q[1]) + 6), true)) { c.fill(); c.stroke(); } }
      else if (o.cls === 'fences') { for (const run of o.runs) { if (path(sampled(run, 120), q => T.h(q[0], q[1]) + 1.2, false)) c.stroke(); } }
      else if (o.cls === 'roads') { c.globalAlpha = .75; for (const run of o.lines) { if (dist(run[0][0], run[0][1]) > RANGE.roads) continue; if (path(sampled(run, 160), q => T.h(q[0], q[1]) + .4, false)) c.stroke(); } c.globalAlpha = 1; }
      else if (o.cls === 'markers') { if (ov.project(o.c[0], T.h(o.c[0], o.c[1]) + 5, o.c[1], p) && p[0] > -20 && p[0] < W + 20 && p[1] > -20 && p[1] < H + 20) { GL[st.glyph](c, p[0], p[1], 6); c.fill(); c.setLineDash(st.dash.length ? [3, 2] : []); c.stroke(); } }
    }
    c.setLineDash([]);
  }
  // labels of markers near the camera: the label is the point-only structure's name (no footprint is drawn for it)
  c.font = '11.5px system-ui, sans-serif';
  for (const o of m.objects) {
    if (o.cls !== 'markers' || !on.markers || o.dropped) continue; const d = dist(o.c[0], o.c[1]); if (d > 420 || labels > 14) continue;
    if (!ov.project(o.c[0], T.h(o.c[0], o.c[1]) + 6, o.c[1], p) || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue; labels++;
    c.fillStyle = 'rgba(14,14,25,.78)'; const txt = o.name.length > 46 ? o.name.slice(0, 44) + '…' : o.name, w = c.measureText(txt).width; c.fillRect(p[0] + 8, p[1] - 15, w + 10, 17); c.fillStyle = (TIER_STYLE[o.tier] || TIER_STYLE['plausible-procedural']).color; c.fillText(txt, p[0] + 13, p[1] - 3);
  }
  // hospital badges
  if (!m._hosp) m._hosp = m.objects.filter(o => !o.dropped && (o.cls === 'buildings' || o.cls === 'markers') && o.rec && m.hospitalsOf(o, 0).length);
  for (const o of m._hosp) {
    if (!on[o.cls]) continue; const cx = o.c[0], cz = o.c[1], d = dist(cx, cz); if (d > 1500) continue;
    const hs = m.hospitalsOf(o, t).filter(h => h.phase === 'open' || h.phase === 'opening' || h.phase === 'closing'); if (!hs.length) continue;
    const y = (o.form ? o.form.floorY + o.form.eaveH + o.form.rise : T.h(cx, cz) + 4.6) + 2 + d * 0.004;
    if (!ov.project(cx, y, cz, p) || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
    const dashed = hs.every(h => h.phase !== 'open'); c.beginPath(); c.arc(p[0], p[1], 8.5, 0, 6.2832); c.fillStyle = dashed ? 'rgba(236,235,230,.35)' : 'rgba(236,235,230,.92)'; c.fill(); c.strokeStyle = '#7a2e2e'; c.lineWidth = 1.6; c.setLineDash(dashed ? [3, 2] : []); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#7a2e2e'; c.font = '700 11px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', p[0], p[1] + 0.5); c.textAlign = 'start'; c.textBaseline = 'alphabetic'; c.lineWidth = 1.3;
  }
  // the selected object
  if (sel >= 0) {
    const o = m.objects[sel];
    if (o && !o.dropped) {
      c.strokeStyle = '#e8d5a3'; c.lineWidth = 2.4; c.setLineDash([]); c.fillStyle = 'rgba(232,213,163,.14)'; let anchor = null;
      if (o.cls === 'buildings' || o.cls === 'masses') { if (path(o.ring, q => (o.form ? o.form.floorY + o.form.eaveH + o.form.rise : T.h(q[0], q[1]) + 6), true)) { c.fill(); c.stroke(); } anchor = [o.c[0], (o.form ? o.form.floorY + o.form.eaveH + o.form.rise : T.h(o.c[0], o.c[1]) + 6) + 2, o.c[1]]; }
      else if (o.cls === 'fences') { c.lineWidth = 3.2; for (const run of o.runs) if (path(run, q => T.h(q[0], q[1]) + 1.2, false)) c.stroke(); const r0 = o.runs[0][Math.floor(o.runs[0].length / 2)]; anchor = [r0[0], T.h(r0[0], r0[1]) + 2.5, r0[1]]; }
      else if (o.cls === 'roads') { c.lineWidth = 3.2; for (const run of o.lines) if (path(sampled(run, 400), q => T.h(q[0], q[1]) + .4, false)) c.stroke(); const r0 = o.lines[0][Math.floor(o.lines[0].length / 2)]; anchor = [r0[0], T.h(r0[0], r0[1]) + 3, r0[1]]; }
      else if (o.cls === 'markers') { if (ov.project(o.c[0], T.h(o.c[0], o.c[1]) + 5, o.c[1], p)) { c.beginPath(); c.arc(p[0], p[1], 13, 0, 6.2832); c.stroke(); } anchor = [o.c[0], T.h(o.c[0], o.c[1]) + 7, o.c[1]]; }
      else if (o.cls === 'works') { const pts = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * 6.2832; pts.push([o.c[0] + Math.cos(a) * o.r, o.c[1] + Math.sin(a) * o.r]); } c.lineWidth = 3; if (path(pts, q => T.h(q[0], q[1]) + 1.5, false)) c.stroke(); anchor = [o.c[0] + o.r, T.h(o.c[0] + o.r, o.c[1]) + 4, o.c[1]]; }
      if (anchor && ov.project(anchor[0], anchor[1], anchor[2], p)) {
        const txt = o.name.length > 60 ? o.name.slice(0, 58) + '…' : o.name; c.font = '600 12.5px system-ui, sans-serif'; const w = c.measureText(txt).width;
        c.fillStyle = 'rgba(14,14,25,.84)'; c.fillRect(p[0] + 10, p[1] - 24, w + 14, 20); c.fillStyle = '#e8d5a3'; c.fillText(txt, p[0] + 17, p[1] - 10);
      }
    }
  }
  c.restore();
}
