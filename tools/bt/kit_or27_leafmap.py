"""Leaf map of the Official Records Ser. I vol. 27 text: character offset -> scan leaf -> printed page.

The running-head page model (or27_pages.py) loses its heads on the tabular pages (organization tables, returns, casualty
returns), exactly where the kit evidence pass cites most. This map does not depend on running heads: the per-leaf OCR text
published with each archive.org item (<id>_hocr_searchtext.txt.gz, indexed by <id>_hocr_pageindex.json.gz) is aligned
against the local <id>_djvu.txt, so every character offset falls on a known scan leaf, and the item's own page-number
list (the 'page_numbers' block of tmp/library/or27/meta_<id>.json) gives the printed page of that leaf.

    python -I tools/bt/kit_or27_leafmap.py build     writes docs/battle-theatre/kit/evidence/or27_leaf_pages.json
    python -I tools/bt/kit_or27_leafmap.py check     compares the map with the running heads the OCR kept (exit 1 below 98 %)

Inputs (public domain, fetched once, at most one request per second; the file is rebuilt only when they are present):
    tmp/kit-plan/ia/<id>_hocr_searchtext.txt.gz and <id>_hocr_pageindex.json.gz
        curl -sS -L -o tmp/kit-plan/ia/<file> https://archive.org/cors/<id>/<file>
Offsets are character offsets into the djvu text decoded as UTF-8 with newline='' (the or27_lib convention).
A PDF page of <id>.pdf is leaf + 1 (the three PDFs have as many pages as the items have leaves)."""
import bisect, gzip, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OR_DIR = os.path.join(ROOT, 'tmp', 'library', 'or27')
IA_DIR = os.path.join(ROOT, 'tmp', 'kit-plan', 'ia')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'kit', 'evidence', 'or27_leaf_pages.json')
PARTS = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def squeeze(t):
    """Text without whitespace, with the original offset of every kept character."""
    out, mp = [], []
    for i, ch in enumerate(t):
        if not ch.isspace():
            out.append(ch)
            mp.append(i)
    return ''.join(out), mp


def build_part(part):
    ident = PARTS[part]
    djvu_path = os.path.join(OR_DIR, ident + '_djvu.txt')
    st_path = os.path.join(IA_DIR, ident + '_hocr_searchtext.txt.gz')
    pi_path = os.path.join(IA_DIR, ident + '_hocr_pageindex.json.gz')
    meta_path = os.path.join(OR_DIR, 'meta_%s.json' % ident)
    for p in (djvu_path, st_path, pi_path, meta_path):
        if not os.path.exists(p):
            raise SystemExit('missing input: %s (see the module text for the fetch command)' % os.path.relpath(p, ROOT))
    with open(djvu_path, encoding='utf-8', newline='') as f:
        djvu = f.read()
    txt = gzip.open(st_path, 'rb').read().decode('utf-8')      # the page index counts CHARACTERS of this text, not bytes
    idx = json.loads(gzip.open(pi_path, 'rb').read())
    if idx[-1][1] != len(txt):
        raise SystemExit('part %d: the page index ends at %d but the search text has %d characters' % (part, idx[-1][1], len(txt)))
    pn = json.load(open(meta_path, encoding='utf-8'))['page_numbers']['pages']
    page_of = {p['leafNum']: p['pageNumber'] for p in pn}
    sq, mp = squeeze(djvu)
    leaves, pos, unmatched = [], 0, []
    for leaf, (a, b, _h0, _h1) in enumerate(idx):
        s, _ = squeeze(txt[a:b])
        if len(s) < 8:
            continue                                  # blank leaf, plate or a few stray marks: no text to cite
        j = sq.find(s[:50], pos)
        if j < 0:                                     # the first characters differ: anchor on a later run of the leaf
            for off in (60, 150, 300, 600):
                if len(s) > off + 40:
                    j2 = sq.find(s[off:off + 40], pos)
                    if j2 >= 0 and j2 - off >= pos - 5:
                        j = j2 - off
                        break
        if j < 0 or j >= len(mp):
            unmatched.append(leaf)
            continue
        pg = page_of.get(leaf, '')
        leaves.append([leaf, mp[j], int(pg) if str(pg).isdigit() else (pg or None)])
        pos = j + 1
    starts = [x[1] for x in leaves]
    assert starts == sorted(starts), 'leaf starts are not monotone'
    return {'archive_identifier': ident, 'djvu_sha256': sha256(djvu_path), 'djvu_chars': len(djvu),
            'searchtext_sha256': sha256(st_path), 'pageindex_sha256': sha256(pi_path),
            'leaves_in_item': len(idx), 'leaves_with_text': len(leaves), 'leaves_unmatched': unmatched,
            'pdf_page_rule': 'PDF page of %s.pdf = leaf + 1' % ident, 'leaves': leaves}


class LeafMap:
    """Offset -> {leaf, page} lookup for one part (loaded from the built file)."""

    def __init__(self, rec):
        self.rec = rec
        self.starts = [x[1] for x in rec['leaves']]

    def at(self, off):
        i = bisect.bisect_right(self.starts, off) - 1
        if i < 0:
            return None
        leaf, start, page = self.rec['leaves'][i]
        nxt = self.rec['leaves'][i + 1][1] if i + 1 < len(self.starts) else None
        return {'leaf': leaf, 'page': page, 'leaf_start': start, 'leaf_end': nxt}

    def leaf_of_page(self, page):
        for leaf, _start, pg in self.rec['leaves']:
            if pg == page:
                return leaf
        return None


_cache = {}


def load(part):
    if 'doc' not in _cache:
        if not os.path.exists(OUT):
            return None
        with open(OUT, encoding='utf-8') as f:
            _cache['doc'] = json.load(f)
    rec = _cache['doc']['parts'].get(str(part))
    if rec is None:
        return None
    if part not in _cache:
        _cache[part] = LeafMap(rec)
    return _cache[part]


def check():
    """Every running head the OCR kept with its number readable ('ocr' heads of the page model) must sit on a leaf whose page equals it."""
    sys.path.insert(0, HERE)
    import or27_find as F
    ok_all = True
    report = {}
    for part in PARTS:
        lm = load(part)
        if lm is None:
            print('part %d: no leaf map built' % part)
            ok_all = False
            continue
        P = F.get_part(part)
        if sha256(os.path.join(OR_DIR, PARTS[part] + '_djvu.txt')) != lm.rec['djvu_sha256']:
            print('part %d: djvu text changed since the map was built' % part)
            ok_all = False
            continue
        n = agree = 0
        bad = []
        for off, page, how in zip(P.pm.offs, P.pm.pages, P.pm.how):
            if how != 'ocr':
                continue
            n += 1
            got = lm.at(off)
            if got and got['page'] == page:
                agree += 1
            elif len(bad) < 12:
                bad.append([off, page, got['page'] if got else None])
        share = agree / n if n else 0
        report[str(part)] = {'ocr_heads': n, 'agree': agree, 'share': round(share, 4), 'first_disagreements_offset_head_leafpage': bad}
        print('part %d: %d running heads read by the OCR, %d on a leaf of the same printed page (%.2f %%); first disagreements %s' % (part, n, agree, 100 * share, bad[:5]))
        if share < 0.98:
            ok_all = False
    return ok_all, report


def main(argv):
    cmd = argv[0] if argv else ''
    if cmd == 'build':
        doc = {'_doc': 'Official Records Ser. I vol. 27 parts 1-3: scan leaf and printed page of every character offset of the local djvu text. '
                       'leaves = [leaf, first character offset, printed page or null]; an offset belongs to the last leaf that starts at or before it. '
                       'Built by tools/bt/kit_or27_leafmap.py from the per-leaf OCR text and the page-number list published with each archive.org item. '
                       'The printed page is the item\'s own assertion per leaf; check shows how it agrees with the running heads.',
               'parts': {}}
        for part in PARTS:
            doc['parts'][str(part)] = build_part(part)
            r = doc['parts'][str(part)]
            print('part %d: %d leaves in the item, %d with text aligned, %d unmatched' % (part, r['leaves_in_item'], r['leaves_with_text'], len(r['leaves_unmatched'])))
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        _cache.clear()
        with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
            f.write('\n')
        ok, rep = check()
        doc['check_against_running_heads'] = rep
        with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
            f.write('\n')
        print('wrote', os.path.relpath(OUT, ROOT), os.path.getsize(OUT), 'bytes;', 'check OK' if ok else 'CHECK BELOW 98 %')
        return 0 if ok else 1
    if cmd == 'check':
        ok, _ = check()
        return 0 if ok else 1
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
