// DATA fixes: positions.  Row-level patches to data/placements_*.json and data/density_*.json found by the position audit (docs/data-audit/AUDIT.md section 8):
//   * rows that put a unit on the field before the Official Records say it arrived (First Corps, Eleventh Corps, Rodes's and Early's divisions, Gregg's, Kilpatrick's and Huey's cavalry, Merritt's brigade, Stannard's brigade);
//   * rows that keep Buford's two brigades on the field after they left for Taneytown on July 2;
//   * rows whose coordinates contradict the place the row's own note names, or the same unit's neighbouring rows (the density_day1_ironbrigade, density_day1_opening and
//     density_day1_iverson files carry a westward shift of 1.3-2.3 km against the placements files);
//   * rows that repeat an event a second time at a tick the corrected clock puts before the units were there;
//   * notes that name a different brigade than the row's own unit.
// Every entry is ONE asserted regex patch anchored on the row's unit id, tick, latitude and longitude (the ids as corrected by fixes/ids.mjs), so a row that changed under
// another group fails the build loudly.  Nothing is invented: where a position is moved, the target is another row of the same unit, the terrain point the note names,
// or the unit's parent brigade; where a unit leaves the field the end point is a point of the Taneytown Road of OpenStreetMap and the hours are the ones the sources give.
import { makePos } from '../posutil.mjs';
export const kind = 'text';
const P = makePos('pos');
const { del, retick, move, note, pick, addTo } = P;
const strengthOf = (r) => { try { return JSON.parse(r.line.trim().replace(/,$/, '')).strength; } catch (e) { return undefined; } };

const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const SRC_IC = `${OR1} p.265 (Wadsworth: the First Division moved from Marsh Creek at 8 a.m., turned to the left across the fields and struck the Cashtown road about three-quarters of a mile west of Gettysburg at about 10 a.m.), p.359 (Hall: in camp at Marsh Creek, 4 miles from Gettysburg, marched at 9 a.m.), p.267 (Morrow: about 9 a.m. near the town), p.144 (Meade: July 1 the First Corps moved from Marsh Run to Gettysburg)`;
const SRC_XI = `${OR1} p.144 (Meade: July 1 the Eleventh Corps moved from Emmitsburg to Gettysburg), p.696 (Howard: after Reynolds attacked at 10.45 a.m. he pushed on by a parallel road and placed the corps on the First Corps' right)`;
const SRC_EW = `${OR2} p.444 (Ewell: on the night of June 30 Rodes's division was at Heidlersburg and Early 3 miles off), p.317 (Lee: Rodes arrived by the Middletown road about the time Heth was engaged and Early came up by the Heidlersburg road soon afterward)`;
const SRC_PEND = `${OR2} p.607 (Hill: about 2.30 o'clock Ewell's right appeared on his left, and Pender's division was then ordered forward)`;
const SRC_STAN = `${OR1} p.258 (Doubleday: Stannard's brigade reported to him about twilight of July 1 and was put in line with Sickles's troops that night), p.144 (Meade: it joined the First Corps on the field on July 1)`;
const SRC_CAV = `${OR1} p.145 (Meade: July 1 Gregg's division marched from Manchester to Hanover Junction and Huey's brigade returned to Manchester; July 2 McIntosh's and J. I. Gregg's brigades and Kilpatrick's division reached the field; Merritt's reserve brigade went from Mechanicstown to Emmitsburg on July 2 and to the field on July 3; July 3 Huey's brigade went from Manchester to Westminster)`;
const SRC_BUF = `${OR1} p.117 (Meade: Buford's division, after its service at Gettysburg on the 1st, was on the 2d sent to Westminster to refit and guard the trains), p.145 (July 2 Gamble's and Devin's brigades marched from Gettysburg to Taneytown), p.1032 (Calef: on the morning of the 2d Buford ordered the battery to follow Gamble's brigade to Taneytown, reached about 4 p.m.)`;
const SRC_IRON = `${OR1} p.267 (Morrow: about 9 a.m. the brigade came near the town, filed to the left and charged down into the ravine of Willoughby's Run), p.265 (Wadsworth: the head of the column struck the Cashtown road at about 10 a.m.); the corrected clock puts Reynolds's death at tick 28 and the charge at ticks 27-29; Willoughby Run lies at longitude -77.258 to -77.262 at this latitude (OpenStreetMap way 779810776)`;
const SRC_OSM = 'OpenStreetMap Taneytown Road (way 11816812, south end 39.7199, -77.2097); the marker stops at the edge of the shown area';

// ---------------------------------------------------------------- A. the First Corps on the morning of July 1
const P1 = 'placements_day1_ticks1_50', D1 = 'density_day1_ticks1_50';
for (const u of ['U-I-1-1', 'U-I-1-2', 'U-I-2-1', 'U-I-2-2', 'U-I-3-1', 'U-I-3-2', 'U-I-3-3'])
  del(P1, u, 1, 'before-arrival', 'the First Corps was in camp at Marsh Creek, 4 miles from the town, until 8 a.m.; the row shows it 2 km from the field at tick 1', SRC_IC);
for (const u of ['U-147NY', 'U-19IN', 'U-24MI', 'U-2WI', 'U-56PA', 'U-6WI', 'U-76NY', 'U-7WI', 'U-84NY', 'U-95NY'])
  del(D1, u, 1, 'before-arrival', 'the regiment was in camp at Marsh Creek, 4 miles from the town, until 8 a.m.; the row shows it 2 km from the field at tick 1', SRC_IC);
for (const u of ['U-147NY', 'U-19IN', 'U-24MI', 'U-2WI', 'U-56PA', 'U-6WI', 'U-76NY', 'U-7WI', 'U-84NY', 'U-95NY'])
  retick(D1, u, 14, 24, 'wrong-tick', 'the row has the regiment on McPherson\'s Ridge at tick 14 (about 07:50); the division reached the Cashtown road at about 10 a.m. (tick 24 is about 09:35 on the corrected clock)', SRC_IC);
del('density_day1_opening', 'U-I-1-1', 12, 'wrong-place', 'the row puts the Iron Brigade 3.6 km west of Willoughby Run, behind the Confederate line, at 07:30; it came up from the south-east at about 10 a.m.', SRC_IC);
del('density_day1_opening', 'U-I-1-2', 12, 'wrong-place', 'the row puts Cutler\'s brigade 3.7 km west of Willoughby Run, behind the Confederate line, at 07:30', SRC_IC);
del('density_day1_opening', 'U-I-2', 12, 'wrong-place', 'the row puts Robinson\'s division 2.4 km west of Willoughby Run, behind the Confederate line, at 07:30', SRC_IC);
for (const [u, t] of [['U-19IN', 16], ['U-24MI', 16], ['U-2WI', 16], ['U-7WI', 16], ['U-19IN', 20], ['U-2WI', 20], ['U-7WI', 20], ['U-2WI', 22], ['U-7WI', 22], ['U-24MI', 22], ['U-2WI', 26]])
  del('density_day1_ironbrigade', u, t, 'wrong-place', 'the row is 0.9-2.3 km west of Willoughby Run, on the Confederate side, and repeats the charge into Herbst Woods that the placements rows put at ticks 27-29 (Reynolds killed at tick 28)', SRC_IRON);
for (const t of [16, 20, 22, 26]) del('density_day1_ironbrigade', 'C-III-2-3', t, 'wrong-place', 'Archer\'s brigade shown 1.3-2.3 km west of Willoughby Run, captured and reforming before the Iron Brigade had arrived (tick 28 is Reynolds\'s death, Archer was captured after it)', SRC_IRON);
for (const u of ['U-19IN', 'U-2WI', 'U-76NY', 'U-95NY']) del('density_skirmishers', u, 22, 'wrong-tick', 'the skirmish row of a First Corps regiment at tick 22 (about 09:10), before the regiment reached the field', SRC_IC);
del('density_day1_railroadcut', 'U-I-1-2', 20, 'wrong-tick', 'Cutler\'s brigade "pressed by Davis" at tick 20 (about 08:40), before it reached the field; the same event is at tick 31', SRC_IC);
move('density_day1_ironbrigade', 'U-19IN', 28, '39.8272', '-77.2540', 'wrong-place', 'the note says "in Herbst Woods -- Reynolds was killed here" but the row is 1.6 km west of the woods, on the Confederate side; moved to the eastern edge of the woods where the brigade row of the same tick has Reynolds killed',
  `${SRC_IRON}; position of the brigade row U-I-1-1 tick 28 (39.8283, -77.2539)`);
// ---- Perrin and Scales: Pender's division was ordered forward about 2.30 p.m.
retick(P1, 'C-III-3-3', 42, 52, 'wrong-tick', 'Perrin\'s brigade "approaching Seminary Ridge" at tick 42 (about 12:15), two hours before Pender\'s division was ordered forward', SRC_PEND);
retick(P1, 'C-III-3-4', 42, 52, 'wrong-tick', 'Scales\'s brigade "approaching Seminary Ridge" at tick 42 (about 12:15), two hours before Pender\'s division was ordered forward', SRC_PEND);
// ---- the Eleventh Corps and Ewell's divisions
for (const u of ['U-XI-1-1', 'U-XI-1-2', 'U-XI-2-1', 'U-XI-2-2', 'U-XI-3-1', 'U-XI-3-2'])
  del(P1, u, 1, 'before-arrival', 'the Eleventh Corps was at Emmitsburg, about 10 miles away, in the morning; the row shows it 5 km south of the town at tick 1', SRC_XI);
for (const u of ['C-II-1-1', 'C-II-1-2', 'C-II-1-3', 'C-II-1-4', 'C-II-3-1', 'C-II-3-2', 'C-II-3-3', 'C-II-3-4', 'C-II-3-5'])
  del(P1, u, 1, 'before-arrival', 'Rodes\'s and Early\'s divisions started from Heidlersburg, about 10 miles away; the row shows them 2-3 km from the field at tick 1', SRC_EW);
del('placements_day1_ticks51_100', 'U-I-3-3', 58, 'wrong-claim', '"I Corps line falling back at Seminary Ridge" for the Vermont brigade, which reached the field at twilight', SRC_STAN);

// ---------------------------------------------------------------- B. cavalry
del(P1, 'U-CAV-1-R', 1, 'wrong-claim', 'Merritt\'s reserve brigade is shown on Cemetery Ridge from tick 1 to the end; it was at Mechanicstown on July 1, Emmitsburg on July 2 and reached the field on July 3', SRC_CAV);
del('density_reserves', 'U-CAV-2', 1, 'before-arrival', 'Gregg\'s division is shown east of Gettysburg on the morning of July 1; it was marching from Manchester to Hanover Junction', SRC_CAV);
for (const u of ['U-CAV-2-1', 'U-CAV-2-2', 'U-CAV-2-3']) del('placements_day1_ticks101_225', u, 200, 'before-arrival', 'bivouac on the field on the night of July 1 (McIntosh and Custer reached the field on July 2; Huey was not at Gettysburg)', SRC_CAV);
del('density_day3_hancock', 'U-CAV-1', 562, 'wrong-claim', 'Buford\'s division shown on Cemetery Ridge on the evening of July 3; it had been sent to Westminster on July 2', SRC_BUF);
del('density_day3_retreat', 'U-CAV-1', 580, 'wrong-claim', 'Buford\'s division shown on Cemetery Ridge on July 3; it had been sent to Westminster on July 2', SRC_BUF);
del('density_day3_retreat', 'U-CAV-1-1', 625, 'wrong-claim', 'Gamble\'s brigade "following the Confederate rear guard" on July 3; it was at Taneytown and Westminster', SRC_BUF);
del('placements_day3_ticks601_675', 'U-CAV-1-1', 675, 'wrong-claim', 'Gamble\'s brigade "screening the Union left" at the end of July 3; it was at Westminster', SRC_BUF);
del('placements_day3_ticks601_675', 'U-HAB-A2US', 675, 'wrong-claim', 'Calef\'s battery "still in the field" at the end of the battle; it marched to Taneytown on July 2 and to Westminster on July 3', SRC_BUF);
del('density_skirmishers', 'U-17PA-CAV', 563, 'wrong-claim', 'a skirmish row of Devin\'s brigade south of the town at tick 563; the brigade was on the road to Westminster', SRC_BUF);
// Buford's brigades leave on the morning of July 2: hold at the last position at the start of day 2, then on the Taneytown Road
const LEAVE = [
  // [file, unit, last tick before day 2, arrival tick, note at day start, note on the road]
  ['density_day1_lateafternoon', 'U-CAV-1', 80, 340, 'Buford\'s division leaves for Taneytown on the morning of July 2', 'Buford\'s division on the Taneytown Road to Taneytown and Westminster'],
  ['placements_day1_ticks101_225', 'U-CAV-1-1', 120, 256, 'Gamble\'s brigade leaves for Taneytown on the morning of July 2', 'Gamble\'s brigade on the Taneytown Road; it reached Taneytown about 4 p.m. (Calef)'],
  ['placements_day1_ticks101_225', 'U-CAV-1-2', 120, 340, 'Devin\'s brigade leaves for Taneytown on July 2', 'Devin\'s brigade on the Taneytown Road to Taneytown'],
  ['placements_day1_ticks1_50', 'U-HAB-A2US', 17, 256, 'Calef\'s battery follows Gamble\'s brigade to Taneytown on the morning of July 2', 'Calef\'s battery on the Taneytown Road; it reached Taneytown about 4 p.m. (Calef)'],
  ['density_cavalry_detail', 'U-8IL-CAV', 50, 256, 'the 8th Illinois leaves for Taneytown with Gamble\'s brigade on July 2', 'the 8th Illinois on the Taneytown Road with Gamble\'s brigade'],
  ['density_cavalry_detail', 'U-8NY-CAV', 26, 256, 'the 8th New York leaves for Taneytown with Gamble\'s brigade on July 2', 'the 8th New York on the Taneytown Road with Gamble\'s brigade'],
  ['density_cavalry_detail', 'U-12IL-CAV', 14, 256, 'the 12th Illinois leaves for Taneytown with Gamble\'s brigade on July 2', 'the 12th Illinois on the Taneytown Road with Gamble\'s brigade'],
  ['density_cavalry_detail', 'U-3IN-CAV', 14, 256, 'the 3rd Indiana leaves for Taneytown with Gamble\'s brigade on July 2', 'the 3rd Indiana on the Taneytown Road with Gamble\'s brigade'],
  ['density_cavalry_detail', 'U-6NY-CAV', 50, 340, 'the 6th New York leaves for Taneytown with Devin\'s brigade on July 2', 'the 6th New York on the Taneytown Road with Devin\'s brigade'],
  ['density_cavalry_detail', 'U-17PA-CAV', 50, 340, 'the 17th Pennsylvania leaves for Taneytown with Devin\'s brigade on July 2', 'the 17th Pennsylvania on the Taneytown Road with Devin\'s brigade'],
  ['density_skirmishers', 'U-9NY-CAV', 3, 340, 'the 9th New York leaves for Taneytown with Devin\'s brigade on July 2', 'the 9th New York on the Taneytown Road with Devin\'s brigade'],
];
for (const [file, unit, lastTick, arr, n1, n2] of LEAVE) {
  const r = pick(file, unit, lastTick); if (!r) continue;
  const st = strengthOf(r);
  // day-2 rows: the engine keeps a tick list per day, so rows for ticks 226 and later go into day-2 files
  addTo(unit, { tick: 226, lat: r.latS, lng: r.lngS, disposition: 'Line of March', bearing: 160, strength: st, note: n1 + ' (OR 27/1 p.145; the hour is not given in the sources used here)' }, 'wrong-claim', 'the unit stays on the field to the end of the battle', SRC_BUF, '-start');
  addTo(unit, { tick: arr, lat: 39.7199, lng: -77.2097, disposition: 'Line of March', bearing: 160, strength: st, note: n2 + ' (OR 27/1 p.145; shown at the edge of the map)' }, 'wrong-claim', 'the unit stays on the field to the end of the battle', SRC_BUF + '; ' + SRC_OSM, '-road');
}
note('density_day1_opening', 'U-8IL-CAV', 11, '8th Illinois Cavalry falling back toward McPherson\'s Ridge', 'wrong-place', 'the note put the regiment "at McPherson\'s Ridge" while the row is 1.8 km west of it', `${OR1} p.1031 (Calef: Buford\'s line fell back as the First Corps came up)`);
move('density_day1_opening', 'U-HAB-A2US', 8, '39.8322', '-77.2511', 'wrong-place', 'the note says the battery was deployed on McPherson\'s Ridge but the row is 1.7 km west of it; moved to the McPherson\'s Ridge position of the same battery (tick 14)', `${OR1} p.1031 (Calef: the battery took an advanced position about 600 yards in front of the one held during the night, on Gamble\'s brigade\'s front); position of row U-HAB-A2US tick 14`);
move('density_day1_opening', 'U-HAB-A2US', 11, '39.8322', '-77.2511', 'wrong-place', 'the battery "firing" on McPherson\'s Ridge but 1.7 km west of it; moved to the position of the same battery at tick 14', `${OR1} p.1031; position of row U-HAB-A2US tick 14`);
move('density_day1_opening', 'U-CAV-1-1', 9, '39.8311', '-77.2544', 'wrong-place', 'the note says Gamble\'s brigade was dismounted on McPherson\'s Ridge but the row is 2.4 km west of it; moved to the McPherson\'s Ridge position of the brigade at tick 14', `${OR1} p.1031 (Calef: Colonel Gamble commanded the brigade on this line); position of row U-CAV-1-1 tick 14`);


// ---- the Iron Brigade and Cutler's brigade held Culp's Hill on July 2 and 3
const SRC_CULP = `${OR1} p.266 (Wadsworth: on the evening of the 1st we were ordered to occupy a hill on the right of the cemetery, which we held on the 2d and 3d), p.277 (Dawes: by direction of General Wadsworth, to an open field on Culp's Hill)`;
note('placements_day1_ticks101_225', 'U-I-1-1', 120, `Iron Brigade remnants on Culp's Hill, where Wadsworth's division stayed through July 2 and 3 (Wadsworth)`, 'wrong-claim', 'the note said "on Cemetery Ridge"', SRC_CULP);
note('placements_day1_ticks51_100', 'U-I-1-1', 95, `Iron Brigade survivors on Cemetery Hill; that evening Wadsworth ordered the division to Culp's Hill (Wadsworth)`, 'wrong-claim', 'the note said "on Cemetery Ridge" at the position of Cemetery Hill', SRC_CULP);
move('placements_day1_ticks101_225', 'U-I-1-1', 120, '39.8201', '-77.2205', 'wrong-place', `the Iron Brigade is shown on Cemetery Hill ("Cemetery Ridge") at the end of July 1 and then drifts to Seminary Ridge by tick 650; it held Culp's Hill on July 2 and 3 (terrain point LOC-002)`, SRC_CULP);
move('placements_day1_ticks101_225', 'U-I-1-2', 120, '39.8208', '-77.2212', 'wrong-place', `Cutler's brigade is shown on Cemetery Hill after July 1; it held Culp's Hill on July 2 and 3 with the Iron Brigade (terrain point LOC-002, 80 m apart to keep the two brigade markers apart)`, SRC_CULP);
del('density_day3_retreat', 'U-I-1-1', 650, 'wrong-place', 'the Iron Brigade "bivouacking on Cemetery Ridge" at Seminary Ridge coordinates (the Confederate line) at tick 650', SRC_CULP);
del('density_skirmishers', 'U-8IL-CAV', 563, 'wrong-claim', `the 8th Illinois "skirmishing south of town after Pickett's repulse" on July 3; it was on the road to Westminster`, SRC_BUF);

{ const r = pick('density_day1_lateafternoon', 'U-I-1', 68); if (r) addTo('U-I-1', { tick: 120, lat: 39.8205, lng: -77.2208, disposition: 'Line of Battle', bearing: 0, strength: strengthOf(r), note: `Wadsworth's division on Culp's Hill, where it stayed through July 2 and 3 (Wadsworth)` }, 'wrong-claim', `the division marker stays on Cemetery Hill to the end of the battle`, SRC_CULP); }

// ---------------------------------------------------------------- C. Iverson's brigade at the Oak Ridge stone wall (density_day1_iverson is shifted 1.3-1.7 km west)
const SRC_IV = `${OR2} p.553-554 (Rodes: the dead lay in a line close to the stone wall; Iverson's brigade was caught at the wall); ${OR1} p.248 (Baxter's brigade behind the stone wall on Oak Ridge); placements rows of the brigades U-I-2-2 (39.8306, -77.2411) and C-II-3-3 (39.8306, -77.2411) at the same ticks`;
for (const [t, at] of [[50, ['39.8272', '-77.2572']], [50, ['39.8289', '-77.2578']], [53, ['39.8272', '-77.2572']], [53, ['39.8289', '-77.2578']]])
  del('density_day1_iverson', 'U-I-2-2', t, 'wrong-place', 'Baxter\'s brigade placed 1.4 km west of the stone wall at the Herbst Woods; the placements rows of the same ticks put it behind the wall', SRC_IV, at);
del('density_day1_iverson', 'U-I-2-2', 60, 'wrong-place', 'Baxter\'s brigade 1.3 km west of the wall', SRC_IV);
del('density_day1_iverson', 'C-12NC', 60, 'wrong-place', 'survivors bivouacked 1.2 km west of the wall', SRC_IV);
const OR_DLAT = 0.0122, OR_DLNG = -0.0013;   // Oak Ridge sector shift, section D2 below
const IV = {
  50: { b: [39.8306, -77.2422], regs: { 'C-5NC': [39.8322, -77.2567], 'C-12NC': [39.8333, -77.2561], 'C-20NC': [39.8344, -77.2556], 'C-23NC': [39.8356, -77.2550] } },
  53: { b: [39.8306, -77.2411], regs: { 'C-5NC': [39.8322, -77.2550], 'C-12NC': [39.8333, -77.2544], 'C-20NC': [39.8344, -77.2539], 'C-23NC': [39.8356, -77.2533] } },
  57: { b: [39.8311, -77.2417], regs: { 'C-5NC': [39.8317, -77.2578], 'C-23NC': [39.8350, -77.2561] } },
};
for (const [t, d] of Object.entries(IV)) {
  const ids = Object.keys(d.regs);
  const cl = ids.reduce((s, k) => s + d.regs[k][0], 0) / ids.length, cg = ids.reduce((s, k) => s + d.regs[k][1], 0) / ids.length;
  for (const k of ids) {
    const lat = (d.b[0] + d.regs[k][0] - cl + OR_DLAT).toFixed(4), lng = (d.b[1] + d.regs[k][1] - cg + OR_DLNG).toFixed(4);
    move('density_day1_iverson', k, +t, lat, lng, 'wrong-place', 'the regiment is 1.2-1.4 km west of its brigade at the stone wall; moved onto the brigade (placements row of the same tick, tick 54 for tick 57) keeping the regiment\'s own place in the line', SRC_IV);
  }
}
move('density_day1_iverson', 'C-II-3-4', 57, (39.8315 + OR_DLAT).toFixed(4), (-77.2425 + OR_DLNG).toFixed(4), 'wrong-place', 'Ramseur\'s brigade "coming up on Oak Ridge" but 1.8 km west of it; moved next to the brigade\'s own rows at ticks 54 (39.8317, -77.2422)', `${OR2} p.553; position of row C-II-3-4 tick 54`);

// ---------------------------------------------------------------- D. Little Round Top
const SRC_LRT = `${OR1} p.602 (Barnes: Vincent's brigade went to Little Round Top), p.623 (Chamberlain: the brigade on the southern slope of Little Round Top, Hazlett's battery on the crest behind it); the rows of the same units at ticks 267, 270 and 620 (39.7933, -77.2394)`;
for (const t of [266, 268, 272]) move('density_day2_devilsden', 'U-V-1-3', t, '39.7933', '-77.2394', 'wrong-place', 'Vincent\'s brigade "on Little Round Top" is placed in Rose Woods, 1.2 km away, and jumps between the two places on alternate ticks', SRC_LRT);
for (const t of [266, 272]) move('density_day2_devilsden', 'U-ART-D5US', t, '39.7933', '-77.2389', 'wrong-place', 'Hazlett\'s battery "on Little Round Top" is placed in Rose Woods, 1.2 km away; its own row at tick 270 is on the summit', SRC_LRT);

// ---------------------------------------------------------------- E. Pickett's charge: placements rows that contradict the density rows of the same tick
const SRC_PC = 'rows of the same brigade at the same or neighbouring ticks in density_day3_angle.json and density_day3_vermont.json, which put it at The Angle (39.8144, -77.2356) and in front of the Vermont brigade (39.8094, -77.2389)';
for (const t of [548, 549, 550, 555]) del('placements_day3_ticks521_600', 'C-I-3-1', t, 'wrong-place', 'Garnett\'s brigade at the stone wall 1.0 km north of The Angle (Cemetery Hill) while the density rows put it at The Angle at tick 548 and again at 555: the unit jumps 1 km and back', SRC_PC);
del('placements_day3_ticks521_600', 'C-I-3-3', 550, 'wrong-place', 'Armistead\'s brigade "approaching the wall" 0.9 km north of The Angle between rows that put it at The Angle', SRC_PC);
del('placements_day3_ticks521_600', 'C-I-3-2', 546, 'wrong-place', 'Kemper\'s brigade "under flanking fire from the Vermont brigade" 1.3 km north of the Vermont brigade; the density row of the same tick has it in front of Stannard (39.8094, -77.2389)', SRC_PC);

// ---------------------------------------------------------------- F. notes that name another brigade
const SRC_HETH = `${OR2} p.637 (Heth: Archer's brigade in line on the right of the turnpike, Davis's on the left; Pettigrew's brigade and Brockenbrough's were held in reserve)`;
note('density_day1_opening', 'C-III-2-1', 8, 'Pettigrew\'s brigade following Archer\'s and Davis\'s down the Chambersburg Pike; it was held in reserve (Heth)', 'wrong-unit-note', 'the note of Pettigrew\'s row said "Archer deploying into line of battle"', SRC_HETH);
note('density_day1_opening', 'C-III-2-1', 11, 'Pettigrew\'s brigade in reserve behind Archer\'s and Davis\'s (Heth)', 'wrong-unit-note', 'the note of Pettigrew\'s row said "Archer\'s brigade crossing Willoughby Run"', SRC_HETH);
note('density_day1_opening', 'C-III-2-2', 8, 'Brockenbrough\'s brigade following Archer\'s and Davis\'s down the Chambersburg Pike; it was held in reserve (Heth)', 'wrong-unit-note', 'the note of Brockenbrough\'s row said "Davis deploying north of the pike"', SRC_HETH);
note('density_day1_opening', 'C-III-2-2', 11, 'Brockenbrough\'s brigade in reserve behind Archer\'s and Davis\'s (Heth)', 'wrong-unit-note', 'the note of Brockenbrough\'s row said "Davis advancing north of the pike toward the Railroad Cut"', SRC_HETH);
note('density_day1_railroadcut', 'C-III-2-2', 35, 'Brockenbrough\'s brigade held in reserve (Heth)', 'wrong-unit-note', 'the note of Brockenbrough\'s row said "Davis reforming behind Herr Ridge"', SRC_HETH);
note('density_day1_ticks51_100', 'U-157NY', 60, '157th New York (Schimmelfennig\'s brigade, Eleventh Corps) in the retreat north of the town', 'wrong-unit-note', 'the 157th New York carried the note "Coster\'s brigade in the brickyard -- 597 casualties in the return"; it belonged to Schimmelfennig\'s brigade', `${OR1} p.730 (Schurz); data/oob/union_oob_brigades.json U-XI-3-2 regiment_ids`);


del('density_day1_lateafternoon', 'U-107OH', 63, 'wrong-place', `the 107th Ohio is shown on Cemetery Hill at tick 63, then "retreating through Gettysburg" at tick 66 and rallying on Cemetery Hill at tick 72`, `${OR1} p.696 (Howard), p.727-729 (Schurz: the corps fell back through the town to Cemetery Hill)`);

// ---------------------------------------------------------------- D2. the north sector of July 1 and East Cavalry Field are plotted 1.0-3.4 km from the NPS ground
// The terrain table puts Oak Hill 1.7 km, Oak Ridge 1.5 km, Barlow's Knoll 1.0 km south of the NPS sites and East Cavalry Field 3.0 km west of its monuments; the rows
// authored around these points moved with them.  NPS ground (OpenStreetMap historic=monument nodes, which carry the NPS names; the Eternal Light Peace Memorial is also the
// coordinate of tour stop 2 of the Virtual Walkthrough): Oak Hill 39.8485,-77.2435 (Eternal Light, Rodes's and Iverson's headquarters markers 39.8478-39.8484,-77.2432);
// Baxter's brigade and its regiments at the Oak Ridge stone wall 39.8422-39.8444,-77.2412-77.2429 (Baxter's headquarters marker 39.84278,-77.24243); Barlow's headquarters
// marker 39.84479,-77.22670, the Barlow statue 39.84544,-77.22641, the 17th Connecticut 39.84541,-77.22614, Wilkeson's battery 39.84558,-77.22602; Krzyzanowski's and
// Schimmelfennig's regiments on the Carlisle Road line 39.8409-39.8437,-77.2281 to -77.2345; East Cavalry Field: Custer's headquarters marker 39.82669,-77.16524, McIntosh
// 39.82589,-77.16307, Stuart's division 39.83499,-77.17024, Hampton 39.83649,-77.16888, Fitz Lee 39.83837,-77.16697 (NPS monuments, OpenStreetMap).
const SRC_N = 'NPS monuments as mapped in OpenStreetMap (ODbL), fetched 2026-10-19: Baxter HQ marker 39.84278,-77.24243 and the stone-wall regiments (83rd NY, 97th NY, 88th PA, 90th PA, 12th MA, 11th PA) 39.8422-39.8444,-77.2412 to -77.2429; Rodes and Iverson HQ markers and the Eternal Light Peace Memorial on Oak Hill 39.8478-39.8485,-77.2432 to -77.2435 (also tour stop 2 of the Virtual Walkthrough, 39.84806,-77.24384); Barlow HQ marker 39.84479,-77.22670, 17th Connecticut 39.84541,-77.22614, Wilkeson 39.84558,-77.22602; Krzyzanowski/Schimmelfennig regiments 39.8409-39.8437,-77.2281 to -77.2345; OR 27/2 p.553-554 (Rodes), OR 27/1 p.727-729 (Schurz)';
const SRC_E = 'NPS monuments as mapped in OpenStreetMap (ODbL), fetched 2026-10-19: Custer HQ marker 39.82669,-77.16524, Michigan Cavalry Brigade monument 39.82615,-77.16529, McIntosh 39.82589,-77.16307, Gregg shaft 39.82641,-77.16300, Stuart division 39.83499,-77.17024, Hampton 39.83649,-77.16888, Fitz Lee 39.83837,-77.16697, Breathed 39.83695,-77.16817, Pennington 39.81837,-77.16917; the 512-monument array of the Virtual Walkthrough puts the East Cavalry Field tablets at 39.818-39.838,-77.163 to -77.174';
const SECTORS = [
  // [name, dlat, dlng, unit pattern, first tick, last tick, source, what]
  ['OH', 0.0146, -0.0074, /^(C-ART-(Carrington|Carter|Fry|Page)|C-II-3-1|C-II-3-2)$/, 40, 53, SRC_N, 'Oak Hill'],
  ['OR', OR_DLAT, OR_DLNG, /^(C-II-3-3|C-II-3-4|C-II-3-5|C-5NC|C-12NC|C-20NC|C-23NC|U-I-2-1|U-I-2-2|U-12MA|U-83NY|U-97NY|U-88PA|U-90PA|U-94NY|U-104NY|U-16ME)$/, 40, 62, SRC_N, 'the Oak Ridge stone wall'],
  ['BK', 0.0095, 0.0005, /^(U-XI-1|U-XI-1-1|U-XI-1-2|U-153PA|U-54NY|U-68NY|U-41NY|U-ART-G4US)$/, 50, 60, SRC_N, "Barlow's Knoll"],
  ['SC', 0.0108, -0.0020, /^(U-XI-3-1|U-XI-3-2)$/, 50, 50, SRC_N, "Schurz's line on the Carlisle Road"],
  ['ECU', -0.0055, 0.0320, /^(U-CAV-2|U-CAV-2-1|U-CAV-2-3|U-[1567]MI-CAV|U-HAB-M2US)$/, 395, 680, SRC_E, 'East Cavalry Field (Union)'],
  ['ECC', 0.0033, 0.0333, /^(C-CAV-1|C-CAV-2|C-1SC-CAV|C-Cobb-CAV|C-Jeff-MS-CAV|C-HAB-(Breathed|Hart))$/, 395, 680, SRC_E, 'East Cavalry Field (Confederate)'],
];
move('density_day3_morning', 'C-CAV-2', 505, '39.8384', '-77.1670', 'wrong-place', `the row "Stuart's cavalry at East Cavalry Field" is on the id of Fitz Lee's brigade, 1.6 km east of the rest of the cluster and 3 km west of the NPS markers; moved to the NPS marker of Fitz Lee's brigade (39.83837, -77.16697)`, SRC_E);
let nSector = 0;
for (const [name, dlat, dlng, re, lo, hi, src, what] of SECTORS) {
  for (const r of P.ROWS) {
    if (!re.test(r.unit) || r.tick < lo || r.tick > hi) continue;
    if (name.startsWith('EC') && !(Number(r.lngS) > -77.215)) continue;                          // the ECF sector shift only applies to rows at the old East Cavalry Field
    if (name === 'ECC' && r.unit === 'C-CAV-2' && r.tick === 470) continue;                      // the march east of tick 470 stays where it is
    if (P.touched.has(`${r.f}|${r.unit}|${r.tick}|${r.latS}|${r.lngS}`)) continue;
    const lat = (Number(r.latS) + dlat).toFixed(4), lng = (Number(r.lngS) + dlng).toFixed(4);
    move(r.f, r.unit, r.tick, lat, lng, 'wrong-place', `the row is ${what === 'East Cavalry Field (Union)' || what === 'East Cavalry Field (Confederate)' ? '3.0-3.4 km west of' : '1.0-1.7 km south of'} the NPS ground at ${what}; moved by (${dlat}, ${dlng}) degrees, the offset between the terrain point the row was drawn around and the NPS sites`, src, [r.latS, r.lngS]);
    nSector++;
  }
}

export default P.out;
export const zposErrors = P.errors;
export const posEffects = P.effects;
if (process.argv[1] && process.argv[1].endsWith('zpos.mjs')) { console.log('patches', P.out.length); for (const e of P.errors) console.log('ERROR', e); }
