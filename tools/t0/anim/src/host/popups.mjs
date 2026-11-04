// host/popups.mjs - THE POPUPS: every popup of the app is kept (the same components, words, triggers, keys and dismissal), restyled in the language of the marks and placed on ground the marks do not use.
//
//   1. STYLE   one stylesheet (host/chrome.css.mjs, tokens as CSS custom properties) restyles the app's cards in the look: warm smoked glass, cream ink, a brass hairline, a small flag-tab on every card in its own
//              tone.  The cards are found by role, aria-label, id or data-gtbg-card and tagged data-gta="<kind>"; nothing in the app's markup changes.
//   2. PLACE   the cards that float over the map (the event card, the story card, the tour panel, the unit panel, the command toasts) are moved with the CSS `translate` property (React never writes it) onto ground
//              that no mark uses: the free-space search of popups/geom.mjs over the footprints of the marks and the rectangles of the interface, nearest to the card's subject (the unit or the place the card is about),
//              judged about six times a second, and a card that must move glides there.  A card that already sits on free ground is never touched.
//   3. POINT   the subject of a card carries a ring on the map and a thin leader runs to the card (drawn on the unit canvas, beneath the marks).
//   4. STAGE   the interface that covers the map (the timeline dock, the controls, the cards, the legend, the overview) is the edge of the stage: a mark whose whole footprint is not on the stage is eased out as one
//              piece (never half under glass, never cut by a bar).
//   5. SAY     the legend is the active skin's own legend(): what each mark claims and how well that is known (the app's own legend described encodings that no longer exist); hovering a mark shows a small card
//              (a unit: its name, its order of battle chain, its strength as a placement value; a crowd: the units it stands for).
import { Occupancy, findSpot, rectOf, overlaps } from './geom.mjs';
import { CHROME_CSS } from './chrome.css.mjs';

const EDGE = 6;
const KINDS = ['event', 'story', 'tour', 'mon', 'unit', 'toast', 'legend', 'hud', 'minimap'];

export function createPopups(S) {
  const doc = window.document; const root = doc.body;
  // spots is a WeakMap: the app makes a new card element for every event and drops the old one, and a Map keyed by the element kept every dropped card (with its listeners): 17 DOM nodes and 1.4 listeners a second of playback (PERF3)
  const P = { pad: 0, nodes: {}, rects: [], extra: [], chrome: [], stage: { x0: EDGE, y0: EDGE, x1: 1e5, y1: 1e5 }, last: 0, dirty: true, subj: [], spots: new WeakMap(), tip: null, chron: null, chronBusy: false, lastKey: '', mo: null, legendFor: null };
  // The legend keeps the published default (open at the first moment for a first-time visitor); a default view is the owner's to change (CLAUDE.md law 6, Release 1 regression check: the published page shows the legend at tick 1).  A viewer's own choice (gtbg_prefs.showLegend) is kept by the app itself.
  const css = doc.createElement('style'); css.id = 'gtanim-chrome'; css.textContent = CHROME_CSS; doc.head.appendChild(css);
  // a card that appears while the picture is at rest wakes the engine so that it is placed at once
  // R1E: and it is placed BEFORE it is first painted.  The observer's callback is a microtask of the task that committed the card, so it runs before the browser's next rendering step: the card is judged against the marks of the last
  // frame and moved with the translate property in that same task, never painted on ground a neighbour uses (it used to be seen at its natural place until the next frame of the engine, 50 to 400 ms on a loaded machine, and then moved).
  // It no longer asks the map to repaint (triggerRepaint renders the whole WebGL map, 15 to 40 ms of a 4x phone's frame, for a DOM change that the unit canvas does not even show): the engine's own animation frame is woken instead.
  try {
    const CARD = '[data-gtbg-card],#gt-unit-panel,.gtbg-card'; const isCard = (n) => n.nodeType === 1 && (n.matches(CARD) || !!n.querySelector(CARD) || (n.parentElement && n.parentElement.matches('[role="log"][aria-label="Battle events"]')));
    const placeNow = () => { if (!P.busy && S.state === 1 && S.core && S.core.frame && S.store) { P.busy = true; try { api.update(S.core.frame, S.store.getState()); } catch (e) { S.lastError = String((e && e.stack) || e).slice(0, 600); if (S.strict) throw e; } finally { P.busy = false; try { P.mo.takeRecords(); } catch { /* gone */ } } } };
    P.mo = new window.MutationObserver((recs) => {
      P.dirty = true;
      let card = false; for (const r of recs) { for (const n of r.addedNodes) if (isCard(n)) { card = true; break; } if (card) break; }      // only a card that has just been ADDED is placed in this microtask; any other change of the page waits for the engine's next frame as before
      if (card) placeNow();
      try { if (S.wake && S.state === 1) S.wake(); } catch { /* the map is gone */ }
    }); P.mo.observe(root, { childList: true, subtree: true });
    // A card that changes SIZE without a change of the DOM (the page's face finishes loading and the words re-wrap, a story arrives with a longer text, the legend is opened) wakes the engine: its next frame places the cards again.  Without it the card stood on its
    // neighbour until something else woke the engine, and an engine that is asleep has no next frame (T0-POL-02 at 1024: a story card 20 px taller after the face had loaded, seen for as long as 900 ms on a loaded machine).  The observer only wakes: the placement may
    // change a card's size (the ladder of forms), and a ResizeObserver callback that changes the size of an observed element ends in the browser's "loop completed with undelivered notifications" error.
    if (window.ResizeObserver) { P.ro = new window.ResizeObserver(() => { P.dirty = true; try { if (S.wake && S.state === 1) S.wake(); } catch { /* the map is gone */ } }); P.watched = new Set(); }
  } catch { /* a page without observers rescans on the timer */ }

  // ---- the chronology (subjects of the event cards): the same files the app loads, read once ---------------------------------------------------------------
  function loadChronology() {
    if (P.chron || P.chronBusy) return; P.chronBusy = true;
    Promise.all([1, 2, 3].map((d) => window.fetch('/data/chronology_day' + d + '.json').then((r) => r.json()).catch(() => ({ events: [] })))).then((all) => {
      const by = {}; for (const f of all) for (const e of f.events || []) { (by[e.tick] || (by[e.tick] = [])).push(e); } P.chron = by;
    }).catch(() => { P.chron = {}; });
  }

  // ---- finding the cards ---------------------------------------------------------------------------------------------------------------------------------------------------------
  function scan() {
    const q = (s) => doc.querySelector(s); const n = {};
    n.event = q('[data-gtbg-card="1"]'); n.story = q('[data-gtbg-card="2"]'); n.tour = q('[data-gtbg-card="3"]'); n.mon = q('[data-gtbg-card="4"]'); n.unit = q('#gt-unit-panel');
    n.toast = q('[role="log"][aria-label="Battle events"]'); n.legend = q('[role="group"][aria-label="Legend"]');
    n.hud = P.nodes.hud && P.nodes.hud.isConnected ? P.nodes.hud : null; n.minimap = null;
    const mc = q('main#root canvas[title^="Click to"]'); if (mc) n.minimap = mc.parentElement;        // the overview: its wrapper (header, canvas, footer)
    if (!n.hud) for (const d of doc.querySelectorAll('main#root div')) { if (d.children.length === 0 && /\(base speed\)|\bspeed\)/.test(d.textContent)) { n.hud = d.closest('div[style*="position: absolute"]'); break; } }      // the day badge: the absolute card around "1x (base speed)"
    for (const k of KINDS) { const el = n[k]; if (el && el.getAttribute('data-gta') !== k) el.setAttribute('data-gta', k); }
    if (P.ro) { for (const el of P.watched) if (!el.isConnected) { P.ro.unobserve(el); P.watched.delete(el); } for (const k of KINDS) { const el = n[k]; if (el && !P.watched.has(el)) { P.watched.add(el); P.ro.observe(el); } } }      // (R1E: see the observer of cards above)
    for (const [k, el] of Object.entries(P.nodes)) if (el && el !== n[k] && el.getAttribute) el.removeAttribute('data-gta');
    P.nodes = n; return n;
  }
  const cvRect = () => S.canvas.getBoundingClientRect();
  /** the translate the card is drawn with RIGHT NOW (a gliding card is partway between its old and its new place; the wanted translate in P.spots is where it will end up, which is not what getBoundingClientRect measured) */
  function appliedTranslate(el) { const m = /^(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?/.exec(window.getComputedStyle(el).translate || ''); return m ? { tx: +m[1], ty: +(m[2] || 0) } : { tx: 0, ty: 0 }; }
  /** where a card WILL stand once its glide ends (its drawn box moved by wanted-minus-applied translate): decisions about a neighbour are taken against that, never against a box caught in mid-glide */
  function targetRect(el, c) { const r = relRect(el, c, false); const w = P.spots.get(el); if (!w) return r; const a = appliedTranslate(el); const dx = w.tx - a.tx, dy = w.ty - a.ty; return { x0: r.x0 + dx, y0: r.y0 + dy, x1: r.x1 + dx, y1: r.y1 + dy }; }
  function relRect(el, c, minusT) {
    const r = el.getBoundingClientRect(); const t = minusT ? appliedTranslate(el) : { tx: 0, ty: 0 };
    return { x0: r.left - c.left - t.tx, y0: r.top - c.top - t.ty, x1: r.right - c.left - t.tx, y1: r.bottom - c.top - t.ty };
  }

  // ---- the interface rectangles that cover the map (canvas px) -----------------------------------------------------------------------------------------------------
  function chromeRects(c) {
    const out = []; const add = (el, pad = 0) => { if (!el) return; const cs = window.getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return; const r = relRect(el, c, false); if (r.x1 - r.x0 < 4 || r.y1 - r.y0 < 4) return; out.push({ x0: r.x0 - pad, y0: r.y0 - pad, x1: r.x1 + pad, y1: r.y1 + pad }); };
    for (const k of ['legend', 'minimap', 'hud']) add(P.nodes[k]);
    add(doc.getElementById('gt-timeline')); add(doc.getElementById('extra-features'), 2);
    for (const el of doc.querySelectorAll('.mapboxgl-ctrl-top-right, .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-bottom-left, .gtb63-ctl, .gtbg-m-legend, .gtbg-m-mini')) add(el);   // .gtb63-ctl: group BASE1863's permanent map label (a card never lands on it)
    for (const b of doc.querySelectorAll('main#root button')) { if (/Trails/.test(b.textContent) && b.textContent.length < 20) add(b, 2); else if (/NPS Auto Tour/.test(b.textContent)) add(b, 2); }
    return out;
  }
  function floatingRects(c) { const out = []; for (const k of ['event', 'story', 'tour', 'unit', 'toast']) { const el = P.nodes[k]; if (el) { const r = relRect(el, c, false); out.push({ ...r, kind: k }); } } return out; }

  // ---- placement ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  function markRects(F, pad) {
    const v = F.view; const out = [];
    for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.2) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + v.dx; const y = t.y + v.dy; out.push({ x0: x - hw - pad, y0: y - hh - pad, x1: x + hw + pad, y1: y + hh + pad, id: t.ids[0], key: t.key }); }
    for (const r of monRects(pad)) out.push(r);
    return out;
  }
  /** the Monuments layer's dots and stars on screen (when the layer is on): a card never hides the thing a viewer is about to click (the stars always, the dots from zoom 15, where they are big enough to aim at); cached for 250 ms */
  function monRects(pad) {
    const map = S.map; if (!map) return [];
    const now = window.performance.now(); const C = P.monCache; if (C && now - C.t < 250 && C.pad === pad) return C.out;
    const out = [];
    try {
      const ids = (map.getZoom() >= 15 ? ['gtmon-stars', 'gtmon-dots'] : ['gtmon-stars']).filter((l) => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== 'none');
      if (ids.length) { const seen = new Set(); for (const f of map.queryRenderedFeatures(undefined, { layers: ids })) { const g = f.geometry; if (!g || g.type !== 'Point') continue; const key = g.coordinates[0] + ',' + g.coordinates[1]; if (seen.has(key)) continue; seen.add(key); const q = map.project(g.coordinates); const h = (f.layer.id === 'gtmon-stars' ? 11 : 7) + pad; out.push({ x0: q.x - h, y0: q.y - h, x1: q.x + h, y1: q.y + h, id: null, key: 'mon' }); } }
    } catch { /* the layer is not there */ }
    P.monCache = { t: now, pad, out }; return out;
  }
  const markOf = (F, id) => { for (const t of F.tiles) if (t.life === 'live' && t.opacity >= 0.3 && t.ids.includes(id)) return t; return null; };
  function subjectAnchor(F, ids, ll) {
    for (const id of ids || []) { const t = markOf(F, id); if (t) { const x = t.x + F.view.dx; const y = t.y + F.view.dy; return { rect: { x0: x - t.w * t.scale / 2, y0: y - t.h * t.scale / 2, x1: x + t.w * t.scale / 2, y1: y + t.h * t.scale / 2 }, tile: t, id }; } }
    if (ll && S.map) { try { const p = S.map.project([ll[1], ll[0]]); return { rect: { x0: p.x - 3, y0: p.y - 3, x1: p.x + 3, y1: p.y + 3 }, tile: null, id: null }; } catch { /* no map */ } }
    return null;
  }

  function placeCards(F, st, c) {
    const W = c.width; const H = c.height; const gap = 8;
    const occ = new Occupancy(W, H, 8); for (const r of markRects(F, 4)) occ.add(r, 0);
    for (const r of P.chrome) occ.add(r, 2, { kind: 'chrome' });
    const taken = []; P.subj = [];
    // subjects
    const tick = st.currentTick; const ev = P.chron && P.chron[tick] ? P.chron[tick].find((e) => e.significance !== 'low') : null; const vg = st.vignetteData && st.vignetteData.byTick ? (st.vignetteData.byTick[tick] || st.vignetteData.byTick[tick - 1] || st.vignetteData.byTick[tick - 2] || [])[0] : null;
    const subjects = { event: ev ? subjectAnchor(F, ev.units_involved, null) : null, story: vg ? subjectAnchor(F, vg.units_featured, [vg.trigger_lat, vg.trigger_lng]) : null, unit: st.selectedUnitId ? subjectAnchor(F, [st.selectedUnitId], null) : null };
    const order = ['unit', 'tour', 'event', 'story', 'toast']; const handled = [];
    for (const k of order) {
      const el = P.nodes[k]; if (!el) continue;
      const cs = window.getComputedStyle(el); if (cs.display === 'none' || (k === 'toast' && !el.children.length)) continue;
      const st0 = P.spots.get(el) || { tx: 0, ty: 0, since: 0, goodSince: 0 }; const nat = relRect(el, c, true); const w = nat.x1 - nat.x0; const h = nat.y1 - nat.y0;
      if (w > W * 0.85 || h > H * 0.8) { if (st0.tx || st0.ty) { el.style.removeProperty('translate'); st0.tx = 0; st0.ty = 0; } continue; }      // a full-width drawer or a sheet (the tour panel, the phone's sheets) is a surface of its own: never moved
      const cur = rectOf(nat.x0 + st0.tx, nat.y0 + st0.ty, w, h); const subj = subjects[k] || null;
      // is the card where it is on free ground?  (a mark under it, or the subject itself under it, is not)
      const others = []; for (const k2 of ['event', 'story', 'tour', 'unit', 'toast']) { const e2 = P.nodes[k2]; if (e2 && e2 !== el) { const cs2 = window.getComputedStyle(e2); if (cs2.display !== 'none') others.push(targetRect(e2, c)); } }
      const covered = () => { for (const r of markRects(F, gap - 2)) if (overlaps(cur, r, 0)) return true; for (const r of P.chrome) if (overlaps(cur, r, 1)) return true; for (const r of others) if (overlaps(cur, r, 1)) return true; return false; };
      // R1E (REDS-A): a card that stands above the top edge of the map is on the toolbar or out of the window.  It got there by a placement made for another natural place (the card's words changed height, the natural place moved, the translation
      // stayed): T0-POL-02 saw it at 1280x720, tick 550 (box 19..208 px from the window's top, on the 48 px toolbar) and at 1366x1024 touch, tick 453 (3 px above the window), and nothing ever judged it bad, because the toolbar lies above the canvas
      // and is not in the chrome rectangles.  It is bad; when no free ground exists it goes home like a card on a control.
      const aboveMap = () => cur.y0 < -1;
      const bad = covered() || aboveMap() || (subj && overlaps(cur, subj.rect, 2));
      const now = window.performance.now();
      // standing on another card or on a control is never waited out (the 260 ms hysteresis is for marks): a card whose words change height can land on a neighbour in one frame
      const onFurniture = () => { for (const r of P.chrome) if (overlaps(cur, r, 1)) return true; for (const r of others) if (overlaps(cur, r, 1)) return true; return false; };
      if (!bad) { st0.goodSince = st0.goodSince || now; }
      else st0.goodSince = 0;
      if (bad && (now - st0.since > 260 || onFurniture())) {
        const occK = new Occupancy(W, H, 8); for (const r of markRects(F, gap)) occK.add(r, 0); for (const r of P.chrome) occK.add(r, 2, { kind: 'chrome' }); for (const r of others) occK.add(r, 2, { kind: 'chrome' });
        // the ladder of forms (the same card, the same words): its natural size, then without its narrative / shorter, then the shortest; the first form that finds free ground wins
        let spot = null; let formUsed = st0.form || 0; const maxForm = k === 'event' || k === 'story' ? 3 : 1;
        for (let f = 0; f < maxForm && !spot; f++) {
          if (f !== (el.__gtaForm || 0)) { el.setAttribute('data-gta-form', String(f)); el.__gtaForm = f; }
          const nr = relRect(el, c, true); const w2 = nr.x1 - nr.x0; const h2 = nr.y1 - nr.y0;
          spot = findSpot({ w: w2, h: h2, anchor: subj ? subj.rect : null, occ: occK, taken: [...taken], gap: 10, margin: 10, prefer: { x: nr.x0, y: nr.y0 }, tok: { offset: 16 } });
          if (spot) { formUsed = f; spot.nat = nr; }
        }
        if (spot) { st0.form = formUsed; const nt = spot.nat; const ntx = spot.x - nt.x0; const nty = spot.y - nt.y0; if (Math.hypot(ntx - st0.tx, nty - st0.ty) > 2) { st0.tx = ntx; st0.ty = nty; st0.since = now; } }
        else if ((el.__gtaForm || 0) !== (st0.form || 0)) { el.setAttribute('data-gta-form', String(st0.form || 0)); el.__gtaForm = st0.form || 0; }
        // No free ground for this card (a crowded small screen): a moved card that now stands on the interface or on another card goes back to its own place.  The natural places are kept apart by the
        // layout contract (POLISH), so the fixpoint of "everyone home" overlaps nothing; covering a mark is the lesser harm, covering a card or a control is not.
        if (!spot && (st0.tx || st0.ty) && (onFurniture() || aboveMap())) { st0.tx = 0; st0.ty = 0; st0.since = now; }
      } else if (!bad && (st0.tx !== 0 || st0.ty !== 0) && now - st0.since > 1800) {
        // the natural place became free again: go home (once, calmly)
        const home = rectOf(nat.x0, nat.y0, w, h); let free = true; for (const r of markRects(F, gap)) if (overlaps(home, r, 0)) { free = false; break; }
        if (free && !(subj && overlaps(home, subj.rect, 2))) { st0.tx = 0; st0.ty = 0; st0.since = now; }
      }
      P.spots.set(el, st0);
      // a small correction glides (240 ms); a move across the map is a jump: the card's words changed at that instant anyway, and a card sliding over the legend, the unit card or the overview on its way is
      // an overlap a viewer sees (the layout contract: nothing lands on anything else, not even for a moment)
      const want = st0.tx + 'px ' + st0.ty + 'px';
      if (el.__gtaTr !== want) {
        const pv = el.__gtaXY || [0, 0]; const far = Math.hypot(st0.tx - pv[0], st0.ty - pv[1]) > 48; const fresh = el.__gtaTr === undefined; el.__gtaTr = want; el.__gtaXY = [st0.tx, st0.ty];
        if (far || (fresh && (st0.tx || st0.ty)) || S.reducedNow()) { el.style.setProperty('transition', 'none'); el.style.setProperty('translate', want); void el.offsetWidth; el.style.setProperty('transition', 'translate 240ms cubic-bezier(.2,.72,.2,1)'); }      /* a card never placed before has not been painted either: its first place is not a glide from anywhere */
        else { if (!el.__gtaT) { el.__gtaT = 1; } el.style.setProperty('transition', 'translate 240ms cubic-bezier(.2,.72,.2,1)'); el.style.setProperty('translate', want); }
      } else if (!el.__gtaT) { el.__gtaT = 1; el.style.setProperty('transition', 'translate 240ms cubic-bezier(.2,.72,.2,1)'); }
      const fin = rectOf(nat.x0 + st0.tx, nat.y0 + st0.ty, w, h); taken.push(fin);
      if (subj && (k === 'event' || k === 'story')) P.subj.push({ kind: k, subj, card: fin });
      handled.push(k);
    }
  }

  // ---- the tour: its panel is a full-width drawer over the lower part of the map and the app flies every stop to the centre of the map, which lies on the drawer's top edge: with the drawer's height as the
  // map's bottom padding the centre is the centre of what the viewer can see, so the stop's place is never under the panel that describes it (the padding is eased in and out, the camera stays where it is)
  function tourPadding(c) {
    const el = P.nodes.tour; const map = S.map; if (!map || !map.easeTo) return; const want = el && window.getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > c.width * 0.6 ? Math.round(Math.max(0, c.bottom - el.getBoundingClientRect().top)) : 0;
    if (want === P.pad) return;
    // an easeTo would cancel a flight in progress (the tour's own flyTo): wait for the camera to land, then make room
    if (map.isMoving && map.isMoving()) { if (!P.padWait) { P.padWait = true; map.once('moveend', () => { P.padWait = false; try { map.triggerRepaint(); } catch { /* gone */ } }); } return; }
    P.pad = want; try { map.easeTo({ padding: { top: 0, left: 0, right: 0, bottom: want }, duration: S.reducedNow() ? 0 : 320 }); } catch { /* the map is gone */ }
  }

  // ---- the legend: the skin's own ---------------------------------------------------------------------------------------------------------------------------------------
  function legend() {
    const el = P.nodes.legend; if (!el) return; const E = S.core; const skin = E.kernel.skins.has(E.tok('skin.id')) ? E.kernel.skins.get(E.tok('skin.id')) : null; if (!skin || !skin.legend) return;
    let box = el.querySelector(':scope > [data-gta-legend]');
    const ver = E.tok('skin.id') + '|' + (skin.skin ? skin.skin.rev : 0);
    if (box && box.getAttribute('data-ver') === ver) return;
    if (box) box.remove();
    box = doc.createElement('div'); box.setAttribute('data-gta-legend', '1'); box.setAttribute('data-ver', ver);
    const rows = skin.legend(); const EV = { Documented: 'printed in the order of battle', Modelled: 'placed by hand, not recorded', Computed: 'counted by a stated rule', Contested: 'the records disagree', Measured: 'measured', Unknown: 'not known', Design: 'drawn to be read' };
    // The panel fits the ground the cards leave (about 300 px on a 768 px screen): the title, then the marks that say whose a flag is and what arm (the first things a viewer asks), each with its evidence tag; the other marks and the
    // anatomy figure (837 px tall) are in closed <details> that open on a click or the keyboard.  Nothing is dropped: every row and the figure stay in the page, one disclosure away.
    const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    const li = (r) => '<li><i class="gl-sw" style="background:' + esc(r.swatch) + '"></i><span class="gl-tx">' + esc(r.text) + '</span><em class="ev ev-' + esc(r.evidence) + '" title="' + esc(EV[r.evidence] || '') + '">' + esc(r.evidence) + '</em></li>';
    const core = (r) => r.channel === 'side' || r.channel === 'facing' || (r.channel === 'arm' && r.value !== 'formation');
    const first = rows.filter(core); const more = rows.filter((r) => !core(r));
    let h = '<div class="gl-title">What the marks say</div>';
    h += '<ul class="gl-rows">' + first.map(li).join('') + '</ul>';
    if (more.length) h += '<details class="gl-more"><summary>More marks (' + more.length + ')</summary><ul class="gl-rows">' + more.map(li).join('') + '</ul></details>';
    if (skin.figure) { h += '<details class="gl-figd"><summary>How the marks are drawn</summary><canvas class="gl-fig" role="img" aria-label="The anatomy of the marks, drawn at their true size"></canvas></details>'; }
    box.innerHTML = h; el.appendChild(box); try { doc.documentElement.classList.remove('gta-wait'); const early = doc.getElementById('gtanim-early'); if (early) early.remove(); } catch { /* gone */ }
    const cv = box.querySelector('canvas.gl-fig');
    if (cv && skin.figure) { try { const w = 316; const hh = skin.figureMeasure ? skin.figureMeasure(w) : skin.figureH; const d = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * d); cv.height = Math.round(hh * d); cv.style.width = w + 'px'; cv.style.height = hh + 'px'; const g = cv.getContext('2d'); g.scale(d, d); skin.figure(g, w); } catch { cv.remove(); } }
  }

  // ---- the hover card ------------------------------------------------------------------------------------------------------------------------------------------------------
  function tipCard() {
    if (!P.tip) { const d = doc.createElement('div'); d.id = 'gta-tip'; d.setAttribute('role', 'tooltip'); d.setAttribute('aria-hidden', 'true'); d.setAttribute('data-gta', 'tip'); d.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;'; doc.body.appendChild(d); P.tip = d; }
    return P.tip;
  }
  const esc2 = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const EVLAB = { Documented: 'Documented', Modelled: 'Modelled' };
  function unitLine(u) { return u.designation ? u.designation : (u.label && u.label !== u.short ? u.label : u.short); }
  function hoverContent(F, key, st) {
    const t = F.tiles.find((q) => q.key === key && q.life === 'live'); if (!t) return null; const oob = st.oobData || {};
    if (t.kind === 'leaf') {
      const u = t.unit; if (!u) return null; const rec = oob[u.id]; const side = u.side === 'union' ? 'Union' : u.side === 'confederate' ? 'Confederate' : 'Side contested';
      const chain = (u.parentSource !== 'oob' ? [] : u.chain || []).filter((id) => id !== 'ROOT' && id !== u.id && S.core.battle.nodes.get(id) && !S.core.battle.nodes.get(id).virtual && /^(corps|division|brigade|battalion)$/.test(S.core.battle.nodes.get(id).kind)).map((id) => { const nd = S.core.battle.nodes.get(id); return nd.designation || null; }).filter(Boolean);
      const ratio = t.ratio; const strength = t.strength != null ? t.strength : null;
      return { tone: u.side, kick: side + ' · ' + (u.kind === 'regiment' ? 'regiment' : u.kind), title: unitLine(u), lines: [chain.length ? chain.slice(0, 3).join(' → ') : (u.inOob ? '' : 'Not in the order of battle: identified by its record code only'), (strength != null ? strength.toLocaleString('en-US') + ' men at this placement' : '')].filter(Boolean), ev: [['Modelled', 'strength and place are placement values, not records'], [u.inOob ? 'Documented' : 'Unknown', u.inOob ? 'identity: order of battle' : 'identity']], rec: !!rec, ratio };
    }
    const names = []; for (const id of t.ids) { const u = S.core.battle.units.get(id); if (u) names.push(codeOfUnit(u)); }
    return { tone: t.side, kick: 'Crowd · ' + t.ids.length + ' units', title: t.short, lines: [names.slice(0, 10).join(', ') + (names.length > 10 ? ' … and ' + (names.length - 10) + ' more' : ''), 'Zoom in or click to see them one by one'], ev: [['Computed', 'a count of records, never of men']] };
  }
  const codeOfUnit = (u) => (u.short || u.id);
  function updateTip(F, st) {
    const key = S.hoverKey; if (!key && !P.tip) return;     // the hover card does not exist until the first hover: an empty role=tooltip has no accessible name (axe aria-tooltip-name)
    const tip = tipCard(); const hide = () => { tip.style.opacity = '0'; tip.setAttribute('aria-hidden', 'true'); };
    if (!key || (st.selectedUnitId && false)) { hide(); return; }
    const c = cvRect(); const info = hoverContent(F, key, st); if (!info) { hide(); return; }
    const sig = key + '|' + info.title; if (tip.__sig !== sig) {
      tip.__sig = sig; tip.setAttribute('data-tone', info.tone || '');
      tip.innerHTML = '<div class="gt-kick">' + esc2(info.kick) + '</div><div class="gt-title">' + esc2(info.title) + '</div>' + info.lines.map((l) => '<div class="gt-line">' + esc2(l) + '</div>').join('') + '<div class="gt-ev">' + info.ev.map((e) => '<span class="ev ev-' + esc2(e[0]) + '" title="' + esc2(e[1]) + '">' + esc2(e[0]) + '</span>').join('') + '</div>';
    }
    const t = F.tiles.find((q) => q.key === key); if (!t) { hide(); return; }
    const w = tip.offsetWidth || 240; const h = tip.offsetHeight || 80; const mx = t.x + F.view.dx; const my = t.y + F.view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2;
    let x = c.left + mx + hw + 12; let y = c.top + my - h / 2; if (x + w > window.innerWidth - 8) x = c.left + mx - hw - 12 - w; if (y < c.top + 8) y = c.top + 8; if (y + h > window.innerHeight - 8) y = window.innerHeight - 8 - h;
    tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; tip.style.opacity = '1'; tip.removeAttribute('aria-hidden');
  }

  // ---- rings and leaders (drawn on the unit canvas, beneath the marks) -----------------------------------------------------------------------------------------------------
  function drawSubjects(g, env, F) {
    if (!P.subj.length) return; const c = cvRect(); void c;
    for (const s of P.subj) {
      if (!s.subj) continue; const r = s.subj.rect; const cx = (r.x0 + r.x1) / 2; const cy = (r.y0 + r.y1) / 2; const card = s.card;
      const ex = Math.max(card.x0, Math.min(card.x1, cx)); const ey = Math.max(card.y0, Math.min(card.y1, cy));
      g.save(); g.lineWidth = 1; g.strokeStyle = 'rgba(244,236,216,.62)'; g.setLineDash([]); g.beginPath(); g.moveTo(ex, ey); g.lineTo(cx, cy); g.stroke();
      if (s.subj.tile) { const pad = 5; g.strokeStyle = 'rgba(244,236,216,.9)'; g.lineWidth = 1.5; g.beginPath(); const rr = (x, y, w, h, q) => { g.moveTo(x + q, y); g.arcTo(x + w, y, x + w, y + h, q); g.arcTo(x + w, y + h, x, y + h, q); g.arcTo(x, y + h, x, y, q); g.arcTo(x, y, x + w, y, q); g.closePath(); }; rr(r.x0 - pad, r.y0 - pad, r.x1 - r.x0 + 2 * pad, r.y1 - r.y0 + 2 * pad, 5); g.stroke(); }
      else { g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    }
    void F; void env;
  }

  /** called by the engine after every drawn frame, and by the observer of new cards (above) the moment a card is added */
  function update(F, st) {
    const now = window.performance.now();
    if (now - P.last < 120 && !P.dirty) { updateTip(F, st); return; }
    P.last = now; P.dirty = false;
    loadChronology(); const c = cvRect(); scan();
    P.chrome = chromeRects(c); P.extra = P.chrome.concat(floatingRects(c));
    const W = c.width; const H = c.height; const dock = doc.getElementById('gt-timeline'); const dk = dock ? relRect(dock, c, false) : null;
    P.stage = { x0: EDGE, y0: EDGE, x1: W - EDGE, y1: (dk ? Math.min(H, dk.y0) : H) - EDGE };
    placeCards(F, st, c); legend(); updateTip(F, st); tourPadding(c);
  }
  const api = {
    nodes: P.nodes,
    stage: () => P.stage, chrome: () => P.chrome, rects: () => P.extra,
    drawSubjects,
    update,
  };
  return api;
}
