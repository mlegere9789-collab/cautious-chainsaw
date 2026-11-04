"""NY family: per-unit reconciliation and family stats from the built CSVs.
Run: python -I -X utf8 ny_finish.py   (writes data/NY/reconciliation.json, stats.json, unit-table.md)"""
import os, sys, csv, json, glob, collections, ctypes, re
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NY')

um = json.load(open(os.path.join(DATA, 'unit_map.json'), encoding='utf-8'))['units']
files = {}
for f in glob.glob(os.path.join(DATA, 'rosters', '*.csv')):
    uid = os.path.basename(f).split('_')[0]
    files[uid] = f

sys.path.insert(0, HERE)
import ny_phisterer
acq = json.load(open(os.path.join(DATA, 'acquired.json'), encoding='utf-8'))
cache_dir = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NY')
phis = {}
for f in acq['files']:
    if f.get('label', '').startswith('Battles') and f['file'].endswith('.xlsx'):
        for uid in f.get('unit_ids', []):
            if uid in phis and phis[uid] and 'error' not in phis[uid]:
                continue
            g = ny_phisterer.gettysburg(os.path.join(cache_dir, f['file']))
            if g is not None:
                g['source_file'] = f['file']
                phis[uid] = g
recon = {}
bs = json.load(open(os.path.join(DATA, 'build_stats.json'), encoding='utf-8'))
names_total = 0
labels_total = collections.Counter()
rs_total = collections.Counter()
units_with = 0
table = []
for uid, u in sorted(um.items()):
    src = uid if uid in files else u.get('roster_from')
    entry = dict(unit_id=uid, designation=u['designation'], arm=u['arm'], s_doc=u['oob_strength'], s_doc_source='repository OOB file (cites Busey and Martin 1994, second-hand; not re-checked against a primary source, see PLAN G15)', oob_casualties=u['oob_casualties'])
    if u.get('oob_defect'):
        entry.update(status='OOB-DEFECT', names=0, note=u.get('note'))
    elif src and src in files:
        rows = list(csv.DictReader(open(files[src], encoding='utf-8')))
        nm = [r for r in rows if r['presence_label'] != 'Duplicate-Xref']
        lab = collections.Counter(r['presence_label'] for r in nm)
        rs = collections.Counter(r['roll_status'] for r in nm)
        basis = collections.Counter(r['basis_code'] for r in nm)
        npd = lab.get('Present-Documented', 0)
        sdoc = u['oob_strength']
        if bs.get(src, {}).get('register_image_only'):
            status = 'REGISTER-IMAGE-ONLY'
        elif u.get('roster_from'):
            status = 'COVERED-VIA-PARENT'
        elif sdoc and npd > sdoc * 1.03:
            status = 'Contested'
        elif sdoc and npd < sdoc:
            status = 'Short'
        else:
            status = 'Reconciled'
        cas_named = sum(1 for r in nm if r['basis_code'] in ('CAS-REMARK', 'CAS-REMARK-DATE', 'ROH-LIST'))
        ph = phis.get(uid) or phis.get(src)
        entry.update(phisterer_gettysburg=ph, named_casualty_rows_over_phisterer_aggregate=(round(cas_named / ph['aggregate'], 2) if ph and ph.get('aggregate') else None))
        entry.update(status=status, roster_file=os.path.basename(files[src]), names=len(nm), xref_rows=len(rows) - len(nm), labels=dict(lab), roll_status=dict(rs), basis=dict(basis),
                     n_present_documented=npd, n_present_probable=0, on_roll_undetermined=rs.get('on-roll-undetermined', 0), unreadable_or_ambiguous=rs.get('unreadable-or-ambiguous', 0),
                     named_casualty_rows=cas_named, named_casualty_over_oob_casualties=(round(cas_named / u['oob_casualties'], 2) if u['oob_casualties'] else None),
                     short_by=(max(0, sdoc - npd) if sdoc else None))
        if u.get('roster_from'):
            entry['note'] = u.get('note')
        else:
            names_total += len(nm)
            labels_total.update(lab)
            rs_total.update(rs)
        if len(nm) > 0:
            units_with += 1
    else:
        entry.update(status='NO-ROSTER', names=0, note=u.get('note') or 'no roster file built for this OOB entry (see README)')
    recon[uid] = entry
    table.append(entry)

stats = dict(
    family='NY',
    units_in_oob=len(um),
    units_with_names=units_with,
    names=names_total,
    rows_unreadable_or_ambiguous=rs_total.get('unreadable-or-ambiguous', 0),
    unreadable_share=round(rs_total.get('unreadable-or-ambiguous', 0) / names_total, 4) if names_total else None,
    share_by_label={k: round(v / names_total, 4) for k, v in sorted(labels_total.items())} if names_total else {},
    count_by_label=dict(labels_total),
    count_by_roll_status=dict(rs_total),
)
json.dump(stats, open(os.path.join(DATA, 'stats.json'), 'w', encoding='utf-8'), indent=1)
json.dump(recon, open(os.path.join(DATA, 'reconciliation.json'), 'w', encoding='utf-8'), indent=1)

with open(os.path.join(DATA, 'unit-table.md'), 'w', encoding='utf-8') as fh:
    fh.write('| unit_id | designation | names | Present-Documented | Absent-Documented | Unknown | S_doc (OOB) | OOB casualties | status |\n|---|---|---|---|---|---|---|---|---|\n')
    for e in table:
        lab = e.get('labels', {})
        fh.write('| %s | %s | %s | %s | %s | %s | %s | %s | %s |\n' % (e['unit_id'], e['designation'], e.get('names', 0), lab.get('Present-Documented', ''), lab.get('Absent-Documented', ''), lab.get('Unknown', ''), e['s_doc'] if e['s_doc'] is not None else '', e['oob_casualties'] if e['oob_casualties'] is not None else '', e['status']))
print(json.dumps(stats, indent=1))
