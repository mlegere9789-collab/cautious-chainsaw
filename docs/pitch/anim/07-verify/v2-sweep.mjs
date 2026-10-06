// v2-sweep.mjs - settled-frame sweep on PAINTED ink (witness + recorder), default page configuration (popups ON, solve cadence auto), every style and variant, a ladder of zooms, ticks chosen here
// (not the prototype's list: day boundaries, the densest ticks by my own count of the source data, and seeded random ticks that fall BETWEEN keyframes).
//   node v2-sweep.mjs [--viewport=1440x900] [--dpr=1] [--styles=war-room,field-manual,map-1863] [--variants=standard,cvd,contrast] [--zooms=...] [--centre=dense|field|random] [--tag=a] [--seed=7]
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, PROTO, args, writeJson, sleep } from './lib.mjs';
import { loadKeyframes, firstTicks, keyframeTicks, rng } from './srcdata.mjs';

const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const PORT = +(args.port || 9700); const TAG = args.tag || 'a';
const STYLES = (args.styles || 'war-room,field-manual,map-1863').split(','); const VARIANTS = (args.variants || 'standard,cvd,contrast').split(',');
const ZOOMS = (args.zooms || (VW < 760 ? '11,12,13,14,15,16,17' : '11,12,13,13.5,14,15,16,17,18')).split(',').map(Number); const CENTRE = args.centre || 'dense'; const SEED = +(args.seed || 7);
const kf = loadKeyframes(); const first = firstTicks(kf.units); const byTick = keyframeTicks(kf.units);
const dens = [...byTick.entries()].sort((a, b) => b[1].length - a[1].length).map((e) => e[0]);
const R = rng(SEED); const rnd = []; while (rnd.length < 3) { const t = 1 + Math.floor(R() * 675); if (!byTick.has(t)) rnd.push(t); }
const TICKS = (args.ticks ? args.ticks.split(',').map(Number) : [...new Set([1, 120, 226, 293, 346, 400, 451, 538, 556, 620, 675, ...rnd, dens[3]])].sort((a, b) => a - b));
console.log('ticks', TICKS.join(','), 'zooms', ZOOMS.join(','), 'styles', STYLES.join(','), 'variants', VARIANTS.join(','), 'viewport', VW, VH, DPR);
const srv = await serve(PROTO, PORT);
const s = await launch({ w: VW, h: VH, dpr: DPR, port: PORT, mobile: VW < 760, query: 'welcome=0&manual=1', witness: true, profile: 'sweep-' + TAG });
const rows = []; const t0 = Date.now();
const DOM = ['#topbar > *', '#dock', '#panel:not(.hidden)', '#metrics:not(.hidden)', '#narration:not(.hidden)', '.cmpbadge:not(.off)', '#popups .pc'];
await s.page.evaluate(({ first, dom }) => { const R = window.__rec; R.keep = true; R.full = false; R.install({ firstTick: first, dom, keepViol: 40 }); }, { first, dom: DOM });
const worst = { ssCC: 0, ssAny: 0, sdAny: 0, ddAny: 0, noInk: 0, inkOutside: 0, unexplainedPx: 0, missing: 0, early: 0, minGapCC: Infinity, maxExcess: 0 };
try {
  for (const style of STYLES) for (const variant of VARIANTS) {
    await s.page.evaluate(([st, v]) => window.__studio.ui.chooseStyle(st, v), [style, variant]);
    for (const zoom of ZOOMS) for (const tick of TICKS) {
      const r = await s.page.evaluate(({ zoom, tick, centre, seed }) => {
        const S = window.__studio; const E = S.engine; const R = window.__rec; E.select(null); E.transport.pause(); R.frames.length = 0;
        E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
        const settle = (max) => { let n = 0; let still = 0; let last = -1; for (; n < max; n++) { const f = S.step(1); const live = f.tiles.length; if (!E.busy() && live === last) { if (++still >= 4) break; } else still = 0; last = live; } return n; };
        let n = settle(300);
        if (zoom >= 13 && centre !== 'field') {
          const f = E.frame; const live = f.tiles.filter((t) => t.life === 'live'); let best = null; let bc = -1; const Rr = 90;
          if (centre === 'random') { best = live[Math.floor(((Math.sin(seed * 9301 + tick * 49297 + zoom * 233) * 43758.5453) % 1 + 1) % 1 * live.length)]; }
          else for (const a of live) { let c = 0; for (const b of live) if (Math.abs(a.ax - b.ax) < Rr && Math.abs(a.ay - b.ay) < Rr) c++; if (c > bc) { bc = c; best = a; } }
          if (best) { const ll = E.camera.fromScreen(best.x + f.view.dx, best.y + f.view.dy); E.moveTo({ lat: ll[1], lng: ll[0], zoom: E.camera.zoom }, { glide: false, safe: false }); n += settle(300); }
        }
        const fr = R.last; const px = R.pixelCheck(); const during = R.frames.slice();
        const sumDur = (k) => during.reduce((a, q) => a + q[k].cc + q[k].lc + q[k].lp + q[k].cp + q[k].ll, 0);
        const framesBad = during.filter((q) => (q.ss.cc + q.ss.lc + q.ss.lp + q.ss.cp + q.ss.ll + q.sd.cc + q.sd.lc + q.sd.lp + q.sd.cp + q.sd.ll) > 0).length;
        const out = { settleFrames: n, zoom: E.camera.zoom, tiles: fr.tiles, chips: fr.chips, solidChips: fr.solidChips, labels: fr.labels, pins: fr.pins, ss: fr.ss, sd: fr.sd, dd: fr.dd, minGapCC: fr.minGapCC, noInk: fr.noInk, inkOutside: fr.inkOutside, maxExcess: fr.maxExcess, stray: fr.stray, missing: fr.missing, early: fr.early, maxEarly: fr.maxEarly, phantom: fr.phantom, dom: fr.domHit, engineOverlaps: fr.engineOverlaps,
          px: { diff: px.diffPixels, unexplained: px.unexplained, bbox: px.bbox }, frames: during.length, framesBad, ssDuring: sumDur('ss'), sdDuring: sumDur('sd'), ddDuring: sumDur('dd'), maxMsg: R.errors.length };
        R.frames.length = 0; return out;
      }, { zoom, tick, centre: CENTRE, seed: SEED });
      const row = { style, variant, tick, zoomAsked: zoom, ...r }; rows.push(row);
      const allSS = r.ss.cc + r.ss.lc + r.ss.lp + r.ss.cp + r.ss.ll; const allSD = r.sd.cc + r.sd.lc + r.sd.lp + r.sd.cp + r.sd.ll; const allDD = r.dd.cc + r.dd.lc + r.dd.lp + r.dd.cp + r.dd.ll;
      worst.ssCC = Math.max(worst.ssCC, r.ss.cc); worst.ssAny = Math.max(worst.ssAny, allSS); worst.sdAny = Math.max(worst.sdAny, allSD); worst.ddAny = Math.max(worst.ddAny, allDD); worst.noInk = Math.max(worst.noInk, r.noInk); worst.inkOutside = Math.max(worst.inkOutside, r.inkOutside);
      worst.unexplainedPx = Math.max(worst.unexplainedPx, r.px.unexplained); worst.missing = Math.max(worst.missing, r.missing); worst.early = Math.max(worst.early, r.early); worst.maxExcess = Math.max(worst.maxExcess, r.maxExcess); if (r.minGapCC !== null) worst.minGapCC = Math.min(worst.minGapCC, r.minGapCC);
    }
    console.log(style, variant, 'done', rows.length, 'samples,', ((Date.now() - t0) / 1000).toFixed(0), 's; worst', JSON.stringify(worst));
  }
  const pageErr = await s.page.evaluate(() => ({ errors: window.__rec.errors, viol: window.__rec.viol.slice(0, 12) }));
  const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, centre: CENTRE, ua: await s.page.evaluate(() => navigator.userAgent), ticks: TICKS, zooms: ZOOMS, styles: STYLES, variants: VARIANTS, samples: rows.length, seconds: +((Date.now() - t0) / 1000).toFixed(0), worst, consoleErrors: s.errors, requests: s.requests, recorderErrors: pageErr.errors, firstViolations: pageErr.viol, rows };
  const file = `v2-sweep-${VW}x${VH}-${CENTRE}-${TAG}.json`; writeJson(file, out); console.log('wrote', file, 'samples', rows.length, 'worst', JSON.stringify(worst), 'console errors', s.errors.length, 'requests', s.requests.length);
} finally { await s.close(); srv.close(); }
