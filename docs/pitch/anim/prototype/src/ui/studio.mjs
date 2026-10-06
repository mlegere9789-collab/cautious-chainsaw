// ui/studio.mjs - the Studio chrome: top bar (scene, tick, clock), transport dock with the scrubber, the Tuning Studio / Inspector / About panel, and the metrics overlay.
// It reads the engine and the tuning and writes only through their public APIs (engine.transport, engine.sceneJump, tuning.set ...): the chrome can be replaced without touching the engine.
import { h, svgIcon, ICON, evBadge, fmt } from './dom.mjs';

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];

export function createStudioUI({ root, engine, data, onSafe }) {
  const { tuning, transport, kernel } = engine; const tok = engine.tok;
  const ui = { selectedKey: null, inspectTile: null, tab: 'tune', panelOpen: false, metricsOpen: false, status: '' };
  const el = {};

  // ---- top bar -------------------------------------------------------------------------------------------------------------------------------
  const sceneSel = h('select', { class: 'btn', 'aria-label': 'Jump to a scene', onchange: () => { const s = data.scenes.find((x) => x.id === sceneSel.value); if (s) { onSafe && onSafe(); engine.sceneJump(s); engine.select(null); } sceneSel.value = ''; } },
    h('option', { value: '' }, 'Scenes (computed hotspots)'), ...data.scenes.map((s) => h('option', { value: s.id }, `${s.name} · tick ${s.tick}`)));
  const skinSel = h('select', { class: 'btn skin-sel', 'aria-label': 'Skin', title: 'Skin: the registry of tile designs (Tune > Skin has the same switch)', onchange: () => { try { tuning.set('skin.id', skinSel.value); } catch (e) { ui.status = String(e.message); } } });
  const syncSkins = () => { skinSel.replaceChildren(...kernel.skins.list().map((k) => h('option', { value: k.id, selected: k.id === tok('skin.id') }, 'Skin: ' + k.label))); if (!kernel.skins.size) skinSel.append(h('option', { value: '' }, 'Skin: none registered')); };
  kernel.skins.subscribe(syncSkins); tuning.on('skin.id', syncSkins); syncSkins();
  el.tick = h('div', { class: 'tick' }, 'Tick 1 / 675'); el.clock = h('div', { class: 'clock' }, '');
  el.btnTune = h('button', { class: 'btn', 'aria-pressed': 'false', title: 'Tuning Studio (T)', onclick: () => togglePanel('tune') }, 'Tune');
  el.btnInspect = h('button', { class: 'btn', 'aria-pressed': 'false', title: 'Inspector (I)', onclick: () => togglePanel('inspect') }, 'Inspect');
  el.btnMetrics = h('button', { class: 'btn', 'aria-pressed': 'false', title: 'Metrics overlay (M)', onclick: () => tuning.set('metrics.overlay', !tok('metrics.overlay')) }, 'Metrics');
  el.btnAbout = h('button', { class: 'btn', 'aria-pressed': 'false', title: 'Legend and honesty (A)', onclick: () => togglePanel('about') }, 'About');
  const topbar = h('header', { id: 'topbar' },
    h('div', { class: 'brand' }, h('b', null, 'Battle Studio'), h('span', null, 'shared animation engine · prototype')),
    h('div', { class: 'clockbox', 'aria-live': 'off' }, el.tick, el.clock), sceneSel, skinSel, h('div', { class: 'spacer' }), el.btnInspect, el.btnTune, el.btnMetrics, el.btnAbout);

  // ---- dock ----------------------------------------------------------------------------------------------------------------------------------
  el.play = h('button', { class: 'tbtn play', 'aria-label': 'Play', title: 'Play / pause (Space)', onclick: () => transport.toggle() }, svgIcon(ICON.play));
  const stepBtn = (label, icon, d) => h('button', { class: 'tbtn', 'aria-label': label, title: label, onclick: () => { transport.pause(); transport.seek(Math.round((transport.target ?? transport.simTau)) + d, { ms: 100 }); } }, svgIcon(icon));
  const speedBtns = SPEEDS.map((s) => h('button', { class: 'tbtn', 'aria-pressed': String(s === 1), 'aria-label': s + 'x speed', title: s + '× speed', 'data-speed': s, onclick: () => transport.setSpeed(s) }, s === 0.25 ? '¼×' : s === 0.5 ? '½×' : s + '×'));
  el.dockstat = h('div', { class: 'dockstat' }, '');
  el.range = h('input', { type: 'range', min: 1, max: 675, step: 0.01, value: 1, 'aria-label': 'Tick', oninput: () => transport.seek(+el.range.value, { ms: 90 }), onpointerdown: () => { ui.scrubbing = true; }, onpointerup: () => { ui.scrubbing = false; }, onpointercancel: () => { ui.scrubbing = false; } });
  el.marks = h('canvas', { 'aria-hidden': 'true' }); el.tip = h('div', { class: 'scrubtip hidden' });
  const scrub = h('div', { class: 'scrub' }, el.marks, el.range, el.tip);
  el.honesty = h('div', { class: 'honesty' }, evBadge('Modelled'), h('span', { class: 'note' }, 'positions are hand-authored keyframes; motion between them is interpolated'), evBadge('Modelled'), h('span', { class: 'note' }, 'clock is a candidate, not reviewed'));
  el.honestyMini = h('div', { class: 'honesty-mini' }, evBadge('Modelled'), 'positions, motion between keyframes and the candidate clock');
  const dock = h('section', { id: 'dock', 'aria-label': 'Transport' },
    h('div', { class: 'transport' },
      h('div', { class: 'grp' }, h('button', { class: 'tbtn', 'aria-label': 'Go to tick 1', title: 'Start', onclick: () => transport.seek(1, { ms: 200 }) }, svgIcon(ICON.start)), stepBtn('Back one tick', ICON.stepBack, -1), el.play, stepBtn('Forward one tick', ICON.step, 1)),
      h('div', { class: 'grp speeds', role: 'group', 'aria-label': 'Speed' }, speedBtns), el.dockstat), scrub, el.honesty, el.honestyMini);

  // ---- panel ---------------------------------------------------------------------------------------------------------------------------------
  const tabs = ['tune', 'inspect', 'about'];
  el.tabBtns = Object.fromEntries(tabs.map((t) => [t, h('button', { role: 'tab', 'aria-selected': 'false', onclick: () => setTab(t) }, { tune: 'Tune', inspect: 'Inspect', about: 'About' }[t])]));
  el.pane = h('div', { class: 'pane', role: 'tabpanel' });
  const panel = h('aside', { id: 'panel', class: 'hidden', 'aria-label': 'Studio panel' }, h('div', { class: 'tabs', role: 'tablist' }, Object.values(el.tabBtns)), el.pane);

  // ---- metrics overlay ---------------------------------------------------------------------------------------------------------------------
  el.mcanvas = h('canvas', { width: 600, height: 108, 'aria-label': 'Frame interval graph' }); el.mrows = h('div', null);
  const metrics = h('div', { id: 'metrics', class: 'hidden', 'aria-label': 'Metrics' }, h('b', null, 'Metrics (live, measured)'), el.mcanvas, el.mrows,
    h('div', { class: 'btns' }, h('button', { onclick: () => engine.metrics.reset() }, 'Reset'), h('button', { onclick: () => download('battle-studio-metrics.json', JSON.stringify(engine.metrics.export({ tick: engine.frame?.tick, zoom: engine.camera.zoom, settings: tuning.diff(), userAgent: navigator.userAgent, dpr: devicePixelRatio }), null, 1)) }, 'Export JSON')));

  root.append(topbar, panel, metrics, dock);

  // ---- behaviour -----------------------------------------------------------------------------------------------------------------------------
  function togglePanel(tab) { if (ui.panelOpen && ui.tab === tab) { ui.panelOpen = false; } else { ui.panelOpen = true; ui.tab = tab; } renderChrome(); }
  function setTab(t) { ui.tab = t; ui.panelOpen = true; renderChrome(); }
  function renderChrome() {
    panel.classList.toggle('hidden', !ui.panelOpen);
    for (const t of tabs) el.tabBtns[t].setAttribute('aria-selected', String(ui.panelOpen && ui.tab === t));
    el.btnTune.setAttribute('aria-pressed', String(ui.panelOpen && ui.tab === 'tune')); el.btnInspect.setAttribute('aria-pressed', String(ui.panelOpen && ui.tab === 'inspect')); el.btnAbout.setAttribute('aria-pressed', String(ui.panelOpen && ui.tab === 'about'));
    if (ui.panelOpen) { el.pane.replaceChildren(...(ui.tab === 'tune' ? buildTune() : ui.tab === 'inspect' ? buildInspect() : buildAbout())); }
  }
  function download(name, text) { try { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch { ui.status = 'download blocked by the browser'; } }

  // ---- Tune tab ------------------------------------------------------------------------------------------------------------------------------
  const rowRefs = new Map();
  function optionsOf(def) { return def.type === 'select' ? def.options : kernel[def.registry].list().map((m) => ({ value: m.id, label: m.label })); }
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
  function buildTune() {
    rowRefs.clear(); const out = [];
    const search = h('input', { class: 'search', type: 'search', placeholder: 'Filter dials (name or text)', 'aria-label': 'Filter dials', oninput: () => { const q = search.value.toLowerCase(); for (const r of el.pane.querySelectorAll('.row')) { const d = tuning.defs.get(r.dataset.id); r.classList.toggle('hidden', !!q && !(d.label + ' ' + d.id + ' ' + d.doc).toLowerCase().includes(q)); } } });
    const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: async () => { try { const text = await file.files[0].text(); const r = tuning.import(JSON.parse(text)); ui.status = `imported ${r.applied.length}, rejected ${r.rejected.length}, unknown ${r.unknown.length}`; } catch (e) { ui.status = 'import failed: ' + e.message; } renderChrome(); } });
    const status = h('div', { class: 'note', role: 'status' }, ui.status || 'Changes apply live and are remembered in this browser.');
    out.push(h('div', { class: 'toolbar' },
      h('button', { class: 'btn', onclick: () => download('battle-studio-settings.json', JSON.stringify(tuning.export(), null, 1)) }, 'Export'), h('button', { class: 'btn', onclick: () => file.click() }, 'Import'),
      h('button', { class: 'btn', onclick: () => { tuning.reset(); ui.status = 'all dials reset'; renderChrome(); } }, 'Reset all'), file), search, status);
    for (const g of tuning.groups()) {
      const body = h('div', null, g.tokens.map(tokenRow)); let open = !['camera'].includes(g.id) || false; body.classList.toggle('hidden', !open);
      out.push(h('h3', null, h('button', { 'aria-expanded': String(open), onclick: (e) => { open = !open; body.classList.toggle('hidden', !open); e.currentTarget.setAttribute('aria-expanded', String(open)); } }, g.label)), body);
    }
    return out;
  }
  tuning.on('*', (value, id) => { const s = rowRefs.get(id); if (s) s(value); if (id === 'metrics.overlay') ui.metricsOpen = value, syncMetrics(); });
  kernel.skins.subscribe(() => { if (ui.panelOpen && ui.tab === 'tune') renderChrome(); });

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
        kv([['Side', t.side === 'mixed' ? 'both sides (Contact) or mixed with unknown' : t.side], ['Last keyframe', `${fmt(t.ageMin, 0)} to ${fmt(t.ageMax, 0)} ticks ago`]])));
      out.push(h('h3', null, 'Records'), h('div', { class: 'card' }, ...t.ids.slice(0, 40).map((id) => h('div', null, h('button', { class: 'btn', style: { padding: '2px 8px', margin: '2px 6px 2px 0' }, onclick: () => { engine.select(id); ui.inspectTile = f && f.tiles.find((q) => q.ids.includes(id) && q.kind === 'leaf') || { kind: 'leaf', ids: [id] }; renderChrome(); } }, id), engine.battle.units.get(id)?.label || '')), t.ids.length > 40 ? h('div', { class: 'note' }, `and ${t.ids.length - 40} more`) : null));
    }
    out.push(h('div', { class: 'toolbar' }, h('button', { class: 'btn', onclick: () => { engine.select(null); ui.inspectTile = null; renderChrome(); } }, 'Clear selection')));
    return out;
  }

  // ---- About tab -----------------------------------------------------------------------------------------------------------------------------
  function buildAbout() {
    const cnt = data.provenance.counts; const dsp = data.terrain.locations.filter((l) => data.terrain.disputed.includes(l.id)); const skin = kernel.skins.has(tok('skin.id')) ? kernel.skins.get(tok('skin.id')) : null; const out = [];
    out.push(h('p', { class: 'note' }, h('b', null, 'What you are looking at. '), `${cnt.units} real units and ${cnt.keyframes} real placement keyframes on ${cnt.populatedTicks} of 675 ticks, drawn on a schematic backdrop. Nothing is drawn that the data does not support; anything computed or modelled says so.`));
    out.push(h('h3', null, 'Evidence labels'));
    for (const [k, v] of [['Documented', 'printed in a named source (order-of-battle identity, id prefix)'], ['Measured', 'read by an instrument or counted from a record'], ['Computed', 'derived from data by a stated rule (counts, aggregates, ages)'], ['Modelled', 'authored or interpolated, not recorded: every position, every strength value, every clock time'], ['Contested', `the sources disagree (${data.provenance.counts.unknownSide} ids whose state code contradicts the prefix)`], ['Unknown', 'nobody has decided yet']]) out.push(h('div', { class: 'note', style: { margin: '3px 0' } }, evBadge(k), ' ', v));
    if (skin && skin.legend) { out.push(h('h3', null, 'Legend: ' + skin.label)); for (const e of skin.legend()) out.push(h('div', { class: 'legend' }, h('i', { style: { background: e.swatch } }), h('div', null, e.text, ' ', evBadge(e.evidence)))); }
    out.push(h('h3', null, 'Honest limits'),
      h('div', { class: 'warnbox' }, 'The clock is a candidate: 33 anchors, all proposed, none reviewed by a historian. Clock times are shown as ', h('b', null, 'about'), ' and with their uncertainty.'),
      h('div', { class: 'warnbox' }, `The backdrop is a grid, not terrain. Place marks follow the frame of the placements; ${data.terrain.disputed.length} of ${data.terrain.locations.length} places (dashed) sit ${Math.min(...dsp.map((l) => l.diffM))} to ${Math.max(...dsp.map((l) => l.diffM))} m from where production terrain.json puts them. Which frame is right is Unknown.`),
      h('div', { class: 'warnbox' }, `Under carry-forward a unit stays at its last keyframe until the battle ends. Most tiles are old keyframes; the outline channel shows how old. Choose another visibility rule in Tune > Layout.`));
    out.push(h('h3', null, 'Scenes (computed from the data)'));
    for (const s of data.scenes) out.push(h('div', { class: 'note', style: { margin: '4px 0' } }, h('b', null, s.name), ` tick ${s.tick}: ${s.why}. Nearest place in the data: ${s.nearestPlace.name}, ${s.nearestPlace.d} m (a label, not a claim).`));
    out.push(h('h3', null, 'Guarantee'), h('p', { class: 'note' }, 'Every displayed frame is checked by an independent verifier. Overlaps found so far: ', h('b', { id: 'ab-ov' }, String(engine.metrics.overlapPairs ?? 0)), '. Layout text widths: ', engine.text.source + '.'));
    return out;
  }

  // ---- metrics overlay ------------------------------------------------------------------------------------------------------------------------
  function syncMetrics() { ui.metricsOpen = tok('metrics.overlay'); metrics.classList.toggle('hidden', !ui.metricsOpen); el.btnMetrics.setAttribute('aria-pressed', String(ui.metricsOpen)); }
  let lastMetricsDraw = 0;
  function drawMetrics(now) {
    if (!ui.metricsOpen || now - lastMetricsDraw < 200) return; lastMetricsDraw = now;
    const m = engine.metrics.live(); const s = engine.metrics.summary();
    const row = (k, v, cls) => h('div', { class: 'mrow' }, h('span', null, k), h('span', { class: cls || '' }, v));
    el.mrows.replaceChildren(row('fps / p95 frame', `${fmt(m.fps, 1)} / ${fmt(m.dtP95, 1)} ms`, m.fps > 55 ? 'good' : m.fps < 40 ? 'bad' : ''), row('engine ms (solve)', `${fmt(s.engineMsMean, 1)} (${fmt(s.solveMsMean, 1)})`),
      row('tiles / units', `${fmt(s.tilesMean, 0)} / ${fmt(s.onFieldMean, 0)}`), row('pops / teleports per s', `${fmt(m.popsPerSec, 1)} / ${fmt(m.teleportsPerSec, 1)}`, m.teleportsPerSec === 0 ? 'good' : 'bad'),
      row('travels / net dims per s', `${fmt(s.travelsPerSec, 1)} / ${fmt(s.netDimsPerSec, 1)}`), row('overlap pairs (frames)', `${m.overlaps} (${m.overlapFrames})`, m.overlaps === 0 ? 'good' : 'bad'), row('unrepresented unit-frames', String(m.unrepresented), m.unrepresented === 0 ? 'good' : 'bad'),
      row('jerk p99 (px/frame²)', fmt(s.jerkP99, 3)), row('frames > 20 / 33 ms', `${fmt(s.framesOver20msPct, 1)}% / ${fmt(s.framesOver33msPct, 1)}%`));
    const c = el.mcanvas; const g = c.getContext('2d'); const W = c.width; const H = c.height; g.clearRect(0, 0, W, H);
    const ser = m.series; const n = ser.length; if (!n) return; const barW = W / Math.max(120, n);
    const y = (ms) => H - Math.min(1, ms / 50) * H;
    g.strokeStyle = 'rgba(160,170,180,0.35)'; g.lineWidth = 1; for (const ms of [16.7, 33.3]) { g.beginPath(); g.moveTo(0, y(ms)); g.lineTo(W, y(ms)); g.stroke(); }
    ser.forEach((r, i) => { g.fillStyle = r.dt > 33.4 ? '#e0553a' : r.dt > 20 ? '#e09a1a' : '#3aa675'; const top = y(r.dt); g.fillRect(i * barW, top, Math.max(1, barW - 0.5), H - top); if (r.teleports) { g.fillStyle = '#fff'; g.fillRect(i * barW, 0, Math.max(1, barW), 4); } });
  }

  // ---- scrubber marks -------------------------------------------------------------------------------------------------------------------------
  function drawMarks() {
    const c = el.marks; const r = c.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2); c.width = Math.max(10, Math.round(r.width * dpr)); c.height = Math.max(10, Math.round(r.height * dpr));
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const W = r.width; const H = r.height; const x = (t) => (t - 1) / 674 * (W - 4) + 2;
    const css = getComputedStyle(document.documentElement); const line = css.getPropertyValue('--line').trim() || '#2a323c'; const muted = css.getPropertyValue('--muted').trim() || '#9ba6b2';
    g.fillStyle = css.getPropertyValue('--panel2').trim() || '#1b2128'; g.fillRect(0, 6, W, H - 12);
    g.strokeStyle = line; g.lineWidth = 1; for (const t of [226, 451]) { g.beginPath(); g.moveTo(x(t), 2); g.lineTo(x(t), H - 2); g.stroke(); }
    g.fillStyle = muted; g.font = '10px system-ui, sans-serif'; g.textBaseline = 'top'; for (const [t, s] of [[1, 'July 1'], [226, 'July 2'], [451, 'July 3']]) g.fillText(s, x(t) + 4, 2);
    for (const e of data.events) { g.strokeStyle = e.significance === 'critical' ? '#e0553a' : e.significance === 'high' ? '#d9a21b' : '#6d7782'; g.lineWidth = 1; const hh = e.significance === 'critical' ? 14 : e.significance === 'high' ? 9 : 5; g.beginPath(); g.moveTo(x(e.tick) + 0.5, H - 6); g.lineTo(x(e.tick) + 0.5, H - 6 - hh); g.stroke(); }
    g.fillStyle = '#4d8fe0'; for (const s of data.scenes) { const px = x(s.tick); g.beginPath(); g.moveTo(px, 8); g.lineTo(px + 4, 12); g.lineTo(px, 16); g.lineTo(px - 4, 12); g.closePath(); g.fill(); }
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
    const t = engine.transport; const tickText = `Tick ${frame.tick} / 675`; if (tickText !== lastTickText) { el.tick.textContent = tickText; lastTickText = tickText; }
    const cl = frame.clock; const clockText = `${cl.date}, about ${cl.text} (±${cl.sigmaMin} min) · candidate clock`; if (clockText !== lastClockText) { el.clock.textContent = clockText; lastClockText = clockText; }
    el.play.setAttribute('aria-label', t.playing ? 'Pause' : 'Play'); const want = t.playing ? 'pause' : 'play'; if (el.play.dataset.state !== want) { el.play.dataset.state = want; el.play.replaceChildren(svgIcon(ICON[want])); }
    if (!ui.scrubbing) el.range.value = String(t.target ?? t.simTau);
    for (const b of speedBtns) b.setAttribute('aria-pressed', String(+b.dataset.speed === t.speed));
    if (now - (ui._lastStat || 0) > 250) { ui._lastStat = now; const zs = rowRefs.get('camera.zoom'); if (zs) zs(tok('camera.zoom')); el.dockstat.textContent = `${frame.tiles.filter((q) => q.life === 'live').length} tiles · ${frame.onField} units · zoom ${frame.zoom.toFixed(2)} · ${engine.kernel.layout.has(tok('layout.strategy')) ? tok('layout.strategy') : ''}`; const map = document.getElementById('map'); if (map) map.setAttribute('aria-label', `Schematic map of the Gettysburg battle: tick ${frame.tick} of 675, ${frame.clock.date}, about ${frame.clock.text} on a candidate clock; ${frame.onField} units shown as ${frame.tiles.filter((q) => q.life === 'live').length} tiles.`); }
    drawMetrics(now);
    if (ui.panelOpen && ui.tab === 'about') { const ab = el.pane.querySelector('#ab-ov'); if (ab) ab.textContent = String(engine.metrics.overlapPairs ?? 0); }
  };
  ui.setSelection = (tile) => { ui.inspectTile = tile; if (tile) { ui.panelOpen = true; ui.tab = 'inspect'; } renderChrome(); };
  ui.togglePanel = togglePanel; ui.renderChrome = renderChrome; ui.syncMetrics = syncMetrics; ui.drawMarks = drawMarks;
  renderChrome(); syncMetrics(); setTimeout(drawMarks, 0);
  return ui;
}
