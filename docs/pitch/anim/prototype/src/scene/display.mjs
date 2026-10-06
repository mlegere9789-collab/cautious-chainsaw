// scene/display.mjs - the DISPLAY LAYER between the certified layout and the picture.  This is where "tiles teleport" is fixed without giving up "tiles never obscure".
//
// The layout (layout/engine.mjs) answers "where may each tile stand so that nothing overlaps" and answers it again every frame; its answer jumps whenever a neighbour appears,
// an aggregate forms, or a nearest-free search flips a tile to the other side of a neighbour.  Drawing that answer directly is what 06-layout.md measured as 46 pops per second at 4x.
// The display layer keeps ONE persistent display tile per identity and moves it, continuously, toward the layout's answer:
//
//   position   = true anchor (exact, undelayed) + offset;  only the OFFSET is smoothed (a critically damped glide), so a tile never lags behind the unit it stands for
//   pushing    a glide can run into a neighbour that is also moving; a small position-based pass pushes overlapping tiles apart along the least penetration (heavier = older tiles move less)
//   births     a new tile grows from birthScale and fades in; its box takes space from the first frame, so its neighbours are pushed aside gently
//   handoffs   a merge (members -> aggregate) and a split (aggregate -> members) are sequenced dissolves: the outgoing tiles fade out while gliding toward the incoming one and the
//              incoming one starts fading in only when they are below 0.5, so two overlapping tiles are never both solid (06-layout.md 6.4, "the opacity rule")
//   travel     a tile whose solved place is far from where it stands (a flip to the other side of a neighbour, a swap of two tiles whose true positions crossed) does not shove its way
//              through the crowd: it dims below 0.5, glides there, and solidifies on arrival.  While it is below 0.5 it neither obscures nor is obscured (the opacity rule),
//              and it stays visible (about 0.42), so the unit is never hidden
//   cuts       a jump in time or zoom too large to glide is a cross-fade of the whole picture in the same sequence
//   the net    EVERY displayed frame is verified by the independent verifier (layout/geom.mjs).  Of two solid items that still overlap, the lighter tile is dimmed below 0.5 at once
//              and travels to its certified place (counted: stats.netDims).  The guarantee never depends on the glide being right; the glide decides how often the net is needed.
//
// Modes (registered in scene/modes.mjs): dynamics (glide + pushing + travel), spring (glide + travel, no pushing), snap (the layout as solved, no fades: the lab's behaviour).
import { dampStep2, dampStep } from '../interp/damp.mjs';
import { verifyFrame } from '../layout/geom.mjs';
import { SLOTS, labelRect, rectFree, Occ, plain } from '../layout/engine.mjs';
import { project, unproject } from '../geo/project.mjs';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const SOLID = 0.5;                      // opacity at or above which a tile counts as solid (an obstacle that must not be overlapped)
const SEQ = 0.52;                              // a newborn that takes over from fading tiles starts when they are below SOLID: 0.52 x their fade time
const DIM_MS = 60;                             // a tile that decides to travel dims over this long before it moves
const RAMP_MS = 140;
const SETTLE_PX = 0.25;                       // a tile this close to its target and slower than SETTLE_V (px/s) has arrived
const SETTLE_V = 12;                           // and solidifies over this long on arrival

function flattenLeaves(t, out = []) { if (t.kind === 'leaf') out.push(t); else for (const m of t.members) flattenLeaves(m, out); return out; }

export class Display {
  /** @param {{glide:boolean, collide:boolean}} flags  @param {(id:string)=>any} tok */
  constructor(flags, tok) { this.flags = flags; this.tok = tok; this.reset(); }
  reset() { this._uid = 0; this.tiles = new Map(); this.nowMs = 0; this.lastZ = null; this.lastOrigin = null; this.frameNo = 0; this.prevAssign = new Map(); }

  // ------------------------------------------------------------------------------------------------------------------------------------------------
  /** @param {object} L layout result  @param {{dtMs:number, z:number, origin:number[], spec:object, cut:boolean, selectedId:string|null, reduced:boolean}} inp */
  step(L, inp) {
    const tok = this.tok; const spec = inp.spec; const z = inp.z; const [ox, oy] = inp.origin;
    this._diag = !!L.diagnostic;                                   // a diagnostic layout (raw) is shown as it is: no glide, no pushing, no repair, so its overlaps are visible and counted
    const snapMode = !this.flags.glide || this._diag;
    const reduced = !!inp.reduced;
    const dtMs = Math.min(Math.max(inp.dtMs, 0), 50); const dt = dtMs / 1000; this.nowMs += dtMs; this.frameNo++;
    const fadeMs = snapMode ? 0 : reduced ? Math.min(60, tok('motion.fadeMs')) : tok('motion.fadeMs');
    const stats = { births: 0, deaths: 0, handoffs: 0, cut: false, netDims: 0, netRounds: 0, travels: 0, pushed: 0, labelToggles: 0 };

    // 0. a cut: every live tile starts a fast fade; whatever the layout shows now is born after they are below 0.5
    let cutDelay = 0;
    if (inp.cut && !snapMode) { stats.cut = true; const f = reduced ? 0 : tok('motion.cutFadeMs'); for (const d of [...this.tiles.values()]) if (d.life === 'live') this._die(d, f, true, inp.z); cutDelay = SEQ * f; }
    else if (inp.cut) { this.tiles.clear(); }

    // 1. index the layout
    const byLKey = new Map(); for (const p of L.placed) byLKey.set(p.t.key, p);
    const leafById = new Map(); for (const lf of L.leaves || []) leafById.set(lf.ids[0], lf);

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

    // 3. deaths
    const dying = [];
    for (const d of live) if (!matchedD.has(d)) { this._die(d, fadeMs, false, z); dying.push(d); stats.deaths++; }
    const prevTile = this.prevAssign;                                 // where each unit was drawn last frame (for tiles that emerge from an aggregate that persists)

    // 4. births
    const born = [];
    for (const p of L.placed) {
      if (matchedL.has(p.t.key)) continue;
      born.push(this._spawn(p, dying, prevTile, cutDelay, fadeMs)); stats.births++;
    }
    for (const dd of dying) {                                          // handoff wiring: a dying tile flows toward the tile that now holds its units
      const idset = new Set(dd.ids); let target = null;
      for (const b of born) if (b.ids.some((id) => idset.has(id))) { target = b; break; }
      if (!target) for (const d of this.tiles.values()) if (d.life === 'live' && d !== dd && d.ids.some((id) => idset.has(id))) { target = d; break; }
      if (target) {
        dd.handoffTo = target.key; stats.handoffs++;
        if (!target.born) dd.fade = Math.min(dd.fade, fadeMs * 0.5);        // flowing into a tile that is already solid: leave quickly
      }
    }

    // 5. content and targets from the layout
    for (const d of this.tiles.values()) {
      if (d.life !== 'live') continue;
      const p = byLKey.get(d.lkey); if (!p) continue;
      const t = p.t; d.ajx = 0; d.ajy = 0;
      // ANCHOR CONTINUITY.  A leaf's anchor is the unit's true position, which moves continuously.  An aggregate's anchor is the centroid of its members, so when a member joins or leaves a tile that
      // keeps its identity the centroid JUMPS (measured on the real data: up to 116 px in one frame at zoom 14), and since position = anchor + offset the tile would hop.  The part of the
      // anchor's change that the members' own motion does not explain is absorbed into the offset, so the tile stays where it was drawn and glides (or travels, when the way is longer than the
      // budget allows a solid tile to move) to its new certified place.
      if (d.kind === 'agg' && d.members && !snapMode) {                    // (snap mode shows the layout as solved, anchor hops included: it is the baseline the other modes are compared with)
        const old = this._mm || (this._mm = new Map()); old.clear(); for (const m of d.members) old.set(m.id, m);
        let ex = 0; let ey = 0; let sw = 0;
        for (const l of flattenLeaves(t)) { const o = old.get(l.ids[0]); if (!o) continue; const w = Math.max(1, l.strength || 1); ex += (l.ax - o.ax) * w; ey += (l.ay - o.ay) * w; sw += w; }
        if (sw > 0) { ex /= sw; ey /= sw; }
        const jx = (t.ax - d.ax) - ex; const jy = (t.ay - d.ay) - ey;
        if (jx * jx + jy * jy > 0.5625) { d.ox -= jx; d.oy -= jy; d.ajx = jx; d.ajy = jy; stats.anchorFixes = (stats.anchorFixes || 0) + 1; if (!d.dim && Math.hypot(d.ox, d.oy) > this.tok('layout.dMaxPx') + 0.5) { d.dim = true; stats.travels++; } }
      }
      d.ax = t.ax; d.ay = t.ay; d.tx = p.cx - t.ax; d.ty = p.cy - t.ay; d.tw = t.chipW; d.th = t.chipH; d.prio = t.prio;
      this._content(d, t, dt, inp);
    }

    // 6. integrate: offsets, sizes, opacity, scale
    const maxSpeed = tok('motion.maxSpeedPxPerSec'); const smoothT = Math.max(0.001, tok('motion.smoothMs') / 1000); const travelT = Math.max(0.001, tok('motion.travelMs') / 1000);
    const birthScale = tok('motion.birthScale'); const travelPx = tok('motion.travelPx'); const dimOp = tok('motion.dimOpacity');
    const still = snapMode || reduced;
    for (const d of this.tiles.values()) {
      d.age += dtMs;
      let base = 1;
      if (d.life === 'dying') {
        d.deathAge += dtMs;
        const lf = d.leafId ? leafById.get(d.leafId) : null;
        if (lf) { d.ax = lf.ax; d.ay = lf.ay; } else if (d.lat != null) { const pp = project(d.lng, d.lat, z); d.ax = pp[0] - ox; d.ay = pp[1] - oy; }
        const h = d.handoffTo ? this.tiles.get(d.handoffTo) : null;
        if (h) { d.tx = h.ax + h.ox - d.ax; d.ty = h.ay + h.oy - d.ay; } else { d.tx = d.ox; d.ty = d.oy; }
        base = d.fade <= 0 ? 0 : Math.min(d.op0 * (1 - smooth(d.deathAge / d.fade)), d.op0);
      } else {
        const fe = fadeMs <= 0 ? 1 : clamp01((d.age - d.birthDelay) / fadeMs);
        if (d.born) { base = smooth(fe); if (fe >= 1) d.born = false; }
      }
      // travel: a far target is reached dimmed (below SOLID), not by pushing through the crowd
      let moving = true;
      if (d.life === 'live' && !still) {
        const dist = Math.hypot(d.tx - d.ox, d.ty - d.oy);
        if (!d.dim && dist > travelPx) { d.dim = true; stats.travels++; }
        if (d.dim && dist < 1.2 && d.mv <= dimOp + 1e-6) {                                       // arrived: solidify as soon as nothing solid is in the way
          if (!this._blocked(d, spec)) d.dim = false; else { d.waitMs = (d.waitMs || 0) + dtMs; if (d.waitMs > 400) d.dim = false; }   // a blocker that never leaves is pushed or repaired, not waited for
        } else d.waitMs = 0;
        if (d.dim) d.mv = Math.max(dimOp, d.mv - dt * (1 - dimOp) / (DIM_MS / 1000));
        else d.mv = Math.min(1, d.mv + dt / (RAMP_MS / 1000));
      } else { d.mv = 1; d.dim = false; }
      d.opacity = base * d.mv;
      if (d.life === 'live' && d.dim && d.opacity >= SOLID) moving = false;          // a solid tile that decides to travel first dims below 0.5, then moves
      d.scale = (d.born || d.life === 'dying') ? birthScale + (1 - birthScale) * clamp01(base) : 1;
      if (still) { d.ox = d.tx; d.oy = d.ty; d.vx = 0; d.vy = 0; d.w = d.tw; d.h = d.th; }
      else if (moving) {
        const o = { x: d.ox, y: d.oy }; const v = { x: d.vx, y: d.vy };
        dampStep2(o, v, d.tx, d.ty, d.dim ? travelT : smoothT, dt, d.dim ? 1e9 : maxSpeed);
        d.ox = o.x; d.oy = o.y; d.vx = v.x; d.vy = v.y;
        // arrival: within a quarter pixel of the target and nearly still, the tile IS at the target (a solver whose target creeps by thousandths of a pixel must not keep the picture awake)
        if (!d.dim && d.vx * d.vx + d.vy * d.vy < SETTLE_V * SETTLE_V && (d.tx - d.ox) * (d.tx - d.ox) + (d.ty - d.oy) * (d.ty - d.oy) < SETTLE_PX * SETTLE_PX) { d.ox = d.tx; d.oy = d.ty; d.vx = 0; d.vy = 0; }
        d.w = dampStep(d.w, 0, d.tw, 0.06, dt)[0]; d.h = dampStep(d.h, 0, d.th, 0.06, dt)[0];
      } else { d.vx = 0; d.vy = 0; }
    }

    // 7. pushing (collision-aware glides)
    if (this.flags.collide && !still) this._collide(spec, tok('motion.collisionIters'), stats);

    // 8. remove finished ghosts
    for (const [k, d] of this.tiles) if (d.life === 'dying' && (d.opacity <= 0.004 || d.deathAge > d.fade + 40)) this.tiles.delete(k);

    // 9. labels (secondary; placed against the final chips)
    stats.labelToggles = this._labels(spec, dtMs, z);

    // 10. verify the picture; repair by the net
    let ver = null;
    if (tok('metrics.verify') || tok('motion.safetyNet')) ver = this._verifyAndRepair(spec, stats);

    this.lastZ = z; this.lastOrigin = inp.origin;
    return this._frame(L, stats, ver, inp);
  }

  /** is anything still moving, fading, dimming or waiting?  (the app stops drawing when the picture is at rest and nothing else is going on) */
  busy() {
    for (const d of this.tiles.values()) {
      if (d.life === 'dying' || d.born || d.dim || d.mv < 1) return true;
      if (Math.hypot(d.vx, d.vy) > SETTLE_V || Math.hypot(d.tx - d.ox, d.ty - d.oy) > SETTLE_PX || Math.abs(d.w - d.tw) > 0.02 || Math.abs(d.h - d.th) > 0.02) return true;
      if (Math.abs((d.ratioShown ?? 1) - (d.ratioTarget ?? 1)) > 0.002) return true;
      const L = d.label; if ((L.opacity > 0 && L.opacity < 1) || (!L.vis && L.feas > 0)) return true;
    }
    return false;
  }

  // ---- identity / lifecycle ---------------------------------------------------------------------------------------------------------------------
  /** a live tile starts to fade out.  ghost = part of a cut (ignores every collision, hands over to nothing) */
  _die(d, fadeMs, ghost, z) {
    this.tiles.delete(d.key); d.key = d.key + '~' + this.frameNo; this.tiles.set(d.key, d);      // a dying tile gives up its identity: the same identity may be born again while it fades
    d.life = 'dying'; d.deathAge = 0; d.op0 = d.opacity; d.fade = fadeMs; d.handoffTo = null; d.ghost = !!ghost; d.leafId = d.kind === 'leaf' ? d.ids[0] : null; d.dim = false; d.mv = 1;
    if (d.kind === 'agg' && this.lastOrigin) { const ll = unproject(d.ax + this.lastOrigin[0], d.ay + this.lastOrigin[1], this.lastZ ?? z); d.lng = ll[0]; d.lat = ll[1]; }
  }

  _spawn(p, dying, prevTile, cutDelay, fadeMs) {
    const t = p.t; const key = t.key;
    // starting point: where the tiles it replaces were drawn (a merge, a split, an emergence from a persisting aggregate), else its own target
    const idset = new Set(t.ids); let w = 0; let cx = 0; let cy = 0; let srcFade = 0;
    for (const dd of dying) if (!dd.ghost && dd.ids.some((id) => idset.has(id))) { const wt = Math.max(1, dd.n); cx += (dd.ax + dd.ox) * wt; cy += (dd.ay + dd.oy) * wt; w += wt; srcFade = Math.max(srcFade, dd.fade); }
    if (w === 0) for (const id of t.ids) { const k = prevTile.get(id); const pd = k && k !== key ? this.tiles.get(k) : null; if (pd && pd.life === 'live') { cx += pd.ax + pd.ox; cy += pd.ay + pd.oy; w += 1; } }
    const tx = p.cx - t.ax; const ty = p.cy - t.ay;
    const sx = w > 0 ? cx / w - t.ax : tx; const sy = w > 0 ? cy / w - t.ay : ty;
    // the DISPLAY key must be unique: an aggregate that was matched to a layout tile of another key keeps its first key, and a layout tile with that key may be born later
    let dk = key; while (this.tiles.has(dk)) dk = key + '#' + (++this._uid);
    const d = {
      key: dk, lkey: key, kind: t.kind, ids: t.ids.slice(), n: t.n, life: 'live', age: 0, deathAge: 0, op0: 1, fade: 0, born: true, ghost: false, dim: false, mv: 1,
      birthDelay: Math.max(cutDelay, SEQ * srcFade),
      ax: t.ax, ay: t.ay, ox: sx, oy: sy, vx: 0, vy: 0, tx, ty, w: t.chipW, h: t.chipH, tw: t.chipW, th: t.chipH, scale: this.tok('motion.birthScale'), opacity: 0,
      handoffTo: null, prio: t.prio, label: { slot: 'r', vis: false, opacity: 0, feas: 0, rect: null }, leafId: null, ratioShown: t.ratio ?? 1,
      lat: t.kind === 'leaf' ? t.st.lat : null, lng: t.kind === 'leaf' ? t.st.lng : null, selected: false, labelText: null, labelW: 0, labelH: 0,
    };
    if (fadeMs <= 0) d.birthDelay = 0;
    this.tiles.set(dk, d);
    return d;
  }

  /** content that comes from the layout tile (text, side, arm, strength state ...), refreshed every frame */
  _content(d, t, dt, inp) {
    d.n = t.n; d.ids = t.ids; d.side = t.side; d.arm = t.arm; d.short = t.short; d.badge = t.badge || null; d.strength = t.strength; d.nameKind = t.nameKind || null;
    d.selected = inp.selectedId != null && t.ids.includes(inp.selectedId);
    const tween = this.tok('interp.strengthTweenMs') / 1000;
    d.ratioTarget = t.ratio ?? 1; d.ratioShown = tween <= 0 ? d.ratioTarget : dampStep(d.ratioShown, 0, d.ratioTarget, tween / 2, dt)[0];
    d.labelText = t.labelText || null; d.labelW = t.labelW; d.labelH = t.labelH;
    if (t.kind === 'leaf') {
      const st = t.st; d.lat = st.lat; d.lng = st.lng; d.disposition = st.disposition; d.ageTicks = st.ageTicks; d.ageMin = st.ageTicks; d.ageMax = st.ageTicks; d.moving = st.moving; d.kfTick = st.kfTick; d.unit = t.u; d.members = null;
    } else {
      const leaves = flattenLeaves(t); d.unit = null; d.disposition = null; d.moving = false;
      let mn = Infinity; let mx = 0; for (const l of leaves) { mn = Math.min(mn, l.st.ageTicks); mx = Math.max(mx, l.st.ageTicks); }
      d.ageMin = mn; d.ageMax = mx; d.ageTicks = mx;
      d.members = leaves.map((l) => ({ id: l.ids[0], ax: l.ax, ay: l.ay }));
    }
  }

  // ---- pushing ----------------------------------------------------------------------------------------------------------------------------------
  _mass(d) {
    if (d.life === 'dying') return 0.25;
    if (d.selected) return 4;
    if (d.born) return 0.5 + 0.5 * clamp01(d.age / 400);
    return 1 + 0.5 * Math.min(d.age, 6000) / 6000;
  }

  /** tiles that hand over to each other (a merge or a split) overlap by design while at most one of them is solid; ghosts of a cut ignore everything */
  _exempt(a, b) {
    if (a.ghost || b.ghost) return true;
    if (a.handoffTo === b.key || b.handoffTo === a.key) return true;
    if (a.life === 'dying' && b.life === 'dying' && a.handoffTo && a.handoffTo === b.handoffTo) return true;
    return false;
  }

  /** is the full-size box of d at its current place overlapping a solid tile that is not exempt from it?  (a travelling tile solidifies only when this is false) */
  _blocked(d, spec) {
    const gap = spec.gap; const r = this._chipRect(d, 1);
    for (const o of this.tiles.values()) {
      if (o === d || o.opacity < SOLID || o.ghost || this._exempt(d, o)) continue;
      const q = this._chipRect(o);
      if (Math.max(r.x0 - q.x1, q.x0 - r.x1) < gap && Math.max(r.y0 - q.y1, q.y0 - r.y1) < gap) return true;
      if (Math.hypot(o.ox, o.oy) > 1.5 && o.ax + spec.pinHalf > r.x0 - gap && o.ax - spec.pinHalf < r.x1 + gap && o.ay + spec.pinHalf > r.y0 - gap && o.ay - spec.pinHalf < r.y1 + gap) return true;
    }
    return false;
  }

  _collide(spec, iters, stats) {
    // the pushing gap is the solver's own clearance (minus a hair): pushing at gap + 0.25 pulled every pair of touching tiles apart against the glide that pulled them back, for ever (measured: 150 to 200 tiles never at rest)
    const gap = spec.gap - 0.002; const dMax = this.tok('layout.dMaxPx'); const pinHalf = spec.pinHalf; const SLACK = 24; const maxPush = this.tok('motion.maxPushPx');
    const act = []; for (const d of this.tiles.values()) if (d.opacity > 0.3 && !d.ghost && !d.dim) act.push(d);
    if (act.length < 2) return;
    // entities = chips (index < n) and the pins of displaced tiles (index >= n); columns of numbers, no per-pair allocation
    const pins = []; if (spec.pinProtect) for (const d of act) if (Math.hypot(d.ox, d.oy) > 1.5) pins.push(d);
    const n = act.length; const m = n + pins.length;
    if (!this._cx || this._cx.length < m) { const L = Math.ceil(m * 1.5); this._cx = new Float64Array(L); this._cy = new Float64Array(L); this._hw = new Float64Array(L); this._hh = new Float64Array(L); this._ms = new Float64Array(L); this._ord = new Int32Array(L); }
    const cx = this._cx; const cy = this._cy; const hw = this._hw; const hh = this._hh; const ms = this._ms; const ord = this._ord;
    for (let i = 0; i < n; i++) { const d = act[i]; cx[i] = d.ax + d.ox; cy[i] = d.ay + d.oy; hw[i] = d.w * d.scale / 2; hh[i] = d.h * d.scale / 2; ms[i] = this._mass(d); d._ox0 = d.ox; d._oy0 = d.oy; }
    for (let k = 0; k < pins.length; k++) { const i = n + k; const d = pins[k]; cx[i] = d.ax; cy[i] = d.ay; hw[i] = pinHalf; hh[i] = pinHalf; ms[i] = Infinity; }
    for (let i = 0; i < m; i++) ord[i] = i;
    const owner = (i) => (i < n ? act[i] : pins[i - n]);
    for (let it = 0; it < iters; it++) {
      // order by left edge (insertion sort: the order from the previous pass is nearly right)
      for (let i = 1; i < m; i++) { const v = ord[i]; const x = cx[v] - hw[v]; let j = i - 1; while (j >= 0 && cx[ord[j]] - hw[ord[j]] > x) { ord[j + 1] = ord[j]; j--; } ord[j + 1] = v; }
      let moved = 0;
      for (let ii = 0; ii < m; ii++) {
        const i = ord[ii]; const xr = cx[i] + hw[i] + gap + SLACK; const iPin = i >= n;
        for (let jj = ii + 1; jj < m; jj++) {
          const j = ord[jj]; if (cx[j] - hw[j] > xr) break;
          const jPin = j >= n; if (iPin && jPin) continue;
          const di = owner(i); const dj = owner(j); if (di === dj) continue;
          if (di.ghost || dj.ghost || di.handoffTo === dj.key || dj.handoffTo === di.key || (di.life === 'dying' && dj.life === 'dying' && di.handoffTo && di.handoffTo === dj.handoffTo)) continue;
          const dx = Math.min(cx[i] + hw[i] + gap - (cx[j] - hw[j]), cx[j] + hw[j] + gap - (cx[i] - hw[i]));
          if (dx <= 0) continue;
          const dy = Math.min(cy[i] + hh[i] + gap - (cy[j] - hh[j]), cy[j] + hh[j] + gap - (cy[i] - hh[i]));
          if (dy <= 0) continue;
          const useX = dx < dy; const pen = Math.min(useX ? dx : dy, maxPush);              // a push is at most maxPushPx per pass: contact is a shove you can see coming, not a jump
          const ca = useX ? cx[i] : cy[i]; const cb = useX ? cx[j] : cy[j];
          const dir = ca === cb ? (di.key < dj.key ? -1 : 1) : (ca < cb ? -1 : 1);       // direction to push i (j gets the opposite)
          const mi = ms[i]; const mj = ms[j]; let fa; let fb;
          if (mi === Infinity) { fa = 0; fb = 1; } else if (mj === Infinity) { fa = 1; fb = 0; } else { fa = mj / (mi + mj); fb = mi / (mi + mj); }
          if (!iPin) { if (useX) cx[i] += dir * pen * fa; else cy[i] += dir * pen * fa; }
          if (!jPin) { if (useX) cx[j] -= dir * pen * fb; else cy[j] -= dir * pen * fb; }
          moved++;
        }
      }
      for (let i = 0; i < n; i++) {                                                  // a settled tile never sits farther than the budget from its true position
        const d = act[i]; if (d.life === 'dying' || d.born) continue;
        const ox = cx[i] - d.ax; const oy = cy[i] - d.ay; const mg = Math.hypot(ox, oy);
        if (mg > dMax + 1e-6) { cx[i] = d.ax + ox * dMax / mg; cy[i] = d.ay + oy * dMax / mg; }
      }
      if (!moved) break;
    }
    let pushed = 0;
    for (let i = 0; i < n; i++) { const d = act[i]; const ox = cx[i] - d.ax; const oy = cy[i] - d.ay; if (Math.hypot(ox - d._ox0, oy - d._oy0) > 0.01) pushed++; d.ox = ox; d.oy = oy; }
    stats.pushed = pushed;
  }

  // ---- labels -----------------------------------------------------------------------------------------------------------------------------------
  _chipRect(d, scale = d.scale) { const hw = d.w * scale / 2; const hh = d.h * scale / 2; const cx = d.ax + d.ox; const cy = d.ay + d.oy; return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh }; }

  _labels(spec, dtMs, z) {
    const tok = this.tok; const gap = spec.gap; const fadeMs = Math.max(1, tok('motion.labelFadeMs'));
    let toggles = 0;
    const solid = []; for (const d of this.tiles.values()) if (d.opacity >= SOLID) solid.push(d);
    const occ = new Occ(64);
    for (const d of solid) {
      const r = this._chipRect(d); r.owner = d.key; r.kind = 'chip'; occ.add(r);
      if (Math.hypot(d.ox, d.oy) > 1.5) occ.add({ x0: d.ax - spec.pinHalf, y0: d.ay - spec.pinHalf, x1: d.ax + spec.pinHalf, y1: d.ay + spec.pinHalf, owner: d.key, kind: 'pin' });
    }
    const want = spec.labels && z >= spec.labelMinZoom;
    const cand = solid.filter((d) => d.kind === 'leaf' && d.labelText && d.life === 'live' && !d.born && !d.dim && d.mv >= 0.999 && d.scale >= 0.99).sort((a, b) => b.prio - a.prio || (a.key < b.key ? -1 : 1));
    const placed = new Set(); const eligible = new Set(cand);
    const rectFor = (d, slot) => labelRect({ chipW: d.w, chipH: d.h, labelW: d.labelW, labelH: d.labelH }, d.ax + d.ox, d.ay + d.oy, slot, spec);
    const fit = (d, slot) => { const r = rectFor(d, slot); return rectFree(r, occ, d.key, gap) ? r : null; };
    if (want) {
      for (const d of cand) {                                                          // a label shown last frame keeps its slot (or takes another) while it fits
        const Lb = d.label; if (!Lb.vis) continue;
        for (const s of [Lb.slot, ...SLOTS.filter((x) => x !== Lb.slot)]) { const r = fit(d, s); if (r) { r.owner = d.key; r.kind = 'label'; occ.add(r); Lb.slot = s; Lb.rect = r; placed.add(d); break; } }
      }
      for (const d of cand) {                                                          // a new label needs labelShowDelay of continuous room
        if (placed.has(d)) continue; const Lb = d.label;
        const ok = SLOTS.some((s) => fit(d, s)); Lb.feas = ok ? Lb.feas + dtMs : 0;
        if (ok && Lb.feas >= spec.labelShowDelay * (1000 / 60) && this.nowMs >= (Lb.cool || 0)) for (const s of SLOTS) { const r = fit(d, s); if (r) { r.owner = d.key; r.kind = 'label'; occ.add(r); Lb.slot = s; Lb.rect = r; Lb.vis = true; placed.add(d); toggles++; break; } }
      }
    }
    for (const d of this.tiles.values()) {
      const Lb = d.label; const was = Lb.vis;
      if (placed.has(d)) Lb.opacity = Math.min(1, Lb.opacity + dtMs / fadeMs);
      else { if (was) { toggles++; if (eligible.has(d)) Lb.cool = this.nowMs + spec.labelCooldown * (1000 / 60); } Lb.vis = false; Lb.opacity = Math.max(0, Math.min(Lb.opacity, SOLID - 0.01) - dtMs / fadeMs); }   // never solid once it stops fitting
      if (Lb.opacity <= 0 && !placed.has(d)) Lb.rect = null;
    }
    return toggles;
  }

  // ---- verification and the net -----------------------------------------------------------------------------------------------------------------
  _items(spec) {
    const items = [];
    for (const d of this.tiles.values()) {
      if (d.opacity < SOLID) continue;
      items.push({ owner: d.key, kind: 'chip', ...this._chipRect(d) });
      if (d.label.opacity >= SOLID && d.label.rect) items.push({ owner: d.key, kind: 'label', ...plain(d.label.rect) });
      if (Math.hypot(d.ox, d.oy) > 1.5) items.push({ owner: d.key, kind: 'pin', x0: d.ax - spec.pinHalf, y0: d.ay - spec.pinHalf, x1: d.ax + spec.pinHalf, y1: d.ay + spec.pinHalf });
    }
    return items;
  }

  _verifyAndRepair(spec, stats) {
    const net = this.tok('motion.safetyNet') && !this._diag; const dimOp = this.tok('motion.dimOpacity'); const dimmed = new Set();
    let items = this._items(spec); let v = verifyFrame(items, spec.gap - 0.05, true);
    if (net) {
      for (let round = 0; v.overlaps > 0 && round < 400; round++) {
        stats.netRounds++;
        const victims = new Set();
        for (const [i, j] of v.pairs) {
          const a = this.tiles.get(items[i].owner); const b = this.tiles.get(items[j].owner); if (!a || !b) continue;
          if (a === b) continue;
          const ma = this._mass(a); const mb = this._mass(b);
          // the lighter tile gives way; an item that is a label or a pin of the other tile is repaired by dimming the LABEL owner's label, then the tile
          victims.add(ma < mb || (ma === mb && a.key > b.key) ? a : b);
        }
        let changed = 0;
        for (const d of victims) {
          if (d.life === 'dying') { d.opacity = 0; changed++; continue; }
          d.dim = true; d.mv = Math.min(d.mv, dimOp); d.opacity = Math.min(d.opacity, dimOp); d.label.opacity = Math.min(d.label.opacity, SOLID - 0.01); dimmed.add(d.key); changed++;
        }
        if (!changed) break;
        items = this._items(spec); v = verifyFrame(items, spec.gap - 0.05, true);
      }
      stats.netDims = dimmed.size;
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
      key: d.key, kind: d.kind, ids: d.ids, n: d.n, x: d.ax + d.ox, y: d.ay + d.oy, ax: d.ax, ay: d.ay, w: d.w, h: d.h, scale: d.scale, opacity: d.opacity, solid: d.opacity >= SOLID, life: d.life,
      ajx: d.ajx || 0, ajy: d.ajy || 0, entering: d.born, travelling: d.dim, displaced: Math.hypot(d.ox, d.oy) > 1.5, side: d.side, arm: d.arm, short: d.short, badge: d.badge, nameKind: d.nameKind, ratio: d.ratioShown, strength: d.strength,
      disposition: d.disposition, selected: !!d.selected, unit: d.unit, ageTicks: d.ageTicks, ageMin: d.ageMin, ageMax: d.ageMax, moving: !!d.moving, members: d.members,
      label: d.label.opacity > 0.01 && d.label.rect && d.labelText ? { text: d.labelText, slot: d.label.slot, opacity: d.label.opacity, x0: d.label.rect.x0, y0: d.label.rect.y0, x1: d.label.rect.x1, y1: d.label.rect.y1 } : null,
    }));
    let unrepresented = 0; const onField = new Set(); for (const lf of L.leaves || []) onField.add(lf.ids[0]);
    for (const id of onField) if (!assign.has(id)) unrepresented++;
    let travelling = 0; for (const t of tiles) if (t.travelling && t.life === 'live') travelling++;
    stats.travelling = travelling;
    return { tiles, offsets, stats, overlaps: ver ? ver.overlaps : null, clearanceViolations: ver ? ver.clearanceViolations : null, unrepresented, assign, solverMs: L.ms, rounds: L.rounds, onField: onField.size };
  }
}
