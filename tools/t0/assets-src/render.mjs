// Renders tools/t0/assets-src/card.html variants to raw PNGs with headless system Chrome (playwright-core, own profile dir).
//   node tools/t0/assets-src/render.mjs <outDir>
// Variants: og (1200x630), day1 and day3 (1280x720).  build_assets.py calls this and then converts the PNGs to 8-bit RGB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const AGENT = process.env.T0_AGENT || 't0-maps';
const outDir = path.resolve(process.argv[2] || path.join(REPO, 'tmp', AGENT, 'render'));
fs.mkdirSync(outDir, { recursive: true });
const SIZES = { og: [1200, 630], day1: [1280, 720], day3: [1280, 720] };
const profile = path.join(REPO, 'tmp', AGENT, 'chrome-profile', 'render');
fs.rmSync(profile, { recursive: true, force: true });
const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, headless: true, deviceScaleFactor: 1, viewport: { width: 1280, height: 720 }, args: ['--disable-extensions', '--no-first-run'] });
try {
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(pathToFileURL(path.join(HERE, 'card.html')).href + '#' + name);
    await page.waitForFunction(() => window.__ready === true);
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...new Set([...document.querySelectorAll('text')].map((t) => getComputedStyle(t).fontFamily))]);
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`rendered ${name} ${w}x${h} -> ${file} (fonts: ${fonts.join(' | ')})`);
    await page.close();
  }
} finally { await ctx.close(); }
