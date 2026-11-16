// Defect for the Q06 test: the second leg of a unit starts 30 m from where the first ended (its waypoints are moved east).
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); let n = 0; return { ...r, events: r.events.map(e => { if (e.unit !== UNIT || e.type !== 'path') return e; n++; if (n !== 2) return e; return { ...e, wp: e.wp.map(w => ({ ...w, lng: w.lng + 0.00035 })) }; }) }; };
}
