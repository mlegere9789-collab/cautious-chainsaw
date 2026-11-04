import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re, datetime, collections
from ojc_common import *
import lab, emit

R = json.load(open(os.path.join(CACHE, 'nj_rows.json')))
SRC = 'NJ-STRYKER-1876'
SRCV2 = 'NJ-STRYKER-1876-v2'
LAB = {}
SLUG = {'U-1NJ-1': '1st-new-jersey', 'U-2NJ': '2nd-new-jersey', 'U-3NJ': '3rd-new-jersey', 'U-4NJ': '4th-new-jersey', 'U-5NJ': '5th-new-jersey',
        'U-6NJ': '6th-new-jersey', 'U-7NJ': '7th-new-jersey', 'U-8NJ': '8th-new-jersey', 'U-11NJ': '11th-new-jersey', 'U-12NJ': '12th-new-jersey',
        'U-13NJ': '13th-new-jersey', 'U-23NJ': '23rd-new-jersey', 'U-1NJ-CAV': '1st-new-jersey-cavalry', 'U-ART-B1NJ': 'battery-b-1st-new-jersey-artillery'}


def first_date(txt):
    best = None
    for d in lab.find_dates(txt):
        if d['year'] and d['month']:
            dt = d['date']
            partial = False
            if dt is None:
                if d['year'] == 1863 and d['month'] == 7:
                    continue
                dt = datetime.date(d['year'], d['month'], 15); partial = True
            return dt, partial
    return None, False


DITTO = re.compile(r"^[\"'“”‘’„`,.:;»«\s\-_|]*$")


def norm_rows(rs):
    out = []
    prev = None   # (enl, partial, text, company, section)
    for r in rs:
        flags = []
        enl, partial = first_date(r['enr'] + ' ' + r['mus'])
        etxt = (r['enr'] + ' ' + r['mus']).strip()
        if enl is None and etxt and DITTO.match(etxt) and prev and prev[3] == r['company'] and prev[4] == r['section']:
            enl, partial = prev[0], prev[1]
            flags.append('enlist-date-ditto-resolved')
        elif enl is None and not etxt:
            flags.append('enlist-cell-blank-in-text-layer')
        prev = (enl, partial, etxt, r['company'], r['section']) if enl is not None else (prev if prev and prev[3] == r['company'] and prev[4] == r['section'] else None)
        note = ''
        if partial:
            flags.append('enlist-day-not-legible'); note = 'day not legible'
        nm = r['name']
        m2 = re.match(r"^((?:[0-9IlOo\|\.\-:;,]{1,4}\s+)+)(?=\S)", nm)
        if m2 and re.search(r'[A-Za-z]{2}', nm[m2.end():]):
            nm = nm[m2.end():]
            flags.append('leading-row-number-removed')
        if not nm.strip():
            flags.append('name-missing-in-text-layer')
        r = dict(r, name=nm)
        rank = r['rank']
        officer = bool(emit.OFFICER_RANK.match(rank.strip())) or r['company'] in ('FS',)
        ok = not officer
        extra = ''
        if r['unit'] == 'U-23NJ':
            for d in lab.find_dates(r['per']):
                if d['date'] == datetime.date(1863, 6, 27):
                    extra = "; mustered out June 27, 1863 (from the printed must'd-out column)"
                    flags.append('must-d-out-column-used'); flags.append('contested-oob-lists-unit-at-gettysburg')
                    break
        if r['unit'] == 'U-23NJ' and not extra:
            flags.append('contested-oob-lists-unit-at-gettysburg')
        out.append(dict(label_extra=extra, company=r['company'], section=r['section'], rank=rank, name=r['name'], age='', res='',
                        enl_text=(r['enr'] + ' | ' + r['mus']).strip(' |'), enl=enl, enl_note=note, enl_ok=ok, rem=re.sub(r'\s+', ' ', r['rem']).strip(),
                        page=r['page'], flags=flags))
    return out


if __name__ == '__main__':
    allstats = {}
    for uid, slug in SLUG.items():
        rs = [r for r in R if r['unit'] == uid]
        lab_ = rs[0]['regiment']
        rows = norm_rows(rs)
        out, st = emit.process(rows, uid, lab_, slug, SRCV2 if uid in ('U-1NJ-CAV', 'U-ART-B1NJ') else SRC)
        allstats[uid] = st
        print(uid, st['rows'], st['labels'], st['unreadable_share'], st['name_flagged_rows'])
    json.dump(allstats, open(os.path.join(CACHE, 'nj_stats.json'), 'w'), indent=1)
