// ---------------------------------------------------------------- 60-atlas: device-pixel exact sprite atlas.  Cells are drawn once (the skin's draw function) and blitted with drawImage afterwards.
// Keys are numbers (no string building per frame).  When the pages are full the atlas is flushed and rebuilt lazily (counted in G.m.flushes).
function Atlas(k, size, maxPages) { this.k = k; this.size = size || 2048; this.maxPages = maxPages || 8; this.map = new Map(); this.pages = []; this.bytes = 0; this._new(); }
Atlas.prototype._new = function () {
  var c = document.createElement("canvas"); c.width = c.height = this.size;
  this.pages.push({ c: c, g: c.getContext("2d") }); this.cur = this.pages[this.pages.length - 1]; this.cx = this.cy = this.rowH = 0; this.bytes += this.size * this.size * 4;
};
Atlas.prototype.clear = function () { this.map.clear(); this.pages.length = 0; this.bytes = 0; this._new(); G.m.flushes = (G.m.flushes || 0) + 1; };
Atlas.prototype.get = function (key, wCss, hCss, draw) {
  var e = this.map.get(key); if (e) return e;
  var k = this.k, sw = Math.ceil(wCss * k), sh = Math.ceil(hCss * k);
  if (this.cx + sw + 2 > this.size) { this.cx = 0; this.cy += this.rowH + 2; this.rowH = 0; }
  if (this.cy + sh + 2 > this.size) { if (this.pages.length >= this.maxPages) { this.clear(); } else this._new(); }
  var sx = this.cx + 1, sy = this.cy + 1; this.cx += sw + 2; this.rowH = Math.max(this.rowH, sh);
  var g = this.cur.g; g.save(); g.translate(sx, sy); g.beginPath(); g.rect(0, 0, sw, sh); g.clip(); g.scale(k, k); draw(g, k); g.restore();
  e = { c: this.cur.c, sx: sx, sy: sy, sw: sw, sh: sh, w: sw / k, h: sh / k };
  this.map.set(key, e); return e;
};
var _mctx = null, _mcache = new Map();
G.measure = function (font, text) {                                            // cached text width (CSS px)
  var key = font + "|" + text, w = _mcache.get(key);
  if (w === void 0) { if (!_mctx) _mctx = document.createElement("canvas").getContext("2d"); _mctx.font = font; w = _mctx.measureText(text).width; if (_mcache.size > 5000) _mcache.clear(); _mcache.set(key, w); }
  return w;
};
