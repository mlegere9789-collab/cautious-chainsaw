// The two slim views of data-src/time/time_anchors.json (chapter 04 section 4.2: "anchors are inlined at build, about 2 KB"):
//   runtimeDoc(doc)  what src/lib/time/index.js (the ES-module route: app, Astro build, Node consumers) bundles as its default model.
//                    Everything makeTimeModel reads (tick, t, sigma_min, status, effective_status, state, review_flag, circular, range) and
//                    nothing it does not: no labels, facts, sources, evidence text or notes. Those 25 KB stay in anchors.generated.js, which
//                    only tooling imports (validators, generators, tests) and no runtime module reaches (tests/time/bundle.test.mjs).
//   inlineDoc(doc)   what the classic-script global GTBGTime (the bridge) carries: only what the LEAN core reads for the bridge API:
//                    version, dv, tab_days, approx_sigma_min, solar and per anchor tick, minutes (pre-parsed), sigma_min, a non-default state.
//                    The bridge never reads status, gaps or ranges, so they are not shipped (the ES route keeps them).
import { parseLocal } from '../../src/lib/time/core.js';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DAY = /^1863-07-\d{2}$/;

/** solar days that differ from July 1 (the model falls back to July 1 for a day it does not list) */
function solarDays(doc) {
  const first = doc.solar['1863-07-01'], out = { '1863-07-01': first };
  for (const k of Object.keys(doc.solar).sort()) if (DAY.test(k) && k !== '1863-07-01' && !eq(doc.solar[k], first)) out[k] = doc.solar[k];
  return out;
}

export function runtimeDoc(doc) {
  return {
    schema: doc.schema, version: doc.version, release: doc.release, dv: doc.dv, tz: doc.tz, tick_max: doc.tick_max, tab_days: doc.tab_days,
    approx_sigma_min: doc.approx_sigma_min, sigma_cap_min: doc.sigma_cap_min, slope: doc.slope, gaps: doc.gaps, solar: solarDays(doc),
    anchors: doc.anchors.map((a) => {
      const o = { tick: a.tick, t: a.t, status: a.status, sigma_min: a.sigma_min };
      if (a.effective_status && a.effective_status !== a.status) o.effective_status = a.effective_status;
      if (a.state && a.state !== 'proposed') o.state = a.state;
      if (a.review_flag && a.review_flag !== 'none') o.review_flag = a.review_flag;
      if (a.circular) o.circular = true;
      if (a.range) o.range = a.range;
      return o;
    }),
  };
}

export function inlineDoc(doc) {
  return {
    version: doc.version, dv: doc.dv, tab_days: doc.tab_days, approx_sigma_min: doc.approx_sigma_min, solar: solarDays(doc),
    anchors: doc.anchors.map((a) => { const o = { tick: a.tick, min: parseLocal(a.t), sigma_min: a.sigma_min }; if (a.state && a.state !== 'proposed') o.state = a.state; return o; }),
  };
}
