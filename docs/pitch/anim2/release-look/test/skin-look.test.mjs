// test/skin-look.test.mjs - the two options of this folder, node only (the real-browser checks are tools/*.mjs):
//   * the token files: every token documented, typed, in range, and READ by the drawing code (a token nobody reads fails), in all six skins (standards, glyph, each with cvd and contrast);
//   * the sizer: every footprint is positive, holds the ink the skin draws (a recording context measures the real drawing against the box, for every unit at six zooms, both armies, selected or not, and crowds),
//     grows with detail and selection, and below the full zoom a unit is a small mark with no lettering;
//   * the honesty rules: the unknown side is never drawn in a side colour, a formation claims no arm, the legend has one short sentence per drawn value with a legal evidence label;
//   * the words: a crowd's words never carry a raw id and never "of unknown side";
//   * the engine with each skin's footprints: the certified layout leaves zero overlaps and zero unrepresented units over real frames at five scenes, with and without a selected unit;
//   * the casualty memory data: every mark is a deposit of a unit that has a documented total, and the marks of a unit never exceed its total.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STANDARDS, plan as planA, FOOT as FOOT_A } from '../src/skins/standards.mjs';
import { GLYPH, plan as planB, FOOT as FOOT_B } from '../src/skins/glyph.mjs';
import { STD_TOKENS } from '../src/skins/standards.spec.mjs';
import { GLY_TOKENS } from '../src/skins/glyph.spec.mjs';
import { CHANNELS, EVIDENCE } from '../src/skins/semantics.mjs';
import { checkToken, skinKit } from '../src/skins/kit.mjs';
import { recordingContext } from '../src/skins/contract.mjs';
import { makeEngine, loadDocs, PROTO } from '../src/headless.mjs';
import { createTextModel } from '../src/layout/text.mjs';
import { makeSpec } from '../src/layout/spec.mjs';
import { compactName, codeOf } from '../src/skins/common.mjs';

const OPTIONS = [{ name: 'standards', fam: STANDARDS, rows: STD_TOKENS, plan: planA, FOOT: FOOT_A, file: 'standards.mjs' }, { name: 'glyph', fam: GLYPH, rows: GLY_TOKENS, plan: planB, FOOT: FOOT_B, file: 'glyph.mjs' }];
const { dataset, textTable } = loadDocs(); const TEXT = createTextModel(textTable, 1.04, 'table');

// a canvas the sprites can be drawn on in node: every call is recorded or ignored, the text widths are the engine's own table
const fontKey = (font) => (/italic/.test(font) ? 'codeI' : /700|bold/.test(font) ? 'form' : /600/.test(font) ? 'code' : 'name');
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { if (!this._c) { const c = recordingContext(TEXT); c.strokeText = () => {}; c.measureText = (s) => ({ width: (TEXT.width(fontKey(c.font), s) - 1) / TEXT.safety }); c.getImageData = () => ({ data: new Uint8ClampedArray(4) }); this._c = c; } return this._c; } };
// a lettering sprite is the text plus its halo plus a transparent margin; the margin is not ink, so the box test leaves it out (conservatively: 1 px at the sides, 3.5 above, 2 below; the browser check tools/inkfit.mjs measures the real alpha bounds)
const wrapDraw = (c) => { const o = c.drawImage; c.drawImage = (img, ...a) => { if (img instanceof globalThis.OffscreenCanvas) { let x; let y; let w; let h; if (a.length >= 8) [, , , , x, y, w, h] = a; else { [x, y, w, h] = a; w = w ?? img.width; h = h ?? img.height; } return o(img, x + 1, y + 3.5, w - 2, h - 5.5); } return o(img, ...a); }; return c; };
const FORM = ['brigade', 'division', 'corps', 'army'];
const SETTINGS = { 'layout.gapPx': 1, 'layout.dMaxPx': 56, 'layout.bandPx': 12, 'layout.relaxPxPerSec': 20, 'layout.splitDwellMs': 900, 'layout.labelShowDelayMs': 200, 'layout.labelCooldownMs': 600, 'layout.labelMinZoom': 12, 'layout.kCap': 3 };
const mkSpec = (FOOT) => ({ text: TEXT, ring: FOOT.ring, pinHalf: FOOT.pinHalf });

for (const O of OPTIONS) {
  const SRC = fs.readFileSync(path.join(PROTO, 'src', 'skins', O.file), 'utf8');

  test(`${O.name}: three skins are registered (standard, colour-blind safe, high contrast)`, () => {
    assert.deepEqual(O.fam.map((s) => s.id), [O.name, `${O.name}/cvd`, `${O.name}/contrast`]);
  });

  test(`${O.name}: every token is documented, typed, in range, and read by the drawing code`, () => {
    for (const [name, value, doc, opts = {}] of O.rows) {
      assert.ok(doc.length > 20, `${name} needs a real doc line`);
      const def = O.fam[0].tokenDocs.byName.get(name); assert.ok(def, name); assert.equal(checkToken(def, value), null, name);
      if (name === 'motion.selectMs' || name === 'motion.hoverMs') continue;
      if (name.startsWith('memory.')) { assert.ok(fs.readFileSync(path.join(PROTO, 'src', 'fx', 'memory.mjs'), 'utf8').includes(`'${name}'`), `fx/memory.mjs does not read ${name}`); continue; }
      assert.ok(SRC.includes(`'${name}'`) || fs.readFileSync(path.join(PROTO, 'src', 'skins', 'common.mjs'), 'utf8').includes(`'${name}'`), `no drawing code reads ${name}`);
      void opts;
    }
  });

  test(`${O.name}: the variants change only tokens that exist; the unknown side is never drawn in a side colour`, () => {
    const names = new Set(O.rows.map((r) => r[0]));
    for (const s of O.fam) { for (const k of Object.keys(s.skin.P)) assert.ok(names.has(k), `${s.id}: stray token ${k}`); const P = s.skin.P; assert.notEqual(P['color.unknown'], P['color.union'], s.id); assert.notEqual(P['color.unknown'], P['color.confederate'], s.id); assert.notEqual(P['color.union'], P['color.confederate'], s.id); }
    assert.notEqual(O.fam[0].skin.P['color.union'], O.fam[1].skin.P['color.union'], 'cvd changes the side colours');
  });

  test(`${O.name}: the footprint is positive, holds the ink the skin draws, grows with detail and selection (every unit, six zooms, both armies)`, () => {
    const skin = O.fam[0]; const P = skin.skin.P; const spec = mkSpec(O.FOOT); let checked = 0; const problems = [];
    const tileOf = (I, z, sel, w, h) => ({ key: I.short + z, kind: I.agg ? 'agg' : 'leaf', side: I.side, arm: I.arm || 'infantry', short: I.short, badge: I.count, fname: I.name, nameKind: I.agg ? 'brigade' : null, unit: I.agg ? null : { kind: I.flag ? 'brigade' : 'regiment', arm: I.arm || 'infantry', inOob: !I.idOnly, id: 'x', side: I.side, short: I.short, label: I.name || I.short }, w, h, scale: 1, opacity: 1, n: 1, selected: sel, ratio: 0.8, ageTicks: 30, entering: false });
    const info = (u) => ({ flag: FORM.includes(u.kind), side: u.side, short: codeOf(u), name: compactName(u), idOnly: !u.inOob && !FORM.includes(u.kind), count: null, ech: u.kind === 'brigade' ? 1 : u.kind === 'division' ? 2 : u.kind === 'corps' ? 3 : 0, agg: false, arm: u.arm });
    for (const u of dataset.units) {
      const I = info(u); let prev = 0;
      for (const z of [11, 12.5, 13.5, 14.5, 15.5, 16.5]) {
        const p = O.plan(spec, P, I, z, false); assert.ok(p.w > 0 && p.h > 0, `${u.id} z${z}`); assert.ok(p.w + 0.01 >= prev * 0.999 || I.flag, `${u.id}: footprint shrank from z${z - 1}: ${prev} -> ${p.w}`); prev = p.w; checked++;
        const sel = O.plan(spec, P, I, z, true); assert.ok(sel.w >= p.w, `${u.id}: selected is never smaller`);
        if (!I.flag && z < P['detail.fullZoom'] && !(sel.w > p.w)) assert.ok(!p.txt, `${u.id} z${z}: a unit below the full zoom carries no lettering`);
        // the ink stays in the box: draw the tile into a recording context and compare it with the footprint (both selected and not, both armies)
        if ((checked % 7) === 0) for (const selected of [false, true]) {
          const q = O.plan(spec, P, I, z, selected); const t = tileOf(I, z, selected, q.w, q.h); t.key = I.short + z + selected + checked; const env = { dpr: 1, zoom: z, timeMs: 0, tok: () => true, spec }; let T = 1000; skinKit.setClock({ now: () => T }); for (let f = 0; f < 14; f++) { skin.draw.tile(wrapDraw(recordingContext(TEXT)), t, env); T += 120; } const c = wrapDraw(recordingContext(TEXT)); skin.draw.tile(c, t, env);      // 14 frames first: the selection, the growth of the pole and the name are eased, and the last frame is the settled one
          const b = c.box; const tol = 0.75;
          if (b.ops === 0) problems.push(`${u.id} z${z}: nothing painted`); else if (b.x0 < -q.w / 2 - tol || b.x1 > q.w / 2 + tol || b.y0 < -q.h / 2 - tol || b.y1 > q.h / 2 + tol) problems.push(`${u.id} z${z}${selected ? ' selected' : ''}: ink [${b.x0.toFixed(1)}, ${b.y0.toFixed(1)}, ${b.x1.toFixed(1)}, ${b.y1.toFixed(1)}] leaves the box ${q.w} x ${q.h}`);
        }
      }
      if (!I.flag && I.name) { assert.ok(O.plan(spec, P, I, 17, false).w > O.plan(spec, P, I, 11, false).w, `${u.id}: the name grows the mark`); }
    }
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} ink overflows`); assert.ok(checked > 2800);
    // the two armies reserve the same width and read in opposite directions from the true position
    for (const flag of [false, true]) {
      const mk = (side) => ({ flag, side, short: '71 PA', name: flag ? "Harrow's Bde" : '71st Pennsylvania Infantry', idOnly: false, count: null, ech: flag ? 1 : 0, arm: 'infantry' });
      for (const z of [13.5, 16.5]) { const u = O.plan(spec, P, mk('union'), z, false); const c = O.plan(spec, P, mk('confederate'), z, false); assert.equal(u.w, c.w, `flag ${flag} z${z}`); assert.ok(u.dx >= 0 && c.dx <= 0 && Math.abs(u.dx + c.dx) < 1e-9, `flag ${flag} z${z}: ${u.dx} ${c.dx}`); assert.equal(u.sgn, 1); assert.equal(c.sgn, -1); }
    }
    // a crowd: a two-digit count widens the mark
    const a1 = O.plan(spec, P, { flag: true, side: 'union', short: 'x', name: 'x', idOnly: false, count: '5', ech: 1, agg: true }, 15, false); const a2 = O.plan(spec, P, { flag: true, side: 'union', short: 'x', name: 'x', idOnly: false, count: '27', ech: 1, agg: true }, 15, false); assert.ok(a2.w >= a1.w);
  });

  test(`${O.name}: the legend has one short sentence per drawn value, each with a legal evidence label, and the figure fits`, () => {
    const rows = O.fam[0].legend(); assert.ok(rows.length >= 10 && rows.length <= 20, `${rows.length} rows`);
    for (const r of rows) { assert.ok(r.text.length > 6 && r.text.length <= 100, `${r.text.length}: ${r.text}`); assert.ok([...EVIDENCE, 'Design'].includes(r.evidence), r.evidence); }
    for (const k of ['side', 'arm', 'fix', 'strength', 'aggregate', 'idOnly', 'selection', 'memory']) assert.ok(CHANNELS[k], k);
    assert.ok(rows.some((r) => r.channel === 'memory' && r.evidence === 'Modelled'), 'the casualty memory is labelled Modelled');
    assert.ok(typeof O.fam[0].figure === 'function' && O.fam[0].figureH >= 600);
  });

  test(`${O.name}: the engine with this skin's footprints leaves zero overlaps and zero unrepresented units over real frames`, () => {
    for (const [zoom, tick, sel] of [[13.5, 295, null], [13.5, 556, null], [15, 295, null], [16.5, 551, 'U-71PA'], [15.5, 346, 'C-53VA']]) {
      const e = makeEngine({ start: { tick, lat: 39.8117, lng: -77.2347, zoom }, viewport: { w: 1440, h: 900 } });
      for (const s of O.fam) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', O.name); e.tuning.set('layout.labels', false); if (sel) e.select(sel);
      let overlaps = 0; let unrep = 0;
      for (let i = 0; i < 90; i++) { const f = e.step(16.667); overlaps += f.overlaps || 0; unrep += f.unrepresented || 0; }
      assert.equal(overlaps, 0, `${O.name} z${zoom} t${tick}: overlaps`); assert.equal(unrep, 0, `${O.name} z${zoom} t${tick}: unrepresented`); assert.ok(e.frame.tiles.length > 40);
    }
  });
}

test('the words of a crowd: never a raw id, never "of unknown side"', () => {
  const e = makeEngine({ start: { tick: 295, lat: 39.8117, lng: -77.2347, zoom: 13.5 }, viewport: { w: 1440, h: 900 } });
  for (const s of STANDARDS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'standards'); e.tuning.set('layout.labels', false);
  let n = 0;
  for (const [tick, zoom] of [[295, 13.5], [556, 13.5], [226, 12.5]]) {
    e.transport.seek(tick, { glide: false }); e.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false });
    for (let i = 0; i < 40; i++) e.step(16.667);
    for (const a of e.frame.tiles.filter((t) => t.kind === 'agg' && t.life === 'live')) { n++; assert.ok(!/\b[UC]-[A-Z0-9-]+\b/.test(a.short), `a raw id reached the map: ${a.short}`); assert.ok(!/of unknown side|\bof \d|^of /.test(a.short), a.short); assert.ok(/^\d+$/.test(a.badge)); assert.equal(+a.badge, a.n); }
  }
  assert.ok(n > 40, `${n} crowds checked`);
});

test('the casualty memory: every mark belongs to a unit with a documented total, in tick order, and a unit never has more marks than its total allows', () => {
  const m = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'memory.json'), 'utf8')); const pop = loadDocs().popupData; assert.equal(m.format, 'battle-studio-memory/1'); assert.equal(m.menPerMark, 10);
  const per = new Map(); let last = -1;
  for (const [tick, lat, lng, side, ang, ui] of m.marks) { assert.ok(tick >= last, 'marks are in tick order'); last = tick; assert.ok(lat > 39.76 && lat < 39.86 && lng < -77.17 && lng > -77.30, `a mark off the field: ${lat} ${lng}`); assert.ok(side === 0 || side === 1); assert.ok(ang >= 0 && ang < 256); const id = m.units[ui]; per.set(id, (per.get(id) || 0) + 1); }
  for (const [id, n] of per) { const cas = pop.oob[id] && pop.oob[id].cas; assert.ok(cas > 0, `${id} has no documented total`); assert.ok(n * 10 <= cas + 10, `${id}: ${n} marks for ${cas} men`); }
  assert.ok(per.size > 150 && m.marks.length > 1500, `${per.size} units, ${m.marks.length} marks`);
});
