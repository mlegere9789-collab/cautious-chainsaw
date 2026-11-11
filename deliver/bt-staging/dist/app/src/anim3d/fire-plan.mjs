// FirePlan: the analytic schedule of a unit's shots, a PURE function of (plan, figure, shot index). No state, no clock, no Math.random: the variation comes from the integer hash of the sim's counter RNG
// (sim/rng.mjs: hash4(seed, figure, bucket, stream)), so shot times can be enumerated for any window in any order (scrubbing, gate G16 / Q12) and are identical on every machine.
//
// Boundaries of the figure i's cycle k:  b(i,k) = t0(i) + k * C(i) + j(i,k)  where
//   C(i)   = C * (1 + d_i)       a per-figure pace difference (|d_i| <= paceSpread), so a ragged volley loosens into continuous fire with time;
//   j(i,k) = a bounded jitter    (|j| <= min(0.15 C, (C - floor)/2): the cycle can never be shorter than the loading floor);
//   t0(i)  = the start offset of the mode: volley (company, battalion, wing), file, rank, squad, at will, skirmish.
// The shot of cycle k is at  b(i,k) + fireAt  (fireAt = the Aim, pause and 0.12 s into Fire, see musketry.mjs); the cycle's clip starts at b(i,k) on the READY position.
//
// Modes and their structure (documented: drill_infantry.json, drill_hardee.json):
//   volley / company / battalion: all men Ready-Aim-Fire on the command; "company" and "battalion" fire together (INF-COY-01, INF-BN-04), "wing": the wings alternate (INF-BN-03),
//   file:  the right-hand file begins, each next file aims when its neighbour lowers its piece (INF-FILE-01..03, HAR-S31),  rank: the rear rank first, the ranks alternate (INF-RANK-01..03, HAR-S32),
//   at_will / skirmish: each man loads and fires without regulating on his neighbour (INF-LAW-01..03, INF-SKIRM-03).
// The intervals between files and the spread of a ragged volley are plausible-procedural ranges (drill-tables.mjs FILE_FIRE, REACTION_S).
import { hash4, strId } from '../../../sim/rng.mjs';
import { cycleDurations, MIN_EXEMPT_S_PER_UNIT } from './musketry.mjs';
import { FILE_FIRE, REACTION_S } from './drill-tables.mjs';

const U = 4294967296;
const rnd = (seed, a, b, c) => hash4(seed >>> 0, a >>> 0, b >>> 0, c >>> 0) / U;
// hash4(seed, uid, a, 7) of sim/rng.mjs with the four fmix32 rounds written out in one function (no inner call, int32 arithmetic only); the result is left in JV[0]. Equal to hash4 for every argument (tested).
const JV = new Uint32Array(1);
function jitHash(seed, uid, a) {
  let h = (seed >>> 0) ^ 0x9e3779b9; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; h >>>= 0;
  h = ((h ^ (uid >>> 0)) + 0x7f4a7c15) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; h >>>= 0;
  h = ((h ^ (a >>> 0)) + 0x94d049bb) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; h >>>= 0;
  h = ((h ^ 7) + 0xbf58476d) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; JV[0] = h;
}
export function jitHashForTest(seed, uid, a) { jitHash(seed | 0, uid | 0, a); return JV[0]; }
export const MODES = ['volley', 'battalion', 'company', 'wing', 'file', 'rank', 'squad', 'at_will', 'skirmish', 'by_piece', 'battery_fire'];
const PAUSE_S = 0.6, FIRE_OFFSET_S = 0.12;

export class FirePlan {
  // opts: { unitId, n, seed, mode, startS, endS, cycleS: {min, max}, files, ranks, companies, weapon: 'long_arm'|..., paceSpread, firstShotSpreadS, cease: bool, tier }
  static create(o) { return new FirePlan(o); }
  constructor(o) {
    this.unitId = o.unitId ?? ''; this.n = o.n | 0; this.seed = (o.seed ?? 1863) >>> 0; this.mode = o.mode || 'at_will'; if (!MODES.includes(this.mode)) throw new Error('FirePlan: unknown mode ' + this.mode);
    this.startS = o.startS; this.endS = o.endS ?? Infinity; this.uid = strId(this.unitId); this.weapon = o.weapon || 'long_arm';
    const cs = o.cycleS || { min: 20, max: 30 }; this.cycleMin = cs.min; this.cycleMax = cs.max; this.basis = cs.basis || ''; this.tier = o.tier || 'inferred';
    this.files = o.files || Math.max(1, Math.ceil(this.n / (o.ranks || 2))); this.ranks = o.ranks || 2; this.companies = o.companies || 10;
    this.paceSpread = o.paceSpread ?? 0.06; this.firstSpread = o.firstShotSpreadS ?? 0.35;
    this.floor = this.weapon === 'cannon' ? 0.6 * this.cycleMin : cycleDurations(0, PAUSE_S).floor;                       // loading floor for muzzle-loaders
    this.breech = this.weapon !== 'long_arm' && this.weapon !== 'cannon';        // carbines, repeaters and revolvers have no nine-time loading: their cycle is the plan's seconds per round, no floor
    this.fireAtFrac = o.fireAtFrac ?? null;                                         // guns: the Fire step lies at a fraction of the cycle (see clips-artillery.mjs gunSegments)
    this.fireAt = this.breech ? 0.2 : 0.12 + 0.667 + PAUSE_S;                    // aim (1 motion) + pause + 0.12 s into Fire
    this.figOff = new Float64Array(this.n); this.figPace = new Float64Array(this.n); this.fa = new Float64Array(this.n);
    this.kmaxA = new Float64Array(this.n).fill(NaN); this.cycleBase = new Float64Array(this.n); this.slack = new Float64Array(this.n); // seconds per round of figure i (inside the declared range, spread by the hash); jitter bound
    for (let i = 0; i < this.n; i++) {
      const r = rnd(this.seed, this.uid, i, 1), cyc = this.cycleMin + (this.cycleMax - this.cycleMin) * r; // each man's own pace inside the declared range
      const d = (rnd(this.seed, this.uid, i, 2) * 2 - 1) * this.paceSpread; this.figPace[i] = d;
      const C = Math.max(this.breech ? 0.5 : this.floor, cyc * (1 + d)); this.cycleBase[i] = C;
      this.fa[i] = this.fireAtFrac != null ? this.fireAtFrac * C : this.fireAt; this.slack[i] = this.breech ? 0.15 * C : Math.min(0.15 * C, Math.max(0, (C - this.floor) / 2)); this.figOff[i] = this._offset(i, C);
    }
  }
  // start offset of figure i's cycle 0 boundary relative to startS (seconds)
  _offset(i, C) {
    const f = i % this.files, rank = Math.floor(i / this.files), react = REACTION_S.min + (REACTION_S.max - REACTION_S.min) * rnd(this.seed, this.uid, i, 3);
    const aimToFire = this.fa[i];                                   // so that the FIRST SHOT lands on the mode's schedule: boundary = shotTime - fireAt
    const spread = (rnd(this.seed, this.uid, i, 4) * 2 - 1) * this.firstSpread;
    let shot0;
    switch (this.mode) {
      case 'volley': case 'battalion': case 'company': shot0 = 3.0 + react * 0.5 + spread; break;                       // Ready-Aim-Fire on the command, a ragged first volley
      case 'wing': shot0 = 3.0 + react * 0.5 + spread + ((f * 2 >= this.files) ? C / 2 : 0); break;              // the wings alternate
      case 'rank': shot0 = 3.0 + react * 0.5 + spread + (rank === 0 ? C / 2 : 0); break;                          // rear rank (index 1) first, front rank (index 0) half a cycle later
      case 'file': { const step = FILE_FIRE.startInterval_s[0] + (FILE_FIRE.startInterval_s[1] - FILE_FIRE.startInterval_s[0]) * rnd(this.seed, this.uid, 0, 5); const fc = Math.max(1, Math.ceil(this.files / this.companies)); shot0 = 3.0 + (f % fc) * step + spread * 0.3; break; }   // the ripple runs from the right of each company (battalion fire by file: "begins on the right of each company", HAR-B05) // from the right, each file in turn
      case 'squad': shot0 = 3.0 + react * 0.5 + spread * 0.5; break;
      default: shot0 = rnd(this.seed, this.uid, i, 6) * C + 1.0; break;                                           // at will, skirmish: independent
    }
    return shot0 - aimToFire;
  }
  jitter(i, k) { return (rnd(this.seed, this.uid, i * 8192 + (k & 8191), 7) * 2 - 1) * this.slack[i]; }
  // boundary (start of cycle k on the READY position) of figure i; k >= 0
  boundary(i, k) { return this.startS + this.figOff[i] + k * this.cycleBase[i] + (k === 0 ? 0 : this.jitter(i, k)); }
  shotTime(i, k) { return this.boundary(i, k) + this.fa[i]; }
  // number of cycles figure i has started by time t (-1 before cycle 0), limited by the plan's end: no cycle starts whose shot would be after endS
  lastCycle(i) { if (this.endS === Infinity) return Infinity; const C = this.cycleBase[i]; let k = Math.floor((this.endS - this.fa[i] - this.startS - this.figOff[i]) / C); while (k >= 0 && this.shotTime(i, k) >= this.endS) k--; while (this.shotTime(i, k + 1) < this.endS) k++; return k; }
  cycleIndexAt(i, t) { // the cycle k with boundary(i,k) <= t < boundary(i,k+1); -1 before the first boundary
    const C = this.cycleBase[i], x = t - this.startS - this.figOff[i]; if (x < 0) return -1;
    let k = Math.floor(x / C); const kmax = this.lastCycle(i); if (k > kmax) k = kmax;
    while (k > 0 && this.boundary(i, k) > t) k--; while (k < kmax && this.boundary(i, k + 1) <= t) k++; return k;
  }
  // allocation-free lookup for the animator (arithmetic and the jitter hash inlined, results written to a Float64Array, so no double crosses a call boundary and nothing is boxed whatever V8 inlines):
  // dst[0] = the cycle index at t (-1 before the first boundary), dst[1] = its boundary, dst[2] = its length, dst[3] = the last cycle (Infinity without an end). Equal to cycleIndexAt / boundary / cycleLength / lastCycle (tested).
  locate(i, t, dst) {
    let km = this.kmaxA[i]; if (km !== km) { km = this.lastCycle(i); this.kmaxA[i] = km; }
    const C = this.cycleBase[i], fo = this.figOff[i], ps = this.startS, sl = this.slack[i], seed = this.seed | 0, uid = this.uid | 0, x = t - ps - fo, i8 = i * 8192; dst[3] = km;
    if (x < 0) { dst[0] = -1; dst[1] = ps + fo; dst[2] = C; return dst; }
    let k = Math.floor(x / C); if (k > km) k = km;
    for (; k > 0; k--) { jitHash(seed, uid, i8 + (k & 8191)); if (ps + fo + k * C + (JV[0] / U * 2 - 1) * sl <= t) break; }
    for (; k < km; k++) { jitHash(seed, uid, i8 + ((k + 1) & 8191)); if (ps + fo + (k + 1) * C + (JV[0] / U * 2 - 1) * sl > t) break; }
    let b0 = ps + fo + k * C; if (k > 0) { jitHash(seed, uid, i8 + (k & 8191)); b0 += (JV[0] / U * 2 - 1) * sl; }
    jitHash(seed, uid, i8 + ((k + 1) & 8191)); dst[0] = k; dst[1] = b0; dst[2] = ps + fo + (k + 1) * C + (JV[0] / U * 2 - 1) * sl - b0; return dst;
  }
  // cycle length and the shot offset of cycle k of figure i (the clip is time-warped so that its Fire lands on shotTime)
  cycleLength(i, k) { return this.boundary(i, k + 1) - this.boundary(i, k); }
  // enumerate the shots with t0 <= t < t1: cb(figureIdx, t, k, ranksBack). Cost: a few arithmetic operations per figure plus one hash per candidate shot (the jitter is bounded by slack).
  shotsBetween(t0, t1, cb) {
    if (t1 <= this.startS) return 0; let count = 0; const n = this.n, ps = this.startS, files = this.files;
    for (let i = 0; i < n; i++) {
      const C = this.cycleBase[i], base = ps + this.figOff[i] + this.fa[i], sl = this.slack[i];
      let k = Math.ceil((t0 - sl - base) / C); if (k < 0) k = 0; const kEnd = Math.floor((t1 + sl - base) / C); if (kEnd < k) continue;
      const kmax = this.lastCycle(i); const rb = Math.floor(i / files) > 0 ? 1 : 0;
      for (; k <= kEnd && k <= kmax; k++) { const ts = this.shotTime(i, k); if (ts >= t0 && ts < t1) { cb(i, ts, k, rb); count++; } }
    }
    return count;
  }
  firstShotIndexAfter(i, t) { let k = Math.max(0, Math.floor((t - this.startS - this.figOff[i] - this.fa[i]) / this.cycleBase[i]) - 1); while (this.shotTime(i, k) < t) k++; return k; }
  describe() { return { mode: this.mode, n: this.n, cycleS: [this.cycleMin, this.cycleMax], floor: this.floor, tier: this.tier, basis: this.basis, endS: this.endS }; }
}
export { PAUSE_S, FIRE_OFFSET_S, MIN_EXEMPT_S_PER_UNIT };
