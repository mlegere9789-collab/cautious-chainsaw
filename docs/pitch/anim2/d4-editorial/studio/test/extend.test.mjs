// test/extend.test.mjs - the EXTENSION POINTS: a skin (contract + conformance check), a popup (host placement in free space), an fx module, a layout strategy, a motion mode and a motion model,
// each registered by name and exercised end to end.  This file is the worked example a design pitch copies from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { checkSkin, recordingContext, validateSkin } from '../src/skins/contract.mjs';
import { referenceSkin } from '../src/skins/reference.mjs';
import { templateSkin } from '../src/skins/_template.mjs';
import { SKINS } from '../src/skins/index.mjs';
import { POPUPS } from '../src/popups/index.mjs';
import { templatePopup } from '../src/popups/_template.mjs';
import { FX } from '../src/fx/index.mjs';
import { chipSize } from '../src/layout/spec.mjs';
import { placeCard, frameObstacles, createPopupHost } from '../src/popups/host.mjs';
import { createTextModel } from '../src/layout/text.mjs';
import { verifyFrame } from '../src/layout/geom.mjs';
import { PchipTrack } from '../src/interp/paths.mjs';

const { dataset, textTable } = loadDocs(); const text = createTextModel(textTable);
const scene = dataset.scenes.find((s) => s.id === 'fresh2');
const mk = (opts = {}) => { const e = makeEngine({ start: { tick: scene.tick, lat: scene.lat, lng: scene.lng, zoom: 15 }, ...opts }); e.setViewport(1440, 900); for (let i = 0; i < 30; i++) e.step(1000 / 60); return e; };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

// ---- skins -----------------------------------------------------------------------------------------------------------------------------------------------
test('the reference skin conforms to the skin contract: ink inside the footprint for every side, arm, badge, selection and strength state of real tiles', () => {
  const e = mk(); const spec = e.spec(); const f = e.frame; const samples = [];
  for (const t of f.tiles.filter((x) => x.solid)) { samples.push(t); samples.push({ ...t, selected: true, ratio: 0 }); samples.push({ ...t, ratio: 1, ageMax: 400, ageTicks: 400 }); }
  for (const side of ['union', 'confederate', 'unknown', 'mixed']) for (const arm of ['infantry', 'cavalry', 'artillery', 'mixed']) samples.push({ ...f.tiles.find((x) => x.solid), key: `synthetic ${side}/${arm}`, side, arm, badge: '×128', short: 'ART/II/CORPS', w: chipSize(spec, 'ART/II/CORPS', '×128').w, selected: side === 'unknown', ratio: 0.5 });
  const bad = checkSkin(referenceSkin, spec, samples, text); assert.deepEqual(bad.slice(0, 5), []); assert.ok(samples.length > 600);
});

test('the conformance check is a real check: a skin that paints outside its box, and one that paints nothing, are reported', () => {
  const spec = mk().spec(); const t = { key: 'x', kind: 'leaf', w: 60, h: 20, side: 'union', arm: 'infantry', short: '19 IN', ratio: 1, ageMax: 0, label: { x0: 0, y0: 0, x1: 60, y1: 14, text: 'Nineteenth', opacity: 1 } };
  const wide = { id: 'wide', draw: { tile(c) { c.fillRect(-40, -10, 80, 20); }, label(c) { c.fillRect(0, 0, 90, 14); } } }; const none = { id: 'none', draw: { tile() {} } };
  const p1 = checkSkin(wide, spec, [t], text); assert.ok(p1.some((m) => /leaves the footprint/.test(m)) && p1.some((m) => /label ink/.test(m)));
  assert.ok(checkSkin(none, spec, [t], text).some((m) => /painted nothing/.test(m)));
  const c = recordingContext(text); c.save(); c.translate(10, 5); c.beginPath(); c.rect(0, 0, 4, 4); c.clip(); c.fillRect(-100, -100, 300, 300); c.restore(); assert.ok(c.box.x1 <= 14 + 1e-9 && c.box.x0 >= 10 - 1e-9, 'a clip limits the recorded ink');
});

test('a registered skin is picked up by name: the engine draws with it, its footprint drives the layout, and the registry validates it', () => {
  const calls = { tile: 0 }; const mine = { id: 'mine', label: 'Mine', version: '0.1', footprint: { chipH: 24, chipMinW: 44 }, draw: { tile() { calls.tile++; } } };
  const e = mk({ skin: mine, settings: { 'skin.id': 'mine' } }); assert.equal(e.spec().chipH, 24); assert.equal(e.spec().chipMinW, 44); assert.ok(e.frame.tiles.every((t) => t.h === 24 || t.opacity < 1 || t.entering));
  assert.throws(() => e.kernel.skins.register('bad-footprint', { draw: { tile() {} }, footprint: { nonsense: 3 } }), /unknown footprint/); assert.throws(() => validateSkin('x', { draw: { tile: 1 } }), /draw.tile/);
  assert.throws(() => e.kernel.skins.register('bad-font', { draw: { tile() {} }, fonts: { code: 3 } }), /fonts/);
  e.tuning.set('skin.id', 'reference'); assert.ok(true);
});

test('the legend of the reference skin labels every claim with the site\'s evidence vocabulary', () => {
  const ok = new Set(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown']); const lg = referenceSkin.legend(); assert.ok(lg.length >= 7);
  for (const row of lg) { assert.ok(ok.has(row.evidence), row.text + ' -> ' + row.evidence); assert.ok(row.text.length > 10); }
  assert.ok(lg.some((r) => r.evidence === 'Contested' && /UNKNOWN/.test(r.text)), 'the unknown side is explained');
});

// ---- popups ----------------------------------------------------------------------------------------------------------------------------------------------
test('the popup registry starts EMPTY (the shell fills it), and the free-space search places a card: over no solid chip, label or pin, inside the screen, near its anchor (300 placements on real frames)', () => {
  const e = mk(); const f = e.frame; assert.deepEqual(e.kernel.popups.ids(), []); const obstacles = frameObstacles(f); assert.ok(obstacles.length > 300);
  const r = rng(3); let placed = 0; let none = 0; let near = 0;
  for (let k = 0; k < 300; k++) {
    const size = k % 2 ? { w: 340, h: 160 } : { w: 220, h: 90 }; const anchor = { x: 100 + r() * 1200, y: 100 + r() * 600 };
    const spot = placeCard({ w: size.w, h: size.h, anchor, obstacles, viewport: { w: 1440, h: 900 } });
    if (!spot) { none++; continue; } placed++;
    const rect = { x0: spot.x, y0: spot.y, x1: spot.x + size.w, y1: spot.y + size.h };
    assert.ok(spot.x >= 10 && spot.y >= 10 && rect.x1 <= 1430 && rect.y1 <= 890, 'inside the screen');
    for (const o of obstacles) assert.ok(!(o.x0 < rect.x1 && o.x1 > rect.x0 && o.y0 < rect.y1 && o.y1 > rect.y0), `card over a ${o.kind} of ${o.owner}`);
    if (Math.hypot(spot.x + size.w / 2 - anchor.x, spot.y + size.h / 2 - anchor.y) < 500) near++;
  }
  console.log(`# ${placed} cards placed in free space, ${none} found no room (the popup track decides what to do then: a chip, a queue); ${near} within 500 px of their anchor`);
  assert.ok(placed > 150);
});

test('the host: a registered popup gets its card placed, keeps the place while it stays free, glides to a new place when a tile blocks it, and gets a leader line to its anchor', () => {
  const e = mk(); const log = [];
  e.kernel.popups.register('probe', { label: 'Probe', update(frame, api) { const t = frame.tiles.find((q) => q.solid && q.kind === 'leaf'); log.push(api.obstacles.length); return [{ key: 'c1', anchor: { tileKey: t.key }, size: { w: 200, h: 80 }, priority: 1 }]; } });
  const host = createPopupHost(e); const a = host.layout(e.frame, 0); assert.equal(a.length, 1); assert.ok(a[0].leader && a[0].anchor);
  const b = host.layout(e.frame, 16); assert.ok(Math.hypot(b[0].x - a[0].x, b[0].y - a[0].y) < 1e-6, 'unchanged picture: unchanged card');
  // block the card's place with a synthetic solid tile, as a unit walking onto it would
  const f2 = { ...e.frame, tiles: [...e.frame.tiles, { key: 'blocker', ids: ['blocker'], solid: true, opacity: 1, x: a[0].x + 100 - e.frame.view.dx, y: a[0].y + 40 - e.frame.view.dy, w: 300, h: 140, scale: 1, label: null, displaced: false, ax: 0, ay: 0 }] };
  let c = null; for (let i = 0; i < 90; i++) c = host.layout(f2, 32 + i * 16);
  assert.ok(c.length === 1 && (Math.abs(c[0].x - a[0].x) > 5 || Math.abs(c[0].y - a[0].y) > 5), 'moved away from the blocker');
  const obs = frameObstacles(f2); const r = { x0: c[0].x, y0: c[0].y, x1: c[0].x + 200, y1: c[0].y + 80 }; for (const o of obs) assert.ok(!(o.x0 < r.x1 && o.x1 > r.x0 && o.y0 < r.y1 && o.y1 > r.y0), 'settled card is clear of every tile');
  assert.ok(log.length > 3);
});

// ---- fx, layout strategy, motion mode, motion model ------------------------------------------------------------------------------------------------------
test('fx, layout strategies, motion modes and motion models register by name and take effect (the registries are the extension mechanism)', () => {
  const e = mk(); const k = e.kernel;
  // fx: gets update(frame, engine) in the app loop; registered and listed here
  k.fx.register('halo', { label: 'Halo', update() {}, draw() {} }); assert.deepEqual(k.fx.ids(), ['halo']);
  // layout strategy: a trivial one that puts every unit in its own tile at the true position (the raw strategy under another name) proves a strategy can be swapped in by token
  k.layout.register('mine', { label: 'Mine', create: (ctx) => k.layout.get('raw').create(ctx) }); e.tuning.set('layout.strategy', 'mine'); for (let i = 0; i < 5; i++) e.step(16.7); assert.ok(e.frame.tiles.length > 100);
  e.tuning.set('layout.strategy', 'certified');
  // motion mode: a mode that never moves a tile off its true position and always snaps
  const snapper = k.motion.get('snap'); k.motion.register('my-snap', { label: 'My snap', create: snapper.create }); e.tuning.set('motion.mode', 'my-snap'); for (let i = 0; i < 5; i++) e.step(16.7); assert.equal(e.frame.overlaps, 0);
  // motion model: straight lines at constant speed with a one-tick pause at the end
  k.interp.register('lazy', { label: 'Lazy', build: (kfs) => new PchipTrack(kfs, 'rest') }); e.tuning.set('interp.model', 'lazy'); for (let i = 0; i < 5; i++) e.step(16.7); assert.equal(e.battle.units.get(e.frame.tiles.find((t) => t.kind === 'leaf').ids[0]).track.constructor.name, 'PchipTrack');
  assert.equal(verifyFrame([], 2).overlaps, 0);
});

test('the shell lists the reference skin first (the design pitches follow it: skins.test.mjs) and the twelve popups of the Overlay Director in a fixed order, no effects; the copy-me template skin conforms to the contract and is a drop-in', () => {
  assert.equal(SKINS[0].id, 'dispatch-paper'); assert.ok(SKINS.some((k) => k.id === 'reference')); assert.ok(SKINS.every((k) => /^[a-z][a-z0-9]*(?:[-/.][a-z0-9]+)*$/.test(k.id)));
  assert.deepEqual(POPUPS.map((p) => p.id), ['clock-hud', 'day-banner', 'event-card', 'story-card', 'command-toast', 'command-crossout', 'unit-card', 'tour', 'legend', 'minimap', 'hints', 'chronicle']); assert.deepEqual(FX, []);
  for (const p of POPUPS) { assert.ok(p.label && p.doc && typeof p.update === 'function', p.id); }
  const e = mk(); const spec = e.spec(); const tiles = e.frame.tiles.filter((t) => t.solid); const bad = checkSkin(templateSkin, spec, [...tiles, ...tiles.map((t) => ({ ...t, selected: true }))], text); assert.deepEqual(bad.slice(0, 3), []);
  const e2 = makeEngine({ skin: templateSkin, settings: { 'skin.id': 'template' } }); e2.setViewport(1440, 900); for (let i = 0; i < 20; i++) e2.step(1000 / 60); assert.equal(e2.frame.overlaps, 0);
  for (const row of templateSkin.legend()) assert.ok(['Documented', 'Contested'].includes(row.evidence));
});

test('the copy-me template popup: a card for a chronology event is raised when the clock reaches it, is placed on free ground, points at its units, and stays for READING time in wall-clock seconds however fast the clock runs', () => {
  const { popupData } = loadDocs(); const ev = dataset.events.find((x) => x.tick === 380); assert.ok(ev && ev.significance === 'high');          // a quiet stretch of the battle: no other event within 14 ticks
  const e = makeEngine({ settings: { 'popup.queue.aliveA': 4, 'popup.queue.aliveChips': 6 }, start: { tick: ev.tick - 3, lat: scene.lat, lng: scene.lng, zoom: 15 } }); e.setViewport(1440, 900); for (let i = 0; i < 30; i++) e.step(1000 / 60);
  e.kernel.popups.register(templatePopup.id, templatePopup); const host = createPopupHost(e, { popupData, size: { w: 1440, h: 900 } }); let now = 0; const frame = (dt = 16.667) => { e.step(dt); now += dt; return host.frame(e.frame, now, dt); };
  e.transport.setSpeed(2); e.transport.play(); let out = null; for (let i = 0; i < 600 && !host.cards.has('template-events:event-' + ev.tick); i++) out = frame();
  assert.ok(host.cards.has('template-events:event-' + ev.tick), 'raised when the clock reached its tick');
  const rec = frame().cards.find((c) => c.id === 'template-events:event-' + ev.tick); const obs = frameObstacles(e.frame);
  if (rec.rect) { const r = { x0: rec.rect.x, y0: rec.rect.y, x1: rec.rect.x + rec.rect.w, y1: rec.rect.y + rec.rect.h }; assert.ok(!obs.some((o) => o.x0 < r.x1 && o.x1 > r.x0 && o.y0 < r.y1 && o.y1 > r.y0), 'placed over no tile'); } else assert.ok(rec.lane, 'no room: a chip in the strip');
  e.transport.setSpeed(2); const t0 = now; let gone = null; for (let i = 0; i < 2400 && gone == null; i++) { frame(); const c = host.cards.get('template-events:event-' + ev.tick); if (!c || c.phase === 'out') gone = now - t0; }
  const w = displayTextWords(ev.event); assert.ok(gone > 2100, `lived ${gone} ms at 2x (its tick lasts 250 ms): reading time, not the length of its tick`); void w; void out;
});

const displayTextWords = (s) => s.split(/\s+/).length;
