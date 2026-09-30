// Canonical tick <-> clock model, lean runtime core.  CANDIDATE (WP-TIME-02): nothing here ships until the owner and the
// historian approve the anchors (D-TIME, docs/editorial/README.md).
//
// Invariants (chapter 04 section 4.1):
//   1. Ticks 1..tick_max are permanent, opaque frame ids; only the derived clock changes.
//   2. The clock is a strictly monotone piecewise-linear function of the tick, defined ONLY by the anchors.
//   3. The calendar date derives from absolute minutes and rolls at midnight. The Day tab is a tick range and is never a date.
//   4. Every displayed time carries uncertainty; UI rounds to 5 minutes, internals stay exact.
//
// Zero dependencies. No Date, no Intl, no locale, no time zone: minutes since 1863-07-01T00:00 local mean time (LMT).
// This file has no imports so tools/time/build.mjs can inline it (with bridge.js) as a small classic-script global.
// Tooling and rich objects (tickToClock, golden tables, URL parsing) live in extras.js; model.js composes both.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ABOUT = 'about ';

// Howard Hinnant's civil-date algorithms (proleptic Gregorian, days relative to 1970-01-01).
function daysFromCivil(y, m, d) {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}
function civilFromDays(z) {
  z += 719468;
  const era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const m = mp < 10 ? mp + 3 : mp - 9;
  return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, doy - Math.floor((153 * mp + 2) / 5) + 1];
}
const EPOCH_DAYS = daysFromCivil(1863, 7, 1);
const two = (n) => (n < 10 ? '0' : '') + n;
const hm12 = (h, mi) => (h % 12 === 0 ? 12 : h % 12) + ':' + two(mi) + (h >= 12 ? ' PM' : ' AM');
const hmMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);

/** "1863-07-03T15:00" -> minutes since 1863-07-01T00:00 local mean time (no zone or DST arithmetic). Throws on bad input. */
export function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31 || +m[4] > 23 || +m[5] > 59) throw new Error('bad local time ' + s);
  return (daysFromCivil(+m[1], +m[2], +m[3]) - EPOCH_DAYS) * 1440 + +m[4] * 60 + +m[5];
}

/**
 * Build the lean model from a time_anchors document (data-src/time/time_anchors.schema.json). Per anchor only tick, t, sigma_min and
 * status are needed; state (default "proposed") and review_flag are read when present. Throws Error on an invalid anchor set
 * (first tick 1, last tick = tick_max, strictly increasing in tick AND minutes); the full rule set, reported instead of thrown,
 * is validateAnchors() in anchors.js.
 */
export function makeCore(doc) {
  const raw = doc.anchors;
  if (!raw || raw.length < 2) throw new Error('need at least two anchors');
  const approxSigma = doc.approx_sigma_min || 10;
  const A = raw.map((a, i) => {
    if (!Number.isInteger(a.tick)) throw new Error('anchor tick must be an integer (index ' + i + ')');
    return { tick: a.tick, min: parseLocal(a.t), sigma: a.sigma_min == null ? 15 : a.sigma_min, status: a.status || 'M', cls: a.confidence || { S: 'A', M: 'B', R: 'C', D: 'D' }[a.status] || 'B', state: a.state || 'proposed', review: a.review_flag || 'none' };
  });
  const nA = A.length, tickMax = A[nA - 1].tick;
  A.forEach((a, i) => { if (i && !(a.tick > A[i - 1].tick && a.min > A[i - 1].min)) throw new Error('anchors must be strictly increasing in tick AND time (index ' + i + ', tick ' + a.tick + ')'); });
  if (A[0].tick !== 1) throw new Error('first anchor must be tick 1');
  if (doc.tick_max && doc.tick_max !== tickMax) throw new Error('last anchor must be tick_max (' + doc.tick_max + ')');
  const tabDays = doc.tab_days || [[1, tickMax]], gaps = doc.gaps || [], solarDoc = doc.solar || {};

  const clamp = (t) => (t < 1 ? 1 : t > tickMax ? tickMax : t);
  const seg = (v, key) => { let lo = 0, hi = nA - 2; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (A[mid][key] <= v) lo = mid; else hi = mid - 1; } return lo; };
  const lerp = (i, t) => A[i].min + (A[i + 1].min - A[i].min) * (t - A[i].tick) / (A[i + 1].tick - A[i].tick);

  // exact minutes for every integer tick (float64: the inverse must round-trip exactly)
  const MIN = new Float64Array(tickMax + 1);
  for (let t = 1; t <= tickMax; t++) MIN[t] = lerp(seg(t, 'tick'), t);

  const tickToMinutes = (tick) => { const t = clamp(tick); return t === (t | 0) ? MIN[t] : lerp(seg(t, 'tick'), t); };
  /** minutes -> fractional tick. Clamps to 1..tickMax unless opts.extrapolate (5 min/tick beyond the ends: validation only). */
  const minutesToTick = (min, opts) => {
    const x = opts && opts.extrapolate;
    if (min <= A[0].min) return x ? 1 + (min - A[0].min) / 5 : 1;
    if (min >= A[nA - 1].min) return x ? tickMax + (min - A[nA - 1].min) / 5 : tickMax;
    const i = seg(min, 'min');
    return A[i].tick + (A[i + 1].tick - A[i].tick) * (min - A[i].min) / (A[i + 1].min - A[i].min);
  };
  const minutesPerTick = (tick) => { const i = seg(clamp(tick), 'tick'); return (A[i + 1].min - A[i].min) / (A[i + 1].tick - A[i].tick); };
  const tabDay = (tick) => { const t = Math.floor(clamp(tick)); for (let d = 0; d < tabDays.length; d++) if (t <= tabDays[d][1]) return d + 1; return tabDays.length; };
  const tabStart = (day) => (tabDays[day - 1] || tabDays[0])[0];

  // sigma and the anchors that speak for a tick: an exact anchor speaks for itself, otherwise both bounding anchors count
  const basis = (tick) => {
    const t = clamp(tick), i = seg(t, 'tick'), a = A[i], b = A[i + 1];
    if (t === a.tick) return { sigma: a.sigma, ends: [a] };
    if (t === b.tick) return { sigma: b.sigma, ends: [b] };
    const w = (t - a.tick) / (b.tick - a.tick);
    return { sigma: a.sigma * (1 - w) + b.sigma * w, ends: [a, b] };
  };
  const uncertaintyMin = (tick) => basis(tick).sigma;
  const isApprox = (tick) => { const b = basis(tick); return b.sigma >= approxSigma || b.ends.some((e) => e.state !== 'signed'); };

  // solar table (local mean time) -> day parts
  const solarAt = (dayIdx) => {
    const s = solarDoc['1863-07-' + two(1 + dayIdx)] || solarDoc['1863-07-01'] || { civil_dawn: '04:03', sunrise: '04:35', sunset: '19:32', civil_dusk: '20:04', nautical_dusk: '20:46' };
    return { dawn: hmMin(s.civil_dawn), rise: hmMin(s.sunrise), set: hmMin(s.sunset), naut: hmMin(s.nautical_dusk) };
  };
  const phaseOf = (mod, dayIdx) => {
    const s = solarAt(dayIdx);
    return mod < s.dawn ? 'night' : mod < s.rise + 60 ? 'dawn' : mod < 720 ? 'morning' : mod < s.set - 120 ? 'afternoon' : mod < s.set ? 'evening' : mod < s.naut ? 'dusk' : 'night';
  };
  const parts = (tick, roundMin) => {
    let m = tickToMinutes(tick);
    m = roundMin ? Math.round(m / roundMin) * roundMin : Math.round(m);
    const dayIdx = Math.floor(m / 1440), mod = m - dayIdx * 1440, ymd = civilFromDays(EPOCH_DAYS + dayIdx);
    let nightOf = null;
    if (mod < solarAt(dayIdx).dawn) { // after midnight and before civil dawn: "Night of July 1-2"
      const pv = civilFromDays(EPOCH_DAYS + dayIdx - 1);
      nightOf = 'Night of ' + MONTHS[pv[1] - 1] + ' ' + pv[2] + '-' + (pv[1] === ymd[1] ? '' : MONTHS[ymd[1] - 1] + ' ') + ymd[2];
    }
    return { year: ymd[0], monthNum: ymd[1], month: MONTHS[ymd[1] - 1], date: ymd[2], weekday: WEEKDAYS[(((EPOCH_DAYS + dayIdx + 4) % 7) + 7) % 7], hour24: Math.floor(mod / 60), minute: mod % 60, dayIdx, minutes: m, mod, nightOf, phase: phaseOf(mod, dayIdx) };
  };
  const dayLabelOf = (p) => p.nightOf || p.month + ' ' + p.date;
  const isoOf = (p) => p.year + '-' + two(p.monthNum) + '-' + two(p.date) + 'T' + two(p.hour24) + ':' + two(p.minute);

  const memo = new Map();
  /**
   * format(tick, style, {roundMin, approx}); approx: false (default) | true | 'auto' (prefix "about " when the clock is approximate).
   * styles: time "7:30 AM" | day "July 1" | date "July 1, 1863" | long "Wed, July 1 · 7:30 AM" | short "Jul 1, 7:30 AM"
   *         | compat "July 1, 7:30 AM" (legacy shape: comma-splittable, no year) | chip "7:30 AM" | iso | aria | frame
   * After midnight and before civil dawn the date part reads "Night of July 1-2" (a tab is not a date).
   */
  const format = (tick, style, opts) => {
    style = style || 'long';
    const roundMin = (opts && opts.roundMin) || 0, ap = opts ? opts.approx : false;
    const t = clamp(tick), key = t === (t | 0) ? t + '|' + style + '|' + roundMin + '|' + ap : null;
    if (key && memo.has(key)) return memo.get(key);
    const p = parts(t, roundMin), pre = ap === true || (ap === 'auto' && isApprox(t)) ? ABOUT : '';
    const tm = pre + hm12(p.hour24, p.minute), night = p.nightOf, day = dayLabelOf(p);
    let out;
    switch (style) {
      case 'time': out = tm; break;
      case 'day': out = day; break;
      case 'date': out = day + ', ' + p.year; break;
      case 'iso': out = isoOf(p); break;
      case 'chip': out = night ? night + ', ' + tm : tm; break;
      case 'compat': out = day + ', ' + tm; break;
      case 'short': out = (night ? night.replace(/[A-Za-z]+(?= \d)/g, (w) => w.slice(0, 3)) : p.month.slice(0, 3) + ' ' + p.date) + ', ' + tm; break;
      case 'aria': out = pre + hm12(p.hour24, p.minute).replace(':00 ', ' ') + (night ? ' on the ' + night.charAt(0).toLowerCase() + night.slice(1) : ' on ' + p.weekday + ', ' + p.month + ' ' + p.date) + ', ' + p.year; break;
      case 'frame': out = 'Frame ' + Math.round(t) + ' of ' + tickMax; break;
      default: out = (night || p.weekday.slice(0, 3) + ', ' + p.month + ' ' + p.date) + ' · ' + tm; // 'long'
    }
    if (key) memo.set(key, out);
    return out;
  };
  /** UI label: 5-minute rounding and "about" per the clock's own uncertainty, unless overridden by opts {style, roundMin, approx}. */
  const tickToLabel = (tick, opts) => {
    const o = opts || {};
    return format(tick, o.style || 'long', { roundMin: o.roundMin == null ? 5 : o.roundMin, approx: o.approx == null ? 'auto' : o.approx });
  };
  const gapAt = (tick) => { const t = clamp(tick); for (const g of gaps) if (t >= g.from && t < g.to) return g; return null; };
  /** Move by real minutes. Integer result, clamped; never a no-op for |dm| >= half a segment (except at the ends). */
  const tickAfterMinutes = (tick, dm) => {
    const t = clamp(tick);
    let r = Math.round(minutesToTick(tickToMinutes(t) + dm));
    if (dm !== 0 && r === Math.round(t) && Math.abs(dm) >= minutesPerTick(dm > 0 ? t : t - 1e-9) / 2) r += dm > 0 ? 1 : -1;
    return clamp(r);
  };

  return {
    version: doc.version || '', dv: doc.dv || 2, release: doc.release || 'candidate', tickMax, tabDays, gaps, approxSigmaMin: approxSigma,
    tickToMinutes, minutesToTick, minutesPerTick, uncertaintyMin, tabDay, tabStart, parts, format, tickToLabel, isApprox, gapAt, tickAfterMinutes,
    dayPart: (t) => parts(t, 0).phase,
    /** decimal hour of day (0..24, local mean time, exact): for lighting and atmosphere code */
    hour: (t) => { const m = tickToMinutes(t); return (m - Math.floor(m / 1440) * 1440) / 60; },
    _: { A, basis, clamp, dayLabelOf, isoOf, hm12, seg },
  };
}
