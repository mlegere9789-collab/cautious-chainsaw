// tools/inkfit.mjs - proves, in real Chrome and on real frames, that the LETTERING a mark draws lies inside the footprint the layout reserved for it.  The layout guarantees that no two footprints overlap; this is
// the other half of "tiles never obscure each other": the ink stays inside its own box.  (The drawn shapes - pole, flag, glyph, rings, bar, gauge - are measured the same way in node by test/skin-look.test.mjs with a
// recording context; here the real text, in the real face, with its real halo, is measured.)
// Every lettering sprite the renderer blits in a frame is found (as tools/audit.mjs does), the bounds of its non-transparent pixels (alpha > 10, the halo included) are taken, and they are compared with the box of the
// tile that owns the sprite (the tile whose box holds the sprite's centre).  A sprite whose ink leaves its box by more than 0.6 px is listed.
//   node tools/inkfit.mjs --opt=a|b
import fs from 'node:fs';
import path from 'node:path';
import { open, setScene, args, D1, stopServer } from './lib.mjs';

const OPT = args.opt || 'a'; process.env.LOOK_PAGE = OPT === 'a' ? 'option-a-standards.html' : 'option-b-glyph.html'; const STYLE = OPT === 'a' ? 'standards' : 'glyph';
const SCENES = [
  { id: 'z13.5 t295', tick: 295, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96] }, { id: 'z13.5 t556', tick: 556, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96] },
  { id: 'z15 t295', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 15, shift: [84, -96] }, { id: 'z15.5 t346', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5, shift: [-210, -18] },
  { id: 'z16.5 t551', tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16.5, shift: [102, 6] }, { id: 'z17.2 t551 (names)', tick: 551, lat: 39.8117, lng: -77.2347, zoom: 17.2, shift: [0, 0] },
  { id: 'z12.5 t226', tick: 226, lat: 39.8117, lng: -77.2347, zoom: 12.5, shift: [0, 0] },
];
const out = { generated: new Date().toISOString(), option: OPT, rows: [] }; let bad = 0;
const s = await open({ dpr: 2, profile: 'ink' + OPT });
try {
  for (const sc of SCENES) {
    await setScene(s.page, { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: sc.zoom, safe: true, shift: sc.shift, popups: false, style: STYLE, steps: 120 });
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(30));
    const r = await s.page.evaluate(() => {
      const S = window.__studio; const E = S.engine; const cv = document.getElementById('map'); const ctx = cv.getContext('2d'); const dpr = cv.width / cv.clientWidth; const log = []; const orig = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
        if (this === ctx && (img instanceof OffscreenCanvas || img instanceof HTMLCanvasElement) && img.height >= 12 && img.height <= 80 && img.width <= 1400 && (a.length === 4 || a.length === 2)) { const m = this.getTransform(); const w = a.length === 4 ? a[2] : img.width; const h = a.length === 4 ? a[3] : img.height; log.push({ img, x: (m.a * a[0] + m.e) / dpr, y: (m.d * a[1] + m.f) / dpr, w: m.a * w / dpr, h: m.d * h / dpr }); }
        return orig.call(this, img, ...a);
      };
      E.dirty = true; S.step(1, 16.667); CanvasRenderingContext2D.prototype.drawImage = orig;
      const f = E.frame; const v = f.view; const boxes = f.tiles.filter((t) => t.opacity > 0.5).map((t) => ({ k: t.key, x0: t.x + v.dx - t.w * t.scale / 2, x1: t.x + v.dx + t.w * t.scale / 2, y0: t.y + v.dy - t.h * t.scale / 2, y1: t.y + v.dy + t.h * t.scale / 2 }));
      let n = 0; let orphan = 0; const worst = []; let maxOver = 0;
      for (const e of log) {
        const sp = e.img.getContext('2d').getImageData(0, 0, e.img.width, e.img.height); let x0 = 1e9; let y0 = 1e9; let x1 = -1; let y1 = -1;
        for (let y = 0; y < sp.height; y++) for (let x = 0; x < sp.width; x++) if (sp.data[(y * sp.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) continue; const sx = e.w / sp.width; const sy = e.h / sp.height; const ink = { x0: e.x + x0 * sx, x1: e.x + (x1 + 1) * sx, y0: e.y + y0 * sy, y1: e.y + (y1 + 1) * sy };
        if (ink.x1 < 0 || ink.x0 > cv.clientWidth || ink.y1 < 0 || ink.y0 > cv.clientHeight) continue; n++;
        const cx = (ink.x0 + ink.x1) / 2; const cy = (ink.y0 + ink.y1) / 2; const own = boxes.filter((b) => cx >= b.x0 && cx <= b.x1 && cy >= b.y0 && cy <= b.y1).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0))[0];
        if (!own) { orphan++; continue; }
        const over = Math.max(own.x0 - ink.x0, ink.x1 - own.x1, own.y0 - ink.y0, ink.y1 - own.y1); if (over > maxOver) maxOver = over; if (over > 0.6) worst.push({ k: own.k, over: +over.toFixed(2) });
      }
      return { sprites: n, orphan, overflow: worst.length, maxOver: +Math.max(0, maxOver).toFixed(2), worst: worst.slice(0, 5) };
    });
    bad += r.overflow + r.orphan; out.rows.push({ scene: sc.id, ...r }); console.log(sc.id.padEnd(20), JSON.stringify(r));
  }
} finally { await s.close(); await stopServer(); }
out.bad = bad; fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', `inkfit-${OPT}.json`), JSON.stringify(out, null, 1)); console.log('lettering outside its box:', bad);
