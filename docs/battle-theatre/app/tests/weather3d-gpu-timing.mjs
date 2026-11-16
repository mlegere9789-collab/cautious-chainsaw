// Harness (not a gate): the timing of the weather and effects layer, rows W-E4, W-C1 and W-C2 of BROWSER-VERIFICATION-LIST-WEATHER.md. On one API it runs the harness page (weather3d-gpu-page.mjs: the prototype renderer under the
// render host with fx-host installed as the shell installs it, a stand-in world, no crowd) for `frames` frames after `warm` warm-up frames in each of four modes of the layer (both passes, neither, the weather pass alone, the sprite
// pass alone) in two scenarios (a quiet daytime sky; a dense cannonade from the stand-in plan with `dense` times its guns and men), `rounds` times with the order of the modes reversed on every other round (so a drift of the
// clock speed or of the temperature of the GPU is not taken for a difference between modes). Per frame: the CPU time of fxHost.update and of host.frame, the time to completion of the frame's GPU work (not paced by the
// display: the canvas is the harness's stand-in texture), the sprites, and on WebGPU the layer's GPU pass time from timestamp queries. summary.json carries the figures, report.md says them in words and puts the desktop effects
// budget beside them; nothing here judges a figure. The build machine has no GPU: a run there is a software run, is labelled as one first, and is never a hardware figure.
//   tools/horde/bench.sh --timing node docs/battle-theatre/app/tests/weather3d-gpu-timing.mjs <outDir> <webgpu|webgl2> [--w=1920] [--h=1080] [--frames=600] [--warm=120] [--rounds=2] [--tier=desktop] [--soldiers=12000]
//     [--dense=12] [--modes=both,off,weather,fx] [--scenarios=quiet,cannonade] [--real-gpu [--headed]] [--chrome-arg=<flag>]
// Output: <outDir>/timing-<api>/summary.json (the figures and every per-frame series), report.md, console.log.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { specOf } from './weather3d-gpu-cases.mjs';
import { minOf as MO } from '../src/clock.mjs';
import { chromeArgs, HOOKS } from './weather3d-gpu-lib.mjs';
import { MODES, SCENARIOS, stats, derive, checkTiming, renderTimingMarkdown } from './weather3d-gpu-timing-lib.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const pos = args.filter(a => !a.startsWith('--')), outRoot = path.resolve(pos[0] || '.'), api = pos[1] === 'webgl2' ? 'webgl2' : 'webgpu';
const W = +flag('w', 1920), H = +flag('h', 1080), FRAMES = +flag('frames', 600), WARM = +flag('warm', 120), ROUNDS = Math.max(1, +flag('rounds', 2)), TIER = flag('tier', 'desktop'), SOLD = +flag('soldiers', 12000), DENSE = Math.max(1, +flag('dense', 12));
const MODE_LIST = (flag('modes', MODES.join(',')) || '').split(',').filter(m => MODES.includes(m)), SCEN_LIST = (flag('scenarios', 'quiet,cannonade') || '').split(',').filter(x => SCENARIOS[x]), REALGPU = args.includes('--real-gpu'), HEADED = args.includes('--headed');
const EXTRA_CHROME_ARGS = args.filter(a => a.startsWith('--chrome-arg=')).map(a => a.slice('--chrome-arg='.length)), out = path.join(outRoot, 'timing-' + api); fs.mkdirSync(out, { recursive: true });
const t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a);
// the cases of the two scenarios, as specs of the page (the cannonade carries the dense stand-in plan)
const specFor = sn => { const c = SCENARIOS[sn], spec = specOf(c, MO); if (sn === 'cannonade') spec.plan = { guns: true, volleys: true, dense: DENSE }; return spec; };

const srv = await serve(0), port = srv.address().port, url = `http://127.0.0.1:${port}/app/tests/weather3d-gpu.html?api=${api}&w=${W}&h=${H}&soldiers=${SOLD}&tier=${TIER}`;
const summary = { api, url, w: W, h: H, frames: FRAMES, warm: WARM, rounds: ROUNDS, tier: TIER, soldiers: SOLD, dense: DENSE, realGpu: REALGPU, headed: HEADED, modes: MODE_LIST, started: new Date().toISOString(), scenarios: {}, errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary));
const logs = []; let browser;
try {
  summary.chromeArgs = [...chromeArgs(REALGPU), ...EXTRA_CHROME_ARGS]; browser = await chromium.launch({ channel: 'chrome', headless: !HEADED, args: summary.chromeArgs });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS, { realCanvas: false, trace: false }); ctx.setDefaultTimeout(0);       // the stand-in texture: the layer's cost is not the display's pace
  const page = await ctx.newPage(); page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message)); page.on('crash', () => logs.push('PAGE CRASH')); browser.on('disconnected', () => logs.push('BROWSER DISCONNECTED'));
  say('open', url); await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.WG && (window.WG.ready || window.WG.error), null, { timeout: 600000, polling: 500 });
  const ready = await page.evaluate(() => ({ ready: window.WG.ready, error: window.WG.error, log: window.WG.log })); if (!ready.ready) throw new Error('harness set-up failed: ' + ready.error);
  summary.diagInit = await page.evaluate(() => window.WG.diag()); summary.timestampQueries = !!(summary.diagInit.gpu && summary.diagInit.gpu.timing); say('ready', api, 'adapter', JSON.stringify(summary.diagInit.adapter), 'timestamp queries', summary.timestampQueries); save();
  for (const sn of SCEN_LIST) { summary.scenarios[sn] = {}; for (const m of MODE_LIST) summary.scenarios[sn][m] = { runs: [] }; }
  for (let r = 1; r <= ROUNDS; r++) {
    const order = r % 2 ? MODE_LIST : [...MODE_LIST].reverse();
    for (const sn of SCEN_LIST) for (const m of order) {
      const t0 = Date.now(), res = await page.evaluate(a => window.WG.timing(a), { spec: specFor(sn), frames: FRAMES, warm: WARM, mode: m });
      summary.scenarios[sn][m].runs.push({ round: r, validation: res.validation, doneMs: res.doneMs, passMs: res.passMs, encMs: res.encMs, updMs: res.updMs, sprites: res.sprites, stats: { frame: stats(res.doneMs), pass: stats(res.passMs), encode: stats(res.encMs), update: stats(res.updMs), sprites: stats(res.sprites) } }); save();
      say(`round ${r} ${sn}/${m}`.padEnd(30), 'frame median', stats(res.doneMs).median, 'p95', stats(res.doneMs).p95, 'ms; pass', stats(res.passMs).n ? stats(res.passMs).median : '-', 'sprites', stats(res.sprites).median, res.validation ? 'VALIDATION: ' + res.validation.slice(0, 120) : '', ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  }
  summary.diagEnd = await page.evaluate(() => window.WG.diag()); await page.evaluate(() => window.WG.dispose()).catch(e => summary.errors.push('dispose: ' + e.message));
  await new Promise(r => setTimeout(r, 500)); summary.afterDispose = await page.evaluate(() => ({ gpuErrors: window.__gpuErrors.slice() })).catch(e => ({ error: String(e.message).slice(0, 100) }));
} catch (e) { summary.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', String(e).slice(0, 400)); }
finally {
  summary.finished = new Date().toISOString(); summary.consoleProblems = logs.filter(l => /error|fail|invalid|validation|lost|crash|disconnect/i.test(l)).slice(0, 40);
  for (const sn of Object.keys(summary.scenarios)) summary.scenarios[sn].derived = derive(summary.scenarios[sn]);
  save(); fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); try { await browser.close(); } catch { /* gone */ } srv.close();
}
const chk = checkTiming(summary); summary.check = chk; save(); fs.writeFileSync(path.join(out, 'report.md'), renderTimingMarkdown(summary) + '\n' + (chk.ok ? '\nNo problem found by the checks.\n' : '\n## Problems\n' + chk.problems.map(p => '* ' + p).join('\n') + '\n'));
say('done', 'errors', summary.errors.length, 'check', chk.ok ? 'clean' : 'PROBLEMS: ' + chk.problems.slice(0, 3).join('; '), 'gpu errors', ((summary.diagEnd || summary.diagInit || {}).gpuErrors || []).length);
process.exit(chk.ok ? 0 : 1);
