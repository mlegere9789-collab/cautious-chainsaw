// INDEPENDENT calculation of the displayed clock, written from the anchors file alone (data-src/time/time_anchors.json).
// It imports NOTHING from src/lib/time: no model, no bridge, no inline build. tests/t0/clock.spec.mjs compares what the running app prints with this.
//
// The rules it implements are the written policy of the anchors file (notice, about_policy, tab_days, solar):
//   * the clock of a tick is the straight line between the two anchors that enclose it (minutes since 1863-07-01 00:00 local mean time);
//   * a UI string is rounded to 5 minutes (Math.round of exact minutes / 5);
//   * the calendar date rolls at midnight; between midnight and civil dawn the day part reads "Night of July 1-2" (a Day tab is a tick range, not a date);
//   * "about " is printed when the uncertainty at the tick is at least approx_sigma_min, or when an anchor that speaks for the tick is not signed.
//     The uncertainty at an anchor tick is that anchor's sigma_min, between two anchors the straight-line mix of the two sigma_min values.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const ANCHORS_FILE = path.join(ROOT, 'data-src', 'time', 'time_anchors.json');

const MONTH = 'July';
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMin = (iso) => {                     // "1863-07-03T15:00" -> minutes since 1863-07-01T00:00 (July only: the battle never leaves July)
  const m = /^1863-07-(\d{2})T(\d{2}):(\d{2})$/.exec(iso);
  if (!m) throw new Error('oracle: unsupported anchor time ' + iso);
  return ((+m[1] - 1) * 24 + +m[2]) * 60 + +m[3];
};
const hhmm = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);

const EXACT = { Contested: 'Contested: first-hand accounts disagree', Estimated: 'Estimated: no source gives this moment a clock time', Documented: 'Documented: a first-hand source gives a clock time' };
const BETWEEN = { Contested: 'Between two anchored times, at least one of them Contested (first-hand accounts disagree)', Estimated: 'Between two anchored times, at least one of them only Estimated', Documented: 'Between two anchored times, both Documented by first-hand sources' };

export function makeOracle(doc = JSON.parse(fs.readFileSync(ANCHORS_FILE, 'utf8'))) {
  const A = doc.anchors.map((a) => ({ tick: a.tick, min: toMin(a.t), sigma: a.sigma_min, state: a.state || 'proposed' }));
  const tickMax = doc.tick_max;
  const approxSigma = doc.approx_sigma_min;
  if (A[0].tick !== 1 || A[A.length - 1].tick !== tickMax) throw new Error('oracle: anchors must run from tick 1 to tick_max');
  const seg = (t) => { let i = 0; while (i < A.length - 2 && A[i + 1].tick <= t) i++; return i; };
  const minutes = (t) => {
    t = Math.min(tickMax, Math.max(1, t));
    const i = seg(t), a = A[i], b = A[i + 1];
    return a.min + ((b.min - a.min) * (t - a.tick)) / (b.tick - a.tick);
  };
  const uncertainty = (t) => {
    t = Math.min(tickMax, Math.max(1, t));
    const i = seg(t), a = A[i], b = A[i + 1];
    if (t === a.tick) return { sigma: a.sigma, ends: [a] };
    if (t === b.tick) return { sigma: b.sigma, ends: [b] };
    const w = (t - a.tick) / (b.tick - a.tick);
    return { sigma: a.sigma * (1 - w) + b.sigma * w, ends: [a, b] };
  };
  const about = (t) => { const u = uncertainty(t); return u.sigma >= approxSigma || u.ends.some((e) => e.state !== 'signed'); };
  const dawnOf = (dayIdx) => { const s = doc.solar['1863-07-' + String(dayIdx + 1).padStart(2, '0')] || doc.solar['1863-07-01']; return hhmm(s.civil_dawn); };
  const clock12 = (h, m) => (h % 12 === 0 ? 12 : h % 12) + ':' + String(m).padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
  /** the parts of the 5-minute-rounded clock of a tick */
  const parts = (t, round = 5) => {
    const m = round ? Math.round(minutes(t) / round) * round : Math.round(minutes(t));
    const dayIdx = Math.floor(m / 1440), mod = m - dayIdx * 1440, date = dayIdx + 1;
    const night = mod < dawnOf(dayIdx) ? `Night of ${MONTH} ${date - 1}-${date}` : null;
    // 1863-07-01 was a Wednesday
    return { m, dayIdx, date, hour: Math.floor(mod / 60), minute: mod % 60, night, weekday: WEEKDAY[(3 + dayIdx) % 7], tm: clock12(Math.floor(mod / 60), mod % 60) };
  };
  const pre = (t) => (about(t) ? 'about ' : '');
  /** every string style of the module, rebuilt here: time "about 3:00 PM" | day "July 3" | date "July 3, 1863" | chip | compat "July 3, about 3:00 PM" | long | aria */
  const fmt = (t, style) => {
    const p = parts(t), tm = pre(t) + p.tm, day = p.night || `${MONTH} ${p.date}`;
    switch (style) {
      case 'time': return tm;
      case 'day': return day;
      case 'date': return day + ', 1863';
      case 'chip': return p.night ? p.night + ', ' + tm : tm;
      case 'compat': return day + ', ' + tm;
      case 'long': return (p.night || p.weekday.slice(0, 3) + ', ' + MONTH + ' ' + p.date) + ' · ' + tm;
      case 'frame': return `Frame ${t} of ${tickMax}`;
      default: throw new Error('oracle: unknown style ' + style);
    }
  };
  /** the tick an "hour" button reaches from tick t: the integer tick whose clock is nearest to clock(t) +- 60 minutes (never a no-op) */
  const hourStep = (t, dir) => {
    const target = minutes(t) + 60 * dir;
    let best = t, bd = Infinity;
    for (let k = 1; k <= tickMax; k++) { const d = Math.abs(minutes(k) - target); if (d < bd) { bd = d; best = k; } }
    return best;
  };
  // how sure the clock is: the straight-line mix of the anchors' uncertainty_min, the weaker adjudicated status of the two anchors (an anchor tick speaks for itself)
  const RANK = { Contested: 0, Estimated: 1, Documented: 2 };
  const B = doc.anchors.map((a) => ({ tick: a.tick, u: a.uncertainty_min, st: a.adj_status }));
  const uncertaintyText = (t) => {
    t = Math.min(tickMax, Math.max(1, t));
    const i = seg(t), a = B[i], b = B[i + 1];
    if (t === a.tick || t === b.tick) { const e = t === a.tick ? a : b; return `give or take ${Math.round(e.u / 5) * 5} minutes. ${EXACT[e.st]}.`; }
    const w = (t - a.tick) / (b.tick - a.tick), u = a.u * (1 - w) + b.u * w, st = RANK[a.st] <= RANK[b.st] ? a.st : b.st;
    return `give or take ${Math.round(u / 5) * 5} minutes. ${BETWEEN[st]}.`;
  };
  /** uncertainty_min at a tick as a number (straight-line mix of the anchors' uncertainty_min) */
  const uncertaintyMin = (t) => {
    t = Math.min(tickMax, Math.max(1, t));
    const i = seg(t), a = B[i], b = B[i + 1];
    if (t === a.tick) return a.u;
    if (t === b.tick) return b.u;
    const w = (t - a.tick) / (b.tick - a.tick);
    return a.u * (1 - w) + b.u * w;
  };
  /** the anchor nearest to a tick, with its label, adjudicated status, time and window */
  const nearestAnchor = (t) => {
    let best = doc.anchors[0];
    for (const a of doc.anchors) if (Math.abs(a.tick - t) < Math.abs(best.tick - t)) best = a;
    return { tick: best.tick, time: best.t.slice(5).replace('T', ' '), status: best.adj_status, label: best.label, window: best.range ? best.range.join('-') : null };
  };
  return { A, tickMax, uncertaintyText, uncertaintyMin, nearestAnchor, minutes, uncertainty, about, parts, fmt, hourStep, tabDays: doc.tab_days, approxSigma, anchorsDoc: doc };
}
