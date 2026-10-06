import fs from 'node:fs';
import path from 'node:path';
import { loadAll } from './load-data.mjs';
// raw rows with file provenance, no tick override
export function rawRows(dist = 'baseline/dist') {
  const out = [];
  const D = path.join('C:/Users/mlege/gettysburg-map', dist, 'data');
  for (const f of fs.readdirSync(D)) {
    if (!/^(placements_|density_)/.test(f) || f === 'placement_schema.json') continue;
    const j = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
    const pl = Array.isArray(j) ? j : j.placements || [];
    pl.forEach((r, i) => out.push({ ...r, _file: f, _i: i }));
  }
  return out;
}
if ((process.argv[1] || '').endsWith('rawrows.mjs')) {
  const rows = rawRows();
  console.log('raw rows', rows.length);
  const t1 = rows.filter(r => r.tick === 1);
  console.log('tick1 rows', t1.length, 'unique', new Set(t1.map(r => r.unit_id)).size);
  const byFile = {}; t1.forEach(r => byFile[r._file] = (byFile[r._file] || 0) + 1); console.log(byFile);
  for (const id of ['U-19IN', 'U-24MI', 'U-6WI', 'U-76NY']) console.log(id, rows.filter(r => r.unit_id === id).map(r => r.tick).sort((a, b) => a - b).join(','));
}
