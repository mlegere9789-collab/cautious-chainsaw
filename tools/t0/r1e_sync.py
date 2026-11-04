#!/usr/bin/env python3
"""Copy the Release 1 round 3 candidate patch groups from tools/t0/patches-next (where they are authored and tested) to tools/t0/patches (where trains.json reads them for train R1e).

    python tools/t0/r1e_sync.py            write the registered copies
    python tools/t0/r1e_sync.py --check    exit 1 when a registered copy differs from its source (the sources are the truth: edit patches-next, then sync)

Bundle groups   PERF4 (+ its "+x" parts) are copied as they are (trains.json group_order, "first": "R1e").  Groups handed over by the other agents of the round (docs/accept/R1E-HANDOFF.md) are added to BUNDLE / PAGE below.
Page groups     PG-zperf4 is copied with  "train": "R1e"  and without "optional" (always part of R1e); sorted names decide the order (PG-zperf3 < PG-zperf4).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'patches-next')
DST = os.path.join(HERE, 'patches')
BUNDLE = ['PERF4', 'ACC']
# groups whose content changed for R1e: the file is registered as <GROUP>[+part]@R1e.json, which REPLACES the unsuffixed (R1d) file for R1e and later (tools/t0/t0build/patches.py load_groups); R1d keeps rebuilding from the unsuffixed copy
OVERRIDE = ['ANIM']
PAGE = ['PG-zperf4', 'PG-zacc', 'PG-zinput']
RENAMED = {}


def dumps(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False) + '\n'


def wanted():
    out = {}
    for g in BUNDLE:
        for fn in sorted(os.listdir(SRC)):
            if fn == g + '.json' or (fn.startswith(g + '+') and fn.endswith('.json')):
                out[fn] = open(os.path.join(SRC, fn), encoding='utf-8', newline='').read()
    for g in OVERRIDE:
        for fn in sorted(os.listdir(SRC)):
            if fn == g + '.json' or (fn.startswith(g + '+') and fn.endswith('.json')):
                text = open(os.path.join(SRC, fn), encoding='utf-8', newline='').read()
                reg = os.path.join(DST, fn)
                if not os.path.isfile(reg) or open(reg, encoding='utf-8', newline='').read() != text:       # unchanged since R1d: the unsuffixed copy serves R1e too
                    out[fn[:-5] + '@R1e.json'] = text
    for g in PAGE + list(RENAMED):
        name = RENAMED.get(g, g)
        obj = json.load(open(os.path.join(SRC, g + '.json'), encoding='utf-8'))
        obj['group'] = name
        obj['train'] = 'R1e'
        obj.pop('optional', None)
        out[name + '.json'] = dumps(obj)
    return out


def main(argv):
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
