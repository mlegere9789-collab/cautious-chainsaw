import sys, csv, glob, os, json, collections, re
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
import mass_run as mr

oob = mr.oob_units()
NE_STATES = ('Maine', 'Massachusetts', 'New Hampshire', 'Vermont')
BATT = {'U-ART-5MA', 'U-ART-9MA', 'U-ART-MAF', 'U-ART-1NH', 'U-ART-2ME', 'U-ART-C1MA', 'U-ART-MAE'}
scope = {}
for uid, o in oob.items():
    if o.get('state') in NE_STATES or uid in BATT:
        scope[uid] = o
files = {}
for fn in glob.glob(os.path.join(f.DATA, '*', '*.csv')):
    if 'pilot-corrections' in fn:
        continue
    rows = list(csv.DictReader(open(fn, encoding='utf-8')))
    if not rows:
        continue
    files.setdefault(rows[0]['unit_id'], []).append((fn, rows))
units = {}
tot = collections.Counter()
for uid, o in sorted(scope.items()):
    st = dict(unit_id=uid, designation=o['designation'], oob_strength=o.get('strength'), oob_casualties=o.get('casualties'), covered=uid in files)
    if uid in files:
        fn, rows = files[uid][0]
        lab = collections.Counter(r['presence_label'] for r in rows)
        rs = collections.Counter(r['roll_status'] for r in rows)
        code = collections.Counter(r['basis_code'] for r in rows)
        n = len(rows)
        pd = lab.get('Present-Documented', 0)
        S = o.get('strength') or 0
        if S and abs(S - pd) <= 0.03 * S:
            recon = 'Reconciled'
        elif pd < S:
            recon = 'Short'
        else:
            recon = 'Contested'
        st.update(file=os.path.relpath(fn, f.DATA).replace(chr(92), '/'), rows=n, labels=dict(lab), roll_status=dict(rs), basis_codes=dict(code),
                  named_present=pd, on_roll_undetermined=rs.get('on-roll-undetermined', 0), absent_documented=lab.get('Absent-Documented', 0),
                  unreadable_or_ambiguous=rs.get('unreadable-or-ambiguous', 0), share_unreadable=round(rs.get('unreadable-or-ambiguous', 0) / n, 4),
                  share_by_label={k: round(v / n, 4) for k, v in lab.items()}, cas_remark_rows=code.get('CAS-REMARK', 0) + code.get('CAS-REMARK-DATE', 0),
                  name_garbled_rows=sum(1 for r in rows if 'name-garbled' in r['parse_flags']), reconciliation=recon,
                  reconciliation_note='S_doc = repository OOB strength (second-hand, Busey and Martin via the OOB file); named present (Present-Documented) compared at +-3 percent per PLAN 2.3; Present-Probable is not assigned')
        tot['rows'] += n
        tot['unreadable'] += rs.get('unreadable-or-ambiguous', 0)
        for k, v in lab.items():
            tot['label:' + k] += v
        tot['name_garbled'] += st['name_garbled_rows']
    units[uid] = st
covered = [u for u in units.values() if u['covered']]
fam = dict(family='NE', scope='Maine, Massachusetts, New Hampshire, Vermont (units of the repository OOB: 37 infantry regiments, 3 cavalry regiments, 7 batteries)',
           units_in_oob=len(units), units_with_names=len(covered), names=tot['rows'], rows_unreadable_or_ambiguous=tot['unreadable'],
           unreadable_share=round(tot['unreadable'] / max(tot['rows'], 1), 4), share_by_label={k[6:]: round(v / tot['rows'], 4) for k, v in tot.items() if k.startswith('label:')},
           label_rows={k[6:]: v for k, v in tot.items() if k.startswith('label:')}, name_garbled_rows=tot['name_garbled'],
           not_covered=[dict(unit_id=u['unit_id'], designation=u['designation']) for u in units.values() if not u['covered']],
           note='names = CSV rows (one row per man per printed entry; same-name rows within a unit are flagged duplicate-group and not merged)')
json.dump(dict(family=fam, units=units), open(os.path.join(f.DATA, 'stats.json'), 'w', encoding='utf-8'), indent=1)
print(json.dumps(fam, indent=1)[:2500])
for u in covered:
    print(u['unit_id'], u['rows'], u['named_present'], u['oob_strength'], u['reconciliation'], 'cas', u['cas_remark_rows'], u['oob_casualties'])
