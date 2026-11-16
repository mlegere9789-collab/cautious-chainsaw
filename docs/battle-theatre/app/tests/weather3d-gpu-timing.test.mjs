// The timing harness of the weather and effects layer (weather3d-gpu-timing.mjs, weather3d-gpu-timing-lib.mjs, the `timing` function of weather3d-gpu-page.mjs, the `dense` option of the stand-in plan, the timing steps of
// the one-command real-GPU run). Pure node, no browser: the statistics, the derived costs, the checks of a run and the report are tested on synthetic series whose answers are known; the page and the driver are read as text.
// What a browser run measures is in WEATHER3D-WEBGPU-NOTES.md; a figure from the build machine is a software figure.
// node --test docs/battle-theatre/app/tests/weather3d-gpu-timing.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
import { BT } from './node-world.mjs';
import { MODES, SCENARIOS, DESKTOP_FX_BUDGET_MS, quantile, stats, pooled, derive, checkTiming, renderTimingMarkdown } from './weather3d-gpu-timing-lib.mjs';
import { makePlan } from './weather3d-gpu-plan.mjs';
import { planSteps, summarize, renderMarkdown } from './weather3d-gpu-realrun.mjs';
import { specOf } from './weather3d-gpu-cases.mjs'; import { minOf } from '../src/clock.mjs';

const APP = path.resolve(BT, 'app'), T = f => fs.readFileSync(path.join(APP, 'tests', f), 'utf8');

test('statistics: quantiles interpolate between ranks, the series are cleaned, and an empty series says so', () => {
  const a = Array.from({ length: 100 }, (_, i) => i + 1), s = stats(a);
  assert.deepEqual(s, { n: 100, min: 1, median: 50.5, mean: 50.5, p95: 95.05, p99: 99.01, max: 100 });
  assert.deepEqual(stats([]), { n: 0 }); assert.deepEqual(stats(undefined), { n: 0 }); assert.deepEqual(stats([NaN, undefined, 'x', Infinity, null]), { n: 0 }, 'nothing numeric: no figure');
  assert.deepEqual(stats([3, NaN, 1, undefined, 2]), { n: 3, min: 1, median: 2, mean: 2, p95: 2.9, p99: 2.98, max: 3 }, 'non-numbers are dropped, the rest is sorted');
  assert.deepEqual(stats([7]), { n: 1, min: 7, median: 7, mean: 7, p95: 7, p99: 7, max: 7 }); assert.equal(quantile([], 0.5), null); assert.equal(quantile([1, 2], 0), 1); assert.equal(quantile([1, 2], 1), 2); assert.equal(quantile([1, 2], 7), 2, 'p is clamped'); assert.equal(quantile([1, 2, 3], 0.5), 2);
  assert.deepEqual(pooled([{ x: [1, 2] }, { x: [3] }, {}], 'x'), stats([1, 2, 3]), 'rounds are pooled'); assert.deepEqual(pooled(undefined, 'x'), { n: 0 });
});
const run = (o = {}) => ({ round: 1, validation: null, doneMs: Array(10).fill(5), passMs: [1, 1, 1], encMs: Array(10).fill(2), updMs: Array(10).fill(0.5), sprites: Array(10).fill(1000), ...o });
const scn = () => ({ both: { runs: [run({ doneMs: Array(10).fill(5), passMs: [1.2, 1.2, 1.2] })] }, off: { runs: [run({ doneMs: Array(10).fill(3), passMs: [], sprites: Array(10).fill(0) })] }, weather: { runs: [run({ doneMs: Array(10).fill(4) })] }, fx: { runs: [run({ doneMs: Array(10).fill(4.5) })] } });
test('derived costs: the layer is the difference of the medians of the frame time, each pass alone likewise, the pass time and the nanoseconds per sprite come from the same series, a missing mode gives no figure', () => {
  const d = derive(scn()); assert.equal(d.layerMs, 2); assert.equal(d.weatherMs, 1); assert.equal(d.fxMs, 1.5); assert.equal(d.nsPerSprite, 1500, '1.5 ms over 1000 sprites'); assert.equal(d.passMsMedian, 1.2); assert.equal(d.passMsP95, 1.2); assert.equal(d.passMsMax, 1.2); assert.equal(d.spritesMedian, 1000); assert.equal(d.cpuUpdateMsMedian, 0.5); assert.equal(d.cpuEncodeMsMedian, 2);
  const x = scn(); delete x.off; const e = derive(x); assert.equal(e.layerMs, null); assert.equal(e.weatherMs, null); assert.equal(e.fxMs, null); assert.equal(e.nsPerSprite, null); assert.equal(e.frameMsBoth, 5, 'what was measured is still reported');
  const y = scn(); y.both.runs = [run({ sprites: Array(10).fill(0) })]; assert.equal(derive(y).nsPerSprite, null, 'no sprites: no cost per sprite');
  const z = scn(); z.both.runs.push(run({ doneMs: Array(10).fill(7) })); assert.equal(derive(z).frameMsBoth, 6, 'two rounds are pooled: the median of five fives and ... sevens'); assert.equal(derive({}).layerMs, null);
});
const okSummary = () => ({ api: 'webgpu', url: 'http://x/', w: 1920, h: 1080, frames: 10, warm: 2, rounds: 1, tier: 'desktop', soldiers: 12000, dense: 12, realGpu: false, modes: MODES, timestampQueries: true, finished: 'now', errors: [],
  diagInit: { gpu: { ok: true, weatherOk: true, fxOk: true, timing: true }, adapter: { vendor: 'nvidia', arch: 'blackwell' } }, diagEnd: { gpuErrors: [], adapter: { vendor: 'nvidia', arch: 'blackwell' } }, afterDispose: { gpuErrors: ['DEVICE LOST destroyed: Device was destroyed.'] },
  scenarios: { quiet: scn(), cannonade: scn() } });
test('the run checker: a clean run is clean, and every defect that makes the figures unusable is named; a slow figure is never a problem', () => {
  const ok = checkTiming(okSummary()); assert.equal(ok.ok, true, ok.problems.join('; ')); assert.equal(ok.facts.frames, 10); assert.equal(ok.facts.timestampQueries, true); assert.equal(ok.facts.adapterSoftware, false);
  const bad = (mut, re) => { const s = okSummary(); mut(s); const r = checkTiming(s); assert.equal(r.ok, false, 'not found: ' + re); assert.ok(r.problems.some(p => re.test(p)), re + ' in ' + JSON.stringify(r.problems)); };
  bad(s => { s.errors = ['boom']; }, /reported errors/); bad(s => { s.finished = null; }, /did not finish/); bad(s => { s.scenarios.quiet.both.runs[0].validation = 'Invalid BindGroup'; }, /quiet\/both round 1: validation error/);
  bad(s => { s.scenarios.cannonade.fx.runs[0].doneMs.pop(); }, /cannonade\/fx round 1: 9 frames timed, 10 asked for/); bad(s => { s.scenarios.quiet.off.runs[0].doneMs[3] = NaN; }, /not a number/); bad(s => { s.scenarios.quiet.weather.runs = []; }, /quiet\/weather: not measured/);
  bad(s => { s.diagEnd.gpuErrors = ['DEVICE LOST destroyed: the GPU process crashed']; }, /uncaptured WebGPU error/); bad(s => { s.diagInit.gpu.fxOk = false; }, /did not build/); bad(s => { s.scenarios = {}; }, /no scenario/);
  bad(s => { s.scenarios.quiet.both.runs[0].passMs = []; }, /timestamp queries but no pass time/); bad(s => { s.scenarios.cannonade.both.runs[0].sprites = Array(10).fill(0); }, /cannonade drew no sprites/);
  bad(s => { s.realGpu = true; s.diagEnd.adapter = { vendor: 'google', arch: 'swiftshader' }; }, /real-GPU run but its adapter is a software one/); bad(s => { s.realGpu = true; s.diagEnd.adapter = null; s.diagInit.adapter = null; }, /not recorded/);
  { const s = okSummary(); s.timestampQueries = false; for (const c of Object.values(s.scenarios)) c.both.runs[0].passMs = []; assert.equal(checkTiming(s).ok, true, 'a device without timestamp queries has no pass time and that is not a problem'); }
  { const s = okSummary(); s.api = 'webgl2'; s.timestampQueries = false; s.diagInit = { gl: { ok: true, log: [] } }; for (const c of Object.values(s.scenarios)) c.both.runs[0].passMs = []; assert.equal(checkTiming(s).ok, true, 'WebGL2 has no pass timer'); s.diagInit.gl.log = ['link failed']; assert.equal(checkTiming(s).ok, false); }
  { const s = okSummary(); s.modes = ['both', 'off']; delete s.scenarios.quiet.weather; delete s.scenarios.quiet.fx; delete s.scenarios.cannonade.weather; delete s.scenarios.cannonade.fx; assert.equal(checkTiming(s).ok, true, 'only the modes that were asked for are required'); }
  { const s = okSummary(); s.scenarios.cannonade.both.runs[0].doneMs = Array(10).fill(500); assert.equal(checkTiming(s).ok, true, 'a slow frame is a figure, not a problem'); }
  assert.equal(checkTiming({}).ok, false); assert.equal(checkTiming(null).ok, false);
});
test('the report: a software adapter is said first and is never a hardware figure; hardware is named; the budget is printed beside the figures and not applied; every mode has its row', () => {
  const hw = renderTimingMarkdown(okSummary()); assert.ok(hw.startsWith('# Timing of the weather and effects layer, WebGPU: '), hw.split('\n')[0]); assert.match(hw, /nvidia/); assert.match(hw, new RegExp(`desktop effects budget of ${DESKTOP_FX_BUDGET_MS} ms \\(printed for comparison, not a verdict\\)`));
  for (const m of MODES) assert.ok(new RegExp(`^\\| ${m} \\|`, 'm').test(hw), 'a row for ' + m); assert.match(hw, /## quiet: a quiet daytime sky/); assert.match(hw, /## cannonade: a dense cannonade/); assert.match(hw, /Layer cost \(frame, both against off\): 2 ms; weather pass alone: 1 ms; sprite pass alone: 1\.5 ms \(1500 ns per sprite\)/);
  const sw = okSummary(); sw.diagEnd.adapter = sw.diagInit.adapter = { vendor: 'google', arch: 'swiftshader' }; assert.ok(renderTimingMarkdown(sw).startsWith('# NOT A HARDWARE TIMING (WebGPU: software adapter'), renderTimingMarkdown(sw).split('\n')[0]);
  const no = okSummary(); no.diagEnd.adapter = no.diagInit.adapter = null; assert.ok(renderTimingMarkdown(no).startsWith('# NOT A HARDWARE TIMING (WebGPU: no adapter named'));
  const gl = okSummary(); gl.api = 'webgl2'; gl.timestampQueries = false; assert.match(renderTimingMarkdown(gl), /WebGL2 has no pass timers/); assert.equal(DESKTOP_FX_BUDGET_MS, 4.0, 'the desktop effects budget of FX3D-NOTES.md');
});
test('the stand-in plan: the default is the plan of the 16 cases event for event (the stored pictures depend on it); `dense` multiplies guns and men with unique shot ids; a bad value means the default', () => {
  const events = flags => { const P = makePlan((x, z) => 0.01 * x + 0.02 * z), ev = []; for (const t of ['fire', 'misfire', 'fall', 'unit_march', 'impact']) P.bus.on(t, (...a) => ev.push([t, ...a])); P.anchor({ x: 700, z: 200, yaw: 3.1 }, flags); const n = P.anim.advance(0, 61); return { n, ev, hash: crypto.createHash('sha256').update(JSON.stringify(ev)).digest('hex') }; };
  const LEGACY = 'e2641decefe9355194971ce82ca510bd207f49c285ab26774768e6dec7474c01', base = { guns: true, volleys: true, falls: true, march: true };
  assert.equal(events(base).hash, LEGACY, 'the plan as it was before `dense` existed'); assert.equal(events(base).n, 835); for (const d of [1, 0, -3, NaN, undefined, null, 'x', 0.5]) assert.equal(events({ ...base, dense: d }).hash, LEGACY, 'dense = ' + String(d));
  const dn = events({ guns: true, volleys: true, dense: 12 }); assert.ok(dn.n > 9000 && dn.n < 9200, 'about 11 times the 16-case plan: ' + dn.n); assert.equal(dn.ev.length, dn.n);
  const shots = dn.ev.filter(e => (e[0] === 'fire' && e[1] === 'US-ART') || (e[0] === 'impact' && e[4] === 'solid_strike')).map(e => e[7].shotId); assert.equal(new Set(shots).size, shots.length, 'a shot id names one shot');
  assert.equal(dn.ev.filter(e => e[0] === 'fire' && e[1] === 'US-ART').length, 6 * 12 * 7, '72 guns on a 10 s beat over 61 s: 0, 10, ..., 60'); assert.equal(dn.ev.filter(e => e[0] === 'fire' && e[1] === 'US-INF').length, 60 * 12 * 11, '720 men on a 6 s beat: 0, 6, ..., 60');
  assert.equal(events({ guns: true, volleys: true, dense: 12 }).hash, dn.hash, 'a pure function of its inputs'); assert.notEqual(events({ guns: true, volleys: true, dense: 3 }).hash, dn.hash);
  for (const e of dn.ev) for (const v of [e[5]].concat(e[0] === 'impact' ? [e[5]] : [])) if (Array.isArray(v)) assert.ok(v.every(Number.isFinite), 'finite positions');
});
test('the scenarios: both are inside the battle window and the specs the driver builds carry the cannonade plan; the quiet sky is the 14:00 clouds case of the 16', () => {
  assert.deepEqual(Object.keys(SCENARIOS), ['quiet', 'cannonade']); for (const c of Object.values(SCENARIOS)) { assert.ok(Array.isArray(c.m) && c.m.length === 4 && c.what && c.name); const t = specOf(c, minOf).tMin; assert.ok(t > minOf(7, 1, 0, 0) && t < minOf(7, 4, 0, 0), c.name + ' is inside the battle window'); }
  const q = SCENARIOS.quiet; assert.deepEqual([q.m, q.h, q.look], [[7, 3, 14, 0], 40, [Math.PI, 0.35]], 'the same view as day-clouds-jul3-1400'); const c = SCENARIOS.cannonade; assert.deepEqual([c.m, c.h, c.look], [[7, 3, 14, 0], 14, [Math.PI, 0.02]], 'the same view as smoke-jul3-1400');
  const drv = T('weather3d-gpu-timing.mjs'); assert.match(drv, /if \(sn === 'cannonade'\) spec\.plan = \{ guns: true, volleys: true, dense: DENSE \}/); assert.deepEqual(MODES, ['both', 'off', 'weather', 'fx']);
});
test('the driver and the page function: the flags, the stand-in canvas, the alternating order of the modes, the toggles of the layer, nothing random, and the scripts the real-GPU run names exist', () => {
  const drv = T('weather3d-gpu-timing.mjs'), page = T('weather3d-gpu-page.mjs');
  for (const f of ['--w=', 'frames', 'warm', 'rounds', 'tier', 'soldiers', 'dense', 'modes', 'scenarios', '--real-gpu', '--headed', '--chrome-arg=']) assert.ok(drv.includes(f), f + ' in the driver');
  assert.match(drv, /flag\('frames', 600\)/); assert.match(drv, /flag\('warm', 120\)/); assert.match(drv, /flag\('rounds', 2\)/); assert.match(drv, /flag\('w', 1920\)/); assert.match(drv, /flag\('h', 1080\)/); assert.match(drv, /flag\('tier', 'desktop'\)/);
  assert.match(drv, /addInitScript\(HOOKS, \{ realCanvas: false, trace: false \}\)/, 'the stand-in texture: the layer\'s cost is not the display\'s pace'); assert.match(drv, /chromeArgs\(REALGPU\)/); assert.match(drv, /const order = r % 2 \? MODE_LIST : \[\.\.\.MODE_LIST\]\.reverse\(\)/, 'the order of the modes alternates between rounds');
  assert.match(drv, /window\.WG\.timing\(a\)/); assert.ok(!/Math\.random/.test(drv + page), 'nothing random'); assert.match(drv, /process\.exit\(chk\.ok \? 0 : 1\)/);
  const fn = page.slice(page.indexOf('WG.timing = async function'), page.indexOf('// Negative controls of this harness')); assert.ok(fn.length > 500);
  assert.match(fn, /fi\.opts\.drawWeather = mode === 'both' \|\| mode === 'weather'; fi\.opts\.drawFx = mode === 'both' \|\| mode === 'fx'/); assert.match(fn, /if \(fi\) \{ fi\.opts\.drawWeather = true; fi\.opts\.drawFx = true; \} return out;/, 'the layer is left switched on');
  assert.match(fn, /fxHost\.update\(\{ tMin, cam \}\)/, 'fxHost.update runs every frame'); assert.match(fn, /const tMin = t0 \+ \(k \+ warm\) \/ 3600/, 'one 60th of a second per frame'); assert.match(fn, /dev\.queue\.onSubmittedWorkDone\(\)/); assert.match(fn, /gl\.finish\(\)/); assert.match(fn, /if \(k >= 0\)/, 'the warm-up frames are not counted');
  assert.match(fn, /pushErrorScope\('validation'\)/); assert.match(fn, /popErrorScope\(\)/); assert.match(fn, /passMsN/);
  for (const st of planSteps({ out: '/x' })) assert.ok(fs.existsSync(path.join(APP, 'tests', st.script)), st.script + ' exists');
  const ts = planSteps({ out: '/x/out' }).filter(s => s.kind === 'timing'); assert.deepEqual(ts.map(s => s.name), ['timing-webgpu', 'timing-webgl2']); for (const s of ts) { assert.ok(s.args.includes('--real-gpu') && s.args.includes('--w=1920') && s.args.includes('--h=1080'), s.name); assert.equal(s.script, 'weather3d-gpu-timing.mjs'); }
  assert.ok(planSteps({ out: '/x', headed: true }).filter(s => s.kind === 'timing').every(s => s.args.includes('--headed')));
});
test('the real-GPU command reads the timing runs: a software timing run is NOT a real-GPU result, a hardware one fills row W-E4 with the derived figures and its adapter, a failed one is a problem', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w3d-timing-')), put = (rel, o) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(path.join(path.dirname(f), path.basename(f)), JSON.stringify(o)); };
  try {
    const mk = (api, vendor, real, arch = 'x') => { const s = okSummary(); s.api = api; s.realGpu = real; s.diagInit.adapter = s.diagEnd.adapter = api === 'webgl2' ? { vendor: 'webgl2', arch: vendor, renderer: vendor } : { vendor, arch }; if (api === 'webgl2') { s.timestampQueries = false; s.diagInit.gl = { ok: true, log: [] }; for (const c of Object.values(s.scenarios)) c.both.runs[0].passMs = []; } return s; };
    put('timing/timing-webgpu/summary.json', mk('webgpu', 'nvidia', true)); put('timing/timing-webgl2/summary.json', mk('webgl2', 'ANGLE (NVIDIA, NVIDIA RTX Direct3D11 vs_5_0 ps_5_0, D3D11)', true));
    const R = summarize(tmp, { skipClose: true, skipShell: true }); const e4 = R.rows['W-E4']; assert.equal(R.timing.webgpu.present, true); assert.equal(R.timing.webgpu.ok, true, R.timing.webgpu.problems.join('; ')); assert.equal(R.timing.webgpu.derived.cannonade.layerMs, 2); assert.equal(R.timing.webgpu.derived.quiet.passMsMedian, 1.2); assert.equal(R.timing.webgpu.dense, 12); assert.deepEqual(R.timing.webgpu.size, [1920, 1080]);
    assert.equal(e4.timing.webgpu.derived.cannonade.fxMs, 1.5); assert.match(e4.owed, /not covered by this command/); assert.ok(R.adapters.some(a => a.run === 'timing-webgpu' && a.named && !a.software) && R.adapters.some(a => a.run === 'timing-webgl2'), 'the adapters of the timing runs are recorded like the others');
    assert.ok(!R.problems.some(p => /^timing /.test(p)), R.problems.join(' | '));
    put('timing/timing-webgpu/summary.json', mk('webgpu', 'google', true, 'swiftshader')); { const x = summarize(tmp, { skipClose: true, skipShell: true }); assert.equal(x.realGpu, false, 'a software adapter among the timing runs: not a real-GPU result'); assert.ok(x.problems.some(p => /^NOT A REAL-GPU RESULT: a run recorded a software adapter/.test(p)) || x.problems.some(p => /timing webgpu:.*software/.test(p)), x.problems.join(' | ')); }
    put('timing/timing-webgpu/summary.json', { ...mk('webgpu', 'nvidia', false) }); { const x = summarize(tmp, { skipClose: true, skipShell: true }); assert.equal(x.realGpu, false, 'a timing run that was not started with --real-gpu is not one'); }
    const broken = mk('webgpu', 'nvidia', true); broken.scenarios.quiet.both.runs[0].validation = 'Invalid BindGroup'; put('timing/timing-webgpu/summary.json', broken); { const x = summarize(tmp, { skipClose: true, skipShell: true }); assert.ok(x.problems.some(p => /^timing webgpu: .*validation error/.test(p)), x.problems.join(' | ')); }
    fs.rmSync(path.join(tmp, 'timing', 'timing-webgl2'), { recursive: true }); { const x = summarize(tmp, { skipClose: true, skipShell: true }); assert.ok(x.problems.some(p => /^timing webgl2: no summary/.test(p))); assert.equal(summarize(tmp, { skipClose: true, skipShell: true, skipTiming: true }).timing.webgl2, undefined, '--skip-timing: not expected'); }
    assert.ok(renderMarkdown(summarize(tmp, { skipClose: true, skipShell: true })).includes('W-E4'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// The page function itself, run in node against stand-ins for the page's globals: the source is cut out of weather3d-gpu-page.mjs and evaluated, so what runs here is the text that runs in the browser.
function pageTiming(over = {}) {
  const pg = T('weather3d-gpu-page.mjs'), a = pg.indexOf('WG.timing = async function'), b = pg.indexOf('// Negative controls of this harness'); assert.ok(a > 0 && b > a, 'the function is in the page file');
  const src = pg.slice(a, b).trim().replace(/^WG\.timing = /, '').replace(/;\s*$/, ''), calls = { scope: [], done: 0, finish: 0, frames: 0, updates: [], times: [], lights: 0, flags: [] }; let clock = 0;
  const fi = { opts: { drawWeather: true, drawFx: true }, gpu: { stats: { passMsN: 0, passMs: null } } }, dev = { pushErrorScope: k => calls.scope.push('push ' + k), popErrorScope: async () => { calls.scope.push('pop'); return over.scopeError || null; }, queue: { onSubmittedWorkDone: async () => { calls.done++; } } };
  const WG = { ready: true, host: { R: over.gl ? { gl: { finish: () => { calls.finish++; } } } : { dev }, setLight: () => { calls.lights++; }, frame: (t) => { calls.frames++; calls.flags.push([fi.opts.drawWeather, fi.opts.drawFx]); calls.times.push(t); } }, cam: { id: 'cam' }, env: { sample: t => ({ t }), weatherAt: () => ({}), light: () => ({ sunDir: [0, 1, 0], exposure: 1 }) }, geo: {}, choices: null, error: null };
  const fxHost = { instance: () => fi, update: ({ tMin }) => { calls.updates.push(tMin); if (over.passes !== false) { fi.gpu.stats.passMsN++; fi.gpu.stats.passMs = 1 + calls.updates.length / 100; } return { effects: { nSprites: 1000 + calls.updates.length } }; } };
  const perf = { now: () => (clock += 0.5) }, noop = () => { };
  const fn = new Function('WG', 'world', 'P', 'sample', 'light', 'FXON', 'fxHost', 'placeCamera', 'aimCamera', 'T', 'performance', 'return (' + src + ')')(WG, { show: { line: {} } }, { anchor: noop }, {}, {}, over.fxoff ? false : true, fxHost, noop, noop, {}, perf);
  return { fn, calls, fi, WG };
}
test('the page function runs in node: warm-up frames are not counted, the passes are toggled for the mode and switched on again, the simulation advances a 60th of a second per frame, the scope is pushed and popped once, and every series has one value per counted frame', async () => {
  const { fn, calls, fi } = pageTiming(); const r = await fn({ spec: { tMin: 100 }, frames: 5, warm: 2, mode: 'weather' });
  assert.equal(calls.frames, 7, 'warm + frames frames were drawn'); assert.equal(r.doneMs.length, 5); assert.equal(r.encMs.length, 5); assert.equal(r.updMs.length, 5); assert.equal(r.sprites.length, 5); assert.equal(r.passMs.length, 5, 'one pass time per counted frame'); assert.deepEqual(r.sprites, [1003, 1004, 1005, 1006, 1007], 'the warm-up frames (1001, 1002) are not counted');
  assert.deepEqual(calls.flags.every(f => f[0] === true && f[1] === false), true, 'mode weather: the weather pass on, the sprite pass off for every frame'); assert.deepEqual([fi.opts.drawWeather, fi.opts.drawFx], [true, true], 'both passes are on again afterwards');
  assert.deepEqual(calls.scope, ['push validation', 'pop']); assert.equal(r.validation, null); assert.equal(calls.done, 7, 'every frame waits for its GPU work'); assert.equal(calls.finish, 0); assert.equal(calls.lights, 7);
  for (let k = 0; k < 7; k++) assert.ok(Math.abs(calls.updates[k] - (100 + k / 3600)) < 1e-12, 'minute ' + k + ': ' + calls.updates[k]); assert.ok(r.doneMs.every(x => x > 0) && r.encMs.every(x => x > 0) && r.updMs.every(x => x > 0), 'the clock is read');
  for (const [mode, w, f] of [['both', true, true], ['off', false, false], ['fx', false, true]]) { const x = pageTiming(); await x.fn({ spec: { tMin: 1 }, frames: 2, warm: 1, mode }); assert.deepEqual(x.calls.flags[0], [w, f], mode); assert.deepEqual([x.fi.opts.drawWeather, x.fi.opts.drawFx], [true, true], mode + ' ends switched on'); }
});
test('the page function: a validation error in the frames is returned as text, a device without timestamp results has no pass series, WebGL2 finishes each frame instead of waiting on a queue, and a harness that is not ready refuses', async () => {
  { const { fn } = pageTiming({ scopeError: { message: 'Invalid BindGroup weather3d.bg' } }); const r = await fn({ spec: { tMin: 1 }, frames: 2, warm: 0, mode: 'both' }); assert.match(r.validation, /Invalid BindGroup/); }
  { const { fn } = pageTiming({ passes: false }); const r = await fn({ spec: { tMin: 1 }, frames: 3, warm: 1, mode: 'both' }); assert.deepEqual(r.passMs, [], 'no timestamp results: no pass time'); assert.equal(r.doneMs.length, 3); }
  { const { fn, calls } = pageTiming({ gl: true, passes: false }); const r = await fn({ spec: { tMin: 1 }, frames: 3, warm: 2, mode: 'both' }); assert.equal(calls.finish, 5, 'gl.finish per frame'); assert.equal(calls.done, 0); assert.equal(r.validation, null); assert.equal(r.doneMs.length, 3); }
  { const { fn } = pageTiming({ fxoff: true }); const r = await fn({ spec: { tMin: 1 }, frames: 2, warm: 0, mode: 'both' }); assert.deepEqual(r.sprites, [0, 0], 'the prototype alone has no effect sprites'); }
  { const { fn, WG } = pageTiming(); WG.ready = false; WG.error = 'no adapter'; await assert.rejects(fn({ spec: { tMin: 1 } }), /the harness is not ready: no adapter/); }
});

test('the real-GPU command can shorten the timing steps for a quick check before the long run (--timing-frames, --timing-warm, --timing-rounds), and by default passes nothing so the driver\'s 600 / 120 / 2 stand', () => {
  const dflt = planSteps({ out: '/x' }).filter(s => s.kind === 'timing'); for (const s of dflt) assert.ok(!s.args.some(a => /^--(frames|warm|rounds)=/.test(a)), s.name + ' passes no count by default');
  const q = planSteps({ out: '/x', timingFrames: '30', timingWarm: '5', timingRounds: '1' }).filter(s => s.kind === 'timing'); for (const s of q) for (const a of ['--frames=30', '--warm=5', '--rounds=1']) assert.ok(s.args.includes(a), s.name + ' ' + a);
  const one = planSteps({ out: '/x', timingFrames: '30' }).find(s => s.name === 'timing-webgpu'); assert.ok(one.args.includes('--frames=30') && !one.args.some(a => /^--(warm|rounds)=/.test(a)));
  const src = fs.readFileSync(path.join(APP, 'tests/weather3d-gpu-realrun.mjs'), 'utf8'); assert.match(src, /timingFrames: flag\('timing-frames', null\)/); assert.match(src, /--timing-frames=600/);
});
