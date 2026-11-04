// The drill timing tables the animation consumes: every number carries its source item ids (drill/drill_*.json, or the ANIM-* items re-found in the Hardee/Casey OCR by tests/anim3d.test.mjs) and its tier.
// Tier vocabulary (CLAUDE.md): documented = a primary manual states it; inferred = arithmetic or reading of documented figures; plausible-procedural = authored, declared range, registered gap.
// NOTHING here is an invented historical rate: where the manuals give only a training standard or nothing, the table carries a RANGE with `basis` and the gap id (GAPS below).
export const INCH = 0.0254, YARD = 0.9144;

// ---- marching (ordered march). Hardee 1861 School of the Soldier Part I (H.S.S.) and Casey 1862 (C.S.S.), Lesson III/IV "principles of the direct step / double quick step".
// NOTE on the brief's "90 steps/min of 28 in. quick time": the manuals print 90 steps/min for COMMON time; QUICK time is 110 steps/min (same 28 in. step); route step is 110 as well.
export const MARCH = {
  common_time: { stepsPerMin: 90, stepIn: 28, tier: 'documented', src: ['ANIM-H94', 'ANIM-C101'], note: 'common time (drill-ground cadence for recruits and the manual of arms)' },
  quick_time: { stepsPerMin: 110, stepIn: 28, tier: 'documented', src: ['ANIM-H102', 'ANIM-C109'], note: 'same step length as common time; 110 a minute' },
  route_step: { stepsPerMin: 110, stepIn: 28, tier: 'documented', src: ['ANIM-H306'], note: 'swiftness of the route step 110 a minute "habitually maintained in columns in route"; the step length is not restated (28 in. of the direct step assumed: inferred)', stepTier: 'inferred' },
  double_quick: { stepsPerMin: 165, stepIn: 33, tier: 'documented', src: ['ANIM-H104', 'ANIM-C111'], note: '33 in. at 165 a minute' },
  double_quick_urgent: { stepsPerMin: 180, stepIn: 33, tier: 'documented', src: ['ANIM-H114'], note: '"under urgent circumstances" the cadence may be increased to 180; 4,000 yards in about 25 minutes (Hardee)', stepTier: 'inferred' },
  backward: { stepsPerMin: 110, stepIn: 14, tier: 'documented', src: ['ANIM-H247'], note: 'march backwards: 14 in. heel to heel, always in quick time (paras 246-248)', cadenceTier: 'inferred' },
  // the run: the manuals say only "a greater degree of swiftness" (H.S.S. para 116): range, plausible-procedural
  run: { stepsPerMin: [190, 230], stepIn: [36, 44], tier: 'plausible-procedural', src: ['ANIM-H116'], gap: 'G-ANIM-06', note: 'H.S.S. para 116: the run follows the principles of the double quick, "a greater degree of swiftness"; no rate or step is printed' },
};
// ---- wheeling and mark time (kept apart from MARCH: the unit state machine selects gaits from MARCH only)
export const WHEEL = {
  // (Hardee School of the Soldier, Part III, paras 380-384): the pivot man turns in his place (marks time) at a halt and takes steps of 9 (quick) or 11 inches (double quick) in a wheel in marching; the man on the wheeling flank takes the full
  // 28 or 33 inch step; the men between take steps in proportion to their distance from the pivot (the proportion is an inference from the geometry of a rank turning about the pivot, tier inferred)
  mark_time: { stepsPerMin: 110, stepIn: 0, tier: 'documented', src: ['ANIM-H380', 'ANIM-H384'], note: 'the pivot man at a wheel from a halt "only turns in his place" and "will merely mark time"; the cadence of the rank is the quick time 110' },
  wheel_pivot_quick: { stepsPerMin: 110, stepIn: 9, tier: 'documented', src: ['ANIM-H381'], note: 'in a wheel in marching the pivot takes steps of nine inches in quick time' },
  wheel_pivot_dq: { stepsPerMin: 165, stepIn: 11, tier: 'documented', src: ['ANIM-H381'], note: 'eleven inches in double quick time' },
  wheel_mid25_quick: { stepsPerMin: 110, stepIn: 13.75, tier: 'inferred', src: ['ANIM-H381', 'ANIM-H382'], note: 'a quarter of the way from the pivot to the wheeling flank: 9 + 0.25 x (28 - 9) inches' },
  wheel_mid50_quick: { stepsPerMin: 110, stepIn: 18.5, tier: 'inferred', src: ['ANIM-H381', 'ANIM-H382'], note: 'half way: 9 + 0.5 x (28 - 9) inches' },
  wheel_mid75_quick: { stepsPerMin: 110, stepIn: 23.25, tier: 'inferred', src: ['ANIM-H381', 'ANIM-H382'], note: 'three quarters of the way: 9 + 0.75 x (28 - 9) inches' },
  wheel_flank_quick: { stepsPerMin: 110, stepIn: 28, tier: 'documented', src: ['ANIM-H382'], note: '"will take the full step of twenty-eight inches"' },
  wheel_flank_dq: { stepsPerMin: 165, stepIn: 33, tier: 'documented', src: ['ANIM-H382'], note: 'the full step of thirty-three inches in double quick time' },
};
export const stepM = g => (Array.isArray(g.stepIn) ? (g.stepIn[0] + g.stepIn[1]) / 2 : g.stepIn) * INCH;
export const stepsPerMin = g => (Array.isArray(g.stepsPerMin) ? (g.stepsPerMin[0] + g.stepsPerMin[1]) / 2 : g.stepsPerMin);
export const speedOf = g => stepM(g) * stepsPerMin(g) / 60;                  // m/s
// cross-check printed in Hardee para 114: 180 a minute, 4,000 yards in about 25 minutes
export const HARDEE_4000YD = { yards: 4000, minutes: 25, stepsPerMin: 180, src: 'ANIM-H114' };

// ---- the manual of arms: motions are timed at one ninetieth of a minute, except the cartridge, rammer and bayonet motions (H.S.S. paras 128-130, C.S.S. 135-137)
export const MOTION_S = 60 / 90;               // 0.6667 s, documented (INF-GEN-02, HAR-S01)
export const MOTION = { regulated_s: MOTION_S, exempt: 'cartridge, rammer and (un)fixing-bayonet motions have no fixed cadence', src: ['INF-GEN-02', 'INF-GEN-03', 'HAR-S01'], tier: 'documented' };

// ---- Load in nine times (H.S.S. paras 156-170, C.S.S. 163-177). motions = number of motions of the time; regulated = the 1/90-minute cadence applies (the time is not a cartridge or rammer time);
// w = relative weight of an EXEMPT motion inside the loading time (plausible-procedural; only the sum is fitted to the cycle length), cite = drill items.
export const LOAD9 = [
  { i: 1, id: 'load', name: 'Load', motions: 1, regulated: true, src: ['INF-L9-01', 'HAR-S02'], tier: 'documented' },
  { i: 2, id: 'handle_cartridge', name: 'Handle cartridge', motions: 1, regulated: false, w: [0.9], src: ['INF-L9-02', 'HAR-S03'], tier: 'documented' },
  { i: 3, id: 'tear_cartridge', name: 'Tear cartridge', motions: 1, regulated: false, w: [1.1], src: ['INF-L9-03', 'HAR-S04'], tier: 'documented' },
  { i: 4, id: 'charge_cartridge', name: 'Charge cartridge', motions: 1, regulated: false, w: [2.0], src: ['INF-L9-04', 'HAR-S05'], tier: 'documented' },
  { i: 5, id: 'draw_rammer', name: 'Draw rammer', motions: 3, regulated: false, w: [0.9, 0.9, 0.9], src: ['INF-L9-05', 'HAR-S06'], tier: 'documented' },
  { i: 6, id: 'ram_cartridge', name: 'Ram cartridge', motions: 1, regulated: false, w: [1.6], src: ['INF-L9-06', 'HAR-S07'], tier: 'documented' },
  { i: 7, id: 'return_rammer', name: 'Return rammer', motions: 3, regulated: false, w: [0.9, 0.9, 0.9], src: ['INF-L9-07', 'HAR-S08'], tier: 'documented' },
  { i: 8, id: 'prime', name: 'Prime', motions: 2, regulated: true, src: ['INF-L9-08', 'HAR-S09'], tier: 'documented' },
  { i: 9, id: 'shoulder', name: 'Shoulder arms', motions: 2, regulated: true, src: ['INF-L9-09', 'HAR-S10'], tier: 'documented' },
];
export const FIRE_TIMES = { // the firing times that bracket the loading (H.S.S. paras 171-186): Ready 3 motions, Aim 1, Fire 1; after Fire, "Load" and the men "load and return at once to Ready" (HAR-S29)
  ready: { motions: 3, regulated: true, src: ['INF-FIRE-01', 'HAR-S12'], tier: 'documented' },
  aim: { motions: 1, regulated: true, src: ['INF-FIRE-02', 'HAR-S13'], tier: 'documented' },
  fire: { motions: 1, regulated: true, src: ['INF-FIRE-03', 'HAR-S14'], tier: 'documented' },
  pause_aim_fire: { s: [0.3, 1.2], tier: 'plausible-procedural', src: ['INF-COY-04', 'HAR-C09'], note: 'the instructors recommend "a short pause between Aim and Fire" (no length printed): range' },
};
export const LOAD9_MOTIONS = LOAD9.reduce((a, t) => a + t.motions, 0);                       // 15
export const LOAD9_REGULATED = LOAD9.filter(t => t.regulated).reduce((a, t) => a + t.motions, 0);   // 5
export const LOAD9_EXEMPT = LOAD9_MOTIONS - LOAD9_REGULATED;                                  // 10

// ---- rate of fire. cycleS = seconds per round per man (min, max, default basis). Training standard: "at least three rounds in a minute" (INF-RATE-01, HAR-C02) is a minimum standard of the school, not a
// combat rate; kit/weapons.json gives 2-3 rounds a minute for the rifle-musket (inferred: secondary sources). The real tempo of any unit at any minute is NOT documented (G-ANIM-01).
export const FIRE_RATE = {
  muzzle_loader_drill: { rpm: [3, 4], cycleS: [15, 20], tier: 'inferred', src: ['INF-RATE-01', 'HAR-C02'], basis: 'training standard "at least three rounds in a minute with ease and regularity" taken as the drill pace; 4 rpm = every regulated motion at 1/90 min and the 10 exempt motions at about 0.97 s: the plausible fastest drill cycle', gap: 'G-ANIM-01' },
  muzzle_loader_battle: { rpm: [2, 3], cycleS: [20, 30], tier: 'inferred', src: ['kit/weapons.json m1861_springfield rate_rounds_per_min'], basis: 'weapons.json 2-3 rounds a minute (weak sources: tier inferred); the PDF 2-3 rounds a minute is consistent', gap: 'G-ANIM-01' },
  breech_loader_sharps: { rpm: [8, 10], cycleS: [6, 7.5], tier: 'inferred', src: ['kit/weapons.json sharps_rifle_m1859 rate_rounds_per_min'], basis: 'weapons.json 8-10 a minute (weak source)', gap: 'G-ANIM-01' },
  repeater_spencer: { rpm: [14, 20], cycleS: [3, 4.3], tier: 'inferred', src: ['kit/weapons.json spencer_repeater wikipedia_rate_per_min'], basis: 'a Wikipedia rate in weapons.json (weak source), not a combat rate', gap: 'G-ANIM-01' },
  revolver: { rpm: [12, 24], cycleS: [2.5, 5], tier: 'plausible-procedural', src: [], basis: 'no rate in the acquired texts: range chosen so six shots take 15-30 s', gap: 'G-ANIM-01' },
  field_gun_solid: { rpm: [1, 2], cycleS: [30, 60], tier: 'documented', src: ['ART-GB-20', 'ART-GB-21', 'ART-FA-100'], basis: 'Gibbon: 30-40 s for a 6-pdr, 60 s for a 12-pdr, mean about one a minute, 2-3 when pressed; Light Artillery Board: 2 solid shot a minute "with sufficient deliberation for pointing"', gap: 'G-ANIM-01' },
  field_gun_canister: { rpm: [2, 3], cycleS: [20, 30], tier: 'documented', src: ['ART-FA-100', 'ART-GB-21'], basis: 'Light Artillery Board planning figure: 3 canisters a minute; Gibbon: 2-3 a minute when pressed', gap: 'G-ANIM-01' },
};

// ---- artillery: the detachment (ART-FA-01..): gunner + Nos. 1-8; the cycle Load (sponge, load, ram, point) - Ready (prick, insert tube) - Fire (ART-FA-12..17, 20-46, 50-55)
// Motion counts of "loading by detail" (ART-FA-15): Sponge 3 pauses / 4 motions, Ram 2 pauses / 3 motions. Relative lengths of the other steps are plausible-procedural.
export const GUN_STEPS = [
  { id: 'sponge', name: 'Sponge', w: 4, src: ['ART-FA-15', 'ART-FA-21'], tier: 'documented', note: 'motion count 4 (ART-FA-15); the relative length is the motion count' },
  { id: 'load', name: 'Load', w: 2.5, src: ['ART-FA-31', 'ART-FA-52'], tier: 'plausible-procedural', note: 'No. 2 receives the round from No. 5 and enters it; length authored' },
  { id: 'ram', name: 'Ram', w: 3, src: ['ART-FA-15', 'ART-FA-22'], tier: 'documented', note: 'motion count 3 (ART-FA-15)' },
  { id: 'point', name: 'Point', w: 5, src: ['ART-FA-12', 'ART-FA-13', 'ART-FA-41'], tier: 'plausible-procedural', note: 'the gunner points (traverse by handspike signal, elevating screw) while No. 3 shifts the trail; length authored' },
  { id: 'ready', name: 'Ready', w: 2.2, src: ['ART-FA-42', 'ART-FA-43'], tier: 'plausible-procedural', note: 'No. 3 pricks the cartridge, No. 4 inserts the friction primer and takes the lanyard' },
  { id: 'fire', name: 'Fire', w: 0.4, src: ['ART-FA-44'], tier: 'documented', note: 'No. 4 hauls the lanyard sharply' },
  { id: 'run_up', name: 'Run up', w: 2.4, src: ['ART-FA-14'], tier: 'plausible-procedural', note: 'after the shot the piece is run up to its former place "if necessary" (no recoil distance printed)' },
];
// positions of the detachment, piece unlimbered (para 95; metres in the piece frame: +z toward the muzzle, +x the piece's LEFT, origin on the axle line at the carriage centre; trackHalf = half the wheel track)
export const crewPosts = (trackHalf = 0.78, trailLen = 2.6, wheelR = 0.73) => {
  const out = 0.61 + 0.0; // 2 ft outside the wheels
  const yd = YARD;
  return {
    gunner: { x: 0, z: -trailLen, note: 'at the end of the trail handspike (ART-FA-02)', src: ['ART-FA-02'] },
    n1: { x: -(trackHalf + out), z: 0.0, note: 'right of the piece, about two feet outside the wheel, abreast the front part of the wheel (guns) (ART-FA-03)', src: ['ART-FA-03'] },
    n2: { x: +(trackHalf + out), z: 0.0, note: 'left side (ART-FA-03)', src: ['ART-FA-03'] },
    n3: { x: -(trackHalf + out), z: -1.15, note: 'right, in line with the knob of the cascable, covering No. 1 (ART-FA-04)', src: ['ART-FA-04'] },
    n4: { x: +(trackHalf + out), z: -1.15, note: 'left, covering No. 2 (ART-FA-04)', src: ['ART-FA-04'] },
    n5: { x: +(trackHalf + wheelR), z: -5 * yd, note: '5 yards behind the left wheel (ART-FA-05)', src: ['ART-FA-05'] },
    n6: { x: 0, z: -(trailLen + 6 * yd) + 0.7, note: 'behind the limber (at the limber chest) (ART-FA-06); limber pole end 6 yd from the trail handspike end (ART-FA-09)', src: ['ART-FA-06', 'ART-FA-09'] },
    n7: { x: 0.9, z: -(trailLen + 6 * yd) + 0.7, note: 'beside No. 6 on his left (ART-FA-06)', src: ['ART-FA-06'] },
    n8: { x: 0.9, z: -(trailLen + 6 * yd + 4 * yd), note: 'the chief of the caisson, 4 yards behind the limber on its left (ART-FA-07)', src: ['ART-FA-07'] },
    chief: { x: +(trackHalf + out + 1.1), z: -trailLen * 0.8, note: 'the chief of the piece opposite the middle of the trail, outside the left cannoneers (ART-FA-08)', src: ['ART-FA-08'] },
  };
};
// recoil: the drill text gives no distance (ART-FA-14); Gibbon's theoretical FREE recoil of a 12-pdr field gun is 17.4 ft (5.3 m; derived, ignores friction; ART-GB-23). The carriage run-out used is a plausible-procedural range.
export const RECOIL = { m: [0.9, 1.8], s_back: 0.28, s_hold: 0.15, upperBound_m: 17.4 * 0.3048, tier: 'plausible-procedural', src: ['ART-FA-14', 'ART-GB-23'], gap: 'G-ANIM-04', note: 'rig note: FIGURES models a 0.5-0.6 m run-out (modelled); this table keeps the wider range and the caller picks by the variation scalar' };

// ---- reaction delay of the men to a command (plausible-procedural; the 1/90-minute cadence starts "at the last syllable of the command", H.S.S. para 131, HAR-S01)
export const REACTION_S = { min: 0.2, max: 0.8, tier: 'plausible-procedural', src: ['HAR-S01'], gap: 'G-ANIM-02' };
// fire by file and by rank: the order in which files and ranks start (documented structure; the interval between files is plausible-procedural)
export const FILE_FIRE = { startInterval_s: [0.4, 1.4], tier: 'plausible-procedural', structure: 'documented', src: ['INF-FILE-01', 'INF-FILE-03', 'HAR-S31'], note: '"each next file aims as the previous file brings its pieces down to reload": the right-hand file begins, each next file aims when its neighbour lowers: the interval is about one motion of Ready/Aim; documented as a rule, the interval is not printed' };
export const RANK_FIRE = { structure: 'documented', src: ['INF-RANK-01', 'INF-RANK-02', 'INF-RANK-03', 'HAR-S32'], note: 'the rear rank fires first, then the front rank; the ranks alternate until "cease firing"' };

// ---- registered gaps of this area (see register/EG-ANIM-*.md)
export const GAPS = [
  { id: 'G-ANIM-01', title: 'Real rate and tempo of fire of a unit at a minute of the battle', tier: 'plausible-procedural', text: 'Only a training standard (3 rounds a minute), weapons.json rates (2-3, weak sources) and artillery planning rates exist. No unit-level fire tempo, volley synchrony or ammunition expenditure per minute is documented per regiment in the acquired texts.' },
  { id: 'G-ANIM-02', title: 'Officers\' actual commands and the men\'s reaction times', tier: 'plausible-procedural', text: 'The command vocabulary is documented (Hardee, Casey); which command was given when, and the delay between command and execution, are not.' },
  { id: 'G-ANIM-03', title: 'Misfire rates', tier: 'plausible-procedural', text: 'The misfire procedure is printed (INF-FIRE-06..08); no rate is in any acquired text. The system emits no misfire unless a scenario sets a rate.' },
  { id: 'G-ANIM-04', title: 'Recoil distance of a field piece', tier: 'plausible-procedural', text: 'No measured recoil distance in the drill text (ART-FA-14); Gibbon gives only a theoretical free recoil of 17.4 ft for a 12-pdr field gun (derived). A range of 0.9-1.8 m of carriage motion is used.' },
  { id: 'G-ANIM-05', title: 'Lengths of the cartridge and rammer motions', tier: 'plausible-procedural', text: 'The cartridge, rammer and bayonet motions are exempt from the 1/90-minute cadence (H.S.S. para 130); their lengths are not printed. The loading cycle is fitted to the fire plan\'s seconds-per-round and the exempt motions share the remainder.' },
  { id: 'G-ANIM-06', title: 'Cadence and step of the run', tier: 'plausible-procedural', text: 'H.S.S. para 116 says only "a greater degree of swiftness". A range of 190-230 steps a minute and 36-44 in. is used.' },
  { id: 'G-ANIM-07', title: 'Cavalry and horse-artillery gait speeds', tier: 'plausible-procedural', text: 'Cooke\'s Cavalry Tactics (1862) and the Light Artillery Board\'s horse-artillery chapter were not read for gait rates; modern equestrian ranges are used (walk 1.4-1.8, trot 3-4, canter 5-6.5, gallop 7-10 m/s) and marked plausible-procedural.' },
  { id: 'G-ANIM-08', title: 'Cavalry sabre and carbine drill', tier: 'plausible-procedural', text: 'The cavalry manual was not acquired; sabre cuts, draw/return, mounted and dismounted carbine actions, horse-holding (every fourth man) are authored from the plan\'s description and general knowledge.' },
  { id: 'G-ANIM-09', title: 'Non-drill activities (digging, chopping, rail piling, stone laying, cooking, sleeping, picket, burial, surgery)', tier: 'plausible-procedural', text: 'No motion source exists in the acquired texts; the plan allows only "procedural" motion marked as a modern reconstruction. Tool use follows the documented tools where the timeline names them (e.g. spades and shovels at Culp\'s Hill); the motion is authored.' },
  { id: 'G-ANIM-10', title: 'Wound reactions and fall styles', tier: 'plausible-procedural', text: 'The history layer decides who falls and when; how a man fell is not documented. Eight fall styles are seeded from the variation scalar.' },
  { id: 'G-ANIM-11', title: 'Stretcher, ambulance and field-hospital handling', tier: 'plausible-procedural', text: 'The ambulance-corps drill (1864) and stretcher-bearer practice of July 1863 were not acquired; a two-bearer litter carry is authored.' },
  { id: 'G-ANIM-12', title: 'Confederate drill manual and crew practice', tier: 'plausible-procedural', text: 'Hardee/Casey are US-army texts; which manual each regiment used in June-July 1863 is not stated (DRILL-HARDEE-NOTES section 5). Confederate battery crew size and practice are not in the acquired texts.' },
  { id: 'G-ANIM-14', title: 'Taking cover behind a wall or a tree', tier: 'inferred', text: 'The manuals print the kneeling, lying and sitting positions and the bugle calls for skirmishers "lie down" and "rise up" (HAR-S33, HAR-S34, HAR-K05, HAR-L02); how a man used a wall or a tree (crouching behind it, looking round the end, rising to fire over it) is not in any acquired text. The poses are authored from the documented postures.' },
  { id: 'G-ANIM-15', title: 'Steps of the men between the pivot and the wheeling flank', tier: 'inferred', text: 'Hardee prints the pivot step (9 / 11 in.) and the flank step (28 / 33 in.) of a wheel (ANIM-H381, ANIM-H382) but not the steps of the men between; they are taken in proportion to the distance from the pivot (geometry of a rank turning about the pivot).' },
  { id: 'G-ANIM-16', title: 'Four-man stretcher, ambulance loading and helping a limping man', tier: 'plausible-procedural', text: 'The ambulance-corps drill (1864) and the stretcher practice of July 1863 were not acquired. The four-man stretcher (lift, carry, set down), loading a stretcher into an ambulance wagon and supporting a limping man are authored from the description in the plan (render/PLAN.md G9: carrying the wounded: two-man, four-man stretcher, helping a limping man). Extends G-ANIM-11.' },
  { id: 'G-ANIM-17', title: 'Limbering, unlimbering, moving a piece by hand, the prolonge', tier: 'plausible-procedural', text: 'The ORDER of actions is printed (Instruction for Field Artillery paras 111-112, 115, 126-127, 476-477: ART-FA-70, 71, 73, 74, 90, 93); the body mechanics (lifting the trail on the handspike, keying the pintle, pushing on the spokes, uncoiling the prolonge) and the time each takes are authored.' },
  { id: 'G-ANIM-18', title: 'Horse artillery: mounted cannoneers, drivers, mounting and dismounting', tier: 'plausible-procedural', text: 'Gibbon: in horse artillery there are 11 cannoneers to each piece, all mounted, with two extra men holding the horses while the others work the piece (ART-GB-30). The riding and the mounting and dismounting motions, and the seat of the driver on the near horse, are authored (the light-artillery chapter on horse artillery and Cooke were not read for motions; see G-ANIM-07).' },
  { id: 'G-ANIM-19', title: 'Paired sabre fights (mounted and dismounted)', tier: 'plausible-procedural', text: 'The cavalry manual and any fencing manual of the period were not acquired (G-ANIM-08). The exchanges (cut, parry, point, riposte, disengage) are authored as two matched clips whose blades meet at the same contact point at the same instants; they are not a record of any fight.' },
  { id: 'G-ANIM-20', title: 'The skirmisher rush between cover', tier: 'plausible-procedural', text: 'Documented: a rear-rank man advances 10-12 paces past the front-rank man, halts, fires and reloads (HAR-K04); the calls "double quick", "lie down", "rise up" (HAR-L02). The crouched run between cover, the drop to the prone and the spring up are authored on the run gait (G-ANIM-06).' },
  { id: 'G-ANIM-21', title: 'Gear spring parameters (frequency, damping, mass) of the ten secondary-motion bones', tier: 'plausible-procedural', text: 'skeleton.json gives each gear bone a spring frequency (3.2-7.5 Hz), damping ratio (0.3-0.55) and relative mass; the values are those of the rig author, not measured on period equipment (render/PLAN.md G7 asks for measurement). The deterministic spring solve is implemented (springs.mjs); no measured data exists to calibrate it.' },
  { id: 'G-ANIM-22', title: 'Terrain test surface is the modern bare-earth DEM', tier: 'inferred', text: 'The foot-planting measurements use the own application heightfield (render/prototype/data/height.bin, USGS 3DEP bare earth at about 4 m, modern ground, not the 1863 landscape). The 1863 reconstruction is a separate layer; the planter takes any ground(x, z) function.' },
  { id: 'G-ANIM-23', title: 'Variants per state (render/PLAN.md G9 asks for about six per state)', tier: 'plausible-procedural', text: 'Round 3: the 38 crowd states (standing, the gaits, the three firing cycles, camp and work loops, lying loops) have six variants each, the clip as authored and five seeded modulations of trunk, head, free arm and carried piece (variants.mjs; the legs of a drilled march are never varied: the step is documented). The ranges are plausible-procedural. Still open: the other G9 states (stretcher, limber, cover, wheel, dress, skirmish, horse artillery, melee, the gun crews) have the 2 to 16 hand-authored variants of the earlier rounds, not six seeded ones.' },
  { id: 'G-ANIM-24', title: 'Steep ground: step-up behaviour, lean, slope classes and speed cap', tier: 'plausible-procedural', text: "No acquired text gives a marching or scrambling limit on a slope. Above 28 degrees the foot planter limits the stagger between the feet to 0.30 m (half a stair each side of the hip), leans the body into the hill about the hip (0.5 degree per degree, up to 30), tilts the foot onto the face and places the pelvis so that both legs are inside the knee's reach; classes walk / steep_walk (to 50) / scramble (to 60) / climb, and a speed factor (1 to 28 degrees, 0.5 at 50, 0.15 at 80) for the formation layer. Contact error 4.05 cm at worst up to the DEM's 80.4 degrees. No climbing clip, no hand contacts; the ankle is not clamped on faces steeper than it can take." },
  { id: 'G-ANIM-25', title: 'The lying load is performed in the prone chest frame', tier: 'plausible-procedural', text: "The drill says the lying soldier throws himself on his back to load (INF-LYING-02) and raises the piece vertically to prime (INF-LYING-03). The loading keys of the lying cycle are the standing keys in the chest frame, clamped above the ground plane: the lowest point of hands, piece and ramrod over the cycle is -0.495 m (the ramrod tip during the draw; was -1.01 m). The supine load (roll about the body's long axis, loading keys in the world frame) is open work." },
  { id: 'G-ANIM-13', title: 'Hand and rifle grip geometry', tier: 'inferred', text: 'The drill describes positions as relations (hand embracing the guard, arm nearly straight); the 3D coordinates and the positions of grips along the stock (wrist 0.30 m, guard 0.36 m, lower band 0.85 m) are an authored reading of the M1861 proportions.' },
];
