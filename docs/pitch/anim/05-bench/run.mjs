// Renderer benchmark runner.  Usage:
//   node docs/pitch/anim/05-bench/run.mjs --cands base,c2d-atlas1 --cfgs D1,P4 [--n 462] [--sec 10] [--gc] [--out results/main.json]
// Own static server (PORT_BASE), own Chrome profile under tmp/pitch-anim/arch, Mapbox hosts blocked at the resolver (the blank style needs none),
// metrics from CDP (Performance.getMetrics, SystemInfo.getProcessInfo, Tracing for GC).
// Needs tmp/pitch-anim/arch/vendor/mapbox-gl.{js,css} (3.24.1, fetched once from the Mapbox CDN, not committed: proprietary licence).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchChrome } from '../../../../tests/t0/lib.mjs';
import { buildScene } from './make-scene.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const VENDOR = path.join(REPO, 'tmp', 'pitch-anim', 'arch', 'vendor');
const PORT = Number(process.env.T0_PORT_BASE || 9580);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const CANDS = String(arg('cands', 'base,c2d-naive,c2d-atlas1,c2d-atlas2,gl-overlay,mbx-custom,mbx-hybrid,mbx-sym-set,mbx-sym-upd')).split(',');
const CFGS = String(arg('cfgs', 'D1')).split(',');
const PAGE = arg('page', null);
const REPS = Number(arg('reps', 1));
const N = Number(arg('n', 462)), SEC = Number(arg('sec', 10)), WARM = Number(arg('warm', 2)), GC = !!arg('gc', false), OUT = arg('out', null);
export const CONFIG = {
  D1: { w: 1440, h: 852, dpr: 1, throttle: 1, zoom: 12.4, label: 'desktop 1440x852 @1x, no throttle' },
  D2: { w: 1440, h: 852, dpr: 2, throttle: 1, zoom: 12.4, label: 'desktop 1440x852 @2x (retina), no throttle' },
  P4: { w: 390, h: 844, dpr: 3, throttle: 4, zoom: 11.4, label: 'phone 390x844 @3x, 4x CPU throttle' },
  P4c: { w: 390, h: 844, dpr: 2, throttle: 4, zoom: 11.4, label: 'phone 390x844 @2x (DPR capped), 4x CPU throttle' },
  D4: { w: 1440, h: 852, dpr: 1, throttle: 4, zoom: 12.4, label: 'desktop 1440x852 @1x, 4x CPU throttle' },
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pbf': 'application/x-protobuf' };

const scene = buildScene();
const sceneJson = JSON.stringify({ disp: scene.disp, units: scene.units });
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let f = null;
  if (u === '/favicon.ico') { r.statusCode = 204; return r.end(); }
  if (u === '/scene.json') { r.setHeader('content-type', 'application/json'); return r.end(sceneJson); }
  if (u === '/' || u === '/bench.html') f = path.join(HERE, 'page', 'bench.html');
  else if (u.startsWith('/page/')) f = path.join(HERE, u);
  else if (u.startsWith('/vendor/')) f = path.join(VENDOR, u.slice(8));
  else if (u.startsWith('/fonts/')) f = path.join(VENDOR, u);
  if (f && (f.startsWith(HERE) || f.startsWith(VENDOR))) {
    try { const b = fs.readFileSync(f); r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.setHeader('cache-control', 'no-store'); return r.end(b); } catch { /* 404 below */ }
  }
  r.statusCode = 404; r.end('not found');
}).listen(PORT, '127.0.0.1');

const profileDir = path.join(REPO, 'tmp', 'pitch-anim', 'arch', 'chrome-profile', 'bench');
fs.rmSync(profileDir, { recursive: true, force: true });
const chrome = await launchChrome({ profileDir, port: PORT + 1, size: [1440, 900], extraArgs: ['--enable-precise-memory-info', '--host-resolver-rules=MAP *.mapbox.com ~NOTFOUND'] });
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT + 1}`);
const context = browser.contexts()[0];
const bcdp = await browser.newBrowserCDPSession();

async function procCpu() {
  const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo');
  const o = {}; for (const p of processInfo) o[p.type] = (o[p.type] || 0) + p.cpuTime; return o;
}
const metricsOf = (arr) => Object.fromEntries(arr.map((m) => [m.name, m.value]));

async function traceGc(fn) {
  const events = [];
  const onData = (p) => events.push(...p.value);
  bcdp.on('Tracing.dataCollected', onData);
  const done = new Promise((res) => bcdp.once('Tracing.tracingComplete', res));
  await bcdp.send('Tracing.start', { categories: 'v8,devtools.timeline', transferMode: 'ReportEvents' });
  await fn();
  await bcdp.send('Tracing.end'); await done;
  bcdp.off('Tracing.dataCollected', onData);
  const gc = events.filter((e) => e.name === 'MinorGC' || e.name === 'MajorGC');
  return { minor: gc.filter((e) => e.name === 'MinorGC').length, major: gc.filter((e) => e.name === 'MajorGC').length, ms: +(gc.reduce((s, e) => s + (e.dur || 0), 0) / 1000).toFixed(1), events: events.length };
}

async function runOne(cand, cfgName, { trace = false } = {}) {
  const C = CONFIG[cfgName];
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push((String(e.message) + ' @ ' + String(e.stack || '').split(String.fromCharCode(10)).slice(1, 4).join(' | ')).slice(0, 600)));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_NAME_NOT_RESOLVED/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`); });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: C.w, height: C.h, deviceScaleFactor: C.dpr, mobile: false });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: C.throttle });
  await cdp.send('Performance.enable');
  const url = PAGE ? `http://127.0.0.1:${PORT}/page/${PAGE}?${cand}&sec=${SEC}` : `http://127.0.0.1:${PORT}/?cand=${cand}&n=${N}&w=${C.w}&h=${C.h}&zoom=${C.zoom}&sec=${SEC}&warm=${WARM}&v=${arg('v', '')}`;
  await page.goto(url);
  const res = { cand, cfg: cfgName, ...C };
  await page.waitForFunction(() => ['measure', 'done', 'error'].includes(window.__phase), null, { timeout: 120000, polling: 50 });
  if ((await page.evaluate(() => window.__phase)) === 'error') { res.error = await page.evaluate(() => window.__error); await page.close(); return res; }
  const m0 = metricsOf((await cdp.send('Performance.getMetrics')).metrics), c0 = await procCpu();
  let gc = null;
  const waitDone = () => page.waitForFunction(() => window.__phase === 'done' || window.__phase === 'error', null, { timeout: (SEC + 30) * 1000 * Math.max(1, C.throttle), polling: 100 });
  if (trace) gc = await traceGc(waitDone); else await waitDone();
  const m1 = metricsOf((await cdp.send('Performance.getMetrics')).metrics), c1 = await procCpu();
  const r = await page.evaluate(() => window.__result || { error: window.__error });
  Object.assign(res, r);
  const wall = m1.Timestamp - m0.Timestamp;
  res.mainBusyPct = +(100 * (m1.TaskDuration - m0.TaskDuration) / wall).toFixed(1);
  res.scriptPct = +(100 * (m1.ScriptDuration - m0.ScriptDuration) / wall).toFixed(1);
  res.rendererCpuPct = +(100 * ((c1.renderer || 0) - (c0.renderer || 0)) / wall).toFixed(1);
  res.gpuCpuPct = +(100 * ((c1.GPU || 0) - (c0.GPU || 0)) / wall).toFixed(1);
  res.heapMB = { start: +(m0.JSHeapUsedSize / 1048576).toFixed(1), end: +(m1.JSHeapUsedSize / 1048576).toFixed(1) };
  if (gc) res.gc = gc;
  if (errors.length) res.errors = errors.slice(0, 5);
  if (arg('shot', false)) { const f = path.join(HERE, 'results', `shot-${cand}-${cfgName}.png`); await page.screenshot({ path: f }); res.shot = path.basename(f); }
  await page.close();
  return res;
}

const results = [];
try {
  for (const cfgName of CFGS) {
    for (const cand of CANDS) for (let rep = 1; rep <= REPS; rep++) {
      const r = await runOne(cand, cfgName);
      r.rep = rep; r.loadAtStart = null;
      if (GC && rep === 1 && !r.error) { const g = await runOne(cand, cfgName, { trace: true }); r.gc = g.gc; r.gcPassFps = g.fps; }
      results.push(r);
      const s = r.error ? 'ERROR ' + String(r.error).split('\n')[0] : !r.interval ? JSON.stringify(r).slice(0, 700)
        : `fps ${r.fps} | iv p50 ${r.interval.p50} p95 ${r.interval.p95} max ${r.interval.max} | >33ms ${r.over33} | draw p50 ${r.drawMs.p50} p95 ${r.drawMs.p95} | upd ${r.updMs.mean} | main ${r.mainBusyPct}% rend ${r.rendererCpuPct}% gpu ${r.gpuCpuPct}%`
          + (r.gc ? ` | gc ${r.gc.minor}+${r.gc.major} ${r.gc.ms}ms` : '') + (r.errors ? ' | ERRORS ' + r.errors.join(' / ') : '');
      console.log(`[${cfgName}] ${cand.padEnd(14)} ${s}`);
    }
  }
} finally {
  if (OUT) { fs.mkdirSync(path.dirname(path.resolve(HERE, OUT)), { recursive: true }); fs.writeFileSync(path.resolve(HERE, OUT), JSON.stringify({ when: new Date().toISOString(), chrome: chrome.version, n: N, sec: SEC, warm: WARM, results }, null, 1)); }
  try { await browser.close(); } catch { /* closing */ }
  chrome.kill(); server.close();
}
