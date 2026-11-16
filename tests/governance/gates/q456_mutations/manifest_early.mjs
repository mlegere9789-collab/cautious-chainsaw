// Defect for the Q04 test: the per-figure manifest (officers, colour bearers, musicians, flags) of a unit exists from the first frame, before the unit enters.
export function mutateLayer(layer) {
  const orig = layer.figureManifest;
  layer.figureManifest = (id, k, t, sc) => orig(id, k, Math.max(t, layer.enterOf(id, sc) ?? t), sc);
}
