"""Printed pages of the library citations of tl-02: decision table.

    python3 -I tmp/tl-02/audit/libpages_final.py            writes docs/battle-theatre/GOVERNANCE/horde/tl-02/library_pages.json and prints what needs a look
    python3 -I tmp/tl-02/audit/libpages_final.py --dry      prints only

Method (per library citation, resolved from timeline_corrections/tl-02.jsonl, so run it on a file whose offsets are final):
  1. the scan leaf holding the first and the last character of the quote (archive.org <id>_hocr_pageindex/_searchtext aligned to the local
     text, the method of tools/bt/kit_or27_leafmap.py);
  2. the printed page = the number printed in the running head at the top of that leaf (read in the OCR text of the leaf), checked against the
     item's own page index (metadata page_numbers).  An item whose index is out of step with its OCR heads is detected by the share of leaves
     whose head equals index[leaf + shift] (shift 0 or +1 here); the index is then read with that shift;
  3. head and index agree -> accepted; head only / index only / disagreement / damaged head -> decided by hand in OVERRIDES below, each with its
     reason (neighbouring numbered heads, chapter-opening page, plates), never by guess;
  4. items without an archive.org page index (Bates 1875, Biddle 1880, Cavalry Tactics, Michigan at Gettysburg): decided from the page heads
     printed in the OCR text before and after the passage (MANUAL_TEXT below), with the distance to the next head checked against the quote length.
"""
import os, re, sys, json, gzip, bisect, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
IA = os.path.join(ROOT, 'tmp', 'tl-03', 'scan', 'ia')
OUT = os.path.join(G, 'horde', 'tl-03', 'library_pages.json')
CORR = os.path.join(ROOT, 'tmp', 'tl-03', 'audit', 'libcites.json')   # written by: TL3_NOPAGES=1 python3 -I .../closeout/build.py --libcites tmp/tl-03/audit/libcites.json
DRY = '--dry' in sys.argv

# ---------------------------------------------------------------------------------------------------- leaf alignment
def squeeze(t):
    out, mp = [], []
    for i, ch in enumerate(t):
        if not ch.isspace():
            out.append(ch)
            mp.append(i)
    return ''.join(out), mp


def leafmap(ident, djvu_path):
    d = os.path.join(IA, ident)
    meta = json.load(open(os.path.join(d, 'metadata.json'), encoding='utf-8'))
    pn = (meta.get('page_numbers') or {}).get('pages') or []
    page_of = {p['leafNum']: p['pageNumber'] for p in pn}
    pi = json.loads(gzip.open(os.path.join(d, ident + '_hocr_pageindex.json.gz'), 'rb').read())
    st = gzip.open(os.path.join(d, ident + '_hocr_searchtext.txt.gz'), 'rb').read().decode('utf-8')
    djvu = open(djvu_path, encoding='utf-8', errors='replace', newline='').read()
    sq, mp = squeeze(djvu)
    leaves, pos = [], 0
    for leaf, (a, b, _h0, _h1) in enumerate(pi):
        s, _ = squeeze(st[a:b])
        if len(s) < 8:
            continue
        j = sq.find(s[:50], pos)
        if j < 0:
            for off in (60, 150, 300, 600):
                if len(s) > off + 40:
                    j2 = sq.find(s[off:off + 40], pos)
                    if j2 >= 0 and j2 - off >= pos - 5:
                        j = j2 - off
                        break
        if j < 0 or j >= len(mp):
            continue
        leaves.append((leaf, mp[j]))
        pos = j + 1
    return dict(leaves=leaves, page_of=page_of, djvu=djvu, nindex=len(pn))


def head_cands(t):
    h = re.sub(r'\s+', ' ', t[:110]).strip()
    c = []
    m = re.match(r'^\W*(\d{1,4})\b', h)
    if m:
        c.append(int(m.group(1)))
    m = re.search(r'\b(\d{1,4})\W*$', h[:70])
    if m:
        c.append(int(m.group(1)))
    for m in re.finditer(r'[A-Za-z.:—\]]\s+(\d{1,4})\b', h[:70]):
        c.append(int(m.group(1)))
    return h[:100], c


# per-item shift of the item's page index against the hocr leaf numbers (found by shifts.py: share of heads equal to index[leaf+shift])
def best_shift(lm):
    t = lm['djvu']
    best = None
    for s in (0, 1, -1):
        n = m = 0
        for leaf, off in lm['leaves']:
            _, cs = head_cands(t[off:off + 160])
            ix = lm['page_of'].get(leaf + s)
            ix = int(ix) if ix not in (None, '') and str(ix).isdigit() else None
            if cs and ix is not None:
                n += 1
                m += ix in cs
        if best is None or m > best[1]:
            best = (s, m, n)
    return best


# ---------------------------------------------------------------------------------------------------- hand decisions
# (identifier, leaf) -> (page or None, method, reason)
OVERRIDES = {
    ('dedicationofohio00ohio', 33): (None, 'no number', 'this leaf of a short pamphlet (44 leaves) carries no running head and no page number in the OCR text and the item page index gives no number for any leaf; the OCR text before the passage ends with "11", which may be the page number of the preceding table leaf; no printed page is stated, the scan leaf is'),
    ('atgettysburgorwh00alle', 54): ('42', 'head damaged+index', 'the OCR head reads "4-2 ... First Day of the Battle" (damaged); the heads of the neighbouring leaves read 41 (leaf 53) and 43 (leaf 55) and the item page index gives 42'),
    ('hospitalscenesaf00patr', 38): ('30', 'head damaged+index', 'the OCR head reads "80" (the digit 3 misread as 8; the next leaf reads "81" for 31); the heads read 29 (leaf 37) and 32 (leaf 40) and the item page index gives 30'),
    ('battleofgettysbu00pier', 168): ('130', 'head damaged+index', 'the OCR head reads "I30" (the digit 1 misread as I); the neighbouring heads read 129 (leaf 167) and 131 (leaf 169) and the item page index gives 130'),
    ('newyorkatgettysb0001unse', 37): ('21', 'sequence+index', 'the OCR head of this leaf is damaged ("PA") and the item page index gives no number for it; the heads of the next leaves read 22 (leaf 38) and 23 (leaf 39) and the leaf before it (leaf 36) carries no text'),
    ('gettysburgwhatto00bach', 149): ('121', 'sequence+index', 'a section-opening page ("SEMINARY.") without a number in the OCR head; the heads read 120 (leaf 148) and 123 (leaf 151) and the item page index gives 121'),
    # New York at Gettysburg vol. 1: plates (leaves 17, 18, 21, 22) carry no page number; the OCR heads of leaves 19 and 20 are damaged
    ('newyorkatgettysb0001unse', 19): ('11', 'sequence', 'head damaged in the OCR ("I!"); the numbered heads around read 10 (leaf 16), [two unnumbered plate leaves], 11 (this leaf), 12 (leaf 20), [two unnumbered plate leaves], 13 (leaf 23), 14 (leaf 24)'),
    ('newyorkatgettysb0001unse', 20): ('12', 'sequence', 'head damaged in the OCR ("1 New York at Gettysburg."); the numbered heads around read 10 (leaf 16), 11 (leaf 19), [two unnumbered plate leaves], 13 (leaf 23), 14 (leaf 24); an even page, number at the left, as 10 and 14'),
    # New York at Gettysburg vol. 2 (Final report, 1900): the item's page index counts the unnumbered plate leaves as pages (index 618 for the leaf whose head is 616)
    ('finalreportonba00chatgoog', 177): ('616', 'sequence', 'the OCR head reads "6i6" (the middle digit damaged); the neighbouring heads read 613 (leaf 175) and 617 (leaf 178), the leaves 172, 174 and 179 being unnumbered plates; the item page index (618) counts the plate leaves and is not used'),
    # Tillie Pierce 1889: chapter-opening page without running head
    ('atgettysburgorwh00alle', 43): ('33', 'sequence+index', 'chapter-opening page ("CHAPTER IV. DURING THE FIRST DAY OF THE BATTLE", no running head); the heads read 30 (leaf 40) and 34 (leaf 44) and the item page index gives 33 for this leaf'),
    # Jacobs 1864: OCR head misread
    ('notesonrebelinva00jaco', 35): ('23', 'head damaged+index', 'the OCR head of this leaf reads "28"; the printed pages of the leaves around read 22 (leaf 34) and 25 (leaf 37) and the item page index gives 23 (leaf 35)'),
    # Chancellorsville book bound into the New York volume 2 item: its own pagination (contents list chapter III on p. 29; leaf 564 head 23, leaf 569 head 28)
    ('finalreportonba00chatgoog', 566): ('25', 'sequence+index', 'the passage is in the book The Campaign of Chancellorsville (Yale University Press, 1910) bound at the end of this item, not in the New York volume; the heads of its leaves read 23 (leaf 564) and 28 (leaf 569) and the item page index gives 25 for this leaf'),
    # Indiana at Gettysburg 1913
    ('indianaatfiftiet00pick', 51): ('43', 'head+index', 'the head reads "INDIANA AT GETTYSBURG, JULY, 1913 43" and the item page index gives 43'),
    # Haskell 1908 edition (Wisconsin): the folio is printed in brackets at the END of each page in the OCR text
    ('battleofgettysbu00haskuoft', 40): ('11', 'footer folio', 'in the OCR text of this edition the folio is a bracketed number at the end of each page ("[11]" ends this leaf, "[10]" ends the leaf before; the preface ends its pages with [xxi], [xxii], [xxiii]); the page heads alternate "GETTYSBURG" (odd pages) and "FRANK A. HASKELL" (even pages) and this leaf has "GETTYSBURG"; the item page index gives no numbers'),
    # Barton 1898: table of contents (front matter)
    ('angelsofbattlefi00bart', 23): (None, 'front matter', 'the quotation is a line of the table of contents (front matter); the scan leaf carries no printed page number in the OCR text or in the item page index'),
}
# a passage that belongs to another work bound into the same archive.org item: (source id, text offset) -> new source id
NO_ALIGN = {'pennsylvaniaatge04penn'}   # leaf alignment fails for the first leaves; every citation of this item is decided by hand from the heads in the OCR text
RENAME = {('NY-GB-1900-v2', 1523268): 'CHANC-1910'}

# items without an archive.org page index: (source id, quote key part) decided from the heads printed in the OCR text
MANUAL_TEXT = {
    ('PA-GB-1914-v1', 492): 'running head "492 Pennsylvania at Getty shurg." (the OCR splits the word) printed in the OCR text 131 characters before the passage; no later head before the passage; the leaf alignment with the item page index fails for the first leaves of this item, so no leaf is stated',
    ('PA-GB-1914-v1', 493): 'running head "Pennsylvania at Gettysburg. 493" printed in the OCR text 1,362 characters (3.30 passage) or 1,916 characters (Paul passage) before the passage and the next head ("Pennsylvania at Gettysburg", page 494) 2,110 characters after the later passage; the leaf alignment with the item page index fails for the first leaves of this item, so no leaf is stated',
    ('PA-GB-1914-v1', 33): 'running head "Pennsylvania at Gettysburg. 33" printed in the OCR text about 300 characters before the passage, in the middle of the sentence that the page break interrupts ("great battles of the Pennsylvania at Gettysburg. 33 war, for its exhaustive study"), so the passage that follows is on page 33; the leaf alignment with the item page index fails for the first leaves of this item, so no leaf is stated',
    ('BATES-1875', 55): 'running head "PRELIMINARIES TO THE BATTLE UNDER MEADE, 55" printed in the OCR text before the passage and the head "56 HISTORY OF THE BATTLE OF GETTYSBURG" after it (distance to the next head larger than the quote); no archive.org page index for this item',
    ('BATES-1875', 63): 'running head "THE FIRST DAY OF THE BATTLE, 63" printed in the OCR text before the passage and the head "64 HISTORY OF THE BATTLE OF GETTYSBURG" after it (distance to the next head not smaller than the quote); no archive.org page index for this item',
    ('CAVTACT-1841c', 180): 'running head "180 SCHOOL OF THE ..." printed in the OCR text 772 characters before the passage; the next printed head is "182 SCHOOL OF THE ..." about 2,600 characters after it (the head of 181 is lost); no archive.org page index for this item',
    ('CAVTACT-1841c', 181): 'between the printed heads "180 SCHOOL OF THE ..." (2,158 characters before the passage) and "182 SCHOOL OF THE ..." (1,196 characters after it): the page whose head is lost in the OCR is 181; no archive.org page index for this item',
    ('MI-GB-1889', 114): 'running head "114 MICHIGAN AT GETTYSBURG" printed in the OCR text 525 to 800 characters before the passage and no later head within 7,000 characters; no archive.org page index for this item',
    ('BIDDLE-1880', 25): 'the page number "25" is printed on its own line in the OCR text before the passage and the next page number (damaged) comes after the footnotes that end the page; no archive.org page index for this item',
}

# stated manual decisions for single citations (source id, key) -> page for items without an index
MANUAL_KEYS = {
    ('PA-GB-1914-v1', 'pa230'): 492, ('PA-GB-1914-v1', 'pa107'): 493, ('PA-GB-1914-v1', 'pa330'): 493,
    ('PA-GB-1914-v1', 'pa_9197'): 33, ('PA-GB-1914-v1', 'pa_3801'): 33,
    ('BATES-1875', 'bates_dep63'): 55, ('BATES-1875', 'bates_dep71'): 55, ('BATES-1875', 'bates_scout71'): 55, ('BATES-1875', 'bates_dev'): 55, ('BATES-1875', 'bates_sig'): 55,
    ('BATES-1875', 'bates_run'): 63, ('BATES-1875', 'bates_2wi'): 63, ('BATES-1875', 'bates_brain'): 63, ('BATES-1875', 'bates_lead'): 63, ('BATES-1875', 'bates_malo'): 63,
    ('CAVTACT-1841c', 'tac_n4'): 180, ('CAVTACT-1841c', 'tac_hold'): 181,
    ('MI-GB-1889', 'mi_cross'): 114, ('MI-GB-1889', 'mi_grove'): 114,
    ('BIDDLE-1880', 'bid_fahn'): 25, ('BIDDLE-1880', 'bid_1130'): 25, ('BIDDLE-1880', 'bid_1130c'): 25, ('BIDDLE-1880', 'bid_cut'): 25, ('BIDDLE-1880', 'bid_pris'): 25,
}

SHIFT_NOTE = {0: '', 1: ' (this item\'s page index is one leaf out of step with its OCR: index[leaf+1] is read; %d of %d numbered heads agree with it)'}


def main():
    cites = [(c['rid'], c) for c in json.load(open(CORR, encoding='utf-8'))]
    cache = {}
    shifts = {}
    entries = collections.OrderedDict()
    todo = []
    for rid, c in cites:
        sid, key = c['source_id'], c['key']
        ident = c.get('archive_identifier')
        # the Chancellorsville book bound into the New York volume 2 item keeps its text file but is its own work
        ekey = '%s@%d' % (RENAME.get((sid, c['text_offset']), sid), c['text_offset'])
        has_index = ident not in NO_ALIGN and bool(ident) and os.path.exists(os.path.join(IA, ident, ident + '_hocr_pageindex.json.gz')) and bool(
            (json.load(open(os.path.join(IA, ident, 'metadata.json'), encoding='utf-8')).get('page_numbers') or {}).get('pages'))
        if not has_index:
            pg = MANUAL_KEYS.get((sid, key))
            if pg is None:
                todo.append((rid, key, sid, 'no index and no manual decision'))
                continue
            entries[ekey] = dict(page=str(pg), method='text heads', basis='printed page: ' + MANUAL_TEXT[(sid, pg)], archive_identifier=ident, leaf=None, head=None, index_page=None)
            continue
        if ident not in cache:
            cache[ident] = leafmap(ident, os.path.join(ROOT, c['source_file']))
            shifts[ident] = best_shift(cache[ident])
        lm = cache[ident]
        sh, nm, nn = shifts[ident]
        starts = [x[1] for x in lm['leaves']]
        ia = bisect.bisect_right(starts, c['text_offset']) - 1
        ib = bisect.bisect_right(starts, c['text_offset_end'] - 1) - 1
        pages = []
        meth = []
        reasons = []
        heads = []
        idxs = []
        for i in sorted({ia, ib}):
            if i < 0:
                pages.append(None); meth.append('none'); reasons.append('before the first aligned leaf'); heads.append(''); idxs.append(None)
                continue
            leaf, off = lm['leaves'][i]
            head, cs = head_cands(lm['djvu'][off:off + 160])
            ix = lm['page_of'].get(leaf + sh)
            ix = int(ix) if ix not in (None, '') and str(ix).isdigit() else None
            heads.append((leaf, head))
            idxs.append(ix)
            ov = OVERRIDES.get((ident, leaf))
            if ov:
                pages.append(ov[0]); meth.append(ov[1]); reasons.append(ov[2])
            elif ix is not None and ix in cs:
                pages.append(str(ix)); meth.append('head+index'); reasons.append('')
            elif ix is None and cs and ident not in ('newyorkatgettysb0001unse',):
                pages.append(str(cs[0])); meth.append('head'); reasons.append('')
            else:
                pages.append(None); meth.append('?'); reasons.append('head %r candidates %s index %s' % (head, cs, ix))
        entries[ekey] = dict(pages=pages, meth=meth, reasons=reasons, heads=heads, idxs=idxs, ident=ident, sh=(sh, nm, nn), rid=rid, key=key, sid=sid, c=c)
    # assemble the decided entries
    final = collections.OrderedDict()
    for ekey, e in entries.items():
        if 'page' in e:
            final[ekey] = e
            continue
        pages, meth = e['pages'], e['meth']
        if any(p is None for p in pages) and not (e['key'] in ('bar_twelve', 'oh_knoll')):
            todo.append((e['rid'], e['key'], e['sid'], 'unresolved: ' + '; '.join(e['reasons'])))
            continue
        pg = pages[0] if len(set(pages)) == 1 else '%s-%s' % (pages[0], pages[-1])
        leaf = e['heads'][0][0] if e['heads'] else None
        head = e['heads'][0][1] if e['heads'] else ''
        mset = sorted(set(meth))
        sh, nm, nn = e['sh']
        basis = {'head+index': 'printed page: the running head at the top of the scan leaf reads %s and the item page index gives the same number' % pg,
                 'head': 'printed page: the running head at the top of the scan leaf reads %s; the item page index gives no number for this leaf' % pg,
                 'sequence': 'printed page decided from the numbered heads of the neighbouring leaves',
                 'head damaged+index': 'printed page: the OCR head is damaged; decided from the heads of the neighbouring leaves and the item page index',
                 'footer folio': 'printed page: the folio printed at the end of the page in the OCR text',
                 'front matter': 'no printed page number (front matter)',
                 'no number': 'no printed page number recovered',
                 'sequence+index': 'printed page decided from the numbered heads of the neighbouring leaves and the item page index'}
        parts = [basis.get(m, m) for m in mset]
        extra = ' '.join(r for r in e['reasons'] if r)
        b = '; '.join(parts)
        if len(set(pages)) > 1:
            b = 'the passage runs over two pages (%s); ' % ' / '.join('%s: %s' % (h[0], p) for h, p in zip(e['heads'], pages)) + b
        if extra:
            b += '; ' + extra
        if sh == 1:
            b += SHIFT_NOTE[1] % (nm, nn)
        b += ' (archive.org item %s, scan leaf %s, head in the OCR text: "%s")' % (e['ident'], leaf, head[:60])
        final[ekey] = dict(page=pg, method='+'.join(mset), basis=b, archive_identifier=e['ident'], leaf=leaf, head=head[:80], index_page=e['idxs'][0])
    # manual: barton table of contents, haskell, jacobs, bl-3 are listed in todo when unresolved
    print('library citations %d, decided %d, to decide %d' % (len(cites), len(final), len(todo)))
    for t in todo:
        print('  TODO', t)
    out = dict(_doc='Printed pages of the library citations of the tl-03 close-out (see closeout/audit/libpages3.py for the method). Key: source id @ text offset.', entries=final)
    if not DRY:
        json.dump(out, open(OUT, 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
        print('wrote', os.path.relpath(OUT, ROOT))
    return final


if __name__ == '__main__':
    main()
