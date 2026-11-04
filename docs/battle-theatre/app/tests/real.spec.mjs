// The real history layer through the page: honest labelling of what is placed and what is an open gap, cards for a placed unit and for a unit with no place, the Units list,
// kit manifest, source keys and register links, the evidence overlay with the layer's units, works drawn as rings.   node --test docs/battle-theatre/app/tests/real.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer, launch, open, enter } from './lib.mjs';

let S, B, page, ctx, log;
test.before(async () => { S = await startServer(10785); B = await launch(); ({ ctx, page, log } = await open(B, S.base)); await enter(page); });
test.after(async () => { await ctx.close(); await B.close(); await S.close(); });
const frames = n => page.evaluate(n => window.btApp.frames(n), n);
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
const at = async t => { await page.locator('#bt-slider').fill(String(Math.floor(t))); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await frames(3); };
const FORBIDDEN = /\b(AI|A\.I\.|Claude|Anthropic|LLM|language model|generated|automated|subagent|agent|prompt)\b/i;

test('honest labelling: the ribbon, the count, the About text and the landing copy say what is placed and what is an open gap; nothing claims accuracy or mentions how the page was made', async () => {
  await at(minOf(7, 1, 12));
  const ribbon = await page.locator('#bt-ribbon').innerText(); assert.match(ribbon, /Version 0 of the record/); assert.match(ribbon, /open gap/); assert.match(ribbon, /procedural shares/);
  const count = await page.locator('#bt-count').innerText(); assert.match(count, /figures/); assert.match(count, /units placed on the field/); assert.match(count, /open gap/); assert.ok(!/Modelled placeholder/.test(count));
  await page.click('[data-panel=info]'); const body = await page.locator('#bt-drawer-body').innerText();
  assert.match(body, /What is placed, and what is an open gap/i); assert.match(body, /procedural shares/); assert.match(body, /plausible-procedural/); assert.match(body, /modern landscape|not the 1863 landscape/i);
  assert.ok(!FORBIDDEN.test(body)); assert.ok(!/\b(accurate|historically accurate|exactly where|verified)\b/i.test(body)); assert.ok(!/Modelled placeholder/.test(body)); await page.keyboard.press('Escape');
  const whole = await page.locator('body').innerText(); assert.ok(!FORBIDDEN.test(whole)); const html = await page.content(); assert.ok(!/claude|anthropic/i.test(html));
});

test('a placed unit: Units list, card with strength basis, entry, arrival note, tier, sources, kit manifest and a register link that opens', async () => {
  const info = await page.evaluate(() => { const a = window.btApp, L = a.layer, u = L.units[L.focus], ev = L.events(a.state.scenario).filter(e => e.unit === u.id && e.type === 'path'); return { id: u.id, i: L.focus, name: u.name, t: ev[0].wp.at(-1).t + 1, share: u.strength.drawn }; });
  await at(info.t); await page.click('[data-panel=views]'); await page.click('#vw-tabs [data-tab=unit]'); await page.fill('#vw-q', info.id); await page.waitForTimeout(250);
  assert.equal(await page.locator('#bt-drawer-body .item').count(), 1, 'the unit on the field is offered'); assert.match(await page.locator('#bt-drawer-body .item').innerText(), new RegExp(`${info.share} figures`));
  await page.focus('#bt-drawer-body .item'); await page.keyboard.press('Enter'); await page.waitForSelector('#bt-card:not([hidden])'); await page.keyboard.press('Escape'); await frames(8);
  const card = page.locator('#bt-card'), txt = await card.innerText();
  for (const w of ['Placed', 'Plausible-procedural', 'Time', 'Activity', 'Standing', 'Position', 'Strength', `about ${info.share}`, 'procedural share', 'Arrival window', 'Entry', 'where Emmitsburg Road leaves the loaded ground', 'Strength basis', 'Evidence', 'PDF-B3', 'SS1', 'Kit manifest', 'Headgear', 'Shoulder arm', 'not run', 'EG-0001']) assert.ok(txt.toLowerCase().includes(w.toLowerCase()), `card shows ${w}`);
  assert.match(txt, /Busey and Martin not available/); assert.match(txt, /Hardee/i, 'the Iron Brigade kit record is used');
  const href = await card.locator('a.btn-s').first().getAttribute('href'); assert.match(href, /register\/EG-0001\.md$/); const res = await page.request.get(href); assert.equal(res.status(), 200);
  assert.ok(!FORBIDDEN.test(txt)); await page.evaluate(() => window.btApp.select(-1)); await frames(2);
});

test('a unit with no place: its card says open gap and why, still shows its ledger arrival window and strength basis, and the unit is not drawn or listed', async () => {
  const info = await page.evaluate(() => { const L = window.btApp.layer, i = L.units.findIndex(u => u.render.status === 'not_drawn' && u.arm === 'infantry' && u.level === 'regiment' && /no road or direction of approach is printed/.test(u.render.reason)); return { i, id: L.units[i].id, share: L.units[i].strength.share, name: L.units[i].name }; });
  await at(minOf(7, 3, 12)); await page.evaluate(i => window.btApp.select(i), info.i); await frames(8); const txt = await page.locator('#bt-card').innerText();
  for (const w of ['Open gap: no place', 'no road or direction of approach is printed', 'Arrival window', 'opens', 'Entry', 'open gap', `about ${info.share}`, 'On the field']) assert.ok(txt.toLowerCase().includes(w.toLowerCase()), `card shows ${w}`);
  const st = await page.evaluate(i => ({ present: window.btApp.stage.present[i], x: window.btApp.stage.w.unitF[i * 12], figures: window.btApp.stage.w.units[i].count }), info.i); assert.equal(st.present, 0); assert.equal(st.x, 1e6); assert.equal(st.figures, 0);
  await page.click('[data-panel=views]'); await page.click('#vw-tabs [data-tab=unit]'); await page.fill('#vw-q', info.id); await page.waitForTimeout(250); assert.equal(await page.locator('#bt-drawer-body .item').count(), 0); await page.keyboard.press('Escape');
  await page.evaluate(() => window.btApp.select(-1));
});

test('the evidence overlay outlines the placed units by tier (plausible-procedural) and works are drawn as rings with their place named; no error', async () => {
  await at(minOf(7, 2, 18)); await page.evaluate(() => { const th = window.btApp.theatre; th.state.overlay = true; th.setView('ground', true); }); await frames(6);
  const r = await page.evaluate(() => { const a = window.btApp, st = a.stage, L = a.layer; let n = 0, tiers = new Set(); for (let i = 0; i < L.units.length; i++) if (st.present[i]) { n++; tiers.add(L.units[i].tier); } return { n, tiers: [...tiers], objects: L.objects.length, withAt: L.objects.filter(o => o.at).length, shown: L.objects.filter(o => (o.line || o.at) && L.objectProgress(o, a.state.t) > 0).length }; });
  assert.ok(r.n > 10); assert.deepEqual(r.tiers, ['plausible-procedural']); assert.ok(r.objects >= 15 && r.withAt > 5 && r.shown > 5);
  await page.evaluate(() => { window.btApp.theatre.state.overlay = false; }); await frames(2);
});

test('a unit placed by an Official Records report: its card lists the report, the printed page, the quoted words, the tier and the checks, what is applied and what is not, and the reports that disagree; a unit drawn only by the PDF ledger shows none', async () => {
  const info = await page.evaluate(() => { const L = window.btApp.layer, ids = L.units.map(u => u.id), by = id => ids.indexOf(id); const withClaim = L.units.findIndex(u => u.drawn && u.approach && u.approach.claim && u.provenance && u.provenance.entries.some(e => e.kind === 'stop' && e.applied)), pdfOnly = L.units.findIndex(u => u.drawn && !u.provenance), conflict = L.units.findIndex(u => u.drawn && u.provenance && u.provenance.conflicts.length); return { withClaim, pdfOnly, conflict, id: L.units[withClaim].id, claim: L.units[withClaim].approach.claim, report: L.units[withClaim].approach.report, page: L.units[withClaim].approach.page, nConf: L.units[conflict].provenance.conflicts.length }; });
  assert.ok(info.withClaim >= 0 && info.pdfOnly >= 0 && info.conflict >= 0);
  await at(minOf(7, 2, 12)); await page.evaluate(i => window.btApp.select(i), info.withClaim); await frames(8); let txt = await page.locator('#bt-card').innerText();
  for (const w of ['Ledger claims', info.claim, 'OR27 report ' + info.report, 'printed page ' + info.page, 'quoted words', 'claim tier', 'fidelity check', 'Placement tier inferred', 'Approach road', 'OR27-POS']) assert.ok(txt.toLowerCase().includes(w.toLowerCase()), 'card shows ' + w);
  assert.ok(!FORBIDDEN.test(txt)); { const sec = txt.slice(txt.toLowerCase().indexOf('ledger claims (official'), txt.toLowerCase().indexOf('figure manifests')); assert.ok(sec.length > 200 && !/\bverified\b/i.test(sec), 'the claims section does not call anything verified'); }
  await page.evaluate(i => window.btApp.select(i), info.conflict); await frames(8); txt = await page.locator('#bt-card').innerText(); assert.match(txt, /Reports disagree/); assert.ok(!FORBIDDEN.test(txt));
  await page.evaluate(i => window.btApp.select(i), info.pdfOnly); await frames(8); txt = await page.locator('#bt-card').innerText(); assert.ok(!/Ledger claims/.test(txt), 'a unit no claim names shows no claims section'); await page.evaluate(() => window.btApp.select(-1)); await frames(2);
});

test('a unit placed by a troop-map day position: the card says the position is documented for the day and the time modelled, lists the label, sigma, crop and the ledgers\' places with their distance; several labels are listed; a unit with no road says so; the unit stands at the position after it arrives', async () => {
  const info = await page.evaluate(() => {
    const a = window.btApp, L = a.layer, rep = L.report(a.state.scenario).day_stops, d = rep.find(x => x.applied && x.kind === 'day' && !x.merged_into && x.distance_m > 0 && L.units.find(u => u.id === x.unit).day_positions.days.some(e => e.used === x.claim && e.ledger_compare.length)), ids = L.units.map(u => u.id);
    const multi = L.units.findIndex(u => u.drawn && u.day_positions && u.day_positions.days.some(e => e.status === 'multiple')), open = L.units.findIndex(u => !u.drawn && !u.children.length && u.day_positions && u.day_positions.days.some(e => e.drawn_as === 'not_drawn'));
    return { i: ids.indexOf(d.unit), id: d.unit, claim: d.claim, arrive: d.arrive, printed: L.dayClaims[d.claim].printed, sigma: Math.round(L.dayClaims[d.claim].sigma_m), multi, open, slot: L.plans.get(d.unit).days.find(x => x.id === d.id).slot };
  });
  await at(info.arrive + 2); await page.evaluate(i => window.btApp.select(i), info.i); await frames(8); let txt = await page.locator('#bt-card').innerText();
  for (const w of ['Troop-map positions', info.claim, info.printed, `± ${info.sigma} m`, 'documented for the day; time modelled', 'Modelled (plausible-procedural)', 'could have arrived at any time between', 'local midnight', 'timed places for the same date', 'not an independent witness']) assert.ok(txt.toLowerCase().includes(w.toLowerCase()), `card shows ${w}`);
  assert.ok(!FORBIDDEN.test(txt)); const pt = await page.locator('#cd-pos').innerText(), m = /(\d+\.\d+)° N\s+(\d+\.\d+)° W/.exec(pt); assert.ok(m, 'the card shows the position'); const pos = { present: await page.evaluate(i => window.btApp.stage.present[i], info.i), lat: +m[1], lng: -m[2] };
  assert.equal(pos.present, 1); assert.ok(Math.hypot((pos.lng - info.slot.lng) * 85400, (pos.lat - info.slot.lat) * 111200) < 3, 'two minutes after it arrives the unit stands in its slot');
  await page.evaluate(i => window.btApp.select(i), info.multi); await frames(8); txt = await page.locator('#bt-card').innerText(); assert.match(txt, /labels on this sheet: several line states, none drawn as one place/); assert.ok(!FORBIDDEN.test(txt));
  await page.evaluate(i => window.btApp.select(i), info.open); await frames(8); txt = await page.locator('#bt-card').innerText(); assert.match(txt, /Troop-map positions/i); assert.match(txt, /no road of approach/); assert.ok(!FORBIDDEN.test(txt));
  await page.evaluate(() => window.btApp.select(-1)); await frames(2);
});

test('a unit drawn by a MODELLED road of approach (DEC-015): the card says MODELLED APPROACH with the siblings, report, page and printed words, carries the pill and the link to EG-0070, says what is documented and what is modelled; an open unit says why the rule was not applied; the About text counts the modelled units', async () => {
  const info = await page.evaluate(() => { const L = window.btApp.layer, ids = L.units.map(u => u.id), m = L.units.findIndex(u => u.drawn && u.approach && u.approach.modelled), o = ids.indexOf('us-11c-2d-coster-134ny'), n = L.units.filter(u => u.drawn && u.approach && u.approach.modelled).length; const u = L.units[m]; return { m, o, n, id: u.id, ap: u.approach.id, road: u.approach.road, sib: u.approach.siblings.map(s => ({ ap: s.ap, phrase: s.phrase, report: s.report || null, page: s.page ?? null })) }; });
  assert.ok(info.m >= 0 && info.n === 56, `${info.n} modelled units`);
  await at(minOf(7, 2, 12)); await page.evaluate(i => window.btApp.select(i), info.m); await frames(8); let txt = await page.locator('#bt-card').innerText();
  for (const w of ['Placed', 'MODELLED APPROACH (plausible-procedural; evidence gap EG-0070, decision DEC-015)', `Approach ${info.ap}: ${info.road}`, 'may in fact have come by another road', 'Documented: the unit', 'Modelled: the road', 'Place in the column', 'Modelled approach', 'Approach road (modelled)', 'Not printed for this unit or for any formation above it', 'Open register entry EG-0070']) assert.ok(txt.includes(w), `card shows ${w}`);
  for (const s of info.sib) { assert.ok(txt.includes(s.ap) && txt.includes(s.phrase), `card lists sibling ${s.ap}`); if (s.report) assert.ok(txt.includes(s.report) && txt.includes('page ' + s.page), `card gives the report and page of ${s.ap}`); }
  assert.ok(!FORBIDDEN.test(txt)); const href = await page.locator('#bt-card a.btn-s[href*="EG-0070"]').first().getAttribute('href'); assert.match(href, /register\/EG-0070\.md$/); assert.equal((await page.request.get(href)).status(), 200, 'the register entry opens');
  await page.evaluate(i => window.btApp.select(i), info.o); await frames(8); txt = await page.locator('#bt-card').innerText(); assert.match(txt, /Open gap/); assert.match(txt, /Sibling-road rule \(DEC-015.*not applied, because/); assert.match(txt, /Horner/); assert.ok(!/MODELLED APPROACH/.test(txt)); assert.ok(!FORBIDDEN.test(txt));
  await page.evaluate(() => window.btApp.select(-1)); await frames(2);
  await page.click('[data-panel=info]'); const body = await page.locator('#bt-drawer-body').innerText(); assert.match(body, /Modelled approaches/); assert.match(body, new RegExp(`${info.n} units are drawn by a road of approach that the record does not print`)); assert.ok(!FORBIDDEN.test(body)); await page.keyboard.press('Escape');
});

test('no console errors', async () => { assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); });
