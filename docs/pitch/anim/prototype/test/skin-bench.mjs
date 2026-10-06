// test/skin-bench.mjs - DRAW COST of each skin on the real frames of the built Studio, in real Chrome: milliseconds per renderer.draw() over 150 draws of the same frame, per scene, optionally under a
// CPU throttle.  The engine's own step cost is measured separately and is the same for every skin (the skin only changes the footprint, hence the tile count).
//   node docs/pitch/anim/prototype/test/skin-bench.mjs [--skins=reference,field-manual,...] [--scenes=fresh2:15,field:13.5] [--cpu=1] [--dpr=1] [--out=results/skin-bench.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const PORT = +(args.port || 9645); const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SCENES = (args.scenes || 'fresh2:15,field:13.5,carry1:15').split(',').map((s) => s.split(':')); const CPU = +(args.cpu || 1); const DPR = +(args.dpr || 1);
const PROFILE = path.join(REPO, 'tmp', 'pitch-anim', 'skins', 'chrome-profile', 'bench' + PORT); fs.mkdirSync(PROFILE, { recursive: true });
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR, args: ['--no-first-run', '--disable-extensions', '--mute-audio', '--remote-debugging-port=' + (PORT + 1)] });
const rows = [];
try {
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.goto(pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1'); await page.waitForFunction(() => window.__studio && window.__studio.ready);
  const ids = (args.skins ? args.skins.split(',') : await page.evaluate(() => window.__studio.kernel.skins.ids()));
  for (const [scene, zoom] of SCENES) for (const id of ids) {
    const r = await page.evaluate(({ scene, zoom, id }) => {
      const S = window.__studio; const E = S.engine; const sc = E.battle.ds.scenes.find((s) => s.id === scene);
      E.tuning.set('skin.id', id); E.sceneJump({ ...sc, zoom: +zoom }, { glide: false }); E.transport.pause(); for (let i = 0; i < 70; i++) E.step(1000 / 60);
      const f = E.frame; const times = []; for (let i = 0; i < 150; i++) { const t0 = performance.now(); S.renderer.draw(f, {}); times.push(performance.now() - t0); }
      times.sort((a, b) => a - b); const eng = []; for (let i = 0; i < 40; i++) { const t0 = performance.now(); E.step(1000 / 60); eng.push(performance.now() - t0); } eng.sort((a, b) => a - b);
      return { tiles: f.tiles.filter((t) => t.life === 'live').length, drawP50: +times[75].toFixed(2), drawP95: +times[142].toFixed(2), engineP50: +eng[20].toFixed(2) };
    }, { scene, zoom, id });
    rows.push({ scene, zoom, skin: id, cpu: CPU, dpr: DPR, ...r }); console.log(`${scene} z${zoom}  ${id.padEnd(24)} tiles ${String(r.tiles).padStart(4)}  draw p50 ${String(r.drawP50).padStart(6)} ms  p95 ${String(r.drawP95).padStart(6)} ms   (engine step p50 ${r.engineP50} ms)`);
  }
  if (errors.length) { console.log('ERRORS', errors.slice(0, 5)); process.exitCode = 1; }
} finally { await ctx.close(); }
if (args.out) { fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true }); fs.writeFileSync(path.resolve(args.out), JSON.stringify(rows, null, 1)); }
