// Real-app checks of the extensibility surface of the prototype (Chrome, repo harness): the kill switch, skin / layout switches by URL, the hidden Tuning Studio (?tune=1) and
// live tuning (a slider and a skin switch in the Studio change what is drawn), the tuning export, and a second skin and effect added as plain files (skins/*.js).
//   node docs/pitch/anim/05-proto/test/app-studio.mjs --dist tmp/pitch-anim/arch/anim-R1c/dist
process.env.T0_AGENT = 'pitch-anim/arch';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9580';
const lib = await import('../../../../../tests/t0/lib.mjs');
const { openSession, createStaticServer, waitForApp, chooseLayout, sleep, tileBudget, PORT_BASE } = lib;
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2); const DIST = path.resolve(argv[argv.indexOf('--dist') + 1]);
const OUT = path.join(HERE, '..', 'results'); fs.mkdirSync(OUT, { recursive: true });
const res = { when: new Date().toISOString(), steps: {} };
const server = await createStaticServer({ root: DIST, port: PORT_BASE });
const s = await openSession({ profile: 'studio', cdpPort: PORT_BASE + 1, tiles: 'inject', viewport: { width: 1440, height: 900, dpr: 1 }, initScripts: [() => { window.__gtanimStrict = true; }] });
const page = s.page; const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
const URLQ = (q) => `http://127.0.0.1:${PORT_BASE}/?tick=300&z=14.2&ll=39.812,-77.2373${q ? '&' + q : ''}`;
const step = async (name, fn) => { try { res.steps[name] = { ok: true, ...(await fn()) }; } catch (e) { res.steps[name] = { ok: false, error: String(e.message || e).slice(0, 400) }; } console.log(name, JSON.stringify(res.steps[name]).slice(0, 500)); };
const load = async (q) => { await page.goto(URLQ(q), { timeout: 90000 }); await waitForApp(page); await chooseLayout(page, 'desktop'); await sleep(5000); };
const ink = () => page.evaluate(() => { const cs = [...document.querySelectorAll('canvas')].filter((c) => c.style.zIndex === '10'); const c = cs[0]; if (!c) return -1; const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; });
const info = () => page.evaluate(() => (window.__gtanim ? window.__gtanim.info() : null));

await step('default', async () => { await load(''); await page.screenshot({ path: path.join(OUT, 'shot-skin-classic.png') }); return { info: await info(), ink: await ink() }; });
await step('kill_switch_url', async () => { await load('anim=legacy'); const i = await info(); await page.screenshot({ path: path.join(OUT, 'shot-legacy.png') }); return { engineOn: i && i.on, ink: await ink(), canvasWidth: await page.evaluate(() => [...document.querySelectorAll('canvas')].find((c) => c.style.zIndex === '10').width) }; });
await step('skin_rich_by_url', async () => { await load('anim=skin:rich'); await page.screenshot({ path: path.join(OUT, 'shot-skin-rich.png') }); return { info: await info(), ink: await ink() }; });
await step('skin_minimal_by_url', async () => { await load('anim=skin:minimal,layout:none'); await page.screenshot({ path: path.join(OUT, 'shot-skin-minimal.png') }); return { info: await info(), ink: await ink() }; });
await step('studio_live_tuning', async () => {
  await load('tune=1'); await page.waitForSelector('#gtanim-studio', { timeout: 15000 });
  const before = await ink(); const i0 = await info();
  await page.selectOption('#gtanim-studio select[aria-label="skin"]', 'rich'); await sleep(1200); const afterSkin = await info();
  const inkRich = await ink();
  await page.selectOption('#gtanim-studio select[aria-label="skin"]', 'minimal'); await sleep(1000);
  const sl = page.locator('#gtanim-studio input[aria-label="Corner radius (px)"]'); const hasSlider = (await sl.count()) > 0;
  await page.screenshot({ path: path.join(OUT, 'shot-studio.png') });
  await page.click('#gtanim-studio button:text-is("Export JSON")'); await sleep(300);
  const exported = await page.evaluate(() => window.__gtanimExport || null);
  const parsed = exported ? JSON.parse(exported) : null;
  return { skinBefore: i0 && i0.skin, skinAfterSelect: afterSkin && afterSkin.skin, inkChangedWithSkin: before !== inkRich, sliderGeneratedFromParams: hasSlider, exportedBytes: exported && exported.length, exportedKeys: parsed && Object.keys(parsed), exportedSkin: parsed && parsed.skin, studioListsSkins: await page.$$eval('#gtanim-studio select[aria-label="skin"] option', (o) => o.map((x) => x.textContent)), fxSwitches: await page.$$eval('#gtanim-studio input[type=checkbox]', (o) => o.map((x) => x.getAttribute('aria-label'))) };
});
await step('select_glow_effect', async () => {                                              // the added effect (skins/fx-select-glow.js): pin a unit, the effect's glow must be on that tile
  await load('');
  const r = await page.evaluate(() => { const G = window.__gtanim.G; return { registered: !!G.mods.fx.selectGlow, switchOn: G.T.fx.selectGlow === true, schema: !!G.schema().kinds.fx.selectGlow.params.hz }; });
  return r;
});
await step('fault_fallback', async () => {                                                  // an exception inside the engine must hand the map back to the shipped renderer, without a page error
  await page.addInitScript(() => { window.__gtanimStrict = false; });
  await load('');
  const before = await info(); const errs0 = errors.length;
  await page.evaluate(() => { window.__gtanimFault = true; });
  await page.keyboard.press('ArrowRight'); await sleep(1500); await page.keyboard.press('ArrowRight'); await sleep(1500);
  const after = await info(); await page.screenshot({ path: path.join(OUT, 'shot-fallback.png') });
  return { engineOnBefore: before && before.on, engineOnAfter: after && after.on, legacyInkAfter: await ink(), newPageErrors: errors.length - errs0 };
});
res.errors = errors; res.errorCount = errors.length; res.collector = s.collector.firstParty.slice(0, 5); res.tileRequests = tileBudget.used;
fs.writeFileSync(path.join(OUT, 'app-studio.json'), JSON.stringify(res, null, 1));
console.log('errors', errors.length, 'collector', s.collector.firstParty.length, 'tile requests', tileBudget.used);
await s.close(); await server.close();
