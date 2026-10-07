// dev preview: render a quick grid of sprites at a CSS zoom on a few backdrops (design iteration only; the real sheets come from build.mjs)
import { launch, ROOT } from './chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { LANGUAGES } from '../src/languages.mjs';
import fs from 'node:fs'; import path from 'node:path';
const lang = process.argv[2] || 'nato'; const zoom = +(process.argv[3] || 3); const out = process.argv[4] || 'dev.png';
const { T } = loadTokens({});
const mod = LANGUAGES[lang];
const BACK = [['#0c1b0a', 'forest shadow'], ['#4e613e', 'field'], ['#c9bf9f', 'bare soil'], ['#ebe6da', 'paper']];
const sides = ['union', 'confederate', 'unknown', 'mixed']; const arms = ['infantry', 'cavalry', 'artillery', 'horse_artillery', 'sharpshooter', 'formation'];
const eches = ['regiment', 'battalion', 'brigade', 'division', 'corps'];
let html = `<body style="margin:0;font:11px Segoe UI;background:#222">`;
let n = 0;
for (const [bg, name] of BACK) {
  html += `<div style="background:${bg};padding:10px;margin:0 0 2px"><div style="color:#888;font-size:10px">${name}</div>`;
  for (const side of sides) {
    html += `<div style="display:flex;gap:${6 * zoom}px;align-items:flex-end;margin:${4 * zoom}px 0">`;
    for (const arm of arms) for (const ech of (arm === 'formation' ? ['brigade', 'division', 'corps'] : ['regiment', 'battalion'])) {
      if (side === 'mixed' && arm !== 'infantry' && arm !== 'formation') continue;
      for (const state of (name === 'field' ? ['fresh', 'carried'] : ['fresh'])) {
        const r = mod.base({ side, arm, ech, state }, T, 's' + (n++));
        html += `<div style="width:${r.w * zoom}px;height:${r.h * zoom}px">${r.svg.replace('<svg ', `<svg style="width:${r.w * zoom}px;height:${r.h * zoom}px" `)}</div>`;
      }
    }
    html += `</div>`;
  }
  html += `</div>`;
}
const { page, close } = await launch({ w: 1900, h: 1200 });
await page.setContent(html); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(ROOT, '..', '..', '..', '..', 'tmp', 'look-dev', 'symbology', out), fullPage: true });
await close(); console.log('ok');
