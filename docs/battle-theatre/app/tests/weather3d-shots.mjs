// Harness (not a gate): opens the theatre on WebGL2 (SwiftShader software GL), installs fx-host from the page (no file of the shell is edited), points the camera at the sky or the ground for a set of times
// and writes screenshots plus the GL/effect counters.   nice -n 10 node docs/battle-theatre/app/tests/weather3d-shots.mjs <outDir> [caseName...]      one browser at a time
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
const out = process.argv[2] || '.', only = process.argv.slice(3), port = 10791; fs.mkdirSync(out, { recursive: true });
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
// look: 'sun' | 'moon' | [yaw, pitch] ; ground: camera height above ground (m) near the centre of the field, 0 = keep the overview position
const CASES = [
  { name: 'stars-jun28-0200', t: minOf(6, 28, 2, 0), look: [Math.PI, 0.55], h: 40 },
  { name: 'moon-jul3-2330', t: minOf(7, 3, 23, 30), look: 'moon', h: 40 },
  { name: 'moon-zoom-jul3-2330', t: minOf(7, 3, 23, 30), look: 'moon', h: 40, fov: 7 },
  { name: 'moon-zoom-jul2-2200', t: minOf(7, 2, 22, 0), look: 'moon', h: 40, fov: 7 },
  { name: 'dusk-jul2-2000', t: minOf(7, 2, 20, 0), look: 'sun', h: 40 },
  { name: 'dawn-fog-jul2-0430', t: minOf(7, 2, 4, 30), look: [Math.PI * 0.9, 0.03], h: 60 },
  { name: 'day-clouds-jul3-1400', t: minOf(7, 3, 14, 0), look: [Math.PI, 0.35], h: 40 },
  { name: 'wet-ground-jul4-1400', t: minOf(7, 4, 14, 0), look: [Math.PI, -0.18], h: 25 },
  { name: 'dry-ground-jul2-1400', t: minOf(7, 2, 14, 0), look: [Math.PI, -0.18], h: 25 },
  { name: 'smoke-jul3-1400', t: minOf(7, 3, 14, 0), look: [Math.PI, 0.02], h: 14, fire: true },
  { name: 'smoke-night-jul2-2200', t: minOf(7, 2, 22, 0), look: [Math.PI, 0.02], h: 14, fire: true },
];
const srv = await serve(port), base = `http://127.0.0.1:${port}/app/index.html?history=stub&api=webgl2&nearR=12&midR=60`;
const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await br.newContext({ viewport: { width: 720, height: 405 }, deviceScaleFactor: 1 }), page = await ctx.newPage(); const logs = [];
page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto(base, { waitUntil: 'load' }); await page.click('[data-bt-enter]'); await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout: 240000 });
console.log('api', await page.evaluate(() => window.btApp.api));
const res = await page.evaluate(async () => {
  const th = window.btApp.theatre, host = th.host, mod = await import('/app/src/fx-host.mjs'), { createAnimBus } = await import('/app/src/anim3d/events.mjs');
  const bus = createAnimBus(); window.__fireOn = false; window.__fireAt = [0, 0, 0];
  // a stand-in plan: a battery of six Napoleons fires a salvo every 20 s and 40 men fire a volley every 12 s, in front of the camera (the real plan is the host's; this only exercises the bus -> fx path)
  const anim = { bus, advance(t0, t1) { if (!window.__fireOn) return 0; let n = 0; const A = window.__fireAt, d = [0, 0, -1];
    for (let t = Math.ceil(t0 / 10) * 10; t < t1; t += 10) for (let g = 0; g < 6; g++) { const p = [A[0] - 25 + g * 10, A[1] + 1.1, A[2] - 45]; bus.emit('fire', 'US-ART', g, t + g * 0.7, 'cannon', p, d, { weaponId: 'napoleon_12pdr_m1857', round: 'shell', tier: 'inferred', cycleS: 40, ranksBack: 0, fuze: 'time', fuzeS: 2, gunIdx: g, shotId: 1000 + g + Math.floor(t) }); n++; }
    for (let t = Math.ceil(t0 / 6) * 6; t < t1; t += 6) for (let i = 0; i < 60; i++) { const p = [A[0] - 30 + i, A[1] + 1.4, A[2] - 30 - (i % 2) * 1.2]; bus.emit('fire', 'US-INF', i, t + (i % 7) * 0.3, 'long_arm', p, d, { weaponId: 'm1861_springfield', round: 'ball', tier: 'inferred', cycleS: 20, ranksBack: i % 2 }); n++; }
    return n; } };
  const fx = await mod.init(host, { environment: th.env, anim, choices: () => th.state.scenario.choices, nightFloor: th.state.settings.nightFloor, driveAnim: true, tier: 'laptop' });
  const orig = host.frame.bind(host); host.frame = (t, cam) => { window.__info = mod.update({ tMin: th.state.t, cam }); return orig(t, cam); };
  document.head.insertAdjacentHTML('beforeend', '<style>body *{visibility:hidden !important} canvas.w3d-keep{visibility:visible !important}</style>'); th.els.canvas.classList.add('w3d-keep'); window.__fxmod = mod; return { log: fx.log, gl: !!fx.gl, weatherOk: fx.gl && fx.gl.weatherOk, fxOk: fx.gl && fx.gl.fxOk, flags: { ...th.host.R.o.flags } };
});
console.log('init', JSON.stringify(res));
for (const c of CASES) {
  if (only.length && !only.includes(c.name)) continue;
  await page.evaluate(({ t, look, h, fire, fov }) => {
    const a = window.btApp, th = a.theatre, cam = th.cam, T = th.T; window.__fireOn = !!fire; a.setTime(t);
    const cx = 700, cz = 200, gy = T.h(cx, cz); cam.set(cx, gy + h, cz, 0, 0, fov || 60); window.__fireAt = [cx, gy, cz];
    th.controls.flight = null; th.sample = th.sample || {}; const s = th.env.sample(t, {});
    let yaw, pitch; if (look === 'sun') { yaw = Math.PI - s.sunAz * Math.PI / 180; pitch = Math.max(0.02, s.sunAlt * Math.PI / 180 * 0.9); } else if (look === 'moon') { yaw = Math.PI - s.moonAz * Math.PI / 180; pitch = s.moonAlt * Math.PI / 180; } else { [yaw, pitch] = look; }
    cam.yaw = yaw; cam.pitch = pitch; window.__look = { yaw, pitch, sunAlt: s.sunAlt, sunAz: s.sunAz, moonAlt: s.moonAlt, moonAz: s.moonAz, moonIllum: s.moonIllum };
  }, c);
  await page.evaluate(() => window.btApp.frames(3)); if (c.fire) { await page.evaluate(() => window.btApp.frames(3)); }
  await page.screenshot({ path: path.join(out, c.name + '.png'), timeout: 170000 });
  const info = await page.evaluate(() => { const i = window.__info; return i && { look: window.__look, state: i.driveState, vis: Math.round(i.weather.fog.visibilityM), cover: +i.weather.cloud.cover.toFixed(2), stars: +i.weather.sky.stars.visibility.toFixed(3), wet: +i.weather.wetness.v.toFixed(2), events: i.effects.nEvents, sprites: i.effects.nSprites, live: i.effects.liveEvents, gl: i.stats.gl, replays: i.stats.replays, text: i.effects.text.slice(0, 80), log: i.log.slice(0, 3) }; });
  console.log(c.name, JSON.stringify(info));
}
fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); console.log('console lines', logs.length, JSON.stringify(logs.filter(l => /error|fail|warn/i.test(l)).slice(0, 8))); console.log('done');
await ctx.close(); await br.close(); srv.close();
