// Composes the lean core with the rich extras: the model the app, the validators and the tests use.  CANDIDATE (WP-TIME-02).
import { makeCore } from './core.js';
import { extend } from './extras.js';

/** makeTimeModel(doc) -> lean core API + tickToClock, clockToTick, tickToLabelParts, ticksJson, goldenCsv, anchors, resolveTickParam. */
export function makeTimeModel(doc) {
  return extend(makeCore(doc), doc);
}
