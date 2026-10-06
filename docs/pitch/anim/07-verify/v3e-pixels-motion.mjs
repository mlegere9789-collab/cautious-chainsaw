// v3e-pixels-motion.mjs - the pixel-completeness check (every pixel the skin paints for a tile, label or pin lies inside a painted-ink box the witness recorded) repeated DURING MOTION: manual 60 Hz playback,
// every 12th frame is re-drawn with the skin's tile / label / pin drawing off and the two canvases compared.   -> results/v3e-pixels-motion.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9717); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', witness: true, profile: 'pxm' }); const rows = [];
try {
  await s.page.evaluate(() => { const R = window.__rec; R.keep = false; R.install({ dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const style of ['war-room', 'field-manual', 'map-1863']) for (const name of ['the-angle', 'rose-woods']) {
    const r = await s.page.evaluate(({ sc, style }) => { const S = window.__studio; const E = S.engine; const R = window.__rec; S.ui.chooseStyle(style, 'standard'); E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); for (let i = 0; i < 260; i++) S.step(1, 16.667); E.transport.setSpeed(4); E.transport.play();
      let checked = 0; let unexplained = 0; let worst = 0; let diffPx = 0; let dimFrames = 0; for (let i = 0; i < 480; i++) { const f = S.step(1, 16.667); if (i % 12 === 0) { const p = R.pixelCheck(); checked++; unexplained += p.unexplained; worst = Math.max(worst, p.unexplained); diffPx += p.diffPixels; if (f.tiles.some((t) => t.opacity < 0.5 && t.opacity > 0.3)) dimFrames++; } } return { checked, unexplained, worst, dimFrames, meanDiffPx: Math.round(diffPx / checked) }; }, { sc: SCENES[name], style });
    rows.push({ style, scene: name, ...r }); console.log(style, name, JSON.stringify(r));
  }
  writeJson('v3e-pixels-motion.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
