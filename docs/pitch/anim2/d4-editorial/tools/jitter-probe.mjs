// tools/jitter-probe.mjs - WHICH tiles take a sudden step, and why: plays a scene frame by frame (virtual clock, 60 fps) at 1x or 4x and, with the same definition as tools/pacing.mjs
// (a tile solid in two consecutive frames; a step of 8 px or more that is at least 3 times its previous step), lists every such step with the tile's kind, state and neighbours.
//   node tools/jitter-probe.mjs "scene=carry1&tick=285&zoom=15" 4 600
import { serve, launch, open, PAGE, PORT } from './lib.mjs';
const q = process.argv[2] || 'scene=carry1&tick=285&zoom=15'; const speed = +(process.argv[3] || 4); const frames = +(process.argv[4] || 600); const SET = { 'popup.enabled': false, ...JSON.parse(process.argv[5] || '{}') };
const srv = await serve(); const b = await launch({ dpr: 2 });
try {
  await open(b.page, `${q}&speed=${speed}&play=1&set=${encodeURIComponent(JSON.stringify(SET))}`);
  const r = await b.page.evaluate(async (n) => {
    const S = window.__studio; const E = S.engine; let T = window.__T || 5000; const last = new Map(); const prev = new Map(); const ev = []; let steps = 0, maxD = 0, dimFrames = 0, ovl = 0;
    for (let i = 0; i < n; i++) {
      T += 1000 / 60; window.__T = T; S.step(1, 1000 / 60); const f = E.frame; const cur = new Map(); ovl += f.overlaps || 0; for (const t of f.tiles) if (t.life === 'live' && t.opacity < 0.5) dimFrames++;
      for (const t of f.tiles) {
        if (t.life !== 'live' || t.opacity < 0.5) continue; const x = t.x + f.view.dx - (t.hx || 0); const y = t.y + f.view.dy; cur.set(t.key, [x, y, t]); const p = last.get(t.key);
        if (p) { const d = Math.hypot(x - p[0], y - p[1]); steps++; if (d > maxD) maxD = d; const pv = prev.get(t.key) || 0; if (d >= 8 && d >= 3 * pv) ev.push({ frame: i, tick: +f.tick.toFixed(2), key: t.key, kind: t.kind || t.nodeKind || (t.members ? 'crowd' : 'unit'), d: +d.toFixed(1), prev: +pv.toFixed(1), n: t.members ? t.members.length : 1, mode: t.mode || t.state || '', opacity: +t.opacity.toFixed(2), keys: Object.keys(t).join(',') }); prev.set(t.key, d); }
      }
      last.clear(); for (const [k, v] of cur) last.set(k, v);
    }
    return { steps, maxD: +maxD.toFixed(1), ev, dimFrames, ovl };
  }, frames);
  console.log(JSON.stringify({ q, speed, frames, steps: r.steps, maxD: r.maxD, events: r.ev.length, dimmedTileFrames: r.dimFrames, overlapPairs: r.ovl, set: process.argv[5] || '' }));
  if (!process.argv[6]) for (const e of r.ev) console.log(JSON.stringify({ ...e, keys: undefined }));
  if (r.ev[0]) console.log('tile fields:', r.ev[0].keys);
} finally { await b.close(); srv.close(); }
