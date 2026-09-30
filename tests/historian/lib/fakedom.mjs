// fakedom.mjs - a tiny DOM (no browser, no dependency) that is just big enough to run historian-src/page/historian.js against the REAL historian.html:
// an HTML parser for the page's markup, elements with attributes / classes / listeners / focus / scrollIntoView recording, text nodes, and a document with getElementById.
// It is deliberately strict where the page must be careful: setting innerHTML / outerHTML / insertAdjacentHTML throws, so a page that used them would fail every test.
const VOID = new Set(['meta', 'link', 'input', 'br', 'img', 'hr', 'source']);
const ENT = { '&larr;': '←', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&hellip;': '…', '&mdash;': '—', '&rarr;': '→', '&nbsp;': ' ' };
const decode = (s) => s.replace(/&[a-z#0-9]+;/gi, (m) => ENT[m] ?? m);

class FNode {
  constructor(type) { this.nodeType = type; this.parentNode = null; this.childNodes = []; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
}
export class FText extends FNode {
  constructor(data) { super(3); this.data = String(data); }
  get textContent() { return this.data; }
}
export class FEl extends FNode {
  constructor(tag, doc) {
    super(1); this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.attrs = new Map(); this.className = '';
    this.listeners = {}; this.style = { props: {}, setProperty(k, v) { this.props[k] = v; } };
    this.hidden = false; this.value = ''; this.disabled = false; this.focusCalls = []; this.scrolls = []; this.fakeHeight = 0; this.isContentEditable = false;
  }
  setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'class') this.className = String(v); if (k === 'hidden') this.hidden = true; }
  getAttribute(k) { if (k === 'class') return this.className || (this.attrs.get('class') ?? null); return this.attrs.has(k) ? this.attrs.get(k) : null; }
  removeAttribute(k) { this.attrs.delete(k); }
  get id() { return this.getAttribute('id') || ''; }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(t) { this.childNodes = []; if (t !== '' && t !== null && t !== undefined) this.appendChild(new FText(t)); }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  replaceChildren(...n) { this.childNodes = []; for (const x of n) this.appendChild(x); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  dispatch(t, ev = {}) {
    const e = { type: t, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...ev };
    for (const fn of this.listeners[t] || []) fn(e);
    if (t === 'keydown' || t === 'click') { let d = this.ownerDocument; for (const fn of (d.listeners[t] || [])) fn(e); }
    return e;
  }
  click() { return this.dispatch('click'); }
  focus(opts) { this.ownerDocument.activeElement = this; this.focusCalls.push(opts || {}); }
  scrollIntoView(o) { this.scrolls.push(o || {}); }
  getBoundingClientRect() { return { height: this.fakeHeight, width: 320, top: 0, bottom: this.fakeHeight }; }
  get innerHTML() { return ''; }
  set innerHTML(v) { throw new Error('innerHTML is forbidden: the page must use textContent only'); }
  set outerHTML(v) { throw new Error('outerHTML is forbidden'); }
  insertAdjacentHTML() { throw new Error('insertAdjacentHTML is forbidden'); }
  descendants() { const out = []; const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 1) { out.push(c); walk(c); } } }; walk(this); return out; }
  matches(sel) {
    // tag, tag.class, .class, #id, [attr] and comma-free combinations of those (enough for this page)
    const m = sel.match(/^([a-z0-9]*)((?:\.[\w-]+)*)(#[\w-]+)?((?:\[[\w-]+(?:="[^"]*")?\])*)$/i); if (!m) return false;
    if (m[1] && this.tagName !== m[1].toUpperCase()) return false;
    for (const c of (m[2] || '').split('.').filter(Boolean)) if (!this.className.split(/\s+/).includes(c)) return false;
    if (m[3] && this.id !== m[3].slice(1)) return false;
    for (const a of (m[4] || '').match(/\[[^\]]+\]/g) || []) { const [k, v] = a.slice(1, -1).split('='); const val = this.getAttribute(k); if (val === null) return false; if (v !== undefined && val !== v.replace(/"/g, '')) return false; }
    return true;
  }
  querySelectorAll(sel) { return this.descendants().filter((e) => e.matches(sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

export class FDoc {
  constructor() {
    this.documentElement = new FEl('html', this); this.listeners = {}; this.activeElement = null;
    this.defaultView = { ResizeObserver: class { constructor(cb) { this.cb = cb; FDoc.observers.push(this); } observe() {} } };
  }
  createElement(tag) { return new FEl(tag, this); }
  createTextNode(t) { return new FText(t); }
  getElementById(id) { return this.documentElement.descendants().find((e) => e.id === id) || null; }
  querySelector(sel) { return this.documentElement.querySelector(sel); }
  querySelectorAll(sel) { return this.documentElement.querySelectorAll(sel); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  keydown(key, target = null, extra = {}) { const e = { type: 'keydown', key, target: target || this.body || this.documentElement, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const fn of this.listeners.keydown || []) fn(e); return e; }
}
FDoc.observers = [];

/** parse the page's HTML into a FDoc (head + body); scripts and styles are kept as elements with no execution */
export function parseHTML(html) {
  const doc = new FDoc();
  const stack = [doc.documentElement];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) { const tag = m[1].toUpperCase(); for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag) { stack.length = i; break; } continue; }
    if (m[2]) {
      const tag = m[2].toLowerCase();
      if (tag === 'html') { for (const a of m[3].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) doc.documentElement.setAttribute(a[1], a[2] ?? a[3] ?? a[4] ?? ''); continue; }
      const el = doc.createElement(tag);
      for (const a of m[3].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) el.setAttribute(a[1], decode(a[2] ?? a[3] ?? a[4] ?? ''));
      stack[stack.length - 1].appendChild(el);
      if (tag === 'body') doc.body = el;
      if (!VOID.has(tag) && !m[4]) stack.push(el);
      continue;
    }
    if (m[5] !== undefined) { const t = decode(m[5]); if (t.trim() !== '' || stack[stack.length - 1].tagName === 'P') stack[stack.length - 1].appendChild(new FText(t.replace(/\s+/g, ' '))); }
  }
  return doc;
}
