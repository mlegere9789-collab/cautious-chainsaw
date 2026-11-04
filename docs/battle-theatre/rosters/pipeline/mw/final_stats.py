"""Add the 6th Wisconsin pilot rows to the MW set (unified columns) and write data/MW/stats.json."""
import csv, json, os, glob
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'MW')
PILOT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'pilot', '6th-wisconsin.csv')
COLS = ['regiment', 'unit_id', 'company', 'section', 'rank', 'name_as_printed', 'name_clean', 'residence', 'age_as_printed', 'enlist_or_rank_date', 'muster_date_as_printed', 'mustered_out_as_printed', 'remarks_as_printed', 'presence_label', 'presence_basis', 'dup_group', 'source_id', 'source_page_idx_ia', 'parse_flags', 'roll_status', 'other_sources']

rows = list(csv.DictReader(open(PILOT, encoding='utf8')))
KEEP6 = bool(os.environ.get('MW_KEEP_6WI'))   # audit: keep the repaired 6th Wisconsin CSV instead of re-copying the pilot
with open(os.devnull if KEEP6 else os.path.join(D, '6th-wisconsin-infantry.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=COLS, extrasaction='ignore')
    w.writeheader()
    for r in rows:
        w.writerow(dict(regiment='6th Wisconsin Infantry', unit_id='U-6WI', company=r['company'], section=r['section'], rank='', name_as_printed=r['name_as_printed'], name_clean=r['name_clean'],
                        residence=r['residence'], enlist_or_rank_date=r['enlist_or_rank_date'], remarks_as_printed=r['remarks_as_printed'], presence_label=r['presence_label'],
                        presence_basis=r['presence_basis'], dup_group=r['dup_group'], source_id=r['source_id'], source_page_idx_ia=r['source_page_idx_ia'], parse_flags=r['parse_flags'],
                        roll_status=r['roll_status'], other_sources='copied unchanged from rosters/pilot/6th-wisconsin.csv (pilot, 19 Oct 2026)'))

oob = {}
for fn in glob.glob(os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob', 'union_regiments*.json')) + [os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob', 'union_cavalry_artillery.json')]:
    d = json.load(open(fn, encoding='utf8'))
    for k, v in d.items():
        if isinstance(v, list):
            for r in v:
                if isinstance(r, dict) and r.get('regiment_id'):
                    oob[r['regiment_id']] = (r.get('designation'), r.get('strength'), r.get('casualties'))
MIDOC = {'U-1MI': 261, 'U-3MI': 286, 'U-4MI': 403, 'U-5MI': 283, 'U-7MI': 165, 'U-16MI': 365, 'U-24MI': 496}
units = {}
tot = Counter()
for p in sorted(glob.glob(os.path.join(D, '*.csv'))):
    if os.path.basename(p).startswith('AUDIT'):
        continue
    rs = list(csv.DictReader(open(p, encoding='utf8')))
    uid = rs[0]['unit_id']
    lab = Counter(r['presence_label'] for r in rs)
    roll = Counter(r['roll_status'] for r in rs)
    named = [r for r in rs if r['name_clean'].strip()]
    pd = sum(1 for r in rs if r['presence_label'] == 'Present-Documented')
    persons = len([r for r in rs if r['presence_label'] != 'Duplicate-Xref' and r['name_clean'].strip()])
    s = dict(slug=os.path.basename(p)[:-4], rows=len(rs), rows_with_name=len(named), rows_name_not_in_ocr=len(rs) - len(named), name_flagged=sum(1 for r in rs if r['parse_flags']),
             labels=dict(lab), roll_status=dict(roll), present_documented=pd, oob_strength=oob.get(uid, (None, None, None))[1], oob_casualties=oob.get(uid, (None, None, None))[2],
             michigan_monument_effective_strength=MIDOC.get(uid), sources=sorted(set(r['source_id'] for r in rs)))
    s['full_roll'] = not all(r['section'] == 'participant-only' for r in rs)
    units[uid] = s
    tot.update(lab)
out = dict(family='MW', units_in_oob=len(units) and 26, units_with_names=sum(1 for u in units.values() if u['rows_with_name'] > 0), units_with_full_roll=sum(1 for u in units.values() if u['full_roll']),
           rows=sum(u['rows'] for u in units.values()), names=sum(u['rows_with_name'] for u in units.values()), rows_name_not_in_ocr=sum(u['rows_name_not_in_ocr'] for u in units.values()),
           share_by_label={k: round(v / sum(tot.values()), 4) for k, v in tot.items()}, labels_total=dict(tot), units=units)
unread = sum(u['roll_status'].get('unreadable-or-ambiguous', 0) + u['rows_name_not_in_ocr'] for u in units.values())
out['unreadable_share'] = round(sum(u['roll_status'].get('unreadable-or-ambiguous', 0) for u in units.values()) / out['rows'], 4)
json.dump(out, open(os.path.join(D, 'stats.json'), 'w', indent=1) if False else open(os.path.join(D, 'stats.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'units'}, indent=1))
for u, s in units.items():
    print(u, s['rows'], s['rows_with_name'], s['present_documented'], s['oob_strength'], s['full_roll'])
