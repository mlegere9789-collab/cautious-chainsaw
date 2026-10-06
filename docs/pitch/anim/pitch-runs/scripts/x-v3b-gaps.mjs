// v3b-gaps.mjs - units with NO tile at all.  Deterministic: manual mode, 60 Hz virtual time (1200 frames = 20 s per run), popups off, default settings.  A unit is "on the field" from the tick of its first
// keyframe (my own rule, from the source rows; the engine's visibleAt agrees, checked below).  On every frame the set of units inside ANY tile of the frame (live or dying, any opacity above 0.02) is
// compared with it.  A unit with no such tile is invisible on that frame.  Episodes (consecutive frames) are counted per unit.
//   node v3b-gaps.mjs [--scenes=...] [--speeds=1,4,16] [--frames=1200] [--styles=war-room] -> results/v3b-gaps.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { loadKeyframes, firstTicks } from './srcdata.mjs';
import { SCENES } from './scenes.mjs';

const first = firstTicks(loadKeyframes().units); const PORT = +(args.port || 9704); const FR = +(args.frames || 1200);
const names = (args.scenes || 'cemetery-hill,rose-woods,the-angle,field,default,evening,opening').split(','); const speeds = (args.speeds || '1,4,16').split(',').map(Number); const styles = (args.styles || 'war-room').split(',');
const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'gaps' }); const runs = [];
try {
  for (const style of styles) for (const name of names) for (const speed of speeds) {
    const r = await s.page.evaluate(({ first, sc, speed, FR, style, sets }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard'); for (const [k, v] of Object.entries(sets)) E.tuning.set(k, v); E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true });
      for (let i = 0; i < 260; i++) S.step(1); E.transport.setSpeed(speed); E.transport.play(); for (let i = 0; i < 40; i++) S.step(1);
      const open = new Map(); const eps = []; let unitFramesNoTile = 0; let framesWithGap = 0; let maxSimul = 0; let vaDiff = 0; let blink = 0; const sample = []; let dimGap = 0; let maxUnits = 0;
      for (let i = 0; i < FR; i++) {
        const f = S.step(1); const any = new Set(); const solid = new Set(); for (const t of f.tiles) { if (t.opacity < 0.02) continue; for (const id of t.ids) { any.add(id); if (t.opacity >= 0.5) solid.add(id); } }
        const vis = E.battle.visibleAt(f.tau); const vset = new Set(vis.map((e) => e.u.id)); let gaps = 0;
        for (const id in first) { const should = f.tau >= first[id]; if (should !== vset.has(id) && Math.abs(f.tau - first[id]) > 0.5) vaDiff++; if (should && !any.has(id)) { gaps++; open.set(id, (open.get(id) || 0) + 1); if (sample.length < 4 && open.get(id) === 1) sample.push({ frame: i, tau: +f.tau.toFixed(2), id }); } else if (open.has(id)) { eps.push(open.get(id)); open.delete(id); } }
        if (gaps) { framesWithGap++; unitFramesNoTile += gaps; if (gaps > maxSimul) maxSimul = gaps; } maxUnits = Math.max(maxUnits, vset.size);
      }
      for (const [, n] of open) eps.push(n);
      return { eps, unitFramesNoTile, framesWithGap, maxSimul, vaDiff, sample, maxUnits };
    }, { first, sc: SCENES[name], speed, FR, style, sets: JSON.parse(args.set || '{}') });
    const e = r.eps.sort((a, b) => a - b); const q = (p) => (e.length ? e[Math.min(e.length - 1, Math.floor(p * (e.length - 1)))] : 0);
    const row = { sets: args.set || '', style, scene: name, speed, frames: FR, seconds: FR / 60, unitFramesWithNoTile: r.unitFramesNoTile, framesWithAGap: r.framesWithGap, shareFramesWithGap: +(100 * r.framesWithGap / FR).toFixed(1), episodes: e.length, episodesPerSec: +(e.length / (FR / 60)).toFixed(2), medianFrames: q(0.5), p95Frames: q(0.95), maxFrames: e.length ? e[e.length - 1] : 0, maxUnitsAtOnce: r.maxSimul, visibleAtDisagreesWithMyRule: r.vaDiff, examples: r.sample, unitsOnField: r.maxUnits };
    runs.push(row); console.log(`${style} ${name} ${speed}x: unit-frames without a tile ${row.unitFramesWithNoTile}; frames with a gap ${row.framesWithAGap}/${FR} (${row.shareFramesWithGap}%); episodes ${row.episodes} (${row.episodesPerSec}/s) median ${row.medianFrames} p95 ${row.p95Frames} max ${row.maxFrames} frames; most units at once ${row.maxUnitsAtOnce}; visibleAt disagreements ${row.visibleAtDisagreesWithMyRule}`);
  }
  writeJson('x-v3b-gaps-' + (args.tag || 'a') + '.json', { generated: new Date().toISOString(), runs, errors: s.errors });
} finally { await s.close(); srv.close(); }
