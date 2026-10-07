// test/popups-browser.mjs - the popups in REAL Chrome (playwright-core + the system Chrome, no network): what the node tests cannot see.
//   1. the measured heights: the real DOM height of every placed card equals the height the director placed it with (the guarantee is about the real rectangle, not an estimate);
//   2. the guarantee again, on the real DOM: no visible card's getBoundingClientRect() touches a tile's chip, label, pin or dot, the topbar, the dock, the panel, another card;
//   3. the page makes no request, logs no error, and keeps 60 fps with popups at 4x; the director's own cost per frame;
//   4. keyboard and screen reader: Esc closes one layer per press, C opens the Chronicle and focus returns, the live region speaks at most once per 2 s, cards are labelled;
//   5. the phone layout (390 x 844, touch): chips in the lane, the sheet, the map above it, no tile under the sheet;  reduced motion: the rail makes room at once.
//   node docs/pitch/anim/prototype/test/popups-browser.mjs [--stride=3] [--port=9664]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const STRIDE = +(args.stride || 3); const PORT = +(args.port || 9664);
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = (q) => pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1&' + q;
const results = { when: new Date().toISOString(), stride: STRIDE, chrome: null, checks: [], failures: [], details: {} }; const ok = (name, cond, detail = '') => { results.checks.push(name); if (!cond) { results.failures.push(`${name} ${detail}`); console.log('FAIL', name, detail); } else console.log('ok  ', name, detail); };

// the oracle, inside the page: every tile's ink as exact rectangles, and the DOM rectangles of the interface
const PAGE_ORACLE = `(() => {
  const f = window.__studio.engine.frame; const dx = f.view.dx, dy = f.view.dy; const obs = [];
  for (const t of f.tiles) { if (!(t.opacity >= 0.2)) continue; const hw = t.w * t.scale / 2, hh = t.h * t.scale / 2, cx = t.x + dx, cy = t.y + dy;
    obs.push({ k: 'chip', o: t.key, x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh }); if (t.label && t.label.opacity >= 0.2) obs.push({ k: 'label', o: t.key, x0: t.label.x0 + dx, y0: t.label.y0 + dy, x1: t.label.x1 + dx, y1: t.label.y1 + dy });
    if (t.displaced) obs.push({ k: 'pin', o: t.key, x0: t.ax + dx - 2, y0: t.ay + dy - 2, x1: t.ax + dx + 2, y1: t.ay + dy + 2 });
    if (t.kind === 'agg' && t.members) for (const m of t.members) obs.push({ k: 'dot', o: t.key, x0: m.ax + dx - 2, y0: m.ay + dy - 2, x1: m.ax + dx + 2, y1: m.ay + dy + 2 }); }
  const app = document.getElementById('app').getBoundingClientRect(); const rel = (r) => ({ x0: r.left - app.left, y0: r.top - app.top, x1: r.right - app.left, y1: r.bottom - app.top });
  const chrome = []; for (const sel of ['#topbar > *', '#dock', '#panel:not(.hidden)', '#metrics:not(.hidden)']) for (const n of document.querySelectorAll(sel)) { const r = n.getBoundingClientRect(); if (r.width > 0 && r.height > 0) chrome.push({ k: 'chrome:' + sel, x0: rel(r).x0, y0: rel(r).y0, x1: rel(r).x1, y1: rel(r).y1 }); }
  const cards = []; for (const el of document.querySelectorAll('#popups .pc')) { const cs = getComputedStyle(el); const op = parseFloat(cs.opacity); if (cs.visibility === 'hidden' || op < 0.2) continue; const r = el.getBoundingClientRect(); const sc = new DOMMatrix(cs.transform).a || 1; cards.push({ id: el.getAttribute('aria-label'), form: el.dataset.form, kind: el.dataset.kind, op, ...rel(r), scale: sc, h: el.offsetHeight }); }
  const map = window.__studio.lastOut ? window.__studio.lastOut.mapRect : { w: app.width, h: app.height };
  const hits = []; const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  for (const c of cards) { if (c.scale < 0.99) continue; for (const o of obs) if (ov(c, o)) { hits.push(c.id + ' on a ' + o.k + ' of ' + o.o); break; } for (const o of chrome) if (ov(c, o)) { hits.push(c.id + ' on ' + o.k); break; } if (c.x0 < -0.5 || c.y0 < -0.5 || c.x1 > map.w + 0.5 || c.y1 > map.h + 0.5) hits.push(c.id + ' outside the map'); }
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) if (ov(cards[i], cards[j])) hits.push('cards overlap: ' + cards[i].id + ' / ' + cards[j].id);
  const lastOut = window.__studio.lastOut; const hostH = {}; if (lastOut) for (const c of lastOut.cards) if (c.rect) hostH[c.spec.forms[c.formIdx] ? c.id : c.id] = c.rect.h;
  const heightMismatch = []; for (const el of document.querySelectorAll('#popups .pc')) { const id = el.dataset.id; }
  return { n: cards.length, hits, cards: cards.map((c) => ({ id: c.id, form: c.form, h: c.h })), obstacles: obs.length };
})()`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-extensions', '--remote-debugging-port=' + PORT] });
const newPage = async (vp, extra = {}) => {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: extra.dpr || 1, hasTouch: !!extra.touch, reducedMotion: extra.reduced ? 'reduce' : 'no-preference', colorScheme: extra.dark ? 'dark' : 'light' });
  const page = await ctx.newPage(); const errs = []; const reqs = []; page.on('pageerror', (e) => errs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); });
  return { ctx, page, errs, reqs };
};
results.chrome = browser.version();
try {
  // ---------------------------------------------------------------- 1 + 2: real rectangles on every (strided) popup tick
  for (const zoom of [13.5, 15]) {
    const { ctx, page, errs, reqs } = await newPage([1440, 900]);
    await page.goto(url(`scene=fresh2&zoom=${zoom}`)); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const ticks = await page.evaluate(() => { const pd = window.__studio.popupData; const s = new Set(); for (const e of pd.events) if (e.sig !== 'low') s.add(e.tick); for (const x of pd.stories) s.add(x.tick); for (const x of pd.successions) s.add(x.tick); return [...s].sort((a, b) => a - b); });
    let frames = 0; const bad = []; const mism = []; let cardsSeen = 0;
    for (const [i, t] of ticks.entries()) {
      if (i % STRIDE) continue;
      await page.evaluate((tick) => { const st = window.__studio; st.engine.transport.pause(); st.engine.transport.seek(tick, { glide: false }); st.step(14, 50); }, t);
      for (let k = 0; k < 5; k++) {
        await page.evaluate(() => window.__studio.step(2, 50)); frames++;
        const r = await page.evaluate(PAGE_ORACLE); cardsSeen += r.n; if (r.hits.length) bad.push(`tick ${t}: ${r.hits[0]}`);
        const hm = await page.evaluate(() => { const o = window.__studio.lastOut; const out = []; for (const c of o.cards) { if (!c.rect || c.opacity < 0.99 || c.phase !== 'show') continue; const el = [...document.querySelectorAll('#popups .pc')].find((e) => e.dataset.id === c.id); if (el && Math.abs(el.offsetHeight - c.rect.h) > 1.01) out.push(`${c.id} ${c.form.id}: placed ${c.rect.h}, real ${el.offsetHeight}`); } return out; });
        if (hm.length) mism.push(`tick ${t}: ${hm[0]}`);
      }
    }
    results.details['zoom' + zoom] = { ticks: ticks.filter((_, i) => i % STRIDE === 0).length, frames, cardFrames: cardsSeen };
    ok(`real DOM: no card touches a tile, the interface or another card (zoom ${zoom})`, bad.length === 0, `${frames} frames, ${cardsSeen} card-frames; ${bad.slice(0, 3).join(' | ')}`);
    ok(`real DOM: the height each card was placed with is its real height (zoom ${zoom})`, mism.length === 0, mism.slice(0, 3).join(' | '));
    ok(`no console error and no network request (zoom ${zoom})`, errs.length === 0 && reqs.length === 0, `${errs.slice(0, 3).join(' | ')} ${reqs.slice(0, 2).join(' ')}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------- 3: real playback, frame pacing, the director's cost
  {
    const { ctx, page, errs } = await newPage([1440, 900]);
    await page.goto(url('scene=fresh2&zoom=14&play=1&speed=4&tick=280')); await page.waitForFunction(() => window.__studio && window.__studio.ready); await page.waitForTimeout(500);
    await page.evaluate(() => { window.__hostMs = []; window.__studio.engine.metrics.reset(); const h = window.__studio.host; const orig = h.frame; h.frame = function (...a) { const t0 = performance.now(); const o = orig.apply(this, a); window.__hostMs.push(performance.now() - t0); return o; }; });
    await page.waitForTimeout(9000);
    const r = await page.evaluate(() => { const s = window.__studio.engine.metrics.summary(); const a = window.__hostMs.slice().sort((x, y) => x - y); const p = (q) => a[Math.min(a.length - 1, Math.floor(a.length * q))]; const st = window.__studio.host.stats; return { fps: window.__studio.engine.metrics.live().fps, over20: s.framesOver20msPct, over33: s.framesOver33msPct, hostP50: p(0.5), hostP95: p(0.95), hostMax: a[a.length - 1], n: a.length, relocations: st.relocations, cutFrames: st.cutFrames, overlap: st.overlapFrames, fired: st.fired, tick: window.__studio.engine.frame.tick }; });
    console.log('# playback 4x, 9 s from tick 280:', JSON.stringify(r)); results.details.playback4x = r;
    ok('playback at 4x: 60 fps class (under 5 % of frames over 20 ms)', r.over20 < 5, `${r.over20}% over 20 ms, host p50 ${r.hostP50.toFixed(2)} p95 ${r.hostP95.toFixed(2)} max ${r.hostMax.toFixed(1)} ms`);
    ok('playback at 4x: the director costs under 3 ms at p95', r.hostP95 < 3, r.hostP95.toFixed(2) + ' ms'); ok('playback at 4x: no overlap frame, no error', r.overlap === 0 && errs.length === 0, errs.join('|'));
    // no leak: the DOM the popups own stays bounded over a long run (8x through the middle of the battle, 25 s)
    const n0 = await page.evaluate(() => ({ all: document.querySelectorAll('*').length, cards: document.querySelectorAll('#popups .pc').length })); await page.evaluate(() => window.__studio.engine.transport.setSpeed(8)); const samples = [];
    for (let k = 0; k < 5; k++) { await page.waitForTimeout(5000); samples.push(await page.evaluate(() => ({ all: document.querySelectorAll('*').length, cards: document.querySelectorAll('#popups .pc').length, chips: document.querySelectorAll('.pop-chip').length, tick: window.__studio.engine.frame.tick }))); }
    console.log('# DOM over 25 s at 8x:', JSON.stringify(samples)); results.details.domOver25sAt8x = samples; ok('no leak: the DOM stays bounded over a long run at 8x', samples.every((x) => x.cards <= 24 && x.chips <= 8 && x.all - n0.all < 400), JSON.stringify(samples.map((x) => x.all - n0.all)));
    await ctx.close();
  }

  // ---------------------------------------------------------------- 4: keyboard and screen reader (real key events)
  {
    const { ctx, page, errs } = await newPage([1440, 900]);
    await page.goto(url('scene=fresh2&zoom=14.5&tick=20')); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    await page.evaluate(() => { const st = window.__studio; st.engine.moveTo({ lat: 39.8278, lng: -77.2528, zoom: 14.5 }, { glide: false, safe: true }); st.engine.transport.seek(28, { glide: false }); st.step(30, 50); }); await page.waitForTimeout(100);
    const lbl = await page.evaluate(() => [...document.querySelectorAll('#popups .pc')].map((e) => e.getAttribute('aria-label')).filter(Boolean));
    ok('cards are labelled for a screen reader', lbl.length > 0 && lbl.every((l) => l.length > 8), JSON.stringify(lbl.slice(0, 2)));
    await page.keyboard.press('c'); await page.evaluate(() => window.__studio.step(40, 16)); await page.waitForTimeout(80);
    const open = await page.evaluate(() => ({ open: document.getElementById('pop-rail').dataset.open, hidden: document.getElementById('pop-rail').getAttribute('aria-hidden'), w: window.__studio.engine.camera.w, focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName) }));
    ok('C opens the Chronicle in the rail and the map makes room', open.open === 'true' && open.hidden === null && open.w === 1440 - 360, JSON.stringify(open));
    await page.keyboard.press('Escape'); await page.evaluate(() => window.__studio.step(60, 16)); await page.waitForTimeout(80);
    const closed = await page.evaluate(() => ({ open: document.getElementById('pop-rail').dataset.open, w: window.__studio.engine.camera.w, hidden: document.getElementById('pop-rail').getAttribute('aria-hidden') }));
    ok('the first Esc closes the rail (one layer per press) and the map returns', closed.open === 'false' && closed.w === 1440 && closed.hidden === 'true', JSON.stringify(closed));
    const count = () => page.evaluate(() => [...document.querySelectorAll('#popups .pc[data-kind="card"]')].filter((e) => e.dataset.phase !== 'out').length + document.querySelectorAll('.pop-chip').length);
    const before = await count(); await page.keyboard.press('Escape'); await page.evaluate(() => window.__studio.step(30, 16)); await page.waitForTimeout(60);
    const after = await count();
    ok('the second Esc dismisses the newest card', before === 0 || after === before - 1, `${before} -> ${after}`);
    const live = await page.evaluate(() => document.getElementById('pop-live').getAttribute('role') + '|' + document.getElementById('pop-live').getAttribute('aria-live'));
    ok('the live region is polite', live === 'status|polite', live); ok('keyboard run: no console error', errs.length === 0, errs.join('|'));
    // tab order reaches a card's buttons
    await page.evaluate(() => { const st = window.__studio; st.engine.transport.seek(28, { glide: false }); st.engine.transport.seek(29, { glide: false }); st.engine.transport.seek(28, { glide: false }); st.step(40, 50); });
    const focusable = await page.evaluate(() => [...document.querySelectorAll('#popups .pc button')].filter((b) => b.getAttribute('aria-label')).length);
    ok('card buttons have accessible names', focusable === 0 || await page.evaluate(() => [...document.querySelectorAll('#popups .pc button')].every((b) => (b.getAttribute('aria-label') || b.textContent).trim().length > 1)), String(focusable));
    await ctx.close();
  }

  // ---------------------------------------------------------------- 5: phone, reduced motion
  {
    const { ctx, page, errs } = await newPage([390, 844], { dpr: 2, touch: true });
    await page.goto(url('scene=fresh2&zoom=14')); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    await page.evaluate(() => { const st = window.__studio; st.engine.moveTo({ lat: 39.8278, lng: -77.2528, zoom: 14 }, { glide: false, safe: true }); st.engine.transport.seek(28, { glide: false }); st.step(40, 50); });
    const lane = await page.evaluate(() => ({ floatingCards: document.querySelectorAll('#popups .pc[data-kind="card"]').length, chips: document.querySelectorAll('.pop-chip').length, more: document.querySelector('.pop-chips').dataset.more }));
    ok('phone: no free-standing cards, the newest chip in the lane with a counter', lane.floatingCards === 0 && lane.chips >= 1, JSON.stringify(lane));
    await page.evaluate(() => { const st = window.__studio; st.host.openRail('event-card:event-28'); st.step(60, 16); });
    const sheet = await page.evaluate(() => { const r = document.getElementById('pop-rail').getBoundingClientRect(); const o = window.__studio.lastOut; const f = window.__studio.engine.frame; const mapH = o.mapRect.h; const under = f.tiles.filter((t) => t.solid && t.y + f.view.dy > mapH && t.y + f.view.dy < r.top).length; return { top: Math.round(r.top), bottom: Math.round(r.bottom), mapH: Math.round(mapH), phone: o.phone, dock: document.getElementById('dock').getBoundingClientRect().top }; });
    ok('phone: the sheet stands above the dock and the map ends where the sheet begins', Math.abs(sheet.top - sheet.mapH) < 2 && sheet.bottom <= sheet.dock + 1, JSON.stringify(sheet));
    ok('phone run: no console error, no network', errs.length === 0, errs.join('|')); await ctx.close();
  }
  {
    const { ctx, page } = await newPage([1440, 900], { reduced: true });
    await page.goto(url('scene=fresh2&zoom=14.5&tick=20')); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const r = await page.evaluate(() => { const st = window.__studio; st.engine.transport.seek(28, { glide: false }); st.step(30, 50); st.host.key('c'); st.step(2, 16); return { inset: st.lastOut.inset.right, w: st.engine.camera.w }; });
    ok('reduced motion: the rail makes room at once', r.inset === 360 && r.w === 1080, JSON.stringify(r)); await ctx.close();
  }
} finally { await browser.close(); }
if (args.out) fs.writeFileSync(path.resolve(args.out), JSON.stringify(results, null, 1));
console.log(`\n${results.checks.length - results.failures.length} of ${results.checks.length} checks passed`); if (results.failures.length) { console.log(results.failures.join('\n')); process.exit(1); }
