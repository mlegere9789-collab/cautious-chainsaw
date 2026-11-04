"""Bates History of Pennsylvania Volunteers: word boxes -> table rows (name | rank | date of muster | remarks).
usage: layout.py <vol>   -> tmp/library/rosters/PA/derived/<vol>.rows.json
Columns are located per page from the x of the month words in the date column (dx); rank is at dx-155..-175,
name left of that, remarks start at dx+340. Rows start where a line has a name or a month in the date column;
lines with only remark words continue the row above (same page, or the previous page for the first line)."""
import sys, os, re, json, statistics, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
import dates as D2

ONES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth',
        'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth']
TENS = {20: 'twentieth', 30: 'thirtieth', 40: 'fortieth', 50: 'fiftieth', 60: 'sixtieth', 70: 'seventieth', 80: 'eightieth', 90: 'ninetieth'}
TENS_P = {20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'}


def ordinal(n):
    if n >= 100:
        h = 'one hundred'
        r = n - 100
        if r == 0:
            return 'one hundredth'
        return h + ' and ' + ordinal(r)
    if n < 20:
        return ONES[n]
    if n % 10 == 0:
        return TENS[n]
    return TENS_P[n - n % 10] + '-' + ONES[n % 10]


ORD = {n: re.sub(r'[^a-z]', '', ordinal(n)) for n in range(1, 216)}
MONTH = re.compile(r"^(jan|feb|mar|apr|may|mav|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\.,]?$", re.I)


def is_company_heading(full):
    import difflib
    m = re.match(r'^(\S{3,9})\s+([A-Za-z0-9]{1,2})\W*$', full.strip())
    if not m:
        return False
    w = m.group(1).lower().strip('.')
    return max(difflib.SequenceMatcher(None, w, 'company').ratio(), difflib.SequenceMatcher(None, w, 'battery').ratio()) >= 0.62


def norm_letters(s):
    return re.sub(r'[^a-z]', '', s.lower())


def regiment_from_head(text):
    """running-head band text -> (n, score) when an ordinal name is followed by a token like 'regiment', else (None, 0)"""
    import difflib
    toks = [re.sub(r'[^a-z]', '', t.lower()) for t in re.split(r'\s+', text)]
    toks = [t for t in toks if t]
    best = (None, 0)
    for i in range(len(toks)):
        acc = ''
        for j in range(i, min(len(toks), i + 6)):
            acc += toks[j]
            nxt = toks[j + 1] if j + 1 < len(toks) else ''
            if not (4 <= len(acc) <= 40) or not nxt:
                continue
            if difflib.SequenceMatcher(None, nxt, 'regiment').ratio() < 0.62:
                continue
            for n, o in ORD.items():
                if abs(len(o) - len(acc)) > 4:
                    continue
                if n >= 100 and j - i + 1 < 3:
                    continue
                r = difflib.SequenceMatcher(None, acc, o).ratio()
                if r > best[1]:
                    best = (n, r)
    return best


def baseline_clusters(words, tol=13):
    ws = sorted(words, key=lambda w: w[3])
    cl = []
    for w in ws:
        if cl and abs(w[3] - statistics.mean(x[3] for x in cl[-1])) <= tol:
            cl[-1].append(w)
        else:
            cl.append([w])
    for c in cl:
        c.sort(key=lambda w: w[0])
    return cl


def main(vol):
    d = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.pages.json')))
    pages = d['pages']
    sizes = d['sizes']
    out = []
    pageinfo = {}
    state = dict(n=None, nscore=0, section=None, company_idx=-1, last_dx=None)
    last_row = None
    for pi in sorted(pages, key=int):
        words = [w for w in pages[pi] if w[4]]
        if len(words) < 5:
            continue
        W = (sizes.get(pi) or sizes.get(int(pi)) or [2300])[0]
        # --- running head (top band): words with baseline < 330
        head = [w for w in words if w[3] < 285]
        htxt = ' '.join(w[4] for w in sorted(head, key=lambda w: (w[0])))
        n, sc = regiment_from_head(htxt)
        ndet = n if (n and sc >= 0.86) else None
        # --- date column anchor
        mx = [w[0] for w in words if MONTH.match(w[4]) and 0.27 * W < w[0] < 0.50 * W]
        if len(mx) >= 3:
            dx = statistics.median(mx)
            state['last_dx'] = dx
        elif state['last_dx'] is not None and any(abs(x - state['last_dx']) < 80 for x in mx):
            dx = state['last_dx']
        else:
            dx = None
        body = [w for w in words if w[3] >= 340]
        svc = None
        mm = re.search(r"(three|nine|one|six|twelve|two|four|five)\s*(years?|months?|year's|years')", ' '.join(w[4] for w in head), re.I)
        if mm:
            svc = norm_letters(mm.group(1) + mm.group(2))[:12]
        elif re.search(r'serv', htxt, re.I):
            svc = 'service?'
        pageinfo[int(pi)] = dict(ndet=ndet, n=None, head=htxt[:80], svc=svc, dx=int(dx) if dx else None, nmonth=len(mx))
        import difflib as _dl
        hl = re.sub(r'[^a-z]', '', htxt.lower())
        if 8 <= len(hl) <= 22 and _dl.SequenceMatcher(None, hl, 'burialrecord').ratio() >= 0.6:
            pageinfo[int(pi)]['burial_record'] = True
            pageinfo[int(pi)]['narrative'] = True
            last_row = None
            continue
        if dx is None:
            last_row = None
            continue
        nx = dx - 592
        left = sorted(w[0] for w in words if w[0] < dx - 215 and w[3] > 340 and len(w[4]) >= 2)
        if len(left) >= 8:
            p10 = left[len(left) // 10]
            near_l = [x for x in left if p10 - 5 <= x <= p10 + 25]
            if near_l:
                nx = statistics.median(near_l)
        # remarks column start: x0 of the first word after the year token of each dated row (mode per page)
        yr_re = re.compile(r"^['‘’`\"]?(?:18)?[5-6GO]\d[,;\.]*$|^['‘’`\"]?G\w[,;\.]*$")
        xs_rem = []
        for wy in words:
            if dx + 90 < wy[0] < dx + 420 and yr_re.match(wy[4]):
                cands = [w2 for w2 in words if abs(w2[3] - wy[3]) < 22 and w2[0] > wy[2] + 5 and w2[0] < dx + 520]
                cands.sort(key=lambda w2: w2[0])
                for w2 in cands:
                    if re.fullmatch(r"[0-9]", w2[4]):
                        continue
                    xs_rem.append(w2[0])
                    break
        if len(xs_rem) >= 5:
            hist = collections.Counter(int(x // 12) for x in xs_rem)
            mode_bin = hist.most_common(1)[0][0]
            near = [x for x in xs_rem if abs(x // 12 - mode_bin) <= 1]
            rx = statistics.median(near) - 28
            state['last_rx_off'] = rx - dx
        elif state.get('last_rx_off') is not None:
            rx = dx + state['last_rx_off']
        else:
            rx = dx + 320
        # 1. headings / column heads: centred lines found by baseline clusters
        keep = []
        for c in baseline_clusters(body, tol=14):
            y = int(statistics.mean(w[3] for w in c))
            full = ' '.join(w[4] for w in c)
            has_month = any(MONTH.match(w[4]) for w in c if w[0] > dx - 60)
            centred = c[0][0] > nx + 250 and not has_month and not any(w[0] < nx + 120 for w in c)
            letters = [ch for ch in full if ch.isalpha()]
            upper = sum(ch.isupper() for ch in letters) / max(1, len(letters))
            if centred and is_company_heading(full) and len(c) <= 3:
                out.append(dict(kind='heading', sub='company', text=full, page=int(pi), y=y, n=None))
                last_row = None
                continue
            if centred and re.search(r'field\s*and\s*staff|non-?\s*commissioned\s*staff|^\s*band\b|unassigned|musicians?|^\s*recruits?\b|supplement', full, re.I) and len(full) < 70:
                out.append(dict(kind='heading', sub='other', text=full, page=int(pi), y=y, n=None))
                last_row = None
                continue
            if not has_month and upper > 0.6 and y < 900 and re.search(r'name|rank|remar|muster|service|date|kamb|wame|eemar|term', full, re.I) and len(full) < 90:
                out.append(dict(kind='colhead', text=full, page=int(pi), y=y, n=None))
                continue
            if centred and re.search(r'recruit|raised|organized|enrolled', full, re.I):
                out.append(dict(kind='heading', sub='recruited', text=full, page=int(pi), y=y, n=None))
                continue
            if centred and len(full) < 4:
                continue
            keep.extend(c)
        # 2. anchors: name-start words, then date-only anchors
        starts = sorted([w for w in keep if abs(w[0] - nx) < 45 and w[0] < dx - 215], key=lambda w: w[3])
        anchors = []
        for w in starts:
            if anchors and w[3] - anchors[-1] < 14:
                continue
            anchors.append(w[3])
        for w in sorted([w for w in keep if MONTH.match(w[4]) and dx - 60 <= w[0] < dx + 100], key=lambda w: w[3]):
            if not any(abs(a - w[3]) < 24 for a in anchors):
                anchors.append(w[3])
        anchors.sort()
        rows_here = [dict(kind='row', n=None, page=int(pi), y=a, words=[], dx=int(dx)) for a in anchors]
        lead = []
        import bisect
        for w in keep:
            k = bisect.bisect_right(anchors, w[3] + 16) - 1
            if k < 0:
                lead.append(w)
            else:
                rows_here[k]['words'].append(w)

        def fields(ws):
            cols = {'name': [], 'rank': [], 'date': [], 'rem': []}
            for w in ws:
                x = w[0]
                k = 'name' if x < dx - 215 else 'rank' if x < dx - 60 else 'date' if x < rx else 'rem'
                cols[k].append(w)
            res = {}
            for k, v in cols.items():
                v.sort(key=lambda w: w[3])
                grp = []
                for w in v:
                    if grp and abs(w[3] - statistics.mean(x[3] for x in grp[-1])) <= 20:
                        grp[-1].append(w)
                    else:
                        grp.append([w])
                res[k] = ' '.join(w[4] for g in grp for w in sorted(g, key=lambda w: w[0])).strip()
            return res
        for r in rows_here:
            f = fields(r.pop('words'))
            r.update(name=f['name'], rank=f['rank'], date=f['date'], rem=f['rem'])
            r['nodate'] = not any(MONTH.match(x) for x in f['date'].split())
        if rows_here:
            frac = sum(1 for r in rows_here if not r['nodate']) / len(rows_here)
            pageinfo[int(pi)]['rowfrac'] = round(frac, 2)
            vf = sum(1 for r in rows_here if D2.verb_of(re.sub(r'^(Drafted|Substitute|Not)\W*', '', r['rem'].strip()) or r['rem']) or re.match(r'(?i)(drafted|absent|not on|sub)', r['rem'].strip())) / len(rows_here)
            pageinfo[int(pi)]['verbfrac'] = round(vf, 2)
            if (frac < 0.45 and len(rows_here) >= 3 and len(mx) < 10) or (vf < 0.5 and frac < 0.8 and len(rows_here) >= 5):
                pageinfo[int(pi)]['narrative'] = True
                rows_here = []
                lead = []
        if lead:
            f = fields(lead)
            if last_row is not None and not f['name'] and not f['rank'] and not f['date']:
                last_row['rem'] = (last_row['rem'] + ' ' + f['rem']).strip()
                last_row['cont'] = last_row.get('cont', 0) + 1
            elif any(f.values()):
                out.append(dict(kind='orphan', n=None, page=int(pi), y=0, text=' | '.join(f.values())))
        # merge name-only rows (wrapped names) into the previous row
        for r in rows_here:
            if not r['date'] and not r['rank'] and not r['rem'] and out and out[-1].get('kind') == 'row' and out[-1]['page'] == int(pi) and r['y'] - out[-1]['y'] < 60:
                out[-1]['name'] = (out[-1]['name'] + ' ' + r['name']).strip()
                continue
            out.append(r)
        if rows_here:
            last_row = out[-1] if out[-1].get('kind') == 'row' else last_row
    json.dump(out, open(os.path.join(C.CACHE, 'derived', vol + '.rows.json'), 'w'), separators=(',', ':'))
    json.dump(pageinfo, open(os.path.join(C.CACHE, 'derived', vol + '.pageinfo.json'), 'w'), separators=(',', ':'))
    from collections import Counter
    print(vol, Counter(o['kind'] for o in out))


if __name__ == '__main__':
    main(sys.argv[1])
