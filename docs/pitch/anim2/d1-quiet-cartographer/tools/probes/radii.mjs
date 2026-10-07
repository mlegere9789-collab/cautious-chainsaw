// tools/probes/radii.mjs - which elements of the interface have a corner radius other than 6 or 10 px (the two radii of the language)?   node tools/probes/radii.mjs
import { open, sleep, stopServer } from '../lib.mjs';
const s = await open({ dpr: 1, profile: 'radii', port: 9847 });
try {
  await sleep(1500);
  const out = await s.page.evaluate(() => { const r = {}; for (const e of document.querySelectorAll('#app *')) { const cs = getComputedStyle(e); const v = cs.borderTopLeftRadius; if (v === '0px' || v === '6px' || v === '10px') continue; if (e.getBoundingClientRect().width === 0) continue; const k = v + ' ' + e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + (e.id ? '#' + e.id : ''); r[k] = (r[k] || 0) + 1; } return r; });
  console.log(JSON.stringify(out, null, 1));
} finally { await s.close(); await stopServer(); }
