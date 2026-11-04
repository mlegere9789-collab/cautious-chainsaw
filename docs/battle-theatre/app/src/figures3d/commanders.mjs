// Named commanders (render PLAN G14, owner order OA04, requirement R04 "commanders lieutenant to general").
// WHAT THIS IS: a registry that makes every commander the repository names ADDRESSABLE and MARKED, and builds his figure from the generic officer dress of his kit unit at his rank.
// WHAT THIS IS NOT: an individual head, face or dress. No portrait or description of any commander's appearance beyond the kit `named_individuals` records was read (EG-FIG-0004, owner decision pending).
// Every entry carries `individual_model: 'none'` and `gap: true` so that the product card says "no individual model" (Law cl.7); nothing here is documented unless a non-lead source supports exactly the claim.
// Records come from kit/kit_specs.json named_individuals (8 men), the named leads of rank_rules.leads lists (names only, no dress), and Rufus R. Dawes (rank and command: his own report, OR27-1-R035, 6th Wisconsin, in history/positions/positions_A.jsonl POS-A-1D1-021).
import { manifestFor } from '../history/manifest.mjs';

export const COMMANDER_REGISTER = 'EG-FIG-0004';
export const COMMANDER_CARD = 'no individual model: generic officer figure of the unit at this rank; the dress and face of this man are not in the record';
const GENERAL_RANKS = ['lieutenant', 'captain', 'field officer', 'general'];

/** kit named_individuals records (as printed), reduced to what the figure code may use. `named` is the record text, never promoted: the effective tier of the kit stays (weak sources stay inferred). */
export function namedRecords(kitSpecs) {
  return kitSpecs.named_individuals.records.map(r => ({
    id: r.id, who: r.who, army: r.army, kind: 'kit_named_record', kit_items: r.items ?? [], record_text: r.documented_text, tier: r.tier, weak_source: !!r.weak_source, source_keys: r.source_keys ?? [],
    rank: 'general', individual_model: 'none', gap: true, register: COMMANDER_REGISTER, card: COMMANDER_CARD,
  }));
}
/** Names only (no dress): the kit rank_rules lists the commanders whose dress is an open gap (G8 Union, G12 Confederate). */
export function namedLeads(kitSpecs) {
  const out = [], rr = kitSpecs.named_individuals.not_done ?? {};
  for (const army of ['union', 'confederate']) for (const who of rr[army] ?? []) {
    if (/horse furniture|staff aiguillettes|the rest/i.test(who)) continue;
    out.push({ id: `LEAD.${army}.${who.split(/[ (]/)[0].replace(/[^A-Za-z.]/g, '').toUpperCase()}`, who: who.replace(/ \(.*$/, ''), army, kind: 'kit_open_gap_name', kit_items: [], record_text: who, tier: 'gap', weak_source: false, source_keys: [],
      rank: 'general', individual_model: 'none', gap: true, register: COMMANDER_REGISTER, card: COMMANDER_CARD });
  }
  return out;
}
/** Rufus R. Dawes: Lieutenant Colonel commanding the 6th Wisconsin on 1 July 1863 (documented by his own report, OR27-1-R035 p. 275, which he signs as Lieut. Col.; the OCR spelling in the claim file is 'Eufus'). Dress, face and weapon of this man: gap. */
export const DAWES = {
  id: 'NAMED.DAWES', who: 'Rufus R. Dawes', army: 'union', kind: 'owner_named', kit_unit: 'US.6WI', history_unit: 'us-1c-1d-meredith-6wi', kit_items: [], rank: 'field officer',
  record_text: 'Lieutenant Colonel commanding the 6th Wisconsin Infantry at Gettysburg (author of OR27-1-R035, printed p. 275, per history/positions/positions_A.jsonl POS-A-1D1-021)',
  tier: 'documented', rank_tier: 'documented', dress_tier: 'gap', weak_source: false, source_keys: ['OR27-1-R035'], individual_model: 'none', gap: true, register: COMMANDER_REGISTER, card: COMMANDER_CARD,
  not_supported: 'his dress, face, height, weapon, horse: no source for any of these was read',
};
export function commanderRegistry(kitSpecs) { return [...namedRecords(kitSpecs), ...namedLeads(kitSpecs), DAWES]; }

/**
 * The officer manifest of a commander for a kit unit and date. Rank defaults to the registry rank. The manifest is the generic officer dress of that unit (manifest.mjs); the commander's own record items are returned beside it in `named_items`
 * and are NOT applied (applying a weak-source item to the one generic officer would hide the gap). Disputed kit units need a `variant`.
 */
export function commanderManifest(kit, entry, { unitId = entry.kit_unit, seed = 1863, date = '1863-07-02', rank = entry.rank, variant = null } = {}) {
  if (!unitId) throw new Error('commanderManifest: no kit unit for ' + entry.who);
  if (!GENERAL_RANKS.includes(rank)) throw new Error('not an officer rank: ' + rank);
  const m = manifestFor(kit, { soldierId: `${unitId}:cmd:${entry.id}`, unitId, seed, date, rank, role: 'officer', variant });
  return { ...m, commander: { id: entry.id, who: entry.who, individual_model: 'none', gap: true, register: entry.register, card: entry.card, tier: entry.tier, named_items: entry.kit_items } };
}
