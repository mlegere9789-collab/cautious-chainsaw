"""Shared helpers of the Pennsylvania roster production (work item union-pa).  Standard library only.

Source: Bates, History of Pennsylvania Volunteers, 1861-5, five volumes (Internet Archive items historyofpennsyl01bate .. 04bate and
historyofpennsyl00bate = volume 5).  One source id (PA-BATES-1869), one text id per volume (PA-BATES-1869.<volume>).

  * the pinned OCR search text, leaf index and printed page numbers of a volume, checked against the ledger sha256
  * the word boxes of the volume's own djvu.xml (a transient file, deleted after the cache is written), one dict per word with its text,
    box, ABBYY line number and confidence, aligned token by token to the pinned search text so that every word has its character
    offset in that text; cached per volume in tmp/library/rosters/union-pa-work/leaves-vol<N>.jsonl.gz (one JSON line per leaf)
"""
import os, re, sys, json, html, gzip, time

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, P2)
import r2lib as R                      # noqa: E402
import verify_unit as V                # noqa: E402

ROOT = V.ROOT
D2 = V.D2
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
RAW = os.path.join(TMP, 'PA-BATES-1869')
XMLDIR = os.path.join(TMP, '_pa_xml')
WORK = os.path.join(TMP, 'union-pa-work')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-pa')
SRC = 'PA-BATES-1869'
IDENT = {1: 'historyofpennsyl01bate', 2: 'historyofpennsyl02bate', 3: 'historyofpennsyl03bate', 4: 'historyofpennsyl04bate',
         5: 'historyofpennsyl00bate'}
MANIFEST = os.path.join(TMP, 'MANIFEST-union-pa.json')

_TOK = re.compile(r'\S+')


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def text_id(vol):
    return '%s.%d' % (SRC, vol)


def load_text(vol):
    """(text, PageMap, ledger entry) of the pinned search text of volume vol (sha256 checked against the ledger)."""
    return V.load_source(SRC, text_id(vol))


def xml_path(vol):
    return os.path.join(XMLDIR, IDENT[vol] + '_djvu.xml')


def cache_path(vol):
    return os.path.join(WORK, 'leaves-vol%d.jsonl.gz' % vol)


_LEAFNO = re.compile(r'value="[^"]*_(\d{4,5})\.djvu"')
_ITEM = re.compile(r'<LINE>|<WORD coords="(-?\d+),(-?\d+),(-?\d+),(-?\d+)"(?: x-confidence="(-?\d+)")?[^>]*>([^<]*)</WORD>')


def xml_leaves(path, wanted=None):
    """Generator of (leaf, [word dict]) from the djvu.xml: keys x0, x1, yt, yb, w, conf, ln (ABBYY line number in the leaf), seq.  The leaf
    is the number in the page file name of the item (0-based; the same index as the hocr page index)."""
    s = open(path, encoding='utf-8').read()
    pos = 0
    for o in s.split('<OBJECT ')[1:]:
        m = _LEAFNO.search(o)
        if not m:
            continue
        leaf = int(m.group(1))
        if wanted is not None and leaf not in wanted:
            continue
        ws, ln, seq = [], -1, 0
        for t in _ITEM.finditer(o):
            if t.group(0) == '<LINE>':
                ln += 1
                continue
            x0, yb, x1, yt = (int(t.group(i)) for i in range(1, 5))
            w = html.unescape(t.group(6)).strip()
            if w:
                ws.append({'x0': x0, 'x1': x1, 'yt': yt, 'yb': yb, 'w': w,
                           'conf': int(t.group(5)) if t.group(5) is not None else None, 'ln': ln, 'seq': seq})
                seq += 1
        yield leaf, ws


def align(words, text, a, b, look=12):
    """Sequential alignment of the xml words to the white-space tokens of the leaf text [a, b).  Sets w['off'] (None when a word is not
    found within `look` tokens).  Returns (aligned, unaligned, number of text tokens)."""
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
    return ok, bad, len(tt)


def read_cache(vol, wanted=None):
    """Generator of dicts {leaf, a, b, pg, ntok, words: [[x0,x1,yt,yb,w,conf,ln,off], ...]} from the cache of a volume."""
    with gzip.open(cache_path(vol), 'rt', encoding='utf-8') as f:
        for line in f:
            if wanted is not None:
                k = line[:30]
                m = re.match(r'\{"leaf":(\d+)', k)
                if m and int(m.group(1)) not in wanted:
                    continue
            yield json.loads(line)
