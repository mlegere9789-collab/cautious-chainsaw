// relevance.mjs - adapter-agnostic retrieval metrics (port of hist-current evalcore.js, unchanged definitions).
// A "system" is async (q) => { ranked:[record ids...], shown:[record ids...], bubbles:[plain text...], refused:boolean }.
// Metric definitions (docs/plan/specialists/hist-current.md section 3.3):
//   S@1/S@3   top-1 / top-3 shown card is relevant (query's primary id OR regexp match on that record's core text; lenient by design)
//   canonical@1  the entity's own regiment/place record (ids starting U-, C-, LOC-) is the first shown card (strict)
//   fact@3    the query's `must` string appears in the answer text;  typo S@1 = S@1 over category "typo";  correct decline = refused when expect=refuse
import { load } from './data.mjs';

const d = load();
export const core = {};
for (const r of d.regs) core[r.regiment_id] = `${r.designation} ${r.commander && r.commander.name || ''} ${r.key_action || ''} ${r.state || ''}`;
for (const v of d.vigs) core[v.vignette_id] = `${v.title} ${v.trigger_location} ${v.panel_summary}`;
for (const e of d.chron) core['D' + e.day + 'T' + e.tick] = `${e.event} ${e.location} ${e.narrative || ''}`;
for (const l of d.terrain.key_locations) core[l.location_id] = `${l.name} ${l.significance || ''}`;
const ctext = (o) => `${o.designation || o.name || ''} ${(o.commander && o.commander.name) || ''} ${o.key_action || ''} ${o.significance || ''}`;
for (const b of d.ubde.brigades) core['BDE:' + b.brigade_id] = ctext(b);
for (const b of d.cbde.brigades) core['BDE:' + b.brigade_id] = ctext(b);
for (const x of d.ucorps.divisions) core['DIV:' + x.division_id] = ctext(x);
for (const x of d.cbde.divisions) core['DIV:' + x.division_id] = ctext(x);
for (const x of d.ucorps.corps) core['CORPS:' + x.corps_id] = ctext(x) + ' ' + (x.notes || '');
for (const x of d.cbde.corps) core['CORPS:' + x.corps_id] = ctext(x);
core['ARMY:U'] = `Army of the Potomac Union army ${d.ucorps.metadata.army_commander.name}`;
core['ARMY:C'] = `Army of Northern Virginia Confederate army ${d.cbde.army.commander.name} Lee`;
const allBat = [];
for (const br of d.uart.artillery_reserve.brigades) allBat.push(...br.batteries);
for (const br of d.uart.corps_artillery_brigades) allBat.push(...br.batteries);
for (const k of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) for (const bt of d.cart[k].battalions) allBat.push(...bt.batteries);
allBat.push(...d.ucav.horse_artillery, ...d.ccav.horse_artillery);
for (const b of allBat) core['ART:' + b.battery_id] = `${b.designation} ${(b.commander && b.commander.name) || ''} ${b.key_action || ''}`;
for (const s of [...d.succ.union_successions, ...d.succ.confederate_successions]) core['SUCC:' + s.event_id] = `${s.event} ${s.from_commander || ''} ${s.to_commander || ''} ${s.notes || ''}`;
for (const x of d.terrain.roads) core['ROAD:' + x.road_id] = `${x.name} ${x.significance || ''}`;
for (const x of d.terrain.structures) core['STR:' + x.structure_id] = `${x.name} ${x.significance || ''}`;
for (const x of d.terrain.terrain_features) core['TF:' + x.feature_id] = `${x.name} ${x.significance || ''}`;
core['CAS:notable_intensity_notes'] = 'highest casualty rate 1st Minnesota 26th North Carolina most compressed casualties';
core['SITE:find-ancestor'] = 'find your ancestor regiment lookup';
const dayOf = {};
for (const e of d.chron) dayOf['D' + e.day + 'T' + e.tick] = e.day;
for (const v of d.vigs) dayOf[v.vignette_id] = v.trigger_tick <= 225 ? 1 : v.trigger_tick <= 450 ? 2 : 3;

export function grade(q, id) {
  if (q.primary.includes(id)) return 2;
  if (q.day && dayOf[id] === q.day && /^(D|V)/.test(id)) return 1;
  if (q.rel && core[id] !== undefined && q.rel.source !== '^$' && q.rel.test(core[id])) return 1;
  return 0;
}

// hard render defects (same detector as the recorded baseline, extended with the plan's forbidden strings)
const RAWID = /\b[UC]-(?:[IVX]+|ART|CAV|CAV-\d)(?:-[A-Za-z0-9]+)*\b/;
export function defects(bubbles) {
  const txt = bubbles.join(' \n ');
  const out = [];
  if (/\bundefined\b/.test(txt)) out.push('undefined-leak');
  if (RAWID.test(txt) || /\b[UC]-\d{1,3}[A-Z]{2}\b/.test(txt)) out.push('raw-internal-id');
  if (/\b(survived|wounded|killed|captured|mortally|died)\b[^.]{0,60}\b(july|gettysburg|petersburg|fredericksburg|antietam|chancellorsville|richmond|virginia)\b/.test(txt)) out.push('lowercased-proper-noun');
  if (bubbles.some((b) => b.length > 1200)) out.push('wall-of-text');
  if (/\bU-84NY\b|\b84th New York\b/.test(txt) && /alias for/.test(txt)) out.push('alias-record-shown');
  if (/\bnull\b|\bNaN\b/.test(txt)) out.push('null-nan');
  if (/\s--\s/.test(txt)) out.push('double-hyphen');
  if (/\bsite clock\b|\btick\b/i.test(txt)) out.push('tick-or-site-clock');
  return out;
}

export async function evaluate(system, { queries }) {
  const rows = [];
  for (const q of queries) {
    const res = await system(q.q);
    const shown = res.shown || [];
    const ranked = res.ranked || shown;
    const gs = shown.map((id) => grade(q, id));
    const gAll = ranked.slice(0, 50).map((id) => grade(q, id));
    const firstRel = gAll.findIndex((g) => g >= 1);
    const text = (res.bubbles || []).join(' \n ');
    const primHitIds = q.primary.filter((p) => shown.includes(p));
    const canon = q.primary.filter((p) => /^(U-|C-|LOC-)/.test(p));
    let canon1 = null, canon3 = null, canonRank = null;
    if (canon.length) {
      canon1 = shown.length && canon.includes(shown[0]) ? 1 : 0;
      canon3 = shown.slice(0, 3).some((x) => canon.includes(x)) ? 1 : 0;
      const ri = ranked.findIndex((x) => canon.includes(x)); canonRank = ri >= 0 ? ri + 1 : null;
    }
    const row = {
      id: q.id, cat: q.cat, avail: q.avail, expect: q.expect, q: q.q, shown: shown.slice(0, 5), refused: !!res.refused, mode: res.mode || null,
      s1: shown.length ? (gs[0] >= 1 ? 1 : 0) : 0, s3: gs.some((g) => g >= 1) ? 1 : 0, p3: shown.length ? gs.filter((g) => g >= 1).length / shown.length : 0,
      prim3: q.primary.length ? (primHitIds.length ? 1 : 0) : null, r3: q.primary.length ? Math.min(1, primHitIds.length / Math.min(q.primary.length, 3)) : null,
      mrr: firstRel >= 0 ? 1 / (firstRel + 1) : 0,
      fact: q.must ? (q.must.test(text) ? 1 : 0) : null, fact1: q.must ? ((res.bubbles && res.bubbles[0] && q.must.test(res.bubbles[0])) ? 1 : 0) : null,
      canon1, canon3, canonRank, defects: defects(res.bubbles || []), chars: text.length,
    };
    rows.push(row);
  }
  return rows;
}

export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export function summarize(rows) {
  const ans = rows.filter((r) => r.expect === 'answer');
  const ref = rows.filter((r) => r.expect === 'refuse');
  const withPrim = ans.filter((r) => r.prim3 !== null);
  const withFact = rows.filter((r) => r.fact !== null);
  const S = {
    n: rows.length, n_answer: ans.length, n_refuse: ref.length,
    success_at_1: mean(ans.map((r) => r.s1)), success_at_3: mean(ans.map((r) => r.s3)), precision_at_3: mean(ans.map((r) => r.p3)), mrr: mean(ans.map((r) => r.mrr)),
    primary_hit_at_3: mean(withPrim.map((r) => r.prim3)), recall_at_3: mean(withPrim.map((r) => r.r3)),
    fact_hit_at_3: mean(withFact.map((r) => r.fact)), fact_hit_top_bubble: mean(withFact.map((r) => r.fact1)), n_fact: withFact.length,
    canon_at_1: mean(rows.filter((r) => r.canon1 !== null).map((r) => r.canon1)), canon_at_3: mean(rows.filter((r) => r.canon3 !== null).map((r) => r.canon3)), n_canon: rows.filter((r) => r.canon1 !== null).length,
    canon_median_rank: (() => { const a = rows.filter((r) => r.canon1 !== null).map((r) => (r.canonRank === null ? 999 : r.canonRank)).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; })(),
    correct_refusal_rate: ref.length ? mean(ref.map((r) => (r.refused ? 1 : 0))) : null,
    false_answer_rate_on_refuse: ref.length ? mean(ref.map((r) => (r.refused ? 0 : 1))) : null,
    refusal_rate_on_answerable: ans.length ? mean(ans.map((r) => (r.refused ? 1 : 0))) : null,
    defect_rate: mean(rows.map((r) => (r.defects.length ? 1 : 0))), mean_chars_shown: mean(rows.map((r) => r.chars)),
    typo_s1: (() => { const t = ans.filter((r) => r.cat === 'typo'); return t.length ? mean(t.map((r) => r.s1)) : null; })(), n_typo: ans.filter((r) => r.cat === 'typo').length,
  };
  const byKey = (key) => {
    const g = {};
    for (const r of rows) (g[r[key]] = g[r[key]] || []).push(r);
    const o = {};
    for (const k of Object.keys(g)) {
      const a = g[k].filter((r) => r.expect === 'answer'), f = g[k].filter((r) => r.expect === 'refuse');
      o[k] = { n: g[k].length, s1: mean(a.map((r) => r.s1)), s3: mean(a.map((r) => r.s3)), prim3: mean(a.filter((r) => r.prim3 !== null).map((r) => r.prim3)), fact: mean(g[k].filter((r) => r.fact !== null).map((r) => r.fact)), refuse_ok: f.length ? mean(f.map((r) => (r.refused ? 1 : 0))) : null };
    }
    return o;
  };
  S.by_cat = byKey('cat'); S.by_avail = byKey('avail');
  const dc = {}; for (const r of rows) for (const df of r.defects) dc[df] = (dc[df] || 0) + 1; S.defect_counts = dc;
  return S;
}
export const COUNTS = { records: Object.keys(core).length };
