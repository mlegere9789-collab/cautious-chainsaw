// Tour stops as camera bookmarks: the 16 stops of the site's Virtual Walkthrough, every one of them a place to put the camera.
// A stop is a stop of a modern tour, not an 1863 feature: nothing is drawn for it but one labelled pin over the picture while the camera has been sent there, and nothing
// here touches the clock. A stop on the loaded ground is seen from the viewpoint the site's walkthrough uses for it; a stop beyond the loaded ground is seen from the edge
// of the ground, looking toward it, and says so. The rules and the words are in ./site-places.mjs (pure, tested under node); this file is the page side only.
import * as P from './site-places.mjs';

let S = null;                                   // the state of one visit: set by init, cleared by dispose

const doc = () => globalThis.document;

export async function init(ctx) {
  const URLS = ctx.urls, th = ctx.theatre;
  const res = await fetch(URLS.data + 'site-tour-stops.json'); if (!res.ok) throw new Error(`the tour stops could not be read (HTTP ${res.status})`);
  const data = await res.json();
  const bad = P.validateTour(data); if (bad.length) throw new Error(`the tour stops are not fit to use: ${bad[0]}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''}`);
  const integrity = await P.selfCheck(data, [['tour', 'tourSha256']]);
  if (integrity.checked && !integrity.ok) throw new Error('the tour stops no longer match the hash recorded with them; they are not offered');
  if (th.dead || !th.root) return;                                                // the visit ended while the list was being read
  const T = th.T, B = P.tourBookmarks(data, T);
  const s = S = { ctx, th, T, B, integrity, active: -1, pin: null, label: null, vp: new Float32Array(16), p: [0, 0, 0], px: NaN, py: NaN, shown: false, ac: new AbortController(), panel: null, box: null, tier: ctx.tierMark.style(P.TOUR.tier) };
  // the one pin: an element over the picture, moved every frame to where the stop is seen
  const pin = s.pin = doc().createElement('div'); pin.id = 'xt-pin'; pin.hidden = true; pin.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;will-change:transform';
  pin.innerHTML = `<span aria-hidden="true" style="position:absolute;left:-8px;top:-8px;width:12px;height:12px;border-radius:50%;border:2px ${s.tier.dash && s.tier.dash.length ? 'dashed' : 'solid'} ${s.tier.color};background:rgba(14,14,25,.55)"></span>
    <span style="position:absolute;left:12px;top:-30px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:3px 4px 3px 8px;border-radius:8px;background:rgba(14,14,25,.86);border:1px solid rgba(58,58,86,.8);color:#e8d5a3;font:600 12px/1.3 system-ui,sans-serif"><span id="xt-pin-text"></span><button type="button" id="xt-pin-x" aria-label="Remove the tour stop pin" style="pointer-events:auto;width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:#c3c4d0;font:600 14px/1 system-ui,sans-serif;cursor:pointer">×</button></span>`;
  s.label = pin.querySelector('#xt-pin-text'); th.els.stage.append(pin);
  pin.addEventListener('click', e => { if (S && e.target && e.target.id === 'xt-pin-x') clear(); }, { signal: s.ac.signal });
  s.panel = ctx.registerPanel(P.TOUR.id, 'Tour stops', renderPanel);
  th.sitePlaces = th.sitePlaces || {};
  th.sitePlaces.tour = { count: B.length, stops: () => (S ? S.B.map(b => ({ id: b.id, name: b.name, label: b.label, day: b.day, inside: b.inside, beyondM: b.beyondM, dir: b.dir, kind: b.kind, pose: { ...b.pose } })) : []),
    flyTo: id => go(id), active: () => (S ? S.active : -1), clear: () => clear(), pinShown: () => !!(S && S.shown), integrity: () => (S ? S.integrity : null) };
}

function go(id) {
  const s = S; if (!s) return false; const b = s.B.find(x => x.id === id); if (!b) return false;
  s.th.controls.flyTo({ ...b.pose }); s.th.announce(P.tourSay(b));
  s.active = b.id; s.label.textContent = P.tourPinText(b); s.px = s.py = NaN; if (s.box) markCurrent(s);
  return true;
}
function clear() { const s = S; if (!s) return; s.active = -1; s.shown = false; s.pin.hidden = true; if (s.box) markCurrent(s); }

export function update(frame) {
  const s = S; if (!s || s.active < 0) return;                                    // no stop chosen: nothing is drawn, nothing is done
  const b = s.B[s.active - 1], cam = frame.cam, R = s.ctx.host && s.ctx.host.R, th = s.th; if (!b) return;
  let w = th.cssW, h = th.cssH; if (!(w > 0 && h > 0)) { const r = th.els.stage.getBoundingClientRect(); w = r.width; h = r.height; if (!(w > 0 && h > 0)) return; }       // the size of the picture in css pixels
  P.viewProj(cam, R && R.W > 0 && R.H > 0 ? R.W / R.H : w / h, s.vp);
  const vis = P.project(s.vp, b.x, b.y, b.z, w, h, s.p) && s.p[0] > -20 && s.p[0] < w + 20 && s.p[1] > -20 && s.p[1] < h + 20;
  if (vis !== s.shown) { s.shown = vis; s.pin.hidden = !vis; }
  if (vis && !(Math.abs(s.p[0] - s.px) <= .2 && Math.abs(s.p[1] - s.py) <= .2)) { s.px = s.p[0]; s.py = s.p[1]; s.pin.style.transform = `translate(${s.px.toFixed(1)}px,${s.py.toFixed(1)}px)`; }       // not "<= .2 on both" also when the place is not known yet (NaN after a new stop is chosen)
}

function markCurrent(s) { const ul = s.box.querySelector('#xt-list'); if (!ul) return; for (const n of ul.querySelectorAll('[aria-current]')) n.removeAttribute('aria-current'); if (s.active >= 0) { const n = ul.querySelector(`[data-stop="${s.active}"]`); if (n) n.setAttribute('aria-current', 'true'); } const c = s.box.querySelector('#xt-clear'); if (c) c.disabled = s.active < 0; }
function renderPanel(box, th, sc) {
  const s = S; if (!s) return; s.box = box; sc.add(() => { if (S && S.box === box) S.box = null; });
  box.innerHTML = P.tourPanelHTML(s.B, s.active, s.ctx.tierMark);
  sc.on(box, 'click', ev => {
    const t = ev.target && ev.target.closest ? ev.target : null; if (!t || !S) return; const row = t.closest('[data-stop]');
    if (row) go(+row.dataset.stop); else if (t.closest('#xt-clear')) clear();
  });
}

export function dispose() {
  const s = S; S = null; if (!s) return;
  try { s.ac.abort(); } catch { /* already gone */ }
  if (s.pin) s.pin.remove();
  const th = s.th; if (th && th.sitePlaces) { delete th.sitePlaces.tour; if (!Object.keys(th.sitePlaces).length) delete th.sitePlaces; }
  s.pin = s.label = s.box = s.ctx = s.th = s.T = s.B = s.panel = null;
}
