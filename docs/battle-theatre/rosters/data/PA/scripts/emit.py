"""Emit per-unit CSVs from records. usage: emit.py [unit_id ...]  (default: all mapped units whose volumes have records)
Mapping of OOB units to Bates regiment numbers lives in unitmap.py."""
import sys, os, json, csv, re, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
import classify as K
from unitmap import UNITMAP

_op = os.path.join(C.DATA, 'datecol_second_ocr.json')
OCRMAP = json.load(open(_op)) if os.path.exists(_op) else {}
COLS = ['unit_id', 'regiment', 'company', 'section', 'name_as_printed', 'name_clean', 'rank_as_printed', 'rank_carried', 'officer', 'muster_date',
        'remarks_as_printed', 'presence_label', 'roll_status', 'basis_code', 'presence_basis', 'events', 'dup_group', 'source_id',
        'source_page_idx_ia', 'parse_flags']
RANKDO = re.compile(r'^\W*(?:\.{0,4}\s*)?(do|d0|dc|ditto)\b', re.I)


def load_vol(vol):
    # AUDIT R7: records after the boundary repair (scripts/audit_boundary.py) when present
    p = os.path.join(C.CACHE, 'derived', vol + '.records_audit.json')
    if not os.path.exists(p):
        p = os.path.join(C.CACHE, 'derived', vol + '.records.json')
    return json.load(open(p)) if os.path.exists(p) else []


def emit(unit_id, spec, cache):
    vol, n, svc = spec['vol'], spec['n'], spec.get('svc')
    recs = cache.setdefault(vol, load_vol(vol))
    sel = [r for r in recs if r['n'] == n and (svc is None or r['svc'] == svc or (svc == 'any'))]
    if spec.get('pages'):
        a, b = spec['pages']
        sel = [r for r in sel if a <= r['page'] <= b]
    if spec.get('companies'):
        sel = [r for r in sel if r['company'] in spec['companies']]
    if not sel:
        return None
    ident = {'01': 'historyofpennsyl01bate', '02': 'historyofpennsyl02bate', '03': 'historyofpennsyl03bate', '04': 'historyofpennsyl04bate', '00': 'historyofpennsyl00bate'}[vol]
    # muster-date year map for this unit: (month, day) -> year when >=5 rows read it with a year and >=90 percent agree
    ymap = collections.defaultdict(collections.Counter)
    import dates as D
    for r in sel:
        dt = re.sub(r"^(?:\d\s+)", '', r['date'].strip())
        dt = re.sub(r"(?:\s+\d)$", '', dt)
        for x in D.find_dates(dt):
            if x[0] and x[1] == 'day':
                ymap[(x[5], x[6])][x[4]] += 1
    corrob = collections.Counter()
    for r in sel:
        dt = re.sub(r"^(?:\d\s+)", '', r['date'].strip())
        dt = re.sub(r"(?:\s+\d)$", '', dt)
        for x in D.find_dates(dt):
            if x[0] and x[1] == 'day':
                corrob[x[0]] += 1
                break
    # AUDIT R1: month-day of the unit's own muster-out with company in 1864 or later (year-misread detector)
    mo_c = collections.Counter()
    for r in sel:
        for sg in K.split_segments(re.sub(r'\s+', ' ', r['rem'])):
            if D.verb_of(sg) == 'mo':
                for x in D.find_dates(sg):
                    if x[0] and x[0].year >= 1864:
                        mo_c[(x[0].month, x[0].day)] += 1
                        break
    mo_modal = {k for k, v in mo_c.items() if v >= 8}
    infer = {}
    for k, c in ymap.items():
        tot = sum(c.values())
        y, ny = c.most_common(1)[0]
        if tot >= 5 and ny / tot >= 0.9:
            infer[k] = y
    rows = []
    last_rank = {}
    ocrmap = OCRMAP
    for r in sel:
        co = r['company']
        if co == '?':
            co = 'FS' if not any(x['company'] == 'FS' for x in sel) else 'FS?'
        rk = r['rank'].strip()
        carried = ''
        if RANKDO.match(rk) or (not rk and False):
            carried = last_rank.get(co, '')
        else:
            if rk:
                last_rank[co] = re.sub(r'[\.\s]+$', '', rk)
        r = dict(r)
        r['date_ocr'] = (ocrmap.get('%s|%d|%d' % (vol, r['page'], r['y'])) or {}).get('ocr')
        res = K.classify(r, n, infer=infer, corrob=corrob, mo_modal=mo_modal)
        flags = res['parse_flags'].split(';') if res['parse_flags'] else []
        if r.get('cflag'):
            flags.append(r['cflag'])
        if co == 'FS?':
            flags.append('section-heading-missing')
        if RANKDO.match(rk) and not carried:
            flags.append('rank-ditto-unresolved')
        rows.append(dict(unit_id=unit_id, regiment=spec['label'], company=co, section=r['section'], name_as_printed=r['name'], name_clean=res['name_clean'],
                         rank_as_printed=rk, rank_carried=carried, officer='y' if (res['is_officer'] or K.OFFICER.match(carried)) else 'n',
                         muster_date=res['muster_date'], remarks_as_printed=re.sub(r'\s+', ' ', r['rem']).strip(), presence_label=res['presence_label'],
                         roll_status=res['roll_status'], basis_code=res['basis_code'], presence_basis=res['presence_basis'], events=res['events'],
                         dup_group='', source_id=spec.get('source_id', 'BATES-1869-v' + vol), source_page_idx_ia=r['page'],
                         parse_flags=';'.join(f for f in flags if f)))
    # AUDIT R9: a run of 60 or more rows labelled BAND is a company whose heading was read as a band heading (the unit has 20 or fewer musicians)
    LET = 'ABCDEFGHIKLMNOP'
    i = 0
    while i < len(rows):
        if rows[i]['company'] == 'BAND':
            j = i
            while j + 1 < len(rows) and rows[j + 1]['company'] == 'BAND':
                j += 1
            if j - i + 1 >= 60:
                x = rows[i - 1]['company'] if i > 0 else None
                z = rows[j + 1]['company'] if j + 1 < len(rows) else None
                if x in LET and z in LET and len(x) == 1 and len(z) == 1:
                    gap = LET[LET.index(x) + 1:LET.index(z)] if LET.index(z) > LET.index(x) else ''
                    if not gap:
                        newc, fl = x, 'band-heading-read-as-continuation-of-%s' % x
                    elif len(gap) == 1 and j - i + 1 <= 150:
                        newc, fl = gap, 'company-from-sequence-band-heading-misread'
                    else:
                        newc, fl = (x + '/' + gap + '?') if len(gap) == 1 else ('%s-%s?' % (x, gap[-1])), 'company-unresolved-band-heading-misread'
                    for k in range(i, j + 1):
                        rows[k]['company'] = newc
                        rows[k]['parse_flags'] = (rows[k]['parse_flags'] + ';' if rows[k]['parse_flags'] else '') + fl
            i = j + 1
        else:
            i += 1
    # duplicate groups: same normalised name within the unit
    def key(x):
        s = re.sub(r'[^a-z ]', '', x['name_clean'].lower())
        return re.sub(r'\s+', ' ', s).strip()
    grp = collections.defaultdict(list)
    for i, x in enumerate(rows):
        k = key(x)
        if k and len(k) > 5:
            grp[k].append(i)
    g = 0
    for k, idx in grp.items():
        if len(idx) > 1:
            g += 1
            for i in idx:
                rows[i]['dup_group'] = 'd%d' % g
                if 'intra-regiment-transfer' in rows[i]['parse_flags']:
                    pass
    return rows


def main():
    want = sys.argv[1:] or list(UNITMAP)
    out_dir = os.path.join(C.DATA, 'units')
    os.makedirs(out_dir, exist_ok=True)
    cache = {}
    summary = {}
    for uid in want:
        spec = UNITMAP[uid]
        if spec.get('skip'):
            continue
        rows = emit(uid, spec, cache)
        if rows is None:
            print(uid, 'no records')
            continue
        fn = os.path.join(out_dir, uid + '.csv')
        with open(fn, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=COLS)
            w.writeheader()
            w.writerows(rows)
        c = collections.Counter(r['presence_label'] for r in rows)
        summary[uid] = dict(rows=len(rows), labels=dict(c))
        print(uid, len(rows), dict(c))
    json.dump(summary, open(os.path.join(C.DATA, 'emit_summary.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
