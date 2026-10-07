// test/verify-sweep.mjs - the zero-overlap sweep in REAL CHROME on the assembled page: every style, a ladder of zooms, a spread of ticks (the three hotspots, the densest tick, the three days).  At each
// sample the page is driven to a settled frame (?manual=1: only studio.step advances it) and the frame the page DREW is checked by a brute-force routine in this file that shares no code with the engine:
//   VITAL CORE of a tile = its chip box (short name, side, arm, strength gauge, aggregate count: everything the skin paints for the tile lives inside it) + the pin on its true position when displaced.
//   core overlap     two solid tiles (opacity >= 0.5) of different identity whose chip boxes overlap (strictly; touching is allowed, the design clearance is 2 px)
//   pin covered      a chip box lying on another tile's pin box
//   label overlap    a name label (secondary) lying on another tile's chip, pin or label
//   unrepresented    a unit on the field that no live tile stands for (a tile or an aggregate that lists it)
//   node verify-sweep.mjs [--viewport=1440x900] [--dpr=1] [--styles=war-room,field-manual,map-1863] [--zooms=11,12,13,13.5,14,15,16,17,18] [--ticks=...] [--out=results/assemble-sweep-1440x900.json]
import fs from 'node:fs';
import path from 'node:path';
import { launch, PROTO, args } from './assemble-lib.mjs';

const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1);
const STYLES = (args.styles || 'war-room,field-manual,map-1863').split(','); const ZOOMS = (args.zooms || '11,12,13,13.5,14,15,16,17,18').split(',').map(Number);
const TICKS = (args.ticks || '1,28,64,120,226,293,346,451,538,551,556,600,620,675').split(',').map(Number);
const OUT = path.resolve(args.out || path.join(PROTO, 'results', `assemble-sweep-${VW}x${VH}.json`));
const s = await launch({ w: VW, h: VH, dpr: DPR, port: args.port ? +args.port : 9710, mobile: VW < 760, query: 'welcome=0&manual=1' });
const t0 = Date.now(); const rows = []; const worst = { coreOverlaps: 0, pinCovered: 0, labelOverlaps: 0, unrepresented: 0, minCoreClearance: Infinity };
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); S.engine.tuning.set('layout.solveEvery', '1'); });
  for (const style of STYLES) {
    await s.page.evaluate((st) => window.__studio.ui.chooseStyle(st, 'standard'), style);
    for (const zoom of ZOOMS) for (const tick of TICKS) {
      const r = await s.page.evaluate(({ zoom, tick }) => {
        const S = window.__studio; const E = S.engine; E.select(null); E.transport.pause();
        E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
        const settle = (max) => { let n = 0; for (; n < max; n++) { const f = S.step(1); if (n > 6 && f.tiles.every((t) => t.life === 'live' && t.opacity > 0.999 && !t.travelling && !t.entering) && !E.busy()) break; } return n; };
        let n = settle(160);
        if (zoom >= 14) {                                                           // centre on the densest part of the field at this tick, then settle again
          const f = E.frame; const live = f.tiles.filter((t) => t.life === 'live'); let best = null; let bc = -1; const R = 90;
          for (const a of live) { let c = 0; for (const b of live) if (Math.abs(a.ax - b.ax) < R && Math.abs(a.ay - b.ay) < R) c++; if (c > bc) { bc = c; best = a; } }
          if (best) { const ll = E.camera.fromScreen(best.x + f.view.dx, best.y + f.view.dy); E.moveTo({ lat: ll[1], lng: ll[0], zoom: E.camera.zoom }, { glide: false, safe: false }); n += settle(160); }
        }
        const f = E.frame; const W = f.view.w; const H = f.view.h;
        const solid = f.tiles.filter((t) => t.opacity >= 0.5); const ph = f.spec.pinHalf;
        const chips = solid.map((t) => ({ k: t.key, x0: t.x - t.w * t.scale / 2, x1: t.x + t.w * t.scale / 2, y0: t.y - t.h * t.scale / 2, y1: t.y + t.h * t.scale / 2 }));
        const pins = solid.filter((t) => t.displaced).map((t) => ({ k: t.key, x0: t.ax - ph, x1: t.ax + ph, y0: t.ay - ph, y1: t.ay + ph }));
        const labels = solid.filter((t) => t.label && t.label.opacity >= 0.5).map((t) => ({ k: t.key, x0: t.label.x0, x1: t.label.x1, y0: t.label.y0, y1: t.label.y1 }));
        const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        let coreOverlaps = 0; let pinCovered = 0; let labelOverlaps = 0; let minClear = Infinity; const ex = [];
        for (let i = 0; i < chips.length; i++) {
          for (let j = i + 1; j < chips.length; j++) {
            const a = chips[i]; const b = chips[j]; const g = Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
            if (g < minClear) minClear = g; if (hit(a, b)) { coreOverlaps++; if (ex.length < 3) ex.push(`${a.k} x ${b.k}`); }
          }
          for (const p of pins) if (p.k !== chips[i].k && hit(chips[i], p)) pinCovered++;
          for (const l of labels) if (l.k !== chips[i].k && hit(chips[i], l)) labelOverlaps++;
        }
        for (let i = 0; i < labels.length; i++) { for (let j = i + 1; j < labels.length; j++) if (hit(labels[i], labels[j])) labelOverlaps++; for (const p of pins) if (p.k !== labels[i].k && hit(labels[i], p)) labelOverlaps++; }
        const onField = new Set(E.battle.visibleAt(f.tau).map((e) => e.u.id)); const have = new Set(); for (const t of f.tiles) if (t.life === 'live') for (const id of t.ids) have.add(id); let unrepresented = 0; for (const id of onField) if (!have.has(id)) unrepresented++;
        const inView = chips.filter((c) => c.x1 > 0 && c.x0 < W && c.y1 > 0 && c.y0 < H).length; const agg = solid.filter((t) => t.kind === 'agg').length;
        return { settle: n, tiles: solid.length, inView, agg, units: onField.size, coreOverlaps, pinCovered, labelOverlaps, unrepresented, minClear: Number.isFinite(minClear) ? +minClear.toFixed(2) : null, engineOverlaps: f.overlaps, ex };
      }, { zoom, tick });
      rows.push({ style, zoom, tick, ...r });
      for (const k of ['coreOverlaps', 'pinCovered', 'labelOverlaps', 'unrepresented']) worst[k] = Math.max(worst[k], r[k]); if (r.minClear !== null) worst.minCoreClearance = Math.min(worst.minCoreClearance, r.minClear);
    }
    console.log(style, 'done', rows.length, 'samples so far; worst', JSON.stringify(worst));
  }
  const engineTotals = await s.page.evaluate(() => { const m = window.__studio.engine.metricsOf('after').summary(); return { frames: m.frames, overlapFrames: m.overlapFrames, overlapPairs: m.overlapPairs, unrepresentedUnitFrames: m.unrepresentedUnitFrames, clearanceViolations: m.clearanceViolations }; });
  const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, ua: await s.page.evaluate(() => navigator.userAgent), textWidths: await s.page.evaluate(() => window.__studio.engine.text.source), styles: STYLES, zooms: ZOOMS, ticks: TICKS, samples: rows.length, seconds: +((Date.now() - t0) / 1000).toFixed(1), worst, engineTotals, errors: s.errors, requests: s.requests, rows };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out));
  const bad = rows.filter((r) => r.coreOverlaps || r.pinCovered || r.labelOverlaps || r.unrepresented || r.engineOverlaps);
  console.log(JSON.stringify({ samples: rows.length, seconds: out.seconds, worst, engineTotals, errors: s.errors.length, requests: s.requests.length, badSamples: bad.length }));
  if (bad.length) { console.error('FAILED samples:', JSON.stringify(bad.slice(0, 5))); process.exitCode = 1; }
} finally { await s.close(); }
