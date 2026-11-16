// Defect for the Q05 test: the stage puts a battery 400 m to the east at every second sample (a unit that teleports between two frames).
const UNIT = 'us-1c-art-1nyl';
export function mutateStage(stage, layer) {
  const apply = stage.apply.bind(stage); let k = 0;
  stage.apply = (t, a) => { const r = apply(t, a); const i = layer.units.findIndex(u => u.id === UNIT); if (stage.present[i] === 1 && (k++ % 2) === 0) stage.cx[i] += 400; return r; };
}
