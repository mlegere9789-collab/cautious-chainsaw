// test/skin-d1.test.mjs - the Quiet Cartographer skin, node only (the real-browser checks are tools/*.mjs):
//   * the token file: every token documented, typed, in range, and READ by the drawing code (a token nobody reads fails), in all six skins (night, day, each with cvd and contrast);
//   * the sizer: every footprint is positive, grows with detail and with selection, and holds its own parts (the pip, the lettering, the name, the hairline), for all 478 units at six zooms;
//   * the honesty rules: the unknown side is never drawn in a side colour, a unit known by its id alone is italic, a formation claims no arm, an aggregate names only what its members share;
//   * names: the 24-character ellipsis of the data never reaches the map;
//   * the legend: one row per drawn value, each with a short sentence and a legal evidence label;
//   * the engine with this skin's footprints: the certified layout leaves zero overlaps and zero unrepresented units over real frames at three zooms, with and without a selected unit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QUIET_NIGHT, QUIET_DAY, compactName, plan, FOOT } from '../src/skins/quiet-cartographer.mjs';
import { QC_TOKENS } from '../src/skins/quiet-cartographer.spec.mjs';
import { CHANNELS, EVIDENCE } from '../src/skins/semantics.mjs';
import { checkToken } from '../src/skins/kit.mjs';
import { makeEngine, loadDocs, PROTO } from '../src/headless.mjs';
import { createTextModel } from '../src/layout/text.mjs';
import { makeSpec } from '../src/layout/spec.mjs';

const ALL = [...QUIET_NIGHT, ...QUIET_DAY];
const SRC = fs.readFileSync(path.join(PROTO, 'src', 'skins', 'quiet-cartographer.mjs'), 'utf8');
const { dataset, textTable } = loadDocs();
const TEXT = createTextModel(textTable, 1.04, 'table');

test('six skins are registered: night and day, each with a colour-blind-safe and a high-contrast variant', () => {
  assert.deepEqual(ALL.map((s) => s.id), ['quiet-cartographer', 'quiet-cartographer/cvd', 'quiet-cartographer/contrast', 'quiet-cartographer-day', 'quiet-cartographer-day/cvd', 'quiet-cartographer-day/contrast']);
});

test('every token is documented, typed, in range, and read by the drawing code', () => {
  for (const [name, value, doc, opts = {}] of QC_TOKENS) {
    assert.ok(doc.length > 20, `${name} needs a real doc line`);
    const def = QUIET_NIGHT[0].tokenDocs.byName.get(name); assert.ok(def, name); assert.equal(checkToken(def, value), null, name);
    if (name === 'motion.selectMs' || name === 'motion.hoverMs') continue;       // read by the kit itself (skins/kit.mjs prepare): the eased selection and hover
    assert.ok(SRC.includes(`'${name}'`), `no drawing code reads ${name}`);
  }
  for (const k of ['motion.selectMs', 'motion.hoverMs']) assert.ok(QUIET_NIGHT[0].tokenDocs.byName.has(k));
});

test('the variants change only tokens that exist', () => {
  const names = new Set(QC_TOKENS.map((r) => r[0]));
  for (const s of ALL) for (const k of Object.keys(s.skin.P)) assert.ok(names.has(k), `${s.id}: stray token ${k}`);
  assert.notEqual(QUIET_NIGHT[0].skin.P['color.union'], QUIET_NIGHT[1].skin.P['color.union'], 'cvd changes the side colours');
  assert.notEqual(QUIET_NIGHT[0].skin.P['color.halo'], QUIET_DAY[0].skin.P['color.halo'], 'day has a light halo');
});

test('the unknown side is never drawn in a side colour, in any of the six skins', () => {
  for (const s of ALL) { const P = s.skin.P; assert.notEqual(P['color.unknown'], P['color.union'], s.id); assert.notEqual(P['color.unknown'], P['color.confederate'], s.id); assert.notEqual(P['color.union'], P['color.confederate'], s.id); }
});

test('a crowd standard names its formation whole: no formation name reaches the map with the ellipsis of the data (25 of 157 labels have one), and it reads as the own mark of the formation does', async () => {
  const { formationName } = await import('../src/layout/tiles.mjs'); const e = makeEngine({}); let n = 0; let cut = 0;
  for (const u of e.battle.units.values()) {
    if (!['brigade', 'battalion', 'division', 'corps'].includes(u.kind)) continue; const f = formationName(e.battle, u.id); if (f === null) continue; n++; if ((u.label || '').includes('…')) cut++;
    assert.ok(!f.includes('…'), `${u.id}: ${f}`); assert.equal(f, compactName(u), `${u.id}: the crowd says "${f}", its own mark "${compactName(u)}"`);
  }
  assert.ok(n > 100 && cut === 25, `formations ${n}, with a cut label ${cut}`);
});

test('compactName: the ellipsis of the data never reaches the map, and a name is never the code', () => {
  let named = 0; let withEllipsis = 0;
  for (const u of dataset.units) {
    if ((u.label || '').includes('…')) withEllipsis++;
    const n = compactName(u); if (n === null) continue; named++;
    assert.ok(!n.includes('…'), `${u.id}: ${n}`); assert.notEqual(n, u.short, u.id); assert.ok(!/\([^)]*\)\s*$/.test(n), `${u.id}: a trailing parenthesis survived: ${n}`);
  }
  assert.equal(withEllipsis, 122, 'the data has 122 truncated labels (03-data-fuel.md); if this moves the data changed');
  assert.ok(named > 300);
  const iron = dataset.units.find((u) => u.id === 'U-I-1-1'); assert.ok(compactName(iron));
});

test('the footprint: positive, grows with detail and selection, holds its own parts', () => {
  const P = QUIET_NIGHT[0].skin.P; const spec = makeSpec({ ...FOOT }, (id) => ({ 'layout.gapPx': 1, 'layout.dMaxPx': 64, 'layout.bandPx': 12, 'layout.relaxPxPerSec': 20, 'layout.splitDwellMs': 900, 'layout.labelShowDelayMs': 200, 'layout.labelCooldownMs': 600, 'layout.labelMinZoom': 12, 'layout.kCap': 60, 'layout.pinProtect': true, 'layout.labels': false, 'layout.maxSplitTries': 3, 'layout.continuityPx': 10 }[id]), TEXT);
  const info = (u) => ({ flag: ['brigade', 'division', 'corps', 'army'].includes(u.kind), side: u.side, short: u.short, name: compactName(u), idOnly: !u.inOob, count: null, ech: u.kind === 'brigade' ? 1 : u.kind === 'division' ? 2 : u.kind === 'corps' ? 3 : 0 });
  let checked = 0;
  for (const u of dataset.units) {
    const I = info(u); let prev = 0;
    for (const z of [11, 12.5, 13.5, 14.5, 15.5, 16.5]) {
      const p = plan(spec, P, I, z, false); assert.ok(p.w > 0 && p.h >= 18, `${u.id} z${z}`); assert.ok(p.w + 1e-9 >= p.bodyW + 2 * spec.ring, `${u.id}: width holds the body`);
      assert.ok(p.w + 0.01 >= prev, `${u.id}: footprint shrank from z${z - 1}`); prev = p.w; checked++;
      const sel = plan(spec, P, I, z, true); assert.ok(sel.w >= p.w, `${u.id}: selected is never smaller`);
      if (!I.flag) { const minimum = P['pip.size'] + 2 * spec.ring; assert.ok(p.w >= minimum - 1e-9, `${u.id}: the pip fits`); }
    }
    const far = plan(spec, P, I, 16.5, false); const near = plan(spec, P, I, 11, false); if (I.name && !I.flag) assert.ok(far.w > near.w, `${u.id}: the name grows the mark`);
  }
  assert.ok(checked > 2800);
  const agg = plan(spec, P, { flag: true, side: 'mixed', short: 'Both sides', name: null, idOnly: false, count: '27', ech: 0, generic: true, agg: true }, 15, false); assert.ok(agg.numW > 0 && agg.flagW >= P['flag.w'], 'a two-digit count widens the flag');
  // POLISH 1: the armies face each other, and the box hangs from the true position (the pip, the foot of the staff)
  for (const [kind, flag] of [['regiment', false], ['brigade', true]]) {
    const mk = (side) => ({ flag, side, short: '71 PA', name: flag ? "Harrow's Bde" : '71st Pennsylvania Infantry', idOnly: false, count: null, ech: flag ? 1 : 0 });
    for (const z of [13.5, 16.5]) { const u = plan(spec, P, mk('union'), z, false); const c = plan(spec, P, mk('confederate'), z, false);
      assert.equal(u.w, c.w, `${kind} z${z}: the two armies reserve the same width`); assert.ok(u.dx > 0 && c.dx < 0 && Math.abs(u.dx + c.dx) < 1e-9, `${kind} z${z}: Union hangs to the right of its place, Confederate to the left: ${u.dx} ${c.dx}`);
      assert.ok(Math.abs(u.dx) <= u.w / 2, `${kind}: the true position lies inside the box`); assert.equal(u.sgn, 1); assert.equal(c.sgn, -1); }
  }
  assert.ok(plan(spec, P, { flag: true, side: 'confederate', short: 'x', name: 'x', count: null, ech: 1 }, 15, false).dy < -5, 'the box of a standard hangs above the foot of its staff');
  const noName = plan(spec, P, { flag: false, side: 'union', short: '71 PA', name: '71st Pennsylvania Infantry', idOnly: false, count: null, ech: 0 }, 16.5, false); const code = plan(spec, P, { flag: false, side: 'union', short: '71 PA', name: '71st Pennsylvania Infantry', idOnly: false, count: null, ech: 0 }, 13.5, false);
  assert.ok(noName.showName && noName.codeW === 0 && code.codeW > 0 && !code.showName, 'the full name replaces the code: they are never printed side by side');
});

test('the legend: one short sentence per drawn value, each with a legal evidence label', () => {
  for (const s of QUIET_NIGHT) {
    const rows = s.legend(); assert.ok(rows.length >= 17, `${s.id}: ${rows.length} rows`);
    for (const r of rows) { assert.ok(r.text.length > 6 && r.text.length <= 84, `${r.text.length}: ${r.text}`); assert.ok([...EVIDENCE, 'Design'].includes(r.evidence), r.evidence); assert.ok(!/:\s.*:\s/.test(r.text) || r.text.length < 80, r.text); }
  }
  for (const k of ['side', 'arm', 'fix', 'strength', 'aggregate', 'idOnly', 'selection', 'pin', 'echelon']) assert.ok(CHANNELS[k], k);
});

test('the engine with this skin\'s footprints: zero overlaps and zero unrepresented units over real frames', () => {
  for (const [zoom, tick, sel] of [[13.5, 551, null], [15, 556, null], [16.5, 551, 'U-71PA'], [15.5, 295, 'C-53VA'], [12.5, 226, null]]) {
    const e = makeEngine({ start: { tick, lat: 39.8117, lng: -77.2347, zoom }, viewport: { w: 1440, h: 900 } });
    for (const s of ALL) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
    e.tuning.set('layout.labels', false); if (sel) e.select(sel);
    let overlaps = 0; let unrep = 0; let frames = 0;
    for (let i = 0; i < 90; i++) { const f = e.step(16.667); frames++; overlaps += f.overlaps || 0; unrep += f.unrepresented || 0; }
    assert.equal(overlaps, 0, `z${zoom} t${tick}: overlaps`); assert.equal(unrep, 0, `z${zoom} t${tick}: unrepresented`); assert.ok(frames === 90);
    const f = e.frame; assert.ok(f.tiles.length > 50, 'tiles exist');
    if (sel) { const t = f.tiles.find((q) => q.ids.includes(sel) && q.kind === 'leaf'); assert.ok(!t || t.w > FOOT.ring * 2 + 11, 'the selected mark grew'); }
  }
});

test('the pip stands on the true position of its unit (the foot of the staff on that of a formation), at rest and while a name grows, and Confederate marks read right to left', () => {
  const P = QUIET_NIGHT[0].skin.P; const R = FOOT.ring;
  for (const [zoom, tick] of [[13.5, 551], [15.5, 346], [16.5, 551]]) {
    const e = makeEngine({ start: { tick, lat: 39.8117, lng: -77.2347, zoom }, viewport: { w: 1440, h: 900 } });
    for (const s of ALL) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer'); e.tuning.set('layout.labels', false);
    for (let i = 0; i < 120; i++) e.step(16.667);
    let n = 0; let worst = 0; let right = 0; let left = 0;
    for (const t of e.frame.tiles) {
      if (t.life !== 'live' || t.kind !== 'leaf' || t.displaced || t.opacity < 0.99 || t.entering) continue;
      const sgn = t.side === 'confederate' ? -1 : 1; const near = ['brigade', 'division', 'corps', 'army'].includes(t.unit.kind) ? R + 1 : R + P['pip.size'] / 2; const pip = t.x - sgn * (t.w / 2 - near); worst = Math.max(worst, Math.abs(pip - t.ax)); n++; if (sgn > 0) right++; else left++;
    }
    assert.ok(n > 15, `z${zoom}: ${n} undisplaced marks`); assert.ok(worst <= 1.5 + 1e-6, `z${zoom}: a mark that is not displaced stands ${worst} px from its true position (the engine calls 1.5 px displaced)`); assert.ok(right > 0 && left > 0, 'both armies on the field');
  }
  // a selected unit grows its name from zoom 15: the box widens, the pip does not move
  const e = makeEngine({ start: { tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16 }, viewport: { w: 1440, h: 900 } });
  for (const s of ALL) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer'); e.tuning.set('layout.labels', false);
  for (let i = 0; i < 90; i++) e.step(16.667);
  const pick = e.frame.tiles.find((t) => t.life === 'live' && t.kind === 'leaf' && !t.displaced && t.opacity > 0.99 && t.unit && t.unit.id === 'C-53VA') || e.frame.tiles.find((t) => t.life === 'live' && t.kind === 'leaf' && !t.displaced && t.opacity > 0.99 && t.side === 'confederate');
  assert.ok(pick, 'a Confederate leaf'); const id = pick.ids[0]; let worst = 0; let w0 = null; let w1 = 0;
  for (let i = 0; i < 80; i++) { if (i === 5) e.select(id); const f = e.step(16.667); const t = f.tiles.find((q) => q.life === 'live' && q.ids[0] === id && q.kind === 'leaf'); if (!t) continue; if (w0 === null) w0 = t.w; w1 = t.w; if (!t.displaced) worst = Math.max(worst, Math.abs(t.x + (t.w / 2 - (R + P['pip.size'] / 2)) - t.ax)); }
  assert.ok(w1 > w0 + 3, `the box grew (${w0} to ${w1})`); assert.ok(worst < 0.05, `the pip moved ${worst} px while the name grew`);
});

test('aggregates name only what their members share: both sides, a formation, or the corps they belong to', () => {
  const e = makeEngine({ start: { tick: 556, lat: 39.8117, lng: -77.2347, zoom: 13.5 }, viewport: { w: 1440, h: 900 } });
  for (const s of ALL) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer'); e.tuning.set('layout.labels', false);
  for (let i = 0; i < 40; i++) e.step(16.667);
  const aggs = e.frame.tiles.filter((t) => t.kind === 'agg' && t.life === 'live'); assert.ok(aggs.length > 10, 'aggregates exist at the opening zoom');
  for (const a of aggs) {
    assert.ok(/^\d+$/.test(a.badge), 'the badge is the plain count: ' + a.badge); assert.equal(+a.badge, a.n);
    assert.ok(a.side !== 'mixed' || (a.nSides.union > 0 && a.nSides.confederate > 0), 'a standard says both sides only for Union and Confederate units');
    if (a.side === 'mixed') assert.equal(a.short, 'Both sides');
    else if (a.nameKind === 'scope') { assert.ok(/^(Union|Confederate|Side unknown|(I|II|III|IV|V|VI|XI|XII)(, (I|II|III|IV|V|VI|XI|XII))*? Corps|\d+ corps)$/.test(a.short), 'scope name: ' + a.short); assert.ok(a.ftail === null || /^(, \d+ unlisted|, unlisted)?(, \d+ contested)?$/.test(a.ftail), 'scope tail: ' + a.ftail); }
    assert.ok(!/Contact|\+\d+$/.test(a.short) && !/Contact|\+\d+$/.test(a.ftail || ''), a.short);
  }
});

test('contrast: the colour tests on the real ground (tools/contrast.mjs) found no failure, when they have been run', { skip: !fs.existsSync(path.join(PROTO, 'results', 'contrast.json')) }, () => {
  const r = JSON.parse(fs.readFileSync(path.join(PROTO, 'results', 'contrast.json'), 'utf8')); assert.equal(r.fails, 0);
  for (const [id, v] of Object.entries(r.skins)) { assert.ok(v.worstText.ratio >= 4.5, `${id}: lettering ${v.worstText.ratio}`); assert.ok(v.worstMark.ratio >= 3, `${id}: marks ${v.worstMark.ratio}`); assert.ok(v.sides.minDeltaE >= 20, `${id}: sides ${v.sides.minDeltaE}`); }
});
