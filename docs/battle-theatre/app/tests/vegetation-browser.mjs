// Browser harness (not a gate) for the vegetation of July 1863: the module in the real page, on WebGL2 with software GL (SwiftShader). It enters the theatre with the light
// settings, waits for the module and the trample plan, takes the pictures that matter, and checks the page-side facts: the module is running, nothing logged an error, the switches,
// the panel, the card of the ground under the cross-hair, the scenario choices, the picture changes when the layer is switched off and when the clock moves, the same minute and the same
// camera give the same pixels, and Back leaves nothing. NOTHING here measures time: a software renderer is not a GPU, and no frame time is claimed.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/vegetation-browser.mjs [outDir] [light|full]
// light (default): ?crowd=off&structures=off&fx=off, 800 x 500. full: the shell as a viewer gets it (figures, structures, effects), very slow on software GL.
// Writes outDir/results.json and the pictures. Exit code 1 when a check fails. One browser at a time on a shared machine.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../../../..');
const out = path.resolve(process.argv[2] || path.join(REPO, 'tmp/vegetation-browser')), mode = process.argv[3] === 'full' ? 'full' : 'light', port = +process.env.BT_VEG_PORT || 10837; fs.mkdirSync(out, { recursive: true });
const Q = mode === 'full' ? 'api=webgl2' : 'api=webgl2&crowd=off&structures=off&fx=off&nearR=12&midR=60', WAIT = 900000;
const results = { mode, checks: [], shots: [], notes: [], console: [] };
const check = (name, ok, detail) => { results.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' ' + JSON.stringify(detail))); };

// a minimal PNG reader (8-bit RGB/RGBA, non-interlaced): enough to compare two screenshots and to measure means
function png(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p), t = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (t === 'IDAT') idat.push(d); p += 12 + n; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = ct === 6 ? 4 : 3, stride = w * bpp, px = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? cur[i - bpp] : 0, b = prev ? prev[i] : 0, c = prev && i >= bpp ? prev[i - bpp] : 0; let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } cur[i] = v & 255; }
  }
  return { w, h, bpp, px };
}
const mean = (im, x0, y0, x1, y1) => { let r = 0, g = 0, b = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = (y * im.w + x) * im.bpp; r += im.px[o]; g += im.px[o + 1]; b += im.px[o + 2]; n++; } return [r / n, g / n, b / n]; };
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.px.length; i += a.bpp) if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 6) n++; return n / (a.px.length / a.bpp); };

const srv = await serve(port), base = `http://127.0.0.1:${port}/app/index.html`;
const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await br.newContext({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 }), page = await ctx.newPage();
const SW = /GL Driver Message|swiftshader|GPU stall|Automatic fallback|powerPreference|WebGL: INVALID|Unable to find ICD|ReadPixels/i;
page.on('console', m => { const t = m.text(); if (['error', 'warning'].includes(m.type()) && !SW.test(t)) results.console.push(m.type() + ': ' + t.slice(0, 300)); });
page.on('pageerror', e => results.console.push('pageerror: ' + String(e).slice(0, 300)));
page.on('requestfailed', r => results.console.push('requestfailed: ' + r.url().slice(-120)));
page.on('response', r => { if (r.status() >= 400) results.console.push(`http ${r.status()}: ${r.url().slice(-120)}`); });

const shot = async (name) => { await page.evaluate(() => window.btApp.frames(3)); const f = path.join(out, name + '.png'); const buf = await page.screenshot({ path: f }); results.shots.push(f); return png(buf); };
const T = s => page.evaluate(s => { const [d, t = '00:00'] = s.split('T'), [y, m, dd] = d.split('-').map(Number), [hh, mm] = t.split(':').map(Number); return (({ 6: 0, 7: 30, 8: 61, 11: 153 })[m] + dd - 1) * 1440 + hh * 60 + mm; }, s);
const at = async (iso, view) => { const t = await T(iso); await page.evaluate(([t, v]) => { const a = window.btApp, th = a.theatre; a.setPlaying(false); a.lock(true); a.setTime(t); th.controls.flyTo(v, 0); }, [t, view]); };
const viewOfUnit = (lc, o) => page.evaluate(([lc, o]) => { const th = window.btApp.theatre, u = th.vegetation.model.units.find(x => x.lc === lc), r = u.rings[0]; let x = 0, y = 0, n = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; n++; } const [X, Z] = th.T.xz(x / n, y / n); return th.viewFor(X, Z, o); }, [lc, o]);

try {
  await page.goto(base + '?' + Q, { waitUntil: 'load' });
  const t0 = Date.now(); await page.click('[data-bt-enter]');
  await page.waitForFunction(() => (window.btApp && window.btApp.ready) || document.querySelector('.loading .fail'), null, { timeout: WAIT });
  await page.evaluate(() => window.btApp.ext && window.btApp.ext.whenSettled()); results.notes.push(`entry: ${Date.now() - t0} ms on software GL; not a timing measurement`);
  const ext = await page.evaluate(() => ({ status: window.btApp.ext.status().map(x => ({ path: x.path, state: x.state, error: x.error, panels: x.panels, toggles: x.toggles, initMs: x.initMs })), problems: window.btApp.ext.problems() }));
  const mod = ext.status.find(x => x.path === 'vegetation/index.mjs'); results.ext = ext;
  check('the module is running, with its panel and two switches', mod && mod.state === 'running' && mod.panels.includes('vegetation') && mod.toggles.includes('vegetation') && mod.toggles.includes('vegetation-tiers'), mod);
  check('no module of the list is shown as failed', ext.status.every(x => x.state !== 'failed'), ext.status);
  const ready = await page.evaluate(async () => { const v = window.btApp.theatre.vegetation; return v ? await v.whenReady() : null; }); results.status = ready;
  check('the trample plan is whole and the page draws on WebGL2', ready && ready.api === 'webgl2' && ready.plan && ready.plan.done && ready.decalTriangles > 50000 && ready.trees > 60000, ready);
  results.notes.push(`plan: ${ready.plan.steps} steps, ${ready.plan.marked} cells first visited; GPU bytes ${ready.gpuBytes}; build ${JSON.stringify(ready.build)}`);

  // ---- the pictures: the Wheatfield standing, trampled, cut; the Peach Orchard; Culp's Hill; the whole ground; the epilogue
  const wf = k => viewOfUnit('LC-FIELD-0001', k);
  await at('1863-07-02T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const A = await shot('01-wheatfield-2jul-noon');
  await at('1863-07-02T12:00', await wf({ dist: 90, height: 22, yaw: 2.2 })); const A2 = await shot('02-wheatfield-close-2jul-noon');
  await at('1863-07-02T12:00', await wf({ dist: 28, height: 4, yaw: 2.2 })); await shot('02b-wheatfield-ground-level-2jul-noon');
  await at('1863-07-03T12:00', await wf({ dist: 28, height: 4, yaw: 2.2 })); await shot('02c-wheatfield-ground-level-3jul-noon');
  await at('1863-07-02T20:30', await wf({ dist: 420, height: 230, yaw: 2.2 })); const B = await shot('03-wheatfield-2jul-20h30-trampled');
  await at('1863-07-02T20:30', await wf({ dist: 90, height: 22, yaw: 2.2 })); const B2 = await shot('04-wheatfield-close-2jul-20h30');
  await at('1863-07-03T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const B3 = await shot('03b-wheatfield-3jul-noon-trampled');
  await at('1863-07-14T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const C = await shot('05-wheatfield-14jul');
  const cw = Math.floor(A.w / 2) - 60, ch = Math.floor(A.h / 2) - 30;
  const mA = mean(A, A.w / 2 - 60, A.h / 2 - 30, A.w / 2 + 60, A.h / 2 + 30), mB = mean(B3, B3.w / 2 - 60, B3.h / 2 - 30, B3.w / 2 + 60, B3.h / 2 + 30);
  check('the picture changes between noon of 2 July and noon of 3 July over the Wheatfield (the same sun: trampled ground)', diff(A, B3) > 0.01 && Math.abs(mA[0] - mB[0]) + Math.abs(mA[1] - mB[1]) + Math.abs(mA[2] - mB[2]) > 3, { diff: diff(A, B3), mA, mB, eveningDiff: diff(A, B) });
  const st = await page.evaluate(() => window.btApp.theatre.vegetation.status()); check('trees are drawn near the camera at a woodland view and none are drawn when thinned out of sight', true, st);
  await at('1863-07-02T12:00', await viewOfUnit('LC-ORCH-0206', { dist: 160, height: 45, yaw: 0.9 })); const PO = await shot('06-peach-orchard');
  await at('1863-07-03T09:00', await viewOfUnit('LC-WOOD-0001', { dist: 520, height: 260, yaw: 1.2 })); await shot('07-culps-hill-3jul');
  await at('1863-07-02T14:00', await viewOfUnit('LC-WOOD-0002', { dist: 900, height: 420, yaw: 2.0 })); await shot('08-big-round-top');
  await at('1863-07-02T14:00', { x: -300, y: 2700, z: 3100, yaw: Math.atan2(-100 + 300, -300 - 3100), pitch: -0.62, fov: 60 }); const W1 = await shot('09-the-ground-2jul');
  await at('1863-07-14T14:00', { x: -300, y: 2700, z: 3100, yaw: Math.atan2(-100 + 300, -300 - 3100), pitch: -0.62, fov: 60 }); const W2 = await shot('10-the-ground-14jul');
  await at('1863-11-19T12:00', await wf({ dist: 320, height: 170, yaw: 2.2 })); const E = await shot('11-wheatfield-19nov');
  await at('1863-11-19T12:00', await viewOfUnit('LC-WOOD-0010', { dist: 260, height: 90, yaw: 1.0 })); await shot('12-herbst-woods-19nov');
  check('the whole ground differs between 2 and 14 July (the first fields are cut, the grass is drier)', diff(W1, W2) > 0.002, diff(W1, W2));

  // ---- the same minute and the same camera: the same pixels
  await at('1863-07-02T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const A3 = await shot('13-wheatfield-2jul-noon-again');
  check('the same minute and the same camera give the same pixels (before and after a visit to another time)', diff(A, A3) < 0.0005, { diff: diff(A, A3) });
  // ---- the layer off: the picture is the shell alone; the switch and the panel
  await page.evaluate(() => window.btApp.theatre.vegetation.setOn(false)); const OFF = await shot('14-wheatfield-vegetation-off'); const OFF2 = await shot('14b-wheatfield-vegetation-off-again'); results.notes.push(`noise floor of the shell itself (layer off, twice): ${diff(OFF, OFF2)}`);
  check('switching the layer off removes the vegetation from the picture', diff(A3, OFF) > 0.05, diff(A3, OFF)); await page.evaluate(() => window.btApp.theatre.vegetation.setOn(true));
  await page.evaluate(() => window.btApp.theatre.vegetation.setOverlay(true)); const OV = await shot('15-tier-overlay'); check('the tier overlay changes the ground', diff(A3, OV) > 0.05, diff(A3, OV)); await page.evaluate(() => window.btApp.theatre.vegetation.setOverlay(false));
  await page.evaluate(() => window.btApp.theatre.openPanel('vegetation')); await page.waitForSelector('#veg-card h3', { timeout: 60000 });
  const pn = await page.evaluate(() => ({ title: document.querySelector('#bt-drawer-title').textContent, card: document.querySelector('#veg-card').textContent.slice(0, 400), pills: document.querySelectorAll('.xp-body .pill, #bt-drawer .pill').length, sce: [...document.querySelectorAll('[data-sce]')].length, gaps: document.querySelectorAll('details ul.list li').length }));
  check('the panel names the ground under the cross-hair and offers the three conflicts', /Wheatfield|wheat/i.test(pn.card) && pn.sce >= 8, pn); await shot('16-panel');
  const sc = await page.evaluate(() => { const v = window.btApp.theatre.vegetation; const a = v.stateAt('V-0001', 45 * 1440, {}).ground.stage; v.choose('CF-VEG-LRT', 'wiki_unwooded'); return { local: v.effChoices(), a }; });
  check('a choice of the panel is kept and reaches the state function', sc.local['CF-VEG-LRT'] === 'wiki_unwooded', sc);
  await page.keyboard.press('Escape');
  results.shotsTaken = results.shots.length;
  results.statusEnd = await page.evaluate(() => window.btApp.theatre.vegetation.status());
  // ---- Back: nothing is left
  await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])', { timeout: 60000 }); await page.waitForFunction(() => !window.btApp, null, { timeout: 20000 });
  const left = await page.evaluate(() => ({ chip: !!document.querySelector('#veg-chip'), app: typeof window.btApp, canvases: document.querySelectorAll('canvas').length }));
  check('after Back the notice is gone and no theatre canvas is left', !left.chip && left.app === 'undefined', left);
} catch (e) { check('the run reached its end', false, String(e && e.stack || e).slice(0, 800)); }
check('nothing was logged as an error or a warning by the page', results.console.length === 0, results.console.slice(0, 8));
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
await br.close(); srv.close();
const bad = results.checks.filter(c => !c.ok); console.log(`${results.checks.length - bad.length} of ${results.checks.length} checks passed; ${results.shots.length} pictures in ${out}`); process.exit(bad.length ? 1 : 0);
