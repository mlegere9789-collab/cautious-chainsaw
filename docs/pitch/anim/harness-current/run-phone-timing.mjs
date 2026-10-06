// usage: node run-phone-timing.mjs <baseline|r1c>  - frame cadence of the unit layer on the 390x844 DPR3 phone layout (30 fps cap in the app: canvas width < 500)
import fs from 'node:fs';
import { serve, open, boot, readState, sleep, setTick, tickNow, mapView, tileBudget, wj, WORK } from './common.mjs';
const which = process.argv[2] || 'r1c';
const probeSrc = fs.readFileSync(`${WORK}/probe-light.js`, 'utf8');
const srv = await serve(which); const S = await open({ vp: 'phone', port: 9507, profile: 'phone-timing-' + which }); const P = S.page;
await P.addInitScript(probeSrc);
const out = { build: which, vp: 'phone', runs: [] };
const clickBig = async () => { const h = await P.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => { const r = b.getBoundingClientRect(); return r.width >= 60 && r.width <= 70 && r.height >= 60 && r.height <= 70 && r.y > 600; })); const el = h.asElement(); if (!el) throw new Error('no play button'); await el.click(); };
const clickSpeedBtn = async () => { const h = await P.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^(\d(\/\d)?×|\d\/\dx|\dx)$/.test(b.textContent.trim()) && b.getBoundingClientRect().y > 600)); const el = h.asElement(); if (!el) throw new Error('no speed button'); await el.click(); };
const speedText = () => P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(\d(\/\d)?×|\d\/\dx|\dx)$/.test(x.textContent.trim()) && x.getBoundingClientRect().y > 600); return b ? b.textContent.trim() : null; });
try {
  await boot(S, srv.url, { layout: 'mobile' }); await sleep(2000);
  // warm up lazily loaded days in baseline: play a few seconds at the end of day 2
  await setTick(P, 440); await sleep(300); await clickBig(); await sleep(2500); await clickBig(); await sleep(500);
  for (const target of ['1×', '4×']) {
    for (let i = 0; i < 8 && (await speedText()) !== target; i++) { await clickSpeedBtn(); await sleep(150); }
    await setTick(P, 520); await sleep(900);
    await P.evaluate(() => window.__pl.start());
    await clickBig(); await sleep(15000); await clickBig();
    const tr = await P.evaluate(() => window.__pl.stop());
    const endTick = await tickNow(P);
    out.runs.push({ label: `phone-timing-${target}-dense-z13.5`, speed: target, start: 520, endTick, ms: 15000, ...tr, zoom: (await mapView(P)).zoom, center: (await mapView(P)).center });
    console.log(target, 'end tick', endTick, 'raf', tr.raf.length, 'draws', tr.draws.length);
  }
  wj(`${WORK}/runs-${which}-timing-phone.json`, out); console.log('tiles used', tileBudget.used);
} finally { await S.close(); await srv.close(); }
