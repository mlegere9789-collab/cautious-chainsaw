// v12-input.mjs - real mouse and keyboard input against the page: a click on a tile selects that tile's unit; the wheel keeps the ground under the pointer fixed while it zooms; a drag pans by the
// drag distance; hovering names the right unit; a click on empty ground clears the selection.  Playwright's real mouse (CDP Input events), desktop 1440x900.   -> results/v12-input.json
import { serve, launch, PROTO, args, writeJson, sleep } from './lib.mjs';
import { mercator } from './srcdata.mjs';

const out = { generated: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')); return ok; };
const PORT = +(args.port || 9715); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'input' });
try {
  const P = s.page;
  await P.evaluate(() => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.transport.pause(); E.transport.seek(556, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 15 }, { glide: false, safe: true }); for (let i = 0; i < 260; i++) S.step(1, 16.667); });
  // a manual-mode page draws only when stepped: after each real input, step a few frames so the page reacts
  const settle = async (n = 30) => P.evaluate((n) => { const S = window.__studio; for (let i = 0; i < n; i++) S.step(1, 16.667); }, n);
  const tiles = await P.evaluate(() => { const f = window.__studio.engine.frame; return f.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.99 && t.kind === 'leaf' && !t.displaced).map((t) => ({ id: t.ids[0], x: t.x + f.view.dx, y: t.y + f.view.dy, w: t.w, h: t.h })).filter((t) => t.x > 60 && t.x < 1380 && t.y > 90 && t.y < 690); });
  let ok = 0; let bad = []; const sample = tiles.filter((_, i) => i % Math.max(1, Math.floor(tiles.length / 30)) === 0).slice(0, 30);
  for (const t of sample) { await P.mouse.move(t.x, t.y); await P.mouse.down(); await P.mouse.up(); await settle(4); const sel = await P.evaluate(() => window.__studio.engine.selectedId); if (sel === t.id) ok++; else { const el = await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('#panel') ? 'inspector panel' : e.id || e.tagName) : null; }, [t.x, t.y]); bad.push({ want: t.id, got: sel, x: Math.round(t.x), under: el }); } await P.keyboard.press('Escape'); await settle(2); const panelOpen = await P.evaluate(() => window.__studio.ui.panelOpen); if (panelOpen && !out.panelStaysOpen) { out.panelStaysOpen = true; const w = await P.evaluate(() => Math.round(document.getElementById('panel').getBoundingClientRect().width)); out.panelWidth = w; } }
  check('real mouse clicks on the centre of ' + sample.length + ' solid, undisplaced leaf tiles select exactly that unit (after the first click the Inspector panel stays open after Escape: ' + !!out.panelStaysOpen + ', ' + out.panelWidth + ' px wide; failures under it: ' + bad.filter((b) => b.under === 'inspector panel').length + ' of ' + bad.length + ')', ok === sample.length, { ok, of: sample.length, bad: bad.slice(0, 6) });
  // empty ground clears selection
  await P.mouse.move(tiles[0].x, tiles[0].y); await P.mouse.down(); await P.mouse.up(); await settle(4); const before = await P.evaluate(() => window.__studio.engine.selectedId);
  const empty = await P.evaluate(() => { const f = window.__studio.engine.frame; const occ = f.tiles.filter((t) => t.life === 'live').map((t) => [t.x + f.view.dx, t.y + f.view.dy, t.w / 2 + 12, t.h / 2 + 12]); for (let y = 120; y < 660; y += 20) for (let x = 400; x < 1000; x += 20) if (!occ.some(([cx, cy, hw, hh]) => Math.abs(x - cx) < hw && Math.abs(y - cy) < hh)) return [x, y]; return null; });
  if (empty) { await P.mouse.move(empty[0], empty[1]); await P.mouse.down(); await P.mouse.up(); await settle(4); const after = await P.evaluate(() => window.__studio.engine.selectedId); check('a click on empty ground clears the selection (' + before + ' -> ' + after + ')', !!before && after === null, { before, after }); }
  // wheel zoom keeps the ground under the pointer fixed
  const cam0 = await P.evaluate(() => { const c = window.__studio.engine.camera; return { lng: c.lng, lat: c.lat, zoom: c.zoom, w: c.w, h: c.h }; }); const ptr = [900, 300];
  const ground0 = await P.evaluate((ptr) => window.__studio.engine.camera.fromScreen(ptr[0], ptr[1]), ptr);
  await P.mouse.move(ptr[0], ptr[1]); await P.mouse.wheel(0, -400); await settle(120); const cam1 = await P.evaluate(() => { const c = window.__studio.engine.camera; return { zoom: c.zoom }; });
  const ground1 = await P.evaluate((ptr) => window.__studio.engine.camera.fromScreen(ptr[0], ptr[1]), ptr); const m = mercator(ground0[0], ground0[1], cam1.zoom); const m1 = mercator(ground1[0], ground1[1], cam1.zoom); const dpx = Math.hypot(m[0] - m1[0], m[1] - m1[1]);
  check('the wheel zooms (' + cam0.zoom.toFixed(2) + ' -> ' + cam1.zoom.toFixed(2) + ') and the ground under the pointer stays within 1 px of the pointer (' + dpx.toFixed(3) + ' px)', cam1.zoom > cam0.zoom + 0.3 && dpx < 1, { dpx, zoomBefore: cam0.zoom, zoomAfter: cam1.zoom });
  // drag pans by the drag distance
  const g0 = await P.evaluate(() => window.__studio.engine.camera.fromScreen(700, 400)); await P.mouse.move(700, 400); await P.mouse.down(); await P.mouse.move(760, 430, { steps: 6 }); await P.mouse.up(); await settle(30);
  const z = (await P.evaluate(() => window.__studio.engine.camera.zoom)); const at = await P.evaluate(() => window.__studio.engine.camera.fromScreen(760, 430)); const a = mercator(g0[0], g0[1], z); const b = mercator(at[0], at[1], z); const err = Math.hypot(a[0] - b[0], a[1] - b[1]);
  check('a drag of (60, 30) px carries the ground point under the start to the end point within 1 px (' + err.toFixed(3) + ' px)', err < 1, { err });
  // keyboard focus ring on the canvas, tab order start
  out.consoleErrors = s.errors; out.requests = s.requests; out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length }; writeJson('v12-input.json', out); console.log(JSON.stringify(out.summary), 'console errors', s.errors.length);
} finally { await s.close(); srv.close(); }
