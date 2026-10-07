// tools/demo-shots.mjs - drive demo/index.html in real Chrome: pictures of the three languages on real scenes, and the numbers the page reports (zero overlap, every unit drawn).
//   node tools/demo-shots.mjs [--langs nato,shield,minimal] [--scenes angle,culps,cemetery] [--grounds aerial,paper] [--dprs 1,2] [--zoom 16]
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { CHROME, ROOT, PROFILE } from './chrome.mjs';
import { serve } from './serve.mjs';
const argv = process.argv.slice(2); const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const langs = opt('langs', 'nato,shield,minimal').split(','); const scenes = opt('scenes', 'angle,culps,cemetery').split(','); const grounds = opt('grounds', 'aerial,paper').split(','); const dprs = opt('dprs', '2').split(',').map(Number); const zoom = opt('zoom', 'auto');
const labels = opt('labels', 'tab'); const prefix = opt('prefix', 'scene');
const srv = await serve(9822); const results = [];
fs.mkdirSync(path.join(ROOT, 'sheets'), { recursive: true });
for (const dpr of dprs) {
  const ctx = await chromium.launchPersistentContext(PROFILE + '-demo', { executablePath: CHROME, headless: true, viewport: { width: 1200, height: 800 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--disable-extensions', '--force-color-profile=srgb', '--remote-debugging-port=9823'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  for (const lang of langs) for (const scene of scenes) for (const ground of grounds) {
    await page.goto(`http://localhost:9822/demo/index.html?lang=${lang}&scene=${scene}&ground=${ground}&zoom=${zoom}&labels=${labels}&dpr=${dpr}`); await page.waitForFunction(() => document.title === 'ready', null, { timeout: 20000 });
    const r = await page.evaluate(() => window.__demo); results.push({ ...r, errors: errs.slice() });
    const flat = ground === 'paper' || ground === 'ink'; const f = path.join(ROOT, 'sheets', `${prefix}-${lang}-${scene}-${ground}@${dpr}x.${flat ? 'png' : 'jpg'}`); await (await page.$('#c')).screenshot(flat ? { path: f } : { path: f, type: 'jpeg', quality: 92 });     // the synthetic aerial ground is noise: JPEG q92 keeps the folder small; the pixel truth of the symbols is the atlas PNG (and the 'pixels as shipped' sections of the context sheets) console.log(path.basename(f), r.drawn + '/' + r.units, 'overlaps', r.overlappingPairs, 'maxDisp', r.maxDisplacementPx, r.unplaced.length ? 'UNPLACED ' + r.unplaced.join(',') : '');
  }
  await ctx.close();
}
srv.close();
fs.writeFileSync(path.join(ROOT, 'results', `demo-${prefix}.json`), JSON.stringify({ generated: new Date().toISOString(), results }, null, 2));
