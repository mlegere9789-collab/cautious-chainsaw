// clock.mjs - bake the canonical time model's clock for every chronology event into the facts tier (facts.clock).
// The site's own chronology carries a tick-derived clock label that is wrong for many events (audit C4); the Historian never prints it. It prints only what the canonical
// time module (src/lib/time, anchors in data-src/time/time_anchors.json, both read-only here) says about the event's tick, and it says so: the anchors are a PROPOSAL
// (release "candidate", every anchor state "proposed") that neither a historian nor the owner has approved. When the anchors change, rebuild: a test compares the baked
// numbers with the live model and fails on any difference.
//
// facts.clock = {
//   model: { version, release, dv, tz, sha256, anchors, signed },     provenance, shown to the reader as "proposed, not reviewed" while signed is false
//   solar: { dawn, sunrise, noon, sunset, dusk, nautical },            minutes after local midnight (the model's own table)
//   ev:    { "<chronology id>": [minutes, sigma, flags, range?] }      minutes since 1863-07-01T00:00 local mean time; sigma in minutes; flags 1 = approximate, 2 = contested; range = accepted range text at an anchor
// }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeTimeModel } from '../../../src/lib/time/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ANCHORS_PATH = path.resolve(here, '../../../data-src/time/time_anchors.json');

export function loadTimeModel(file = ANCHORS_PATH) {
  const raw = fs.readFileSync(file);
  const doc = JSON.parse(raw.toString('utf8'));
  const model = makeTimeModel(doc);
  for (const fn of ['tickToClock', 'anchorRange']) if (typeof model[fn] !== 'function') throw new Error(`time model API changed: ${fn} is missing (tools/historian/lib/clock.mjs is the only place that depends on it)`);
  return { doc, model, sha256: crypto.createHash('sha256').update(raw).digest('hex') };
}

const hm = (s) => { const [h, m] = String(s).split(':'); return +h * 60 + +m; };

export function buildClock(site, { file } = {}) {
  const { doc, model, sha256 } = loadTimeModel(file);
  const ev = {};
  for (const e of site.chronology) {
    const c = model.tickToClock(e.tick);
    const flags = (c.approx ? 1 : 0) | (c.contested ? 2 : 0);
    const ar = model.anchorRange(e.tick);
    ev[e.id] = ar ? [Math.round(c.minutes), Math.round(c.sigmaMin), flags, ar.text] : [Math.round(c.minutes), Math.round(c.sigmaMin), flags];
  }
  const s = (doc.solar && (doc.solar['1863-07-02'] || doc.solar['1863-07-01'])) || {};
  const anchors = doc.anchors || [];
  return {
    model: { version: doc.version, release: doc.release || 'candidate', dv: doc.dv, tz: doc.tz || 'LMT', sha256: sha256.slice(0, 16), anchors: anchors.length, signed: anchors.length > 0 && anchors.every((a) => a.state === 'signed') },
    solar: { dawn: hm(s.civil_dawn || '04:03'), sunrise: hm(s.sunrise || '04:35'), noon: hm(s.noon || '12:03'), sunset: hm(s.sunset || '19:32'), dusk: hm(s.civil_dusk || '20:04'), nautical: hm(s.nautical_dusk || '20:46') },
    ev,
  };
}
