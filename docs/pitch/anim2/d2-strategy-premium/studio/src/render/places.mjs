// render/places.mjs - the place names of the ground, drawn by the Studio instead of by the basemap, for one reason: a name must never be half hidden by a mark.  The basemap lays its labels out
// without knowing about the units, so a mark covered the first letters of "The Angle (High Water Mark)" and left "gle (High Water Mark)" (iteration 1).  Here every place is a small ring or dot with its
// name beside it, placed on the first of four sides that is free of every mark's footprint and pin, and faded out (never cut) when no side is free; it returns after it has been free for a moment, so a
// mark passing by does not make a name blink.
//
// Evidence (the basemap's own classification, read from VECTORS.places): a filled dot = the position was measured against the elevation model ('Measured'); an open ring = the site's own position
// ('Modelled'); an open ring with the name in italic = the position is in doubt (a landmark check found no building of that name at the mark, or the two frames disagree).  No dashed outline.
import { VECTORS } from '../../../../basemap/data/vectors.mjs';
import { project } from '../geo/project.mjs';

const PLACES = (VECTORS.places || []).map((p) => ({ ...p }));
const ORDER = { loc: 0, struct: 1, feat: 2 };
const state = new Map();           // place id -> { a (opacity), free (ms continuously free), side }
const FAM = '"Barlow Semi Condensed", "Bahnschrift SemiCondensed", "Segoe UI", system-ui, sans-serif';
let tw = new Map();

const SPR = new Map();
/** the ring (or dot) and the name of one place, drawn once into a small bitmap (a text stroke per label per frame cost 3 ms of GPU time at the whole-field zoom: measured, iteration 2) */
function placeSprite(c, p, name, side, r, tw) {
  let a = 1; try { a = c.getTransform().a || 1; } catch { a = 1; } const S = Math.max(1, Math.ceil(a - 0.01)); const key = p.id + '|' + side + '|' + S + '|' + name; let e = SPR.get(key); if (e) return e;
  const measured = p.ev === 'Measured'; const doubt = !!p.off; const pad = 4; const W = Math.ceil(r + 7 + tw + 2 * pad + r + 6); const H = 22;
  const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.scale(S, S); g.textBaseline = 'middle'; g.lineJoin = 'round';
  const cx = side > 0 ? pad + r + 3 : W - pad - r - 3; const cy = H / 2;
  g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.lineWidth = 3.2; g.strokeStyle = 'rgba(6,9,13,0.78)'; g.stroke(); g.lineWidth = 1.3; g.strokeStyle = '#eef0ea'; g.stroke();
  if (measured) { g.beginPath(); g.arc(cx, cy, r - 1.6, 0, 6.2832); g.fillStyle = '#eef0ea'; g.fill(); }
  g.font = (doubt ? 'italic ' : '') + `600 11px ${FAM}`; try { g.letterSpacing = '0.7px'; } catch { /* no tracking */ }
  g.textAlign = side > 0 ? 'left' : 'right'; const tx = side > 0 ? cx + r + 7 : cx - r - 7; g.lineWidth = 3.4; g.strokeStyle = 'rgba(6,9,13,0.86)'; g.strokeText(name, tx, cy + 0.5); g.fillStyle = '#eef0ea'; g.fillText(name, tx, cy + 0.5);
  e = { cv, w: W, h: H, ox: cx, oy: cy }; if (SPR.size > 300) SPR.clear(); SPR.set(key, e); return e;
}

/** @param {CanvasRenderingContext2D} c in CSS px  @param {{lng,lat,zoom,w,h,origin():number[]}} cam  @param {object[]} tiles display tiles  @param {{dx:number,dy:number}} view  @param {number} nowMs */
export function drawPlaces(c, cam, tiles, view, nowMs, opts = {}) {
  const z = cam.zoom; const o = cam.origin(); const W = cam.w; const H = cam.h;
  const rects = []; for (const t of tiles) { if (t.opacity < 0.3) continue; const x = t.x + view.dx; const y = t.y + view.dy; const hw = t.w * t.scale / 2 + 4; const hh = t.h * t.scale / 2 + 4; if (x + hw < -10 || x - hw > W + 10 || y + hh < -10 || y - hh > H + 10) continue; rects.push({ x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh }); if (t.displaced) rects.push({ x0: t.ax + view.dx - 5, y0: t.ay + view.dy - 5, x1: t.ax + view.dx + 5, y1: t.ay + view.dy + 5 }); }
  const hit = (r) => { for (const q of rects) if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) return true; return false; };
  const placed = [];
  c.save(); c.textBaseline = 'middle'; c.lineJoin = 'round'; c.font = `600 11px ${FAM}`; try { c.letterSpacing = '0.7px'; } catch { /* older browsers: no tracking */ }
  const seen = new Set(); let any = false;
  for (const p of [...PLACES].sort((a, b) => ORDER[a.k] - ORDER[b.k])) {
    if (p.k === 'loc' ? z < 12.5 : z < 14.5) continue; if (seen.has(p.n)) continue; seen.add(p.n);
    const lng = p.glng != null ? p.glng : p.plng ?? p.lng; const lat = p.glat != null ? p.glat : p.plat ?? p.lat; const [wx, wy] = project(lng, lat, z); const x = wx - o[0]; const y = wy - o[1];
    let st = state.get(p.id); if (!st) { st = { a: 0, free: 0, side: 1 }; state.set(p.id, st); }
    if (x < -90 || x > W + 220 || y < -20 || y > H + 20) { st.a = 0; st.free = 0; continue; }
    const name = (opts.upper === false ? p.n : p.n.toUpperCase()); const key = c.font + '|' + name; let w = tw.get(key); if (w === undefined) { w = c.measureText(name).width; if (tw.size > 400) tw.clear(); tw.set(key, w); }
    const r = p.k === 'loc' ? 3.6 : 2.8; const ring = { x0: x - r - 3, y0: y - r - 3, x1: x + r + 3, y1: y + r + 3 };
    let side = 0; let rect = null;
    if (!hit(ring)) for (const s of [st.side, -st.side]) { const rc = s > 0 ? { x0: x + r + 6, y0: y - 8, x1: x + r + 6 + w + 4, y1: y + 8 } : { x0: x - r - 6 - w - 4, y0: y - 8, x1: x - r - 6, y1: y + 8 }; if (!hit(rc) && !placed.some((q) => rc.x0 < q.x1 && rc.x1 > q.x0 && rc.y0 < q.y1 && rc.y1 > q.y0)) { side = s; rect = rc; break; } }
    const ok = side !== 0 && !placed.some((q) => ring.x0 < q.x1 && ring.x1 > q.x0 && ring.y0 < q.y1 && ring.y1 > q.y0);
    const dt = Math.min(100, Math.max(0, nowMs - (st.t || nowMs))); st.t = nowMs;
    if (ok) { st.free += dt; st.side = side; if (st.free > 260 || st.a > 0.02) st.a = Math.min(1, st.a + dt / 240); } else { st.free = 0; st.a = Math.max(0, st.a - dt / 160); }
    if (ok) { placed.push(ring, rect); }
    else if (st.a > 0.01) { placed.push(ring); }
    if (st.a < 0.01) continue; any = any || st.a < 0.99;
    const sd = ok ? side : st.side; const spr = placeSprite(c, p, name, sd, r, w); c.globalAlpha = st.a; c.drawImage(spr.cv, x - spr.ox, y - spr.oy, spr.w, spr.h); c.globalAlpha = 1;
  }
  c.restore(); return any;
}

const SW = new Map();
/** a swatch (a CSS background) of a place mark for the legend, drawn with the same ring, dot and type as the map: kind = 'measured' (filled dot), 'modelled' (open ring), 'doubt' (open ring, italic name) */
export function placeSwatch(kind) {
  if (typeof document === 'undefined') return '#5a6350'; if (SW.has(kind)) return SW.get(kind);
  const W = 78; const H = 38; const D = 3; const cv = document.createElement('canvas'); cv.width = W * D; cv.height = H * D; const c = cv.getContext('2d'); c.scale(D, D);
  c.fillStyle = '#3c4538'; c.fillRect(0, 0, W, H); const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const x = 14; const y = H / 2; const r = 3.6; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.lineWidth = 3.2; c.strokeStyle = 'rgba(6,9,13,0.78)'; c.stroke(); c.lineWidth = 1.3; c.strokeStyle = '#eef0ea'; c.stroke();
  if (kind === 'measured') { c.beginPath(); c.arc(x, y, r - 1.6, 0, 6.2832); c.fillStyle = '#eef0ea'; c.fill(); }
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = (kind === 'doubt' ? 'italic ' : '') + `600 11px ${FAM}`; try { c.letterSpacing = '0.7px'; } catch { /* no tracking */ }
  c.lineWidth = 3.4; c.lineJoin = 'round'; c.strokeStyle = 'rgba(6,9,13,0.86)'; c.strokeText('NAME', x + r + 7, y + 0.5); c.fillStyle = '#eef0ea'; c.fillText('NAME', x + r + 7, y + 0.5);
  const url = `url("${cv.toDataURL('image/png')}") center / 100% 100% no-repeat`; SW.set(kind, url); return url;
}
