// v3i-pause.mjs - the common case: play, then press pause.  Manual mode, 60 Hz, popups off: the battle plays for 8 s from the scene's tick at 1x / 4x / 16x, then the transport is paused (as the Space key does).
// The page's own loop draws only while engine.busy() is true, so the frames the viewer can SEE are the frames up to the first idle one.  Measured:
//   timeToIdle      frames from the pause until busy() first turns false (the picture then freezes: the loop stops drawing)
//   frozen state    the picture at that frame, compared with the same engine stepped 1500 more frames (what it would settle to if it kept running): tiles that differ by more than 0.5 / 5 px, or by more than 0.1 opacity, and
//                   solid x dim overlap pairs and painted-ink overlaps in the FROZEN picture (witness)
//   motion visible  tile-frames with a change of position before the first idle frame, largest step after the pause had finished easing (after frame 120)
//   -> results/v3i-pause.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9724); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', witness: true, profile: 'pause' }); const rows = [];
try {
  await s.page.evaluate(() => { window.__rec.keep = false; window.__rec.install({ dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const name of ['the-angle', 'cemetery-hill', 'rose-woods', 'default', 'field']) for (const speed of [1, 4, 16]) {
    const r = await s.page.evaluate(({ sc, speed }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); for (let i = 0; i < 300; i++) S.step(1, 16.667);
      E.transport.setSpeed(speed); E.transport.play(); for (let i = 0; i < 480; i++) S.step(1, 16.667); E.transport.pause();
      const snap = (f) => new Map(f.tiles.map((t) => [t.key, [t.x, t.y, t.opacity]])); let prev = snap(E.frame); let idleAt = -1; let moved = 0; let lateMax = 0; let frames = 0;
      for (let i = 1; i <= 4000; i++) { const f = S.step(1, 16.667); frames = i; const cur = snap(f); for (const [k, v] of cur) { const p = prev.get(k); if (!p) continue; const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d > 0.001 || Math.abs(v[2] - p[2]) > 1e-4) { moved++; if (i > 120 && d > lateMax) lateMax = d; } } prev = cur; if (!E.busy()) { idleAt = i; break; } }
      const frozen = snap(E.frame); const fr = R.last; const frozenOverlap = { ss: fr.ss, sd: fr.sd }; const dimTiles = E.frame.tiles.filter((t) => t.opacity > 0.05 && t.opacity < 0.5).length;
      for (let i = 0; i < 1500; i++) S.step(1, 16.667); const later = snap(E.frame); let d05 = 0; let d5 = 0; let dop = 0; let missing = 0; let maxD = 0; for (const [k, v] of frozen) { const q = later.get(k); if (!q) { missing++; continue; } const d = Math.hypot(v[0] - q[0], v[1] - q[1]); if (d > maxD) maxD = d; if (d > 0.5) d05++; if (d > 5) d5++; if (Math.abs(v[2] - q[2]) > 0.1) dop++; }
      return { timeToIdleFrames: idleAt, visibleMoves: moved, maxStepAfterFrame120: +lateMax.toFixed(2), frozenTiles: frozen.size, frozenDimTiles: dimTiles, frozenVsSettled: { over0_5px: d05, over5px: d5, opacityOver0_1: dop, tilesGone: missing, maxPx: +maxD.toFixed(2) }, frozenOverlap };
    }, { sc: SCENES[name], speed });
    rows.push({ scene: name, speed, ...r }); console.log(name, speed + 'x', JSON.stringify(r));
  }
  const stale = rows.filter((r) => r.frozenVsSettled.over0_5px > 0 || r.frozenVsSettled.opacityOver0_1 > 0); console.log('pauses that freeze a picture that is not the settled one:', stale.length, 'of', rows.length);
  writeJson('v3i-pause.json', { generated: new Date().toISOString(), rows, frozenNotSettled: stale.length });
} finally { await s.close(); srv.close(); }
