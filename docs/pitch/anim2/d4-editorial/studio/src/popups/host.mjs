// popups/host.mjs - the OVERLAY DIRECTOR: where everything that pops up during the animation lives.  Pure and DOM-free (node tests drive it with real engine frames); ui/popup-layer.mjs draws
// what it decides.  The registry (kernel.popups) holds one module per kind of popup; this host gives all of them, at once, the things 02-popups.md found missing:
//
//   PLACEMENT   The obstacle map is the frame being drawn (chips, labels, pins, aggregate member dots, displaced-tile leaders) plus the interface chrome.  A card is placed on a conservative
//               occupancy grid (geom.mjs) and re-checked EVERY frame against exact rectangles.  A card whose place is being taken fades out and fades in elsewhere (it never glides across tiles);
//               a card that a tile actually touches is cut at once.  A card that finds no room becomes a chip in the Chronicle strip (inside the dock, not over the map): nothing is lost.
//   ANCHORS     A card names the units (or the place) it is about.  The host resolves them to the tiles being drawn (an aggregate, or the parent tile, when the unit has none of its own) and
//               returns leader lines, rings and edge arrows; the renderer draws them BENEATH the chips, so a leader can never hide a tile.
//   LIFETIME    A fired card lives for its READING TIME in wall-clock ms (words at the dial's wpm), not for its tick.  The reading clock runs only while the battle plays; hovering, focusing or
//               pinning a card stops it.  Tiers and a queue decide how many cards, peeks and chips are alive; faster playback demotes cards to chips; every row stays recoverable in the Chronicle.
//   JUMP HYGIENE  A seek raises no card for the ticks it skipped; what belongs to the old place leaves; the cards of the landed moment enter once the clock has settled.
//   DOCKING     Long reading opens in a rail (phone: a bottom sheet) and the map viewport SHRINKS to make room, the ground staying put on screen: reading can never lie on a tile.
//   ACCESS      One polite live region (at most one message per 2 s), Esc closes one layer per press, N / P / C / U / ? keys, reduced motion, pin and dismiss on every card.
//
// A popup module (see popups/index.mjs and popups/_template.mjs):
//     { id, label, doc, enabled?(tok), update(frame, api) -> card[], rows?(ctx) -> chronicle rows, preview?(api) }
// A card descriptor:
//     { key, kind: 'card'|'tooltip'|'hud'|'doc', tier: 'A'|'B'|'C'|'S', priority, tick, tone, subjects: { units, tileKeys, place: {lat,lng,label}, point },
//       forms: [{ id, level: 'full'|'compact'|'chip', w, content }]  (best first; `content` is a content model, or a function returning one),
//       hold?: { ms }, doc?: { key, tone, title, content, subjects, actions }, announce?, version, actions: { id: (api, card) => void }, slots?: ['tl'|'tr'|'bl'|'br'|'tc'|'bc'], pinned?, narrate? }
//   A STATE card (clock, legend, unit card, tooltip, tour) is returned by update() on every frame it should exist; an EVENT card is created once with api.fire(card) when its trigger happens.
//   A legacy card { key, anchor, size, render|html, priority } is still accepted (one form).
import { dampStep } from '../interp/damp.mjs';
import { Hash } from '../layout/geom.mjs';
import { Occupancy, rectOf, overlaps, inflate, clampPt, findSpot } from './geom.mjs';
import { look, leaderProgress, pulse } from './motion.mjs';
import { estimateHeight, textOf, tickIndex, firstSentence, clamp } from './kit.mjs';

const LEVEL = { full: 0, compact: 1, chip: 2 };
export const contentOf = (x) => (typeof x.content === 'function' ? x.content() : x.content);

/** the solid items of a frame as screen rectangles: chips, labels and pins.  Legacy helper (the template and the extension tests were written against it). */
export function frameObstacles(frame, pad = 0) {
  const { dx, dy } = frame.view; const out = [];
  for (const t of frame.tiles) {
    if (!t.solid) continue;
    const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + dx; const y = t.y + dy;
    out.push({ x0: x - hw - pad, y0: y - hh - pad, x1: x + hw + pad, y1: y + hh + pad, owner: t.key, kind: 'chip' });
    if (t.label && t.label.opacity >= 0.5) out.push({ x0: t.label.x0 + dx - pad, y0: t.label.y0 + dy - pad, x1: t.label.x1 + dx + pad, y1: t.label.y1 + dy + pad, owner: t.key, kind: 'label' });
    if (t.displaced) out.push({ x0: t.px + dx - 2 - pad, y0: t.py + dy - 2 - pad, x1: t.px + dx + 2 + pad, y1: t.py + dy + 2 + pad, owner: t.key, kind: 'pin' });
  }
  return out;
}

/** Everything of a frame that a popup must not cover, as exact rectangles: tiles above `minOpacity` (not only the solid ones: a tile fading in is about to be one), their labels, the pins of
 *  displaced tiles, the leader line of a displaced tile (its bounding box) and the member dots of an aggregate.  The vital core of a tile is whatever its skin draws inside these. */
export function tileObstacles(frame, { minOpacity = 0.2, hulls = true, leaders = true } = {}) {
  const { dx, dy } = frame.view; const out = [];
  for (const t of frame.tiles) {
    if (t.opacity < minOpacity) continue;
    const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + dx; const y = t.y + dy;
    out.push({ x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh, owner: t.key, kind: 'chip' });
    if (t.label && t.label.opacity >= minOpacity) out.push({ x0: t.label.x0 + dx, y0: t.label.y0 + dy, x1: t.label.x1 + dx, y1: t.label.y1 + dy, owner: t.key, kind: 'label' });
    if (t.displaced) {
      out.push({ x0: t.px + dx - 2, y0: t.py + dy - 2, x1: t.px + dx + 2, y1: t.py + dy + 2, owner: t.key, kind: 'pin' });
      if (leaders) out.push({ x0: Math.min(t.px, t.x) + dx - 1, y0: Math.min(t.py, t.y) + dy - 1, x1: Math.max(t.px, t.x) + dx + 1, y1: Math.max(t.py, t.y) + dy + 1, owner: t.key, kind: 'leader' });
    }
    if (hulls && t.kind === 'agg' && t.members) for (const mm of t.members) out.push({ x0: mm.ax + dx - 2, y0: mm.ay + dy - 2, x1: mm.ax + dx + 2, y1: mm.ay + dy + 2, owner: t.key, kind: 'dot' });
  }
  return out;
}

/** legacy free-space search (Hash based); the director itself uses geom.findSpot */
export function placeCard({ w, h, anchor = null, obstacles, viewport, margin = 10, gap = 6, avoid = [] }) {
  const hash = new Hash(64); for (const r of obstacles) hash.add({ ...r }); for (const r of avoid) hash.add({ ...r });
  const maxX = viewport.w - margin - w; const maxY = viewport.h - margin - h; if (maxX < margin || maxY < margin) return null;
  const free = (x, y) => {
    if (x < margin || y < margin || x > maxX || y > maxY) return false;
    let ok = true; hash.query(x - gap, y - gap, x + w + gap, y + h + gap, (o) => { if (ok && o.x0 < x + w + gap && o.x1 > x - gap && o.y0 < y + h + gap && o.y1 > y - gap) ok = false; });
    return ok;
  };
  const ax = anchor ? anchor.x : viewport.w / 2; const ay = anchor ? anchor.y : viewport.h / 2; const cand = []; const off = 14;
  for (const [dx, dy] of [[off, -h / 2], [-w - off, -h / 2], [-w / 2, off], [-w / 2, -h - off], [off, -h - 4], [off, 4], [-w - off, -h - 4], [-w - off, 4]]) cand.push([ax + dx, ay + dy]);
  for (const [x, y] of cand) { const rx = Math.max(margin, Math.min(maxX, x)); const ry = Math.max(margin, Math.min(maxY, y)); if (free(rx, ry)) return { x: rx, y: ry }; }
  const pts = []; for (let y = margin; y <= maxY; y += 8) for (let x = margin; x <= maxX; x += 8) pts.push([x, y, Math.hypot(x + w / 2 - ax, y + h / 2 - ay)]);
  pts.sort((p, q) => p[2] - q[2]); for (const [x, y] of pts) if (free(x, y)) return { x, y };
  return null;
}

const NO_CHROME = () => ({ rects: [], safe: { top: 0, right: 0, bottom: 0, left: 0 } });
const EMPTY_PD = { events: [], stories: [], successions: [], tour: [], oob: {}, fileSources: {} };
const tileRectOf = (t, view) => { const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; return { x0: t.x + view.dx - hw, y0: t.y + view.dy - hh, x1: t.x + view.dx + hw, y1: t.y + view.dy + hh, gx: t.x + view.dx - (t.hx || 0), gy: t.y + view.dy - (t.hy || 0), gr: Math.max(8, Math.min(t.h / 2 - 1, 14)) }; };      // gx, gy, gr: the mark's glyph (D4 FORK: a leader ends on the glyph, not on the middle of the text run)

/**
 * @param {object} engine the Battle Studio engine (createEngine)
 * @param {{popupData?:object, size?:{w:number,h:number}, chrome?:()=>{rects:object[],safe:object}, measure?:(card:object,form:object)=>{h:number}|null, laneRects?:()=>object, systemReduced?:()=>boolean, onSelect?:(id:string|null)=>void}} [env]
 */
export function createPopupHost(engine, env = {}) {
  const tok = engine.tok; const kernel = engine.kernel; const popupData = env.popupData || EMPTY_PD;
  const S = {
    size: { w: env.size ? env.size.w : engine.camera.w, h: env.size ? env.size.h : engine.camera.h }, cards: new Map(), seq: 0, now: 0, frame: null, dismissed: new Map(), rail: null, sheet: 'peek',
    T: { have: false, tau: 0, prev: 0, dTau: 0, playing: false, gliding: false, speed: 1, seeking: false, wasSeeking: false, seekStart: false, stableMs: 0, settled: false, justSettled: false, target: 0 },
    inset: { right: 0, bottom: 0, vr: 0, vb: 0, vrv: 0, vbv: 0, applied: { right: 0, bottom: 0 } }, live: { q: [], lastAt: -1e9 }, hover: null, selectedId: null, laneRects: {}, rows: null,
    hudHidden: new Map(), slowSet: 1, errors: [], mod: {},
    stats: { frames: 0, placements: 0, relocations: 0, cuts: 0, cutFrames: 0, laneFalls: 0, fired: 0, skipped: 0, maxPlaceMs: 0, placeMsSum: 0, overlapFrames: 0 },
  };
  const reducedNow = () => { const m = tok('motion.reduced'); return m === 'on' || (m === 'auto' && !!(env.systemReduced && env.systemReduced())); };
  const motionTok = () => ({ enterMs: tok('popup.motion.enterMs'), exitMs: tok('popup.motion.exitMs'), moveOutMs: tok('popup.motion.moveOutMs'), moveInMs: tok('popup.motion.moveInMs'), rise: Math.min(tok('popup.motion.risePx'), Math.max(0, tok('popup.place.gapPx') - 1)), reduced: reducedNow() });   // a moving card always stays inside the clear gap, so even mid-motion it is clear of every tile
  const isPhone = () => S.size.w < tok('popup.phone.belowPx');
  const mapSize = () => ({ w: Math.max(100, S.size.w - S.inset.vr), h: Math.max(100, S.size.h - S.inset.vb) });
  const chromeNow = () => (env.chrome ? env.chrome() : NO_CHROME());
  const moduleOn = (def) => (typeof def.enabled === 'function' ? !!def.enabled(tok) : true);          // each module names its own dial: enabled: (tok) => tok('popup.event.enabled')
  const idOf = (def, key) => (def ? def.id : 'host') + ':' + key;
  const unitName = (id) => { const u = engine.battle.units.get(id); if (u) return u.designation || u.label || u.short || id; const n = engine.battle.nodes.get(id); return (n && n.designation) || id; };

  // ---- Chronicle rows: every module may contribute rows (id, tick, kind, tone, title, text, make(api) -> card) ----------------------------------------------------
  function allRows() {
    if (!S.rows) {
      const ctx = { pd: popupData, clock: engine.clock, battle: engine.battle, tok, unitName }; const rows = [];
      for (const def of kernel.popups.list()) if (typeof def.rows === 'function') { try { for (const r of def.rows(ctx)) rows.push({ ...r, popup: def.id }); } catch (e) { S.errors.push(`rows of ${def.id}: ${e.message}`); } }
      S.rows = tickIndex(rows);
    }
    return S.rows;
  }
  kernel.popups.subscribe(() => { S.rows = null; });

  // ---- time: seeks, settling, crossings -------------------------------------------------------------------------------------------------------------------------
  function timeStep(frame, dtMs) {
    const tr = engine.transport; const T = S.T; const tau = frame.tau; const prev = T.have ? T.tau : tau;
    T.prev = prev; T.tau = tau; T.dTau = tau - prev; T.speed = tr.speed; T.playing = tr.playing && tr.speedEff > 0.02; T.gliding = tr.gliding; T.target = tr.target ?? tau;
    // a SEEK is the clock moving much faster than playback would move it (or backwards).  The transport keeps a glide target ahead of a playing clock after a seek, so `gliding` alone never ends
    // while playing: the speed of the clock is what tells a fly-through from playback.
    const dtS = Math.max(1e-3, dtMs / 1000); const vel = Math.abs(T.dTau) / dtS; const playRate = Math.max(0, tr.speedEff) * tok('time.baseTps');
    T.wasSeeking = T.seeking; T.seeking = T.dTau < -1e-6 || Math.abs(T.dTau) > tok('motion.cutTickJump') || (T.gliding && vel > playRate * 1.6 + 3); T.seekStart = T.seeking && !T.wasSeeking;
    if (T.seeking) T.stableMs = 0; else T.stableMs += dtMs;
    const was = T.settled; T.settled = !T.seeking && T.stableMs >= tok('popup.land.delayMs'); T.justSettled = T.settled && !was; T.have = true;
  }

  /** the hover the modules see: the live one, or the last one while the pointer is on the tooltip itself or has just left the tile (a tooltip must be hoverable: WCAG 1.4.13) */
  function hoverEff() { if (S.hover) return S.hover; if (S.hoverLast && (S.tipHeld || (S.hoverLost != null && S.now - S.hoverLost < 280))) return S.hoverLast; return null; }
  // ---- the api every popup module receives -----------------------------------------------------------------------------------------------------------------------
  function makeApi(frame, nowMs, dtMs, def) {
    const T = S.T; const m = mapSize(); const mine = (def ? def.id : '') + ':';
    return {
      tok, nowMs, dtMs, frame, engine, time: T, pd: popupData, data: engine.battle.ds, clock: engine.clock, battle: engine.battle, unitName, rows: allRows(), popup: def ? def.id : null, host: api,
      get obstacles() { return frameObstacles(frame); },
      viewport: { w: m.w, h: m.h }, size: { w: S.size.w, h: S.size.h }, phone: isPhone(), reduced: reducedNow(), selectedId: S.selectedId, hover: hoverEff(), safe: chromeNow().safe,
      tileRect(k) { const t = frame.tiles.find((q) => q.key === k || q.ids.includes(k)); return t ? tileRectOf(t, frame.view) : null; },
      /** rows (a tickIndex) with prevTau < tick <= tau, play regime only: nothing while seeking */
      crossed(index) { return T.seeking || T.dTau <= 0 ? [] : index.between(T.prev, T.tau); },
      /** rows with tick in [tau - after, tau + 0.5], once, on the frame the clock has just settled (a landing) */
      landed(index, after = 0.5) { return T.justSettled ? index.between(T.tau - after - 1e-9, T.tau + 0.5) : []; },
      isDismissed: (key) => S.dismissed.has(mine + key), fire: (card, opts) => fire(def, card, opts),
      seek: (tick, o = {}) => engine.transport.seek(tick, o), play: () => engine.transport.play(), pause: () => engine.transport.pause(), setSpeed: (x) => engine.transport.setSpeed(x), speed: () => engine.transport.speed,
      select: (id) => api.select(id), flyTo, ensureVisible, openRail: (key) => api.openRail(mine + key), closeRail: () => api.closeRail(), dismiss: (key) => api.dismiss(mine + key), reopen: (row) => api.reopen(row),
      pointFor: (lat, lng) => engine.camera.toScreen(lng, lat),
      /** a preview helper: clear the screen of cards and go to a moment (the landing then raises that moment's popups) */
      goTo: ({ tick, lat, lng, zoom }) => { api.dismissAll(); engine.transport.pause(); if (lat != null) engine.moveTo({ lat, lng, zoom: zoom ?? engine.camera.zoom }, { glide: false, safe: true }); engine.transport.seek(tick, { glide: false }); },
      scene: (id) => engine.battle.ds.scenes.find((s) => s.id === id),
    };
  }

  // ---- card lifecycle -------------------------------------------------------------------------------------------------------------------------------------------
  function normalize(def, raw) {
    const c = { ...raw };
    if (!c.forms && c.size) {
      c.forms = [{ id: 'full', level: 'full', w: c.size.w, h: c.size.h, legacy: { render: c.render, html: c.html } }];
      if (c.anchor) c.subjects = c.anchor.unitId ? { units: [c.anchor.unitId] } : c.anchor.tileKey ? { tileKeys: [c.anchor.tileKey] } : c.anchor.x !== undefined ? { point: { x: c.anchor.x, y: c.anchor.y } } : null;
    }
    c.kind = c.kind || 'card'; c.tier = c.tier || (c.kind === 'card' ? 'A' : 'S'); c.priority = c.priority ?? 0;
    if (c.kind === 'doc') { c.forms = c.forms || []; } else { c.forms = c.forms.slice().sort((a, b) => LEVEL[a.level || 'full'] - LEVEL[b.level || 'full']); for (const f of c.forms) { f.level = f.level || 'full'; if (f.level === 'chip') f.lane = true; } }
    return c;
  }
  function makeCard(def, spec, now, via) {
    return { id: idOf(def, spec.key), def, key: spec.key, spec, via, born: now, seq: ++S.seq, tick: spec.tick ?? S.T.tau, phase: 'in', t0: now, from: 1, opacity: 0, dy: 0, scale: 1, fi: 0, rect: null, pending: null, lane: false, hidden: false,
      holdTotal: spec.hold ? spec.hold.ms : null, holdLeft: spec.hold ? spec.hold.ms : null, pinned: !!spec.pinned, hovered: false, focused: false, seen: true, leaderT0: now, pulseT0: now, lastPlaceAt: -1e9, stableSince: now,
      forceLevel: 0, demoted: false, allowed: 0, subj: null, anchorRect: null, fired: false, landAfter: null, needsPlace: false, upgrade: false, cut: false, done: false, hudSlot: null };
  }
  /** the richest form level the playback speed allows (0 full, 1 compact, 2 chip, 3 none) */
  function levelFor(c, speedX) {
    const k = c.spec.kind; if (k === 'hud' || k === 'tooltip' || k === 'doc' || c.spec.tier === 'S' || c.pinned) return 0;
    const fm = tok('popup.speed.fullMaxX'); const cm = tok('popup.speed.compactMaxX'); const xm = tok('popup.speed.chipMaxX');
    if (c.spec.tier === 'A') return speedX <= fm ? 0 : speedX <= cm ? 1 : speedX <= xm ? 2 : 3;
    if (c.spec.tier === 'B') return speedX <= fm ? 0 : speedX <= cm ? 2 : 3;
    if (c.spec.tier === 'D') return speedX <= cm ? 1 : 3;
    return speedX <= fm ? 1 : speedX <= cm ? 2 : 3;
  }
  function fire(def, raw, opts = {}) {
    const spec = normalize(def, raw); const id = idOf(def, spec.key); const now = S.now; const T = S.T;
    if (S.dismissed.has(id) && !opts.force) { S.stats.skipped++; return null; }
    const speedX = T.playing ? T.speed : Math.min(T.speed, 1);
    if (!opts.force && levelFor({ spec, pinned: !!opts.pinned || !!spec.pinned }, speedX) >= 3) { S.stats.skipped++; return null; }
    const ex = S.cards.get(id);
    if (ex) { if (ex.phase === 'out') { ex.phase = 'show'; ex.opacity = 1; ex.from = 1; ex.done = false; } if (opts.pinned) ex.pinned = true; ex.spec = spec; if (opts.renew && spec.hold) { ex.holdLeft = spec.hold.ms; ex.holdTotal = spec.hold.ms; } return ex; }
    const c = makeCard(def, spec, now, opts.via || 'play'); c.pinned = !!opts.pinned || !!spec.pinned; c.fired = true; c.landAfter = opts.landAfter ?? null; S.cards.set(id, c); S.stats.fired++;
    queueAnnounce(c, spec.tier === 'A'); return c;
  }
  const startExit = (c) => { if (c.phase === 'out') return; c.phase = 'out'; c.t0 = S.now; c.from = c.opacity; };

  // ---- announcements (one polite live region, at most one message per popup.a11y.liveMinGapMs) ---------------------------------------------------------------
  function queueAnnounce(card, urgent) {
    const f = card.spec.forms && card.spec.forms[0]; const text = card.spec.announce || (f ? firstSentence(textOf(contentOf(f)).replace(/\n+/g, '. ')) : '');
    if (text) S.live.q.push({ text, prio: (card.spec.priority || 0) + (urgent ? 100 : 0) });
  }
  function flushLive(now) {
    const L = S.live; if (!L.q.length || now - L.lastAt < tok('popup.a11y.liveMinGapMs')) return null;
    L.q.sort((a, b) => b.prio - a.prio); const top = L.q[0]; const more = L.q.length - 1; L.q.length = 0; L.lastAt = now;
    return more > 0 ? `${top.text} ${more} more in the Chronicle.` : top.text;
  }

  // ---- measuring (real DOM size in the browser through env.measure; a conservative estimate without a DOM) -----------------------------------------------------------
  const sizeCache = new Map();
  function measure(c, f) {
    const ver = c.spec.version ?? 0; const k = c.id + '|' + f.id + '|' + f.w + '|' + ver; const hit = sizeCache.get(k); if (hit) return hit;
    let h = f.h; if (h == null && env.measure) { const r = env.measure(c, f); if (r) h = r.h; }
    if (h == null) h = f.content ? estimateHeight(contentOf(f), f.w, f.est) : 80;
    const v = { w: f.w, h }; if (sizeCache.size > 800) sizeCache.clear(); sizeCache.set(k, v); return v;
  }

  // ---- subjects -> anchors ----------------------------------------------------------------------------------------------------------------------------------------
  function resolveSubjects(spec, frame, tileByKey) {
    const s = spec.subjects; const out = { tiles: [], point: null, placeLL: null }; if (!s) return out;
    const tileOf = (id) => {
      const k = frame.assign.get(id); if (k) { const t = tileByKey.get(k); if (t) return { t, via: t.kind === 'agg' ? 'aggregate' : 'self', id }; }
      const u = engine.battle.units.get(id); const chain = u ? u.chain : engine.battle.chainOf(id);
      for (const cid of chain.slice(1)) { const k2 = frame.assign.get(cid); if (k2) { const t = tileByKey.get(k2); if (t) return { t, via: 'parent', id, parent: cid }; } }
      return null;
    };
    for (const id of s.units || []) { const r = tileOf(id); if (r && !out.tiles.some((q) => q.t === r.t)) out.tiles.push(r); }
    for (const k of s.tileKeys || []) { const t = tileByKey.get(k); if (t && !out.tiles.some((q) => q.t === t)) out.tiles.push({ t, via: 'self', id: k }); }
    if (!out.tiles.length && s.place) { const p = engine.camera.toScreen(s.place.lng, s.place.lat); out.point = { x: p[0], y: p[1] }; out.placeLL = s.place; }
    if (!out.tiles.length && s.point) out.point = { x: s.point.x, y: s.point.y };
    return out;
  }

  // ---- camera help ------------------------------------------------------------------------------------------------------------------------------------------------
  function flyTo({ lat, lng, zoom, glide = true, safe = true }) { engine.moveTo({ lat, lng, zoom }, { glide: glide && !reducedNow(), safe }); }
  /** pan just enough that a screen point is `pad` px inside the free part of the map */
  function ensureVisible(pt, pad = 90) {
    const m = mapSize(); const sf = chromeNow().safe; const x0 = pad + (sf.left || 0); const y0 = pad + (sf.top || 0); const x1 = m.w - pad - (sf.right || 0); const y1 = m.h - pad - (sf.bottom || 0);
    const dx = pt.x < x0 ? x0 - pt.x : pt.x > x1 ? x1 - pt.x : 0; const dy = pt.y < y0 ? y0 - pt.y : pt.y > y1 ? y1 - pt.y : 0; if (!dx && !dy) return false;
    const cam = engine.camera; const g = cam.fromScreen(cam.w / 2 - dx, cam.h / 2 - dy); engine.moveTo({ lat: g[1], lng: g[0] }, { glide: !reducedNow() }); return true;
  }

  /** the rail is about to take its place: if the subject would end up under it (or off the free part of the map), pan just enough to keep it in view (the ground keeps still otherwise) */
  function frameRailSubject(doc, frame, tileByKey) {
    const subj = resolveSubjects(doc, frame, tileByKey); const r = subj.tiles.length ? tileRectOf(subj.tiles[0].t, frame.view) : null; const pt = r ? { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 } : subj.point; if (!pt) return;
    const t = insetTarget(); const sf = chromeNow().safe; const pad = 80; const W = S.size.w - t.right; const H = S.size.h - t.bottom;
    const x0 = pad + (sf.left || 0); const y0 = pad + (sf.top || 0); const x1 = W - pad - (sf.right || 0); const y1 = H - pad - Math.max(0, (sf.bottom || 0) - t.bottom);
    const dx = pt.x < x0 ? x0 - pt.x : pt.x > x1 ? x1 - pt.x : 0; const dy = pt.y < y0 ? y0 - pt.y : pt.y > y1 ? y1 - pt.y : 0; if (!dx && !dy) return;
    const cam = engine.camera; const g = cam.fromScreen(cam.w / 2 - dx, cam.h / 2 - dy); engine.moveTo({ lat: g[1], lng: g[0] }, { glide: !reducedNow() });
  }
  // ---- viewport / rail inset ----------------------------------------------------------------------------------------------------------------------------------
  function insetTarget() {
    if (!S.rail) return { right: 0, bottom: 0 };
    if (isPhone()) { const H = S.size.h; const dock = chromeNow().dock || 0; const d = S.sheet === 'peek' ? tok('popup.sheet.peekPx') : S.sheet === 'full' ? H * 0.7 : H * tok('popup.sheet.halfFrac'); return { right: 0, bottom: Math.round(Math.min(d, H * 0.72) + dock) }; }
    return { right: Math.min(tok('popup.rail.widthPx'), Math.round(S.size.w * 0.5)), bottom: 0 };
  }
  function applyViewport(force = false) {
    const I = S.inset; const dR = I.vr - I.applied.right; const dB = I.vb - I.applied.bottom;
    if (!force && Math.abs(dR) < 0.01 && Math.abs(dB) < 0.01) return;
    if (Math.abs(dR) > 0.01 || Math.abs(dB) > 0.01) { if (engine.shiftView) engine.shiftView(dR / 2, dB / 2); else engine.panBy(dR / 2, dB / 2); }       // the ground stays where it is on screen; only the part under the rail is cut off
    engine.setViewport(Math.max(100, S.size.w - I.vr), Math.max(100, S.size.h - I.vb)); I.applied.right = I.vr; I.applied.bottom = I.vb;
  }
  function stepInset(dtMs) {
    const I = S.inset; const t = insetTarget(); I.right = t.right; I.bottom = t.bottom; const ms = tok('popup.rail.animMs');
    if (reducedNow() || ms <= 0) { I.vr = t.right; I.vb = t.bottom; I.vrv = 0; I.vbv = 0; }
    else {
      const a = dampStep(I.vr, I.vrv, t.right, ms / 2200, dtMs / 1000); I.vr = a[0]; I.vrv = a[1]; const b = dampStep(I.vb, I.vbv, t.bottom, ms / 2200, dtMs / 1000); I.vb = b[0]; I.vbv = b[1];
      if (Math.abs(I.vr - t.right) < 0.4 && Math.abs(I.vrv) < 8) { I.vr = t.right; I.vrv = 0; } if (Math.abs(I.vb - t.bottom) < 0.4 && Math.abs(I.vbv) < 8) { I.vb = t.bottom; I.vbv = 0; }
    }
    applyViewport();
  }

  // ---- the public api ---------------------------------------------------------------------------------------------------------------------------------------------
  const api = {
    cards: S.cards, state: S, stats: S.stats, tickIndex, rowsIndex: allRows,
    setSize(w, h) { S.size.w = w; S.size.h = h; applyViewport(true); },
    setHover(h) { if (h) { S.hover = h; S.hoverLast = h; S.hoverLost = null; } else { S.hover = null; S.hoverLost = S.now || 1; } }, setTipHeld(on) { S.tipHeld = !!on; if (!on) S.hoverLost = S.now || 1; }, setSelected(id) { S.selectedId = id || null; }, setLaneRects(r) { S.laneRects = r || {}; },
    get inset() { return { right: S.inset.vr, bottom: S.inset.vb }; }, get railOpen() { return !!S.rail; }, get rail() { return S.rail; }, get phone() { return isPhone(); }, get errors() { return S.errors; },
    busy() {
      const I = S.inset; if (Math.abs(I.vr - I.right) > 0.2 || Math.abs(I.vb - I.bottom) > 0.2 || S.live.q.length) return true;
      for (const c of S.cards.values()) if (c.phase !== 'show' || (c.holdLeft != null && (S.T.playing || S.T.gliding) && !c.pinned) || c.spec.live) return true;
      return false;
    },
    fire: (def, card, opts) => fire(def, card, opts),
    dismiss(id) { const c = S.cards.get(id); if (!c) return false; S.dismissed.set(id, c.tick); c.pinned = false; startExit(c); if (c.spec.onDismiss) c.spec.onDismiss(makeApi(S.frame, S.now, 0, c.def), c); if (S.rail && S.rail.id === id) api.closeRail(); return true; },
    pin(id, on) { const c = S.cards.get(id); if (!c) return false; c.pinned = on === undefined ? !c.pinned : !!on; return c.pinned; },
    setHovered(id, on) { const c = S.cards.get(id); if (c) c.hovered = !!on; }, setFocused(id, on) { const c = S.cards.get(id); if (c) c.focused = !!on; },
    /** run a card's (or its rail document's) action */
    act(id, action) {
      const c = S.cards.get(id); const spec = c ? c.spec : S.rail && S.rail.id === id ? S.rail.owner : null; if (!spec) return false;
      let fn = (spec.actions && spec.actions[action]) || (spec.doc && spec.doc.actions && spec.doc.actions[action]); if (!fn && spec.onAction) fn = (a, cc) => spec.onAction(a, action, cc); if (!fn) return false;
      fn(makeApi(S.frame, S.now, 0, c ? c.def : S.rail && S.rail.def), c); return true;
    },
    /** open a card's long form in the rail (phone: the sheet) and make room for it */
    openRail(id) {
      const c = S.cards.get(id); if (!c || !c.spec.doc) return false; if (S.rail && S.rail.id !== id) api.closeRail();
      S.rail = { id, doc: c.spec.doc, owner: c.spec, def: c.def, live: c.spec.kind === 'doc', openedAt: S.now, tick: c.tick, framed: false }; S.sheet = 'half';
      if (c.spec.doc.title) S.live.q.push({ text: `Reading panel opened: ${c.spec.doc.title}.`, prio: 90 }); return true;
    },
    closeRail() { if (!S.rail) return false; const r = S.rail; S.rail = null; const c = S.cards.get(r.id); if (c && c.spec.onRailClose) c.spec.onRailClose(makeApi(S.frame, S.now, 0, c.def)); return true; },
    setSheet(d) { S.sheet = d; },
    /** show a chronicle row again as a pinned card (the recall path) */
    reopen(row) {
      if (!row.make || !S.frame) return null; const def = row.popup ? kernel.popups.get(row.popup) : null; const card = row.make(makeApi(S.frame, S.now, 0, def)); if (!card) return null;
      S.dismissed.delete(idOf(def, card.key)); return fire(def, card, { force: true, pinned: true, via: 'reopen' });
    },
    /** keyboard: true when the key was consumed.  Esc closes one layer per press. */
    key(k, { shift = false, target = null } = {}) {
      if (k === 'Escape') return api.escape();
      if (k === 'n' || k === 'N') return api.stepRow(1); if (k === 'p' || k === 'P') return api.stepRow(-1);
      if (k === 'c' || k === 'C') return api.toggleDoc('chronicle:list'); if (k === '?') return api.toggleDoc('hints:help');
      if (k === 'u' || k === 'U') return api.cycleTile(shift ? -1 : 1);
      if (k === 'Enter' && !target) return api.openNewest();
      return false;
    },
    escape() {
      const tip = [...S.cards.values()].find((c) => c.spec.kind === 'tooltip' && c.phase !== 'out'); if (tip) { S.dismissed.set(tip.id, tip.tick); startExit(tip); S.hover = null; S.hoverLast = null; return true; }
      if (S.rail) { api.closeRail(); return true; }
      if (S.selectedId) { api.select(null); return true; }                          // the selection (and with it the unit card) goes before the newest event card
      const list = [...S.cards.values()].filter((c) => c.phase !== 'out' && c.spec.kind === 'card' && !c.hidden).sort((a, b) => b.seq - a.seq);
      if (list.length) { api.dismiss(list[0].id); return true; }
      return false;
    },
    openNewest() { const list = [...S.cards.values()].filter((c) => c.phase !== 'out' && c.spec.doc && c.spec.kind !== 'hud').sort((a, b) => b.seq - a.seq); return list.length ? api.openRail(list[0].id) : false; },
    toggleDoc(id) { if (S.rail && S.rail.id === id) { api.closeRail(); return true; } return api.openRail(id); },
    /** N / P: the next / previous chronicle row from the clock; pauses and seeks there (the landing then raises its card) */
    stepRow(dir) {
      const rows = allRows().rows; if (!rows.length) return false; const tau = S.T.tau; let tgt = null;
      if (dir > 0) tgt = rows.find((r) => r.tick > tau + 0.51); else for (let i = rows.length - 1; i >= 0; i--) if (rows[i].tick < tau - 0.51) { tgt = rows[i]; break; }
      if (tgt) { engine.transport.pause(); engine.transport.seek(tgt.tick, { ms: 160 }); } return true;
    },
    /** U / Shift+U: select the next / previous solid tile in reading order (a keyboard path to units) */
    cycleTile(dir) {
      const f = S.frame; if (!f) return false; const m = mapSize();
      const ts = f.tiles.filter((t) => t.solid && t.kind === 'leaf' && t.x + f.view.dx > 0 && t.x + f.view.dx < m.w && t.y + f.view.dy > 0 && t.y + f.view.dy < m.h).sort((a, b) => (Math.round(a.y / 40) - Math.round(b.y / 40)) || a.x - b.x);
      if (!ts.length) return true; const cur = ts.findIndex((t) => t.ids[0] === S.selectedId); api.select(ts[(cur + dir + ts.length * 2) % ts.length].ids[0]); return true;
    },
    select(id) { engine.select(id); S.selectedId = id || null; if (env.onSelect) env.onSelect(id); },
    reset() { S.mod = {}; S.cards.clear(); S.rail = null; S.dismissed.clear(); S.live.q.length = 0; S.T.have = false; S.hudHidden.clear(); sizeCache.clear(); },
    invalidateSizes() { sizeCache.clear(); },
    /** every card that is not pinned leaves (and may come back at once when its moment is reached again) */
    dismissAll() { for (const c of S.cards.values()) if (c.spec.kind !== 'hud' && c.spec.kind !== 'doc' && !c.pinned && c.phase !== 'out') { startExit(c); c.done = c.opacity < 0.02; } S.dismissed.clear(); },
    /** show a popup style now (the Tuning Studio's button): its module's preview() decides how */
    preview(defId) { const def = kernel.popups.has(defId) ? kernel.popups.get(defId) : null; if (!def || !def.preview) return false; def.preview(makeApi(S.frame, S.now, 0, def)); return true; }, applyViewport, makeApiFor(defId) { const def = kernel.popups.has(defId) ? kernel.popups.get(defId) : null; return makeApi(S.frame, S.now, 0, def); },
    chronicle() { const idx = allRows(); return { passed: idx.upTo(S.T.tau + 0.5), total: idx.rows.length, rows: idx.rows }; },
    /** the old entry point of the extension tests: placed cards with a leader */
    layout(frame, nowMs, dtMs = 16.667) { const out = api.frame(frame, nowMs, dtMs); return out.cards.filter((c) => c.rect).map((c) => ({ key: c.id, popup: c.popup, card: c.spec, x: c.rect.x, y: c.rect.y, w: c.rect.w, h: c.rect.h, anchor: c.anchorRect ? { x: (c.anchorRect.x0 + c.anchorRect.x1) / 2, y: (c.anchorRect.y0 + c.anchorRect.y1) / 2 } : null, leader: c.leader })); },
  };

  // ---- one frame ---------------------------------------------------------------------------------------------------------------------------------------------------
  api.frame = function frameStep(frame, nowMs, dtMs = 16.667) {
    const clk0 = typeof performance !== 'undefined' ? performance.now() : 0; S.now = nowMs; S.frame = frame; S.stats.frames++;
    if (!tok('popup.enabled')) return emptyOut();
    const M = motionTok(); timeStep(frame, dtMs); const T = S.T; const phone = isPhone();
    // a dismissed card returns once the clock has left its moment (a seek away), or from the Chronicle
    if (T.settled || T.playing) for (const [id, tick] of S.dismissed) if (Math.abs(T.tau - tick) > tok('popup.dismiss.recallTicks')) S.dismissed.delete(id);
    // jump hygiene: when a seek begins, what belongs to the old place leaves (pinned cards stay)
    if (T.seekStart) { const away = tok('popup.land.clearTicks'); for (const c of S.cards.values()) if (c.fired && !c.pinned && c.phase !== 'out' && c.spec.moment !== false && Math.abs(c.tick - T.target) > away) startExit(c); }
    // a landing card leaves when the paused clock has moved on
    if (T.settled && !T.playing) for (const c of S.cards.values()) if (c.fired && c.landAfter != null && !c.pinned && c.phase !== 'out' && c.spec.moment !== false && (T.tau < c.tick - 1.5 || T.tau > c.tick + c.landAfter + 1.5)) startExit(c);

    // 1. modules: state cards come back from update(); event cards are fired inside it
    for (const c of S.cards.values()) c.seen = false;
    for (const def of kernel.popups.list()) {
      if (!moduleOn(def)) continue; let list;
      try { list = def.update(frame, makeApi(frame, nowMs, dtMs, def)) || []; } catch (e) { S.errors.push(`${def.id}: ${e.message}`); if (S.errors.length < 4 && typeof console !== 'undefined') console.error(e); continue; }
      for (const raw of list) {
        const spec = normalize(def, raw); const id = idOf(def, spec.key); let c = S.cards.get(id);
        if (!c) { if (S.dismissed.has(id)) continue; c = makeCard(def, spec, nowMs, 'state'); S.cards.set(id, c); if (spec.kind === 'doc' && spec.openOnAppear) { c.spec = spec; api.openRail(id); } }
        else if (c.phase === 'out' && !c.fired && !S.dismissed.has(id)) { c.phase = 'show'; c.opacity = 1; c.from = 1; c.done = false; }
        c.spec = spec; c.seen = true; if (spec.pinned) c.pinned = true;
      }
    }
    for (const c of S.cards.values()) if (!c.fired && !c.seen && c.phase !== 'out') startExit(c);

    // 2. reading time runs in wall-clock ms while the battle plays; hovering, focusing or pinning stops it
    const playing = T.playing || T.gliding; const speedX = T.playing ? T.speed : Math.min(T.speed, 1);
    for (const c of S.cards.values()) { if (c.phase === 'out' || c.holdLeft == null) continue; if ((playing || c.spec.hold.always) && !c.pinned && !c.hovered && !c.focused) c.holdLeft -= dtMs; if (c.holdLeft <= 0) startExit(c); }

    // 3. policy: forms the speed allows, tier caps, chip cap
    const liveCards = [...S.cards.values()].filter((c) => c.phase !== 'out'); const floating = liveCards.filter((c) => c.spec.kind === 'card');
    const rank = (c) => (c.pinned ? 1e6 : 0) + (c.spec.priority || 0) * 1000 + c.seq * 0.001;          // of two cards of one priority the NEWER keeps the richer form; the older becomes a chip (02-popups.md 5.6)
    for (const c of floating) { c.allowed = levelFor(c, speedX); if (c.allowed >= 3 && !c.pinned && c.fired) startExit(c); }
    for (const tier of ['A', 'B']) {
      const group = floating.filter((c) => c.spec.tier === tier && c.phase !== 'out' && !c.pinned && Math.max(c.allowed, c.forceLevel) < 2).sort((a, b) => rank(b) - rank(a));
      group.slice(tier === 'A' ? tok('popup.queue.aliveA') : tok('popup.queue.aliveB')).forEach((c) => { c.forceLevel = 2; c.demoted = true; });
    }
    const minShow = tok('popup.queue.chipMinShowMs');   // a chip is never pushed out before it has been on show this long (at 16x a new one arrives every half second)
    floating.filter((c) => c.phase !== 'out' && !c.pinned && (Math.max(c.allowed, c.forceLevel) >= 2 || c.lane)).sort((a, b) => b.seq - a.seq).slice(tok('popup.queue.aliveChips')).filter((c) => nowMs - c.born >= minShow).forEach((c) => startExit(c));
    const chipMax = tok('popup.dwell.chipMaxMs'); for (const c of floating) if (c.demoted && c.holdLeft != null && c.holdLeft > chipMax) c.holdLeft = chipMax;

    // 4. anchors and the occupancy grid of the frame being drawn.  The rail is about to take its place: cards are placed for the map as it will BE (a card under the rail's final edge moves once, now)
    stepInset(dtMs); const tgt = insetTarget(); const m = { w: Math.max(100, S.size.w - tgt.right), h: Math.max(100, S.size.h - tgt.bottom) }; const chrome = chromeNow(); const sf0 = chrome.safe || NO_CHROME().safe; const sf = { ...sf0, bottom: tgt.bottom > 0 ? 0 : sf0.bottom }; const tileByKey = new Map(); for (const t of frame.tiles) tileByKey.set(t.key, t);
    const gap = tok('popup.place.gapPx'); const occ = new Occupancy(m.w, m.h, tok('popup.place.gridPx'));
    const obs = tileObstacles(frame, { minOpacity: tok('popup.place.obstacleOpacity'), hulls: tok('scene.hulls'), leaders: true }); for (const r of obs) occ.add(r, gap);
    const band = (r) => occ.add(r, gap, { kind: 'chrome', owner: 'chrome' });                // the interface keeps the same clear gap as a tile, so a card that rises while it enters never touches it
    if (sf.top > 0) band({ x0: 0, y0: 0, x1: m.w, y1: sf.top }); if (sf.bottom > 0) band({ x0: 0, y0: m.h - sf.bottom, x1: m.w, y1: m.h });
    if (sf.left > 0) band({ x0: 0, y0: 0, x1: sf.left, y1: m.h }); if (sf.right > 0) band({ x0: m.w - sf.right, y0: 0, x1: m.w, y1: m.h });
    for (const r of chrome.rects || []) occ.add(r, 4, { kind: 'chrome', owner: 'chrome' });
    occ.build();
    const hitsRaw = (r) => obs.some((o) => overlaps(r, o, 0)); const nearRaw = (r, pad) => obs.some((o) => overlaps(r, o, pad));
    const chromeRects = occ.rects.filter((q) => q.kind === 'chrome'); const outOrChrome = (r) => r.x0 < 0 || r.y0 < 0 || r.x1 > m.w || r.y1 > m.h || chromeRects.some((q) => overlaps(r, q, 0));
    const reserve = new Map(); for (const c of S.cards.values()) if (!c.done && c.rect && !c.lane && !c.hidden) reserve.set(c.id, c.pending ? [c.rect.r, c.pending.r] : [c.rect.r]);
    const othersOf = (c) => { const o = []; for (const [id, rs] of reserve) if (id !== c.id) for (const r of rs) o.push(r); return o; };
    const P = { m, occ, gap, sf, hitsRaw, nearRaw, outOrChrome, reserve, othersOf, taken: [], now: nowMs, M, phone, placeTok: { offset: tok('popup.place.anchorOffsetPx'), crossPenalty: tok('popup.place.crossPenalty'), pull: tok('popup.place.stayPull') }, margin: tok('popup.place.marginPx'), softPad: tok('popup.place.relocateMarginPx'), maxLeader: tok('popup.place.maxLeaderPx') };

    // 5. placement: HUD first (they are persistent), then cards by rank
    const placeable = liveCards.filter((c) => c.spec.kind !== 'doc').concat([...S.cards.values()].filter((c) => c.phase === 'out' && c.spec.kind !== 'doc' && !c.done));
    placeable.sort((a, b) => (a.spec.kind === 'hud' ? 0 : 1) - (b.spec.kind === 'hud' ? 0 : 1) || rank(b) - rank(a));
    const tp0 = typeof performance !== 'undefined' ? performance.now() : 0;
    for (const c of placeable) {
      c.subj = resolveSubjects(c.spec, frame, tileByKey);
      c.anchorRect = c.subj.tiles.length ? tileRectOf(c.subj.tiles[0].t, frame.view) : c.subj.point ? rectOf(c.subj.point.x, c.subj.point.y, 0, 0) : null;
      if (P.phone && c.spec.hideOnPhone) { c.hidden = true; c.rect = null; P.reserve.delete(c.id); continue; }
      if (c.spec.kind === 'hud') placeHud(c, P); else placeFloating(c, P);
    }
    const tpMs = (typeof performance !== 'undefined' ? performance.now() : 0) - tp0; S.stats.placeMsSum += tpMs; if (tpMs > S.stats.maxPlaceMs) S.stats.maxPlaceMs = tpMs;

    // the strip never shows more chips than the dial allows (cards that fell to the lane this frame count; the oldest leave, their rows stay in the Chronicle)
    [...S.cards.values()].filter((c) => c.lane && c.phase !== 'out' && !c.pinned && c.spec.kind === 'card').sort((a, b) => b.seq - a.seq).slice(tok('popup.queue.aliveChips')).filter((c) => nowMs - c.born >= minShow).forEach((c) => startExit(c));
    // 6. motion: phases -> opacity; a card that a tile touches is cut
    for (const c of S.cards.values()) advancePhase(c, nowMs, M, hitsRaw);
    for (const c of S.cards.values()) if (c.phase === 'out' && c.done) S.cards.delete(c.id);
    if (S.rail && S.rail.live) { const lc = S.cards.get(S.rail.id); if (!lc || lc.phase === 'out') S.rail = null; else S.rail.doc = lc.spec.doc; }
    narrate();
    if (S.rail && !S.rail.framed) { S.rail.framed = true; if (!S.rail.doc.noFrame && S.rail.doc.subjects) frameRailSubject(S.rail.doc, frame, tileByKey); }

    // 7. outputs
    let overlap = 0; for (const c of S.cards.values()) if (c.rect && !c.lane && !c.hidden && c.opacity >= 0.2 && hitsRaw(c.rect.r)) overlap++;
    if (overlap) S.stats.overlapFrames++;
    const out = buildOut(frame, nowMs, M, tileByKey, overlap); out.hostMs = (typeof performance !== 'undefined' ? performance.now() : 0) - clk0; return out;
  };

  function emptyOut() { return { cards: [], strip: { chips: [], passed: 0, total: 0, rows: [] }, rail: null, inset: { right: 0, bottom: 0 }, mapRect: { w: S.size.w, h: S.size.h }, fx: { leaders: [], rings: [], places: [], arrows: [] }, live: null, busy: false, stats: S.stats, errors: S.errors, overlap: 0, hostMs: 0 }; }

  /** the card's content may have changed size since it was placed (a burst that grew, the legend that opened): use the real size from now on and let the checks below decide whether it still fits */
  function syncSize(c, P) {
    if (c.lane || c.hidden || !c.rect || c.phase === 'out' && false) return; const f = c.spec.forms[Math.min(c.fi, c.spec.forms.length - 1)]; if (!f) return; const sz = measure(c, f);
    if (Math.abs(sz.h - c.rect.h) > 0.5 || Math.abs(sz.w - c.rect.w) > 0.5) { c.rect = { x: c.rect.x, y: c.rect.y, w: sz.w, h: sz.h, r: rectOf(c.rect.x, c.rect.y, sz.w, sz.h) }; P.reserve.set(c.id, c.pending ? [c.rect.r, c.pending.r] : [c.rect.r]); if (c.pending) { c.pending = { ...c.pending, w: sz.w, h: sz.h, r: rectOf(c.pending.x, c.pending.y, sz.w, sz.h) }; } }
  }
  // ---- placement of one floating card ------------------------------------------------------------------------------------------------------------------------
  function placeFloating(c, P) {
    const { occ, gap, hitsRaw, nearRaw, now, M, m } = P; const taken = P.othersOf(c); const spec = c.spec; const forms = spec.forms; if (!forms.length) return;
    if (c.phase === 'out') { if (c.rect && !c.lane && (hitsRaw(c.rect.r) || P.outOrChrome(c.rect.r))) { c.opacity = 0; c.done = true; P.reserve.delete(c.id); } return; }
    syncSize(c, P); const level = Math.max(c.allowed, c.forceLevel); let minFi = forms.findIndex((f) => LEVEL[f.level] >= level); if (minFi < 0) minFi = forms.length - 1;
    const toLane = (fi) => { if (!c.lane) { c.lane = true; c.rect = null; c.pending = null; c.leaderT0 = now; c.pulseT0 = now; S.stats.laneFalls++; } c.fi = fi; P.reserve.delete(c.id); };
    const chipFi = () => { const i = forms.findIndex((f) => f.lane); return i >= 0 ? i : -1; };
    // no free-standing cards on the phone, and a subject-less card has nothing to stand next to: the chip in the Chronicle strip (cards that bring their own slots are placed there instead)
    if (spec.kind === 'card' && (P.phone || (!c.anchorRect && !spec.slots))) { const i = chipFi(); if (i >= 0) { toLane(i); return; } if (P.phone) { c.hidden = true; return; } }
    if (c.fi < minFi) { c.fi = minFi; c.needsPlace = true; }
    // is the current place still good?
    if (!c.lane && c.rect && !c.needsPlace) {
      const r = c.rect.r;
      if (hitsRaw(r)) { c.cut = true; c.needsPlace = true; S.stats.cuts++; }
      else if (P.outOrChrome(r)) { c.cut = true; c.needsPlace = true; }
      else if (c.phase !== 'moveOut' && (nearRaw(r, P.softPad) || taken.some((t) => overlaps(r, t, 2)))) c.needsPlace = true;
    }
    // a card pushed down the ladder tries the richer form again when things have been calm for a while
    if (c.fi > minFi && !c.needsPlace && now - c.lastPlaceAt > tok('popup.place.upgradeAfterMs') && now - c.stableSince > tok('popup.place.upgradeAfterMs')) { c.needsPlace = true; c.upgrade = true; }
    if (c.hidden && !c.needsPlace && now - c.lastPlaceAt < 250) return;
    if (c.needsPlace || (!c.rect && !c.lane)) {
      const prev = c.rect; const start = c.upgrade ? minFi : c.fi; let chosen = null;
      for (let fi = start; fi < forms.length && !chosen; fi++) {
        const f = forms[fi]; if (f.lane) { chosen = { lane: true, fi }; break; }
        const sz = measure(c, f); let spot = null;
        if (spec.slots && !c.anchorRect) {
          for (const s of spec.slots) { const xy = slotXY(s, sz.w, sz.h, P); if (occ.isFree(xy.x, xy.y, sz.w, sz.h) && !taken.some((t) => overlaps(rectOf(xy.x, xy.y, sz.w, sz.h), t, gap * 0.5))) { spot = xy; break; } }
          if (!spot) { const x0 = slotXY(spec.slots[0], sz.w, sz.h, P); spot = findSpot({ w: sz.w, h: sz.h, anchor: rectOf(x0.x + sz.w / 2, x0.y + sz.h / 2, 0, 0), occ, taken, gap, margin: P.margin, prefer: prev ? { x: prev.x, y: prev.y } : null, tok: { ...P.placeTok, offset: 0 } }); }
        }
        else spot = findSpot({ w: sz.w, h: sz.h, anchor: c.anchorRect, occ, taken, gap, margin: P.margin, prefer: prev ? { x: prev.x, y: prev.y } : null, tok: P.placeTok, skipOwner: c.subj && c.subj.tiles[0] ? c.subj.tiles[0].t.key : undefined });
        if (spot && c.anchorRect && forms.some((q) => q.lane)) {                                    // a card whose leader would run across the map is worse than a chip with an arrival cue
          const ax = clamp((c.anchorRect.x0 + c.anchorRect.x1) / 2, 0, m.w); const ay = clamp((c.anchorRect.y0 + c.anchorRect.y1) / 2, 0, m.h); const e = clampPt(rectOf(spot.x, spot.y, sz.w, sz.h), ax, ay);
          if (Math.hypot(e[0] - ax, e[1] - ay) > P.maxLeader) spot = null;
        }
        if (spot) chosen = { fi, x: spot.x, y: spot.y, w: sz.w, h: sz.h };
      }
      const wasUpgrade = c.upgrade; c.upgrade = false; c.needsPlace = false; c.lastPlaceAt = now;
      if (wasUpgrade && (!chosen || chosen.fi >= c.fi)) chosen = null;                       // an upgrade that found nothing richer changes nothing
      if (wasUpgrade && !chosen) { /* keep as is */ }
      else if (!chosen) { const i = chipFi(); if (i >= 0) toLane(i); else { c.hidden = true; c.rect = null; c.cut = false; P.reserve.delete(c.id); return; } }
      else if (chosen.lane) toLane(chosen.fi);
      else {
        const nr = { x: chosen.x, y: chosen.y, w: chosen.w, h: chosen.h, r: rectOf(chosen.x, chosen.y, chosen.w, chosen.h) };
        const moved = !!prev && (Math.abs(prev.x - chosen.x) > 1 || Math.abs(prev.y - chosen.y) > 1 || c.fi !== chosen.fi); const fresh = !prev; c.hidden = false;
        if (moved && c.phase === 'show' && !c.cut && !M.reduced) { c.pending = nr; c.pendingFi = chosen.fi; c.phase = 'moveOut'; c.t0 = now; c.from = c.opacity; S.stats.relocations++; }
        else {
          c.rect = nr; c.fi = chosen.fi; c.pending = null; c.stableSince = now; S.stats.placements++;
          if (fresh || c.lane) { c.leaderT0 = now; if (c.phase !== 'in') c.pulseT0 = now; }
          if (moved) { c.leaderT0 = now; c.phase = 'moveIn'; c.t0 = now; c.opacity = 0; }
          c.lane = false;
        }
        if (c.cut) { c.cut = false; if (c.phase === 'show') { c.phase = 'moveIn'; c.t0 = now; c.opacity = 0; } }
      }
    }
    if (c.rect && !c.lane && !c.hidden) P.reserve.set(c.id, c.pending ? [c.rect.r, c.pending.r] : [c.rect.r]); else P.reserve.delete(c.id);
  }

  // ---- HUD cards: a home slot, collapse when a tile is in the way, come back after a calm delay -----------------------------------------------------------------
  function slotXY(slot, w, h, P) {
    const { m, sf } = P; const mx = 12; const L = (sf.left || 0) + mx; const R = m.w - (sf.right || 0) - mx - w; const Tp = (sf.top || 0) + mx; const B = m.h - (sf.bottom || 0) - mx - h; const Cx = Math.max(L, Math.min(R, (L + R) / 2));
    return { tl: { x: L, y: Tp }, tr: { x: R, y: Tp }, bl: { x: L, y: B }, br: { x: R, y: B }, tc: { x: Cx, y: Tp }, bc: { x: Cx, y: B } }[slot] || { x: L, y: Tp };
  }
  function placeHud(c, P) {
    const { occ, gap, hitsRaw, now } = P; const taken = P.othersOf(c); const spec = c.spec; const forms = spec.forms; const slots = spec.slots || ['tl']; if (!forms.length) return;
    if (c.phase === 'out') { if (c.rect && (hitsRaw(c.rect.r) || P.outOrChrome(c.rect.r))) { c.opacity = 0; c.done = true; P.reserve.delete(c.id); } return; }
    if (c.rect && !c.hidden) { syncSize(c, P); const r = c.rect.r; if (!hitsRaw(r) && !P.outOrChrome(r) && !taken.some((t) => overlaps(r, t, 0))) { P.reserve.set(c.id, [r]); return; } }
    const lastHidden = S.hudHidden.get(c.id); if (c.hidden && lastHidden != null && now - lastHidden < tok('popup.hud.returnDelayMs')) { c.rect = null; P.reserve.delete(c.id); return; }
    let found = null;
    for (let fi = 0; fi < forms.length && !found; fi++) {
      const sz = measure(c, forms[fi]);
      for (const s of slots) { const xy = slotXY(s, sz.w, sz.h, P); if (occ.isFree(xy.x, xy.y, sz.w, sz.h) && !taken.some((t) => overlaps(rectOf(xy.x, xy.y, sz.w, sz.h), t, gap * 0.5))) { found = { fi, slot: s, x: xy.x, y: xy.y, w: sz.w, h: sz.h }; break; } }
    }
    if (!found) { if (!c.hidden) { c.hidden = true; c.rect = null; S.hudHidden.set(c.id, now); } P.reserve.delete(c.id); return; }
    const was = c.hidden || !c.rect; c.hidden = false; c.fi = found.fi; c.hudSlot = found.slot; c.rect = { x: found.x, y: found.y, w: found.w, h: found.h, r: rectOf(found.x, found.y, found.w, found.h) }; P.reserve.set(c.id, [c.rect.r]);
    if (was && c.phase === 'show') { c.phase = 'moveIn'; c.t0 = now; c.opacity = 0; }
  }

  // ---- phases ---------------------------------------------------------------------------------------------------------------------------------------------------------
  function advancePhase(c, now, M, hitsRaw) {
    let L = look(c.phase, now, c.t0, M, c.from);
    if (c.phase === 'in' && L.done) { c.phase = 'show'; L = look('show', now, c.t0, M); }
    else if (c.phase === 'moveIn' && L.done) { c.phase = 'show'; L = look('show', now, c.t0, M); }
    else if (c.phase === 'moveOut' && L.done) {
      if (c.pending) { c.rect = c.pending; c.fi = c.pendingFi; c.pending = null; c.leaderT0 = now; c.stableSince = now; c.lane = false; S.stats.placements++; }
      c.phase = 'moveIn'; c.t0 = now; L = look('moveIn', now, now, M);
    } else if (c.phase === 'out' && L.done) { c.done = true; L = { opacity: 0, dy: 0, scale: 1 }; }
    c.opacity = c.hidden ? 0 : L.opacity; c.dy = L.dy; c.scale = L.scale;
    // the guarantee: a visible card never lies on a tile.  The placement above keeps it clear; this is the last check before it is drawn.
    if (c.opacity > 0.01 && c.rect && !c.lane && c.spec.kind !== 'doc' && hitsRaw(c.rect.r)) { c.opacity = 0; S.stats.cutFrames++; }
  }

  // ---- narrated mode: ease the clock down while a critical card is read -----------------------------------------------------------------------------------------
  function narrate() {
    const mode = tok('popup.narrate.mode'); let want = 1;
    if (mode !== 'off' && !reducedNow() && S.T.playing) {
      const reading = [...S.cards.values()].some((c) => c.fired && c.phase !== 'out' && !c.lane && !c.hidden && c.holdLeft != null && c.holdLeft > 0 && !c.pinned && (mode === 'cards' ? (c.spec.tier === 'A' || c.spec.tier === 'B') : c.spec.narrate === true));
      if (reading) want = tok('popup.narrate.factor');
    }
    if (engine.transport.setSlow && want !== S.slowSet) { engine.transport.setSlow(want); S.slowSet = want; }
  }

  // ---- outputs ---------------------------------------------------------------------------------------------------------------------------------------------------------
  function buildOut(frame, nowMs, M, tileByKey, overlap) {
    const reduced = M.reduced; const leaders = []; const rings = []; const places = []; const arrows = []; const stripChips = []; const cards = []; const m = mapSize(); const T = S.T;
    const leaderMs = tok('popup.motion.leaderMs'); const pulseMs = tok('popup.motion.pulseMs');
    const fxFor = (subj, tone, leaderT0, pulseT0, anchorRect, from, alpha) => {
      const p = leaderProgress(nowMs, leaderT0, leaderMs, reduced); const pu = pulse(nowMs, pulseT0, pulseMs, reduced);
      subj.tiles.forEach((st, i) => {
        const r = tileRectOf(st.t, frame.view); const on = r.x1 > 0 && r.x0 < m.w && r.y1 > 0 && r.y0 < m.h;
        if (on) rings.push({ rect: r, tone, strength: i === 0 ? 1 : 0.5, pulse: i === 0 ? pu : null, alpha, via: st.via, dashed: st.via === 'parent' });
        else if (i === 0) { const cx = clamp((r.x0 + r.x1) / 2, 14, m.w - 14); const cy = clamp((r.y0 + r.y1) / 2, 14, m.h - 14); arrows.push({ x: cx, y: cy, ang: Math.atan2((r.y0 + r.y1) / 2 - cy, (r.x0 + r.x1) / 2 - cx), tone, alpha }); }
      });
      if (subj.point) { const q = subj.point; if (q.x > 0 && q.x < m.w && q.y > 0 && q.y < m.h) places.push({ x: q.x, y: q.y, r: 20, tone, alpha, label: subj.placeLL && subj.placeLL.label }); else { const cx = clamp(q.x, 14, m.w - 14); const cy = clamp(q.y, 14, m.h - 14); arrows.push({ x: cx, y: cy, ang: Math.atan2(q.y - cy, q.x - cx), tone, alpha }); } }
      if (from && anchorRect) {
        const tx = (anchorRect.x0 + anchorRect.x1) / 2; const ty = (anchorRect.y0 + anchorRect.y1) / 2;
        if (tx > 0 && tx < m.w && ty > 0 && ty < m.h) { let e = subj.tiles.length ? clampPt(anchorRect, from.x, from.y) : [tx, ty]; if (subj.tiles.length && anchorRect.gx != null) { const dx = anchorRect.gx - from.x; const dy = anchorRect.gy - from.y; const d = Math.hypot(dx, dy) || 1; e = [anchorRect.gx - dx / d * (anchorRect.gr + 1.5), anchorRect.gy - dy / d * (anchorRect.gr + 1.5)]; } leaders.push({ x0: from.x, y0: from.y, x1: e[0], y1: e[1], tone, p, alpha, onTile: subj.tiles.length > 0 }); }
      }
    };
    let newestLane = null; for (const c of S.cards.values()) if (c.lane && c.phase !== 'out' && c.spec.kind === 'card' && (!newestLane || c.seq > newestLane.seq)) newestLane = c;
    for (const c of [...S.cards.values()].sort((a, b) => a.seq - b.seq)) {
      const spec = c.spec; const f = spec.forms && spec.forms.length ? spec.forms[Math.min(c.fi, spec.forms.length - 1)] : null; const inLane = c.lane && c.phase !== 'out' && !c.hidden && spec.kind === 'card';
      const rec = { id: c.id, popup: c.def ? c.def.id : 'host', key: c.key, spec, form: f, formIdx: c.fi, rect: c.rect && !c.lane && !c.hidden ? { x: c.rect.x, y: c.rect.y, w: c.rect.w, h: c.rect.h } : null, opacity: c.opacity, dy: c.dy, scale: c.scale, phase: c.phase, lane: inLane, hidden: c.hidden, pinned: c.pinned,
        hold: c.holdLeft != null && c.holdTotal ? { frac: clamp(c.holdLeft / c.holdTotal, 0, 1), left: c.holdLeft, total: c.holdTotal, paused: !(T.playing || T.gliding) || c.hovered || c.focused || c.pinned } : null,
        tick: c.tick, seq: c.seq, version: spec.version ?? 0, kind: spec.kind, tier: spec.tier, tone: spec.tone, level: f ? f.level : 'full', hudSlot: c.hudSlot, anchorRect: c.anchorRect, leader: null, subjectVia: c.subj && c.subj.tiles[0] ? c.subj.tiles[0].via : null };
      cards.push(rec);
      if (c.subj && spec.kind !== 'hud' && spec.kind !== 'doc' && c.phase !== 'out' || (c.phase === 'out' && c.opacity > 0.02)) {
        if (c.rect && !c.lane && !c.hidden && c.anchorRect) { const a = c.anchorRect; const fp = clampPt(c.rect.r, (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2); rec.leader = [fp[0], fp[1], (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2]; fxFor(c.subj, spec.tone || 'info', c.leaderT0, c.pulseT0, c.anchorRect, { x: fp[0], y: fp[1] }, c.opacity); }
        else if (inLane) { const lr = S.laneRects[c.id]; const held = c.hovered || c.focused || c.pinned; const cueMs = tok('popup.motion.arrivalCueMs'); const age = nowMs - c.born; const cue = held ? 1 : (c === newestLane && age < cueMs ? 1 - age / cueMs : 0); if (cue > 0.02) fxFor(c.subj, spec.tone || 'info', c.leaderT0, c.pulseT0, c.anchorRect, lr ? { x: (lr.x0 + lr.x1) / 2, y: lr.y0 } : null, cue); }
      }
      if (inLane) stripChips.push(rec);
    }
    if (S.rail && S.rail.doc && S.rail.doc.subjects) {
      const subj = resolveSubjects(S.rail.doc, frame, tileByKey); const ar = subj.tiles.length ? tileRectOf(subj.tiles[0].t, frame.view) : subj.point ? rectOf(subj.point.x, subj.point.y, 0, 0) : null;
      if (ar) fxFor(subj, S.rail.doc.tone || 'info', S.rail.openedAt, S.rail.openedAt, ar, { x: m.w, y: clamp((ar.y0 + ar.y1) / 2, 16, m.h - 16) }, 0.7);
    }
    const idx = allRows(); stripChips.sort((a, b) => b.seq - a.seq);
    const rail = S.rail ? { id: S.rail.id, doc: S.rail.doc, live: S.rail.live, openedAt: S.rail.openedAt, widthPx: S.inset.right, phone: isPhone(), detent: S.sheet, progress: S.inset.right ? S.inset.vr / S.inset.right : S.inset.bottom ? S.inset.vb / S.inset.bottom : 1, tick: S.rail.tick } : null;
    return { cards, strip: { chips: stripChips, passed: idx.upTo(T.tau + 0.5), total: idx.rows.length, rows: idx.rows }, rail, inset: { right: S.inset.vr, bottom: S.inset.vb }, mapRect: { w: m.w, h: m.h }, placeRect: (() => { const t = insetTarget(); return { w: S.size.w - t.right, h: S.size.h - t.bottom }; })(), fx: { leaders, rings, places, arrows },
      live: flushLive(nowMs), busy: api.busy(), stats: S.stats, errors: S.errors, overlap, time: { ...T }, slow: S.slowSet, phone: isPhone(), hostMs: 0 };
  }

  return api;
}
