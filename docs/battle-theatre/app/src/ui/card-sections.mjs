// Sections of the unit card added by contract 1.3: losses (ranges with their basis), guns, formation, and the per-figure kit manifests. Pure HTML builders over the layer and the stage.
import { fmtShort, fmtTime, isoToMin } from '../clock.mjs';
import { esc, pill, fmtN } from './util.mjs';
import { FIELD_ORDER } from '../history/manifest.mjs';
import { horseRange, horseLossRange, dismountRecord, dismountShare, dismountCounts, HOLDER, LED, HORSE_LOSS } from '../history/cavalry.mjs';

const rng = r => (r.min === r.max ? fmtN(r.min) : `${fmtN(r.min)}-${fmtN(r.max)}`);
const FATE_LABEL = { killed: 'Killed', wounded: 'Wounded', missing: 'Missing' };
const nice = s => String(s).replace(/_/g, ' ');

// ---- losses
export function lossSection(th, u) {
  const c = u.casualties; if (!c) return '';
  if (c.kind === 'none') return `<h3>Losses</h3><p class="mini">No loss is assigned to this unit: ${esc(c.basis)}.</p>`;
  const clauses = (th.layer.engagements ? c.engagement_clauses.map(id => th.layer.engagements.get(id)).filter(Boolean) : []);
  const win = clauses.length ? `<table class="table" style="margin-top:6px">${clauses.map(cl => `<tr><th>${esc(cl.id)}</th><td>${esc(fmtShort(cl.window.from))} to ${esc(fmtTime(cl.window.to))} · timeline row <code>${esc(cl.row)}</code> (${esc(cl.row_status.replace(/_/g, ' '))})${cl.or27_audit ? ` · OR27 audit: ${esc(nice(cl.or27_audit.verdict))}` : ''}<br><span class="mini">${esc(cl.note)}</span></td></tr>`).join('')}</table>` : '<p class="mini">No printed engagement window names this unit or a formation above it, so its losses are not placed in time: they stay a total (an open gap, not spread over the day).</p>';
  return `<h3>Losses <span class="mini">(procedural share of a printed figure)</span></h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${pill(c.tier)}<span class="pill">weak source</span></div>
    <dl>
      <div class="row"><dt>${c.kind === 'printed' ? 'Printed loss' : 'Loss share'}</dt><dd>${c.total.min === c.total.max ? fmtN(c.total.printed) : `${fmtN(c.total.printed)} (range ${rng(c.total)} across the source spread)`}</dd></div>
      ${['killed', 'wounded', 'missing'].map(f => `<div class="row"><dt>${FATE_LABEL[f]}</dt><dd>${rng(c.fates[f])}</dd></div>`).join('')}
      <div class="row"><dt>On the map now</dt><dd id="cd-loss">—</dd></div>
    </dl>
    <p class="mini">Basis: ${esc(c.basis)}</p><p class="mini">${esc(c.fate_basis)}. A man who lies down is a killed or a wounded man; a missing man is counted, not animated (the renderer cannot show a man leaving the line).</p>
    <h3>Engagement windows</h3>${win}`;
}
// the live row: the running ranges at the current time
export function lossLive(th, i, t) {
  const u = th.layer.units[i], c = u.casualties; if (!c || c.kind === 'none') return '—';
  const l = th.stage.lossAt(i, t), rep = th.layer.report(th.state.scenario).casualties.find(x => x.unit === u.id);
  if (!u.drawn) return `not drawn: no per-man fall (the losses stay a total)`;
  if (!rep) return c.engaged ? 'its printed windows do not meet a time when it stands on the map: no man falls' : 'no printed window: no man falls';
  const note = `${rep.not_shown ? `${fmtN(rep.shown)} of ${fmtN(rep.plan_events)}` : `all ${fmtN(rep.plan_events)}`} of its losses fall where it stands on the map${rep.not_shown ? `; ${fmtN(rep.not_shown)} fall while it is marching in or away or not yet arrived and are not shown` : ''}`;
  if (!l) return `strength ${fmtN(u.strength.drawn)} · no man has fallen yet<br><span class="mini">${esc(note)}</span>`;
  return `strength ${rng(l.strength_now)} of ${fmtN(u.strength.drawn)} · down ${fmtN(l.down)} (killed ${rng(l.killed)}, wounded ${rng(l.wounded)}) · missing ${rng(l.missing)}<br><span class="mini">${esc(note)}</span>`;
}

// ---- guns
export function gunsRows(u) {
  const g = u.guns; if (!g || g.status === 'not_applicable') return '';
  if (g.status === 'drawn') return `<div class="row"><dt>Guns</dt><dd>${fmtN(g.count)} drawn (${esc(g.printed)}), each with a detachment of ${g.crew_per_gun} (gunner and Nos. 1-8)<br><span class="mini">${esc(g.limbers)}. Tier ${esc(g.tier)}${g.weak_source ? ', weak source' : ''}. The renderer has one gun model: the type is named here, not shown.</span></dd></div>`;
  return `<div class="row"><dt>Guns</dt><dd>not drawn: ${esc(g.reason)}</dd></div>`;
}

// ---- formation
export function formationRows(th, u) {
  const f = u.formation, base = { column_fours: 'column of fours', line: 'line', battery: 'battery (block of figures)', mounted_column: 'mounted column' }[f.kind] || nice(f.kind);
  const ch = (f.changes || []).map(x => `${esc(nice(x.to))} (${esc(x.id)}: “${esc(x.phrase)}”)`).join('; ');
  if (!u.drawn && !ch) return '';
  return `<div class="row"><dt>Formation</dt><dd id="cd-form">${esc(base)}</dd></div>${ch ? `<div class="row"><dt>Printed change</dt><dd>${ch}</dd></div>` : ''}`;
}
export function formationLive(th, i, t) {
  const u = th.layer.units[i], st = th.stage, base = { column_fours: 'column of fours', line: 'line' }[u.formation.kind] || nice(u.formation.kind);
  const w = th.world.units[i]; if (!w || !w.alt) return esc(base);
  const rec = st.cache.at(t * 60).u[i]; if (!rec) return esc(base);
  const b = st._blend(rec, t * 60), alt = nice(w.altFormation), basef = nice(w.baseFormation);
  return b <= 0.001 ? esc(basef) : b >= 0.999 ? esc(alt) : `changing from ${esc(basef)} to ${esc(alt)} (${Math.round(b * 100)}%)`;
}

// ---- figures
export function figuresSection(th, u, t) {
  const L = th.layer;
  if (!u.drawn) return `<h3>Figure manifests</h3><p class="mini">No figure is drawn for this unit, so no manifest is made.</p>`;
  if (!L.figures) return `<h3>Figure manifests</h3><p class="mini">The kit data for per-figure manifests is not available to this layer.</p>`;
  const s = L.figureSummary(u.id, t, th.state.scenario), v = L.figureValidation ? L.figureValidation(u.id) : null, RS = L.rendererSupport;
  const head = `<h3>Figure manifests <span class="mini">(per-figure kit, PDF B.6.12)</span></h3>`;
  const src = `<p class="mini">${s.default ? `No kit record exists for this unit or its brigade: its ${u.strength.drawn} figures use the default for ${esc(u.side)} ${esc(u.arm === 'cavalry' ? 'cavalry' : u.arm === 'artillery' ? 'artillery' : 'infantry')} (${esc(s.how_note || '')}).` : `Kit record <code>${esc(s.kit_unit)}</code> (${esc(s.kit_name)}), found by ${esc(s.how)}: ${esc(s.how_note || '')}.`} Rank private, role rifleman for every figure (the record has no rank structure).</p>`;
  const val = v ? `<p class="mini">B.6.12 validator (Python, tools/bt/check_figures.py): ${fmtN(v.figures)} figures of this unit checked, ${v.fail} fail, ${fmtN(v.flag)} flagged${v.digest_match ? ', and the Python manifests equal the ones drawn here' : ', but the digests differ: re-run the checker'}.</p>` : `<p class="mini">B.6.12 validator: not run for this unit.</p>`;
  const sup = `<p class="mini">Drawn from a manifest: ${RS.drawn.map(d => esc(d.how)).join(' ')} Not drawn (no support in the renderer): ${RS.not_drawn.map(esc).join('; ')}.</p>`;
  if (!s.present) return head + src + `<p class="mini">${esc(s.note)}</p>` + val + sup;
  if (s.disputed) return head + src + `<p class="ph"><b>Disputed.</b> ${esc(s.note)}: ${s.variants.map(esc).join(' and ')} (${s.dispute_ids.map(esc).join(', ')}). Pending owner.</p>` + val + sup;
  const rows = FIELD_ORDER.filter(f => s.by_field[f]).map(f => {
    const list = s.by_field[f], label = id => { const it = L.figures.kit.items[id]; return it && it.label ? it.label.split(':')[0] : nice(id); };
    const txt = list.slice(0, 3).map(r => `${esc(r.items.map(label).join(' + '))} <span class="mini">(${fmtN(r.count)})</span>`).join('; ') + (list.length > 3 ? `; <span class="mini">+${list.length - 3} more</span>` : '');
    const tiers = [...new Set(list.map(r => r.tier))];
    return `<tr><th>${esc(nice(f))}</th><td>${txt}<br><span class="mini">${tiers.map(esc).join(', ')}</span></td></tr>`;
  }).join('');
  const flags = Object.entries(s.flags).map(([f, n]) => `${esc(f)} (${fmtN(n)})`).join('; ');
  return head + src + `<p class="mini">On ${esc(s.date)}: ${fmtN(s.n)} manifests; weakest field tier ${esc(s.weakest_tier)}.</p><table class="table">${rows}</table>${flags ? `<p class="mini">Flags: ${flags}</p>` : ''}` + val + sup;
}

// ---- ledger claims behind a unit's approach, stops and departures (contract 1.4): the report, the printed page, the verified quote, the tier and the fidelity check of each claim; what was
// applied and what was not; and the reports that disagree, listed with both values and never resolved
const CODE_TEXT = { not_usable: 'claim not confirmed by its re-read (not used)', strength_note: 'strength notes (no place or time)', no_printed_time: 'no clock or period printed', no_gazetteer_place: 'no place the gazetteer holds', gazetteer_name_not_printed: 'place name not in the printed words', place_is_a_road: 'a road, not a place', place_too_broad: 'place too broad', place_outside_loaded_ground: 'place outside the loaded ground', printed_clock_unconfirmed: 'printed clock does not confirm the ledger time', departure_no_printed_time: 'departure with no printed time', departure_no_resolvable_road: 'departure with no road the gazetteer holds', reviewed_not_used: 'reviewed and not used (the reason is on its row of the data)', conflict_stop: 'conflict between reports', conflict_approach: 'conflict between reports', would_replace_pdf_stop: 'would replace a finer PDF-ledger place', corroborates_existing: 'agrees with a PDF-ledger entry already in use', unreachable: 'cannot be reached at double-quick', road_does_not_cross_ground: 'road does not cross the loaded ground', kind_not_a_stop: 'not a position statement', no_road: 'no road printed' };
// where a ledger claim comes from, as the card words it: an OR27 report (ledgers A to D) or a section of a state regimental volume (ledger E, history layer v8)
const srcLabel = c => (c.source_kind === 'statevol' ? `state regimental volume ${esc(c.work || c.volume)}, section <code>${esc(c.report)}</code>` : `OR27 report <code>${esc(c.report)}</code>`);
export function provenanceSection(u) {
  const p = u.provenance; if (!p) return '';
  const when = e => (e.t ? `${fmtShort(isoToMin(e.t))}${e.t_basis === 'convention' ? ` (“${e.period}”: labelled convention ${e.t.slice(11, 16)})` : e.approx ? ' (about)' : ''}` : '');
  const cl = c => `<code>${esc(c.id)}</code>, ${srcLabel(c)}${c.author ? ' (' + esc(c.author) + ')' : ''}, printed page ${esc(c.page)}${c.interpolated ? ' (page interpolated)' : ''}; ledger ${esc(c.ledger)}; claim tier ${esc(c.tier)}; fidelity check ${esc(String(c.fidelity).replace(/_/g, ' '))}${c.ocr_uncertain ? '; OCR uncertain' : ''}`;
  const KIND = { approach: 'Approach road', stop: 'Place', departure: 'Departure' };
  const rows = p.entries.map(e => {
    if (e.modelled) {                                                                  // contract 1.6: a MODELLED road taken from the sibling formations of the corps (DEC-015): nothing is printed for this unit
      const sib = e.siblings.map(x => `<code>${esc(x.ap)}</code> ${esc(x.unit_name || x.unit)}: ${esc(x.road)}, ${x.source === 'claim' ? `${srcLabel(x)}, printed page ${esc(x.page)}, claim <code>${esc(x.claim)}</code> (claim tier ${esc(x.claim_tier)})` : `PDF ledger row <code>${esc(x.row)}</code>, ${esc(String(x.cell).replace(/_/g, ' '))} cell`}, “${esc(x.phrase)}”${x.concordance ? ` (printed name “${esc(x.printed_name)}” identified with this road by concordance ${esc(x.concordance)})` : ''}`).join('<br>');
      return `<tr><th>Approach road <b>(modelled)</b> <code>${esc(e.entry)}</code>${e.via ? `<br><span class="mini">from ${esc(e.via)}</span>` : ''}</th><td>${esc(e.road)}${e.applied ? '' : `<br><b>Not applied:</b> ${esc(e.why_not)}`}<br><span class="mini"><b>Not printed for this unit or for any formation above it.</b> The road is the one the documented sibling formations of ${esc(e.formation)} name; nothing on the unit’s line of command names another. Siblings:<br>${sib}<br>${e.claims.map(id => p.claims[id] ? cl(p.claims[id]) : esc(id)).join('<br>')}<br>Placement tier ${esc(e.tier)}; evidence gap ${esc(e.register)}; decision ${esc(e.decision)}. The unit may in fact have come by another road.</span></td></tr>`;
    }
    const c = p.claims[e.claim];
    return `<tr><th>${KIND[e.kind]} <code>${esc(e.entry)}</code>${e.via ? `<br><span class="mini">from ${esc(e.via)}</span>` : ''}</th><td>${esc(e.road || e.place || '')}${e.t ? ' · ' + esc(when(e)) : ''}${e.applied ? '' : `<br><b>Not applied:</b> ${esc(e.why_not)}`}<br><span class="mini">Printed (${esc(e.phrase_in === 'record' ? 'in the OR record' : e.phrase_in)}): “${esc(e.phrase)}”${c && c.quote ? ` · quoted words: “${esc(c.quote)}”` : ''}<br>${e.claims.map(id => p.claims[id] ? cl(p.claims[id]) : esc(id)).join('<br>')}<br>Placement tier ${esc(e.tier)} (the place or road is a gazetteer entry; the claim is ${esc(e.claim_tier)})${e.identification ? `<br>Identification: ${esc(e.identification)}` : ''}</span></td></tr>`;
  }).join('');
  const sm = p.summary ? `<p class="mini">${fmtN(p.summary.read)} ledger claim${p.summary.read === 1 ? '' : 's'} (OR27 reports and state regimental volumes) name this unit: ${fmtN(p.summary.used)} used${Object.keys(p.summary.codes).length ? '; not used: ' + Object.entries(p.summary.codes).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${fmtN(n)} ${esc(CODE_TEXT[k] || k)}`).join(', ') : ''}.</p>` : '';
  const peers = p.peers.length ? `<details><summary>Other reports the ledger lists as conflicting (${p.peers.length}); none is chosen</summary><table class="table">${p.peers.map(x => `<tr><th><code>${esc(x.peer.id)}</code><br><span class="mini">${esc(x.peer.unit)}</span></th><td>${esc(x.peer.when.printed || x.peer.when.date || '')}${x.peer.when.t_iso ? ' (' + esc(fmtShort(isoToMin(x.peer.when.t_iso))) + ')' : ''} · ${esc(x.peer.place.printed || 'no place printed')}<br><span class="mini">“${esc(x.peer.quote)}” · ${x.peer.source_kind === 'statevol' ? esc(x.peer.work || x.peer.volume) + ', section ' : ''}${esc(x.peer.report)}, p. ${esc(x.peer.page)} · ${esc(x.peer.tier)} · fidelity ${esc(String(x.peer.fidelity).replace(/_/g, ' '))} · conflicts with <code>${esc(x.of)}</code></span></td></tr>`).join('')}</table></details>` : '';
  const KIND_NOTE = { stop_hour_differs: 'neither hour is used', approach_roads_differ: 'neither road is used', claim_differs_from_ledger_row: 'the PDF-ledger entry stays as it is; the claim is not applied', approach_refines_formation_above: 'the unit’s own report is the nearer printed road and is used; the road of the formation above is listed' };
  const conf = p.conflicts.length ? `<p class="ph"><b>Reports disagree (listed, not resolved).</b></p><table class="table">${p.conflicts.map(x => `<tr><th>${esc(String(x.kind).replace(/_/g, ' '))}${x.own ? '' : '<br><span class="mini">formation above</span>'}</th><td>${x.values.map(esc).join(' &nbsp;|&nbsp; ')}<br><span class="mini">${x.claims.map(c => `<code>${esc(c)}</code>`).join(', ')}${KIND_NOTE[x.kind] ? ' · ' + esc(KIND_NOTE[x.kind]) : ''}</span></td></tr>`).join('')}</table>` : '';
  // a documented absence (history layer v8, DEC-023E): the record places the unit away from the field; the claims are listed with their source, page, tier and quoted words
  const ab = p.absence ? `<p class="ph"><b>Documented absence from the field</b> (tier ${esc(p.absence.tier)}; evidence gap <code>${esc(p.absence.register)}</code>; decision ${esc(p.absence.decision)}). ${esc(p.absence.summary)}</p><table class="table">${p.absence.claims.filter(id => p.claims[id]).map(id => { const c = p.claims[id]; return `<tr><th><code>${esc(c.id)}</code></th><td>${esc(c.when && (c.when.printed || c.when.date) || '')}${c.place && c.place.printed ? ' · ' + esc(c.place.printed) : ''}<br><span class="mini">quoted words: “${esc(c.quote)}”<br>${srcLabel(c)}${c.author ? ' (' + esc(c.author) + ')' : ''}, printed page ${esc(c.page)}${c.interpolated ? ' (page interpolated)' : ''}; ledger ${esc(c.ledger)}; claim tier ${esc(c.tier)}; fidelity check ${esc(String(c.fidelity).replace(/_/g, ' '))}</span></td></tr>`; }).join('')}</table>` : '';
  if (!rows && !conf && !sm && !ab) return '';
  return `<h3>Ledger claims <span class="mini">(Official Records, vol. 27; state regimental volumes)</span></h3>${ab}${sm}${rows ? `<table class="table">${rows}</table>` : ''}${conf}${peers}`;
}

// ---- day-level positions of the troop maps (contract 1.5; DEC-010, DEC-011): what each sheet prints for the unit, whether it is drawn, what is documented (the position that day) and what is
// modelled (when the unit got there), and how the position compares with the ledgers' timed places (both shown, never resolved)
const SHEET_SHORT = { J1: 'Sheet 1, First day', J2: 'Sheet 2, Second day', J3: 'Sheet 3, Third day', H: 'LOC 99447494, 1 Jul 2 to 3.30 P.M.' };
const ymd = s => (s ? fmtShort(isoToMin(s)) : '');
export function daySection(th, u) {
  const dp = u.day_positions; if (!dp) return '';
  const L = th.layer, C = L.dayClaims || {}, steps = (L.report(th.state.scenario).day_stops || []).filter(d => d.unit === u.id), rows = [];
  const coord = c => `${Math.abs(c.lat).toFixed(5)}° ${c.lat >= 0 ? 'N' : 'S'}, ${Math.abs(c.lng).toFixed(5)}° ${c.lng >= 0 ? 'E' : 'W'}`;
  const clock = c => (c.t_iso ? `printed clock ${ymd(c.t_iso)}${c.clock_attachment ? ` (${nice(c.clock_attachment)})` : ''}` : c.t_start_iso || c.t_end_iso ? `printed span ${ymd(c.t_start_iso) || '?'} to ${ymd(c.t_end_iso) || '?'}` : '');
  const claimLine = c => `<code>${esc(c.id)}</code> “${esc(c.printed)}” · ${esc(coord(c))} · ± ${Math.round(c.sigma_m)} m (${esc(nice(c.basis || ''))}) · claim tier ${esc(c.tier)}${clock(c) ? ' · ' + esc(clock(c)) : ''}${c.line_state ? ' · line state ' + esc(nice(c.line_state)) : ''}`;
  const cmp = list => (list.length ? `<br><b>The ledgers’ timed places for the same date</b> (both are shown; neither is chosen): ${list.map(x => `${esc(x.entry)} ${esc(x.place)} at ${esc(ymd(x.t))}: ${fmtN(x.distance_m)} m from this position (place ± ${fmtN(x.sigma_place_m)} m, position ± ${fmtN(x.sigma_day_m)} m) ${x.agree ? '<i>agree within those uncertainties</i>' : '<b>differ</b>'} <span class="mini">(${esc(x.source)}, tier ${esc(x.tier)})</span>`).join('; ')}.` : '');
  const STATE_NAME = { first: 'First Position', intermediate: 'Intermediate', evening: 'Evening', all_day: 'All Day', mixed: 'Mixed (two bars of different styles)' };
  const ev = e => (e.evening != null ? fmtShort(e.evening).slice(-5) : '19:32');
  // one claim and state of a sheet entry: what is documented, what is modelled, the window in this scenario, the offset where the state's window cannot be met (contract 1.7, DEC-018)
  const itemBody = (e, it, hour) => {
    const used = C[it.claim], st = steps.find(d => d.id === it.entry), stateName = it.state ? STATE_NAME[it.state] : null;
    const nw = used.nw_of_seminary ? `<br><span class="mini">North-west of the Seminary (terrain/troopmaps/ACCURACY.md): the chain that registers sheets 2 and 3 was not tested there and the Warren sheet is 70 to 138 m out in the north-west corner; treat the position as worse than its sigma. Sigma as the file carries it.</span>` : '';
    const reg = e.sheet === 'J1' && used.sigma_transform_m ? ` Registration sigma of this sheet-1 position ${Math.round(used.sigma_transform_m)} m (the displacement field of the roads layer, not the chain).` : '';
    const stateLine = hour ? '' : it.state
      ? `<br><b>Line state: ${esc(stateName)}</b>${it.state === 'mixed' ? ` (${it.states.map(s => esc(STATE_NAME[s])).join(' and ')})` : ''} · documented for (unit, place, state): the bar of this label prints the legend’s ${esc(nice(it.state === 'mixed' ? it.states.join(' and ') : it.state))} style, read by eye (crop <code>${esc(it.state_crop || '')}</code>): ${esc(it.state_basis || '')}. Window: ${esc(it.state_time_tier === 'documented' ? 'documented at the printed clock, otherwise modelled' : 'modelled')} (DEC-018, provisional builder choice; the owner decides).<br><span class="mini">${esc(it.rule || '')}</span>`
      : `<br><b>No line state read for this label</b>: ${esc(it.state_basis || 'no reading')}. ${esc(it.rule || '')}`;
    const clockLine = it.clock_text ? `<br>Printed beside the line: “${esc(it.clock_text)}” — ${esc(it.line_clock ? it.line_clock.why : '')}${it.state_clock_used ? ` <b>Documented: the ${esc(nice(it.state))} line at ${esc(it.line_clock.hhmm)}.</b>` : ''}` : '';
    let when = '';
    if (st && st.applied) {
      const span = `it could have arrived at any time between ${esc(fmtShort(st.arrive))} and ${esc(fmtShort(st.latest_arrival))} (the end of the day, or the departure its next place needs)`, D = `marches ${fmtN(st.distance_m)} m at the march rate (1.25 m/s)`;
      const until = st.stands_until != null ? `until ${esc(fmtShort(st.stands_until))}, when it leaves for its next position` : it.state === 'first' || it.state === 'intermediate' ? `until the evening convention (${esc(ev(e))}); what follows is not printed readably, so the unit is kept here (a marked gap, no later place is invented)` : 'to local midnight';
      if (hour) when = `<br><b>Stop:</b> an inferred timed stop; the sheet prints a window (2 to 3.30 P.M.), not a minute. In this scenario the unit stands there from ${esc(fmtShort(st.arrive))}${st.latest_arrival != null ? ` (it could have arrived any time up to ${esc(fmtShort(st.latest_arrival))})` : ''}; it is shown arriving just in time for the start of the window.`;
      else if (st.merged_into) when = `<br><b>Documented:</b> the position that day${it.state ? ' and its line state' : ''}. <b>Modelled:</b> when the unit got there: the ledger stop <code>${esc(st.merged_into)}</code> puts the unit at this position at ${esc(fmtShort(st.arrive))}.`;
      else if (!it.state) when = `<br><b>Documented:</b> the position that day, the sheet gives no clock. <b>Modelled (plausible-procedural):</b> the unit leaves as soon as it may${st.hold_until ? ` (after the engagement window that ends ${esc(fmtShort(st.hold_until))})` : ''} and ${D}, arriving ${esc(fmtShort(st.arrive))}; ${span}. The day begins at local midnight.${st.required_by != null ? ` The sheet prints ${esc(fmtShort(st.required_by))} beside the label${st.required_by_met ? '' : '; the unit cannot arrive by then from its gate (the gate is not moved)'}.` : ''}`;
      else {
        const doc = `<br><b>Documented:</b> the position that day and that it was the unit’s ${esc(nice(it.state === 'mixed' ? it.states.join(' and ') : it.state))} line${it.state_clock_used ? `, at ${esc(it.line_clock.hhmm)} (the clock printed beside the line)` : ''}.`;
        let mod;
        if (it.state === 'all_day' || it.state === 'mixed') mod = `the unit leaves as soon as it may${st.hold_until ? ` (after the engagement window that ends ${esc(fmtShort(st.hold_until))})` : ''} and ${D}, arriving ${esc(fmtShort(st.arrive))}; ${span}; the line is held here ${until} (state window ${esc(fmtShort(st.state_from))} to ${esc(fmtShort(st.state_to))}). The day begins at local midnight.`;
        else if (it.state === 'first') mod = `the unit leaves as soon as it may${st.hold_until ? ` (after the engagement window that ends ${esc(fmtShort(st.hold_until))})` : ''} and ${D}, arriving ${esc(fmtShort(st.arrive))}; ${span}; the first position is held ${until} (state window ${esc(fmtShort(st.state_from))} to ${esc(fmtShort(st.state_to))}). The day begins at local midnight.`;
        else if (it.state === 'evening') mod = st.daytime_known ? `the unit stands at its previous known position of the day until ${esc(fmtShort(st.depart))}, then ${D} so as to be here at ${esc(it.state_clock_used ? it.line_clock.hhmm : 'the evening convention ' + ev(e))}, arriving ${esc(fmtShort(st.arrive))}; ${span}; the evening line is held to local midnight (state window ${esc(fmtShort(st.state_from))} to ${esc(fmtShort(st.state_to))}).`
          : `no earlier position of this day is printed readably or timed in the ledgers, so the unit is drawn here from its arrival: it leaves as soon as it may and ${D}, arriving ${esc(fmtShort(st.arrive))}; ${span}. <b>The daytime place is unknown</b> (an open gap: no daytime place is invented); the evening line is documented from ${esc(it.state_clock_used ? it.line_clock.hhmm : ev(e))} to local midnight (state window ${esc(fmtShort(st.state_from))} to ${esc(fmtShort(st.state_to))}).`;
        else mod = `between the first and the evening positions; ${it.state_clock_used ? `the clock printed beside the line (${esc(it.line_clock.hhmm)}) gives its time` : `the order and the time are not printed, so the modelled arrival is the middle of the open window (an arbitrary pick inside it)`}: the unit ${D}, arriving ${esc(fmtShort(st.arrive))}; ${span}; held ${until} (state window ${esc(fmtShort(st.state_from))} to ${esc(fmtShort(st.state_to))}). The day begins at local midnight.`;
        when = `${doc} <b>Modelled (plausible-procedural):</b> ${mod}`;
      }
      if (st.state_late_min > 0) when += `<br><b>Offset (reported, like the ledger-vs-edge offsets; the gate is not moved):</b> the state says the unit should be here by ${esc(fmtShort(st.arr_by))} (${st.arr_rule === 'clock' ? 'the clock printed beside the line' : 'the evening convention'}); from its gate and its earlier places it can arrive only at ${esc(fmtShort(st.arrive))}, ${st.state_late_min} min later.`;
    } else if (st) when = `<br><b>Not applied in this scenario:</b> ${esc(st.why_not)}`;
    return `${claimLine(used)}${esc(reg)}${nw}${stateLine}${clockLine}${when}`
      + `${it.drawn_as === 'not_drawn' || it.drawn_as === 'not_applied' || it.drawn_as === 'not_used' ? `<br><b>Not drawn:</b> ${esc(it.why_not)}` : it.drawn_as === 'aggregate' ? `<br>${esc(it.why_not)}.` : ''}`
      + `${it.refined_stops && it.refined_stops.length ? `<br>The ledger stop${it.refined_stops.length > 1 ? 's' : ''} ${it.refined_stops.map(esc).join(', ')} lie${it.refined_stops.length > 1 ? '' : 's'} inside this position, so the unit stands inside it at the ledger time.` : ''}`
      + cmp(it.ledger_compare)
      + `<br><span class="mini">Source: ${esc(e.sheet_label)}; position read ${esc(used.basis ? nice(used.basis) : '')} at scan pixel ${esc(JSON.stringify(used.scan_px || used.label_px))}; crop <code>${esc(used.crop || '')}</code>${used.crop_spec ? ' (' + esc(used.crop_spec) + ')' : ''}. A compiled map: positions come from the Official Records and testimony, so this is not an independent witness. ${hour ? esc(e.role) : it.state ? 'The legend defines the line states by their place in the day, not by a clock: the window is a model of that definition unless a complete clock is printed beside the line.' : 'The sheet merges the unit’s line states (first position, intermediate, evening, all day) and none could be read for this label: the position is the day’s, never a minute’s.'}</span>`;
  };
  for (const e of [...dp.days, dp.hour]) {
    if (!e) continue;
    const hour = e.sheet === 'H', head = `${esc(SHEET_SHORT[e.sheet])}<br><span class="mini">${esc(e.source)}</span>`;
    let body;
    if (e.status === 'single') {
      body = `${hour ? '<b>Hour sheet (inferred; the sheet’s author and date are unknown):</b> ' : '<b>One label on this sheet: documented for the day; time modelled</b> (DEC-010). '}${itemBody(e, e.items[0], hour)}`;
    } else if (e.status === 'sequence') {
      body = `<b>${e.labels} labels on this sheet, put in order by their line states: each documented for the day; time modelled</b> (DEC-010, DEC-018). ${esc(e.order_why)}.`
        + e.items.map((it, i) => `<div style="margin-top:6px"><b>${i + 1} of ${e.items.length}.</b> ${itemBody(e, it, false)}</div>`).join('');
    } else if (e.status === 'multiple') {
      body = `<b>${e.labels} labels on this sheet: several line states, none drawn as one place.</b> ${esc(e.why)}.${e.order_why ? `<br><b>Why the line states do not order them:</b> ${esc(e.order_why)}.` : ''}<br>${e.claims.map(id => claimLine(C[id]) + (C[id].line_state_basis ? ` <span class="mini">(${esc(C[id].line_state_basis)}${C[id].printed_clock_near_line ? `; printed beside the line: “${esc(C[id].printed_clock_near_line)}”` : ''})</span>` : '')).join('<br>')}`;
    } else if (e.status === 'formation') {
      body = `${esc(e.why)} (label${e.labels > 1 ? 's' : ''} of ${esc(e.owner)}).<br>${e.claims.map(id => `<code>${esc(id)}</code> “${esc(C[id].printed)}” ± ${Math.round(C[id].sigma_m)} m`).join('; ')}`;
    } else body = `${esc(e.why)}.<br>${e.claims.map(id => claimLine(C[id])).join('<br>')}`;
    rows.push(`<tr><th>${head}</th><td>${body}</td></tr>`);
  }
  if (!rows.length) return '';
  return `<h3>Troop-map positions <span class="mini">(Bachelder 1876; day level, line states read by eye)</span></h3><p class="mini">What the sheets print for this unit${u.drawn ? '' : ' (it is not drawn: no road of approach is printed for it or any unit above it)'}. A brigade’s position is laid out over its regiments (plausible-procedural slots); a division or corps label places nothing by itself. A label’s line state (the legend’s First Position, Intermediate, Evening or All Day style) gives its window in the day: ${esc(dp.evening_basis || '')}.</p><table class="table">${rows.join('')}</table>`;
}

// ---- cavalry (ws10): riders and horses as a range with its basis, horse casualties tied to the man casualties, and the printed dismounted fight with the horse-holders. Every number carries its tier.
export function horseSection(th, u) {
  if (u.arm !== 'cavalry') return '';
  const n = u.strength && u.strength.drawn || 0; if (!n) return `<h3>Riders and horses</h3><p class="mini">Not drawn (no road of approach or place in the ledgers, EG-CAV-07): no rider and no horse is shown.</p>`;
  const hr = horseRange(n), c = u.casualties, down = c && c.kind !== 'none' ? { min: c.fates.killed.min + c.fates.wounded.min, max: c.fates.killed.max + c.fates.wounded.max, point: c.fates.killed.point + c.fates.wounded.point } : null, hl = down ? horseLossRange(down) : null;
  const rec = dismountRecord(u.id), share = rec && dismountShare(rec), cnt = share ? dismountCounts(n, share) : null;
  return `<h3>Riders and horses <span class="mini">(range with its basis)</span></h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${pill(hr.tier)}<span class="pill">weak source</span></div>
    <dl><div class="row"><dt>Riders</dt><dd>${fmtN(n)} (one figure each)</dd></div>
    <div class="row"><dt>Horses</dt><dd>${fmtN(hr.horses.min)}-${fmtN(hr.horses.max)} (drawn: ${fmtN(hr.horses.point)}, one per rider)</dd></div>
    ${hl ? `<div class="row"><dt>Horses down</dt><dd>${fmtN(hl.min)}-${fmtN(hl.max)} (drawn: ${fmtN(hl.point)}, with the fallen rider)</dd></div>` : ''}</dl>
    <p class="mini">Basis: ${esc(hr.basis)} Gap ${esc(hr.gap)}.</p>${hl ? `<p class="mini">Horse losses: ${esc(hl.basis)}. Gap ${esc(hl.gap)}. Observation: ${esc(HORSE_LOSS.observation.cite)}.</p>` : ''}
    ${rec ? `<h3>Fought dismounted <span class="mini">(${esc(rec.tier)}; ${share ? esc(rec.share_tier) + ' share' : 'no share printed'})</span></h3><p class="mini">${esc(rec.cite)}. Claims ${rec.claims.map(x => `<code>${esc(x)}</code>`).join(', ')}.</p>
    ${cnt ? `<p class="mini">${fmtN(cnt.dismounted)} of ${fmtN(n)} afoot: ${fmtN(cnt.fighters)} fight, ${fmtN(cnt.holders)} hold the horses (${esc(HOLDER.basis)}); the led horses stand ${LED.back_m} m behind the line (${esc(LED.basis)}). Shown only inside the unit's engagement windows that lie in ${esc(rec.when_basis)}.</p>` : '<p class="mini">The report gives no fraction: the unit is drawn mounted (gap EG-CAV-04).</p>'}` : ''}`;
}
