// The drawer side of the added layers and panels (the loader and the registries are ui/extensions.mjs; contract: docs/EXT-CONTRACT.md):
// the More tool of the top bar (hidden until something is registered or something failed), its drawer (the layer switches, the list of added panels, what is not running),
// the same switches under the structure switches of Views, and the frame an added panel is drawn in. All listeners go through a panel scope.
import { Scope } from '../scope.mjs';
import { esc, ic } from './util.mjs';

export const MORE = 'more';
const sel = id => `input[data-xlayer="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : String(id).replace(/["\\]/g, '\\$&')}"]`;

/** The switches as HTML (pure: also used by the node test). */
export function togglesHTML(X, heading = 'Layers') {
  const L = [...X.toggles.values()]; if (!L.length) return '';
  return `<h3>${esc(heading)}</h3>${L.map(t => `<label class="check"><input type="checkbox" data-xlayer="${esc(t.id)}" ${X.toggleState(t.id) ? 'checked' : ''}> ${esc(t.title)}</label>`).join('')}`;
}
/** The whole More drawer as HTML (pure). */
export function moreHTML(X) {
  const P = [...X.panels.values()], bad = X.problems(), tg = togglesHTML(X);
  return `${tg ? `<div id="xl-block">${tg}</div>` : ''}
    ${P.length ? `<h3>Panels</h3><ul class="xp-list">${P.map(p => `<li><button type="button" class="xp-item" data-xpanel="${esc(p.id)}"><span>${esc(p.title)}</span></button></li>`).join('')}</ul>` : ''}
    ${bad.length ? `<h3>Not running in this visit</h3><p class="mini">These parts of the page could not be started, so what they show is missing from the picture. Leaving the theatre and entering again starts them afresh.</p><ul class="xp-bad">${bad.map(b => `<li><b>${esc(b.name)}</b> ${esc(b.text)}</li>`).join('')}</ul>` : ''}
    ${!tg && !P.length && !bad.length ? '<p class="empty">Nothing has been added to this visit.</p>' : ''}`;
}

// one change listener for a container of switches: after the layer has answered, the switch shows the state the layer itself reports
function wireToggles(root, th, ps) {
  ps.on(root, 'change', e => {
    const cb = e.target && e.target.closest ? e.target.closest('input[data-xlayer]') : null; if (!cb) return; const X = th.ext; if (!X) return;
    X.setToggle(cb.dataset.xlayer, cb.checked).then(now => { cb.checked = now; }, () => { cb.checked = X.toggleState(cb.dataset.xlayer); });
  });
  th.bus.on('ext-toggle', id => { const X = th.ext, cb = X && root.querySelector(sel(id)); if (cb) cb.checked = X.toggleState(id); }, ps);
}

/** The added switches inside another panel (Views): a block after the structure switches, drawn only while there is a switch. */
export function mountExtToggles(body, th, ps, heading = 'More layers') {
  const X = th.ext; if (!X) return null;
  const host = document.createElement('div'); host.id = 'xl-block'; const anchor = body.querySelector('#ly-block'); if (anchor) anchor.after(host); else body.prepend(host);
  const draw = () => { const X = th.ext; host.innerHTML = X ? togglesHTML(X, heading) : ''; host.hidden = !host.innerHTML; };
  wireToggles(host, th, ps); th.bus.on('ext', draw, ps); draw(); return host;
}

function morePanel() {
  let ps = null;
  const P = { title: 'More layers and panels', dispose: null,
    render(body, th) {
      ps = new Scope(MORE); P.dispose = () => { if (ps) ps.dispose(); ps = null; P.dispose = null; };
      const draw = () => {
        const X = th.ext, a = document.activeElement, had = a && body.contains(a) ? (a.dataset.xlayer != null ? sel(a.dataset.xlayer) : a.dataset.xpanel != null ? `[data-xpanel="${esc(a.dataset.xpanel)}"]` : null) : null;
        body.innerHTML = X ? moreHTML(X) : ''; const f = body.querySelector('input, button'); if (f) f.setAttribute('data-autofocus', '');
        if (had) { let n = null; try { n = body.querySelector(had); } catch { /* an id no selector can hold */ } (n || body).focus({ preventScroll: true }); }      // a redraw keeps the keyboard where it was
      };
      wireToggles(body, th, ps);
      ps.on(body, 'click', e => { const b = e.target && e.target.closest ? e.target.closest('[data-xpanel]') : null; if (b) th.openPanel(b.dataset.xpanel); });
      th.bus.on('ext', draw, ps); draw();
    } };
  return P;
}

// an added panel: a way back to the list, then the module's own drawing. renderFn(body, theatre, scope) may draw into body, or return HTML, a node, a cleanup function,
// an object with dispose(), or a promise of one of these. A render that throws shows a notice in the panel and is logged; the theatre goes on.
function extPanel(p) {
  let ps = null, inner = null;
  const P = { title: p.title, dispose: null,
    render(body, th) {
      ps = new Scope('added:' + p.id); P.dispose = () => { if (inner) inner.dispose(); inner = null; if (ps) ps.dispose(); ps = null; P.dispose = null; };
      const back = document.createElement('p'); back.className = 'xp-back'; back.innerHTML = `<button type="button" class="btn-s">${ic('back')}All added layers and panels</button>`;
      const box = document.createElement('div'); box.className = 'xp-body'; box.dataset.xpanel = p.id; body.append(back, box);
      ps.on(back.firstElementChild, 'click', () => th.openPanel(MORE));
      const fail = e => { console.error(`ext ${p.owner ? p.owner.path : ''}: panel '${p.id}' could not be drawn`, e); box.innerHTML = `<p class="fail">This panel could not be drawn: ${esc(String((e && e.message) || e))}</p>`; };
      const draw = () => {
        if (inner) inner.dispose(); const sc = inner = new Scope('added-body:' + p.id), top = body.scrollTop; box.replaceChildren();
        const take = r => { if (sc.disposed) return; if (typeof r === 'string') box.innerHTML = r; else if (r && r.nodeType) box.append(r); else if (typeof r === 'function') sc.add(r); else if (r && typeof r.dispose === 'function') sc.add(() => r.dispose()); body.scrollTop = top; };
        try { const r = p.render(box, th, sc); if (r && typeof r.then === 'function') r.then(take, e => { if (!sc.disposed) fail(e); }); else take(r); } catch (e) { fail(e); }
      };
      th.bus.on('ext-panel', id => { if (id === p.id) { el(th).textContent = p.title; draw(); } }, ps);
      draw();
    } };
  return P;
}
const el = th => th.root.querySelector('#bt-drawer-title');

/** Called once per visit, after the top bar exists and before the modules start. Gives the theatre panelFor(name) (the shell's own panels first) and keeps the More tool in step. */
export function mountExtensionsUI(th) {
  const X = th.ext, sc = th.scope, btn = th.root.querySelector('#bt-more'), own = th.PANELS || {}, more = morePanel();
  th.panelFor = name => own[name] || (name === MORE ? more : (th.ext && th.ext.panels.has(name) ? extPanel(th.ext.panels.get(name)) : null));
  const paint = () => {
    const X = th.ext; if (!X || !btn) return; const n = X.panels.size + X.toggles.size, bad = X.problems().length;
    btn.hidden = !(n || bad); btn.dataset.alert = String(bad > 0); btn.title = bad ? `${bad} part${bad === 1 ? '' : 's'} of the page not running` : '';
    if (th.state.panel && th.state.panel !== MORE && !own[th.state.panel] && !X.panels.has(th.state.panel)) th.openPanel(MORE);      // the open panel went away with its module: back to the list
    if (!n && !bad && th.state.panel === MORE) th.closePanel(false);
  };
  th.bus.on('ext', paint, sc); paint(); void X;
}
