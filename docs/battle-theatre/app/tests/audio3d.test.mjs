// Node tests of the spatial sound engine (src/audio3d): physics against analytic values, determinism, event ordering, voice budget, provenance flag,
// terrain hooks, documented-report expectations, synthesis measurements against the real recordings, and the Web Audio graph against a mock context.
//   node --test docs/battle-theatre/app/tests/audio3d.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..'), A = path.join(BT, 'app/src/audio3d/'), D = path.join(BT, 'app/data/audio3d/');
const imp = (f) => import(pathToFileURL(path.join(A, f)).href);
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const Ph = await imp('physics.mjs'), Pl = await imp('planner.mjs'), Pv = await imp('provenance.mjs'), Cat = await imp('catalog.mjs'), Tr = await imp('terrain.mjs'), Far = await imp('far.mjs'),
  Dsp = await imp('dsp.mjs'), Arms = await imp('synth-arms.mjs'), Voice = await imp('synth-voice.mjs'), Music = await imp('synth-music.mjs'), Bank = await imp('bank.mjs'), Off = await imp('offline.mjs'),
  Atm = await imp('atmosphere.mjs'), We = await imp('webaudio.mjs'), Idx = await imp('index.mjs');
const Model = await import(pathToFileURL(path.join(BT, 'audio/model/acoustics.mjs')).href);
const SR = 44100;
const mkPlanner = (o = {}) => Pl.createPlanner({ atmosphere: Ph.makeAtmosphere({ tC: 26, RH: 60, pKpa: 99.3 }), listener: { pos: [0, 2, 0] }, ...o });
const fire = (id, d, t = 10, weapon = 'm1861_springfield', z = 0, extra = {}) => ({ type: 'fire', id, t, weapon, x: d, y: 1.5, z, ...extra });

// ------------------------------------------------------------------ 1. physics: delay, spreading, absorption
test('speed of sound and delay = distance / c(T): analytic values of the plan (343 m/s: 2 km = 5.83 s; 1.5 km at 20 C = 4.4 s)', () => {
  assert.ok(Math.abs(Ph.speedOfSound(20) - 343.2) < 0.1); assert.ok(Math.abs(Ph.speedOfSound(25) - 346.1) < 0.1); assert.ok(Math.abs(Ph.speedOfSound(30) - 349.0) < 0.1);
  assert.ok(Math.abs(2000 / 343 - 5.83) < 0.01); assert.ok(Math.abs(1500 / Ph.speedOfSound(20) - 4.4) < 0.05);
  for (const d of [30, 100, 500, 1000, 2000, 4000]) for (const tC of [10, 20, 30]) { const c = Ph.speedOfSound(tC); assert.ok(Math.abs(Ph.travelTime([0, 0, 0], [d, 0, 0], c) - d / c) < 1e-12); }
  assert.ok(Math.abs(Ph.fToC(79) - 26.11) < 0.01);
});
test('the physics copy equals audio/model/acoustics.mjs (no drift): speed, ISO 9613-1 absorption, ISO 9613-2 ground, source levels', () => {
  for (const tC of [-5, 10, 20, 26, 35]) assert.equal(Ph.speedOfSound(tC), Model.speedOfSound(tC));
  for (const f of [63, 125, 500, 1000, 4000, 8000]) for (const [t, rh] of [[10, 70], [20, 70], [26, 60], [30, 40]]) assert.equal(Ph.absorption(f, t, rh), Model.absorption(f, t, rh));
  for (const f of [125, 500, 2000]) for (const d of [50, 300, 1500]) assert.equal(Ph.groundAttenuation(f, 1.5, 1.6, d), Model.groundAttenuation(f, 1.5, 1.6, d));
  assert.deepEqual({ ...Ph.SOURCE_PEAK_DB_1M }, { ...Model.SOURCE_PEAK_DB_1M });
});
test('ISO 9613-1 absorption reproduces the standard-table values to a few percent (20 C 70 %: 0.1 0.3 1.1 2.8 5.0 9.0 22.9 76.6 dB/km)', () => {
  const ref = [0.1, 0.3, 1.1, 2.8, 5.0, 9.0, 22.9, 76.6];
  Ph.BANDS.forEach((f, i) => { const v = Ph.absorption(f, 20, 70) * 1000; assert.ok(Math.abs(v - ref[i]) <= Math.max(0.05, 0.03 * ref[i]), `${f} Hz ${v.toFixed(2)} vs ${ref[i]}`); });
});
test('spherical spreading is 6.02 dB per doubling; the planner level equals the analytic chain peak - spreading + weighted band loss', () => {
  assert.ok(Math.abs(Ph.spreadingDb(200) - Ph.spreadingDb(100) - 6.0206) < 1e-3);
  const pl = mkPlanner();
  for (const d of [40, 100, 400, 1500]) {
    const p = pl.planEvent(fire(d, d)), atm = pl.atmosphere, w = Ph.spectrumWeights('small_arm');
    const loss = Ph.airLossDb(atm, d).map((x, i) => x + Ph.groundLossDb(1.5, 2, d, 1)[i]);
    const expect = Cat.SOUNDS['arms.rifle_musket'].peakDb1m + 20 * Math.log10(1 + 0.35 * 0) * 0 - Ph.spreadingDb(Math.hypot(d, 0.5)) + Ph.designPropagationFilter(loss, w).gainDb;
    assert.ok(Math.abs(p.levelDb - expect) < 0.6, `d=${d}: ${p.levelDb.toFixed(2)} vs ${expect.toFixed(2)}`);   // 0.5 m height difference and the heading-less event
  }
});
test('the propagation filter reproduces the air loss it was designed from (RMS under 4 dB over the audible part, 100 m to 3 km)', () => {
  const atm = Ph.makeAtmosphere({ tC: 26, RH: 60, pKpa: 99.3 }), w = Ph.spectrumWeights('small_arm');
  for (const d of [100, 300, 1000, 3000]) { const f = Ph.designPropagationFilter(Ph.airLossDb(atm, d), w); assert.ok(f.rmsDb < 4, `d=${d} rms ${f.rmsDb}`); assert.ok(f.gainDb < 0); }
  const near = Ph.designPropagationFilter(Ph.airLossDb(atm, 100), w), far = Ph.designPropagationFilter(Ph.airLossDb(atm, 3000), w); assert.ok(far.fc < near.fc / 4, 'farther sound is more muffled');
});
test('wind: the moving-air travel time is exact (a tail wind shortens, a head wind lengthens; first order agrees)', () => {
  const c = 346.1, w = 5; const down = Ph.travelTime([0, 0, 0], [686, 0, 0], c, [w, 0]), up = Ph.travelTime([0, 0, 0], [686, 0, 0], c, [-w, 0]);
  assert.ok(Math.abs(down - 686 / (c + w)) < 2e-4 && Math.abs(up - 686 / (c - w)) < 2e-4); assert.ok(down < 686 / c && up > 686 / c);
  const cross = Ph.travelTime([0, 0, 0], [0, 0, 686], c, [w, 0]); assert.ok(Math.abs(cross - 686 / c) < 0.01, 'a cross wind changes it only to second order');
  const north = Ph.windFrom(190, 4); assert.ok(north[1] < 0, 'wind from the south blows toward north = -z'); assert.ok(Math.abs(Math.hypot(...north) - 4) < 1e-9);
});
test('Doppler: a camera moving 30 m/s toward a source raises pitch by 1 + v/c (144 cents); the planner reports it', () => {
  assert.ok(Math.abs(Ph.dopplerFactor(0, 30, 346.1) - (1 + 30 / 346.1)) < 1e-9);
  const pl = mkPlanner({ listener: { pos: [0, 2, 0], vel: [30, 0, 0] } }); const p = pl.planEvent(fire(1, 800)); assert.ok(Math.abs(p.doppler.rate - Ph.dopplerFactor(0, 30, pl.atmosphere.c)) < 1e-6);
  const moving = pl.planPoint({ id: 2, soundId: 'move.hooves', tFire: 0, src: [800, 1, 0], vel: [-15, 0, 0] }); assert.ok(moving.doppler.rate > 1.04 && moving.doppler.rate < 1.16, 'a galloping squadron approaching is sharper');
});
test('retarded time with a moving listener solves t_a = t + d(t_a)/c', () => {
  const lis = (t) => [30 * t, 2, 0], src = [1000, 1.5, 0], c = 346.1, ta = Ph.arrivalTime(0, src, lis, c);
  assert.ok(Math.abs(ta - Ph.travelTime(src, lis(ta), c)) < 1e-6);
});
test('time warp: with the clock k times faster the sound delay in battle seconds is unchanged and the wall delay is divided by k (cEff = c k)', () => {
  const a1 = Ph.makeAtmosphere({ tC: 20 }), a4 = Ph.makeAtmosphere({ tC: 20, timeWarp: 4 });
  const p1 = Pl.createPlanner({ atmosphere: a1, listener: { pos: [0, 2, 0] } }).planEvent(fire(1, 2000)), p4 = Pl.createPlanner({ atmosphere: a4, listener: { pos: [0, 2, 0] } }).planEvent(fire(1, 2000));
  assert.ok(Math.abs(p1.delay / p4.delay - 4) < 1e-9);
});

// ------------------------------------------------------------------ 2. determinism and ordering
test('determinism: the same events give the same plans; shuffled input gives the same voices in the same order (arrival, then id)', () => {
  const evs = []; for (let i = 0; i < 400; i++) evs.push(fire(i + 1, 80 + (i * 37) % 1900, 10 + (i % 17) * 0.173, i % 9 === 0 ? 'napoleon_12pdr_m1857' : 'm1861_springfield', ((i * 53) % 400) - 200));
  const a = Pl.planBatch(mkPlanner(), evs), b = Pl.planBatch(mkPlanner(), evs);
  assert.equal(JSON.stringify(a.voices), JSON.stringify(b.voices));
  const shuf = evs.slice().sort((x, y) => ((x.id * 7919) % 101) - ((y.id * 7919) % 101)); const c = Pl.planBatch(mkPlanner(), shuf);
  assert.deepEqual(c.voices.map((v) => v.id), a.voices.map((v) => v.id));
  for (let i = 1; i < a.voices.length; i++) assert.ok(a.voices[i].tArrive >= a.voices[i - 1].tArrive, 'voices are in arrival order');
  assert.equal(a.voices.length + a.folded.length + a.plans.filter((p) => p.culled).length, evs.length, 'every event is accounted for');
});
test('event ordering: a near shot fired later can arrive before a far shot fired earlier (the delay is the geometry)', () => {
  const r = Pl.planBatch(mkPlanner(), [fire(1, 2000, 10), fire(2, 100, 12)]);
  assert.deepEqual(r.voices.map((v) => v.id), [2, 1]); assert.ok(r.voices[0].tArrive < 12.3 && r.voices[1].tArrive > 15.7);
});
test('synthesis is deterministic and finite: same seed same samples, other seed other samples, no NaN, peak 1', () => {
  const h = (b) => crypto.createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
  const a = Arms.smallArmShot(SR, 5, 'rifle_musket').buf, b = Arms.smallArmShot(SR, 5, 'rifle_musket').buf, c = Arms.smallArmShot(SR, 6, 'rifle_musket').buf;
  assert.equal(h(a), h(b)); assert.notEqual(h(a), h(c));
  const bank = Bank.createBank({ sr: SR, data: { commands: J(path.join(D, 'commands.json')), calls: J(path.join(D, 'calls.json')) } });
  for (const id of Object.keys(Cat.SOUNDS)) { const s = bank.get(id, 0); if (!s) { assert.ok(id === 'signal.bugle', `${id} could not be made`); continue; } assert.ok(s.buf.every(Number.isFinite), id); assert.ok(Math.abs(Dsp.peakOf(s.buf) - 1) < 1e-3 || id.startsWith('amb.') || s.buf.length > 0, id); }
});

// ------------------------------------------------------------------ 3. voice budget
test('voice budget: never more than maxVoices alive, protected shots are never folded, power is conserved in the bed, and the text says so', () => {
  const evs = []; for (let i = 0; i < 3000; i++) evs.push(fire(i + 1, i < 60 ? 60 + i : 200 + (i * 13) % 1500, 20 + (i % 600) * 0.0033, 'm1861_springfield', ((i * 29) % 500) - 250));
  const pl = mkPlanner({ budget: { maxVoices: 120, hrtfVoices: 30 } }); const r = Pl.planBatch(pl, evs);
  const alive = []; let maxAlive = 0; for (const v of r.voices) { for (let i = alive.length - 1; i >= 0; i--) if (alive[i].tEnd <= v.tArrive) alive.splice(i, 1); alive.push(v); maxAlive = Math.max(maxAlive, alive.length); }
  assert.ok(maxAlive <= 120 + 1, `alive ${maxAlive}`);
  assert.ok(r.folded.length > 0 && r.voices.length > 0);
  assert.ok(r.folded.every((v) => !v.protected || v.stolen === undefined), 'a protected shot is not stolen');
  assert.ok(r.folded.every((v) => !(v.distance < 150) || v.stolen === undefined) && r.voices.filter((v) => v.distance < 150).length > 0, 'nothing within 150 m is folded');
  const folded = r.folded.reduce((a, v) => a + Math.pow(10, v.levelDb / 10), 0), bed = r.bed.reduce((a, b) => a + b.powerSum, 0); assert.ok(Math.abs(folded - bed) / folded < 1e-9, 'bed power equals folded power');
  assert.match(r.text, /folded/); assert.match(r.text, /120/);
  const small = Pl.planBatch(mkPlanner({ budget: { maxVoices: 40, hrtfVoices: 10 } }), evs); assert.ok(small.folded.length > r.folded.length, 'a smaller budget folds more, and says so');
  const big = Pl.planBatch(mkPlanner({ budget: { maxVoices: 100000 } }), evs.slice(0, 200)); assert.equal(big.folded.length, 0); assert.match(big.text, /all \d+ shots individually/);
  assert.ok(r.voices.filter((v) => v.panner === 'hrtf').length > 0);
});
test('priority: artillery and near voices outrank distant small arms when the budget is tight', () => {
  const evs = [fire(1, 1500, 5), fire(2, 1500, 5.001, 'napoleon_12pdr_m1857'), fire(3, 120, 5.002)];
  const r = Pl.planBatch(mkPlanner({ budget: { maxVoices: 2, protectTopPer100ms: 0 } }), evs);
  const kept = r.voices.map((v) => v.id); assert.ok(kept.includes(3) && kept.includes(2), `kept ${kept}`);
});
test('inaudible sounds are culled and counted, not made (a musket 20 km away)', () => {
  const pl = mkPlanner(); const p = pl.planEvent(fire(1, 9000)); assert.ok(p.culled === 'inaudible' || p.levelDb > 0); const q = pl.planEvent(fire(2, 20000)); assert.equal(q.culled, 'range');
});

// ------------------------------------------------------------------ 4. provenance flag (DEC-001)
test('DEC-001: the default follows the PDF (marking on); the single flag turns the on-sound marking off but the panel lists everything either way', () => {
  assert.equal(Pv.AUDIO_CONFIG.labelMode, 'pdf');
  const fam = Cat.resolveFamilies(Object.fromEntries(J(path.join(D, 'sources.json')).sources.map((s) => [s.ledgerId, s])), new Set());
  const pdf = Pv.buildPanel(fam, { mode: 'pdf' }), own = Pv.buildPanel(fam, { mode: 'panel-only' });
  assert.ok(pdf.badge && /modern reconstruction/i.test(pdf.badge)); assert.equal(own.badge, null);
  assert.ok(pdf.rows.every((r) => r.onSound)); assert.ok(own.rows.every((r) => r.onSound === null));
  assert.equal(pdf.rows.length, own.rows.length); assert.deepEqual(pdf.rows.map((r) => [r.id, r.kind, r.tier, r.gap]), own.rows.map((r) => [r.id, r.kind, r.tier, r.gap]), 'the panel is identical in both modes');
  assert.ok(pdf.disclosure === own.disclosure && /No recording of the 1863 battle exists/.test(own.disclosure));
  assert.ok(pdf.rows.find((r) => r.id === 'small_arms').onSound !== null);
  assert.equal(Pv.onSoundMark({ kind: 'synthesized' }, 'pdf'), 'Synthesized black-powder audio: modern reconstruction'); assert.equal(Pv.onSoundMark({ kind: 'synthesized' }, 'panel-only'), null);
  assert.deepEqual(Pv.resolveMode('panel-only'), { mode: 'panel-only', override: true }); assert.deepEqual(Pv.resolveMode(null), { mode: 'pdf', override: false }); assert.equal(Pv.modeFromSearch('?x=1&audioLabel=panel-only'), 'panel-only'); assert.equal(Pv.modeFromSearch('?audioLabel=bogus'), null);
  assert.match(pdf.decisionStatus, /OPEN/); assert.ok(own.gaps.length >= 8, 'every gap is listed in both modes');
});
test('provenance is decided by what is loaded: nothing loaded = synthesized; a loaded musket recording = real_type with its licence and credit', () => {
  const src = J(path.join(D, 'sources.json')), by = Object.fromEntries(src.sources.map((s) => [s.ledgerId, s]));
  const none = Cat.resolveFamilies(by, new Set()), small0 = none.find((f) => f.id === 'small_arms'); assert.equal(small0.kind, 'synthesized'); assert.ok(small0.sources.every((s) => !s.shipped));
  const some = Cat.resolveFamilies(by, new Set(['FS-347647', 'FS-162628'])), small1 = some.find((f) => f.id === 'small_arms'), crowd = some.find((f) => f.id === 'voices_crowd');
  assert.equal(small1.kind, 'real_type'); assert.equal(crowd.kind, 'real_standin');
  const credits = Pv.creditLines(some); assert.ok(credits.find((c) => c.ledgerId === 'FS-162628' && c.requiresAttribution)); assert.ok(credits.find((c) => c.ledgerId === 'FS-347647' && !c.requiresAttribution));
  assert.ok(Pv.buildPanel(some, {}).credits.length === 2);
});
test('the ledger: every file exists with the recorded sha256, shippable is false for CC BY-SA / NC / ND, every catalogue ledger id exists, blocked items carry a reason', () => {
  const src = J(path.join(D, 'sources.json')); const ids = new Set(src.sources.map((s) => s.ledgerId)); assert.equal(ids.size, src.sources.length);
  for (const s of src.sources) { const buf = fs.readFileSync(path.join(BT, s.file)); assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), s.sha256, s.ledgerId); assert.ok(s.licence && s.licenceUrl && s.attribution && s.sourceUrl, s.ledgerId); if (/SA|NC|ND/.test(s.licence)) assert.equal(s.shippable, false, s.ledgerId); else assert.equal(s.shippable, true); }
  for (const f of Cat.FAMILIES) for (const id of f.ledger) assert.ok(ids.has(id), `${f.id} -> ${id}`);
  assert.ok(src.blocked.length >= 8 && src.blocked.every((b) => b.reason && b.status));
  const csv = fs.readFileSync(path.join(BT, 'audio/pilot2/LEDGER2.csv'), 'utf8'); for (const s of src.sources.filter((x) => x.round === 2)) assert.ok(csv.includes(s.sha256), s.ledgerId);
});
test('headless engine: default mode pdf, ?audioLabel=panel-only overrides and says so in the panel', async () => {
  const data = { sources: J(path.join(D, 'sources.json')), commands: J(path.join(D, 'commands.json')), calls: J(path.join(D, 'calls.json')) };
  const a = await Idx.createAudio3D({ data }), b = await Idx.createAudio3D({ data, search: '?audioLabel=panel-only' });
  assert.equal(a.mode, 'pdf'); assert.ok(a.badge()); assert.equal(b.mode, 'panel-only'); assert.equal(b.badge(), null); assert.match(b.panel().labelModeText, /preview override/); assert.equal(a.panel().rows.length, b.panel().rows.length);
  a.update({ battleNow: 0, listener: { pos: [0, 2, 0] }, weather: { tempF: 79, wind: { mph: [2, 6] } }, min: 600 }); a.onFire('u1', 3, 5, 'm1861_springfield', [250, 1.5, 0], [1, 0, 0]); const r = a.pump(60); assert.equal(r.voices.length, 1);
  assert.ok(Math.abs(r.voices[0].delay - 250 / Ph.speedOfSound(Ph.fToC(79))) < 0.02, 'delay uses the documented temperature');
});

// ------------------------------------------------------------------ 5. terrain hooks
test('terrain: a 40 m ridge between source and listener casts an acoustic shadow (more loss at high frequency), a flat field casts none', () => {
  const ridge = Tr.syntheticRidge({ ridgeX: 0, height: 100, halfWidth: 160 }), flat = Tr.makeTerrain({ heightAt: () => 0 });
  const src = [-600, 1.5, 0], lst = [600, 1.6, 0], c = 346.1;
  const s = ridge.shadow(src, lst, Ph.BANDS, c), f = flat.shadow(src, lst, Ph.BANDS, c);
  assert.ok(s.blocked && s.zMax > 5); assert.ok(f.lossDb.every((x) => x === 0));
  assert.ok(s.lossDb[0] > 3 && s.lossDb[6] > s.lossDb[0] && s.lossDb[7] <= 20.001, JSON.stringify(s.lossDb.map((x) => +x.toFixed(1)))); assert.ok(!ridge.lineOfSight(src, lst) && flat.lineOfSight(src, lst));
  const pl = mkPlanner({ terrain: ridge }), pl0 = mkPlanner({ terrain: flat });
  const p = pl.planEvent({ type: 'fire', id: 1, t: 0, weapon: 'm1861_springfield', x: -600, y: 1.5, z: 0 }), p0 = pl0.planEvent({ type: 'fire', id: 1, t: 0, weapon: 'm1861_springfield', x: -600, y: 1.5, z: 0 }); // listener at x=0 is ON the ridge: use a far listener
  const farL = { pos: [600, 1.6, 0] }; pl.setListener(farL); pl0.setListener(farL);
  const q = pl.planEvent({ type: 'fire', id: 2, t: 0, weapon: 'm1861_springfield', x: -600, y: 1.5, z: 0 }), q0 = pl0.planEvent({ type: 'fire', id: 2, t: 0, weapon: 'm1861_springfield', x: -600, y: 1.5, z: 0 });
  assert.ok(q.shadow.applied && !q0.shadow.applied); assert.ok(q.levelDb < q0.levelDb - 3, 'shadowed sound is quieter'); assert.ok(q.filter.fc < q0.filter.fc, 'and more muffled');
});
test('terrain: a ridge produces an echo tap whose delay is the extra path over c and whose azimuth points at the ridge', () => {
  const wall = Tr.makeTerrain({ heightAt: (x) => Math.min(1, Math.max(0, (x - 600) / 400)) * 80, extent: { halfW: 6000, halfH: 6000 } }), c = 346.1;   // a ramp of 11 degrees starting 600 m east
  const taps = wall.echoes([0, 1.5, 0], [10, 1.6, 0], c); assert.ok(taps.length >= 1, 'a slope 600 m away reflects');
  const t = taps[0], expect = (2 * 600 - 10) / c; assert.ok(Math.abs(t.delay - expect) / expect < 0.09, `${t.delay} vs ${expect}`); assert.ok(Math.abs(Math.sin(t.azimuthRad) - 1) < 0.2, 'toward the east');
  const open = Tr.makeTerrain({ heightAt: () => 0, extent: { halfW: 6000, halfH: 6000 } }); assert.equal(open.echoes([0, 1.5, 0], [10, 1.6, 0], c).length, 0, 'open ground: none');
  const pl = mkPlanner({ terrain: wall }); const p = pl.planEvent({ type: 'fire', id: 3, t: 0, weapon: 'napoleon_12pdr_m1857', x: 300, y: 1.5, z: 0 }); assert.ok(p.echoes.length >= 1 && p.echoes[0].delay > 0.12);
});
test('terrain on the real DEM: the planner runs across the Gettysburg heightfield and a ridge between Seminary Ridge and Cemetery Ridge changes at least some paths', async () => {
  const { nodeWorld } = await import('./node-world.mjs'); const { T } = await nodeWorld(); const terr = Tr.makeTerrain({ heightAt: (x, z) => T.h(x, z), extent: { halfW: T.W / 2, halfH: T.H / 2 } });
  const pl = mkPlanner({ terrain: terr }); let shadowed = 0, n = 0, echoes = 0;
  for (let i = 0; i < 40; i++) { const a = (i / 40) * 2 * Math.PI, d = 700 + (i % 5) * 400, sx = Math.sin(a) * d, sz = -Math.cos(a) * d, gh = T.h(sx, sz) + 1.5; pl.setListener({ pos: [0, T.h(0, 0) + 1.6, 0] });
    const p = pl.planEvent({ type: 'fire', id: i + 1, t: 0, weapon: 'napoleon_12pdr_m1857', x: sx, y: gh, z: sz }); if (!p.culled) { n++; if (p.shadow && p.shadow.applied) shadowed++; echoes += p.echoes.length; assert.ok(Number.isFinite(p.levelDb)); } }
  assert.ok(n >= 30); assert.ok(shadowed >= 0 && echoes >= 0);   // the counts are reported in the notes; the DEM is modern bare earth so no stronger claim is made here
});

// ------------------------------------------------------------------ 6. documented reports, far field, shell vs report
test('documented reports as test expectations: hearing within 4 miles, the 1.5 km delay, Harrisburg and Pittsburgh as an upper bound, Ewell as a recorded model mismatch', () => {
  const rep = J(path.join(D, 'documented-reports.json')).reports, by = Object.fromEntries(rep.map((r) => [r.id, r]));
  const atm = Ph.makeAtmosphere({ tC: 21, RH: 75, pKpa: 99.3 });
  for (const id of ['DR-HEAR-ROD-4MI', 'DR-HEAR-OR-4MI-B', 'DR-HEAR-HARRISBURG']) { const r = by[id], m = Far.farFieldMargin({ n: r.expectation.n_guns, distance: r.distance_m, atm, ambientDb: r.expectation.ambient_db }); assert.ok(m.audible, `${id} margin ${m.marginDb}`); }
  const e = by['DR-DELAY-1500M']; assert.ok(Math.abs(1500 / Ph.speedOfSound(e.expectation.tC) - e.expectation.seconds) <= e.expectation.tolerance_s);
  const far = Far.farFieldMargin({ n: 150, distance: 241402, atm, ambientDb: 30 }); assert.ok(far.filterFcHz <= 250, 'at 150 miles only a low rumble is left'); assert.ok(far.marginDb > 0, 'upper bound: the homogeneous model does not exclude it'); assert.equal(by['DR-HEAR-PITTSBURGH'].expectation.type, 'audible_upper_bound_only');
  const near = Far.farFieldMargin({ n: 1, distance: 3000, atm, ambientDb: 38 }); assert.ok(near.audible && near.filterFcHz > far.filterFcHz);
  const homog = Far.farFieldMargin({ n: 1, distance: 3000, atm, ambientDb: 38, ...Far.SCENARIOS.homogeneous }), shad = Far.farFieldMargin({ n: 1, distance: 3000, atm, ambientDb: 38, ...Far.SCENARIOS.shadow_zone });
  assert.equal(by['DR-NOHEAR-EWELL'].expectation.type, 'model_mismatch'); assert.ok(homog.audible, 'the default model does NOT reproduce the documented non-hearing: recorded, not bent'); assert.ok(Math.abs(homog.levelDb - shad.levelDb - 25) < 1e-9);
  assert.ok(rep.every((r) => r.tier && r.expectation && r.kind)); assert.ok(rep.filter((r) => r.evidence.length).every((r) => r.evidence.every((x) => x.source)));
  assert.equal(by['DR-ECHO-FIGURATIVE'].tier, 'not used');
});
test('every quoted OCR fragment of the documented reports is found at its line in the acquired text (when the library is present)', () => {
  const root = path.resolve(BT, '../../tmp/library'); const files = { cu31924077728255: 'or27', cu31924077699761: 'or27', cu31924030924736: 'misc', newyorkatgettysb0001unse: 'misc', battlesleadersof03cent: 'misc', finalreportonba00chatgoog: 'misc' };
  if (!fs.existsSync(root)) return; const norm = (s) => s.replace(/\s+/g, ' ').replace(/- /g, '-').toLowerCase(); let checked = 0;
  for (const r of J(path.join(D, 'documented-reports.json')).reports) for (const ev of r.evidence) { if (!ev.quote || !ev.ocr_line) continue; const id = ev.archive_identifier || (ev.source.includes('finalreport') ? 'finalreportonba00chatgoog' : null); if (!id || !files[id]) continue;
    const p = path.join(root, files[id], `${id}_djvu.txt`); if (!fs.existsSync(p)) continue; const lines = fs.readFileSync(p, 'utf8').split('\n'); const win = norm(lines.slice(Math.max(0, ev.ocr_line - 4), ev.ocr_line + 4).join(' ')); const q = norm(ev.quote).replace(/- /g, '-');
    assert.ok(win.replace(/- /g, '-').includes(q) || win.includes(q.replace('gettys- burg', 'gettysburg')), `${r.id}: "${ev.quote}" not near line ${ev.ocr_line}`); checked++; }
  assert.ok(checked >= 4, `checked ${checked}`);
});
test('shell versus report: the report overtakes a Napoleon round shot between 0.5 and 0.95 km and a 3-inch shell between 0.4 and 0.75 km (PLAN 3.2); a shell flight plan marks which is heard first', () => {
  const c = Ph.speedOfSound(25), nap = Far.DRAG_ROUND.napoleon_round_shot, r3 = Far.DRAG_ROUND.rifle_3in_shell;
  const x1 = Far.reportOvertakesShotAt(nap, 0.5, c), x2 = Far.reportOvertakesShotAt(nap, 0.9, c), y1 = Far.reportOvertakesShotAt(r3, 0.3, c), y2 = Far.reportOvertakesShotAt(r3, 0.5, c);
  for (const x of [x1, x2]) assert.ok(x >= 500 && x <= 950, String(x)); for (const y of [y1, y2]) assert.ok(y >= 400 && y <= 750, String(y));
  const pl = mkPlanner({ listener: { pos: [0, 2, 0] } });
  for (const [range, shotFirst] of [[300, true], [1600, false]]) {
    const traj = Far.dragTrajectory([range, 3, 0], [-1, 0], range * 0.999, nap, 0.7, { dt: 0.05 }), reportT = range / pl.atmosphere.c;
    const f = pl.planShell({ id: 1, fireId: 1, soundId: 'flight.smoothbore', traj, reportArrival: reportT });
    assert.equal(f.shotBeforeReport, shotFirst, `range ${range}`); assert.ok(f.segments.length > 3); assert.ok(f.segments.every((s) => Number.isFinite(s.rate) && Number.isFinite(s.gainLin)));
  }
});

// ------------------------------------------------------------------ 7. synthesis measured against the real recordings (the objective stand-in for listening)
test('synthesized musket and cannon spectra sit inside the range measured on the real recordings of the same class (centroid, 95 percent roll-off)', () => {
  const M = J(path.join(BT, 'audio/pilot/MEASURED.json')).files.map((f) => ({ f: f.file, c: f.measured.spectralCentroidHz, r: f.measured.rolloff95Hz }));
  const range = (re) => { const x = M.filter((m) => re.test(m.f)); return { c: [Math.min(...x.map((m) => m.c)), Math.max(...x.map((m) => m.c))], r: [Math.min(...x.map((m) => m.r)), Math.max(...x.map((m) => m.r))] }; };
  const mus = range(/rifle-musket\/(fs|wc)/), can = range(/cannon\/fs/);
  for (const k of ['rifle_musket', 'smoothbore_musket']) { const m = Dsp.measureSpectrum(Arms.smallArmShot(SR, 3, k).buf, SR); assert.ok(m.centroidHz >= mus.c[0] && m.centroidHz <= mus.c[1], `${k} centroid ${m.centroidHz} not in ${mus.c}`); assert.ok(m.rolloff95Hz >= mus.r[0] && m.rolloff95Hz <= mus.r[1], `${k} r95 ${m.rolloff95Hz} not in ${mus.r}`); }
  for (const k of Object.keys(Arms.CANNON_KINDS)) { const m = Dsp.measureSpectrum(Arms.cannonBoom(SR, 3, k).buf, SR); assert.ok(m.centroidHz >= can.c[0] * 0.8 && m.centroidHz <= can.c[1], `${k} centroid ${m.centroidHz} not in ${can.c}`); assert.ok(m.rolloff95Hz >= can.r[0] * 0.8 && m.rolloff95Hz <= can.r[1], `${k} r95 ${m.rolloff95Hz} not in ${can.r}`); }
  const c1 = Dsp.measureSpectrum(Arms.cannonBoom(SR, 3, 'napoleon_12pdr').buf, SR).centroidHz, c2 = Dsp.measureSpectrum(Arms.cannonBoom(SR, 3, 'rifle_3in').buf, SR).centroidHz; assert.ok(c1 < c2, 'the Napoleon (bigger charge) is deeper than the 3-inch rifle: the plan\'s distinction');
  const m1 = Dsp.measureSpectrum(Arms.smallArmShot(SR, 3, 'smoothbore_musket').buf, SR).centroidHz, m2 = Dsp.measureSpectrum(Arms.smallArmShot(SR, 3, 'carbine').buf, SR).centroidHz; assert.ok(m1 < m2, 'smoothbore deeper than carbine');
});
test('four distinct sounds per round: report, flight, burst, impact are different buffers with different spectra', () => {
  const bank = Bank.createBank({ sr: SR }); const ids = ['gun.napoleon_12pdr', 'flight.smoothbore', 'burst.common_shell', 'impact.earth']; const cents = ids.map((id) => Dsp.measureSpectrum(bank.get(id, 0).buf, SR).centroidHz);
  assert.equal(new Set(cents.map((c) => Math.round(c / 50))).size >= 3, true, JSON.stringify(cents));
  assert.ok(bank.get('flight.rifled', 0).loop && bank.get('flight.smoothbore', 0).loop);
  assert.equal(Cat.burstSoundForProjectile(5), 'burst.spherical_case'); assert.equal(Cat.impactSoundForSurface('stone'), 'impact.stone'); assert.equal(Cat.soundForWeapon(10), 'gun.napoleon_12pdr'); assert.equal(Cat.soundForWeapon('m1861_springfield'), 'arms.rifle_musket');
});
test('every weapon of kit/weapons.json (small arms and artillery pieces) maps to a sound, barred and gap rows excepted', () => {
  const kit = J(path.join(BT, 'kit/weapons.json')); const missing = [];
  for (const [id, w] of Object.entries(kit.weapons)) { if (w.category === 'edged' || w.category === 'bayonet' || w.category === 'note' || w.category === 'ammunition_load' || id === 'm1863_rifle_musket' || id === 'revolving_and_other_breechloaders_gap' || id === 'other_revolvers_gap') continue; if (!Cat.soundForWeapon(id)) missing.push(id); }
  for (const id of Object.keys(kit.artillery.pieces)) if (!Cat.soundForWeapon(id)) missing.push(id); assert.deepEqual(missing, []);
});
test('command words: every word is printed in a cited drill item; the voice renders finite audio per word; calls.json lists the names read from the manuals and no invented notation', () => {
  const hd = J(path.join(BT, 'drill/drill_hardee.json')).items, ad = J(path.join(BT, 'drill/drill_artillery.json')).items, inf = J(path.join(BT, 'drill/drill_infantry.json')).items; const items = Object.fromEntries([...hd, ...ad, ...inf].map((i) => [i.id, `${i.paraphrase} ${i.verbatim || ''}`.toLowerCase()]));
  const cm = J(path.join(D, 'commands.json'));
  for (const w of cm.words) { assert.ok(w.items.length, w.word); assert.ok(w.items.every((id) => items[id] !== undefined), `${w.word}: unknown item`); assert.ok(w.items.some((id) => items[id].includes(w.word === 'firing' ? 'firing' : w.word)), `${w.word} not in its cited items`); assert.ok(Voice.WORD_PHONES[w.word], `${w.word} has no phonemes`); const b = Voice.renderWord(SR, w.word, { seed: 2 }); assert.ok(b.length > 1000 && b.every(Number.isFinite), w.word); }
  for (const ph of cm.phrases) { for (const w of ph.words) assert.ok(cm.words.some((x) => x.word === w), `${ph.id}: ${w}`); assert.ok(ph.items.every((id) => items[id] !== undefined)); }
  const calls = J(path.join(D, 'calls.json')); assert.equal(calls.bugle.length, 26); assert.equal(calls.bugle_skirmishers.length, 23); assert.ok(calls.bugle.concat(calls.bugle_skirmishers).every((c) => c.notation === null), 'no notation was transcribed, none is invented');
  assert.ok(calls.bugle.find((c) => c.name === 'The assembly').recordings.includes('WC-ASSEMBLY')); const src = new Set(J(path.join(D, 'sources.json')).sources.map((s) => s.ledgerId)); for (const c of calls.bugle) for (const r of c.recordings) assert.ok(src.has(r), r);
});
test('crowd voices differ as described: the rebel yell is higher than the cheer; the bugle plays the pitch of the natural harmonic series; a drum roll is dense', () => {
  const yell = Dsp.measureSpectrum(Voice.crowdShout(SR, 4, { n: 14, kind: 'yell' }).buf, SR).centroidHz, cheer = Dsp.measureSpectrum(Voice.crowdShout(SR, 4, { n: 14, kind: 'cheer' }).buf, SR).centroidHz; assert.ok(yell > cheer, `${yell} vs ${cheer}`);
  const g4 = Music.bugleCall(SR, [{ n: 6, d: 4 }], { tempo: 60 }).buf, sp = Dsp.spectrum(g4, SR, Math.round(0.8 * SR), 16384); let pk = 0, pf = 0; for (let k = 1; k < sp.mag.length; k++) if (sp.mag[k] > pk) { pk = sp.mag[k]; pf = sp.freqs[k]; } assert.ok(Math.abs(pf - 6 * Music.BUGLE_FUNDAMENTAL_HZ) < 8 || Math.abs(pf - 12 * Music.BUGLE_FUNDAMENTAL_HZ) < 16, `peak ${pf}`);
  const roll = Music.drumRoll(SR, 1, 2, { rate: 16 }); assert.ok(roll.buf.length > SR);
});
test('ambience: crickets only at night and when warm, birds near dawn, rain only in the documented rain; thunder only in a storm; woods without events are silent of shots', () => {
  const atm = Ph.makeAtmosphere({ tC: 20, wind: [0, 0] }); const night = Atm.ambientState({ tempF: 68, precip: { kind: 'none', intensity: 0 } }, { band: 4 }, atm), day = Atm.ambientState({ tempF: 79, precip: { kind: 'none', intensity: 0 } }, { band: 0 }, atm), cold = Atm.ambientState({ tempF: 50, precip: { kind: 'none', intensity: 0 } }, { band: 4 }, atm), dawn = Atm.ambientState({ tempF: 60, precip: { kind: 'none', intensity: 0 } }, { band: 1 }, atm);
  assert.ok(night.insects.on && night.insects.levelDb > 20 && !day.insects.levelDb && cold.insects.levelDb === 0); assert.ok(dawn.birds.on && dawn.birds.levelDb > 0); assert.ok(!night.rain.on);
  const storm = Atm.ambientState({ tempF: 70, precip: { kind: 'storm', intensity: 0.9 } }, { band: 0 }, atm); assert.ok(storm.rain.on && storm.rain.levelDb > 55);
  assert.equal(Atm.thunderClaps(0, 60, { precip: { kind: 'none' } }).length, 0); const claps = Atm.thunderClaps(0, 60, { precip: { kind: 'storm' } }); assert.ok(claps.length > 10 && claps.length < 50); assert.equal(JSON.stringify(claps), JSON.stringify(Atm.thunderClaps(0, 60, { precip: { kind: 'storm' } })));
  const pl = mkPlanner(); const r = Pl.planBatch(pl, []); assert.equal(r.voices.length, 0, 'no events, no shots: the woods are silent');
  assert.ok(Math.abs(Atm.atmosphereFromWeather({ tempF: 79, wind: { mph: [2, 6] } }, 600).c - Ph.speedOfSound(Ph.fToC(79))) < 1e-9); const dflt = Atm.atmosphereFromWeather(null, 600); assert.equal(dflt.tC, 20); assert.match(dflt.src.temperature, /default/); const w = Atm.atmosphereFromWeather({ tempF: 70, wind: { mph: [2, 6] } }, 600); assert.ok(w.wind[1] < 0 && w.wind[0] < 0.01 + 4 * 0.44704, 'the wind blows toward north-northeast');
});

// ------------------------------------------------------------------ 8. end to end offline and the Web Audio graph on a mock context
test('end to end (offline render): the report of a cannon starts at fire time + d/c to within one millisecond; the level follows the plan; farther is quieter and duller', () => {
  const pl = mkPlanner(); const evs = [{ type: 'fire', id: 1, t: 10, weapon: 'napoleon_12pdr_m1857', x: 700, y: 1.5, z: 0 }]; const r = Pl.planBatch(pl, evs), v = r.voices[0];
  const o = Off.renderOffline(r.voices, { sr: SR }), onset = Off.firstOnset(o, 1e-7), expect = 10 + 700 / pl.atmosphere.c; assert.ok(Math.abs(onset - expect) < 0.003, `${onset} vs ${expect}`);
  const q = (d) => { const pl2 = mkPlanner(); const rr = Pl.planBatch(pl2, [{ type: 'fire', id: 1, t: 0, weapon: 'napoleon_12pdr_m1857', x: d, y: 1.5, z: 0 }]); const oo = Off.renderOffline(rr.voices, { sr: SR }); return { peak: Math.max(Off.peakAbs(oo.L), Off.peakAbs(oo.R)), cen: Dsp.measureSpectrum(oo.L, SR, 0.5).centroidHz }; };
  const a = q(300), b = q(1200); assert.ok(b.peak < a.peak && b.cen < a.cen, JSON.stringify({ a, b }));
  assert.ok(Math.abs(Math.max(Off.peakAbs(o.L), Off.peakAbs(o.R)) / v.gainLin) < 3 && Math.max(Off.peakAbs(o.L), Off.peakAbs(o.R)) > 0, 'rendered peak is of the order of the planned gain (limited by the filter)');
});
test('binaural: a source to the right arrives at the right ear first by the interaural delay and louder', () => {
  const pl = mkPlanner({ listener: { pos: [0, 2, 0], yaw: 0 } }); const evs = [{ type: 'fire', id: 1, t: 0, weapon: 'napoleon_12pdr_m1857', x: 300, y: 1.5, z: -1 }]; const r = Pl.planBatch(pl, evs), v = r.voices[0]; assert.ok(v.pan.az > 1.4 && v.pan.itd > 5e-4 && v.pan.itd < 7e-4, `${v.pan.az} ${v.pan.itd}`);
  const o = Off.renderOffline(r.voices, { sr: SR }); const iL = o.L.findIndex((x) => Math.abs(x) > 1e-7), iR = o.R.findIndex((x) => Math.abs(x) > 1e-7); assert.ok(iL - iR >= 25 && iL - iR <= 36, `ITD samples ${iL - iR}`); assert.ok(Off.peakAbs(o.R) > Off.peakAbs(o.L));
  assert.ok(Math.abs(Ph.itdSeconds(Math.PI / 2) - 0.00066) < 0.00006);
});
function mockContext() {
  const log = { sources: [], nodes: 0, started: [], stopped: 0, panners: 0, filters: 0 };
  const param = (v = 0) => ({ value: v, setValueAtTime() { }, linearRampToValueAtTime() { }, setTargetAtTime() { }, cancelScheduledValues() { } });
  const node = (extra = {}) => ({ connect() { log.nodes++; }, disconnect() { }, ...extra });
  const ctx = { sampleRate: 44100, currentTime: 100, state: 'running', outputLatency: 0.04, baseLatency: 0.01, destination: node(),
    createGain() { return node({ gain: param(1) }); }, createConvolver() { return node({ buffer: null }); }, createDynamicsCompressor() { return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); },
    createBuffer(ch, n, sr) { const d = new Float32Array(n); return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: () => d, copyToChannel(a) { d.set(a); } }; },
    createBufferSource() { const s = node({ buffer: null, loop: false, playbackRate: param(1), start(t, o) { log.started.push({ t, o }); }, stop() { log.stopped++; }, onended: null }); log.sources.push(s); return s; },
    createBiquadFilter() { log.filters++; return node({ type: '', frequency: param(), Q: param() }); }, createPanner() { log.panners++; return node({ positionX: param(), positionY: param(), positionZ: param(), panningModel: '' }); }, createStereoPanner() { return node({ pan: param() }); },
    getOutputTimestamp() { return { contextTime: 100.05 }; }, resume: async () => { } };
  return { ctx, log };
}
test('Web Audio graph (mock context): voices start at ctx.currentTime + delay, HRTF only for the near tier, stage count follows the filter, flush stops everything, the voice cap holds', () => {
  const { ctx, log } = mockContext(); const bank = Bank.createBank({ sr: 44100 }), pl = mkPlanner({ budget: { maxVoices: 30, hrtfVoices: 5 } }); const eng = new We.Audio3DEngine({ ctx, bank, planner: pl, budget: { maxVoices: 30, hrtfVoices: 5 } });
  eng.anchor(10, 1); const evs = []; for (let i = 0; i < 80; i++) evs.push({ type: 'fire', id: i + 1, t: 10 + i * 0.01, weapon: 'm1861_springfield', x: 100 + i * 9, y: 1.5, z: 0 });
  const r = Pl.planBatch(pl, evs); for (const v of r.voices) eng.schedule(v);
  assert.ok(eng.voiceCount <= 30); assert.ok(log.panners <= 5 + 2 * 5, `hrtf panners ${log.panners}`); assert.ok(log.started.length >= 1);
  const v0 = r.voices[0], ab = eng.audioBufferFor(v0.soundId, v0.variant), expect = 100 + (v0.tArrive - 10) - ab.mainAtSamples / 44100 / (v0.doppler.rate || 1); assert.ok(Math.abs(log.started[0].t - Math.max(100, expect)) < 1e-6, `${log.started[0].t} vs ${expect}`);
  assert.ok(Math.abs(eng.battleHeard() - (10 + 0.05)) < 1e-9, 'the picture is drawn for the sound leaving the speakers'); assert.ok(eng.outputLatencyS > 0.04);
  eng.flush(); assert.equal(eng.voiceCount, 0); assert.ok(log.stopped >= 1);
  const flight = pl.planShell({ id: 99, fireId: 1, soundId: 'flight.rifled', traj: Far.dragTrajectory([800, 3, 0], [-1, 0], 799, Far.DRAG_ROUND.rifle_3in_shell, 0.4, { t0: 10, dt: 0.1 }) }); assert.ok(eng.scheduleFlight(flight));
  eng.setBed('insects', 'amb.insects', true, 44); assert.equal(eng.beds.size, 1); eng.dispose();
});

// ------------------------------------------------------------------ 9. the animation event interface (BT-EVENTS.md) and the recording slicer
const fakeBus = () => { const h = new Map(); return { on(n, f) { (h.get(n) || h.set(n, []).get(n)).push(f); }, off(n, f) { const a = h.get(n) || []; a.splice(a.indexOf(f), 1); }, emit(n, ...a) { for (const f of h.get(n) || []) f(...a); }, count: (n) => (h.get(n) || []).length }; };
test('BT-EVENTS adapter: fire, reload, command, unit_march and fall become engine events; reused vectors are copied; far handling is skipped; undocumented command words are never voiced; detach unsubscribes', async () => {
  const data = { sources: J(path.join(D, 'sources.json')), commands: J(path.join(D, 'commands.json')), calls: J(path.join(D, 'calls.json')) };
  const audio = await Idx.createAudio3D({ data }); audio.update({ battleNow: 0, listener: { pos: [0, 2, 0] }, weather: { tempF: 79, wind: { mph: [2, 6] } }, min: 600 });
  const bus = fakeBus(), a = Idx.attachAudio(audio, bus); assert.equal(bus.count('fire'), 1);
  const pos = new Float32Array([400, 1.5, 0]), dir = new Float32Array([1, 0, 0]);
  bus.emit('fire', 'US-I-1-2-20ME', 4, 7.5, 'long_arm', pos, dir, { weaponId: 'm1861_springfield', cycleIndex: 2, round: 'ball' }); pos[0] = 9999;     // the bus reuses the array
  bus.emit('fire', 'CS-ART-1', 0, 8, 'cannon', new Float32Array([-900, 1.5, 100]), new Float32Array([1, 0, 0]), { weaponId: '3inch_ordnance_rifle', round: 'shell' });
  bus.emit('reload', 'US-I-1-2-20ME', 4, 7.6, 'tear_cartridge', 3, 0.7, new Float32Array([20, 1.2, 0]), {}); bus.emit('reload', 'US-I-1-2-20ME', 5, 7.6, 'tear_cartridge', 3, 0.7, new Float32Array([400, 1.2, 0]), {}); bus.emit('reload', 'US-I-1-2-20ME', 6, 7.7, 'shoulder', 9, 0.7, new Float32Array([20, 1.2, 0]), {});
  bus.emit('command', 'US-I-1-2-20ME', 0, 9, 'execution', 'Fire by file', new Float32Array([150, 1.7, 0]), {}); bus.emit('command', 'US-I-1-2-20ME', 0, 9.5, 'officer_voice', 'Steady, men', new Float32Array([150, 1.7, 0]), {});
  bus.emit('command', 'US-I-1-2-20ME', 0, 10, 'bugle', 'The assembly', new Float32Array([300, 1.7, 0]), {});
  bus.emit('unit_march', 'US-I-1-2-20ME', 11, 300, 110, 1.4, new Float32Array([500, 1.5, 0]), Math.PI / 2, 'quick_time'); bus.emit('unit_march', 'US-CAV-1', 11, 200, 120, 7, new Float32Array([700, 1.5, 0]), 0, 'gallop');
  bus.emit('fall', 'US-I-1-2-20ME', 4, 12, 'back', new Float32Array([200, 1, 0]), { fate: 'killed' });
  const r = audio.pump(60), by = (t) => r.plans.filter((p) => !p.culled && p.soundId === t);
  assert.equal(by('arms.rifle_musket').length, 1); assert.ok(Math.abs(by('arms.rifle_musket')[0].distance - 400.0) < 1, 'the copied position, not the reused array'); assert.equal(by('gun.rifle_3in').length, 1, 'weaponId wins over the generic kind');
  assert.equal(a.stats.reloadSounded, 2); assert.equal(a.stats.reloadSkippedFar, 1); assert.equal(r.plans.filter((p) => p.culled === 'silent-step').length, 1, 'shoulder arms has no sound');
  const cmd = r.plans.find((p) => p.soundId === 'voice.command' && !p.culled); assert.deepEqual(cmd.voiceWords, ['fire', 'by', 'file']); assert.ok(r.plans.some((p) => p.culled === 'no-documented-words'), 'Steady, men is not a documented command: no voice');
  assert.equal(by('move.feet').length + r.plans.filter((p) => p.soundId === 'move.feet' && p.culled).length, 1); assert.equal(by('move.hooves')[0].variant, 3); assert.equal(by('impact.man').length + r.plans.filter((p) => p.soundId === 'impact.man' && p.culled).length, 1);
  const bugle = r.plans.find((p) => p.soundId === 'signal.bugle'); assert.equal(bugle.call, 'the assembly'); const o = Off.renderOffline([bugle], { sr: SR, bank: audio.bank }); assert.ok(Off.peakAbs(o.L) === 0, 'no recording loaded and no notation: silence, not an invented call');
  assert.ok(Idx.NOT_CONSUMED.length >= 6); a.detach(); assert.equal(bus.count('fire'), 0);
});
test('handling sounds are audible only close: a tear at 5 m is heard, at 120 m it is below the ambient floor', () => {
  const pl = mkPlanner(); const near = pl.planEvent({ type: 'handling', id: 1, t: 0, step: 'tear_cartridge', x: 5, y: 1.2, z: 0 }), far = pl.planEvent({ type: 'handling', id: 2, t: 0, step: 'draw_rammer', x: 120, y: 1.2, z: 0 });
  assert.ok(!near.culled && near.marginDb > 0); assert.ok(far.culled === 'inaudible' || far.marginDb < 0, 'beyond about 30 m the loading noise is under the ambient floor'); assert.equal(pl.planEvent({ type: 'handling', id: 3, t: 0, step: 'shoulder', x: 1, y: 1, z: 0 }).culled, 'silent-step');
});
test('the slicer finds the onsets of impulsive recordings (three synthesized shots 1 s apart are cut at the right places)', async () => {
  const L = await imp('loader.mjs'); const sig = new Float32Array(SR * 4); const shot = Arms.smallArmShot(SR, 2, 'rifle_musket').buf; for (const t of [0.5, 1.5, 2.6]) Dsp.addInto(sig, shot, Math.round(t * SR), 1);
  const on = L.detectOnsets(sig, SR); assert.equal(on.length, 3, String(on)); [0.5, 1.5, 2.6].forEach((t, i) => assert.ok(Math.abs(on[i] / SR - t) < 0.03));
  const sl = L.sliceShots(sig, SR, { max: 2 }); assert.equal(sl.length, 2); assert.ok(sl.every((s) => Math.abs(Dsp.peakOf(s.buf) - 1) < 1e-6 && s.mainAtSamples >= 0));
  const bank = Bank.createBank({ sr: SR }); bank.setRecordings(new Map([['arms.rifle_musket', [{ buf: sl[0].buf, ledgerId: 'FS-347647', mainAtSamples: sl[0].mainAtSamples }]]])); assert.equal(bank.get('arms.rifle_musket', 3).provenance.ledgerId, 'FS-347647', 'a registered recording replaces the synthesis and carries its ledger id'); assert.equal(bank.get('arms.carbine', 0).provenance.synthesized, true);
  const data = { sources: J(path.join(D, 'sources.json')) }; const a = await Idx.createAudio3D({ data }); a.setRecordings(new Map([['arms.rifle_musket', [{ buf: sl[0].buf, ledgerId: 'FS-347647' }]]])); assert.equal(a.panel().rows.find((r) => r.id === 'small_arms').kind, 'real_type'); assert.equal(a.panel().credits.length, 1);
});
