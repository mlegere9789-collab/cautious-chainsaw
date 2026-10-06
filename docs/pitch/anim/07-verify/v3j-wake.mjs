// v3j-wake.mjs - REAL TIME, real mouse and keyboard: play, press Space, wait until the page stops drawing (the engine has gone idle: the frame counter stops), then move the pointer onto a tile.  If the picture that
// froze was not the settled one, tiles move as soon as the loop wakes up.  Tile positions are read from the engine's frame (the positions the renderer is given) before and after the hover.   -> results/v3j-wake.json
import { serve, launch, PROTO, args, writeJson, sleep } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9726); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0', profile: 'wake' }); const P = s.page; const rows = [];
const pos = () => P.evaluate(() => { const E = window.__studio.engine; const f = E.frame; return { frames: window.__studio.frames, busy: E.busy(), tiles: f.tiles.map((t) => [t.key, t.x + f.view.dx, t.y + f.view.dy, t.opacity]) }; });
try {
  await P.evaluate(() => { window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const [name, speed] of [['the-angle', 4], ['cemetery-hill', 4], ['rose-woods', 4], ['default', 1], ['the-angle', 1], ['rose-woods', 1]]) {
    await P.evaluate(({ sc, speed }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); E.transport.setSpeed(speed); }, { sc: SCENES[name], speed });
    await P.mouse.move(5, 450); await sleep(3500); await P.evaluate(() => window.__studio.engine.transport.play()); await sleep(8000); await P.keyboard.press('Space');                    // the keyboard path
    await sleep(15000); const a = await pos(); await sleep(1500); const a2 = await pos(); const idle = a2.frames === a.frames;
    const target = a2.tiles.filter((t) => t[3] >= 0.99 && t[1] > 200 && t[1] < 1200 && t[2] > 120 && t[2] < 650)[0];
    await P.mouse.move(target[1] - 40, target[2] - 40); await P.mouse.move(target[1], target[2], { steps: 4 }); await sleep(3000); const b = await pos();
    const A = new Map(a2.tiles.map((t) => [t[0], t])); let d05 = 0; let d5 = 0; let maxD = 0; let gone = 0; for (const t of b.tiles) { const p = A.get(t[0]); if (!p) continue; const d = Math.hypot(t[1] - p[1], t[2] - p[2]); if (d > maxD) maxD = d; if (d > 0.5) d05++; if (d > 5) d5++; } for (const k of A.keys()) if (!b.tiles.some((t) => t[0] === k)) gone++;
    const r = { scene: name, speed, idleBeforeHover: idle, framesDrawnDuring1_5sIdle: a2.frames - a.frames, framesDrawnAfterHover3s: b.frames - a2.frames, tilesMovedOver0_5px: d05, tilesMovedOver5px: d5, maxMovePx: +maxD.toFixed(1), tilesGone: gone, tiles: b.tiles.length };
    rows.push(r); console.log(JSON.stringify(r));
  }
  writeJson('v3j-wake.json', { generated: new Date().toISOString(), rows, errors: s.errors });
} finally { await s.close(); srv.close(); }
