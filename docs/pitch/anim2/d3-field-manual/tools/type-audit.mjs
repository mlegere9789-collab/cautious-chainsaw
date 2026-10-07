// tools/type-audit.mjs - does the language keep its own type rule?  "At most two type sizes plus one numeral style, none under 11 px, one family for the interface and one for narrative."
// It drives the page through the states that show text (the map at three zooms, a selected mark with its card, the legend in the rail, the Tuning Studio, About, a tour caption, a day banner, the
// toasts, the welcome) and records, for every state: (1) the size, weight and family of every visible DOM text element (getComputedStyle), (2) every font string the page ever assigned to a 2D canvas
// context (an instrumented `font` setter), which covers the marks, the ground's names, the scrubber and the overview.   -> results/type-audit.json (exit 1 when a size other than 11 or 13 px appears)
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, settle, ROOT } from './lib.mjs';

const srv = await startServer(); const s = await launch({ dpr: 2, profile: 'type', query: 'manual=1', welcome: true }); const { page } = s;
try {
  await page.evaluate(() => {
    window.__fonts = new Map(); const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', { get() { return d.get.call(this); }, set(v) { const k = String(v); window.__fonts.set(k, (window.__fonts.get(k) || 0) + 1); d.set.call(this, v); }, configurable: true });
  });
  const dom = new Map(); const record = async (state) => {
    const rows = await page.evaluate(() => {
      const out = []; const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) { const n = walk.currentNode; const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName) || el.closest('#pop-measure, #splash, #pop-live, noscript')) continue;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; let vis = true; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) { vis = false; break; } } if (!vis) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
        const cs = getComputedStyle(el); out.push({ size: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), text: t.slice(0, 40), sel: el.className || el.tagName }); }
      return out;
    });
    for (const r of rows) { const k = `${r.size} / ${r.weight} / ${r.family}`; const e = dom.get(k) || { count: 0, states: new Set(), examples: [] }; e.count++; e.states.add(state); if (e.examples.length < 3) e.examples.push(`${r.sel}: ${r.text}`); dom.set(k, e); }
  };
  const step = (n = 40) => page.evaluate((n) => { window.__studio.step(n, 25); }, n);
  const go = (o) => page.evaluate((o) => { const S = window.__studio; const E = S.engine; if (S.ui.panelOpen) S.ui.togglePanel(S.ui.tab); S.host.closeRail(); E.select(null); S.host.setSelected(null); E.transport.pause(); E.transport.seek(o.tick, { glide: false }); E.moveTo({ lat: o.lat, lng: o.lng, zoom: o.zoom }, { glide: false, safe: true }); for (let i = 0; i < 40; i++) S.step(1, 25); }, o);
  await step(30); await record('welcome'); await page.evaluate(() => { window.__studio.narration.hide(); window.__studio.engine.tuning.set('popup.hints.enabled', false); });
  for (const z of [13.5, 15, 16.5]) { await go({ tick: 551, lat: 39.8117, lng: -77.2347, zoom: z }); await settle(page); await record('map z' + z); }
  await page.evaluate(() => { const S = window.__studio; const f = S.engine.frame; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.unit && q.unit.kind === 'regiment')[3]; S.engine.select(t.ids[0]); S.host.setSelected(t.ids[0]); S.ui.setSelection(t); for (let i = 0; i < 90; i++) S.step(1, 25); }); await record('selected + card + inspect panel');
  await page.evaluate(() => { const S = window.__studio; S.host.openRail('unit-card:sel-' + S.engine.selectedId); for (let i = 0; i < 100; i++) S.step(1, 25); }); await page.waitForTimeout(500); await record('details rail');
  await go({ tick: 551, lat: 39.8117, lng: -77.2347, zoom: 15 }); await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); S.host.act('legend:legend', 'toggle'); for (let i = 0; i < 80; i++) S.step(1, 25); }); await page.waitForTimeout(500); await record('legend in the rail');
  await go({ tick: 551, lat: 39.8117, lng: -77.2347, zoom: 15 }); for (const tab of ['tune', 'about']) { await page.evaluate((tab) => { const S = window.__studio; S.ui.togglePanel(tab); for (let i = 0; i < 20; i++) S.step(1, 25); }, tab); await page.waitForTimeout(300); await record('panel ' + tab); await page.evaluate((tab) => window.__studio.ui.togglePanel(tab), tab); }
  await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); S.engine.transport.setSpeed(1); S.engine.transport.play(); for (let i = 0; i < 260; i++) S.step(1, 25); S.engine.transport.pause(); for (let i = 0; i < 40; i++) S.step(1, 25); }); await page.waitForTimeout(500); await record('toasts and event cards');
  await go({ tick: 449, lat: 39.8189, lng: -77.2262, zoom: 14 }); await page.evaluate(() => { const S = window.__studio; S.host.dismissAll(); S.engine.transport.setSpeed(2); S.engine.transport.play(); for (let i = 0; i < 260; i++) S.step(1, 25); S.engine.transport.pause(); S.step(30, 25); }); await page.waitForTimeout(500); await record('day banner');
  await page.evaluate(() => { const S = window.__studio; S.startTour('showcase'); S.step(90, 25); }); await page.waitForTimeout(500); await record('narration');
  const canvas = await page.evaluate(() => [...window.__fonts.entries()].map(([k, n]) => ({ font: k, uses: n })));
  const sizes = new Set(); for (const k of dom.keys()) sizes.add(k.split(' / ')[0]); const csizes = new Set(canvas.map((c) => (/(\d+(?:\.\d+)?)px/.exec(c.font) || [])[1] + 'px'));
  const bad = [...sizes].filter((z) => !['11px', '13px'].includes(z)); const cbad = [...csizes].filter((z) => !['11px', '13px'].includes(z));
  const out = { generated: new Date().toISOString(), domSizes: [...sizes].sort(), canvasSizes: [...csizes].sort(), notElevenOrThirteen: { dom: bad, canvas: cbad }, dom: [...dom.entries()].map(([k, v]) => ({ style: k, count: v.count, states: [...v.states], examples: v.examples })).sort((a, b) => b.count - a.count), canvasFonts: canvas.sort((a, b) => b.uses - a.uses) };
  fs.writeFileSync(path.join(ROOT, 'results', 'type-audit.json'), JSON.stringify(out, null, 1));
  console.log('DOM sizes', out.domSizes.join(' '), '| canvas sizes', out.canvasSizes.join(' ')); console.log('off-scale DOM', JSON.stringify(bad), 'canvas', JSON.stringify(cbad));
  for (const r of out.dom.filter((r) => bad.includes(r.style.split(' / ')[0]))) console.log('  ', r.style, r.count, r.states.join(','), JSON.stringify(r.examples));
  console.log('canvas fonts', JSON.stringify(canvas.slice(0, 12).map((c) => c.font.slice(0, 40)))); console.log('families', JSON.stringify([...new Set(out.dom.map((r) => r.style.split(' / ')[2]))]));
  process.exitCode = bad.length || cbad.length ? 1 : 0;
} finally { await s.close(); srv.close(); }
