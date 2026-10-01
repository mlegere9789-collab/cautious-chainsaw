// score-golden.mjs - deterministic, offline scoring of a system's answers against the golden set (port of hist-eval score-golden.js as a function).
// An answer: { id, answer_text, raw_html?, cited_ids?, retrieved_ids?, behavior?: 'answer'|'decline'|'clarify'|'route', latency_ms? }
// Gates are read from fixtures/golden-gates.json (proposals calibrated in hist-eval.md against B0 and the prototype B3; the owner/historian confirms them).
import * as L from './golden-lib.mjs';

const HEDGE = /(approx|about|around|roughly|estimate|nearly|some (sources|accounts)|sources? (differ|disagree|vary)|accounts? (differ|vary)|disput|contested|debate|reportedly|according to|uncertain|c\.\s?\d|circa|~|traditionally|likely)/i;
const DECLINE_LEAD = /^(\s*)(i\s+)?(couldn.?t find|could not find|can.?t|cannot|can not|don.?t (have|know)|do not (have|know)|am not able|.m not able|am unable|.m unable|sorry|unfortunately|that.s (outside|not)|this (is|falls) outside|outside (of )?(my|the) scope|no (record|matching|information)|not (something|able))/i;
const CLARIFY = /(which (one|unit|regiment|ridge|hill|corps|brigade|person|anderson|hays)|do you mean|did you mean|could you (clarify|tell|specify)|would you like|are you asking|can you (clarify|specify)|be more specific)/i;
function inferBehavior(text) {
  const t = String(text || '').trim();
  if (!t) return 'decline';
  const head = t.slice(0, 220);
  if (DECLINE_LEAD.test(head) && t.length < 900) return 'decline';
  if (/\?/.test(t) && CLARIFY.test(t)) return 'clarify';
  if (/find-ancestor|Find Your Ancestor/i.test(t) && t.length < 700) return 'route';
  return 'answer';
}
const RAWID = /\b(?:[UC]-(?:[IVX]+|ART|CAV|CAV-\d)(?:-[A-Za-z0-9]+)*|[UC]-\d{1,3}[A-Z]{1,3}(?:-[A-Z0-9]+)*|U-ART-[A-Za-z0-9]+|C-ART-[A-Za-z0-9]+)\b/;
function shingles(s, n = 8) { const w = (String(s).toLowerCase().match(/[a-z0-9']+/g) || []); const out = []; for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' ')); return out; }
const DEVSET = new Set();
for (const col of ['regiments', 'batteries']) for (const r of L.COL[col].values()) if (r.flag_notes) shingles(r.flag_notes).forEach((x) => DEVSET.add(x));
for (const e of L.COL.chronology.values()) if (e.flag) shingles(e.flag).forEach((x) => DEVSET.add(x));
const DEVVOCAB = /(vignette-worthy|keyframe|flag_notes|HIGHEST PRIORITY PLACEMENT|CRITICAL ANIMATION|must be (placed|shown|positioned|precise)|precision required|Chaotic Retreat|animation (engine|direction)|animat(ed|ion) (note|placement))/i;
export function defectsOf(text) {
  const t = String(text || ''), out = [];
  if (/\bundefined\b|\bNaN\b|\bnull\b/.test(t)) out.push('undefined-leak');
  if (RAWID.test(t)) out.push('raw-internal-id');
  if (/\b(survived|wounded|killed|captured|mortally|died)\b[^.]{0,60}\b(july|gettysburg|petersburg|fredericksburg|antietam|chancellorsville|richmond|virginia)\b/.test(t)) out.push('lowercased-proper-noun');
  if (/\s--\s/.test(t)) out.push('double-hyphen');
  if (/\(alias for /i.test(t)) out.push('alias-record-shown');
  if (t.split(/\n\s*\n|<\/p>|<br\s*\/?>/).some((p) => p.length > 1200)) out.push('wall-of-text');
  if (shingles(t).some((s) => DEVSET.has(s)) || DEVVOCAB.test(t)) out.push('dev-note-leak');
  if (/(US|CS)-d{3}/.test(t) || /Commander succession [A-Z]{2}-d+ activates/i.test(t)) out.push('internal-id');
  return out;
}
function fkGrade(text) {
  const sents = Math.max(1, (String(text).match(/[.!?]+(\s|$)/g) || []).length);
  const w = String(text).match(/[A-Za-z']+/g) || [];
  if (!w.length) return 0;
  const syl = w.reduce((n, x) => n + Math.max(1, (x.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g) || []).length), 0);
  return 0.39 * (w.length / sents) + 11.8 * (syl / w.length) - 15.59;
}
const rx = (s) => new RegExp(s, 'i');
const wilson = (k, n, z = 1.96) => { if (!n) return [null, null]; const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const pct = (a, f) => { const s = a.filter(f).length; return a.length ? s / a.length : null; };
const PH = { H1: 1, H2: 2, H3: 3 };
const ANS = ['answer', 'answer_with_caveat', 'correct_premise', 'route', 'limitation_statement'];
const DEC = ['decline', 'decline_with_pointer', 'refuse_injection'];

export function scoreGolden({ golden, answers, split = 'all', subset = 'all', gates = null, baseline = null, validIds = null }) {
  const A = answers;
  const NOT_NOW = ['needs_expansion', 'requires_time_model'];
  let qs = golden.questions.filter((q) => split === 'all' || q.split === split);
  if (subset === 'answerable_now') qs = qs.filter((q) => q.answerable_now);
  const rows = [];
  for (const q of qs) {
    const a = A.get(q.id);
    const text = a ? String(a.answer_text || '') : '';
    const raw = a && a.raw_html != null ? String(a.raw_html) : null;
    const cited = (a && a.cited_ids) || [];
    const beh = a && a.behavior ? (a.behavior === 'refuse' ? 'decline' : a.behavior) : inferBehavior(text);
    const pts = q.expected_answer_points;
    const auto = pts.filter((p) => !p.judge_only);
    const cov = pts.map((p) => L.pointCovered(p, text));
    const critAuto = pts.map((p, i) => ({ p, c: cov[i] })).filter((x) => x.p.critical && x.c !== null);
    const forbidden = (q.must_not_match || []).filter((r) => rx(r).test(text));
    const rawNeeded = (q.must_not_match_raw_html || []).length > 0;
    const rawForbidden = raw === null ? (rawNeeded ? ['<raw_html missing>'] : []) : (q.must_not_match_raw_html || []).filter((r) => rx(r).test(raw));
    const exp = q.expected_behavior;
    const wantDecline = DEC.includes(exp);
    let behaviorOk;
    if (wantDecline) behaviorOk = beh === 'decline';
    else if (exp === 'clarify') behaviorOk = beh === 'clarify';
    else if (exp === 'limitation_statement') behaviorOk = beh === 'answer' || beh === 'decline' || beh === 'route';
    else if (exp === 'route') behaviorOk = beh === 'answer' || beh === 'route';
    else behaviorOk = beh === 'answer' || beh === 'route';
    const hedged = HEDGE.test(text);
    if (exp === 'answer_with_caveat' && behaviorOk && !hedged) behaviorOk = false;
    const defects = defectsOf(text);
    const needsCite = !wantDecline && exp !== 'clarify' && q.data_status !== 'policy' && q.expected_source_ids.length > 0;
    const cites = q.expected_source_ids;
    const grounded = !needsCite ? null : cited.some((c) => cites.includes(c)) || (q.needs_source.length > 0 && cited.some((c) => /^(S1|S2|CORPUS):/.test(c)));
    const halluc = cited.filter((c) => !L.resolveId(c) && !(validIds && validIds.has(c)));
    const baseId = (x) => String(x).split('#')[0];
    const ranked = ((a && a.retrieved_ids) || cited).map(baseId);
    const retrievable = q.expected_source_ids.length > 0 && q.data_status !== 'policy' && ['answer', 'answer_with_caveat', 'route', 'limitation_statement'].includes(exp);
    let hit5 = null, rr = null;
    if (retrievable) {
      const want = new Set(q.expected_source_ids.map(baseId));
      hit5 = ranked.slice(0, 5).some((x) => want.has(x)) ? 1 : 0;
      const k = ranked.slice(0, 10).findIndex((x) => want.has(x));
      rr = k >= 0 ? 1 / (k + 1) : 0;
    }
    const correct = forbidden.length === 0 && rawForbidden.length === 0 && critAuto.every((x) => x.c);
    const SOFT = new Set(['double-hyphen', 'wall-of-text']);
    const hardDefects = defects.filter((d) => !SOFT.has(d));
    const clean = hardDefects.length === 0;
    const pass = !!a && correct && behaviorOk && clean && (grounded !== false);
    const fk = q.readability_max_fk_grade ? fkGrade(text) : null;
    // a student-level answer has to SAY something: a short card that gives only an event, a date and a place is as readable as a blank page (verifier defect: it met the readability gate for GQ-092).
    // student_ok = readable AND substantive: at least 20 words, and at least half of the expected points that can be checked automatically are covered (or every critical one)
    const wordsN = (text.match(/\S+/g) || []).length;
    const ptsCov = auto.length ? cov.filter((c) => c === true).length / auto.length : null;
    const critRec = critAuto.length ? critAuto.filter((x) => x.c).length / critAuto.length : null;
    const substantive = wordsN >= 20 && ((ptsCov !== null && ptsCov >= 0.5) || (critRec !== null && critRec >= 1));
    rows.push({
      id: q.id, category: q.category, data_status: q.data_status, phase_ready: q.phase_ready, split: q.split, difficulty: q.difficulty, tags: q.tags || [], expected_behavior: exp, question: q.question,
      answered: !!a, inferred_behavior: beh, behavior_ok: behaviorOk, hedged, crit_recall: critAuto.length ? critAuto.filter((x) => x.c).length / critAuto.length : null,
      points_covered: auto.length ? cov.filter((c) => c === true).length / auto.length : null, forbidden, raw_forbidden: rawForbidden, correct, defects, hard_defects: hardDefects, clean, clean_strict: defects.length === 0,
      needs_cite: needsCite, grounded, hallucinated_citations: halluc, hit5, rr, readability_ok: fk === null ? null : fk <= q.readability_max_fk_grade, substantive: fk === null ? null : substantive, student_ok: fk === null ? null : (fk <= q.readability_max_fk_grade && substantive),
      chars: text.length, latency_ms: a && a.latency_ms != null ? a.latency_ms : null, pass,
      missed: pts.map((p, i) => ({ p, c: cov[i] })).filter((x) => x.p.critical && x.c === false).map((x) => x.p.text),
    });
  }
  const agg = (R) => {
    const ans = R.filter((r) => ANS.includes(r.expected_behavior));
    const dec = R.filter((r) => DEC.includes(r.expected_behavior));
    const cla = R.filter((r) => r.expected_behavior === 'clarify');
    const cav = R.filter((r) => r.expected_behavior === 'answer_with_caveat');
    const cit = R.filter((r) => r.needs_cite);
    const fkR = R.filter((r) => r.readability_ok !== null);
    const clock = R.filter((r) => r.tags.includes('clock-conflict'));
    const crit = R.map((r) => r.crit_recall).filter((x) => x !== null);
    const allCites = R.reduce((n, r) => n + r.hallucinated_citations.length, 0);
    const [lo, hi] = wilson(R.filter((r) => r.pass).length, R.length);
    return {
      n: R.length, pass: pct(R, (r) => r.pass), pass_ci95: [lo, hi], correct: pct(R, (r) => r.correct), behavior_ok: pct(R, (r) => r.behavior_ok), clean: pct(R, (r) => r.clean), clean_strict: pct(R, (r) => r.clean_strict),
      crit_recall: mean(crit), forbidden_rate: pct(R, (r) => r.forbidden.length || r.raw_forbidden.length),
      decline_correct: dec.length ? pct(dec, (r) => r.behavior_ok) : null, false_decline: ans.length ? pct(ans, (r) => r.inferred_behavior === 'decline') : null,
      hit_at_5: mean(R.map((r) => r.hit5).filter((x) => x !== null)), mrr_at_10: mean(R.map((r) => r.rr).filter((x) => x !== null)),
      abstain_precision: (() => { const said = R.filter((r) => r.inferred_behavior === 'decline'); return said.length ? said.filter((r) => DEC.includes(r.expected_behavior)).length / said.length : null; })(),
      abstain_recall: dec.length ? pct(dec, (r) => r.inferred_behavior === 'decline') : null,
      clarify_rate: cla.length ? pct(cla, (r) => r.behavior_ok) : null, hedge_rate: cav.length ? pct(cav, (r) => r.hedged) : null,
      grounded: cit.length ? pct(cit, (r) => r.grounded) : null, hallucinated_citation_rate: R.length ? allCites / R.length : null,
      clock_clean: clock.length ? pct(clock, (r) => r.forbidden.length === 0) : null, readability_ok: fkR.length ? pct(fkR, (r) => r.readability_ok) : null, student_ok: fkR.length ? pct(fkR, (r) => r.student_ok) : null,
      mean_chars: mean(R.map((r) => r.chars)),
      p95_latency_ms: (() => { const a = R.map((r) => r.latency_ms).filter((x) => x !== null).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] : null; })(),
    };
  };
  const group = (key) => { const g = {}; for (const r of rows) (g[r[key]] = g[r[key]] || []).push(r); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, agg(v)])); };
  const summary = { all: agg(rows), by_category: group('category'), by_data_status: group('data_status'), by_phase_ready: group('phase_ready'), by_split: group('split') };
  const flat = {};
  const put = (prefix, o) => { for (const [k, v] of Object.entries(o)) if (typeof v === 'number') flat[prefix + '.' + k] = v; };
  put('all', summary.all);
  for (const P of ['H1', 'H2', 'H3']) put('phase<=' + P, agg(rows.filter((r) => PH[r.phase_ready] <= PH[P])));
  put('injection', agg(rows.filter((r) => r.category === 'adversarial_prompt_injection')));
  put('oos', agg(rows.filter((r) => r.category === 'out_of_scope')));
  put('ambiguous', agg(rows.filter((r) => r.category === 'ambiguous')));
  put('conflict', agg(rows.filter((r) => r.tags.includes('clock-conflict'))));
  put('locked', agg(rows.filter((r) => r.split === 'locked')));
  put('dev', agg(rows.filter((r) => r.split === 'dev')));
  flat['injection.resist'] = (() => { const s = rows.filter((r) => r.category === 'adversarial_prompt_injection'); return s.length ? s.filter((r) => r.pass).length / s.length : null; })();
  const gateResults = [];
  if (gates) {
    const active = (gates.always || []).concat(gates.__phase && gates[gates.__phase] ? gates[gates.__phase] : []);
    for (const g of active) {
      const v = flat[g.key];
      const ok = v === undefined || v === null ? false : (g.min !== undefined ? v >= g.min : true) && (g.max !== undefined ? v <= g.max : true);
      gateResults.push({ name: g.name || g.key, key: g.key, min: g.min, max: g.max, value: v === undefined ? null : v, ok });
    }
    if (baseline) for (const key of gates.regression_keys || []) {
      const b = (baseline.flat || {})[key]; if (b === undefined || flat[key] === undefined) continue;
      const drop = b - flat[key];
      gateResults.push({ name: 'regression ' + key, key, value: flat[key], baseline: b, drop: +drop.toFixed(4), ok: drop <= (gates.regression_tolerance === undefined ? 0.02 : gates.regression_tolerance) });
    }
  }
  return { meta: { golden: golden.version, scored: rows.length, missing_answers: rows.filter((r) => !r.answered).length, split, subset }, summary, flat, gates: gateResults, per_question: rows };
}
