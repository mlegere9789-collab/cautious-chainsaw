// The selection card: a unit at the current time, fed only through the history-layer interface (units, arrivals, activity from the stage, kit manifest, sources).
import { fmtDate, fmtTime, fmtShort } from '../clock.mjs';
import { LABEL_PLACEHOLDER } from '../config.mjs';
import { validateKit, strengthText } from '../history/contract.mjs';
import { esc, ic, pill, sidePill, regLink, fmtN } from './util.mjs';
import { lossSection, lossLive, gunsRows, formationRows, formationLive, figuresSection, provenanceSection, daySection, horseSection } from './card-sections.mjs';

const ACT = { march: 'Marching', double_quick: 'Double-quick', halt: 'Halted', stand: 'Standing', rest: 'Resting', fire: 'Firing', serve_guns: 'Serving the guns', gallop: 'Galloping', build_works: 'Building works', camp: 'In camp' };
const dms = (v, pos, neg) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;

export function mountCard(th) {
  const card = th.els.card, sc = th.scope; let cur = -1, at = 0, figKey = '';
  const q = s => card.querySelector(s);
  function build(i) {
    const u = th.layer.units[i], a = th.stage.arrivals.get(u.id), kit = th.layer.kit(u.id, th.state.t), kerr = validateKit(kit);
    const srcs = u.sources.map(k => th.layer.sources[k]).filter(Boolean);
    card.innerHTML = `<div class="card-head"><h2 id="bt-card-title">${esc(u.name)}</h2><button type="button" class="icon-btn" id="bt-card-close" aria-label="Clear selection">${ic('close')}</button></div>
      <div class="card-body">
        ${u.stub ? `<p class="ph"><b>${LABEL_PLACEHOLDER}.</b> ${esc(u.notes)} Its place, times and activity are stand-ins, not history.</p>` : `<p class="ph"><b>${esc({ moving: 'Placed', edge_only: 'Arrival edge only', not_drawn: 'Open gap: no place', aggregate: 'Formation', not_on_field: 'Not on the field' }[u.render.status] || 'Unit')}.</b> ${esc(u.notes)}</p>`}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${sidePill(u.side)}${pill(u.tier)}<span class="pill">${esc(u.arm)}</span>${u.approach && u.approach.modelled ? '<span class="pill" title="The road of approach is modelled from the sibling formations of the corps, not printed for this unit">Modelled approach</span>' : ''}</div>
        <dl>
          <div class="row"><dt>Time</dt><dd id="cd-t"></dd></div>
          <div class="row"><dt>Activity</dt><dd id="cd-act"></dd></div>
          <div class="row"><dt>Position</dt><dd id="cd-pos"></dd></div>
          <div class="row"><dt>Strength</dt><dd>${esc(strengthText(u, fmtN))} figures</dd></div>
          <div class="row"><dt>Arrival window</dt><dd>${a ? `opens ${fmtShort(a.earliest)}<br>default ${fmtShort(a.default)}${a.latest > a.default ? `<br>latest ${fmtShort(a.latest)}` : ''}${a.conflict ? `<br>follows ${esc(a.conflict)}` : ''}` : 'not on the field (no arrival)'}</dd></div>
          ${a && a.entry_status ? `<div class="row"><dt>Entry</dt><dd>${esc(a.entry_status)}</dd></div>` : ''}
          <div class="row"><dt>On the field</dt><dd id="cd-on"></dd></div>
          ${u.stub ? '' : formationRows(th, u)}${u.stub ? '' : gunsRows(u)}
        </dl>
        <p class="mini">Strength basis: ${esc(u.strength.basis)}</p>${a && a.note ? `<p class="mini">Arrival: ${esc(a.note)}</p>` : ''}
        ${u.stub ? '' : lossSection(th, u)}
        ${u.stub ? '' : horseSection(th, u)}
        <h3>Evidence</h3>
        <table class="table"><tr><th>Tier</th><td>${pill(u.tier)}</td></tr>${srcs.map(s => `<tr><th>Source key</th><td><code>${esc(s.key)}</code> ${esc(s.label)}${s.weak ? ' <span class="mini">(not a historical source)</span>' : ''}<br><span class="mini">${esc(s.citation)}</span></td></tr>`).join('')}</table>
        ${u.stub ? '' : provenanceSection(u)}
        ${u.stub ? '' : daySection(th, u)}
        <div id="cd-figs">${u.stub ? '' : figuresSection(th, u, th.state.t)}</div>
        <h3>Kit manifest</h3>
        <table class="table">${kit.items.map(it => `<tr><th>${esc(it.category)}</th><td>${esc(it.item)}</td></tr>`).join('')}</table>
        <p class="mini" style="margin-top:6px">Validator: ${esc(kit.validator.rule)} · ${kit.validator.passed === null ? 'not run: ' + esc(kit.validator.note || '') : kit.validator.passed ? 'passed' : 'failed'}${kerr.length ? ' · manifest shape error' : ''}</p>
        <div class="actions">${u.register ? regLink(u.register, 'Open register entry ' + u.register) : ''}${u.approach && u.approach.modelled && u.approach.register ? regLink(u.approach.register, 'Open register entry ' + u.approach.register + ' (modelled approach)') : ''}<button type="button" class="btn-s" id="cd-fly">${ic('focus')}Fly to</button><button type="button" class="btn-s" id="cd-follow" aria-pressed="false">Follow</button></div>
      </div>`;
    sc.on(q('#bt-card-close'), 'click', () => th.select(-1)); sc.on(q('#cd-fly'), 'click', () => th.flyToUnit(i));
    sc.on(q('#cd-follow'), 'click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); if (on) th.controls.followUnit(() => th.stage.present[i] ? [th.stage.cx[i], th.stage.cz[i]] : null); else th.controls.follow = null; });
  }
  function update() {
    if (cur < 0) return; const st = th.stage, t = th.state.t, u = th.layer.units[cur]; const on = !!st.present[cur];
    const set = (id, h) => { const n = q(id); if (n && n.innerHTML !== h) n.innerHTML = h; };
    set('#cd-t', `${fmtDate(t)} ${fmtTime(t)}`);
    set('#cd-on', on ? 'yes' : (th.stage.presence[u.id] && t < th.stage.presence[u.id].from / 60 ? 'not yet: its arrival window has not opened' : 'no longer'));
    set('#cd-act', on ? esc(ACT[st.act[cur]] || st.act[cur]) : '—');
    if (!u.stub) {
      set('#cd-loss', lossLive(th, cur, t)); if (q('#cd-form')) set('#cd-form', formationLive(th, cur, t));
      const dkey = th.layer.figureSummary ? `${cur}|${Math.floor(t / 1440)}|${th.stage.presence[u.id] && t >= th.stage.presence[u.id].from / 60 ? 1 : 0}` : ''; if (dkey !== figKey) { figKey = dkey; const f = q('#cd-figs'); if (f) f.innerHTML = figuresSection(th, u, t); }
    }
    if (on) { const [lng, lat] = th.geo.lnglat(st.cx[cur], st.cz[cur]); set('#cd-pos', `${dms(lat, 'N', 'S')}<br>${dms(lng, 'E', 'W')}<br>± ${Math.round(st.sig[cur])} m (${u.stub ? LABEL_PLACEHOLDER : u.tier})`); } else set('#cd-pos', '—');
  }
  th.bus.on('select', i => {
    cur = i; th.root.dataset.card = i < 0 ? 'off' : 'on'; if (i < 0) { card.hidden = true; card.innerHTML = ''; return; }
    figKey = ''; build(i); card.hidden = false; update(); card.setAttribute('aria-labelledby', 'bt-card-title');
  }, sc);
  th.bus.on('frame', () => { const n = performance.now(); if (cur >= 0 && n - at > 250) { at = n; update(); } }, sc);
  th.bus.on('scenario', () => { if (cur >= 0) { build(cur); update(); } }, sc);
}
