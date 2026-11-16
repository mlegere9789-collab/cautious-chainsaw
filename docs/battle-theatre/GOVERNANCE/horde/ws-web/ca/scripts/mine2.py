#!/usr/bin/env python3
"""Mine the saved Chronicling America pages for windows around regular-expression matches, dropping reprinted duplicates.

Usage: python3 -I mine2.py TOPIC DATE_FROM DATE_TO REGEX [REGEX ...] [--w 220] [--max 4] [--lccn a,b] [--all]
Output: tmp/library/web/ca/mining/TOPIC.txt. A window whose words are at least 55 percent shared (word 4-grams, OCR noise tolerant:
letters and digits only, lower case) with a window already shown is not shown again: its page id is listed after the shown one
('also in:'). --all shows every window. Local only; no request is made.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib


def grams(s):
    t = re.findall(r'[a-z0-9]+', s.lower())
    return {' '.join(t[i:i + 3]) for i in range(max(0, len(t) - 2))}


def main():
    a = sys.argv[1:]
    topic, d0, d1 = a[0], a[1], a[2]
    rest = a[3:]
    w, mx, lccns, show_all = 220, 4, None, False
    pats = []
    i = 0
    while i < len(rest):
        if rest[i] == '--w':
            w = int(rest[i + 1]); i += 2
        elif rest[i] == '--max':
            mx = int(rest[i + 1]); i += 2
        elif rest[i] == '--lccn':
            lccns = set(rest[i + 1].split(',')); i += 2
        elif rest[i] == '--all':
            show_all = True; i += 1
        else:
            pats.append(rest[i]); i += 1
    rxs = [re.compile(p, re.I) for p in pats]
    man = calib.load_manifest()
    shown = []          # (grams, index into entries)
    entries = []        # dict(pid, paper, date, s, e, text, also)
    for pid, m in sorted(man.items(), key=lambda kv: (kv[1]['date'], kv[1]['lccn'], kv[1]['seq'])):
        if not (d0 <= m['date'] <= d1):
            continue
        if lccns and m['lccn'] not in lccns:
            continue
        p = calib.page_paths(pid)[0]
        if not os.path.exists(p):
            continue
        t = calib.norm(calib.page_text(pid), dehyphen=True)
        for rx in rxs:
            last, cnt = -1, 0
            for mm in rx.finditer(t):
                if mm.start() < last:
                    continue
                s, e = max(0, mm.start() - w), min(len(t), mm.end() + w)
                txt = t[s:e]
                last = e
                cnt += 1
                g = grams(txt)
                dup = None
                if not show_all and g:
                    for gg, idx in shown:
                        if len(g & gg) / float(min(len(g), len(gg))) >= 0.55:
                            dup = idx
                            break
                if dup is not None:
                    if pid not in entries[dup]['also'] and pid != entries[dup]['pid']:
                        entries[dup]['also'].append(pid)
                    continue
                entries.append(dict(pid=pid, paper=m['paper'], date=m['date'], s=s, e=e, text=txt, also=[], pat=rx.pattern[:40]))
                shown.append((g, len(entries) - 1))
                if cnt >= mx:
                    break
    out = os.path.join(calib.TMP, 'mining', topic + '.txt')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('# topic %s window %s..%s patterns %r\n' % (topic, d0, d1, pats))
        for k, en in enumerate(entries, 1):
            f.write('\n#%d %s | %s | [%d..%d] /%s/\n%s\n' % (k, en['pid'], en['date'], en['s'], en['e'], en['pat'], en['text']))
            if en['also']:
                f.write('  also in: %s\n' % '; '.join(en['also'][:14]))
    print('%d distinct windows -> %s' % (len(entries), os.path.relpath(out, calib.ROOT)))


if __name__ == '__main__':
    main()
