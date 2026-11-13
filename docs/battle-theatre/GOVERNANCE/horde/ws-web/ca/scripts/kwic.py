#!/usr/bin/env python3
"""Keyword-in-context over saved Chronicling America page texts.

Usage:
  python3 -I kwic.py PAGE_ID_OR_GLOB 'regex' [--w 300] [--max 12] [--flags i]
  PAGE_ID like sn83030213/1863-11-20/ed-1/seq-1 ; GLOB like 'sn83030213/1863-11-2*/*/*' (matched against page ids)
  --score: print only the number of matches per page.
The text is shown with whitespace collapsed (and end-of-line hyphens joined) so a window can be copied
into a quote; offsets are positions in that collapsed text.
"""
import fnmatch, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib


def all_page_ids():
    out = []
    for root, _, files in os.walk(calib.PAGES_DIR):
        for f in files:
            if f.endswith('.txt'):
                p = os.path.join(root, f)
                out.append(os.path.relpath(p, calib.PAGES_DIR)[:-4])
    return sorted(out)


def main():
    args = sys.argv[1:]
    pat = args[0]
    rx = re.compile(args[1], re.I if ('--flags' in args and 'i' in args[args.index('--flags') + 1]) or '--i' in args else 0)
    w = int(args[args.index('--w') + 1]) if '--w' in args else 300
    mx = int(args[args.index('--max') + 1]) if '--max' in args else 12
    score = '--score' in args
    ids = [i for i in all_page_ids() if fnmatch.fnmatch(i, pat)]
    for pid in ids:
        t = calib.norm(calib.page_text(pid), dehyphen=True)
        ms = list(rx.finditer(t))
        if score:
            if ms:
                print('%5d  %s' % (len(ms), pid))
            continue
        if not ms:
            continue
        print('=' * 8, pid, '(%d matches, %d chars)' % (len(ms), len(t)))
        last_end = -1
        shown = 0
        for m in ms:
            if m.start() < last_end:
                continue
            a, b = max(0, m.start() - w), min(len(t), m.end() + w)
            print('[%d..%d] %s' % (a, b, t[a:b]))
            print('-')
            last_end = b
            shown += 1
            if shown >= mx:
                break


if __name__ == '__main__':
    main()
