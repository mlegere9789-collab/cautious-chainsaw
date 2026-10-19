// render/places.mjs - the PLACE NAMES of the real ground, in the Quiet Cartographer's third level of lettering (11 px italic, never bold, never tinted by a side).  The basemap would draw them itself, but
// under the unit marks, where a name and a mark print over each other.  Here they are set AROUND the marks: every frame each name tries its four slots (right, left, above, below its ring) against
// the footprints of the solid marks and of the interface, keeps the slot it has while it stays free, and otherwise fades out, moves and fades in; a name that finds no free slot is simply not shown
// (a place is orientation, not data: the units are never dropped, the names may be).  The ring is the data's own claim of where the place is (Modelled, in the legacy frame the units were placed in);
// a ring with a gap means the two terrain frames disagree about this place (the basemap's own finding, up to 733 m).
import { outsideRects } from './stage.mjs';
const SLOTS = ['r', 'l', 't', 'b'];
/** the name as the map says it (round 2): the data's editorial notes never reach the map ("[sic]", a trailing parenthesis), a misspelling is set right ("Gulp's" is Culp's Hill), a name given twice is the first one */
const FIX = { "Gulp's Hill saddle [sic]": "Culp's Hill saddle", 'Brian Farm (Bryan Farm)': 'Bryan Farm', "Herbst Woods (McPherson's Woods)": "McPherson's Woods", 'The Angle (High Water Mark)': 'The Angle' };
export const cleanPlace = (n) => FIX[n] || n.replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
const FADE = 0.2;                                          // fraction of the way to the target per drawn frame (about 120 ms at 60 fps)

export function createPlaces({ places }) {
  const list = []; const seen = new Set(); const order = { loc: 0, struct: 1, feat: 2 };
  // director fix 3: a name that is the whole of another name's words ("Railroad Cut" in "Gettysburg & Harrisburg Railroad Cut", "Trostle Farm" in "Trostle Farm barn") and lies within 400 m of it is the same landmark: it is lettered once,
  // by the earlier of the data's own kinds (a locality before a structure before a feature).  "Culp's Hill" and "Culp's Hill saddle" lie 520 m apart and stay two places.
  const NEAR_M = 400; const metres = (a, b) => { const k = Math.PI / 180; const x = (b.lng - a.lng) * k * Math.cos((a.lat + b.lat) / 2 * k); const y = (b.lat - a.lat) * k; return 6371000 * Math.hypot(x, y); };
  const words = (n) => ' ' + n.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const nested = (a, b) => { const x = words(a); const y = words(b); return x !== y && (y.includes(x) || x.includes(y)); };
  for (const p0 of [...(places || [])].sort((a, b) => order[a.k] - order[b.k])) { const p = { ...p0, n: cleanPlace(p0.n) }; if (seen.has(p.n)) continue; if (list.some((q) => nested(q.n, p.n) && metres(q, p) < NEAR_M)) continue; seen.add(p.n); list.push(p); }
  const state = new Map(); const widths = new Map(); const last = [];      // last: the names drawn in the latest frame (text, rectangle), for the checking tools
  const width = (c, font, s) => { const k = font + '|' + s; let w = widths.get(k); if (w === undefined) { c.font = font; w = c.measureText(s).width; widths.set(k, w); } return w; };
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

  /** @param {object} v { w, h, camera, tiles (display tiles), view {dx, dy}, safe {top,right,bottom,left}, look, minorZoom } */
  function draw(c, v) {
    const { w: W, h: H, camera, tiles, view, stage, look } = v; const z = camera.zoom; const F = 1 - Math.pow(1 - FADE, v.steps || 1); const F2 = 1 - Math.pow(1 - FADE * 1.6, v.steps || 1); const L = look.labels; const font = L.placeFont;
    const obst = []; for (const t of tiles) { if (t.opacity < 0.3 || (t.stageA !== undefined && t.stageA < 0.3)) continue; const hw = t.w * t.scale / 2 + 3; const hh = t.h * t.scale / 2 + 3; const x = t.x + view.dx; const y = t.y + view.dy; if (x + hw < -10 || x - hw > W + 10 || y + hh < -10 || y - hh > H + 10) continue; obst.push({ x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh }); }
    if (stage) for (const r of outsideRects(stage, W, H)) obst.push(r);
    for (const r of v.cards || []) obst.push(r);
    const taken = []; last.length = 0; c.save(); c.lineJoin = 'round'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    for (const p of list) {
      let st = state.get(p.id); if (!st) { st = { a: 0, slot: null, want: null }; state.set(p.id, st); }
      const minor = p.k !== 'loc'; const on = !(minor ? z < (v.minorZoom ?? 14.5) : z < 12.5);
      const [x, y] = camera.toScreen(p.lng, p.lat); const inView = x > -40 && x < W + 40 && y > -20 && y < H + 20;
      let target = 0; let rect = null;
      if (on && inView) {
        const tw = width(c, font, p.n); const r = minor ? 2.2 : 2.8; const ringBox = { x0: x - r - 2, x1: x + r + 2, y0: y - r - 2, y1: y + r + 2 };
        const box = (slot) => { const g = r + 5; if (slot === 'r') return { x0: x + g, x1: x + g + tw, y0: y - 8, y1: y + 6 }; if (slot === 'l') return { x0: x - g - tw, x1: x - g, y0: y - 8, y1: y + 6 }; if (slot === 't') return { x0: x - tw / 2, x1: x + tw / 2, y0: y - r - 17, y1: y - r - 3 }; return { x0: x - tw / 2, x1: x + tw / 2, y0: y + r + 4, y1: y + r + 18 }; };
        const free = (b) => { for (const o of obst) if (hit(b, o)) return false; for (const o of taken) if (hit(b, o)) return false; return true; };
        const ringFree = free(ringBox);
        const tryOrder = st.slot ? [st.slot, ...SLOTS.filter((s) => s !== st.slot)] : SLOTS;
        // among the free slots the one with the fewest ground marks under it (the field is dense where it was fought over: a name keeps to the quieter side); the slot it already has wins a tie
        const dens = (b) => (v.ground ? v.ground((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, Math.max(8, (b.x1 - b.x0) / 2 + 3)) : 0); let bestScore = Infinity;
        for (const s of tryOrder) { const b = box(s); if (free({ x0: b.x0 - 2, x1: b.x1 + 2, y0: b.y0, y1: b.y1 })) { const sc = dens(b) + (s === st.slot ? -1.5 : 0); if (sc < bestScore) { bestScore = sc; st.want = s; rect = b; } } }
        if (rect && ringFree) target = 1;
        if (!rect) st.want = null;
      }
      // fade out before moving to another slot
      if (st.slot && st.want && st.slot !== st.want) { st.a += (0 - st.a) * F2; if (st.a < 0.06) { st.slot = st.want; } }
      else if (target > 0) { if (!st.slot) st.slot = st.want; st.a += (1 - st.a) * F; }
      else { st.a += (0 - st.a) * F; if (st.a < 0.02) { st.a = 0; st.slot = null; } }
      if (st.a < 0.02 || !st.slot) continue;
      const b = (() => { const r = minor ? 2.2 : 2.8; const tw = width(c, font, p.n); const g = r + 5; return st.slot === 'r' ? { x0: x + g, x1: x + g + tw, y0: y - 8, y1: y + 6 } : st.slot === 'l' ? { x0: x - g - tw, x1: x - g, y0: y - 8, y1: y + 6 } : st.slot === 't' ? { x0: x - tw / 2, x1: x + tw / 2, y0: y - r - 17, y1: y - r - 3 } : { x0: x - tw / 2, x1: x + tw / 2, y0: y + r + 4, y1: y + r + 18 }; })();
      taken.push({ x0: b.x0 - 2, x1: b.x1 + 2, y0: b.y0, y1: b.y1 }); { const rr = minor ? 2.2 : 2.8; taken.push({ x0: x - rr - 3, x1: x + rr + 3, y0: y - rr - 3, y1: y + rr + 3 }); }      // the label and the ring both stay clear of every later name
      if (st.a >= 0.5) last.push({ kind: 'place', text: p.n, x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, rx: x, ry: y });
      const base = c.globalAlpha; c.globalAlpha = base * st.a; const r = minor ? 2.2 : 2.8;
      // the ring (a gap when the two terrain frames disagree about the place)
      c.beginPath(); if (p.d) c.arc(x, y, r, 0.45, Math.PI * 2 - 0.45); else c.arc(x, y, r, 0, Math.PI * 2); c.lineCap = 'round'; c.strokeStyle = L.dotRing; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = L.dot; c.lineWidth = 1.1; c.stroke();
      c.font = font; c.textAlign = 'left'; const tx = b.x0; const ty = b.y1 - 3.4;
      c.lineWidth = 4; c.strokeStyle = L.placeHalo; c.strokeText(p.n, tx, ty); c.fillStyle = L.place; c.fillText(p.n, tx, ty); c.globalAlpha = base;
    }
    c.restore();
    return taken;
  }
  return { draw, list, last };
}
