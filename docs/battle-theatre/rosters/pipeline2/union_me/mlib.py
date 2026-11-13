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


# ------------------------------------------------------------------------------------------------ ledger helpers
def now():
    import time
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def ledger_path(source_id):
    return os.path.join(D2, 'sources', source_id + '.json')


def ledger_load(source_id):
    p = ledger_path(source_id)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {'format': 'roster2-source/1', 'source_id': source_id, 'texts': {}, 'failed': []}


def ledger_save(source_id, led):
    with open(ledger_path(source_id), 'w', encoding='utf-8') as f:
        json.dump(led, f, ensure_ascii=False, indent=1)


def pin_derived_text(source_id, text_id, base_text_id, text_path, index_path, xml_path, recipe, kind='ia-djvuxml-positional'):
    """Pin a derived text (a re-serialisation of the item's own OCR words) in the ledger next to its base text."""
    led = ledger_load(source_id)
    base = led['texts'][base_text_id]
    pn = base['files'].get('page_numbers')
    ent = {k: v for k, v in base.items() if k not in ('files', 'retrieved', 'kind')}
    ent['kind'] = kind
    ent['base_text_id'] = base_text_id
    ent['derived_from'] = {'name': os.path.basename(xml_path), 'sha256': sha256_file(xml_path), 'bytes': os.path.getsize(xml_path),
                           'deleted_after_use': True, 'recipe': recipe}
    ent['files'] = {'text': {'name': os.path.basename(text_path), 'bytes': os.path.getsize(text_path), 'sha256': sha256_file(text_path)},
                    'pageindex': {'name': os.path.basename(index_path), 'bytes': os.path.getsize(index_path), 'sha256': sha256_file(index_path)}}
    if pn:
        ent['files']['page_numbers'] = pn
    ent['retrieved'] = now()
    led['texts'][text_id] = ent
    ledger_save(source_id, led)


# ------------------------------------------------------------------------------------------------ the 14 units and the segments
UNITS = [
    ('u-me-3rd-maine-infantry', '3rd Maine Infantry', 'union/me/3rd-maine-infantry.jsonl.gz'),
    ('u-me-4th-maine-infantry', '4th Maine Infantry', 'union/me/4th-maine-infantry.jsonl.gz'),
    ('u-me-5th-maine-infantry', '5th Maine Infantry', 'union/me/5th-maine-infantry.jsonl.gz'),
    ('u-me-6th-maine-infantry', '6th Maine Infantry', 'union/me/6th-maine-infantry.jsonl.gz'),
    ('u-me-7th-maine-infantry', '7th Maine Infantry', 'union/me/7th-maine-infantry.jsonl.gz'),
    ('u-me-10th-maine-infantry', '10th Maine Infantry', 'union/me/10th-maine-infantry.jsonl.gz'),
    ('u-me-16th-maine-infantry', '16th Maine Infantry', 'union/me/16th-maine-infantry.jsonl.gz'),
    ('u-me-17th-maine-infantry', '17th Maine Infantry', 'union/me/17th-maine-infantry.jsonl.gz'),
    ('u-me-19th-maine-infantry', '19th Maine Infantry', 'union/me/19th-maine-infantry.jsonl.gz'),
    ('u-me-20th-maine-infantry', '20th Maine Infantry', 'union/me/20th-maine-infantry.jsonl.gz'),
    ('u-me-1st-maine-cavalry', '1st Maine Cavalry', 'union/me/1st-maine-cavalry.jsonl.gz'),
    ('u-me-2nd-maine-battery-b', '2nd Maine Battery (B)', 'union/me/2nd-maine-battery-b.jsonl.gz'),
    ('u-me-5th-maine-battery-e', '5th Maine Battery (E)', 'union/me/5th-maine-battery-e.jsonl.gz'),
    ('u-me-6th-maine-battery-f', '6th Maine Battery (F)', 'union/me/6th-maine-battery-f.jsonl.gz'),
]
# segments in file order: (source id, work segment number) -> segment object of the unit file
SEGMENTS = [
    (('ME-AGR-1863-APPD', 0), {'s': 'ME-AGR-1863-APPD', 'v': '1863', 't': 'ME-AGR-1863-APPD.1863', 'lay': 'cols'}),
    (('ME-SUPP-1867', 0), {'s': 'ME-SUPP-1867', 'v': '1867', 't': 'ME-SUPP-1867.1867', 'lay': 'cols'}),
    (('ME-SUPP-1867', 1), {'s': 'ME-SUPP-1867', 'v': '1867', 't': 'ME-SUPP-1867.1867~p', 'lay': 'cols'}),
    (('ME-GETT-1898', 0), {'s': 'ME-GETT-1898', 'v': '1898', 't': 'ME-GETT-1898.1898', 'lay': 'cols'}),
    (('ME-APPD-1861', 0), {'s': 'ME-APPD-1861', 'v': '1861', 't': 'ME-APPD-1861.1861', 'lay': 'cols'}),
]
FLAG_TEXT = {
    'N': 'name text damaged', 'R': 'rank cell damaged', 'C': 'company cell damaged', 'G': 'regiment cell damaged or blank',
    'P': 'corps cell damaged', 'U': 'unit read through a damaged or tolerated cell', 'S': 'printed name is the ditto word "Same" (the man named on the line above)',
}
OCR_FLAGS = 'NRCGPU'
