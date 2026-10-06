// figs.mjs - two pictures for the report, made from the live page.
//   shots/verify/fig-cut-strip.png      frames of a hard cut (The Angle -> Cemetery Hill) as the page paints them: the tile layer blanks for about three frames and refills over about half a second
//   shots/verify/fig-chrome-covers.png  the page at its opening scene with the Inspector open: tiles that lie at least half under the interface are outlined red, tiles partly under it orange
import path from 'node:path';
import { serve, launch, PROTO, SHOTS, args } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const PORT = +(args.port || 9720); const srv = await serve(PROTO, PORT);
try {
  const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'figs' }); const P = s.page;
  const png = await P.evaluate(({ A, B }) => {
    const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); const cv = document.getElementById('map');
    const go = (sc) => { E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); };
    go(A); for (let i = 0; i < 260; i++) S.step(1, 16.667); go(B); const want = [0, 2, 4, 5, 6, 7, 8, 10, 14, 20, 30, 45]; const thumbs = []; let n = 0;
    for (let i = 0; i < 46; i++) { S.step(1, 16.667); if (want.includes(i)) { const o = document.createElement('canvas'); o.width = 360; o.height = 225; const g = o.getContext('2d'); g.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 360, 225); g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, 70, 18); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText('frame ' + i, 6, 13); thumbs.push(o); } }
    const sheet = document.createElement('canvas'); sheet.width = 360 * 4 + 5 * 6; sheet.height = 225 * 3 + 4 * 6; const g = sheet.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, sheet.width, sheet.height); thumbs.forEach((t, i) => g.drawImage(t, 6 + (i % 4) * 366, 6 + Math.floor(i / 4) * 231)); return sheet.toDataURL('image/png');
  }, { A: SCENES['the-angle'], B: SCENES['cemetery-hill'] });
  (await import('node:fs')).writeFileSync(path.join(SHOTS, 'fig-cut-strip.png'), Buffer.from(png.split(',')[1], 'base64'));
  // chrome covers tiles
  await P.evaluate((sc) => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.transport.pause(); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); for (let i = 0; i < 260; i++) S.step(1, 16.667); const f = E.frame; const t = f.tiles.find((q) => q.kind === 'leaf' && q.opacity > 0.99 && q.x + f.view.dx > 300 && q.x + f.view.dx < 900 && q.y + f.view.dy > 200 && q.y + f.view.dy < 500); if (t) { E.select(t.ids[0]); S.host.setSelected(t.ids[0]); S.ui.setSelection(t); } for (let i = 0; i < 60; i++) S.step(1, 16.667); }, SCENES.default);
  await P.evaluate(() => {
    const S = window.__studio; const f = S.engine.frame; const rects = [...document.querySelectorAll('#topbar > *, #dock, #panel:not(.hidden)')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 4 && r.height > 4);
    const layer = document.createElement('div'); layer.id = 'verify-overlay'; layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999'; document.body.append(layer); let any = 0; let half = 0; let total = 0;
    for (const t of f.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const cx = t.x + f.view.dx; const cy = t.y + f.view.dy; const b = [cx - t.w / 2, cy - t.h / 2, cx + t.w / 2, cy + t.h / 2]; if (b[2] < 0 || b[0] > innerWidth || b[3] < 0 || b[1] > innerHeight) continue; total++; let cov = 0; for (const r of rects) { const w = Math.min(b[2], r.right) - Math.max(b[0], r.left); const h = Math.min(b[3], r.bottom) - Math.max(b[1], r.top); if (w > 0.5 && h > 0.5) cov = Math.max(cov, w * h / Math.max(1, (b[2] - b[0]) * (b[3] - b[1]))); } if (cov > 0.02) { any++; if (cov >= 0.5) half++; const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${b[0]}px;top:${b[1]}px;width:${b[2] - b[0]}px;height:${b[3] - b[1]}px;border:2px solid ${cov >= 0.5 ? '#ff2d2d' : '#ff9f1a'};box-sizing:border-box;border-radius:5px`; layer.append(d); } }
    window.__figCounts = { total, any, half };
  });
  console.log(JSON.stringify(await P.evaluate(() => window.__figCounts)));
  await P.screenshot({ path: path.join(SHOTS, 'fig-chrome-covers.png') }); await s.close();
} finally { srv.close(); }
