// Defect for the Q04 test: the layer says a drawn unit arrives six hours earlier than the ledger's earliest documented time (arrival record and events alike), so the scene is consistent with the layer
// and only the independent bound (history/arrivals.json read in python) can catch it.
const UNIT = 'us-1c-1d-meredith-19in', SHIFT = 360;
const shift = e => ({ ...e, t: e.t - SHIFT, ...(e.wp ? { wp: e.wp.map(w => ({ ...w, t: w.t - SHIFT })) } : {}) });
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); return { ...r, arrivals: r.arrivals.map(a => (a.unit === UNIT ? { ...a, earliest: a.earliest - SHIFT, default: a.default - SHIFT, latest: a.latest - SHIFT } : a)), events: r.events.map(e => (e.unit === UNIT ? shift(e) : e)) }; };
}
