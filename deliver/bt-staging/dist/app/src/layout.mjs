// Formation geometry shared by the world builder and the track planner. Dimensions are the renderer's own slot spacing (render/prototype/src/world.mjs): a unit's
// figures are laid out around the unit origin, which here is the MIDDLE of the formation, so the unit's position is where its body is.
// These are drawing dimensions, not historical measurements (PDF D.3.2: per-soldier offsets are plausible-procedural; the drill-manual values are an open item).
export const DIM = { colAbreast: 4, colFileW: 0.6, colRankD: 1.0, lineRanks: 2, lineFileW: 0.55, lineRankD: 0.9, mountFiles: 8, mountFileW: 1.1, mountRankD: 2.6, columnGapM: 8, laneM: 20 };

// slot kinds the renderer knows: 'col' foot column of fours, 'line' foot line of two ranks, 'cav' mounted column of eight abreast
export function slotKind(unit) { return unit.arm === 'cavalry' ? 'cav' : unit.formation.kind === 'line' ? 'line' : 'col'; }
export function depthOf(kind, n) {
  if (kind === 'cav') return Math.ceil(n / DIM.mountFiles) * DIM.mountRankD;
  if (kind === 'line') return DIM.lineRanks * DIM.lineRankD;
  return Math.ceil(n / DIM.colAbreast) * DIM.colRankD;
}
export function widthOf(kind, n) {
  if (kind === 'cav') return Math.min(n, DIM.mountFiles) * DIM.mountFileW;
  if (kind === 'line') return Math.ceil(n / DIM.lineRanks) * DIM.lineFileW;
  return DIM.colAbreast * DIM.colFileW;
}
// slot rows [x, z] in the unit frame (+z forward, x to the right), centred on the unit origin; `rnd` is a seeded generator (small jitter, as the prototype)
export function slots(kind, n, rnd) {
  const a = []; const rows = kind === 'cav' ? Math.ceil(n / DIM.mountFiles) : kind === 'line' ? DIM.lineRanks : Math.ceil(n / DIM.colAbreast);
  if (kind === 'cav') { for (let i = 0; i < n; i++) { const r = Math.floor(i / DIM.mountFiles), f = i % DIM.mountFiles; a.push([(f - (Math.min(n, DIM.mountFiles) - 1) / 2) * DIM.mountFileW, -(r - (rows - 1) / 2) * DIM.mountRankD]); } return a; }
  if (kind === 'line') { const files = Math.ceil(n / DIM.lineRanks); for (let i = 0; i < n; i++) { const r = Math.floor(i / files), f = i % files; a.push([(f - (files - 1) / 2) * DIM.lineFileW + (rnd() - .5) * .12, -(r - (rows - 1) / 2) * DIM.lineRankD + (rnd() - .5) * .12]); } return a; }
  for (let i = 0; i < n; i++) { const r = Math.floor(i / DIM.colAbreast), f = i % DIM.colAbreast; a.push([(f - (DIM.colAbreast - 1) / 2) * DIM.colFileW + (rnd() - .5) * .1, -(r - (rows - 1) / 2) * DIM.colRankD + (rnd() - .5) * .15]); }
  return a;
}
