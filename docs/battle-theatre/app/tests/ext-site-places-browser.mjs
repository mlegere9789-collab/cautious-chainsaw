// Browser harness (not a gate): the two added modules of the site's places (src/ext/monuments.mjs, src/ext/tour.mjs) in the real page, on WebGL2 with software GL.
// The real list src/ext/index.mjs and the real modules are loaded (nothing is routed or faked). It walks: a desktop visit (the layer is off at entry, the switch, the marks, a picked
// memorial and its card, a memorial beyond the loaded ground, a tap on a mark, the tour stops, the clock never moved, Back, a second entry) and a phone visit (touch, 390 px wide).
//   node docs/battle-theatre/app/tests/ext-site-places-browser.mjs [outDir] [light|full|look]
// light (default): ?crowd=off&structures=off&fx=off, the quick look. full: the shell as a viewer gets it (figures, structures, effects), slow on software GL.
// look: the shell as a viewer gets it, but only a short walk (layer on over Cemetery Ridge, a picked memorial, a tour stop, Back) for the screenshots: the marks over the real scene.
// Writes outDir/results.json and screenshots (to be looked at, not asserted). Exit code 1 when a check fails. One browser at a time on a shared machine: run it through tools/horde/bench.sh.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../../../..');
const out = path.resolve(process.argv[2] || path.join(REPO, 'tmp/ext-site-places-browser')), mode = process.argv[3] === 'full' ? 'full' : process.argv[3] === 'look' ? 'look' : 'light', port = +process.env.BT_PLACES_PORT || 10827; fs.mkdirSync(out, { recursive: true });
const Q = mode === 'full' || mode === 'look' ? 'api=webgl2' : 'api=webgl2&crowd=off&structures=off&fx=off&nearR=12&midR=60', WAIT = 1800000;

const DRIVER_NOISE = /GPU stall due to ReadPixels|GL_CLOSE_PATH_NV|Automatic fallback to software WebGL|powerPreference option is currently ignored/;        // the software GL driver talking about itself (a screenshot reads the canvas back), as tests/lib.mjs
// a warning is theirs unless it names these modules, their elements or their words (other added layers share the page and write their own lines; they are listed in the notes, not failed here)
const MINE = /monuments\.mjs|tour\.mjs|site-places|site-memorial|site-tour|later memorial|tour stop|\bxm-|\bxt-/i, clean = log => log.errors.length === 0 && log.pageerrors.length === 0 && log.failed.length === 0 && !log.warnings.some(w => MINE.test(w));
const results = { mode, query: Q, started: new Date().toISOString(), checks: [], notes: [], shots: [] }; let failed = 0;
const check = (name, ok, detail) => { results.checks.push({ name, ok: !!ok, detail: detail === undefined ? undefined : detail }); if (!ok) failed++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined && !ok ? '  ' + JSON.stringify(detail) : '')); };
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ...results, failed, finished: new Date().toISOString() }, null, 1));

const srv = await serve(port), base = `http://127.0.0.1:${port}/app/index.html`;
const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function session(query, o = {}) {
  const ctx = await br.newContext({ viewport: { width: o.w || 1280, height: o.h || 720 }, deviceScaleFactor: 1, isMobile: !!o.touch, hasTouch: !!o.touch }), page = await ctx.newPage(), log = { errors: [], warnings: [], pageerrors: [], failed: [] };
  page.on('console', m => { const t = m.type(), x = m.text(); if (DRIVER_NOISE.test(x)) return; if (t === 'error') log.errors.push(x.slice(0, 300)); else if (t === 'warning') log.warnings.push(x.slice(0, 300)); });
  page.on('pageerror', e => log.pageerrors.push(String(e.stack || e).slice(0, 400))); page.on('response', r => { if (r.status() >= 400) log.failed.push(r.url().replace(/^.*\/app\//, 'app/') + ' HTTP ' + r.status()); });
  await page.goto(base + '?' + query, { waitUntil: 'load' });
  const enter = async () => { const t0 = Date.now(); await page.click('[data-bt-enter]'); await page.waitForFunction(() => (window.btApp && window.btApp.ready) || document.querySelector('.loading .fail'), null, { timeout: WAIT }); const ok = await page.evaluate(() => !!(window.btApp && window.btApp.ready)); if (!ok) throw new Error('the theatre did not start: ' + await page.evaluate(() => document.querySelector('.loading .fail')?.textContent)); await page.evaluate(() => window.btApp.ext.whenSettled()); await page.evaluate(() => window.btApp.frames(2)); return Date.now() - t0; };
  const leave = async () => { await page.click('#bt-back', { timeout: 600000 }); await page.waitForSelector('#landing:not([hidden])', { timeout: 600000 }); await page.waitForFunction(() => !window.btApp, null, { timeout: 600000 }); };
  const shot = async name => { const f = path.join(out, name + '.png'); await page.screenshot({ path: f, timeout: 600000 }); results.shots.push(f); };       // on software GL a frame of the whole scene takes seconds: a screenshot waits for one
  // a flight of the camera ends: the shell clears th.controls.flight when it arrives
  const drawerShown = async () => { await page.waitForFunction(() => { const d = document.querySelector('#bt-drawer'); return d && !d.hidden && getComputedStyle(d).opacity === '1'; }, null, { timeout: 60000 }); await page.waitForTimeout(150); };
  const settle = async () => { await page.waitForFunction(() => !window.btApp.theatre.controls.flight, null, { timeout: 600000 }); await page.evaluate(() => window.btApp.frames(3)); };
  return { ctx, page, log, enter, leave, shot, settle, drawerShown, frames: n => page.evaluate(k => window.btApp.frames(k), n) };
}
// the pure helpers of the page, imported by the same address the theatre uses (so it is the same module instance)
const P_URL = '/app/src/ext/site-places.mjs';

try {
  if (mode === 'look') {
    // ======================================================== a short walk in the shell as a viewer gets it (figures, structures, effects)
    const s = await session(Q); const P = s.page; const ms = await s.enter(); results.notes.push(`entry (look, desktop 1280 x 720): ${ms} ms on software GL; not a timing measurement`);
    const t0 = await P.evaluate(() => window.btApp.state.t);
    await s.shot('look-01-entry'); await P.evaluate(() => window.btApp.theatre.sitePlaces.memorials.setOn(true));
    await P.evaluate(async url => { const Pm = await import(url), th = window.btApp.theatre, [x, z] = th.T.xz(-77.2352, 39.8081); th.controls.flyTo(Pm.poseAround(th.T, x, z, { dist: 240, height: 95 }), 0); }, P_URL); await s.frames(6); await s.shot('look-02-layer-on-cemetery-ridge');
    await P.evaluate(() => window.btApp.theatre.sitePlaces.memorials.select(46)); await P.evaluate(() => window.btApp.theatre.sitePlaces.memorials.flyTo(46)); await s.settle(); await s.shot('look-03-picked-pennsylvania');
    await P.evaluate(() => window.btApp.theatre.setView('overview', true)); await s.settle(); await s.shot('look-04-overview');
    await P.evaluate(() => { const m = window.btApp.theatre.sitePlaces.memorials; m.select(-1); m.setOn(false); window.btApp.theatre.sitePlaces.tour.flyTo(8); }); await s.settle(); await s.shot('look-05-tour-stop-8-layer-off');
    const e = await P.evaluate(() => ({ t: window.btApp.state.t, hooks: window.btApp.theatre.host._hooks.length, marks: !!document.querySelector('#xm-marks') })); check('the short walk: the clock never moved, the layer is off again, no canvas of the memorials is left', e.t === t0 && e.marks === false, { t0, e });
    check('the short walk: no console error, no page error, no failed request, and no warning of these modules', clean(s.log), s.log); if (s.log.warnings.length) results.notes.push(`short walk: ${s.log.warnings.length} console warning(s): ${[...new Set(s.log.warnings)].map(w => w.slice(0, 120)).join(' | ')}`);
    await s.leave(); await s.ctx.close();
  } else {
  // ======================================================== visit 1: a desktop
  let s = await session(Q); const P = s.page; const ms1 = await s.enter(); results.notes.push(`entry (${mode}, desktop): ${ms1} ms on software GL; not a timing measurement`);
  const a = await P.evaluate(() => { const th = window.btApp.theatre, sp = th.sitePlaces || {}; return { api: window.btApp.api, ext: window.btApp.ext.status().filter(x => ['monuments.mjs', 'tour.mjs'].includes(x.path)).map(x => x.path + ':' + x.state + ':' + (x.error || '')), index: window.btApp.ext.index.state, problems: window.btApp.ext.problems().filter(x => /monuments|tour/.test(JSON.stringify(x))).length,
    mem: sp.memorials ? { on: sp.memorials.isOn(), counts: sp.memorials.counts(), integrity: sp.memorials.integrity(), positions: sp.memorials.positions(), drawn: sp.memorials.drawn() } : null, tour: sp.tour ? { count: sp.tour.count, integrity: sp.tour.integrity(), shown: sp.tour.pinShown() } : null,
    dom: { marks: !!document.querySelector('#xm-marks'), chipHidden: document.querySelector('#xm-chip')?.hidden, cardHidden: document.querySelector('#xm-card')?.hidden, pinHidden: document.querySelector('#xt-pin')?.hidden }, hooks: window.btApp.theatre.host._hooks.length, more: document.querySelector('#bt-more').hidden }; });
  check('the real list was read and both modules are running', a.index === 'read' && a.ext.join() === 'monuments.mjs:running:,tour.mjs:running:' && a.problems === 0, a);
  check('the memorial layer is OFF at entry: no canvas, the notice and the card hidden, nothing drawn', a.mem && a.mem.on === false && a.dom.marks === false && a.dom.chipHidden === true && a.dom.cardHidden === true && a.mem.drawn === 0, a);
  check('all 512 memorials and all 16 tour stops are loaded (435 and 14 on the loaded ground, 77 and 2 beyond it)', a.mem && a.mem.counts.total === 512 && a.mem.counts.inside === 435 && a.mem.counts.beyond === 77 && a.tour.count === 16, { mem: a.mem && a.mem.counts, tour: a.tour });
  check('the data hashes recorded with the files were checked in the page and match', a.mem.integrity && a.mem.integrity.checked === true && a.mem.integrity.ok === true && a.tour.integrity.checked === true && a.tour.integrity.ok === true, { mem: a.mem.integrity, tour: a.tour.integrity });
  check('the memorials follow the Monuments list at entry; the tour pin is not shown; the More tool is there', a.mem.positions === 'list' && a.dom.pinHidden === true && a.tour.shown === false && a.more === false, a);
  results.notes.push(`scene hooks registered by all added modules at entry: ${a.hooks}`); const hooks0 = a.hooks;
  const t0 = await P.evaluate(() => window.btApp.state.t);

  // the More drawer: the switch (off), the two panels
  await P.click('#bt-more'); await P.waitForSelector('#bt-drawer:not([hidden])');
  const d = await P.evaluate(() => { const body = document.querySelector('#bt-drawer-body'), sw = body.querySelector('input[data-xlayer="later-memorials"]'); return { title: document.querySelector('#bt-drawer-title').textContent, switchLabel: sw && sw.closest('label')?.textContent.trim(), checked: sw && sw.checked, panels: [...body.querySelectorAll('.xp-item')].map(b => b.dataset.xpanel + ':' + b.textContent.trim().replace(/\s+/g, ' ')), bad: [...body.querySelectorAll('.xp-bad li')].map(li => li.textContent.trim()) }; });
  check('More drawer: the switch carries the post-battle label and is off; both panels are listed; none of the two is "not running"', d.checked === false && /Later memorials/.test(d.switchLabel) && /post-battle/.test(d.switchLabel) && /not part of the 1863 scene/.test(d.switchLabel) && d.panels.some(x => /^later-memorials:Later memorials/.test(x)) && d.panels.some(x => /^tour-stops:Tour stops/.test(x)) && !d.bad.some(x => /monuments|tour/.test(x)), d);
  await s.drawerShown(); await s.shot('01-more-drawer-off');

  // the panel of the memorials, still off
  await P.click('.xp-item[data-xpanel="later-memorials"]'); await P.waitForSelector('#xm-list .item'); await P.waitForTimeout(150);
  const p0 = await P.evaluate(() => { const b = document.querySelector('.xp-body[data-xpanel="later-memorials"]') || document.querySelector('#bt-drawer-body'); return { text: b.textContent.replace(/\s+/g, ' '), pills: [...b.querySelectorAll('.pill')].map(p => (p.dataset.tier || p.dataset.xm || '') + ':' + p.textContent.trim().replace(/\s+/g, ' ')).slice(0, 8), rows: b.querySelectorAll('#xm-list .item').length, count: b.querySelector('#xm-count')?.textContent, on: b.querySelector('#xm-on')?.checked, pos: !!b.querySelector('#xm-pos') }; });
  check('the memorial panel says what they are: later, not part of the 1863 scene, off until switched on, with the tier pill and the open gap for the year', /put up after the battle|after the battle|Every one of them remembers the battle/.test(p0.text) && /none is part of the 1863 scene/.test(p0.text) && /off until you switch/.test(p0.text) && p0.on === false && /ws-world-EG-MON-01/.test(p0.text) && p0.pills.some(x => /^inferred:/.test(x)) && p0.pills.some(x => /^post-battle:Post-battle/.test(x)), { ...p0, text: p0.text.slice(0, 700) });
  check('the list shows the first rows and counts all 512; the nine-state choice is offered', p0.rows === 60 && /^512 of 512 memorials/.test(p0.count) && p0.pos === true, { rows: p0.rows, count: p0.count, pos: p0.pos });
  await s.shot('02-memorial-panel-off');

  // the switch on, in the panel
  await P.check('#xm-on'); await P.waitForFunction(() => document.querySelector('#xm-marks'), null, { timeout: 60000 });
  // a view over the Cemetery Ridge monuments, near enough for names
  await P.evaluate(async url => { const Pm = await import(url), th = window.btApp.theatre, [x, z] = th.T.xz(-77.2352, 39.8081); const pose = Pm.poseAround(th.T, x, z, { dist: 240, height: 95 }); th.controls.flyTo(pose, 0); }, P_URL); await s.frames(4);
  const on1 = await P.evaluate(() => { const th = window.btApp.theatre, m = th.sitePlaces.memorials, chip = document.querySelector('#xm-chip'), cv = document.querySelector('#xm-marks'); return { on: m.isOn(), drawn: m.drawn(), inView: m.marksInView(), chipHidden: chip.hidden, chipText: chip.textContent.replace(/\s+/g, ' ').trim(), cv: cv ? { w: cv.width, h: cv.height, cssW: cv.getBoundingClientRect().width, cssH: cv.getBoundingClientRect().height, next: cv.nextElementSibling && cv.nextElementSibling.id, parent: cv.parentNode.id } : null, stage: (() => { const r = document.querySelector('#bt-stage').getBoundingClientRect(); return { w: r.width, h: r.height }; })(), hooks: th.host._hooks.length, live: document.querySelector('#bt-live').textContent, layerCheck: document.querySelector('input[data-xlayer="later-memorials"]')?.checked }; });
  check('layer ON: a canvas of the picture\'s size in the stage, right under the shell\'s own overlay, with drawn marks; no scene hook is added', on1.on === true && on1.cv && on1.drawn > 5 && Math.abs(on1.cv.cssW - on1.stage.w) < 2 && Math.abs(on1.cv.cssH - on1.stage.h) < 2 && on1.cv.parent === 'bt-stage' && on1.cv.next === 'bt-overlay' && on1.hooks === hooks0, { on1, hooks0 });
  check('layer ON: the notice is shown on the picture and says post-battle, not part of the 1863 scene', on1.chipHidden === false && /Later memorials shown/.test(on1.chipText) && /not part of the 1863 scene/.test(on1.chipText) && /Put up after the battle/.test(on1.chipText), on1.chipText);
  // the left column is shared with the clock face and the other added layers' notices: the label of the layer must lie inside it and must not run under the dock
  const fit = await P.evaluate(() => { const c = document.querySelector('#xm-chip').getBoundingClientRect(), col = document.querySelector('#bt-left').getBoundingClientRect(), dockEl = document.querySelector('.dock') || document.querySelector('#bt-dock'), dock = dockEl ? dockEl.getBoundingClientRect() : null, veg = document.querySelector('#veg-chip'), vr = veg && !veg.hidden ? veg.getBoundingClientRect() : null, clock = document.querySelector('.clockface').getBoundingClientRect(); return { chip: { top: c.top, bottom: c.bottom, h: c.height }, colBottom: col.bottom, dockTop: dock && dock.top, vh: innerHeight, clockH: clock.height, veg: vr && { h: vr.height, bottom: vr.bottom } }; });
  check('layer ON (1280 x 720, with the other added notices): the notice lies inside the left column and is not covered by the dock', fit.dockTop != null && fit.chip.bottom <= fit.colBottom + 1 && fit.chip.bottom <= fit.dockTop, fit);
  await s.shot('03-layer-on-cemetery-ridge');

  // a memorial from the list: search, pick, card, flight
  await P.fill('#xm-q', 'Pennsylvania State Memorial'); await P.waitForFunction(() => /^[1-9]\d* of 512/.test(document.querySelector('#xm-count')?.textContent || '') && document.querySelector('#xm-list .item[data-no="46"]') && document.querySelectorAll('#xm-list .item').length < 60, null, { timeout: 30000 });
  const q1 = await P.evaluate(() => [...document.querySelectorAll('#xm-list .item')].map(b => b.dataset.no + ':' + b.querySelector('.what').textContent)); check('search finds the Pennsylvania State Memorial (no. 46)', q1.some(x => /^46:Pennsylvania State Memorial/.test(x)), q1);
  await P.click('#xm-list .item[data-no="46"]'); await P.waitForSelector('#xm-card:not([hidden])'); await s.settle();
  const c1 = await P.evaluate(() => { const th = window.btApp.theatre, card = document.querySelector('#xm-card'), it = th.sitePlaces.memorials, cam = th.cam; return { selected: it.selected(), title: card.querySelector('h2')?.textContent, text: card.textContent.replace(/\s+/g, ' '), pills: [...card.querySelectorAll('.pill')].map(p => (p.dataset.tier || p.dataset.xm || '') + ':' + p.textContent.trim()), live: document.querySelector('#bt-live').textContent, cam: [cam.x, cam.y, cam.z], shellCardHidden: document.querySelector('#bt-card').hidden, state: { sel: th.state.selected, obj: th.state.selectedObj } }; });
  check('picked memorial: the card names it, says later memorial, post-battle, not part of the 1863 scene, tier inferred, the year as an open gap, and where the position comes from', c1.selected === 46 && c1.title === 'Pennsylvania State Memorial' && /Later memorial\./.test(c1.text) && /not part of the 1863 scene/i.test(c1.text) && c1.pills.some(x => /^inferred:/.test(x)) && c1.pills.some(x => /^post-battle:/.test(x)) && /Put up/.test(c1.text) && /open gap/i.test(c1.text) && /The year is not in the site's data/.test(c1.text) && /Second position/.test(c1.text), c1.text.slice(0, 1200));
  check('picked memorial: the shell\'s own card stays hidden; no unit or structure is selected', c1.shellCardHidden === true && c1.state.sel === -1 && c1.state.obj === -1, c1);
  const room = await P.evaluate(() => { const card = document.querySelector('#xm-card'), r = card.getBoundingClientRect(), chip = document.querySelector('#xm-chip'), clock = document.querySelector('.clockface').getBoundingClientRect(); return { cardH: r.height, rootCard: document.querySelector('#theatre').dataset.card, notice: getComputedStyle(chip).display, hideBtn: !!card.querySelector('[data-act="hide"]'), clockH: clock.height, cardBottom: r.bottom, vh: innerHeight, evidenceOpen: card.querySelector('details')?.open }; });
  check('picked memorial: the card has room (the root says data-card on, the clock face shrinks, the notice gives way to the card), at least 220 px high, inside the screen, the evidence closed, the button that puts the marks away is on it', room.rootCard === 'on' && room.notice === 'none' && room.cardH >= 220 && room.cardBottom <= room.vh && room.evidenceOpen === false && room.hideBtn === true && room.clockH < 160, room);
  await s.shot('04-card-pennsylvania');
  // a memorial whose year a National Park Service report prints: the year, the report, the page and the quotation are on its card; no open gap for the year
  await P.evaluate(() => window.btApp.theatre.sitePlaces.memorials.select(8)); await P.waitForFunction(() => /1929/.test(document.querySelector('#xm-card')?.textContent || ''), null, { timeout: 20000 });
  const c8 = await P.evaluate(() => { const card = document.querySelector('#xm-card'), pills = [...card.querySelectorAll('.pill')].map(p => (p.dataset.tier || p.dataset.xm || '') + ':' + p.textContent.trim()); return { text: card.textContent.replace(/\s+/g, ' '), pills, counts: window.btApp.theatre.sitePlaces.memorials.counts().years }; });
  check('a memorial with a documented year: the card says 1929, names the report, the page and the quotation, and has no open gap for the year', /Put up/.test(c8.text) && /1929/.test(c8.text) && /National Park Service, Cultural Landscapes Inventory: Pickett's Charge Battlefield/.test(c8.text) && /PDF page 44 \(Page 39 of 131\)/.test(c8.text) && /CE 1929 Memorialized Monument\/marker is erected: North Carolina State Monument/.test(c8.text) && c8.pills.some(x => /^documented:/.test(x)) && !/ws-world-EG-MON-01/.test(c8.text) && c8.counts.documented === 32 && c8.counts.inferred === 1 && c8.counts.openGap === 479, c8);
  await s.shot('04b-card-year-documented');
  await P.evaluate(() => window.btApp.theatre.sitePlaces.memorials.select(46)); await P.waitForFunction(() => /Pennsylvania State Memorial/.test(document.querySelector('#xm-card h2')?.textContent || ''), null, { timeout: 20000 });
  const fly1 = await P.evaluate(async url => { const Pm = await import(url), th = window.btApp.theatre, mem = th.sitePlaces.memorials; const items = mem.find({ q: 'Pennsylvania State' }); return { items }; }, P_URL); check('the programmatic find agrees with the panel', fly1.items.includes(46), fly1);

  // a tap on a mark picks it
  const tapAt = await P.evaluate(async url => { const Pm = await import(url), th = window.btApp.theatre, R = th.host.R, aspect = R && R.W > 0 ? R.W / R.H : th.cssW / th.cssH, vp = new Float32Array(16), cam = th.cam, o = [0, 0, 0], rect = document.querySelector('#bt-stage').getBoundingClientRect();
    th.sitePlaces.memorials.select(-1); Pm.viewProj(cam, aspect, vp); const found = [];
    const mem = await (await fetch(new URL('data/site-memorials.json', location.href))).json(); const idx = Pm.buildIndex(mem, th.T); const w = th.cssW, h = th.cssH;
    for (const it of idx.items) { if (!Pm.project(vp, it.x, it.y + 4, it.z, w, h, o)) continue; if (o[0] < 430 || o[0] > w - 430 || o[1] < 130 || o[1] > h - 180) continue; found.push({ no: it.no, name: it.name, x: rect.left + o[0], y: rect.top + o[1], d: Math.hypot(it.x - cam.x, it.y - cam.y, it.z - cam.z) }); }
    found.sort((p, q) => p.d - q.d); // the nearest one that no other mark is within 24 px of
    const one = found.find(f => found.every(g => g === f || Math.hypot(g.x - f.x, g.y - f.y) > 30)); return { n: found.length, one }; }, P_URL);
  check('there are marks in a view of the ridge to tap on', tapAt.n > 3 && tapAt.one, tapAt);
  if (tapAt.one) { await P.mouse.click(tapAt.one.x, tapAt.one.y - 2); await P.waitForTimeout(200); const tp = await P.evaluate(() => ({ sel: window.btApp.theatre.sitePlaces.memorials.selected(), card: !document.querySelector('#xm-card').hidden, title: document.querySelector('#xm-card h2')?.textContent })); check('a tap on a mark picks that memorial and opens its card', tp.sel === tapAt.one.no && tp.card === true, { tap: tapAt.one, tp }); await s.shot('05-tap-pick'); }
  await P.click('#xm-card [data-act="close"]'); check('the card\'s close button puts the card away and clears the pick', await P.evaluate(() => document.querySelector('#xm-card').hidden && window.btApp.theatre.sitePlaces.memorials.selected() === -1));

  // the whole field from above
  await P.evaluate(() => window.btApp.theatre.setView('overview', true)); await s.settle();
  const ov = await P.evaluate(() => ({ drawn: window.btApp.theatre.sitePlaces.memorials.drawn(), inView: window.btApp.theatre.sitePlaces.memorials.marksInView() })); check('the overview shows many marks at once (hundreds)', ov.drawn > 100, ov); await s.shot('06-overview-all-marks');

  // a memorial beyond the loaded ground
  await P.evaluate(() => { const m = window.btApp.theatre.sitePlaces.memorials; m.select(367); m.flyTo(367); }); await s.settle();
  const b1 = await P.evaluate(() => { const th = window.btApp.theatre, m = th.sitePlaces.memorials, card = document.querySelector('#xm-card'), cam = th.cam; return { selected: m.selected(), text: card.textContent.replace(/\s+/g, ' '), live: document.querySelector('#bt-live').textContent, cam: { x: cam.x, z: cam.z }, W: th.T.W, H: th.T.H, drawn: m.drawn() }; });
  check('a memorial beyond the loaded ground (no. 367, 3rd Pennsylvania Cavalry): the card says how far beyond which edge; the camera stands over the loaded ground; the gap is named', b1.selected === 367 && /m beyond the east edge of the loaded ground/.test(b1.text) && /ws-world-EG-MON-02/.test(b1.text) && Math.abs(b1.cam.x) < b1.W / 2 && Math.abs(b1.cam.z) < b1.H / 2 && /beyond the east edge of the loaded ground/.test(b1.live), b1);
  await s.shot('07-beyond-the-ground');

  // choose the other position of the nine state memorials
  await P.selectOption('#xm-pos', 'state-list'); await s.frames(2);
  const sl = await P.evaluate(() => ({ pos: window.btApp.theatre.sitePlaces.memorials.positions(), live: document.querySelector('#bt-live').textContent })); check('the position choice for the nine state memorials switches to the second list and is announced', sl.pos === 'state-list' && /second list/.test(sl.live), sl);
  await P.selectOption('#xm-pos', 'list'); await s.frames(1);

  // switch off from the panel
  await P.uncheck('#xm-on'); await P.waitForFunction(() => !document.querySelector('#xm-marks'), null, { timeout: 30000 }); await P.waitForFunction(() => /hidden/.test(document.querySelector('#bt-live').textContent), null, { timeout: 10000 });       // the screen reader line is written 30 ms after it is cleared
  const off1 = await P.evaluate(() => { const m = window.btApp.theatre.sitePlaces.memorials; return { on: m.isOn(), sel: m.selected(), drawn: m.drawn(), chipHidden: document.querySelector('#xm-chip').hidden, cardHidden: document.querySelector('#xm-card').hidden, marks: !!document.querySelector('#xm-marks'), live: document.querySelector('#bt-live').textContent }; });
  check('layer OFF again: nothing of the memorials is on the picture, nothing is picked, the switch is announced', off1.on === false && off1.sel === -1 && off1.drawn === 0 && off1.chipHidden && off1.cardHidden && !off1.marks && /hidden/.test(off1.live), off1);

  // a memorial picked from the list while the layer is off marks just that one
  await P.evaluate(() => { const m = window.btApp.theatre.sitePlaces.memorials; m.select(46); }); await s.frames(3);
  const one = await P.evaluate(() => { const m = window.btApp.theatre.sitePlaces.memorials; return { on: m.isOn(), sel: m.selected(), drawn: m.drawn(), marks: !!document.querySelector('#xm-marks') }; }); check('layer off + one picked: exactly that memorial is marked', one.on === false && one.sel === 46 && one.drawn <= 1 && one.marks === true, one);
  await P.evaluate(() => window.btApp.theatre.sitePlaces.memorials.select(-1)); await s.frames(2); check('putting the pick away removes the canvas again', await P.evaluate(() => !document.querySelector('#xm-marks')));

  // the tour stops
  await P.evaluate(() => window.btApp.theatre.openPanel('tour-stops')); await P.waitForSelector('#xt-list .item'); await P.waitForTimeout(100);
  const t1 = await P.evaluate(() => { const b = document.querySelector('#bt-drawer-body'); return { rows: [...b.querySelectorAll('#xt-list .item')].map(x => x.dataset.stop + ':' + x.querySelector('.when').textContent + ':' + x.querySelector('.what').textContent), disabled: b.querySelectorAll('#xt-list .item[disabled]').length, text: b.textContent.replace(/\s+/g, ' '), pills: [...b.querySelectorAll('.pill')].map(p => p.textContent.trim()) }; });
  check('the tour panel lists all 16 stops, none disabled; the two beyond the ground say so', t1.rows.length === 16 && t1.disabled === 0 && t1.rows.filter(r => /beyond the loaded ground/.test(r)).length === 2 && /Tour Stop 8/.test(t1.rows[7]) && /Little Round Top/.test(t1.rows[7]), t1);
  check('the tour panel says they are stops of a modern tour, used as places for the camera, and that the clock does not move', /modern tour/.test(t1.text) && /never the clock/.test(t1.text) && t1.pills.some(x => /Modern tour/.test(x)), t1.text.slice(0, 500));
  await P.click('#xt-list .item[data-stop="8"]'); await s.settle();
  const t8 = await P.evaluate(async url => { const Pm = await import(url), th = window.btApp.theatre, tour = th.sitePlaces.tour.stops()[7], cam = th.cam, pin = document.querySelector('#xt-pin'); return { active: th.sitePlaces.tour.active(), shown: th.sitePlaces.tour.pinShown(), pinHidden: pin.hidden, pinText: pin.textContent, kind: tour.kind, pose: tour.pose, cam: { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch }, live: document.querySelector('#bt-live').textContent, current: document.querySelector('#xt-list [aria-current="true"]')?.dataset.stop, lab: (() => { const l = document.querySelector('#xt-pin-lab').getBoundingClientRect(), d = document.querySelector('#bt-drawer').getBoundingClientRect(); return { left: l.left, right: l.right, drawerLeft: d.left, flipped: document.querySelector('#xt-pin-lab').style.right === '12px' }; })() }; }, P_URL);
  check('tour stop 8 with the drawer open: the label of the pin does not run under the drawer', t8.lab.right <= t8.lab.drawerLeft + 1 && t8.lab.left >= 0, t8.lab);
  check('tour stop 8: the camera arrives at the viewpoint of the site\'s walkthrough, the pin shows with "modern tour stop", the row is marked current, the move is announced', t8.active === 8 && t8.kind === 'viewpoint' && Math.hypot(t8.cam.x - t8.pose.x, t8.cam.z - t8.pose.z) < 1 && Math.abs(Math.atan2(Math.sin(t8.cam.yaw - t8.pose.yaw), Math.cos(t8.cam.yaw - t8.pose.yaw))) < .01 && /modern tour stop/.test(t8.pinText) && t8.pinHidden === false && t8.shown === true && t8.current === '8' && /Flying to Tour Stop 8, Little Round Top/.test(t8.live), t8);
  await s.shot('08-tour-stop-8');
  await P.click('#xt-list .item[data-stop="2"]'); await s.settle();
  const t2 = await P.evaluate(() => { const th = window.btApp.theatre, tour = th.sitePlaces.tour.stops()[1], cam = th.cam; return { kind: tour.kind, inside: tour.inside, beyondM: tour.beyondM, dir: tour.dir, pinText: document.querySelector('#xt-pin').textContent, pinHidden: document.querySelector('#xt-pin').hidden, camInside: Math.abs(cam.x) < th.T.W / 2 && Math.abs(cam.z) < th.T.H / 2, live: document.querySelector('#bt-live').textContent }; });
  check('tour stop 2 (beyond the loaded ground): the camera stays over the ground, the pin and the announcement say how far beyond which edge', t2.kind === 'edge' && t2.inside === false && t2.beyondM > 100 && t2.dir === 'north' && /beyond the loaded ground/.test(t2.pinText) && t2.camInside === true && /north edge of the loaded ground/.test(t2.live), t2);
  await s.shot('09-tour-stop-2-beyond');
  await P.click('#xt-clear'); await s.frames(2); check('"Remove the pin" hides the pin and clears the current row', await P.evaluate(() => document.querySelector('#xt-pin').hidden && window.btApp.theatre.sitePlaces.tour.active() === -1 && !document.querySelector('#xt-list [aria-current="true"]')));
  // the pin is removed from the picture with its own close button too
  await P.click('#xt-list .item[data-stop="12"]'); await s.settle(); await P.click('#xt-pin-x'); check('the pin\'s own close button removes it', await P.evaluate(() => document.querySelector('#xt-pin').hidden && window.btApp.theatre.sitePlaces.tour.active() === -1));
  const t1end = await P.evaluate(() => window.btApp.state.t); check('the clock never moved: neither the memorials nor the tour stops touch the time', t1end === t0, { t0, t1end });
  await P.keyboard.press('Escape');

  // the shell's own Views list is unchanged and shows the added switch
  await P.click('[data-panel=views]'); await P.waitForSelector('#xl-block');
  const vw = await P.evaluate(() => { const b = document.querySelector('#bt-drawer-body'); return { tourRows: b.querySelectorAll('[data-kind=tour]').length, tourDisabled: b.querySelectorAll('[data-kind=tour][disabled]').length, sw: !!b.querySelector('#xl-block input[data-xlayer="later-memorials"]'), head: b.querySelector('#xl-block h3')?.textContent }; });
  check('Views: the shell\'s 16 tour rows are still there (2 disabled by the shell, as before) and the memorial switch is listed under "More layers"', vw.tourRows === 16 && vw.tourDisabled === 2 && vw.sw && vw.head === 'More layers', vw);
  await P.keyboard.press('Escape');

  // Back, and a second entry: nothing is left, nothing is remembered
  await P.evaluate(() => { window.btApp.theatre.sitePlaces.memorials.setOn(true); }); await s.frames(2);
  await P.evaluate(() => window.btApp.theatre.sitePlaces.tour.flyTo(5)); await s.settle();
  const preBack = await P.evaluate(() => ({ marks: !!document.querySelector('#xm-marks'), pin: !document.querySelector('#xt-pin').hidden })); check('before Back: marks and a pin are up', preBack.marks && preBack.pin, preBack);
  await s.leave(); await P.waitForTimeout(200);
  const gone = await P.evaluate(() => ({ marks: !!document.querySelector('#xm-marks'), chip: !!document.querySelector('#xm-chip'), card: !!document.querySelector('#xm-card'), pin: !!document.querySelector('#xt-pin'), app: typeof window.btApp, theatre: !!document.querySelector('#theatre') }));
  check('Back: no canvas, notice, card or pin is left in the page; the theatre is gone', !gone.marks && !gone.chip && !gone.card && !gone.pin && gone.app === 'undefined', gone);
  await s.enter(); const re = await P.evaluate(() => { const sp = window.btApp.theatre.sitePlaces; return { on: sp.memorials.isOn(), selected: sp.memorials.selected(), tourActive: sp.tour.active(), marks: !!document.querySelector('#xm-marks'), chips: document.querySelectorAll('#xm-chip').length, pins: document.querySelectorAll('#xt-pin').length, cards: document.querySelectorAll('#xm-card').length, status: window.btApp.ext.status().filter(x => ['monuments.mjs', 'tour.mjs'].includes(x.path)).map(x => x.path + ':' + x.state), hooks: window.btApp.theatre.host._hooks.length, positions: sp.memorials.positions() }; });
  check('second entry: the layer is OFF again (nothing is remembered), one notice, one card, one pin, both modules running, no scene hook of theirs', re.on === false && re.selected === -1 && re.tourActive === -1 && !re.marks && re.chips === 1 && re.pins === 1 && re.cards === 1 && re.status.join() === 'monuments.mjs:running,tour.mjs:running' && re.hooks === hooks0 && re.positions === 'list', { re, hooks0 });
  await s.leave();
  check('the whole desktop visit: no console error, no page error, no failed request, and no warning of these modules', clean(s.log), s.log); if (s.log.warnings.length) results.notes.push(`desktop visit: ${s.log.warnings.length} console warning(s), none of these modules: ${[...new Set(s.log.warnings)].map(w => w.slice(0, 120)).join(' | ')}`);
  results.warnings = [...new Set(s.log.warnings)]; await s.ctx.close();

  // ======================================================== visit 2: a phone
  s = await session(Q, { w: 390, h: 844, touch: true }); const PP = s.page; const ms2 = await s.enter(); results.notes.push(`entry (${mode}, phone 390 x 844, touch): ${ms2} ms on software GL; not a timing measurement`);
  await PP.evaluate(() => window.btApp.theatre.sitePlaces.memorials.setOn(true)); await PP.evaluate(async url => { const Pm = await import(url), th = window.btApp.theatre, [x, z] = th.T.xz(-77.2352, 39.8081); th.controls.flyTo(Pm.poseAround(th.T, x, z, { dist: 240, height: 95 }), 0); }, P_URL); await s.frames(4);
  const ph = await PP.evaluate(() => { const chip = document.querySelector('#xm-chip'), r = chip.getBoundingClientRect(), cs = getComputedStyle(chip), dock = document.querySelector('.dock') || document.querySelector('#bt-dock'), dr = dock ? dock.getBoundingClientRect() : null, clock = document.querySelector('.clockface').getBoundingClientRect(); return { hidden: chip.hidden, display: cs.display, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, vw: innerWidth, vh: innerHeight, dock: dr && { y: dr.y, h: dr.height }, clock: { y: clock.y, h: clock.height, w: clock.width }, text: chip.textContent.replace(/\s+/g, ' ').trim().slice(0, 400), drawn: window.btApp.theatre.sitePlaces.memorials.drawn(), overflowX: document.documentElement.scrollWidth > innerWidth }; });
  check('phone: the post-battle notice is visible (not hidden by the phone layout), inside the screen, with its text', ph.hidden === false && ph.display !== 'none' && ph.rect.w > 100 && ph.rect.x >= 0 && ph.rect.x + ph.rect.w <= ph.vw + 1 && ph.rect.y >= 0 && ph.rect.y + ph.rect.h <= ph.vh && /not part of the 1863 scene/.test(ph.text) && ph.overflowX === false, ph);
  const vegPhone = await PP.evaluate(() => { const v = document.querySelector('#veg-chip'); return v ? { hidden: v.hidden, display: getComputedStyle(v).display } : null; }); results.notes.push(`phone: the notice of the vegetation layer (#veg-chip, another lane's) is ${JSON.stringify(vegPhone)}`);
  await s.shot('10-phone-layer-on');
  await PP.evaluate(() => window.btApp.theatre.sitePlaces.memorials.select(46)); await PP.waitForSelector('#xm-card:not([hidden])'); await s.frames(2);
  const pc = await PP.evaluate(() => { const card = document.querySelector('#xm-card'), r = card.getBoundingClientRect(), chip = document.querySelector('#xm-chip').getBoundingClientRect(); return { card: { y: r.y, h: r.height, bottom: r.bottom }, vh: innerHeight, chip: { y: chip.y, bottom: chip.bottom }, overflowX: document.documentElement.scrollWidth > innerWidth, close: !!card.querySelector('[data-act="close"]') }; });
  check('phone: the card opens as a sheet inside the screen; the close button is there', pc.card.bottom <= pc.vh + 1 && pc.card.h > 80 && pc.close && pc.overflowX === false, pc);
  await s.shot('11-phone-card');
  await PP.evaluate(() => window.btApp.theatre.sitePlaces.memorials.select(-1)); await PP.evaluate(() => window.btApp.theatre.openPanel('tour-stops')); await PP.waitForSelector('#xt-list .item'); await s.shot('12-phone-tour-panel');
  await PP.click('#xt-list .item[data-stop="8"]'); await s.settle(); await PP.waitForTimeout(200); await s.shot('13-phone-tour-stop-8');
  check('the whole phone visit: no console error, no page error, no failed request, and no warning of these modules', clean(s.log), s.log); if (s.log.warnings.length) results.notes.push(`phone visit: ${s.log.warnings.length} console warning(s): ${[...new Set(s.log.warnings)].map(w => w.slice(0, 120)).join(' | ')}`);
  await s.leave(); await s.ctx.close();
  }
} catch (e) { check('the harness ran to the end', false, String(e.stack || e).slice(0, 1200)); }
finally { save(); await br.close().catch(() => {}); await new Promise(r => srv.close(r)); }
console.log(`${results.checks.length - failed} of ${results.checks.length} checks passed (${mode}); results: ${path.join(out, 'results.json')}`);
process.exit(failed ? 1 : 0);
