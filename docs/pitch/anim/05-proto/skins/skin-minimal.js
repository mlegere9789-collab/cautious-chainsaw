// A complete new skin in under 50 lines: "minimal" (a flat rounded tile with a side stripe, the designation and a strength bar).
// It is loaded after the engine; nothing else changes: it shows up in G.schema(), in the Tuning Studio (with its slider) and in ?anim=skin:minimal.
G.register("skin", "minimal", {
  version: "1", label: "Minimal flat tile", pad: 8,
  params: { corner: { type: "range", min: 0, max: 12, step: 1, def: 3, label: "Corner radius (px)" } },
  size: function (t) {                                            // footprint of the whole tile in CSS px, centred on the unit's true position
    var w = t.doc < 600 ? 40 : t.doc < 1500 ? 54 : 68;
    return { w: w, h: 18, cx: 0, cy: 0, geo: { w: w, h: 18 } };
  },
  key: function (t) {                                             // changes whenever the picture changes: tile size class, strength bucket, side, selection, flash
    return (((t.doc < 600 ? 0 : t.doc < 1500 ? 1 : 2) * 21 + Math.round(t.str / t.maxS * 20)) * 2 + t.side) * 4 + (t.sel ? 2 : 0) + (t.flash ? 1 : 0);
  },
  draw: function (g, k, t, ax, ay, geo) {                         // g is scaled to CSS px; the tile's anchor is at (ax, ay)
    var x = ax - geo.w / 2, y = ay - geo.h / 2, c = t.side ? "#c43a3a" : "#3a6bc4", r = G.P("skin", "minimal", "corner");
    g.fillStyle = "rgba(10,12,20,.86)"; g.beginPath(); g.roundRect(x, y, geo.w, geo.h, r); g.fill();
    g.fillStyle = t.flash ? "#ffffff" : c; g.fillRect(x, y, 4, geo.h);
    g.strokeStyle = t.sel ? "#e8d5a3" : c; g.lineWidth = t.sel ? 2 : 1; g.beginPath(); g.roundRect(x, y, geo.w, geo.h, r); g.stroke();
    g.font = "bold 10px sans-serif"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(G.cxName(t.id), x + 8, y + geo.h / 2 - 1, geo.w - 10);
    g.fillStyle = c; g.fillRect(x + 4, y + geo.h - 3, (geo.w - 4) * Math.min(1, t.str / t.maxS), 2);
  }
});
