// dev zoom: render selected specs of one language at a large CSS zoom: node tools/dev-zoom.mjs shield 8 out.png "union/cavalry/regiment,confederate/artillery/regiment"
import { launch, ROOT } from './chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { LANGUAGES } from '../src/languages.mjs';
import path from 'node:path';
const [lang, zoom, out, list, bg = '#4e613e'] = [process.argv[2], +process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
const { T } = loadTokens({}); const mod = LANGUAGES[lang];
let html = `<body style="margin:0;background:${bg};padding:12px;display:flex;flex-wrap:wrap;gap:${3 * zoom}px;align-items:flex-end">`;
let n = 0;
for (const item of list.split(',')) { const [side, arm, ech, state] = item.split('/'); const r = mod.base({ side, arm, ech, state: state || 'fresh' }, T, 'z' + n++);
  html += `<div style="width:${r.w * zoom}px;height:${r.h * zoom}px">${r.svg.replace('<svg ', `<svg style="width:${r.w * zoom}px;height:${r.h * zoom}px" `)}</div>`; }
const { page, close } = await launch({ w: 1500, h: 700 });
await page.setContent(html); await page.waitForTimeout(150);
await page.screenshot({ path: path.join(ROOT, '..', '..', '..', '..', 'tmp', 'look-dev', 'symbology', out), fullPage: true }); await close();
