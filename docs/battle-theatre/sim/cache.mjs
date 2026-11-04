// Event-sourced cache with periodic snapshots (PDF D.3.2 item 6, Section T, gate Q12): state(t) = reduce(snapshot<=t, events in (snapshot.t, t]).
// Everything is a pure function of time and the log, so rewinding yields the same world as playing forward. Header holds seed, code version,
// scenario and input hash (T.2). Presence gating (gate Q04): events for a unit outside its presence window are REJECTED and listed.
import { fmix32 } from './rng.mjs';
export const CODE_VERSION = 'bt-sim-0.1';

export function canon(o) { // canonical JSON (sorted keys) for hashing
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
}
export function hashState(s) { const c = canon(s); let h = 0; for (let i = 0; i < c.length; i++) h = fmix32((h ^ c.charCodeAt(i)) >>> 0); return h.toString(16).padStart(8, '0'); }

export class EventCache {
  // reducer(state, event) -> NEW state (never mutate); init() -> initial state; presence: {unitId: {from, to}} in seconds (scenario already applied)
  constructor({ init, reducer, snapshotEvery = 600, seed = 1, scenario = 'default', presence = {} }) {
    this.init = init; this.reducer = reducer; this.every = snapshotEvery; this.seed = seed; this.scenario = scenario; this.presence = presence;
    this.events = []; this.snaps = [{ t: -Infinity, state: init() }]; this.rejected = []; this.dirtyFrom = Infinity; this.n = 0;
  }
  add(ev) {
    const p = ev.unit && this.presence[ev.unit];
    if (p && (ev.t < p.from || (p.to != null && ev.t > p.to))) { this.rejected.push({ ev, reason: 'outside presence window (Q04)' }); return false; }
    ev._i = this.n++; this.events.push(ev); this.dirtyFrom = Math.min(this.dirtyFrom, ev.t); return true;
  }
  _sort() {
    if (this.dirtyFrom < Infinity) {
      this.events.sort((a, b) => a.t - b.t || a._i - b._i);
      this.snaps = this.snaps.filter(s => s.t < this.dirtyFrom); this.dirtyFrom = Infinity;
    }
  }
  _firstAfter(t) { let lo = 0, hi = this.events.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.events[m].t <= t) lo = m + 1; else hi = m; } return lo; }
  build(tEnd) { // only invalidated intervals are rebuilt (T.2)
    this._sort();
    const last = this.snaps[this.snaps.length - 1]; let state = last.state, idx = this._firstAfter(last.t);
    let next = last.t === -Infinity ? Math.floor((this.events[0]?.t ?? 0) / this.every) * this.every : last.t + this.every;
    while (next <= tEnd) {
      while (idx < this.events.length && this.events[idx].t <= next) state = this.reducer(state, this.events[idx++]);
      this.snaps.push({ t: next, state }); next += this.every;
    }
  }
  at(t) {
    this._sort();
    let s = this.snaps[0]; for (let i = this.snaps.length - 1; i >= 0; i--) if (this.snaps[i].t <= t) { s = this.snaps[i]; break; }
    let state = s.state; for (let i = this._firstAfter(s.t); i < this.events.length && this.events[i].t <= t; i++) state = this.reducer(state, this.events[i]);
    return state;
  }
  header() { this._sort(); return { seed: this.seed, code: CODE_VERSION, scenario: this.scenario, inputHash: hashState(this.events.map(({ _i, ...e }) => e)), snapshotEvery: this.every, events: this.events.length, rejected: this.rejected.length }; }
}
// gate Q12: random-access seeks equal sequential playback; backward == forward
export function scrubTest(cache, tMin, tMax, n = 100, rnd = Math.random) {
  cache.build(tMax); cache._sort();
  const times = Array.from({ length: n }, () => tMin + (tMax - tMin) * rnd());
  let state = cache.init(), idx = 0; const seqHash = new Map();
  for (const t of [...times].sort((a, b) => a - b)) { while (idx < cache.events.length && cache.events[idx].t <= t) state = cache.reducer(state, cache.events[idx++]); seqHash.set(t, hashState(state)); }
  const bad = times.filter(t => hashState(cache.at(t)) !== seqHash.get(t));
  return { n, mismatches: bad };
}
