// v13-popups-off.mjs - does a still page stop drawing?  Three real-time sessions: popups on; popups off from the start (?set); popups switched off after the battle has played.  Frames drawn in 3 s,
// 14 s after the last action (the page's own frame counter).   -> results/v13-popups-off.json
import { serve, launch, PROTO, writeJson, sleep } from './lib.mjs';
const srv = await serve(PROTO, 9730); const rows = [];
for (const mode of ['popups on', 'popups off at boot (?set)', 'popups switched off after playing']) {
  const q = mode === 'popups off at boot (?set)' ? 'welcome=0&set=' + encodeURIComponent(JSON.stringify({ 'popup.enabled': false })) : 'welcome=0';
  const s = await launch({ port: 9730, query: q, profile: 'idle' }); const P = s.page;
  if (mode === 'popups switched off after playing') { await P.evaluate(() => { window.__studio.engine.transport.play(); }); await sleep(3000); await P.evaluate(() => { const E = window.__studio.engine; E.transport.pause(); E.tuning.set('popup.enabled', false); }); }
  await sleep(14000); const a = await P.evaluate(() => window.__studio.frames); await sleep(3000); const b = await P.evaluate(() => window.__studio.frames);
  const r = { mode, framesIn3s: b - a, engineBusy: await P.evaluate(() => window.__studio.engine.busy()), hostBusy: await P.evaluate(() => window.__studio.host.busy()) }; rows.push(r); console.log(JSON.stringify(r)); await s.close();
}
writeJson('v13-popups-off.json', { generated: new Date().toISOString(), rows }); srv.close();
