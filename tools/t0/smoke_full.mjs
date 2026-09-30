import { launch } from './cdp.mjs';
const mode = process.argv[2] || 'mobile'; const url = process.argv[3] || 'http://127.0.0.1:8202/';
const mobile = mode === 'mobile';
const W = +process.env.W || (mobile ? 375 : 1440), H = +process.env.H || (mobile ? 812 : 900); const c = await launch(9412 + (mobile ? 0 : 1) + (+process.env.PORTOFF||0), W, H, mobile);
const exc = []; const tile403 = { n: 0 };
c.ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exc.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { const t = (m.params.args[0]?.description || m.params.args[0]?.value || '').toString(); if (!/^el\n/.test(t)) exc.push('CONSOLE.ERROR ' + t.slice(0, 160)); else tile403.n++; }
});
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('gtbg_onboarded','1')}catch(e){}" });
await c.send('Page.navigate', { url });
await c.sleep(13000);
const r = {};
r.layout = await c.ev(() => document.documentElement.getAttribute('data-layout'));
r.text = await c.ev(() => (document.getElementById('root').innerText || '').replace(/\s+/g, ' ').slice(0, 200));
r.canvases = await c.ev(() => [...document.querySelectorAll('canvas')].map(k => ({ pe: getComputedStyle(k).pointerEvents, z: getComputedStyle(k).zIndex, w: Math.round(k.getBoundingClientRect().width), h: Math.round(k.getBoundingClientRect().height), cls: k.className.slice(0, 30) })));
r.ranges = await c.ev(() => document.querySelectorAll('input[type=range]').length);
if (mobile) {
  r.dock = await c.ev(() => { const d = document.querySelector('.gtbg-m-dock'); if (!d) return null; const rr = d.getBoundingClientRect(); return { y: Math.round(rr.y), h: Math.round(rr.height), w: Math.round(rr.width) }; });
  r.transport = await c.ev(() => [...document.querySelectorAll('.gtbg-m-play button')].map(b => { const rc = b.getBoundingClientRect(); const e = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2); return { label: b.getAttribute('aria-label') || b.textContent, w: Math.round(rc.width), h: Math.round(rc.height), x: Math.round(rc.x), hit: !!e && (e === b || b.contains(e)) }; }));
  // open Tools
  const tools = await c.ev(() => { const els = [...document.querySelectorAll('button,div,span')].filter(e => e.children.length === 0 || e.tagName === 'BUTTON').filter(e => /^\s*(\S{0,3}\s*)?Tools\s*$/i.test((e.innerText || e.textContent || '').trim())); const el = els.sort((a, b) => a.textContent.length - b.textContent.length)[0]; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, tag: el.tagName }; });
  r.toolsBtn = tools;
  if (tools) { await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tools.x, y: tools.y }] }); await c.sleep(60); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.sleep(900);
    r.tiles = await c.ev(() => { const p = document.querySelector('.gtbg-m-toolspanel'); if (!p) return null; const bs = [...p.querySelectorAll('button')]; return bs.map(b => { const rc = b.getBoundingClientRect(); const e = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2); return { t: (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 24), vis: rc.bottom <= innerHeight && rc.top >= 0, hit: !!e && (e === b || b.contains(e)) }; }); }); }
} else {
  r.toolbarBtn = await c.ev(() => [...document.querySelectorAll('button')].map(b => b.title).filter(Boolean).slice(0, 20));
  r.soundBtn = await c.ev(() => !![...document.querySelectorAll('button')].find(b => /sound/i.test(b.title || b.textContent || '')));
  // drag on the map: does the container see events?
  r.evt = await c.ev(() => { window.__ev = { canvas: 0, other: 0 }; const cc = document.querySelector('.mapboxgl-canvas-container'); if (cc) ['mousedown','mousemove','wheel'].forEach(t => cc.addEventListener(t, () => window.__ev.canvas++, true)); return !!cc; });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 450, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 760, y: 470, button: 'left' });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 760, y: 470, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: -120 });
  await c.sleep(600);
  r.mapEvents = await c.ev(() => window.__ev);
  r.top = await c.ev(() => { const e = document.elementFromPoint(700, 450); return e ? e.tagName + '.' + (e.className || '').toString().slice(0, 40) : null; });
}
r.exc = exc.slice(0, 10); r.tileErrEvents = tile403.n;
console.log(JSON.stringify(r, null, 1));
await c.close(); process.exit(0);
