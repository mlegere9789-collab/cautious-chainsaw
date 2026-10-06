// ---------------------------------------------------------------- 50-fx: effects (plug-ins).  An effect may implement  prepare(S, now)  (once per frame, before drawing),  glow(i)  and  isOn(key, now)
// contact   engaged units: opposing sides within `radius` metres of each other (WORLD distance, so it does not change with zoom) glow with a pulse; sound hook with the host's own throttle
// flash     the host's casualty flash (a unit that lost strength shows the light variant for 1 s)
function pulse(now) { return G.host && G.host.reduced() ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(now / 300)); }
G.register("fx", "contact", {
  version: "1", label: "Contact glow + sound hook",
  params: { radius: { type: "range", min: 20, max: 600, step: 10, def: 150, label: "Contact radius (m)" }, glow: { type: "range", min: 0, max: 1, step: 0.05, def: 0.7, label: "Glow strength" }, hz: { type: "range", min: 1, max: 30, step: 1, def: 10, label: "Recompute rate (Hz)" } },
  prepare: function (S, now) {
    var tl = S.tl, R = G.P("fx", "contact", "radius"), cell = Math.max(R, 50), dLat = G.metersPerDegLat, coslat = Math.cos(39.81 * Math.PI / 180), self = this, m, i, j, key, g, n = 0;
    this.p = pulse(now);
    if (now - (this.last || -1e9) < 1000 / G.P("fx", "contact", "hz") && this.eng && this.eng.length === tl.n) return;
    this.last = now; if (!this.eng || this.eng.length !== tl.n) this.eng = new Uint8Array(tl.n); else this.eng.fill(0);
    m = new Map();
    for (j = 0; j < tl.nAlive; j++) {
      i = tl.alive[j]; if (S.AV[i] < 1) continue;
      var cx = Math.floor(tl.lng[i] * dLat * coslat / cell), cy = Math.floor(tl.lat[i] * dLat / cell);
      key = (cx + 200000) * 400000 + (cy + 200000); g = m.get(key); if (!g) m.set(key, g = { cx: cx, cy: cy, a: [] }); g.a.push(i);
    }
    m.forEach(function (c) {
      for (var u = -1; u <= 1; u++) for (var v = -1; v <= 1; v++) {
        var h = m.get((c.cx + u + 200000) * 400000 + (c.cy + v + 200000)); if (!h) continue;
        for (var p = 0; p < c.a.length; p++) for (var q = 0; q < h.a.length; q++) {
          var A = c.a[p], B = h.a[q]; if (tl.side[A] === tl.side[B]) continue;
          var dx = (tl.lng[A] - tl.lng[B]) * dLat * coslat, dy = (tl.lat[A] - tl.lat[B]) * dLat;
          if (dx * dx + dy * dy <= R * R) { self.eng[A] = 1; self.eng[B] = 1; }
        }
      }
    });
    for (j = 0; j < tl.n; j++) n += this.eng[j];
    this.n = n;
    var h2 = G.host;
    if (n > 0 && h2 && h2.sound && h2.sound.on() && now - (this.snd || -1e9) > 4000) { this.snd = now; try { h2.sound.play(); } catch (e) { } }
  },
  glow: function (i) { return this.eng && this.eng[i] ? this.p * G.P("fx", "contact", "glow") : 0; },
  isOn: function (i) { return !!(this.eng && this.eng[i]); }
});
G.register("fx", "flash", {
  version: "1", label: "Casualty flash",
  params: {},
  prepare: function () { },
  isOn: function (id, now) { var f = G.host && G.host.flash; return !!(f && f[id] && f[id] > now); }
});
