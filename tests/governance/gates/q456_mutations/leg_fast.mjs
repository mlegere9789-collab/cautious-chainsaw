// Defect for the Q05 test: the first leg of a unit is walked twice as fast as the layer's own rate (the waypoint times are halved), so the unit moves at about 2.5 and 4.9 m/s: faster than the documented double quick.
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); let done = false; return { ...r, events: r.events.map(e => { if (e.unit !== UNIT || e.type !== 'path' || done) return e; done = true; const t0 = e.wp[0].t; return { ...e, wp: e.wp.map(w => ({ ...w, t: t0 + (w.t - t0) / 2 })) }; }) }; };
}
