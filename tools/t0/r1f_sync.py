#!/usr/bin/env python3
"""Copy the Release 1 round 4 candidate patch groups from tools/t0/patches-next (where they are authored and tested) to tools/t0/patches (where trains.json reads them for train R1f).

    python tools/t0/r1f_sync.py            write the registered copies
    python tools/t0/r1f_sync.py --check    exit 1 when a registered copy differs from its source (the sources are the truth: edit patches-next, then sync)

Bundle groups   PERF5 (+ its "+x" parts) are copied as they are (trains.json group_order, "first": "R1f").  Groups handed over by the other agents of the round (docs/accept/R1F-HANDOFF.md) are added to BUNDLE / PAGE below.
Page groups     PG-zperf5 and PG-zfix are copied with  "train": "R1f"  and without "optional" (always part of R1f); sorted names decide the order (PG-zperf4 < PG-zperf5).
R1f is cumulative on R1e: nothing of R1e is changed or re-registered here (R1e stays frozen; python tools/t0/r1e_sync.py --check must still pass).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'patches-next')
DST = os.path.join(HERE, 'patches')
BUNDLE = ['PERF5']
# R1F (ANIM, T0-ANIM-B11): the engine's sources compile straight to <GROUP>[+part]@R1f.json in patches-next (node tools/t0/anim/build-anim.mjs); they are registered as they are, and replace ANIM@R1e.json / ANIM+mon@R1e.json for R1f and later
EXACT = ['ANIM@R1f.json', 'ANIM+mon@R1f.json']
PAGE = ['PG-zperf5', 'PG-zfix']   # PG-zwt (acceptance attempt 2: /watch-together does not close a connecting Live Sync socket): tools/t0/r1f/gen_zfix.py
RENAMED = {}


def dumps(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False) + '\n'


def perf4_for_anim():
    """PERF4's patch 'PERF4-anim-dataset-split' anchors on the COMPILED text of the ANIM engine: the names the minifier gave to the dataset builder, the host's state, the host object and the timer function.  A new compile of the engine may name them
    differently.  Returns the text of PERF4@R1f.json (PERF4.json with the names found in ANIM@R1f.json), or None when PERF4.json already fits.  (Same derivation as tmp/r1f-anim/fixperf4.py of the round.)"""
    import re
    anim = json.load(open(os.path.join(SRC, 'ANIM@R1f.json'), encoding='utf-8'))
    t = max(anim['patches'], key=lambda p: len(p.get('repl', '')))['repl']
    m = re.search(r'const t=(\w+)\((\w+),e\);return (\w+)\.pbt=e,\3\.dsGen=\3\.oobGen,\3\.counts=t\.counts,\3\.core\?\3\.core\.setDataset\(t\):function\(e\)\{let t=null;try\{t=window\.localStorage', t)
    c = re.search(r'function (\w+)\(\)\{(\w+)\.tm\|\|\(\2\.tm=window\.setTimeout', t)
    if not m or not c:
        raise SystemExit('r1f_sync: cannot derive the names PERF4-anim-dataset-split anchors on from ANIM@R1f.json')
    D, K, X = m.group(1), m.group(2), m.group(3)
    C = c.group(1)
    find = m.group(0)
    repl = (f"if(!{X}.core&&!{X}.gtDs){{{X}.gtDs={D}({K},e),{X}.gtDk=e;{C}();return!1}}const t=!{X}.core&&{X}.gtDs&&{X}.gtDk===e?{X}.gtDs:{D}({K},e);{X}.gtDs=null;"
            f"return {X}.pbt=e,{X}.dsGen={X}.oobGen,{X}.counts=t.counts,{X}.core?{X}.core.setDataset(t):function(e){{let t=null;try{{t=window.localStorage")
    obj = json.load(open(os.path.join(DST, 'PERF4.json'), encoding='utf-8'))
    n = 0
    for x in obj['patches']:
        if x['id'] == 'PERF4-anim-dataset-split' and (x['find'] != find or x['repl'] != repl):
            x['find'] = find
            x['repl'] = repl
            n += 1
    return dumps(obj) if n else None


def wanted():
    out = {}
    for fn in EXACT:
        out[fn] = open(os.path.join(SRC, fn), encoding='utf-8', newline='').read()
    p4 = perf4_for_anim()
    if p4 is not None:
        out['PERF4@R1f.json'] = p4
    for g in BUNDLE:
        for fn in sorted(os.listdir(SRC)):
            if fn == g + '.json' or (fn.startswith(g + '+') and fn.endswith('.json')):
                out[fn] = open(os.path.join(SRC, fn), encoding='utf-8', newline='').read()
    for g in PAGE + list(RENAMED):
        name = RENAMED.get(g, g)
        obj = json.load(open(os.path.join(SRC, g + '.json'), encoding='utf-8'))
        obj['group'] = name
        obj['train'] = 'R1f'
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
