// Anchor loader and validator (TM-V1).  CANDIDATE (WP-TIME-02/03).  Zero dependencies.
//
// validateAnchors(doc) never throws: it returns { ok, errors, warnings, info } so CI can print a full report.
// loadAnchors(docOrJson) validates, throws AnchorError on any error, and returns a model.
//
// Errors (block): structure, strictly increasing ticks AND minutes, includes tick 1, every tab start and tick_max, slope outside
//   0.75..60 min/tick, class/status mismatch, a "signed" anchor without a decision id.
// Warnings (report, never block): slope over 15 ("lull"), an S-status anchor failing the evidence rule (candidate for demotion to M),
//   declared flags that differ from the mechanical rules, sigma that differs from the derivation, anchor time outside its range.
import { parseLocal } from './core.js';
import { makeTimeModel } from './model.js';

export class AnchorError extends Error {
  constructor(errors) { super('invalid time anchors: ' + errors.map((e) => e.code + ' ' + e.msg).join('; ')); this.name = 'AnchorError'; this.errors = errors; }
}

const CLASS_OF = { S: 'A', M: 'B', R: 'C', D: 'D' };
const STATES = ['open', 'proposed', 'reviewed', 'confirmed', 'signed', 'contested', 'deferred', 'withdrawn'];
const hmMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);

/** [E] sigma = min(cap, max(5, ceil(halfwidth / 5) * 5)) for a range of two HH:MM strings. */
export function deriveSigma(range, cap) {
  const w = hmMin(range[1]) - hmMin(range[0]);
  return Math.min(cap == null ? 30 : cap, Math.max(5, Math.ceil(w / 2 / 5) * 5));
}

/** Mechanical flags per chapter 04 section 4.4 from an anchor's own fields: [M, E, W] (H, O, C come from status/circular). */
export function mechanicalFlags(a, strong) {
  const out = [];
  const fam = a.families || [];
  const hasStrong = fam.some((f) => strong.includes(f)), nStrong = fam.filter((f) => strong.includes(f)).length;
  if (a.status === 'S') {
    const fc = Object.values(a.fact_confidences || {});
    if (fc.length && !fc.includes('H')) out.push('M'); // S-status resting only on M/L fact rows (no H row among the linked facts)
    if (!(fam.includes('OR') || nStrong >= 2)) out.push('E');
  }
  if (a.status !== 'D' && !hasStrong) out.push('W');
  return out;
}

export function validateAnchors(doc, opts) {
  const errors = [], warnings = [];
  const E = (code, msg, tick) => errors.push({ code, msg, tick });
  const W = (code, msg, tick) => warnings.push({ code, msg, tick });
  const strict = opts || {};
  const info = { anchors: 0, byStatus: {}, slopes: [], lulls: [], stalls: [], evidenceFailures: [], needsHistorian: [], design: [] };
  if (!doc || typeof doc !== 'object') { E('V1.doc', 'document is not an object'); return { ok: false, errors, warnings, info }; }
  if (doc.schema !== 1) E('V1.schema', 'schema must be 1');
  if (typeof doc.version !== 'string' || !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(doc.version)) E('V1.version', 'version must look like 2026-09-30.1');
  if (!Number.isInteger(doc.dv) || doc.dv < 1) E('V1.dv', 'dv must be an integer >= 1');
  if (doc.tz !== 'LMT') E('V1.tz', 'tz must be LMT (local mean time)');
  const A = Array.isArray(doc.anchors) ? doc.anchors : [];
  if (A.length < 2) { E('V1.anchors', 'need at least two anchors'); return { ok: false, errors, warnings, info }; }
  info.anchors = A.length;
  const slope = Object.assign({ min_min_per_tick: 0.75, warn_over: 15, error_over: 60 }, doc.slope || {});
  const cap = doc.sigma_cap_min == null ? 30 : doc.sigma_cap_min;
  const strong = (doc.evidence_families && doc.evidence_families.strong) || ['OR', 'WP', 'ABT', 'HN', 'NPS', 'PART'];

  // per-anchor structure
  const mins = [];
  A.forEach((a, i) => {
    const tk = a && a.tick;
    if (!Number.isInteger(tk) || tk < 1) E('V1.tick', 'anchor #' + i + ' tick must be an integer >= 1', tk);
    let m = null;
    try { m = parseLocal(a.t); } catch (e) { E('V1.t', 'anchor #' + i + ' (tick ' + tk + ') bad time ' + a.t, tk); }
    mins.push(m);
    if (!(a.status in CLASS_OF)) E('V1.status', 'tick ' + tk + ' status must be S, M, R or D', tk);
    else if (a.confidence !== CLASS_OF[a.status]) E('V1.class', 'tick ' + tk + ' confidence ' + a.confidence + ' does not match status ' + a.status, tk);
    if (!(typeof a.sigma_min === 'number' && a.sigma_min >= 1 && a.sigma_min <= cap)) E('V1.sigma', 'tick ' + tk + ' sigma_min must be 1..' + cap, tk);
    if (!STATES.includes(a.state)) E('V1.state', 'tick ' + tk + ' unknown state ' + a.state, tk);
    if (a.state === 'signed' && !a.decision) E('V18.signed', 'tick ' + tk + ' is signed without a decision id', tk);
    info.byStatus[a.status] = (info.byStatus[a.status] || 0) + 1;
    if (a.status === 'R' || a.review_flag === 'needs-historian') info.needsHistorian.push(tk);
    if (a.status === 'D') info.design.push(tk);
    if (a.status === 'R' && a.review_flag !== 'needs-historian') W('V1.review', 'tick ' + tk + ' has status R but review_flag ' + a.review_flag, tk);
    if (a.range && m != null) {
      const day = Math.floor(m / 1440) * 1440, lo = day + hmMin(a.range[0]), hi = day + hmMin(a.range[1]);
      if (m < lo || m > hi) W('V1.range', 'tick ' + tk + ' time ' + a.t + ' is outside its range ' + a.range.join('-'), tk);
      if (a.status !== 'D' && !a.circular && a.sigma_min !== deriveSigma(a.range, cap)) W('V1.sigma-derivation', 'tick ' + tk + ' sigma ' + a.sigma_min + ' differs from the derived ' + deriveSigma(a.range, cap), tk);
    }
    if (a.families && a.status !== 'D') {
      const want = mechanicalFlags(a, strong), have = (a.flags || []).filter((f) => 'MEW'.includes(f));
      if (want.join('') !== have.join('')) W('V1.flags', 'tick ' + tk + ' declared flags [' + have + '] differ from the mechanical rules [' + want + ']', tk);
      if (a.status === 'S' && want.includes('E')) info.evidenceFailures.push(tk);
    }
  });
  const ticks = A.map((a) => a.tick);
  for (let i = 1; i < A.length; i++) {
    if (!(ticks[i] > ticks[i - 1])) E('V1.order', 'ticks must strictly increase (index ' + i + ': ' + ticks[i - 1] + ' then ' + ticks[i] + ')', ticks[i]);
    if (mins[i] != null && mins[i - 1] != null && !(mins[i] > mins[i - 1])) E('V1.order', 'times must strictly increase (tick ' + ticks[i] + ')', ticks[i]);
  }
  const tickMax = ticks[ticks.length - 1];
  if (ticks[0] !== 1) E('V1.first', 'first anchor must be tick 1');
  if (doc.tick_max !== tickMax) E('V1.tick_max', 'tick_max ' + doc.tick_max + ' must equal the last anchor tick ' + tickMax);
  // tab ranges: contiguous, cover 1..tick_max, and every tab start is an anchor
  const tabs = doc.tab_days;
  if (!Array.isArray(tabs) || !tabs.length) E('V1.tabs', 'tab_days missing');
  else {
    let prevEnd = 0;
    tabs.forEach((r, i) => {
      if (r[0] !== prevEnd + 1 || r[1] < r[0]) E('V1.tabs', 'tab_days must be contiguous from 1 (range #' + (i + 1) + ')');
      prevEnd = r[1];
      if (!ticks.includes(r[0])) E('V1.tab-anchor', 'tab start ' + r[0] + ' must be an anchor');
    });
    if (prevEnd !== tickMax) E('V1.tabs', 'tab_days must end at tick_max (' + tickMax + ')');
  }
  // slopes
  for (let i = 1; i < A.length; i++) {
    if (mins[i] == null || mins[i - 1] == null || !(ticks[i] > ticks[i - 1])) continue;
    const s = (mins[i] - mins[i - 1]) / (ticks[i] - ticks[i - 1]);
    info.slopes.push({ from: ticks[i - 1], to: ticks[i], minPerTick: s });
    if (s > slope.error_over) E('V1.slope', 'slope ' + s.toFixed(2) + ' min/tick over ' + ticks[i - 1] + '-' + ticks[i] + ' exceeds ' + slope.error_over, ticks[i]);
    else if (s < slope.min_min_per_tick) E('V1.slope', 'slope ' + s.toFixed(2) + ' min/tick over ' + ticks[i - 1] + '-' + ticks[i] + ' is under ' + slope.min_min_per_tick, ticks[i]);
    else if (s > slope.warn_over) { info.lulls.push({ from: ticks[i - 1], to: ticks[i], minPerTick: s }); W('V1.lull', 'lull: ' + s.toFixed(1) + ' min/tick over ' + ticks[i - 1] + '-' + ticks[i], ticks[i]); }
    if (s < 1.5) info.stalls.push({ from: ticks[i - 1], to: ticks[i], minPerTick: s });
  }
  // gaps and solar
  (doc.gaps || []).forEach((g, i) => { if (!(g.from >= 1 && g.to > g.from && g.to <= tickMax)) E('V1.gaps', 'gap #' + i + ' out of range'); });
  for (const k of Object.keys(doc.solar || {})) {
    if (!/^1863-07-\d{2}$/.test(k)) continue;
    const s = doc.solar[k], seq = ['civil_dawn', 'sunrise', 'noon', 'sunset', 'civil_dusk', 'nautical_dusk'].map((f) => (s[f] ? hmMin(s[f]) : NaN));
    if (seq.some((x) => x !== x) || seq.some((x, i) => i && x <= seq[i - 1])) E('V1.solar', 'solar table ' + k + ' must list civil_dawn < sunrise < noon < sunset < civil_dusk < nautical_dusk');
  }
  if (typeof doc.approx_sigma_min !== 'number') E('V1.approx', 'approx_sigma_min missing');
  if (strict.evidenceAsError && info.evidenceFailures.length) E('V1.evidence', 'S anchors failing the evidence rule: ' + info.evidenceFailures.join(', '));
  else if (info.evidenceFailures.length) W('V1.evidence', 'S-status anchors failing the evidence rule (candidates for demotion to M, WP-TIME-03): ' + info.evidenceFailures.join(', '));
  return { ok: errors.length === 0, errors, warnings, info };
}

/** Validate and build a model from a document object or JSON text. Throws AnchorError listing every error. */
export function loadAnchors(input) {
  const doc = typeof input === 'string' ? JSON.parse(input) : input;
  const r = validateAnchors(doc);
  if (!r.ok) throw new AnchorError(r.errors);
  return makeTimeModel(doc);
}
