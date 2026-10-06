// ---------------------------------------------------------------- 85-studio: the hidden Tuning Studio, opened by ?tune=1.  Everything in it is generated from the module registry (G.mods + each module's params):
// a module that declares `params` gets its sliders for free.  Live metrics, skin / motion / layout switches, effect toggles, JSON export of the tuning file, reset, legacy switch.
function studioRow(parent, label) { var r = document.createElement("div"); r.style.cssText = "display:flex;align-items:center;gap:6px;margin:3px 0"; var l = document.createElement("label"); l.textContent = label; l.style.cssText = "flex:0 0 112px;color:#9a9"; r.appendChild(l); parent.appendChild(r); return r; }
function openStudio() {
  if (S.studio || !window.document) return;
  var d = S.studio = document.createElement("div"); d.id = "gtanim-studio"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Animation tuning studio");
  d.style.cssText = "position:fixed;right:12px;bottom:12px;width:300px;max-height:78vh;overflow:auto;z-index:99999;background:rgba(8,8,18,.95);color:#ddd;font:12px/1.4 system-ui,sans-serif;border:1px solid #445;border-radius:8px;padding:10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.6)";
  var head = document.createElement("div"); head.style.cssText = "display:flex;justify-content:space-between;font-weight:bold;color:#e8d5a3;margin-bottom:6px"; head.textContent = "Tuning Studio  engine " + G.version;
  var x = document.createElement("button"); x.textContent = "x"; x.setAttribute("aria-label", "Close tuning studio"); x.style.cssText = "background:none;border:0;color:#ddd;cursor:pointer"; x.onclick = function () { d.remove(); S.studio = null; clearInterval(S.studioTimer); }; head.appendChild(x); d.appendChild(head);
  var met = document.createElement("pre"); met.style.cssText = "margin:0 0 6px;color:#8c8;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap"; d.appendChild(met);
  var body = document.createElement("div"); d.appendChild(body);
  function build() {
    body.textContent = "";
    ["skin", "motion", "layout"].forEach(function (kind) {
      var r = studioRow(body, kind), sel = document.createElement("select"); sel.style.cssText = "flex:1;background:#111;color:#ddd;border:1px solid #445"; sel.setAttribute("aria-label", kind);
      Object.keys(G.mods[kind]).forEach(function (n) { var o = document.createElement("option"); o.value = n; o.textContent = (G.mods[kind][n].label || n) + " v" + G.mods[kind][n].version; if (G.T[kind] === n) o.selected = true; sel.appendChild(o); });
      sel.onchange = function () { G.tune(kind, sel.value); build(); }; r.appendChild(sel);
      var m = G.mods[kind][G.T[kind]], P = m.params || {};
      Object.keys(P).forEach(function (k) {
        var q = P[k], rr = studioRow(body, "  " + (q.label || k)), inp = document.createElement("input"), val = document.createElement("span"); inp.type = "range"; inp.min = q.min; inp.max = q.max; inp.step = q.step; inp.value = G.P(kind, m.name, k); inp.style.flex = "1"; inp.setAttribute("aria-label", q.label || k);
        val.textContent = inp.value; val.style.cssText = "flex:0 0 36px;text-align:right"; inp.oninput = function () { val.textContent = inp.value; G.tune("params." + kind + "." + m.name + "." + k, +inp.value); }; rr.appendChild(inp); rr.appendChild(val);
      });
    });
    Object.keys(G.T.fx).forEach(function (k) { var r = studioRow(body, "fx " + k), cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!G.T.fx[k]; cb.setAttribute("aria-label", "effect " + k); cb.onchange = function () { G.tune("fx." + k, cb.checked); }; r.appendChild(cb); });
    var bar = document.createElement("div"); bar.style.cssText = "display:flex;gap:6px;margin-top:8px";
    function btn(t, f) { var b = document.createElement("button"); b.textContent = t; b.style.cssText = "flex:1;background:#223;color:#ddd;border:1px solid #445;border-radius:4px;padding:4px;cursor:pointer"; b.onclick = f; bar.appendChild(b); }
    btn("Export JSON", function () { var j = JSON.stringify(G.exportTuning(), null, 2); try { navigator.clipboard.writeText(j); } catch (e) { } window.__gtanimExport = j; met.textContent = "exported " + j.length + " bytes (also in window.__gtanimExport)"; });
    btn("Reset", function () { var o = clone(DEFAULTS); G.T.skin = o.skin; G.T.motion = o.motion; G.T.layout = o.layout; G.T.fx = o.fx; Object.keys(G.mods.fx).forEach(function (n) { G.T.fx[n] = G.mods.fx[n].enabledByDefault !== false; }); G.T.params = {}; Object.keys(G.mods).forEach(function (k) { Object.keys(G.mods[k]).forEach(function (n) { var p = G.mods[k][n].params || {}; Object.keys(p).forEach(function (q) { (G.T.params[k + "." + n] = G.T.params[k + "." + n] || {})[q] = p[q].def; }); }); }); G.dirty("reset"); build(); });
    btn("Legacy", function () { try { localStorage.setItem("gtanim_off", "1"); } catch (e) { } location.reload(); });
    body.appendChild(bar);
  }
  build(); document.body.appendChild(d);
  S.studioTimer = setInterval(function () {
    var a = G.m.ft.slice().sort(function (p, q) { return p - q; }), n = a.length, ms = G.m.ms;
    met.textContent = "frames " + G.m.frames + "  tiles " + (G.m.nTiles || 0) + "  drops>33ms " + G.m.drops + "\nframe interval p50 " + (n ? a[n >> 1].toFixed(1) : "-") + "  p95 " + (n ? a[Math.floor(n * 0.95)].toFixed(1) : "-") + " ms\nsample " + (ms.sample || 0).toFixed(2) + "  project " + (ms.project || 0).toFixed(2) + "  skin " + (ms.skin || 0).toFixed(2) + "  layout " + (ms.layout || 0).toFixed(2) + "  draw " + (ms.draw || 0).toFixed(2) + "  total " + (ms.total || 0).toFixed(2) + " ms\natlas " + (S.atlas ? (S.atlas.bytes / 1048576).toFixed(1) : 0) + " MB  flushes " + (G.m.flushes || 0) + "  overlaps " + G.overlaps();
  }, 500);
}
