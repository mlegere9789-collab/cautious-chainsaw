"""Doles-Cook brigade (4th, 12th, 21st, 44th Georgia): Thomas, History of the Doles-Cook Brigade (1903), IA historyofdolesco00thom.
Entry layout: 'SURNAME, GIVEN-' then 'Rank, date. remarks' over following lines (the 1903 company rolls were written by veterans, so remarks
carry service history, not the muster-roll status of 30 June 1863).
Run: python -X utf8 dolescook_parse.py"""
import re, sys, json, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SRC = CACHE + 'historyofdolesco00thom_djvu.txt'
SID = 'GA-THOMAS-1903-DOLESCOOK-v1'
lines = open(SRC, encoding='utf-8', errors='replace').read().splitlines()

# regiment regions from the 'ROSTER OF FIELD AND STAFF OF ...' headings (1-based line numbers found with grep)
REGS = [('C-4GA', '4th Georgia Infantry', 4837, 13935), ('C-12GA', '12th Georgia Infantry', 13936, 22334),
        ('C-21GA', '21st Georgia Infantry', 22335, 30562), ('C-44GA', '44th Georgia Infantry', 30563, 39024)]

HDR = re.compile(r'''^\s*[^A-Za-z]{0,2}([A-Z][A-Za-z'’\.\- ]{1,32}?)\s*[,\.]\s+([A-Za-z][A-Za-z\.'’\-\\" ]{0,38}?)\s*[—\-–~_=‒]+\s*(.*)$''')
MIDHDR = re.compile(r"(?<=[\.\s;,:])([A-Z][A-Z'’\-]{2,}(?: [A-Z][A-Z'’\-]+)?)[,\.]\s+([A-Z][A-Za-z\.'’\-\ ]{1,34}?)\s*[—~]")
STOP = re.compile(r"^\s*(CHAPTER|History\s+of\s+the|HISTORY\s+OF|Sketches?\s+of|.*Field\s+and\s+Staff\s+Officers|ERRATA|INDEX)\b", re.I)
HDR2 = re.compile(r'''^\s*([^\s,]{2,34}(?: [^\s,]{1,34})?),\s+(.{1,45}?)\s*[—\-–~_=‒]+\s*()$''')
HDR_NODASH = re.compile(r"^\s*([A-Z][A-Z'\u2019\.\- ]{2,30}),\s+([A-Z][A-Z\.'\u2019\- ]{1,36})\s*$")
PAGEHDR1 = re.compile(r'^\s*(\d{2,3})\s+Doles.?Cook\s+Brig', re.I)
PAGEHDR2 = re.compile(r'^\s*Muster\s+\w+\s+(of|op)?\s*(the)?\s*[\w\- ]+Regi?\w*\.?\s*\W*\s*(\d{2,3})?\s*\W*$', re.I)
PAGEHDR3 = re.compile(r'^\s*Muster\s+\w+.*?(\d{2,3})\s*\W*$', re.I)
JUNK = re.compile(r'^\s*(\d{0,2}[a-z]{1,3}(-[a-z])?|[A-Za-z]\d?[a-z]-?c?|\W+)\s*$')


def upper_frac(s):
    L = [c for c in s if c.isalpha()]
    return sum(c.isupper() for c in L) / max(1, len(L))


def company_header(i, reg_end):
    """If line i opens a company roll, return (letter, name, county, next_i)."""
    if not re.match(r'^\s*MUSTER\s+R', lines[i]):
        return None
    blk = ' '.join(l.strip() for l in lines[i:i + 5])
    blk = blk.replace('- ', '')
    m = re.search(r'(?:COMPANY|PANY|COM)\s*,?\s*([A-K])\b', blk)
    nm = re.search(r'MUSTER\s+R\w+\s+O[FKP]\s+(?:THE\s+)?(.*?)(?:,?\s*COM|,?\s*COMPANY|,?\s*PANY)', blk)
    cty = re.search(r'([A-Z][A-Z ]+COUNTY|[A-Z]+\s+COUNTY),?\s+GEORGIA', blk)
    return (m.group(1) if m else '?', nm.group(1).strip(' ,') if nm else '', cty.group(1) if cty else '')


def parse_region(uid, regname, a, b):
    rows = []
    state = dict(line=0, comp='FS', cname='field and staff', cty='', page=None, cur=None, seen=False)

    def flush():
        cur = state['cur']
        if not cur:
            return
        txt = squash(' '.join(cur['body']).replace('- ', ''))
        c = classify_history(txt)
        flg = list(c['flags'])
        if c['basis_code'] == 'CONFLICT' and c['basis'].count('enlisted') == 0:
            pass
        rank = re.split(r'[,\.]', txt, 1)[0][:40] if txt else ''
        nm = squash(cur['surname'] + ', ' + cur['given'])
        fl = name_flags(nm) + flg
        if cur.get('dash_missing'):
            fl.append('header-dash-missing')
        rows.append(dict(regiment=regname, unit_id=uid, company=cur['company'], section='roll:' + cur['cname'], name_as_printed=nm,
                         rank_as_printed=rank, enlist_or_commission_date=c['enlisted'], residence_or_county=cur['cty'], remarks_as_printed=txt,
                         presence_label=c['label'], presence_basis=c['basis'], basis_code=c['basis_code'], dup_group='', source_id=SID,
                         source_locator=('book p.%s' % cur['page']) if cur['page'] else 'book page not printed in the scan before this entry (djvu text line %d)' % cur.get('line', 0), parse_flags=';'.join(sorted(set(fl))), roll_status=c['roll_status']))
        state['cur'] = None

    def handle(ln, i):
        ch = company_header(i, b) if i is not None else None
        if ch:
            flush()
            state['comp'], state['cname'], state['cty'] = ch
            return 4
        m = PAGEHDR1.match(ln)
        if m:
            state['page'] = m.group(1)
            return 0
        if PAGEHDR2.match(ln) or (re.match(r'^\s*Muster\s+\w+', ln) and len(ln) < 70):
            m3 = re.search(r'(\d{2,3})\s*\W*$', ln)
            if m3:
                state['page'] = m3.group(1)
            return 0
        if JUNK.match(ln):
            return 0
        if state['seen'] and STOP.match(ln) and len(ln) < 90:
            flush()
            return -1
        m = HDR.match(ln)
        if not m:
            m = HDR2.match(ln)
            if m and (upper_frac(m.group(1)) < 0.6 or len(ln.strip()) > 80 or re.match(r'^\s*(MUSTER|PANY|COM)', ln)):
                m = None
        nd = None if m else HDR_NODASH.match(ln)
        if (m and upper_frac(m.group(1)) >= 0.6) or nd:
            state['seen'] = True
            flush()
            if m:
                state['cur'] = dict(surname=m.group(1), given=m.group(2), body=[m.group(3)] if m.group(3).strip() else [], company=state['comp'],
                                    cname=state['cname'], cty=state['cty'], page=state['page'], line=state['line'])
            else:
                state['cur'] = dict(surname=nd.group(1), given=nd.group(2), body=[], company=state['comp'], cname=state['cname'], cty=state['cty'],
                                    page=state['page'], line=state['line'], dash_missing=True)
        elif state['cur'] is not None and ln.strip():
            state['cur']['body'].append(ln.strip())
        return 0

    i = a - 1
    while i < b:
        ln = lines[i]
        state['line'] = i + 1
        # an entry header glued to the end of the previous entry's last line
        ms = [m for m in MIDHDR.finditer(ln) if m.start() > 3 and upper_frac(m.group(1)) >= 0.9]
        if ms and not re.match(r'^\s*MUSTER', ln):
            m = ms[0]
            head, tail = ln[:m.start()], ln[m.start():]
            if head.strip() and state['cur'] is not None:
                state['cur']['body'].append(head.strip())
            r = handle(tail, None)
        else:
            r = handle(ln, i)
        if r == -1:
            break
        i += 1 + (r if r > 0 else 0)
    flush()
    return rows


FS_RANK = (r"(Lieut\w*[- ]?Col\w*|Colonel|Major|Adjutant|Quartermaster[- ]Sergeant|Quartermaster|Commissary[- ]Sergeant|Commissary|"
           r"Assistant\s+Surgeon|Ass'?t\.?\s+Surgeon|Surgeon|Chaplain|Ensign|Sergeant[- ]Major|Ordnance[- ]Sergeant|Hospital\s+Steward|"
           r"Chief\s+Musician|Musician|Drum[- ]Major|Captain|Lieutenant)")


def roll_start(a, b):
    for i in range(a, b):
        if re.match(r'^\s*MUSTER\s+R', lines[i]):
            return i + 1
    return b


def parse_fs(uid, regname, a, b):
    """Field and staff list: 'Name  Rank.' lines between the FS heading and the first company roll heading."""
    rows = []
    end = roll_start(a, b)
    sect, page = 'field and staff', None
    for k_ln, ln in enumerate(lines[a - 1:end - 1]):
        m = PAGEHDR1.match(ln)
        if m:
            page = m.group(1)
            continue
        s = squash(re.sub(r'\s+', ' ', ln))
        if not s:
            continue
        if re.match(r'^(NON|NCN|NOX)', s, re.I):
            sect = 'non-commissioned staff'
            continue
        if re.search(r'MEMBERS', s) and re.search(r'BAND', s):
            sect = 'band'
            continue
        m = re.match(r"^(.{3,45}?)\s+" + FS_RANK + r"(?:,?\s*Company\s+([A-K]))?[\.,]?$", s)
        if not m:
            continue
        nm = squash(m.group(1))
        if re.search(r'(REGIMENT|ROSTER|BRIGADE)', nm):
            continue
        rank = m.group(2)
        co = m.group(3) or ('BAND' if sect == 'band' else 'FS')
        rows.append(dict(regiment=regname, unit_id=uid, company=co, section=sect, name_as_printed=nm, rank_as_printed=rank,
                         enlist_or_commission_date='', residence_or_county='',
                         remarks_as_printed='(regiment roster of field and staff and band: rank only, no dates or status printed)',
                         presence_label='Unknown',
                         presence_basis='on the regiment field-and-staff list, which gives rank only, no dates; who held the post on 1 July 1863 is not stated',
                         basis_code='ONROLL-NO-STATUS', dup_group='', source_id=SID, source_locator=('book p.%s' % page) if page else 'field and staff list, book page not printed in the scan before this entry (djvu text line %d)' % (a + k_ln),
                         parse_flags=';'.join(name_flags(nm)), roll_status='on-roll-undetermined'))
    return rows


if __name__ == '__main__':
    allrows = []
    for uid, regname, a, b in REGS:
        rows = parse_region(uid, regname, roll_start(a, b), b)
        fs = parse_fs(uid, regname, a, b)
        rows = fs + rows
        for k, r in enumerate(rows):
            r['dup_group'] = ''
        # AUDIT 2026-10-30: a man on the field-and-staff list who also has a company-roll entry (same surname, same given name and middle initial, exactly one such
        # entry in the regiment) is one man counted twice; the staff row becomes a cross-reference and the company entry carries the label (as in the Salley parser).
        def _k(nm):
            sur, _, giv = nm.partition(',')
            toks = re.findall(r'[A-Za-z]+', giv)
            return (re.sub(r'[^a-z]', '', sur.lower()), tuple(t.lower()[:1] if len(t) == 1 else t.lower() for t in toks[:2]) if toks else ())
        comp_rows = {}
        for r in rows:
            if r['section'].startswith('roll:'):
                comp_rows.setdefault(_k(r['name_as_printed']), []).append(r)
        nx = 0
        for r in rows:
            if r['section'].startswith('roll:'):
                continue
            kk = _k(r['name_as_printed'])
            cand = comp_rows.get(kk, [])
            if len(cand) == 1 and kk[1]:
                nx += 1
                gid = 'dcfs-%s-%d' % (uid, nx)
                r['dup_group'] = cand[0]['dup_group'] = gid
                r['presence_label'], r['basis_code'], r['roll_status'] = 'Duplicate-Xref', 'DUP-XREF', 'xref'
                r['presence_basis'] = 'cross-reference: the same man has an entry on the company roll (%s, %s); the label is carried by that entry' % (cand[0]['company'], cand[0]['source_locator'])
                r['parse_flags'] = (r['parse_flags'] + ';also-on-company-roll').strip(';')
        allrows += rows
        write_csv(OUT + 'csv/%s.csv' % uid, rows)
        cnt = collections.Counter(r['presence_label'] for r in rows)
        cc = collections.Counter(r['company'] for r in rows)
        print(uid, len(rows), dict(cnt), dict(sorted(cc.items())))
