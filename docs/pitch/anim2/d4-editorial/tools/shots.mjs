// tools/shots.mjs - the pictures of the brief, rendered by the built page in real Chrome from the real data on the real aerial ground (a static server, no network).
//   node tools/shots.mjs [--set=final|iN] [--dpr=2] [--only=S1a,S4] [--look=paper|aerial] [--port=10000] [--fmt=png|jpg]
// --set=final writes to shots/ (PNG, DPR 2, 1440x900; the phone 390x844); --set=iN writes the same pictures as JPEG into iterations/iN/ (the log ITERATIONS.md cites them).
// Every scene also writes its measured counts (the independent frame check, tools/frame-check.mjs) to results/scenes-<set>.json.
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT, PAGE } from './lib.mjs';
import { frameCheck } from './frame-check.mjs';

const a = process.argv.slice(2); const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
const SET = o.set || 'final'; const DPR = +(o.dpr || 2); const PORT = +(o.port || 10000); const LOOK = o.look || 'paper'; const only = o.only ? o.only.split(',') : null;
const ROUND = /^round-/.test(SET); const FMT = o.fmt || (SET === 'final' || ROUND ? 'png' : 'jpg'); const OUT = SET === 'final' ? path.join(ROOT, 'shots') : ROUND ? path.join(ROOT, 'shots', SET) : path.join(ROOT, 'iterations', SET); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
const QUIET = { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.banner.enabled': false, 'popup.hints.enabled': false };
const q = (base, set = {}) => `${base}&style=${LOOK === 'aerial' ? 'dispatch-aerial' : 'dispatch-paper'}&set=${encodeURIComponent(JSON.stringify(set))}`;

// the unit selected in S4, S5 and S8: a Confederate regiment of Armistead's brigade at The Angle (found by its short code, so the picture follows the data)
const FIND = (short) => `const S = window.__studio; const f = S.engine.frame; const t = f.tiles.find((q) => q.life === 'live' && q.kind === 'leaf' && q.short === ${JSON.stringify(short)}); if (!t) throw new Error('no tile ${short}');`;
const SCENES = [
  { id: 'S1a-field-z13.5-t551', q: q('scene=field&tick=551&zoom=13.5', QUIET), crop: true },
  { id: 'S1b-field-z13.5-t556-assault', q: q('scene=field&tick=556&zoom=13.5', QUIET), crop: true },
  { id: 'S2-wheatfield-rosewoods-z15-t295', q: q('scene=carry1&tick=295&zoom=15', QUIET), crop: true },
  { id: 'S3-cemetery-hill-z15.5-t346', q: q('scene=carry2&tick=346&zoom=15.5', QUIET), crop: true },
  { id: 'S4-selected-z16.5-t556', q: q('scene=fresh2&tick=556&zoom=16.5', QUIET), select: '53 VA', crop: true },
  { id: 'S5-phone-z14.5-t556', q: q('scene=fresh2&tick=556&zoom=14.5', QUIET), select: '53 VA', phone: true },
  { id: 'S6-event-and-story-in-situ-z15.5-t551', q: q('scene=fresh2&tick=551&zoom=15.5', { 'popup.hints.enabled': false }), crop: true },
  { id: 'S7-legend-z15.5-t551', q: q('scene=fresh2&tick=551&zoom=15.5', QUIET), legend: true, crop: true },
  { id: 'S8-hover-tooltip-z16.5-t556', q: q('scene=fresh2&tick=556&zoom=16.5', QUIET), hover: '53 VA', crop: true },
];

const srv = await serve(PORT); const results = [];
try {
  for (const phone of [false, true]) {
    const list = SCENES.filter((s) => !!s.phone === phone && (!only || only.some((k) => s.id.startsWith(k)))); if (!list.length) continue;
    const b = await launch({ width: phone ? 390 : 1440, height: phone ? 844 : 900, dpr: DPR, mobile: phone, port: PORT });
    try {
      for (const sc of list) {
        const r = await open(b.page, sc.q, { steps: 150, port: PORT });
        let target = null;
        if (sc.phone && sc.select) {                                                              // a phone cannot click a mark inside a crowd: the unit is selected through the same API the click uses, and its card opens in the bottom sheet
          const id = await b.page.evaluate(`(() => { const S = window.__studio; for (const u of S.engine.battle.units.values()) if (u.short === ${JSON.stringify(sc.select)}) return u.id; })()`);
          const d = await b.page.evaluate(`(() => { const S = window.__studio; return S.engine.describeUnit(${JSON.stringify(id)}); })()`);
          await b.page.evaluate(`(() => { const S = window.__studio; S.engine.moveTo({ lat: ${d.now.lat}, lng: ${d.now.lng}, zoom: 14.5 }, { glide: false, safe: true }); S.engine.select(${JSON.stringify(id)}); S.host.setSelected(${JSON.stringify(id)}); })()`); await settle(b.page, 120);
          await b.page.evaluate(`window.__studio.host.openRail('unit-card:sel-' + ${JSON.stringify(id)})`); await settle(b.page, 120);
        } else if (sc.select || sc.hover) {
          // centre the unit's neighbourhood: the camera goes to the unit (the scene's own centre is the hotspot, the unit stands in it)
          target = await b.page.evaluate(`(() => { ${FIND(sc.select || sc.hover)} const d = S.engine.describeUnit(t.ids[0]); S.engine.moveTo({ lat: d.now.lat, lng: d.now.lng, zoom: ${sc.phone ? 14.5 : 16.5} }, { glide: false, safe: true }); return t.ids[0]; })()`);
          await settle(b.page, 140);
          const pos = await b.page.evaluate(`(() => { ${FIND(sc.select || sc.hover)} const sr = document.getElementById('stage').getBoundingClientRect(); return [t.x + f.view.dx - (t.hx || 0) + sr.left, t.y + f.view.dy + sr.top]; })()`);
          if (sc.hover) { await b.page.mouse.move(pos[0] - 80, pos[1] - 40); await b.page.mouse.move(pos[0], pos[1], { steps: 6 }); await b.page.waitForTimeout(400); await settle(b.page, 120); }
          if (sc.select) {
            await b.page.mouse.move(pos[0] - 80, pos[1] - 40); await b.page.mouse.move(pos[0], pos[1], { steps: 4 }); await b.page.mouse.click(pos[0], pos[1]); await settle(b.page, 40);
            await b.page.mouse.move(pos[0] + 360, pos[1] + 240); await settle(b.page, 140);       // the pointer leaves: the card and the hull are the selection's own
            if (sc.phone) { await b.page.evaluate(`window.__studio.host.openRail('unit-card:sel-' + ${JSON.stringify(target)})`); await settle(b.page, 90); }
          }
        }
        if (sc.legend) { await b.page.click('.pc[data-popup="legend"] .pc-pill'); await settle(b.page, 120); }
        const chk = await b.page.evaluate(frameCheck);
        const sfx = LOOK === 'paper' ? '' : '-' + LOOK; const file = path.join(OUT, sc.id + sfx + '.' + FMT);
        await b.page.screenshot(FMT === 'png' ? { path: file } : { path: file, type: 'jpeg', quality: 86 });
        let cropFile = null;
        if (sc.crop && !sc.phone) {                                                           // a 100-percent crop of the busiest 600 x 400 CSS px of the map (every pixel of the device-pixel picture, no resampling)
          const box = await b.page.evaluate(() => {
            const f = window.__studio.engine.frame; const sr = document.getElementById('stage').getBoundingClientRect(); const dx = f.view.dx + sr.left; const dy = f.view.dy + sr.top; const W = sr.right; const H = sr.bottom; const pts = f.tiles.filter((t) => t.life === 'live' && t.solid).map((t) => [t.x + dx, t.y + dy]);
            // the chrome and the cards of the picture: a crop of the busiest map area must not include them
            const occ = []; const add = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05) occ.push([r.left, r.top, r.right, r.bottom]); };
            for (const el of document.querySelectorAll('#topbar > *, #dock, .pc, #panel:not(.hidden), .nar:not(.hidden), #metrics:not(.hidden), .pop-rail[data-open="true"], #credit')) add(el);
            const free = (x, y) => !occ.some((o) => o[0] < x + 600 && o[2] > x && o[1] < y + 400 && o[3] > y);
            let best = null; for (const strict of [true, false]) { for (let x = Math.ceil(sr.left); x <= W - 600; x += 20) for (let y = Math.ceil(sr.top); y <= H - 400; y += 20) { if (strict && !free(x, y)) continue; let n = 0; for (const p of pts) if (p[0] > x + 20 && p[0] < x + 580 && p[1] > y + 20 && p[1] < y + 380) n++; if (!best || n > best.n) best = { x, y, n }; } if (best && best.n > 0) break; }
            return best;
          });
          cropFile = path.join(OUT, sc.id + sfx + '.crop.' + FMT);
          await b.page.screenshot(FMT === 'png' ? { path: cropFile, clip: { x: box.x, y: box.y, width: 600, height: 400 } } : { path: cropFile, type: 'jpeg', quality: 90, clip: { x: box.x, y: box.y, width: 600, height: 400 } });
          chk.crop = box;
        }
        results.push({ scene: sc.id, tick: r.tick, zoom: r.zoom, ...chk, file: path.relative(ROOT, file).split(path.sep).join('/') });
        console.log(sc.id, JSON.stringify({ tiles: chk.tiles, crowds: chk.crowds, merged: chk.merged, coreOverlaps: chk.coreOverlaps, pinsCovered: chk.pinsCovered, labelOverlaps: chk.labelOverlaps, minCoreGap: chk.minCoreGap, unrep: chk.unrepresented, names: chk.names, cardsOver: chk.cardsOver }));
      }
      if (b.errors.length) console.log('console errors', b.errors.slice(0, 5)); if (b.reqs.length) console.log('EXTERNAL REQUESTS', b.reqs.slice(0, 5));
      results.push({ _errors: b.errors.slice(0, 20), _external: b.reqs.slice(0, 20), phone });
    } finally { await b.close(); }
  }
} finally { srv.close(); }
const outFile = path.join(ROOT, 'results', `scenes-${SET}${LOOK === 'paper' ? '' : '-' + LOOK}.json`);
let merged = results; if (only && fs.existsSync(outFile)) { const old = JSON.parse(fs.readFileSync(outFile, 'utf8')).results.filter((r) => r.scene && !results.some((n) => n.scene === r.scene)); const errs = JSON.parse(fs.readFileSync(outFile, 'utf8')).results.filter((r) => r._errors || r._external); merged = [...old, ...results.filter((r) => r.scene), ...errs, ...results.filter((r) => r._errors || r._external)]; const order = SCENES.map((x) => x.id); merged.sort((p, q) => (p.scene ? order.indexOf(p.scene) : 99) - (q.scene ? order.indexOf(q.scene) : 99)); }      // --only: keep the other scenes' numbers
fs.writeFileSync(outFile, JSON.stringify({ set: SET, look: LOOK, dpr: DPR, results: merged }, null, 1));
void PAGE;
