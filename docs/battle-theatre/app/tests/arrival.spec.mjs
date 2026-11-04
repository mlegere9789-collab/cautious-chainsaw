// Gate Q04 (arrival check) and the scenario selector, through the page, against the REAL history layer: a unit before its arrival window must not render; arrival is a march;
// an event before the earliest arrival is refused by the sim event cache; the source-conflict scenarios carry every value, default to "PDF recommended, pending owner", and move
// the units the ledger links to them.   node --test docs/battle-theatre/app/tests/arrival.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer, launch, open, enter } from './lib.mjs';

let S, B, page, ctx, log;
test.before(async () => { S = await startServer(10783); B = await launch(); ({ ctx, page, log } = await open(B, S.base)); await enter(page); });
test.after(async () => { await ctx.close(); await B.close(); await S.close(); });
const frames = n => page.evaluate(n => window.btApp.frames(n), n);
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
const at = async t => { await page.locator('#bt-slider').fill(String(Math.floor(t))); await frames(3); };

test('the page runs the real layer: 726 units, a handful placed, the rest marked open gap', async () => {
  const r = await page.evaluate(() => { const L = window.btApp.layer; return { stub: L.meta.stub, n: L.units.length, counts: L.counts, rejected: window.btApp.rejected.length }; });
  assert.equal(r.stub, false); assert.equal(r.n, 726); assert.ok(r.counts.moving > 0 && r.counts.edge_only > 0 && r.counts.not_drawn > 100); assert.equal(r.rejected, 0);
  console.log(`# ${r.counts.moving} units placed, ${r.counts.edge_only} at the arrival edge only, ${r.counts.not_drawn} open gap, ${r.counts.aggregate} formations, ${r.counts.not_on_field} not on the field`);
});

test('across the whole window, in every frame sampled: nothing is drawn before its window opens, and the renderer was told exactly what the stage holds', async () => {
  const r = await page.evaluate(async () => {
    const a = window.btApp, st = a.stage, th = a.theatre; th.host.keepLast = true; const n = st.layer.units.length, ids = st.layer.units.map(u => u.id); let samples = 0, mismatches = 0, drawnEarly = 0, maxPresent = 0, nonDrawnShown = 0;
    for (let t = 36000 + 7; t < 63360; t += 97) {
      a.setTime(t); await a.frames(1); samples++;
      const sent = th.host.lastUnits; let sentOn = 0, early = 0;
      for (let i = 0; i < n; i++) { const on = Math.abs(sent[i * 12]) < 1e5; if (on) { sentOn++; if (!st.layer.units[i].drawn) nonDrawnShown++; } const p = st.presence[ids[i]]; if (on && (!p || t * 60 < p.from)) early++; if (on !== !!st.present[i]) mismatches++; }
      drawnEarly += early; maxPresent = Math.max(maxPresent, sentOn);
    }
    return { samples, drawnEarly, mismatches, maxPresent, units: n, drawn: st.layer.counts.drawn, nonDrawnShown };
  });
  console.log(`# ${r.samples} frames across 26 Jun - 14 Jul: units sent to the renderer before their window opened: ${r.drawnEarly}; table/stage mismatches: ${r.mismatches}; most units on the field at once: ${r.maxPresent} of ${r.drawn} placed units (${r.units} in the roster)`);
  assert.equal(r.drawnEarly, 0); assert.equal(r.mismatches, 0); assert.equal(r.maxPresent, r.drawn); assert.equal(r.nonDrawnShown, 0, 'a unit the layer does not draw was sent to the renderer');
});

test('an event before a unit\'s earliest arrival is refused by the sim event cache (Q04), listed, and the page says so', async () => {
  const r = await page.evaluate(() => {
    const a = window.btApp, st = a.stage, id = a.layer.units.find(u => u.drawn).id, arr = st.arrivals.get(id), i = st.index.get(id);
    const ok = st.cache.add({ t: (arr.earliest - 180) * 60, unit: id, type: 'path', path: { t: [(arr.earliest - 180) * 60, (arr.earliest - 170) * 60], x: [0, 1], z: [0, 1], s: [60, 60] } });
    return { ok, rej: st.rejected.map(x => ({ reason: x.reason, unit: x.ev.unit })), id, i };
  });
  assert.equal(r.ok, false); assert.equal(r.rej.length, 1); assert.match(r.rej[0].reason, /Q04/); assert.equal(r.rej[0].unit, r.id);
  await page.click('[data-panel=info]'); const txt = await page.locator('#bt-drawer-body').innerText();
  assert.match(txt, /1 refused by the arrival rule/); assert.match(txt, /Input hash/); assert.match(txt, /bt-sim-0\.1/); assert.match(txt, /What is placed, and what is an open gap/i); await page.keyboard.press('Escape');
  await page.evaluate(() => { const st = window.btApp.stage; st.cache.rejected.length = 0; });      // the injected probe is not part of the run
});

test('a unit that has not arrived is not drawn (pixels), is absent from the unit list and says so on its card; then it marches in from the edge and is drawn', async () => {
  const info = await page.evaluate(() => {
    const a = window.btApp, st = a.stage, L = a.layer, i = L.focus, u = L.units[i], arr = st.arrivals.get(u.id), ev = L.events(a.state.scenario).filter(e => e.unit === u.id && e.type === 'path'), tFinal = ev[ev.length - 1].wp.at(-1).t;
    return { i, id: u.id, earliest: arr.earliest, def: arr.default, tFinal, slot: st.slots[i], count: st.w.units[i].count, name: u.name, tier: u.tier };
  });
  assert.equal(info.tier, 'plausible-procedural');
  // camera straight above the unit's place, light fixed so only the unit can change the picture
  await at(minOf(6, 28, 12)); await page.evaluate(({ i }) => { const a = window.btApp, th = a.theatre, st = a.stage; a.setPlaying(false); a.lock(true); const s = st.slots[i], g = th.T.h(s.x, s.z); th.controls.flyTo({ x: s.x, y: g + 70, z: s.z - 10, yaw: 0, pitch: -1.45, fov: 50 }, 0); }, { i: info.i });
  const region = { x: 480, y: 180, width: 380, height: 380 };
  const shot = async () => { await frames(4); return page.screenshot({ clip: region }); };
  const diff = async (A, Bm) => page.evaluate(async ([a, b]) => { const ld = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height).data; }; const X = await ld(a), Y = await ld(b); let n = 0; for (let i = 0; i < X.length; i += 4) if (Math.abs(X[i] - Y[i]) + Math.abs(X[i + 1] - Y[i + 1]) + Math.abs(X[i + 2] - Y[i + 2]) > 24) n++; return n / (X.length / 4); }, [A.toString('base64'), Bm.toString('base64')]);
  const empty = await shot();                                                                             // nobody on the field anywhere
  await at(info.earliest - 1); const state1 = await page.evaluate(i => ({ present: window.btApp.stage.present[i], x: window.btApp.stage.w.unitF[i * 12] }), info.i); const before = await shot();
  assert.equal(state1.present, 0); assert.equal(state1.x, 1e6, 'parked off the world, not drawn');
  const dBefore = await diff(empty, before); console.log(`# ${info.name} (${info.count} figures), one minute before its window opens: ${(dBefore * 100).toFixed(3)}% of the pixels around its place differ from the empty field`);
  assert.ok(dBefore < 0.0005, `${(dBefore * 100).toFixed(3)}% of pixels differ before arrival`);
  // keyboard route: the Units list at this time does not offer it; its card (selected by the page) says the window has not opened
  await page.click('[data-panel=views]'); await page.click('#vw-tabs [data-tab=unit]'); await page.fill('#vw-q', info.id); await page.waitForTimeout(250);
  assert.equal(await page.locator('#bt-drawer-body .item').count(), 0, 'not offered while absent'); await page.keyboard.press('Escape');
  await page.evaluate(i => window.btApp.select(i), info.i); await frames(8); const card = await page.locator('#bt-card').innerText(); assert.match(card, /not yet: its arrival window has not opened/); assert.match(card, /Plausible-procedural|plausible-procedural/); assert.match(card, /procedural share/);
  // it appears at the edge of the loaded ground (a march, not a spawn) and then walks to its place
  await at(info.def + 1); const early = await page.evaluate(i => { const st = window.btApp.stage; return { present: st.present[i], x: st.cx[i], z: st.cz[i], W: st.T.W / 2, H: st.T.H / 2 }; }, info.i); assert.equal(early.present, 1);
  assert.ok(Math.abs(early.x) > early.W || Math.abs(early.z) > early.H, 'at the moment it exists it is outside the loaded ground, on its road: a march in, not a spawn');
  await at(info.tFinal + 1); const after = await shot(); const dAfter = await diff(empty, after);
  const st2 = await page.evaluate(i => ({ present: window.btApp.stage.present[i], act: window.btApp.stage.act[i] }), info.i); console.log(`# after it has marched in (activity: ${st2.act}): ${(dAfter * 100).toFixed(2)}% of the pixels around its place differ`);
  assert.equal(st2.present, 1); assert.equal(st2.act, 'stand'); assert.ok(dAfter > 0.004, `unit not visible after arrival (${(dAfter * 100).toFixed(2)}%)`);
  await page.evaluate(() => { window.btApp.lock(false); window.btApp.select(-1); });
});

test('scenario selector: carries all 47 register conflicts and the weather conflicts; default is "PDF recommended, pending owner"; a choice moves the units the ledger links to it', async () => {
  await page.click('[data-panel=scenario]'); const body = page.locator('#bt-drawer-body');
  assert.match(await body.locator('#sc-label').innerText(), /^PDF recommended, pending owner$/);
  const ids = await body.locator('.conflict h3 .id').allInnerTexts(); const reg = ids.filter(x => /^C-\d+$/.test(x)), wx = ids.filter(x => /^CF-/.test(x));
  assert.equal(reg.length, 47); assert.deepEqual(reg.sort(), Array.from({ length: 47 }, (_, i) => 'C-' + String(i + 1).padStart(3, '0'))); assert.ok(wx.length >= 5);
  const printed = await body.locator('.conflict[data-id="C-004"] .printed').innerText(); assert.match(printed, /22:30 Jul 1/); assert.match(printed, /06:00 Jul 2/);
  const opts = await body.locator('.conflict[data-id="C-004"] select option').allInnerTexts(); for (const v of ['22:30 Jul 1', 'at dawn', '06:00', '07:00 Jul 2']) assert.ok(opts.some(o => o.includes(v)), `option ${v}`);
  // the real layer links C-004 to the II Corps arrival (and the ledger rows citing it)
  const grp = () => page.evaluate(() => [...window.btApp.stage.arrivals.values()].filter(a => a.unit.startsWith('us-2c')).map(a => ({ u: a.unit, d: a.default, e: a.earliest, c: a.conflict })));
  const before = await grp(); assert.ok(before.length > 40 && before.every(a => a.d === minOf(7, 2, 6)), 'recommended: every II Corps unit arrives at the printed 06:00 Jul 2'); assert.ok(before.every(a => a.c === 'C-004'), 'and each says it follows C-004');
  await body.locator('.conflict[data-id="C-004"] select').selectOption({ label: '22:30 Jul 1' }); await frames(4);
  assert.match(await body.locator('#sc-label').innerText(), /Custom: 1 choice/);
  const after = await grp(); assert.equal(after.length, before.length); assert.equal(Math.min(...after.map(a => a.d)), minOf(7, 1, 22, 30), 'the corps follows the printed value'); assert.ok(after.every(a => a.d >= minOf(7, 1, 22, 30)), 'no II Corps unit is drawn before the chosen time');
  assert.ok(after.some(a => a.d === minOf(7, 2, 0) && a.c === null), 'a division whose own gate is only a date (Jul 2) stays at that date, is never drawn before the corps, and no longer claims to follow C-004');
  await page.click('#sc-reset'); await frames(3); assert.match(await body.locator('#sc-label').innerText(), /^PDF recommended, pending owner$/);
  assert.deepEqual(await grp(), before, 'reset restores the recommended values');
  // a drawn unit follows its conflict: the 20th Maine arrives with V Corps (C-003: 05:00 or 08:00); only the chosen time lets it exist
  const id = 'us-5c-1d-vincent-20me'; const pres = t => page.evaluate(({ id, t }) => { const a = window.btApp; a.setTime(t); return a.frames(2).then(() => a.stage.present[a.stage.index.get(id)]); }, { id, t });
  const def = await page.evaluate(id => window.btApp.stage.arrivals.get(id).default, id); assert.equal(def, minOf(7, 2, 8));
  assert.equal(await pres(minOf(7, 2, 7, 59)), 0);
  const c3 = await page.evaluate(() => window.btApp.theatre.conflicts.find(c => c.id === 'C-003').options.map(o => ({ k: o.key, t: o.text })));
  await body.locator('.conflict[data-id="C-003"] select').selectOption({ label: c3.find(o => o.k === 'v0').t }); await frames(4);
  assert.equal(await page.evaluate(id => window.btApp.stage.arrivals.get(id).default, id), minOf(7, 2, 5)); assert.equal(await pres(minOf(7, 2, 4, 59)), 0); assert.equal(await pres(minOf(7, 2, 5)), 1, 'the unit exists from the chosen time');
  await page.click('#sc-reset'); await frames(3); assert.equal(await pres(minOf(7, 2, 5)), 0, 'and not before the recommended 08:00 once the choice is reset');
  // a weather conflict changes the weather state it is linked to
  await at(minOf(7, 4, 15)); const rainDefault = await page.evaluate(() => window.btApp.theatre.wx.precip.intensity);
  await body.locator('.conflict[data-id="CF-JUL4-RAIN-TIMING"] select').selectOption({ index: 2 }); await frames(30); const rainAlt = await page.evaluate(() => window.btApp.theatre.wx.precip);
  console.log(`# 4 Jul 15:00 rain intensity: default ${rainDefault.toFixed(2)}; with the second printed schedule ${rainAlt.intensity.toFixed(2)} (${rainAlt.text})`); assert.notEqual(rainDefault, rainAlt.intensity);
  await page.click('#sc-reset'); await page.keyboard.press('Escape');
});

test('no console errors', async () => { assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); });
