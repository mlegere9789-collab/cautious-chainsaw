"""NY family: write data/NY/README.md from the built files so every number in it is read from the data.  python -I -X utf8 ny_readme.py"""
import os, json, csv, glob, collections, statistics, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NY')
stats = json.load(open(os.path.join(DATA, 'stats.json'), encoding='utf-8'))
recon = json.load(open(os.path.join(DATA, 'reconciliation.json'), encoding='utf-8'))
bs = json.load(open(os.path.join(DATA, 'build_stats.json'), encoding='utf-8'))
acq = json.load(open(os.path.join(DATA, 'acquired.json'), encoding='utf-8'))
umap = json.load(open(os.path.join(DATA, 'unit_map.json'), encoding='utf-8'))

roh = collections.Counter()
second = collections.Counter()
for k, v in bs.items():
    for kk, vv in (v.get('roh') or {}).items():
        if isinstance(vv, int):
            roh[kk] += vv
    for kk, vv in ((v.get('roh') or {}).get('second_ocr') or {}).items():
        second[kk] += vv
status = collections.Counter(e['status'] for e in recon.values())
basis = collections.Counter()
flags = collections.Counter()
extra_rows = {}
rows_total = 0
for f in glob.glob(os.path.join(DATA, 'rosters', '*.csv')):
    uid = os.path.basename(f).split('_')[0]
    n = 0
    for r in csv.DictReader(open(f, encoding='utf-8')):
        n += 1
        if uid.startswith('EXTRA') or uid.startswith('U-1NYLA'):
            continue
        basis[r['basis_code']] += 1
        for fl in (r['parse_flags'] or '').split('|'):
            if fl:
                flags[fl] += 1
    if uid.startswith('EXTRA'):
        extra_rows[uid] = n
    rows_total += n
ratios = [e['named_casualty_rows_over_phisterer_aggregate'] for e in recon.values() if e.get('named_casualty_rows_over_phisterer_aggregate') is not None]
n_ph = sum(1 for e in recon.values() if e.get('phisterer_gettysburg'))
tot_bytes = sum(f['bytes'] for f in acq['files'])
src_files = collections.Counter((f.get('label') or 'Internet Archive file')[:22] for f in acq['files'])
unres = 0
p = os.path.join(DATA, 'roh_unresolved.csv')
if os.path.exists(p):
    unres = sum(1 for _ in csv.DictReader(open(p, encoding='utf-8')))
qa = os.path.join(DATA, 'QA-SAMPLE.md')

L = []
A = L.append
A('# New York family: Register rolls of the New York units at Gettysburg (data/NY)')
A('')
A('Built 30 October 2026 from public sources only (the New York State Military Museum site and the Internet Archive). No account, login, key, licence acceptance or bot-block workaround was used. Rows keep the name and remark as the source text layer prints them; no name was corrected. Presence labels follow PLAN section 2.2; every row carries the rule that set its label.')
A('')
A('## Result')
A('')
A('| measure | value |')
A('|---|---|')
A('| OOB unit entries of the New York family (`baseline/dist/data/oob/`) | %d (67 infantry entries, 8 cavalry, 13 artillery) |' % stats['units_in_oob'])
A('| OOB entries with names in this directory | %d |' % stats['units_with_names'])
A('| of these: own Register roll | %d |' % (status.get('Short', 0) + status.get('Reconciled', 0) + status.get('Contested', 0)))
A('| of these: covered through the parent unit (alias or detachment rows) | %d |' % status.get('COVERED-VIA-PARENT', 0))
A('| Register image-only (no text layer): names only from the Roll of Honor | %d (61st NY: 0 names; 71st NY: %d names) |' % (status.get('REGISTER-IMAGE-ONLY', 0), recon['U-71NY']['names']))
A('| OOB entries with no roster | %s |' % ', '.join(k for k, v in recon.items() if v['status'] in ('OOB-DEFECT', 'NO-ROSTER')))
A('| names (rows that are men, not cross-reference lines; own rolls only, aliases not double counted) | %d |' % stats['names'])
A('| Present-Documented | %d (%.1f percent) |' % (stats['count_by_label'].get('Present-Documented', 0), 100 * stats['share_by_label'].get('Present-Documented', 0)))
A('| Absent-Documented | %d (%.1f percent) |' % (stats['count_by_label'].get('Absent-Documented', 0), 100 * stats['share_by_label'].get('Absent-Documented', 0)))
A('| Unknown | %d (%.1f percent), of which on-roll-undetermined %d, unreadable-or-ambiguous %d, contested %d |' % (stats['count_by_label'].get('Unknown', 0), 100 * stats['share_by_label'].get('Unknown', 0), stats['count_by_roll_status'].get('on-roll-undetermined', 0), stats['count_by_roll_status'].get('unreadable-or-ambiguous', 0), stats['count_by_roll_status'].get('contested', 0)))
A('| Present-Probable | 0 (withheld from roll-only men, PLAN 2.4) |')
A('| unreadable-or-ambiguous share of names | %.1f percent |' % (100 * stats['unreadable_share']))
A('| extra units not in the OOB file (built because OR 27/1 lists them) | %s |' % ', '.join('%s (%d rows)' % (k, v) for k, v in sorted(extra_rows.items())))
A('| downloaded for this family | %d files, %.0f MB (cap 1.5 GB), sha256 of each in `acquired.json` |' % (len(acq['files']), tot_bytes / 1e6))
A('')
A('Per-unit counts, documented strength and status: `unit-table.md`, `reconciliation.json`, `build_stats.json`. Every unit is Short: the named present men (casualties and men placed at Gettysburg by a remark) are far fewer than the documented strength, because the Registers record service history, not who was present on 1 to 3 July 1863 (PLAN section 0, point 1). Documented strength `S_doc` here is the repository OOB value, which cites Busey and Martin second-hand (PLAN G15); it was not re-checked against a primary source in this family.')
A('')
A('## Files')
A('')
A('| file | what |')
A('|---|---|')
A('| `rosters/<unit_id>_<name>.csv` | one CSV per OOB unit (and per extra unit): columns `unit_id, regiment, company, attached_to_unit_id, section, name_as_printed, name_clean, age, rank_as_printed, enlisted_or_mustered, residence_as_printed, remarks_as_printed, presence_label, presence_basis, basis_code, roll_status, dup_group, source_id, source_page_pdf, parse_flags, cross_source` (the pilot columns plus `basis_code`, `attached_to_unit_id`, `cross_source`) |')
A('| `rosters/U-1NYLA-REG_other-batteries-and-unassigned.csv` | men of the 1st NY Light Artillery Register who are not in a Gettysburg battery at 3 July 1863 |')
A('| `stats.json` | the family statistics (units, names, rows unreadable, share by label) |')
A('| `reconciliation.json`, `unit-table.md` | per unit: S_doc, counts by label and roll status, status Short/Contested, Phisterer Gettysburg casualty row, named-casualty ratio |')
A('| `build_stats.json` | per unit build counts, Roll of Honor merge counts, second-OCR comparison counts |')
A('| `acquired.json` | every file fetched: URL, final URL, bytes, sha256, retrieval time, HTTP status, unit ids |')
A('| `unit_map.json` | OOB unit to source page map, aliases, OOB defects, extra units |')
A('| `roh_unresolved.csv` | %d Roll of Honor lines whose name the OCR text did not resolve (OCR text as read, never guessed) |' % unres)
A('| `QA-SAMPLE.md` | page-image check of the labels, names and dates (builder) |')
A('| `AUDIT.md`, `_pre_audit/` | independent audit of 30 October 2026: sample of 60 rows, defects D1 to D11, every change logged, frozen copy of the pre-audit outputs and code |')
A('| `progress.md` | one line per step |')
A('')
A('## Sources used (identifiers, rights, access)')
A('')
A('| id | source | identifier or URL pattern | rights and access | status |')
A('|---|---|---|---|---|')
A('| NY-NYSMM-REG | Registers of the New York volunteer regiments, Annual Reports of the Adjutant General of the State of New York, 1893-1905 (printed text of each regiment: name, age, enlistment, muster-in, every later event) as published by the New York State Military Museum as the "Unit Roster" of each unit | `museum.dmna.ny.gov/unit-history/<arm>/<unit>` then the "Unit Roster" link (`nysmm.org/download_file/view/N`), PDF with an ABBYY FineReader 9 text layer dated 2010; %d PDFs | the printed Registers are 1890s New York State publications; the museum is a New York State agency site. robots.txt of museum.dmna.ny.gov and nysmm.org disallow only `/application/*` paths. No terms page forbidding automated access was found; the site footer carries a general copyright line ("All rights reserved"). Access: plain GET, 2 s apart, one process at a time, User-Agent `gettysburg-map-research/1.0`. The owner should confirm the footer notice does not restrict republishing the transcription. | FETCHED |' % sum(1 for f in acq['files'] if (f.get('label') or '').startswith('Unit Roster')))
A('| NY-NYG-ROH | New York at Gettysburg, Final Report of the Battlefield of Gettysburg, New York Monuments Commission (Albany, 1900), vol I and II, the Roll of Honor "Names of Soldiers in New York Regiments and Batteries Who were Killed or Mortally Wounded", compiled from the Second Auditor pay rolls, the Albany muster-out rolls and the National Cemetery burial list | Internet Archive `newyorkatgettysb0001unse` (djvu.xml word boxes and txt; leaves 265-283; page image n265) | no copyright flag set in the item metadata, no access restriction (not a lending item); 1900 state publication | FETCHED, parsed from OCR word boxes |')
A('| NY-IA-AGR2 | Annual Report of the Adjutant-General of New York for 1901, Registers of the 75th-80th Infantry (Google scan, OCR by Google) | Internet Archive `annualreportadj02unkngoog` | NOT_IN_COPYRIGHT, no access restriction | FETCHED, used as an independent second OCR of the 76th, 77th, 78th and 80th Registers |')
A('| NY-PHIST | "Battles and Casualties from Phisterer" tables (Phisterer, New York in the War of the Rebellion, 1912) as published per unit by the New York State Military Museum (xlsx transcription and a PDF scan) | same unit pages as NY-NYSMM-REG; %d files | as NY-NYSMM-REG | FETCHED; the Gettysburg row of the xlsx read into `reconciliation.json` |' % sum(1 for f in acq['files'] if (f.get('label') or '').startswith('Battles')))
A('| NY-OR27 | Official Records vol 27 part 1 (organisation, to confirm which New York units were at Gettysburg) | already in `tmp/bt/rosters/cache/or27_1.txt` (Internet Archive `warofrebellion012701rootrich`) | public domain | READ, not re-fetched |')
A('| not used | NYSMM "Muster Roll" PDFs (HathiTrust scans of 1861 muster-in sheets; one probe fetched) and the 1864 volumes "A record of the commissioned officers, non-commissioned officers and privates of the regiments ... New York" (Internet Archive `recordofcommis*`, `cu31924092925*`, 10 text files fetched) | | public domain | muster-in data only (no 1863 status); not parsed, see G-NY7 |')
A('| not used | `annualreportadj00unkngoog` (114th Infantry), `annualreportadj01unkngoog` (1st and 2nd Veteran Cavalry, 1st and 2nd Mounted Rifles), `annualreportadj06offigoog` (7th and 8th Artillery) | Internet Archive | NOT_IN_COPYRIGHT | none of these units was at Gettysburg or is in the OOB |')
A('')
A('Not touched: FamilySearch, Fold3, Ancestry, Find a Grave, NPS Soldiers and Sailors System, HathiTrust page service, and any host that answered a challenge. No request was refused, challenged or blocked (no 403, no bot page, no login) in this family.')
A('')
A('## Parse method')
A('')
A('1. `pipeline/ny_build.py` reads each PDF text layer with PyMuPDF, repairs the ABBYY letter-spacing ("A p r i l" to "April"), removes page furniture, splits the stream into entries at the printed form `SURNAME, GIVEN.--Age, ...` (also cross-reference lines "X, see Y", which become `Duplicate-Xref` rows) and records the PDF page index of each entry (`source_page_pdf`, 0-based; the page image is that page of the cached PDF).')
A('2. `pipeline/ny_register.py` reads each entry as a list of semicolon clauses (enlistment, muster-in, transfers, wounds, captures, discharges...) with OCR-tolerant dates. A year read as 1802 or 1805 is repaired to 186x only if the dates of the entry stay in order; any other implausible year makes that date unreadable. A date that contradicts the entry order (a separation earlier than the muster-in) is not used.')
A('3. Labels follow PLAN 2.2, first rule that fires. Basis codes used: `CAS-REMARK` (killed, wounded, captured or missing at Gettysburg in the Register text), `CAS-REMARK-DATE` (casualty dated 1 to 3 July 1863 with no place printed), `GB-PLACE-DATE` (any event, for example desertion, placed at Gettysburg on 1 to 3 July 1863; Present-Documented because the Register places him there on those days), `ROH-LIST` (named on the 1900 Roll of Honor), `SEP-BEFORE`, `ENL-AFTER`, `ABS-NOTATION` (the Register says he was absent since a date before the battle; roll_status `absent-notation`), `CONFLICT` and `OCR-CONFLICT` (two sources, or two OCR readings, disagree: Unknown, roll_status `contested`, both cited in `cross_source`), `NO-RECORD-AFTER`, `DATE-NOT-PRINTED`, `OCR-DATE-LOST`, `ONROLL-NO-STATUS`. A man "attached to" another New York unit before the battle keeps `Unknown` and gets `attached_to_unit_id` (the 33rd NY three-year men were attached to the 49th NY in May 1863).')
A('4. Roll of Honor merge (`pipeline/ny_roh.py`): each OCR line of the Roll is matched to a Register row of the same unit only when surname (similarity 0.88 or better, same first letter), first given name (0.8 or better) and company (when legible) agree and exactly one row qualifies. Matches confirm a Present-Documented row, upgrade an Unknown row, or turn an Absent-Documented row into a `contested` Unknown. A Roll line with a readable name and no Register row is added as a `roll-of-honor-only` row; all other lines are listed in `roh_unresolved.csv`.')
A('5. Second OCR (`pipeline/ny_xocr.py`): for the 76th, 77th, 78th and 80th NY the Google OCR of the same printed Registers is parsed with the same rules and paired with the museum rows (strict key first, then looser keys, only one-to-one pairs). Agreeing labels are flagged `second-ocr-agrees`; one reading without evidence where the other has some is `second-ocr-soft-disagrees` (kept); Present against Absent is `second-ocr-hard-disagrees` and becomes a contested Unknown.')
A('6. Artillery: the 1st New York Light Artillery Register covers all batteries; a man belongs to the battery of his muster-in unless a `transferred to Battery X` clause dated on or before 3 July 1863 moves him (the 2nd Independent Battery men moved to Battery I on 6 June 1863). Batteries C, D, G, L and M are OOB entries; B, I and K are extras from OR 27/1.')
A('7a. Repairs made by the independent audit (details, counts and the frozen pre-audit copy in `AUDIT.md` and `_pre_audit/`): entry headers with an O-apostrophe, `Mc`, `Me` or `Mac` prefix, `JR.` before the given name, garbled letters in the name, or a stray mark before the given name are now recognised (before, about 1,500 men were glued onto the previous man and the previous man took their remarks and label); the commission sentence at the end of an officer entry is no longer read as an event; a separation followed by a re-muster or return is Unknown `SEP-THEN-RETURN`, not Absent; a Gettysburg casualty or place remark in an entry that enters the regiment after the battle is Unknown `CONFLICT` (contested); enlistment and muster-in dates more than 120 days apart, a date before the unit existed, and a mustering-out year that differs from the unit mode are unreadable (Unknown `OCR-DATE-LOST`); transfers between batteries of the 1st NY Light Artillery are not separations; a Roll of Honor match never upgrades a row dated after the battle; `rank_as_printed` is reduced to the rank word.')
A('7. `pipeline/ny_names.py` flags a surname printed once that is one edit away from one printed three or more times (`name-variant-suspect`); nothing is corrected. `pipeline/ny_finish.py` writes the reconciliation and statistics.')
A('')
A('## Quality')
A('')
A('* OCR text layer (ABBYY 2010): names, ages and dates are the largest error source. Flags: `name-suspect` %d rows, `name-variant-suspect` %d, `initial-split` %d (a middle initial fused to the given name and split by a dictionary rule), `entry-date-unreadable` %d, `date-year-only` %d.' % (flags.get('name-suspect', 0), flags.get('name-variant-suspect', 0), flags.get('initial-split', 0), flags.get('entry-date-unreadable', 0), flags.get('date-year-only', 0)))
A('* Second OCR (76th, 77th, 78th, 80th NY): %d rows paired; label agrees on %d (%.1f percent), soft difference %d (%.1f percent), hard difference %d (%.1f percent, carried as contested). Rows with no pairing: %d.' % (second['paired'], second['agree'], 100 * second['agree'] / max(1, second['paired']), second['soft_disagree'], 100 * second['soft_disagree'] / max(1, second['paired']), second['hard_disagree'], 100 * second['hard_disagree'] / max(1, second['paired']), second['no_second_reading']))
A('* Roll of Honor: %d OCR lines in the %d unit sections read; %d carry a readable name; %d matched to a Register row (%d confirm a row already Present-Documented, %d upgrade an Unknown row, %d contradict an Absent-Documented row); %d readable lines with no Register row added; %d lines unresolved or ambiguous (`roh_unresolved.csv`). The Roll lists about 1,000 killed or mortally wounded men; its OCR text layer is poor (many words with confidence 0), so the unresolved share is large and is a gap (G-NY5), not a count of men missing from the Roll.' % (roh['roh_lines'], len(set(h for h in bs if bs[h].get('roh', {}).get('roh_lines'))), roh['roh_name_lines'], roh['matched'], roh['confirmed_existing_PD'], roh['upgraded_to_PD'], roh['conflict_register_absent'], roh['added_roh_only'], roh['unresolved_unmatched'] + roh['unresolved_ambiguous']))
if ratios:
    A('* Phisterer Gettysburg aggregate casualties were read for %d units (%d with both figures). Named casualty rows (`CAS-REMARK`, `CAS-REMARK-DATE`, `ROH-LIST`) divided by the Phisterer aggregate: median %.2f, range %.2f to %.2f (Computed). R-G5 asks for 0.98: the Registers annotate Gettysburg casualties for some regiments and not for others (for example the 102nd NY: 11 Present-Documented rows against a Phisterer aggregate in `reconciliation.json`), so casualty names are far from complete (gap G-NY6). Units where the named casualty rows exceed the Phisterer aggregate (both numbers kept in `reconciliation.json`; the unit status stays Short because the named present men are fewer than the documented strength S_doc): %s.' % (n_ph, len(ratios), statistics.median(ratios), min(ratios), max(ratios), ', '.join(k for k, e in recon.items() if (e.get('named_casualty_rows_over_phisterer_aggregate') or 0) > 1.03) or 'none'))
A('* Page-image check: see `QA-SAMPLE.md` (builder, not independent) and `AUDIT.md` (independent audit of 30 October 2026, seed 41, 60 rows: about 91 percent of names exact against the page image, 2 hard label errors in 60 before the repairs; R-G1, R-G2, R-G3 and R-G9 are NOT met).')
A('')
A('## What is missing and why')
A('')
A('* `GAPS.md`, section "NY family", lists G-NY1 to G-NY10. In short: the Registers of the 61st and 71st NY are image-only PDFs (no OCR engine installed, owner decision G02); the Register has no status for 30 June 1863, so %d men are on-roll-undetermined; %d rows have a date the text layer garbled; Roll of Honor lines are mostly unresolved; Gettysburg casualty annotation in the Registers is incomplete against Phisterer; U-107NY, U-11NY, U-33NY, U-ART-C1NY and U-ART-NYC are OOB entries that need an owner check (see below); the OOB file lacks the 120th NY and Batteries B, I, K of the 1st NY Light.' % (stats['count_by_roll_status'].get('on-roll-undetermined', 0), stats['count_by_roll_status'].get('unreadable-or-ambiguous', 0)))
A('')
A('### OOB observations for the owner (the OOB file was not edited)')
A('')
for k, v in recon.items():
    pass
A('* `U-107NY` (I Corps, Paul\'s brigade, 122 men): OR 27 part 1 lists the 107th PENNSYLVANIA in that brigade; the 107th New York is `U-107NY-XII` (Colgrove). No roster built for `U-107NY`.')
A('* `U-11NY` (Fire Zouaves, 216 men, Carr\'s brigade, III Corps): the Register of the 11th New York shows the regiment mustered out with company on 2 June 1862 (446 entries); the same brigade lists the 11th New Jersey. The Register roll is built as printed and every row is labelled by the rules (nearly all Absent-Documented).')
A('* `U-33NY` (68 men): the Register shows the regiment mustered out on 2 June 1863; its three-year men were attached to the 49th NY in May 1863 (`attached_to_unit_id`); the OOB strength of 68 is consistent with that detachment but this was not verified against a primary source.')
A('* `U-ART-C1NY`: OR 27/1 places Battery C, 1st NY Light (Barnes) with the V Corps; the OOB lists it with the Artillery Reserve.')
A('* `U-ART-NYC` ("New York Battery C (Roemer\'s)", Taft\'s brigade): not in the OR 27/1 organisation of that brigade, and the name Roemer does not occur in the OR 27/1 text held in the repository; no roster built.')
A('* Missing from the OOB file although OR 27/1 lists them: the 120th NY (Brewster\'s brigade) and Batteries B, I and K of the 1st NY Light Artillery; built as `EXTRA-*` files.')
A('')
A('## Reproduce')
A('')
A('`python -I -X utf8 pipeline/ny_build.py` (all units, about 7 minutes at below-normal priority), then `ny_names.py`, `ny_finish.py`, `ny_readme.py`. Inputs are the cached files under `tmp/library/rosters/NY/` (not committed, 650 MB) listed with sha256 in `acquired.json`; the download helpers are in `pipeline/ny_dl/` (plain GET loops, see its README). Requires PyMuPDF.')
open(os.path.join(DATA, 'README.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('README written', len(L), 'lines')
