// A complete new EFFECT in under 50 lines: "selectGlow", a gold pulsing glow under the selected / pinned tile.
// Registering it is all it takes: the frame pipeline calls prepare() once per frame and asks glow(i) for every tile; the Studio lists its switch (fx.selectGlow) and its slider.
G.register("fx", "selectGlow", {
  version: "1", label: "Selected-tile glow",
  params: { hz: { type: "range", min: 0.2, max: 4, step: 0.1, def: 1.2, label: "Pulse rate (Hz)" } },
  prepare: function (S, now) {                                    // S = the engine state: S.sel / S.pin (unit ids), S.tl (the sampled timeline)
    this.i = -1;
    var id = S.pin || S.sel;
    if (id && S.tl) { var j = S.tl.index[id]; if (j !== void 0 && S.tl.alpha[j] > 0) this.i = j; }
    var reduced = G.host && G.host.reduced();
    this.a = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(now / 1000 * 2 * Math.PI * G.P("fx", "selectGlow", "hz"));
  },
  glow: function (i) { return i === this.i ? this.a : 0; }        // alpha 0..1 of the glow under tile i
});
