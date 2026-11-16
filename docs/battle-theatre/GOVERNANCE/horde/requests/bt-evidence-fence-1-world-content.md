# Request to bt-world-content: structures, schedule and works changes from the fence-1 evidence close-out

From: bt-evidence (shard fence-1). Date: 2026-11-13, revised 2026-11-14 (wave 4), 2026-11-15 (wave 5) and 2026-11-16 (wave 6: E-02, E-04, E-12, E-13, E-14, E-15, E-17, E-18, S-002, S-005, S-007, S-008, S-010, S-012, S-013, S-014 changed; each wave-6 line is marked WAVE 6 or named in the row; wave 5 of 2026-11-15: E-03, E-04, E-05, E-07, E-08, E-10, E-12, E-13, E-14, E-17, E-18, S-002, S-004, S-005, S-007 (CORRECTION: 10:30 not 10:50), S-008, S-010, S-012, S-013, S-016 changed; wave 4: S-003, S-004, S-008, S-016, E-01, E-02, E-04, E-11, E-12, E-13, E-14, E-17, E-18, S-002, S-005, S-006, S-007, S-012, S-014 changed). Files you own and this note asks you to change: `docs/battle-theatre/structures/structures.json`, `state_schedule.json`, `works_stages.json`, `app/data/works3d.json` (and the scenario/default files that read them). I changed none of them.

Why: `GOVERNANCE/evidence_corrections/fence-1.jsonl` re-checked every citation of rows R14.E-01..E-18 and S-001..S-016 against the Official Records and added exact evidence; several rows now contradict the PDF-seeded records. Each change below names the row, the new value, its tier and the source; the quotes, report ids, pages and offsets are in the jsonl. Keep every PDF value as a selectable scenario; the defaults below are recorded as DD-FENCE1-xx in the delegated decisions.

The exact changes, by record:

### R14.E-01 (records: E-01, G-02, FEN-seminary-ridge, S-010, S-011) - verdict partially_supported

- E-01 works record: crew = Paul's First Brigade regiments (16th ME, 13th MA, 94th NY, 104th NY, 107th PA) instead of 'I Corps remnants'; start window 11:00-13:00 (inferred), built before 14:00; keep the 104th NY order-countermanded note
- E-01 dimensions: 'about 600 yd' must be shown as an open gap (plausible-procedural), not documented; form selectable: circular redoubt (Small 1886), semicircular line (Toombs 1888) or a line parallel to the Seminary through the west edge of the grove (McFarland, OR); purpose 'the line to which the division could fall back' (Bates 1875, documented-secondary)
- S-010: window 'before about 16:00' stays as the latest bound; earliest bound from 11:00; fences row stays inferred
- G-02 guns: 22 (Hunt, four batteries) default, twelve-concentrated (Wainwright) selectable; the 20 stays PDF-only
- E-01 overrun hour: selectable scenarios 'turned after 4 p.m.' (Cooper, Union), 'advance ordered about 4 o'clock' (Pender, Confederate clock) and 'line gone by about 5:00 p.m.' (NPS); no default; the PDF's 16:00-16:30 stays labelled as the range between the first two

### R14.E-02 (records: E-02, S-014) - verdict partially_supported

- E-02 works record: builder units documented = 6th Wisconsin (own initiative, dozen spades) and 7th Indiana (by command), placed by Hancock's order; clock window stays an inferred default 18:00-21:00 with its gap mark; do not show 'logs' as documented for Jul 1 evening
- S-014: keep 'about 18:00-21:00' tier inferred; remove 'first' from the trigger text
- E-02: add the 24th Michigan (remnant of the Iron Brigade) as an early builder on Culp's Hill on 'the first night of the battle' (Curtis 1891, documented-secondary): its line is the left of the Iron Brigade's new line, 'from the top of the elevation to the foot of the hill facing the town'; keep the clock 18:00-21:00 inferred and the fabric ('logs') a gap

### R14.E-03 (records: E-03, P-09, S-015) - verdict corrected

- E-03 / S-015: start window moves from Jul 1 (date only) to Jul 2 after about 09:00 and before about 16:00; PDF Jul 1 stays selectable as 'contradicted by the regiment's own report' (already DD-03)
- E-03 stone wall distance: show about 75 yd (Ruger) as the documented value; 10 rods marked blocked_host
- P-09 (stone wall behind the First Brigade's works): pre-existing, no construction state

### R14.E-04 (records: E-04, S-020, FEN-evergreen-cemetery, P-02, P-03) - verdict corrected

- E-04 must not be built as a construction event for Cemetery Hill as a whole; keep the stone fences (pre-existing, P-02/P-03) and the per-gun earthworks (E-12) as the documented state; S-020 'Occupied and fortified (vague)' becomes 'Occupied; stone fences as cover; per-gun earthworks at dusk' (tier documented) with the 'fortified' wording marked gap
- S-045 / FEN-evergreen-cemetery: add the scenario 'fences smashed Jul 3 about 13:00 (Howard)'; Jul 2 is now documented-secondary (see the wave-6 line below)
- Gates's rail-fence breastwork moves to E-17 (Cemetery Ridge)
- E-04 lunette scenarios (same as E-12): default per the OR ('light earthworks at dusk by the battery crews'); selectable 'Steinwehr's division built solid lunettes with level platforms during Jul 1' (Bates 1875, Curtis 1891: documented-secondary, disputed) and 'only shallow holes for wheels and trails at about 15:00-15:30 Jul 1' (Hancock 1878, primary witness); the wording 'fortified' on S-020 carries the marker 'attributed to Steinwehr in books of 1875-1914; no 1863 report'
- E-04: add a short breastwork at the 61st Ohio's position on Cemetery Hill (south of the town), existing by the morning of Jul 2 (OR27-1-R258; builder and form open, so a plausible-procedural low earth-and-stone breastwork): it does not turn Cemetery Hill into a 'fortified hill' as a whole
- S-045 / FEN-evergreen-cemetery: fences down by Jul 2 (Breck's letter of Jul 2, documented-secondary) and further smashed in the cannonade of Jul 3 about 13:00 (Howard): both are state changes, the Jul 2 one is no longer only the PDF's scenario

### R14.E-05 (records: E-05, S-023, S-024) - verdict partially_supported

- E-05 works record: start 06:00 Jul 2 (documented) replaces any Jul 1-2 night start; finish windows 09:00-12:00 as selectable (Jones 10:00 default is documented; Greene noon)
- E-05 fabric: close log fence + cordwood battening + earth where tools; 'rails' are documented for the 149th NY (Barnum) so the PDF's 'no rails' is not general; no head logs or boughs unless a source is found (mark as gap if drawn); the 149th NY dates its march to the line at about 04:00 (conflict with 06:00, both selectable)
- E-05 height: no single point (DD-FENCE1-28, DD-FENCE1-20): a window of about 20 inches to five feet drawn as a marked plausible-procedural gap, with three selectable figures: five feet (the 'elaborate log-crib' works of Culp's Hill in general, NPS CLR), an average of about 20 inches (NPS 1940, read from the Brady and Tipton photographs, for the line from Spangler's Spring to Culp's Hill) and 'not more than three feet' (Olmsted, via the NPS, for the Federal breastworks in general); none is a per-regiment height; do not take profiles from the works restored in 1882
- E-05 / E-08: add an abatis in front of the Twelfth Corps works on Culp's Hill from the morning of Jul 2 (documented: Slocum R271, Price R280; extent and form open): felled trees with their branches toward the enemy, plausible-procedural beyond the word

### R14.E-06 (records: E-06, S-023, S-025) - verdict corrected

- E-06: traverse may be built on screen by the 137th NY in the Jul 2 morning window with length about 20 yd (documented-secondary); height and profile stay labelled gaps; before this, the previous note 'do not render a traverse in the morning' is lifted
- E-06: draw the traverse at the angle of the works with the line prolonged back through the woods at right angles toward the Baltimore pike (documented-secondary: Bachelder 1873); height and profile stay marked gaps

### R14.E-07 (records: E-07, S-024) - verdict partially_supported

- E-07: window 06:00 to before sundown (default: morning to early afternoon, selectable), builder Kane's brigade (111th PA, Cobham commanding until Kane's arrival at 06:00)
- E-07: the 111th Pa.'s rifle-pit of logs and stone on the right of the Baltimore pike (Second Brigade) is built from the forenoon of Jul 2 and finished in about three hours (documented): use as the build duration of one Second Brigade work; the brigade's works are left a little before dark

### R14.E-08 (records: E-08) - verdict corrected

- E-08: remove 'Lockwood's brigade (position unconfirmed)' from the Jul 2 builder list; Lockwood enters the lower works on Jul 3 (08:00) as an occupant, no construction
- E-08: add 'rails, timber and stone' for the Third Brigade (documented)
- E-08 / fences: the 3rd Wisconsin (Colgrove's brigade) threw down stone walls and fences in its front on Jul 2 (Hawley, OR27-1-R292 p.823): add a fence/wall removal state change on the east bank of Rock Creek in front of Colgrove's line, Jul 2 morning (documented; place only as 'in my front')
- E-08: the First Division's works have per-brigade clocks: Williams' orders 8 a. m., Ruger's about 9 a. m., McDougall's brigade moved about 11 a. m. and 'immediately built' its breastworks (front line about 40 paces ahead of the stone wall), the 27th Ind. and 107th NY start about daybreak to 8 a. m. and the 107th NY's are finished about 19:00, the 46th Pa.'s 'in the afternoon': carry the 9 and 11 o'clock clocks as a selector, no default; the stone fence behind the works is less than 50 yd (Williams) or about 75 yd (Ruger)

### R14.E-09 (records: E-09, S-041, S-050) - verdict partially_supported

- E-09/S-041: the 18:30 change is an occupation (garrison spread to one man per foot) not a construction; the two clocks 18:30 (First Division) and 19:00 (Geary's brigades) are both documented; 750 reinforcements = 400 XI Corps + about 350 First Corps; 800 yd stays marked inferred

### R14.E-10 (records: E-10, S-042) - verdict confirmed

- E-10 / S-042: keep both scenarios selectable; clock window 19:00-20:00 for the start (documented bounds), the PDF's 22:00 upper bound moves to 'enemy attacks ended about 22:00'
- E-10 / E-09: add a Jul 2-3 night construction on the lower hill: new breastworks at right angles to the old line (2nd Mass.) and on the extreme right resting on Rock Creek (13th NJ, from about midnight), built while the Confederates held part of the old works; this is the only documented construction of the night, not an extension at 18:30

### R14.E-11 (records: E-11, S-050, S-056, P-08) - verdict corrected

- E-11: rounds default 277,000 (OR) with 227,000 and 250,000 selectable; bombardment 03:30-04:00 start, 25 minutes of fire in two bursts as the documented default, longer values selectable; damage state of the works stays a gap and must not be drawn as documented
- E-11: Union cannonade duration is a selector: about 25 minutes in two bursts (Geary, OR) or from 4 a.m. to 10 a.m. with short intervals (5th Maine battery history, 1898); 20 guns documented (Muhlenberg's fourteen and Knap's battery); '24 guns / 5 batteries' stays a PDF scenario marked unsupported

### R14.E-12 (records: E-12, G-03) - verdict partially_supported

- E-12 / G-03 works records: builders = battery crews (Cooper B-1st Pa. four lunettes; Wiedrich I-1st NY; Breck L-1st NY; Stewart B-4th US), start dusk Jul 1, finish morning Jul 2; keep 'lunette' as the form label with the 1863 profile marked a gap; do not use the 30-in figure for 1863
- E-12 start window moves from 'between Jul 1 evening and noon Jul 2 (inferred)' to documented dusk Jul 1 to morning Jul 2
- E-12: three selectable builder/fabric scenarios: battery crews, light earthworks at dusk and lunettes finished in the morning (OR, default); Steinwehr's division, solid lunettes with 'smooth and perfectly level platforms' during Jul 1 (Bates, Curtis); shallow holes for wheels and trails only at about 15:00-15:30 (Hancock); the 'solid, level platform' look appears only in the second

### R14.E-13 (records: E-13, P-14) - verdict corrected

- E-13 must not be 'no_construction': add a hasty stone defense for the 83rd PA (Jul 2 about 14:30-15:15, documented), built by the regiment; keep Company B's wall as pre-existing; the other three regiments stay 'no works found' (gap, not a fact)
- E-13: add a small breastwork for the 44th NY on its stony side-hill position during Jul 2 (documented-secondary, 'We threw up a small breast-work'); at the 16th Michigan's front carry 'no stone breastworks on Jul 2, thrown up the night of Jul 3 principally by Crawford's division' (Hamilton 1892, via NPS) as a selectable alternative to the NPS 'night of Jul 2'
- E-13: on the southeast slope (Vincent Spur) add a defensive stone wall built in 1863 (documented-secondary, unit and hour open; length, height and profile are gaps, the 1890s restoration is not an 1863 profile); the property stone walls dismantled for the breastworks are a state change of existing features (which ones is a gap)

### R14.E-14 (records: E-14, P-14) - verdict partially_supported

- E-14 / S-043: replace the single builder by two documented scenarios: (A) Weed's brigade at night Jul 2 (Garrard), (B) Fisher's Reserves morning Jul 3 (Fisher); keep both; start window night Jul 2 to morning Jul 3; PDF 'five regiments + Ohio battery' stays a labelled PDF scenario; DD-05 'walls built' is confirmed by Garrard and Fisher
- No 1863 profile from the rebuilt LRT walls
- E-14 builder and clock scenarios on the slope: (A) Weed's brigade at night Jul 2 (Garrard; 91st Pa. 'during the night'; 140th NY 'in the dark'), default; (A2) the 146th NY told to erect a rough wall before the attack of Jul 2 (1915 history via NPS); (B) Fisher's Reserves morning Jul 3; (C) Crawford's division night Jul 3 at the 16th Michigan's front (Hamilton 1892); the 'Ohio battery' stays a PDF-only builder marked unsupported
- E-14: the building window of the slope walls runs from 'immediately before and during battle' (NPS report; the 146th NY's instruction) through the night of Jul 2 and Jul 3 morning to the end of the occupation on Jul 5 ('extended and refined', NPS inventory); the stones come from dismantled property walls and boulders; the rebuilt 1882-1887 walls are not an 1863 profile

### R14.E-15 (records: E-15, G-06, S-038) - verdict partially_supported

- E-15 / S-038: first-fire window moves to 'on arrival about 16:30' (documented), the 17:45 stays a PDF scenario; hauling method becomes a selector with the three accounts; no epaulement drawn (gap)
- E-15: the hauling-method selector gains the NPS page's by-hand account (documented-secondary, no basis); still no default; first fire 17:45 and 'no epaulement' stay marked gaps

### R14.E-16 (records: E-16, P-05) - verdict partially_supported

- E-16: keep 'no works found' as a gap-marked state for Ward's brigade (not a fact); add an unplaced scenario 'stone wall defense works near Devil's Den, builder and date open (NPS)'

### R14.E-17 (records: E-17, P-01, FEN-emmitsburg-road, FEN-cemetery-ridge-walls, S-062) - verdict corrected

- E-17 must change from open_gap/'no source' to documented works: add works records (builder unit, material, window) for (1) Robinson's division Jul 1 17:00-22:00 on the line left of Cemetery Hill / along the Emmitsburg road, (2) Harrow's 15th Mass. and 82nd NY Jul 2 16:00-17:00 at the brick house, 80th NY/151st Pa. Jul 2 evening, (2b) the 69th Pa. rail-and-stone work of the morning of Jul 2 at its position in Webb's brigade (documented, page image), (3) the Jul 3 regimental works listed above (the 13th Vermont's forenoon rail work under Sgt Scott included); each as a short rail/stone breastwork, dimensions marked gap (no 1863 profile; the one printed height is 'a little over knee-high' for one regiment's work in Harrow's brigade)
- FEN-emmitsburg-road: fences torn down by Harrow's regiments from about 16:00 Jul 2 (and earlier removal north of Klingel per NPS): do not show an intact Emmitsburg Road fence in front of the brick house after 16:00 Jul 2; RULE-03 not violated (works are after Jul 2 begins)
- DD-02 (Cemetery Ridge breastworks built on screen) is confirmed and widened; 'July 2 gap south of the Copse' stays unevidenced
- FEN-cemetery-ridge-walls and the Angle wall remain pre-existing (no construction animation); rail works are additions beside them
- E-17: add traverses at right angles to the Emmitsburg-road stone wall at the south edge of the town, about thirty feet apart ('at the time of the battle', Bachelder 1873; day and builder open; the wall pre-existed): a spacing, not a profile
- E-17: add a Jul 2 morning work for the 126th NY (Willard's brigade, Hays's division) on the crest near the Cemetery, built hastily of 'a low stone wall, and an old rail fence' (documented-secondary, about 08:00 to about 18:30); the 69th Pa. rail-and-stone work is dated the morning of Jul 2 (page image of the OR report)
- E-17: add Jul 3 morning works for Caldwell's First Division of the Second Corps (units and clocks in sub-claim o): short breastworks, earthworks or rifle-pits in front of each regiment's line, begun early on the morning of the 3d, serviceable before noon; the 116th Pa.'s begins after Hancock moved the line forward and is 'quite formidable' by 11:00; no rails are named, so draw them as earth and stones (plausible-procedural fabric), not as rail piles
- E-17: the 20th Mass. rifle-pit of the night of Jul 2 to 3 has a printed profile (a foot deep, a foot high, one shovel, 'too thin to stop anything more than a spent ball'): use it as the documented size of an overnight single-shovel work; the NPS 'earth against a low stone fence topped with rails' stays a selectable second form for the same regiment
- E-17: show a 'slight breastwork along the entire crest' at the Artillery Reserve's position on the morning of Jul 3 (Tyler) as a documented, low line (one officer's statement for the crest he rode); keep the continuity of the whole ridge a marked gap; add the artillery earthworks of the First Volunteer Brigade (McGilvery) and of Dow's battery on the morning of Jul 3 (R13 gun positions)
- E-17 / FEN-cemetery-ridge-walls: the Angle wall's 1863 state: 'certainly not over two feet high' with three or four rails stake and rider on top, thrown down in places on Jul 2 to let the guns through and rails used at the gaps and elsewhere (NPS 'Common Pride' quoting accounts; documented-secondary, partial): a state of the pre-existing wall, not a construction animation; the NPS seminar essay on Wright's attack has only one small opening for the artillery on the evening of Jul 2 (Brown's guns): the number of gaps is a selectable value
- E-17: the Hall and Harrow line on Jul 3 may carry the fabric value 'rails covered with earth' with rifle pits and shallow trenches in front (documented-secondary, Ashe 1901; builder, hour and length open); defense works at the edge of the tree line north and west of the Brien house (NPS Brien study, Brady photograph) are a selectable work record with no dimensions

### R14.E-18 (records: E-18, G-14, S-009) - verdict corrected

- E-18: replace the whole-row open gap by dated Confederate works: Middle Street barricade (Jul 2 morning), Ewell's hill works (Jul 3-4 night), Hood's Warfield Ridge works (Jul 4), the Seminary Ridge ridge-long works (Jul 4); the units are Confederate and arrive/stand as documented; Jul 2-3 stays a marked gap for the other sites
- E-18: add Confederate entrenchments in McMillan Woods and earthworks through Shultz Woods after Pickett's Charge (Jul 3 afternoon-evening, documented-secondary) and Johnson's division breastworks on the Forney farm (1863, day open)
- E-18: show the stone wall just north of Spangler's Spring as Confederate breastworks (pre-existing wall, no construction) from the night of Jul 2 to the morning of Jul 3 (NPS 1940, documented-secondary)
- E-18: add a Confederate 'earthworks built in 1863, day not stated' state for McMillan Woods, Pender's Division (Seminary Ridge), Poague's lunettes and Spangler Woods (NPS inventory), marked as a dated gap; the documented Jul 3-4 builds stay as listed
- E-18: add a Confederate rock breastwork on the Round Top slopes early on Jul 3 (4th Alabama; OR27-2-R443; the report says 'the mountain'): a line of piled rock, built before the morning's fighting and held until late in the afternoon; the 'no Confederate works Jul 2-3' gap stays true for Seminary Ridge, Oak Hill and Benner's Hill
- E-18: add a Confederate rifle-pit line in front of Seminary Ridge for the afternoon of Jul 3 (documented-secondary, participant 1901; builder, day and length open, plausible-procedural low earth pits); Oak Hill, Benner's Hill and Seminary Ridge on Jul 2 stay gap-marked

### R14.S-001 (records: bld-rock-creek-rr-bridge, S-001) - verdict corrected

- S-001: default date Jun 26 (evening) documented; Jun 27 stays a PDF scenario; the bridge object keeps the Rock Creek railroad bridge, damage state 'centre span burnt (fell in: likely reading of a smeared word), two spans standing badly damaged' (documented-secondary, newspaper)

### R14.S-002 (records: bld-pennsylvania-hall#cupola, S-002) - verdict partially_supported

- S-002: split the signal-post event into the Jun 30 post (building scenario: the steeple of the college per Norton; the cupola of the Seminary building per the NPS) and the Jul 1 posts (the Seminary cupola in the morning; one of Howard's signal officers on the College cupola at 08:30, Jacobs); both tier documented for the event; the identity of the college building (Pennsylvania Hall or another) stays inferred
- S-002: add the Jul 1 morning state 'Seminary cupola used by Buford and his signal officer' (documented-secondary: Bates quoting the signal officer, Toombs, NY monuments, Bachelder); the Jun 30 'steeple of the college' (Norton) stays a separate selectable object; the Pennsylvania Hall identity: see the S-002 CORRECTION below
- S-002: the College cupola is a feature of the College's main building (octagonal, 17 ft across and 24 ft high, with observatory: History of Adams County 1886): model it on that building, tier documented for the cupola; the building name 'Pennsylvania Hall' is documented as an NPS name of the College's main building (see the S-002 CORRECTION below)
- S-002 CORRECTION: 'Pennsylvania Hall' is a documented name (NPS 1988) for the College's main building that served as observation post and signal station during the battle (day not stated): the cupola of the College is documented as a post; the Jun 30 and Jul 1 attribution of single posts to each building stays as in the earlier consequences; the cupola's own description (octagonal, 17 ft across, 24 ft high, observatory) is from 1886

### R14.S-003 (records: FEN-mcpherson-railroad-grade, S-003) - verdict partially_supported

- S-003: on the McPherson farm show, from the evening of Jun 30, about a quarter mile of post and rail fence cut down by Buford's cavalry and a cord of rails burned (documented-secondary, partial: NPS Historic Structures Report); 'along the railroad grade' stays a marked gap (blocked page) and the critic's 'no change' scenario stays selectable; no default among them is chosen here

### R14.S-004 (records: bld-presbyterian-church, H-01, S-004) - verdict corrected

- S-004 / H-01: the Presbyterian church is a hospital from Jul 1 after noon (documented: 8th Illinois Cavalry's wounded moved there from the depot hospital); the PDF's Jun 30 stays a labelled scenario that rests on the marker page; do not show the church as a Jun 30 hospital as a fact

### R14.S-005 (records: FEN-gamble-cavalry, S-005) - verdict corrected

- S-005: start clock 'from about 08:00' (documented) replaces 07:30 (PDF scenario, unsupported); add the right-angle rail work near Calef's battery (documented-secondary, builder Gamble's brigade) as a works record
- S-005: label the ground with the names of the 1863 reports (McPherson's woods, McPherson's barn, McPherson's farm); 'McPherson Ridge' has no hit in OR parts 1-3 and is shown as the PDF's name
- S-005 / S-006: add a fence-line use on the afternoon of Jul 1 north of the college grounds (the Eleventh Corps 'making the fences their line of defence', Sanitary Commission report 1863): documented-secondary, no fence type or length
- S-005: the Iron Brigade held the Herbst Woods line from the lull of the late morning to the afternoon of Jul 1 without the rail barricade on the crest that its colonels asked for (documented-secondary: the request was refused); do not draw a barricade on the crest of McPherson's Ridge before the afternoon of Jul 1

### R14.S-006 (records: FEN-chambersburg-pike, S-006) - verdict partially_supported

- S-006 / FEN-chambersburg-pike: fence type becomes a per-reach selector (paling near the seminary, Virginia worm north of the pike at the McPherson Farm, post-and-rail elsewhere as PDF scenario); presence on Jul 1 stays documented
- S-006: at the McPherson farm fences stood on both sides of the pike on Jul 1 (three participants of the 6th Wisconsin's charge, documented-secondary) with the type a selector: a rail fence of unnamed type (Dawes), new post-and-rail on the north and an old fence on the south (Fairfield), stake and rider (Sullivan); the paling near the seminary (Wainwright) and the Virginia worm fence of the NPS stay as scenarios; no whole-pike type is chosen
- S-006 CORRECTION: do not use 'post and rail (Dawes)' for the McPherson-farm stretch: Dawes's Gettysburg chapter names no type (fence rails, two turnpike fences); the type stays a selector among Fairfield (new post-and-rail north, old south), Sullivan (stake and rider), the NPS (Virginia worm, north side) and the rail fence of unnamed type

### R14.S-007 (records: P-12, S-007) - verdict partially_supported

- S-007: window stays inferred 'about 10:30-11:30'; the cut is pre-existing (no construction state)
- S-007 (see the correction below): the 95th NY monument inscription gives the hour of the change of front and the advance to the railroad cut; the PDF 'about 11:00' stays as the inferred clock of the fight in the cut
- S-007 CORRECTION: the inscription's hour is 10:30 a.m. (not 10:50): show 'about 10:30' as the documented clock of the change of front and the advance to the cut (commemorative source, hour of the capture not stated); the PDF 'about 11:00' stays as the inferred clock of the fight in the cut

### R14.S-008 (records: bld-st-francis-xavier, H-02, S-008) - verdict partially_supported

- S-008 / H-02: the Catholic church is a hospital from before noon on Jul 1 (Reily 1885, secondary) and for wounded of both armies on Jul 2-3 (Bates) through at least Jul 5 (Stoever; NPS), documented-secondary; the PDF's 'pews removed and boards laid' stays a marked gap (web page only); do not show pews removed as a fact
- S-008 / H-02: the Catholic church is a hospital from before noon on Jul 1 (documented-secondary: Reily 1885) for several weeks; the PDF's 'by noon Jul 1' is therefore supported, the 'pews removed and boards laid' stays a marked gap
- S-008 / H-02: inside the church show boards over the pews (documented-secondary, general for the churches used as hospitals); 'pews removed' stays a PDF scenario

### R14.S-009 (records: FEN-mcmillan, S-009) - verdict corrected

- S-009 / FEN-mcmillan: trigger becomes 'Union troops (NPS)' as the documented-secondary default with 'neighbor reportedly (ECW)' selectable; add the second change 'rails used in Confederate entrenchments after Jul 1 withdrawal'

### R14.S-010 (records: FEN-seminary-ridge, E-01, S-010) - verdict partially_supported

- S-010: window 'about 11:00-13:00 to before 16:00'; add the 3,108-rail loss (Schmucker) as the documented quantity of rails lost from the adjoining farm fences; 600 yd stays a gap

### R14.S-011 (records: E-01, S-011) - verdict partially_supported

- S-011: window 15:45-16:30 (documented bounds), tier documented for the bounds and inferred for the instant

### R14.S-012 (records: bld-schmucker-hall, H-03, S-012) - verdict partially_supported

- S-012 / H-03: damage state = holes in walls and damaged NE corner (documented-secondary); glass loss stays a marked gap
- S-012 / H-03: add 'struck by a number of shells and balls' (Adams Sentinel, 21 Jul 1863, contemporary, page image read) and 'main building and two professors' houses damaged by shells' (NPS) to the damage state; glass loss of the MAIN building stays a marked gap
- S-012 / H-03: add 'several serious fractures' and 'part of one gable end to be taken down' (Adams Sentinel, page image) to the main building's damage state; the glass loss and the thirteen shells belong to Dr. Schmucker's house (a separate Professor's house record), not to the main building

### R14.S-013 (records: bld-schmucker-hall, H-03, S-013) - verdict partially_supported

- S-013: window 'from about 16:00-17:00 Jul 1' inferred; Jul 3 Confederate-held documented

### R14.S-014 (records: E-02, S-014) - verdict partially_supported

- S-014: trigger text 'Wadsworth's division intrenches (6th Wisconsin on its own initiative; 7th Indiana by command)'; window stays inferred 18:00-21:00
- S-014: the 24th Michigan's remnant built a line of breastworks on Culp's Hill 'the first night of the battle' (Curtis 1891): add it to the trigger text beside the 6th Wisconsin and the 7th Indiana

### R14.S-015 (records: E-03, S-015, P-09) - verdict corrected

- S-015: window changes to Jul 2 morning (after about 09:00 for the division per Ruger) to about 16:00; Jul 1 kept as the contradicted PDF scenario

### R14.S-016 (records: bld-spangler-farm, H-06, S-016) - verdict partially_supported

- S-016 / H-06: the George Spangler farm is the Eleventh Corps hospital (documented-secondary: NPS, Bates; in use Jul 3 about 16:00, Brinton); the day and hour it opened stay open; do not show 'XI Corps at about 16:00 Jul 1' as documented

## Cross-cutting rules

- No 1863 profile from rebuilt works: the Culp's Hill earthworks (1882), Rowley's (1887), Caldwell's (1891), the East Cemetery Hill lunettes (1878), Stevens Knoll (1880-90), McGilvery's and Poague's lunettes and the Little Round Top stone walls are reconstructions (NPS). Dimensions of every work are a marked plausible-procedural gap (register fence-1-EG-19).
- Pre-existing walls and fences get no construction animation (Company B wall at Little Round Top, 95th Pa. wall, Cemetery Ridge walls, the stone fences of Cemetery Hill).
- Where a clock is a window, the default is the documented window, never a point (delegated-decision method (2): where the OR supports several values the default is a window, not a point); the two clocks of the sides differ by about 20 minutes and no correction is applied.
- Arrival ledger: every change uses the unit's own reported clock; where that clock is earlier than the PDF arrival window (the 83rd Pa. at 14:30 against 15:30-16:00 for Vincent's brigade) the ledger is not changed here and the conflict is carried; applying gate Q04 to these entries is for the owners of the arrival data.
