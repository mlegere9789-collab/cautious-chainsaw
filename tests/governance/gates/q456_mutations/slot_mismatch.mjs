// Defect for the Q06 test: the unit's fighting position (layer.slotOf, what the world is built from) is not where its last leg ends: 90 m to the north.
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateLayer(layer) {
  const orig = layer.slotOf;
  layer.slotOf = id => { const s = orig(id); return id === UNIT && s ? { ...s, lat: s.lat + 0.0008 } : s; };
}
