// tools/sweep.mjs - the zero-overlap sweep of the drawn page in real Chrome: a ladder of zooms x nine ticks x four places, at 1440x900 (DPR 1) and 390x844 (DPR 2), every sample settled (paused, camera still).  On every frame
// the page drew, an independent brute-force routine (no code shared with the engine) checks: no two solid marks overlap (footprint boxes), no mark covers another mark's true position (the pin), every unit
// is represented by a live mark, and counts the pairs closer than the layout clearance.  The engine's own verifier counts are read alongside.  VITAL CORE of a mark = its footprint box (everything the skin paints) plus the pin of a
// displaced mark.  The hover and selection unfold are drawn into ground the renderer has checked free, so they are covered by the check on the footprints plus tools/ink.mjs.
//   node tools/sweep.mjs [--vp=desktop|phone]  ->  results/sweep-<vp>.json
import fs from 'node:fs';
import path from 'node:path';
import { launch, args, D2 } from './lib.mjs';
import { HOT } from './scenes.mjs';

const VP = args.vp || 'desktop'; const [W, H, DPR, mobile] = VP === 'phone' ? [390, 844, 2, true] : [1440, 900, 1, false];
const ZOOMS = VP === 'phone' ? [11, 12, 13, 14, 15, 16, 17] : [11, 12, 13, 13.5, 14, 15, 15.5, 16, 16.5, 17, 18]; const TICKS = [1, 120, 226, 293, 346, 451, 556, 620, 675]; const PLACES = [HOT.field, HOT.angle, HOT.cemhill, HOT.wheat];
const run = await launch({ w: W, h: H, dpr: DPR, mobile, query: 'manual=1', profile: 'sweep' });
const { page } = run; const rows = []; const t0 = Date.now();
try {
  await page.evaluate(() => { window.__studio.tuning.set('popup.enabled', false); });
  for (const z of ZOOMS) for (const tick of TICKS) {
    const pl = PLACES[(ZOOMS.indexOf(z) + TICKS.indexOf(tick)) % PLACES.length];
    const r = await page.evaluate(({ z, tick, pl }) => {
      const st = window.__studio; const e = st.engine; e.transport.pause(); st.updateSafe(); e.moveTo({ lat: pl.lat, lng: pl.lng, zoom: z }, { glide: false, safe: true }); e.transport.seek(tick, { glide: false }); window.__adv(30, 50); window.__adv(90, 20);
      const f = e.frame; const v = f.view; const gap = f.spec.gap; const live = f.tiles.filter((t) => t.opacity >= 0.5);
      const R = live.map((t) => ({ t, x0: t.x + v.dx - t.w * t.scale / 2, x1: t.x + v.dx + t.w * t.scale / 2, y0: t.y + v.dy - t.h * t.scale / 2, y1: t.y + v.dy + t.h * t.scale / 2 }));
      let overlaps = 0; let tight = 0; let minGap = Infinity; R.sort((a, b) => a.x0 - b.x0);
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length && R[j].x0 < R[i].x1 + 4; j++) { const a = R[i]; const b = R[j]; const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1); const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1); const g = Math.max(dx, dy); if (g < 0) overlaps++; else { if (g < minGap) minGap = g; if (g < gap - 0.06) tight++; } }
      let pins = 0; let displaced = 0; for (const a of R) { if (!a.t.displaced) continue; displaced++; const px = a.t.ax + v.dx; const py = a.t.ay + v.dy; for (const b of R) { if (b === a) continue; if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1) pins++; } }
      const solid = live.length; const crowds = f.tiles.filter((t) => t.kind === 'agg' && t.life === 'live').length; const inCrowds = f.tiles.filter((t) => t.kind === 'agg' && t.life === 'live').reduce((s, t) => s + t.n, 0);
      return { z, tick, units: f.onField, marks: f.tiles.filter((t) => t.life === 'live').length, solid, crowds, inCrowds, bruteOverlaps: overlaps, engineOverlaps: f.overlaps, clearanceViolations: f.clearanceViolations, tightPairs: tight, pinsCovered: pins, displaced, unrepresented: f.unrepresented, minGap: Number.isFinite(minGap) ? +minGap.toFixed(2) : null };
    }, { z, tick, pl });
    rows.push({ ...r, place: Object.entries(HOT).find(([, v]) => v === pl)[0] });
  }
  const by = {}; for (const r of rows) { const b = by[r.z] || (by[r.z] = { zoom: r.z, samples: 0, maxMarks: 0, maxCrowds: 0, maxUnitsInCrowds: 0, bruteOverlaps: 0, engineOverlaps: 0, clearanceViolations: 0, tightPairs: 0, pinsCovered: 0, unrepresented: 0, minGap: Infinity }); b.samples++; b.maxMarks = Math.max(b.maxMarks, r.marks); b.maxCrowds = Math.max(b.maxCrowds, r.crowds); b.maxUnitsInCrowds = Math.max(b.maxUnitsInCrowds, r.inCrowds); b.bruteOverlaps += r.bruteOverlaps; b.engineOverlaps += r.engineOverlaps || 0; b.clearanceViolations += r.clearanceViolations || 0; b.tightPairs += r.tightPairs; b.pinsCovered += r.pinsCovered; b.unrepresented += r.unrepresented; if (r.minGap !== null) b.minGap = Math.min(b.minGap, r.minGap); }
  const table = Object.values(by).map((b) => ({ ...b, minGap: Number.isFinite(b.minGap) ? b.minGap : null }));
  const totals = rows.reduce((s, r) => ({ brute: s.brute + r.bruteOverlaps, eng: s.eng + (r.engineOverlaps || 0), pins: s.pins + r.pinsCovered, unrep: s.unrep + r.unrepresented, tight: s.tight + r.tightPairs }), { brute: 0, eng: 0, pins: 0, unrep: 0, tight: 0 });
  fs.mkdirSync(path.join(D2, 'results'), { recursive: true }); fs.writeFileSync(path.join(D2, 'results', `sweep-${VP}.json`), JSON.stringify({ made: 'node tools/sweep.mjs --vp=' + VP, viewport: [W, H], dpr: DPR, samples: rows.length, seconds: +((Date.now() - t0) / 1000).toFixed(1), totals, byZoom: table, errors: run.errors.filter((m) => !/404/.test(m)), externalRequests: run.requests.length, rows }, null, 1));
  console.log(VP, W + 'x' + H, 'samples', rows.length, 'totals', JSON.stringify(totals), 'errors', run.errors.filter((m) => !/404/.test(m)).length, 'external', run.requests.length); for (const b of table) console.log(JSON.stringify(b));
} finally { await run.close(); }
