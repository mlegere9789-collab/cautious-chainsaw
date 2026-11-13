// Later memorials: the monuments, memorials, markers and tablets of the site's Monuments section, offered in the theatre as what they are.
// They were put up after the battle, so nothing here is ever part of the 1863 scene: a memorial is a flat mark on this module's own canvas over the picture, labelled
// "later memorial", and the layer is OFF at every entry (no canvas exists until the viewer switches it on or picks a memorial from the list). All 512 can be found, read
// and flown to; a memorial beyond the loaded ground is viewed from the edge of the ground and says so. The year a memorial was put up is not in the site's data and is
// shown as an open gap. The rules, the words and the layout are in ./site-places.mjs (pure, tested under node); this file is the page side only.
import * as P from './site-places.mjs';

let S = null;                                   // the state of one visit: set by init, cleared by dispose (the module object outlives a visit)

const doc = () => globalThis.document;
const el = (tag, props = {}, html = null) => { const n = doc().createElement(tag); for (const k of Object.keys(props)) { if (k === 'style') n.style.cssText = props[k]; else if (k.startsWith('aria-') || k === 'role' || k === 'for' || k === 'type' || k === 'placeholder') n.setAttribute(k, props[k]); else n[k] = props[k]; } if (html != null) n.innerHTML = html; return n; };
// The notice sits in the left column on a wide screen. On a phone the shell hides its own legend and lays the column out loose, so the notice is put under the clock face
// (its height is read, not guessed) and stays on the picture: the notice is the label of the layer and is never hidden while the layer is on.
const CSS = `#xm-chip{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:9px 14px;border-radius:12px;background:var(--panel);border:1px solid rgba(58,58,86,.65);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:12px;line-height:1.4;color:var(--text-2);box-shadow:0 12px 40px rgba(0,0,0,.3)}
#xm-chip[hidden]{display:none}
#xm-chip>span{display:inline-flex;align-items:center;gap:7px}
.theatre[data-card="on"] #xm-chip .xm-chip-text{display:none}
@media (max-width:760px){#xm-chip{position:absolute;z-index:12;left:var(--gut);right:var(--gut);top:calc(var(--top-h) + var(--safe-t) + var(--xm-clock-h,92px) + 18px);padding:7px 11px;gap:4px 10px;font-size:11.5px}#xm-chip .btn-s{min-height:30px}}`;

export async function init(ctx) {
  const URLS = ctx.urls, th = ctx.theatre;
  const res = await fetch(URLS.data + 'site-memorials.json'); if (!res.ok) throw new Error(`the memorial list could not be read (HTTP ${res.status})`);
  const data = await res.json();
  const bad = P.validateMemorials(data); if (bad.length) throw new Error(`the memorial list is not fit to show: ${bad[0]}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''}`);
  const int1 = await P.selfCheck(data, [['monuments', 'monumentsSha256'], ['stars', 'starsSha256']]);
  if (int1.checked && !int1.ok) throw new Error(`the memorial list no longer matches the hash recorded with it (${int1.bad.join(', ')}); it is not shown`);
  // the years some National Park Service reports print for memorials of the same name (every other year is an open gap)
  const yres = await fetch(URLS.data + 'site-memorial-years.json'); if (!yres.ok) throw new Error(`the memorial years could not be read (HTTP ${yres.status})`);
  const years = await yres.json();
  const badY = P.validateYears(years, data); if (badY.length) throw new Error(`the memorial years are not fit to show: ${badY[0]}${badY.length > 1 ? ` (and ${badY.length - 1} more)` : ''}`);
  const int2 = await P.selfCheck(years, [['years', 'yearsSha256']]);
  if (int2.checked && !int2.ok) throw new Error('the memorial years no longer match the hash recorded with them; they are not shown');
  const integrity = { checked: int1.checked && int2.checked, ok: int1.ok && int2.ok, bad: [...int1.bad, ...int2.bad.map(x => 'years')] };
  if (th.dead || !th.root) return;                                                // the visit ended while the list was being read
  const T = th.T, index = P.buildIndex(data, T, { positions: 'list', years });
  const s = S = { ctx, th, T, data, years, index, integrity, positions: 'list', on: false, selected: -1, canvas: null, c2d: null, w: 0, h: 0, dpr: 1, vp: new Float32Array(16), L: P.newLayout(index.n), last: new Float64Array(10), fresh: true, drawn: 0,
    tier: ctx.tierMark.style(P.LAYER.tier), ac: new AbortController(), chip: null, card: null, style: null, ro: null, toggle: null, panel: null, list: { q: '', side: 'all', group: 'all', where: 'all', shown: 60 }, tap: null };
  const sig = { signal: s.ac.signal }, left = th.root.querySelector('#bt-left'), stage = th.els.stage;

  // ---- the notice that is on the picture for as long as the layer is on
  s.style = el('style', { id: 'xm-style' }); s.style.textContent = CSS; th.root.append(s.style);
  s.chip = el('div', { id: 'xm-chip', hidden: true, role: 'note', 'aria-label': 'Later memorials are shown' });
  s.chip.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('[data-act]') : null; if (!b || !S) return; if (b.dataset.act === 'hide') S.toggle.set(false); else if (b.dataset.act === 'about') S.panel.open(); }, sig);
  // ---- the card of a picked memorial (the shell's own card element belongs to units and structures)
  s.card = el('aside', { id: 'xm-card', className: 'card', hidden: true, role: 'complementary', 'aria-labelledby': 'xm-card-title' });
  s.card.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('[data-act]') : null; if (!b || !S) return; if (b.dataset.act === 'close') select(-1); else if (b.dataset.act === 'fly') flyTo(S.selected); }, sig);
  if (left) { const clock = left.querySelector('.clockface'), shellCard = left.querySelector('#bt-card'); if (clock) clock.after(s.chip); else left.prepend(s.chip); if (shellCard) shellCard.after(s.card); else left.append(s.card);
    const clock2 = left.querySelector('.clockface'); if (clock2 && globalThis.ResizeObserver) { s.ro = new ResizeObserver(() => { if (S && S.chip) S.chip.style.setProperty('--xm-clock-h', Math.round(clock2.getBoundingClientRect().height) + 'px'); }); s.ro.observe(clock2); } }
  else th.root.append(s.chip, s.card);

  // ---- a tap on a mark picks it; the shell's own pick (a unit, a structure) comes first and wins
  stage.addEventListener('pointerdown', e => { if (S) S.tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; }, sig);
  stage.addEventListener('pointerup', e => {
    const s = S; if (!s) return; const t = s.tap; s.tap = null; if (!t || t.id !== e.pointerId || Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y) > 6 || performance.now() - t.t > 600) return;
    if (!s.canvas || (e.target && e.target.tagName && e.target.tagName !== 'CANVAS')) return;       // nothing is marked, or the tap was on a control that sits over the picture
    if (th.state.selected >= 0 || th.state.selectedObj >= 0) { if (s.selected >= 0) select(-1); return; }
    const r = stage.getBoundingClientRect(), no = P.pickMark(s.index, s.L, e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 22 : 14);
    if (no >= 0) select(no, { say: true }); else if (s.selected >= 0) select(-1);
  }, sig);
  // a unit or a structure picked in the shell takes the place of a picked memorial; Escape puts the memorial card away once the drawer is closed
  const unpick = i => { if (S && i >= 0 && S.selected >= 0) select(-1); };
  s.offs = [th.bus.on('select', unpick), th.bus.on('select-obj', unpick), th.bus.on('resize', () => { if (S && S.canvas) size(S); })];
  const esc = e => { const s = S; if (!s || e.key !== 'Escape' || s.selected < 0 || th.state.panel) return; select(-1); };     // the picture or the card has the keyboard: no listener on the document
  stage.addEventListener('keydown', esc, sig); s.card.addEventListener('keydown', esc, sig);

  s.toggle = ctx.registerLayerToggle(P.LAYER.id, P.LAYER.title, () => !!(S && S.on), v => setOn(v));
  s.panel = ctx.registerPanel(P.LAYER.id, 'Later memorials', renderPanel);
  // for the rest of the page (the Views list, the tests): everything goes through the same doors the viewer uses
  th.sitePlaces = th.sitePlaces || {};
  th.sitePlaces.memorials = { layer: P.LAYER, isOn: () => !!(S && S.on), setOn: v => (S ? S.toggle.set(!!v) : false), select: (no, o) => select(no, o), selected: () => (S ? S.selected : -1), flyTo: no => flyTo(no), counts: () => (S ? S.index.counts : null),
    drawn: () => (S ? S.drawn : 0), marksInView: () => (S && S.canvas ? S.L.n : 0), positions: () => (S ? S.positions : null), setPositions: k => setPositions(k), integrity: () => (S ? S.integrity : null), find: f => (S ? P.filterMemorials(S.index, f).map(it => it.no) : []) };
}

// ---------------------------------------------------------------- the layer switch, the picked memorial, the camera
function setOn(v) {
  const s = S; if (!s) return; s.on = !!v; s.fresh = true;
  if (!s.on) { if (s.selected >= 0) select(-1); dropCanvas(s); }                 // off means nothing of the memorials is on the picture
  paintChip(s); if (s.panel.isOpen()) syncPanel(s);
}
function paintChip(s) {
  s.chip.hidden = !s.on;
  s.chip.innerHTML = s.on ? P.noticeHTML(s.index.counts, s.ctx.tierMark) : '';
}
// the shell shrinks the clock face to make room for a card while its root says data-card="on" (ui/card.mjs, ui/object-card.mjs); a memorial's card is a card too. The shell's own card, when it is
// open, keeps the mark: a memorial that gives way to a unit or a structure must not take it away.
function cardMark(s) {
  const th = s.th, root = th && th.root; if (!root || !root.dataset) return;
  if (s.card && !s.card.hidden) root.dataset.card = 'on'; else if (!(th.state.selected >= 0 || th.state.selectedObj >= 0)) root.dataset.card = 'off';
}
function select(no, o = {}) {
  const s = S; if (!s) return false; const it = no >= 0 ? s.index.byNo.get(no) : null; if (no >= 0 && !it) return false;
  const th = s.th; s.selected = it ? it.no : -1; s.fresh = true;
  if (it) { if (th.state.selected >= 0) th.select(-1); if (th.state.selectedObj >= 0) th.selectObject(-1); s.card.innerHTML = P.memorialCardHTML(it, s.ctx.tierMark); s.card.hidden = false; if (o.say) th.announce(`Selected ${it.name}, a later memorial.`); }
  else { s.card.hidden = true; s.card.innerHTML = ''; if (!s.on) dropCanvas(s); }
  cardMark(s); if (s.panel.isOpen()) markCurrent(s);
  return !!it;
}
function flyTo(no) {
  const s = S; if (!s) return false; const it = s.index.byNo.get(no); if (!it) return false;
  s.th.controls.flyTo(P.memorialPose(s.T, it)); s.th.announce(P.memorialSay(it)); return true;
}
function setPositions(key) {
  const s = S; if (!s || !P.POSITION_CHOICES.some(c => c.key === key) || key === s.positions) return false;
  s.positions = key; s.index = P.buildIndex(s.data, s.T, { positions: key, years: s.years }); s.L = P.newLayout(s.index.n); s.fresh = true;
  if (s.selected >= 0) { const it = s.index.byNo.get(s.selected); if (it) s.card.innerHTML = P.memorialCardHTML(it, s.ctx.tierMark); }
  s.th.announce(key === 'state-list' ? 'The nine state memorials now stand where the site\'s second list puts them.' : 'Every memorial now stands where the Monuments list puts it.');
  if (s.panel.isOpen()) s.panel.refresh(); return true;
}

// ---------------------------------------------------------------- the canvas: made when there is something to mark, removed when there is not
function size(s) {
  const th = s.th; let w = th.cssW, h = th.cssH, dpr = th.dpr;
  if (!(w > 0 && h > 0)) { const r = th.els.stage.getBoundingClientRect(); w = Math.max(2, Math.round(r.width)); h = Math.max(2, Math.round(r.height)); dpr = Math.min(globalThis.devicePixelRatio || 1, 2); }
  s.w = w; s.h = h; s.dpr = dpr || 1; s.canvas.width = Math.round(w * s.dpr); s.canvas.height = Math.round(h * s.dpr); s.fresh = true;
}
function needCanvas(s) {
  if (s.canvas) return; const cv = el('canvas', { id: 'xm-marks', className: 'xm-marks', 'aria-hidden': 'true', style: 'pointer-events:none' }), stage = s.th.els.stage, ov = s.th.els.overlay;
  if (ov && ov.parentNode === stage) stage.insertBefore(cv, ov); else stage.append(cv);                  // under the shell's own marks, over the picture
  s.canvas = cv; s.c2d = cv.getContext('2d'); size(s);
}
function dropCanvas(s) { if (!s.canvas) return; s.canvas.width = 0; s.canvas.height = 0; s.canvas.remove(); s.canvas = null; s.c2d = null; s.drawn = 0; s.L.n = 0; s.L.nLabels = 0; }

export function update(frame) {
  const s = S; if (!s || !(s.on || s.selected >= 0)) return;                       // off and nothing picked: nothing exists, nothing is done
  needCanvas(s); const cam = frame.cam, R = s.ctx.host && s.ctx.host.R, aspect = R && R.W > 0 && R.H > 0 ? R.W / R.H : s.w / s.h, a = s.last;
  if (!s.fresh && a[0] === cam.x && a[1] === cam.y && a[2] === cam.z && a[3] === cam.yaw && a[4] === cam.pitch && a[5] === cam.fov && a[6] === aspect && a[7] === cam.near && a[8] === cam.far) return;   // same camera, same marks
  a[0] = cam.x; a[1] = cam.y; a[2] = cam.z; a[3] = cam.yaw; a[4] = cam.pitch; a[5] = cam.fov; a[6] = aspect; a[7] = cam.near; a[8] = cam.far; s.fresh = false;
  P.viewProj(cam, aspect, s.vp); P.layoutMarks(s.index, s.vp, cam, s.w, s.h, s, s.L);
  const c = s.c2d; c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); c.clearRect(0, 0, s.w, s.h); s.drawn = P.drawMarks(c, s.index, s.L, s, s.tier);
}

// ---------------------------------------------------------------- the panel (More, then Later memorials)
function syncPanel(s) { const b = s.box; if (!b) return; const cb = b.querySelector('#xm-on'); if (cb) cb.checked = s.on; }
function markCurrent(s) { const b = s.box; if (!b) return; const ul = b.querySelector('#xm-list'); if (!ul) return; for (const n of ul.querySelectorAll('[aria-current]')) n.removeAttribute('aria-current'); if (s.selected >= 0) { const n = ul.querySelector(`[data-no="${s.selected}"]`); if (n) n.setAttribute('aria-current', 'true'); } }
function renderPanel(box, th, sc) {
  const s = S; if (!s) return; const c = s.index.counts, f = s.list; s.box = box; sc.add(() => { if (S && S.box === box) S.box = null; });
  box.innerHTML = P.memorialPanelHTML(s.index, { on: s.on, positions: s.positions, integrity: s.integrity, list: f }, s.ctx.tierMark);
  const list = box.querySelector('#xm-list'), count = box.querySelector('#xm-count');
  const draw = () => {
    const rows = P.filterMemorials(s.index, f); let h = P.memorialRowsHTML(rows, 0, f.shown, s.selected);
    if (rows.length > f.shown) h += `<li><button type="button" class="btn-s" id="xm-more" style="margin:12px 0">Show more (${rows.length - f.shown} left)</button></li>`;
    list.innerHTML = h || '<li class="empty">No memorial matches.</li>'; count.textContent = `${rows.length} of ${c.total} memorials. Pick one to fly to it and read its card.`;
  };
  let timer = 0;
  sc.on(box, 'input', ev => { if (!ev.target || ev.target.id !== 'xm-q') return; const v = ev.target.value; sc.clear(timer); timer = sc.timeout(() => { f.q = v; f.shown = 60; draw(); }, 120); });
  sc.on(box, 'change', ev => {
    const t = ev.target; if (!t || !S) return;
    if (t.id === 'xm-on') { const want = t.checked; Promise.resolve(S.toggle.set(want)).then(() => { if (S) t.checked = S.on; }); }
    else if (t.id === 'xm-group') { f.group = t.value; f.shown = 60; draw(); }
    else if (t.id === 'xm-pos') setPositions(t.value);
  });
  sc.on(box, 'click', ev => {
    const t = ev.target && ev.target.closest ? ev.target : null; if (!t || !S) return;
    const side = t.closest('[data-side]'), where = t.closest('[data-where]'), row = t.closest('[data-no]');
    if (side) { f.side = side.dataset.side; f.shown = 60; for (const b of box.querySelectorAll('#xm-side button')) b.setAttribute('aria-pressed', String(b.dataset.side === f.side)); draw(); }
    else if (where) { f.where = where.dataset.where; f.shown = 60; for (const b of box.querySelectorAll('#xm-where button')) b.setAttribute('aria-pressed', String(b.dataset.where === f.where)); draw(); }
    else if (t.closest('#xm-more')) { f.shown += 120; draw(); }
    else if (row) { const no = +row.dataset.no; select(no); flyTo(no); }
  });
  th.bus.on('ext-toggle', id => { if (id === P.LAYER.id && S) syncPanel(S); }, sc);
  draw();
}

export function dispose() {
  const s = S; S = null; if (!s) return;
  try { s.ac.abort(); } catch { /* already gone */ }
  for (const off of s.offs || []) { try { off(); } catch { /* the bus is gone */ } }
  if (s.ro) { try { s.ro.disconnect(); } catch { /* already gone */ } }
  if (s.canvas) { s.canvas.width = 0; s.canvas.height = 0; s.canvas.remove(); }
  const wasOpen = s.card && !s.card.hidden; if (s.chip) s.chip.remove(); if (s.card) s.card.remove(); if (s.style) s.style.remove();
  const th = s.th; if (wasOpen && th && th.root && th.root.dataset && !(th.state.selected >= 0 || th.state.selectedObj >= 0)) th.root.dataset.card = 'off'; if (th && th.sitePlaces) { delete th.sitePlaces.memorials; if (!Object.keys(th.sitePlaces).length) delete th.sitePlaces; }
  s.canvas = s.c2d = s.chip = s.card = s.style = s.ro = s.box = s.ctx = s.th = s.T = s.data = s.years = s.index = s.L = s.toggle = s.panel = s.offs = null;
}
