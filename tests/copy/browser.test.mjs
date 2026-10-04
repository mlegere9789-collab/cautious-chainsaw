// Browser checks of the candidate pages in ONE headless system Chrome (own profile, port from COPY_PORT_BASE, default 9100), served by
// tools/copy/preview-server.mjs on the next port. Opt-in because other work shares the machine's browsers:
//   COPY_BROWSER=1 node --test tests/copy/browser.test.mjs
// Per page and width: axe-core (all rules, WCAG 2.2 AA tags among them), no horizontal scroll, 44 px for the controls that must have it,
// the shared menu is injected and keyboard-reachable, the skip link works, and the print rendering is black on white without the menus.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer, listen } from '../../tools/copy/preview-server.mjs';
import { withChrome, PORT_BASE, AGENT_DIR } from '../../tools/guide/lib/chrome.mjs';
import { REPO } from '../../tools/copy/lib/lint.mjs';
import { PAGES } from '../../tools/copy/trust/template.mjs';

const ON = process.env.COPY_BROWSER === '1';
const axeSource = ON ? fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8') : '';
const TRUST = path.join(REPO, 'candidates', 'trust-pages');
const GUIDE = path.join(REPO, 'candidates', 'user-guide');
const WIDTHS = [1280, 768, 375, 320];
const RESULTS = [];

test('trust pages and the guide in headless Chrome: axe, overflow, targets, menu, skip link, print', { skip: !ON, timeout: 900000 }, async () => {
  const server = createServer({ dirs: [TRUST, GUIDE] });
  const port = await listen(server, PORT_BASE + 1);
  const base = `http://127.0.0.1:${port}`;
  const pages = [...PAGES.map((p) => ({ name: p.slug, url: `${base}/${p.slug}.html` })), { name: 'guide', url: `${base}/index.html` }];
  try {
    await withChrome(async ({ context, page }) => {
      const external = [];
      page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') external.push(r.url()); });
      const failed = [];
      page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
      const consoleErrors = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', (e) => consoleErrors.push(String(e)));
      for (const pg of pages) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ media: 'screen', colorScheme: 'dark' });
          await page.goto(pg.url, { waitUntil: 'load' });
          await page.waitForSelector('#gtbg-nav', { timeout: 5000 });
          await page.waitForTimeout(700); // the shared page fade-in (site-nav.css, 340 ms) must be over: axe would measure faded text
          const axe = await page.evaluate(async (src) => { if (!window.axe) (0, eval)(src); return window.axe.run(document, { resultTypes: ['violations', 'incomplete'] }); }, axeSource);
          const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          const small = await page.evaluate(() => {
            const sel = '.btn, .tap, .toc a, #main summary, .tp-footer a, .skip-link, #gtbg-nav a, #gtbg-nav button';
            return [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44) && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => `${e.tagName.toLowerCase()}.${e.className || ''} "${(e.textContent || '').trim().slice(0, 20)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
          });
          RESULTS.push({ page: pg.name, width, violations: axe.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`), serious: serious.length, incomplete: axe.incomplete.map((v) => v.id), overflow, small });
        }
        // menu, skip link, keyboard
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(pg.url, { waitUntil: 'load' });
        await page.waitForSelector('#gtbg-nav');
        await page.keyboard.press('Tab');
        const first = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
        await page.keyboard.press('Enter');
        const hash = await page.evaluate(() => location.hash);
        const hasMenu = await page.evaluate(() => Boolean(document.querySelector('#gtbg-menu-btn')));
        RESULTS.push({ page: pg.name, skip: { first, hash, hasMenu } });
        // print rendering
        await page.emulateMedia({ media: 'print' });
        const print = await page.evaluate(() => { const cs = getComputedStyle(document.body); const nav = document.querySelector('#gtbg-nav'); return { bg: cs.backgroundColor, color: cs.color, nav: nav ? getComputedStyle(nav).display : 'absent', skip: getComputedStyle(document.querySelector('.skip-link')).display }; });
        RESULTS.push({ page: pg.name, print });
      }
      fs.mkdirSync(AGENT_DIR, { recursive: true });
      fs.writeFileSync(path.join(AGENT_DIR, 'browser-results.json'), JSON.stringify({ external, failed, consoleErrors, results: RESULTS }, null, 1));
      // screenshots for a human look
      await page.setViewportSize({ width: 375, height: 800 }); await page.emulateMedia({ media: 'screen', colorScheme: 'dark' });
      await page.goto(pages[2].url); await page.waitForSelector('#gtbg-nav'); await page.screenshot({ path: path.join(AGENT_DIR, 'shot-standard-375.png'), fullPage: false });
      await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(pages[1].url); await page.waitForSelector('#gtbg-nav'); await page.screenshot({ path: path.join(AGENT_DIR, 'shot-sources-1280.png'), fullPage: false });
      assert.deepEqual(external, [], 'no request leaves 127.0.0.1');
      assert.deepEqual([...new Set(failed)].filter((u) => !/favicon.ico$/.test(u)), [], 'every resource a page asks for exists (a missing favicon is the only tolerated 404)');
      assert.deepEqual(consoleErrors.filter((e) => !/Mapbox|favicon|Failed to load resource/.test(e)), [], 'no console error');
    }, { port: PORT_BASE });
  } finally { server.close(); }
  for (const r of RESULTS.filter((x) => 'serious' in x)) {
    assert.equal(r.serious, 0, `${r.page} @${r.width}: ${r.violations.join(', ')}`);
    assert.ok(r.overflow <= 0, `${r.page} @${r.width}: horizontal overflow ${r.overflow}px`);
  }
  for (const r of RESULTS.filter((x) => x.skip)) { assert.equal(r.skip.hash, '#main', `${r.page}: the skip link goes to #main`); assert.ok(r.skip.hasMenu, `${r.page}: the shared menu is injected`); }
  for (const r of RESULTS.filter((x) => x.print)) { assert.equal(r.print.bg, 'rgb(255, 255, 255)', r.page); assert.match(r.print.color, /^rgb\((0|17), (0|17), (0|17)\)$/, r.page); assert.equal(r.print.nav, 'none', r.page); assert.equal(r.print.skip, 'none', r.page); }
});
