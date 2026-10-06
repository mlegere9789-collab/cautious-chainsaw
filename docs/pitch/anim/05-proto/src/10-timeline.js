// ---------------------------------------------------------------- 10-timeline: keyframes per unit (the unit's OWN consecutive keyframes), sampled at any continuous time
// Semantics kept from the shipped game (group B): a unit exists from its first keyframe on and holds its last keyframe; the last record of a tick wins.
// New: positions between two keyframes are interpolated by the motion model across the WHOLE gap (the shipped code interpolates only between consecutive ticks, i.e. teleports
// across every longer gap).  Strength, disposition and notes always come from the governing (latest) keyframe, so no digit is invented; the visual strength bar may animate.
function Timeline(pbt) {
  var ticks = Object.keys(pbt).map(Number).sort(function (a, b) { return a - b; }), per = Object.create(null), ids = [], i, j, k, t, arr, r, id, l;
  for (i = 0; i < ticks.length; i++) {
    t = ticks[i]; arr = pbt[t]; if (!arr) continue;
    for (j = 0; j < arr.length; j++) {
      r = arr[j]; id = r && r.unit_id; if (!id) continue;
      l = per[id]; if (!l) { l = per[id] = []; ids.push(id); }
      if (l.length && l[l.length - 1].t === t) l[l.length - 1] = { t: t, r: r }; else l.push({ t: t, r: r });
    }
  }
  ids.sort();
  var n = ids.length, tot = 0; for (i = 0; i < n; i++) tot += per[ids[i]].length;
  this.n = n; this.ids = ids; this.pbt = pbt; this.index = Object.create(null);
  this.off = new Int32Array(n); this.cnt = new Int32Array(n); this.ptr = new Int32Array(n);
  this.T = new Float64Array(tot); this.LNG = new Float64Array(tot); this.LAT = new Float64Array(tot); this.B = new Float32Array(tot); this.S = new Float32Array(tot); this.rec = new Array(tot);
  this.side = new Uint8Array(n); this.maxS = new Float32Array(n);
  var o = 0;
  for (i = 0; i < n; i++) {
    l = per[ids[i]]; this.index[ids[i]] = i; this.off[i] = o; this.cnt[i] = l.length; this.side[i] = ids[i].charAt(0) === "U" ? 0 : 1; var mx = 1;
    for (k = 0; k < l.length; k++, o++) { r = l[k].r; this.T[o] = l[k].t; this.LNG[o] = r.lng; this.LAT[o] = r.lat; this.B[o] = r.bearing || 0; this.S[o] = r.strength || 0; this.rec[o] = r; if (this.S[o] > mx) mx = this.S[o]; }
    this.maxS[i] = mx;
  }
  this.lng = new Float64Array(n); this.lat = new Float64Array(n); this.bear = new Float32Array(n); this.str = new Float32Array(n); this.alpha = new Float32Array(n);
  this.gov = new Int32Array(n); this.modelled = new Uint8Array(n); this.alive = new Int32Array(n); this.nAlive = 0; this.at = NaN;
  this._o = { lng: 0, lat: 0 };
}
// tangent (degrees per tick) of one axis at keyframe k of a unit: monotone harmonic mean (Fritsch-Butland), zero where the direction reverses
Timeline.prototype.tan = function (P, o, c, k, axis) {
  var T = this.T, d0 = NaN, d1 = NaN, h0 = 0, h1 = 0;
  if (k > 0) { h0 = T[o + k] - T[o + k - 1]; d0 = (P[o + k] - P[o + k - 1]) / h0; }
  if (k < c - 1) { h1 = T[o + k + 1] - T[o + k]; d1 = (P[o + k + 1] - P[o + k]) / h1; }
  if (d0 !== d0) return d1; if (d1 !== d1) return d0;
  if (d0 * d1 <= 0) return 0;
  var w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; return (w1 + w2) / (w1 / d0 + w2 / d1);
};
Timeline.prototype.stateAt = function (T, motion, entrance) {
  var off = this.off, cnt = this.cnt, ptr = this.ptr, TT = this.T, na = 0, i, o, c, p, k, u, e, db, out = this._o;
  for (i = 0; i < this.n; i++) {
    o = off[i]; c = cnt[i]; p = ptr[i];
    while (p + 1 < c && TT[o + p + 1] <= T) p++;
    while (p > 0 && TT[o + p] > T) p--;
    ptr[i] = p;
    if (T < TT[o]) { this.alpha[i] = 0; continue; }
    k = o + p; this.gov[i] = k;
    if (p === c - 1) { this.lng[i] = this.LNG[k]; this.lat[i] = this.LAT[k]; this.bear[i] = this.B[k]; this.str[i] = this.S[k]; this.modelled[i] = 0; }
    else {
      u = (T - TT[k]) / (TT[k + 1] - TT[k]); e = u * u * (3 - 2 * u);
      motion.sample(this, o, c, p, T, out); this.lng[i] = out.lng; this.lat[i] = out.lat;
      db = this.B[k + 1] - this.B[k]; if (db > 180) db -= 360; else if (db < -180) db += 360;
      this.bear[i] = (this.B[k] + db * e + 360) % 360; this.str[i] = this.S[k] + (this.S[k + 1] - this.S[k]) * u;
      this.modelled[i] = (this.LNG[k + 1] !== this.LNG[k] || this.LAT[k + 1] !== this.LAT[k]) ? 1 : 0;
    }
    this.alpha[i] = entrance > 0 ? Math.min(1, (T - TT[o]) / entrance) : 1;
    this.alive[na++] = i;
  }
  this.nAlive = na; this.at = T;
};
// the records the rest of the app consumes (minimap, picker index, fly-to): the governing keyframe's record with the sampled position and bearing
Timeline.prototype.records = function () {
  var out = [], j, i, r, k;
  for (j = 0; j < this.nAlive; j++) { i = this.alive[j]; k = this.gov[i]; r = Object.assign({}, this.rec[k]); r.lng = this.lng[i]; r.lat = this.lat[i]; r.bearing = this.bear[i]; out.push(r); }
  return out;
};
// position of ONE unit at any time (trails, tests): binary search over that unit's keyframes
Timeline.prototype.posAt = function (i, T, motion, out) {
  var o = this.off[i], c = this.cnt[i], lo = 0, hi = c - 1, mid, TT = this.T;
  if (T <= TT[o]) { out.lng = this.LNG[o]; out.lat = this.LAT[o]; return; }
  if (T >= TT[o + c - 1]) { out.lng = this.LNG[o + c - 1]; out.lat = this.LAT[o + c - 1]; return; }
  while (hi - lo > 1) { mid = (lo + hi) >> 1; if (TT[o + mid] <= T) lo = mid; else hi = mid; }
  motion.sample(this, o, c, lo, T, out);
};
