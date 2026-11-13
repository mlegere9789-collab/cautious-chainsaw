#!/usr/bin/env python3
"""Read the saved National Park Service texts by keyword and sentence number.

All commands take a source id (e.g. NPS-CLR-1STDAY) and read tmp/library/web/nps/<id>/<id>.txt
(reading-order text, one '=== PAGE n ===' marker per PDF page). Sentences are numbered per page
with the same splitter build_extracts.py uses for its '#s<a>-<b>' anchors, so a number printed
here is the number to put in an extract definition line.

  kwic.py grep    SRC REGEX [-p A-B] [-n MAX] [-w WIDTH]   sentences matching REGEX (case-insensitive)
  kwic.py page    SRC A[-B] [-w WIDTH]                      every sentence of pages A..B, numbered
  kwic.py density SRC REGEX [-t MIN]                        pages with at least MIN matches
  kwic.py heads   SRC [-p A-B]                              short title-like lines (to find chapters)
  options before the command: -L layout text, -R content-stream-order text, -S standard text (default: the source's
  default_variant in sources.json, else standard)

Run with python3 -I.
"""
import argparse, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')

_spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
_be = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_be)
norm, split_sentences, printed_page = _be.norm, _be.split_sentences, _be.printed_page


def load(sid, variant='default'):
    if variant == 'default':
        try:
            variant = {x['id']: x for x in json.load(open(os.path.join(HERE, '..', 'sources.json')))['sources']}[sid].get('default_variant')
        except (KeyError, OSError):
            variant = None
    try:
        return _be.pages(sid, variant)[0]
    except SystemExit as e:
        sys.exit(str(e))


def prange(s, n):
    if not s:
        return 1, n
    a, _, b = s.partition('-')
    return int(a), int(b or a)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    ap.add_argument('-L', action='store_true', help='read the layout text')
    ap.add_argument('-R', action='store_true', help='read the content-stream-order text (rawtext.py), line-end hyphenation repaired')
    ap.add_argument('-S', action='store_true', help='read the standard reading-order text')
    g = sub.add_parser('grep'); g.add_argument('src'); g.add_argument('regex'); g.add_argument('-p'); g.add_argument('-n', type=int, default=60); g.add_argument('-w', type=int, default=420)
    q = sub.add_parser('page'); q.add_argument('src'); q.add_argument('pages'); q.add_argument('-w', type=int, default=2000)
    d = sub.add_parser('density'); d.add_argument('src'); d.add_argument('regex'); d.add_argument('-t', type=int, default=3)
    h = sub.add_parser('heads'); h.add_argument('src'); h.add_argument('-p')
    a = ap.parse_args()
    pages = load(a.src, 'layout' if a.L else 'raw' if a.R else None if a.S else 'default')
    last = max(pages)
    if a.cmd == 'grep':
        lo, hi = prange(a.p, last)
        rx = re.compile(a.regex, re.I)
        shown = 0
        for p in sorted(pages):
            if p < lo or p > hi:
                continue
            flat = norm(pages[p])
            for i, s in enumerate(split_sentences(flat), 1):
                if rx.search(s):
                    pp = printed_page(pages[p])
                    print('p%d.s%d%s: %s' % (p, i, (' [%s]' % pp.replace('Page ', '')) if pp else '', s if len(s) <= a.w else s[:a.w] + ' ...'))
                    shown += 1
                    if shown >= a.n:
                        print('... stopped at %d matches (-n)' % a.n)
                        return
    elif a.cmd == 'page':
        lo, hi = prange(a.pages, last)
        for p in range(lo, hi + 1):
            if p not in pages:
                print('--- page %d: not in text' % p)
                continue
            flat = norm(pages[p])
            pp = printed_page(pages[p])
            print('--- PDF page %d%s: %d characters' % (p, (' [%s]' % pp) if pp else '', len(flat)))
            for i, s in enumerate(split_sentences(flat), 1):
                print('s%d: %s' % (i, s if len(s) <= a.w else s[:a.w] + ' ...'))
    elif a.cmd == 'density':
        rx = re.compile(a.regex, re.I)
        out = []
        for p in sorted(pages):
            n = len(rx.findall(pages[p]))
            if n >= a.t:
                out.append('%d:%d' % (p, n))
        print(' '.join(out) if out else 'no page with >= %d matches' % a.t)
    elif a.cmd == 'heads':
        lo, hi = prange(a.p, last)
        for p in sorted(pages):
            if p < lo or p > hi:
                continue
            for ln in pages[p].split('\n'):
                t = ln.strip()
                if 4 <= len(t) <= 90 and not t.endswith(('.', ',', ';')) and (t.isupper() or re.match(r'^(Chapter|Part|Section|[IVX]+\.|[A-Z]\.|\d+\.)\s', t) or (t[0].isupper() and len(t.split()) <= 9 and sum(1 for w in t.split() if w[0].isupper()) >= max(2, len(t.split()) - 2))):
                    if not re.search(r'Page \d+ of \d+|Cultural Landscape', t):
                        print('p%d: %s' % (p, t))


if __name__ == '__main__':
    main()
