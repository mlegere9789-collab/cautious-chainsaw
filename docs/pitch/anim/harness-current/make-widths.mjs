// Measures label text widths with Chrome's own canvas measureText (no network: tiles blocked, page is about:blank)
import fs from 'node:fs';
import { open, WORK } from './common.mjs';
import { loadModel } from './model.mjs';
import { rawRows } from './rawrows.mjs';
const api = loadModel('r1c');
const rows = rawRows();
const set = new Set();
for (const z of [11, 12, 13, 14, 15, 16, 16.5, 17, 18]) for (const sel of [false, true]) for (const r of rows) {
  const lab = api.Y4(r, z, {}); if (!lab) continue;
  for (const mobile of [false, true]) { const it = mobile ? 14 : 12; const vn = sel || z >= 16 ? 10 : z >= 14 ? 9 : 8; set.add(`bold ${vn}px sans-serif|${lab}`); }
}
const S = await open({ vp: 'desktop', tiles: 'block' });
try {
  await S.page.goto('about:blank');
  const arr = [...set];
  const widths = await S.page.evaluate((arr) => { const c = document.createElement('canvas').getContext('2d'); const o = {}; for (const k of arr) { const i = k.indexOf('|'); c.font = k.slice(0, i); o[k] = Math.round(c.measureText(k.slice(i + 1)).width * 100) / 100; } return o; }, arr);
  fs.writeFileSync(WORK + '/text-widths.json', JSON.stringify(widths));
  console.log('strings', arr.length, 'sample', JSON.stringify(Object.entries(widths).slice(0, 3)));
} finally { await S.close(); }
