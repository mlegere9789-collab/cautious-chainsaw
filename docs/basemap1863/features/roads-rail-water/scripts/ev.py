"""ev.py REGEX [files...] : evidence grep with PDF page numbers (text extracted from NPS PDFs in tmp/b1863/roads/cache/txt)."""
import re, sys, os, glob
from common import *
T = os.path.join(CACHE, 'txt')
def search(rx, files=None, ctx=1, maxn=40, width=300):
    files = files or sorted(glob.glob(os.path.join(T, '*.txt')))
    n = 0
    for f in files:
        if not os.path.isabs(f): f = os.path.join(T, f if f.endswith('.txt') else f + '.txt')
        txt = open(f, encoding='utf8', errors='ignore').read()
        pages = re.split(r'\n=====PAGE (\d+)=====\n', txt)
        # pages[0] preface, then (num, text) pairs
        for i in range(1, len(pages), 2):
            pg = pages[i]; body = pages[i + 1]
            flat = re.sub(r'\s+', ' ', body)
            for m in re.finditer(rx, flat, re.I):
                a = max(0, m.start() - width); b = min(len(flat), m.end() + width)
                print(f"[{os.path.basename(f)[:-4]} p{pg}] ...{flat[a:b]}...")
                n += 1
                if n >= maxn: return
if __name__ == '__main__':
    rx = sys.argv[1]; files = sys.argv[2:] or None
    search(rx, files, maxn=int(os.environ.get('MAXN', 30)), width=int(os.environ.get('W', 300)))
