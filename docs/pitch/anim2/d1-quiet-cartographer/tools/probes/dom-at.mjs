// tools/probes/dom-at.mjs - boxes of elements at a viewport: node tools/probes/dom-at.mjs --vp=390x844 --sel='#topbar > *' [--select=U-14VT]
import { open, setScene, args, stopServer } from '../lib.mjs';
const [vw, vh] = (args.vp || '1440x900').split('x').map(Number);
const s = await open({ w: vw, h: vh, dpr: 1, profile: 'dom', mobile: vw < 500 });
try {
  await setScene(s.page, { tick: 551, lat: 39.8117, lng: -77.2347, zoom: 14.5, safe: true, steps: 40, popups: true });
  if (args.js) await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${args.js} })()`);
  const r = await s.page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${e.tagName}.${(e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 40)} x${Math.round(b.left)}-${Math.round(b.right)} y${Math.round(b.top)}-${Math.round(b.bottom)} flex:${cs.flex} disp:${cs.display}`; }), args.sel);
  console.log(r.join('\n'));
} finally { await s.close(); await stopServer(); }
