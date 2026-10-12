// xcheck.mjs - the per-frame ink check (pagelib __inkFast) against the still-picture ink pass (ink-pass.mjs) on the same frame: same tiles, same boxes, same core pixels?
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, HERE } from './lib.mjs';
import { initFull, installHelpers, ANGLE } from './pagelib.mjs';
import { inkPass } from './ink-pass.mjs';
const srv = await serve(); const out = {};
for (const [d, look] of [['d1', 'day'], ['d4', 'paper']]) {
  const b = await launch({ profile: 'xc', init: initFull }); const { page } = b;
  try {
    await openDir(page, d, look); await installHelpers(page);
    await page.evaluate(() => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.select(null); E.transport.pause(); E.transport.seek(556, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 15 }, { glide: false, safe: true }); window.__adv(300, 16.667); });
    await page.evaluate(() => window.__groundIdle()); await page.evaluate(() => window.__adv(10, 16.667)); await page.waitForTimeout(500);
    let prev = null; let stab = 0; for (let k = 0; k < 60 && stab < 4; k++) { await page.waitForTimeout(300); const h = await page.evaluate(async () => { await window.__groundIdle(); window.__drawNow(); const cv = document.getElementById('map'); const c = cv.getContext('2d', { willReadFrequently: true }); const dd = c.getImageData(0, 0, cv.width, cv.height).data; let a = 2166136261; for (let i = 0; i < dd.length; i += 61) { a ^= dd[i]; a = Math.imul(a, 16777619); } return a >>> 0; }); if (h === prev) stab++; else stab = 0; prev = h; }
    console.log(d, "stable", stab);
    const A = await page.evaluate(inkPass);
    const B = await page.evaluate(() => { const r = window.__inkFast({ allInView: true, minOpacity: 0.5 }); return { bodies: r.bodies.map((x) => ({ key: x.key, bbox: x.bbox, core: x.core, soft: x.soft })), corePairs: r.corePairs.length }; });
    const am = new Map(A.perTile.map((t) => [t.key, t])); let n = 0; let same = 0; let maxd = 0; const diffs = [];
    for (const t of B.bodies) { const a = am.get(t.key); if (!a || !a.bbox || !t.bbox) continue; n++; const dd = Math.max(...a.bbox.map((v, i) => Math.abs(v - t.bbox[i]))); maxd = Math.max(maxd, dd); if (dd <= 1) same++; else if (diffs.length < 5) diffs.push([t.key, a.bbox, t.bbox]); }
    out[d] = { tilesInkPass: A.perTile.length, tilesFast: B.bodies.length, compared: n, bboxWithin1px: same, maxBboxDiffPx: maxd, inkPassCorePairs: A.summary.bodyCorePairs, fastCorePairs: B.corePairs, examples: diffs };
    console.log(d, JSON.stringify(out[d]));
  } finally { await b.close(); }
}
fs.writeFileSync(path.join(HERE, 'results', 'xcheck.json'), JSON.stringify(out, null, 1)); srv.close(); process.exit(0);
