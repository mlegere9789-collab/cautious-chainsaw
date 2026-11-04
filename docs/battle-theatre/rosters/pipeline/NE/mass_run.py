import sys, re, json, csv, os, collections
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
import mass_parse as mp
import events as ev
from rosterlib import GB_START

OUT = f.DATA
UNITS = {  # unit_id -> (volume, key)
    'U-1MA': (1, 1, 'INF'), 'U-2MA': (1, 2, 'INF'), 'U-7MA': (1, 7, 'INF'), 'U-9MA': (1, 9, 'INF'), 'U-10MA': (1, 10, 'INF'),
    'U-12MA': (2, 12, 'INF'), 'U-13MA': (2, 13, 'INF'), 'U-15MA': (2, 15, 'INF'), 'U-16MA': (2, 16, 'INF'), 'U-18MA': (2, 18, 'INF'),
    'U-19MA': (2, 19, 'INF'), 'U-20MA': (2, 20, 'INF'), 'U-22MA': (2, 22, 'INF'),
    'U-28MA': (3, 28, 'INF'), 'U-32MA': (3, 32, 'INF'), 'U-33MA': (3, 33, 'INF'), 'U-37MA': (3, 37, 'INF'),
    'U-1MA-CAV': (6, 1, 'CAV'),
    'UNMAPPED-1MA-BTY': (5, 1, 'BAT'),
    'U-ART-C1MA': (5, 3, 'BAT'), 'U-ART-5MA': (5, 5, 'BAT'), 'U-ART-9MA': (5, 9, 'BAT'),
}
MA_SECTION_NAME = {'UNMAPPED-1MA-BTY': '1st Battery Massachusetts Volunteer Light Artillery (Battery A) UNMAPPED',
                   'U-ART-C1MA': '3rd Battery Massachusetts Volunteer Light Artillery (Battery C)',
                   'U-ART-5MA': '5th Battery Massachusetts Volunteer Light Artillery (Battery E)',
                   'U-ART-9MA': '9th Battery Massachusetts Volunteer Light Artillery'}


def oob_units():
    import glob
    d = {}
    base = r'C:\Users\mlege\gettysburg-map\baseline\dist\data\oob'
    for fn in glob.glob(base + r'\union_*.json'):
        j = json.load(open(fn, encoding='utf-8'))
        def walk(o):
            if isinstance(o, dict):
                uid = o.get('regiment_id') or o.get('battery_id')
                if uid and 'designation' in o:
                    d[uid] = o
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(j)
    return d


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def rank_class(r):
    x = r.lower()
    if re.search(r'colonel|col\.|major|maj\.', x) and 'sergt' not in x and 'serg' not in x:
        return 'field'
    if re.search(r'adjt|adjutant|surg|chaplain|q(r|u)\.? ?m(aster)?|quartermaster|commissary|hosp|steward|asst', x) and not re.search(r'sergt|serg', x):
        return 'staff'
    if re.search(r'capt|lieut|lt\.', x):
        return 'company_officer'
    if re.search(r'serg|corp', x):
        return 'nco'
    if re.search(r'music|bugler|drummer|fifer', x):
        return 'musician'
    if re.search(r'priv', x):
        return 'private'
    return 'other'


def clean_name(n):
    n = re.sub(r'\s+', ' ', n).strip(' ,.*•')
    if ',' in n:
        a, b = n.split(',', 1)
        return (b.strip(' ,') + ' ' + a.strip()).strip()
    return n


def norm_key(n):
    c = clean_name(n)
    parts = c.split()
    return re.sub(r'[^a-z]', '', c.lower())


def surname_given(n):
    n = re.sub(r'\s+', ' ', n).strip(' ,.*•')
    if ',' in n:
        a, b = n.split(',', 1)
        return a.strip(), b.strip(' ,')
    p = n.split()
    return (p[-1], ' '.join(p[:-1])) if p else ('', '')


def parse_body(body):
    body = re.sub(r'\s+', ' ', body).strip()
    res = ''
    m = re.match(r'(?:Res|Eres|Rcs|Rea|Hcs|Bea|P\.es|Re8)[\.\-,:]?\s*(.*?)(?:\s*[;:]\s*|$)(.*)$', body)
    rest = body
    if m:
        res, rest = m.group(1).strip(' ,'), m.group(2)
    age = None
    segs = [x.strip() for x in rest.split(';')]
    for sg in segs[:3]:
        mm = re.fullmatch(r'(?:age\s*)?(\d{1,2})\s*', sg)
        if mm:
            age = int(mm.group(1))
            break
    return res, age, rest


def build_unit(uid, oob, out_rows):
    vol, key, kind = UNITS[uid]
    seg = mp.segment(vol, {(key, kind): uid})
    lines = seg.get(uid, [])
    ents = mp.entries_of(lines, flat=(kind == 'BAT'))
    des = MA_SECTION_NAME.get(uid) or oob[uid]['designation']
    rows = []
    for k, e in enumerate(ents):
        res, age, rest = parse_body(e['text'])
        facts = ev.analyse(rest)
        rows.append(dict(e=e, res=res, age=age, rest=rest, facts=facts, idx=k))
    # pairing of intra-regiment transfers
    by = collections.defaultdict(list)
    for r in rows:
        by[norm_key(r['e']['name'])].append(r)
    for r in rows:
        r['xref'] = False
        r['partnerE'] = None
        r['dup'] = None
    gid = 0
    for nk, grp in by.items():
        if len(grp) > 1:
            outs = [g for g in grp if g['facts']['intra_out'] is not None]
            ins = [g for g in grp if g['facts']['intra_in']]
            gid += 1
            tag = 'ma%s-%d' % (uid.split('-')[1], gid)
            for g in grp:
                g['dup'] = tag
            if outs and ins:
                eo = [o['facts']['E'] for o in outs if o['facts']['E']]
                for i_ in ins:
                    if eo:
                        i_['partnerE'] = min(eo)
                for o in outs:
                    d = o['facts']['intra_out']
                    if d is True or d < GB_START:
                        o['xref'] = True
    out = []
    for r in rows:
        e, facts = r['e'], r['facts']
        lab, rs, code, words, flags = ev.label(facts, r['partnerE'])
        flags = list(flags)
        if r['xref'] and lab != 'Present-Documented':
            lab, rs, code = 'Duplicate-Xref', 'xref', 'TRANSF-WITHIN-REGT'
            words = 'transferred to another company of this regiment before the battle; presence is judged on the destination row (dup_group %s)' % r['dup']
        if r['dup'] and 'duplicate-group' not in flags:
            flags.append('duplicate-group')
        nm = e['name']
        if len(re.findall(r'Rea\.|Hcs|\bBea\b|P\.es|\b1S\d\d|\bISo|\beoL|\booL|\benL\b|\bAng\.|Pett\.', e['text'])) >= 1 or len(re.findall(r'[^\w\s\.,;:\'"()\-&#/]', e['text'])) >= 3:
            flags.append('ocr-poor-text')
        if re.match(r'^[A-Z][a-z]+\. [A-Z]', nm):
            flags.append('name-punct')
        if re.search(r'[^A-Za-z\.\,\s\'\-]', nm) or len(nm) < 5:
            flags.append('name-garbled')
        out.append(dict(
            unit_id=uid, regiment=des, company=e['co'], section=e['sec'], name_as_printed=re.sub(r'\s+', ' ', nm),
            name_clean=clean_name(nm), rank_as_printed=re.sub(r'\s+', ' ', e['rank']), rank_class=rank_class(e['rank']),
            age=r['age'] if r['age'] is not None else '', residence=r['res'],
            enlisted_or_commissioned=(facts['E'].isoformat() + ('' if facts['E_prec'] == 'day' else ' (month only)')) if facts['E'] else '',
            remarks_as_printed=re.sub(r'\s+', ' ', e['text']),
            presence_label=lab, presence_basis=words, basis_code=code, roll_status=rs,
            evidence_label={'Present-Documented': 'Documented', 'Absent-Documented': 'Documented'}.get(lab, 'Unknown'),
            dup_group=r['dup'] or '', source_id='MA-SSM-1931-v%d' % vol, source_locator='vol %d, book p.%s' % (vol, e['page']),
            parse_flags=';'.join(flags)))
    return out


COLS = ['unit_id', 'regiment', 'company', 'section', 'name_as_printed', 'name_clean', 'rank_as_printed', 'rank_class', 'age', 'residence',
        'enlisted_or_commissioned', 'remarks_as_printed', 'presence_label', 'presence_basis', 'basis_code', 'roll_status', 'evidence_label',
        'dup_group', 'source_id', 'source_locator', 'parse_flags']


def write_csv(path, rows):
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)


if __name__ == '__main__':
    oob = oob_units()
    only = sys.argv[1:] or list(UNITS)
    os.makedirs(os.path.join(OUT, 'massachusetts'), exist_ok=True)
    allstats = {}
    for uid in only:
        rows = build_unit(uid, oob, None)
        des = MA_SECTION_NAME.get(uid) or oob[uid]['designation']
        p = os.path.join(OUT, 'massachusetts', slug(des) + '.csv')
        write_csv(p, rows)
        c = collections.Counter(r['presence_label'] for r in rows)
        rs = collections.Counter(r['roll_status'] for r in rows)
        allstats[uid] = dict(rows=len(rows), labels=dict(c), roll_status=dict(rs), file=os.path.relpath(p, OUT).replace(chr(92), '/'))
        print(uid, len(rows), dict(c), dict(rs))
    json.dump(allstats, open(os.path.join(f.CACHE, 'ma_run_stats_%s.json' % ('all' if not sys.argv[1:] else 'part')), 'w'), indent=1)
