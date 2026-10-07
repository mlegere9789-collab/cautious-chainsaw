// interp/production.mjs - the SHIPPED animation semantics, reproduced as a motion model so that the Studio can replay the same ticks the way production draws them ("before").
//
// Source: the production bundle's y1 / F4 / z4 (docs/pitch/anim/01-current-tiles-jitter.md, section 5; byte-identical in baseline/dist and release/R1c/dist), transcribed in the test replica
// docs/pitch/anim/05-proto/test/legacy-replica.mjs and validated frame for frame against the real page in report 01 (0 differences in 1,337 frames).  What it does, and nothing else:
//
//   * a unit exists from its first keyframe on and then holds its last keyframe (carry-forward);
//   * it is interpolated ONLY between two keyframes on ADJACENT ticks f and f+1 (93 of 1,209 keyframe pairs, 7.7 %); every other pair is hold, then jump when the next tick starts;
//   * the interpolation is eased PER TICK with the easing of the NEXT keyframe's disposition (Charging Line x*x, Chaotic Retreat 1-(1-x)^2, Line of March linear, others in-out quad), so a
//     marching unit stops at every tick end; lat/lng blend with the eased value, strength blends LINEARLY and is rounded (a number that is not in the data), bearing takes the short arc;
//   * a pair further apart than 0.05 degrees (sum of |dlat| + |dlng|) is not blended: the whole record switches at x = 0.5;
//   * a unit whose first keyframe is on tick f+1 is pushed in when x >= 0.5 of tick f, i.e. half a tick early.
//
// It is meant to be driven by the production clock (time.model = 'production'), which hands over tau = (the tick read at the START of the frame) + (the fraction of the current tick): on the
// frame in which the tick advances, that is the OLD tick with the NEW fraction, so an interpolating unit is drawn back near the start of the segment it just finished for one frame, and a
// unit that was pushed in half a tick early is absent for one frame.  Those are the shipped bugs (report 01, 6.3 and 6.4); this module keeps them on purpose and says so.
// It is registered but hidden from the Tuning Studio's lists: it is a reference to compare against, not a design.
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const EASE = { 'Charging Line': (x) => x * x, 'Chaotic Retreat': (x) => 1 - (1 - x) * (1 - x), 'Line of March': (x) => x };
const easeFor = (disp) => EASE[disp] || easeInOut;
const arc = (a, b, x) => { let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360; return (a + d * x + 360) % 360; };

export class ProductionTrack {
  /** kfs: [[tick, lat, lng], ...] (strictly increasing ticks);  full: the unit's keyframe records [{tick, lat, lng, strength, bearing, disposition}] in the same order */
  constructor(kfs, full) {
    this.n = kfs.length; this.T = kfs.map((k) => k[0]); this.K = full;
    this.appearTau = this.T[0] - 1;           // a coarse lower bound for the resolver's pre-filter (presence itself is decided in at())
  }
  get firstTick() { return this.T[0]; }
  get lastTick() { return this.T[this.n - 1]; }
  at(tau, out) {
    const T = this.T; const n = this.n; const f = Math.floor(tau); const x = tau - f;
    let i = -1; { let lo = 0; let hi = n - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (T[mid] <= f) { i = mid; lo = mid + 1; } else hi = mid - 1; } }   // latest keyframe at or before f
    out.vLat = 0; out.vLng = 0; out.s = 0; out.moving = false; out.ov = true;
    if (i < 0) {                                                                // no record yet: pushed in half a tick early
      if (T[0] === f + 1 && x >= 0.5) { const k = this.K[0]; out.present = true; out.seg = 0; out.lat = k.lat; out.lng = k.lng; out.strength = k.strength; out.bearing = k.bearing; out.disposition = k.disposition; return out; }
      out.present = false; out.seg = 0; out.lat = this.K[0].lat; out.lng = this.K[0].lng; out.strength = this.K[0].strength; out.bearing = this.K[0].bearing; out.disposition = this.K[0].disposition; return out;
    }
    const a = this.K[i]; out.present = true; out.seg = i;
    const hasM = T[i] === f; const hasP = i + 1 < n && T[i + 1] === f + 1;
    if (!(x > 0) || !hasM || !hasP) { out.lat = a.lat; out.lng = a.lng; out.strength = a.strength; out.bearing = a.bearing; out.disposition = a.disposition; return out; }
    const b = this.K[i + 1]; const changed = a.disposition !== b.disposition;
    if (Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng) > 0.05) { const r = x < 0.5 ? a : b; out.lat = r.lat; out.lng = r.lng; out.strength = r.strength; out.bearing = r.bearing; out.disposition = r.disposition; return out; }
    const z = easeFor(changed ? b.disposition : a.disposition)(x);
    out.lat = a.lat + (b.lat - a.lat) * z; out.lng = a.lng + (b.lng - a.lng) * z; out.bearing = arc(a.bearing || 0, b.bearing || 0, z);
    out.strength = Math.round((a.strength || 0) + ((b.strength || 0) - (a.strength || 0)) * x);
    out.disposition = changed && x >= 0.5 ? b.disposition : a.disposition; out.moving = true;
    return out;
  }
}
