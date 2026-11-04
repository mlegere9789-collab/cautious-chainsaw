// The card of a selected structure object (a fence line, wall, building, borough mass, marker, road): name, kind, its state at the current time, where its geometry comes from and
// with what error, the tier, the state-schedule rows, the readings of the record that conflict (selectable), the sources and what is generic. Nothing is hidden: a generic
// dimension says so and carries the tier plausible-procedural.
import { fmtDate, fmtTime, fmtShort } from '../clock.mjs';
import { CLASS_LABEL, msOfMin } from '../structures/model.mjs';
import { esc, ic, pill } from './util.mjs';

const WHAT = {
  buildings: 'A building drawn from a footprint in the 1863 base map layer. The outline is the record\'s; the height, roof and colours are generic class defaults and are marked so.',
  masses: 'A schematic mass: the extent of the building symbols inked on the 1868-69 survey plate. It is not one building and may include buildings put up after July 1863; its height is generic.',
  works: 'A work or a pre-existing wall known only to a place its location text names. No line is mapped in the repository, so a ring of the uncertainty of that place marks it. A work is built on screen over its printed window and never before its start; a pre-existing wall has no construction.',
  fences: 'A fence or wall line that the 1868-69 survey sheet confirms at a modern mapped line. The style of 1863 is not read from the sheet; panels and dimensions are generic and marked so.',
  markers: 'A structure known only as a point (a map symbol, a crossing, a site). A labelled pole marks the place; no footprint is invented.',
  roads: 'A road, lane or railway line of the 1863 base map layer, drawn as a ground ribbon on the modern ground. The width and surface are generic unless the record says otherwise.',
};
const dms = (v, pos, neg) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;
export function mountObjectCard(th) {
  const card = th.els.card, sc = th.scope; let cur = -1, at = 0, lastSig = '';
  const q = s => card.querySelector(s);
  const S = () => th.structs;
  function build(oid) {
    const s = S(), m = s.model, o = m.objects[oid], d = m.describe(oid, th.state.t, s.choice()), rec = o.rec ? s.engine.byId.get(o.rec) : null, g = d.geometry || {};
    const src = (d.sources || []).map(x => `<tr><th><code>${esc(x.key)}</code></th><td>${esc(x.cite || '')}${x.type ? ` <span class="mini">(${esc(x.type)})</span>` : ''}</td></tr>`).join('');
    const rows = d.rows && d.rows.length ? [...new Set(d.rows.map(r => (/:chg\d+$/.test(r) ? 'B.8.3 fence table' : r.split(':')[0])))].map(r => `<code>${esc(r)}</code>`).join(' ') : 'none for this object';
    const scn = d.scenarios && d.scenarios.length > 1 ? `<div class="row"><dt>Reading of the record</dt><dd><select id="oc-sc" aria-label="Reading of the record for ${esc(o.name)}" class="field" style="height:32px;width:auto;max-width:210px">${d.scenarios.map(x => `<option value="${esc(x)}" ${x === d.scenario ? 'selected' : ''}>${x === 'default' ? 'Default (as the schedule reads)' : esc(x.replace(/_/g, ' '))}</option>`).join('')}</select></dd></div>` : '';
    const conf = rec && rec.conflicts && rec.conflicts.length ? `<h3>Where the record disagrees</h3><ul class="mini" style="margin:0 0 0 16px">${rec.conflicts.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="mini">Nothing is chosen for you: pick a reading above, or in Sources.</p>` : '';
    const gaps = rec && rec.gaps && rec.gaps.length ? `<h3>Open gaps</h3><ul class="mini" style="margin:0 0 0 16px">${rec.gaps.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : '';
    const f = d.form;
    const form = f ? `<h3>Form (not documented unless stated)</h3><table class="table">${o.cls === 'buildings' || o.cls === 'masses' ? `<tr><th>Walls</th><td>${esc(f.wall)}${f.wall_known ? '' : ' (generic colour)'}</td></tr><tr><th>Roof</th><td>${esc(f.roof)}</td></tr><tr><th>Height</th><td>${f.height ? f.height.toFixed(1) + ' m to the ridge' : '—'} · ${f.eaveH ? f.eaveH.toFixed(1) + ' m to the eave' : ''}</td></tr>` : ''}${o.cls === 'fences' ? `<tr><th>Panel</th><td>${f.height} m high, ${f.panel} m long</td></tr>` : ''}${o.cls === 'roads' ? `<tr><th>Surface</th><td>${esc(f.surface)} · ${f.width} m wide</td></tr>` : ''}<tr><th>Basis</th><td>${esc(f.basis)}${f.style_basis ? '<br>' + esc(f.style_basis) : ''}</td></tr><tr><th>Tier of the form</th><td>${pill(f.tier)}</td></tr></table>` : '';
    const gx = o.cls === 'markers' ? `${esc(g.represents || '')}` : esc(g.represents || '');
    card.innerHTML = `<div class="card-head"><h2 id="bt-card-title">${esc(o.name)}</h2><button type="button" class="icon-btn" id="bt-card-close" aria-label="Clear selection">${ic('close')}</button></div>
      <div class="card-body">
        <p class="ph"><b>${esc(CLASS_LABEL[o.cls])}.</b> ${esc(WHAT[o.cls])}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${pill(o.tier)}<span class="pill">${esc(o.id)}</span>${o.rec ? `<span class="pill" title="Record in structures.json">${esc(o.state_id)}</span>` : ''}${d.visual && d.visual.uncertain ? '<span class="pill" title="The record dates the change to a day, not a minute">Date only</span>' : ''}</div>
        <dl>
          <div class="row"><dt>Time</dt><dd id="oc-t"></dd></div>
          <div class="row"><dt>State now</dt><dd id="oc-st"></dd></div>
          <div class="row"><dt>Shown as</dt><dd id="oc-shown"></dd></div>
          ${scn}
          <div class="row"><dt>Schedule rows</dt><dd id="oc-rows">${rows}</dd></div>
          <div class="row"><dt>Geometry</dt><dd>${esc(g.kind || '—')}${g.err != null ? `<br>± ${esc(g.err)} m` : ''}${g.conf ? `<br>basemap confidence: ${esc(g.conf)}` : ''}</dd></div>
          ${gx ? `<div class="row"><dt>It represents</dt><dd>${gx}</dd></div>` : ''}
          <div class="row"><dt>Position</dt><dd id="oc-pos"></dd></div>
          <div id="oc-hosp"></div>
        </dl>
        ${form}
        <h3>Evidence</h3>
        <table class="table"><tr><th>Tier</th><td>${pill(o.tier)} <span class="mini">of its existence and position</span></td></tr>${rec ? `<tr><th>Record</th><td>${esc(rec.name)}<br><span class="mini">${esc(rec.section || '')} · printed tier ${esc(rec.tier_printed || rec.tier || '—')}${rec.weak_source ? ' · weak sources only' : ''}</span></td></tr>` : ''}${src}</table>
        ${o.meta && o.meta.rec && o.meta.rec.rule ? `<p class="mini">Attribution to ${esc(o.meta.rec.id)}: ${esc(o.meta.rec.rule)}.</p>` : ''}
        ${o.meta && o.meta.notes ? `<p class="mini">${esc(o.meta.notes)}</p>` : ''}${o.meta && o.meta.period_note ? `<p class="mini">${esc(o.meta.period_note)}</p>` : ''}
        ${conf}${gaps}
        <p class="mini" style="margin-top:10px">Reconstruction from period maps and later documentation, not a photograph of 1863. Seeded, unverified: the schedule rows are transcribed from the plan and no primary source has been opened to confirm them.</p>
        <div class="actions"><button type="button" class="btn-s" id="oc-fly">${ic('focus')}Fly to</button></div>
      </div>`;
    sc.on(q('#bt-card-close'), 'click', () => th.selectObject(-1));
    sc.on(q('#oc-fly'), 'click', () => { const [x, z] = m.focusOf(o), r = o.cls === 'fences' || o.cls === 'roads' ? 70 : 55; th.controls.flyTo(th.viewFor(x, z, { dist: r, height: o.cls === 'roads' ? 40 : 22 })); });
    const sel = q('#oc-sc'); if (sel) sc.on(sel, 'change', e => { const st = th.state; st.structChoice[o.state_id] = e.target.value; lastSig = ''; update(true); th.announce('Reading of the record changed for ' + o.name + '.'); });
  }
  function update(force) {
    if (cur < 0) return; const s = S(); if (!s || !s.model) return; const m = s.model, o = m.objects[cur], t = th.state.t, d = m.describe(cur, t, s.choice());
    const sig = `${Math.floor(t * 4)}|${d.scenario}`; if (!force && sig === lastSig) return; lastSig = sig;
    const set = (id, h) => { const n = q(id); if (n && n.innerHTML !== h) n.innerHTML = h; };
    set('#oc-t', `${fmtDate(t)} ${fmtTime(t)}`);
    const st = d.state, v = d.visual;
    let stateTxt = st ? esc(st.state) : (o.state_id ? 'no state in the schedule' : 'no schedule row names it: unchanged');
    if (st && st.status === 'indeterminate_date_only') stateTxt += '<br><span class="mini">the record gives the day, not the minute: drawn half and half until the window closes</span>';
    if (st && st.status === 'transitioning') stateTxt += `<br><span class="mini">${Math.round((st.progress || 0) * 100)}% through the printed window</span>`;
    set('#oc-st', stateTxt);
    let shown = 'unchanged'; if (v && v.vis === 0) shown = 'not drawn: it does not exist yet / any more'; else if (v) { const a = v.A, b = v.B; const nz = x => x.some(y => y > 0); shown = nz(a) || nz(b) ? (o.cls === 'fences' ? `${Math.round(Math.max(a[1], 0) * 100)}% to ${Math.round(b[1] * 100)}% of panels removed; ${Math.round(a[0] * 100)}% to ${Math.round(b[0] * 100)}% fallen` : `burn ${Math.round(a[0] * 100)}% to ${Math.round(b[0] * 100)}%, damage ${Math.round(a[1] * 100)}% to ${Math.round(b[1] * 100)}%`) : 'unchanged (a use or role is not drawn)'; }
    if (o.cls === 'works') shown = `a labelled ring at the place named (no mapped line)${d.progress != null && !o.work.pre_existing ? '; ' + Math.round(d.progress * 100) + '% built by the schedule' : ''}`;
    set('#oc-shown', esc(shown));
    const [x, z] = m.focusOf(o); const [lng, lat] = th.geo.lnglat(x, z); set('#oc-pos', `${dms(lat, 'N', 'S')}<br>${dms(lng, 'E', 'W')}`);
    const hs = d.hospitals || []; set('#oc-hosp', hs.map(h => `<div class="row"><dt>Hospital ${esc(h.id)}</dt><dd>${esc(h.h.name)}<br><span class="mini">${esc(h.phase === 'none' ? 'not yet set up' : h.phase === 'open' ? 'in use' : h.phase === 'opening' ? 'set up within its printed window' : h.phase === 'closing' ? 'closing within its printed window' : h.phase === 'closed' ? 'closed' : 'no time printed')} · set up: ${esc(h.h.setup_printed || '—')}${h.h.closing_printed && h.h.closing_printed !== 'n/a' ? ' · closing: ' + esc(h.h.closing_printed) : ''}${h.note ? ' · ' + esc(h.note) : ''}${h.h.weak ? ' · weak source' : ''}</span></dd></div>`).join(''));
  }
  th.bus.on('select-obj', oid => {
    cur = oid; if (oid < 0) { if (card.dataset.kind === 'object') { card.hidden = true; card.innerHTML = ''; th.root.dataset.card = 'off'; delete card.dataset.kind; } return; }
    card.dataset.kind = 'object'; th.root.dataset.card = 'on'; lastSig = ''; build(oid); card.hidden = false; update(true); card.setAttribute('aria-labelledby', 'bt-card-title');
  }, sc);
  th.bus.on('select', i => { if (i >= 0 && card.dataset.kind === 'object') delete card.dataset.kind; }, sc);
  th.bus.on('frame', () => { const n = performance.now(); if (cur >= 0 && n - at > 250) { at = n; update(false); } }, sc);
  th.bus.on('scenario', () => { if (cur >= 0) { build(cur); update(true); } }, sc);
}
