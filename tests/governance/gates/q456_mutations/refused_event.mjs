// Defect for the Q04 test: the layer emits the enter event of a unit six hours before the arrival window opens. The sim event cache refuses it (the second line of defence), the scene stays empty, and the gate must
// still report that the layer broke the rule.
const UNIT = 'us-1c-1d-meredith-19in', SHIFT = 360;
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); return { ...r, events: r.events.map(e => (e.unit === UNIT && e.type === 'enter' ? { ...e, t: e.t - SHIFT } : e)) }; };
}
