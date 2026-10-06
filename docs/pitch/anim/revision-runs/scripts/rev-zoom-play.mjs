// rev-zoom-play.mjs (revision, review fix 6) - the independent instrument (witness + recorder, painted ink, real time) during a CAMERA ZOOM, which no earlier check measured with it.
// Paused battle at tick 551, popups off; the camera zooms about the middle of the screen over about 1.5 s (zoom 13.5 -> 15.5, zoom 15.5 -> 13.5); every frame the page really draws is analysed.
//   node rev-zoom-play.mjs [--port=..] [--cfgs=default,strict,strict-d0,snap]
import { serve, launch, PROTO, args, writeJson, sleep } from './lib.mjs';
import { loadKeyframes, firstTicks } from './srcdata.mjs';
const PORT = +(args.port || 9778); const first = firstTicks(loadKeyframes().units);
const DOM = ['#topbar > *', '#dock', '#panel:not(.hidden)', '#metrics:not(.hidden)', '#narration:not(.hidden)', '.cmpbadge:not(.off)', '#popups .pc'];
const CFG = { default: {}, strict: { 'motion.mode': 'strict' }, 'strict-d0': { 'motion.mode': 'strict', 'layout.dMaxPx': 0 }, snap: { 'motion.mode': 'snap' }, 'dmax0': { 'layout.dMaxPx': 0 } };
const names = (args.cfgs || 'default,strict,strict-d0,snap').split(',');
const srv = await serve(PROTO, PORT); const rows = [];
try {
  for (const name of names) for (const [label, z0, z1] of [['zoom in 13.5 to 15.5', 13.5, 15.5], ['zoom out 15.5 to 13.5', 15.5, 13.5]]) {
    const s = await launch({ port: PORT, query: 'welcome=0', witness: true, profile: 'zplay' });
    try {
      await s.page.evaluate(({ first, dom, set }) => { const S = window.__studio; const R = window.__rec; R.keep = true; R.full = false; R.install({ firstTick: first, dom, keepViol: 10 }); S.ui.chooseStyle('war-room', 'standard'); const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('layout.dMaxPx', 48); for (const [k, v] of Object.entries(set)) E.tuning.set(k, v); }, { first, dom: DOM, set: CFG[name] });
      await s.page.evaluate(({ z0 }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.select(null); E.transport.seek(551, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom: z0 }, { glide: false, safe: false }); }, { z0 });
      await sleep(3500);
      const res = await s.page.evaluate(async ({ z1 }) => {
        const S = window.__studio; const E = S.engine; const R = window.__rec; R.frames.length = 0; R.viol.length = 0; R.errors.length = 0; R.runs.length = 0; R.unitRun = new Map();
        E.zoomTo(z1, { at: [720, 450], glide: true }); await new Promise((r) => setTimeout(r, 2200));
        return { frames: R.frames.map((q) => ({ t: q.t, tiles: q.tiles, ss: q.ss, sd: q.sd, missing: q.missing, noInk: q.noInk })), zoom: E.camera.zoom };
      }, { z1 });
      const sum = (o) => o.cc + o.lc + o.lp + o.cp + o.ll; const F = res.frames;
      // only frames while the camera was moving: drop the settled tail (tile count constant and nothing overlapping for 20 frames) - here: keep all frames and report the first 90
      const W = F.slice(0, 90);
      const row = { cfg: name, move: label, frames: W.length, framesSolidSolid: W.filter((q) => sum(q.ss) > 0).length, framesFaintOverSolid: W.filter((q) => sum(q.sd) > 0).length, framesUnitWithoutLiveTile: W.filter((q) => q.missing > 0).length, maxUnitsWithoutLiveTile: Math.max(0, ...W.map((q) => q.missing)), tilesMin: Math.min(...W.map((q) => q.tiles)), tilesMax: Math.max(...W.map((q) => q.tiles)), finalZoom: +res.zoom.toFixed(2) };
      rows.push(row); console.log(JSON.stringify(row));
    } finally { await s.close(); }
  }
  writeJson('rev-zoom-play.json', { generated: new Date().toISOString(), rows });
} finally { srv.close(); }
