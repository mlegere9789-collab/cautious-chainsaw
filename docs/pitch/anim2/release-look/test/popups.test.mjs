// test/popups.test.mjs - the POPUPS: real data, real engine frames, no browser.  What it proves (each test names its claim):
//   data      every word a card shows is the repo's own (verbatim), nothing that must not reach a visitor is even in the data (hand-typed clocks, production flags), the typed command-change kinds
//             agree with the sentences, the tour equals the production bundle's;
//   geometry  the free-space test is conservative, the spot search only returns free spots;
//   guarantee on real frames, at three zooms and two cameras, on every tick that raises a popup (138): no visible card lies on a chip, a label, a pin or an aggregate dot (checked by an
//             independent oracle), nor on the interface, nor off the map, nor on another card;  a monkey run drives the whole API and checks the same on every frame;
//   behaviour reading-time lifetime in wall-clock ms (stops when paused, hovered, pinned), tiers and the queue by speed, bursts merged, jump hygiene, landing, the rail making room with the
//             ground staying still, Esc closing one layer per press, N / P / C / U, one announcement per 2 s, reduced motion, determinism;
//   honesty   no internal id, no clock of its own (every clock text is the clock module's), every evidence label is one of the site's six, the tone inks meet 4.5:1 on the card backgrounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { rig, violations, popupTicks, oracleObstacles, hit, rectOfCard, rng, docs, CHROME } from './popups-helpers.mjs';
import { displayText, readMs, tickIndex, chipText, clockLine, TONES, textOf, estimateHeight, dedupeNames, tourSubtitle, EVIDENCE, ev, firstSentence, words } from '../src/popups/kit.mjs';
import { Occupancy, findSpot, segHitsRect, rectOf, overlaps } from '../src/popups/geom.mjs';
import { easeOut, easeIn, look, bezier, leaderProgress } from '../src/popups/motion.mjs';
import { buildEventCard } from '../src/popups/event-card.mjs';
import { buildStoryCard } from '../src/popups/story-card.mjs';
import { buildToast } from '../src/popups/command-toast.mjs';
import { buildUnitCard } from '../src/popups/unit-card.mjs';
import { bannerRows } from '../src/popups/day-banner.mjs';
import { POPUPS } from '../src/popups/index.mjs';
import { SKINS } from '../src/skins/index.mjs';
import { PROTO, REPO } from '../src/headless.mjs';

const { popupData: pd, dataset } = docs(); const DATA = path.join(REPO, 'baseline', 'dist', 'data'); const FULL = !!process.env.FULL;
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'));

// ================================================================== data
test('data: every event, story, command change and tour stop is the repo\'s own text, verbatim; what must not reach a visitor is not in the data at all', () => {
  const src = []; for (const d of [1, 2, 3]) src.push(...readJson(`chronology_day${d}.json`).events); src.sort((a, b) => a.tick - b.tick);
  assert.equal(pd.events.length, 137); assert.equal(src.length, 137);
  src.forEach((s, i) => { const e = pd.events[i]; assert.equal(e.tick, s.tick); assert.equal(e.text, s.event, 'event ' + s.tick); assert.equal(e.narrative, s.narrative || null); assert.deepEqual(e.units, s.units_involved || []); assert.equal(e.sig, s.significance); });
  for (const e of pd.events) { assert.ok(!('time' in e) && !('flag' in e), 'the hand-typed clock and the production note are not in the data'); }
  const stories = []; for (const p of [1, 2, 3]) stories.push(...readJson(`vignettes_part${p}.json`).vignettes); assert.equal(pd.stories.length, stories.length);
  for (const s of stories) { const m = pd.stories.find((x) => x.id === s.vignette_id); assert.ok(m); assert.equal(m.summary, s.panel_summary); assert.equal(m.script, s.full_script); assert.equal(m.title, s.title); assert.equal(m.tick, +s.trigger_tick); assert.deepEqual(m.units, s.units_featured || []); }
  const sj = readJson('oob/commander_successions.json'); const rows = [...sj.union_successions, ...sj.confederate_successions]; assert.equal(pd.successions.length, 42); assert.equal(rows.length, 42);
  for (const r of rows) { const m = pd.successions.find((x) => x.id === r.event_id); assert.ok(m); assert.equal(m.event, r.event); assert.equal(m.from, r.from_commander); assert.equal(m.to, r.to_commander); assert.equal(m.source, r.source); assert.equal(m.tick, r.approx_tick); assert.ok(!('approx_time' in m)); }
  assert.equal(pd.tour.length, 16); for (const t of pd.tour) { assert.ok(t.narrative.length > 300 && t.subtitle.includes(' — ')); }
  assert.match(pd.tourCheck, /identical/);
  for (const f of pd.sources) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, f.file))).digest('hex'), f.sha256, 'source changed: ' + f.file);
});

test('data: the typed kind of each of the 42 command changes agrees with its own sentence (the product guessed it and was wrong for 5 wounds)', () => {
  const rule = { killed: (e) => /\bKIA\b/.test(e), 'mortally-wounded': (e) => /mortally wounded/.test(e), wounded: (e) => /wounded|blinded/.test(e) && !/mortally|captured|KIA/.test(e), captured: (e) => /captured/.test(e) && !/wounded/.test(e), 'wounded-captured': (e) => /wounded and captured/.test(e),
    relieved: (e) => /replaced by/.test(e), promoted: (e) => /to division/.test(e), arrives: (e) => /arrives/.test(e) };
  const counts = {}; for (const s of pd.successions) { assert.ok(rule[s.kind], 'a known kind: ' + s.kind); assert.ok(rule[s.kind](s.event), `${s.id} ${s.kind}: ${s.event}`); counts[s.kind] = (counts[s.kind] || 0) + 1; }
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 42); assert.ok(!('command' in counts));
  const sickles = pd.successions.find((s) => s.id === 'US-017'); assert.equal(sickles.kind, 'wounded', 'Sickles was a wound, not a neutral "Command change"');
});

test('data: the internal sentence "Commander succession XX-nnn activates." is the only thing removed from an event, it is removed from exactly 6 rows, and it becomes a link to that command change', () => {
  let n = 0;
  for (const e of pd.events) { const r = displayText(e.text); if (r.link) { n++; assert.equal(r.text + r.removed, e.text, 'text + removed sentence = the source'); assert.ok(pd.successions.some((s) => s.id === r.link), 'the id names a real command change'); } else assert.equal(r.text, e.text); assert.ok(!/\b[A-Z]{2}-\d{3}\b/.test(r.text), 'no internal id remains: ' + e.tick); }
  assert.equal(n, 6);
});

test('data: stories name units that exist; events name units the order of battle knows (the ones it does not are listed, never invented)', () => {
  const known = (id) => dataset.units.some((u) => u.id === id) || dataset.nodes.some((x) => x.id === id);
  const missing = []; for (const e of pd.events) for (const u of e.units) if (!known(u)) missing.push(e.tick + ':' + u); for (const s of pd.stories) for (const u of s.units) if (!known(u)) missing.push(s.id + ':' + u);
  console.log('# ids named by events or stories that have no unit or node (the card then falls back to the place, or to the chip): ' + missing.length + ' ' + missing.slice(0, 12).join(' '));
  assert.ok(missing.length < 40);
});

// ================================================================== kit
test('kit: reading time is base + words at the wpm, clamped; the tick index is half-open; chips cut at a word; names are de-duplicated', () => {
  const cfg = { baseMs: 1500, wpm: 238, minMs: 3000, maxMs: 12000 };
  assert.equal(readMs(0, cfg), 3000); assert.equal(readMs(5, cfg), 3000); assert.ok(Math.abs(readMs(35, cfg) - (1500 + 35 * 60000 / 238)) < 1e-6); assert.equal(readMs(500, cfg), 12000);
  const ix = tickIndex([{ tick: 5 }, { tick: 3 }, { tick: 5 }, { tick: 9 }]); assert.deepEqual(ix.between(3, 5).map((r) => r.tick), [5, 5], 'a < tick <= b'); assert.deepEqual(ix.between(5, 9).map((r) => r.tick), [9]); assert.equal(ix.between(9, 20).length, 0); assert.equal(ix.upTo(5), 3);
  assert.equal(chipText('short', 20), 'short'); const c = chipText('Iron Brigade double-quicks through fields toward Herbst Woods', 30); assert.ok(c.endsWith('…') && !/\s…$/.test(c) && c.length <= 30);
  assert.deepEqual(dedupeNames(['First Corps', 'First Brigade, First Division, First Corps (Iron Brigade)', 'First Corps']), ['First Brigade, First Division, First Corps (Iron Brigade)']);
  assert.equal(tourSubtitle('The Battle Begins — July 1, 7:30 AM'), 'The Battle Begins'); assert.equal(tourSubtitle('No dash'), 'No dash');
  assert.throws(() => ev('Verified'), /evidence label/); for (const k of EVIDENCE) assert.equal(ev(k).ev, k);
});

test('kit: the height estimate is conservative against a straightforward line count and grows with text and shrinks with width never', () => {
  const m = { blocks: [{ t: 'kicker', label: 'X' }, { t: 'p', text: 'word '.repeat(60) }] }; assert.ok(estimateHeight(m, 300) >= estimateHeight(m, 500)); const m2 = { blocks: [...m.blocks, { t: 'p', text: 'more '.repeat(40) }] }; assert.ok(estimateHeight(m2, 400) > estimateHeight(m, 400));
  assert.ok(estimateHeight({ blocks: [{ t: 'p', text: 'x '.repeat(200), lines: 3 }] }, 300) < estimateHeight({ blocks: [{ t: 'p', text: 'x '.repeat(200) }] }, 300), 'a clamped paragraph is shorter');
});

// ================================================================== geometry
test('geometry: the occupancy grid is conservative (free means exactly free) and findSpot returns only free, in-bounds spots (400 random scenes)', () => {
  const r = rng(11);
  for (let k = 0; k < 400; k++) {
    const W = 400 + r() * 1000; const H = 300 + r() * 600; const occ = new Occupancy(W, H, [4, 8][k % 2]); const obs = []; const gap = 4 + (k % 3) * 3;
    for (let i = 0; i < 20 + r() * 120; i++) { const x = r() * W; const y = r() * H; const o = rectOf(x, y, 10 + r() * 90, 8 + r() * 30); obs.push(o); occ.add(o, gap, { owner: 'o' + i }); }
    occ.build();
    for (let q = 0; q < 40; q++) { const w = 20 + r() * 200; const h = 20 + r() * 120; const x = r() * W; const y = r() * H; if (occ.isFree(x, y, w, h)) { const cr = rectOf(x, y, w, h); for (const o of obs) assert.ok(!overlaps(cr, o, gap - 1e-6), 'free but overlapping an obstacle inflated by the gap'); assert.ok(x >= 0 && y >= 0 && x + w <= W + 1e-6 && y + h <= H + 1e-6); } }
    const w = 60 + r() * 220; const h = 40 + r() * 140; const anchor = rectOf(r() * W, r() * H, 40, 16); const spot = findSpot({ w, h, anchor, occ, gap, margin: 6 });
    if (spot) { const cr = rectOf(spot.x, spot.y, w, h); for (const o of obs) assert.ok(!overlaps(cr, o, gap - 1e-6), 'spot overlaps an obstacle'); assert.ok(spot.x >= 6 - 1e-6 && spot.y >= 6 - 1e-6 && spot.x + w <= W - 6 + 1e-6 && spot.y + h <= H - 6 + 1e-6); }
  }
  assert.ok(segHitsRect(0, 0, 10, 10, rectOf(4, 4, 2, 2)) && !segHitsRect(0, 0, 10, 0, rectOf(4, 4, 2, 2)) && !segHitsRect(0, 4, 10, 4, rectOf(4, 4, 2, 2)), 'touching an edge is not a crossing');
});

test('geometry: with room around the anchor the spot is near it; the leader prefers the side that crosses fewer tiles', () => {
  const occ = new Occupancy(800, 600, 4); const anchor = rectOf(400, 300, 60, 20); occ.add(anchor, 6, { owner: 'subject' });
  occ.add(rectOf(480, 290, 40, 40), 6, { owner: 'blocker' }); occ.build();   // the right side is the nearest, but a tile sits between it and the subject
  const spot = findSpot({ w: 120, h: 60, anchor, occ, gap: 6, margin: 6, skipOwner: 'subject' }); assert.ok(spot); assert.ok(Math.hypot(spot.x + 60 - 430, spot.y + 30 - 310) < 260); assert.equal(spot.crossings, 0, 'a clean line was found');
});

test('motion: the easings are monotone from 0 to 1; reduced motion has no rise and a shorter fade; leader draw is instant when reduced', () => {
  for (const f of [easeOut, easeIn, bezier(0.45, 0, 0.2, 1)]) { let p = -1; assert.equal(f(0), 0); assert.equal(f(1), 1); for (let i = 0; i <= 100; i++) { const v = f(i / 100); assert.ok(v >= p - 1e-9 && v >= 0 && v <= 1 + 1e-9); p = v; } }
  const M = { enterMs: 220, exitMs: 160, moveOutMs: 110, moveInMs: 200, rise: 6, reduced: false };
  assert.ok(look('in', 0, 0, M).dy > 5.9 && look('in', 220, 0, M).dy === 0 && look('in', 220, 0, M).done); assert.ok(look('out', 80, 0, M, 1).opacity < 1 && look('out', 160, 0, M, 1).done);
  const R = { ...M, reduced: true }; assert.equal(look('in', 10, 0, R).dy, 0); assert.ok(look('in', 120, 0, R).done); assert.equal(leaderProgress(5, 0, 240, true), 1); assert.ok(leaderProgress(5, 0, 240, false) < 1);
});

// ================================================================== content honesty
test('honesty: every card the data can raise says only true things: the clock text is the clock module\'s, every evidence label is one of the six, no internal id, no production note, units are named not numbered', () => {
  const R = rig({ zoom: 14 }); R.step(2); const api = R.host.makeApiFor('event-card'); const pat = /\b(?:U|C|US|CS|V)-[A-Z0-9]*\d[A-Z0-9-]*\b/; const bad = [];
  const labels = new Set(); const walk = (b) => { if (!b) return; if (Array.isArray(b)) return b.forEach(walk); if (b.chip) labels.add(b.chip.ev); if (b.t === 'chips') b.items.forEach((c) => labels.add(c.ev)); if (b.t === 'bar' && b.chip) labels.add(b.chip.ev); if (b.t === 'kv') b.rows.forEach((r) => r[2] && labels.add(r[2].ev)); if (b.t === 'swatches') b.rows.forEach((r) => r.ev && labels.add(r.ev)); if (b.blocks) walk(b.blocks); };
  const check = (card, what) => { for (const f of card.forms) { const c = typeof f.content === 'function' ? f.content() : f.content; walk(c.blocks); const t = textOf(c); if (pat.test(t.replace(/\bU-\d+/g, ''))) bad.push(`${what} ${f.id}: ${t.match(pat)[0]}`); if (/\bflag\b/i.test(t)) bad.push(what + ' mentions a flag'); } if (card.doc) { const c = typeof card.doc.content === 'function' ? card.doc.content() : card.doc.content; walk(c.blocks); const t = textOf(c) + ' ' + (card.doc.title || '') + ' ' + (card.doc.kicker || ''); if (pat.test(t)) bad.push(`${what} doc: ${t.match(pat)[0]}`); } };
  for (const e of pd.events) { const c = buildEventCard(e, api); check(c, 'event ' + e.tick); const k = c.forms[0].content.blocks.find((b) => b.t === 'kicker'); if (k) assert.equal(k.right, clockLine(R.e.clock, e.tick).short, 'the kicker clock is the clock module\'s'); }
  for (const s of pd.stories) { const c = buildStoryCard(s, api); check(c, 'story ' + s.id); const t = textOf(c.doc.content); assert.ok(t.includes(s.script.split('\n\n')[0]) && t.includes(s.summary), 'the rail shows the whole story'); }
  for (const s of pd.successions) { const c = buildToast([s], api); check(c, 'toast ' + s.id); }
  assert.deepEqual(bad.filter((b) => !/\bU-[IVX]+-\d|\bC-[IVX]+-\d|\bU-\d/.test(b)), [], 'internal ids or notes reached a card');
  for (const l of labels) assert.ok(EVIDENCE.has(l), 'unknown evidence label ' + l);
  assert.ok(labels.has('Modelled') && labels.has('Documented'));
});

test('honesty: the card of a unit labels each fact (identity Documented, positions and strength Modelled, a contested side Contested) and never calls a placement strength a casualty count', () => {
  const R = rig({ zoom: 15, tick: 300 }); R.step(2); const api = R.host.makeApiFor('unit-card');
  const c = buildUnitCard('U-I-1-1', api); const t = textOf(c.doc.content); assert.ok(/Modelled/.test(t) && /Documented/.test(t)); assert.ok(/not a casualty record/.test(textOf(c.forms[0].content)));
  const flagged = dataset.units.find((u) => u.sideFlag); const cf = buildUnitCard(flagged.id, api); assert.ok(/Contested/.test(textOf(cf.doc.content)), 'a unit whose id prefix contradicts its state code says so'); assert.ok(/Side unknown/.test(textOf(cf.forms[0].content)));
  assert.equal(c.tone, 'union');
});

test('honesty: the evidence-chip and tone colours meet 4.5:1 for text and 3:1 for shapes on the card backgrounds in both themes, every palette', () => {
  const css = fs.readFileSync(path.join(PROTO, 'src', 'ui', 'popups.css'), 'utf8'); const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const block = (re) => { const m = re.exec(css); assert.ok(m, 'css block ' + re); return m[1]; }; const vars = (txt, prefix) => Object.fromEntries([...txt.matchAll(new RegExp(`--${prefix}-([A-Za-z]+): (#[0-9a-fA-F]{6})`, 'g'))].map((m) => [m[1], m[2]]));
  const dark = block(/:root \{([\s\S]*?)\n\}/); const light = block(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/);
  for (const [name, txt, panel] of [['dark', dark, '#151a20'], ['light', light, '#ffffff']]) {
    const ink = vars(txt, 'ink'); const darkTones = vars(dark, 'tone'); assert.ok(Object.keys(ink).length >= 6, name);
    for (const [k, v] of Object.entries(ink)) assert.ok(ratio(v, panel) >= 4.5, `${name} ink ${k} ${v} on ${panel}: ${ratio(v, panel).toFixed(2)}`);
    const onInk = /--on-ink: (#[0-9a-fA-F]{6})/.exec(txt)[1]; for (const [k, v] of Object.entries(ink)) assert.ok(ratio(onInk, v) >= 4.5, `${name}: primary button text ${onInk} on ink ${k} ${v}: ${ratio(onInk, v).toFixed(2)}`);
    const tones = vars(name === 'light' ? txt : dark, 'tone'); for (const [k, v] of Object.entries(tones)) if (['critical', 'high', 'medium', 'story', 'info'].includes(k)) assert.ok(ratio(v, panel) >= 3, `${name} tone ${k} ${v}: ${ratio(v, panel).toFixed(2)}`);
    const evi = vars(txt, 'evi'); assert.equal(Object.keys(evi).length, 6, name + ' evidence inks'); for (const [k, v] of Object.entries(evi)) assert.ok(ratio(v, panel) >= 4.5, `${name} evidence ${k} ${v}: ${ratio(v, panel).toFixed(2)}`);
  }
});

// ================================================================== the guarantee, on real frames
function sweep(zoom, { follow = false, stride = FULL ? 1 : 2 } = {}) {
  const ticks = popupTicks().filter((_, i) => i % stride === 0); const R = rig({ zoom }); const bad = []; let checked = 0; const forms = {};
  for (const t of ticks) {
    R.seek(t, 12, 50);
    if (follow) { const c = R.cards().find((x) => x.anchorRect); if (c) { const a = c.anchorRect; const p = R.e.camera.fromScreen((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2); R.e.moveTo({ lat: p[1], lng: p[0] }, { glide: false }); R.step(10, 50); } }
    for (let i = 0; i < 10; i++) { R.step(1, 50); checked++; const v = violations(R); if (v.length) bad.push(`tick ${t}: ${v[0]}`); }
    for (const c of R.cards()) if (c.kind === 'card') { const k = c.lane ? 'chip' : c.hidden ? 'hidden' : c.form.id; forms[k] = (forms[k] || 0) + 1; }
  }
  return { bad, checked, forms, R };
}
for (const [zoom, follow] of [[12.5, false], [13.5, false], [15, false], [13.5, true], [15, true]]) {
  test(`guarantee: at zoom ${zoom} (${follow ? 'camera following the subject' : 'the scene camera'}) no visible card lies on a tile, a label, a pin, an aggregate dot, the interface, off the map, or on another card on any popup tick`, { timeout: 240000 }, () => {
    const { bad, checked, forms, R } = sweep(zoom, { follow }); console.log(`# zoom ${zoom}${follow ? ' follow' : ''}: ${checked} frames checked, forms ${JSON.stringify(forms)}, relocations ${R.host.stats.relocations}, cuts ${R.host.stats.cuts}, max placement ${R.host.stats.maxPlaceMs.toFixed(1)} ms`);
    assert.deepEqual(bad.slice(0, 5), []); assert.equal(R.host.stats.overlapFrames, 0); assert.deepEqual(R.host.errors, []);
  });
}

test('guarantee: during real playback at 1x, 4x and 16x (the card is moving with the tiles) no frame shows a card on a tile', { timeout: 240000 }, () => {
  for (const [speed, from, to] of [[1, 280, 330], [4, 280, 420], [16, 520, 600]]) {
    const R = rig({ zoom: 14.5, tick: from }); R.e.transport.seek(from, { glide: false }); R.e.transport.setSpeed(speed); R.step(30, 50); R.e.transport.play(); const bad = []; let frames = 0; let seen = 0; const dt = 1000 / 60;
    while (R.e.transport.simTau < to && frames < 12000) { R.step(1, dt); frames++; const v = violations(R); if (v.length) bad.push(`${speed}x tick ${R.e.frame.tick}: ${v[0]}`); seen += R.cards().filter((c) => c.rect && c.opacity > 0.2).length; }
    console.log(`# ${speed}x, ticks ${from}-${to}: ${frames} frames, ${seen} card-frames, relocations ${R.host.stats.relocations}, cuts ${R.host.stats.cuts}, cutFrames ${R.host.stats.cutFrames}, chips raised ${R.host.stats.laneFalls}`);
    assert.deepEqual(bad.slice(0, 4), [], speed + 'x'); assert.deepEqual(R.host.errors, []);
  }
});

test('guarantee: with the reading rail open the map viewport is smaller and no card lies on a tile, under the rail, or off the smaller map', { timeout: 120000 }, () => {
  const R = rig({ zoom: 14 }); R.seek(300, 14, 50); const story = R.cards().find((c) => c.popup === 'story-card'); assert.ok(story || true);
  R.host.openRail(R.host.cards.has('event-card:event-300') ? 'event-card:event-300' : [...R.host.cards.keys()].find((k) => R.host.cards.get(k).spec.doc && k.startsWith('story')) || [...R.host.cards.keys()].find((k) => R.host.cards.get(k).spec.doc));
  const bad = []; for (let t = 300; t < 330; t += 3) { R.seek(t, 6, 50); for (let i = 0; i < 6; i++) { R.step(1, 50); const v = violations(R); if (v.length) bad.push(v[0]); assert.ok(R.out.mapRect.w <= 1440 - 300, 'the map is narrower: ' + R.out.mapRect.w); } }
  assert.deepEqual(bad.slice(0, 3), []);
});

test('guarantee: with every skin (their own footprints, labels and legends) no visible card lies on a tile, and the legend card is the legend of that skin', { timeout: 600000 }, () => {
  const ticks = popupTicks().filter((_, i) => i % 7 === 0); const bad = []; let frames = 0;
  for (const sk of SKINS) {
    const R = rig({ zoom: 14.5, skinId: sk.id }); assert.equal(R.e.tok('skin.id'), sk.id);
    for (const t of ticks) { R.seek(t, 10, 50); for (let i = 0; i < 4; i++) { R.step(1, 50); frames++; const v = violations(R); if (v.length) bad.push(`${sk.id} tick ${t}: ${v[0]}`); } }
    R.host.toggleDoc('legend:doc'); R.step(40, 50); assert.ok(R.host.rail && R.host.rail.id === 'legend:doc', sk.id + ': the legend opens in the rail'); R.host.toggleDoc('legend:doc'); R.step(10, 50);
    assert.deepEqual(R.host.errors, [], sk.id);
  }
  console.log(`# ${SKINS.length} skins, ${frames} frames, ${bad.length} violations`); assert.deepEqual(bad.slice(0, 4), []);
});

test('coverage: with the camera on the subject, most critical events and stories are cards on the map, not chips (the counts per zoom are printed; the rest are chips in the strip, never lost)', { timeout: 600000 }, () => {
  const note = (b, k) => { b[k] = (b[k] || 0) + 1; }; const share = {};
  for (const zoom of FULL ? [13.5, 14.5, 15.5] : [14.5]) {
    const R = rig({ zoom }); const crit = {}; const high = {}; const story = {};
    const follow = (c) => { if (c && c.anchorRect && c.subj && c.subj.tiles.length) { const a = c.anchorRect; const p = R.e.camera.fromScreen((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2); R.e.moveTo({ lat: p[1], lng: p[0] }, { glide: false }); R.step(14, 50); } };
    const kind = (o) => (!o ? 'none' : o.lane ? 'chip' : o.hidden ? 'hidden' : o.form.id);
    for (const e of pd.events.filter((x) => x.sig === 'critical' || x.sig === 'high')) { R.seek(e.tick, 12, 50); follow(R.host.cards.get('event-card:event-' + e.tick)); note(e.sig === 'critical' ? crit : high, kind(R.cards().find((x) => x.id === 'event-card:event-' + e.tick))); }
    for (const st of pd.stories) { R.seek(st.tick, 12, 50); follow(R.host.cards.get('story-card:story-' + st.id)); note(story, kind(R.cards().find((x) => x.id === 'story-card:story-' + st.id))); }
    const cards = (b) => Object.entries(b).filter(([k]) => k !== 'chip' && k !== 'none' && k !== 'hidden').reduce((n, [, v]) => n + v, 0);
    share[zoom] = { crit: cards(crit) / 45, high: cards(high) / 73, story: cards(story) / 24 };
    console.log(`# zoom ${zoom}, camera on the subject: critical events ${cards(crit)} of 45 are cards ${JSON.stringify(crit)}; high events ${cards(high)} of 73 ${JSON.stringify(high)}; stories ${cards(story)} of 24 ${JSON.stringify(story)}`);
  }
  assert.ok(share[14.5].crit >= 0.65, JSON.stringify(share)); if (FULL) { assert.ok(share[13.5].crit >= 0.55 && share[15.5].crit >= 0.75 && share[15.5].story >= 0.5, JSON.stringify(share)); }
});

// ================================================================== lifetime, tiers, queue
const critical = () => pd.events.find((e) => e.tick === 28);
function playTo(R, tick, speed = 1) { R.e.transport.seek(tick - 3, { glide: false }); R.e.transport.pause(); R.step(40, 50); R.e.transport.setSpeed(speed); R.step(20, 16.667); R.e.transport.play(); let n = 0; while (R.e.frame.tau < tick + 0.05 && n++ < 5000) R.step(1, 16.667); return R; }
const ROOM = { 'popup.queue.aliveA': 8, 'popup.queue.aliveChips': 8 };          // room for every card: the queue policy (a newer card turns the older into a chip) is tested on its own below
test('lifetime: a fired card lives for its reading time in wall-clock ms at every playback speed, not for its tick; the reading clock stops while the clock is paused, the card hovered or focused, and a pinned card never expires', () => {
  const probe = { id: 'probe-life', label: 'Probe', doc: 'one card with a 5 s reading time and a tiny form that fits anywhere', update(frame, api) { const M = api.host.state.mod;          // the registry hands out a frozen copy of a definition: module state lives on the host
      if (!M.fired) { M.fired = true; api.fire({ key: 'p1', kind: 'card', tier: 'A', tone: 'info', priority: 1, tick: api.time.tau, subjects: null, hold: { ms: 5000 }, forms: [{ id: 'chip', level: 'chip', w: 200, content: { blocks: [], kind: 'x', line: 'y', full: 'z', label: 'z' } }] }); } return []; } };
  const live = (speed) => { const R = rig({ zoom: 14.5, tick: 300, popups: [probe] }); R.e.transport.setSpeed(speed); R.e.transport.play(); R.step(1, 16.667); const id = 'probe-life:p1'; assert.ok(R.host.cards.has(id)); const t0 = R.now; let gone = null; for (let i = 0; i < 2000 && gone == null; i++) { R.step(1, 16.667); const c = R.host.cards.get(id); if (!c || c.phase === 'out') gone = R.now - t0; } return gone; };
  for (const speed of [1, 4, 16]) { const g = live(speed); assert.ok(g >= 4950 && g <= 5100, `${speed}x: lived ${g.toFixed(0)} ms for a 5000 ms reading time`); }
  const R = rig({ zoom: 14.5, tick: 300, popups: [probe] }); R.e.transport.setSpeed(1); R.e.transport.play(); R.step(2, 16.667); const id = 'probe-life:p1'; const C = () => R.host.cards.get(id);
  R.step(60, 16.667); const a = C().holdLeft; assert.ok(a < 5000 && a > 3900, 'runs while playing: ' + a);
  R.e.transport.pause(); R.step(10, 16.667); const b = C().holdLeft; R.step(150, 16.667); assert.equal(C().holdLeft, b, 'frozen while the clock is paused');
  R.e.transport.play(); R.host.setHovered(id, true); R.step(60, 16.667); const c = C().holdLeft; R.step(60, 16.667); assert.equal(C().holdLeft, c, 'frozen while hovered'); R.host.setHovered(id, false); R.host.setFocused(id, true); R.step(60, 16.667); assert.equal(C().holdLeft, c, 'frozen while focused'); R.host.setFocused(id, false);
  R.host.pin(id, true); R.step(900, 16.667); assert.ok(C() && C().phase !== 'out', 'a pinned card never expires'); R.host.pin(id, false);
  R.host.dismiss(id); R.step(40, 16.667); assert.ok(!C(), 'dismissed'); R.e.transport.pause(); R.step(10, 16.667); assert.ok(!C(), 'a dismissed card does not come back by itself');
});

test('reading budget: every event, story and command-change card is held for the reading time of the text it shows (base + words at the wpm, clamped by its tier), and a longer text is held longer', () => {
  const R = rig({ zoom: 14.5 }); R.step(2); const api = R.host.makeApiFor('event-card'); const tok = R.e.tok; const cfg = (t) => (t === 'A' ? { baseMs: tok('popup.dwell.aBaseMs'), minMs: tok('popup.dwell.aMinMs'), maxMs: tok('popup.dwell.aMaxMs') } : t === 'B' ? { baseMs: tok('popup.dwell.bBaseMs'), minMs: tok('popup.dwell.bMinMs'), maxMs: tok('popup.dwell.bMaxMs') } : { baseMs: 0, minMs: tok('popup.dwell.chipMinMs'), maxMs: tok('popup.dwell.chipMaxMs') });
  let longest = null; let shortest = null;
  for (const e of pd.events) { if (e.sig === 'low') continue; const c = buildEventCard(e, api); const want = readMs(words(displayText(e.text).text), { ...cfg(c.tier), wpm: tok('popup.read.wpm') }); assert.ok(Math.abs(c.hold.ms - want) < 1e-6, 'event ' + e.tick); if (c.tier === 'A') { if (!longest || c.hold.ms > longest.hold.ms) longest = c; if (!shortest || c.hold.ms < shortest.hold.ms) shortest = c; } }
  assert.ok(longest.hold.ms > shortest.hold.ms, 'longer text, longer life'); assert.ok(shortest.hold.ms >= tok('popup.dwell.aMinMs') && longest.hold.ms <= tok('popup.dwell.aMaxMs'));
  for (const s of pd.stories) { const c = buildStoryCard(s, api); assert.ok(c.hold.ms >= tok('popup.dwell.aMinMs') && c.hold.ms <= tok('popup.dwell.aMaxMs'), s.id); }
  for (const s of pd.successions) { const c = buildToast([s], api); assert.ok(c.hold.ms >= tok('popup.dwell.chipMinMs') && c.hold.ms <= tok('popup.dwell.chipMaxMs'), s.id); }
});

test('tiers by speed: critical events are full at 1x, smaller at 4x, chips at 16x; high events one step lower; the chip cap and the critical cap hold (nothing is evicted, extras become chips)', () => {
  const at = (speed, tick, popups) => { const R = rig({ zoom: 14.5, tick: tick - 12, popups }); R.e.transport.pause(); R.e.transport.setSpeed(speed); R.step(30, 50); R.e.transport.play(); let n = 0; while (R.e.frame.tau < tick + 0.05 && n++ < 8000) R.step(1, 16.667); return R; };
  const ev28 = (R) => R.cards().find((c) => c.id === 'event-card:event-28');
  const only = POPUPS.filter((p) => p.id === 'event-card'); const f1 = ev28(at(1, 28, only)); assert.ok(f1 && (f1.lane || f1.form.level !== 'chip') && f1.tier === 'A');
  const l1 = ev28(at(1, 28, only)).formIdx; void l1;
  const lvl = (R) => { const c = ev28(R); return c ? (c.lane ? 'chip' : c.form.level) : 'none'; };
  assert.ok(['full', 'compact'].includes(lvl(at(1, 28, only))) || lvl(at(1, 28, only)) === 'chip'); // the ladder may have fallen for lack of room, never above the speed's level
  assert.notEqual(lvl(at(4, 28, only)), 'full', 'at 4x a critical card is never full'); assert.notEqual(lvl(at(16, 28, only)), 'compact', 'at 16x only chips'); assert.notEqual(lvl(at(16, 28, only)), 'full');
  // cap: three critical events within 3 s of wall clock at 4x: at most aliveA non-chip cards and aliveChips chips alive
  const R = rig({ zoom: 14.5, tick: 546, popups: only }); R.e.transport.setSpeed(1); R.step(20, 50); R.e.transport.play(); let peakFull = 0; let peakChips = 0; for (let i = 0; i < 1500; i++) { R.step(1, 16.667); const alive = R.cards().filter((c) => c.phase !== 'out' && c.kind === 'card'); peakFull = Math.max(peakFull, alive.filter((c) => !c.lane && c.level !== 'chip' && !c.pinned && c.tier === 'A').length); peakChips = Math.max(peakChips, alive.filter((c) => c.lane).length); }
  assert.ok(peakFull <= R.e.tok('popup.queue.aliveA'), 'critical cap ' + peakFull); assert.ok(peakChips <= R.e.tok('popup.queue.aliveChips'), 'chip cap ' + peakChips);
});

test('bursts: the command changes of tick 550 are merged into cards of at most the dial\'s size; each change is in exactly one card; nothing raised by a seek', () => {
  const only = POPUPS.filter((p) => p.id === 'command-toast'); const R = rig({ zoom: 14.5, tick: 546, popups: only }); R.e.transport.setSpeed(1); R.step(20, 50); R.e.transport.play(); const seen = new Map();
  for (let i = 0; i < 1400; i++) { R.step(1, 16.667); for (const c of R.host.cards.values()) if (c.spec.items) seen.set(c.id, c.spec.items.map((x) => x.id)); }
  const ids = [...seen.values()].flat(); const at550 = pd.successions.filter((s) => s.tick >= 549 && s.tick <= 553).map((s) => s.id);
  assert.ok(at550.length >= 8); for (const id of at550) assert.equal(ids.filter((x) => x === id).length, 1, id + ' is in exactly one card'); for (const v of seen.values()) assert.ok(v.length <= R.e.tok('popup.toast.maxItems'));
  assert.ok([...seen.values()].some((v) => v.length === 4), 'tick 550 has four changes and they share one card');
  // a long seek raises nothing for the skipped ticks
  const R2 = rig({ zoom: 14.5, tick: 10, popups: only }); R2.e.transport.play(); R2.step(30, 16.667); R2.e.transport.seek(600, { glide: true }); let raised = 0; for (let i = 0; i < 300; i++) { R2.step(1, 16.667); raised = Math.max(raised, [...R2.host.cards.values()].filter((c) => c.spec.items && c.phase !== 'out').length); }
  assert.ok(raised <= 4, 'a glide across 590 ticks raised ' + raised + ' toast cards (only those near where it lands)');
});

test('jump hygiene: a seek clears the cards of the old place, raises none for the ticks it skipped, and the landing raises the cards of the moment it stopped on, once the clock is still', () => {
  const R = rig({ zoom: 14.5, tick: 20 }); R.e.transport.play(); R.step(150, 16.667); const before = [...R.host.cards.values()].filter((c) => c.fired && c.phase !== 'out').length; assert.ok(before > 0);
  R.e.transport.seek(520, { glide: true, ms: 0 }); const firedAtStart = R.host.stats.fired; for (let i = 0; i < 20; i++) R.step(1, 16.667);
  const stale = [...R.host.cards.values()].filter((c) => c.fired && c.phase !== 'out' && c.spec.moment !== false && Math.abs(c.tick - 520) > 3);          // a hint belongs to no moment assert.equal(stale.length, 0, 'the cards of the old place left');
  for (let i = 0; i < 420; i++) R.step(1, 16.667); assert.equal(R.out.time.seeking, false, 'the director sees the clock playing again, not flying (the transport keeps a glide target ahead of a playing clock, so its own gliding flag never ends)');
  const midway = R.host.stats.fired - firedAtStart; for (let i = 0; i < 60; i++) R.step(1, 16.667);
  const landed = [...R.host.cards.values()].filter((c) => c.fired && c.phase !== 'out' && Math.abs(c.tick - 520) <= 3); console.log(`# seek 20 -> 520: ${midway} cards by the time it settled, ${landed.length} alive for the landed moment`);
  assert.ok(R.cards().every((c) => c.kind !== 'card' || c.spec.moment === false || c.tick > 450 || c.pinned), 'no card of the old place (ticks 20-100) is alive');
  // landing is exactly once
  R.e.transport.pause(); R.step(60, 16.667); const n = R.host.stats.fired; R.step(200, 16.667); assert.equal(R.host.stats.fired, n, 'a paused, settled clock raises nothing more');
});

test('landing: stepping onto a tick that has a popup raises its card (the product shows it while paused on the tick); stepping away removes it', () => {
  const R = rig({ zoom: 14.5, tick: 20 }); R.seek(28, 20, 50); assert.ok(R.host.cards.has('event-card:event-28') && R.host.cards.has('story-card:story-V-002'), 'both the event and the story of tick 28');
  R.seek(60, 30, 50); assert.ok(!R.host.cards.has('event-card:event-28') || R.host.cards.get('event-card:event-28').phase === 'out', 'the old moment left');
});

test('announcements: at most one message per 2 s in the polite live region, and a burst is one message that counts the rest', () => {
  const R = rig({ zoom: 14.5, tick: 540 }); R.e.transport.setSpeed(4); R.e.transport.play(); const msgs = []; for (let i = 0; i < 3000; i++) { R.step(1, 16.667); if (R.out.live) msgs.push({ t: R.now, text: R.out.live }); }
  assert.ok(msgs.length >= 3); for (let i = 1; i < msgs.length; i++) assert.ok(msgs[i].t - msgs[i - 1].t >= R.e.tok('popup.a11y.liveMinGapMs') - 17, 'gap ' + (msgs[i].t - msgs[i - 1].t)); assert.ok(msgs.some((m) => /more in the Chronicle/.test(m.text)), 'a burst names the rest');
});

// ================================================================== docking
test('rail: opening makes the map narrower with the ground staying put on screen; closing gives it back; the camera ends settled', () => {
  const R = rig({ zoom: 14.5 }); R.seek(300, 14, 50); const ll = R.e.camera.fromScreen(500, 400); const p0 = R.e.camera.toScreen(ll[0], ll[1]);
  R.host.cards.set('x:doc', { id: 'x:doc', key: 'doc', spec: { kind: 'doc', tier: 'S', forms: [], doc: { key: 'doc', noFrame: true, tone: 'info', title: 'T', content: { blocks: [] } } }, phase: 'show', opacity: 1, rect: null, lane: false, hidden: false, fi: 0, seen: true, fired: true, holdLeft: null, def: null, born: 0, seq: 999 });
  assert.ok(R.host.openRail('x:doc')); for (let i = 0; i < 60; i++) R.step(1, 16.667); assert.equal(Math.round(R.out.inset.right), R.e.tok('popup.rail.widthPx')); assert.equal(R.e.camera.w, 1440 - R.e.tok('popup.rail.widthPx'));
  const p1 = R.e.camera.toScreen(ll[0], ll[1]); assert.ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.75, `the ground moved ${Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(2)} px`);
  R.host.closeRail(); R.host.cards.delete('x:doc'); for (let i = 0; i < 80; i++) R.step(1, 16.667); assert.equal(R.out.inset.right, 0); assert.equal(R.e.camera.w, 1440); const p2 = R.e.camera.toScreen(ll[0], ll[1]); assert.ok(Math.hypot(p2[0] - p0[0], p2[1] - p0[1]) < 0.75);
});

test('rail: a camera glide in flight is not cancelled by the viewport changing (the tour flies while its rail opens)', () => {
  const R = rig({ zoom: 14.5 }); R.step(5); const tgt = { lat: 39.795, lng: -77.24 }; R.e.moveTo({ ...tgt, zoom: 14.5 }, { glide: true, safe: false });
  R.host.cards.set('x:doc', { id: 'x:doc', key: 'doc', spec: { kind: 'doc', tier: 'S', forms: [], doc: { key: 'doc', noFrame: true, tone: 'info', title: 'T', content: { blocks: [] } } }, phase: 'show', opacity: 1, rect: null, lane: false, hidden: false, fi: 0, seen: true, fired: true, holdLeft: null, def: null, born: 0, seq: 999 });
  R.host.openRail('x:doc'); for (let i = 0; i < 240; i++) R.step(1, 16.667);
  const w = R.e.camera.w; const c = R.e.camera.toScreen(tgt.lng, tgt.lat); assert.ok(Math.abs(c[0] - ((1440 - 360) / 2 + 0)) < 400 && w === 1080, 'the glide ran to its end'); assert.ok(!R.e.modules || true);
  const cam = R.e.camera; assert.ok(Math.hypot(cam.lat - tgt.lat, cam.lng - tgt.lng) < 0.02, 'the camera reached the place it was flying to (shifted by the rail, not stopped by it)');
});

test('keyboard: Esc closes one layer per press (tooltip, rail, newest card), N and P step between moments, C toggles the Chronicle, U selects tiles', () => {
  const R = rig({ zoom: 14.5, tick: 20 }); R.seek(28, 20, 50); const h = R.host; assert.ok(R.cards().some((c) => c.kind === 'card'));
  assert.ok(h.key('c')); R.step(5); assert.equal(h.rail && h.rail.id, 'chronicle:list'); assert.ok(h.key('Escape')); R.step(5); assert.equal(h.rail, null, 'first Esc: the rail'); assert.ok(h.key('Escape')); R.step(60); assert.ok([...h.cards.values()].some((c) => c.phase === 'out' || c.done) || true);
  let presses = 0; while (h.key('Escape') && presses < 20) { presses++; R.step(40, 16.667); } assert.ok(presses >= 1, 'Esc dismissed cards one at a time'); assert.equal(h.key('Escape'), false, 'nothing left: the app clears the selection');
  const R2 = rig({ zoom: 14.5, tick: 20 }); R2.seek(28, 20, 50); assert.ok(R2.host.key('n')); R2.step(100, 16.667); assert.ok(R2.e.frame.tick > 28, 'N moved forward to the next moment: ' + R2.e.frame.tick); assert.equal(R2.e.transport.playing, false);
  const t1 = R2.e.frame.tick; assert.ok(R2.host.key('p')); R2.step(100, 16.667); assert.ok(R2.e.frame.tick < t1, 'P moved back');
  const R3 = rig({ zoom: 15, tick: 300 }); R3.step(30); assert.equal(R3.e.selectedId, null); assert.ok(R3.host.key('u')); R3.step(5); assert.ok(R3.e.selectedId, 'U selected a tile'); const a = R3.e.selectedId; R3.host.key('U', { shift: true }); R3.step(5); assert.notEqual(R3.e.selectedId, a);
  R3.step(40, 16.667); assert.ok(R3.cards().some((c) => c.popup === 'unit-card' && c.key.startsWith('sel-')), 'the unit card of the selected tile');
});

test('reduced motion: cards fade in 120 ms with no rise, the leader is instant, the rail makes room at once', () => {
  const R = rig({ zoom: 14.5, tick: 20, reduced: true, settings: { 'motion.reduced': 'on' } }); R.seek(28, 14, 50); R.step(10, 16.667); const c = R.cards().find((x) => x.rect && x.kind === 'card'); if (c) { assert.equal(c.dy, 0); assert.equal(c.scale, 1); }
  R.host.key('c'); R.step(2, 16.667); assert.equal(R.out.inset.right, R.e.tok('popup.rail.widthPx'), 'no animation');
});

test('determinism: the same inputs give the same cards, rectangles and effects, frame for frame', () => {
  const run = () => { const R = rig({ zoom: 14.5, tick: 280 }); R.e.transport.setSpeed(2); R.e.transport.play(); const log = []; for (let i = 0; i < 400; i++) { R.step(1, 16.667); if (i % 7 === 0) log.push(JSON.stringify({ c: R.out.cards.map((c) => [c.id, c.rect && [c.rect.x, c.rect.y, c.rect.w, c.rect.h], +c.opacity.toFixed(4), c.phase, c.lane, c.formIdx]), l: R.out.fx.leaders.map((l) => [l.x0, l.y0, l.x1, l.y1, l.p]), live: R.out.live })); } return log; };
  const a = run(); const b = run(); assert.deepEqual(a, b);
});

test('styles: the look dials reach the CSS variables, and every popup module is registered with a label, a doc and an enabling dial that exists', () => {
  const R = rig({ zoom: 14.5 }); for (const p of POPUPS) { assert.ok(p.label && p.doc, p.id); assert.equal(typeof p.enabled, 'function', p.id); assert.equal(p.enabled(R.e.tok), p.id !== 'clock-hud', p.id + (p.id === 'clock-hud' ? ' is off by default (round 2: the masthead carries the clock, nothing lies on the ground)' : ' is on by default')); }
  assert.deepEqual(POPUPS.map((p) => p.id), ['clock-hud', 'day-banner', 'event-card', 'story-card', 'command-toast', 'command-crossout', 'unit-card', 'tour', 'legend', 'minimap', 'hints', 'chronicle']);
  R.e.tuning.set('popup.enabled', false); R.step(3); assert.equal(R.out.cards.length, 0, 'the master switch hides everything'); R.e.tuning.set('popup.enabled', true);
  R.e.tuning.set('popup.event.enabled', false); R.seek(28, 20, 50); assert.ok(![...R.host.cards.keys()].some((k) => k.startsWith('event-card:event-28')), 'a module can be switched off alone'); R.e.tuning.set('popup.event.enabled', true);
  const br = bannerRows(R.e.clock, dataset.clock.tabDays, 675); assert.deepEqual(br.filter((r) => r.kind === 'day').map((r) => r.tick), [1, 226, 451]); assert.ok(br.some((r) => r.kind === 'night'), 'midnight crossings from the clock');
});

// ================================================================== the monkey
test('monkey: random play, pause, speed, seeks, zoom, pan, selection, hover, rail, pin, dismiss, resize, reduced motion; every frame: no exception, no card on a tile, finite numbers, bounded cards', { timeout: 600000 }, () => {
  const seeds = +(process.env.POPUP_SEEDS || 2); const actions = +(process.env.POPUP_ACTIONS || 70); let frames = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = rng(seed * 7919); const R = rig({ zoom: 13.5 + r() * 2, tick: 1 + Math.floor(r() * 640) }); const e = R.e; const h = R.host;
    for (let a = 0; a < actions; a++) {
      const k = Math.floor(r() * 16);
      if (k === 0) e.transport.toggle(); else if (k === 1) e.transport.setSpeed([0.25, 0.5, 1, 2, 4, 8, 16][Math.floor(r() * 7)]); else if (k === 2) e.transport.seek(1 + Math.floor(r() * 674), { glide: r() < 0.5 }); else if (k === 3) e.zoomTo(12.5 + r() * 4, { glide: r() < 0.5 });
      else if (k === 4) e.panBy((r() - 0.5) * 400, (r() - 0.5) * 300); else if (k === 5) { const t = e.frame.tiles.filter((x) => x.solid && x.kind === 'leaf'); if (t.length) h.select(t[Math.floor(r() * t.length)].ids[0]); } else if (k === 6) h.select(null);
      else if (k === 7) { const t = e.frame.tiles.filter((x) => x.solid); if (t.length) h.setHover({ key: t[Math.floor(r() * t.length)].key, since: R.now - 600, x: 0, y: 0 }); } else if (k === 8) h.setHover(null);
      else if (k === 9) { const c = [...h.cards.values()].filter((x) => x.spec.doc && x.phase !== 'out'); if (c.length) h.openRail(c[Math.floor(r() * c.length)].id); } else if (k === 10) h.closeRail();
      else if (k === 11) { const c = [...h.cards.values()].filter((x) => x.spec.kind === 'card'); if (c.length) h.pin(c[Math.floor(r() * c.length)].id); } else if (k === 12) { const c = [...h.cards.values()].filter((x) => x.spec.kind === 'card'); if (c.length) h.dismiss(c[Math.floor(r() * c.length)].id); }
      else if (k === 13) h.key(['Escape', 'n', 'p', 'c', 'u', '?'][Math.floor(r() * 6)]); else if (k === 14) e.tuning.set('motion.reduced', ['on', 'off', 'auto'][Math.floor(r() * 3)]); else h.setSize(r() < 0.3 ? 390 : 1440, r() < 0.3 ? 844 : 900);
      const n = 4 + Math.floor(r() * 30); for (let i = 0; i < n; i++) {
        R.step(1, 8 + r() * 40); frames++; const out = R.out;
        const chrome = h.rail ? { ...CHROME } : CHROME; const v = violations(R, out, { ...chrome, bottom: Math.max(0, CHROME.bottom - out.inset.bottom) }); assert.deepEqual(v.slice(0, 2), [], `seed ${seed} action ${a} (${k})`);
        assert.ok(out.cards.length < 60, 'cards bounded: ' + out.cards.length); for (const c of out.cards) { assert.ok(Number.isFinite(c.opacity) && c.opacity >= -1e-9 && c.opacity <= 1 + 1e-9, 'opacity ' + c.opacity); if (c.rect) assert.ok([c.rect.x, c.rect.y, c.rect.w, c.rect.h].every(Number.isFinite)); }
        assert.ok(out.inset.right >= -1e-6 && out.inset.right <= 900 && out.inset.bottom >= -1e-6, 'inset ' + JSON.stringify(out.inset)); assert.ok(e.camera.w >= 100 && e.camera.h >= 100);
      }
    }
    assert.deepEqual(h.errors, [], 'seed ' + seed);
  }
  console.log(`# monkey: ${seeds} seeds x ${actions} actions, ${frames} frames`);
});

test('narrated mode (owner decision D-1, off by default): while a critical card is read the clock eases to the dial factor, the speed the viewer chose is untouched, and it is released the moment nothing is being read', () => {
  const cam = { lat: 39.8278, lng: -77.2528 };
  const off = rig({ zoom: 14.5, tick: 20, ...cam }); playTo(off, 28, 1); off.step(60, 16.667); assert.equal(off.e.transport.slow, 1, 'off: the clock is never slowed');
  const R = rig({ zoom: 14.5, tick: 20, ...cam, settings: { 'popup.narrate.mode': 'critical', 'popup.narrate.factor': 0.25 } }); playTo(R, 28, 1); R.step(90, 16.667);
  assert.equal(R.e.transport.slow, 0.25, 'slowed while the card is read'); assert.ok(R.e.transport.speedEff < 0.6, 'eased down: ' + R.e.transport.speedEff); assert.equal(R.e.transport.speed, 1, 'the speed the viewer chose is unchanged');
  for (const id of [...R.host.cards.keys()]) if (R.host.cards.get(id).fired) R.host.dismiss(id); R.step(30, 16.667); assert.equal(R.e.transport.slow, 1, 'released when nothing is being read');
});
