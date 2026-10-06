// ---------------------------------------------------------------- 20-motion: motion models (plug-ins).  sample(tl, o, c, p, T, out) writes out.lng / out.lat for the segment p..p+1 of the unit whose keyframes start at o.
G.register("motion", "linear", {
  version: "1", label: "Linear (piecewise)",
  params: {},
  sample: function (tl, o, c, p, T, out) {
    var k = o + p, u = (T - tl.T[k]) / (tl.T[k + 1] - tl.T[k]);
    out.lng = tl.LNG[k] + (tl.LNG[k + 1] - tl.LNG[k]) * u; out.lat = tl.LAT[k] + (tl.LAT[k + 1] - tl.LAT[k]) * u;
  }
});
// monotone cubic Hermite per axis: velocity is continuous through every keyframe (no stop-and-go), and the path never overshoots a keyframe on either axis.
// tension 0 = zero tangents at every keyframe (each gap eases in and out: the stop-and-go look), 1 = full continuous velocity.
G.register("motion", "smooth", {
  version: "1", label: "Smooth (monotone cubic, C1)",
  params: { tension: { type: "range", min: 0, max: 1, step: 0.05, def: 1, label: "Velocity continuity" } },
  sample: function (tl, o, c, p, T, out) {
    var k = o + p, h = tl.T[k + 1] - tl.T[k], u = (T - tl.T[k]) / h, u2 = u * u, u3 = u2 * u, ten = G.P("motion", "smooth", "tension");
    var h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    var a0 = tl.tan(tl.LNG, o, c, p) * ten, a1 = tl.tan(tl.LNG, o, c, p + 1) * ten, b0 = tl.tan(tl.LAT, o, c, p) * ten, b1 = tl.tan(tl.LAT, o, c, p + 1) * ten;
    out.lng = h00 * tl.LNG[k] + h10 * h * a0 + h01 * tl.LNG[k + 1] + h11 * h * a1;
    out.lat = h00 * tl.LAT[k] + h10 * h * b0 + h01 * tl.LAT[k + 1] + h11 * h * b1;
  }
});
