"""Shared helpers of the Maine roster production (work item union-me).  Standard library only.

  * word boxes of an Internet Archive djvu.xml, aligned token by token to the pinned OCR search text, so that every word has its
    character offset in that text (the base of the roster2 format)
  * source text and page map loading through the ledger of data2/sources (sha256 checked)

The djvu.xml files are transient files under tmp/library/rosters/_me_xml/ (deleted after the production run, their sha256 stay in the
ledger and in the manifest).
"""
import os, re, sys, json, html, gzip, bisect, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, P2)
import r2lib as R                      # noqa: E402
import verify_unit as V                # noqa: E402

ROOT = V.ROOT
D2 = V.D2
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
XMLDIR = os.path.join(TMP, '_me_xml')
WORK = os.path.join(TMP, 'union-me-work')

_WORD = re.compile(r'<WORD coords="(-?\d+),(-?\d+),(-?\d+),(-?\d+)"[^>]*>([^<]*)</WORD>')
_LEAFNO = re.compile(r'value="[^"]*_(\d{4,5})\.djvu"')


def load_text(source_id, text_id):
    """(text, PageMap, ledger entry) of a pinned text; raises when the sha256 differs from the ledger."""
    return V.load_source(source_id, text_id)


def xml_leaves(xml_path, wanted=None):
    """{leaf number (1-based, from the item's page file name): [word dict]}.  Word: x0, x1, yt, yb, yc, w (text, stripped)."""
    s = open(xml_path, encoding='utf-8').read()
    out = {}
    for o in s.split('<OBJECT ')[1:]:
        m = _LEAFNO.search(o)
        if not m:
            continue
        leaf = int(m.group(1))
        if wanted is not None and leaf not in wanted:
            continue
        ws = []
        for c in _WORD.finditer(o):
            x0, yb, x1, yt = (int(c.group(i)) for i in range(1, 5))
            w = html.unescape(c.group(5)).strip()
            if w:
                ws.append({'x0': x0, 'x1': x1, 'yt': yt, 'yb': yb, 'yc': (yt + yb) / 2.0, 'w': w})
        out[leaf] = ws
    return out


def align(words, text, a, b, look=12):
    """Sequential alignment of xml words to the white-space tokens of the leaf text [a, b).  Sets w['off'] (None when a
    word is not found within `look` tokens).  Returns (aligned, unaligned, text tokens)."""
    tt = [(m.group(), a + m.start()) for m in re.finditer(r'\S+', text[a:b])]
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
    return ok, bad, len(tt)


def sha256_file(p):
    return R.sha256_file(p)
