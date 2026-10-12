// popcover.mjs - popup scenes: for each popup of the product, in place on a busy view, which marks does the interface cover?
//   node popcover.mjs --dir=d1 --look=day --vp=desktop|phone [--only=p1,p4] [--dpr=2]    -> cap-pop/<dir>-<look>/<vp>/<scene>.{json,page.png,dom.png,B.png}
// In the page: every mark inside the viewport at drawn opacity >= 0.5 is drawn alone on the ground-only picture (core ink = 64/255 from the ground), the core bits are kept; DOM elements that lie over the
// marks are named by elementsFromPoint on sample points of the core.  Pixel work is done by popcover.py (the DOM-only picture with the canvas hidden gives the alpha of everything the page paints).
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, DIRS, HERE } from './lib.mjs';
import { initOff, installHelpers, ANGLE, FIELD, HERBST } from './pagelib.mjs';
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const DIR = args.dir; const LOOK = args.look || DIRS[DIR].primary; const VP = args.vp || 'desktop'; const DPR = +(args.dpr || 2);
const ONLY = args.only ? args.only.split(',') : null;
const OUT = path.join(HERE, 'cap-pop', `${DIR}-${LOOK}`, VP); fs.mkdirSync(OUT, { recursive: true });
const QUIET = ['event', 'story', 'toast', 'crossout', 'banner', 'hints'];
// popups: 'default' = every popup of the product as it ships; 'cards-off' = only what the scene is about (the unit card, the clock and the minimap)
const DESK = [
  { id: 'b1-field-z13.5', tick: 551, at: FIELD, zoom: 13.5, mode: 'none', adv: 200, what: 'no popups: the field view at 13.5 (the frame chrome only)' },
  { id: 'b2-angle-z15', tick: 556, at: ANGLE, zoom: 15, mode: 'none', adv: 200, what: 'no popups: the Angle at z15' },
  { id: 'b3-wheatfield-z15', tick: 295, at: { lat: 39.7992, lng: -77.2414 }, zoom: 15, mode: 'none', adv: 200, what: 'no popups: the Wheatfield at z15' },
  { id: 'b4-cemetery-z15.5', tick: 346, at: { lat: 39.8189, lng: -77.2262 }, zoom: 15.5, mode: 'none', adv: 200, what: 'no popups: Cemetery Hill at z15.5' },
  { id: 'p0-opening-chrome', tick: 551, at: FIELD, zoom: 13.5, mode: 'default', adv: 200, what: 'the opening view with every default popup (clock, minimap, hints)' },
  { id: 'p1-events-t28', tick: 28, at: HERBST, zoom: 14.5, mode: 'default', adv: 200, what: 'event card, story card, toasts at t28' },
  { id: 'p2-story-rail', tick: 28, at: HERBST, zoom: 14.5, mode: 'default', adv: 200, js: "S.host.openRail('story-card:story-V-002'); adv(120);", what: 'the story card in the reading rail' },
  { id: 'p3-command-t550', tick: 550, at: ANGLE, zoom: 14.5, mode: 'default', adv: 200, what: 'command-change toasts and cross-out at t550' },
  { id: 'p4-unit-card', tick: 556, at: ANGLE, zoom: 16.5, mode: 'cards-off', select: 'C-53VA', adv: 150, what: 'a selected unit and its card' },
  { id: 'p5-unit-rail', tick: 556, at: ANGLE, zoom: 16.5, mode: 'cards-off', select: 'C-53VA', adv: 150, js: "S.host.openRail('unit-card:sel-C-53VA'); adv(120);", what: 'the unit card in the reading rail' },
  { id: 'p6-hover', tick: 556, at: ANGLE, zoom: 16, mode: 'cards-off', hover: true, adv: 150, what: 'the hover tooltip' },
  { id: 'p7-legend-rail', tick: 551, at: ANGLE, zoom: 15, mode: 'cards-off', adv: 150, js: "S.host.act('legend:legend', 'toggle'); adv(120);", what: 'the legend in the reading rail' },
  { id: 'p8-chronicle-rail', tick: 551, at: ANGLE, zoom: 15, mode: 'cards-off', adv: 150, js: "if (S.host.toggleDoc) S.host.toggleDoc('chronicle:list'); else S.host.key('c'); adv(120);", what: 'the Chronicle in the reading rail' },
  { id: 'p9-day-banner', tick: 224.2, at: ANGLE, zoom: 14, mode: 'default', adv: 40, js: "E.transport.setSpeed(1); E.transport.play(); adv(160); ", what: 'the day banner as the clock crosses dawn' },
  { id: 'p10-tour-step', tick: 300, at: FIELD, zoom: 13.5, mode: 'cards-off', adv: 100, js: "S.startTour('showcase'); adv(160);", what: 'a narration (tour) step' },
  { id: 'p11-welcome', tick: 300, at: FIELD, zoom: 13.5, mode: 'cards-off', adv: 100, js: "S.showWelcome(); adv(120);", what: 'the welcome card' },
  { id: 'p12-tune-panel', tick: 551, at: ANGLE, zoom: 15, mode: 'cards-off', adv: 150, js: "S.ui.togglePanel('tune'); adv(60);", what: 'the Tune panel' },
  { id: 'p13-about-panel', tick: 551, at: ANGLE, zoom: 15, mode: 'cards-off', adv: 150, js: "S.ui.togglePanel('about'); adv(60);", what: 'the About panel' },
  { id: 'p14-hint', tick: 295, at: { lat: 39.7992, lng: -77.2414 }, zoom: 15, mode: 'hint', adv: 200, what: 'a hint with the clock' },
];
const PHONE = [
  { id: 'n1-angle-z14.5', tick: 556, at: ANGLE, zoom: 14.5, mode: 'none', adv: 200, what: 'phone, no popups: the Angle at 14.5' },
  { id: 'n2-wheatfield-z14.5', tick: 295, at: { lat: 39.7992, lng: -77.2414 }, zoom: 14.5, mode: 'none', adv: 200, what: 'phone, no popups: the Wheatfield at 14.5' },
  { id: 'm0-lane', tick: 28, at: HERBST, zoom: 14, mode: 'default', adv: 200, what: 'phone: the default lane at t28' },
  { id: 'm1-unit-sheet', tick: 556, at: ANGLE, zoom: 14.5, mode: 'cards-off', select: 'C-53VA', adv: 150, js: "S.host.openRail('unit-card:sel-C-53VA'); adv(120);", what: 'phone: the unit card in the bottom sheet' },
  { id: 'm2-event-sheet', tick: 28, at: HERBST, zoom: 14, mode: 'default', adv: 200, js: "S.host.openRail('event-card:event-28'); adv(120);", what: 'phone: an event card in the sheet' },
  { id: 'm3-opening', tick: 551, at: FIELD, zoom: 13, mode: 'default', adv: 200, what: 'phone: the opening view' },
  { id: 'm4-legend', tick: 551, at: ANGLE, zoom: 14.5, mode: 'cards-off', adv: 150, js: "S.host.act('legend:legend', 'toggle'); adv(120);", what: 'phone: the legend' },
];
const list = (VP === 'phone' ? PHONE : DESK).filter((s) => !ONLY || ONLY.includes(s.id.split('-')[0]) || ONLY.includes(s.id));
const dims = VP === 'phone' ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
const srv = await serve();
for (const sc of list) {
  const t0 = Date.now(); const run = await launch({ ...dims, dpr: DPR, profile: `pop-${DIR}-${LOOK}-${VP}-${sc.id}`, init: initOff }); const { page } = run;
  try {
    await openDir(page, DIR, LOOK); await installHelpers(page);
    const info = await page.evaluate(async ({ sc, QUIET }) => {
      const S = window.__studio; const E = S.engine; const T = E.tuning; const adv = (n, dt = 16.667) => window.__adv(n, dt); const out = {};
      const setPop = (id, v) => { try { T.set(id, v); } catch (e) { /* absent */ } };
      T.set('popup.enabled', sc.mode !== 'none');
      if (sc.mode === 'cards-off') for (const g of QUIET) setPop('popup.' + g + '.enabled', false);
      if (sc.mode === 'hint') for (const g of QUIET.filter((x) => x !== 'hints')) setPop('popup.' + g + '.enabled', false);
      if (S.host.dismissAll) S.host.dismissAll(); E.select(null); if (S.host.setSelected) S.host.setSelected(null);
      E.transport.pause(); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.at.lat, lng: sc.at.lng, zoom: sc.zoom }, { glide: false, safe: true });
      adv(sc.adv);
      if (sc.select) { const d = E.describeUnit(sc.select); out.sel = !!d; if (d) { E.moveTo({ lat: d.now.lat, lng: d.now.lng, zoom: sc.zoom }, { glide: false, safe: true }); adv(60); E.select(sc.select); S.host.setSelected(sc.select); adv(60); } }
      if (sc.hover) { const f = E.frame; const cx = f.view.w / 2; const cy = f.view.h * 0.42; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.opacity > 0.9 && q.x + f.view.dx > 80 && q.x + f.view.dx < f.view.w - 90 && q.y + f.view.dy > 110).sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy))[0]; out.hoverAt = t ? [t.x + f.view.dx, t.y + f.view.dy] : null; }
      window.__vis0 = window.__visKeys();
      if (sc.js) { try { (new Function('S', 'E', 'adv', sc.js))(S, E, adv); } catch (e) { out.jsError = String(e); } }
      return out;
    }, { sc, QUIET });
    if (info.hoverAt) { const [hx, hy] = info.hoverAt; await page.mouse.move(hx - 90, hy - 50); await page.mouse.move(hx, hy, { steps: 6 }); await page.evaluate(() => window.__adv(80)); await page.waitForTimeout(250); await page.evaluate(() => window.__adv(30)); }
    for (let k = 0; k < 4; k++) await page.evaluate(() => { window.__adv(25); return window.__groundIdle(); });
    await page.waitForTimeout(700); await page.evaluate(() => window.__adv(10));
    // the picture and the marks of this very frame (nothing advances the engine from here on)
    const rec = await page.evaluate(async (sc_has_js) => {
      const S = window.__studio; const E = S.engine; const f = E.frame; const cv = document.getElementById('map'); const dpr = S.renderer.dpr; const W = cv.width; const H = cv.height; const ctx = cv.getContext('2d', { willReadFrequently: true });
      await window.__groundIdle(); window.__drawNow(); const withFx = ctx.getImageData(0, 0, W, H).data; const o = S.lastOut || {}; window.__drawNow(null); const noFx = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data); window.__drawNow();
      const ink = window.__inkFast({ minOpacity: 0.5, allInView: true, keepMasks: true });
      // fx ink (leaders, rings, highlighters the popups draw on the map) over each mark
      for (const b of ink.bodies) { if (!b.bbox) continue; let over = 0; let inBox = 0; const bw = b.bw; const bits = atob(b.coreBits || ''); for (let y = 0; y < b.bh; y++) for (let x = 0; x < bw; x++) { const gx = b.bbox[0] + x; const gy = b.bbox[1] + y; const i = (gy * W + gx) * 4; const d = Math.max(Math.abs(withFx[i] - noFx[i]), Math.abs(withFx[i + 1] - noFx[i + 1]), Math.abs(withFx[i + 2] - noFx[i + 2])); if (d >= 12) { inBox++; const k = y * bw + x; if ((bits.charCodeAt(k >> 3) >> (k & 7)) & 1) over++; } } b.fxOverCore = over; b.fxInBox = inBox; }
      // which element lies over a mark's core: sample points
      const cr = cv.getBoundingClientRect();
      const desc = (el) => { const pc = el.closest && el.closest('[data-popup]'); if (pc) return 'popup:' + pc.getAttribute('data-popup'); for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.id) return '#' + e.id; } const cl = typeof el.className === 'string' ? el.className.split(/\s+/)[0] : ''; return el.tagName.toLowerCase() + (cl ? '.' + cl : ''); };
      for (const b of ink.bodies) {
        if (!b.bbox) continue; const bits = atob(b.coreBits || ''); const pts = []; for (let k = 0; k < b.bw * b.bh; k++) if ((bits.charCodeAt(k >> 3) >> (k & 7)) & 1) pts.push(k); const step = Math.max(1, Math.floor(pts.length / 40)); const cnt = {};
        for (let q = 0; q < pts.length; q += step) { const k = pts[q]; const x = cr.left + (b.bbox[0] + (k % b.bw) + 0.5) / dpr; const y = cr.top + (b.bbox[1] + ((k / b.bw) | 0) + 0.5) / dpr; const els = document.elementsFromPoint(x, y).filter((e) => e !== cv && e.tagName !== 'HTML' && e.tagName !== 'BODY' && e.id !== 'stage'); if (els.length) { const d = desc(els[0]); cnt[d] = (cnt[d] || 0) + 1; } }
        b.over = cnt;
      }
      const popups = []; for (const el of document.querySelectorAll('[data-popup], #pop-rail, #narration, #panel, #metrics, #popups > *, .pc')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; popups.push({ d: desc(el), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], op: +cs.opacity, pos: cs.position, bg: cs.backgroundColor, pe: cs.pointerEvents }); }
      const frame = []; for (const el of document.querySelectorAll('#topbar, #dock, .cmpbadge')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; frame.push({ d: desc(el), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }); }
      const vis1 = window.__visKeys(); const lost = sc_has_js ? [...window.__vis0].filter(([k]) => !vis1.has(k)).map(([k, n]) => n) : null;
      const chromeRects = E.chromeRects ? E.chromeRects() : [];
      const fade = window.__fadeOf(); const vw = S.renderer.size[0]; const vh = S.renderer.size[1];
      const dissolved = f.tiles.filter((t) => { if (t.life !== 'live' || t.opacity < 0.5) return false; const x = t.x + f.view.dx; const y = t.y + f.view.dy; return x + t.w * t.scale / 2 > 0 && x - t.w * t.scale / 2 < vw && y + t.h * t.scale / 2 > 0 && y - t.h * t.scale / 2 < vh && fade(t) < 0.5; }).map((t) => [t.fname || t.short || t.key, +fade(t).toFixed(2), t.kind]);
      const partlyCut = f.tiles.filter((t) => { if (t.life !== 'live' || t.opacity < 0.5) return false; const x = t.x + f.view.dx; const y = t.y + f.view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; return (x - hw < 0 && x + hw > 0) || (x + hw > vw && x - hw < vw) || (y - hh < 0 && y + hh > 0) || (y + hh > vh && y - hh < vh); }).map((t) => { const x = t.x + f.view.dx; const y = t.y + f.view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; return [t.fname || t.short || t.key, t.kind, (x - hw < 0 && x + hw > 0 ? 'L' : '') + (x + hw > vw && x - hw < vw ? 'R' : '') + (y - hh < 0 && y + hh > 0 ? 'T' : '') + (y + hh > vh && y - hh < vh ? 'B' : '')]; });
      return { dpr, W, H, tick: f.tick, zoom: f.zoom, onField: f.onField, overlaps: f.overlaps, unrepresented: f.unrepresented, cand: ink.cand, inview: ink.inview, corePairs: ink.corePairs, softPairs: ink.softPairs, bodies: ink.bodies, popups, frame, lost, vis0: window.__vis0.size, vis1: vis1.size, canvasRect: { left: cr.left, top: cr.top, w: cr.width, h: cr.height }, chromeRects, dissolved, partlyCut, view: { w: f.view.w, h: f.view.h, dx: f.view.dx, dy: f.view.dy }, popupOpen: (() => { try { return Object.keys(S.host.state ? S.host.state() : {}); } catch (e) { return null; } })() };
    }, !!sc.js);
    const base = path.join(OUT, sc.id);
    fs.writeFileSync(`${base}.B.png`, Buffer.from(await page.evaluate(() => window.__png()), 'base64'));
    fs.writeFileSync(`${base}.page.png`, await page.screenshot());
    const h2 = await page.addStyleTag({ content: 'canvas{visibility:hidden!important} html,body,#stage,#app{background:transparent!important}' });
    await page.waitForTimeout(250); fs.writeFileSync(`${base}.dom.png`, await page.screenshot({ omitBackground: true })); await h2.evaluate((e) => e.remove());
    fs.writeFileSync(`${base}.json`, JSON.stringify({ id: sc.id, what: sc.what, dir: DIR, look: LOOK, vp: VP, dpr: DPR, info, ...rec, errors: run.errors.slice(0, 3), external: run.external.slice(0, 3) }));
    console.log(DIR, LOOK, VP, sc.id, 'tiles', rec.bodies.length, 'popups', rec.popups.length, info.jsError ? 'JSERR ' + info.jsError : '', Date.now() - t0, 'ms');
  } catch (e) { console.log('FAILED', DIR, LOOK, VP, sc.id, e.message.slice(0, 300)); }
  finally { await run.close(); }
}
srv.close(); process.exit(0);
