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
  const P = { pad: 0, nodes: {}, rects: [], extra: [], chrome: [], stage: { x0: EDGE, y0: EDGE, x1: 1e5, y1: 1e5 }, last: 0, dirty: true, subj: [], spots: new Map(), tip: null, chron: null, chronBusy: false, lastKey: '', mo: null, legendFor: null };
  try { const prefs = JSON.parse(window.localStorage.getItem('gtbg_prefs') || '{}'); if (prefs.showLegend === undefined && S.store.getState().showLegend) S.store.setState({ showLegend: false }); } catch { /* storage blocked: the legend keeps the app's default */ }      // the legend is closed until the viewer opens it (it opened over a fifth of the map); a viewer's own choice is kept
  const css = doc.createElement('style'); css.id = 'gtanim-chrome'; css.textContent = CHROME_CSS; doc.head.appendChild(css);
  // a card that appears while the picture is at rest wakes the engine so that it is placed at once
  try { P.mo = new window.MutationObserver(() => { P.dirty = true; try { if (S.map && S.state === 1) S.map.triggerRepaint(); } catch { /* the map is gone */ } }); P.mo.observe(root, { childList: true, subtree: true }); } catch { /* a page without observers rescans on the timer */ }

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
    if (!n.hud) for (const d of doc.querySelectorAll('main#root div')) { if (d.children.length === 0 && /\(base speed\)|speed\)/.test(d.textContent)) { n.hud = d.closest('div[style*="position: absolute"]'); break; } }      // the day badge: the absolute card around "1x (base speed)"
    for (const k of KINDS) { const el = n[k]; if (el && el.getAttribute('data-gta') !== k) el.setAttribute('data-gta', k); }
    for (const [k, el] of Object.entries(P.nodes)) if (el && el !== n[k] && el.getAttribute) el.removeAttribute('data-gta');
    P.nodes = n; return n;
  }
  const cvRect = () => S.canvas.getBoundingClientRect();
  function relRect(el, c, minusT) {
    const r = el.getBoundingClientRect(); const t = minusT ? (P.spots.get(el) || { tx: 0, ty: 0 }) : { tx: 0, ty: 0 };
    return { x0: r.left - c.left - t.tx, y0: r.top - c.top - t.ty, x1: r.right - c.left - t.tx, y1: r.bottom - c.top - t.ty };
  }

  // ---- the interface rectangles that cover the map (canvas px) -----------------------------------------------------------------------------------------------------
  function chromeRects(c) {
    const out = []; const add = (el, pad = 0) => { if (!el) return; const cs = window.getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return; const r = relRect(el, c, false); if (r.x1 - r.x0 < 4 || r.y1 - r.y0 < 4) return; out.push({ x0: r.x0 - pad, y0: r.y0 - pad, x1: r.x1 + pad, y1: r.y1 + pad }); };
    for (const k of ['legend', 'minimap', 'hud']) add(P.nodes[k]);
    add(doc.getElementById('gt-timeline')); add(doc.getElementById('extra-features'), 2);
    for (const el of doc.querySelectorAll('.mapboxgl-ctrl-top-right, .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-bottom-left')) add(el);
    for (const b of doc.querySelectorAll('main#root button')) { if (/Trails/.test(b.textContent) && b.textContent.length < 20) add(b, 2); else if (/NPS Auto Tour/.test(b.textContent)) add(b, 2); }
    return out;
  }
  function floatingRects(c) { const out = []; for (const k of ['event', 'story', 'tour', 'unit', 'toast']) { const el = P.nodes[k]; if (el) { const r = relRect(el, c, false); out.push({ ...r, kind: k }); } } return out; }

  // ---- placement ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  function markRects(F, pad) {
    const v = F.view; const out = [];
    for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.2) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x = t.x + v.dx; const y = t.y + v.dy; out.push({ x0: x - hw - pad, y0: y - hh - pad, x1: x + hw + pad, y1: y + hh + pad, id: t.ids[0], key: t.key }); }
    return out;
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
      const others = []; for (const k2 of ['event', 'story', 'tour', 'unit', 'toast']) { const e2 = P.nodes[k2]; if (e2 && e2 !== el) { const cs2 = window.getComputedStyle(e2); if (cs2.display !== 'none') others.push(relRect(e2, c, false)); } }
      const covered = () => { for (const r of markRects(F, gap - 2)) if (overlaps(cur, r, 0)) return true; for (const r of P.chrome) if (overlaps(cur, r, 1)) return true; for (const r of others) if (overlaps(cur, r, 1)) return true; return false; };
      const bad = covered() || (subj && overlaps(cur, subj.rect, 2));
      const now = window.performance.now();
      if (!bad) { st0.goodSince = st0.goodSince || now; }
      else st0.goodSince = 0;
      if (bad && (now - st0.since > 380)) {
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
      } else if (!bad && (st0.tx !== 0 || st0.ty !== 0) && now - st0.since > 1800) {
        // the natural place became free again: go home (once, calmly)
        const home = rectOf(nat.x0, nat.y0, w, h); let free = true; for (const r of markRects(F, gap)) if (overlaps(home, r, 0)) { free = false; break; }
        if (free && !(subj && overlaps(home, subj.rect, 2))) { st0.tx = 0; st0.ty = 0; st0.since = now; }
      }
      P.spots.set(el, st0);
      el.style.setProperty('translate', st0.tx + 'px ' + st0.ty + 'px'); if (!el.__gtaT) { el.__gtaT = 1; el.style.setProperty('transition', 'translate 260ms cubic-bezier(.2,.72,.2,1)'); }
      const fin = rectOf(nat.x0 + st0.tx, nat.y0 + st0.ty, w, h); taken.push(fin);
      if (subj && (k === 'event' || k === 'story')) P.subj.push({ kind: k, subj, card: fin });
      handled.push(k);
    }
  }

  // ---- the tour: its panel is a full-width drawer over the lower part of the map and the app flies every stop to the centre of the map, which lies on the drawer's top edge: with the drawer's height as the
  // map's bottom padding the centre is the centre of what the viewer can see, so the stop's place is never under the panel that describes it (the padding is eased in and out, the camera stays where it is)
  function tourPadding(c) {
    const el = P.nodes.tour; const map = S.map; if (!map || !map.easeTo) return; const want = el && window.getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > c.width * 0.6 ? Math.round(Math.max(0, c.bottom - el.getBoundingClientRect().top)) : 0;
    if (want === P.pad) return; P.pad = want; try { map.easeTo({ padding: { top: 0, left: 0, right: 0, bottom: want }, duration: S.reducedNow() ? 0 : 320 }); } catch { /* the map is gone */ }
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
    let h = '<div class="gl-title">What the marks say</div>';
    if (skin.figure) { h += '<canvas class="gl-fig" aria-label="The anatomy of the marks, drawn at their true size"></canvas>'; }
    h += '<ul class="gl-rows">'; const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    for (const r of rows) h += '<li><i class="gl-sw" style="background:' + esc(r.swatch) + '"></i><span class="gl-tx">' + esc(r.text) + '</span><em class="ev ev-' + esc(r.evidence) + '" title="' + esc(EV[r.evidence] || '') + '">' + esc(r.evidence) + '</em></li>';
    h += '</ul>';
    box.innerHTML = h; el.appendChild(box);
    const cv = box.querySelector('canvas.gl-fig');
    if (cv && skin.figure) { try { const w = 316; const hh = skin.figureMeasure ? skin.figureMeasure(w) : skin.figureH; const d = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * d); cv.height = Math.round(hh * d); cv.style.width = w + 'px'; cv.style.height = hh + 'px'; const g = cv.getContext('2d'); g.scale(d, d); skin.figure(g, w); } catch { cv.remove(); } }
  }

  // ---- the hover card ------------------------------------------------------------------------------------------------------------------------------------------------------
  function tipCard() {
    if (!P.tip) { const d = doc.createElement('div'); d.id = 'gta-tip'; d.setAttribute('role', 'tooltip'); d.setAttribute('data-gta', 'tip'); d.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;'; doc.body.appendChild(d); P.tip = d; }
    return P.tip;
  }
  const esc2 = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const EVLAB = { Documented: 'Documented', Modelled: 'Modelled' };
  function unitLine(u) { return u.designation ? u.designation : (u.label && u.label !== u.short ? u.label : u.short); }
  function hoverContent(F, key, st) {
    const t = F.tiles.find((q) => q.key === key && q.life === 'live'); if (!t) return null; const oob = st.oobData || {};
    if (t.kind === 'leaf') {
      const u = t.unit; if (!u) return null; const rec = oob[u.id]; const side = u.side === 'union' ? 'Union' : u.side === 'confederate' ? 'Confederate' : 'Side contested';
      const chain = (u.chain || []).filter((id) => id !== 'ROOT' && id !== u.id && S.core.battle.nodes.get(id) && !S.core.battle.nodes.get(id).virtual && /^(corps|division|brigade|battalion)$/.test(S.core.battle.nodes.get(id).kind)).map((id) => { const nd = S.core.battle.nodes.get(id); return nd.designation || null; }).filter(Boolean);
      const ratio = t.ratio; const strength = t.strength != null ? t.strength : null;
      return { tone: u.side, kick: side + ' · ' + (u.kind === 'regiment' ? 'regiment' : u.kind), title: unitLine(u), lines: [chain.length ? chain.slice(0, 3).join(' → ') : (u.inOob ? '' : 'Not in the order of battle: identified by its record code only'), (strength != null ? strength.toLocaleString('en-US') + ' men at this placement' : '')].filter(Boolean), ev: [['Modelled', 'strength and place are placement values, not records'], [u.inOob ? 'Documented' : 'Unknown', u.inOob ? 'identity: order of battle' : 'identity']], rec: !!rec, ratio };
    }
    const names = []; for (const id of t.ids) { const u = S.core.battle.units.get(id); if (u) names.push(codeOfUnit(u)); }
    return { tone: t.side, kick: 'Crowd · ' + t.ids.length + ' units', title: t.short, lines: [names.slice(0, 10).join(', ') + (names.length > 10 ? ' … and ' + (names.length - 10) + ' more' : ''), 'Zoom in or click to see them one by one'], ev: [['Computed', 'a count of records, never of men']] };
  }
  const codeOfUnit = (u) => (u.short || u.id);
  function updateTip(F, st) {
    const key = S.hoverKey; const tip = tipCard();
    if (!key || (st.selectedUnitId && false)) { tip.style.opacity = '0'; return; }
    const c = cvRect(); const info = hoverContent(F, key, st); if (!info) { tip.style.opacity = '0'; return; }
    const sig = key + '|' + info.title; if (tip.__sig !== sig) {
      tip.__sig = sig; tip.setAttribute('data-tone', info.tone || '');
      tip.innerHTML = '<div class="gt-kick">' + esc2(info.kick) + '</div><div class="gt-title">' + esc2(info.title) + '</div>' + info.lines.map((l) => '<div class="gt-line">' + esc2(l) + '</div>').join('') + '<div class="gt-ev">' + info.ev.map((e) => '<span class="ev ev-' + esc2(e[0]) + '" title="' + esc2(e[1]) + '">' + esc2(e[0]) + '</span>').join('') + '</div>';
    }
    const t = F.tiles.find((q) => q.key === key); if (!t) { tip.style.opacity = '0'; return; }
    const w = tip.offsetWidth || 240; const h = tip.offsetHeight || 80; const mx = t.x + F.view.dx; const my = t.y + F.view.dy; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2;
    let x = c.left + mx + hw + 12; let y = c.top + my - h / 2; if (x + w > window.innerWidth - 8) x = c.left + mx - hw - 12 - w; if (y < c.top + 8) y = c.top + 8; if (y + h > window.innerHeight - 8) y = window.innerHeight - 8 - h;
    tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; tip.style.opacity = '1';
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

  return {
    nodes: P.nodes,
    stage: () => P.stage, chrome: () => P.chrome, rects: () => P.extra,
    drawSubjects,
    /** called by the engine after every drawn frame */
    update(F, st) {
      const now = window.performance.now();
      if (S.renderer && F) { /* the stage is read by the renderer through stage() */ }
      if (now - P.last < 120 && !P.dirty) { updateTip(F, st); return; }
      P.last = now; P.dirty = false;
      loadChronology(); const c = cvRect(); scan();
      P.chrome = chromeRects(c); P.extra = P.chrome.concat(floatingRects(c));
      const W = c.width; const H = c.height; const dock = doc.getElementById('gt-timeline'); const dk = dock ? relRect(dock, c, false) : null;
      P.stage = { x0: EDGE, y0: EDGE, x1: W - EDGE, y1: (dk ? Math.min(H, dk.y0) : H) - EDGE };
      placeCards(F, st, c); legend(); updateTip(F, st); tourPadding(c);
    },
  };
}
