// tools/probes/tok-probe.mjs - what do the marks look like under a set of tokens?  node tools/probes/tok-probe.mjs --tokens='{"detail.codeZoom":13}' [--zoom=13.5 --tick=551 --shot=name]
import path from 'node:path';
import { open, setScene, shot, args, D1, stopServer } from '../lib.mjs';
import { CHECK_JS } from '../check.mjs';
const skinset = args.skin ? encodeURIComponent(JSON.stringify({ '*': JSON.parse(args.skin) })) : null; const tokens = args.tokens ? JSON.parse(args.tokens) : null;
const SC = { s1a: [551, 39.81592, -77.23677, 13.5], s1b: [556, 39.8117, -77.2347, 15], s2: [295, 39.7992, -77.2414, 15], s3: [346, 39.8189, -77.2262, 15.5], s1c: [551, 39.81592, -77.23677, 14] };
const s = await open({ dpr: +(args.dpr || 1), query: (args.query || '') + (skinset ? '&skinset=' + skinset : ''), profile: 'probe' });
try {
  for (const id of (args.scenes || 's1a').split(',')) {
    const [tick, lat, lng, zoom] = SC[id]; await setScene(s.page, { tick, lat, lng, zoom, safe: true, tokens, steps: 90 });
    const chk = await s.page.evaluate(CHECK_JS); console.log(id, JSON.stringify({ marks: chk.marks, inView: chk.inView, units: chk.units, aggs: chk.aggregates, merged: chk.unitsInAggregates, overlaps: chk.coreOverlaps, displaced: chk.displaced, inMargin: chk.inMargin, safe: chk.safe }));
    if (args.shot) await shot(s.page, path.join(D1, '..', '..', '..', '..', 'tmp', 'look-dev', 'polish-d1-quiet-cartographer', 'wip', `${args.shot}-${id}.png`));
  }
} finally { await s.close(); await stopServer(); }
