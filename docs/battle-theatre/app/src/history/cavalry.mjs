// CAVALRY HORSES AND DISMOUNTED CAVALRY (workstream ws10: riders, horses, horse casualties, led horses, horse-holders).
// Pure functions and constants, no I/O, no Math.random: every choice is a hash of (seed, unit, figure), so the same time gives the same pixels (scrub purity, Q12).
//
// What the record holds and what it does not (Law cl.3, cl.4, cl.7; every number below carries its tier and its basis):
//  * HORSES PER MAN. No regimental mounted strength is in the repository. Three observations of the kit data (kit/cavalry_units.json `horses`, `strengths`) bound the share of men who had a serviceable horse:
//    10th NY 303 serviceable of 460 men, an 8th NY company 43 horses for 56 men, 6th US about 500 serviceable of about 1,072 assigned. They give a RANGE for the share of a unit's men that were mounted; the
//    figure drawn is the upper end, one horse per drawn trooper (Law cl.1: soldiers and horses one-to-one up to the strength figure; nothing is capped, nothing is removed), and the card carries the range.
//  * HORSE CASUALTIES. One regimental figure is in the position ledgers (6th US, OR27-1-R343 p.948: 290 men and 292 horses killed, wounded and missing, OCR digits, ocr_uncertain true). It is the only
//    observation of horses lost per man lost: ratio 1.007. The picture takes one horse down with each fallen trooper at that ratio (capped at 1); the bounds are 0 (a man hit, his horse not) and 1.007.
//    A horse killed under an unhurt rider, and a horse lost with a missing man, are not drawn (open gap EG-CAV-02).
//  * DISMOUNTED CAVALRY. The Official Records print the fact and, for four regiments, the share. The rule that one man in four holds the horses is the plan's (PDF B.2 July 1, kit behaviour state
//    horse_holding): plausible-procedural, no manual page acquired (G-ANIM-08). How far behind the line the led horses stand is a model parameter with no source (plausible-procedural).
//  * GAITS: gaits.mjs (DD-10 Wheeler 1863). The charge schedule is gaits.mjs CHARGE_SCHEDULE.
import { hash4, strId } from '../../../sim/rng.mjs';

export const TIER = 'plausible-procedural';
const U = 4294967296;

// ---- observations (kit/cavalry_units.json; the kit's own tier, claim support not verified: claim_support_verified false on every source key)
export const HORSE_OBSERVATIONS = [
  { id: 'CH-10NY', what: '10th New York Cavalry: 303 serviceable and 191 unserviceable horses for 460 men', men: 460, serviceable: 303, unserviceable: 191, source_keys: ['HistoryNet-LackHorses'], tier: 'inferred', note: 'magazine source; kit tier documented, support not verified here, so carried as inferred' },
  { id: 'CH-8NY-CO', what: 'an 8th New York company: 56 men with 43 horses', men: 56, serviceable: 43, unserviceable: null, source_keys: ['HistoryNet-LackHorses'], tier: 'inferred', note: 'one company, one date unknown' },
  { id: 'CH-6US', what: '6th US Cavalry: about 500 serviceable horses of about 1,072 men assigned on June 5', men: 1072, serviceable: 500, unserviceable: null, source_keys: ['RegCav-6thUS'], tier: 'inferred', weak_source: true, note: 'blog source (weak): lead only, carried as an observation inside a range, never as a count' },
];
export const MOUNTED_SHARE = (() => { const v = HORSE_OBSERVATIONS.map(o => o.serviceable / o.men); return { min: Math.min(...v), max: 1, observed_max: Math.max(...v), observed: HORSE_OBSERVATIONS.map(o => [o.id, o.serviceable / o.men]), tier: TIER,
  basis: 'range of the share of men with a serviceable horse: the lowest of three observed shares (' + HORSE_OBSERVATIONS.map(o => o.id + ' ' + (o.serviceable / o.men).toFixed(2)).join(', ') + ') up to one horse for every man. The figure drawn is the upper end: one horse per drawn trooper.' }; })();

// the horses of a unit of n drawn troopers: a range with its basis; `point` (what is drawn) is n
export function horseRange(n) {
  const min = Math.min(n, Math.ceil(n * MOUNTED_SHARE.min));
  return { riders: n, horses: { min, max: n, point: n }, tier: TIER, weak_source: true, basis: MOUNTED_SHARE.basis, gap: 'EG-CAV-01' };
}

// ---- horse casualties
export const HORSE_LOSS = {
  observation: { id: 'CH-6US-OR', unit: 'us-cav-1d-merritt-6us', cite: 'OR Ser.I vol.27 pt.1, OR27-1-R343 Lieut. Nicholas Nolan, p. 948 (ledger claim POS-A-CV1-033, note)', men: 290, horses: 292, ocr_uncertain: true, tier: 'documented', weak_source: false,
    note: 'killed, wounded and missing, printed "290" with OCR digits; the only regimental horse figure in the position ledgers' },
  perMan: { min: 0, max: 292 / 290, point: 1, tier: TIER, gap: 'EG-CAV-02',
    basis: 'horses down per man down: bounds 0 (a man hit, the horse not: logical bound) and 292/290 (the single observation); the picture takes one horse down with each fallen trooper (the observation capped at 1)' },
};
// horses down for a range of men down (killed or wounded): the card's range; the picture uses point
export function horseLossRange(down) { return { min: Math.round(down.min * HORSE_LOSS.perMan.min), max: Math.ceil(down.max * HORSE_LOSS.perMan.max), point: Math.round(down.point * HORSE_LOSS.perMan.point), tier: TIER, basis: HORSE_LOSS.perMan.basis, gap: HORSE_LOSS.perMan.gap }; }
// does the horse of figure k of a unit go down with its rider? A hash of (seed, unit, figure) below `p`
export function horseDownWithRider(unitId, k, seed = 1863, p = HORSE_LOSS.perMan.point) { return p >= 1 ? true : p <= 0 ? false : hash4(seed >>> 0, strId(unitId) >>> 0, k >>> 0, 31) / U < p; }

// ---- dismounted cavalry
export const HOLDER = { group: 4, tier: TIER, source: 'PDF B.2 July 1 (every fourth man holds horses); kit/cavalry_units.json behaviour_states horse_holding', gap: 'G-ANIM-08 / EG-CAV-03',
  basis: 'one man in four holds the horses of the four (his own and the three comrades who fight); no cavalry manual page acquired' };
export const LED = { back_m: 12, led_s: 7, tier: TIER, gap: 'EG-CAV-03', basis: 'a model parameter with no source: the led horses stand 12 m behind the line (the carbine fire line is not documented to a distance) and are led there at a walk of about 1.7 m/s (the Wheeler walk, gaits.mjs), 7 s' };
// where dismounted fights are printed (history/positions ledgers A, D, E: OR27-1 reports and two regimental histories). share = the fraction of the regiment dismounted as the passage states it; share_rule where the passage
// names a number of squadrons: companies_per_squadron is an assumption (plausible-procedural, EG-CAV-04), the company count is the kit's `companies_printed`. share null: the passage gives no fraction (open gap, no unit is drawn dismounted on it).
export const DISMOUNTS = [
  { id: 'DM-GAMBLE-JUL1', units: ['us-cav-1d-gamble-8ny', 'us-cav-1d-gamble-3in', 'us-cav-1d-gamble-12il'], share: 0.5, share_tier: 'documented', from: '1863-07-01T12:00', to: '1863-07-01T19:00', when_basis: 'the afternoon of July 1 (printed "in the afternoon"; the hours are the convention of the engagement clause)',
    claims: ['POS-A-CV1-020', 'POS-A-EXT-013', 'POS-A-RG2-006'], cite: 'OR27-1-R338 Col. William Gamble, p. 934: "Half of the Eighth New York, Third Indiana, and Twelfth Illinois were dismounted"', tier: 'documented' },
  { id: 'DM-DEVIN-6NY-JUL1', units: ['us-cav-1d-devin-6ny'], share: null, share_rule: { squadrons: 1, kit_companies: 6, companies_per_squadron: 2 }, share_tier: TIER, from: '1863-07-01T08:00', to: '1863-07-01T12:00', when_basis: 'the forenoon of July 1',
    claims: ['POS-A-EXT-012'], cite: 'OR27-1-R339 Col. Thomas C. Devin, p. 938: "a squadron of the Sixth New York to the front and left as skirmishers" (6 companies printed by the kit; two companies to the squadron is assumed)', tier: 'documented' },
  { id: 'DM-DEVIN-9NY-JUL1', units: ['us-cav-1d-devin-9ny'], share: null, share_tier: 'open gap', from: '1863-07-01T08:00', to: '1863-07-01T13:00', when_basis: 'the forenoon of July 1', claims: ['POS-A-EXT-011'], cite: 'OR27-1-R339 Devin p. 939: "dismounting the rest of his available force" (no fraction printed)', tier: 'documented' },
  { id: 'DM-MCINTOSH-3PA-JUL3', units: ['us-cav-2d-mcintosh-3pa'], share: 1, share_tier: 'inferred', from: '1863-07-03T12:00', to: '1863-07-03T21:00', when_basis: 'the afternoon of July 3 until nightfall (printed)', claims: ['POS-A-EXT-016', 'POS-A-CV2-010'],
    cite: 'OR27-1-R344 Brig. Gen. David McM. Gregg, p. 956: "the Third Pennsylvania Cavalry deployed as dismounted skirmishers" (no fraction printed; the whole regiment is the reading of the sentence)', tier: 'documented' },
  { id: 'DM-CUSTER-5MI-JUL3', units: ['us-cav-3d-custer-5mi'], share: 1, share_tier: 'inferred', from: '1863-07-03T10:00', to: '1863-07-03T16:00', when_basis: 'July 3 from 10 a.m.', claims: ['POS-A-CV2-043', 'POS-E-US-CAV-3D-CUSTER-5MI-004'],
    cite: 'OR27-1-R361 Brig. Gen. Custer, p. 998: the Fifth Michigan "dismounted on the left of the brigade" (no fraction printed)', tier: 'documented' },
  { id: 'DM-CUSTER-7MI-JUL2', units: ['us-cav-3d-custer-7mi'], share: null, share_rule: { all_but_squadrons: 1, kit_companies: 10, companies_per_squadron: 2 }, share_tier: TIER, from: '1863-07-02T16:00', to: '1863-07-02T22:00', when_basis: 'the engagement at Hunterstown, July 2 (the hour is not printed)',
    claims: ['POS-A-CV2-044-s2'], cite: 'OR27-1-R361 Custer p. 1000: the Seventh Michigan "excepting one squadron, was advanced as dismounted skirmishers" (10 companies printed by the kit; two to the squadron assumed)', tier: 'documented' },
  { id: 'DM-CUSTER-6MI-JUL2', units: ['us-cav-3d-custer-6mi'], share: null, share_tier: 'open gap', from: '1863-07-02T16:00', to: '1863-07-02T22:00', when_basis: 'Hunterstown, July 2', claims: ['POS-E-US-CAV-3D-CUSTER-6MI-005'],
    cite: 'Michigan at Gettysburg (1889) p. 139-142: "two squadrons dismounted" (a regimental history; the company count of the regiment is not in the kit)', tier: 'documented' },
  { id: 'DM-FARNSWORTH-1VT-JUL3', units: ['us-cav-3d-farnsworth-1vt'], share: null, share_tier: 'open gap', from: '1863-07-03T12:00', to: '1863-07-03T17:00', when_basis: 'July 3 before the charge at 5 p.m.', claims: ['POS-A-CV2-039'],
    cite: 'OR27-1-R365 Lieut. Col. Preston p. 1013: Companies A, D, E and I dismounted as skirmishers (the regiment\'s company count is not in the kit; OCR uncertain)', tier: 'documented' },
  { id: 'DM-JENKINS-JUL3', units: ['cs-cav-jenkins'], share: 1, share_tier: 'inferred', from: '1863-07-03T10:00', to: '1863-07-03T16:00', when_basis: 'July 3 until the rounds were spent', claims: ['PD-cav-jenkins-01'],
    cite: 'Stuart\'s report (ledger D PD-cav-jenkins-01, OCR uncertain): Jenkins\' brigade "fought dismounted until the rounds were spent"', tier: 'documented' },
];
const isoMin = s => { const [d, t] = s.split('T'), [y, m, dd] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number); const days = { 6: 0, 7: 30, 8: 61 }[m] + dd - 1; void y; return days * 1440 + h * 60 + mi; };
export const matches = (pattern, id) => id === pattern || id.startsWith(pattern + '-');
// the dismount record of a unit (or of a formation above it, by id prefix), or null
export function dismountRecord(unitId) { for (const r of DISMOUNTS) for (const p of r.units) if (matches(p, unitId)) return r; return null; }
// the share of the unit that is dismounted under a record: a printed fraction, or the rule over the kit's company count; null = open gap
export function dismountShare(rec, companies = null) {
  if (!rec) return null; if (rec.share != null) return rec.share; const r = rec.share_rule; if (!r) return null;
  const nCo = companies ?? r.kit_companies; if (!nCo) return null; const sq = Math.max(1, Math.round(nCo / r.companies_per_squadron));
  if (r.squadrons) return Math.min(1, r.squadrons / sq); if (r.all_but_squadrons) return Math.max(0, (sq - r.all_but_squadrons) / sq); return null;
}
// the dismounted fights of a unit in minutes since June 1 00:00: the intersection of the record's date range with the unit's engagement windows [{from, to}] (minutes). A unit with no window has none (no hour of the fight is
// invented; the record's own range is only the filter, EG-CAV-04)
export function dismountWindows(rec, windows) {
  if (!rec || !windows) return []; const a = isoMin(rec.from), b = isoMin(rec.to), out = [];
  for (const w of windows) { const f = Math.max(a, w.from), t = Math.min(b, w.to); if (t > f) out.push({ from: f, to: t, record: rec.id }); }
  return out;
}
// counts of a unit of n men with a dismounted share: D dismounted, H = floor(D / 4) holders, D - H fighters, n - D left mounted
export function dismountCounts(n, share) { const D = Math.max(0, Math.min(n, Math.round(n * share))), H = Math.floor(D / HOLDER.group); return { n, dismounted: D, holders: H, fighters: D - H, mounted: n - D }; }
// roles: 0 mounted, 1 fights afoot, 2 holds horses. Which men dismount is a rank by hash of (seed, unit, figure), so it does not move with the time; holders are every fourth dismounted man in that rank
export function mountRoles(unitId, n, share, seed = 1863) {
  const c = dismountCounts(n, share), key = new Float64Array(n), idx = new Int32Array(n), roles = new Uint8Array(n), u = strId(unitId) >>> 0;
  for (let k = 0; k < n; k++) { key[k] = hash4(seed >>> 0, u, k >>> 0, 32); idx[k] = k; }
  idx.sort((a, b) => key[a] - key[b] || a - b);
  for (let r = 0; r < c.dismounted; r++) roles[idx[r]] = (r % HOLDER.group === HOLDER.group - 1) ? 2 : 1;
  const holders = roles.reduce((s, x) => s + (x === 2 ? 1 : 0), 0); if (holders !== c.holders) throw new Error('mountRoles: holder count ' + holders + ' != ' + c.holders);
  return roles;
}

// ---- gaps registered by this module (proposed-register entries are written by tools/build-cavalry-horses.mjs)
export const GAPS = [
  { id: 'EG-CAV-01', title: 'Mounted strength of every cavalry regiment (horses per man)', tier: 'plausible-procedural', text: 'No regimental present-for-duty or mounted strength is in the record (Busey and Martin print-only; kit strengths_note). Three weak observations bound the share of men with a serviceable horse from 0.47 to 0.77; the range card shows that share up to one horse per man and the picture draws one horse per drawn trooper.' },
  { id: 'EG-CAV-02', title: 'Horse casualties of cavalry', tier: 'plausible-procedural', text: 'One regimental horse figure is printed in the ledgers (6th US, 292 horses with 290 men, OCR digits). Horses killed under unhurt riders, horses lost with missing men, wounded horses led off and horse losses of the other regiments are not in the record and are not drawn; the time of each loss is the time of the rider\'s fall.' },
  { id: 'EG-CAV-03', title: 'Led horses and horse-holders: distance and handling', tier: 'plausible-procedural', text: 'One man in four holds the horses is the plan\'s statement (no cavalry manual page acquired, G-ANIM-08); the 12 m back and the 7 s to lead them there are model parameters. The sources acquired give no distance.' },
  { id: 'EG-CAV-04', title: 'Dismounted shares: squadron arithmetic and unstated fractions', tier: 'plausible-procedural', text: 'Where the report names squadrons the share rests on two companies to the squadron (not printed in any acquired text) and the kit\'s company count; where it names companies without a total (1st Vermont), a number of squadrons without a company count (6th Michigan) or says only "the rest" (9th New York) no fraction exists and the unit is drawn mounted with this gap listed. The hours of a fight are the engagement windows of the timeline rows (seeded_unverified).' },
  { id: 'EG-CAV-05', title: 'Spare, remount, pack and officers\' horses of cavalry', tier: 'open gap', text: 'No acquired source gives spare or led horses of a cavalry regiment beyond the horses of the dismounted men (the artillery case, ws6-EG-05, rests on one forum quote). Remounts (about 17,000 to the Cavalry Corps May-July 1863, HistoryNet) are an aggregate, not a unit figure. No spare horse is drawn.' },
  { id: 'EG-CAV-06', title: 'The mounted charge: path and full-speed pace', tier: 'plausible-procedural', text: 'The charge clauses of the layer (AC-12, the Jul 3 15:00 attack of the 3rd Division) carry no path, so a charging unit has no ground speed and stands. The manual\'s schedule (Wheeler paras 292, 410-411: walk 20, trot 60, gallop 80, charge 60 paces) is data in gaits.mjs; the speed of the last pace ("nearly full speed", para 189) has no printed number. A unit whose path runs faster than the Wheeler gallop plays the gallop clip.' },
  { id: 'EG-CAV-07', title: 'Cavalry that the layer does not draw', tier: 'open gap', text: 'Of the 72 cavalry units of the order of battle, the real layer draws the 5 regiments of the Reserve Brigade, the 5 of McIntosh, the 4 of J. I. Gregg\'s, 6 of Hampton\'s and the 35th Virginia Battalion; Gamble\'s and Devin\'s regiments, Custer\'s Michigan Brigade, Farnsworth\'s brigade and the rest of Stuart\'s command have no road of approach or place in the ledgers and are drawn with 0 figures. This is the history layer\'s open gap, not narrowed here.' },
  { id: 'EG-CAV-08', title: 'Draught-horse losses of the batteries: times', tier: 'plausible-procedural', text: 'Counts are printed for six batteries (kit losses: 15th NY 25 killed or wounded, 1st NY B 13 disabled, 1st RI B 24 killed and 6 disabled, 4th NY 11, 13th NY 12, 2nd US A 13); no time is printed. Each loss is placed by the counter-based RNG inside the battery\'s engagement windows. 2nd US A (Calef, horse artillery) is not a drawn leaf unit of the layer.' },
];
