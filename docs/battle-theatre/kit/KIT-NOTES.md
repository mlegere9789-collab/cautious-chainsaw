# Kit specs, weapons, artillery, cavalry and the anachronism validator (PDF B.6.1-B.6.15)

Generated data: `kit_specs.json`, `weapons.json`, `artillery_batteries.json`, `cavalry_units.json` (this folder).
Source modules: `tools/bt/kit_*.py` (data), `tools/bt/build_kit_data.py` (builder), `tools/bt/check_kit.py` (validator).
Rebuild: `python tools/bt/build_kit_data.py`. Check: `python tools/bt/check_kit.py [--node] [--quiet]` (exit 1 on any ERROR, self-test or population failure). Run python with `PYTHONIOENCODING=utf-8`.

Status: these files are research data and a validator, not a rendered product. Every value is copied from the PDF text (`BIBLE/plan-clean.txt` pages 66-90) or from the printed manuals read afterwards (`docs/battle-theatre/drill/`). `claim_support_verified` is false on every source key: no agent re-read the cited web pages for this task.

## 1. Tier rule applied

CLAUDE.md Law cl.4 and the brief: a field/row is `documented` only if it cites at least one non-weak source key and the PDF does not itself mark the support weak. Wikipedia, forum, blog and auction keys are weak (`kit_sources.py`, classes assigned there, one place for the owner to override). A PDF cell printed "documented" with only weak keys is stored `tier: inferred, weak_source: true`, with `tier_printed` keeping the PDF word and `tier_note` saying why. PDF "GAP" rows are stored as open gaps (`tier: gap` with `gap_ids`), because the PDF says gaps get no tier. Default-mix weights are `tuning_parameter`, `historical_basis: false`; the share WORD is the PDF's, the number is ours.

New source keys minted by the build (the PDF prints names, not keys, for B.6.14/B.6.15): `kit_sources.EXTRA_SOURCES`. Printed manuals acquired after the PDF: `GIBBON-1860`, `FIELDART-1863`, `ORDNANCE-1861`, `CASEY-1862` (class `primary_manual`, non-weak). They raise only the artillery cells that a manual prints identically (5-degree ranges of the 6-pdr, Napoleon, 12-pdr howitzer, 24-pdr howitzer and mountain howitzer), each with its drill item ids in `manual_confirmation`.

## 2. Counts

| File | Content |
|---|---|
| `kit_specs.json` | 135 infantry/sharpshooter/support unit specs (87 Union, 48 Confederate); 9 defaults; 191 catalogued items; 357 tiered unit fields in total across the three unit files (26 documented, 131 inferred, 200 plausible-procedural; 170 of the 357 weak_source); 60 default fields (4 documented, 23 inferred, 33 plausible-procedural); 2 disputes; 45 open items; 2 pack piles; 8 named individuals; 68 reference rows (B.6.2 and B.6.4 tables kept verbatim); 21 PDF gap records G1-G21; 1 scene-evidence record (Devil's Den); corps-badge cells for 8 corps; 7 wear states |
| `weapons.json` | 45 weapon records (14 documented, 15 inferred, 6 plausible-procedural placeholders, 10 open gaps); 32 unit-to-weapon assignments (8 documented, 19 inferred, 2 plausible-procedural, 3 gap; the B.6.10 rows plus UA-BLACKFORD from B.6.6 and the gap row split into UA-GAP-3 and UA-GAP-CS); B.6.11 ammunition/drill/rates; 13 artillery piece records (10 with specs, 3 gaps); gun inventory; 5 ammunition types; 12 drill states; 10 crew roles; 8 team/vehicle rows |
| `artillery_batteries.json` | 125 battery kit units (65 Union, 60 Confederate; 29 with gun types stated as printed, 96 "gun types not given" = gap), 28 formations (brigades/battalions), 12 B.6.14.7 battery detail rows, 9 further formation/battalion detail rows, the July 3 cannonade table (12 rows), 12 gap rows |
| `cavalry_units.json` | 62 cavalry regiment/battalion kit units (31 Union incl. Co A Purnell Legion; 31 Confederate incl. Imboden's commands and the 35th Va Bn), 15 formations, strengths, carbine facts, horses, 17 behaviour states, 12 conflicts, 9 gaps |

Validator run (this build): 322 kit units, 191 items, 45 weapons; data checks 0 ERROR, 4 WARN; rng golden values match node (`--node`); 45/45 self-tests; population test 23,112 generated manifests (every present unit x 24 soldiers across ranks x 3 dates, both 140th NY variants) validated, 0 FAIL, 0 generation problems; FLAG counts: DISPUTED_FLAGGED 288 (140th NY and Berdan units), FLAG_BADGE_UNRESOLVED 344 (XI Corps etc.), FLAG_KEPI_PRIVATE_PURCHASE 231 (Confederate cavalry flagged exception).

## 3. Validator coverage (B.6.12)

| B.6.12 item | Checked here |
|---|---|
| 1 presence | Unit absent from the battle (5th NY infantry, 1st Conn Heavy, Huey's brigade) fails; arrival/departure TIMES (B.2.4) are NOT checked: pass `presence_fn(unit, date)` |
| 2 anachronism list | Type III Richmond jacket (and transitional kersey); M1863; Henry; Spencer outside the 5th MI / part of the 6th MI and before 30 Jun (30 Jun-2 Jul on those units = FLAG, disputed window; from 3 Jul clean); Zouave items on 5th NY, 155th PA, any Louisiana soldier, any non-Zouave unit, and the 140th NY only inside the regulation-blue variant; 146th NY Zouave before 3 Jun; Berdan green off the Berdan units; Wheat's/Coppens' dress anywhere; green hatband/chevron off the Ambulance Corps (Irish Brigade, medics fail); Whitworth rifle in infantry hands (FLAG only with the explicit Confederate-sharpshooter exception); kepi on a Confederate enlisted man (FLAG only with the private-purchase exception) |
| 3 wrong-unit items | Every item must be in the nearest spec definition of its field at the date (unit variant > unit > defaults, officers via the officer default); weapon must equal the assignment (or default distribution); badge shape belongs to the corps and division; Union soldier carrying a Confederate item fails; Confederate carrying an uncaptured Union item fails; one long arm maximum; sash/sword by rank |
| 4 branch | scarlet artillery trim only on artillery, cavalry yellow only on cavalry, green band only on Ambulance Corps |
| 5 tier completeness | every manifest field has a tier; documented needs a non-weak source key listed in source_ids; same rule over all JSON data |
| 6 reproducibility | `manifest_for(soldier_id, unit_id, seed, ...)` is deterministic; integer mixing is a port of `sim/rng.mjs` (fmix32, hash4, strId); 18 golden values (produced by node on that file) are in the script and re-checked live with `--node` |
| 7 sample audit | not checkable here (needs a renderer and unit image references) |

Self-tests include a deliberately anachronistic Confederate private (Type III jacket, kepi, Henry) that must fail, mutation tests (951 fault injections into real manifests, all caught), the 140th NY "both allowed, flagged" test, and a refusal to generate a 140th NY soldier without an explicit variant (no default chosen).

Rules that are mine, not the PDF's (flagged here so the owner can override): accoutrement component draw probability = min(1, weight/6) (`all` always); officers (lieutenant and up) get no long arm or bayonet (B.6.12 lists only "sidearm / sword" for them; the PDF does not say they carry none); artillery and support branches get no long arm; cavalry bayonet field is "not applicable"; a pack_dropped entry without a pile id is never drawn (open item, see section 5); company-level consistency (B.6.12 variance rule 3, "plausible-procedural design choice") is not implemented in `manifest_for` (a renderer-side policy).

## 4. Ambiguities and decisions carried (none resolved silently)

1. 140th NY: PDF B.6.3 and B.6.12 say regulation blue, Zouave Jan 1864, "never receives" a Zouave outfit (cited only to Wikipedia: weak). The owner brief carries a second reading (Zouave dress from 3 Jun 1863 from an earlier agent's read of the 146th NY history; no source key; whether it concerned the 140th is not established). Both stored as variants of `DISP-140NY-DRESS`, status `disputed`, owner decision PENDING OWNER; the PDF-recommended default is logged but NOT adopted. Item detail for the Zouave variant is unspecified in any source, so three GAP PLACEHOLDER items are used.
2. Spencer: B.6.12 bars Spencers before "June 30" and on any unit but the 5th MI (all) and part of the 6th; B.6.9/B.6.10 say Hanover June 30 (6th MI) and July 3; B.6.10 gives the start as July 3. Stored: valid from 1863-07-03 (documented), disputed window 06-30..07-02 (FLAG), nothing before 06-30. "Two companies or part of the 6th": the company count is not settled (G18). The arms of the 6th MI's other companies are not stated: Sharps/Burnside inferred only, flagged.
3. Type III jackets: B.6.4 says "do not use except as a rare flagged item"; B.6.12 item 2 bars them outright. The validator follows B.6.12; no unit allows them.
4. Iron Brigade badge: B.6.3's default-kit cell puts the red I Corps patch on the hat of the whole brigade; the B.6.2 product rule says badges go on a minority of soldiers. Stored as `all` for the Iron Brigade (per unit cell) with the conflict noted.
5. Iron Brigade trousers: the "documented" column says sky blue in all regiments, the tier cell says "rest plausible-procedural". Stored with the lower tier (plausible-procedural), `tier_conflict` recorded.
6. 24th Michigan: the PDF gives only the hat; coat and trousers inherit the default (the documented column states a brigade-wide frock coat): `parse_status: partial`.
7. 1st Minnesota appears both as "documented (Wikipedia): M1861" and in the B.6.10 "not found" row: both kept (UA-1MN, UA-GAP-3). 
8. Hardaway's battery (B.6.10) vs Hurt (Hardaway AL) in McIntosh's battalion (B.6.14.6/.7): one card `CS.ART.HURT`, assignment UA-HARDAWAY.
9. "Light 12-pdrs" (1st RI B, 1st US I) are mapped to the Napoleon (the printed manuals call the Napoleon "the light 12-pounder"), flagged `type_resolution`. Bare "3-inch" is mapped to the 3-inch Ordnance rifle (3-inch Navy rifle not excluded).
10. Napoleon 5-degree range 1,619 vs 1,680: both stored (each confirmed in a different printed manual). Whitworth gun 2,800 (table) vs 2,600 (detail row): both stored. Canister 350 vs 400 yd, Parrott 1,850 vs 1,900, Phillips 3-inch vs Napoleons, Bigelow losses, gun totals 366-372 / 281-282: carried as ranges or alternatives; Phillips uses Stone Sentinels pending OR returns per the PDF.
11. Artillery cycle time: PDF inferred 20-30 s per round; printed manuals give 30-60 s (solid shot/case) and 3 canister per minute. Both stored (`crew.cycle_time`), default NOT chosen (PENDING OWNER). Crew: the PDF's "gunner + Nos. 1-7, chief of caisson ninth" is the manual's nine (No. 8 = chief of caisson).
12. Berdan green vs blue: `DISP-BERDAN-GREEN-BLUE`, both carried, share a tuning parameter.
13. Confederate cavalry kepi: B.6.15.4 says slouch hats "outnumbered kepis" (so kepis existed); B.6.12 bars a kepi on a Confederate private by default. Stored as a flagged `private_purchase` exception entry (plausible-procedural) that the validator reports as FLAG only when the manifest says so.
14. Colt .36 in Buford rows: placeholder `colt_36_unconfirmed` (probably the Navy 1851, which is itself a gap row).

## 5. Unparsed cells and partial records (nothing dropped; these are recorded as partial or routed)

- Seven infantry/support units `parse_status: partial`: US.24MI, US.137NY (individual record only), US.SUP.AMBULANCE (NCO insignia items not catalogued separately), CS.SUP.MEDICAL (Confederate support troops: B.6.8 is Union-oriented), US.84NY, US.125NY, CS.26NC (named only in B.6.10, no corps/dress in B.6).
- 96 of 125 batteries carry no gun types: the PDF gives them only for 29 (28 Union + Hurt). Confederate battalion rows say "gap" or give battalion-level text only; the 4-gun default is recorded on the battalion and NOT applied to any card (PDF: usable only as a total check).
- B.6.15.3 action-by-action table (26 Jun-16 Jul) and B.6.14.8's use as a schedule are event data, not kit data; not reproduced here (timeline). The cannonade table IS stored.
- B.6.2 items with no manifest field: neckwear, navy shirts, red firefighter-style overshirts, fourth-division green/XV yellow/XIII none/XIX reversed badge rules (they do not occur at Gettysburg), buttons. They are stored as reference rows (`reference_tables`), not as drawable items.
- Pack dropped without a pile id (US.44NY "some", US.16VT "few"): the PDF gives no pile position/time for these; `manifest_for` never draws them and flags `pack_dropped_without_pile_id_skipped`; data WARN `PACK_DROPPED_NO_PILE_ID`.
- Union cavalry and artillery shirt, footwear (cavalry), horse/foot artillery visual references: GAP PLACEHOLDER items (`shirt_unspecified_cav`, `boots_unspecified_cav_union`, `shirt_unspecified_cs`) appear in manifests with a `gap_placeholder:` flag (a visible marked gap, Law cl.7).
- Per-battery dress is not documented: each card inherits the branch default and says so.
- "Wikipedia battle flag page (failed to load)" and other failed lookups in the PDF are carried as G11 and not retried.

## 6. PDF defects found

1. B.6.14.1 inventory rows sum to 360 Union / 286 Confederate, not the printed totals 366 / 282. Rows and totals both kept; WARN `PDF_DEFECT_INVENTORY_SUM`.
2. B.6.14.4 horse table: items sum to 148, stated total 149 (the PDF itself says so). WARN `PDF_DEFECT_HORSE_TOTAL`.
3. B.6.4 "Type III ... rare flagged item" vs B.6.12 "Type III barred" (section 4, item 3).
4. B.6.12 item 2 and B.6.3 "never receive" Zouave on the 140th NY vs the owner brief's disputed reading (section 4, item 1).
5. B.6.10: 1st Minnesota both assigned and "not found"; "Hardaway's battery" vs "Hurt" (B.6.14); 14th Brooklyn/125th NY/26th NC appear only there (no unit entry in B.6.3/B.6.5).
6. B.6.12 Spencer rule "before June 30 / July 3" vs B.6.9 Hanover vs B.6.10 "from July 3"; the "two companies or part of the 6th".
7. B.6.14.1 crew counts: "Wikipedia states eight plus four ... also nine cannoneers" inside one article; "50 per rifle chest" is the 6-pdr chest, not a rifle chest (printed manual); the 32-per-Napoleon-chest "open gap" is confirmed by the manual (sub-gap closed).
8. B.6.14.6 Hazard's report: "28 guns in six batteries" vs "five batteries and 24 guns" (printed by the PDF; carried). Horse-artillery command: Tidball commanding all vs Robertson with the 1st Brigade (B.6.14.6/B.6.15.1; carried).
9. B.6.15.1/B.6.15.3: two different Michigan Brigade command dates, Farnsworth dated 28 Jun; B.6.2 badge: the 124th NY hand-made lozenge is a III Corps "3rd Division" example, yet the notes' order of battle has no 3rd Division of III Corps at Gettysburg.
10. B.6.14.10 names Gibbon as the source for drill positions and commands; Gibbon's Artillerist's Manual does not contain the detachment drill (it is in the 1860 Instruction for Field Artillery) (drill notes).
11. Source list: key `CWTalk-Whitworth` (infantry rifle thread, B.6.6) and the B.6.14 name "CivilWarTalk, Whitworths at Gettysburg" (`CWTalk-Whitworths`) are different entries for what may be the same thread; kept apart. Key `Wiki-Co G` has a space; kept as printed.
12. PDF recommended defaults remain logged as PENDING OWNER; this build chooses none.

## 7. Where the PDF differs from the printed manuals (drill/ files)

- Nine loading commands: PDF "unverified memory"; Casey and Hardee print them (INF-L9-01..09). Forum claim of "eight cycles" not supported. Misfire rates and buck-and-ball charge still open (G19).
- Crew nine confirmed; chief of caisson = No. 8; 32 rounds per Napoleon limber chest confirmed (12 shot, 12 case, 4 shell, 4 canister, 484.1 lb); 6-pdr chest 50.
- Rate: printed 30-60 s per round vs PDF 20-30 s. Double canister 150-160 yd in the manual vs 100 yd (Cushing's documented practice).
- Spherical case 78 balls / 12.1 lb (PDF) vs OCR 76 / 11.77 lb; canister 27 vs OCR 21: UNSETTLED without page images.
- 3-inch rifle, Parrotts, James, Whitworth, Blakely are not in any printed edition read: those cells keep the PDF's weak Wikipedia tier.

## 8. PDF gaps G1-G21 mapped to affected records

Full machine-readable table: `kit_specs.json -> pdf_open_items_G1_G21` (each with the PDF's open-item text, the source that would settle it, and the record ids affected). The Evidence-Gap Register rows are not replaced.

| Gap | Affected records (summary) |
|---|---|
| G1 Union armament by regiment | OPEN-20ME and the other weapon-bearing open items; assignments UA-GAP-3, UA-125NY, UA-13PAR; placeholders springfield_model_unspecified, sharps_unspecified_pattern; every Union unit using the default long-arm draw |
| G2 Confederate armament | OPEN-TEXAS/MS/PICKETT/CS-OTHERS; UA-GAP-CS; default.confederate.infantry.weapon |
| G3 frock vs sack, shirts, overcoats | default.union.infantry coat/shirt; OPEN-REGULARS, OPEN-114PA-WEAR; reference UC-04, UC-08, UC-14 |
| G4 badge status | corps_badges (all), XII star and Cavalry crossed sabers (memory-only, plausible-procedural), Artillery Reserve (gap), every Union badge field |
| G5 accoutrement details | default accoutrement fields (both armies), shelter half, mess gear |
| G6 distinctive-unit dress | 14 open items / 42 units: Irish, Philadelphia, 20th ME, 16th MI, Vermont x2, Excelsior, 12th NJ, XI Corps Germans, 39th/44th NY, 83rd PA |
| G7 Bucktails, 149th/150th PA | OPEN-13PAR-TAIL, OPEN-149-150PA; UA-13PAR |
| G8 Union generals | named_individuals.not_done.union |
| G9 Confederate state issue, Tigers, NC bureau, Texas | 7 open items / 41 units (Texas, Louisiana, NC, Mississippi, Stonewall, Pickett, others) |
| G10 Confederate equipment | default.confederate.infantry accoutrements and pack_state; reference CS-26 |
| G11 CS flag pattern | default.confederate flag field, cs_anv_battle_flag, OPEN-TEXAS, reference CS-28/29 |
| G12 CS officer dress | named_individuals (Pickett, Ewell, Lee, Stuart), not_done.confederate, default.confederate.officers |
| G13 Berdan green/blue, Sharps retention, Trepp, Wisconsin | OPEN-BERDAN-GREEN, OPEN-MNCOL, OPEN-1MASSSS; DISP-BERDAN-GREEN-BLUE; sharps_rifle_m1859 b6_6_context |
| G14 Blackford and CS sharpshooters | OPEN-BLACKFORD, OPEN-CS-SS; UA-BLACKFORD |
| G15 Devil's Den dead man/prop rifle | SCENE.DEVILS_DEN_PHOTO (no kit record may be invented) |
| G16 support troops | 11 open items / 11 support units |
| G17 arms specs not retrieved | 22 weapon records with gaps (P1856/58, Gallager, Smith, Merrill, Sharps & Hankins, Colt Navy, Kerr, musketoon, M1840/M1850 swords, bayonet dimensions, Lorenz and M1842 weight ...) |
| G18 Spencer | spencer_repeater, UA-MICH-SPENCER, UA-MICH-1-7, US.CAV.5MICH/6MICH |
| G19 drill | ammunition.drill (nine commands now confirmed; rates and buck-and-ball open), buck_and_ball_load, artillery crew |
| G20 soiling | wear_states (all rows, levels are tuning parameters) |
| G21 conflicts | CONF-M1861-BARREL, CONF-P53-IMPORT, CONF-SHARPS-CAL, DISP-BERDAN-GREEN-BLUE, CONF-BERDAN-ENTRY-TEST, CONF-SPENCER-PROD/RATE, UA-6MN-FLAG ("6th Minnesota" not assigned), CONF-LOADED-ARMS |

B.6.14.10 and B.6.15.9 gap rows are stored in `artillery_batteries.json -> gaps_B6_14_10` and `cavalry_units.json -> gaps`.
