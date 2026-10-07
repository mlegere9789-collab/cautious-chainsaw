// time/clock.mjs - tick -> clock label, from the CANDIDATE anchors (data-src/time/time_anchors.json: 33 anchors, ALL "proposed", not reviewed by a historian,
// not approved by the owner).  Piecewise-linear and strictly monotone through the anchors, as the site's own time module (src/lib/time/core.js) defines it;
// this is a small independent re-implementation for the Studio (the product module is not touched).  Everything it returns carries its evidence label:
//
//   evidence 'Modelled'   a clock time is an interpolation between anchors; between two anchors it is a model, at an anchor it is the anchor's own claim
//   candidate true        the anchor set is unsigned: the Studio always shows "candidate clock" beside a time, never a bare "3:35 PM"
//   sigma                 minutes of uncertainty, interpolated from the anchors' own sigma_min (a stated estimate of the data authors, not a measurement)
//
// The Studio shows the TICK first (the site's stable key) and the clock second.

const ISO = /^1863-07-(\d{2})T(\d{2}):(\d{2})$/;
const two = (n) => (n < 10 ? '0' : '') + n;

export function parseLocal(s) {
  const m = ISO.exec(s); if (!m) throw new RangeError('anchor time must look like 1863-07-DDThh:mm, got ' + s);
  const d = +m[1]; const h = +m[2]; const mi = +m[3];
  if (d < 1 || d > 31 || h > 23 || mi > 59) throw new RangeError('bad anchor time ' + s);
  return (d - 1) * 1440 + h * 60 + mi;            // minutes since 1863-07-01T00:00 local mean time
}

export function createClock(doc) {
  const A = doc.anchors.map((a) => ({ ...a, min: parseLocal(a.t) }));
  if (A.length < 2) throw new Error('need at least two anchors');
  for (let i = 1; i < A.length; i++) if (!(A[i].tick > A[i - 1].tick && A[i].min > A[i - 1].min)) throw new Error(`anchors must be strictly increasing in tick and time (tick ${A[i].tick})`);
  const tickMax = doc.tickMax; if (A[0].tick !== 1 || A[A.length - 1].tick !== tickMax) throw new Error('anchors must run from tick 1 to tickMax');
  const seg = (tick) => { let lo = 0; let hi = A.length - 2; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (A[mid].tick <= tick) lo = mid; else hi = mid - 1; } return lo; };
  const clampT = (t) => (t < 1 ? 1 : t > tickMax ? tickMax : t);
  const lerp = (k, tick, key) => A[k][key] + (A[k + 1][key] - A[k][key]) * (tick - A[k].tick) / (A[k + 1].tick - A[k].tick);
  const MONTH_DAY = (min) => 'July ' + (1 + Math.floor(min / 1440));
  const hm12 = (h, mi) => (h % 12 === 0 ? 12 : h % 12) + ':' + two(mi) + (h >= 12 ? ' PM' : ' AM');

  return {
    anchors: A, tickMax, release: doc.release, notice: doc.notice, tz: doc.tz,
    /** minutes since 1863-07-01T00:00 LMT at a (fractional) tick */
    minutesAt(tick) { const t = clampT(tick); return lerp(seg(t), t, 'min'); },
    /** model minutes per tick at tick (the slope of the segment) */
    minutesPerTick(tick) { const k = seg(clampT(tick)); return (A[k + 1].min - A[k].min) / (A[k + 1].tick - A[k].tick); },
    sigmaAt(tick) { const t = clampT(tick); return lerp(seg(t), t, 'sigma'); },
    /** the nearest anchor and how far away it is in ticks */
    nearestAnchor(tick) { const t = clampT(tick); let best = A[0]; for (const a of A) if (Math.abs(a.tick - t) < Math.abs(best.tick - t)) best = a; return { anchor: best, dTicks: Math.abs(best.tick - t) }; },
    /** everything the UI needs for one tick; text is rounded to 5 minutes (internals stay exact) */
    describe(tick) {
      const t = clampT(tick); const min = this.minutesAt(t); const r = Math.round(min / 5) * 5;
      const day = Math.floor(r / 1440); const inDay = r - day * 1440; const h = Math.floor(inDay / 60); const mi = inDay % 60;
      const sigma = Math.round(this.sigmaAt(t));
      const na = this.nearestAnchor(t);
      return {
        tick: t, text: hm12(h, mi), date: MONTH_DAY(r), day: day + 1, sigmaMin: sigma, lmt: true,
        evidence: 'Modelled', candidate: true, state: 'proposed',
        label: `${MONTH_DAY(r)}, about ${hm12(h, mi)} (±${sigma} min)`,
        badge: 'Modelled · candidate clock, not reviewed',
        nearest: { tick: na.anchor.tick, label: na.anchor.label, status: na.anchor.effective || na.anchor.status, dTicks: na.dTicks },
      };
    },
    /** day tab (1..3) of a tick, by the site's three tick ranges */
    dayOf(tick) { const t = Math.round(clampT(tick)); const i = doc.tabDays.findIndex(([a, b]) => t >= a && t <= b); return i < 0 ? 1 : i + 1; },
  };
}
