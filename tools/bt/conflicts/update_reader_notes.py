"""After the integration (integrate_resolutions.py): bring the `readers` notes of the resolutions up to date for the files the integration changed.

    python3 -I tools/bt/conflicts/update_reader_notes.py
Rules (idempotent):
  - a reader that is the defaults file (data/conflict-defaults.json or decisions/conflict_defaults.json) is done: must_change false, the note states the default now in the file;
  - a reader that is the delegated-decision row of 2026-11-11 is history (the file is append-only): the row stays, DEC-DELEG-J carries the resolution; must_change false;
  - C-002, C-022, C-029: the notes that named a stale class or window are rewritten with the class and window of the resolution.
Readers of other files (timeline rows, arrivals rows, gates, register entries, placement) are not touched: their owners change them (requests/bt-conflicts-integrate-readers.md).
"""
import glob
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
RES = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'conflicts', 'resolutions')
STAMP = 'Integrated 2026-11-24:'

SPECIAL = {
    ('C-002', 'history/arrivals.json us-3c-2d default_basis'): "default_basis cites the PDF recommended default 02:00 as PENDING OWNER; it should cite this resolution (window 00:00-02:00 drawn from 00:00, class irreducible, tier inferred).",
    ('C-022', 'history/arrivals.json us-6c default_basis'): "default_basis cites the plan's default 'head 14:00, main body 17:00' (PENDING OWNER); it should cite this resolution (window 14:00-17:00 drawn at 15:00, class irreducible, tier documented).",
}


def desc(r):
    d = r['default']
    a = d.get('animation') or {}
    at = a.get('at')
    drawn = ('drawn at %s on Jul %d' % (at[11:16], int(at[8:10]))) if at else 'no single instant drawn'
    return "'%s' (class %s, tier %s, %s)" % (d['label'], r['class'], r['tier'], drawn)


def main():
    changed = 0
    for f in sorted(glob.glob(os.path.join(RES, 'C-*.json'))):
        raw = open(f, encoding='utf-8').read()
        r = json.loads(raw)
        cid = r['id']
        for rd in r['readers']:
            ref = rd['ref']
            if 'conflict-defaults.json' in ref or 'conflict_defaults.json' in ref:
                if 'placement-claims.json' in ref:      # a combined reader: the defaults part is done, the claims file is another owner's
                    rd['note'] = "%s conflict-defaults.json now carries %s; the first delegated default stays as previous_default and a selectable scenario. placement-claims.json lines 7225 and 7258 still name this conflict as the conflict of the VI Corps claims: their owner checks them (requests/bt-conflicts-integrate-readers.md)." % (STAMP, desc(r))
                else:
                    rd['must_change'] = False
                    rd['note'] = "%s the file carries %s; the first delegated default stays as previous_default and a selectable scenario; the plan's value and every position stay selectable." % (STAMP, desc(r))
            elif 'DELEGATED-DECISIONS' in ref and ('%s row' % cid) in ref:
                rd['must_change'] = False
                rd['note'] = "%s the row of 2026-11-11 stays as history (the file is append-only); the block DEC-DELEG-J of the same file and of decision_log.md carries this resolution: %s." % (STAMP, desc(r))
            else:
                for (c, key), note in SPECIAL.items():
                    if c == cid and key in ref:
                        rd['note'] = note
        out = json.dumps(r, indent=1, ensure_ascii=False) + '\n'
        if out != raw:
            open(f, 'w', encoding='utf-8').write(out)
            changed += 1
    print('resolution files updated:', changed)


if __name__ == '__main__':
    main()
