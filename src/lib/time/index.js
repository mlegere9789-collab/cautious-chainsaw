// Canonical time module (WP-TIME-02).  CANDIDATE: nothing here ships until the owner and the historian approve the anchors (D-TIME).
// Zero dependencies; ES module for the app, the Astro build, Node validators and the Historian index build.
// The classic-script global (GTBGTime) for the frozen bundle and static pages is built from these same files by tools/time/build.mjs.
//
// This is the ES-module ROUTE, and it stays small: it bundles the RUNTIME subset of the anchors (anchors.runtime.generated.js, about 4 KB:
// tick, time, sigma, status, state, range), not the full 25 KB source document with its labels, facts and evidence text. The full document
// is anchors.generated.js; only tooling imports it (tests/time/bundle.test.mjs proves nothing reachable from this file does).
import { makeTimeModel } from './model.js';
import RUNTIME from './anchors.runtime.generated.js';

export { makeTimeModel } from './model.js';
export { makeCore, parseLocal, STYLES } from './core.js';
export { validateAnchors, loadAnchors, AnchorError, deriveSigma, mechanicalFlags } from './anchors.js';
export { createPlayback, storyPace } from './playback.js';
export { makeBridge } from './bridge.js';

/** The runtime subset of the anchors document this build was generated from (data-src/time/time_anchors.json, via tools/time/slim.mjs). */
export const anchorsDoc = RUNTIME;

/** The default model: 33 proposed anchors, dv 2. Its anchors carry no labels or facts (they are not in the runtime subset). */
const model = makeTimeModel(RUNTIME);
export default model;

export const {
  tickToClock, anchorRange, clockToTick, clockToTickInfo, tickToLabel, tickToLabelParts, tickToMinutes, minutesToTick, floorTick, minutesPerTick,
  uncertaintyMin, tabDay, tabStart, parts, format, dayPart, isApprox, tickAfterMinutes, gapAt, isGap, hour, resolveTickParam,
  ticksJson, goldenCsv, tickMax, version, dv, anchors,
} = model;
