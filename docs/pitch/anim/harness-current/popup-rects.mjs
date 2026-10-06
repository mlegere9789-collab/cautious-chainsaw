// usage: node popup-rects.mjs <baseline|r1c> [desktop|phone]   Rects of every overlay that can cover the unit canvas, in four states.
import { serve, open, boot, readState, sleep, PROBE, setTick, clickSpeed, playPause, tickNow, camera, mapView, tileBudget, wj, WORK } from './common.mjs';
const which = process.argv[2] || 'r1c'; const vp = process.argv[3] || 'desktop';
const srv = await serve(which); const S = await open({ vp, port: 9508, profile: 'popups-' + which + '-' + vp }); const P = S.page;
const out = { build: which, vp, states: {} };
const rects = () => P.evaluate(() => {
  const res = [];
  const canvas = [...document.querySelectorAll('canvas')].find((c) => c.style.zIndex === '10'); const cr = canvas ? canvas.getBoundingClientRect() : null;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (!['fixed', 'absolute', 'sticky'].includes(cs.position) || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 20 || r.height < 14) continue;
    if (el.tagName === 'CANVAS') continue; if (el.classList.contains('mapboxgl-map') || el.classList.contains('mapboxgl-canvas-container')) continue;
    if (r.width >= innerWidth - 2 && r.height >= innerHeight - 2) continue; // full-screen wrappers
    const txt = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    res.push({ tag: el.tagName, z: cs.zIndex, pos: cs.position, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, txt });
  }
  return { viewport: [innerWidth, innerHeight], canvas: cr ? [Math.round(cr.x), Math.round(cr.y), Math.round(cr.width), Math.round(cr.height)] : null, rects: res };
});
try {
  await boot(S, srv.url, { layout: vp === 'phone' ? 'mobile' : 'desktop' }); await sleep(2500);
  out.states['idle-tick1'] = await rects();
  if (vp === 'desktop') {
    await setTick(P, 421); await sleep(300); await clickSpeed(P, '8x'); await playPause(P); await sleep(2000); await playPause(P); await sleep(500);
    await clickSpeed(P, '1x');
    await setTick(P, 556); await sleep(900); out.states['paused-tick556-vignette-and-event'] = await rects();
    // toasts while playing 1x over the commander events of tick 548-556 (approx_tick 550-552, 556)
    await setTick(P, 548); await sleep(300); await playPause(P);
    let best = null;
    for (let i = 0; i < 8; i++) { await sleep(500); const r = await rects(); const n = r.rects.filter((x) => /Command change|wounded|KIA|captured/i.test(x.txt)).length; if (!best || n > best.n) best = { n, r }; }
    await playPause(P); out.states['playing-1x-tick548-556-max-toasts'] = best ? best.r : null;
    // selected unit panel: click a tile in view at z15
    await camera(P, { center: [-77.2455, 39.822], zoom: 15 }); await sleep(2300); await setTick(P, 150); await sleep(600);
    const fr = await P.evaluate(() => null);
    await P.mouse.click(520, 48 + 180); await sleep(800); // a point near the middle-left of the view; selects the nearest unit
    out.states['unit-selected-tick150-z15'] = await rects();
  }
  if (vp === 'phone') {
    await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^play$/i.test(x.getAttribute('aria-label') || '') || /play/i.test(x.title || '')); });
    await setTick(P, 556); await sleep(1200); out.states['paused-tick556-event'] = await rects();
    await setTick(P, 551); await sleep(1200); out.states['paused-tick551-event'] = await rects();
  }
  wj(`${WORK}/popups-${which}-${vp}.json`, out); console.log('tiles used', tileBudget.used, Object.keys(out.states));
} finally { await S.close(); await srv.close(); }
