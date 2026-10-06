// usage: node run-browser.mjs <baseline|r1c> <trace|timing> [vp=desktop]
// trace  = full probe (per-draw-call hooks): digests per frame + sample frames, used to validate the deterministic replay against the real page
// timing = light probe (rAF cadence, unit redraw timestamps, rAF-callback duration, long tasks): honest timing, unit-canvas cost not distorted
import fs from 'node:fs';
import { serve, open, boot, readState, sleep, setTick, clickSpeed, playPause, tickNow, camera, mapView, tileBudget, wj, WORK, cdpFor } from './common.mjs';
const which = process.argv[2] || 'r1c'; const mode = process.argv[3] || 'timing'; const vp = process.argv[4] || 'desktop';
const probeSrc = fs.readFileSync(`${WORK}/${mode === 'trace' ? 'probe.js' : 'probe-light.js'}`, 'utf8');
const srv = await serve(which);
const S = await open({ vp });
await S.page.addInitScript(probeSrc);
const out = { build: which, mode, vp, startedAt: new Date().toISOString(), runs: [] };
const P = S.page;
const call = (m, ...a) => P.evaluate(([m, a]) => window[m.split('.')[0]][m.split('.')[1]](...a), [m, a]);
const PR = mode === 'trace' ? '__probe' : '__pl';
async function pauseIfPlaying() { if ((await P.locator('button[title^="Play/Pause"]').textContent()).trim() !== '▶') await playPause(P); }
async function run({ label, speed, start, ms, zoom, center, cpu = 1 }) {
  await pauseIfPlaying();
  if (zoom || center) { await camera(P, { ...(center ? { center } : {}), ...(zoom ? { zoom } : {}) }); await sleep(2500); }
  const c = await cdpFor(P); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await setTick(P, start); await sleep(800);
  await clickSpeed(P, speed);
  await sleep(300);
  await P.evaluate((PR) => window[PR].start(), PR);
  await playPause(P);
  await sleep(ms);
  await playPause(P);
  const tr = await P.evaluate(([PR, mode]) => (mode === 'trace' ? window[PR].digest(97) : window[PR].stop()), [PR, mode]);
  await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const endTick = await tickNow(P);
  const cam = await mapView(P);
  out.runs.push({ label, speed, start, ms, zoom: cam.zoom, center: cam.center, cpu, endTick, ...tr });
  console.log(`${label}: speed ${speed} start ${start} -> end ${endTick}, ${(tr.raf || tr.frames).length} entries, tiles used ${tileBudget.used}`);
}
try {
  await boot(P === S.page ? S : S, srv.url);
  await sleep(1500);
  // warm-up so lazily loaded days (baseline loads days 2 and 3 on the first playback past tick 200/420) are present before measuring
  await setTick(P, 421); await sleep(500); await clickSpeed(P, '8x'); await playPause(P); await sleep(2500); await playPause(P); await sleep(1500);
  const SPEEDS = ['1/4x', '1/2x', '1x', '2x', '4x', '8x'];
  const startFor = { '1/4x': 520, '1/2x': 520, '1x': 520, '2x': 520, '4x': 500, '8x': 440 };
  if (mode === 'trace') {
    for (const sp of ['1x', '8x']) await run({ label: `trace-${sp}-dense`, speed: sp, start: 520, ms: sp === '8x' ? 6000 : 8000 });
    for (const sp of ['1x']) await run({ label: `trace-${sp}-sparse`, speed: sp, start: 60, ms: 8000 });
  } else {
    for (const sp of SPEEDS) await run({ label: `timing-${sp}-dense-z13.5`, speed: sp, start: startFor[sp], ms: 20000 });
    await run({ label: 'timing-1x-sparse-z13.5', speed: '1x', start: 60, ms: 20000 });
    await run({ label: 'timing-4x-cpu4-dense-z13.5', speed: '4x', start: 500, ms: 15000, cpu: 4 });
    await run({ label: 'timing-1x-cpu4-dense-z13.5', speed: '1x', start: 520, ms: 15000, cpu: 4 });
  }
  wj(`${WORK}/runs-${which}-${mode}-${vp}.json`, out);
} finally { await S.close(); await srv.close(); }
