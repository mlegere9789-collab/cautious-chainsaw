// usage: node tests-state.mjs <baseline|r1c>
// What does a user really get after loading, jumping between days and scrubbing, compared with the data (carry-forward expectation)?
// Uses the full probe to read the tiles the page drew, and the deterministic app model for the expectation.
import fs from 'node:fs';
import { serve, open, boot, readState, sleep, PROBE, setTick, clickSpeed, playPause, tickNow, camera, mapView, tileBudget, wj, WORK } from './common.mjs';
import { makeApp } from './sim.mjs';
import { storeFor } from './replay.mjs';
const which = process.argv[2] || 'baseline';
const srv = await serve(which);
const S = await open({ vp: 'desktop' });
await S.page.addInitScript(PROBE);
const P = S.page;
const out = { build: which, startedAt: new Date().toISOString(), steps: [] };
const expectedApp = makeApp('r1c', { pbt: storeFor('r1c').pbt });
const expectedFor = (tick) => { expectedApp.drawStill(tick); const f = expectedApp.ctx.frames[expectedApp.ctx.frames.length - 1]; return { n: f.tiles.length, labels: f.labels.map((l) => l.text) }; };
const grab = async () => P.evaluate(() => { const f = window.__probe.last(); return f ? { n: f.tiles.length, labels: f.labels.map((l) => l.text), t: f.t, tick: f.tick } : null; });
const multiset = (a) => { const m = {}; a.forEach((x) => (m[x] = (m[x] || 0) + 1)); return m; };
function diff(got, exp) { const g = multiset(got), e = multiset(exp); let extra = 0, missing = 0; const ex = {}, mi = {}; for (const k in g) { const d = g[k] - (e[k] || 0); if (d > 0) { extra += d; ex[k] = d; } } for (const k in e) { const d = e[k] - (g[k] || 0); if (d > 0) { missing += d; mi[k] = d; } } return { extra, missing, extraLabels: Object.entries(ex).slice(0, 8), missingLabels: Object.entries(mi).slice(0, 8) }; }
async function step(name, fn, tick, expectTick = tick) {
  await P.evaluate(() => window.__probe.start()); await fn(); await sleep(900);
  const g = await grab(); const e = expectedFor(expectTick); const t = await tickNow(P);
  const d = diff(g ? g.labels : [], e.labels);
  const rec = { name, appTick: t, tilesDrawnInView: g ? g.n : 0, tilesExpectedInView: e.n, ...d };
  out.steps.push(rec); console.log(JSON.stringify(rec));
  await P.evaluate(() => window.__probe.stop());
}
try {
  await boot(S, srv.url); await sleep(1500);
  await step('after load and splash, tick 1', async () => { await setTick(P, 2); await setTick(P, 1); }, 1);
  await step('click July 2 (jumpToDay), no playback', () => P.locator('button:text-is("July 2")').last().click(), 226);
  await step('click July 3 (jumpToDay), no playback', () => P.locator('button:text-is("July 3")').last().click(), 451);
  await step('scrub to tick 540', () => setTick(P, 540), 540);
  await step('scrub back to tick 100', () => setTick(P, 100), 100);
  await step('scrub to tick 1', () => setTick(P, 1), 1);
  // now play past tick 200 / 420 so lazily-loaded days exist, then re-check the same ticks
  await setTick(P, 421); await sleep(300); await clickSpeed(P, '8x'); await playPause(P); await sleep(2500); await playPause(P); await sleep(500);
  await step('after one playback pass (all days loaded): tick 540', () => setTick(P, 540), 540);
  await step('after one playback pass: tick 100', () => setTick(P, 100), 100);
  await step('after one playback pass: tick 1', () => setTick(P, 1), 1);
  await step('after one playback pass: tick 226', () => setTick(P, 226), 226);
  wj(`${WORK}/state-${which}.json`, out);
  console.log('tiles used', tileBudget.used);
} finally { await S.close(); await srv.close(); }
