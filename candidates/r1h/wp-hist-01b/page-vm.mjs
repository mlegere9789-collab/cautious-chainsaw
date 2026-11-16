// A fake page for the Ask the Historian tests: the REAL inline scripts of historian.html (the clock module of the head and the page script)
// run in node:vm against a minimal DOM that is built from the page's own static markup, with a fetch stub the test controls.
// Nothing here is a browser: it proves what the page SCRIPT does with what it is given; layout, focus rings and screen readers are not seen.
//
//   const page = await loadPage(html, { read: (urlPath) => jsonText, plan: (url, attempt) => 'ok' | 'reject' | 'status500' | ... });
//   page.el('ask-row'), page.shown(el), page.text(el), page.retryButtons(), page.ask('20th Maine'), await page.settle()
//
// The DOM is deliberately small: tree of elements with attributes, inline style, textContent, innerHTML (kept as a string, not parsed),
// appendChild, addEventListener, click (not on a disabled element), focus (document.activeElement), scrollIntoView (recorded),
// querySelector(All) for tag, #id, .class and [attr] selectors.  An id that is not in the page's static markup gives null, as in a browser,
// so a script that needs an element the markup lacks fails here too.
import vm from 'node:vm';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', rarr: '→', larr: '←', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', nbsp: ' ' };
export const decode = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return Object.prototype.hasOwnProperty.call(ENT, e.toLowerCase()) ? ENT[e.toLowerCase()] : m;
});
const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// ---------------------------------------------------------------------------------------------------------------------------------
// selectors: tag, #id, .class, [attr], [attr=value], and combinations of them (no combinators: the last compound of a descendant selector is used)
const COMPOUND = /^([a-zA-Z][a-zA-Z0-9-]*|\*)?(#[\w-]+)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/;
function matchesCompound(el, sel) {
  const m = COMPOUND.exec(sel.trim());
  if (!m) return false;
  const [, tag, id, classes, attrs] = m;
  if (tag && tag !== '*' && el.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  if (id && el.id !== id.slice(1)) return false;
  if (classes) for (const c of classes.split('.').filter(Boolean)) if (!el.classNames().includes(c)) return false;
  if (attrs) for (const a of attrs.match(/\[[^\]]+\]/g)) {
    const am = /^\[\s*([^\]=\s]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*)))?\s*\]$/.exec(a);
    if (!am) return false;
    const v = el.getAttribute(am[1]);
    if (v === null) return false;
    const want = am[2] ?? am[3] ?? am[4];
    if (want !== undefined && v !== want) return false;
  }
  return true;
}
export const matchesSelector = (el, selector) => String(selector).split(',').some((s) => matchesCompound(el, s.trim().split(/\s+/).pop()));

// ---------------------------------------------------------------------------------------------------------------------------------
export class El {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase();
    this.ownerDocument = doc || null;
    this.attrs = {};
    this.style = {};
    this.children = [];
    this.parent = null;
    this._text = '';
    this._html = '';
    this.value = '';
    this.disabled = false;
    this.type = '';
    this.listeners = {};
    this.focusCalls = 0;
    this.scrolls = [];
    this.rawText = null;        // body of a <script> or <style>
  }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = String(v); }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  classNames() { return this.className.split(/\s+/).filter(Boolean); }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this._html = ''; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this._text = ''; this._html = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'disabled') this.disabled = true; }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  hasAttribute(k) { return this.getAttribute(k) !== null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) {
    if (c.parent) c.parent.children = c.parent.children.filter((x) => x !== c);
    c.parent = this; this.children.push(c); return c;
  }
  append(...cs) { cs.forEach((c) => this.appendChild(c)); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
  dispatch(type, extra = {}) {
    const ev = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...extra };
    for (const f of [...(this.listeners[type] || [])]) f.call(this, ev);
    return ev;
  }
  click() { if (this.disabled) return null; return this.dispatch('click'); }
  focus() { if (this.disabled) return; this.focusCalls++; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  scrollIntoView(o) { this.scrolls.push(o || null); }
  *walk() { for (const c of this.children) { yield c; yield* c.walk(); } }
  find(fn) { for (const e of this.walk()) if (fn(e)) return e; return null; }
  querySelectorAll(sel) { return [...this.walk()].filter((e) => matchesSelector(e, sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  ancestors() { const out = []; for (let p = this.parent; p; p = p.parent) out.push(p); return out; }
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/y;
const ATTR = /([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/** the static markup as a tree of El (tolerant: unknown or unbalanced end tags are ignored; comments and the doctype are skipped) */
export function parseHTML(html, doc = null) {
  const root = new El('#document', doc);
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { top()._text += decode(html.slice(i)); break; }
    if (lt > i) top()._text += decode(html.slice(i, lt));
    if (html.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
    if (html.startsWith('<!', lt)) { const e = html.indexOf('>', lt); i = e < 0 ? n : e + 1; continue; }
    TAG.lastIndex = lt;
    const m = TAG.exec(html);
    if (!m) { top()._text += '<'; i = lt + 1; continue; }
    i = lt + m[0].length;
    const [, closing, name, rest] = m;
    const tag = name.toLowerCase();
    if (closing) {
      for (let k = stack.length - 1; k > 0; k--) if (stack[k].tagName.toLowerCase() === tag) { stack.length = k; break; }
      continue;
    }
    const el = new El(tag, doc);
    ATTR.lastIndex = 0;
    let a;
    while ((a = ATTR.exec(rest.replace(/\/\s*$/, '')))) el.attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
    if (el.attrs.disabled !== undefined) el.disabled = true;
    if (el.attrs.value !== undefined) el.value = el.attrs.value;
    if (el.attrs.type !== undefined) el.type = el.attrs.type;
    for (const decl of (el.attrs.style || '').split(';')) { const k = decl.indexOf(':'); if (k > 0) el.style[camel(decl.slice(0, k).trim())] = decl.slice(k + 1).trim(); }
    el.parent = top(); top().children.push(el);
    if (tag === 'script' || tag === 'style') {
      const close = html.toLowerCase().indexOf('</' + tag, i);
      el.rawText = html.slice(i, close < 0 ? n : close);
      i = close < 0 ? n : html.indexOf('>', close) + 1;
      continue;
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(rest)) stack.push(el);
  }
  return root;
}

export function inlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/.test(m[1])) continue;
    if (/\btype\s*=\s*["']?(?!text\/javascript|module)/i.test(m[1])) continue;
    out.push({ attrs: m[1].trim(), body: m[2] });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the 15 data files of the page, in the order the page asks for them (written out here on purpose: the test compares them with what the page requests)
export const DATA_URLS = [
  ...['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps', 'confederate_regiments_first_corps',
    'confederate_regiments_second_corps', 'confederate_regiments_third_corps', 'union_cavalry_artillery', 'confederate_cavalry'].map((f) => `/data/oob/${f}.json`),
  '/data/vignettes_part1.json', '/data/vignettes_part2.json', '/data/vignettes_part3.json',
  '/data/chronology_day1.json', '/data/chronology_day2.json', '/data/chronology_day3.json',
  '/data/terrain.json',
];

/** how a request can go wrong (plus 'ok') */
export const FAILURES = {
  reject: 'the request itself fails (offline, DNS, reset)',
  status500: 'the server answers 500 with an HTML error page',
  status404json: 'the server answers 404 with a body that is valid JSON',
  badjson: 'the answer is 200 but not JSON',
  nullbody: 'the answer is 200 and the JSON is null',
};

function respond(kind, url, read) {
  switch (kind) {
    case 'ok': { const text = read(url); if (text == null) return Promise.reject(new Error(`no fixture for ${url}`)); return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(text) }); }
    case 'reject': return Promise.reject(new TypeError('Failed to fetch'));
    case 'status500': return Promise.resolve({ ok: false, status: 500, json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); } });
    case 'status404json': return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    case 'badjson': return Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } });
    case 'nullbody': return Promise.resolve({ ok: true, status: 200, json: async () => null });
    default: throw new Error(`unknown failure kind ${kind}`);
  }
}

/** a small corpus: `regiments` go to the first order-of-battle file, `vignettes`, `events` and `places` to the first file of their kind */
export function fixtureReader({ regiments = [], vignettes = [], events = [], places = [] } = {}) {
  return (url) => {
    if (url === DATA_URLS[0]) return JSON.stringify({ regiments });
    if (url.startsWith('/data/oob/')) return JSON.stringify({ regiments: [] });
    if (url === DATA_URLS[8]) return JSON.stringify({ vignettes });
    if (url.startsWith('/data/vignettes_')) return JSON.stringify({ vignettes: [] });
    if (url === DATA_URLS[11]) return JSON.stringify({ events });
    if (url.startsWith('/data/chronology_')) return JSON.stringify({ events: [] });
    if (url === DATA_URLS[14]) return JSON.stringify({ key_locations: places });
    return null;
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
export async function loadPage(html, { read, plan = () => 'ok', matchMedia = () => ({ matches: false }) } = {}) {
  const doc = { activeElement: null, listeners: {} };
  const root = parseHTML(html, doc);
  doc.documentElement = root;
  doc.body = root.find((e) => e.tagName === 'BODY') || root;
  doc.getElementById = (id) => root.find((e) => e.id === id) || null;
  doc.createElement = (tag) => new El(tag, doc);
  doc.querySelector = (s) => root.querySelector(s);
  doc.querySelectorAll = (s) => root.querySelectorAll(s);
  doc.addEventListener = (t, f) => { (doc.listeners[t] ||= []).push(f); };

  const scripts = inlineScripts(html);
  const clock = scripts.filter((s) => /g\.GTBGTime\s*=/.test(s.body));
  const pageScripts = scripts.filter((s) => /\bOOB_FILES\b/.test(s.body));
  if (clock.length !== 1) throw new Error(`expected one inline script with the clock module, found ${clock.length}`);
  if (pageScripts.length !== 1) throw new Error(`expected one inline page script, found ${pageScripts.length}`);

  const calls = [];
  const attempts = new Map();
  const consoleLines = [];
  const fetchFn = (url) => {
    const attempt = (attempts.get(url) || 0) + 1;
    attempts.set(url, attempt);
    const kind = plan(url, attempt);
    calls.push({ url, attempt, kind });
    return respond(kind, url, read);
  };
  const sandbox = {
    document: doc, fetch: fetchFn, matchMedia,
    console: { log: (...a) => consoleLines.push(a.join(' ')), warn: (...a) => consoleLines.push(a.join(' ')), error: (...a) => consoleLines.push(a.join(' ')) },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(clock[0].body, ctx, { filename: 'historian-clock.js' });
  const state = { pageError: null };
  const done = vm.runInContext(pageScripts[0].body, ctx, { filename: 'historian-page.js' });
  Promise.resolve(done).catch((e) => { state.pageError = e; });

  const page = {
    doc, root, calls, consoleLines, state,
    el: (id) => doc.getElementById(id),
    /** an element counts as shown when neither it nor an ancestor has display none or the hidden attribute */
    shown(el) {
      for (let e = el; e; e = e.parent) if (e.style.display === 'none' || e.hasAttribute('hidden')) return false;
      return true;
    },
    text(el) { return (el.rawText ?? el.textContent) || el.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); },
    retryButtons() { return root.querySelectorAll('button').filter((b) => /^\s*retry\s*$/i.test(b.textContent)); },
    messages() { const t = doc.getElementById('transcript'); return t ? t.children : []; },
    callsOf(url) { return calls.filter((c) => c.url === url); },
    async settle(rounds = 25) { for (let i = 0; i < rounds; i++) await new Promise((r) => setImmediate(r)); },
    /** types a question into the field and submits the form (what Enter or the Ask button does) */
    async ask(query) {
      const field = doc.getElementById('ask');
      field.value = query;
      const ev = doc.getElementById('ask-row').dispatch('submit');
      await page.settle();
      return ev;
    },
  };
  await page.settle();
  return page;
}
