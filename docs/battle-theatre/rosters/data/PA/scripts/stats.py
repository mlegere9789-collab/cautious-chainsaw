"""Per-family statistics, per-unit reconciliation, structural QA and 30-row seeded samples. Writes:
 data/PA/stats.json, data/PA/reconciliation.csv, data/PA/qa/<unit>_sample30.csv, data/PA/qa/structural_qa.csv"""
import sys, os, csv, json, random, collections, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
from unitmap import UNITMAP, DETACH
import dates as D

units = json.load(open(os.path.join(C.DATA, 'units.json')))
oob = {u['unit_id']: u for u in units}
insc = list(csv.DictReader(open(os.path.join(C.DATA, 'strength_present_inscriptions.csv'), encoding='utf-8')))
sdoc = collections.defaultdict(list)
for r in insc:
    if r['unit_id'] != 'UNMAPPED' and r['total']:
        sdoc[r['unit_id']].append(int(r['total']))
os.makedirs(os.path.join(C.DATA, 'qa'), exist_ok=True)
random.seed(20261030)
total = collections.Counter()
labels = collections.Counter()
roll = collections.Counter()
per = {}
recon = []
struct = []
for uid in UNITMAP:
    fn = os.path.join(C.DATA, 'units', uid + '.csv')
    if not os.path.exists(fn):
        continue
    rows = list(csv.DictReader(open(fn, encoding='utf-8')))
    lab = collections.Counter(r['presence_label'] for r in rows)
    rs = collections.Counter(r['roll_status'] for r in rows)
    fl = collections.Counter()
    for r in rows:
        for f in (r['parse_flags'] or '').split(';'):
            if f:
                fl[f.split(':')[0]] += 1
    gett_not_present = 0
    for r in rows:
        if D.gett_positions(r['remarks_as_printed']) and r['presence_label'] != 'Present-Documented':
            gett_not_present += 1
    n = len(rows)
    per[uid] = dict(rows=n, labels=dict(lab), roll_status=dict(rs), flags=dict(fl), gettysburg_token_but_not_present=gett_not_present,
                    unreadable_share=round(rs.get('unreadable-or-ambiguous', 0) / n, 4), in_oob=uid in oob)
    total.update(lab); roll.update(rs)
    sd = sdoc.get(uid, [])
    s_oob = oob[uid]['strength'] if uid in oob else None
    npd = lab.get('Present-Documented', 0)
    status = 'No S_doc found'
    if sd:
        s = max(sd)
        status = 'Short' if npd < s else 'Contested'
        if len(sd) > 1:
            status += ' (two inscription values %s: Contested between them)' % '/'.join(map(str, sd))
        if s_oob and abs(s - s_oob) > 0.03 * s:
            status += '; inscription vs repository OOB differ by %.0f%%' % (100.0 * (s - s_oob) / s_oob)
    recon.append(dict(unit_id=uid, S_doc_inscription_total='|'.join(map(str, sd)), S_oob=s_oob, N_present_documented=npd,
                      N_on_roll_undetermined=rs.get('on-roll-undetermined', 0), N_unreadable_or_ambiguous=rs.get('unreadable-or-ambiguous', 0),
                      N_absent_documented=lab.get('Absent-Documented', 0), status=status))
    # structural QA
    struct.append(dict(unit_id=uid, rows=n, name_missing=fl.get('name-missing', 0), name_garbled=fl.get('name-garbled', 0), date_missing=fl.get('date-missing', 0),
                       no_month=fl.get('no-month-in-date-column', 0), company_inferred=sum(1 for r in rows if 'company-inferred' in r['parse_flags'] or 'company-heading-skipped' in r['parse_flags']),
                       section_heading_missing=fl.get('section-heading-missing', 0), companies=len({r['company'] for r in rows}),
                       gettysburg_token_but_not_present=gett_not_present, unreadable_share=per[uid]['unreadable_share']))
    # 30-row seeded sample (stratified: 10 Present-Documented if available, 10 Absent, 10 Unknown)
    samp = []
    for lb in ('Present-Documented', 'Absent-Documented', 'Unknown'):
        pool = [r for r in rows if r['presence_label'] == lb]
        samp.extend(random.sample(pool, min(10, len(pool))))
    if len(samp) < 30:
        rest = [r for r in rows if r not in samp]
        samp.extend(random.sample(rest, min(30 - len(samp), len(rest))))
    with open(os.path.join(C.DATA, 'qa', uid + '_sample30.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) + ['qa_reader_name_ok', 'qa_reader_date_ok', 'qa_reader_label_ok'])
        w.writeheader()
        for r in samp:
            r = dict(r); r.update(qa_reader_name_ok='', qa_reader_date_ok='', qa_reader_label_ok='')
            w.writerow(r)
with open(os.path.join(C.DATA, 'reconciliation.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(recon[0].keys())); w.writeheader(); w.writerows(recon)
with open(os.path.join(C.DATA, 'qa', 'structural_qa.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(struct[0].keys())); w.writeheader(); w.writerows(struct)
oob_ids = list(oob)
mapped = [u for u in oob_ids if u in per]
det_ok = [u for u in DETACH if DETACH[u] in per]
names = sum(p['rows'] for p in per.values())
unread = roll.get('unreadable-or-ambiguous', 0)
st = dict(family='PA', units_in_oob=len(oob_ids), units_with_names=len(mapped), detachment_units_covered_via_parent=len(det_ok),
          names=names, rows_unreadable_or_ambiguous=unread, unreadable_share=round(unread / names, 4),
          share_by_label={k: round(v / names, 4) for k, v in total.items()}, counts_by_label=dict(total), counts_by_roll_status=dict(roll),
          extra_units_not_in_oob=[u for u in per if not per[u]['in_oob']], units_in_oob_without_names=[u for u in oob_ids if u not in per and u not in DETACH],
          per_unit=per, generated='2026-10-30')
json.dump(st, open(os.path.join(C.DATA, 'stats.json'), 'w'), indent=1)
print({k: v for k, v in st.items() if k not in ('per_unit',)})
