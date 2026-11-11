// THE ENGAGEMENT CLAUSE TABLE: the printed windows in which a formation is in a fight, read from the rows of the PDF master timeline (GOVERNANCE/timeline_seed.jsonl, timeline_windows.jsonl).
// tools/build-engagements.mjs turns this table into data/engagements.json and REFUSES to run if a row is missing, a phrase is not literally in the row, a unit is not in the roster, or the
// window is not the row's own printed window.
//
// Reading rules (the same for every clause; the owner decides any other reading):
//  * only a row that prints BOTH ends of a window (parse_status "range" in timeline_windows.jsonl) gives a window; the window is the row's, not narrowed or widened;
//  * the one exception is a row with a point time AND a printed duration for the same fight ("under 30 min"): then the window is [point, point + that duration], basis "point_plus_printed_duration",
//    and the duration phrase must be literally in the row;
//  * a row names the formations that fought; a unit takes the windows of every formation above it (a regiment takes its brigade's, division's, corps' windows), nothing else;
//  * a row that is about arrival, movement, headquarters, weather or light is not an engagement and is not here; a row that names only the other side is not applied to the unnamed side;
//  * the row stays seeded_unverified (the project Law): the window tier is "inferred" at best, never documented; the OR27 audit verdict of the row (library/timeline_audit_T*.jsonl) is carried beside it, and a
//    row the audit CONTRADICTS is kept (the PDF row is the project default) with its verdict visible.
// phrases: every phrase must occur in the row text with the cell separators " | " turned into spaces and white space collapsed (apostrophes and quotation marks as printed).
export const CLAUSES = [
  // ---- Jul 1
  { id: 'EN-001', row: 'T1-098', units: ['us-1c-1d-meredith', 'cs-3c-heth-archer'], phrases: ['Iron Brigade hits Archer'], note: 'Herbst Woods: the Iron Brigade against Archer' },
  { id: 'EN-002', row: 'T1-103', units: ['us-1c-1d-cutler-147ny'], phrases: ['147th NY', 'stays and loses 207 of 380'], note: 'the 147th NY holds Cutler’s line; the regimental figure printed in the row is NOT used (see CASUALTIES-NOTES.md)' },
  { id: 'EN-003', row: 'T1-107', units: ['us-1c-1d-meredith', 'cs-3c-heth-archer'], phrases: ['Iron Brigade takes prisoners', 'Archer’s brigade'], note: 'the Iron Brigade captures Archer’s party' },
  { id: 'EN-004', row: 'T1-108', units: ['us-1c-1d-meredith-6wi', 'us-1c-1d-cutler-95ny', 'us-1c-1d-cutler-84ny', 'cs-3c-heth-davis'], phrases: ['6th WI (Lt. Col. Dawes), 95th NY, 84th NY', 'vs Davis’s brigade', 'hand-to-hand'], duration: { phrase: 'under 30 min', minutes: 30 }, note: 'the railroad cut; the row prints a point (about 11:00) and “under 30 min”' },
  { id: 'EN-005', row: 'T1-126', units: ['cs-2c-rodes'], phrases: ['Rodes’ division', 'uncoordinated attack on I Corps’ right flank'], note: 'Rodes’ division attacks from Oak Ridge' },
  { id: 'EN-006', row: 'T1-129', units: ['cs-2c-rodes-iverson', 'us-1c-2d-baxter'], phrases: ['Iverson’s brigade (NC) vs Baxter’s six regiments'], note: 'Iverson against Baxter' },
  { id: 'EN-007', row: 'T1-131', units: ['cs-2c-rodes-oneal'], phrases: ['O’Neal’s brigade', 'Attacks piecemeal, repulsed'], note: 'O’Neal attacks and is repulsed (the defenders are not named in the row)' },
  { id: 'EN-008', row: 'T1-145', units: ['us-11c-1d', 'cs-2c-early'], phrases: ['Barlow’s division', 'Early’s division', 'Gordon attacks'], note: 'Barlow’s Knoll' },
  { id: 'EN-009', row: 'T1-147', units: ['us-1c-3d-biddle', 'us-1c-1d-meredith', 'cs-3c-heth-pettigrew'], phrases: ['Biddle’s brigade', 'Meredith’s Iron Brigade', 'vs Pettigrew'], note: 'Pettigrew’s assault on the McPherson Ridge line; the regimental figures printed in the row are NOT used' },
  { id: 'EN-010', row: 'T1-148', units: ['us-1c-3d-stone', 'cs-2c-rodes-daniel'], phrases: ['Stone’s “Bucktail” brigade vs Daniel'], note: 'the pike and the railroad cut' },
  { id: 'EN-011', row: 'T1-161', units: ['us-1c-2d-paul-16me'], phrases: ['16th Maine (Col. Tilden)', 'Rear guard'], note: 'the 16th Maine rear guard; the regimental figure printed in the row is NOT used' },
  // ---- Jul 2
  { id: 'EN-012', row: 'T2-143', units: ['us-3c-1d-ward-124ny'], phrases: ['124th New York (Ellis, Cromwell)', 'Counterattacks'], note: 'Houck’s Ridge' },
  { id: 'EN-013', row: 'T2-144', units: ['cs-1c-hood-law'], phrases: ['Law’s brigade', 'First attacks'], note: 'Law on the south-west slope of Little Round Top' },
  { id: 'EN-014', row: 'T2-151', units: ['us-3c-1d-ward-20in', 'us-3c-1d-ward-99pa', 'us-3c-1d-ward-4me', 'us-3c-1d-trobriand-40ny'], phrases: ['20th Indiana; 99th Pennsylvania; 4th Maine; 40th NY; 6th NJ'], note: 'Houck’s Ridge (the 6th NJ is not in the roster’s III Corps and is not applied)' },
  { id: 'EN-015', row: 'T2-152', units: ['cs-1c-hood-anderson', 'us-3c-1d-trobriand'], phrases: ['G. T. Anderson’s brigade', 'Trobriand’s brigade', 'repulsed'], note: 'Anderson hits the gap by Trobriand’s brigade' },
  { id: 'EN-016', row: 'T2-160', units: ['us-3c-1d-trobriand-3mi', 'cs-1c-mclaws-kershaw'], phrases: ['3rd Michigan (Pierce) vs Kershaw’s brigade'], note: 'Peach Orchard' },
  { id: 'EN-017', row: 'T2-184', units: ['us-2c-2d-harrow-1mn', 'cs-3c-anderson-wilcox'], phrases: ['1st Minnesota (Colvill, Harrow’s brigade)', 'Charges Wilcox’s brigade'], note: 'the 1st Minnesota’s charge; the regimental figure printed in the row is NOT used' },
  { id: 'EN-018', row: 'T2-185', units: ['cs-3c-anderson-perry', 'us-1c-3d-stannard-13vt', 'cs-3c-anderson-wright', 'us-2c-2d-harrow-15ma', 'us-2c-2d-harrow-82ny', 'us-2c-2d-webb'], phrases: ['Lang’s Floridians', '13th Vermont recaptures them', 'Wright’s Georgia brigade overruns the 15th Massachusetts and 82nd NY', 'Webb’s brigade repels Wright'], note: 'Emmitsburg Road and the Codori farm' },
  { id: 'EN-019', row: 'T2-192', units: ['cs-2c-johnson-steuart', 'cs-2c-johnson-nicholls', 'cs-2c-johnson-jones', 'us-12c-2d-greene'], phrases: ['Johnson’s division: Steuart, J. M. Williams (Nicholls’s Louisiana), J. M. Jones', 'vs Greene'], note: 'the first attack on Culp’s Hill' },
  { id: 'EN-020', row: 'T2-193', units: ['us-5c-3d-mccandless', 'cs-1c-mclaws-wofford'], phrases: ['Crawford’s Pennsylvania Reserves (McCandless)', 'Wofford pushed back to Stony Hill'], note: 'the counterattack toward the Wheatfield' },
  { id: 'EN-021', row: 'T2-194', units: ['cs-1c-mclaws-wofford', 'cs-1c-hood-anderson', 'cs-1c-mclaws-semmes', 'cs-1c-mclaws-kershaw'], phrases: ['Wofford; Anderson, Semmes, Kershaw', 'Wofford advances; the others push east'], note: 'Wheatfield Road' },
  { id: 'EN-022', row: 'T2-202', units: ['cs-2c-johnson-steuart', 'us-12c-2d-greene-149ny', 'us-12c-2d-greene-137ny'], phrases: ['Steuart’s brigade', 'against the 149th and 137th NY'], note: 'Culp’s Hill, the lower swale' },
  { id: 'EN-023', row: 'T2-204', units: ['us-12c-2d-greene-137ny'], phrases: ['137th NY (Ireland)', 'loses nearly a third'], note: 'the 137th NY on Greene’s right' },
  { id: 'EN-024', row: 'T2-205', units: ['cs-2c-johnson-jones', 'us-12c-2d-greene-60ny', 'cs-2c-johnson-nicholls', 'us-12c-2d-greene-78ny', 'us-12c-2d-greene-102ny'], phrases: ['Jones’s brigade vs 60th NY', 'Nicholls’s brigade vs 78th and 102nd NY'], note: 'Culp’s Hill' },
  { id: 'EN-025', row: 'T2-158', units: ['us-cav-2d', 'cs-2c-johnson-stonewall'], phrases: ['D. M. Gregg’s division', '2nd Va (Stonewall Brigade, Walker)'], note: 'Brinkerhoff Ridge, the Hanover Road (the Union side is the division as named; the 2nd Va is a regiment of the Stonewall Brigade and the brigade takes the window)' },
  // ---- Jul 3
  { id: 'EN-026', row: 'T2-242', units: ['cs-2c-johnson-steuart'], phrases: ['Opens on Steuart’s brigade in the works'], note: 'Union artillery on Steuart’s brigade (the batteries are not named in the row)' },
  { id: 'EN-027', row: 'T3-039', units: ['cs-2c-johnson-steuart', 'us-12c-2d-greene', 'us-12c-2d-kane'], phrases: ['Steuart’s brigade attacks', 'Greene’s and Kane’s lines'], note: 'the dawn attack on Culp’s Hill; the row’s hour is disputed (Hunt 04:30 vs 05:30)' },
  { id: 'EN-028', row: 'T3-085', units: ['us-cav-2d-mcintosh', 'cs-cav-hampton'], phrases: ['McIntosh (right of Hampton)', 'Flank attacks'], note: 'East Cavalry Field (the row prints about 40 minutes of fighting; the window is the row’s 13:30-13:45)' },
  { id: 'EN-029', row: 'T3-109', units: ['us-cav-1d-merritt', 'cs-1c-hood-benning', 'cs-1c-hood-anderson'], phrases: ['Merritt’s Reserve Bde', 'Anderson’s Georgians', 'Benning’s Georgians'], note: 'Bushman’s woods and the Slyder farm' },
  { id: 'EN-030', row: 'T3-110', units: ['cs-3c-heth-pettigrew', 'cs-1c-pickett-garnett', 'cs-1c-pickett-kemper', 'cs-1c-pickett-armistead'], phrases: ['Pettigrew’s and Pickett’s men', 'slow the advance'], note: 'the advance across the Emmitsburg Road fences' },
  { id: 'EN-031', row: 'T3-112', units: ['cs-1c-pickett-garnett', 'cs-1c-pickett-kemper', 'cs-1c-pickett-armistead', 'us-2c-2d-webb'], phrases: ['Garnett (mortally wounded), Kemper (wounded), Armistead', 'The fight at the wall'], note: 'the Angle and the Copse' },
];
