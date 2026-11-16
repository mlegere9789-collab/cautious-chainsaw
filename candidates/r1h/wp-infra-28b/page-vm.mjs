// A fake page for the Live Sync tests: the inline scripts of watch-together.html run in node:vm against a fake DOM, a fake mapboxgl, a fake
// PeerJS and a clock that the test controls.  Nothing here is a browser: it proves what the page SCRIPT does with what it is given.
//
//   const page = await loadPage(html, { getRandomValues, noCrypto });
//   await page.hostStart();  page.peers.at(-1).emit('open');  ...
//
// What the page script can be seen doing (goToTick is private to the page, so its effects are what is observed): the caption bar text,
// the data given to the 'wt-units' source, and the map's fitBounds calls.  A fake placement exists for every moment 1..675 and its
// coordinates carry the moment number, so the moment goToTick was given can be read back from the data (lastShownTick).
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

class FakeEl {
  constructor(id, tag = 'div') {
    this.id = id; this.tagName = String(tag).toUpperCase(); this.style = {}; this.attributes = {}; this.listeners = {}; this.children = [];
    this.value = ''; this.disabled = false; this.className = ''; this._text = ''; this._html = ''; this.textLog = []; this.htmlLog = []; this.clicks = 0; this.focusCalls = 0;
    const classes = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, on) => { const want = on === undefined ? !classes.has(c) : !!on; if (want) classes.add(c); else classes.delete(c); return want; },
      contains: (c) => classes.has(c),
    };
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.textLog.push(this._text); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this.htmlLog.push(this._html); if (this._html === '') this.children = []; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { this.clicks++; for (const f of [...(this.listeners.click || [])]) f.call(this, { type: 'click', target: this, preventDefault() {} }); }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  appendChild(c) { this.children.push(c); return c; }
  append(...cs) { for (const c of cs) this.children.push(c); }
  querySelectorAll(sel) {
    const out = [];
    const walk = (el) => { for (const c of el.children) { if (c && c.tagName && c.tagName.toLowerCase() === String(sel).toLowerCase()) out.push(c); if (c && c.children) walk(c); } };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  focus() { this.focusCalls++; }
}

class FakeConn {
  constructor(peerId) { this.peer = peerId; this.handlers = {}; this.open = false; this.sent = []; this.closeCalls = 0; this.onCalls = 0; }
  on(ev, fn) { this.onCalls++; (this.handlers[ev] ||= []).push(fn); }
  emit(ev, ...a) { if (ev === 'open') this.open = true; for (const f of (this.handlers[ev] || []).slice()) f(...a); }
  send(m) { this.sent.push(m); }
  close() { this.closeCalls++; this.open = false; }
}

class FakeMap {
  constructor(maps) { this.handlers = {}; this.sources = {}; this.layers = []; this.fitBoundsCalls = []; maps.push(this); }
  addControl() {}
  once(ev, fn) { (this.handlers[ev] ||= []).push(fn); }
  on(ev, fn) { (this.handlers[ev] ||= []).push(fn); }
  emit(ev) { for (const f of (this.handlers[ev] || []).slice()) f(); }
  addSource(id, def) { this.sources[id] = { def, setDataCalls: [], setData(d) { this.setDataCalls.push(d); } }; }
  getSource(id) { return this.sources[id]; }
  addLayer(l) { this.layers.push(l); }
  fitBounds(b, o) { this.fitBoundsCalls.push([b, o]); }
}

export { FakeConn, FakeEl, FakeMap };

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

/** the script that holds the Live Sync code: it registers the DOMContentLoaded handler and defines withPeerJs */
export function liveSyncScript(html) {
  const found = inlineScripts(html).filter((s) => /document\.addEventListener\('DOMContentLoaded'/.test(s.body) && /function withPeerJs\(/.test(s.body));
  if (found.length !== 1) throw new Error(`expected one inline script with the Live Sync code, found ${found.length}`);
  return found[0].body;
}

export const PLACEMENT_UNITS = [{ id: 'U-test', lat: 39.5, lng: -77.5 }, { id: 'C-test', lat: 39.502, lng: -77.498 }];
/** coordinates carry the moment: lat = base + tick * 1e-5 (unit U-test first in every feature list) */
export function shownTickFromFeatures(fc) {
  const f = fc && fc.features && fc.features[0];
  return f ? Math.round((f.geometry.coordinates[1] - PLACEMENT_UNITS[0].lat) * 1e5) : null;
}

export async function loadPage(html, opts = {}) {
  const script = liveSyncScript(html);
  const timeScripts = inlineScripts(html).filter((s) => /g\.GTBGTime\s*=/.test(s.body)).map((s) => s.body);
  const els = new Map();
  const getEl = (id) => { if (!els.has(id)) els.set(id, new FakeEl(id)); return els.get(id); };
  const domHandlers = [];
  const peers = [], maps = [], timers = [], alerts = [], rejections = [], consoleLines = [];
  const store = new Map();

  class FakePeer {
    constructor(id) { this.id = id; this.handlers = {}; this.open = false; this.destroyed = false; this.disconnected = false; this.connectCalls = []; peers.push(this); }
    on(ev, fn) { (this.handlers[ev] ||= []).push(fn); }
    emit(ev, ...a) { if (ev === 'open') this.open = true; for (const f of (this.handlers[ev] || []).slice()) f(...a); }
    destroy() { this.destroyed = true; this.open = false; }
    connect(id) { const c = new FakeConn(id); this.connectCalls.push([id, c]); return c; }
  }

  const cryptoSpy = {
    calls: 0, sizes: [],
    getRandomValues(arr) {
      this.calls++; this.sizes.push(arr.length);
      if (opts.getRandomValues) return opts.getRandomValues(arr, this.calls);
      return webcrypto.getRandomValues(arr);
    },
  };

  const document = {
    addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') domHandlers.push(fn); },
    getElementById: getEl,
    createElement: (tag) => new FakeEl(null, tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    head: new FakeEl('head', 'head'), body: new FakeEl('body', 'body'),
    documentElement: new FakeEl('html', 'html'),
  };
  const mapboxgl = {
    accessToken: '', prewarm() {}, NavigationControl: class {},
    Map: class extends FakeMap { constructor() { super(maps); } },
  };
  const rawFetch = async (url) => {
    const m = /ticks(\d+)_(\d+)/.exec(String(url));
    const placements = [];
    if (m) for (let tick = +m[1]; tick <= +m[2]; tick++) for (const u of PLACEMENT_UNITS) placements.push({ unit_id: u.id, tick, lat: u.lat + tick * 1e-5, lng: u.lng + tick * 1e-5, strength: 100 });
    return { json: async () => ({ placements }) };
  };
  const sandbox = {
    document, mapboxgl, fetch: rawFetch, Peer: FakePeer,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); } },
    console: { log: (...a) => consoleLines.push(a.join(' ')), warn: (...a) => consoleLines.push(a.join(' ')), error: (...a) => consoleLines.push(a.join(' ')) },
    alert: (m) => alerts.push(String(m)),
    requestAnimationFrame: (fn) => { const t = { fn, cancelled: false }; timers.push(t); return timers.length; },
    setTimeout: (fn) => { const t = { fn, cancelled: false }; timers.push(t); return timers.length; },
    clearTimeout: () => {},
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL() {} }, Blob: class { constructor(parts) { this.parts = parts; } },
    navigator: { userAgent: 'node-vm' },
  };
  if (!opts.noCrypto) sandbox.crypto = cryptoSpy;
  const ctx = vm.createContext(sandbox);
  vm.runInContext('globalThis.window = globalThis;', ctx);
  vm.runInContext('globalThis.__randomCalls = 0; Math.random = function () { globalThis.__randomCalls++; throw new Error("Math.random was called"); };', ctx);

  const onRejection = (reason) => { rejections.push(reason); };
  process.on('unhandledRejection', onRejection);

  for (const body of timeScripts) vm.runInContext(body, ctx, { filename: 'watch-together.html#time' });
  vm.runInContext(script, ctx, { filename: 'watch-together.html#live-sync' });
  await Promise.all(domHandlers.map((h) => h.call(document)));

  async function settle() {
    for (let guard = 0; guard < 60; guard++) {
      await new Promise((r) => setImmediate(r));
      if (!timers.length) { await new Promise((r) => setImmediate(r)); if (!timers.length) break; }
      for (const t of timers.splice(0)) if (!t.cancelled) t.fn();
    }
    if (rejections.length) { const r = rejections.splice(0); throw (r[0] instanceof Error ? r[0] : new Error(`unhandled rejection: ${String(r[0])}`)); }
  }

  const page = {
    ctx, document, peers, maps, alerts, consoleLines, store, cryptoSpy, el: getEl, settle,
    /** evaluate an expression in the page's realm (payloads are built there) */
    build: (expr) => vm.runInContext(`(${expr})`, ctx),
    mathRandomCalls: () => vm.runInContext('globalThis.__randomCalls', ctx),
    /** the map fires 'load': the 'wt-units' source exists from now on, so goToTick's data can be seen */
    mapLoaded() { for (const m of maps) m.emit('load'); },
    unitsSource: () => { for (const m of maps) if (m.sources['wt-units']) return m.sources['wt-units']; return null; },
    effects() {
      const src = page.unitsSource();
      return { caption: getEl('caption-bar').textLog.length, data: src ? src.setDataCalls.length : 0, fit: maps.reduce((n, m) => n + m.fitBoundsCalls.length, 0) };
    },
    /** what goToTick last put on the screen: the moment read back from the data, the caption text */
    lastShown() {
      const src = page.unitsSource();
      const d = src && src.setDataCalls.length ? src.setDataCalls[src.setDataCalls.length - 1] : null;
      return { tick: d ? shownTickFromFeatures(d) : null, caption: getEl('caption-bar').textLog.at(-1) ?? null };
    },
    sameEffects(a, b) { return a.caption === b.caption && a.data === b.data && a.fit === b.fit; },
    status: () => ({ text: getEl('sync-status').textContent, cls: getEl('sync-status').className }),
    async hostStart() { getEl('host-btn').click(); await settle(); return peers.at(-1) ?? null; },
    async join(code) { getEl('join-code').value = code; getEl('join-btn').click(); await settle(); return peers.at(-1) ?? null; },
    /** a joined guest: the peer opens, the connection to the host is made and opened; returns the connection */
    async joinAs(code) {
      const peer = await page.join(code);
      peer.emit('open', 'guest-id');
      const [, conn] = peer.connectCalls.at(-1);
      conn.emit('open');
      return conn;
    },
    /** a started host whose broker connection is open */
    async hostOpen() { const peer = await page.hostStart(); peer.emit('open', peer.id); return peer; },
    /** the host's "Add stop" with a moment and a note: the page's own goToTick runs and broadcasts */
    addStop(tick, note = '') { getEl('new-tick').value = String(tick); getEl('new-note').value = note; getEl('add-stop').click(); },
    /** every element the page asked for or made by id */
    elements: () => [...els.values()],
    close() { process.removeListener('unhandledRejection', onRejection); },
  };
  return page;
}
