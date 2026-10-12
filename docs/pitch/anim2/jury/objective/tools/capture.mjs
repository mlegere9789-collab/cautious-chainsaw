// capture.mjs - the pixel and record capture of the objective checks.
//   node capture.mjs --dir=d1 --look=night --mode=full|notext|nofill --vp=desktop|phone --dpr=2 [--only=s1a,s4] [--ink=0]
// Writes tmp/look-dev/objective/cap/<dir>-<look>/<vp>-dpr<dpr>/<mode>/<scene>.{png,json}.  Everything comes from a real Chrome run of the built page: nothing is simulated.
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, DIRS, HERE } from './lib.mjs';
import { inkPass } from './ink-pass.mjs';
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const DIR = args.dir; const LOOK = args.look || DIRS[DIR].primary; const MODE = args.mode || 'full'; const VP = args.vp || 'desktop'; const DPR = +(args.dpr || 2); const ONLY = args.only ? args.only.split(',') : null; const INK = args.ink !== '0';
const OUT = path.join(HERE, 'cap', `${DIR}-${LOOK}`, `${VP}-dpr${DPR}`, MODE + (args.tag ? '-' + args.tag : '')); fs.mkdirSync(OUT, { recursive: true });
const ANGLE = { lat: 39.8117, lng: -77.2347 }; const FIELD = { lat: 39.81592, lng: -77.23677 }; const WHEAT = { lat: 39.7992, lng: -77.2414 }; const CEM = { lat: 39.8189, lng: -77.2262 }; const HERBST = { lat: 39.8278, lng: -77.2528 };
const SCENES = [
  { id: 's1a', tick: 551, zoom: 13.5, ...FIELD, popups: false },
  { id: 's1b', tick: 556, zoom: 13.5, ...FIELD, popups: false },
  { id: 's1c', tick: 556, zoom: 15, ...ANGLE, popups: false },
  { id: 's2', tick: 295, zoom: 15, ...WHEAT, popups: false },
  { id: 's3', tick: 346, zoom: 15.5, ...CEM, popups: false },
  { id: 's4', tick: 556, zoom: 16.5, ...ANGLE, popups: 'select', keep: ['unit-card', 'clock-hud'] },
  { id: 's5', tick: 556, zoom: 14.5, ...ANGLE, popups: 'sheet', keep: ['unit-card'], phone: true },
  { id: 's6', tick: 28, zoom: 14.5, ...HERBST, popups: 'all', noink: true },
  { id: 's7', tick: 551, zoom: 15, ...ANGLE, popups: 'legend', keep: ['legend', 'clock-hud'], noink: true },
  { id: 's8', tick: 556, zoom: 16, ...ANGLE, popups: 'hover', keep: ['unit-card', 'clock-hud'], noink: true },
];
const list = SCENES.filter((s) => (VP === 'phone' ? s.phone : !s.phone) && (!ONLY || ONLY.includes(s.id)));
// the phone also gets the map scenes s1c and s2 at phone size (zoom 14.5) for the phone-size text and density numbers
if (VP === 'phone') for (const id of ['s1c', 's2']) { const s = SCENES.find((q) => q.id === id); if (!ONLY || ONLY.includes(id + 'p')) list.push({ ...s, id: id + 'p', zoom: 14.5, phone: true }); }

const initScript = fs.readFileSync(path.join(HERE, 'instr.js'), 'utf8');
const dims = VP === 'phone' ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
const srv = await serve();
const run = await launch({ ...dims, dpr: DPR, profile: `${DIR}-${LOOK}-${VP}-${MODE}-${DPR}`, init: `window.__OC_MODE = ${JSON.stringify(MODE)};\n` + initScript });
const { page } = run; const log = [];
try {
  await openDir(page, DIR, LOOK);
  await page.evaluate(() => {
    window.__skinOrig = null;
    window.__skinSwap = (target, kinds) => {          // null: nothing of the skin is drawn; a tile: only that tile (only the draw functions named in kinds); 'restore'
      const S = window.__studio; const E = S.engine; const sk = E.kernel.skins.get(E.tok('skin.id')); const D = sk.draw;
      if (!window.__skinOrig) window.__skinOrig = { ...D };
      const O = window.__skinOrig;
      for (const k of ['tile', 'label', 'pin', 'leader', 'hull', 'shadow']) {
        if (!O[k]) continue;
        if (target === 'restore') D[k] = O[k]; else if (target === null || (kinds && !kinds.includes(k))) D[k] = () => undefined; else D[k] = function (c, t, ...r) { return t === target ? O[k].call(D, c, t, ...r) : undefined; };
      }
    };
    window.__drawNow = () => { const S = window.__studio; const o = S.lastOut || {}; return S.renderer.draw(S.engine.frame, { popupFx: o.fx || null, mapRect: o.mapRect || null, toneColors: S.layer.toneColors ? S.layer.toneColors() : null }); };
    window.__png = () => document.getElementById('map').toDataURL('image/png').split(',')[1];
    window.__groundIdle = async () => { for (const g of [globalThis.__ground, globalThis.__realBackdrop]) if (g && g.whenIdle) await g.whenIdle(25000); };
  });
  for (const sc of list) {
    const t0 = Date.now();
    // ---- set the scene ----
    const info = await page.evaluate(async (sc) => {
      const S = window.__studio; const E = S.engine; const T = E.tuning; const out = {};
      const setPop = (id, v) => { try { T.set(id, v); } catch (e) { /* absent */ } };
      setPop('popup.enabled', sc.popups !== false);
      if (sc.popups !== false) { for (const g of ['hints']) setPop('popup.' + g + '.enabled', false); if (sc.keep) for (const d of E.kernel.popups.list()) { if (!d.group || sc.keep.includes(d.id)) continue; setPop('popup.' + d.group.replace(/^popup-/, '') + '.enabled', false); } }
      if (S.updateSafe) S.updateSafe(); if (S.host.dismissAll) S.host.dismissAll(); E.select(null); if (S.host.setSelected) S.host.setSelected(null); E.transport.pause(); E.transport.seek(sc.tick, { glide: false });
      E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true });
      window.__adv(40, 50); window.__adv(40, 20);
      if (sc.popups === 'select' || sc.popups === 'sheet') {
        const id = 'C-53VA'; const d = E.describeUnit(id); out.sel = !!d;
        if (d) { E.moveTo({ lat: d.now.lat, lng: d.now.lng, zoom: sc.zoom }, { glide: false, safe: true }); window.__adv(60, 20); E.select(id); S.host.setSelected(id); window.__adv(60, 20); if (sc.popups === 'sheet') { S.host.openRail('unit-card:sel-' + id); window.__adv(80, 20); E.moveTo({ lat: d.now.lat, lng: d.now.lng, zoom: sc.zoom }, { glide: false, safe: true }); window.__adv(90, 20); } }
      } else if (sc.popups === 'legend') { S.host.act('legend:legend', 'toggle'); window.__adv(60, 20); }
      else if (sc.popups === 'hover') {
        const f = E.frame; const cx = f.view.w / 2; const cy = f.view.h * 0.42; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.opacity > 0.9 && q.x + f.view.dx > 80 && q.x + f.view.dx < f.view.w - 90 && q.y + f.view.dy > 110).sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy))[0];
        out.hoverAt = t ? [t.x + f.view.dx, t.y + f.view.dy] : null; out.hoverId = t && t.ids[0];
      } else if (sc.popups === 'all') { window.__adv(120, 20); }
      window.__adv(30, 16.7);
      return out;
    }, sc);
    if (info.hoverAt) { const [hx, hy] = info.hoverAt; await page.mouse.move(hx - 90, hy - 50); await page.mouse.move(hx, hy, { steps: 6 }); await page.evaluate(() => window.__adv(80, 20)); await page.waitForTimeout(250); await page.evaluate(() => window.__adv(30, 20)); }
    for (let k = 0; k < 6; k++) { await page.evaluate(() => { window.__adv(25, 16.7); return window.__groundIdle(); }); }
    await page.evaluate(() => window.__adv(40, 16.7)); await page.waitForTimeout(700); await page.evaluate(() => window.__adv(10, 16.7));
    // the picture must have stopped changing (ground tiles decoded, fades finished): hash the canvas until it is identical four times in a row
    let stable = 0; let same = 0; let prev = null; for (let k = 0; k < 60 && same < 4; k++) { await page.waitForTimeout(350); const h = await page.evaluate(async () => { await window.__groundIdle(); window.__adv(6, 16.7); const cv = document.getElementById('map'); const c = cv.getContext('2d', { willReadFrequently: true }); const d = c.getImageData(0, 0, cv.width, cv.height).data; let a = 2166136261; for (let i = 0; i < d.length; i += 61) { a ^= d[i]; a = Math.imul(a, 16777619); } return a >>> 0; }); if (h === prev) same++; else same = 0; prev = h; stable = k; }
    if (same < 4) console.log('WARNING picture not stable', DIR, LOOK, MODE, sc.id);
    // ---- the canvas passes ----
    const base = path.join(OUT, sc.id);
    const res = await page.evaluate(async ({ mode }) => {
      const S = window.__studio; const E = S.engine; const cv = document.getElementById('map'); const dpr = S.renderer.dpr; const out = { dpr, cw: cv.width, ch: cv.height };
      const f0 = E.frame; out.tick = f0.tick; out.zoom = f0.zoom; out.view = { w: f0.view.w, h: f0.view.h, dx: f0.view.dx, dy: f0.view.dy }; out.onField = f0.onField; out.overlaps = f0.overlaps; out.unrepresented = f0.unrepresented; out.styleId = E.tok('skin.id'); out.backdropId = E.tok('backdrop.id');
      if (window.__OC) window.__OC.reset(cv);
      window.__adv(1, 16.7);
      const png = {}; png.B = window.__png();
      if (mode === 'full') {
        out.textRecs = window.__OC.take(cv);
        const f = E.frame;
        out.tiles = f.tiles.filter((t) => t.life === 'live').map((t) => ({ key: t.key, kind: t.kind, n: t.n, ids: t.ids.length, x: t.x, y: t.y, ax: t.ax, ay: t.ay, px: t.px, py: t.py, w: t.w, h: t.h, scale: t.scale, opacity: t.opacity, side: t.side, arm: t.arm, short: t.short, displaced: !!t.displaced, selected: !!t.selected, solid: !!t.solid, named: t.named, nameKind: t.nameKind, members: t.members ? t.members.length : 0, label: t.label ? { x0: t.label.x0, y0: t.label.y0, x1: t.label.x1, y1: t.label.y1, w: t.label.w, h: t.label.h, opacity: t.label.opacity, text: t.label.text } : null, fname: t.fname }));
        out.spec = { pinHalf: f.spec.pinHalf, gap: f.spec.gap };
        window.__OC.reset(cv); window.__skinSwap(null); window.__drawNow(); png.B0 = window.__png(); out.textRecs0 = window.__OC.take(cv); window.__skinSwap('restore'); window.__drawNow();
      }
      if (mode === 'notext') { window.__skinSwap(null); window.__drawNow(); png.BG = window.__png(); window.__skinSwap('restore'); window.__drawNow(); }
      return { out, png };
    }, { mode: MODE });
    for (const [k, v] of Object.entries(res.png)) fs.writeFileSync(`${base}.${k}.png`, Buffer.from(v, 'base64'));
    const rec = { scene: sc.id, ...res.out };
    // ---- isolated ink of each tile (overlaps, ink bounds, colours) ----
    if (MODE === 'full' && INK && !sc.noink) rec.ink = await page.evaluate(inkPass);
    // ---- the page itself (DOM): full picture, the text items, the picture without text, the DOM-only alpha ----
    if (MODE === 'full') {
      fs.writeFileSync(`${base}.page.png`, await page.screenshot());
      rec.dom = await page.evaluate(() => {
        const out = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const txt = n.textContent.replace(/\s+/g, ' ').trim(); if (!txt) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'OPTION'].includes(el.tagName)) continue;
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          let o = 1; for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e); o *= +c.opacity; if (c.display === 'none') { o = 0; break; } } if (o < 0.05) continue;
          const range = document.createRange(); range.selectNodeContents(n); const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5); if (!rects.length) continue;
          const r0 = rects[0]; if (r0.right < 0 || r0.bottom < 0 || r0.left > innerWidth || r0.top > innerHeight) continue;
          const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r0.left + r0.width / 2)), Math.min(innerHeight - 1, Math.max(0, r0.top + r0.height / 2)));
          if (!hit || !(el.contains(hit) || hit.contains(el))) continue;
          const svg = el instanceof SVGElement; const rb = el.getBoundingClientRect(); const sc = !svg && el.offsetWidth > 0 ? rb.width / el.offsetWidth : 1;
          let cls = ''; for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.id || e.className) { cls = (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).slice(0, 2).join('.') : ''); break; } }
          out.push({ text: txt.slice(0, 60), len: txt.length, color: svg ? cs.fill : (cs.webkitTextFillColor || cs.color), colorProp: cs.color, fs: parseFloat(cs.fontSize), fw: cs.fontWeight, fam: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), tt: cs.textTransform, ls: cs.letterSpacing, scale: +sc.toFixed(3), op: +o.toFixed(3), rects: rects.map((r) => [r.left, r.top, r.right, r.bottom]), cls: cls.slice(0, 60), svg });
        }
        return out;
      });
      const h1 = await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important} svg text,svg tspan{fill:transparent!important;stroke:none!important}' });
      await page.waitForTimeout(250); fs.writeFileSync(`${base}.notext.png`, await page.screenshot()); await h1.evaluate((e) => e.remove());
      const h2 = await page.addStyleTag({ content: 'canvas{visibility:hidden!important} html,body{background:transparent!important}' });
      await page.waitForTimeout(250); fs.writeFileSync(`${base}.dom.png`, await page.screenshot({ omitBackground: true })); await h2.evaluate((e) => e.remove());
    }
    rec.hover = info.hoverId || null; rec.ms = Date.now() - t0; rec.stableAfter = stable;
    fs.writeFileSync(`${base}.json`, JSON.stringify(rec));
    console.log(DIR, LOOK, MODE, VP, sc.id, `${rec.ms} ms`, MODE === 'full' ? `tiles ${rec.tiles.length} text ${rec.textRecs.length} dom ${rec.dom && rec.dom.length}${rec.ink ? ` ink ${JSON.stringify(rec.ink.summary)}` : ''}` : '');
  }
} finally { log.push(...run.errors.slice(0, 5)); if (run.external.length) console.log('EXTERNAL REQUESTS', run.external.slice(0, 5)); if (log.length) console.log('console errors', log.slice(0, 5)); await run.close(); srv.close(); }
