# Roster program: gaps list

Each gap has an ID, what is missing, why it matters for the 97-percent-and-over target, and the route to close it. "Open" means it can be closed from public-domain or openly accessible sources; "Permission" means it needs the owner to obtain permission or buy something; "Owner" means a decision.

## A. Evidence gaps (what the data cannot yet say)

| ID | gap | impact | route |
|---|---|---|---|
| G01 | **No per-man status for 30 June 1863.** State rosters give service history, not who was present, sick, on furlough or detached on the day. In the three pilots the documented strength divided by the on-roll-or-named count is 0.62 for Wisconsin (340 of 547), 0.72 for North Carolina (885 of 1,229) and 0.36 for Maine (386 of 1,086): a roll-only man is present between about one time in three and about three times in four, so no single probability can be assigned. | Without it, per-man Present-Probable cannot honestly be assigned, and a name-level "everyone who was there" list stops at the documented men (casualties, participants lists, officers). | Permission: the company muster rolls in the NARA compiled service records (Union RG 94; Confederate RG 109), via FamilySearch (written permission, reply about 45 days), NARA Catalog (Stage 0 test, key required, no scraping) or Fold3 (link-out only, terms forbid automated access). Open partial: state Gettysburg commission participants lists (Maine proved the idea; others not yet inspected, G14). |
| G02 | **No second OCR.** The `_hocr.html` files on these Internet Archive items are ABBYY exports, the same engine as the `djvu.xml`; they add no independent reading. No OCR engine is installed on the machine and none was installed for the pilot. | About 8 percent of sampled rows are weaker than the page supports; Wisconsin Companies G, H, I lose most years (Unknown 105, 79, 87 rows). Dates decide the label. | Owner: approve installing an OCR engine (for example Tesseract or PaddleOCR) in an isolated environment, or approve vision-model re-reading of the date and remark columns only. Both are costed in PLAN section 5. |
| G03 | **Maine final roster (Adjutant General report 1864-65, 20th Maine pp.623-661) not obtained.** Not found on the Internet Archive; Digital Maine answers programmatic requests with a Cloudflare bot challenge, so it was not fetched. | The December 1863 return shows only men still absent; men wounded at Gettysburg who returned by December carry no remark. | Owner: download the PDF in a browser, or write to the Maine State Archives. Open alternative: the 1898 casualty list (112 of about 130 names parsed). |
| G04 | **20th Maine: 575 names on the 1898 participants list against 386 in the official report.** Casualty names agree (111 of 112 parsed are on the participants list). | Contested: either the list includes men present but not "equipped for duty" (62 special-duty names are listed separately), or it over-includes. | Needs the 30 June 1863 muster roll (G01). Until then, the roster page must show both numbers. |
| G05 | **26th North Carolina: Moore names 512 Gettysburg casualties; Clark reports 708 killed, wounded and missing (674 in the 31 August muster rolls; the repository OOB has 588).** Company D has 18 annotated of 79 present, Company B 25 of 92. | Moore under-annotates; three casualty totals disagree. | Permission/purchase: Manarin et al. vol 7 or 8 (print; the state publishes only a name index). Open partial: newspaper casualty lists, Clark's colour-bearer list. |
| G06 | **Promotion out and transfer out are not parsed in Moore ("p. Governor", "p. Captain in cavalry", "tr. to").** Zebulon Vance, who left in 1862, is labelled Unknown (on roll) rather than Absent-Documented. | Inflates the on-roll count and some Unknown rows. | Open: rule list per source. |
| G07 | **Officers and staff need their own evidence pass.** The roll's Rank-from column is not an enlistment date (Hyatt); resignations are abbreviated (res.); colonels can be absent sick (Bragg). | All three hard errors in the sample were officers. | Open: regimental histories and OR reports name officers present (Dawes list used for Wisconsin; Clark lists the company officers present and absent for the 26th NC). |
| G08 | **Identity: same name, different men; same man, different spellings.** Maine has 10 same-name pairs and North Carolina 35 within or across companies; Wisconsin has 9 near-spelling pairs (Chrisler/Chrisier, Kurtz/Kurz, Moreau Isadore/Isadora). Only transfers with a remark were merged. | Duplicates inflate counts; wrong merges lose men. | Open: age and residence match; the page image; a published variants table. |
| G09 | **Men present with another unit.** Wisconsin remarks show men "detached in Battery B, 4th U.S. Art." (Uriah Palmer, wounded at Gettysburg; Charles Reed; Peter Smith; Daniel Spragu killed 1 July). | The Theatre must draw them in the battery, not in the regiment. | Open: a detachment field and a link to the battery roll. |
| G10 | **Absent-Documented for drafted men is a Modelled rule** (the 6th Wisconsin received draftees only in Sept-Nov 1864; every legible Drafted row is 1864-65, but the OCR reads 64 as 61 on some). | Correct for the 6th Wisconsin; must be re-derived for every regiment. | Open: per-regiment check of legible rows. |

## B. Source gaps

| ID | gap | route |
|---|---|---|
| G11 | **Confederate rosters for Virginia (12,022 of 57,104 infantry in the repository OOB), Georgia (11,684), Alabama (5,837), Mississippi (4,593), South Carolina (4,064), Texas, Florida, Tennessee, Arkansas, Maryland (3,556 together) are unresolved.** North Carolina (12,949) and Louisiana (2,399) are open and public domain. Georgia's Henderson roster, Virginia's Howard series, Broadfoot and Manarin are copyrighted; the Henderson and Manarin copies on the Internet Archive are lending-restricted. | Mixed: pre-1931 unit histories with rosters (the Doles-Cook brigade volume is an example), state databases (Alabama ADAH, terms unread), FamilySearch with written permission, purchase of print volumes. Stage 0 verifies each candidate. |
| G12 | **Union: Delaware, Maryland, Rhode Island, West Virginia, Regular Army, US Sharpshooters (about 4,800 infantry, 6.9 percent) have no verified source.** Regular Army enlisted men have no state roster. | Open or Permission: state adjutant general reports; NARA enlistment registers. |
| G13 | **Cavalry, artillery, headquarters, provost guard, Engineer Brigade, Signal Corps, ambulance corps, wagon trains, civilian teamsters, sutlers, servants.** The repository OOB lists 237 Union and 171 Confederate infantry regiments, 37 + 22 cavalry regiments and a partial list of batteries (30 of 50 on the Union side). | Open for state units; expected Unknown for civilians. |
| G14 | **State Gettysburg commission volumes not inspected** except Maine: Pennsylvania at Gettysburg, New York at Gettysburg, Michigan at Gettysburg (identifiers verified). | Open: Stage 0 reads their tables of contents; any participants lists become Present-Documented sources. |
| G15 | **Busey and Martin (present strength and casualties per regiment) is lending-restricted.** The repository OOB carries its values (386, 344, 843 for the three pilots); they match primary text for the Maine regiment only (386), and differ slightly for Wisconsin (Dawes 340) and North Carolina (Clark 885). | Purchase or library copy, then re-check each unit's strength against a primary source. |
| G16 | **Official Records tables are garbled in the plain text** (the June 30 abstract of returns, OR 27/1 p.151, and the casualty return); numbers need page images. | Open: image reading, one table per corps. |
| G17 | **Confederate record loss is unmeasured.** Which regiments' 30 June 1863 muster rolls survive in the NARA compiled records is not known to this program. | Open: the NARA finding aids and microfilm publications list rolls by regiment; build the survival table in Stage 0. |

## C. Permissions and owner decisions (none sent: no outward-facing action was taken)

| ID | item |
|---|---|
| P01 | NPS Soldiers and Sailors System: written permission for a name-level extract. Pages read give no reuse terms. Route: Contact Us form of the NPS Civil War program, nps.gov/subjects/civilwar/contactus.htm. The task brief states written permission is required; it was not sought. Do not scrape. |
| P02 | FamilySearch: its terms forbid bulk download and scraping without written permission (reply about 45 days). Needed for any bulk use of service-record indexes or images. |
| P03 | Fold3, Find a Grave: link-out only (terms forbid automated access and AI training use). |
| P04 | NARA Catalog API key (free) for a targeted test of whether CSR images are served; terms: 10,000 queries per month, no scraping, no caching, not-endorsed notice. |
| P05 | Maine State Archives / Digital Maine: manual download or written request (G03). |
| P06 | Purchase of print rosters for cross-checking: Manarin et al. North Carolina Troops (vols 7-8 at least), Henderson Georgia, Howard Virginia, Broadfoot, Busey and Martin. Facts (names and dates) may be checked against them; text must not be copied. |
| P07 | Licence of the derived dataset (transcriptions of public-domain sources, labels and reconciliations), and approval of an OCR engine (G02). |
| P08 | Confirm the gate policy of PLAN section 4.3: no gate is relaxed except by a written, dated decision recorded in `docs/decisions/`. |

## D. C-NCLA family gaps (North Carolina and Louisiana, filed 30 October 2026; detail in data/C-NCLA/README.md)

| ID | gap | route |
|---|---|---|
| GN01 | Moore 1882 names every man of the 33 NC infantry units and 2 NC batteries but gives no status for 30 June 1863. 25,866 rows are `on-roll-undetermined` and 12,560 `unreadable-or-ambiguous` across the family. Moore also under-annotates Gettysburg (26th NC: 515 named of 708 casualties; 4th NC only 21 rows). | Same as G01/G05: NARA muster rolls (permission) or Manarin (print). Open partial: Clark 1901 company/casualty lists, not yet mined for the 32 other NC units. |
| GN02 | Moore prints no roll for 16th NC Company A in place (inserted at the end of the volume, parsed), none for 2nd Battalion Companies C (no such company), D and E (Georgia companies, officers only: 4 rows each), 20th NC Company C (only a few names), 22nd NC (companies lettered irregularly, one roll marked A inserted as C, no captain), 10th NC Artillery (Manly's Battery = Company A, Reilly's Rowan Artillery = Company D). | Record only; no open alternative found yet. |
| GN03 | OCR: Google scan of Moore vol 1 repeats and scrambles pages; the Emory copy was used instead. Garbled names remain (5.6 percent of rows flagged). A second independent OCR is still G02. | Owner decision G02/P07. |
| GL01 | Booth 1920 is a name-by-name abstract of rolls, but most entries stop before 1863 or lack a legible May-June 1863 roll abstract; 60 to 70 percent of Louisiana rows are Unknown. Booth is known incomplete (its own preface). | NARA rolls (permission); Gettysburg casualty lists. |
| GL02 | Two commands are printed "1st La. Infty.": Nelligan's (Virginia) and Strawbridge's (Chattanooga, Chickamauga, Port Hudson, Vicksburg). 592 entries (524 printed Strawbridge's, 68 unspecified with Western evidence only) are withheld in `data/C-NCLA/units/C-1LA-T_excluded-unit-unresolved.csv` (UNIT-UNRESOLVED, label withheld). 525 Nelligan's and 386 variant-unspecified entries are kept; the unspecified ones carry the flag `1st-La-variant:unspecified`. | Owner/historian confirmation of which command was Nolan's regiment at Gettysburg; Booth's text supports Nelligan's. |
| GL03 | Washington Artillery of New Orleans (4 companies in the OOB) and Maurin's Donaldsonville Artillery are matched by company text and the "Landry's Co." name; OCR damage to "Washington" loses some entries (one seen in the page-image check). | Page-image pass. |
| GL04 | Strengths in the OOB (Busey and Martin, second hand) are carried unchanged; no S_doc was derived from a primary source for the 42 units other than the 26th NC (reused from the pilot: Clark 885). | Clark 1901 chapters (NC), Booth/OR reports (LA). |


## NE family run (30 October 2026): new gaps and findings (data in data/NE/, details in data/NE/README.md)

| ID | gap | route |
|---|---|---|
| G-NE01 | **Vermont not obtained**: Revised Roster of Vermont Volunteers (IA `cu31924080774148`) unreachable (HTTP 503 or timeout on every file, repeated over more than an hour). Tried and insufficient: Benedict 1886 (no rosters), Sturtevant 1910 13th Vermont (folded roster table, unusable OCR text), the 1866 AG report. Not scraped: FamilySearch, Fold3, Ancestry, Find a Grave. | Open: retry the item (retry script left running); then parse by company. Other open Vermont rosters not yet found. |
| G-NE02 | **OOB batteries U-ART-MAF and U-ART-MAE do not match any Massachusetts battery at Gettysburg in OR 27/1** (1st A McCartney, 3rd C Walcott, 5th E Phillips, 9th Bigelow). The 1st Battery roster is delivered as UNMAPPED-1MA-BTY. | Owner or OOB agent: correct the OOB identities. |
| G-NE03 | **Units at Gettysburg with no OOB row**: 11th Massachusetts, 5th Maine Battery, 6th Maine Battery (OR 27/1 report index). | OOB agent: add; rosters then follow from the same sources. |
| G-NE04 | **Pilot defect**: 11 of the 20th Maine pilot field and staff rows were the 19th Maine's (page image checked). Corrected in data/NE/maine; the pilot files are unchanged. | Done in NE data; pilot CSV to be regenerated or retired. |
| G-NE05 | **Maine participants lists exceed the strength present** for the 3rd, 4th, 6th, 7th, 16th, 17th, 19th, 20th Maine and 1st Maine Cavalry (Contested, like G04). | 30 June 1863 muster rolls (G01). |
| G-NE06 | **Name transcription**: about 1 name in 20 carries OCR damage in the text layer (QA sample 6 of 132); gate R-G1 not met; the 18th Massachusetts Companies D and E scan is badly damaged. | Second OCR or image reading (G02). |
| G-NE07 | **OOB casualty figures are unreliable** for some NE units (9th Massachusetts 133 against 18 named; 7th and 37th Massachusetts 0). | Recheck against Fox and OR. |
| G-NE08 | **Hall's 2nd Maine Battery** roster table in Maine at Gettysburg (book pp.35-38) not parsed. | Open: coordinate parse. |


## MW family (Michigan, Wisconsin, Indiana, Illinois, Minnesota), 30 Oct 2026

| ID | gap | route |
|---|---|---|
| GMW01 | Michigan 1st, 4th, 5th, 7th, 16th, 24th Infantry and 1st, 5th, 6th, 7th Cavalry have no open full roll: only 4 of the 46 Record of Service volumes are on the Internet Archive (3, 8, 17, 22); HathiTrust robots.txt disallows /cgi/; the Archives of Michigan terms forbid automated access. Only the 1913 Boies survivors list (275 names) is in the data. Tried: IA title, creator, identifier-pattern and wildcard searches; regimental histories (24th Curtis 1891: only a roster of officers was found, 4th Barrett 1888 is a 56-page item downloaded and not parsed, 16th survivors 1895 text layer unreadable). | Open: owner downloads the volumes in a browser, or another open host is found; Robertson 1882 (officers at organisation) is downloaded and not yet parsed; Lee 1902 (7th Cavalry) failed with HTTP 5xx three times and should be retried |
| GMW02 | Indiana officers (field, staff, company officers) are printed rotated in vol 2 and the OCR text is upside-down garbage; the Official Army Register lists only officers at muster out. | Second OCR or vision read of vol 2 (G02) |
| GMW03 | 1,004 roll lines in Indiana, Illinois and Minnesota lost their name in the OCR layer (kept as nameless rows, counted). | Second OCR (G02) |
| GMW04 | Wisconsin, Indiana, Illinois rolls rarely annotate Gettysburg (for example 3rd Indiana Cavalry 0 of 1,389 rows, 5th Wisconsin 10); Present-Documented is far below documented casualties. | muster rolls of 30 June 1863 (G01); regimental histories; Official Records |
| GMW05 | Illinois cavalry rows lose the last digit of many year tokens (186?), so enlistment dates are unreadable for about a quarter of rows. | Second OCR |
| GMW06 | Company attribution in Wisconsin rows can be off near company boundaries when a header is garbled (checked on headers, not on every page). | image check |
| GMW07 | The 3rd Indiana Cavalry had six companies at Gettysburg (OOB); which six is not established, so all twelve companies are listed. | Official Records, regimental history |
| GMW08 | Cross-unit transfers (14th Indiana veterans to the 20th, 27th Indiana to the 70th) are not merged. | identity rules (G08) |
| GMW09 | Strengths: only the seven Michigan infantry figures (monument inscriptions, 1889) are tied to a printed source; the other 19 units carry the second-hand OOB value, no S_doc and no reconciliation status were derived. | OR 27, regimental histories |
| GMW10 | The 3rd Michigan roll includes the reorganised regiment (1864-66), the 3rd Wisconsin roll 586 unassigned men and the 8th Illinois Cavalry 926 recruits, so row counts exceed the men at Gettysburg by design; the labels carry that. | none needed |

## REG family (Regular Army, DE, MD, RI, WV, headquarters), 30 Oct 2026

| ID | gap | route |
|---|---|---|
| GREG01 | **Regular Army enlisted men are not named** (2,562 infantry, 1,146 cavalry, about 2,200 in 21 batteries per the OOB). Tried: Heitman (officers only), OR 27/1 organization and reports, cemetery report (counts), regimental histories (none with a roll found on IA). Only NARA registers and service records hold them (Fold3, FamilySearch: not touched by rule). | Open: unit histories of the 4th US Artillery and similar if any are on IA; otherwise stays Unknown and the page says "n present, names not recovered". |
| GREG02 | **Delaware enlisted men**: the state publishes three image-only PDFs (`civilwar.delaware.gov/volumes/`), legible handwriting, 103 + 55 + 103 pages, cached and hashed. Not transcribed: no OCR engine, no handwriting recognition, transcription by viewing was not done. 25 + 3 named men from Seville and Smith. | Transcribe (owner decision G02 on an OCR engine, or a view-and-type pass of about 160 pages). |
| GREG03 | **Rhode Island Battery C and the 1st RI Cavalry, Batteries E and G**: the Official Register volume with the batteries and the cavalry is not on the Internet Archive; HathiTrust is blocked by the brief. | Open: unit histories (Battery E: Butts 1896 on IA; Battery G, Cavalry: Denison 1876 `sabresandspurs00denirich`, not yet fetched). |
| GREG04 | **West Virginia**: roll is the December 1864 return; second scan not parsed; Appendix A officers and Lang's rosters not extracted. | Open. |
| GREG05 | **Army Register 1863 and 1865 downloaded, not parsed** (columns scrambled; needs coordinates). | Open: gives every Regular officer as on-roll-undetermined. |
| GREG06 | **Rhode Island and West Virginia OCR**: 30 percent of rows unreadable; QA sample fails the 99 percent name and date gates. | A second OCR (GAP G02) or an image pass; WV has a second scan on IA. |
| GREG07 | **Repository OOB discrepancies** (missing units, conflicting battery designations, Purnell Legion strength): listed in `data/REG/README.md`. The OOB file was not changed. | Owner or the OOB maintainer. |
| GREG08 | OR 27/1 reports not mined for named casualties and mentions (only authors, commanders and organization names were entered). | Open: next step per unit. |


## D. Family C-VASCGA (Confederate Virginia, South Carolina, Georgia): gaps after the open-source pass of 30 October 2026

Detail per unit: `data/C-VASCGA/units.csv`; sources: `data/C-VASCGA/README.md`. 143 units; 78 have names, 10 have their own regimental roll in full.

| ID | gap | open alternative tried | route |
|---|---|---|---|
| G-VG1 | Virginia infantry: 40 of 42 regiments have no open roll (1st VA via Loehr and Co. G of the 18th via Irby only) | Internet Archive title, subject, ordinal sweeps for 41 regiments; Chamberlayne, Blackford, Casler read; SHSP officers (380) and hospital names (87) used | Howard regimental series and Manarin-type compilations are copyrighted print; Library of Virginia holds pension records; Appomattox enlisted paroles (SHSP 15) by coordinates; Richmond Dispatch 1863 lists via a route that allows access |
| G-VG2 | Georgia infantry: complete modern roll (Henderson) is lending-restricted | Doles-Cook (4 regiments), Warren (11th), Nichols (61st, B to K); hospital and parole lists for 23 more | Georgia Archives Virtual Vault muster-roll images (manuscript, needs reading by eye, certificate failure not bypassed); 7 Georgia units have no names |
| G-VG3 | South Carolina: Salley vols. I and III not found as open items; 3rd Bn, 1st Provisional, 1st Rifles, 7th, 8th, 12th, 13th, 15th lack rolls | Salley vol. II (2nd, 3rd), Tompkins (14th Co. K), hospital and parole lists | search by other identifiers or HathiTrust full view (terms to read first) |
| G-VG4 | Cavalry (20 of 21) and artillery (32 of 33) have no open roll | Beale (9th VA Cav), Page (Morris Artillery); Richmond Howitzer books are narrative | state rosters, Chamberlayne series 3 to 6 (not on the Internet Archive) |
| G-VG5 | Per-man presence on 1 to 3 July 1863: only the 2nd and 3rd South Carolina carry the 30 June muster-roll status (G01) | Salley; 120 rows `present-on-30-june-roll-only` | owner decision on Present-Probable with a stated model (PLAN P08); muster-roll images |
| G-VG6 | Warren 11th Georgia: names damaged in print and scan | none (needs a second reading of the images) | owner decision G02 |
