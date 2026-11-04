"""Merge the Boies 1913 Gettysburg-survivors list into the MW unit CSVs (PLAN 2.2 rule 3, participants list) and create
unit CSVs for the Michigan units whose full roll is not obtainable from an open source.
usage: boies_merge.py   (reads work/boies_mw.json, rewrites docs/.../data/MW/<slug>.csv)"""
import json, re, os, csv, difflib, sys
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MW')
D = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'MW')

UNIT = {
    'mi-1-inf': ('U-1MI', '1st Michigan Infantry', '1st-michigan-infantry'), 'mi-3-inf': ('U-3MI', '3rd Michigan Infantry', '3rd-michigan-infantry'),
    'mi-4-inf': ('U-4MI', '4th Michigan Infantry', '4th-michigan-infantry'), 'mi-5-inf': ('U-5MI', '5th Michigan Infantry', '5th-michigan-infantry'),
    'mi-7-inf': ('U-7MI', '7th Michigan Infantry', '7th-michigan-infantry'), 'mi-16-inf': ('U-16MI', '16th Michigan Infantry', '16th-michigan-infantry'),
    'mi-24-inf': ('U-24MI', '24th Michigan Infantry', '24th-michigan-infantry'),
    'mi-1-cav': ('U-1MI-CAV', '1st Michigan Cavalry', '1st-michigan-cavalry'), 'mi-5-cav': ('U-5MI-CAV', '5th Michigan Cavalry', '5th-michigan-cavalry'),
    'mi-6-cav': ('U-6MI-CAV', '6th Michigan Cavalry', '6th-michigan-cavalry'), 'mi-7-cav': ('U-7MI-CAV', '7th Michigan Cavalry', '7th-michigan-cavalry'),
    'wi-2-inf': ('U-2WI', '2nd Wisconsin Infantry', '2nd-wisconsin-infantry'), 'wi-3-inf': ('U-3WI', '3rd Wisconsin Infantry', '3rd-wisconsin-infantry'),
    'wi-5-inf': ('U-5WI', '5th Wisconsin Infantry', '5th-wisconsin-infantry'), 'wi-6-inf': ('U-6WI', '6th Wisconsin Infantry', '6th-wisconsin-infantry'),
    'wi-7-inf': ('U-7WI', '7th Wisconsin Infantry', '7th-wisconsin-infantry'), 'wi-26-inf': ('U-26WI', '26th Wisconsin Infantry', '26th-wisconsin-infantry'),
    'in-14-inf': ('U-14IN', '14th Indiana Infantry', '14th-indiana-infantry'), 'in-19-inf': ('U-19IN', '19th Indiana Infantry', '19th-indiana-infantry'),
    'in-20-inf': ('U-20IN', '20th Indiana Infantry', '20th-indiana-infantry'), 'in-27-inf': ('U-27IN', '27th Indiana Infantry', '27th-indiana-infantry'),
    'in-3-cav': ('U-3IN-CAV', '3rd Indiana Cavalry', '3rd-indiana-cavalry'),
    'il-82-inf': ('U-82IL', '82nd Illinois Infantry', '82nd-illinois-infantry'), 'il-8-cav': ('U-8IL-CAV', '8th Illinois Cavalry', '8th-illinois-cavalry'),
    'il-12-cav': ('U-12IL-CAV', '12th Illinois Cavalry', '12th-illinois-cavalry'), 'mn-1-inf': ('U-1MN', '1st Minnesota Infantry', '1st-minnesota-infantry'),
}
COLS = ['regiment', 'unit_id', 'company', 'section', 'rank', 'name_as_printed', 'name_clean', 'residence', 'age_as_printed', 'enlist_or_rank_date', 'muster_date_as_printed', 'mustered_out_as_printed', 'remarks_as_printed', 'presence_label', 'presence_basis', 'dup_group', 'source_id', 'source_page_idx_ia', 'parse_flags', 'roll_status', 'other_sources']

B = json.load(open(os.path.join(W, 'work', 'boies_mw.json'), encoding='utf8'))
by_unit = {}
for o in B:
    by_unit.setdefault(o['unit'], []).append(o)


def key(s):
    return re.sub(r'[^a-z]', '', (s or '').lower())


def initial(given):
    g = re.sub(r'[^A-Za-z ]', ' ', given or '').split()
    return g[0][0].lower() if g else ''


stats = {}
for u, (unit_id, regiment, slug) in UNIT.items():
    ents = by_unit.get(u, [])
    path = os.path.join(D, slug + '.csv')
    rows = []
    if os.path.exists(path):
        rows = list(csv.DictReader(open(path, encoding='utf8')))
    rows = [r for r in rows if r.get('section') != 'participant-only']   # idempotent: participant-only rows are regenerated below
    for r in rows:
        r.setdefault('other_sources', '')
        r.setdefault('age_as_printed', '')
        r.setdefault('muster_date_as_printed', '')
        r.setdefault('mustered_out_as_printed', '')
    idx = {}
    for i, r in enumerate(rows):
        nm = r['name_clean'] or ''
        sur = key(nm.split(',')[0]) if ',' in nm else key(nm.split(' ')[-1] if nm else '')
        giv = nm.split(',', 1)[1] if ',' in nm else ' '.join(nm.split(' ')[:-1])
        r['_sur'] = sur; r['_ini'] = initial(giv)
        idx.setdefault(sur[:3], []).append(i)
    matched = conflicted = added = ambiguous = 0
    for e in ents:
        s = key(e['surname']); ini = initial(e['given'])
        cands = []
        for i in idx.get(s[:3], []):
            r = rows[i]
            if r['_sur'] == s or difflib.SequenceMatcher(None, r['_sur'], s).ratio() >= 0.88:
                if r['_ini'] == ini or not ini or not r['_ini']:
                    if r['presence_label'] != 'Duplicate-Xref' and r['section'] != 'participant-only':
                        cands.append(i)
        if e['company']:
            c2 = [i for i in cands if rows[i]['company'].split('-')[0] == e['company']]
            if c2:
                cands = c2
            elif cands:
                cands = [i for i in cands if rows[i]['company'] in ('', 'UNASSIGNED', 'REC', 'FS', 'NCS')] or []
        loc = 'Boies 1913, IA rosterofsurvivor00boie djvu page %s: "%s"' % (e['page'], e['line'])
        if len(cands) == 1:
            r = rows[cands[0]]
            if r['other_sources']:
                r['other_sources'] += ' | '
            r['other_sources'] += 'BOIES-1913: ' + loc
            if r['presence_label'] == 'Unknown':
                r['presence_label'] = 'Present-Documented'
                r['roll_status'] = 'named-present'
                r['presence_basis'] = 'PART-LIST: named in the 1913 Michigan Gettysburg survivors roster (self-reported, checked by the compiler against war records for Michigan enlistees); roster row has no 30 June 1863 status. Prior basis: ' + r['presence_basis']
                matched += 1
            elif r['presence_label'] == 'Absent-Documented':
                r['presence_basis'] = 'CONFLICT (PLAN rule 10): ' + r['presence_basis'] + ' -- but the 1913 Boies survivors roster lists a man of this name, company and unit as a Gettysburg survivor (could be a different man of the same name, or the roster date is misread)'
                r['presence_label'] = 'Unknown'
                r['roll_status'] = 'contested'
                conflicted += 1
            else:
                r['presence_basis'] += ' | also named in Boies 1913'
                matched += 1
        else:
            note = 'ambiguous: %d roster rows match surname/initial' % len(cands) if len(cands) > 1 else ('no matching row in the unit roll we hold' if rows else 'no full roll for this unit could be obtained from an open source')
            if len(cands) > 1:
                ambiguous += 1
            rows.append(dict(regiment=regiment, unit_id=unit_id, company=e['company'], section='participant-only', rank='', name_as_printed=e['surname'] + ', ' + e['given'], name_clean=e['surname'] + ', ' + e['given'],
                             residence=(e['line'].split(',')[-2].strip() if e['line'].count(',') >= 3 else ''), age_as_printed='', enlist_or_rank_date='', muster_date_as_printed='', mustered_out_as_printed='',
                             remarks_as_printed=e['line'], presence_label='Present-Documented',
                             presence_basis='PART-LIST: named in the 1913 Michigan Gettysburg survivors roster (self-reported; compiler checked war records for Michigan enlistees); ' + note,
                             dup_group='', source_id='MI-BOIES-1913', source_page_idx_ia=e['page'] or '', parse_flags='self-reported-1913;initials-only' + (';OCR-line' if not e['page'] else ''), roll_status='named-present', other_sources=''))
            added += 1
    for r in rows:
        r.pop('_sur', None); r.pop('_ini', None)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)
    stats[slug] = dict(boies_entries=len(ents), matched_to_roll_row=matched, conflicts=conflicted, ambiguous=ambiguous, participant_only_added=added)
json.dump(stats, open(os.path.join(W, 'work', 'boies_merge_stats.json'), 'w'), indent=1)
for k, v in stats.items():
    if v['boies_entries']:
        print(k, v)
