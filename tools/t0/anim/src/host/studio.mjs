// host/studio.mjs - THE TUNING PANEL, hidden: it exists only when the page is opened with ?tune=1 (nothing is built, listened to or fetched otherwise).  It reads and writes the engine only through its public
// APIs (tuning.get/set, skinKit.setToken, kernel registries), so it can be replaced without touching the engine.
//
//   Motion and layout   one control per token of tokens/anim.tokens.json (a range, a switch or a select, with its unit and its documentation), grouped; every change is live and remembered in this browser
//   Skin                the active skin's own tokens (colours, sizes, detail zooms), live; the skin is chosen from the registry (a new skin registered with GTANIM.registerSkin appears by itself)
//   Numbers             frames per second, the 95th percentile of the frame time, marks drawn, overlaps found by the verifier (must be 0), teleports, net snaps, solve and draw milliseconds, the memory the page holds
//   Export / Import     the whole setting as JSON (the tuning file: gtanim-settings/1, plus the skin tokens); Reset; Legacy (the kill switch: the shipped renderer, remembered in this browser)
import { skinKit } from '../engine/skins/kit.mjs';

const CSS = `
#gta-studio { position: fixed; right: 12px; top: 56px; width: 356px; max-height: calc(100vh - 80px); z-index: 1200; display: flex; flex-direction: column; background: rgba(22,19,13,.96); color: #f4ecd8; border: 1px solid rgba(244,236,216,.2); border-top-color: #c9a24d; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,.4), 0 16px 40px rgba(0,0,0,.5); font: 400 12px/1.35 "QC Sans", Arial, sans-serif; }
#gta-studio * { box-sizing: border-box; font-family: inherit; } #gta-studio header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid rgba(244,236,216,.14); } #gta-studio header b { flex: 1; font-size: 13px; }
#gta-studio button, #gta-studio select, #gta-studio textarea { background: rgba(244,236,216,.08); color: inherit; border: 1px solid rgba(244,236,216,.2); border-radius: 3px; padding: 3px 8px; font-size: 12px; } #gta-studio button { cursor: pointer; } #gta-studio button:hover { background: rgba(244,236,216,.16); }
#gta-studio nav { display: flex; gap: 4px; padding: 6px 10px 0; } #gta-studio nav button[aria-selected="true"] { background: #f4ecd8; color: #17130c; }
#gta-studio .body { overflow-y: auto; padding: 8px 10px 10px; } #gta-studio h4 { margin: 10px 0 4px; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #c9a24d; }
#gta-studio .row { display: grid; grid-template-columns: 1fr 120px 52px; gap: 6px; align-items: center; padding: 3px 0; border-top: 1px solid rgba(244,236,216,.07); } #gta-studio .row label { cursor: help; } #gta-studio .row input[type=range] { width: 100%; } #gta-studio .row output { text-align: right; font-variant-numeric: tabular-nums; color: #cdc2a8; }
#gta-studio .row select { grid-column: 2 / 4; } #gta-studio .row input[type=color] { width: 100%; height: 22px; padding: 0; } #gta-studio .num { display: grid; grid-template-columns: 1fr auto; padding: 2px 0; } #gta-studio .num b { font-variant-numeric: tabular-nums; }
#gta-studio .bad { color: #f2905a; } #gta-studio .foot { display: flex; gap: 6px; padding: 8px 10px; border-top: 1px solid rgba(244,236,216,.14); flex-wrap: wrap; } #gta-studio textarea { width: 100%; height: 90px; font: 11px/1.3 monospace; }
`;

export function createStudio(S) {
  const doc = window.document; const st = { tab: 'tune', open: true, timer: 0, root: null, body: null };
  const style = doc.createElement('style'); style.textContent = CSS; doc.head.appendChild(style);
  const h = (tag, attrs, ...kids) => { const e = doc.createElement(tag); if (attrs) for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : doc.createTextNode(String(k))); return e; };
  const E = () => S.core;
  const fmt = (d, v) => (d.type === 'number' ? (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2)) + (d.unit ? ' ' + d.unit : '') : String(v));

  function tokenRow(def) {
    const T = E().tuning; const id = def.id; const v = T.get(id); const lab = h('label', { title: def.doc + (def.evidence ? ' [' + def.evidence + ']' : '') }, def.label || id);
    if (def.type === 'number') { const out = h('output', null, fmt(def, v)); const r = h('input', { type: 'range', min: def.min, max: def.max, step: def.step, value: v, 'aria-label': def.label, oninput: () => { try { T.set(id, +r.value); out.textContent = fmt(def, +r.value); } catch (e) { out.textContent = 'x'; } } }); return h('div', { class: 'row' }, lab, r, out); }
    if (def.type === 'boolean') { const c = h('input', { type: 'checkbox', checked: v, 'aria-label': def.label, onchange: () => T.set(id, c.checked) }); return h('div', { class: 'row' }, lab, c, h('span')); }
    const opts = def.type === 'registry' ? E().kernel[def.registry].ids().map((x) => ({ value: x, label: x })) : def.options; const sel = h('select', { 'aria-label': def.label, onchange: () => T.set(id, sel.value) }, opts.map((o) => h('option', { value: o.value, selected: o.value === v }, o.label || o.value)));
    return h('div', { class: 'row' }, lab, sel);
  }
  function skinRows() {
    const out = []; const E0 = E(); const id = E0.tok('skin.id'); const sk = E0.kernel.skins.has(id) ? E0.kernel.skins.get(id) : null; if (!sk || !sk.tokenDocs) return out;
    const P = sk.skin.P;
    for (const [name, d] of sk.tokenDocs.byName) {
      const lab = h('label', { title: d.doc }, name); const v = P[name];
      const set = (x) => { try { skinKit.setToken(id, name, x); E0.dirty = true; } catch (e) { /* out of range: ignored */ } };
      if (d.type === 'number') { const out2 = h('output', null, v); const r = h('input', { type: 'range', min: d.min ?? 0, max: d.max ?? Math.max(10, v * 3), step: (d.max - d.min) > 20 ? 1 : 0.05, value: v, 'aria-label': name, oninput: () => { set(+r.value); out2.textContent = r.value; } }); out.push(h('div', { class: 'row' }, lab, r, out2)); }
      else if (d.type === 'boolean') { const c = h('input', { type: 'checkbox', checked: v, 'aria-label': name, onchange: () => set(c.checked) }); out.push(h('div', { class: 'row' }, lab, c, h('span'))); }
      else if (d.type === 'color') { const c = h('input', { type: 'color', value: v, 'aria-label': name, oninput: () => set(c.value) }); out.push(h('div', { class: 'row' }, lab, c, h('span'))); }
      else { const t = h('input', { type: 'text', value: v, 'aria-label': name, onchange: () => set(t.value) }); out.push(h('div', { class: 'row' }, lab, t, h('span'))); }
    }
    return out;
  }
  function tuneTab() {
    const T = E().tuning; const out = [];
    const sk = h('select', { 'aria-label': 'Skin', onchange: () => { T.set('skin.id', sk.value); render(); } }, E().kernel.skins.list().map((s) => h('option', { value: s.id, selected: s.id === T.get('skin.id') }, s.label + ' (' + s.version + ')')));
    out.push(h('h4', null, 'Skin'), h('div', { class: 'row' }, h('label', null, 'Active skin'), sk));
    for (const g of T.groups()) { out.push(h('h4', null, g.label)); for (const d of g.tokens) if (d.id !== 'skin.id') out.push(tokenRow(d)); }
    return out;
  }
  function skinTab() { return [h('h4', null, 'Tokens of the active skin (live)'), ...skinRows()]; }
  const numLine = (k, v, bad) => h('div', { class: 'num' }, h('span', null, k), h('b', { class: bad ? 'bad' : '' }, v));
  function numbersTab() {
    const E0 = E(); const m = E0.metrics.summary({ maxAgeMs: 400 }); const rs = S.renderer ? S.renderer.stats : {}; const mem = window.performance && window.performance.memory ? (window.performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'n/a';
    return [h('h4', null, 'Frames'), numLine('frames per second (mean)', m.fpsMean), numLine('frame time p50 / p95 / max (ms)', m.dtMsP50 + ' / ' + m.dtMsP95 + ' / ' + m.dtMsMax), numLine('frames over 20 ms / 33 ms (%)', m.framesOver20msPct + ' / ' + m.framesOver33msPct),
      h('h4', null, 'Picture'), numLine('marks drawn / laid out', (rs.tilesDrawn || 0) + ' / ' + (E0.frame ? E0.frame.laid : 0)), numLine('overlapping pairs found (must be 0)', m.overlapPairs, m.overlapPairs > 0), numLine('frames with an overlap', m.overlapFrames, m.overlapFrames > 0), numLine('unrepresented units', m.unrepresentedUnitFrames, m.unrepresentedUnitFrames > 0),
      numLine('pops / teleports per second', m.popsPerSec + ' / ' + m.teleportsPerSec), numLine('snaps by the net (total)', m.netDimsTotal), numLine('forced re-solves', E0.forcedSolves),
      h('h4', null, 'Cost'), numLine('engine ms per frame (mean / p95)', m.engineMsMean + ' / ' + m.engineMsP95), numLine('solve ms (mean / p99)', m.solveMsMean + ' / ' + m.solveMsP99), numLine('draw ms (last frame)', (rs.drawMs || 0).toFixed(2)), numLine('solve every N frames (auto)', E0.autoEvery()), numLine('JS heap', mem),
      h('div', { class: 'foot' }, h('button', { onclick: () => { E0.metrics.reset(); } }, 'Reset numbers'))];
  }
  function exportJson() { const E0 = E(); const id = E0.tok('skin.id'); return JSON.stringify({ ...E0.tuning.export(), skinTokens: skinKit.exportTokens(id), engine: window.__gtanim ? window.__gtanim.version : null }, null, 1); }
  function ioTab() {
    const ta = h('textarea', { 'aria-label': 'Settings JSON' }); ta.value = exportJson(); const msg = h('div', null, '');
    return [h('h4', null, 'The tuning file'), ta, h('div', { class: 'foot' }, h('button', { onclick: () => { ta.value = exportJson(); window.__gtanimExport = ta.value; try { window.navigator.clipboard.writeText(ta.value); msg.textContent = 'copied'; } catch { msg.textContent = 'export refreshed'; } } }, 'Export'),
      h('button', { onclick: () => { try { const o = JSON.parse(ta.value); const r = E().tuning.import(o); if (o.skinTokens) for (const [sid, toks] of Object.entries(o.skinTokens)) for (const [n, v] of Object.entries(toks)) { try { skinKit.setToken(sid, n, v); } catch { /* ignored */ } } msg.textContent = r.applied.length + ' applied, ' + r.rejected.length + ' rejected, ' + r.unknown.length + ' unknown'; render(); } catch (e) { msg.textContent = 'not valid JSON'; } } }, 'Import'),
      h('button', { onclick: () => { E().tuning.reset(); render(); } }, 'Reset to defaults'),
      h('button', { title: 'Switch this browser to the shipped renderer (the kill switch)', onclick: () => { try { window.localStorage.setItem('gtanim_off', '1'); } catch { /* storage blocked */ } window.location.reload(); } }, 'Legacy renderer')), msg];
  }
  const TABS = { tune: ['Motion and layout', tuneTab], skin: ['Skin', skinTab], numbers: ['Numbers', numbersTab], io: ['Export', ioTab] };
  function render() {
    if (!st.root) return; const nav = st.root.querySelector('nav'); nav.replaceChildren(...Object.entries(TABS).map(([k, [lab]]) => h('button', { role: 'tab', 'aria-selected': String(k === st.tab), onclick: () => { st.tab = k; render(); } }, lab)));
    st.body.replaceChildren(...TABS[st.tab][1]());
  }
  function build() {
    st.body = h('div', { class: 'body' }); st.root = h('aside', { id: 'gta-studio', role: 'dialog', 'aria-label': 'Animation tuning' }, h('header', null, h('b', null, 'Animation tuning'), h('button', { 'aria-label': 'Close', onclick: () => { st.root.remove(); window.clearInterval(st.timer); st.root = null; } }, '✕')), h('nav', { role: 'tablist' }), st.body);
    doc.body.appendChild(st.root); render();
    st.timer = window.setInterval(() => { if (st.root && st.tab === 'numbers') st.body.replaceChildren(...numbersTab()); }, 500);
  }
  const wait = window.setInterval(() => { if (S.core) { window.clearInterval(wait); build(); } }, 200);
  return { open: build, state: st };
}
