// layout/production.mjs - the SHIPPED collision "layout" (function lS of the production bundle), reproduced so that the before/after comparison replays the same ticks through it.
// Source and validation: docs/pitch/anim/01-current-tiles-jitter.md (3.1, 6.5) and layout-lab/lib/legacy.mjs, whose port was checked against the real app in Chrome (222 of 223, 393 of 405 and
// 204 of 204 glyphs within 0.5 px).  What it does:
//
//   * every unit that is on the canvas (x in -200..width+200, y in -40..height+40) is a bar, width = round(strength / 4) clamped to 10..120 px (phone canvases under 500 px: / 6, at most 60),
//     height 8 px (cavalry 4), rotated by (bearing - 90) degrees;
//   * a relaxation of 8 passes of pairwise pushes (the larger overlap decides x or y; a 12 px vertical band), only at zoom 11 and above, started FROM SCRATCH on every redraw and ignoring
//     rotation and labels: this is why tiles shimmer (report 01, 6.5: offsets change by more than 3 px 116 times a second with a still camera) and why most of them still overlap;
//   * the cost is n^2 / 2 x 8 pair tests per frame.
// Not reproduced: the hit flash (a strength drop on adjacent ticks), the trail canvas, the 'NN fps' text and the cannon sound; the production canvas also draws at one device pixel per CSS pixel
// where this page draws at the device pixel ratio (up to 2), which flatters the before picture slightly.
// Registered but hidden from the Tuning Studio: it is a reference to compare against, not a design.
import { project } from '../geo/project.mjs';
import { worldOrigin } from './tiles.mjs';

export const barWidth = (strength, mobile = false) => Math.max(10, Math.min(mobile ? 60 : 120, Math.round((strength || 200) / (mobile ? 6 : 4))));
export const isArt = (id, disposition) => disposition === 'Deployed Artillery' || disposition === 'Limbered Artillery' || id.includes('ART');
export const isCav = (id, disposition) => disposition === 'Mounted Cavalry' || disposition === 'Dismounted Cavalry' || id.includes('CAV');
/** the production label text of an id (cx): the side prefix is stripped, `20ME` becomes `20 ME`, `I-1-1` becomes `I/1/1`; always from the id, never from the designation */
export function codeOf(id) { const x = id.replace(/^[UC]-/, ''); const m = x.match(/^(\d+)([A-Z]{2,})$/); return m ? m[1] + ' ' + m[2] : x.includes('-') ? x.replace(/-/g, '/').slice(0, 10) : x.slice(0, 8); }
/** Y4 with an empty order-of-battle table: by zoom, null below 12 */
export function labelTextFor(id, z, strength) { const c = codeOf(id); if (z >= 16.5) return c + (strength ? ' ' + strength : ''); if (z >= 14) return c; if (z >= 12) return c.slice(0, 6); return null; }
export const labelFontPx = (z, selected) => (selected || z >= 16 ? 10 : z >= 14 ? 9 : 8);

export const PRODUCTION_LAYOUT = {
  id: 'production', hidden: true, label: 'Production relaxation (reproduction)',
  doc: 'The shipped lS: bars on every unit on the canvas, 8 passes of pairwise pushes from scratch each frame, ignoring rotation and labels. For the before/after comparison; not a design.',
  create(ctx) {
    // the order in which the shipped code iterates the units: its carry cache is filled while ticks are replayed, so units appear in order of (tick of their first keyframe, order in the data)
    const rank = new Map(); { let i = 0; const ids = [...ctx.all.units.values()].sort((a, b) => a.kf[0].tick - b.kf[0].tick); for (const u of ids) rank.set(u.id, i++); }
    return {
      reset() {},
      feedback() {},
      solve({ vis, z, tau, selectedId, view }) {
        const t0 = performance.now(); const [ox, oy] = worldOrigin(z);
        const dx0 = view ? view.dx : 0; const dy0 = view ? view.dy : 0; const W = view ? view.w : 1440; const H = view ? view.h : 900; const mobile = W < 500;
        // the shipped array order: cache order (first keyframe tick), units pushed in half a tick early last, the selected unit last of all
        const list = vis.slice().sort((a, b) => { const ea = tau < a.u.kf[0].tick ? 1 : 0; const eb = tau < b.u.kf[0].tick ? 1 : 0; return ea - eb || rank.get(a.u.id) - rank.get(b.u.id); });
        if (selectedId) { const i = list.findIndex((e) => e.u.id === selectedId); if (i >= 0) list.push(list.splice(i, 1)[0]); }
        const pe = [];
        for (const e of list) {
          const p = project(e.st.lng, e.st.lat, z); const x = p[0] - ox; const y = p[1] - oy; const sx = x + dx0; const sy = y + dy0;
          if (sx > -200 && sx < W + 200 && sy > -40 && sy < H + 40) pe.push({ u: e.u, st: e.st, x, y, dx: 0, dy: 0, w: barWidth(e.st.strength, mobile) });
        }
        if (z >= 11 && pe.length > 1) {
          for (let pass = 0; pass < 8; pass++) for (let a = 0; a < pe.length; a++) {
            const sn = pe[a]; const half = sn.w / 2 + 2;
            for (let b = a + 1; b < pe.length; b++) {
              const yi = pe[b]; const half2 = yi.w / 2 + 2;
              const er = sn.x + sn.dx; const zn = sn.y + sn.dy; const dt = yi.x + yi.dx; const vt = yi.y + yi.dy;
              const ut = half + half2 - Math.abs(er - dt); const an = 12 - Math.abs(zn - vt);
              if (ut > 0 && an > 0) { const pi = ut > an ? 0 : (er < dt ? -ut / 2 : ut / 2); const yn = ut > an ? (zn < vt ? -an / 2 : an / 2) : 0; sn.dx += pi; sn.dy += yn; yi.dx -= pi; yi.dy -= yn; }
            }
          }
        }
        // engaged: a Union and a Confederate unit within 40 screen px of their TRUE positions (the shipped rule, a function of zoom and not of contact)
        const engaged = new Set(); const un = pe.filter((p) => p.u.id.startsWith('U-')); const cf = pe.filter((p) => p.u.id.startsWith('C-'));
        for (const a of un) for (const b of cf) if (Math.hypot(a.x - b.x, a.y - b.y) < 40) { engaged.add(a.u.id); engaged.add(b.u.id); }
        return { placed: [], dropped: [], items: [], labelsShown: 0, ms: performance.now() - t0, rounds: 8, stats: {}, leaves: pe.map((p) => ({ ids: [p.u.id] })), diagnostic: true, production: { pe, engaged, mobile, z } };
      },
      get state() { return null; },
    };
  },
};
