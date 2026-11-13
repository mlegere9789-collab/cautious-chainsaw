// Top bar, clock face, condition chips, panel management, keyboard shortcuts, touch pad. All listeners go through the session scope.
import { fmtDate, fmtTime, fmtShort, BATTLE, EPILOGUE, parts } from '../clock.mjs';
import { BAND_NAMES } from '../environment.mjs';
import { TIER_STYLE, TIERS } from '../config.mjs';
import { glyphSVG } from '../overlay.mjs';
import { PANELS } from './panels.mjs';

const EDIT = /^(INPUT|TEXTAREA|SELECT)$/;
const ic = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const $ = (r, s) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const skyWord = c => c == null ? null : c < .15 ? 'Clear' : c < .45 ? 'Partly cloudy' : c < .85 ? 'Mostly cloudy' : 'Overcast';

export function mountChrome(th) {
  const sc = th.scope, root = th.root, el = {
    date: $(root, '#bt-date'), time: $(root, '#bt-time'), sec: $(root, '#bt-sec'), sub: $(root, '#bt-sub'), chips: $(root, '#bt-chips'), count: $(root, '#bt-count'), legend: $(root, '#bt-legend'),
    drawer: $(root, '#bt-drawer'), title: $(root, '#bt-drawer-title'), body: $(root, '#bt-drawer-body'), ovBtn: $(root, '#bt-overlay-toggle'), pad: $(root, '#bt-pad'), canvas: th.els.canvas, back: $(root, '#bt-back'),
  };
  th.els.chrome = el;
  sc.on(el.back, 'click', () => th.opts.onBack?.());
  // ---- panels (one drawer at a time)
  let openName = null, opener = null, openP = null;
  const tools = [...root.querySelectorAll('.tool[data-panel]')];
  const panelOf = name => PANELS[name] || (th.panelFor ? th.panelFor(name) : null);      // the shell's own panels, then the added ones (ui/ext-panel.mjs)
  function openPanel(name, from) {
    if (openName === name) return closePanel(true);
    const P = panelOf(name); if (!P) return;                                               // no such panel (an added panel that is gone)
    if (openName) { const prev = openName; openP?.dispose?.(); openP = null; th.bus.emit('panel-close', prev); }      // one drawer: the panel it replaces is ended first
    const tool = PANELS[name] ? name : 'more';                                             // an added panel is reached through the More tool
    openName = name; openP = P; opener = from || tools.find(b => b.dataset.panel === tool) || null; th.state.panel = name;
    tools.forEach(b => b.setAttribute('aria-expanded', String(b.dataset.panel === tool)));
    el.title.textContent = P.title; el.body.replaceChildren(); P.render(el.body, th); el.drawer.hidden = false; el.drawer.dataset.panel = name;
    sc.timeout(() => { const f = el.body.querySelector('[data-autofocus]') || el.body; f.focus({ preventScroll: true }); }, 30);
    th.bus.emit('panel-open', name);
  }
  function closePanel(restore) {
    if (!openName) return; const name = openName; openP?.dispose?.(); openP = null; openName = null; th.state.panel = null; el.drawer.hidden = true; el.body.replaceChildren();
    tools.forEach(b => b.setAttribute('aria-expanded', 'false')); if (restore && opener && opener.isConnected && !opener.hidden) opener.focus({ preventScroll: true }); th.bus.emit('panel-close', name);
  }
  tools.forEach(b => sc.on(b, 'click', () => openPanel(b.dataset.panel, b)));
  sc.on($(root, '#bt-drawer-close'), 'click', () => closePanel(true));
  th.bus.on('panel', name => openPanel(name), sc);
  sc.add(() => { openP?.dispose?.(); openP = null; });
  // ---- evidence overlay
  function setOverlay(on) {
    th.state.overlay = on; el.ovBtn.setAttribute('aria-pressed', String(on)); el.legend.hidden = !on;
    if (on && !el.legend.childElementCount) el.legend.innerHTML = TIERS.map(t => `<span>${glyphSVG(t, 16)}${esc(TIER_STYLE[t].label)}</span>`).join('') + `<span style="color:var(--muted)">Click a mark for its sources</span>`;
    th.announce(on ? 'Evidence marks on. Units are outlined by how well the record supports them.' : 'Evidence marks off.');
  }
  sc.on(el.ovBtn, 'click', () => setOverlay(!th.state.overlay)); th.setOverlay = setOverlay;
  // ---- clock face
  let lastMin = -1, lastSec = -1, chipSig = '', cntSig = '';
  function paint(force) {
    const t = th.state.t, ch = th.state.chapter, p = parts(t), showSec = th.state.speed <= 1 || !th.state.playing;
    const minKey = Math.floor(t), secKey = showSec ? Math.floor(t * 60) : -2;
    if (minKey !== lastMin || force) { lastMin = minKey; el.date.textContent = fmtDate(t, true); el.time.textContent = fmtTime(t); el.sub.textContent = ch === 'epilogue' ? 'Local mean time · epilogue chapter' : 'Local mean time'; }
    if (secKey !== lastSec || force) { lastSec = secKey; el.sec.textContent = showSec ? ':' + String(p.ss).padStart(2, '0') : ''; }
  }
  function paintChips() {
    const s = th.sample, w = th.wx, bits = [], sig = [];
    const alt = Math.round(s.sunAlt); bits.push(`<li title="Sun altitude ${s.sunAlt.toFixed(1)}°, azimuth ${s.sunAz.toFixed(0)}°. ${s.src === 'table' ? 'From the per-minute sky table.' : 'Computed in the page (the table ends on 6 July).'}">${ic(s.band >= 3 ? 'moon' : 'sun')}${BAND_NAMES[s.band]}, sun ${Math.abs(alt)}° ${alt >= 0 ? 'up' : 'below'}</li>`);
    bits.push(`<li title="Moon altitude ${s.moonAlt.toFixed(1)}°, ${s.moonIllum.toFixed(0)}% of the disc lit">${ic('moon')}${s.moonUp ? `Moon ${s.moonIllum.toFixed(0)}% lit, ${Math.round(s.moonAlt)}° up` : 'Moon below the horizon'}</li>`);
    if (!w.record) bits.push(`<li data-kind="gap" title="${esc(w.sky)}">${ic('cloud')}No weather record</li>`);
    else {
      const sw = skyWord(w.cloud), pre = w.precip;
      bits.push(`<li title="${esc(w.sky)}">${ic(pre.kind !== 'none' ? 'rain' : 'cloud')}${pre.kind !== 'none' ? esc((pre.kind === 'storm' ? 'Storm · ' : 'Rain · ') + pre.text.replace(/ \(.*/, '')) : (sw || 'Sky not recorded')}${w.flags.length ? ' · conflict carried' : ''}</li>`);
      if (w.tempF != null) bits.push(`<li title="Between Jacobs's readings at 07:00, 14:00 and 21:00 (secondary sources); in-between values are interpolated, not measured.">about ${Math.round(w.tempF)} °F</li>`);
    }
    const html = bits.join(''); if (html !== chipSig) { chipSig = html; el.chips.innerHTML = html; }
  }
  function paintCount() {
    const k = th.stats; if (!k) return; const sig = `${k.soldiers}|${k.guns}|${k.units}`; if (sig === cntSig) return; cntSig = sig;
    const stub = th.layer.meta.stub, cn = th.layer.counts;
    el.count.innerHTML = stub ? (k.soldiers ? `<b>${k.soldiers.toLocaleString('en-US')}</b> soldiers · <b>${k.guns}</b> guns · <b>${k.units}</b> units on the field<br>All are Modelled placeholders` : `<b>No units on the field</b> at this time in the placeholder<br>(a unit never appears before its arrival window opens)`)
      : (k.soldiers ? `<b>${k.soldiers.toLocaleString('en-US')}</b> figures · <b>${k.units}</b> units placed on the field<br>${cn.not_drawn.toLocaleString('en-US')} more units have no place in the record (open gap)` : `<b>No placed unit is on the field</b> at this time<br>${cn.not_drawn.toLocaleString('en-US')} units have no place in the record (open gap)`);
  }
  let chipAt = 0;
  th.bus.on('frame', () => { paint(false); const n = performance.now(); if (n - chipAt > 400) { chipAt = n; paintChips(); paintCount(); } }, sc);
  th.bus.on('time', () => { paint(true); }, sc); paint(true);
  th.bus.on('scenario', () => { chipAt = 0; }, sc);
  // ---- keyboard
  const step = (min) => th.setTime(th.state.t + min, { say: `${fmtDate(th.state.t + min)} ${fmtTime(th.state.t + min)}` });
  sc.on(document, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target, k = e.key;
    if (k === 'Escape' && openName && !(t && t.tagName === 'SELECT')) { e.preventDefault(); closePanel(true); return; }      // Escape closes a panel even from its search box
    if (t && EDIT.test(t.tagName)) return;
    const onBtn = t && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SUMMARY');
    if (k === ' ' && !onBtn) { e.preventDefault(); th.setPlaying(!th.state.playing); }
    else if (k === ',' || k === '<') { e.preventDefault(); step(e.shiftKey ? -60 : -10); }
    else if (k === '.' || k === '>') { e.preventDefault(); step(e.shiftKey ? 60 : 10); }
    else if (k === '[') { const ev = th.nextEvent(-1); if (ev) th.jumpEvent(ev); }
    else if (k === ']') { const ev = th.nextEvent(1); if (ev) th.jumpEvent(ev); }
    else if (k === '-' || k === '_') th.bus.emit('speed-step', -1);
    else if (k === '+' || k === '=') th.bus.emit('speed-step', 1);
    else if (k === 'o' || k === 'O') setOverlay(!th.state.overlay);
    else if (k === '?' || k === 'h' || k === 'H') openPanel('info');
    else if (k === 'Home') th.setView('overview');
    else if (k === 'Escape') { if (openName) closePanel(true); else if (th.state.selected >= 0) th.select(-1); else if (th.state.selectedObj >= 0) th.selectObject(-1); else th.controls.cancelAuto(); }
  });
  // ---- touch pad
  const stick = $(root, '#bt-stick'), knob = $(stick, '.stick-knob'); let sid = null;
  const mv = e => { const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx);
    th.controls.stick.x = Math.cos(a) * m; th.controls.stick.y = -Math.sin(a) * m; th.controls.cancelAuto(); knob.style.transform = `translate(${Math.cos(a) * m * 33}px, ${Math.sin(a) * m * 33}px)`; };
  sc.on(stick, 'pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(e.pointerId); mv(e); });
  sc.on(stick, 'pointermove', e => { if (e.pointerId === sid) mv(e); });
  const rel = e => { if (e.pointerId === sid) { sid = null; th.controls.stick.x = th.controls.stick.y = 0; knob.style.transform = ''; } };
  sc.on(stick, 'pointerup', rel); sc.on(stick, 'pointercancel', rel);
  for (const [id, v] of [['#bt-rise', 1], ['#bt-sink', -1]]) { const b = $(root, id); sc.on(b, 'pointerdown', e => { b.setPointerCapture(e.pointerId); th.controls.rise = v; th.controls.cancelAuto(); }); sc.on(b, 'pointerup', () => { th.controls.rise = 0; }); sc.on(b, 'pointercancel', () => { th.controls.rise = 0; }); }
  th.closePanel = closePanel; th.openPanel = openPanel;
}
