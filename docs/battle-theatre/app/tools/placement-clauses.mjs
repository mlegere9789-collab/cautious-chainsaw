// THE CLAUSE TABLE: every key-position, night-position, first-on-field and left-or-moved clause of the 44 PDF B.2.4 ledger rows (history/arrivals.json, raw cells), each one either
// TRANSCRIBED (kind: stop | approach | departure | activity | formation | record) or UNRESOLVED with its reason. tools/build-placement.mjs turns this table into data/placement.json and
// refuses to run if a phrase is not literally in its cell, if a place is not in the gazetteer, or if any text of a cell is left uncovered.
// Reading rules (the same for every clause; the owner decides any other reading):
//  * a clause keeps the unit scope the ledger row gives it (the row's unit and everything under it) unless the clause names a narrower roster unit; a unit never takes a clause that falls before its own ledger gate;
//  * a time is a clock printed in the clause (the start of a printed window is the time of the place; a clause of the "advance to" / "retreat to" kind departs at the start and arrives at the end), or a named
//    period (night 20:04, evening/dusk 19:32: labelled conventions of PDF B.2.2), or only a date (recorded, not scheduled: a stop needs a time);
//  * two or more places in a clause ("A / B", "A and B") are not resolved by choosing one (unresolved, MULTI); "east of", "behind", "near" with no distance are unresolved (REL) unless the place itself is the
//    printed position; a corps-level clause is not applied to a unit whose own row gives a clause for the same time (the nearer clause wins);
//  * nothing is drawn before its gate; a place outside the loaded ground is a place all the same (the unit goes there and is off screen).
// Codes: S stop, R recorded (transcribed, drives nothing: say why), AC activity, DP departure, FM formation, AP approach road, U unresolved.
const CELL = { key: 'key_positions', night: 'night_positions', first: 'first_on_field', left: 'left_or_moved' };
export const WHY = {
  GAP: 'the ledger prints a gap',
  MULTI_R: 'two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled',
  NOPL: 'the clause names no place',
  HQ: 'a headquarters entry: no figure, never drawn',
  CMD: 'a command decision or message, not the position of a unit',
  MULTI: 'two or more places are named and the cell does not say which part of the formation is at which',
  REL: 'a position relative to a place (east of, behind, near) with no distance printed',
  ARR: 'a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place',
  PRE: 'falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground',
  DEST: 'a departure with no destination or road printed',
  OFF: n => `“${n}” has no coordinate in any repository file: it is not in the gazetteer`,
};
export const CLAUSES = [];
const add = (row, cell, phrase, spec) => CLAUSES.push({ row, cell: CELL[cell], phrase, ...spec });
const U = (reason, o = {}) => ({ st: 'U', reason, ...o });
const S = o => ({ st: 'T', kind: 'stop', ...o });
const R = (why, o = {}) => ({ st: 'T', kind: 'record', why, ...o });
const AC = o => ({ st: 'T', kind: 'activity', ...o });
const FM = o => ({ st: 'T', kind: 'formation', ...o });
const AP = o => ({ st: 'T', kind: 'approach', ...o });
export const DP = o => ({ st: 'T', kind: 'departure', ...o });

// ===== Army of the Potomac headquarters (us-aop-hq): a headquarters entry, never drawn =====
add('us-aop-hq', 'key', 'Jul 2 about 10:00 cancels Slocum’s Culp’s Hill attack', U(WHY.CMD + '; ' + WHY.HQ));
add('us-aop-hq', 'key', 'about 15:00 telegram to Halleck', U(WHY.CMD + '; ' + WHY.HQ));
add('us-aop-hq', 'key', '16:00 sends Warren to Little Round Top', U('Warren is a staff officer of the headquarters; the roster has no unit for him'));
add('us-aop-hq', 'key', '20:00 telegram “repulsed at all points”', U(WHY.CMD + '; ' + WHY.HQ));
add('us-aop-hq', 'night', 'Jun 28: Frederick', U(WHY.OFF('Frederick') + '; ' + WHY.HQ));
add('us-aop-hq', 'night', 'Jun 30: Taneytown (Pipe Creek Circular written late Jun 30)', U(WHY.OFF('Taneytown') + '; ' + WHY.HQ));
add('us-aop-hq', 'night', 'Jul 1: Taneytown, then to Cemetery Hill after midnight', U(WHY.OFF('Taneytown') + '; ' + WHY.HQ));
add('us-aop-hq', 'night', 'Jul 2: Leister house (council of war 21:00 to midnight window)', R(WHY.HQ, { place: 'Leister house', d: '07-02', t: '21:00', pb: 'the council of war window opens at 21:00' }));
add('us-aop-hq', 'night', 'Jul 3: Leister house made untenable by the cannonade', R(WHY.HQ + '; date only, no clock', { place: 'Leister house', d: '07-03' }));
add('us-aop-hq', 'night', 'Meade moves to Powers Hill', R(WHY.HQ + '; date only (the Jul 3 entry), no clock', { place: 'Powers’ Hill', d: '07-03' }));
add('us-aop-hq', 'first', 'Evergreen gatehouse, Cemetery Hill: after midnight Jul 1-2 (about 00:00-01:00)', R(WHY.HQ + '; one of the values of the headquarters’ arrival (C-001)', { place: 'Evergreen gatehouse', d: '07-02', t: '00:00', tt: '01:00' }));
add('us-aop-hq', 'first', 'alternative about 04:00 (EPP)', R(WHY.HQ + '; the alternative value of C-001 (EPP, a weak source)', { place: 'Evergreen gatehouse', d: '07-02', t: '04:00', pb: 'the preceding clause of the same cell' }));
add('us-aop-hq', 'left', 'Jul 5 morning learns Lee has left', U(WHY.CMD + '; ' + WHY.HQ));
add('us-aop-hq', 'left', 'pursuit of corps by corps is a gap except Sedgwick, Slocum, Howard, French', U(WHY.GAP + ' for the pursuit (except four corps commanders) and names no place or time'));

// ===== Hancock acting for Meade (us-hancock-acting): a person with no troops, never drawn =====
add('us-hancock-acting', 'key', '17:25 dispatch to Meade (“we can fight here”)', U(WHY.CMD + '; a person with no figure is not drawn'));
add('us-hancock-acting', 'key', 'about 18:00 leaves to report to Meade', U(WHY.NOPL + '; a person with no figure is not drawn'));
add('us-hancock-acting', 'night', 'Jul 1 night: Cemetery Hill / Cemetery Ridge', R(WHY.MULTI_R + '; a person with no figure is not drawn', { places: ['Cemetery Hill', 'Cemetery Ridge'], d: '07-01', np: 'night' }));
add('us-hancock-acting', 'first', 'Cemetery Hill: about 15:00 (his report), before 16:00, about 16:00 (SS1, WHN-HAN), about 16:30 (CWN-HAN)', U('four conflicting times and the cell prints no date; a person with no figure is not drawn'));
add('us-hancock-acting', 'first', 'no troops of his own', U('a statement, not a position'));
add('us-hancock-acting', 'left', 'Rejoins II Corps Jul 2', U('a command assignment with no place; a person with no figure is not drawn'));

// ===== I Corps =====
add('us-1c', 'key', 'Jul 1 04:00 Reynolds’ orders at Moritz’s Tavern', U(WHY.OFF('Moritz’s Tavern') + '; also before the corps’ gate (head about 10:00)'));
add('us-1c', 'key', '08:00 Wadsworth marches north', U('a direction, no place; before the corps’ gate (head about 10:00)'));
add('us-1c', 'key', '10:20-10:30 McPherson Ridge', S({ place: 'McPherson Ridge', d: '07-01', t: '10:20', tt: '10:30', note: 'applied to the corps’ units on the field at 10:20 (the 1st Division has its own entry PO-01 for the same hour); the ledger does not say which regiments' }));
add('us-1c', 'key', '15:45-17:00 retreat through town to Cemetery Hill', S({ id: 'PO-03', place: 'Cemetery Hill', d: '07-01', t: '17:00', dep: '15:45', via: ['the town'], cf: 'C-043', req: true,
  note: 'Applied to the I Corps units that were placed earlier; units that have only their arrival edge are not moved. C-043 (retreat order 15:45 / 16:00 / 16:30 / 17:00): a chosen clock sets the step-off, the arrival stays the printed 17:00.' }));
add('us-1c', 'night', 'Jun 29-30: bivouac along Marsh Creek (exact night unclear)', U('Marsh Creek is a long stream (the gazetteer’s is 4.4 km wide) and the night is unclear; before the corps’ gate'));
add('us-1c', 'night', 'Culp’s Hill (Wadsworth)', R('the 1st Division’s own night cell gives the same position (CL of us-1c-1d night Jul 1)', { units: ['us-1c-1d'], place: 'Culp’s Hill', d: '07-01', np: 'night' }));
add('us-1c', 'night', 'Cemetery Hill and Cemetery Ridge (Robinson)', R(WHY.MULTI_R + ' (Robinson’s 2nd Division)', { units: ['us-1c-2d'], places: ['Cemetery Hill', 'Cemetery Ridge'], d: '07-01', np: 'night' }));
add('us-1c', 'night', 'same, then Robinson’s division moves left about 19:00', U('“same” repeats the Jul 1 places; “left” is a direction, no place', { units: ['us-1c-2d'] }));
add('us-1c', 'night', 'Jul 3: gap', U(WHY.GAP));
add('us-1c', 'first', 'Jul 1: head about 10:00 on the Emmitsburg Road', AP({ id: 'AP-01', unit: 'us-1c', road: 'Emmitsburg Road', tier: 'inferred',
  note: 'Printed: the head of I Corps is on the Emmitsburg Road about 10:00. Where along the road is not printed; the unit enters the loaded ground where the road crosses its edge.' }));
add('us-1c', 'first', 'vanguard (Wadsworth) at McPherson Ridge about 10:20', S({ id: 'PO-01', units: ['us-1c-1d'], place: 'McPherson Ridge', d: '07-01', t: '10:20',
  note: 'Wadsworth commands the 1st Division; the vanguard is applied to the division’s regiments. The ledger time may be earlier than the loaded ground’s edge allows (see the offsets list).' }));
add('us-1c', 'left', 'Gap (after Jul 5)', U(WHY.GAP));

add('us-1c-1d', 'key', 'Jul 2 about 20:00-22:00 three regiments to reinforce Greene (which three: not named in the notes)', U('the ledger does not name the three regiments, and names no place for Greene’s brigade here'));
add('us-1c-1d', 'night', 'Culp’s Hill north slope', S({ place: 'Culp’s Hill', d: '07-01', np: 'night', note: 'the north slope is part of the hill; the whole division is placed at the hill (the ledger does not say which regiments were where)' }));
add('us-1c-1d', 'night', 'Stevens’ Knoll to the summit', R('the other end of the line that begins on the north slope of Culp’s Hill; which regiments held it is not printed, so no stop is scheduled', { place: 'Stevens’ Knoll', d: '07-01', np: 'night' }));
add('us-1c-1d', 'night', 'works begin in the evening (6th Wisconsin first)', AC({ units: ['us-1c-1d-meredith-6wi'], activity: 'build_works', place: 'Culp’s Hill', d: '07-01', np: 'evening', note: 'only the 6th Wisconsin is named; applied when it stands at the hill' }));
add('us-1c-1d', 'night', 'The 7th Indiana joins the I Corps right on Culp’s Hill about 16:00', S({ units: ['us-1c-1d-cutler-7in'], place: 'Culp’s Hill', d: '07-01', t: '16:00' }));
add('us-1c-1d', 'night', 'same', S({ place: 'Culp’s Hill', d: '07-02', np: 'night', note: 'Jul 2: “same” as the Jul 1 entry (Culp’s Hill)' }));
add('us-1c-1d', 'first', 'Jul 1 about 10:20 (vanguard)', R('restates the vanguard entry PO-01 of the corps row', { place: 'McPherson Ridge', d: '07-01', t: '10:20', pb: 'PO-01' }));
add('us-1c-1d', 'left', 'Gap', U(WHY.GAP));

add('us-1c-2d', 'key', 'Jul 1 13:00-13:30 Baxter and Paul to Oak Ridge', S({ id: 'PO-02', units: ['us-1c-2d-baxter', 'us-1c-2d-paul'], place: 'Oak Ridge', d: '07-01', t: '13:00', tt: '13:30',
  note: 'The window 13:00-13:30 is carried by its start. Oak Ridge lies north of the loaded ground; the unit is moved to its place and is simply not on screen.' }));
add('us-1c-2d', 'key', 'Jul 2 about 19:00 division hurried left, Coulter and Baxter hold a new line by 20:00-21:00', U('“left” is a direction and no place is named for the new line; Coulter is not a unit of the roster'));
add('us-1c-2d', 'night', 'Jul 1: Coulter breastworks behind Cemetery Hill', U('Coulter is not a unit of the roster (B.3 lists Paul and Baxter), so no unit is given this place'));
add('us-1c-2d', 'night', '13th Massachusetts on Cemetery Ridge south of the Bryan farm digging a rifle pit', S({ units: ['us-1c-2d-paul-13ma'], place: 'Cemetery Ridge', d: '07-01', np: 'night',
  act: { activity: 'build_works' }, note: '“south of the Bryan farm” is a position relative to the farm; the ridge is the printed place' }));
add('us-1c-2d', 'night', 'Jul 2: Coulter moves left about 19:00 to support III Corps, Emmitsburg Road about 22:00', U('Coulter is not a unit of the roster, so no unit is given this place'));
add('us-1c-2d', 'first', 'Jul 1: Coulter massed near the railroad embankment about 11:00 (OR-COULTER)', U('Coulter is not a unit of the roster; “massed” would be a formation (column_mass) for a unit that is not in the roster'));
add('us-1c-2d', 'first', 'Doubleday places Robinson’s arrival in the afternoon', U('“afternoon” has no clock in the ledger'));
add('us-1c-2d', 'first', 'late morning to early afternoon (W-D1)', U('no clock; ' + WHY.ARR));
add('us-1c-2d', 'left', 'Gap', U(WHY.GAP));

add('us-1c-3d', 'key', 'Jul 1 15:00-16:30 Biddle and Meredith overwhelmed on Seminary Ridge', S({ units: ['us-1c-3d-biddle', 'us-1c-1d-meredith'], place: 'Seminary Ridge', d: '07-01', t: '15:00', tt: '16:30' }));
add('us-1c-3d', 'key', 'Jul 3 Stannard flanks Pickett', U('no place named for the flank (Pickett’s line is not placed), date only'));
add('us-1c-3d', 'night', 'Seminary Ridge, then Cemetery Hill', S({ place: 'Cemetery Hill', d: '07-01', np: 'night', note: 'the night position is the second place; the first (Seminary Ridge) is the 15:00 entry for Biddle' }));
add('us-1c-3d', 'night', 'Jul 2: Stannard’s regiments join the Cemetery Ridge line about 18:00', S({ units: ['us-1c-3d-stannard'], place: 'Cemetery Ridge', d: '07-02', t: '18:00' }));
add('us-1c-3d', 'first', 'Jul 1 late morning to early afternoon (Biddle, Stone)', U('no clock; ' + WHY.ARR));
add('us-1c-3d', 'first', 'Stannard’s Vermont brigade: earliest documented sighting is the line on Jul 2 about 18:00', R('restates the 18:00 Jul 2 entry of the night cell (Cemetery Ridge line)', { units: ['us-1c-3d-stannard'], place: 'Cemetery Ridge', d: '07-02', t: '18:00', pb: 'the night cell of the same row (“the Cemetery Ridge line”)' }));
add('us-1c-3d', 'first', 'earlier arrival not in the notes (gap)', U(WHY.GAP));
add('us-1c-3d', 'left', 'Gap', U(WHY.GAP));

add('us-1c-art', 'key', 'Jul 1 15:00-16:30 20-22 guns on Seminary Ridge', S({ place: 'Seminary Ridge', d: '07-01', t: '15:00', tt: '16:30', note: 'applied to all the corps’ batteries; the 20-22 guns are not drawn (no battery of the roster has a stated gun count)' }));
add('us-1c-art', 'key', 'Jul 2 lunettes by about 16:00', U('a work to be finished, not the place of a battery; the lunettes have no mapped place'));
add('us-1c-art', 'night', 'Jul 1 night: Cemetery Hill / Stevens’ Knoll area', R(WHY.MULTI_R, { places: ['Cemetery Hill', 'Stevens’ Knoll'], d: '07-01', np: 'night' }));
add('us-1c-art', 'night', 'Jul 2: Wainwright commands guns on East Cemetery Hill and Stevens’ Knoll', R(WHY.MULTI_R, { places: ['East Cemetery Hill', 'Stevens’ Knoll'], d: '07-02', np: 'night' }));
add('us-1c-art', 'first', 'Jul 1 late morning (Hall replaces Calef about 10:00-10:45)', U('no place named; a relief of one battery by another'));
add('us-1c-art', 'left', 'Gap', U(WHY.GAP));

// ===== II Corps =====
add('us-2c', 'key', 'Jul 2 about 16:00-18:00 Caldwell’s division sent to the Wheatfield', S({ units: ['us-2c-1d'], place: 'The Wheatfield', d: '07-02', t: '18:00', dep: '16:00', note: 'a movement window: step-off at the start, arrival at the end' }));
add('us-2c', 'key', 'Jul 2 evening 1st Minnesota, Willard, Carroll', U(WHY.NOPL));
add('us-2c', 'key', 'Jul 3 Angle', R('date only, no clock (a stop needs a time)', { place: 'The Angle', d: '07-03' }));
add('us-2c', 'night', 'Jun 29: gap', U(WHY.GAP));
add('us-2c', 'night', 'Jun 30: Taneytown', U(WHY.OFF('Taneytown') + '; before the corps’ gate'));
add('us-2c', 'night', 'Jun 30 night/Uniontown: not confirmed', U('the ledger says “not confirmed”; Uniontown has no coordinate in the repository'));
add('us-2c', 'night', 'Jul 1: gap', U(WHY.GAP));
add('us-2c', 'night', 'Jul 2: Cemetery Ridge, left', S({ place: 'Cemetery Ridge', d: '07-02', np: 'night', note: '“left” is the left (south) part of the ridge; the ridge is the printed place' }));
add('us-2c', 'night', 'Jul 3: Cemetery Ridge, the Angle', S({ place: 'Cemetery Ridge', d: '07-03', np: 'night', note: 'the Angle is named as well; it lies on the ridge and inside the ridge’s sigma' }));
add('us-2c', 'first', 'Values conflict: about 22:30 Jul 1 (Wikipedia, Cemetery Ridge)', R('one of the conflicting values of the arrival (C-004); the arrival gate carries it as a scenario', { place: 'Cemetery Ridge', d: '07-01', t: '22:30' }));
add('us-2c', 'first', 'dawn Jul 2 (“pre-dawn/dawn”, 13th Mass)', U(WHY.ARR));
add('us-2c', 'first', 'about 06:00 (EPP)', U(WHY.ARR));
add('us-2c', 'first', 'about 07:00 (OR 27/1 p.369 via Freeman). see the gate table below', U(WHY.ARR));
add('us-2c', 'left', 'Gap (after Jul 5)', U(WHY.GAP));

add('us-2c-1d', 'key', '18:00 Wheatfield: Cross, Zook, Brooke, Kelly', S({ place: 'The Wheatfield', d: '07-02', t: '18:00', date_cell: 'first_on_field', pb: 'the date is printed in the first-on-field cell of the same row' }));
add('us-2c-1d', 'night', 'Jul 2 night: Cemetery Ridge / Wheatfield area', R(WHY.MULTI_R, { places: ['Cemetery Ridge', 'The Wheatfield'], d: '07-02', np: 'night' }));
add('us-2c-1d', 'night', 'Granite Schoolhouse is the division hospital Jul 2-3', U('a hospital, not a unit; the Granite Schoolhouse record in the repository has no geometry'));
add('us-2c-1d', 'first', 'Jul 2 on the Cemetery Ridge', R('date only, no clock: the arrival is the unit’s ledger gate', { place: 'Cemetery Ridge', d: '07-02' }));
add('us-2c-1d', 'first', 'engaged in the Wheatfield about 17:30-18:00', S({ place: 'The Wheatfield', d: '07-02', t: '17:30', tt: '18:00', date_cell: 'first_on_field' }));
add('us-2c-1d', 'left', 'Hospital moves after Jul 3 overshots', U('unparsed text in the ledger (“overshots” is unexplained); a hospital, not a unit'));

add('us-2c-2d', 'key', '18:30-19:00 1st Minnesota vs Wilcox', U(WHY.NOPL, { units: ['us-2c-2d-harrow-1mn'] }));
add('us-2c-2d', 'key', 'Cushing’s battery (4th US A) attached to Webb engages Wright', U(WHY.NOPL, { units: ['us-2c-art-4usa'] }));
add('us-2c-2d', 'key', 'Jul 3 the Angle', R('date only, no clock (a stop needs a time)', { place: 'The Angle', d: '07-03' }));
add('us-2c-2d', 'night', 'Jul 2 night: Cemetery Ridge center', S({ place: 'Cemetery Ridge', d: '07-02', np: 'night', note: '“center” is the middle of the ridge; the ridge is the printed place' }));
add('us-2c-2d', 'first', 'Jul 2 about 06:00 (EPP; per EPP the arriving II Corps unit is Gibbon’s division)', U(WHY.ARR));
add('us-2c-2d', 'left', 'Gap', U(WHY.GAP));

add('us-2c-3d', 'key', '18:00 Willard at Plum Run west vs Barksdale', U('Plum Run is a long stream (the gazetteer’s is 4.6 km wide), the cell does not say which stretch; the cell prints no date', { units: ['us-2c-3d-willard'] }));
add('us-2c-3d', 'key', '20:00 Carroll retakes Ricketts’ guns', U(WHY.NOPL, { units: ['us-2c-3d-carroll'] }));
add('us-2c-3d', 'night', 'Jul 2: Carroll to East Cemetery Hill about 20:00', S({ units: ['us-2c-3d-carroll'], place: 'East Cemetery Hill', d: '07-02', t: '20:00' }));
add('us-2c-3d', 'night', '71st Pa (Webb’s brigade) sent to Culp’s Hill', S({ units: ['us-2c-2d-webb-71pa'], place: 'Culp’s Hill', d: '07-02', np: 'night', note: 'no clock; the entry sits in the Jul 2 night entry, so the night convention is used' }));
add('us-2c-3d', 'night', 'Bliss farm held alternately Jul 2', U('held alternately by both armies; no unit and no time named'));
add('us-2c-3d', 'first', 'Jul 2 (time unstated; presumably with the corps)', U('no time and no place'));
add('us-2c-3d', 'left', 'Gap', U(WHY.GAP));

add('us-2c-art', 'key', 'Jul 2 Cushing with Webb', U(WHY.NOPL));
add('us-2c-art', 'key', 'Jul 3 cannonade', U(WHY.NOPL));
add('us-2c-art', 'night', 'Gap', U(WHY.GAP));
add('us-2c-art', 'first', 'Gap', U(WHY.GAP));
add('us-2c-art', 'left', 'Gap', U(WHY.GAP));

// ===== III Corps =====
add('us-3c', 'key', 'Jul 2 about 12:00-14:00 advance to Emmitsburg Road', S({ id: 'PO-05', place: 'Emmitsburg Road', d: '07-02', t: '14:00', dep: '12:00', req: true,
  note: 'A road is a line: the unit goes to the point of the road nearest where it stood. The window is carried as step-off 12:00, arrival 14:00; C-010 (Sickles’ advance, noon / 14:00 / 16:00) is not applied because its 16:00 value lies outside the printed window.' }));
add('us-3c', 'key', '18:00 collapse', U(WHY.NOPL));
add('us-3c', 'night', 'Jun 29-30: gap (III Corps near Bridgeport/Emmitsburg area is unconfirmed)', U(WHY.GAP));
add('us-3c', 'night', 'Jul 1: Birney on Cemetery Ridge', R('restates the dusk entry PO-04 (Cemetery Ridge); the unit already stands there', { units: ['us-3c-1d'], place: 'Cemetery Ridge', d: '07-01', np: 'night' }));
add('us-3c', 'night', 'Humphreys on the Black Horse Tavern road', R('the 2nd Division has no road of approach that crosses the loaded ground, so it is not drawn', { units: ['us-3c-2d'], place: 'Black Horse Tavern Road', d: '07-01', np: 'night' }));
add('us-3c', 'night', 'Jul 2: Peach Orchard salient', R('superseded: every division of the corps has its own night cell for Jul 2', { place: 'The Peach Orchard', d: '07-02', np: 'night' }));
add('us-3c', 'night', 'Jul 3: remnants', U(WHY.NOPL));
add('us-3c', 'first', 'Birney’s division: dusk Jul 1 (about 20:00) on Cemetery Ridge via the Emmitsburg Road (SS1, W-CEMR)', AP({ id: 'AP-02', unit: 'us-3c-1d', road: 'Emmitsburg Road', tier: 'inferred',
  note: 'The III Corps cell names Birney’s division, which is the 1st Division (us-3c-1d). The 2nd Division’s cell names the Black Horse Tavern road (AP-07).' }));
add('us-3c', 'first', 'alternative Jul 2 about 07:00 at the Little Round Top area (EPP)', R('the alternative value of the arrival (EPP, a weak source); recorded, not scheduled', { units: ['us-3c-1d'], place: 'Little Round Top', d: '07-02', t: '07:00' }));
add('us-3c', 'left', 'Jul 7 French replaces Sickles in III Corps command', U('a command change, not a movement'));

add('us-3c-1d', 'key', 'Jul 2 11:00 Berdan to Pitzer’s Woods', S({ units: ['us-3c-1d-ward-1ussharpshooters', 'us-3c-1d-ward-2ussharpshooters'], place: 'Pitzer’s Woods', d: '07-02', t: '11:00', note: 'Berdan’s two Sharpshooter regiments are the 1st and 2nd US Sharpshooters of Ward’s brigade (history/crosscheck.json)' }));
add('us-3c-1d', 'key', '16:30 Devil’s Den', S({ place: 'Devil’s Den', d: '07-02', t: '16:30', note: 'the ledger gives the place for the division; it does not say which brigade (applied to all)' }));
add('us-3c-1d', 'key', '17:30-18:00 Peach Orchard', S({ place: 'The Peach Orchard', d: '07-02', t: '17:30', tt: '18:00', note: 'the ledger gives the place for the division; it does not say which brigade (applied to all)' }));
add('us-3c-1d', 'night', 'Jul 2 night: Houck’s Ridge / Plum Run / Wheatfield area fallen back', R(WHY.MULTI_R + '; Plum Run is a long stream and is not entered as a place', { places: ['Houck’s Ridge', 'The Wheatfield'], d: '07-02', np: 'night' }));
add('us-3c-1d', 'first', 'Dusk Jul 1 (about 20:00)', S({ id: 'PO-04', place: 'Cemetery Ridge', d: '07-01', t: '20:00', np: null,
  note: 'The place comes from the III Corps cell (“on Cemetery Ridge via the Emmitsburg Road”), the time from this row.' }));
add('us-3c-1d', 'left', 'Gap', U(WHY.GAP));

add('us-3c-2d', 'key', 'Jul 2 about 12:00 advance 400-500 yards', AC({ activity: 'march', d: '07-02', t: '12:00', note: 'the text says “advance”; no place is named, so no stop' }));
add('us-3c-2d', 'key', '15:00 ordered toward Little Round Top then recalled', U('ordered and then recalled: the unit does not arrive; a direction, not a position'));
add('us-3c-2d', 'key', '18:00 collapse with about 45% losses', U(WHY.NOPL));
add('us-3c-2d', 'night', 'Jul 1 night: marching', U(WHY.PRE + ' (gate 00:00-02:00 Jul 2)'));
add('us-3c-2d', 'night', 'arrives on Cemetery Ridge', R('no clock: the arrival is the unit’s ledger gate (00:00-02:00 Jul 2)', { place: 'Cemetery Ridge', d: '07-02' }));
add('us-3c-2d', 'night', 'Jul 2: Emmitsburg Road', S({ place: 'Emmitsburg Road', d: '07-02', np: 'night' }));
add('us-3c-2d', 'first', 'Values conflict: about 00:00 Jul 2 (EPP) vs about 02:00 Jul 2 (SS1) after counter-marching at about 21:00 on the Black Horse Tavern road', AP({ id: 'AP-07', unit: 'us-3c-2d', road: 'Black Horse Tavern Road', tier: 'inferred',
  note: 'The cell prints the division on the Black Horse Tavern road at about 21:00 Jul 1, three hours before its gate. The mapped road lies wholly outside the loaded ground (it never crosses its edge), so it gives no entry and the division stays an open gap with that reason.' }));
add('us-3c-2d', 'left', 'Gap', U(WHY.GAP));

add('us-3c-art', 'key', 'Smith 14:00 four guns above Devil’s Den', S({ units: ['us-3c-art-4ny'], place: 'Devil’s Den', d: '07-02', t: '14:00', date_cell: 'first_on_field', note: 'Smith is the 4th NY battery (history/crosscheck.json: “4th NY (Smith)”); the four guns are not drawn' }));
add('us-3c-art', 'key', 'Bucklyn overrun about 17:30-18:00', U(WHY.NOPL, { units: ['us-3c-art-1rie'] }));
add('us-3c-art', 'night', 'Calef’s A, 2nd US (cavalry horse artillery) is near the Third Corps at night on Jul 1', U('“near the Third Corps” is not a place; Calef’s battery is not a battery of the corps in the roster'));
add('us-3c-art', 'first', 'Smith’s battery at Devil’s Den 09:00 Jul 2', S({ units: ['us-3c-art-4ny'], place: 'Devil’s Den', d: '07-02', t: '09:00' }));
add('us-3c-art', 'first', 'others gap', U(WHY.GAP));
add('us-3c-art', 'left', 'Gap', U(WHY.GAP));

// ===== V Corps =====
add('us-5c', 'key', 'Jul 2 16:00 ordered forward', U(WHY.NOPL));
add('us-5c', 'key', '16:30 Vincent on Little Round Top', S({ units: ['us-5c-1d-vincent'], place: 'Little Round Top', d: '07-02', t: '16:30' }));
add('us-5c', 'key', '17:00 Weed’s brigade', U(WHY.NOPL, { units: ['us-5c-2d-weed'] }));
add('us-5c', 'key', '18:00-18:30 Ayres in Wheatfield', S({ units: ['us-5c-2d'], place: 'The Wheatfield', d: '07-02', t: '18:00', tt: '18:30' }));
add('us-5c', 'key', 'dusk Fisher’s brigade', U(WHY.NOPL, { units: ['us-5c-3d-fisher'] }));
add('us-5c', 'key', '21:00 20th Maine on Round Top', S({ units: ['us-5c-1d-vincent-20me'], place: 'Big Round Top', d: '07-02', t: '21:00', note: '“Round Top” is the gazetteer alias of Big Round Top' }));
add('us-5c', 'night', 'Jun 29-30: Union Mills area unconfirmed (gap)', U(WHY.GAP));
add('us-5c', 'night', 'Jul 1 night: night march from Hanover (20th Maine)', AP({ id: 'AP-04', unit: 'us-5c-1d-vincent-20me', road: 'Hanover Road', tier: 'inferred',
  inf: 'the road named for the place it leads to (Hanover Road); the cell prints only “from Hanover”',
  note: 'The cell is about the night of Jul 1; the unit’s gate is the V Corps arrival (C-003), so it is drawn from that gate.' }));
add('us-5c', 'night', 'Jul 2: Power’s Hill reserve about 08:00', S({ place: 'Powers’ Hill', d: '07-02', t: '08:00' }));
add('us-5c', 'night', 'Little Round Top', S({ place: 'Little Round Top', d: '07-02', np: 'night', note: 'the entry sits in the Jul 2 night entry' }));
add('us-5c', 'night', 'Jul 3: Taneytown Road hospital, 3rd Div hospital near Two Taverns', U('hospitals, not units'));
add('us-5c', 'first', 'Values conflict: about 05:00 Jul 2 (EPP) vs about 08:00 (OR 27/1 p.592 via Freeman)', U(WHY.ARR));
add('us-5c', 'first', 'lead regiments about 07:00 (20th Maine on the heights southeast of town, from Chamberlain)', U('“the heights southeast of town” is not a place of the gazetteer; ' + WHY.ARR));
add('us-5c', 'left', 'Gap', U(WHY.GAP));

add('us-5c-3d', 'key', '19:00-19:30 counterattack toward the Wheatfield', U('a direction (“toward”), not a position; the McCandless counterattack is the activity clause of the first-on-field cell'));
add('us-5c-3d', 'key', 'evening wall-building on Little Round Top', AC({ activity: 'build_works', place: 'Little Round Top', d: '07-02', np: 'evening', date_cell: 'night_positions', note: 'the date is printed in the night cell of the same row' }));
add('us-5c-3d', 'night', 'Jul 2 night: Little Round Top / Round Top', R(WHY.MULTI_R, { places: ['Little Round Top', 'Big Round Top'], d: '07-02', np: 'night' }));
add('us-5c-3d', 'first', 'Gap (Fisher’s brigade is on the field at dusk Jul 2, two regiments near the summit by midnight', U('the ledger prints a gap for the arrival; “the summit” is not named'));
add('us-5c-3d', 'first', 'McCandless counterattacks about 19:00-19:30', AC({ units: ['us-5c-3d-mccandless'], activity: 'double_quick', d: '07-02', t: '19:00', tt: '19:30', date_cell: 'first_on_field', note: 'counterattacks: the foot clip for an advance at the attack is double_quick' }));
add('us-5c-3d', 'left', 'Gap', U(WHY.GAP));

// ===== VI Corps =====
add('us-6c', 'key', 'Jul 2 about 19:00 Nevin’s brigade counterattacks with Crawford', AC({ units: ['us-6c-3d-wheaton'], activity: 'double_quick', d: '07-02', t: '19:00', note: 'Nevin is the brigade the roster names Wheaton/Nevin' }));
add('us-6c', 'key', 'hospital north of the Trostle house near Goulden Road', U('a hospital, not a unit; ' + WHY.OFF('Goulden Road')));
add('us-6c', 'night', 'Jun 30: Manchester, Md', U(WHY.OFF('Manchester') + '; before the corps’ gate'));
add('us-6c', 'night', 'Jul 1 evening: orders about 20:00 and marching through the night, 30-35 miles', U(WHY.NOPL + '; before the corps’ gate (head about 14:00 Jul 2)'));
add('us-6c', 'first', 'Values conflict: head about 14:00 Jul 2 (Meade, per Hessler) vs main body at Rock Creek about 17:00 (SS2)', U(WHY.ARR));
add('us-6c', 'left', 'Jul 5 Sedgwick’s reconnaissance at Granite Hill hits Ewell’s rear guard', U(WHY.OFF('Granite Hill')));

// ===== XI Corps =====
add('us-11c', 'key', 'Jul 1 14:00 Steinwehr on Cemetery Hill', S({ units: ['us-11c-2d'], place: 'Cemetery Hill', d: '07-01', t: '14:00' }));
add('us-11c', 'key', '15:00-16:00 collapse', U(WHY.NOPL));
add('us-11c', 'key', 'Jul 2 19:30 Ames’s division defends East Cemetery Hill', S({ units: ['us-11c-1d'], place: 'East Cemetery Hill', d: '07-02', t: '19:30', note: '“defends” is the standing state a unit takes on arrival; no separate activity is added' }));
add('us-11c', 'key', 'Spangler farm hospital from mid-afternoon Jul 1', U('a hospital, not a unit; “mid-afternoon” has no clock'));
add('us-11c', 'night', 'Jun 30: Emmitsburg (Barlow’s division north of town)', U(WHY.OFF('Emmitsburg') + '; before the corps’ gate'));
add('us-11c', 'night', 'Jul 1: Cemetery Hill and Oak Ridge', R(WHY.MULTI_R, { places: ['Cemetery Hill', 'Oak Ridge'], d: '07-01', np: 'night' }));
add('us-11c', 'night', 'Jul 2: Cemetery Hill / East Cemetery Hill', R(WHY.MULTI_R, { places: ['Cemetery Hill', 'East Cemetery Hill'], d: '07-02', np: 'night' }));
add('us-11c', 'first', 'Jul 1: head about 12:30-13:00', U(WHY.NOPL));
add('us-11c', 'first', 'Howard’s report about 12:30', U(WHY.NOPL));
add('us-11c', 'first', 'before noon (W-D1)', U(WHY.NOPL + '; ' + WHY.ARR));
add('us-11c', 'left', 'Gap', U(WHY.GAP));

// ===== XII Corps =====
add('us-12c', 'key', 'Jul 2 06:00-10:00 works', AC({ activity: 'build_works', d: '07-02', t: '06:00', tt: '10:00', note: 'the place (Culp’s Hill) is in the night cell; a unit that arrives after 06:00 does not take it' }));
add('us-12c', 'key', '18:30 departure of Geary, Kane, Ruger', U('a departure with no destination named here (the night cell says “pulled to the left”)'));
add('us-12c', 'key', '23:00 Ruger at Spangler’s Spring', S({ units: ['us-12c-1d'], place: 'Spangler’s Spring', d: '07-02', t: '23:00', note: 'Ruger: the roster names the 1st Division Williams/Ruger (commanders printed: Williams, Ruger)' }));
add('us-12c', 'key', 'Jul 3 04:30 artillery opens', AC({ units: ['us-12c-art'], activity: 'serve_guns', d: '07-03', t: '04:30' }));
add('us-12c', 'night', 'Jun 29: Williams marches Frederick to Taneytown', U(WHY.OFF('Frederick') + '; before the corps’ gate'));
add('us-12c', 'night', 'Jun 30: Littlestown / Two Taverns (123rd NY at Two Taverns)', U(WHY.MULTI + '; before the corps’ gate'));
add('us-12c', 'night', 'Jul 1: bivouac nearer the Baltimore Pike', S({ place: 'Baltimore Pike', d: '07-01', np: 'night', act: { activity: 'camp' }, note: '“bivouac” is a camp; “nearer the Baltimore Pike” is a position relative to the pike, the pike is the printed place' }));
add('us-12c', 'night', 'Jul 2: Culp’s Hill works from about 06:00', S({ place: 'Culp’s Hill', d: '07-02', t: '06:00', act: { activity: 'build_works' } }));
add('us-12c', 'night', '18:30 five brigades pulled to the left', U('“left” is a direction; no place and the brigades are not named'));
add('us-12c', 'night', 'return overnight', U('no place and no clock'));
add('us-12c', 'first', 'Jul 1 evening on Culp’s Hill: 123rd NY works begin Jul 1', S({ units: ['us-12c-1d-mcdougall-123ny'], place: 'Culp’s Hill', d: '07-01', np: 'evening', act: { activity: 'build_works' } }));
add('us-12c', 'first', 'Williams’s division approaches 17:30, withdraws to the Baltimore Pike for the night', S({ units: ['us-12c-1d'], place: 'Baltimore Pike', d: '07-01', np: 'night', note: 'the 17:30 approach names no place; the night position is the pike' }));
add('us-12c', 'first', 'Geary on Cemetery Ridge 17:30', S({ units: ['us-12c-2d'], place: 'Cemetery Ridge', d: '07-01', t: '17:30' }));
add('us-12c', 'first', 'Lockwood’s brigade arrives Jul 2 about 08:00 from Baltimore', AP({ id: 'AP-03', unit: 'us-12c-1d-lockwood', road: 'Baltimore Pike', tier: 'inferred',
  inf: 'the road named for the place it leads to (Baltimore Pike); the cell prints only “from Baltimore”' }));
add('us-12c', 'left', 'Gap', U(WHY.GAP));

// ===== Cavalry Corps =====
add('us-cav-1d', 'key', 'Jul 1 07:30 contact', U(WHY.NOPL));
add('us-cav-1d', 'key', 'two hours delay', U(WHY.NOPL));
add('us-cav-1d', 'key', 'Jul 2 noon withdrawn (gone by 12:50)', U(WHY.DEST + '; the night cell says the sources conflict (Taneytown / Westminster / Emmitsburg)'));
add('us-cav-1d', 'key', 'Merritt: leaves Emmitsburg noon Jul 3', U(WHY.OFF('Emmitsburg') + '; also before Merritt’s own gate (about 15:00 Jul 3, derived from this cell)', { units: ['us-cav-1d-merritt'] }));
add('us-cav-1d', 'key', 'about 15:00 on the Emmitsburg Road', AP({ id: 'AP-05', unit: 'us-cav-1d-merritt', road: 'Emmitsburg Road', tier: 'inferred',
  note: 'Printed: Merritt about 15:00 on the Emmitsburg Road (Jul 3). Merritt’s own gate (about 15:00 Jul 3) is derived from this cell; the unit enters where the road crosses the edge of the loaded ground.' }));
add('us-cav-1d', 'night', 'Jun 30: camp about 400 yards east of McPherson Ridge', R('Gamble’s and Devin’s brigades have no road of approach; the 400 yards (366 m) lie inside the ridge’s sigma', { units: ['us-cav-1d-gamble', 'us-cav-1d-devin'], place: 'McPherson Ridge', d: '06-30', np: 'night' }));
add('us-cav-1d', 'night', 'Jul 1: gap', U(WHY.GAP));
add('us-cav-1d', 'night', 'Jul 2: after noon at Taneytown / Westminster / Emmitsburg (sources conflict)', U(WHY.MULTI + ' (sources conflict); ' + WHY.OFF('Taneytown')));
add('us-cav-1d', 'night', 'Jul 3: Westminster guarding trains', U(WHY.OFF('Westminster')));
add('us-cav-1d', 'first', 'Jun 30 about 11:00 enters Gettysburg', R('the division has no road of approach, so it is not drawn', { place: 'Gettysburg (the borough)', d: '06-30', t: '11:00' }));
add('us-cav-1d', 'left', 'Jul 3 Westminster', U(WHY.OFF('Westminster') + '; date only'));
add('us-cav-1d', 'left', 'Jul 4 onwards pursuit', U(WHY.DEST));

add('us-cav-2d', 'key', 'Jul 2 15:00 Brinkerhoff Ridge', S({ place: 'Brinkerhoff’s Ridge', d: '07-02', t: '15:00' }));
add('us-cav-2d', 'key', '17:00 2nd Va (Stonewall Bde) attack', U('the 2nd Virginia is a Confederate unit; no place'));
add('us-cav-2d', 'key', 'Jul 3 East Cavalry Field', R('date only, no clock (a stop needs a time)', { place: 'East Cavalry Field', d: '07-03' }));
add('us-cav-2d', 'night', 'Jul 2 night: Baltimore Pike, 1 mile east of Rock Creek (after 22:00)', S({ place: 'Baltimore Pike, 1 mile east of Rock Creek', d: '07-02', t: '22:00', note: '“after 22:00”: the start of the window' }));
add('us-cav-2d', 'first', 'Jul 2 noon at Hanover / Low Dutch Road junction', U('the Hanover Road and the Low Dutch Road meet in the repository only at the clipped east end of the road data (a clip, not a mapped junction)'));
add('us-cav-2d', 'left', 'Gap', U(WHY.GAP));

add('us-cav-3d', 'key', 'Jul 3 about 13:00 southwest of Big Round Top', U(WHY.REL));
add('us-cav-3d', 'key', '15:00 attacks', AC({ activity: 'gallop', d: '07-03', t: '15:00', note: 'attacks: the mounted clip for an advance at the attack is gallop' }));
add('us-cav-3d', 'key', 'Custer redirected to Gregg for East Cavalry Field', R('date only (Jul 3), no clock (a stop needs a time)', { units: ['us-cav-3d-custer'], place: 'East Cavalry Field', d: '07-03' }));
add('us-cav-3d', 'night', 'Jun 30: Hanover', U(WHY.OFF('Hanover') + '; before the division’s gate'));
add('us-cav-3d', 'night', 'Jul 2 night: gap', U(WHY.GAP));
add('us-cav-3d', 'night', 'Jul 3: Beitler farm about 08:00', U(WHY.OFF('Beitler farm')));
add('us-cav-3d', 'first', 'Jul 2 about 16:30 at Hunterstown (from where: gap)', R('the division has no road of approach (“from where: gap”), so it is not drawn', { place: 'Hunterstown', d: '07-02', t: '16:30' }));
add('us-cav-3d', 'first', 'Kilpatrick at Hanover on Jun 30', U(WHY.OFF('Hanover') + '; before the division’s gate'));
add('us-cav-3d', 'left', 'Jul 4 10:00 Kilpatrick moves out (Monterey Pass)', U(WHY.OFF('Monterey Pass') + '; a departure with a printed time but no destination in the gazetteer'));

add('us-art-reserve', 'key', 'Jul 2 16:00 McGilvery with five batteries to the Wheatfield Road', S({ units: ['us-art-reserve-mcgilvery'], place: 'Wheatfield Road', d: '07-02', t: '16:00' }));
add('us-art-reserve', 'key', 'Phillips arrives about 16:00', U('Phillips is not a unit of any list in the roster (history/ARRIVALS-NOTES.md)'));
add('us-art-reserve', 'key', 'Hart placed 16:30', U('Hart is not a unit of any list in the roster (history/ARRIVALS-NOTES.md)'));
add('us-art-reserve', 'key', 'Jul 3 reserve batteries brought up before dawn', U('“before dawn” is no clock and no place is named'));
add('us-art-reserve', 'night', 'Jul 2: camped on the Spangler farm (106 guns, about 2,300 men)', S({ place: 'Spangler farm', d: '07-02', np: 'night', act: { activity: 'camp' }, note: 'the 106 guns are not drawn (no battery of the roster has a stated gun count)' }));
add('us-art-reserve', 'first', 'Gap (arrival hours not found)', U(WHY.GAP));
add('us-art-reserve', 'left', 'Gap', U(WHY.GAP));

// ===== Army of Northern Virginia headquarters and I Corps =====
add('cs-anv-hq', 'key', 'Jul 2 05:15 (range) conference with Longstreet', U(WHY.CMD + '; ' + WHY.HQ));
add('cs-anv-hq', 'key', 'about 11:00 attack order', U(WHY.CMD + '; ' + WHY.HQ));
add('cs-anv-hq', 'key', 'Jul 3 watches from Spangler’s Woods', U(WHY.OFF('Spangler’s Woods') + '; ' + WHY.HQ));
add('cs-anv-hq', 'night', 'Jun 29: Chambersburg area (Lee orders concentration at Cashtown)', U(WHY.OFF('Chambersburg') + '; ' + WHY.HQ));
add('cs-anv-hq', 'night', 'Jun 30 evening: orders concentration around Cashtown', U('an order, not the headquarters’ position; ' + WHY.HQ));
add('cs-anv-hq', 'night', 'Jul 1 night: Thompson house, Seminary Ridge', R(WHY.HQ, { place: 'Thompson house', d: '07-01', np: 'night', pb: 'Thompson house is Lee’s headquarters; Seminary Ridge is the cell’s second name for the same area' }));
add('cs-anv-hq', 'night', 'Jul 2 night: same area, no council of war', R(WHY.HQ, { place: 'Thompson house', d: '07-02', np: 'night', pb: '“same area” as the Jul 1 entry' }));
add('cs-anv-hq', 'night', 'Jul 3 night: pulls army back to Seminary Ridge, council, summons Imboden 01:00 Jul 4', U(WHY.CMD + '; ' + WHY.HQ));
add('cs-anv-hq', 'first', 'Jul 1: Herr Ridge about 13:30 (SS1) or about 14:30 (W-D1)', R(WHY.HQ + '; two conflicting times (13:30 / 14:30), the first is carried', { place: 'Herr Ridge', d: '07-01', t: '13:30' }));
add('cs-anv-hq', 'left', 'Jul 4 afternoon wagon train', U(WHY.DEST));
add('cs-anv-hq', 'left', 'Jul 4 after dark infantry by the Fairfield road', U('“Fairfield road” is ambiguous in the repository (Hagerstown Road RD-010 or the Fairfield Road at the Peach Orchard RD-015); ' + WHY.HQ));

add('cs-1c', 'key', 'Jul 2 noon column departs Herr’s Ridge', S({ place: 'Herr Ridge', d: '07-02', t: '12:00', note: 'the place the column leaves from, at noon' }));
add('cs-1c', 'key', '13:30-15:00 countermarch', AC({ activity: 'march', d: '07-02', t: '13:30', tt: '15:00' }));
add('cs-1c', 'key', '15:00 McLaws deploys', FM({ units: ['cs-1c-mclaws'], formation: 'line', d: '07-02', t: '15:00', not_driving: 'applied as a formation event (contract 1.3) to every DRAWN unit under the named formation (src/history/real.mjs); whether any unit under it is drawn is reported in HISTORY-LAYER-NOTES.md', note: 'deploys: from column into line' }));
add('cs-1c', 'key', '15:30 Hood in Biesecker’s Woods', R('restated by the division’s own row (Hood, key positions); the division row drives the stop', { units: ['cs-1c-hood'], place: 'Biesecker’s Woods', d: '07-02', t: '15:30' }));
add('cs-1c', 'key', '16:30 attack', AC({ activity: 'double_quick', d: '07-02', t: '16:30', note: 'attack: the foot clip for an advance at the attack is double_quick' }));
add('cs-1c', 'night', 'Jun 26-30: gap (not found)', U(WHY.GAP));
add('cs-1c', 'night', 'Jul 1 night: Marsh Creek / within 2-4 miles of town', U(WHY.MULTI + ' (a stream, then a distance range)'));
add('cs-1c', 'night', 'Jul 2 night: Warfield Ridge / Peach Orchard', R(WHY.MULTI_R, { places: ['Warfield Ridge', 'The Peach Orchard'], d: '07-02', np: 'night' }));
add('cs-1c', 'night', 'Jul 3 night: gap', U(WHY.GAP));
add('cs-1c', 'first', 'Jul 1 17:30 march orders', U('an order, no place'));
add('cs-1c', 'first', 'Jul 2: divisions halt west of town overnight (McLaws about 00:00, Hood about 01:00)', AC({ d: '07-02', acts: [{ units: ['cs-1c-mclaws'], activity: 'halt', t: '00:00' }, { units: ['cs-1c-hood'], activity: 'halt', t: '01:00' }], note: 'halts: McLaws about 00:00, Hood about 01:00; “west of town” is no place of the gazetteer' }));
add('cs-1c', 'first', 'Hood behind Seminary Ridge 06:30 (range 05:30-07:30)', R('restated by the division’s own row (Hood, first on field); the division row drives the stop', { units: ['cs-1c-hood'], place: 'Seminary Ridge', d: '07-02', t: '06:30', tt: '07:30', date_cell: 'first_on_field', pb: 'Jul 2 from the preceding clause; behind (west of) the ridge: the ridge is the printed place' }));
add('cs-1c', 'first', 'McLaws 08:00 (range 08:00-08:30)', R('restated by the division’s own row (McLaws, first on field); the division row drives the stop', { units: ['cs-1c-mclaws'], place: 'Seminary Ridge', d: '07-02', t: '08:00', tt: '08:30', date_cell: 'first_on_field', pb: 'the preceding clause and the McLaws row (08:00 Jul 2 behind Seminary Ridge)' }));
add('cs-1c', 'left', 'Jul 4 after dark on the Fairfield road (Hill first, Longstreet second, Ewell third)', U('“Fairfield road” is ambiguous in the repository (Hagerstown Road RD-010 or the Fairfield Road at the Peach Orchard RD-015); the road is not chosen'));

add('cs-1c-mclaws', 'key', 'Jul 2 15:00 Millerstown Road / Warfield Ridge', R(WHY.MULTI_R + ' (a road and a ridge)', { places: ['Millerstown Road', 'Warfield Ridge'], d: '07-02', t: '15:00' }));
add('cs-1c-mclaws', 'key', '17:00 Kershaw steps off', AC({ units: ['cs-1c-mclaws-kershaw'], activity: 'march', d: '07-02', t: '17:00' }));
add('cs-1c-mclaws', 'key', '17:30-18:00 Barksdale and Wofford', U(WHY.NOPL, { units: ['cs-1c-mclaws-barksdale', 'cs-1c-mclaws-wofford'] }));
add('cs-1c-mclaws', 'night', 'halts about midnight (Marsh Creek about 4 miles out per EPP', AC({ activity: 'halt', d: '07-02', t: '00:00', note: 'Jul 1-2: about midnight is 00:00 Jul 2; Marsh Creek is a long stream (no place)' }));
add('cs-1c-mclaws', 'night', 'Kershaw within about 2 miles per Freeman)', U('a distance from the town, no place'));
add('cs-1c-mclaws', 'first', '08:00 Jul 2 behind Seminary Ridge', S({ place: 'Seminary Ridge', d: '07-02', t: '08:00', note: 'behind (west of) the ridge: the ridge is the printed place' }));
add('cs-1c-mclaws', 'left', 'Gap', U(WHY.GAP));

add('cs-1c-hood', 'key', 'Jul 2 15:30 Biesecker’s Woods', S({ place: 'Biesecker’s Woods', d: '07-02', t: '15:30' }));
add('cs-1c-hood', 'key', '16:30 step-off', AC({ activity: 'march', d: '07-02', t: '16:30' }));
add('cs-1c-hood', 'key', 'Jul 3 Law commands the division at the base of Big Round Top', R('date only, no clock (a stop needs a time)', { place: 'Big Round Top', d: '07-03', pb: '“at the base of” the hill: the hill is the printed place' }));
add('cs-1c-hood', 'night', 'Jul 1-2: Marsh Creek about 01:00', U('Marsh Creek is a long stream (the gazetteer’s is 4.4 km wide); the cell does not say where on it'));
add('cs-1c-hood', 'night', 'resumes 03:30', AC({ activity: 'march', d: '07-02', t: '03:30' }));
add('cs-1c-hood', 'night', 'Jul 2 night: Round Top / Devil’s Den and Plum Run', R(WHY.MULTI_R + '; Plum Run is a long stream and is not entered as a place', { places: ['Big Round Top', 'Devil’s Den'], d: '07-02', np: 'night' }));
add('cs-1c-hood', 'night', 'Jul 3 night: gap', U(WHY.GAP));
add('cs-1c-hood', 'first', '06:30 Jul 2 (range 05:30-07:30) behind Seminary Ridge', S({ place: 'Seminary Ridge', d: '07-02', t: '06:30', note: 'behind (west of) the ridge: the ridge is the printed place; the range 05:30-07:30 is not carried' }));
add('cs-1c-hood', 'first', 'Law’s brigade rejoins about noon after a march that began about 03:00 (EPP puts the start at 06:00)', AC({ units: ['cs-1c-hood-law'], activity: 'march', d: '07-02', t: '03:00', note: 'a march that began about 03:00 (EPP: 06:00); “rejoins” names no place' }));
add('cs-1c-hood', 'left', 'Gap', U(WHY.GAP));

add('cs-1c-pickett', 'key', 'Jul 3 by noon: three brigades west of the Emmitsburg Road', U(WHY.REL));
add('cs-1c-pickett', 'key', 'about 14:00-15:00 step-off', AC({ activity: 'march', d: '07-03', t: '14:00', tt: '15:00' }));
add('cs-1c-pickett', 'night', 'Jun 26-30: gap', U(WHY.GAP));
add('cs-1c-pickett', 'night', 'Jul 1: absent', U('the division was not on the field on Jul 1'));
add('cs-1c-pickett', 'night', 'Jul 2 night: Seminary Ridge area (disputed)', R('disputed: the row’s arrival is UNRESOLVED (C-021); recorded, not scheduled', { place: 'Seminary Ridge', d: '07-02', np: 'night' }));
add('cs-1c-pickett', 'night', 'Jul 3 night: gap', U(WHY.GAP));
add('cs-1c-pickett', 'first', 'UNRESOLVED: begins marching to Gettysburg 06:00 Jul 2 (EPP)', U(WHY.ARR + ' (C-021)'));
add('cs-1c-pickett', 'first', 'on the field the night of Jul 2 (W-D2, Phifer)', U(WHY.ARR + ' (C-021)'));
add('cs-1c-pickett', 'first', 'not until Jul 3 (SS2)', U(WHY.ARR + ' (C-021)'));
add('cs-1c-pickett', 'first', 'no order reached Pickett to be on the field by daylight Jul 3 (W-PC)', U(WHY.ARR + ' (C-021)'));
add('cs-1c-pickett', 'left', 'Jul 4 after dark, Fairfield road', U('“Fairfield road” is ambiguous in the repository (Hagerstown Road RD-010 or the Fairfield Road at the Peach Orchard RD-015); the road is not chosen'));

add('cs-1c-art', 'key', 'Jul 2 16:00 Huger’s four batteries and Cabell open', AC({ units: ['cs-1c-mclaws-cabell'], activity: 'serve_guns', d: '07-02', t: '16:00', note: 'open: the guns open fire; Huger’s four batteries are not a unit of the roster' }));
add('cs-1c-art', 'key', '18:00 six batteries to the Emmitsburg Road', U('which six batteries is not printed'));
add('cs-1c-art', 'key', 'Jul 3 04:00 Eshleman, Dearing, Cabell placed before daylight', U(WHY.NOPL));
add('cs-1c-art', 'night', 'Jul 2 night: Alexander replaces ammunition', U(WHY.NOPL));
add('cs-1c-art', 'first', 'Alexander: approaching 07:00, reaches the ridge about 09:00 Jul 2 (OR 27/2 p.429 and his report)', U('“the ridge” is not named'));
add('cs-1c-art', 'first', 'Eshleman, Cabell, Dearing, Henry: gap', U(WHY.GAP));
add('cs-1c-art', 'left', 'Gap', U(WHY.GAP));

// ===== Confederate II Corps =====
add('cs-2c', 'key', 'Jul 2 16:00 Benner’s Hill', U(WHY.OFF('Benner’s Hill') + ' (the D. Benner owner-label building symbols on the Warren sheet, STR-MAPSYM-0100..0106, lie in that area but name the farm, not the hill; owner to decide whether they may stand in for it)'));
add('cs-2c', 'key', '19:00-20:00 Culp’s Hill attack', R('corps-level summary: the divisions’ own rows name which division is at which place (Johnson at Culp’s Hill)', { place: 'Culp’s Hill', d: '07-02', t: '19:00', tt: '20:00' }));
add('cs-2c', 'key', '19:30 East Cemetery Hill', R('corps-level summary: the divisions’ own rows name which division is at which place (Early at East Cemetery Hill)', { place: 'East Cemetery Hill', d: '07-02', t: '19:30' }));
add('cs-2c', 'night', 'town and Oak Ridge approaches (Rodes', R('the heading of the list that follows: two places, and the brigades are named below', { places: ['the town', 'Oak Ridge'], d: '07-01', np: 'night', units: ['cs-2c-rodes'] }));
add('cs-2c', 'night', 'Ramseur, Doles halt in the streets', S({ units: ['cs-2c-rodes-ramseur', 'cs-2c-rodes-doles'], place: 'the streets', d: '07-01', np: 'night', act: { activity: 'halt' }, note: 'the text begins “Rodes, Ramseur, Doles”; Rodes is the division commander, so only the two named brigades are placed' }));
add('cs-2c', 'night', 'O’Neal rests beyond the railroad)', AC({ units: ['cs-2c-rodes-oneal'], activity: 'rest', d: '07-01', np: 'night', note: '“beyond the railroad” is a position relative to the line; no place' }));
add('cs-2c', 'night', 'Johnson east of town', U(WHY.REL, { units: ['cs-2c-johnson'] }));
add('cs-2c', 'first', 'Jul 1 about 11:00 hears the cannonade and turns toward Gettysburg (Rodes)', U('a direction, not a position; en route'));
add('cs-2c', 'first', 'about 14:30 Ewell’s right appears on Hill’s left', U(WHY.REL));
add('cs-2c', 'left', 'Jul 4 after dark (third in order)', U(WHY.DEST));

add('cs-2c-early', 'key', 'Jul 1 15:00-16:00 Barlow’s Knoll', S({ place: 'Barlow’s Knoll', d: '07-01', t: '15:00', tt: '16:00' }));
add('cs-2c-early', 'key', 'Jul 2 19:30 Hays and Avery on East Cemetery Hill', S({ units: ['cs-2c-early-hays', 'cs-2c-early-hoke'], place: 'East Cemetery Hill', d: '07-02', t: '19:30', note: 'Avery commands the brigade the roster names Hoke/Avery' }));
add('cs-2c-early', 'key', 'Smith’s brigade detached as flank guard on the Hunterstown road about 16:30', S({ units: ['cs-2c-early-smith'], place: 'Hunterstown Road', d: '07-02', t: '16:30', pb: 'Jul 2 from the preceding clause of the cell' }));
add('cs-2c-early', 'night', 'Jun 26: Gettysburg', R(WHY.PRE + ' (the division’s gate is Jul 1)', { place: 'Gettysburg (the borough)', d: '06-26', np: 'night' }));
add('cs-2c-early', 'night', 'Jun 27: leaves for York', U(WHY.PRE + '; York has no coordinate in the repository'));
add('cs-2c-early', 'night', 'Jun 29: York (Gordon rejoins from Wrightsville)', U(WHY.PRE + '; York has no coordinate in the repository'));
add('cs-2c-early', 'night', 'Jun 30: Heidlersburg area (unconfirmed, gap)', U('the ledger says “unconfirmed, gap”; ' + WHY.PRE));
add('cs-2c-early', 'night', 'Jul 1: town', S({ place: 'the town', d: '07-01', np: 'night' }));
add('cs-2c-early', 'night', 'Jul 2: ravine below East Cemetery Hill', U(WHY.REL + ' (an unnamed ravine)'));
add('cs-2c-early', 'first', 'Jun 26 occupies Gettysburg', R(WHY.PRE + ' (pre-battle: not a gate value)', { place: 'Gettysburg (the borough)', d: '06-26' }));
add('cs-2c-early', 'first', 'Jul 1 about 15:00-16:00 Barlow’s Knoll', R('restates the key-position entry for Barlow’s Knoll', { place: 'Barlow’s Knoll', d: '07-01', t: '15:00', tt: '16:00' }));
add('cs-2c-early', 'left', 'Jul 4', U(WHY.DEST + '; date only'));

add('cs-2c-rodes', 'key', 'Jul 1 14:00 attack', AC({ activity: 'double_quick', d: '07-01', t: '14:00', note: 'attack: the foot clip for an advance at the attack is double_quick' }));
add('cs-2c-rodes', 'key', 'Jul 2 21:00 Ramseur halts', AC({ units: ['cs-2c-rodes-ramseur'], activity: 'halt', d: '07-02', t: '21:00' }));
add('cs-2c-rodes', 'key', 'Jul 3 Daniel and O’Neal reinforce Johnson by about 04:00', U('the place (Johnson’s position) is not named here'));
add('cs-2c-rodes', 'night', 'Jun 29: Carlisle', U(WHY.OFF('Carlisle') + '; ' + WHY.PRE));
add('cs-2c-rodes', 'night', 'Jun 30: Heidlersburg (22+ miles)', R(WHY.PRE + ' (the division’s gate is Jul 1)', { place: 'Heidlersburg', d: '06-30', np: 'night' }));
add('cs-2c-rodes', 'night', 'Jul 1 night: town streets', S({ place: 'the streets', d: '07-01', np: 'night' }));
add('cs-2c-rodes', 'night', 'Jul 2: deploys late about 21:00 near East Cemetery Hill', S({ place: 'East Cemetery Hill', d: '07-02', t: '21:00', fm: 'line', note: '“near” the hill: the hill is the printed place. “deploys” is a change into line (formation hint, not applied)' }));
add('cs-2c-rodes', 'first', 'Jul 1 about 12:30 on Oak Hill (Carter first)', S({ place: 'Oak Hill', d: '07-01', t: '12:30' }));
add('cs-2c-rodes', 'left', 'Gap', U(WHY.GAP));

add('cs-2c-johnson', 'key', 'Jul 2 16:00 Latimer’s guns on Benner’s Hill', U(WHY.OFF('Benner’s Hill') + '; Latimer’s battalion is not a unit of the roster'));
add('cs-2c-johnson', 'key', '19:00-20:00 crosses Rock Creek', U('Rock Creek is a long stream (the gazetteer’s is 4.4 km wide); the crossing place is not named'));
add('cs-2c-johnson', 'key', 'Jul 3 04:00 reinforced', U(WHY.NOPL));
add('cs-2c-johnson', 'night', 'Jun 29-30: gap', U(WHY.GAP));
add('cs-2c-johnson', 'night', 'Jul 1 night: east of town near Culp’s Hill base', U(WHY.REL));
add('cs-2c-johnson', 'night', 'Jul 2 night: lower Culp’s Hill (Steuart in the lower works)', S({ place: 'Culp’s Hill', d: '07-02', np: 'night', note: '“lower” Culp’s Hill: the hill is the printed place' }));
add('cs-2c-johnson', 'night', 'Stonewall Brigade rejoins after dark', U(WHY.NOPL, { units: ['cs-2c-johnson-stonewall'] }));
add('cs-2c-johnson', 'first', 'Jul 1 about 19:00 east of town (EPP) or after sunset (SS1)', U(WHY.REL));
add('cs-2c-johnson', 'left', 'Gap', U(WHY.GAP));

// ===== Confederate III Corps =====
add('cs-3c', 'key', 'Jul 1 05:00 Heth marches', AC({ units: ['cs-3c-heth'], activity: 'march', d: '07-01', t: '05:00' }));
add('cs-3c', 'key', 'about 16:00 Pender’s assault', AC({ units: ['cs-3c-pender'], activity: 'double_quick', d: '07-01', t: '16:00', note: 'assault: the foot clip for an advance at the attack is double_quick' }));
add('cs-3c', 'night', 'Jun 29: Fayetteville (corps)', U(WHY.OFF('Fayetteville') + '; ' + WHY.PRE));
add('cs-3c', 'night', 'Cashtown (Heth), Pender follows', R(WHY.PRE + ' (the divisions’ gate is Jul 1)', { units: ['cs-3c-heth', 'cs-3c-pender'], place: 'Cashtown', d: '06-30', np: 'night' }));
add('cs-3c', 'night', 'Jul 1 night: two divisions stop at the front, Anderson about 2 miles behind', AC({ units: ['cs-3c-heth', 'cs-3c-pender'], activity: 'halt', d: '07-01', np: 'night', note: 'the two divisions at the front are Heth and Pender; “the front” and “2 miles behind” name no place' }));
add('cs-3c', 'first', 'Jul 1: Heth at Cashtown', R('date only: Heth at Cashtown before the 05:00 march (the unit’s gate is 07:30 Jul 1)', { units: ['cs-3c-heth'], place: 'Cashtown', d: '07-01' }));
add('cs-3c', 'first', 'corps at Fayetteville Jun 29', U(WHY.OFF('Fayetteville') + '; ' + WHY.PRE));
add('cs-3c', 'left', 'Jul 4 after dark (first in order)', U(WHY.DEST));

add('cs-3c-heth', 'key', 'Jul 1 10:20 Herr Ridge', S({ place: 'Herr Ridge', d: '07-01', t: '10:20' }));
add('cs-3c-heth', 'key', '12:30 Pettigrew and Brockenbrough arrive', U(WHY.NOPL, { units: ['cs-3c-heth-pettigrew', 'cs-3c-heth-brockenbrough'] }));
add('cs-3c-heth', 'key', '14:30 renewed attack', AC({ activity: 'double_quick', d: '07-01', t: '14:30', note: 'attack: the foot clip for an advance at the attack is double_quick' }));
add('cs-3c-heth', 'key', 'Jul 3 Pettigrew’s division in the charge', AC({ activity: 'double_quick', d: '07-03', note: 'date only: no clock, so not scheduled' }));
add('cs-3c-heth', 'night', 'Jun 29-30: Cashtown', R(WHY.PRE + ' (the division’s gate is Jul 1)', { place: 'Cashtown', d: '06-30', np: 'night' }));
add('cs-3c-heth', 'night', 'Jul 1 night: front', U('“the front” is not a place of the gazetteer'));
add('cs-3c-heth', 'first', 'Jun 29 Cashtown', R(WHY.PRE + ' (pre-battle: not a gate value)', { place: 'Cashtown', d: '06-29' }));
add('cs-3c-heth', 'first', 'Jun 30 Pettigrew’s brigade raid reaches Gettysburg’s edge, withdraws', U(WHY.REL + '; ' + WHY.PRE, { units: ['cs-3c-heth-pettigrew'] }));
add('cs-3c-heth', 'first', 'Jul 1 about 07:30 first contact', U(WHY.NOPL));
add('cs-3c-heth', 'left', 'Jul 14 rear guard at Falling Waters', U(WHY.OFF('Falling Waters')));

add('cs-3c-pender', 'key', 'Jul 1 16:00 assault', AC({ activity: 'double_quick', d: '07-01', t: '16:00', note: 'assault: the foot clip for an advance at the attack is double_quick' }));
add('cs-3c-pender', 'key', 'Jul 3 Trimble and Lane/Lowrance in the charge', AC({ activity: 'double_quick', d: '07-03', note: 'date only: no clock, so not scheduled' }));
add('cs-3c-pender', 'night', 'Jun 30: follows Heth to Cashtown', R(WHY.PRE + ' (the division’s gate is Jul 1)', { place: 'Cashtown', d: '06-30', np: 'night' }));
add('cs-3c-pender', 'night', 'Jul 1-3: front', U('“the front” is not a place of the gazetteer'));
add('cs-3c-pender', 'first', 'Jul 1 about 16:00 passes through Heth', U(WHY.NOPL));
add('cs-3c-pender', 'left', 'Gap', U(WHY.GAP));

add('cs-3c-anderson', 'key', 'Jul 2 noon-18:00 Wilcox, Lang, Wright attack', AC({ units: ['cs-3c-anderson-wilcox', 'cs-3c-anderson-perry', 'cs-3c-anderson-wright'], activity: 'double_quick', d: '07-02', t: '12:00', tt: '18:00', note: 'Lang commands the brigade the roster names Perry/Lang; attack: the foot clip for an advance at the attack is double_quick' }));
add('cs-3c-anderson', 'key', 'Posey and Mahone do not advance', AC({ units: ['cs-3c-anderson-posey', 'cs-3c-anderson-mahone'], activity: 'stand', d: '07-02', t: '12:00', tc: true, note: 'do not advance: they hold; the window is the one of the preceding clause (noon-18:00)' }));
add('cs-3c-anderson', 'night', 'Jun 30: ordered to march the morning of Jul 1', U('an order; before the division’s gate'));
add('cs-3c-anderson', 'night', 'Jul 1 night: about 2 miles behind the front', U(WHY.REL));
add('cs-3c-anderson', 'first', 'Jul 1 evening: bivouac about 2 miles behind the front', AC({ activity: 'camp', d: '07-01', np: 'evening', note: 'bivouac is a camp; “about 2 miles behind the front” names no place' }));
add('cs-3c-anderson', 'first', 'Jul 2 noon: reaches Seminary Ridge north of Pitzer’s Woods (SS2) / early afternoon (W-D2)', S({ place: 'Seminary Ridge', d: '07-02', t: '12:00', note: '“north of Pitzer’s Woods” locates the stretch of the ridge; the ridge is the printed place; the alternative “early afternoon” has no clock' }));
add('cs-3c-anderson', 'left', 'Gap', U(WHY.GAP));

// ===== Confederate cavalry =====
add('cs-cav-div', 'key', 'Jul 2 early to mid afternoon reaches Lee', U('no clock; Lee’s position is not a place of the gazetteer'));
add('cs-cav-div', 'night', 'Jun 25 leaves Salem Depot 01:00 with Hampton, F. Lee, Chambliss', U(WHY.OFF('Salem Depot') + '; ' + WHY.PRE));
add('cs-cav-div', 'night', 'Jun 28 crosses the Potomac at Rowser’s Ford about 03:00', U(WHY.OFF('Rowser’s Ford') + '; ' + WHY.PRE));
add('cs-cav-div', 'night', 'Jun 29 Westminster', U(WHY.OFF('Westminster') + '; ' + WHY.PRE));
add('cs-cav-div', 'night', 'Jun 30 Hanover fight', U(WHY.OFF('Hanover') + '; ' + WHY.PRE));
add('cs-cav-div', 'night', 'Jun 30-Jul 1 night march to Dover', U(WHY.OFF('Dover') + '; ' + WHY.PRE));
add('cs-cav-div', 'night', 'Jul 1 evening Carlisle', U(WHY.OFF('Carlisle') + '; ' + WHY.PRE));
add('cs-cav-div', 'first', 'See the cavalry rows below', U('a pointer to the brigade rows'));
add('cs-cav-div', 'left', 'Jul 4 retreat assignments', U(WHY.DEST));

add('cs-cav-hampton', 'key', 'Jul 3 East Cavalry Field', R('date only, no clock (a stop needs a time)', { place: 'East Cavalry Field', d: '07-03' }));
add('cs-cav-hampton', 'night', 'Jul 2 night: camped north of Gettysburg', AC({ activity: 'camp', d: '07-02', np: 'night', note: '“north of Gettysburg” is a position relative to the town: no place; the camp is shown where the unit stands' }));
add('cs-cav-hampton', 'first', 'After Hunterstown on Jul 2: arrives at dusk to night (rear guard at Hunterstown, Jul 2 about 16:30 to dark)', AP({ id: 'AP-06', unit: 'cs-cav-hampton', road: 'Hunterstown Road', tier: 'inferred',
  inf: 'the road named for the place it leads to (Hunterstown Road); the cell prints only “after Hunterstown”',
  note: 'The rear guard at Hunterstown (about 16:30 to dark) is part of the same clause; the brigade is drawn from its gate (19:32 Jul 2, rule 4).' }));
add('cs-cav-hampton', 'left', 'Jul 4 with wagons and ambulances', U(WHY.DEST));

add('cs-cav-flee-chambliss', 'key', 'Jul 3 ECF 11:00 Cress Ridge', S({ place: 'East Cavalry Field', d: '07-03', t: '11:00', note: 'Cress Ridge has no coordinate in the repository; East Cavalry Field (ECF), also printed, is the place' }));
add('cs-cav-flee-chambliss', 'night', 'Jul 2 night: behind Seminary Ridge area / Cress Ridge approach (gap)', U('the ledger says gap; two places'));
add('cs-cav-flee-chambliss', 'first', 'Jul 2 evening (brigades arrive that evening)', U(WHY.ARR));
add('cs-cav-flee-chambliss', 'left', 'F. Lee left flank on Jul 4', U(WHY.DEST));

add('cs-cav-jenkins', 'key', 'Jul 3 ECF, out of ammunition', R('date only, no clock (a stop needs a time)', { place: 'East Cavalry Field', d: '07-03' }));
add('cs-cav-jenkins', 'night', 'Where wounded: gap', U(WHY.GAP));
add('cs-cav-jenkins', 'first', 'Jun 29 at Carlisle with Ewell', U(WHY.OFF('Carlisle') + '; ' + WHY.PRE));
add('cs-cav-jenkins', 'first', 'attached to Stuart Jul 3', U('a command attachment, not a position'));
add('cs-cav-jenkins', 'left', 'Gap', U(WHY.GAP));

add('cs-cav-robertson-jones-imboden', 'key', 'Jul 4-5 Imboden’s train', U(WHY.NOPL));
add('cs-cav-robertson-jones-imboden', 'key', 'Jones and Robertson guard passes', U('the passes are not named'));
add('cs-cav-robertson-jones-imboden', 'night', 'Imboden Jul 2: gap', U(WHY.GAP));
add('cs-cav-robertson-jones-imboden', 'first', 'Not engaged at Gettysburg main field (left guarding Virginia passes)', U('not on the main field'));
add('cs-cav-robertson-jones-imboden', 'first', 'Jones’s Laurel Brigade fights at Fairfield Jul 3', U(WHY.OFF('Fairfield')));
add('cs-cav-robertson-jones-imboden', 'left', 'Gap', U(WHY.GAP));
