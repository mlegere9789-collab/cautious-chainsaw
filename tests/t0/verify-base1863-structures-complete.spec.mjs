// Verification pass 3 (structure completeness) of the 1863 reconstruction: failing checks only.
// Numbers come from tmp/b1863/check3/results.json (python scripts in the same folder re-derive them from the shipped tiles, the draw items and the 1858 Hopkins county map).
// Run: node tests/t0/verify-base1863-structures-complete.spec.mjs     (exit 1 = defects present)
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(new URL('../../tmp/b1863/check3/results.json', import.meta.url), 'utf8'));
const checks = [
  ['S3-01 retained 1863 survivors keep their roof', R.retained_survivors.visibly_intact / R.retained_survivors.total >= 0.95, `${R.retained_survivors.visibly_intact}/${R.retained_survivors.total} intact`],
  ['S3-02 1858 owner residences (rural, Warren coverage) have a drawn or retained building within 400 m beyond chance', (R.hopkins1858_rural_dots_in_warren_coverage.within400 / R.hopkins1858_rural_dots_in_warren_coverage.n - R.hopkins1858_rural_dots_in_warren_coverage.chance_within400) / (1 - R.hopkins1858_rural_dots_in_warren_coverage.chance_within400) >= 0.8, 'chance-corrected share about 0.34'],
  ['S3-03 orchards have a farmstead within 250 m', 1 - R.orchards.no_building_within_250m / R.orchards.total >= 0.8, `${R.orchards.no_building_within_250m}/${R.orchards.total} orchards without a building`],
  ['S3-04 documented Almshouse complex is drawn', R.undrawn_documented.almshouse_buildings === 0, '9 buildings catalogued, none drawn'],
  ['S3-05 no post-1863 fabric retained as an 1863 roof', R.anachronistic_retained_roofs.length === 0, R.anachronistic_retained_roofs.join('; ')],
  ['S3-06 modern roofs removed', R.modern_roofs.unchanged_non_survivor / R.modern_roofs.visible_in_2013 < 0.005, `${R.modern_roofs.unchanged_non_survivor}/${R.modern_roofs.visible_in_2013}`],
];
let bad = 0;
for (const [id, ok, note] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${id}  ${note}`); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
