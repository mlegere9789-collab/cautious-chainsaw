// THE ONLY PLACE where the astro_by_tick view touches the tick clock (the "unsigned time model").
//
// The 675-tick clock is a CANDIDATE: data-src/time/time_anchors.json (version "2026-09-30.1", release "candidate", 33 anchors, five of them awaiting a
// historian's decision). Nothing here approves it. If the owner or the historian changes an anchor, only this function's input changes; astro_by_tick.json
// embeds the anchors it was built from (tick -> LMT) and a SHA-256 of the source document, so a stale view is detected by validate.mjs (a warning by default,
// an error with --strict) and is rebuilt with `node tools/environment/build-astro.mjs`.
//
// The model, as chapter 04 and src/lib/time/core.js define it: a strictly monotone piecewise-linear map from tick (integer 1..tick_max) to minutes since
// 1863-07-01T00:00 local mean time, defined only by the anchors. This file re-implements that interpolation in ten lines instead of importing the app's
// module, so the data build has no dependency on app code; tests/environment/astro.test.mjs proves the two agree on all 675 ticks.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ANCHORS_FILE = path.join(ROOT, 'data-src', 'time', 'time_anchors.json');

const daysFromCivil = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 86400000);
/** '1863-07-03T15:00' -> minutes since 1863-07-01T00:00 LMT */
export function parseLmt(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) throw new Error('bad local time ' + s);
  return (daysFromCivil(+m[1], +m[2], +m[3]) - daysFromCivil(1863, 7, 1)) * 1440 + +m[4] * 60 + +m[5];
}
export function loadAnchors(file = ANCHORS_FILE) {
  const raw = fs.readFileSync(file);
  const doc = JSON.parse(raw.toString('utf8'));
  return {
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    version: doc.version, release: doc.release, tick_max: doc.tick_max,
    anchors: doc.anchors.map((a) => ({ tick: a.tick, t: a.t, min: parseLmt(a.t), status: a.status, review_flag: a.review_flag, state: a.state })),
  };
}
/** tick -> minutes since 1863-07-01T00:00 LMT. Anchors are { tick, min } sorted by tick. Throws outside 1..tick_max. */
export function tickToLmtMinutes(tick, anchors) {
  const first = anchors[0], last = anchors[anchors.length - 1];
  if (!Number.isFinite(tick) || tick < first.tick || tick > last.tick) throw new RangeError('tick out of range: ' + tick);
  let lo = 0, hi = anchors.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (anchors[mid].tick <= tick) lo = mid; else hi = mid; }
  const a = anchors[lo], b = anchors[hi];
  return tick >= b.tick ? b.min : a.min + ((tick - a.tick) * (b.min - a.min)) / (b.tick - a.tick);
}
/** the inverse: minutes since 1863-07-01T00:00 LMT -> a fractional tick (null outside the first and last anchor). Same dependency on the anchors, nothing else. */
export function lmtMinutesToTick(min, anchors) {
  const first = anchors[0], last = anchors[anchors.length - 1];
  if (!Number.isFinite(min) || min < first.min || min > last.min) return null;
  let lo = 0, hi = anchors.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (anchors[mid].min <= min) lo = mid; else hi = mid; }
  const a = anchors[lo], b = anchors[hi];
  return min >= b.min ? b.tick : a.tick + ((min - a.min) * (b.tick - a.tick)) / (b.min - a.min);
}
/** minutes since 1863-07-01T00:00 LMT -> UT milliseconds (LMT = UT + lon/15 h) */
export const lmtMinutesToUtMs = (min, lmtOffsetMs) => Date.UTC(1863, 6, 1) + min * 60000 - lmtOffsetMs;
