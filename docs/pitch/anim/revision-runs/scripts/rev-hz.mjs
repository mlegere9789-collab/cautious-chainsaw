// rev-hz.mjs (revision, review fix 6 and 29) - does the tile motion depend on the display's refresh rate?  Deterministic virtual time: the same 20 seconds of playback (4x) stepped at 30, 60, 120, 144 and 240 frames per second,
// popups off, ENGINE-LEVEL metrics (the engine's own frame, not the independent pixel instrument): units with no tile of any kind, frames where a faint tile lies over a solid one, solid sudden steps per second
// (a step of 8 px or more that is at least 3 times the same tile's previous step, solid in both frames), largest one-frame step, steps of 8 px or more per second.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { loadKeyframes, firstTicks } from './srcdata.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9769); const first = firstTicks(loadKeyframes().units);
const srv = await serve(PROTO, PORT); let s = null;
const HZ = (args.hz || '30,60,120,144,240').split(',').map(Number); const SCN = (args.scenes || 'the-angle,rose-woods').split(','); const MODES = (args.modes || 'dynamics,strict,strict-d0').split(',');
const rows = [];
try {
  for (const mode of MODES) for (const name of SCN) for (const hz of HZ) {
    s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'hz' });   // a fresh page per run: nothing carries over
    const r = await s.page.evaluate(({ first, sc, hz, mode, secs }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle('war-room', 'standard'); E.tuning.set('layout.dMaxPx', 48); if (mode === 'strict-d0') { E.tuning.set('motion.mode', 'strict'); E.tuning.set('layout.dMaxPx', 0); } else E.tuning.set('motion.mode', mode);
      const dt = 1000 / hz; E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true });
      for (let i = 0; i < Math.round(260 * hz / 60); i++) S.step(1, dt); E.transport.setSpeed(4); E.transport.play(); for (let i = 0; i < Math.round(40 * hz / 60); i++) S.step(1, dt);
      const N = Math.round(secs * hz); let prev = null; let prev2 = null; let gapFrames = 0; let gapUnitFrames = 0; let foFrames = 0; let sudden = 0; let big = 0; let maxStep = 0; let tiles = 0;
      for (let i = 0; i < N; i++) {
        const f = S.step(1, dt); const cur = new Map(); const any = new Set(); const faint = []; const solid = [];
        for (const t of f.tiles) { if (t.opacity < 0.02) continue; for (const id of t.ids) any.add(id); cur.set(t.key, { x: t.x, y: t.y, op: t.opacity, r: [t.x - t.w * t.scale / 2, t.y - t.h * t.scale / 2, t.x + t.w * t.scale / 2, t.y + t.h * t.scale / 2] }); (t.opacity >= 0.5 ? solid : faint).push(cur.get(t.key).r); }
        tiles += cur.size;
        let gaps = 0; for (const id in first) if (f.tau >= first[id] + 0.5 && !any.has(id)) gaps++; if (gaps) { gapFrames++; gapUnitFrames += gaps; }
        let fo = false; for (const a of faint) { for (const b of solid) if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) { fo = true; break; } if (fo) break; } if (fo) foFrames++;
        if (prev) for (const [k, c] of cur) { const p = prev.get(k); if (!p) continue; const st = Math.hypot(c.x - p.x, c.y - p.y); if (st > maxStep && c.op >= 0.5 && p.op >= 0.5) maxStep = st; if (c.op >= 0.5 && p.op >= 0.5 && st >= 8) { big++; const q = prev2 && prev2.get(k); const ps = q ? Math.hypot(p.x - q.x, p.y - q.y) : 0; if (st >= 3 * Math.max(ps, 0.01)) sudden++; } }
        prev2 = prev; prev = cur;
      }
      return { N, gapFrames, gapUnitFrames, foFrames, sudden, big, maxStep, tilesMean: tiles / N };
    }, { first, sc: SCENES[name], hz, mode, secs: +(args.secs || 20) });
    await s.close();
    const row = { mode, scene: name, hz, frames: r.N, gapPct: +(100 * r.gapFrames / r.N).toFixed(1), faintOverSolidPct: +(100 * r.foFrames / r.N).toFixed(1), suddenSolidPerSec: +(r.sudden / (r.N / hz)).toFixed(2), stepsOver8PerSec: +(r.big / (r.N / hz)).toFixed(2), maxStepPx: +r.maxStep.toFixed(1), tilesMean: +r.tilesMean.toFixed(0) };
    rows.push(row); console.log(JSON.stringify(row));
  }
  writeJson('rev-hz.json', { generated: new Date().toISOString(), rows });
} finally { if (s) { try { await s.close(); } catch {} } srv.close(); }
