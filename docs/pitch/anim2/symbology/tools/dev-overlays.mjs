// dev: render overlays + aggregates + rings for one language on backdrops
import { launch, ROOT } from './chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { LANGUAGES } from '../src/languages.mjs';
import { buildLanguageSprites, buildOverlaySprites } from '../src/build-sprites.mjs';
import { neededSet } from '../src/needed.mjs';
import path from 'node:path';
const [langId, zoom, out, bg = '#4e613e'] = [process.argv[2], +process.argv[3], process.argv[4], process.argv[5]];
const { T } = loadTokens({}); const needed = neededSet({ repo: path.resolve(ROOT, '..', '..', '..', '..') });
const L = buildLanguageSprites(langId, T, needed); const O = buildOverlaySprites(T, needed);
const show = (list) => list.map((r) => `<div style="width:${r.w * zoom}px;height:${r.h * zoom}px">${r.svg.replace('<svg ', `<svg style="width:${r.w * zoom}px;height:${r.h * zoom}px" `)}</div>`).join('');
let html = `<body style="margin:0;background:${bg};padding:12px;font:11px Segoe UI;color:#ddd">`;
const sec = (t, l) => `<div style="margin:6px 0 2px">${t}</div><div style="display:flex;flex-wrap:wrap;gap:${3 * zoom}px;align-items:flex-end">${show(l)}</div>`;
html += sec('chips + gauge + badges', O) + sec('rings', L.filter((s) => s.group === 'ring').slice(0, 12)) + sec('aggregates (union)', L.filter((s) => s.group === 'agg' && s.key.includes('/union/') ).filter((s,i)=>i%5===0).slice(0,12)) + sec('aggregates (mixed ICA)', L.filter((s) => s.group === 'agg' && s.key.includes('/mixed/') && /ICA|IA|F\//.test(s.key)).slice(0, 8));
const { page, close } = await launch({ w: 1700, h: 800 });
await page.setContent(html); await page.waitForTimeout(150);
await page.screenshot({ path: path.join(ROOT, '..', '..', '..', '..', 'tmp', 'look-dev', 'symbology', out), fullPage: true }); await close();
console.log(L.length, O.length);
