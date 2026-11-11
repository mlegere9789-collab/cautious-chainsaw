// Headless pose render: resolves poses.json against the gazetteer + DEM, renders base/full PNGs with SwiftShader (one browser, nice -n 10 is applied by the caller).
// Usage: nice -n 10 node tools/bt/photomatch/run.mjs [poseId ...]     Output: tmp/photomatch/renders/<id>_{base,full}.png and resolved_poses.json (tracked copy in tools/bt/photomatch/).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/playwright-core/index.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..'), BT = path.join(ROOT, 'docs/battle-theatre');
const MAP = [['/prototype/', path.join(BT, 'render/prototype/')], ['/app/', path.join(BT, 'app/')], ['/', HERE + '/']];
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); for (const [pre, dir] of MAP) if (u.startsWith(pre)) { const f = path.join(dir, u.slice(pre.length)); if (!f.startsWith(dir.replace(/\/$/, ''))) break; try { const b = fs.readFileSync(f); r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); return r.end(b); } catch { } } r.writeHead(404); r.end(); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
// DEM + mercator (same maths as render/prototype/src/world.mjs)
const meta = JSON.parse(fs.readFileSync(path.join(BT, 'render/prototype/data/terrain.json'))); const u16 = new Uint16Array(fs.readFileSync(path.join(BT, 'render/prototype/data/height.bin')).buffer.slice(0));
const N = meta.N, sc = (meta.hmax - meta.hmin) / 65535, Z15 = 2 ** 15 * 512; const [bx, by, bw, bh] = meta.z15box, mpp = meta.groundMPerZ15Px;
const H = (i, j) => meta.hmin + u16[j * N + i] * sc;
const wpx = (lng, lat) => { const s = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * Z15, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Z15]; };
const xz = (lng, lat) => { const [px, py] = wpx(lng, lat); return [(px - bx - bw / 2) * mpp, (py - by - bh / 2) * mpp]; };
const lnglat = (x, z) => { const px = x / mpp + bx + bw / 2, py = z / mpp + by + bh / 2; const lng = px / Z15 * 360 - 180, n = Math.PI - 2 * Math.PI * py / Z15; return [lng, 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))]; };
const sampleXZ = (x, z) => { const u = Math.round((x / (meta.widthM) + .5) * (N - 1)), v = Math.round((z / meta.heightM + .5) * (N - 1)); return H(Math.max(0, Math.min(N - 1, u)), Math.max(0, Math.min(N - 1, v))); };
const gz = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(BT, 'app/data/gazetteer.json'))).places.map(p => [p.id, p]));
const P = JSON.parse(fs.readFileSync(path.join(HERE, 'poses.json'))); const want = process.argv.slice(2);
function resolve(p) {
  const d = P.defaults, a = gz[p.position.anchor]; let [x, z] = xz(a.center.lng, a.center.lat); const x0 = x, z0 = z;
  if (p.position.snap === 'summit') { let best = -1e9, R = p.position.snap_r_m; for (let dx = -R; dx <= R; dx += 4) for (let dz = -R; dz <= R; dz += 4) if (dx * dx + dz * dz <= R * R) { const h = sampleXZ(x0 + dx, z0 + dz); if (h > best) { best = h; x = x0 + dx; z = z0 + dz; } } }
  if (p.position.offset_m) { x += p.position.offset_m[0]; z -= p.position.offset_m[1]; }
  const [lng, lat] = lnglat(x, z); let heading = p.heading.fixed_deg ?? 0;
  if (p.heading.toward) { const t = gz[p.heading.toward], [tx, tz] = xz(t.center.lng, t.center.lat); heading = (Math.atan2(tx - x, -(tz - z)) * 180 / Math.PI + 360) % 360; }
  return { id: p.id, photo_key: p.photo_key, loc_id: p.loc_id, lng: +lng.toFixed(6), lat: +lat.toFixed(6), x_m: +x.toFixed(1), z_m: +z.toFixed(1), ground_m: +sampleXZ(x, z).toFixed(1), agl: p.agl_m ?? d.agl_m, headingDeg: +heading.toFixed(1), pitchDeg: p.pitch_deg ?? d.pitch_deg, fovHDeg: p.fov_h_deg ?? d.fov_h_deg, anchor: p.position.anchor, anchor_sigma_m: a.sigma_m, position_tier: p.position.tier, heading_tier: p.heading.tier };
}
const out = path.join(ROOT, 'tmp/photomatch/renders'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message)); page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto(`http://127.0.0.1:${port}/render.html`); await page.waitForFunction(() => window.btReady);
const LED = fs.existsSync(path.join(HERE, 'images_ledger.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'images_ledger.json'))).images : {};
const resolved = [], variants = [{ s: '', d: 0 }, { s: '_fov30', d: -10 }, { s: '_fov50', d: 10 }];
for (const p of P.poses) { if (want.length && !want.includes(p.id)) continue; const r = resolve(p); resolved.push(r);
  const li = LED[p.photo_key], cr = p.photo_crop_1600, sz = cr ? [960, Math.round(960 * (cr[3] - cr[1]) / (cr[2] - cr[0]))] : [960, 640]; r.render_px = sz;
  for (const v of variants) { const t0 = Date.now(); const res = await page.evaluate(([pose, w, h]) => window.btRender(pose, w, h), [{ ...r, fovHDeg: r.fovHDeg + v.d }, sz[0], sz[1]]);
    for (const k of ['base', 'full']) fs.writeFileSync(path.join(out, `${p.id}${v.s}_${k}.png`), Buffer.from(res[k].split(',')[1], 'base64'));
    console.log(p.id, v.s || 'main', 'eye y', res.eye.y.toFixed(1), 'ground', res.groundM.toFixed(1), Date.now() - t0, 'ms'); } }
if (!want.length) fs.writeFileSync(path.join(HERE, 'resolved_poses.json'), JSON.stringify({ _doc: 'Poses resolved from poses.json against gazetteer + DEM by run.mjs. Assumptions, not measured camera positions.', resolved }, null, 1));
await browser.close(); srv.close();
