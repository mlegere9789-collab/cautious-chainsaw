// layout-lab/measure-text.mjs
// Measures glyph advances IN REAL CHROME (canvas measureText) for the two tile fonts, so the layout maths uses measured text widths,
// not guesses.  Output: out/text-widths.json  { browser, fonts:{code:{css,adv:{char:px}}, label:{...}}, check:{...} }
//   run:  node docs/pitch/anim/layout-lab/measure-text.mjs
// Uses playwright-core + the system Chrome, a profile under tmp/pitch-anim/layout/chrome-profile, no network (about:blank + evaluate).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { loadAll, REPO } from './lib/data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = path.join(REPO, 'tmp', 'pitch-anim', 'layout', 'chrome-profile', 'text');
fs.mkdirSync(PROFILE, { recursive: true });

export const FONTS = {
  code: '700 11px "Segoe UI", system-ui, Arial, sans-serif',
  label: '600 12px "Segoe UI", system-ui, Arial, sans-serif',
  badge: '700 10px "Segoe UI", system-ui, Arial, sans-serif',
};

const all = loadAll();
const sample = { code: [], label: [], badge: [] };
for (const u of all.units.values()) { sample.code.push(u.short); sample.label.push(u.label); }
for (let i = 2; i <= 99; i++) sample.badge.push('\u00d7' + i);

const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-extensions', '--disable-sync', '--mute-audio'] });
try {
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('about:blank');
  const res = await page.evaluate(({ FONTS, sample }) => {
    const c = document.createElement('canvas').getContext('2d');
    const chars = []; for (let i = 32; i < 127; i++) chars.push(String.fromCharCode(i)); chars.push('\u00d7', '\u2026', '\u00b7', '\u2022');
    const out = { browser: navigator.userAgent, fonts: {}, check: {} };
    for (const [k, css] of Object.entries(FONTS)) {
      c.font = css; const adv = {}; for (const ch of chars) adv[ch] = c.measureText(ch).width;
      out.fonts[k] = { css, resolved: c.font, adv };
      // validation: per-char sum vs measureText of the whole string for every real string
      let worst = 0; let n = 0; let sumAbs = 0; let under = 0;
      for (const s of sample[k] || []) {
        const whole = c.measureText(s).width; let sum = 0; for (const ch of s) sum += adv[ch] ?? adv['M'];
        const err = (sum - whole) / whole; worst = Math.max(worst, Math.abs(err)); sumAbs += Math.abs(err); n++; if (sum < whole - 0.01) under++;
      }
      out.check[k] = { strings: n, worstRelErr: worst, meanAbsRelErr: n ? sumAbs / n : 0, underestimates: under };
    }
    return out;
  }, { FONTS, sample });
  res.version = ctx.browser()?.version?.() || null;
  fs.writeFileSync(path.join(OUT, 'text-widths.json'), JSON.stringify(res, null, 1));
  console.log('browser:', res.browser);
  console.log('check:', JSON.stringify(res.check));
} finally { await ctx.close(); }
