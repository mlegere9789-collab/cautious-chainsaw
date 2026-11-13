"""Scan the Official Records Ser. I vol. 27 (parts 1-3) for vegetation statements and print compact, citable hits.

    python -I tools/bt/vegetation/or_scan.py "<regex>" [--parts 1,2] [--ctx 130] [--max 400] [--skip "<regex of contexts to drop>"]

Uses tools/bt/or27_find.py (normalised text, citation by report and printed page). Nothing is corrected: OCR errors stay as they are.
Output is for reading and curation only; the curated claims live in tools/bt/vegetation/claims_*.json and every quote there is
re-verified against the source text by tools/bt/vegetation/build_vegetation.py.
"""
import os, re, sys, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import or27_find as F

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pattern')
    ap.add_argument('--parts', default='1,2')
    ap.add_argument('--ctx', type=int, default=130)
    ap.add_argument('--max', type=int, default=400)
    ap.add_argument('--skip', default=None)
    ap.add_argument('--only', default=None, help='regex the context must also match')
    a = ap.parse_args()
    parts = tuple(int(x) for x in a.parts.split(','))
    hits = F.search(a.pattern, parts=parts, ctx=a.ctx, max_hits=a.max)
    skip = re.compile(a.skip, re.I) if a.skip else None
    only = re.compile(a.only, re.I) if a.only else None
    n = 0
    for h in hits:
        c = h['context']
        if skip and skip.search(c):
            continue
        if only and not only.search(c):
            continue
        a0, b0 = h['context_match_at']
        who = h['who']
        print('[pt%d %s p.%s @%d] %s<<%s>>%s' % (h['part'], who[:46], h['page'], h['start'], c[:a0], c[a0:b0], c[b0:]))
        n += 1
    print('# %d shown of %d hits' % (n, len(hits)))

if __name__ == '__main__':
    main()
