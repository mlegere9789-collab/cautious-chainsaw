// ui/narration.mjs - the NARRATION card: the words of a guided tour (and of the welcome), with the step's evidence chips, a live readout of what the current renderer is doing, the measured
// before/after table, a progress bar and the controls (previous, pause, next, close).  A column on the left of the map on a desktop, a strip above the dock on a phone.  It decides nothing: the
// director (tours/director.mjs) hands it a caption and progress, the app wires the buttons.  Every string goes in through textContent.
import { h, svgIcon, ICON } from './dom.mjs';
import { fmtCell } from '../tours/report.mjs';

export function createNarration({ root, engine, onPrev, onNext, onPause, onClose, onLayout = () => {} }) {
  const el = {};
  const btn = (label, ic, run) => h('button', { type: 'button', 'aria-label': label, title: label, onclick: run }, svgIcon(ICON[ic] || ic));
  el.kicker = h('div', { class: 'nar-kicker' }); el.title = h('h2', { class: 'nar-title' }); el.text = h('p', { class: 'nar-text' }); el.chips = h('div', { class: 'nar-chips' });
  el.live = h('div', { class: 'nar-live hidden' }); el.table = h('div', null); el.actions = h('div', { class: 'nar-actions hidden' });
  el.prev = btn('Previous step', ICON.stepBack, () => onPrev()); el.pause = btn('Pause the tour', ICON.pause, () => onPause()); el.next = btn('Next step', ICON.step, () => onNext()); el.close = btn('Close (Esc)', ICON.close, () => onClose());
  el.btns = h('div', { class: 'nar-btns' }, el.prev, el.pause, el.next, el.close);
  el.bar = h('i'); el.barWrap = h('div', { class: 'nar-bar', role: 'progressbar', 'aria-label': 'Tour progress', 'aria-valuemin': '0', 'aria-valuemax': '100' }, el.bar);
  el.steps = h('div', { class: 'nar-steps' }); el.foot = h('div', { class: 'nar-foot' }); el.body = h('div', null);
  const card = h('aside', { id: 'narration', class: 'nar glass hidden', 'aria-label': 'Guided tour', 'aria-live': 'polite', 'data-chrome': '' }, h('div', { class: 'nar-head' }, el.kicker, el.btns), el.body, el.barWrap, el.steps, el.foot);
  el.body.append(el.title, el.text, el.chips, el.live, el.table, el.actions);
  root.append(card);

  const N = { open: false, mode: 'tour', caption: null, paused: false, lastLive: 0 };
  const ev = (c) => h('span', { class: 'ev-pair' }, h('span', { class: 'ev ev-' + c.ev }, c.ev), c.text ? h('span', null, c.text) : null);
  const retrigger = () => { el.body.classList.remove('nar-in'); void el.body.offsetWidth; el.body.classList.add('nar-in'); };

  function render(c) {
    el.kicker.textContent = c.kicker || ''; el.title.textContent = c.title || ''; el.text.textContent = c.text || '';
    el.chips.replaceChildren(...(c.chips || []).map(ev));
    // measured table (before / after)
    if (c.table) {
      const rows = c.table; const better = (r) => (r.higherBetter ? r.after >= r.before : r.after <= r.before);
      const tbl = h('table', { class: 'nar-table', 'aria-label': 'Measured on this run, before and after' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Before'), h('th', null, 'After'))),
        h('tbody', null, rows.map((r) => h('tr', { title: r.hint }, h('td', null, r.label), h('td', { class: better(r) ? 'worse' : '' }, fmtCell(r.before, r)), h('td', { class: better(r) ? 'better' : '' }, fmtCell(r.after, r))))));
      el.table.replaceChildren(tbl);
    } else el.table.replaceChildren();
    el.live.classList.toggle('hidden', !c.live); N.lastLive = 0;
    el.actions.replaceChildren(...(c.actions || []).map((a) => h('button', { type: 'button', class: 'btn' + (a.primary ? ' primary' : ''), onclick: a.run }, a.label)));
    el.actions.classList.toggle('hidden', !(c.actions && c.actions.length));
  }
  const api = {
    get open() { return N.open; },
    /** a tour step: caption = { kicker, title, text, chips, table?, live?, step, steps } */
    show(c) {
      const again = c.refresh && N.open && N.mode === 'tour'; N.caption = c; N.mode = 'tour'; N.open = true; render(c); card.classList.remove('hidden'); card.dataset.mode = 'tour';
      for (const b of [el.prev, el.pause, el.next]) b.classList.remove('hidden'); el.barWrap.classList.remove('hidden'); el.steps.classList.remove('hidden'); el.foot.classList.remove('hidden');
      el.steps.replaceChildren(...Array.from({ length: c.steps || 0 }, (_, i) => h('i', { class: i + 1 < c.step ? 'done' : i + 1 === c.step ? 'cur' : '' })));
      if (!again) retrigger(); onLayout();
    },
    /** the welcome card: the same card without tour controls, with its own buttons */
    welcome(c) {
      N.caption = c; N.mode = 'welcome'; N.open = true; render(c); card.classList.remove('hidden'); card.dataset.mode = 'welcome';
      for (const b of [el.prev, el.pause, el.next]) b.classList.add('hidden'); el.barWrap.classList.add('hidden'); el.steps.classList.add('hidden'); el.foot.classList.add('hidden');
      retrigger(); onLayout();
    },
    hide() { if (!N.open) return; N.open = false; card.classList.add('hidden'); onLayout(); },
    progress(p) {
      el.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, p.frac)).toFixed(4)})`; el.barWrap.setAttribute('aria-valuenow', String(Math.round(p.frac * 100)));
      const total = p.tour ? p.tour.steps.reduce((a, s) => a + s.ms, 0) : 0; const t = p.frac * total / 1000; el.foot.textContent = `${t.toFixed(0)} s of ${(total / 1000).toFixed(0)} s`;
    },
    setPaused(paused) { N.paused = paused; el.pause.setAttribute('aria-label', paused ? 'Resume the tour' : 'Pause the tour'); el.pause.title = paused ? 'Resume the tour' : 'Pause the tour'; el.pause.replaceChildren(svgIcon(paused ? ICON.play : ICON.pause)); },
    /** the live readout of the running renderer (a caption with live: true shows it) */
    update(now) {
      if (!N.open || !N.caption || !N.caption.live || now - N.lastLive < 200) return; N.lastLive = now;
      const s = engine.metrics.summary({ maxAgeMs: 900 }); const f = engine.frame; const mode = engine.compare;
      const cell = (v, label) => h('div', null, h('b', null, v), h('span', null, label));
      el.live.className = 'nar-live ' + mode;
      el.live.replaceChildren(cell(s.jumpsPerSec.toFixed(1), 'sudden jumps per second, this run'), cell(f && f.overlaps != null ? String(f.overlaps) : '0', 'overlapping pairs on this frame'), cell(String(f ? f.tiles.filter((t) => t.life === 'live').length : 0), 'tiles for ' + (f ? f.onField : 0) + ' units'));
    },
    get element() { return card; },
    get width() { return N.open ? card.getBoundingClientRect().width : 0; },
  };
  return api;
}
