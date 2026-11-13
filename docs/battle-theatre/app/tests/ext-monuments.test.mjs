// Node tests of the later-memorial layer (src/ext/monuments.mjs and the pure rules in src/ext/site-places.mjs). No browser: the real terrain is read from its files, the page is a small
// stand-in (tests/ext-site-places-lib.mjs). Checked: the data is fit; the layer is off at every entry and never an object of the 1863 scene (gate Q03); every mark and card says "later
// memorial" and carries its tier and the open gap of the year (gate Q23); all 512 are found, marked and flown to, those beyond the loaded ground from its edge; the projection is the
// renderer's own; the module's life (off at entry, on, picked, off, Back, a second visit) leaves nothing behind. The page itself: tests/ext-site-places-browser.mjs.
//   node --test docs/battle-theatre/app/tests/ext-monuments.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import * as P from '../src/ext/site-places.mjs';
import * as M from '../src/ext/monuments.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { tierMark } from '../src/ui/extensions.mjs';
import { Scope } from '../src/scope.mjs';
import { APP, REPO, readJSON, realTerrain, overrideData, installFakeDocument, standIn, camAt, frameOf, markupProblems, recordingContext, FakeEl } from './ext-site-places-lib.mjs';

const mem = readJSON('site-memorials.json'), years = readJSON('site-memorial-years.json'), T = await realTerrain();
const byNo = no => mem.monuments.find(m => m.no === no);

// ---------------------------------------------------------------- the data and the layer's declaration
test('the memorial file is fit: 512 numbered memorials, every one a memorial by its name, nine state memorials matched to the Monuments list', () => {
  assert.deepEqual(P.validateMemorials(mem), []);
  assert.equal(mem.monuments.length, 512); assert.equal(mem.stars.length, 9); assert.equal(new Set(mem.monuments.map(m => m.no)).size, 512);
  assert.equal(Math.min(...mem.monuments.map(m => m.no)), 1); assert.equal(Math.max(...mem.monuments.map(m => m.no)), 512);
  for (const m of mem.monuments) { assert.ok(P.memorialKind(m.name), `${m.no} ${m.name}`); assert.ok(P.SIDES.includes(m.side)); }
  for (const [id, no] of Object.entries(P.STAR_MATCH)) assert.ok(mem.stars.some(s => s.id === id) && byNo(no), `${id} -> ${no}`);
  assert.equal(P.memorialKind('Alabama State Monument'), 'monument'); assert.equal(P.memorialKind('Eternal Light Peace Memorial'), 'memorial'); assert.equal(P.memorialKind('Boundary Stone'), null);
});
test('the layer is declared off at entry, never part of the scene, tier inferred, the year an open gap with a register entry', () => {
  assert.equal(P.LAYER.defaultOn, false); assert.equal(P.LAYER.inScene, false); assert.equal(P.LAYER.tier, 'inferred'); assert.equal(P.LAYER.yearTier, 'open gap');
  assert.match(P.LAYER.title, /post-battle/); assert.match(P.LAYER.title, /not part of the 1863 scene/); assert.match(P.LAYER.gap, /^ws-world-EG-MON-01$/); assert.match(P.LAYER.groundGap, /^ws-world-EG-MON-02$/);
  assert.ok(Object.isFrozen(P.LAYER) && Object.isFrozen(P.COPY) && Object.isFrozen(P.TOUR));
  assert.deepEqual(P.sceneObjectsAt(), []); for (let t = 0; t <= 246240; t += 997) assert.deepEqual(P.sceneObjectsAt(t), [], `minute ${t}`);
});
test('data that is not fit is refused with the reason: a count that disagrees, a name that is no memorial, a place that is not Gettysburg, an unmatched state memorial', () => {
  const clone = () => JSON.parse(JSON.stringify(mem));
  let d = clone(); d.monuments.pop(); assert.match(P.validateMemorials(d).join(' | '), /holds 511 memorials, its source record says 512/);
  d = clone(); d.monuments[3].name = 'Boundary Stone'; assert.match(P.validateMemorials(d).join(' | '), /does not name a monument, memorial, marker, tablet or statue/);
  d = clone(); d.monuments[3].lat = 12; assert.match(P.validateMemorials(d).join(' | '), /is not near Gettysburg/);
  d = clone(); d.monuments[3].side = 'Both'; assert.match(P.validateMemorials(d).join(' | '), /side "Both"/);
  d = clone(); d.monuments[4].no = d.monuments[3].no; assert.match(P.validateMemorials(d).join(' | '), /number used twice/);
  d = clone(); d.stars[0].lat += 0.01; assert.match(P.validateMemorials(d).join(' | '), /a match must be within 40 m/);
  d = clone(); d.stars.pop(); assert.match(P.validateMemorials(d).join(' | '), /holds 8 memorials, 9 are matched/);
  assert.match(P.validateMemorials({}).join(), /no monuments/); assert.match(P.validateMemorials(null).join(), /no monuments/);
});

// ---------------------------------------------------------------- the gate hook (docs/GATE-HOOKS.md)
test('gate hook checkLaterMemorials: ok on the real data and terrain, with the facts a gate report prints', () => {
  const r = P.checkLaterMemorials(mem, T); assert.deepEqual(r.problems, []); assert.equal(r.ok, true);
  assert.deepEqual(r.facts, { memorials: 512, defaultOn: false, sceneObjects: 0, marksWhenOff: 0, marksWhenOn: 512, tier: 'inferred', withoutLabel: 0, yearClaimed: 0, yearDocumented: 0, yearInferred: 0, yearOpenGap: 512, onLoadedGround: 435, beyondLoadedGround: 77, positionsWithNoStatedSource: 503, twoPositions: 9 }, 'without the years file no memorial has a year');
  const withYears = P.checkLaterMemorials(mem, T, years); assert.deepEqual(withYears.problems, []); assert.equal(withYears.ok, true); assert.equal(withYears.facts.yearDocumented, 32); assert.equal(withYears.facts.yearInferred, 1); assert.equal(withYears.facts.yearOpenGap, 479); assert.equal(withYears.facts.yearClaimed, 0, 'the list itself claims no year');
  const flat = P.checkLaterMemorials(mem); assert.equal(flat.ok, true); assert.equal(flat.facts.onLoadedGround, null, 'without a terrain the places are not claimed');
});
test('gate hook checkLaterMemorials: negative controls (a missing memorial, a name that is no memorial, a year claimed without a source)', () => {
  const clone = () => JSON.parse(JSON.stringify(mem));
  let d = clone(); d.monuments.pop(); let r = P.checkLaterMemorials(d, T); assert.equal(r.ok, false); assert.match(r.problems.join(' | '), /511 memorials/);
  d = clone(); d.monuments[0].name = 'Boundary Stone'; r = P.checkLaterMemorials(d, T); assert.equal(r.ok, false); assert.match(r.problems.join(' | '), /does not name a monument/);
  d = clone(); d.monuments[0].year = 1889; r = P.checkLaterMemorials(d, T); assert.equal(r.ok, false); assert.match(r.problems.join(' | '), /claim a year/);
  d = clone(); d.monuments[0].erected = '1889'; r = P.checkLaterMemorials(d, T); assert.equal(r.ok, false);
});

// ---------------------------------------------------------------- the index: where every memorial stands against the loaded ground
test('435 memorials stand on the loaded ground and 77 beyond it; the sides and the sources add up', () => {
  const idx = P.buildIndex(mem, T), c = idx.counts; assert.equal(idx.n, 512);
  assert.equal(c.inside, 435); assert.equal(c.beyond, 77); assert.equal(c.inside + c.beyond, 512); assert.deepEqual(c.side, { Union: 457, Confederate: 40, Other: 15 });
  assert.equal(c.withSource, 9); assert.equal(c.withoutSource, 503); assert.equal(c.twoPositions, 9); assert.equal(c.groups.reduce((a, g) => a + g.n, 0), 512);
  for (const it of idx.items) { assert.equal(it.inside, Math.abs(it.x) < T.W / 2 && Math.abs(it.z) < T.H / 2, `${it.no} inside`); if (it.inside) { assert.equal(it.beyondM, 0); assert.equal(it.dir, null); } else { assert.ok(it.beyondM > 0 && it.dir, `${it.no} beyond`); } assert.ok(Number.isFinite(it.y) && it.y > -50 && it.y < 400, `${it.no} height ${it.y}`); }
  // the shell's own list disables exactly these: its rule is geo.inside(x, z, 0), the rule used here
  const shellOut = mem.monuments.filter(m => { const [x, z] = T.xz(m.lng, m.lat); return !(Math.abs(x) < T.W / 2 - 0 && Math.abs(z) < T.H / 2 - 0); }).length; assert.equal(shellOut, 77, 'the 77 are the monuments the shell\'s Views list shows as "outside the loaded ground"');
});
test('the nine state memorials hold two positions; the choice moves exactly those nine, by the distance the two lists differ; nothing else moves', () => {
  const a = P.buildIndex(mem, T, { positions: 'list' }), b = P.buildIndex(mem, T, { positions: 'state-list' }); let moved = 0;
  for (let i = 0; i < a.n; i++) { const d = Math.hypot(a.items[i].x - b.items[i].x, a.items[i].z - b.items[i].z); if (a.items[i].second) { moved++; assert.ok(Math.abs(d - a.items[i].second.apartM) < 1.5, `${a.items[i].name}: ${d.toFixed(1)} vs ${a.items[i].second.apartM.toFixed(1)}`); assert.equal(b.items[i].second.used, true); assert.equal(a.items[i].second.used, false); } else assert.equal(d, 0, a.items[i].name); }
  assert.equal(moved, 9); assert.equal(P.POSITION_CHOICES.length, 2); assert.equal(P.POSITION_CHOICES[0].key, 'list');
  const far = Math.max(...a.items.filter(i => i.second).map(i => i.second.apartM)); assert.ok(far > 20 && far < 40, `the two lists differ by up to ${far.toFixed(0)} m`);
});
test('the list: text, side, group and ground filters; the order is the site\'s', () => {
  const idx = P.buildIndex(mem, T), f = o => P.filterMemorials(idx, o);
  assert.equal(f({}).length, 512); assert.deepEqual(f({}).map(i => i.no), mem.monuments.map(m => m.no));
  assert.ok(f({ q: 'pennsylvania state' }).some(i => i.no === 46)); assert.equal(f({ q: '  PENNSYLVANIA State ' }).length, f({ q: 'pennsylvania state' }).length);
  assert.equal(f({ side: 'Confederate' }).length, 40); assert.equal(f({ side: 'Other' }).length, 15); assert.equal(f({ side: 'all' }).length, 512);
  assert.equal(f({ where: 'beyond' }).length, 77); assert.equal(f({ where: 'on' }).length, 435); assert.equal(f({ where: 'everywhere' }).length, 512);
  const g = idx.counts.groups[0].name; assert.equal(f({ group: g }).length, idx.counts.groups[0].n); assert.equal(f({ q: 'zzzz-no-such-memorial' }).length, 0);
  assert.ok(f({ side: 'Confederate', where: 'beyond' }).every(i => i.side === 'Confederate' && !i.inside));
  assert.ok(f({ q: byNo(46).loc.slice(0, 12) }).some(i => i.no === 46), 'the text search reaches the place line');
});

// ---------------------------------------------------------------- what is marked, and how
test('with the layer off nothing is marked; on, all 512; with one picked while off, just that one; every mark says later memorial and carries the tier', () => {
  const idx = P.buildIndex(mem, T);
  assert.equal(P.marksFor(idx, { on: false, selected: -1 }).length, 0); assert.equal(P.marksFor(idx, null).length, 0); assert.equal(P.marksFor(idx, {}).length, 0);
  const all = P.marksFor(idx, { on: true, selected: -1 }); assert.equal(all.length, 512);
  for (const m of all) { assert.match(m.label, /later memorial/); assert.equal(m.tier, 'inferred'); assert.equal(m.postBattle, true); assert.equal(m.scene, false); }
  assert.equal(all.filter(m => !m.onGround).length, 77); assert.ok(all.filter(m => !m.onGround).every(m => /beyond the loaded ground/.test(m.label)));
  const one = P.marksFor(idx, { on: false, selected: 46 }); assert.equal(one.length, 1); assert.equal(one[0].no, 46);
  assert.equal(P.marksFor(idx, { on: 'yes', selected: -1 }).length, 0, 'only true switches the layer on');
});

// ---------------------------------------------------------------- the camera: poses for every memorial, and the renderer's own projection
test('every memorial has a camera position over the loaded ground, above the ground, looking at it (from the edge, toward it, when it is beyond the ground)', () => {
  const idx = P.buildIndex(mem, T); const hx = T.W / 2, hz = T.H / 2;
  for (const it of idx.items) {
    const p = P.memorialPose(T, it); assert.ok([p.x, p.y, p.z, p.yaw, p.pitch, p.fov].every(Number.isFinite), `${it.no} finite`);
    assert.ok(Math.abs(p.x) < hx && Math.abs(p.z) < hz, `${it.no} ${it.name}: the camera stands over the loaded ground`); assert.ok(p.y >= T.h(p.x, p.z) + 1.7, `${it.no}: above the ground`);
    const dx = it.x - p.x, dz = it.z - p.z, dy = it.y - p.y, d = Math.hypot(dx, dy, dz), cp = Math.cos(p.pitch), f = (Math.sin(p.yaw) * cp * dx + Math.sin(p.pitch) * dy + Math.cos(p.yaw) * cp * dz) / d;
    assert.ok(f > (it.inside ? .98 : .9995), `${it.no} ${it.name}: the memorial is straight ahead (cos ${f.toFixed(5)})`);
    if (it.inside) assert.ok(d > 40 && d < 400, `${it.no}: ${d.toFixed(0)} m away`); else assert.ok(d > 200, `${it.no} ${it.name}: a memorial beyond the ground is seen from afar (${d.toFixed(0)} m)`);
  }
});
test('the words that say a memorial is beyond the ground name the distance and the edge; one on the ground does not', () => {
  const idx = P.buildIndex(mem, T), far = idx.byNo.get(367), near = idx.byNo.get(46);
  assert.match(P.memorialSay(far), /3rd Pennsylvania Cavalry Monument is a later memorial 3,2\d\d m beyond the east edge of the loaded ground/); assert.match(P.groundLine(far), /not loaded, so the mark stands at the height of the nearest loaded ground/);
  assert.equal(P.memorialSay(near), 'Flying to Pennsylvania State Memorial, a later memorial.'); assert.equal(P.groundLine(near), 'On the loaded ground');
});
test('the projection is the renderer\'s own: the same matrix as the camera of the prototype, the same pixel as the shell\'s overlay, for any pose and any aspect', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let k = 0; k < 40; k++) {
    const c = new Camera(); c.set((rnd() - .5) * 5000, 20 + rnd() * 600, (rnd() - .5) * 5000, (rnd() - .5) * 6.28, -1.2 + rnd() * 1.3, 40 + rnd() * 40); const aspect = .5 + rnd() * 2, vp = new Float32Array(16);
    P.viewProj(c, aspect, vp); c.update(aspect); for (let i = 0; i < 16; i++) assert.ok(Math.abs(vp[i] - c.vp[i]) <= 1e-6 * Math.max(1, Math.abs(c.vp[i])), `matrix ${i}`);
    const w = 800 + Math.round(rnd() * 800), h = 500 + Math.round(rnd() * 400), out = [0, 0, 0], X = c.x + (rnd() - .5) * 800, Y = c.y - rnd() * 100, Z = c.z + (rnd() - .5) * 800;
    const m = c.vp, cx = m[0] * X + m[4] * Y + m[8] * Z + m[12], cy = m[1] * X + m[5] * Y + m[9] * Z + m[13], cw = m[3] * X + m[7] * Y + m[11] * Z + m[15], seen = cw > 0.05;       // the shell's overlay.project, line for line
    assert.equal(P.project(vp, X, Y, Z, w, h, out), seen); if (seen) { assert.ok(Math.abs(out[0] - (cx / cw * .5 + .5) * w) < 1e-2); assert.ok(Math.abs(out[1] - (1 - (cy / cw * .5 + .5)) * h) < 1e-2); assert.ok(Math.abs(out[2] - cw) < 1e-3); }
  }
  // a point straight ahead is at the middle of the picture, a point behind the camera is not drawn
  const c = new Camera(); c.set(0, 100, 0, 0, 0, 60); const vp = new Float32Array(16), out = [0, 0, 0]; P.viewProj(c, 16 / 9, vp);
  assert.equal(P.project(vp, 0, 100, 500, 1600, 900, out), true); assert.ok(Math.abs(out[0] - 800) < 1 && Math.abs(out[1] - 450) < 1); assert.equal(P.project(vp, 0, 100, -500, 1600, 900, out), false);
});
test('the layout of the marks: the nearest are named, the names do not sit on one another, a tap finds the mark it is on and nothing else', () => {
  const idx = P.buildIndex(mem, T), it = idx.byNo.get(46), pose = P.poseAround(T, it.x, it.z, { dist: 240, height: 95 }), cam = camAt(pose), vp = new Float32Array(16), L = P.newLayout(idx.n), w = 1280, h = 720;
  P.viewProj(cam, w / h, vp); P.layoutMarks(idx, vp, cam, w, h, { on: true, selected: -1 }, L);
  assert.ok(L.n > 5, `${L.n} marks in view of the ridge`); assert.ok(L.nLabels >= 1 && L.nLabels <= P.LABEL.max, `${L.nLabels} names`);
  for (let i = 0; i < L.nLabels; i++) for (let j = i + 1; j < L.nLabels; j++) { const a = L.lab[i], b = L.lab[j], ax = L.sx[a] + 9, bx = L.sx[b] + 9, ay = L.sy[a] - 16, by = L.sy[b] - 16, aw = idx.items[L.idx[a]].lblW, bw = idx.items[L.idx[b]].lblW; assert.ok(!(ax < bx + bw && bx < ax + aw && Math.abs(ay - by) < P.LABEL.h + 2), `names ${i} and ${j} overlap`); }
  for (let i = 0; i < L.nLabels; i++) { const k = L.lab[i], q = idx.items[L.idx[k]]; assert.ok(Math.hypot(q.x - cam.x, q.y - cam.y, q.z - cam.z) < P.LABEL.range + 1, 'a name belongs to a memorial within reach'); assert.match(q.lbl, /later memorial$/); }
  for (let k = 0; k < Math.min(L.n, 40); k++) { const no = idx.items[L.idx[k]].no; const got = P.pickMark(idx, L, L.sx[k], L.sy[k] - L.r[k] * .3, 14); const near = []; for (let j = 0; j < L.n; j++) if (Math.hypot(L.sx[j] - L.sx[k], L.sy[j] - L.sy[k]) < 14) near.push(idx.items[L.idx[j]].no); assert.ok(got === no || near.includes(got), `the tap on mark ${no} found ${got}`); }
  assert.equal(P.pickMark(idx, L, -500, -500), -1);
  // the same camera gives the same layout; off gives nothing; a selected memorial is named first even when it is far
  const L2 = P.newLayout(idx.n); P.layoutMarks(idx, vp, cam, w, h, { on: true, selected: -1 }, L2); assert.equal(L2.n, L.n); assert.deepEqual([...L2.lab.slice(0, L2.nLabels)], [...L.lab.slice(0, L.nLabels)]);
  P.layoutMarks(idx, vp, cam, w, h, { on: false, selected: -1 }, L2); assert.equal(L2.n, 0); assert.equal(L2.nLabels, 0);
  P.layoutMarks(idx, vp, cam, w, h, { on: false, selected: 46 }, L2); assert.equal(L2.n <= 1, true);
});
test('drawing: the tier shows as the outline pattern and the shape beside every name; a few canvas calls however many marks; hollow when beyond the ground', () => {
  const idx = P.buildIndex(mem, T), it = idx.byNo.get(46), cam = camAt(P.poseAround(T, it.x, it.z, { dist: 240, height: 95 })), vp = new Float32Array(16), L = P.newLayout(idx.n), w = 1280, h = 720, st = tierMark.style('inferred');
  P.viewProj(cam, w / h, vp); P.layoutMarks(idx, vp, cam, w, h, { on: true, selected: -1 }, L); const c = recordingContext(); const n = P.drawMarks(c, idx, L, { on: true, selected: -1 }, st);
  assert.equal(n, L.n); assert.ok(c.calls.filter(x => x === 'fill').length <= 4 + L.nLabels, 'one fill per group of marks, one per name'); assert.ok(c.calls.filter(x => x === 'stroke').length <= 1 + 2 * L.nLabels);
  assert.deepEqual(c.dashes.find(d => d.length), [3, 2], 'the outline of the marks is dashed for an inferred tier'); assert.equal(c.texts.length, L.nLabels); assert.ok(c.texts.every(t => /later memorial$/.test(t)));
  assert.ok(P.SIDE_COLOR.Union && P.SIDE_COLOR.Confederate && P.SIDE_COLOR.Other);
});

// ---------------------------------------------------------------- the words: card, notice, panel
test('the card of every memorial: well-formed, says later memorial and post-battle, the tier, the open gap of the year, where the position comes from', () => {
  const idx = P.buildIndex(mem, T);
  for (const it of idx.items) {
    const h = P.memorialCardHTML(it, tierMark); assert.deepEqual(markupProblems(h), [], `${it.no} ${it.name}`);
    assert.match(h, /<b>Later memorial\.<\/b>/); assert.match(h, /not part of the 1863 scene/); assert.match(h, /data-tier="inferred"/); assert.match(h, /data-xm="post-battle"/); assert.match(h, /data-tier="open gap"/); assert.match(h, /The year is not in the site(?:'|&#39;)s data/);
    assert.match(h, /ws-world-EG-MON-01/); assert.match(h, /Park number/); assert.match(h, /data-act="close"/); assert.match(h, /data-act="fly"/);
    if (it.inside) assert.doesNotMatch(h, /ws-world-EG-MON-02/); else { assert.match(h, /ws-world-EG-MON-02/); assert.match(h, /beyond the (north|south|east|west)/); }
    if (it.second) assert.match(h, /Second position/);
  }
  const pa = idx.byNo.get(46), h = P.memorialCardHTML(pa, tierMark); assert.match(h, /Pennsylvania State Memorial/); assert.match(h, /Wikipedia: Pennsylvania State Memorial, Gettysburg/);
  const withSrc = idx.items.find(i => i.src); assert.match(P.memorialCardHTML(withSrc, tierMark), new RegExp('its note on the position: ' + P.esc(withSrc.src).slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const sl = P.buildIndex(mem, T, { positions: 'state-list' }).byNo.get(46); assert.match(P.memorialCardHTML(sl, tierMark), /from the site(?:'|&#39;)s second list/);
});
test('everything from the list is escaped: markup in a name, a place line or a source note never reaches the page as markup', () => {
  const d = JSON.parse(JSON.stringify(mem)), m = d.monuments[0]; m.name = 'Alabama <script>alert(1)</script> "State" & \'Monument\''; m.honors = '<img src=x onerror=alert(1)>'; m.loc = '"><b>x</b>'; m.src = '<i>note</i>'; m.mn = '<u>MN</u>'; m.group = '<s>g</s>';
  const idx = P.buildIndex(d, T), it = idx.items[0], h = P.memorialCardHTML(it, tierMark) + P.memorialRowsHTML([it], 0, 1, -1) + P.memorialPanelHTML(idx, { on: false, positions: 'list', integrity: { checked: true }, list: { q: '"><x', side: 'all', group: 'all', where: 'all' } }, tierMark);
  assert.doesNotMatch(h, /<script/i); assert.doesNotMatch(h, /<img src=x/i); assert.doesNotMatch(h, /<b>x<\/b>/); assert.doesNotMatch(h, /<i>note<\/i>/); assert.doesNotMatch(h, /<u>MN<\/u>/); assert.doesNotMatch(h, /<s>g<\/s>/); assert.doesNotMatch(h, /value=""><x/);
  assert.match(h, /&lt;script&gt;/); assert.equal(P.esc(null), ''); assert.equal(P.esc(undefined), ''); assert.equal(P.esc('a&b'), 'a&amp;b');
});
test('the panel and the notice: the words, well-formed, with the layer\'s state and the choice of the nine positions', () => {
  const idx = P.buildIndex(mem, T), o = { on: false, positions: 'list', integrity: { checked: true, ok: true }, list: { q: '', side: 'all', group: 'all', where: 'all' } };
  const h = P.memorialPanelHTML(idx, o, tierMark); assert.deepEqual(markupProblems(h), []);
  for (const re of [/off until you switch them on/, /never objects on the ground/, /512 memorials/, /435 on the loaded ground/, /77 beyond it/, /ws-world-EG-MON-01/, /ws-world-EG-MON-02/, /Post-battle/, /data-tier="inferred"/, /data-tier="open gap"/, /Bachelder/, /id="xm-pos"/, /Search 512 later memorials/, /id="xm-list"/, /id="xm-count"/, /id="xm-key"/, /hollow: beyond the loaded ground/, /The dashed outline is the tier, inferred/]) assert.match(h, re);
  assert.doesNotMatch(h, /id="xm-on" checked/); assert.match(P.memorialPanelHTML(idx, { ...o, on: true }, tierMark), /id="xm-on" checked/);
  assert.match(P.memorialPanelHTML(idx, { ...o, positions: 'state-list' }, tierMark), /<option value="state-list" selected>/); assert.doesNotMatch(h, /no way to check the list against the hash/); assert.match(P.memorialPanelHTML(idx, { ...o, integrity: { checked: false } }, tierMark), /no way to check the list against the hash/);
  assert.match(P.memorialPanelHTML(idx, { ...o, list: { ...o.list, side: 'Union' } }, tierMark), /data-side="Union" aria-pressed="true"/);
  const n = P.noticeHTML(idx.counts, tierMark); assert.deepEqual(markupProblems(n), []); assert.match(n, /Later memorials shown/); assert.match(n, /Put up after the battle: not part of the 1863 scene/); assert.match(n, /512 marks, 77 of them beyond the loaded ground/); assert.match(n, /data-act="hide"/); assert.match(n, /data-act="about"/); assert.match(n, /data-tier="inferred"/);
  assert.match(P.COPY.layer, /none is part of the 1863 scene/); assert.match(P.COPY.what, /put up after the battle/);
});
test('what the "later" label rests on is in the library text of Bachelder\'s guide of 1889, word for word, on the printed pages named', { skip: !fs.existsSync(path.join(REPO, 'tmp/library/ws9')) && 'NOT RUN: tmp/library/ws9 is not in this checkout (the library is local scratch)' }, () => {
  const f = fs.readdirSync(path.join(REPO, 'tmp/library/ws9')).find(x => x.startsWith(P.BASIS.library + '__')); assert.ok(f, 'the text of the guide is in the library');
  const text = fs.readFileSync(path.join(REPO, 'tmp/library/ws9', f), 'utf8').replace(/-\n/g, '').replace(/\s+/g, ' ').toLowerCase();
  // the running heads of the book: "22 gettysburg." on an even page, "how to see the field properly. 23" on an odd one; a quote is on the page of the last head before it
  const heads = [...text.matchAll(/(?:(\d{1,3}) gettysburg\.|how to see the field properly\. (\d{1,3}))/g)].map(m => ({ at: m.index, page: +(m[1] || m[2]) }));
  for (const q of P.BASIS.quotes) { const at = text.indexOf(q.text.toLowerCase()); assert.ok(at >= 0, `not found in the text: "${q.text}"`); const h = heads.filter(x => x.at < at).pop(); assert.ok(h, 'a running head before the quote'); assert.equal(h.page, q.page, `"${q.text}" stands after the head of printed page ${h.page}, the label says ${q.page}`); }
  assert.match(P.COPY.basis, /Gettysburg: What to See, and How to See It, 1889, pages 21 and 22/);
});

// ---------------------------------------------------------------- the years some reports print
test('the years file is fit against the list: 33 memorials, each named exactly as the list names it, with the report, the page and the quotation; one hedged year is inferred, the rest documented', () => {
  assert.deepEqual(P.validateYears(years, mem), []); assert.equal(years.years.length, 33); assert.equal(years.years.filter(y => y.tier === 'inferred').length, 1); assert.equal(years.years.filter(y => y.tier === 'documented').length, 32);
  for (const y of years.years) { const m = byNo(y.no); assert.equal(y.name, m.name); assert.ok(y.quote.includes(y.name)); assert.ok(y.year > 1863 && y.year < 2030); assert.ok(years.sources[y.source].url.startsWith('https://www.npshistory.com/publications/gett/')); assert.match(y.printedPage, /^Page \d+ of \d+$/); assert.ok(y.pdfPage >= 20 && y.pdfPage <= 60); }
  const nc = years.years.find(y => y.no === 8); assert.equal(nc.year, 1929); assert.equal(nc.tier, 'documented'); assert.equal(nc.quote, 'CE 1929 Memorialized Monument/marker is erected: North Carolina State Monument');
  const pa26 = years.years.find(y => y.no === 379); assert.deepEqual([pa26.year, pa26.yearTo, pa26.approx, pa26.tier], [1888, 1900, true, 'inferred']); assert.equal(P.yearText(pa26), 'about 1888 to 1900'); assert.equal(P.yearText(years.years.find(y => y.no === 103)), '1883 to 1889'); assert.equal(P.yearText(nc), '1929');
  // the names of the list that two entries share, and the ones a report continues with a position marker, are not in it
  for (const no of [174, 175, 444, 445, 458, 460, 132, 140, 485, 394, 327, 434]) assert.ok(!years.years.some(y => y.no === no), `no year is entered for ${no} ${byNo(no).name}`);
});
test('a years file that is not fit is refused with the reason: another name, a memorial twice, a year before the battle, a quotation without the name, a hedged year called documented, an unknown report', () => {
  const clone = () => JSON.parse(JSON.stringify(years)); let d = clone(); d.years[0].name = 'Alabama State Monument'; assert.match(P.validateYears(d, mem).join(' | '), /is not the list's name/);
  d = clone(); d.years[1].no = d.years[0].no; assert.match(P.validateYears(d, mem).join(' | '), /given twice/); d = clone(); d.years[0].year = 1862; assert.match(P.validateYears(d, mem).join(' | '), /is not a year after the battle/);
  d = clone(); d.years[0].quote = 'CE 1929 Memorialized'; assert.match(P.validateYears(d, mem).join(' | '), /quotation does not hold the name and the year/); d = clone(); const h = d.years.find(y => y.no === 379); h.tier = 'documented'; assert.match(P.validateYears(d, mem).join(' | '), /hedges \(ca\.\) is not documented/);
  d = clone(); d.years[0].source = 'NPS-NOWHERE'; assert.match(P.validateYears(d, mem).join(' | '), /is not described/); d = clone(); d.years[0].no = 99999; assert.match(P.validateYears(d, mem).join(' | '), /not a memorial of the list/); d = clone(); d.years.find(y => y.no === 103).yearTo = 1880; assert.match(P.validateYears(d, mem).join(' | '), /end of the range/);
  const dup = JSON.parse(JSON.stringify(mem)); dup.monuments[8].name = dup.monuments[7].name; d = clone(); assert.match(P.validateYears({ ...d, years: [{ ...d.years[0], no: dup.monuments[7].no, name: dup.monuments[7].name, quote: dup.monuments[7].name + ' 1929' }], sources: d.sources }, dup).join(' | '), /two memorials of that name/);
  assert.match(P.validateYears({}, mem).join(), /no years or no sources/); assert.match(P.checkLaterMemorials(mem, T, { ...years, years: [{ ...years.years[0], year: 1700 }] }).problems.join(' | '), /not a year after the battle/);
});
test('a memorial with a year says so on its card with the report, the page and the quotation, and has no gap for it; one without keeps the open gap; the rows and the panel say how many', () => {
  const idx = P.buildIndex(mem, T, { years }), nc = idx.byNo.get(8), h = P.memorialCardHTML(nc, tierMark);
  assert.deepEqual(markupProblems(h), []); assert.match(h, /<b>1929<\/b>/); assert.match(h, /National Park Service, Cultural Landscapes Inventory: Pickett(?:'|&#39;)s Charge Battlefield, Gettysburg National Military Park \(2024\), PDF page 44 \(Page 39 of 131\)/); assert.match(h, /“CE 1929 Memorialized Monument\/marker is erected: North Carolina State Monument”/);
  assert.match(h, /data-tier="documented"/); assert.doesNotMatch(h, /The year is not in the site(?:'|&#39;)s data/); assert.doesNotMatch(h, /ws-world-EG-MON-01/); assert.match(h, /None for this memorial: a report prints its year\./);
  const h26 = P.memorialCardHTML(idx.byNo.get(379), tierMark); assert.match(h26, /about 1888 to 1900/); assert.match(h26, /data-tier="inferred"/); assert.match(h26, /The report says "ca\.": the year is about, not exact/);
  const none = idx.byNo.get(1), hn = P.memorialCardHTML(none, tierMark); assert.match(hn, /The year is not in the site(?:'|&#39;)s data/); assert.match(hn, /ws-world-EG-MON-01/); assert.match(hn, /data-tier="open gap"/);
  const far = idx.items.find(i => i.year && !i.inside), hf = far ? P.memorialCardHTML(far, tierMark) : ''; if (far) { assert.match(hf, /ws-world-EG-MON-02/); assert.doesNotMatch(hf, /ws-world-EG-MON-01/); }
  assert.deepEqual(idx.counts.years, { documented: 32, inferred: 1, openGap: 479 }); assert.match(P.memorialRowsHTML([nc], 0, 1, -1), /put up 1929/); assert.doesNotMatch(P.memorialRowsHTML([none], 0, 1, -1), /put up/);
  const panel = P.memorialPanelHTML(idx, { on: false, positions: 'list', integrity: { checked: true }, list: { q: '', side: 'all', group: 'all', where: 'all' } }, tierMark); assert.match(panel, /For 33 of the 512 a National Park Service report prints the year/); assert.match(panel, /32 documented, 1 inferred/); assert.match(panel, /For the other 479 the year is an open gap/);
  const noYears = P.memorialPanelHTML(P.buildIndex(mem, T), { on: false, positions: 'list', integrity: { checked: true }, list: { q: '', side: 'all', group: 'all', where: 'all' } }, tierMark); assert.doesNotMatch(noYears, /National Park Service report prints the year/);
  for (const m of idx.items) assert.deepEqual(markupProblems(P.memorialCardHTML(m, tierMark)), [], m.name);
});

// ---------------------------------------------------------------- the module in a stand-in page
async function visit(fn, o = {}) {
  const doc = installFakeDocument(), env = await standIn(o); overrideData(o.override); try { return await fn(env, doc); } finally { overrideData(null); doc.restore(); }
}
test('module: at entry the layer is OFF, nothing is drawn, no canvas exists, no scene hook is asked for; the switch, the panel and the notice carry the post-battle label', () => visit(async ({ th, ctx, log, left, stage }, doc) => {
  await M.init(ctx);
  assert.equal(log.toggles.length, 1); const sw = log.toggles[0]; assert.equal(sw.id, 'later-memorials'); assert.match(sw.title, /post-battle/); assert.match(sw.title, /not part of the 1863 scene/); assert.equal(sw.get(), false);
  assert.equal(log.panels.length, 1); assert.equal(log.panels[0].id, 'later-memorials'); assert.equal(log.panels[0].title, 'Later memorials');
  assert.equal(doc.made.filter(n => n.tagName === 'CANVAS').length, 0, 'no canvas is made while the layer is off'); assert.equal(log.hooks, 0); assert.equal(log.timeCalls.length, 0);
  const chip = left.querySelector('#xm-chip'), card = left.querySelector('#xm-card'); assert.ok(chip && card); assert.equal(chip.hidden, true); assert.equal(card.hidden, true); assert.equal(chip.innerHTML, '');
  assert.equal(chip.getAttribute('role'), 'note'); assert.equal(left.children[1], chip, 'the notice stands right under the clock face'); assert.equal(left.children[3], card, 'the card stands after the shell\'s own card'); assert.ok(th.root.querySelector('#xm-style'), 'its own style element');
  M.update(frameOf(th.cam)); M.update(frameOf(th.cam)); assert.equal(doc.made.filter(n => n.tagName === 'CANVAS').length, 0, 'update does nothing while off'); assert.equal(th.sitePlaces.memorials.isOn(), false); assert.equal(th.sitePlaces.memorials.drawn(), 0);
  assert.deepEqual(th.sitePlaces.memorials.counts().total, 512); assert.equal(th.sitePlaces.memorials.integrity().ok, true); assert.equal(th.sitePlaces.memorials.positions(), 'list');
  M.dispose();
}));
test('module: switched on it draws the marks on its own canvas under the shell\'s overlay, the notice appears; the same camera draws nothing again; a moved camera draws again; off removes it all', () => visit(async ({ th, ctx, log, left, stage, overlay }, doc) => {
  await M.init(ctx); const sw = log.toggles[0], it = th.sitePlaces.memorials;
  await sw.set(true); assert.equal(sw.get(), true); assert.equal(it.isOn(), true);
  const chip = left.querySelector('#xm-chip'); assert.equal(chip.hidden, false); assert.match(chip.innerHTML, /Later memorials shown/); assert.match(chip.innerHTML, /not part of the 1863 scene/);
  const cam = camAt(P.poseAround(th.T, ...th.T.xz(-77.2352, 39.8081), { dist: 240, height: 95 })); Object.assign(th.cam, cam);
  M.update(frameOf(th.cam)); const cv = doc.made.find(n => n.tagName === 'CANVAS'); assert.ok(cv, 'the canvas is made when there is something to mark'); assert.equal(cv.id, 'xm-marks'); assert.equal(cv.getAttribute('aria-hidden'), 'true'); assert.equal(cv.style.cssText, 'pointer-events:none');
  assert.equal(stage.children.indexOf(cv), stage.children.indexOf(overlay) - 1, 'right under the shell\'s own overlay'); assert.equal(cv.width, 1280); assert.equal(cv.height, 720);
  const c = cv.getContext(); assert.ok(it.drawn() > 5 && it.marksInView() > 5, `${it.drawn()} marks drawn`); const n1 = c.calls.length, paints = c.calls.filter(x => x === 'fill' || x === 'stroke').length; assert.ok(n1 > 10 && paints > 0 && paints <= 5 + 2 * P.LABEL.max + 2, `${paints} fills and strokes for ${it.drawn()} marks (${n1} path calls)`);
  M.update(frameOf(th.cam)); assert.equal(c.calls.length, n1, 'the same camera: the same marks, nothing is drawn again');
  th.cam.yaw += .2; M.update(frameOf(th.cam)); assert.ok(c.calls.length > n1, 'a moved camera draws again');
  assert.equal(log.hooks, 0, 'never a scene hook'); assert.equal(log.timeCalls.length, 0);
  await sw.set(false); assert.equal(it.isOn(), false); assert.equal(chip.hidden, true); assert.equal(chip.innerHTML, ''); assert.equal(cv.removed, true); assert.equal(cv.width, 0, 'the canvas gave its memory back'); assert.equal(it.drawn(), 0); assert.equal(it.marksInView(), 0);
  M.update(frameOf(th.cam)); assert.equal(doc.made.filter(n => n.tagName === 'CANVAS').length, 1, 'off again: no second canvas is made');
  M.dispose();
}));
test('module: a memorial picked from the list opens its card, flies the camera, marks just that one while the layer is off, and putting it away takes the canvas down', () => visit(async ({ th, ctx, log, left }, doc) => {
  await M.init(ctx); const it = th.sitePlaces.memorials, card = left.querySelector('#xm-card');
  assert.equal(it.counts().years.documented, 32); assert.equal(it.select(8), true); assert.match(card.innerHTML, /<b>1929<\/b>/); assert.match(card.innerHTML, /North Carolina State Monument/); it.select(-1);
  assert.equal(it.select(46, { say: true }), true); assert.equal(it.selected(), 46); assert.equal(card.hidden, false); assert.match(card.innerHTML, /Pennsylvania State Memorial/); assert.match(card.innerHTML, /Later memorial\./); assert.match(log.said.at(-1), /^Selected Pennsylvania State Memorial, a later memorial\.$/);
  M.update(frameOf(th.cam)); const cv = doc.made.find(n => n.tagName === 'CANVAS'); assert.ok(cv, 'one picked while the layer is off: its mark is on the picture'); assert.ok(it.drawn() <= 1);
  assert.equal(it.flyTo(46), true); assert.equal(log.flights.length, 1); const f = log.flights[0].pose; assert.ok([f.x, f.y, f.z, f.yaw, f.pitch, f.fov].every(Number.isFinite)); assert.equal(f.fov, 62); assert.match(log.said.at(-1), /^Flying to Pennsylvania State Memorial, a later memorial\.$/);
  assert.equal(it.select(99999), false); assert.equal(it.selected(), 46, 'a number that is not in the list changes nothing'); assert.equal(it.flyTo(99999), false);
  th.select(3); assert.equal(it.selected(), -1, 'a unit picked in the shell takes the place of the memorial'); assert.equal(card.hidden, true);
  it.select(46); th.selectObject(5); assert.equal(it.selected(), -1, 'so does a structure');
  it.select(46); const fly = card.children.find(c => c.dataset.act === 'fly'), close = card.children.find(c => c.dataset.act === 'close'); assert.ok(fly && close, 'the card has its two buttons'); const flights = log.flights.length; fly.fire('click'); assert.equal(log.flights.length, flights + 1, 'the Fly to button flies to the picked memorial');
  close.fire('click'); assert.equal(it.selected(), -1, 'the close button puts it away'); assert.equal(card.hidden, true);
  M.update(frameOf(th.cam)); assert.equal(cv.removed, true, 'nothing marked and nothing picked: the canvas is taken down');
  M.dispose();
}));
test('module: a memorial beyond the loaded ground is flown to from the edge and says so; the camera never leaves the loaded ground', () => visit(async ({ th, ctx, log }) => {
  await M.init(ctx); const it = th.sitePlaces.memorials, idx = P.buildIndex(mem, T), beyond = idx.items.filter(i => !i.inside);
  for (const b of beyond) { it.select(b.no); assert.equal(it.flyTo(b.no), true); const f = log.flights.at(-1).pose; assert.ok(Math.abs(f.x) < T.W / 2 && Math.abs(f.z) < T.H / 2, `${b.no} ${b.name}`); assert.match(log.said.at(-1), /beyond the (north|south|east|west)[a-z-]* edge of the loaded ground/); }
  assert.equal(log.flights.length, 77); M.dispose();
}));
test('module: the choice of the nine state memorials\' position is announced, rebuilds the marks and survives a picked card', () => visit(async ({ th, ctx, log, left }) => {
  await M.init(ctx); const it = th.sitePlaces.memorials; it.select(46); const card = left.querySelector('#xm-card'), before = card.innerHTML;
  assert.equal(it.setPositions('state-list'), true); assert.equal(it.positions(), 'state-list'); assert.match(log.said.at(-1), /second list/); assert.notEqual(card.innerHTML, before); assert.match(card.innerHTML, /from the site(?:'|&#39;)s second list/);
  assert.equal(it.setPositions('state-list'), false, 'no change'); assert.equal(it.setPositions('nowhere'), false); assert.equal(it.positions(), 'state-list'); assert.equal(it.setPositions('list'), true); assert.match(log.said.at(-1), /Monuments list/);
  M.dispose();
}));
test('module: the panel draws all 512 rows, searches, filters by side, group and ground, shows more, switches the layer, picks a row and flies to it', () => visit(async ({ th, ctx, log }) => {
  await M.init(ctx); const it = th.sitePlaces.memorials, panel = log.panels[0], box = new FakeEl('div'), sc = new Scope('panel-test'), sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    panel.render(box, th, sc); const list = box.querySelector('#xm-list'), count = box.querySelector('#xm-count'), rows = () => list.children.filter(c => c.tagName === 'BUTTON' && c.dataset.no);
    assert.deepEqual(markupProblems(box.innerHTML), []); assert.equal(rows().length, 60); assert.match(count.textContent, /^512 of 512 memorials\./); assert.ok(box.querySelector('#xm-more'), 'a button for the rest of the list');
    box.querySelector('#xm-more').fire('click'); assert.equal(rows().length, 180, 'show more adds 120');
    const q = box.querySelector('#xm-q'); q.value = 'pennsylvania state'; q.fire('input'); await sleep(260); assert.ok(rows().some(r => r.dataset.no === '46'), 'the search finds no. 46'); assert.match(count.textContent, /^[1-9]\d* of 512 memorials/); assert.ok(rows().length < 20);
    q.value = 'zzzz no such memorial'; q.fire('input'); await sleep(260); assert.equal(rows().length, 0); assert.match(list.innerHTML, /No memorial matches\./); assert.match(count.textContent, /^0 of 512/);
    q.value = ''; q.fire('input'); await sleep(260); assert.match(count.textContent, /^512 of 512/);
    box.querySelector('[data-side="Confederate"]').fire('click'); assert.match(count.textContent, /^40 of 512/); box.querySelector('[data-side="all"]').fire('click'); assert.match(count.textContent, /^512 of 512/);
    box.querySelector('[data-where="beyond"]').fire('click'); assert.match(count.textContent, /^77 of 512/); box.querySelector('[data-where="on"]').fire('click'); assert.match(count.textContent, /^435 of 512/); box.querySelector('[data-where="all"]').fire('click');
    const g = box.querySelector('#xm-group'), name = th.sitePlaces.memorials.counts().groups[1]; g.value = name.name; g.fire('change'); assert.match(count.textContent, new RegExp('^' + name.n + ' of 512'));  g.value = 'all'; g.fire('change');
    const sw = box.querySelector('#xm-on'); assert.equal(sw.checked, false); sw.checked = true; sw.fire('change'); await sleep(10); assert.equal(it.isOn(), true, 'the panel\'s own switch turns the layer on'); sw.checked = false; sw.fire('change'); await sleep(10); assert.equal(it.isOn(), false);
    const pos = box.querySelector('#xm-pos'); pos.value = 'state-list'; pos.fire('change'); assert.equal(it.positions(), 'state-list'); pos.value = 'list'; pos.fire('change'); assert.equal(it.positions(), 'list');
    q.value = 'pennsylvania state'; q.fire('input'); await sleep(260); const flights = log.flights.length; rows().find(r => r.dataset.no === '46').fire('click'); assert.equal(it.selected(), 46); assert.equal(log.flights.length, flights + 1); assert.match(log.said.at(-1), /Flying to Pennsylvania State Memorial/);
    sc.dispose(); assert.equal(box.live('click').length, 0, 'the panel\'s listeners end with its scope');
  } finally { sc.dispose(); M.dispose(); }
}));
test('module: the notice has the two buttons: About opens the panel, Hide switches the layer off', () => visit(async ({ th, ctx, log, left }) => {
  await M.init(ctx); const it = th.sitePlaces.memorials, chip = left.querySelector('#xm-chip'); await it.setOn(true);
  const about = chip.children.find(c => c.dataset.act === 'about'), hide = chip.children.find(c => c.dataset.act === 'hide'); assert.ok(about && hide && markupProblems(chip.innerHTML).length === 0);
  about.fire('click'); assert.deepEqual(log.panelsOpened, ['later-memorials']); assert.equal(it.isOn(), true);
  hide.fire('click'); await new Promise(r => setTimeout(r, 10)); assert.equal(it.isOn(), false); assert.equal(chip.hidden, true);
  M.dispose();
}));
test('module: a tap on a mark picks it, a tap on empty picture puts the pick away, a drag or a long press is not a tap, a tap on a control over the picture is ignored', () => visit(async ({ th, ctx, stage, glCanvas, left }, doc) => {
  await M.init(ctx); const it = th.sitePlaces.memorials; await it.setOn(true);
  const idx = P.buildIndex(mem, T), m = idx.byNo.get(46); Object.assign(th.cam, camAt(P.poseAround(T, m.x, m.z, { dist: 160, height: 60 }))); M.update(frameOf(th.cam));
  const vp = new Float32Array(16), o = [0, 0, 0]; P.viewProj(th.cam, 1280 / 720, vp); assert.equal(P.project(vp, idx.X[m.i], idx.Y[m.i], idx.Z[m.i], 1280, 720, o), true);
  const tap = (x, y, extra = {}, up = {}) => { glCanvas.fire('pointerdown', { clientX: x, clientY: y, ...extra }); return glCanvas.fire('pointerup', { clientX: x, clientY: y, ...extra, ...up }); };
  tap(o[0], o[1] - 3); assert.equal(it.selected(), 46, 'the tap on the mark of the Pennsylvania State Memorial picked it');
  tap(40, 600); assert.equal(it.selected(), -1, 'a tap on empty picture puts it away');
  glCanvas.fire('pointerdown', { clientX: o[0], clientY: o[1] - 3 }); glCanvas.fire('pointerup', { clientX: o[0] + 60, clientY: o[1] - 3 }); assert.equal(it.selected(), -1, 'a drag is not a tap');
  const realNow = performance.now.bind(performance); let t = 1000; performance.now = () => t; try { glCanvas.fire('pointerdown', { clientX: o[0], clientY: o[1] - 3 }); t = 2000; glCanvas.fire('pointerup', { clientX: o[0], clientY: o[1] - 3 }); } finally { performance.now = realNow; } assert.equal(it.selected(), -1, 'a long press is not a tap');
  const btn = new (stage.constructor)('button'); stage.append(btn); btn.fire('pointerdown', { clientX: o[0], clientY: o[1] - 3 }); btn.fire('pointerup', { clientX: o[0], clientY: o[1] - 3 }); assert.equal(it.selected(), -1, 'a tap that lands on a control over the picture is ignored');
  th.state.selected = 3; tap(o[0], o[1] - 3); assert.equal(it.selected(), -1, 'when a unit is picked in the shell the shell\'s pick comes first'); th.state.selected = -1;
  M.dispose();
}));
test('module: Escape puts the card away when no drawer is open; the layer\'s keyboard has no listener on the document', () => visit(async ({ th, ctx, stage, left }) => {
  await M.init(ctx); const it = th.sitePlaces.memorials; it.select(46); stage.fire('keydown', { key: 'Escape' }); assert.equal(it.selected(), -1);
  it.select(46); th.state.panel = 'views'; stage.fire('keydown', { key: 'Escape' }); assert.equal(it.selected(), 46, 'with a drawer open Escape belongs to the drawer'); th.state.panel = null;
  M.dispose();
}));
test('module: Back leaves nothing: every element, listener and registration of the visit is gone, and a second visit starts fresh with the layer off', () => visit(async ({ th, ctx, log, left, stage, glCanvas, overlay }, doc) => {
  await M.init(ctx); const it = th.sitePlaces.memorials; await log.toggles[0].set(true); it.select(46); M.update(frameOf(th.cam));
  const card0 = doc.made.find(n => n.id === 'xm-card'); assert.ok(doc.made.find(n => n.id === 'xm-marks') && card0);
  M.dispose();
  for (const n of doc.made) assert.equal(n.removed || n.parentNode === null, true, `${n.tagName}#${n.id} is out of the page`); assert.equal(th.sitePlaces, undefined, 'the theatre carries no trace of the layer');
  assert.equal(left.querySelector('#xm-chip'), null); assert.equal(left.querySelector('#xm-card'), null); assert.equal(th.root.querySelector('#xm-style'), null); assert.equal(stage.querySelector('#xm-marks'), null);
  for (const [name, el] of [['stage', stage], ['card', card0]]) for (const type of ['pointerdown', 'pointerup', 'keydown', 'click']) assert.equal(el.live(type).length, 0, `${name}: no live ${type} listener after dispose`);
  for (const name of ['select', 'select-obj', 'resize']) assert.equal((th.bus.m.get(name) || new Set()).size, 0, `no bus subscription to ${name} after dispose`);
  assert.equal(M.update(frameOf(th.cam)), undefined, 'a call after dispose does nothing'); M.dispose();
  // a second visit on the same module object: init again, everything fresh, the layer off, nothing remembered
  const second = await standIn(); await M.init(second.ctx); const it2 = second.th.sitePlaces.memorials; assert.equal(it2.isOn(), false); assert.equal(it2.selected(), -1); assert.equal(it2.positions(), 'list'); assert.equal(second.log.toggles.length, 1); assert.equal(second.log.toggles[0].get(), false);
  assert.equal(second.left.children.filter(c => c.id === 'xm-chip').length, 1); M.dispose();
}));
test('module: data that fails its checks is not shown and says why; a visit that ended while the list was read starts nothing', async () => {
  const bad = JSON.parse(fs.readFileSync(path.join(APP, 'data/site-memorials.json'), 'utf8')); bad.monuments[10].lat += 0.0001;
  await visit(async ({ ctx, log }, doc) => { overrideData({ 'site-memorials.json': JSON.stringify(bad) }); await assert.rejects(M.init(ctx), /no longer matches the hash recorded with it \(monuments\); it is not shown/); assert.equal(log.toggles.length, 0, 'nothing is registered'); assert.equal(doc.made.length, 0, 'nothing is made'); });
  const unfit = JSON.parse(JSON.stringify(mem)); unfit.monuments[2].name = 'Boundary Stone';
  await visit(async ({ ctx, log }) => { overrideData({ 'site-memorials.json': JSON.stringify(unfit) }); await assert.rejects(M.init(ctx), /not fit to show: .*does not name a monument/); assert.equal(log.toggles.length, 0); });
  await visit(async ({ ctx, log }) => { overrideData({ 'site-memorials.json': 'not json' }); await assert.rejects(M.init(ctx)); });
  await visit(async ({ ctx, log }) => { overrideData({}); const orig = globalThis.fetch; globalThis.fetch = async () => new Response('nope', { status: 503 }); try { await assert.rejects(M.init(ctx), /could not be read \(HTTP 503\)/); } finally { globalThis.fetch = orig; } });
  await visit(async ({ th, ctx, log }, doc) => { th.dead = true; await M.init(ctx); assert.equal(log.toggles.length, 0); assert.equal(doc.made.length, 0); assert.equal(th.sitePlaces, undefined); M.dispose(); });
});
test('module: the module file asks for nothing it must not: no scene hook, no clock, no document or window listener, no random numbers, no wall clock in what is drawn', () => {
  for (const f of ['monuments.mjs', 'site-places.mjs']) { const src = fs.readFileSync(path.join(APP, 'src/ext', f), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /addSceneHook|\.R\.ext\s*=|setTime\(|setPlaying\(|setSpeed\(/, f); assert.doesNotMatch(src, /document\.addEventListener|window\.addEventListener|globalThis\.addEventListener/, f); assert.doesNotMatch(src, /Math\.random|Date\.now|new Date\(/, f);
    assert.doesNotMatch(src, /\b(localStorage|sessionStorage|indexedDB)\b/, `${f}: nothing is remembered between visits`); }
});
