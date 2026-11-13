// Browser harness (not a gate): the loader of the added layers and panels in the real page, on WebGL2 with software GL. The list and two stand-in modules are answered from
// memory by the browser's request routing: nothing is written into src/ext/, and whatever is in src/ext/ is not loaded by this run. It walks: a visit with no list, a visit
// with ?ext=off, a visit with the stand-ins (the More tool, a switch, a panel, a module that fails, the Views block, update, the scene hook, every form a panel function may
// return, Back), and a second entry.
//   node docs/battle-theatre/app/tests/ext-loader-browser.mjs [outDir] [light|full]
// light (default): ?crowd=off&structures=off&fx=off, the quick look at the drawer. full: the shell as a viewer gets it (figures, structures, effects), slow on software GL; it walks only
// the third visit and the second entry, because the first two (no list, ?ext=off) do not depend on what is drawn.
// Writes outDir/results.json and screenshots. Exit code 1 when a check fails. One browser at a time on a shared machine.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../../../..');
const out = path.resolve(process.argv[2] || path.join(REPO, 'tmp/ext-loader-browser')), mode = process.argv[3] === 'full' ? 'full' : 'light', port = +process.env.BT_EXT_PORT || 10823; fs.mkdirSync(out, { recursive: true });
const Q = mode === 'full' ? 'api=webgl2' : 'api=webgl2&crowd=off&structures=off&fx=off&nearR=12&midR=60', WAIT = 600000;
const CTX_KEYS = 'choices,env,history,host,registerLayerToggle,registerPanel,state,structures,theatre,tierMark,urls', FRAME_KEYS = 'cam,dtMs,paused,speed,tMin';

// ---- the stand-in modules
const INDEX = `export default ['demo-layer.mjs', 'demo-broken.mjs'];\n`;
const LAYER = `
const G = (globalThis.__extDemo ||= { inits: 0, disposes: 0, updates: 0, renders: 0, cleanups: 0, hook: 0, last: null, on: false });
let ctx = null, badge = null, on = false, removeHook = null;
const paint = () => {
  if (on && !badge) { badge = document.createElement('div'); badge.id = 'demo-badge'; badge.style.cssText = 'position:absolute;left:50%;top:42%;transform:translateX(-50%);z-index:12;padding:8px 14px;border-radius:8px;background:rgba(20,20,34,.88);color:#ecebe6;font:14px system-ui;pointer-events:none;display:flex;gap:8px;align-items:center';
    badge.innerHTML = 'Stand-in layer is on ' + ctx.tierMark('plausible-procedural'); ctx.theatre.root.append(badge); }
  else if (!on && badge) { badge.remove(); badge = null; }
  G.on = on;
};
export async function init(c) {
  ctx = c; on = false; G.inits++; G.on = false; globalThis.__extReg = c.registerPanel; G.ctxKeys = Object.keys(c).sort().join(','); G.frozen = Object.isFrozen(c); G.choicesType = typeof c.choices; G.choicesN = Object.keys(c.choices()).length; G.choicesSame = c.choices() === c.state.scenario.choices;
  G.api = c.host.api; G.urlsData = c.urls.data; G.hasStructures = !!c.structures; G.stub = !!c.history.meta.stub; G.units = c.history.units.length; G.sameTheatre = c.theatre === window.btApp?.theatre || 'not exposed yet'; G.hasControls = !!c.theatre.controls && !!c.theatre.overlay && typeof c.theatre.openPanel === 'function';
  await new Promise(r => setTimeout(r, 20));
  c.registerLayerToggle('demo-marks', 'Stand-in layer', () => on, v => { on = v; paint(); });
  c.registerPanel('demo-panel', 'Stand-in panel', (body, theatre, scope) => {
    G.renders++;
    body.innerHTML = '<p class="mini" id="demo-p">Drawn at minute ' + theatre.state.t.toFixed(1) + ' of the theatre clock.</p><p style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0" id="demo-pills">' + c.tierMark.tiers.map(t => c.tierMark(t)).join('') + '</p>'
      + '<p id="demo-long">' + c.tierMark('documented (secondary); the spot is plausible-procedural') + '</p><p id="demo-none" style="margin:8px 0">' + c.tierMark('seeded_unverified') + '</p>'
      + '<p><button type="button" class="btn-s" id="demo-btn" data-autofocus>Count</button> <output id="demo-n">0</output></p>';
    let n = 0; scope.on(body.querySelector('#demo-btn'), 'click', () => { body.querySelector('#demo-n').textContent = String(++n); }); scope.add(() => { G.cleanups++; });
  });
  removeHook = c.host.addSceneHook({ scene(pass, R) { G.hook++; G.hookArgs = (pass === c.host.R.gl) + ',' + (R === c.host.R); } });
}
export function update(f) { G.updates++; G.last = { tMin: f.tMin, dtMs: f.dtMs, paused: f.paused, speed: f.speed, camIsCam: f.cam === ctx.theatre.cam, keys: Object.keys(f).sort().join(','), stateT: ctx.state.t }; }
export function dispose() { G.disposes++; delete globalThis.__extReg; if (badge) badge.remove(); badge = null; if (removeHook) removeHook(); removeHook = null; on = false; G.on = false; ctx = null; }
`;
const BROKEN = `
const G = (globalThis.__extDemo ||= {});
export function init(c) { c.registerPanel('broken-panel', 'Never shown', () => {}); throw new Error('stand-in failure for the test'); }
export function update() { G.brokenUpdates = (G.brokenUpdates || 0) + 1; }
export function dispose() { G.brokenDisposes = (G.brokenDisposes || 0) + 1; }
`;

const results = { mode, query: Q, started: new Date().toISOString(), checks: [], notes: [], shots: [] }; let failed = 0;
const check = (name, ok, detail) => { results.checks.push({ name, ok: !!ok, detail: detail === undefined ? undefined : detail }); if (!ok) failed++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined && !ok ? '  ' + JSON.stringify(detail) : '')); };
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ...results, failed, finished: new Date().toISOString() }, null, 1));

const srv = await serve(port), base = `http://127.0.0.1:${port}/app/index.html`;
const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let routeMode = 'absent'; const extRequests = [];
async function session(query) {
  const ctx = await br.newContext({ viewport: { width: 1100, height: 660 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), log = { errors: [], warnings: [], pageerrors: [], failed: [] };
  page.on('console', m => { const t = m.type(), x = m.text(); if (t === 'error') log.errors.push(x.slice(0, 300)); else if (t === 'warning') log.warnings.push(x.slice(0, 300)); });
  page.on('pageerror', e => log.pageerrors.push(String(e.stack || e).slice(0, 400))); page.on('response', r => { if (r.status() >= 400) log.failed.push(r.url().replace(/^.*\/app\//, 'app/') + ' HTTP ' + r.status()); });
  await ctx.route('**/app/src/ext/**', route => {
    const u = new URL(route.request().url()), f = u.pathname.replace(/^.*\/app\/src\/ext\//, ''); extRequests.push(route.request().method() + ' ' + f + ' (' + routeMode + ')');
    const js = body => route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'cache-control': 'no-store' }, body });
    if (routeMode === 'demo' && f === 'index.mjs') return js(INDEX); if (routeMode === 'demo' && f === 'demo-layer.mjs') return js(LAYER); if (routeMode === 'demo' && f === 'demo-broken.mjs') return js(BROKEN);
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });
  await page.goto(base + '?' + query, { waitUntil: 'load' });
  const enter = async () => { const t0 = Date.now(); await page.click('[data-bt-enter]'); await page.waitForFunction(() => (window.btApp && window.btApp.ready) || document.querySelector('.loading .fail'), null, { timeout: WAIT }); const ok = await page.evaluate(() => !!(window.btApp && window.btApp.ready)); if (!ok) throw new Error('the theatre did not start: ' + await page.evaluate(() => document.querySelector('.loading .fail')?.textContent)); await page.evaluate(() => window.btApp.frames(2)); return Date.now() - t0; };
  const leave = async () => { await page.click('#bt-back'); await page.waitForSelector('#landing:not([hidden])', { timeout: 60000 }); await page.waitForFunction(() => !window.btApp, null, { timeout: 20000 }); };
  const shot = async name => { await page.evaluate(() => (window.btApp ? window.btApp.frames(2) : null)); const f = path.join(out, name + '.png'); await page.screenshot({ path: f }); results.shots.push(f); };      // two drawn frames first: the picture then shows what the page already says
  return { ctx, page, log, enter, leave, shot, frames: n => page.evaluate(k => window.btApp.frames(k), n) };
}

try {
  // ---------------- visits 1 and 2 (light only: neither depends on the figures, the structures or the effects, so the full-shell run goes straight to the third visit)
  let s; if (mode === 'light') {
  s = await session(Q); routeMode = 'absent'; const ms1 = await s.enter(); results.notes.push(`entry (${mode}, no list): ${ms1} ms on software GL; not a timing measurement`);
  const a = await s.page.evaluate(() => ({ api: window.btApp.api, state: window.btApp.ext && window.btApp.ext.index.state, n: window.btApp.ext ? window.btApp.ext.status().length : -1, hidden: document.querySelector('#bt-more').hidden, problems: window.btApp.ext ? window.btApp.ext.problems().length : -1 }));
  check('no list: the theatre runs on webgl2', a.api === 'webgl2', a); check('no list: index.state is "absent", no module, no problem', a.state === 'absent' && a.n === 0 && a.problems === 0, a); check('no list: the More tool stays hidden', a.hidden === true);
  check('no list: exactly one request for the list (HEAD), nothing else under src/ext/', extRequests.length === 1 && extRequests[0] === 'HEAD index.mjs (absent)', extRequests.slice());
  const own404 = s.log.errors.filter(x => /404/.test(x)); check('no list: the only console errors are the browser\'s own line(s) for that 404; the loader logs nothing', s.log.errors.length === own404.length && s.log.pageerrors.length === 0 && !s.log.errors.concat(s.log.warnings).some(x => /\bext\b/.test(x)), { errors: s.log.errors, warnings: s.log.warnings, pageerrors: s.log.pageerrors });
  results.notes.push(`no list: the browser printed ${own404.length} console line(s) for the 404 of src/ext/index.mjs; failed requests: ${JSON.stringify(s.log.failed)}`);
  await s.leave(); check('no list: Back works', true); await s.ctx.close();

  // ---------------- visit 2: ?ext=off
  extRequests.length = 0; routeMode = 'demo'; s = await session(Q + '&ext=off'); await s.enter();
  const b = await s.page.evaluate(() => ({ ext: window.btApp.ext == null, hidden: document.querySelector('#bt-more').hidden, demo: typeof globalThis.__extDemo }));
  check('?ext=off: no loader, no request under src/ext/, no module ran', b.ext && b.hidden && b.demo === 'undefined' && extRequests.length === 0, { b, extRequests: extRequests.slice() }); check('?ext=off: clean console', s.log.errors.length === 0 && s.log.pageerrors.length === 0, s.log);
  await s.leave(); await s.ctx.close(); }

  // ---------------- visit 3: the stand-in modules
  extRequests.length = 0; routeMode = 'demo'; s = await session(Q); const P = s.page; const ms3 = await s.enter(); results.notes.push(`entry (${mode}, two stand-in modules): ${ms3} ms on software GL; not a timing measurement`);
  const st = await P.evaluate(() => ({ status: window.btApp.ext.status(), index: window.btApp.ext.index.state, problems: window.btApp.ext.problems(), G: { ...globalThis.__extDemo, last: undefined }, phases: window.btApp.perf().phases, extMs: window.btApp.perf().entryMs }));
  check('the list was read and both modules were tried in order', st.index === 'read' && st.status.map(x => x.path).join() === 'demo-layer.mjs,demo-broken.mjs', st.status);
  check('requests: HEAD and GET of the list, then each module once', extRequests.join(' | ') === 'HEAD index.mjs (demo) | GET index.mjs (demo) | GET demo-layer.mjs (demo) | GET demo-broken.mjs (demo)', extRequests.slice());
  check('the good module runs with its panel and its switch', st.status[0].state === 'running' && st.status[0].panels.join() === 'demo-panel' && st.status[0].toggles.join() === 'demo-marks', st.status[0]);
  check('the failing module: failed at init, its panel removed, its dispose called once, no update', st.status[1].state === 'failed' && st.status[1].stage === 'init' && st.status[1].panels.length === 0 && st.G.brokenDisposes === 1 && !st.G.brokenUpdates, { s: st.status[1], G: st.G });
  check('the failing module is logged once with console.error and nothing else is', s.log.errors.length === 1 && /ext demo-broken\.mjs: init failed; it is skipped/.test(s.log.errors[0]) && s.log.pageerrors.length === 0, s.log);
  check('ctx has exactly the eleven keys and is frozen', st.G.ctxKeys === CTX_KEYS && st.G.frozen === true, st.G.ctxKeys);
  check('ctx values: host.api, urls.data, history, choices (callable, the live object), the controls and panels already exist at init', st.G.api === 'webgl2' && /\/app\/data\/$/.test(st.G.urlsData) && st.G.units > 0 && st.G.choicesType === 'function' && st.G.choicesSame === true && st.G.hasControls === true, st.G);
  check('structures in ctx: null when they are off, the layer when they are on', st.G.hasStructures === (mode === 'full'), st.G.hasStructures);
  check('init ran once, before ready', st.G.inits === 1 && st.G.disposes === 0, st.G);
  await s.frames(3);
  const u = await P.evaluate(() => ({ G: { ...globalThis.__extDemo }, t: window.btApp.state.t, phases: window.btApp.perf().phases, frames: window.btApp.theatre.counters.frames }));
  check('update is called every frame with exactly {tMin, dtMs, cam, paused, speed}', u.G.updates >= 3 && u.G.last.keys === FRAME_KEYS, u.G.last);
  check('frame values: tMin is the theatre clock, cam is the theatre camera, paused while not playing, speed 1, 0 < dtMs <= 100', u.G.last.tMin === u.G.last.stateT && u.G.last.camIsCam === true && u.G.last.paused === true && u.G.last.speed === 1 && u.G.last.dtMs > 0 && u.G.last.dtMs <= 100, u.G.last);
  check('update count follows the frame count (one call per drawn frame)', Math.abs(u.G.updates - u.frames) <= 1, { updates: u.G.updates, frames: u.frames });
  check('the scene hook of addSceneHook is called inside the render pass with (gl, R)', u.G.hook >= 3 && u.G.hookArgs === 'true,true', { hook: u.G.hook, args: u.G.hookArgs });
  check('perf().phases.ext exists', typeof u.phases.ext === 'number' && u.phases.ext >= 0, u.phases);

  // the More tool and its drawer
  const tool = await P.evaluate(() => { const b = document.querySelector('#bt-more'); return { hidden: b.hidden, alert: b.dataset.alert, expanded: b.getAttribute('aria-expanded'), text: b.textContent.trim(), title: b.title, label: b.getAttribute('aria-label') }; });
  check('the More tool is shown, with the alert dot because a module is not running, and its name says so too', tool.hidden === false && tool.alert === 'true' && tool.expanded === 'false' && tool.text === 'More' && tool.label === 'More, 1 part of the page not running' && tool.title === '1 part of the page not running', tool);
  await P.click('#bt-more'); await P.waitForSelector('#bt-drawer:not([hidden])');
  const d = await P.evaluate(() => { const q = s => document.querySelector(s), body = q('#bt-drawer-body'); return { title: q('#bt-drawer-title').textContent, expanded: q('#bt-more').getAttribute('aria-expanded'), box: !!body.querySelector('#xl-block input[data-xlayer="demo-marks"]'), checked: body.querySelector('input[data-xlayer="demo-marks"]')?.checked, label: body.querySelector('#xl-block label')?.textContent.trim(), panels: [...body.querySelectorAll('.xp-item')].map(b => b.dataset.xpanel + ':' + b.textContent.trim()), bad: [...body.querySelectorAll('.xp-bad li')].map(li => li.textContent.trim()), heads: [...body.querySelectorAll('h3')].map(h => h.textContent) }; });
  check('More drawer: title, the switch (off), the panel list, the module that is not running with its reason', d.title === 'More layers and panels' && d.expanded === 'true' && d.box && d.checked === false && d.label === 'Stand-in layer' && d.panels.join() === 'demo-panel:Stand-in panel' && d.bad.length === 1 && /^demo-broken\.mjs could not be started: stand-in failure for the test$/.test(d.bad[0]) && d.heads.join() === 'Layers,Panels,Not running in this visit', d);
  await P.waitForTimeout(80); check('More drawer: the keyboard focus goes to the first control', await P.evaluate(() => document.activeElement?.dataset.xlayer === 'demo-marks'));
  await s.shot('1-more-drawer');
  // the switch
  await P.check('input[data-xlayer="demo-marks"]'); await P.waitForSelector('#demo-badge', { timeout: 20000 }); await P.waitForTimeout(120);
  const sw = await P.evaluate(() => ({ on: globalThis.__extDemo.on, checked: document.querySelector('input[data-xlayer="demo-marks"]').checked, live: document.querySelector('#bt-live').textContent, pill: !!document.querySelector('#demo-badge .pill[data-tier="plausible-procedural"] svg') }));
  check('the switch: setFn(true) ran, the box follows getFn, the layer drew its mark with the tier pill, the screen reader line says "shown"', sw.on === true && sw.checked === true && sw.pill && sw.live === 'Stand-in layer shown.', sw);
  await s.shot('2-layer-on');
  // the panel
  await P.click('.xp-item[data-xpanel="demo-panel"]'); await P.waitForSelector('.xp-body[data-xpanel="demo-panel"] #demo-p'); await P.waitForTimeout(80);
  const pn = await P.evaluate(() => { const q = s => document.querySelector(s); return { title: q('#bt-drawer-title').textContent, panel: window.btApp.state.panel, expanded: q('#bt-more').getAttribute('aria-expanded'), pills: [...document.querySelectorAll('#demo-pills .pill')].map(p => p.dataset.tier + ':' + p.textContent.trim() + ':' + !!p.querySelector('svg')), long: q('#demo-long .tier-mark .pill')?.dataset.tier + '|' + q('#demo-long .tier-note')?.textContent, none: q('#demo-none .pill')?.dataset.tier + '|' + q('#demo-none .pill')?.textContent, focus: document.activeElement?.id, back: q('.xp-back button')?.textContent.trim(), renders: globalThis.__extDemo.renders }; });
  check('the panel opens from the list: title, the More tool stays marked, renderFn got (body, theatre, scope)', pn.title === 'Stand-in panel' && pn.panel === 'demo-panel' && pn.expanded === 'true' && pn.renders === 1 && pn.back === 'All added layers and panels', pn);
  check('tierMark in the page: four pills with glyph and label', pn.pills.join('|') === 'documented:Documented:true|inferred:Inferred:true|plausible-procedural:Plausible-procedural:true|open gap:Open gap:true', pn.pills);
  check('tierMark: a longer statement is marked by its weakest tier and stays visible; an unknown one says "Tier not stated"', pn.long === 'plausible-procedural|documented (secondary); the spot is plausible-procedural' && pn.none === 'none|Tier not stated: seeded_unverified', { long: pn.long, none: pn.none });
  check('data-autofocus in an added panel receives the focus', pn.focus === 'demo-btn', pn.focus);
  await P.click('#demo-btn'); await P.click('#demo-btn'); check('a listener registered through the panel scope works', await P.evaluate(() => document.querySelector('#demo-n').textContent) === '2');
  await s.shot('3-panel');
  await P.evaluate(() => window.btApp.ext.panels.get('demo-panel').handle.refresh()); await P.waitForTimeout(50);
  const rf = await P.evaluate(() => ({ renders: globalThis.__extDemo.renders, cleanups: globalThis.__extDemo.cleanups, n: document.querySelector('#demo-n').textContent }));
  check('handle.refresh(): the scope of the first drawing is ended and the panel is drawn again', rf.renders === 2 && rf.cleanups === 1 && rf.n === '0', rf);
  await P.click('.xp-back button'); await P.waitForSelector('.xp-item');
  check('"All added layers and panels" goes back to the list and ends the panel scope', await P.evaluate(() => document.querySelector('#bt-drawer-title').textContent === 'More layers and panels' && globalThis.__extDemo.cleanups === 2 && window.btApp.state.panel === 'more'));
  // the same switch under the structure switches of Views
  await P.click('[data-panel=views]'); await P.waitForSelector('#xl-block input[data-xlayer="demo-marks"]');
  const vw = await P.evaluate(() => { const body = document.querySelector('#bt-drawer-body'), ly = body.querySelector('#ly-block'), xl = body.querySelector('#xl-block'); return { after: !!ly && ly.nextElementSibling === xl, head: xl.querySelector('h3').textContent, checked: xl.querySelector('input').checked, structBoxes: [...body.querySelectorAll('#ly-block input[data-layer]')].map(x => x.dataset.layer), items: body.querySelectorAll('.item').length, tour: body.querySelectorAll('[data-kind=tour]').length, moreExpanded: document.querySelector('#bt-more').getAttribute('aria-expanded') }; });
  check('Views: the added switches sit right after the structure switches, under "More layers", showing the current state', vw.after && vw.head === 'More layers' && vw.checked === true && vw.moreExpanded === 'false', vw);
  check('Views: the structure switches and the bookmark rows are untouched', (mode === 'full' ? vw.structBoxes.join() === 'roads,fences,buildings,masses,markers,works' : vw.structBoxes.length === 0) && vw.items === vw.tour, vw);
  await s.shot('4-views');
  await P.uncheck('#xl-block input[data-xlayer="demo-marks"]'); await P.waitForSelector('#demo-badge', { state: 'detached', timeout: 20000 }); await P.waitForTimeout(120);
  check('Views: switching it off there calls setFn(false) and is announced', await P.evaluate(() => globalThis.__extDemo.on === false && document.querySelector('#bt-live').textContent === 'Stand-in layer hidden.'));
  await P.keyboard.press('Escape'); check('Escape closes the drawer and the focus returns to the tool that opened it', await P.evaluate(() => document.querySelector('#bt-drawer').hidden && document.activeElement?.dataset.panel === 'views'));
  await P.evaluate(() => window.btApp.theatre.openPanel('demo-panel')); await P.waitForSelector('#demo-p'); await P.keyboard.press('Escape');
  check('theatre.openPanel(id) opens an added panel; Escape returns the focus to the More tool', await P.evaluate(() => document.querySelector('#bt-drawer').hidden && document.activeElement?.id === 'bt-more' && globalThis.__extDemo.renders === 3 && globalThis.__extDemo.cleanups === 3));
  // switching between the shell's own panels ends the one that is replaced
  await P.click('[data-panel=info]'); await P.click('[data-panel=settings]'); const sc = await P.evaluate(() => ({ info: window.btApp.theatre.PANELS.info.dispose == null, settings: typeof window.btApp.theatre.PANELS.settings.dispose })); await P.keyboard.press('Escape');
  check('a replaced panel is ended (About, then Settings: About holds no scope any more)', sc.info === true && sc.settings === 'function', sc);
  // what a panel function may give back: an HTML string, a node, a cleanup function, an object with dispose(), a promise of these; a throw; a rejection; a result that arrives after the panel was closed
  await P.evaluate(() => {
    const G = globalThis.__extDemo, reg = globalThis.__extReg; G.forms = { cleaned: [] };
    reg('f-str', 'Form: string', () => '<p id="f-p">string form</p>');
    reg('f-node', 'Form: node', () => { const n = document.createElement('p'); n.id = 'f-p'; n.textContent = 'node form'; return n; });
    reg('f-fn', 'Form: cleanup function', b => { b.innerHTML = '<p id="f-p">function form</p>'; return () => G.forms.cleaned.push('fn'); });
    reg('f-obj', 'Form: dispose object', b => { b.innerHTML = '<p id="f-p">object form</p>'; return { dispose() { G.forms.cleaned.push('obj'); } }; });
    reg('f-async', 'Form: promise', async b => { await new Promise(r => setTimeout(r, 40)); b.innerHTML = '<p id="f-p">promise form</p>'; return () => G.forms.cleaned.push('async'); });
    reg('f-late', 'Form: late result', () => new Promise(r => setTimeout(() => r(() => G.forms.cleaned.push('late')), 500)));
    reg('f-throw', 'Form: throws', () => { throw new Error('form render threw'); });
    reg('f-reject', 'Form: rejects', async () => { throw new Error('form render rejected'); });
  });
  const form = async (id, wait = 150) => { await P.evaluate(i => window.btApp.theatre.openPanel(i), id); await P.waitForTimeout(wait); return P.evaluate(() => ({ text: document.querySelector('.xp-body')?.textContent.trim() || '', has: !!document.querySelector('.xp-body #f-p'), fail: document.querySelector('.xp-body .fail')?.textContent.trim() || null, cleaned: [...globalThis.__extDemo.forms.cleaned] })); };
  const closed = async () => { await P.keyboard.press('Escape'); await P.waitForTimeout(60); return P.evaluate(() => ({ cleaned: [...globalThis.__extDemo.forms.cleaned], open: window.btApp.state.panel })); };
  const F = {}; F.str = await form('f-str'); await closed(); F.node = await form('f-node'); await closed(); F.fn = await form('f-fn'); const fnClosed = await closed(); F.obj = await form('f-obj'); const objClosed = await closed();
  F.async = await form('f-async', 300); const asyncClosed = await closed(); await form('f-late', 50); const lateClosed = await closed(); await P.waitForTimeout(800); F.late = await P.evaluate(() => ({ cleaned: [...globalThis.__extDemo.forms.cleaned], open: window.btApp.state.panel }));
  F.throws = await form('f-throw'); await closed(); F.rejects = await form('f-reject'); const rejClosed = await closed(); const modState = await P.evaluate(() => window.btApp.ext.status()[0].state);
  check('panel function forms: an HTML string replaces the content; a node is appended', F.str.text === 'string form' && F.node.text === 'node form' && F.node.has, { str: F.str, node: F.node });
  check('panel function forms: a cleanup function and an object with dispose() are called when the panel closes, not before', F.fn.text === 'function form' && F.fn.cleaned.join() === '' && fnClosed.cleaned.join() === 'fn' && F.obj.text === 'object form' && objClosed.cleaned.join() === 'fn,obj' && objClosed.open === null, { fn: F.fn, fnClosed, obj: F.obj, objClosed });
  check('panel function forms: a promise of content is drawn when it settles, its cleanup is called on close', F.async.text === 'promise form' && asyncClosed.cleaned.join() === 'fn,obj,async', { async: F.async, asyncClosed });
  check('panel function forms: a result that arrives after the panel was closed is not kept: its cleanup is called', lateClosed.cleaned.join() === 'fn,obj,async' && F.late.cleaned.join() === 'fn,obj,async,late' && F.late.open === null, { lateClosed, late: F.late });
  check('panel function forms: a throw and a rejection show "could not be drawn" with the message, the drawer stays usable, the module keeps running', /could not be drawn: form render threw/.test(F.throws.fail || '') && /could not be drawn: form render rejected/.test(F.rejects.fail || '') && rejClosed.open === null && modState === 'running', { throws: F.throws.fail, rejects: F.rejects.fail, rejClosed, modState });
  // play and speed reach the frame
  await P.evaluate(() => { window.btApp.setSpeed(4); window.btApp.setPlaying(true); }); await s.frames(3); const pl = await P.evaluate(() => ({ ...globalThis.__extDemo.last })); await P.evaluate(() => { window.btApp.setPlaying(false); window.btApp.setSpeed(1); });
  check('while playing: paused is false and speed is the chosen speed', pl.paused === false && pl.speed === 4 && pl.tMin === pl.stateT, pl);
  // Back
  await s.leave(); const after = await P.evaluate(() => ({ hook: globalThis.__extDemo.hook, updates: globalThis.__extDemo.updates })); await P.waitForTimeout(600);        // the counters are read once Back has finished and again 600 ms later: frames run until the click lands, none after
  const bk = await P.evaluate(() => ({ G: { ...globalThis.__extDemo, last: undefined }, badge: !!document.querySelector('#demo-badge'), theatre: !!document.querySelector('#theatre'), app: typeof window.btApp, reg: typeof globalThis.__extReg }));
  check('Back: dispose() once for the running module (the failed one was ended when it failed), nothing left in the page, no update or scene-hook call after Back', bk.G.disposes === 1 && bk.G.brokenDisposes === 1 && !bk.badge && !bk.theatre && bk.app === 'undefined' && bk.reg === 'undefined' && bk.G.updates === after.updates && bk.G.hook === after.hook, { bk, after });
  // a second entry: the browser keeps the module, init is called again on it
  await s.enter(); const re = await P.evaluate(() => ({ G: { ...globalThis.__extDemo, last: undefined }, checked: window.btApp.ext.toggleState('demo-marks'), status: window.btApp.ext.status().map(x => x.path + ':' + x.state), hidden: document.querySelector('#bt-more').hidden }));
  check('second entry: init again on the same module objects, state reset, the tool is back', re.G.inits === 2 && re.G.disposes === 1 && re.checked === false && re.status.join() === 'demo-layer.mjs:running,demo-broken.mjs:failed' && re.hidden === false, re);
  check('second entry: the modules are not fetched again (one request each in the page\'s life)', extRequests.filter(x => /^GET demo-/.test(x)).length === 2, extRequests.slice());
  await s.leave(); const end = await P.evaluate(() => ({ disposes: globalThis.__extDemo.disposes, broken: globalThis.__extDemo.brokenDisposes }));
  check('second Back: dispose again, once', end.disposes === 2 && end.broken === 2, end);
  const brokenErr = s.log.errors.filter(x => /ext demo-broken\.mjs: init failed; it is skipped/.test(x)), formErr = s.log.errors.filter(x => /ext demo-layer\.mjs: panel 'f-(throw|reject)' could not be drawn/.test(x));
  check('the whole visit: console errors are only the stand-in failure (once per entry) and the two panel functions that fail on purpose; no page error; no failed request', brokenErr.length === 2 && formErr.length === 2 && s.log.errors.length === 4 && s.log.pageerrors.length === 0 && s.log.failed.length === 0, s.log);
  results.warnings = [...new Set(s.log.warnings)]; await s.ctx.close();
} catch (e) { check('the harness ran to the end', false, String(e.stack || e).slice(0, 900)); }
finally { save(); await br.close().catch(() => {}); await new Promise(r => srv.close(r)); }
console.log(`${results.checks.length - failed} of ${results.checks.length} checks passed (${mode}); results: ${path.join(out, 'results.json')}`);
process.exit(failed ? 1 : 0);
