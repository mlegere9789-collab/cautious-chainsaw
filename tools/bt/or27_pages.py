"""Running-head / printed-page recovery for the OR vol. 27 OCR text.

Heads in the printed volume: left (even) pages  'NNN  N. C., VA., W. VA., MD., PA., ETC.  [Chap. XXXIX.'
right (odd) pages 'Chap. XXXIX.]  THE GETTYSBURG CAMPAIGN.  NNN' (Part 3: 'CORRESPONDENCE, ETC. UNION.' / 'CONFEDERATE.').
OCR garbles these badly, so heads are found by fuzzy similarity of their letters to the known templates, the printed number is
parsed with digit-confusion repair, and a dynamic program over the sequence of heads (parity from head form, monotone +1 pages,
penalised gaps for heads the OCR lost) chooses the page number of every head."""
import re, difflib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from or27_lib import load_text, line_starts

L_TEMPL = 'NCVAWVAMDPAETCCHAPXXXIX'
R_TEMPLS = ['CHAPXXXIXTHEGETTYSBURGCAMPAIGN', 'CHAPXXXIXCORRESPONDENCEETCUNION', 'CHAPXXXIXCORRESPONDENCEETCCONFEDERATE',
            'CHAPXXXIXORGANIZATIONSMENTIONED']
DIGITFIX = str.maketrans({'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1', '|': '1', ']': '1', '[': '1', 'S': '5', 's': '5', 'G': '6', 'B': '8',
                          'Z': '2', 'z': '2', 'b': '6', 'g': '9', 'T': '7', 'D': '0', 'U': '0', 'e': '6', '!': '1'})


def _letters(s):
    return re.sub(r'[^A-Z]', '', s.upper())


def _ratio(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def parse_num(tok):
    """OCR digit-confusion repair; returns int or None."""
    t = tok.strip().strip(',.;:-~*^\'"')
    t = re.sub(r'\s+', '', t)
    if not t or len(t) > 6:
        return None
    t2 = t.translate(DIGITFIX)
    # a stray trailing/leading junk char (e.g. '1023^-')
    t2 = re.sub(r'[^0-9]', '', t2) if re.fullmatch(r'[0-9A-Za-z\]\[|!]+[^0-9A-Za-z]*', t) else None
    if not t2 or not t2.isdigit():
        return None
    v = int(t2)
    return v if 1 <= v <= 1300 else None


HEADNUM_L = re.compile(r'^[\s\W]{0,4}(?P<n>[0-9A-Za-z\]\[|!]{1,5}(?:\s[0-9A-Za-z\]]{1,2})?)\s{1,4}(?P<rest>\S.*)$')
HEADNUM_R = re.compile(r'^(?P<rest>.*\S)\s{1,4}(?P<n>[0-9A-Za-z\]\[|!]{1,5}(?:\s[0-9A-Za-z\]]{1,2})?)[\s\W]{0,4}$')


PREFILTER = re.compile(r'(?i)(v[a4t]\W.{0,55}[ebil][tl]?[co]|chap|ohap|hap[.,]|x{2,}|gett|campai|corres|organiz|reports)')


def classify_line(line):
    """Return (form, parsed_page_or_None, score) if the line looks like a running head else None."""
    s = line.strip()
    if not (6 <= len(s) <= 115):
        return None
    if not PREFILTER.search(s):
        return None
    letters = _letters(s)
    if len(letters) < 8:
        return None
    # L-form: number first, 'N. C., VA., ... ETC. [Chap. XXXIX.'
    best = None
    if re.search(r'(?i)v[a4t]\W.{0,55}[ebi][tl]?[co]', s) and re.search(r'(?i)(chap|hap\.|xxx|xix|xxi|\[c|c[a-z]{2,3}[.,])', s):
        lr = _ratio(letters, L_TEMPL)
        # remove the number letters possibly part of letters (digits misread as letters)
        m = HEADNUM_L.match(s)
        if lr >= 0.55 and m:
            ntok = m.group('n')
            # the template ratio computed on the rest, to avoid number letters polluting
            lr2 = _ratio(_letters(m.group('rest')), L_TEMPL[ : ])
            sc = max(lr, lr2)
            if sc >= 0.55:
                best = ('L', parse_num(ntok), sc)
        elif lr >= 0.62:
            best = ('L', None, lr)
    if best is None and re.search(r'(?i)v[a4t]\W.{0,55}[ebi][tl]?[co]', s):
        mm = HEADNUM_L.match(s)
        if mm:
            lr3 = _ratio(_letters(mm.group('rest'))[:16], L_TEMPL[:14])
            if lr3 >= 0.75 and len(s) < 80:
                best = ('L', parse_num(mm.group('n')), 0.5 + 0.2 * lr3)
    # R-form
    chapish = re.match(r"^\W{0,3}[A-Za-z0-9=\[]{2,5}[.,\-'\s]{0,3}[A-Za-z0-9]{0,3}[.,]?\s*[XxZIJTSDEVYn1HK]{2,6}", s) or re.search(r'(?i)c\S{0,3}p[.,]?\s*\S{2,6}[\]\)]', s)
    xx = re.search(r'(?i)[\]\)\[]|x[xz]|[xz]x|xi|ix', s[:26])
    for t in (R_TEMPLS if xx else []):
        rr = _ratio(letters, t)
        if rr >= 0.6:
            m = HEADNUM_R.match(s)
            pn = None
            if m:
                pn = parse_num(m.group('n'))
                rr2 = _ratio(_letters(m.group('rest')), t)
                rr = max(rr, rr2)
            if best is None or rr > best[2] + 0.05:
                best = ('R', pn, rr)
    return best




def classify_frag(line):
    """A running-head fragment with no usable page number ('[Chap. XXXIX.' alone, 'Chap. XXXIX.]' alone, title alone)."""
    s = line.strip()
    if not (6 <= len(s) <= 45):
        return None
    lt = _letters(s)
    if len(lt) < 5:
        return None
    if _ratio(lt, 'CHAPXXXIX') >= 0.62 and re.search(r'(?i)x|z|\]|\[|\)', s):
        return 'frag_chap'
    if len(lt) >= 14 and _ratio(lt, 'THEGETTYSBURGCAMPAIGN') >= 0.72:
        return 'frag_title'
    return None


def find_frags(text):
    ls = line_starts(text)
    out = []
    n = len(ls)
    for i in range(n):
        s = ls[i]
        e = ls[i + 1] - 1 if i + 1 < n else len(text)
        line = text[s:e]
        if len(line) > 60 or not line.strip():
            continue
        k = classify_frag(line)
        if k:
            out.append({'off': s, 'end': e, 'kind': k, 'line': line.strip()})
    return out


def find_heads(text):
    """Scan lines; return list of dicts {off, end, form, parsed, score, line}. Also merges split two-line heads."""
    ls = line_starts(text)
    heads = []
    n = len(ls)
    for i in range(n):
        s = ls[i]
        e = ls[i + 1] - 1 if i + 1 < n else len(text)
        line = text[s:e]
        r = classify_line(line)
        if r:
            heads.append({'off': s, 'end': e, 'form': r[0], 'parsed': r[1], 'score': round(r[2], 3), 'line': line.strip()})
    return heads


def solve_pages(heads, max_gap=8):
    """DP assigning an integer page to each head. Returns list of (page, how) aligned to heads."""
    m = len(heads)
    if m == 0:
        return []
    INF = 1e9
    # candidate sets
    # trim candidate windows (keep the sets small): only keep values that could be reached with cost < INF anyway
    parity = lambda f: 0 if f == 'L' else 1
    dp = []
    bp = []
    for i, h in enumerate(heads):
        d = {}
        b = {}
        c = set()
        if h['parsed'] is not None:
            c.add(h['parsed'])
        if i == 0:
            if h['parsed'] is None:
                c.update(range(1, 12))
        else:
            for q in dp[i - 1]:
                for dd in range(1, max_gap + 1):
                    c.add(q + dd)
        for p in c:
            if p < 1:
                continue
            c0 = 0.0
            if h['parsed'] is None:
                c0 += 0.2
            elif p != h['parsed']:
                c0 += 2.5
            if p % 2 != parity(h['form']):
                c0 += 3.0
            if i == 0:
                d[p] = c0
                b[p] = None
                continue
            best = INF
            bq = None
            for q, cq in dp[i - 1].items():
                g = p - q
                if g < 1 or g > max_gap:
                    continue
                gc = 1.5 * (g - 1)
                tot = cq + gc
                if tot < best:
                    best = tot
                    bq = q
            if bq is not None:
                d[p] = best + c0
                b[p] = bq
        if len(d) > 40:
            keep = sorted(d, key=lambda k: d[k])[:40]
            d = {k: d[k] for k in keep}
        dp.append(d)
        bp.append(b)
    # backtrack
    p = min(dp[-1], key=lambda k: dp[-1][k])
    pages = [None] * m
    for i in range(m - 1, -1, -1):
        pages[i] = p
        p = bp[i][p]
    out = []
    for i, h in enumerate(heads):
        pg = pages[i]
        if h['parsed'] is None:
            how = 'inferred'
        elif pg == h['parsed']:
            how = 'ocr'
        else:
            how = 'corrected'
        out.append((pg, how))
    return out


def refill(text, heads, pages):
    """Directed search: for each page number missing between two solved heads, look inside the span for a line that
    carries that very number in head position (first token for even/left, last token for odd/right) and bears at least a weak
    resemblance to a running head. Safe against false positives because the expected number is known. Returns new head list."""
    new = list(heads)
    added = 0
    for i in range(1, len(heads)):
        p0, p1 = pages[i - 1][0], pages[i][0]
        if p1 - p0 <= 1:
            continue
        a, b = heads[i - 1]['end'], heads[i]['off']
        seg = text[a:b]
        base = a
        # line table
        pos = 0
        lines = []
        for ln in seg.split('\n'):
            lines.append((base + pos, ln))
            pos += len(ln) + 1
        lo = 0
        for p in range(p0 + 1, p1):
            form = 'L' if p % 2 == 0 else 'R'
            hit = None
            for off, ln in lines:
                if off < lo:
                    continue
                st = ln.strip()
                if not (5 <= len(st) <= 110):
                    continue
                toks = st.split()
                if not toks:
                    continue
                tok = toks[0] if form == 'L' else toks[-1]
                if parse_num(tok) != p:
                    # right-form sometimes has 'NNN' glued, or a split number like '1 5'
                    if form == 'R' and len(toks) > 1 and parse_num(toks[-2] + toks[-1]) == p:
                        pass
                    else:
                        continue
                lt = _letters(st)
                ev = 0
                if form == 'L':
                    ev = _ratio(lt[:40], L_TEMPL)
                    if len(toks) >= 4 and re.search(r'(?i)v[a4t]', st):
                        ev = max(ev, 0.45)
                else:
                    ev = max(_ratio(lt, t) for t in R_TEMPLS)
                    if re.search(r'(?i)(camp|gett|corres|organi)', st):
                        ev = max(ev, 0.45)
                if ev >= 0.4:
                    hit = (off, off + len(ln), form, p, ev, st)
                    break
            if hit:
                lo = hit[1]
                new.append({'off': hit[0], 'end': hit[1], 'form': hit[2], 'parsed': hit[3], 'score': round(hit[4], 3),
                            'line': hit[5], 'refilled': True})
                added += 1
    new.sort(key=lambda h: h['off'])
    return new, added


def get_heads(text):
    hs = find_heads(text)
    pr = solve_pages(hs)
    for _ in range(3):
        hs2, added = refill(text, hs, pr)
        if not added:
            break
        hs = hs2
        pr = solve_pages(hs)
    return hs, pr


if __name__ == '__main__':
    import sys
    for part in (1, 2, 3):
        t = load_text(part)
        hs, pr = get_heads(t)
        pg = [p for p, _ in pr]
        hows = {}
        for _, h in pr:
            hows[h] = hows.get(h, 0) + 1
        gaps = sum(1 for a, b in zip(pg, pg[1:]) if b - a > 1)
        print(part, len(hs), 'pages', pg[0], '-', pg[-1], hows, 'gaps', gaps)


class PageModel:
    """Offset -> printed page lookup built from solved running heads."""

    def __init__(self, heads, pages):
        self.offs = [h['off'] for h in heads]
        self.pages = [p for p, _ in pages]
        self.how = [h for _, h in pages]
        self.ends = [h['end'] for h in heads]

    def page_at(self, off):
        """Return dict(page, lo, hi, conf, head_how). conf: 'head' (a head within one page of the next head),
        'interp' (page lies in a run of pages whose heads the OCR lost; page is a linear estimate within [lo,hi]),
        'front' (before the first recovered head)."""
        import bisect
        i = bisect.bisect_right(self.offs, off) - 1
        if i < 0:
            hi = self.pages[0] - 1 if self.pages else None
            return {'page': hi, 'lo': hi, 'hi': hi, 'conf': 'front-inferred', 'head_how': None}  # before the first recovered head: the page just before it
        p = self.pages[i]
        if i + 1 >= len(self.pages):
            return {'page': p, 'lo': p, 'hi': p, 'conf': 'head' if self.how[i] == 'ocr' else 'head-' + self.how[i], 'head_how': self.how[i]}
        nxt = self.pages[i + 1]
        if nxt - p <= 1:
            return {'page': p, 'lo': p, 'hi': p, 'conf': 'head' if self.how[i] == 'ocr' else 'head-' + self.how[i], 'head_how': self.how[i]}
        span = self.offs[i + 1] - self.offs[i]
        frac = (off - self.offs[i]) / span if span else 0
        est = p + int(frac * (nxt - p))
        est = max(p, min(nxt - 1, est))
        return {'page': est, 'lo': p, 'hi': nxt - 1, 'conf': 'interp', 'head_how': self.how[i]}
