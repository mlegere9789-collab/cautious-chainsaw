// Screenshots of the prototype for PLAN.md (WebGPU, 1920x1080, HUD hidden). Usage: node shots.mjs [api]
import fs from 'node:fs'; import path from 'node:path'; import { launch, open } from './pw.mjs';
const api = process.argv[2] || 'webgpu'; const out = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '../../shots'); fs.mkdirSync(out, { recursive: true });
const b = await launch(); const log = [];
const { page } = await open(b, `api=${api}&shot=ridge&w=1920&h=1080&dpr=1&fxAlpha=0.55&exposure=1.0`, { w: 1920, h: 1080, log });
await page.keyboard.press('F1'); const snap = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(900); await page.screenshot({ path: path.join(out, `${api}-${name}.jpg`), type: 'jpeg', quality: 88 }); console.log('shot', name); };
await page.evaluate(() => window.bench.seek(48, 40));
for (const s of ['overview', 'wide', 'ridge', 'ground', 'line', 'cavalry']) await snap(s, (s) => { window.bench.setShot(s); window.bench.state.paused = true; }, s).catch(() => {}); 
// parametrised version (evaluate takes one arg)
for (const s of ['overview', 'wide', 'ridge', 'ground', 'line', 'cavalry']) { await page.evaluate((s) => { window.bench.setShot(s); window.bench.state.paused = false; }, s); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, `${api}-${s}.jpg`), type: 'jpeg', quality: 88 }); console.log('shot', s); }
// battery at the instant of a shot and 1.6 s later (impact), replaying the previous 40 s of effects so the smoke history is real
const tf = await page.evaluate(() => window.bench.gunFireTimes(0, 60));
for (const [name, dt] of [['battery-muzzle-flash', 0.06], ['battery-impact', 1.7]]) { await page.evaluate(([t, s]) => { window.bench.setShot('battery'); window.bench.state.paused = true; window.bench.seek(t, 40); }, [tf + dt, 0]); await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, `${api}-${name}.jpg`), type: 'jpeg', quality: 88 }); console.log('shot', name, 't=', tf + dt); }
console.log(log.filter(l => !/powerPreference/.test(l)).slice(0, 6).join('\n')); await b.close();
