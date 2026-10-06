// v8-a11y.mjs - accessibility basics, measured: axe-core on the DOM in many states; WCAG contrast of the text painted on the canvas (the background under each string is sampled from the
// canvas at the moment the string is drawn); the keyboard path (real Tab / key presses); focus visibility; reduced motion; touch target sizes on the phone viewport; zoom and viewport meta.
//   node v8-a11y.mjs -> results/v8-a11y.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve, launch, PROTO, REPO, args, writeJson, sleep } from './lib.mjs';

const require = createRequire(import.meta.url); const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const out = { generated: new Date().toISOString(), axeVersion: require('axe-core/package.json').version, checks: [], axe: [], contrast: [], keyboard: {}, reduced: {}, targets: {} };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')); return ok; };
const PORT = +(args.port || 9709); const srv = await serve(PROTO, PORT);

// ---- WCAG helpers (written here) ----------------------------------------------------------------------------------------------------------
const parseCol = (s) => { if (!s) return null; let m = /^#([0-9a-f]{6})$/i.exec(s); if (m) return { c: [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)], a: 1 }; m = /^#([0-9a-f]{3})$/i.exec(s); if (m) return { c: [...m[1]].map((x) => parseInt(x + x, 16)), a: 1 }; m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/i.exec(s); if (m) { let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]; return { c: [+m[1], +m[2], +m[3]], a }; } return null; };
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const la = lum(a); const lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const pct = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1)))]; };

try {
  // ======== A. axe-core on the DOM, many states =========================================================================================
  const s = await launch({ port: PORT, query: 'manual=1', profile: 'a11y', fresh: true, witness: true });
  const P = s.page; await P.evaluate(() => { window.__rec.keep = false; window.__rec.install({ dom: [] }); });
  const runAxe = async (label) => P.evaluate(async ({ AXE, label }) => { if (!window.axe) { const e = document.createElement('script'); e.textContent = AXE; document.head.append(e); } const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations', 'incomplete'] }); return { label, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter((t) => /wcag\d|best/.test(t)), nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 140), why: (n.any[0] || n.all[0] || n.none[0] || {}).message })) })), incomplete: r.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })) }; }, { AXE, label });
  const step = async (n = 40) => P.evaluate((n) => { for (let i = 0; i < n; i++) window.__studio.step(1); }, n);
  const states = [];
  await step(); states.push(await runAxe('welcome card (first visit)'));
  await P.evaluate(() => { const S = window.__studio; S.narration.hide(); }); await step(10);
  states.push(await runAxe('war room, tick 551, popups'));
  for (const [id, label] of [['tune', 'Tune panel'], ['inspect', 'Inspect panel'], ['about', 'About panel']]) { await P.evaluate((id) => { const S = window.__studio; S.ui.panelOpen = false; S.ui.togglePanel(id); }, id); await step(10); states.push(await runAxe(label)); await P.evaluate(() => { window.__studio.ui.panelOpen = false; window.__studio.ui.renderChrome(); }); }
  await P.evaluate(() => window.__studio.ui.toggleMenu()); await step(5); states.push(await runAxe('Showcase menu open')); await P.keyboard.press('Escape');
  for (const [st, v] of [['field-manual', 'standard'], ['map-1863', 'contrast'], ['war-room', 'cvd']]) { await P.evaluate(([st, v]) => window.__studio.ui.chooseStyle(st, v), [st, v]); await step(20); states.push(await runAxe(`${st} / ${v}`)); }
  await P.evaluate(() => { const S = window.__studio; S.ui.chooseStyle('war-room', 'standard'); S.startTour('showcase'); for (let i = 0; i < 40; i++) S.step(1, 50); }); states.push(await runAxe('tour caption open')); await P.evaluate(() => window.__studio.director.stop('closed'));
  await P.evaluate(() => { const S = window.__studio; S.engine.transport.seek(28, { glide: false }); for (let i = 0; i < 30; i++) S.step(1); const k = [...S.host.cards.keys()].find((x) => x.startsWith('story-card')); if (k) { S.host.openRail(k); for (let i = 0; i < 30; i++) S.step(1); } }); states.push(await runAxe('story rail open (tick 28)'));
  out.axe = states;
  const tally = {}; for (const st of states) for (const v of st.violations) { const t = tally[v.id] || (tally[v.id] = { impact: v.impact, help: v.help, states: [], nodes: 0, sample: v.sample[0] }); t.states.push(st.label); t.nodes = Math.max(t.nodes, v.nodes); }
  out.axeTally = tally; console.log('axe violation rules across', states.length, 'states:', Object.entries(tally).map(([k, v]) => `${k}(${v.impact}) x${v.states.length} states, up to ${v.nodes} nodes`).join('; ') || 'none');
  const serious = Object.entries(tally).filter(([, v]) => v.impact === 'serious' || v.impact === 'critical');
  check('axe-core (WCAG 2.0/2.1/2.2 A and AA + best practice) finds no serious or critical violation in ' + states.length + ' states', serious.length === 0, serious.map(([k, v]) => ({ rule: k, impact: v.impact, nodes: v.nodes, states: v.states.length, sample: v.sample })));

  // ======== B. canvas text contrast ======================================================================================================
  await P.evaluate(() => { const S = window.__studio; if (S.director.running) S.director.stop('closed'); S.host.closeRail && S.host.closeRail(); S.host.dismissAll && S.host.dismissAll(); S.narration.hide && S.narration.hide(); S.ui.panelOpen = false; S.ui.renderChrome(); S.engine.tuning.set('compare.mode', 'after'); S.engine.tuning.set('popup.enabled', false); for (let i = 0; i < 30; i++) S.step(1, 50); });
  const skins = []; for (const st of ['war-room', 'field-manual', 'map-1863']) for (const v of ['standard', 'cvd', 'contrast']) skins.push([st, v]);
  const contrastRows = [];
  for (const [st, v] of skins) {
    const samples = [];
    for (const [tick, lat, lng, zoom] of [[556, 39.8117, -77.2347, 16.5], [346, 39.8189, -77.2262, 15.5]]) {
      const r = await P.evaluate(({ st, v, tick, lat, lng, zoom }) => { const S = window.__studio; const E = S.engine; const R = window.__rec; const W = window.__witness; S.ui.chooseStyle(st, v); E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat, lng, zoom }, { glide: false, safe: false });
        let still = 0; let last = -1; for (let n = 0; n < 300; n++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
        W.bgSamples.length = 0; W.sampleBg = true; R.full = false; W.begin(); R.od.call(S.renderer, R.lastFrame, R.lastOpts); W.end(); W.sampleBg = false; return { samples: W.bgSamples.slice(), theme: document.documentElement.dataset.theme }; }, { st, v, tick, lat, lng, zoom });
      for (const q of r.samples) samples.push({ ...q, theme: r.theme });
    }
    const rows = []; let unparsed = 0; const grouped = new Map();
    for (const q of samples) { const k = q.text + '|' + Math.round(q.box[0] / 3) + '|' + Math.round(q.box[1] / 3) + '|' + q.ep; const cur = grouped.get(k); const ratioOf = (z) => { const fc0 = parseCol(z.fill); if (!fc0) return -1; const a0 = fc0.a * z.alpha; const eff0 = fc0.c.map((x, i) => x * a0 + z.bg[i] * (1 - a0)); return ratio(eff0, z.bg); }; if (!cur || ratioOf(q) > ratioOf(cur)) grouped.set(k, q); }
    out.contrastGrouping = { passesDroppedAsDecorative: samples.length - grouped.size };
    for (const q of grouped.values()) { const fc = parseCol(q.fill); if (!fc) { unparsed++; continue; } const a = fc.a * q.alpha; const bg = q.bg; const eff = fc.c.map((x, i) => x * a + bg[i] * (1 - a)); const px = +((/(\d+(?:\.\d+)?)px/.exec(q.font) || [0, 11])[1]); const bold = /(^|\s)(bold|[6-9]00)\b/.test(q.font); const large = px >= 24 || (px >= 18.66 && bold); rows.push({ ratio: ratio(eff, bg), px, large, tile: q.ep !== 0, text: q.text.slice(0, 24), alpha: q.alpha }); }
    const tileRows = rows.filter((r) => r.tile); const need = (r) => (r.large ? 3 : 4.5);
    const sm = (arr) => ({ n: arr.length, p5: arr.length ? +pct(arr.map((r) => r.ratio), 0.05).toFixed(2) : null, median: arr.length ? +pct(arr.map((r) => r.ratio), 0.5).toFixed(2) : null, min: arr.length ? +Math.min(...arr.map((r) => r.ratio)).toFixed(2) : null, below45: arr.filter((r) => r.ratio < need(r)).length, below3: arr.filter((r) => r.ratio < 3).length });
    const row = { skin: st + '/' + v, theme: samples[0] && samples[0].theme, unparsedFill: unparsed, tileText: sm(tileRows), backdropText: sm(rows.filter((r) => !r.tile)), sizesPx: [...new Set(rows.map((r) => r.px))].sort(), worst: tileRows.sort((a, b) => a.ratio - b.ratio).slice(0, 3).map((r) => ({ text: r.text, ratio: +r.ratio.toFixed(2), px: r.px, alpha: +(r.alpha).toFixed(2) })), lowSamples: [...grouped.values()].filter((q) => { const fc1 = parseCol(q.fill); if (!fc1) return false; const a1 = fc1.a * q.alpha; const e1 = fc1.c.map((x, i) => x * a1 + q.bg[i] * (1 - a1)); return ratio(e1, q.bg) < 3; }).slice(0, 4).map((q) => ({ text: q.text.slice(0, 16), fill: q.fill, alpha: +q.alpha.toFixed(2), bg: q.bg.join(','), ep: q.ep, box: q.box.map(Math.round) })) };
    contrastRows.push(row); console.log('contrast', row.skin, JSON.stringify(row.tileText), 'backdrop', JSON.stringify(row.backdropText));
  }
  out.contrast = contrastRows;
  const failTile = contrastRows.filter((r) => r.tileText.below45 > 0); check('text painted on tiles reaches WCAG AA contrast (4.5:1 at 10-12 px) in all 9 skins (settled, full opacity): tile strings below 4.5:1 per skin: ' + contrastRows.map((r) => r.skin + '=' + r.tileText.below45 + '/' + r.tileText.n).join(' '), failTile.length === 0, failTile.map((r) => ({ skin: r.skin, below45: r.tileText.below45, of: r.tileText.n, min: r.tileText.min, worst: r.worst })));
  const failBd = contrastRows.filter((r) => r.backdropText.below45 > 0); check('place-name labels on the backdrop reach 4.5:1 in all 9 skins: ' + contrastRows.map((r) => r.skin + '=' + r.backdropText.below45 + '/' + r.backdropText.n).join(' '), failBd.length === 0, failBd.map((r) => ({ skin: r.skin, below45: r.backdropText.below45, of: r.backdropText.n, min: r.backdropText.min })));

  // ======== C. keyboard path =============================================================================================================
  await s.close();
  const k = await launch({ port: PORT, query: 'welcome=0', profile: 'a11yk', fresh: true });
  const K = k.page; await sleep(1500);
  const active = () => K.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), id: e.id, label: e.getAttribute('aria-label') || e.title || (e.textContent || '').trim().slice(0, 30) || e.type || '', role: e.getAttribute('role'), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow.slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), onScreen: r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight }; });
  const tabs = []; const seen = new Set();
  for (let i = 0; i < 90; i++) { await K.keyboard.press('Tab'); const a = await active(); if (!a) { tabs.push(null); continue; } const key = a.tag + '#' + a.id + '|' + a.label; if (seen.has(key) && i > 20) break; seen.add(key); tabs.push(a); }
  const stops = tabs.filter(Boolean); const noRing = stops.filter((a) => /^none/.test(a.outline) && (a.shadow === 'none' || !a.shadow));
  out.keyboard.tabStops = stops.length; out.keyboard.stops = stops.map((a) => `${a.tag}${a.id ? '#' + a.id : ''}:${a.label}`);
  check('Tab reaches the interface in a sensible number of stops (' + stops.length + ') and every stop has a visible focus indicator (outline or box-shadow); stops without one: ' + noRing.length, stops.length >= 12 && noRing.length === 0, { stopsWithoutIndicator: noRing.slice(0, 6).map((a) => `${a.tag}:${a.label}`), first: out.keyboard.stops.slice(0, 40) });
  const offscreen = stops.filter((a) => !a.onScreen); check('every Tab stop is on screen when focused', offscreen.length === 0, offscreen.slice(0, 5).map((a) => a.label));
  // the canvas: focusable? what does keyboard do there
  const canvasInfo = await K.evaluate(() => { const c = document.getElementById('map'); return { tabindex: c.getAttribute('tabindex'), role: c.getAttribute('role'), aria: c.getAttribute('aria-label') }; }); out.keyboard.canvas = canvasInfo;
  // the key claims in the UI text: ?, C, N, P, U, T, I, M, A, B, W, Space, arrows, [ ], Esc.  Each is operated for real.
  const KEYS = []; const T = (n, f) => KEYS.push([n, f]);
  const st = () => K.evaluate(() => { const S = window.__studio; const E = S.engine; return { tick: Math.round(E.transport.simTau), playing: E.transport.playing, speed: E.transport.speed, panel: S.ui.panelOpen ? S.ui.tab : null, compare: E.compare, rail: !!S.host.railOpen, sel: E.selectedId, metrics: E.tok('metrics.overlay'), tour: S.director.running, cards: S.host.cards.size, railId: S.host.rail && S.host.rail.id, menu: !!document.querySelector('.menu') }; });
  await K.evaluate(() => { document.getElementById('map').focus(); window.__studio.engine.transport.pause(); window.__studio.engine.transport.seek(28, { glide: false }); }); await sleep(600);
  const trace = []; const press = async (key, label) => { const b = await st(); await K.keyboard.press(key); await sleep(450); const a = await st(); trace.push({ key: label || key, before: b, after: a }); return [b, a]; };
  let [b, a] = await press('Space', 'Space'); check('Space toggles play', a.playing !== b.playing, { b: b.playing, a: a.playing }); await press('Space', 'Space again');
  [b, a] = await press('ArrowRight', 'ArrowRight'); check('ArrowRight steps one tick', a.tick === b.tick + 1, { b: b.tick, a: a.tick });
  [b, a] = await press('Shift+ArrowRight', 'Shift+ArrowRight'); check('Shift+ArrowRight steps 12 ticks (the UI says "one hour")', a.tick === b.tick + 12, { b: b.tick, a: a.tick });
  [b, a] = await press(']', ']'); check('] raises the speed', a.speed > b.speed, { b: b.speed, a: a.speed }); await press('[', '[');
  [b, a] = await press('t', 't'); check('T opens the Tuning Studio', a.panel === 'tune', a.panel); await press('t', 't');
  [b, a] = await press('i', 'i'); check('I opens the Inspector', a.panel === 'inspect', a.panel); await press('i', 'i');
  [b, a] = await press('a', 'a'); check('A opens About', a.panel === 'about', a.panel); await press('a', 'a');
  [b, a] = await press('m', 'm'); check('M toggles the metrics overlay', a.metrics !== b.metrics, { b: b.metrics, a: a.metrics }); await press('m', 'm');
  [b, a] = await press('b', 'b'); check('B toggles before / after', a.compare !== b.compare, { b: b.compare, a: a.compare }); await press('b', 'b');
  [b, a] = await press('u', 'u'); check('U selects a tile and opens its unit card (hint text: "press U")', !!a.sel && a.sel !== b.sel, { sel: a.sel, cards: a.cards });
  [b, a] = await press('Escape', 'Esc');
  [b, a] = await press('?', '?'); check('? opens the help in the reading rail (hint text: "press ? for all keys")', !!a.railId && /help/.test(a.railId), a.railId); await press('Escape', 'Esc');
  [b, a] = await press('c', 'c'); check('C opens the Chronicle list (hint text: "Press C")', !!a.railId && /chronicle/.test(a.railId), a.railId); await press('Escape', 'Esc');
  await K.evaluate(() => { window.__studio.engine.transport.seek(20, { glide: false }); }); await sleep(300);
  [b, a] = await press('n', 'n'); check('N goes to the next moment of the Chronicle (hint text: "N and P step between moments")', a.tick !== b.tick && a.tick > b.tick, { b: b.tick, a: a.tick });
  [b, a] = await press('p', 'p'); check('P goes to the previous moment', a.tick < b.tick, { b: b.tick, a: a.tick });
  [b, a] = await press('w', 'w'); check('W starts the showcase', a.tour === true, a.tour); await press('Escape', 'Esc');
  out.keyboard.trace = trace.map((t) => ({ key: t.key, tick: [t.before.tick, t.after.tick], panel: t.after.panel, playing: t.after.playing }));
  // can a keyboard user reach every action of the top bar? Tab from the top, activate with Enter / Space
  await K.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const reach = await K.evaluate(() => { const q = (sel) => !!document.querySelector(sel); const focusable = (sel) => [...document.querySelectorAll(sel)].some((e) => e.tabIndex >= 0 && !e.disabled); return { showcase: focusable('#topbar button[aria-haspopup="menu"]'), before: focusable('#topbar button[data-mode="before"]'), after: focusable('#topbar button[data-mode="after"]'), styles: focusable('#topbar button[data-style="war-room"]') && focusable('#topbar button[data-style="field-manual"]') && focusable('#topbar button[data-style="map-1863"]'), playPause: focusable('#dock button.play'), tools: focusable('#topbar .tool-btn'), scrubber: focusable('#dock input[type=range]'), speeds: [...document.querySelectorAll('#dock [data-speed]')].every((e) => e.tabIndex >= 0) }; });
  out.keyboard.reach = reach; check('every control of the top bar and the dock is a focusable element (Showcase, Before/After, the three styles, play/pause, speeds, scrubber, tool buttons)', Object.values(reach).every(Boolean), reach);
  // menu by keyboard: Enter on Showcase opens, focus moves into the menu, Escape returns focus to the button
  await K.evaluate(() => document.querySelector('#topbar button[aria-haspopup="menu"]').focus()); await K.keyboard.press('Enter'); await sleep(300);
  const menuFocus = await K.evaluate(() => ({ open: !!document.querySelector('.menu'), inMenu: !!document.activeElement.closest('.menu'), expanded: document.querySelector('#topbar button[aria-haspopup="menu"]').getAttribute('aria-expanded') }));
  await K.keyboard.press('Escape'); await sleep(200); const back = await K.evaluate(() => document.activeElement && (document.activeElement.getAttribute('aria-haspopup') === 'menu'));
  check('the Showcase menu opens with Enter, takes focus, and Escape returns focus to its button', menuFocus.open && menuFocus.inMenu && menuFocus.expanded === 'true' && back, { menuFocus, back });
  // arrow keys inside the menu (a role=menu is expected to support ArrowDown / ArrowUp)
  await K.keyboard.press('Enter'); await sleep(300); const f0 = await K.evaluate(() => document.activeElement && document.activeElement.textContent.slice(0, 20)); await K.keyboard.press('ArrowDown'); await sleep(150); const f1 = await K.evaluate(() => document.activeElement && document.activeElement.textContent.slice(0, 20)); await K.keyboard.press('Escape');
  check('inside the role=menu, ArrowDown moves focus to the next item (ARIA menu pattern)', f0 !== f1, { before: f0, after: f1 }); out.keyboard.menuArrowDown = { f0, f1 };
  // unit info for a keyboard user without a pointer: U then Enter opens the panel
  // slider keyboard use: focus the scrubber and press ArrowRight
  const sc = await K.evaluate(() => { const r = document.querySelector('.scrub input[type=range]'); r.focus(); return +r.value; }); await K.keyboard.press('ArrowRight'); await sleep(300); const sc2 = await K.evaluate(() => +document.querySelector('.scrub input[type=range]').value); check('the timeline slider moves with the arrow keys', sc2 !== sc, { before: sc, after: sc2 });
  // live region
  const live = await K.evaluate(() => ({ polite: [...document.querySelectorAll('[aria-live]')].map((e) => e.id + ':' + e.getAttribute('aria-live')), roleStatus: document.querySelectorAll('[role=status]').length, alert: document.querySelectorAll('[role=alert]').length }));
  out.keyboard.liveRegions = live;
  await k.close();

  // ======== D. reduced motion ============================================================================================================
  const rm = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'a11yrm', fresh: true, reducedMotion: 'reduce' }); const RM = rm.page;
  const css = await RM.evaluate(() => { const els = [...document.querySelectorAll('#topbar *, #dock *, #popups *, .nar, #panel, #splash, canvas')]; const bad = []; let anim = 0; for (const e of els) { const cs = getComputedStyle(e); const td = Math.max(...cs.transitionDuration.split(',').map((x) => parseFloat(x) * (x.includes('ms') ? 1 : 1000))); const ad = cs.animationName !== 'none' ? Math.max(...cs.animationDuration.split(',').map((x) => parseFloat(x) * (x.includes('ms') ? 1 : 1000))) : 0; if (cs.animationName !== 'none') anim++; if (td > 50 || ad > 50) bad.push([e.tagName + '.' + String(e.className).slice(0, 30), Math.round(td), Math.round(ad)]); } return { checked: els.length, longTransitions: bad.length, animations: anim, sample: bad.slice(0, 6) }; });
  out.reduced.css = css; check('with prefers-reduced-motion the chrome has no transition or animation longer than 50 ms (elements checked: ' + css.checked + ')', css.longTransitions === 0, css);
  const eng = await RM.evaluate(() => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(300, { glide: true }); let n = 0; for (; n < 5; n++) S.step(1); return { tickAfter5Frames: E.transport.simTau, reducedSeekIsInstant: Math.abs(E.transport.simTau - 300) < 0.01 }; });
  out.reduced.seek = eng; check('with reduced motion a seek lands at once instead of gliding', eng.reducedSeekIsInstant, eng);
  await rm.close();

  // ======== E. phone: touch targets, text size ===========================================================================================
  const ph = await launch({ w: 390, h: 844, dpr: 2, mobile: true, port: PORT, query: 'welcome=0', profile: 'a11yp', fresh: true }); await sleep(1500);
  const tg = await ph.page.evaluate(() => { const els = [...document.querySelectorAll('button, input, select, a, [role=button], [tabindex="0"]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.disabled && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; }); const small = els.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }); const under44 = els.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }); const desc = (e) => `${e.tagName.toLowerCase()}:${(e.getAttribute('aria-label') || e.title || e.textContent || '').trim().slice(0, 18)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`; return { total: els.length, under24: small.length, under44: under44.length, sample24: small.slice(0, 8).map(desc), sample44: under44.slice(0, 8).map(desc), scrollW: document.documentElement.scrollWidth, vw: innerWidth }; });
  out.targets = tg; check('phone viewport 390x844: no horizontal page scroll', tg.scrollW <= tg.vw + 1, { scrollW: tg.scrollW, vw: tg.vw });
  check('phone: every on-screen control is at least 24x24 CSS px (WCAG 2.5.8 AA); at least 44x44 (2.5.5 AAA, informational): under 24 ' + tg.under24 + ' of ' + tg.total + ', under 44 ' + tg.under44, tg.under24 === 0, { sample24: tg.sample24, sample44: tg.sample44 });
  await ph.close();
  out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length }; writeJson('v8-a11y.json', out); console.log(JSON.stringify(out.summary));
} finally { srv.close(); }
