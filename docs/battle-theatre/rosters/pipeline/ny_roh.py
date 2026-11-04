"""NY: parse the Roll of Honor of 'New York at Gettysburg' (1900), 'Names of Soldiers in New York Regiments and Batteries
Who were Killed or Mortally Wounded at the Battle of Gettysburg', from the Internet Archive djvu.xml word boxes.
Python 3.11 stdlib only; run with -I -X utf8."""
import re, json, sys, os, difflib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
XML = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NY', 'newyorkatgettysb0001unse_djvu.xml')

RANKS = ['Private', 'Sergeant', 'Corporal', 'Lieutenant', 'Captain', 'Musician', 'Colonel', 'Major', 'Wagoner', 'Artificer', 'Bugler', 'Saddler',
         'Farrier', 'Blacksmith', 'Teamster', 'Quartermaster', 'Surgeon', 'Adjutant', 'Chaplain', 'Trumpeter', 'Drummer', 'Fifer', 'Mechanic', 'Cook',
         'Brigadier', 'Lieut', 'Capt', 'Serg', 'Corp', 'Pri', 'Priv']
RANK_RX = re.compile(r'(Private|Sergeant|Serg|Corporal|Corp|Lieutenant|Lieut|Captain|Capt|Musician|Colonel|Major|Wagoner|Artificer|Bugler|Saddler|Farrier|Blacksmith|Teamster|Quartermaster|Surgeon|Adjutant|Chaplain|Trumpeter|Drummer|Fifer|Mechanic|Cook|Priv\w*)', re.I)


def words_of(page_xml):
    out = []
    for m in re.finditer(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)"(?: x-confidence="(\d+)")?>([^<]*)</WORD>', page_xml):
        l, b, r, t, conf, txt = m.groups()
        out.append(dict(l=int(l), b=int(b), r=int(r), t=int(t), conf=int(conf or 0), txt=txt))
    return out


def unescape(s):
    return s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'")


def lines_of(words, width):
    """cluster words into text lines per column (left/right) by vertical position"""
    cols = {0: [], 1: []}
    mid = width / 2.0
    for w in words:
        c = 0 if (w['l'] + w['r']) / 2 < mid else 1
        cols[c].append(w)
    res = []
    for c in (0, 1):
        ws = sorted(cols[c], key=lambda w: (w['b'] + w['t']) / 2)
        cur = []
        for w in ws:
            yc = (w['b'] + w['t']) / 2
            if cur and abs(yc - cur[-1][0]) > 28:
                res.append((c, cur))
                cur = []
            cur.append((yc, w))
            if len(cur) == 1:
                cur[0] = (yc, w)
        if cur:
            res.append((c, cur))
    out = []
    for c, cur in res:
        ws = sorted([w for _, w in cur], key=lambda w: w['l'])
        out.append(dict(col=c, y=sum((w['b'] + w['t']) / 2 for w in ws) / len(ws), words=ws, text=' '.join(unescape(w['txt']) for w in ws), minconf=min(w['conf'] for w in ws)))
    return out


HEAD_RX = re.compile(r'(\d+)\s*(?:ST|D|ND|RD|TH|st|d|nd|rd|th|P|p|T|t)?\W{0,3}\s*(BATTALION|REGIMENT|INDEPENDENT|CAVALRY)', re.I)


def unit_key(text):
    t = text.upper().replace('.', ' ')
    t = re.sub(r'\s+', ' ', t)
    m = re.search(r'BATTERY\s+([A-Z])\W+(\d+)', t) or re.search(r'BATTERY\s+([A-Z])\W+([I1L]ST|2D|3D)', t)
    if 'BATTERY' in t and 'INDEPENDENT' not in t:
        mm = re.search(r'BATTERY\s+([A-Z])\b', t)
        n = re.search(r'(\d+|[I1L]ST|2D|3D)\s*(?:REG|ARTILLERY)', t)
        return ('BATTERY', mm.group(1) if mm else '?', 'ART')
    if 'INDEPENDENT' in t and 'BATTERY' in t:
        n = re.match(r'\W*(\d+|[I1L]ST|2D|3D)', t)
        return ('INDBATT', n.group(1) if n else '?', 'LA')
    m = re.match(r'\W*([A-Z0-9]{1,5}?)\s*(?:ST|D|ND|RD|TH|P|T)?\s*(REGIMENT|BATTALION)\s*(INFANTRY|CAVALRY)', t)
    if m:
        return (m.group(3), m.group(1), m.group(2))
    return None


MIDX = 1215  # column split measured on the page images (left entry ends near x=1194, right begins near x=1229)


def page_entries(page_xml):
    """-> list of dict(kind='head'|'entry', y, text, minconf, words)"""
    ws = words_of(page_xml)
    ws = [w for w in ws if w['b'] > 330]  # skip running head
    ws.sort(key=lambda w: (w['b'] + w['t']) / 2)
    lines = []
    for w in ws:
        yc = (w['b'] + w['t']) / 2
        if lines and abs(yc - lines[-1]['y']) <= 24:
            lines[-1]['words'].append(w)
            n = len(lines[-1]['words'])
            lines[-1]['y'] = (lines[-1]['y'] * (n - 1) + yc) / n
        else:
            lines.append(dict(y=yc, words=[w]))
    out = []
    for ln in lines:
        wsl = sorted(ln['words'], key=lambda w: w['l'])
        txt_all = ' '.join(unescape(w['txt']) for w in wsl)
        up = txt_all.upper()
        if re.search(r'(REGIMENT|BATTALION|BATTERY|CAVALRY)', up) and not re.search(r'[a-z]{5,}\.{2,}', txt_all) and len(wsl) <= 8 and (sum(1 for c in txt_all if c.isupper()) > 8):
            out.append(dict(kind='head', y=ln['y'], text=txt_all, minconf=min(w['conf'] for w in wsl), words=wsl))
            continue
        left = [w for w in wsl if (w['l'] + w['r']) / 2 < MIDX]
        right = [w for w in wsl if (w['l'] + w['r']) / 2 >= MIDX]
        for side, grp in (('L', left), ('R', right)):
            if grp:
                out.append(dict(kind='entry', side=side, y=ln['y'], text=' '.join(unescape(w['txt']) for w in grp), minconf=min(w['conf'] for w in grp), words=grp))
    return out


# heading order as printed (verified against the plain text, 78 headings, djvu leaves 265-283) -> OOB unit ids
HEAD_ORDER = [
    ('10th Bn Infantry', []), ('39th Bn Infantry', ['U-39NY']), ('40th Infantry', ['U-40NY']), ('41st Infantry', ['U-41NY']), ('42nd Infantry', ['U-42NY']),
    ('43rd Infantry', ['U-43NY']), ('44th Infantry', ['U-44NY']), ('45th Infantry', ['U-45NY']), ('52nd Infantry', ['U-52NY']), ('54th Infantry', ['U-54NY']),
    ('57th Infantry', ['U-57NY']), ('58th Infantry', ['U-58NY']), ('59th Bn Infantry', ['U-59NY']), ('60th Infantry', ['U-60NY']), ('61st Infantry', ['U-61NY']),
    ('62nd Infantry', ['U-62NY']), ('63rd Bn Infantry', ['U-63NY']), ('64th Infantry', ['U-64NY']), ('65th Infantry', ['U-65NY']), ('66th Infantry', ['U-66NY']),
    ('68th Infantry', ['U-68NY']), ('69th Bn Infantry', ['U-69NY']), ('70th Infantry', ['U-70NY']), ('71st Infantry', ['U-71NY']), ('72nd Infantry', ['U-72NY']),
    ('73rd Infantry', ['U-73NY']), ('74th Infantry', ['U-74NY']), ('76th Infantry', ['U-76NY']), ('78th Infantry', ['U-78NY']), ('80th Infantry (20th NYSM)', ['U-80NY']),
    ('82nd Infantry', ['U-82NY']), ('83rd Infantry', ['U-83NY']), ('84th Infantry', ['U-84NY']), ('86th Infantry', ['U-86NY']), ('88th Bn Infantry', ['U-88NY']),
    ('94th Infantry', ['U-94NY']), ('95th Infantry', ['U-95NY']), ('97th Infantry', ['U-97NY']), ('102nd Infantry', ['U-102NY']), ('104th Infantry', ['U-104NY']),
    ('107th Infantry', ['U-107NY-XII']), ('108th Infantry', ['U-108NY']), ('111th Infantry', ['U-111NY']), ('119th Infantry', ['U-119NY']), ('120th Infantry', ['EXTRA-120NY']),
    ('122nd Infantry', ['U-122NY']), ('123rd Infantry', ['U-123NY']), ('124th Infantry', ['U-124NY']), ('125th Infantry', ['U-125NY']), ('126th Infantry', ['U-126NY']),
    ('134th Infantry', ['U-134NY']), ('136th Infantry', ['U-136NY']), ('137th Infantry', ['U-137NY']), ('140th Infantry', ['U-140NY']), ('145th Infantry', ['U-145NY']),
    ('146th Infantry', ['U-146NY']), ('147th Infantry', ['U-147NY']), ('149th Infantry', ['U-149NY']), ('150th Infantry', ['U-150NY']), ('154th Infantry', ['U-154NY']),
    ('157th Infantry', ['U-157NY']), ('1st US Sharpshooters', []), ('5th Cavalry', ['U-5NY-CAV']), ('6th Cavalry', ['U-6NY-CAV']), ('8th Cavalry', ['U-8NY-CAV']),
    ('9th Cavalry', ['U-9NY-CAV']), ('10th Cavalry', []), ('Battery B 1st Artillery', ['EXTRA-B1NY']), ('Battery G 1st Artillery', ['U-ART-G1NY']), ('Battery I 1st Artillery', ['EXTRA-I1NY']),
    ('Battery L 1st Artillery', ['U-ART-L1NY', 'U-ART-L1NY-I']), ('1st Independent Battery', ['U-ART-1NYIND']), ('2nd Independent Battery', []),
    ('4th Independent Battery', ['U-ART-4NYIND']), ('5th Independent Battery', ['U-ART-5NY']), ('10th Independent Battery', []), ('18th Independent Battery', []),
    ('15th Independent Battery', ['U-ART-15NY']),
]
FIRST_LEAF, LAST_LEAF = 264, 282  # djvu leaf indices (0-based list positions) that carry the Roll; leaf 283 is the epilogue


def parse_entry_text(words):
    """name, rank, company from the words of one table cell row (left or right)."""
    toks = [unescape(w['txt']) for w in words]
    conf = [w['conf'] for w in words]
    name_toks = []
    rank = ''
    co = ''
    for i, t in enumerate(toks):
        if RANK_RX.search(t) or re.search(r'\.{3,}|\.\s?\.\s?\.', t) and i > 1:
            # rank and company: the remainder
            rest = ' '.join(toks[i:])
            mr = RANK_RX.search(rest)
            rank = mr.group(1).title() if mr else ''
            tail = re.sub(r'[^A-Za-z0-9]', ' ', rest[mr.end():] if mr else rest).split()
            if tail and re.fullmatch(r'[A-KLM]', tail[-1]):
                co = tail[-1]
            break
        name_toks.append(t)
    name = ' '.join(name_toks)
    name = re.sub(r'[\.\u2026\u00b7_:;\-\u2014~"\*]{2,}.*$', '', name).strip(' .,:;*')
    return name, rank, co, min(conf) if conf else 0


def load_roh():
    x = open(XML, encoding='utf-8', errors='replace').read()
    objs = re.split(r'<OBJECT ', x)[1:]
    out = []
    head_i = -1
    for pi in range(FIRST_LEAF, LAST_LEAF + 1):
        for e in page_entries(objs[pi]):
            if e['kind'] == 'head':
                head_i += 1
                continue
            if head_i < 0:
                continue
            name, rank, co, mc = parse_entry_text(e['words'])
            out.append(dict(heading=HEAD_ORDER[head_i][0], unit_ids=HEAD_ORDER[head_i][1], leaf=pi, side=e['side'], y=int(e['y']), ocr_text=e['text'], name_ocr=name, rank_ocr=rank, co_ocr=co, minconf=mc))
    return out, head_i + 1


def _norm(s):
    return re.sub(r'[^a-z]', '', s.lower())


def split_name(name):
    """'Casey, Daniel' / 'Casey Daniel' -> (surname, given)"""
    n = re.sub(r'[\u201c\u201d"\'`:;]+', '', name)
    if ',' in n:
        sn, gv = n.split(',', 1)
    else:
        parts = n.split()
        sn, gv = (parts[0], ' '.join(parts[1:])) if parts else ('', '')
    return sn.strip(), gv.strip()


def plausible(o):
    n = o['name_ocr']
    if re.match(r'(?i)^name\b', n) or len(_norm(n)) < 4:
        return False
    sn, gv = split_name(n)
    return len(_norm(sn)) >= 3


def match_unit(rows, entries):
    """rows: register CSV rows (dict) of one unit; entries: ROH entries for the unit.
    returns list of (entry, row_or_None, score, how)"""
    idx = {}
    for r in rows:
        if r['section'] == 'xref':
            continue
        sn, gv = split_name(r['name_clean'])
        idx.setdefault(_norm(sn)[:3], []).append((r, _norm(sn), _norm(gv)))
    out = []
    for e in entries:
        if not plausible(e):
            continue
        sn, gv = split_name(e['name_ocr'])
        nsn, ngv = _norm(sn), _norm(gv)
        cands = []
        for lst in idx.values():
            for (r, rs, rg) in lst:
                if abs(len(rs) - len(nsn)) > 2 or not rs or rs[0] != nsn[:1]:
                    continue
                s1 = difflib.SequenceMatcher(None, nsn, rs).ratio()
                if s1 < 0.88:
                    continue
                # two agreeing fields: surname AND first given name (initial-only lines need the initial and a legible company)
                g_ocr = ngv[:8]
                g_reg = rg[:8]
                if not g_ocr or not g_reg or g_ocr[0] != g_reg[0]:
                    continue
                s2 = difflib.SequenceMatcher(None, g_ocr, g_reg).ratio()
                if len(g_ocr) <= 2 or len(g_reg) <= 2:
                    if not e['co_ocr']:
                        continue
                    s2 = max(s2, 0.8)
                if s2 < 0.8:
                    continue
                if e['co_ocr'] and r['company'] and r['company'] != e['co_ocr']:
                    continue
                score = 0.55 * s1 + 0.35 * s2 + (0.10 if (e['co_ocr'] and r['company'] == e['co_ocr']) else 0.0)
                cands.append((score, r))
        cands.sort(key=lambda t: -t[0])
        if cands and (len(cands) == 1 or cands[0][0] - cands[1][0] >= 0.06):
            out.append((e, cands[0][1], cands[0][0], 'match'))
        elif cands:
            out.append((e, None, cands[0][0], 'ambiguous'))
        else:
            loose = False
            for lst in idx.values():
                for (r, rs, rg) in lst:
                    if rs and nsn and rs[0] == nsn[0] and abs(len(rs) - len(nsn)) <= 2 and difflib.SequenceMatcher(None, nsn, rs).ratio() >= 0.88 and ngv[:1] == rg[:1]:
                        loose = True
                        break
                if loose:
                    break
            out.append((e, None, 0.0, 'ambiguous' if loose else 'unmatched'))
    return out
