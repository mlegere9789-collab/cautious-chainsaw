// tools/try.mjs - one quick picture while developing.  node tools/try.mjs --zoom=15 --tick=551 --lat= --lng= --name=t1 [--dpr=1] [--style=night|day] [--popups]
import path from 'node:path';
import { open, setScene, shot, args, D1, stopServer } from './lib.mjs';
const s = await open({ dpr: +(args.dpr || 1), query: args.query || '' });
try {
  await setScene(s.page, { tick: +(args.tick || 551), lat: +(args.lat || 39.8117), lng: +(args.lng || -77.2347), zoom: +(args.zoom || 15), popups: !!args.popups, safe: !!args.safe, hostSelect: args.hostSelect || null, select: args.select || null, style: args.style || null, shift: args.shift ? args.shift.split(',').map(Number) : [0, 0] });
  if (args.js) await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${args.js} })()`);
  const info = await s.page.evaluate(() => { const f = window.__studio.engine.frame; return { tiles: f.tiles.filter((t) => t.life === 'live').length, onField: f.onField, overlaps: f.overlaps, unrep: f.unrepresented, aggs: f.tiles.filter((t) => t.kind === 'agg' && t.life === 'live').length, text: window.__studio.engine.text.source }; });
  const out = path.join(D1, 'shots', 'wip', (args.name || 'try') + '.png'); await shot(s.page, out, args.clip ? { clip: (([x, y, w, h]) => ({ x, y, width: w, height: h }))(args.clip.split(',').map(Number)) } : {}); console.log(out, JSON.stringify(info)); if (s.errors.length) console.log('ERRORS', s.errors.slice(0, 8)); if (s.requests.length) console.log('EXTERNAL', s.requests.slice(0, 4));
} finally { await s.close(); await stopServer(); }
