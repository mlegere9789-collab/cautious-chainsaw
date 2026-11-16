#!/usr/bin/env python3
"""Summary of the resolutions of the 47 conflicts, for the integration step and the decision log.

    python3 -I tools/bt/conflicts/summarize.py            markdown to standard output
    python3 -I tools/bt/conflicts/summarize.py --json     the same facts as JSON

Reads docs/battle-theatre/GOVERNANCE/conflicts/resolutions/C-0xx.json (the files that exist; the validator decides whether they pass: this program does not judge them) and prints:
counts by class and by tier; per conflict the default, class, tier and whether the PDF default and the first delegated default hold; the conflicts whose default changed against
the PDF and against the first delegated default; the gaps and irreducible conflicts with the number of failed searches; the readers that must change (timeline rows, gates, app data).
A file that cannot be read is listed as unreadable, a conflict with no file as missing.
"""
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L

L.utf8_stdout()


def load():
    out = {}
    for cid in L.IDS:
        p = os.path.join(L.RESOLUTIONS, cid + '.json')
        if not os.path.exists(p):
            out[cid] = None
            continue
        try:
            out[cid] = L.load_json(p)
        except (ValueError, OSError):
            out[cid] = 'unreadable'
    return out


def facts(res):
    rows = []
    for cid in L.IDS:
        r = res[cid]
        if r is None or r == 'unreadable':
            rows.append({'id': cid, 'state': 'missing' if r is None else 'unreadable'})
            continue
        h = r.get('holds') or {}
        d = r.get('default') or {}
        rows.append({'id': cid, 'state': 'present', 'topic': r.get('topic'), 'class': r.get('class'), 'tier': r.get('tier'), 'mode': d.get('mode'), 'default': d.get('label'),
                     'pdf_default_holds': (h.get('pdf_default') or {}).get('holds'), 'first_delegated_holds': (h.get('first_delegated') or {}).get('holds'),
                     'pdf_note': (h.get('pdf_default') or {}).get('note'), 'first_note': (h.get('first_delegated') or {}).get('note'),
                     'failed_searches': len(r.get('failed_searches') or []), 'positions': len(r.get('positions') or []),
                     'readers_to_change': [x for x in (r.get('readers') or []) if isinstance(x, dict) and x.get('must_change')]})
    return rows


def main(argv):
    res = load()
    rows = facts(res)
    present = [r for r in rows if r['state'] == 'present']
    if '--json' in argv:
        print(json.dumps({'rows': rows, 'by_class': collections.Counter(r['class'] for r in present), 'by_tier': collections.Counter(r['tier'] for r in present)}, ensure_ascii=False, indent=1))
        return 0
    w = print
    w('# Resolutions of the 47 conflicts: summary')
    w('')
    w('%d of 47 resolution files present (%d missing, %d unreadable).' % (len(present), sum(1 for r in rows if r['state'] == 'missing'), sum(1 for r in rows if r['state'] == 'unreadable')))
    w('')
    w('By class: ' + ', '.join('%s %d' % kv for kv in sorted(collections.Counter(r['class'] for r in present).items())))
    w('By tier: ' + ', '.join('%s %d' % kv for kv in sorted(collections.Counter(r['tier'] for r in present).items())))
    w('')
    w('| id | default | class | tier | PDF default holds | first delegated default holds | positions | failed searches |')
    w('|---|---|---|---|---|---|---|---|')
    for r in rows:
        if r['state'] != 'present':
            w('| %s | (%s) | | | | | | |' % (r['id'], r['state']))
        else:
            w('| %s | %s | %s | %s | %s | %s | %d | %d |' % (r['id'], (r['default'] or '').replace('|', '/'), r['class'], r['tier'], r['pdf_default_holds'], r['first_delegated_holds'], r['positions'], r['failed_searches']))
    w('')
    w('## Defaults that changed against the PDF (holds: no or partly)')
    w('')
    for r in present:
        if r['pdf_default_holds'] in ('no', 'partly'):
            w('- %s (%s): %s' % (r['id'], r['pdf_default_holds'], (r['pdf_note'] or '')[:300]))
    w('')
    w('## Defaults that changed against the first delegated default (holds: no or partly)')
    w('')
    for r in present:
        if r['first_delegated_holds'] in ('no', 'partly'):
            w('- %s (%s): %s' % (r['id'], r['first_delegated_holds'], (r['first_note'] or '')[:300]))
    w('')
    w('## Gaps and irreducible conflicts')
    w('')
    for r in present:
        if r['class'] in ('gap', 'irreducible'):
            w('- %s (%s, tier %s): %d failed searches listed' % (r['id'], r['class'], r['tier'], r['failed_searches']))
    w('')
    w('## Readers that must change')
    w('')
    for r in present:
        for x in r['readers_to_change']:
            w('- %s: %s %s: %s' % (r['id'], x.get('kind'), x.get('ref'), str(x.get('note'))[:240]))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
