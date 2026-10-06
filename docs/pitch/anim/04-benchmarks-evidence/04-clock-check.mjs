// Verifies how Playwright's clock API steps requestAnimationFrame in the system Chrome.
// Run from the repo root: node docs/pitch/anim/04-benchmarks-evidence/04-clock-check.mjs
// Headless Chrome, profile under tmp/pitch-anim/benchmarks (deleted afterwards), no network.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const PROFILE = 'tmp/pitch-anim/benchmarks/chrome-profile-clock';
async function once(tag, paused) {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run'] });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.clock.install({ time: 0 });
  await page.setContent('<canvas id=c></canvas>');
  await page.evaluate(() => { window.__f = []; const loop = (t) => { window.__f.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  if (paused) await page.clock.pauseAt(1000);   // freeze virtual time: nothing advances unless stepped
  await page.clock.runFor(1000);
  await page.clock.runFor(500);
  const f = await page.evaluate(() => window.__f);
  const d = [...new Set(f.slice(1).map((t, i) => +(t - f[i]).toFixed(3)))];
  console.log(tag, paused ? '(pauseAt + runFor)' : '(install + runFor only)', '| rAF callbacks after 1500 virtual ms:', f.length, '| distinct deltas (ms):', JSON.stringify(d), '| last timestamp:', f[f.length - 1]);
  await ctx.close();
}
await once('A1', false); await once('A2', false);
await once('B1', true); await once('B2', true); await once('B3', true);
fs.rmSync(PROFILE, { recursive: true, force: true });
