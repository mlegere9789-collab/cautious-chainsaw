// Defect for the Q06 test: a unit is built in the line layout from its first frame (it appears deployed).
const UNIT = 'us-1c-1d-meredith-19in';
export function mutateWorld(world, layer) {
  const i = layer.units.findIndex(u => u.id === UNIT);
  world.units[i].kind = 'line';
}
