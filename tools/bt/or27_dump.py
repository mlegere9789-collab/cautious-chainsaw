"""Dump one OR27 index record (or a search window) as normalized text with printed-page markers.
   python -I tools/bt/or27_dump.py OR27-2-R441 [--out FILE] [--wrap N]
Markers: [[p.N]] at a recovered running head (page N starts here); gaps in recovered heads are shown as [[p.lo-hi?]].
"""
import os, re, sys, json, bisect, textwrap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import INDEX_PATH, utf8_stdout
utf8_stdout()
IDX = {r['id']: r for r in json.load(open(INDEX_PATH, encoding='utf-8'))['records']}

def dump(rid, wrap=0):
    r = IDX[rid]
    P = F.get_part(r['part'])
    a = bisect.bisect_left(P.nmap, r['start_offset'])
    b = bisect.bisect_left(P.nmap, r['end_offset'])
    marks = []
    for i, off in enumerate(P.pm.offs):
        if r['start_offset'] <= off < r['end_offset']:
            ni = bisect.bisect_left(P.nmap, off)
            nxt = P.pm.pages[i + 1] if i + 1 < len(P.pm.pages) else P.pm.pages[i]
            p = P.pm.pages[i]
            tag = '[[p.%d]]' % p if nxt - p <= 1 else '[[p.%d-%d?]]' % (p, nxt - 1)
            marks.append((ni, tag))
    first = P.pm.page_at(r['start_offset'])
    out = []
    pos = a
    out.append('### %s | %s %s | start p.%s (%s) | OCR %s\n' % (rid, r.get('rank') or '', r.get('author') or r.get('toc_text'), first['page'], first['conf'], r['ocr']['grade']))
    out.append('[[p.%d%s]] ' % (first['page'], '' if first['conf'].startswith(('head', 'front')) else '~ (%s-%s)' % (first['lo'], first['hi'])))
    for ni, tag in marks:
        if ni < pos: continue
        out.append(P.ntext[pos:ni]); out.append(' ' + tag + ' '); pos = ni
    out.append(P.ntext[pos:b])
    s = ''.join(out)
    if wrap:
        s = '\n'.join(textwrap.fill(l, wrap) for l in s.split('\n'))
    return s

if __name__ == '__main__':
    args = sys.argv[1:]
    outf = None; wrap = 0
    if '--out' in args:
        i = args.index('--out'); outf = args[i + 1]; del args[i:i + 2]
    if '--wrap' in args:
        i = args.index('--wrap'); wrap = int(args[i + 1]); del args[i:i + 2]
    s = '\n\n'.join(dump(a, wrap) for a in args)
    if outf:
        open(outf, 'w', encoding='utf-8').write(s); print('wrote', outf, len(s))
    else:
        print(s)
