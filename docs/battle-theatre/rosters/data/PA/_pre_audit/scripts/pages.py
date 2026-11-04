"""djvu.xml -> compact per-page word boxes. usage: pages.py 01   (vol id as in file name)
Writes tmp/library/rosters/PA/derived/<vol>.pages.json = {"w":[...page widths], "pages": {idx: [[x0,ytop,x1,ybot,text,conf],...]}}"""
import sys, os, re, json, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

vol = sys.argv[1]
ident = 'historyofpennsyl%sbate' % vol
src = os.path.join(C.CACHE, ident, ident + '_djvu.xml')
dst_dir = os.path.join(C.CACHE, 'derived')
os.makedirs(dst_dir, exist_ok=True)
word_re = re.compile(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)"(?: x-confidence="(\d+)")?[^>]*>(.*?)</WORD>')
obj_re = re.compile(r'<OBJECT[^>]*width="(\d+)" height="(\d+)"')
pages = {}
sizes = {}
skew = {}
lines_cur = []
lines_slopes = []
cur = 0
with open(src, encoding='utf-8', errors='replace') as f:
    for line in f:
        if '</LINE>' in line:
            if len(lines_cur) >= 4 and lines_cur[-1][0] - lines_cur[0][0] > 300:
                import statistics
                xs = [w[0] for w in lines_cur]; ys = [w[3] for w in lines_cur]
                mx, my = statistics.mean(xs), statistics.mean(ys)
                den = sum((x - mx) ** 2 for x in xs)
                if den > 0:
                    lines_slopes.append(sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den)
            lines_cur = []
            continue
        if '<OBJECT' in line:
            if cur and lines_slopes:
                import statistics
                skew[cur] = statistics.median(lines_slopes)
            lines_slopes = []
            cur += 1
            m = obj_re.search(line)
            sizes[cur] = (int(m.group(1)), int(m.group(2))) if m else None
            pages[cur] = []
            continue
        if '<WORD' in line:
            m = word_re.search(line)
            if m:
                x0, yb, x1, yt = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
                wd = [x0, yt, x1, yb, html.unescape(m.group(6)).strip(), int(m.group(5) or 0)]
                pages[cur].append(wd)
                lines_cur.append(wd)
if cur and lines_slopes:
    import statistics
    skew[cur] = statistics.median(lines_slopes)
json.dump({'sizes': sizes, 'skew': skew, 'pages': pages}, open(os.path.join(dst_dir, vol + '.pages.json'), 'w'), separators=(',', ':'))
print(vol, cur, 'pages', sum(len(v) for v in pages.values()), 'words')
