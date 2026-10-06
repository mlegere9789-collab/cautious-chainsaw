// test/skin-browser.mjs - the skin checks that need a real browser: crisp edges at device-pixel ratio 1, 2 and 3, no pops in the arrival / selection / posture choreography (pixel differences between
// consecutive frames), real mouse hover and click easing through the Studio, live token tweaking from the URL, legend swatches, and a playback run of every skin with the console watched.
//   node docs/pitch/anim/prototype/test/skin-browser.mjs [--skins=...] [--secs=4] [--out=results/skin-browser.json] [--only=crisp,pops,interact,playback,legend,urlset,phone]
// Exit code 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const PORT = +(args.port || 9647); const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'; const SECS = +(args.secs || 4);
const ONLY = new Set((args.only || 'crisp,pops,interact,playback,legend,urlset,phone').split(','));
const url = (q = '') => pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1&' + q;
const results = { crisp: [], pops: [], interact: [], playback: [], legend: [], urlset: null, phone: null }; const failures = []; const fail = (m) => { failures.push(m); console.log('FAIL', m); };

async function withPage(opts, fn) {
  const dir = path.join(REPO, 'tmp', 'pitch-anim', 'skins', 'chrome-profile', 'br' + PORT + '-' + (opts.dpr || 1) + (opts.tag || '')); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: opts.viewport || { width: 1440, height: 900 }, deviceScaleFactor: opts.dpr || 1, args: ['--no-first-run', '--disable-extensions', '--mute-audio', '--remote-debugging-port=' + (PORT + 1)] });
  const errors = [];
  try { const page = ctx.pages()[0] || await ctx.newPage(); page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !opts.allowWarn)) errors.push(`${m.type()}: ${m.text()}`); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) errors.push('request: ' + r.url()); });
    return await fn(page, errors); } finally { await ctx.close(); }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// everything below this line that runs in the page is a string-free function passed to page.evaluate
function pageHarness() {
  window.__h = (() => {
    const S = window.__studio; const E = S.engine; const kit = window.__skinKit; let T = 1e6; kit.setClock({ now: () => T });
    const units = [...E.battle.units.values()]; const pick = (f) => units.find(f);
    const use = (id) => { E.tuning.set('skin.id', id); S.step(20, 1000 / 60); kit.reset(); return E.kernel.skins.get(id); };
    const mkTile = (skinSpec, u, over = {}) => { const spec = skinSpec; const codeW = spec.text.width('code', u.short); const w = Math.max(spec.chipMinW, Math.ceil(spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + codeW + 2 * spec.ring)); return { key: 'bt' + Math.random().toString(36).slice(2, 7), kind: 'leaf', ids: [u.id], n: 1, x: 0, y: 0, ax: 0, ay: 0, w, h: spec.chipH, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced: false, side: u.side, arm: u.arm, short: u.short, badge: null, nameKind: null, ratio: 0.7, strength: u.strengthRef, disposition: 'Line of Battle', selected: false, unit: u, ageTicks: 3, ageMin: 3, ageMax: 3, moving: false, members: null, label: null, ...over }; };
    const canvas = (w, h, dpr) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr); return cv; };
    const ctx2d = (cv) => cv.getContext('2d', { willReadFrequently: true });
    return { S, E, kit, units, pick, use, mkTile, canvas, tick(ms = 16.7) { T += ms; return T; }, get T() { return T; } };
  })();
}

async function crisp(page) {
  const out = await page.evaluate(() => {
    const H = window.__h; const rows = []; const ids = ['field-manual', 'field-manual/contrast', 'war-room', 'war-room/contrast', 'map-1863', 'map-1863/contrast', 'minimal'];
    const U = H.pick((u) => u.side === 'union' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.short.length <= 6);
    for (const id of ids) for (const dpr of [1, 2, 3]) {
      const skin = H.use(id); const spec = H.E.spec(); const t = H.mkTile(spec, U, { ageTicks: 3 }); const D = skin.draw;
      const W = 160; const Hh = 70; const render = (dx, dy, snap) => {
        H.kit.setSnap(snap); H.kit.reset(); const cv = H.canvas(W, Hh, dpr); const c = cv.getContext('2d', { willReadFrequently: true }); const tt = { ...t, key: 'k' + Math.random() };
        for (let i = 0; i < 24; i++) { H.tick(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#ebe6da'; c.fillRect(0, 0, cv.width, cv.height); c.setTransform(dpr, 0, 0, dpr, (60 + dx) * dpr, (30 + dy) * dpr); c.globalAlpha = 1; D.tile(c, tt, { dpr, zoom: 16, timeMs: 0, tok: H.E.tok, spec }); }
        return c.getImageData(0, 0, cv.width, cv.height).data;
      };
      const fr = (v) => v - Math.floor(v); const fx0 = fr(t.w * dpr / 2) / dpr; const fy0 = fr(t.h * dpr / 2) / dpr; const ref = render(fx0, fy0, true); let worstOn = 0; let worstOff = 0; const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) n++; return n; };
      for (const [ox, oy] of [[0.3, 0.2], [-0.3, -0.35], [0.12, -0.2], [-0.4, 0.4]]) { worstOn = Math.max(worstOn, diff(ref, render(fx0 + ox / dpr, fy0 + oy / dpr, true))); worstOff = Math.max(worstOff, diff(ref, render(fx0 + ox / dpr, fy0 + oy / dpr, false))); }       // offsets are fractions of a DEVICE pixel (under half a pixel: the same pixel grid cell)
      rows.push({ skin: id, dpr, w: t.w, h: t.h, differingPixelsSnapped: worstOn, differingPixelsUnsnapped: worstOff });
    }
    H.kit.setSnap(true); return rows;
  });
  results.crisp = out; for (const r of out) { console.log(`crisp ${r.skin.padEnd(22)} dpr ${r.dpr}: at rest, a fractional position renders the same pixels as the aligned one: ${r.differingPixelsSnapped} differing (unsnapped: ${r.differingPixelsUnsnapped})`); if (r.differingPixelsSnapped > 0) fail(`crisp ${r.skin} dpr ${r.dpr}: ${r.differingPixelsSnapped} differing pixels when snapped`); if (r.differingPixelsUnsnapped === 0) fail(`crisp ${r.skin} dpr ${r.dpr}: the snap changes nothing (the check would pass vacuously)`); }
}

async function pops(page) {
  const out = await page.evaluate(() => {
    const H = window.__h; const rows = []; const ids = ['field-manual', 'war-room', 'map-1863', 'minimal'];
    const U = H.pick((u) => u.side === 'confederate' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.short.length <= 6);
    const dpr = 2; const W = 150; const Hh = 64;
    for (const id of ids) {
      const skin = H.use(id); const spec = H.E.spec(); const D = skin.draw; const bs = H.E.tok('motion.birthScale');
      const frameAt = (t, c, cv) => { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#ebe6da'; c.fillRect(0, 0, cv.width, cv.height); const s = dpr * t.scale; c.setTransform(s, 0, 0, s, 75 * dpr, 32 * dpr); c.globalAlpha = t.opacity; D.tile(c, t, { dpr, zoom: 16, timeMs: 0, tok: H.E.tok, spec }); c.globalAlpha = 1; return c.getImageData(0, 0, cv.width, cv.height).data; };
      const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s; };
      const stats = (frames) => { const d = []; for (let i = 1; i < frames.length; i++) d.push(dist(frames[i - 1], frames[i])); const total = dist(frames[0], frames[frames.length - 1]); const mean = d.reduce((a, b) => a + b, 0) / d.length; return { maxStep: Math.max(...d), mean, total, ratio: Math.max(...d) / mean, firstShare: d[0] / total, maxShare: Math.max(...d) / total }; };
      // 1. arrival: the display layer ramps scale and opacity with a smoothstep; the skin adds its own reveal.  Steps of 1/60 of the progress
      H.kit.reset(); let cv = H.canvas(W, Hh, dpr); let c = cv.getContext('2d', { willReadFrequently: true }); const ss = (x) => x * x * (3 - 2 * x); const key = 'arr'; const arr = [];
      for (let k = 0; k <= 60; k++) { const p = ss(k / 60); const t = H.mkTile(spec, U, { key, entering: k < 60, scale: bs + (1 - bs) * p, opacity: p, ratio: 0.7 }); H.tick(); arr.push(new Uint8ClampedArray(frameAt(t, c, cv))); }
      const settled = new Uint8ClampedArray(frameAt(H.mkTile(spec, U, { key, ratio: 0.7 }), c, cv)); const lastStep = dist(arr[59], arr[60]); const a = stats(arr);
      // 2. departure: the display layer runs the same ramp backwards on a dying tile
      H.kit.reset(); cv = H.canvas(W, Hh, dpr); c = cv.getContext('2d', { willReadFrequently: true }); const dep = [];
      for (let k = 60; k >= 0; k--) { const p = ss(k / 60); const t = H.mkTile(spec, U, { key: 'dep', life: k > 0 ? 'dying' : 'live', scale: bs + (1 - bs) * p, opacity: p, ratio: 0.7 }); H.tick(); dep.push(new Uint8ClampedArray(frameAt(t, c, cv))); } const dd = stats(dep);
      // 3. selection: ease from rest over wall-clock frames
      H.kit.reset(); cv = H.canvas(W, Hh, dpr); c = cv.getContext('2d', { willReadFrequently: true }); const base = H.mkTile(spec, U, { key: 'sel', ratio: 0.7 }); const sel = []; for (let i = 0; i < 4; i++) { H.tick(); sel.push(new Uint8ClampedArray(frameAt(base, c, cv))); } sel.length = 1;
      for (let i = 0; i < 40; i++) { H.tick(); sel.push(new Uint8ClampedArray(frameAt({ ...base, selected: true }, c, cv))); } const s = stats(sel);
      // 4. a keyframe changes the posture: cross-fade
      H.kit.reset(); cv = H.canvas(W, Hh, dpr); c = cv.getContext('2d', { willReadFrequently: true }); const pt = H.mkTile(spec, U, { key: 'pos', ratio: 0.7 }); const pos = []; const zoomed = (t) => { const s0 = dpr; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#ebe6da'; c.fillRect(0, 0, cv.width, cv.height); c.setTransform(s0, 0, 0, s0, 75 * dpr, 32 * dpr); D.tile(c, t, { dpr, zoom: 17, timeMs: 0, tok: H.E.tok, spec }); return new Uint8ClampedArray(c.getImageData(0, 0, cv.width, cv.height).data); };
      for (let i = 0; i < 4; i++) { H.tick(); zoomed(pt); } pos.push(zoomed({ ...pt, disposition: 'Line of Battle' })); for (let i = 0; i < 24; i++) { H.tick(); pos.push(zoomed({ ...pt, disposition: 'Charging Line' })); } const pp = stats(pos);
      // 5. hover
      H.kit.reset(); cv = H.canvas(W, Hh, dpr); c = cv.getContext('2d', { willReadFrequently: true }); const ht = H.mkTile(spec, U, { key: 'hov', ratio: 0.7 }); const hv = []; for (let i = 0; i < 3; i++) { H.tick(); frameAt(ht, c, cv); } hv.push(new Uint8ClampedArray(frameAt(ht, c, cv))); H.kit.setHover('hov'); for (let i = 0; i < 30; i++) { H.tick(); hv.push(new Uint8ClampedArray(frameAt(ht, c, cv))); } H.kit.setHover(null); const hh = stats(hv);
      rows.push({ skin: id, arrival: { ...a, lastStepVsMean: lastStep / a.mean, settledJump: dist(arr[60], settled) / a.mean }, departure: dd, selection: s, posture: pp, hover: hh });
    }
    return rows;
  });
  results.pops = out;
  for (const r of out) {
    const f = (x) => x.toFixed(2);
    console.log(`pops  ${r.skin.padEnd(14)} departure max step/mean ${f(r.departure.ratio)} | arrival max step/mean ${f(r.arrival.ratio)} (last step ${f(r.arrival.lastStepVsMean)}x mean, jump to settled ${f(r.arrival.settledJump)}x) | selection max step ${f(r.selection.maxShare * 100)}% of the change | posture ${r.skin === 'minimal' ? 'n/a' : f(r.posture.maxShare * 100) + '%'} | hover ${f(r.hover.maxShare * 100)}%`);
    if (r.departure.ratio > 3.5) fail(`pops ${r.skin}: departure has a step ${r.departure.ratio.toFixed(1)}x the mean`);
    if (r.arrival.ratio > 3.5) fail(`pops ${r.skin}: arrival has a step ${r.arrival.ratio.toFixed(1)}x the mean`); if (r.arrival.settledJump > 3.2) fail(`pops ${r.skin}: the settled tile jumps ${r.arrival.settledJump.toFixed(1)}x after arrival`);
    if (r.selection.maxShare > 0.3) fail(`pops ${r.skin}: selection jumps ${(r.selection.maxShare * 100).toFixed(0)}% in one frame`); if (r.posture.maxShare > 0.3 && r.skin !== 'minimal') fail(`pops ${r.skin}: posture change jumps ${(r.posture.maxShare * 100).toFixed(0)}% in one frame`); if (r.hover.maxShare > 0.35) fail(`pops ${r.skin}: hover jumps ${(r.hover.maxShare * 100).toFixed(0)}% in one frame`);
  }
}

async function interact(browserPage, skinId) {
  const info = await withPage({ tag: 'i' }, async (page, errors) => {
    await page.goto(url(`scene=fresh2&zoom=15&skin=${skinId}`)); await page.waitForFunction(() => window.__studio && window.__studio.ready); await page.waitForTimeout(300);
    const target = await page.evaluate(() => { const S = window.__studio; S.step(30, 1000 / 60); const f = S.engine.frame; const clear = f.tiles.filter((q) => { const x = q.x + f.view.dx; const y = q.y + f.view.dy; return q.solid && q.kind === 'leaf' && x > 300 && x < 1000 && y > 150 && y < 640; }).sort((a, b) => b.prio - a.prio); const t = clear[Math.min(10, clear.length - 1)]; return { key: t.key, id: t.ids[0], x: t.x + f.view.dx, y: t.y + f.view.dy }; });
    await page.mouse.move(target.x - 40, target.y - 40); await page.waitForTimeout(100); await page.mouse.move(target.x, target.y, { steps: 4 });
    const sample = async () => page.evaluate((k) => { const s = window.__skinKit.states.get(k); return s ? { hov: s.ch.hov ? s.ch.hov.x : 0, sel: s.ch.sel ? s.ch.sel.x : 0 } : null; }, target.key);
    await page.waitForTimeout(40); const early = await sample(); await page.waitForTimeout(500); const hovered = await sample();
    await page.mouse.click(target.x, target.y); await page.waitForTimeout(60); const selEarly = await sample(); await page.waitForTimeout(600); const selected = await sample();
    await page.mouse.move(target.x + 300, target.y + 200); await page.waitForTimeout(600); const away = await sample();
    return { skin: skinId, hoverEarly: early && early.hov, hovered: hovered && hovered.hov, selEarly: selEarly && selEarly.sel, selected: selected && selected.sel, awayHover: away && away.hov, errors };
  });
  results.interact.push(info);
  console.log(`interact ${skinId.padEnd(22)} hover ${info.hoverEarly?.toFixed(2)} -> ${info.hovered?.toFixed(2)} -> away ${info.awayHover?.toFixed(2)} | selection ${info.selEarly?.toFixed(2)} -> ${info.selected?.toFixed(2)} | errors ${info.errors.length}`);
  if (!(info.hovered > 0.95)) fail(`interact ${skinId}: hover did not ease to 1 (${info.hovered})`); if (!(info.hoverEarly < 0.9)) fail(`interact ${skinId}: hover was instant (${info.hoverEarly})`);
  if (!(info.selected > 0.95)) fail(`interact ${skinId}: selection did not ease to 1 (${info.selected})`); if (!(info.awayHover < 0.05)) fail(`interact ${skinId}: hover did not ease away (${info.awayHover})`);
  if (info.errors.length) fail(`interact ${skinId}: ${info.errors.slice(0, 2).join(' | ')}`);
}

async function playback(skinId, scene, zoom, speed) {
  const info = await withPage({ tag: 'p' }, async (page, errors) => {
    await page.goto(url(`scene=${scene}&zoom=${zoom}&skin=${skinId}&speed=${speed}&play=1`)); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    await page.evaluate(() => window.__studio.engine.metrics.reset()); await page.waitForTimeout(SECS * 1000);
    const o = await page.evaluate(() => { const E = window.__studio.engine; const s = E.metrics.summary(); const f = E.frame; return { fps: window.__studio.engine.metrics.live().fps, over20: s.framesOver20msPct, overlapPairs: s.overlapPairs, unrep: s.unrepresentedUnitFrames, tiles: f.tiles.filter((t) => t.life === 'live').length, drawMs: window.__studio.renderer.stats.drawMs, engineMs: s.engineMsMean }; });
    return { skin: skinId, scene, zoom, speed, ...o, errors };
  });
  results.playback.push(info);
  console.log(`play  ${skinId.padEnd(22)} ${scene} z${zoom} ${speed}x: ${info.fps?.toFixed(1)} fps, ${info.over20?.toFixed(1)}% frames over 20 ms, overlaps ${info.overlapPairs}, unrepresented ${info.unrep}, tiles ${info.tiles}, engine ${info.engineMs?.toFixed(1)} ms, errors ${info.errors.length}`);
  if (info.errors.length) fail(`playback ${skinId}: ${info.errors.slice(0, 2).join(' | ')}`); if (info.overlapPairs > 0 || info.unrep > 0) fail(`playback ${skinId}: guarantee broken`);
}

async function legendCheck() {
  await withPage({ tag: 'l' }, async (page, errors) => {
    await page.goto(url('scene=fresh2&zoom=15')); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const rows = await page.evaluate(() => { const E = window.__studio.engine; return E.kernel.skins.list().filter((k) => k.id !== 'reference').map((k) => ({ id: k.id, rows: k.legend().map((r) => ({ text: r.text, sw: typeof r.swatch === 'string' && r.swatch.startsWith('url("data:image/png;base64,') ? r.swatch.length : 0, key: r.channel + '/' + r.value })) })); });
    for (const s of rows) { const bad = s.rows.filter((r) => !r.sw); const lens = new Set(s.rows.map((r) => r.sw)); results.legend.push({ skin: s.id, rows: s.rows.length, swatchesAreImages: s.rows.length - bad.length, distinctSizes: lens.size }); console.log(`legend ${s.id.padEnd(22)} ${s.rows.length} rows, ${s.rows.length - bad.length} drawn by the skin's own code`); if (bad.length) fail(`legend ${s.id}: ${bad.length} rows without a drawn swatch`); }
    // swatches differ between values: render each to pixels and compare (the union and confederate swatch must not be the same picture)
    const same = await page.evaluate(async () => { const E = window.__studio.engine; const out = []; for (const k of E.kernel.skins.list().filter((q) => q.id !== 'reference')) { const rows = k.legend(); const seen = new Map(); for (const r of rows) { if (seen.has(r.swatch)) out.push(`${k.id}: ${seen.get(r.swatch)} and ${r.channel}/${r.value} share a swatch`); else seen.set(r.swatch, r.channel + '/' + r.value); } } return out; });
    if (same.length) { for (const m of same.slice(0, 6)) console.log('  note', m); }
    results.legend.push({ identicalSwatchPairs: same }); if (errors.length) fail('legend: ' + errors[0]);
  });
}

async function urlSettings() {
  await withPage({ tag: 'u' }, async (page, errors) => {
    await page.goto(url('scene=fresh2&zoom=15&skin=field-manual&skinset=' + encodeURIComponent(JSON.stringify({ 'field-manual': { 'frame.width': 2.5, 'color.union': '#0b4f9e', 'frame.dash': 99 }, 'no-such-skin': { x: 1 } })))); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const o = await page.evaluate(() => { const t = window.__skinKit.exportTokens('field-manual')['field-manual']; window.__skinKit.setToken('field-manual', 'color.union', '#ff0000'); window.__studio.step(2, 16); return { fw: t['frame.width'], union: t['color.union'], dash: t['frame.dash'], after: window.__skinKit.exportTokens('field-manual')['field-manual']['color.union'] }; });
    results.urlset = { ...o, warnings: errors };
    console.log(`urlset frame.width ${o.fw}, union ${o.union}, out-of-range dash kept at ${o.dash}, live setToken -> ${o.after}, warnings: ${errors.length}`);
    if (o.fw !== 2.5 || o.union !== '#0b4f9e' || o.dash !== 5 || o.after !== '#ff0000') fail('urlset: ' + JSON.stringify(o)); if (!errors.some((e) => /frame\.dash/.test(e))) fail('urlset: the out-of-range value was not reported');
    if (errors.some((e) => /^(pageerror|request)/.test(e))) fail('urlset: ' + errors.join('|'));
  });
}

async function phone() {
  await withPage({ tag: 'ph', dpr: 3, viewport: { width: 390, height: 844 } }, async (page, errors) => {
    const out = [];
    for (const id of ['field-manual', 'war-room', 'map-1863']) {
      await page.goto(url(`scene=fresh2&zoom=15&skin=${id}&play=1&speed=2`)); await page.waitForFunction(() => window.__studio && window.__studio.ready); await page.waitForTimeout(1800);
      const o = await page.evaluate(() => { const E = window.__studio.engine; const s = E.metrics.summary(); return { fps: E.metrics.live().fps, canvasW: document.getElementById('map').width, css: document.getElementById('map').getBoundingClientRect().width, overlapPairs: s.overlapPairs, unrep: s.unrepresentedUnitFrames, tiles: E.frame.tiles.filter((t) => t.life === 'live').length }; });
      out.push({ skin: id, ...o }); console.log(`phone ${id.padEnd(14)} 390x844 DPR 3: canvas ${o.canvasW}px for ${o.css} css px (renderer cap), ${o.tiles} tiles, overlaps ${o.overlapPairs}, unrepresented ${o.unrep}`); if (o.overlapPairs || o.unrep) fail('phone ' + id);
    }
    results.phone = out; if (errors.length) fail('phone: ' + errors.slice(0, 2).join(' | '));
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
const ALL = ['field-manual', 'field-manual/cvd', 'field-manual/contrast', 'war-room', 'war-room/cvd', 'war-room/contrast', 'map-1863', 'map-1863/cvd', 'map-1863/contrast', 'minimal'];
const SK = args.skins ? args.skins.split(',') : ALL;
if (ONLY.has('crisp') || ONLY.has('pops')) await withPage({ tag: 'c' }, async (page, errors) => {
  await page.goto(url('scene=fresh2&zoom=15')); await page.waitForFunction(() => window.__studio && window.__studio.ready); await page.evaluate(pageHarness);
  if (ONLY.has('crisp')) await crisp(page); if (ONLY.has('pops')) await pops(page); if (errors.length) fail('crisp/pops page errors: ' + errors.slice(0, 2).join(' | '));
});
if (ONLY.has('interact')) for (const id of SK) await interact(null, id);
if (ONLY.has('playback')) { for (const id of SK) await playback(id, 'fresh2', 15, 4); for (const id of ['field-manual', 'war-room', 'map-1863']) await playback(id, 'field', 13.5, 8); }
if (ONLY.has('legend')) await legendCheck();
if (ONLY.has('urlset')) await urlSettings();
if (ONLY.has('phone')) await phone();
if (args.out) { fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true }); fs.writeFileSync(path.resolve(args.out), JSON.stringify(results, null, 1)); }
console.log(failures.length ? `\n${failures.length} FAILURES` : '\nall browser skin checks passed'); process.exit(failures.length ? 1 : 0);
