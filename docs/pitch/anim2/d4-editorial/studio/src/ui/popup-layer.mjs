// ui/popup-layer.mjs - draws what the Overlay Director (popups/host.mjs) decides.  One design system for every popup: a popup hands over a CONTENT MODEL (popups/kit.mjs) and this file turns it
// into DOM with the same type scale, spacing, motion, focus and screen-reader behaviour everywhere.  Nothing here makes a decision about where a card goes or how long it lives.
//
// DOM it owns:  #popups (floating cards, absolutely positioned by transform), the rail / bottom sheet (the long reading surface, the map makes room for it), the Chronicle strip inside the dock
// (chips for cards that found no room), toolbar buttons of the popups that declare them, the polite live region, and a hidden sandbox in which card heights are MEASURED (placement uses the
// real height, never a guess).  Every string goes in through textContent: data never reaches innerHTML.
import { h, svgIcon } from './dom.mjs';
import { SHAPES, TONES, chipText } from '../popups/kit.mjs';
import { contentOf } from '../popups/host.mjs';

const evChip = (c) => h('span', { class: 'ev-pair', title: c.title || ('Evidence label: ' + c.ev) }, h('span', { class: 'ev ev-' + c.ev }, c.ev), c.text ? h('span', { class: 'evt' }, c.text) : null);
const icon = (name, cls) => { const s = svgIcon(SHAPES[name] || SHAPES.dot); if (cls) s.setAttribute('class', cls); return s; };
const toneOf = (t) => TONES[t] || TONES.info;

export function createPopupLayer({ root, container, engine, host, systemReduced = () => false }) {
  const tok = engine.tok; const els = new Map(); const L = { lastLive: '', frame: 0, chromeDirty: true, chromeCache: null, chromeAt: 0, prevFocus: null, railId: null, railVersion: null, railKey: null, stripKey: '', lanes: {}, started: performance.now() };
  const canvases = new Set();

  // ---- scaffolding --------------------------------------------------------------------------------------------------------------------------------------------
  const sandbox = h('div', { id: 'pop-measure', 'aria-hidden': 'true' }); container.append(sandbox);
  const live = h('div', { id: 'pop-live', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }); root.append(live);
  const railBody = h('div', { class: 'pop-rail-body' }); const railTitle = h('h2', { class: 'pop-rail-title', tabindex: '-1' }); const railKick = h('div', { class: 'pop-rail-kick' });
  const railClose = h('button', { class: 'pc-btn pop-rail-close', 'aria-label': 'Close the reading panel', title: 'Close (Esc)', onclick: () => host.closeRail() }, icon('close'));
  const DETENTS = ['peek', 'half', 'full']; const stepDetent = (dir) => { const i = DETENTS.indexOf(host.state.sheet); host.setSheet(DETENTS[Math.max(0, Math.min(2, i + dir))]); };
  const handle = h('button', { class: 'pop-handle', 'aria-label': 'Resize the panel', 'aria-expanded': 'false', onclick: () => { if (handle._dragged) { handle._dragged = false; return; } const d = host.state.sheet; host.setSheet(d === 'peek' ? 'half' : d === 'half' ? 'full' : 'peek'); } }, h('span'));
  let dragY = null; handle.addEventListener('pointerdown', (e) => { dragY = e.clientY; handle._dragged = false; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener('pointerup', (e) => { if (dragY == null) return; const dy = dragY - e.clientY; dragY = null; if (Math.abs(dy) > 36) { handle._dragged = true; stepDetent(dy > 0 ? 1 : -1); } });
  handle.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp') { stepDetent(1); e.preventDefault(); e.stopPropagation(); } else if (e.key === 'ArrowDown') { stepDetent(-1); e.preventDefault(); e.stopPropagation(); } });
  const rail = h('aside', { id: 'pop-rail', class: 'pop-rail', 'aria-label': 'Reading panel', 'data-open': 'false' }, handle, h('header', { class: 'pop-rail-head' }, railKick, railTitle, railClose), railBody);
  root.append(rail);
  const stripChips = h('div', { class: 'pop-chips', role: 'list', 'aria-label': 'Recent popups' });
  const stripCount = h('span', { class: 'pop-count' }, '0'); const stripLabel = h('span', { class: 'pop-strip-label' }, 'Chronicle');
  const stripBtn = h('button', { class: 'pop-strip-btn', 'aria-label': 'Open the Chronicle', title: 'Everything that has happened so far (C)', onclick: () => host.toggleDoc('chronicle:list') }, icon('list'), stripLabel, stripCount);
  const strip = h('div', { class: 'pop-strip', role: 'region', 'aria-label': 'Chronicle' }, stripBtn, stripChips);
  const dock = document.getElementById('dock'); if (dock) dock.prepend(strip); else root.append(strip);
  const btns = h('div', { class: 'pop-btns', role: 'group', 'aria-label': 'Popups' }); const topbar = document.getElementById('topbar'); const spacer = topbar && topbar.querySelector('.spacer'); if (topbar) topbar.insertBefore(btns, spacer ? spacer.nextSibling : null);

  // ---- style dials -> CSS variables ----------------------------------------------------------------------------------------------------------------------------
  function applyStyle() {
    root.dataset.pal = tok('popup.style.palette'); root.dataset.density = tok('popup.style.density'); root.dataset.titleFont = tok('popup.style.titleFont'); root.dataset.shadow = tok('popup.style.shadow');
    root.style.setProperty('--pc-r', tok('popup.style.radiusPx') + 'px'); root.style.setProperty('--pc-blur', tok('popup.style.blurPx') + 'px'); root.style.setProperty('--pc-scale', String(tok('popup.style.fontScale')));
    root.style.setProperty('--rail-w', '0px');
  }
  engine.tuning.on('popup.style.*', () => { applyStyle(); host.invalidateSizes(); }); applyStyle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => host.invalidateSizes());

  // ---- content model -> DOM ------------------------------------------------------------------------------------------------------------------------------------
  function action(rec, a) {
    return h('button', { class: 'pc-act' + (a.primary ? ' primary' : ''), type: 'button', 'data-action': a.id, 'aria-label': a.aria || a.label, title: a.title || null, onclick: (e) => { e.stopPropagation(); host.act(rec.id, a.id); } }, a.icon ? icon(a.icon) : null, h('span', null, a.label));
  }
  function block(b, ctx) {
    const { rec } = ctx;
    switch (b.t) {
      case 'kicker': return h('div', { class: 'pc-kick' }, icon(b.shape || toneOf(rec.tone).shape, 'pc-shape'), h('span', { class: 'pc-kick-label' }, b.label), b.right ? h('span', { class: 'pc-kick-right' }, b.right) : null, b.chip ? evChip(b.chip) : null);
      case 'title': return h(b.level === 2 ? 'h2' : 'h3', { class: 'pc-title' + (b.serif ? ' serif' : '') + (b.size === 'big' ? ' big' : '') }, b.text);
      case 'p': return h('p', { class: 'pc-p' + (b.italic ? ' italic' : '') + (b.muted ? ' muted' : '') + (b.size === 'sm' ? ' sm' : '') + (b.lead ? ' lead' : '') + (b.serif ? ' serif' : ''), style: b.lines ? { display: '-webkit-box', WebkitLineClamp: String(b.lines), WebkitBoxOrient: 'vertical', overflow: 'hidden' } : null }, b.text);
      case 'quote': return h('blockquote', { class: 'pc-quote' }, h('p', null, b.text), b.cite ? h('cite', null, b.cite) : null);
      case 'meta': return h('ul', { class: 'pc-meta' }, b.rows.map((r) => h('li', { title: r.title || null }, icon(r.icon || 'dot', 'pc-mi'), h('span', null, r.text))));
      case 'chips': return h('div', { class: 'pc-chips' }, b.items.map(evChip));
      case 'bar': return h('div', { class: 'pc-bar' }, b.label ? h('div', { class: 'pc-bar-row' }, h('span', null, b.label), b.value2 ? h('b', null, b.value2) : null) : null, h('div', { class: 'pc-track', role: 'img', 'aria-label': b.aria || b.label || 'bar' }, h('i', { style: { width: Math.round(Math.max(0, Math.min(1, b.value)) * 1000) / 10 + '%' } })), b.sub ? h('div', { class: 'pc-bar-sub' }, b.sub, b.chip ? evChip(b.chip) : null) : null);
      case 'kv': return h('dl', { class: 'pc-kv' }, b.rows.flatMap((r) => [h('dt', null, r[0]), h('dd', null, r[1], r[2] ? evChip(r[2]) : null)]));
      case 'list': return h('ul', { class: 'pc-list' }, b.items.map((i) => h('li', { class: 'pc-li', 'data-tone': i.tone || 'info' }, icon(i.shape || 'dot', 'pc-shape'), h('div', { class: 'pc-li-body' }, i.title ? h('div', { class: 'pc-li-title' }, i.title) : null, i.text ? h('div', { class: 'pc-li-text', style: i.lines ? { display: '-webkit-box', WebkitLineClamp: String(i.lines), WebkitBoxOrient: 'vertical', overflow: 'hidden' } : null }, i.text) : null, i.sub ? h('div', { class: 'pc-li-sub' }, i.sub) : null),
        i.actions ? h('div', { class: 'pc-li-acts' }, i.actions.map((a) => h('button', { class: 'pc-act', type: 'button', 'aria-label': a.aria || a.label, title: a.title || null, onclick: (e) => { e.stopPropagation(); host.act(rec.id, a.id); } }, h('span', null, a.label)))) : null)));
      case 'actions': return h('div', { class: 'pc-actions' }, b.items.map((a) => action(rec, a)));
      case 'disclosure': { const d = h('details', { class: 'pc-disc', open: b.open ? '' : null }, h('summary', null, b.label)); blocks(d, b.blocks, ctx); return d; }
      case 'scroll': { const box = h('div', { class: 'pc-scroll', tabindex: '0', role: 'group', 'aria-label': b.label || 'Text', style: b.maxH ? { maxHeight: b.maxH + 'px' } : null }); blocks(box, b.blocks, ctx); const bar = h('i', { class: 'pc-scroll-bar' }); box.addEventListener('scroll', () => { const m = box.scrollHeight - box.clientHeight; bar.style.transform = `scaleX(${m > 0 ? box.scrollTop / m : 1})`; }); return h('div', { class: 'pc-scroll-wrap' }, bar, box); }
      case 'swatches': return h('ul', { class: 'pc-sw' }, b.rows.map((r) => h('li', null, h('i', { style: { background: r.swatch } }), h('span', null, r.text, ' ', r.ev ? evChip({ ev: r.ev }) : null))));
      case 'canvas': { const c = h('canvas', { class: 'pc-canvas', width: Math.round(b.w * (devicePixelRatio > 1 ? 2 : 1)), height: Math.round(b.h * (devicePixelRatio > 1 ? 2 : 1)), role: 'img', 'aria-label': b.label || 'Chart', style: { width: b.w + 'px', height: b.h + 'px' } }); c._paint = b; if (b.click) c.addEventListener('click', (e) => { const r = c.getBoundingClientRect(); b.click((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }); canvases.add(c); return c; }
      case 'swap': return h('div', { class: 'pc-swap', 'data-struck': 'false', 'data-at': String(b.atMs || 0) }, h('span', { class: 'pc-old' }, b.old), h('span', { class: 'pc-new' }, b.next));
      case 'dots': return h('div', { class: 'pc-dots', role: 'group', 'aria-label': b.label || 'Stops' }, Array.from({ length: b.n }, (_, i) => h('button', { type: 'button', class: 'pc-dot', 'aria-label': `Go to stop ${i + 1}`, 'aria-current': i === b.active ? 'step' : null, onclick: (e) => { e.stopPropagation(); host.act(rec.id, 'goto:' + i); } })));
      case 'pill': return h('button', { class: 'pc-pill', type: 'button', 'aria-expanded': b.expanded === undefined ? null : String(!!b.expanded), onclick: (e) => { e.stopPropagation(); host.act(rec.id, b.id); } }, b.icon ? icon(b.icon) : null, h('span', null, b.label));
      case 'ring': return h('div', { class: 'pc-ringrow' }, ringSvg(b.frac, b.size || 38, b.text), h('div', { class: 'pc-ringtext' }, b.lines.map((l, i) => h('div', { class: 'l' + i }, l))));
      default: return h('div', null, b.text || '');
    }
  }
  function ringSvg(frac, size, text) {
    const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 40 40'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('class', 'pc-ring'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', text || '');
    const mk = (cls, r, extra) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', 20); c.setAttribute('cy', 20); c.setAttribute('r', r); c.setAttribute('class', cls); if (extra) for (const [k, v] of Object.entries(extra)) c.setAttribute(k, v); return c; };
    const C = 2 * Math.PI * 16; s.append(mk('rt', 16), mk('rf', 16, { 'stroke-dasharray': `${(C * Math.max(0, Math.min(1, frac))).toFixed(2)} ${C.toFixed(2)}`, transform: 'rotate(-90 20 20)' })); return s;
  }
  function blocks(parent, list, ctx) { for (const b of list || []) { const n = block(b, ctx); if (n) parent.append(n); } }
  function renderBody(el, content, rec) { el.replaceChildren(); blocks(el, content.blocks, { rec }); }

  // ---- cards -----------------------------------------------------------------------------------------------------------------------------------------------------
  function cardEl(rec, form) {
    const content = contentOf(form) || { blocks: [] }; const tone = rec.tone || 'info'; const title = (content.label) || `${toneOf(tone).label}`;
    const el = h('article', { class: 'pc', 'data-tone': tone, 'data-form': form.id, 'data-kind': rec.kind, 'data-popup': rec.popup, 'data-id': rec.id, 'data-bare': String(!!rec.spec.bare), role: 'group', 'aria-label': content.label || title, tabindex: '-1', style: { width: form.w + 'px' } });
    const body = h('div', { class: 'pc-body' }); renderBody(body, content, rec); el.append(body);
    if (form.legacy) { if (form.legacy.render) form.legacy.render(body); else if (form.legacy.html) body.innerHTML = form.legacy.html; }
    if (rec.kind === 'hud' || rec.kind === 'tooltip' || rec.spec.bare) el.style.setProperty('--tools-w', '0px');
    if (rec.kind !== 'hud' && rec.kind !== 'tooltip' && !rec.spec.bare) {
      const tools = h('div', { class: 'pc-tools' }); const want = form.tools || ['rail', 'pin', 'close'];
      if (want.includes('rail') && rec.spec.doc && !content.noRail) tools.append(h('button', { class: 'pc-btn', type: 'button', 'aria-label': 'Open in the reading panel', title: 'Read in the panel', onclick: (e) => { e.stopPropagation(); host.openRail(rec.id); } }, icon('panel')));
      if (want.includes('pin')) tools.append(h('button', { class: 'pc-btn pin', type: 'button', 'aria-label': 'Keep this card on screen', 'aria-pressed': 'false', title: 'Keep on screen', onclick: (e) => { e.stopPropagation(); host.pin(rec.id); } }, icon('pinned')));
      if (want.includes('close')) tools.append(h('button', { class: 'pc-btn', type: 'button', 'aria-label': 'Dismiss this card', title: 'Dismiss (Esc)', onclick: (e) => { e.stopPropagation(); host.dismiss(rec.id); } }, icon('close')));
      el.style.setProperty('--tools-w', tools.children.length * 26 + 12 + 'px'); el.append(tools);
      if (rec.hold) el.append(h('div', { class: 'pc-hold', 'aria-hidden': 'true' }, h('i')));
    }
    return el;
  }
  /** the real size of a card form: render it in the hidden sandbox at its width and read the height */
  function measure(rec, form) {
    const el = cardEl({ ...rec, id: rec.id, spec: rec.spec, kind: rec.spec.kind, tone: rec.spec.tone, popup: rec.def ? rec.def.id : 'host', hold: rec.spec.hold }, form); el.style.visibility = 'hidden'; el.style.position = 'absolute'; sandbox.append(el);
    const r = { h: Math.ceil(el.getBoundingClientRect().height) }; el.remove(); return r;
  }
  let hoverId = null;
  function mountCard(rec) {
    const form = rec.form; if (!form) return null; const el = cardEl(rec, form);
    el.addEventListener('pointerenter', () => { host.setHovered(rec.id, true); if (rec.kind === 'tooltip') host.setTipHeld(true); }); el.addEventListener('pointerleave', () => { host.setHovered(rec.id, false); if (rec.kind === 'tooltip') host.setTipHeld(false); });
    el.addEventListener('focusin', () => host.setFocused(rec.id, true)); el.addEventListener('focusout', () => host.setFocused(rec.id, false));
    container.append(el); const entry = { el, formId: form.id, version: rec.version, w: form.w, born: performance.now() }; els.set(rec.id, entry); return entry;
  }

  // ---- rail ----------------------------------------------------------------------------------------------------------------------------------------------------------
  function syncRail(out) {
    const r = out.rail; const px = out.inset.right; const py = out.inset.bottom; const sliding = px > 0.5 || py > 0.5; const open = !!r || sliding;
    rail.dataset.open = String(open); rail.dataset.mode = out.phone ? 'sheet' : 'rail'; root.dataset.rail = open ? 'open' : 'closed';
    root.style.setProperty('--rail-w', Math.round(px) + 'px'); root.style.setProperty('--sheet-h', Math.round(py) + 'px');
    if (r) { L.railW = r.widthPx || L.railW; L.railH = out.phone ? Math.max(py, 1) : L.railH; }
    const prog = out.phone ? Math.min(1, py / Math.max(1, L.railH || py || 1)) : Math.min(1, px / Math.max(1, L.railW || px || 1));
    if (!r) {
      if (L.railId) { L.railId = null; rail.setAttribute('aria-hidden', 'true'); rail.inert = true; if (L.prevFocus && document.contains(L.prevFocus)) { try { L.prevFocus.focus({ preventScroll: true }); } catch { /* ignore */ } } L.prevFocus = null; }
      if (sliding) rail.style.transform = out.phone ? `translateY(${Math.round((1 - prog) * 100)}%)` : `translateX(${Math.round((1 - prog) * 100)}%)`; else rail.style.transform = '';
      return;
    }
    rail.removeAttribute('aria-hidden'); rail.inert = false;
    rail.style.transform = out.phone ? `translateY(${Math.round((1 - prog) * 100)}%)` : `translateX(${Math.round((1 - prog) * 100)}%)`; rail.style.width = out.phone ? '' : r.widthPx + 'px'; rail.style.height = out.phone ? Math.max(1, L.railH || py) + 'px' : '';       // the dock lies outside the map: the sheet's height is the map's inset
    handle.setAttribute('aria-expanded', String(r.detent !== 'peek')); handle.setAttribute('aria-label', `Panel size: ${r.detent}. Activate to change.`);
    const doc = r.doc; const content = contentOf(doc) || { blocks: [] }; const ver = (doc.version ?? 0) + '|' + r.id; const fresh = L.railId !== r.id;
    if (fresh) { L.prevFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null; L.railId = r.id; L.railVersion = null; railBody.scrollTop = 0; }
    if (L.railVersion !== ver) {
      L.railVersion = ver; const keep = railBody.scrollTop; railBody.replaceChildren(); const tone = doc.tone || 'info'; rail.dataset.tone = tone;
      railKick.replaceChildren(icon(toneOf(tone).shape, 'pc-shape'), h('span', null, doc.kicker || toneOf(tone).label)); railTitle.textContent = doc.title || '';
      blocks(railBody, content.blocks, { rec: { id: r.id, tone, kind: 'doc', popup: 'rail', spec: doc } }); if (!fresh) railBody.scrollTop = keep;
    }
    if (fresh && L.kb) requestAnimationFrame(() => { try { railTitle.focus({ preventScroll: true }); } catch { /* ignore */ } });
  }

  // ---- the Chronicle strip -------------------------------------------------------------------------------------------------------------------------------------------
  function syncStrip(out, now) {
    stripChips.dataset.more = out.phone && out.strip.chips.length > 1 ? '+' + (out.strip.chips.length - 1) : '';
    stripCount.textContent = String(out.strip.passed); stripBtn.setAttribute('aria-label', `Open the Chronicle: ${out.strip.passed} of ${out.strip.total} moments so far`);
    const key = out.strip.chips.map((c) => c.id + '#' + c.version + (c.pinned ? 'p' : '')).join('|');
    if (key !== L.stripKey) {
      L.stripKey = key; stripChips.replaceChildren();
      for (const c of out.strip.chips) {
        const content = c.form ? contentOf(c.form) : null; const tone = c.tone || 'info'; const label = (content && content.label) || chipText(c.id, 40);
        const chip = h('button', { class: 'pop-chip', type: 'button', role: 'listitem', 'data-id': c.id, 'data-tone': tone, title: content && content.full ? content.full : label, 'aria-label': (content && content.full) || label,
          onclick: () => { if (!host.openRail(c.id)) host.pin(c.id); } }, icon(toneOf(tone).shape, 'pc-shape'), h('span', { class: 'pop-chip-kind' }, content && content.kind ? content.kind : toneOf(tone).label), h('span', { class: 'pop-chip-text' }, content && content.line ? content.line : label), h('i', { class: 'pop-chip-hold' }));
        chip.addEventListener('pointerenter', () => host.setHovered(c.id, true)); chip.addEventListener('pointerleave', () => host.setHovered(c.id, false)); chip.addEventListener('focus', () => host.setFocused(c.id, true)); chip.addEventListener('blur', () => host.setFocused(c.id, false));
        stripChips.append(chip);
      }
    }
    const rects = {}; const ar = root.getBoundingClientRect();
    for (const chip of stripChips.children) { const id = chip.dataset.id; const rec = out.strip.chips.find((c) => c.id === id); if (!rec) continue; const r = chip.getBoundingClientRect(); rects[id] = { x0: r.left - ar.left, y0: r.top - ar.top, x1: r.right - ar.left, y1: r.bottom - ar.top }; const hb = chip.querySelector('.pop-chip-hold'); if (hb && rec.hold) hb.style.transform = `scaleX(${rec.hold.frac.toFixed(3)})`; chip.classList.toggle('paused', !!(rec.hold && rec.hold.paused)); chip.classList.toggle('pinned', !!rec.pinned); }
    L.lanes = rects; host.setLaneRects(rects);
  }

  // ---- toolbar buttons of the popups -----------------------------------------------------------------------------------------------------------------------------------
  const toolButtons = new Map();
  function syncToolbar() {
    for (const def of engine.kernel.popups.list()) for (const t of def.toolbar || []) {
      const key = def.id + ':' + t.id; if (toolButtons.has(key)) continue;
      const b = h('button', { class: 'btn pop-tb', 'data-phone': t.phone === false ? 'no' : 'yes', type: 'button', title: t.title || t.label, 'aria-pressed': 'false', onclick: () => t.run(host.makeApiFor(def.id)) }, t.label); toolButtons.set(key, b); btns.append(b);
    }
  }
  engine.kernel.popups.subscribe(syncToolbar); syncToolbar();

  // ---- chrome: what the interface covers (a card must not land under it) ------------------------------------------------------------------------------------------------
  const markChrome = () => { L.chromeDirty = true; };
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(markChrome); for (const id of ['topbar', 'dock', 'panel', 'metrics']) { const n = document.getElementById(id); if (n) ro.observe(n); } }
  if (typeof MutationObserver !== 'undefined') { const mo = new MutationObserver(markChrome); for (const id of ['topbar', 'dock', 'panel', 'metrics']) { const n = document.getElementById(id); if (n) mo.observe(n, { attributes: true, attributeFilter: ['class', 'style'], subtree: id === 'topbar' }); } }
  function chrome() {
    const now = performance.now(); if (!L.chromeDirty && L.chromeCache && now - L.chromeAt < 600) return L.chromeCache;
    const stage = document.getElementById('stage') || root; const ar = stage.getBoundingClientRect(); const ap = root.getBoundingClientRect(); const rects = []; const rel = (r) => ({ x0: r.left - ar.left, y0: r.top - ar.top, x1: r.right - ar.left, y1: r.bottom - ar.top });
    // D4 round 1: the masthead and the dock are bands OUTSIDE the map (the stage lies between them), so nothing of the interface lies on the map but what floats over it on purpose: the panel, the narration, the metrics
    let right = 0;
    const mapW = ap.width - (parseFloat(root.style.getPropertyValue('--rail-w')) || 0);
    const pn = document.getElementById('panel'); if (pn && !pn.classList.contains('hidden') && ap.width >= 760) { const r = pn.getBoundingClientRect(); right = Math.max(0, mapW - (r.left - ap.left)); }
    const mt = document.getElementById('metrics'); if (mt && !mt.classList.contains('hidden')) rects.push(rel(mt.getBoundingClientRect()));
    // other interface that floats over the map and announces itself with data-chrome (the narration card, the before badge): a card must not land under it either; the narration column also
    // narrows the free part of the map on a desktop (left inset), on a phone it is a strip above the dock and only a rectangle
    let left = 0;
    for (const n of root.querySelectorAll('[data-chrome]')) { if (n.classList.contains('hidden') || n.classList.contains('off')) continue; const r = n.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) continue; const q = rel(r); rects.push(q); if (n.id === 'narration' && ap.width >= 760) left = Math.max(left, q.x1); }
    L.chromeCache = { rects, dock: 0, safe: { top: 0, bottom: 0, left: left > 0 ? left + 8 : 0, right: right > 0 ? right + 8 : 0 } }; L.chromeAt = now; L.chromeDirty = false; return L.chromeCache;
  }


  // ---- colours of the map-side ink: read from the same CSS variables as the cards, so the leader of a critical card is the colour of its kicker ------------------------------
  let colorsKey = ''; let colorsVal = null;
  function toneColors() {
    const key = (root.dataset.pal || '') + '|' + (document.documentElement.dataset.theme || '') + '|' + (window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : '');
    if (key !== colorsKey || !colorsVal) { const cs = getComputedStyle(root); colorsVal = {}; for (const f of ['critical', 'high', 'medium', 'story', 'day', 'info', 'union', 'confederate']) colorsVal[f] = cs.getPropertyValue('--tone-' + f).trim() || undefined; colorsKey = key; }
    return colorsVal;
  }

  // ---- per frame -------------------------------------------------------------------------------------------------------------------------------------------------------
  function update(out, nowMs) {
    L.frame++; const seen = new Set(); const reduced = (() => { const m = tok('motion.reduced'); return m === 'on' || (m === 'auto' && systemReduced()); })();
    root.classList.toggle('pop-reduced', reduced); root.classList.toggle('pop-phone', !!out.phone);
    for (const rec of out.cards) {
      const floating = rec.rect && !rec.lane && !rec.hidden && rec.kind !== 'doc' && rec.form; if (!floating) continue;
      let e = els.get(rec.id);
      if (e && (e.formId !== rec.form.id || e.version !== rec.version || e.w !== rec.form.w)) { e.el.remove(); els.delete(rec.id); e = null; }
      if (!e) e = mountCard(rec); if (!e) continue; seen.add(rec.id); const el = e.el;
      const vis = rec.opacity > 0.01; el.style.visibility = vis ? 'visible' : 'hidden'; el.style.opacity = rec.opacity.toFixed(3); el.style.pointerEvents = rec.opacity >= 0.6 ? 'auto' : 'none';
      el.style.transform = `translate(${Math.round(rec.rect.x)}px, ${Math.round(rec.rect.y + rec.dy)}px) scale(${rec.scale.toFixed(4)})`; el.style.zIndex = String(rec.kind === 'hud' ? 5 : rec.kind === 'tooltip' ? 40 : 10 + Math.min(20, rec.seq % 20));
      el.dataset.phase = rec.phase; el.dataset.bare = String(!!rec.spec.bare); el.dataset.pinned = String(!!rec.pinned); const pin = el.querySelector('.pc-btn.pin'); if (pin) { pin.setAttribute('aria-pressed', String(!!rec.pinned)); pin.title = rec.pinned ? 'Unpin' : 'Keep on screen'; }
      const hb = el.querySelector('.pc-hold i'); if (hb && rec.hold) { hb.style.transform = `scaleX(${rec.hold.frac.toFixed(3)})`; el.classList.toggle('paused', !!rec.hold.paused); }
      for (const sw of el.querySelectorAll('.pc-swap')) { const at = +sw.dataset.at; sw.dataset.struck = String(nowMs - (e.born0 ?? (e.born0 = nowMs)) >= at); }
    }
    for (const [id, e] of els) if (!seen.has(id)) { e.el.remove(); els.delete(id); }
    for (const c of [...canvases]) { if (!c.isConnected) { canvases.delete(c); continue; } const b = c._paint; if (b && b.paint) { const g = c.getContext('2d'); const k = c.width / b.w; g.setTransform(k, 0, 0, k, 0, 0); b.paint(g, b.w, b.h); } }
    syncRail(out); syncStrip(out, nowMs);
    if (out.live && out.live !== L.lastLive) { L.lastLive = out.live; live.textContent = ''; setTimeout(() => { live.textContent = out.live; }, 30); }
    for (const [key, b] of toolButtons) { const def = engine.kernel.popups.get(key.split(':')[0]); const t = (def.toolbar || []).find((x) => key.endsWith(':' + x.id)); if (t && t.pressed) b.setAttribute('aria-pressed', String(!!t.pressed(host))); }
  }

  // ---- keyboard ----------------------------------------------------------------------------------------------------------------------------------------------------
  window.addEventListener('pointerdown', () => { L.kb = false; }, true);
  window.addEventListener('keydown', (e) => {
    L.kb = true;
    const tg = e.target; if (tg instanceof HTMLInputElement && tg.type !== 'range' && tg.type !== 'checkbox') return; if (tg instanceof HTMLSelectElement || tg instanceof HTMLTextAreaElement) return; if (e.ctrlKey || e.metaKey || e.altKey) return;
    const inCard = tg instanceof Element && (tg.closest('.pc') || tg.closest('#pop-rail')); const onButton = tg instanceof HTMLButtonElement;
    if (e.key === 'Enter' && onButton) return; if (e.key === ' ' && onButton) return;
    if (host.key(e.key, { shift: e.shiftKey, target: inCard || onButton ? tg : null })) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  return { update, measure, chrome, markChrome, toneColors, laneRects: () => L.lanes, applyStyle, el: { rail, strip, live, btns }, get frames() { return L.frame; }, dispose() { rail.remove(); strip.remove(); live.remove(); btns.remove(); for (const e of els.values()) e.el.remove(); els.clear(); } };
}
