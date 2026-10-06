// Golden-image regression test of the engine's renderer on a FIXTURE (a fake map with a fixed camera, the real placement data, a fake clock): no Mapbox, no tiles, no network.
//   node docs/pitch/anim/05-proto/test/golden.mjs                 compare against golden/<skin>@<version>/<fixture>.png (writes missing ones: the first run creates them)
//   node docs/pitch/anim/05-proto/test/golden.mjs --update        rewrite all goldens (after a deliberate skin change: bump the skin's version first)
//   node docs/pitch/anim/05-proto/test/golden.mjs --mutate        proves the test can fail: render with one parameter changed and require a reported difference
//   node docs/pitch/anim/05-proto/test/golden.mjs --diff a.png b.png   compare two screenshots (used for the Canvas2D vs WebGL parity of the benchmark)
// The pixel comparison runs in the page (createImageBitmap + getImageData), so the test needs no image library.  A pixel differs when any channel differs by more than 8/255.
process.env.T0_AGENT = 'pitch-anim/arch';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9580';
const lib = await import('../../../../../tests/t0/lib.mjs');
const { openSession, PORT_BASE } = lib;
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadByTick } from '../../../../../tmp/pitch-anim/arch/data-load.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLD = path.join(HERE, '..', 'golden');
const argv = process.argv.slice(2), UPDATE = argv.includes('--update'), MUTATE = argv.includes('--mutate'), DIFF = argv.includes('--diff');
const THRESH = { maxDiffShare: 0.002 };
const FIXTURES = [
  { name: 'peak-z13.5', tick: 620, lng: -77.2373, lat: 39.812, zoom: 13.5 },
  { name: 'wheatfield-z14.5', tick: 380, lng: -77.2420, lat: 39.7950, zoom: 14.5 },
  { name: 'cemetery-ridge-z15.5', tick: 600, lng: -77.2330, lat: 39.8130, zoom: 15.5 },
];
const SKINS = ['classic', 'rich', 'minimal'];
const { byTick } = loadByTick();
const dev = fs.readFileSync(path.join(HERE, '..', 'dist', 'engine.dev.js'), 'utf8');
const minimal = fs.readFileSync(path.join(HERE, '..', 'skins', 'skin-minimal.js'), 'utf8');
const PAGE = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#2b3a2b"><div id=c style="position:relative;width:1440px;height:852px"><canvas id=cv style="position:absolute;left:0;top:0"></canvas></div>
<script src=/engine.js></script><script>window.G=GTANIM;</script><script src=/skin-minimal.js></script><script src=/page.js></script>`;
const PAGEJS = `
window.__gtanimNow = () => (window.__tt = (window.__tt || 1000) + 8); window.__gtanimStrict = true;   // a fake clock that advances 8 ms per reading: deterministic, and the layout smoothing converges
window.run = async function (fx, skin, mutate) {
  const pbt = await (await fetch('/pbt.json')).json();
  const cont = document.getElementById('c'), cv = document.getElementById('cv'), W = 1440, H = 852;
  const ws = 512 * Math.pow(2, fx.zoom), mx = (l) => (l + 180) / 360, my = (a) => { const s = Math.sin(a * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
  const map = { getCenter: () => ({ lng: fx.lng, lat: fx.lat }), getZoom: () => fx.zoom, getBearing: () => 0, getPitch: () => 0, getContainer: () => cont, on() {}, triggerRepaint() {},
    project: (ll) => ({ x: (mx(ll[0]) - mx(fx.lng)) * ws + W / 2, y: (my(ll[1]) - my(fx.lat)) * ws + H / 2 }) };
  const state = { oobData: {}, currentTick: fx.tick };
  G.bind({ store: { getState: () => state }, flash: {}, sound: { on: () => false, play() {} }, reduced: () => false, trails: () => false });
  G.T.skin = skin; G.T.layout = 'relax'; G.T.fx.contact = true;
  if (mutate) G.tune('params.skin.' + skin + '.' + mutate.key, mutate.value);
  G.clock.reset(); window.__tt = 1000;
  const ok = G.paused(cv, map, pbt, fx.tick, null, null, {});
  for (let i = 0; i < 60; i++) G.paused(cv, map, pbt, fx.tick, null, null, {});   // 60 fixed steps of the fake clock: the layout slide (tau 110 ms) has converged
  return { ok, png: cv.toDataURL('image/png'), overlaps: G.overlaps(), tiles: G.describe().length };
};
window.diffPng = async function (a, b) {
  const load = async (u) => { const r = await fetch(u); const bm = await createImageBitmap(await r.blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height); };
  const A = await load(a), B = await load(b); if (A.width !== B.width || A.height !== B.height) return { error: 'size ' + A.width + 'x' + A.height + ' vs ' + B.width + 'x' + B.height };
  let n = 0, mx = 0; for (let i = 0; i < A.data.length; i += 4) { const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3])); if (d > mx) mx = d; if (d > 8) n++; }
  return { pixels: A.width * A.height, differing: n, share: n / (A.width * A.height), maxChannelDiff: mx };
};`;
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const send = (t, b) => { r.setHeader('content-type', t); r.setHeader('cache-control', 'no-store'); r.end(b); };
  if (u === '/') return send('text/html', PAGE);
  if (u === '/engine.js') return send('text/javascript', dev);
  if (u === '/skin-minimal.js') return send('text/javascript', minimal);
  if (u === '/page.js') return send('text/javascript', PAGEJS);
  if (u === '/pbt.json') return send('application/json', JSON.stringify(byTick));
  if (u.startsWith('/file/')) { try { return send('image/png', fs.readFileSync(path.resolve(decodeURIComponent(u.slice(6))))); } catch { r.statusCode = 404; return r.end(); } }
  r.statusCode = 404; r.end();
}).listen(PORT_BASE, '127.0.0.1');
const s = await openSession({ profile: 'golden', cdpPort: PORT_BASE + 1, tiles: 'block', viewport: { width: 1440, height: 852, dpr: 1 }, onboarded: false });
const page = s.page; page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://127.0.0.1:${PORT_BASE}/`); await page.waitForFunction(() => typeof window.run === 'function' && typeof G !== 'undefined');
const diff = async (a, b) => { const base = `http://127.0.0.1:${PORT_BASE}/file/`; return page.evaluate(([x, y]) => window.diffPng(x, y), [base + encodeURIComponent(a), base + encodeURIComponent(b)]); };
let exit = 0;
try {
  if (DIFF) { const i = argv.indexOf('--diff'); console.log(JSON.stringify(await diff(argv[i + 1], argv[i + 2]))); }
  else {
    const results = [];
    for (const skin of SKINS) {
      const ver = await page.evaluate((k) => G.mods.skin[k].version, skin);
      for (const fx of FIXTURES) {
        const mutate = MUTATE ? { key: skin === 'classic' ? 'body' : skin === 'rich' ? 'radius' : 'corner', value: skin === 'classic' ? 0.4 : skin === 'rich' ? 9 : 10 } : null;
        const r = await page.evaluate(([f, k, m]) => window.run(f, k, m), [fx, skin, mutate]);
        if (!r.ok) { results.push({ skin, fixture: fx.name, error: 'engine did not draw' }); exit = 1; continue; }
        const dir = path.join(GOLD, `${skin}@${ver}`); fs.mkdirSync(dir, { recursive: true }); const gp = path.join(dir, fx.name + '.png'), cur = path.join(dir, fx.name + '.current.png');
        fs.writeFileSync(cur, Buffer.from(r.png.split(',')[1], 'base64'));
        if (UPDATE || !fs.existsSync(gp)) { fs.copyFileSync(cur, gp); results.push({ skin, version: ver, fixture: fx.name, tiles: r.tiles, overlappingPairs: r.overlaps, golden: 'written' }); }
        else { const d = await diff(gp, cur); const pass = !d.error && d.share <= THRESH.maxDiffShare; results.push({ skin, version: ver, fixture: fx.name, tiles: r.tiles, overlappingPairs: r.overlaps, ...d, pass }); if (MUTATE ? pass : !pass) exit = 1; }
        fs.rmSync(cur, { force: true });
      }
    }
    console.log(JSON.stringify({ mode: MUTATE ? 'mutate (must differ)' : UPDATE ? 'update' : 'compare', threshold: THRESH, results }, null, 1));
  }
} finally { await s.close(); server.close(); }
process.exit(exit);
