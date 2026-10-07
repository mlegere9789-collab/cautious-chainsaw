// tools/shoot.mjs - the pictures of the brief, in real Chrome at DPR 2 (desktop 1440 x 900, phone 390 x 844), from the built page, driven deterministically (?manual=1: only studio.step advances the
// engine, so the same build gives the same pictures), each with a 100-percent crop of the busiest 600 x 400 CSS-px area, and for every scene the engine's own and an independent brute-force check that no
// vital core overlaps another (results/scenes.json).
//   node tools/shoot.mjs [--only=S1a,S4] [--out=shots] [--tag=iter1]
//   S1a whole field, zoom 13.5, tick 551 (the tick of the prototype's compare-z15)    S1b the Day 3 assault at The Angle, zoom 13.5, tick 556
//   S2 The Wheatfield and Rose Woods, zoom 15, tick 295     S3 Cemetery Hill, zoom 15.5, tick 346     S4 zoom 16.5, one unit selected, the unit card open
//   S5 phone, zoom 14.5, the bottom sheet     S6 an event card and a story card in situ     S7 the legend     S8 a hover tooltip
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, settle, verify, ROOT, REPO, args, sleep } from './lib.mjs';

const OUT = path.resolve(ROOT, args.out || 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TAG = args.tag ? args.tag + '-' : '';
const ONLY = args.only ? new Set(args.only.split(',')) : null;
const FIELD = { lat: 39.81592, lng: -77.23677 }; const ANGLE = { lat: 39.8117, lng: -77.2347 }; const WHEAT = { lat: 39.7992, lng: -77.2414 }; const CEM = { lat: 39.8189, lng: -77.2262 };
const SCENES = [
  { id: 'S1a', name: 'field-z13.5-t551', ...FIELD, zoom: 13.5, tick: 551, popups: 'hud' },
  { id: 'S1b', name: 'day3-assault-the-angle-z13.5-t556', ...ANGLE, zoom: 13.5, tick: 556, popups: 'hud' },
  { id: 'S2', name: 'wheatfield-rose-woods-z15-t295', ...WHEAT, zoom: 15, tick: 295, popups: 'hud' },
  { id: 'S3', name: 'cemetery-hill-z15.5-t346', ...CEM, zoom: 15.5, tick: 346, popups: 'hud' },
  { id: 'S4', name: 'closeup-z16.5-selected-inspect', ...ANGLE, zoom: 16.5, tick: 551, popups: 'select' },
  { id: 'S4b', name: 'closeup-z16.5-selected-details-rail', ...ANGLE, zoom: 16.5, tick: 551, popups: 'select', rail: true },
  { id: 'S5', name: 'phone-z14.5-sheet', ...ANGLE, zoom: 14.5, tick: 551, popups: 'sheet', phone: true },
  { id: 'S6', name: 'event-and-story-in-situ-herbst-woods-t28', lat: 39.8278, lng: -77.2528, zoom: 14.5, tick: 28, popups: 'cards' },
  { id: 'S7', name: 'legend', ...ANGLE, zoom: 15, tick: 551, popups: 'legend' },
  { id: 'S8', name: 'hover-tooltip', ...ANGLE, zoom: 16, tick: 551, popups: 'hover' },
  { id: 'V1', name: 'variant-day-cemetery-hill-z15.5-t346', ...CEM, zoom: 15.5, tick: 346, popups: 'hud', variant: 'day' },
  { id: 'V2', name: 'variant-colour-blind-safe-the-angle-z14.5-t556', ...ANGLE, zoom: 14.5, tick: 556, popups: 'hud', variant: 'cvd' },
  { id: 'V3', name: 'variant-high-contrast-the-angle-z14.5-t556', ...ANGLE, zoom: 14.5, tick: 556, popups: 'hud', variant: 'contrast' },
];

async function busiestWindow(page, W = 600, H = 400) {
  return page.evaluate(({ W, H }) => {
    const S = window.__studio; const f = S.engine.frame; const vw = f.view.w; const vh = f.view.h; const top = vw < 760 ? 120 : 56; const bottom = vw < 760 ? vh - 200 : vh - 160;
    const pts = f.tiles.filter((t) => t.solid).map((t) => [t.x + f.view.dx, t.y + f.view.dy, t.kind === 'agg' ? t.n : 1]);
    const w = Math.min(W, vw); const h = Math.min(H, vh); let best = { n: -1, x: 0, y: 0 };
    for (let x = 0; x + w <= vw; x += 20) for (let y = top; y + h <= bottom + 1; y += 20) { let n = 0; for (const p of pts) if (p[0] > x && p[0] < x + w && p[1] > y && p[1] < y + h) n++; if (n > best.n) best = { n, x, y }; }
    return { ...best, w, h };
  }, { W, H });
}

const go = (page, s) => page.evaluate((o) => {
  const S = window.__studio; const E = S.engine; E.tuning.set('popup.hints.enabled', false); if (S.ui.panelOpen) S.ui.togglePanel(S.ui.tab); S.host.closeRail(); S.ui.chooseStyle('field-manual', o.variant || 'standard'); E.transport.setSpeed(1); for (const id of ['popup.toast.enabled', 'popup.crossout.enabled', 'popup.banner.enabled']) { try { E.tuning.set(id, true); } catch { /* absent */ } } const lg = S.host.state.mod.legend; if (lg) lg.open = false; E.select(null); S.host.setSelected(null); S.ui.setSelection(null); E.transport.pause(); E.transport.seek(o.tick, { glide: false }); E.moveTo({ lat: o.lat, lng: o.lng, zoom: o.zoom }, { glide: false, safe: false });
  for (let i = 0; i < 40; i++) S.step(1, 25);
}, s);

const srv = await startServer();
const results = []; const written = [];
try {
  for (const phone of [false, true]) {
    const list = SCENES.filter((s) => !!s.phone === phone && (!ONLY || ONLY.has(s.id)));
    if (!list.length) continue;
    const cap = phone ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
    const sess = await launch({ ...cap, dpr: 2, profile: phone ? 'phone' : 'desk', query: 'manual=1' });
    const { page } = sess;
    try {
      for (const s of list) {
        await go(page, s);
        if (s.popups === 'hud' || s.popups === 'select' || s.popups === 'hover' || s.popups === 'legend') await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); for (let i = 0; i < 30; i++) S.step(1, 25); });
        await settle(page);
        let extra = {};
        if (s.popups === 'select') {
          extra = await page.evaluate((o) => {
            const S = window.__studio; const E = S.engine; const f = E.frame; const cx = f.view.w / 2; const cy = f.view.h / 2 - 20;
            const cand = f.tiles.filter((t) => t.solid && t.kind === 'leaf' && t.unit && t.unit.kind === 'regiment' && t.unit.inOob).sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy));
            const t = cand[0]; E.select(t.ids[0]); S.host.setSelected(t.ids[0]); S.ui.setSelection(t); if (S.ui.panelOpen) S.ui.togglePanel(S.ui.tab); for (let i = 0; i < 90; i++) S.step(1, 25); if (o.rail) { S.host.openRail('unit-card:sel-' + t.ids[0]); for (let i = 0; i < 100; i++) S.step(1, 25); } return { selected: t.ids[0], label: t.unit.label };
          }, s);
        } else if (s.popups === 'hover') {
          extra = await page.evaluate(() => {
            const S = window.__studio; const E = S.engine; const f = E.frame; const cx = f.view.w / 2; const cy = f.view.h / 2;
            const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.unit && q.unit.kind === 'regiment').sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy))[0];
            S.host.setHover({ key: t.key, since: -9e6, x: 0, y: 0 }); window.__skinKit.setHover(t.key); E.dirty = true; for (let i = 0; i < 60; i++) S.step(1, 25); return { hovered: t.ids[0], label: t.unit.label };
          });
        } else if (s.popups === 'legend') {
          await page.evaluate(() => { const S = window.__studio; S.host.act('legend:legend', 'toggle'); for (let i = 0; i < 60; i++) S.step(1, 25); });
        } else if (s.popups === 'cards') {
          extra = await page.evaluate(() => {
            const S = window.__studio; const E = S.engine; for (const id of ['popup.toast.enabled', 'popup.crossout.enabled', 'popup.banner.enabled']) { try { E.tuning.set(id, false); } catch { /* absent */ } }
            S.host.dismissAll(); E.transport.seek(26, { glide: false }); for (let i = 0; i < 20; i++) S.step(1, 25); E.transport.seek(28, { glide: false }); for (let i = 0; i < 160; i++) S.step(1, 25);
            return { cardIds: S.lastOut.cards.filter((c) => !c.hidden && c.kind !== 'hud').map((c) => c.id + ':' + (c.form && c.form.id)), tick: E.frame.tick };
          });
        } else if (s.popups === 'sheet') {
          extra = await page.evaluate(() => {
            const S = window.__studio; for (let i = 0; i < 200; i++) S.step(1, 25);
            const ids = S.lastOut.cards.map((c) => c.id); const id = ids.find((x) => x.startsWith('event-card:')) || ids[0];
            if (id) S.host.openRail(id); for (let i = 0; i < 100; i++) S.step(1, 25); return { opened: id, cardIds: ids };
          });
        }
        await settle(page, { minFrames: 6 });
        const file = path.join(OUT, `${TAG}${s.id}-${s.name}.png`);
        await page.screenshot({ path: file }); written.push(path.relative(REPO, file).replace(/\\/g, '/'));
        const v = await verify(page); const win = await busiestWindow(page, phone ? 390 : 600, phone ? 420 : 400);
        const cfile = path.join(OUT, `${TAG}${s.id}-${s.name}-crop.png`);
        await page.screenshot({ path: cfile, clip: { x: win.x, y: win.y, width: win.w, height: win.h } }); written.push(path.relative(REPO, cfile).replace(/\\/g, '/'));
        const cards = await page.evaluate(() => { const S = window.__studio; return { frames: S.cardStats.frames, withCards: S.cardStats.withCards, cardsOverTiles: S.cardStats.over, visible: S.lastOut ? S.lastOut.cards.filter((c) => c.opacity > 0.5 && !c.hidden).map((c) => c.id) : [] }; });
        results.push({ scene: s.id, name: s.name, viewport: [cap.w, cap.h], dpr: 2, ...v, busiestWindow: win, cards, ...extra });
        console.log(s.id, JSON.stringify({ tiles: v.tiles, agg: v.aggregates, units: v.unitsOnField, unrep: v.unrepresented, overlaps: v.coreOverlaps, pins: v.pinCovered, minClear: v.minClearancePx, engine: v.engineOverlaps, ink: v.inkOutsideFootprint, cardsOver: cards.cardsOverTiles }));
      }
    } finally { console.log(phone ? 'phone' : 'desktop', 'errors', sess.errors.length, sess.errors.slice(0, 3), 'requests', sess.requests.length); await sess.close(); }
  }
} finally { srv.close(); }
const prev = fs.existsSync(path.join(ROOT, 'results', 'scenes.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'scenes.json'), 'utf8')) : { scenes: [] };
const merged = new Map(prev.scenes.map((r) => [r.scene, r])); for (const r of results) merged.set(r.scene, r);
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'results', 'scenes.json'), JSON.stringify({ generated: new Date().toISOString(), note: 'engine verifier and an independent brute-force check of the frame the page drew; see tools/shoot.mjs', scenes: [...merged.values()] }, null, 1));
console.log(written.length, 'pictures');
