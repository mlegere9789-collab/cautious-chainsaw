import sys, re, json, csv, os, collections
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
import events as ev
import ayl
import mass_run as mr

SRC = {'cu31924096263128': 'NH-AYLING-1895-v1', 'cu31924096263136': 'NH-AYLING-1895-v2'}
UNITS = {  # uid: (ia id, first roster line (0-based) , last line, designation, running-head key)
    'U-2NH': ('cu31924096263128', 4550, 13809, '2nd New Hampshire Volunteer Infantry', 'SECOND'),
    'U-5NH': ('cu31924096263128', 28594, 38183, '5th New Hampshire Volunteer Infantry', 'FIFTH'),
    'U-12NH': ('cu31924096263136', 1543, 7258, '12th New Hampshire Volunteer Infantry', 'TWELFTH'),
    'U-ART-1NH': ('cu31924096263136', 36620, 37497, '1st New Hampshire Volunteer Light Battery', 'BATTERY'),
}
BENTRY = re.compile(r"^(?P<sn>[A-Z][A-Za-z'\-\.\s]{1,28}?),\s+(?P<gn>[A-Z][A-Za-z\.\s,'\-]{0,44}?)\.\s+(?P<rest>(?:b\.|age\s|res\.|enl\.|Unas|F\.\s?and\s?S|Band|See\s).*)$")
HEAD = re.compile(r'^\s*(?:(\d{1,3})\s+)?[A-Z]+\s+REGIMENT\s+NEW\s+HAMPSHIRE\s+VOLUNTEER\s+INFANTRY\.?\s*(\d{1,3})?\s*$')


def entries(uid):
    ia, a, b, des, key = UNITS[uid]
    L = open(os.path.join(f.CACHE, ia + '_djvu.txt'), encoding='utf-8', errors='replace').read().split('\n')[a:b]
    page = None
    ents = []
    cur = None
    pieces = []
    SPLIT = re.compile(r"(?<=[\.;])\s{2,}(?=[A-Z][A-Za-z'\-]+,?\s{1,3}[A-Z][A-Za-z\.\s,']{0,35}?[\.\-]\s{1,5}(?:Co\.\s*\S{1,2}|F\.\s?and\s?S|Unas|Band\b))")
    for k, ln in enumerate(L):
        parts = SPLIT.split(ln.strip())
        for p in parts:
            pieces.append((k, p))
    for k, s in pieces:
        s = s.strip()
        if not s:
            continue
        up = sum(1 for c in s if c.isupper())
        al = sum(1 for c in s if c.isalpha())
        if al >= 12 and up >= 0.7 * al and len(s) < 90 and re.search(r'REG\w*|VOL\w*|INF\w*', s):
            mnum = re.match(r'^(\d{1,3})\s', s) or re.search(r'\s(\d{1,3})\s*$', s)
            if mnum:
                page = int(mnum.group(1))
            continue
        mh = HEAD.match(s)
        if mh:
            pg = mh.group(1) or mh.group(2)
            if pg:
                page = int(pg)
            continue
        s2 = re.sub(r'(?<=\S)\s{2,}(?=\S)', lambda m: m.group(0) if len(m.group(0)) >= 4 else ' ', s)
        m = (BENTRY if uid == 'U-ART-1NH' else ayl.ENTRY).match(re.sub(r'\s{2,3}', ' ', s2))
        if m and (uid == 'U-ART-1NH' or 'Co.' in s[:90] or re.search(r'F\.\s?and\s?S|Unas|Band', s[:90])):
            cur = dict(sn=m.group('sn').strip(), gn=m.group('gn').strip(), page=page, line=a + k, text=m.group('rest').strip())
            ents.append(cur)
        elif cur is not None:
            # skip page furniture
            if re.fullmatch(r'[\dIVXivx\.\s]{1,6}', s):
                continue
            cur['text'] += ' ' + s
    # split entries that swallowed a following entry whose line start was not recognised
    INNER = re.compile(r"\s(?=(?!zzz)[A-Z][A-Za-z'\-]{2,},\s+[A-Za-z][A-Za-z\-\.' ]{1,25}?\.\s+(?:Co\.\s*[A-K]|Unas|Band|F\.\s?and\s?S))")
    out = []
    for e in ents:
        parts = INNER.split(e['text'])
        out.append(dict(e, text=parts[0]))
        for p in parts[1:]:
            m2 = re.match(r"([A-Z][A-Za-z'\-]{2,}),\s+([A-Za-z][A-Za-z\-\.' ]{1,25}?)\.\s+(.*)$", p)
            if m2:
                out.append(dict(sn=m2.group(1), gn=m2.group(2), page=e['page'], line=e['line'], text=m2.group(3), split_from_previous=True))
            else:
                out[-1]['text'] += ' ' + p
    return out


def company_of(text, uid=None):
    if uid == 'U-ART-1NH':
        return 'BTY'
    m = re.match(r"(Co\.\s*([A-K])\b|F\.\s?and\s?S|F\.\s?&\s?S|Unas|Band|Non)", text)
    if not m:
        m2 = re.match(r"Co\.?\s*(\S{1,2})", text)
        if m2 and m2.group(1) in ('II', '11', '1I', 'Il', 'I1'):
            return 'H'
        return ('?' + m2.group(1)) if m2 else '?'
    if m.group(2):
        return m.group(2)
    t = m.group(1)
    return {'Unas': 'UNASSIGNED', 'Band': 'BAND', 'Non': 'NCS'}.get(t, 'FS')


def build(uid):
    ia, a, b, des, key = UNITS[uid]
    ents = entries(uid)
    seen = collections.Counter()
    rows = []
    for e in ents:
        seen[(e['sn'].lower(), e['gn'].lower())] += 1
    for e in ents:
        txt = e['text']
        facts = ayl.analyse(txt)
        lab, rs, code, words, flags = ev.label(facts, None)
        flags = list(flags)
        if facts.get('xref_only'):
            lab, rs, code, words = 'Duplicate-Xref', 'xref', 'XREF-ONLY', 'cross-reference row: this register gives no dates here and refers to the record under another organization'
        co = company_of(txt, uid)
        age = re.search(r'age\s+(\d{1,2})', txt)
        res = re.search(r'res\.\s+([^;]+?)\s*(?:;|$)', txt)
        cred = re.search(r'cred\.\s+([^;]+?)\s*(?:;|$)', txt)
        bth = re.search(r'\bb\.\s+([^;]+?)\s*;', txt)
        name = e['sn'] + ', ' + e['gn']
        if seen[(e['sn'].lower(), e['gn'].lower())] > 1:
            flags.append('same-name-different-man-possible')
        if re.search(r"[^A-Za-z\.\,\s'\-]", name):
            flags.append('name-garbled')
        if len(re.findall(r"(Deo\.|Uec\.|'SO|\bdiscli|\bdisoh|\bwd\.\s*;\s*des|umst|mast\.|Ang\.|\b[A-Za-z]+[0-9]+[A-Za-z]+\b)", txt)) >= 1:
            flags.append('ocr-poor-text')
        rows.append(dict(
            unit_id=uid, regiment=des, company=co, section='register', name_as_printed=name, name_clean=e['gn'] + ' ' + e['sn'],
            rank_as_printed=(re.search(r"as\s+([A-Z][A-Za-z\. ]{2,25}?)\s*(?:;|\.|$)", txt).group(1) if re.search(r"as\s+([A-Z][A-Za-z\. ]{2,25}?)\s*(?:;|\.|$)", txt) else ''),
            rank_class='', age=age.group(1) if age else '', residence=(res.group(1) if res else (cred.group(1) + ' (credited)' if cred else '')),
            enlisted_or_commissioned=(facts['E'].isoformat() + ('' if facts['E_prec'] == 'day' else ' (%s only)' % facts['E_prec'])) if facts['E'] else '',
            remarks_as_printed=re.sub(r'\s+', ' ', txt), presence_label=lab, presence_basis=words, basis_code=code, roll_status=rs,
            evidence_label={'Present-Documented': 'Documented', 'Absent-Documented': 'Documented'}.get(lab, 'Unknown'),
            dup_group='', source_id=SRC[ia], source_locator='Ayling 1895, %s, book p.%s' % ('vol 1' if ia.endswith('128') else 'vol 2', e['page']),
            parse_flags=';'.join(flags)))
    for r in rows:
        r['rank_class'] = mr.rank_class(r['rank_as_printed'] or 'Priv.')
    return rows


if __name__ == '__main__':
    os.makedirs(os.path.join(f.DATA, 'new-hampshire'), exist_ok=True)
    st = {}
    for uid in (sys.argv[1:] or UNITS):
        rows = build(uid)
        p = os.path.join(f.DATA, 'new-hampshire', mr.slug(UNITS[uid][3]) + '.csv')
        mr.write_csv(p, rows)
        c = collections.Counter(r['presence_label'] for r in rows)
        rs = collections.Counter(r['roll_status'] for r in rows)
        print(uid, len(rows), dict(c), dict(rs), collections.Counter(r['company'] for r in rows).most_common(14))
