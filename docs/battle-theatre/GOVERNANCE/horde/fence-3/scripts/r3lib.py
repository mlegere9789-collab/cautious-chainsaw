"""Round-3 helpers for shard fence-3 (2026-11-16): citation builders for the newly local texts, on top of r2lib.
Every quote is cut from the raw local text between two anchors (so it cannot be typed wrong) and is re-checked afterwards by validate_r2.py
(span cut by offset from the raw file, compared with the quote, sha256 of the file)."""
import os, sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
sys.path.insert(0, '/home/user/cautious-chainsaw/tools/bt')
import r2lib  # noqa
from r2lib import P, OR_span, SV_span, LIB_span, WEB_span, ROOT, _slice, _WEBDOCS, corpus, cite  # noqa
from or27_lib import norm_query  # noqa

RUN = 'run 2026-11-16, round 3'

NPS_TITLE = {
    'NPS-CLR-CEMETERY': 'NPS Cultural Landscape Report: Gettysburg National Cemetery (2017)',
    'NPS-COMMON-PRIDE-1': 'NPS, K. R. Georg, "A Common Pride and Fame" part I (1981)',
    'NPS-COMMON-PRIDE-2': 'NPS, K. R. Georg, "A Common Pride and Fame" part II (1981)',
    'NPS-CLR-ROT-V1': 'NPS Cultural Landscape Report, Record of Treatment vol. I',
    'NPS-CLR-ROT-V2': 'NPS Cultural Landscape Report, Record of Treatment vol. II',
    'NPS-CLI-ERR': 'NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024)',
    'NPS-HSR-LEISTER-BARN': 'NPS Historic Structure Report: Leister Barn (1985), historical overview',
    'NPS-BOUNDARY-1988': 'NPS, Boundary Study: Gettysburg National Military Park, Draft Report to Congress and Environmental Assessment (Mid-Atlantic Regional Office, August 1988)',
}


def _fix(c):
    c['matched'] = (c.get('matched') or '').replace('run 2026-11-14, round 2', RUN)
    return c


def NPSX(doc, a, b=None, nth=0, page=None, note=None, raw=False, maxlen=900, title=None, pick=None, layout=False):
    """A quote from a local NPS text (tmp/library/web/nps/<doc>/<doc>.txt or the content-stream-order variant .raw.txt).
    pick: index of the occurrence to cite when the whole passage occurs more than once in the file (the first is cited by default for duplicates)."""
    path = 'tmp/library/web/nps/%s/%s%s' % (doc, doc, '.raw.txt' if raw else ('.layout.txt' if layout else '.txt'))
    sid = doc + ('.raw' if raw else ('.layout' if layout else ''))
    src = (title or NPS_TITLE[doc]) + (', content-stream-order text variant' if raw else (', layout text variant (lines in reading order, letter-spaced typescript)' if layout else ''))
    if pick is None:
        return _fix(WEB_span(path, a, b, nth=nth, source_id=sid, source=src, page=page, note=note, maxlen=maxlen, kind='nps'))
    return _fix(WEB_pick(path, a, b, nth=nth, source_id=sid, source=src, page=page, note=note, maxlen=maxlen, kind='nps', pick=pick))


def WEB_pick(path, a, b=None, nth=0, source_id=None, source=None, page=None, note=None, maxlen=900, kind='web', extra=None, pick=0):
    """Like WEB_span, but the quote may occur more than once in the file (a page that the text layer holds twice): occurrence number `pick` is cited."""
    full = ROOT + '/' + path if not path.startswith('/') else path
    if full not in _WEBDOCS:
        _WEBDOCS[full] = corpus.Doc(source_id or os.path.basename(full), full, kind)
    d = _WEBDOCS[full]
    q = _slice(d.n, corpus.fold(norm_query(a)), corpus.fold(norm_query(b)) if b else None, nth, maxlen)
    qq = corpus.fold(norm_query(q))
    pos = []
    p = d.n.find(qq)
    while p >= 0:
        pos.append(p)
        p = d.n.find(qq, p + 1)
    if len(pos) <= pick:
        raise SystemExit('WEB_pick: occurrence %d of %r not found (%d)' % (pick, q[:80], len(pos)))
    p = pos[pick]
    o0 = d.raw_off(p)
    o1 = d.raw_off(p + len(qq) - 1) + 1
    out = {'source_id': source_id, 'source': source or source_id, 'printed_page': page, 'quote': q, 'offset_start': o0, 'offset_end': o1,
           'offset_basis': 'character offset in the raw text file (utf-8, newline untouched)', 'local_path': os.path.relpath(full, ROOT),
           'text_sha256': cite.sha(full), 'matched': 'exact after whitespace normalisation (%s)' % RUN, 'note': note,
           'page_basis': 'printed page not recoverable from the text' if page is None else 'set by hand'}
    if kind == 'nps' and d.pages:
        out['pdf_page'] = d.pdf_page(o0)
        out['page_basis'] = 'pdf_page = page index of the file as served (=== PAGE n === marker); printed page given only if stated'
    if len(pos) > 1:
        out['occurrence'] = 'the passage occurs %d times in the text file (the text layer repeats the page); occurrence %d (from 0) is cited' % (len(pos), pick)
    if extra:
        out.update(extra)
    return out


BOUNDARY_URL = 'https://www.npshistory.com/publications/gett/boundary-study-1988.pdf'

LET_PATH = 'tmp/fence-3/r3/txt/LETTERMAN-1866.txt'
LET_SRC = 'Jonathan Letterman, Medical Recollections of the Army of the Potomac (New York: D. Appleton, 1866), chapter on the Gettysburg campaign (archive.org item medicalrecollect00lettuoft; text layer of the local PDF tmp/library/medical/LETTERMAN-1866-PDF/medicalrecollect00lettuoft.pdf, extracted with pdftotext -layout into tmp/fence-3/r3/txt/LETTERMAN-1866.txt)'
LET_DERIV = 'Derived text: pdftotext -layout of the local PDF (sha256 604fbc2d6b358c0eff7dd7c43a442bb57c27578feb982b4486d307597235d5ad), run 2026-11-16; offsets refer to the derived text file.'


def LET(a, b=None, page=None, note=None, nth=0):
    c = WEB_span(LET_PATH, a, b, nth=nth, source_id='LETTERMAN-1866', source=LET_SRC, page=page, note=((note + ' ') if note else '') + LET_DERIV, kind='web')
    c['matched'] = 'exact after whitespace normalisation (%s)' % RUN
    c['offset_basis'] = 'character offset in the derived text file (pdftotext -layout of the local PDF; utf-8, newline untouched)'
    return c


NPS_WEB_CONFED = {
    'path': 'tmp/library/web/retry/F-161/confederates-gettysburg.html.txt',
    'url': 'https://www.nps.gov/articles/000/confederates-gettysburg.htm',
    'title': 'NPS web page: Confederate Commanders at Gettysburg (Gettysburg National Military Park; page as served 2026-11-13 21:58 UTC, saved by the web-evidence workstream as tmp/library/web/retry/F-161)',
}


def NPSWEB_CONFED(a, b=None, note=None):
    d = NPS_WEB_CONFED
    return _fix(WEB_span(d['path'], a, b, source_id='NPS-WEB-CONFED-COMMANDERS', source=d['title'], page=None, note=note,
                         extra={'url': d['url'], 'fetched': '2026-11-13', 'page_basis': 'web page, no pagination'}))


class P3(P):
    """Patcher for round 3: notes go to d['round3'], lookups carry round 3."""

    def __init__(self, d):
        super().__init__(d)
        self.d.setdefault('round3', [])

    def rev(self, text):
        self.d['round3'].append(text)

    def lookup(self, query, corpora, result, status='done'):
        self.d['lookups'].append({'query': query, 'corpora': corpora, 'result': result, 'status': status, 'round': 3})

    def image_reading(self, cid, ocr_text, printed_text, digit_read, basis, files):
        self.d['citations'][cid]['image_reading'] = {'ocr_text': ocr_text, 'printed_text': printed_text, 'digit_read': digit_read, 'basis': basis,
                                                      'files': files, 'read_on': '2026-11-16'}
