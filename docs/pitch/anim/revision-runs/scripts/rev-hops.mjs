// rev-hops.mjs (revision) - what causes the hops of the strict-glide experiment?  Deterministic 60 Hz, 20 s, popups off; sums the display layer's own counters per second.
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';
const PORT = +(args.port || 9770); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'hops' });
const rows = [];
try {
  for (const cfg of [{ tag: 'strict', set: { 'motion.mode': 'strict' } }, { tag: 'strict-d0', set: { 'motion.mode': 'strict', 'layout.dMaxPx': 0 } }, { tag: 'dynamics', set: {} }]) for (const name of ['the-angle', 'rose-woods']) for (const speed of [1, 4]) {
    const r = await s.page.evaluate(({ sc, speed, set }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle('war-room', 'standard'); E.tuning.set('layout.dMaxPx', 48); E.tuning.set('motion.mode', 'dynamics'); for (const [k, v] of Object.entries(set)) E.tuning.set(k, v);
      E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true });
      for (let i = 0; i < 260; i++) S.step(1); E.transport.setSpeed(speed); E.transport.play(); for (let i = 0; i < 40; i++) S.step(1);
      const sum = { births: 0, deaths: 0, hops: 0, netHops: 0, anchorFixes: 0, travels: 0, netDims: 0, handoffs: 0 }; let agg = 0; let leaf = 0; const N = 1200; let tilesMean = 0;
      for (let i = 0; i < N; i++) { const f = S.step(1); for (const k of Object.keys(sum)) sum[k] += (f.stats && f.stats[k]) || 0; tilesMean += f.tiles.length; }
      return { sum, N, tilesMean: tilesMean / N };
    }, { sc: SCENES[name], speed, set: cfg.set });
    const per = {}; for (const k of Object.keys(r.sum)) per[k] = +(r.sum[k] / (r.N / 60)).toFixed(2);
    const row = { cfg: cfg.tag, scene: name, speed, perSec: per, tilesMean: Math.round(r.tilesMean) }; rows.push(row); console.log(JSON.stringify(row));
  }
  writeJson('rev-hops.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
