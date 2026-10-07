// prints screen positions of tiles by a filter expression: node tools/findtile.mjs "<query>" "<filter on t, f>"
import { serve, launch, open } from './lib.mjs';
const [q, filt] = process.argv.slice(2); const srv = await serve(); const b = await launch({ dpr: 1 });
try { await open(b.page, q, { steps: 60 }); console.log(JSON.stringify(await b.page.evaluate((src) => { const f = window.__studio.engine.frame; const fn = new Function('t', 'f', 'return ' + src); return f.tiles.filter((t) => t.life === 'live' && fn(t, f)).slice(0, 14).map((t) => [t.short, t.kind, Math.round(t.x + f.view.dx), Math.round(t.y + f.view.dy), Math.round(t.hx || 0), +t.ratio.toFixed(2)]); }, filt))); } finally { await b.close(); srv.close(); }
