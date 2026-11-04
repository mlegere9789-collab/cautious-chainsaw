// Mounted gaits: which horse/rider gait clip a ground speed selects, and at what cadence it plays (closes the documentable part of G-ANIM-07, EG-ANIM-07).
//
// BEFORE: the clips' speeds (clips-cavalry.mjs HORSE_GAITS: walk 1.55, trot 3.60, canter 5.60, gallop 8.30 m/s) are modern equestrian ranges, and three places (unit-anim.mjs _mounted, index.mjs
// _marchEvents and the hoofbeat event) each hard-coded the thresholds 2.4 / 4.6 / 7.0 m/s. A mounted segment played the clip at its own cadence whatever the unit's speed.
// NOW: the 1860s manuals print the speeds of the paces of manoeuvre. They are data here (GAIT_SOURCES, every figure with its source, page and tier). The sources DISAGREE (Wheeler 1863 CS: gallop 10 mph; Cooper
// 1861: 11 mph; Instruction for Field Artillery 1863: a horse gallops 400 yards in a minute = 13.6 mph), so per Law (conflicts are scenarios, no default is picked by this module) each source is a selectable
// BASIS. The basis 'modern_range' is the behaviour that existed before this module and stays the default until the owner decides (proposed DEC-ANIM-04, PENDING OWNER).
//
// What is documented and what is not:
//  * documented: the speed of the walk, trot and gallop of MANOEUVRE (tier documented, source named per basis); the schedule of a squadron charge in paces (Wheeler paras 292, 410, 411).
//  * plausible-procedural (G-ANIM-07 remains for these): the speed of the full-speed charge ("quicken the gallop to nearly full speed", Wheeler para 189: no number); the mapping of the manual's three paces
//    onto the four clips (the manual has no canter: the clip whose own speed is nearest to the manual's gallop is the 'canter' clip, 5.6 m/s, so the manual gallop plays the canter clip and only a speed above
//    the documented gallop by more than GALLOP_MARGIN plays the 'gallop' clip); the cadence factor that makes the hoof stance meet the ground at the unit's speed.
//  * horse-artillery gaits: the same Instruction gives the horse's rates (it does not distinguish horse from foot batteries); no separate horse-artillery rate is printed there (see REPORT).
import { HORSE_GAITS } from './clips-cavalry.mjs';

export const GAIT_NAMES = ['walk', 'trot', 'canter', 'gallop'];
export const MILE_M = 1609.344, YARD_M = 0.9144;
const MPH = MILE_M / 3600;

// sources[]: each printed figure, with page and the passage it comes from (exact words of the printed figure only; the page is the PRINTED page number of the cited copy, see pages note)
export const GAIT_SOURCES = [
  { id: 'GS-WHEELER-1863', work: 'Wheeler, Joseph. A Revised System of Cavalry Tactics for the Use of the Cavalry and Mounted Infantry, C.S.A. Mobile: S. H. Goetzel & Co., 1863.', archive: 'archive.org/details/revisedsystemofc00whee',
    items: [
      { ref: 'Basis of Instruction, "Practice of Paces for Manoeuvre", p. 87', walk_mph: 3.75, trot_mph: 7.5, gallop_mph: 10, passage: 'walk 3 3/4 miles an hour, trot 7 1/2 miles an hour, gallop 10 miles an hour; a half mile to be walked in 8 minutes, trotted in 4, galloped in 3' },
      { ref: 'Squadron, Mounted, para 333 "To regulate the rapidity of the gaits", p. 177', mile_min: { walk: 16, trot: 8, gallop: 6 }, passage: 'the mile at a walk in sixteen minutes, at a trot in eight, at the gallop in six' } ],
    tier: 'documented', note: 'a Confederate manual of 1863 (the cavalry of the Army of Tennessee); paras 333 and the Basis of Instruction agree (3.75 / 7.5 / 10 mph)' },
  { id: 'GS-COOPER-1861', work: 'Cooper\'s Cavalry Tactics, for the Use of Volunteers; to which is added a Manual for Colt\'s Revolver. New Orleans and Jackson, Miss.: 1861 (Confederate publication of the Cooke system).', archive: 'archive.org/details/cooperscavalryta01coop',
    items: [{ ref: 'Definitions, "Paces", p. 7', walk_mph: [3.5, 4], trot_mph: 8.5, gallop_mph: 11, passage: 'the walk three and a half to four miles an hour, the trot eight miles and a half an hour, the gallop eleven miles an hour (OCR reads "three and a h ilf")' }],
    tier: 'documented', note: 'the same page says the gallop is not considered applicable to general manoeuvre, and that the pace is reckoned at one yard' },
  { id: 'GS-FA-1863', work: 'Instruction for Field Artillery. Prepared by a Board of Artillery Officers. Washington: Government Printing Office, 1863 (War Department order of March 1, 1863).', archive: 'archive.org/details/cu31924030759330 (acquired copy; cross-checked in instructionforf01deptgoog, whose pagination differs: pp. 28 and 31)',
    items: [
      { ref: 'Pointing and Ranges, p. 42 (para on the charge of cavalry against a battery)', yards_per_phase: [{ yd: 400, min: 4.5, gait: 'walk approaching a gentle trot' }, { yd: 400, min: 2.0, gait: 'round trot ("a little more than two minutes")' }, { yd: 200, min: 0.5, gait: 'gallop ("about half a minute")' }], passage: 'cavalry 1,000 yards from the battery: first 400 yards at a walk approaching a gentle trot in about four and a half minutes; next 400 at a round trot in a little more than two minutes; last 200 at a gallop in about half a minute; about seven minutes in all' },
      { ref: 'Management of a Battery, Art. Fourth, p. 47', yd400_min: { walk: 4.5, trot: 2, gallop: 1 }, passage: 'A horse travels the distance of 400 yards at a walk in 4 1/2 minutes; at a trot in 2 minutes; at a gallop in 1 minute' } ],
    tier: 'documented', note: 'the one statement at p. 47 gives the three paces as horse speeds; p. 42 is an estimate of an enemy charge (rounded times)' },
  { id: 'GS-CAV-1841', work: 'Cavalry Tactics (United States War Department, Second Part, School of the Trooper, of the Platoon and of the Squadron, Mounted), Washington: J. and G. S. Gideon, 1841 (superseded by Cooke\'s system, War Department notice 1 Nov 1861).', archive: 'archive.org/details/cavalrytactics00deptgoog',
    items: [{ ref: 'para 600 "To regulate the rapidity of the gaits", p. 196', walk_paces_per_min: [100, 110], trot_paces_per_min: [200, 230], passage: 'at the walk from 100 to 110 paces per minute, at the trot from 200 to 230 per minute; the figure for the gallop is cut off in the OCR ("about 300")' }],
    tier: 'inferred', note: 'an older edition (OCR damaged); NOT used as a basis, kept as corroboration of the Wheeler and Cooper walk and trot (paces taken as yards after Cooper p. 7)' },
];

// speeds in m/s computed from the printed figures (a basis lists walk, trot, gallop; the clip selection rules are below)
const mph = v => v * MPH;
const yd400 = min => 400 * YARD_M / (min * 60);
export const GAIT_BASES = {
  modern_range: { id: 'modern_range', label: 'modern equestrian ranges (the behaviour before this module)', tier: 'plausible-procedural', src: [], gap: 'G-ANIM-07', speeds: null, bounds: [2.4, 4.6, 7.0], scaleCadence: false },
  wheeler_1863: { id: 'wheeler_1863', label: 'Wheeler, Revised System of Cavalry Tactics, C.S.A., 1863', tier: 'documented', src: ['GS-WHEELER-1863'], speeds: { walk: mph(3.75), trot: mph(7.5), gallop: mph(10) } },
  cooper_1861: { id: 'cooper_1861', label: 'Cooper\'s Cavalry Tactics, 1861 (walk taken at the middle of 3.5 to 4 mph)', tier: 'documented', src: ['GS-COOPER-1861'], speeds: { walk: mph(3.75), trot: mph(8.5), gallop: mph(11) } },
  fa_1863: { id: 'fa_1863', label: 'Instruction for Field Artillery, 1863 (horse: 400 yd in 4.5 / 2 / 1 minute)', tier: 'documented', src: ['GS-FA-1863'], speeds: { walk: yd400(4.5), trot: yd400(2), gallop: yd400(1) } },
};
export const GALLOP_MARGIN = 1.15;                    // plausible-procedural: above the documented gallop x this the 'gallop' clip (full speed charge) plays instead of the 'canter' clip that stands for the manual's gallop
export const CADENCE_CLAMP = [0.75, 1.3];             // plausible-procedural: the clip's cadence is scaled by speed / clip speed within these limits (hooves stay on the ground; the clip is not played absurdly fast or slow)

// compiled basis: bounds[0..2] (walk|trot, trot|canter, canter|gallop) in m/s and the flag that the cadence follows the speed
const compiled = new Map();
export function gaitBasis(id = 'modern_range') {
  let b = compiled.get(id); if (b) return b;
  const B = GAIT_BASES[id]; if (!B) throw new Error('unknown gait basis ' + id + ' (have ' + Object.keys(GAIT_BASES).join(', ') + ')');
  let bounds = B.bounds, scale = !!B.speeds;
  if (B.speeds) { const s = B.speeds; bounds = [(s.walk + s.trot) / 2, (s.trot + s.gallop) / 2, s.gallop * GALLOP_MARGIN]; }
  const ok = bounds[0] < bounds[1] && bounds[1] < bounds[2];
  if (!ok) throw new Error('gait basis ' + id + ' has non-increasing bounds');
  b = Object.freeze({ id, B, b0: bounds[0], b1: bounds[1], b2: bounds[2], scale, cs: Float64Array.from(GAIT_NAMES.map(g => HORSE_GAITS[g].speed)) }); compiled.set(id, b); return b;
}
// gait index 0 walk, 1 trot, 2 canter, 3 gallop of a ground speed (m/s) under a compiled basis. No allocation.
export function mountedGait(b, sp) { return sp < b.b0 ? 0 : sp < b.b1 ? 1 : sp < b.b2 ? 2 : 3; }
// cadence factor of the gait clip: 1 for the modern basis (the clip plays at its own cadence, as before); otherwise speed / clip speed within CADENCE_CLAMP
export function mountedRate(b, gi, sp) { if (!b.scale) return 1; const r = sp / b.cs[gi]; return r < CADENCE_CLAMP[0] ? CADENCE_CLAMP[0] : r > CADENCE_CLAMP[1] ? CADENCE_CLAMP[1] : r; }

// the squadron charge of the manual in metres: walk 20 paces, trot 60, gallop 80, charge 60 (Wheeler para 411, p. 210-211; the platoon charge, para 292, is the same schedule); pace = 1 yard (Cooper p. 7)
export const CHARGE_SCHEDULE = { src: 'GS-WHEELER-1863 paras 292, 410-411', tier: 'documented', phases: [{ gait: 'walk', paces: 20 }, { gait: 'trot', paces: 60 }, { gait: 'gallop', paces: 80 }, { gait: 'charge', paces: 60 }], totalPaces: 220, totalM: 220 * YARD_M,
  note: 'the pace of the charge ("quicken the gallop to nearly full speed", para 189) has no printed speed; the horses must not be fatigued, "it should be as short as possible" (p. 210)' };

// the table written to data/anim3d/gait-sources.json (build-anim3d.mjs)
export function gaitTable() {
  const bases = {}; for (const [id, B] of Object.entries(GAIT_BASES)) { const b = gaitBasis(id), cl = {};
    GAIT_NAMES.forEach((g, i) => { cl[g] = { clipSpeed_ms: HORSE_GAITS[g].speed, cadenceAt_ms: B.speeds ? (g === 'gallop' ? b.b2 : B.speeds[g === 'canter' ? 'gallop' : g]) : null, cadenceFactor: B.speeds ? mountedRate(b, i, g === 'gallop' ? b.b2 : B.speeds[g === 'canter' ? 'gallop' : g]) : 1 }; });
    bases[id] = { label: B.label, tier: B.tier, src: B.src, speeds_ms: B.speeds, bounds_ms: [b.b0, b.b1, b.b2], scaleCadence: b.scale, clips: cl }; }
  return { schema: 'anim3d-gait-sources-1', note: 'Printed speeds of the paces of manoeuvre. The sources disagree; each is a selectable basis (AnimSystem option gaitBasis). The default stays modern_range until the owner decides (PENDING OWNER).', default: 'modern_range',
    gallopMargin: GALLOP_MARGIN, cadenceClamp: CADENCE_CLAMP, mapping: 'manual walk -> clip walk; manual trot -> clip trot; manual gallop -> clip canter (nearest clip speed); a speed above gallop x gallopMargin -> clip gallop (full-speed charge, no printed speed)',
    sources: GAIT_SOURCES, bases, charge_schedule: CHARGE_SCHEDULE };
}
