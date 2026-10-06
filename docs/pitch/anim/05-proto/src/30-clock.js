// ---------------------------------------------------------------- 30-clock: continuous displayed time Td chasing the game's target time T (the store's tick + the fraction of the running tick)
//   playing, small step      Td = T exactly (the game's own accumulator is already smooth)
//   scrub / day jump / seek  glide (ease) for <= crossfadeTicks, cross-fade beyond (tiles do not fly across the field for hours of battle time)
//   pause                    keeps Td: the store's tick = floor(T) so nothing moves backwards; a later step glides
//   reduced motion           Td = T, no glide, no fade
var C = { T: NaN, Td: NaN, g: null, fade: 1, playing: false, lastPlay: 0 };
G.clock = {
  state: C,
  set: function (T, playing, reduced, now) {
    var tk = G.T, d;
    C.T = T; C.playing = !!playing; if (playing) C.lastPlay = now;
    if (C.Td !== C.Td || reduced) { C.Td = T; C.g = null; C.fade = 1; return; }
    if (C.g) { C.g.to = T; return; }                                                    // a glide in progress follows the moving target
    d = Math.abs(T - C.Td);
    if (playing) { if (d <= tk.jumpTicks) { C.Td = (C.Td > T && C.Td - T < 1) ? C.Td : T; return; } }   // resuming after a pause at a sub-tick position: hold until the game's time catches up (never slide backwards)
    else {
      if (Math.floor(C.Td) === Math.floor(T) && d < 1) return;                           // pause or repaint at the same tick: keep the sub-tick position
      if (d < 1e-6) return;
    }
    C.g = { kind: d > tk.crossfadeTicks ? "fade" : "glide", from: C.Td, to: T, t0: now, dur: d > tk.crossfadeTicks ? tk.jumpMs : Math.min(tk.jumpMs, 140 + d * 40) };
  },
  step: function (now) {
    var g = C.g, u;
    if (!g) { C.fade = 1; return false; }
    u = Math.min(1, (now - g.t0) / g.dur);
    if (g.kind === "glide") { C.Td = g.from + (g.to - g.from) * G.ease.inOutCubic(u); C.fade = 1; }
    else { if (u < 0.4) C.fade = 1 - u / 0.4; else { C.Td = g.to; C.fade = (u - 0.4) / 0.6; } }
    if (u >= 1) { C.Td = g.to; C.fade = 1; C.g = null; return false; }
    return true;
  },
  reset: function () { C.T = C.Td = NaN; C.g = null; C.fade = 1; }
};
