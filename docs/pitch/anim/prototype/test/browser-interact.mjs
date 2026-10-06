// test/browser-interact.mjs - drives the BUILT page like a person would, in real Chrome: click to select, inspector, keyboard, wheel zoom, drag pan, scrubber, speed buttons, the Tuning Studio
// (slider, select, toggle, export, import, reset), the metrics overlay and its export, scene jump, reduced motion, phone viewport.  Exit code 1 on any failed expectation or page error.
//   node docs/pitch/anim/prototype/test/browser-interact.mjs [--port=9626]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const PORT = +(args.port || 9626); const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TMP = path.join(REPO, 'tmp', 'pitch-anim', 'studio', 'interact'); fs.mkdirSync(TMP, { recursive: true });
const url = pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1&scene=fresh2&zoom=15.5';

let failed = 0; const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL', msg); } else console.log('ok  ', msg); };
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-extensions', '--remote-debugging-port=' + PORT] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready); await page.waitForTimeout(500);
  const st = (fn, arg) => page.evaluate(fn, arg);

  // --- selection by click ---------------------------------------------------------------------------------------------------------------------------
  const target = await st(() => { const e = window.__studio.engine; const f = e.frame; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.x + f.view.dx > 300 && q.x + f.view.dx < 1000 && q.y + f.view.dy > 150 && q.y + f.view.dy < 600)[2]; return { x: t.x + f.view.dx, y: t.y + f.view.dy, id: t.ids[0] }; });
  await page.mouse.click(target.x, target.y); await page.waitForTimeout(200);
  ok(await st(() => window.__studio.engine.selectedId) === target.id, 'click on a tile selects its unit (' + target.id + ')');
  ok(await page.locator('#panel').isVisible(), 'the panel opens on selection'); ok((await page.locator('#panel').innerText()).includes(target.id), 'the inspector shows the unit id');
  const insp = await page.locator('#panel').innerText(); ok(insp.toUpperCase().includes('MODELLED'), 'the inspector labels positions Modelled'); ok(!/undefined|NaN|(^|[^a-zA-Z])null([^a-zA-Z]|$)/.test(insp), 'the inspector prints no undefined, NaN or null');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100); ok(await st(() => window.__studio.engine.selectedId) === null, 'Escape clears the selection');

  // --- keyboard -------------------------------------------------------------------------------------------------------------------------------------
  await page.locator('#map').focus(); await page.keyboard.press('Space'); ok(await st(() => window.__studio.engine.transport.playing), 'Space plays'); await page.keyboard.press('Space'); ok(!(await st(() => window.__studio.engine.transport.playing)), 'Space pauses');
  const sp0 = await st(() => window.__studio.engine.transport.speed); await page.keyboard.press(']'); ok(await st(() => window.__studio.engine.transport.speed) > sp0, 'bracket raises the speed');
  const t0 = await st(() => window.__studio.engine.transport.target ?? window.__studio.engine.transport.simTau); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); ok(Math.abs(await st(() => window.__studio.engine.transport.simTau) - (Math.round(t0) + 1)) < 0.02, 'right arrow steps one tick (glided)');

  // --- wheel zoom and drag pan ------------------------------------------------------------------------------------------------------------------------
  const z0 = await st(() => window.__studio.engine.camera.zoom); await page.mouse.move(700, 400); await page.mouse.wheel(0, -300); await page.waitForTimeout(700);
  const z1 = await st(() => window.__studio.engine.camera.zoom); ok(z1 > z0 + 0.3, `wheel zooms in (${z0.toFixed(2)} -> ${z1.toFixed(2)})`);
  const c0 = await st(() => ({ ...window.__studio.engine.camera })); await page.mouse.move(600, 500); await page.mouse.down(); await page.mouse.move(700, 560, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
  const c1 = await st(() => ({ ...window.__studio.engine.camera })); ok(c1.lng < c0.lng && c1.lat > c0.lat, 'dragging right/down moves the map with the pointer (camera moves left/up)');

  // --- transport buttons and scrubber ------------------------------------------------------------------------------------------------------------------
  await page.click('button[data-speed="8"]'); ok(await st(() => window.__studio.engine.transport.speed) === 8, '8x button sets the speed');
  await page.click('button.tbtn.play'); await page.waitForTimeout(300); ok(await st(() => window.__studio.engine.transport.playing), 'play button plays'); await page.click('button.tbtn.play');
  await page.evaluate(() => { const r = document.querySelector('.scrub input'); r.value = '120'; r.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(6000);
  ok(Math.abs(await st(() => window.__studio.engine.transport.simTau) - 120) < 0.5, 'the scrubber glides the clock to tick 120');
  await page.selectOption('#topbar select', 'carry1'); await page.waitForTimeout(2500); ok(Math.abs(await st(() => window.__studio.engine.transport.simTau) - 295) < 1, 'a scene jump glides to its tick (295)');
  ok((await page.locator('.clockbox').innerText()).includes('candidate clock'), 'the clock is always shown as a candidate');

  // --- tuning studio ------------------------------------------------------------------------------------------------------------------------------------
  await page.keyboard.press('t'); await page.waitForTimeout(150); ok(await page.locator('#panel').isVisible() && (await page.locator('.tabs button[aria-selected="true"]').innerText()) === 'Tune', 'T opens the Tuning Studio');
  await page.evaluate(() => { const i = document.querySelector('[data-id="layout.dMaxPx"] input'); i.value = '24'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await st(() => window.__studio.tuning.get('layout.dMaxPx')) === 24, 'a slider changes its token live');
  await page.evaluate(() => { const s = document.querySelector('[data-id="motion.mode"] select'); s.value = 'snap'; s.dispatchEvent(new Event('change', { bubbles: true })); }); ok(await st(() => window.__studio.tuning.get('motion.mode')) === 'snap', 'a select changes its token');
  await page.evaluate(() => { const c = document.querySelector('[data-id="layout.labels"] input'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); ok(await st(() => window.__studio.tuning.get('layout.labels')) === false, 'a toggle changes its token');
  await page.waitForTimeout(400); const nLabels = await st(() => window.__studio.engine.frame.tiles.filter((t) => t.label && t.label.opacity >= 0.5).length); ok(nLabels === 0, 'turning labels off removes them (' + nLabels + ' left)');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export")')]); const exp = path.join(TMP, 'settings.json'); await dl.saveAs(exp);
  const exported = JSON.parse(fs.readFileSync(exp, 'utf8')); ok(exported.format === 'battle-studio-settings/1' && exported.tokens['layout.dMaxPx'] === 24 && exported.tokens['motion.mode'] === 'snap', 'Export writes the settings file with the changed values');
  await page.click('button:has-text("Reset all")'); await page.waitForTimeout(200); ok(await st(() => window.__studio.tuning.get('layout.dMaxPx')) === 48 && await st(() => window.__studio.tuning.get('motion.mode')) === 'dynamics', 'Reset all restores every default');
  fs.writeFileSync(path.join(TMP, 'import.json'), JSON.stringify({ format: 'battle-studio-settings/1', tokens: { 'layout.dMaxPx': 36, 'layout.gapPx': 99, 'nope.nope': 1 } }));
  await page.setInputFiles('input[type=file]', path.join(TMP, 'import.json')); await page.waitForTimeout(400);
  ok(await st(() => window.__studio.tuning.get('layout.dMaxPx')) === 36 && await st(() => window.__studio.tuning.get('layout.gapPx')) === 2, 'Import applies valid values and rejects out-of-range ones');
  ok((await page.locator('#panel').innerText()).includes('rejected 1'), 'Import reports what it rejected');
  await page.click('button:has-text("Reset all")');
  await page.fill('.search', 'zoom'); await page.waitForTimeout(150); const visibleRows = await st(() => [...document.querySelectorAll('#panel .row')].filter((r) => !r.classList.contains('hidden')).length); ok(visibleRows > 0 && visibleRows < 20, 'the filter narrows the dials (' + visibleRows + ' rows)');

  // --- skin / layout switches from the registry --------------------------------------------------------------------------------------------------------
  await page.fill('.search', ''); await page.evaluate(() => { const s = document.querySelector('[data-id="layout.strategy"] select'); s.value = 'raw'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(500);
  const rawOv = await st(() => { const f = window.__studio.engine.frame; return f.overlaps; }); ok(rawOv > 100, 'the raw diagnostic layout shows its overlaps (' + rawOv + ' pairs): the metric is live');
  await page.evaluate(() => { const s = document.querySelector('[data-id="layout.strategy"] select'); s.value = 'certified'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(800); ok(await st(() => window.__studio.engine.frame.overlaps) === 0, 'back to the certified layout: 0 overlaps');

  // --- metrics ---------------------------------------------------------------------------------------------------------------------------------------------
  await page.locator('#map').focus(); await page.keyboard.press('m'); await page.waitForTimeout(500); ok(await page.locator('#metrics').isVisible(), 'M shows the metrics overlay'); ok((await page.locator('#metrics').innerText()).includes('overlap pairs'), 'the overlay lists the overlap count');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#metrics button:has-text("Export JSON")')]); const mf = path.join(TMP, 'metrics.json'); await dl2.saveAs(mf);
  const mj = JSON.parse(fs.readFileSync(mf, 'utf8')); ok(mj.format === 'battle-studio-metrics/1' && mj.summary.frames > 10, 'metrics export is valid JSON with a summary');

  // --- about / honesty ------------------------------------------------------------------------------------------------------------------------------------
  await page.locator('#map').focus(); await page.keyboard.press('a'); await page.waitForTimeout(200); const about = await page.locator('#panel').innerText(); ok(!/undefined|NaN|(^|[^a-zA-Z])null([^a-zA-Z]|$)/.test(about), 'the About tab prints no undefined, NaN or null'); ok(/Contested/.test(about) && /candidate/.test(about) && /not terrain/.test(about) || /grid, not terrain/.test(about), 'the About tab states the honest limits');

  // --- reduced motion and phone ---------------------------------------------------------------------------------------------------------------------------
  const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce', hasTouch: true, isMobile: true }); const p2 = await rm.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message)); p2.on('console', (m) => { if (m.type() === 'error') e2.push(m.text()); });
  await p2.goto(url); await p2.waitForFunction(() => window.__studio && window.__studio.ready); await p2.waitForTimeout(600);
  ok(await p2.evaluate(() => { const e = window.__studio.engine; e.transport.seek(300); return e.transport.gliding === false && Math.abs(e.transport.simTau - 300) < 1e-9; }), 'prefers-reduced-motion: a seek lands at once');
  const overflow = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(overflow <= 0, 'phone: no horizontal page scroll (' + overflow + ')');
  const dockBox = await p2.locator('#dock').boundingBox(); ok(dockBox.x >= 0 && dockBox.x + dockBox.width <= 390 && dockBox.height < 260, 'phone: the dock fits the screen (' + Math.round(dockBox.height) + ' px high)');
  await p2.evaluate(() => window.__studio.step(30)); ok(e2.length === 0, 'phone: no page errors'); await rm.close();

  ok(errs.length === 0, 'no console or page errors during the whole session' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await ctx.close();
} catch (e) { failed++; console.error('DRIVER ERROR', e.stack || e); } finally { await browser.close(); }
if (failed) { console.error(failed + ' expectation(s) failed'); process.exit(1); }
console.log('all interaction checks passed');
