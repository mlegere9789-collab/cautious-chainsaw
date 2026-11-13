// Shared test helpers: static server (the source shell, or a packed dist with BT_DIST), system Chrome (WebGPU on the high-performance GPU; software GL when the machine has no GPU),
// console capture, the instrumentation that counts what a visit could leak, and the two rules for a machine that cannot draw in real time: THE ONE KNOB for waits (SLOW, wait, T) and the
// NOT RUN marking of what only a real GPU can answer (test, t.gpuOnly).
//
// Environment switches (all optional):
//   BT_API=webgpu|webgl2|auto   the renderer the address asks for (the shell's default is WebGL2: delegated decision DD-27)
//   BT_EXTRA=a=b&c=d            more address parameters for every page a spec opens
//   BT_DIST=<folder>            serve this folder (a packed staging dist: tools/bt/pack_theatre.mjs) instead of the source tree
//   BT_GL=auto|gpu|software     auto (default): the hardware flags first, SwiftShader when the browser gets no WebGL2 context from them; gpu: never fall back; software: SwiftShader at once
//   BT_WAIT_K=<number>          fixes the wait scale (debugging only; unset = measured, see SLOW)
//   BT_OUT=<name>               the numbers and pictures a spec writes go to tests/results/<name>/ (default: the tests folder on a hardware renderer, tests/results/sw-latest/ on a software one)
import nodeTest from 'node:test'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
export const GPU_ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--force_high_performance_gpu'];
export const SW_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];        // software GL (SwiftShader): the only renderer of a machine without a GPU

// ---- the server: the source tree (docs/battle-theatre as the root, tools/serve.mjs) or, with BT_DIST, a packed dist. The port asked for is used when it is free; when another run holds it
// (many jobs share this machine) the system picks a free one. Nothing in the page depends on the port.
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.md': 'text/markdown; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.webp': 'image/webp', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
function serveDir(root, port) {
  const srv = http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404, { 'content-type': 'text/plain' }); return s.end('not found'); }
    const b = fs.readFileSync(f); s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'content-length': b.length, 'cache-control': 'no-store' }); s.end(b);
  });
  return new Promise(res => srv.listen(port, '127.0.0.1', () => res(srv)));
}
const portFree = port => new Promise(res => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, '127.0.0.1', () => s.close(() => res(true))); });
export const DIST = process.env.BT_DIST ? path.resolve(process.env.BT_DIST) : null;
let PROBE_URL = 'about:blank';                                      // the capability probe needs a secure context for navigator.gpu: a small file of the last server started (127.0.0.1 is one)
export async function startServer(port = 10771) {
  const p = (await portFree(port)) ? port : 0, srv = DIST ? await serveDir(DIST, p) : await serve(p), real = srv.address().port; PROBE_URL = `http://127.0.0.1:${real}/app/styles.css`;
  return { srv, port: real, dist: DIST, base: `http://127.0.0.1:${real}/app/index.html`, close: () => new Promise(r => { srv.closeAllConnections?.(); srv.close(r); }) };
}

// ---- the browser. RENDER says what it draws with; it is read from the browser itself (the WebGL renderer string), never assumed.
export const RENDER = { renderer: null, software: false, webgpu: null, args: null };
async function probe(b) {
  const ctx = await b.newContext(), p = await ctx.newPage(); try {
    await p.goto(PROBE_URL).catch(() => { });
    return await p.evaluate(async () => { const o = { webgl2: null, webgpu: null }; const gl = document.createElement('canvas').getContext('webgl2'); if (gl) { const e = gl.getExtension('WEBGL_debug_renderer_info'); o.webgl2 = String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
      if ('gpu' in navigator) { try { const a = await navigator.gpu.requestAdapter(); if (a) o.webgpu = [a.info?.vendor, a.info?.architecture, a.info?.description].filter(Boolean).join(' ') || 'adapter'; } catch { /* no adapter */ } } return o; });
  } finally { await ctx.close(); }
}
export async function launch(extra = []) {
  const mode = process.env.BT_GL || 'auto', go = sw => chromium.launch({ channel: 'chrome', headless: true, args: [...GPU_ARGS, ...(sw ? SW_ARGS : []), ...extra] });
  let sw = mode === 'software', b = await go(sw), r = await probe(b);
  if (!r.webgl2 && mode === 'auto' && !sw) { await b.close(); sw = true; b = await go(true); r = await probe(b); }
  RENDER.renderer = r.webgl2; RENDER.webgpu = r.webgpu; RENDER.args = sw ? 'software GL flags' : 'hardware flags'; RENDER.software = !r.webgl2 || /swiftshader|llvmpipe|softpipe|software/i.test(r.webgl2);
  if (RENDER.software && !SLOW.frameMs) { SLOW.k = +process.env.BT_WAIT_K || SLOW.startK; SLOW.from = process.env.BT_WAIT_K ? 'BT_WAIT_K' : 'start value of a software renderer, until the first frame is measured'; }
  if (!launch.said) { launch.said = true; console.log(`# renderer: ${RENDER.renderer || 'no WebGL2 context'} (${RENDER.software ? 'SOFTWARE' : 'hardware'}; ${RENDER.args}); WebGPU adapter: ${RENDER.webgpu || 'none'}${DIST ? '; serving the packed dist ' + DIST : ''}`); }
  return b;
}

// ---- THE ONE KNOB for a machine that cannot draw in real time -------------------------------------------------------------------------------------------------------------------
// The specs were written on a real GPU, where a frame takes 16.7 ms. The page's clock advances by the real frame time but never by more than 100 ms a frame (theatre.mjs loop:
// dt = min(0.1, dtMs / 1000)). When a frame takes longer than that (software GL: seconds a frame with the full crowd), everything the page does IN TIME (camera flights, a held key,
// playback, the easing of the rate, a debounced search box behind a busy main thread) runs slower than the wall clock by   K = measured frame time / 100 ms.
//   SLOW.k            the wait scale. 1 on any machine that draws a frame in under 100 ms: there every helper below is exactly the plain Playwright call the specs always made.
//   wait(page, ms)    a pause that gives the PAGE ms of its own clock (replaces page.waitForTimeout in the specs): on a slow renderer it lets frames run until the page clock has advanced ms.
//   T(ms)             a time limit of a waitFor... call, multiplied by K. A limit is the moment a test gives up, never something a test asserts.
// K is measured, not configured: enter() / ready() time two frames of the running theatre and wait() re-measures on every call, so the scale follows the machine while other jobs load it.
// Before the first frame of a run exists, a software renderer starts at SLOW.startK = 25 (2.5 s a frame, the uncontended figure of the 4-vCPU container). BT_WAIT_K=<n> fixes K by hand.
// What the knob NEVER touches: what a test asserts, and every performance threshold (frame time, long tasks, input delay, added GPU or CPU time). Those are not scaled; on a software
// renderer they are NOT RUN and say so (t.gpuOnly below).
export const SLOW = { k: 1, frameMs: null, stepMs: 100, startK: 25, from: 'a frame under 100 ms: no scaling' };
const setK = ms => { SLOW.frameMs = ms; if (!process.env.BT_WAIT_K) { SLOW.k = Math.max(1, ms / SLOW.stepMs); SLOW.from = `measured frame time ${Math.round(ms)} ms`; } };
export const T = ms => Math.round(ms * SLOW.k);
const actionLimit = () => Math.min(T(30000), 300000);                 // Playwright's own 30 s limit for a click or a fill, scaled; five minutes at most (a click needs two or three frames)
export async function measure(page) {                                // two whole frames of the running theatre
  const ms = await page.evaluate(async () => { const a = window.btApp; await a.frames(1); const t0 = performance.now(); await a.frames(2); return (performance.now() - t0) / 2; });
  setK(ms); page.context().setDefaultTimeout(actionLimit()); return ms;
}
export async function wait(page, ms) {
  if (SLOW.k <= 1) return page.waitForTimeout(ms);
  const r = await page.evaluate(async ([ms, step]) => { const a = window.btApp; if (!a || !a.ready) return null; let acc = 0, n = 0; const t0 = performance.now(); while (acc < ms) { const t = performance.now(); await a.frames(1); acc += Math.min(step, performance.now() - t); n++; } return { n, wall: performance.now() - t0 }; }, [ms, SLOW.stepMs]).catch(() => null);
  if (r && r.n >= 2) { setK(r.wall / r.n); page.context().setDefaultTimeout(actionLimit()); } else if (!r) await page.waitForTimeout(ms * SLOW.k);       // no theatre on the page (the landing page): the last measured scale
}

// ---- NOT RUN on a software renderer: what only a real GPU can answer ---------------------------------------------------------------------------------------------------------------
// `test` is node:test's test with one addition: t.gpuOnly(label, fn). On a hardware renderer fn runs (the assertion is evaluated, unchanged). On a software renderer fn is not run, the
// label is printed, and when everything else in the test has passed the test is reported as SKIPPED with every label it did not run: never as passed. A test that fails anywhere else is
// reported as failed (the skip mark is only set at the very end, so it cannot hide a failure). Use it for: frame-time, long-task and input-delay thresholds, and any assertion on a picture
// of the WebGPU canvas (a headless capture of it is blank on SwiftShader). t.notRun(reason) marks a whole test as not run here (for a test that only measures the GPU).
export const OWED = [];
export function test(name, fn) {
  return nodeTest(name, async t => {
    const owed = []; let whole = null;
    t.gpuOnly = async (label, f) => { if (!RENDER.software) return f(); owed.push(label); OWED.push({ test: name, label }); console.log(`# NOT RUN (NEEDS_GPU): ${label}`); };
    t.notRun = reason => { whole = reason; OWED.push({ test: name, label: reason, whole: true }); console.log(`# NOT RUN (NEEDS_GPU), whole test: ${reason}`); };
    await fn(t);
    if (whole) t.skip('NEEDS_GPU, NOT RUN on a software renderer: ' + whole);
    else if (owed.length) t.skip(`NEEDS_GPU, ${owed.length} assertion(s) NOT RUN on a software renderer (everything else in this test ran and passed): ${owed.join(' | ')}`);
  });
}
test.before = nodeTest.before; test.after = nodeTest.after;
// where a spec writes its numbers and pictures: the tests folder itself on a hardware renderer (the committed evidence of a real-GPU run); tests/results/<BT_OUT or sw-latest>/ on a software
// renderer or when BT_OUT is set, so that a software run can never overwrite real-GPU evidence. Call it when writing (after launch), not when the module loads.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export function outFile(name) { const sub = process.env.BT_OUT || (RENDER.software ? 'sw-latest' : null), f = sub ? path.join(HERE, 'results', sub, name) : path.join(HERE, name); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; }
// the renderer the address asks for: BT_API when set, else the shell's default (WebGL2, delegated decision DD-27). null = 'auto' (either is right).
export const expectedApi = () => { const v = process.env.BT_API; return v === 'webgpu' ? 'webgpu' : v === 'auto' ? null : 'webgl2'; };
// messages of the software GL driver about itself (a screenshot reads the canvas back; SwiftShader says so). They are not messages of the page.
export const DRIVER_NOISE = /GPU stall due to ReadPixels|GL_CLOSE_PATH_NV|Automatic fallback to software WebGL|powerPreference option is currently ignored/;

// instrumentation injected before any page script: counts what a visit could leak
export const INSTRUMENT = () => {
  const S = window.__inst = { gl: new Set(), gpuDevices: [], timers: new Map(), rafs: new Map(), listeners: new Map(), workers: new Set(), audio: new Set(), ports: new Set(), observers: new Set(), nTimers: 0 };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { const c = gc.call(this, type, ...a); if (c && (type === 'webgl2' || type === 'webgl' || type === 'webgpu')) S.gl.add({ type, canvas: new WeakRef(this), ctx: new WeakRef(c) }); return c; };   // WeakRefs: the instrumentation must not keep the page alive
  if (navigator.gpu) {
    const ra = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (...a) { const d = await ra.apply(this, a); const rec = { lost: false }; d.lost.then(() => { rec.lost = true; }); S.gpuDevices.push(rec); return d; };
  }
  const st = window.setTimeout, ct = window.clearTimeout, si = window.setInterval, ci = window.clearInterval;
  window.setTimeout = function (f, ms, ...a) { const id = st.call(window, function () { S.timers.delete(id); return typeof f === 'function' ? f.apply(this, arguments) : undefined; }, ms, ...a); S.timers.set(id, 'timeout'); return id; };
  window.clearTimeout = function (id) { S.timers.delete(id); return ct.call(window, id); };
  window.setInterval = function (f, ms, ...a) { const id = si.call(window, f, ms, ...a); S.timers.set(id, 'interval'); return id; };
  window.clearInterval = function (id) { S.timers.delete(id); return ci.call(window, id); };
  const raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
  window.requestAnimationFrame = function (f) { const id = raf.call(window, function (t) { S.rafs.delete(id); return f(t); }); S.rafs.set(id, 1); return id; };
  window.cancelAnimationFrame = function (id) { S.rafs.delete(id); return caf.call(window, id); };
  const key = (t, type, fn, o) => { const cap = typeof o === 'boolean' ? o : !!(o && o.capture); if (!t.__id) Object.defineProperty(t, '__id', { value: ++S.nTimers + 100000 }); return `${t.__id}|${type}|${cap}|${fn && (fn.__fid || (Object.defineProperty(fn, '__fid', { value: ++S.nTimers }), fn.__fid))}`; };
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) { if (fn && !(o && o.signal && o.signal.aborted)) { const k = key(this, type, fn, o); S.listeners.set(k, { once: !!(o && o.once), cap: typeof o === 'boolean' ? o : !!(o && o.capture), type, target: this === window ? 'window' : this === document ? 'document' : (this instanceof Node ? this.nodeName : 'other') }); if (o && o.signal) add.call(o.signal, 'abort', () => S.listeners.delete(k), { once: true }); } return add.call(this, type, fn, o); };
  EventTarget.prototype.removeEventListener = function (type, fn, o) { if (fn) S.listeners.delete(key(this, type, fn, o)); return rem.call(this, type, fn, o); };
  const W = window.Worker; if (W) window.Worker = class extends W { constructor(...a) { super(...a); S.workers.add(this); } terminate() { S.workers.delete(this); return super.terminate(); } };
  const A = window.AudioContext; if (A) window.AudioContext = class extends A { constructor(...a) { super(...a); S.audio.add(this); } close() { S.audio.delete(this); return super.close(); } };
  const MC = window.MessageChannel; window.MessageChannel = class extends MC { constructor() { super(); S.ports.add(this); const c1 = this.port1.close.bind(this.port1); this.port1.close = () => { S.ports.delete(this); return c1(); }; } };
  window.__instListeners = () => [...S.listeners.values()].map(v => v.target + ':' + v.type + (v.cap ? ':capture' : '') + (v.once ? ':once' : ''));
  // listeners: not the browser's device objects, not the test driver's own input tracker
  window.__instSnapshot = () => ({
    gl: [...S.gl].filter(r => { try { const cv = r.canvas.deref(), cx = r.ctx.deref(); if (!cv || !cx) return false; return r.type === 'webgpu' ? cv.isConnected : (cv.isConnected && !cx.isContextLost()); } catch { return false; } }).length,
    glEver: S.gl.size, gpuLive: S.gpuDevices.filter(r => !r.lost).length, gpuEver: S.gpuDevices.length, timers: S.timers.size, rafs: S.rafs.size, listeners: [...S.listeners.values()].filter(v => v.target !== 'other' && !(v.target === 'window' && (v.cap || v.type.startsWith('__playwright')))).length, workers: S.workers.size, audio: S.audio.size, ports: S.ports.size,
  });
};
export function watchConsole(page) {
  const log = { errors: [], warnings: [], failed: [], pageerrors: [] };
  page.on('console', m => { const t = m.type(), x = m.text(); if (t === 'error') log.errors.push(x.slice(0, 300)); else if (t === 'warning') log.warnings.push(x.slice(0, 300)); });
  page.on('pageerror', e => log.pageerrors.push(String(e.stack || e).slice(0, 600)));
  page.on('requestfailed', r => log.failed.push(r.url() + ' ' + (r.failure()?.errorText || '')));
  page.on('response', r => { if (r.status() >= 400) log.failed.push(r.url() + ' HTTP ' + r.status()); });
  return log;
}
// history: 'stub' opens the placeholder layer (the shell's own tests that need the 165,000-figure crowd); omitted = the real layer
export async function open(browser, base, { w = 1440, h = 900, init = true, touch = false, scale = 1, extra = '', history = null } = {}) {
  const qp = [history ? 'history=' + history : '', process.env.BT_API ? 'api=' + process.env.BT_API : '', process.env.BT_EXTRA || '', extra.replace(/^\?/, '')].filter(Boolean); extra = qp.length ? '?' + qp.join('&') : '';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, hasTouch: touch, isMobile: touch }); ctx.setDefaultTimeout(actionLimit());
  const page = await ctx.newPage(); if (init) await page.addInitScript(INSTRUMENT); const log = watchConsole(page);
  await page.goto(base + extra, { waitUntil: 'load' }); return { ctx, page, log };
}
// the theatre is ready (or says it could not start: then the reason is the error, at once, instead of a time limit); the frame time of this page is measured (three frames, as before)
export async function ready(page, timeout = 90000) {
  await page.waitForFunction(() => (window.btApp && window.btApp.ready) || document.querySelector('#bt-loading .fail'), null, { timeout: T(timeout) });
  const fail = await page.evaluate(() => (window.btApp && window.btApp.ready) ? null : (document.querySelector('#bt-loading .fail')?.textContent || 'no reason given')); if (fail) throw new Error('the theatre could not start: ' + fail);
  return measure(page);
}
export async function enter(page, timeout = 90000) { await page.click('[data-bt-enter]'); return ready(page, timeout); }
export async function leave(page) { await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])', { timeout: T(15000) }); await page.waitForFunction(() => !window.btApp, null, { timeout: T(5000) }); }
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
