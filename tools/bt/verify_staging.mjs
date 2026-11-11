// Real-run check of a packed Battle Theatre staging build. Not a trace: a browser (software WebGL2, one at a time) opens the page, enters the theatre with the figures on, starts the sound
// (programmatic, as a click would), runs the scene for some frames at a minute with firing, flies the camera close to a unit, opens the Sources drawer, and the request log is compared:
//   1. the packed dist is served and every request must answer 2xx (zero 404s);
//   2. the same run is made against the source tree (docs/battle-theatre) and every URL it loaded must exist in the dist (nothing the features load dynamically is missing).
//   node tools/bt/verify_staging.mjs --dist deliver/bt-staging/dist [--json report.json] [--frames 40]
// Run it under `nice -n 10`. Exit 0 only when both checks pass.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../node_modules/playwright-core/index.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../..'), BT = path.join(REPO, 'docs/battle-theatre');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary' };
function serveDir(root, port) {
  return new Promise(res => { const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u.endsWith('/') ? u + 'index.html' : u);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404, { 'content-type': 'text/plain' }); return s.end('not found'); }
    const b = fs.readFileSync(f); s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'content-length': b.length, 'cache-control': 'no-store' }); s.end(b);
  }); srv.listen(port, '127.0.0.1', () => res(srv)); });
}
export async function runScenario(root, port, { frames = 20, timeout = 600000 } = {}) {
  const srv = await serveDir(root, port), base = `http://127.0.0.1:${port}`, log = new Map(), errors = [];
  const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await br.newContext({ viewport: { width: 640, height: 360 } }), page = await ctx.newPage();
    page.on('response', r => { const u = new URL(r.url()); if (u.origin === base) log.set(u.pathname, r.status()); });
    page.on('requestfailed', r => { const u = new URL(r.url()); if (u.origin === base) log.set(u.pathname, 0); });
    page.on('pageerror', e => errors.push('pageerror: ' + String(e.message || e).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
    await page.goto(base + '/app/index.html', { waitUntil: 'load' });
    await page.click('[data-bt-enter]'); await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout });
    const info = await page.evaluate(async n => {
      const a = window.btApp, th = a.theatre, out = { api: a.api, crowd: !!th.host.crowd, fx: !!th.fxOn };
      out.sound = th.audio ? await th.audio.start() : null;                                   // programmatic start (a click does the same call)
      a.setTime(Date.UTC ? 0 : 0); const { minOf } = await import(new URL('./src/clock.mjs', document.baseURI).href);
      a.setTime(minOf(7, 3, 13, 30)); await a.frames(n);
      const L = th.layer, w = th.world, f = w.unitF; let ui = -1; for (let i = 0; i < L.units.length; i++) if (a.stage.present[i] && w.units[i].count > 20) { ui = i; break; }
      if (ui >= 0) { const v = th.viewFor(f[ui * 12], f[ui * 12 + 1], { dist: 30, height: 5, yaw: f[ui * 12 + 2] }); th.cam.set(v.x, v.y, v.z, v.yaw, v.pitch, 55); }
      await a.frames(n); a.setPlaying(true); a.setSpeed(2); await a.frames(n); a.setPlaying(false);
      a.setTime(minOf(7, 4, 15, 0)); await a.frames(n);                                       // rain day
      out.soundStarted = th.audio ? th.audio.started : null; out.units = ui; return out;
    }, frames);
    await page.evaluate(() => document.querySelector('[data-panel=scenario]').click()); await page.evaluate(() => window.btApp.frames(3));
    return { info, log: Object.fromEntries([...log].sort()), errors };
  } finally { await br.close(); srv.close(); }
}
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const dist = path.resolve(opt('--dist') || path.join(REPO, 'deliver/bt-staging/dist')), frames = +opt('--frames') || 20;
  const distFiles = new Set(walk(dist).map(f => '/' + path.relative(dist, f).split(path.sep).join('/')));
  console.log('run 1/2: the packed dist'); const A = await runScenario(dist, 10811, { frames });
  console.log('run 2/2: the source tree'); const B = await runScenario(BT, 10812, { frames });
  const bad = Object.entries(A.log).filter(([, s]) => s < 200 || s >= 400), missing = Object.keys(B.log).filter(u => B.log[u] >= 200 && B.log[u] < 400 && !distFiles.has(u));
  const rep = { dist, distFiles: distFiles.size, distRun: { requests: Object.keys(A.log).length, nonOk: bad, info: A.info, errors: A.errors }, sourceRun: { requests: Object.keys(B.log).length, nonOk: Object.entries(B.log).filter(([, s]) => s >= 400 || s === 0), info: B.info, errors: B.errors }, loadedButNotInDist: missing, requestedDataFiles: Object.keys(A.log).filter(u => /\/data\/(audio3d|anim3d|fx3d|figures3d)\//.test(u) || /conflict-defaults/.test(u)), distFilesNotRequested: [...distFiles].filter(f => !(f in A.log) && !/^\/(index\.html|_headers|netlify\.toml|MANIFEST\.json)$/.test(f)).length };
  if (opt('--json')) fs.writeFileSync(path.resolve(opt('--json')), JSON.stringify(rep, null, 1));
  console.log(JSON.stringify({ ...rep, distRun: { ...rep.distRun, errors: rep.distRun.errors.slice(0, 5) }, sourceRun: { ...rep.sourceRun, errors: rep.sourceRun.errors.slice(0, 5) } }, null, 1));
  const ok = !bad.length && !missing.length && A.info.sound === true; console.log(ok ? 'STAGING VERIFIED: zero 404s, every URL the source run loaded is in the dist, sound started' : 'STAGING CHECK FAILED'); process.exit(ok ? 0 : 1);
}
