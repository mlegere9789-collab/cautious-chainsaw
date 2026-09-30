#!/usr/bin/env node
// TM-V1..V21 validators (WP-TIME-20) run against legacy/dist data and pages, the candidate anchors and the module.
// CANDIDATE, report-only by default: nothing here changes a served file or approves anything.
//
//   node tools/time/validate.mjs                 print the rule table (exit 0 unless the anchors themselves are invalid)
//   node tools/time/validate.mjs --strict        exit 1 when any error-severity rule fails (TX-15 target: zero on the rebuilt site; the frozen legacy fails by design)
//   node tools/time/validate.mjs --report        also regenerate docs/editorial/time-audit.md and tools/time/build/time-report.json
//   node tools/time/validate.mjs --baseline      record today's counts in tools/time/validate.baseline.json
//   node tools/time/validate.mjs --check         compare with the baseline; exit 1 when any rule got worse (regression detection)
//   node tools/time/validate.mjs --json          machine-readable output
import fs from 'node:fs';
import { P, readJson, readText, readCsv, parseJulyClock, mdTable, mean, median, rms, r1, writeIfChanged, parseArgs, hm12 as fmt12 } from './lib.mjs';
import model from '../../src/lib/time/index.js';
import { buildContext, runAll, kinematics, legacyStoreClockMod, legacyFormulaMod } from './rules.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const doc = readJson(P('data-src', 'time', 'time_anchors.json'));
const ctx = buildContext(model, doc);
const results = runAll(ctx);
const byId = Object.fromEntries(results.map((r) => [r.id, r]));

const ICON = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', info: 'INFO', skip: 'SKIP', error: 'ERR ' };
if (flags.json) console.log(JSON.stringify(results.map(({ details, data, ...r }) => r), null, 2));
else {
  console.log(`TM-V1..V21 on ${ctx.model.version} dv${ctx.model.dv} (CANDIDATE anchors) against legacy/dist`);
  for (const r of results) console.log(`${ICON[r.status] || r.status}  ${r.id.padEnd(6)} ${String(r.count ?? '').padStart(4)}  ${r.headline}`);
}

// ------------------------------------------------------------------ baseline / check
const BASE = P('tools', 'time', 'validate.baseline.json');
const snapshot = Object.fromEntries(results.map((r) => [r.id, { status: r.status, count: r.count }]));
if (flags.baseline) { fs.writeFileSync(BASE, JSON.stringify({ note: 'today (frozen legacy + candidate anchors); regenerate with --baseline', model: ctx.model.version, rules: snapshot }, null, 2) + '\n'); console.log('baseline written'); }
let regress = 0;
if (flags.check) {
  const base = readJson(BASE).rules, worse = [], better = [];
  for (const [id, now] of Object.entries(snapshot)) { const b = base[id]; if (!b) { worse.push(`${id}: new rule`); continue; } if (now.count > b.count || (b.status === 'pass' && now.status !== 'pass')) worse.push(`${id}: ${b.status}/${b.count} -> ${now.status}/${now.count}`); else if (now.count < b.count || now.status !== b.status) better.push(`${id}: ${b.status}/${b.count} -> ${now.status}/${now.count}`); }
  if (better.length) console.log('improved: ' + better.join('; '));
  if (worse.length) { console.error('REGRESSION vs tools/time/validate.baseline.json:\n  ' + worse.join('\n  ')); regress = 1; } else console.log('no regression vs the baseline');
}

// ------------------------------------------------------------------ audit report
function audit() {
  const disc = ctx.disc, m = ctx.model;
  const norm = (s) => s.replace(/(\d)a$/, '$1am').replace(/(\d)p$/, '$1pm');
  const MATCHED = ['RELABEL', 'RELABEL-CONTESTED', 'TEXT-VS-LABEL'];
  const matched = disc.filter((r) => MATCHED.includes(r.class));
  // four clocks vs the specialist's real best time (single event matches)
  const within = (arr, k) => arr.filter((x) => x <= k).length;
  const lab = matched.map((r) => Math.abs(+r.delta_hours_real_minus_label) * 60);
  const map = matched.map((r) => Math.abs(+r.delta_hours_real_minus_mapclock) * 60);
  const f5 = matched.map((r) => Math.abs(parseJulyClock(norm(r.real_best)) - parseJulyClock(norm(r.site_5min_formula_clock))));
  const prop = matched.map((r) => Math.abs(parseJulyClock(norm(r.real_best)) - Math.round(m.tickToMinutes(+r.site_tick))));
  // independent recomputation of the two legacy formulas from the tick alone (no CSV)
  let storeOk = 0, formOk = 0;
  for (const r of matched) { const t = +r.site_tick, csvMap = parseJulyClock(norm(r.site_map_clock_getTickTime)), csv5 = parseJulyClock(norm(r.site_5min_formula_clock)); if (csvMap % 1440 === legacyStoreClockMod(t)) storeOk++; if (csv5 % 1440 === legacyFormulaMod(t)) formOk++; }
  const dur = (min) => (min < 120 ? `${Math.round(min)} min` : `${r1(min / 60)} h`);
  const stat = (name, a) => [name, dur(mean(a)), dur(median(a)), dur(rms(a)), `${within(a, 30)}/${a.length}`, `${within(a, 60)}/${a.length}`];
  const classes = {}; for (const r of disc) classes[r.class] = (classes[r.class] || 0) + 1;
  const order = ['RELABEL', 'RELABEL-CONTESTED', 'MISORDERED', 'COMPOSITE', 'CONTEXT', 'TEXT-VS-LABEL', 'WRONG-DAY', 'UNVERIFIED-QUOTE'];
  // in-sample and leave-one-out
  const resid = prop, A = m.anchors, loo = [];
  for (let i = 1; i < A.length - 1; i++) { if (A[i].status === 'D') continue; const p = A[i - 1], n = A[i + 1]; loo.push({ tick: A[i].tick, status: A[i].status, err: A[i].minutes - (p.minutes + (n.minutes - p.minutes) * (A[i].tick - p.tick) / (n.tick - p.tick)) }); }
  const looAbs = loo.map((x) => Math.abs(x.err));
  const worstLoo = [...loo].sort((a, b) => Math.abs(b.err) - Math.abs(a.err)).slice(0, 8);
  // typed claims elsewhere (walkthrough, monuments, markers, turning points, sandbox, vignettes) vs the proposed clock
  const oc = readCsv(P('docs', 'plan', 'data', 'time-facts-otherclaims.csv')).filter((r) => r.minutes_claimed_minus_proposed_clock !== '');
  const ocProp = oc.map((r) => Math.abs(+r.minutes_claimed_minus_proposed_clock)), ocMap = oc.map((r) => Math.abs(+r.minutes_claimed_minus_map_clock));
  const typedSub = oc.filter((r) => ['walkthrough stop', 'monument tooltip', 'timeline marker'].includes(r.kind));
  const tsProp = typedSub.map((r) => Math.abs(+r.minutes_claimed_minus_proposed_clock)), tsMap = typedSub.map((r) => Math.abs(+r.minutes_claimed_minus_map_clock));
  // triage
  const triage = readJson(P('data-src', 'time', 'triage.json')).rows;
  const discByTick = Object.fromEntries(disc.map((r) => [+r.site_tick, r]));
  const suggested = (t) => { const r = discByTick[t]; if (!r || !r.real_best) return null; const real = parseJulyClock(norm(r.real_best)); return real == null ? null : Math.round(m.clockToTick(real)); };
  const triageRows = triage.map((row) => {
    const tk = row.ticks.filter((t) => typeof t === 'number');
    const sug = tk.map((t) => { const s = suggested(t); const cur = m.format(t, 'time', { roundMin: 5 }); return `t${t} (${cur}, ${m.format(t, 'day')})${s != null && ['MISORDERED', 'WRONG-DAY'].includes(row.class) ? ' -> about t' + s : ''}`; });
    return [row.class, row.ticks.map((t) => (typeof t === 'number' ? 't' + t : t)).join(', '), row.today, row.evidence, sug.length && ['MISORDERED', 'WRONG-DAY'].includes(row.class) ? sug.join('; ') : row.action, row.decides, 'proposed'];
  });
  const k = kinematics(ctx);
  const surf = fs.existsSync(P('tools', 'time', 'build', 'surfaces.json')) ? readJson(P('tools', 'time', 'build', 'surfaces.json')) : null;
  const wrongDay = new Set(disc.filter((r) => r.class === 'WRONG-DAY').map((r) => +r.site_tick));
  const nonMatched = disc.filter((r) => !MATCHED.includes(r.class));

  const ruleRows = results.map((r) => [r.id, r.severity, ICON[r.status] || r.status, r.count ?? '', r.today, r.headline]);
  const md = `# Time audit: the clock and historical accuracy of the legacy site

> **Status: CANDIDATE, unreviewed. Nothing in this document has been approved by the owner or by a historian, and nothing here ships until they approve it (D-TIME, D-HIST-REVIEW).** It is generated by \`node tools/time/validate.mjs --report\` from the frozen legacy site (\`legacy/dist\`, bundle \`${ctx.bundleName}\`), the 33 proposed anchors (\`data-src/time/time_anchors.json\`, version ${m.version}, dv ${m.dv}) and the time-facts specialist's tables (\`docs/plan/data/time-facts*.csv\`). Do not edit by hand: re-run the script. Real times are the specialist's proposals; 32 of the 102 single-event comparators are the specialist's own estimates and every historical time is unreviewed.

## 1. How far the clocks on the site are from the sourced real times

Over the **${matched.length}** chronology events that map to a single real event (RELABEL ${classes['RELABEL']}, RELABEL-CONTESTED ${classes['RELABEL-CONTESTED']}, TEXT-VS-LABEL ${classes['TEXT-VS-LABEL']}); absolute difference between the clock and the specialist's real best time:

${mdTable(['clock the user sees', 'mean abs error', 'median', 'RMS', 'within 30 min', 'within 60 min'], [stat('typed chronology label (event card)', lab), stat('map clock getTickTime (toolbar, time bar, mobile)', map), stat('5-minute formula (Compare, Ledger, Camera)', f5), stat('proposed 33-anchor model (this candidate)', prop)])}

- **Events within 30 minutes of the sourced real time: label ${within(lab, 30)}/${matched.length}, map clock ${within(map, 30)}/${matched.length}, 5-minute formula ${within(f5, 30)}/${matched.length}, proposed model ${within(prop, 30)}/${matched.length}.** The specialist reports 5, 1, 7 and 86.
- Independent check: the two legacy formulas recomputed from the tick alone reproduce the specialist's printed columns for ${storeOk}/${matched.length} (map clock) and ${formOk}/${matched.length} (5-minute formula) events.
- **In-sample** fit of the proposal (anchors were chosen using these same events): mean abs error **${r1(mean(prop))} min**, median ${r1(median(prop))} min, RMS ${r1(rms(prop))} min; within 15/30/45/60 min: ${[15, 30, 45, 60].map((x) => within(prop, x)).join('/')} of ${matched.length}.
- **Leave-one-out** (each of ${loo.length} interior non-design anchors predicted from its two neighbours): mean abs error **${r1(mean(looAbs))} min**, median ${r1(median(looAbs))} min, RMS **${r1(rms(loo.map((x) => x.err)))} min**. Least predictable: ${worstLoo.map((x) => `t${x.tick} ${x.err >= 0 ? '+' : ''}${Math.round(x.err)}`).join(', ')} (true minus predicted, minutes). These are the anchors next to gaps and the first to review.
- Typed real clocks elsewhere in the product (walkthrough stops, monument tooltips, timeline markers, Turning Points, Sandbox presets, vignettes): ${oc.length} carry a clock; median gap to the proposed clock **${median(ocProp)} min** (${within(ocProp, 30)}/${oc.length} within 30 min) versus **${median(ocMap)} min** to today's map clock (${within(ocMap, 30)}/${oc.length}). For the walkthrough, monument and marker subset (${typedSub.length}): median ${median(tsProp)} min (${within(tsProp, 30)}/${typedSub.length}) versus ${median(tsMap)} min (${within(tsMap, 30)}/${typedSub.length}).
- Caveats: the comparators are proposals, not reviewed facts; in-sample figures flatter the model; leave-one-out RMS is the honest predictive number for anchors that sit between two sourced neighbours.

## 2. Chronology classes (137 events)

${mdTable(['class', 'events', 'what a clock change does'], order.map((cl) => [cl, classes[cl] || 0, { RELABEL: 'repaired mechanically by the model (label regenerated)', 'RELABEL-CONTESTED': 'repaired, but the real time itself is contested: needs the historian', MISORDERED: 'not repairable by any clock: the event sits on the wrong side of a neighbour', COMPOSITE: 'not repairable: several real moments merged into one tick', CONTEXT: 'no single clock time', 'TEXT-VS-LABEL': "label contradicts the record's own text; self-heals when labelled from the clock", 'WRONG-DAY': 'not repairable: the event belongs to another day', 'UNVERIFIED-QUOTE': 'quotation with no source found' }[cl]]))}

Content defects a clock cannot fix: **${(classes['MISORDERED'] || 0) + (classes['WRONG-DAY'] || 0) + (classes['COMPOSITE'] || 0) + (classes['UNVERIFIED-QUOTE'] || 0)}** of ${disc.length} events (MISORDERED ${classes['MISORDERED']}, WRONG-DAY ${classes['WRONG-DAY']}, COMPOSITE ${classes['COMPOSITE']}, UNVERIFIED-QUOTE ${classes['UNVERIFIED-QUOTE']}). TM-V6 rebuilds the ordering independently: ${byId['TM-V6'].headline}. Events on the chain that the specialist classed MISORDERED/WRONG-DAY: ${byId['TM-V6'].data.onlySpec.map((t) => 't' + t).join(', ') || 'none'} (a local misorder can hide inside a globally consistent chain); events off the chain that the specialist did not class: ${byId['TM-V6'].data.onlyMine.map((t) => 't' + t).join(', ')} (mostly RELABEL-CONTESTED rows whose real time is itself contested, so the ordering evidence is weak there).

## 3. Validators TM-V1..V21 against the frozen legacy site ("today")

Report-only baseline: the legacy site is expected to fail; the counts are what CI must drive to zero on the rebuilt site (TX-15). Baseline file: \`tools/time/validate.baseline.json\`.

${mdTable(['rule', 'severity', 'status', 'count', 'chapter 04 says today', 'measured now'], ruleRows)}

### Tick+clock pairs (TM-V3)

${byId['TM-V3'].headline}. Definitions: an explicit clock expression ("10:15am", "3 p.m.") in a string that sits next to a tick in the data files or in JS/HTML literals; tolerance is the larger of 20 min and twice the interpolated sigma (45 min when the text says "about"); the chronology \`time\` labels are excluded here and tested by TM-V4. The counts differ from the specialist's 355/151 because that scan also counted the ${ctx.chron.length} labels and other structures; the definition here is stated so the number can be re-run.

Worst offenders (first 20):

${mdTable(['source', 'tick', 'field', 'clock in the text', 'model at that tick', 'off (min)'], (byId['TM-V3'].data.sample || []).sort((a, b) => b.diff - a.diff).slice(0, 20).map((p) => [p.source, p.tick, p.field, p.clock, p.model, p.diff]))}

### Moments referenced at different ticks (TM-V5)

${mdTable(['moment', 'ticks in use', 'spread', 'ok'], byId['TM-V5'].data.groups.map((g) => [g.title, g.ticks.join(' / '), g.spread, g.ok ? 'yes' : 'no']))}

### Keyframe speeds (TM-V7)

Caps 150/250/400 m/min (infantry/artillery/cavalry); ${k.pairs} consecutive keyframe pairs, ${k.ge100} moving 100 m or more. **${k.uniform.length}** exceed the cap at a uniform 5 minutes per tick and **${k.proposed.length}** under the proposed clock (${k.proposed.filter((x) => x.seam).length} of them a day seam: those are scene cuts between the Day-N and Day-N+1 files and need \`snap\`). Each is either a data defect (add intermediate keyframes) or evidence that neighbouring anchors sit too close.

${mdTable(['unit', 'ticks', 'metres', 'minutes (proposed)', 'm/min', 'note'], k.proposed.map((x) => [x.id, `${x.from}-${x.to}`, x.m, x.min, x.speed, x.seam ? 'day seam' : '']))}

## 4. Triage of the content defects (chapter 04 section 6)

Who decides: R = the named historical reviewer, O = the owner, D = the developer. Every row is \`proposed\`. "About tN" is the model's tick for the specialist's real best time and is safe only after a map spot-check of that frame.

${mdTable(['class', 'ticks', 'today', 'evidence', 'proposed action (suggested tick)', 'decides', 'state'], triageRows)}

## 5. Formula inventory

${surf ? `${surf.implementations.length} independent tick-to-clock implementations (see \`docs/editorial/formula-inventory.md\`): ${surf.implementations.map((i) => `${i.id} ${i.name}`).join('; ')}.` : 'Run `node tools/time/surfaces.mjs` first.'}

## 6. What this audit does not establish

- It does not verify any 1863 time: the real times are the specialist's proposals (H/M/L confidence 18/66/45; Pfanz, Coddington, Sears, Hessler, Wert, Gottfried and most Official Records were not read). Only a named historian can turn a row from \`proposed\` to \`signed\`.
- It does not test the running app: no browser was used. Surfaces are counted by reading the frozen bundle and pages.
- TM-V19 and TM-V20 need the moments registry (WP-TIME-05); TM-V21 finds quotations heuristically and cannot judge whether a wording is correct.
`;
  writeIfChanged(P('docs', 'editorial', 'time-audit.md'), md);
  writeIfChanged(P('tools', 'time', 'build', 'time-report.json'), JSON.stringify({ model: m.version, results: results.map(({ data, ...r }) => ({ ...r, data: r.id === 'TM-V3' ? { ...data, sample: undefined } : data })), metrics: { inSample: { n: matched.length, meanAbsMin: r1(mean(prop)), medianMin: median(prop), rmsMin: r1(rms(prop)), within30: within(prop, 30) }, looAnchors: { n: loo.length, meanAbsMin: r1(mean(looAbs)), rmsMin: r1(rms(loo.map((x) => x.err))) }, within30: { label: within(lab, 30), mapClock: within(map, 30), fiveMinute: within(f5, 30), proposed: within(prop, 30) } } }, null, 1) + '\n');
  console.log('audit written: docs/editorial/time-audit.md');
}
if (flags.report) audit();

const failedStrict = results.filter((r) => r.severity === 'error' && (r.status === 'fail' || r.status === 'error'));
const anchorBroken = byId['TM-V1'].status === 'fail' || byId['TM-V1'].status === 'error';
if (flags.strict && failedStrict.length) { console.error(`--strict: ${failedStrict.length} error-severity rules fail: ${failedStrict.map((r) => r.id).join(', ')}`); process.exit(1); }
if (anchorBroken) { console.error('TM-V1 failed: the anchors are invalid'); process.exit(2); }
process.exit(regress);
