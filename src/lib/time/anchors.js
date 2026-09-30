// Anchor loader and validator (TM-V1).  CANDIDATE (WP-TIME-02/03).  Zero dependencies.
//
// validateAnchors(doc) NEVER throws, whatever it is given (null entries, wrong types, cyclic junk): it returns { ok, errors, warnings, info }
// so CI can print a full report. Every field is type-checked before it is used, and a final safety net turns an unforeseen exception into a
// V1.internal error, so "ok: true" can never come from a crash. loadAnchors(docOrJson) validates, throws AnchorError on any error, and
// returns a model.
//
// Errors (block): structure, strictly increasing ticks AND minutes, includes tick 1, every tab start and tick_max, slope outside
//   0.75..60 min/tick, class/status mismatch, a "signed" anchor without a decision id, a malformed range (two HH:MM times, from <= to).
// Warnings (report, never block): slope over 15 ("lull"), an S-status anchor failing the evidence rule (candidate for demotion to M),
//   declared flags that differ from the mechanical rules, sigma that differs from the derivation, anchor time outside its range.
import { parseLocal } from './core.js';
import { makeTimeModel } from './model.js';

export class AnchorError extends Error {
  constructor(errors) { super('invalid time anchors: ' + errors.map((e) => e.code + ' ' + e.msg).join('; ')); this.name = 'AnchorError'; this.errors = errors; }
}

const CLASS_OF = { S: 'A', M: 'B', R: 'C', D: 'D' };
const STATES = ['open', 'proposed', 'reviewed', 'confirmed', 'signed', 'contested', 'deferred', 'withdrawn'];
const POLICIES = ['fast_forward', 'time_lapse'];
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const hmMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const isHm = (s) => typeof s === 'string' && HM.test(s);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isRange = (r) => Array.isArray(r) && r.length === 2 && isHm(r[0]) && isHm(r[1]) && hmMin(r[0]) <= hmMin(r[1]);
const show = (x) => { try { const s = JSON.stringify(x); return s === undefined ? String(x) : s.length > 60 ? s.slice(0, 57) + '...' : s; } catch (e) { return typeof x; } };

/** [E] sigma = min(cap, max(5, ceil(halfwidth / 5) * 5)) for a range of two HH:MM strings (TypeError for anything else). */
export function deriveSigma(range, cap) {
  if (!Array.isArray(range) || !isHm(range[0]) || !isHm(range[1])) throw new TypeError('range must be two HH:MM strings, got ' + show(range));
  const w = hmMin(range[1]) - hmMin(range[0]);
  return Math.min(cap == null ? 30 : cap, Math.max(5, Math.ceil(w / 2 / 5) * 5));
}

/** Mechanical flags per chapter 04 section 4.4 from an anchor's own fields: [M, E, W] (H, O, C come from status/circular). */
export function mechanicalFlags(a, strong) {
  const out = [], sg = Array.isArray(strong) ? strong : [];
  const fam = Array.isArray(a.families) ? a.families : [];
  const hasStrong = fam.some((f) => sg.includes(f)), nStrong = fam.filter((f) => sg.includes(f)).length;
  if (a.status === 'S') {
    const fc = isObj(a.fact_confidences) ? Object.values(a.fact_confidences) : [];
    if (fc.length && !fc.includes('H')) out.push('M'); // S-status resting only on M/L fact rows (no H row among the linked facts)
    if (!(fam.includes('OR') || nStrong >= 2)) out.push('E');
  }
  if (a.status !== 'D' && !hasStrong) out.push('W');
  return out;
}

function check(doc, opts) {
  const errors = [], warnings = [];
  const E = (code, msg, tick) => errors.push({ code, msg, tick });
  const W = (code, msg, tick) => warnings.push({ code, msg, tick });
  const strict = isObj(opts) ? opts : {};
  const info = { anchors: 0, byStatus: {}, slopes: [], lulls: [], stalls: [], evidenceFailures: [], needsHistorian: [], design: [] };
  const out = () => ({ ok: errors.length === 0, errors, warnings, info });
  if (!isObj(doc)) { E('V1.doc', 'document is not an object'); return out(); }
  if (doc.schema !== 1) E('V1.schema', 'schema must be 1');
  if (typeof doc.version !== 'string' || !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(doc.version)) E('V1.version', 'version must look like 2026-09-30.1');
  if (!Number.isInteger(doc.dv) || doc.dv < 1) E('V1.dv', 'dv must be an integer >= 1');
  if (doc.tz !== 'LMT') E('V1.tz', 'tz must be LMT (local mean time)');
  const A = Array.isArray(doc.anchors) ? doc.anchors : [];
  if (A.length < 2) { E('V1.anchors', 'need at least two anchors'); return out(); }
  info.anchors = A.length;
  // configuration numbers: a wrong-typed or non-positive value is an error (never silently replaced by a default, which would make this report disagree with makeTimeModel)
  const posNum = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
  if (doc.slope !== undefined && !isObj(doc.slope)) E('V1.slope-config', 'slope must be an object, got ' + show(doc.slope));
  const sl = isObj(doc.slope) ? doc.slope : {};
  for (const k of ['min_min_per_tick', 'warn_over', 'error_over']) if (sl[k] !== undefined && !posNum(sl[k])) E('V1.slope-config', 'slope.' + k + ' must be a finite number > 0, got ' + show(sl[k]));
  const slope = { min_min_per_tick: posNum(sl.min_min_per_tick) ? sl.min_min_per_tick : 0.75, warn_over: posNum(sl.warn_over) ? sl.warn_over : 15, error_over: posNum(sl.error_over) ? sl.error_over : 60 };
  if (doc.sigma_cap_min !== undefined && !(typeof doc.sigma_cap_min === 'number' && Number.isFinite(doc.sigma_cap_min) && doc.sigma_cap_min >= 1)) E('V1.sigma-cap', 'sigma_cap_min must be a finite number >= 1, got ' + show(doc.sigma_cap_min));
  const cap = typeof doc.sigma_cap_min === 'number' && Number.isFinite(doc.sigma_cap_min) && doc.sigma_cap_min >= 1 ? doc.sigma_cap_min : 30;
  const ef = doc.evidence_families;
  if (ef !== undefined && !(isObj(ef) && Array.isArray(ef.strong) && (ef.weak === undefined || Array.isArray(ef.weak)))) E('V1.evidence-config', 'evidence_families must be { strong: [...], weak: [...] }, got ' + show(ef));
  const strong = isObj(doc.evidence_families) && Array.isArray(doc.evidence_families.strong) ? doc.evidence_families.strong : ['OR', 'WP', 'ABT', 'HN', 'NPS', 'PART'];

  // per-anchor structure
  const mins = [];
  A.forEach((a, i) => {
    if (!isObj(a)) { E('V1.anchor', 'anchor #' + i + ' must be an object, got ' + show(a)); mins.push(null); return; }
    const tk = a.tick;
    if (!Number.isInteger(tk) || tk < 1) E('V1.tick', 'anchor #' + i + ' tick must be an integer >= 1', tk);
    let m = null;
    try { m = parseLocal(a.t); } catch (e) { E('V1.t', 'anchor #' + i + ' (tick ' + tk + ') bad time ' + show(a.t), tk); }
    mins.push(m);
    const knownStatus = typeof a.status === 'string' && has(CLASS_OF, a.status);
    if (!knownStatus) E('V1.status', 'tick ' + tk + ' status must be S, M, R or D', tk);
    else if (a.confidence !== CLASS_OF[a.status]) E('V1.class', 'tick ' + tk + ' confidence ' + a.confidence + ' does not match status ' + a.status, tk);
    if (a.effective_status !== undefined && !(typeof a.effective_status === 'string' && has(CLASS_OF, a.effective_status))) E('V1.effective', 'tick ' + tk + ' effective_status must be S, M, R or D, got ' + show(a.effective_status), tk);
    if (!(typeof a.sigma_min === 'number' && a.sigma_min >= 1 && a.sigma_min <= cap)) E('V1.sigma', 'tick ' + tk + ' sigma_min must be 1..' + cap, tk);
    if (!STATES.includes(a.state)) E('V1.state', 'tick ' + tk + ' unknown state ' + show(a.state), tk);
    if (a.state === 'signed' && !a.decision) E('V18.signed', 'tick ' + tk + ' is signed without a decision id', tk);
    for (const k of ['families', 'flags', 'facts', 'sources']) if (a[k] !== undefined && !Array.isArray(a[k])) E('V1.type', 'tick ' + tk + ' ' + k + ' must be an array, got ' + show(a[k]), tk);
    if (a.fact_confidences !== undefined && !isObj(a.fact_confidences)) E('V1.type', 'tick ' + tk + ' fact_confidences must be an object, got ' + show(a.fact_confidences), tk);
    if (knownStatus) info.byStatus[a.status] = (info.byStatus[a.status] || 0) + 1;
    if (a.status === 'R' || a.review_flag === 'needs-historian') info.needsHistorian.push(tk);
    if (a.status === 'D') info.design.push(tk);
    if (a.status === 'R' && a.review_flag !== 'needs-historian') W('V1.review', 'tick ' + tk + ' has status R but review_flag ' + a.review_flag, tk);
    if (a.range !== undefined && a.range !== null) {
      if (!isRange(a.range)) E('V1.range-format', 'tick ' + tk + ' range must be two HH:MM times with from <= to, got ' + show(a.range), tk);
      else if (m != null) {
        const day = Math.floor(m / 1440) * 1440, lo = day + hmMin(a.range[0]), hi = day + hmMin(a.range[1]);
        if (m < lo || m > hi) W('V1.range', 'tick ' + tk + ' time ' + a.t + ' is outside its range ' + a.range.join('-'), tk);
        if (a.status !== 'D' && !a.circular && a.sigma_min !== deriveSigma(a.range, cap)) W('V1.sigma-derivation', 'tick ' + tk + ' sigma ' + a.sigma_min + ' differs from the derived ' + deriveSigma(a.range, cap), tk);
      }
    }
    if (Array.isArray(a.families) && a.status !== 'D' && knownStatus) {
      const want = mechanicalFlags(a, strong), have = (Array.isArray(a.flags) ? a.flags : []).filter((f) => 'MEW'.includes(f));
      if (want.join('') !== have.join('')) W('V1.flags', 'tick ' + tk + ' declared flags [' + have + '] differ from the mechanical rules [' + want + ']', tk);
      if (a.status === 'S' && want.includes('E')) info.evidenceFailures.push(tk);
    }
  });
  const ticks = A.map((a) => (isObj(a) ? a.tick : undefined));
  for (let i = 1; i < A.length; i++) {
    if (Number.isInteger(ticks[i]) && Number.isInteger(ticks[i - 1]) && !(ticks[i] > ticks[i - 1])) E('V1.order', 'ticks must strictly increase (index ' + i + ': ' + ticks[i - 1] + ' then ' + ticks[i] + ')', ticks[i]);
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
      if (!Array.isArray(r) || r.length !== 2 || !Number.isInteger(r[0]) || !Number.isInteger(r[1])) { E('V1.tabs', 'tab_days range #' + (i + 1) + ' must be [from, to] integers, got ' + show(r)); prevEnd = NaN; return; }
      if (r[0] !== prevEnd + 1 || r[1] < r[0]) E('V1.tabs', 'tab_days must be contiguous from 1 (range #' + (i + 1) + ')');
      prevEnd = r[1];
      if (!ticks.includes(r[0])) E('V1.tab-anchor', 'tab start ' + r[0] + ' must be an anchor');
    });
    if (prevEnd !== tickMax) E('V1.tabs', 'tab_days must end at tick_max (' + tickMax + ')');
  }
  // slopes
  for (let i = 1; i < A.length; i++) {
    if (mins[i] == null || mins[i - 1] == null || !Number.isInteger(ticks[i]) || !Number.isInteger(ticks[i - 1]) || !(ticks[i] > ticks[i - 1])) continue;
    const s = (mins[i] - mins[i - 1]) / (ticks[i] - ticks[i - 1]);
    info.slopes.push({ from: ticks[i - 1], to: ticks[i], minPerTick: s });
    if (s > slope.error_over) E('V1.slope', 'slope ' + s.toFixed(2) + ' min/tick over ' + ticks[i - 1] + '-' + ticks[i] + ' exceeds ' + slope.error_over, ticks[i]);
    else if (s < slope.min_min_per_tick) E('V1.slope', 'slope ' + s.toFixed(2) + ' min/tick over ' + ticks[i - 1] + '-' + ticks[i] + ' is under ' + slope.min_min_per_tick, ticks[i]);
    else if (s > slope.warn_over) { info.lulls.push({ from: ticks[i - 1], to: ticks[i], minPerTick: s }); W('V1.lull', 'lull: ' + s.toFixed(1) + ' min/tick over ' + ticks[i - 1] + '-' + ticks[i], ticks[i]); }
    if (s < 1.5) info.stalls.push({ from: ticks[i - 1], to: ticks[i], minPerTick: s });
  }
  // gaps and solar
  if (doc.gaps !== undefined && !Array.isArray(doc.gaps)) E('V1.gaps', 'gaps must be an array, got ' + show(doc.gaps));
  (Array.isArray(doc.gaps) ? doc.gaps : []).forEach((g, i) => {
    if (!isObj(g) || !Number.isInteger(g.from) || !Number.isInteger(g.to) || !(g.from >= 1 && g.to > g.from && g.to <= tickMax)) E('V1.gaps', 'gap #' + i + ' must be {from, to, policy} with 1 <= from < to <= tick_max, got ' + show(g));
    else if (!POLICIES.includes(g.policy)) E('V1.gaps', 'gap #' + i + ' policy must be one of ' + POLICIES.join(', ') + ', got ' + show(g.policy));
  });
  if (doc.solar !== undefined && !isObj(doc.solar)) E('V1.solar', 'solar must be an object of days (1863-07-01 ...), got ' + show(doc.solar));
  const solar = isObj(doc.solar) ? doc.solar : {};
  for (const k of Object.keys(solar)) {
    if (!/^1863-07-\d{2}$/.test(k)) continue;
    const s = solar[k], seq = ['civil_dawn', 'sunrise', 'noon', 'sunset', 'civil_dusk', 'nautical_dusk'].map((f) => (isObj(s) && isHm(s[f]) ? hmMin(s[f]) : NaN));
    if (seq.some((x) => x !== x) || seq.some((x, i) => i && x <= seq[i - 1])) E('V1.solar', 'solar table ' + k + ' must list civil_dawn < sunrise < noon < sunset < civil_dusk < nautical_dusk as HH:MM');
  }
  if (!(typeof doc.approx_sigma_min === 'number' && Number.isFinite(doc.approx_sigma_min) && doc.approx_sigma_min >= 0)) E('V1.approx', 'approx_sigma_min must be a finite number >= 0, got ' + show(doc.approx_sigma_min));
  if (strict.evidenceAsError && info.evidenceFailures.length) E('V1.evidence', 'S anchors failing the evidence rule: ' + info.evidenceFailures.join(', '));
  else if (info.evidenceFailures.length) W('V1.evidence', 'S-status anchors failing the evidence rule (candidates for demotion to M, WP-TIME-03): ' + info.evidenceFailures.join(', '));
  return out();
}

/** TM-V1. Never throws. Returns { ok, errors: [{code, msg, tick}], warnings, info }. opts.evidenceAsError turns the S-anchor evidence rule into an error. */
export function validateAnchors(doc, opts) {
  try { return check(doc, opts); } catch (e) {
    return { ok: false, errors: [{ code: 'V1.internal', msg: 'the validator itself failed on this document (' + (e && e.message) + '): report it, this is a bug in validateAnchors' }], warnings: [], info: { anchors: 0, byStatus: {}, slopes: [], lulls: [], stalls: [], evidenceFailures: [], needsHistorian: [], design: [] } };
  }
}

/** Validate and build a model from a document object or JSON text. Throws AnchorError listing every error (invalid JSON text is one V1.json error). */
export function loadAnchors(input) {
  let doc = input;
  if (typeof input === 'string') { try { doc = JSON.parse(input); } catch (e) { throw new AnchorError([{ code: 'V1.json', msg: 'not valid JSON: ' + e.message }]); } }
  const r = validateAnchors(doc);
  if (!r.ok) throw new AnchorError(r.errors);
  return makeTimeModel(doc);
}
