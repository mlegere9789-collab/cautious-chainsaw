// Headless pose render (Q16): resolves poses.json against the gazetteer, the building footprints, the monument list and the DEM, renders base/full PNGs with SwiftShader
// (one browser; the caller applies the machine lock and nice), projects the named landmarks of each pose into its image, and writes resolved_poses.json.
// Usage: tools/horde/bench.sh node tools/bt/photomatch/run.mjs [poseId ...]     Output: tmp/photomatch/renders/<id>{,_fov30,_fov50}_{base,full}.png, resolved_poses.json
// Pose spec (poses.json, schema 2): position {anchor: GZ-nnn | STR-xxx | MON-nnn | lnglat:[lng,lat], snap:'summit', snap_r_m, offset_m:[east,north], relative:{bearing_deg, distance_m | width_fraction}}
//   heading {toward: <anchor id> | fixed_deg}, fov {h_deg}, pitch_deg, agl_m, photo {file, crop:'auto'|[x0,y0,x1,y1] fractions}, landmarks [anchor ids]. Everything is an assumption or an inference as tiered in the file; none is a measured camera position.
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
const S3 = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/structures3d.json'))); const bld = Object.fromEntries([...S3.buildings, ...S3.points].map(b => [b.id, b]));
const mon = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(BT, 'app/data/site-bookmarks.json'))).monuments.map(m => ['MON-' + m.no, m]));
const P = JSON.parse(fs.readFileSync(path.join(HERE, 'poses.json'))); const want = process.argv.slice(2);
const CR = fs.existsSync(path.join(HERE, 'photo_crops.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'photo_crops.json'))).crops : {};
// anchor id -> {lng, lat, sigma_m, name}; buildings use the mean of the footprint ring (or the symbol point), monuments the list coordinates
function anchorOf(id) {
  if (id.startsWith('GZ-')) { const a = gz[id]; if (!a) throw new Error('unknown gazetteer id ' + id); return { lng: a.center.lng, lat: a.center.lat, sigma_m: a.sigma_m, name: a.name }; }
  if (id.startsWith('STR-')) { const b = bld[id]; if (!b) throw new Error('unknown structure id ' + id); if (b.ring) { const r = b.ring.slice(0, -1); return { lng: r.reduce((s, p) => s + p[0], 0) / r.length, lat: r.reduce((s, p) => s + p[1], 0) / r.length, sigma_m: b.err ?? null, name: b.name, ring: b.ring }; } return { lng: b.pt[0], lat: b.pt[1], sigma_m: b.err ?? null, name: b.name }; }
  if (id.startsWith('MON-')) { const m = mon[id]; if (!m) throw new Error('unknown monument ' + id); return { lng: m.lng, lat: m.lat, sigma_m: null, name: m.name }; }
  throw new Error('unknown anchor ' + id);
}
const bearingTo = (x, z, tx, tz) => (Math.atan2(tx - x, -(tz - z)) * 180 / Math.PI + 360) % 360;
function resolve(p) {
  const d = P.defaults, ps = p.position; let ax, a;
  if (ps.lnglat) { a = { lng: ps.lnglat[0], lat: ps.lnglat[1], sigma_m: null, name: 'explicit coordinate' }; } else a = anchorOf(ps.anchor);
  let [x, z] = xz(a.lng, a.lat); const x0 = x, z0 = z;
  if (ps.snap === 'summit') { let best = -1e9; const R = ps.snap_r_m; for (let dx = -R; dx <= R; dx += 4) for (let dz = -R; dz <= R; dz += 4) if (dx * dx + dz * dz <= R * R) { const h = sampleXZ(x0 + dx, z0 + dz); if (h > best) { best = h; x = x0 + dx; z = z0 + dz; } } }
  if (ps.offset_m) { x += ps.offset_m[0]; z -= ps.offset_m[1]; }
  let rel = null; const tgt = p.heading.toward ? anchorOf(p.heading.toward) : null;
  if (ps.relative) {   // camera placed at a bearing (clockwise from north, from the anchor to the camera) and a distance; the distance may come from the apparent width of the anchor building in the photograph
    const r = ps.relative; let D = r.distance_m;
    if (D == null) { const ring = a.ring; if (!ring) throw new Error('width_fraction needs a footprint ring: ' + ps.anchor); const br = r.bearing_deg * Math.PI / 180, ux = Math.cos(br), uz = Math.sin(br);   // unit vector perpendicular to the viewing line (east/south axes of x,z)
      const pr = ring.map(q => { const [qx, qz] = xz(q[0], q[1]); return (qx - x) * ux + (qz - z) * uz; }); const Wb = Math.max(...pr) - Math.min(...pr); D = (Wb / 2) / Math.tan((r.width_fraction * (p.fov?.h_deg ?? d.fov_h_deg) * Math.PI / 180) / 2); rel = { building_width_m: +Wb.toFixed(1), width_fraction_of_frame: r.width_fraction, distance_from_width_m: +D.toFixed(1) }; }
    const br = r.bearing_deg * Math.PI / 180; x += D * Math.sin(br); z -= D * Math.cos(br);
  }
  const [lng, lat] = lnglat(x, z); let heading = p.heading.fixed_deg ?? 0;
  if (tgt) { const [tx, tz] = xz(tgt.lng, tgt.lat); heading = bearingTo(x, z, tx, tz) + (p.heading.offset_deg ?? 0); heading = (heading + 360) % 360; }
  return { id: p.id, photo_key: p.photo_key ?? null, loc_id: p.loc_id, lng: +lng.toFixed(6), lat: +lat.toFixed(6), x_m: +x.toFixed(1), z_m: +z.toFixed(1), ground_m: +sampleXZ(x, z).toFixed(1), agl: p.agl_m ?? d.agl_m, headingDeg: +heading.toFixed(1), pitchDeg: p.pitch_deg ?? d.pitch_deg, fovHDeg: p.fov?.h_deg ?? p.fov_h_deg ?? d.fov_h_deg,
    anchor: ps.anchor ?? 'explicit', anchor_sigma_m: a.sigma_m, position_tier: ps.tier, heading_tier: p.heading.tier, relative: rel };
}
const out = path.join(ROOT, 'tmp/photomatch/renders'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message)); page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto(`http://127.0.0.1:${port}/render.html`); await page.waitForFunction(() => window.btReady);
const resolved = [], variants = [{ s: '', d: 0 }, { s: '_fov30', d: -10 }, { s: '_fov50', d: 10 }];
for (const p of P.poses) { if (want.length && !want.includes(p.id)) continue; const r = resolve(p); resolved.push(r);
  const crop = (p.photo && p.photo.file && CR[p.photo.file] && p.photo.crop === 'auto') ? CR[p.photo.file] : (p.photo && Array.isArray(p.photo.crop) ? p.photo.crop : null);   // fractions [x0,y0,x1,y1] of the image file
  const asp = crop ? ((crop[3] - crop[1]) * (CR[p.photo.file + '#size']?.[1] ?? 1)) / ((crop[2] - crop[0]) * (CR[p.photo.file + '#size']?.[0] ?? 1)) : (p.photo_crop_1600 ? (p.photo_crop_1600[3] - p.photo_crop_1600[1]) / (p.photo_crop_1600[2] - p.photo_crop_1600[0]) : 2 / 3);
  const sz = [960, Math.round(960 * asp)]; r.render_px = sz; r.photo_crop_fraction = crop;
  const lm = (p.landmarks || []).map(id => { const a = anchorOf(id); return { id, lng: a.lng, lat: a.lat, name: a.name, h: 8 }; });
  for (const v of variants) { const t0 = Date.now(); const pose = { ...r, fovHDeg: r.fovHDeg + v.d };
    const res = await page.evaluate(([pose, w, h]) => window.btRender(pose, w, h), [pose, sz[0], sz[1]]);
    for (const k of ['base', 'full']) fs.writeFileSync(path.join(out, `${p.id}${v.s}_${k}.png`), Buffer.from(res[k].split(',')[1], 'base64'));
    if (lm.length) { const pr = await page.evaluate(([pose, pts, w, h]) => window.btProject(pose, pts, w, h), [pose, lm, sz[0], sz[1]]); (r['landmarks' + v.s] = pr.map((q, i) => ({ ...q, name: lm[i].name }))); }
    console.log(p.id, v.s || 'main', 'eye y', res.eye.y.toFixed(1), 'ground', res.groundM.toFixed(1), Date.now() - t0, 'ms'); } }
const RESOLVED_DOC = 'Poses resolved from poses.json against gazetteer, building footprints, monuments and the DEM by run.mjs. Assumptions or inferences as tiered in poses.json, not measured camera positions.';
if (!want.length) fs.writeFileSync(path.join(HERE, 'resolved_poses.json'), JSON.stringify({ _doc: RESOLVED_DOC, resolved }, null, 1));
else {   // a partial run (named poses) is merged into resolved_poses.json: the named entries are replaced, the others kept, the order of poses.json restored
  const rp = path.join(HERE, 'resolved_poses.json'); let old = []; try { old = JSON.parse(fs.readFileSync(rp)).resolved || []; } catch { }
  const byId = Object.fromEntries(old.map(r => [r.id, r])); for (const r of resolved) byId[r.id] = r;
  const merged = P.poses.map(p => byId[p.id]).filter(Boolean);
  fs.writeFileSync(rp, JSON.stringify({ _doc: RESOLVED_DOC, resolved: merged }, null, 1));
  fs.writeFileSync(path.join(ROOT, 'tmp/photomatch/renders/resolved_partial.json'), JSON.stringify({ resolved }, null, 1));
}
await browser.close(); srv.close();
