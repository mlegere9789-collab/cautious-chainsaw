// The 20 story stars of the Monuments layer (array `mA` of the entry bundle), re-derived on 2026-10-19 (docs/data-audit/STORY-STARS.md has the evidence per star).
// This file is the single source of the star data: tools/t0/mon/build-mon.mjs turns it into the patches of MON.json, tools/t0/mon/stars-audit.mjs and tests/t0/monuments.spec.mjs
// measure a built tree against it.  Fields:
//   id, name         the star's id and the name the card and the search list show
//   unit_id          the order-of-battle unit the story is about (glow, selection on Jump)
//   lat, lng         the monument: a record of the 512-monument array `_A` (geo.rec = index in that array) or, where the array has none, the National Park Service marker as
//                    OpenStreetMap maps it (geo.osm = node id; tools/t0/data/sources/osm-monuments.json or the Overpass API of 2026-10-19)
//   tick, day        the moment of the story on the corrected clock (docs/data-audit/STORY-STARS.md says how each was derived)
//   label            the story text as it stands in the stack CLOCK + DATA (null = unchanged); a string replaces it
//   note             one more line on the card (what the Park does not mark, where sources disagree, what the animation does not draw); null = none
//   gapM             distance in metres from the star to the linked unit as the animation draws it at `tick` in the stack R1c + CLOCK + DATA (stars-audit.mjs --write refreshes it)
export const SPEC = [
  { id: 'mon_20me_lrt', name: '20th Maine Infantry', unit_id: 'U-20ME', lat: 39.789476, lng: -77.236146, tick: 267, day: 2, geo: { rec: 173 }, label: null, note: null },
  { id: 'mon_15al_lrt', name: "Law's Alabama Brigade (15th Alabama)", unit_id: 'C-15AL', lat: 39.7896546, lng: -77.2374679, tick: 268, day: 2, geo: { osm: 7128731222 },
    label: "15th Alabama — Col. Oates's regiment struck the left of the 20th Maine's line. His report says he ordered a charge and that the enemy, reinforced, then charged him five times and was repulsed; the count of four assaults by his own men and the story of a company sent for water come from his postwar account, not from the reports",
    note: "No Park monument marks the 15th Alabama on Little Round Top (the Park lists its tablet on Confederate Avenue with the rest of Law's brigade). The star stands at the Park's tablet for Law's Alabama brigade on the south-west slope of the hill, near the 83rd Pennsylvania's monument." },
  { id: 'mon_iron_brig', name: 'Iron Brigade Monument', unit_id: 'U-I-1-1', lat: 39.83491, lng: -77.25441, tick: 28, day: 1, geo: { rec: 219 }, label: null, note: null },
  { id: 'mon_reynolds', name: 'Reynolds Death Site', unit_id: 'U-I-1-1', lat: 39.834392, lng: -77.250954, tick: 28, day: 1, geo: { rec: 84 },
    label: 'General Reynolds killed here about 10:15 AM July 1 as the First Corps went into action (Wadsworth and Doubleday; Howard gives 11:15)', note: null },
  { id: 'mon_cushing', name: 'Cushing Battery A', unit_id: 'U-ART-A4US', lat: 39.81315, lng: -77.235733, tick: 549, day: 3, geo: { rec: 55 }, label: null, note: null },
  { id: 'mon_armistead', name: 'Armistead Monument', unit_id: 'C-I-3-3', lat: 39.81319, lng: -77.23583, tick: 551, day: 3, geo: { rec: 14 }, label: null, note: null },
  { id: 'mon_hancock', name: 'Hancock Wounded', unit_id: 'U-II', lat: 39.808769, lng: -77.237076, tick: 554, day: 3, geo: { rec: 66 },
    label: "Hancock wounded here late in the repulse of Pickett's Charge, after Armistead fell (about 3:35 PM) and before the assault collapsed (about 4 PM); no report gives the minute (Hancock, Veazey). Meade reports Hancock and Gibbon both severely wounded. His own dispatch says he was shot with a tenpenny nail and did not leave the field until the victory was secure",
    note: null },
  { id: 'mon_140pa', name: '140th Pennsylvania Infantry', unit_id: 'U-140PA', lat: 39.79765, lng: -77.246225, tick: 290, day: 2, geo: { rec: 446 }, label: null,
    note: 'The brigade marched toward the Wheatfield about 4 PM and the division received its orders between 4 and 5 PM (Fraser, Caldwell); the animation draws this regiment from about 6:45 PM.' },
  { id: 'mon_83pa', name: '83rd Pennsylvania Infantry', unit_id: 'U-83PA', lat: 39.789957, lng: -77.236969, tick: 267, day: 2, geo: { rec: 405 }, label: null,
    note: "Woodward's report puts the regiment in position at 2:30 PM and the first attack at 3:15 PM; the 44th New York next to it puts the position at about 4 PM (Conner). The clock follows the latter." },
  { id: 'mon_irish_brig', name: 'Irish Brigade Monument', unit_id: 'U-II-1-2', lat: 39.797052, lng: -77.245093, tick: 290, day: 2, geo: { rec: 332 }, label: null,
    note: 'Kelly puts the order to advance at about 5 PM and the fight at about three quarters of an hour; the animation draws the brigade from about 6:30 PM.' },
  { id: 'mon_1mn', name: '1st Minnesota Infantry', unit_id: 'U-1MN', lat: 39.806631, lng: -77.235021, tick: 302, day: 2, geo: { rec: 222 },
    label: "1st Minnesota — Charged an advancing Confederate column on Hancock's order to gain time (Fox names Wilcox's brigade; Hancock's report says a regiment); Fox counts 224 casualties of 262 engaged for the battle (215 on July 2), the highest percentage of any Union regiment in a single battle in his tables",
    note: null },
  { id: 'mon_72pa', name: '72nd Pennsylvania (Fire Zouaves)', unit_id: 'U-72PA', lat: 39.813032, lng: -77.2357, tick: 549, day: 3, geo: { rec: 398 }, label: null, note: null },
  { id: 'mon_26nc', name: '26th North Carolina Infantry', unit_id: 'C-26NC', lat: 39.834715, lng: -77.254605, tick: 95, day: 1, geo: { rec: 36 }, label: null,
    note: "The animation does not draw this regiment's fight on the afternoon of July 1; it shows the survivors in bivouac that evening." },
  { id: 'mon_16vt', name: '16th Vermont Infantry', unit_id: 'U-16VT', lat: 39.809134, lng: -77.236551, tick: 548, day: 3, geo: { rec: 486 },
    label: "16th Vermont — Under Stannard's orders changed front twice against the flanks of the Confederate columns during Pickett's Charge, taking the colors of the 2nd Florida and 8th Virginia. For most of its men it was their first battle (Stannard).",
    note: null },
  { id: 'mon_20nc', name: "Iverson's Brigade (20th North Carolina)", unit_id: 'C-20NC', lat: 39.8478378, lng: -77.2431519, tick: 53, day: 1, geo: { osm: 6691429275 },
    label: "Iverson's brigade, Oak Ridge — the 20th NC served in the brigade whose attack was cut down by musketry from behind a stone wall (Rodes); many of the brigade's men were surrounded and captured, and the 97th New York reports bringing in 213 men of the 20th NC with their colors (Wheelock)",
    note: "No separate Park monument for the 20th North Carolina was found. The star stands at the Park's tablet for Iverson's brigade at Oak Hill." },
  { id: 'mon_barlow', name: 'Barlow Monument', unit_id: 'U-XI-1-1', lat: 39.84545, lng: -77.22642, tick: 57, day: 1, geo: { rec: 49 }, label: null, note: null },
  { id: 'mon_6wis', name: '6th Wisconsin Infantry', unit_id: 'U-6WI', lat: 39.83741, lng: -77.24813, tick: 37, day: 1, geo: { rec: 494 }, label: null, note: null },
  { id: 'mon_avery', name: "Hoke's Brigade (Avery mortally wounded)", unit_id: 'C-II-1-2', lat: 39.8279479, lng: -77.2255626, tick: 322, day: 2, geo: { osm: 7275995199 }, label: null,
    note: "The Park marker for the place where Avery fell was not found. The star stands at the Park's tablet for Hoke's brigade, which he commanded." },
  { id: 'mon_hood', name: "Hood's Division (Hood wounded)", unit_id: 'C-I-2-1', lat: 39.7901371, lng: -77.2543415, tick: 260, day: 2, geo: { osm: 7128877974 },
    label: "Hood wounded in the arm early in the attack of July 2 (Lee's dispatch of July 4 says in the arm); no report gives the hour, later estimates run from about 4 to 5 PM",
    note: "The reports do not say where Hood fell. The star stands at the Park's tablet for his division, on South Confederate Avenue." },
  { id: 'mon_greene', name: "Greene's Brigade — Culp's Hill", unit_id: 'U-XII-2-3', lat: 39.819865, lng: -77.220127, tick: 320, day: 2, geo: { rec: 63 }, label: null, note: null },
];
