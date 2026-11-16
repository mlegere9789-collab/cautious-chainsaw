#!/usr/bin/env python3
"""Print the main content of a saved nps.gov page (navigation header and footer stripped).

  webmain.py ID [ID...]      print the main text of each page (tmp/library/web/nps/pages/<ID>/<ID>.txt)
  webmain.py --list          list the ids of all saved pages with the size of the main text
The standard text of a page (the file build_extracts.py cuts quotes from) is NOT altered; this only helps reading.
Run with python3 -I.
"""
import glob, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '..', '..'))
PAGES = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps', 'pages')


def main_text(raw):
    t = raw
    i = t.find('Contact Us')
    if i >= 0:
        t = t[i + len('Contact Us'):]
    for stop in ('Last updated:', 'Did You Know?', 'Park footer', 'Contact Info', 'Visiting Information', 'Stay Connected'):
        j = t.find(stop)
        if j > 0:
            t = t[:j]
    return re.sub(r'\n{3,}', '\n\n', t).strip()


def main():
    a = sys.argv[1:]
    if a and a[0] == '--list':
        for d in sorted(glob.glob(os.path.join(PAGES, '*'))):
            sid = os.path.basename(d)
            p = os.path.join(d, sid + '.txt')
            if os.path.exists(p):
                print('%6d %s' % (len(main_text(open(p, encoding='utf-8').read())), sid))
        return
    for sid in a:
        p = os.path.join(PAGES, sid, sid + '.txt')
        print('=' * 20, sid)
        print(main_text(open(p, encoding='utf-8').read()))


if __name__ == '__main__':
    main()
