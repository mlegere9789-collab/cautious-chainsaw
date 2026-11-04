"""Moore 1882 Roster of North Carolina Troops -> per-unit raw entries, classified rows, CSV.
Generalises rosters/pipeline/nc_parse.py + nc_classify.py (26th NC pilot) to every NC unit of the order of battle, with the fixes listed in README.md section 'Rule changes against the pilot'.
Run: python -I -X utf8 scripts/moore_pipeline.py [unit_id ...]   (from data/C-NCLA)
"""
import json, re, sys, os, datetime, csv
sys.path.insert(0, os.path.dirname(__file__))
from collections import Counter
from ncla_common import CACHE, DATA, low_priority
from moore_units import HEADERS, SCOPE, VOLFILE, VOLIA, VOLID, block, EMORY_FILE, emory_block

low_priority()
MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCR_MON = {'mav': 5, 'lay': 5, 'julv': 7, 'jiilv': 7, 'jiily': 7, 'jnly': 7, 'jiine': 6, 'jime': 6, 'junc': 6, 'sept': 9, 'siept': 9, 'deo': 12, 'dee': 12,
           'jau': 1, 'fob': 2, 'kcb': 2, 'mai': 3, 'feb': 2, 'sepl': 9, 'augu': 8}
GB_START, GB_END = datetime.date(1863, 7, 1), datetime.date(1863, 7, 3)
LETTERS = list('ABCDEFGHIKLMNOP')
CONFUSE = {'A': set('AHR'), 'B': set('BRE8') | {'II'}, 'C': set('CaGOQcge') | {'€'}, 'D': set('DOB') | {'I)'}, 'E': set('ERFB'), 'F': set('FEP'), 'G': set('GaCOQ6'),
           'H': set('HRN') | {'II'}, 'I': set('ILT1l') | {'II'}, 'K': set('KRXL'), 'L': set('LIK'), 'M': set('MHN')}


def mon_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if t in OCR_MON:
        return OCR_MON[t]
    for k, v in OCR_MON.items():
        if len(k) >= 4 and t.startswith(k):
            return v
    return MON.get(t[:3])


SKIP = re.compile(r"([NFXH]orth\s+Caro\w*\s+(State\s+)?Troops|^[\W\d]{0,4}\d{3}\W*$|^\W*(d|S|s)?\d{2,3}\W+North)", re.I)
RUNHEAD = re.compile(r"^\W*(\d{1,3}\s+)?(Company\s+[A-Za-z]{1,2}|Field\s+and\s+Staff|Non-?\s*Commissioned\s+Staff|Officers?)\W*[—\-–=~\s]{1,6}\W*[A-Za-z\- ]{3,30}\s+(Regiment|Battalion|Reg\w+)\W*\d{0,3}\W*$", re.I)
RUNHEAD2 = re.compile(r"^\W*\d{0,3}\W*(Twen|Thir|Four|Fift|Six|Seven|Eight|Nine|First|Second|Third|Fifth|Tenth|Eleventh|Twelf|Thirteenth|Fourteenth|Sixteenth|Eighteenth)[A-Za-z\- ]{2,30}\s+Regiment\W*\d{0,3}\W*$", re.I)
START = re.compile(r"^[►■•\.\*'\^\"]?[A-Za-z][A-Za-z'\-\.\^é]{0,25}(\s[A-Za-z][A-Za-z'\-\.\^]{0,25}){0,3},\s*\S")
COMP = re.compile(r'^C\S{0,3}MPANY\s+([A-Za-z]{1,2})[\.,]?\s*$')
CMAP = {'A': 'A', 'B': 'B', 'a': 'C', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'II': 'H', 'H': 'H', 'I': 'I', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N', 'O': 'O', 'P': 'P'}
OFFICER_START = re.compile(r"^\W{0,2}[A-Za-z0-9][A-Za-z0-9\^\.\-' ]{2,34},\s+(?:Colonel|Co\S?onel|Lieut|Lt\.|Major|Captain|Capt\.|Adjutant|Surgeon|Assistant|Asst|A\.\s?[QC]\.\s?[MS]|Q\.\s?M|Sergeant|Serg|Chaplain|1st\s|2d\s|2nd\s|3d\s|Corporal|Musician|Ensign|Ordnance|Hospital|Chief|Commissary)")
NOTE = re.compile(r"^N[o0]t[ec]\.?\s*[—\-–\.]")
HAS_E = re.compile(r"(?<![A-Za-z])(e\.|e,|cm\.)\s")
ABBREV_KEY = re.compile(r'^(e|d|dg|dt|k|m|p|pr|r|tr|w|c|cm|co|com)\s+[a-z]+(\.|ed|ant)?\s*$')


def load_lines(vol, src='primary'):
    fn = VOLFILE[vol] if src == 'primary' else EMORY_FILE[vol]
    return open(os.path.join(CACHE, fn), encoding='utf-8', errors='replace').read().split('\n')


def parse_block(vol, key, lines, src='primary'):
    start, end = block(vol, key) if src == 'primary' else emory_block(vol, key, lines)
    end = end if end else len(lines)
    company, section = 'FS', 'officers'
    entries, notes = [], []
    cur = None
    in_note = False
    runhead_mismatch = 0
    comp_since_priv = False
    inferred_company = []
    company_oos = []
    for ln in range(start, end):
        raw = lines[ln]
        l = re.sub(r'\s+', ' ', raw).strip()
        if not l:
            continue
        m = COMP.match(l)
        if m:
            hl = m.group(1)
            prev = company
            exp = 'A' if prev == 'FS' else (LETTERS[LETTERS.index(prev) + 1] if prev in LETTERS and LETTERS.index(prev) + 1 < len(LETTERS) else None)
            hmap = CMAP.get(hl, hl.upper())
            if exp and (hl == exp or hmap == exp or hl in CONFUSE.get(exp, ()) or hmap not in LETTERS):
                company = exp
            else:
                company = hmap
                company_oos.append((ln, prev, hl))
            section, cur, in_note = 'officers', None, False
            comp_since_priv = True
            continue
        if re.match(r'^FIELD\s+AND\s+STAFF', l, re.I):
            if len(l) < 70 and not START.match(l):
                company, section, cur, in_note = 'FS', 'officers', None, False
                continue
        if re.match(r'^(NON-?\s*COMM|NOX-COMM|NON-COMMISSIONED|NOX-|\W*NON-?C)', l, re.I) and len(l) < 60:
            section, cur, in_note = 'nco', None, False
            continue
        if re.match(r'^\W*PRIVATES\.?\W*$', l, re.I):
            section, cur, in_note = 'privates', None, False
            comp_since_priv = False
            continue
        if re.match(r'^\W*(OFFICERS|MUSICIANS|ABBREVIATIONS)\.?\W*$', l, re.I):
            if l.upper().strip(' *•.').startswith('OFFICERS'):
                if section in ('nco', 'privates') and company != 'FS' and not comp_since_priv:
                    # company heading lost to OCR: a new OFFICERS list after PRIVATES starts the next company
                    nxt = LETTERS[LETTERS.index(company) + 1] if company in LETTERS and LETTERS.index(company) + 1 < len(LETTERS) else company
                    company = nxt
                    inferred_company.append(ln)
                section = 'officers'
                comp_since_priv = False
            cur, in_note = None, False
            continue
        if len(l) < 75 and (RUNHEAD.match(l) or RUNHEAD2.match(l)):
            continue
        if SKIP.search(l) and len(l) < 60:
            continue
        if ABBREV_KEY.match(l) and len(l) < 25:
            continue
        if NOTE.match(l):
            in_note = True
            cur = None
            notes.append(dict(line=ln, text=l))
            continue
        if in_note:
            # stay in the note until a strong entry start (name + enlistment marker) appears
            if START.match(l) and HAS_E.search(l[:100]):
                in_note = False
            else:
                notes[-1]['text'] += ' ' + l
                continue
        strong = bool(START.match(l) and HAS_E.search(l[:110]))
        if section in ('officers', 'nco') and OFFICER_START.match(l) and cur is not None and not l[0].islower():
            # officer / staff / NCO entry recognised by its rank word even when OCR damaged the name (glued-entry repair)
            cur = dict(co=company, sec=section, text=l, line=ln, inferred=False)
            entries.append(cur)
            continue
        if START.match(l) and (cur is None or cur['text'].rstrip().endswith('.') or cur['text'].rstrip().endswith('..') or strong):
            cur = dict(co=company, sec=section, text=l, line=ln, inferred=(bool(inferred_company) and inferred_company[-1] > ln - 1 and False))
            entries.append(cur)
        elif cur is not None:
            cur['text'] += ' ' + l
    parse_block.last_oos = company_oos
    return entries, notes, inferred_company


SPLIT = re.compile(r"(?<=[\.\,;/•·])\s+(?=[A-Z][A-Za-z'\-\.\^\?]+(?:\s[A-Za-z\.\^]+){0,3},\s+(?:[A-Za-z\.\s'\^\-]{1,32},\s+)?(?:e\.|e,|cm\.|e\s))")


import difflib


def _norm(t):
    return re.sub(r'[^a-z0-9]', '', t.lower())[:70]


def scan_duplicates(entries, min_run=6):
    """The IA Google-scan copies of Moore repeat some pages. An entry that fuzzy-matches an earlier entry of the same unit, in a run of >= min_run
    consecutive entries whose matches are consecutive too, is a repeat of the scan, not a second man. Returns the set of entry indices to drop and
    the tombstones (index, line, matched_line)."""
    keys = [_norm(e['text']) for e in entries]
    idx = {}
    match = [None] * len(entries)
    for i, k in enumerate(keys):
        best, bj = 0.0, None
        for j in idx.get(k[:3], []):
            r = difflib.SequenceMatcher(None, k, keys[j]).ratio()
            if r > best:
                best, bj = r, j
        if best >= 0.80 and entries[i]['co'] and bj is not None and (i - bj) > 3:
            match[i] = bj
        idx.setdefault(k[:3], []).append(i)
    drop = set()
    i = 0
    n = len(entries)
    while i < n:
        if match[i] is not None:
            j = i
            while j + 1 < n and match[j + 1] is not None and 0 < match[j + 1] - match[j] <= 3:
                j += 1
            if j - i + 1 >= min_run:
                for t in range(i, j + 1):
                    drop.add(t)
            i = j + 1
        else:
            i += 1
    tomb = [dict(line=entries[t]['line'], matched_line=entries[match[t]]['line'], text=entries[t]['text'][:100]) for t in sorted(drop)]
    return drop, tomb


def split_glued(entries):
    rows = []
    for e in entries:
        txt = re.sub(r"(?<=\s)[■•·/'\"`~^*]{1,2}(?=\s)", ' ', e['text'])
        txt = re.sub(r'\s+', ' ', txt)
        cuts, last = [], 0
        for m in SPLIT.finditer(txt):
            if HAS_E.search(txt[last:m.start()]):
                cuts.append(m.end())
                last = m.end()
        pos, parts = 0, []
        for c in cuts:
            parts.append(txt[pos:c])
            pos = c
        parts.append(txt[pos:])
        for k, t in enumerate(parts):
            rows.append(dict(co=e['co'], sec=e['sec'], text=t.strip(' •·/'), line=e['line'], glued=(k > 0)))
    return rows


MD = re.compile(r"([A-Z][a-z]{2,8})\.?\s*(\d{1,2})?\s*(?:st|nd|rd|th|d)?\s*,?\s*['\"‘’“”`]+\s*([0-9OIlo£]{2})")
RANK = re.compile(r"\b(Colonel|Lieut\.?\s*Col|Lt\.?\s*Col|Major|Captain|Adjutant|Surgeon|Assistant|Asst|Sergeant|Serg|Sergt|Corporal|Corpl|Musician|1st\s+Lieut|2nd\s+Lieut|2d\s+Lieut|3d\s+Lieut|Lieut|A\.\s*Q\.\s*M|A\.\s*C\.\s*S|Q\.\s*M|Ensign|Chaplain|Wagoner|Quartermaster|Commissary|Bugler|Ordnance|Blacksmith|Artificer|Farrier|Saddler|Teamster)", re.I)


def yr(s):
    s = s.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('£', '1')
    try:
        n = int(s)
    except ValueError:
        return None
    if n in (60, 61, 62, 63, 64, 65):
        return 1800 + n
    if n in (1, 2, 3, 4, 5):
        return 1860 + n
    return None


def dates(s):
    out = []
    for m in MD.finditer(s):
        mo = mon_of(m.group(1))
        if not mo:
            continue
        y = yr(m.group(3))
        if not y:
            continue
        d = int(m.group(2)) if m.group(2) else 15
        d = min(max(d, 1), 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31)
        out.append((datetime.date(y, mo, d), m.start(), m.end(), m.group(2) is None))
    return out


GETT = re.compile(r'Gett|Get\w{0,4}burg|Gettvs', re.I)
CAS_KIND = re.compile(r"^(w|k|pr|c|m)\b")
SEP_KIND = re.compile(r"^(dg|d|k|tr|r)\b")
LEAVES = re.compile(r"\b(Brig|Governor|Gen'?l|General|Cavalry|Artillery|Navy|Engineer|Regiment|Battalion|Legion|Colonel of|Congress|Senate|Staff|Dept|Department)", re.I)


def classify(rows):
    out = []
    names_seen = Counter()
    for r in rows:
        t = re.sub(r'\s+', ' ', r['text'])
        m = re.match(r"^(.+?),\s+(.*)$", t)
        if not m:
            continue
        first, rest = m.group(1), m.group(2)
        rankm = RANK.search(rest[:60])
        rank = ''
        if r['sec'] in ('officers', 'nco') and rankm and (' ' in first.strip()) and not re.match(r'^[A-Z][a-z]+$', first):
            name = first
            rank = rest.split(',')[0] if ',' in rest else rest[:20]
            body = rest[len(rest.split(',')[0]) + 1:] if ',' in rest else rest
            style = 'gs'
        elif re.match(r"^[^\s]+$", first) or r['sec'] == 'privates':
            gv = rest.split(',', 1)
            name = (gv[0] + ' ' + first).strip()
            body = gv[1] if len(gv) > 1 else ''
            style = 'sf'
        else:
            name = first
            rank = rest.split(',')[0]
            body = rest[len(rank) + 1:]
            style = 'gs'
        body = body.strip()
        body_j = re.sub(r'(\w)-\s+(\w)', r'\1\2', body)      # re-join hyphenated line breaks
        segs = [s.strip() for s in re.split(r';', body_j)]
        flags = []
        # enlistment / commission date (first segment that starts with e./cm.)
        enl, enl_kind = None, None
        for s in segs[:3]:
            em = re.match(r"^(e\.|e,|e\s|cm\.|cm,)\s*(.*)$", s)
            if em:
                ed = dates(em.group(2))
                enl_kind = 'cm' if s.startswith('cm') else 'e'
                if ed:
                    enl = ed[0][0]
                break
        sep_before = sep_after = None
        sep_kind = None
        cas = []          # (kind, date or None, segment text)
        other_jul = []    # non-casualty events dated 1-3 July 1863
        retreat = []      # events dated 4-14 July 1863
        und63 = False
        detailed = False
        promoted_out = False
        gb = bool(GETT.search(body_j))
        gb_cas = False
        for s in segs:
            s0 = s.replace('•', '').strip()
            k = re.match(r"^(dg|dt|d|k|tr|r|m|c|pr|w|p)\b", s0)
            if not k:
                # 'w. and pr. ...' style compound handled below; also dated bare text
                if GETT.search(s0) and re.search(r"\b(w|k|pr|c|m)\.", s0):
                    gb_cas = True
                continue
            kind = k.group(1)
            sd = dates(s0)
            isg = bool(GETT.search(s0))
            if kind == 'dt':
                detailed = True
                continue
            if kind == 'p':
                if LEAVES.search(s0) and not re.search(r"\bfrom\b", s0[:12]):
                    promoted_out = True
                if sd and GB_START <= sd[0][0] <= GB_END:
                    other_jul.append((kind, sd[0][0]))
                continue
            # compound 'w. and pr. July 3d' : treat every casualty word in the segment
            if kind in ('w', 'k', 'pr', 'c', 'm'):
                cas.append((kind, sd[0][0] if sd else None, s0))
                if sd:
                    if GB_START <= sd[0][0] <= GB_END:
                        pass
                    elif GB_END < sd[0][0] <= datetime.date(1863, 7, 14):
                        retreat.append((kind, sd[0][0]))
                elif re.search(r"in\s*['‘’`\"]\s*63", s0) or re.search(r"\b63\b", s0):
                    und63 = True
                if kind == 'k' and sd and sd[0][0] < GB_START:
                    # killed before the battle = separation
                    if sep_before is None:
                        sep_before = ('k', sd[0][0])
                elif kind == 'k' and sd and sd[0][0] > GB_END and not isg and sep_after is None:
                    sep_after = ('k', sd[0][0])
                continue
            # separation kinds: dg d tr r
            if kind == 'tr':
                if re.match(r"^tr\.?,?\s+from\b", s0, re.I) or re.match(r"^tr\.?,?\s+to\s+(Com|Co\b|company)", s0, re.I):
                    continue          # transfer in, or between companies of the same regiment: not a separation
            if isg:
                continue
            if sd:
                if sd[0][0] < GB_START and sep_before is None:
                    sep_before = (kind, sd[0][0])
                elif sd[0][0] >= GB_START and sep_after is None:
                    sep_after = (kind, sd[0][0])
            else:
                ym = re.search(r"in\s*['‘’`\"]\s*([0-9OIl]{2})", s0)
                yy = yr(ym.group(1)) if ym else None
                if yy and yy < 1863 and sep_before is None:
                    sep_before = (kind, datetime.date(yy, 6, 30))
                elif yy and yy > 1863 and sep_after is None:
                    sep_after = (kind, datetime.date(yy, 6, 30))
                else:
                    sep_kind = sep_kind or kind
        cas_gb_dated = [c for c in cas if c[1] and GB_START <= c[1] <= GB_END]
        cas_gb_named = [c for c in cas if GETT.search(c[2])] or ([('?', None, '')] if gb_cas else [])
        if enl_kind == 'cm' and enl and enl > GB_END:
            promoted_in = bool(re.search(r"\bp\.\s*from|\bfrom\s+(Capt|Lieut|1st|2nd|2d|Sergeant|Serg|Corporal|ranks|Private)|tr\.\s*from", body_j, re.I))
        else:
            promoted_in = False
        if und63 and not (cas_gb_dated or cas_gb_named):
            flags.append('event-1863-undated')
        if retreat:
            flags.append('event-4-14-july-1863')
        if other_jul:
            flags.append('promotion-1-3-july-1863')
        if detailed:
            flags.append('detailed')
        if promoted_out:
            flags.append('promoted-out-undated')
        if enl and enl_kind == 'e' and GB_START <= enl <= GB_END:
            flags.append('enlisted-1-3-july-1863')
        if enl_kind == 'cm' and enl and GB_START <= enl <= GB_END:
            flags.append('commissioned-1-3-july-1863')
        # ---- label (PLAN 2.2 order) ----
        if enl_kind == 'e' and enl and enl > GB_END:
            lab, why = 'Absent-Documented', f'enlisted {enl} (after 3 July 1863) per Moore 1882'
        elif enl_kind == 'cm' and enl and enl > GB_END and not promoted_in and r['sec'] == 'officers' and False:
            lab, why = 'Absent-Documented', ''
        elif (cas_gb_dated or cas_gb_named or gb) and not sep_before:
            if cas_gb_dated:
                lab, why = 'Present-Documented', f'Moore 1882: {cas_gb_dated[0][0]}. dated {cas_gb_dated[0][1]}: ' + body_j[:80]
            else:
                lab, why = 'Present-Documented', 'Moore 1882 remark names Gettysburg: ' + body_j[:80]
        elif sep_before:
            lab, why = 'Absent-Documented', f'Moore 1882: {sep_before[0]}. {sep_before[1]} before the battle'
        elif enl_kind == 'cm' and enl and enl > GB_END and not promoted_in:
            lab, why = 'Absent-Documented', f'commissioned {enl} (after 3 July 1863), no earlier service shown (Moore 1882)'
        elif enl is None:
            lab, why = 'Unknown', 'no legible enlistment/commission date'
        elif enl_kind == 'cm' and enl and enl > GB_END and promoted_in:
            lab, why = 'Unknown', f'commission {enl} is a promotion from lower rank of the same regiment; earlier service not dated here'
        elif sep_kind:
            lab, why = 'Unknown', f'separation ({sep_kind}.) recorded without a legible date'
        else:
            lab, why = 'Unknown', 'on roll (enlisted before the battle, no separation before it); Moore gives no June 1863 status'
        out.append(dict(co=r['co'], sec=r['sec'], name=name, rank=rank, style=style, enl=str(enl) if enl else None, enl_kind=enl_kind, body=body, label=lab, why=why,
                        line=r['line'], glued=r['glued'], flags=flags, sep_after=(str(sep_after[1]) if sep_after else None)))
    return out


def name_flags(name):
    f = []
    n = name or ''
    if re.match(r"^(e\.|cm\.|'|\W)", n) or re.search(r'e\.\s', n) or len(n) > 40:
        f.append('name-garbled')
    if re.search(r"[^A-Za-z\.' \-,]", n):
        f.append('ocr-noise-in-name')
    return f


def roll_status(label, why, flags):
    w = (why or '').lower()
    if label == 'Absent-Documented':
        return 'not-yet-enlisted' if ('after 3 july' in w) else 'off-roll-before-battle'
    if label == 'Present-Documented':
        return 'named-present'
    if w.startswith('on roll') or w.startswith('commission'):
        return 'on-roll-undetermined'
    return 'unreadable-or-ambiguous'


def normkey(n):
    n = re.sub(r"[^a-z ]", '', (n or '').lower().replace('jr.', '').replace('sr.', ''))
    return re.sub(r'\s+', ' ', n).strip()


def run(unit_id, src='primary'):
    vol, key = SCOPE[unit_id]
    lines = load_lines(vol, src)
    entries, notes, inferred = parse_block(vol, key, lines, src)
    drop, tomb = scan_duplicates(entries)
    entries = [e for i, e in enumerate(entries) if i not in drop]
    rows = split_glued(entries)
    cls = classify(rows)
    return vol, key, entries, notes, rows, cls, inferred, tomb


if __name__ == '__main__':
    args = sys.argv[1:]
    src = 'primary'
    if args and args[0] in ('primary', 'emory'):
        src, args = args[0], args[1:]
    ids = args or [u for u in SCOPE]
    cache = {}
    for u in ids:
        vol, key, entries, notes, rows, cls, inferred, tomb = run(u, src)
        cache[u] = dict(company_out_of_sequence=parse_block.last_oos, scan_repeat_tombstones=tomb, inferred_company_headings=inferred, vol=vol, key=key, entries=len(entries), rows=len(rows), classified=len(cls), notes=notes,
                        labels=dict(Counter(o['label'] for o in cls)), cls=cls)
        print(u, key, 'entries', len(entries), 'rows', len(rows), 'classified', len(cls), dict(Counter(o['label'] for o in cls)), flush=True)
    os.makedirs(os.path.join(DATA, 'work'), exist_ok=True)
    json.dump(cache, open(os.path.join(DATA, 'work', f'moore_classified_{src}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
