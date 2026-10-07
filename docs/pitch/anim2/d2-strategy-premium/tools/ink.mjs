// tools/ink.mjs - the footprint contract, measured on pixels: a mark paints NOTHING outside the box the layout reserved for it (the zero-overlap guarantee is about that box).  For every live mark of seven real
// scenes (zoom 13.5 to 16.5, 2,000 marks and more) the skin's own tile painter draws it on an empty canvas at DPR 1 and 2 in four states (as it is, selected, hovered, carried-forward), and the bounding box of
// the painted pixels (alpha above 2 percent) is compared with the footprint box (tolerance 0.5 px).  The ground shadow is a separate pass and is not part of the mark; the hover unfold grows only into ground
// the renderer has checked free, and is tested by tools/sweep.mjs instead.
//   node tools/ink.mjs  ->  results/ink.json
import fs from 'node:fs';
import path from 'node:path';
import { launch, settle, D2 } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const run = await launch({ w: 1440, h: 900, dpr: 1, query: 'manual=1', profile: 'ink' });
const { page } = run; const results = []; let total = 0; let bad = 0; const worst = [];
try {
  for (const sc of SCENES.filter((s) => ['s1a', 's1c', 's2', 's3', 's4', 's6', 's8'].includes(s.id))) {
    await page.evaluate(({ sc }) => { const st = window.__studio; const e = st.engine; st.tuning.set('popup.enabled', false); st.updateSafe(); e.transport.pause(); e.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); e.transport.seek(sc.tick, { glide: false }); window.__adv(40, 50); window.__adv(60, 20); }, { sc });
    const r = await page.evaluate(({ sc }) => {
      const st = window.__studio; const e = st.engine; const f = e.frame; const sk = e.kernel.skins.get('premium'); const D = sk.draw; const kit = window.__skinKit; const out = { id: sc.id, zoom: f.zoom, marks: 0, drawn: 0, violations: [] };
      const tiles = f.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.5); out.marks = tiles.length;
      for (const dpr of [1, 2]) for (const state of ['plain', 'selected', 'hover', 'carried']) {
        for (const t0 of tiles) {
          const hw = t0.w / 2; const hh = t0.h / 2; const M = 24; const cw = Math.ceil(t0.w + 2 * M); const ch = Math.ceil(t0.h + 2 * M); const cv = document.createElement('canvas'); cv.width = cw * dpr; cv.height = ch * dpr; const c = cv.getContext('2d', { willReadFrequently: true });
          const t = { ...t0, key: t0.key + '|ink|' + state + dpr, x: 0, y: 0, scale: 1, opacity: 1, entering: false, life: 'live', hoverGrow: null, selected: state === 'selected', ageTicks: state === 'carried' ? 400 : t0.ageTicks, ageMax: state === 'carried' ? 400 : t0.ageMax, ageMin: state === 'carried' ? 400 : t0.ageMin };
          if (state === 'hover') kit.setHover(t.key); else kit.setHover(null);
          c.setTransform(dpr, 0, 0, dpr, (cw / 2) * dpr, (ch / 2) * dpr); c.globalAlpha = 1; D.tile(c, t, { dpr, zoom: f.zoom, timeMs: f.tau * 500, tok: e.tok, spec: f.spec });
          const d = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = 1e9; let y0 = 1e9; let x1 = -1; let y1 = -1;
          for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { if (d[(y * cv.width + x) * 4 + 3] > 5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
          out.drawn++; if (x1 < 0) { out.violations.push({ key: t0.key, state, dpr, why: 'nothing painted' }); continue; }
          const bx0 = x0 / dpr - cw / 2; const bx1 = (x1 + 1) / dpr - cw / 2; const by0 = y0 / dpr - ch / 2; const by1 = (y1 + 1) / dpr - ch / 2; const over = Math.max(-hw - bx0, bx1 - hw, -hh - by0, by1 - hh);
          if (over > 0.5) out.violations.push({ key: t0.key, kind: t0.kind, short: t0.short, state, dpr, over: +over.toFixed(2), ink: [+bx0.toFixed(1), +by0.toFixed(1), +bx1.toFixed(1), +by1.toFixed(1)], box: [-hw, -hh, hw, hh] });
        }
      }
      kit.setHover(null); return out;
    }, { sc });
    total += r.drawn; bad += r.violations.length; worst.push(...r.violations.sort((a, b) => (b.over || 0) - (a.over || 0)).slice(0, 5));
    results.push({ id: r.id, zoom: r.zoom, marks: r.marks, painted: r.drawn, violations: r.violations.length }); console.log(r.id, 'zoom', r.zoom, 'marks', r.marks, 'painted', r.drawn, 'violations', r.violations.length, r.violations.slice(0, 2).map((v) => JSON.stringify(v)).join(' '));
  }
  fs.mkdirSync(path.join(D2, 'results'), { recursive: true }); fs.writeFileSync(path.join(D2, 'results', 'ink.json'), JSON.stringify({ made: 'node tools/ink.mjs', tolerancePx: 0.5, paintedTotal: total, violations: bad, scenes: results, worst: worst.sort((a, b) => (b.over || 0) - (a.over || 0)).slice(0, 12) }, null, 1));
  console.log('painted', total, 'violations', bad);
} finally { await run.close(); }
