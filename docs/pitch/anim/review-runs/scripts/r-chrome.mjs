// r-chrome.mjs (reviewer) - is the clock disclosure ("about", plus-minus, "candidate clock") actually VISIBLE in the top bar, or clipped?
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9742);
const srv = await serve(PROTO, PORT);
const out = [];
try {
  for (const [w, h, dpr, mobile] of [[1280, 720, 1, false], [1366, 768, 1, false], [1440, 900, 1, false], [1920, 1080, 1, false], [390, 844, 2, true]]) {
    const s = await launch({ w, h, dpr, mobile, port: PORT, query: 'welcome=0&manual=1', profile: 'chrome-' + w });
    try {
      for (const tick of [28, 36, 604]) {
        const r = await s.page.evaluate((tick) => {
          const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); for (let i = 0; i < 30; i++) S.step(1);
          const q = [...document.querySelectorAll('#topbar *, #dock *, .clockhud, #clock, [class*=clock]')].filter((e) => e.children.length === 0 && (e.textContent || '').trim().length > 6);
          return q.map((e) => { const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return { sel: (e.id ? '#' + e.id : '') + '.' + String(e.className).slice(0, 40), text: e.textContent.trim().slice(0, 140), clipped: e.scrollWidth > e.clientWidth + 1, sw: e.scrollWidth, cw: e.clientWidth, overflow: cs.overflow, textOverflow: cs.textOverflow, vis: b.width > 0 && b.height > 0 }; }).filter((x) => /AM|PM|clock|about/i.test(x.text));
        }, tick);
        out.push({ w, h, tick, items: r });
      }
    } finally { await s.close(); }
  }
  for (const o of out) { console.log('==', o.w, 'x', o.h, 'tick', o.tick); for (const i of o.items) console.log('  ', i.clipped ? 'CLIPPED' : 'ok     ', JSON.stringify(i.text), i.sw + '/' + i.cw, i.sel); }
  writeJson('r-chrome.json', out);
} finally { srv.close(); }
