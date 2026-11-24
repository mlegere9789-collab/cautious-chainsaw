// Defect for the Q06 test: the layer shows every change of formation with the tier 'inferred', better than its 90 s duration (a tuning value, plausible-procedural). Q06.2 must fail it.
export function mutateLayer(layer) {
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); return { ...r, events: r.events.map(e => (e.type === 'formation' ? { ...e, tier: 'inferred' } : e)) }; };
}
