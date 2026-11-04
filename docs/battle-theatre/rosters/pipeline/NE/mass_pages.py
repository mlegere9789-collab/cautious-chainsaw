import re, sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
import os

HEAD_L = re.compile(r'^\s*(\d{1,3})\s{2,}([A-Z][A-Z\.\s,\-\(\)\"\']{8,})$')
HEAD_R = re.compile(r'^\s*([A-Z][A-Z\.\s,\-\(\)\"\']{8,}?)\s{2,}(\d{1,3})\s*$')


def volume_lines(vol):
    ident = 'massachusettssol%d1931mass' % vol
    p = os.path.join(f.CACHE, ident + '_djvu.txt')
    return open(p, encoding='utf-8', errors='replace').read().split('\n')


def paginate(vol):
    """returns list of (book_page, header_text, line_index) for accepted running heads."""
    L = volume_lines(vol)
    heads = []
    for i, ln in enumerate(L):
        m = HEAD_L.match(ln)
        pg = None
        txt = None
        if m:
            pg, txt = int(m.group(1)), m.group(2)
        else:
            m = HEAD_R.match(ln)
            if m:
                pg, txt = int(m.group(2)), m.group(1)
        if pg is None:
            continue
        if not re.search(r'REGIMENT|BATTERY|BATTALION|COMPANY|CAVALRY|ARTILLERY|INFANTRY|SHARPSHOOTERS|UNATTACHED|CADETS|RIFLES', txt):
            continue
        heads.append((pg, txt.strip(), i))
    # monotonic filter: keep a head if page is within +0..+3 of the previous accepted, or accept restarts
    acc = []
    for pg, txt, i in heads:
        if not acc:
            acc.append((pg, txt, i))
            continue
        last = acc[-1][0]
        if last <= pg <= last + 4:
            acc.append((pg, txt, i))
    return L, acc


if __name__ == '__main__':
    vol = int(sys.argv[1])
    L, acc = paginate(vol)
    print(len(L), len(acc))
    for a in acc[:10]:
        print(a)
    print(acc[-3:])
    # unit order by first appearance of header text stem
    seen = []
    for pg, txt, i in acc:
        stem = re.sub(r'\s+', ' ', txt)
        stem = re.sub(r'^\d+\s*', '', stem)
        if stem not in seen:
            seen.append(stem)
            print(pg, i, stem)
