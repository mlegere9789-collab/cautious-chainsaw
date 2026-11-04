// Shared helpers for the user-guide pipeline (shots.mjs, verify.mjs): find the site build to document, serve it, open a
// browser session through the repository's capped test harness (tests/t0/lib.mjs: production Referer injected on Mapbox
// requests, telemetry stubbed), and run the small step language that content.json uses to put the site into a state.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { openSession, createStaticServer, waitForApp, sleep, cdpFor, tileBudget } from '../../../tests/t0/lib.mjs';

export { sleep, cdpFor, tileBudget };
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const GUIDE = path.join(REPO, 'docs', 'guide');
export const TMP = path.join(REPO, 'tmp', 'guide');

export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export const loadContent = () => readJson(path.join(GUIDE, 'content.json'));

/**
 * Resolve the site build to document.
 *   --dist DIR   a built site folder (index.html at its top)
 *   --zip FILE   a release zip (unpacked once into tmp/guide/site-<name>)
 * default: the zip named in content.json (release.zip), else release/<train>/dist.
 */
export function resolveSite(argv, content) {
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  let dist = opt('--dist');
  const zip = opt('--zip') || (!dist ? path.join(REPO, content.release.zip || '') : null);
  if (!dist && zip && fs.existsSync(zip) && fs.statSync(zip).isFile()) {
    const out = path.join(TMP, 'site-' + path.basename(zip, '.zip'));
    if (!fs.existsSync(path.join(out, 'index.html'))) {
      fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
      const r = process.platform === 'win32'
        ? spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${out}' -Force`], { stdio: 'inherit' })
        : spawnSync('unzip', ['-q', '-o', zip, '-d', out], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error(`could not unpack ${zip}`);
    }
    dist = out;
  }
  if (!dist) dist = path.join(REPO, 'release', content.release.train, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`no site build at ${dist} (use --dist DIR or --zip FILE)`);
  return path.resolve(dist);
}

export const DEVICES = {
  desktop: { width: 1440, height: 900, dpr: 2, mobile: false },
  phone: { width: 390, height: 844, dpr: 3, mobile: true },
};

/** open a headless Chrome session + static server for a device; returns { page, srv, session, close } */
export async function openSite({ dist, device = 'desktop', onboarded = true, tiles = 'inject', profile = null, port = 8650, cdpPort = 9650, dpr = null }) {
  const vp = { ...DEVICES[device] };
  if (dpr) vp.dpr = dpr;
  const srv = await createStaticServer({ root: dist, port: 0 });
  const session = await openSession({ profile: profile || `guide-${device}-${process.pid}`, reset: true, cdpPort, onboarded, tiles, viewport: vp });
  return {
    page: session.page, srv, session, vp,
    url: (u) => srv.url + u,
    async close() { try { await session.close(); } finally { await srv.close(); } },
  };
}

export async function settle(page, { map = true, ms = 2500, app = true } = {}) {
  if (map && app) await waitForApp(page, 45000).catch(() => {});
  else if (map) await page.locator('.mapboxgl-canvas').first().waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
  await sleep(ms);
}

/** run one step of the content.json step language */
export async function runStep(page, st, ctx) {
  const loc = (s) => page.locator(s).first();
  switch (st.do) {
    case 'goto': await page.goto(ctx.url(st.url)); await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked */ } }); await page.reload(); await settle(page, { map: st.map !== false, app: !/\.html/.test(st.url), ms: st.ms ?? 3500 });
      // the page's own scroll bar is not part of the picture (panels keep theirs)
      if (/\.html/.test(st.url)) await page.addStyleTag({ content: 'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}' });
      break;
    case 'click': await loc(st.sel).click({ timeout: 8000 }); await sleep(st.ms ?? 700); break;
    case 'clickAt': await page.mouse.click(st.x, st.y); await sleep(st.ms ?? 700); break;
    case 'press': await page.keyboard.press(st.key); await sleep(st.ms ?? 600); break;
    case 'type': await page.keyboard.type(st.text, { delay: 20 }); await sleep(st.ms ?? 700); break;
    case 'fill': await loc(st.sel).fill(st.text); await sleep(st.ms ?? 700); break;
    case 'select': await loc(st.sel).selectOption(st.value); await sleep(st.ms ?? 700); break;
    case 'hover': await loc(st.sel).hover(); await sleep(st.ms ?? 500); break;
    case 'wait': await sleep(st.ms ?? 800); break;
    case 'hide': await page.locator(st.sel).evaluateAll((els) => els.forEach((e) => { e.style.visibility = 'hidden'; })); break;
    case 'scrollTop': await page.evaluate(() => window.scrollTo(0, 0)); await sleep(st.ms ?? 300); break;
    case 'waitFor': await page.locator(st.sel).first().waitFor({ state: st.state || 'visible', timeout: st.timeout ?? 15000 }); await sleep(st.ms ?? 300); break;
    case 'scrollTo': await loc(st.sel).evaluate((e, to) => { e.scrollTop = to === 'bottom' ? e.scrollHeight : Number(to) || 0; }, st.to ?? 0); await sleep(300); break;
    case 'viewport': await page.setViewportSize?.({ width: st.width, height: st.height }); break;
    default: throw new Error(`unknown step "${st.do}"`);
  }
}

export async function runSteps(page, shot, ctx) {
  const steps = shot.steps || [];
  if (!steps.length || steps[0].do !== 'goto') await runStep(page, { do: 'goto', url: shot.url || '/', map: shot.map !== false, ms: shot.settleMs }, ctx);
  for (const st of steps) await runStep(page, st, ctx);
  await sleep(shot.finalWaitMs ?? 600);
}

/** bounding box (CSS px, page coordinates) of the first VISIBLE match of a selector, or null */
export async function boxOf(page, sel) {
  const loc = page.locator(sel);
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const b = await loc.nth(i).boundingBox().catch(() => null);
    if (b && b.width > 0 && b.height > 0) return { x: b.x, y: b.y, w: b.width, h: b.height, matches: n };
  }
  return null;
}

/** the dialog or panel that contains the element matched by `sel`: climbs while the parent is still smaller than the viewport */
export async function panelBox(page, sel) {
  const h = await page.locator(sel).first().elementHandle().catch(() => null);
  if (!h) return null;
  return h.evaluate((el) => {
    const W = innerWidth, H = innerHeight; let best = el;
    while (best.parentElement && best.parentElement !== document.body) {
      const r = best.parentElement.getBoundingClientRect();
      if (r.width > W * 0.8 || r.height > H * 0.95) break;
      best = best.parentElement;
    }
    const r = best.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

/** element definition of content.json: "selector" | { sel, pad } | { union: [selectors], pad } -> box with padding, or null */
export async function boxOfDef(page, def) {
  const d = typeof def === 'string' ? { sel: def } : def;
  const pad = d.pad ?? 0;
  let b = null;
  if (d.union) {
    const bs = [];
    for (const s of d.union) { const x = await boxOf(page, s); if (!x) return null; bs.push(x); }
    const x0 = Math.min(...bs.map((q) => q.x)), y0 = Math.min(...bs.map((q) => q.y));
    const x1 = Math.max(...bs.map((q) => q.x + q.w)), y1 = Math.max(...bs.map((q) => q.y + q.h));
    b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  } else b = await boxOf(page, d.sel);
  if (b && d.maxW && b.w > d.maxW) b = { ...b, w: d.maxW };
  if (b && d.centerW) { b = { ...b, x: b.x + b.w / 2 - d.centerW / 2, w: d.centerW }; }
  return b ? { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad } : null;
}

export function listTmp() { fs.mkdirSync(TMP, { recursive: true }); return TMP; }
export const hostOs = () => os.platform();
