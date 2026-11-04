#!/usr/bin/env python3
"""Copy the Release 1 candidate patch groups from tools/t0/patches-next (where they are authored and tested) to tools/t0/patches (where trains.json reads them for train R1d).

    python tools/t0/r1d_sync.py            write the registered copies
    python tools/t0/r1d_sync.py --check    exit 1 when a registered copy differs from its source (the sources are the truth: edit patches-next, then sync)

Bundle groups   CLOCK DATA MON ANIM POLISH PERF2 PERF3 BASE1863 (+ their "+mon" parts) are copied as they are (trains.json group_order, "first": "R1d").
Page groups     PG-perf2 PG-perf3 PG-polish PG-zperf3 are copied with  "train": "R1d"  and without "optional" (always part of R1d);  IMG.json becomes PG-zimg.json and COPY2.json becomes PG-zcopy2.json
                (both anchor on the finished text of the other page groups, so their names sort after PG-core / PG-maps / PG-polish; COPY2 must not be a bundle group).
PG-legal and PG-polish-legal (interim privacy and terms text) stay out: opt-in, an owner step (trains.json legal.effective_date).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'patches-next')
DST = os.path.join(HERE, 'patches')
BUNDLE = ['CLOCK', 'DATA', 'MON', 'ANIM', 'POLISH', 'PERF2', 'PERF3', 'BASE1863']
PAGE = ['PG-perf2', 'PG-perf3', 'PG-polish', 'PG-zperf3']
RENAMED = {'IMG': 'PG-zimg', 'COPY2': 'PG-zcopy2'}


def dumps(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False) + '\n'


def wanted():
    out = {}
    for g in BUNDLE:
        for fn in sorted(os.listdir(SRC)):
            if fn == g + '.json' or (fn.startswith(g + '+') and fn.endswith('.json')):
                out[fn] = open(os.path.join(SRC, fn), encoding='utf-8', newline='').read()
    for g in PAGE + list(RENAMED):
        name = RENAMED.get(g, g)
        obj = json.load(open(os.path.join(SRC, g + '.json'), encoding='utf-8'))
        obj['group'] = name
        obj['train'] = 'R1d'
        obj.pop('optional', None)
        out[name + '.json'] = dumps(obj)
    return out


def main(argv):
    # R1d was delivered (deliver/gettysburg-R1d-753e318f-*.zip) and must keep rebuilding byte for byte: its registered copies in tools/t0/patches are FROZEN.  Later changes of a group
    # (ANIM of round 3) are registered for train R1e as <GROUP>@R1e.json by tools/t0/r1e_sync.py; the sources in patches-next move on.  Run with --force-r1d only to re-create R1d from scratch.
    if '--force-r1d' not in argv:
        print('R1d is frozen (delivered): its copies in tools/t0/patches are the truth; use tools/t0/r1e_sync.py for later changes (nothing written, nothing checked)')
        return 0
    check = '--check' in argv
    bad = []
    for fn, text in wanted().items():
        p = os.path.join(DST, fn)
        cur = open(p, encoding='utf-8', newline='').read() if os.path.isfile(p) else None
        if cur != text:
            bad.append(fn)
            if not check:
                open(p, 'w', encoding='utf-8', newline='').write(text)
    print(('differs: ' if check else 'written: ') + (', '.join(bad) if bad else '(nothing: already in step)'))
    return 1 if (check and bad) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
