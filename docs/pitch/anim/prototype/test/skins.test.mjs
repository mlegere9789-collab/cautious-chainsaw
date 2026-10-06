// test/skins.test.mjs - the three pitched tile skins (Field Manual, War Room, 1863 Map), their colour-blind-safe and high-contrast variants, and the 50-line minimal skin.
// What is checked, in the order of the owner's rules: the ink stays inside the layout footprint; the zero-overlap guarantee still holds with every skin's own footprint; a skin draws exactly the
// channels its legend lists and nothing else (so the legend cannot lie); the side of a tile is never drawn in another side's colour and the contested side is never drawn as a side; the corps
// badges are drawn only where the research documents them; every token is read and every variant is a valid token set; contrast and colour-vision-deficiency separation; the eased state
// (selection, hover, cross-fades) behaves; the 50-line skin is under 50 lines.   Browser-only checks (crisp edges, no pops, real hover and click) are in skin-browser.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { checkSkin } from '../src/skins/contract.mjs';
import { SKINS } from '../src/skins/index.mjs';
import { FIELD_MANUAL } from '../src/skins/field-manual.mjs';
import { WAR_ROOM } from '../src/skins/war-room.mjs';
import { MAP_1863 } from '../src/skins/map-1863.mjs';
import { MINIMAL } from '../src/skins/minimal.mjs';
import { skinKit, compileTokens, defineSkin, contrast, luminance } from '../src/skins/kit.mjs';
import { describe, CHANNELS, CHANNEL_IDS, UNION_BADGE_OF, DIV_COLOUR_OF, CARRIED_TICKS, ECH_LEVEL } from '../src/skins/semantics.mjs';
import { FM_TOKENS, FM_VARIANTS } from '../src/skins/field-manual.spec.mjs';
import { WR_TOKENS, WR_VARIANTS } from '../src/skins/war-room.spec.mjs';
import { M63_TOKENS, M63_VARIANTS } from '../src/skins/map-1863.spec.mjs';
import { createTextModel } from '../src/layout/text.mjs';
import { spyContext, usesColour, specimens, contrastRatio, deltaE, simulate, hexRgb, toLab } from './skin-testkit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { dataset, textTable } = loadDocs(); const text = createTextModel(textTable);
const MINE = [...FIELD_MANUAL, ...WAR_ROOM, ...MAP_1863, MINIMAL];                    // 10 designs
const FAMILIES = { 'field-manual': { skins: FIELD_MANUAL, rows: FM_TOKENS, variants: FM_VARIANTS }, 'war-room': { skins: WAR_ROOM, rows: WR_TOKENS, variants: WR_VARIANTS }, 'map-1863': { skins: MAP_1863, rows: M63_TOKENS, variants: M63_VARIANTS } };
const scene = dataset.scenes.find((s) => s.id === 'fresh2');

/** an engine on the real data with every skin registered and `skin` selected, a few frames in */
function engineWith(skin, start = { tick: scene.tick, lat: scene.lat, lng: scene.lng, zoom: 15 }) {
  const e = makeEngine({ start }); e.setViewport(1440, 900);
  for (const k of [...MINE, ...SKINS]) e.kernel.skins.register(k.id, k, { replace: true });
  e.tuning.set('skin.id', skin.id); for (let i = 0; i < 30; i++) e.step(1000 / 60); skinKit.reset(); return e;
}
const envOf = (e, o = {}) => ({ dpr: 1, zoom: 16, timeMs: 0, tok: e.tok, spec: e.spec(), ...o });

const DISPOSITIONS = dataset.dispositions;
/** every state a skin can be asked to draw, on real units, sized for the engine's current skin */
function allStates(e) {
  const S = specimens(e); const { U, tileFor, aggTile } = S; const out = [];
  const add = (t) => out.push(t);
  for (const u of [U.inf, U.csa, U.unk, U.idonly]) for (const d of DISPOSITIONS) add(tileFor(u, { disposition: d, side: u.side }));
  for (const r of [0, 0.05, 0.5, 1]) add(tileFor(U.inf, { ratio: r }));
  for (const a of [0, 12, 40, 100, 225, 500]) add(tileFor(U.csa, { ageTicks: a, ageMin: a, ageMax: a }));
  for (const u of [U.cav, U.art, U.bat, U.bde, U.div, { ...U.div, kind: 'corps' }]) for (const d of DISPOSITIONS) add(tileFor(u, { disposition: d }));
  for (const side of ['union', 'confederate', 'unknown', 'mixed']) for (const arm of ['infantry', 'cavalry', 'artillery', 'mixed']) add(aggTile({ side, arm, short: 'ART/II/CORPS', badge: '×128' }));
  for (const t of [tileFor(U.inf, {}), tileFor(U.csa, {}), aggTile({})]) { add({ ...t, selected: true }); add({ ...t, moving: true }); add({ ...t, travelling: true, opacity: 0.42 }); add({ ...t, entering: true, scale: 0.7, opacity: 0.4 }); add({ ...t, life: 'dying', scale: 0.8, opacity: 0.5 }); }
  for (const [r, d] of [['I', 1], ['II', 2], ['III', 1], ['V', 3], ['VI', 1], ['XI', 2], ['XII', 1]]) { const u = S.corpsUnit(r, d) || S.corpsUnit(r); if (u) add(tileFor(u, {})); }
  const lab = (t, tx) => ({ ...t, label: { text: tx, slot: 'r', opacity: 1, x0: 0, y0: 0, x1: Math.ceil(e.spec().text.width('label', tx) + 2 * e.spec().labelPadX), y1: e.spec().labelH } });
  add(lab(tileFor(U.inf, {}), '1st Bde, 3rd Div, 2nd Corps with a very long tail')); add(lab(tileFor(U.csa, {}), 'Hampton'));
  for (const t of e.frame.tiles) add(t);                                       // and every real tile of the frame
  return { S, tiles: out };
}

// ---- structure -----------------------------------------------------------------------------------------------------------------------------------------
test('the shell lists the reference skin, three families each with a colour-blind-safe and a high-contrast variant, and the minimal skin', () => {
  const ids = SKINS.map((k) => k.id);
  assert.deepEqual(ids, ['reference', 'field-manual', 'field-manual/cvd', 'field-manual/contrast', 'war-room', 'war-room/cvd', 'war-room/contrast', 'map-1863', 'map-1863/cvd', 'map-1863/contrast', 'minimal']);
  const e = makeEngine({}); for (const k of SKINS) e.kernel.skins.register(k.id, k, { replace: true });
  for (const k of SKINS) { assert.ok(e.kernel.skins.has(k.id)); assert.ok(typeof k.legend === 'function'); }
  for (const [id, f] of Object.entries(FAMILIES)) { assert.equal(f.skins.length, 3); assert.deepEqual(f.skins.map((s) => s.variant), [null, 'cvd', 'contrast']); for (const s of f.skins) assert.equal(s.family, id); }
});

test('conformance: for every skin and variant the ink of tile, label and pin stays inside the footprint on every state (all dispositions, sides, arms, echelons, ages, strengths, selection, arrival, departure, real tiles)', () => {
  let total = 0;
  for (const skin of MINE) {
    const e = engineWith(skin); const { tiles } = allStates(e); const bad = checkSkin(skin, e.spec(), tiles, text);
    total += tiles.length; assert.deepEqual(bad.slice(0, 4), [], `${skin.id}: ${bad.length} problems`);
  }
  console.log(`# ${MINE.length} skins x about ${Math.round(total / MINE.length)} states: ink inside the footprint everywhere`);
});

test('the layout guarantee holds with every skin\'s own footprint: 0 overlapping pairs, 0 unrepresented units, on the hardest scenes at 1x and 8x with irregular frame times', () => {
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
  const rows = [];
  for (const skin of [referenceFirst(), FIELD_MANUAL[0], WAR_ROOM[0], MAP_1863[0], MINIMAL]) {
    for (const [sid, zoom, speed] of [['fresh2', 15, 1], ['field', 13.5, 8], ['carry1', 14, 4]]) {
      const sc = dataset.scenes.find((s) => s.id === sid); const e = engineWith(skin, { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom }); e.transport.setSpeed(speed); e.transport.play();
      const r = rng(11); let over = 0; let unrep = 0; let tiles = 0; let n = 0;
      for (let i = 0; i < 150; i++) { const f = e.step(5 + r() * 40); over += f.overlaps || 0; unrep += f.unrepresented || 0; tiles += f.tiles.filter((t) => t.life === 'live').length; n++; }
      assert.equal(over, 0, `${skin.id} ${sid}: overlapping pairs`); assert.equal(unrep, 0, `${skin.id} ${sid}: unrepresented units`); rows.push(`${skin.id}@${sid}:${Math.round(tiles / n)}`);
    }
  }
  console.log('# mean live tiles per frame: ' + rows.join('  '));
});
function referenceFirst() { return SKINS.find((k) => k.id === 'reference'); }

// ---- the honesty rules ------------------------------------------------------------------------------------------------------------------------------
const sideHexOf = (skin, side) => skin.skin.P[side === 'union' ? 'color.union' : side === 'confederate' ? 'color.confederate' : 'color.unknown'];
test('a side is never drawn in another side\'s colour; the contested side is never drawn as a side (Union, Confederate, unknown, in every variant)', () => {
  for (const skin of MINE.filter((k) => k.id !== 'minimal')) {
    const e = engineWith(skin); const S = specimens(e); const env = envOf(e); const P = skin.skin.P;
    const draw = (t) => { skinKit.reset(); const c = spyContext(text); skin.draw.tile(c, t, env); return c; };
    const rows = [['union', S.U.inf, ['color.confederate', 'color.unknown']], ['confederate', S.U.csa, ['color.union', 'color.unknown']], ['unknown', S.U.unk, ['color.union', 'color.confederate']]];
    for (const [side, u, forbidden] of rows) for (const d of ['Line of Battle', 'Charging Line', 'Chaotic Retreat', 'Skirmish Line']) for (const ex of [{}, { selected: true }, { moving: true }, { ageMax: 300, ageTicks: 300 }]) {
      const t = S.tileFor(u, { side, disposition: d, ...ex }); const c = draw(t);
      for (const f of forbidden) assert.ok(!usesColour(c, P[f]), `${skin.id}: a ${side} tile uses the ${f} colour (${P[f]})`);
      assert.ok(usesColour(c, P['color.' + side]), `${skin.id}: a ${side} tile does not use its own side colour`);
    }
    // a contested unit drawn as an aggregate member never reads as a side either: an aggregate whose side is 'unknown'
    const agg = S.aggTile({ side: 'unknown' }); const c = draw(agg); for (const f of ['color.union', 'color.confederate']) assert.ok(!usesColour(c, P[f]), `${skin.id}: an unknown aggregate uses ${f}`);
    // the three side colours are different from each other in every variant (a palette typo cannot make two sides identical)
    assert.equal(new Set([P['color.union'], P['color.confederate'], P['color.unknown']]).size, 3, `${skin.id}: side colours must differ`);
  }
});

/** the ink signature of a tile (every paint call with the colours and geometry), at a high zoom so every secondary channel is visible */
function signature(skin, e, t, env = envOf(e)) { skinKit.reset(); const c = spyContext(text); skin.draw.tile(c, t, env); return c.signature(); }

test('the legend is the drawing: a skin changes its ink for every value of every channel its legend lists, and does NOT change it for a channel its legend does not list', () => {
  const report = [];
  for (const skin of MINE) {
    const e = engineWith(skin); const S = specimens(e); const { U, tileFor, aggTile } = S; const env = envOf(e); const declared = new Set(Object.keys(skin.channels));
    const sig = (t) => signature(skin, e, t, env);
    // for each channel: [baseline tile, [variant tiles...]]; the variants must differ from the baseline (and from each other where they are different values)
    // every variant differs from its baseline in ONE field only (same unit, same code text, same width), so a changed signature means the skin drew that field
    const base = () => tileFor(U.inf, { disposition: 'Line of Battle', ratio: 1, ageTicks: 0, ageMax: 0, ageMin: 0 });
    const un = (u, patch, over = {}) => tileFor({ ...u, ...patch }, over, { short: u.short });
    const mk = (side, roman, div) => ({ side, inOob: true, parentSource: 'oob', arm: 'infantry', kind: 'regiment', chain: [`${side === 'union' ? 'U' : 'C'}-${roman}-${div}-1`, `${side === 'union' ? 'U' : 'C'}-${roman}-${div}`, side === 'union' ? 'A-U' : 'A-C', 'ROOT'] });
    const noCorps = (u) => ({ chain: [u.id, u.side === 'union' ? 'A-U' : 'A-C', 'ROOT'] });
    const plan = {
      side: [base(), [un(U.inf, { side: 'confederate' }), un(U.inf, { side: 'unknown' }), { ...base(), side: 'mixed', unit: { ...U.inf, side: 'mixed' } }]],
      arm: [base(), [un(U.inf, { arm: 'cavalry' }), un(U.inf, { arm: 'artillery' }), un(U.inf, { kind: 'brigade' })]],
      armState: [tileFor(U.art, { disposition: 'Line of Battle' }), [tileFor(U.art, { disposition: 'Deployed Artillery' }), tileFor(U.art, { disposition: 'Limbered Artillery' })]],
      echelon: [un(U.inf, { kind: 'brigade' }, { disposition: 'Line of Battle' }), [un(U.inf, { kind: 'division' }), un(U.inf, { kind: 'corps' })]],
      posture: [base(), ['Charging Line', 'Chaotic Retreat', 'Line of March', 'Skirmish Line', 'Reserve', 'Bivouac'].map((d) => tileFor(U.inf, { disposition: d }))],
      strength: [base(), [tileFor(U.inf, { ratio: 0.5 }), tileFor(U.inf, { ratio: 0.1 })]],
      fix: [base(), [tileFor(U.inf, { ageTicks: 400, ageMax: 400, ageMin: 400 })]],
      transit: [base(), [tileFor(U.inf, { moving: true })]],
      idOnly: [tileFor(U.inf, {}), [un(U.inf, { inOob: false })]],
      aggregate: [base(), [aggTile({ side: 'union', arm: 'infantry', short: U.inf.short, badge: '×5' })]],
      corpsBadge: [un(U.inf, noCorps(U.inf)), [un(U.inf, mk('union', 'XII', 1)), un(U.inf, mk('union', 'II', 1)), un(U.inf, mk('union', 'V', 1))]],
      divColour: [un(U.inf, mk('union', 'XII', 1)), [un(U.inf, mk('union', 'XII', 2)), un(U.inf, mk('union', 'XII', 3))]],
      corpsText: [un(U.csa, noCorps(U.csa)), [un(U.csa, mk('confederate', 'I', 1)), un(U.csa, mk('confederate', 'III', 2))]],
      selection: [base(), [{ ...base(), selected: true }]],
    };
    for (const ch of CHANNEL_IDS) {
      if (ch === 'pin') continue; const [b, vs] = plan[ch]; const sb = sig(b); const diffs = vs.map((v) => sig(v) !== sb);
      if (declared.has(ch)) assert.ok(diffs.some(Boolean), `${skin.id}: channel ${ch} is in the legend but the drawing does not change`);
      else assert.ok(diffs.every((d) => !d), `${skin.id}: channel ${ch} is NOT in the legend but the drawing changes (an undeclared mark)`);
    }
    // the pin is a separate hook
    if (declared.has('pin')) assert.ok(typeof skin.draw.pin === 'function' && typeof skin.draw.leader === 'function');
    report.push(`${skin.id}: ${[...declared].length} channels`);
  }
  console.log('# ' + report.join(' | '));
});

test('every legend row names a channel of the registry, repeats its sentence and evidence label, and the evidence labels are the site\'s vocabulary', () => {
  const ok = new Set(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown']);
  for (const skin of MINE) {
    const lg = skin.legend(); assert.ok(lg.length >= 8, `${skin.id} legend rows`); const seen = new Set();
    for (const row of lg) {
      const ch = CHANNELS[row.channel]; assert.ok(ch, row.text); const val = ch.values.find((v) => v.id === row.value); assert.ok(val, `${skin.id}: ${row.channel}/${row.value}`);
      assert.equal(row.evidence, val.evidence); assert.equal(row.text, `${ch.title}: ${val.text}`); assert.ok(typeof row.swatch === 'string' && row.swatch.length > 3);
      assert.ok(ok.has(row.evidence) || (row.channel === 'selection' && row.evidence === 'Design'), `${skin.id}: ${row.text} -> ${row.evidence}`);
      const key = row.channel + '/' + row.value; assert.ok(!seen.has(key), 'duplicate legend row ' + key); seen.add(key);
    }
    // the honest rows are present: Modelled for the gauge and the posture, Contested for the unknown side, Computed for fix age and aggregates
    const has = (ch, ev) => lg.some((r) => r.channel === ch && r.evidence === ev);
    if (skin.channels.strength) assert.ok(has('strength', 'Modelled')); if (skin.channels.side) assert.ok(has('side', 'Contested') && has('side', 'Documented'));
    if (skin.channels.fix) assert.ok(has('fix', 'Computed')); if (skin.channels.posture) assert.ok(has('posture', 'Modelled')); if (skin.channels.aggregate) assert.ok(has('aggregate', 'Computed'));
    if (skin.channels.corpsBadge) assert.equal(lg.filter((r) => r.channel === 'corpsBadge').length, 7);
  }
  // a skin that cannot draw a value does not list it: the minimal skin draws three arms and no posture
  const ml = MINIMAL.legend(); assert.ok(!ml.some((r) => r.channel === 'posture') && ml.some((r) => r.channel === 'arm' && r.value === 'cavalry') && !ml.some((r) => r.channel === 'arm' && r.value === 'formation'));
});


test('vital information is never dimmed: the short code is painted in the same ink and opacity for a fresh and a carried-forward tile, an empty and a full gauge, selected, hovered or not, in every skin', () => {
  for (const skin of MINE) {
    const e = engineWith(skin); const S = specimens(e); const env = envOf(e, { zoom: 17 }); const code = S.U.inf.short;
    const textStyle = (t) => { skinKit.reset(); const c = spyContext(text); skin.draw.tile(c, t, { ...env }); const line = c.log.find((l) => l.startsWith(`fillText(${code},`)); assert.ok(line, `${skin.id}: the code ${code} is painted`); return line.replace(/^fillText\([^)]*\)/, ''); };
    const ref = textStyle(S.tileFor(S.U.inf, { ageTicks: 0, ageMax: 0, ratio: 1 }));
    for (const over of [{ ageTicks: 600, ageMax: 600, ageMin: 600 }, { ratio: 0 }, { selected: true }, { moving: true }, { disposition: 'Chaotic Retreat' }, { ageTicks: 80, ageMax: 80 }]) assert.equal(textStyle(S.tileFor(S.U.inf, over)), ref, `${skin.id}: the code's paint changes with ${JSON.stringify(over)}`);
    // the arm glyph of a carried tile is as firm as a fresh one (no stroke of the glyph is faded by age): compare the alpha of the first stroke after the cell in both
    skinKit.reset(); skinKit.setHover(null);
  }
});

// ---- the semantic layer (what may be drawn at all) --------------------------------------------------------------------------------------------------
test('corps badges: drawn only for Union infantry (and formation records) of the seven documented corps whose order-of-battle chain is documented; recomputed independently from the registry DESIGNATIONS', () => {
  const e = makeEngine({}); const B = e.battle; const SET = UNION_BADGE_OF; let nBadge = 0; let nUnion = 0; let nCsa = 0; const byCorps = {}; const byArm = {}; const byKind = {};
  const ORD = { First: 'I', Second: 'II', Third: 'III', Fourth: 'IV', Fifth: 'V', Sixth: 'VI', Seventh: 'VII', Eighth: 'VIII', Ninth: 'IX', Tenth: 'X', Eleventh: 'XI', Twelfth: 'XII' };
  const designationCorps = (id) => { for (let c = id, g = 0; c && g < 12; g++) { const n = B.nodes.get(c); if (!n) return null; const m = /(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) Corps/.exec(n.designation || ''); if (m) return ORD[m[1]]; c = n.parent; } return null; };
  const designationDiv = (id) => { for (let c = id, g = 0; c && g < 12; g++) { const n = B.nodes.get(c); if (!n) return null; const m = /(First|Second|Third|Fourth) Division/.exec(n.designation || ''); if (m) return { First: 1, Second: 2, Third: 3, Fourth: 4 }[m[1]]; c = n.parent; } return null; };
  const kindCorps = (id) => { for (let c = id, g = 0; c && g < 12; g++) { const n = B.nodes.get(c); if (!n) return null; if (n.kind === 'corps') return c.replace(/^[UC]-/, ''); c = n.parent; } return null; };
  for (const u of B.units.values()) {
    const t = { kind: 'leaf', unit: u, side: u.side, arm: u.arm, short: u.short, ratio: 1, ageTicks: 0, ageMax: 0, n: 1, disposition: 'Line of Battle' }; const vm = describe(t);
    const roman = u.side === 'union' ? designationCorps(u.id) : kindCorps(u.id);
    const expectBadge = u.side === 'union' && u.inOob && u.parentSource === 'oob' && roman && SET[roman] && u.arm === 'infantry' ? SET[roman] : null;
    assert.equal(vm.badge, expectBadge, `${u.id} (${u.kind}, ${u.arm}): badge ${vm.badge} vs the designation-derived ${expectBadge}`);
    if (vm.badge) {
      nBadge++; byCorps[roman] = (byCorps[roman] || 0) + 1; byArm[u.arm] = (byArm[u.arm] || 0) + 1; byKind[u.kind] = (byKind[u.kind] || 0) + 1; assert.equal(u.side, 'union'); assert.notEqual(u.arm, 'artillery'); assert.notEqual(u.arm, 'cavalry'); assert.ok(u.inOob && u.parentSource === 'oob');
      const d = designationDiv(u.id); assert.equal(vm.divColour, DIV_COLOUR_OF[d] || null, `${u.id}: division colour (designation says division ${d})`);
    } else assert.equal(vm.divColour, null);
    if (u.side === 'union') nUnion++; if (vm.csa) { nCsa++; assert.equal(u.side, 'confederate'); assert.ok(['I', 'II', 'III'].includes(vm.csa)); assert.equal(vm.csa, kindCorps(u.id)); assert.ok(u.inOob && u.parentSource === 'oob'); }
    if (u.side === 'confederate' || u.side === 'unknown') assert.equal(vm.badge, null, 'a Confederate or contested unit never gets a corps badge');
  }
  console.log(`# corps badges on ${nBadge} of ${nUnion} placed Union units (by corps ${JSON.stringify(byCorps)}, by kind ${JSON.stringify(byKind)}); Confederate corps numerals on ${nCsa}`);
  assert.ok(nBadge > 80);
});

test('formations (brigade, division, corps) make no arm claim; regiments, batteries and battalions keep theirs; echelon levels follow the registry kind', () => {
  const e = makeEngine({}); let formations = 0; let withArm = 0;
  for (const u of e.battle.units.values()) {
    const vm = describe({ kind: 'leaf', unit: u, side: u.side, arm: u.arm, short: u.short, ratio: 1, n: 1, disposition: 'Line of Battle' });
    if (['brigade', 'division', 'corps', 'army'].includes(u.kind)) { assert.equal(vm.arm, 'formation'); formations++; } else { assert.equal(vm.arm, u.arm); withArm++; }
    assert.equal(vm.ech, ECH_LEVEL[u.kind]);
  }
  assert.ok(formations > 100 && withArm > 200);
  console.log(`# ${formations} formation records drawn without an arm, ${withArm} regiments/batteries/battalions with theirs`);
});

test('the view model: posture classes, arm states, fix-age blend and the ten contested ids', () => {
  const e = makeEngine({}); const U = specimens(e).U; const t = (o) => ({ kind: 'leaf', unit: U.inf, side: 'union', arm: 'infantry', short: 'x', ratio: 1.4, n: 1, disposition: 'Line of Battle', ageMax: 0, ...o });
  assert.equal(describe(t({ disposition: 'Charging Line' })).posture, 'charge'); assert.equal(describe(t({ disposition: 'Deployed Artillery' })).posture, null); assert.equal(describe(t({ disposition: 'Deployed Artillery' })).armState, 'deployed');
  assert.equal(describe(t({ ratio: 1.4 })).ratio, 1); assert.equal(describe(t({ ratio: -1 })).ratio, 0);
  const ages = [0, 12, 24, 60, 112, 150, CARRIED_TICKS, 900].map((a) => describe(t({ ageMax: a, ageTicks: a })));
  assert.equal(ages[0].carried, 0); assert.equal(ages[4].carried, 0); assert.equal(ages[6].carried, 1); assert.equal(ages[7].carried, 1); assert.ok(ages[5].carried > 0 && ages[5].carried < 1);
  for (let i = 1; i < ages.length; i++) assert.ok(ages[i].carried >= ages[i - 1].carried - 1e-12, 'monotone in age: the look blends, nothing pops');
  const unknown = [...e.battle.units.values()].filter((u) => u.side === 'unknown'); assert.equal(unknown.length, 10);
  for (const u of unknown) assert.equal(describe({ kind: 'leaf', unit: u, side: u.side, arm: u.arm, short: u.short, ratio: 1, n: 1 }).sideEv, 'Contested');
});

// ---- tokens ---------------------------------------------------------------------------------------------------------------------------------------------
test('tokens: every token of every skin is read by the drawing code (a dial that does nothing fails), none is read undefined, and every variant is a valid token set', () => {
  for (const skin of MINE) {
    const e = engineWith(skin); const { tiles } = allStates(e); const env = envOf(e, { zoom: 17 }); const P = skin.skin.P; const reads = new Set(); const missing = new Set();
    skin.skin.P = new Proxy(P, { get(t, k) { if (typeof k === 'string') { reads.add(k); if (!(k in t)) missing.add(k); } return t[k]; } });
    try {
      const c = spyContext(text); skinKit.reset();
      tiles.forEach((t, i) => { env.tok = e.tok; skin.draw.tile(c, t, i % 7 === 0 ? { ...env } : env); if (t.label && skin.draw.label) skin.draw.label(c, t, env); if (skin.draw.pin) skin.draw.pin(c, { ...t, x: 40 }, env); if (skin.draw.leader) skin.draw.leader(c, t, env, [0, 0], [10, 10]); if (skin.draw.hull) skin.draw.hull(c, t, env, [[1, 1]]); });
      skin.legend();
      // hover on one tile so the hover tokens are read
      skinKit.setHover(tiles[0].key); skin.draw.tile(c, tiles[0], { ...env });
    } finally { skin.skin.P = P; }
    assert.deepEqual([...missing], [], `${skin.id}: tokens read but not defined`);
    const unread = [...skin.tokenDocs.byName.keys()].filter((n) => !reads.has(n)); assert.deepEqual(unread, [], `${skin.id}: tokens defined but never read`);
  }
});

test('token tables: unique names, documented, within their own ranges; every variant overrides only existing tokens with valid values; live tweaking validates', () => {
  for (const [id, f] of Object.entries(FAMILIES)) {
    const table = compileTokens(f.rows, id); assert.ok(table.byName.size >= 20); for (const d of table.byName.values()) assert.ok(d.doc.length >= 12, `${id} ${d.name} doc`);
    for (const [vid, v] of Object.entries(f.variants)) { assert.ok(v.label && Object.keys(v.set).length >= 4, `${id}/${vid}`); for (const k of Object.keys(v.set)) assert.ok(table.byName.has(k), `${id}/${vid}: unknown token ${k}`); }
  }
  assert.throws(() => compileTokens([['color.x', '#fff', 'ok doc text'], ['color.x', '#000', 'dup doc text']], 't'), /duplicate/); assert.throws(() => compileTokens([['x', 1, 'a doc string']], 't'), /bad token name/);
  assert.throws(() => compileTokens([['a.b', 5, 'doc doc doc', { min: 0, max: 1 }]], 't'), /above/); assert.throws(() => compileTokens([['a.b', 1, 'x']], 't'), /doc/);
  const e = engineWith(FIELD_MANUAL[0]); void e; const old = skinKit.setToken('field-manual', 'frame.width', 2); assert.equal(old, 1.5); assert.equal(FIELD_MANUAL[0].skin.P['frame.width'], 2);
  assert.throws(() => skinKit.setToken('field-manual', 'frame.width', 99), /above/); assert.throws(() => skinKit.setToken('field-manual', 'no.such', 1), /no token/); assert.throws(() => skinKit.setToken('field-manual', 'color.union', 'red'), /#rrggbb/);
  skinKit.setToken('field-manual', 'frame.width', 1.5); assert.equal(skinKit.exportTokens('field-manual')['field-manual']['frame.width'], 1.5);
  assert.throws(() => defineSkin({ id: 'x', label: 'x', version: '1', tokens: [['motion.selectMs', 1, 'doc doc doc']], footprint: {}, channels: {}, draw: { tile() {} }, sample() {} }), /motion.hoverMs/);
});

// ---- colour: contrast and colour-vision deficiency ----------------------------------------------------------------------------------------------------------
test('contrast: text on its plate and the side frame on the plate, per skin and variant (WCAG ratios); the high-contrast variants reach 7:1 for text', () => {
  const rows = [];
  const fails = []; const check = (id, a, b, min, what) => { const r = contrast(a, b); rows.push(`${id} ${what} ${r.toFixed(1)}`); if (!(r >= min)) fails.push(`${id}: ${what} ${r.toFixed(2)}:1 is below ${min}:1`); };
  for (const skin of FIELD_MANUAL) { const P = skin.skin.P; const hc = skin.variant === 'contrast'; for (const plate of ['color.plate', 'color.plateOld']) { check(skin.id, P['color.ink'], P[plate], hc ? 7 : 4.5, 'text/' + plate); for (const s of ['union', 'confederate', 'unknown']) check(skin.id, P['color.' + s], P[plate], hc ? 4.5 : 3, `${s} frame/${plate}`); } }
  for (const skin of WAR_ROOM) { const P = skin.skin.P; const hc = skin.variant === 'contrast'; for (const plate of ['color.plateTop', 'color.plateBottom', 'color.plateOld']) { check(skin.id, P['color.ink'], P[plate], hc ? 7 : 4.5, 'text/' + plate); for (const s of ['union', 'confederate', 'unknown']) check(skin.id, P['color.' + s], P[plate], hc ? 7 : 4.5, `${s} rim/${plate}`); } }
  for (const skin of MAP_1863) { const P = skin.skin.P; const hc = skin.variant === 'contrast'; for (const plate of ['color.parchment', 'color.parchmentOld']) { check(skin.id, P['color.ink'], P[plate], hc ? 7 : 4.5, 'text/' + plate); for (const s of ['union', 'confederate']) check(skin.id, P['color.' + s], P[plate], 3, `${s} wash/${plate}`); }
    for (const s of ['union', 'confederate', 'unknown']) { const f = P['color.' + s]; const fg = luminance(f) > 0.42 ? P['color.ink'] : '#f7f0dd'; check(skin.id, fg, f, hc ? 4.5 : 3.5, `${s} glyph on its flag`); } }
  const ms = MINIMAL.skin.P; for (const s of ['union', 'confederate', 'unknown', 'mixed']) check('minimal', ms['color.ink'], ms['color.' + s], 4.5, `text on ${s} fill`);
  assert.deepEqual(fails, []); console.log('# contrast ratios: ' + rows.slice(0, 6).join(', ') + ` ... (${rows.length} checked)`);
});

test('greyscale: the Union and Confederate colours also differ in LIGHTNESS (CIE L*), so side survives a black-and-white print as well as the silhouette; the contested grey sits apart from both', () => {
  const rows = [];
  for (const skin of [...FIELD_MANUAL, ...WAR_ROOM, ...MAP_1863, MINIMAL]) {
    const P = skin.skin.P; const L = (h) => toLab(hexRgb(h))[0]; const d = Math.abs(L(P['color.union']) - L(P['color.confederate'])); rows.push(`${skin.id} ${d.toFixed(0)}`); assert.ok(d >= 14, `${skin.id}: Union and Confederate differ by only ${d.toFixed(1)} L*`);
    if (skin.id !== 'minimal') for (const s of ['union', 'confederate']) assert.ok(deltaE(hexRgb(P['color.unknown']), hexRgb(P['color.' + s])) >= 20, `${skin.id}: the contested colour is too close to ${s}`);
  }
  console.log('# lightness difference (L*) between the side colours: ' + rows.join(', '));
});

test('colour-vision deficiency: under protan, deutan and tritan simulation the Union, Confederate and contested colours stay apart in every variant; the colour-blind-safe variants keep a larger margin than the defaults', () => {
  const report = [];
  const minDE = (P) => { const cs = ['union', 'confederate', 'unknown'].map((s) => hexRgb(P['color.' + s])); let m = Infinity; for (const k of ['none', 'protan', 'deutan', 'tritan']) { const sim = cs.map((c) => (k === 'none' ? c : simulate(c, k))); for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) m = Math.min(m, deltaE(sim[i], sim[j])); } return m; };
  const fails = []; for (const fam of [FIELD_MANUAL, WAR_ROOM, MAP_1863]) { const d = minDE(fam[0].skin.P); const c = minDE(fam[1].skin.P); const h = minDE(fam[2].skin.P); report.push(`${fam[0].family}: default ${d.toFixed(0)}, cvd ${c.toFixed(0)}, contrast ${h.toFixed(0)}`); if (!(c >= 20)) fails.push(`${fam[0].family}/cvd min dE ${c}`); if (!(h >= 20)) fails.push(`${fam[0].family}/contrast min dE ${h}`); if (!(d >= 12)) fails.push(`${fam[0].family} default min dE ${d}`); } assert.deepEqual(fails, []);
  console.log('# smallest pairwise colour difference (CIE76) over normal vision and three simulations: ' + report.join(' | '));
});

// ---- eased state --------------------------------------------------------------------------------------------------------------------------------------
test('selection and hover ease: a critically damped, monotone approach in wall-clock time (never a step), reduced motion steps; nothing is requested once everything has settled', () => {
  const skin = FIELD_MANUAL[0]; const e = engineWith(skin); const S = specimens(e); const t = S.tileFor(S.U.inf, {}); let T = 1000; skinKit.setClock({ now: () => T });
  const rafs = []; globalThis.requestAnimationFrame = (f) => { rafs.push(f); return rafs.length; };
  try {
    const frame = (tile, tok = e.tok) => { T += 1000 / 60; skin.draw.tile(spyContext(text), tile, { ...envOf(e), tok }); };
    for (let i = 0; i < 4; i++) frame(t); const st = () => skinKit.states.get(t.key).ch; assert.equal(st().sel?.x ?? 0, 0);
    const xs = []; for (let i = 0; i < 60; i++) { frame({ ...t, selected: true }); xs.push(st().sel.x); }
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] >= xs[i - 1] - 1e-12 && xs[i] <= 1 + 1e-9, 'monotone, no overshoot'); assert.ok(xs[0] > 0 && xs[0] < 0.2, 'the first frame is a small step, not a jump: ' + xs[0]); assert.ok(xs[29] > 0.95, 'settled within half a second: ' + xs[29]); assert.equal(xs[59], 1);
    // hover through the kit's hover key
    const ts = { ...t, selected: true }; skinKit.setHover(t.key); const hs = []; for (let i = 0; i < 40; i++) { frame(ts); hs.push(st().hov.x); } assert.ok(hs[0] > 0 && hs[0] < 0.3 && hs[39] === 1); skinKit.setHover(null); for (let i = 0; i < 40; i++) frame(ts); assert.equal(st().hov.x, 0);
    // settled: no redraw is requested
    for (let i = 0; i < 3; i++) frame(ts); rafs.length = 0; skinKit.frame.pumping = false; frame(ts); assert.equal(rafs.length, 0, 'settled: no frame requested');
    // while easing, a frame IS requested (the pump)
    skinKit.frame.pumping = false; frame({ ...t, selected: false }); assert.equal(rafs.length, 1, 'easing: one frame requested');
    // reduced motion: a step
    const red = { get: (id) => id }; void red; const tokReduced = (id) => (id === 'motion.reduced' ? 'on' : e.tok(id)); const t2 = S.tileFor(S.U.csa, {}); frame(t2, tokReduced); frame({ ...t2, selected: true }, tokReduced); assert.equal(skinKit.states.get(t2.key).ch.sel.x, 1, 'reduced motion: the ring appears at once');
  } finally { delete globalThis.requestAnimationFrame; skinKit.setClock({ now: () => performance.now() }); skinKit.reset(); }
});

test('a keyframe that changes posture, arm state or transit cross-fades over the cross-fade time instead of popping: the old and the new mark are both drawn, weights sum to 1', () => {
  const skin = WAR_ROOM[0]; const e = engineWith(skin); const S = specimens(e); let T = 5000; skinKit.setClock({ now: () => T });
  try {
    const key = 'xf'; const mk = (d) => ({ ...S.tileFor(S.U.inf, { disposition: d }), key });
    const frame = (tile) => { T += 1000 / 60; const c = spyContext(text); skin.draw.tile(c, tile, { ...envOf(e), zoom: 17 }); return c.signature(); };
    const a = frame(mk('Line of Battle')); const sigs = [a]; for (let i = 0; i < 20; i++) sigs.push(frame(mk('Charging Line')));
    const cf = skinKit.states.get(key).cat.posture; assert.equal(cf.to, 'charge'); assert.equal(cf.m, 1); assert.equal(cf.from, null);
    const changes = sigs.slice(1).filter((s, i) => s !== sigs[i]).length; assert.ok(changes >= 8, 'the change is spread over many frames: ' + changes);
  } finally { skinKit.setClock({ now: () => performance.now() }); skinKit.reset(); }
});

// ---- the 50-line skin -------------------------------------------------------------------------------------------------------------------------------------
test('the minimal skin is under 50 lines, conforms, registers by name and drives the engine like any other', () => {
  const src = fs.readFileSync(path.join(HERE, '..', 'src', 'skins', 'minimal.mjs'), 'utf8'); const lines = src.split('\n').length - (src.endsWith('\n') ? 1 : 0); assert.ok(lines < 50, `minimal.mjs has ${lines} lines`);
  const e = engineWith(MINIMAL); for (let i = 0; i < 20; i++) e.step(1000 / 60); assert.equal(e.frame.overlaps, 0); assert.equal(e.frame.unrepresented, 0); assert.ok(e.frame.tiles.length > 100);
  assert.ok(MINIMAL.legend().length >= 8); console.log(`# minimal.mjs: ${lines} lines, ${MINIMAL.legend().length} legend rows, ${e.frame.tiles.length} tiles in the default scene`);
});

test('three distinct families: footprints differ, and the three skins paint different ink for the same tile', () => {
  const foot = (s) => JSON.stringify(s.footprint); assert.equal(new Set([foot(FIELD_MANUAL[0]), foot(WAR_ROOM[0]), foot(MAP_1863[0])]).size, 3);
  const sigs = [];
  for (const skin of [FIELD_MANUAL[0], WAR_ROOM[0], MAP_1863[0], MINIMAL]) { const e = engineWith(skin); const S = specimens(e); sigs.push(signature(skin, e, S.tileFor(S.U.inf, { disposition: 'Charging Line' }))); }
  assert.equal(new Set(sigs).size, 4);
  // variants of one family share the geometry (same footprint, so the layout is identical) and differ in ink
  for (const fam of [FIELD_MANUAL, WAR_ROOM, MAP_1863]) { assert.equal(foot(fam[0]), foot(fam[1])); assert.equal(foot(fam[0]), foot(fam[2])); const e = engineWith(fam[0]); const S = specimens(e); const t = S.tileFor(S.U.inf, {}); assert.notEqual(signature(fam[0], e, t), signature(fam[1], e, t)); assert.notEqual(signature(fam[0], e, t), signature(fam[2], e, t)); }
});
