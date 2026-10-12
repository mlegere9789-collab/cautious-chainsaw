// tools/sweep.mjs - the zero-overlap sweep in REAL CHROME on the built page (the engine's own check, applied to this skin): a ladder of zooms x a spread of ticks (the three hotspots, the densest tick,
// the three days), both grounds, desktop and phone, with and without a selected mark.  At each sample the page is driven to a settled frame and the frame the page DREW is checked by tools/check.mjs
// (a brute-force routine that shares no code with the engine's layout or verifier): core overlaps, pins covered, unrepresented units.  Also the engine's own verifier counters over every frame stepped.
//   node tools/sweep.mjs [--viewport=1440x900] [--dpr=1] [--styles=night,day] [--zooms=...] [--ticks=...] [--select=1] [--out=results/sweep-1440x900.json] [--port=10023]
import fs from 'node:fs';
import path from 'node:path';
import { open, args, D1, stopServer } from './lib.mjs';
import { CHECK_JS } from './check.mjs';

const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const PORT = +(args.port || 10023);
const STYLES = (args.styles || 'night,day').split(','); const ZOOMS = (args.zooms || (VW < 700 ? '11,12,13,14,14.5,15,16,17' : '11,12,13,13.5,14,15,16,17,18')).split(',').map(Number);
const TICKS = (args.ticks || '1,28,64,120,226,293,346,451,538,551,556,600,620,675').split(',').map(Number); const SELECT = !!args.select;
const OUT = path.resolve(args.out || path.join(D1, 'results', `sweep-${VW}x${VH}${SELECT ? '-selected' : ''}.json`));
const s = await open({ w: VW, h: VH, dpr: DPR, port: PORT, mobile: VW < 700, profile: 'sweep' + VW + (SELECT ? 's' : '') + (args.tag || ''), query: args.query || '' });
const t0 = Date.now(); const rows = []; const worst = { coreOverlaps: 0, pinCovered: 0, unrepresented: 0, engineOverlaps: 0, minClear: Infinity };
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); S.engine.tuning.set('layout.solveEvery', '1'); let T = 5000; window.__skinKit.setClock({ now: () => T }); globalThis.__adv = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { T += dt; S.step(1, dt); } }; });
  await s.page.evaluate(() => document.fonts.ready); await s.page.waitForFunction(() => globalThis.__fontsReady === true, null, { timeout: 20000 }).catch(() => {});
  for (const style of STYLES) {
    await s.page.evaluate((st) => window.__studio.ui.chooseStyle(st, 'standard'), style);
    for (const zoom of ZOOMS) for (const tick of TICKS) {
      const r = await s.page.evaluate(({ zoom, tick, select }) => {
        const S = window.__studio; const E = S.engine; E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
        const settle = (max) => { let n = 0; for (; n < max; n++) { globalThis.__adv(1); const f = E.frame; if (n > 6 && f.tiles.every((t) => t.life === 'live' && t.opacity > 0.999 && !t.travelling && !t.entering) && !E.busy()) break; } return n; };
        const st = []; const cap = []; let n = settle(160); st.push(n); cap.push(160);
        if (zoom >= 13.5) {                                                               // centre on the densest part of the field at this tick, then settle again
          const f = E.frame; const live = f.tiles.filter((t) => t.life === 'live'); let best = null; let bc = -1; const R = 90;
          for (const a of live) { let c = 0; for (const b of live) if (Math.abs(a.ax - b.ax) < R && Math.abs(a.ay - b.ay) < R) c++; if (c > bc) { bc = c; best = a; } }
          if (best) { const ll = E.camera.fromScreen(best.x + f.view.dx, best.y + f.view.dy); E.moveTo({ lat: ll[1], lng: ll[0], zoom: E.camera.zoom }, { glide: false, safe: false }); const m = settle(160); st.push(m); cap.push(160); n += m; }
        }
        if (select) { const f = E.frame; const c = f.tiles.filter((t) => t.kind === 'leaf' && t.solid).sort((a, b) => Math.hypot(a.x + f.view.dx - f.view.w / 2, a.y + f.view.dy - f.view.h / 2) - Math.hypot(b.x + f.view.dx - f.view.w / 2, b.y + f.view.dy - f.view.h / 2))[0]; if (c) { E.select(c.ids[0]); const m = settle(200); st.push(m); cap.push(200); n += m; } }
        return { settle: n, stages: st, capped: st.some((v, i) => v >= cap[i]), selectSettle: select && st.length === (zoom >= 13.5 ? 3 : 2) ? st[st.length - 1] : null };
      }, { zoom, tick, select: SELECT });
      const chk = await s.page.evaluate(CHECK_JS); rows.push({ style, zoom, tick, ...r, ...chk });
      for (const k of ['coreOverlaps', 'pinCovered', 'unrepresented', 'engineOverlaps']) worst[k] = Math.max(worst[k], chk[k] || 0); if (chk.minClear !== null) worst.minClear = Math.min(worst.minClear, chk.minClear);
    }
    console.log(style, 'done', rows.length, 'samples so far; worst', JSON.stringify(worst));
  }
  const engineTotals = await s.page.evaluate(() => { const m = window.__studio.engine.metricsOf('after').summary(); return { frames: m.frames, overlapFrames: m.overlapFrames, overlapPairs: m.overlapPairs, unrepresentedUnitFrames: m.unrepresentedUnitFrames, clearanceViolations: m.clearanceViolations }; });
  const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, selected: SELECT, ua: await s.page.evaluate(() => navigator.userAgent), textWidths: await s.page.evaluate(() => window.__studio.engine.text.source), styles: STYLES, zooms: ZOOMS, ticks: TICKS, samples: rows.length, seconds: +((Date.now() - t0) / 1000).toFixed(1), worst, engineTotals, errors: s.errors.filter((e) => !/404/.test(e)), requests: s.requests, rows };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out));
  const bad = rows.filter((r) => r.coreOverlaps || r.pinCovered || r.unrepresented || r.engineOverlaps);
  console.log(JSON.stringify({ samples: rows.length, seconds: out.seconds, worst, engineTotals, errors: out.errors.length, requests: s.requests.length, badSamples: bad.length }));
  if (bad.length) { console.error('FAILED samples:', JSON.stringify(bad.slice(0, 5))); process.exitCode = 1; }
} finally { await s.close(); await stopServer(); }
