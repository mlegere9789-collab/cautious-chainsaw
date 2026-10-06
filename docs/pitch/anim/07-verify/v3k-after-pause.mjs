// v3k-after-pause.mjs - REAL TIME: play 8 s, press Space (real key), then sample every 250 ms for 40 s: how many tiles moved more than 0.5 px / 5 px since the previous sample, the largest move, and whether the page is
// still drawing (its frame counter).  The positions are the ones the renderer is handed (engine.frame).   -> results/v3k-after-pause.json
import { serve, launch, PROTO, args, writeJson, sleep } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9727); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0', profile: 'afterpause' }); const P = s.page; const rows = [];
try {
  await P.evaluate((on) => { window.__studio.engine.tuning.set('popup.enabled', on); }, args.popups !== '0');
  for (const [name, speed] of [['the-angle', 4], ['the-angle', 1], ['cemetery-hill', 4], ['rose-woods', 4], ['default', 4], ['field', 4]]) {
    await P.evaluate(({ sc, speed }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); E.transport.setSpeed(speed); }, { sc: SCENES[name], speed });
    await P.mouse.move(5, 450); await sleep(3500); await P.evaluate(() => window.__studio.engine.transport.play()); await sleep(8000); await P.keyboard.press('Space'); const t0 = Date.now();
    const res = await P.evaluate(async () => { const S = window.__studio; const E = S.engine; const out = []; let prev = null; let prevFrames = S.frames; const snap = () => { const f = E.frame; return new Map(f.tiles.map((t) => [t.key, [t.x, t.y, t.opacity]])); }; prev = snap();
      for (let i = 0; i < 160; i++) { await new Promise((r) => setTimeout(r, 250)); const cur = snap(); let n05 = 0; let n5 = 0; let mx = 0; let gone = 0; for (const [k, v] of cur) { const p = prev.get(k); if (!p) continue; const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d > 0.5) n05++; if (d > 5) n5++; if (d > mx) mx = d; } for (const k of prev.keys()) if (!cur.has(k)) gone++; out.push([i, n05, n5, +mx.toFixed(1), gone, S.frames - prevFrames]); prevFrames = S.frames; prev = cur; }
      return out; });
    const secs = (i) => (i + 1) * 0.25; const moving = res.filter((r) => r[1] > 0); const big = res.filter((r) => r[2] > 0); const lastMove = moving.length ? secs(moving[moving.length - 1][0]) : 0; const lastBig = big.length ? secs(big[big.length - 1][0]) : 0;
    const after10 = res.filter((r) => secs(r[0]) > 10); const r = { scene: name, speed, windows250ms: res.length, windowsWithAMoveOver0_5px: moving.length, windowsWithAMoveOver5px: big.length, lastMoveSecondsAfterPause: lastMove, lastMoveOver5pxSecondsAfterPause: lastBig, windowsAfter10sWithAMoveOver5px: after10.filter((r) => r[2] > 0).length, windowsAfter10s: after10.length, largestMovePx: Math.max(...res.map((r) => r[3])), largestMoveAfter10sPx: Math.max(0, ...after10.map((r) => r[3])), framesDrawnPerWindowAfter30s: +(res.filter((r) => secs(r[0]) > 30).reduce((a, r) => a + r[5], 0) / Math.max(1, res.filter((r) => secs(r[0]) > 30).length)).toFixed(1) };
    rows.push(r); console.log(JSON.stringify(r));
  }
  writeJson('v3k-after-pause.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
