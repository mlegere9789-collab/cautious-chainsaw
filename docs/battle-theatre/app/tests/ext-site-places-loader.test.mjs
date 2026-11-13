// Node test: the two real modules of the site's places (src/ext/monuments.mjs, src/ext/tour.mjs) run through the REAL loader of the shell (src/ui/extensions.mjs), the way theatre.mjs
// runs them: the frozen ctx with its eleven keys, registerPanel and registerLayerToggle as the loader implements them, update(frame) with the loader's sealed frame, dispose on Back, and
// a second visit on the same module objects. The page is a small stand-in (tests/ext-site-places-lib.mjs); the page itself is tests/ext-site-places-browser.mjs.
//   node --test docs/battle-theatre/app/tests/ext-site-places-loader.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { Extensions, INDEX } from '../src/ui/extensions.mjs';
import * as P from '../src/ext/site-places.mjs';
import { APP, installFakeDocument, standIn, camAt, overrideData } from './ext-site-places-lib.mjs';

const mkLog = () => { const L = { errors: [], warns: [] }; return { L, error: (...a) => L.errors.push(a), warn: (...a) => L.warns.push(a), debug() {} }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// the theatre as the loader wants it, with what the two modules read besides
async function theatre() {
  const env = await standIn(), th = env.th; th.host = env.host; th.env = {}; th.layer = { units: [], meta: { stub: false } }; th.structs = null; th.said = env.log.said; th.heard = [];
  th.PANELS = { events: {}, views: {}, scenario: {}, info: {}, settings: {}, sound: {} }; th.state.scenario = { choices: {} };
  th.openPanel = id => { th.state.panel = th.state.panel === id ? null : id; th.bus.emit('panel-open', id); }; th.closePanel = () => { th.state.panel = null; };
  for (const n of ['ext', 'ext-toggle', 'ext-panel', 'layer']) th.bus.on(n, (a, b) => th.heard.push([n, a, b]));
  return env;
}
const loaderOver = (th, log) => new Extensions(th, { log, waitMs: 5000, exists: async () => true,
  importer: p => (p === INDEX ? { default: ['monuments.mjs', 'tour.mjs'] } : import(pathToFileURL(path.join(APP, 'src/ext', p)).href)) });

test('both modules start under the real loader, in order, with their panels and the one layer switch; the layer is OFF; nothing is drawn; no scene hook; clean log', async () => {
  const doc = installFakeDocument(); try {
    const env = await theatre(), { th } = env, { L, ...log } = mkLog(), X = loaderOver(th, log); await X.load();
    assert.deepEqual(L.errors, []); assert.deepEqual(L.warns, []); assert.equal(X.index.state, 'read'); assert.deepEqual(X.status().map(s => `${s.path}:${s.state}`), ['monuments.mjs:running', 'tour.mjs:running']); assert.deepEqual(X.problems(), []);
    const st = X.status(); assert.deepEqual(st[0].panels, ['later-memorials']); assert.deepEqual(st[0].toggles, ['later-memorials']); assert.deepEqual(st[1].panels, ['tour-stops']); assert.deepEqual(st[1].toggles, []);
    assert.equal(X.toggleState('later-memorials'), false, 'off at entry'); assert.equal(X.toggles.get('later-memorials').title, P.LAYER.title); assert.equal(X.panels.get('later-memorials').title, 'Later memorials'); assert.equal(X.panels.get('tour-stops').title, 'Tour stops');
    assert.equal(env.log.hooks, 0); assert.equal(doc.made.filter(n => n.tagName === 'CANVAS').length, 0); assert.equal(th.sitePlaces.memorials.isOn(), false); assert.equal(th.sitePlaces.tour.count, 16);
    X.update(12345, 16, th.cam, true, 1); X.update(12346, 16, th.cam, true, 1); assert.equal(doc.made.filter(n => n.tagName === 'CANVAS').length, 0, 'update with the layer off makes nothing');
    X.dispose();
  } finally { doc.restore(); }
});
test('the viewer\'s switch: setFn(true) through the loader draws the marks, the screen reader line names the layer and says shown, the state is read back; off removes the canvas', async () => {
  const doc = installFakeDocument(); try {
    const env = await theatre(), { th } = env, { L, ...log } = mkLog(), X = loaderOver(th, log); await X.load();
    assert.equal(await X.setToggle('later-memorials', true), true); assert.equal(th.said.at(-1), 'Later memorials (post-battle; not part of the 1863 scene) shown.'); assert.deepEqual(th.heard.filter(h => h[0] === 'layer').at(-1), ['layer', 'later-memorials', true]);
    Object.assign(th.cam, camAt(P.poseAround(th.T, ...th.T.xz(-77.2352, 39.8081), { dist: 240, height: 95 }))); X.update(12345, 16, th.cam, true, 1); const cv = doc.made.find(n => n.id === 'xm-marks'); assert.ok(cv, 'canvas'); assert.ok(th.sitePlaces.memorials.drawn() > 5);
    assert.ok(X.status()[0].updates >= 1, 'the loader called update on the module');
    assert.equal(await X.setToggle('later-memorials', false), false); assert.equal(th.said.at(-1), 'Later memorials (post-battle; not part of the 1863 scene) hidden.'); assert.equal(cv.removed, true);
    assert.deepEqual(L.errors, []); X.dispose();
  } finally { doc.restore(); }
});
test('a panel opened through the loader\'s own handle is drawn into a body with the stand-in scope; the tour panel flies; both leave nothing when the panel closes', async () => {
  const doc = installFakeDocument(); try {
    const env = await theatre(), { th } = env, { L, ...log } = mkLog(), X = loaderOver(th, log); await X.load();
    for (const id of ['later-memorials', 'tour-stops']) { const p = X.panels.get(id); assert.equal(typeof p.render, 'function'); assert.equal(p.handle.isOpen(), false); p.handle.open(); assert.equal(th.state.panel, id); assert.equal(p.handle.isOpen(), true); p.handle.close(); assert.equal(th.state.panel, null); }
    assert.deepEqual(L.errors, []); X.dispose();
  } finally { doc.restore(); }
});
test('Back through the loader: dispose once, in reverse order, nothing left in the page; a second visit on the same module objects starts again with the layer off', async () => {
  const doc = installFakeDocument(); try {
    const env = await theatre(), { th, stage, left } = env, { L, ...log } = mkLog(), X = loaderOver(th, log); await X.load();
    await X.setToggle('later-memorials', true); th.sitePlaces.memorials.select(46); X.update(12345, 16, th.cam, true, 1); th.sitePlaces.tour.flyTo(8);
    X.dispose(); assert.equal(th.sitePlaces, undefined); assert.equal(stage.querySelector('#xt-pin'), null); assert.equal(stage.querySelector('#xm-marks'), null); assert.equal(left.querySelector('#xm-chip'), null); assert.equal(left.querySelector('#xm-card'), null);
    for (const n of doc.made) assert.equal(n.removed || n.parentNode === null, true, `${n.tagName}#${n.id}`); assert.deepEqual(L.errors, []);
    const env2 = await theatre(), log2 = mkLog(), X2 = loaderOver(env2.th, log2); await X2.load(); assert.deepEqual(X2.status().map(s => s.state), ['running', 'running']); assert.equal(X2.toggleState('later-memorials'), false); assert.equal(env2.th.sitePlaces.memorials.selected(), -1); assert.equal(env2.th.sitePlaces.tour.active(), -1); assert.deepEqual(log2.L.errors, []); X2.dispose();
  } finally { doc.restore(); }
});
test('a module whose data fails its check is skipped by the loader with the reason, and the other still runs', async () => {
  const doc = installFakeDocument(); try {
    const env = await theatre(), { th } = env, bad = JSON.parse(JSON.stringify((await import('./ext-site-places-lib.mjs')).readJSON('site-memorials.json'))); bad.monuments[5].lng += 0.0002; overrideData({ 'site-memorials.json': JSON.stringify(bad) });
    const { L, ...log } = mkLog(), X = loaderOver(th, log); await X.load();
    assert.deepEqual(X.status().map(s => `${s.path}:${s.state}`), ['monuments.mjs:failed', 'tour.mjs:running']); assert.match(X.status()[0].error, /no longer matches the hash recorded with it \(monuments\); it is not shown/); assert.equal(X.status()[0].stage, 'init');
    assert.equal(L.errors.length, 1); assert.match(String(L.errors[0][0]), /ext monuments\.mjs: init failed; it is skipped/); assert.equal(X.toggles.size, 0, 'no switch is offered for a layer that is not shown'); assert.equal(X.problems().length, 1); X.dispose();
  } finally { overrideData(null); doc.restore(); }
});
