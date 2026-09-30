import { launch } from './cdp.mjs';
const base = 'http://127.0.0.1:8202/';
const cases = [
  ['?tick=451', 451], ['?t=538&u=U-20ME&z=15.5&ll=39.7918,-77.2359', 538], ['?tick=9999', 1], ['?tick=abc&unit=<script>', 1], ['?day=3', 451], ['?ancestor=U-20ME', 1]
];
const c = await launch(9440, 1440, 900, false);
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('gtbg_onboarded','1')}catch(e){}" });
const exc = []; c.ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') exc.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 140)); });
for (const [q, want] of cases) {
  exc.length = 0;
  await c.send('Page.navigate', { url: base + q });
  await c.sleep(11000);
  const r = await c.ev(() => { const a = window.__gtbgApp; const s = a && a.getState ? a.getState() : null; return { keys: a ? Object.keys(a).slice(0, 8) : null, tick: s && s.currentTick, days: s && [...s.loadedDays], sel: s && s.selectedUnitId, pinned: s && s.pinnedUnitId, n451: s && s.placementsByTick && (s.placementsByTick[451] || []).length, n1: s && s.placementsByTick && (s.placementsByTick[1] || []).length, text: (document.body.innerText || '').replace(/\s+/g, ' ').match(/July \d[^A-Z]{0,12}/) }; });
  console.log(q, '=> want tick', want, JSON.stringify(r), 'exc', exc.slice(0, 2));
}
await c.close(); process.exit(0);
