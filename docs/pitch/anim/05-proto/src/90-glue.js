// ---------------------------------------------------------------- 90-glue: the only functions the host patches call.  Every entry point is guarded: an exception switches the engine off for the session
// (the shipped renderer takes over on the next call) unless strict mode is on (tests: ?anim=strict or window.__gtanimStrict) in which case it is rethrown.
function supported() { try { var C2 = window.CanvasRenderingContext2D; return !!(C2 && C2.prototype.roundRect && window.Map && window.Float64Array); } catch (e) { return false; } }   // (the build gate rejects bare globals that are not on its standard list: names are read from window)
function guard(fn, bad) { try { return fn(); } catch (e) { fail(e); return bad; } }
G.bind = function (h) {
  G.host = h; var sw = G.readSwitches(); G.strict = sw.strict;
  S.state = (sw.legacy || !G.T.enabled || !supported()) ? 0 : 1;
  window.__gtanim = { version: G.version, state: function () { return S.state; }, info: function () { return { version: G.version, on: S.state === 1, skin: G.T.skin, motion: G.T.motion, layout: G.T.layout, frames: G.m.frames, tiles: G.m.nTiles || 0, drops: G.m.drops, picks: G.m.picks || 0 }; }, G: sw.strict ? G : null };
  if (S.state && sw.tune) setTimeout(openStudio, 800);
};
G.on = function () { return S.state === 1; };
G.repaint = function () { S.dirtyDraw = true; try { if (S.map) S.map.triggerRepaint(); } catch (e) { } };
G.paused = function (c, map, pbt, tick, sel, pin, filt) {
  return guard(function () {
    ensureTimeline(pbt); attach(c, map); S.sel = sel; S.pin = pin; S.filt = filt;
    G.clock.set(tick, false, G.host.reduced(), G.now()); draw("paused");
    if (G.clock.state.g) map.triggerRepaint();
    return true;
  }, false);
};
G.playing = function (c, map, pbt, st, ut, sel, pin, filt) {
  return guard(function () {
    ensureTimeline(pbt); attach(c, map); S.sel = sel; S.pin = pin; S.filt = filt;
    // the shipped loop passes the tick it read at the START of the frame: on the frame that advances the tick it is one tick behind the fraction (it draws a one-tick step backwards for that frame), so the fresh tick is read from the store, which setState has already updated
    G.clock.set(G.host.store.getState().currentTick + ut, true, G.host.reduced(), G.now()); S.dirtyDraw = true; map.triggerRepaint();
    return true;
  }, false);
};
G.units = function (pbt, f, x) {
  return guard(function () {
    if (!S.tlU || S.tlU.pbt !== pbt) S.tlU = new Timeline(pbt);
    S.tlU.stateAt(f + (x || 0), G.cur("motion"), 0); return S.tlU.records();
  }, null);
};
G.pick = function (clientX, clientY) { return guard(function () { var r = pickAt(clientX, clientY); if (r) G.m.picks = (G.m.picks || 0) + 1; return r; }, false); };
// the units as the LAST FRAME drew them (true positions, sampled at the displayed time): what other layers (the Monuments click arbitration) must use instead of "latest keyframe"
G.drawn = function () {
  return guard(function () {
    var tl = S.tl, hit = S.hit, i, out;
    if (!tl || !hit.n) return null;
    if (S.drawnFor === G.m.frames && S.drawnList) return S.drawnList;
    out = []; for (i = 0; i < hit.n; i++) { var u = hit.id[i]; out.push({ unit_id: tl.ids[u], lng: tl.lng[u], lat: tl.lat[u] }); }
    S.drawnFor = G.m.frames; S.drawnList = out; return out;
  }, null);
};
G.internal = { Timeline: Timeline, S: S, Atlas: Atlas, draw: draw };
