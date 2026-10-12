import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, HERE } from './lib.mjs';
const srv = await serve(); const out = {};
for (const [d, look] of [['d1', 'day'], ['d1', 'night'], ['d4', 'paper'], ['d4', 'aerial']]) for (const vp of ['desktop', 'phone']) {
  const b = await launch({ w: vp === 'phone' ? 390 : 1440, h: vp === 'phone' ? 844 : 900, mobile: vp === 'phone', dpr: 2, profile: 'rect' });
  try { await openDir(b.page, d, look); const r = await b.page.evaluate(() => { const cv = document.getElementById('map'); const r = cv.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, cw: cv.width, ch: cv.height, iw: innerWidth, ih: innerHeight }; }); out[`${d}-${look}-${vp}`] = r; console.log(d, look, vp, JSON.stringify(r)); } finally { await b.close(); }
}
fs.writeFileSync(path.join(HERE, 'results', 'canvasrect.json'), JSON.stringify(out, null, 1)); srv.close(); process.exit(0);
