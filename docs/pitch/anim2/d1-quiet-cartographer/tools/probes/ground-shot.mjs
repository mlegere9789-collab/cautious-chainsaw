// tools/probes/ground-shot.mjs - the day ground alone (tick 1, nothing on the Wheatfield yet): node tools/probes/ground-shot.mjs --look='{"grade":[...]}' --name=g1 [--zoom=15] [--style=day]
import path from 'node:path';
import { open, setScene, shot, args, D1, stopServer } from '../lib.mjs';
const look = args.look ? encodeURIComponent(args.look) : null;
const s = await open({ dpr: +(args.dpr || 1), query: look ? 'lookday=' + look : '', profile: 'ground' });
try {
  for (const z of (args.zooms || '13.5,15,16.5').split(',')) {
    await setScene(s.page, { tick: 1, lat: +(args.lat || 39.7992), lng: +(args.lng || -77.2414), zoom: +z, safe: false, style: args.style || 'day', steps: 60 });
    await shot(s.page, path.join(D1, '..', '..', '..', '..', 'tmp', 'look-dev', 'polish-d1-quiet-cartographer', 'wip', `${args.name || 'g'}-z${z}.png`), { clip: { x: 0, y: 70, width: 1440, height: 760 } });
  }
} finally { await s.close(); await stopServer(); }
