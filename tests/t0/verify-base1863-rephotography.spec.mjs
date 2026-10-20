// Verification pass 5 (rephotography) of the 1863 reconstruction: checks that follow from comparing the July 1863 photographs with views rendered from the shipped tiles.
// Numbers come from tmp/b1863/check5/results.json (docs/basemap1863/verification/check5/results.json is a committed copy); python scripts in tmp/b1863/check5 (copies in docs/.../check5/scripts) re-derive them from the tiles, the provenance raster, the draw items and the 3DEP relief.
// Run: node tests/t0/verify-base1863-rephotography.spec.mjs     (exit 1 = defects present)
import fs from 'node:fs';
const scratch = new URL('../../tmp/b1863/check5/results.json', import.meta.url);
const committed = new URL('../../docs/basemap1863/verification/check5/results.json', import.meta.url);
const R = JSON.parse(fs.readFileSync(fs.existsSync(scratch) ? scratch : committed, 'utf8'));
const cases = R.cases;
const lrt = ['C03', 'C04'].map(k => cases[k].cone.canopy_recon[0]);
const checks = [
  ['R5-01 Devil\'s Den boulder polygon (LC-BOULD-0001, "keep modern ground texture here") is kept: at most 5 percent of its pixels replaced', R.devils_den.changed_share <= 0.05, `${(R.devils_den.changed_share * 100).toFixed(1)} percent of ${R.devils_den.area_ha} ha replaced`],
  ['R5-02 rock texture kept inside the pavement-free Den interior: local standard deviation at least 80 percent of the photograph', R.devils_den_interior.local_std_recon / R.devils_den_interior.local_std_2013 >= 0.8, `${R.devils_den_interior.local_std_recon} against ${R.devils_den_interior.local_std_2013}; rock-like share ${R.devils_den_interior.rock_like_recon} against ${R.devils_den_interior.rock_like_2013}`],
  ['R5-03 no modern red tile roof kept at the Thompson house site (at most 5 percent of the 2013 roof pixels)', R.thompson_red_roofs.share_retained <= 0.05, `${R.thompson_red_roofs.roof_red_px_recon} of ${R.thompson_red_roofs.roof_red_px_2013} roof-red px remain (${(R.thompson_red_roofs.share_retained * 100).toFixed(0)} percent)`],
  ['R5-04 a drawn fence within 150 m of the camera in at least half of the photographs that show fences within 100 m', R.fences.drawn_within_150m_of_camera / R.fences.photos_showing_fences_within_100m.length >= 0.5, `${R.fences.drawn_within_150m_of_camera} of ${R.fences.photos_showing_fences_within_100m.length}; nearest drawn fence ${R.fences.min_nearest_drawn_fence_m} m`],
  ['R5-05 Little Round Top south slope: canopy kept in the view of the two cleared-ground photographs at most 35 percent (ensemble median)', Math.max(...lrt) <= 0.35, `C03 ${(lrt[0] * 100).toFixed(0)} percent, C04 ${(lrt[1] * 100).toFixed(0)} percent; catalogue open polygons cover ${(cases.C03.cone.open1863[0] * 100).toFixed(0)} percent`],
  ['R5-06 terrain: the 3DEP relief reproduces the Big Round Top silhouette within 1.5 degrees rms', R.terrain_skyline_C03.rms_deg <= 1.5, `${R.terrain_skyline_C03.rms_deg} degrees (${R.terrain_skyline_C03.rms_px_of_910} px of 910)`],
  ['R5-07 ground at the photographed sites is photograph, not filler: replaced share of the 0 to 150 m view at most 25 percent in every tier B or C case', Object.entries(cases).filter(([k, v]) => v.tier === 'B' || v.tier === 'C').every(([k, v]) => v.cone.removed[0] <= 0.25), Object.entries(cases).filter(([k, v]) => v.tier === 'B' || v.tier === 'C').map(([k, v]) => `${k} ${(v.cone.removed[0] * 100).toFixed(0)}`).join(', ')],
];
let bad = 0;
for (const [id, ok, note] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${id}  ${note}`); if (!ok) bad++; }
console.log(`${checks.length - bad} pass, ${bad} fail`);
process.exit(bad ? 1 : 0);
