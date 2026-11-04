// The WebGL2 fallback tier (?api=webgl2): the same page, the same stage, the same arrival rule, the same teardown.
//   node --test docs/battle-theatre/app/tests/webgl2.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer, launch, open, enter, leave } from './lib.mjs';

let S, B;
test.before(async () => { S = await startServer(10787); B = await launch(); });
test.after(async () => { await B.close(); await S.close(); });
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;

test('WebGL2 renders the placeholder crowd, hides units before their arrival, answers the scrubber, and leaves no context behind', async () => {
  const { ctx, page, log } = await open(B, S.base, { w: 1280, h: 720, history: 'stub', extra: '?api=webgl2' }); await enter(page, 120000);
  assert.equal(await page.evaluate(() => window.btApp.api), 'webgl2'); assert.equal((await page.evaluate(() => window.__instSnapshot())).gl, 1);
  const set = async t => { await page.locator('#bt-slider').fill(String(Math.floor(t))); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.evaluate(() => window.btApp.frames(5)); };
  await set(minOf(7, 3, 13, 30)); const full = await page.evaluate(() => window.btApp.stats); assert.equal(full.soldiers, 165000);
  const shot = async () => page.screenshot({ clip: { x: 420, y: 70, width: 800, height: 560 } });
  const nonSky = async b64 => page.evaluate(async b => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d'); g.drawImage(bm, 0, 0); const d = g.getImageData(0, 0, bm.width, bm.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; }, b64);
  const a = await nonSky((await shot()).toString('base64')); assert.ok(a > 20, `the frame is not black (${a.toFixed(0)})`);
  await set(minOf(6, 28, 12)); const none = await page.evaluate(() => ({ stats: window.btApp.stats, sent: (() => { const f = window.btApp.theatre.world.unitF; let n = 0; for (let i = 0; i < window.btApp.stage.n; i++) if (Math.abs(f[i * 12]) < 1e5) n++; return n; })() }));
  assert.equal(none.stats.soldiers, 0); assert.equal(none.sent, 0, 'before any arrival nothing is placed on the field');
  await set(minOf(7, 2, 12)); assert.ok((await page.evaluate(() => window.btApp.stats.soldiers)) > 100000);
  const perf = await page.evaluate(async () => { window.btApp.resetPerf(); await new Promise(r => setTimeout(r, 3000)); return window.btApp.perf(); });
  console.log(`# webgl2 with ${full.soldiers} soldiers at 1280x720: frame p50 ${perf.p50.toFixed(1)} p95 ${perf.p95.toFixed(1)} p99 ${perf.p99.toFixed(1)} ms, cpu p95 ${perf.cpuP95.toFixed(1)} ms`);
  await leave(page); await page.waitForTimeout(500); const s = await page.evaluate(() => window.__instSnapshot()); assert.equal(s.gl, 0); assert.equal(s.rafs, 0); assert.equal(s.timers, 0);
  assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); const w = log.warnings.filter(x => !/powerPreference|WebGL: CONTEXT_LOST_WEBGL|GPU stall|GL_CLOSE_PATH/.test(x)); assert.deepEqual(w, []); await ctx.close();
});
