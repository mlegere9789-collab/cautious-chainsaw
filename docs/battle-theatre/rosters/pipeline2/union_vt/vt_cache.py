"""Cache the word boxes of the leaves of the 11 Vermont units (aligned to the pinned search text) in the work directory.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_cache.py            (run from the repository root, through the machine lock)

Writes tmp/library/rosters/union-vt-work/leaves.json.gz : {"leaf": {"words": [[x0,x1,yt,yb,w,conf,ln,off], ...], "a": start, "b": end}}
and tmp/library/rosters/union-vt-work/alignment.json (counts per leaf).  The djvu.xml is read once.
"""
import os, sys, json, gzip
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vt_lib as L

RANGES = [(42, 81), (82, 120), (121, 156), (157, 191), (192, 234), (235, 281), (473, 494), (495, 518), (519, 540), (541, 561), (562, 584)]


def main():
    text, pm, ent = L.load_text()
    wanted = set()
    for a, b in RANGES:
        wanted.update(range(a, b + 1))
    leaves = L.xml_leaves(wanted=wanted)
    out, al = {}, {}
    tot = [0, 0, 0]
    for leaf in sorted(leaves):
        a, b = pm.span(leaf)
        ws = leaves[leaf]
        ok, bad, ntok, tt = L.align(ws, text, a, b)
        out[str(leaf)] = {'a': a, 'b': b, 'pg': pm.printed(leaf), 'ntok': ntok,
                          'words': [[w['x0'], w['x1'], w['yt'], w['yb'], w['w'], w['conf'], w['ln'], w['off']] for w in ws]}
        al[str(leaf)] = {'xml_words': len(ws), 'aligned': ok, 'unaligned': bad, 'text_tokens': ntok}
        tot[0] += len(ws); tot[1] += ok; tot[2] += ntok
    with gzip.open(os.path.join(L.WORK, 'leaves.json.gz'), 'wt', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    json.dump({'total_xml_words': tot[0], 'aligned': tot[1], 'text_tokens': tot[2], 'per_leaf': al}, open(os.path.join(L.WORK, 'alignment.json'), 'w'), indent=1)
    print('leaves', len(out), 'xml words', tot[0], 'aligned', tot[1], 'text tokens', tot[2])


if __name__ == '__main__':
    main()
