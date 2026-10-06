// layout-lab/shot.mjs - SVG -> PNG with the system Chrome (playwright-core), profile under tmp/pitch-anim/layout/chrome-profile/shot
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { REPO } from './lib/data.mjs';

const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export async function svgsToPng(jobs) {   // jobs: [{ svg, out, width, height }]
  const profile = path.join(REPO, 'tmp', 'pitch-anim', 'layout', 'chrome-profile', 'shot'); fs.mkdirSync(profile, { recursive: true });
  const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio'], deviceScaleFactor: 2 });
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    for (const j of jobs) {
      await page.setViewportSize({ width: Math.ceil(j.width), height: Math.ceil(j.height) });
      await page.setContent(`<!doctype html><html><body style="margin:0;background:#10151c">${j.svg}</body></html>`);
      fs.mkdirSync(path.dirname(j.out), { recursive: true });
      await page.screenshot({ path: j.out, clip: { x: 0, y: 0, width: Math.ceil(j.width), height: Math.ceil(j.height) } });
    }
  } finally { await ctx.close(); }
}
