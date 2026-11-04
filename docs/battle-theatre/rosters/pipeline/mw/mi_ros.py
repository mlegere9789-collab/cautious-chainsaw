"""Parser for the Record of Service of Michigan Volunteers (1905), one volume per regiment: running prose entries, alphabetical.
usage: mi_ros.py <pages.json> <first_page> <last_page> <regiment ordinal word e.g. Third> <out.json>
Each entry: 'Surname, Given [, residence]. Enlisted in company X, Third Infantry, [as Rank,] date, at place, for 3 years, age N. Mustered date. <events>.'"""
import json, re, sys
from collections import Counter

pages_json, FIRST, LAST, ORD, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
P = json.load(open(pages_json))


def lines_of(words):
    ws = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    lines = []; cur = []; last = None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if last is not None and yc - last > 18:
            lines.append(cur); cur = []
        cur.append(w); last = yc if not cur[:-1] else (last * 0.5 + yc * 0.5)
    if cur:
        lines.append(cur)
    out = []
    for l in lines:
        l.sort(key=lambda w: w[0])
        out.append((' '.join(w[4] for w in l), l[0][0]))
    return out


HEAD = re.compile(r"^[\.\s]*([A-Z][A-Za-z'\-]+(?:\s*(?:or|Mc|Mac|De|Van|La|St\.)\s*[A-Z][A-Za-z'\-]+)?),\s+([A-Z][A-Za-z\.\-' ]*?)(?:,\s+([A-Z][^\.]*?))?\.\s+(\w{0,4}listed|Commissioned|Joined|Appointed|Drafted|Re-enlisted|Reenlisted|See\s|Also\s)")
FURN = re.compile(r"^(Michigan\s+Volunteers|MICHIGAN\s+VOLUNTEERS|[A-Z]+\s+INFANTRY|\d+\s+[A-Z]+\s+INFANTRY|INTRODUCT|\W*\d+\W*$)")

entries = []; cur = None
for pn in range(FIRST, LAST + 1):
    words = P.get(str(pn))
    if not words:
        continue
    ls = lines_of(words)
    for i, (txt, x0) in enumerate(ls):
        t = re.sub(r'\s+', ' ', txt).strip()
        if not t or FURN.match(t) and len(t) < 60:
            continue
        nxt = ' '.join(re.sub(r'\s+', ' ', q[0]) for q in ls[i:i + 3])
        m = HEAD.match(nxt)
        if m and (x0 < 400):
            cur = dict(page=pn, surname=m.group(1), given=m.group(2).strip(' ,'), place=(m.group(3) or '').strip(), text=t)
            entries.append(cur)
        elif cur is not None:
            cur['text'] += ' ' + t
json.dump(entries, open(OUT, 'w'), indent=0)
print(len(entries), 'entries; pages', FIRST, LAST)
