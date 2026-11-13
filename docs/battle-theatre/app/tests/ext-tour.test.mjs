// Node tests of the tour stops as camera bookmarks (src/ext/tour.mjs and the pure rules in src/ext/site-places.mjs). No browser: the real terrain is read from its files, the page is a
// small stand-in (tests/ext-site-places-lib.mjs). Checked: the data is fit (16 stops, in order); every stop has a camera position over the loaded ground that looks at it (the 14 on the
// ground are seen from the site's own viewpoint exactly as the shell's Views list flies there, the 2 beyond it from the edge, and say so); a stop is a place for the camera and nothing
// else: no object in the scene, no move of the clock; the pin is the only mark, labelled "modern tour stop"; Back leaves nothing. The page itself: tests/ext-site-places-browser.mjs.
//   node --test docs/battle-theatre/app/tests/ext-tour.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import * as P from '../src/ext/site-places.mjs';
import * as Tour from '../src/ext/tour.mjs';
import { Scope } from '../src/scope.mjs';
import { tierMark } from '../src/ui/extensions.mjs';
import { APP, readJSON, realTerrain, overrideData, installFakeDocument, standIn, camAt, frameOf, markupProblems, FakeEl } from './ext-site-places-lib.mjs';

const tour = readJSON('site-tour-stops.json'), T = await realTerrain();

// ---------------------------------------------------------------- the data
test('the tour file is fit: 16 stops numbered 1 to 16 in order, each with a name, a label, the site\'s day and a place; each with a viewpoint of the site\'s own', () => {
  assert.deepEqual(P.validateTour(tour), []); assert.equal(tour.tour.length, 16);
  tour.tour.forEach((s, i) => { assert.equal(s.id, i + 1); assert.equal(s.label, `Tour Stop ${i + 1}`); assert.ok(s.name && s.day && Number.isFinite(s.lat) && Number.isFinite(s.lng)); assert.ok(s.view && Number.isFinite(s.view.heading), `stop ${s.id} viewpoint`); });
  assert.equal(tour.tour[7].name, 'Little Round Top'); assert.equal(tour.tour[15].day, 'Nov 19, 1863'); assert.deepEqual(Object.keys(tour.tour[0]).sort(), ['dayClass', 'day', 'id', 'label', 'lat', 'lng', 'name', 'view'].sort());
  let d = JSON.parse(JSON.stringify(tour)); d.tour.pop(); assert.match(P.validateTour(d).join(' | '), /holds 15 stops, its source record says 16/);
  d = JSON.parse(JSON.stringify(tour)); d.tour[4].id = 9; assert.match(P.validateTour(d).join(' | '), /not numbered 1 to 16 in order/);
  d = JSON.parse(JSON.stringify(tour)); d.tour[2].lat = 'x'; assert.match(P.validateTour(d).join(' | '), /no position/);
  d = JSON.parse(JSON.stringify(tour)); d.tour[2].view.heading = null; assert.match(P.validateTour(d).join(' | '), /viewpoint is incomplete/);
  assert.match(P.validateTour(null).join(), /no stops/);
});
test('the file keeps a stop\'s name, label, day, place and viewpoint, and leaves the narration, the video, the street-level image and any key in the site', () => {
  const file = JSON.parse(fs.readFileSync(path.join(APP, 'data/site-tour-stops.json'), 'utf8')), raw = JSON.stringify(file.tour);       // the stops themselves (the file's own notes name what was left out)
  for (const k of ['narration', 'video', 'youtube', 'pano', 'embed', 'apikey', 'api_key', 'AIza', 'key=']) assert.ok(!raw.toLowerCase().includes(k.toLowerCase()), `the copy holds "${k}"`);
  for (const s of file.tour) assert.deepEqual(Object.keys(s).sort(), ['dayClass', 'day', 'id', 'label', 'lat', 'lng', 'name', 'view'].sort()); assert.deepEqual(Object.keys(file.tour[0].view).sort(), ['heading', 'lat', 'lng']);
  assert.deepEqual(tour.notKept.tour.sort(), ['the video link of a stop', 'the street-level image id of a stop', 'the walkthrough narration of a stop'].sort());
});

// ---------------------------------------------------------------- the bookmarks
test('every stop has a camera position over the loaded ground, above it, looking at the stop; 14 stops are on the ground (seen from the site\'s viewpoint), 2 beyond it (seen from the edge)', () => {
  const B = P.tourBookmarks(tour, T); assert.equal(B.length, 16); const hx = T.W / 2, hz = T.H / 2;
  assert.deepEqual(B.filter(b => !b.inside).map(b => b.id), [2, 3]); assert.deepEqual(B.filter(b => b.kind === 'viewpoint').map(b => b.id), [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]); assert.deepEqual(B.filter(b => b.kind === 'edge').map(b => b.id), [2, 3]);
  for (const b of B) {
    const p = b.pose; assert.ok([p.x, p.y, p.z, p.yaw, p.pitch, p.fov].every(Number.isFinite), `stop ${b.id}`); assert.ok(Math.abs(p.x) < hx && Math.abs(p.z) < hz, `stop ${b.id}: over the loaded ground`); assert.ok(p.y >= T.h(p.x, p.z) + 1.7, `stop ${b.id}: above the ground`);
    const dx = b.x - p.x, dz = b.z - p.z, dy = b.y - p.y, d = Math.hypot(dx, dy, dz), cp = Math.cos(p.pitch), f = (Math.sin(p.yaw) * cp * dx + Math.sin(p.pitch) * dy + Math.cos(p.yaw) * cp * dz) / d;
    if (b.kind === 'edge') { assert.ok(f > .9995, `stop ${b.id}: looks toward the stop (${f.toFixed(5)})`); assert.ok(b.beyondM > 100 && b.dir, `stop ${b.id}: says how far beyond which edge`); } else assert.ok(f > .7 || Math.hypot(dx, dz) <= 25, `stop ${b.id}: the stop is ahead (${f.toFixed(3)})`);
  }
  assert.equal(B[1].dir, 'north'); assert.equal(B[2].dir, 'north'); assert.ok(Math.abs(B[1].beyondM - 1120) < 5 && Math.abs(B[2].beyondM - 557) < 5, `${B[1].beyondM} and ${B[2].beyondM} m beyond the north edge`);
});
test('a stop on the ground is flown to exactly as the shell\'s own Views list flies there (flyToLngLat with the site\'s viewpoint, 30 m up), so the two never disagree', () => {
  const B = P.tourBookmarks(tour, T);
  for (const s of tour.tour) { const b = B[s.id - 1]; if (!b.inside) continue;
    // the arithmetic of theatre.flyToLngLat, line for line
    const [x, z] = T.xz(s.lng, s.lat), [vx, vz] = T.xz(s.view.lng, s.view.lat), g = T.h(vx, vz), y = g + 30, dx = x - vx, dz = z - vz, d = Math.hypot(dx, dz);
    const yaw = d > 25 ? Math.atan2(dx, dz) : (Math.PI - s.view.heading * Math.PI / 180), pitch = d > 25 ? Math.atan2(T.h(x, z) + 3 - y, d) : -.2;
    assert.deepEqual({ x: b.pose.x, y: b.pose.y, z: b.pose.z, yaw: b.pose.yaw, pitch: b.pose.pitch, fov: b.pose.fov }, { x: vx, y, z: vz, yaw, pitch, fov: 62 }, `stop ${s.id} ${s.name}`); }
  // where the viewpoint is the stop itself (Tour Stop 2 is one of them, but it lies beyond the ground) the camera looks along the site's heading
  const near = P.poseFromViewpoint(T, 100, 100, 100, 100, 90); assert.ok(Math.abs(near.yaw - Math.PI / 2) < 1e-9 && near.pitch === -.2);
});
test('gate hook checkTourBookmarks: ok on the real data and terrain; negative controls', () => {
  const r = P.checkTourBookmarks(tour, T); assert.deepEqual(r.problems, []); assert.equal(r.ok, true); assert.deepEqual(r.facts, { stops: 16, onLoadedGround: 14, beyondLoadedGround: 2, fromTheSitesViewpoint: 14 });
  let d = JSON.parse(JSON.stringify(tour)); d.tour.pop(); let q = P.checkTourBookmarks(d, T); assert.equal(q.ok, false); assert.match(q.problems.join(' | '), /holds 15 stops/);
  d = JSON.parse(JSON.stringify(tour)); d.tour[0].lat = 'north'; q = P.checkTourBookmarks(d, T); assert.equal(q.ok, false);
  d = JSON.parse(JSON.stringify(tour)); d.tour[5].lng = -76.5; d.tour[5].view = null; q = P.checkTourBookmarks(d, T); assert.equal(q.ok, true, 'a stop moved far beyond the ground is still reachable, from the edge'); assert.equal(q.facts.beyondLoadedGround, 3);
});
test('the words: a stop beyond the ground says how far beyond which edge; the pin says "modern tour stop"', () => {
  const B = P.tourBookmarks(tour, T);
  assert.equal(P.tourSay(B[7]), 'Flying to Tour Stop 8, Little Round Top.'); assert.match(P.tourSay(B[1]), /^Tour Stop 2, Eternal Light Peace Memorial, lies 1,1\d\d m beyond the north edge of the loaded ground\. The camera goes to the edge and looks toward it\.$/);
  assert.equal(P.tourPinText(B[7]), 'Tour Stop 8 · Little Round Top · modern tour stop'); assert.match(P.tourPinText(B[2]), /^Tour Stop 3 · Oak Ridge · modern tour stop · 5\d\d m beyond the loaded ground$/);
  const rows = P.tourRowsHTML(B, 8); assert.deepEqual(markupProblems(rows), []); assert.equal((rows.match(/data-stop=/g) || []).length, 16); assert.equal((rows.match(/aria-current="true"/g) || []).length, 1); assert.equal((rows.match(/view from the edge of the loaded ground/g) || []).length, 2); assert.doesNotMatch(rows, /disabled/);
  const h = P.tourPanelHTML(B, -1, tierMark); assert.deepEqual(markupProblems(h), []); for (const re of [/modern tour/i, /not an 1863 feature/, /16 stops/, /14 on the loaded ground/, /2 beyond it/, /never the clock/, /id="xt-list"/, /id="xt-clear" disabled/, /data-tier="inferred"/, /ws-world-EG-MON-02/]) assert.match(h, re);
  assert.doesNotMatch(P.tourPanelHTML(B, 8, tierMark), /id="xt-clear" disabled/);
});

// ---------------------------------------------------------------- the module in a stand-in page
async function visit(fn, o = {}) { const doc = installFakeDocument(), env = await standIn(o); overrideData(o.override); try { return await fn(env, doc); } finally { overrideData(null); doc.restore(); } }
test('module: at entry no pin shows and nothing is registered but the panel: no switch, no scene hook, no clock call', () => visit(async ({ th, ctx, log, stage }, doc) => {
  await Tour.init(ctx); assert.equal(log.toggles.length, 0, 'no layer switch: the stops are camera bookmarks'); assert.equal(log.panels.length, 1); assert.equal(log.panels[0].id, 'tour-stops'); assert.equal(log.panels[0].title, 'Tour stops');
  const pin = stage.querySelector('#xt-pin'); assert.ok(pin); assert.equal(pin.hidden, true); assert.equal(log.hooks, 0); assert.equal(log.timeCalls.length, 0); assert.equal(th.sitePlaces.tour.count, 16); assert.equal(th.sitePlaces.tour.active(), -1); assert.equal(th.sitePlaces.tour.integrity().ok, true);
  assert.equal(th.sitePlaces.tour.stops().length, 16); Tour.update(frameOf(th.cam)); assert.equal(pin.hidden, true, 'update does nothing while no stop is chosen'); Tour.dispose();
}));
test('module: choosing a stop sends the camera there and shows the pin once the stop is in view; the clock, play and speed are never touched', () => visit(async ({ th, ctx, log, stage }) => {
  await Tour.init(ctx); const tr = th.sitePlaces.tour, pin = stage.querySelector('#xt-pin'), B = P.tourBookmarks(tour, T);
  assert.equal(tr.flyTo(8), true); assert.equal(tr.active(), 8); assert.equal(log.flights.length, 1); assert.deepEqual(log.flights[0].pose, B[7].pose); assert.equal(log.said.at(-1), 'Flying to Tour Stop 8, Little Round Top.');
  assert.equal(pin.hidden, true, 'the pin waits for the camera'); Object.assign(th.cam, camAt(B[7].pose)); Tour.update(frameOf(th.cam)); assert.equal(tr.pinShown(), true); assert.equal(pin.hidden, false);
  assert.equal(pin.querySelector('#xt-pin-text').textContent, 'Tour Stop 8 · Little Round Top · modern tour stop'); assert.match(pin.style.cssText, /position:absolute/); assert.match(pin.style.cssText, /pointer-events:none/);
  const vp = new Float32Array(16), o = [0, 0, 0]; P.viewProj(th.cam, 1280 / 720, vp); assert.equal(P.project(vp, B[7].x, B[7].y, B[7].z, 1280, 720, o), true); const tm = /^translate\((-?\d+\.\d)px,(-?\d+\.\d)px\)$/.exec(pin.style.transform);
  assert.ok(tm, `the pin is moved to where the stop is seen: ${pin.style.transform}`); assert.ok(Math.abs(+tm[1] - o[0]) < .06 && Math.abs(+tm[2] - o[1]) < .06, `the pin stands on the stop's own place on the picture (${tm[1]}, ${tm[2]} against ${o[0].toFixed(2)}, ${o[1].toFixed(2)})`);
  th.cam.yaw += Math.PI; Tour.update(frameOf(th.cam)); assert.equal(tr.pinShown(), false, 'turned away from the stop the pin is gone'); assert.equal(pin.hidden, true);
  th.cam.yaw -= Math.PI; Tour.update(frameOf(th.cam)); assert.equal(pin.hidden, false);
  assert.equal(tr.flyTo(99), false); assert.equal(tr.active(), 8, 'a stop that is not in the list changes nothing'); assert.equal(log.flights.length, 1);
  assert.equal(log.timeCalls.length, 0); assert.equal(th.state.t, 12345, 'the clock stands where it stood'); assert.equal(th.state.playing, false); assert.equal(th.state.speed, 1);
  tr.clear(); assert.equal(tr.active(), -1); assert.equal(pin.hidden, true); Tour.update(frameOf(th.cam)); assert.equal(pin.hidden, true); Tour.dispose();
}));
test('module: the label of the pin goes to the other side of the place when it would run under the drawer; it comes back when the drawer closes; the pin is moved to the place at once', () => visit(async ({ th, ctx, stage, root }) => {
  await Tour.init(ctx); const tr = th.sitePlaces.tour, pin = stage.querySelector('#xt-pin'), lab = pin.querySelector('#xt-pin-lab'), B = P.tourBookmarks(tour, T); assert.ok(lab, 'the label is its own element');
  const drawer = new FakeEl('aside'); drawer.id = 'bt-drawer'; drawer.rect = { left: 868, top: 66, width: 400, height: 500 }; root.append(drawer); lab.rect = { left: 0, top: 0, width: 320, height: 24 };
  tr.flyTo(8); Object.assign(th.cam, camAt(B[7].pose)); th.state.panel = 'tour-stops'; th.bus.emit('panel-open', 'tour-stops'); Tour.update(frameOf(th.cam));
  assert.equal(tr.pinShown(), true); assert.equal(lab.style.left, 'auto', 'the place is at the middle of the picture, a label of 320 px to its right would run under the drawer: it goes to the left'); assert.equal(lab.style.right, '12px');
  th.state.panel = null; th.bus.emit('panel-close'); Tour.update(frameOf(th.cam)); assert.equal(lab.style.left, '12px', 'no drawer: the label is on the right again'); assert.equal(lab.style.right, 'auto');
  // a drawer that is a sheet over the foot of the picture (a phone) does not push the label sideways
  drawer.rect = { left: 0, top: 300, width: 1280, height: 400 }; th.state.panel = 'tour-stops'; th.bus.emit('panel-open', 'tour-stops'); Tour.update(frameOf(th.cam)); assert.equal(lab.style.left, '12px');
  // a label that fits on neither side stays on the right
  drawer.rect = { left: 868, top: 66, width: 400, height: 500 }; lab.rect = { left: 0, top: 0, width: 900, height: 24 }; th.bus.emit('panel-open', 'tour-stops'); Tour.update(frameOf(th.cam)); assert.equal(lab.style.left, '12px');
  assert.equal((th.bus.m.get('panel-open') || new Set()).size, 1, 'one subscription while running'); Tour.dispose(); for (const n of ['panel-open', 'panel-close', 'resize']) assert.equal((th.bus.m.get(n) || new Set()).size, 0, `no subscription to ${n} after dispose`);
}));
test('module: a stop beyond the ground is flown to from the edge, the pin and the words say how far beyond; the camera stays over the ground', () => visit(async ({ th, ctx, log, stage }) => {
  await Tour.init(ctx); const tr = th.sitePlaces.tour, pin = stage.querySelector('#xt-pin');
  for (const id of [2, 3]) { assert.equal(tr.flyTo(id), true); const f = log.flights.at(-1).pose; assert.ok(Math.abs(f.x) < T.W / 2 && Math.abs(f.z) < T.H / 2); assert.match(log.said.at(-1), /lies [\d,]+ m beyond the north edge of the loaded ground/); Object.assign(th.cam, camAt(f)); Tour.update(frameOf(th.cam)); assert.equal(pin.hidden, false, `stop ${id} is in view from the edge`); assert.match(pin.querySelector('#xt-pin-text').textContent, /modern tour stop · [\d,]+ m beyond the loaded ground$/); }
  Tour.dispose();
}));
test('module: the panel lists the 16 stops, flies to the one that is picked, marks it, and takes the pin away; the pin\'s own close button does the same', () => visit(async ({ th, ctx, log, stage }) => {
  await Tour.init(ctx); const tr = th.sitePlaces.tour, panel = log.panels[0], box = new FakeEl('div'), sc = new Scope('tour-panel'), pin = stage.querySelector('#xt-pin');
  try {
    panel.render(box, th, sc); assert.deepEqual(markupProblems(box.innerHTML), []); const rows = () => box.children.filter(c => c.tagName === 'BUTTON' && c.dataset.stop);       // the stand-in page reads the markup flat: the rows are children of the box
    assert.equal(rows().length, 16); assert.equal(box.querySelector('#xt-clear').disabled, true);
    rows().find(r => r.dataset.stop === '8').fire('click'); assert.equal(tr.active(), 8); assert.equal(log.flights.length, 1); assert.equal(log.said.at(-1), 'Flying to Tour Stop 8, Little Round Top.');
    sc.dispose(); const box2 = new FakeEl('div'), sc2 = new Scope('tour-panel-2'); panel.render(box2, th, sc2); assert.equal(box2.querySelector('#xt-clear').disabled, false, 'a panel opened while a stop is chosen can take the pin away');
    box2.querySelector('#xt-clear').fire('click'); assert.equal(tr.active(), -1); assert.equal(pin.hidden, true);
    tr.flyTo(12); pin.hidden = false; const x = pin.querySelector('#xt-pin-x'); assert.ok(x); x.fire('click'); assert.equal(tr.active(), -1, 'the pin\'s own close button'); sc2.dispose();
  } finally { sc.dispose(); Tour.dispose(); }
}));
test('module: Back leaves nothing and a second visit starts with no stop chosen; data that fails its checks is not offered; a visit that ended while the list was read starts nothing', () => visit(async ({ th, ctx, log, stage }, doc) => {
  await Tour.init(ctx); th.sitePlaces.tour.flyTo(8); const pin = doc.made.find(n => n.id === 'xt-pin'); assert.ok(pin);
  Tour.dispose(); assert.equal(pin.removed, true); assert.equal(stage.querySelector('#xt-pin'), null); assert.equal(th.sitePlaces, undefined); assert.equal(pin.live('click').length, 0, 'the pin\'s listener is gone'); assert.equal(Tour.update(frameOf(th.cam)), undefined); Tour.dispose();
  const second = await standIn(); await Tour.init(second.ctx); assert.equal(second.th.sitePlaces.tour.active(), -1); assert.equal(second.stage.children.filter(c => c.id === 'xt-pin').length, 1); Tour.dispose();
  const bad = JSON.parse(JSON.stringify(tour)); bad.tour[3].lat += 0.0001; overrideData({ 'site-tour-stops.json': JSON.stringify(bad) }); const third = await standIn(); await assert.rejects(Tour.init(third.ctx), /no longer match the hash recorded with them; they are not offered/); assert.equal(third.log.panels.length, 0);
  const unfit = JSON.parse(JSON.stringify(tour)); unfit.tour.pop(); overrideData({ 'site-tour-stops.json': JSON.stringify(unfit) }); const fourth = await standIn(); await assert.rejects(Tour.init(fourth.ctx), /not fit to use: .*holds 15 stops/); overrideData(null);
  const dead = await standIn(); dead.th.dead = true; await Tour.init(dead.ctx); assert.equal(dead.log.panels.length, 0); assert.equal(dead.th.sitePlaces, undefined); Tour.dispose();
}));
test('module: the file asks for nothing it must not: no scene hook, no clock, no document listener, no random numbers, no wall clock, nothing kept between visits', () => {
  const src = fs.readFileSync(path.join(APP, 'src/ext/tour.mjs'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /addSceneHook|\.R\.ext\s*=|setTime\(|setPlaying\(|setSpeed\(|jumpEvent\(/); assert.doesNotMatch(src, /document\.addEventListener|window\.addEventListener/); assert.doesNotMatch(src, /Math\.random|Date\.now|new Date\(/); assert.doesNotMatch(src, /\b(localStorage|sessionStorage|indexedDB)\b/);
});
