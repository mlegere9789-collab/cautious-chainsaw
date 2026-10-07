// tools/shots.mjs - the pictures of the brief, S1 to S8, at DPR 2 (desktop 1440x900 unless noted), into shots/, with a 100 percent crop of the busiest 600x400 area of each map scene, and the
// engine's own checks on every one (no vital core overlaps another, no pin covered, every unit represented).  Deterministic: the engine and the director are driven by studio.step on a virtual clock.
//   node tools/shots.mjs [--only=s1a,s4] [--out=shots] [--dpr=2] [--variant=cvd|contrast]
import fs from 'node:fs';
import path from 'node:path';
import { launch, settle, args, D2 } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const OUT = path.resolve(args.out || path.join(D2, 'shots')); fs.mkdirSync(OUT, { recursive: true });
const only = args.only ? new Set(args.only.split(',')) : null; const DPR = +(args.dpr || 2);
const results = [];
for (const sc of SCENES) {
  if (only && !only.has(sc.id)) continue;
  const vp = sc.vp || [1440, 900]; const phone = vp[0] < 600;
  const run = await launch({ w: vp[0], h: vp[1], dpr: DPR, mobile: phone, query: 'manual=1' + (args.variant ? '&skin=premium/' + args.variant : '') + (args.query ? '&' + args.query : ''), profile: 'shots' });
  const { page } = run;
  try {
    await page.evaluate(({ sc }) => {
      const st = window.__studio; const e = st.engine; st.tuning.set('popup.enabled', sc.popups !== false);
      if (sc.keep) for (const d of e.kernel.popups.list()) { if (!d.group || sc.keep.includes(d.id)) continue; try { st.tuning.set('popup.' + d.group.replace(/^popup-/, '') + '.enabled', false); } catch { /* a popup without an enabled dial */ } }
      st.updateSafe(); e.transport.pause(); e.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); e.transport.seek(sc.tick, { glide: false }); if (sc.pan) e.panBy(sc.pan[0], sc.pan[1]); window.__adv(40, 50); window.__adv(40, 20);
    }, { sc });
    await settle(page, { frames: 60 });
    const extra = await page.evaluate(async ({ sc }) => {
      const st = window.__studio; const e = st.engine; const view = () => e.frame.view; let info = {};
      const centreTile = (kind) => { const f = e.frame; const cx = f.view.w / 2; const cy = f.view.h * (f.view.w < 600 ? 0.26 : 0.42); return f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.opacity > 0.9 && (!kind || q.unit.kind === kind) && q.x + f.view.dx > 60 && q.x + f.view.dx < f.view.w - 70 && q.y + f.view.dy > 100).sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy))[0]; };
      if (sc.popups === 'select' || sc.popups === 'select-sheet') {
        const t = centreTile('regiment'); const id = t.ids[0]; e.select(id); st.host.setSelected(id); window.__adv(60, 20); info.selected = id;
        if (sc.popups === 'select-sheet') { st.host.openRail('unit-card:sel-' + id); window.__adv(80, 20); const u = e.battle.units.get(id); const p = e.battle.stateOf(u, e.transport.simTau); e.moveTo({ lat: p.lat, lng: p.lng, zoom: sc.zoom }, { glide: false, safe: false }); window.__adv(90, 20); }
      } else if (sc.popups === 'js') { new Function('st', 'e', sc.js)(st, e); }
      else if (sc.popups === 'legend') { st.host.act('legend:legend', 'toggle'); window.__adv(60, 20); }
      else if (sc.popups === 'hover') { const t = centreTile('regiment'); const f = e.frame; info.hover = t.ids[0]; info.hoverAt = [t.x + f.view.dx, t.y + f.view.dy]; }
      window.__adv(30, 16.7); await new Promise((r) => setTimeout(r, 120));
      return info;
    }, { sc });
    if (extra.hoverAt) { const [hx, hy] = extra.hoverAt; await page.mouse.move(hx - 90, hy - 50); await page.mouse.move(hx, hy, { steps: 6 }); await page.evaluate(() => { window.__adv(80, 20); }); await page.waitForTimeout(200); await page.evaluate(() => { window.__adv(30, 20); }); }
    await settle(page, { frames: 20 });
    // the engine's own checks plus an independent brute-force one on the frame that was drawn
    const chk = await page.evaluate(() => {
      const e = window.__studio.engine; const f = e.frame; const v = f.view; const spec = f.spec; const gap = spec.gap;
      const live = f.tiles.filter((t) => t.opacity >= 0.5); const R = live.map((t) => ({ t, x0: t.x + v.dx - t.w * t.scale / 2, x1: t.x + v.dx + t.w * t.scale / 2, y0: t.y + v.dy - t.h * t.scale / 2, y1: t.y + v.dy + t.h * t.scale / 2 }));
      let overlaps = 0; let tight = 0; let minGap = Infinity;
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i]; const b = R[j]; const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1); const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1); const g = Math.max(dx, dy); if (g < 0) overlaps++; else { if (g < minGap) minGap = g; if (g < gap - 0.06) tight++; } }
      let pinsCovered = 0; let displaced = 0; for (const a of R) { if (!a.t.displaced) continue; displaced++; for (const b of R) { if (b === a) continue; const px = a.t.ax + v.dx; const py = a.t.ay + v.dy; if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1) pinsCovered++; } }
      const onScreen = R.filter((r) => r.x1 > 0 && r.x0 < v.w && r.y1 > 0 && r.y0 < v.h);
      const aggs = f.tiles.filter((t) => t.kind === 'agg' && t.life === 'live'); const merged = aggs.reduce((s, t) => s + t.n, 0);
      // the chrome that lies over the map (brand and clock chips, the tool strip, the dock, every open card): a mark more than half under it is reported, and the crop window avoids it
      const rectsOf = (sel) => [...document.querySelectorAll(sel)].filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 4 && r.height > 4; }).map((el) => { const r = el.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; });
      const fixed = rectsOf('#topbar > *, #dock, .pop-strip-btn, #panel:not(.hidden)'); const cards = rectsOf('.pc, .pop-rail, .pop-chip'); const chrome = [...fixed, ...cards];
      const covOf = (list) => (r) => { let best = 0; const a = (r.x1 - r.x0) * (r.y1 - r.y0); for (const c of list) { const w = Math.min(r.x1, c.x1) - Math.max(r.x0, c.x0); const h = Math.min(r.y1, c.y1) - Math.max(r.y0, c.y0); if (w > 0 && h > 0) best = Math.max(best, (w * h) / a); } return best; };
      const covFixed = covOf(fixed); const covCards = covOf(cards); const underChrome = onScreen.filter((r) => covFixed(r) > 0.5).length; const touchChrome = onScreen.filter((r) => covFixed(r) > 0).length; const underCards = onScreen.filter((r) => covCards(r) > 0).length;
      // the busiest 600x400 window by mark centres, among windows that do not touch the chrome (if none is free, among all, and the result says so)
      const W = Math.min(600, v.w); const pts = onScreen.map((r) => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2]); const free = (x, y, H) => !chrome.some((c) => c.x0 < x + W && c.x1 > x && c.y0 < y + H && c.y1 > y);
      const scan = (needFree, H) => { let best = { n: -1, x: 0, y: 0, h: H, free: false }; for (let x = 0; x <= Math.max(0, v.w - W); x += 20) for (let y = 0; y <= Math.max(0, v.h - H); y += 20) { if (needFree && !free(x, y, H)) continue; let n = 0; for (const p of pts) if (p[0] >= x && p[0] < x + W && p[1] >= y && p[1] < y + H) n++; if (n > best.n) best = { n, x, y, h: H, free: free(x, y, H) }; } return best; };
      // the busiest 600x400 window that touches no chrome; on a phone (390 wide, half of it a sheet) the window is 390 wide and as tall as the free map allows (400, else 300); if none is free the busiest window of 400 is taken and the result says so
      let best = scan(true, 400); if (best.n < 0) best = scan(true, 300); if (best.n < 0) best = scan(false, 400); best.w = W;
      return { marks: f.tiles.filter((t) => t.life === 'live').length, solid: live.length, onScreen: onScreen.length, marksUnderChrome: underChrome, marksTouchingChrome: touchChrome, marksUnderCards: underCards, crowdMarks: aggs.length, unitsInCrowds: merged, unitsOnField: f.onField, engineOverlaps: f.overlaps, engineClearanceViolations: f.clearanceViolations, unrepresented: f.unrepresented, bruteOverlaps: overlaps, tightPairs: tight, minGapPx: Number.isFinite(minGap) ? +minGap.toFixed(2) : null, gapPx: gap, displaced, pinsCovered, busiest: best, zoom: f.zoom, tick: f.tick, viewport: [v.w, v.h] };
    });
    // the type actually on screen: every visible text node of the page, by computed size, weight and family (the marks are canvas text and are audited by tools/legibility.mjs: 11 and 13 px)
    const type = await page.evaluate(() => {
      const root = document.getElementById('app'); const by = {}; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const txt = n.textContent.replace(/\s+/g, ' ').trim(); if (!txt) continue; const el = n.parentElement; if (!el) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); o *= +c.opacity; if (c.display === 'none') o = 0; } if (o < 0.05) continue;
        const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
        const size = +parseFloat(cs.fontSize).toFixed(2); const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); const k = size + 'px ' + cs.fontWeight + ' ' + fam; const b = by[k] || (by[k] = { size, weight: cs.fontWeight, family: fam, chars: 0, nodes: 0, sample: txt.slice(0, 40), cls: el.className && String(el.className).slice(0, 40) }); b.chars += txt.length; b.nodes++;
      }
      const rows = Object.values(by).sort((a, b) => b.chars - a.chars); return { sizes: [...new Set(rows.map((r) => r.size))].sort((a, b) => a - b), min: Math.min(...rows.map((r) => r.size)), rows };
    });
    // the eight pictures of the brief are PNG; the extra scenes (S9 to S12) and every picture of a --jpeg run (the variants) are JPEG at quality 90 to keep the folder light
    const asJpeg = !!args.jpeg || /^s(9|1[0-2])$/.test(sc.id); const named = asJpeg ? sc.file.replace(/\.png$/, '.jpg') : sc.file; const shot = (o) => page.screenshot(asJpeg ? { ...o, type: 'jpeg', quality: 90 } : o);
    const file = path.join(OUT, named); await shot({ path: file });
    let crop = null;
    if (['s1a', 's1b', 's1c', 's2', 's3', 's4', 's5', 's8'].includes(sc.id)) { const b = chk.busiest; crop = named.replace(/\.(png|jpg)$/, `-crop-busiest-${b.w}x${b.h}.$1`); await shot({ path: path.join(OUT, crop), clip: { x: b.x, y: b.y, width: b.w, height: b.h } }); }
    results.push({ id: sc.id, file: named, crop, title: sc.title, ...chk, type, extra, errors: run.errors.filter((m) => !/404/.test(m)), external: run.requests });
    console.log(sc.id, JSON.stringify({ marks: chk.marks, crowds: chk.crowdMarks, inCrowds: chk.unitsInCrowds, units: chk.unitsOnField, ov: chk.bruteOverlaps, eov: chk.engineOverlaps, unrep: chk.unrepresented, tight: chk.tightPairs, pins: chk.pinsCovered, minGap: chk.minGapPx, underChrome: chk.marksUnderChrome, underCards: chk.marksUnderCards, cropFree: chk.busiest.free, typeSizes: type.sizes.join('/'), err: run.errors.length }));
  } finally { await run.close(); }
}
const resFile = path.join(D2, 'results', args.variant ? `shots-${args.variant}.json` : 'shots.json'); fs.mkdirSync(path.dirname(resFile), { recursive: true });
if (!only) fs.writeFileSync(resFile, JSON.stringify({ made: 'node tools/shots.mjs', dpr: DPR, results }, null, 1)); else fs.writeFileSync(path.join(D2, 'results', 'shots-partial.json'), JSON.stringify({ results }, null, 1));
