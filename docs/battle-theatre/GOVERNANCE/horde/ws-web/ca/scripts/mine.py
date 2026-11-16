#!/usr/bin/env python3
"""Mine the saved Chronicling America page texts for passages (regular expressions), one report file per topic.

Usage: python3 -I mine.py TOPIC 'DATE_FROM' 'DATE_TO' 'regex' ['regex' ...] [--w 260] [--max 6] [--lccn sn83030313,sn83030213]
Writes tmp/library/web/ca/mining/TOPIC.txt: for every saved page of the window that matches, the windows around the matches
(whitespace collapsed, line-end hyphens joined, so a window can be copied into a quote) with the page id and the offset.
Local only: no request is made.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib


def main():
    a = sys.argv[1:]
    topic, d0, d1 = a[0], a[1], a[2]
    rest = a[3:]
    w, mx, lccns = 260, 6, None
    pats = []
    i = 0
    while i < len(rest):
        if rest[i] == '--w':
            w = int(rest[i + 1]); i += 2
        elif rest[i] == '--max':
            mx = int(rest[i + 1]); i += 2
        elif rest[i] == '--lccn':
            lccns = set(rest[i + 1].split(',')); i += 2
        else:
            pats.append(rest[i]); i += 1
    rxs = [re.compile(p, re.I) for p in pats]
    man = calib.load_manifest()
    out = os.path.join(calib.TMP, 'mining', topic + '.txt')
    n_pages = n_hits = 0
    with open(out, 'w', encoding='utf-8') as f:
        f.write('# topic %s window %s..%s patterns %r\n' % (topic, d0, d1, pats))
        for pid, m in sorted(man.items(), key=lambda kv: (kv[1]['date'], kv[1]['lccn'], kv[1]['seq'])):
            if not (d0 <= m['date'] <= d1):
                continue
            if lccns and m['lccn'] not in lccns:
                continue
            p = calib.page_paths(pid)[0]
            if not os.path.exists(p):
                continue
            t = calib.norm(calib.page_text(pid), dehyphen=True)
            hit = False
            for rx in rxs:
                last = -1
                shown = 0
                for mm in rx.finditer(t):
                    if mm.start() < last:
                        continue
                    if not hit:
                        f.write('\n===== %s  %s (%s) %d chars\n' % (pid, m['paper'], m['date'], len(t)))
                        hit = True
                        n_pages += 1
                    s, e = max(0, mm.start() - w), min(len(t), mm.end() + w)
                    f.write('  [%d..%d] /%s/ %s\n' % (s, e, rx.pattern[:30], t[s:e]))
                    n_hits += 1
                    last = e
                    shown += 1
                    if shown >= mx:
                        break
    print('%d pages, %d windows -> %s' % (n_pages, n_hits, os.path.relpath(out, calib.ROOT)))


if __name__ == '__main__':
    main()
