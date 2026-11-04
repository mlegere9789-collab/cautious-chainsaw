"""Writes sources.json (the sources ledger of family C-VASCGA, schema ../../../schema/sources-ledger.schema.json) from acquired.json.
Run: python -X utf8 make_ledger.py"""
import json, datetime
D = 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/'
acq = json.load(open(D + 'acquired.json'))
UA = 'gettysburg-map-research/1.0 (roster blueprint; read-only, rate-limited)'
TX = 'scripts/%s.py then flag_dupes.py and finalize.py (family C-VASCGA, 30 October 2026; git commit: none, files are uncommitted in the working tree)'
S = [
    ('GA-THOMAS-1903-DOLESCOOK-v1', 'Thomas, Henry W., History of the Doles-Cook Brigade of Northern Virginia, C.S.A., containing muster rolls of each company of the 4th, 12th, 21st and 44th Georgia, Atlanta 1903, book pp.95-591', 'C-regimental-history-or-memoir', 'historyofdolesco00thom', ['historyofdolesco00thom_djvu.txt'], 'dolescook_parse',
     'rolls compiled by veterans in 1903 from memory and records; service history only; 137 header lines first missed by the parser were recovered (recall check)'),
    ('SC-SALLEY-1914-VOL2-v1', 'Salley, A. S., Jr. (compiler), South Carolina Troops in Confederate Service, vol. II, Columbia 1914, 2nd and 3rd South Carolina Volunteers, pp.1-570', 'B-official-compilation', 'southcarolinatr00sallgoog', ['southcarolinatr00sallgoog_djvu.txt'], 'salley_parse',
     'Google-scan OCR; the scan repeats a Company G heading; footnotes record the "unofficial compilation" readings that disagree and are kept in remarks; 4th Regiment (not at Gettysburg) not parsed'),
    ('VA-LOEHR-1884-1VA-v1', 'Loehr, Charles T., War History of the Old First Virginia Infantry Regiment, Army of Northern Virginia, Richmond 1884, List of Members pp.65-88', 'C-regimental-history-or-memoir', 'warhistoryold00loehrich', ['warhistoryold00loehrich_djvu.txt', 'warhistoryold00loehrich_djvu.xml'], 'loehr1va_parse',
     'years of service only; three columns rebuilt from word coordinates; a few names lose a comma in the text layer'),
    ('GA-WARREN-1863-11GA-v1', 'Warren, Kittrell J., History of the Eleventh Georgia Vols., embracing the muster rolls, Richmond 1863, pp.5-26', 'C-regimental-history-or-memoir', 'historyofelevent00warr', ['historyofelevent00warr_djvu.txt', 'historyofelevent00warr_djvu.xml'], 'warren11ga_parse',
     'printed before the battle; heavy name damage in print and scan; needs a second reading of the page images'),
    ('GA-NICHOLS-1898-61GA-v1', "Nichols, G. W., A Soldier's Story of His Regiment (61st Georgia), Jesup 1898, Roster of Companies B to K", 'C-regimental-history-or-memoir', '01494987.3402.emory.edu', ['01494987.3402.emory.edu_djvu.txt'], 'nichols61ga_parse', 'Company A has no roster in the book'),
    ('SC-TOMPKINS-1897-COK14-v1', 'Tompkins, D. A., Company K, Fourteenth South Carolina Volunteers, Charleston 1897', 'C-regimental-history-or-memoir', '06269758.3416.emory.edu', ['06269758.3416.emory.edu_djvu.txt'], 'tompkins14sc_parse', 'one company; the wounded list names only 5 of the 30 wounded at Gettysburg the text mentions'),
    ('VA-IRBY-1878-COG18-v1', 'Irby, Richard, Historical Sketch of the Nottoway Grays, afterwards Company G, Eighteenth Virginia Regiment, Richmond 1878, condensed roll', 'C-regimental-history-or-memoir', 'historicalsketc00irbygoog', ['historicalsketc00irbygoog_djvu.txt'], 'irby18va_parse', 'one company'),
    ('VA-BEALE-1899-9VACAV-v1', 'Beale, R. L. T., History of the Ninth Virginia Cavalry in the War between the States, Richmond 1899, Roster', 'C-regimental-history-or-memoir', 'historyofninthvi00beal', ['historyofninthvi00beal_djvu.txt'], 'beale9vacav_parse', 'names and rank only; later notes (Dead, Cannot be located)'),
    ('VA-PAGE-1885-PAGEBATTERY-v1', "Page, Richard C. M., Sketch of Page's Battery, or Morris Artillery, 2d Corps, Army Northern Virginia, 1885", 'C-regimental-history-or-memoir', 'sketchofpagesbat00page', ['sketchofpagesbat00page_djvu.txt'], 'page_battery_parse', 'entries by the survivors; OCR reads 6 as 0 or G in years'),
    ('CS-SHSP27-1899-GAINES-v1', 'Southern Historical Society Papers vol. 27 (1899), pp.241-251, Sick and wounded Confederate soldiers at Hagerstown and Williamsport (rolls of Dr J. M. Gaines, 13 July to 12 August 1863, printed from the Richmond Dispatch, 2 April 1899)', 'A-primary-contemporary', 'sim_southern-historical-society-papers_january-december-1899_27', ['sim_southern-historical-society-papers_january-december-1899_27_djvu.txt'], 'gaines_hospital_parse',
     'a printed transcript of original hospital rolls; ordinals and days damaged in OCR (rst for 1st, roth for 10th) are read with a stated rule and flagged'),
    ('CS-SHSP15-1887-PAROLES-v1', 'Brock, R. A. (ed.), Paroles of the Army of Northern Virginia, Southern Historical Society Papers vol. 15, Richmond 1887, officers lists', 'B-official-compilation', 'cu31924030921773', ['cu31924030921773_djvu.txt'], 'paroles_officers_parse', 'officers only; ordinals in OCR corrected by rule and flagged'),
]
out = []
for sid, cit, tier, loc, files, script, defects in S:
    fl = []
    for f in files:
        a = acq[f]
        fl.append(dict(name=f, url=a['url'], sha256=a['sha256'], bytes=a['bytes']))
    cs = acq[files[0]].get('copyright_status')
    out.append(dict(source_id=sid, citation=cit, tier=tier, licence='PD-US',
                    licence_note='Internet Archive possible-copyright-status: %s; published %s (before 1931); access-restricted-item not set. Confirmation of US status is for the owner.' % (cs if cs else 'not set', acq[files[0]].get('ia_date')),
                    terms_url='https://archive.org/about/terms.php', locator='archive.org/details/' + loc, retrieved='2026-10-30', user_agent=UA, files=fl, transform=TX % script,
                    known_defects=[defects]))
json.dump(out, open(D + 'sources.json', 'w'), indent=1)
print(len(out), 'ledger entries')
