// tools/probes/draw-ms.mjs - milliseconds per drawn frame of the marks in real Chrome (renderer.draw only, camera still), whole field at zoom 13.5, popups off, for a few token settings and the day ground.
//   node tools/probes/draw-ms.mjs [--dpr=2]
import { open, setScene, args, stopServer } from '../lib.mjs';
const s = await open({ dpr: +(args.dpr || 1), profile: 'drawms', port: 9845 });
try {
  await setScene(s.page, { tick: 612, lat: 39.81592, lng: -77.23677, zoom: 13.5, safe: false, popups: false, steps: 60 });
  const res = await s.page.evaluate(async () => {
    const S = window.__studio; const E = S.engine; const K = window.__skinKit; const out = {};
    const time = (label) => { for (let i = 0; i < 20; i++) S.step(1, 1000 / 60); let d = 0; let tiles = 0; const N = 80; for (let i = 0; i < N; i++) { S.step(1, 1000 / 60); d += S.renderer.stats.drawMs; tiles = S.renderer.stats.tilesDrawn; } out[label] = { drawMs: +(d / N).toFixed(2), marksDrawn: tiles }; };
    time('default');
    K.setToken('quiet-cartographer', 'halo.plate', 0); time('plate off');
    K.setToken('quiet-cartographer', 'pip.hairline', 0); time('plate off, no pip hairline');
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
} finally { await s.close(); await stopServer(); }
