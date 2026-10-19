// tools/labels.mjs - director fixes 2 and 3 gate: COUNT the lettering of the ground (place names, road and stream names) that a mark covers, that lies on another name, or that is drawn twice; and the casualty marks over the scale bar.
// It reads the names the renderer drew in one settled frame (renderer.labels: the box of each place name and each road or stream name; the same two lines of instrumentation were added to the 3449e82 sources for the 'before'
// numbers, nothing else of them was changed) and tests each against the footprints of the solid marks and against the other names.
//   node tools/labels.mjs --opt=a [--page=_before-a.html] [--tag=after]   ->  results/labels-<tag>.json
import fs from 'node:fs';
import path from 'node:path';
import { open, setScene, args, D1, stopServer } from './lib.mjs';
const OPT = args.opt || 'a'; process.env.LOOK_PAGE = args.page || (OPT === 'a' ? 'option-a-standards.html' : 'option-b-glyph.html'); const STYLE = OPT === 'a' ? 'standards' : 'glyph'; const TAG = args.tag || 'after';
const SCENES = [
  { id: 's1a z13.5 t295', tick: 295, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96] }, { id: 's1b z13.5 t556', tick: 556, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96] },
  { id: 's2 z15 t295', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 15, shift: [84, -96] }, { id: 's3 z15.5 t346', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5, shift: [-210, -18] },
  { id: 's4 z16.5 t551', tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16.5, shift: [102, 6] }, { id: 'z12.5 t226', tick: 226, lat: 39.8117, lng: -77.2347, zoom: 12.5, shift: [0, 0] },
  { id: 'z14 t60', tick: 60, lat: 39.8278, lng: -77.2528, zoom: 14, shift: [0, 0] }, { id: 'z14.5 t28 (Herbst, the rail story of the director)', tick: 28, lat: 39.8278, lng: -77.2528, zoom: 14.5, shift: [114, 72] }, { id: 'z15 t346 (Cemetery)', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15, shift: [0, 0] },
];
const s = await open({ dpr: 1, profile: 'labels' + TAG });
const out = { generated: new Date().toISOString(), page: process.env.LOOK_PAGE, tag: TAG, scenes: [] };
try {
  for (const sc of SCENES) {
    await setScene(s.page, { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: sc.zoom, safe: true, shift: sc.shift, popups: false, style: STYLE, steps: 120 });
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(30));
    const r = await s.page.evaluate(() => {
      const S = window.__studio; S.engine.dirty = true; S.step(1, 16.667); const f = S.engine.frame; const DX = f.view.dx; const DY = f.view.dy; const L = S.renderer.labels;
      const names = [...L.places, ...L.streets].map((n) => ({ text: n.text, kind: n.kind, x0: n.x0, x1: n.x1, y0: n.y0, y1: n.y1 }));
      const tiles = f.tiles.filter((t) => t.opacity >= 0.5).map((t) => ({ x0: t.x + DX - t.w * t.scale / 2, x1: t.x + DX + t.w * t.scale / 2, y0: t.y + DY - t.h * t.scale / 2, y1: t.y + DY + t.h * t.scale / 2 }));
      const W = f.view.w; const H = f.view.h; const vis = names.filter((n) => n.x1 > 0 && n.x0 < W && n.y1 > 0 && n.y0 < H); const ov = (a, b) => a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
      let coveredByMark = 0; let onAnotherName = 0; const dup = {}; const coveredList = []; const onList = [];
      vis.forEach((n, i) => { if (tiles.some((t) => ov(n, t))) { coveredByMark++; coveredList.push(n.text); } if (vis.some((m, j) => j !== i && ov(n, m))) { onAnotherName++; onList.push(n.text); } dup[n.text] = (dup[n.text] || 0) + 1; });
      return { names: vis.length, places: L.places.length, roads: L.streets.length, coveredByMark, onAnotherName, duplicates: Object.entries(dup).filter(([, v]) => v > 1).map(([k, v]) => k + ' x' + v), coveredList: coveredList.slice(0, 12), onList: onList.slice(0, 12), onBoxes: vis.filter((n, i) => vis.some((m, j) => j !== i && ov(n, m))).map((n) => [n.text, Math.round(n.x0), Math.round(n.y0), Math.round(n.x1), Math.round(n.y1)]) };
    });
    // casualty marks inside the scale bar's box (after only: the memory module exposes where its marks stood in the frame)
    const sb = await s.page.evaluate(() => { const S = window.__studio; const m = S.engine.kernel.fx.list().find((x) => x.id === 'memory'); const cv = document.getElementById('map'); if (!m || !m.countNear) return null; const h = cv.clientHeight; return m.countNear(90, h - 40, 120); }).catch(() => null);
    out.scenes.push({ id: sc.id, ...r, groundMarksInScaleBarBox: sb }); console.log(JSON.stringify({ id: sc.id, names: r.names, coveredByMark: r.coveredByMark, onAnotherName: r.onAnotherName, duplicates: r.duplicates.length, groundMarksInScaleBarBox: sb }));
  }
} finally { await s.close(); await stopServer(); }
const sum = (k) => out.scenes.reduce((a, x) => a + x[k], 0); out.totals = { names: sum('names'), coveredByMark: sum('coveredByMark'), onAnotherName: sum('onAnotherName'), duplicateNames: out.scenes.reduce((a, x) => a + x.duplicates.length, 0) };
fs.writeFileSync(path.join(D1, 'results', `labels-${TAG}.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.totals));
