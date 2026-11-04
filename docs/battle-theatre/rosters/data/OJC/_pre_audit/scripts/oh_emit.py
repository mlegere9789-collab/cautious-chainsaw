import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re, datetime, collections
from ojc_common import *
import lab, emit
from oh_parse import UNITS

SRCIDS = {7: 'OH-ROSTER-1886-v7', 2: 'OH-ROSTER-1886-v2', 3: 'OH-ROSTER-1886-v3', 5: 'OH-ROSTER-1886-v5', 6: 'OH-ROSTER-1886-v6', 8: 'OH-ROSTER-1886-v8', 10: 'OH-ROSTER-1886-v10', 11: 'OH-ROSTER-1886-v11'}


def first_date(txt):
    for d in lab.find_dates(txt):
        if d['year'] and d['month']:
            dt = d['date']; partial = False
            if dt is None:
                if d['year'] == 1863 and d['month'] == 7: continue
                dt = datetime.date(d['year'], d['month'], 15); partial = True
            return dt, partial
    return None, False


def norm_rows(rs):
    out = []
    for r in rs:
        flags = []
        enl, partial = first_date(r['date'])
        note = ''
        if partial: flags.append('enlist-day-not-legible'); note = 'day not legible'
        if not r['name'].strip():
            flags.append('name-missing-in-text-layer')
        rank = r['rank']
        officer = bool(emit.OFFICER_RANK.match(rank.strip())) or r['company'] in ('FS', 'NCS') and r['section'] == 'staff'
        out.append(dict(company=r['company'], section=r['section'], rank=rank, name=r['name'], age=r['age'], res='',
                        enl_text=r['date'], enl=enl, enl_note=note, enl_ok=not officer, rem=re.sub(r'\s+', ' ', r['rem']).strip(), page=r['page'], flags=flags))
    return out


def slug(lab_):
    return re.sub(r'[^a-z0-9]+', '-', lab_.lower().replace('infantry', 'ohio').replace('ohio ohio', 'ohio')).strip('-')


if __name__ == '__main__':
    R = json.load(open(os.path.join(CACHE, 'oh_rows.json')))
    allstats = {}
    for uid, lab_, vol, num, kind in UNITS:
        rs = [r for r in R if r['unit'] == uid]
        if not rs: continue
        if uid == 'U-ART-1OH':
            for bl, bid in (('H', 'U-ART-H1OH'), ('I', 'U-ART-I1OH'), ('K', 'U-ART-K1OH'), ('L', 'U-ART-L1OH')):
                rb = [r for r in rs if r['company'] == bl]
                nm = 'Battery %s, 1st Ohio Light Artillery' % bl
                out, st = emit.process(norm_rows(rb), bid, nm, 'battery-%s-1st-ohio-light-artillery' % bl.lower(), SRCIDS[vol])
                allstats[bid] = st
                print(bid, st['rows'], st['labels'], st['unreadable_share'], st['name_flagged_rows'])
            continue
        out, st = emit.process(norm_rows(rs), uid, lab_, emit.slug(lab_.replace(' Infantry', '')), SRCIDS[vol])
        allstats[uid] = st
        print(uid, st['rows'], st['labels'], st['unreadable_share'], st['name_flagged_rows'])
    json.dump(allstats, open(os.path.join(CACHE, 'oh_stats.json'), 'w'), indent=1)
