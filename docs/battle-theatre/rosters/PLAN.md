# Roster program: names, presence and the roster page (Part F, Battle Theatre)

Written 19 October 2026 by the roster program agent. Scope: find where the complete names of both armies at Gettysburg can be obtained, define how "present at Gettysburg" is decided for each named man, build a three-regiment pilot, design the roster section, and estimate the cost of the whole job. No product code was changed. No outward-facing action was taken: no account, key, email, upload, purchase or permission request was made. Network use was read-only, rate-limited and identified (`gettysburg-map-research/1.0`).

Evidence labels in this document follow the site vocabulary. **Documented**: I read the source and the number or fact is in it (source and page given). **Measured**: I ran a command and the number comes from its output. **Computed**: derived by arithmetic from Documented or Measured numbers. **Modelled**: an estimate from stated assumptions. **Contested**: sources disagree and both are shown. **Unknown**: not determined. A label says what a source supports; it is never a reason to lower a gate (section 4.3).

Files in this folder: `PLAN.md` (this), `SOURCES.csv` (52 sources, status per source), `GAPS.md` (gaps, permissions and owner decisions), `pilot/` (three regiment CSVs, `reconciliation.json`, `pilot-stats.json`, `QA-SAMPLE.md`), `schema/` (data model), `pipeline/` (the scripts that produced the pilot).

---

## 0. What you need to know first

1. **Names can be obtained; per-man presence on 1 to 3 July 1863 cannot, from open sources alone.** State rosters (public domain, on the Internet Archive) give a man's service history. They do not say whether he was at Gettysburg. The documents that do (the company muster rolls of 30 June 1863 in the National Archives compiled service records) are behind Fold3 (link-out only), FamilySearch (written permission needed for bulk use) or an untested NARA Catalog route. Measured in the pilot: a man who is on the roll with no recorded absence was present between 36 and 72 percent of the time (0.62 Wisconsin, 0.72 North Carolina, 0.36 Maine). No single probability can be assigned, so the roll alone supports no per-man claim.
2. **The pilot reached these counts** (Measured, section 3): 6th Wisconsin 177 men named present against 340 in the ranks (Dawes); 26th North Carolina 512 against 885 present for duty on the 30 June muster rolls (Clark); 20th Maine 529 named present against 386 in the official report, which is **Contested**, not a success: the Maine commission's 1898 participants list names about 575 people for a regiment reported at 386 all told.
3. **The OCR text layer, not the labelling logic, is the main source of error.** Of 5,379 pilot rows, 559 Wisconsin rows (27 percent) and 319 North Carolina rows (17 percent) are `unreadable-or-ambiguous` because a year, month or remark word is missing or garbled; 157, 83 and 87 rows carry a garbled name. The `_hocr.html` on these Internet Archive items is an ABBYY export, the same engine, so it is not a second reading. A second OCR (or a vision read of the date and remark columns) is required and is costed below. No OCR engine was installed for the pilot.
4. **The best per-man source found is the Maine commission's Participants list** (Maine at Gettysburg, 1898, public domain): named men by company, plus a revised casualty list. Other state Gettysburg commission volumes (Pennsylvania, New York, Michigan) exist on the Internet Archive and have not been inspected. That is the cheapest next lever on the Union side.
5. **Share completable from open sources** (Modelled from the pilot and the repository's order-of-battle file, section 5.5): about 64 percent of the roughly 166,000 men can be listed by name from sources verified to be open (Union 93 percent of infantry strength, Confederate 27 percent); about 17 to 26 percent can be individually documented present without permission. The rest needs permission, purchase, or is lost (Confederate record loss, civilians).
6. **Cost of the whole job** (Modelled, section 5): open-source path about 32 to 50 million tokens and about 340 agent-hours (range 270 to 450), Union about 19 to 29 million, Confederate about 14 to 20 million. The muster-roll upgrade, which is the only route to per-man presence, is a further 40 to 80 million tokens and 250 to 400 hours, and starts only after permission.
7. **Eight things only the owner can do** are in section 6. The first is whether to send the written requests to the NPS and FamilySearch (nothing was sent).

---

## 1. Source inventory

`SOURCES.csv` has one row per source with coverage, format and quality, licence or terms, the fetch rule, status and locator. This section summarises it. Status codes: **FETCHED** parsed in the pilot; **META** existence, identifier and copyright flag verified (Internet Archive metadata or a page read), not parsed; **TERMS** the host's terms page read; **CANDIDATE** from prior knowledge or a search snippet, not verified, Stage 0 must verify before use; **BLOCKED** behind a bot challenge, lending wall or rule, not fetched.

### 1.1 Union (units and strength from the repository file `baseline/dist/data/oob/`, which cites Busey and Martin and the Official Records: 237 infantry regiments, 70,220 men; 37 cavalry regiments, 12,644; a partial battery list)

| state or arm | infantry regiments / men | source (SOURCES id) | status | note |
|---|---|---|---|---|
| New York | 67 / 19,162 | AG annual reports, Registers of NY volunteers; Phisterer (U08) | META | volume mapping to regiments is a Stage 0 task |
| Pennsylvania | 66 / 19,321 | Bates, History of Pennsylvania Volunteers, 5 vols (U07) | META | largest single state |
| Massachusetts | 17 / 5,007 | Massachusetts Soldiers, Sailors and Marines, 8 vols, 1931-37 (U13) | META | IA flags public domain; confirm US status of 1931-37 |
| Ohio | 13 / 3,802 | Official Roster, 12 vols (U12) | META | |
| New Jersey | 12 / 3,739 | Stryker, 2 vols (U14) | META | |
| Regular Army | 11 / 2,562 | no verified source (U21) | CANDIDATE | enlisted men have no state roster |
| Maine | 9 / 2,971 | AG report 1863 App. D (U02); Maine at Gettysburg 1898 (U03); 1867 name index (U04) | FETCHED | 1864-65 final roster not obtainable (G03) |
| Vermont | 8 / 3,494 | Revised Roster (U16) | META | |
| Michigan | 7 / 1,910 | Record of Service, 46 vols (U11) | META | one volume per regiment |
| Wisconsin | 6 / 2,008 | Roster of Wisconsin Volunteers, 2 vols (U01) | FETCHED | |
| Connecticut | 5 / 1,321 | Catalogue of Connecticut Volunteer Organizations (U17) | META | |
| Indiana | 4 / 1,359 | AG Report (U18) | META | |
| New Hampshire | 3 / 757 | Ayling, Revised Register (U15) | META | |
| Delaware, Maryland, Rhode Island, West Virginia, multi-state | 7 / 2,278 | none verified (U21) | CANDIDATE | |
| Illinois, Minnesota | 2 / 529 | AG Report (U19), Minnesota in the Civil and Indian Wars (U20) | META | |
| cavalry (37 regiments), artillery, headquarters, provost guard, Engineer Brigade, signal, ambulance, wagon trains | | state rosters above plus OR 27 (U22) | META | teamsters and sutlers expected Unknown |

Union infantry strength with a verified open source: 65,380 of 70,220 (93.1 percent, Computed). Officers of every state: Official Army Register of the Volunteer Force (U10, META). Union casualties 23,049 (Documented: OR 27 part 1, casualty return, Army of the Potomac total, table ends p.187). Army-level present strength: OR 27/1 p.151 (garbled in the text; image needed, G16).

### 1.2 Confederate (171 infantry regiments, 57,104 men; 22 cavalry regiments, 5,703; three corps artillery groups)

| state | infantry regiments / men | source | status | note |
|---|---|---|---|---|
| North Carolina | 33 / 12,949 | Moore 1882 (C01); Clark 1901 (C02) | FETCHED | public domain. Manarin et al. 22 vols is print and copyrighted (C03); the state publishes a name index PDF and a database that so far holds only US Navy records (page read) |
| Virginia | 42 / 12,022 | none verified as a service roster; Library of Virginia pension database is later-life records (C04) | META | Howard regimental series is copyrighted print; nothing found on the Internet Archive |
| Georgia | 36 / 11,684 | Henderson 1959-64 (C05), lending-restricted on the Internet Archive, FamilySearch lists digital volumes; Doles-Cook brigade muster rolls 1903 (C06) for 4 regiments | BLOCKED / META | copyrighted modern compilation |
| Alabama | 17 / 5,837 | ADAH Civil War Service Database (C07); FamilySearch index of NARA M311 | CANDIDATE | terms unread |
| Mississippi | 11 / 4,593 | MDAH holdings; NARA M269 on Fold3 (C08) | CANDIDATE | no free MDAH name database found |
| South Carolina | 11 / 4,064 | FamilySearch index of NARA M267; Broadfoot print (C09) | CANDIDATE | |
| Louisiana | 10 / 2,399 | Booth 1920 (C10) | META | public domain; known incomplete |
| Texas, Florida, Tennessee, Arkansas, Maryland | 11 / 3,556 | none verified (C11) | CANDIDATE | |
| cavalry, artillery, staff | | state rosters, OR 27 part 2 (C12) | META | |

Confederate infantry strength with a verified open source: 15,348 of 57,104 (26.9 percent, Computed: North Carolina and Louisiana). Per-man service records for every state: NARA compiled service records (M270 North Carolina, M267 South Carolina, M269 Mississippi, M311 Alabama and others, C13), on Fold3 (paid; North Carolina set 207,719 records) and indexed on FamilySearch. Prisoners of Gettysburg: NARA RG 109 reels (Fort Delaware 53-64, Point Lookout 130, Johnson's Island 84, C14), who are Present-Documented by definition. Gettysburg dead reburied in Richmond: lists not located (C15).

### 1.3 Cross-army sources

Official Records Series I vol 27 parts 1 to 3 (part 1 FETCHED and parsed; part 2, Reports, downloaded but not parsed; part 3 META): organisation, returns, reports (Chamberlain 386 all told on p.626; Dawes's brigade guard). Fox, Regimental Losses (FETCHED). Busey and Martin, Regimental Strengths and Losses at Gettysburg (BLOCKED: the Internet Archive copy is a lending copy; the repository OOB carries its values second-hand). NPS Soldiers and Sailors System (TERMS). Soldiers' National Cemetery report (META, about 3,500 Union dead). Find a Grave (link-out).

### 1.4 Access rules per host (every one read this session)

| host | what the terms or files say | rule adopted |
|---|---|---|
| Internet Archive | robots.txt disallows only `/control/` and `/report/`; each item's metadata shows `possible-copyright-status`; lending copies are `access-restricted-item: true` | per-file download, 1.5 to 3 s apart, cached; lending items never opened (Henderson Georgia, Manarin vol III, Busey and Martin) |
| NPS (nps.gov) | the CWSS pages state no reuse terms, no API, no bulk download; the database is "no longer maintained"; built from NARA index cards by volunteers and the Genealogical Society of Utah and Federation of Genealogical Societies; NPS-created material is generally public domain but third-party content is not; robots.txt disallows `/search/` | not scraped. Route to permission: the NPS Civil War program Contact Us form (nps.gov/subjects/civilwar/contactus.htm). Ask in writing for a name-level extract of the Gettysburg units under a stated licence and keep the reply on file. The task brief says written permission is required |
| FamilySearch | no bulk download or scraping without prior written permission; no circumventing controls; personal noncommercial use; permission requests answered in about 45 days; robots.txt disallows record pages | deep links only; written request needed for anything else |
| Fold3 and Find a Grave | under Ancestry terms section 1.3: no automated or programmatic access beyond standard human use, no reproduction, no use to train AI systems | link-out only |
| NARA Catalog API | key required; 10,000 queries per month by default; scraping or downloading the whole Catalog through the API is not allowed (bulk copy is on the AWS Open Data Registry); content should not be cached; not-endorsed notice required | key and small targeted queries in Stage 0 to learn whether CSR images are served at all (unverified) |
| Library of Congress | at most 10 requests per minute; robots.txt honoured (Crawl-Delay 5); rights per item | not used in the pilot |
| Digital Maine (Maine State Archives) | the file URLs answer with a Cloudflare bot challenge | **not fetched, not circumvented.** The item page for the 20th Maine deceased list was read once through the fetch tool before the challenge was known (rights: No Copyright - United States); the file requests then returned the challenge page, which was deleted, and no further request was made. The 1864-65 Maine roster and the deceased list need a manual browser download by the owner or a written request to the Maine State Archives |
| ehistory.osu.edu, HathiTrust babel, Perseus, civilwartalk | blocked by the brief | not touched |

---

## 2. How "present at Gettysburg" is decided

### 2.1 Labels and evidence tiers

Each named man gets one label:

* **Present-Documented**: a source places him at the battle: a casualty, capture or death at Gettysburg; a name on a participants or present list compiled from the rolls; a named mention as present in an official report or regimental history; a prisoner or burial record; or company muster rolls of 30 June and the next date that both show him present for duty with no sick, detached or absent notation between them.
* **Absent-Documented**: separation dated before 1 July 1863 (discharge, death, desertion, transfer out, resignation, dismissal, promotion out); enlistment or commission-in after 3 July; or a source that says he was away (sick, furloughed, detached elsewhere, prisoner, absent on the muster roll).
* **Present-Probable**: no document of presence, but a stated positive indication (for example promoted in the field in July 1863, or present on the rolls on both sides of the battle with no change), with a **probability** and the model that produced it. Not assigned from a roll alone.
* **Unknown**: everything else. Sub-status `roll_status`: `on-roll-undetermined` (enlisted before, no separation before, no status for the day), `unreadable-or-ambiguous` (an OCR or printing defect hides a date), and for the Confederate side `record-loss` (the roll for the date does not survive).

Source tier (stored per row): **A** contemporary primary (muster rolls, returns, reports); **B** official compilations of A (adjutant general rosters, commission volumes); **C** regimental histories and memoirs; **D** modern secondary (Busey and Martin, Manarin); **E** indexes. A label rests on the best tier present; two tier-B sources that derive from the same roll count as one.

Mapping to the site's six labels: Present-Documented and Absent-Documented are Documented; Present-Probable is Modelled; Unknown is Unknown; a unit whose named count and strength disagree is Contested; unit-level counts and sums are Computed.

### 2.2 Decision rules (applied in this order; the first that fires sets the label; a later rule never overrides an earlier one)

| # | rule | label | basis code |
|---|---|---|---|
| 1 | row cannot be assigned to a unit_id of the order of battle | not published | UNIT-UNRESOLVED |
| 2 | casualty or capture at Gettysburg named in a source (remark, list, return) | Present-Documented | CAS-REMARK |
| 3 | named on a participants or present list (Maine 1898) | Present-Documented | PART-LIST |
| 4 | named present in an official report or regimental history (officers, colour bearers, named soldiers) | Present-Documented | OFFICER-HISTORY |
| 5 | prisoner of war record for Gettysburg, or burial at the Soldiers' National Cemetery or a Confederate reburial with unit | Present-Documented | POW / BURIAL |
| 6 | company muster roll of 30 June 1863 shows present for duty and the following roll shows him present without a gap | Present-Documented | MUSTER-JUN63-PRESENT |
| 7 | separation dated before 1 July 1863 | Absent-Documented | SEP-BEFORE |
| 8 | enlisted or commissioned in after 3 July 1863 | Absent-Documented | ENL-AFTER |
| 9 | source states him sick, furloughed, detached elsewhere, absent or a prisoner on the day | Absent-Documented | ABS-NOTATION |
| 10 | two sources disagree about rules 2 to 9 | Unknown, flag `contested`, both cited | CONFLICT |
| 11 | positive indirect evidence with a stated model | Present-Probable with probability | INDIRECT-... |
| 12 | enlisted before, no separation before, no status | Unknown, `on-roll-undetermined` | ONROLL-NO-STATUS |
| 13 | a date or remark is illegible | Unknown, `unreadable-or-ambiguous` | OCR-DATE-LOST |
| 14 | Confederate roll for the date lost | Unknown, `record-loss` | RECORD-LOSS |

Two derived rules carry a Modelled assumption and are checked per regiment: Drafted men of the 6th Wisconsin are Absent (the regiment received draftees only in September to November 1864; every legible Drafted row is 1864 or 1865; the OCR sometimes reads 64 as 61), and an officer table's "Rank from" date is never used as an enlistment date.

### 2.3 Unit reconciliation: the strength anchor

Every unit carries a documented strength present `S_doc` with its source (Documented), taken from the best primary figure (a commander's report, the muster-roll total quoted in a regimental history, the OR). For each unit the roster computes `N_PD` (named present), the probable mass `Σp`, the on-roll-undetermined count, the absent count, and the status:

* **Reconciled**: `|S_doc - (N_PD + Σp)| <= 3 percent of S_doc`;
* **Short**: `N_PD + Σp < S_doc`; the roster states "n present, names not recovered" (a count, never invented names), which is also what keeps "soldiers rendered = number present" true in the Theatre;
* **Contested**: `N_PD > S_doc` by more than the attached and detached men can explain; both numbers shown with sources.

### 2.4 What the pilot says about roll-only presence (Measured and Computed)

| | 6th Wisconsin | 20th Maine | 26th North Carolina |
|---|---|---|---|
| documented strength present | 340 (Dawes 1890) | 386 all told, 358 guns (Chamberlain, OR 27/1 p.626) | 885 present for duty, enlisted men, 30 June muster rolls; about 800 muskets on day one (Clark 1901) |
| named present (Present-Documented) | 177 | 529 | 512 |
| on roll, no status (`on-roll-undetermined`) | 370 | 557 | 717 |
| named plus on-roll | 547 | 1,086 | 1,229 |
| documented strength divided by named-plus-on-roll | 0.62 | 0.36 | 0.72 |
| named present divided by documented strength | 0.52 | 1.37 (Contested) | 0.58 |

On the brief's two named yardsticks: Fox's Regimental Losses gives enrolled strength and losses (30 killed, 116 wounded, 22 missing for the 6th Wisconsin; 41 killed and mortally wounded for the 20th Maine at Gettysburg; the Greatest Losses tables on pp.430-440 give killed, wounded, missing, aggregate) but **no present-at-Gettysburg figure per regiment**; the Official Records carry strength present at corps and brigade level in tables the plain text garbles, and at regiment level only inside commanders' reports (Chamberlain's 386, Dawes's brigade guard). The three present figures above therefore come from a regimental commander's report, a regimental history and a regimental history quoting the muster rolls.

So between one-third and three-quarters of on-roll men were there; the spread is the reason Present-Probable is withheld for roll-only men. The Wisconsin pilot first labelled its 370 on-roll men Present-Probable; that was withdrawn.

### 2.5 Confederate record loss, handled honestly

1. **Roll survives and is named**: label by rules 2 to 9. North Carolina is this case (Moore compiled from muster rolls and annotates Gettysburg), but Moore under-annotates: 512 men carry a Gettysburg remark against 708 killed, wounded and missing (Clark).
2. **Roll for the date lost, unit strength known** (from a regimental history, OR, Busey and Martin): names come from the nearest surviving rolls (August 1863, later rolls, pensions); each man is Unknown with `record-loss`, never Probable from a roll that does not cover the date; the unit shows `S_doc` present and the named count honestly short.
3. **No names recoverable**: the unit page states the strength present and "names not recovered", and a gap entry is filed.

The survival table of Confederate muster rolls by regiment is Unknown today (G17); building it from the NARA finding aids is Stage 0.

### 2.6 Special cases

Officers and staff need their own evidence pass (all three hard errors in the sample were officers; section 3.5): a regimental history or report names them present, and a colonel can be absent sick (Bragg). Men detached to another unit are Present with `attached_to_unit_id` (Wisconsin men in Battery B, 4th U.S. Artillery). Men who died of wounds after the battle are Present-Documented. Prisoners paroled before 1 July are Absent. Brigade guards and provost details are attached by report (Dawes's brigade guard of 2 officers and 100 men came from the brigade, not the regiment). Teamsters, sutlers and servants are mostly unnamed civilians and stay Unknown.

---

## 3. Pilot: 6th Wisconsin, 20th Maine, 26th North Carolina

All data in `pilot/`. Every row keeps the name and remark exactly as printed, its source, and the rule that set its label.

### 3.1 Results

| | 6th Wisconsin | 20th Maine | 26th North Carolina |
|---|---|---|---|
| source table | Roster of Wisconsin Volunteers 1886, book pp.494-537 (IA `rosterofwisconsi01wisc`, djvu 512-555) | Maine AG Report 1863 App. D, 20th Maine returns of 1 Dec 1863, pp.572-602 (IA `annualreportofad1863main`, djvu 791-821); Maine at Gettysburg 1898 pp.263-272 (IA `maineatgettysbur01main`) | Moore 1882 vol 2 pp.362-406 (IA `rosterofnorthcar02nort`) |
| rows parsed | 2,098 | 1,306 + 50 participants with no return row | 1,925 |
| unique persons | 2,056 | 1,306 + 50 | 1,898 if every same-name pair is merged |
| Present-Documented | 177 | 529 | 512 |
| Absent-Documented | 982 (400 off the roll before the battle; 582 not yet enlisted) | 220 | 377 |
| Unknown | 929 (370 on roll; 559 unreadable) | 607 | 1,036 (717 on roll; 319 unreadable) |
| duplicates | 34 transfer pairs merged; 10 cross-reference rows dropped; 67 exact same-name pairs in all | 10 exact same-name pairs, no transfer evidence | 35 exact same-name pairs (27 within one company: officers listed once per rank) |
| spelling variant pairs | 9 (Chrisler/Chrisier, Kurtz/Kurz, Moreau Isadore/Isadora, Martin/Mart n) | 50 of 526 participant names did not match a return row, mostly OCR (return reads Maun, Iliscock; list reads Mann, Hiscock) | 0 found by the matcher; OCR variants such as Farriugton for Farrington are only caught by the page image |
| rows flagged garbled name | 157 (7.5 percent) | 83 (6.4 percent) | 87 (4.5 percent) |

### 3.2 6th Wisconsin

*Sources and layout.* The roster page is a four-column table (name, residence, date, remarks); the plain text separates the columns, so rows were rebuilt from the word coordinates in the Internet Archive `djvu.xml` (columns found by a per-page left margin and fixed offsets, continuation lines attached to the row above). The Date column is the enlistment date for men and "Rank from" for officers. Remarks give service history only.
*Documented strength.* 340 officers and enlisted men marched in the ranks on 1 July, plus a brigade guard of 2 officers and 100 men (Dawes 1890, chapter The Sixth Wisconsin at Gettysburg). The repository OOB carries 344.
*Casualties.* 30 killed, 116 wounded, 22 missing, 168 (Fox 1889; also Dawes's footnote "actual loss one hundred and sixty eight"); 2+28 killed, 7+109 wounded, 23 missing, 169 (Dawes's appendix table, p.184, read from the page image). **Contested by one man.**
*Reach.* 31 rows say killed at Gettysburg (Fox: 30 killed); 155 rows carry any Gettysburg remark, 92 percent of the 168 casualties; 16 officers are named present by Dawes's footnote list.
*Conflicts found.* Colonel Bragg: the roster lists him as Colonel from 10 March 1863; Dawes's chapters show him ill and in Washington in June and returning on 8-9 July: Absent-Documented. Lieutenant Hyatt: the roster shows Captain from 19 April 1864; Dawes names him present as a lieutenant of Company B. Six rows named Gettysburg but also carried a before-the-battle date that is an OCR year misread (for example a transfer on "Nov. 27, '61" that is 1864): kept Present-Documented and flagged.
*Other findings.* Men detached to Battery B, 4th U.S. Artillery appear in the roster (Palmer U., wounded at Gettysburg; Spragu D., killed 1 July): present with another unit (G09). The Wisconsin pages for Companies G, H and I lose most years (Unknown 105, 79, 87 rows).

### 3.3 20th Maine

*Sources and layout.* The Adjutant General's company returns give name (surname first for privates), age, residence, married or single, muster date and a remark, as at 1 December 1863 with every change since 1 November 1862. The columns are shifted on some pages (a per-page scale from the remark column fixes this). The remark describes December status, so "Wd. at Gettysburg" survives only for men still absent. The 1898 volume's Participants list (two-column text, split by x coordinate) names the men present by company, with a separate line for special duty and detached service, and a Revised Report of Casualties.
*Documented strength.* "We went into the fight with 386, all told, 358 guns" (Chamberlain, 6 July 1863, OR 27/1 p.626). The 1898 text adds that some reported absent sick came up, and that the pioneers, the provost guard and the prisoners under arrest went into the ranks. The monuments say 358 engaged, 130 killed and wounded.
*Casualties.* 130 (38 killed or mortally wounded, 92 wounded: monument), 136 with 30 killed (Chamberlain), 41 killed and mortally wounded (Fox): **Contested**. The casualty parser found 112 names of about 130; 111 of the 112 are also on the participants list.
*Reach and the contest.* The participants list parses to 526 privates, NCOs and special-duty names plus about 50 officers and staff, about 575 people against 386. Of the 526, 476 matched a return row in the same company; 3 matched a man the return shows discharged before the battle (all three are rows the parser merged across a page defect, not real conflicts). The return and the list otherwise agree (men discharged in January to June are not on the list). The 189-name gap is **Contested** and not resolved: 62 special-duty names, the sick who came up and the pioneers explain part. The 30 June 1863 muster roll would settle it.
*Not obtainable.* The 1864-65 Maine report with final roster (pp.623-661) is not on the Internet Archive and Digital Maine is bot-challenged (G03).

### 3.4 26th North Carolina

*Sources and layout.* Moore prints one entry per line ("Surname, Given, e. date; county; remarks"), with abbreviations (e. enlisted, w. wounded, k. killed, pr. prisoner, d. died, dg. discharged, tr. transferred, p. promoted). The plain text is parseable without coordinates, but the OCR sometimes puts the first word of the next entry at the end of the previous line (63 entries still begin with punctuation or "e.").
*Documented strength.* 885 enlisted men present for duty on the 30 June 1863 muster and pay rolls; allowing 10 percent for extra duty and details, about 800 muskets on the first day (Clark 1901, 26th Regiment chapter pp.371-374). The repository OOB carries 843. The Clark chapter also gives present-for-duty by company: A 97, B 92, C 80, D 79, E 104, F 91, G 91, H 78, I 74, K 99 (sum 885, Computed), and the company officers present, with the officers absent on detached duty or sick furlough.
*Casualties.* 708 killed, wounded and missing in the first and third days (Clark); 674 on the 31 August muster rolls (139 killed and mortally wounded plus 535 wounded and missing); 588 in the OOB file: **Contested**. Moore names 512.
*Per-company reconciliation (Computed).* Companies, Moore entries not absent, named present, Clark present for duty: A 157, 63, 97; B 133, 25, 92; C 160, 50, 80; D 170, 18, 79; E 168, 70, 104; F 165, 71, 91; G 156, 54, 91; H 135, 49, 78; I 137, 50, 74; K 151, 59, 99. Companies B and D are the thinnest in Gettysburg annotations. Not-absent entries in Moore total 1,532 against 885, a factor 1.7.
*Duplicates.* Officers appear once per rank (27 same-company same-name pairs). Merging every same-name pair gives 1,898 persons, the figure Clark quotes as Moore's aggregate enrolled for the regiment (a match that may be partly coincidence given parse noise).

### 3.5 Quality: what is wrong and how much (Measured)

* Name garbling flagged by the pipeline: 157, 83 and 87 rows (7.5, 6.4 and 4.5 percent).
* Rows whose label is limited by the text layer (`unreadable-or-ambiguous`): Wisconsin 559 (27 percent), North Carolina 319 (17 percent), Maine 50 (4 percent).
* Page-image spot check by the author (`pilot/QA-SAMPLE.md`): three pages, 155 rows. No enlisted man received a false Present or false Absent label in 145 rows; all three hard errors were officers; 13 rows (8 percent) were labelled more weakly than the printed page supports; one pair of Maine rows was merged by an ink blot; North Carolina had 5 name errors in 53 entries. This was not random and not independent; it fixed five rules (abbreviation `res.`, Gettysburg pattern with C for G, officers' Rank-from, ditto-mark remarks, OCR month table). Re-running the same pages now agrees by construction, so only fresh pages count (section 4.4).

### 3.6 Time and token cost per regiment (Measured; the clock is the machine's, the tokens the session counter)

* Wall-clock by file time stamps: 6th Wisconsin first download 14:15, first classified roster 14:30; Maine returns downloaded 14:18, participants parsed 14:36, merged 14:42; North Carolina downloaded about 14:19, classified 14:42; final files and the page-image check 14:53. About 40 minutes for the three, nearly all of it source discovery and parser development.
* Compute once the files are cached: Wisconsin parse and classify 2.8 s, Maine 3.3 s, North Carolina 0.5 s; a 60 MB `djvu.xml` reads in 3.6 s.
* Tokens: about 0.5 million for the whole session (inventory and terms reading, three pilots, image checks, this write-up), about 150,000 per regiment if spread evenly. Most of that is one-time: three source families, a common library, debugging. A further regiment in the same family is expected to cost 10,000 to 20,000 tokens (Modelled): conflicts, exceptions and a page-image check.

### 3.7 What the pilot does not show

It does not show any Confederate state other than North Carolina, any Union state other than Wisconsin and Maine, an artillery or cavalry unit, or how many Confederate muster rolls survive. It cannot test the muster-roll route because those images were not available to it.

---

## 4. Design

### 4.1 Data model and sources ledger

`schema/person.schema.json`: one row per man per source-printed name, with `id` (stable, tombstoned when removed), `army`, `unit_id` (the OOB `regiment_id`, for example U-20ME and C-26NC), `company`, `attached_to_unit_id`, rank as printed and class, `name_as_printed` (never silently corrected) plus normalised name (surname key, phonetic key, variants, correction status), residence, age, enlisted, `label`, `roll_status`, `probability` (Present-Probable only), `basis` codes, `events` (killed, wounded, captured, detached, promoted, died and the rest, each with date precision and source), `flags`, `dup_group`, `sources` (source_id, locator, page image URL, OCR text of the row) and `evidence_label`.

`schema/sources-ledger.schema.json`: one entry per source with citation, tier A to E, licence class (`PD-US`, `US-government-work`, `restricted-link-out`, `permission-granted`, `permission-pending`), terms URL, locator, retrieval date, user agent, file names with `sha256` and byte counts, the pipeline version that made the rows, known defects and the attribution text shown on the page.

Per unit, a `reconciliation` record: `S_doc` list with sources and labels, counts per label and `roll_status`, `N_PD + Σp`, status (Reconciled, Short, Contested), conflicts. Units join the Theatre through the OOB ids already in `baseline/dist/data/oob`.

### 4.2 Roster page

* **Entry**: one search box and four filters. Search takes "surname", "surname, given", "J. Smith", partial and misspelt names (edit distance on the surname key plus a phonetic key) and shows result counts as you type. Filters: army, state, unit (autocomplete from the OOB), company, rank class, label (with counts), evidence label. Default view hides men who are Absent-Documented; a toggle shows them under "on the roll, not at Gettysburg".
* **Result row**: name as printed, unit and company, rank, residence, a label chip in words with a shape or icon as well as colour, and the first source. Rows with a garbled-name or conflict flag show a marker.
* **Entry card**: name as printed and normalised, every field with its source and page; the label in words with its basis ("named on the 1898 Maine participants list p.265; wounded, arm, p.271"); the events timeline; each source with citation, licence class, a link to the page image, and the stored OCR text of the row; flags in words ("the OCR text of this name is suspect: check the page image").
* **Unit page**: documented strength present with its source and label; a stacked bar of counts by label; the explicit remainder "n present, names not recovered" (Short) or the two competing numbers (Contested); the company list; the conflicts for the unit; a download of the unit's rows when the licence allows.
* **Links**: a stable URL per man and per unit; from the Theatre, a clicked soldier opens its roster entry when the roster has one, and the Theatre's unit strength is the same `S_doc`.
* **Accessibility and reach**: keyboard first (`/` focuses search, arrow keys move through results, Enter opens the card); labels never rely on colour alone; works at phone width; no login, no cookies, no storage of what people search; works offline after the shards are cached.
* **Honesty on the page**: a banner on any unit that fails a gate or has a Contested count; "Unknown" is shown as Unknown, never as absent.
* **Not in v1**: correction submission (needs an owner decision on where reports go: no email address is published), photographs, family trees.

### 4.3 Accuracy gates

No gate is relaxed except by a dated written owner decision filed in `docs/decisions/`; any relaxed gate is shown as a banner on the affected unit. Thresholds are set above the owner's 97 percent target.

| gate | measure | threshold | on failure |
|---|---|---|---|
| R-G1 name transcription | name exact against the page image after case and punctuation normalisation, independent sample | 99 percent or better, one-sided 95 percent confidence | stratum rebuilt with a second OCR and fresh sample |
| R-G2 dates | enlistment, event and separation dates exact against the page image | 99 percent or better | same |
| R-G3 label | label equals the label a second reader derives from the same images and rule sheet; hard errors (a label asserting the opposite) | 99 percent or better; zero hard errors in the sample | rules fixed and a fresh sample drawn |
| R-G4 unit reconciliation | every unit Reconciled, Short or Contested with the gap shown | 100 percent of units, never silent | unit not published as complete |
| R-G5 casualties named | named casualties divided by documented casualties where a casualty list exists | 98 percent or better; the rest listed as unnamed | source search continues |
| R-G6 citation | every Present-Documented and Absent-Documented row has `source_id` and a locator that resolves to a page image; ledger hashes match | 100 percent | row demoted to Unknown |
| R-G7 conservation | rows raw, parsed, deduplicated, published reconcile with tombstones | zero silent drops | build fails |
| R-G8 no invented names | a row exists only because a source row exists; matches across sources need two agreeing fields | 100 percent | row removed |
| R-G9 independent sample | section 4.4 passed for every stratum before publication | pass | not published |

### 4.4 Independent sampling test (specified, not yet run)

* **Who**: a second agent or person that does not see the classifier, the labels or the pages used in development (pilot pages are listed in `QA-SAMPLE.md` and excluded).
* **Strata**: source family by table type (enlisted, officers, ditto or low-OCR-confidence pages, transfer-heavy companies); about 40 strata.
* **Draw**: pages by a seeded pseudo-random draw from the page list; seed and pages published. At least a third of each stratum's pages come from the lowest OCR-confidence decile.
* **Task**: from the page image only, read name, residence, date and remark; independently assign the label from the rule sheet; compare with the stored row. Disagreements go to a third reader.
* **Sample size** (one-sided 95 percent Clopper-Pearson upper bound on the error rate; Computed): 299 rows with zero errors gives an upper bound of 1.0 percent; 473 rows with at most 1 error, 628 with at most 2, 773 with at most 3. Standard per stratum: 628 rows (about 13 pages) with at most 2 errors. About 520 pages for 40 strata, roughly 3 to 6 million tokens at 7,000 to 12,000 per page.
* **Result**: a stratum passes or is rebuilt and redrawn with fresh pages; results (counts, bounds, disagreements) are published with the data.

### 4.5 Storage and size budget (Measured on the pilot rows, scaled)

Measured: a detail row as compact newline-delimited JSON (name, company, label, source, 60 characters of remark) is 94 bytes raw and 17 bytes gzipped; a lean search row (name, company, label, source) is 35 bytes raw and 8 bytes gzipped; the median name is 15 characters.

| tier | rows | lean index raw / gz | detail raw / gz |
|---|---|---|---|
| A: named present and probable, about 166,000 men | 166,000 | 5.8 MB / 1.4 MB | 15.6 MB / 2.8 MB |
| B: A plus on-roll-undetermined (recommended; 1.4 to 2.8 times A in the pilot, 1.8 assumed, Modelled) | 300,000 | 10.5 MB / 2.5 MB | 28 MB / 5.1 MB |
| C: whole-war rolls (about 4 times A in the pilot) | 660,000 | 23 MB / 5.5 MB | 62 MB / 11 MB |

Recommendation: tier B, about 8 MB gzipped in all, plus `sources.json`, unit reconciliations (about 0.5 MB). Tier C is not needed by the roster page.
Static shards: `idx/{surname prefix}.ndjson.gz` for search (two letters; prefixes above 60 KB gzipped are split to three), `unit/{unit_id}.ndjson.gz` for browsing (about 400 rows, roughly 7 KB gzipped, up to 60 KB for the largest), `recon/{unit_id}.json`, one `sources.json`, one manifest. A search loads one or two index shards; a unit page loads one file. Page images are linked on the Internet Archive, not hosted.

### 4.6 Licensing and attribution

* Public-domain sources (state rosters, Official Records, pre-1931 books): free to transcribe and publish. Show citation, locator and "Digitized by the Internet Archive" with the contributing library where the item metadata gives one.
* Government works (NARA, NPS): follow the host's notice. If the NARA API is used the page must say it is not endorsed by NARA. NPS CWSS data is used only after written permission (P01).
* Modern compilations (Manarin et al., Henderson, Howard, Broadfoot, Busey and Martin): facts may be cited and checked; text and arrangement are not copied; no copying from lending-restricted Internet Archive items. Whether a given use is allowed is for the owner to confirm (this is not legal advice).
* FamilySearch, Fold3, Find a Grave: link-out only; no index data or images copied.
* The dataset we make (transcriptions of public-domain rows, labels, reconciliations): propose one licence for the whole (for example CC BY 4.0 with the transcriptions marked as derived from public-domain works); owner decision P07.
* Privacy: every man was born before 1850 and died long ago; no living person is named. A correction and takedown route is a v1.1 decision.

---

## 5. Effort and token cost to build everything

### 5.1 Workload (Documented from the repository OOB file; its strengths come from Busey and Martin and are second-hand)

Union: 237 infantry regiments, 37 cavalry regiments, an artillery list of 30 of 50 batteries (corps and reserve), 5 horse artillery batteries, plus headquarters and detachments: about 340 units and 20 source families (14 states with sources, 4 small states, Regulars, headquarters). Confederate: 171 infantry regiments, 22 cavalry, three corps artillery groups (about 60 to 70 batteries): about 270 units and 11 source families. Union casualties 23,049 (OR). The brief gives about 94,000 Union and about 72,000 Confederate present.

### 5.2 Unit costs (Modelled from the pilot)

First regiment of a new source family: about 150,000 tokens and 1 to 3 agent-hours (discovery, layout parser, label rules, spot check). Each further unit in the family: 10,000 to 20,000 tokens and 3 to 10 agent-minutes. Local second OCR: compute only (about 10 CPU-hours for 14,000 pages). Vision or language adjudication of the rows where the two OCRs disagree: about 1,200 tokens per row, expected 8 percent of 270,000 to 300,000 rows (range 5 to 12 percent), 8 to 25 million tokens. Independent sampling: about 3 to 6 million tokens (section 4.4). Muster-roll reading by a vision model: about 12,000 tokens per company roll page set, about 3,400 Union and about 2,700 Confederate company rolls if all survive and can be accessed.

### 5.3 Stages

| stage | content | units / families | tokens (million) | agent-hours | calendar | gated by |
|---|---|---|---|---|---|---|
| S0 | verify the 7 candidates, build the unit ledger from the OOB, build the muster-roll survival table (Confederate), NARA Catalog test, QA harness | all | 1.5 | 20 | 1 to 2 weeks (the 45-day FamilySearch reply runs alongside) | owner sends requests (P01, P02, P04) |
| S1-U | Union open rosters, casualty names, commission participants lists (PA, NY, MI inspected first) | 340 units / 20 families | 9 | 110 | 2 to 3 weeks | S0 |
| S1-C | Confederate open rosters: North Carolina and Louisiana now; Virginia, Georgia, Alabama, Mississippi, South Carolina, others as S0 verifies them | 270 units / 11 families | 6 | 75 | 2 weeks | S0, G11 |
| S2 | second OCR on all roster pages, conflict adjudication, date and name repair | about 14,000 pages | 8 to 25 | 60 plus about 10 CPU-hours | 2 to 3 weeks | OCR decision G02 |
| S3 | officers, commanders and staff evidence pass (regimental to army level), detached men, attachments | about 2,000 officers | 2.5 | 25 | 1 week | S1 |
| S5 | independent sampling, conflict adjudication, shards, publication | all | 5 to 6 | 50 | 2 weeks | S1 to S3 |
| **open-source total** | | | **32 to 50** | **about 340 (270 to 450)** | 8 to 12 weeks with 3 to 4 parallel agents | |
| S4 | muster-roll presence upgrade: read the 30 June 1863 company rolls, assign rules 6 and 9 | about 3,400 Union and 2,700 Confederate rolls | 40 to 80 | 250 to 400 | 6 to 10 weeks after permission | **permission** (P02, P04) and survival of the rolls (G17) |

By army (Modelled, open-source path): Union about 19 to 29 million tokens and 190 hours; Confederate about 14 to 20 million tokens and 150 hours. These are estimates with a plus or minus 50 percent band: they rest on three regiments.

### 5.4 What each stage delivers

After S1 to S3: every unit has a roll of names where a verified source exists, casualties named at about 90 percent or better of documented (the Wisconsin pilot reached 92 percent), participants lists where a commission volume has one, and a reconciliation status. After S5: gates passed or banners shown. After S4: the only route to per-man Present-Documented for survivors, limited on the Confederate side by record loss.

### 5.5 Share completable from open sources and share needing permission (Modelled)

Weights are the repository infantry strengths; the 94,000 and 72,000 totals are the brief's.

| outcome | Union | Confederate | both |
|---|---|---|---|
| named on a roll of the unit at the battle, from sources verified open | 93 percent of infantry strength (87,000 men) | 27 percent (19,000) | about 64 percent of 166,000 (107,000) |
| the same, if candidate sources verify open | up to about 100 percent | roughly 45 to 70 percent | not estimated |
| individually documented present from verified open sources (casualties, participants lists, officers): Union 25 to 40 percent, Confederate 30 to 45 percent of the named | 22,000 to 35,000 | 6,000 to 9,000 | about 17 to 26 percent |
| per-man presence at the 97 percent target | not reachable without S4 | not reachable without S4; capped by record loss | requires permission |
| names needing purchase or permission | the muster-roll status for all; DE, MD, RI, WV, Regulars (7 percent) | Virginia, Georgia, Alabama, Mississippi, South Carolina and others (73 percent of infantry) unless unit histories prove sufficient | |

The documented-present share rests on the casualty rate (Union 23,049 of about 94,000 is 24.5 percent, Computed from OR and the brief) plus commission lists, and on the pilot ratios (0.52 and 0.58 for regiments that lost about half or more of their men; a typical regiment lost about a quarter). The Confederate casualty rate was not verified.

### 5.6 Main risks

The OCR layer (mitigation S2); the Confederate record loss (G17); contested strengths (the Maine 575 against 386; the three North Carolina casualty totals); Busey and Martin being inaccessible (strengths second-hand); permissions that may be refused or slow; same-name men merged wrongly (R-G8 and identity rules); the 97 percent target for per-man presence, which the open path cannot meet.

---

## 6. Decisions and actions needed from the owner

1. Send, or authorise sending, the written request to the NPS Civil War program for a name-level extract (P01), and to FamilySearch (P02). Nothing was sent.
2. Download the Maine 1864-65 report and the 20th Maine deceased and hospital lists from Digital Maine in a browser, or ask the Maine State Archives (P05).
3. Approve an OCR engine in an isolated environment, or approve vision-model reading of the date and remark columns only (G02, P07).
4. Approve a NARA Catalog API key for the Stage 0 test (P04).
5. Decide whether to buy the print rosters for cross-checking (P06).
6. Choose the licence for the derived dataset (P07).
7. Confirm the gate policy of section 4.3 and the label rule that Present-Probable is withheld from roll-only men (P08).
8. Confirm that the roster page shows the whole roll with labels and the explicit "n present, names not recovered" remainder, rather than only the documented men (section 4.2).
