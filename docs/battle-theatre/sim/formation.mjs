// Formation geometry for a unit of n soldiers. Per-soldier positions are SEEDED PROCEDURAL (tier plausible-procedural, PDF D.3.2 item 2):
// unit-level centre/facing/formation come from the history layer; only the per-soldier offsets are generated here.
// TUNING PARAMETERS: no historical value is stated in the PDF; replace with Hardee/Casey drill-manual values when that text is read (register: drill text open).
import { randn, strId } from './rng.mjs';
export const TUNING = { fileSpacingM: 0.56, rankSpacingM: 0.9, skirmishIntervalM: 5.0, jitterM: 0.12, columnFilesFours: 4, columnSpacingM: 0.6 };

// positions in metres, east=x, north=z, around (cx,cz); facingDeg true bearing (0=north, clockwise)
export function layout({ unitId, n, cx, cz, facingDeg, formation, ranks = 2, seed = 1, tuning = TUNING }) {
  const x = new Float32Array(n), z = new Float32Array(n), rank = new Uint16Array(n), file = new Uint16Array(n);
  const uid = strId(unitId);
  let rows, cols;
  if (formation === 'column_fours' || formation === 'column_mass') { cols = formation === 'column_fours' ? tuning.columnFilesFours : Math.max(4, Math.round(Math.sqrt(n / 2))); rows = Math.ceil(n / cols); }
  else if (formation === 'skirmish_line') { rows = 1; cols = n; }
  else { rows = Math.min(ranks, n); cols = Math.ceil(n / rows); }
  const fs = formation === 'skirmish_line' ? tuning.skirmishIntervalM : (formation.startsWith('column') ? tuning.columnSpacingM : tuning.fileSpacingM);
  const rs = tuning.rankSpacingM;
  const a = facingDeg * Math.PI / 180, fx = Math.sin(a), fz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), f = i % cols; rank[i] = r; file[i] = f;
    const lateral = (f - (cols - 1) / 2) * fs + randn(seed, (uid ^ i) >>> 0, 0, 1) * tuning.jitterM;
    const depth = (r - (rows - 1) / 2) * rs + randn(seed, (uid ^ i) >>> 0, 0, 2) * tuning.jitterM;
    x[i] = cx + lateral * rx - depth * fx; z[i] = cz + lateral * rz - depth * fz;
  }
  return { x, z, rank, file, cols, rows };
}
export function frontageM(n, formation, ranks = 2, tuning = TUNING) {
  if (formation === 'skirmish_line') return n * tuning.skirmishIntervalM;
  if (formation.startsWith('column')) return tuning.columnFilesFours * tuning.columnSpacingM;
  return Math.ceil(n / Math.min(ranks, n)) * tuning.fileSpacingM;
}
