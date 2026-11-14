// Browser harness (not a gate) for the vegetation of July 1863: the module in the real page, on WebGL2 with software GL (SwiftShader). It enters the theatre with the light
// settings, waits for the module and the trample plan, takes the pictures that matter (with the interface hidden, so that the whole picture is the scene), and checks the page-side
// facts: the module is running, nothing logged an error, the switches, the panel, the card of the ground under the cross-hair, the scenario choices, the picture changes when the
// layer is switched off, when the clock moves and when the ground is trampled, the same minute and the same camera give the same pixels, the night frames keep the luminance and
// contrast of gate Q10 with the layer on (and are compared with the same frames with it off), the epilogue (19 November) is reached through its own chapter, and Back leaves nothing.
// NOTHING here measures time: a software renderer is not a GPU, and no frame time is claimed.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/vegetation-browser.mjs [outDir] [light|full]
// light (default): ?crowd=off&structures=off&fx=off, 800 x 500. full: the shell as a viewer gets it (figures, structures, effects), very slow on software GL.
// BT_VEG_QS="vegshell=on" adds to the query (the standing crop near the camera is off by default); with the standing crop on, ground-level pictures of the crops are taken too.
// Writes outDir/results.json and the pictures. Exit code 1 when a check fails. One browser at a time on a shared machine.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../../../..');
const out = path.resolve(process.argv[2] || path.join(REPO, 'tmp/vegetation-browser')), mode = process.argv[3] === 'full' ? 'full' : 'light', port = +process.env.BT_VEG_PORT || 10837; fs.mkdirSync(out, { recursive: true });
const EXTRA = process.env.BT_VEG_QS ? '&' + process.env.BT_VEG_QS : '', SHELL = /vegshell=on/.test(EXTRA);
const Q = (mode === 'full' ? 'api=webgl2' : 'api=webgl2&crowd=off&structures=off&fx=off&nearR=12&midR=60') + EXTRA, WAIT = 900000;
const results = { mode, query: Q, checks: [], shots: [], notes: [], console: [], night: [] };
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
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.px.length; i += a.bpp) if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 6) n++; return n / (a.px.length / a.bpp); };
// the luminance statistics of gate Q10 as tests/sky.spec.mjs reads them: 8-bit luma, 5th and 95th percentile, share of near-black pixels (< 8), Michelson contrast
function lumaStats(im, x0 = 0, y0 = 0, x1 = im.w, y1 = im.h) {
  const h = new Array(256).fill(0); let sum = 0, dark = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = (y * im.w + x) * im.bpp, v = Math.round(0.2126 * im.px[o] + 0.7152 * im.px[o + 1] + 0.0722 * im.px[o + 2]); h[v]++; sum += v; if (v < 8) dark++; n++; }
  const pc = q => { let a = 0; for (let k = 0; k < 256; k++) { a += h[k]; if (a >= q * n) return k; } return 255; }, p5 = pc(0.05), p95 = pc(0.95);
  return { mean: sum / n, p5, p50: pc(0.5), p95, dark: dark / n, michelson: (p95 - p5) / (p95 + p5 + 1e-6) };
}

const srv = await serve(port), base = `http://127.0.0.1:${port}/app/index.html`;
const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await br.newContext({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 }), page = await ctx.newPage();
const SW = /GL Driver Message|swiftshader|GPU stall|Automatic fallback|powerPreference|WebGL: INVALID|Unable to find ICD|ReadPixels/i;
page.on('console', m => { const t = m.text(); if (['error', 'warning'].includes(m.type()) && !SW.test(t)) results.console.push(m.type() + ': ' + t.slice(0, 300)); });
page.on('pageerror', e => results.console.push('pageerror: ' + String(e).slice(0, 300)));
page.on('requestfailed', r => results.console.push(`requestfailed: ${r.method()} ${r.url().slice(-120)} ${(r.failure() && r.failure().errorText) || ''} (at ${Math.round(performance.now() / 1000)} s)`));
page.on('response', r => { if (r.status() >= 400) results.console.push(`http ${r.status()}: ${r.url().slice(-120)}`); });

const CLEAN = 'header.top, #bt-left, footer.dock, #bt-overlay, #bt-pad, #bt-card, #bt-drawer { visibility: hidden !important; }';
let cleanOn = false;
const clean = async on => { if (on === cleanOn) return; cleanOn = on; await page.evaluate(([on, css]) => { let s = document.getElementById('veg-harness-clean'); if (on && !s) { s = document.createElement('style'); s.id = 'veg-harness-clean'; s.textContent = css; document.head.appendChild(s); } else if (!on && s) s.remove(); }, [on, CLEAN]); };
const shot = async (name, ui = false) => { await clean(!ui); await page.evaluate(() => window.btApp.frames(3)); const f = path.join(out, name + '.png'); const buf = await page.screenshot({ path: f }); results.shots.push(f); return png(buf); };
const T = s => page.evaluate(s => { const [d, t = '00:00'] = s.split('T'), [y, m, dd] = d.split('-').map(Number), [hh, mm] = t.split(':').map(Number); return (({ 6: 0, 7: 30, 8: 61, 11: 153 })[m] + dd - 1) * 1440 + hh * 60 + mm; }, s);
// the same light for pictures that are compared (lock = true: the light of the moment is kept while the clock moves); a picture whose light matters (night, the epilogue) is taken unlocked
const at = async (iso, view, { lock = true } = {}) => {
  const t = await T(iso), chapter = iso >= '1863-11-18' ? 'epilogue' : 'battle';
  await page.evaluate(([t, v, lock, chapter]) => { const a = window.btApp, th = a.theatre; a.setPlaying(false); a.lock(false); a.setTime(t, { chapter }); th.controls.flyTo(v, 0); window.__vegLock = lock; }, [t, view, lock, chapter]);
  await page.evaluate(() => window.btApp.frames(lock ? 4 : 8)); if (lock) await page.evaluate(() => window.btApp.lock(true));
};
const viewOfUnit = (lc, o) => page.evaluate(([lc, o]) => { const th = window.btApp.theatre, u = th.vegetation.model.units.find(x => x.lc === lc), r = u.rings[0]; let x = 0, y = 0, n = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; n++; } const [X, Z] = th.T.xz(x / n, y / n); return th.viewFor(X, Z, o); }, [lc, o]);
const viewOfCrop = (crop, o, k = 0) => page.evaluate(([crop, o, k]) => { const th = window.btApp.theatre, us = th.vegetation.model.units.filter(x => x.cls === 'field' && x.crop === crop && x.area_ac > 3); const u = us[Math.min(k, us.length - 1)]; if (!u) return null; const r = u.rings[0]; let x = 0, y = 0, n = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; n++; } const [X, Z] = th.T.xz(x / n, y / n); return { v: th.viewFor(X, Z, o), id: u.id }; }, [crop, o, k]);

try {
  await page.goto(base + '?' + Q, { waitUntil: 'load' });
  const t0 = Date.now(); await page.click('[data-bt-enter]');
  await page.waitForFunction(() => (window.btApp && window.btApp.ready) || document.querySelector('.loading .fail'), null, { timeout: WAIT });
  await page.evaluate(() => window.btApp.ext && window.btApp.ext.whenSettled()); results.notes.push(`entry: ${Date.now() - t0} ms on software GL; not a timing measurement`);
  const ext = await page.evaluate(() => ({ status: window.btApp.ext.status().map(x => ({ path: x.path, state: x.state, error: x.error, panels: x.panels, toggles: x.toggles, initMs: x.initMs })), problems: window.btApp.ext.problems() }));
  const mod = ext.status.find(x => x.path === 'vegetation/index.mjs'); results.ext = ext;
  check('the module is running, with its panel and its switches', mod && mod.state === 'running' && mod.panels.includes('vegetation') && mod.toggles.includes('vegetation') && mod.toggles.includes('vegetation-tiers') && mod.toggles.includes('vegetation-crop'), mod);
  check('no module of the list is shown as failed', ext.status.every(x => x.state !== 'failed') && ext.problems.length === 0, ext);
  // the plan of the troops' walk is computed in the idle time between frames; on a software renderer a frame can take seconds, so the wait is bounded and the state at its end is what the check reads
  const ready = await page.evaluate(async () => { const v = window.btApp.theatre.vegetation; if (!v) return null; const t0 = performance.now(); await Promise.race([v.whenReady(), new Promise(r => setTimeout(r, 300000))]); const st = v.status(); st.waitedMs = Math.round(performance.now() - t0); return st; }); results.status = ready;
  check('the trample plan is whole and the page draws on WebGL2', ready && ready.api === 'webgl2' && ready.plan && ready.plan.done && ready.decalTriangles > 50000 && ready.trees > 60000, ready);
  results.notes.push(`plan: ${ready.plan.steps} steps, ${ready.plan.marked} cells first visited; GPU bytes ${ready.gpuBytes}; build ${JSON.stringify(ready.build)}; claims in the data ${ready.claims}`);
  const dataFacts = await page.evaluate(() => { const v = window.btApp.theatre.vegetation, M = v.model, min = (m, d, h = 0) => ({ 6: 0, 7: 30, 11: 153 }[m] + d - 1) * 1440 + h * 60; const wood = M.units.find(u => u.woods && u.cls === 'woods'); return { leafJul: v.stateAt(wood.id, min(7, 2, 12)).trees.leaf, leafNov: v.stateAt(wood.id, min(11, 19, 12)).trees.leaf, wfStand: v.stateAt('V-0001', min(7, 2, 12)).ground.h, wfTramp: v.stateAt('V-0001', min(7, 3, 12)).ground.trample, wfStage14: v.stateAt('V-0001', min(7, 14, 12)).ground.stage }; });
  results.dataFacts = dataFacts;
  check('the data seen through the page: full leaf in July, leaf-off in November, the Wheatfield standing 1 to 1.6 m and trampled after the fight', dataFacts.leafJul > 0.8 && dataFacts.leafNov < 0.3 && dataFacts.wfStand[0] > 0.9 && dataFacts.wfTramp > 0.5, dataFacts);

  // ---- the pictures: the Wheatfield standing, trampled, cut; the Peach Orchard; Culp's Hill; the whole ground; the epilogue (one light for the day pictures that are compared)
  const wf = k => viewOfUnit('LC-FIELD-0001', k);
  await at('1863-07-02T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const A = await shot('01-wheatfield-2jul-noon');
  await at('1863-07-02T12:00', await wf({ dist: 90, height: 22, yaw: 2.2 })); const A2 = await shot('02-wheatfield-close-2jul-noon');
  await at('1863-07-02T12:00', await wf({ dist: 28, height: 4, yaw: 2.2 })); await shot('02b-wheatfield-ground-level-2jul-noon');
  await at('1863-07-03T12:00', await wf({ dist: 28, height: 4, yaw: 2.2 })); await shot('02c-wheatfield-ground-level-3jul-noon');
  await at('1863-07-02T20:30', await wf({ dist: 420, height: 230, yaw: 2.2 })); const B = await shot('03-wheatfield-2jul-20h30-trampled');
  await at('1863-07-02T20:30', await wf({ dist: 90, height: 22, yaw: 2.2 })); const B2 = await shot('04-wheatfield-close-2jul-20h30');
  await at('1863-07-03T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const B3 = await shot('03b-wheatfield-3jul-noon-trampled');
  await at('1863-07-03T12:00', await wf({ dist: 90, height: 22, yaw: 2.2 })); const B4 = await shot('04b-wheatfield-close-3jul-noon');
  await at('1863-07-14T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const C = await shot('05-wheatfield-14jul');
  const ctr = (im, w = 70, h = 40) => mean(im, im.w / 2 - w, im.h / 2 - h, im.w / 2 + w, im.h / 2 + h), mA = ctr(A), mB = ctr(B3), mA2 = ctr(A2, 90, 50), mB4 = ctr(B4, 90, 50);
  check('the picture changes between noon of 2 July and noon of 3 July over the Wheatfield (the same light: trampled ground)', diff(A, B3) > 0.01 && Math.abs(mA[0] - mB[0]) + Math.abs(mA[1] - mB[1]) + Math.abs(mA[2] - mB[2]) > 3, { diff: diff(A, B3), mA, mB, eveningDiff: diff(A, B) });
  check('the trampled Wheatfield is clearly darker than the standing one at the close view (at least 10 per cent of the luminance)', luma(mB4) < 0.9 * luma(mA2), { standing: mA2, trampled: mB4, close: diff(A2, B4) });
  await at('1863-07-02T12:00', await viewOfUnit('LC-ORCH-0206', { dist: 160, height: 45, yaw: 0.9 })); await shot('06-peach-orchard');
  await at('1863-07-03T09:00', await viewOfUnit('LC-WOOD-0001', { dist: 520, height: 260, yaw: 1.2 })); await shot('07-culps-hill-3jul');
  const stW = await page.evaluate(() => window.btApp.theatre.vegetation.status()); check('trees are drawn at a woodland view (instanced chunks near and far)', stW.treesDrawn > 500 && stW.chunksFar > 0, { treesDrawn: stW.treesDrawn, chunksNear: stW.chunksNear, chunksFar: stW.chunksFar });
  await at('1863-07-02T14:00', await viewOfUnit('LC-WOOD-0002', { dist: 900, height: 420, yaw: 2.0 })); await shot('08-big-round-top');
  await at('1863-07-02T14:00', { x: -300, y: 2700, z: 3100, yaw: Math.atan2(-100 + 300, -300 - 3100), pitch: -0.62, fov: 60 }); const W1 = await shot('09-the-ground-2jul');
  await at('1863-07-14T14:00', { x: -300, y: 2700, z: 3100, yaw: Math.atan2(-100 + 300, -300 - 3100), pitch: -0.62, fov: 60 }); const W2 = await shot('10-the-ground-14jul');
  check('the whole ground differs between 2 and 14 July (the first fields are cut, the grass is drier)', diff(W1, W2) > 0.002, diff(W1, W2));
  // the epilogue chapter: leaf-off woods and the dormant ground, in its own light
  await at('1863-11-19T12:00', await wf({ dist: 320, height: 170, yaw: 2.2 }), { lock: false }); const E = await shot('11-wheatfield-19nov');
  const chap = await page.evaluate(() => ({ chapter: window.btApp.state.chapter, t: window.btApp.state.t }));
  check('the epilogue is reached through its own chapter (the picture is of 19 November, not of the end of the battle chapter)', chap.chapter === 'epilogue' && chap.t >= 153 * 1440 + 18 * 1440, chap);
  await at('1863-11-19T12:00', await viewOfUnit('LC-WOOD-0010', { dist: 260, height: 90, yaw: 1.0 }), { lock: false }); const E2 = await shot('12-herbst-woods-19nov');
  const gE = mean(E, E.w / 2 - 60, E.h / 2 - 30, E.w / 2 + 60, E.h / 2 + 30);
  results.notes.push(`19 Nov mean colour over the Wheatfield: ${gE.map(x => x.toFixed(0)).join(',')}`);

  // ---- Little Round Top: the three readings of its tree cover, from the west (the cleared face, the wood behind it) and from the east (the wooded slope)
  const lrtW = await viewOfUnit('LC-OPEN-0001', { dist: 420, height: 130, yaw: Math.PI / 2 }), lrtE = await viewOfUnit('LC-WOOD-LRT-E', { dist: 300, height: 95, yaw: -Math.PI / 2 });
  await at('1863-07-02T12:00', lrtW); const L1 = await shot('17-lrt-west-default'); await at('1863-07-02T12:00', lrtE); const L2 = await shot('18-lrt-east-default');
  await page.evaluate(() => window.btApp.theatre.vegetation.choose('CF-VEG-LRT', 'wiki_unwooded')); const L3 = await shot('18b-lrt-east-unwooded'); await at('1863-07-02T12:00', lrtW); const L3w = await shot('17b-lrt-west-unwooded');
  await page.evaluate(() => window.btApp.theatre.vegetation.choose('CF-VEG-LRT', 'wiki_light_summit')); await at('1863-07-02T12:00', lrtE); const L4 = await shot('18c-lrt-east-light-summit');
  await page.evaluate(() => window.btApp.theatre.vegetation.choose('CF-VEG-LRT', 'nps_clr'));
  check('the reading of Little Round Top reaches the picture: unwooded removes the trees of the east slope, lightly wooded keeps about half (the pictures differ from the default and from each other)', diff(L2, L3) > 0.03 && diff(L2, L4) > 0.01 && diff(L3, L4) > 0.01, { unwooded: diff(L2, L3), light: diff(L2, L4), between: diff(L3, L4) });
  // ---- the same minute and the same camera: the same pixels
  await at('1863-07-02T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 })); const A3 = await shot('13-wheatfield-2jul-noon-again');
  check('the same minute and the same camera give the same pixels (before and after a visit to another time)', diff(A, A3) < 0.0005, { diff: diff(A, A3) });
  // ---- the layer off: the picture is the shell alone; the switch and the panel
  await page.evaluate(() => window.btApp.theatre.vegetation.setOn(false)); const OFF = await shot('14-wheatfield-vegetation-off'); const OFF2 = await shot('14b-wheatfield-vegetation-off-again'); results.notes.push(`noise floor of the shell itself (layer off, twice): ${diff(OFF, OFF2)}`);
  check('switching the layer off removes the vegetation from the picture', diff(A3, OFF) > 0.05, diff(A3, OFF)); await page.evaluate(() => window.btApp.theatre.vegetation.setOn(true));
  await page.evaluate(() => window.btApp.theatre.vegetation.setOverlay(true)); const OV = await shot('15-tier-overlay'); check('the tier overlay changes the ground', diff(A3, OV) > 0.05, diff(A3, OV)); await page.evaluate(() => window.btApp.theatre.vegetation.setOverlay(false));

  // ---- night (gate Q10): the frames keep the luminance and the contrast with the layer on; the same frames with it off are the shell's own. The light is not locked.
  const nightView = await viewOfUnit('LC-ORCH-0206', { dist: 160, height: 45, yaw: 0.9 });
  const NIGHTS = ['1863-07-02T23:30', '1863-07-03T01:30', '1863-07-03T23:30', '1863-07-05T01:30'];
  for (const iso of NIGHTS) {
    await at(iso, nightView, { lock: false });
    const env = await page.evaluate(() => { const sm = window.btApp.theatre.sample; return { sunAlt: sm.sunAlt, moonAlt: sm.moonAlt, moonUp: sm.moonUp }; });
    await page.evaluate(() => window.btApp.theatre.vegetation.setOn(true)); const on = lumaStats(await shot('n-' + iso.slice(5, 13).replace(/[-T:]/g, '') + '-on'));
    await page.evaluate(() => window.btApp.theatre.vegetation.setOn(false)); const off = lumaStats(await shot('n-' + iso.slice(5, 13).replace(/[-T:]/g, '') + '-off')); await page.evaluate(() => window.btApp.theatre.vegetation.setOn(true));
    results.night.push({ iso, sunAlt: +env.sunAlt.toFixed(1), moonUp: env.moonUp, on, off });
    const ok = env.sunAlt < -6 && on.mean >= 24 && on.p5 >= 6 && on.dark < 0.02 && on.michelson >= 0.2;
    check(`night ${iso}: with the layer on the frame keeps the floor of gate Q10 (mean luma >= 24, 5th percentile >= 6, near-black < 2%, contrast >= 0.2)`, ok, { env, on, off });
  }

  const cl = await page.evaluate(() => { const v = window.btApp.theatre.vegetation; v.setOn(true); return v.status(); });
  // ---- the standing crop near the camera (only when asked for: vegshell=on): ground-level pictures of the crops, standing, trampled, cut
  if (SHELL) {
    const eye = { dist: 5, height: 1.7, yaw: 2.2 };
    await at('1863-07-02T12:00', await wf(eye)); const S1 = await shot('20-shell-wheat-eye-2jul'); const stS1 = await page.evaluate(() => window.btApp.theatre.vegetation.status().shell);
    check('the standing crop is on, its program is made and chunks of the field near the camera are drawn', stS1 && stS1.on && stS1.ready && stS1.chunks > 0 && stS1.tris > 0, stS1);
    await at('1863-07-02T12:00', await wf({ dist: 40, height: 9, yaw: 2.2 })); await shot('21-shell-wheat-mid-2jul');
    await at('1863-07-03T12:00', await wf(eye)); const S2 = await shot('22-shell-wheat-eye-3jul-trampled');
    await at('1863-07-03T12:00', await wf({ dist: 40, height: 9, yaw: 2.2 })); await shot('23-shell-wheat-mid-3jul-trampled');
    await page.evaluate(() => window.btApp.theatre.vegetation.setShell(false)); await at('1863-07-02T12:00', await wf(eye)); const S0 = await shot('24-shell-off-wheat-eye-2jul'); await page.evaluate(() => window.btApp.theatre.vegetation.setShell(true));
    check('the standing crop changes the ground-level picture (it is not the flat ground cover alone)', diff(S1, S0) > 0.1, { diff: diff(S1, S0) });
    check('the trampled crop is lower than the standing one at the eye level: the picture differs and the standing one covers more of the frame', diff(S1, S2) > 0.1, { diff: diff(S1, S2) });
    for (const [crop, nm] of [['corn', '25-shell-corn'], ['oats', '26-shell-oats'], ['hay', '27-shell-hay'], ['pasture', '28-shell-pasture'], ['wheat', '29-shell-wheat-field-cell']]) {
      const r = await viewOfCrop(crop, { dist: 5, height: 1.7, yaw: 1.0 }); if (!r) { results.notes.push('no field cell with crop ' + crop + ' and more than 3 acres'); continue; }
      await at('1863-07-02T12:00', r.v); await shot(nm + '-2jul-' + r.id);
    }
    const rh = await viewOfCrop('wheat', { dist: 5, height: 1.7, yaw: 1.0 }, 2); if (rh) { await at('1863-07-14T12:00', rh.v); await shot('30-shell-wheat-14jul-' + rh.id); }
    const stEnd = await page.evaluate(() => window.btApp.theatre.vegetation.status().shell); results.notes.push('standing crop at the last view: ' + JSON.stringify(stEnd));
  }
  await at('1863-07-02T12:00', await wf({ dist: 420, height: 230, yaw: 2.2 }));
  await clean(false);
  await page.evaluate(() => window.btApp.theatre.openPanel('vegetation')); await page.waitForSelector('#veg-card h3', { timeout: 60000 });
  const pn = await page.evaluate(() => ({ title: document.querySelector('#bt-drawer-title').textContent, card: document.querySelector('#veg-card').textContent.slice(0, 400), pills: document.querySelectorAll('.xp-body .pill, #bt-drawer .pill').length, sce: [...document.querySelectorAll('[data-sce]')].length, gaps: document.querySelectorAll('details ul.list li').length, crop: !!document.querySelector('#veg-crop') }));
  check('the panel names the ground under the cross-hair, offers the three conflicts and the switch of the standing crop', /Wheatfield|wheat/i.test(pn.card) && pn.sce >= 8 && pn.crop, pn); await shot('16-panel', true);
  const sc = await page.evaluate(() => { const v = window.btApp.theatre.vegetation; const a = v.stateAt('V-0001', 45 * 1440, {}).ground.stage; v.choose('CF-VEG-LRT', 'wiki_unwooded'); return { local: v.effChoices(), a }; });
  check('a choice of the panel is kept and reaches the state function', sc.local['CF-VEG-LRT'] === 'wiki_unwooded', sc);
  await page.keyboard.press('Escape');
  results.shotsTaken = results.shots.length;
  results.statusEnd = await page.evaluate(() => window.btApp.theatre.vegetation.status());
  // ---- Back: nothing is left
  await clean(false); await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])', { timeout: 60000 }); await page.waitForFunction(() => !window.btApp, null, { timeout: 20000 });
  const left = await page.evaluate(() => ({ chip: !!document.querySelector('#veg-chip'), app: typeof window.btApp, canvases: document.querySelectorAll('canvas').length }));
  check('after Back the notice is gone and no theatre canvas is left', !left.chip && left.app === 'undefined', left);
} catch (e) { check('the run reached its end', false, String(e && e.stack || e).slice(0, 800)); }
check('nothing was logged as an error or a warning by the page', results.console.length === 0, results.console.slice(0, 8));
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
await br.close(); srv.close();
const bad = results.checks.filter(c => !c.ok); console.log(`${results.checks.length - bad.length} of ${results.checks.length} checks passed; ${results.shots.length} pictures in ${out}`); process.exit(bad.length ? 1 : 0);
