// test/editorial.test.mjs - the tests of the Dispatch language (art direction 4): the skin's sizing, the anchor on the glyph, the certified layout and the played frames WITH THIS SKIN'S FOOTPRINT,
// the names, the hull, the legend, the tokens and the colour tests.  The pixel check of the ink (tools/skin-ink.mjs) and the real-Chrome scene checks (tools/shots.mjs) need a browser; these do not.
//   node --test docs/pitch/anim2/d4-editorial/studio/test/editorial.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { createKernel } from '../src/kernel/registry.mjs';
import { registerBuiltins } from '../src/builtins.mjs';
import { SKINS } from '../src/skins/index.mjs';
import { verifyFrame } from '../src/layout/geom.mjs';
import { nameOf, abbreviate } from '../src/layout/tiles.mjs';
import { DISPATCH_TOKENS } from '../src/skins/editorial.spec.mjs';
import { frameOf, sizeOf, labelSizeOf, formationOf } from '../src/skins/editorial.mjs';
import { runContrastTests } from '../../tools/contrast-tests.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const SRC = ['editorial.mjs', 'editorial.spec.mjs'].map((f) => fs.readFileSync(path.join(HERE, '..', 'src', 'skins', f), 'utf8')).join('\n');      // the drawing and the one shared function (fadeFill) that reads the age tokens
const { dataset } = loadDocs();
const kernel = registerBuiltins(createKernel()); for (const k of SKINS) kernel.skins.register(k.id, k);
const engine = (skin = 'dispatch-paper', start) => { const e = makeEngine({ kernel, start, settings: { 'skin.id': skin } }); return e; };

test('every token of the language is documented, typed, in range, and read by the drawing code (and nothing reads a token that is not listed)', () => {
  const names = new Set(DISPATCH_TOKENS.map((r) => r[0])); names.add('text.dy');
  for (const r of DISPATCH_TOKENS) { assert.ok(typeof r[2] === 'string' && r[2].length > 12, `${r[0]}: needs a doc line`); if (typeof r[1] === 'number' && r[3]) { assert.ok(r[1] >= r[3].min && r[1] <= r[3].max, `${r[0]} = ${r[1]} outside ${r[3].min}..${r[3].max}`); } }
  for (const n of names) assert.ok(n === 'motion.selectMs' || n === 'motion.hoverMs' /* read by skins/kit.mjs: the eased selection and hover */ || SRC.includes(`P['${n}']`) || SRC.includes(`P["${n}"]`) || (/^flag\.(w|h)\./.test(n) && SRC.includes("P['flag.w.' + kind]") && SRC.includes("P['flag.h.' + kind]")), `token ${n} is never read by editorial.mjs`);
  for (const m of SRC.matchAll(/P\['([a-zA-Z.0-9]+)'\]/g)) assert.ok(names.has(m[1]) || /^flag\.(w|h)\.$/.test(m[1]) || m[1].startsWith('flag.'), `editorial.mjs reads ${m[1]}, which is not a listed token`);
  assert.equal(kernel.skins.list().filter((s) => /^dispatch/.test(s.id)).length, 6, 'two families, three variants each');
});

test('echelon is size: unit < brigade < division < corps, and the crowd mark is a standard with a pile behind it; the box always holds the frame', () => {
  const e = engine(); const spec = e.spec(); const P = kernel.skins.get('dispatch-paper').skin.P;
  const sz = (info) => sizeOf(spec, { text: 'X/1/1', ...info }, P);
  const unit = sz({ kind: 'regiment', echelon: 0 }); const bn = sz({ kind: 'battalion', echelon: 1 }); const bde = sz({ kind: 'brigade', echelon: 2 }); const div = sz({ kind: 'division', echelon: 3 }); const corps = sz({ kind: 'corps', echelon: 4 }); const crowd = sz({ agg: true, kind: 'brigade', nameKind: 'brigade' });
  assert.ok(unit.h <= bn.h && bn.h <= bde.h && bde.h < div.h && div.h < corps.h, 'height grows with echelon');
  assert.ok(unit.frameW < bde.frameW && bde.frameW < div.frameW && div.frameW < corps.frameW, 'the frame grows with echelon');
  for (const s of [unit, bn, bde, div, corps, crowd]) { assert.ok(s.hx > 0, 'the glyph stands left of the middle of the box'); assert.ok(s.w > s.frameW + 6, 'the box holds the frame and the text'); assert.equal(s.hy, 0); }
  assert.equal(frameOf(P, { agg: true }).kind, 'crowd'); assert.ok(frameOf(P, { agg: true }).stack > 0);
  assert.ok(sizeOf(spec, { text: 'II/2', agg: true, nameKind: 'lead' }, P).w > sizeOf(spec, { text: 'II/2', agg: true, nameKind: 'brigade' }, P).w, 'the plus of a lead crowd is part of its box');
});

test('the name grows out of the mark: the label rectangle is only the part of the name beyond the room the code has, and it carries the mark font', () => {
  const e = engine(); const spec = e.spec(); const P = kernel.skins.get('dispatch-paper').skin.P; let grown = 0;
  for (const u of e.battle.units.values()) {
    const cs = sizeOf(spec, { text: u.short, kind: u.kind, echelon: u.echelon }, P); const L = labelSizeOf(spec, { text: nameOf(u), chip: cs }, P);
    if (L.w > 0) { grown++; const need = spec.text.width(cs.font === 'badge' ? 'badge' : 'label', nameOf(u)) - cs.textW; assert.ok(L.w >= need, `${u.id}: label ${L.w} narrower than the overhang ${need}`); assert.equal(L.h, cs.h); }
  }
  assert.ok(grown > 350, `most of the 478 units have a name that grows (${grown}); the rest have a name no longer than their code`);
});

test('names: whole (never cut with an ellipsis), the unit\'s own words, nicknames in brackets left to the unit card, formation records abbreviated by rule', () => {
  assert.equal(abbreviate('Third Brigade, Second Division, Third Corps'), '3rd Bde, 2nd Div, 3rd Corps');
  assert.equal(abbreviate('First Brigade, First Division, Twelfth Corps'), '1st Bde, 1st Div, 12th Corps');
  for (const u of e0().battle.units.values()) {
    const n = nameOf(u); assert.ok(n.length > 0, u.id); assert.ok(!/…$/.test(n), `${u.id}: "${n}" is cut`);
    const bag = ((u.designation || '') + ' ' + (u.label || '')).replace(/…/g, '').toLowerCase(); const norm = (w) => w.replace(/[^a-z0-9']/g, '');
    const have = new Set(bag.split(/\s+/).map(norm)); const alias = { bde: 'brigade', div: 'division' };
    for (const w of n.toLowerCase().split(/\s+/).map(norm)) { if (!w) continue; const ord = { '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth', '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth', '11th': 'eleventh', '12th': 'twelfth' }; assert.ok(have.has(w) || have.has(alias[w]) || have.has(ord[w]) || [...have].some((h) => h.startsWith(w.replace(/…/, ''))), `${u.id}: "${n}" says "${w}", which is not in "${bag}"`); }
  }
  function e0() { return engine(); }
});

test('the glyph stands on the true position: an undisplaced mark is centred on its unit, a displaced one has its pin there; the box is anchored by its home', () => {
  const e = engine('dispatch-paper', { tick: 556, zoom: 15.5, lat: 39.8117, lng: -77.235 }); e.moveTo({ lat: 39.8117, lng: -77.235, zoom: 15.5 }, { glide: false }); for (let i = 0; i < 90; i++) e.step(16.667);
  const f = e.frame; let near = 0; let pinned = 0;
  for (const t of f.tiles) {
    if (t.life !== 'live') continue; assert.ok(Number.isFinite(t.px) && Number.isFinite(t.py) && Number.isFinite(t.hx), t.key);
    const gx = t.x - t.hx; const gy = t.y - t.hy; const d = Math.hypot(gx - t.px, gy - t.py);
    if (!t.displaced) { assert.ok(d < 1.6, `${t.key}: undisplaced but the glyph is ${d.toFixed(2)} px from the true position`); near++; } else { assert.ok(d > 1.4, `${t.key}: displaced but only ${d.toFixed(2)} px away`); pinned++; }
  }
  assert.ok(near > 100 && pinned > 5, `a real frame has both kinds (${near}, ${pinned})`);
});

function coreCheck(f, spec) {                                                                         // an independent brute force on a played frame: boxes, grown names, pins at true positions
  const it = []; for (const t of f.tiles) { if (t.life !== 'live' && t.life !== 'dying') continue; if (t.opacity < 0.5) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; it.push({ o: t.key, k: 'core', x0: t.x - hw, y0: t.y - hh, x1: t.x + hw, y1: t.y + hh }); if (t.label && t.label.opacity >= 0.5) it.push({ o: t.key, k: 'label', x0: t.label.x0, y0: t.label.y0, x1: t.label.x1, y1: t.label.y1 }); if (t.displaced) it.push({ o: t.key, k: 'pin', x0: t.px - spec.pinHalf, y0: t.py - spec.pinHalf, x1: t.px + spec.pinHalf, y1: t.py + spec.pinHalf }); }
  let bad = 0; for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) { const a = it[i]; const b = it[j]; if (a.o === b.o || (a.k === 'pin' && b.k === 'pin')) continue; if (Math.max(a.x0 - b.x1, b.x0 - a.x1) < -1e-6 && Math.max(a.y0 - b.y1, b.y0 - a.y1) < -1e-6) bad++; } return bad;
}
test('the certified layout holds with THIS footprint: every sample tick and zoom, cold solves, 0 overlaps, 0 clearance violations, 0 unrepresented, the pin at the true position, the budget kept', { timeout: 1_200_000 }, () => {
  const e = engine(); const spec = e.spec(); assert.ok(spec.skinSize, 'the skin sizes its own mark'); const fresh = () => e.kernel.layout.get('certified').create({ all: e.battle, tok: e.tok });
  const ticks = [1, 28, 64, 120, 226, 295, 346, 451, 551, 556, 620]; const zooms = [12, 13.5, 14.5, 15.5, 17]; let solves = 0; let maxTiles = 0;
  for (const tick of ticks) { const vis = e.battle.visibleAt(tick); for (const z of zooms) {
    const L = fresh().solve({ vis, z, tau: tick, view: { dx: 0, dy: 0, w: 1440, h: 900 }, dtMs: 16.7, selectedId: null, spec, cold: true }); solves++; maxTiles = Math.max(maxTiles, L.placed.length);
    const v = verifyFrame(L.items, spec.gap - 1e-6, true); assert.equal(v.overlaps, 0, `tick ${tick} z${z}: ${v.overlaps} overlaps`); assert.equal(v.clearanceViolations, 0, `tick ${tick} z${z}: clearance`);
    assert.equal(L.dropped.length, 0); const seen = new Map(); for (const p of L.placed) for (const id of p.t.ids) seen.set(id, (seen.get(id) || 0) + 1); assert.equal(seen.size, vis.length, `tick ${tick} z${z}: ${seen.size} of ${vis.length} represented`); for (const [id, k] of seen) assert.equal(k, 1, id);
    for (const p of L.placed) { assert.ok(Math.hypot(p.off.ox, p.off.oy) <= spec.dMax + 1e-6, `${p.t.key}: budget`); const pin = { x0: p.t.px - spec.pinHalf, y0: p.t.py - spec.pinHalf, x1: p.t.px + spec.pinHalf, y1: p.t.py + spec.pinHalf };
      for (const q of L.placed) { if (q === p) continue; const c = q.chip; assert.ok(!(c.x0 < pin.x1 && c.x1 > pin.x0 && c.y0 < pin.y1 && c.y1 > pin.y0), `tick ${tick} z${z}: the box of ${q.t.key} covers the true position of ${p.t.key}`); } }
  } }
  assert.ok(solves === ticks.length * zooms.length && maxTiles > 200, `${solves} solves, up to ${maxTiles} marks`);
});

test('played frames with this skin: 0 overlapping boxes, names or pins on every frame, 0 unrepresented units (4x, 8 s, three scenes, both families), with a unit hovered and one selected', { timeout: 1_200_000 }, () => {
  let frames = 0;
  for (const [skin, scene] of [['dispatch-paper', { tick: 551, zoom: 15.5, lat: 39.8117, lng: -77.235 }], ['dispatch-aerial', { tick: 290, zoom: 15, lat: 39.7989, lng: -77.2411 }], ['dispatch-paper', { tick: 620, zoom: 13.5, lat: 39.81592, lng: -77.23677 }]]) {
    const e = engine(skin, scene); e.moveTo(scene, { glide: false }); e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 20; i++) e.step(16.667);
    const spec = e.spec(); let focused = false;
    for (let i = 0; i < 480; i++) {
      e.step(16.667);
      if (i === 120) { const t = e.frame.tiles.find((q) => q.kind === 'leaf' && q.solid); if (t) { e.focus(t.ids[0]); focused = true; } }
      if (i === 240) { const t = e.frame.tiles.find((q) => q.kind === 'leaf' && q.solid && q.ids[0] !== e.focusId); if (t) e.select(t.ids[0]); }
      const f = e.frame; frames++; assert.equal(f.unrepresented, 0, `${skin} frame ${i}: unrepresented`); const bad = coreCheck(f, spec); assert.equal(bad, 0, `${skin} frame ${i}: ${bad} overlaps`); assert.equal(f.overlaps, 0, `${skin} frame ${i}: the engine's verifier`);
    }
    assert.ok(focused);
  }
  assert.equal(frames, 1440);
});

test('the hull joins the records of one formation: a crowd its own records, a regiment the units of its brigade, a brigade record everything under it', () => {
  const e = engine('dispatch-paper', { tick: 556, zoom: 14.5, lat: 39.8117, lng: -77.235 }); e.moveTo({ lat: 39.8117, lng: -77.235, zoom: 14.5 }, { glide: false }); for (let i = 0; i < 120; i++) e.step(16.667); const f = e.frame;
  const crowd = f.tiles.find((t) => t.kind === 'agg' && t.life === 'live'); assert.ok(crowd); const hc = formationOf(f, crowd); assert.deepEqual(hc.ids, crowd.ids); assert.equal(hc.kind, 'crowd');
  const leaf = f.tiles.find((t) => t.kind === 'leaf' && t.life === 'live' && t.unit && t.unit.kind === 'regiment' && (t.unit.chain || []).some((id) => f.nodeKind(id) === 'brigade')); assert.ok(leaf);
  const h = formationOf(f, leaf); assert.ok(h.ids.includes(leaf.unit.id)); const bde = leaf.unit.chain.find((id) => f.nodeKind(id) === 'brigade'); for (const id of h.ids) { const u = f.unitOf(id); assert.ok(u.id === bde || u.chain.includes(bde), `${id} is not under ${bde}`); }
});

test('the legend is the drawing: every channel the skin draws has rows with an evidence label and a swatch, and posture and arm state (never drawn) have none', () => {
  for (const id of ['dispatch-paper', 'dispatch-aerial/cvd']) {
    const skin = kernel.skins.get(id); const chans = Object.keys(skin.channels); assert.ok(!chans.includes('posture') && !chans.includes('armState'), 'the compact mark does not draw posture');
    const rows = skin.legend(); assert.ok(rows.length >= 18, `${id}: ${rows.length} legend rows`);
    for (const r of rows) { assert.ok(r.text && r.text.length > 10); assert.ok(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown', 'Design'].includes(r.evidence), r.text); assert.ok(chans.includes(r.channel), `${r.channel} is not a channel of the skin`); assert.ok(r.swatch); }
    assert.ok(rows.find((r) => r.channel === 'strength' && r.evidence === 'Modelled'), 'strength is Modelled'); assert.ok(rows.find((r) => r.channel === 'aggregate' && r.evidence === 'Computed'), 'a crowd count is Computed'); assert.ok(rows.find((r) => r.channel === 'side' && r.value === 'unknown' && r.evidence === 'Contested'), 'the contested side is Contested');
  }
});

test('every colour pair of the language meets its bar (marks on the real ground, text on its halo, the two sides under colour-vision simulation, the cards): tools/contrast-tests.mjs', () => {
  const r = runContrastTests(); const fail = r.filter((x) => !x.pass); assert.equal(fail.length, 0, fail.map((x) => `${x.name}: ${x.value} < ${x.bar}`).join('; ')); assert.ok(r.length >= 100, `${r.length} checks`);
});

test('the dataset behind the pictures is the prototype\'s: 478 units, 1,687 keyframes (nothing was added or edited for the design)', () => {
  assert.equal(dataset.provenance.counts.units, 478); assert.equal(dataset.provenance.counts.keyframes, 1687);
});
