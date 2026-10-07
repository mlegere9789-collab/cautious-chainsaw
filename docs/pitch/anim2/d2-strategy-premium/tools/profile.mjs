// tools/profile.mjs - where does a frame of the page go?  A CDP CPU profile of N seconds of real-time playback, summed by function (self time).  node tools/profile.mjs --q="scene=field&zoom=13.5&speed=4" [--secs=5]
import { launch, args, sleep } from './lib.mjs';
const run = await launch({ w: 1440, h: 900, dpr: +(args.dpr || 2), query: (args.q || 'scene=field&zoom=13.5&speed=4') + '&play=1', inject: false, profile: 'motion' });
try {
  await run.page.evaluate(() => { window.__studio.tuning.set('popup.enabled', false); }); await sleep(2500);
  const cdp = await run.ctx.newCDPSession(run.page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); await sleep((+(args.secs || 5)) * 1000);
  const { profile } = await cdp.send('Profiler.stop'); const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  let total = 0; for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const dt = profile.timeDeltas[i] / 1000; total += dt; const k = (n.callFrame.functionName || '(anonymous)') + ' ' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + dt); }
  const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18); console.log('total sampled ms', total.toFixed(0)); for (const [k, v] of rows) console.log(v.toFixed(0).padStart(7), 'ms', (100 * v / total).toFixed(1).padStart(5) + '%', k);
} finally { await run.close(); }
