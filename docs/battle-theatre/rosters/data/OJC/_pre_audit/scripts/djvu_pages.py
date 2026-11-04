import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re, json
from ojc_common import *
WORD = re.compile(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>(.*?)</WORD>')
def unesc(s):
    return s.replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'").replace('&lt;', '<').replace('&gt;', '>')
def pages(path):
    cur = 0; words = []
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if '<OBJECT' in line:
                if cur: yield cur, words
                cur += 1; words = []
            for m in WORD.finditer(line):
                x0, yb, x1, yt = map(int, m.groups()[:4])
                words.append([x0, yt, x1, yb, unesc(m.group(5)).strip()])
        if cur: yield cur, words
if __name__ == '__main__':
    src = sys.argv[1]
    out = {}
    for i, w in pages(os.path.join(CACHE, src + '_djvu.xml')):
        out[i] = w
    json.dump(out, open(os.path.join(CACHE, src + '.pages.json'), 'w'))
    print(src, len(out))
