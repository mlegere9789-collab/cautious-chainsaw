// The prototype director while the animation really plays (1x, Day 2 ticks 254-356): coverage by its cards sampled every ~100 ms,
// how long each card lived (wall clock), how often it moved, layout cost per pass, frame times with and without it.
import fs from 'node:fs';
import { boot, sleep, TREES, OUT, REPO } from './h.mjs';
import { install, setTick, snap, coverage } from './m.mjs';
const SAMPLE = process.env.SAMPLE === '1';
const SPEED = +process.env.SPEED || 1; const FROM = 254, TO = +process.env.TO || 330;
const b = await boot('R1c', { cdpPort: 9545, profile: 'pp', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 3000 });
const { page, s } = b;
await install(page, TREES.R1c.entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(400);
s.setTiles('block');
await page.addScriptTag({ content: fs.readFileSync(REPO + '/tools/time/build/gtbg-time.iife.js', 'utf8') });
await page.addScriptTag({ content: fs.readFileSync(REPO + '/docs/pitch/anim/popups-lab/proto.js', 'utf8') });
let CARDS_OFF = false;
const frames = async (label) => {
  await page.evaluate(([from, sp]) => { const g = window.__store.getState(); g.setPlaying(false); g.setSpeed(sp); g.setTick(from); window.__fr = []; let last = performance.now(); const f = () => { const n = performance.now(); window.__fr.push(n - last); last = n; if (window.__frOn) requestAnimationFrame(f); }; window.__frOn = true; requestAnimationFrame(f); }, [FROM, SPEED]);
  await sleep(1500);
  await page.evaluate(() => { window.__fr.length = 0; window.__store.getState().setPlaying(true); });
  const samples = []; const t0 = Date.now();
  for (;;) {
    const t = await page.evaluate(() => window.__store.getState().currentTick);
    if (t >= TO || Date.now() - t0 > 120000) break;
    if (label === 'proto' && SAMPLE) { const sn = await snap(page, null); const c = coverage(sn, { names: new Set(['proto']) }); samples.push({ t, cards: sn.popups.filter((p) => p.name === 'proto').length, tiles: c.anyTiles, labels: c.anyLabels }); }
    await sleep(100);
  }
  await page.evaluate(() => { window.__store.getState().setPlaying(false); window.__frOn = false; });
  const fr = await page.evaluate(() => window.__fr.slice(5));
  fr.sort((a, b) => a - b);
  return { fr: { n: fr.length, p50: +fr[Math.floor(fr.length / 2)].toFixed(1), p95: +fr[Math.floor(fr.length * .95)].toFixed(1), max: +fr[fr.length - 1].toFixed(1), over25: fr.filter((x) => x > 25).length }, samples };
};
const off = await frames('off');
await page.evaluate((fl) => { Object.assign(window.__proto.tokens, fl); window.__proto.tokens.motion.move = 260; return window.__proto.start(); }, JSON.parse(process.env.FLAGS || '{}'));
await sleep(500);
await page.evaluate(() => { const st = window.__proto.stats; st.layoutMs.length = 0; st.ms.length = 0; st.moves = 0; st.placed = 0; st.noRoom = 0; });
const on = await frames('proto');
const stats = await page.evaluate(() => { const st = window.__proto.stats; return { layoutMs: st.layoutMs.slice(), solveMs: st.ms.slice(), moves: st.moves, placed: st.placed, noRoom: st.noRoom, forms: st.forms, ph: st.ph, drawMs: st.drawMs, life: st.life }; });
const q = (a, p) => { if (!a || !a.length) return null; const x = [...a].sort((m, n) => m - n); return +x[Math.min(x.length - 1, Math.floor(p * x.length))].toFixed(2); };
const out = { speed: SPEED, window: [FROM, TO], framesWithout: off.fr, framesWith: on.fr, samples: on.samples.length, samplesWithCards: on.samples.filter((x) => x.cards > 0).length, samplesWithAnyTileUnderACard: on.samples.filter((x) => x.tiles > 0).length, maxTilesUnder: Math.max(0, ...on.samples.map((x) => x.tiles)), layoutMs: { n: stats.layoutMs.length, p50: q(stats.layoutMs, .5), p95: q(stats.layoutMs, .95), max: q(stats.layoutMs, 1) }, solveMs: { n: stats.solveMs.length, p50: q(stats.solveMs, .5), p95: q(stats.solveMs, .95), max: q(stats.solveMs, 1) }, cardMoves: stats.moves, placements: stats.placed, noRoom: stats.noRoom, forms: stats.forms, life: (() => { const L = stats.life || []; const by = {}; L.forEach((x) => { const k = x.kind + (x.kind === 'chip' ? '' : ':' + x.tier); (by[k] ||= []).push(x.ms); }); return Object.fromEntries(Object.entries(by).map(([k, a]) => [k, { n: a.length, minMs: Math.min(...a), medianMs: q(a, .5), maxMs: Math.max(...a) }])); })(), drawMs: { n: (stats.drawMs || []).length, p50: q(stats.drawMs, .5), p95: q(stats.drawMs, .95), max: q(stats.drawMs, 1) }, phases: stats.ph ? { grid: q(stats.ph.grid, .5), sat: q(stats.ph.sat, .5), rest: q(stats.ph.rest, .5) } : null };
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(OUT + `/proto-play-${SPEED}x${SAMPLE ? '-sampled' : ''}.json`, JSON.stringify(out, null, 1));
await b.close();
