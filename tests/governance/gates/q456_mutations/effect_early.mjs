// Defect for the Q04 test: the activity timeline the animation reads for a unit starts six hours before the unit's arrival window opens, so the real AnimSystem emits march sounds before the arrival.
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateStage(stage, layer) {
  const orig = stage.unitSegments.bind(stage);
  stage.unitSegments = i => { const segs = orig(i); if (layer.units[i].id !== UNIT || !segs.length) return segs; return [{ t0: segs[0].t0 - 6 * 3600, activity: 'march', speed: 1.25, night: false }, ...segs]; };
}
