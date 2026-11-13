#!/usr/bin/env python3
"""Keyword-in-context search over the local corpora (read-only).

Usage: python3 -I kwic.py <corpora> <regex> [--ctx N] [--max N] [--files substr] [--flags i]
corpora: comma list of ws9, or27, or27b, nps, ca, retry, misc, all
The regex is applied to whitespace-collapsed text; offsets reported are into the RAW file text (whitespace-insensitive
search maps back to the raw offset), so rlib.find_quote can locate the same passage.
"""
import glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib

R = rlib.ROOT
CORP = {
    'ws9': [R + '/tmp/library/ws9/*.txt', R + '/tmp/library/ws9/prior/*.txt'],
    'or27': [R + '/tmp/library/or27/*_djvu.txt'],
    'or27b': [R + '/tmp/fence-1/dl/or27_w2/*.txt'],
    'nps': [R + '/tmp/library/web/nps/*/*.txt'],
    'ca': [R + '/tmp/library/web/ca/pages/*/*/*/*.txt'],
    'retry': [R + '/tmp/library/web/retry/**/*.txt', R + '/tmp/library/web/retry/**/*_djvu.txt'],
    'misc': [R + '/tmp/library/misc/*.txt'],
}


def files_for(spec):
    out = []
    keys = list(CORP) if spec == 'all' else spec.split(',')
    for k in keys:
        for pat in CORP[k]:
            for f in sorted(glob.glob(pat, recursive=True)):
                if f.endswith('.layout.txt'):
                    continue
                if f not in out:
                    out.append(f)
    return out


def collapse_map(text):
    """collapse whitespace; return (collapsed, index map from collapsed pos to raw pos)"""
    out = []
    idx = []
    prev_ws = False
    for i, ch in enumerate(text):
        if ch.isspace():
            if not prev_ws:
                out.append(' ')
                idx.append(i)
            prev_ws = True
        else:
            out.append(ch)
            idx.append(i)
            prev_ws = False
    return ''.join(out), idx


def search(corpora, pattern, ctx=160, maxn=20, files_sub=None, flags=re.I):
    rx = re.compile(pattern, flags)
    n = 0
    results = []
    for f in files_for(corpora):
        if files_sub and files_sub not in f:
            continue
        try:
            raw = rlib.file_text(f)
        except Exception:
            continue
        col, idx = collapse_map(raw)
        hits = 0
        for m in rx.finditer(col):
            hits += 1
            a = max(0, m.start() - ctx)
            b = min(len(col), m.end() + ctx)
            results.append((f, idx[m.start()], col[a:b], hits))
            n += 1
            if hits >= maxn:
                break
    return results


if __name__ == '__main__':
    a = sys.argv[1:]
    corp, pat = a[0], a[1]
    ctx = int(a[a.index('--ctx') + 1]) if '--ctx' in a else 160
    mx = int(a[a.index('--max') + 1]) if '--max' in a else 8
    fs = a[a.index('--files') + 1] if '--files' in a else None
    fl = re.I if ('--cs' not in a) else 0
    tot = {}
    for f, off, snip, k in search(corp, pat, ctx, mx, fs, fl):
        tot[f] = tot.get(f, 0) + 1
        print('%s @%d #%d\n   ...%s...' % (os.path.relpath(f, R), off, k, snip))
    print('---- files with hits:', len(tot), ' hits shown:', sum(tot.values()))
