"""Sources that were local after the first pass of the tl-04 close-out and are used by the second reading (2026-11-16):
texts saved by other workstreams under tmp/library (read in place, nothing is downloaded here).

  TOWN  HOKE-1887, HISTORY-ADAMS-1886, CONEWAGO-REILY-1885, BARTON-ANGELS-1898   (tmp/library/town; later books about the town and the campaign)
  MED   USSC-GETTYSBURG-1863, SOUDER-LEAVES-1864                                    (tmp/library/medical; 1863 report of the U.S. Sanitary Commission, 1864 letters)
  CA    CA-<lccn>-<date>-p<seq>[-ed<n>]                                             (tmp/library/web/ca/pages and retry: pages of 1863 newspapers, Library of Congress
                                                                                     Chronicling America, OCR text layer of the page image)

A later published book is a published source but not an eyewitness account and not a report of the time: a sub-claim that rests on it alone is
tier 'inferred' (same rule as DD-TL01-11).  A newspaper of 1863 is a contemporary source for what it prints, not for what happened; a reprint is not
a second witness.
"""
import os, re, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LIBR = os.path.join(ROOT, 'tmp', 'library')

BOOKS = {
    'HOKE-1887': dict(path='town/HOKE-1887/greatinvasionof102hoke_djvu.txt', scope='TOWN', date='1887', ident='greatinvasionof102hoke',
                      title='J. Hoke, The Great Invasion of 1863; or, General Lee in Pennsylvania (Dayton, Ohio 1887)',
                      cls='published history written 24 years after the event (1887); a later book, not an eyewitness account'),
    'HISTORY-ADAMS-1886': dict(path='town/HISTORY-ADAMS-1886/cu31924028852619_djvu.txt', scope='TOWN', date='1886', ident='cu31924028852619',
                               title='History of Cumberland and Adams Counties, Pennsylvania (Warner, Beers and Co., Chicago 1886), Adams County part',
                               cls='county history of 1886 (compiled from later recollection); a later book, not an eyewitness account'),
    'CONEWAGO-REILY-1885': dict(path='town/CONEWAGO-REILY-1885/ConewagoACollection_djvu.txt', scope='TOWN', date='1885', ident='ConewagoACollection',
                                title='D. Reily, Conewago: A Collection of Catholic Local History (1885)', cls='local history of 1885; a later book'),
    'BARTON-ANGELS-1898': dict(path='town/BARTON-ANGELS-1898/angelsofbattlefi00bart_djvu.txt', scope='TOWN', date='1898', ident='angelsofbattlefi00bart',
                               title='G. Barton, Angels of the Battlefield (1898)', cls='published history of the nursing sisters (1898)'),
    'USSC-GETTYSBURG-1863': dict(path='medical/USSC-GETTYSBURG-1863/reportonoperatio00doug_djvu.txt', scope='MED', date='1863-08-15', ident='reportonoperatio00doug',
                                 title='J. H. Douglas, Report on the Operations of the Sanitary Commission during and after the Battles at Gettysburg, July 1st, 2d and 3d, 1863 (New York 1863; signed Washington, D. C., Aug. 15, 1863)',
                                 cls='report of 1863 by an associate secretary of the U.S. Sanitary Commission, with statements of its representatives printed in it'),
    'SOUDER-LEAVES-1864': dict(path='medical/SOUDER-LEAVES-1864/leavesfrombattle00soud_djvu.txt', scope='MED', date='1864', ident='leavesfrombattle00soud',
                               title='Leaves from the Battle-field of Gettysburg: a series of letters from a field hospital and National Cemetery (Philadelphia 1864)',
                               cls='letters written at Gettysburg in July 1863 by a relief worker (E. B. S.), printed 1864; what residents told her is second-hand'),
}

# LCCN -> title as printed by the Library of Congress (saved search results of the web workstream)
PAPERS = {
    'sn83045462': 'Evening Star (Washington, D.C.)', 'sn83021205': 'Worcester Daily Spy (Worcester, Mass.)', 'sn83030213': 'New-York Daily Tribune',
    'sn83030313': 'The New York Herald', 'sn84031490': 'Chicago Daily Tribune', 'sn83020847': 'Springfield Weekly Republican',
    'sn86059058': 'The Daily Evansville Journal', 'sn82014306': 'Indiana State Sentinel (Indianapolis)', 'sn83026172': 'Daily National Intelligencer (Washington City)',
    'sn84027060': 'The Burlington Weekly Hawk-Eye', 'sn83045784': 'Weekly National Intelligencer', 'sn83032312': 'Monmouth Herald and Inquirer (Freehold, N.J.)',
    'sn83032103': 'West-Jersey Pioneer (Bridgeton, N.J.)',
}
CA_RX = re.compile(r'^CA-(sn\d{8})-(\d{4}-\d\d-\d\d)-p(\d+)(?:-ed(\d+))?$')
_MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
_ca = None


def ca_sources():
    """{id: path} of the newspaper pages saved by the web workstream (ed-1 and later editions; the one flat retry file is skipped); when tmp/tl-04/ca_manifest.json
    exists only the pages it lists are used (the corpus is frozen because the web workstream keeps adding pages)"""
    global _ca
    if _ca is None:
        _ca = {}
        mp = os.path.join(HERE, 'ca_manifest.json')
        if os.path.exists(mp):
            import json
            for it in json.load(open(mp, encoding='utf-8'))['items']:
                _ca[it['id']] = os.path.join(ROOT, it['path'])
            return _ca
        for base in ('ca/pages', 'retry/ca/pages'):
            for p in glob.glob(os.path.join(LIBR, 'web', base, '*', '*', 'ed-*', 'seq-*.txt')):
                m = re.search(r'/(sn\d{8})/(\d{4}-\d\d-\d\d)/ed-(\d+)/seq-(\d+)\.txt$', p)
                if m:
                    sid = 'CA-%s-%s-p%s%s' % (m.group(1), m.group(2), m.group(4), '' if m.group(3) == '1' else '-ed' + m.group(3))
                    _ca.setdefault(sid, p)
    return _ca


def extra_sources():
    out = {}
    for sid, b in BOOKS.items():
        p = os.path.join(LIBR, b['path'])
        if os.path.exists(p):
            out[sid] = p
    out.update(ca_sources())
    return out


def scope_ids(scope):
    """TOWN | MED | CA | EXT (all three)"""
    if scope == 'CA':
        return sorted(ca_sources())
    if scope in ('TOWN', 'MED'):
        return [s for s, b in BOOKS.items() if b['scope'] == scope and os.path.exists(os.path.join(LIBR, b['path']))]
    if scope == 'EXT':
        return scope_ids('TOWN') + scope_ids('MED') + scope_ids('CA')
    raise ValueError(scope)


_titles = None


def paper_title(lccn):
    """paper name as printed by the Library of Congress (saved search results of the web workstream: 'Image n of <name>, <date>')"""
    global _titles
    if _titles is None:
        import json
        _titles = {}
        for f in glob.glob(os.path.join(LIBR, 'web', 'ca', 'search', '*.json')):
            try:
                d = json.load(open(f, encoding='utf-8'))
            except Exception:
                continue
            for r in (d.get('results') or []) if isinstance(d, dict) else []:
                if not isinstance(r, dict):
                    continue
                m = re.search(r'(sn\d{8})', str(r.get('id') or r.get('url') or ''))
                t = re.match(r'Image \d+ of (.+), [A-Z][a-z]+ \d+, \d{4}$', str(r.get('title') or ''))
                if m and t:
                    _titles.setdefault(m.group(1), t.group(1))
    return PAPERS.get(lccn) or _titles.get(lccn) or 'newspaper (LCCN %s)' % lccn


def ca_label(sid):
    m = CA_RX.match(sid)
    lccn, date, seq, ed = m.groups()
    title = paper_title(lccn)
    d = '%s %d, %s' % (_MONTHS[int(date[5:7])], int(date[8:10]), date[:4])
    return '%s, %s, page %s%s (Library of Congress, Chronicling America; OCR text layer)' % (title, d, seq, (', edition %s' % ed) if ed else '')


def ca_page(sid):
    m = CA_RX.match(sid)
    lccn, date, seq, ed = m.groups()
    return seq, 'page %s of the issue (image sequence %s of Chronicling America, LCCN %s, %s%s); not read on the page image' % (seq, seq, lccn, date, (', edition ' + ed) if ed else '')


# ------------------------------------------------------------------ running heads of the books (raw text, isolated short lines)
_HEAD_NUM = r'(\d{1,4})\.?'
_HA = re.compile(r'^' + _HEAD_NUM + r'\s+(\S.{2,80})$')
_HB = re.compile(r'^(\S.{2,80}?)\s+' + _HEAD_NUM + r'$')
_HC = re.compile(r'^' + _HEAD_NUM + r'$')
_WEEKDAY = re.compile(r'^"?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b')
MAX_PAGE = {'USSC-GETTYSBURG-1863': 40, 'SOUDER-LEAVES-1864': 400, 'HOKE-1887': 950, 'HISTORY-ADAMS-1886': 1000, 'CONEWAGO-REILY-1885': 700, 'BARTON-ANGELS-1898': 400}
MIN_DIGITS_ALONE = {'USSC-GETTYSBURG-1863': 1}      # a number alone on a line is a head only with this many digits (default 3)
_heads = {}


def heads(sid, raw):
    if sid in _heads:
        return _heads[sid]
    top = MAX_PAGE.get(sid, 999)
    md = MIN_DIGITS_ALONE.get(sid, 3)
    lines = raw.split('\n')
    out = []
    pos = 0
    for i, ln in enumerate(lines):
        off = pos
        pos += len(ln) + 1
        l = re.sub(r'\s+', ' ', ln).strip()
        if not l or len(l) > 90 or _WEEKDAY.match(l):
            continue
        if not ((i == 0 or not lines[i - 1].strip()) or (i + 1 >= len(lines) or not lines[i + 1].strip())):
            continue
        m = _HC.match(l)
        if m:
            if len(m.group(1)) >= md and int(m.group(1)) <= top:
                out.append((int(m.group(1)), off, l))
            continue
        m = _HA.match(l)
        if m and not re.match(r'^[a-z]', m.group(2)) and int(m.group(1)) <= top:
            out.append((int(m.group(1)), off, l))
            continue
        m = _HB.match(l)
        if m and not re.search(r'[a-z]{4,} [a-z]{3,} [a-z]{3,}', m.group(1)) and int(m.group(2)) <= top:
            out.append((int(m.group(2)), off, l))
    _heads[sid] = out
    return out


def book_page(sid, raw, off, off_end=None):
    """(page, basis) from the heads before and after the passage when their numbers are consecutive (CERTAIN), else (None, reason)"""
    hs = heads(sid, raw)
    pv = [h for h in hs if h[1] <= off]
    end = off if off_end is None else off_end
    nx = [h for h in hs if h[1] > end]
    p = pv[-1] if pv else None
    n = nx[0] if nx else None
    if p and n and n[0] == p[0] + 1:
        return str(p[0]), 'running heads of the text: "%s" before the passage and "%s" after it (consecutive pages %d and %d); the page was not read on the page image' % (p[2][:48], n[2][:48], p[0], n[0])
    return None, 'no certain printed page from the heads of the OCR text (before: %s, after: %s); offset given' % (p and p[2][:40], n and n[2][:40])
