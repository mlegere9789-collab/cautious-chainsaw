"""Write docs/battle-theatre/GOVERNANCE/horde/requests/bt-conflicts-integrate-readers.md: every reader (timeline row, arrivals row, gate, register entry, placement and builder file, doc)
of a resolution that still has must_change true, grouped by kind, with the exact change the resolution states. The owners of those files apply them; nothing here edits them.

    python3 -I tools/bt/conflicts/write_reader_requests.py
"""
import glob
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OUT = os.path.join(G, 'horde', 'requests', 'bt-conflicts-integrate-readers.md')


def main():
    by = {}
    for f in sorted(glob.glob(os.path.join(G, 'conflicts', 'resolutions', 'C-*.json'))):
        r = json.load(open(f, encoding='utf-8'))
        for rd in r['readers']:
            if rd['must_change']:
                by.setdefault(rd['kind'], []).append((r['id'], r['class'], r['tier'], rd))
    n = sum(len(v) for v in by.values())
    L = ['# Request: apply the changes the 47 conflict resolutions name in files the integration does not own', '',
         'From the integration of the 47 resolutions (2026-11-24). Source: `readers` of GOVERNANCE/conflicts/resolutions/C-nnn.json with must_change true, after the files the integration owns were updated '
         '(decisions/conflict_defaults.json version 2, app data conflict-defaults.json, conflict_register.json, conflicts_structured.json, decision_log.md and DELEGATED-DECISIONS block DEC-DELEG-J).',
         'No gate floor, threshold or expected value was edited. Where a resolution\'s instant is earlier than an arrival gate floor (C-005, C-007, C-021) the viewer draws at the floor and the floor is an owner decision (DEC-DELEG-J).', '',
         '%d readers remain. Counts by kind: %s.' % (n, ', '.join('%s %d' % (k, len(v)) for k, v in sorted(by.items()))), '']
    for kind in sorted(by):
        L.append('## %s (%d)' % (kind, len(by[kind])))
        L.append('')
        for cid, cls, tier, rd in by[kind]:
            L.append('- **%s** (%s, %s) `%s`: %s' % (cid, cls, tier, rd['ref'].replace('\n', ' '), ' '.join(rd['note'].split())))
        L.append('')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write('\n'.join(L))
    print('wrote', OUT, n, 'readers')


if __name__ == '__main__':
    main()
