// v10-skin.mjs - "a new skin takes under 50 lines": do it.  The skin (tmp/pitch-anim/verify/proto-copy/src/skins/ribbon.mjs, a COPY of the prototype tree: the prototype itself is not touched) is written
// against the skin kit, registered with one import and one array entry, built with `node build.mjs`, then
//   1. its length is measured (lines as written, longest line, characters, lines when wrapped at 100 columns, and what it imports: the kit it leans on)
//   2. the repo's own conformance check (checkSkin) and the repo's skin tests are run on it
//   3. the built page is driven in real Chrome: the skin appears in the Tuning Studio list, in the About legend, and a zero-overlap sweep on PAINTED ink (witness) is run for it
//   4. the zero-build route: a raw skin object registered at run time through window.__studio.kernel.skins.register (no build) in the ORIGINAL page
//   node v10-skin.mjs -> results/v10-skin.json  (needs the copy; see the commands in the report)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { serve, launch, PROTO, WORK, SHOTS, args, writeJson, sleep } from './lib.mjs';
import { firstTicks, loadKeyframes } from './srcdata.mjs';

const COPY = path.join(WORK, 'proto-copy'); const out = { generated: new Date().toISOString(), checks: [], defects: [] };
// ---- 0. prepare the copy (the prototype itself is never written): copy src tokens data build.mjs test, add skin/ribbon.mjs, register it (one import + one array entry), build; a second tree with a token doc string
//         shorter than 6 characters is built to make battle-studio-BAD.html
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:'));
function prepare() {
  const mk = (dir, ribbonText) => {
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    for (const d of ['src', 'tokens', 'data', 'test']) fs.cpSync(path.join(PROTO, d), path.join(dir, d), { recursive: true });
    fs.copyFileSync(path.join(PROTO, 'build.mjs'), path.join(dir, 'build.mjs')); fs.writeFileSync(path.join(dir, 'src', 'skins', 'ribbon.mjs'), ribbonText);
    const ip = path.join(dir, 'src', 'skins', 'index.mjs'); let t = fs.readFileSync(ip, 'utf8'); t = t.replace("import { MINIMAL } from './minimal.mjs';", "import { MINIMAL } from './minimal.mjs';\nimport { RIBBON } from './ribbon.mjs';").replace('...MAP_1863, MINIMAL];', '...MAP_1863, MINIMAL, RIBBON];'); fs.writeFileSync(ip, t);
    const b = spawnSync('node', ['build.mjs'], { cwd: dir, encoding: 'utf8' }); if (b.status !== 0) throw new Error('build failed in ' + dir + ': ' + b.stderr);
  };
  const good = fs.readFileSync(path.join(HERE, 'skin', 'ribbon.mjs'), 'utf8');
  mk(COPY, good); const BADDIR = COPY + '-bad'; mk(BADDIR, good.replace("'Plate fill'", "'Plate'")); fs.copyFileSync(path.join(BADDIR, 'battle-studio.html'), path.join(COPY, 'battle-studio-BAD.html')); fs.rmSync(BADDIR, { recursive: true, force: true });
}
prepare();
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')); return ok; };

// ---- 1. length ---------------------------------------------------------------------------------------------------------------------------
const measure = (file) => { const t = fs.readFileSync(file, 'utf8'); const lines = t.split('\n'); if (lines[lines.length - 1] === '') lines.pop(); const code = lines.filter((l) => l.trim() && !l.trim().startsWith('//')); return { file: path.relative(WORK, file), lines: lines.length, codeLines: code.length, chars: t.length, longest: Math.max(...lines.map((l) => l.length)), over100: lines.filter((l) => l.length > 100).length, meanLen: +(t.length / lines.length).toFixed(1), imports: [...t.matchAll(/from '([^']+)'/g)].map((m) => m[1]) }; };
const mine = measure(path.join(COPY, 'src', 'skins', 'ribbon.mjs')); const minimal = measure(path.join(PROTO, 'src', 'skins', 'minimal.mjs'));
const kitLines = ['kit.mjs', 'semantics.mjs', 'glyphs.mjs'].map((f) => [f, measure(path.join(PROTO, 'src', 'skins', f)).lines]);
// wrap a source at 100 columns the way a formatter would: count the lines a hard wrap at 100 columns (breaking at spaces) would need
const wrapCount = (file, cols = 100) => { let n = 0; for (const l of fs.readFileSync(file, 'utf8').split('\n')) { if (!l.length) { n++; continue; } n += Math.max(1, Math.ceil(l.length / cols)); } return n - 1; };
mine.wrapped100 = wrapCount(path.join(COPY, 'src', 'skins', 'ribbon.mjs')); minimal.wrapped100 = wrapCount(path.join(PROTO, 'src', 'skins', 'minimal.mjs'));
out.length = { ribbon: mine, minimal, kitLines, kitTotal: kitLines.reduce((a, b) => a + b[1], 0) };
console.log(JSON.stringify(out.length));
check('the skin I wrote has fewer than 50 lines as written (' + mine.lines + ' lines, longest ' + mine.longest + ' columns, ' + mine.over100 + ' lines over 100 columns)', mine.lines < 50, mine);
check('the same skin hard-wrapped at 100 columns needs fewer than 50 lines (' + mine.wrapped100 + ')', mine.wrapped100 < 50, { wrapped100: mine.wrapped100 });
check('the prototype\'s own "50-line" skin (minimal.mjs): ' + minimal.lines + ' lines as written but ' + minimal.chars + ' characters, longest line ' + minimal.longest + ', ' + minimal.over100 + ' lines over 100 columns; wrapped at 100 columns ' + minimal.wrapped100 + ' lines', minimal.wrapped100 < 50, { wrapped100: minimal.wrapped100 });

// ---- 2. build + conformance + the repo's skin tests --------------------------------------------------------------------------------------------
const b = spawnSync('node', ['build.mjs'], { cwd: COPY, encoding: 'utf8' }); check('node build.mjs in the copy succeeds with the skin registered by one import and one array entry', b.status === 0, b.stdout.trim().split('\n').pop());
const idx = fs.readFileSync(path.join(COPY, 'src', 'skins', 'index.mjs'), 'utf8'); const diffLines = idx.split('\n').filter((l) => /ribbon|RIBBON/i.test(l)); out.registration = diffLines; check('registration costs exactly one import line and one array entry in skins/index.mjs', diffLines.length === 2, diffLines);
const tests = spawnSync('node', ['--test', 'test/skins.test.mjs', 'test/extend.test.mjs'], { cwd: COPY, encoding: 'utf8', timeout: 300000 });
const tail = (tests.stdout || '').split('\n').filter((l) => /^# (tests|pass|fail)/.test(l)); const ribbonMentions = (tests.stdout || '').split('\n').filter((l) => /ribbon/i.test(l)).slice(0, 6);
check('the repo\'s own skin tests pass with the new skin present (' + tail.join(', ') + ')', tests.status === 0, { tail, ribbonMentions, stderr: (tests.stderr || '').slice(0, 300) });
out.repoTests = { status: tests.status, tail, ribbonMentions };
// conformance check of the repo's contract applied explicitly (ink inside the footprint) on tiles of every kind
const conf = spawnSync('node', ['-e', `
import('${path.join(COPY, 'src', 'skins', 'contract.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:')}').then(async (c) => {
  const { RIBBON } = await import('${path.join(COPY, 'src', 'skins', 'ribbon.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:')}');
  const { DEFAULT_FOOTPRINT } = await import('${path.join(COPY, 'src', 'layout', 'spec.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:')}');
  const spec = { ...DEFAULT_FOOTPRINT, ...RIBBON.footprint }; const tm = { safety: 1, width: (f, s) => s.length * 6.6 + 1 };
  const mk = (o) => ({ key: 'k', kind: 'leaf', n: 1, w: 90, h: 20, scale: 1, opacity: 1, solid: true, side: 'union', arm: 'infantry', short: '12 NY', badge: null, ratio: 0.5, strength: 100, disposition: 'Line of Battle', selected: false, displaced: false, ageTicks: 3, ageMin: 3, ageMax: 3, moving: false, unit: { kind: 'regiment', inOob: true, arm: 'infantry', chain: [], side: 'union' }, members: null, label: null, nameKind: 'regiment', travelling: false, entering: false, ...o });
  const tiles = []; for (const side of ['union', 'confederate', 'unknown', 'mixed']) for (const arm of ['infantry', 'cavalry', 'artillery']) for (const sel of [false, true]) tiles.push(mk({ side, arm, selected: sel, key: side + arm + sel }));
  tiles.push(mk({ kind: 'agg', n: 5, badge: 'x5', short: 'III/4', side: 'mixed', arm: 'mixed', unit: null, w: 96, nameKind: 'brigade' }));
  console.log(JSON.stringify({ tiles: tiles.length, problems: c.checkSkin(RIBBON, spec, tiles, tm) }));
});`], { encoding: 'utf8' });
let confRes = null; try { confRes = JSON.parse((conf.stdout || '').trim().split('\n').pop()); } catch { confRes = { error: (conf.stderr || conf.stdout || '').slice(0, 400) }; }
check('checkSkin (ink inside the footprint box) reports no problem on 25 tiles (4 sides x 3 arms x selected + an aggregate)', confRes && confRes.problems && confRes.problems.length === 0, confRes);

// ---- 3. real Chrome on the built copy -------------------------------------------------------------------------------------------------------
const first = firstTicks(loadKeyframes().units); const srvC = await serve(COPY, 9709);
const s = await launch({ port: 9709, witness: true, query: 'welcome=0&manual=1', profile: 'skin' });
try {
  const P = s.page;
  const regs = await P.evaluate(() => window.__studio.kernel.skins.list().map((k) => k.id)); out.registered = regs; check('the page registers the new skin (ids: ' + regs.length + ')', regs.includes('ribbon'), regs);
  await P.evaluate(({ first }) => { const R = window.__rec; R.keep = true; R.install({ firstTick: first, dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); window.__studio.engine.tuning.set('skin.id', 'ribbon'); }, { first });
  await P.evaluate(() => { for (let i = 0; i < 60; i++) window.__studio.step(1); });
  // appears in the Tuning Studio's skin list and in the About legend
  const tune = await P.evaluate(() => { const S = window.__studio; S.ui.panelOpen = false; S.ui.togglePanel('tune'); const sel = document.querySelector('#panel .row[data-id="skin.id"] select'); const opts = sel ? [...sel.options].map((o) => o.value) : []; S.ui.panelOpen = false; S.ui.togglePanel('about'); const legend = [...document.querySelectorAll('#panel .legend')].map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)); return { opts, legend, cur: sel && sel.value }; });
  check('the skin is listed in the Tuning Studio skin dropdown and its legend (generated from sample()) shows in About: ' + tune.legend.length + ' rows', tune.opts.includes('ribbon') && tune.legend.length >= 9, tune);
  await P.screenshot({ path: path.join(SHOTS, 'v10-ribbon-about.png') });
  // sweep: zero-overlap on painted ink for the new skin
  const rows = []; const ticks = [1, 120, 293, 346, 451, 556, 620]; const zooms = [12, 13.5, 14, 15, 16, 17, 18];
  for (const zoom of zooms) for (const tick of ticks) {
    const r = await P.evaluate(({ zoom, tick }) => { const S = window.__studio; const E = S.engine; const R = window.__rec; E.select(null); E.transport.pause(); R.frames.length = 0; E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
      const settle = (max) => { let n = 0; let still = 0; let last = -1; for (; n < max; n++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; } return n; };
      settle(300); if (zoom >= 13) { const f = E.frame; const live = f.tiles.filter((t) => t.life === 'live'); let best = null; let bc = -1; for (const a of live) { let c = 0; for (const b of live) if (Math.abs(a.ax - b.ax) < 90 && Math.abs(a.ay - b.ay) < 90) c++; if (c > bc) { bc = c; best = a; } } if (best) { const ll = E.camera.fromScreen(best.x + f.view.dx, best.y + f.view.dy); E.moveTo({ lat: ll[1], lng: ll[0], zoom: E.camera.zoom }, { glide: false, safe: false }); settle(300); } }
      const q = R.last; const px = R.pixelCheck(); return { tiles: q.tiles, chips: q.chips, ss: q.ss, sd: q.sd, gap: q.minGapCC, noInk: q.noInk, out: q.inkOutside, mx: q.maxExcess, missing: q.missing, early: q.early, unexplained: px.unexplained }; }, { zoom, tick });
    rows.push({ zoom, tick, ...r });
  }
  const sum = (o) => o.cc + o.lc + o.lp + o.cp + o.ll; const worst = { ss: Math.max(...rows.map((r) => sum(r.ss))), sd: Math.max(...rows.map((r) => sum(r.sd))), noInk: Math.max(...rows.map((r) => r.noInk)), out: Math.max(...rows.map((r) => r.out)), mx: Math.max(...rows.map((r) => r.mx)), unexplained: Math.max(...rows.map((r) => r.unexplained)), minGap: Math.min(...rows.filter((r) => r.gap !== null).map((r) => r.gap)), missing: Math.max(...rows.map((r) => r.missing)) };
  out.sweep = { samples: rows.length, worst }; check('the new skin: zero solid overlaps, no ink outside the footprint box, no unexplained pixel on ' + rows.length + ' settled frames (worst ' + JSON.stringify(worst) + ')', worst.ss === 0 && worst.out === 0 && worst.unexplained === 0 && worst.noInk <= 1, worst);
  await P.evaluate(() => { const S = window.__studio; S.engine.transport.seek(556, { glide: false }); S.engine.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 16 }, { glide: false, safe: false }); for (let i = 0; i < 160; i++) S.step(1); S.ui.panelOpen = false; S.ui.renderChrome(); for (let i = 0; i < 10; i++) S.step(1); });
  await P.screenshot({ path: path.join(SHOTS, 'v10-ribbon-angle.png') });
  out.skinErrors = s.errors; out.requests = s.requests;
} finally { await s.close(); srvC.close(); }

// ---- 4. the zero-build route in the ORIGINAL page ----------------------------------------------------------------------------------------------
const srvO = await serve(PROTO, 9708); const s2 = await launch({ port: 9708, witness: true, query: 'welcome=0&manual=1', profile: 'skin2' });
try {
  const P = s2.page;
  const rt = await P.evaluate(() => {
    const S = window.__studio; const E = S.engine;
    S.kernel.skins.register('rt-plain', { label: 'Runtime plain (11 lines)', footprint: { chipH: 18, glyphW: 6 }, draw: { tile(c, t, env) { const w = t.w; const h = t.h; const r = env.spec.ring; c.fillStyle = t.side === 'union' ? '#1f5aa6' : t.side === 'confederate' ? '#8c3b2b' : t.side === 'mixed' ? '#444' : '#8a5a00'; c.fillRect(-w / 2 + r, -h / 2 + r, w - 2 * r, h - 2 * r); c.fillStyle = '#fff'; c.font = '700 11px system-ui, sans-serif'; c.textBaseline = 'middle'; c.fillText(t.short + (t.badge ? ' ' + t.badge : ''), -w / 2 + r + 3, 0); } } });
    E.tuning.set('skin.id', 'rt-plain'); for (let i = 0; i < 60; i++) S.step(1); const ids = S.kernel.skins.list().map((k) => k.id); const R = window.__rec; R.keep = true; R.install({ dom: [] });
    E.transport.seek(556, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 15 }, { glide: false, safe: false }); let still = 0; let last = -1; for (let n = 0; n < 300; n++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
    const q = R.last; return { ids: ids.length, listed: ids.includes('rt-plain'), chips: q.chips, ss: q.ss, noInk: q.noInk, out: q.inkOutside, skinNow: E.tok('skin.id'), tileBoxChip: E.frame.tiles.find((t) => t.kind === 'leaf').h };
  });
  out.runtimeRegistration = rt; check('zero-build route: an 11-line raw skin object registered at run time through __studio.kernel.skins.register draws, adapts the layout (chip height ' + rt.tileBoxChip + ' px) and keeps zero overlaps', rt.listed && rt.skinNow === 'rt-plain' && rt.chips > 10 && sum0(rt.ss) === 0, rt);
} finally { await s2.close(); srvO.close(); }
function sum0(o) { return o.cc + o.lc + o.lp + o.cp + o.ll; }

// ---- 5. the failure mode: a skin with a token whose doc string is shorter than 6 characters (my first draft) --------------------------------------------------------------------------
{
  const { chromium } = await import('playwright-core'); const { CHROME } = await import('./lib.mjs'); const srvB = await serve(COPY, 9713); let b = null;
  try {
    const bad = path.join(COPY, 'battle-studio-BAD.html');
    if (fs.existsSync(bad)) {
      b = await chromium.launch({ executablePath: CHROME, headless: true }); const pg = await b.newPage(); const msgs = []; pg.on('pageerror', (e) => msgs.push('pageerror: ' + e.message.slice(0, 160))); pg.on('console', (m) => { if (m.type() === 'error') msgs.push('console.error: ' + m.text().slice(0, 160)); });
      await pg.goto('http://127.0.0.1:9713/battle-studio-BAD.html?fresh=1&welcome=0', { waitUntil: 'load', timeout: 20000 }); await new Promise((r) => setTimeout(r, 3000));
      const st = await pg.evaluate(() => ({ ready: !!(window.__studio && window.__studio.ready), splashGone: !!document.getElementById('splash') && document.getElementById('splash').classList.contains('gone'), canvasDrawn: (() => { try { const c = document.getElementById('map'); return c.width > 0; } catch { return false; } })() }));
      out.badSkinBoot = { ...st, errors: msgs.slice(0, 3), buildPassed: true }; await pg.screenshot({ path: path.join(SHOTS, 'v10-bad-skin-boot.png') });
      check('a skin whose token doc string is too short passes `node build.mjs` and then keeps the WHOLE page from starting (the error is thrown at load, not at build): studio ready = ' + st.ready + ', errors ' + JSON.stringify(msgs.slice(0, 1)), st.ready === true, out.badSkinBoot);
    } else out.badSkinBoot = 'no BAD build saved';
  } finally { if (b) await b.close(); srvB.close(); }
}

out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length }; writeJson('v10-skin.json', out); console.log(JSON.stringify(out.summary));
