// test/skin-shots.mjs - IN-APP screenshots of the built Studio with each skin: real scenes, real data, the real renderer (labels, pins, leaders, aggregates, selection, popups layer).
// Deterministic: the engine is driven by studio.step(n) and the kit's clock is injected, so the same build gives the same pictures.
//   node docs/pitch/anim/prototype/test/skin-shots.mjs [--skins=field-manual,war-room,map-1863] [--scenes=fresh2:15,field:13.5] [--backdrop=paper,ink] [--dpr=1] [--vp=1440x900] [--out=...] [--prefix=app] [--select=1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const PORT = +(args.port || 9643); const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(args.out || path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype')); fs.mkdirSync(OUT, { recursive: true });
const SKINS = (args.skins || 'field-manual,war-room,map-1863').split(','); const SCENES = (args.scenes || 'fresh2:15').split(',').map((s) => s.split(':')); const BDS = (args.backdrop || 'paper').split(',');
const [VW, VH] = (args.vp || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const PREFIX = args.prefix || 'app';
const PROFILE = path.join(REPO, 'tmp', 'pitch-anim', 'skins', 'chrome-profile', 'shots' + PORT); fs.mkdirSync(PROFILE, { recursive: true });
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: CHROME, headless: true, viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, args: ['--no-first-run', '--disable-extensions', '--mute-audio', '--remote-debugging-port=' + (PORT + 1)] });
const errors = [];
try {
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  for (const sk of SKINS) for (const [scene, zoom] of SCENES) for (const bd of BDS) {
    const q = `fresh=1&scene=${scene}&zoom=${zoom}&skin=${sk}&backdrop=${bd}` + (args.query ? '&' + args.query : '');
    await page.goto(pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?' + q); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const info = await page.evaluate(async ({ steps, live }) => {
      const S = window.__studio; const kit = window.__skinKit; let T = 5000; if (!live) kit.setClock({ now: () => T });
      for (let i = 0; i < steps; i++) { T += 16.7; S.step(1, 1000 / 60); }
      const f = S.engine.frame; return { tiles: f.tiles.filter((t) => t.life === 'live').length, units: f.onField, overlaps: f.overlaps, unrep: f.unrepresented, drawMs: S.renderer.stats.drawMs };
    }, { steps: +(args.steps || 90), live: !!(args.hover || args.select) });
    if (args.about) { await page.evaluate(() => window.__studio.ui.togglePanel('about')); await page.waitForTimeout(150); }
    if (args.hover || args.select) {
      const target = await page.evaluate((nth) => { const S = window.__studio; const f = S.engine.frame; const clear = f.tiles.filter((q) => { const x = q.x + f.view.dx; const y = q.y + f.view.dy; return q.solid && q.kind === 'leaf' && q.unit && q.unit.kind === 'regiment' && x > 320 && x < 1000 && y > 160 && y < 620; }).sort((a, b) => b.prio - a.prio); const t = clear[Math.min(nth, clear.length - 1)]; return { x: t.x + f.view.dx, y: t.y + f.view.dy, key: t.key }; }, +(args.nth || 6));
      await page.mouse.move(target.x - 60, target.y - 30); await page.mouse.move(target.x, target.y, { steps: 5 }); await page.waitForTimeout(500);
      if (args.select) { await page.mouse.click(target.x, target.y); await page.waitForTimeout(700); await page.mouse.move(target.x + 220, target.y + 140); await page.waitForTimeout(500); }
      info.target = target;
    }
    const file = path.join(OUT, `${PREFIX}-${sk.replace('/', '_')}-${scene}-z${zoom}-${bd}${DPR > 1 ? '-dpr' + DPR : ''}${args.select ? '-sel' : args.hover ? '-hover' : args.about ? '-legend' : ''}.png`);
    await page.screenshot({ path: file }); console.log(path.relative(REPO, file), JSON.stringify(info));
  }
} finally { await ctx.close(); }
if (errors.length) { console.log('CONSOLE', errors.slice(0, 8)); process.exitCode = 1; }
