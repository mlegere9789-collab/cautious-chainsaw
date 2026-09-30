#!/usr/bin/env node
// eval.mjs - evaluation harness for Ask the Historian (H0-H2, current corpus).
//   node tests/historian/eval.mjs [--system engine|legacy|both] [--suite batteries|golden|all] [--split all|dev|locked] [--gates H1|H2] [--json out.json] [--verbose] [--baseline-update]
// Runs (1) the hist-current batteries: primary (118, tuned-on in the prototype), held-out (57) and the FRESH battery (written for this build before the
// engine existed) and (2) the golden set (150 questions; the answerable_now subset is the gated one), against the new engine and, live, against the deployed
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
    console.log('\ncanonical@1 strict (the plan metric)  vs  echelon-aware variant (this build, informational):');
    for (const [bn, b] of Object.entries(NE)) {
      const rows = b.rows.filter((r) => r.canon1 === 0);
      console.log(`  ${bn.padEnd(8)} strict ${pct(b.summary.canon_at_1)} (n=${b.summary.n_canon})   echelon-aware ${pct(b.summary.canon_at_1_echelon)} (n=${b.summary.n_canon_echelon})   strict misses that the variant accepts: ${rows.filter((r) => r.canon1e === 1).map((r) => JSON.stringify(r.q)).join(', ') || '-'}`);
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
  console.log(`\n### Golden set ${GOLDEN.version} (150 questions; answerable_now = ${GOLDEN.questions.filter((q) => q.answerable_now).length})`);
  const table = [];
  for (const [name, kind] of [['B0 legacy page (live)', 'legacy'], ['NEW engine', 'engine']]) {
    if (kind === 'legacy' && !legacy) continue;
    if (kind === 'engine' && !engine) continue;
    const answers = await goldenAnswers(kind, { legacy, engine });
    const vids = kind === 'engine' ? validIds : null;
    const full = scoreGolden({ golden: GOLDEN, answers, split, subset: 'all', gates: null, validIds: vids });
    const now = scoreGolden({ golden: GOLDEN, answers, split, subset: 'answerable_now', gates, validIds: vids });
    table.push([name, full, now]);
    report.systems[name] = { golden_all: full.flat, golden_answerable_now: now.flat, gates_answerable_now: now.gates };
    if (kind === 'engine') report.golden_rows = now.per_question.map((r) => ({ id: r.id, pass: r.pass, cat: r.category, beh: r.inferred_behavior, exp: r.expected_behavior, missed: r.missed, forbidden: r.forbidden, defects: r.defects }));
    if (kind === 'engine') { report._golden_full = now; }
  }
  console.log('system'.padEnd(26) + ['pass(all150)', 'pass(now)', 'crit(now)', 'behav', 'clean', 'declineOK', 'clarify', 'hedge', 'ground', 'hit@5', 'mrr@10', 'inject', 'chars', 'p95ms'].map((c) => c.padStart(11)).join(''));
  for (const [name, full, now] of table) {
    const F = now.flat;
    console.log(name.padEnd(26) + [full.flat['all.pass'], F['all.pass'], F['all.crit_recall'], F['all.behavior_ok'], F['all.clean'], F['all.decline_correct'], F['all.clarify_rate'], F['all.hedge_rate'], F['all.grounded'], F['all.hit_at_5'], F['all.mrr_at_10'], F['injection.resist']].map((x) => pct(x, 11)).join('') + String(Math.round(F['all.mean_chars'])).padStart(11) + String((F['all.p95_latency_ms'] || 0).toFixed(1)).padStart(11));
  }
  const eng = table.find((t) => t[0] === 'NEW engine');
  if (eng) {
    const now = eng[2];
    console.log(`\nGolden gates (phase ${gates.__phase}, answerable_now subset, split=${split}):`);
    for (const g of now.gates) console.log(`  ${g.ok ? 'PASS' : 'FAIL'}  ${g.name.padEnd(58)} value ${g.value === null ? 'n/a' : g.value.toFixed(3)} ${g.min !== undefined ? '>= ' + g.min : ''}${g.max !== undefined ? '<= ' + g.max : ''}`);
    console.log(`  dev split pass ${pct(now.flat['dev.pass'])}  locked split pass ${pct(now.flat['locked.pass'])}  (locked: aggregate only)`);
    const byCat = now.summary.by_category;
    console.log('  by category: ' + Object.entries(byCat).map(([k, v]) => `${k} ${(v.pass * 100).toFixed(0)}% (n=${v.n})`).join(' | '));
    if (verbose) {
      console.log('\n--- golden answerable_now items that did not pass (dev split only unless --split all)');
      for (const r of now.per_question) if (!r.pass && (split !== 'locked')) console.log(`  ${r.id} [${r.category}] ${r.split} exp=${r.expected_behavior} got=${r.inferred_behavior} missed=${JSON.stringify(r.missed)} forbidden=${JSON.stringify(r.forbidden)} defects=${r.defects.join(',')} ${r.grounded === false ? 'UNGROUNDED' : ''}\n      Q: ${r.question}`);
    }
    if (arg('json', null)) report.golden_flat = now.flat;
  }
}

const jsonOut = arg('json', null);
if (jsonOut && jsonOut !== true) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); delete report._golden_full; fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1)); console.log(`\nwrote ${jsonOut}`); }

// --baseline-update: record this engine's numbers as the regression reference (tests/historian/engine-recorded.json; read by regress.test.mjs). Percentages are fractions here.
if (arg('baseline-update', false) && report.batteries && report.batteries['NEW engine'] && report.golden_flat) {
  const B = report.batteries['NEW engine']; const G = report.golden_flat;
  const pick = (S) => Object.fromEntries(['success_at_1', 'canon_at_1', 'canon_at_1_echelon', 'fact_hit_at_3', 'fact_hit_top_bubble', 'typo_s1', 'correct_refusal_rate', 'refusal_rate_on_answerable', 'defect_rate', 'mean_chars_shown'].map((k) => [k, S[k]]));
  const rec = {
    $comment: 'Regression reference written by: node tests/historian/eval.mjs --baseline-update. regress.test.mjs fails when a metric drops by more than 2 points (or mean characters rise by more than 40). It records where this build IS, not what the plan requires (that is gates.json).',
    recorded: new Date().toISOString().slice(0, 10), kb: report.kb,
    batteries: Object.fromEntries(Object.entries(B).map(([bn, S]) => [bn, pick(S)])),
    golden_answerable_now: Object.fromEntries(['all.n', 'all.pass', 'all.crit_recall', 'all.behavior_ok', 'all.clean', 'all.forbidden_rate', 'all.hallucinated_citation_rate', 'all.decline_correct', 'all.false_decline', 'all.hedge_rate', 'all.grounded', 'all.hit_at_5', 'all.mrr_at_10', 'all.readability_ok', 'all.mean_chars', 'dev.pass', 'locked.pass'].map((k) => [k, G[k]])),
  };
  fs.writeFileSync(path.join(here, 'engine-recorded.json'), JSON.stringify(rec, null, 1) + '\n');
  console.log('wrote tests/historian/engine-recorded.json');
}
