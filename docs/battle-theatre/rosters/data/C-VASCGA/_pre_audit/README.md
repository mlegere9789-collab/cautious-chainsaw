# Roster family C-VASCGA: Confederate Virginia, South Carolina and Georgia

Written 30 October 2026. Scope: every unit of the repository order of battle (`baseline/dist/data/oob/confederate_*.json`) whose state is Virginia, South Carolina or Georgia: 89 infantry regiments and battalions (42 + 11 + 36), 21 cavalry units (17 + 2 + 2) and 33 artillery batteries whose designation carries VA, GA or SC or is a Richmond Howitzers company. 143 units in all (`oob_scope.json`). Strengths in the OOB file are second-hand (Busey and Martin) and are only quoted, never used to decide a label.

No unit was left out of the search; what is missing is listed below with the reason. Nothing here was fetched from FamilySearch, Fold3, Ancestry, Find a Grave, the NPS Soldiers and Sailors System or any lending-restricted item. No account, key, login or licence acceptance was used. Every download was a single request per file, 2 s apart, identified as `gettysburg-map-research/1.0`, cached in `tmp/library/rosters/C-VASCGA/files/` with sha256 in `acquired.json` (17 MB in all; the budget is 1.5 GB). Python processes ran at below-normal priority, one at a time; no browser was used.

## Result (Measured by `scripts/finalize.py`; details in `stats.json`, `units.csv`)

* Units with at least one named list: **78 of 143** (infantry 74 of 89, cavalry 3 of 21, artillery 1 of 33).
* Units whose own regimental roll was read in full: **10** (4th, 12th, 21st, 44th Georgia; 2nd, 3rd South Carolina; 1st Virginia; 11th Georgia with poor text; 9th Virginia Cavalry names only; Page's Battery). Partial: 3 (61st Georgia, companies B to K; 14th South Carolina, Company K; 18th Virginia, Company G). Officers or hospital names only: 65. No names: 65.
* Rows: 15,535 (14,654 men excluding 881 cross-references to the same man under another rank); 14,490 distinct unit, company, name keys. By label: Unknown 9,959 (64.1 percent), Absent-Documented 4,155 (26.7 percent), Present-Documented 540 (3.5 percent), Duplicate-Xref 881 (5.7 percent).
* Rows whose label is limited by a missing or undated fact (`unreadable-or-ambiguous`): 1,710 (11.0 percent); rows whose name carries the `name-garbled` flag: 536 (3.5 percent; the flag is a floor, see Warren below).
* Present-Documented is low on purpose. A name on a roll compiled after the war is not "present". The 540 rows rest on a stated casualty or capture at Gettysburg (CAS-REMARK), a named presence (OFFICER-HISTORY) or the 30 June 1863 muster roll with a confirming next roll (MUSTER-JUN63-PRESENT, 10 rows). A further 120 Salley rows carry the flag `present-on-30-june-roll-only` (present on the 30 June roll, next roll not stated): they stay Unknown because PLAN rule 6 needs both rolls.

The ledger entries (`sources.json`, one per source above, with file hashes and known defects) follow `../../schema/sources-ledger.schema.json`.

## Columns and labels

Same as `../../pilot/` plus `unit_id` (the OOB id) and `source_locator`: `regiment, unit_id, company, section, name_as_printed, rank_as_printed, enlist_or_commission_date, residence_or_county, remarks_as_printed, presence_label, presence_basis, basis_code, dup_group, source_id, source_locator, parse_flags, roll_status`. `presence_label` is Present-Documented, Absent-Documented or Unknown by PLAN 2.2 in rule order; one extra value, `Duplicate-Xref`, marks a row that repeats a man already carried by another row (Salley prints an officer once per rank held; the pilot used the same value); its `roll_status` is `xref`. `basis_code` values used: CAS-REMARK, OFFICER-HISTORY, MUSTER-JUN63-PRESENT, SEP-BEFORE, ENL-AFTER, ABS-NOTATION, CONFLICT, ONROLL-NO-STATUS, OCR-DATE-LOST, DUP-XREF. Same-name pairs inside one unit file are flagged `same-name-pair` with a `dup_group`, never merged (89 groups).

Files: `csv/<unit>.csv` is the main roll; `csv/<unit>.paroles-officers.csv` and `csv/<unit>.gaines-hospital.csv` are supplementary lists for that unit. Two things only the owner may decide are not decided here: whether the supplementary lists are shown beside the roll or merged, and whether `present-on-30-june-roll-only` may become Present-Probable with a stated model.

## Sources used (id, what, rights)

| source id | what | Internet Archive item | rights as checked |
|---|---|---|---|
| GA-THOMAS-1903-DOLESCOOK-v1 | Thomas, History of the Doles-Cook Brigade (1903): field and staff list and company rolls of the 4th, 12th, 21st, 44th Georgia (5,654 rows) | `historyofdolesco00thom` | IA flag NOT_IN_COPYRIGHT; not lending restricted |
| SC-SALLEY-1914-VOL2-v1 | Salley (compiler), South Carolina Troops in Confederate Service, vol. II (1914): 2nd and 3rd South Carolina, field and staff and every company, compiled from the surviving muster rolls and saying what each roll reported | `southcarolinatr00sallgoog` | NOT_IN_COPYRIGHT; state publication |
| VA-LOEHR-1884-1VA-v1 | Loehr, War History of the Old First Virginia (1884): list of members with years of service, fate, company | `warhistoryold00loehrich` | NOT_IN_COPYRIGHT |
| GA-WARREN-1863-11GA-v1 | Warren, History of the Eleventh Georgia Vols., embracing the muster rolls (1863) | `historyofelevent00warr` | flag blank; published 1863 |
| GA-NICHOLS-1898-61GA-v1 | Nichols, A Soldier's Story of His Regiment (61st Georgia), roster of companies B to K | `01494987.3402.emory.edu` | flag blank; published 1898 |
| SC-TOMPKINS-1897-COK14-v1 | Tompkins, Company K, Fourteenth South Carolina Volunteers: original roll, killed, wounded, prisoner rolls | `06269758.3416.emory.edu` | flag blank; published 1897 |
| VA-IRBY-1878-COG18-v1 | Irby, Historical Sketch of the Nottoway Grays (Co. G, 18th Virginia): condensed roll | `historicalsketc00irbygoog` | NOT_IN_COPYRIGHT |
| VA-BEALE-1899-9VACAV-v1 | Beale, History of the Ninth Virginia Cavalry: roster by company | `historyofninthvi00beal` | NOT_IN_COPYRIGHT |
| VA-PAGE-1885-PAGEBATTERY-v1 | Page, Sketch of Page's Battery (Morris Artillery): an entry for every man | `sketchofpagesbat00page` | flag blank; published 1885 |
| CS-SHSP27-1899-GAINES-v1 | Southern Historical Society Papers vol. 27, pp.241-251: Dr J. M. Gaines's original rolls of the Confederate sick and wounded at Williamsport and Hagerstown, 13 July to 12 August 1863 (196 names of all states; 87 for this family's OOB units) | `sim_southern-historical-society-papers_january-december-1899_27` | flag blank; published 1899 |
| CS-SHSP15-1887-PAROLES-v1 | Brock (ed.), Paroles of the Army of Northern Virginia (1887): the officers' lists only (380 officers of 65 of this family's units) | `cu31924030921773` | flag blank; published 1887 |

"Flag blank" means the Internet Archive metadata has no `possible-copyright-status`; every such item was published before 1931 and none is `access-restricted-item`. Whether a given use is allowed is for the owner to confirm (this is not legal advice). Downloaded but not parsed (reason in `SOURCES.csv`): Chamberlayne, Record of the Richmond City and Henrico Co. Troops (two pamphlets), Blackford, Annals of the Lynchburg Home Guard, Casler, Four Years in the Stonewall Brigade, the two Richmond Howitzer books, List of Field Officers in the Confederate States Service (1912).

## Parse method and text quality

All sources are Internet Archive OCR. Text layers (`_djvu.txt`) were parsed with line rules; two sources were rebuilt from word coordinates in `_djvu.xml` (Warren and Loehr). Dates are read with an OCR-tolerant reader (`scripts/vscommon.py`: 1801 is read as 1861, G as 6, ordinal and day-first dates). Rules applied in PLAN 2.2 order; a Gettysburg casualty beside an enlistment date that the OCR may have damaged keeps Present-Documented and is flagged `ocr-date-conflict`; a casualty beside an earlier separation is Unknown, `contested`.

* Doles-Cook: clean type; entries `SURNAME, GIVEN— Rank, date. remarks`; remarks are service history written in 1903, so most men are Unknown (no 30 June status). Both Company E rolls of the 21st Georgia (Sardis Volunteers and Concord Rangers) are headed "Company E" in the book and are kept as printed.
* Salley: the only source in this family built from the 30 June 1863 company muster rolls. The 2nd South Carolina roll is dated 1 July 1863 (flag `roll-dated-1-july`). Where the entry says a man is on no later roll and the last date given for him is before 30 June 1863, he is Absent-Documented by roll omission (flag `absent-by-roll-omission`; 893 rows). The scan repeats the Company G heading of the 3rd South Carolina; exact repeats inside that company were dropped (logged in this README, not row by row).
* Loehr gives years, not dates; Warren is printed before the battle and cannot show Gettysburg; Beale and the Paroles officers' lists give no status at all.
* OCR quality: Doles-Cook, Salley, Loehr, Page, Irby, Nichols read well; Warren does not (print and scan damage: about 3 names in 5 on the first page are damaged; needs a second reading of the images, owner decision G02); the Tompkins pamphlet rolls are clean but its event lists glue entries and 18 killed-list names were left unmatched to the roll (kept as their own rows).
* QA: `QA-SAMPLE.md` (87 rows against page images; defects found and fixed).

## Unit reconciliation

For the ten full units, `units.csv` carries named present, absent, unknown and ambiguous counts against the OOB strength. Every one is Short: the highest named-present share is the 2nd South Carolina, 124 named present against an OOB strength of 412 (the OOB file gives 197 casualties; 119 rows carry a Gettysburg casualty remark). No unit is Reconciled and none is Contested. The roll-only men (Unknown) exceed the OOB strength in every full unit (1.4 to 4.0 times), which is the pilot's finding again: a roll compiled after the war cannot say who stood in the ranks.

## What is missing and why (full table in `units.csv`; summary in `../../GAPS.md` section "C-VASCGA")

1. **Virginia infantry** (42 regiments): no open roll was found for any regiment except the 1st (Loehr) and one company of the 18th (Irby). The Howard regimental series and Manarin-type compilations are copyrighted print and are not on the Internet Archive as open items; the Library of Virginia holds pension and disability records only. Officer names (380 rows) and hospital names (87 rows) exist for 35 more. Five Virginia infantry units have no names at all: 7th, 49th, 50th, 52nd Virginia and the 22nd Virginia Battalion.
2. **Georgia infantry** (36): rolls for five regiments (4th, 11th, 12th, 21st, 44th) plus nine companies of the 61st. Henderson's 1959-64 Roster (the complete modern source) is lending-restricted on the Internet Archive and copyrighted; it was not opened. The Georgia Archives hold the original company muster rolls (Record Group 22-1-63, "Confederate Muster Rolls") as page images in their Virtual Vault; they are public records and handwritten manuscripts, need a second reading by eye, and the https endpoint fails certificate verification from this machine (not bypassed). That is the open route for the 23 Georgia regiments that have only officer and hospital names, and for 7 with none (Cobb's and Phillips Legions, 2nd Battalion, 14th, 35th, 45th, 49th).
3. **South Carolina infantry** (11): Salley vol. II covers the 2nd and 3rd; vols. I (1913) and III (1930), which would cover the 1st provisional, 1st rifles, 7th, 8th, 12th, 13th, 14th, 15th and 3rd Battalion, were not found as open Internet Archive items by title, creator or identifier search. The 14th is partly covered (Company K).
4. **Cavalry** (21): only the 9th Virginia Cavalry roster. **Artillery** (33): only Page's Battery. Richmond Howitzers (three companies in the OOB), the Rockbridge, Fauquier, Hampden and other Virginia batteries, and the Georgia and South Carolina batteries have no open roll found; the Richmond Howitzer books and the Chamberlayne pamphlets were downloaded and are narrative, not rolls.
5. **Appomattox enlisted paroles** (SHSP vol. 15): the enlisted lists are printed in two columns with ditto marks and no regiment on each line, and the OCR text has about 74 of some 200 regiment headings readable; a coordinate reading plus page images would be needed. Not read in this pass.
6. **Newspapers** (Richmond and Georgia 1863 casualty lists): Chronicling America answers the identified user agent with HTTP 403 on robots.txt (BLOCKED, not circumvented); the Georgia Historic Newspapers robots file disallows text, PDF and XML; not used.
7. **Per-man presence on 1 to 3 July 1863** stays the PLAN G01 gap for every unit except through Salley (2nd, 3rd South Carolina).

## Reproduce

`scripts/run_all.sh` rebuilds every `csv/` file, then `flag_dupes.py` and `finalize.py`. Inputs are the cached files listed in `acquired.json`.
