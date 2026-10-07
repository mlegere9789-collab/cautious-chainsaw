// tools/popups-shots.mjs - the popups of the Overlay Director, one picture each, in the language (real Chrome, DPR 2, deterministic), cropped to the popup and its surroundings:
//   P1 day banner + clock  P2 command toasts and the commander cross-out  P3 narration (a tour caption)  P4 narration with the measured results of a tour  P5 welcome  P6 hint  P7 an aggregate under the pointer:
//   its tooltip and the true positions of its records  P8 the Tuning Studio  P9 the About tab  P10 the Chronicle in the rail  P11 the overview map and the clock at rest
//   node tools/popups-shots.mjs [--only=P1,P3] [--tag=iter3]
import path from 'node:path';
import { startServer, launch, settle, ROOT, REPO, args } from './lib.mjs';

const OUT = path.join(ROOT, 'shots'); const ONLY = args.only ? new Set(args.only.split(',')) : null; const TAG = args.tag ? args.tag + '-' : '';
const srv = await startServer(); const written = [];
const want = (id) => !ONLY || ONLY.has(id);
const go = (page, o) => page.evaluate((o) => {
  const S = window.__studio; const E = S.engine; if (S.ui.panelOpen) S.ui.togglePanel(S.ui.tab); S.host.closeRail(); E.select(null); S.host.setSelected(null); E.transport.pause(); E.transport.setSpeed(o.speed || 1);
  E.transport.seek(o.tick, { glide: false }); E.moveTo({ lat: o.lat, lng: o.lng, zoom: o.zoom }, { glide: false, safe: true }); for (let i = 0; i < 30; i++) S.step(1, 25);
}, o);
const clipOf = (page, sel, pad = 40, minW = 0, minH = 0) => page.evaluate(({ sel, pad, minW, minH }) => {
  const els = [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.5; });
  if (!els.length) return null; let x0 = 1e9; let y0 = 1e9; let x1 = -1e9; let y1 = -1e9;
  for (const e of els) { const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(innerWidth, x1 + pad); y1 = Math.min(innerHeight, y1 + pad);
  return { x: Math.round(x0), y: Math.round(y0), width: Math.max(minW, Math.round(x1 - x0)), height: Math.max(minH, Math.round(y1 - y0)) };
}, { sel, pad, minW, minH });
const snap = async (page, id, name, clip) => {
  await page.waitForTimeout(550);                                  // DOM cards and the narration finish their CSS entrance (real time) before the picture
  const f = path.join(OUT, `${TAG}${id}-${name}.png`); await page.screenshot({ path: f, ...(clip ? { clip } : {}) }); written.push(path.relative(REPO, f).split(path.sep).join('/')); console.log(id, clip ? JSON.stringify(clip) : 'full');
};
const ANGLE = { lat: 39.8117, lng: -77.2347 };
/** wait for the aerial tiles without letting the clock or a tour run on (a manual page only draws when stepped: three 1 ms frames redraw the arrived tiles) */
const groundReady = async (page) => { await page.waitForFunction(() => !globalThis.__realBackdrop || !globalThis.__realBackdrop.pending(), null, { timeout: 30000 }); await page.evaluate(() => window.__studio.step(3, 1)); await page.waitForTimeout(250); await page.waitForFunction(() => !globalThis.__realBackdrop || !globalThis.__realBackdrop.pending(), null, { timeout: 30000 }); await page.evaluate(() => window.__studio.step(3, 1)); };

try {
  const sess = await launch({ dpr: 2, profile: 'popups', query: 'manual=1' }); const { page } = sess;
  try {
    await page.evaluate(() => window.__studio.engine.tuning.set('popup.hints.enabled', false));
    if (want('P1')) {   // the day banner: the clock entering the third day
      await go(page, { tick: 449, lat: 39.8189, lng: -77.2262, zoom: 14 });
      await page.evaluate(() => {
        const S = window.__studio; S.host.dismissAll(); S.engine.transport.setSpeed(2); S.engine.transport.play(); let ok = false;
        for (let i = 0; i < 400 && !ok; i++) { S.step(1, 25); ok = S.lastOut.cards.some((c) => c.id.includes('banner') && c.opacity > 0.95); }
        for (let i = 0; i < 10; i++) S.step(1, 25); S.engine.transport.pause(); S.step(30, 25);
      });
      await settle(page, { minFrames: 4 }); await snap(page, 'P1', 'day-banner-and-clock', { x: 0, y: 40, width: 1440, height: 330 });
    }
    if (want('P2')) {   // command toasts
      await go(page, { tick: 549, ...ANGLE, zoom: 15 });
      await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); S.engine.transport.setSpeed(1); S.engine.transport.play(); for (let i = 0; i < 260; i++) S.step(1, 25); S.engine.transport.pause(); S.step(60, 25); });
      await settle(page, { minFrames: 4 }); const c = await clipOf(page, '.pc[data-popup="command-toast"], .pc[data-popup="command-crossout"]', 60, 700, 380); await snap(page, 'P2', 'command-toasts', c);
    }
    if (want('P7')) {   // an aggregate under the pointer: tooltip + the true positions of its records
      await go(page, { tick: 551, ...ANGLE, zoom: 14 }); await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); for (let i = 0; i < 40; i++) S.step(1, 25); });
      await settle(page);
      const h = await page.evaluate(() => {
        const S = window.__studio; const f = S.engine.frame; const cx = f.view.w / 2; const cy = f.view.h / 2;
        const t = f.tiles.filter((q) => q.solid && q.kind === 'agg' && q.n >= 4).sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy))[0];
        S.host.setHover({ key: t.key, since: -9e6, x: 0, y: 0 }); window.__skinKit.setHover(t.key); S.engine.dirty = true; for (let i = 0; i < 60; i++) S.step(1, 25); return { x: t.x + f.view.dx, y: t.y + f.view.dy, n: t.n };
      });
      await settle(page, { minFrames: 4 }); await snap(page, 'P7', 'aggregate-hover-tooltip-and-members', { x: Math.max(0, Math.round(h.x - 300)), y: Math.max(56, Math.round(h.y - 120)), width: 640, height: 470 });
    }
    if (want('P8') || want('P9') || want('P11')) {
      await go(page, { tick: 551, ...ANGLE, zoom: 15 }); await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); for (let i = 0; i < 40; i++) S.step(1, 25); });
      if (want('P11')) { await settle(page); await snap(page, 'P11', 'clock-and-overview', { x: 1000, y: 56, width: 440, height: 220 }); }
      if (want('P8')) { await page.evaluate(() => { const S = window.__studio; S.ui.togglePanel('tune'); for (let i = 0; i < 20; i++) S.step(1, 25); }); await snap(page, 'P8', 'tuning-studio', { x: 1040, y: 40, width: 400, height: 760 }); await page.evaluate(() => window.__studio.ui.togglePanel('tune')); }
      if (want('P9')) { await page.evaluate(() => { const S = window.__studio; S.ui.togglePanel('about'); for (let i = 0; i < 20; i++) S.step(1, 25); }); await snap(page, 'P9', 'about-and-legend-tab', { x: 1040, y: 40, width: 400, height: 860 }); await page.evaluate(() => window.__studio.ui.togglePanel('about')); }
    }
    if (want('P10')) {
      await go(page, { tick: 551, ...ANGLE, zoom: 15 }); await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); for (let i = 0; i < 40; i++) S.step(1, 25); S.host.toggleDoc('chronicle:list'); for (let i = 0; i < 100; i++) S.step(1, 25); });
      await settle(page, { minFrames: 4 }); await snap(page, 'P10', 'chronicle-in-the-rail', { x: 1060, y: 0, width: 380, height: 900 });
    }
    if (want('P6')) {   // a hint: shown once each, only when no card is being read, so in a quiet minute of the first morning
      await go(page, { tick: 6, lat: 39.8278, lng: -77.2528, zoom: 14.5 });
      await page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.hints.enabled', true); S.host.dismissAll(); const def = S.kernel.popups.get('hints'); def.preview(S.host.makeApiFor('hints')); S.engine.transport.pause(); for (let i = 0; i < 160; i++) S.step(1, 25); });
      await groundReady(page); const c = await clipOf(page, '.pc[data-popup="hints"]', 60, 560, 240); if (c) await snap(page, 'P6', 'hint', c); else console.log('P6: no hint card appeared'); await page.evaluate(() => window.__studio.engine.tuning.set('popup.hints.enabled', false));
    }
    console.log('errors', sess.errors.length, sess.errors.slice(0, 3));
  } finally { await sess.close(); }

  if (want('P3') || want('P4')) {   // narration: a tour caption, then the measured results of a tour
    const s2 = await launch({ dpr: 2, profile: 'popups2', query: 'manual=1' }); const pg = s2.page;
    try {
      await pg.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.hints.enabled', false); S.startTour('showcase'); S.step(90, 25); });
      await groundReady(pg); if (want('P3')) await snap(pg, 'P3', 'narration-tour-caption', { x: 0, y: 40, width: 1000, height: 700 });
      await pg.evaluate(() => {
        const S = window.__studio; S.director.stop('closed'); S.startTour('hotspot-the-angle'); const D = S.director; let guard = 0;
        while (D.running && D.tour.steps[D.state.i].id !== 'results' && guard++ < 3000) S.step(1, 25); S.step(40, 25);
      });
      await groundReady(pg); if (want('P4')) await snap(pg, 'P4', 'narration-measured-results', { x: 0, y: 40, width: 1000, height: 760 });
      console.log('errors2', s2.errors.length, s2.errors.slice(0, 3));
    } finally { await s2.close(); }
  }
  if (want('P5')) {
    const s3 = await launch({ dpr: 2, profile: 'popups3', query: 'manual=1', welcome: true });
    try { await s3.page.evaluate(() => { window.__studio.step(60, 25); }); await groundReady(s3.page); await snap(s3.page, 'P5', 'welcome-card', { x: 0, y: 40, width: 1000, height: 700 }); console.log('errors3', s3.errors.length); } finally { await s3.close(); }
  }
} finally { srv.close(); }
console.log(written.length, 'pictures');
