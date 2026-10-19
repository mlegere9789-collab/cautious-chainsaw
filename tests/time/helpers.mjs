// Shared test helpers (CANDIDATE, WP-TIME-02/20).
import { P, readJson, readCsv } from '../../tools/time/lib.mjs';
import { makeTimeModel } from '../../src/lib/time/index.js';

// `doc` / `model` are the LIVE adjudicated document (data-src/time/time_anchors.json). `proposal` / `proposalModel` are the FROZEN 2026-09-30
// specialist proposal (tests/time/fixtures/anchors-proposal-2026-09-30.json). The numeric oracles that describe the proposal (CSV agreement, golden
// residuals, leave-one-out, slopes and labels at the proposal's times) run on `proposal`. Evidence reason for freezing it: the owner decision of
// 2026-10-05 (item 2) and the adjudication of 2026-10-18 (docs/time/ANCHORS-FINAL.md) change anchor times, windows and sigma in the live file,
// which would silently re-pin every one of those oracles; the live file is covered by tests/time/adjudicated.test.mjs and by the structural,
// schema, validator and generated-file tests.
export const doc = readJson(P('data-src', 'time', 'time_anchors.json'));
export const model = makeTimeModel(doc);
export const proposal = readJson(P('tests', 'time', 'fixtures', 'anchors-proposal-2026-09-30.json'));
export const proposalModel = makeTimeModel(proposal);
export const csv = (name) => readCsv(P('docs', 'plan', 'data', name));

/** deterministic PRNG (mulberry32) so property tests are reproducible */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** minutes -> "1863-07-DDTHH:MM" without Date */
export function isoFromMinutes(m) {
  const d = Math.floor(m / 1440), r = m - d * 1440;
  return `1863-07-${String(1 + d).padStart(2, '0')}T${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
}

/** A random valid anchor document: ticks 1..tickMax, strictly increasing minutes, tab starts as anchors. */
export function randomDoc(rand, opts = {}) {
  const n = opts.anchors || 8 + Math.floor(rand() * 20), tickMax = opts.tickMax || 675;
  const set = new Set([1, tickMax, 226, 451]);
  while (set.size < n) set.add(2 + Math.floor(rand() * (tickMax - 2)));
  const ticks = [...set].sort((a, b) => a - b);
  let m = 300; const anchors = [];
  for (const t of ticks) {
    if (anchors.length) m += Math.max(1, Math.round((t - anchors[anchors.length - 1].tick) * (0.8 + rand() * 40)));
    anchors.push({ tick: t, t: isoFromMinutes(m), status: 'M', sigma_min: 5 + Math.floor(rand() * 26) });
  }
  return { schema: 1, version: '2026-01-01.1', dv: 2, tz: 'LMT', tick_max: tickMax, tab_days: [[1, 225], [226, 450], [451, tickMax]], approx_sigma_min: 10, sigma_cap_min: 30, gaps: [], solar: {}, anchors };
}
