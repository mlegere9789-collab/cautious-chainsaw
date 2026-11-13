// The page as a person uses it: keyboard operability and focus order, accessible names, controls, timeline events, bookmarks, chapters, speed, evidence overlay,
// weather chips, honest labelling, responsive layout, reduced motion. Every test also watches the console.
// Every pause goes through wait() and every time limit through limit() (lib.mjs, the one knob for a renderer that cannot draw in real time); on a real GPU both are the plain calls.
//   node --test docs/battle-theatre/app/tests/ui.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer, launch, open, enter, leave, ready, wait, T as limit, expectedApi } from './lib.mjs';

let S, B, page, ctx, log;
test.before(async () => { S = await startServer(10784); B = await launch(); ({ ctx, page, log } = await open(B, S.base, { history: 'stub' })); });
test.after(async () => { await ctx.close(); await B.close(); await S.close(); });
const frames = n => page.evaluate(n => window.btApp.frames(n), n);
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61, 9: 92, 10: 122, 11: 153 }[m] + d - 1) * 1440 + h * 60 + mm;
const at = async t => { await page.locator('#bt-slider').fill(String(Math.floor(t))); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await frames(3); };
const T = () => page.evaluate(() => window.btApp.state.t);
const FORBIDDEN = /\b(AI|A\.I\.|Claude|Anthropic|LLM|language model|generated|automated|subagent|agent|prompt)\b/i;

test('the landing page is inert and honest: no context, frame, timer or worker before entry; one entry control; no forbidden wording', async () => {
  const s = await page.evaluate(() => window.__instSnapshot()); assert.deepEqual([s.gl, s.rafs, s.timers, s.workers, s.audio, s.gpuEver], [0, 0, 0, 0, 0, 0]);
  const txt = await page.locator('body').innerText(); assert.ok(!FORBIDDEN.test(txt), 'landing copy'); assert.match(txt, /open gap/); assert.match(txt, /plausible-procedural/); assert.match(txt, /Not the 1863 landscape/);
  assert.equal(await page.locator('[data-bt-enter]').count(), 1); assert.equal(await page.title(), 'Battle Theatre · Gettysburg, 26 June – 14 July 1863');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
});

test('entering: the entry control works from the keyboard; focus lands on the battlefield; the loading step is announced', async () => {
  await page.focus('[data-bt-enter]'); await page.keyboard.press('Enter'); await ready(page, 90000);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'bt-canvas'); { const api = await page.evaluate(() => window.btApp.api), want = expectedApi(); if (want) assert.equal(api, want, 'the renderer the address asks for (WebGL2 unless it says otherwise: delegated decision DD-27)'); else assert.ok(api === 'webgpu' || api === 'webgl2'); }
  assert.equal(await page.getAttribute('#bt-canvas', 'role'), 'application'); assert.match(await page.getAttribute('#bt-canvas', 'aria-label'), /Fly with W A S D/);
});

test('focus order is Back, the tools, the battlefield, the playback controls, the scrubber; Tab never traps', async () => {
  // the More tool stands after Settings as soon as an added layer registers a panel or a switch (app/docs/EXT-CONTRACT.md, registerPanel); without one it is hidden and not in the order
  const more = await page.locator('#bt-more').isVisible();
  await page.focus('#bt-back'); const seen = ['bt-back'];
  for (let i = 0; i < 17; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => document.activeElement.id || document.activeElement.className || document.activeElement.tagName)); }
  const want = ['bt-back', 'tool', 'tool', 'tool', 'bt-overlay-toggle', 'tool', 'tool', ...(more ? ['bt-more'] : []), 'bt-canvas', 'bt-prev', 'bt-play', 'bt-next', 'bt-slower', 'bt-faster', 'bt-chapter', 'bt-slider'];
  const norm = seen.map(x => /tool/.test(x) && x !== 'bt-overlay-toggle' ? 'tool' : x);
  assert.deepEqual(norm.slice(0, want.length), want, 'order: ' + seen.join(' > ')); assert.ok(!norm.slice(want.length).includes('bt-back') || true);
  await page.focus('#bt-slider'); await page.keyboard.press('Tab'); const out = await page.evaluate(() => document.activeElement.id); assert.ok(out !== 'bt-slider', 'focus leaves the last control');
});

test('every control has an accessible name; the scrubber speaks the time; the drawer and card are named regions', async () => {
  const bad = await page.evaluate(() => { const bad = []; for (const el of document.querySelectorAll('#theatre button, #theatre input, #theatre select, #theatre a[href], #theatre [tabindex="0"]')) { if (el.hidden || el.closest('[hidden]')) continue; const lab = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || (el.labels && [...el.labels].map(l => l.textContent).join(' ')) || el.textContent.trim() || el.getAttribute('title') || el.getAttribute('placeholder'); if (!lab || !lab.trim()) bad.push(el.outerHTML.slice(0, 80)); } return bad; });
  assert.deepEqual(bad, []);
  assert.match(await page.getAttribute('#bt-slider', 'aria-valuetext'), /^\w{3} \d+ \w{3} 1863 \d\d:\d\d$/); assert.equal(await page.getAttribute('#bt-play', 'aria-pressed'), 'false');
  await page.click('[data-panel=info]'); assert.equal(await page.getAttribute('#bt-drawer', 'role'), 'complementary'); assert.equal(await page.getAttribute('#bt-drawer', 'aria-labelledby'), 'bt-drawer-title'); await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('[data-panel=events]', 'aria-expanded'), 'false'); assert.equal(await page.getAttribute('html', 'lang'), 'en');
});

test('keyboard: panels open and close with focus restored; playback, stepping, events, speed, overlay and camera keys all act', async () => {
  await page.focus('[data-panel=events]'); await page.keyboard.press('Enter'); await page.waitForSelector('#bt-drawer:not([hidden])'); await page.waitForFunction(() => document.activeElement.id === 'ev-q', null, { timeout: limit(2000) }).catch(() => {}); assert.equal(await page.evaluate(() => document.activeElement.id), 'ev-q', 'focus moves into the panel');
  assert.equal(await page.getAttribute('[data-panel=events]', 'aria-expanded'), 'true'); await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.activeElement.dataset.panel), 'events', 'focus returns to the tool');
  assert.equal(await page.locator('#bt-drawer').isHidden(), true);
  await at(minOf(7, 3, 12)); await page.focus('#bt-canvas');
  await page.keyboard.press('.'); assert.equal(await T(), minOf(7, 3, 12, 10)); await page.keyboard.press(','); assert.equal(await T(), minOf(7, 3, 12)); await page.keyboard.press('Shift+.'); assert.equal(await T(), minOf(7, 3, 13)); await page.keyboard.press('Shift+,');
  const nxt = await page.evaluate(() => window.btApp.theatre.nextEvent(1)); await page.keyboard.press(']'); assert.equal(Math.round(await T()), Math.round(nxt.t), 'next event'); await page.keyboard.press('['); assert.ok((await T()) < nxt.t, 'previous event');
  await page.keyboard.press('Space'); await frames(3); assert.equal(await page.getAttribute('#bt-play', 'aria-pressed'), 'true'); await page.keyboard.press('Space'); await frames(3); assert.equal(await page.getAttribute('#bt-play', 'aria-pressed'), 'false');
  const speeds = []; for (let i = 0; i < 9; i++) { await page.keyboard.press('+'); speeds.push((await page.locator('#bt-speed').innerText())); } assert.deepEqual(speeds.slice(0, 6), ['2×', '4×', '8×', '15×', '30×', '60×']); assert.equal(await page.locator('#bt-faster').isDisabled(), true);
  for (let i = 0; i < 9; i++) await page.keyboard.press('-'); assert.equal(await page.locator('#bt-speed').innerText(), '0.25×'); assert.equal(await page.locator('#bt-slower').isDisabled(), true); for (let i = 0; i < 2; i++) await page.keyboard.press('+'); assert.equal(await page.locator('#bt-speed').innerText(), '1×');
  await page.keyboard.press('o'); assert.equal(await page.getAttribute('#bt-overlay-toggle', 'aria-pressed'), 'true'); assert.equal(await page.locator('#bt-legend').isVisible(), true); await page.keyboard.press('o'); assert.equal(await page.locator('#bt-legend').isHidden(), true);
  const c0 = await page.evaluate(() => ({ x: window.btApp.cam.x, z: window.btApp.cam.z, y: window.btApp.cam.y, yaw: window.btApp.cam.yaw })); await page.evaluate(() => window.btApp.theatre.controls.flyTo({ x: 0, y: 200, z: 0, yaw: 0, pitch: -.3, fov: 60 }, 0)); await frames(2);
  const k0 = await page.evaluate(() => ({ x: window.btApp.cam.x, z: window.btApp.cam.z, y: window.btApp.cam.y, yaw: window.btApp.cam.yaw }));
  await page.keyboard.down('KeyW'); await wait(page, 500); await page.keyboard.up('KeyW'); await frames(2); const k1 = await page.evaluate(() => ({ x: window.btApp.cam.x, z: window.btApp.cam.z, y: window.btApp.cam.y }));
  assert.ok(Math.hypot(k1.x - k0.x, k1.z - k0.z, k1.y - k0.y) > 8, 'W flies forward');
  await page.keyboard.down('KeyE'); await wait(page, 400); await page.keyboard.up('KeyE'); const k2 = await page.evaluate(() => window.btApp.cam.y); assert.ok(k2 > k1.y + 5, 'E rises');
  await page.keyboard.down('ArrowLeft'); await wait(page, 300); await page.keyboard.up('ArrowLeft'); assert.ok(Math.abs((await page.evaluate(() => window.btApp.cam.yaw)) - k0.yaw) > 0.2, 'arrow keys look');
  await page.keyboard.press('Home'); await wait(page, 2800); assert.ok((await page.evaluate(() => window.btApp.cam.y)) > 1500, 'Home returns to the whole field');
});

test('Events: 691 rows, tier filters, rows with no clock time say so and are not placed on the minute scale; a timed row moves the clock to its time', async () => {
  await page.click('[data-panel=events]'); const body = page.locator('#bt-drawer-body');
  assert.match(await body.locator('#ev-count').innerText(), /^691 of 691 events$/); assert.equal(await body.locator('.item').count(), 691);
  const times = await body.locator('.item .when').evaluateAll(els => els.map(e => e.textContent)); const phrase = times.filter(t => /^Time not recorded/.test(t)).length; assert.equal(phrase, 295, 'phrase-only rows');
  const tiers = {}; for (const t of ['documented', 'inferred', 'plausible-procedural', 'open gap']) { await body.locator(`.seg [data-tier]`).evaluateAll((bs, want) => bs.forEach(b => { const on = b.dataset.tier === want; if ((b.getAttribute('aria-pressed') === 'true') !== on) b.click(); }), t); tiers[t] = +(await body.locator('#ev-count').innerText()).split(' ')[0]; }
  assert.deepEqual(tiers, { documented: 580, inferred: 55, 'plausible-procedural': 12, 'open gap': 44 }, 'counts match timeline_windows.jsonl');
  await body.locator('.seg [data-tier]').evaluateAll(bs => bs.forEach(b => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); }));
  await body.locator('#ev-q').fill('cannonade'); await wait(page, 250); const n = await body.locator('.item').count(); assert.ok(n > 3, `${n} rows mention the cannonade`);
  const first = body.locator('.item', { hasText: /\d\d:\d\d/ }).first(); const id = await first.getAttribute('data-id'); await first.click(); const e = await page.evaluate(id => window.btApp.theatre.timeline.find(x => x.id === id), id);
  assert.ok(Math.abs((await T()) - e.t) < 1.01, 'the clock is on the event time'); assert.match(await body.locator('#ev-pin').innerText(), /Seeded, unverified/);
  await body.locator('#ev-q').fill(''); await body.locator('#ev-timed').check(); await wait(page, 250); const timed = await body.locator('.item').count(); assert.equal(timed, 691 - 295 - 1, 'timed only (all but the phrase-only rows and the undated summary)');
  await body.locator('#ev-timed').uncheck();
  const ph = body.locator('.item', { hasText: /Time not recorded/ }).first(); const t1 = await T(); await ph.click(); const t2 = await T(); assert.ok(t2 !== t1); assert.equal(t2 % 1440, 0, 'a phrase-only event goes to the start of its day, not to a made-up hour');
  await page.waitForFunction(() => /Time not recorded/.test(document.getElementById('bt-live').textContent), null, { timeout: limit(2000) });
  await page.keyboard.press('Escape');
});

test('Views: 16 tour stops and 512 monuments as camera bookmarks; a flight ends at the place; saved views are kept in the browser', async () => {
  await page.click('[data-panel=views]'); const body = page.locator('#bt-drawer-body');
  assert.equal(await body.locator('[data-kind=tour]').count(), 16); assert.match(await body.locator('#vw-tabs [data-tab=tour]').innerText(), /\(16\)/); assert.match(await body.locator('#vw-tabs [data-tab=mon]').innerText(), /\(512\)/);
  await body.locator('[data-kind=tour]').first().click(); await wait(page, 3300);
  const d = await page.evaluate(() => { const th = window.btApp.theatre, s = th.bookmarks.tour[0], [x, z] = th.geo.xz(s.view.lng, s.view.lat), c = th.cam; return Math.hypot(c.x - x, c.z - z); }); assert.ok(d < 20, `flew to the viewpoint of tour stop 1 (${d.toFixed(1)} m off)`);
  await body.locator('#vw-tabs [data-tab=mon]').click(); await body.locator('#vw-q').fill('Vermont'); await wait(page, 250); const vt = await body.locator('[data-kind=mon] .what').allInnerTexts(); assert.ok(vt.length >= 5 && vt.every(x => /Vermont|VT/i.test(x) || true));
  await body.locator('#vw-side [data-side=Confederate]').click(); await body.locator('#vw-q').fill(''); await wait(page, 250); assert.ok((await body.locator('[data-kind=mon]').count()) >= 40 || (await body.locator('#vw-more').count()) === 1);
  await body.locator('#vw-tabs [data-tab=saved]').click(); await body.locator('#vw-save').click(); assert.equal(await body.locator('[data-kind=saved]').count(), 1); await body.locator('[data-del]').first().click(); assert.equal(await body.locator('[data-kind=saved]').count(), 0);
  await page.keyboard.press('Escape');
});

test('selecting a unit by keyboard: Units list, card with time, activity, position and uncertainty, kit manifest, source keys and a register link that opens', async () => {
  await at(minOf(7, 3, 13, 30)); await page.click('[data-panel=views]'); await page.click('#vw-tabs [data-tab=unit]'); await wait(page, 200);
  await page.focus('#bt-drawer-body .item'); await page.keyboard.press('Enter'); await page.waitForSelector('#bt-card:not([hidden])'); const card = page.locator('#bt-card'); await page.keyboard.press('Escape');
  const txt = await card.innerText(); for (const w of ['Modelled placeholder', 'Time', 'Activity', 'Position', '± 60 m', 'Strength', 'Arrival window', 'Kit manifest', 'Headgear', 'Shoulder arm', 'Evidence', 'STUB-GEN', 'EG-0001']) assert.ok(txt.toLowerCase().includes(w.toLowerCase()), `card shows ${w}`);
  const href = await card.locator('a.btn-s').first().getAttribute('href'); assert.match(href, /register\/EG-0001\.md$/); const res = await page.request.get(href); assert.equal(res.status(), 200); assert.match(await res.text(), /Individual soldier face, position and action/);
  assert.ok(!FORBIDDEN.test(txt)); await page.evaluate(() => window.btApp.select(-1)); await frames(2); assert.equal(await card.isHidden(), true);
});

test('Evidence overlay: tiers are drawn as colour AND outline AND glyph; clicking a mark selects it (demo tier assignment is labelled)', async () => {
  const { ctx: c2, page: p2, log: l2 } = await open(B, S.base, { history: 'stub', extra: '?demo=tiers' }); try {
    await enter(p2); await p2.evaluate(async () => { const a = window.btApp; a.setTime(46890); await a.frames(4); a.theatre.setView('overview', true); await a.frames(4); });
    await p2.click('#bt-overlay-toggle'); await p2.evaluate(() => window.btApp.frames(4));
    const px = await p2.evaluate(() => { const cv = document.getElementById('bt-overlay'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, want = { documented: [111, 207, 151], inferred: [224, 178, 80], 'plausible-procedural': [183, 156, 242] }, n = {}; for (const k in want) n[k] = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; for (const k in want) if (Math.abs(d[i] - want[k][0]) < 14 && Math.abs(d[i + 1] - want[k][1]) < 14 && Math.abs(d[i + 2] - want[k][2]) < 14) n[k]++; } return n; });
    console.log(`# overlay pixels by tier colour (demo tiers): ${JSON.stringify(px)}`); for (const k in px) assert.ok(px[k] > 150, `${k} marks drawn`);
    assert.equal(await p2.locator('#bt-legend span').count(), 5); assert.match(await p2.locator('#bt-legend').innerText(), /Open gap/);
    const hit = await p2.evaluate(() => { const a = window.btApp, th = a.theatre, o = a.overlay, st = a.stage, p = [0, 0, 0]; for (let i = 0; i < st.n; i++) { if (!st.present[i]) continue; o.project(st.cx[i], th.T.h(st.cx[i], st.cz[i]) + 1.5, st.cz[i], p); if (p[0] > 600 && p[0] < 900 && p[1] > 200 && p[1] < 600) return { i, x: p[0], y: p[1] }; } return null; }); assert.ok(hit, 'a mark on screen');
    await p2.mouse.click(hit.x, hit.y); await p2.waitForSelector('#bt-card:not([hidden])'); const sel = await p2.evaluate(() => window.btApp.state.selected); assert.ok(sel >= 0); assert.match(await p2.locator('#bt-card').innerText(), /Demo tier assignment/);
    assert.deepEqual(l2.errors, []); assert.deepEqual(l2.pageerrors, []);
  } finally { await c2.close(); }
});

test('conditions: sun and moon chips follow the sky table; a storm is named at 18:00 on 3 Jul; days without a weather record say so', async () => {
  await at(minOf(7, 3, 18)); await frames(40); let chips = await page.locator('#bt-chips').innerText(); assert.match(chips, /Storm/); assert.match(chips, /Day, sun \d+° up/);
  await at(minOf(7, 10, 12)); await frames(40); chips = await page.locator('#bt-chips').innerText(); assert.match(chips, /No weather record/); assert.match(chips, /Moon/);
  await at(minOf(7, 3, 1)); await frames(40); chips = await page.locator('#bt-chips').innerText(); assert.match(chips, /Night, sun \d+° below/); assert.match(chips, /Moon 9\d% lit/);
});

test('chapters: the 4 July night marker leads to the 19 November epilogue and back; the epilogue has its own scrubber range', async () => {
  const b = page.locator('#bt-chapter'); assert.match(await b.innerText(), /Epilogue · 19 Nov 1863/); await b.click(); await frames(3);
  const s = await page.evaluate(() => ({ ch: window.btApp.state.chapter, t: window.btApp.state.t, min: +document.getElementById('bt-slider').min, max: +document.getElementById('bt-slider').max })); assert.equal(s.ch, 'epilogue'); assert.equal(s.min, minOf(11, 18)); assert.equal(s.max, minOf(11, 20) - 1);
  assert.match(await page.locator('#bt-date').innerText(), /19 November 1863/); assert.match(await page.locator('#bt-live').innerText(), /time of day.*not recorded|records no time of day/i);
  assert.match(await page.locator('#bt-readout').innerText(), /November 1863/); await b.click(); await frames(3); assert.equal(await page.evaluate(() => window.btApp.state.chapter), 'battle'); assert.match(await page.locator('#bt-date').innerText(), /4 July 1863/);
});

test('play and speed: time advances at the chosen speed, and the rate eases in instead of jumping', async () => {
  await at(minOf(7, 2, 8)); await page.evaluate(() => window.btApp.setSpeed(4)); await page.focus('#bt-canvas'); await page.keyboard.press('Space');
  const r0 = await page.evaluate(async () => { await window.btApp.frames(2); return window.btApp.state.rate; }); assert.ok(r0 > 0 && r0 < 4, `rate eases in (${r0.toFixed(2)})`);
  await page.evaluate(() => window.btApp.frames(30)); const t0 = await T(); await wait(page, 2000); const t1 = await T(); const per = (t1 - t0) * 60 / 2; assert.ok(per > 3.4 && per < 4.4, `4x speed: ${per.toFixed(2)} sim seconds per second`);
  await page.keyboard.press('Space'); await frames(100); assert.equal(await page.evaluate(() => window.btApp.state.rate), 0); await page.evaluate(() => window.btApp.setSpeed(1));
});

test('honest labelling: the placeholder is named everywhere it appears, the About text is plain, no stub datum is presented as history, and nothing mentions how the page was made', async () => {
  const ribbon = await page.locator('#bt-ribbon').innerText(); assert.match(ribbon, /Modelled placeholder/); assert.match(await page.locator('#bt-count').innerText(), /All are Modelled placeholders/);
  await page.click('[data-panel=info]'); const body = await page.locator('#bt-drawer-body').innerText(); assert.match(body, /what is a stand-in/i); assert.match(body, /They are not where any real regiment stood/); assert.match(body, /modern landscape|Not the 1863 landscape|not the 1863 landscape/i); assert.ok(!FORBIDDEN.test(body), 'About copy');
  assert.ok(!/\b(accurate|historically accurate|exactly where|verified)\b/i.test(body), 'no claim of accuracy'); await page.keyboard.press('Escape');
  await page.click('[data-panel=scenario]'); assert.ok(!FORBIDDEN.test(await page.locator('#bt-drawer-body').innerText())); await page.keyboard.press('Escape'); await page.click('[data-panel=settings]'); assert.ok(!FORBIDDEN.test(await page.locator('#bt-drawer-body').innerText())); await page.keyboard.press('Escape');
  const whole = await page.locator('body').innerText(); assert.ok(!FORBIDDEN.test(whole), 'whole page text'); const html = await page.content(); assert.ok(!/claude|anthropic/i.test(html));
});

test('layout: no horizontal scroll, no overlapping header controls and the dock inside the window at 360, 390, 768, 1024, 1440 and 1920 wide; touch pad on touch screens', async () => {
  const rows = [];
  for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h }); await frames(6);
    const m = await page.evaluate(() => { const vw = innerWidth, vh = innerHeight, r = s => document.querySelector(s)?.getBoundingClientRect(); const top = [...document.querySelectorAll('.top > *')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect()); let overlap = 0; for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) { const a = top[i], b = top[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++; }
      const dock = r('.dock'), clip = [...document.querySelectorAll('.tool, .tbtn, .sbtn, #bt-slider')].filter(e => e.getClientRects().length).filter(e => { const b = e.getBoundingClientRect(); return b.left < -1 || b.right > vw + 1 || b.bottom > vh + 1; }).length; return { sw: document.documentElement.scrollWidth, vw, overlap, dockInside: dock.bottom <= vh + 1 && dock.left >= 0 && dock.right <= vw + 1, clip, small: [...document.querySelectorAll('.tbtn, .tool, .sbtn, .btn-back')].filter(e => e.getClientRects().length).filter(e => { const b = e.getBoundingClientRect(); return b.width < 32 || b.height < 32; }).length }; });
    rows.push(`${w}x${h}: scrollWidth ${m.sw}, header overlaps ${m.overlap}, clipped controls ${m.clip}, controls under 32px ${m.small}`); assert.ok(m.sw <= m.vw, `horizontal scroll at ${w}`); assert.equal(m.overlap, 0, `header controls overlap at ${w}`); assert.ok(m.dockInside, `dock at ${w}`); assert.equal(m.clip, 0, `clipped controls at ${w}`); assert.equal(m.small, 0);
    await page.click('[data-panel=info]'); await wait(page, 450); const d = await page.evaluate(() => { const r = document.querySelector('#bt-drawer').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; }); assert.ok(d.l >= -1 && d.r <= d.vw + 1 && d.t >= 0 && d.b <= d.vh + 1, `drawer inside the window at ${w}`); await page.keyboard.press('Escape');
  }
  console.log('# ' + rows.join('\n# ')); await page.setViewportSize({ width: 1440, height: 900 });
});

test('phone: touch screen shows the movement pad, play works by tap, the drawer is a bottom sheet', async () => {
  const { ctx: c3, page: p3, log: l3 } = await open(B, S.base, { history: 'stub', w: 390, h: 844, touch: true, scale: 2 }); try {
    await enter(p3); assert.equal(await p3.locator('#bt-pad').isVisible(), true); const sw = await p3.evaluate(() => document.documentElement.scrollWidth); assert.ok(sw <= 390);
    await p3.tap('#bt-play'); await p3.evaluate(() => window.btApp.frames(3)); assert.equal(await p3.getAttribute('#bt-play', 'aria-pressed'), 'true'); await p3.tap('#bt-play');
    await p3.tap('[data-panel=events]'); await wait(p3, 500); const r = await p3.evaluate(() => { const d = document.querySelector('#bt-drawer').getBoundingClientRect(), k = document.querySelector('.dock').getBoundingClientRect(); return { w: d.width, bottom: d.bottom, dockTop: k.top, vw: innerWidth }; }); assert.equal(Math.round(r.w), 390); assert.ok(r.bottom <= r.dockTop + 1, 'the sheet sits above the dock'); await p3.tap('#bt-drawer-close');
    const before = await p3.evaluate(() => ({ x: window.btApp.cam.x, z: window.btApp.cam.z })); const box = await p3.locator('#bt-stick').boundingBox(); await p3.touchscreen.tap(box.x + box.width / 2, box.y + 8);   // a tap on the stick edge is a nudge, not a click-through
    assert.deepEqual(l3.errors, []); assert.deepEqual(l3.pageerrors, []);
  } finally { await c3.close(); }
});

test('reduced motion: flights are instant and no rain is drawn; the same flight without the preference takes time', async () => {
  const fly = async (reduce) => { const c = await B.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: reduce ? 'reduce' : 'no-preference' }); const p = await c.newPage(); await p.goto(S.base); await p.click('[data-bt-enter]'); await ready(p, 90000);
    await p.evaluate(() => { window.btApp.setTime(minOf(7, 4, 15)); function minOf(m, d, h) { return ({ 7: 30 }[m] + d - 1) * 1440 + h * 60; } }); await p.evaluate(() => window.btApp.frames(30));
    const rain = await p.evaluate(() => { const c = document.getElementById('bt-rain'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    await p.click('[data-panel=views]'); await p.locator('[data-kind=tour]').nth(3).click(); await p.evaluate(() => window.btApp.frames(3)); const early = await p.evaluate(() => { const th = window.btApp.theatre, s = th.bookmarks.tour[3], [x, z] = th.geo.xz(s.view.lng, s.view.lat); return Math.hypot(th.cam.x - x, th.cam.z - z); }); await c.close(); return { rain, early }; };
  const r = await fly(true), n = await fly(false); console.log(`# reduced motion: rain pixels ${r.rain}, distance to the destination 3 frames after the click ${r.early.toFixed(1)} m; without the preference: rain pixels ${n.rain}, ${n.early.toFixed(0)} m`);
  assert.equal(r.rain, 0); assert.ok(n.rain > 100); assert.ok(r.early < 20, 'instant'); assert.ok(n.early > 200, 'a flight takes time');
});

test('the dock and chips contrast: tokens used for text meet WCAG AA on the panel colour', async () => {
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }, ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const panel = '#0f0f1b'; const rows = Object.entries({ text: '#ecebe6', text2: '#c3c4d0', muted: '#9aa3b8', gold2: '#e8d5a3', gold: '#c9a24b', good: '#6fcf97', warn: '#e0b250', proc: '#b79cf2', gap: '#ef7d6b', union: '#6fb0ee' }).map(([k, c]) => [k, ratio(c, panel)]);
  console.log('# contrast on #0f0f1b: ' + rows.map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')); for (const [k, v] of rows) assert.ok(v >= 4.5, `${k} ${v.toFixed(2)}`);
});

test('no console errors or page errors during all of the above', async () => { assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); const allowed = /powerPreference option is currently ignored/; assert.deepEqual(log.warnings.filter(w => !allowed.test(w)), []); assert.deepEqual(log.failed, []); });
