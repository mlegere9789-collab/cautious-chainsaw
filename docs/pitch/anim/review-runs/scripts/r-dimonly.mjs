// r-dimonly.mjs (reviewer) - "a unit shown only by a faint tile": the verifier counts a tile as in view if it overlaps the viewport by more than 1 px, including tiles the renderer culls (no ink).
// Here: engine-level, manual 60 Hz, popups off; a unit is "in view" only when a tile holding it lies fully inside the viewport (all four edges, so an edge-straddling tile cannot count).
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9748); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'dimonly' });
const out = [];
try {
  for (const style of ['war-room', 'field-manual', 'map-1863']) for (const name of ['the-angle', 'rose-woods', 'cemetery-hill']) for (const speed of [1, 4]) {
    const r = await s.page.evaluate(({ sc, style, speed }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard'); E.transport.pause(); E.select(null);
      E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: false }); for (let i = 0; i < 260; i++) S.step(1); E.transport.setSpeed(speed); E.transport.play(); for (let i = 0; i < 40; i++) S.step(1);
      const FR = 1200; let framesDim = 0; let framesNone = 0; let unitFrames = 0; let dimUnitFrames = 0; let maxDim = 0;
      for (let i = 0; i < FR; i++) {
        const f = S.step(1); const best = new Map();
        for (const t of f.tiles) { if (t.opacity < 0.02) continue; const cx = t.x + f.view.dx; const cy = t.y + f.view.dy; if (cx - t.w / 2 < 0 || cx + t.w / 2 > 1440 || cy - t.h / 2 < 0 || cy + t.h / 2 > 900) continue; for (const id of t.ids) if ((best.get(id) ?? -1) < t.opacity) best.set(id, t.opacity); }
        let d = 0; for (const [, op] of best) { unitFrames++; if (op < 0.5) { d++; dimUnitFrames++; } } if (d) framesDim++; if (d > maxDim) maxDim = d;
      }
      return { FR, framesDim, unitFrames, dimUnitFrames, maxDim };
    }, { sc: SCENES[name], style, speed });
    out.push({ style, name, speed, ...r });
    console.log(style, name, speed + 'x', 'frames with a unit held only by a tile < 0.5 opacity:', (100 * r.framesDim / r.FR).toFixed(1) + '%', 'max units at once', r.maxDim, '| share of unit-frames faint', (100 * r.dimUnitFrames / Math.max(1, r.unitFrames)).toFixed(2) + '%');
  }
  writeJson('r-dimonly.json', out);
} finally { await s.close(); srv.close(); }
