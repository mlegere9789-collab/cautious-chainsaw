// tools/run-all.mjs - regenerate everything: the build, the colour tests, every picture, the strips, the sweeps, the measurements.  About 12 minutes on the author's machine.
//   node tools/run-all.mjs [--quick]    (--quick skips the sweeps and the performance run)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const quick = process.argv.includes('--quick');
const run = (cmd, args) => { console.log('\n$', cmd, args.join(' ')); execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' }); };
run('node', ['tools/patch-tokens.mjs']); run('node', ['build.mjs']); run('node', ['tools/contrast.mjs']);
run('node', ['tools/shoot.mjs']); run('python', ['tools/shrink-variants.py']); run('node', ['tools/popups-shots.mjs']);
run('node', ['tools/strips.mjs']); run('python', ['tools/strips-compose.py']); run('python', ['tools/cvd-sheet.py']);
run('node', ['tools/type-audit.mjs']); run('node', ['tools/zoom-test.mjs']); run('node', ['tools/marks-stats.mjs']); run('node', ['tools/gap-experiment.mjs']); run('node', ['tools/legend-check.mjs']);
if (!quick) { run('node', ['tools/sweep.mjs', '--ground=ink']); run('node', ['tools/sweep.mjs', '--ground=ink', '--viewport=390x844', '--dpr=2', '--zooms=11,12,13,14,15,16,17']); run('node', ['tools/sweep.mjs', '--ground=real', '--zooms=13.5,15,16.5', '--ticks=28,120,295,346,551,556']); run('node', ['tools/perf.mjs']); }
console.log('\nall done');
