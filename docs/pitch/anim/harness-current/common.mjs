// Shared helpers for the pitch-anim/a1 harness. Uses tests/t0/lib.mjs read-only (not modified).
process.env.T0_AGENT = 'pitch-anim/a1';
process.env.T0_PORT_BASE = '9500';
process.env.T0_TILE_CAP ??= '300';
import path from 'node:path';
import fs from 'node:fs';
const lib = await import('file:///C:/Users/mlege/gettysburg-map/tests/t0/lib.mjs');
export const { REPO, openSession, createStaticServer, sleep, waitFor, waitForApp, chooseLayout, mapView, tileBudget, cdpFor, emulateViewport, mouseDrag, wheel } = lib;
export const OUT = path.join(REPO, 'docs/pitch/anim');
export const SHOTS = path.join(OUT, 'shots/current');
export const WORK = path.join(REPO, 'tmp/pitch-anim/a1');
export const BUILDS = { baseline: 'baseline/dist', r1c: 'release/R1c/dist' };
export const PORTS = { baseline: 9500, r1c: 9501 };
export async function serve(which) {
  return createStaticServer({ root: path.join(REPO, BUILDS[which]), port: PORTS[which] });
}
export const VP = {
  desktop: { width: 1440, height: 900, dpr: 1, mobile: false },
  phone: { width: 390, height: 844, dpr: 3, mobile: true },
};
let seq = 0;
export async function open({ vp = 'desktop', tiles = 'inject', profile, port: portOverride } = {}) {
  const n = ++seq;
  const port = portOverride || (9502 + (n % 8));
  const S = await openSession({ profile: profile || `p${n}`, cdpPort: port, viewport: VP[vp], tiles });
  return S;
}
export const readState = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
export async function boot(S, origin, { query = '', layout = 'desktop' } = {}) {
  await S.page.goto(`${origin}/${query}`, { waitUntil: 'load' });
  await waitForApp(S.page, 45000);
  // the baseline chooser can appear a little after the map canvas mounts: wait up to 12 s for it, then click the requested card
  const label = layout === 'mobile' ? 'Select Mobile' : 'Select Desktop';
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    if (await S.page.getByText('Choose Your Experience').count()) { await S.page.getByText(label).first().click(); await S.page.getByText('Choose Your Experience').first().waitFor({ state: 'detached', timeout: 10000 }); break; }
    await sleep(200);
  }
  await waitFor(async () => /(\d+) units|Tick \d+\/675/.test(await readState(S.page)), { timeout: 40000, label: 'unit count or tick label' });
  await waitFor(async () => (await mapView(S.page)), { timeout: 40000, label: 'map ready' });
}
export const wj = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2)); };

export const PROBE = fs.readFileSync(path.join(WORK, 'probe.js'), 'utf8');
export const tickNow = async (page) => { const m = /Tick (\d+)\/675/.exec(await readState(page)); return m ? +m[1] : null; };
/** scrub like a user: the timeline range input (0..100, step .01) -> app setTick(round(1 + v/100*674)) */
export async function setTick(page, n) {
  const has = await page.evaluate(() => !!document.querySelector('input[type=range]'));
  if (has) {
    return page.evaluate((n) => {
      const el = document.querySelector('input[type=range]');
      const v = el.max === '675' ? n : ((n - 1) / 674) * 100; // baseline slider is 0..100 (percent); R1c slider is the tick itself
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }, n);
  }
  // R1c phone layout has no range input: day tab (jumpToDay) then keyboard steps (global keydown handler: Right +1, Shift+Right +12)
  const day = n <= 225 ? 1 : n <= 450 ? 2 : 3; const base = day === 1 ? 1 : day === 2 ? 226 : 451;
  await page.locator(`button:text-is("July ${day}")`).first().click();
  await new Promise((r) => setTimeout(r, 150));
  let d = n - base;
  for (let i = 0; i < Math.floor(d / 12); i++) await page.keyboard.press('Shift+ArrowRight');
  for (let i = 0; i < d % 12; i++) await page.keyboard.press('ArrowRight');
}
export const clickSpeed = (page, label) => page.locator(`button:text-is("${label}")`).last().click();
export const playPause = (page) => page.locator('button[title^="Play/Pause"]').click();
export const camera = (page, c) => page.evaluate((c) => { window.__t0map.jumpTo(c); }, c);
export const isPlayingBtn = async (page) => (await page.locator('button[title^="Play/Pause"]').textContent()).trim();
