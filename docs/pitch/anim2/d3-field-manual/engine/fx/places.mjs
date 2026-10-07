// fx/places.mjs - the NAMES OF PLACES, drawn so that no mark ever lies on a name and no name ever lies on a mark.
//
// The basemap module places its place marks once per zoom step, in world coordinates, without knowing where the unit marks are (they move every frame), so a unit mark could cover half of
// "Cemetery Hill".  Here the same 41 place marks (VECTORS.places of docs/pitch/anim2/basemap, in the 'ground' frame: the production terrain.json with the three hills moved to the summits the
// 3DEP elevation model measures) are laid out every frame against the solid marks of the frame: a ring and a name in the first of four slots (right, left, above, below) that is free, and
// neither when none is.  A name is ground annotation, not data about a unit, so hiding it when the ground is full is allowed; hiding a unit is not, and the units are never touched.
// A name appears only after its slot has been free for a few frames and fades out as soon as a mark arrives (no flicker while the marks glide).
//
// Evidence (as in the basemap): a ring is the site's own position (Modelled); a filled dot is a position moved to a measured summit (Measured); a dashed ring says the landmark check found no
// building of that name at the mark (the Lutheran Seminary and the Evergreen Cemetery gatehouse, basemap README 7.2).  This is the one dashed line in the language, and it belongs to the ground.
import { VECTORS } from '../../../basemap/data/vectors.mjs';
import { project } from '../geo/project.mjs';

const PLACES = (VECTORS.places || []).slice().sort((a, b) => ({ loc: 0, struct: 1, feat: 2 }[a.k] - { loc: 0, struct: 1, feat: 2 }[b.k]));
const unit = (lng, lat) => ({ lng, lat });
const posOf = (p) => (p.glng != null ? unit(p.glng, p.glat) : unit(p.plng ?? p.lng, p.plat ?? p.lat));        // the 'ground' frame
const STATE = new Map();
const FONT = '700 11px "FM Serif", Georgia, "Times New Roman", serif';        // the ground is annotated in the serif; the marks are set in the sans
const hit = (a, b, g = 0) => a.x0 < b.x1 + g && a.x1 > b.x0 - g && a.y0 < b.y1 + g && a.y1 > b.y0 - g;

export const placesFx = {
  id: 'places', label: 'Place names that avoid the marks',
  update() {},
  draw(c, frame, env) {
    if (!env.tok('backdrop.placeLabels')) return;
    const z = frame.zoom; const cam = frame.camera; const W = frame.view.w; const H = frame.view.h; const cc = project(cam.lng, cam.lat, z); const ox = cc[0] - W / 2; const oy = cc[1] - H / 2;
    const night = (typeof document !== 'undefined' && document.documentElement.dataset.theme) !== 'light';
    const ink = night ? '#eef2f6' : '#2a2216'; const halo = night ? 'rgba(8,11,14,0.85)' : 'rgba(244,238,224,0.92)';
    const obs = []; for (const t of frame.tiles) { if (t.opacity < 0.2) continue; const x = t.x + frame.view.dx; const y = t.y + frame.view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; obs.push({ x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh }); if (t.displaced) { const ax = t.ax + frame.view.dx; const ay = t.ay + frame.view.dy; obs.push({ x0: ax - 4, y0: ay - 4, x1: ax + 4, y1: ay + 4 }); } }
    c.save(); c.font = FONT; c.textBaseline = 'middle'; c.lineJoin = 'round'; const placed = []; const seen = new Set(); const shown = [];
    for (const p of PLACES) {
      if (p.k === 'loc' ? z < 12.5 : z < 14.5) continue; if (seen.has(p.n)) continue; seen.add(p.n);
      const g = posOf(p); const q = project(g.lng, g.lat, z); const x = q[0] - ox; const y = q[1] - oy; if (x < -60 || x > W + 60 || y < -20 || y > H + 20) continue;
      const st = STATE.get(p.id) || (STATE.set(p.id, { a: 0, slot: 0, free: 0, tw: 0 }), STATE.get(p.id)); if (!st.tw) st.tw = c.measureText(p.n).width;
      const r = p.k === 'loc' ? 4 : 3; const tw = st.tw; const ring = { x0: x - r - 3, y0: y - r - 3, x1: x + r + 3, y1: y + r + 3 };
      const slots = [{ x0: x + r + 6, y0: y - 8, x1: x + r + 6 + tw + 4, y1: y + 8, tx: x + r + 8, al: 'left' }, { x0: x - r - 6 - tw - 4, y0: y - 8, x1: x - r - 6, y1: y + 8, tx: x - r - 8, al: 'right' },
        { x0: x - tw / 2 - 2, y0: y - r - 20, x1: x + tw / 2 + 2, y1: y - r - 4, tx: x, al: 'center', ty: y - r - 12 }, { x0: x - tw / 2 - 2, y0: y + r + 4, x1: x + tw / 2 + 2, y1: y + r + 20, tx: x, al: 'center', ty: y + r + 12 }];
      const free = (r0) => r0.x0 >= 4 && r0.x1 <= W - 4 && r0.y0 >= 4 && r0.y1 <= H - 4 && !obs.some((o) => hit(r0, o, 2)) && !placed.some((o) => hit(r0, o, 2));
      let pick = -1; if (free(ring)) { const order = [st.slot, 0, 1, 2, 3]; for (const s of order) if (free(slots[s])) { pick = s; break; } }
      if (pick >= 0) { st.free = Math.min(40, st.free + 1); st.slot = pick; } else st.free = 0;
      const want = pick >= 0 && st.free >= 4 ? 1 : 0; st.a += Math.max(-0.2, Math.min(0.14, want - st.a)); if (st.a < 0.01 && !want) continue;
      const sl = slots[st.slot]; placed.push(ring, sl); shown.push({ name: p.n, a: st.a, slot: st.slot, rects: [ring, { x0: sl.x0, y0: sl.y0, x1: sl.x1, y1: sl.y1 }] });
      c.globalAlpha = st.a; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.lineWidth = 3; c.strokeStyle = halo; c.stroke(); c.lineWidth = 1.4; c.strokeStyle = ink; c.stroke();
      if (p.ev === 'Measured') { c.beginPath(); c.arc(x, y, r - 1.9, 0, 6.2832); c.fillStyle = ink; c.fill(); }
      if (p.off) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.setLineDash([2, 2]); c.stroke(); c.setLineDash([]); }
      c.textAlign = sl.al; const ty = sl.ty ?? y; c.lineWidth = 3.4; c.strokeStyle = halo; c.strokeText(p.n, sl.tx, ty); c.fillStyle = ink; c.fillText(p.n, sl.tx, ty);
    }
    c.restore(); placesFx.last = shown;
  },
  last: [],
};
