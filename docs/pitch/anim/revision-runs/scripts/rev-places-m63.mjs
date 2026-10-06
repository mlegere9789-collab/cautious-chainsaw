// rev-places.mjs (revision, fix 9) - do tiles cover the map's own place names?  Settled picture, popups off, camera on the field centre; for each place mark in view (the 30 named places, plus the 3 features and 8 structures
// from zoom 14.5, exactly as the prototype's backdrop draws them) the label box (10 px bold, starting 8 px right of the mark) and the mark itself are compared with every SOLID tile (opacity 0.5 or more).
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9777);
const T = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'dataset.json'), 'utf8')).terrain;
const places = [...T.locations.map((l) => ({ n: l.displayName || l.name, lng: l.lng, lat: l.lat, minor: false })), ...T.features.map((l) => ({ n: l.name, lng: l.lng, lat: l.lat, minor: true })), ...T.structures.map((l) => ({ n: l.name, lng: l.lng, lat: l.lat, minor: true }))];
const srv = await serve(PROTO, PORT);
const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'places63' });
const TICKS = [226, 400, 551, 604]; const ZOOMS = [13.5, 14, 15, 16];
const CFGS = [{ style: 'map-1863', set: {} }];
const rows = [];
try {
  for (const cfg of CFGS) for (const zoom of ZOOMS) {
    const r = await s.page.evaluate(({ cfg, zoom, TICKS, places }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(cfg.style, 'standard'); E.tuning.set('layout.dMaxPx', 48); for (const [k, v] of Object.entries(cfg.set)) E.tuning.set(k, v);
      const cv = document.createElement('canvas').getContext('2d'); cv.font = '600 10px "Segoe UI", system-ui, sans-serif';
      const out = [];
      for (const tick of TICKS) {
        E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false });
        let f; let last = -1; let still = 0; for (let i = 0; i < 400; i++) { f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
        const W = E.camera.w; const H = E.camera.h; const view = f.view;
        const rects = f.tiles.filter((t) => t.opacity >= 0.5 && t.life === 'live').map((t) => { const x = t.x + view.dx; const y = t.y + view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; return [x - hw, y - hh, x + hw, y + hh]; });
        let inView = 0; let anyCover = 0; let half = 0; let whole = 0; let markCovered = 0; const worst = [];
        for (const p of places) {
          if (p.minor && zoom < 14.5) continue;
          const [x, y] = E.camera.toScreen(p.lng, p.lat); if (x < 20 || x > W - 20 || y < 60 || y > H - 140) continue;     // inside the map area, clear of the toolbar and dock
          inView++;
          const w = cv.measureText(p.n).width; const L = [x + 6.5, y - 6, x + 8 + w + 1.5, y + 6]; const area = (L[2] - L[0]) * (L[3] - L[1]);
          // covered area by sampling a 1 px grid
          let cov = 0; for (let px = L[0]; px < L[2]; px += 1) for (let py = L[1]; py < L[3]; py += 1) { for (const r of rects) if (px >= r[0] && px <= r[2] && py >= r[1] && py <= r[3]) { cov++; break; } }
          const share = cov / Math.max(1, Math.floor(area));
          if (share > 0.02) anyCover++; if (share >= 0.5) half++; if (share >= 0.95) whole++;
          let mc = false; for (const r of rects) if (x + 4.5 >= r[0] && x - 4.5 <= r[2] && y + 4.5 >= r[1] && y - 4.5 <= r[3]) { mc = true; break; } if (mc) markCovered++;
          if (share >= 0.5) worst.push(p.n + ' ' + (100 * share).toFixed(0) + '%');
        }
        out.push({ tick, inView, anyCover, half, whole, markCovered, worst });
      }
      return out;
    }, { cfg, zoom, TICKS, places });
    for (const o of r) rows.push({ style: cfg.style, set: JSON.stringify(cfg.set), zoom, ...o });
    const sum = (k) => r.reduce((a, o) => a + o[k], 0);
    console.log(cfg.style, JSON.stringify(cfg.set), 'zoom', zoom, '| name labels in view (4 ticks, sum)', sum('inView'), '| touched by a solid tile', sum('anyCover'), '| half or more covered', sum('half'), '| 95% or more covered', sum('whole'), '| mark itself under a tile', sum('markCovered'));
  }
  writeJson('rev-places-m63.json', { generated: new Date().toISOString(), ticks: TICKS, zooms: ZOOMS, rows });
} finally { await s.close(); srv.close(); }
