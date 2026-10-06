// v3f-rest.mjs - "a paused picture stands still": after the picture has settled, 600 more frames are stepped (10 s at 60 Hz) with nothing moving; every tile's position, size and opacity is compared frame to frame,
// the painted ink boxes are compared (witness), and the engine's own idle flag is read.   -> results/v3f-rest.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9721); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', witness: true, profile: 'rest' }); const rows = [];
try {
  await s.page.evaluate(() => { const R = window.__rec; R.keep = false; R.install({ dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const name of ['the-angle', 'cemetery-hill', 'rose-woods', 'field', 'default']) for (const zoom of [null]) {
    const r = await s.page.evaluate(({ sc }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true });
      for (let i = 0; i < 400; i++) S.step(1, 16.667); const snap = (f) => new Map(f.tiles.map((t) => [t.key, [t.x, t.y, t.w, t.h, t.opacity, t.label ? 1 : 0]]));
      let prev = snap(E.frame); let moved = 0; let keysChanged = 0; let maxStep = 0; let busyFrames = 0; let inkChange = 0; let prevInk = JSON.stringify(R.rec.box.map((b) => b && b.slice(0, 4).map((x) => Math.round(x * 100) / 100)));
      for (let i = 0; i < 600; i++) { const f = S.step(1, 16.667); const cur = snap(f); if (E.busy()) busyFrames++; for (const [k, v] of cur) { const p = prev.get(k); if (!p) { keysChanged++; continue; } const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d > 0.001 || Math.abs(v[4] - p[4]) > 1e-4 || Math.abs(v[2] - p[2]) > 0.01 || v[5] !== p[5]) { moved++; if (d > maxStep) maxStep = d; } } for (const k of prev.keys()) if (!cur.has(k)) keysChanged++; prev = cur; const ink = JSON.stringify(R.rec.box.map((b) => b && b.slice(0, 4).map((x) => Math.round(x * 100) / 100))); if (ink !== prevInk) inkChange++; prevInk = ink; }
      return { tiles: E.frame.tiles.length, moved, keysChanged, maxStep, busyFramesOf600: busyFrames, framesWithDifferentInk: inkChange };
    }, { sc: SCENES[name] });
    rows.push({ scene: name, ...r }); console.log(name, JSON.stringify(r));
  }
  writeJson('v3f-rest.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
