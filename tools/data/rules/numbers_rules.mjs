// N001-N010: strengths, casualties, roll-ups, authorities.
import { defineRule, V, rowLabel } from './define.mjs';
import { fileGroups } from '../lib/load.mjs';

const round1 = (x) => Math.round(x * 10) / 10;

/** Combat/roll-up records that carry both strength and casualties. */
function numericRecords(ctx) {
  return ctx.oob.list.filter((r) => ['regiment', 'brigade', 'division', 'corps'].includes(r.kind) && typeof r.raw.strength === 'number' && typeof r.raw.casualties === 'number' && !r.alias_for);
}

function childSum(ctx, rec) {
  const ids = rec.kind === 'brigade' ? rec.raw.regiment_ids : rec.kind === 'division' ? rec.raw.brigade_ids : rec.kind === 'corps' ? rec.raw.division_ids : [];
  let strength = 0, casualties = 0, missing = 0, n = 0;
  for (const id of ids || []) {
    const c = ctx.oob.records.get(id);
    if (!c || typeof c.raw.strength !== 'number') { missing++; continue; }
    strength += c.raw.strength; casualties += c.raw.casualties ?? 0; n++;
  }
  return { strength, casualties, missing, n, total: (ids || []).length };
}

export function unionCasualtySums(ctx) {
  const ca = ctx.file('casualty_apportionment.json');
  if (!ca) return null;
  const sumSide = (corps) => ({
    initial: corps.reduce((a, c) => a + c.initial_strength, 0),
    total: corps.reduce((a, c) => a + c.total_casualties, 0),
    periods: corps.reduce((a, c) => a + c.engagement_periods.reduce((x, p) => x + p.casualties, 0), 0),
  });
  const oobCorps = (side) => ctx.oob.list.filter((r) => r.kind === 'corps' && r.side === side);
  const sum = (arr, k) => arr.reduce((a, r) => a + (r.raw[k] ?? 0), 0);
  return {
    union: { apportionment: sumSide(ca.union_corps), oob_corps_strength: sum(oobCorps('union'), 'strength'), oob_corps_casualties: sum(oobCorps('union'), 'casualties') },
    confederate: {
      apportionment: sumSide(ca.confederate_corps), oob_corps_strength: sum(oobCorps('confederate'), 'strength'), oob_corps_casualties: sum(oobCorps('confederate'), 'casualties'),
    },
    army: {
      union: ctx.file('oob/union_oob_corps_division.json')?.metadata ?? null,
      confederate: ctx.file('oob/confederate_oob_corps_div_bde.json')?.army ?? null,
    },
  };
}

function refValue(ctx, side) {
  const a = ctx.authorities;
  if (!a) return null;
  const id = a.n007.reference_ids[side];
  return a.casualties[side].values.find((v) => v.id === id) ?? null;
}

export function topRegimentRates(ctx) {
  const out = { union: [], confederate: [] };
  for (const r of ctx.oob.list) {
    if (r.kind !== 'regiment' || r.alias_for) continue;
    const s = r.raw.strength, c = r.raw.casualties;
    if (!(s > 0)) continue;
    out[r.side].push({ id: r.id, rate: round1((100 * c) / s), casualties: c, strength: s });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => b.rate - a.rate || b.casualties - a.casualties);
  return out;
}

export const rules = [
  defineRule({
    id: 'N001', sev: 'E', family: 'numbers', wp: 'WP-DATA-08', status: 'implemented', dv: ['DV-12'],
    title: '0 <= placement strength <= OOB strength x 1.02',
    scope: 'placements x OOB', spec_baseline: '74 units above their OOB strength by > 2 %',
    run(ctx) {
      const out = [];
      for (const [unit, list] of ctx.rowsByUnit) {
        const rec = ctx.oob.records.get(unit);
        if (!rec || !(rec.raw.strength > 0)) continue;
        const over = list.filter((r) => r.strength > rec.raw.strength * 1.02);
        if (over.length) out.push(V(`unit|${unit}`, `${unit}: ${over.length} row(s) above OOB strength ${rec.raw.strength} (max ${Math.max(...over.map((r) => r.strength))})`, { rows: over.length, kind: rec.kind }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'N002', sev: 'E', family: 'numbers', wp: 'WP-DATA-08', status: 'implemented', dv: ['DV-12'],
    title: 'placement strength never increases between consecutive keyframes of a unit (no reinforcement flag exists in legacy)',
    scope: 'tracks', spec_baseline: '121 increases across 82 units',
    run(ctx) {
      const out = [];
      for (const [unit, list] of ctx.merged) {
        for (let i = 1; i < list.length; i++) {
          if (list[i].strength > list[i - 1].strength) out.push(V(`${unit}@${list[i].tick}`, `${unit}: strength ${list[i - 1].strength} (t${list[i - 1].tick}) -> ${list[i].strength} (t${list[i].tick})`, { kind: 'increase', data: { unit } }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'N003', sev: 'E', family: 'numbers', wp: 'WP-DATA-07', status: 'implemented', dv: ['DV-14'],
    title: 'casualties <= strength; casualty_percentage present and == round(100 x casualties / strength, 1)',
    scope: 'OOB regiments, brigades, divisions, corps', spec_baseline: '0 disagreements; 222 regiments without a percentage',
    run(ctx) {
      const out = [];
      for (const r of numericRecords(ctx)) {
        const { strength: s, casualties: c, casualty_percentage: p } = r.raw;
        if (c > s) out.push(V(`${r.id}|exceeds`, `${r.id}: casualties ${c} > strength ${s}`, { kind: 'casualties_exceed', file: r.file }));
        if (s > 0) {
          if (p === undefined) out.push(V(`${r.id}|missing_pct`, `${r.id}: casualty_percentage missing`, { kind: `missing_${r.kind}`, file: r.file }));
          else if (Math.abs(p - (100 * c) / s) > 0.15) out.push(V(`${r.id}|mismatch`, `${r.id}: casualty_percentage ${p} != ${round1((100 * c) / s)}`, { kind: 'mismatch', file: r.file }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'N004', sev: 'W', family: 'numbers', wp: 'WP-DATA-08', status: 'implemented', dv: [],
    title: 'final placement strength is within 1 % of OOB strength minus casualties', scope: 'tracks x OOB',
    spec_baseline: '88 of 302 units within 5 % (regiments + brigades)',
    run(ctx) {
      const out = [];
      for (const rec of numericRecords(ctx)) {
        const list = ctx.merged.get(rec.id);
        if (!list) continue;
        const target = rec.raw.strength - rec.raw.casualties;
        const last = list[list.length - 1].strength;
        if (Math.abs(last - target) > 0.01 * Math.max(1, target)) {
          out.push(V(`unit|${rec.id}`, `${rec.id}: final placement strength ${last} vs OOB strength - casualties = ${target}`, { kind: rec.kind, data: { last, target } }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'N005', sev: 'W', family: 'numbers', wp: 'WP-DATA-07', status: 'partial', dv: ['DV-13', 'DV-26'],
    title: 'reported strength/casualties roll up from children (interim tolerances: brigades 10 %, divisions and corps exact; unlisted_* documented causes are WP-07)',
    scope: 'OOB',
    spec_baseline: 'DI: 17 brigades > 10 % (strength), 34 (casualties); divisions 22 Union + 9 Confederate (verifier: 19 + 9 with resolvable children); corps 10 of 11',
    note: 'partial: the target tolerance is 0 or a documented unlisted_* field; divisions whose brigades do not exist (VI Corps) are reported by R003, not here.',
    run(ctx) {
      const out = [];
      const tol = ctx.opts.n005Tolerance ?? { brigade: 0.10, division: 0, corps: 0 };
      for (const rec of ctx.oob.list) {
        if (!['brigade', 'division', 'corps'].includes(rec.kind) || typeof rec.raw.strength !== 'number') continue;
        const sum = childSum(ctx, rec);
        if (sum.missing || sum.n === 0) continue;
        for (const [field, reported, derived] of [['strength', rec.raw.strength, sum.strength], ['casualties', rec.raw.casualties, sum.casualties]]) {
          if (typeof reported !== 'number') continue;
          const allowed = tol[rec.kind] * Math.max(reported, derived);
          if (Math.abs(reported - derived) > allowed + 1e-9) {
            out.push(V(`${rec.kind}|${rec.id}|${field}`, `${rec.id} ${field}: reported ${reported} vs sum of children ${derived} (${derived - reported >= 0 ? '+' : ''}${derived - reported})`,
              { kind: `${rec.kind}_${field}`, file: rec.file, data: { reported, derived } }));
          }
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'N006', sev: 'E', family: 'numbers', wp: 'WP-DATA-08', status: 'implemented', dv: [],
    title: 'sum of engagement-period casualties equals total_casualties; period rate equals casualties / initial strength', scope: 'casualty_apportionment',
    spec_baseline: '2 corps (U-I +335, C-CAV -100)',
    run(ctx) {
      const ca = ctx.file('casualty_apportionment.json');
      if (!ca) return null;
      const out = [];
      for (const k of ['union_corps', 'confederate_corps']) {
        for (const c of ca[k]) {
          const sum = c.engagement_periods.reduce((a, p) => a + p.casualties, 0);
          if (sum !== c.total_casualties) out.push(V(`${c.corps_id}|periods_sum`, `${c.corps_id}: periods sum ${sum} vs total_casualties ${c.total_casualties} (${sum - c.total_casualties >= 0 ? '+' : ''}${sum - c.total_casualties})`, { kind: 'sum', data: { sum, total: c.total_casualties } }));
          const rate = round1((100 * c.total_casualties) / c.initial_strength);
          if (Math.abs(rate - c.overall_rate) > 0.15) out.push(V(`${c.corps_id}|overall_rate`, `${c.corps_id}: overall_rate ${c.overall_rate} vs computed ${rate}`, { kind: 'rate' }));
          c.engagement_periods.forEach((p, i) => {
            const pr = round1((100 * p.casualties) / c.initial_strength);
            if (Math.abs(pr - p.rate) > 0.15) out.push(V(`${c.corps_id}|period${i}|rate`, `${c.corps_id} period ${i}: rate ${p.rate} vs computed ${pr}`, { kind: 'period_rate' }));
          });
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'N007', sev: 'E', family: 'numbers', wp: 'WP-DATA-08', status: 'partial', dv: [],
    title: 'side casualty totals used on the site are within 0.5 % of the authority reference (data-src/authorities/authorities.json)',
    scope: 'OOB corps sums, army headers, casualty_apportionment sums',
    spec_baseline: 'Union 22,803-23,138 vs 23,055; Confederate 23,025-28,000 vs 23,231 (DI compares against Busey and Martin)',
    note: 'partial: references are candidates (Union: OR No. 15 23,049; Confederate: Busey and Martin 23,231 as the wording candidate); the owner decision is Q-DATA-2 and the Confederate adjudication is backlog H-01.',
    run(ctx) {
      if (!ctx.authorities) return null;
      const sums = unionCasualtySums(ctx);
      if (!sums) return null;
      const tol = ctx.authorities.n007.tolerance;
      const out = [];
      const check = (side, label, value) => {
        const ref = refValue(ctx, side);
        if (!ref || typeof value !== 'number') return;
        const rel = Math.abs(value - ref.total) / ref.total;
        if (rel > tol) out.push(V(`${side}|${label}`, `${side} ${label}: ${value} vs reference ${ref.id} ${ref.total} (${(100 * (value - ref.total) / ref.total).toFixed(2)} %)`, { kind: label, data: { value, reference: ref.total, reference_id: ref.id } }));
      };
      check('union', 'oob_corps_casualty_sum', sums.union.oob_corps_casualties);
      check('union', 'apportionment_total_sum', sums.union.apportionment.total);
      check('union', 'apportionment_period_sum', sums.union.apportionment.periods);
      check('union', 'oob_army_header', sums.army.union?.total_casualties);
      check('confederate', 'oob_corps_casualty_sum', sums.confederate.oob_corps_casualties);
      check('confederate', 'apportionment_total_sum', sums.confederate.apportionment.total);
      check('confederate', 'apportionment_period_sum', sums.confederate.apportionment.periods);
      check('confederate', 'oob_army_header', sums.army.confederate?.total_casualties);
      return out;
    },
  }),
  defineRule({
    id: 'N008', sev: 'E', family: 'numbers', wp: 'WP-DATA-08', status: 'deferred', dv: [],
    title: 'sum of per-tick casualty deltas equals the declared total', scope: 'casualty timeline',
    spec_baseline: 'n/a (no casualty_timeline.json)', blocked_by: 'WP-DATA-08d casualty_timeline.json does not exist yet',
    run() { return null; },
  }),
  defineRule({
    id: 'N009', sev: 'E', family: 'numbers', wp: 'WP-DATA-08', status: 'implemented', dv: [],
    title: '"notable" statistics are recomputable from the OOB and have the shape the dashboard reads',
    scope: 'casualty_apportionment.notable_intensity_notes', spec_baseline: '1 wrong claim (Confederate top rate) + 1 shape defect (nested highest_single_regiment_rate)',
    run(ctx) {
      const ca = ctx.file('casualty_apportionment.json');
      if (!ca) return null;
      const out = [];
      const top = topRegimentRates(ctx);
      const h = ca.notable_intensity_notes?.highest_single_regiment_rate;
      if (h) {
        for (const side of ['union', 'confederate']) {
          const claim = h[side];
          const best = top[side][0];
          if (claim && best && (claim.unit !== best.id || Math.abs(claim.rate - best.rate) > 0.05)) {
            out.push(V(`highest_rate|${side}`, `${side}: file claims ${claim.unit} ${claim.rate} %, OOB says ${best.id} ${best.rate} % (${best.casualties}/${best.strength})`, { kind: 'wrong_claim', data: { claimed: claim.unit, computed: best.id } }));
          }
          if (claim && /\b\d+ of \d+ casualties\b/.test(claim.note || '')) out.push(V(`highest_rate|${side}|wording`, `${side}: note says "${claim.note}" (a rate is casualties of men engaged, not "of casualties")`, { kind: 'wording' }));
        }
        // the dashboard iterates the top-level keys of notable_intensity_notes and reads .unit and .note from each
        if (h.unit === undefined || h.note === undefined) out.push(V('highest_rate|shape', 'highest_single_regiment_rate has no unit/note; dashboard.html reads n.unit and n.note from every top-level key', { kind: 'shape' }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'N010', sev: 'E', family: 'numbers', wp: 'WP-DATA-07', status: 'implemented', dv: [],
    title: 'declared gun/battery totals equal what the batteries list', scope: 'OOB artillery',
    spec_baseline: 'Confederate 182 listed vs 283 declared; Union 306 (278 + 28 horse) vs about 370 in the notes text',
    run(ctx) {
      const out = [];
      const guns = (pred) => ctx.oob.list.filter((r) => r.kind === 'battery' && pred(r)).reduce((a, r) => a + (r.raw.gun_count ?? 0), 0);
      const cf = ctx.file('oob/confederate_artillery.json');
      if (cf) {
        const declared = cf.metadata.total_guns_approximately;
        const listed = guns((r) => r.file === 'oob/confederate_artillery.json');
        if (declared !== listed) out.push(V('confederate|artillery_file', `confederate_artillery.json declares ~${declared} guns but its batteries list ${listed}`, { kind: 'confederate', data: { declared, listed } }));
      }
      const uf = ctx.file('oob/union_artillery.json');
      if (uf) {
        const declared = uf.metadata.total_guns;
        const listed = guns((r) => r.file === 'oob/union_artillery.json');
        if (declared !== listed) out.push(V('union|artillery_file', `union_artillery.json declares ${declared} guns but its batteries list ${listed}`, { kind: 'union', data: { declared, listed } }));
        const m = String(uf.metadata.notes || '').match(/approximately\s+(\d+)\s+including horse/i);
        if (m) {
          const withHorse = guns((r) => r.side === 'union');
          if (Number(m[1]) !== withHorse) out.push(V('union|notes_including_horse', `union_artillery.json notes say approximately ${m[1]} guns including horse; batteries list ${withHorse}`, { kind: 'union_notes', data: { declared: Number(m[1]), listed: withHorse } }));
        }
      }
      return out;
    },
  }),
];
export { fileGroups, rowLabel };
