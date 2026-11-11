// Harness (not a gate): opens the theatre on WebGL2 (SwiftShader), installs fx-host from the page, drives it for a set of times and writes screenshots + a JSON of GL logs.
//   nice -n 10 node docs/battle-theatre/app/tests/weather3d-shots.mjs <outDir> [times...]      one browser at a time
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
const out = process.argv[2] || '.', port = 10791; fs.mkdirSync(out, { recursive: true });
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
const CASES = [['day-clear-jul1-1200', 7, 1, 12, 0], ['dusk-jul2-2000', 7, 2, 20, 0], ['night-jul3-2330', 7, 3, 23, 30], ['night-jun28-0200', 6, 28, 2, 0], ['dawn-fog-jul2-0430', 7, 2, 4, 30], ['wet-jul4-1400', 7, 4, 14, 0], ['calm-jul3-1500', 7, 3, 15, 0]];
const srv = await serve(port), base = `http://127.0.0.1:${port}/app/index.html?history=stub&api=webgl2`;
const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await br.newContext({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 1 }), page = await ctx.newPage(); const logs = [];
page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto(base, { waitUntil: 'load' }); await page.click('[data-bt-enter]'); await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout: 180000 });
console.log('api', await page.evaluate(() => window.btApp.api));
const res = await page.evaluate(async () => {
  const th = window.btApp.theatre, host = th.host, mod = await import('/app/src/fx-host.mjs'), { createAnimBus } = await import('/app/src/anim3d/events.mjs');
  const bus = createAnimBus(), anim = { bus, advance(t0, t1) { return 0; } }; window.__bus = bus;
  const fx = await mod.init(host, { environment: th.env, anim, choices: () => th.state.scenario.choices, nightFloor: th.state.settings.nightFloor, driveAnim: false });
  const orig = host.frame.bind(host); host.frame = (t, cam) => { window.__info = mod.update({ tMin: th.state.t, cam }); return orig(t, cam); };
  window.__fxmod = mod; return { log: fx.log, gl: !!fx.gl, weatherOk: fx.gl && fx.gl.weatherOk, fxOk: fx.gl && fx.gl.fxOk };
});
console.log('init', JSON.stringify(res));
for (const [name, m, d, h, mm] of CASES) {
  await page.evaluate(t => { window.btApp.setTime(t); }, minOf(m, d, h, mm)); await page.evaluate(() => window.btApp.frames(4));
  // look up at the sky for the sky cases, at the ground otherwise
  await page.screenshot({ path: path.join(out, name + '.png'), timeout: 170000 });
  const info = await page.evaluate(() => { const i = window.__info; return i && { vis: i.weather.fog.visibilityM, cover: i.weather.cloud.cover, stars: i.weather.sky.stars.visibility, wet: i.weather.wetness.v, gl: i.stats.gl, log: i.log.slice(0, 3) }; });
  console.log(name, JSON.stringify(info));
}
fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); console.log('console lines', logs.length, logs.filter(l => /error|fail/i.test(l)).slice(0, 8));
await ctx.close(); await br.close(); srv.close();
