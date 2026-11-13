// The checks of the realization harness: one function per assertion type of schema.mjs, run against the product (query.mjs). Deterministic: no clock, no random, no network; the answer of a check
// depends on the record, the timeline files and the files of the product only. Every whole minute of a span is evaluated (tolerances.json "sampling"); a span is never sampled sparsely, except where an
// assertion says otherwise in its evidence (the artillery lists are computed from the battery plan at every minute and cross-checked against one real draw list).
//
// An assertion returns { ok, code, detail, evidence }. `code` is the machine reason of a failure (grouped by the build list): unit_not_in_layer, unit_not_drawn, unit_not_on_field, unit_wrong_place,
// unit_not_moving, unit_wrong_activity, place_unknown, place_ambiguous, place_off_ground, structure_unknown, structure_not_drawn, structure_wrong_state, work_wrong_stage, weather_mismatch, sky_mismatch,
// casualty_none, adapter_missing, card_not_shown, ...  A record is realized only when it is statically valid, every binding holds, and every assertion is ok in every scenario it lists.
import { HARNESS, toMin, isoOf, round, hasQuote, fold, tokens } from './lib.mjs';
import { parseSpan, validateRecord, ASSERT, entityId, entityVia, assertionUnits } from './schema.mjs';
import { coversInterval } from './timeline.mjs';
import { measure, distM } from './gazetteer.mjs';

const MOVING = new Set(['march', 'double_quick', 'gallop']);
const minutesOf = span => { const a = Math.ceil(span.from - 1e-9), b = Math.floor(span.to + 1e-9); if (b < a) return [span.from]; const out = []; for (let t = a; t <= b; t++) out.push(t); return out; };
const ok = (evidence = {}) => ({ ok: true, code: null, detail: null, evidence });
const fail = (code, detail, evidence = {}) => ({ ok: false, code, detail, evidence });
const num = (x, d = 1) => (x == null ? 'null' : String(round(x, d)));
const uniq = a => [...new Set(a)];
const asRegex = s => { const m = /^\/(.*)\/([a-z]*)$/.exec(String(s)); return m ? new RegExp(m[1], m[2]) : null; };
const matchState = (want, got) => { const text = String(got ?? ''); return [].concat(want).some(w => { const re = asRegex(w); return re ? re.test(text) : fold(w) === fold(text); }); };

export class Runner {
  constructor(product, TL) { this.P = product; this.TL = TL; this.pl = product.places; this.tol = product.tolerances; }

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // a record -> result
  async runRecord(rec, { source = null } = {}) {
    const row = this.TL.byId.get(rec && rec.id), res = { id: rec && rec.id, kind: rec && rec.kind, source, realized: false, codes: [], problems: [], assertions: [], bindings: { units: [], places: [], structures: [], declared: 0 }, scenarios: [], why: null };
    const v = validateRecord(rec, { row, tolerances: this.tol, clock: this.TL.clock }); res.problems.push(...v.problems);
    if (!row || !v.span) { res.codes = uniq(res.problems.map(p => p.code)); res.why = res.problems.map(p => p.detail).slice(0, 3).join(' | '); return res; }
    res.window = { from: isoOf(v.span.from), to: isoOf(v.span.to) };
    try { await this._bindings(rec, row, res); } catch (e) { res.problems.push({ code: 'binding_error', detail: String(e && e.stack || e).slice(0, 300) }); }
    const scs = Array.isArray(rec.scenario) ? rec.scenario : [rec.scenario ?? 'default']; res.scenarios = scs.map(s => (typeof s === 'string' ? s : JSON.stringify(s)));
    const results = [];
    for (const [si, sc] of scs.entries()) {
      for (const [i, a] of (rec.checks || []).entries()) {
        if (!ASSERT[a && a.type]) continue;
        let r; try { r = await this._assert(a, { rec, row, span: v.span, scene: this.P.scene(sc), scenario: sc }); } catch (e) { r = fail('assert_error', `${a.type} threw: ${String(e && e.message || e).slice(0, 300)}`, { stack: String(e && e.stack || '').split('\n').slice(0, 3).join(' / ') }); }
        results.push({ i, scenario: scs.length > 1 ? res.scenarios[si] : undefined, type: a.type, ...r });
      }
    }
    res.assertions = results;
    const failed = results.filter(r => !r.ok);
    res.codes = uniq([...res.problems.map(p => p.code), ...failed.flatMap(r => r.all_codes || [r.code])]);
    if (rec.result && typeof rec.result.realized === 'boolean') res.stale_result_pending = rec.result.realized;
    if (rec.kind === 'not_realized') {
      // the probe must FAIL, with the reasons the record gives; if it passes the row is realized now and the record is stale
      const observed = new Set([...failed.flatMap(r => r.all_codes || [r.code]), ...res.problems.map(p => p.code)]), declared = (rec.missing || []).map(m => m.code);
      res.realized = false; res.missing = { declared, observed: [...observed], verified: !!failed.length && declared.every(c => observed.has(c)), unverified: declared.filter(c => !observed.has(c)), stale: !failed.length && !res.problems.length };
      res.why = res.missing.stale ? 'the probe now passes: the product shows this row; rewrite the record with its real kind' : `not realized: ${(rec.missing || []).map(m => m.detail).join('; ').slice(0, 280)}`;
      if (res.missing.unverified.length) res.why += ` [declared but not observed: ${res.missing.unverified.join(', ')}]`;
      return res;
    }
    res.realized = !res.problems.length && !failed.length && results.length > 0;
    if (res.stale_result_pending != null && res.stale_result_pending !== res.realized) res.stale_result = `the record says realized ${res.stale_result_pending}; the check now says ${res.realized}`;
    res.why = res.realized ? 'every check holds in the product' : [...res.problems.slice(0, 2).map(p => `${p.code}: ${p.detail}`), ...failed.slice(0, 2).map(r => `${r.type} ${r.code}: ${r.detail}`)].join(' | ').slice(0, 600);
    return res;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // the bindings of a record to its row: the units, places and structures it uses must be the ones the row's own words name (or be declared with a quote of the row)
  async _bindings(rec, row, res) {
    const E = rec.entities || {}, text = row.claim_text, P = this.P, B = res.bindings;
    for (const e of E.units || []) {
      const id = entityId(e), via = entityVia(e);
      if (!P.unit(id)) { res.problems.push({ code: 'unit_not_in_layer', detail: `unit ${id} is not in the history layer` }); continue; }
      const m = P.bindUnit(id, text);
      if (m.bound) B.units.push({ id, how: 'matched', by: m.unit, why: m.why });
      else if (via && hasQuote(text, via)) { B.units.push({ id, how: 'declared', via }); B.declared++; }
      else res.problems.push({ code: 'unit_not_bound', detail: `unit ${id} (${P.unit(id).name}) is not named in the row's text (units named there: ${P.unitsNamedIn(text).slice(0, 5).map(x => x.id).join(', ') || 'none'}); if the row names it in other words, give { "id": "${id}", "via": "<verbatim words of the row>" }` });
    }
    const found = new Map(this.pl.findIn(text).map(h => [h.place.id, h]));
    for (const e of E.places || []) {
      const name = entityId(e), via = entityVia(e), r = this.pl.resolve(name);
      if (r.status === 'unknown') { res.problems.push({ code: 'place_unknown', detail: `place "${name}" is not in the gazetteer (the repository's files carry no such name): unknown places are listed, never guessed` }); continue; }
      if (r.status === 'ambiguous') { res.problems.push({ code: 'place_ambiguous', detail: `place "${name}" names more than one entry (${r.candidates.join('; ')}); use the id of one` }); continue; }
      const pl = r.place;
      if (found.has(pl.id)) B.places.push({ name, id: pl.id, how: 'matched' });
      else if (via && hasQuote(text, via)) { B.places.push({ name, id: pl.id, how: 'declared', via }); B.declared++; }
      else res.problems.push({ code: 'place_not_in_row', detail: `place ${pl.id} "${pl.name}" is not named in the row's text (places named there: ${[...found.values()].map(h => h.place.id + ' ' + h.place.name).slice(0, 6).join('; ') || 'none'}); if the row names it in other words, give { "name": "${name}", "via": "<verbatim words of the row>" }` });
    }
    if ((E.structures || []).length || (E.works || []).length) {
      const S = await P.structures('default'), rtk = new Set(tokens(text));
      for (const e of [...(E.structures || []), ...(E.works || [])]) {
        const id = entityId(e), via = entityVia(e), objs = S.byState.get(id) || [], sched = (S.inputs.sched.rows || []).filter(r => r.object_ids.includes(id)), rec_ = S.inputs.structures.structures.find(s => s.id === id);
        if (!objs.length && !sched.length && !rec_) { res.problems.push({ code: 'structure_unknown', detail: `structure ${id} is in no structure file (structures.json, state_schedule.json, the drawn objects)` }); continue; }
        const names = [...objs.map(o => o.name), ...sched.map(r => r.object_printed), rec_ && rec_.name, rec_ && rec_.location, ...(S.inputs.hospitals.hospitals || []).filter(h => (h.structure_ids || []).includes(id)).map(h => h.hospital)].filter(Boolean).join(' ');
        const common = tokens(names).filter(w => rtk.has(w) && w.length >= 4);
        if (common.length) B.structures.push({ id, how: 'matched', by: common.slice(0, 4).join(',') });
        else if (via && hasQuote(text, via)) { B.structures.push({ id, how: 'declared', via }); B.declared++; }
        else res.problems.push({ code: 'structure_not_bound', detail: `structure ${id} (${names.slice(0, 120)}) shares no word of 4 letters or more with the row's text; if the row names it in other words, give { "id": "${id}", "via": "<verbatim words of the row>" }` });
      }
    }
  }

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  async _assert(a, ctx) {
    const span = a.t != null ? parseSpan(a.t) : { ...ctx.span, mode: undefined }, mode = (a.t && a.t.mode) || undefined;
    const c = { ...ctx, a, span, mode, mins: minutesOf(span) };
    switch (a.type) {
      case 'unit_in_layer': return this._unitInLayer(c);
      case 'unit_present': return this._units(c, (u, cc) => this._present(u, cc));
      case 'unit_absent': return this._units(c, (u, cc) => this._absent(u, cc));
      case 'unit_at': return this._units(c, (u, cc) => this._at(u, cc));
      case 'unit_moves': return this._units(c, (u, cc) => this._moves(u, cc));
      case 'unit_activity': { if (a.picture) { for (const id of assertionUnits(a).flatMap(x => this.P.leaves(entityId(x)))) { const i = c.scene.stage.index.get(id); if (i != null) await c.scene.pictureSegments(i); } } return this._units(c, (u, cc) => this._activity(u, cc)); }
      case 'unit_arrives': return this._units(c, (u, cc) => this._arrives(u, cc));
      case 'unit_formation': return this._units(c, (u, cc) => this._formation(u, cc));
      case 'unit_figures': return this._figures(c);
      case 'battery_guns': { await this._prepWs6(c.scene); return this._units(c, (u, cc) => this._guns(u, cc)); }
      case 'structure_exists': return this._structureExists(c);
      case 'structure_state': return this._structure(c);
      case 'work_stage': return this._work(c);
      case 'weather': return this._weather(c);
      case 'sky': return this._sky(c);
      case 'casualty': return this._casualty(c);
      case 'card_shown': return this._cards(c, 'event_cards');
      case 'epilogue_shown': return this._cards(c, 'epilogue');
      case 'place_known': return this._placeKnown(c);
      default: return fail('assert_type', `unknown assertion type ${a.type}`);
    }
  }
  // a unit the row names exists in the order of battle of the layer (a search by the row's own words; used by records that say a unit is missing)
  _unitInLayer(c) {
    const a = c.a; if (!hasQuote(c.row.claim_text, a.words)) return fail('quote_not_in_row', `"${String(a.words).slice(0, 80)}" is not in the row's text`);
    const named = this.P.unitsNamedIn(a.words).filter(n => (!a.arm || this.P.unit(n.id).arm === a.arm) && (!a.side || this.P.unit(n.id).side === a.side));
    return named.length ? ok({ units: named.slice(0, 6).map(n => `${n.id} (${n.why})`) }) : fail('unit_not_in_layer', `no unit of the order of battle in the layer is named by "${a.words}"`);
  }
  // ---- units: expand formations into their leaves on the field, run a per-unit check, combine by the quantifier
  async _units(c, per) {
    const a = c.a, P = this.P, ids = assertionUnits(a).map(entityId), leaves = [], bad = [];
    for (const id of ids) {
      const u = P.unit(id); if (!u) { bad.push({ unit: id, code: 'unit_not_in_layer', detail: `unit ${id} is not in the layer` }); continue; }
      const ls = P.leaves(id); if (!ls.length) { bad.push({ unit: id, code: 'no_leaf_units_on_field', detail: `${id} (${u.name}) has no leaf unit the layer lists on the field` }); continue; }
      for (const l of ls) leaves.push({ leaf: l, of: id });
    }
    if (bad.length && !leaves.length) return fail(bad[0].code, bad.map(b => b.detail).join('; '), { bad });
    const results = leaves.map(({ leaf, of }) => ({ leaf, of, ...per(leaf, c) }));
    const q = a.quantifier || 'all', good = results.filter(r => r.ok), no = results.filter(r => !r.ok);
    const byCode = {}; for (const r of no) byCode[r.code] = (byCode[r.code] || 0) + 1;
    const ev = { leaves: results.length, ok_leaves: good.length, by_code: byCode, failing: no.slice(0, 12).map(r => ({ unit: r.leaf, code: r.code, detail: r.detail })), sample_ok: good.slice(0, 3).map(r => ({ unit: r.leaf, ...r.evidence })) };
    if (bad.length) { for (const b of bad) byCode[b.code] = (byCode[b.code] || 0) + 1; ev.bad = bad; }
    const pass = q === 'any' ? good.length > 0 && !bad.length : no.length === 0 && !bad.length;
    if (pass) return ok(ev);
    const top = Object.entries(byCode).sort((x, y) => y[1] - x[1])[0][0];
    return { all_codes: Object.keys(byCode), ...fail(top, `${no.length + bad.length} of ${results.length + bad.length} unit(s) fail (${Object.entries(byCode).map(([k, n]) => `${k} x${n}`).join(', ')}); first: ${(no[0] || bad[0]).detail || (no[0] || bad[0]).code} [${(no[0] || {}).leaf || (bad[0] || {}).unit}]`, ev) };
  }
  _whyCode(s) { return s.why === 'before_arrival' || s.why === 'no_enter_event_yet' || s.why === 'after_leave' ? 'unit_not_on_field' : s.why === 'not_in_layer' ? 'unit_not_in_layer' : s.why === 'no_arrival_record' ? 'unit_no_arrival_record' : s.why === 'not_on_field' ? 'unit_not_on_field' : 'unit_not_drawn'; }
  _whyText(s, id) { return `${id} is not on the field at ${isoOf(s.t)}: ${s.why}${s.arrival ? ` (arrives ${s.arrival})` : ''}${s.reason ? ` (${String(s.reason).slice(0, 100)})` : ''}`; }
  _present(id, c) {
    const mode = c.mode || 'any', S = c.scene; let n = 0, first = null, lastWhy = null;
    for (const t of c.mins) { const s = S.unitAt(id, t); if (s.present) { n++; if (!first) first = s; if (mode === 'any') return ok({ first_minute: isoOf(t), arrival: s.arrival }); } else { lastWhy = s; if (mode === 'all') return fail(this._whyCode(s), this._whyText(s, id)); } }
    return mode === 'all' && n === c.mins.length ? ok({ minutes: n }) : fail(this._whyCode(lastWhy), this._whyText(lastWhy, id));
  }
  _absent(id, c) {
    const want = [].concat(c.a.why_in || ['before_arrival']), S = c.scene; let n = 0;
    for (const t of c.mins) { const s = S.unitAt(id, t); if (s.present) return fail('unit_on_field', `${id} IS on the field at ${isoOf(t)} (it should not be yet)`, { at: isoOf(t) }); if (s.why === 'not_in_layer') return fail('unit_not_in_layer', `${id} is not in the layer`); if (!want.includes(s.why)) return fail('unit_absent_for_the_wrong_reason', `${id} is absent at ${isoOf(t)} because ${s.why}, not ${want.join(' or ')}`, { why: s.why }); n++; }
    return ok({ minutes: n, because: want });
  }
  _place(name, c) {
    const r = this.pl.resolve(name); if (r.status === 'unknown') return { err: fail('place_unknown', `place "${name}" is not in the gazetteer`) }; if (r.status === 'ambiguous') return { err: fail('place_ambiguous', `place "${name}" is ambiguous (${r.candidates.join('; ')})`) };
    const p = r.place; if (!p.on_ground) return { err: fail('place_off_ground', `place ${p.id} "${p.name}" is outside the loaded ground: no unit can be drawn there`) };
    let tol = p.tolerance_m; if (c.a.within_m != null) { if (c.a.within_m > p.tolerance_m) return { err: fail('tolerance_wider_than_stated', `within_m ${c.a.within_m} is wider than the stated tolerance of ${p.id} (${p.kind}: ${p.tolerance_m} m)`) }; tol = c.a.within_m; }
    return { p, tol };
  }
  _at(id, c) {
    const pl = this._place(c.a.place, c); if (pl.err) return pl.err; const mode = c.mode || 'any', S = c.scene; let n = 0, dmin = Infinity, dmax = 0, firstOk = null, lastFail = null;
    for (const t of c.mins) {
      const s = S.unitAt(id, t); if (!s.present) { if (mode === 'all') return fail(this._whyCode(s), this._whyText(s, id)); lastFail = fail(this._whyCode(s), this._whyText(s, id)); continue; }
      const d = measure(pl.p, s); dmin = Math.min(dmin, d); dmax = Math.max(dmax, d);
      if (d <= pl.tol) { n++; if (!firstOk) firstOk = isoOf(t); if (mode === 'any') return ok({ at: firstOk, d_m: round(d, 0), tol_m: pl.tol, place: pl.p.id }); }
      else if (mode === 'all') return fail('unit_wrong_place', `${id} is ${round(d, 0)} m from ${pl.p.name} (${pl.p.kind}, tolerance ${pl.tol} m) at ${isoOf(t)}`, { d_m: round(d, 0), tol_m: pl.tol });
    }
    if (mode === 'all' && n === c.mins.length) return ok({ minutes: n, d_min_m: round(dmin, 0), d_max_m: round(dmax, 0), tol_m: pl.tol, place: pl.p.id });
    if (!Number.isFinite(dmin)) return lastFail || fail('unit_not_on_field', `${id} is not on the field in the window`);
    return fail('unit_wrong_place', `${id} comes no nearer than ${round(dmin, 0)} m to ${pl.p.name} (${pl.p.kind}, tolerance ${pl.tol} m) in the window`, { d_min_m: round(dmin, 0), tol_m: pl.tol });
  }
  _moves(id, c) {
    const a = c.a, S = c.scene, first = { t: null, s: null }, last = { t: null, s: null }; let nPresent = 0, nMoving = 0, lastWhy = null, onRoadFail = null;
    const rels = {}; for (const k of ['from', 'to', 'toward', 'away_from', 'along']) if (a[k] != null) { const pl = this._place(a[k], c); if (pl.err) return pl.err; rels[k] = pl; }
    if (rels.along && rels.along.p.shape !== 'line') return fail('place_not_a_line', `"along" needs a road, lane, stream or railway; ${rels.along.p.id} "${rels.along.p.name}" is a ${rels.along.p.kind} (${rels.along.p.shape})`);
    for (const t of c.mins) {
      const s = S.unitAt(id, t); if (!s.present) { lastWhy = s; if (c.mode === 'all') return fail(this._whyCode(s), this._whyText(s, id)); continue; }
      nPresent++; if (!first.s) { first.t = t; first.s = s; } last.t = t; last.s = s;
      if (MOVING.has(s.activity)) { nMoving++; if (rels.along && !onRoadFail) { const d = measure(rels.along.p, s); if (d > rels.along.tol) onRoadFail = { t, d }; } }
    }
    if (!nPresent) return fail(this._whyCode(lastWhy), this._whyText(lastWhy, id));
    const minMoving = a.min_minutes ?? 1; if (nMoving < minMoving) return fail('unit_not_moving', `${id} is marching in ${nMoving} minute(s) of the window (${nPresent} on the field), the check needs ${minMoving}`, { moving_minutes: nMoving, present_minutes: nPresent });
    const disp = distM(first.s, last.s), minDisp = a.min_displacement_m ?? 10; if (disp < minDisp) return fail('unit_not_moving', `${id} is ${round(disp, 0)} m from where it started at the end of the window (needs ${minDisp} m)`, { displacement_m: round(disp, 1) });
    const ev = { moving_minutes: nMoving, present_minutes: nPresent, displacement_m: round(disp, 0), from_t: isoOf(first.t), to_t: isoOf(last.t) };
    if (rels.from) { const d = measure(rels.from.p, first.s); ev.from_d_m = round(d, 0); if (d > rels.from.tol) return fail('unit_wrong_place', `${id} starts ${round(d, 0)} m from ${rels.from.p.name} (tolerance ${rels.from.tol} m) at ${isoOf(first.t)}`, ev); }
    if (rels.to) { const d = measure(rels.to.p, last.s); ev.to_d_m = round(d, 0); if (d > rels.to.tol) return fail('unit_wrong_place', `${id} ends ${round(d, 0)} m from ${rels.to.p.name} (tolerance ${rels.to.tol} m) at ${isoOf(last.t)}`, ev); }
    if (rels.toward) { const d0 = measure(rels.toward.p, first.s), d1 = measure(rels.toward.p, last.s), need = a.min_closing_m ?? 50; ev.toward_d0_m = round(d0, 0); ev.toward_d1_m = round(d1, 0); if (d0 - d1 < need) return fail('unit_wrong_direction', `${id} moves from ${round(d0, 0)} m to ${round(d1, 0)} m from ${rels.toward.p.name}: it does not close by ${need} m`, ev); }
    if (rels.away_from) { const d0 = measure(rels.away_from.p, first.s), d1 = measure(rels.away_from.p, last.s), need = a.min_closing_m ?? 50; ev.away_d0_m = round(d0, 0); ev.away_d1_m = round(d1, 0); if (d1 - d0 < need) return fail('unit_wrong_direction', `${id} moves from ${round(d0, 0)} m to ${round(d1, 0)} m from ${rels.away_from.p.name}: it does not draw away by ${need} m`, ev); }
    if (rels.along) { if (onRoadFail) return fail('unit_off_road', `${id} is ${round(onRoadFail.d, 0)} m from ${rels.along.p.name} (tolerance ${rels.along.tol} m) while marching at ${isoOf(onRoadFail.t)}`, ev); ev.along = rels.along.p.id; }
    return ok(ev);
  }
  _activity(id, c) {
    const want = new Set([].concat(c.a.activities)), mode = c.mode || 'any', need = c.a.min_minutes ?? 1, S = c.scene; let n = 0, lastWhy = null, other = null;
    const pic = !!c.a.picture, ii = S.stage.index.get(id);
    for (const t of c.mins) { const s0 = S.unitAt(id, t); if (!s0.present) { lastWhy = s0; if (mode === 'all') return fail(this._whyCode(s0), this._whyText(s0, id)); continue; } const s = pic ? { ...s0, activity: S.pictureActivityAt(ii, t * 60).activity } : s0; if (want.has(s.activity)) n++; else { other = s; if (mode === 'all') return fail('unit_wrong_activity', `${id} is "${s.activity}" at ${isoOf(t)}, the check needs ${[...want].join(' or ')}`); } }
    if (n >= (mode === 'all' ? c.mins.length : need)) return ok({ minutes: n, activities: [...want] });
    if (!n && lastWhy && !other) return fail(this._whyCode(lastWhy), this._whyText(lastWhy, id));
    return fail('unit_wrong_activity', `${id} shows ${[...want].join(' or ')} in ${n} minute(s) of the window (needs ${need})${other ? `; it is "${other.activity}" at ${isoOf(other.t)}` : ''}`, { minutes: n });
  }
  _arrives(id, c) {
    const S = c.scene, st = S.stage, p = st.presence[id], u = this.P.unit(id);
    if (!u.drawn) return fail('unit_not_drawn', `${id} is not drawn (${u.render && u.render.status}): ${String(u.render && u.render.reason || '').slice(0, 140)}`);
    if (!p || !Number.isFinite(p.from)) return fail('unit_no_arrival_record', `${id} has no arrival record`);
    const arr = p.from / 60; if (arr < c.span.from - 1e-6 || arr > c.span.to + 1e-6) return fail('unit_arrival_outside_window', `${id} arrives at ${isoOf(arr)}, outside ${isoOf(c.span.from)}..${isoOf(c.span.to)}`, { arrival: isoOf(arr) });
    const before = S.unitAt(id, arr - 1 / 60), at = S.unitAt(id, arr + 1e-6); if (before.present) return fail('unit_on_field', `${id} is on the field before its arrival`); if (!at.present) return fail(this._whyCode(at), this._whyText(at, id));
    const ev = { arrival: isoOf(arr) };
    if (c.a.at_place != null) { const pl = this._place(c.a.at_place, c); if (pl.err) return pl.err; const d = measure(pl.p, at); ev.d_m = round(d, 0); if (d > pl.tol) return fail('unit_wrong_place', `${id} enters ${round(d, 0)} m from ${pl.p.name} (tolerance ${pl.tol} m)`, ev); }
    return ok(ev);
  }
  _formation(id, c) {
    const S = c.scene, i = S.stage.index.get(id), w = this.P.world.units[i], want = c.a.formation; let any = false;
    for (const t of c.mins) {
      const s = S.unitAt(id, t); if (!s.present) { if ((c.mode || 'any') === 'all') return fail(this._whyCode(s), this._whyText(s, id)); continue; }
      const evs = S.both.events.filter(e => e.unit === id && e.type === 'formation' && e.t <= t), cur = evs.length ? evs[evs.length - 1].formation : (this.P.unit(id).formation && this.P.unit(id).formation.kind) || (w && w.baseFormation) || null;
      if (cur === want) { any = true; if ((c.mode || 'any') === 'any') return ok({ formation: cur, at: isoOf(t) }); } else if ((c.mode || 'any') === 'all') return fail('unit_wrong_formation', `${id} is in ${cur} at ${isoOf(t)}, the check needs ${want}`);
    }
    return any ? ok({}) : fail('unit_wrong_formation', `${id} is never shown in ${want} in the window`);
  }
  _figures(c) {
    const a = c.a, ids = assertionUnits(a).map(entityId); let n = 0, bad = [];
    for (const id of ids) { const u = this.P.unit(id); if (!u) { bad.push(id); continue; } for (const l of this.P.leaves(id)) n += this.P.unit(l).drawn ? this.P.unit(l).strength.drawn : 0; }
    if (bad.length) return fail('unit_not_in_layer', `unknown unit(s) ${bad.join(', ')}`);
    const tol = (a.tol_pct ?? 10) / 100; let lo = a.min ?? -Infinity, hi = a.max ?? Infinity; if (a.approx != null) { lo = Math.max(lo, a.approx * (1 - tol)); hi = Math.min(hi, a.approx * (1 + tol)); }
    return n >= lo && n <= hi ? ok({ figures: n, lo, hi }) : fail('figures_mismatch', `the picture draws ${n} figures for ${ids.join(', ')}; the row needs ${num(lo, 0)}..${num(hi, 0)}`, { figures: n });
  }
  _guns(id, c) {
    const S = c.scene, a = c.a, i = S.stage.index.get(id), u = this.P.unit(id), w = this.P.world.units[i], stated = w && w.guns ? w.guns : 0, mode = c.mode || 'any';
    if (u.arm !== 'artillery') return fail('not_a_battery', `${id} is not an artillery unit`);
    let best = null;
    for (const t of c.mins) {
      const s = S.unitAt(id, t); if (!s.present) { if (mode === 'all') return fail(this._whyCode(s), this._whyText(s, id)); continue; }
      const sg = this._trainOf(S, id), g = sg ? sg.guns : stated, lim = sg ? sg.limbers : 0, cai = sg ? sg.caissons : 0, hor = sg ? sg.horses : 0;
      const pass = (a.guns_min == null || g >= a.guns_min) && (a.limbers_min == null || lim >= a.limbers_min) && (a.caissons_min == null || cai >= a.caissons_min) && (a.horses_min == null || hor >= a.horses_min);
      best = { guns: g, limbers: lim, caissons: cai, horses: hor, stated_drawn: stated, at: isoOf(t) };
      if (pass) { if (mode === 'any') return ok(best); } else if (mode === 'all') return fail('battery_shortfall', `${id} shows ${g} gun(s), ${lim} limber(s), ${cai} caisson(s), ${hor} horse(s) at ${isoOf(t)}`, best);
    }
    if (!best) return fail('unit_not_on_field', `${id} is not on the field in the window`);
    return mode === 'all' ? ok(best) : fail('battery_shortfall', `${id} shows at most ${best.guns} gun(s), ${best.limbers} limber(s), ${best.caissons} caisson(s) (needs ${JSON.stringify({ guns_min: a.guns_min, limbers_min: a.limbers_min, caissons_min: a.caissons_min })})`, best);
  }
  // the guns of a battery as the shell draws them: the stated guns are the stage's own gun table (world.units[i].guns); the train adds the extras, limbers, caissons and teams (artillery.mjs compose)
  _trainOf(scene, id) {
    const S = scene._ws6; if (!S || S.error) return null; const b = S.plan.batteries.find(x => this.P.index.get(id) === x.unit); if (!b) return null;
    const comp = S.train.compose(b, null), w = this.P.world.units[this.P.index.get(id)];
    return { guns: Math.max(comp.guns, w && w.guns || 0), limbers: comp.limbers, caissons: comp.caissons, horses: comp.horses };
  }
  async _prepWs6(scene) { if (scene._ws6 === undefined) { const S = await this.P.structures(scene.spec); scene._ws6 = S.S.ws6(); } return scene._ws6; }

  // ---- structures
  // a structure the row names exists in the product (a search by the row's words over the drawn objects, the structure records and the schedule rows; used by records that say a structure is missing)
  async _structureExists(c) {
    const a = c.a; if (!hasQuote(c.row.claim_text, a.words)) return fail('quote_not_in_row', `"${String(a.words).slice(0, 80)}" is not in the row's text`);
    const S = await this.P.structures('default'), want = tokens(a.words).filter(w => w.length >= 4); if (!want.length) return fail('assert_field', 'words needs at least one word of 4 letters');
    const hay = [...S.model.objects.map(o => [o.id, `${o.id} ${o.name || ''} ${o.state_id || ''}`]), ...S.inputs.structures.structures.map(s => [s.id, `${s.id} ${s.name || ''} ${s.location || ''}`]), ...S.inputs.sched.rows.map(r => [r.id, `${r.id} ${r.object_printed || ''}`])];
    const hit = hay.filter(([, h]) => { const t = new Set(tokens(h)); return want.every(w => t.has(w)); }).map(([id]) => id);
    return hit.length ? ok({ ids: [...new Set(hit)].slice(0, 8) }) : fail('structure_unknown', `no structure record, schedule row or drawn object of the product names "${a.words}"`);
  }
  async _structure(c) {
    const a = c.a, S = await this.P.structures('default'), id = a.structure, objs = S.byState.get(id) || [], eng = S.engine;
    if (!objs.length) { const nd = (S.inputs.data.notDrawn || []).find(x => x.id === id); if (eng.knows(id)) return fail('structure_not_drawn', `${id} has a state in the schedule but nothing is drawn for it${nd ? ': ' + nd.reason : ''}`, { schedule_only: true }); return fail('structure_unknown', `${id} is in no structure file`); }
    const choice = a.structure_scenario ? { [id]: a.structure_scenario } : {}, mode = c.mode || 'any'; let last = null, okAt = null, n = 0;
    for (const t of c.mins) {
      const per = objs.map(o => S.model.describe(o.oid, t, choice)), bad = per.map(d => this._structureProblem(d, a)).find(Boolean);
      last = { t, per }; if (!bad) { n++; if (!okAt) okAt = t; if (mode === 'any') return ok({ at: isoOf(t), state: per[0].state && per[0].state.state, visual: per[0].visual && { A: per[0].visual.A, B: per[0].visual.B, mix: per[0].visual.mix }, objects: objs.map(o => o.id) }); }
      else if (mode === 'all') return fail(bad.code, `${id} at ${isoOf(t)}: ${bad.detail}`, { state: per[0].state && per[0].state.state });
    }
    if (mode === 'all' && n === c.mins.length) return ok({ minutes: n });
    const bad = last.per.map(d => this._structureProblem(d, a)).find(Boolean);
    return fail(bad.code, `${id} at ${isoOf(last.t)}: ${bad.detail} (no minute of the window matches)`, { state: last.per[0].state && last.per[0].state.state });
  }
  _structureProblem(d, a) {
    const st = d.state; if (!st) return { code: 'structure_no_state', detail: 'the object has no state engine record (nothing changes in the picture)' };
    if (a.state != null && !matchState(a.state, st.state)) return { code: 'structure_wrong_state', detail: `its state is "${st.state}", the check needs ${JSON.stringify(a.state)}` };
    if (a.present != null && st.present !== a.present) return { code: 'structure_wrong_state', detail: `present is ${st.present} (status ${st.status}), the check needs ${a.present}` };
    if (a.schedule_row != null && !(st.rows || []).includes(a.schedule_row)) return { code: 'structure_wrong_state', detail: `the schedule row ${a.schedule_row} is not in force (rows in force: ${(st.rows || []).join(', ') || 'none'})` };
    if (a.visual) {
      const v = d.visual; if (!v) return { code: 'structure_wrong_state', detail: 'no visual state' }; const eff = i => v.A[i] + (v.B[i] - v.A[i]) * v.mix, vals = { burn: eff(0), dmg: eff(1), down: eff(0), gone: eff(1) };
      for (const [k, x] of Object.entries(a.visual)) { const [, name, kind] = /^(burn|dmg|down|gone|mix|vis)_(min|max)$/.exec(k) || []; if (!name) return { code: 'assert_field', detail: `unknown visual key ${k}` }; const val = name === 'mix' ? v.mix : name === 'vis' ? v.vis : vals[name]; if (kind === 'min' ? val < x - 1e-9 : val > x + 1e-9) return { code: 'structure_wrong_state', detail: `drawn ${name} is ${num(val, 2)}, the check needs ${kind === 'min' ? '>=' : '<='} ${x}` }; }
    }
    if (a.hospital) { const h = (d.hospitals || []).find(x => x.id === a.hospital.id); if (!h) return { code: 'structure_wrong_state', detail: `hospital ${a.hospital.id} is not on this building` }; if (a.hospital.phase_in && !a.hospital.phase_in.includes(h.phase)) return { code: 'structure_wrong_state', detail: `hospital ${a.hospital.id} phase is ${h.phase}, the check needs ${a.hospital.phase_in.join(' or ')}` }; }
    return null;
  }
  async _work(c) {
    const a = c.a, S = await this.P.structures('default'), eng = S.engine, id = a.work, mode = c.mode || 'any';
    const ws6 = await this._prepWs6(c.scene); if (!ws6 || ws6.error) return fail('adapter_missing', `the works lists are not built: ${ws6 && ws6.error}`);
    const cov = ws6.works.coverage.find(x => x.id === id); if (!cov) return fail('structure_unknown', `${id} is not a work of the works lists`);
    if (cov.decision !== 'drawn') return fail('structure_not_drawn', `${id} is ${cov.decision}: ${cov.reason}`);
    let okAt = null, last = null;
    for (const t of c.mins) {
      const ms = Date.UTC(1863, 5, 1) + Math.round(t * 60000), res = eng.stateAt(id, ms, a.structure_scenario || 'default', 0); last = { t, res };
      let bad = null; if (a.present != null && res.present !== a.present) bad = `present is ${res.present} (${res.state})`; else if (a.stage_min != null && !(res.stage != null && res.stage >= a.stage_min)) bad = `stage is ${res.stage} (${res.state}), needs >= ${a.stage_min}`; else if (a.stage_max != null && !(res.stage != null && res.stage <= a.stage_max)) bad = `stage is ${res.stage} (${res.state}), needs <= ${a.stage_max}`;
      if (!bad) { if (!okAt) okAt = t; if (mode === 'any') break; } else if (mode === 'all') return fail('work_wrong_stage', `${id} at ${isoOf(t)}: ${bad}`);
    }
    if (okAt == null) return fail('work_wrong_stage', `${id} is never in the stage the check needs in the window (last: ${last.res.state})`, { state: last.res.state });
    const ev = { at: isoOf(okAt), state: eng.stateAt(id, Date.UTC(1863, 5, 1) + Math.round(okAt * 60000), a.structure_scenario || 'default', 0).state };
    if (a.crew) {
      const place = (ws6.works.byId.get(id) || {}).place; const crewAssert = { type: 'unit_activity', units: a.crew.units, activities: ['build_works'], quantifier: a.crew.quantifier || 'any' };
      const cr = await this._units({ ...c, a: crewAssert }, (u, cc) => this._activity(u, { ...cc, a: crewAssert, mode: 'any' })); if (!cr.ok) return fail('work_no_crew', `no crew shows build_works in the window: ${cr.detail}`, { crew: cr.evidence });
      if (place) { const near = await this._units({ ...c, a: { type: 'unit_at', units: a.crew.units, place, within_m: a.crew.within_m, quantifier: 'any' } }, (u, cc) => this._at(u, { ...cc, a: { type: 'unit_at', place, within_m: a.crew.within_m }, mode: 'any' })); if (!near.ok) return fail('work_crew_elsewhere', `the crew is not at ${place}: ${near.detail}`, { crew: near.evidence }); ev.crew_at = place; }
      ev.crew = cr.evidence.sample_ok;
    }
    return ok(ev);
  }

  // ---- weather and sky
  async _weather(c) {
    const a = c.a, mode = c.mode || 'any', sc = c.scenario; let n = 0, lastBad = null, firstOk = null;
    const num_ = (x, label) => { const q = a.value_quote || a.quote; return { x, label, q }; };
    for (const t of c.mins) {
      const W = await this.P.weatherAt(t, sc), d = W.drawn, r = W.record, bad = this._weatherProblem(a, d, r);
      if (!bad) { n++; if (!firstOk) firstOk = { at: isoOf(t), precip: d.precip.kind, cloud: round(d.cloud.cover, 2), temp_f: round(d.temp.tempF, 1), wetness: round(d.wetness.v, 2) }; if (mode === 'any') return ok(firstOk); } else { lastBad = { t, bad }; if (mode === 'all') return fail('weather_mismatch', `at ${isoOf(t)}: ${bad}`); }
    }
    return mode === 'all' && n === c.mins.length ? ok(firstOk) : fail('weather_mismatch', `no minute of the window matches (last: ${lastBad && isoOf(lastBad.t)}: ${lastBad && lastBad.bad})`);
  }
  _weatherProblem(a, d, r) {
    if (a.record != null && !!d.record !== a.record) return `a weather record ${d.record ? 'exists' : 'does not exist'} for this minute`;
    if (a.precip_kind_in && !a.precip_kind_in.includes(d.precip.kind)) return `the drawn precipitation is "${d.precip.kind}", the check needs ${a.precip_kind_in.join(' or ')}`;
    if (a.precip_intensity_min != null && d.precip.intensity < a.precip_intensity_min) return `precipitation intensity ${num(d.precip.intensity, 2)} < ${a.precip_intensity_min}`;
    if (a.precip_intensity_max != null && d.precip.intensity > a.precip_intensity_max) return `precipitation intensity ${num(d.precip.intensity, 2)} > ${a.precip_intensity_max}`;
    if (a.cloud_min != null && d.cloud.cover < a.cloud_min) return `cloud cover ${num(d.cloud.cover, 2)} < ${a.cloud_min}`;
    if (a.cloud_max != null && d.cloud.cover > a.cloud_max) return `cloud cover ${num(d.cloud.cover, 2)} > ${a.cloud_max}`;
    if (a.temp_f != null) { const tol = a.tol_f ?? this.tol.weather.temp_f_tolerance; const t = d.temp.tempF; if (t == null) return 'no temperature at this minute'; if (Math.abs(t - a.temp_f) > tol) return `temperature ${num(t, 1)} F, the row says ${a.temp_f} F (tolerance ${tol})`; }
    if (a.wetness_min != null && !(d.wetness.v != null && d.wetness.v >= a.wetness_min)) return `ground wetness ${num(d.wetness.v, 2)} < ${a.wetness_min}`;
    if (a.wetness_max != null && !(d.wetness.v != null && d.wetness.v <= a.wetness_max)) return `ground wetness ${num(d.wetness.v, 2)} > ${a.wetness_max}`;
    if (a.wind_mph_min != null && !(d.wind.mph && d.wind.mph[1] >= a.wind_mph_min)) return `wind ${JSON.stringify(d.wind.mph)} mph < ${a.wind_mph_min}`;
    if (a.wind_mph_max != null && !(d.wind.mph && d.wind.mph[0] <= a.wind_mph_max)) return `wind ${JSON.stringify(d.wind.mph)} mph > ${a.wind_mph_max}`;
    if (a.visibility_m_max != null && d.fog.visibilityM > a.visibility_m_max) return `visibility ${num(d.fog.visibilityM, 0)} m > ${a.visibility_m_max}`;
    return null;
  }
  async _sky(c) {
    const a = c.a, mode = c.mode || 'any', sc = c.scenario; let n = 0, lastBad = null, firstOk = null;
    for (const t of c.mins) {
      const W = await this.P.weatherAt(t, sc), s = W.drawn.sky, bad = this._skyProblem(a, s);
      if (!bad) { n++; if (!firstOk) firstOk = { at: isoOf(t), sun_alt: round(s.sunAlt, 1), moon_alt: round(s.moonAlt, 1), moon_illum: round(s.moonIllum, 0), band: s.band, exposure: round(s.exposure, 3) }; if (mode === 'any') return ok(firstOk); } else { lastBad = { t, bad }; if (mode === 'all') return fail('sky_mismatch', `at ${isoOf(t)}: ${bad}`); }
    }
    return mode === 'all' && n === c.mins.length ? ok(firstOk) : fail('sky_mismatch', `no minute of the window matches (last: ${lastBad && isoOf(lastBad.t)}: ${lastBad && lastBad.bad})`);
  }
  _skyProblem(a, s) {
    if (a.sun_alt_min != null && s.sunAlt < a.sun_alt_min) return `sun altitude ${num(s.sunAlt, 1)} < ${a.sun_alt_min}`;
    if (a.sun_alt_max != null && s.sunAlt > a.sun_alt_max) return `sun altitude ${num(s.sunAlt, 1)} > ${a.sun_alt_max}`;
    if (a.moon_up != null && !!s.moonUp !== a.moon_up) return `the moon is ${s.moonUp ? 'up' : 'down'} (altitude ${num(s.moonAlt, 1)})`;
    if (a.moon_illum_min != null && s.moonIllum < a.moon_illum_min) return `moon illumination ${num(s.moonIllum, 0)}% < ${a.moon_illum_min}`;
    if (a.moon_illum_max != null && s.moonIllum > a.moon_illum_max) return `moon illumination ${num(s.moonIllum, 0)}% > ${a.moon_illum_max}`;
    if (a.band_in) { const names = ['Day', 'Civil twilight', 'Nautical twilight', 'Astronomical twilight', 'Night']; const ok_ = a.band_in.some(b => (typeof b === 'number' ? b : names.indexOf(b)) === s.band); if (!ok_) return `the sky band is ${names[s.band]} (${s.band}), the check needs ${a.band_in.join(' or ')}`; }
    if (a.exposure_min != null && s.exposure < a.exposure_min) return `exposure ${num(s.exposure, 3)} < ${a.exposure_min}`;
    return null;
  }
  // ---- casualties
  _casualty(c) {
    const a = c.a, S = c.scene, ids = (a.units || []).map(entityId); let k = 0, w = 0, m = 0, ev = 0; const units = new Set();
    const list = ids.length ? ids.flatMap(id => this.P.leaves(id)) : [null];
    for (const l of list) { const r = S.casualties(c.span.from, c.span.to, l); k += r.killed; w += r.wounded; m += r.missing; ev += r.events; for (const u of r.units) units.add(u); }
    const tot = { killed: k, wounded: w, missing: m, events: ev, units: units.size };
    for (const [key, val] of [['killed_min', k], ['wounded_min', w], ['missing_min', m], ['events_min', ev]]) if (a[key] != null && val < a[key]) return fail('casualty_none', `the picture shows ${val} ${key.replace('_min', '')} (events) in ${isoOf(c.span.from)}..${isoOf(c.span.to)}, the check needs ${a[key]}`, tot);
    return ok(tot);
  }
  // ---- cards and the epilogue chapter (adapters: modules the owning workstream adds)
  async _cards(c, name) {
    const a = c.a, want = new Set(a.rows), mode = c.mode || 'any'; let seen = new Set(), firstOk = null, n = 0, last = null;
    for (const t of c.mins) {
      const r = name === 'epilogue' ? await this.P.epilogueAt(t) : await this.P.cardsAt(t); if (!r.available) return fail('adapter_missing', r.reason);
      const hit = r.items.filter(x => (x.rows || []).some(id => want.has(id))), have = new Set(hit.flatMap(x => x.rows || []));
      last = { t, n: r.items.length };
      const all = [...want].every(id => have.has(id)), tierBad = a.tier && hit.some(x => x.tier !== a.tier);
      if (all && !tierBad) { n++; if (!firstOk) firstOk = { at: isoOf(t), cards: hit.map(x => x.id) }; if (mode === 'any') return ok(firstOk); } else if (mode === 'all') return fail('card_not_shown', `at ${isoOf(t)} the cards shown (${r.items.length}) do not include every row ${[...want].join(', ')}${tierBad ? ' with tier ' + a.tier : ''}`);
      for (const id of have) seen.add(id);
    }
    return mode === 'all' && n === c.mins.length ? ok(firstOk) : fail('card_not_shown', `no card shows ${[...want].join(', ')} in the window (cards seen for: ${[...seen].join(', ') || 'none'}; ${last ? last.n + ' cards at the last minute' : ''})`);
  }
  _placeKnown(c) {
    const r = this.pl.resolve(c.a.place); if (r.status === 'unknown') return fail('place_unknown', `place "${c.a.place}" is not in the gazetteer`); if (r.status === 'ambiguous') return fail('place_ambiguous', `place "${c.a.place}" is ambiguous (${r.candidates.join('; ')})`);
    if ((c.a.on_ground ?? true) && !r.place.on_ground) return fail('place_off_ground', `place ${r.place.id} "${r.place.name}" is outside the loaded ground`);
    return ok({ place: r.place.id, kind: r.place.kind, tolerance_m: r.place.tolerance_m, center: r.place.center });
  }
}
export { HARNESS };
