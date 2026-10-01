#!/usr/bin/env node
// eval.mjs - evaluation harness for Ask the Historian (H0-H2, current corpus).
//   node tests/historian/eval.mjs [--system engine|legacy|both] [--suite batteries|golden|all] [--split all|dev|locked] [--gates H1|H2] [--json out.json] [--verbose] [--baseline-update]
// Runs (1) the hist-current batteries: primary (118, tuned-on in the prototype), held-out (57) and the FRESH battery (written for this build before the
// engine existed) and (2) the golden set (150 questions; the plan's H1+H2 gate counts 123 of them, the behaviour gates the 113 answerable_now), against the new engine and, live, against the deployed
// historian.html script (baseline B0, run from legacy/dist). Prints the metrics the hist-current baseline used and the plan's gates.
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { ROOT } from './lib/data.mjs';
import { evaluate, summarize } from './lib/relevance.mjs';
import { legacySystem } from './lib/legacy-b0.mjs';
import { openEngine, knownIds } from './lib/adapters.mjs';
import { scoreGolden } from './lib/score-golden.mjs';
import * as GL from './lib/golden-lib.mjs';
import primary from './batteries/primary.mjs';
import heldout from './batteries/heldout.mjs';
import fresh from './batteries/fresh.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const which = arg('system', 'both'), suite = arg('suite', 'all'), split = arg('split', 'all'), phase = arg('gates', 'H1'), verbose = !!arg('verbose', false);
const GOLDEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'), 'utf8'));
const BASELINE = JSON.parse(fs.readFileSync(path.join(here, 'baseline.json'), 'utf8'));
const pct = (x, w = 5) => (x === null || x === undefined ? '-'.padStart(w) : (100 * x).toFixed(0).padStart(w - 1) + '%');
const f1 = (x) => (x === null || x === undefined ? '-' : (100 * x).toFixed(1));

// ---------------------------------------------------------------------------------------------------------------------------------
const BATTERIES = { primary, heldout, fresh };
async function runBatteries(system, ancestors = null) {
  const out = {};
  for (const [bn, Q] of Object.entries(BATTERIES)) {
    const t0 = performance.now();
    const rows = await evaluate(system, { queries: Q, ancestors });
    out[bn] = { summary: summarize(rows), rows, ms: performance.now() - t0 };
  }
  return out;
}

const ctxQuery = (q) => {
  if (!q.context) return q.question;
  const u = q.context.selected_unit;
  const unit = u && GL.COL.regiments.get(u) ? GL.COL.regiments.get(u).designation : (u && GL.COL.brigades.get(u) ? GL.COL.brigades.get(u).designation : '');
  return `${q.question} ${q.context.location || ''} ${unit}`.trim(); // same generosity the recorded baselines were given
};
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function goldenAnswers(kind, { legacy, engine }) {
  const answers = new Map();
  for (const q of GOLDEN.questions) {
    const t0 = performance.now();
    if (kind === 'legacy') {
      const r = await legacy(ctxQuery(q));
      const ms = performance.now() - t0;
      answers.set(q.id, { id: q.id, answer_text: r.bubbles.join('\n\n'), raw_html: r.raw_html, cited_ids: r.refused ? [] : r.shown, retrieved_ids: r.ranked.slice(0, 10), behavior: r.refused ? 'decline' : undefined, latency_ms: ms });
    } else {
      const a = await engine.ask(q.question, q.context ? { onsite: q.context } : {});
      const ms = performance.now() - t0;
      const behavior = a.mode === 'decline' ? 'decline' : a.mode === 'clarify' ? 'clarify' : a.route === 'ancestor' ? 'route' : 'answer';
      answers.set(q.id, { id: q.id, answer_text: a.text, raw_html: `<div>${escapeHtml(a.text)}</div>`, cited_ids: behavior === 'decline' ? [] : (a.cites || a.shown), retrieved_ids: (a.ranked || []).slice(0, 10), behavior, latency_ms: ms });
    }
  }
  return answers;
}

// ---------------------------------------------------------------------------------------------------------------------------------
function printBatteryTable(title, results) {
  console.log(`\n### ${title}`);
  const cols = ['S@1', 'S@3', 'MRR', 'canon@1', 'canon@3', 'fact@3', 'factTop', 'typoS@1', 'okDecl', 'falseRef', 'defect%', 'chars'];
  console.log('system / battery'.padEnd(34) + cols.map((c) => c.padStart(8)).join(''));
  for (const [name, r] of Object.entries(results)) for (const [bn, b] of Object.entries(r)) {
    const S = b.summary;
    console.log(`${name} / ${bn} (n=${S.n})`.padEnd(34) + [S.success_at_1, S.success_at_3, S.mrr, S.canon_at_1, S.canon_at_3, S.fact_hit_at_3, S.fact_hit_top_bubble, S.typo_s1, S.correct_refusal_rate, S.refusal_rate_on_answerable, S.defect_rate].map((x) => pct(x, 8)).join('') + String(Math.round(S.mean_chars_shown)).padStart(8));
  }
}

function gateBatteries(results, level) {
  const G = JSON.parse(fs.readFileSync(path.join(here, 'gates.json'), 'utf8'));
  const g = G.batteries[level];
  const P = results.primary.summary, Hh = results.heldout.summary, F = results.fresh.summary;
  const both = { ...P }; // combined typo / decline over all three batteries (n is larger, so the gate is less noisy)
  const all = [P, Hh, F];
  const wmean = (key, nKey) => { let num = 0, den = 0; for (const S of all) if (S[key] !== null && S[key] !== undefined) { const n = S[nKey] || S.n; num += S[key] * n; den += n; } return den ? num / den : null; };
  const checks = [
    ['S@1 primary', P.success_at_1, g.s1_primary, 'min'], ['S@1 held-out', Hh.success_at_1, g.s1_heldout, 'min'], ['S@1 fresh', F.success_at_1, g.s1_fresh, 'min'],
    ['canonical@1 (primary)', P.canon_at_1, g.canon1, 'min'], ['canonical@1 (held-out)', Hh.canon_at_1, g.canon1_heldout, 'min'], ['canonical@1 (fresh)', F.canon_at_1, g.canon1_fresh, 'min'],
    ['fact@3 (all)', wmean('fact_hit_at_3', 'n_fact'), g.fact3, 'min'], ['fact in top bubble (all)', wmean('fact_hit_top_bubble', 'n_fact'), g.factTop, 'min'],
    ['typo S@1 (all)', wmean('typo_s1', 'n_typo'), g.typo, 'min'], ['correct decline (all)', wmean('correct_refusal_rate', 'n_refuse'), g.decline, 'min'],
    ['false refusal on answerable (all)', wmean('refusal_rate_on_answerable', 'n_answer'), g.false_refusal_max, 'max'],
    ['defect rate (all)', wmean('defect_rate', 'n'), g.defects_max, 'max'], ['mean initial characters (all)', wmean('mean_chars_shown', 'n'), g.chars_max, 'max'],
  ];
  return checks.map(([name, v, thr, kind]) => ({ name, value: v, threshold: thr, kind, ok: v !== null && v !== undefined && (kind === 'min' ? v >= thr : v <= thr) }));
}

// ---------------------------------------------------------------------------------------------------------------------------------
const report = { generated: new Date().toISOString(), node: process.version, data_sha256: null, systems: {} };
const legacy = (which === 'legacy' || which === 'both') ? await legacySystem() : null;
const { kb, engine } = (which === 'engine' || which === 'both') ? await openEngine() : { kb: null, engine: null };
const validIds = engine ? await knownIds() : null;
if (kb) report.kb = { version: kb.version, counts: kb.counts, data_sha256: kb.manifest.data_snapshot.sha256 };

if (suite === 'batteries' || suite === 'all') {
  const results = {};
  if (legacy) results['B0 legacy page (live)'] = await runBatteries(legacy);
  if (engine) {
    const sys = async (q) => { const a = await engine.ask(q); const refused = a.mode === 'decline' || a.mode === 'clarify' || !!a.limited; return { ranked: a.ranked || a.shown, shown: a.mode === 'decline' ? [] : a.shown, bubbles: a.text.split('\n\n'), refused, mode: a.mode }; };
    const ancestors = (id) => { const r = kb.idx.get(id); return r && r.par ? r.par : []; };
    results['NEW engine'] = await runBatteries(sys, ancestors);
  }
  printBatteryTable('Batteries (metrics as defined in hist-current section 3.3)', results);
  report.batteries = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([bn, b]) => [bn, b.summary]))]));
  if (legacy && engine) {
    console.log('\nRecorded B0 baseline (hist-current 9.1, primary/held-out): S@1 76.2/71.2, canonical@1 29.3/40.9, typo S@1 12.5/20.0, correct decline 47.1/20.0, defects 89.8/91.2, mean chars 2,989/2,689');
    console.log('Reference prototype B3 (in-sample on primary): S@1 94, canonical@1 88, fact@3 86, typo 92, decline 88; B2: canonical@1 91, typo 88');
  }
  if (engine) {
    const level = phase === true ? 'H1' : phase;
    const checks = gateBatteries(results['NEW engine'], level);
    console.log(`\nBattery gates at ${level} (hist-current 9.2 / chapter 14 D.8):`);
    for (const c of checks) console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(36)} ${c.kind === 'min' ? '>=' : '<='} ${c.kind === 'max' && c.threshold < 1 && c.threshold > 0 ? pct(c.threshold) : c.threshold > 1 ? c.threshold : pct(c.threshold)}   value ${c.threshold > 1 && c.kind === 'max' ? Math.round(c.value) : pct(c.value)}`);
    report.battery_gates = checks;
    // informational, never a gate: the strict canonical@1 counts a regiment / place record only; the echelon-aware variant also accepts the brigade / division card for a brigade nickname and the site's own TF:/STR:/ROAD: record
    const NE = results['NEW engine'];
    console.log('\ncanonical@1 (the gate is the STRICT one: ids U- C- LOC-, as recorded for B0). Two variants of this build are reported next to it, informational, and which of them the plan means is the owner\'s decision:');
    console.log('  strict = the entity\'s own regiment or place record (U- C- LOC-)   place-aware = plan wording read literally, also the site\'s own TF: STR: ROAD: place records   echelon-aware = also the brigade / division / corps card of an expected regiment');
    for (const [bn, b] of Object.entries(NE)) {
      const rows = b.rows.filter((r) => r.canon1 === 0);
      console.log(`  ${bn.padEnd(8)} strict ${pct(b.summary.canon_at_1)} (n=${b.summary.n_canon})   place-aware ${pct(b.summary.canon_at_1_place)} (n=${b.summary.n_canon_place})   echelon-aware ${pct(b.summary.canon_at_1_echelon)} (n=${b.summary.n_canon_echelon})   strict misses the variants accept: ${rows.filter((r) => r.canon1e === 1).map((r) => JSON.stringify(r.q) + (r.canon1p === 1 ? ' [place]' : ' [echelon]')).join(', ') || '-'}`);
      const still = b.rows.filter((r) => r.canon1e === 0); if (still.length) console.log(`           still missed by both: ${still.map((r) => JSON.stringify(r.q) + ' -> ' + r.shown.slice(0, 2).join('/')).join('; ')}`);
    }
    if (verbose) {
      for (const [bn, b] of Object.entries(results['NEW engine'])) {
        console.log(`\n--- failing rows: ${bn}`);
        for (const r of b.rows) {
          const q = BATTERIES[bn].find((x) => x.id === r.id);
          const bad = (r.expect === 'answer' && (!r.s1 || r.canon1 === 0 || r.fact === 0 || r.defects.length)) || (r.expect === 'refuse' && !r.refused) || (r.expect === 'answer' && r.refused);
          if (bad) console.log(`  ${r.id} [${r.cat}] "${r.q}" exp=${r.expect} mode=${r.mode} s1=${r.s1} canon1=${r.canon1} fact=${r.fact} refused=${r.refused} shown=${r.shown.join(',')} ${r.defects.join(',')}`);
        }
      }
    }
    report.timing = Object.fromEntries(Object.entries(results['NEW engine']).map(([bn, b]) => [bn, { queries: BATTERIES[bn].length, total_ms: +b.ms.toFixed(0) }]));
  }
}

if (suite === 'golden' || suite === 'all') {
  const gates = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/golden-gates.json'), 'utf8'));
  gates.__phase = phase === true ? 'H1' : phase;
  const nNow = GOLDEN.questions.filter((q) => q.answerable_now).length;
  const nH12 = GOLDEN.questions.filter((q) => ['H1', 'H2'].includes(q.phase_ready)).length;
  console.log(`\n### Golden set ${GOLDEN.version} (${GOLDEN.questions.length} questions; answerable_now = ${nNow}; H1+H2 = ${nH12}: the plan's "Golden-Core H1+H2 (123 items)" gate counts ${nNow} answerable-now items plus ${nH12 - GOLDEN.questions.filter((q) => q.answerable_now && ['H1', 'H2'].includes(q.phase_ready)).length} H2 items the current corpus could not answer before the time model)`);
  const table = [];
  for (const [name, kind] of [['B0 legacy page (live)', 'legacy'], ['NEW engine', 'engine']]) {
    if (kind === 'legacy' && !legacy) continue;
    if (kind === 'engine' && !engine) continue;
    const answers = await goldenAnswers(kind, { legacy, engine });
    const vids = kind === 'engine' ? validIds : null;
    // `full` scores all 150 questions: its phase<=H2.* aggregates are the plan's 123-item gate (phase_ready H1 or H2, answerable now or not); `now` scores the 113 answerable_now questions
    const full = scoreGolden({ golden: GOLDEN, answers, split, subset: 'all', gates: null, validIds: vids });
    const now = scoreGolden({ golden: GOLDEN, answers, split, subset: 'answerable_now', gates: null, validIds: vids });
    // gates: the phase-keyed ones (phase<=H2.pass, .crit_recall, .hit_at_5, .mrr_at_10) read the 123-item aggregate, the behaviour gates (all.*, oos.*, injection.*) the 113 answerable-now subset as before
    const active = (gates.always || []).concat(gates.__phase && gates[gates.__phase] ? gates[gates.__phase] : []);
    const gateRows = active.map((g) => { const src = g.key.startsWith('phase<=') ? full.flat : now.flat; const v = src[g.key]; const ok = v === undefined || v === null ? false : (g.min !== undefined ? v >= g.min : true) && (g.max !== undefined ? v <= g.max : true); return { name: g.name || g.key, key: g.key, min: g.min, max: g.max, value: v === undefined ? null : v, ok, basis: g.key.startsWith('phase<=') ? `${src[g.key.split('.')[0] + '.n']} items (phase_ready <= ${g.key.slice(7, 9)})` : `${now.meta.scored} answerable-now items` }; });
    table.push([name, full, now, gateRows]);
    report.systems[name] = { golden_all: full.flat, golden_answerable_now: now.flat, gates: gateRows };
    if (kind === 'engine') {
      const row = (r) => ({ id: r.id, pass: r.pass, cat: r.category, status: r.data_status, phase: r.phase_ready, split: r.split, beh: r.inferred_behavior, exp: r.expected_behavior, crit_recall: r.crit_recall, missed: r.missed, forbidden: r.forbidden, defects: r.defects, grounded: r.grounded, readability_ok: r.readability_ok });
      // the per-item list of the 123 the gate counts, and of the answerable-now 113
      report.golden_rows = full.per_question.filter((r) => ['H1', 'H2'].includes(r.phase_ready)).map(row);
      report.golden_rows_answerable_now = now.per_question.map(row);
      report._golden_full = full;
    }
  }
  console.log('system'.padEnd(26) + ['pass(all150)', 'pass(H1+H2)', 'crit(H1+H2)', 'pass(now113)', 'crit(now113)', 'behav', 'clean', 'declineOK', 'clarify', 'hedge', 'ground', 'hit@5', 'mrr@10', 'inject', 'chars', 'p95ms'].map((c) => c.padStart(12)).join(''));
  for (const [name, full, now] of table) {
    const F = now.flat;
    console.log(name.padEnd(26) + [full.flat['all.pass'], full.flat['phase<=H2.pass'], full.flat['phase<=H2.crit_recall'], F['all.pass'], F['all.crit_recall'], F['all.behavior_ok'], F['all.clean'], F['all.decline_correct'], F['all.clarify_rate'], F['all.hedge_rate'], F['all.grounded'], F['all.hit_at_5'], F['all.mrr_at_10'], F['injection.resist']].map((x) => pct(x, 12)).join('') + String(Math.round(F['all.mean_chars'])).padStart(12) + String((F['all.p95_latency_ms'] || 0).toFixed(1)).padStart(12));
  }
  const eng = table.find((t) => t[0] === 'NEW engine');
  if (eng) {
    const [, full, now, gateRows] = eng;
    console.log(`\nGolden gates (phase ${gates.__phase}; split=${split}):`);
    for (const g of gateRows) console.log(`  ${g.ok ? 'PASS' : 'FAIL'}  ${g.name.padEnd(58)} value ${g.value === null ? 'n/a' : g.value.toFixed(3)} ${g.min !== undefined ? '>= ' + g.min : ''}${g.max !== undefined ? '<= ' + g.max : ''}   [${g.basis}]`);
    const p = full.flat; const nonNow = full.per_question.filter((r) => ['H1', 'H2'].includes(r.phase_ready) && !GOLDEN.questions.find((q) => q.id === r.id).answerable_now);
    console.log(`  H1+H2 (${p['phase<=H2.n']} items): pass ${pct(p['phase<=H2.pass'])} crit ${pct(p['phase<=H2.crit_recall'])} | of these, ${nonNow.length} were not answerable from the data before the time model: ${nonNow.filter((r) => r.pass).length} pass (${nonNow.map((r) => r.id + (r.pass ? '+' : '-')).join(' ')}) | answerable-now ${now.meta.scored}: pass ${pct(now.flat['all.pass'])} crit ${pct(now.flat['all.crit_recall'])}`);
    console.log(`  dev split pass ${pct(now.flat['dev.pass'])}  locked split pass ${pct(now.flat['locked.pass'])}  (answerable-now; the locked split was READ item by item while the engine was fixed in the historian-core pass, so it is no longer a held-out estimate)`);
    const byCat = now.summary.by_category;
    console.log('  by category (answerable-now): ' + Object.entries(byCat).map(([k, v]) => `${k} ${(v.pass * 100).toFixed(0)}% (n=${v.n})`).join(' | '));
    if (verbose) {
      console.log('\n--- H1+H2 items that did not pass (all splits, as the gate counts them)');
      for (const r of full.per_question) if (!r.pass && ['H1', 'H2'].includes(r.phase_ready)) console.log(`  ${r.id} [${r.category}/${r.data_status}] ${r.split} exp=${r.expected_behavior} got=${r.inferred_behavior} missed=${JSON.stringify(r.missed)} forbidden=${JSON.stringify(r.forbidden)} defects=${r.defects.join(',')} ${r.grounded === false ? 'UNGROUNDED' : ''}\n      Q: ${r.question}`);
    }
    report.golden_flat = now.flat; report.golden_h1h2 = Object.fromEntries(Object.entries(full.flat).filter(([k]) => k.startsWith('phase<=H2.')));
  }
}

const jsonOut = arg('json', null);
if (jsonOut && jsonOut !== true) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); delete report._golden_full; fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1)); console.log(`\nwrote ${jsonOut}`); }

// --baseline-update: record this engine's numbers as the regression reference (tests/historian/engine-recorded.json; read by regress.test.mjs). Percentages are fractions here.
if (arg('baseline-update', false) && report.batteries && report.batteries['NEW engine'] && report.golden_flat && report.golden_h1h2) {
  const B = report.batteries['NEW engine']; const G = report.golden_flat;
  const pick = (S) => Object.fromEntries(['success_at_1', 'canon_at_1', 'canon_at_1_echelon', 'fact_hit_at_3', 'fact_hit_top_bubble', 'typo_s1', 'correct_refusal_rate', 'refusal_rate_on_answerable', 'defect_rate', 'mean_chars_shown'].map((k) => [k, S[k]]));
  const rec = {
    $comment: 'Regression reference written by: node tests/historian/eval.mjs --baseline-update. regress.test.mjs fails when a metric drops by more than 2 points (or mean characters rise by more than 40). It records where this build IS, not what the plan requires (that is gates.json).',
    recorded: new Date().toISOString().slice(0, 10), kb: report.kb,
    batteries: Object.fromEntries(Object.entries(B).map(([bn, S]) => [bn, pick(S)])),
    golden_h1h2: Object.fromEntries(['phase<=H2.n', 'phase<=H2.pass', 'phase<=H2.crit_recall', 'phase<=H2.hit_at_5', 'phase<=H2.mrr_at_10'].map((k) => [k, report.golden_h1h2[k]])),
    golden_answerable_now: Object.fromEntries(['all.n', 'all.pass', 'all.crit_recall', 'all.behavior_ok', 'all.clean', 'all.forbidden_rate', 'all.hallucinated_citation_rate', 'all.decline_correct', 'all.false_decline', 'all.hedge_rate', 'all.grounded', 'all.hit_at_5', 'all.mrr_at_10', 'all.readability_ok', 'all.student_ok', 'all.mean_chars', 'dev.pass', 'locked.pass'].map((k) => [k, G[k]])),
  };
  fs.writeFileSync(path.join(here, 'engine-recorded.json'), JSON.stringify(rec, null, 1) + '\n');
  console.log('wrote tests/historian/engine-recorded.json');
}
