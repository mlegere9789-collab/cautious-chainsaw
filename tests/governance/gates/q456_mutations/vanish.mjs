// Defect for the Q04 test: a unit is told to leave the field five hours after it enters, with no march out of the loaded ground: it vanishes where it stands.
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); const a = r.arrivals.find(x => x.unit === UNIT); if (!a) return r; return { ...r, events: [...r.events, { t: a.default + 300, unit: UNIT, type: 'leave', tier: 'plausible-procedural', sources: [] }].sort((x, y) => x.t - y.t) }; };
}
