// tools/clr-probe.mjs - which pair has the smallest gap in a settled frame with a selected mark, and what was the state of each (development aid)
import { open, stopServer } from './lib.mjs';
const s = await open({ dpr: 1, profile: 'clr', port: 9844 });
try {
  const res = await s.page.evaluate(() => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('layout.solveEvery', '1'); let T = 5000; window.__skinKit.setClock({ now: () => T }); const adv = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { T += dt; S.step(1, dt); } };
    const out = [];
    for (const [zoom, tick] of [[13.5, 226], [15, 226], [12, 620], [16.5, 551], [14, 346], [15, 551]]) {
      E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false }); adv(120);
      let f = E.frame; const c = f.tiles.filter((t) => t.kind === 'leaf' && t.solid).sort((a, b) => Math.hypot(a.x + f.view.dx - f.view.w / 2, a.y + f.view.dy - f.view.h / 2) - Math.hypot(b.x + f.view.dx - f.view.w / 2, b.y + f.view.dy - f.view.h / 2))[0]; E.select(c.ids[0]);
      for (const n of [1, 10, 60, 200, 400]) { adv(n === 1 ? 1 : n - 0); f = E.frame; const solid = f.tiles.filter((t) => t.opacity >= 0.5); let best = { g: 1e9 };
        for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) { const a = solid[i]; const b = solid[j]; const ax = a.w * a.scale / 2; const ay = a.h * a.scale / 2; const bx = b.w * b.scale / 2; const by = b.h * b.scale / 2; const g = Math.max((a.x - ax) - (b.x + bx), (b.x - bx) - (a.x + ax), (a.y - ay) - (b.y + by), (b.y - by) - (a.y + ay)); if (g < best.g) best = { g: +g.toFixed(3), a: a.key + (a.selected ? '*' : ''), b: b.key + (b.selected ? '*' : ''), aw: a.w, bw: b.w, busy: E.busy() }; }
        out.push({ zoom, tick, after: n, best, overlaps: f.overlaps }); }
    } return out; });
  for (const r of res) console.log(JSON.stringify(r));
} finally { await s.close(); await stopServer(); }
