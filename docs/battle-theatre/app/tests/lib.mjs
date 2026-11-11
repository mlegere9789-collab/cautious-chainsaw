// Shared test helpers: static server, system Chrome with WebGPU on the high-performance GPU, console capture, tiny PNG luma tools.
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
export const GPU_ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--force_high_performance_gpu'];
export async function startServer(port = 10771) { const srv = await serve(port); return { srv, base: `http://127.0.0.1:${port}/app/index.html`, close: () => new Promise(r => srv.close(r)) }; }
export async function launch(extra = []) { return chromium.launch({ channel: 'chrome', headless: true, args: [...GPU_ARGS, ...extra] }); }
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
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage(); if (init) await page.addInitScript(INSTRUMENT); const log = watchConsole(page);
  await page.goto(base + extra, { waitUntil: 'load' }); return { ctx, page, log };
}
export async function enter(page, timeout = 90000) {
  await page.click('[data-bt-enter]'); await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout });
  await page.evaluate(() => window.btApp.frames(3));
}
export async function leave(page) { await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])', { timeout: 15000 }); await page.waitForFunction(() => !window.btApp, null, { timeout: 5000 }); }
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
