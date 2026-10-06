// v4-motion.mjs - frame intervals and displacement per frame, Studio ("after") against the production-style baseline ("before"), real Chrome, real time, no witness (no per-call hooks: the only
// instrumentation is one wrapper of renderer.draw that reads the tile list and one requestAnimationFrame loop that stamps the display cadence).
//   rAF cadence  : timestamps of MY OWN rAF loop (every display frame, whether or not the page drew), intervals, share over 20 / 33.4 / 50 ms
//   page draws   : number of draws and their intervals (the page draws only when it needs to)
//   displacement : per tile per drawn frame, the map-fixed step in px (tile.x/tile.y: the camera is still), steps >= 3 / 8 / 20 px, SUDDEN steps (>= 8 px and >= 3x the same tile's previous step),
//                  of which SOLID (both frames >= 0.5 opacity), speed changes > 4 px between consecutive frames, opacity flashes, size jumps, label toggles, tiles that vanish and return within 3 frames
//   node v4-motion.mjs [--scenes=...] [--speeds=1,4] [--secs=20] [--modes=after,before] [--cpu=1] [--reduced=0] [--viewport=1440x900] [--tag=a]
import { serve, launch, PROTO, args, writeJson, sleep } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const PORT = +(args.port || 9707); const SECS = +(args.secs || 20); const CPU = +(args.cpu || 1); const REDUCED = args.reduced === '1';
const names = (args.scenes || 'cemetery-hill,rose-woods,the-angle,field,default').split(','); const speeds = (args.speeds || '1,4').split(',').map(Number); const modes = (args.modes || 'after,before').split(','); const popups = args.popups !== '0';
const srv = await serve(PROTO, PORT);
const s = await launch({ w: VW, h: VH, dpr: DPR, port: PORT, mobile: VW < 760, cpu: CPU, query: 'welcome=0', reducedMotion: REDUCED ? 'reduce' : 'no-preference', profile: 'motion' });
const pct = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1)))]; };
const runs = [];
try {
  await s.page.evaluate(({ popups, style, variant }) => { const S = window.__studio; if (style) S.ui.chooseStyle(style, variant); S.engine.tuning.set('popup.enabled', popups); window.__ts = []; const loop = (t) => { window.__ts.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }, { popups, style: args.style || null, variant: args.variant || 'standard' });
  for (const name of names) for (const mode of modes) for (const speed of speeds) {
    const sc = SCENES[name]; if (!sc) throw new Error('unknown scene ' + name);
    await s.page.evaluate(({ sc, mode, speed }) => { const S = window.__studio; const E = S.engine; const R = window.__rec; R.motionUninstall && R.motionUninstall(); E.transport.pause(); E.select(null); S.host.dismissAll && S.host.dismissAll(); E.tuning.set('compare.mode', mode); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); E.transport.setSpeed(speed); }, { sc, mode, speed });
    await sleep(3500);
    const res = await s.page.evaluate(async ({ secs }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; R.motionInstall({}); window.__ts.length = 0; const t0 = performance.now(); const tick0 = E.transport.simTau; const ms0 = E.metricsOf(E.compare).summary ? null : null;
      E.transport.play(); await new Promise((r) => setTimeout(r, secs * 1000)); E.transport.pause(); const t1 = performance.now(); const M = R.motion; R.motionUninstall();
      return { wall: t1 - t0, tick0, tick1: E.transport.simTau, ts: window.__ts.slice(), drawTs: M.ts.slice(), st: M.st, hist: M.hist, big: M.big, perFrameMax: M.perFrameMax, perFrameSudden: M.perFrameSudden, frames: M.frames, tilesLast: E.frame ? E.frame.tiles.length : 0 };
    }, { secs: SECS });
    const iv = (ts) => { const a = []; for (let i = 1; i < ts.length; i++) a.push(ts[i] - ts[i - 1]); return a; }; const rf = iv(res.ts); const dr = iv(res.drawTs);
    const secs = res.wall / 1000; const st = res.st;
    const runInfo = { style: args.style || 'default', scene: name, mode, speed, secs: SECS, cpu: CPU, reduced: REDUCED, viewport: [VW, VH], popups, tick0: +res.tick0.toFixed(1), tick1: +res.tick1.toFixed(1),
      raf: { frames: rf.length + 1, fps: +((rf.length + 1) / secs).toFixed(1), p50: pct(rf, 0.5), p95: pct(rf, 0.95), p99: pct(rf, 0.99), max: Math.max(...rf), over20: +(100 * rf.filter((x) => x > 20).length / rf.length).toFixed(2), over33: +(100 * rf.filter((x) => x > 33.4).length / rf.length).toFixed(2), over50: rf.filter((x) => x > 50).length },
      draws: { frames: res.frames, p50: pct(dr, 0.5), p95: pct(dr, 0.95), max: dr.length ? Math.max(...dr) : null },
      motion: { tileFrames: st.tileFrames, tilesPerFrame: +(st.tileFrames / Math.max(1, res.frames)).toFixed(1), stepsOver3PerSec: +(st.over3 / secs).toFixed(2), stepsOver8PerSec: +(st.over8 / secs).toFixed(2), stepsOver20PerSec: +(st.over20 / secs).toFixed(2), suddenPerSec: +(st.sudden / secs).toFixed(2), suddenSolidPerSec: +(st.suddenSolid / secs).toFixed(2), jerk4PerSec: +(st.jerk4 / secs).toFixed(2), flashesPerSec: +(st.flashes / secs).toFixed(2), sizeJumpsPerSec: +(st.sizeJumps / secs).toFixed(2), labelTogglesPerSec: +(st.labelToggles / secs).toFixed(2), appearPerSec: +(st.appear / secs).toFixed(2), vanishPerSec: +(st.vanish / secs).toFixed(2), blinksPerSec: +(st.blinks / secs).toFixed(2), maxStepPx: Math.max(...res.perFrameMax), p99StepPx: pct(res.perFrameMax, 0.99), framesWithSudden: res.perFrameSudden.filter((x) => x > 0).length, stillShare: +(100 * st.still / Math.max(1, st.n)).toFixed(1) },
      bigSteps: res.big.slice(0, 12) };
    runs.push(runInfo);
    console.log(`${name} ${mode} ${speed}x: raf ${runInfo.raf.fps} fps p95 ${runInfo.raf.p95?.toFixed(1)} max ${runInfo.raf.max.toFixed(1)} over20 ${runInfo.raf.over20}% over50 ${runInfo.raf.over50} | draws ${res.frames} | tiles/frame ${runInfo.motion.tilesPerFrame} | steps>8 ${runInfo.motion.stepsOver8PerSec}/s sudden ${runInfo.motion.suddenPerSec}/s (solid ${runInfo.motion.suddenSolidPerSec}) max ${runInfo.motion.maxStepPx}px flashes ${runInfo.motion.flashesPerSec}/s labelToggles ${runInfo.motion.labelTogglesPerSec}/s blinks ${runInfo.motion.blinksPerSec}/s`);
  }
  const file = `v4-motion-${VW}x${VH}-cpu${CPU}${REDUCED ? '-reduced' : ''}-${args.tag || 'a'}.json`; writeJson(file, { generated: new Date().toISOString(), ua: await s.page.evaluate(() => navigator.userAgent), runs, consoleErrors: s.errors, requests: s.requests }); console.log('wrote', file);
} finally { await s.close(); srv.close(); }
