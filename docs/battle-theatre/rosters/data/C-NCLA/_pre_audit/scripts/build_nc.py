"""Assemble the North Carolina CSVs (one per OOB unit) from the Moore classifications. Run after moore_pipeline.py primary and emory."""
import json, re, sys, os, csv
sys.path.insert(0, os.path.dirname(__file__))
from collections import Counter, defaultdict
from ncla_common import DATA, ROOT, low_priority
from moore_units import SCOPE, VOLIA, EMORY_IA, VOLID
from moore_pipeline import name_flags, roll_status, normkey

low_priority()
OOB = os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob')
# Source choice per unit (see README, 'Scan choice'): the Google scan of volume 1 drops and scrambles pages; the Emory copy of the same edition is complete.
EMORY_UNITS = {u for u, (v, k) in SCOPE.items() if v == 'v1' and not u.startswith('C-ART')} | {'C-34NC'}
ART_COMPANY = {'C-ART-Manly': 'A', 'C-ART-Reilly': 'D'}


def oob_units():
    out = {}
    for f in ['first', 'second', 'third']:
        d = json.load(open(os.path.join(OOB, f'confederate_regiments_{f}_corps.json'), encoding='utf-8'))
        for r in d['regiments']:
            out[r['regiment_id']] = r
    art = json.load(open(os.path.join(OOB, 'confederate_artillery.json'), encoding='utf-8'))
    for k in ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']:
        for b in art[k]['battalions']:
            for x in b.get('batteries', []):
                out[x['battery_id']] = x
    return out


def leafmaps():
    m = {}
    for tag in ['moore_v1', 'moore_v2', 'moore_v3', 'moore_v4', 'emory_v1', 'emory_v2']:
        fn = os.path.join(DATA, 'work', f'leafmap_{tag}.json')
        if os.path.exists(fn):
            m[tag] = {int(k): v for k, v in json.load(open(fn))['leaf_of_line'].items()}
    return m


def main():
    P = json.load(open(os.path.join(DATA, 'work', 'moore_classified_primary.json'), encoding='utf-8'))
    E = json.load(open(os.path.join(DATA, 'work', 'moore_classified_emory.json'), encoding='utf-8'))
    LM = leafmaps()
    oob = oob_units()
    outdir = os.path.join(DATA, 'units')
    os.makedirs(outdir, exist_ok=True)
    allstats = {}
    cols = ['regiment', 'company', 'section', 'name_as_printed', 'rank', 'enlist_or_commission_date', 'moore_1882_entry', 'presence_label', 'presence_basis', 'dup_group',
            'source_id', 'parse_flags', 'roll_status', 'unit_id', 'source_locator', 'row_id']
    for u in [x for x in SCOPE]:
        src = 'emory' if u in EMORY_UNITS else 'primary'
        D = (E if src == 'emory' else P)[u]
        vol = D['vol']
        cls = D['cls']
        if u in ART_COMPANY:
            cls = [o for o in cls if o['co'] == ART_COMPANY[u]]
        ia = EMORY_IA[vol] if src == 'emory' else VOLIA[vol]
        tag = ('emory_' if src == 'emory' else 'moore_') + vol
        lm = LM.get(tag, {})
        design = oob[u]['designation']
        # duplicate groups (same normalised name inside the unit)
        groups = defaultdict(list)
        for i, o in enumerate(cls):
            groups[normkey(o['name'])].append(i)
        dupid = {}
        for k, ids in groups.items():
            for i in ids:
                dupid[i] = f"{u}:{ids[0]}"
        rows = []
        for i, o in enumerate(cls):
            fl = list(o['flags']) + name_flags(o['name'])
            if o.get('glued'):
                fl.append('split-from-glued-line')
            if len(groups[normkey(o['name'])]) > 1 and normkey(o['name']):
                fl.append('same-name-in-unit')
            leaf = lm.get(o['line'])
            loc = f"IA {ia} djvu.txt line {o['line']}" + (f"; scan page index n{leaf}" if leaf is not None else '')
            rows.append({'regiment': design, 'company': o['co'], 'section': o['sec'], 'name_as_printed': o['name'], 'rank': o['rank'],
                         'enlist_or_commission_date': o['enl'] or '', 'moore_1882_entry': o['body'], 'presence_label': o['label'], 'presence_basis': o['why'],
                         'dup_group': dupid[i], 'source_id': VOLID[vol] + ('-emory' if src == 'emory' else ''), 'parse_flags': ';'.join(sorted(set(fl))),
                         'roll_status': roll_status(o['label'], o['why'], o['flags']), 'unit_id': u, 'source_locator': loc, 'row_id': f'{u}-{i:04d}'})
        fn = os.path.join(outdir, f'{u}.csv')
        with open(fn, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
        lab = Counter(r['presence_label'] for r in rows)
        rs = Counter(r['roll_status'] for r in rows)
        flagc = Counter(x for r in rows for x in r['parse_flags'].split(';') if x)
        allstats[u] = dict(designation=design, army='Confederate', state='North Carolina', source=src, ia_item=ia, oob_strength=oob[u].get('strength'), rows=len(rows),
                           labels=dict(lab), roll_status=dict(rs), flags=dict(flagc), companies=dict(Counter(r['company'] for r in rows)),
                           unique_normalised_names=len(groups), name_garbled_rows=sum(1 for r in rows if 'name-garbled' in r['parse_flags'] or 'ocr-noise-in-name' in r['parse_flags']),
                           notes=[n['text'][:400] for n in D['notes']] if u not in ART_COMPANY else [n['text'][:600] for n in D['notes']],
                           csv=os.path.relpath(fn, DATA).replace('\\', '/'))
        print(u, len(rows), dict(lab), flush=True)
    json.dump(allstats, open(os.path.join(DATA, 'work', 'nc_stats.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
