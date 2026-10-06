// 07-verify/lib.mjs - shared by the independent verification drivers of docs/pitch/anim/prototype/battle-studio.html (written by the verifier, shares no code with the prototype's own tests).
//   * a read-only static server on this verifier's own port range (9700..9709)
//   * playwright-core + the system Chrome with a profile under tmp/pitch-anim/verify/
//   * an in-page "witness": a canvas-2D recorder installed BEFORE the page's own scripts run.  It records what the page really PAINTS (transform, alpha, ink bounding box of every paint call), so
//     overlap is judged on painted ink and not on the rectangles the engine says it will draw.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..', '..');
export const PROTO = path.join(REPO, 'docs', 'pitch', 'anim', 'prototype');
export const WORK = path.join(REPO, 'tmp', 'pitch-anim', 'verify');
export const RESULTS = path.join(HERE, 'results');
export const SHOTS = path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'verify');
export const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(RESULTS, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(WORK, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
/** serve a directory read-only on 127.0.0.1:port (no directory listing, no writes) */
export function serve(root, port) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent((req.url || '/').split('?')[0]); const p = path.join(root, u === '/' ? 'battle-studio.html' : u);
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

/** the in-page witness: wraps CanvasRenderingContext2D so that every paint call is recorded as (epoch, ink box in device pixels, alpha, kind).  An EPOCH starts at every setTransform call and
 *  is identified by its origin (e, f) and scale; the renderer draws one tile / label / pin per epoch.  Nothing here reads the engine.  Enabled per canvas by id 'map'. */
export const WITNESS_SRC = `(() => {
  if (window.__witness) return;
  const P = CanvasRenderingContext2D.prototype; const orig = {}; const W = window.__witness = { on: false, frames: [], cur: null, texts: [], opsTotal: 0, canvasId: 'map', sampleBg: false, bgSamples: [], full: false };
  const names = ['save','restore','setTransform','resetTransform','translate','scale','rotate','transform','beginPath','closePath','moveTo','lineTo','arc','arcTo','ellipse','rect','roundRect','quadraticCurveTo','bezierCurveTo','fill','stroke','clip','fillRect','strokeRect','clearRect','fillText','strokeText','drawImage'];
  for (const n of names) orig[n] = P[n];
  const state = new WeakMap();
  const S = (ctx) => { let s = state.get(ctx); if (!s) { s = { m: [1,0,0,1,0,0], stack: [], path: [], clip: null, epoch: 0, alpha: 1 }; state.set(ctx, s); } return s; };
  const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  const pt = (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
  const mine = (ctx) => ctx.canvas && ctx.canvas.id === W.canvasId;
  function ink(ctx, s, pts, pad, kind, extra) {
    if (!W.on || !W.cur) return; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { const p = pt(s.m, x, y); if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const sc = Math.sqrt(Math.abs(s.m[0]*s.m[3] - s.m[1]*s.m[2])); const pd = pad * sc; x0 -= pd; y0 -= pd; x1 += pd; y1 += pd;
    if (s.clip) { x0 = Math.max(x0, s.clip[0]); y0 = Math.max(y0, s.clip[1]); x1 = Math.min(x1, s.clip[2]); y1 = Math.min(y1, s.clip[3]); if (x0 >= x1 || y0 >= y1) return; }
    const a = ctx.globalAlpha; if (a <= 0) return;
    const ep = s.epoch; const B = W.cur.box; let b = B[ep];
    if (!b) B[ep] = [x0, y0, x1, y1, a, 1]; else { if (x0 < b[0]) b[0] = x0; if (y0 < b[1]) b[1] = y0; if (x1 > b[2]) b[2] = x1; if (y1 > b[3]) b[3] = y1; if (a > b[4]) b[4] = a; b[5]++; }
    W.opsTotal++;
    if (W.full) { const rec = [ep, x0, y0, x1, y1, a, kind]; W.cur.ops.push(rec); if (extra) extra(rec); }
  }
  const wrap = (n, f) => { P[n] = function (...a) { if (!mine(this)) return orig[n].apply(this, a); const s = S(this); f.call(this, s, a); return orig[n].apply(this, a); }; Object.defineProperty(P[n], 'name', { value: n }); };
  wrap('save', function (s) { s.stack.push([s.m.slice(), s.clip && s.clip.slice(), s.epoch]); });
  wrap('restore', function (s) { const q = s.stack.pop(); if (q) { s.m = q[0]; s.clip = q[1]; s.epoch = q[2]; } });
  wrap('setTransform', function (s, a) { let m; if (a.length === 1 && typeof a[0] === 'object') { const o = a[0]; m = [o.a, o.b, o.c, o.d, o.e, o.f]; } else m = a.slice(0, 6); s.m = m; if (W.on && W.cur) { s.epoch = W.cur.epochs.length; W.cur.epochs.push([m[0], m[1], m[2], m[3], m[4], m[5]]); } });
  wrap('resetTransform', function (s) { s.m = [1,0,0,1,0,0]; if (W.on && W.cur) { s.epoch = W.cur.epochs.length; W.cur.epochs.push([1,0,0,1,0,0]); } });
  wrap('translate', function (s, a) { s.m = mul(s.m, [1,0,0,1,a[0],a[1]]); });
  wrap('scale', function (s, a) { s.m = mul(s.m, [a[0],0,0,a[1],0,0]); });
  wrap('rotate', function (s, a) { const c = Math.cos(a[0]), n = Math.sin(a[0]); s.m = mul(s.m, [c, n, -n, c, 0, 0]); });
  wrap('transform', function (s, a) { s.m = mul(s.m, a.slice(0, 6)); });
  wrap('beginPath', function (s) { s.path = []; });
  wrap('moveTo', function (s, a) { s.path.push([a[0], a[1]]); }); wrap('lineTo', function (s, a) { s.path.push([a[0], a[1]]); });
  wrap('arc', function (s, a) { s.path.push([a[0]-a[2], a[1]-a[2]], [a[0]+a[2], a[1]+a[2]]); });
  wrap('ellipse', function (s, a) { const r = Math.max(a[2], a[3]); s.path.push([a[0]-r, a[1]-r], [a[0]+r, a[1]+r]); });
  wrap('arcTo', function (s, a) { s.path.push([a[0], a[1]], [a[2], a[3]]); });
  wrap('rect', function (s, a) { s.path.push([a[0], a[1]], [a[0]+a[2], a[1]+a[3]]); });
  wrap('roundRect', function (s, a) { s.path.push([a[0], a[1]], [a[0]+a[2], a[1]+a[3]]); });
  wrap('quadraticCurveTo', function (s, a) { s.path.push([a[0], a[1]], [a[2], a[3]]); });
  wrap('bezierCurveTo', function (s, a) { s.path.push([a[0], a[1]], [a[2], a[3]], [a[4], a[5]]); });
  wrap('fill', function (s) { ink(this, s, s.path, 0, 'fill', (r) => r.push(typeof this.fillStyle === 'string' ? this.fillStyle : '?')); });
  wrap('stroke', function (s) { ink(this, s, s.path, this.lineWidth / 2, 'stroke', (r) => r.push(typeof this.strokeStyle === 'string' ? this.strokeStyle : '?', this.lineWidth)); });
  wrap('clip', function (s) { if (!s.path.length) return; const ps = s.path.map(([x, y]) => pt(s.m, x, y)); const b = [Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1]))]; s.clip = s.clip ? [Math.max(b[0], s.clip[0]), Math.max(b[1], s.clip[1]), Math.min(b[2], s.clip[2]), Math.min(b[3], s.clip[3])] : b; });
  wrap('fillRect', function (s, a) { ink(this, s, [[a[0], a[1]], [a[0]+a[2], a[1]+a[3]]], 0, 'fillRect', (r) => r.push(typeof this.fillStyle === 'string' ? this.fillStyle : '?')); });
  wrap('strokeRect', function (s, a) { ink(this, s, [[a[0], a[1]], [a[0]+a[2], a[1]+a[3]]], this.lineWidth / 2, 'strokeRect', (r) => r.push(typeof this.strokeStyle === 'string' ? this.strokeStyle : '?', this.lineWidth)); });
  wrap('drawImage', function (s, a) { let x, y, w, h; if (a.length >= 9) { [x, y, w, h] = [a[5], a[6], a[7], a[8]]; } else if (a.length >= 5) { [x, y, w, h] = [a[1], a[2], a[3], a[4]]; } else { x = a[1]; y = a[2]; w = a[0].width; h = a[0].height; } ink(this, s, [[x, y], [x+w, y+h]], 0, 'image'); });
  const textBox = function (ctx, t, x, y, mw) { const m = orig.fillText && ctx.measureText(String(t)); const w = m.width; const asc = m.actualBoundingBoxAscent ?? 8, desc = m.actualBoundingBoxDescent ?? 2; const al = ctx.textAlign; let l = m.actualBoundingBoxLeft ?? 0, r = m.actualBoundingBoxRight ?? w; if (mw != null && w > mw && w > 0) { const k = mw / w; l *= k; r *= k; } return [[x - l, y - asc], [x + r, y + desc]]; };
  const txt = function (kind) { return function (s, a) { if (!W.on || !W.cur) return; const b = textBox(this, a[0], a[1], a[2], a[3]); const fs = this.fillStyle; if (W.sampleBg && kind === 'text') { try { const ps = b.map(([x, y]) => pt(s.m, x, y)); const x0 = Math.max(0, Math.floor(Math.min(ps[0][0], ps[1][0]))); const y0 = Math.max(0, Math.floor(Math.min(ps[0][1], ps[1][1]))); const w = Math.max(1, Math.min(this.canvas.width - x0, Math.ceil(Math.abs(ps[1][0] - ps[0][0])))); const h = Math.max(1, Math.min(this.canvas.height - y0, Math.ceil(Math.abs(ps[1][1] - ps[0][1])))); if (w > 0 && h > 0 && x0 < this.canvas.width && y0 < this.canvas.height) { const d = CanvasRenderingContext2D.prototype.getImageData.call(this, x0, y0, w, h).data; if (d) { const hist = new Map(); for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; hist.set(k, (hist.get(k) || 0) + 1); } let bk = 0, bn = -1; for (const [k, n] of hist) if (n > bn) { bn = n; bk = k; } W.bgSamples.push({ text: String(a[0]), fill: typeof fs === 'string' ? fs : '?', alpha: this.globalAlpha, bg: [(bk >> 16) & 255, (bk >> 8) & 255, bk & 255], font: this.font, ep: s.epoch, box: [ps[0][0], ps[0][1], ps[1][0], ps[1][1]], share: +(bn / (d.length / 4)).toFixed(2) }); } } } catch (e) { /* sampling is best effort */ } } if (!W.full) { ink(this, s, b, kind === 'strokeText' ? this.lineWidth / 2 : 0, kind); return; } ink(this, s, b, kind === 'strokeText' ? this.lineWidth / 2 : 0, kind, (rec) => { rec.push(String(a[0]), typeof fs === 'string' ? fs : '?', this.font); }); }; };
  wrap('fillText', txt('text')); wrap('strokeText', txt('strokeText'));
  wrap('clearRect', function (s, a) { /* a clearRect of the whole canvas starts a frame body */ });
  // frame boundaries are set by the driver: W.begin(meta) / W.end()
  W.begin = (meta) => { W.cur = { meta: meta || null, ops: [], epochs: [], box: [] }; W.on = true; };
  W.end = () => { W.on = false; const c = W.cur; W.cur = null; return c; };
  W.mapCtx = null;
})();`;

/** open the page.  opts: { w, h, dpr, port, query, cpu, mobile, root, file, reducedMotion, witness, init } ; returns { page, ctx, cdp, errors, requests, close } */
export async function launch({ w = 1440, h = 900, dpr = 1, port = 9700, query = '', cpu = 1, mobile = false, file = 'battle-studio.html', reducedMotion = 'no-preference', witness = false, profile = 'p0', fresh = true, colorScheme = 'light', init = null } = {}) {
  const dir = path.join(WORK, 'chrome-profile', `${profile}-${port}`); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, {
    executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, reducedMotion, colorScheme,
    args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--no-default-browser-check'],
  });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const requests = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith(`http://127.0.0.1:${port}/`)) requests.push(u); else if (u.startsWith(`http://127.0.0.1:${port}/`) && !u.split('?')[0].endsWith('/') && !u.split('?')[0].endsWith(file)) requests.push(u); });
  const cdp = await ctx.newCDPSession(page); if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (witness) await page.addInitScript(WITNESS_SRC);
  await page.addInitScript(fs.readFileSync(path.join(HERE, 'recorder.js'), 'utf8'));
  if (init) await page.addInitScript(init);
  const url = `http://127.0.0.1:${port}/${file}` + (fresh ? '?fresh=1' : '?') + (query ? '&' + query : '');
  await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 30000 });
  return { ctx, page, cdp, errors, requests, url, close: () => ctx.close() };
}
export const writeJson = (name, obj) => { const p = path.join(RESULTS, name); fs.writeFileSync(p, JSON.stringify(obj, null, 1)); return p; };
