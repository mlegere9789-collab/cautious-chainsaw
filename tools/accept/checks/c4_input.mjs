// Check 4: input matrix on the desktop shell (1440x900, mouse + keyboard) and the phone shell (390x844, touch).
//  A. every control found in the accessibility tree of every route is activated (click / tap / Enter / Space / type / arrow as its role allows) with
//     response latency (input -> first DOM change -> next paint, Event Timing duration), long tasks > 50 ms in the interaction window, no-response detection
//     (DOM mutation, focus, scroll, URL, else a pixel comparison), unnamed controls, uncaught errors during the interaction.
//  B. keyboard: Tab order through every route, unreachable controls, covered/off-screen focus, focus visibility (outline, shadow, or pixels).
//  C. map gestures on the app (wheel, drag, ctrl+wheel pinch, right-drag, double-click, keys / swipe, pinch, double-tap) with latency to movestart and frame times.
//  D. preferences: dark / light colour scheme (axe contrast) and prefers-reduced-motion (no running infinite animation) on every route.
import fs from 'node:fs';
import path from 'node:path';
import { Check, REPO, sleep, round, percentile } from '../lib/util.mjs';
import { settle, watchPage, watchDefects } from '../lib/browser.mjs';
import { INIT_SCRIPT, enumerateControls, measure, doMode, centre, MODES_BY_ROLE, tabWalk, summarizeFrames, isTabbed } from '../lib/interact.mjs';

const AXE = path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js');
const SHELLS = [
  { name: 'desktop', vp: { width: 1440, height: 900, dpr: 1, mobile: false }, modes: 'desktop' },
  { name: 'phone', vp: { width: 390, height: 844, dpr: 2, mobile: true }, modes: 'phone' },
];

export async function run(ctx) {
  const c = new Check('4', 'Input matrix');
  c.notRunParts = [];
  const lib = ctx.lib; const IC = ctx.thresholds.interaction; const FR = ctx.thresholds.frames;
  const scope = ctx.args['input-scope'] || 'all';
  const app = ctx.routes.find((r) => r.app);
  const routes = scope === 'app' ? [app] : ctx.routes.filter((r) => r.path !== '/404' || scope === 'all');
  const origin = ctx.cand.url;
  const summary = { desktop: {}, phone: {} };
  const rows = [];
  const parts = String(ctx.args['input-parts'] || 'sweep,keyboard,map,prefs').split(',');
  for (const p of ['sweep', 'keyboard', 'map', 'prefs']) if (!parts.includes(p)) c.notRunParts.push(`part "${p}" skipped by --input-parts (development switch: a pass with a skipped part is never clean)`);
  const budgetMs = Number(ctx.args['input-page-budget-min'] || 10) * 60000;

  const prepare = async (session, shell, route, { state } = {}) => {
    const page = await session.newPage();
    const w = watchPage(page, lib, { expectStatus: route.expectStatus ? { [route.url]: route.expectStatus } : {}, getTileMode: () => 'inject', capped: () => session.tileStats.capBlocked > 0, ignoreAborted: true });
    await page.addInitScript(INIT_SCRIPT);
    await lib.emulateViewport(page, shell.vp);
    page.on('dialog', async (d) => { c.note('native-dialog', route.path, `${d.type()} dialog "${d.message().slice(0, 80)}" auto-dismissed`); await d.dismiss().catch(() => {}); });
    const popups = [];
    page.on('popup', (p) => { popups.push(p.url()); p.close().catch(() => {}); });
    await page.goto(origin + route.url, { waitUntil: 'load', timeout: 45000 });
    if (route.app) { await lib.waitForApp(page, 45000); await settle(page, 3000); if (shell.name === 'desktop' && state !== 'first-visit') await lib.chooseLayout(page, 'desktop').catch(() => {}); }
    else await settle(page, 1200);
    return { page, w, popups };
  };

  // ============================================================ A: control sweeps
  const sweep = async (session, shell, route, label, linkSeen) => {
    const where0 = `${shell.name} ${label}`;
    if (route.hasMapbox || route.app) { if (lib.tileBudget.used > lib.tileBudget.cap - 80) { c.notRunParts.push(`${where0}: tile budget spent (${lib.tileBudget.used}/${lib.tileBudget.cap}); raise --tile-cap`); return; } }
    let ctxp;
    try { ctxp = await prepare(session, shell, route, { state: label.includes('first-visit') ? 'first-visit' : 'main' }); }
    catch (e) { c.defect('page-did-not-load', where0, e.message); return; }
    const { page, w, popups } = ctxp; const startUrl = page.url(); const t0 = Date.now();
    let controls = await enumerateControls(page, lib);
    const inv = { total: controls.length, hidden: controls.filter((x) => !x.visible).length, disabled: controls.filter((x) => x.disabled).length, unnamed: controls.filter((x) => x.nameMissing).length };
    summary[shell.name][label] = { ...inv, activations: 0 };
    // first-visit onboarding: the modal is not role=dialog, so its controls are the ones that are really hit at their centre; the rest sit behind it. Every modal control needs a FRESH page (activating one dismisses the modal).
    const isModalFlow = label.includes('first-visit'); const modalSet = new Set();
    if (isModalFlow) { for (const x of controls) { if (!x.visible) continue; try { const p = await centre(page, lib, x); if (p.hit && p.inView) modalSet.add(x.key); } catch { /* gone */ } } c.note('first-visit-modal-controls', where0, `${modalSet.size} controls are on top (the onboarding card); the other ${controls.length - modalSet.size} are behind it and are exercised in the main state`); }
    const freshModal = async () => { await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* blocked */ } }).catch(() => {}); await page.reload({ waitUntil: 'load' }); await lib.waitForApp(page, 45000); await settle(page, 2500); };
    // the app keeps UI state (hidden menus, open panels, toggles) that later controls depend on: every control of the app gets a fresh load
    const freshApp = async () => { await page.reload({ waitUntil: 'load' }); if (route.app) { await lib.waitForApp(page, 45000); await settle(page, 2500); if (shell.name === 'desktop') await lib.chooseLayout(page, 'desktop').catch(() => {}); } else await settle(page, 900); };
    let firstControlDone = false;
    for (const x of controls.filter((y) => y.nameMissing && y.visible)) c.defect('control-without-accessible-name', `${where0}`, `${x.role} <${x.tag}${x.id ? '#' + x.id : ''}> has no accessible name in the accessibility tree (text: "${x.text}")`);
    const recover = async () => {
      await page.keyboard.press('Escape').catch(() => {});
      const now = page.url();
      if (now !== startUrl) {
        const strip = (u) => u.split('#')[0];
        if (strip(now) !== strip(startUrl)) { await page.goBack({ waitUntil: 'commit', timeout: 20000 }).catch(() => {}); await sleep(500); if (strip(page.url()) !== strip(startUrl)) await page.goto(startUrl, { waitUntil: 'load' }).catch(() => {}); if (route.app) { await lib.waitForApp(page, 45000).catch(() => {}); await settle(page, 2500); } else await settle(page, 600); return true; }
        else await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      }
      return false;
    };
    for (let i = 0; i < controls.length; i++) {
      if (Date.now() - t0 > budgetMs) { c.notRunParts.push(`${where0}: per-page time budget (${budgetMs / 60000} min) hit after ${i} of ${controls.length} controls; the rest were NOT activated`); break; }
      let ctl = controls[i];
      const where = `${where0} :: ${ctl.role} "${ctl.name || ctl.text || ctl.id}"`;
      if (!ctl.visible) continue;
      if (ctl.disabled) { c.note('disabled-control-skipped', where0, `${ctl.role} "${ctl.name}"`); continue; }
      if (ctl.inert) continue;
      let modesAll = MODES_BY_ROLE[shell.modes][ctl.role] || ['click'];
      if (ctl.role === 'link' && /^skip to/i.test(ctl.name || ctl.text)) { modesAll = modesAll.filter((m) => m === 'enter'); c.note('skip-link-keyboard-only', where, 'skip links are off-screen until focused; activated with Enter only'); }
      const modalOpen = await page.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog],[aria-modal=true],dialog[open]')].find((x) => { const r = x.getBoundingClientRect(); const cs = getComputedStyle(x); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }); return !!d; }).catch(() => false);
      if (isModalFlow && !modalSet.has(ctl.key)) continue;
      if (isModalFlow) modesAll = [...new Set([modesAll[0], 'enter'])].filter((m) => modesAll.includes(m));
      if (modalOpen && !ctl.inDialog) { c.note('control-behind-modal', where, 'a modal dialog is open: this control is covered by it and is not part of the modal; it is exercised in the main state'); continue; }
      if (ctl.role === 'link') {
        const href = ctl.href || '';
        let ext = false; try { const u = new URL(href, origin + new URL(page.url()).pathname); ext = u.origin !== origin; } catch { /* odd */ }
        if (/^(mailto|tel|sms|javascript):/i.test(href) || ctl.download || /\.pdf($|\?)/i.test(href)) { c.note('link-not-activated', where, `${href} (download/mailto/pdf: reachability is proven by the crawl in check 2)`); continue; }
        if (ext) { c.note('external-link-not-activated', where, `${href} (offline run)`); continue; }
        if (!href.startsWith('#')) { const key = (href === '/' || href === '/index.html') ? `${href}|app` : `${href}|${ctl.name}`; if (linkSeen.has(key)) continue; linkSeen.add(key); }
      }
      if (route.app && !isModalFlow) { if (firstControlDone) { try { await freshApp(); const again = (await enumerateControls(page, lib)).find((x) => x.key === ctl.key); if (again) { ctl = again; controls[i] = again; } } catch (e) { c.notRunParts.push(`${where}: fresh reload failed ${e.message.slice(0, 100)}`); break; } } firstControlDone = true; }
      let modeIdx = -1;
      for (const mode of modesAll) {
        modeIdx++;
        const row = { shell: shell.name, page: label, control: `${ctl.role}:${ctl.name || ctl.text}`, mode };
        try {
          if (isModalFlow) { await freshModal(); const again = (await enumerateControls(page, lib)).find((x) => x.key === ctl.key); if (!again) { c.defect('onboarding-control-missing-after-reload', where, 'control not found again after a fresh load'); break; } ctl = again; controls[i] = again; }
          // control still in the DOM? else find it again by key
          try { await centre(page, lib, ctl); } catch { const again = (await enumerateControls(page, lib)).find((x) => x.key === ctl.key); if (!again) { c.note('control-vanished', where, 'the control is gone after an earlier activation (state change); not activated in mode ' + mode); break; } ctl = again; controls[i] = again; }
          if (modeIdx > 0) { const pc = await centre(page, lib, ctl); if (!pc.shown) { c.note('control-gone-after-activation', where, `the control is no longer shown after ${modesAll[modeIdx - 1]} (a dismiss/close control or a state change); ${mode} not applicable`); break; } }
          const tt = Date.now();
          let m = await measure(page, () => doMode(page, lib, ctl, mode), { window: mode.includes('type') ? 350 : 450 });
          // an earlier activation may have left a menu/panel open on top of this control: one fresh load, then judge it for real
          if (m.error && /not hittable|not focusable/.test(m.error) && !isModalFlow) { await freshApp(); const again = (await enumerateControls(page, lib)).find((x) => x.key === ctl.key); if (again) { ctl = again; controls[i] = again; m = await measure(page, () => doMode(page, lib, ctl, mode), { window: mode.includes('type') ? 350 : 450 }); } }
          if (ctx.args.trace) console.log(`      [trace] ${where} ${mode}: wall ${Date.now() - tt} ms, latency ${m.latencyMs}, responded ${m.responded}`);
          Object.assign(row, { latencyMs: m.latencyMs, eventMs: m.eventMs, longTasks: m.longTasks, responded: m.responded, pixelOnly: m.pixelOnly, urlChanged: m.urlChanged, clicks: m.clicks, navFcpMs: m.navFcpMs });
          summary[shell.name][label].activations++;
          if (m.error && !/not hittable/.test(m.error)) c.defect('activation-error', where, `${mode}: ${m.error}`);
          else if (m.error) c.defect('control-not-hittable', where, `${mode}: ${m.error}`);
          if (!m.error) {
            if (m.navigated) { if (m.navFcpMs != null && m.navFcpMs > IC.navigationFirstPaintMs) c.defect('slow-navigation', where, `${mode}: new page reached first contentful paint ${m.navFcpMs} ms after the input (limit ${IC.navigationFirstPaintMs} ms)`); }
            else if (!m.responded) {
              const got = (m.clicks || 0) > 0 || ctl.role === 'textbox' || ctl.role === 'searchbox' || ctl.role === 'spinbutton' || ctl.role === 'slider' || ctl.role === 'combobox';
              const earlier = rows.some((x) => x.shell === row.shell && x.page === row.page && x.control === row.control && x.responded);
              if (!got) c.defect('activation-not-received', where, `${mode}: the page received no click from this ${mode.includes('enter') || mode.includes('space') ? 'key press' : 'pointer action'} and nothing changed`);
              else if (earlier) c.note('repeat-activation-no-change', where, `${mode}: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)`);
              else c.defect('no-visible-response', where, `${mode}: the control received the activation but no DOM change, focus change, scroll, navigation or pixel change followed within 450 ms`);
            }
            if (m.latencyMs != null && m.latencyMs > IC.visibleResponseMs && !m.urlChanged) c.defect('slow-response', where, `${mode}: ${m.latencyMs} ms from input to visible change (limit ${IC.visibleResponseMs} ms; dom ${round(m.domMs, 1)}, paint ${round(m.paintMs, 1)}, event timing ${m.eventMs})`);
            if (m.longTasks && m.longTasks.some((d) => d > IC.longTaskMs)) c.defect('long-task-during-interaction', where, `${mode}: long task(s) ${JSON.stringify(m.longTasks)} ms (limit ${IC.longTaskMs} ms)${m.loaf && m.loaf.length ? ' ; animation frames: ' + JSON.stringify(m.loaf) : ''}`);
          }
          rows.push(row);
          if (m.urlChanged) { await recover(); controls = await enumerateControls(page, lib); const again = controls.find((x) => x.key === ctl.key); if (again) { ctl = again; controls[i] = again; } else break; }
          else await page.keyboard.press('Escape').catch(() => {});
        } catch (e) { c.notRunParts.push(`${where} ${mode}: harness error ${String(e.message).slice(0, 160)}`); try { await recover(); } catch { /* keep going */ } break; }
      }
    }
    for (const u of popups) c.note('popup-opened', where0, u);
    for (const d of watchDefects(w)) c.defect(`input-${d.code}`, where0, d.detail);
    await page.close().catch(() => {});
  };

  // ============================================================ B: keyboard
  const keyboard = async (session, shell, route) => {
    const where0 = `${shell.name} ${route.path}`;
    if ((route.hasMapbox || route.app) && lib.tileBudget.used > lib.tileBudget.cap - 80) { c.notRunParts.push(`${where0}: keyboard walk skipped, tile budget spent`); return; }
    let cp; try { cp = await prepare(session, shell, route, { state: 'main' }); } catch (e) { c.defect('page-did-not-load', where0, e.message); return; }
    const { page } = cp;
    const controls = (await enumerateControls(page, lib)).filter((x) => x.visible && !x.disabled && !x.inert);
    const expected = controls.filter((x) => x.focusable && x.tabindex !== '-1');
    const { stops, cycled } = await tabWalk(page, lib, { max: Math.min(400, expected.length * 2 + 40) });
    const real = stops.filter((s) => !s.body);
    for (const s of real) {
      if (!s.visibleFocus) c.defect('focus-not-visible', where0, `${s.path} "${s.text}" shows no outline, shadow or pixel change when focused`);
      if (s.covered) c.defect('focused-control-covered', where0, `${s.path} "${s.text}" has keyboard focus but is covered by ${s.coveredBy}`);
      if (s.offscreen) c.defect('focused-control-offscreen', where0, `${s.path} "${s.text}" has keyboard focus but is outside the viewport / zero size`);
      if (s.tabindex && Number(s.tabindex) > 0) c.defect('positive-tabindex', where0, `${s.path} tabindex=${s.tabindex} (breaks natural order)`);
    }
    const unreached = [];
    for (const x of expected) { const tabbed = await isTabbed(page, lib, x); if (!tabbed) unreached.push(x); }
    for (const x of unreached.slice(0, 15)) c.defect('unreachable-by-keyboard', where0, `${x.role} "${x.name || x.text}" is focusable but Tab never reached it in ${stops.length} presses`);
    if (!cycled && !stops.some((s) => s.body) && real.length >= expected.length * 2 + 40 - 1) c.defect('tab-sequence-does-not-end', where0, `Tab did not return to the start within ${stops.length} presses (focus trap or endless list?)`);
    (c.raw.tab ||= []).push({ where: where0, expected: expected.length, stops: real.length, cycled, unreached: unreached.length, first: real.slice(0, 3).map((s) => s.path) });
    await page.close().catch(() => {});
  };

  // ============================================================ run A and B per shell
  for (const shell of SHELLS) {
    const linkSeen = new Set();
    const sFirst = await ctx.sessions.create({ profile: `in-${shell.name}-first`, tiles: 'inject', onboarded: false });
    c.metrics.chrome = sFirst.chromeVersion;
    try { if (app && parts.includes('sweep')) await sweep(sFirst, shell, { ...app }, 'app first-visit (onboarding)', linkSeen); } finally { await sFirst.close(); }
    const sMain = await ctx.sessions.create({ profile: `in-${shell.name}`, tiles: 'inject', onboarded: true });
    try {
      if (parts.includes('sweep')) for (const r of routes) await sweep(sMain, shell, r, r.app ? 'app main' : r.path, linkSeen);
      if (parts.includes('keyboard') && shell.name === 'desktop') for (const r of routes) await keyboard(sMain, shell, r);
    } finally { await sMain.close(); }
  }
  c.metrics.activations = summary;
  c.metrics.activationRows = rows.length;
  const lat = rows.map((r) => r.latencyMs).filter((x) => x != null).sort((a, b) => a - b);
  c.metrics.latency = lat.length ? { n: lat.length, p50: percentile(lat, 50), p95: percentile(lat, 95), max: lat[lat.length - 1], unmeasuredFastUnder16ms: rows.filter((r) => r.latencyMs == null).length } : null;
  c.raw.activationRows = rows;

  // ============================================================ C: map gestures
  if (app && parts.includes('map')) await mapGestures(ctx, c, app, prepare);

  // ============================================================ D: preferences
  if (parts.includes('prefs')) await preferences(ctx, c, routes);
  if (c.notRunParts.length) c.note('not-run-parts', '-', `${c.notRunParts.length} part(s) did not run: ${c.notRunParts.slice(0, 5).join(' || ')}`);
  return c.finish();
}

async function mapGestures(ctx, c, app, prepare) {
  const lib = ctx.lib; const FR = ctx.thresholds.frames; const IC = ctx.thresholds.interaction;
  const out = [];
  for (const shell of SHELLS) {
    if (lib.tileBudget.used > lib.tileBudget.cap - 100) { c.notRunParts.push(`map gestures ${shell.name}: tile budget spent`); continue; }
    const session = await ctx.sessions.create({ profile: `map-${shell.name}`, tiles: 'inject', onboarded: true });
    try {
      const { page, w } = await prepare(session, shell, app, { state: 'main' });
      let view = null;
      try { view = await lib.waitFor(async () => lib.mapView(page), { timeout: 40000, label: 'map instance' }); }
      catch (e) { c.notRunParts.push(`map gestures ${shell.name}: the Mapbox map instance could not be found/loaded on localhost (${e.message}); gestures NOT RUN`); await session.close(); continue; }
      const HOME = { center: [view.center[0], view.center[1]], zoom: Math.max(12, Math.min(view.zoom, 14)), bearing: 0, pitch: 0 };
      const canvasPoint = async () => {
        for (const [fx, fy] of [[0.5, 0.45], [0.45, 0.5], [0.55, 0.4], [0.4, 0.55], [0.6, 0.5]]) {
          const p = await page.evaluate(([fx, fy]) => { const m = window.__t0map; const cv = m.getCanvas().getBoundingClientRect(); const x = cv.left + cv.width * fx, y = cv.top + cv.height * fy; const el = document.elementFromPoint(x, y); return { x, y, tag: el ? el.tagName : null, cls: el ? String(el.className) : '' }; }, [fx, fy]);
          if (p.tag === 'CANVAS') return p;
        }
        return null;
      };
      const mid = await canvasPoint();
      if (!mid) { c.defect('map-canvas-obstructed', shell.name, 'no point on the map canvas is free of overlays (every probe hit a panel); gestures cannot reach the map'); await session.close(); continue; }
      const move = (dx, dy) => [mid.x + dx, mid.y + dy];
      const G = shell.name === 'desktop' ? [
        ['wheel zoom in', async () => { for (let i = 0; i < 4; i++) await lib.wheel(page, mid.x, mid.y, -240); }, (a, b) => b.zoom > a.zoom + 0.05],
        ['wheel zoom out', async () => { for (let i = 0; i < 4; i++) await lib.wheel(page, mid.x, mid.y, 240); }, (a, b) => b.zoom < a.zoom - 0.05],
        ['mouse drag pan', async () => lib.mouseDrag(page, [mid.x, mid.y], move(-180, -90)), (a, b) => Math.hypot(b.center[0] - a.center[0], b.center[1] - a.center[1]) > 1e-4],
        ['ctrl+wheel (trackpad pinch)', async () => { await page.keyboard.down('Control'); for (let i = 0; i < 3; i++) await lib.wheel(page, mid.x, mid.y, -60); await page.keyboard.up('Control'); }, (a, b) => b.zoom > a.zoom + 0.02],
        ['right-button drag rotate/tilt', async () => { await page.mouse.move(mid.x, mid.y); await page.mouse.down({ button: 'right' }); await page.mouse.move(mid.x + 120, mid.y - 60, { steps: 10 }); await page.mouse.up({ button: 'right' }); }, (a, b) => Math.abs(b.bearing - a.bearing) > 1 || Math.abs(b.pitch - a.pitch) > 1],
        ['double-click zoom', async () => { await page.mouse.dblclick(mid.x, mid.y); }, (a, b) => b.zoom > a.zoom + 0.3],
        ['keyboard: Tab to the map, ArrowRight pans, = zooms', async () => { let ok = false; for (let i = 0; i < 90; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => /mapboxgl-canvas/.test(String(document.activeElement && document.activeElement.className)))) { ok = true; break; } } if (!ok) throw new Error('Tab never reached the map canvas in 90 presses'); await page.keyboard.press('ArrowRight'); await sleep(500); await page.keyboard.press('Equal'); }, (a, b) => Math.abs(b.center[0] - a.center[0]) > 1e-5 && b.zoom > a.zoom + 0.05],
      ] : [
        ['one-finger swipe pan', async () => lib.touchSwipe(page, [mid.x, mid.y], move(-120, -60), { steps: 12 }), (a, b) => Math.hypot(b.center[0] - a.center[0], b.center[1] - a.center[1]) > 1e-4],
        ['two-finger pinch out (zoom in)', async () => lib.touchPinch(page, [mid.x, mid.y], 60, 220, { steps: 12 }), (a, b) => b.zoom > a.zoom + 0.1],
        ['two-finger pinch in (zoom out)', async () => lib.touchPinch(page, [mid.x, mid.y], 240, 80, { steps: 12 }), (a, b) => b.zoom < a.zoom - 0.1],
        ['double-tap zoom', async () => { await lib.touchTap(page, mid.x, mid.y, 30); await sleep(60); await lib.touchTap(page, mid.x, mid.y, 30); }, (a, b) => b.zoom > a.zoom + 0.2],
      ];
      for (const [name, act, ok] of G) {
        await page.evaluate((h) => { window.__t0map.jumpTo(h); }, HOME); await sleep(900);
        const a = await lib.mapView(page);
        await page.evaluate(() => { window.__accMove = null; window.__t0map.once('movestart', () => { window.__accMove = performance.now(); }); window.__acc.startFrames(); });
        const m = await measure(page, act, { window: 1100, wantPixelFallback: false });
        const frames = await page.evaluate(() => window.__acc.stopFrames());
        const mv = await page.evaluate(() => window.__accMove);
        const b = await lib.mapView(page);
        // Reference of the latency = the input event that the map reacted to.  For a click, key or wheel that is the last input event before the map moved (unchanged).  For a drag or a pinch the
        // most recent input event before the map moved is the PRESS (touchstart / mousedown), but the map reacts to the MOVEMENT that follows it, and the time between the press and that movement is
        // the injection of the gesture, not the page.  So when the last input before movestart is a press, the reference is the arrival at the page's handler of the last movement event before
        // movestart (the one that started the gesture).  What this leaves out is the delivery of that event from the browser to the page: measured on the phone shell (tmp/ra/probe-touch.mjs: event
        // time stamp -> handler 25-50 ms, steady for every touchmove, with the main thread idle: requestAnimationFrame gaps 17 ms throughout, movestart 1-3 ms after the handler ran; the delivery is
        // the frame-aligned input pipeline plus the CDP injection, the same on the published build and on every release).  A page that blocks the main thread is still caught: by the long-task rule
        // (map-gesture-long-task, 50 ms) and by the frame-time rule that follow.  The limit (100 ms), the movestart event and the clock are unchanged.  Both older figures stay in the row:
        // moveLatencyFromPressMs (from the press) and moveLatencyFromMoveStampMs (from the browser's time stamp of the first movement).
        const refs = await page.evaluate(() => {
          const s = window.__acc; const mv = window.__accMove; const ev = s.inputTs.filter((x) => mv == null || x.t <= mv);
          const last = ev.length ? ev[ev.length - 1] : (s.inputTs[0] || {});
          let ref = last.t; let moveStamp = null;
          if (/^(touchstart|pointerdown|mousedown)$/.test(last.type || '')) {
            const after = (s.moveTs || []).filter((x) => x.t >= last.t && (mv == null || x.a <= mv));
            if (after.length) { ref = after[after.length - 1].a; moveStamp = after[0].t; }
          }
          return { ref, press: last.t, moveStamp, pressType: last.type || null };
        });
        const inputT = refs.ref;
        const lat = mv != null && inputT != null ? round(mv - inputT, 1) : null;
        const latFromPress = mv != null && refs.press != null ? round(mv - refs.press, 1) : null;
        const latFromStamp = mv != null && refs.moveStamp != null ? round(mv - refs.moveStamp, 1) : null;
        const fs_ = summarizeFrames(frames);
        const row = { shell: shell.name, gesture: name, before: a, after: b, moveLatencyMs: lat, moveLatencyFromPressMs: latFromPress, moveLatencyFromMoveStampMs: latFromStamp, longTasks: m.longTasks, frames: fs_ };
        out.push(row);
        const where = `${shell.name} map ${name}`;
        if (!ok(a, b)) c.defect('map-gesture-no-effect', where, `camera did not change as expected: ${JSON.stringify({ zoom: [round(a.zoom, 2), round(b.zoom, 2)], center: [a.center.map((x) => round(x, 4)), b.center.map((x) => round(x, 4))], bearing: [round(a.bearing, 1), round(b.bearing, 1)], pitch: [round(a.pitch, 1), round(b.pitch, 1)] })}`);
        if (lat != null && lat > IC.visibleResponseMs) c.defect('map-gesture-slow-start', where, `${lat} ms from input to the map starting to move (limit ${IC.visibleResponseMs} ms)`);
        if (m.longTasks && m.longTasks.some((d) => d > IC.longTaskMs)) c.defect('map-gesture-long-task', where, `long task(s) ${JSON.stringify(m.longTasks)} ms during the gesture (limit ${IC.longTaskMs} ms)`);
        const limit = shell.name === 'desktop' ? FR.p95FrameMsDesktop : FR.p95FrameMsPhone;
        if (fs_ && fs_.p95 > limit) c.defect('map-gesture-frame-time', where, `p95 frame ${fs_.p95} ms > ${limit} ms (p50 ${fs_.p50}, p99 ${fs_.p99}, max ${fs_.max}, ${fs_.n} frames)`);
      }
      for (const d of watchDefects(w)) c.defect(`map-input-${d.code}`, shell.name, d.detail);
      const renderer = await page.evaluate(() => { try { const cv = document.createElement('canvas'); const gl = cv.getContext('webgl'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch (e) { return 'unknown'; } });
      c.metrics.webglRenderer = renderer;
    } catch (e) { c.notRunParts.push(`map gestures ${shell.name}: harness error ${e.message}`); }
    finally { await session.close(); }
  }
  c.raw.mapGestures = out;
  c.metrics.mapGestures = out.length;
}

async function preferences(ctx, c, routes) {
  const lib = ctx.lib;
  const combos = [['dark', 'no-preference'], ['light', 'no-preference'], ['light', 'reduce']];
  const res = [];
  for (const needMap of [false, true]) {
    const set = routes.filter((r) => !!(r.hasMapbox || r.app) === needMap);
    if (!set.length) continue;
    const session = await ctx.sessions.create({ profile: `pref-${needMap ? 'map' : 'plain'}`, tiles: needMap ? 'inject' : 'block', onboarded: true });
    try {
      for (const r of set) for (const [scheme, motion] of combos) {
        if (needMap && lib.tileBudget.used > lib.tileBudget.cap - 60) { c.notRunParts.push(`preferences ${r.path} ${scheme}/${motion}: tile budget spent`); continue; }
        const where = `${r.path} [${scheme}, motion=${motion}]`;
        const page = await session.newPage();
        const w = watchPage(page, lib, { expectStatus: r.expectStatus ? { [r.url]: r.expectStatus } : {}, getTileMode: () => (needMap ? 'inject' : 'block'), capped: () => session.tileStats.capBlocked > 0 });
        try {
          await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
          await lib.emulateViewport(page, { width: 1440, height: 900, dpr: 1, mobile: false });
          await page.goto(ctx.cand.url + r.url, { waitUntil: 'load', timeout: 45000 });
          if (r.app) await lib.waitForApp(page, 45000);
          await settle(page, needMap ? 3500 : 1200);
          await page.addScriptTag({ path: AXE });
          const x = await page.evaluate(async () => {
            const a = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
            const anims = document.getAnimations().filter((an) => an.playState === 'running').map((an) => { const t = an.effect && an.effect.getComputedTiming ? an.effect.getComputedTiming() : {}; return { name: an.animationName || an.transitionProperty || an.constructor.name, infinite: t.iterations === Infinity, el: an.effect && an.effect.target ? an.effect.target.tagName.toLowerCase() + (an.effect.target.id ? '#' + an.effect.target.id : '') : '?' }; });
            const de = document.documentElement;
            return { contrast: a.violations.map((v) => ({ count: v.nodes.length, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')) })), anims, overflow: de.scrollWidth > de.clientWidth + 1, hasReduceRule: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.media && /prefers-reduced-motion/.test(r.media.mediaText)); } catch { return false; } }) };
          });
          for (const v of x.contrast) c.defect('contrast-in-scheme', where, `${v.count} node(s) fail colour contrast: ${v.nodes.join(' | ').slice(0, 300)}`);
          if (x.overflow) c.defect('horizontal-overflow-in-scheme', where, 'page scrolls horizontally');
          if (motion === 'reduce') {
            const inf = x.anims.filter((a) => a.infinite);
            if (inf.length) c.defect('animation-runs-under-reduced-motion', where, `${inf.length} infinite CSS animation(s) still running: ${inf.slice(0, 4).map((a) => `${a.name}@${a.el}`).join(', ')}`);
          }
          for (const d of watchDefects(w)) c.defect(`pref-${d.code}`, where, d.detail);
          res.push({ route: r.path, scheme, motion, contrast: x.contrast.length, runningAnimations: x.anims.length, hasReduceRule: x.hasReduceRule });
        } catch (e) { c.notRunParts.push(`preferences ${where}: ${String(e.message).slice(0, 160)}`); }
        await page.close().catch(() => {});
      }
    } finally { await session.close(); }
  }
  c.raw.preferences = res;
  c.metrics.preferencePages = res.length;
}
