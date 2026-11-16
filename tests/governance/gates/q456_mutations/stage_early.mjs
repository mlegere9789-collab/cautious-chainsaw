// Defect for the Q04 test: the stage reads an arrival window six hours earlier than the layer records (the stage draws the unit before the layer's own earliest time). Only the stage is wrong; the dump's arrival
// record is the layer's.
const UNIT = 'us-1c-1d-meredith-19in', SHIFT = 360;
const shift = e => ({ ...e, t: e.t - SHIFT, ...(e.wp ? { wp: e.wp.map(w => ({ ...w, t: w.t - SHIFT })) } : {}) });
export function mutateStage(stage, layer) {
  const load = stage.loadScenario.bind(stage);
  stage.loadScenario = sc => {
    const ob = layer.both;
    layer.both = s => { const r = ob(s); return { ...r, arrivals: r.arrivals.map(a => (a.unit === UNIT ? { ...a, earliest: a.earliest - SHIFT, default: a.default - SHIFT, latest: a.latest - SHIFT } : a)), events: r.events.map(e => (e.unit === UNIT ? shift(e) : e)) }; };
    try { return load(sc); } finally { layer.both = ob; }
  };
}
