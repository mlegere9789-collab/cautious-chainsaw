"""Write stats.json, README.md, progress.md, QA-SAMPLE.md and annotate acquired.json for the C-NCLA family. Run last."""
import json, os, sys, glob, csv, datetime, collections
sys.path.insert(0, os.path.dirname(__file__))
from ncla_common import DATA, load_acq, save_acq

nc = json.load(open(os.path.join(DATA, 'work', 'nc_stats.json'), encoding='utf-8'))
la = json.load(open(os.path.join(DATA, 'work', 'la_stats.json'), encoding='utf-8'))
meta = json.load(open(os.path.join(DATA, 'scripts', 'ia_meta_ncla.json'), encoding='utf-8'))
allu = {}
allu.update(nc)
allu.update(la)
tot = collections.Counter()
for v in allu.values():
    for k, n in v['labels'].items():
        tot[k] += n
    for k, n in v['roll_status'].items():
        tot['rs:' + k] += n
rows_total = sum(v['rows'] for v in allu.values())
garbled = sum(v['name_garbled_rows'] for v in allu.values())
excl = sum(v.get('excluded_unit_unresolved', 0) for v in allu.values())
stats = dict(
    family='C-NCLA', generated=datetime.date.today().isoformat(), units_in_oob=len(allu), units_with_names=sum(1 for v in allu.values() if v['rows'] > 0),
    names=rows_total, rows_excluded_unit_unresolved=excl, rows_withheld_no_name=sum(v.get('withheld_no_name', 0) for v in allu.values()),
    unreadable_or_ambiguous_rows=tot['rs:unreadable-or-ambiguous'], unreadable_share=round(tot['rs:unreadable-or-ambiguous'] / rows_total, 4),
    name_flagged_rows=garbled, name_flagged_share=round(garbled / rows_total, 4),
    share_by_label={k: round(tot[k] / rows_total, 4) for k in ['Present-Documented', 'Absent-Documented', 'Unknown']},
    counts_by_label={k: tot[k] for k in ['Present-Documented', 'Absent-Documented', 'Unknown']},
    counts_by_roll_status={k[3:]: v for k, v in tot.items() if k.startswith('rs:')},
    by_state=dict(north_carolina=dict(units=len(nc), rows=sum(v['rows'] for v in nc.values())), louisiana=dict(units=len(la), rows=sum(v['rows'] for v in la.values()))),
    units=allu)
json.dump(stats, open(os.path.join(DATA, 'stats.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

# ---- acquired.json annotations ----
a = load_acq()
for b in a['blocked']:
    if 'rosterofnorthcar04moor_djvu.xml' in b.get('url', '') and b.get('status') == 500:
        b['note'] = 'transient HTTP 500 from the Internet Archive file server (not a bot block, not a terms wall); the same URL was fetched successfully on retry and is in files[]'
a['robots_txt'] = dict(url='https://archive.org/robots.txt', file='archive_robots.txt', rule='User-agent: * Disallow: /control/ and /report/ only; every request made was a plain GET of /download/ files or /metadata/ or advancedsearch, 2 s or more apart, no login, no cookies, no key')
a['items'] = {i: dict(title=m.get('title'), volume=m.get('volume'), possible_copyright_status=m.get('cr'), access_restricted_item=m.get('restricted'), collections=m.get('coll')) for i, m in meta.items()}
a['total_bytes'] = sum(f['bytes'] for f in a['files'])
a['budget_note'] = 'family budget 1.5 GB; used %.0f MB' % (a['total_bytes'] / 1e6)
a['rights_note'] = ('Moore 1882 (published 1882) and Booth 1920 are US publications more than 100 years old: public domain by age. IA metadata: Moore v1 NOT_IN_COPYRIGHT, '
                    'Moore v3/v4 state-library public-domain statement, Moore v2 and the Emory copies carry no flag; Booth items carry no flag. None is access-restricted (lending) on IA.')
save_acq(a)

# ---- per-unit table ----
def lab(v, k):
    return v['labels'].get(k, 0)

lines = ['| unit_id | designation | source | rows | Present-Doc. | Absent-Doc. | Unknown | name-flagged | OOB strength |', '|---|---|---|---|---|---|---|---|---|']
for u, v in allu.items():
    lines.append(f"| {u} | {v['designation']} | {v.get('source') if v['state']=='North Carolina' else 'Booth 1920'} | {v['rows']} | {lab(v,'Present-Documented')} | {lab(v,'Absent-Documented')} | {lab(v,'Unknown')} | {v['name_garbled_rows']} | {v.get('oob_strength')} |")
table = '\n'.join(lines)
open(os.path.join(DATA, 'unit-table.md'), 'w', encoding='utf-8').write(table + '\n')
print(json.dumps({k: stats[k] for k in ['units_in_oob', 'units_with_names', 'names', 'unreadable_share', 'name_flagged_share', 'share_by_label', 'rows_excluded_unit_unresolved']}, indent=1))
