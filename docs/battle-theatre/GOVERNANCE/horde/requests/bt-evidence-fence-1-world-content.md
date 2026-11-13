# Request to bt-world-content: structures, schedule and works changes from the fence-1 evidence close-out

From: bt-evidence (shard fence-1). Date: 2026-11-13. Files you own and this note asks you to change: `docs/battle-theatre/structures/structures.json`, `state_schedule.json`, `works_stages.json`, `app/data/works3d.json` (and the scenario/default files that read them). I changed none of them.

Why: `GOVERNANCE/evidence_corrections/fence-1.jsonl` re-checked every citation of rows R14.E-01..E-18 and S-001..S-016 against the Official Records and added exact evidence; several rows now contradict the PDF-seeded records. Each change below names the row, the new value, its tier and the source; the quotes, report ids, pages and offsets are in the jsonl. Keep every PDF value as a selectable scenario; the defaults below are recorded as DD-FENCE1-xx in the delegated decisions.

The exact changes, by record:

### R14.E-01 (records: E-01, G-02, FEN-seminary-ridge, S-010, S-011) - verdict partially_supported

- E-01 works record: crew = Paul's First Brigade regiments (16th ME, 13th MA, 94th NY, 104th NY, 107th PA) instead of 'I Corps remnants'; start window 11:00-13:00 (inferred), built before 14:00; keep the 104th NY order-countermanded note
- E-01 dimensions: 'about 600 yd' must be shown as an open gap (plausible-procedural), not documented; form selectable: circular redoubt vs line parallel to the Seminary
- S-010: window 'before about 16:00' stays as the latest bound; earliest bound from 11:00; fences row stays inferred
- G-02 guns: 22 (Hunt, four batteries) default, twelve-concentrated (Wainwright) selectable; the 20 stays PDF-only

### R14.E-02 (records: E-02, S-014) - verdict partially_supported

- E-02 works record: builder units documented = 6th Wisconsin (own initiative, dozen spades) and 7th Indiana (by command), placed by Hancock's order; clock window stays an inferred default 18:00-21:00 with its gap mark; do not show 'logs' as documented for Jul 1 evening
- S-014: keep 'about 18:00-21:00' tier inferred; remove 'first' from the trigger text

### R14.E-03 (records: E-03, P-09, S-015) - verdict corrected

- E-03 / S-015: start window moves from Jul 1 (date only) to Jul 2 after about 09:00 and before about 16:00; PDF Jul 1 stays selectable as 'contradicted by the regiment's own report' (already DD-03)
- E-03 stone wall distance: show about 75 yd (Ruger) as the documented value; 10 rods marked blocked_host
- P-09 (stone wall behind the First Brigade's works): pre-existing, no construction state

### R14.E-04 (records: E-04, S-020, FEN-evergreen-cemetery, P-02, P-03) - verdict corrected

- E-04 must not be built as a construction event for Cemetery Hill as a whole; keep the stone fences (pre-existing, P-02/P-03) and the per-gun earthworks (E-12) as the documented state; S-020 'Occupied and fortified (vague)' becomes 'Occupied; stone fences as cover; per-gun earthworks at dusk' (tier documented) with the 'fortified' wording marked gap
- S-045 / FEN-evergreen-cemetery: add the scenario 'fences smashed Jul 3 about 13:00 (Howard)'; Jul 2 stays the PDF scenario (inferred)
- Gates's rail-fence breastwork moves to E-17 (Cemetery Ridge)

### R14.E-05 (records: E-05, S-023, S-024) - verdict partially_supported

- E-05 works record: start 06:00 Jul 2 (documented) replaces any Jul 1-2 night start; finish windows 09:00-12:00 as selectable (Jones 10:00 default is documented; Greene noon)
- E-05 fabric: close log fence + cordwood battening + earth where tools; 'rails' are documented for the 149th NY (Barnum) so the PDF's 'no rails' is not general; no head logs or boughs unless a source is found (mark as gap if drawn); the 149th NY dates its march to the line at about 04:00 (conflict with 06:00, both selectable)
- E-05 height: 5 ft only as 'Culp's Hill log-crib works in general' (NPS, secondary); do not take profiles from the rebuilt works (CLR: Culp's Hill earthworks reconstructed 1882)

### R14.E-06 (records: E-06, S-023, S-025) - verdict corrected

- E-06: traverse may be built on screen by the 137th NY in the Jul 2 morning window with length about 20 yd (documented-secondary); height and profile stay labelled gaps; before this, the previous note 'do not render a traverse in the morning' is lifted

### R14.E-07 (records: E-07, S-024) - verdict partially_supported

- E-07: window 06:00 to before sundown (default: morning to early afternoon, selectable), builder Kane's brigade (111th PA, Cobham commanding until Kane's arrival at 06:00)

### R14.E-08 (records: E-08) - verdict corrected

- E-08: remove 'Lockwood's brigade (position unconfirmed)' from the Jul 2 builder list; Lockwood enters the lower works on Jul 3 (08:00) as an occupant, no construction
- E-08: add 'rails, timber and stone' for the Third Brigade (documented)
- E-08 / fences: the 3rd Wisconsin (Colgrove's brigade) threw down stone walls and fences in its front on Jul 2 (Hawley, OR27-1-R292 p.823): add a fence/wall removal state change on the east bank of Rock Creek in front of Colgrove's line, Jul 2 morning (documented; place only as 'in my front')

### R14.E-09 (records: E-09, S-041, S-050) - verdict partially_supported

- E-09/S-041: the 18:30 change is an occupation (garrison spread to one man per foot) not a construction; the two clocks 18:30 (First Division) and 19:00 (Geary's brigades) are both documented; 750 reinforcements = 400 XI Corps + about 350 First Corps; 800 yd stays marked inferred

### R14.E-10 (records: E-10, S-042) - verdict confirmed

- E-10 / S-042: keep both scenarios selectable; clock window 19:00-20:00 for the start (documented bounds), the PDF's 22:00 upper bound moves to 'enemy attacks ended about 22:00'

### R14.E-11 (records: E-11, S-050, S-056, P-08) - verdict corrected

- E-11: rounds default 277,000 (OR) with 227,000 and 250,000 selectable; bombardment 03:30-04:00 start, 25 minutes of fire in two bursts as the documented default, longer values selectable; damage state of the works stays a gap and must not be drawn as documented

### R14.E-12 (records: E-12, G-03) - verdict partially_supported

- E-12 / G-03 works records: builders = battery crews (Cooper B-1st Pa. four lunettes; Wiedrich I-1st NY; Breck L-1st NY; Stewart B-4th US), start dusk Jul 1, finish morning Jul 2; keep 'lunette' as the form label with the 1863 profile marked a gap; do not use the 30-in figure for 1863
- E-12 start window moves from 'between Jul 1 evening and noon Jul 2 (inferred)' to documented dusk Jul 1 to morning Jul 2

### R14.E-13 (records: E-13, P-14) - verdict corrected

- E-13 must not be 'no_construction': add a hasty stone defense for the 83rd PA (Jul 2 about 14:30-15:15, documented), built by the regiment; keep Company B's wall as pre-existing; the other three regiments stay 'no works found' (gap, not a fact)

### R14.E-14 (records: E-14, P-14) - verdict partially_supported

- E-14 / S-043: replace the single builder by two documented scenarios: (A) Weed's brigade at night Jul 2 (Garrard), (B) Fisher's Reserves morning Jul 3 (Fisher); keep both; start window night Jul 2 to morning Jul 3; PDF 'five regiments + Ohio battery' stays a labelled PDF scenario; DD-05 'walls built' is confirmed by Garrard and Fisher
- No 1863 profile from the rebuilt LRT walls

### R14.E-15 (records: E-15, G-06, S-038) - verdict partially_supported

- E-15 / S-038: first-fire window moves to 'on arrival about 16:30' (documented), the 17:45 stays a PDF scenario; hauling method becomes a selector with the three accounts; no epaulement drawn (gap)

### R14.E-16 (records: E-16, P-05) - verdict partially_supported

- E-16: keep 'no works found' as a gap-marked state for Ward's brigade (not a fact); add an unplaced scenario 'stone wall defense works near Devil's Den, builder and date open (NPS)'

### R14.E-17 (records: E-17, P-01, FEN-emmitsburg-road, FEN-cemetery-ridge-walls, S-062) - verdict corrected

- E-17 must change from open_gap/'no source' to documented works: add works records (builder unit, material, window) for (1) Robinson's division Jul 1 17:00-22:00 on the line left of Cemetery Hill / along the Emmitsburg road, (2) Harrow's 15th Mass. and 82nd NY Jul 2 16:00-17:00 at the brick house, 80th NY/151st Pa. Jul 2 evening, (3) the Jul 3 regimental works listed above; each as a short rail/stone breastwork, dimensions marked gap (no 1863 profile)
- FEN-emmitsburg-road: fences torn down by Harrow's regiments from about 16:00 Jul 2 (and earlier removal north of Klingel per NPS): do not show an intact Emmitsburg Road fence in front of the brick house after 16:00 Jul 2; RULE-03 not violated (works are after Jul 2 begins)
- DD-02 (Cemetery Ridge breastworks built on screen) is confirmed and widened; 'July 2 gap south of the Copse' stays unevidenced
- FEN-cemetery-ridge-walls and the Angle wall remain pre-existing (no construction animation); rail works are additions beside them

### R14.E-18 (records: E-18, G-14, S-009) - verdict corrected

- E-18: replace the whole-row open gap by dated Confederate works: Middle Street barricade (Jul 2 morning), Ewell's hill works (Jul 3-4 night), Hood's Warfield Ridge works (Jul 4), the Seminary Ridge ridge-long works (Jul 4); the units are Confederate and arrive/stand as documented; Jul 2-3 stays a marked gap for the other sites

### R14.S-001 (records: bld-rock-creek-rr-bridge, S-001) - verdict corrected

- S-001: default date Jun 26 (evening) documented; Jun 27 stays a PDF scenario; the bridge object keeps the Rock Creek railroad bridge, damage state 'centre span burnt and fell in, two spans standing damaged' (documented-secondary, newspaper)

### R14.S-002 (records: bld-pennsylvania-hall#cupola, S-002) - verdict partially_supported

- S-002: split the signal-post event into the Jun 30 post (building scenario: Pennsylvania Hall cupola or Schmucker Hall cupola) and the Jul 1 08:30 Howard signal officer on the College cupola; both tier documented for the event, inferred for the building

### R14.S-003 (records: FEN-mcpherson-railroad-grade, S-003) - verdict gap

- S-003: no state change by default (both PDF scenarios stay; the critic scenario is 'no change'); the row stays tier 'contested' with the registered gap

### R14.S-004 (records: bld-presbyterian-church, H-01, S-004) - verdict unsupported

- S-004 / H-01: keep the open gap marked; do not show the church as a Jun 30 hospital

### R14.S-005 (records: FEN-gamble-cavalry, S-005) - verdict corrected

- S-005: start clock 'from about 08:00' (documented) replaces 07:30 (PDF scenario, unsupported); add the right-angle rail work near Calef's battery (documented-secondary, builder Gamble's brigade) as a works record

### R14.S-006 (records: FEN-chambersburg-pike, S-006) - verdict partially_supported

- S-006 / FEN-chambersburg-pike: fence type becomes a per-reach selector (paling near the seminary, Virginia worm north of the pike at the McPherson Farm, post-and-rail elsewhere as PDF scenario); presence on Jul 1 stays documented

### R14.S-007 (records: P-12, S-007) - verdict partially_supported

- S-007: window stays inferred 'about 10:30-11:30'; the cut is pre-existing (no construction state)

### R14.S-008 (records: bld-st-francis-xavier, H-02, S-008) - verdict unsupported

- S-008 / H-02: keep the open gap marked; do not show pews removed by noon Jul 1

### R14.S-009 (records: FEN-mcmillan, S-009) - verdict corrected

- S-009 / FEN-mcmillan: trigger becomes 'Union troops (NPS)' as the documented-secondary default with 'neighbor reportedly (ECW)' selectable; add the second change 'rails used in Confederate entrenchments after Jul 1 withdrawal'

### R14.S-010 (records: FEN-seminary-ridge, E-01, S-010) - verdict partially_supported

- S-010: window 'about 11:00-13:00 to before 16:00'; add the 3,108-rail loss (Schmucker) as the documented quantity of rails lost from the adjoining farm fences; 600 yd stays a gap

### R14.S-011 (records: E-01, S-011) - verdict partially_supported

- S-011: window 15:45-16:30 (documented bounds), tier documented for the bounds and inferred for the instant

### R14.S-012 (records: bld-schmucker-hall, H-03, S-012) - verdict partially_supported

- S-012 / H-03: damage state = holes in walls and damaged NE corner (documented-secondary); glass loss stays a marked gap

### R14.S-013 (records: bld-schmucker-hall, H-03, S-013) - verdict partially_supported

- S-013: window 'from about 16:00-17:00 Jul 1' inferred; Jul 3 Confederate-held documented

### R14.S-014 (records: E-02, S-014) - verdict partially_supported

- S-014: trigger text 'Wadsworth's division intrenches (6th Wisconsin on its own initiative; 7th Indiana by command)'; window stays inferred 18:00-21:00

### R14.S-015 (records: E-03, S-015, P-09) - verdict corrected

- S-015: window changes to Jul 2 morning (after about 09:00 for the division per Ruger) to about 16:00; Jul 1 kept as the contradicted PDF scenario

### R14.S-016 (records: bld-spangler-farm, H-06, S-016) - verdict partially_supported

- S-016 / H-06: hospital use documented-secondary (corps and hour open); do not show 'XI Corps at about 16:00' as documented

## Cross-cutting rules

- No 1863 profile from rebuilt works: the Culp's Hill earthworks (1882), Rowley's (1887), Caldwell's (1891), the East Cemetery Hill lunettes (1878), Stevens Knoll (1880-90), McGilvery's and Poague's lunettes and the Little Round Top stone walls are reconstructions (NPS). Dimensions of every work are a marked plausible-procedural gap (register fence-1-EG-19).
- Pre-existing walls and fences get no construction animation (Company B wall at Little Round Top, 95th Pa. wall, Cemetery Ridge walls, the stone fences of Cemetery Hill).
- Where a clock is a window, the default is the documented window, never a point (delegated-decision method (2): where the OR supports several values the default is a window, not a point); the two clocks of the sides differ by about 20 minutes and no correction is applied.
- Arrival ledger: every change uses the unit's own reported clock; where that clock is earlier than the PDF arrival window (the 83rd Pa. at 14:30 against 15:30-16:00 for Vincent's brigade) the ledger is not changed here and the conflict is carried; applying gate Q04 to these entries is for the owners of the arrival data.
