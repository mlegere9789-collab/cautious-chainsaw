// Defect for the Q05 test: the third leg of a unit starts before the second has ended (the unit is told to be in two places): the leg is moved back by the length of the stand between them plus ten minutes.
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); const paths = r.events.filter(e => e.unit === UNIT && e.type === 'path'); if (paths.length < 3) return r; const prevEnd = paths[1].wp[paths[1].wp.length - 1].t, shift = paths[2].wp[0].t - (prevEnd - 10);
    return { ...r, events: r.events.map(e => (e === paths[2] ? { ...e, t: e.t - shift, wp: e.wp.map(w => ({ ...w, t: w.t - shift })) } : e)) }; };
}
