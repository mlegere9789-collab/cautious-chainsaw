#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Builds docs/battle-theatre/medical/sources.json (the registry the evidence validator reads) and, once, docs/battle-theatre/medical/SOURCES.md
(the human ledger) from what is on disk and from docs/battle-theatre/medical/sources-remote.json (archive.org records fetched on 2026-11-14).

    python3 -I tools/bt/medical/make_sources.py               rewrites sources.json; writes SOURCES.md only when it does not exist
    python3 -I tools/bt/medical/make_sources.py --force-md    rewrites SOURCES.md too (refused when it holds ledger rows this script did not write)
    python3 -I tools/bt/medical/make_sources.py --check       prints what it would write, writes nothing

The ledger at the end of SOURCES.md is append-only (one table row per local file, appended with a shell >>); after the group passes have started it is the
record of what was acquired, and this script never overwrites it. Hashes are computed here from the files on disk; nothing is taken on trust from another ledger.
"""
import os, re, sys, json, glob, hashlib, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
MED = os.path.join(ROOT, 'docs', 'battle-theatre', 'medical')
TODAY = '2026-11-14'
PD = 'public domain (US publication before 1929); the OCR text is machine output of the scan'
GOV = 'United States government work'
SITES4 = ['sites-town', 'sites-west-north', 'sites-east-southeast', 'sites-south-southwest']


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, '/')


def one(pattern):
    got = sorted(glob.glob(os.path.join(ROOT, pattern)))
    return got[0] if got else None


# (id, class, groups, edition note, ocr rate)
WS9 = [
    ('LETTERMAN-1866', 'memoir-primary', ['org-union-system', 'org-evacuation', 'triage-first-aid', 'instruments-supplies', 'nursing-diet-ward', 'gettysburg-statistics'],
     'Medical Recollections of the Army of the Potomac, New York: D. Appleton and Company, 1866 (title page read)', 0.04),
    ('JACOBS-1864', 'memoir-primary', ['sites-town', 'sites-west-north', 'org-aid-societies', 'burial-practice'], 'Notes on the Rebel invasion of Maryland and Pennsylvania, and the Battle of Gettysburg (1864); edition statement not read', 0.04),
    ('HOSPSCENES-1864', 'memoir-primary', ['sites-town', 'org-aid-societies', 'nursing-diet-ward'], 'Hospital scenes after the battle of Gettysburg, July 1863, by the Patriot Daughters of Lancaster (Lancaster: Daily Inquirer Steam Job Print, 1864; title page read)', 0.05),
    ('TPIERCE-1889', 'memoir-primary', ['sites-south-southwest', 'org-aid-societies'], 'Tillie Pierce Alleman, At Gettysburg, or What a Girl Saw and Heard of the Battle (1889); edition statement not read; written 26 years after the events', 0.04),
    ('ORSER3-v2', 'official-report', ['org-evacuation', 'org-union-system'], 'War of the Rebellion: Official Records, Series III, volume II (1899); the 1862 correspondence on the ambulance system among it', 0.06),
    ('OR-25-1', 'official-report', ['org-union-system', 'org-evacuation'], 'War of the Rebellion: Official Records, Series I, volume 25, part 1 (1889): Chancellorsville, with Letterman\'s report on that battle', 0.06),
    ('OR-29-1', 'official-report', ['org-union-system'], 'War of the Rebellion: Official Records, Series I, volume 29, part 1 (1890)', 0.06),
    ('BL-3', 'memoir-primary', ['org-confederate', 'org-evacuation'], 'Battles and Leaders of the Civil War, volume 3 (1888); includes Imboden\'s account of the retreat with the wounded', 0.04),
    ('SHSP-04', 'memoir-primary', ['org-confederate'], 'Southern Historical Society Papers, volume 4 (1877)', 0.04),
    ('SHSP-05', 'memoir-primary', ['org-confederate'], 'Southern Historical Society Papers, volume 5 (1878)', 0.04),
    ('SHSP-06', 'memoir-primary', ['org-confederate'], 'Southern Historical Society Papers, volume 6 (1878)', 0.04),
    ('SHSP-11', 'memoir-primary', ['org-confederate'], 'Southern Historical Society Papers, volume 11 (1883)', 0.04),
    ('SHSP-12', 'memoir-primary', ['org-confederate'], 'Southern Historical Society Papers, volume 12 (1884)', 0.04),
    ('NJ-TOOMBS-1888', 'regimental-history', SITES4, 'Toombs, New Jersey Troops in the Gettysburg Campaign (1888)', 0.04),
    ('NJ-FINAL-1891', 'regimental-history', SITES4, 'Final report of the Gettysburg battle-field commission of New Jersey (1891)', 0.04),
    ('MN-1ST-1916', 'regimental-history', ['gettysburg-statistics'], 'History of the First Regiment Minnesota Volunteer Infantry, 1861-1864 (1916)', 0.04),
    ('VT-GB-1914', 'regimental-history', SITES4, 'Vermont at Gettysburg, July 1863, and fifty years later (1914)', 0.04),
    ('VT-MON-1890', 'regimental-history', SITES4, 'Vermont monuments at Gettysburg, report of the commissioners (1890)', 0.04),
    ('OH-8TH-1889', 'regimental-history', SITES4, 'Franklin Sawyer, The Eighth Ohio at Gettysburg (1889)', 0.04),
    ('OH-DED-1887', 'regimental-history', [], 'Dedication of the Ohio memorials at Gettysburg (1887)', 0.04),
    ('IN-1913', 'regimental-history', [], 'Indiana at the fiftieth anniversary of the battle of Gettysburg (1913)', 0.04),
    ('HASKELL-1908', 'memoir-primary', [], 'Haskell, The Battle of Gettysburg (1908 printing; narrative written in 1863)', 0.04),
    ('FREMANTLE-1864', 'memoir-primary', ['org-confederate'], 'Fremantle, Three Months in the Southern States (1864)', 0.04),
    ('ALEXANDER-1907', 'memoir-primary', ['org-confederate'], 'Alexander, Military Memoirs of a Confederate (1907)', 0.04),
    ('LONGSTREET-1896', 'memoir-primary', ['org-confederate'], 'Longstreet, From Manassas to Appomattox (1896)', 0.04),
    ('PIERCE-F-1914', 'reference-secondary', [], 'Pierce, The Battle of Gettysburg: the crest-wave of the American Civil War (1914)', 0.04),
    ('MEADE-LL-v1', 'memoir-primary', ['gettysburg-statistics'], 'The Life and Letters of George Gordon Meade, volume 1 (1913)', 0.04),
    ('MEADE-LL-v2', 'memoir-primary', ['gettysburg-statistics'], 'The Life and Letters of George Gordon Meade, volume 2 (1913)', 0.04),
    ('BACH-KEY-1864', 'reference-secondary', SITES4, 'Bachelder, Key to the isometrical drawing of the Gettysburg battle-field (1864)', 0.04),
    ('BACH-REPULSE-1870', 'reference-secondary', [], 'Bachelder, Descriptive key to the painting of the repulse of Longstreet\'s assault (1870)', 0.04),
    ('BACH-WHATTOSEE-1873', 'reference-secondary', SITES4, 'Bachelder, Gettysburg: What to See (1873)', 0.04),
    ('BACH-WHATTOSEE-1889', 'reference-secondary', SITES4, 'Bachelder, Gettysburg: What to See and How to See It (1889)', 0.04),
    ('BACH-STORY-1904', 'reference-secondary', [], 'Bachelder, The Story of the Battle of Gettysburg (1904)', 0.04),
    ('CEM-REPORT-1867', 'official-report', ['burial-practice'], 'Revised report to the legislature of Pennsylvania relative to the Soldiers\' National Cemetery at Gettysburg (1867)', 0.04),
    ('CEM-BARTLETT-1874', 'institutional-history', ['burial-practice'], 'Bartlett, The Soldiers\' National Cemetery at Gettysburg (1874)', 0.04),
    ('CEM-INDIANA-1865', 'contemporary-print', ['burial-practice'], 'Soldiers\' National Cemetery, Gettysburg, Pennsylvania (Indiana, 1865)', 0.04),
    ('MA-BURIAL-1863', 'official-report', ['burial-practice'], 'Report of the Joint Special Committee on the burial of Massachusetts dead at Gettysburg (Boston, 1863)', 0.04),
    ('EVERETT-1864', 'contemporary-print', ['burial-practice'], 'Address of Edward Everett at the consecration of the National Cemetery at Gettysburg (1864)', 0.04),
]
PRIOR = [
    ('BL-3', None), ('FOX-1889', ('reference-secondary', [], 'Fox, Regimental Losses in the American Civil War (1889)')),
    ('ME-GB-1898', ('regimental-history', SITES4 + ['gettysburg-statistics'], 'Maine at Gettysburg (1898); the one local volume with long surgeons\' and hospital narratives')),
    ('MI-GB-1889', ('regimental-history', SITES4, 'Michigan at Gettysburg (1889)')),
    ('NY-GB-1900-v2', ('regimental-history', SITES4, 'Final report on the battlefield of Gettysburg, New York Monuments Commission, volume 2 (1900)')),
    ('NY-GB-1900', ('regimental-history', SITES4, 'New York at Gettysburg, volume 1 (1900)')),
    ('NY-GB-1902-v3', ('regimental-history', SITES4, 'New York at Gettysburg, volume 3 (1902)')),
    ('PA-GB-1904', ('regimental-history', SITES4, 'Pennsylvania at Gettysburg, volume 2 (1904)')),
    ('PA-GB-1914-v2', ('regimental-history', SITES4, 'Pennsylvania at Gettysburg, volume 2, second edition (1914)')),
]
NPS_GROUPS = {
    'NPS-CARE-WOUNDED-GUIDE': ['triage-first-aid', 'org-union-system', 'org-evacuation', 'amputations', 'anaesthesia-analgesia', 'camp-letterman', 'nursing-diet-ward', 'infection-complications'],
    'NPS-BOUNDARY-1988': SITES4 + ['camp-letterman'],
    'NPS-CLR-1STDAY': ['sites-west-north', 'sites-town'], 'NPS-CLI-1STDAY': ['sites-west-north'], 'NPS-HS-MCPHERSON': ['sites-west-north'],
    'NPS-CLI-ERR': ['sites-south-southwest'], 'NPS-CLI-PCB': ['sites-south-southwest'], 'NPS-CLR-ROT-V1': SITES4, 'NPS-CLR-ROT-V2': SITES4,
    'NPS-COMMON-PRIDE-1': ['sites-south-southwest', 'sites-east-southeast'], 'NPS-COMMON-PRIDE-2': ['sites-east-southeast', 'sites-south-southwest'],
    'NPS-COMMON-PRIDE-3': ['sites-east-southeast', 'sites-south-southwest'], 'NPS-HSR-LEISTER-BARN': ['sites-south-southwest'], 'NPS-HS-SPANGLER-HENRY': ['sites-south-southwest'],
    'NPS-SLYDER-GUIDE': ['sites-south-southwest'], 'NPS-HSR-SLYDER': ['sites-south-southwest'], 'NPS-CLR-CEMETERY': ['burial-practice', 'camp-letterman'],
    'NPS-CLI-CEMETERY': ['burial-practice'], 'NPS-HCSR': ['burial-practice'], 'NPS-ADHI': ['camp-letterman', 'burial-practice'], 'NPS-GMP-1999-V1': ['camp-letterman'],
    'NPS-EISE-HRS': ['camp-letterman', 'sites-east-southeast'], 'NPS-MON-LOC-1932': SITES4, 'NPS-MON-LOC-1993': SITES4, 'NPSGOV-CIVILIANS': ['sites-town', 'org-aid-societies'],
    'NPSGOV-TOWN': ['sites-town'], 'NPSGOV-FIRST-DAY': ['sites-west-north'],
}
WEB3 = [
    ('NPSGOV-JONATHAN-LETTERMAN', 'tmp/library/web/retry/F-053/jonathan-letterman.html.txt', 'https://www.nps.gov/articles/000/jonathan-letterman.htm', 'NPS web page "Jonathan Letterman", as served 2026-11-13', ['org-union-system', 'camp-letterman']),
    ('NPSGOV-FIELD-HOSPITAL-EDU', 'tmp/library/web/retry/F-057/field-hospital-edu.html.txt', 'https://www.nps.gov/gett/learn/education/classrooms/field-hospital-education-program.htm', 'NPS web page "Field Hospital Field Trip", as served 2026-11-13', ['triage-first-aid', 'nursing-diet-ward']),
    ('NPSGOV-MEDICAL-CORPS-TABLE5', 'tmp/library/web/retry/F-058/medical-corps.html.txt', 'https://www.nps.gov/gett/learn/education/a-nation-at-war-traveling-trunk-table-5-the-medical-corps-at-war.htm', 'NPS web page "Table 5: Civil War Medicine" (traveling trunk), as served 2026-11-13', ['org-union-system', 'triage-first-aid', 'org-evacuation']),
]
# files acquired by the planning step: source id -> (archive id, file name, class, lead, edition read from the title page, groups)
ACQUIRED = [
    ('MSHWR-P1V2-1870', 'MSHWRSurgical1', 'MSHWRSurgical1_djvu.txt', 'official-history', 'Part I, Volume II (the first surgical volume), Washington: Government Printing Office, 1870; its table of contents is at the end of the file', ['wounds-weapons', 'wounds-regions', 'gettysburg-statistics', 'org-evacuation'], 0.05),
    ('MSHWR-P1V2-1870-ALT', 'medicalsurgical12barnrich', 'medicalsurgical12barnrich_djvu.txt', 'official-history', 'a second scan of the 1870 first surgical volume, identified by matching chapter and topic counts (its title page and table of contents were not read; the Gettysburg word count is 305 here and 266 in MSHWR-P1V2-1870); use it to confirm digits', ['wounds-regions'], 0.05),
    ('MSHWR-P2V2-1876', 'medicalsurgical22barnrich', 'medicalsurgical22barnrich_djvu.txt', 'official-history', 'Part II, Volume II, Surgical History, first issue, Washington: Government Printing Office, 1876 (chapters VI to IX: abdomen, pelvis, back, upper extremities)', ['wounds-regions', 'wounds-limbs-joints', 'amputations', 'operations-excision-ligation'], 0.05),
    ('MSHWR-P2V2-1877-2NDISSUE', 'medicalsurgicalh22unit', 'medicalsurgicalh22unit_djvu.txt', 'official-history', 'Part II, Volume II, Surgical History, second issue, Washington: Government Printing Office, 1877', ['wounds-limbs-joints', 'amputations'], 0.05),
    ('MSHWR-P3V2-1883', 'MSHWRSurgical3', 'MSHWRSurgical3_djvu.txt', 'official-history', 'Part III, Volume II, Surgical History, first issue, Washington: Government Printing Office, 1883 (chapters X to XV: lower extremities, miscellaneous injuries, complications, anaesthetics, the medical staff and materia chirurgica, transportation of the wounded)', ['wounds-limbs-joints', 'amputations', 'anaesthesia-analgesia', 'infection-complications', 'instruments-supplies', 'org-evacuation'], 0.05),
    ('MSHWR-P3V2-1883-2NDISSUE', 'medicalsurgical32barnrich', 'medicalsurgical32barnrich_djvu.txt', 'official-history', 'Part III, Volume II, Surgical History, second issue, Washington: Government Printing Office, 1883', ['wounds-limbs-joints', 'amputations'], 0.05),
    ('GROSS-1861', 'amanualmilitary00grosgoog', 'amanualmilitary00grosgoog_djvu.txt', 'period-manual', 'S. D. Gross, A Manual of Military Surgery, or Hints on the Emergencies of Field, Camp and Hospital Practice, Philadelphia: J. B. Lippincott & Co., entered 1861 (no edition statement on the OCR title page; the 1862 printing is marked second edition); poor OCR in places', ['wounds-weapons', 'amputations', 'anaesthesia-analgesia', 'wound-care-splints', 'instruments-supplies', 'triage-first-aid'], 0.06),
    ('GROSS-1862-2ED', 'manualofmilitary00grosrich', 'manualofmilitary00grosrich_djvu.txt', 'period-manual', 'S. D. Gross, A Manual of Military Surgery, second edition, Philadelphia: J. B. Lippincott & Co., 1862 (entered 1861); clean OCR; the archive.org record dates it 1861', ['amputations', 'anaesthesia-analgesia', 'wound-care-splints', 'instruments-supplies', 'triage-first-aid', 'operations-excision-ligation'], 0.04),
    ('GROSS-1861-AUGUSTA', 'manualofmilitary00gros', 'manualofmilitary00gros_djvu.txt', 'period-manual', 'Gross\'s text reprinted at Augusta, Georgia: Steam Power Press, Chronicle & Sentinel, 1861 (a Confederate printing)', ['org-confederate'], 0.05),
    ('GROSS-1862-RICHMOND', 'manualofmilitary01gros', 'manualofmilitary01gros_djvu.txt', 'period-manual', 'Gross\'s text reprinted at Richmond: J. W. Randolph, 1862 (a Confederate printing; its preface says the book was recently published at Philadelphia); clean OCR', ['org-confederate', 'amputations'], 0.04),
    ('TRIPLER-BLACKMAN-1861-A', '46920330R.nlm.nih.gov', '46920330R_djvu.txt', 'period-manual', 'Tripler and Blackman, Hand-book for the Military Surgeon, Cincinnati: Robert Clarke & Co., 1861; no edition statement on the OCR title page (the first edition is likely; not confirmed)', ['triage-first-aid', 'instruments-supplies'], 0.04),
    ('TRIPLER-BLACKMAN-1861-2ED', '46920320R.nlm.nih.gov', '46920320R_djvu.txt', 'period-manual', 'Tripler and Blackman, Hand-book for the Military Surgeon, second edition, Cincinnati: Robert Clarke & Co., 1861 (a chapter on chloroform from Macleod is added; the appendix holds the standard supply for field service)', ['triage-first-aid', 'anaesthesia-analgesia', 'instruments-supplies', 'wound-care-splints', 'amputations', 'org-union-system'], 0.04),
    ('TRIPLER-BLACKMAN-1862-3ED', '46920340R.nlm.nih.gov', '46920340R_djvu.txt', 'period-manual', 'Tripler and Blackman, Hand-book for the Military Surgeon, third edition, Cincinnati: Robert Clarke & Co., 1862', ['triage-first-aid', 'anaesthesia-analgesia', 'instruments-supplies', 'wound-care-splints', 'amputations', 'org-union-system'], 0.04),
    ('TRIPLER-BLACKMAN-1862-3ED-ALT', 'handbookformili00blacgoog', 'handbookformili00blacgoog_djvu.txt', 'period-manual', 'the same third edition, a different scan (Google; the file begins with Google\'s notice); use it to confirm digits', ['triage-first-aid'], 0.04),
    ('WOODWARD-STEWARD-1862', '101526781.nlm.nih.gov', '101526781_djvu.txt', 'period-manual', 'Woodward, The Hospital Steward\'s Manual, Philadelphia: J. B. Lippincott & Co., 1862; the title page says it was rendered authoritative by order of the Surgeon-General; the file begins with the publisher\'s advertisements', ['org-union-system', 'nursing-diet-ward', 'instruments-supplies', 'infection-complications'], 0.06),
    ('WOODWARD-STEWARD-1863', 'hospitalstewards00unse', 'hospitalstewards00unse_djvu.txt', 'period-manual', 'Woodward, The Hospital Steward\'s Manual, Philadelphia: J. B. Lippincott & Co., 1863 (entered 1862); cleaner OCR than the 1862 scan', ['org-union-system', 'nursing-diet-ward', 'instruments-supplies'], 0.04),
    ('USSC-GETTYSBURG-1863', 'reportonoperatio00doug', 'reportonoperatio00doug_djvu.txt', 'institutional-history', 'Report on the Operations of the Sanitary Commission during and after the Battles at Gettysburg, July 1st, 2d and 3d, 1863, New York: Wm. C. Bryant & Co., printers, 1863 (author per the archive.org record: John Hancock Douglas)', ['org-aid-societies', 'sites-town', 'org-evacuation', 'camp-letterman'], 0.05),
    ('SOUDER-LEAVES-1864', 'leavesfrombattle00soud', 'leavesfrombattle00soud_djvu.txt', 'memoir-primary', 'Mrs. Edmund A. Souder, Leaves from the Battle-field of Gettysburg: a series of letters from a field hospital and National Cemetery, Philadelphia: Caxton Press of C. Sherman, Son & Co., 1864', ['org-aid-societies', 'camp-letterman', 'burial-practice', 'nursing-diet-ward'], 0.05),
]


def build():
    reg = {}
    nfiles = 0

    def put(sid, cls, edition, groups, files, rights, origin, lead=False, rate=0.04, title=None, url=None, notes=None):
        reg[sid] = {'title': title or edition, 'class': cls, 'lead': lead, 'edition': edition, 'rights': rights, 'origin': origin, 'groups': groups,
                    'ocr_error_rate': rate, 'files': files}
        if url:
            reg[sid]['url'] = url
        if notes:
            reg[sid]['notes'] = notes

    # ws9 and prior library texts
    for sid, cls, groups, edition, rate in WS9:
        p = one('tmp/library/ws9/%s__*.txt' % sid) or one('tmp/library/ws9/prior/%s__*.txt' % sid)
        if not p:
            continue
        put(sid, cls, edition, groups, {'main': {'path': rel(p), 'sha256': sha(p), 'bytes': os.path.getsize(p), 'page_model': 'heads'}}, PD, 'library queue, present before the medical workstream', rate=rate)
    for sid, spec in PRIOR:
        if sid in reg or spec is None:
            continue
        p = one('tmp/library/ws9/prior/%s__*.txt' % sid)
        if not p:
            continue
        cls, groups, edition = spec
        put(sid, cls, edition, groups, {'main': {'path': rel(p), 'sha256': sha(p), 'bytes': os.path.getsize(p), 'page_model': 'heads'}}, PD, 'library queue, present before the medical workstream')
    # newspapers: one source, one file per weekly issue
    for sid, pat, name in (('ADAMS-SENTINEL-1863', 'tmp/library/ws9/ADAMS-SENTINEL-1863-*__*.txt', 'Adams Sentinel (Gettysburg)'), ('GBG-COMPILER-1863', 'tmp/library/ws9/GBG-COMPILER-1863-*__*.txt', 'Gettysburg Compiler')):
        files = {}
        for p in sorted(glob.glob(os.path.join(ROOT, pat))):
            m = re.search(r'1863-\d\d-\d\d', os.path.basename(p))
            files[m.group(0)] = {'path': rel(p), 'sha256': sha(p), 'bytes': os.path.getsize(p), 'page_model': 'none'}
        put(sid, 'contemporary-print', name + ', weekly issues of 1863 (the file key is the issue date)', ['sites-town', 'org-aid-societies', 'camp-letterman', 'burial-practice', 'gettysburg-statistics'], files,
            'public domain (US newspaper of 1863); the OCR text is machine output of the scan', 'library queue, present before the medical workstream', rate=0.07,
            notes='newspaper OCR is poor: quote short passages; a notice or an advertisement states what the paper printed, not what happened')
    # Official Records Ser. I vol. 27
    files = {}
    for part, ident in ((1, 'cu31924077699761'), (2, 'cu31924077728255'), (3, 'cu31924077700262')):
        p = os.path.join(ROOT, 'tmp', 'library', 'or27', ident + '_djvu.txt')
        if os.path.exists(p):
            files['pt%d' % part] = {'path': rel(p), 'sha256': sha(p), 'bytes': os.path.getsize(p), 'page_model': 'or27:%d' % part}
    put('OR27', 'official-report', 'War of the Rebellion: Official Records, Series I, volume 27, parts 1 to 3, Washington: Government Printing Office, 1889; report ids and printed pages: docs/battle-theatre/library/or27_index.json',
        ['org-union-system', 'org-evacuation', 'org-confederate', 'gettysburg-statistics', 'camp-letterman'], files, GOV, 'library queue, present before the medical workstream', rate=0.06,
        notes='medical reports: OR27-1-R003 Cuyler (p. 24), R004 Vollum (p. 25), R016 Letterman (p. 195); OR27-2-R427 Guild (p. 326), R431 Patterson (p. 364); OR27-3 correspondence (for example D1547 Cuyler to Hammond, 20 July, p. 730)')
    # National Park Service texts (reading-order text of each report; page markers are PDF page indexes)
    src = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-web', 'nps', 'sources.json'), encoding='utf-8'))['sources']
    for s in src:
        tp = s.get('text_path')
        if not tp or not os.path.exists(os.path.join(ROOT, tp)):
            continue
        p = os.path.join(ROOT, tp)
        is_web = s['id'].startswith('NPSGOV-')
        put(s['id'], 'nps-report', '%s%s' % (s.get('title') or s['id'], (' (' + str(s['date']) + ')') if s.get('date') else ''), NPS_GROUPS.get(s['id'], []),
            {'main': {'path': rel(p), 'sha256': sha(p), 'bytes': os.path.getsize(p), 'page_model': 'none' if is_web else 'marker', 'page_marker': None if is_web else r'^=== PAGE (\d+) ===$'}},
            GOV, 'National Park Service texts acquired by the web workstream (GOVERNANCE/horde/ws-web/nps)', rate=0.04, url=s.get('url'))
    for sid, path, url, title, groups in WEB3:
        p = os.path.join(ROOT, path)
        if os.path.exists(p):
            put(sid, 'nps-report', title, groups, {'main': {'path': path, 'sha256': sha(p), 'bytes': os.path.getsize(p), 'page_model': 'none'}}, GOV, 'National Park Service page fetched by the web workstream', url=url)
    # acquired by the planning step: the hash lives in the ledger, the registry holds the path
    ledger = []
    for sid, aid, fname, cls, edition, groups, rate in ACQUIRED:
        p = os.path.join(ROOT, 'tmp', 'library', 'medical', sid, fname)
        if not os.path.exists(p):
            print('missing acquired file for', sid, p)
            continue
        put(sid, cls, edition, groups, {'main': {'path': rel(p), 'sha256': None, 'bytes': os.path.getsize(p), 'page_model': 'heads'}}, PD,
            'acquired by the planning step from archive.org item %s' % aid, rate=rate, url='https://archive.org/details/' + aid)
        ledger.append((sid, cls, 'no', edition, rel(p), sha(p), os.path.getsize(p), PD, 'https://archive.org/cors/%s/%s' % (aid, fname), 'plan'))
    # planned: a file path and no hash; the ledger gets its row when the file is downloaded
    remote = json.load(open(os.path.join(MED, 'sources-remote.json'), encoding='utf-8'))
    for r in remote['archive_org']:
        if r['source_id'] in reg:
            continue
        put(r['source_id'], r['class'], '%s (%s); archive.org item %s; edition read after download' % (r['title'], r['date'], r['archive_id']), r['groups'],
            {'main': {'path': 'tmp/library/medical/%s/%s' % (r['source_id'], r['file']), 'sha256': None, 'bytes': r['size'], 'page_model': 'heads'}},
            PD, 'planned: archive.org metadata verified 2026-11-14, not yet downloaded', rate=0.05, url=r['details_url'])
    for r in remote['other_hosts']:
        put(r['source_id'], r['class'], r['title'], r['groups'], {'main': {'path': 'tmp/library/medical/%s/%s' % (r['source_id'], os.path.basename(r['url'])), 'sha256': None, 'bytes': r.get('size'), 'page_model': 'marker', 'page_marker': r'^=== PAGE (\d+) ===$'}},
            GOV, 'planned: not yet downloaded', url=r['url'])
    for s in reg.values():
        for f in s['files'].values():
            if f.get('page_marker') is None:
                f.pop('page_marker', None)
    return reg, ledger, remote


def short_rights(r):
    if r.startswith('public domain (US newspaper'):
        return 'public domain (1863 newspaper)'
    if r.startswith('public domain'):
        return 'public domain (pre-1929 US)'
    return 'US government work' if 'government' in r else r[:40]


def md_escape(s):
    return str(s).replace('|', '/').replace('\n', ' ')


LEDGER_HEAD = '| date | source id | class | lead | edition | local path | sha256 | bytes | rights | url | group |\n|---|---|---|---|---|---|---|---|---|---|---|\n'
LEDGER_MARK = '<!-- LEDGER-BEGIN: append table rows below with a shell >>, one per local file, 11 cells; never edit or delete a row; a source that is not in sources.json is added by its row alone -->'


def render_md(reg, ledger, remote):
    L = []
    w = L.append
    local = {sid: s for sid, s in reg.items() if s['origin'].startswith(('library queue', 'National Park Service'))}
    w('# Medical evidence: source ledger\n')
    w('Written %s by the planning step of the medical workstream (OA12). It says which texts are local, which are to acquire, on what rights, and with which hash. '
      'The machine copy the validator reads is `sources.json` (same folder); `tools/bt/medical/make_sources.py` wrote both once. **The ledger at the end of this file is append-only**: '
      'whoever puts a file under `tmp/library/medical/<source id>/` appends one table row (11 cells) with a shell `>>`, and the validator then accepts quotes from that file. '
      'A row of this file is never edited or deleted.\n' % TODAY)
    w('## 1. Rules\n')
    w('* **Reachable hosts only**: archive.org (download `https://archive.org/cors/<identifier>/<file>`), gutenberg.org, www.loc.gov, tile.loc.gov, cdn.loc.gov, www.nps.gov, www.npshistory.com, chroniclingamerica.loc.gov, catalog.archives.gov. '
      'hathitrust.org and ehistory.osu.edu answer with their own bot block: blocked, not retried. At most one request a second; no logins, no CAPTCHAs, no bot-block circumvention.')
    w('* **Rights.** Books and pamphlets published in the United States before 1929 are public domain; the OCR text is machine output of the scan and carries no separate claim. Official Records, National Park Service texts and Surgeon General publications are United States government works. '
      'A file whose rights are not clear is not downloaded; the owner decides (section 5).')
    w('* **Classes** (the validator uses them): `official-report`, `official-history`, `period-manual`, `memoir-primary`, `contemporary-print`, `institutional-history`, `regimental-history`, `nps-report`, `photo-record`, `reference-secondary`, `lead`. '
      'A `lead` source (Wikipedia, forums, blogs, marker-transcription databases, auction and commercial pages, the museum and magazine pages the PDF cites without a primary basis) can support only an open gap row; `reference-secondary` supports at most an inferred row; Law 4 is not negotiable.')
    w('* **Edition.** Every row names the edition of the printing it quotes. The edition column below is what was read on the title page, or says it was not read. The archive.org date field is a catalogue date, not an edition statement (two items below show the difference).')
    w('* **Hash.** `sha256` of the file as downloaded; for every archive.org text the md5 was also compared with the md5 of the archive.org record and equal. A quote is valid only while the file hash is the recorded one: the offsets are character offsets into that exact file.')
    w('* **Extract once.** Check this file and `tmp/library/medical/` before downloading; a text is downloaded once and read from disk by every group.\n')

    w('## 2. The sources the task names: present or absent when this step began\n')
    w('| source | present at the start? | where it is now |')
    w('|---|---|---|')
    w('| Letterman, Medical Recollections of the Army of the Potomac, 1866 | **present** (library queue, ws9) | `LETTERMAN-1866`; the Gettysburg section is printed pages 153 to 160 |')
    w('| Letterman\'s report on Gettysburg, 3 October 1863 | **present** (Official Records vol. 27 part 1, report 16, printed pages 195 to 199) | `OR27` file `pt1` |')
    w('| The Medical and Surgical History of the War of the Rebellion | **absent** | the three surgical volumes (Part I vol. II 1870, Part II vol. II 1876, Part III vol. II 1883) were downloaded by this step and are in the ledger; the three medical volumes are planned (section 4) |')
    w('| S. D. Gross, A Manual of Military Surgery | **absent** | downloaded by this step: four printings (Philadelphia 1861 and 1862, and the Confederate reprints of Augusta 1861 and Richmond 1862) |')
    w('| Tripler and Blackman, Handbook for the Military Surgeon | **absent** | downloaded by this step: 1861 (two printings, one marked second edition) and 1862 (third edition, two scans) |')
    w('| The Hospital Steward\'s Manual (Woodward) | **absent** | downloaded by this step: 1862 and 1863 printings |')
    w('| Jacobs, Notes on the Rebel Invasion of Maryland and Pennsylvania, 1864 | **present** (ws9) | `JACOBS-1864` |')
    w('| The surgeons\' reports of the Gettysburg hospitals | **partly present**: Letterman, Medical Inspectors Cuyler and Vollum (OR27 pt 1, reports 16, 3 and 4), Guild and Patterson for the Confederate side (OR27 pt 2, reports 427 and 431), the correspondence of OR27 pt 3. **Absent**: the reports of the corps medical directors and of Surgeon Janes, the surgeons\' case reports in the 1863-64 medical journals, the Sanitary Commission\'s and Christian Commission\'s own field reports (two are planned or acquired) | see sections 3 and 4 |\n')

    w('## 3. Local texts\n')
    w('### 3.1 Present before this step (not downloaded by it)\n')
    w('Full hashes are in `sources.json`. "files" is the number of files of the source; for the newspapers one file is one weekly issue.\n')
    w('| source id | class | edition or title | files | bytes | sha256 (first 16 hex) | rights |')
    w('|---|---|---|---|---|---|---|')
    for sid, s in sorted(local.items()):
        f = list(s['files'].values())
        w('| `%s` | %s | %s | %d | %s | %s | %s |' % (sid, s['class'], md_escape(s['edition'])[:150], len(f), '{:,}'.format(sum(x.get('bytes') or 0 for x in f)), (f[0]['sha256'][:16] if len(f) == 1 else 'per file'), short_rights(s['rights'])))
    w('')
    w('### 3.2 Acquired by this step (in the ledger of section 7)\n')
    w('| source id | class | edition read from the title page | bytes | sha256 (first 16 hex) |')
    w('|---|---|---|---|---|')
    for row in ledger:
        w('| `%s` | %s | %s | %s | %s |' % (row[0], row[1], md_escape(row[3])[:210], '{:,}'.format(row[6]), row[5][:16]))
    w('')
    w('What reading the title pages showed (all of it written into the edition column): the archive.org "1861" Gross item `manualofmilitary00grosrich` is the **second edition of 1862**; the "1861" item `manualofmilitary00gros` is an **Augusta, Georgia printing** and `manualofmilitary01gros` a **Richmond printing of 1862**, '
      'both Confederate; the Tripler and Blackman 1861 and 1862 items are second and third editions; the Woodward title page says the manual was "rendered authoritative by order of the Surgeon-General"; the 1870 surgical volume has its table of contents at the end of the file; '
      'two scans of two volumes exist (first and second issues of 1876/1877 and 1883) and are kept so that a digit read in one OCR can be confirmed in the other.\n')

    w('## 4. To acquire (archive.org item metadata fetched 2026-11-14; nothing below is downloaded yet)\n')
    w('Priority A: needed by the first pass of the groups named. B: needed for completeness of the group. C: only if A and B leave a gap. Size, md5 and sha1 are the archive.org record of the file; the local hash is written to the ledger when it is downloaded.\n')
    w('| priority | source id | archive.org item | file | size | md5 | class | groups | note |')
    w('|---|---|---|---|---|---|---|---|---|')
    for r in sorted(remote['archive_org'], key=lambda r: (r['priority'], r['source_id'])):
        w('| %s | `%s` | `%s` | `%s` | %s | `%s` | %s | %s | %s |' % (r['priority'], r['source_id'], r['archive_id'], r['file'], '{:,}'.format(r['size']), r['md5'], r['class'], ', '.join(r['groups']), md_escape(r['note'])))
    w('')
    w('### 4.1 Other reachable hosts\n')
    w('| priority | source id | url | size | class | groups | note |')
    w('|---|---|---|---|---|---|---|')
    for r in remote['other_hosts']:
        w('| %s | `%s` | %s | %s | %s | %s | %s |' % (r['priority'], r['source_id'], r['url'], ('{:,}'.format(r['size']) if r.get('size') else 'not fetched'), r['class'], ', '.join(r['groups']), md_escape(r['note'])))
    w('')
    w('### 4.2 Library of Congress pictures (record titles from a www.loc.gov search of 2026-11-14; images not fetched, not viewed)\n')
    w(remote['loc_note'] + '\n')
    w('| LoC id | title | date as catalogued | call number |')
    w('|---|---|---|---|')
    for r in remote['loc_items']:
        w('| [%s](%s) | %s | %s | %s |' % (r['loc_id'], r['url'], md_escape(r['title']), r['date'], md_escape(r['call_number'])))
    w('')
    w('### 4.3 Searches the groups run themselves (channels, not yet sources)\n')
    w('* **Chronicling America** (chroniclingamerica.loc.gov, 1863 newspapers): July to November 1863 reports from Gettysburg on the hospitals, the Sanitary and Christian Commissions, Camp Letterman, the burial of the dead and the horses (groups sites-*, org-aid-societies, camp-letterman, burial-practice). One search term list per group, each hit saved as page OCR text with its page id; the ws-web lane has an earlier run for other topics under `tmp/library/web/ca` (read its notes first).')
    w('* **www.npshistory.com** Gettysburg Seminar Papers (series/symposia/gettysburg_seminars/N/index.htm) and the Historic Structure Reports for farms: read the index pages for medical and hospital essays before using one.')
    w('* **archive.org full-text and subject search** for regimental histories and narratives with hospital passages (title and subject queries returned the Souder, Hospital Scenes, Sanitary Commission and Brinton items above; no other Gettysburg hospital book was found by a title search on 2026-11-14).')
    w('* **catalog.archives.gov**: record groups of the Surgeon General\'s Office and the Quartermaster Department for Gettysburg hospital records (registers, hospital returns). Catalogue records only; images are not assumed.\n')

    w('## 5. Not acquirable here, blocked, owner-only, or lead only\n')
    w('| item | status | what is needed |')
    w('|---|---|---|')
    w('| Gregory A. Coco, *A Vast Sea of Misery* (1988) and his Gettysburg hospital lists | in copyright; not downloaded | owner-only: purchase or interlibrary loan and a decision on how much may be quoted; the hospital-site groups register every site that only that book documents as an open gap (the PDF may cite its content at second hand: that is a lead, not a source) |')
    w('| HathiTrust full texts | blocked host (bot block); not retried | none; any title found only there is registered as an open gap with its identifier |')
    w('| Adams County Historical Society and Gettysburg College Special Collections holdings (surgeons\' letters, hospital registers) | not reachable | owner-only: a written request to the institution (the owner sends it); the text can be drafted by the groups |')
    w('| The Historical Marker Database (HMDB) and similar transcriptions of markers (the PDF cites HMDB-17934, -17936, -17939, -13265, -17931 for hospital facts) | **lead only** | the tablets themselves are Pennsylvania Historical Commission or Park Service objects; a tablet text is a source only when read from the tablet or from a Park Service listing (npshistory.com NPS-MON-LOC-1932 and -1993 list tablets) |')
    w('| Wikipedia, HistoryNet, Civil War News, American Battlefield Trust, National Museum of Civil War Medicine pages, Aleteia, blogs and forums cited by the PDF for hospital facts (PDF B.8.5) | **lead only** | every such fact is re-sourced from a primary or Park Service text or stays an open gap; none is quoted as documented |')
    w('| Photographs and drawings (LoC items in 4.2) | not yet fetched | rights are public domain for the 1860s items; modern photographs of the same buildings are later states and never evidence of an 1863 layout |')
    w('| Modern re-enactor, museum-exhibit and film depictions of Civil War surgery | not evidence | never used; a depiction is documented only where a period source states it |\n')

    w('## 6. Verification notes of this step\n')
    w('* Every archive.org identifier in section 4 was fetched from `https://archive.org/metadata/<id>` on 2026-11-14: title, date, file list, size, md5 and sha1 are the record\'s. The 18 files of section 3.2 were downloaded and their md5 equals the record\'s; their title pages (and for the 1870 MSHWR volume its table of contents) were read, except `MSHWR-P1V2-1870-ALT`, which was identified as a second scan of that volume by matching chapter and topic counts only.')
    w('* The three MSHWR surgical volumes were identified by their title pages ("PART II. VOLUME II. SURGICAL HISTORY ... FIRST ISSUE ... 1876", "PART III. VOLUME II ... FIRST ISSUE ... 1883") and the 1870 volume by its table of contents ("VOLUME II OF PART I ... BEING THE FIRST SURGICAL VOLUME"); '
      'chapters: I head, II face, III neck, IV spine, V chest (Part I); VI abdomen, VII pelvis, VIII flesh wounds of the back, IX upper extremities (Part II); X lower extremities, XI miscellaneous injuries, XII wounds and complications, XIII anaesthetics, XIV the medical staff and materia chirurgica, XV transportation of the wounded (Part III).')
    w('* OCR quality differs by file; the validator tolerates whitespace, hyphenation at line ends, running heads and OCR noise up to a share of the quote per source (`ocr_error_rate` in `sources.json`), but never a changed digit or number word.\n')

    w('## 7. Acquisition ledger (append-only)\n')
    w(LEDGER_MARK)
    w(LEDGER_HEAD.rstrip('\n'))
    for r in ledger:
        w('| %s | %s | %s | %s | %s | %s | %s | %d | %s | %s | %s |' % ((TODAY, r[0], r[1], r[2], md_escape(r[3]), r[4], r[5], r[6], md_escape(r[7]), r[8], r[9])))
    return '\n'.join(L) + '\n'


def main(argv):
    reg, ledger, remote = build()
    # the classes come from the validator so that the two files cannot disagree
    sys.path.insert(0, HERE)
    import validate_evidence as V
    doc = {'schema': 'medical-sources/1', 'generated': TODAY,
           '_doc': 'Registry of the texts the medical evidence validator may quote. files.<key>.sha256 null means: the hash is in the ledger of SOURCES.md (acquired by the planning step or later) or the file is planned and not yet local. '
                   'page_model: heads (running heads of OCR text), marker (a regex line giving the PDF page index), or27:N (the OR27 page model of tools/bt/or27_pages.py), none.',
           'classes': V.CLASSES, 'sources': reg}
    if '--check' in argv:
        print('sources: %d; local files: %d; ledger rows: %d' % (len(reg), sum(1 for s in reg.values() for f in s['files'].values() if f.get('sha256') or f['path'].startswith('tmp/library/medical')), len(ledger)))
        return 0
    with open(os.path.join(MED, 'sources.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, indent=1)
    md_path = os.path.join(MED, 'SOURCES.md')
    if os.path.exists(md_path) and '--force-md' not in argv:
        print('SOURCES.md exists: left alone (use --force-md to rewrite it; refused when it holds ledger rows this script did not write)')
    else:
        if os.path.exists(md_path):
            have = V.parse_ledger(open(md_path, encoding='utf-8').read())
            mine = {(r[0], r[5]) for r in ledger}
            extra = [r for r in have if (r['source id'], r['sha256']) not in mine]
            if extra:
                print('refused: SOURCES.md holds %d ledger rows added after it was written' % len(extra))
                return 1
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(render_md(reg, ledger, remote))
        print('wrote', rel(md_path))
    print('wrote', rel(os.path.join(MED, 'sources.json')), '(%d sources)' % len(reg))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
