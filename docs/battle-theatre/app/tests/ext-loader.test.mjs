// Node tests of the loader of the added layers and panels (src/ui/extensions.mjs, src/ui/ext-panel.mjs, the wiring in src/theatre.mjs and src/render-host.mjs; docs/EXT-CONTRACT.md).
// A stand-in theatre and stand-in modules: real module files in a temporary folder, imported the way theatre.mjs imports them, and plain objects handed out by a stand-in importer.
// Checked: no list means nothing happens; init is awaited in list order with the eleven ctx keys; update gets {tMin, dtMs, cam, paused, speed} before the renderer's frame;
// dispose on Back; a failing module is logged and skipped and never stops the others (whatever it throws); a slow start; Back during a start; a list that does not answer, in one wait for the check and
// the import together (a clock and timers the test moves itself); both registries; the More tool; one drawing of an added panel in every form a panel function may return (late results included);
// the drawer as HTML; the tier mark (exact names, the negated and hedged wordings, the words the reading knows, hostile values); the live choices; the wiring order in theatre.mjs and render-host.mjs.
// Nothing here opens a browser: the drawer in the page is tests/ext-loader-browser.mjs.
//   node --test docs/battle-theatre/app/tests/ext-loader.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { Extensions, INDEX, INIT_WAIT_MS, tierMark, tierName, readTierWords, TIER_WORDS, tierReading, plain, liveChoices, badPath, looksAbsent } from '../src/ui/extensions.mjs';
import { moreHTML, togglesHTML, drawAdded, mountExtensionsUI, failedHTML, MORE } from '../src/ui/ext-panel.mjs';
import { Bus, Scope } from '../src/scope.mjs';
import { TIERS, TIER_STYLE, URLS } from '../src/config.mjs';
import { RenderHost } from '../src/render-host.mjs';
import { FxHost } from '../src/fx-host.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');
const CTX_KEYS = ['choices', 'env', 'history', 'host', 'registerLayerToggle', 'registerPanel', 'state', 'structures', 'theatre', 'tierMark', 'urls'];
const FRAME_KEYS = ['cam', 'dtMs', 'paused', 'speed', 'tMin'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
// the words of the copy rule of tests/real.spec.mjs (FORBIDDEN there), written in pieces so that no source file under app/ spells them: the copy audit reads every file there
const FORBIDDEN = new RegExp('\\b(' + [['A', 'I'], ['A\\.', 'I\\.'], ['Cl', 'aude'], ['Anthr', 'opic'], ['LL', 'M'], ['language ', 'model'], ['gener', 'ated'], ['auto', 'mated'], ['sub', 'agent'], ['ag', 'ent'], ['pro', 'mpt']].map(w => w.join('')).join('|') + ')\\b', 'i');
const mkLog = () => { const L = { errors: [], warns: [], debugs: [] }; return { L, error: (...a) => L.errors.push(a), warn: (...a) => L.warns.push(a), debug: (...a) => L.debugs.push(a) }; };
const notFound = p => { const e = new Error(`Cannot find module '${p}'`); e.code = 'ERR_MODULE_NOT_FOUND'; return e; };
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(r => setImmediate(r)); };
// a clock and timers that move only when the test says so: advance(ms) fires what falls due, in order, and lets every promise settle in between; nothing waits in real time
function fakeTime() {
  let now = 0, seq = 0; const timers = new Map();
  return { now: () => now, pending: () => timers.size, setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; }, clearTimeout: id => { timers.delete(id); },
    async advance(ms) { const end = now + ms; for (;;) { await flush(); let next = null; for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next.t.at)) next = { id, t }; if (!next) break; timers.delete(next.id); now = Math.max(now, next.t.at); next.t.fn(); } now = end; await flush(); } };
}

function fakeTheatre(o = {}) {
  const th = { host: { api: 'webgl2', tag: 'host' }, state: { t: 0, playing: false, speed: 1, panel: null, scenario: { choices: { 'CF-WIND-SPEED': 'recommended', 'C-004': 'b' } } }, env: { tag: 'env' }, layer: { tag: 'history', meta: { stub: false }, units: [] }, structs: { tag: 'structures' },
    bus: new Bus(), PANELS: { events: {}, views: {}, scenario: {}, info: {}, settings: {}, sound: {} }, said: [], opened: [], heard: [],
    announce(m) { th.said.push(m); }, openPanel(name) { th.opened.push(name); th.state.panel = th.state.panel === name ? null : name; }, closePanel() { th.state.panel = null; }, ...o };
  for (const n of ['ext', 'ext-toggle', 'ext-panel', 'layer']) th.bus.on(n, (a, b) => th.heard.push([n, a, b]));
  return th;
}
// modules as plain objects: mods = { 'index.mjs': { default: [...] }, 'a.mjs': {...} }; a path that is not there fails the way node's import does
function mk(mods, o = {}) {
  const th = o.th || fakeTheatre(), log = mkLog(), asked = [], T = o.time || null;
  const X = new Extensions(th, { importer: async p => { asked.push(p); if (!(p in mods)) throw notFound(p); const m = mods[p]; if (m instanceof Error) throw m; return m; }, log, waitMs: o.waitMs ?? 2000, exists: o.exists, progress: o.progress,
    ...(T ? { now: T.now, setTimeout: T.setTimeout, clearTimeout: T.clearTimeout } : {}) });
  return { X, th, log: log.L, asked, T };
}
const CAM = { id: 'cam', x: 1, y: 2, z: 3 };
// a module that writes down what happens to it
function recorder(name, trace, extra = {}) {
  return { init(ctx) { trace.push(`${name}.init`); if (extra.init) return extra.init(ctx); }, update(f) { trace.push(`${name}.update@${f.tMin}`); if (extra.update) return extra.update(f); }, dispose() { trace.push(`${name}.dispose`); if (extra.dispose) return extra.dispose(); } };
}

// ---------------------------------------------------------------- the list
test('no list: nothing is imported, nothing is logged, nothing runs (with the existence check and without it)', async () => {
  const a = mk({}, { exists: async p => { assert.equal(p, INDEX); return false; } }); await a.X.load();
  assert.deepEqual(a.asked, [], 'the list is not imported when the server says it is not there'); assert.equal(a.X.index.state, 'absent'); assert.deepEqual(a.X.status(), []); assert.deepEqual(a.X.problems(), []);
  assert.deepEqual([a.log.errors, a.log.warns], [[], []]); a.X.update(10, 16, CAM, false, 1); a.X.dispose(); a.X.dispose(); assert.deepEqual(a.th.heard, [], 'no event either');
  const b = mk({}); await b.X.load(); assert.deepEqual(b.asked, [INDEX]); assert.equal(b.X.index.state, 'absent'); assert.deepEqual([b.log.errors, b.log.warns], [[], []]); assert.deepEqual(b.X.problems(), []);
  assert.equal(looksAbsent(notFound('x')), true); assert.equal(looksAbsent(new TypeError('Failed to fetch dynamically imported module: http://h/app/src/ext/index.mjs')), true); assert.equal(looksAbsent(new SyntaxError('Unexpected token')), false); assert.equal(looksAbsent(null), false);
});

test('a list that is there but cannot be read is logged and shown, never passed over in silence', async () => {
  const a = mk({ [INDEX]: new SyntaxError('Unexpected token }') }); await a.X.load();
  assert.equal(a.X.index.state, 'failed'); assert.equal(a.log.errors.length, 1); assert.match(String(a.log.errors[0][0]), /src\/ext\/index\.mjs could not be read/); assert.equal(a.X.problems().length, 1); assert.match(a.X.problems()[0].text, /Unexpected token/);
  const b = mk({ [INDEX]: { default: { 0: 'a.mjs' } } }); await b.X.load(); assert.equal(b.X.index.state, 'failed'); assert.match(b.X.index.error, /not an array/); assert.equal(b.log.errors.length, 1);
  const c = mk({}, { exists: async () => true }); await c.X.load(); assert.equal(c.X.index.state, 'failed', 'the server said the list is there, so a failing import is a broken list, not a missing one'); assert.equal(c.log.errors.length, 1);
  const d = mk({ [INDEX]: { default: [] } }, { exists: async () => { throw new Error('offline'); } }); await d.X.load(); assert.equal(d.X.index.state, 'read', 'an existence check that fails lets the import speak'); assert.deepEqual(d.X.status(), []);
});

test('a list that does not answer does not hold the theatre: the check is passed over, the list itself counts as failed after the wait, a late answer starts nothing', async () => {
  const never = new Promise(() => {}), trace = [];
  const a = mk({ [INDEX]: { default: ['a.mjs'] }, 'a.mjs': recorder('a', trace) }, { waitMs: 30, exists: () => never }); const t0 = Date.now(); await a.X.load();
  assert.equal(a.X.index.state, 'read', 'the check for the list hangs: it is passed over and the import speaks'); assert.deepEqual(trace, ['a.init']); assert.ok(Date.now() - t0 >= 8, 'it waited for the check first (a third of the wait)'); assert.deepEqual([a.log.errors, a.log.warns], [[], []]);
  const b = mk({ [INDEX]: never }, { waitMs: 30 }); await b.X.load();
  assert.equal(b.X.index.state, 'failed'); assert.match(b.X.index.error, /src\/ext\/index\.mjs did not answer within 30 ms/); assert.equal(b.log.errors.length, 1); assert.equal(b.X.problems().length, 1); assert.deepEqual(b.X.status(), []);
  trace.length = 0; const c = mk({ [INDEX]: new Promise(r => setTimeout(() => r({ default: ['a.mjs'] }), 80)), 'a.mjs': recorder('a', trace) }, { waitMs: 20 }); await c.X.load(); await sleep(120);
  assert.equal(c.X.index.state, 'failed'); assert.deepEqual(trace, [], 'an answer that comes after the wait starts nothing'); assert.deepEqual(c.X.status(), []);
  const d = mk({ [INDEX]: never }, { waitMs: 20, exists: () => never }); await d.X.load(); assert.equal(d.X.index.state, 'failed'); assert.equal(d.log.errors.length, 1);
});

test('the list step holds the theatre for one wait in all, not two: the check has a third of it, the import the rest, whatever stalls; answers that come in time are used', async () => {
  const never = new Promise(() => {}), W = 300, trace = [];
  const start = (T, mods, o = {}) => { const m = mk(mods, { waitMs: W, time: T, ...o }); let done = false; const p = m.X.load().then(() => { done = true; }); return { ...m, p, done: () => done }; };
  // the check and the import both stall: failed after 300 ms (the old reading held it for 600)
  let T = fakeTime(), a = start(T, { [INDEX]: never }, { exists: () => never });
  await T.advance(99); assert.deepEqual(a.asked, [], 'the import is not asked while the check still has time'); assert.equal(a.done(), false);
  await T.advance(1); assert.deepEqual(a.asked, [INDEX], 'after a third of the wait the check is passed over and the import is asked'); assert.equal(a.done(), false);
  await T.advance(199); assert.equal(a.done(), false, 'at 299 ms it still waits'); await T.advance(1); await a.p; assert.equal(a.done(), true, 'one wait in all: 300 ms'); assert.equal(T.now(), 300);
  assert.equal(a.X.index.state, 'failed'); assert.match(a.X.index.error, /src\/ext\/index\.mjs did not answer within 300 ms/); assert.equal(a.log.errors.length, 1); assert.equal(T.pending(), 0, 'no timer is left');
  // the check answers late but in time (40 ms), the import stalls: still 300 ms in all, the import has what is left of it
  T = fakeTime(); a = start(T, { [INDEX]: never }, { exists: () => new Promise(r => T.setTimeout(() => r(true), 40)) });
  await T.advance(299); assert.equal(a.done(), false); await T.advance(1); await a.p; assert.equal(a.X.index.state, 'failed'); assert.equal(T.pending(), 0);
  // the check stalls, the import answers 250 ms after the start (150 ms after it was asked): used; the module starts
  T = fakeTime(); a = start(T, { [INDEX]: new Promise(r => T.setTimeout(() => r({ default: ['a.mjs'] }), 250)), 'a.mjs': recorder('a', trace) }, { exists: () => never });
  await T.advance(249); assert.deepEqual(trace, []); await T.advance(1); await a.p; assert.deepEqual(trace, ['a.init']); assert.equal(a.X.index.state, 'read'); assert.deepEqual([a.log.errors, a.log.warns], [[], []]); assert.equal(T.pending(), 0);
  // the import answers at 320 ms: too late, the list counts as failed at 300 ms and the late answer starts nothing
  trace.length = 0; T = fakeTime(); a = start(T, { [INDEX]: new Promise(r => T.setTimeout(() => r({ default: ['a.mjs'] }), 320)), 'a.mjs': recorder('a', trace) }, { exists: () => never });
  await T.advance(300); await a.p; assert.equal(a.X.index.state, 'failed'); await T.advance(100); assert.deepEqual(trace, [], 'a late answer starts nothing'); assert.deepEqual(a.X.status(), []);
  // the server says the list is not there: one wait at most, and the import is never asked
  T = fakeTime(); a = start(T, { [INDEX]: never }, { exists: () => new Promise(r => T.setTimeout(() => r(false), 60)) }); await T.advance(60); await a.p; assert.equal(a.X.index.state, 'absent'); assert.deepEqual(a.asked, []); assert.equal(T.pending(), 0);
  // nothing stalls: no time passes and no timer is left
  trace.length = 0; T = fakeTime(); a = start(T, { [INDEX]: { default: ['a.mjs'] }, 'a.mjs': recorder('a', trace) }, { exists: async () => true }); await a.p; assert.equal(T.now(), 0); assert.equal(T.pending(), 0); assert.deepEqual(trace, ['a.init']);
});

test('Back while the list or a module is stalled: the waits end at once, no timer is left, and nothing is logged after the visit', async () => {
  const never = new Promise(() => {}), trace = [];
  // during the check
  let T = fakeTime(), m = mk({ [INDEX]: never }, { waitMs: 300, time: T, exists: () => never }), p = m.X.load(); await T.advance(10); assert.equal(T.pending(), 1, 'the wait for the check');
  m.X.dispose(); await p; assert.equal(T.pending(), 0); await T.advance(5000); assert.deepEqual([m.log.errors, m.log.warns, m.asked], [[], [], []], 'the import was never asked and nothing was logged');
  // during the import
  T = fakeTime(); m = mk({ [INDEX]: never }, { waitMs: 300, time: T, exists: () => never }); p = m.X.load(); await T.advance(150); assert.deepEqual(m.asked, [INDEX]);
  m.X.dispose(); await p; assert.equal(T.pending(), 0); await T.advance(5000); assert.deepEqual([m.log.errors, m.log.warns], [[], []], 'a list that was being waited for when the visit ended is not reported as broken'); assert.equal(m.X.index.state, 'not read');
  // during a module's start: load() returns at once, the module that has not settled is ended when it does, the rest of the list is not started
  let release; const gate = new Promise(r => { release = r; }); T = fakeTime();
  m = mk({ [INDEX]: { default: ['slow.mjs', 'next.mjs'] }, 'slow.mjs': recorder('slow', trace, { init: () => gate }), 'next.mjs': recorder('next', trace) }, { waitMs: 300, time: T }); p = m.X.load(); await T.advance(10);
  assert.deepEqual(trace, ['slow.init']); assert.equal(T.pending(), 1, 'the wait for the module');
  m.X.dispose(); await p; assert.equal(T.pending(), 0); assert.ok(!m.asked.includes('next.mjs')); await T.advance(5000); assert.deepEqual([m.log.errors, m.log.warns], [[], []]);
  release(); await m.X.whenSettled(); assert.deepEqual(trace, ['slow.init', 'slow.dispose'], 'ended as soon as its init settled');
});

test('list entries: refused ones are reported and the rest runs; a path listed twice is started once; ./ is dropped', async () => {
  for (const [p, re] of [[7, /not a string/], ['', /empty/], ['  ', /empty/], ['/abs.mjs', /relative/], ['https://x.test/a.mjs', /relative/], ['../theatre.mjs', /inside/], ['a/../../b.mjs', /inside/], ['index.mjs', /itself/], ['./index.mjs', /itself/]]) assert.match(String(badPath(p)), re, String(p));
  for (const p of ['a.mjs', './a.mjs', 'veg/index.mjs', 'a..b.mjs']) assert.equal(badPath(p), null, p);
  const trace = []; const { X, log } = mk({ [INDEX]: { default: ['./a.mjs', 42, '../x.mjs', 'a.mjs', 'sub/b.mjs'] }, 'a.mjs': recorder('a', trace), 'sub/b.mjs': recorder('b', trace) }); await X.load();
  assert.deepEqual(trace, ['a.init', 'b.init']); const st = X.status(); assert.deepEqual(st.map(s => [s.path, s.state]), [['42', 'failed'], ['../x.mjs', 'failed'], ['a.mjs', 'running'], ['sub/b.mjs', 'running']]);
  assert.equal(log.errors.length, 2); assert.equal(log.warns.length, 1); assert.match(String(log.warns[0][0]), /listed twice/); assert.equal(X.problems().length, 2); assert.match(X.problems()[0].text, /^refused: /);
});

// ---------------------------------------------------------------- real module files, imported as theatre.mjs imports them
test('real files: import(base + path), init(ctx) awaited with exactly the eleven keys, update(frame) with exactly the five fields, dispose on Back', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-ext-')), base = pathToFileURL(dir + path.sep).href;
  try {
    fs.writeFileSync(path.join(dir, 'index.mjs'), `export default ['fake.mjs', 'boxed.mjs'];\n`);
    fs.writeFileSync(path.join(dir, 'fake.mjs'), `const S = globalThis.__btExtFake;\nexport async function init(ctx) { S.log.push('init'); S.ctx = ctx; await new Promise(r => setTimeout(r, 15)); S.log.push('init done'); }\nexport function update(frame) { S.log.push('update'); S.frames.push({ ...frame, same: frame }); }\nexport function dispose() { S.log.push('dispose'); }\n`);
    fs.writeFileSync(path.join(dir, 'boxed.mjs'), `const S = globalThis.__btExtFake;\nexport default { init(ctx) { S.log.push('boxed init'); S.boxedThis = this; }, dispose() { S.log.push('boxed dispose'); } };\n`);
    const S = globalThis.__btExtFake = { log: [], frames: [], ctx: null }, th = fakeTheatre(), log = mkLog(), steps = [];
    const X = new Extensions(th, { importer: p => import(base + p), exists: async p => fs.existsSync(path.join(dir, p)), log, progress: (i, n, p) => steps.push([i, n, p]) });
    X.update(1, 16, CAM, false, 1); assert.deepEqual(S.log, [], 'no call before the start');
    await X.load();
    assert.deepEqual(S.log, ['init', 'init done', 'boxed init'], 'init is awaited: the second module starts after the first has finished starting'); assert.deepEqual(steps, [[0, 2, 'fake.mjs'], [1, 2, 'boxed.mjs']]);
    const c = S.ctx; assert.deepEqual(Object.keys(c).sort(), CTX_KEYS); assert.ok(Object.isFrozen(c));
    assert.equal(c.theatre, th); assert.equal(c.host, th.host); assert.equal(c.state, th.state); assert.equal(c.env, th.env); assert.equal(c.history, th.layer); assert.equal(c.structures, th.structs);
    assert.deepEqual({ ...c.urls }, { ...URLS }); assert.ok(Object.isFrozen(c.urls)); assert.equal(c.tierMark, tierMark); assert.equal(typeof c.registerPanel, 'function'); assert.equal(typeof c.registerLayerToggle, 'function'); assert.equal(c.choices['C-004'], 'b');
    assert.ok(S.boxedThis && typeof S.boxedThis.init === 'function', 'a default-exported object with the functions is accepted, called as its own methods');
    X.update(1234.5, 16.7, CAM, true, 4); X.update(1235, 100, CAM, false, 0.25);
    assert.equal(S.frames.length, 2); assert.deepEqual(Object.keys(S.frames[0]).filter(k => k !== 'same').sort(), FRAME_KEYS);
    const { same, ...f0 } = S.frames[0]; assert.deepEqual(f0, { tMin: 1234.5, dtMs: 16.7, cam: CAM, paused: true, speed: 4 }); assert.equal(S.frames[1].tMin, 1235); assert.equal(S.frames[1].paused, false); assert.equal(S.frames[1].speed, 0.25); assert.equal(S.frames[0].same, S.frames[1].same, 'one frame object, reused');
    assert.deepEqual(X.status().map(s => [s.path, s.state, s.updates]), [['fake.mjs', 'running', 2], ['boxed.mjs', 'running', 0]]);
    X.dispose(); assert.deepEqual(S.log.slice(-2), ['boxed dispose', 'dispose'], 'the last started is ended first'); X.update(1236, 16, CAM, false, 1); X.dispose();
    assert.equal(S.log.filter(x => x === 'dispose').length, 1, 'dispose once'); assert.equal(S.log.filter(x => x === 'update').length, 2, 'no update after Back');
    assert.deepEqual([log.L.errors, log.L.warns], [[], []]); assert.throws(() => c.registerPanel('late', 'Late', () => {}), /has been left/);
  } finally { delete globalThis.__btExtFake; fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a real folder without a list: the same importer, nothing happens', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-ext-')), base = pathToFileURL(dir + path.sep).href, log = mkLog();
  try { const X = new Extensions(fakeTheatre(), { importer: p => import(base + p), log }); await X.load(); assert.equal(X.index.state, 'absent'); assert.deepEqual([log.L.errors, log.L.warns, X.status()], [[], [], []]); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- order and isolation
test('order: init in list order one after another, update in list order every frame, dispose in reverse', async () => {
  const trace = []; const slow = n => async () => { await sleep(n); trace.push('…'); };
  const { X } = mk({ [INDEX]: { default: ['a.mjs', 'b.mjs', 'c.mjs'] }, 'a.mjs': recorder('a', trace, { init: slow(20) }), 'b.mjs': recorder('b', trace, { init: slow(1) }), 'c.mjs': { init() { trace.push('c.init'); } } });
  await X.load(); assert.deepEqual(trace, ['a.init', '…', 'b.init', '…', 'c.init']); trace.length = 0;
  X.update(5, 16, CAM, false, 1); X.update(6, 16, CAM, false, 1); assert.deepEqual(trace, ['a.update@5', 'b.update@5', 'a.update@6', 'b.update@6']); trace.length = 0;
  X.dispose(); assert.deepEqual(trace, ['b.dispose', 'a.dispose']);
});

test('a failing module is logged and skipped, never fatal: import, init (thrown and rejected), update (thrown and rejected); the others go on', async () => {
  const trace = []; let boom = false, boomAsync = false;
  const mods = { [INDEX]: { default: ['missing.mjs', 'throws.mjs', 'rejects.mjs', 'good.mjs', 'upd.mjs', 'upd-async.mjs', 'last.mjs'] },
    'throws.mjs': recorder('throws', trace, { init(ctx) { ctx.registerPanel('p-throws', 'T', () => {}); ctx.registerLayerToggle('t-throws', 'T', () => true, () => {}); throw new Error('init went wrong'); } }),
    'rejects.mjs': recorder('rejects', trace, { init: async () => { await sleep(1); throw new Error('init rejected'); }, dispose() { throw new Error('dispose went wrong too'); } }),
    'good.mjs': recorder('good', trace, { init(ctx) { ctx.registerPanel('p-good', 'Good', () => {}); } }),
    'upd.mjs': recorder('upd', trace, { init(ctx) { ctx.registerPanel('p-upd', 'U', () => {}); ctx.registerLayerToggle('t-upd', 'U', () => true, () => {}); }, update() { if (boom) throw new Error('update went wrong'); } }),
    'upd-async.mjs': recorder('ua', trace, { update: async () => { if (boomAsync) throw new Error('update rejected'); } }),
    'last.mjs': recorder('last', trace) };
  const { X, th, log } = mk(mods); await X.load();
  assert.deepEqual(X.status().map(s => [s.path, s.state, s.stage]), [['missing.mjs', 'failed', 'import'], ['throws.mjs', 'failed', 'init'], ['rejects.mjs', 'failed', 'init'], ['good.mjs', 'running', 'run'], ['upd.mjs', 'running', 'run'], ['upd-async.mjs', 'running', 'run'], ['last.mjs', 'running', 'run']]);
  assert.equal(log.errors.length, 3); for (const [i, re] of [[0, /ext missing\.mjs: import failed; it is skipped/], [1, /ext throws\.mjs: init failed; it is skipped/], [2, /ext rejects\.mjs: init failed; it is skipped/]]) assert.match(String(log.errors[i][0]), re);
  assert.ok(log.errors[1][1] instanceof Error, 'the error itself is logged too'); assert.equal(log.warns.length, 1); assert.match(String(log.warns[0][0]), /rejects\.mjs: dispose failed/);
  assert.deepEqual(trace, ['throws.init', 'throws.dispose', 'rejects.init', 'rejects.dispose', 'good.init', 'upd.init', 'ua.init', 'last.init'], 'a module whose init failed is told to end at once; a module that never loaded is not');
  assert.deepEqual([...X.panels.keys()], ['p-good', 'p-upd'], 'what the failed module registered is gone'); assert.deepEqual([...X.toggles.keys()], ['t-upd']);
  assert.deepEqual(X.problems().map(p => p.name), ['missing.mjs', 'throws.mjs', 'rejects.mjs']); assert.match(X.problems()[1].text, /^could not be started: init went wrong/); assert.match(X.problems()[0].text, /^could not be loaded: /);
  trace.length = 0; X.update(1, 16, CAM, false, 1); assert.deepEqual(trace, ['good.update@1', 'upd.update@1', 'ua.update@1', 'last.update@1']);
  trace.length = 0; boom = true; th.state.panel = 'p-upd'; X.update(2, 16, CAM, false, 1);
  assert.deepEqual(trace, ['good.update@2', 'upd.update@2', 'upd.dispose', 'ua.update@2', 'last.update@2'], 'the frame goes on after the throw, and the stopped module is told to end'); assert.equal(log.errors.length, 4); assert.match(String(log.errors[3][0]), /ext upd\.mjs: update failed; it is skipped/);
  assert.deepEqual([...X.panels.keys()], ['p-good']); assert.deepEqual([...X.toggles.keys()], []); assert.match(X.problems()[3].text, /^stopped: update went wrong/);
  trace.length = 0; X.update(3, 16, CAM, false, 1); X.update(4, 16, CAM, false, 1); assert.deepEqual(trace, ['good.update@3', 'ua.update@3', 'last.update@3', 'good.update@4', 'ua.update@4', 'last.update@4'], 'no further call to the stopped module, and no error per frame'); assert.equal(log.errors.length, 4);
  trace.length = 0; boomAsync = true; X.update(5, 16, CAM, false, 1); await sleep(5); assert.equal(log.errors.length, 5); assert.match(String(log.errors[4][0]), /ext upd-async\.mjs: update failed/); assert.ok(trace.includes('ua.dispose'));
  trace.length = 0; X.update(6, 16, CAM, false, 1); assert.deepEqual(trace, ['good.update@6', 'last.update@6']);
  trace.length = 0; X.dispose(); assert.deepEqual(trace, ['last.dispose', 'good.dispose'], 'Back ends only what is still running; nobody is ended twice');
  assert.equal(X.status().filter(s => s.state === 'failed').length, 5);
});

test('hostile values do not stop the theatre: list entries and thrown values that have no text form are refused or logged, and the other modules start', async () => {
  const trace = [], bare = () => Object.create(null), toStringThrows = () => ({ toString() { throw new Error('toString threw'); } }), messageThrows = () => ({ get message() { throw new Error('message getter threw'); } });
  const { X, log } = mk({ [INDEX]: { default: [bare(), toStringThrows(), Symbol('entry'), 10n, 'a.mjs', 'throws-bare.mjs', 'throws-getter.mjs', 'rejects-bare.mjs', 'update-bare.mjs', 'b.mjs'] },
    'a.mjs': recorder('a', trace), 'b.mjs': recorder('b', trace), 'throws-bare.mjs': { init() { throw bare(); } }, 'throws-getter.mjs': { init() { throw messageThrows(); } }, 'rejects-bare.mjs': { init: async () => { throw bare(); } },
    'update-bare.mjs': { update() { throw bare(); }, dispose() { throw bare(); } } });
  await X.load();
  const st = X.status(); assert.deepEqual(st.map(x => x.state), ['failed', 'failed', 'failed', 'failed', 'running', 'failed', 'failed', 'failed', 'running', 'running']); assert.deepEqual(st.slice(0, 4).map(x => x.stage), ['list', 'list', 'list', 'list']);
  for (const x of st) assert.ok(x.error === null || typeof x.error === 'string', 'every error is text'); assert.equal(st[5].error, 'unknown error'); assert.equal(st[6].error, 'unknown error'); assert.equal(st[7].error, 'unknown error');
  assert.deepEqual(trace, ['a.init', 'b.init']); X.update(1, 16, CAM, false, 1); assert.deepEqual(trace.slice(2), ['a.update@1', 'b.update@1'], 'the module whose update throws a value with no text is stopped, the others go on');
  assert.equal(X.status()[8].state, 'failed'); assert.equal(X.status()[8].error, 'unknown error'); for (const p of X.problems()) assert.ok(typeof p.name === 'string' && typeof p.text === 'string');
  assert.doesNotThrow(() => moreHTML(X)); assert.doesNotThrow(() => X.dispose()); assert.ok(log.errors.length >= 8);
  for (const e of [bare(), toStringThrows(), messageThrows(), null, undefined, 5, 'x', Symbol('s'), 10n]) assert.equal(looksAbsent(e), false);
  const typeErr = Object.defineProperty(new TypeError('x'), 'message', { get() { throw new Error('getter'); } }); assert.equal(looksAbsent(typeErr), false);
  // the ids and titles of a registration may be anything: a wrong id throws a TypeError that says so, a title that has no text falls back to the id
  const X2 = new Extensions(fakeTheatre(), { importer: async () => { throw notFound('x'); }, log: mkLog() }), rec = { path: 'r.mjs', state: 'running' }, ctx = X2.ctxFor(rec);
  for (const id of [bare(), 10n, Symbol('i'), null, '', ' ', 'x'.repeat(81)]) assert.throws(() => ctx.registerPanel(id, 't', () => {}), TypeError);
  assert.equal(ctx.registerPanel('ok', bare(), () => {}).id, 'ok'); assert.equal(X2.panels.get('ok').title, 'ok'); ctx.registerLayerToggle('tg', toStringThrows(), () => true, () => {}); assert.equal(X2.toggles.get('tg').title, 'tg');
  assert.match(failedHTML(new Error('threw')), /This panel could not be drawn: threw<\/p>/); assert.match(failedHTML(bare()), /could not be drawn: no reason was given/); assert.match(failedHTML(undefined), /no reason was given/); assert.match(failedHTML('a <b>'), /a &lt;b&gt;/); assert.doesNotThrow(() => failedHTML(messageThrows()));
});

test('one module cannot change the frame the next one is given', async () => {
  const seen = []; const { X } = mk({ [INDEX]: { default: ['a.mjs', 'b.mjs'] }, 'a.mjs': { update(f) { f.tMin = -1; f.cam = null; f.speed = 99; f.paused = 'x'; assert.throws(() => { f.extra = 1; }, TypeError); } }, 'b.mjs': { update(f) { seen.push({ ...f }); } } });
  await X.load(); X.update(77, 20, CAM, false, 2); assert.deepEqual(seen, [{ tMin: 77, dtMs: 20, cam: CAM, paused: false, speed: 2 }]);
});

test('a module with nothing to run is said so; a module without update costs nothing per frame', async () => {
  const { X, log } = mk({ [INDEX]: { default: ['empty.mjs', 'init-only.mjs'] }, 'empty.mjs': { something: 1 }, 'init-only.mjs': { init() {} } }); await X.load();
  assert.equal(log.warns.length, 1); assert.match(String(log.warns[0][0]), /empty\.mjs: exports no init, update or dispose/); assert.equal(X.nUpdating, 0); X.update(1, 16, CAM, false, 1); assert.deepEqual(X.status().map(s => s.updates), [0, 0]); X.dispose();
});

// ---------------------------------------------------------------- slow start, Back during a start
test('a slow start does not hold the theatre: it goes on after the wait and the module joins when it is ready', async () => {
  const trace = []; let release; const gate = new Promise(r => { release = r; });
  const { X, log, th } = mk({ [INDEX]: { default: ['slow.mjs', 'fast.mjs'] }, 'slow.mjs': recorder('slow', trace, { init: async ctx => { ctx.registerPanel('p-slow', 'Slow', () => {}); await gate; } }), 'fast.mjs': recorder('fast', trace) }, { waitMs: 30 });
  await X.load(); assert.deepEqual(trace, ['slow.init', 'fast.init']); assert.deepEqual(X.status().map(s => [s.state, s.late]), [['loading', true], ['running', false]]);
  assert.equal(log.warns.length, 1); assert.match(String(log.warns[0][0]), /slow\.mjs: still starting after 30 ms/); assert.deepEqual(X.problems(), [{ name: 'slow.mjs', text: 'still starting' }]);
  trace.length = 0; X.update(1, 16, CAM, false, 1); assert.deepEqual(trace, ['fast.update@1'], 'no update before init has resolved');
  const n = th.heard.filter(h => h[0] === 'ext').length; release(); await X.whenSettled();
  assert.equal(X.status()[0].state, 'running'); assert.deepEqual(X.problems(), []); assert.ok(th.heard.filter(h => h[0] === 'ext').length > n, 'the drawer is told');
  trace.length = 0; X.update(2, 16, CAM, false, 1); assert.deepEqual(trace, ['slow.update@2', 'fast.update@2'], 'list order holds for a module that joined late'); X.dispose();
  assert.equal(INIT_WAIT_MS, 15000);
});

test('Back while a module is starting: no update ever, dispose exactly once as soon as its init settles; the rest of the list is not started', async () => {
  const trace = []; let release; const gate = new Promise(r => { release = r; });
  const { X, log, asked } = mk({ [INDEX]: { default: ['a.mjs', 'slow.mjs', 'never.mjs'] }, 'a.mjs': recorder('a', trace), 'slow.mjs': recorder('slow', trace, { init: () => gate }), 'never.mjs': recorder('never', trace) });
  const loading = X.load(); await sleep(10); assert.deepEqual(trace, ['a.init', 'slow.init']);
  X.dispose(); assert.deepEqual(trace, ['a.init', 'slow.init', 'a.dispose'], 'the module still starting is not ended in the middle of its init'); X.update(1, 16, CAM, false, 1);
  release(); await loading; await X.whenSettled(); assert.deepEqual(trace, ['a.init', 'slow.init', 'a.dispose', 'slow.dispose']); assert.ok(!asked.includes('never.mjs'));
  assert.deepEqual(X.status().map(s => s.state), ['stopped', 'stopped']); assert.deepEqual([log.errors, log.warns], [[], []]);
  // an init that breaks because its theatre is gone is not reported as an error (the visit is over), but the module is still told to end
  const t2 = []; let fail; const g2 = new Promise((_, rej) => { fail = rej; }); const b = mk({ [INDEX]: { default: ['x.mjs'] }, 'x.mjs': recorder('x', t2, { init: () => g2 }) });
  const l2 = b.X.load(); await sleep(5); b.X.dispose(); fail(new Error('the host is gone')); await l2; await b.X.whenSettled(); assert.deepEqual(t2, ['x.init', 'x.dispose']); assert.deepEqual(b.log.errors, []); assert.equal(b.X.status()[0].state, 'stopped');
});

// ---------------------------------------------------------------- the registries
test('registerPanel: listed in order, reserved and foreign ids refused, own id replaced, the handle opens and closes through the theatre', async () => {
  let ctxA, ctxB, h; const fnA = () => {}, fnA2 = () => {};
  const { X, th, log } = mk({ [INDEX]: { default: ['a.mjs', 'b.mjs', 'thief.mjs'] }, 'a.mjs': { init(c) { ctxA = c; h = c.registerPanel('shared', 'Shared title', fnA); } }, 'b.mjs': { init(c) { ctxB = c; } }, 'thief.mjs': { init(c) { c.registerPanel('shared', 'Stolen', () => {}); } } });
  await X.load();
  assert.deepEqual(Object.keys(h).sort(), ['close', 'id', 'isOpen', 'open', 'refresh', 'remove']); assert.equal(h.id, 'shared');
  assert.equal(log.errors.length, 1, 'a second module asking for the same id fails its start'); assert.match(String(log.errors[0][1].message), /already registered by a\.mjs/); assert.equal(X.status()[2].state, 'failed');
  for (const id of ['events', 'views', 'scenario', 'info', 'settings', 'sound', MORE]) assert.throws(() => ctxA.registerPanel(id, 'x', () => {}), /belongs to the shell/, id);
  assert.throws(() => ctxA.registerPanel('', 'x', () => {}), TypeError); assert.throws(() => ctxA.registerPanel(5, 'x', () => {}), TypeError); assert.throws(() => ctxA.registerPanel('ok', 'x', 'not a function'), /renderFn must be a function/);
  ctxB.registerPanel('second', '', () => {}); assert.deepEqual([...X.panels.values()].map(p => [p.id, p.title, p.owner.path]), [['shared', 'Shared title', 'a.mjs'], ['second', 'second', 'b.mjs']], 'registration order; an empty title falls back to the id');
  assert.equal(X.panels.get('shared').render, fnA); const h2 = ctxA.registerPanel('shared', 'New title', fnA2); assert.equal(h2, h, 'the same handle'); assert.equal(X.panels.get('shared').render, fnA2); assert.equal(X.panels.get('shared').title, 'New title'); assert.equal(X.panels.size, 2);
  assert.equal(h.isOpen(), false); assert.equal(h.open(), true); assert.deepEqual(th.opened, ['shared']); assert.equal(h.isOpen(), true); h.open(); assert.deepEqual(th.opened, ['shared'], 'open() on an open panel does not toggle it shut');
  th.heard.length = 0; h.refresh(); assert.deepEqual(th.heard, [['ext-panel', 'shared', undefined]]); h.close(); assert.equal(th.state.panel, null); h.refresh(); assert.equal(th.heard.length, 1, 'a closed panel is not redrawn');
  assert.equal(h.remove(), true); assert.equal(h.remove(), false); assert.deepEqual([...X.panels.keys()], ['second']); assert.deepEqual(X.status().map(s => s.panels), [[], ['second'], []]);
  X.dispose(); assert.equal(X.panels.size, 0); assert.throws(() => ctxB.registerPanel('after', 'x', () => {}), /has been left/);
});

test('registerLayerToggle: the switch shows what getFn reports; setFn gets true or false, may be async, may refuse, may throw; the viewer is told', async () => {
  let ctx, h, on = false, locked = true, calls = [];
  const { X, th, log } = mk({ [INDEX]: { default: ['a.mjs', 'b.mjs'] }, 'a.mjs': { init(c) { ctx = c; h = c.registerLayerToggle('veg', 'Vegetation of July 1863', () => on, async v => { calls.push(v); await sleep(2); on = v; }); } }, 'b.mjs': { init(c) { c.registerLayerToggle('veg', 'Stolen', () => true, () => {}); } } });
  await X.load();
  assert.deepEqual(Object.keys(h).sort(), ['get', 'id', 'refresh', 'remove', 'set']); assert.equal(X.status()[1].state, 'failed', 'an id held by another module is refused');
  assert.equal(h.get(), false); assert.equal(await X.setToggle('veg', 1), true); assert.deepEqual(calls, [true], 'setFn gets a boolean'); assert.equal(h.get(), true); assert.equal(await h.set(false), false); assert.deepEqual(calls, [true, false]);
  assert.deepEqual(th.said, ['Vegetation of July 1863 shown.', 'Vegetation of July 1863 hidden.']); assert.deepEqual(th.heard.filter(x => x[0] === 'layer'), [['layer', 'veg', true], ['layer', 'veg', false]]); assert.equal(th.heard.filter(x => x[0] === 'ext-toggle').length, 2);
  ctx.registerLayerToggle('locked', 'Locked layer', () => locked, () => { /* refuses: keeps its state */ }); assert.equal(await X.setToggle('locked', false), true, 'a layer that refuses keeps reporting its own state'); assert.equal(th.said.at(-1), 'Locked layer shown.');
  ctx.registerLayerToggle('bad', 'Broken layer', () => { throw new Error('get broke'); }, () => { throw new Error('set broke'); });
  const e0 = log.errors.length; assert.equal(X.toggleState('bad'), false); assert.equal(X.toggleState('bad'), false); assert.equal(log.errors.length, e0 + 1, 'a getFn that throws is logged once and read as off');
  assert.equal(await X.setToggle('bad', true), false); assert.equal(th.said.at(-1), 'Broken layer could not be switched.'); assert.match(String(log.errors.at(-1)[0]), /layer switch 'bad' failed/); assert.equal(X.status()[0].state, 'running', 'a failing switch does not stop its module');
  assert.throws(() => ctx.registerLayerToggle('x', 'X', () => true), /getFn and setFn must be functions/); assert.equal(await X.setToggle('nobody', true), false);
  assert.deepEqual([...X.toggles.keys()], ['veg', 'locked', 'bad']); assert.equal(ctx.registerPanel('veg', 'A panel may share the id of a switch', () => {}).id, 'veg');
  assert.equal(h.remove(), true); assert.deepEqual([...X.toggles.keys()], ['locked', 'bad']); X.dispose();
});

// ---------------------------------------------------------------- the drawer, as HTML
test('the More drawer: switches with their state, panels, what is not running; titles are escaped; no forbidden wording', async () => {
  let on = true; const { X } = mk({ [INDEX]: { default: ['a.mjs', 'gone.mjs'] }, 'a.mjs': { init(c) { c.registerLayerToggle('mon', 'Monuments <later memorials>', () => on, v => { on = v; }); c.registerLayerToggle('off', 'Off layer', () => false, () => {}); c.registerPanel('claims', 'Sources of "what you see"', () => {}); } } });
  assert.match(moreHTML(X), /Nothing has been added to this visit/); assert.equal(togglesHTML(X), ''); await X.load();
  const h = moreHTML(X);
  assert.match(h, /<input type="checkbox" data-xlayer="mon" checked> Monuments &lt;later memorials&gt;<\/label>/); assert.match(h, /<input type="checkbox" data-xlayer="off" > Off layer<\/label>/);
  assert.match(h, /<button type="button" class="xp-item" data-xpanel="claims"><span>Sources of &quot;what you see&quot;<\/span><\/button>/); assert.match(h, /Not running in this visit/); assert.match(h, /<b>gone\.mjs<\/b> could not be loaded: /);
  assert.ok(!/data-layer=/.test(h), 'the structure switches keep their own attribute to themselves'); assert.ok(!/class="item"/.test(h), 'no row that the Views tests count');
  assert.ok(h.indexOf('data-xlayer="mon"') < h.indexOf('data-xlayer="off"') && h.indexOf('data-xlayer="off"') < h.indexOf('data-xpanel="claims"'));
  assert.match(togglesHTML(X, 'More layers'), /^<h3>More layers<\/h3><label class="check">/);
  const text = h.replace(/<[^>]+>/g, ' '); assert.ok(!FORBIDDEN.test(text), 'the copy rule of tests/real.spec.mjs');
  X.dispose();
});

// ---------------------------------------------------------------- the More tool (mountExtensionsUI of ui/ext-panel.mjs, with a stand-in button and theatre: no page needed)
test('the More tool: hidden until something is registered or has failed; the dot and the accessible name say how many parts are not running; panelFor reaches the added panels', async () => {
  const mkBtn = () => ({ hidden: true, dataset: {}, title: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } });
  const wire = mods => { const th = fakeTheatre(), btn = mkBtn(); th.scope = new Scope('visit'); th.root = { querySelector: s => (s === '#bt-more' ? btn : null) }; const m = mk(mods, { th }); th.ext = m.X; mountExtensionsUI(th); return { ...m, btn }; };
  // nothing added: the tool stays hidden and says nothing
  let w = wire({}); assert.equal(w.btn.hidden, true); await w.X.load(); assert.equal(w.btn.hidden, true); assert.equal(w.btn.getAttribute('aria-label'), null); assert.equal(w.btn.title, '');
  // one failed module: the tool shows, with the dot (data-alert), a title and a name that says it; singular
  w = wire({ [INDEX]: { default: ['bad.mjs'] }, 'bad.mjs': { init() { throw new Error('x'); } } }); await w.X.load();
  assert.equal(w.btn.hidden, false); assert.equal(w.btn.dataset.alert, 'true'); assert.equal(w.btn.title, '1 part of the page not running'); assert.equal(w.btn.getAttribute('aria-label'), 'More, 1 part of the page not running');
  // a working module and two that fail: plural; the switch and the panel are counted for the tool, the failures for the dot
  let on = false; w = wire({ [INDEX]: { default: ['a.mjs', 'bad.mjs', 'gone.mjs'] }, 'a.mjs': { init(c) { c.registerLayerToggle('t', 'Switch T', () => on, v => { on = v; }); c.registerPanel('p', 'Panel P', () => {}); } }, 'bad.mjs': { init() { throw new Error('x'); } } }); await w.X.load();
  assert.equal(w.btn.hidden, false); assert.equal(w.btn.title, '2 parts of the page not running'); assert.equal(w.btn.getAttribute('aria-label'), 'More, 2 parts of the page not running');
  // panelFor: the shell's own panels first, then the More panel, then an added panel by its id; nothing else
  const th = w.th, p = th.panelFor('p'); assert.equal(th.panelFor('events'), th.PANELS.events); assert.equal(th.panelFor(MORE).title, 'More layers and panels'); assert.equal(th.panelFor(MORE), th.panelFor(MORE), 'one More panel per visit');
  assert.equal(p.title, 'Panel P'); assert.equal(typeof p.render, 'function'); assert.equal(th.panelFor('nobody'), null);
  // only a working module with only a switch: the tool shows, no dot, no accessible name of its own
  w = wire({ [INDEX]: { default: ['a.mjs'] }, 'a.mjs': { init(c) { c.registerLayerToggle('t', 'Switch T', () => false, () => {}); } } }); await w.X.load();
  assert.equal(w.btn.hidden, false); assert.equal(w.btn.dataset.alert, 'false'); assert.equal(w.btn.getAttribute('aria-label'), null); assert.equal(w.btn.title, '');
  // the open added panel goes away with its module (an update that throws): the drawer goes back to the list; the list closes when nothing is left
  let boom = false; w = wire({ [INDEX]: { default: ['u.mjs'] }, 'u.mjs': { init(c) { c.registerPanel('up', 'Panel U', () => {}); }, update() { if (boom) throw new Error('update broke'); } } }); await w.X.load();
  w.th.state.panel = 'up'; boom = true; w.X.update(1, 16, CAM, false, 1); assert.deepEqual(w.th.opened, [MORE], 'the panel of the stopped module is replaced by the list'); assert.equal(w.btn.getAttribute('aria-label'), 'More, 1 part of the page not running');
  let h2; const x2 = wire({ [INDEX]: { default: ['q.mjs'] }, 'q.mjs': { init(c) { h2 = c.registerPanel('only', 'Only panel', () => {}); } } }); await x2.X.load(); assert.equal(x2.btn.hidden, false);
  x2.th.state.panel = MORE; x2.th.closed = 0; x2.th.closePanel = () => { x2.th.closed++; x2.th.state.panel = null; }; h2.remove(); assert.equal(x2.btn.hidden, true, 'nothing left: the tool is hidden again'); assert.equal(x2.th.closed, 1, 'and the open list is closed');
});

// ---------------------------------------------------------------- one drawing of an added panel (drawAdded of ui/ext-panel.mjs, with a stand-in box: no page needed)
test('drawAdded: every form a renderFn may return; the scope ends the cleanup; a throw or a rejection goes to fail; a late result is not drawn but its cleanup is called', async () => {
  const mkBox = () => ({ html: 'old', kids: [], set innerHTML(v) { this.html = v; }, get innerHTML() { return this.html; }, append(n) { this.kids.push(n); }, replaceChildren() { this.html = ''; this.kids.length = 0; } });
  const th = { tag: 'theatre' }, NODE = { nodeType: 1, tag: 'p' }, fails = [], logged = { errors: [], warns: [] }, ce = console.error, cw = console.warn;
  console.error = (...a) => logged.errors.push(a); console.warn = (...a) => logged.warns.push(a);
  const draw = render => { const box = mkBox(); let drawn = 0; const sc = drawAdded({ id: 'p', owner: { path: 'm.mjs' }, render }, box, th, e => fails.push(e), () => { drawn++; }); return { box, sc, drawn: () => drawn }; };
  try {
    // nothing returned: what the module drew stays; render is given (box, theatre, the scope that is returned)
    let given = null; const a = draw((body, t, scope) => { given = [body, t, scope]; body.innerHTML = '<p>drawn in place</p>'; });
    assert.equal(a.box.html, '<p>drawn in place</p>'); assert.ok(given[0] === a.box && given[1] === th && given[2] === a.sc && a.sc.disposed === false); assert.equal(a.drawn(), 1);
    // a string replaces the content, a node is appended
    assert.equal(draw(() => '<b>string</b>').box.html, '<b>string</b>'); const n = draw(() => NODE); assert.deepEqual(n.box.kids, [NODE]); assert.equal(n.box.html, '');
    // a cleanup function and an object with dispose(): called once, by the scope
    const order = []; const f = draw(b => { b.innerHTML = 'f'; return () => order.push('fn'); }), o = draw(() => ({ dispose() { order.push('obj'); } }));
    assert.deepEqual(order, []); f.sc.dispose(); f.sc.dispose(); o.sc.dispose(); assert.deepEqual(order, ['fn', 'obj'], 'each cleanup once');
    // what the module put on the scope ends with it, last added first; a cleanup that throws does not stop the others
    order.length = 0; const s = draw((b, t, scope) => { scope.add(() => order.push('first')); scope.add(() => { throw new Error('cleanup broke'); }); return () => order.push('returned'); });
    s.sc.dispose(); assert.deepEqual(order, ['returned', 'first']); assert.equal(logged.warns.length, 1);
    // promises of each form
    const ps = draw(() => Promise.resolve('<i>promised string</i>')), pf = draw(async b => { await sleep(5); b.innerHTML = '<i>promised</i>'; return () => order.push('async'); });
    assert.equal(pf.drawn(), 0, 'not drawn before the promise settles'); await sleep(25); assert.equal(ps.box.html, '<i>promised string</i>'); assert.equal(pf.box.html, '<i>promised</i>'); assert.equal(pf.drawn(), 1);
    order.length = 0; pf.sc.dispose(); assert.deepEqual(order, ['async']);
    // a throw and a rejection while the drawing is current go to fail; nothing is drawn; the scope is still returned
    const t1 = draw(() => { throw new Error('threw'); }), t2 = draw(async () => { await sleep(1); throw new Error('rejected'); }); await sleep(20);
    assert.deepEqual(fails.map(e => e.message), ['threw', 'rejected']); assert.equal(t1.drawn() + t2.drawn(), 0); assert.equal(t1.sc.disposed, false); assert.deepEqual(logged.errors, [], 'for a current drawing the logging is the caller\'s (fail)');
    // a result that arrives after the drawing has ended (the panel was closed, or drawn again): not drawn, its cleanup still called
    for (const [label, result, calls] of [['function', () => () => order.push('late fn'), ['late fn']], ['object', () => ({ dispose() { order.push('late obj'); } }), ['late obj']], ['string', () => '<p>too late</p>', []], ['node', () => NODE, []]]) {
      order.length = 0; let release; const gate = new Promise(r => { release = r; }); const l = draw(() => gate.then(result)); l.sc.dispose(); release(); await sleep(5);
      assert.deepEqual(order, calls, label); assert.equal(l.box.html, '', label); assert.deepEqual(l.box.kids, [], label); assert.equal(l.drawn(), 0, label);
    }
    assert.equal(fails.length, 2, 'a late result is not a failure');
    // a late cleanup that throws is a warning; a late rejection is logged (the panel is gone, so there is nowhere to show it)
    const w0 = logged.warns.length; let rel2; const g2 = new Promise(r => { rel2 = r; }); const lb = draw(() => g2.then(() => () => { throw new Error('late cleanup broke'); })); lb.sc.dispose(); rel2(); await sleep(5);
    assert.equal(logged.warns.length, w0 + 1); assert.match(String(logged.warns.at(-1)[0]), /ext m\.mjs: panel 'p': its cleanup failed/);
    const lr = draw(() => new Promise((_, rej) => setTimeout(() => rej(new Error('late rejection')), 5))); lr.sc.dispose(); await sleep(25);
    assert.equal(fails.length, 2); assert.equal(logged.errors.length, 1); assert.match(String(logged.errors[0][0]), /ext m\.mjs: panel 'p' could not be drawn/); assert.equal(logged.errors[0][1].message, 'late rejection');
    // a thenable that is not a Promise is awaited too
    const tn = draw(() => ({ then(res) { res('<u>thenable</u>'); } })); await sleep(5); assert.equal(tn.box.html, '<u>thenable</u>');
  } finally { console.error = ce; console.warn = cw; }
});

// ---------------------------------------------------------------- the tier mark
test('tierMark: the four tiers and their short spellings give the card pill; a longer statement is marked by the weakest tier it names and stays visible; unknown is said, never guessed', () => {
  assert.deepEqual([...tierMark.tiers], TIERS);
  for (const t of TIERS) { const h = tierMark(t); assert.match(h, new RegExp(`^<span class="pill" data-tier="${t}"><svg[^>]*aria-hidden="true">.*</svg>${TIER_STYLE[t].label}</span>$`), t); assert.equal(tierName(t), t); assert.equal(tierMark.label(t), TIER_STYLE[t].label); }
  for (const [s, want] of [['gap', 'open gap'], ['open', 'open gap'], ['open_gap', 'open gap'], ['Open Gap', 'open gap'], ['plausible_procedural', 'plausible-procedural'], ['  INFERRED ', 'inferred'], ['Documented', 'documented']]) { assert.equal(tierName(s), want, s); assert.ok(tierMark(s).startsWith(`<span class="pill" data-tier="${want}">`), s); }
  for (const [s, want] of [['documented (secondary)', 'documented'], ['documented (general); mix plausible-procedural', 'plausible-procedural'], ['hats and coats documented; leggings and 24th MI open; rest plausible-procedural', 'open gap'],
    ['inferred (rows are seeded_unverified; never documented)', 'inferred'], ['open; default plausible-procedural', 'open gap'], ['see B.6.6 (inferred default)', 'inferred'], ['unresolved', 'open gap'], ['plausible-procedural (TIERS.json F-TEXMAPS)', 'plausible-procedural']]) {
    assert.equal(tierName(s), want, s); const h = tierMark(s); assert.ok(h.startsWith(`<span class="tier-mark"><span class="pill" data-tier="${want}">`), s); assert.ok(h.includes(`<span class="mini tier-note">${s}</span>`), 'the whole statement stays visible: ' + s);
  }
  for (const s of ['not documented', 'never documented', 'no source; not yet documented', 'undocumented']) assert.notEqual(tierName(s), 'documented', s);
  for (const s of [undefined, null, '', '   ', 'weak', 'seeded_unverified', 'not used', 42, {}, [], NaN]) { assert.equal(tierName(s), null, String(s)); const h = tierMark(s); assert.match(h, /^<span class="pill" data-tier="none"[^>]*>Tier not stated/, String(s)); assert.ok(!/<svg/.test(h)); assert.equal(tierMark.label(s), 'Tier not stated'); }
  assert.ok(tierMark('weak').includes('Tier not stated: weak'));
  const x = tierMark('documented <img src=x onerror=alert(1)>'); assert.ok(!x.includes('<img')); assert.ok(x.includes('&lt;img')); assert.ok(!tierMark('<script>').includes('<script>'));
  const st = tierMark.style('gap'); assert.deepEqual(st, { tier: 'open gap', label: 'Open gap', color: TIER_STYLE['open gap'].color, dash: TIER_STYLE['open gap'].dash, glyph: 'square' }); st.dash.push(9); assert.notDeepEqual(TIER_STYLE['open gap'].dash, st.dash, 'a copy: the shell table cannot be changed through it');
  assert.equal(tierMark.style('???').tier, null); assert.equal(tierMark.tier('inferred'), 'inferred');
  const glyphs = new Set(TIERS.map(t => tierMark.style(t).glyph)), dashes = new Set(TIERS.map(t => tierMark.style(t).dash.join(','))); assert.equal(glyphs.size, 4, 'four shapes: the tier never depends on colour alone'); assert.equal(dashes.size, 4);
});

// strength of a reading, lower is stronger: documented 0 ... open gap 3, and "tier not stated" 4 (weaker than every tier: it says nothing)
const strength = t => (t === null ? 4 : TIERS.indexOf(t));
test('tierMark: a negated or hedged tier word is not a tier: the three examples of the review, the whole probe list, and the statements that stay plain', () => {
  // the three examples that returned "documented": hedged wording
  for (const s of ['partially documented', 'probably documented', 'to be documented']) { assert.equal(tierName(s), null, s); assert.match(tierMark(s), /^<span class="pill" data-tier="none"[^>]*>Tier not stated: /, s); assert.equal(tierMark.label(s), 'Tier not stated'); }
  // the whole probe list of the review: none of them is a plain "documented" or "inferred" (the rows that say a tier plainly are in the next list)
  const hedged = ['partly documented', 'mostly documented', 'documented in part', 'documented only in part', 'possibly documented', 'supposedly documented', 'allegedly documented', 'weakly documented', 'barely documented', 'poorly documented', 'insufficiently documented',
    'documented? no', 'documented: false', 'documented, but contested', 'not fully documented', 'less than documented', 'hardly documented', 'almost documented', 'nearly documented', 'sparsely documented', 'claimed documented', 'documented-ish', 'semi-documented', 'quasi-documented',
    'documented elsewhere', 'non-documented', 'never inferred', 'no inferred basis', 'can be documented', 'could be documented', 'should be documented', 'not yet documented', 'needs to be documented', 'unverified documented', 'seeded_unverified documented',
    'yet to be documented', 'under-documented', 'ill-documented', 'half documented', 'some hats documented', 'most documented', 'documented?', 'documented (unverified)', 'documented, in part', 'documented (in part)', 'documented = no', 'documented - none', 'documented (no)', 'documented: n/a',
    'perhaps inferred', 'probably inferred', 'partly inferred', 'inferred in part', 'if documented', 'once documented', 'may be documented', 'will be documented', 'cannot be documented', "isn't documented", 'wasn’t documented', 'neither documented nor inferred', 'not documented or inferred', 'never documented or inferred', 'without documented source', 'lacks documented source'];
  for (const s of hedged) assert.equal(tierName(s), null, s);
  for (const [s, want] of [['was documented', 'documented'], ['fully documented', 'documented'], ['well documented in the 1864 report', 'documented'], ['directly documented', 'documented'], ['documented, primary source', 'documented'], ['documented (disputed)', 'documented'], ['May 1863 documented', 'documented'], ['was documented in May', 'documented'],
    ['inferred or documented', 'inferred'], ['documented or inferred', 'inferred'], ['documented / inferred', 'inferred'], ['documented, not inferred', 'documented'], ['inferred, not documented', 'inferred'], ['not documented; inferred', 'inferred'], ['not documented, open', 'open gap'],
    ['documented; no gaps', 'documented'], ['documented; no open gaps remain', 'documented'], ['documented without gaps', 'documented'], ['no gaps', null], ['not open', null], ['no open gaps', null], ['not plausible-procedural', null],
    // a hedged documented or inferred can lower what a plain word made, never raise it; a weaker word keeps counting when it is hedged
    ['documented; probably inferred', 'inferred'], ['documented (secondary); partly inferred', 'inferred'], ['inferred; possibly documented', 'inferred'], ['partly documented; leggings open', 'open gap'], ['partly documented; rest inferred', 'inferred'], ['documented, partly inferred', null],
    ['documented; possibly open', 'open gap'], ['probably plausible-procedural', 'plausible-procedural'], ['partly open', 'open gap'], ['mostly inferred; some plausible-procedural', 'plausible-procedural'], ['hats may be documented, leggings open', 'open gap'],
    ['', null], ['   ', null], ['weak', null], ['seeded_unverified', null], ['not used', null]]) assert.equal(tierName(s), want, s);
  // a mark that is not a tier still shows the statement, escaped
  assert.ok(tierMark('probably <b>documented</b>').includes('Tier not stated: probably &lt;b&gt;documented&lt;/b&gt;'));
});

test('tierMark: what a hedge or a negation does is the same for every word of its list; it can lower a mark and never raise it', () => {
  assert.ok(TIER_WORDS.negations.length > 20 && TIER_WORDS.hedges.length > 80 && TIER_WORDS.modals.length > 15 && TIER_WORDS.afters.length > 30 && TIER_WORDS.joined.length === 3);
  const strong = ['documented', 'inferred'], weak = ['plausible-procedural', 'open gap'];
  for (const w of TIER_WORDS.negations) {
    for (const t of [...strong, ...weak]) assert.equal(tierName(`${w} ${t}`), null, `${w} ${t}`);
    assert.equal(tierName(`documented; ${w} open`), 'documented', `a negated weak word is not a gap: ${w} open`);
    for (const t of TIERS) assert.ok(strength(tierName(`${w} ${t}`)) >= strength(t), `${w} ${t}`);
  }
  for (const w of TIER_WORDS.hedges) {
    for (const t of strong) { assert.equal(tierName(`${w} ${t}`), null, `${w} ${t}`); assert.equal(tierName(`${w} ${t}; open`), 'open gap', `${w} ${t}; open`); assert.equal(tierName(`${t}; ${w} inferred`), t === 'documented' ? 'inferred' : 'inferred', `${t}; ${w} inferred`); }
    for (const t of weak) assert.equal(tierName(`${w} ${t}`), t, `a hedged weaker word still counts: ${w} ${t}`);
    for (const t of TIERS) assert.ok(strength(tierName(`${w} ${t}`)) >= strength(t), `${w} ${t}`);
  }
  for (const m of TIER_WORDS.modals) for (const t of strong) { assert.equal(tierName(`${m} be ${t}`), null, `${m} be ${t}`); assert.equal(tierName(`${m} 1863 ${t}`), t, `${m} 1863 ${t}: a modal hedges only before "be"`); }
  for (const j of TIER_WORDS.joined) for (const t of strong) { assert.equal(tierName(`${j}-${t}`), null, `${j}-${t}`); assert.equal(tierName(`${j} the survey ${t}`), t, `${j} the survey ${t}: only against the word`); }
  for (const a of TIER_WORDS.afters) for (const t of strong) for (const form of [`${t} ${a}`, `${t}, ${a}`, `${t} (${a})`, `${t}: ${a}`]) { assert.equal(tierName(form), null, form); assert.ok(strength(tierName(form)) >= strength(t)); }
  for (const a of TIER_WORDS.afters) for (const t of weak) assert.equal(tierName(`${t} ${a}`), t, `${t} ${a}`);
  // two plain statements: the weaker one is the mark, in any order and with any joiner
  for (const a of TIERS) for (const b of TIERS) for (const j of [';', ',', ' or ', ' / ', ' and ']) assert.equal(tierName(`${a}${j} ${b}`.replace('; ;', ';')), TIERS[Math.max(TIERS.indexOf(a), TIERS.indexOf(b))], `${a}${j} ${b}`);
  // a statement is read clause by clause: a hedge in one clause does not reach a tier word in another
  assert.equal(tierName('probably accurate; documented'), 'documented'); assert.equal(tierName('documented (secondary source, probably accurate)'), 'documented'); assert.equal(tierName('not documented. Inferred.'), 'inferred');
  // the reading itself: how each tier word is said
  assert.deepEqual(readTierWords('partly documented; open; not inferred').map(x => [x.word, x.how]), [['documented', 'hedged'], ['open', 'plain'], ['inferred', 'negated']]);
  assert.deepEqual(tierReading('Partly DOCUMENTED; open_gap; Not inferred').map(x => [x.word, x.rank, x.how]), [['documented', 0, 'hedged'], ['open', 3, 'plain'], ['gap', 3, 'plain'], ['inferred', 1, 'negated']], 'tierReading cleans the statement first'); assert.deepEqual(tierReading(Object.create(null)), []);
  assert.deepEqual(readTierWords('documented, but only in part').map(x => x.how), ['hedged']); assert.deepEqual(readTierWords('documented (secondary)').map(x => x.how), ['plain']); assert.deepEqual(readTierWords('nothing here'), []);
});

test('tierMark and the loader never throw, whatever they are given: an object without a prototype, a toString that throws, a revoked proxy, symbols, a huge text; words that Object.prototype also has are only words', () => {
  const revoked = (() => { const r = Proxy.revocable({}, {}); r.revoke(); return r.proxy; })();
  const hostile = [Object.create(null), { toString() { throw new Error('toString threw'); } }, { toString: null, valueOf: null }, { [Symbol.toPrimitive]() { throw 1; } }, new Proxy({}, { get() { throw new Error('trap'); } }), revoked, [Object.create(null)], [[[]]], { length: -1 },
    Symbol('s'), 10n, () => 1, class K {}, new Date(NaN), '\u0000\ud800', 'x'.repeat(2e6), 'documented '.repeat(20000), 'not documented, '.repeat(20000), '('.repeat(500000) + 'documented'];
  for (const h of hostile) {
    let m, n; assert.doesNotThrow(() => { m = tierMark(h); n = tierName(h); tierMark.label(h); tierMark.style(h); tierMark.tier(h); }, plain(typeof h)); assert.equal(typeof m, 'string'); assert.ok(m.startsWith('<span'), m.slice(0, 40)); assert.ok(n === null || TIERS.includes(n));
    assert.ok(!/<script|<img/.test(m));
  }
  assert.equal(tierName(Object.create(null)), null); assert.equal(plain(Object.create(null)), ''); assert.equal(plain({ toString() { throw 1; } }), ''); assert.equal(plain(null), ''); assert.equal(plain(undefined), ''); assert.equal(plain(5), '5'); assert.equal(plain('x'), 'x');
  for (const w of ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', '__defineGetter__', '__lookupGetter__', 'prototype', 'Constructor ', ' __PROTO__ ']) {
    assert.equal(tierName(w), null, w); assert.equal(tierMark.tier(w), null, w); assert.equal(tierMark.label(w), 'Tier not stated', w); assert.match(tierMark(w), /^<span class="pill" data-tier="none"/, w); assert.deepEqual(readTierWords(w.toLowerCase().trim()), [], w);
    assert.equal(tierName(`documented; ${w}`), 'documented', `${w} is not a hedge or a tier`);
  }
});

// ---------------------------------------------------------------- the choices
test('choices: callable and readable, always the choices in effect now, never writable', () => {
  const th = fakeTheatre(), X = new Extensions(th, { importer: async () => { throw notFound('x'); }, log: mkLog() }), c = X.ctxFor(null).choices;
  assert.equal(typeof c, 'function'); assert.equal(c(), th.state.scenario.choices); assert.equal(c['CF-WIND-SPEED'], 'recommended'); assert.ok('C-004' in c); assert.ok(!('C-999' in c)); assert.equal(c['C-999'], undefined);
  assert.deepEqual(Object.keys(c), ['CF-WIND-SPEED', 'C-004']); assert.deepEqual({ ...c }, { 'CF-WIND-SPEED': 'recommended', 'C-004': 'b' }); assert.deepEqual(Object.entries(c), [['CF-WIND-SPEED', 'recommended'], ['C-004', 'b']]);
  th.state.scenario.choices['C-004'] = 'a'; assert.equal(c['C-004'], 'a'); th.state.scenario.choices = { 'CF-NEW': 'x' }; assert.deepEqual({ ...c }, { 'CF-NEW': 'x' }, 'a reset replaces the object: the view follows'); assert.equal(c(), th.state.scenario.choices);
  th.state.scenario = { choices: { Z: 1 } }; assert.equal(c.Z, 1); th.state.scenario.choices = null; assert.deepEqual(c(), {}); assert.deepEqual(Object.keys(c), []);
  assert.throws(() => { c.Z = 2; }, TypeError); assert.throws(() => { delete c.Z; }, TypeError); assert.equal(c.then, undefined, 'awaiting it does not treat it as a promise');
  const d = liveChoices(() => undefined); assert.deepEqual(d(), {}); assert.equal(d.anything, undefined);
  assert.equal(X.ctxFor(null).structures, th.structs); th.structs = null; assert.equal(X.ctxFor(null).structures, null, 'structures off or failed: null');
});

// ---------------------------------------------------------------- the wiring in the shell (source order; theatre.mjs needs a page and cannot be imported here)
test('theatre.mjs: the loader starts after the renderer, the effects and the sound exist; update comes before host.frame; Back ends the modules before anything is torn down', () => {
  const src = fs.readFileSync(path.join(APP, 'src/theatre.mjs'), 'utf8'), at = (s, from = 0) => { const i = src.indexOf(s, from); assert.ok(i >= 0, 'theatre.mjs no longer contains: ' + s); return i; };
  assert.match(src, /importer: path => import\('\.\/ext\/' \+ path\)/, "the import the contract states: import('./ext/' + path)");
  const start = at('async start() {'), host = at('RenderHost.create(', start), fx = at('fxHost.init(', start), audio = at('AudioHost.init(', start), ext = at('new Extensions(this', start), load = at('await this.ext.load()', start), ready = at('this.ready = true', start);
  assert.ok(host < fx && fx < audio && audio < ext && ext < load && load < ready, 'render host, effects host, audio host, then the modules, then ready');
  assert.ok(at('mountChrome(this)', start) < ext && at('mountPanels(this)', start) < ext, 'the panels exist before a module registers one');
  const loop = at('loop(now) {'), upd = at('this.ext.update(st.t, dt * 1000, this.cam, !st.playing, st.speed)', loop), frame = at('this.host.frame(', loop), stage = at('this.stage.apply(st.t)', loop);
  assert.ok(stage < upd && upd < frame && frame < at('structsFrame(t) {'), 'every frame: the stage at the time, then update(frame), then host.frame');
  const disp = at('  dispose() {'), xd = at('this.ext.dispose()', disp); for (const s of ['this.scope.dispose()', 'fxHost.dispose()', 'AudioHost.dispose()', 'this.host.destroy()', 'this.root.remove()']) assert.ok(xd < at(s, disp), 'the modules are ended before ' + s);
  assert.match(src, /qs\.get\('ext'\) !== 'off'/); assert.match(src, /get ext\(\) \{ return self\.ext; \}/);
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8'); assert.match(html, /<button type="button" class="tool" id="bt-more" data-panel="more" aria-expanded="false" aria-controls="bt-drawer" hidden>/, 'the More tool is in the page and hidden until something is added'); assert.match(html, /<symbol id="i-more"/);
  const chrome = fs.readFileSync(path.join(APP, 'src/ui/chrome.mjs'), 'utf8'); assert.match(chrome, /PANELS\[name\] \|\| \(th\.panelFor \? th\.panelFor\(name\) : null\)/); assert.match(fs.readFileSync(path.join(APP, 'src/ui/panels.mjs'), 'utf8'), /mountLayersBlock\(body, th, ps\); mountExtToggles\(body, th, ps\);/);
});

test('render-host: addSceneHook draws after the figures and the structures without taking the one slot; a throwing hook is removed and the frame goes on', () => {
  const h = new RenderHost(), R = h.R = {}, trace = []; h._wireExt(); const err = console.error; let logged = 0; console.error = () => { logged++; };
  try {
    h.crowd = { scene: p => trace.push('crowd.scene'), shadow: (p, c) => trace.push('crowd.shadow' + c) }; R.ext = { scene: (p, r) => trace.push('structures.scene'), shadow: (p, c, r) => trace.push('structures.shadow' + c) };
    const offA = h.addSceneHook({ scene: (p, r) => trace.push(`a.scene:${p}:${r === R}`), shadow: (p, c, r) => trace.push(`a.shadow${c}`) }), bad = { scene() { trace.push('bad.scene'); throw new Error('hook broke'); } };
    h.addSceneHook(bad); h.addSceneHook(bad); const offC = h.addSceneHook({ shadow: (p, c) => trace.push('c.shadow' + c) });
    R.ext.scene('gl', R); assert.deepEqual(trace, ['crowd.scene', 'structures.scene', 'a.scene:gl:true', 'bad.scene']); assert.equal(logged, 1); assert.equal(h._hooks.length, 2, 'the throwing hook is gone (it had been added once)');
    trace.length = 0; R.ext.scene('gl', R); R.ext.shadow('gl', 1, R); assert.deepEqual(trace, ['crowd.scene', 'structures.scene', 'a.scene:gl:true', 'crowd.shadow1', 'structures.shadow1', 'a.shadow1', 'c.shadow1']); assert.equal(logged, 1);
    trace.length = 0; R.ext = null; R.ext.scene('gl', R); assert.deepEqual(trace, ['crowd.scene', 'a.scene:gl:true'], 'the structures leaving the slot does not remove the hooks');
    offA(); offA(); offC(); trace.length = 0; R.ext.scene('gl', R); R.ext.shadow('gl', 0, R); assert.deepEqual(trace, ['crowd.scene', 'crowd.shadow0']);
    assert.throws(() => h.addSceneHook(null), TypeError); assert.throws(() => h.addSceneHook({}), TypeError);
    h.addSceneHook({ scene() {} }); h.destroyed = true; h._hooks = []; assert.equal(typeof h.addSceneHook({ scene() {} }), 'function'); assert.equal(h._hooks.length, 0, 'nothing is added to a destroyed host');
  } finally { console.error = err; }
});

test('the order a hook relies on, with the real RenderHost and the real chain of the effects host: figures, structures, the hooks, then the weather and the effects; on WebGPU the effects come in the pass after the scene pass', () => {
  const h = new RenderHost(), R = h.R = {}, trace = []; h._wireExt();
  h.crowd = { scene: () => trace.push('crowd'), shadow: () => trace.push('crowd.shadow') };
  R.ext = { scene: () => trace.push('structures'), shadow: () => trace.push('structures.shadow') };               // what the structures do: host.R.ext = structures
  h.addSceneHook({ scene: (p, r) => trace.push('hook:' + p + ':' + (r === R)), shadow: (p, c) => trace.push('hook.shadow' + c) });
  const fx = Object.create(FxHost.prototype); FxHost.prototype._chainExt.call(fx, R, { scene: () => trace.push('weather+effects') });                 // WebGL2: the effects host draws inside the scene pass
  R.ext.scene('gl', R); assert.deepEqual(trace, ['crowd', 'structures', 'hook:gl:true', 'weather+effects'], 'the hooks are drawn after the figures and the structures and before the weather and the effects');
  trace.length = 0; R.ext.shadow('gl', 1, R); assert.deepEqual(trace, ['crowd.shadow', 'structures.shadow', 'hook.shadow1'], 'the shadow passes: the effects host draws no shadow');
  trace.length = 0; R.ext = { scene: () => trace.push('structures, attached later') }; R.ext.scene('gl', R); assert.deepEqual(trace, ['crowd', 'structures, attached later', 'hook:gl:true', 'weather+effects'], 'whoever sets the slot afterwards stays inside the chain, in the same place');
  // WebGPU: the effects host chains `after` (the renderer calls it after the scene pass has ended); the hooks stay inside the scene pass
  const h2 = new RenderHost(), R2 = h2.R = {}, t2 = []; h2._wireExt(); h2.addSceneHook({ scene: (p, r) => t2.push('hook') });
  const fx2 = Object.create(FxHost.prototype); FxHost.prototype._chainExt.call(fx2, R2, { after: enc => t2.push('weather+effects:' + enc) });
  R2.ext.scene('pass', R2); assert.deepEqual(t2, ['hook']); R2.ext.after('enc', R2); assert.deepEqual(t2, ['hook', 'weather+effects:enc']);
  // the renderers call the slot where the hook needs it (source order: webgpu.mjs and webgl2.mjs are the prototype's, imported unchanged)
  const gpu = fs.readFileSync(path.join(APP, '../render/prototype/src/webgpu.mjs'), 'utf8'), gl = fs.readFileSync(path.join(APP, '../render/prototype/src/webgl2.mjs'), 'utf8'), at = (src, x, from = 0) => { const i = src.indexOf(x, from); assert.ok(i >= 0, 'the renderer no longer contains: ' + x); return i; };
  const sc = at(gpu, 'this.ext.scene(p, this)'), end = at(gpu, 'p.end(); }', sc), after = at(gpu, 'this.ext.after(enc, this)', end), part = at(gpu, 'this.P.part', after);
  assert.ok(at(gpu, 'drawChars(\'\', p)') < sc && sc < end && end < after && after < part, 'WebGPU: figures, then the hooks inside the scene pass, then the pass ends, then `after` (weather and effects), then the prototype\'s own particles');
  const gsc = at(gl, 'this.ext.scene(gl, this)'), gpart = at(gl, "qpass('particles'", gsc), gend = at(gl, 'this.ext.shadow(gl, c, this)');
  assert.ok(at(gl, "drawChars('')") < gsc && gsc < gpart && gend < at(gl, "qpass('scene'"), 'WebGL2: figures, then the hooks and the effects host inside the scene pass, before the prototype\'s own particles; the shadow passes come before the scene pass');
});
