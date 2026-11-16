// Defect for the Q04 test: the guns of a battery are drawn at every frame, whether or not the battery has arrived (the stage's own gun table is overwritten after every apply).
const UNIT = 'us-2c-art-1nyb';
export function mutateStage(stage, layer) {
  const B = layer.units.findIndex(u => u.id === UNIT), world = stage.w, guns = [];
  world.units.forEach(w => { if (w.gun != null && w.parent === B) guns.push(w.gun); });
  const apply = stage.apply.bind(stage);
  stage.apply = (t, a) => { const r = apply(t, a); for (const g of guns) { world.gunF[g * 8] = 100; world.gunF[g * 8 + 1] = 100; } return r; };
}
