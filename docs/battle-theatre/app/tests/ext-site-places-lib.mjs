// Shared stand-ins of the node tests of the site's places (src/ext/monuments.mjs, src/ext/tour.mjs, src/ext/site-places.mjs): the real terrain (no browser), a fetch that serves
// the app's data folder, a small stand-in page (elements, events, a recording 2D context) and a stand-in theatre that follows the contract of docs/EXT-CONTRACT.md. Nothing here
// opens a browser; the page itself is tests/ext-site-places-browser.mjs.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { Bus, Scope } from '../src/scope.mjs';
import { tierMark } from '../src/ui/extensions.mjs';

export const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..'), BT = path.resolve(APP, '..'), REPO = path.resolve(BT, '../..');
export const DATA = path.join(APP, 'data');
export const DATA_URL = 'https://bt.test/app/data/';           // what a stand-in ctx.urls.data says
export const readJSON = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

// ---- fetch: file: URLs (the terrain loader) and the stand-in data address; `overrides` maps a file name of the data folder to a replacement text
const realFetch = globalThis.fetch; let overrides = {};
export const overrideData = o => { overrides = o || {}; };
globalThis.fetch = async url => {
  const u = String(url);
  if (u.startsWith(DATA_URL)) { const f = u.slice(DATA_URL.length); if (f in overrides) return new Response(overrides[f], { status: 200 }); const p = path.join(DATA, f); return fs.existsSync(p) ? new Response(fs.readFileSync(p), { status: 200 }) : new Response('not found', { status: 404 }); }
  if (u.startsWith('file:')) { const p = fileURLToPath(u); return fs.existsSync(p) ? new Response(fs.readFileSync(p), { status: 200 }) : new Response('not found', { status: 404 }); }
  return realFetch(url);
};
let T0 = null;
/** The prototype's real terrain (heights and the lng/lat window), read from the files; the same one the theatre stands on. */
export async function realTerrain() {
  if (T0) return T0; const { loadTerrain } = await import(pathToFileURL(path.join(BT, 'render/prototype/src/world.mjs')).href);
  T0 = await loadTerrain(pathToFileURL(path.join(BT, 'render/prototype/')).href); return T0;
}

// ---- a recording 2D context: every call is kept, nothing is drawn
export function recordingContext() {
  const calls = [], texts = [], dashes = [], c = { calls, texts, dashes, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textBaseline: '' };
  for (const m of ['setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'arc', 'rect', 'fillRect', 'save', 'restore']) c[m] = () => { calls.push(m); };
  c.fillText = t => { calls.push('fillText'); texts.push(String(t)); }; c.setLineDash = d => { calls.push('setLineDash'); dashes.push([...d]); };
  c.measureText = t => ({ width: String(t).length * 6.2 }); return c;
}

// ---- a small stand-in page: elements with children, ids, classes, data attributes, listeners that honour an abort signal. innerHTML is read FLAT: every tag of the string becomes a child
// of the element (id, class, data-*, aria-*, hidden, checked, disabled, value kept), enough for querySelector by id, class, tag or attribute; nesting and combinators are not modelled.
const camel = k => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const TAG_RE = /<([a-zA-Z][a-zA-Z0-9]*)\b((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g, ATTR_RE = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
function compound(sel) {                       // one compound selector: tag#id.class[attr][attr="v"]  ->  {tag, id, classes, attrs: [[name, value|null]]}
  const m = /^([a-zA-Z][a-zA-Z0-9]*)?/.exec(sel), c = { tag: m[1] ? m[1].toUpperCase() : null, id: null, classes: [], attrs: [] }; let rest = sel.slice(m[0].length), k;
  const re = /#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/y; re.lastIndex = 0; while (rest && (k = re.exec(rest))) { if (k[1]) c.id = k[1]; else if (k[2]) c.classes.push(k[2]); else c.attrs.push([k[3], k[4] ?? null]); rest = rest.slice(k[0].length); re.lastIndex = 0; }
  return c;
}
export class FakeEl {
  constructor(tag = 'div') { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.dataset = {}; this.listeners = []; this.hidden = false; this.id = ''; this.className = ''; this.textContent = ''; this.width = 300; this.height = 150; this.removed = false; this.value = ''; this.checked = false; this.disabled = false;
    this._html = ''; const props = {}; this.style = { cssText: '', setProperty: (k, v) => { props[k] = v; }, getPropertyValue: k => props[k], props }; this.rect = { left: 0, top: 0, width: 1280, height: 720 }; }
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v); for (const c of this.children) c.parentNode = null; this.children = [];
    for (const m of this._html.matchAll(TAG_RE)) { const n = new FakeEl(m[1]); for (const a of m[2].matchAll(ATTR_RE)) { const k = a[1], val = a[2] ?? a[3] ?? a[4] ?? ''; if (k === 'id') n.id = val; else if (k === 'class') n.className = val; else if (k === 'hidden') n.hidden = true; else if (k === 'checked') n.checked = true; else if (k === 'disabled') n.disabled = true; else if (k === 'value') n.value = val; else if (k.startsWith('data-')) n.dataset[camel(k.slice(5))] = val; else n.attrs[k] = val; if (k.startsWith('data-') || k === 'aria-current') n.attrs[k] = val; } n.parentNode = this; this.children.push(n); }
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith('data-')) this.dataset[camel(k.slice(5))] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; if (k.startsWith('data-')) delete this.dataset[camel(k.slice(5))]; }
  addEventListener(type, fn, opts) { this.listeners.push({ type, fn, opts: opts || {} }); } removeEventListener(type, fn) { this.listeners = this.listeners.filter(l => !(l.type === type && l.fn === fn)); }
  live(type) { return this.listeners.filter(l => l.type === type && !(l.opts.signal && l.opts.signal.aborted)); }
  fire(type, ev = {}) { const e = { type, target: this, key: '', pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse', ...ev }; for (const l of this.live(type)) l.fn(e); let p = this.parentNode; while (p) { for (const l of p.live(type)) l.fn(e); p = p.parentNode; } return e; }
  _adopt(n) { if (n.parentNode) { const i = n.parentNode.children.indexOf(n); if (i >= 0) n.parentNode.children.splice(i, 1); } n.parentNode = this; n.removed = false; }
  append(...ns) { for (const n of ns) { this._adopt(n); this.children.push(n); } } prepend(...ns) { for (const n of ns.reverse()) { this._adopt(n); this.children.unshift(n); } }
  insertBefore(n, ref) { this._adopt(n); const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); return n; }
  after(...ns) { const p = this.parentNode; if (!p) return; let i = p.children.indexOf(this); for (const n of ns) { p._adopt(n); i = p.children.indexOf(this) + 1; p.children.splice(i, 0, n); } }
  remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); this.parentNode = null; } this.removed = true; }
  walk(fn) { for (const c of this.children) { if (fn(c) === true) return c; const r = c.walk(fn); if (r) return r; } return null; }
  matches(sel) { const parts = String(sel).trim().split(/\s+/), c = compound(parts[parts.length - 1]);          // the last compound only: no combinators
    if (c.tag && this.tagName !== c.tag) return false; if (c.id && this.id !== c.id) return false; const cls = this.className.split(/\s+/); if (!c.classes.every(x => cls.includes(x))) return false;
    return c.attrs.every(([k, v]) => { const own = k.startsWith('data-') ? this.dataset[camel(k.slice(5))] : this.attrs[k]; return own !== undefined && (v === null || own === v); }); }
  querySelector(sel) { return this.walk(c => c.matches(sel)); }
  querySelectorAll(sel) { const out = []; this.walk(c => { if (c.matches(sel)) out.push(c); return false; }); return out; }
  closest(sel) { let n = this; while (n) { if (n.matches(sel)) return n; n = n.parentNode; } return null; }
  getBoundingClientRect() { const r = this.rect; return { left: r.left, top: r.top, width: r.width, height: r.height, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }; }
  getContext() { return this.ctx2d || (this.ctx2d = recordingContext()); }
  contains(n) { let p = n; while (p) { if (p === this) return true; p = p.parentNode; } return false; }
}
/** Installs a stand-in `document` (createElement counts what was made) and returns {made, restore}. */
export function installFakeDocument() {
  const made = []; const had = 'document' in globalThis, prev = globalThis.document;
  globalThis.document = { createElement(tag) { const n = new FakeEl(tag); made.push(n); return n; } };
  return { made, restore() { if (had) globalThis.document = prev; else delete globalThis.document; } };
}

// ---- a stand-in theatre and ctx with the shape of docs/EXT-CONTRACT.md. Anything a later memorial must never do throws.
export async function standIn(o = {}) {
  const T = await realTerrain(), bus = new Bus(), scope = new Scope();
  const mk = (id, cls) => { const n = new FakeEl(); n.id = id || ''; n.className = cls || ''; return n; };
  const root = mk('theatre'), left = mk('bt-left', 'leftcol'), clock = mk('', 'clockface'), shellCard = mk('bt-card', 'card'), stage = mk('bt-stage', 'stage'), glCanvas = new FakeEl('canvas'), overlay = new FakeEl('canvas');
  glCanvas.id = 'bt-canvas'; overlay.id = 'bt-overlay'; overlay.className = 'overlay'; left.append(clock, shellCard); stage.append(glCanvas, overlay); root.append(stage, left);
  const log = { said: [], flights: [], panelsOpened: [], toggles: [], panels: [], selects: [], hooks: 0, timeCalls: [] };
  const th = {
    dead: false, root, T, cssW: o.w || 1280, cssH: o.h || 720, dpr: o.dpr || 1, els: { stage, canvas: glCanvas, overlay }, bus, scope, state: { t: 12345, selected: -1, selectedObj: -1, panel: null, playing: false, speed: 1, layers: {} },
    announce(m) { log.said.push(m); }, select(i) { th.state.selected = i; log.selects.push(['unit', i]); bus.emit('select', i); }, selectObject(i) { th.state.selectedObj = i; log.selects.push(['object', i]); bus.emit('select-obj', i); },
    controls: { flyTo(pose, dur) { log.flights.push({ pose: { ...pose }, dur }); } },
    setTime() { log.timeCalls.push('setTime'); throw new Error('the clock must never be moved by a later memorial or a tour stop'); }, setPlaying() { throw new Error('play must not be touched'); }, setSpeed() { throw new Error('speed must not be touched'); },
    cam: { x: 0, y: 100, z: 0, yaw: 0, pitch: -.3, fov: 62 * Math.PI / 180, near: .25, far: 14000 },
  };
  const host = { api: 'webgl2', R: { W: th.cssW, H: th.cssH }, addSceneHook() { log.hooks++; throw new Error('a later memorial or a tour stop must never be put into the 1863 scene'); } };
  const handle = (kind, id) => ({ id, open() { this._open = true; log.panelsOpened.push(id); }, close() { this._open = false; }, isOpen() { return !!this._open; }, refresh() { this.refreshed = (this.refreshed || 0) + 1; }, remove() { this.removed = true; } });
  const ctx = Object.freeze({
    theatre: th, host, state: th.state, env: {}, history: { units: [], meta: {} }, structures: null, urls: Object.freeze({ data: DATA_URL, app: 'https://bt.test/app/' }), choices: () => ({}), tierMark,
    registerLayerToggle(id, title, get, set) { const h = { id, title, get, set: async v => { await set(v); }, refresh() {}, remove() { h.removed = true; } }; log.toggles.push(h); return h; },
    registerPanel(id, title, render) { const h = handle('panel', id); h.title = title; h.render = render; log.panels.push(h); return h; },
  });
  return { T, th, ctx, host, log, bus, scope, root, left, clock, shellCard, stage, glCanvas, overlay };
}
/** A camera standing where `pose` says (pose.fov in degrees, as controls.flyTo takes it); the shape of the renderer's camera for the fields a module reads. */
export const camAt = pose => ({ x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw, pitch: pose.pitch, fov: pose.fov * Math.PI / 180, near: .25, far: 14000 });
export const frameOf = (cam, t = 12345) => ({ tMin: t, dtMs: 16, cam, paused: true, speed: 1 });
/** Markup check for the strings the modules put into the page: tags open and close in order, void elements excepted; returns a list of problems. */
export function markupProblems(html) {
  const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'source']), stack = [], p = [];
  for (const m of String(html).matchAll(/<(\/)?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/)?>/g)) {
    const close = !!m[1], tag = m[2].toLowerCase(), selfClosed = !!m[4] || VOID.has(tag);
    if (close) { const top = stack.pop(); if (top !== tag) { p.push(`</${tag}> closes ${top ? '<' + top + '>' : 'nothing'}`); if (top) stack.push(top); } } else if (!selfClosed) stack.push(tag);
  }
  if (stack.length) p.push(`not closed: ${stack.join(', ')}`); return p;
}
