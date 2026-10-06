// url-check.mjs - opens docs/pitch/anim/prototype/battle-studio.html from file:// with each URL the pitch tells the owner to use, headless Chrome, and reports what the page says it is doing.
//   node url-check.mjs <path-to-battle-studio.html>
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const file = path.resolve(process.argv[2] || 'battle-studio.html');
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = 'file:///' + file.split(path.sep).join('/');
const cases = [
  { q: '', note: 'plain open (welcome card)' },
  { q: '?style=war-room&welcome=0', note: 'war-room' },
  { q: '?style=field-manual&set=' + encodeURIComponent('{"interp.model":"chord-smooth","layout.dMaxPx":0}') + '&welcome=0', note: 'instrument stance' },
  { q: '?style=field-manual&variant=cvd&welcome=0', note: 'field-manual cvd' },
  { q: '?style=map-1863&variant=contrast&welcome=0', note: 'map-1863 contrast' },
  { q: '?compare=before&welcome=0', note: 'compare=before' },
  { q: '?tour=showcase', note: 'tour showcase' },
  { q: '?tour=hotspot-the-angle', note: 'tour hotspot-the-angle' },
  { q: '?tour=hotspot-cemetery-hill', note: 'tour hotspot-cemetery-hill' },
  { q: '?tour=hotspot-rose-woods', note: 'tour hotspot-rose-woods' },
  { q: '?tick=556&zoom=15&play=1&speed=4&welcome=0', note: 'tick zoom play speed' },
  { q: '?tune=1&welcome=0', note: 'tune panel' },
  { q: '?metrics=1&welcome=0', note: 'metrics overlay' },
  { q: '?set=' + encodeURIComponent('{"layout.dMaxPx":0}') + '&welcome=0', note: 'set dial' },
  { q: '?style=war-room&skinset=' + encodeURIComponent('{"war-room":{"rim.glow":0.6,"color.union":"#3fa0ff"}}') + '&welcome=0', note: 'skinset war-room', kit: 'war-room', keys: ['rim.glow', 'color.union'] },
  { q: '?style=field-manual&skinset=' + encodeURIComponent('{"field-manual":{"color.union":"#17489a","frame.dash":4}}') + '&welcome=0', note: 'skinset field-manual', kit: 'field-manual', keys: ['color.union', 'frame.dash'] },
  { q: '?style=map-1863&skinset=' + encodeURIComponent('{"map-1863":{"pencil.dash":2.4,"badge.size":5}}') + '&welcome=0', note: 'skinset map-1863', kit: 'map-1863', keys: ['pencil.dash', 'badge.size'] },
];
const out = [];
const dir = path.resolve('chrome-profile-url'); fs.mkdirSync(dir, { recursive: true });
const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
for (const c of cases) {
  const errors = []; const reqs = [];
  const h1 = (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); }; const h2 = (e) => errors.push('pageerror: ' + e.message); const h3 = (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); };
  page.on('console', h1); page.on('pageerror', h2); page.on('request', h3);
  await page.goto(base + (c.q ? c.q + '&fresh=1' : '?fresh=1'));
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 30000 });
  await page.waitForTimeout(c.q.includes('tour=') ? 2500 : 1200);
  const kit = c.kit ? await page.evaluate(([k, keys]) => { try { const t = window.__skinKit.exportTokens(k)[k]; const o = {}; for (const key of keys) o[key] = t[key]; return o; } catch (e) { return 'ERR ' + e.message; } }, [c.kit, c.keys]) : null;
  const info = await page.evaluate(() => { const S = window.__studio; const T = S.engine.tuning; const nar = document.getElementById('narration'); const narVisible = nar && !nar.classList.contains('hidden') && getComputedStyle(nar).display !== 'none';
    return { skin: T.get('skin.id'), backdrop: T.get('backdrop.id'), compare: T.get('compare.mode'), dMax: T.get('layout.dMaxPx'), tick: +S.engine.transport.simTau.toFixed(1), zoom: +S.engine.camera.zoom.toFixed(2), playing: !!(S.engine.transport.playing), tiles: S.engine.frame ? S.engine.frame.tiles.length : null, narration: narVisible ? (nar.innerText || '').replace(/\s+/g, ' ').slice(0, 90) : null, panel: (document.getElementById('panel') && !document.getElementById('panel').classList.contains('hidden')) ? 'open' : 'closed', metrics: !!document.querySelector('#metrics:not(.hidden)') }; });
  out.push({ case: c.note, query: c.q, ...(kit ? { skinKitTokens: kit } : {}), ...info, consoleErrors: errors.slice(0, 3), requests: reqs.filter((u) => !u.startsWith(base.split('?')[0])).length });
  page.off('console', h1); page.off('pageerror', h2); page.off('request', h3);
}
await ctx.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('url-check.json', JSON.stringify({ file: base, generated: new Date().toISOString(), results: out }, null, 1));
