// Contract 1.3 in the page: men fall in the picture (pixels), stand up again when the scrubber goes back (the renderer's tables are re-uploaded, byte-identical picture), the card shows the ranges and
// their basis, nothing is uploaded when nothing changed, on WebGPU and on the WebGL2 path, and no console error.
//   node --test docs/battle-theatre/app/tests/casualties.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer, launch, open, enter } from './lib.mjs';

const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
let S, B; const sessions = [];
test.before(async () => { S = await startServer(10791); B = await launch(); });
test.after(async () => { for (const s of sessions) await s.ctx.close(); await B.close(); await S.close(); });

const UNIT = 'us-1c-3d-biddle-121pa';       // I Corps, 3rd Division: stands at Seminary Ridge in the printed window of timeline row T1-147 (Jul 1 15:00-15:30)
async function session(extra = '') {
  const s = await open(B, S.base, { w: 1280, h: 800, extra }); await enter(s.page); sessions.push(s);
  s.frames = n => s.page.evaluate(n => window.btApp.frames(n), n);
  s.at = async t => { await s.page.evaluate(t => window.btApp.setTime(t), t); await s.frames(4); };
  s.diff = (A, Bm) => s.page.evaluate(async ([a, b]) => { const ld = async x => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + x)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height).data; }; const X = await ld(a), Y = await ld(b); let n = 0; for (let i = 0; i < X.length; i += 4) if (Math.abs(X[i] - Y[i]) + Math.abs(X[i + 1] - Y[i + 1]) + Math.abs(X[i + 2] - Y[i + 2]) > 24) n++; return n / (X.length / 4); }, [A.toString('base64'), Bm.toString('base64')]);
  return s;
}
// the camera over the unit, light fixed so only the unit's men can change the picture
async function aim(s, t0) {
  await s.at(t0); await s.page.evaluate(id => { const a = window.btApp, th = a.theatre, i = a.unitIds().indexOf(id); a.setPlaying(false); a.lock(true); const x = a.stage.cx[i], z = a.stage.cz[i], g = th.T.h(x, z); th.controls.flyTo({ x, y: g + 40, z: z - 6, yaw: 0, pitch: -1.45, fov: 50 }, 0); }, UNIT);
  await s.frames(6);
}
const REGION = { x: 380, y: 150, width: 520, height: 500 };

for (const api of ['webgpu', 'webgl2']) {
  test(`${api}: men of a unit fall in the picture while it stands in a printed window, stand up again when the scrubber goes back, and the same time gives the same picture`, async () => {
    const s = await session(api === 'webgl2' ? 'api=webgl2' : ''); assert.equal(await s.page.evaluate(() => window.btApp.api), api);
    const shot = async () => { await s.frames(3); return s.page.screenshot({ clip: REGION }); };
    await aim(s, minOf(7, 1, 14, 59)); const down0 = await s.page.evaluate(() => window.btApp.stage.stats.down), before = await shot();
    await s.at(minOf(7, 1, 15, 29)); const down1 = await s.page.evaluate(() => window.btApp.stage.stats.down), after = await shot(), after2 = await shot();
    assert.ok(down1 > down0 + 200, `men down on the field: ${down0} before, ${down1} after`);
    const dFall = await s.diff(before, after), dSame = await s.diff(after, after2); console.log(`# ${api}: ${down0} down at 14:59, ${down1} at 15:29; ${(dFall * 100).toFixed(2)}% of the pixels over ${UNIT} differ between the two; two shots of the same time differ by ${(dSame * 100).toFixed(3)}%`);
    assert.ok(dFall > 0.01, `the picture changes when men fall (${(dFall * 100).toFixed(2)}%)`); assert.ok(dSame < 0.0005, 'a still time is a still picture');
    await s.at(minOf(7, 1, 14, 59)); const back = await shot(), dBack = await s.diff(before, back); console.log(`# ${api}: back at 14:59 the picture differs from the first 14:59 picture by ${(dBack * 100).toFixed(3)}%`);
    assert.ok(dBack < 0.0005, 'the men stand up again: the renderer tables are rewritten, not left lying');
    await s.at(minOf(7, 1, 15, 29)); const again = await shot(); assert.ok(await s.diff(after, again) < 0.0005, 'forward again: the same men lie in the same places');
    const live = await s.page.evaluate(() => window.btApp.liveHash()); await s.at(minOf(7, 1, 9)); await s.at(minOf(7, 1, 15, 29)); assert.equal(await s.page.evaluate(() => window.btApp.liveHash()), live, 'a detour through another time changes nothing');
    assert.deepEqual(s.log.errors.concat(s.log.pageerrors), [], 'no console error');
  });
}

test('the card of a unit with men down: the ranges, their basis, the printed window with its row and audit, the running count on the map, the manifests and what the renderer does not show', async () => {
  const s = await session(); await s.at(minOf(7, 1, 15, 20)); await s.page.evaluate(id => { const a = window.btApp; a.select(a.unitIds().indexOf(id)); }, UNIT); await s.frames(14);
  const txt = await s.page.locator('#bt-card').innerText();
  for (const re of [/Loss share\s+130 \(range 130-131/, /Killed\s+17-18/, /Wounded\s+80-83/, /Missing\s+30-31/, /On the map now\s+strength \d+-\d+ of 308 . down \d+/, /all 130 of its losses fall where it stands on the map/, /plausible-procedural: the nearest printed loss figure/, /Busey and Martin not available/, /the middle of each range \(DEC-008/, /EN-009\s+1 Jul 15:00 to 15:30 . timeline row T1-147 \(seeded unverified\) . OR27 audit: SUPPORTED BY OR/, /Formation\s+column of fours/, /FIGURE MANIFESTS/i, /B\.6\.12 validator \(Python, tools\/bt\/check_figures\.py\): 308 figures of this unit checked, 0 fail/, /Python manifests equal the ones drawn here/, /Not drawn \(no support in the renderer\)/, /not drawn: no stated gun count|Strength/]) assert.match(txt, re);
  assert.doesNotMatch(txt, /Guns\s+\d+ drawn/, 'an infantry card has no guns row');
  await s.page.evaluate(id => { const a = window.btApp; a.select(a.unitIds().indexOf(id)); }, 'us-1c-art-2me'); await s.frames(8); const bt = await s.page.locator('#bt-card').innerText();
  assert.match(bt, /Guns\s+not drawn: no stated gun count/); assert.match(bt, /No printed engagement window names this unit/); assert.match(bt, /No kit record exists for this unit or its brigade/);
  await s.page.evaluate(() => { const a = window.btApp; a.select(a.unitIds().indexOf('cs-1c-pickett-garnett')); }); await s.frames(8); const ct = await s.page.locator('#bt-card').innerText(); assert.match(ct, /Loss share|Printed loss/); assert.match(ct, /not drawn/);
  assert.deepEqual(s.log.errors.concat(s.log.pageerrors), []);
});

test('nothing is uploaded when nothing changes: a still moment writes no soldier table, a moving one does; the animation clock is rebased on a seek', async () => {
  const s = await session(); await aim(s, minOf(7, 1, 15, 10)); await s.frames(6);
  const c0 = await s.page.evaluate(() => ({ s: window.btApp.theatre.counters.soldierUploads || 0, f: window.btApp.theatre.counters.frames })); await s.frames(20);
  const c1 = await s.page.evaluate(() => ({ s: window.btApp.theatre.counters.soldierUploads || 0, f: window.btApp.theatre.counters.frames }));
  assert.equal(c1.s, c0.s, `no soldier upload over ${c1.f - c0.f} still frames`);
  await s.page.evaluate(() => { const a = window.btApp; a.setSpeed(30); a.setPlaying(true); }); await s.page.waitForTimeout(1500); await s.page.evaluate(() => window.btApp.setPlaying(false));
  const c2 = await s.page.evaluate(() => window.btApp.theatre.counters.soldierUploads || 0); assert.ok(c2 > c1.s, 'while men fall the tables are written');
  const down = await s.page.evaluate(() => window.btApp.stage.stats.down); assert.ok(down > 0);
  const stat = await s.page.evaluate(() => ({ unsupported: window.btApp.stage.unsupported.length, header: window.btApp.header.events })); assert.equal(stat.unsupported, 0); assert.ok(stat.header > 4000, 'the cache holds the state events');
});
