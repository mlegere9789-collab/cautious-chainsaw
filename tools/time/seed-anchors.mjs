#!/usr/bin/env node
// Seeds data-src/time/time_anchors.json from docs/plan/data/time-facts-anchors.csv (the 33 proposed anchors) and
// docs/plan/data/time-facts.csv (per-fact ranges, confidence, sources), plus the chapter-04 section 4.4 family/flag table.
//
// CANDIDATE. Every row is state "proposed". Nothing here is approved by the historian or the owner (D-TIME, DG-3).
// Once committed, data-src/time/time_anchors.json is the source of truth (reviewers edit it); this script refuses to
// overwrite an existing file unless --force is given, so a hand edit is never silently lost.
//
//   node tools/time/seed-anchors.mjs            # write when absent, otherwise verify and report differences
//   node tools/time/seed-anchors.mjs --force    # regenerate (destroys reviewer edits)
import fs from 'node:fs';
import { P, readCsv, parseHm, parseJulyDay, julyMinutes, isoOf, writeIfChanged, parseArgs } from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const OUT = P('data-src', 'time', 'time_anchors.json');

// Chapter 04 section 4.4 [E]: sigma, families, flags per anchor tick. Sigma is RE-DERIVED below from the linked fact ranges and must
// equal this column (verified here and again in tests/time/anchors.test.mjs).
const CH = {
  1: [15, 'LIT SS THJ', 'M E W'], 5: [30, 'LIT SS THJ', 'C W'], 12: [5, 'ABT HN PART WP', ''], 28: [20, 'OR WP', 'M'],
  36: [15, 'WP SS', 'E'], 53: [30, 'OR WP', 'M'], 57: [25, 'ABT WP', ''], 64: [15, 'OR ABT WP', ''], 72: [30, 'WP SRCH', ''],
  75: [30, 'WP SRCH', 'H'], 90: [30, 'SS SRCH LIT', 'H W'], 100: [30, 'sun', 'O'], 226: [30, 'sun', 'O'], 240: [30, 'WP SS', ''],
  248: [30, 'WP SRCH LIT', 'H'], 256: [25, 'OR ABT WP', ''], 267: [15, 'HN WP', ''], 275: [30, 'HN THJ SRCH', 'H'],
  280: [25, 'WP SS', ''], 295: [30, 'WP SS', ''], 302: [25, 'SS LIT', 'W'], 314: [30, 'ABT WP', ''], 326: [30, 'WP SS', 'E'],
  340: [15, 'WP', ''], 451: [25, 'ABT WP SS', ''], 500: [30, 'SS', 'W'], 515: [30, 'SS WP', 'M E'], 518: [5, 'OR HN NPS WP', ''],
  538: [30, 'OR ABT WP', 'H'], 551: [20, 'ABT SS', ''], 556: [25, 'SS', 'W'], 568: [25, 'ABT SRCH', ''], 675: [30, 'sun', 'O'],
};
const STRONG = ['OR', 'WP', 'ABT', 'HN', 'NPS', 'PART'];
const WEAK = ['SS', 'THJ', 'CWC', 'SRCH', 'LIT'];
const STATUS_CLASS = { S: 'A', M: 'B', R: 'C', D: 'D' };
const SIGMA_CAP = 30, SIGMA_MIN = 5;
const SOLAR = { civil_dawn: '04:03', sunrise: '04:35', noon: '12:03', sunset: '19:32', civil_dusk: '20:04', nautical_dusk: '20:46' };

const anchorsCsv = readCsv(P('docs', 'plan', 'data', 'time-facts-anchors.csv'));
const facts = Object.fromEntries(readCsv(P('docs', 'plan', 'data', 'time-facts.csv')).map((r) => [r.id, r]));
if (anchorsCsv.length !== 33) throw new Error(`expected 33 anchors, found ${anchorsCsv.length}`);

const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const anchors = [];
const problems = [];
for (const r of anchorsCsv) {
  const tick = +r.tick;
  const day = parseJulyDay(r.local_time_1863);
  const tm = /(\d{1,2}:\d{2}\s*[ap]m)/i.exec(r.local_time_1863);
  const minute = julyMinutes(day, parseHm(tm[1]));
  const factIds = [...new Set((r.event.match(/R\d{3}/g) || []))];
  const [chSigma, chFam, chFlags] = CH[tick];
  const status = r.status;
  const label = r.event.replace(/\s*\((?:R\d{3}(?:\/R\d{3})?)(?:;[^)]*)?\)\s*$/, '').replace(/\s*\(sunset[^)]*\)\s*$/, '').trim();
  let range, sigma, factConf = {}, sources = [];
  if (status === 'D') {
    sigma = SIGMA_CAP;
    range = tick === 226 ? ['04:03', '04:35'] : ['19:32', '20:04'];
  } else {
    const fr = factIds.map((id) => facts[id]);
    if (fr.some((f) => !f)) throw new Error(`unknown fact for tick ${tick}: ${factIds}`);
    const starts = fr.map((f) => julyMinutes(parseJulyDay(f.date_1863), parseHm(f.real_start)));
    const ends = fr.map((f) => julyMinutes(parseJulyDay(f.date_1863), parseHm(f.real_end)));
    const lo = Math.min(...starts), hi = Math.max(...ends);
    const dayBase = Math.floor(minute / 1440) * 1440;
    range = [hh(lo - dayBase), hh(hi - dayBase)];
    if (lo < dayBase || hi >= dayBase + 1440) problems.push(`tick ${tick}: fact range crosses midnight`);
    if (minute < lo || minute > hi) problems.push(`tick ${tick}: anchor time outside fact range ${range}`);
    // sigma [E] = min(30, max(5, ceil(half-width of the WIDEST linked range / 5) * 5))
    const widest = Math.max(...fr.map((f, i) => ends[i] - starts[i]));
    sigma = Math.min(SIGMA_CAP, Math.max(SIGMA_MIN, Math.ceil(widest / 2 / 5) * 5));
    factConf = Object.fromEntries(fr.map((f) => [f.id, f.confidence]));
    sources = [...new Set(fr.flatMap((f) => f.sources.split(',').map((s) => s.trim()).filter(Boolean)))];
  }
  if (tick === 5) sigma = 30; // owner decision 3 default: circular anchor imported as design-class, sigma 30
  if (sigma !== chSigma) problems.push(`tick ${tick}: derived sigma ${sigma} != chapter ${chSigma}`);
  const families = chFam === 'sun' ? ['sun'] : chFam.split(' ');
  const fl = chFlags ? chFlags.split(' ') : [];
  const reviewFlag = fl.includes('H') ? 'needs-historian' : fl.includes('O') ? 'owner-sign' : fl.includes('C') ? 'owner-decision'
    : fl.length ? 'evidence-weak' : 'none';
  const a = {
    tick,
    t: isoOf(minute),
    status,
    confidence: STATUS_CLASS[status],
    sigma_min: sigma,
    range,
    label,
    facts: factIds,
    fact_confidences: factConf,
    sources,
    families,
    evidence: r.evidence,
    flags: fl,
    review_flag: reviewFlag,
    state: 'proposed',
    decision: null,
  };
  if (status === 'D') a.design = true;
  if (tick === 5) { a.circular = true; a.effective_status = 'D'; a.note = 'Circular: derived from the site\'s own t5 label (5:20am). Imported as design-class sigma 30 (owner decision 3 default); drop or keep is an owner decision.'; }
  if (fl.includes('H')) a.note = 'Needs a named historian decision before any exact time is shown (D-TIME sign-off item 1). See docs/editorial/anchor-review-packet.md.';
  if (status === 'D') a.note = 'Design anchor: no historical event; closes a day boundary or night. Owner signs (D-TIME sign-off item 2). Times from the NOAA solar algorithm (local mean time), not from an almanac.';
  anchors.push(a);
}

const doc = {
  $schema: './time_anchors.schema.json',
  schema: 1,
  version: '2026-09-30.1',
  release: 'candidate',
  dv: 2,
  notice: 'CANDIDATE. All 33 anchors are state "proposed": not reviewed by a historian, not approved by the owner (D-TIME, sign-off DG-3). Nothing derived from this file may ship or be described as reviewed or accurate to the minute.',
  tz: 'LMT',
  tz_note: 'Local mean time at Gettysburg (39.83 N, 77.23 W). 1863 had no standard time zones. EST would be about +9 minutes.',
  tick_max: 675,
  tab_days: [[1, 225], [226, 450], [451, 675]],
  approx_sigma_min: 10,
  sigma_cap_min: SIGMA_CAP,
  slope: { min_min_per_tick: 0.75, warn_over: 15, error_over: 60 },
  gaps: [{ from: 226, to: 240, policy: 'fast_forward' }, { from: 515, to: 518, policy: 'fast_forward' }],
  solar: {
    source: 'NOAA solar algorithm computed by the time-facts specialist for 39.8309 N, 77.2311 W, local mean time; re-derived in tests/time/solar.test.mjs (+-2 min). Not checked against an almanac.',
    '1863-07-01': { ...SOLAR }, '1863-07-02': { ...SOLAR }, '1863-07-03': { ...SOLAR },
  },
  evidence_families: { strong: STRONG, weak: WEAK },
  anchors,
};

const text = JSON.stringify(doc, null, 2) + '\n';
if (problems.length) { console.error('SEED PROBLEMS:\n' + problems.join('\n')); process.exitCode = 2; }
if (!fs.existsSync(OUT) || flags.force) {
  fs.mkdirSync(P('data-src', 'time'), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${OUT} (${anchors.length} anchors, ${text.length} bytes)`);
} else {
  const cur = fs.readFileSync(OUT, 'utf8');
  console.log(cur === text ? 'time_anchors.json equals the seed (no reviewer edits yet)' : 'time_anchors.json differs from the seed (reviewer or later edits present; not overwritten)');
}
