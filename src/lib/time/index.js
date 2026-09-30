// Canonical time module (WP-TIME-02).  CANDIDATE: nothing here ships until the owner and the historian approve the anchors (D-TIME).
// Zero dependencies; ES module for the app, the Astro build, Node validators and the Historian index build.
// The classic-script global (GTBGTime) for the frozen bundle and static pages is built from these same files by tools/time/build.mjs.
import { makeTimeModel } from './model.js';
import ANCHORS from './anchors.generated.js';

export { makeTimeModel } from './model.js';
export { makeCore, parseLocal } from './core.js';
export { validateAnchors, loadAnchors, AnchorError, deriveSigma, mechanicalFlags } from './anchors.js';
export { createPlayback, storyPace } from './playback.js';
export { makeBridge } from './bridge.js';

/** The anchors document this build was generated from (data-src/time/time_anchors.json). */
export const anchorsDoc = ANCHORS;

/** The default model: 33 proposed anchors, dv 2. */
const model = makeTimeModel(ANCHORS);
export default model;

export const {
  tickToClock, clockToTick, clockToTickInfo, tickToLabel, tickToLabelParts, tickToMinutes, minutesToTick, minutesPerTick,
  uncertaintyMin, tabDay, tabStart, parts, format, dayPart, isApprox, tickAfterMinutes, gapAt, isGap, hour, resolveTickParam,
  ticksJson, goldenCsv, tickMax, version, dv, anchors,
} = model;
