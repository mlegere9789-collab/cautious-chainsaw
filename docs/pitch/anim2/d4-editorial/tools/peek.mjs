// tools/peek.mjs - a quick look while designing: node tools/peek.mjs "<query>" [--clip=x,y,w,h] [--dpr=2] [--vp=1440x900] [--out=name] [--steps=150] [--js="code run before the shot"] [--hover=x,y] [--click=x,y]
import path from 'node:path';
import { serve, launch, open, settle, REPO } from './lib.mjs';
const a = process.argv.slice(2); const q = a.find((x) => !x.startsWith('--')) || 'scene=fresh2&zoom=15.5';
const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
const [W, H] = (o.vp || '1440x900').split('x').map(Number); const dpr = +(o.dpr || 2);
const srv = await serve(+(o.port || 9900)); const b = await launch({ width: W, height: H, dpr, mobile: W < 700, port: +(o.port || 9900) });
try {
  const r = await open(b.page, q, { steps: +(o.steps || 150), port: +(o.port || 9900) }); console.log(JSON.stringify(r));
  if (o.js) { await b.page.evaluate(o.js); await settle(b.page, +(o.after || 60)); }
  if (o.hover) { const [x, y] = o.hover.split(',').map(Number); await b.page.mouse.move(x - 40, y - 20); await b.page.mouse.move(x, y, { steps: 4 }); await settle(b.page, +(o.after || 60)); }
  if (o.click) { const [x, y] = o.click.split(',').map(Number); await b.page.mouse.click(x, y); await settle(b.page, +(o.after || 90)); }
  const clip = o.clip ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(o.clip.split(',').map(Number)) : undefined;
  const file = path.join(REPO, 'tmp', 'look-dev', 'd4-editorial', (o.out || 'peek') + '.png'); await b.page.screenshot({ path: file, clip }); console.log(file);
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
