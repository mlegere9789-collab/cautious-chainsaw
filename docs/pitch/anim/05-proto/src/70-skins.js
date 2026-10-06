// ---------------------------------------------------------------- 70-skins: skin plug-ins.  A skin is  { pad, geom(t), key(t), draw(g, k, t, ax, ay, geo) }  and is drawn ONCE per visual state into the atlas.
//   geom(t)   -> { w, h, cx, cy }  footprint of the whole tile (body + label) in CSS px; (cx, cy) = footprint centre relative to the tile's anchor (the true position)
//   key(t)    -> a number that changes whenever the picture changes (cheap integer arithmetic, no strings)
//   draw      draws the tile with its anchor at (ax, ay) inside a cell of size (w + 2 pad) x (h + 2 pad); g is scaled to CSS px, k is the device pixel ratio (for shadow sizes)
// t (the tile accessor the renderer fills per tile): i id side type(0 inf,1 cav,2 art) disp str(visual) doc(documented strength) maxS bear zoom phone sel eng flash mod name oobName
var PI = Math.PI, DARK = ["#1a3a7a", "#7a1a1a"], MAIN = ["#3a6bc4", "#c43a3a"], LIGHT = ["#8fb4f0", "#f0a39a"], FLASH = ["#88ccff", "#ff9944"], LBL = ["#aaccff", "#ffbbaa"];
var POST = { "Charging Line": "#ff4422", "Skirmish Line": "#66aaff", "Chaotic Retreat": "#ff8800", "Line of March": "#aaaaaa", Reserve: "#226622", Bivouac: "#555555", "Deployed Artillery": "#f5c518", "Limbered Artillery": "#c8a84a", "Mounted Cavalry": "#44aa44", "Dismounted Cavalry": "#88cc88" };
var POSTI = Object.keys(POST);
function clampn(a, b, v) { return Math.max(a, Math.min(b, v)); }
function cxName(id) { var x = String(id || "").replace(/^[UC]-/, ""), m = x.match(/^(\d+)([A-Z]{2,})$/); return m ? m[1] + " " + m[2] : x.indexOf("-") >= 0 ? x.replace(/-/g, "/").slice(0, 10) : x.slice(0, 8); }
G.cxName = cxName;
function zoomBucket(z) { return z >= 16.5 ? 4 : z >= 15 ? 3 : z >= 14 ? 2 : z >= 12 ? 1 : 0; }

// ---- classic: the shipped look (strength-wide bar rotated by bearing, posture dot, label pill), same sizes and label rules as the legacy routine lS
function classicLabel(t) {                                                                       // legacy Y4 with an empty order of battle: designation from the id, strength only at zoom >= 16.5
  var z = t.zoom, base = cxName(t.id);
  if (!t.sel && z < (t.phone ? 14 : 12)) return null;
  return z >= 16.5 ? base + (t.doc ? " " + t.doc : "") : z >= 14 ? base : z >= 12 ? base.slice(0, 6) : null;
}
G.register("skin", "classic", {
  version: "1", label: "Classic (the shipped look)", pad: 14,
  params: { pill: { type: "range", min: 0, max: 1, step: 0.02, def: 0.72, label: "Label pill opacity" }, body: { type: "range", min: 0.3, max: 1, step: 0.02, def: 0.88, label: "Body opacity" } },
  geomOf: function (t) {
    var bw = clampn(10, t.phone ? 60 : 120, Math.round((t.doc || 200) / (t.phone ? 6 : 4))), bh = t.type === 1 ? 4 : 8, th = (t.bear - 90) * PI / 180, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    var rw = bw * c + bh * s + 4, rh = bw * s + bh * c + 6, txt = classicLabel(t), fs = t.sel || t.zoom >= 16 ? 10 : t.zoom >= 14 ? 9 : 8, font = "bold " + fs + "px sans-serif";
    var l = -rw / 2, r = rw / 2, tp = -rh / 2, bt = rh / 2, pw = 0, ph = 0;
    if (txt) { pw = G.measure(font, txt) + 6; ph = fs + 4; l = Math.min(l, -pw / 2); r = Math.max(r, pw / 2); tp = Math.min(tp, -13 - ph / 2); }
    return { bw: bw, bh: bh, txt: txt, font: font, fs: fs, pw: pw, ph: ph, w: r - l, h: bt - tp, cx: (l + r) / 2, cy: (tp + bt) / 2 };
  },
  size: function (t) { var g = this.geomOf(t); return { w: g.w, h: g.h, cx: g.cx, cy: g.cy, geo: g }; },
  glowBox: function (t, sz) { var bw = sz.geo.bw, bh = sz.geo.bh, th = (t.bear - 90) * PI / 180, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)); return { w: bw * c + bh * s + 2, h: bw * s + bh * c + 2, cx: 0, cy: 0 }; },   // the glow follows the body, not the label
  key: function (t) {
    var pi = POSTI.indexOf(t.disp) + 1, b = Math.round(t.bear / 10) % 36;
    return ((((((t.doc * 8 + zoomBucket(t.zoom)) * 36 + b) * 2 + (t.sel ? 1 : 0)) * 2 + (t.flash ? 1 : 0)) * 16 + pi) * 3 + t.type) * 2 + t.side + (t.phone ? 0.5 : 0);   // t.doc is always a number (the renderer fills 0 for a missing strength)
  },
  draw: function (g, k, t, ax, ay, geo) {
    var side = t.side, art = t.type === 2 || t.disp === "Deployed Artillery" || t.disp === "Limbered Artillery", skm = t.disp === "Skirmish Line", col = t.flash ? FLASH[side] : MAIN[side];
    g.translate(ax, ay);
    g.save(); g.rotate(((Math.round(t.bear / 10) * 10) - 90) * PI / 180);
    if (t.sel) { g.shadowColor = "#e8d5a3"; g.shadowBlur = 14 * k; }
    if (art) { g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(-geo.bw / 2, -geo.bh / 2 - 1, geo.bw, geo.bh + 2); g.beginPath(); g.moveTo(-geo.bw / 4, 0); g.lineTo(geo.bw / 4, 0); g.stroke(); }
    else if (skm) { g.setLineDash([4, 3]); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(-geo.bw / 2, 0); g.lineTo(geo.bw / 2, 0); g.stroke(); g.setLineDash([]); }
    else { g.globalAlpha = t.sel ? 1 : G.P("skin", "classic", "body"); g.fillStyle = col; g.fillRect(-geo.bw / 2, -geo.bh / 2, geo.bw, geo.bh); g.strokeStyle = DARK[side]; g.lineWidth = 1; g.strokeRect(-geo.bw / 2, -geo.bh / 2, geo.bw, geo.bh); }
    g.restore();
    g.beginPath(); g.arc(0, -7, 3.5, 0, 2 * PI); g.fillStyle = POST[t.disp] || MAIN[side]; g.fill(); g.strokeStyle = "rgba(0,0,0,0.8)"; g.lineWidth = 1; g.stroke();
    if (geo.txt) {
      g.font = geo.font; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "rgba(0,0,0," + G.P("skin", "classic", "pill") + ")"; g.fillRect(-geo.pw / 2, -13 - geo.ph / 2, geo.pw, geo.ph);
      g.fillStyle = LBL[side]; g.fillText(geo.txt, 0, -13);
    }
  }
});

// ---- rich: the tile used in the renderer benchmark (shadow, badge glyph, designation from the order of battle, strength bar, posture dot, facing chevron)
var RT = [{ w: 46, h: 20 }, { w: 62, h: 22 }, { w: 78, h: 24 }];
function richText(t) { return t.oobName || cxName(t.id); }
G.register("skin", "rich", {
  version: "1", label: "Rich (shadow, badge, bar, chevron)", pad: 14,
  params: { shadow: { type: "range", min: 0, max: 1, step: 0.05, def: 0.55, label: "Shadow strength" }, radius: { type: "range", min: 0, max: 10, step: 1, def: 4, label: "Corner radius (px)" } },
  size: function (t) { var T = RT[t.doc < 600 ? 0 : t.doc < 1500 ? 1 : 2]; return { w: T.w, h: T.h + 6, cx: 0, cy: 3, geo: T }; },
  key: function (t) {
    var tier = t.doc < 600 ? 0 : t.doc < 1500 ? 1 : 2, fb = Math.min(20, Math.round(t.str / t.maxS * 20)), pi = POSTI.indexOf(t.disp) + 1;
    return ((((((tier * 21 + fb) * 12 + pi) * 16 + (Math.round(t.bear / 22.5) & 15)) * 2 + (t.sel ? 1 : 0)) * 2 + (t.flash ? 1 : 0)) * 3 + t.type) * 2 + t.side;
  },
  draw: function (g, k, t, ax, ay, T) {
    var side = t.side, w = T.w, h = T.h, x = ax - w / 2, y = ay - h / 2, r = G.P("skin", "rich", "radius"), sh = G.P("skin", "rich", "shadow"), txt = richText(t), fb = Math.min(20, Math.round(t.str / t.maxS * 20)) / 20;
    g.save(); g.shadowColor = "rgba(0,0,0," + sh + ")"; g.shadowBlur = 5 * k; g.shadowOffsetY = 2 * k;
    var gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, t.flash ? "#ffffff" : LIGHT[side]); gr.addColorStop(0.18, t.flash ? FLASH[side] : MAIN[side]); gr.addColorStop(1, DARK[side]);
    g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.lineWidth = t.sel ? 2 : 1.25; g.strokeStyle = t.sel ? "#e8d5a3" : DARK[side]; g.stroke();
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.roundRect(x, y, 18, h, [r, 0, 0, r]); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath();
    if (t.type === 0) { g.moveTo(x + 4, y + 5); g.lineTo(x + 14, y + h - 5); g.moveTo(x + 14, y + 5); g.lineTo(x + 4, y + h - 5); } else if (t.type === 1) { g.moveTo(x + 4, y + h - 5); g.lineTo(x + 14, y + 5); } else { g.arc(x + 9, y + h / 2, 3.2, 0, 2 * PI); g.fillStyle = "#fff"; g.fill(); }
    g.stroke();
    g.font = "bold 10px system-ui, \"Segoe UI\", Arial, sans-serif"; g.textBaseline = "middle"; g.textAlign = "left"; g.lineJoin = "round"; g.lineWidth = 2.5; g.strokeStyle = "rgba(0,0,0,.6)"; g.strokeText(txt, x + 22, y + h / 2 + 0.5, w - 26); g.fillStyle = "#fff"; g.fillText(txt, x + 22, y + h / 2 + 0.5, w - 26);
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(x, y + h + 3, w, 3); g.fillStyle = LIGHT[side]; g.fillRect(x, y + h + 3, Math.max(1, w * fb), 3);
    g.fillStyle = POST[t.disp] || "#9aa0aa"; g.beginPath(); g.arc(x + w - 5, y + 5, 2.6, 0, 2 * PI); g.fill(); g.strokeStyle = "rgba(0,0,0,.8)"; g.lineWidth = 1; g.stroke();
    g.restore();
    var a = Math.round(t.bear / 22.5) * 22.5 * PI / 180, dx = Math.sin(a), dy = -Math.cos(a), tt = Math.min((w / 2 + 4) / Math.max(Math.abs(dx), 1e-6), (h / 2 + 4) / Math.max(Math.abs(dy), 1e-6));
    g.save(); g.translate(ax + dx * tt, ay + dy * tt); g.rotate(a); g.fillStyle = LIGHT[side]; g.strokeStyle = "rgba(0,0,0,.85)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -5); g.lineTo(4.5, 3); g.lineTo(0, 1); g.lineTo(-4.5, 3); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
});
