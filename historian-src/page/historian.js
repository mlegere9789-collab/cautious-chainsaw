// historian.js - the candidate "Ask the Historian" page controller (H2). NOT wired into any release.
//
//   * The page shell (historian.html + historian.css) paints without this script. The script only opens the knowledge base (T1, a few hundred KB, started immediately),
//     answers questions, and renders the answers. A question asked before the records finish loading waits for them; nothing blocks typing.
//   * Passage shards (T2) are fetched lazily by the core per question; a failed shard is retryable (the fetcher forgets a failed request), and the page offers "Try again".
//   * Rendering is textContent / createTextNode only: no innerHTML, no insertAdjacentHTML, no document.write, no eval. Links come only from the engine's own source list and only
//     when they are same-site paths. Ids never reach the screen: the engine produces labels, this file only lays them out.
//   * Focus and scroll: after an answer the page scrolls to the START of the answer (never to the end of a long one). Focus stays in the question box for typed questions and moves to
//     the answer for chip clicks (the chip that had focus is replaced). Screen readers hear the answer through the role="log" region and short status messages through role="status".
//   * The ask bar is sticky at the bottom and its height is published as --bar-h (ResizeObserver), so main always reserves room for it and the answer start is never behind it.
import { openKB, browserFetcher, createEngine } from '../core/index.js';
import { endSent } from '../core/format.js';

export const MAX_Q = 300;
const SAFE_HREF = /^\/(?!\/)[A-Za-z0-9_\-./?=&%#]*$/;
const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object /;
const str = (v) => (v === undefined || v === null ? '' : String(v));
export const safeHref = (h) => (typeof h === 'string' && SAFE_HREF.test(h) ? h : null);

/** element factory: attributes and text only (never markup) */
function h(doc, tag, props = {}, ...kids) {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid !== undefined && kid !== null && kid !== false) e.appendChild(typeof kid === 'string' ? doc.createTextNode(kid) : kid);
  return e;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------------------------------------------------------------------
function chipList(doc, items, onAsk, label) {
  const ul = h(doc, 'ul', { class: 'chips', 'aria-label': label }); let n = 0;
  for (const it of items) {
    const text = str(it && it.label).trim(), q = str(it && (it.q || it.label)).trim();
    if (!text || !q) continue;
    const b = h(doc, 'button', { type: 'button', class: 'chip', 'data-q': q }, text);
    b.addEventListener('click', () => onAsk(q, 'chip'));
    ul.appendChild(h(doc, 'li', {}, b)); n++;
  }
  return n ? ul : null;
}

function renderBlock(doc, b, hrefOf, onAsk) {
  switch (b && b.t) {
    case 'lead': {
      const p = h(doc, 'p', { class: 'lead' });
      for (const r of b.runs || []) {
        const t = str(r && r.txt); if (!t) continue;
        if (r.ent) { const href = hrefOf.get(r.ent); p.appendChild(href ? h(doc, 'a', { class: 'ent', href }, t) : h(doc, 'strong', { class: 'ent' }, t)); } else p.appendChild(doc.createTextNode(t));
      }
      return p;
    }
    case 'note': return h(doc, 'p', { class: 'note' }, endSent(str(b.txt)));
    case 'quote': return h(doc, 'figure', { class: 'quote' }, h(doc, 'blockquote', {}, h(doc, 'p', {}, `“${str(b.text)}”`)), h(doc, 'figcaption', {}, `— ${endSent(str(b.attrib))}`));
    case 'list': {
      const ul = h(doc, 'ul', {});
      for (const it of b.items || []) if (str(it && it.txt)) ul.appendChild(h(doc, 'li', {}, str(it.txt)));
      if (str(b.more)) ul.appendChild(h(doc, 'li', { class: 'more' }, str(b.more)));
      return h(doc, 'div', { class: 'list' }, str(b.title) ? h(doc, 'p', { class: 'list-title' }, str(b.title)) : null, ul);
    }
    case 'table': {
      const cap = str(b.caption) || 'Table';
      const t = h(doc, 'table', {}, h(doc, 'caption', {}, cap), h(doc, 'thead', {}, h(doc, 'tr', {}, (b.cols || []).map((c) => h(doc, 'th', { scope: 'col' }, str(c))))),
        h(doc, 'tbody', {}, (b.rows || []).map((r) => h(doc, 'tr', {}, (Array.isArray(r) ? r : []).map((c, i) => (i === 0 ? h(doc, 'th', { scope: 'row' }, str(c)) : h(doc, 'td', {}, str(c))))))));
      const wrap = h(doc, 'div', { class: 'tablewrap', role: 'region', tabindex: '0', 'aria-label': cap }, t);
      return str(b.note) ? h(doc, 'div', {}, wrap, h(doc, 'p', { class: 'note' }, endSent(str(b.note)))) : wrap;
    }
    case 'chips': return chipList(doc, b.items || [], onAsk, 'Related questions');
    default: return null;                                    // an unknown block type is dropped, never dumped
  }
}

/** one answer -> one <article>. Returns the element; never throws on a malformed answer (the caller shows an error card instead when this returns null). */
export function renderAnswer(doc, answer, { onAsk = () => {} } = {}) {
  if (!answer || !Array.isArray(answer.blocks) || answer.blocks.length === 0) return null;
  if (answer.lint && answer.lint.length) return null;         // an answer that fails the engine's own lint is never shown
  const mode = /^[a-z-]{2,20}$/.test(str(answer.mode)) ? answer.mode : 'answer';
  const hrefOf = new Map((answer.sources || []).map((s) => [s.id, safeHref(s.href)]));
  const art = h(doc, 'article', { class: `msg bot mode-${mode}`, tabindex: '-1', 'aria-label': 'Answer' });
  const dym = (answer.did_you_mean || []).filter((d) => d && str(d.from) && str(d.to));
  if (dym.length) art.appendChild(h(doc, 'p', { class: 'dym' }, dym.length === 1 ? `Showing results for “${str(dym[0].to)}” (you typed “${str(dym[0].from)}”).` : `Reading ${dym.slice(0, 3).map((d) => `“${str(d.from)}” as “${str(d.to)}”`).join(', ')}.`));
  for (const b of answer.blocks) { const el = renderBlock(doc, b, hrefOf, onAsk); if (el) art.appendChild(el); }
  const seen = new Set(); const src = [];
  for (const s of answer.sources || []) { const label = str(s && s.label).trim(); if (!label || seen.has(label)) continue; seen.add(label); src.push({ label, href: safeHref(s.href) }); }
  if (src.length) {
    const ul = h(doc, 'ul', {});
    for (const s of src.slice(0, 12)) ul.appendChild(h(doc, 'li', {}, s.href ? h(doc, 'a', { href: s.href }, s.label) : s.label));
    art.appendChild(h(doc, 'details', { class: 'sources' }, h(doc, 'summary', {}, `Sources (${Math.min(src.length, 12)})`), ul));
  }
  const follow = chipList(doc, (answer.chips && answer.chips.follow) || [], onAsk, 'Follow-up questions');
  if (follow) art.appendChild(follow);
  return art;
}

/** every text node under an element (used by the last-ditch "never print undefined" guard and by the tests) */
export function textOf(node) {
  if (!node) return '';
  if (node.nodeType === 3) return str(node.data);
  return Array.from(node.childNodes || []).map(textOf).join(' ');
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// the app
// ---------------------------------------------------------------------------------------------------------------------------------------
export function onsiteFromParams(search) {
  const p = new URLSearchParams(search || '');
  const unit = p.get('unit'), tickRaw = p.get('tick'), day = Number(p.get('day')), loc = p.get('loc');
  const o = {};
  if (unit && /^[A-Za-z0-9:_-]{1,40}$/.test(unit)) o.selected_unit = unit;
  const tick = tickRaw === null || tickRaw === '' ? NaN : Number(tickRaw);
  if (Number.isFinite(tick) && tick >= 0 && tick <= 999) o.tick = tick;
  if ([1, 2, 3].includes(day)) o.day = day;
  if (loc && loc.length <= 80) o.location = loc;
  return Object.keys(o).length ? o : null;
}

export function createApp({ doc, loadKB, search = '', reducedMotion = false, log = () => {} }) {
  const $ = (id) => doc.getElementById(id);
  const el = { transcript: $('transcript'), form: $('ask-row'), input: $('ask'), btn: $('ask-btn'), status: $('status'), intro: $('intro'), reset: $('reset'), bar: $('ask-row') };
  const onsite = onsiteFromParams(search);
  const state = { ctx: {}, busy: false, asked: 0, last: null };
  let enginePromise = null;

  const setStatus = (text, { error = false, retry = null } = {}) => {
    if (!el.status) return;
    el.status.textContent = str(text);
    el.status.className = error ? 'error' : '';
    if (retry) { const b = h(doc, 'button', { type: 'button', class: 'linkbtn' }, 'Try again'); b.addEventListener('click', retry); el.status.appendChild(doc.createTextNode(' ')); el.status.appendChild(b); }
  };
  const getEngine = () => {
    if (!enginePromise) {
      const p = Promise.resolve().then(loadKB).then((kb) => createEngine(kb));
      enginePromise = p;
      p.catch(() => { if (enginePromise === p) enginePromise = null; });   // a failed open is retryable: the next question opens the records again
    }
    return enginePromise;
  };

  function scrollToStart(node) {
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }
  function errorCard(q, e) {
    const retryable = !e || e.retryable !== false;
    const art = h(doc, 'article', { class: 'msg bot mode-error', tabindex: '-1', 'aria-label': 'Answer' },
      h(doc, 'p', {}, retryable ? 'Some of the battle’s records could not be loaded just now. Check your connection and try again.' : 'That answer could not be shown. Try naming a regiment, a commander or a place.'));
    if (retryable) { const b = h(doc, 'button', { type: 'button', class: 'chip' }, 'Try again'); b.addEventListener('click', () => { art.remove(); ask(q, 'retry'); }); art.appendChild(b); }
    return art;
  }

  async function ask(raw, via = 'form') {
    const q = str(raw).replace(/\s+/g, ' ').trim().slice(0, MAX_Q);
    if (!q) { setStatus('Type a question first.'); if (el.input) el.input.focus(); return null; }
    if (state.busy) { setStatus('One moment, still searching.'); return null; }
    state.busy = true; state.asked++;
    if (el.btn) el.btn.disabled = true;
    if (el.transcript) el.transcript.setAttribute('aria-busy', 'true');
    if (el.intro) el.intro.hidden = true;
    if (el.reset) el.reset.hidden = false;
    if (via !== 'retry' && el.transcript) el.transcript.appendChild(h(doc, 'div', { class: 'msg user' }, h(doc, 'span', { class: 'sr-only' }, 'You asked: '), q));
    if (el.input && via !== 'retry') el.input.value = '';
    const pending = h(doc, 'div', { class: 'msg bot pending', 'aria-hidden': 'true' }, 'Searching the records…');
    if (el.transcript) el.transcript.appendChild(pending);
    setStatus('Searching the records…');
    let art = null;
    try {
      const engine = await getEngine();
      const answer = await engine.ask(q, { ...state.ctx, ...(onsite ? { onsite } : {}) });
      if (answer && answer.ctx) state.ctx = answer.ctx;
      art = renderAnswer(doc, answer, { onAsk: (nq, v) => ask(nq, v) });
      if (art && BAD_TEXT.test(textOf(art))) { log('answer text failed the last-ditch guard', q); art = null; }
      if (!art) art = errorCard(q, { retryable: false });
      state.last = { q, answer };
      setStatus('');
    } catch (e) {
      log('ask failed', q, e && e.message);
      art = errorCard(q, e);
      setStatus('', {});
    } finally {
      pending.remove();
      if (el.transcript) { el.transcript.appendChild(art); el.transcript.setAttribute('aria-busy', 'false'); }
      state.busy = false;
      if (el.btn) el.btn.disabled = false;
      scrollToStart(art);
      if (via === 'chip' || via === 'retry') { if (art && typeof art.focus === 'function') art.focus({ preventScroll: true }); }
      else if (el.input) el.input.focus({ preventScroll: true });
    }
    return art;
  }

  function reset() {
    if (el.transcript) el.transcript.replaceChildren();
    state.ctx = {}; state.last = null;
    if (el.intro) el.intro.hidden = false;
    if (el.reset) el.reset.hidden = true;
    setStatus('Started a new conversation.');
    if (el.input) el.input.focus();
  }

  // wiring ----------------------------------------------------------------------------------------------------------------------------
  if (el.form) el.form.addEventListener('submit', (e) => { if (e && e.preventDefault) e.preventDefault(); ask(el.input ? el.input.value : '', 'form'); });
  if (el.input) el.input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { el.input.value = ''; } });
  if (el.reset) el.reset.addEventListener('click', reset);
  if (el.intro && el.intro.querySelectorAll) for (const b of el.intro.querySelectorAll('button.chip')) b.addEventListener('click', () => ask(b.getAttribute('data-q'), 'chip'));
  doc.addEventListener('keydown', (e) => {
    const t = e.target; const tag = t && t.tagName ? String(t.tagName).toLowerCase() : '';
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'input' && tag !== 'textarea' && !(t && t.isContentEditable)) { if (e.preventDefault) e.preventDefault(); if (el.input) el.input.focus(); }
  });

  // publish the ask bar's height so main reserves exactly that much room below the last message
  const publishBar = () => { if (el.bar && el.bar.getBoundingClientRect && doc.documentElement && doc.documentElement.style) { const hgt = Math.ceil(el.bar.getBoundingClientRect().height); if (hgt > 0) doc.documentElement.style.setProperty('--bar-h', `${hgt}px`); } };
  publishBar();
  const RO = doc.defaultView && doc.defaultView.ResizeObserver;
  if (RO && el.bar) new RO(publishBar).observe(el.bar);

  // first paint is independent of the knowledge base: start loading now, tell the reader, and let them type meanwhile
  const warm = () => { setStatus('Loading the battle’s records…'); return getEngine().then(() => { if (!state.busy) setStatus(''); }, () => setStatus('The battle’s records could not be loaded.', { error: true, retry: warm })); };
  const ready = warm();
  const q0 = new URLSearchParams(search || '').get('q');
  if (q0) ready.then(() => ask(q0, 'form'));
  return { ask, reset, state, ready, getEngine };
}

export function boot(win = globalThis.window) {
  const doc = win.document;
  const meta = doc.querySelector('meta[name="hx-base"]');
  let base = '../dist/hx/';
  try { const u = new URL(meta ? meta.getAttribute('content') : base, win.location.href); if (u.origin === win.location.origin) base = u.href.endsWith('/') ? u.href : u.href + '/'; else base = new URL('../dist/hx/', win.location.href).href; } catch { base = new URL('../dist/hx/', win.location.href).href; }
  const reduced = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return createApp({ doc, loadKB: () => openKB(browserFetcher(base)), search: win.location.search, reducedMotion: reduced, log: (...a) => { try { console.warn('[historian]', ...a); } catch { /* ignore */ } } });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined' && document.getElementById && document.getElementById('ask')) boot(window);
