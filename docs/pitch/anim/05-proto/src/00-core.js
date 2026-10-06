// GTANIM prototype engine (docs/pitch/anim/05-architecture.md).  Plain script, no imports, concatenated by build-anim-proto.mjs into ONE closure that is inserted into the
// entry bundle.  It touches the host only through G.bind({...}) (store, flash map, sound, mapbox) and the few functions the patch hooks call (on, paused, playing, units, pick).
//   00-core      module registry, tuning, metrics, helpers
//   10-timeline  placements -> per-unit keyframes (typed arrays), continuous-time sampling
//   20-motion    motion models (plug-ins): linear, smooth
//   30-clock     continuous clock, jump policy (glide / crossfade)
//   40-layout    layout strategies (plug-ins): none, relax
//   50-fx        effects (plug-ins): contact (engaged glow + sound), flash (casualty), select ring
//   60-atlas     sprite atlas (device-pixel exact)
//   70-skins     skin plug-ins: classic (the legacy look), rich (the benchmark tile)
//   80-render    Canvas2D renderer, frame pipeline, hit grid
//   85-studio    ?tune=1 Tuning Studio
//   90-glue      host entry points
var G = { version: "0.1.0-proto", mods: {}, host: null, T: null, m: { frames: 0, last: 0, ft: [], ms: {}, drops: 0 }, listeners: [] };
var DEFAULTS = {
  enabled: true, skin: "classic", motion: "smooth", layout: "relax", renderer: "canvas2d",
  dprCap: 2, jumpTicks: 4, jumpMs: 650, crossfadeTicks: 40,
  pick: { mouse: 16, touch: 44 },                                 // px reach around a tile centre when the pointer is not inside a tile (the shipped picker takes the nearest unit within ~0.003 deg)
  fx: { trails: true },                                           // an effect module registers its own switch (default on); trails are built into the renderer
  params: {}
};
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function merge(a, b) { for (var k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { a[k] = merge(a[k] && typeof a[k] === "object" ? a[k] : {}, b[k]); } else a[k] = b[k]; } return a; }
G.T = clone(DEFAULTS);

// ---- module registry: G.register(kind, name, module); kinds: motion, layout, fx, skin, renderer
G.register = function (kind, name, mod) {
  mod.kind = kind; mod.name = name; mod.version = mod.version || "1";
  (G.mods[kind] || (G.mods[kind] = {}))[name] = mod;
  if (kind === "fx" && !(name in G.T.fx)) G.T.fx[name] = mod.enabledByDefault !== false;
  var p = mod.params || {}, key = kind + "." + name;
  for (var k in p) { G.T.params[key] = G.T.params[key] || {}; if (!(k in G.T.params[key])) G.T.params[key][k] = p[k].def; }
  return mod;
};
G.get = function (kind, name) { var m = G.mods[kind] && G.mods[kind][name]; if (!m) throw new Error("GTANIM: no " + kind + " module \"" + name + "\""); return m; };
G.cur = function (kind) { return G.get(kind, G.T[kind]); };
// tuned value of a module parameter (falls back to the declared default)
G.P = function (kind, name, k) { var o = G.T.params[kind + "." + name]; return o && k in o ? o[k] : G.mods[kind][name].params[k].def; };
G.tune = function (path, v) {                                   // G.tune("motion", "linear") | G.tune("params.motion.smooth.tension", 0.4)
  var a = path.split("."), o = G.T, i;
  if (a[0] === "params" && a.length === 4) a = ["params", a[1] + "." + a[2], a[3]];     // params are keyed "<kind>.<name>"
  for (i = 0; i < a.length - 1; i++) { if (!(a[i] in o)) o[a[i]] = {}; o = o[a[i]]; }
  o[a[a.length - 1]] = v; G.dirty("tune"); G.listeners.forEach(function (f) { try { f(path, v); } catch (e) { } });
};
G.setTuning = function (obj) { merge(G.T, obj); G.dirty("tune"); };
G.exportTuning = function () { var t = clone(G.T); t.$schema = "gtanim.tuning/1"; t.engine = G.version; return t; };
// JSON-schema-like description generated from the registry: the Studio and the tuning-file test both read it
G.schema = function () {
  var s = { $id: "gtanim.tuning/1", engine: G.version, kinds: {} };
  Object.keys(G.mods).forEach(function (kind) { s.kinds[kind] = {}; Object.keys(G.mods[kind]).forEach(function (n) { var m = G.mods[kind][n]; s.kinds[kind][n] = { version: m.version, params: m.params || {} }; }); });
  return s;
};
G.validateTuning = function (t) {
  var errs = [];
  ["skin", "motion", "layout", "renderer"].forEach(function (k) { if (k === "renderer" && !G.mods.renderer) return; if (t[k] != null && !(G.mods[k] && G.mods[k][t[k]])) errs.push(k + ": unknown module " + t[k]); });   // the prototype has one built-in renderer (Canvas2D atlas); the kind exists in the design
  var P = t.params || {};
  Object.keys(P).forEach(function (key) {
    var kn = key.split("."), m = G.mods[kn[0]] && G.mods[kn[0]][kn[1]];
    if (!m) { errs.push("params." + key + ": unknown module"); return; }
    Object.keys(P[key]).forEach(function (k) { var d = m.params && m.params[k]; if (!d) errs.push("params." + key + "." + k + ": unknown parameter"); else if (typeof P[key][k] === "number" && (P[key][k] < d.min || P[key][k] > d.max)) errs.push("params." + key + "." + k + ": " + P[key][k] + " outside " + d.min + ".." + d.max); });
  });
  return errs;
};
G.dirtyFlag = 1;
G.dirty = function () { G.dirtyFlag = 1; if (G.repaint) G.repaint(); };            // a tuning change repaints even when the map is idle

// ---- URL / storage switches: ?anim=legacy (kill switch), ?anim=skin:rich,motion:linear,layout:none  ?tune=1 (Studio)  window.__gtanimStrict (tests: rethrow instead of falling back)
G.readSwitches = function () {
  var q = "", out = { legacy: false, strict: !!window.__gtanimStrict, tune: false };
  try { q = location.search; } catch (e) { }
  var m = /[?&]anim=([^&]*)/.exec(q);
  if (m) m[1].split(",").forEach(function (kv) { var p = kv.split(":"); if (p[0] === "legacy" || p[0] === "off") out.legacy = true; else if (p[0] === "strict") out.strict = true; else if (p[1] && /^(skin|motion|layout|renderer)$/.test(p[0])) G.T[p[0]] = decodeURIComponent(p[1]); });
  out.tune = /[?&]tune=1\b/.test(q);
  try { if (window.localStorage && window.localStorage.getItem("gtanim_off") === "1") out.legacy = true; } catch (e) { }
  return out;
};
// ---- tiny helpers
G.ease = { inOutCubic: function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }, smooth: function (u) { return u * u * (3 - 2 * u); } };
G.now = function () { return window.__gtanimNow ? window.__gtanimNow() : performance.now(); };     // tests inject a fake clock
function mercX(lng) { return (lng + 180) / 360; }
function mercY(lat) { var s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }
G.metersPerDegLat = 111320;
