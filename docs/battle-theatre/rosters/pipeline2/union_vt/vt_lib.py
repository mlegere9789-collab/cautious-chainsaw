"""Shared helpers of the Vermont roster production (work item union-vt).  Standard library only.

  * the pinned OCR search text of the Revised Roster (VT-ROSTER-1892.1), checked against the ledger sha256 by verify_unit.load_source
  * the word boxes of the item's own djvu.xml (a transient file), one dict per word with its text, box, ABBYY line number and
    confidence, aligned token by token to the pinned search text so that every word has its character offset in that text
  * the 11 units of the work item and their leaf ranges in the item (leaf = 0-based index of the item's page images and of the leaf index)
"""
import os, re, sys, json, html, gzip, hashlib, time

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, P2)
import r2lib as R                      # noqa: E402
import verify_unit as V                # noqa: E402

ROOT = V.ROOT
D2 = V.D2
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
XMLPATH = os.path.join(TMP, '_vt_xml', 'cu31924080774148_djvu.xml')
WORK = os.path.join(TMP, 'union-vt-work')
SRC = 'VT-ROSTER-1892'
TEXT_ID = 'VT-ROSTER-1892.1'
SEG = {'s': SRC, 'v': '1', 't': TEXT_ID, 'lay': 'cols'}

_WORD = re.compile(r'<WORD coords="(-?\d+),(-?\d+),(-?\d+),(-?\d+)"(?: x-confidence="(-?\d+)")?[^>]*>([^<]*)</WORD>')
_LINE = re.compile(r'<LINE>')
_LEAFNO = re.compile(r'value="[^"]*_(\d{4,5})\.djvu"')
_TOK = re.compile(r'\S+')


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def load_text():
    """(text, PageMap, ledger entry) of the pinned search text (sha256 checked against the ledger)."""
    return V.load_source(SRC, TEXT_ID)


def xml_leaves(xml_path=XMLPATH, wanted=None):
    """{leaf: [word dict]} with the keys x0, x1, yt, yb, yc, w, conf, ln (the ABBYY line number inside the leaf), seq (order in the xml).
    The leaf is the number in the page file name of the item (0-based, the same index as the hocr page index)."""
    s = open(xml_path, encoding='utf-8').read()
    out = {}
    for o in s.split('<OBJECT ')[1:]:
        m = _LEAFNO.search(o)
        if not m:
            continue
        leaf = int(m.group(1))
        if wanted is not None and leaf not in wanted:
            continue
        ws, ln, seq = [], -1, 0
        for t in re.finditer(r'<LINE>|<WORD coords="(-?\d+),(-?\d+),(-?\d+),(-?\d+)"(?: x-confidence="(-?\d+)")?[^>]*>([^<]*)</WORD>', o):
            if t.group(0) == '<LINE>':
                ln += 1
                continue
            x0, yb, x1, yt = (int(t.group(i)) for i in range(1, 5))
            w = html.unescape(t.group(6)).strip()
            if w:
                ws.append({'x0': x0, 'x1': x1, 'yt': yt, 'yb': yb, 'yc': (yt + yb) / 2.0, 'w': w,
                           'conf': int(t.group(5)) if t.group(5) is not None else None, 'ln': ln, 'seq': seq})
                seq += 1
        out[leaf] = ws
    return out


def align(words, text, a, b, look=12):
    """Sequential alignment of the xml words to the white-space tokens of the leaf text [a, b).  Sets w['off'] (None when a word is
    not found within `look` tokens).  Returns (aligned, unaligned, text tokens, list of text tokens)."""
    tt = [(m.group(), a + m.start()) for m in _TOK.finditer(text[a:b])]
    j, ok, bad = 0, 0, 0
    for w in words:
        if j < len(tt) and tt[j][0] == w['w']:
            w['off'] = tt[j][1]; j += 1; ok += 1
            continue
        for k in range(1, look):
            if j + k < len(tt) and tt[j + k][0] == w['w']:
                w['off'] = tt[j + k][1]; j += k + 1; ok += 1
                break
        else:
            w['off'] = None; bad += 1
    return ok, bad, len(tt), tt


# the 11 units: key, designation, file stem, first leaf, last leaf (0-based leaf index of the item), printed pages (for the report)
UNITS = [
    ('u-vt-2nd-vermont-infantry', '2nd Vermont Infantry', '2nd-vermont-infantry'),
    ('u-vt-3rd-vermont-infantry', '3rd Vermont Infantry', '3rd-vermont-infantry'),
    ('u-vt-4th-vermont-infantry', '4th Vermont Infantry', '4th-vermont-infantry'),
    ('u-vt-5th-vermont-infantry', '5th Vermont Infantry', '5th-vermont-infantry'),
    ('u-vt-6th-vermont-infantry', '6th Vermont Infantry', '6th-vermont-infantry'),
    ('u-vt-12th-vermont-infantry', '12th Vermont Infantry', '12th-vermont-infantry'),
    ('u-vt-13th-vermont-infantry', '13th Vermont Infantry', '13th-vermont-infantry'),
    ('u-vt-14th-vermont-infantry', '14th Vermont Infantry', '14th-vermont-infantry'),
    ('u-vt-15th-vermont-infantry', '15th Vermont Infantry', '15th-vermont-infantry'),
    ('u-vt-16th-vermont-infantry', '16th Vermont Infantry', '16th-vermont-infantry'),
    ('u-vt-1st-vermont-cavalry', '1st Vermont Cavalry', '1st-vermont-cavalry'),
]
