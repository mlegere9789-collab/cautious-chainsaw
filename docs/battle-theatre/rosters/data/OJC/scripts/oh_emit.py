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


ENL_STAFF = re.compile(r"Ser[\.,gj]*\s*Maj|Sergt?\.?\s*Maj|Q\.?\s*M\.?\s*S|Com\.?\s*Ser|Hos\w*\.?\s*St|H\.?\s*St|Prin\.?\s*Mus|Princ|D.?m\.?\s*Maj|Drum\s*Maj|Fife\s*Maj|Chief\s*(Bugler|Trumpeter)|Bugler|Saddler|Sergeant|Corporal|Private|Musician|Wagoner|Farrier|Blacksmith", re.I)
last_staff_rank = [None]


def norm_rows(rs):
    out = []
    last_staff_rank[0] = None
    for r in rs:
        flags = []
        enl, partial = first_date(r['date'])
        note = ''
        if partial: flags.append('enlist-day-not-legible'); note = 'day not legible'
        if not r['name'].strip():
            flags.append('name-missing-in-text-layer')
        if r.get('xflag'): flags.append(r['xflag'])
        if r.get('cflag'): flags.append(r['cflag'])
        rank = r['rank']
        officer = bool(emit.OFFICER_RANK.match(rank.strip())) or r['company'] in ('FS', 'NCS') and r['section'] == 'staff'
        # AUDIT: every Ohio page prints the column "Date of entering the service" for officers, staff and enlisted men alike (the first entry into
        # the service, not a rank date: Austin, Ser. Maj., Oct. 5, 1861, 'promoted from private Co. L Dec. 16, 1861'); PLAN 2.2 rule 8 reads
        # "enlisted OR COMMISSIONED in after 3 July 1863", so the printed date may drive ENL-AFTER for them too (the builder's rank-from-date caveat
        # came from the Wisconsin pilot and does not apply to this column header)
        if officer:
            flags.append('officer-or-staff-entering-date-used')
        officer = False
        lk = emit.leaked_remark(r['date'], r.get('per', ''))
        rem_txt = re.sub(r'\s+', ' ', (lk + ' ' + r['rem']) if lk else r['rem']).strip()
        if lk: flags.append('remark-start-in-date-or-period-cell')
        out.append(dict(company=r['company'], section=r['section'], rank=rank, name=r['name'], age=r['age'], res='',
                        enl_text=r['date'], enl=enl, enl_note=note, enl_ok=not officer, rem=rem_txt, page=r['page'], flags=flags))
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
