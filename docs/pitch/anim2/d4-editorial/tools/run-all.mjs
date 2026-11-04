// tools/run-all.mjs - regenerates every picture and every number of the folder, in order, on this build (about 25 minutes; needs Chrome, python 3 with Pillow):
//   build, the scenes (paper, and the aerial variants of S1a, S2, S4), the popups, the specimens, the motion strips, the interface-over-marks count, the pixel check of the ink, the 11 px audit,
//   the colour tests, the real-time pacing (1x and a 4x CPU throttle), the node tests, the 200-percent view of the busiest area, and the report that rewrites the measured tables of SPEC.md and README.md.
//   node tools/run-all.mjs [--round=round-2]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const round = (process.argv.find((a) => a.startsWith('--round=')) || '--round=round-2').slice(8);
const steps = [
  ['node', 'studio/build.mjs'], ['node', 'tools/derive-tokens.mjs'], ['node', 'tools/export-skin-tokens.mjs'],
  ['node', 'tools/shots.mjs', `--set=${round}`], ['node', 'tools/shots.mjs', `--set=${round}`, '--look=aerial', '--only=S1a,S2,S4'],
  ['node', 'tools/popups-shots.mjs', `--set=${round}`], ['node', 'tools/specimen.mjs'],
  ['node', 'tools/strips.mjs'], ['node', 'tools/deploy-strip.mjs'], ['python', 'tools/strips-compose.py'],
  ['node', 'tools/chrome-cover.mjs'], ['node', 'tools/skin-ink.mjs'], ['node', 'tools/text-audit.mjs'], ['node', 'tools/contrast-tests.mjs'],
  ['node', 'tools/pacing.mjs', '--dpr=2'], ['node', 'tools/pacing.mjs', '--dpr=2', '--cpu=4'],
  ['node', 'tools/run-tests.mjs'], ['python', 'tools/zoom200.py', round], ['node', 'tools/report.mjs'],
];
let failed = 0;
for (const [cmd, ...args] of steps) {
  const t0 = Date.now(); const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, D4_ROUND: round } });
  console.log(`${cmd} ${args.join(' ')}: ${r.status === 0 ? 'ok' : 'FAILED (' + r.status + ')'} in ${((Date.now() - t0) / 1000).toFixed(0)} s`); if (r.status !== 0) failed++;
}
process.exitCode = failed ? 1 : 0;
