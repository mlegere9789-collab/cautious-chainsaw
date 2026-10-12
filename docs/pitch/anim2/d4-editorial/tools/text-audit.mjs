// tools/text-audit.mjs - THE 11 PX FLOOR, measured on the page: in every state of the interface (the map, each panel, the menu, a tour caption, every popup) the computed font size of every element that has
// visible text of its own is read; the smallest and the offenders are reported.  Canvas text (the marks, the place names) is 12 and 13 px by token and is not in the DOM.
//   node tools/text-audit.mjs   -> results/text-audit.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT } from './lib.mjs';
const audit = () => { const out = []; const walk = (root) => { for (const el of root.querySelectorAll('*')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; let own = ''; for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent; own = own.trim(); if (!own) continue; if (el.closest('#pop-measure')) continue; const fs_ = parseFloat(cs.fontSize); out.push({ tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), size: +fs_.toFixed(2), text: own.slice(0, 28) }); } }; walk(document.body); return out; };
const srv = await serve(); const b = await launch({ dpr: 1 }); const res = []; const all = [];
try {
  const states = [
    ['map, default popups, tick 551', 'scene=fresh2&tick=551&zoom=15.5', async () => {}],
    ['Tune panel', 'scene=fresh2&tick=556&zoom=15', async () => { await b.page.evaluate(() => window.__studio.ui.togglePanel('tune')); }],
    ['Inspect panel with a selected unit', 'scene=fresh2&tick=556&zoom=15', async () => { await b.page.evaluate(() => { const S = window.__studio; for (const u of S.engine.battle.units.values()) if (u.short === '53 VA') { S.engine.select(u.id); S.host.setSelected(u.id); } window.__studio.ui.togglePanel('inspect'); }); }],
    ['About panel', 'scene=fresh2&tick=556&zoom=15', async () => { await b.page.evaluate(() => window.__studio.ui.togglePanel('about')); }],
    ['Showcase menu', 'scene=fresh2&tick=556&zoom=15', async () => { await b.page.click('button[aria-haspopup="menu"]'); }],
    ['tour caption (the showcase, live readout)', 'scene=field&tick=300&zoom=13.5', async () => { await b.page.evaluate(() => window.__studio.startTour('showcase')); }],
    ['welcome card', 'scene=field&tick=300&zoom=13.5', async () => { await b.page.evaluate(() => window.__studio.showWelcome()); }],
    ['legend in the rail', 'scene=fresh2&tick=556&zoom=15', async () => { await b.page.evaluate(() => window.__studio.host.openRail('legend:legend')); }],
    ['Chronicle in the rail', 'scene=fresh2&tick=551&zoom=15.5', async () => { await b.page.evaluate(() => window.__studio.host.toggleDoc('chronicle:list')); }],
    ['metrics overlay', 'scene=fresh2&tick=556&zoom=15&metrics=1', async () => {}],
  ];
  for (const [name, q, act] of states) { await open(b.page, q, { steps: 80 }); await act(); await settle(b.page, 90); const r = await b.page.evaluate(audit); const min = r.reduce((m, x) => Math.min(m, x.size), 99); const off = r.filter((x) => x.size < 10.99); res.push({ state: name, elements: r.length, min, offenders: off.slice(0, 8) }); all.push(...r); console.log(name, r.length, 'text elements, smallest', min, off.length ? 'OFFENDERS ' + JSON.stringify(off.slice(0, 5)) : ''); }
  await b.page.setViewportSize({ width: 390, height: 844 });
  await open(b.page, 'scene=fresh2&tick=556&zoom=14.5', { steps: 80 }); await b.page.evaluate(() => window.__studio.startTour('showcase')); await settle(b.page, 90); { const r = await b.page.evaluate(audit); const min = r.reduce((m, x) => Math.min(m, x.size), 99); const off = r.filter((x) => x.size < 10.99); res.push({ state: 'phone 390x844, tour caption', elements: r.length, min, offenders: off.slice(0, 8) }); console.log('phone tour', r.length, min, off.length ? JSON.stringify(off.slice(0, 5)) : ''); }
} finally { await b.close(); srv.close(); }
fs.writeFileSync(path.join(ROOT, 'results', 'text-audit.json'), JSON.stringify({ floorPx: 11, states: res, smallest: Math.min(...res.map((r) => r.min)) }, null, 1));
