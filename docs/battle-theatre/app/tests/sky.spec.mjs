// Gate Q10 (night visibility) and the sky: at night times the rendered frame keeps a minimum luminance and contrast with the placeholder units in view, the sky is
// dimmed (not blackened), and the light direction follows the project's sun and moon table. The luminance floor is a parameter (Settings).
//   node --test docs/battle-theatre/app/tests/sky.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { startServer, launch, open, enter, outFile } from './lib.mjs';

let S, B, page, ctx, log; const rows = [];
test.before(async () => { S = await startServer(10786); B = await launch(); ({ ctx, page, log } = await open(B, S.base, { history: 'stub', w: 1280, h: 720 })); await enter(page); });
test.after(async () => { fs.writeFileSync(outFile('results-sky.json'), JSON.stringify(rows, null, 1)); await ctx.close(); await B.close(); await S.close(); });
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
const frames = n => page.evaluate(n => window.btApp.frames(n), n);
const region = { x: 440, y: 70, width: 820, height: 560 };
async function lumaStats(buf) {
  return page.evaluate(async b64 => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d'); g.drawImage(bm, 0, 0); const d = g.getImageData(0, 0, bm.width, bm.height).data, n = d.length / 4, h = new Uint32Array(256); let sum = 0, dark = 0;
    for (let i = 0; i < d.length; i += 4) { const y = Math.round(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]); h[y]++; sum += y; if (y < 8) dark++; } const pc = p => { let a = 0; for (let k = 0; k < 256; k++) { a += h[k]; if (a >= p * n) return k; } return 255; };
    const p5 = pc(.05), p95 = pc(.95); return { mean: sum / n, p5, p50: pc(.5), p95, dark: dark / n, michelson: (p95 - p5) / (p95 + p5 + 1e-6) }; }, buf.toString('base64'));
}
async function at(t) { await page.locator('#bt-slider').fill(String(Math.floor(t))); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await frames(6); return page.screenshot({ clip: region }); }
async function lookAtUnits() {
  await page.evaluate(() => { const a = window.btApp, th = a.theatre, st = a.stage; a.setTime(46890); }); await frames(3);
  await page.evaluate(() => { const a = window.btApp, th = a.theatre, st = a.stage; const i = st.w.units.findIndex((u, k) => st.present[k] && u.kind === 'line' && u.team === 0 && k > 8); th.controls.flyTo(th.viewFor(st.cx[i], st.cz[i], { dist: 55, height: 7 }), 0); }); await frames(3);
}

test('night frames keep luminance and contrast with units in view (Q10), and are dimmer than the day', async () => {
  await lookAtUnits(); const day = await lumaStats(await at(minOf(7, 3, 13, 30)));
  const times = [[7, 3, 20, 30], [7, 3, 22, 0], [7, 3, 23, 30], [7, 4, 1, 0], [7, 4, 2, 30], [7, 4, 3, 30], [7, 2, 0, 30], [7, 2, 23, 0], [7, 6, 1, 30], [7, 9, 0, 30]];
  console.log(`# day 3 Jul 13:30: mean luma ${day.mean.toFixed(1)}/255, p5 ${day.p5}, p95 ${day.p95}, contrast ${day.michelson.toFixed(2)}`);
  for (const [m, d, h, mm] of times) {
    const t = minOf(m, d, h, mm), s = await lumaStats(await at(t)), env = await page.evaluate(() => { const th = window.btApp.theatre, sm = th.sample; return { sunAlt: sm.sunAlt, moonAlt: sm.moonAlt, moonIllum: sm.moonIllum, moonUp: sm.moonUp, exposure: th.light.exposure, src: sm.src, cloud: th.wx.cloud }; });
    rows.push({ t: `${d} Jul ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, sunAlt: +env.sunAlt.toFixed(1), moonAlt: +env.moonAlt.toFixed(1), moonIllum: +env.moonIllum.toFixed(0), exposure: +env.exposure.toFixed(2), ...Object.fromEntries(Object.entries(s).map(([k, v]) => [k, +v.toFixed(3)])) });
    console.log(`# night ${d} Jul ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}  sun ${env.sunAlt.toFixed(0)}° moon ${env.moonUp ? env.moonAlt.toFixed(0) + '° ' + env.moonIllum.toFixed(0) + '%' : 'down'}  exposure ${env.exposure.toFixed(2)}  mean luma ${s.mean.toFixed(1)}  p5 ${s.p5}  p95 ${s.p95}  contrast ${s.michelson.toFixed(2)}  near-black pixels ${(s.dark * 100).toFixed(1)}%`);
    assert.ok(env.sunAlt < -6, `${d} Jul ${h}:${mm} is night`);
    assert.ok(s.mean >= 24, `mean luminance ${s.mean.toFixed(1)} below the floor of 24/255`); assert.ok(s.p5 >= 6, `5th percentile ${s.p5}`); assert.ok(s.dark < 0.02, `${(s.dark * 100).toFixed(1)}% of pixels are near black`); assert.ok(s.michelson >= 0.2, `contrast ${s.michelson.toFixed(2)}`);
    assert.ok(s.mean < day.mean * 0.75, `night frame not dimmer than the day (${s.mean.toFixed(1)} vs ${day.mean.toFixed(1)})`);
  }
});

test('the luminance floor is a parameter: raising it brightens the night monotonically, and its lowest setting still leaves the night visible', async () => {
  await lookAtUnits(); const t = minOf(7, 4, 1, 0); await at(t); const got = [];
  await page.click('[data-panel=settings]');
  for (const f of [0.15, 0.25, 0.34, 0.5, 0.6]) { await page.locator('#st-floor').fill(String(f)); await frames(6); const s = await lumaStats(await page.screenshot({ clip: region })); got.push([f, s.mean, s.dark]); }
  console.log('# night floor -> mean luma: ' + got.map(([f, m, d]) => `${f} -> ${m.toFixed(1)} (${(d * 100).toFixed(1)}% near black)`).join(', '));
  for (let i = 1; i < got.length; i++) assert.ok(got[i][1] > got[i - 1][1], 'monotonic'); assert.ok(got[0][1] >= 12, `lowest floor still shows the night (${got[0][1].toFixed(1)})`); assert.ok(got[0][2] < 0.08);
  await page.locator('#st-floor').fill('0.34'); await page.keyboard.press('Escape');
});

test('the light follows the table: at night the light comes from the moon where the sky table puts it; by day from the sun', async () => {
  await lookAtUnits(); const check = async (t, which) => { await page.locator('#bt-slider').fill(String(Math.floor(t))); await frames(4); return page.evaluate(() => { const th = window.btApp.theatre, l = th.light, s = th.sample; const az = (Math.atan2(l.sunDir[0], -l.sunDir[2]) * 180 / Math.PI + 360) % 360; return { az, alt: Math.asin(l.sunDir[1]) * 180 / Math.PI, sunAz: s.sunAz, moonAz: s.moonAz, moonUp: s.moonUp, sunAlt: s.sunAlt, moonAlt: s.moonAlt }; }); };
  const ang = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  const d = await check(minOf(7, 3, 15), 'day'); assert.ok(ang(d.az, d.sunAz) < 1, `day light azimuth ${d.az.toFixed(1)} vs sun ${d.sunAz.toFixed(1)}`); assert.ok(Math.abs(d.sunAz - 259) < 2, 'sun azimuth 259 at 15:00 on 3 Jul (PDF B.10.2)');
  const n = await check(minOf(7, 4, 1), 'night'); assert.ok(n.moonUp, 'moon up at 01:00 on 4 Jul'); assert.ok(ang(n.az, n.moonAz) < 1, `night light azimuth ${n.az.toFixed(1)} vs moon ${n.moonAz.toFixed(1)}`);
  console.log(`# 3 Jul 15:00 light azimuth ${d.az.toFixed(1)} (sun ${d.sunAz.toFixed(1)}); 4 Jul 01:00 light azimuth ${n.az.toFixed(1)} (moon ${n.moonAz.toFixed(1)}, ${n.moonAlt.toFixed(0)} deg up)`);
});

test('the day and night bar under the picture shows the same sky: dark where the sun is down, light where it is up', async () => {
  const v = await page.evaluate(() => { const cv = document.getElementById('bt-strip'), g = cv.getContext('2d'), W = cv.width, H = cv.height, r = (m) => { const dpr = W / cv.getBoundingClientRect().width, x = Math.round(((m - 36000) / (63360 - 36000)) * W); const d = g.getImageData(Math.min(W - 1, x), Math.round(H * .6), 1, 1).data; return .2126 * d[0] + .7152 * d[1] + .0722 * d[2]; }; const m = (d, h) => ({ 6: 0, 7: 30 }[7] + d - 1) * 1440 + h * 60; return { noon: r(m(3, 12)), midnight: r(m(4, 2)), noon10: r(m(10, 12)), midnight10: r(m(10, 2)) }; });
  console.log(`# strip luminance: noon 3 Jul ${v.noon.toFixed(0)}, midnight ${v.midnight.toFixed(0)}, noon 10 Jul (formula days) ${v.noon10.toFixed(0)}, midnight ${v.midnight10.toFixed(0)}`); assert.ok(v.noon > v.midnight * 2.5 && v.noon10 > v.midnight10 * 2.5);
});

test('no console errors', async () => { assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); });
