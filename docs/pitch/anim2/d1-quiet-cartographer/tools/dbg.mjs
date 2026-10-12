// tools/dbg.mjs - run a snippet inside the settled page and print its result.  node tools/dbg.mjs --tick=60 --zoom=14.5 --lat= --lng= --js="return Object.keys(...)" [--popups] [--vp=390x844]
import { open, setScene, args, stopServer } from './lib.mjs';
const [vw, vh] = (args.vp || '1440x900').split('x').map(Number);
const s = await open({ w: vw, h: vh, dpr: 1, mobile: vw < 500, query: args.query || '' });
try {
  await setScene(s.page, { tick: +(args.tick || 551), lat: +(args.lat || 39.8117), lng: +(args.lng || -77.2347), zoom: +(args.zoom || 15), popups: !!args.popups, safe: true, steps: 60 });
  const r = await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${args.js} })()`);
  console.log(JSON.stringify(r, null, 1)); if (s.errors.length) console.log('ERRORS', s.errors.slice(0, 5));
} finally { await s.close(); await stopServer(); }
