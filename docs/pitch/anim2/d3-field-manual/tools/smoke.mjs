import path from 'node:path';
import { startServer, launch, settle, WORK, args } from './lib.mjs';
const srv = await startServer();
const s = await launch({ w: 1440, h: 900, dpr: +(args.dpr || 1), query: 'manual=1&scene=' + (args.scene || 'fresh2') + '&zoom=' + (args.zoom || 15) + (args.variant ? '&style=field-manual&variant=' + args.variant : '') });
try {
  const n = await settle(s.page);
  const info = await s.page.evaluate(() => { const f = window.__studio.engine.frame; return { tiles: f.tiles.length, solid: f.tiles.filter((t) => t.solid).length, onField: f.onField, overlaps: f.overlaps, unrep: f.unrepresented, skin: window.__studio.engine.tok('skin.id'), bd: window.__studio.engine.tok('backdrop.id'), bdstats: globalThis.__realBackdrop && globalThis.__realBackdrop.stats() }; });
  console.log(n, JSON.stringify(info));
  const file = path.join(WORK, 'smoke.png'); await s.page.screenshot({ path: file }); console.log('wrote', file);
  console.log('errors', s.errors.slice(0, 8), 'requests', s.requests.slice(0, 5));
} finally { await s.close(); srv.close(); }
