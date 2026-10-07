// tools/lib.mjs - the shared harness of the real-browser drivers: a tiny static server (own port, serves docs/pitch/anim2 so that the page can reach ../../basemap/assets), the system Chrome through
// playwright-core with a profile under tmp/look-dev/d3-field-manual, console and request capture.  Nothing here touches the network: every request must be to the local server (a data: URL or a blob
// is allowed), anything else is reported.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');                         // d3-field-manual
export const SERVE_ROOT = path.resolve(ROOT, '..');                   // docs/pitch/anim2
export const REPO = path.resolve(ROOT, '..', '..', '..', '..');
export const WORK = path.join(REPO, 'tmp', 'look-dev', 'd3-field-manual');
export const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const PORT = +(process.env.D3_PORT || 9880);
export const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.woff': 'font/woff' };

export function startServer(port = PORT) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(SERVE_ROOT, u);
    if (!f.startsWith(SERVE_ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

/** open the page.  opts: { w, h, dpr, query, mobile, port, profile } ; returns { page, ctx, errors, requests, url, close } */
export async function launch({ w = 1440, h = 900, dpr = 2, query = '', mobile = false, port = PORT, profile = 'main', html = 'dist/field-manual.html', welcome = false } = {}) {
  const dir = path.join(WORK, 'chrome-profile', profile); fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile,
    args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--remote-debugging-port=' + (port + 1), '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const requests = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u); });
  const url = `http://127.0.0.1:${port}/d3-field-manual/${html}?fresh=1${welcome ? '' : '&welcome=0'}` + (query ? '&' + query : '');
  await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 60000 });
  return { ctx, page, errors, requests, url, close: () => ctx.close() };
}

/** drive the engine until the picture is at rest and the ground has finished loading (every tile decoded, no fade running).  Returns the number of frames stepped. */
export async function settle(page, { max = 400, minFrames = 12 } = {}) {
  return page.evaluate(async ({ max, minFrames }) => {
    const S = window.__studio; const bd = globalThis.__realBackdrop; let n = 0;
    for (; n < max; n++) {
      const f = S.step(1);
      const calm = f.tiles.every((t) => t.life === 'live' && t.opacity > 0.999 && !t.travelling && !t.entering) && !S.engine.busy();
      const ground = !bd || !bd.pending();
      if (n >= minFrames && calm && ground) break;
      if (!ground && n % 8 === 7) await new Promise((r) => setTimeout(r, 40));       // give tile decodes time to land (they are real async work)
    }
    for (let k = 0; k < 3; k++) S.step(1);
    return n;
  }, { max, minFrames });
}

/** brute-force verification of the frame the page drew (shares no code with the engine): vital cores, pins, unrepresented units, skin ink inside the footprint */
export async function verify(page) {
  return page.evaluate(() => {
    const S = window.__studio; const E = S.engine; const f = E.frame; const W = f.view.w; const H = f.view.h;
    const solid = f.tiles.filter((t) => t.opacity >= 0.5); const ph = f.spec.pinHalf;
    const chips = solid.map((t) => ({ k: t.key, x0: t.x - t.w * t.scale / 2, x1: t.x + t.w * t.scale / 2, y0: t.y - t.h * t.scale / 2, y1: t.y + t.h * t.scale / 2 }));
    const pins = solid.filter((t) => t.displaced).map((t) => ({ k: t.key, x0: t.ax - ph, x1: t.ax + ph, y0: t.ay - ph, y1: t.ay + ph }));
    const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    let coreOverlaps = 0; let pinCovered = 0; let minClear = Infinity; const ex = [];
    for (let i = 0; i < chips.length; i++) {
      for (let j = i + 1; j < chips.length; j++) { const a = chips[i]; const b = chips[j]; const g = Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1); if (g < minClear) minClear = g; if (hit(a, b)) { coreOverlaps++; if (ex.length < 3) ex.push(`${a.k} x ${b.k}`); } }
      for (const p of pins) if (p.k !== chips[i].k && hit(chips[i], p)) pinCovered++;
    }
    const onField = new Set(E.battle.visibleAt(f.tau).map((e) => e.u.id)); const have = new Set(); for (const t of f.tiles) if (t.life === 'live') for (const id of t.ids) have.add(id); let unrepresented = 0; for (const id of onField) if (!have.has(id)) unrepresented++;
    const inView = chips.filter((c) => c.x1 > 0 && c.x0 < W && c.y1 > 0 && c.y0 < H).length; const agg = solid.filter((t) => t.kind === 'agg'); const aggUnits = agg.reduce((s, t) => s + t.n, 0);
    const skin = E.kernel.skins.get(E.tok('skin.id')); const problems = window.__fm.checkSkin(skin, f.spec, solid.filter((t) => t.life === 'live').slice(0, 600), E.text);
    const pl = window.__fm.places(); let namesUnderMarks = 0; const nameEx = [];
    for (const q of pl) { if (q.a < 0.5) continue; let bad = null; for (const rr of q.rects) { const r = { x0: rr.x0 + 2, y0: rr.y0 + 2, x1: rr.x1 - 2, y1: rr.y1 - 2 }; for (const c0 of chips) { const c = { k: c0.k, x0: c0.x0 + f.view.dx, x1: c0.x1 + f.view.dx, y0: c0.y0 + f.view.dy, y1: c0.y1 + f.view.dy }; if (hit(r, c)) { bad = q.name + ' x ' + c.k; break; } } if (bad) break; } if (bad) { namesUnderMarks++; if (nameEx.length < 3) nameEx.push(bad); } }
    return { placeNames: pl.filter((q) => q.a >= 0.5).length, namesUnderMarks, nameEx, tick: f.tick, zoom: +f.zoom.toFixed(2), tiles: solid.length, tilesInView: inView, aggregates: agg.length, unitsInAggregates: aggUnits, unitsOnField: onField.size, unrepresented, coreOverlaps, pinCovered, minClearancePx: Number.isFinite(minClear) ? +minClear.toFixed(2) : null, engineOverlaps: f.overlaps, inkOutsideFootprint: problems.length, inkExamples: problems.slice(0, 3), named: solid.filter((t) => t.named).length, examples: ex };
  });
}

