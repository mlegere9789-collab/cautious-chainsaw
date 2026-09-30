// Candidate datasets that need judgement or outside reading (WP-DATA-07 step 5, WP-DATA-08c/e). None of this is served.
import { topRegimentRates } from '../rules/numbers_rules.mjs';
import { retiredLiteralHits } from '../rules/facts_rules.mjs';
import { commanderChain } from './orgchain.mjs';

const shortName = (d) => String(d ?? '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+(Volunteer\s+)?Infantry\b.*$/i, '').replace(/\s+/g, ' ').trim();
const base = { generated_by: 'tools/data/facts.mjs', status: 'CANDIDATE: derived from legacy/dist/data; nothing here is served or displayed' };

/** WP-DATA-08c: notable_intensity[] generated from the OOB. Display names, never raw ids; notes are templated. */
export function buildNotableIntensity(ctx) {
  const top = topRegimentRates(ctx);
  const items = [];
  const push = (id, label, side, r, kind) => {
    const rec = ctx.oob.records.get(r.id);
    items.push({
      id, label, side, unit_id: r.id, display_name: shortName(rec.raw.designation),
      value: kind === 'rate' ? r.rate : r.casualties,
      value_label: kind === 'rate' ? `${r.rate.toFixed(1)}%` : `${r.casualties.toLocaleString('en-US')} casualties`,
      note: `${r.casualties.toLocaleString('en-US')} casualties of ${r.strength.toLocaleString('en-US')} engaged${kind === 'count' ? ` (${r.rate.toFixed(1)}%)` : ''}`,
      basis: 'OOB regiment record: casualties / strength (both claimed from Busey and Martin, facts-only)',
    });
  };
  const byCount = (s) => [...top[s]].sort((a, b) => b.casualties - a.casualties)[0];
  push('NI-001', 'Highest loss rate, Union regiment', 'union', top.union[0], 'rate');
  push('NI-002', 'Highest loss rate, Confederate regiment', 'confederate', top.confederate[0], 'rate');
  push('NI-003', 'Most casualties, Union regiment', 'union', byCount('union'), 'count');
  push('NI-004', 'Most casualties, Confederate regiment', 'confederate', byCount('confederate'), 'count');
  const ca = ctx.file('casualty_apportionment.json');
  const legacy = ca?.notable_intensity_notes?.highest_single_regiment_rate;
  return {
    schema: 'gtbg/notable-intensity/1', ...base,
    rule: 'regiments with strength > 0, alias excluded; no minimum-strength threshold (the ranking is identical with or without one)',
    items,
    legacy_claims_checked: legacy ? ['union', 'confederate'].map((s) => ({
      side: s, legacy_unit: legacy[s].unit, legacy_rate: legacy[s].rate, legacy_note: legacy[s].note,
      recomputed_unit: top[s][0].id, recomputed_rate: top[s][0].rate,
      agrees: legacy[s].unit === top[s][0].id,
      wording_defect: /\b\d+ of \d+ casualties\b/.test(legacy[s].note) ? 'says "N of M casualties": a rate is casualties of men engaged' : null,
    })) : null,
    note: 'Rate of 26th NC: the file says 69.7, the recomputation 588/843 rounds to 69.8; both are within the 0.15 tolerance of rule N003.',
  };
}

/**
 * WP-DATA-07 step 3: roll-up ledger. reported_* = what the record says; derived_* = sum of the children that exist; unlisted_* = the
 * difference that a documented cause (staff, provost, unattached, unlisted regiments) has to explain. No cause is invented here.
 */
export function buildRollups(ctx) {
  const rows = [];
  for (const rec of ctx.oob.list) {
    if (!['brigade', 'division', 'corps'].includes(rec.kind) || typeof rec.raw.strength !== 'number') continue;
    const ids = rec.kind === 'brigade' ? rec.raw.regiment_ids : rec.kind === 'division' ? rec.raw.brigade_ids : rec.raw.division_ids;
    let ds = 0, dc = 0, found = 0;
    for (const id of ids || []) {
      const c = ctx.oob.records.get(id);
      if (c && typeof c.raw.strength === 'number') { ds += c.raw.strength; dc += c.raw.casualties ?? 0; found++; }
    }
    rows.push({
      id: rec.id, level: rec.kind, side: rec.side, children_listed: (ids || []).length, children_found: found, children_missing: (ids || []).length - found,
      reported_strength: rec.raw.strength, derived_strength: ds, unlisted_strength: rec.raw.strength - ds,
      reported_casualties: rec.raw.casualties ?? null, derived_casualties: dc, unlisted_casualties: (rec.raw.casualties ?? 0) - dc,
      exact: found === (ids || []).length && rec.raw.strength === ds && (rec.raw.casualties ?? 0) === dc,
      cause: null, cause_status: 'undocumented: a historian names the cause (staff, provost, unattached, unlisted regiments) or the record is corrected',
    });
  }
  const sum = (level, side, k) => rows.filter((r) => r.level === level && r.side === side).reduce((a, r) => a + r[k], 0);
  return {
    schema: 'gtbg/candidate-rollups/1', ...base,
    counts: { records: rows.length, exact: rows.filter((r) => r.exact).length, with_missing_children: rows.filter((r) => r.children_missing).length },
    army_level: {
      union: { corps_reported_strength: sum('corps', 'union', 'reported_strength'), corps_reported_casualties: sum('corps', 'union', 'reported_casualties') },
      confederate: { corps_reported_strength: sum('corps', 'confederate', 'reported_strength'), corps_reported_casualties: sum('corps', 'confederate', 'reported_casualties') },
      note: 'the army records (U-AOP does not exist; C-ANV is a header) are compared in rule N007 against data-src/authorities/authorities.json',
    },
    rows,
  };
}

/** WP-DATA-06 alias table: only `high` proposals resolve; everything else is listed but does not resolve until the historian decides. */
export function buildAliasTable(crosswalk) {
  const aliases = [];
  const unresolved = [];
  for (const e of crosswalk.entries) {
    if (e.proposed && !e.new_record) {
      aliases.push({ alias: e.alias_id, canonical: e.proposed, canonical_kind: e.proposed_kind, rule: e.rule, confidence: e.confidence, resolves: e.confidence === 'high', status: e.confidence === 'high' ? 'proposed_auto' : 'needs_historian', rows: e.rows, rows_by_confidence: e.rows_by_confidence, side_change: Boolean(e.side_flip) });
    } else unresolved.push({ alias: e.alias_id, rule: e.rule, confidence: e.confidence, reason: e.reason ?? (e.new_record ? 'a new OOB record is required (VI Corps brigade candidates)' : ''), candidates: e.candidates ?? [], rows: e.rows });
  }
  return {
    schema: 'gtbg/unit-aliases/1', ...base,
    policy: 'Aliases stay resolvable for two MAJOR data versions and never change dv. Only status proposed_auto (confidence high: EVERY placement row of the id reaches high on its own evidence) may be applied by tooling; every other row is a proposal for the historian (H-03). A side is only changed by rule wrong_side_prefix.',
    counts: { aliases: aliases.length, resolving: aliases.filter((a) => a.resolves).length, needs_historian: aliases.filter((a) => !a.resolves).length, unresolved: unresolved.length },
    aliases, unresolved,
  };
}

/** WP-DATA-08e: claims that need a historian's adjudication. The data column is measured; the claim column quotes the site's own text. */
export function buildAdjudicationRegister(ctx) {
  const top = topRegimentRates(ctx);
  const rec = (id) => ctx.oob.records.get(id)?.raw;
  const iversonBrigade = ctx.oob.list.find((r) => r.kind === 'brigade' && commanderChain(r.raw.commander).some((c) => c.surname === 'Iverson'));
  const c26 = rec('C-26NC');
  const hits51 = retiredLiteralHits(ctx).filter((h) => h.id === 'casualties-51000' || h.id === 'casualties-28000');
  const ca = ctx.file('casualty_apportionment.json');
  const c1 = ca?.confederate_corps.find((c) => c.corps_id === 'C-I');
  const c1d3 = c1?.engagement_periods.find((p) => p.day === 3);
  const items = [
    {
      id: 'ADJ-01', topic: '26th North Carolina losses',
      claim: '"26th NC — Lost 714 of 800 men on July 1 — highest regimental casualties in the battle on either side." (embedded timeline marker, bundle.pretty.js line 100756)',
      data_says: `OOB C-26NC: ${c26.casualties} casualties of ${c26.strength} engaged over days ${JSON.stringify(c26.days_engaged)} (${(100 * c26.casualties / c26.strength).toFixed(1)}%). It is the highest casualty COUNT of any regiment in the OOB (Confederate top count ${[...top.confederate].sort((a, b) => b.casualties - a.casualties)[0].id}); the figures 714 and 800 appear nowhere in the data.`,
      needs: 'OR No. 13/Fox for the Union side is not relevant; for the 26th NC use OR27-2 (Guild return) and Busey and Martin (backlog H-05)', status: 'open', needs_historian: true,
    },
    {
      id: 'ADJ-02', topic: '1st Minnesota "greatest loss percentage"',
      claim: '"1st Minnesota — ... lost 224 of 262 men. Greatest loss percentage of any regiment." (bundle.pretty.js line 100734)',
      data_says: `OOB U-1MN: 224 of 262 = 85.5%, the highest rate of any regiment in the OOB (next: ${top.union[1].id} ${top.union[1].rate}%, ${top.confederate[0].id} ${top.confederate[0].rate}% on the Confederate side). The claim is consistent with the OOB; the OOB figures are claimed from Busey and Martin.`,
      needs: 'confirm against OR27-1 No. 15/Fox and the regiment\'s own report; then the wording may stand as "highest loss rate in the order of battle"', status: 'open', needs_historian: true,
    },
    {
      id: 'ADJ-03', topic: 'Iverson\'s brigade "nearly 500 Confederates surrendered"',
      claim: '"Nearly 500 Confederates surrendered in the wheat field — the largest single mass surrender of the battle." (chronology narrative, bundle.pretty.js line 100091)',
      data_says: iversonBrigade ? `OOB ${iversonBrigade.id}: ${iversonBrigade.raw.casualties} casualties of ${iversonBrigade.raw.strength} engaged (killed, wounded and missing combined). No field separates prisoners, so the claim cannot be checked from the data.` : 'Iverson brigade not found',
      needs: 'Rodes\'s and Iverson\'s reports (OR27-2) for the captured count (backlog H-05)', status: 'open', needs_historian: true,
    },
    {
      id: 'ADJ-04', topic: 'Lincoln "wrote" the quoted sentence',
      claim: 'President Lincoln "wrote" "We had them within our grasp..." (chronology narrative, bundle.pretty.js line 100315)',
      data_says: 'Not checkable from data. The audit lists this as an adjudication item (whether and to whom it was written or sent).',
      needs: 'a primary source for the wording and the fate of the document (backlog H-05)', status: 'open', needs_historian: true,
    },
    {
      id: 'ADJ-05', topic: 'The bare "51,000" (and the 28,000 it contains)',
      claim: `"51,000 casualties" appears ${hits51.filter((h) => h.id === 'casualties-51000').length} times: ${hits51.filter((h) => h.id === 'casualties-51000').map((h) => `${h.where}:${h.line}`).join('; ')}`,
      data_says: 'The audit reads 51,000 as 23,049 (OR, Union) + 28,000 (upper Confederate estimate): an OR-versus-estimate mix. data-src/authorities/authorities.json lists the authorities; the Confederate side is a range (Guild return 20,451 read from OCR; Busey and Martin 23,231 secondary; upper estimate 28,000 secondary).',
      needs: 'owner wording decision Q-DATA-2 (default: "about 46,000 ...; estimates run to 51,000") and the historian for the Confederate range (H-01)', status: 'open', needs_historian: true,
    },
    {
      id: 'ADJ-06', topic: 'Pickett\'s division "about 2,700" versus Confederate First Corps Day 3',
      claim: `casualty_apportionment.json notable_intensity_notes.most_compressed_confederate.note: "${ca?.notable_intensity_notes.most_compressed_confederate.note}"`,
      data_says: c1d3 ? `C-I's whole Day 3 engagement period is ${c1d3.casualties.toLocaleString('en-US')} casualties, which is fewer than the ~2,700 attributed to one division of it.` : 'not found',
      needs: 'historian: which figure is meant (division only, or all of Pickett\'s Charge), with a source', status: 'open', needs_historian: true,
    },
    {
      id: 'ADJ-07', topic: 'Confederate "highest single-regiment rate" card',
      claim: 'casualty_apportionment.json highest_single_regiment_rate.confederate: C-26NC 69.7%',
      data_says: `The OOB's highest Confederate rate is ${top.confederate[0].id} ${top.confederate[0].rate}% (${top.confederate[0].casualties}/${top.confederate[0].strength}); C-26NC has the highest COUNT (588), not the highest rate. Fix = generated notable_intensity (data-src/build/candidates/notable_intensity.json).`,
      needs: 'none for the data fix (derived); wording is WP-CONTENT', status: 'data_resolved_candidate', needs_historian: false,
    },
  ];
  return { schema: 'gtbg/adjudication-register/1', ...base, note: 'Chapter 13 WP-DATA-08e also names Avery and Alexander (chronology t525/530) items; their site text was not extracted in this round.', items };
}

/**
 * WP-DATA-07 step 5: commanders of the Confederate cavalry regiments, as PRINTED in the Official Records
 * (OR Ser. I vol. 27 pt. 2, organization of the Army of Northern Virginia, Cavalry, printed pp.290-291;
 * IA warofrebellion272unit_djvu.txt lines 26100-26235, OCR). The site's 22 cavalry records have no commander.
 */
const OR_CAV = {
  'C-1VA-CAV': 'Col. James H. Drake', 'C-2VA-CAV': 'Col. T. T. Munford', 'C-3VA-CAV': 'Col. Thomas H. Owen', 'C-4VA-CAV': 'Col. Williams C. Wickham', 'C-5VA-CAV': 'Col. T. L. Rosser',
  'C-9VA-CAV': 'Col. R. L. T. Beale', 'C-10VA-CAV': 'Col. J. Lucius Davis', 'C-34VA-CAV-B': 'Lieut. Col. V. A. Witcher',
  'C-18VA-CAV': 'Col. George W. Imboden', 'C-62VA-MTD': 'Col. George H. Smith', 'C-VA-PA-CAV': 'Capt. John E. McNeill', 'C-McClanahan-ART': 'Capt. J. H. McClanahan',
};
const OR_CAV_NOT_IN_SITE = [
  '1st North Carolina Cavalry (Col. L. S. Baker; commanded Hampton\'s brigade after Hampton was wounded)', 'Robertson\'s Brigade: 4th North Carolina (Col. D. D. Ferebee), 5th North Carolina',
  'Jones\'s Brigade (Brig. Gen. William E. Jones): 6th Virginia (Maj. C. E. Flournoy), 7th Virginia (Lieut. Col. Thomas Marshall), 11th Virginia (Col. L. L. Lomax)',
  '2nd North Carolina Cavalry (W. H. F. Lee\'s Brigade)', '1st Maryland Battalion (Maj. Harry Gilmor; Maj. Ridgely Brown), serving with Ewell\'s corps',
  'Stuart Horse Artillery (Maj. R. F. Beckham): Chew\'s, Griffin\'s, McGregor\'s and Moorman\'s batteries',
];

export function buildCavalryCommanders(ctx) {
  const rows = [];
  for (const r of ctx.oob.list) {
    if (!(r.file === 'oob/confederate_cavalry.json' && (r.kind === 'regiment' || r.filed_as === 'regiment'))) continue;
    const printed = OR_CAV[r.id] ?? null;
    rows.push({
      regiment_id: r.id, designation: r.raw.designation, parent_brigade_id: r.raw.parent_brigade_id,
      commander_in_site_data: r.raw.commander?.name ?? null,
      commander_printed_in_or: printed,
      status: printed ? 'candidate_from_or_ocr' : 'unknown',
      commander_status_proposal: printed ? 'recorded (after historian check)' : 'unknown: the OR organization prints no commander for this regiment',
      needs_historian: true,
    });
  }
  const mc = ctx.oob.records.get('C-McClanahan-ART');
  return {
    schema: 'gtbg/candidate-confederate-cavalry-commanders/1', ...base,
    source: 'OR Ser. I vol. 27 pt. 2, organization of the Army of Northern Virginia, Cavalry (printed pp.290-291), IA warofrebellion272unit_djvu.txt lines 26100-26235. OCR read by this workstream; initials are as printed.',
    counts: { regiments_listed: rows.length, with_printed_commander: rows.filter((x) => x.commander_printed_in_or).length, unknown: rows.filter((x) => !x.commander_printed_in_or).length },
    findings: [
      { id: 'C-McClanahan-ART', text: `The OR lists "Virginia Battery, Capt. J. H. McClanahan" under Imboden's Command, separate from the Stuart Horse Artillery (Breathed, Chew, Griffin, Hart, McGregor, Moorman): C-McClanahan-ART is a battery in Imboden's command, not a duplicate of the C-HAB-* records. It should move to the horse_artillery list (104th battery)${mc ? '' : ''}.` },
      { id: 'C-HAB-Jackson', text: 'The OR prints "Jackson\'s (Virginia) Battery, Capt. Thomas E. Jackson" under Jenkins\' Brigade, not under the Stuart Horse Artillery where the site files C-HAB-Jackson.' },
    ],
    regiments: rows,
    printed_in_or_but_absent_from_site_oob: OR_CAV_NOT_IN_SITE,
  };
}
