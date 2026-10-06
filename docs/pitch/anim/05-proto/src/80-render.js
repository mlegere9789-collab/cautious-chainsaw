// ---------------------------------------------------------------- 80-render: the frame pipeline (clock -> sample -> filter/project -> layout -> draw -> hit grid) on a DPR-aware Canvas2D atlas renderer.
// Drawing happens in the map's own 'render' event (same frame, same camera as the base map: no one-frame lag) and, while paused, synchronously from the host's repaint calls.
var S = {
  state: void 0, sw: null, tl: null, tlU: null, pbt: null, c: null, g: null, map: null, hooked: new WeakSet(), dirtyDraw: true, lastSig: "", atlas: null, atlasKey: "", oob: null,
  sel: null, pin: null, filt: null, X: null, Y: null, DX: null, DY: null, TX: null, TY: null, LX: null, LY: null, W: null, H: null, CX: null, CY: null, TK: null, TE: null, TG: null,
  idx: null, nIdx: 0, apMap: new Map(), first: true, hit: { n: 0, id: new Int32Array(0), x0: new Float32Array(0), y0: new Float32Array(0), x1: new Float32Array(0), y1: new Float32Array(0) }, own: true, lastDraw: 0, cssW: 0, cssH: 0, dpr: 1, glowCache: null
};
var TRAIL = { lng: 0, lat: 0 }, T_ACC = {};
function mkArrays(n) {
  S.X = new Float64Array(n); S.Y = new Float64Array(n); S.DX = new Float32Array(n); S.DY = new Float32Array(n); S.TX = new Float32Array(n); S.TY = new Float32Array(n);
  S.LX = new Float64Array(n); S.LY = new Float64Array(n); S.W = new Float32Array(n); S.H = new Float32Array(n); S.CX = new Float32Array(n); S.CY = new Float32Array(n);
  S.AV = new Float32Array(n); S.ap = new Float64Array(n).fill(NaN); S.TK = new Float64Array(n).fill(-1); S.TE = new Array(n).fill(null); S.TG = new Array(n).fill(null); S.GB = new Array(n).fill(null); S.idx = new Int32Array(n);
  S.hit = { n: 0, id: new Int32Array(n), x0: new Float32Array(n), y0: new Float32Array(n), x1: new Float32Array(n), y1: new Float32Array(n), ax: new Float32Array(n), ay: new Float32Array(n), tx: new Float32Array(n), ty: new Float32Array(n) };
}
function ensureTimeline(pbt) {
  if (S.pbt === pbt && S.tl) return S.tl;
  S.pbt = pbt; S.tl = new Timeline(pbt); mkArrays(S.tl.n); S.tlU = null; S.dirtyDraw = true;
  for (var q = 0; q < S.tl.n; q++) { var v = S.apMap.get(S.tl.ids[q]); if (v !== void 0) S.ap[q] = v; }          // appear times survive a rebuild (a day of data loading must not make every tile enter again)
  return S.tl;
}
function mercProjectOk(map) {                                                       // self-check of the own Web-Mercator projection against the map's (3 points, 0.5 px)
  try {
    var ctr = map.getCenter(), z = map.getZoom(), W = map.getContainer().clientWidth, H = map.getContainer().clientHeight, ws = 512 * Math.pow(2, z), ok = true, pts = [[ctr.lng, ctr.lat], [ctr.lng + 0.01, ctr.lat + 0.004], [ctr.lng - 0.012, ctr.lat - 0.006]];
    for (var i = 0; i < pts.length; i++) { var p = map.project(pts[i]), x = (mercX(pts[i][0]) - mercX(ctr.lng)) * ws + W / 2, y = (mercY(pts[i][1]) - mercY(ctr.lat)) * ws + H / 2; if (Math.abs(p.x - x) > 0.5 || Math.abs(p.y - y) > 0.5) ok = false; }
    return ok;
  } catch (e) { return false; }
}
function camSig(map) { var c = map.getCenter(); return c.lng + "," + c.lat + "," + map.getZoom() + "," + map.getBearing() + "," + map.getPitch() + "," + map.getContainer().clientWidth + "x" + map.getContainer().clientHeight + "," + (window.devicePixelRatio || 1); }

function attach(c, map) {
  S.c = c; if (S.map !== map) { S.map = map; S.own = mercProjectOk(map); S.g = null; S.lastSig = ""; }
  if (!S.hooked.has(map)) { S.hooked.add(map); map.on("render", onRender); }
}
function onRender() {
  if (S.state !== 1 || !S.map) return;
  try {
    var now = G.now(), cs = G.clock.state, need = S.dirtyDraw || (now - cs.lastPlay < 150) || !!cs.g || G.dirtyFlag;
    if (!need && camSig(S.map) === S.lastSig) return;
    draw("render");
  } catch (e) { fail(e); }
}
function fail(e) { if (G.strict) throw e; S.state = 0; try { console.warn("GTANIM disabled after an error, the shipped renderer takes over:", e); } catch (x) { } }

function ensureAtlas(dpr) {
  var key = G.T.skin + "@" + G.cur("skin").version + "|" + dpr + "|" + (S.oob ? 1 : 0);
  if (S.atlas && S.atlasKey === key && !G.dirtyFlag) return;
  S.atlas = new Atlas(dpr, 2048, 8); S.atlasKey = key; S.glowCache = new Map(); if (S.TK) { S.TK.fill(-1); } G.dirtyFlag = 0;
}
function glowSprite(w, h, k) {
  var key = Math.round(w) * 4096 + Math.round(h), e = S.glowCache.get(key);
  if (!e) {
    var pw = Math.round(w) + 24, ph = Math.round(h) + 24;
    e = S.atlas.get(-key - 1, pw, ph, function (g, kk) { g.shadowColor = "#ffffff"; g.shadowBlur = 9 * kk; g.shadowOffsetX = 5000 * kk; g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(12 - 5000, 12, Math.round(w), Math.round(h), 4); g.fill(); });
    e.pw = pw; e.ph = ph; S.glowCache.set(key, e);
  }
  return e;
}

var TA = { i: 0, id: "", side: 0, type: 0, disp: "", str: 0, doc: 0, maxS: 1, bear: 0, zoom: 0, phone: false, sel: false, eng: false, flash: false, mod: false, name: "", oobName: "" };

function draw(reason) {
  if (window.__gtanimFault) throw new Error("GTANIM injected fault");                  // test hook: proves the fallback to the shipped renderer
  var t0 = performance.now(), now = G.now(), c = S.c, map = S.map, h = G.host, tl = S.tl, tk = G.T, ms = G.m.ms;
  if (!c || !map || !tl || !tl.n) return false;
  if (c.style.display === "none") return false;
  var cont = map.getContainer(), W = cont.clientWidth, H = cont.clientHeight; if (!W || !H) return false;
  var dpr = Math.min(window.devicePixelRatio || 1, tk.dprCap || 2), reduced = h.reduced();
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); S.g = null; }
  if (c.style.width !== W + "px" || c.style.height !== H + "px") { c.style.width = W + "px"; c.style.height = H + "px"; }
  if (!S.g) S.g = c.getContext("2d");
  var g = S.g, store = h.store.getState(), oob = store.oobData || null;
  if (oob !== S.oob) { S.oob = oob; G.dirtyFlag = 1; }
  var skin = G.cur("skin"), motion = G.cur("motion"), layout = G.cur("layout");
  S.dpr = dpr; ensureAtlas(dpr); S.cssW = W; S.cssH = H;
  var atlas = S.atlas, pad = skin.pad;

  // 1 clock + 2 sample
  var anim = G.clock.step(now), cs = G.clock.state, T = cs.Td; if (T !== T) return false; if (reduced) T = Math.floor(T);
  var ta = performance.now(); tl.stateAt(T, motion, 0);
  ms.sample = performance.now() - ta;
  // lifecycle: a tile that becomes alive after the first frame enters with a short WALL-CLOCK fade (a unit paused on its first documented tick still ends fully visible); the very first frame, reduced motion and entranceMs 0 show it at once
  var ent = tk.entranceMs == null ? 350 : tk.entranceMs, animEnt = false, ii, uu;
  for (ii = 0; ii < tl.n; ii++) {
    if (tl.alpha[ii] === 0) { if (S.ap[ii] === S.ap[ii]) { S.ap[ii] = NaN; S.apMap.delete(tl.ids[ii]); } S.AV[ii] = 0; continue; }
    if (S.ap[ii] !== S.ap[ii]) { S.ap[ii] = (S.first || reduced || ent <= 0) ? -1e9 : now; S.apMap.set(tl.ids[ii], S.ap[ii]); }
    uu = (now - S.ap[ii]) / ent; if (uu >= 1) S.AV[ii] = 1; else { S.AV[ii] = G.ease.smooth(uu < 0 ? 0 : uu); animEnt = true; }
  }
  if (tl.nAlive > 0) S.first = false;

  // 3 filter + project
  var tp = performance.now(), zoom = map.getZoom(), ctr = map.getCenter(), own = S.own && map.getBearing() === 0 && map.getPitch() === 0, ws = 512 * Math.pow(2, zoom), cmx = mercX(ctr.lng), cmy = mercY(ctr.lat), phone = W < 500;
  var f = S.filt || {}, sides = f.sides || ["Union", "Confederate"], disps = f.dispositions, minS = f.minStrength || 0, n = 0, j, i, k, rec, x, y, side, X = S.X, Y = S.Y;
  var fxc = tk.fx.contact !== false ? G.get("fx", "contact") : null, fxf = tk.fx.flash !== false ? G.get("fx", "flash") : null, fxs = [];
  Object.keys(G.mods.fx).forEach(function (k) { var m = G.mods.fx[k]; if (tk.fx[k] !== false && m.prepare) { m.prepare(S, now); if (m.glow) fxs.push(m); } });   // every enabled effect, built in or added later
  var selId = S.sel, pinId = S.pin;
  for (j = 0; j < tl.nAlive; j++) {
    i = tl.alive[j]; k = tl.gov[i]; rec = tl.rec[k]; side = tl.side[i];
    if (sides.indexOf(side === 0 ? "Union" : "Confederate") < 0) continue;
    if (disps && disps.indexOf(rec.disposition) < 0) continue;
    if (rec.strength != null && rec.strength < minS) continue;
    if (own) { x = (mercX(tl.lng[i]) - cmx) * ws + W / 2; y = (mercY(tl.lat[i]) - cmy) * ws + H / 2; } else { var p = map.project([tl.lng[i], tl.lat[i]]); x = p.x; y = p.y; }
    if (x < -160 || x > W + 160 || y < -80 || y > H + 80) continue;
    X[i] = x; Y[i] = y; S.idx[n++] = i;
  }
  ms.project = performance.now() - tp;

  // 4 skin state -> sprite (only when the visual state changed) + footprint
  var tz = performance.now(), t = TA, misses = 0, sz, id, a;
  t.zoom = zoom; t.phone = phone;
  for (j = 0; j < n; j++) {
    i = S.idx[j]; k = tl.gov[i]; rec = tl.rec[k]; id = tl.ids[i];
    t.i = i; t.id = id; t.side = tl.side[i]; t.disp = rec.disposition || ""; t.doc = rec.strength || 0; t.str = tl.str[i]; t.maxS = tl.maxS[i]; t.bear = tl.bear[i];
    t.type = (t.disp === "Deployed Artillery" || t.disp === "Limbered Artillery" || id.indexOf("ART") >= 0) ? 2 : (t.disp === "Mounted Cavalry" || t.disp === "Dismounted Cavalry" || id.indexOf("CAV") >= 0) ? 1 : 0;
    t.sel = id === selId || id === pinId; t.flash = !!(fxf && fxf.isOn(id, now)); t.mod = !!tl.modelled[i]; t.eng = !!(fxc && fxc.isOn(i));
    a = oob && oob[id]; t.oobName = a ? (a.designation || a.name || "") : "";
    var kk = skin.key(t);
    if (S.TK[i] !== kk || !S.TE[i]) {
      sz = skin.size(t); S.W[i] = sz.w; S.H[i] = sz.h; S.CX[i] = sz.cx; S.CY[i] = sz.cy; S.TG[i] = sz.geo; S.GB[i] = skin.glowBox ? skin.glowBox(t, sz) : sz; S.TK[i] = kk; misses++;
      (function (tt, szz) { var ax = pad + szz.w / 2 - szz.cx, ay = pad + szz.h / 2 - szz.cy, snap = { i: tt.i, id: tt.id, side: tt.side, type: tt.type, disp: tt.disp, str: tt.str, doc: tt.doc, maxS: tt.maxS, bear: tt.bear, zoom: tt.zoom, phone: tt.phone, sel: tt.sel, eng: tt.eng, flash: tt.flash, mod: tt.mod, name: tt.name, oobName: tt.oobName };
        S.TE[tt.i] = atlas.get(tt.i * 1099511627776 + kk, szz.w + 2 * pad, szz.h + 2 * pad, function (gg, kd) { skin.draw(gg, kd, snap, ax, ay, szz.geo); }); })(t, sz);
    }
    S.LX[i] = X[i] + S.CX[i]; S.LY[i] = Y[i] + S.CY[i];
  }
  G.m.misses = misses; ms.skin = performance.now() - tz;

  // 5 layout
  var tq = performance.now(), L = S.L || (S.L = {});
  L.idx = S.idx.subarray(0, n); L.X = S.LX; L.Y = S.LY; L.W = S.W; L.H = S.H; L.DX = S.DX; L.DY = S.DY; L.TX = S.TX; L.TY = S.TY; L.zoom = zoom;
  var dt = S.lastDraw ? now - S.lastDraw : 16; S.lastDraw = now; layout.solve(L, dt);
  ms.layout = performance.now() - tq;

  // 6 draw
  var td = performance.now(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  var fade = cs.fade, hit = S.hit, nh = 0, dx, dy, e, w, hh;
  if (tk.fx.trails && h.trails && h.trails() && !reduced) drawTrails(g, tl, motion, T, n);
  g.lineWidth = 0.5;
  for (j = 0; j < n; j++) {                                                         // leader lines of displaced tiles
    i = S.idx[j]; dx = S.DX[i]; dy = S.DY[i];
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) continue;
    g.strokeStyle = tl.side[i] === 0 ? "rgba(80,120,200,0.45)" : "rgba(180,80,60,0.45)"; g.beginPath(); g.moveTo(X[i], Y[i]); g.lineTo(X[i] + dx, Y[i] + dy); g.stroke();
  }
  if (fxs.length) {                                                                 // under-glow of every tile an enabled effect asks for (max of their alphas)
    for (j = 0; j < n; j++) {
      i = S.idx[j]; a = 0; for (var q = 0; q < fxs.length; q++) a = Math.max(a, fxs[q].glow(i)); if (a <= 0) continue; var gb = S.GB[i]; if (!gb) continue; e = glowSprite(gb.w, gb.h, dpr);
      g.globalAlpha = a * S.AV[i] * fade; g.drawImage(e.c, e.sx, e.sy, e.sw, e.sh, X[i] + S.DX[i] + (gb.cx || 0) - e.pw / 2, Y[i] + S.DY[i] + (gb.cy || 0) - e.ph / 2, e.pw, e.ph);
    }
    g.globalAlpha = 1;
  }
  for (var pass = 0; pass < 2; pass++) {                                            // selected / pinned tiles last
    for (j = 0; j < n; j++) {
      i = S.idx[j]; id = tl.ids[i]; var isSel = id === selId || id === pinId; if ((pass === 1) !== isSel) continue;
      e = S.TE[i]; if (!e) continue; a = S.AV[i] * fade; if (a <= 0.01) continue;
      var ax = pad + S.W[i] / 2 - S.CX[i], ay = pad + S.H[i] / 2 - S.CY[i], px = X[i] + S.DX[i] - ax, py = Y[i] + S.DY[i] - ay;
      if (a < 1) g.globalAlpha = a;
      g.drawImage(e.c, e.sx, e.sy, e.sw, e.sh, px, py, e.w, e.h);
      if (a < 1) g.globalAlpha = 1;
      hit.id[nh] = i; hit.ax[nh] = X[i] + S.DX[i]; hit.ay[nh] = Y[i] + S.DY[i]; hit.tx[nh] = X[i]; hit.ty[nh] = Y[i]; hit.x0[nh] = X[i] + S.DX[i] + S.CX[i] - S.W[i] / 2; hit.y0[nh] = Y[i] + S.DY[i] + S.CY[i] - S.H[i] / 2; hit.x1[nh] = hit.x0[nh] + S.W[i]; hit.y1[nh] = hit.y0[nh] + S.H[i]; nh++;
    }
  }
  hit.n = nh; ms.draw = performance.now() - td;

  S.dirtyDraw = false; S.lastSig = camSig(map);
  var tot = performance.now() - t0; ms.total = tot; var m = G.m; m.frames++; m.nTiles = n;
  if (m.last) { var iv = now - m.last; m.ft.push(iv); if (m.ft.length > 240) m.ft.shift(); if (iv > 33.4) m.drops++; } m.last = now;
  if (anim || animEnt || (now - cs.lastPlay < 150)) map.triggerRepaint();                      // keep the map rendering while time moves; idle = no frames at all
  return true;
}
function drawTrails(g, tl, motion, T, n) {
  var j, i, kk, steps = 6, step = 1, px, py, ctr = S.map.getCenter(), ws = 512 * Math.pow(2, S.map.getZoom()), cmx = mercX(ctr.lng), cmy = mercY(ctr.lat), W = S.cssW, H = S.cssH, own = S.own && S.map.getBearing() === 0 && S.map.getPitch() === 0;
  g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
  for (j = 0; j < n; j++) {
    i = S.idx[j]; if (!tl.modelled[i] || S.AV[i] < 1) continue;
    g.strokeStyle = tl.side[i] === 0 ? "rgba(58,107,196,0.4)" : "rgba(196,58,58,0.4)"; g.beginPath(); g.moveTo(S.X[i], S.Y[i]);
    for (kk = 1; kk <= steps; kk++) {
      tl.posAt(i, T - kk * step, motion, TRAIL);
      if (own) { px = (mercX(TRAIL.lng) - cmx) * ws + W / 2; py = (mercY(TRAIL.lat) - cmy) * ws + H / 2; } else { var p = S.map.project([TRAIL.lng, TRAIL.lat]); px = p.x; py = p.y; }
      g.lineTo(px, py);
    }
    g.stroke();
  }
}

// ---- picking: the tile whose drawn rectangle contains the point (topmost first), else the nearest tile centre within reach; null id = empty ground (the host deselects)
function pickAt(clientX, clientY) {
  var c = S.c, hit = S.hit, tl = S.tl, i, best = -1, bd = 1e9, reach = G.T.pick.mouse;
  if (!c || !tl || !hit.n || S.state !== 1) return false;
  try { if (window.matchMedia("(pointer: coarse)").matches || S.cssW < 500) reach = G.T.pick.touch; } catch (e) { }
  var r = c.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
  for (i = 0; i < hit.n; i++) {                                                   // candidates: the pointer is inside the tile's rectangle or within reach of its drawn or true position; the nearest wins, a tie goes to the tile drawn on top
    var inside = x >= hit.x0[i] && x <= hit.x1[i] && y >= hit.y0[i] && y <= hit.y1[i], d = Math.min(Math.hypot(hit.ax[i] - x, hit.ay[i] - y), Math.hypot(hit.tx[i] - x, hit.ty[i] - y));   // a click on the drawn tile OR on the unit's true position (the end of its leader line) selects it
    if ((inside || d < reach) && d <= bd) { bd = d; best = i; }
  }
  if (best < 0) return { id: null, rec: null };
  var u = hit.id[best], k = tl.gov[u], rec = Object.assign({}, tl.rec[k]); rec.lng = tl.lng[u]; rec.lat = tl.lat[u]; rec.bearing = tl.bear[u];
  return { id: tl.ids[u], rec: rec };
}
// the drawn scene as data (tests, the Studio, evidence checks): one row per drawn tile
G.describe = function () {
  var tl = S.tl, hit = S.hit, out = [], i, u;
  for (i = 0; i < hit.n; i++) { u = hit.id[i]; out.push({ id: tl.ids[u], x0: hit.x0[i], y0: hit.y0[i], x1: hit.x1[i], y1: hit.y1[i], modelled: !!tl.modelled[u], doc: tl.rec[tl.gov[u]].strength }); }
  return out;
};
G.overlaps = function () {                                                          // count of overlapping tile pairs in the last frame (the invariant the owner asks for: 0)
  var hit = S.hit, c = 0, a, b;
  for (a = 0; a < hit.n; a++) for (b = a + 1; b < hit.n; b++) if (hit.x0[a] < hit.x1[b] - 0.5 && hit.x1[a] > hit.x0[b] + 0.5 && hit.y0[a] < hit.y1[b] - 0.5 && hit.y1[a] > hit.y0[b] + 0.5) c++;
  return c;
};
