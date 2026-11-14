"""Close-out builder for timeline shard tl-03 (seed rows T1-116..T1-172, 57 rows).

Run:  python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/build.py [--check-only]

Reads the row data in rows_a.py, rows_b.py, rows_c.py (this folder), re-matches EVERY quote verbatim in the local source
text (Official Records vol.27 OCR under tmp/library/or27, library texts under tmp/library/ws9, the National Park Service texts under tmp/library/web/nps, texts added for this close-out under tmp/tl-03/acq) and stops with an error if a quote is not found, is found in another report than stated, or on
another printed page. Then writes:
  GOVERNANCE/timeline_corrections/tl-03.jsonl          one line per seed row (57: T1-116..T1-172)
  GOVERNANCE/horde/tl-03/results.jsonl                 shard rows with the recheck findings applied (57)
  GOVERNANCE/horde/tl-03/proposed-register/tl-03-CO-<row>.md   one entry per row that stays gap, unsupported or partial
  GOVERNANCE/horde/tl-03/closeout/counts.json          counts used by REPORT.md
Nothing outside the shard's ownership list is written. Offsets are character offsets in the raw file decoded as UTF-8
with newline='' (the convention of tools/bt/or27_lib.py)."""
import os, re, sys, json, hashlib, bisect, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
sys.path.insert(0, HERE)
import or27_find as F
import kit_or27_leafmap as KL
from or27_lib import build_nview, norm_query, raw_path

SHARD = 'tl-03'
TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
VERDICTS = ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap')
BANNED = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model)\b')

# ---------------------------------------------------------------- sources
ACQ2 = json.load(open(os.path.join(G, 'library', 'acquired_2.json'), encoding='utf-8'))
ACQ1 = json.load(open(os.path.join(G, 'library', 'acquired.json'), encoding='utf-8'))
LIB = {}
for it in ACQ2['items']:
    LIB[it['id']] = {'path': it['local_path'], 'sha256': it['sha256'], 'title': it['title'], 'date': it.get('date'),
                     'archive_identifier': it.get('archive_identifier'), 'index': 'GOVERNANCE/library/acquired_2.json'}
_t1 = {it['source_id']: it for it in ACQ1['items']}
for it in ACQ2.get('reverified_prior_items', []):
    a = _t1.get(it['source_id'], {})
    LIB[it['source_id']] = {'path': it['local_path'], 'sha256': it['sha256_now'], 'title': a.get('title'), 'date': a.get('date'),
                            'archive_identifier': it.get('archive_identifier'), 'index': 'GOVERNANCE/library/acquired.json'}
_a3 = os.path.join(G, 'library', 'acquired_3.json')   # texts of the National Park Service acquired by another workstream (read only)
if os.path.exists(_a3):
    for it in json.load(open(_a3, encoding='utf-8')).get('items', []):
        if it.get('local_path') and it.get('text_sha256'):
            LIB[it['id']] = {'path': it['local_path'], 'sha256': it['text_sha256'], 'title': it.get('title'), 'date': it.get('date'), 'archive_identifier': None, 'index': 'GOVERNANCE/library/acquired_3.json'}
LOCAL = json.load(open(os.path.join(HERE, 'acquired_tl03.json'), encoding='utf-8'))
for it in LOCAL.get('items', []):          # texts fetched for this close-out (archive.org); sha256 of the text file as saved
    LIB[it['id']] = {'path': it['local_path'], 'sha256': it['sha256'], 'title': it.get('title'), 'date': it.get('date'),
                     'archive_identifier': it.get('archive_identifier'), 'index': 'GOVERNANCE/horde/tl-03/closeout/acquired_tl03.json'}
if os.path.exists(os.path.join(ROOT, 'tmp/library/misc/pennsylvaniaatge04penn_djvu.txt')):   # acquired.json PA-GB-1914a (the title page of the text reads Volume I)
    LIB['PA-GB-1914-v1'] = {'path': 'tmp/library/misc/pennsylvaniaatge04penn_djvu.txt', 'sha256': 'a819817be3edf5cd03f0f306e1b90b7e3c2598859c1ef2c0f2365815e7ac8668',
                            'title': 'Pennsylvania at Gettysburg (1914 printing), vol. 1, 11th to 111th Infantry', 'date': '1914', 'archive_identifier': 'pennsylvaniaatge04penn', 'index': 'GOVERNANCE/library/acquired.json (PA-GB-1914a)'}
OR_SHA = {1: None, 2: None, 3: None}
OR_INDEX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json'), encoding='utf-8'))['records']}

# short labels used in citations (author, short title, year); nothing here is a claim about content
LABEL = {
 'JACOBS-1864': 'M. Jacobs, Notes on the Rebel Invasion of Maryland and Pennsylvania and the Battle of Gettysburg (Philadelphia 1864)',
 'GBG-COMPILER-1863-06-29': 'Gettysburg Compiler, Monday June 29, 1863',
 'GBG-COMPILER-1863-09-21': 'Gettysburg Compiler, September 21, 1863',
 'ADAMS-SENTINEL-1863-07-21': 'Adams Sentinel (Gettysburg), July 21, 1863',
 'ADAMS-SENTINEL-1863-09-08': 'Adams Sentinel (Gettysburg), September 8, 1863',
 'PA-GB-1914-v2': 'Pennsylvania at Gettysburg (1914 edition), vol. 2',
 'PA-GB-1904': 'Pennsylvania at Gettysburg (1904 edition), vol. 2',
 'BL-3': 'Battles and Leaders of the Civil War, vol. 3 (1887-1888)',
 'FREMANTLE-1864': 'A. J. L. Fremantle, Three Months in the Southern States (1864)',
 'ME-GB-1898': 'Maine at Gettysburg (1898)',
 'SHSP-04': 'Southern Historical Society Papers, vol. 4 (1877)',
 'SHSP-06': 'Southern Historical Society Papers, vol. 6 (1878)',
 'MEADE-LL-v2': 'The Life and Letters of George Gordon Meade, vol. 2 (1913)',
 'ALEXANDER-1907': 'E. P. Alexander, Military Memoirs of a Confederate (1907)',
 'LETTERMAN-1866': 'J. Letterman, Medical Recollections of the Army of the Potomac (1866)',
 'NY-GB-1900': 'New York at Gettysburg (1900), vol. 1',
 'MI-GB-1889': 'Michigan at Gettysburg (1889)',
 'HARD-1868': 'A. Hard, History of the Eighth Cavalry Regiment, Illinois Volunteers (1868)',
}

# ------------------------------------------------------------------ printed pages of the Official Records: scan leaf map first
# (second pass of 2026-11-14, the rule of the tl-02 close-out): the running-head page model of tools/bt/or27_pages.py loses its heads on tabular
# pages and interpolates ("~"); the printed page of the scan leaf (archive.org page index aligned to the OCR text, tools/bt/kit_or27_leafmap.py,
# read-only here) agrees with the running heads wherever both exist (880/880, 821/823, 974/975).  audit/viewed_leaves.json lists the leaves whose
# printed page was read on the page image (key "part:leaf").
_MODEL_BASIS = 'running heads of the OCR text (tools/bt/or27_pages.py); a page marked ~ is interpolated inside a run of lost heads'
_LV = None

def _viewed():
    global _LV
    if _LV is None:
        p = os.path.join(HERE, 'audit', 'viewed_leaves.json')
        _LV = json.load(open(p, encoding='utf-8'))['leaves'] if os.path.exists(p) else {}
    return _LV

def or_page(h):
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

# classes of source for the product (what kind of text a citation is)
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
    'PA-GB-1914-v1': 'state commission volume with regimental addresses (1914 printing, vol. 1)',
    'PA-GB-1914-v2': 'state commission volume with addresses (1914)',
    'ME-GB-1898': 'state commission volume (1898)',
    'LETTERMAN-1866': 'memoir by the army medical director, with orders printed in full (1866)',
    'SHSP-04': 'participant recollection published 1877',
    'SHSP-06': 'participant papers published 1878 (including the divisional report of 1863 as printed)',
    'FOX-1889': 'compiled loss statistics (1889)',
    'FREMANTLE-1864': 'eyewitness diary of a British officer with the Confederate army, published 1864',
    'LONGSTREET-1896': 'participant memoir published 1896',
    'PIERCE-F-1914': 'published history (1914)',
    'HOSPSCENES-1864': 'nurse\'s account published 1864',
    'JACOBS-1888': 'reprint (1888), searched only',
    'HARD-1868': 'regimental history by its surgeon, a participant (1868)',
}

_SAL = re.compile(r'\b(?:Sir|Captain|Major|General|Colonel|Gentlemen|Lieutenant|Dear Sir|Dear General|Dear Colonel|My dear General)\s*[:;.,]|\bGeneral:')
_HEADS = {}
def report_heading(rec_id):
    """Verbatim OCR text at the start of the report that holds a citation (number, rank, name, unit, place and date up to the salutation), with its raw offsets:
    the unit and author of a quoted passage are read from it (the OCR damage of the heading is kept)."""
    if rec_id in _HEADS: return _HEADS[rec_id]
    rec = OR_INDEX.get(rec_id or '')
    if not rec: _HEADS[rec_id] = None; return None
    import bisect as _b
    P = F.get_part(rec['part'])
    ns = _b.bisect_left(P.nmap, rec['start_offset'])
    chunk = P.ntext[ns:ns + 420]
    m = _SAL.search(chunk, 20)
    text = (chunk[:m.start()] if m and m.start() < 400 else chunk[:200]).strip()
    if not text: _HEADS[rec_id] = None; return None
    a = P.nmap[ns]; b = P.nmap[ns + len(chunk[:len(text)]) - 1] + 1
    _HEADS[rec_id] = collections.OrderedDict(text=text, text_offset=a, text_offset_end=b)
    return _HEADS[rec_id]

LIBPAGES_P = os.path.join(G, 'horde', 'tl-03', 'library_pages.json')
_LP = None
def _libpages():
    global _LP
    if _LP is None:
        _LP = json.load(open(LIBPAGES_P, encoding='utf-8'))['entries'] if os.path.exists(LIBPAGES_P) else {}
    return _LP

_SLOG = None
def logged_searches(rid):
    """One exact line per logged search (closeout/search_log.jsonl) that names this row: scope, regular expression, hits per source, purpose."""
    global _SLOG
    if _SLOG is None:
        _SLOG = collections.defaultdict(list)
        p = os.path.join(HERE, 'search_log.jsonl')
        if os.path.exists(p):
            for l in open(p, encoding='utf-8'):
                if l.strip():
                    e = json.loads(l)
                    for r_ in e.get('rows') or []:
                        _SLOG[r_].append(e)
    out = []
    for e in _SLOG.get(rid, []):
        h = e.get('hits') or {}
        files = h.get('_library_files_searched')
        tot = sum(v for k, v in h.items() if not k.startswith('_'))
        by = ', '.join('%s %d' % (k.replace('OR27 ', ''), v) for k, v in h.items() if not k.startswith('_') and v)
        scope = {'or': 'Official Records vol.27 parts 1-3', 'or1': 'Official Records vol.27 part 1', 'or2': 'Official Records vol.27 part 2', 'or3': 'Official Records vol.27 part 3',
                 'lib': 'local library texts' + (' (%d searched%s)' % (files, '; ids ' + e['ids'] if e.get('ids') else '') if files else ''), 'both': 'Official Records and local library'}.get(e.get('scope'), e.get('scope'))
        out.append('logged search (%s%s): regex `%s` -> %d hits%s%s' % (scope, ', ' + e['ts'][:10] if e.get('ts') else '', e['pattern'], tot, (' (' + by + ')') if by else '',
                                                                          (' [' + e['note'] + ']') if e.get('note') else ''))
    return out

def sha_file(p):
    h = hashlib.sha256(); h.update(open(p, 'rb').read()); return h.hexdigest()

_lib = {}
def lib_text(sid):
    """(raw, ntext, nmap, relpath, sha) for a library text or a local newspaper text layer"""
    if sid in _lib: return _lib[sid]
    if sid in LIB:
        rel = LIB[sid]['path']
    else:
        raise KeyError('unknown library source ' + sid)
    p = os.path.join(ROOT, rel)
    raw = open(p, encoding='utf-8', newline='').read()
    sha = sha_file(p)
    if LIB[sid].get('sha256') and LIB[sid]['sha256'] != sha:
        raise SystemExit('sha256 of %s differs from the library index' % rel)
    nt, nm = build_nview(raw)
    _lib[sid] = (raw, nt, nm, rel, sha)
    return _lib[sid]

NPS_PAGE = re.compile(r'=== PAGE (\d+) ===')
HEAD_A = re.compile(r'(?<![\d,.])(\d{1,4}) ([A-Z][A-Za-z\'’.,&-]*(?: [A-Za-z\'’.,&-]+){1,7})')

def lib_page(sid, nt, ni):
    """printed page from the nearest running head before position ni in the normalised text, with the head as evidence"""
    if sid.startswith('NPS') and sid not in PAGE_HEADS:      # National Park Service text layers carry '=== PAGE n ===' markers (the PDF page, not the printed page)
        best = None
        for m in NPS_PAGE.finditer(nt, max(0, ni - 60000), ni):
            best = m
        if best is None: return None, 'no PDF page marker before the passage; offset given'
        return best.group(1), 'PDF page marker of the text layer (=== PAGE %s ===) before the passage; this is the PDF page, not the printed page' % best.group(1)
    spec = PAGE_HEADS.get(sid)
    if not spec: return None, 'no printed page recovered from the text; offset given'
    best = None
    for rx in spec:
        for m in rx.finditer(nt, max(0, ni - 9000), ni):
            if best is None or m.start() > best.start(): best = m
    if best is None: return None, 'no running head within 9000 characters before the passage; offset given'
    pg = next(g for g in best.groups() if g)
    return pg, 'running head before the passage: "%s"' % best.group(0).strip()

PAGE_HEADS = {
 'JACOBS-1864': [re.compile(r'(?<!\d)(\d{1,2}) (?:THE|TIIE|TILE) +REBEL +INVASION +O[FE]'), re.compile(r'MARYLAND +AND +PENNSYLVANIA\. +(\d{1,2})(?!\d)')],
 'PA-GB-1914-v2': [re.compile(r'(?<!\d)(\d{3,4}) Pennsylvania at Gettysburg\.'), re.compile(r'Pennsylvania at Gettysburg\. (\d{3,4})(?!\d)')],
 'ME-GB-1898': [re.compile(r'(?<!\d)(\d{2,3}) MAINE AT [A-Z0-9]{5,10}\.'), re.compile(r'[A-Z]{4,} REGIMENT [A-Za-z]+\. (\d{2,3})(?!\d)')],   # the OCR misreads GETTYSBURG in many running heads (GETTYSBUBG, OBTTTSBURG, GETTY8BUKG)
 'SHSP-04': [re.compile(r'(?<!\d)(\d{1,3}) Southern Historical Society Papers\.')],
 'SHSP-06': [re.compile(r'(?<!\d)(\d{1,3}) Southern Historical Society Papers\.')],
 'ALEXANDER-1907': [re.compile(r'(?<!\d)(\d{2,3}) MILITARY MEMOIRS')],
 'FREMANTLE-1864': [re.compile(r'(?<!\d)(\d{3}) [A-Z][A-Za-z\'’.-]+(?: [A-Za-z\'’.-]+){0,5}\. (?=[A-Za-z"\'])'), re.compile(r'[A-Z]{3,}[A-Za-z\'’ .-]{3,40}\. (\d{3})(?!\d)')],
 'MEADE-LL-v2': [re.compile(r'THE BATTLE OF GETTYSBURG (\d{1,3})(?!\d)')],
 'HARD-1868': [re.compile(r'THE EIGHTH ILLINOIS CAVALRY\. (\d{2,3})(?!\d)'), re.compile(r'(?<!\d)(\d{2,3}) THE EIGHTH ILLINOIS CAVALRY\.')],
 'BL-3': [re.compile(r'CITIZENS OF GETTYSBURG IN THE UNION ARMY\. (\d{3})(?!\d)'), re.compile(r'THE FIRST DAY AT GETTYSBURG\. (\d{3})(?!\d)'), re.compile(r'(?<!\d)(\d{3}) THE FIRST DAY AT GETTYSBURG')],
 'NY-GB-1900-v2': [re.compile(r'(?<!\d)(\d{3,4}) New York at Gettysburg\.'), re.compile(r'New York at Gettysburg\. (\d{3,4})(?!\d)')],
 'PA-GB-1914-v1': [re.compile(r'(?<!\d)(\d{3,4}) Pennsylvania at Gettys ?burg\.'), re.compile(r'Pennsylvania at Gettys ?burg\. (\d{2,4})(?!\d)')],
}
FIXED_PAGE = {}   # no page-image readings in this close-out

class QuoteError(Exception):
    pass

def resolve(cid, c):
    """verify one citation; returns the full citation record"""
    if c['src'] == 'COMPUTED':
        out = collections.OrderedDict(key=cid, source_id='COMPUTED', work='computation', what=c['what'], value=c['value'], method=c['method'])
        for k in ('supports', 'note', 'image_check', 'reading', 'witness'):
            if c.get(k): out[k] = c[k]
        return out
    q = norm_query(c['quote'])
    if len(q) < 8: raise QuoteError('%s: quote too short' % cid)
    if c['src'] == 'OR27':
        hits = F.verify(q)
        if not hits: raise QuoteError('%s: OR quote not found: %r' % (cid, q))
        want = c.get('report')
        if want:
            hs = [h for h in hits if h['record'] == want]
            if not hs: raise QuoteError('%s: OR quote found only in %s, not in %s: %r' % (cid, sorted(set(str(h['record']) for h in hits)), want, q))
        else:
            hs = hits
            if len(set(h['record'] for h in hits)) > 1: raise QuoteError('%s: OR quote occurs in several records %s; state report' % (cid, sorted(set(str(h['record']) for h in hits))))
        h = hs[0]
        part = h['part']
        if OR_SHA[part] is None: OR_SHA[part] = sha_file(raw_path(part))
        rec = OR_INDEX.get(h['record'] or '', {})
        author = c.get('author') or ((rec.get('rank') or '') + ' ' + (rec.get('author') or '')).strip() or (rec.get('header_raw') or '')[:60]
        page, page_basis, scan, model_page = or_page(h)
        if c.get('page') and str(c['page']) not in page.replace('-', ' ').split() and str(c['page']) != page:
            raise QuoteError('%s: page stated %s, found %s on the scan leaf (running-head model %s) (%s)' % (cid, c['page'], page, h['page'], h['record']))
        out = collections.OrderedDict(key=cid, source_id='OR27', work='Official Records of the Union and Confederate Armies, Ser. I, vol. 27, part %d' % part,
              part=part, report_id=h['record'], author=author, printed_page=page, page_basis=page_basis,
              quote=q, text_offset=h['start'], text_offset_end=h['end'],
              source_file=os.path.relpath(raw_path(part), ROOT).replace(os.sep, '/'), sha256=OR_SHA[part],
              source_class='official report, order or dispatch of 1863 (printed 1889)' if part != 2 else 'Confederate report (written 1863 to 1864, printed 1889)')
        if scan: out['scan'] = scan
        hd = report_heading(h['record'])
        if hd: out['report_heading'] = hd
        if model_page: out['page_running_head_model'] = model_page
        if len(hs) > 1: out['occurrences_in_report'] = len(hs)
    else:
        sid = c['src']
        raw, nt, nm, rel, sha = lib_text(sid)
        i = nt.find(q)
        if i < 0: raise QuoteError('%s: quote not found in %s: %r' % (cid, sid, q))
        n = nt.count(q)
        pg, basis = FIXED_PAGE.get(sid, (None, None))
        if pg is None: pg, basis = lib_page(sid, nt, i)
        dec = None; model_pg = None
        if not sid.startswith('NPS'):
            # printed page of an archive.org item: decided per citation in horde/tl-03/library_pages.json (tmp/tl-03/audit/libpages3.py): the number printed
            # at the top of the scan leaf, checked against the item's own page index; hand decisions carry their reason
            dec = _libpages().get('%s@%d' % (sid, nm[i]))
            if dec is None:
                if os.environ.get('TL3_NOPAGES'):
                    dec = dict(page=pg, basis='PENDING decision', method='pending', leaf=None)
                else:
                    raise QuoteError('%s: no page decision for %s@%d in library_pages.json (run tmp/tl-03/audit/libpages3.py)' % (cid, sid, nm[i]))
            if c.get('page') is not None and dec.get('page') is not None and str(c['page']) != str(dec['page']):
                raise QuoteError('%s: page stated %s, decided %s in %s (%s)' % (cid, c['page'], dec['page'], sid, dec.get('method')))
            if pg is not None and dec.get('page') is not None and str(pg) != str(dec['page']): model_pg = pg
            pg, basis = dec.get('page'), dec['basis']
        else:
            if c.get('page') and pg is not None and str(c['page']) != str(pg):
                raise QuoteError('%s: page stated %s, recovered %s in %s' % (cid, c['page'], pg, sid))
            if c.get('page') and pg is None: pg, basis = str(c['page']), c.get('page_basis') or 'stated from the running head read in the text'
        out = collections.OrderedDict(key=cid, source_id=sid, work=LABEL.get(sid) or LIB[sid].get('title'), part=None, report_id=None,
              author=c.get('author'), printed_page=pg, page_basis=basis,
              quote=q, text_offset=nm[i], text_offset_end=nm[i + len(q) - 1] + 1, source_file=rel, sha256=sha,
              archive_identifier=LIB[sid].get('archive_identifier'), library_index=LIB[sid]['index'],
              source_class=CLASS.get(sid) or ('National Park Service study (text layer of the PDF; page = PDF page)' if sid.startswith('NPS') else None))
        if dec and dec.get('leaf') is not None:
            out['scan'] = collections.OrderedDict(archive_identifier=dec.get('archive_identifier'), leaf=dec['leaf'], leaf_head_read=dec.get('head'), item_page_index=dec.get('index_page'))
        if model_pg is not None: out['page_running_head_model'] = model_pg
        if n > 1: out['occurrences_in_text'] = n
    for k in ('reading', 'supports', 'note', 'image_check', 'witness'):
        if c.get(k): out[k] = c[k]
    return out

# ---------------------------------------------------------------- window limits
# What every limit of a corrected window is. tools/bt/realize/timeline.mjs reads start and end as the allowed window of the row and adds its
# own clock tolerance (tolerances.json time.clock_tolerance_min, 20 minutes) at a limit that is a clock time, none at the edge of a date.
# A limit is therefore the plain source time, not a time with a margin. Date edges, the single sun table of tolerances.json and the day-part
# edges of tolerances.json are explained by rule; every other limit needs an entry here and the build stops if one is missing.
SUN_TABLE = {'04:03': 'civil dawn', '04:35': 'sunrise', '19:32': 'sunset', '20:04': 'civil dusk'}
DAY_PART_EDGE = {'18:00': 'the start of evening', '12:00': 'noon, the end of morning and the start of afternoon'}
LIMIT_NOTES = {}   # per-row limit explanations come from the row data (key `limits`: {'start': text, 'end': text})

def window_limits_note(rid, start, end, errs=None, limits=None):
    """One sentence saying what each limit of a corrected window is, so that no limit stands unexplained."""
    parts = []
    sun_used = False
    for name, v in (('start', (start or '')[11:]), ('end', (end or '')[11:])):
        if not v:
            continue
        if (name == 'start' and v == '00:00') or (name == 'end' and v == '23:59'):
            parts.append('the %s %s is the edge of the calendar date' % (name, v))
        elif (limits or {}).get(name):
            parts.append('the %s %s is %s' % (name, v, limits[name]))
        elif (rid, name) in LIMIT_NOTES:
            parts.append('the %s %s is %s' % (name, v, LIMIT_NOTES[(rid, name)]))
        elif v in SUN_TABLE:
            sun_used = True
            parts.append('the %s %s is %s of the sun table of tolerances.json' % (name, v, SUN_TABLE[v]))
        elif v in DAY_PART_EDGE:
            parts.append('the %s %s is %s (tolerances.json time.day_parts)' % (name, v, DAY_PART_EDGE[v]))
        else:
            if errs is not None:
                errs.append('%s window %s %s has no stated origin (add it to LIMIT_NOTES)' % (rid, name, v))
    if not parts:
        return ''
    note = ' Window limits: ' + '; '.join(parts) + '.'
    if sun_used:
        note += ' The sun table has one value for every date; for 1 July the same table gives civil dawn 04:03, sunrise 04:35 and civil dusk 20:04 (PDF p.9).'
    note += ' A limit is an allowed bound, not a claim of when the event happened; the reader adds its own clock tolerance at a clock-time limit.'
    return note

# ---------------------------------------------------------------- build
def main():
    check_only = '--check-only' in sys.argv
    import importlib
    rows = []
    for mod in ('rows_a', 'rows_b', 'rows_c'):
        try:
            rows += importlib.import_module(mod).ROWS
        except ModuleNotFoundError:
            if '--partial' not in sys.argv: raise
    rows.sort(key=lambda r: int(r['id'].split('-')[1]))     # the row modules are not in id order (T1-124 sits beside T1-119)
    seed = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')][115:172]
    seed_by = {r['id']: r for r in seed}
    # The "before" values must be those of the shard as it was BEFORE the close-out, whatever the number of times this builder runs:
    # results.pre-closeout.jsonl is the shard's own results.jsonl of 2026-11-04 (git 9cd6e3b3), status_effective.pre-closeout.json the
    # status_effective of timeline_verified.jsonl before the close-out. results.jsonl itself is only written, never read as input.
    res_path = os.path.join(G, 'horde', SHARD, 'results.jsonl')
    base_path = os.path.join(HERE, 'results.pre-closeout.jsonl')
    if not os.path.exists(base_path):
        raise SystemExit('missing %s: it is the shard results.jsonl as it was before the close-out (git 9cd6e3b3)' % base_path)
    old = [json.loads(l) for l in open(base_path, encoding='utf-8') if l.strip()]
    if any('verdict_before' in r or 'Close-out 2026-11-13' in json.dumps(r, ensure_ascii=False) for r in old):
        raise SystemExit('%s already carries close-out fields: it must be the shard result as it was before the close-out' % base_path)
    old_by = {r['id']: r for r in old}
    se_path = os.path.join(HERE, 'status_effective.pre-closeout.json')
    if os.path.exists(se_path):
        ver = {k: {'status_effective': v} for k, v in json.load(open(se_path, encoding='utf-8')).items()}
    else:
        ver = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_verified.jsonl'), encoding='utf-8')}
        if not check_only:
            json.dump({k: v.get('status_effective') for k, v in ver.items() if k.startswith('T1-')}, open(se_path, 'w', encoding='utf-8', newline='\n'), indent=1)
    rc1 = collections.defaultdict(list)
    for l in open(os.path.join(G, 'horde', 'OR-RECHECK', 'results.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        if r.get('shard') == SHARD: rc1[r['row_id']].append(r)
    rc2 = {}
    for l in open(os.path.join(G, 'horde', 'OR-RECHECK-2', SHARD, 'results.jsonl'), encoding='utf-8'):
        r = json.loads(l); rc2[r['id']] = r
    ids = [r['id'] for r in rows]
    want_ids = ['T1-%03d' % i for i in range(116, 173)]
    errs = []
    partial = '--partial' in sys.argv
    if not partial and ids != want_ids: errs.append('row ids are not exactly T1-116..T1-172 in order: %s' % [i for i in want_ids if i not in ids])
    if len(set(ids)) != len(ids): errs.append('duplicate row ids')
    out_rows = []; nq = 0
    for r in rows:
        rid = r['id']
        cites = collections.OrderedDict()
        for key, c in r.get('cites', {}).items():
            try:
                cites[key] = resolve(key, c); nq += 1
            except QuoteError as e:
                errs.append('%s %s' % (rid, e))
        if r['verdict'] not in VERDICTS: errs.append('%s bad verdict %s' % (rid, r['verdict']))
        subs = []
        for n, s in enumerate(r['subs'], 1):
            claim, tier, support, keys = s[0], s[1], s[2], list(s[3])
            note = s[4] if len(s) > 4 else None
            if tier not in TIERS: errs.append('%s sub %d bad tier %s' % (rid, n, tier))
            if support not in ('supported', 'contradicted', 'unsupported', 'conflict'): errs.append('%s sub %d bad support %s' % (rid, n, support))
            for k in keys:
                if k not in r.get('cites', {}): errs.append('%s sub %d cites unknown key %s' % (rid, n, k))
            if tier == 'documented' and not keys: errs.append('%s sub %d documented without a citation' % (rid, n))
            d = collections.OrderedDict(n=n, claim=claim, tier=tier, support=support, citations=keys)
            if note: d['note'] = note
            subs.append(d)
        used = set(k for s in subs for k in s['citations']) | set(k for sc in r.get('scenarios', []) for k in sc.get('cites', []))
        for k in r.get('cites', {}):
            if k not in used: errs.append('%s citation %s is not used by any sub-claim or scenario' % (rid, k))
        cc = r['claim']
        for fld in ('event', 'unit', 'place', 'text'):
            if not cc.get(fld): errs.append('%s corrected_claim.%s empty' % (rid, fld))
        prod = json.dumps([cc, [s['claim'] for s in subs], r.get('scenarios', [])], ensure_ascii=False)
        m = BANNED.search(prod)
        if m: errs.append('%s banned word in product text: %s' % (rid, m.group(0)))
        if (r['verdict'] in ('partially_supported', 'unsupported', 'gap') or r.get('remains') or any(s['support'] == 'unsupported' for s in subs)) and not r.get('register'): errs.append('%s needs a proposed register entry' % rid)
        if r['verdict'] == 'confirmed' and r.get('register'): errs.append('%s is confirmed and must not carry a register entry' % rid)
        for k_ in ('start', 'end'):
            v_ = cc.get(k_)
            if v_ is not None and not re.match(r'^1863-\d\d-\d\dT\d\d:\d\d$', v_): errs.append('%s time window %s is not 1863-MM-DDTHH:MM: %r' % (rid, k_, v_))
        if cc.get('start') and cc.get('end') and cc['end'] < cc['start']: errs.append('%s time window ends before it starts' % rid)
        if cc.get('tier') not in TIERS: errs.append('%s corrected_claim tier %r' % (rid, cc.get('tier')))
        if r['verdict'] == 'confirmed' and (r.get('remains') or any(s['support'] != 'supported' for s in subs)): errs.append('%s confirmed but has unsupported parts' % rid)
        v = ver[rid]; o = old_by[rid]
        line = collections.OrderedDict()
        line['id'] = rid; line['shard'] = SHARD
        line['seed'] = {'page': seed_by[rid]['page'], 'tier': seed_by[rid]['tier'], 'time_window_raw': seed_by[rid]['time_window_raw']}
        line['before'] = {'status_effective': v.get('status_effective'), 'shard_verdict': o.get('verdict'), 'shard_tier': o.get('tier'), 'shard_status': o.get('status')}
        line['verdict'] = r['verdict']
        line['corrected_claim'] = collections.OrderedDict(event=cc['event'], unit=cc['unit'], place=cc['place'],
                time_window=collections.OrderedDict(text=cc['when'], start=cc.get('start'), end=cc.get('end'), basis=cc['basis'].rstrip(' .') + '.' + window_limits_note(rid, cc.get('start'), cc.get('end'), errs, r.get('limits'))),
                text=cc['text'], tier=cc['tier'], marking=cc.get('marking') or 'tier glyph on every sub-claim that is not documented')
        T_RANK = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2, 'open gap': 3}
        sd_t = seed_by[rid]['tier']; o_t = o.get('tier')
        line['tier_change'] = collections.OrderedDict(seed=sd_t, shard_effective=o_t, corrected=cc['tier'],
            note=('promotion proposed relative to the seed (owner or integrator decision; see delegated-decision block DD-TL03-01)' if T_RANK[cc['tier']] < T_RANK[sd_t] else
                  ('demotion relative to the seed' if T_RANK[cc['tier']] > T_RANK[sd_t] else 'tier unchanged against the seed'))
            + ('; higher than the tier the shard audit had set (' + str(o_t) + '): evidence added in this close-out' if o_t in T_RANK and T_RANK[cc['tier']] < T_RANK[o_t] else ''))
        line['sub_claims'] = subs
        line['citations'] = list(cites.values())
        line['scenarios'] = [collections.OrderedDict(id=sc['id'], value=sc['value'], basis=sc['basis'], tier=sc['tier'], citations=list(sc.get('cites', []))) for sc in r.get('scenarios', [])]
        line['default'] = r.get('default')
        line['remains_unsupported'] = r.get('remains', [])
        line['searched'] = list(r.get('searched', [])) + logged_searches(rid)
        line['recheck_applied'] = r.get('recheck') or 'none needed: every stored quote of this row was found at the stated report and page (OR-RECHECK)'
        line['register_proposed'] = ('tl-03-CO-' + rid) if r.get('register') else None
        line['register_related'] = r.get('related', [])
        out_rows.append((r, line, cites))
    if errs:
        print('ERRORS (%d):' % len(errs))
        for e in errs: print(' -', e)
        sys.exit(1)
    print('rows %d, citations verified verbatim %d' % (len(out_rows), nq))
    if '--libcites' in sys.argv:
        dump = [dict(rid=line_['id'], key=c_['key'], source_id=c_['source_id'], text_offset=c_['text_offset'], text_offset_end=c_['text_offset_end'], archive_identifier=c_.get('archive_identifier'),
                     source_file=c_.get('source_file'), quote=c_['quote']) for r_, line_, cites_ in out_rows for c_ in cites_.values() if c_['source_id'] not in ('OR27', 'COMPUTED') and not c_['source_id'].startswith('NPS')]
        json.dump(dump, open(sys.argv[sys.argv.index('--libcites') + 1], 'w', encoding='utf-8'), indent=0)
        print('library citations dumped:', len(dump)); return
    if '--show' in sys.argv:
        for r_, line_, cites_ in out_rows:
            for k_, c_ in cites_.items():
                print('  %s %-12s %-26s %-13s p.%-9s @%-8s %s' % (line_['id'], k_, c_['source_id'], c_.get('report_id') or '', c_.get('printed_page'), c_.get('text_offset'), ('| ' + (c_.get('page_basis') or '')[:60]) if not c_.get('report_id') else ''))
    if check_only: return
    # ---- corrections file
    cdir = os.path.join(G, 'timeline_corrections'); os.makedirs(cdir, exist_ok=True)
    with open(os.path.join(cdir, SHARD + '.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
        for r, line, cites in out_rows: f.write(json.dumps(line, ensure_ascii=False) + '\n')
    # ---- shard results
    import shard_rows
    new_res = shard_rows.apply(old, out_rows, rc1, rc2)
    with open(res_path, 'w', encoding='utf-8', newline='\n') as f:
        for r in new_res: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    # ---- proposed register
    import register_md
    n_reg = register_md.write(os.path.join(G, 'horde', SHARD, 'proposed-register'), out_rows)
    n_conf = register_md.write_conflicts(os.path.join(G, 'horde', SHARD, 'proposed-register'), out_rows)
    # ---- counts
    cnt = collections.OrderedDict()
    cnt['rows'] = len(out_rows)
    cnt['verdict'] = dict(collections.Counter(l['verdict'] for _, l, _ in out_rows))
    cnt['verdict_of_rows_not_verified_before'] = dict(collections.Counter(l['verdict'] for _, l, _ in out_rows if l['before']['status_effective'] != 'verified_against_or_text'))
    cnt['sub_claims_by_tier'] = dict(collections.Counter(s['tier'] for _, l, _ in out_rows for s in l['sub_claims']))
    cnt['sub_claims_by_support'] = dict(collections.Counter(s['support'] for _, l, _ in out_rows for s in l['sub_claims']))
    cnt['citations'] = sum(len(l['citations']) for _, l, _ in out_rows)
    cnt['citations_by_source'] = dict(collections.Counter(c['source_id'] for _, l, _ in out_rows for c in l['citations']))
    cnt['rows_with_scenarios'] = [l['id'] for _, l, _ in out_rows if l['scenarios']]
    cnt['rows_with_default'] = [l['id'] for _, l, _ in out_rows if l['default']]
    cnt['proposed_register_entries'] = n_reg
    cnt['rows_in_conflicts_file'] = n_conf
    cnt['results_tier'] = dict(collections.Counter(r['tier'] for r in new_res))
    cnt['results_status'] = dict(collections.Counter(r['status'] for r in new_res))
    cnt['rows_by_verdict'] = {v: [l['id'] for _, l, _ in out_rows if l['verdict'] == v] for v in VERDICTS}
    json.dump(cnt, open(os.path.join(HERE, 'counts.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    print(json.dumps(cnt, ensure_ascii=False)[:1500])

if __name__ == '__main__':
    main()
