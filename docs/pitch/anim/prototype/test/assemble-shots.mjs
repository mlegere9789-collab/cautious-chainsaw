// test/assemble-shots.mjs - pictures of the assembled page at 1440x900 and 390x844: the welcome card, every step of the 60-second Showcase (stepped on the engine's own clock, ?manual=1, so each picture
// is the same every run), the metrics overlay with both renderers filled, the Tuning Studio and the menu.  Output: docs/pitch/anim/shots/prototype/assembled/.
//   node test/assemble-shots.mjs [--out=docs/pitch/anim/shots/prototype/assembled]
import fs from 'node:fs';
import path from 'node:path';
import { launch, REPO, args } from './assemble-lib.mjs';

const OUT = path.resolve(args.out || path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype', 'assembled')); fs.mkdirSync(OUT, { recursive: true });
const NAMES = ['open', 'before', 'after', 'results', 'style-war-room', 'style-field-manual', 'style-map-1863', 'field', 'popups', 'outro'];
const MID = { open: 2.5, before: 7, after: 7, results: 2, 'style-war-room': 3, 'style-field-manual': 3, 'style-map-1863': 3, field: 6, popups: 6, outro: 2 };
const written = [];
for (const [tag, w, h, dpr, mobile, port] of [['desktop', 1440, 900, 1, false, 9780], ['phone', 390, 844, 2, true, 9782]]) {
  const s = await launch({ w, h, dpr, mobile, port, query: 'manual=1' });
  const shot = async (name) => { await s.page.waitForTimeout(300); const f = path.join(OUT, `${tag}-${name}.png`); await s.page.screenshot({ path: f }); written.push(path.relative(REPO, f).replace(/\\/g, '/')); };
  try {
    await s.page.waitForTimeout(900); await s.page.evaluate(() => window.__studio.step(40)); await shot('00-welcome');
    await s.page.evaluate(() => window.__studio.startTour('showcase'));
    for (let k = 0; k < NAMES.length; k++) {
      // play the step through, then take its picture at its middle: the lanes of the report are filled by real frames
      const mid = MID[NAMES[k]]; const total = await s.page.evaluate(() => { const D = window.__studio.director; return D.tour.steps[D.state.i].ms / 1000; });
      await s.page.evaluate((sec) => { window.__studio.step(Math.round(sec * 60)); }, mid); await shot(`${String(k + 1).padStart(2, '0')}-${NAMES[k]}`);
      await s.page.evaluate((sec) => { window.__studio.step(Math.round(sec * 60) + 2); }, total - mid);
    }
    // overlays on the Studio at the end of the tour
    await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('metrics.overlay', true); S.step(30); }); await shot('11-metrics-both-renderers');
    await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('metrics.overlay', false); S.ui.togglePanel('tune'); S.step(5); }); await shot('12-tuning-studio');
    await s.page.evaluate(() => { const S = window.__studio; S.ui.togglePanel('tune'); S.ui.chooseStyle('field-manual', 'standard'); S.step(60); S.ui.toggleMenu(); }); await shot('13-showcase-menu-light');
    console.log(tag, 'errors', s.errors.length, 'requests', s.requests.length);
  } finally { await s.close(); }
}
fs.writeFileSync(path.join(OUT, 'list.json'), JSON.stringify({ generated: new Date().toISOString(), files: written }, null, 1)); console.log(written.length, 'pictures in', path.relative(REPO, OUT));
