// Rich objects and tooling on top of the lean core: tickToClock, label parts, clock -> tick, URL parameter, golden and ticks tables.
// CANDIDATE (WP-TIME-02). Zero dependencies. NOT inlined into the legacy bridge (size): the bridge uses core.js + bridge.js only.
import { parseLocal } from './core.js';

const REVIEW_RANK = { none: 0, 'evidence-weak': 1, 'owner-sign': 2, 'owner-decision': 3, 'needs-historian': 4 };

/** Adds the rich API to a core model built from `doc`. Returns a new object; the core is not modified. */
export function extend(core, doc) {
  const { A, basis, clamp, dayLabelOf, isoOf, hm12, seg } = core._;
  const { tickMax, gaps, parts, tickToMinutes, minutesToTick, tabDay, isApprox, format, tickToLabel } = core;
  const meta = (doc.anchors || []).map((a) => ({ label: a.label || '', circular: !!a.circular, facts: a.facts || [] }));

  const buildClock = (req) => {
    const t = clamp(req), p = parts(t, 0), b = basis(t), i = seg(t, 'tick'), mpt = (A[i + 1].min - A[i].min) / (A[i + 1].tick - A[i].tick);
    let review = 'none', weakest = 'A';
    for (const e of b.ends) { if (REVIEW_RANK[e.review] > REVIEW_RANK[review]) review = e.review; if (e.cls > weakest) weakest = e.cls; }
    let gap = null; for (const g of gaps) if (t >= g.from && t < g.to) gap = g.policy;
    return {
      tick: t, requested: req, clamped: t !== req, exact: t === req, minutes: tickToMinutes(t), iso: isoOf(p), year: p.year, month: p.month, date: p.date, weekday: p.weekday,
      hour24: p.hour24, minute: p.minute, time: hm12(p.hour24, p.minute), tab: tabDay(t), mpt, sigmaMin: b.sigma, approx: isApprox(t), signed: b.ends.every((e) => e.state === 'signed'),
      night: p.phase === 'night', phase: p.phase, nightOf: p.nightOf, dayLabel: dayLabelOf(p), review, basis: weakest, lull: mpt > 15, gap,
    };
  };
  const cache = new Array(tickMax + 1);
  /** Full breakdown of a tick (fractions allowed). Ticks outside 1..tickMax clamp with clamped:true (exact:false). NaN/Infinity throw TypeError. */
  const tickToClock = (tick) => {
    if (typeof tick !== 'number' || !Number.isFinite(tick)) throw new TypeError('tick must be a finite number');
    if (tick === (tick | 0) && tick >= 1 && tick <= tickMax) return cache[tick] || (cache[tick] = Object.freeze(buildClock(tick)));
    return buildClock(tick);
  };
  /** clock (ISO "1863-07-03T15:00" | minutes since 1863-07-01T00:00) -> fractional tick, clamped to 1..tickMax. */
  const clockToTick = (x, opts) => minutesToTick(typeof x === 'string' ? parseLocal(x) : x, opts);
  const clockToTickInfo = (x) => { const m = typeof x === 'string' ? parseLocal(x) : x; return { tick: minutesToTick(m), exact: m >= A[0].min && m <= A[A.length - 1].min }; };
  const tickToLabelParts = (tick, opts) => {
    const o = opts || {}, rm = o.roundMin == null ? 5 : o.roundMin, t = clamp(tick), p = parts(t, rm), ap = o.approx == null || o.approx === 'auto' ? isApprox(t) : !!o.approx;
    return { tick: t, day: dayLabelOf(p), date: dayLabelOf(p) + ', ' + p.year, time: hm12(p.hour24, p.minute), prefix: ap ? 'about ' : '', approx: ap, text: format(t, o.style || 'long', { roundMin: rm, approx: ap }), night: !!p.nightOf, nightOf: p.nightOf, weekday: p.weekday, iso: isoOf(p) };
  };
  const ticksJson = () => { const r = []; for (let t = 1; t <= tickMax; t++) { const c = tickToClock(t); r.push([t, c.iso, c.tab, c.date, Math.round(c.mpt * 1000) / 1000]); } return r; };
  const goldenCsv = () => {
    const rows = ['tick,iso,tab,mpt,sigma,approx,night,label'];
    for (let t = 1; t <= tickMax; t++) { const c = tickToClock(t); rows.push([t, c.iso, c.tab, c.mpt.toFixed(3), c.sigmaMin.toFixed(1), c.approx ? 1 : 0, c.night ? 1 : 0, '"' + tickToLabel(t) + '"'].join(',')); }
    return rows.join('\n') + '\n';
  };
  return Object.assign({}, core, {
    tickToClock, clockToTick, clockToTickInfo, tickToLabelParts, ticksJson, goldenCsv, isGap: (t) => core.gapAt(t) !== null,
    /** per-anchor view with the honest flags: approx = sigma >= approx_sigma_min or not signed */
    anchors: A.map((a, i) => ({ tick: a.tick, minutes: a.min, sigmaMin: a.sigma, status: a.status, confidence: a.cls, state: a.state, review: a.review, label: meta[i].label, circular: meta[i].circular, facts: meta[i].facts, approx: a.sigma >= core.approxSigmaMin || a.state !== 'signed' })),
    /** ?tick=538 | ?t=538 -> integer tick, else null (D-URLSTATE: tick and t are read; no time-address parameter is defined here). */
    resolveTickParam: (q) => {
      const g = (k) => (q && typeof q.get === 'function' ? q.get(k) : q ? q[k] : null);
      const raw = g('tick') != null ? g('tick') : g('t');
      return raw != null && /^\d{1,6}$/.test(String(raw)) ? clamp(+raw) : null;
    },
  });
}
