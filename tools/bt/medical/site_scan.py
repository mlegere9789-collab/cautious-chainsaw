#!/usr/bin/env python3
"""Inventory scan for the hospital-site research groups: for each candidate site name, in which local texts does the name stand within
250 characters of the word 'hospital' (or 'surgeon', 'amputat', 'wounded')? Output: docs/battle-theatre/medical/evidence/SITES-CANDIDATES.json.

This is an inventory of where to look, NOT evidence: no row of any evidence file may rest on it. A name that no local text puts
beside a hospital word stays a candidate with an empty list, and the group that owns the area looks for a source (SOURCES.md).

    python3 -I tools/bt/medical/site_scan.py [--out PATH]
"""
import os, re, sys, json, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'medical', 'evidence', 'SITES-CANDIDATES.json')

# (id, name pattern, area group, side, note). Area groups are the four site groups of groups.json.
SITES = [
    # town
    ('courthouse', r'court[- ]?house', 'sites-town', 'both', 'Adams County Court House'),
    ('christ-lutheran', r'(christ (lutheran )?church|college church|lutheran church)', 'sites-town', 'union', 'Christ (Lutheran) Church, Chambersburg Street'),
    ('presbyterian', r'presbyterian', 'sites-town', 'both', 'Presbyterian Church, Baltimore Street (PDF H-01)'),
    ('st-francis', r'(st\.? francis|catholic church|roman catholic)', 'sites-town', 'both', 'St. Francis Xavier Catholic church (PDF H-02)'),
    ('german-reformed', r'german reformed', 'sites-town', 'both', 'German Reformed Church, Baltimore Street'),
    ('methodist', r'methodist', 'sites-town', 'both', 'Methodist church(es)'),
    ('pennsylvania-hall', r'(pennsylvania hall|pennsylvania college|college building)', 'sites-town', 'both', 'Pennsylvania College (PDF H-03)'),
    ('depot', r'(railroad depot|rail ?road station|\bdepot\b)', 'sites-town', 'both', 'railroad depot, Carlisle Street'),
    ('almshouse', r'(alms[- ]?house|poor[- ]?house)', 'sites-west-north', 'both', 'Adams County Almshouse'),
    ('town-houses', r'(red flag|every house was a hospital|private houses)', 'sites-town', 'both', 'houses in town'),
    ('school-town', r'(school[- ]?house|public school|academy)', 'sites-town', 'both', 'school buildings in town'),
    ('hotel', r'(\bhotel\b|\btavern\b|\binn\b)', 'sites-town', 'both', 'hotels and taverns'),
    ('warehouse', r'(warehouse|foundry|\bshop\b)', 'sites-town', 'both', 'warehouses and shops'),
    # west and north
    ('seminary', r'(seminary|schmucker)', 'sites-west-north', 'both', 'Lutheran Theological Seminary (PDF H-03, H-20)'),
    ('mcpherson', r'mcpherson', 'sites-west-north', 'both', 'McPherson farm (PDF H-05)'),
    ('dustman', r'dustman', 'sites-west-north', 'union', 'Dustman house'),
    ('schultz', r'(schultz|shultz)', 'sites-west-north', 'both', 'Schultz house'),
    ('crist', r'\bcrist\b', 'sites-west-north', 'confederate', 'Crist farm, Herr Ridge'),
    ('herr-wible', r'(\bwible\b|herr\'?s? (tavern|ridge|farm))', 'sites-west-north', 'confederate', 'Wible / Herr farm'),
    ('leaper', r'leaper', 'sites-west-north', 'confederate', 'Isaac Leaper property'),
    ('a-spangler', r'abraham spangler', 'sites-west-north', 'confederate', 'Abraham Spangler property'),
    ('black-horse', r'black horse', 'sites-west-north', 'confederate', 'Black Horse Tavern (McClellan homestead)'),
    ('benner', r'benner', 'sites-west-north', 'both', 'Josiah Benner house and barn'),
    ('hankey', r'hankey', 'sites-west-north', 'union', 'Hankey (Mummasburg Road)'),
    ('forney', r'forney', 'sites-west-north', 'confederate', 'Forney farm'),
    ('pitzer', r'pitzer', 'sites-west-north', 'confederate', 'Pitzer farm and woods'),
    ('bream', r'bream', 'sites-west-north', 'confederate', 'Bream\'s mill'),
    ('lady', r'daniel lady', 'sites-west-north', 'confederate', 'Daniel Lady farm (PDF H-19)'),
    ('cashtown', r'cashtown', 'sites-west-north', 'confederate', 'Cashtown'),
    ('marsh-creek', r'(marsh creek|willoughby)', 'sites-west-north', 'confederate', 'Marsh Creek and Willoughby Run hospitals'),
    ('wolf-field', r'wolf\'?s? (field|farm)', 'sites-west-north', 'union', 'Wolf\'s field (PDF H-18)'),
    ('culp', r'(culp|taney)', 'sites-east-southeast', 'both', 'Culp / Taney farm (PDF B.8.2)'),
    # east and southeast
    ('g-spangler', r'(george spangler|spangler farm|spangler\'?s)', 'sites-east-southeast', 'union', 'George Spangler farm (PDF H-06)'),
    ('granite-school', r'granite (school|schoolhouse)', 'sites-east-southeast', 'union', 'Granite Schoolhouse (PDF H-07)'),
    ('bushman', r'bushman', 'sites-east-southeast', 'both', 'Bushman farms (PDF H-15, H-21)'),
    ('lightner', r'lightner', 'sites-east-southeast', 'union', 'Lightner farm (XII Corps)'),
    ('diener', r'diener', 'sites-east-southeast', 'union', 'Diener farm'),
    ('conover', r'conover', 'sites-east-southeast', 'union', 'Conover farm'),
    ('beitler', r'beitler', 'sites-east-southeast', 'union', 'Beitler farm'),
    ('schwartz', r'schwartz', 'sites-east-southeast', 'union', 'Schwartz farm'),
    ('shaeffer', r'(shaeffer|schaeffer|shaffer)', 'sites-east-southeast', 'union', 'Shaeffer farm'),
    ('white-church', r'(white church|marks german reformed|white\'?s church)', 'sites-east-southeast', 'union', 'White Church (PDF H-04, H-17)'),
    ('white-run', r'white run', 'sites-east-southeast', 'union', 'White Run (III and V Corps hospitals, PDF H-09, H-10)'),
    ('rock-creek', r'rock creek', 'sites-east-southeast', 'union', 'Rock Creek hospitals (PDF H-11, H-17)'),
    ('fiscel', r'fiscel', 'sites-east-southeast', 'union', 'Fiscel farm (V Corps 1st Division, PDF H-09)'),
    ('clapsaddle', r'clapsaddle', 'sites-east-southeast', 'union', 'Clapsaddle house (PDF H-09)'),
    ('two-taverns', r'two taverns', 'sites-east-southeast', 'union', 'Two Taverns (V Corps 3rd Division, PDF H-09)'),
    ('baltimore-pike', r'baltimore (pike|turnpike)', 'sites-east-southeast', 'union', 'Baltimore Pike corridor'),
    ('hanover-road', r'hanover (road|pike)', 'sites-east-southeast', 'union', 'Hanover Road (cavalry)'),
    ('camp-letterman', r'camp letterman', 'camp-letterman', 'general', 'Camp Letterman (PDF H-23)'),
    # south and southwest
    ('weikert', r'weikert', 'sites-south-southwest', 'union', 'George Weikert farm (PDF H-08)'),
    ('trostle', r'trostle', 'sites-south-southwest', 'union', 'Trostle farm (PDF H-13)'),
    ('hummelbaugh', r'hummelbaugh', 'sites-south-southwest', 'union', 'Hummelbaugh farm (PDF H-12)'),
    ('leister', r'leister', 'sites-south-southwest', 'union', 'Leister house and barn (PDF H-16)'),
    ('frey', r'\bfrey\b', 'sites-south-southwest', 'union', 'Frey property orchard'),
    ('patterson', r'patterson', 'sites-south-southwest', 'union', 'Patterson house, Taneytown Road'),
    ('taneytown-road', r'taneytown (road|pike)', 'sites-south-southwest', 'union', 'Taneytown Road corridor (III Corps, PDF H-10)'),
    ('sherfy', r'sherfy', 'sites-south-southwest', 'union', 'Sherfy barn (shelter for wounded)'),
    ('codori', r'codori', 'sites-south-southwest', 'both', 'Codori house'),
    ('rose', r'(george rose|rose farm|rose\'?s)', 'sites-south-southwest', 'confederate', 'Rose farm (PDF H-21)'),
    ('slyder', r'slyder', 'sites-south-southwest', 'confederate', 'Slyder farm (PDF H-21)'),
    ('rummel', r'rummel', 'sites-south-southwest', 'confederate', 'Rummel barn'),
    ('peach-orchard-houses', r'(wentz|peach orchard)', 'sites-south-southwest', 'both', 'Wentz / Peach Orchard area'),
    ('henry-spangler', r'henry spangler', 'sites-south-southwest', 'both', 'Henry Spangler farm (Emmitsburg Road)'),
    ('klingel', r'klingel', 'sites-south-southwest', 'both', 'Klingel'),
    ('warfield', r'warfield', 'sites-south-southwest', 'confederate', 'Warfield house'),
    ('little-round-top', r'(round top|devil\'?s den)', 'sites-south-southwest', 'both', 'Round Tops area'),
    ('sheads', r'sheads', 'sites-south-southwest', 'both', 'Sheads'),
]

WINDOW = 250
HOSP = re.compile(r'hospital|surgeon|amputat|wounded', re.I)


def texts():
    out = []
    # book-length texts of the library (ws9, prior) and the 1863 newspapers
    for p in sorted(glob.glob(os.path.join(ROOT, 'tmp', 'library', 'ws9', '*.txt'))):
        b = os.path.basename(p)
        out.append((b.split('__')[0], 'tmp/library/ws9/' + b))
    for p in sorted(glob.glob(os.path.join(ROOT, 'tmp', 'library', 'ws9', 'prior', '*.txt'))):
        b = os.path.basename(p)
        out.append((b.split('__')[0], 'tmp/library/ws9/prior/' + b))
    for p in sorted(glob.glob(os.path.join(ROOT, 'tmp', 'library', 'web', 'nps', '*', '*.txt'))):
        d = os.path.basename(os.path.dirname(p))
        if p.endswith('.layout.txt') or p.endswith('.raw.txt') or os.path.basename(p) != d + '.txt':
            continue
        out.append((d, os.path.relpath(p, ROOT)))
    for part, ident in ((1, 'cu31924077699761'), (2, 'cu31924077728255'), (3, 'cu31924077700262')):
        out.append(('OR27-PT%d' % part, 'tmp/library/or27/%s_djvu.txt' % ident))
    out.append(('PDF-PLAN-V2', 'docs/battle-theatre/BIBLE/plan-clean.txt'))
    seen = set(); res = []
    for sid, rel in out:
        if rel in seen:
            continue
        seen.add(rel); res.append((sid, rel))
    return res


def main(argv):
    out = OUT
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    pats = [(sid, re.compile(p, re.I)) for sid, p, *_ in SITES]
    hits = {sid: {} for sid, *_ in SITES}
    scanned = []
    for src, rel in texts():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8', errors='replace', newline='') as f:
            t = f.read()
        scanned.append(src)
        t = re.sub(r'\s+', ' ', t)
        wins = []
        for m in HOSP.finditer(t):
            a, b = max(0, m.start() - WINDOW), min(len(t), m.end() + WINDOW)
            if wins and a <= wins[-1][1]:
                wins[-1][1] = b
            else:
                wins.append([a, b])
        joined = [t[a:b] for a, b in wins]
        for sid, rx in pats:
            n = sum(len(rx.findall(w)) for w in joined)
            if n:
                hits[sid][src] = n
    rows = []
    for sid, p, area, side, note in SITES:
        h = hits[sid]
        rows.append({'id': sid, 'name': note, 'area_group': area, 'side': side, 'pattern': p,
                     'local_sources_with_hospital_co_mention': dict(sorted(h.items(), key=lambda kv: -kv[1])),
                     'n_sources': len(h)})
    doc = {'_doc': 'Inventory scan, not evidence. A pattern co-mention of a site name with hospital, surgeon, amputat or wounded inside 250 characters of a local text. '
                   'Counts include OCR noise and unrelated uses of a common word (taverns, school, rose). Written by tools/bt/medical/site_scan.py.',
           'window_chars': WINDOW, 'scanned_texts': len(scanned), 'sites': rows}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(doc, f, indent=1)
    zero = [r['id'] for r in rows if not r['n_sources']]
    print('texts scanned: %d; candidates: %d; with no local co-mention: %d (%s)' % (len(scanned), len(rows), len(zero), ', '.join(zero)))
    for r in rows:
        top = ', '.join('%s:%d' % kv for kv in list(r['local_sources_with_hospital_co_mention'].items())[:4])
        print('%-22s %-22s n=%-3d %s' % (r['id'], r['area_group'], r['n_sources'], top))


if __name__ == '__main__':
    main(sys.argv[1:])
