// scene/display.mjs - the DISPLAY LAYER between the certified layout and the picture (ANIM release rewrite of the pitch's display layer, which faded, dimmed and slid tiles).
//
// OWNER RULES this layer implements (docs/decisions/OWNER-DECISIONS-2026-10-05.md and the defaults of the release brief):
//   * NO GHOST TILES.  A mark that the layout replaces (an aggregate forms, an aggregate splits, a mark must change places) is swapped in ONE frame: the old mark is gone and the new one is whole.  Nothing is
//     dissolved over another mark, nothing is dimmed to travel through a crowd.  What cannot glide clear swaps.
//   * NO NUDGING.  A mark stands on its unit's true place (layout.dMaxPx is 0 by default: the layout aggregates instead of displacing).  The only offsets this layer ever holds are the short glides of
//     a crowd whose members changed (its centre moves by the members' share: absorbed, then eased out over about 150 ms), and a tuning that asks for a displacement budget.
//   * ENTRY AND EXIT BY FADE AND SCALE.  A unit that comes onto the field (its first keyframe, a filter switched on) grows from birthScale and fades in over motion.fadeMs (about 250 ms); a unit that leaves
//     the field (time scrubbed back before its first keyframe, a filter switched off) shrinks and fades out in place.  The layout reserved the newborn's box from its first frame, so no solid mark is covered.
//   * A JUMP IN TIME OR ZOOM TOO BIG TO GLIDE is a cross-fade of the whole picture (the one place where two marks are drawn at once, for motion.cutFadeMs).
//   * REDUCED MOTION: no fades, no glides, no growth easing: every change is a step.
//   * THE NET.  EVERY displayed frame is verified by the independent verifier (layout/geom.mjs).  Of two solid items that overlap because a glide has not finished, the one that stands off its certified
//     place snaps onto it in that frame.  The guarantee never depends on the glide being right; the glide decides how often the net is needed (stats.netSnaps).
import { dampStep2, dampStep } from '../interp/damp.mjs';
import { verifyFrame } from '../layout/geom.mjs';
import { plain } from '../layout/engine.mjs';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const SOLID = 0.5;                      // opacity at or above which a tile counts as solid (an obstacle that must not be overlapped)
const SETTLE_PX = 0.2;                         // a tile this close to its target and slower than SETTLE_V (px/s) has arrived
const SETTLE_V = 10;
const REANCHOR_PX = 26;                        // a crowd whose centre moves farther than this because its members changed is swapped, not slid
const GROW_S = 0.06;                           // time constant of a mark's growth to the footprint the layout reserved (selection, detail level)

/** the horizontal shift that keeps a mark's pip (or staff) on its place while its box still grows or shrinks toward the size the layout reserved: the layout hangs the box on the true position for its FINAL
 *  width, the centre sits sgn * (tw / 2 - p) from the pip; while the width eases the centre must sit sgn * (w / 2 - p) from it, so it moves by sgn * (w - tw) / 2. */
const cOff = (d) => (d.sgn ? d.sgn * (d.w - d.tw) / 2 : 0);

function flattenLeaves(t, out = []) { if (t.kind === 'leaf') out.push(t); else for (const m of t.members) flattenLeaves(m, out); return out; }

export class Display {
  /** @param {{glide:boolean}} flags  @param {(id:string)=>any} tok */
  constructor(flags, tok) { this.flags = flags; this.tok = tok; this.reset(); }
  reset() { this._uid = 0; this.tiles = new Map(); this.nowMs = 0; this.frameNo = 0; this.prevAssign = new Map(); this.stats = null; }

  /** @param {object} L layout result  @param {{dtMs:number, z:number, origin:number[], spec:object, cut:boolean, selectedId:string|null, reduced:boolean, newIds:Set<string>|null, goneIds:Set<string>|null}} inp */
  step(L, inp) {
    const tok = this.tok; const spec = inp.spec; const z = inp.z;
    this._diag = !!L.diagnostic;                                   // a diagnostic layout (raw) is shown as it is: no repair, so its overlaps are visible and counted
    const reduced = !!inp.reduced; const snapMode = !this.flags.glide || this._diag || reduced;
    const dtMs = Math.min(Math.max(inp.dtMs, 0), 50); const dt = dtMs / 1000; this.nowMs += dtMs; this.frameNo++;
    const fadeMs = reduced ? 0 : tok('motion.fadeMs'); const cutMs = reduced ? 0 : tok('motion.cutFadeMs');
    const newIds = inp.newIds || null; const goneIds = inp.goneIds || null;
    const stats = { births: 0, deaths: 0, swaps: 0, entries: 0, exits: 0, cut: false, netSnaps: 0, netRounds: 0, anchorFixes: 0, pushed: 0 };

    // 0. a cut: every live tile starts a fast fade-out (ghosts of the old picture, ignored by the net); whatever the layout shows now fades in over the same time
    let cutNow = false;
    if (inp.cut) {
      if (cutMs > 0 && !this._diag) { stats.cut = true; cutNow = true; for (const d of [...this.tiles.values()]) if (d.life === 'live') this._die(d, cutMs, true); }
      else this.tiles.clear();
    }

    // 1. index the layout
    const byLKey = new Map(); for (const p of L.placed) byLKey.set(p.t.key, p);

    // 2. identity: leaves by unit id; aggregates by overlap of their member ids (an aggregate that gains or loses a member stays the same tile)
    const live = [...this.tiles.values()].filter((d) => d.life === 'live');
    const matchedL = new Set(); const matchedD = new Set();
    for (const d of live) { const p = byLKey.get(d.lkey); if (p && p.t.kind === d.kind) { matchedL.add(d.lkey); matchedD.add(d); } }
    const pairs = [];
    for (const d of live) {
      if (matchedD.has(d) || d.kind !== 'agg') continue; const set = new Set(d.ids);
      for (const p of L.placed) {
        if (matchedL.has(p.t.key) || p.t.kind !== 'agg') continue;
        let k = 0; for (const id of p.t.ids) if (set.has(id)) k++;
        if (k >= 1 && k >= 0.5 * Math.min(d.ids.length, p.t.ids.length)) pairs.push({ d, p, k });
      }
    }
    pairs.sort((a, b) => b.k - a.k || (a.d.key < b.d.key ? -1 : 1));
    for (const { d, p } of pairs) { if (matchedD.has(d) || matchedL.has(p.t.key)) continue; d.lkey = p.t.key; matchedL.add(p.t.key); matchedD.add(d); }

    // 3. deaths.  A tile whose units have all left the field (time or filter) fades out where it stands; a tile the layout replaced is gone in this frame (no dissolve).
    for (const d of live) {
      if (matchedD.has(d)) continue;
      const left = goneIds && d.ids.every((id) => goneIds.has(id));
      if (left && fadeMs > 0 && !snapMode) { this._die(d, fadeMs, false); stats.exits++; } else { this.tiles.delete(d.key); stats.swaps++; }
      stats.deaths++;
    }

    // 4. births.  Newly alive units fade and scale in; a replacement made by the layout is whole at once.
    for (const p of L.placed) {
      if (matchedL.has(p.t.key)) continue;
      const entering = !cutNow && newIds && fadeMs > 0 && !snapMode && p.t.ids.every((id) => newIds.has(id));
      const nd = this._spawn(p, entering ? fadeMs : cutNow ? cutMs : 0); stats.births++; if (entering) stats.entries++; else if (!cutNow) stats.swaps++;
      void nd;
    }

    // 5. content and targets from the layout
    const live2 = []; const reborn = [];
    for (const d of this.tiles.values()) {
      if (d.life !== 'live') continue;
      const p = byLKey.get(d.lkey); if (!p) continue;
      const t = p.t; d.ajx = 0; d.ajy = 0;
      // ANCHOR CONTINUITY.  A crowd's anchor is the centre of its members; when a member joins or leaves a tile that keeps its identity the centre jumps (measured up to 116 px at zoom 14).  The part of the jump the
      // members' own motion does not explain is absorbed into the offset, so the mark stays where it was drawn and eases to its place (the net snaps it if the glide would touch a neighbour).
      if (d.kind === 'agg' && d.members && !snapMode) {
        const old = this._mm || (this._mm = new Map()); old.clear(); for (const m of d.members) old.set(m.id, m);
        let ex = 0; let ey = 0; let sw = 0;
        for (const l of flattenLeaves(t)) { const o = old.get(l.ids[0]); if (!o) continue; const w = Math.max(1, l.strength || 1); ex += (l.px - o.ax) * w; ey += (l.py - o.ay) * w; sw += w; }
        if (sw > 0) { ex /= sw; ey /= sw; }
        const jx = (t.px - d.px) - ex; const jy = (t.py - d.py) - ey;
        const jj = jx * jx + jy * jy;
        if (jj > REANCHOR_PX * REANCHOR_PX) { reborn.push(p); this.tiles.delete(d.key); stats.swaps++; continue; }      // too far to glide clear of the neighbours: the crowd's mark is swapped in one frame (no slide through other marks)
        if (jj > 0.5625) { d.ox -= jx; d.oy -= jy; d.ajx = jx; d.ajy = jy; stats.anchorFixes++; }
      }
      this._target(d, p); this._content(d, t, dt, inp, snapMode); live2.push(d);
    }

    for (const p of reborn) { const nd = this._spawn(p, 0, true); this._target(nd, p); this._content(nd, p.t, dt, inp, snapMode); }

    // 6. integrate: offsets, sizes, opacity, scale
    const smoothT = Math.max(0.001, tok('motion.smoothMs') / 1000); const maxSpeed = tok('motion.maxSpeedPxPerSec'); const birthScale = tok('motion.birthScale');
    for (const d of this.tiles.values()) {
      d.age += dtMs; let base = 1;
      if (d.life === 'dying') {
        d.deathAge += dtMs; base = d.fade <= 0 ? 0 : d.op0 * (1 - smooth(d.deathAge / d.fade));
        d.opacity = base; d.scale = birthScale + (1 - birthScale) * clamp01(base); continue;
      }
      if (d.born) { const fe = d.fade <= 0 ? 1 : clamp01(d.age / d.fade); base = smooth(fe); if (fe >= 1) d.born = false; }
      d.opacity = base; d.scale = d.born ? birthScale + (1 - birthScale) * clamp01(base) : 1;
      if (snapMode) { d.ox = d.tx; d.oy = d.ty; d.vx = 0; d.vy = 0; d.w = d.tw; d.h = d.th; }
      else {
        const o = { x: d.ox, y: d.oy }; const v = { x: d.vx, y: d.vy };
        dampStep2(o, v, d.tx, d.ty, smoothT, dt, maxSpeed); d.ox = o.x; d.oy = o.y; d.vx = v.x; d.vy = v.y;
        if (d.vx * d.vx + d.vy * d.vy < SETTLE_V * SETTLE_V && (d.tx - d.ox) * (d.tx - d.ox) + (d.ty - d.oy) * (d.ty - d.oy) < SETTLE_PX * SETTLE_PX) { d.ox = d.tx; d.oy = d.ty; d.vx = 0; d.vy = 0; }
        d.w = dampStep(d.w, 0, d.tw, GROW_S, dt)[0]; d.h = dampStep(d.h, 0, d.th, GROW_S, dt)[0];
        if (Math.abs(d.w - d.tw) < 0.02) d.w = d.tw; if (Math.abs(d.h - d.th) < 0.02) d.h = d.th;
      }
    }

    // 7. the net: verify the picture; a mark that overlaps because it is still gliding snaps onto its certified place (never dimmed, never slid through a neighbour)
    let ver = null;
    if (tok('metrics.verify') || tok('motion.safetyNet')) ver = this._verifyAndRepair(spec, stats);

    // 8. remove finished exits
    for (const [k, d] of this.tiles) if (d.life === 'dying' && (d.opacity <= 0.004 || d.deathAge > d.fade + 40)) this.tiles.delete(k);

    this.stats = stats;
    return this._frame(L, stats, ver, inp);
  }

  /** is anything still moving, fading or growing?  (the app stops drawing when the picture is at rest and nothing else is going on) */
  busy() {
    for (const d of this.tiles.values()) {
      if (d.life === 'dying' || d.born) return true;
      if (Math.hypot(d.vx, d.vy) > SETTLE_V || Math.hypot(d.tx - d.ox, d.ty - d.oy) > SETTLE_PX) return true;
      if (Math.abs(d.w - d.tw) > 0.02 || Math.abs(d.h - d.th) > 0.02) return true;
      if (Math.abs((d.ratioShown ?? 1) - (d.ratioTarget ?? 1)) > 0.002) return true;
    }
    return false;
  }

  // ---- identity / lifecycle ---------------------------------------------------------------------------------------------------------------------
  /** a live tile starts to fade out.  ghost = part of a cut (ignores the net) */
  _die(d, fadeMs, ghost) {
    this.tiles.delete(d.key); d.key = d.key + '~' + this.frameNo; this.tiles.set(d.key, d);      // a dying tile gives up its identity: the same identity may be born again while it fades
    d.life = 'dying'; d.deathAge = 0; d.op0 = d.opacity; d.fade = fadeMs; d.ghost = !!ghost; d.born = false;
  }

  _spawn(p, fadeMs, fresh = false) {
    const t = p.t; const key = t.key; let dk = fresh ? key + '#' + (++this._uid) : key; while (this.tiles.has(dk)) dk = key + '#' + (++this._uid);
    const tx = p.cx - t.ax; const ty = p.cy - t.ay; const bs = this.tok('motion.birthScale');
    const d = {
      key: dk, lkey: key, kind: t.kind, ids: t.ids.slice(), n: t.n, life: 'live', age: 0, deathAge: 0, op0: 1, fade: fadeMs, born: fadeMs > 0, ghost: false,
      ax: t.ax, ay: t.ay, px: t.px ?? t.ax, py: t.py ?? t.ay, sgn: t.sgn || 0, ox: tx, oy: ty, vx: 0, vy: 0, tx, ty, w: t.chipW, h: t.chipH, tw: t.chipW, th: t.chipH,
      scale: fadeMs > 0 ? bs : 1, opacity: fadeMs > 0 ? 0 : 1, prio: t.prio, ratioShown: t.ratio ?? 1, lat: null, lng: null, selected: false,
    };
    this.tiles.set(dk, d); return d;
  }

  _target(d, p) { const t = p.t; d.ax = t.ax; d.ay = t.ay; d.px = t.px ?? t.ax; d.py = t.py ?? t.ay; d.sgn = t.sgn || 0; d.tx = p.cx - t.ax; d.ty = p.cy - t.ay; d.tw = t.chipW; d.th = t.chipH; d.prio = t.prio; }

  /** content that comes from the layout tile (text, side, arm, strength state ...), refreshed every frame */
  _content(d, t, dt, inp, snap) {
    d.n = t.n; d.ids = t.ids; d.side = t.side; d.arm = t.arm; d.short = t.short; d.fname = t.fname || null; d.ftail = t.ftail || null; d.badge = t.badge || null; d.strength = t.strength; d.nameKind = t.nameKind || null;
    d.selected = inp.selectedId != null && t.ids.includes(inp.selectedId); d.grown = t.grown !== false;
    const tween = this.tok('interp.strengthTweenMs') / 1000;
    d.ratioTarget = t.ratio ?? 1; d.ratioShown = snap || tween <= 0 ? d.ratioTarget : dampStep(d.ratioShown, 0, d.ratioTarget, tween / 2, dt)[0];
    if (t.kind === 'leaf') {
      const st = t.st; d.lat = st.lat; d.lng = st.lng; d.disposition = st.disposition; d.ageTicks = st.ageTicks; d.ageMin = st.ageTicks; d.ageMax = st.ageTicks; d.moving = st.moving; d.kfTick = st.kfTick; d.unit = t.u; d.members = null;
    } else {
      const leaves = flattenLeaves(t); d.unit = null; d.disposition = null; d.moving = false;
      let mn = Infinity; let mx = 0; for (const l of leaves) { mn = Math.min(mn, l.st.ageTicks); mx = Math.max(mx, l.st.ageTicks); }
      d.ageMin = mn; d.ageMax = mx; d.ageTicks = mx;
      d.members = leaves.map((l) => ({ id: l.ids[0], ax: l.px, ay: l.py }));      // TRUE positions
    }
  }

  // ---- verification and the net -----------------------------------------------------------------------------------------------------------------
  _chipRect(d, scale = d.scale) { const hw = d.w * scale / 2; const hh = d.h * scale / 2; const cx = d.ax + d.ox + cOff(d); const cy = d.ay + d.oy; return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh }; }

  _items(spec) {
    const items = [];
    for (const d of this.tiles.values()) {
      if (d.opacity < SOLID || d.life !== 'live') continue;      // a mark that is leaving (exit or cut) is no obstacle and obscures nothing: it was verified while it lived
      items.push({ owner: d.key, kind: 'chip', ...this._chipRect(d) });
      if (Math.hypot(d.ox, d.oy) > 1.5) items.push({ owner: d.key, kind: 'pin', x0: d.px - spec.pinHalf, y0: d.py - spec.pinHalf, x1: d.px + spec.pinHalf, y1: d.py + spec.pinHalf });
    }
    return items;
  }

  _verifyAndRepair(spec, stats) {
    const net = this.tok('motion.safetyNet') && !this._diag;
    let items = this._items(spec); let v = verifyFrame(items, spec.gap - 0.05, true);
    if (net) {
      for (let round = 0; v.overlaps > 0 && round < 8; round++) {
        stats.netRounds++; let changed = 0;
        for (const [i, j] of v.pairs) {
          const a = this.tiles.get(items[i].owner); const b = this.tiles.get(items[j].owner); if (!a || !b || a === b) continue;
          const da = a.life === 'live' ? Math.hypot(a.tx - a.ox, a.ty - a.oy) : 0; const db = b.life === 'live' ? Math.hypot(b.tx - b.ox, b.ty - b.oy) : 0;
          const victim = da > db ? a : b; const vd = Math.max(da, db);
          if (vd > 0.01 && victim.life === 'live') { victim.ox = victim.tx; victim.oy = victim.ty; victim.vx = 0; victim.vy = 0; victim.w = victim.tw; victim.h = victim.th; stats.netSnaps++; changed++; }
        }
        if (!changed) break;
        items = this._items(spec); v = verifyFrame(items, spec.gap - 0.05, true);
      }
      if (v.overlaps > 0) {                                           // the glides could not be repaired one by one: every live mark stands on the certified place this frame (the certified layout has no overlap by construction)
        for (const d of this.tiles.values()) if (d.life === 'live') { d.ox = d.tx; d.oy = d.ty; d.vx = 0; d.vy = 0; d.w = d.tw; d.h = d.th; }
        stats.fullSnaps = (stats.fullSnaps || 0) + 1; items = this._items(spec); v = verifyFrame(items, spec.gap - 0.05, true);
      }
    }
    return v;
  }

  // ---- output -----------------------------------------------------------------------------------------------------------------------------------
  _frame(L, stats, ver, inp) {
    const list = [...this.tiles.values()].filter((d) => d.opacity > 0.004);
    list.sort((a, b) => (a.opacity >= SOLID ? 1 : 0) - (b.opacity >= SOLID ? 1 : 0) || a.prio - b.prio || (a.key < b.key ? -1 : 1));
    const offsets = new Map(); for (const d of this.tiles.values()) if (d.life === 'live') offsets.set(d.lkey, { ox: d.ox, oy: d.oy });
    const assign = new Map(); for (const d of this.tiles.values()) if (d.life === 'live') for (const id of d.ids) assign.set(id, d.key);
    this.prevAssign = assign;
    const tiles = list.map((d) => ({
      key: d.key, kind: d.kind, ids: d.ids, n: d.n, x: d.ax + d.ox + cOff(d), y: d.ay + d.oy, ax: d.px, ay: d.py, ox: d.ox, oy: d.oy, ix: d.px + d.ox, iy: d.py + d.oy, sgn: d.sgn || 0, w: d.w, h: d.h, scale: d.scale, opacity: d.opacity, solid: d.opacity >= SOLID, life: d.life,
      ajx: d.ajx || 0, ajy: d.ajy || 0, entering: d.born, travelling: false, displaced: Math.hypot(d.ox, d.oy) > 1.5, side: d.side, arm: d.arm, short: d.short, fname: d.fname || null, ftail: d.ftail || null, badge: d.badge, nameKind: d.nameKind, ratio: d.ratioShown, strength: d.strength,
      disposition: d.disposition, selected: !!d.selected, grown: d.grown !== false, unit: d.unit, ageTicks: d.ageTicks, ageMin: d.ageMin, ageMax: d.ageMax, moving: !!d.moving, kfTick: d.kfTick, members: d.members, ghost: !!d.ghost,
      label: null,
    }));
    let unrepresented = 0; const onField = new Set(); for (const lf of L.leaves || []) onField.add(lf.ids[0]);
    for (const id of onField) if (!assign.has(id)) unrepresented++;
    return { tiles, offsets, stats, overlaps: ver ? ver.overlaps : null, clearanceViolations: ver ? ver.clearanceViolations : null, unrepresented, assign, solverMs: L.ms, rounds: L.rounds, onField: onField.size };
  }
}
void plain;
