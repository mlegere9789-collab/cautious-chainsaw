// ui/studio.mjs - the Studio chrome: top bar (clock, Style switcher, Before / After, Showcase menu, tools), transport dock with the scrubber, the Tuning Studio / Inspector / About panel, and the
// metrics overlay (one column per renderer).  It reads the engine and the tuning and writes only through their public APIs (engine.transport, engine.sceneJump, tuning.set ...): the chrome can be
// replaced without touching the engine.
import { h, svgIcon, ICON, evBadge, fmt } from './dom.mjs';
import { STYLES, VARIANTS, styleOfSkin, applyStyle } from '../styles/index.mjs';

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];
const MARK = 'M4 5h11a2 2 0 0 1 2 2v3H4zM8 13h11a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z';

export function createStudioUI({ root, engine, data, onSafe }) {
  const { tuning, transport, kernel } = engine; const tok = engine.tok;
  const ui = { selectedKey: null, inspectTile: null, tab: 'tune', panelOpen: false, metricsOpen: false, status: '', onTour: null, onCompare: null, onStyle: null };
  const el = {};
  const icon = (name, cls) => { const s = svgIcon(ICON[name]); if (cls) s.setAttribute('class', cls); return s; };

  // ---- top bar -------------------------------------------------------------------------------------------------------------------------------
  el.tick = h('div', { class: 'tick' }, ''); el.clock = h('div', { class: 'clock' }, '');
  const brand = h('div', { class: 'brand' }, svgIcon(MARK), h('div', null, h('b', null, 'Battle Studio'), h('span', null, 'Gettysburg, July 1 to 3, 1863')));
  const clockbox = h('div', { class: 'clockbox', 'aria-live': 'off' }, el.tick, el.clock);

  // Style switcher: three families (a segmented control), a variant menu, and one select for narrow screens
  const styleBtns = STYLES.map((s) => h('button', { type: 'button', 'data-style': s.id, title: s.blurb, 'aria-pressed': 'false', onclick: () => chooseStyle(s.id, currentVariant()) }, s.label));
  el.variant = h('select', { class: 'vsel', 'aria-label': 'Style variant', title: 'Variant: standard, colour-blind safe or high contrast', onchange: () => chooseStyle((styleOfSkin(tok('skin.id')) || { style: STYLES[0] }).style.id, el.variant.value) }, VARIANTS.map((v) => h('option', { value: v.id }, v.label)));
  const segStyle = h('div', { class: 'seg styles', role: 'group', 'aria-label': 'Look of the ground' }, styleBtns);
  el.styleSel = h('select', { class: 'btn style-sel', 'aria-label': 'Style', onchange: () => { const [sid, vid] = el.styleSel.value.split('|'); chooseStyle(sid, vid); } },
    STYLES.map((s) => h('optgroup', { label: s.label }, VARIANTS.map((v) => h('option', { value: s.id + '|' + v.id }, s.label + (v.id === 'standard' ? '' : ' · ' + v.label))))), h('option', { value: '|' , hidden: true, id: 'style-other' }, 'Test skin'));
  const currentVariant = () => (styleOfSkin(tok('skin.id')) || { variant: 'standard' }).variant;
  function chooseStyle(id, variant) { try { applyStyle(engine, id, variant); if (ui.onStyle) ui.onStyle(id, variant); } catch (e) { ui.status = String(e.message); } }
  function syncStyle() {
    const cur = styleOfSkin(tok('skin.id'));
    for (const b of styleBtns) b.setAttribute('aria-pressed', String(!!cur && cur.style.id === b.dataset.style));
    el.variant.value = cur ? cur.variant : 'standard'; el.variant.disabled = !cur;
    el.styleSel.value = cur ? cur.style.id + '|' + cur.variant : '|';
  }
  tuning.on('skin.id', syncStyle);

  // Before / After
  const cmpBtn = (mode, label, title) => h('button', { type: 'button', 'data-mode': mode, 'aria-pressed': 'false', title, onclick: () => setCompare(mode) }, label);
  el.cmpBefore = cmpBtn('before', 'Before', 'The production renderer, reproduced: stepping, hold-then-jump, overlapping bars (B)'); el.cmpAfter = cmpBtn('after', 'After', 'The Studio: continuous motion, tiles that never obscure each other (B)');
  const segCmp = h('div', { class: 'seg glass cmp', role: 'group', 'aria-label': 'Renderer: before or after' }, el.cmpBefore, el.cmpAfter);
  function setCompare(mode) { try { tuning.set('compare.mode', mode); } catch (e) { ui.status = String(e.message); } }
  function syncCompare() { const m = engine.compare; el.cmpBefore.setAttribute('aria-pressed', String(m === 'before')); el.cmpAfter.setAttribute('aria-pressed', String(m === 'after')); el.badge.classList.toggle('off', m !== 'before'); if (ui.onCompare) ui.onCompare(m); }
  el.badge = h('div', { class: 'cmpbadge before glass off', role: 'status', 'data-chrome': '' }, h('i'), 'BEFORE', h('span', null, 'production-style stepping, reproduced from the shipped code (report 01)'));

  // Showcase menu: tours, hotspots, replay of this view, computed scenes, (phone) tools
  el.showcase = h('button', { class: 'btn glass tool-l', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Menu: the legend, the Chronicle, the look of the map, tours', title: 'Guided tours, scenes, the look of the map', onclick: () => toggleMenu() }, icon('showcase', 'ic-desk'), icon('more', 'ic-phone'), h('span', { class: 'lbl' }, 'Showcase'));
  el.btnTune = toolBtn('tune', 'Tune', 'Tuning Studio (T)', () => togglePanel('tune'));
  el.btnInspect = toolBtn('inspect', 'Inspect', 'Inspector (I)', () => togglePanel('inspect'));
  el.btnMetrics = toolBtn('metrics', 'Metrics', 'Metrics overlay (M)', () => tuning.set('metrics.overlay', !tok('metrics.overlay')));
  el.btnAbout = toolBtn('info', 'About', 'Legend and honesty (A)', () => togglePanel('about'));
  function toolBtn(ic, label, title, run) { return h('button', { class: 'btn glass tool tool-btn', type: 'button', 'aria-pressed': 'false', title, 'aria-label': label, onclick: run }, icon(ic)); }
  const topbar = h('header', { id: 'topbar' }, brand, clockbox, segStyle, el.styleSel, segCmp, el.showcase, h('div', { class: 'spacer' }), h('div', { class: 'toolbox', role: 'group', 'aria-label': 'Tools' }, el.btnInspect, el.btnTune, el.btnMetrics, el.btnAbout));
  el.styleSel.classList.add('glass'); el.styleSel.style.display = 'none';

  // ---- menu ------------------------------------------------------------------------------------------------------------------------------------
  let menu = null; let menuOff = null;
  function closeMenu() { if (!menu) return; menu.remove(); menu = null; el.showcase.setAttribute('aria-expanded', 'false'); if (menuOff) { menuOff(); menuOff = null; } }
  function toggleMenu() { if (menu) { closeMenu(); return; } openMenu(); }
  function item(ic, title, sub, run, cls = '') { return h('button', { type: 'button', role: 'menuitem', class: cls, onclick: () => { closeMenu(); run(); } }, ic ? icon(ic) : null, h('b', null, title), sub ? h('span', null, sub) : null); }
  function openMenu() {
    const groups = new Map(); for (const t of kernel.tours.list()) { if (!groups.has(t.group)) groups.set(t.group, []); groups.get(t.group).push(t); }
    const kids = []; const phone = !!(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);
    if (phone && ui.onDoc) {                                                                                    // a phone has no row for the desktop's buttons: what they open is the first group of the menu
      kids.push(h('h4', null, 'Read the map'), item('info', 'Legend', 'How to read the marks', () => ui.onDoc('legend:legend'), 'plain'), item('map', 'Chronicle', 'Everything that has happened so far', () => ui.onDoc('chronicle:list'), 'plain'), item('info', 'Keys and evidence labels', 'What Documented, Modelled and the rest mean', () => ui.onDoc('hints:help'), 'plain'));
    }
    { const cur = styleOfSkin(tok('skin.id')) || { style: STYLES[0], variant: 'standard' };                     // the look of the ground and the colour set: one place, on every screen size
      kids.push(h('h4', null, 'Look'));
      for (const s of STYLES) kids.push(item(null, s.label, s.blurb, () => chooseStyle(s.id, currentVariant()), 'plain' + (cur.style.id === s.id ? ' current' : '')));
      kids.push(h('h4', null, 'Colour'));
      for (const v of VARIANTS) kids.push(item(null, v.label, v.blurb || '', () => chooseStyle(cur.style.id, v.id), 'plain' + (cur.variant === v.id ? ' current' : ''))); }
    for (const [g, list] of groups) { kids.push(h('h4', null, g)); for (const t of list) kids.push(item(g === 'Showcase' ? 'showcase' : 'target', t.label, t.blurb, () => ui.onTour && ui.onTour(t.id))); }
    kids.push(h('h4', null, 'Compare'), item('replay', 'Replay this view, before then after', 'The same ticks from where the camera is now, through the production reproduction and then the Studio, with the numbers measured on this run.', () => ui.onTour && ui.onTour('view-replay')));
    if (!phone) kids.push(item('target', engine.compare === 'before' ? 'Show the Studio again (After)' : 'Show the production renderer (Before)', 'The production tile renderer as it ships: stepping, hold-then-jump, overlapping bars. Key B.', () => setCompare(engine.compare === 'before' ? 'after' : 'before'), 'plain'));
    kids.push(h('h4', null, 'Scenes (computed from the data)'));
    for (const s of data.scenes) kids.push(item('map', s.name, `Tick ${s.tick} · ${s.why}`, () => { onSafe && onSafe(); engine.sceneJump(s); engine.select(null); }));
    if (phone) {
      kids.push(h('h4', null, 'Tools'), item('inspect', 'Inspect', 'Select a tile to see what the data says about it', () => togglePanel('inspect'), 'plain'), item('tune', 'Tune', 'Every dial of the engine, live', () => togglePanel('tune'), 'plain'),
        item('metrics', 'Metrics', 'Frame times, jumps, overlaps', () => tuning.set('metrics.overlay', !tok('metrics.overlay')), 'plain'), item('info', 'About', 'Legend, evidence labels and honest limits', () => togglePanel('about'), 'plain'));
    }
    menu = h('div', { class: 'menu', role: 'menu', 'aria-label': 'Showcase' }, kids); root.append(menu);
    const r = el.showcase.getBoundingClientRect(); const ar = root.getBoundingClientRect(); menu.style.left = Math.max(10, Math.min(ar.width - 320, r.left - ar.left)) + 'px'; menu.style.top = (r.bottom - ar.top + 8) + 'px';
    el.showcase.setAttribute('aria-expanded', 'true'); const first = menu.querySelector('button'); if (first) first.focus({ preventScroll: true });
    const away = (e) => { if (menu && !menu.contains(e.target) && !el.showcase.contains(e.target)) closeMenu(); };
    document.addEventListener('pointerdown', away, true); menuOff = () => { document.removeEventListener('pointerdown', away, true); };
  }

  // Escape closes the menu first: this listener is registered before the popup layer's (which consumes Escape for its own cards), so it runs first in the capture phase
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); el.showcase.focus(); } }, true);

  // ---- dock ----------------------------------------------------------------------------------------------------------------------------------
  el.play = h('button', { class: 'tbtn play', 'aria-label': 'Play', title: 'Play / pause (Space)', onclick: () => transport.toggle() }, svgIcon(ICON.play));
  const stepBtn = (label, ic, d) => h('button', { class: 'tbtn', 'aria-label': label, title: label, onclick: () => { transport.pause(); transport.seek(Math.round((transport.target ?? transport.simTau)) + d, { ms: 100 }); } }, svgIcon(ic));
  const speedBtns = SPEEDS.map((s) => h('button', { class: 'tbtn', 'aria-pressed': String(s === 1), 'aria-label': s + 'x speed', title: s + '× speed', 'data-speed': s, onclick: () => transport.setSpeed(s) }, s === 0.25 ? '¼×' : s === 0.5 ? '½×' : s + '×'));
  el.dockstat = h('div', { class: 'dockstat' }, ''); el.scaleBar = h('i'); el.scaleText = h('span'); el.scale = h('div', { class: 'scalebar', 'aria-hidden': 'true' }, el.scaleBar, el.scaleText);      // D4 FORK: the scale lives in the dock, where no mark can stand on it
  el.range = h('input', { type: 'range', min: 1, max: 675, step: 0.01, value: 1, 'aria-label': 'Tick', oninput: () => transport.seek(+el.range.value, { ms: 90 }), onpointerdown: () => { ui.scrubbing = true; }, onpointerup: () => { ui.scrubbing = false; }, onpointercancel: () => { ui.scrubbing = false; } });
  el.marks = h('canvas', { 'aria-hidden': 'true' }); el.tip = h('div', { class: 'scrubtip hidden' });
  const scrub = h('div', { class: 'scrub' }, el.marks, el.range, el.tip);
    el.honesty = h('div', { class: 'honesty' }, evBadge('Modelled'), h('span', { class: 'note' }, 'Positions are hand-authored keyframes and motion between them is interpolated; the clock is a candidate, not a reviewed time.'));
  el.honestyMini = h('div', { class: 'honesty-mini' }, evBadge('Modelled'), h('span', null, 'positions, motion and the candidate clock'));
  el.credit = h('div', { id: 'credit', class: 'credit', role: 'note' });      // D4 FORK: what this ground is, in the dock, on every screen (app.mjs fills it from the backdrop)
  const dock = h('section', { id: 'dock', 'aria-label': 'Transport' },
    h('div', { class: 'transport' },
      h('div', { class: 'grp' }, h('button', { class: 'tbtn', 'aria-label': 'Go to tick 1', title: 'Start', onclick: () => transport.seek(1, { ms: 200 }) }, svgIcon(ICON.start)), stepBtn('Back one tick', ICON.stepBack, -1), el.play, stepBtn('Forward one tick', ICON.step, 1)),
      h('div', { class: 'grp speeds', role: 'group', 'aria-label': 'Speed' }, speedBtns), scrub, el.dockstat, el.scale), el.honesty, el.honestyMini, el.credit);

  // ---- panel ---------------------------------------------------------------------------------------------------------------------------------
  const tabs = ['tune', 'inspect', 'about'];
  el.tabBtns = Object.fromEntries(tabs.map((t) => [t, h('button', { role: 'tab', 'aria-selected': 'false', onclick: () => setTab(t) }, { tune: 'Tune', inspect: 'Inspect', about: 'About' }[t])]));
  el.pane = h('div', { class: 'pane', role: 'tabpanel' });
  const panel = h('aside', { id: 'panel', class: 'hidden', 'aria-label': 'Studio panel' }, h('div', { class: 'tabs', role: 'tablist' }, Object.values(el.tabBtns)), el.pane);

  // ---- metrics overlay ---------------------------------------------------------------------------------------------------------------------
  el.mcanvas = h('canvas', { width: 640, height: 108, 'aria-label': 'Frame interval graph' }); el.mrows = h('div', null);
  const metrics = h('div', { id: 'metrics', class: 'hidden', 'aria-label': 'Metrics' }, h('b', null, 'Metrics (live, measured, per renderer)'), el.mcanvas, el.mrows,
    h('div', { class: 'btns' }, h('button', { onclick: () => { engine.metricsOf('before').reset(); engine.metricsOf('after').reset(); } }, 'Reset both'), h('button', { onclick: () => download('battle-studio-metrics.json', JSON.stringify({ format: 'battle-studio-metrics/2', meta: { tick: engine.frame?.tick, zoom: engine.camera.zoom, settings: tuning.diff(), userAgent: navigator.userAgent, dpr: devicePixelRatio, mode: engine.compare }, before: engine.metricsOf('before').export(), after: engine.metricsOf('after').export() }, null, 1)) }, 'Export JSON')));

  root.append(topbar, el.badge, panel, metrics, dock);

  // ---- behaviour -----------------------------------------------------------------------------------------------------------------------------
  function togglePanel(tab) { if (ui.panelOpen && ui.tab === tab) { ui.panelOpen = false; } else { ui.panelOpen = true; ui.tab = tab; } renderChrome(true); }
  function setTab(t) { ui.tab = t; ui.panelOpen = true; renderChrome(); }
  function renderChrome(animate = false) {
    const wasHidden = panel.classList.contains('hidden'); panel.classList.toggle('hidden', !ui.panelOpen);
    if (animate && ui.panelOpen && wasHidden) { panel.classList.add('entering'); requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering'))); }
    for (const t of tabs) el.tabBtns[t].setAttribute('aria-selected', String(ui.panelOpen && ui.tab === t));
    el.btnTune.setAttribute('aria-pressed', String(ui.panelOpen && ui.tab === 'tune')); el.btnInspect.setAttribute('aria-pressed', String(ui.panelOpen && ui.tab === 'inspect')); el.btnAbout.setAttribute('aria-pressed', String(ui.panelOpen && ui.tab === 'about'));
    if (ui.panelOpen) { el.pane.replaceChildren(...(ui.tab === 'tune' ? buildTune() : ui.tab === 'inspect' ? buildInspect() : buildAbout())); }
    if (onSafe) onSafe();
  }
  function download(name, text) { try { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch { ui.status = 'download blocked by the browser'; } }

  // ---- Tune tab ------------------------------------------------------------------------------------------------------------------------------
  const rowRefs = new Map();
  function optionsOf(def) { return def.type === 'select' ? def.options : kernel[def.registry].list().filter((m) => !m.hidden).map((m) => ({ value: m.id, label: m.label })); }
  function tokenRow(def) {
    const v = tuning.get(def.id); let control; const val = h('span', { class: 'val' }, '');
    const fmtVal = (x) => (def.type === 'number' ? (Number.isInteger(def.step) ? String(x) : (+x).toFixed(Math.max(1, (String(def.step).split('.')[1] || '').length))) + (def.unit ? ' ' + def.unit.split(' ')[0] : '') : def.type === 'boolean' ? (x ? 'on' : 'off') : '');
    const id = 'tok-' + def.id.replace(/\./g, '-');
    if (def.type === 'number') control = h('input', { id, type: 'range', min: def.min, max: def.max, step: def.step, value: v, oninput: () => { try { tuning.set(def.id, +control.value); } catch (e) { ui.status = String(e.message); } } });
    else if (def.type === 'boolean') control = h('input', { id, type: 'checkbox', checked: v, onchange: () => tuning.set(def.id, control.checked), style: { justifySelf: 'end', width: '18px', height: '18px', accentColor: 'var(--accent)' } });
    else control = h('select', { id, onchange: () => { try { tuning.set(def.id, control.value); } catch (e) { ui.status = String(e.message); } } }, optionsOf(def).map((o) => h('option', { value: o.value, selected: o.value === v }, o.label)));
    const row = h('div', { class: 'row', 'data-id': def.id }, h('label', { for: id }, def.label), def.type === 'select' || def.type === 'registry' ? h('span', { class: 'val' }, '') : (def.type === 'number' ? val : null), control, h('div', { class: 'doc' }, evBadge(def.evidence), ' ', def.doc, def.source ? h('span', { class: 'note' }, ' [' + def.source + ']') : null));
    const sync = (x) => { if (def.type === 'number') { control.value = x; val.textContent = fmtVal(x); } else if (def.type === 'boolean') control.checked = x; else control.value = x; row.classList.toggle('changed', x !== def.default); };
    sync(v); rowRefs.set(def.id, sync); return row;
  }
  /** a popup style's group opens with a button that shows that popup now (popups/host.mjs preview) */
  function previewRow(g) {
    const d = kernel.popups.list().find((x) => x.group === g.id && x.preview); if (!d) return null;
    return h('div', { class: 'toolbar' }, h('button', { class: 'btn primary', type: 'button', title: d.doc, onclick: () => ui.onPreview(d.id) }, 'Show this popup now'), h('span', { class: 'note' }, d.doc));
  }
  function buildTune() {
    rowRefs.clear(); const out = [];
    const search = h('input', { class: 'search', type: 'search', placeholder: 'Filter dials (name or text)', 'aria-label': 'Filter dials', oninput: () => { const q = search.value.toLowerCase(); for (const r of el.pane.querySelectorAll('.row')) { const d = tuning.defs.get(r.dataset.id); r.classList.toggle('hidden', !!q && !(d.label + ' ' + d.id + ' ' + d.doc).toLowerCase().includes(q)); } } });
    const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: async () => { try { const text = await file.files[0].text(); const r = tuning.import(JSON.parse(text)); ui.status = `imported ${r.applied.length}, rejected ${r.rejected.length}, unknown ${r.unknown.length}`; } catch (e) { ui.status = 'import failed: ' + e.message; } renderChrome(); } });
    const status = h('div', { class: 'note', role: 'status' }, ui.status || 'Changes apply live and are remembered in this browser.');
    out.push(h('div', { class: 'toolbar' },
      h('button', { class: 'btn', onclick: () => download('battle-studio-settings.json', JSON.stringify(tuning.export(), null, 1)) }, 'Export'), h('button', { class: 'btn', onclick: () => file.click() }, 'Import'),
      h('button', { class: 'btn', onclick: () => { tuning.reset(); ui.status = 'all dials reset'; renderChrome(); } }, 'Reset all'), file), search, status);
    for (const g of tuning.groups()) {
      const body = h('div', null, ui.onPreview ? previewRow(g) : null, g.tokens.map(tokenRow)); let open = !['camera'].includes(g.id) || false; body.classList.toggle('hidden', !open);
      out.push(h('h3', null, h('button', { 'aria-expanded': String(open), onclick: (e) => { open = !open; body.classList.toggle('hidden', !open); e.currentTarget.setAttribute('aria-expanded', String(open)); } }, g.label)), body);
    }
    return out;
  }
  tuning.on('*', (value, id) => { const s = rowRefs.get(id); if (s) s(value); if (id === 'metrics.overlay') ui.metricsOpen = value, syncMetrics(); if (id === 'compare.mode') syncCompare(); });
  kernel.skins.subscribe(() => { syncStyle(); if (ui.panelOpen && ui.tab === 'tune') renderChrome(); });

  // ---- Inspect tab ---------------------------------------------------------------------------------------------------------------------------
  function kv(pairs) { return h('dl', { class: 'kv' }, pairs.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])); }
  function buildInspect() {
    const t = ui.inspectTile; const f = engine.frame; const out = [];
    if (!t) { return [h('p', { class: 'note' }, 'Click a tile to inspect it. A unit shows its order-of-battle identity, its current keyframe and what each fact is: ', evBadge('Documented'), ' ', evBadge('Modelled'), ' ', evBadge('Contested'), '.'), h('p', { class: 'note' }, 'Selecting a unit gives its tile the highest placement priority, so it stays on its true position.')]; }
    if (t.kind === 'leaf') {
      const d = engine.describeUnit(t.ids[0]); if (!d) return [h('p', { class: 'note' }, 'unit not found')];
      out.push(h('div', { class: 'card' }, h('b', null, d.label || d.short), h('div', { class: 'note' }, d.designation || 'no order-of-battle designation (' + d.id + ')'),
        kv([['Id', d.id], ['Side', [d.side === 'unknown' ? 'UNKNOWN ' : d.side, ' ', evBadge(d.sideNote ? 'Contested' : 'Documented')]], ['Arm / echelon', `${d.arm} / ${d.kind}`], ['Keyframes', `${d.keyframes} (ticks ${d.firstTick} to ${d.lastTick})`]])));
      if (d.sideNote) out.push(h('div', { class: 'warnbox' }, d.sideNote));
      if (d.now) {
        out.push(h('div', { class: 'card' }, h('b', null, 'Now (tick ' + fmt(engine.transport.simTau, 1) + ')'),
          kv([['Position', [d.now.lat.toFixed(5) + ', ' + d.now.lng.toFixed(5), ' ', evBadge('Modelled')]],
            ['Current keyframe', `tick ${d.now.kfTick} (${fmt(d.now.ageTicks, 0)} ticks ago${d.now.untilNext === Infinity ? ', the last one' : ', next in ' + fmt(d.now.untilNext, 0)})`],
            ['Strength', [`${d.now.strength} of ${d.now.strengthRef} reference`, ' ', evBadge('Modelled')]], ['Disposition', d.now.disposition],
            ['Between keyframes', d.now.moving ? ['interpolated (' + tok('interp.model') + ')', ' ', evBadge('Modelled')] : 'holding']]),
          d.now.note ? h('div', { class: 'note' }, h('b', null, 'Data note: '), d.now.note) : null));
      }
      out.push(h('div', { class: 'card' }, h('b', null, 'Chain of command'), h('div', { class: 'note' }, d.chain.map((c) => `${c.id} (${c.kind})`).join(' › ')), h('div', { class: 'note' }, [d.parentSource === 'oob' ? 'parent from the order of battle ' : 'no complete order-of-battle parent ', evBadge(d.parentSource === 'oob' ? 'Documented' : 'Unknown')])));
    } else {
      out.push(h('div', { class: 'card' }, h('b', null, `${t.short} ${t.badge || ''}`), h('div', { class: 'note' }, `An aggregate: ${t.n} placement records share this tile because they cannot all stand on their true positions within the displacement budget. `, evBadge('Computed')),
        kv([['Side', t.side === 'mixed' ? 'both sides, or one side and a contested one' : t.side], ['Last keyframe', `${fmt(t.ageMin, 0)} to ${fmt(t.ageMax, 0)} ticks ago`]])));
      out.push(h('h3', null, 'Records'), h('div', { class: 'card' }, ...t.ids.slice(0, 40).map((id) => h('div', null, h('button', { class: 'btn', style: { height: '26px', padding: '0 8px', margin: '2px 6px 2px 0' }, onclick: () => { engine.select(id); ui.inspectTile = f && f.tiles.find((q) => q.ids.includes(id) && q.kind === 'leaf') || { kind: 'leaf', ids: [id] }; renderChrome(); } }, id), engine.battle.units.get(id)?.label || '')), t.ids.length > 40 ? h('div', { class: 'note' }, `and ${t.ids.length - 40} more`) : null));
    }
    out.push(h('div', { class: 'toolbar' }, h('button', { class: 'btn', onclick: () => { engine.select(null); ui.inspectTile = null; renderChrome(); } }, 'Clear selection')));
    return out;
  }

  // ---- About tab -----------------------------------------------------------------------------------------------------------------------------
  function buildAbout() {
    const cnt = data.provenance.counts; const dsp = data.terrain.locations.filter((l) => data.terrain.disputed.includes(l.id)); const skin = kernel.skins.has(tok('skin.id')) ? kernel.skins.get(tok('skin.id')) : null; const out = [];
    out.push(h('p', { class: 'note' }, h('b', null, 'What you are looking at. '), `${cnt.units} real units and ${cnt.keyframes} real placement keyframes on ${cnt.populatedTicks} of 675 ticks, drawn on a modern aerial photograph (not the 1863 landscape). Nothing is drawn that the data does not support; anything computed or modelled says so.`));
    out.push(h('h3', null, 'Evidence labels'));
    for (const [k, v] of [['Documented', 'printed in a named source (order-of-battle identity, id prefix)'], ['Measured', 'read by an instrument or counted from a record'], ['Computed', 'derived from data by a stated rule (counts, aggregates, ages)'], ['Modelled', 'authored or interpolated, not recorded: every position, every strength value, every clock time'], ['Contested', `the sources disagree (${data.provenance.counts.unknownSide} ids whose state code contradicts the prefix)`], ['Unknown', 'nobody has decided yet']]) out.push(h('div', { class: 'note', style: { margin: '3px 0' } }, evBadge(k), ' ', v));
    if (skin && skin.legend) { out.push(h('h3', null, 'Legend: ' + skin.label)); for (const e of skin.legend()) out.push(h('div', { class: 'legend' }, h('i', { style: { background: e.swatch } }), h('div', null, e.text, ' ', evBadge(e.evidence)))); }
    out.push(h('h3', null, 'Honest limits'),
      h('div', { class: 'warnbox' }, 'The clock is a candidate: 33 anchors, all proposed, none reviewed by a historian. Clock times are shown as ', h('b', null, 'about'), ' and with their uncertainty.'),
      h('div', { class: 'warnbox' }, `The ground is a modern aerial photograph (USGS NAIP, flown 24 April to 10 May 2022) lit by a USGS elevation model: it is not the 1863 landscape. Place names stand where the production terrain data puts them, with three hills moved to the summits the elevation model measures. The unit placements were authored in an older frame: ${data.terrain.disputed.length} of ${data.terrain.locations.length} places sit ${Math.min(...dsp.map((l) => l.diffM))} to ${Math.max(...dsp.map((l) => l.diffM))} m apart between the two frames, and 60 placement rows that name Culp's Hill sit a median 696 m from it (research report 03, fact 11). Which frame is right is Unknown. Two place names carry a question mark: no building of that name stands at the site's coordinate (the Lutheran Seminary's mark is 679 m from its cupola; the Evergreen Cemetery gatehouse has no building within 25 m of its mark; basemap landmark check).`),
      h('div', { class: 'warnbox' }, `Under carry-forward a unit stays at its last keyframe until the battle ends. Most tiles are old keyframes; the outline channel shows how old. Choose another visibility rule in Tune > Layout.`),
      h('div', { class: 'warnbox' }, 'The Before view is a reproduction of the production renderer built from the shipped code and checked against the research replay (report 01). It leaves out the hit flash, the trail canvas, the fps text and the cannon sound, and it draws at the device pixel ratio where production draws at one pixel per CSS pixel.'));
    out.push(h('h3', null, 'Scenes (computed from the data)'));
    for (const s of data.scenes) out.push(h('div', { class: 'note', style: { margin: '4px 0' } }, h('b', null, s.name), ` tick ${s.tick}: ${s.why}. Nearest place in the data: ${s.nearestPlace.name}, ${s.nearestPlace.d} m (a label, not a claim).`));
    out.push(h('h3', null, 'Guarantee'), h('p', { class: 'note' }, 'Every displayed frame is checked by an independent verifier. Overlaps found so far: ', h('b', { id: 'ab-ov' }, String(engine.metricsOf('after').overlapPairs ?? 0)), '. Layout text widths: ', engine.text.source + '.'));
    return out;
  }

  // ---- metrics overlay ------------------------------------------------------------------------------------------------------------------------
  function syncMetrics() { ui.metricsOpen = tok('metrics.overlay'); metrics.classList.toggle('hidden', !ui.metricsOpen); el.btnMetrics.setAttribute('aria-pressed', String(ui.metricsOpen)); if (onSafe) onSafe(); }
  let lastMetricsDraw = 0;
  function drawMetrics(now) {
    if (!ui.metricsOpen || now - lastMetricsDraw < 200) return; lastMetricsDraw = now;
    const cur = engine.compare; const lane = engine.metrics; const m = lane.live();
    const S = { before: engine.metricsOf('before'), after: engine.metricsOf('after') }; const sums = { before: S.before.frames ? S.before.summary({ maxAgeMs: 900 }) : null, after: S.after.frames ? S.after.summary({ maxAgeMs: 900 }) : null };
    const cell = (v, d, cls) => h('span', { class: cls || '' }, v == null ? '–' : fmt(v, d));
    const row = (k, get, d, good) => h('div', { class: 'mrow' }, h('span', null, k), ...['before', 'after'].map((mode) => { const s = sums[mode]; const v = s ? get(s) : null; return h('span', { class: (v == null ? 'dim' : good ? good(v) : '') + (mode === cur ? ' cur' : '') }, v == null ? '–' : fmt(v, d)); }));
    const zero = (v) => (v === 0 ? 'good' : 'bad');
    el.mrows.replaceChildren(
      h('div', { class: 'mrow head' }, h('span', null, cur === 'before' ? 'showing: before' : 'showing: after'), h('span', null, 'Before'), h('span', null, 'After')),
      row('Frame rate (fps)', (s) => s.fpsMean, 0, (v) => (v > 55 ? 'good' : v < 40 ? 'bad' : '')), row('Frame p95 (ms)', (s) => s.dtMsP95, 1), row('Engine (ms / frame)', (s) => s.engineMsMean, 1),
      row('Tiles on the map', (s) => s.tilesMean, 0), row('Sudden jumps / s', (s) => s.jumpsPerSec, 1), row('Steps over 8 px / s', (s) => s.hopsPerSec, 1), row('Largest step (px)', (s) => s.maxStepPx, 0),
      row('Frames with overlaps (%)', (s) => 100 * s.overlapFrames / Math.max(1, s.frames), 0, zero), row('Overlapping pairs / frame', (s) => s.overlapPairs / Math.max(1, s.frames), 0, zero),
      row('Unrepresented unit-frames', (s) => s.unrepresentedUnitFrames, 0, zero), row('Vanish for one frame / s', (s) => s.blinksPerSec, 2), row('Frames > 20 ms (%)', (s) => s.framesOver20msPct, 1),
      h('div', { class: 'mrow' }, h('span', null, 'Popup cards over tiles (frames)'), h('span', { class: 'dim' }, '–'), h('span', { class: (ui.cardsOverTiles || 0) === 0 ? 'good' : 'bad' }, String(ui.cardsOverTiles || 0))));
    const c = el.mcanvas; const g = c.getContext('2d'); const W = c.width; const H = c.height; g.clearRect(0, 0, W, H);
    const ser = m.series; const n = ser.length; if (!n) return; const barW = W / Math.max(120, n);
    const y = (ms) => H - Math.min(1, ms / 50) * H;
    g.strokeStyle = 'rgba(160,170,180,0.35)'; g.lineWidth = 1; for (const ms of [16.7, 33.3]) { g.beginPath(); g.moveTo(0, y(ms)); g.lineTo(W, y(ms)); g.stroke(); }
    ser.forEach((r, i) => { g.fillStyle = r.dt > 33.4 ? '#e0553a' : r.dt > 20 ? '#e09a1a' : '#3aa675'; const top = y(r.dt); g.fillRect(i * barW, top, Math.max(1, barW - 0.5), H - top); if (r.jumps) { g.fillStyle = '#fff'; g.fillRect(i * barW, 0, Math.max(1, barW), 4); } });
  }

  // ---- scrubber marks -------------------------------------------------------------------------------------------------------------------------
  function drawMarks() {
    const c = el.marks; const r = c.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2); c.width = Math.max(10, Math.round(r.width * dpr)); c.height = Math.max(10, Math.round(r.height * dpr));
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const W = r.width; const H = r.height; const x = (t) => (t - 1) / 674 * (W - 4) + 2;
    const css = getComputedStyle(document.documentElement); const line = css.getPropertyValue('--line').trim() || '#2a323c'; const muted = css.getPropertyValue('--muted').trim() || '#9ba6b2';
    g.fillStyle = css.getPropertyValue('--panel2').trim() || '#1b2128'; g.globalAlpha = 0.7; g.beginPath(); g.roundRect ? g.roundRect(0, 6, W, H - 12, 8) : g.rect(0, 6, W, H - 12); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = line; g.lineWidth = 1; for (const t of [226, 451]) { g.beginPath(); g.moveTo(x(t), 2); g.lineTo(x(t), H - 2); g.stroke(); }
    g.fillStyle = muted; g.font = '600 11px Inter, system-ui, sans-serif'; g.textBaseline = 'top'; for (const [t, s] of [[1, 'July 1'], [226, 'July 2'], [451, 'July 3']]) g.fillText(s, x(t) + 6, 1);
    for (const e of data.events) { g.strokeStyle = e.significance === 'critical' ? '#e0553a' : e.significance === 'high' ? '#d9a21b' : '#6d7782'; g.lineWidth = 1; const hh = Math.min(e.significance === 'critical' ? 14 : e.significance === 'high' ? 9 : 5, H * 0.38); g.beginPath(); g.moveTo(x(e.tick) + 0.5, H - 5); g.lineTo(x(e.tick) + 0.5, H - 5 - hh); g.stroke(); }
    g.fillStyle = '#4a7fd0'; const dy = Math.round(H * 0.6); for (const s of data.scenes) { const px = x(s.tick); g.beginPath(); g.moveTo(px, dy - 4); g.lineTo(px + 3.5, dy); g.lineTo(px, dy + 4); g.lineTo(px - 3.5, dy); g.closePath(); g.fill(); }
  }
  el.range.addEventListener('pointermove', (ev) => {
    const r = el.range.getBoundingClientRect(); const t = 1 + (ev.clientX - r.left - 2) / (r.width - 4) * 674; let best = null; let bd = 1e9;
    for (const e of data.events) { const d = Math.abs(e.tick - t) / 674 * r.width; if (d < bd) { bd = d; best = e; } }
    for (const s of data.scenes) { const d = Math.abs(s.tick - t) / 674 * r.width; if (d < bd && d < 6) { bd = d; best = { tick: s.tick, significance: 'scene', event: s.name + ': ' + s.why }; } }
    const cl = engine.clock.describe(t);
    el.tip.classList.remove('hidden'); el.tip.style.left = Math.max(110, Math.min(r.width - 110, ev.clientX - r.left)) + 'px';
    el.tip.replaceChildren(h('b', null, `Tick ${Math.round(t)}`), ` · ${cl.date}, about ${cl.text} `, evBadge('Modelled'), best && bd < 6 ? h('div', { class: 'note' }, `[${best.significance}] tick ${best.tick}: ${best.event}`) : null);
  });
  el.range.addEventListener('pointerleave', () => el.tip.classList.add('hidden'));
  new ResizeObserver(() => drawMarks()).observe(scrub);

  // ---- per-frame update --------------------------------------------------------------------------------------------------------------------------
  let lastTickText = ''; let lastClockText = '';
  ui.update = (frame, now) => {
    const t = engine.transport; const cl = frame.clock; const tickText = `${cl.date}, about ${cl.text}`; if (tickText !== lastTickText) { el.tick.textContent = tickText; lastTickText = tickText; }
    const clockText = `±${cl.sigmaMin} min · candidate clock · tick ${frame.tick} of 675`; if (clockText !== lastClockText) { el.clock.textContent = clockText; lastClockText = clockText; }
    el.play.setAttribute('aria-label', t.playing ? 'Pause' : 'Play'); const want = t.playing ? 'pause' : 'play'; if (el.play.dataset.state !== want) { el.play.dataset.state = want; el.play.replaceChildren(svgIcon(ICON[want])); }
    if (!ui.scrubbing) el.range.value = String(t.target ?? t.simTau);
    for (const b of speedBtns) b.setAttribute('aria-pressed', String(+b.dataset.speed === t.speed));
    { const mpp = engine.camera.mpp(); const raw = 90 * mpp; const pow = 10 ** Math.floor(Math.log10(raw)); const fr = raw / pow; const len = (fr < 1.5 ? 1 : fr < 3.5 ? 2 : fr < 7.5 ? 5 : 10) * pow; const px = Math.round(len / mpp); const txt = len >= 1000 ? len / 1000 + ' km' : len + ' m'; if (el.scaleText.textContent !== txt || el.scaleBar.style.width !== px + 'px') { el.scaleText.textContent = txt; el.scaleBar.style.width = px + 'px'; } }
    if (now - (ui._lastStat || 0) > 250) { ui._lastStat = now; const zs = rowRefs.get('camera.zoom'); if (zs) zs(tok('camera.zoom')); el.dockstat.textContent = `${frame.tiles.filter((q) => q.life === 'live').length} tiles · ${frame.onField} units · zoom ${frame.zoom.toFixed(2)} · ${engine.compare === 'before' ? 'production-style' : engine.kernel.layout.has(tok('layout.strategy')) ? tok('layout.strategy') : ''}`; const map = document.getElementById('map'); if (map) map.setAttribute('aria-label', `Map of the Gettysburg battle on the aerial photograph: tick ${frame.tick} of 675, ${frame.clock.date}, about ${frame.clock.text} on a candidate clock; ${frame.onField} units shown as ${frame.tiles.filter((q) => q.life === 'live').length} tiles.`); }
    drawMetrics(now);
    if (ui.panelOpen && ui.tab === 'about') { const ab = el.pane.querySelector('#ab-ov'); if (ab) ab.textContent = String(engine.metricsOf('after').overlapPairs ?? 0); }
  };
  ui.setSelection = (tile) => { ui.inspectTile = tile; if (ui.panelOpen && ui.tab === 'inspect') renderChrome(); };      // D4 FORK: a selection opens the unit's card on the map, not the side panel (the Inspect button opens the panel on the selected unit)
  ui.togglePanel = togglePanel; ui.renderChrome = renderChrome; ui.syncMetrics = syncMetrics; ui.drawMarks = drawMarks; ui.setCompare = setCompare; ui.closeMenu = closeMenu; ui.toggleMenu = toggleMenu; ui.syncStyle = syncStyle; ui.chooseStyle = chooseStyle; ui.elements = el;
  /** the phone (under 760 px) shows one select for the style; the desktop shows the segmented control */
  const mq = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null; const narrow = () => { const n = !!(mq && mq.matches); segStyle.style.display = n ? 'none' : ''; el.styleSel.style.display = n ? '' : 'none'; };
  narrow(); if (mq && mq.addEventListener) mq.addEventListener('change', narrow);
  renderChrome(); syncMetrics(); syncStyle(); syncCompare(); setTimeout(drawMarks, 0);
  return ui;
}
