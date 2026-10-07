// tours/report.mjs - the before/after REPORT: the numbers of the two metric recorders (the production reproduction and the Studio) of THIS run on THIS machine, laid out as rows.
// Every value is read from engine.metricsOf('before' | 'after'), i.e. measured on the frames that were drawn; nothing here is typed in.  Used by the A/B results card, the Showcase and the tests.
const per = (x, n) => (n > 0 ? x / n : 0);

/** @returns {{ok:boolean, rows:object[], before:object, after:object, frames:{before:number, after:number}}}  ok = both recorders have at least `minFrames` frames */
export function compareReport(engine, { minFrames = 30 } = {}) {
  const b = engine.metricsOf('before').summary(); const a = engine.metricsOf('after').summary();
  const row = (id, label, hint, bv, av, o = {}) => ({ id, label, hint, before: bv, after: av, unit: o.unit || '', digits: o.digits ?? 1, higherBetter: !!o.higherBetter });
  const rows = [
    row('jumps', 'Sudden jumps per second', 'a tile steps 8 px or more in one frame, at least 3 times its step in the frame before (hold, then jump)', b.jumpsPerSec, a.jumpsPerSec, { unit: '/s' }),
    row('maxStep', 'Largest one-frame step', 'the biggest distance any tile moved between two frames, camera still (a unit that really marches fast moves far too)', b.maxStepPx, a.maxStepPx, { unit: ' px', digits: 0 }),
    row('overlapFrames', 'Frames with tiles on top of tiles', 'share of frames in which two tiles of different units overlap', 100 * per(b.overlapFrames, b.frames), 100 * per(a.overlapFrames, a.frames), { unit: '%', digits: 0 }),
    row('overlapPairs', 'Overlapping pairs per frame', 'pairs of painted tile parts of different units that overlap, counted by an independent check on every frame', per(b.overlapPairs, b.frames), per(a.overlapPairs, a.frames), { digits: 0 }),
    row('blinks', 'Tiles that vanish for one frame', 'a tile that is gone for exactly one frame and comes back, per second', b.blinksPerSec, a.blinksPerSec, { unit: '/s' }),
    row('fps', 'Frame rate', 'frames drawn per second on this machine during the run', b.fpsMean, a.fpsMean, { unit: ' fps', digits: 0, higherBetter: true }),
  ];
  return { ok: b.frames >= minFrames && a.frames >= minFrames, rows, before: b, after: a, frames: { before: b.frames, after: a.frames } };
}

/** a number as the card shows it */
export const fmtCell = (v, r) => (Number.isFinite(v) ? v.toFixed(r.digits) + r.unit : 'n/a');
