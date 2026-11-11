// The structures controls of the drawers: per-class toggles and the list of what is not drawn (Views), and the readings of the printed conflicts that change how the
// structures look over time (Sources). Pure DOM; every listener goes through the panel's scope.
import { CLASSES, CLASS_LABEL } from '../structures/model.mjs';
import { esc } from './util.mjs';

export function mountLayersBlock(body, th, ps) {
  const S = th.structs; const host = document.createElement('div'); host.id = 'ly-block'; body.prepend(host);
  if (!S) { host.innerHTML = `<h3 style="margin-top:0">Structures</h3><p class="mini">${th.structsError ? 'The structures could not be loaded: ' + esc(th.structsError) : 'Structures are switched off for this visit (?structures=off).'}</p>`; return; }
  const c = S.model.counts, L = th.state.layers, S2 = th.state.settings, d = S.inputs.data;
  const count = { roads: `${c.roads} roads, lanes and rail lines`, fences: `${c.fences} lines, ${c.panels} panels`, buildings: `${c.buildings} footprints`, masses: `${c.masses} masses`, markers: `${c.markers} points` };
  host.innerHTML = `<h3 style="margin-top:0">Structures (reconstruction)</h3>
    <p class="mini" style="margin-bottom:8px">Drawn from the 1863 base-map layers, each with its own error and tier; click one for its card. Where only a point exists a labelled pole is drawn, never a building.</p>
    ${CLASSES.map(k => `<label class="check"><input type="checkbox" data-layer="${k}" ${L[k] ? 'checked' : ''}> ${esc(CLASS_LABEL[k])} <span class="mini">· ${esc(count[k])}</span></label>`).join('')}
    <label class="check"><input type="checkbox" data-layer="works" ${S2.works ? 'checked' : ''}> Works (rings at the place named; no work has a mapped line) <span class="mini">· ${th.layer.objects.filter(o => !o.pre_existing && (o.at || o.line)).length} rings</span></label>
    <details style="margin:10px 0"><summary class="mini" style="cursor:pointer">Not drawn, and why (${d.notDrawn.length} records, ${d.notDrawnGroups.reduce((a, g) => a + g.n, 0)} map features)</summary>
      <p class="mini" style="margin:8px 0 4px"><b>Records with no geometry or no role in the picture</b></p><ul class="mini" style="margin:0 0 8px 16px;line-height:1.45">${d.notDrawn.map(r => `<li><code>${esc(r.id)}</code> ${esc(r.name.length > 70 ? r.name.slice(0, 68) + '…' : r.name)}: ${esc(r.reason)}</li>`).join('')}</ul>
      <p class="mini" style="margin:8px 0 4px"><b>Map features</b></p><ul class="mini" style="margin:0 0 8px 16px;line-height:1.45">${d.notDrawnGroups.map(g => `<li>${g.n} × ${esc(g.layer)}: ${esc(g.reason)} <span class="mini">(${esc(g.ids.slice(0, 3).join(', '))}${g.n > 3 ? ', …' : ''})</span></li>`).join('')}</ul></details>`;
  for (const cb of host.querySelectorAll('input[data-layer]')) ps.on(cb, 'change', () => {
    const k = cb.dataset.layer; if (k === 'works') S2.works = cb.checked; else { L[k] = cb.checked; if (!cb.checked && th.state.selectedObj >= 0 && S.model.objects[th.state.selectedObj].cls === k) th.selectObject(-1); }
    th.announce(`${k === 'works' ? 'Works' : CLASS_LABEL[k]} ${cb.checked ? 'shown' : 'hidden'}.`);
  });
}

export function mountStructScenarios(body, th, ps) {
  const S = th.structs; if (!S) return; const st = th.state; const host = document.createElement('div'); host.id = 'sc-struct'; body.append(host);
  const rows = new Map(S.inputs.sched.rows.map(r => [r.id, r]));
  const opts = pd => [...new Set((pd.scenarios || []).filter(x => x !== 'default'))];
  host.innerHTML = `<h3>How the structures follow these conflicts</h3><p class="mini" style="margin-bottom:10px">The state schedule (fences, buildings, works) reads the printed conflicts below as named readings. Nothing is removed: the default is the row as the schedule reads it, except for the works of the delegated decisions DD-02 to DD-05 (breastworks built on screen in the Official Records window), which open on that reading, reversible by the owner; the plan's reading stays selectable. A reading changes only what the schedule can show for the objects it names.</p>
    ${S.pd.map(pd => `<section class="conflict" data-id="${esc(pd.id)}" data-changed="${!!(st.structPD || {})[pd.id]}"><h3><span class="id">${esc(pd.id)}</span>${esc(pd.topic)}${pd.conflict_id ? ` <span class="mini">(${esc(pd.conflict_id)})</span>` : ''}</h3>
      <p class="printed">${pd.printed.map(p => `<b>${esc(p.where)}:</b> ${esc(p.default || '')}${p.alternatives ? ' · other: ' + esc(p.alternatives) : ''}`).join('<br>')}${pd.contradiction ? '<br><b>The plan contradicts itself here.</b>' : ''}</p>
      <select data-pd="${esc(pd.id)}" aria-label="Reading for ${esc(pd.id)} ${esc(pd.topic)}"><option value="">${'Default (as the schedule reads)'}</option>${opts(pd).map(x => `<option value="${esc(x)}" ${(st.structPD || {})[pd.id] === x ? 'selected' : ''}>${esc(x.replace(/_/g, ' '))}</option>`).join('')}</select></section>`).join('')}`;
  ps.on(host, 'change', e => { const s = e.target.closest('select[data-pd]'); if (!s) return; st.structPD = st.structPD || {}; if (!s.value) delete st.structPD[s.dataset.pd]; else st.structPD[s.dataset.pd] = s.value; s.closest('.conflict').dataset.changed = String(!!s.value); th.announce(`${s.dataset.pd} read as ${s.value || 'the default'}.`); th.bus.emit('scenario'); });
  void rows;
}
