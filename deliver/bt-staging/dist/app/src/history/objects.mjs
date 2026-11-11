// Structures and works as layer objects. Source: structures/structures.json (P-01..P-14 pre-existing walls and fences) and structures/works_stages.json (E-01..E-18 works).
// The timing rule mirrors tools/bt/check_structures.py `state_at` (default scenario), tested against it in tests/history.test.mjs:
//  * a pre-existing feature is never given a construction animation (PDF B.7.3): it is present from frame one;
//  * a work is absent until its start and complete at its finish. Full clock mode (a printed start clock and a finish clock): drawn growing from the start to the finish. Partial mode
//    (only a bound on the start): it is absent until the latest bound of its start, then drawn as under construction up to its finish, never earlier;
//  * a work with no finish time in the record is NOT drawn (the state_at rule would show it under construction for ever; the layer lists it as an open gap instead).
// Not applied: the per-work scenario windows (`scenarios` in works_stages.json) and the damage stage of E-05 and E-11. No work or wall has a mapped line in the repository: `at` is the
// gazetteer place named in its location text, with that place's sigma; `line` stays null.
import { norm } from './gazetteer.mjs';
import { isoToMin } from '../clock.mjs';
const endOf = iso => { const m = isoToMin(iso); return m == null ? null : (String(iso).endsWith('T23:59') ? m + 1 : m); };      // a bound printed 23:59 is the end of that day
export function buildObjects({ raw, gaz }) {
  const S = raw.structures ? raw.structures.structures : [], W = raw.works ? raw.works.works : {}, by = new Map(S.map(s => [s.id, s]));
  const names = gaz.places.flatMap(p => [p.name, ...(p.aliases || [])].map(n => [norm(n), p])).filter(([k]) => k.length > 3).sort((a, b) => b[0].length - a[0].length);
  const placeIn = text => { const t = ' ' + norm(text) + ' '; for (const [k, p] of names) if (t.includes(' ' + k + ' ')) return { place: p.name, lng: p.center.lng, lat: p.center.lat, sigma_m: p.sigma_m }; return null; };
  const tier = s => (['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(s.tier) ? s.tier : 'inferred');
  const list = [], skipped = [];
  for (const s of S) if (s.kind === 'preexisting_wall_or_fence') {
    list.push({ id: 'OBJ-' + s.id, ref: s.id, name: s.name, kind: 'fence', pre_existing: true, built: null, tier: tier(s), sources: s.source_keys || [], line: null, at: placeIn(s.location || ''), location_printed: s.location,
      state_rows: !!(s.state_changes && s.state_changes.length), note: s.engine_note || '' });
  }
  for (const w of Object.values(W)) {
    if (!w.construction_applies) continue;
    const s = by.get(w.id) || {}, b = w.begin || {}, f = w.finish || {};
    const fl = f.latest ? endOf(f.latest) : null, bd = isoToMin(b.default ?? null), be = isoToMin(b.earliest ?? null), blRaw = b.latest ?? null;
    const bl = blRaw ? (b.gran === 'date' ? endOf(blRaw) : isoToMin(blRaw)) : null, startClock = bd ?? (be != null && be === isoToMin(blRaw) ? be : null);
    if (fl == null) { skipped.push({ id: w.id, reason: 'no finish time in the record' }); continue; }
    const full = b.gran === 'clock' && startClock != null && f.gran === 'clock' && fl > startClock, from = full ? startClock : bl;
    list.push({ id: 'OBJ-' + w.id, ref: w.id, name: s.name || w.location, kind: 'earthwork', pre_existing: false, built: { from, to: fl, start_known: from != null, mode: full ? 'clock' : 'partial' }, tier: tier(s), sources: s.source_keys || [], line: null, at: placeIn(w.location || ''), location_printed: w.location,
      note: `${w.start_printed || 'start not printed'}; ${w.end_printed || ''}${from == null ? ' The start is not bounded, so the work is shown only when complete.' : full ? '' : ' Only a bound on the start is printed: the work is shown from that bound, not earlier.'}` });
  }
  const progress = (o, t) => { if (o.pre_existing) return 1; if (!o.built) return 0; const { from, to } = o.built; if (t >= to) return 1; if (from == null || t <= from) return 0; return (t - from) / (to - from); };
  return { list, progress, skipped };
}
