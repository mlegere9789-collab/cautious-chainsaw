// The stage turns history-layer events into the renderer's unit, soldier and gun tables. Everything the viewer sees about units is a PURE FUNCTION OF TIME:
// the sim EventCache (docs/battle-theatre/sim/cache.mjs) holds the events and snapshots, state(t) = reduce(snapshot <= t, events in (snapshot, t]),
// and a unit's position/heading/clip/formation/losses at t is computed from that state and t alone. A seek therefore equals sequential playback (gate Q12).
// The arrival rule (gate Q04) is enforced twice: the cache rejects events outside a unit's presence window, and the stage will not draw a unit whose
// window has not opened, whatever the events say.
//
// Contract 1.3 on the stage:
//  * 'state' events (one man leaves the line): the man's index inside the unit is his renderer figure. A killed or wounded man falls (the prototype's fall clip, then lies) at the time the solver gave him;
//    a missing man is counted in the unit's running ranges but not animated (the renderer cannot show a man leaving the line). The fall table (sold1.x, in the renderer's animation clock) is rewritten by this
//    stage; a man who has fallen STAYS WHERE HE FELL: his slot in the unit's frame is rewritten every time the unit moves or turns, so the unit marches away from him.
//  * 'formation' events: the figures of a unit blend from one slot layout (column of fours) to the other (line) over duration_s with a smoothstep: no snap. Only column_fours and line on a foot unit that has both
//    layouts are drawn; any other value is listed in `unsupported` (never dropped silently).
//  * guns and their crews (world.extra) follow their battery; limbers, caissons and teams have no model in the renderer and are not drawn.
import { EventCache, hashState } from '../../sim/cache.mjs';
import { fmix32 } from '../../sim/rng.mjs';
import { hsh } from '../../render/prototype/src/math.mjs';
import { ACTIVITIES } from './history/contract.mjs';
import { angleLerp } from './geo.mjs';
import { SEED } from './config.mjs';

export const HIDDEN = 1e6;                 // hidden units and guns are parked here: far outside every frustum and culled on the CPU
export const FALL_NEVER = 1e9;             // the prototype's “never falls” time in the soldier table
const UNIT_STRIDE = 12, TURN_S = 25, MAX_TURN_EDGE_MS = 4.4;      // TURN_S: the shortest turn; MAX_TURN_EDGE_MS: the fastest the outer edge of a formation may move while it turns (a train turned in 25 s moved its far end at 30 m/s)
const NEVER = { from: Infinity, to: null };      // a unit with no arrival record (not on the field, or no gate) is never present
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const bearingToH = deg => Math.PI - deg * Math.PI / 180;
const upperBound = (a, t) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= t) lo = m + 1; else hi = m; } return lo; };
const FATE_CODE = { killed: 0, wounded: 1, missing: 2 };

export class Stage {
  constructor({ layer, world, T, geo }) {
    this.layer = layer; this.w = world; this.T = T; this.geo = geo; this.n = world.units.length; this.nL = layer.units.length; this.extra = world.extra || [];
    this.index = new Map(layer.units.map((u, i) => [u.id, i]));
    this.slots = world.units.map((u, i) => ({ x: world.unitF[i * UNIT_STRIDE], z: world.unitF[i * UNIT_STRIDE + 1], h: world.unitF[i * UNIT_STRIDE + 2] }));
    this.klass = world.units.map(u => u.klass); this.count = world.units.map(u => u.count); this.team = world.units.map(u => u.team);
    this.gunOf = new Int32Array(this.n).fill(-1); world.units.forEach((u, i) => { if (u.gun != null) this.gunOf[i] = u.gun; });
    this.gun0 = Float32Array.from(world.gunF);                        // the guns as built (period, phase, position)
    this.bbox = world.units.map(u => this._bbox(u));
    this.sold0 = Float32Array.from(world.sold);                        // the slots as built (the first layout): the rewrite restores from here
    this.present = new Uint8Array(this.n); this.act = new Array(this.n).fill(null); this.sig = new Float32Array(this.n); this.cx = new Float32Array(this.n); this.cz = new Float32Array(this.n); this.ch = new Float32Array(this.n);
    this.dirtyUnits = true; this.dirtyGuns = true; this.dirtySlots = false; this.dirtyFalls = false; this.builtTo = -Infinity; this.rejected = [];
    this.animT = undefined; this.rebaseFlag = true; this.unsupported = []; this.detail = []; this.dt = new Array(this.nL).fill(null); this.track = new Array(this.nL).fill(null);
    for (let i = 0; i < this.nL; i++) { const u = world.units[i]; u.r0 = u.radius; }
    this.stats = { units: 0, soldiers: 0, union: 0, confederate: 0, mounted: 0, guns: 0, down: 0 };
  }
  _bbox(u) { // local extents of the formation around the unit origin: [minLateral, maxLateral, minDepth, maxDepth] in metres
    const s = this.w.sold; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; if (!u.count) return [-1, 1, -1, 1];
    for (let k = 0; k < u.count; k++) { const i = (u.first + k) * 4, x = s[i], z = s[i + 1]; if (x < a) a = x; if (x > b) b = x; if (z < c) c = z; if (z > d) d = z; }
    return [a - 1, b + 1, c - 1, d + 1];
  }
  // the renderer’s animation clock was reset (a seek, a scenario change, the clock’s wrap): the next apply() recomputes every fall time against the new clock
  rebase() { this.rebaseFlag = true; }

  // ---- the state of one unit: a pure step, shared by the cache reducer and by the per-unit replay used for the places where men fell
  _step(cur, e) {
    if (e.type === 'enter') return { x: e.x, z: e.z, path: null, act: 'stand', head: null, headFrom: null, actT: e.t, t0: e.t, loss: null, fb0: 0, fb1: 0, ft0: e.t, fdur: 1 };
    if (!cur) return cur;                                                  // events for a unit that is not on the field do nothing
    if (e.type === 'path') return { ...cur, path: e.path };
    if (e.type === 'activity') {
      if (cur.head == null) return { ...cur, act: e.activity, head: e.head ?? 0, headFrom: e.head ?? 0, actT: e.t, turnS: TURN_S };
      const from = this._heading(cur, e.t), to = e.head ?? cur.head, bb = this.bbox[this.index.get(e.unit)] || [-1, 1, -1, 1], ext = Math.max(Math.abs(bb[0]), Math.abs(bb[1]), Math.abs(bb[2]), Math.abs(bb[3]));
      const dA = Math.abs(((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
      return { ...cur, headFrom: from, act: e.activity, head: to, actT: e.t, turnS: Math.min(900, Math.max(TURN_S, dA * ext / MAX_TURN_EDGE_MS)) };      // a block turns as a rigid body: its outer edge may not move faster than 4.4 m/s
    }
    if (e.type === 'state') return { ...cur, loss: e.loss };
    if (e.type === 'formation') return { ...cur, fb0: this._blend(cur, e.t), fb1: e.target, ft0: e.t, fdur: e.dur };
    if (e.type === 'leave') return null;
    return cur;
  }
  _blend(rec, t) { return rec.fb0 + (rec.fb1 - rec.fb0) * smooth((t - rec.ft0) / rec.fdur); }

  // ---- history -> event cache (seconds). Positions become render-frame metres here, once, so the cache state is final.
  loadScenario(scenario) {
    const { arrivals, events } = this.layer.both(scenario), n = this.n, nL = this.nL, geo = this.geo, W = this.w;
    for (const i of this.detail) this._restoreUnit(i);                // a unit the previous scenario rewrote goes back to the slots as built
    const presence = {}, lastLeave = new Map();
    for (const e of events) if (e.type === 'leave') lastLeave.set(e.unit, e.t * 60);
    for (const a of arrivals) presence[a.unit] = { from: a.earliest * 60, to: lastLeave.has(a.unit) ? lastLeave.get(a.unit) : null };
    this.presence = presence; this.arrivals = new Map(arrivals.map(a => [a.unit, a]));
    const idx = this.index;
    const reducer = (state, e) => { const i = idx.get(e.unit), cur = state.u[i]; const nxt = this._step(cur, e); if (nxt === cur) return state; const u = state.u.slice(); u[i] = nxt; return { u }; };
    const cache = new EventCache({ init: () => ({ u: new Array(nL).fill(null) }), reducer, snapshotEvery: 1800, seed: SEED, scenario: scenario?.id || 'pdf-recommended', presence });
    this.track = new Array(nL).fill(null); this.unsupported = [];
    const falls = new Map(), lossEv = new Map();
    for (const e of events) {
      const i = this.index.get(e.unit), ev = { t: e.t * 60, unit: e.unit, type: e.type };
      if (e.type === 'enter') { const [x, z] = geo.xz(e.at.lng, e.at.lat); ev.x = x; ev.z = z; }
      if (e.type === 'path') { ev.path = { t: e.wp.map(w => w.t * 60), x: [], z: [], s: e.wp.map(w => w.sigma_m) }; for (const w of e.wp) { const [x, z] = geo.xz(w.lng, w.lat); ev.path.x.push(x); ev.path.z.push(z); } }
      if (e.type === 'activity') { ev.activity = e.activity; if (e.heading_deg != null) ev.head = bearingToH(e.heading_deg); }
      if (e.type === 'formation') {
        const w = W.units[i], target = w && w.alt ? (e.formation === w.altFormation ? 1 : e.formation === w.baseFormation ? 0 : null) : null;
        if (target == null) { this.unsupported.push({ unit: e.unit, formation: e.formation, t: e.t, reason: w && w.alt ? `the unit has the layouts ${w.baseFormation} and ${w.altFormation} only` : 'the renderer has one slot layout for this unit (no second layout was built: the unit has no printed change of formation, or it is mounted)' }); continue; }
        ev.target = target; ev.dur = e.duration_s || 90;
      }
      if (e.type === 'state') {
        const w = W.units[i];
        if (!(e.agent < (w ? w.count : 0))) { this.unsupported.push({ unit: e.unit, state: e.agent, t: e.t, reason: 'the figure is not one of the unit’s drawn figures (a crew figure of a drawn gun is not given a fall)' }); continue; }
        ev.loss = { strength_now: e.strength_now, killed: e.killed, wounded: e.wounded, missing: e.missing, down: e.down };
        if (!lossEv.has(i)) lossEv.set(i, []); lossEv.get(i).push({ agent: e.agent, t: ev.t, fate: FATE_CODE[e.fate] });
      }
      if (cache.add(ev) && i != null) { if (!this.track[i]) this.track[i] = []; this.track[i].push(ev); }
    }
    this.cache = cache; this.builtTo = -Infinity; this.rejected = cache.rejected; this.dirtyUnits = this.dirtyGuns = true;
    // fall plans per unit and the units whose slots the stage rewrites (those with men to fall, those with a second layout)
    this.dt = new Array(nL).fill(null); this.detail = [];
    for (let i = 0; i < nL; i++) {
      const w = W.units[i], le = lossEv.get(i), alt = w.alt || null; if (!le && !alt) continue;
      let L = null;
      if (le) {
        le.sort((a, b) => a.t - b.t || a.agent - b.agent);
        const m = le.length; L = { t: new Float64Array(m), agent: new Int32Array(m), fate: new Uint8Array(m), anim: new Uint8Array(m), cum: new Int32Array(m + 1), px: new Float32Array(m).fill(NaN), pz: new Float32Array(m).fill(NaN), jOf: new Int32Array(w.count).fill(-1) };
        le.forEach((x, j) => { L.t[j] = x.t; L.agent[j] = x.agent; L.fate[j] = x.fate; L.anim[j] = x.fate === 2 ? 0 : 1; L.cum[j + 1] = L.cum[j] + L.anim[j]; if (L.anim[j]) L.jOf[x.agent] = j; });
      }
      this.dt[i] = { loss: L, alt, k: 0, sig: null }; this.detail.push(i); this._restoreUnit(i);
    }
    this.rebaseFlag = true; this.dirtySlots = this.dirtyFalls = true;
    this.segs = null; this.segsVersion = (this.segsVersion || 0) + 1;                // the crowd (src/crowd) asks for the activity timelines lazily: unitSegments(i)
    this.lastKey = null; return { events: events.length, rejected: cache.rejected.length, unsupported: this.unsupported.length };
  }
  // ---- what the animation needs from the history: each unit's ACTIVITY TIMELINE in simulation seconds, from the same admitted events the cache holds (so it can never disagree with where the unit is).
  // A segment is { t0, activity, speed, night }: the ground speed is the speed of the path leg the unit is on (0 outside the path), a unit that moves is 'march' (or 'double_quick' above 2 m/s) whatever the last activity
  // event said, a unit that does not move keeps the activity the layer named. Night is the local-time convention 19:30 - 04:30 (plausible-procedural; it only chooses the camp clips: sleeping or sitting at the fire).
  unitSegments(i) {
    if (!this.segs) this.segs = new Array(this.nL).fill(undefined);
    if (this.segs[i] !== undefined) return this.segs[i];
    const tr = this.track[i]; if (!tr || !tr.length) return (this.segs[i] = []);
    const ev = tr.slice().sort((a, b) => a.t - b.t), times = new Set(); let leaveT = Infinity;
    for (const e of ev) { if (e.type === 'enter' || e.type === 'activity' || e.type === 'path' || e.type === 'leave') times.add(e.t); if (e.type === 'path') for (const t of e.path.t) times.add(t); if (e.type === 'leave') leaveT = Math.min(leaveT, e.t); }
    const T = [...times].filter(t => t <= leaveT).sort((a, b) => a - b), out = []; let act = 'stand', path = null, on = false, ei = 0;
    for (const tb of T) {
      while (ei < ev.length && ev[ei].t <= tb) { const e = ev[ei++]; if (e.type === 'enter') { on = true; act = 'stand'; path = null; } else if (!on) continue; else if (e.type === 'path') path = e.path; else if (e.type === 'activity') act = e.activity; else if (e.type === 'leave') on = false; }
      if (!on) continue;
      let v = 0; if (path) { const p = path, k = p.t.length - 1; if (tb >= p.t[0] && tb < p.t[k]) { let j = 0; while (p.t[j + 1] <= tb) j++; const dt = p.t[j + 1] - p.t[j]; v = dt > 0 ? Math.hypot(p.x[j + 1] - p.x[j], p.z[j + 1] - p.z[j]) / dt : 0; } }
      const moving = v > 0.15, a = moving ? (v > 2.0 ? 'double_quick' : 'march') : (act === 'march' || act === 'double_quick' ? 'stand' : act), sp = moving ? v : 0, prev = out[out.length - 1];
      if (prev && prev.activity === a && Math.abs(prev.speed - sp) < 0.02) continue;
      const tod = (tb / 60) % 1440; out.push({ t0: tb, activity: a, speed: sp, night: tod < 270 || tod >= 1170 });
    }
    return (this.segs[i] = out);
  }
  // the men who fall in unit i: { t (seconds), agent, fate (0 killed, 1 wounded), anim } sorted by time; missing men are listed with anim 0 (they do not fall in the picture)
  fallInfo(i) { const d = this.dt[i], L = d && d.loss; if (!L) return null; return { t: L.t, agent: L.agent, fate: L.fate, anim: L.anim }; }
  _restoreUnit(i) { const w = this.w.units[i], s = this.w.sold, s1 = this.w.sold1, s0 = this.sold0; for (let a = 0; a < w.count; a++) { const g = w.first + a; s[g * 4] = s0[g * 4]; s[g * 4 + 1] = s0[g * 4 + 1]; s1[g * 4] = FALL_NEVER; } w.radius = w.r0; }
  _heading(rec, t) { return rec.head == null ? 0 : angleLerp(rec.headFrom, rec.head, smooth((t - rec.actT) / (rec.turnS || TURN_S))); }
  _pos(rec, t, out) {   // out = [x, z, sigma_m]
    const p = rec.path;
    if (!p) { out[0] = rec.x; out[1] = rec.z; out[2] = 200; return out; }
    const k = p.t.length - 1;
    if (t <= p.t[0]) { out[0] = p.x[0]; out[1] = p.z[0]; out[2] = p.s[0]; return out; }
    if (t >= p.t[k]) { out[0] = p.x[k]; out[1] = p.z[k]; out[2] = p.s[k]; return out; }
    let i = 0; while (p.t[i + 1] < t) i++;
    const f = (t - p.t[i]) / (p.t[i + 1] - p.t[i]);
    out[0] = p.x[i] + (p.x[i + 1] - p.x[i]) * f; out[1] = p.z[i] + (p.z[i + 1] - p.z[i]) * f; out[2] = p.s[i] + (p.s[i + 1] - p.s[i]) * f; return out;
  }
  // the unit's state at any time from its own events only (cheap: a unit has a handful of events)
  _replay(i, tSec) { let rec = null; const tr = this.track[i]; if (tr) for (const e of tr) { if (e.t > tSec) break; rec = this._step(rec, e); } return rec; }

  // state at a time (pure). Fills the CPU unit table the LOD code reads and marks what must be uploaded. animT: the renderer's animation clock now (see rebase()).
  apply(tMin, animT = this.animT) {
    const tSec = tMin * 60, cache = this.cache; this.tNow = tMin;
    if (tSec > this.builtTo + 3600) { cache.build(tSec + 7200); this.builtTo = tSec + 7200; }
    const st = cache.at(tSec), f = this.w.unitF, o2 = [0, 0, 0], pres = this.presence, ids = this.layer.units, nL = this.nL;
    let units = 0, soldiers = 0, uni = 0, con = 0, mounted = 0, changed = false;
    for (let i = 0; i < this.n; i++) {
      const o = i * UNIT_STRIDE; let x = HIDDEN, z = HIDDEN, h = f[o + 2], clip = f[o + 3], act = null, on = false;
      if (i < nL) {
        const rec = st.u[i], p = pres[ids[i].id] || NEVER; on = !!rec && tSec >= p.from && (p.to == null || tSec <= p.to);
        if (on) { this._pos(rec, tSec, o2); x = o2[0]; z = o2[1]; this.sig[i] = o2[2]; h = this._heading(rec, tSec); act = rec.act; const a = ACTIVITIES[act] || ACTIVITIES.stand; clip = this.klass[i] === 1 ? a.mounted : a.foot; }
      } else {          // a crew figure group: follows its battery
        const e = this.extra[i - nL]; on = this.present[e.parent] === 1;
        if (on) { const c = Math.cos(this.ch[e.parent]), s = Math.sin(this.ch[e.parent]); x = this.cx[e.parent] + e.dx * c + e.dz * s; z = this.cz[e.parent] - e.dx * s + e.dz * c; h = this.ch[e.parent] + (e.dh || 0); act = this.act[e.parent]; clip = (ACTIVITIES[act] || ACTIVITIES.stand).foot; this.sig[i] = this.sig[e.parent]; }
      }
      if (on) { if (i < nL) units++; soldiers += this.count[i]; if (this.team[i] === 0) uni += this.count[i]; else con += this.count[i]; if (this.klass[i] === 1) mounted += this.count[i]; }
      if (f[o] !== Math.fround(x) || f[o + 1] !== Math.fround(z) || f[o + 2] !== Math.fround(h) || f[o + 3] !== clip) { f[o] = x; f[o + 1] = z; f[o + 2] = h; f[o + 3] = clip; f[o + 4] = 0; f[o + 5] = 0; f[o + 8] = 0; changed = true; }
      this.present[i] = on ? 1 : 0; this.act[i] = act; this.cx[i] = x; this.cz[i] = z; this.ch[i] = h;
    }
    if (changed) this.dirtyUnits = true;
    const down = this._detail(st, tSec, animT);
    // guns exist while their crew is on the field and shoot only while the crew serves them
    const g = this.w.gunF, g0 = this.gun0; let guns = 0;
    for (let i = 0; i < this.n; i++) {
      const gi = this.gunOf[i]; if (gi < 0) continue; const o = gi * 8;
      const on = this.present[i] === 1, firing = on && this.act[i] === 'serve_guns';
      const nx = on ? this.cx[i] : HIDDEN, nz = on ? this.cz[i] : HIDDEN, np = firing ? g0[o + 4] : 1e12;
      if (on) guns++;
      if (g[o] !== Math.fround(nx) || g[o + 1] !== Math.fround(nz) || g[o + 4] !== Math.fround(np)) { g[o] = nx; g[o + 1] = nz; g[o + 2] = on ? this.ch[i] : g0[o + 2]; g[o + 4] = np; this.dirtyGuns = true; }
    }
    this.stats = { units, soldiers, union: uni, confederate: con, mounted, guns, down };
    return this.stats;
  }
  // The places where men lie and the blend between layouts. Returns the number of men lying now. Touches the soldier tables only for units with men to fall or a second layout.
  _detail(st, tSec, animT) {
    if (!this.detail.length) return 0;
    const seek = animT == null || this.rebaseFlag, A = animT == null ? 40 + (tSec % 7200) : animT, f = this.w.unitF, s = this.w.sold, s1 = this.w.sold1, s0 = this.sold0; this.rebaseFlag = false;
    let down = 0;
    for (const i of this.detail) {
      const d = this.dt[i], L = d.loss, alt = d.alt, w = this.w.units[i];
      if (this.present[i] !== 1) { if (d.touched) { this._restoreUnit(i); d.touched = false; d.k = 0; d.sig = null; this.dirtySlots = this.dirtyFalls = true; } continue; }      // hidden: nothing is drawn; a unit that was rewritten goes back to the tables as built (a pure function of time)
      const rec = st.u[i], k = L ? upperBound(L.t, tSec) : 0;
      if (L) {                                                                   // 1. the fall times, in the renderer's animation clock
        d.touched = true;
        if (seek) { for (let j = 0; j < L.t.length; j++) if (L.anim[j]) s1[(w.first + L.agent[j]) * 4] = j < k ? A - (tSec - L.t[j]) : FALL_NEVER; this.dirtyFalls = true; }
        else if (k !== d.k) {
          if (k > d.k) { for (let j = d.k; j < k; j++) if (L.anim[j]) s1[(w.first + L.agent[j]) * 4] = A - (tSec - L.t[j]); }
          else for (let j = k; j < d.k; j++) if (L.anim[j]) s1[(w.first + L.agent[j]) * 4] = FALL_NEVER;
          this.dirtyFalls = true;
        }
        down += L.cum[k];
      }
      const o = i * UNIT_STRIDE, x = f[o], z = f[o + 1], h = f[o + 2], b = alt ? this._blend(rec, tSec) : 0, sig = d.sig;
      if (!seek && sig && sig[0] === k && sig[1] === b && sig[2] === x && sig[3] === z && sig[4] === h) { continue; }
      d.k = k; d.sig = [k, b, x, z, h]; d.touched = true;
      // 2. the slots: the blend of the two layouts for the men standing, the place where he fell for each man lying
      const c = Math.cos(h), sn = Math.sin(h), nF = L ? k : 0; let rmax = 0;
      const lock = (a, j) => {                                                  // slot of man `a` lying where he fell (event j)
        const g = w.first + a;
        if (Number.isNaN(L.px[j])) this._fallPlace(i, a, j);
        const dx = L.px[j] - x, dz = L.pz[j] - z, sx = dx * c - dz * sn, sz = dx * sn + dz * c;
        s[g * 4] = sx - (hsh(g * 31 + 1) - 0.5) * 0.2; s[g * 4 + 1] = sz - (hsh(g * 37 + 2) - 0.5) * 0.2; const r = Math.hypot(sx, sz); if (r > rmax) rmax = r;
      };
      if (alt) {
        for (let a = 0; a < w.count; a++) {
          const g = w.first + a, j = L ? L.jOf[a] : -1;
          if (j >= 0 && j < nF) lock(a, j);
          else { s[g * 4] = s0[g * 4] + (alt[a * 2] - s0[g * 4]) * b; s[g * 4 + 1] = s0[g * 4 + 1] + (alt[a * 2 + 1] - s0[g * 4 + 1]) * b; }
        }
      } else if (L) {
        for (let j = 0; j < L.t.length; j++) { if (!L.anim[j]) continue; const a = L.agent[j]; if (j < nF) lock(a, j); else { const g = w.first + a; s[g * 4] = s0[g * 4]; s[g * 4 + 1] = s0[g * 4 + 1]; } }
      }
      const nr = Math.max(w.r0, rmax + 3); if (nr !== w.radius) w.radius = nr;
      this.dirtySlots = true;
    }
    return down;
  }
  // where man `a` (event j) lay down: the unit's pose at the time he fell plus his slot in the layout of that time. A pure function of the unit's own events.
  _fallPlace(i, a, j) {
    const d = this.dt[i], L = d.loss, w = this.w.units[i], tF = L.t[j], rec = this._replay(i, tF), g = w.first + a, o2 = [0, 0, 0];
    if (!rec) { L.px[j] = HIDDEN; L.pz[j] = HIDDEN; return; }
    this._pos(rec, tF, o2); const h = this._heading(rec, tF), b = d.alt ? this._blend(rec, tF) : 0, s0 = this.sold0;
    const sx = (d.alt ? s0[g * 4] + (d.alt[a * 2] - s0[g * 4]) * b : s0[g * 4]) + (hsh(g * 31 + 1) - 0.5) * 0.2, sz = (d.alt ? s0[g * 4 + 1] + (d.alt[a * 2 + 1] - s0[g * 4 + 1]) * b : s0[g * 4 + 1]) + (hsh(g * 37 + 2) - 0.5) * 0.2;
    const c = Math.cos(h), sn = Math.sin(h); L.px[j] = o2[0] + sx * c + sz * sn; L.pz[j] = o2[1] - sx * sn + sz * c;
  }
  // the running loss ranges of a unit at a time (null if the unit has no state events yet)
  lossAt(i, tMin) { const rec = this.cache.at(tMin * 60).u[i]; return rec ? rec.loss : null; }
  // guns only, for the effects replay after a seek (cheap): position and whether they are firing at time t
  applyGunsAt(tMin) {
    const tSec = tMin * 60, st = this.cache.at(tSec), g = this.w.gunF, g0 = this.gun0, pres = this.presence, ids = this.layer.units, tmp = [0, 0, 0], nL = this.nL;
    for (let i = 0; i < this.n; i++) {
      const gi = this.gunOf[i]; if (gi < 0) continue; const o = gi * 8;
      const pi = i < nL ? i : this.extra[i - nL].parent, rec = st.u[pi], p = pres[ids[pi].id] || NEVER;
      const on = !!rec && tSec >= p.from && (p.to == null || tSec <= p.to), firing = on && rec.act === 'serve_guns';
      if (on) { this._pos(rec, tSec, tmp); if (i < nL) { g[o] = tmp[0]; g[o + 1] = tmp[1]; } else { const e = this.extra[i - nL], hh = this._heading(rec, tSec), c = Math.cos(hh), s = Math.sin(hh); g[o] = tmp[0] + e.dx * c + e.dz * s; g[o + 1] = tmp[1] - e.dx * s + e.dz * c; } } else { g[o] = HIDDEN; g[o + 1] = HIDDEN; }
      g[o + 4] = firing ? g0[o + 4] : 1e12;
    }
    this.dirtyGuns = true;
  }
  // a hash of what is actually in the live tables (what the renderer is told), for the scrub test
  liveHash() {
    const f = this.w.unitF, g = this.w.gunF, s = this.w.sold; let h = 0x811c9dc5;
    const mix = v => { h = fmix32((h ^ (v | 0)) >>> 0); };
    for (let i = 0; i < this.n; i++) { const o = i * UNIT_STRIDE; mix(this.present[i]); if (this.present[i]) { mix(Math.round(f[o] * 100)); mix(Math.round(f[o + 1] * 100)); mix(Math.round(f[o + 2] * 1000)); mix(f[o + 3]); } }
    for (let i = 0; i < g.length / 8; i++) { mix(g[i * 8] >= HIDDEN / 2 ? 1 : 2); mix(g[i * 8 + 4] > 1e11 ? 1 : 2); }
    for (const i of this.detail) {                                                          // the men lying and the slots that were rewritten
      if (this.present[i] !== 1) continue; const d = this.dt[i], w = this.w.units[i]; mix(i); mix(d.k); mix(Math.round((d.sig ? d.sig[1] : 0) * 1000));
      for (let a = 0; a < w.count; a++) { const gi = w.first + a, j = d.loss ? d.loss.jOf[a] : -1; if (d.alt || (j >= 0)) { mix(Math.round(s[gi * 4] * 100)); mix(Math.round(s[gi * 4 + 1] * 100)); } if (j >= 0) mix(this.w.sold1[gi * 4] < FALL_NEVER / 2 ? 1 : 2); }
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  stateHash(tMin) { return hashState(this.cache.at(tMin * 60)); }
  header() { return this.cache.header(); }
  // unit centre at the current frame, with its formation extents, for the overlay
  footprint(i, out) { const c = Math.cos(this.ch[i]), s = Math.sin(this.ch[i]); out.x = this.cx[i]; out.z = this.cz[i]; out.c = c; out.s = s; out.b = this.bbox[i]; return out; }
}
