// Body shape keys applied on the CPU (reference of the vertex shader): position = base + sum_k w_k * delta_k. The four keys are lean (build -1), stocky (build +1), narrow (chest -1), broad (chest +1); a body shape (g, c)
// maps to weights (max(0,-g), max(0,g), max(0,-c), max(0,c)). Used by the contact sheets, the hand-over measurement and the interpenetration check.
export const shapeWeights = s => [Math.max(0, -s.g), Math.max(0, s.g), Math.max(0, -s.c), Math.max(0, s.c)];
export function applyShapeKeys(m, deltas, shape, stature = 1) {
  const w = shapeWeights(shape), pos = Float32Array.from(m.pos), n = m.nv;
  if (deltas) for (let k = 0; k < 4; k++) { if (!w[k]) continue; const o = k * n * 3; for (let i = 0; i < n * 3; i++) pos[i] += w[k] * deltas[o + i]; }
  if (stature !== 1) for (let i = 0; i < pos.length; i++) pos[i] *= stature;
  return { ...m, pos };
}
