#!/usr/bin/env python3
"""Is a stored gate result (GOVERNANCE/gate_results/Qnn.json) still the result of the files it was made from?

For each Qnn.json it re-hashes every file named in the record's `inputs` (path and sha256) and reports how many files differ, are gone, or were
missing then and exist now.  Read-only: writes nothing.  Method of GATE-SPEC 1.6 / U-12 ("a record expires when an input changes").

    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/result_currency.py [DIR]   (DIR defaults to GOVERNANCE/gate_results)
"""
import hashlib, json, os, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'gate_results')


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


for fn in sorted(glob.glob(os.path.join(D, 'Q[0-9][0-9].json'))):
    r = json.load(open(fn, encoding='utf-8'))
    ins = r.get('inputs') or []
    same = changed = gone = now_present = still_missing = nohash = 0
    changed_paths, now_paths = [], []
    for i in ins:
        p = i.get('path')
        if not p:
            nohash += 1
            continue
        full = os.path.join(ROOT, *p.split('/'))
        if i.get('missing') or not i.get('sha256'):
            if os.path.exists(full):
                now_present += 1
                now_paths.append(p)
            else:
                still_missing += 1
            continue
        if not os.path.exists(full):
            gone += 1
            changed_paths.append(p + ' (gone)')
            continue
        if sha(full) == i['sha256']:
            same += 1
        else:
            changed += 1
            changed_paths.append(p)
    print('%s\tverdict %s\trun %s\tinputs %d\tsame %d\tchanged %d\tgone %d\tnow_present %d\tstill_missing %d' % (
        r.get('gate'), r.get('verdict'), r.get('started_utc'), len(ins), same, changed, gone, now_present, still_missing))
    for p in changed_paths[:12]:
        print('    changed:', p)
    if len(changed_paths) > 12:
        print('    ... and %d more changed' % (len(changed_paths) - 12))
    for p in now_paths[:6]:
        print('    was missing, present now:', p)
