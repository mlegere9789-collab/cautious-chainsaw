"""Segment OR Ser. I vol. 27 parts 1-3 into reports and write docs/battle-theatre/library/or27_index.json.

Usage:  python -I tools/bt/or27_index.py            (build everything)
        python -I tools/bt/or27_index.py --spot 20  (print 20 random offsets with page context for the eyeball page-recovery check)

Every record carries CHARACTER offsets into the ORIGINAL raw file (UTF-8 decoded, newline untouched). Nothing here edits the text.
Report numbers: printed 'No. N.' headings are OCR-garbled ('No. 233' for 223); numbers are repaired against the table of contents
(which is consecutive 1..N in Parts 1-2) and both the OCR string and the repaired number are kept.
"""
import os, re, sys, json, random, difflib, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from or27_lib import *
from or27_pages import get_heads, PageModel, find_frags

utf8_stdout()

RANKS = [
    (r'Maj(?:or)?\.?\s*Gen(?:eral)?\.?', 'Maj. Gen.'), (r'Brig(?:adier)?\.?\s*Gen(?:eral)?\.?', 'Brig. Gen.'),
    (r'Lieut(?:enant)?\.?\s*Gen(?:eral)?\.?', 'Lieut. Gen.'), (r'Lieut(?:enant)?\.?\s*Col(?:onel)?\.?', 'Lieut. Col.'),
    (r'Surg(?:eon)?\.?', 'Surg.'), (r'Medical\s+Inspector', 'Medical Inspector'), (r'Col(?:onel)?\.?', 'Col.'),
    (r'Maj(?:or)?\.?', 'Maj.'), (r'Capt(?:ain)?\.?', 'Capt.'), (r'Lieut(?:enant)?\.?', 'Lieut.'), (r'Gen(?:eral)?\.?', 'Gen.'),
    (r'Commodore', 'Commodore'), (r'Mr\.?', 'Mr.'), (r'Asst\.?\s*Surg\.?', 'Asst. Surg.'), (r'Chaplain', 'Chaplain'),
]
# OCR variants of the leading letters of ranks ((Jen., Qen., Gten., G«n., ...)
RANK_FIX = [(r'^\(?[CQO]\S?[ec]n\.', 'Gen.'), (r'^G\S?en\.', 'Gen.')]
NONPERSON = [
    (r'^\W*(Itinerary)', 'itinerary'), (r'^\W*(Abstract\s+from)', 'abstract'), (r'^\W*(Organization|Organizaticn|Organizat)', 'organization'),
    (r'^\W*(General\s+Return|Return\s+of\s+Casualt|Return\s+of)', 'return'), (r'^\W*(Record\s+of)', 'record'),
    (r'^\W*(Medals)', 'medals'), (r'^\W*(Congratulatory)', 'order'),
]
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
MON_RE = re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]{0,8}\.?[\s,]*[\dIlOoS]{1,2}[\s,]*(?:[—\-]\s*\S+\s*)?', re.I)
YEAR_RE = re.compile(r'1\s?[8B]\s?[\dGCO6SQ5]\s?[.\dlIGCO3S]')


def clean(s):
    return ' '.join(s.split())


def lines_with_offsets(text, start, end):
    out = []
    pos = start
    for ln in text[start:end].split('\n'):
        out.append((pos, ln))
        pos += len(ln) + 1
    return out


# ---------------------------------------------------------------- table of contents
ENTRY_START = re.compile(r'^\W{0,6}(?:[Ff\^]?(?:No|Xo|Ko|Fo|N0|Na|Nu|Xn|JTo|JSTo|ISTo|IN o|Mo|(?<=\^)o)\b\W{0,3}\s*([\w\.\?\]]{1,5})\W{0,3}\s*[—\-\.~_^=:,\s]{0,8}|[—\-]\s*)(.*)$')
RANK_START = re.compile(r'(?i)^(Maj|Brig|Lieut|Col|Capt|Surg|Medical|Gen|Itinerary|Return|Abstract|Organi|Record|Medal|Commodore|Mr|Asst|\(?[CQO]\S?en|Chaplain|Mai|Bng|Brlg|Gt)')


def parse_toc(text, start, end):
    """Return list of dicts {toc_ocr_no, text, off} for the report table of contents between start..end."""
    entries = []
    cur = None
    for off, ln in lines_with_offsets(text, start, end):
        s = ln.strip()
        if not s:
            if cur:
                entries.append(cur)
                cur = None
            continue
        # running head lines inside the ToC are not entries
        if re.search(r'(?i)v[a4t]\W.{0,55}[ebi][tl]?[co]', s) and re.search(r'(?i)chap|xxx|hap', s):
            continue
        if re.search(r'(?i)^\W*(chap|ohap|caip|cbip|chip)', s) and re.search(r'(?i)xx|\]', s[:22]):
            continue
        m = ENTRY_START.match(s)
        if m and (m.group(2).strip() or m.group(1)):
            rest = m.group(2).strip()
            if not rest and cur is not None:
                cur['text'] += ' ' + s
                continue
            if cur:
                entries.append(cur)
            cur = {'toc_ocr_no': (m.group(1) or '').strip('. ') or None, 'text': rest, 'off': off + (len(ln) - len(ln.lstrip()))}
        elif re.match(r'^\W{0,3}[A-Z][A-Z\s,.\-—]{6,}\.?$', s) and not RANK_START.match(s):
            # section heading such as 'ARMY OF THE POTOMAC.' ends the current entry
            if cur:
                entries.append(cur)
                cur = None
            continue
        elif cur is not None:
            cur['text'] += ' ' + s
        elif RANK_START.match(s) and len(s) > 15:
            cur = {'toc_ocr_no': None, 'text': s, 'off': off}
    if cur:
        entries.append(cur)
    for e in entries:
        e['text'] = clean(e['text'])
    return entries


def _rank_split(t):
    """Return (rank, rest) tolerant to OCR garble in the second word (Qen., (Jen., Gten., G«n.)."""
    base = [(r'Maj(?:or)?\.?', 'Maj.'), (r'Brig(?:adier)?\.?', 'Brig.'), (r'Lieut(?:enant)?\.?', 'Lieut.'), (r'Col(?:onel)?\.?', 'Col.'),
            (r'Capt(?:ain)?\.?', 'Capt.'), (r'Surg(?:eon)?\.?', 'Surg.'), (r'Gen(?:era[l1d])?\.?', 'Gen.'), (r'Commodore', 'Commodore'),
            (r'Medical\s+Inspector', 'Medical Inspector'), (r'Mr\.?', 'Mr.'), (r'Asst\.?', 'Asst.'), (r'Chaplain', 'Chaplain'),
            (r'Rear-Admiral', 'Rear-Admiral'), (r'Hon\.?', 'Hon.')]
    for pat, norm in base:
        m = re.match(r'^\W*' + pat + r'(?=\s)', t, re.I)
        if not m:
            continue
        rest = t[m.end():].lstrip()
        if norm in ('Maj.', 'Brig.', 'Lieut.'):
            m2 = re.match(r'^(?:\(?[GQCO][^\s.]{0,3}[ecn]n\.?|Gen\.?|Col\.?|Gten\.?|Oen\.?)(?=\s)', rest)
            if m2:
                second = rest[:m2.end()]
                rest = rest[m2.end():].lstrip()
                if norm == 'Lieut.' and re.match(r'(?i)^col', second):
                    return 'Lieut. Col.', rest
                return norm + ' Gen.', rest
            m3 = re.match(r'(?i)^Col\.?(?=\s)', rest)
            if m3 and norm == 'Lieut.':
                return 'Lieut. Col.', rest[m3.end():].lstrip()
        if norm == 'Asst.':
            m4 = re.match(r'(?i)^Surg\.?(?=\s)', rest)
            if m4:
                return 'Asst. Surg.', rest[m4.end():].lstrip()
        return norm, rest
    return None, t


def parse_title(title):
    """Split 'Maj. Gen. Henry W. Halleck, General-in-Chief, U. S. Army, including ...' into kind, rank, author, unit_scope."""
    t = clean(title)
    t = re.sub(r"(?i)^\W*(?:[a-z]{4,9}|recommendation|communication)s?\s+(?:of|from)\s+(?!the\s+part)", lambda m: '' if difflib.SequenceMatcher(None, m.group(0).split()[0].lower().strip('.,'), 'report').ratio() >= 0.6 or re.match(r'(?i)^\W*(recommendation|communication|letter|statement)', m.group(0)) else m.group(0), t)
    for pat, kind in NONPERSON:
        if re.match(pat, t, re.I):
            return {'kind': kind, 'rank': None, 'author': None, 'unit_scope': t}
    rank, rest = _rank_split(t)
    parts = rest.split(',', 1)
    author = clean(parts[0]).strip(' .') if parts and parts[0] else None
    unit = parts[1].strip() if len(parts) > 1 else ''
    return {'kind': 'report', 'rank': rank, 'author': author or None, 'unit_scope': unit}


# ---------------------------------------------------------------- body headings
BODY_HEAD = re.compile(r'^\W{0,5}(?:No|Xo|Ko|Fo|N0|Na|Xn|Nn|Mo|JSTo|JTo|N\W{1,2}o|No\b)\W{0,3}\s*([\dA-Za-z\.\]\?]{1,5})\W{0,3}\s*$')


def digits_of(s):
    if s is None:
        return None
    t = s.translate(str.maketrans({'O': '0', 'o': '0', 'l': '1', 'I': '1', 'S': '5', 'G': '6', 'B': '8', 'Z': '2', 'V': '7', ']': '1', '?': '7', 'i': '1'}))
    t = re.sub(r'[^0-9]', '', t)
    return int(t) if t else None


def body_headings(text, start, end):
    out = []
    for off, ln in lines_with_offsets(text, start, end):
        s = ln.strip()
        if len(s) > 14:
            continue
        m = BODY_HEAD.match(s)
        if not m or '(' in s or ')' in s:
            continue  # '(No. 3.)' in parentheses is an enclosure label inside a report, not a report heading
        tok = m.group(1)
        if not re.search(r'\d|[OlISGB]', tok):
            continue
        out.append({'off': off, 'ocr': s, 'n': digits_of(tok)})
    return out


HEAD_SKIP_RE = re.compile(r'(?i)(^\W*\d{1,4}\W*$)|(chap|ohap|hap\.|xxx)|(v[a4t]\W.{0,55}[ebi][tl]?[co])|^\W*[A-Z\s.,]{0,3}\W*$|(gett|campai)')


def title_block(text, off, head_offs=None):
    """Lines following a 'No. N.' heading up to the first blank line (the report's title); running heads / page numbers that
    fall inside are skipped. Returns (title, offset_after_title)."""
    ls = lines_with_offsets(text, off, min(len(text), off + 1600))
    blk = []
    k = 1
    n = len(ls)
    while k < n:
        s = ls[k][1].strip()
        if not s or (head_offs is not None and ls[k][0] in head_offs) or (len(s) < 40 and HEAD_SKIP_RE.search(s) and not re.match(r'(?i)^(report|reports|itinerary|abstract|organi|return|record)', s)):
            k += 1
            continue
        break
    while k < n:
        s = ls[k][1].strip()
        if not s:
            break
        if head_offs is not None and ls[k][0] in head_offs:
            k += 1
            continue
        blk.append(s)
        k += 1
        if len(blk) >= 8:
            break
    end_off = ls[k][0] if k < n else off
    return clean(' '.join(blk)), end_off


def find_dateline(text, from_off, limit=900):
    """First plausible date line(s) after the title block: returns (raw_dateline, date_text) or (None,None)."""
    seg = text[from_off:from_off + limit]
    ls = [l.strip() for l in seg.split('\n')]
    acc = []
    for k, l in enumerate(ls[:14]):
        if not l:
            if acc and YEAR_RE.search(' '.join(acc)):
                break
            continue
        acc.append(l)
        if MON_RE.search(l) and (YEAR_RE.search(l) or len(acc) < 4):
            if YEAR_RE.search(l):
                break
            # year may follow on the next line
            if k + 1 < len(ls) and YEAR_RE.search(ls[k + 1]):
                acc.append(ls[k + 1])
                break
        if len(acc) >= 5:
            break
    raw = clean(' '.join(acc)) if acc else None
    dt = None
    if raw:
        m = MON_RE.search(raw)
        if m:
            tail = raw[m.start():m.start() + 60]
            ym = YEAR_RE.search(tail)
            dt = clean(tail[:ym.end()]) if ym else clean(tail[:30])
    return raw, dt


# ---------------------------------------------------------------- ocr noise estimate
_FREQ = None


def corpus_freq():
    global _FREQ
    if _FREQ is None:
        c = collections.Counter()
        for p in PARTS:
            for w in re.findall(r'[A-Za-z]{4,}', load_text(p)):
                c[w.lower()] += 1
        _FREQ = c
    return _FREQ


def ocr_noise(text, a, b):
    fr = corpus_freq()
    ws = re.findall(r'[A-Za-z]{4,}', text[a:b])
    if not ws:
        return {'tokens': 0, 'hapax_rate': None, 'junk_per_k': None, 'grade': 'n/a'}
    hap = sum(1 for w in ws if fr[w.lower()] <= 1)
    junk = len(re.findall(r'[^\x00-\x7f]', text[a:b]))
    rate = hap / len(ws)
    jk = 1000.0 * junk / max(1, b - a)
    grade = 'good' if rate < 0.012 and jk < 0.5 else ('fair' if rate < 0.03 and jk < 2 else 'poor')
    return {'tokens': len(ws), 'hapax_rate': round(rate, 4), 'junk_per_k': round(jk, 3), 'grade': grade}


# ---------------------------------------------------------------- alignment
def sim(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def norm_title_key(t):
    t = re.sub(r'(?i)^\W*(report|reports)\s+of\s+', '', t)
    return re.sub(r'[^a-z]', '', t.lower())[:48]


def align(toc, heads, key_toc, key_body, band=40):
    """Global alignment (Needleman-Wunsch with banding). Returns list of (toc_idx or None, head_idx or None)."""
    n, m = len(toc), len(heads)
    NEG = -1e9
    GAP = -0.35
    S = {}

    def score(i, j):
        k = (i, j)
        if k not in S:
            s = sim(key_toc[i], key_body[j])
            # prefer agreement of the OCR number when it is exactly the TOC position
            S[k] = (s - 0.45) * 2.0
        return S[k]

    # dp over (i,j) with band around expected diagonal
    dp = [[NEG] * (m + 1) for _ in range(n + 1)]
    bk = [[None] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            if abs(i - j) > band + abs(n - m):
                continue
            cur = dp[i][j]
            if cur == NEG:
                continue
            if i < n and cur + GAP > dp[i + 1][j]:
                dp[i + 1][j] = cur + GAP
                bk[i + 1][j] = (i, j, 'toc_only')
            if j < m and cur + GAP > dp[i][j + 1]:
                dp[i][j + 1] = cur + GAP
                bk[i][j + 1] = (i, j, 'body_only')
            if i < n and j < m:
                sc = cur + score(i, j)
                if sc > dp[i + 1][j + 1]:
                    dp[i + 1][j + 1] = sc
                    bk[i + 1][j + 1] = (i, j, 'match')
    i, j = n, m
    path = []
    while (i, j) != (0, 0):
        pi, pj, op = bk[i][j]
        if op == 'match':
            path.append((pi, pj))
        elif op == 'toc_only':
            path.append((pi, None))
        else:
            path.append((None, pj))
        i, j = pi, pj
    path.reverse()
    return path


# ---------------------------------------------------------------- part driver (Parts 1 and 2)
def part_regions(part, text):
    """Locate ToC span and body span, and the end-of-reports marker."""
    L = text.split('\n')
    ls = line_starts(text)
    toc_start = None
    for i, l in enumerate(L[:6000]):
        if i > 150 and re.match(r'(?i)^\W*(eepoets|reports|eeports|repoets)', l.strip()) and len(l.strip()) < 40:
            nxt = ' '.join(L[i + 1:i + 12])
            if re.search(r'N[o0]\.?\s+[\dIOSl]', nxt):
                toc_start = ls[i]
                break
    body_heads = [h for h in body_headings(text, toc_start or 0, len(text))]
    return toc_start, body_heads


def end_marker(text, after):
    m = re.search(r'^ALTERNATE\s+[A-Za-z]|^INDEX\.\s*$', text[after:], re.M)
    return after + m.start() if m else len(text)


def build_part_reports(part, text, pm, notes):
    toc_start, bh = part_regions(part, text)
    # first body heading is the first 'No. N.' alone on a line after ToC
    first_body = bh[0]['off'] if bh else None
    toc = parse_toc(text, toc_start, first_body)
    # strip subtotal header lines such as 'ARMY OF THE POTOMAC.' are dropped by parse_toc
    return toc, bh, toc_start, first_body




# ---------------------------------------------------------------- driver
def build_all():
    import or27_records as R
    notes, unresolved = [], []
    index = {'_doc': 'Index of OR Ser. I vol. 27 parts 1-3 (raw OCR). Offsets are CHARACTER offsets into the original UTF-8 file decoded with newline=\'\'. '
                     'Page numbers are PRINTED page numbers recovered from OCR running heads (see start_page_conf). Author/rank/unit/date strings are '
                     'raw OCR (not repaired); an OCR-suspect date is flagged. Part 3 documents are heuristic segments (no table of contents exists).',
             'generated': datetime.date.today().isoformat(), 'sources': {}, 'parts': {}, 'records': [], 'unresolved': [], 'ignored_headings': [], 'notes': notes}
    acq = {}
    try:
        with open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired.json'), encoding='utf-8') as f:
            for it in json.load(f)['items']:
                acq[it['archive_identifier']] = it['sha256']
    except Exception as ex:
        notes.append('acquired.json not read: %s' % ex)
    ignored_all = []
    for part in (1, 2, 3):
        text = load_text(part)
        sha = sha256_file(raw_path(part))
        index['sources'][str(part)] = {'archive_identifier': PARTS[part], 'file': 'tmp/library/or27/%s_djvu.txt' % PARTS[part], 'chars': len(text),
                                       'sha256': sha, 'sha256_matches_acquired_json': acq.get(PARTS[part]) == sha, 'label': PART_LABEL[part]}
        if part < 3:
            recs, pm, hs, pr, ign = R.build_part12(part, notes, unresolved)
            for g in ign:
                g['part'] = part
            ignored_all += ign
        else:
            recs, pm, hs, pr = R.build_part3(notes)
        hows = collections.Counter(h for _, h in pr)
        pg = [p for p, _ in pr]
        for r in recs:
            ds = r.get('date_text') or r.get('date_raw') or ''
            r['date_ocr_suspect'] = bool(ds) and (not re.search(r'1[8B]6[34]', ds.replace(' ', '')) or bool(re.search(r'\b(3[2-9]|[4-9]\d)\b', ds)) or bool(re.search(r'[A-Za-z]{3,}', ds) and not MON_RE.search(ds)))
        index['parts'][str(part)] = {'records': len(recs), 'running_heads_found': len(hs), 'heads_by_how': dict(hows), 'first_page': pg[0], 'last_page': pg[-1],
                                     'page_gaps_after_head_dp': sum(1 for a, b in zip(pg, pg[1:]) if b - a > 1),
                                     'grade_counts': dict(collections.Counter(r['ocr']['grade'] for r in recs))}
        index['records'] += recs
    index['unresolved'] = unresolved
    index['ignored_headings'] = ignored_all
    return index


def write_index(index):
    os.makedirs(LIB_DIR, exist_ok=True)
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)


def spot(n, seed):
    """Print n random offsets (inside indexed records) with the claimed page and the nearest raw running-head lines on both sides,
    for the by-eye page-recovery check."""
    with open(INDEX_PATH, encoding='utf-8') as f:
        idx = json.load(f)
    rnd = random.Random(seed)
    recs = idx['records']
    out = []
    for k in range(n):
        want = (1, 1, 2, 2, 3)[k % 5]  # stratified: Parts 1-3 in proportion 2:2:1 (Part 3 is the longest but least interesting for page cites)
        r = rnd.choice([x for x in recs if x['part'] == want])
        part = r['part']
        text = load_text(part)
        off = rnd.randrange(r['start_offset'], max(r['start_offset'] + 1, r['end_offset']))
        hs, pr = get_heads(text)
        pm = PageModel(hs, pr)
        pgi = pm.page_at(off)
        import bisect
        i = bisect.bisect_right(pm.offs, off) - 1
        prev_line = hs[i]['line'] if i >= 0 else None
        next_line = hs[i + 1]['line'] if i + 1 < len(hs) else None
        print('--- sample %d: part %d offset %d  (record %s)  claimed page=%s conf=%s range=%s' % (k + 1, part, off, r['id'], pgi['page'], pgi['conf'], (pgi['lo'], pgi['hi'])))
        print('   head before: %r  [solved page %s]' % (prev_line, pm.pages[i] if i >= 0 else None))
        print('   head after : %r  [solved page %s]' % (next_line, pm.pages[i + 1] if i + 1 < len(hs) else None))
        print('   text: %r' % ' '.join(text[off:off + 110].split()))
        out.append({'part': part, 'offset': off, 'claimed': pgi['page'], 'conf': pgi['conf']})
    return out


def _nums(tok):
    t = tok.translate(str.maketrans({'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 'B': '8', 'G': '6'}))
    return [int(x) for x in re.findall(r'\d+', t)]


# (part, start_offset, end_offset) of the "Gettysburg Campaign ... Reports of" author lists in the printed alphabetical INDEX of each part
INDEX_REPORT_LISTS = {1: (3850300, 3861200), 2: (3777400, 3785000)}
IDX_LINE = re.compile(r"^(?P<name>[A-Z\.'\"][A-Za-z\.'\"\-\s]{1,40}?(?:,\s+[A-Za-z\.\s,'\-]{1,28})?)[\s\.:;_\-,]*(?P<pg>[\dIOlSBGo][\dIOlSBGo,\.\-\s]{0,24})$")


def pagecheck():
    """Independent check of recovered start pages: the printed INDEX at the back of each part lists, for the Gettysburg Campaign, the
    page on which each author's report begins. For every Part 1/2 record whose author surname+initial appears in that list, test
    start_page against the listed pages (index numerals are themselves OCR; digit confusions repaired)."""
    with open(INDEX_PATH, encoding='utf-8') as f:
        idx = json.load(f)
    res = {}
    allrows = []
    for part in (1, 2):
        text = load_text(part)
        lo, hi = INDEX_REPORT_LISTS[part]
        entries = []
        for ln in text[lo:hi].split(chr(10)):
            s = ln.strip()
            if not s or 'entioned' in s or len(s) > 70:
                continue
            m = IDX_LINE.match(s)
            if not m or ',' not in m.group('name'):
                continue
            nm = m.group('name')
            sur, rest = nm.split(',', 1)
            ini = re.sub(r'[^A-Za-z]', '', rest)[:1].upper()
            pages = [x for x in _nums(m.group('pg')) if 1 <= x <= 1200]
            if pages:
                entries.append((re.sub(r'[^a-z]', '', sur.lower()), ini, pages, s))
        tested = hit = near = 0
        misses = []
        explained = []
        for r in idx['records']:
            if r['part'] != part or r.get('series', 'main') != 'main' or not r.get('author') or r['start_page'] is None:
                continue
            a = r['author']
            toks = a.replace(',', ' ').split()
            if len(toks) < 2:
                continue
            sur = re.sub(r'[^a-z]', '', toks[-1].lower())
            if sur in ('jr', 'sr'):
                sur = re.sub(r'[^a-z]', '', toks[-2].lower())
            ini = toks[0][:1].upper()
            cands = [e for e in entries if difflib.SequenceMatcher(None, e[0], sur).ratio() >= 0.86 and e[1] == ini]
            if not cands:
                continue
            tested += 1
            pg = set(p for e in cands for p in e[2])
            sp = r['start_page']
            if sp in pg:
                hit += 1
            elif any(abs(sp - p) <= 1 for p in pg):
                near += 1
                misses.append((r['id'], r['author'], sp, sorted(pg), 'off-by-one'))
            else:
                expl = any(str(sp).endswith(str(p)) or (len(str(p)) == len(str(sp)) and sum(a != b for a, b in zip(str(p), str(sp))) == 1) for p in pg)
                (explained if expl else misses).append((r['id'], r['author'], sp, sorted(pg), 'index numeral differs by one OCR digit / lost leading digit' if expl else 'UNEXPLAINED'))
        res[part] = {'index_entries_parsed': len(entries), 'records_tested': tested, 'start_page_listed_in_index': hit, 'within_1_page': near,
                     'index_numeral_ocr_explained': len(explained), 'misses': misses}
    return res


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--pagecheck':
        r = pagecheck()
        for part, v in r.items():
            print('part', part, {k: x for k, x in v.items() if k != 'misses'})
            for m in v['misses']:
                print('   ', m)
    elif args and args[0] == '--spot':
        spot(int(args[1]) if len(args) > 1 else 20, int(args[2]) if len(args) > 2 else 27)
    else:
        idx = build_all()
        write_index(idx)
        pc = pagecheck()
        idx['page_recovery_checks'] = {
            'independent_check': 'printed INDEX of each part (Gettysburg Campaign, Reports of: author -> start page) versus recovered start_page, main-series records only',
            'result': {str(k): {kk: vv for kk, vv in v.items()} for k, v in pc.items()},
            'start_page_conf_counts': {str(pp): dict(collections.Counter(r['start_page_conf'] for r in idx['records'] if r['part'] == pp)) for pp in (1, 2, 3)},
            'eyeball_spot_check': 'see OR27-NOTES.md (python -I tools/bt/or27_index.py --spot 20 270)'}
        write_index(idx)
        print('wrote', INDEX_PATH)
        for p, v in idx['parts'].items():
            print(' part', p, v)
        print(' unresolved:', len(idx['unresolved']), ' ignored headings:', len(idx['ignored_headings']))
        for n in idx['notes']:
            print(' note:', n)
