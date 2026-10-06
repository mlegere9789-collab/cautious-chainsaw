// 03-shots.mjs: read-only look at the shipped unit tiles; run from the repo root: node docs/pitch/anim/data/03-shots.mjs (needs release/R1c/dist and data/cluster-stats.json).
// Read-only look at the shipped unit tiles (release/R1c/dist = the fixed build; its unit renderer equals production's except the sound-button crash fix, a reduced-motion check and the carry-forward reset; see 03-data-fuel.md section 2).
// Uses the repo's own harness (tests/t0/lib.mjs) unmodified: Mapbox only through the Referer-injecting session, <= 300 tile requests, own ports/profile.
process.env.T0_AGENT = 'pitch-anim/data-fuel';
process.env.T0_PORT_BASE = '9546';
import fs from 'node:fs';
import path from 'node:path';
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, waitForApp, chooseLayout, mapView, waitFor, sleep, tileBudget } = await import('../../../../tests/t0/lib.mjs');

const OUT = path.join(REPO, 'docs', 'pitch', 'anim', 'data', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const stats = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/pitch/anim/data/cluster-stats.json'), 'utf8'));
const DIST = path.join(REPO, 'release', 'R1c', 'dist');
const srv = await createStaticServer({ root: DIST, port: PORT_BASE });

// rows at one exact tick (model B), last row wins, read from the same data files the app loads
const dataDir = path.join(DIST, 'data');
const allFiles = fs.readdirSync(dataDir).filter((f) => /^(placements|density)_/.test(f));
const rowsAt = (tick) => { const m = new Map(); for (const f of allFiles) { const j = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')); for (const r of (Array.isArray(j) ? j : j.placements || [])) if (r.tick === tick) m.set(r.unit_id, r); } return [...m.values()]; };

// model A: carry-forward state at a tick (every unit with a row <= tick at its latest row), rows read from the same files
const carryAt = (tick) => { const all = []; for (const f of allFiles) { const j = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')); for (const r of (Array.isArray(j) ? j : j.placements || [])) if (r.tick <= tick) all.push(r); } all.sort((a, b) => a.tick - b.tick); const m = new Map(); for (const r of all) m.set(r.unit_id, r); return [...m.values()]; };

const scenes = [
  { name: 'tick538-z13.5-pickett-step-off', tick: 538, zoom: 13.5, ep: stats.hotspots['B_latest_keyframe_snapshot|z13.5'].episodes_top[0] },
  { name: 'tick120-z14-cemetery-hill-evening', tick: 120, zoom: 14, ep: stats.hotspots['B_latest_keyframe_snapshot|z13.5'].episodes_top[1] },
  { name: 'tick551-z16-copse-of-trees', tick: 551, zoom: 16, ep: stats.hotspots['B_latest_keyframe_snapshot|z16'].episodes_top[0] },
];
const S = await openSession({ profile: 'shots', cdpPort: PORT_BASE + 1, viewport: { width: 1440, height: 900 } });
const report = [];
try {
  for (const sc of scenes) {
    const [lat, lng] = sc.ep.centroid;
    const url = `http://127.0.0.1:${PORT_BASE}/?t=${sc.tick}&z=${sc.zoom}&ll=${lat},${lng}`;
    await S.page.goto(url, { waitUntil: 'load' });
    await waitForApp(S.page, 45000);
    await chooseLayout(S.page, 'desktop');
    await waitFor(async () => { const v = await mapView(S.page); return v && Math.abs(v.zoom - sc.zoom) < 0.05 ? v : null; }, { timeout: 30000, label: 'map at requested zoom' });
    await sleep(4500);
    const rows = rowsAt(sc.tick);
    const proj = await S.page.evaluate((pts) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); return { zoom: m.getZoom(), rect: [c.left, c.top, c.width, c.height], px: pts.map(([lng, lat]) => { const q = m.project([lng, lat]); return [q.x, q.y]; }) }; }, rows.map((r) => [r.lng, r.lat]));
    // my Web-Mercator model of the same zoom
    const world = 512 * 2 ** proj.zoom;
    const mx = (lng) => (lng + 180) / 360 * world;
    const my = (lat) => (0.5 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / (2 * Math.PI)) * world;
    let maxErr = 0;
    for (let i = 1; i < rows.length; i++) {
      const dxm = mx(rows[i].lng) - mx(rows[0].lng), dym = my(rows[i].lat) - my(rows[0].lat);
      const dxp = proj.px[i][0] - proj.px[0][0], dyp = proj.px[i][1] - proj.px[0][1];
      maxErr = Math.max(maxErr, Math.hypot(dxm - dxp, dym - dyp));
    }
    // which tiles of the carry-forward state sit under another element (legend, event card, overview, buttons) at this camera?
    const carry = carryAt(sc.tick);
    const cover = await S.page.evaluate((pts) => {
      const canvases = [...document.querySelectorAll('canvas')];
      const unitCanvas = canvases.find((c) => getComputedStyle(c).zIndex === '10') || null;
      const m = window.__t0map; const rect = m.getCanvas().getBoundingClientRect();
      const out = { total: pts.length, in_view: 0, covered: 0, by: {} };
      for (const [lng, lat] of pts) {
        const q = m.project([lng, lat]); const x = q.x + rect.left, y = q.y + rect.top;
        if (x < 0 || y < rect.top || x > innerWidth || y > innerHeight) continue;
        out.in_view++;
        const top = document.elementsFromPoint(x, y)[0];
        const onMap = !top || top === unitCanvas || top.tagName === 'CANVAS' || !!top.closest('.mapboxgl-map');
        if (!onMap) {
          out.covered++;
          let el = top; let label = '';
          for (let i = 0; i < 6 && el && !label; i++, el = el.parentElement) { const t = (el.innerText || '').trim().split('\n')[0].slice(0, 28); if (t && el.getBoundingClientRect().width > 120) label = t; }
          out.by[label || top.tagName] = (out.by[label || top.tagName] || 0) + 1;
        }
      }
      out.unit_canvas_found = !!unitCanvas;
      return out;
    }, carry.map((r) => [r.lng, r.lat]));
    // hide the site's footer credit line (name and contact address) so the published screenshots carry no personal contact data
    await S.page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''); if ((el.tagName === 'A' && /^mailto:/i.test(el.getAttribute('href') || '')) || /Created by/i.test(own) || (el.children.length === 0 && /@gmail\.com/i.test(el.textContent || ''))) el.style.visibility = 'hidden'; } });
    const file = path.join(OUT, `${sc.name}.jpg`);
    await S.page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    report.push({ scene: sc.name, tick: sc.tick, zoom: proj.zoom, rows_at_tick: rows.length, projection_max_error_px_vs_model: +maxErr.toFixed(3), canvas: proj.rect, file: path.relative(REPO, file), tiles_used_so_far: tileBudget.used, carry_tiles: carry.length, ui_cover: cover });
    console.log(JSON.stringify(report[report.length - 1]));
  }
} finally {
  await S.close();
  await srv.close();
}
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, 'shots-report.json'), JSON.stringify(report, null, 1));
fs.writeFileSync(path.join(OUT, 'ui-cover.json'), JSON.stringify(report.map(({ scene, tick, zoom, rows_at_tick, projection_max_error_px_vs_model, carry_tiles, ui_cover }) => ({ scene, tick, zoom, rows_at_tick, projection_max_error_px_vs_model, carry_tiles, ui_cover })), null, 1));
