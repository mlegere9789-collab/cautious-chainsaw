// tools/chrome.mjs - one place that starts the real Chrome used for rendering (headless, own profile under tmp/look-dev/symbology/).
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');                       // docs/pitch/anim2/symbology
export const REPO = path.resolve(ROOT, '..', '..', '..', '..');
export const PROFILE = path.join(REPO, 'tmp', 'look-dev', 'symbology', 'profile');
export async function launch({ w = 1600, h = 1000, dpr = 1 } = {}) {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME, headless: true, viewport: { width: w, height: h }, deviceScaleFactor: dpr,
    args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio', '--remote-debugging-port=9821', '--force-color-profile=srgb', '--disable-lcd-text'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  return { ctx, page, close: () => ctx.close() };
}
