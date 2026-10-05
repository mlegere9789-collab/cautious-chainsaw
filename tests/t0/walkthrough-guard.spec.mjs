// Walkthrough guard: the Virtual Walkthrough and the Monuments section must never break (owner decision 3 of 2026-10-04, docs/decisions/OWNER-DECISIONS-2026-10-04.md:
// "tests/t0/walkthrough-guard.spec.mjs must pass on baseline/dist and on every train").
// A characterisation suite: it pins what the Walkthrough does TODAY (legacy/dist and baseline/dist, i.e. production) and runs on every tree that could ship (baseline/dist,
// legacy/dist, R0..R1c).  Real system Chrome (headless), real CDP mouse / touch / keyboard, Mapbox tiles only through the Referer-injecting harness (tests/t0/lib.mjs, <= 300
// requests per run, about 140 used), a Netlify-like static server on 127.0.0.1 (the generated-config emulator when the tree has _headers, so R1c is served with the
// Permissions-Policy it ships with).  Google is stubbed except in T0-WG-12 (one run with the real Street View embed).
//
//   node tests/t0/walkthrough-guard.spec.mjs --dist baseline/dist
//   node tests/t0/walkthrough-guard.spec.mjs --dist legacy/dist
//   node tests/t0/walkthrough-guard.spec.mjs --dist release/R1c/dist --filter 'WG-0[1-4]'     subset by id regex
//   node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --stars require   the Monuments toolbar button MUST draw markers (default auto: checked when the tree has them, a SKIP naming
//                                                                            the known regression when it has none; automatic `require` when version.json lists group MON)
//   node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --no-real-google  skip the one run that loads the real Google Street View embed
//   node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --shots           screenshots + the visible text into tmp/walkthrough-guard/shots/<tree>/
//   node tests/t0/walkthrough-guard.mutants.mjs                              red-first proof: 16 deliberately broken copies, the guard must fail on each
//
// What "must be identical" means: every assertion holds on legacy/dist, on the baseline and on every train, EXCEPT the differences that a patch group introduces on purpose.
// Those are named once, in CAP (below), and each test asserts the exact intended state per capability (a train that has the group must show the change, a train that does not
// must not).  A difference that is not in CAP is a regression and fails.  Capabilities come from version.json `groups` (legacy and baseline have none):
//   A     the Walkthrough map shows Mapbox's attribution control (legacy hides it: attributionControl:!1); the animated map can be panned (legacy: its z-index 10 canvas swallows pointer events)
//   C     the phone shell has a "Virtual Walkthrough" Tools tile (legacy: "NPS Auto Tour"; the dead "Monuments" tile, which only toggled the onboarding modal, is removed) and the
//         phone branch of the Walkthrough gets its map (legacy: the map container has no id, so the map is never created)
//   AX    the Walkthrough is a named modal dialog (role=dialog, aria-modal, focus moves in, Tab trapped, Back marked as the close control, focus returns to the opener); search fields have aria-labels
//   CP    copy: the back link reads "Back to the map" (legacy: "Back to Animated Map" desktop, "Animated Map" phone) and the Street View iframe has allow="accelerometer; gyroscope"
//   SHELL the Extra Features / Ask the Historian pills no longer float over the Walkthrough (legacy: they sit on the narration text and, on a narrow window, on the tabs)
//
// Ids:
//   T0-WG-01  static  the tour-stop dataset (16 stops: names, order, coordinates, Street View, video, narration) and the monument dataset (512) in the entry bundle equal legacy's
//   T0-WG-02  static  the Walkthrough code is in the bundle (container id, source/layer names, embed URL, labels) and data/monuments.json (the star data) equals legacy's
//   T0-WG-03  desktop the toolbar button opens it: header, 16 stops in order, stop 1 narration, tabs, Street View iframe (src, allow, title), Google Maps link, NPS video link
//   T0-WG-04  desktop the tour map: one extra map, 16 stop features at the dataset coordinates, 512 monument dots, >= 11 stop markers drawn, attribution (A), layer toggles
//   T0-WG-05  desktop each of the 16 stops: title, label, day, narration, iframe src, links change and the map flies to the stop with its marker under the centre
//   T0-WG-06  desktop Monuments tab: SHOWING 100 OF 512, search (Alabama, Vermont, 20th Maine, CSA, honors-only text, no match), Union/Confederate/Other, group select, cap message, cards,
//                     View on map link, card click flies
//   T0-WG-07  desktop Back returns: one map, same canvases and WebGL contexts, the animated map still answers; three open/close cycles leak nothing
//   T0-WG-17  desktop the window is narrowed below 860 px and widened again while the Walkthrough is open: no error, the stop and the text stay, Back leaves nothing behind, it opens again
//                     with a live map; the map itself dies on every tree (SKIP naming the defect; --strict-resize makes it a failure)
//   T0-WG-08  desktop keyboard: Tab order, Enter on a stop, Esc closes (AX: focus in the dialog, Tab trapped, focus returns to the opener)
//   T0-WG-16  desktop the visible text of the Walkthrough (stop 1, stop 16, Monuments default / search / chip + group) equals legacy's word for word (hash-pinned; only the back link may differ)
//   T0-WG-09  phone 375x812: Tools tile (C), the phone branch: stops, map, Monuments tab, Back; before group C the phone shell offers no Walkthrough (SKIP, intended)
//   T0-WG-10  phone landscape 812x375: the same, shorter
//   T0-WG-11  layout at 320, 375, 768 and 1440 wide: no horizontal scroll, no text outside the window, controls reachable (SHELL: and not covered)
//   T0-WG-12  one run with real Mapbox tiles and the REAL Google Street View embed: first-party console clean, third-party Google noise listed (R1c with its headers: none)
//   T0-WG-13  the Monuments toolbar button shows monument markers on the animated map; a second click hides them (legacy: exactly the 8 stars; a restored layer: any number >= 1)
//   T0-WG-14  the markers follow the map: after a pan and a zoom every marker that stays in view is where the map moved it (legacy's overlay is screen-fixed by design: SKIP there)
//   T0-WG-15  markers and Walkthrough do not disturb each other (nothing drawn over the Walkthrough, a resize while it is open displaces nothing, Back shows the same markers)
//   T0-WG-X   every browser test of this run: 0 uncaught exceptions, 0 first-party console.error (third-party Google noise excepted)
// Owner decision 1 of 2026-10-04 (production's removal of the monument stars was NOT intended; restore them as a map-tracking layer, group MON): T0-WG-13..15 are written for ANY
// implementation (DOM overlay, Mapbox markers, SVG stars or a map layer whose id says monument, star or gtmon) and decide with coordinate-agnostic checks; the 8-star check applies to legacy's own mechanism.
process.env.T0_AGENT ??= 'walkthrough-guard';
process.env.T0_PORT_BASE ??= '8920';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as acorn from 'acorn';
const L = await import('./lib.mjs');
const { REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, tileBudget, Skip, touchTap, mouseDrag, emulateViewport } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const abs = (p) => path.resolve(REPO, p);
const DIST = abs(opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const STARS_ARG = String(opt('stars', 'auto'));             // auto | require | off
const REAL_GOOGLE = !opt('no-real-google', false);
const SERVER_MODE = String(opt('server', 'auto'));          // auto | static | emulate
const STRICT_RESIZE = !!opt('strict-resize', false);          // T0-WG-17: a Walkthrough map that dies when the window crosses 860 px is a failure (default: a named SKIP, it is a defect of every tree)
const SHOTS = !!opt('shots', false);                        // --shots: screenshots of the key states into tmp/walkthrough-guard/shots/<tree>/
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }
const IS_LEGACY = DIST === abs('legacy/dist');
const IS_BASELINE = DIST === abs('baseline/dist');
const VERSION = fs.existsSync(path.join(DIST, 'version.json')) ? JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')) : { groups: [], train: IS_LEGACY ? 'legacy' : IS_BASELINE ? 'baseline' : 'unknown', release: null };
const GROUPS = VERSION.groups || [];
const STARS = STARS_ARG === 'auto' && GROUPS.includes('MON') ? 'require' : STARS_ARG;      // a tree that ships group MON must draw the markers
const LABEL = String(opt('label', IS_LEGACY ? 'legacy' : IS_BASELINE ? 'baseline' : VERSION.train || path.basename(path.dirname(DIST))));
/** capabilities = the intended differences between trees (see the header) */
const CAP = { A: GROUPS.includes('A'), C: GROUPS.includes('C'), AX: GROUPS.includes('AX'), CP: GROUPS.includes('CP'), SHELL: GROUPS.includes('SHELL') };
const HAS_HEADERS = fs.existsSync(path.join(DIST, '_headers')) && fs.existsSync(path.join(DIST, '_redirects')) && fs.existsSync(path.join(DIST, 'netlify.toml'));
const USE_EMULATOR = SERVER_MODE === 'emulate' || (SERVER_MODE === 'auto' && HAS_HEADERS);
const resultsDir = path.join(REPO, 'tmp', process.env.T0_AGENT);                  // nothing is ever written into release/, baseline/ or legacy/

// ------------------------------------------------------------------ the pinned facts (computed from legacy/dist/assets/index-Cg8FAMXN.js on 2026-10-04)
const STOP_NAMES = ['McPherson Ridge', 'Eternal Light Peace Memorial', 'Oak Ridge', 'North Carolina Memorial', 'Virginia Memorial', 'Pitzer Woods', 'Warfield Ridge', 'Little Round Top',
  'The Wheatfield', 'The Peach Orchard', 'Plum Run', 'Pennsylvania Memorial', "Spangler's Spring", 'East Cemetery Hill', 'High Water Mark', "Soldiers' National Cemetery"];
const PIN = {
  tourSha256: '31149ceaa519506bfc20ee4f4d4fdd77e1760d393d4d0aee4023abfe2f35a31c',      // canonical JSON (sorted keys) of the 16 stops
  monsSha256: '0204397d5ccc47ffce1e9f7231bc483b97bedbce4a8c7082c8ca4b670eac59ba',      // canonical JSON of the 512 monuments
  sides: { Union: 457, Confederate: 40, Other: 15 }, groups: 24,
  // data/monuments.json has 9 entries; at the default view of a 1440x900 window the first 8 are on screen (Alabama, 3 km south of the centre, is below the bottom edge)
  starNames: ['Pennsylvania State Memorial', 'New York State Monument', 'Indiana State Monument', "Soldiers' National Monument", 'Virginia Monument', 'North Carolina State Monument', 'Louisiana State Monument', 'Georgia State Monument'],
  starOffscreen: 'Alabama State Monument', starFile: 9,
};
/** sha256 (first 16) of the normalised visible text of the Walkthrough root on legacy/dist at 1440x900 (back link replaced by <BACK>); filled from the legacy run of 2026-10-04 */
const TEXT_PIN = { 'tour-1': 'b4cedf72f7f21239', 'tour-16': 'a8c0a3760e75530a', 'monuments-default': '7726aebca1fb2501', 'monuments-vermont': '01adab2422874a0f', 'monuments-union-maine': 'ee44f53403583911' };
/** Google noise that is not ours: logged by the Street View embed's own script (maps.googleapis.com) on trees whose page does not delegate the sensors to the frame */
const GOOGLE_HOST = /(^|\.)googleapis\.com$|(^|\.)google\.com$|(^|\.)gstatic\.com$|(^|\.)googleusercontent\.com$/;
const GOOGLE_NOISE = [
  { re: /Permissions policy violation: (accelerometer|gyroscope) is not allowed in this document/i, host: GOOGLE_HOST },       // Google's own script, trees whose page does not delegate the sensors
  { re: /Failed to load resource: the server responded with a status of (429|5\d\d)/i, host: GOOGLE_HOST },                   // Google's servers answering 429/5xx to the embed (transient; one such error appeared once during development)
];

// ------------------------------------------------------------------ datasets from a bundle (acorn finds the literal; nothing is regex-parsed)
const LEGACY_ENTRY = abs('legacy/dist/assets/index-Cg8FAMXN.js');
function entryOf(dist, version) {
  if (version && version.entry) return path.join(dist, 'assets', version.entry);
  const f = fs.readdirSync(path.join(dist, 'assets')).filter((x) => /^index-.*\.js$/.test(x)).sort((a, b) => fs.statSync(path.join(dist, 'assets', b)).size - fs.statSync(path.join(dist, 'assets', a)).size)[0];
  return path.join(dist, 'assets', f);
}
function literal(src, marker) {
  const at = src.indexOf(marker); if (at < 0) return null;
  const start = at + marker.indexOf('[');
  let n = acorn.parseExpressionAt(src, start, { ecmaVersion: 'latest' });
  if (n.type === 'SequenceExpression') n = n.expressions[0];            // d2=[...],_A=[...],mO=... is one comma expression
  return new Function(`return (${src.slice(n.start, n.end)})`)();
}
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function datasets(entryFile) {
  const src = fs.readFileSync(entryFile, 'utf8');
  return { src, tour: literal(src, 'd2=[{id:1,name:"McPherson Ridge"'), mons: literal(src, '_A=[{no:1,name:"Alabama State Monument"'), embedKey: (/AIzaSy[\w-]{30,40}/.exec(src) || [''])[0] };
}
const ENTRY = entryOf(DIST, VERSION);
const THIS = datasets(ENTRY);
const LEG = datasets(LEGACY_ENTRY);
const TOUR = LEG.tour;                         // the expectations always come from legacy's dataset (the thing production serves)
const MONS = LEG.mons;
const stripHtml = (h) => h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 85000, (a[1] - b[1]) * 111000);
/** the Walkthrough's own monument filter: side, group, then a case-insensitive substring of name or honors */
const monMatch = (q = '', side = 'all', group = 'all') => MONS.filter((m) => (side === 'all' || m.side === side) && (group === 'all' || m.group === group)
  && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.honors.toLowerCase().includes(q.toLowerCase())));
const svSrcRest = (s) => `${s.sv.pano ? `pano=${s.sv.pano}` : `location=${s.sv.lat},${s.sv.lng}`}&heading=${s.sv.heading}&pitch=0&fov=90`;
const svMapsHref = (s) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.sv.lat},${s.sv.lng}&heading=${s.sv.heading}`;

// ------------------------------------------------------------------ the page-side helper library (installed before the app runs)
function installWg(cfg) {
  if (window.top !== window) return;
  const NAMES = cfg.names;
  const gl = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = orig.call(this, type, ...rest);
    try { if (ctx && /webgl/i.test(String(type)) && !gl.some((g) => g.canvas === this)) gl.push({ canvas: this, ctx }); } catch { /* ignore */ }
    return ctx;
  };
  const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const describe = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList && el.classList.contains('mapboxgl-canvas') ? '.mapboxgl-canvas' : ''}[${norm(el.getAttribute('aria-label') || el.title || el.textContent).slice(0, 36)}]` : 'null');
  const fiberMaps = () => {
    const root = document.getElementById('root'); if (!root) return [];
    const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$')); if (!key) return [];
    // root[key] is the HostRoot fiber of the FIRST render; React double-buffers, so it may be the stale alternate: start from the FiberRootNode's current fiber
    const host = root[key]; const cur = host && host.stateNode && host.stateNode.current ? host.stateNode.current : host;
    const stack = [cur]; let n = 0; const out = [];
    while (stack.length && n++ < 400000) {
      const f = stack.pop(); if (!f) continue;
      for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) {
        const v = h.memoizedState;
        if (v && typeof v === 'object' && v.current && typeof v.current.getCenter === 'function' && typeof v.current.getZoom === 'function' && !out.includes(v.current)) out.push(v.current);
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return out;
  };
  const isWt = (m) => { try { return m.getContainer().id === 'gtbg-wt-map' || !!(m.style && m.getSource('wt-stops')); } catch { return false; } };
  /** the Walkthrough root: the nearest position:fixed ancestor of the back button that also holds the Tour Stops and Monuments tabs (the animated map's own root is fixed too, but it holds neither) */
  const findRoot = () => {
    for (const b of document.querySelectorAll('button')) {
      if (!/Animated Map|Back to the map/.test(b.textContent)) continue;
      for (let e = b.parentElement; e; e = e.parentElement) {
        if (getComputedStyle(e).position !== 'fixed') continue;
        const bs = [...e.querySelectorAll('button')].map((x) => norm(x.textContent).toLowerCase());
        if (bs.includes('tour stops') && bs.includes('monuments')) return { root: e, back: b };
        break;
      }
    }
    return null;
  };
  const chips = (root) => {
    const found = [];
    for (const b of (root || document).querySelectorAll('button')) {
      const m = /^\s*(\d{1,2})\s+(.+?)\s*$/.exec(b.textContent || '');
      if (m && NAMES[+m[1] - 1] === m[2]) found.push({ i: +m[1], el: b });
    }
    return found;
  };
  const rootOf = () => { const f = findRoot(); return f ? f.root : null; };
  window.__wg = {
    describe, norm,
    glStats() { const alive = gl.filter((g) => { try { return !g.ctx.isContextLost(); } catch { return false; } }); return { created: gl.length, alive: alive.length, aliveConnected: alive.filter((g) => g.canvas.isConnected).length, canvases: document.querySelectorAll('canvas').length, mapboxCanvases: document.querySelectorAll('canvas.mapboxgl-canvas').length, mapboxMaps: document.querySelectorAll('.mapboxgl-map').length }; },
    dom() {
      const f = findRoot(); if (!f) return { open: false };
      const { root, back } = f; const cs = chips(root);
      const phone = !/A VIRTUAL EXPERIENCE/i.test(root.innerText);
      const buttons = [...root.querySelectorAll('button')];
      const tab = (name) => buttons.find((b) => norm(b.textContent).toLowerCase() === name);
      const gold = (el) => getComputedStyle(el).backgroundColor === 'rgb(176, 131, 56)';
      const h2 = [...root.querySelectorAll('h2')].find((h) => NAMES.includes(norm(h.textContent)));
      const content = h2 ? h2.parentElement : null;
      const spans = content ? [...content.firstElementChild.querySelectorAll('span')].map((s) => norm(s.textContent)) : [];
      const iframe = content ? content.querySelector('iframe') : null;
      const links = content ? [...content.querySelectorAll('a')].map((a) => ({ text: norm(a.textContent), href: a.href, target: a.target, rel: a.rel })) : [];
      const input = root.querySelector('input[placeholder]');
      const checks = [...root.querySelectorAll('input[type="checkbox"]')];
      const sel = root.querySelector('select');
      const cards = [...root.querySelectorAll('h3')];
      const statusEl = [...root.querySelectorAll('div')].find((d) => /^(showing\s+\d+\s+of\s+\d+\s+monuments|\d+\s+monuments)$/i.test(norm(d.innerText)) && d.children.length <= 3);
      const capEl = [...root.querySelectorAll('div')].find((d) => /Refine your search/.test(d.textContent) && d.children.length === 0);
      const sideBtn = (n) => buttons.find((b) => norm(b.textContent) === n);
      const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
      return {
        open: true, phone, tourTab: cs.length > 0, chips: cs.length, chipTexts: cs.map((c) => norm(c.el.textContent)), activeChips: cs.filter((c) => gold(c.el)).map((c) => c.i),
        root: { role: root.getAttribute('role'), modal: root.getAttribute('aria-modal'), label: root.getAttribute('aria-label'), tabindex: root.getAttribute('tabindex'), rect: rr(root), focusInside: root.contains(document.activeElement) },
        back: { text: norm(back.textContent), closeAttr: back.hasAttribute('data-gt-close'), rect: rr(back) },
        header: norm((back.parentElement || root).innerText), tabs: { tour: !!tab('tour stops'), mons: !!tab('monuments'), tourRect: rr(tab('tour stops')), monsRect: rr(tab('monuments')) },
        title: h2 ? norm(h2.textContent) : null, spans, paras: content ? [...content.querySelectorAll(':scope > p')].map((p) => norm(p.innerText)) : [],
        iframe: iframe ? { src: iframe.src, allow: iframe.getAttribute('allow'), title: iframe.title, fs: iframe.hasAttribute('allowfullscreen') || iframe.allowFullscreen, rect: rr(iframe) } : null, links,
        mapBox: rr(root.querySelector('#gtbg-wt-map')), checks: checks.map((c) => ({ checked: c.checked, label: norm(c.parentElement.textContent) })),
        monsView: input ? { placeholder: input.placeholder, aria: input.getAttribute('aria-label'), value: input.value, select: sel ? [...sel.options].map((o) => o.value) : null, selectValue: sel ? sel.value : null,
          status: statusEl ? norm(statusEl.innerText) : null, cap: capEl ? norm(capEl.textContent) : null, cards: cards.map((h) => norm(h.textContent)),
          gpsLinks: [...root.querySelectorAll('a[href*="google.com/maps/search"]')].map((a) => ({ href: a.href, target: a.target, rel: a.rel, text: norm(a.textContent) })),
          sides: ['all', 'Union', 'Confederate', 'Other'].map((n) => ({ n, present: !!sideBtn(n), active: !!sideBtn(n) && gold(sideBtn(n)) })) } : null,
      };
    },
    rootText() { const r = rootOf(); return r ? norm(r.innerText) : null; },
    chipRects() { return chips(rootOf()).map((c) => { const r = c.el.getBoundingClientRect(); return { i: c.i, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }); },
    mapInfo(which) {
      const maps = fiberMaps(); const m = which === 'wt' ? maps.find(isWt) : maps.find((x) => !isWt(x)); if (!m) return { maps: maps.length, found: false };
      const c = m.getCenter(); const cont = m.getContainer(); const r = cont.getBoundingClientRect();
      let layers = [], src = null, mons = null, loaded = false, rendered = null;
      try { loaded = m.loaded(); layers = (m.getStyle().layers || []).map((l) => l.id).filter((i) => /^wt-/.test(i)); } catch { /* style not ready */ }
      try { const s = m.getSource('wt-stops'); if (s) src = ((s.serialize && s.serialize().data) || s._data).features.map((f) => ({ id: f.properties.id, name: f.properties.name, c: f.geometry.coordinates })); } catch { /* none */ }
      try { const s = m.getSource('wt-mons'); if (s) mons = ((s.serialize && s.serialize().data) || s._data).features.length; } catch { /* none */ }
      try { if (layers.includes('wt-stops-circle')) rendered = m.queryRenderedFeatures({ layers: ['wt-stops-circle'] }).map((f) => f.properties.id).sort((a, b) => a - b); } catch { /* none */ }
      const vis = (id) => { try { return m.getLayer(id) ? (m.getLayoutProperty(id, 'visibility') || 'visible') : null; } catch { return null; } };
      return { maps: maps.length, found: true, zoom: m.getZoom(), center: [c.lng, c.lat], bearing: m.getBearing(), pitch: m.getPitch(), moving: m.isMoving() || m.isEasing(), loaded, layers, src, mons, rendered,
        cont: { id: cont.id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, attrib: !!cont.querySelector('.mapboxgl-ctrl-attrib'),
        vis: { circle: vis('wt-stops-circle'), num: vis('wt-stops-num'), dots: vis('wt-mons-dots') } };
    },
    renderedAt(lng, lat, rad = 14) {
      const m = fiberMaps().find(isWt); if (!m) return null; const p = m.project([lng, lat]);
      try { return m.queryRenderedFeatures([[p.x - rad, p.y - rad], [p.x + rad, p.y + rad]], { layers: ['wt-stops-circle'] }).map((f) => f.properties.id); } catch { return null; }
    },
    mainCam() { const m = fiberMaps().find((x) => !isWt(x)); if (!m) return null; const c = m.getCenter(); const b = m.getCanvas().getBoundingClientRect(); return { center: [c.lng, c.lat], zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch(), canvas: { x: b.x, y: b.y, w: b.width, h: b.height } }; },
    mainJump(cam) { const m = fiberMaps().find((x) => !isWt(x)); if (!m) return false; m.jumpTo(cam); return true; },
    mainProject(pts) { const m = fiberMaps().find((x) => !isWt(x)); if (!m) return null; const b = m.getCanvas().getBoundingClientRect(); return pts.map(([lng, lat]) => { const q = m.project([lng, lat]); return { x: q.x + b.x, y: q.y + b.y }; }); },
    mainLayers() { const m = fiberMaps().find((x) => !isWt(x)); try { return m ? m.getStyle().layers.map((l) => l.id).filter((i) => /monument|star|gtmon/i.test(i)) : null; } catch { return null; } },
    stars() {
      // what a visitor sees as monument markers on the ANIMATED map, whatever draws them: legacy's DOM overlay (#gtbg-monuments-overlay), Mapbox markers, inline SVG stars,
      // or features of a map layer whose id says monument, star or gtmon (a restored map-tracking layer: group MON names its layers gtmon-*)
      const ov = document.getElementById('gtbg-monuments-overlay');
      const pos = (el) => { const r = el.getBoundingClientRect(); return { title: el.title || el.getAttribute('aria-label') || '', x: Math.round((r.x + r.width / 2) * 10) / 10, y: Math.round((r.y + r.height / 2) * 10) / 10 }; };
      const ovKids = ov && visible(ov) ? [...ov.children].filter(visible).map(pos) : [];
      const markers = [...document.querySelectorAll('.mapboxgl-marker')].filter(visible).map(pos);
      const svg = [...document.querySelectorAll('svg polygon[points^="12,1.5"]')].map((q) => q.ownerSVGElement).filter((x) => x && visible(x)).map((x) => pos(x.parentElement && x.parentElement !== document.body ? x.parentElement : x));
      const mm = fiberMaps().find((x) => !isWt(x)); const cb = mm ? mm.getCanvas().getBoundingClientRect() : null;
      let featPts = []; let layerIds = [];
      try {
        if (mm) {
          layerIds = mm.getStyle().layers.map((l) => l.id).filter((i) => /monument|star|gtmon/i.test(i));
          const q = layerIds.length ? mm.queryRenderedFeatures({ layers: layerIds }) : [];
          featPts = q.map((f) => { const g = f.geometry; if (!g || g.type !== 'Point') return null; const pt = mm.project(g.coordinates); return { title: String((f.properties && (f.properties.name || f.properties.title)) || ''), x: Math.round((pt.x + cb.x) * 10) / 10, y: Math.round((pt.y + cb.y) * 10) / 10 }; }).filter(Boolean);
        }
      } catch { /* no style yet */ }
      const kind = ovKids.length ? 'dom-overlay' : markers.length ? 'mapbox-markers' : svg.length ? 'svg-stars' : featPts.length ? 'map-layer' : 'none';
      const marks = kind === 'dom-overlay' ? ovKids : kind === 'mapbox-markers' ? markers : kind === 'svg-stars' ? svg : featPts;
      const onScreen = marks.filter((k) => cb && k.x >= cb.x && k.x <= cb.x + cb.width && k.y >= cb.y && k.y <= cb.y + cb.height);
      return { overlay: !!ov, kind, layers: layerIds, marks, onScreen, count: marks.length };
    },
    coveredByRoot(pts) {
      // for every marker position that is on screen and inside the Walkthrough: is the Walkthrough (not the marker's own element, not a layer above) the topmost thing there?  A point on the very edge of the window
      // (x = innerWidth or y = innerHeight, where elementFromPoint answers null) is off screen, not a defect
      const r = rootOf(); if (!r) return null; const rr = r.getBoundingClientRect();
      return pts.filter((q) => q.x >= Math.max(rr.left, 0) && q.x < Math.min(rr.right, innerWidth) && q.y >= Math.max(rr.top, 0) && q.y < Math.min(rr.bottom, innerHeight)).map((q) => { const el = document.elementFromPoint(q.x, q.y); return !el || r.contains(el); });
    },
    tabOrder(n) { return { active: describe(document.activeElement), inside: (() => { const r = rootOf(); return !!r && r.contains(document.activeElement); })() }; },
    focusBack() { const f = findRoot(); if (f) f.back.focus(); return !!f; },
    layout() {
      const f = findRoot(); if (!f) return null; const root = f.root; const cs = chips(root);
      const vw = innerWidth, vh = innerHeight; const doc = document.scrollingElement;
      const outside = [], truncated = [];
      for (const el of root.querySelectorAll('*')) {
        if (!visible(el)) continue;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3 && norm(n.textContent).length > 1).length;
        const r = el.getBoundingClientRect();
        if (own && (r.right > vw + 1 || r.left < -1)) outside.push(`${describe(el)} x ${Math.round(r.left)}..${Math.round(r.right)}`);
        const cs2 = getComputedStyle(el);
        if (own && (el.tagName === 'BUTTON' || /^H[1-6]$/.test(el.tagName) || el.tagName === 'A') && el.scrollWidth > el.clientWidth + 1 && cs2.overflowX !== 'visible') truncated.push(`${describe(el)} ${el.scrollWidth}>${el.clientWidth}`);
      }
      const rect = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
      const back = f.back; const tabBtn = (n) => [...root.querySelectorAll('button')].find((b) => norm(b.textContent).toLowerCase() === n);
      // an element that is currently scrolled out of view (outside the window or outside a scrolling ancestor) is not "covered": hit = null
      const inView = (el) => {
        const r = el.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; if (cx < 0 || cx > vw || cy < 0 || cy > vh) return false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const c3 = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(c3.overflowY + c3.overflowX)) { const q = a.getBoundingClientRect(); if (cx < q.left || cx > q.right || cy < q.top || cy > q.bottom) return false; } }
        return true;
      };
      const hit = (el) => { if (!el || !inView(el)) return null; const r = el.getBoundingClientRect(); if (r.width === 0) return false; const x = Math.min(Math.max(r.x + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.y + r.height / 2, 1), vh - 1); const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t) || t.contains(el)); };
      return { vw, vh, docScrollW: doc.scrollWidth, docScrollH: doc.scrollHeight, rootScrollW: root.scrollWidth, rootClientW: root.clientWidth, rootRect: rect(root), outside: outside.slice(0, 8), truncated: truncated.slice(0, 8),
        back: rect(back), backHit: hit(back), tabsHit: { tour: hit(tabBtn('tour stops')), mons: hit(tabBtn('monuments')) }, chips: cs.map((c) => ({ i: c.i, ...rect(c.el), hit: hit(c.el) })),
        iframeW: (() => { const f = root.querySelector('iframe'); return f ? Math.round(f.getBoundingClientRect().width) : null; })() };
    },
    pillsOverRoot() {
      const root = rootOf(); if (!root) return null; const over = [];
      for (const el of document.querySelectorAll('body *')) {
        if (root.contains(el) || el.contains(root)) continue;
        const cs2 = getComputedStyle(el); if (!['fixed', 'absolute'].includes(cs2.position) || !visible(el)) continue;
        const r = el.getBoundingClientRect(); const rr = root.getBoundingClientRect();
        if (r.width < 8 || r.height < 8 || r.right < rr.left || r.left > rr.right || r.bottom < rr.top || r.top > rr.bottom) continue;
        if (r.width >= rr.width - 2 && r.height >= rr.height - 2) continue;                       // full-window layers (the app itself, the map canvas)
        const probe = document.elementFromPoint(Math.min(Math.max(r.x + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.y + r.height / 2, 0), innerHeight - 1));
        if (probe && !root.contains(probe) && (probe === el || el.contains(probe))) over.push(`${describe(el)} z=${cs2.zIndex} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return over.slice(0, 8);
    },
  };
}
const INSTALL = `(${installWg.toString()})(${JSON.stringify({ names: STOP_NAMES })})`;

// ------------------------------------------------------------------ servers, sessions
let srv = null;
const sessions = [];
let seq = 0;
async function startServer() {
  if (srv) return srv;
  if (USE_EMULATOR) {
    const { createEmulator } = await import(pathToFileURL(path.join(REPO, 'tools/t0/config/emulate.mjs')).href);
    srv = await createEmulator({ dist: DIST, port: PORT_BASE });
  } else srv = await createStaticServer({ root: DIST, port: PORT_BASE });
  return srv;
}
const VP = {
  desktop: { width: 1440, height: 900, dpr: 1, mobile: false },
  phone: { width: 375, height: 812, dpr: 3, mobile: true },
  landscape: { width: 812, height: 375, dpr: 3, mobile: true },
  w320: { width: 320, height: 568, dpr: 2, mobile: true },
  w768: { width: 768, height: 1024, dpr: 2, mobile: true },
};
const GOOGLE_EMBED = /^https:\/\/(www\.)?google\.com\/maps\/embed\//;
const GOOGLE_STUB = '<!doctype html><meta charset="utf-8"><title>Street View stub</title><body style="margin:0;background:#0c0f15;color:#888;font:12px sans-serif">Street View frame stub (the real embed is loaded by T0-WG-12 only)</body>';
async function open({ profile, viewport, tiles = 'block', realGoogle = false }) {
  for (let attempt = 1; ; attempt++) {
    const n = ++seq;
    const live = new Set(sessions.map((x) => x.chrome.port));
    let port = PORT_BASE + 1 + (n % 9); for (let k = 0; live.has(port) && k < 12; k++) port = PORT_BASE + 1 + ((port - PORT_BASE) % 9);
    try {
      const s = await openSession({ profile: `${profile}-${n}`, cdpPort: port, viewport, tiles, initScripts: [INSTALL] });
      sessions.push(s);
      s.googleRequests = [];
      s.googleHandler = (route) => { s.googleRequests.push(route.request().url().replace(/key=[^&]+/, 'key=<k>')); route.fulfill({ status: 200, contentType: 'text/html', body: GOOGLE_STUB }); };
      if (!realGoogle) await s.page.route(GOOGLE_EMBED, s.googleHandler);
      return s;
    } catch (e) { if (attempt >= 3) throw e; await sleep(2000); }
  }
}
const closeSession = async (s) => { try { await s.close(); } catch { /* gone */ } const i = sessions.indexOf(s); if (i >= 0) sessions.splice(i, 1); };

// ------------------------------------------------------------------ app flow helpers
/** legacy flow: [3.5 s intro with "Skip intro"] -> "Choose Your Experience" (R0..R1a, baseline, legacy); R1b+ auto-detects (a ?layout= override pins it) */
async function enterApp(p, layout, timeout = 70000) {
  const t0 = Date.now(); let readySince = 0;
  for (;;) {
    if (Date.now() - t0 > timeout) throw new Error(`the app did not become usable within ${timeout} ms (layout ${layout})`);
    if ((await p.getByText('Choose Your Experience').count()) > 0) {
      await p.getByText(layout === 'phone' || layout === 'mobile' ? 'Select Mobile' : 'Select Desktop').first().click();
      await p.getByText('Choose Your Experience').first().waitFor({ state: 'detached', timeout: 10000 });
      readySince = 0; continue;
    }
    const skip = p.locator('button', { hasText: /Skip intro/ });
    if ((await skip.count()) > 0) await skip.first().click().catch(() => {});
    const ready = await p.evaluate(() => { const t = document.body.innerText; return !document.getElementById('boot-splash') && !!document.querySelector('#root canvas') && !/Skip intro|Fast-forwarding|Choose Your Experience/.test(t); });
    if (ready) { readySince ||= Date.now(); if (Date.now() - readySince > 1800) return; } else readySince = 0;
    await sleep(200);
  }
}
async function boot(S, layout) {
  const q = CAP.C ? `?layout=${layout === 'phone' ? 'mobile' : layout}` : '';
  await S.page.goto(`${srv.url}/${q}`, { waitUntil: 'domcontentloaded' });
  await enterApp(S.page, layout);
  await sleep(600);
}
const dom = (p) => p.evaluate(() => window.__wg.dom());
const info = (p, which = 'wt') => p.evaluate((w) => window.__wg.mapInfo(w), which);
const waitOpen = (p, label = 'the Walkthrough to open') => waitFor(async () => { const d = await dom(p); return d.open && d.title ? d : null; }, { timeout: 15000, label });
const waitClosed = (p) => waitFor(async () => !(await dom(p)).open, { timeout: 10000, label: 'the Walkthrough to close' });
const waitWtMap = (p, timeout = 40000) => waitFor(async () => { const m = await info(p); return m.found && m.loaded && m.layers.length === 3 && m.src && m.src.length === 16 ? m : null; }, { timeout, label: 'the Walkthrough map (style loaded, stop and monument layers added)' });
/** elementFromPoint at the centre of the first visible button whose text matches: is the element (or a child) on top? */
const hitByText = (p, re) => p.evaluate((src) => {
  const rx = new RegExp(src); const b = [...document.querySelectorAll('button')].find((x) => rx.test(x.textContent) && x.offsetParent); if (!b) return { found: false };
  const r = b.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const top = document.elementFromPoint(x, y);
  return { found: true, hit: !!top && (top === b || b.contains(top)), inViewport: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, top: top ? `${top.tagName}${top.id ? '#' + top.id : ''}` : null };
}, re.source);
/** the Walkthrough's own full-screen root (inline z-index 500 in legacy and in every tree) */
const WT = (p) => p.locator('div[style*="z-index: 500"]').filter({ has: p.locator('button', { hasText: /Animated Map|Back to the map/ }) }).first();
async function realTap(S, loc) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox(); assert(b, 'element has no box to tap');
  await touchTap(S.page, b.x + b.width / 2, b.y + b.height / 2);
}
/**
 * Open the Walkthrough the way a visitor does: the desktop toolbar button, or on the phone shell Tools -> the "Virtual Walkthrough" tile (group C).
 * Returns { via, ... }.  `needMap` switches Mapbox on only for the moment the Walkthrough map loads, then back to blocked tiles.
 */
async function openWalkthrough(S, layout, { needMap = false } = {}) {
  const p = S.page;
  if (needMap) S.setTiles('inject');
  let via;
  if (layout === 'desktop') {
    const btn = p.locator('button', { hasText: 'Virtual Walkthrough' }).first();
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    const hit = await hitByText(p, /Virtual Walkthrough/);
    via = { how: 'toolbar button', hit: hit.hit, coveredBy: hit.hit ? null : hit.top };
    await btn.click({ timeout: 8000 });
  } else {
    const tools = p.locator('button', { hasText: /Tools/ }).first();
    await tools.waitFor({ state: 'visible', timeout: 15000 });
    await realTap(S, tools); await sleep(700);
    const all = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    const from = all.indexOf('✕'); const to = all.indexOf('Disposition');                      // the Tools sheet: from its close button to the legend that follows it
    const tiles = from >= 0 ? all.slice(from + 1, to > from ? to : undefined) : all;
    const tile = p.locator('button', { hasText: 'Virtual Walkthrough' }).first();
    if ((await tile.count()) === 0) return { via: 'none', tools: tiles };
    via = { how: 'Tools tile', tools: tiles };
    await realTap(S, tile);
  }
  const d = await waitOpen(p);
  if (needMap) { try { await waitWtMap(p); } finally { S.setTiles('block'); } }
  return { via, d };
}
async function backToMap(S, d) {
  const p = S.page;
  await p.locator('button', { hasText: /Animated Map|Back to the map/ }).filter({ visible: true }).first().click({ timeout: 8000 });
  await waitClosed(p);
}
const label = (phone) => (CAP.CP ? '← Back to the map' : phone ? '← Animated Map' : '← Back to Animated Map');
const flatten = (s) => s.replace(/\s+/g, ' ').trim();
const errText = (e) => `${e.kind}: ${maskTok(e.text)}${e.url ? ` @${maskTok(e.url).slice(0, 90)}` : ''}`;
const errsSince = (S, m) => S.collector.firstParty.slice(m).filter((e) => !isGoogleNoise(e));
function isGoogleNoise(e) { const h = (() => { try { return new URL(e.url || '').hostname; } catch { return ''; } })(); return GOOGLE_NOISE.some((n) => n.re.test(e.text) && n.host.test(h)); }
const noiseSince = (S, m) => S.collector.firstParty.slice(m).filter(isGoogleNoise);
const maskTok = (s) => String(s).replace(/(access_token=)[^&\s"']+/g, '$1<token>').replace(/key=[A-Za-z0-9_-]+/g, 'key=<k>');
function usedNow() { return tileBudget.used; }
const shot = async (S, name) => { if (!SHOTS) return; const dir = path.join(REPO, 'tmp', process.env.T0_AGENT, 'shots', LABEL); fs.mkdirSync(dir, { recursive: true }); await S.page.screenshot({ path: path.join(dir, `${name}.png`) }).catch(() => {}); };

// ------------------------------------------------------------------ shared desktop session (the core tests walk one visitor through the page)
const F = {};
async function desktop() {
  if (F.D) { const d = await dom(F.D.page); if (d.open) await backToMap(F.D); return F.D; }
  // real tiles only while the animated map loads (so the map instance exists: the app publishes it after its style is loaded), then none; a test that needs more switches them itself
  const S = await open({ profile: 'desktop', viewport: VP.desktop, tiles: 'inject' });
  F.D = S; const u0 = usedNow();
  await boot(S, 'desktop');
  await waitFor(async () => { const m = await info(S.page, 'main'); return m.found && m.loaded ? m : null; }, { timeout: 45000, label: 'the animated map (style loaded)' }).catch(() => { F.mainNotLoaded = true; });
  S.setTiles('block'); F.bootTiles = usedNow() - u0;
  return S;
}

const suite = createSuite('walkthrough-guard');
{ const add = suite.test.bind(suite);
  suite.test = (id, title, fn) => add(id, title, async (t) => { const u0 = usedNow(); t.note('tree', LABEL); try { return await fn(t); } finally { if (usedNow() > u0) t.note('mapbox requests', usedNow() - u0); } }); }

// ================================================================== static
suite.test('T0-WG-01', 'static: the 16 tour stops (names, order, coordinates, Street View, video, narration) and the 512 monuments in this tree\'s entry bundle equal legacy\'s', async (t) => {
  assert(LEG.tour && LEG.mons, 'could not read the datasets from legacy/dist (the pins below were computed there)');
  assertEq([LEG.tour.length, LEG.mons.length], [16, 512], 'legacy dataset sizes');
  assertEq(sha(canon(LEG.tour)), PIN.tourSha256, 'the pinned hash of legacy\'s tour stops (the pin or legacy/dist changed)');
  assertEq(sha(canon(LEG.mons)), PIN.monsSha256, 'the pinned hash of legacy\'s monuments');
  assert(THIS.tour, `no tour-stop dataset found in ${path.basename(ENTRY)} (the literal d2=[{id:1,name:"McPherson Ridge"... is gone: a patch changed the dataset or renamed it)`);
  assert(THIS.mons, `no monument dataset found in ${path.basename(ENTRY)}`);
  assertEq(THIS.tour.length, 16, 'tour stop count');
  assertEq(THIS.tour.map((s) => s.id), Array.from({ length: 16 }, (_, i) => i + 1), 'stop ids 1..16 in order');
  assertEq(THIS.tour.map((s) => s.name), STOP_NAMES, 'stop names in order');
  assertEq(THIS.tour.map((s) => [s.lat, s.lng]), TOUR.map((s) => [s.lat, s.lng]), 'stop coordinates');
  assertEq(THIS.tour.map((s) => s.sv), TOUR.map((s) => s.sv), 'Street View positions, headings and panoramas');
  assertEq(THIS.tour.map((s) => s.video), TOUR.map((s) => s.video), 'NPS video links');
  assertEq(THIS.tour.map((s) => s.history), TOUR.map((s) => s.history), 'narration paragraphs');
  assertEq(sha(canon(THIS.tour)), PIN.tourSha256, 'canonical hash of the 16 tour stops');
  assertEq(THIS.mons.length, 512, 'monument count');
  assertEq(THIS.mons.map((m) => m.no), Array.from({ length: 512 }, (_, i) => i + 1), 'monument numbers 1..512 in order');
  const sides = {}; for (const m of THIS.mons) sides[m.side] = (sides[m.side] || 0) + 1;
  assertEq([sides.Union, sides.Confederate, sides.Other], [PIN.sides.Union, PIN.sides.Confederate, PIN.sides.Other], 'monuments per side (Union, Confederate, Other)'); assertEq(new Set(THIS.mons.map((m) => m.group)).size, PIN.groups, 'monument groups');
  assertEq(sha(canon(THIS.mons)), PIN.monsSha256, 'canonical hash of the 512 monuments');
  t.note('tour sha256', sha(canon(THIS.tour)).slice(0, 12)); t.note('monuments sha256', sha(canon(THIS.mons)).slice(0, 12)); t.note('entry', path.basename(ENTRY));
});

suite.test('T0-WG-02', 'static: the Walkthrough code is in the bundle (map container id, stop and monument sources and layers, embed URL, labels) and data/monuments.json (the star data) equals legacy\'s', async (t) => {
  const src = THIS.src; const count = (s) => src.split(s).length - 1;
  const must = ['gtbg-wt-map', '"wt-stops"', '"wt-stops-circle"', '"wt-stops-num"', '"wt-mons"', '"wt-mons-dots"', 'mapbox://styles/mapbox/satellite-v9', 'https://www.google.com/maps/embed/v1/streetview?key=',
    'Open in Google Maps', 'NPS Video', 'View on map', 'Refine your search to see more results (', 'Search by name or unit...', 'Search monuments...', 'Auto Tour Stops', 'Tour Stops', 'Virtual Walkthrough',
    'https://www.google.com/maps/search/?api=1&query=', 'flyTo({center:[pe.lng,pe.lat],zoom:14})', 'flyTo({center:[Pe.lon,Pe.lat],zoom:16})'];
  const missing = must.filter((m) => count(m) === 0);
  assertEq(missing, [], 'strings of the Walkthrough that are gone from the bundle');
  assertEq(count('title:"Monuments"'), 1, 'the toolbar Monuments button (title)');
  assert(count('Virtual Walkthrough') >= (CAP.C ? 3 : 2), 'the toolbar button and the phone-branch title (and, from group C, the phone tile)');
  // the star data: a fixed file in every tree (no /data edits, T0 rule 5)
  const mf = (d) => { const f = path.join(d, 'data', 'monuments.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
  const a = mf(DIST), b = mf(abs('legacy/dist'));
  assert(b && Array.isArray(b.monuments), 'legacy data/monuments.json missing');
  assert(a, 'data/monuments.json is missing from this tree (the star markers are drawn from it)');
  assertEq(canon(a), canon(b), 'data/monuments.json');
  assertEq(a.monuments.length, PIN.starFile, 'entries in data/monuments.json (8 on screen at the default 1440x900 view + Alabama below the edge)');
  t.note('star data', a.monuments.map((m) => m.name));
});

// ================================================================== desktop
suite.test('T0-WG-03', 'desktop: the toolbar button opens the Walkthrough: header, 16 stops in order, stop 1 narration, tabs, Street View iframe, Google Maps link, NPS video link', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const r = await openWalkthrough(S, 'desktop', { needMap: true });
  assertEq(r.via.how, 'toolbar button', 'entry point'); assert(r.via.hit, 'the toolbar button is covered by something at its centre (elementFromPoint): a real visitor could not click it');
  const d = await dom(p);
  t.note('via', r.via); t.note('capabilities', CAP);
  assertEq(d.phone, false, 'desktop branch');
  assert(/GETTYSBURG\s+A VIRTUAL EXPERIENCE/i.test(d.header) || /A VIRTUAL EXPERIENCE/i.test(d.header + ' ' + (await p.evaluate(() => document.body.innerText))), `header text: ${d.header}`);
  assertEq(d.back.text, label(false), 'back link label (CP changes the copy, intended)');
  assertEq(d.chips, 16, 'stop buttons'); assertEq(d.chipTexts, STOP_NAMES.map((n, i) => `${i + 1} ${n}`), 'stop buttons: number and name, in order');
  assertEq(d.activeChips, [1], 'exactly stop 1 is highlighted on open');
  assert(d.tabs.tour && d.tabs.mons, 'Tour Stops and Monuments tabs');
  const s0 = TOUR[0];
  assertEq(d.title, 'McPherson Ridge', 'stop 1 title'); assertEq(d.spans[0].toLowerCase(), 'tour stop 1', 'stop label'); assertEq(d.spans[1], 'July 1, 1863', 'day badge');
  assertEq(d.paras.length, s0.history.length, 'narration paragraphs'); s0.history.forEach((h, i) => assertEq(d.paras[i], stripHtml(h), `paragraph ${i + 1}`));
  // Street View embed
  assert(d.iframe, 'no Street View iframe'); assert(d.iframe.src.startsWith('https://www.google.com/maps/embed/v1/streetview?key='), `iframe src: ${maskTok(d.iframe.src)}`);
  assertEq(maskTok(d.iframe.src).replace(/^https:\/\/www\.google\.com\/maps\/embed\/v1\/streetview\?key=<k>&/, ''), svSrcRest(s0), 'iframe query (pano, heading, pitch, fov)');
  if (THIS.embedKey) assert(d.iframe.src.includes(`key=${THIS.embedKey}`), 'the iframe uses the embed key of the bundle');
  assertEq(d.iframe.title, 'McPherson Ridge', 'iframe title'); assert(d.iframe.fs, 'allowfullscreen');
  assertEq(d.iframe.allow, CAP.CP ? 'accelerometer; gyroscope' : null, 'iframe allow attribute (CP adds the sensor delegation, intended)');
  assert(d.iframe.rect.w > 300 && d.iframe.rect.h >= 200, `iframe size ${JSON.stringify(d.iframe.rect)}`);
  const g = d.links.find((l) => /Open in Google Maps/.test(l.text)); assert(g, 'Open in Google Maps link');
  assertEq([g.href, g.target, g.rel], [svMapsHref(s0), '_blank', 'noopener noreferrer'], 'Google Maps link');
  const v = d.links.find((l) => /NPS Video/.test(l.text)); assert(v, 'NPS video link');
  assertEq([v.href, v.target, v.rel, v.text.replace(/^▶\s*/, '')], [s0.video, '_blank', 'noopener noreferrer', 'NPS Video — McPherson Ridge'], 'NPS video link');
  if (CAP.AX) assertEq([d.root.role, d.root.modal, d.root.label], ['dialog', 'true', 'Virtual Walkthrough'], 'AX: the Walkthrough is a named modal dialog'); else assertEq(d.root.role, null, 'no dialog role before group AX');
  if (CAP.AX) assert(d.back.closeAttr, 'AX marks the Back button as the dialog\'s close control'); else assertEq(d.back.closeAttr, false, 'no close marker before AX');
  assertEq(S.googleRequests.length >= 1, true, 'the Street View embed was requested (stubbed in this run)');
  // nothing floating over the Walkthrough
  const over = await p.evaluate(() => window.__wg.pillsOverRoot()); t.note('floating layers over the Walkthrough', over);
  if (CAP.SHELL) assertEq(over, [], 'SHELL hides the Extra Features / Ask the Historian pills while a full-screen layer is open'); else t.note('legacy defect (fixed by SHELL)', over.length ? 'pills float over the narration text' : 'none seen');
  // every control is hit-testable
  const lay = await p.evaluate(() => window.__wg.layout());
  assertEq(lay.backHit, true, 'Back button is covered'); const covered = lay.chips.filter((c) => c.hit === false).map((c) => c.i); assertEq(covered, [], 'stop buttons covered by another element');
  await shot(S, 'desktop-1440-open');
  assertEq(errsSince(S, e0).map(errText), [], 'errors while opening the Walkthrough');
});

suite.test('T0-WG-04', 'desktop: the tour map: one extra map, 16 stop features at the dataset coordinates, 512 monument dots, >= 11 stop markers drawn, attribution (A), layer toggles', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  await openWalkthrough(S, 'desktop', { needMap: true });
  const m = await waitWtMap(p);
  const gs = await p.evaluate(() => window.__wg.glStats()); assertEq([gs.mapboxMaps, gs.mapboxCanvases], [2, 2], 'maps in the DOM while the Walkthrough is open (the animated map keeps its own)');
  assertEq(m.cont.id, 'gtbg-wt-map', 'container id'); assertEq(m.layers.sort(), ['wt-mons-dots', 'wt-stops-circle', 'wt-stops-num'], 'layers');
  assertEq(m.src.map((f) => f.id), Array.from({ length: 16 }, (_, i) => i + 1), 'stop feature ids'); assertEq(m.src.map((f) => f.name), STOP_NAMES, 'stop feature names');
  m.src.forEach((f, i) => assertEq(f.c, [TOUR[i].lng, TOUR[i].lat], `stop ${i + 1} coordinates ([lng, lat])`));
  assertEq(m.mons, 512, 'monument dots');
  assert(Math.abs(m.zoom - 13) < 0.01 && metres(m.center, [-77.235, 39.812]) < 5, `opening camera ${m.center} z${m.zoom}`);
  assert(m.cont.w >= 600 && m.cont.h >= 600, `map box ${m.cont.w}x${m.cont.h}`);
  await waitFor(async () => ((await info(p)).rendered || []).length >= 11, { timeout: 25000, label: 'stop markers drawn (queryRenderedFeatures)' });
  const rendered = (await info(p)).rendered; t.note('stop markers drawn at the opening view', rendered);
  assert(rendered.length >= 11 && rendered.length <= 16, `${rendered.length} stop markers drawn, want 11..16`);
  t.note('attribution control', m.attrib); assertEq(m.attrib, CAP.A, 'Mapbox attribution on the Walkthrough map (group A turns it on, intended; legacy hides it)');
  // the two layer checkboxes
  const d = await dom(p); assertEq(d.checks.map((c) => [c.label, c.checked]), [['Auto Tour Stops', true], ['Monuments', true]], 'checkboxes');
  const box = (name) => p.locator('label', { hasText: name }).locator('input[type=checkbox]').first();
  await box('Auto Tour Stops').click(); await sleep(300);
  let v = (await info(p)).vis; assertEq([v.circle, v.num, v.dots], ['none', 'none', 'visible'], 'Auto Tour Stops off: stop circles and numbers hidden, monuments stay');
  await box('Monuments').click(); await sleep(300); v = (await info(p)).vis; assertEq([v.circle, v.num, v.dots], ['none', 'none', 'none'], 'both off');
  await box('Auto Tour Stops').click(); await box('Monuments').click(); await sleep(300); v = (await info(p)).vis; assertEq([v.circle, v.num, v.dots], ['visible', 'visible', 'visible'], 'both on again');
  assertEq(errsSince(S, e0).map(errText), [], 'errors during the tour map test');
});

suite.test('T0-WG-05', 'desktop: each of the 16 stops changes title, label, day, narration, Street View src and links, and flies the map there (zoom 14, the stop\'s marker under the centre)', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  await openWalkthrough(S, 'desktop', { needMap: true }); await waitWtMap(p);
  const seen = []; const fly = [];
  for (const n of [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) {      // 16 first (stop 1 is open), then down to 1: every selection is a change
    const i = n - 1; const s = TOUR[i];
    const chip = p.locator('button', { hasText: new RegExp(`^\\s*${i + 1}\\s+${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }).first();
    await chip.click({ timeout: 8000 });
    const d = await waitFor(async () => { const x = await dom(p); return x.title === s.name ? x : null; }, { timeout: 8000, label: `stop ${i + 1} title` });
    assertEq(d.activeChips, [i + 1], `stop ${i + 1}: highlighted chip`);
    assertEq(d.spans[0].toLowerCase(), `tour stop ${i + 1}`, `stop ${i + 1} label`); assertEq(d.spans[1], s.day, `stop ${i + 1} day badge`);
    assertEq(d.paras.length, s.history.length, `stop ${i + 1} paragraph count`); assertEq(d.paras[0], stripHtml(s.history[0]), `stop ${i + 1} first paragraph`);
    assertEq(maskTok(d.iframe.src).replace(/^https:\/\/www\.google\.com\/maps\/embed\/v1\/streetview\?key=<k>&/, ''), svSrcRest(s), `stop ${i + 1} Street View query`); assertEq(d.iframe.title, s.name, `stop ${i + 1} iframe title`);
    assertEq(d.links.find((l) => /Google Maps/.test(l.text)).href, svMapsHref(s), `stop ${i + 1} Google Maps link`);
    assertEq(d.links.find((l) => /NPS Video/.test(l.text)).href, s.video, `stop ${i + 1} NPS video link`);
    const m = await waitFor(async () => { const x = await info(p); return !x.moving && metres(x.center, [s.lng, s.lat]) < 25 && Math.abs(x.zoom - 14) < 0.15 ? x : null; }, { timeout: 25000, label: `the map to fly to stop ${i + 1}` });
    const under = await p.evaluate(([lo, la]) => window.__wg.renderedAt(lo, la), [s.lng, s.lat]);
    assert(under && under.includes(i + 1), `stop ${i + 1}: its marker is not drawn at the map centre (features there: ${JSON.stringify(under)})`);
    fly.push(`${i + 1}:${Math.round(metres(m.center, [s.lng, s.lat]))}m`); seen.push(d.title);
  }
  assertEq(seen.length, 16, 'stops visited'); t.note('centre error per stop', fly.join(' '));
  assertEq(errsSince(S, e0).map(errText), [], 'errors while walking the stops');
});

suite.test('T0-WG-06', 'desktop: Monuments tab: SHOWING 100 OF 512, search, Union/Confederate/Other, group select, cap message, cards, "View on map" link, a card click flies the map', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  await openWalkthrough(S, 'desktop', { needMap: true }); await waitWtMap(p);
  await WT(p).locator('button:text-is("Monuments")').first().click(); await sleep(400);
  const st = async () => (await dom(p)).monsView;
  const status = (n) => `SHOWING ${Math.min(n, 100)} OF ${n} MONUMENTS`;
  const cap = (n) => (n > 100 ? `Refine your search to see more results (${n - 100} hidden)` : null);
  const check = async (what, q, side, group) => {
    const exp = monMatch(q, side, group); const v = await st();
    assertEq(v.status.toUpperCase(), status(exp.length), `${what}: status`); assertEq(v.cap, cap(exp.length), `${what}: cap message`);
    assertEq(v.cards, exp.slice(0, 100).map((m) => m.name), `${what}: cards (first 100, in dataset order)`);
    assertEq(v.gpsLinks.length, exp.slice(0, 100).filter((m) => m.lat !== 0).length, `${what}: View on map links`);
    return { n: exp.length, v };
  };
  const first = await check('open', '', 'all', 'all'); assertEq(first.n, 512, 'all monuments'); assertEq(first.v.status.toUpperCase(), 'SHOWING 100 OF 512 MONUMENTS', 'literal status');
  assertEq(first.v.cap, 'Refine your search to see more results (412 hidden)', 'literal cap message');
  assertEq(first.v.placeholder, 'Search by name or unit...', 'search placeholder'); assertEq(first.v.aria, CAP.AX ? 'Search monuments by name or unit' : null, 'search aria-label (AX adds it, intended)');
  assertEq(first.v.select.length, 25, 'group select options (All Groups + 24)'); assertEq(first.v.select[0], 'all', 'first option');
  assertEq(first.v.sides.map((s) => s.n), ['all', 'Union', 'Confederate', 'Other'], 'side chips'); assertEq(first.v.sides.filter((s) => s.active).map((s) => s.n), ['all'], 'all is active');
  const input = WT(p).locator('input[placeholder^="Search"]').first();
  const counts = {};
  // the search looks at the name AND at the "honors" line ("CSA" and "last surviving Union veteran" occur only there)
  for (const q of ['Alabama', 'Vermont', '20th Maine', 'CSA', 'last surviving Union veteran', 'no such monument zzz']) {
    await input.fill(q); await sleep(250); const r = await check(`search "${q}"`, q, 'all', 'all'); counts[q] = r.n;
  }
  assertEq([counts.Alabama, counts.Vermont, counts['20th Maine'], counts['no such monument zzz']], [2, 8, 2, 0], 'search result counts');
  assert(monMatch('CSA').length > monMatch('CSA').filter((m) => m.name.toLowerCase().includes('csa')).length && counts.CSA > 0 && counts['last surviving Union veteran'] === 1, 'the honors-only searches must find monuments that the names do not contain');
  await input.fill('vermont'); await sleep(250); await check('search is case-insensitive', 'vermont', 'all', 'all'); await input.fill(''); await sleep(250);
  for (const side of ['Union', 'Confederate', 'Other']) {
    await WT(p).locator(`button:text-is("${side}")`).first().click(); await sleep(250); const r = await check(`chip ${side}`, '', side, 'all'); counts[side] = r.n;
    assertEq((await st()).sides.filter((s) => s.active).map((s) => s.n), [side], `${side} is the active chip`);
  }
  assertEq([counts.Union, counts.Confederate, counts.Other], [457, 40, 15], 'sides');
  await WT(p).locator('button:text-is("Union")').first().click(); await input.fill('Maine'); await sleep(250); await check('Union + search "Maine"', 'Maine', 'Union', 'all');
  await input.fill(''); await WT(p).locator('button:text-is("all")').first().click(); await sleep(250);
  const sel = WT(p).locator('select').first();
  for (const g of ['Vermont', 'Confederate States & State Monuments', 'Other Monuments On The Gettysburg Battlefield']) { await sel.selectOption(g); await sleep(250); await check(`group "${g}"`, '', 'all', g); }
  await sel.selectOption('all'); await sleep(250); await check('group reset', '', 'all', 'all');
  // View on map link: Google Maps search at the monument, new tab, no opener; it does not trigger the card's own click (the map stays put)
  const before = await info(p); const v0 = await st(); const m0 = monMatch('', 'all', 'all')[0];
  await p.evaluate(() => { window.__wgNav = []; document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href*="google.com/maps/search"]'); if (a) { window.__wgNav.push(a.href); e.preventDefault(); } }, true); });
  const link = WT(p).locator('a[href*="google.com/maps/search"]').first(); await link.click(); await sleep(900);
  assertEq(await p.evaluate(() => window.__wgNav), [`https://www.google.com/maps/search/?api=1&query=${m0.lat},${m0.lon}`], 'View on map opens Google Maps at the monument');
  assertEq([v0.gpsLinks[0].target, v0.gpsLinks[0].rel, v0.gpsLinks[0].text.replace(/\s+/g, ' ')], ['_blank', 'noopener noreferrer', 'View on map ↗'], 'link attributes');
  assert(metres((await info(p)).center, before.center) < 5, 'the View on map link also moved the map (the card click must not fire)');
  // a card click flies the Walkthrough map to the monument (zoom 16)
  const card = WT(p).locator('h3').filter({ hasText: m0.name }).first(); await card.click();
  const fl = await waitFor(async () => { const x = await info(p); return !x.moving && metres(x.center, [m0.lon, m0.lat]) < 25 && Math.abs(x.zoom - 16) < 0.15 ? x : null; }, { timeout: 25000, label: 'the map to fly to the clicked monument' });
  t.note('card click', `${m0.name}: ${Math.round(metres(fl.center, [m0.lon, m0.lat]))} m from the monument, zoom ${fl.zoom.toFixed(2)}`);
  await shot(S, 'desktop-1440-monuments');
  // back to the tour tab keeps the selected stop
  await WT(p).locator('button:text-is("Tour Stops")').first().click(); await sleep(300);
  assertEq((await dom(p)).title, 'McPherson Ridge', 'the Tour Stops tab shows the selected stop again');
  assertEq(errsSince(S, e0).map(errText), [], 'errors during the Monuments tab test');
});

suite.test('T0-WG-07', 'desktop: Back returns to the animated map: one map, the same canvases and WebGL contexts, the map responds; three open/close cycles leak nothing', async (t) => {
  const S = await desktop(); const p = S.page;
  {
    assert(!F.mainNotLoaded, 'the animated map did not finish loading its style within 45 s');
    const e0 = S.collector.firstParty.length;
    const g0 = await p.evaluate(() => window.__wg.glStats()); const cam0 = await p.evaluate(() => window.__wg.mainCam());
    t.note('before', g0);
    assertEq([g0.mapboxMaps, g0.mapboxCanvases], [1, 1], 'one map before opening');
    for (let cycle = 1; cycle <= 3; cycle++) {
      const r = await openWalkthrough(S, 'desktop', { needMap: cycle === 1 });
      assertEq(r.via.how, 'toolbar button', 'entry point');
      const open = await p.evaluate(() => window.__wg.glStats()); assertEq(open.mapboxMaps, 2, `cycle ${cycle}: two maps while open`);
      if (cycle === 1) { await p.locator('button', { hasText: `7 Warfield Ridge` }).first().click(); await sleep(600); }
      await backToMap(S);
      const g = await waitFor(async () => { const x = await p.evaluate(() => window.__wg.glStats()); return x.mapboxMaps === 1 && x.alive === g0.alive ? x : null; }, { timeout: 8000, label: `cycle ${cycle}: the Walkthrough map is removed (one .mapboxgl-map, same live WebGL contexts)` }).catch(async () => ({ ...(await p.evaluate(() => window.__wg.glStats())), failed: true }));
      assert(!g.failed, `cycle ${cycle}: leaked map: ${JSON.stringify(g)} (before: ${JSON.stringify(g0)})`);
      assertEq([g.canvases, g.mapboxCanvases, g.aliveConnected], [g0.canvases, g0.mapboxCanvases, g0.aliveConnected], `cycle ${cycle}: canvases and connected contexts as before`);
    }
    const cam1 = await p.evaluate(() => window.__wg.mainCam());
    assert(metres(cam1.center, cam0.center) < 3 && Math.abs(cam1.zoom - cam0.zoom) < 0.01, 'the animated map camera changed while the Walkthrough was open and closed');
    assertEq(cam1.canvas.w, cam0.canvas.w, 'main canvas width');
    // the animated map still answers: its API always (the instance is alive), real mouse input where the tree lets the map receive it (group A: the unit canvas no longer swallows
    // pointer events; legacy, baseline and R0 cannot be panned or wheel-zoomed at all, a desktop-verifier finding, so there the real-input check would test legacy's own defect)
    const cx = cam1.canvas.x + cam1.canvas.w / 2, cy = cam1.canvas.y + cam1.canvas.h / 2;
    await mouseDrag(p, [cx, cy], [cx - 120, cy - 60]); await sleep(700);
    const cam2 = await p.evaluate(() => window.__wg.mainCam()); const panned = metres(cam2.center, cam1.center);
    await p.mouse.move(cx, cy); await p.mouse.wheel(0, -240); await sleep(700);
    const cam3 = await p.evaluate(() => window.__wg.mainCam());
    t.note('real input on the animated map', `drag moved it ${panned.toFixed(0)} m, wheel changed zoom by ${(cam3.zoom - cam2.zoom).toFixed(2)}`);
    if (CAP.A) { assert(panned > 40, `the animated map did not pan after a real drag (${panned.toFixed(0)} m)`); assert(cam3.zoom > cam2.zoom + 0.1, `the animated map did not zoom after a wheel (${cam2.zoom} -> ${cam3.zoom})`); }
    else t.note('legacy behaviour (group A fixes it)', panned < 5 ? 'a drag does not pan the map: the z-index 10 unit canvas swallows pointer events' : 'drag pans');
    await p.evaluate(() => window.__wg.mainJump({ center: [-77.2, 39.8], zoom: 12.7 })); await sleep(300);
    const cam4 = await p.evaluate(() => window.__wg.mainCam()); assert(metres(cam4.center, [-77.2, 39.8]) < 5 && Math.abs(cam4.zoom - 12.7) < 0.01, 'the animated map instance no longer answers jumpTo');
    await p.evaluate((h) => window.__wg.mainJump(h), { center: [-77.235, 39.812], zoom: 13.5, bearing: 0, pitch: 0 });
    assert((await p.locator('button', { hasText: 'Virtual Walkthrough' }).count()) === 1, 'toolbar button is back');
    assertEq(errsSince(S, e0).map(errText), [], 'errors during open/close cycles');
    t.note('after 3 cycles', await p.evaluate(() => window.__wg.glStats()));
  }
});

suite.test('T0-WG-17', 'desktop: the window is narrowed below 860 px (the Walkthrough swaps to its phone layout) and widened again while it is open: no error, the stop and the text stay, Back leaves nothing behind, it opens again with a live map; the map itself dies on every tree today (named SKIP, --strict-resize fails)', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const g0 = await p.evaluate(() => window.__wg.glStats());
  await openWalkthrough(S, 'desktop', { needMap: true }); await waitWtMap(p);
  await p.locator('button', { hasText: /^\s*3\s+Oak Ridge\s*$/ }).first().click(); await waitFor(async () => (await dom(p)).title === 'Oak Ridge', { timeout: 6000, label: 'stop 3' });
  let dead = false; const seen = [];
  try {
    for (const [name, vp] of [['700 wide', { width: 700, height: 900, dpr: 1, mobile: false }], ['1440 wide again', VP.desktop]]) {
      await emulateViewport(p, vp); await sleep(1500);
      const d = await dom(p); const m = await info(p);
      seen.push(`${name}: ${d.open ? `open, ${d.phone ? 'phone' : 'desktop'} layout, stop "${d.title}", ${d.chips} stops` : 'NOT OPEN'}; map ${m.found ? `${m.cont.w}x${m.cont.h}` : 'gone'}`);
      assert(d.open, `${name}: the Walkthrough closed itself`);
      assertEq([d.title, d.chips], ['Oak Ridge', 16], `${name}: the selected stop and the stop list`);
      assertEq(d.paras[0], stripHtml(TOUR[2].history[0]), `${name}: the narration`);
      if (!m.found || m.cont.w === 0) dead = true;
    }
  } finally { await emulateViewport(p, VP.desktop); await sleep(500); }
  t.note('while resizing', seen);
  await backToMap(S);
  const g = await waitFor(async () => { const x = await p.evaluate(() => window.__wg.glStats()); return x.mapboxMaps === 1 && x.alive === g0.alive ? x : null; }, { timeout: 8000, label: 'Back after the resize: one map, the same live WebGL contexts' });
  t.note('after Back', g);
  await openWalkthrough(S, 'desktop', { needMap: true }); const m2 = await waitWtMap(p);
  assert(m2.cont.w > 600, `after reopening the map is ${m2.cont.w} px wide`);
  await backToMap(S);
  assertEq(errsSince(S, e0).map(errText), [], 'errors while resizing across the breakpoint');
  if (dead) {
    const msg = 'the Walkthrough map is dead after the window crossed 860 px while it was open (the component swaps its two layouts but creates the map only once, so the map stays on the container that was removed; widening again does not bring it back). Same on legacy, baseline and every train: a defect of production, not a regression. Close and reopen the Walkthrough to get the map back.';
    t.note('KNOWN PRE-EXISTING DEFECT', msg);
    if (STRICT_RESIZE) throw new Error(msg);
    throw new Skip(msg);
  }
});

suite.test('T0-WG-08', 'desktop keyboard: Tab order through the Walkthrough, Enter on a stop, Esc closes it (AX: focus moves in, Tab is trapped, focus returns to the opener)', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const opener = p.locator('button', { hasText: 'Virtual Walkthrough' }).first();
  await opener.focus(); await p.keyboard.press('Enter');
  await waitOpen(p); await sleep(500);
  const d0 = await dom(p);
  t.note('focus after open', await p.evaluate(() => window.__wg.describe(document.activeElement)));
  if (CAP.AX) { assert(d0.root.focusInside, 'AX: focus did not move into the dialog on open'); assertEq(d0.root.tabindex, '-1', 'dialog tabindex'); }
  // Tab order starts from the Back button
  await p.evaluate(() => window.__wg.focusBack());
  const seq = []; let escaped = 0;
  for (let i = 0; i < 44; i++) { await p.keyboard.press('Tab'); const x = await p.evaluate(() => window.__wg.tabOrder()); seq.push(x); if (!x.inside) escaped++; }
  const names = seq.map((x) => x.active);
  const at = (re) => names.findIndex((n) => re.test(n));
  const order = [/Animated Map|Back to the map/, /^button\[Tour Stops\]/, /^button\[Monuments\]/, ...STOP_NAMES.map((n, i) => new RegExp(`^button\\[${i + 1} ${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`))];
  // from Back: Back is behind us (we focused it), so the first hit of each later control must be increasing
  const idx = order.slice(1).map(at); t.note('tab sequence (first 24)', names.slice(0, 24));
  assert(idx.every((v) => v >= 0), `controls not reached by Tab within 44 presses: ${order.slice(1).filter((_, k) => idx[k] < 0).map(String).join(', ')}`);
  assert(idx.every((v, k) => k === 0 || v > idx[k - 1]), `Tab does not follow the visual order (tabs, then stops 1..16): indices ${idx.join(',')}`);
  t.note('tab presses that left the Walkthrough', escaped);
  if (CAP.AX) assertEq(escaped, 0, 'AX: Tab must stay inside the dialog'); else t.note('no focus trap before AX (intended)', escaped);
  // Shift+Tab from Back (AX: wraps to the last control inside)
  await p.evaluate(() => window.__wg.focusBack()); await p.keyboard.press('Shift+Tab'); const sb = await p.evaluate(() => window.__wg.tabOrder());
  if (CAP.AX) assert(sb.inside, `AX: Shift+Tab from Back left the dialog (${sb.active})`);
  // Enter on a stop selects it (a native button: Enter works on every tree)
  const chip5 = p.locator('button', { hasText: /^\s*5\s+Virginia Memorial\s*$/ }).first(); await chip5.focus(); await p.keyboard.press('Enter');
  await waitFor(async () => (await dom(p)).title === 'Virginia Memorial', { timeout: 6000, label: 'Enter on stop 5 to select it' });
  assertEq((await dom(p)).activeChips, [5], 'stop 5 highlighted after Enter');
  // Esc closes (every tree: the app's own Escape handler) and the animated map is usable again
  await p.keyboard.press('Escape'); await waitClosed(p);
  const back = await p.evaluate(() => window.__wg.describe(document.activeElement)); t.note('focus after Esc', back);
  if (CAP.AX) assert(/Virtual Walkthrough/.test(back), `AX: focus did not return to the opener after Esc (${back})`);
  assertEq(errsSince(S, e0).map(errText), [], 'errors during the keyboard test');
});

suite.test('T0-WG-16', 'desktop: the visible text of the Walkthrough (tour stop 1 and 16, Monuments tab: default, a search, a chip + group) is the text of legacy/dist, word for word (only the back link may differ: CP)', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  await openWalkthrough(S, 'desktop', { needMap: false });
  const back = label(false); const states = {};
  const grab = async (name) => { const raw = await p.evaluate(() => window.__wg.rootText()); const txt = raw.split(back).join('<BACK>'); states[name] = { sha: sha(txt).slice(0, 16), len: txt.length, text: txt }; };
  await grab('tour-1');
  await p.locator('button', { hasText: /^\s*16\s+Soldiers/ }).first().click(); await waitFor(async () => (await dom(p)).title === "Soldiers' National Cemetery", { timeout: 6000, label: 'stop 16' }); await grab('tour-16');
  await WT(p).locator('button:text-is("Monuments")').first().click(); await sleep(400); await grab('monuments-default');
  await WT(p).locator('input[placeholder^="Search"]').first().fill('Vermont'); await sleep(300); await grab('monuments-vermont');
  await WT(p).locator('input[placeholder^="Search"]').first().fill(''); await WT(p).locator('button:text-is("Union")').first().click(); await WT(p).locator('select').first().selectOption('Maine'); await sleep(300); await grab('monuments-union-maine');
  t.note('text sha256 (first 16) per state', Object.fromEntries(Object.entries(states).map(([k, v]) => [k, `${v.sha} (${v.len} chars)`])));
  if (SHOTS) { const dir = path.join(REPO, 'tmp', process.env.T0_AGENT, 'shots', LABEL); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'walkthrough-text.json'), JSON.stringify(Object.fromEntries(Object.entries(states).map(([k, v]) => [k, v.text])), null, 1)); }
  for (const [k, v] of Object.entries(states)) if (TEXT_PIN[k]) assertEq(v.sha, TEXT_PIN[k], `visible text of the state "${k}" differs from legacy/dist (run with --shots to save the text)`);
  assertEq(errsSince(S, e0).map(errText), [], 'errors while reading the text');
});

// ================================================================== phone
async function phoneRun(t, vpKey, stops, label2) {
  const S = await open({ profile: `phone-${vpKey}`, viewport: VP[vpKey], tiles: 'block' }); const p = S.page;
  try {
    await boot(S, 'phone');
    const e0 = S.collector.firstParty.length;
    const g0 = await p.evaluate(() => window.__wg.glStats());
    const r = await openWalkthrough(S, 'phone', { needMap: CAP.C });
    if (r.via === 'none') {
      // before group C the phone shell has no Walkthrough tile (legacy: "NPS Auto Tour" takes the place); the entry point is a desktop-layout feature there
      t.note('phone Tools tiles', r.tools);
      assert(!CAP.C, `group C is in this tree (${GROUPS.join(',')}) but the phone Tools sheet has no "Virtual Walkthrough" tile: ${JSON.stringify(r.tools)}`);
      assert(r.tools.some((x) => /NPS Auto Tour/.test(x)), `neither a Walkthrough tile nor "NPS Auto Tour" in the Tools sheet: ${JSON.stringify(r.tools)}`);
      throw new Skip(`INTENDED difference: the phone shell has no Virtual Walkthrough tile before group C (R1b); tiles: ${r.tools.join(' | ')}`);
    }
    const d = r.d; assertEq(d.phone, true, 'phone branch'); t.note('via', r.via); await sleep(800); await shot(S, `${vpKey}-open`);
    assertEq(d.back.text, label(true), 'back link label'); assert(/^Virtual Walkthrough$/i.test(d.header.replace(d.back.text, '').trim()) || /Virtual Walkthrough/.test(d.header), `header: ${d.header}`);
    assertEq(d.chipTexts, STOP_NAMES.map((n, i) => `${i + 1} ${n}`), 'stop buttons'); assert(d.tabs.tour && d.tabs.mons, 'tabs'); assertEq(d.activeChips, [1], 'stop 1 highlighted');
    assertEq(d.title, 'McPherson Ridge', 'stop 1'); assertEq(d.paras.length, TOUR[0].history.length, 'narration');
    assertEq(d.iframe.allow, CAP.CP ? 'accelerometer; gyroscope' : null, 'iframe allow'); assert(d.iframe.src.startsWith('https://www.google.com/maps/embed/v1/streetview?key='), 'Street View iframe');
    if (CAP.AX) assertEq([d.root.role, d.root.modal], ['dialog', 'true'], 'AX dialog on the phone');
    // the map of the phone branch (group C gave it its container id; legacy never initialised it)
    const m = await waitWtMap(p); assertEq(m.cont.id, 'gtbg-wt-map', 'phone map container id'); assertEq(m.src.length, 16, 'stop features'); assertEq(m.mons, 512, 'monument dots');
    assert(m.cont.w >= VP[vpKey].width - 2, `phone map is ${m.cont.w} wide in a ${VP[vpKey].width} wide window`);
    const mbox = d.mapBox; t.note('map box', mbox);
    const drawn = await waitFor(async () => { const x = await info(p); return (x.rendered || []).length ? x : null; }, { timeout: 20000, label: 'a stop marker drawn on the phone map' });
    t.note('stop markers drawn', drawn.rendered); assert(drawn.rendered.length >= 1, 'no stop marker drawn');
    for (const n of stops) {
      const s = TOUR[n - 1];
      await realTap(S, p.locator('button', { hasText: new RegExp(`^\\s*${n}\\s+${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }).first());
      const dd = await waitFor(async () => { const x = await dom(p); return x.title === s.name ? x : null; }, { timeout: 8000, label: `stop ${n} title (phone)` });
      assertEq(dd.spans[1], s.day, `stop ${n} day`); assertEq(dd.paras[0], stripHtml(s.history[0]), `stop ${n} narration`);
      assertEq(maskTok(dd.iframe.src).replace(/^https:\/\/www\.google\.com\/maps\/embed\/v1\/streetview\?key=<k>&/, ''), svSrcRest(s), `stop ${n} Street View`);
      await waitFor(async () => { const x = await info(p); return !x.moving && metres(x.center, [s.lng, s.lat]) < 25 && Math.abs(x.zoom - 14) < 0.15 ? x : null; }, { timeout: 25000, label: `the phone map to fly to stop ${n}` });
    }
    // Monuments tab (phone branch: "N monuments" status, "+ N more. Refine your search.", no group select, cards do not fly)
    await realTap(S, p.locator('button:text-is("Monuments")').first()); await sleep(400);
    const mv = async () => (await dom(p)).monsView;
    let v = await mv(); assertEq(v.placeholder, 'Search monuments...', 'phone search placeholder'); assertEq(v.aria, CAP.AX ? 'Search monuments' : null, 'phone search aria-label (AX, intended)');
    assertEq(v.status.toLowerCase(), '512 monuments', 'phone status'); assertEq(v.cards.length, 100, 'phone cards (first 100)'); assertEq(v.cap, '+ 412 more. Refine your search.', 'phone cap message'); assertEq(v.select, null, 'no group select on the phone');
    const input = p.locator('input[placeholder^="Search"]').first();
    await input.fill('Vermont'); await sleep(250); v = await mv(); assertEq([v.status.toLowerCase(), v.cards.length, v.cap], ['8 monuments', 8, null], 'phone search Vermont');
    await input.fill(''); await realTap(S, p.locator('button:text-is("Confederate")').first()); await sleep(250); v = await mv(); assertEq([v.status.toLowerCase(), v.cards.length], ['40 monuments', 40], 'phone Confederate chip');
    await realTap(S, p.locator('button:text-is("Union")').first()); await sleep(250); v = await mv(); assertEq([v.status.toLowerCase(), v.cards.length, v.cap], ['457 monuments', 100, '+ 357 more. Refine your search.'], 'phone Union chip');
    // Back: the animated map and its Tools sheet are intact
    await realTap(S, p.locator('button', { hasText: /Animated Map|Back to the map/ }).filter({ visible: true }).first()); await waitClosed(p);
    await waitFor(async () => { const x = await p.evaluate(() => window.__wg.glStats()); return x.mapboxMaps === 1 && x.alive === g0.alive ? x : null; }, { timeout: 8000, label: 'the phone Walkthrough map is removed (one map, same live contexts)' });
    assert((await p.locator('button', { hasText: /Tools/ }).count()) >= 1, 'the Tools button is back');
    const lay = await p.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1); assert(lay, 'horizontal scroll on the phone after Back');
    assertEq(errsSince(S, e0).map(errText), [], `errors during the ${label2} test`);
  } finally { await closeSession(S); }
}
suite.test('T0-WG-09', 'phone 375x812: Tools -> Virtual Walkthrough (group C): stops, the phone-branch map, Monuments tab, Back; before group C the phone shell has no such tile (intended)', async (t) => { await phoneRun(t, 'phone', [1, 2, 9, 16], 'phone'); });
suite.test('T0-WG-10', 'phone landscape 812x375: the same entry and flows (short)', async (t) => { await phoneRun(t, 'landscape', [1, 16], 'landscape'); });

// ================================================================== layout
suite.test('T0-WG-11', 'layout: at 320, 375, 768 and 1440 wide the Walkthrough has no horizontal scroll, no text outside the window, no truncated control, and Back, tabs and the 16 stops are reachable', async (t) => {
  const problems = []; const seen = {};
  for (const [name, vp, layout] of [['1440x900', VP.desktop, 'desktop'], ['768x1024', VP.w768, 'phone'], ['375x812', VP.phone, 'phone'], ['320x568', VP.w320, 'phone']]) {
    const S = await open({ profile: `layout-${name}`, viewport: vp, tiles: 'block' }); const p = S.page;
    try {
      await boot(S, layout);
      if (layout === 'phone' && !CAP.C) {
        // before group C the phone shell has no entry; what a visitor who chose "Desktop" gets on a narrow window is the desktop layout, where the toolbar crowds the button:
        // open it with a programmatic click and record whether a real click could have reached it
        await p.goto(`${srv.url}/`, { waitUntil: 'domcontentloaded' }); await enterApp(p, 'desktop');
        const hit = await hitByText(p, /Virtual Walkthrough/);
        seen[`${name} entry`] = { how: 'desktop layout on a narrow window (no phone entry before group C)', toolbarButtonReachable: !!hit.hit && !!hit.inViewport, coveredBy: hit.top };
        await p.locator('button', { hasText: 'Virtual Walkthrough' }).first().dispatchEvent('click'); await waitOpen(p);
      } else await openWalkthrough(S, layout, { needMap: false });
      await sleep(900);
      await shot(S, `layout-${name}`);
      const lay = await p.evaluate(() => window.__wg.layout()); const d = await dom(p);
      seen[name] = { branch: d.phone ? 'phone' : 'desktop', docScrollW: lay.docScrollW, vw: lay.vw, rootScrollW: lay.rootScrollW, outside: lay.outside.length, truncated: lay.truncated.length };
      if (lay.docScrollW > lay.vw + 1) problems.push(`${name}: page scrolls horizontally (${lay.docScrollW} > ${lay.vw})`);
      if (lay.rootScrollW > lay.rootClientW + 1) problems.push(`${name}: the Walkthrough root is wider than its box (${lay.rootScrollW} > ${lay.rootClientW})`);
      if (lay.outside.length) problems.push(`${name}: text outside the window: ${lay.outside.join('; ')}`);
      if (lay.truncated.length) problems.push(`${name}: truncated controls: ${lay.truncated.join('; ')}`);
      if (lay.back.l < 0 || lay.back.r > lay.vw || lay.back.t < 0 || lay.back.b > lay.vh) problems.push(`${name}: Back button leaves the window ${JSON.stringify(lay.back)}`);
      if (lay.backHit !== true) problems.push(`${name}: Back button is covered by another element or out of view`);
      const coveredCtl = [...(lay.tabsHit.tour === false ? ['Tour Stops tab'] : []), ...(lay.tabsHit.mons === false ? ['Monuments tab'] : []), ...lay.chips.filter((c) => c.hit === false).map((c) => `stop ${c.i}`)];
      seen[`${name} covered controls`] = coveredCtl;
      if (coveredCtl.length && CAP.SHELL) problems.push(`${name}: controls covered by another element: ${coveredCtl.join(', ')}`);
      else if (coveredCtl.length) seen[`${name} legacy defect (fixed by SHELL)`] = `the Extra Features / Ask the Historian pills cover ${coveredCtl.join(', ')}`;
      const offChips = lay.chips.filter((c) => c.l < -1 || c.r > lay.vw + 1).map((c) => c.i); if (offChips.length) problems.push(`${name}: stop buttons outside the window: ${offChips.join(',')}`);
      if (lay.iframeW && lay.iframeW > lay.vw) problems.push(`${name}: Street View frame wider than the window`);
      for (const tab of ['tourRect', 'monsRect']) { const q = d.tabs[tab]; if (!q || q.x < -1 || q.x + q.w > lay.vw + 1) problems.push(`${name}: ${tab} outside the window`); }
      // the stops are reachable: scroll to the last one and tap it
      const last = p.locator('button', { hasText: /^\s*16\s+Soldiers/ }).first(); await last.scrollIntoViewIfNeeded(); await last.click({ timeout: 6000 });
      await waitFor(async () => (await dom(p)).title === "Soldiers' National Cemetery", { timeout: 6000, label: 'stop 16 selected' });
      const after = await p.evaluate(() => window.__wg.layout());
      if (after.docScrollW > after.vw + 1) problems.push(`${name}: page scrolls horizontally after selecting stop 16`);
      if (after.outside.length) problems.push(`${name}: text outside the window after stop 16: ${after.outside.join('; ')}`);
    } finally { await closeSession(S); }
  }
  t.note('measurements', seen);
  assertEq(problems, [], 'layout problems');
});

// ================================================================== console, real Google
suite.test('T0-WG-12', 'one run with real Mapbox tiles and the REAL Google Street View embed: the first-party console stays clean (known third-party Google noise is listed, not ignored silently)', async (t) => {
  if (!REAL_GOOGLE) throw new Skip('--no-real-google');
  const S = await desktop(); const p = S.page;
  await p.unroute(GOOGLE_EMBED, S.googleHandler); S.setTiles('inject');
  try {
    const e0 = S.collector.firstParty.length; const u0 = usedNow();
    await openWalkthrough(S, 'desktop', { needMap: false }); await waitWtMap(p);
    const frame = await waitFor(() => p.frames().find((f) => /^https:\/\/www\.google\.com\/maps\/embed\/v1\/streetview/.test(f.url())), { timeout: 20000, label: 'the Street View frame' });
    await frame.waitForLoadState('load', { timeout: 30000 }); await sleep(3500);
    t.note('embed frame', maskTok(frame.url()).replace(/^(.{90}).*$/, '$1'));
    for (const n of [2, 8, 16]) { await p.locator('button', { hasText: new RegExp(`^\\s*${n}\\s`) }).first().click(); await sleep(2500); }
    await p.locator('button:text-is("Monuments")').first().click(); await sleep(400); await p.locator('input[placeholder^="Search"]').first().fill('Vermont'); await sleep(500);
    await p.locator('button:text-is("Tour Stops")').first().click(); await sleep(400);
    await backToMap(S); await sleep(800);
    const errs = errsSince(S, e0), noise = noiseSince(S, e0);
    t.note('mapbox requests in this run', usedNow() - u0);
    const noiseCount = {}; for (const e of noise) { const k = `${e.text.slice(0, 90)} @${(e.url || '').replace(/^https?:\/\//, '').slice(0, 50)}`; noiseCount[k] = (noiseCount[k] || 0) + 1; }
    t.note('third-party Google noise (not ours)', noiseCount);
    t.note('bad responses (non-Mapbox)', S.collector.badResponses.slice(0, 5)); t.note('failed requests (non-Mapbox)', S.collector.failedRequests.slice(0, 5));
    assertEq(errs.map(errText), [], 'first-party errors with the real embed');
    const firstPartyBad = S.collector.badResponses.filter((r) => r.url.startsWith(srv.url)); assertEq(firstPartyBad, [], 'first-party responses >= 400');
    const sensor = noise.filter((e) => /Permissions policy violation/i.test(e.text));                 // (a transient 503 of Google's Street View tile server is listed above, but it is not about the sensors)
    if (CAP.CP && USE_EMULATOR) assertEq(sensor.length, 0, 'CP + the generated Permissions-Policy delegate the sensors to the Street View frame: Google must log no accelerometer/gyroscope violation');
    else t.note('sensor delegation', CAP.CP ? 'attribute only (this tree has no _headers: inert, Google logs its own accelerometer error)' : 'none before CP: Google logs its own accelerometer error (intended, same as legacy)');
  } finally { S.setTiles('block'); await p.route(GOOGLE_EMBED, S.googleHandler); }
});

// ================================================================== the Monuments toolbar button: star markers
const starSession = desktop;                       // the star tests use the same visitor (the overlay is wired once the toolbar exists)
const HOME = { center: [-77.235, 39.812], zoom: 13.5, bearing: 0, pitch: 0 };            // the animated map's opening camera
const starsNow = (p) => p.evaluate(() => window.__wg.stars());
const monBtn = (p) => p.locator('button[title="Monuments"]').first();
/** the default view with the stars off: every star test starts from here, whatever the previous test left behind */
async function resetStars(p) {
  await p.evaluate((h) => window.__wg.mainJump(h), HOME); await sleep(400);
  if ((await starsNow(p)).count > 0) { await monBtn(p).click(); await sleep(600); }
}
/** does the 🗿 button draw anything in this tree? (T0-WG-13 records it; a run of T0-WG-14 or -15 alone probes it once) */
async function markersExist(S) {
  if (F.stars1) return F.stars1.count > 0;
  const p = S.page; await resetStars(p); await monBtn(p).click(); await sleep(1500);
  F.stars1 = await starsNow(p); await resetStars(p);
  return F.stars1.count > 0;
}
function needStars() { if (STARS === 'off') throw new Skip('--stars off'); }
suite.test('T0-WG-13', 'the Monuments toolbar button shows monument markers on the animated map, a second click hides them, a third shows them again (legacy/dist: exactly the 8 stars of data/monuments.json; a restored map-tracking layer: any number >= 1)', async (t) => {
  needStars();
  const S = await starSession(); const p = S.page; const e0 = S.collector.firstParty.length;
  await monBtn(p).waitFor({ state: 'visible', timeout: 15000 });
  await resetStars(p);
  const s0 = await starsNow(p); assertEq(s0.count, 0, 'no markers before the click');
  await monBtn(p).click(); await sleep(1500);
  const s1 = await starsNow(p); F.stars1 = s1;
  t.note('after the first click', { kind: s1.kind, count: s1.count, onScreen: s1.onScreen.length, layers: s1.layers, titles: s1.onScreen.map((k) => k.title).slice(0, 10) });
  if (s1.count === 0) {
    const msg = 'no monument markers after clicking Monuments: production removed the inline script (docs/baseline-drift.md section 5); owner decision 2026-10-04: UNINTENTIONAL, must be restored (group MON). KNOWN REGRESSION against legacy.';
    t.note('KNOWN REGRESSION', msg);
    if (STARS === 'require' || IS_LEGACY) throw new Error(msg);
    throw new Skip(msg);
  }
  if (s1.kind === 'dom-overlay' && s1.overlay) {                         // legacy's mechanism: the exact legacy result
    const want = PIN.starNames.map((n) => n.toLowerCase());
    const names = s1.onScreen.map((k) => k.title.replace(/\s*\((Union|Confederate)\)\s*$/, '').toLowerCase());
    assertEq(s1.onScreen.length, 8, 'stars on screen at the default 1440x900 view'); if (names.every(Boolean)) assertEq([...names].sort(), [...want].sort(), 'star names on screen');
  } else assert(s1.onScreen.length >= 1, `${s1.kind}: no marker on screen at the default view`);
  await monBtn(p).click(); await sleep(800); const s2 = await starsNow(p); assertEq(s2.count, 0, 'second click hides the markers');
  await monBtn(p).click(); await sleep(1000); const s3 = await starsNow(p);
  assert(Math.abs(s3.onScreen.length - s1.onScreen.length) <= (s1.kind === 'map-layer' ? 2 : 0), `third click shows them again: ${s3.onScreen.length} on screen, ${s1.onScreen.length} the first time`);
  await resetStars(p);
  assertEq(errsSince(S, e0).map(errText), [], 'errors while toggling the markers');
});

suite.test('T0-WG-14', "the markers follow the map: after a pan and after zooming in and out every marker that stays in view sits where the map moved it (restored behaviour; legacy/dist's overlay is screen-fixed by design and is skipped)", async (t) => {
  needStars();
  if (IS_LEGACY) throw new Skip('legacy/dist: the overlay is projected from the default view only (documented limitation, docs/baseline-drift.md 3.1 C)');
  const S = await starSession(); const p = S.page; const e0 = S.collector.firstParty.length;
  if (!(await markersExist(S))) throw new Skip('no monument markers in this tree (see T0-WG-13)');
  try {
    await resetStars(p); await monBtn(p).click(); await sleep(1200);
    const A = await starsNow(p); const cam0 = await p.evaluate(() => window.__wg.mainCam()); const cv = cam0.canvas; const cc = { x: cv.x + cv.w / 2, y: cv.y + cv.h / 2 };
    assert(A.onScreen.length >= 1, 'no marker on screen at the default view');
    const inside = (q, m) => q.x >= cv.x - m && q.x <= cv.x + cv.w + m && q.y >= cv.y - m && q.y <= cv.y + cv.h + m;
    const out = [];
    // coordinate-agnostic: a pure pan moves every point by the same vector (where the old centre went), a pure zoom scales every point about the canvas centre
    const steps = [
      ['pan 0.012 deg east, 0.004 south', { center: [HOME.center[0] + 0.012, HOME.center[1] - 0.004], zoom: HOME.zoom }, async () => { const q = (await p.evaluate((c) => window.__wg.mainProject([c]), HOME.center))[0]; return (m) => ({ x: m.x + (q.x - cc.x), y: m.y + (q.y - cc.y) }); }],
      ['zoom in by 1', { center: HOME.center, zoom: HOME.zoom + 1 }, async () => (m) => ({ x: cc.x + (m.x - cc.x) * 2, y: cc.y + (m.y - cc.y) * 2 })],
      ['zoom out by 0.7', { center: HOME.center, zoom: HOME.zoom - 0.7 }, async () => { const k = 2 ** -0.7; return (m) => ({ x: cc.x + (m.x - cc.x) * k, y: cc.y + (m.y - cc.y) * k }); }],
    ];
    for (const [name, cam, expect] of steps) {
      await p.evaluate((c) => window.__wg.mainJump(c), cam); await sleep(1000);
      const f = await expect(); const X = await starsNow(p);
      const want = A.onScreen.map((m) => ({ m, e: f(m) })).filter(({ e }) => inside(e, -4));      // expected positions well inside the canvas
      const missing = want.filter(({ e }) => !X.marks.some((k) => Math.hypot(k.x - e.x, k.y - e.y) <= 3));
      out.push(`${name}: ${want.length - missing.length} of ${want.length} markers where the map moved them`);
      assert(want.length > 0, `${name}: nothing to compare (no marker stays in view)`);
      assertEq(missing.length, 0, `${name}: ${missing.length} of ${want.length} markers did not move with the map (first: ${JSON.stringify(missing[0] && { was: missing[0].m, expected: missing[0].e })})`);
    }
    t.note('steps', out);
  } finally { await resetStars(p); }
  assertEq(errsSince(S, e0).map(errText), [], 'errors while panning with the markers on');
});

suite.test('T0-WG-15', 'markers and Walkthrough do not disturb each other: nothing of the markers is drawn over the open Walkthrough, a resize while it is open does not displace them, Back shows the same markers', async (t) => {
  needStars();
  const S = await starSession(); const p = S.page; const e0 = S.collector.firstParty.length;
  if (!(await markersExist(S))) throw new Skip('no monument markers in this tree (see T0-WG-13)');
  await resetStars(p); await monBtn(p).click(); await sleep(1200);
  const a = await starsNow(p); assert(a.onScreen.length >= 1, 'markers on before opening');
  await openWalkthrough(S, 'desktop', { needMap: false }); await sleep(600);
  const lay = await p.evaluate(() => window.__wg.layout()); assertEq(lay.backHit, true, 'with the markers on, the Walkthrough Back button is covered');
  assertEq(lay.chips.filter((c) => c.hit === false).map((c) => c.i), [], 'stop buttons covered while the markers are on');
  const during = await starsNow(p); const cov = await p.evaluate((pts) => window.__wg.coveredByRoot(pts), during.marks);
  t.note('markers drawn / of those under the Walkthrough, how many it covers', [during.count, cov.length, cov.filter(Boolean).length]);
  assertEq(cov.filter((x) => !x).length, 0, 'a marker is drawn over the open Walkthrough');
  // resize while open: legacy's overlay measures document.querySelector('.mapboxgl-map'), which is the Walkthrough map while it is open
  await emulateViewport(p, { width: 1300, height: 860, dpr: 1, mobile: false }); await sleep(900);
  await emulateViewport(p, VP.desktop); await sleep(900);
  await backToMap(S); await sleep(1000);
  const b = await starsNow(p);
  t.note('markers on screen before / after', [a.onScreen.length, b.onScreen.length]);
  const lost = a.onScreen.filter((k) => !b.onScreen.some((q) => Math.hypot(q.x - k.x, q.y - k.y) <= 2));
  const moved = lost.map((k) => `${k.title || 'marker'} at ${k.x},${k.y}`);
  if ((moved.length || b.onScreen.length !== a.onScreen.length) && IS_LEGACY) { t.note('legacy latent defect (the restored version must not have it)', moved.slice(0, 8)); throw new Skip(`legacy/dist: after a resize with the Walkthrough open the stars are displaced (${moved.slice(0, 2).join('; ')}): renderMarkers() measures the first .mapboxgl-map, which is the Walkthrough map while it is open`); }
  assertEq(b.onScreen.length, a.onScreen.length, 'markers on screen after Back'); assertEq(moved, [], 'markers displaced after a resize with the Walkthrough open');
  await resetStars(p);
  assertEq(errsSince(S, e0).map(errText), [], 'errors in the markers + Walkthrough test');
});

suite.test('T0-WG-X', 'every browser test of this run: 0 uncaught exceptions and 0 first-party console.error (third-party Google noise excepted); tile budget', async (t) => {
  const S = F.D; if (!S) throw new Skip('no shared session in this run');
  const e = S.collector.firstParty.filter((x) => !isGoogleNoise(x)); t.note('shared desktop session: tile requests', S.tileStats.seen); t.note('animated map boot tile requests', F.bootTiles);
  assertEq(e.map(errText), [], 'first-party errors in the shared desktop session');
  t.note('mapbox requests used this run', `${tileBudget.used} of ${tileBudget.cap}`);
});

// ------------------------------------------------------------------ run
await startServer();
const outFile = String(opt('out', path.join(resultsDir, `test-walkthrough-guard-${LABEL}.json`)));
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ tree: LABEL, dist: path.relative(REPO, DIST), release: VERSION.release || null, groups: GROUPS, capabilities: CAP, server: USE_EMULATOR ? 'emulator (_headers applied)' : 'static', stars: STARS, mapboxBudget: { ...tileBudget } }) });
  console.log(`tree ${LABEL}${VERSION.release ? ` (release ${VERSION.release})` : ''}: mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  if (srv) await srv.close();
}
process.exit(summary.failed ? 1 : 0);
