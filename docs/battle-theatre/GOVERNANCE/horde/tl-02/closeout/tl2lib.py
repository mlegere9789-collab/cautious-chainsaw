"""tl-02 close-out library: constructors for the row data files, verbatim quote resolver, search runner.

Every citation is re-matched verbatim (whitespace-normalised, case-sensitive, running heads removed, line-break hyphens joined)
in the local source text; a quote that is not found, is found in another report than stated or on another printed page than
stated stops the build.  Offsets are CHARACTER offsets into the raw file decoded as UTF-8 with newline='' (tools/bt/or27_lib.py
convention).  Searches listed under a row are executed at build time and the real hit counts are stored.
"""
import os, re, sys, json, hashlib, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
sys.path.insert(0, HERE)
import or27_find as F
from or27_lib import build_nview, norm_query, raw_path
import ws9find

G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
VERDICTS = ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap')
SUPPORT = ('supported', 'contradicted', 'unsupported', 'conflict', 'computed', 'procedural')

# ------------------------------------------------------------------ constructors
ROWS = collections.OrderedDict()


def OR(quote, report=None, page=None, note=None, supports=None, witness=None):
    d = dict(src='OR27', quote=quote, report=report, page=page)
    if note: d['note'] = note
    if supports: d['supports'] = supports
    if witness: d['witness'] = witness
    return d


def LIB(sid, quote, page=None, note=None, supports=None, witness=None, reading=None):
    d = dict(src=sid, quote=quote, page=page)
    if note: d['note'] = note
    if supports: d['supports'] = supports
    if witness: d['witness'] = witness
    if reading: d['reading'] = reading
    return d


def COMP(what, value, method, note=None):
    d = dict(src='COMPUTED', what=what, value=value, method=method)
    if note: d['note'] = note
    return d


def SUB(claim, tier, support, cites=(), note=None):
    assert tier in TIERS, tier
    assert support in SUPPORT, support
    return (claim, tier, support, list(cites), note)


def SCN(id, value, basis, tier, cites=()):
    assert tier in TIERS, tier
    return dict(id=id, value=value, basis=basis, tier=tier, cites=list(cites))


def SR(scope, pattern, near=None, win=300, what=None, case=False):
    """A search that is executed at build time. scope: 'OR27' | 'LIB' (all books, not newspapers) | 'NEWS' | 'ALL' | list of source ids / prefixes."""
    return dict(scope=scope, pattern=pattern, near=near, win=win, what=what, case=case)


def CLAIM(event, unit, place, when, basis, text, tier, start=None, end=None, marking=None):
    assert tier in TIERS, tier
    return dict(event=event, unit=unit, place=place, when=when, basis=basis, text=text, tier=tier, start=start, end=end, marking=marking)


def REG(title, why, recon, tier, category='evidence missing', competing='-', impact='-', ask='-', subst='-', rids='R11', recommend=None, existing=None):
    return dict(title=title, why=why, recon=recon, tier=tier, category=category, competing=competing, impact=impact, ask=ask, subst=subst,
                rids=rids, recommend=recommend, existing=existing)


def ROW(id, verdict, claim, subs, cites, scenarios=(), default=None, remains=(), recheck=None, searched=(), register=None, related=(),
        shard_fix=None):
    assert id not in ROWS, id
    assert verdict in VERDICTS, (id, verdict)
    ROWS[id] = dict(id=id, verdict=verdict, claim=claim, subs=list(subs), cites=dict(cites), scenarios=list(scenarios), default=default,
                    remains=list(remains), recheck=recheck, searched=list(searched), register=register, related=list(related), shard_fix=shard_fix)


# ------------------------------------------------------------------ source registry
def _load(p):
    return json.load(open(os.path.join(G, 'library', p), encoding='utf-8'))


ACQ1 = {it['source_id']: it for it in _load('acquired.json')['items']}
_a2 = _load('acquired_2.json')
ACQ2 = {it['id']: it for it in _a2['items']}
MINE_P = os.path.join(G, 'horde', 'tl-02', 'sources_tl02.json')
MINE = {}
if os.path.exists(MINE_P):
    MINE = {it['id']: it for it in json.load(open(MINE_P, encoding='utf-8'))['items']}

# short labels: author, title, year (no claim about content)
LABEL = {
    'JACOBS-1864': 'M. Jacobs, Notes on the Rebel Invasion of Maryland and Pennsylvania and the Battle of Gettysburg (Philadelphia 1864)',
    'TPIERCE-1889': 'Tillie Pierce Alleman, At Gettysburg, or What a Girl Saw and Heard of the Battle (1889)',
    'MEADE-LL-v2': 'G. G. Meade (ed.), The Life and Letters of George Gordon Meade, vol. 2 (1913)',
    'BL-3': 'Johnson and Buel (eds.), Battles and Leaders of the Civil War, vol. 3 (1887-1888)',
    'BACH-WHATTOSEE-1873': 'J. B. Bachelder, Gettysburg: What to See, and How to See It (1873)',
    'BACH-WHATTOSEE-1889': 'J. B. Bachelder, Gettysburg: What to See, and How to See It (1889 ed.)',
    'NY-GB-1900': 'New York Monuments Commission, New York at Gettysburg, vol. 1 (1900)',
    'NY-GB-1900-v2': 'New York Monuments Commission, New York at Gettysburg, vol. 2 (1900)',
    'NY-GB-1902-v3': 'New York Monuments Commission, New York at Gettysburg, vol. 3 (1902)',
    'PA-GB-1904': 'Pennsylvania at Gettysburg, vol. 2 (1904 ed.)',
    'PA-GB-1914-v2': 'Pennsylvania at Gettysburg, vol. 2 (1914 ed.)',
    'MI-GB-1889': 'Michigan at Gettysburg (1889)',
    'ME-GB-1898': 'Maine at Gettysburg (1898)',
    'LETTERMAN-1866': 'J. Letterman, Medical Recollections of the Army of the Potomac (1866)',
    'SHSP-04': 'Southern Historical Society Papers, vol. 4 (1877)',
    'SHSP-05': 'Southern Historical Society Papers, vol. 5 (1878)',
    'SHSP-06': 'Southern Historical Society Papers, vol. 6 (1878)',
    'SHSP-11': 'Southern Historical Society Papers, vol. 11 (1883)',
    'SHSP-12': 'Southern Historical Society Papers, vol. 12 (1884)',
    'NJ-TOOMBS-1888': 'S. Toombs, New Jersey Troops in the Gettysburg Campaign (1888)',
    'FOX-1889': 'W. F. Fox, Regimental Losses in the American Civil War (1889)',
    'HASKELL-1908': 'F. A. Haskell, The Battle of Gettysburg (1908 ed.)',
    'PIERCE-F-1914': 'F. C. Pierce, The Battle of Gettysburg, the Crest-Wave of the American Civil War (1914)',
    'HARD-1868': 'A. Hard, History of the Eighth Cavalry Regiment, Illinois Volunteers (1868)',
    'IL-MON-1892': 'Illinois Monument Commission, Illinois Monuments at Gettysburg (1892)',
    'BROWN-SIGNAL-1896': 'J. W. Brown, The Signal Corps, U.S.A., in the War of the Rebellion (1896)',
    'BATES-1875': 'S. P. Bates, The Battle of Gettysburg (1875)',
    'CHENEY-1901': 'N. Cheney, History of the Ninth Regiment, New York Volunteer Cavalry (1901)',
    'WELD-1912': 'S. M. Weld, War Diary and Letters of Stephen Minot Weld, 1861-1865 (1912)',
    'HALL-6NYCAV-1908': 'Hall, Besley and Wood, History of the Sixth New York Cavalry (1908)',
    'USCC-SMITH-1868': 'E. P. Smith, Incidents among Shot and Shell (U.S. Christian Commission, 1868)',
    'BARTON-ANGELS-1898': 'G. Barton, Angels of the Battlefield (1898)',
    'BIDDLE-1880': 'C. Biddle, The First Day of the Battle of Gettysburg (1880)',
    'CAVTACT-1841c': 'U.S. War Department, Cavalry Tactics (1841), vol. 3 (School of the platoon and squadron)',
    'CAVTACT-1855b': 'U.S. War Department, Cavalry Tactics (1855 reprint), School of the platoon and squadron',
    'JACOBS-1888': 'M. Jacobs, Notes on the Rebel Invasion (1888 printing)',
    'LONGSTREET-1896': 'J. Longstreet, From Manassas to Appomattox (1896)',
    'ALEXANDER-1907': 'E. P. Alexander, Military Memoirs of a Confederate (1907)',
    'FREMANTLE-1864': 'A. J. L. Fremantle, Three Months in the Southern States (1864)',
    'CHANC-1910': 'The Campaign of Chancellorsville (New Haven: Yale University Press, 1910; author not named in the OCR text), a second book bound at the end of the archive.org item of New York at Gettysburg, vol. 2',
}
CLASS = {
    'JACOBS-1864': 'eyewitness account by a Gettysburg resident, published 1864 (weather readings and narrative)',
    'TPIERCE-1889': 'eyewitness memoir by a Gettysburg resident, written 26 years later',
    'MEADE-LL-v2': 'compilation of army headquarters papers and staff accounts, published 1913',
    'BL-3': 'participant articles with editors\' captions, published 1887-1888',
    'BACH-WHATTOSEE-1873': 'guide by the battlefield historian, compiled from participants (1873)',
    'BACH-WHATTOSEE-1889': 'guide by the battlefield historian, compiled from participants (1889 edition)',
    'NY-GB-1900': 'state commission history (1900)',
    'NY-GB-1900-v2': 'state commission volume with regimental addresses (1900)',
    'NY-GB-1902-v3': 'state commission volume with regimental addresses (1902)',
    'PA-GB-1904': 'state commission volume with regimental addresses (1904)',
    'PA-GB-1914-v2': 'state commission volume with addresses (1914)',
    'MI-GB-1889': 'state commission volume (1889)',
    'ME-GB-1898': 'state commission volume (1898)',
    'LETTERMAN-1866': 'memoir by the army medical director, with orders printed in full (1866)',
    'SHSP-04': 'participant recollection published 1877',
    'SHSP-05': 'participant recollection published 1878',
    'SHSP-06': 'participant papers published 1878 (including the divisional report of 1863 as printed)',
    'SHSP-11': 'participant recollection published 1883',
    'SHSP-12': 'participant recollection published 1884',
    'NJ-TOOMBS-1888': 'state history compiled with participant letters, 1888',
    'FOX-1889': 'compiled loss statistics (1889)',
    'HARD-1868': 'regimental history by its surgeon, a participant (1868)',
    'IL-MON-1892': 'state commission report with the dedication address of the regiment\'s commander (1891)',
    'BROWN-SIGNAL-1896': 'corps history compiled by a veterans\' association (1896)',
    'BATES-1875': 'published history (1875) quoting participants\' letters',
    'CHENEY-1901': 'regimental history by a participant (1901)',
    'WELD-1912': 'diary and letters of 1863 by an aide to Reynolds, printed 1912 (later notes are bracketed)',
    'HALL-6NYCAV-1908': 'regimental history by participants (1908)',
    'USCC-SMITH-1868': 'relief commission record with delegates\' statements (1868)',
    'BARTON-ANGELS-1898': 'published history of the nursing sisters (1898)',
    'BIDDLE-1880': 'address by a brigade commander of the first day (1880)',
    'CAVTACT-1841c': 'official drill regulation of the U.S. cavalry (1841 text, reprinted 1855; the 1861-62 revision was not searched for this paragraph)',
    'CAVTACT-1855b': 'official drill regulation of the U.S. cavalry (1855 reprint of the 1841 text)',
    'JACOBS-1888': 'reprint (1888), searched only',
    'HASKELL-1908': 'participant narrative (written 1863, printed 1908)',
    'PIERCE-F-1914': 'published history (1914)',
    'CHANC-1910': 'secondary study (1910) of the spring 1863 campaign, quoting cavalry practice in general; not a report of the Gettysburg campaign',
}
ARCH = {'JACOBS-1864': 'notesonrebelinva00jaco', 'CHANC-1910': 'finalreportonba00chatgoog'}
# a work bound into the archive.org item of another source: its text is read from that source's file
TEXT_OF = {'CHANC-1910': 'NY-GB-1900-v2'}

_sha = {}


def sha_file(p):
    if p not in _sha:
        h = hashlib.sha256()
        with open(p, 'rb') as f:
            h.update(f.read())
        _sha[p] = h.hexdigest()
    return _sha[p]


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, '/')


def src_meta(sid):
    a = ACQ2.get(sid) or ACQ1.get(sid) or MINE.get(sid) or {}
    return dict(work=LABEL.get(sid) or a.get('title') or sid, ident=a.get('archive_identifier') or ARCH.get(sid),
               cls=CLASS.get(sid), date=a.get('date'))


# ------------------------------------------------------------------ printed pages of library texts (running heads)
def _h(*pats):
    return [re.compile(p) for p in pats]


BARE_SOURCES = {'IL-MON-1892'}
PAGE_OVERRIDES = {('JACOBS-1864', '28'): ('23', 'the OCR reads the head as 28; the printed sequence 22, 23, 24, 25 gives 23')}

PAGE_HEADS = {
    'SHSP-04': _h(r'(?<![\d,.])(\d{1,3}) Southern Historical Society Papers\.', r'Southern Historical Society Papers\. (\d{1,3})(?!\d)',
                  r"Causes of Lee's Defeat at Gettysburg\. (\d{1,3})(?!\d)"),
    'SHSP-06': _h(r'(?<![\d,.])(\d{1,3}) Southern Historical Society Papers\.', r'Southern Historical Society Papers\. (\d{1,3})(?!\d)'),
    'JACOBS-1864': _h(r'(?<!\d)(\d{1,2}) (?:THE|TIIE|TILE) +REBEL +INVASION +O[FE]', r'MARYLAND +AND +PENNSYLVANIA\. +(\d{1,2})(?!\d)'),
    'PA-GB-1914-v2': _h(r'(?<!\d)(\d{3,4}) Pennsylvania at Gettysburg\.', r'Pennsylvania at Gettysburg\. (\d{3,4})(?!\d)'),
    'BACH-WHATTOSEE-1873': _h(r'(?<!\d)(\d{1,3}) ?[.,]? ?GETTYSBURG\.', r'GETTYSBURG\. (\d{1,3})(?!\d)', r"(?:[A-Z'\u2014-]{3,} ){2,}[A-Z]+\. ?(\d{1,3})(?!\d)"),
    'BACH-WHATTOSEE-1889': _h(r'(?<!\d)(\d{1,3}) ?[.,]? ?GETTYSBURG\.', r'GETTYSBURG\. (\d{1,3})(?!\d)', r"(?:[A-Z'\u2014-]{3,} ){2,}[A-Z]+\. ?(\d{1,3})(?!\d)"),
    'PA-GB-1904': _h(r'(?<!\d)(\d{2,4}) ?[.,]? ?Pennsylvania at (?:Gettysburg|Octtyshurg)\.', r'Pennsylvania at (?:Gettysburg|Octtyshurg)\. ?(\d{2,4})(?!\d)'),
    'ALEXANDER-1907': _h(r'(?<!\d)(\d{2,3}) MILITARY MEMOIRS', r'MILITARY MEMOIRS [A-Z ]{0,60}\.? ?(\d{2,3})(?!\d)'),
    'WELD-1912': _h(r'STEPHEN +M\. +WELD +(\d{2,3})(?!\d)', r'(?<!\d)(\d{2,3}) +WAR +DIARY +AND +LETTERS +OF'),
    'CHENEY-1901': _h(r'(?<!\d)(\d{2,3}) GETTYSBURG\.', r'GETTYSBURG\. (\d{2,3})(?!\d)'),
    'CAVTACT-1841c': _h(r'(?<!\d)(\d{2,3}) SCHOOL OF TH[EB]', r'(?:PLATOON|SQUADRON)[, ]+[A-Za-z]{4,10}\.? ?(\d{2,3})(?!\d)'),
    'MEADE-LL-v2': _h(r'(?<!\d)(\d{1,3}) LIFE AND LETTERS OF GENERAL MEADE', r'THE BATTLE OF GETTYSBURG (\d{1,3})(?!\d)'),
}


BARE = {}   # sid -> sorted list of (raw offset, page) built from lines holding only a page number


def _bare_markers(sid, text):
    if sid in BARE:
        return BARE[sid]
    cand = []
    for m in re.finditer(r'(?m)^[ \t]*(?:[\u2014-]+\d{0,2}[ \t]+)?(\d{1,3})[ \t]*$', text):
        cand.append((m.start(), int(m.group(1))))
    # longest chain of candidates whose page numbers rise by 1..3 (drops stray numerals)
    n = len(cand)
    best = [1] * n
    prev = [-1] * n
    for i in range(n):
        for j in range(i):
            if 0 < cand[i][1] - cand[j][1] <= 3 and best[j] + 1 > best[i]:
                best[i] = best[j] + 1
                prev[i] = j
    chain = []
    if n:
        k = max(range(n), key=lambda x: best[x])
        while k != -1:
            chain.append(cand[k])
            k = prev[k]
        chain.reverse()
    BARE[sid] = chain
    return chain


def lib_page(sid, nt, ni, raw_off=None, text=None):
    if sid in BARE_SOURCES and raw_off is not None and text is not None:
        ch = _bare_markers(sid, text)
        best = None
        for off, pg in ch:
            if off <= raw_off:
                best = (off, pg)
            else:
                break
        if best is None:
            return None, 'no bare page number before the passage; offset given'
        return str(best[1]), 'page number printed on its own line in the OCR text before the passage (offset %d)' % best[0]
    spec = PAGE_HEADS.get(sid)
    if not spec:
        return None, 'no running-head pattern for this source; offset given'
    best = None
    for rx in spec:
        for m in rx.finditer(nt, max(0, ni - 12000), ni):
            if best is None or m.start() > best.start():
                best = m
    if best is None:
        return None, 'no running head within 12000 characters before the passage; offset given'
    pg = next(g for g in best.groups() if g)
    fix = PAGE_OVERRIDES.get((sid, pg))
    if fix:
        return fix[0], 'running head before the passage reads "%s"; %s' % (best.group(0).strip(), fix[1])
    return pg, 'running head before the passage: "%s"' % best.group(0).strip()


# ------------------------------------------------------------------ printed pages of library texts: decision table of the audit
# horde/tl-02/library_pages.json (built by tmp/tl-02/audit/libpages_final.py): the page printed at the top of the scan leaf holding the passage
# (running head read in the OCR text), checked against the item's own page index; hand decisions carry their reason.  The running-head patterns
# above remain as the first model; where the decision differs the model value is kept in the citation as page_running_head_model.
LIBPAGES_P = os.path.join(G, 'horde', 'tl-02', 'library_pages.json')
_LP = None


def _libpages():
    global _LP
    if _LP is None:
        _LP = json.load(open(LIBPAGES_P, encoding='utf-8'))['entries'] if os.path.exists(LIBPAGES_P) else {}
    return _LP


# ------------------------------------------------------------------ quote resolution
class QuoteError(Exception):
    pass


OR_SHA = {}
OR_INDEX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json'), encoding='utf-8'))['records']}


def _or_author(h):
    r = OR_INDEX.get(h['record'] or '', {})
    if h['part'] == 3:
        return ('%s -> %s, %s' % ((r.get('header_raw') or '').strip()[:50], r.get('addressee') or '?', r.get('date_raw') or '')).strip()
    return re.sub(r'\s+', ' ', ((r.get('rank') or '') + ' ' + (r.get('author') or (r.get('toc_text') or '')[:60])).strip())


# ------------------------------------------------------------------ printed pages of the Official Records: scan leaf map first
# (audit of 2026-11-13: the running-head page model of tools/bt/or27_pages.py is wrong or interpolated on some pages; the printed
# page of the scan leaf (archive.org page index aligned to the OCR text, tools/bt/kit_or27_leafmap.py, read-only here) agrees with the
# running heads wherever both exist (880/880, 821/823, 974/975) and was read on the page image for every leaf cited in this shard.)
import kit_or27_leafmap as KL
_MODEL_BASIS = 'running heads of the OCR text (tools/bt/or27_pages.py); a page marked ~ is interpolated inside a run of lost heads'
_LV = None


def _viewed():
    global _LV
    if _LV is None:
        p = os.path.join(HERE, 'audit', 'viewed_leaves.json')
        _LV = json.load(open(p, encoding='utf-8'))['leaves'] if os.path.exists(p) else {}
    return _LV


def _or_page(h):
    """-> (printed page string, basis, scan dict or None, running-head model page when it differs from the scan page)"""
    model = h['page']
    lm = KL.load(h['part'])
    if lm is None:
        return model, _MODEL_BASIS, None, None
    a, b = lm.at(h['start']), lm.at(h['end'] - 1)
    if not a or not b or a['page'] is None or b['page'] is None:
        return model, _MODEL_BASIS + '; the scan leaf carries no printed page number in the item page index', None, None
    pa, pb = a['page'], b['page']
    page = str(pa) if pa == pb else '%s-%s' % (pa, pb)
    nums = sorted(set(int(x) for x in re.findall(r'\d+', re.sub(r'\([^)]*\)', '', model))))
    agree = '~' not in model and nums == sorted({pa, pb})
    lv = _viewed()
    img = all(lv.get('%d:%d' % (h['part'], lf)) == pg for lf, pg in ((a['leaf'], pa), (b['leaf'], pb)))
    scan = collections.OrderedDict(archive_identifier=KL.PARTS[h['part']], leaf=a['leaf'], pdf_page=a['leaf'] + 1)
    if b['leaf'] != a['leaf']:
        scan['leaf_end'] = b['leaf']
        scan['pdf_page_end'] = b['leaf'] + 1
    scan['printed_page_read_on_image'] = bool(img)
    base = ('printed page given by both the running head of the OCR text (tools/bt/or27_pages.py) and the page index of the scan leaf (archive.org page_numbers aligned to the OCR text by tools/bt/kit_or27_leafmap.py)'
            if agree else
            'printed page of the scan leaf (archive.org page_numbers aligned to the OCR text by tools/bt/kit_or27_leafmap.py); the running-head model of the OCR text (tools/bt/or27_pages.py) gave "%s" (%s)'
            % (model, 'interpolated inside a run of lost heads' if '~' in model else 'a head that does not belong to this page'))
    if img:
        base += '; printed page also read on the page image (PDF page %d of %s.pdf)' % (a['leaf'] + 1, KL.PARTS[h['part']])
    return page, base, scan, (None if agree else model)


def resolve(key, c):
    if c['src'] == 'COMPUTED':
        out = collections.OrderedDict(key=key, source_id='COMPUTED', work='computation', what=c['what'], value=c['value'], method=c['method'])
        if c.get('note'): out['note'] = c['note']
        return out
    q = norm_query(c['quote'])
    if len(q) < 8:
        raise QuoteError('%s: quote too short' % key)
    if c['src'] == 'OR27':
        hits = F.verify(q)
        if not hits:
            raise QuoteError('%s: OR quote not found: %r' % (key, q))
        want = c.get('report')
        if want:
            hs = [h for h in hits if h['record'] == want]
            if not hs:
                raise QuoteError('%s: OR quote found only in %s, not in %s: %r' % (key, sorted(set(str(h['record']) for h in hits)), want, q))
        else:
            hs = hits
            if len(set(h['record'] for h in hits)) > 1:
                raise QuoteError('%s: OR quote occurs in several records %s; state report: %r' % (key, sorted(set(str(h['record']) for h in hits)), q))
        h = hs[0]
        part = h['part']
        if part not in OR_SHA:
            OR_SHA[part] = sha_file(raw_path(part))
        page, page_basis, scan, model_page = _or_page(h)
        if c.get('page') and str(c['page']) not in page:
            raise QuoteError('%s: page stated %s, found %s (scan leaf; running-head model %s) (%s)' % (key, c['page'], page, h['page'], h['record']))
        out = collections.OrderedDict(key=key, source_id='OR27', work='Official Records of the Union and Confederate Armies, Ser. I, vol. 27, part %d' % part,
                                      part=part, report_id=h['record'], author=_or_author(h), printed_page=page, page_basis=page_basis,
                                      quote=q, text_offset=h['start'], text_offset_end=h['end'], source_file=rel(raw_path(part)), sha256=OR_SHA[part],
                                      source_class='official report, order or dispatch of 1863 (printed 1889)' if part != 2 else 'Confederate report (written 1863 to 1864, printed 1889)')
        if scan: out['scan'] = scan
        if model_page: out['page_running_head_model'] = model_page
        if len(hs) > 1: out['occurrences_in_report'] = len(hs)
    else:
        sid = c['src']
        text, ntext, nmap, path = ws9find.load(TEXT_OF.get(sid, sid))
        i = ntext.find(norm_query(q).translate(ws9find.APOS))
        if i < 0:
            raise QuoteError('%s: quote not found in %s: %r' % (key, sid, q))
        qn = norm_query(q).translate(ws9find.APOS)
        n = ntext.count(qn)
        pg, basis = lib_page(TEXT_OF.get(sid, sid), ntext, i, nmap[i], text)
        model_pg = None
        dec = _libpages().get('%s@%d' % (sid, nmap[i]))
        if dec is None and os.environ.get('TL2_NOPAGES'):
            # only used by tmp/tl-02/audit/mk_tmp_corr.py to list the citations that still need a page decision
            dec = dict(page=pg, basis='PENDING decision', method='pending', leaf=None)
        if dec is None:
            raise QuoteError('%s: no page decision for %s@%d in library_pages.json (run tmp/tl-02/audit/libpages_final.py)' % (key, sid, nmap[i]))
        if c.get('page') is not None and str(c['page']) != str(dec['page']):
            raise QuoteError('%s: page stated %s, decided %s in %s (%s)' % (key, c['page'], dec['page'], sid, dec['method']))
        if pg is not None and str(pg) != str(dec['page']) and dec['page'] is not None:
            model_pg = pg
        pg, basis = dec['page'], dec['basis']
        m = src_meta(sid)
        out = collections.OrderedDict(key=key, source_id=sid, work=m['work'], part=None, report_id=None, author=None, printed_page=pg, page_basis=basis,
                                      quote=q, text_offset=nmap[i], text_offset_end=nmap[i + len(qn) - 1] + 1, source_file=rel(path), sha256=sha_file(path),
                                      archive_identifier=m['ident'], source_class=m['cls'])
        if dec.get('leaf') is not None:
            out['scan'] = collections.OrderedDict(archive_identifier=dec['archive_identifier'], leaf=dec['leaf'], leaf_head_read=dec.get('head'), item_page_index=dec.get('index_page'))
        if model_pg is not None: out['page_running_head_model'] = model_pg
        if n > 1: out['occurrences_in_text'] = n
    for k in ('supports', 'note', 'witness', 'reading'):
        if c.get(k): out[k] = c[k]
    return out


# ------------------------------------------------------------------ search runner
_NEWS = re.compile(r'^(ADAMS-SENTINEL|GBG-COMPILER)')
_OTHER_OR = re.compile(r'^(OR-25|OR-29|ORSER3)')


def scope_sids(scope):
    allk = list(ws9find.sources())
    if scope == 'ALL':
        return allk
    if scope == 'LIB':
        return [k for k in allk if not _NEWS.match(k) and not _OTHER_OR.match(k)]
    if scope == 'NEWS':
        return [k for k in allk if _NEWS.match(k)]
    if isinstance(scope, (list, tuple)):
        out = []
        for s in scope:
            out += [k for k in allk if k == s or k.startswith(s)]
        return out
    raise ValueError(scope)


def run_searches(specs):
    """specs: list of SR dicts. Returns {id(spec): result}. Loads each source once."""
    res = {}
    orspecs = [s for s in specs if s['scope'] == 'OR27']
    libspecs = [s for s in specs if s['scope'] != 'OR27']
    for s in specs:
        flags = 0 if s['case'] else re.I
        s['_rx'] = re.compile(s['pattern'], flags)
        s['_nr'] = re.compile(s['near'], flags) if s['near'] else None
        res[id(s)] = dict(hits=0, by_source=collections.OrderedDict(), sample=[])

    def scan(s, ntext, label, offmap, extra=None):
        r = res[id(s)]
        rx, nr, win = s['_rx'], s['_nr'], s['win']
        n = 0
        for m in rx.finditer(ntext):
            if m.end() == m.start():
                continue
            if nr and not nr.search(ntext[max(0, m.start() - win):m.end() + win]):
                continue
            n += 1
            if len(r['sample']) < 3 and (label not in [x[0] for x in r['sample']] or len(r['sample']) < 2):
                r['sample'].append((label, offmap(m.start()), ntext[max(0, m.start() - 60):m.end() + 60]))
        if n:
            r['hits'] += n
            r['by_source'][label] = r['by_source'].get(label, 0) + n

    if orspecs:
        for p in (1, 2, 3):
            P = F.get_part(p)
            for s in orspecs:
                scan(s, P.ntext, 'OR27-pt%d' % p, lambda i, P=P: int(P.nmap[i]))
    by_sid = collections.OrderedDict()
    for s in libspecs:
        for sid in scope_sids(s['scope']):
            by_sid.setdefault(sid, []).append(s)
    for sid, ss in by_sid.items():
        text, ntext, nmap, path = ws9find.load(sid)
        for s in ss:
            scan(s, ntext, sid, lambda i, nmap=nmap: int(nmap[i]))
    return res
