// Real-app test of the prototype group in real Chrome through the repo's harness (tests/t0/lib.mjs): the same script runs against the CONTROL tree (R1c + MON) and the PROTO tree (R1c + MON + ANIM).
//   node docs/pitch/anim/05-proto/test/app-proto.mjs --dist tmp/pitch-anim/arch/anim-R1c-control/dist --label control
//   node docs/pitch/anim/05-proto/test/app-proto.mjs --dist tmp/pitch-anim/arch/anim-R1c/dist --label proto
// Mapbox tiles go through the harness (Referer injection, capped: one process = one budget of T0_TILE_CAP, default 300).  Results: docs/pitch/anim/05-proto/results/app-<label>.json
process.env.T0_AGENT = 'pitch-anim/arch';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9580';
const lib = await import('../../../../../tests/t0/lib.mjs');
const { openSession, createStaticServer, waitForApp, chooseLayout, sleep, tileBudget, PORT_BASE } = lib;
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadByTick } from '../../../../../tmp/pitch-anim/arch/data-load.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const DIST = path.resolve(arg('dist')), LABEL = arg('label', 'run'), SEC = Number(arg('sec', 10)), PHONE = argv.includes('--phone');
const ONLY = arg('only', null) ? arg('only').split(',') : null, REP = arg('rep', '');
const OUT = path.join(HERE, '..', 'results'); fs.mkdirSync(OUT, { recursive: true });
const res = { label: LABEL, dist: path.relative(process.cwd(), DIST), when: new Date().toISOString(), phone: PHONE, steps: {} };
const step = async (name, fn) => { if (ONLY && name !== 'boot' && !ONLY.includes(name)) return; const t0 = Date.now(); try { res.steps[name] = { ok: true, ...(await fn()) }; } catch (e) { res.steps[name] = { ok: false, error: String(e && e.message || e).slice(0, 500) }; } res.steps[name].ms = Date.now() - t0; console.log(name, JSON.stringify(res.steps[name]).slice(0, 400)); };

const server = await createStaticServer({ root: DIST, port: PORT_BASE });
const vp = PHONE ? { width: 375, height: 812, dpr: 3, mobile: true } : { width: 1440, height: 900, dpr: 1 };
const s = await openSession({ profile: LABEL + (PHONE ? '-phone' : ''), cdpPort: PORT_BASE + 1, tiles: 'inject', viewport: vp, initScripts: [() => {
  window.__gtanimStrict = true;                                                     // engine errors are rethrown (and counted) instead of silently falling back
  window.__probe = { on: false, iv: [], last: 0 };
  (function loop(t) { const p = window.__probe; if (p.on) { if (p.last) p.iv.push(t - p.last); p.last = t; } else p.last = 0; requestAnimationFrame(loop); })(0);
  // position capture: delimit frames by clearRect on the big 2D canvas; legacy draws each unit with translate(x, y); the engine's last frame is read through window.__gtanim.G.describe()
  window.__rec = { on: false, frames: [], cur: null, mode: null };
  const P = CanvasRenderingContext2D.prototype, oC = P.clearRect, oT = P.translate;
  P.clearRect = function (x, y, w, h) { const r = window.__rec; if (r.on && this.canvas && this.canvas.width >= 300 && this.canvas.height >= 300 && w >= 300) { if (r.mode === 'engine') { const g = window.__gtanim && window.__gtanim.G; if (g && r.started) r.frames.push(g.describe().map((d) => [d.id, (d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2])); r.started = true; } else { if (r.cur) r.frames.push(r.cur); r.cur = []; } } return oC.apply(this, arguments); };
  P.translate = function (x, y) { const r = window.__rec; if (r.on && r.mode === 'legacy' && r.cur && this.canvas && this.canvas.width >= 300) r.cur.push([x, y]); return oT.apply(this, arguments); };
}] });
const page = s.page; const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error' && !/mapbox|Failed to load resource|tiles|403|net::/i.test(m.text())) errors.push('console.error: ' + m.text().slice(0, 300)); });
const cdp = await lib.cdpFor(page);
const URLQ = (q) => `http://127.0.0.1:${PORT_BASE}/?${q}`;
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const stats = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), q = (p) => b[Math.min(b.length - 1, Math.floor(p * (b.length - 1)))]; return { n: a.length, mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: +q(.5).toFixed(2), p95: +q(.95).toFixed(2), p99: +q(.99).toFixed(2), max: +b.at(-1).toFixed(2), over20: a.filter((x) => x > 20).length, over33: a.filter((x) => x > 33.4).length, over50: a.filter((x) => x > 50).length }; };
await cdp.send('Performance.enable');

await step('boot', async () => {
  await page.goto(URLQ('tick=450&z=13.2&ll=39.812,-77.2373'), { timeout: 90000 });
  await waitForApp(page); await chooseLayout(page, PHONE ? 'mobile' : 'desktop'); await sleep(6000);
  const info = await page.evaluate(() => ({ engine: window.__gtanim ? window.__gtanim.info() : null, canvases: [...document.querySelectorAll('canvas')].map((c) => [c.width, c.height, c.style.width, c.style.zIndex, getComputedStyle(c).pointerEvents]) }));
  await page.screenshot({ path: path.join(OUT, `shot-${LABEL}-boot.png`) });
  return { info, tileRequests: tileBudget.used };
});

async function play(label, throttle) {
  await page.goto(URLQ('tick=300&z=13.2&ll=39.812,-77.2373')); await waitForApp(page); await chooseLayout(page, PHONE ? 'mobile' : 'desktop'); await sleep(5000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  for (let i = 0; i < 3; i++) await page.keyboard.press('+');                          // 1x -> 8x
  await page.keyboard.press(' ');                                                       // play
  await sleep(2500);
  await page.evaluate(() => { window.__probe.iv = []; window.__probe.on = true; window.__stages = { n: 0, sum: {} }; window.__stageTimer = setInterval(() => { const g = window.__gtanim && window.__gtanim.G; if (!g) return; const ms = g.m.ms, st = window.__stages; st.n++; for (const k of Object.keys(ms)) st.sum[k] = (st.sum[k] || 0) + ms[k]; }, 50); });
  const m0 = await metrics(); const t0 = Date.now();
  await sleep(SEC * 1000);
  const m1 = await metrics(); const wall = (Date.now() - t0) / 1000;
  const iv = await page.evaluate(() => { window.__probe.on = false; clearInterval(window.__stageTimer); return window.__probe.iv; });
  const stages = await page.evaluate(() => { const st = window.__stages; return st && st.n ? Object.fromEntries(Object.entries(st.sum).map(([k, v]) => [k, +(v / st.n).toFixed(2)])) : null; });
  await page.keyboard.press(' ');                                                       // pause
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const info = await page.evaluate(() => (window.__gtanim ? window.__gtanim.info() : null));
  return { label, throttle, interval: stats(iv), fps: +(iv.length / (iv.reduce((a, b) => a + b, 0) / 1000)).toFixed(1), mainBusyPct: +(100 * (m1.TaskDuration - m0.TaskDuration) / (m1.Timestamp - m0.Timestamp)).toFixed(1), scriptPct: +(100 * (m1.ScriptDuration - m0.ScriptDuration) / (m1.Timestamp - m0.Timestamp)).toFixed(1), layoutMsPerSec: +(1000 * (m1.LayoutDuration - m0.LayoutDuration) / wall).toFixed(1), heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1), engineStageMsMean: stages, engine: info };
}
await step('play8x', () => play('8x at 1x CPU', 1));
await step('play8x_4xcpu', () => play('8x at 4x CPU', 4));

async function capture(mode, ms) {                                                      // per-frame tile positions while playing: spike analysis
  await page.evaluate((m) => { window.__rec = Object.assign(window.__rec, { on: true, frames: [], cur: null, started: false, mode: m }); }, mode);
  await page.keyboard.press(' '); await sleep(ms); await page.keyboard.press(' ');
  const frames = await page.evaluate(() => { const r = window.__rec; r.on = false; return r.frames; });
  const nf = frames.length; let steps = 0, spikes = 0, spikes60 = 0, appear = 0; const per = {};
  frames.forEach((f, i) => { if (mode === 'engine') f.forEach(([id, x, y]) => { (per[id] ||= new Array(nf).fill(null))[i] = [x, y]; }); else f.forEach(([x, y], k) => { (per[k] ||= new Array(nf).fill(null))[i] = [x, y]; }); });
  if (mode === 'legacy') { for (let i = 1; i < nf; i++) if (frames[i].length !== frames[i - 1].length) for (const k of Object.keys(per)) per[k][i] = null; }          // index matching only while the set of drawn tiles is unchanged
  for (const k of Object.keys(per)) {
    const st = new Array(nf).fill(null); for (let i = 1; i < nf; i++) { const a = per[k][i - 1], b = per[k][i]; if (b && !a && i > 1) appear++; if (a && b) st[i] = Math.hypot(b[0] - a[0], b[1] - a[1]); }
    for (let i = 1; i < nf; i++) { if (st[i] == null) continue; steps++; const nb = []; for (let d = -4; d <= 4; d++) if (d && st[i + d] != null) nb.push(st[i + d]); nb.sort((x, y) => x - y); const med = nb.length ? nb[nb.length >> 1] : 0; if (st[i] > 8 && st[i] > 6 * Math.max(med, 0.5)) { spikes++; if (st[i] > 60) spikes60++; } }
  }
  return { mode, frames: nf, tracked: Object.keys(per).length, unitFrameSteps: steps, spikesOver8pxAnd6xNeighbours: spikes, spikesOver60px: spikes60, appearances: appear };
}
await step('positions', async () => {
  await page.goto(URLQ('tick=300&z=13.2&ll=39.812,-77.2373')); await waitForApp(page); await chooseLayout(page, PHONE ? 'mobile' : 'desktop'); await sleep(5000);
  for (let i = 0; i < 3; i++) await page.keyboard.press('+');
  return capture(await page.evaluate(() => (window.__gtanim && window.__gtanim.state() === 1 ? 'engine' : 'legacy')), 9000);
});

await step('pick', async () => {                                                        // click a tile at a position where legacy and engine agree (tick 675: every unit holds its last keyframe)
  const { byTick } = loadByTick(); const last = {}; for (let t = 1; t <= 675; t++) for (const r of byTick[t] || []) last[r.unit_id] = r;
  const Z = 15, ws = 512 * Math.pow(2, Z), mxf = (l) => (l + 180) / 360, myf = (a) => { const q = Math.sin(a * Math.PI / 180); return 0.5 - Math.log((1 + q) / (1 - q)) / (4 * Math.PI); };
  await page.goto(URLQ('tick=675&z=15&ll=39.812,-77.2373')); await waitForApp(page); await chooseLayout(page, PHONE ? 'mobile' : 'desktop'); await sleep(5000);
  const R = await page.evaluate(() => { const r = document.querySelector('.mapboxgl-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const c = { lng: -77.2373, lat: 39.812 }, W = R.w, H = R.h, top = R.y;
  const pts = Object.values(last).map((r) => ({ id: r.unit_id, x: R.x + (mxf(r.lng) - mxf(c.lng)) * ws + W / 2, y: (myf(r.lat) - myf(c.lat)) * ws + H / 2 + top })).filter((p) => p.x > R.x + 40 && p.x < R.x + W - 40 && p.y > top + 40 && p.y < top + H - 40);
  const iso = pts.filter((p) => pts.every((q) => q === p || Math.hypot(q.x - p.x, q.y - p.y) > (PHONE ? 40 : 70))); if (!iso.length) throw new Error('no isolated unit in view');
  const free = await page.evaluate((c) => c.filter((p) => { const e = document.elementFromPoint(p.x, p.y); return e && /mapboxgl-canvas/.test(e.className); }).map((p) => p.id), iso);   // a unit whose pixel is the bare map (not under a card, panel or control)
  const u = iso.find((p) => free.includes(p.id)); if (!u) throw new Error('no isolated unit on the bare map');
  const shown = PHONE ? async () => page.evaluate(() => (/Cmd:/.test(document.body.innerText) ? 1 : 0)) : async () => page.locator('[title="Copy share link"]').count();     // the phone shows a sheet ("Cmd: ...") instead of the desktop panel
  const before = await shown();
  if (PHONE) await lib.touchTap(page, u.x, u.y); else { await page.mouse.move(u.x, u.y); await page.mouse.down(); await page.mouse.up(); }
  await sleep(1200);
  const after = await shown();
  const panelText = after ? (PHONE ? await page.evaluate(() => { const e = [...document.querySelectorAll('div')].filter((d) => /Cmd:/.test(d.innerText) && d.innerText.length < 400).sort((x, y) => x.innerText.length - y.innerText.length)[0]; return e ? e.innerText.split(String.fromCharCode(10)).slice(0, 3).join(' | ') : null; }) : await page.locator('[title="Copy share link"]').first().evaluate((el) => el.parentElement.parentElement.innerText.split(String.fromCharCode(10)).slice(0, 4).join(' | '))) : null;
  await page.screenshot({ path: path.join(OUT, `shot-${LABEL}-picked.png`) });
  await page.mouse.click(40, vp.height / 2 + 200);                                      // empty ground deselects (legacy contract)
  await sleep(600);
  const eng = await page.evaluate(() => (window.__gtanim ? window.__gtanim.info() : null));
  return { unit: u.id, at: [Math.round(u.x), Math.round(u.y)], enginePicksAfterClick: eng && eng.picks, panelBefore: before, panelAfter: after, panelText, panelAfterEmptyClick: await shown() };
});

await step('ancestor_deeplink', async () => {
  await page.goto(URLQ('ancestor=U-20ME')); await waitForApp(page); await chooseLayout(page, PHONE ? 'mobile' : 'desktop'); await sleep(6000);
  const panel = await page.locator('[title="Copy share link"]').count(); await page.screenshot({ path: path.join(OUT, `shot-${LABEL}-ancestor.png`) });
  return { panel, engine: await page.evaluate(() => (window.__gtanim ? window.__gtanim.info() : null)) };
});

await step('reduced_motion', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URLQ('tick=300&z=13.2&ll=39.812,-77.2373')); await waitForApp(page); await chooseLayout(page, PHONE ? 'mobile' : 'desktop'); await sleep(5000);
  const flag = await page.evaluate(() => !!window.__gtbgReduceMotion);
  await page.keyboard.press(' '); await sleep(3000); await page.keyboard.press(' ');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return { reduceFlag: flag, engine: await page.evaluate(() => (window.__gtanim ? window.__gtanim.info() : null)) };
});

res.errors = errors.slice(0, 20); res.errorCount = errors.length; res.collector = s.collector.firstParty.slice(0, 10); res.tileRequests = tileBudget.used;
fs.writeFileSync(path.join(OUT, `app-${LABEL}${PHONE ? '-phone' : ''}${REP ? '-' + REP : ''}.json`), JSON.stringify(res, null, 1));
console.log('errors', errors.length, 'tile requests', tileBudget.used);
await s.close(); await server.close();
