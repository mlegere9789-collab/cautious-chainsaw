// tools/run-all.mjs - regenerate every artefact in order, then run the tests.   node tools/run-all.mjs [--quick]    (--quick skips the demo pictures and the size experiments)
// build (standard palette, high-contrast variant) -> sheets -> demo pictures -> size experiments -> tests.  Needs node 20+, Chrome (tools/chrome.mjs), python 3 with Pillow and numpy.
import { spawnSync } from 'node:child_process'; import path from 'node:path';
import { ROOT } from './chrome.mjs';
const quick = process.argv.includes('--quick'); const node = process.execPath; const py = 'python';
const steps = [
  ['atlases (standard palette)', node, ['build.mjs']],
  ['atlases (high-contrast variant)', node, ['build.mjs', '--palette', 'highContrast', '--tokens', 'tokens/variants/high-contrast.json']],
  ['colour tests (both palettes)', node, ['tools/colour-tests.mjs']], ['', node, ['tools/colour-tests.mjs', '--palette', 'highContrast']],
  ['sheets (standard)', node, ['tools/sheets.mjs']], ['sheets (high-contrast vocabulary)', node, ['tools/sheets.mjs', '--palette', 'highContrast', '--kind', 'vocabulary']],
  ...(quick ? [] : [['demo pictures: scenes', node, ['tools/demo-shots.mjs', '--prefix', 'scene', '--scenes', 'culps,cemetery,angle', '--grounds', 'aerial,paper', '--dprs', '2']],
    ['demo pictures: crowd at zoom 13.5', node, ['tools/demo-shots.mjs', '--prefix', 'stress', '--scenes', 'cemetery', '--grounds', 'aerial', '--zoom', '13.5', '--dprs', '2']],
    ['demo pictures: real aerial imagery', node, ['tools/demo-shots.mjs', '--prefix', 'naip', '--scenes', 'culps,cemetery', '--grounds', 'naip-angle', '--dprs', '2']],
    ['demo pictures: real aerial imagery, crowd', node, ['tools/demo-shots.mjs', '--prefix', 'naipstress', '--scenes', 'cemetery', '--grounds', 'naip-cemhill135', '--zoom', '13.5', '--dprs', '2']],
    ['size experiments', py, ['tools/size-experiments.py']]]),
  ['tests', node, ['--test', 'test/symbology.test.mjs']],
];
for (const [label, cmd, args] of steps) {
  if (label) console.log(`\n== ${label}`); const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) { console.error(`step failed: ${label || args.join(' ')}`); process.exit(r.status || 1); }
}
console.log('\nall steps passed');
