"""Round-2 close-out layer for shard fence-3.

Baseline = tmp/fence-3/backup-2026-11-14/fence-3.jsonl (the first close-out of 2026-11-13, never edited).
A patch function per row edits the baseline row through class P; every new or widened citation is cut from the raw local text by an
anchor pair (start text, end text), so the quote is always the exact normalised text between the anchors and can never be typed wrong.
Every citation is then re-checked by the independent validator (validate_r2.py) against the raw file by offset.
Run with: python3 -I script.py   (script inserts this directory into sys.path)
"""
import os, re, sys, json, copy, bisect, hashlib
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/tmp/fence-3/scripts')
sys.path.insert(0, ROOT + '/tools/bt')
import lib, corpus, cite  # noqa
from or27_lib import norm_query  # noqa

BASE = ROOT + '/tmp/fence-3/backup-2026-11-14/fence-3.jsonl'
OR_IDX = cite.OR_IDX


def _slice(n, a, b=None, nth=0, maxlen=900, lastb=False):
    """Exact slice of normalised text n from the nth occurrence of anchor a to the end of the first occurrence of anchor b after it."""
    p = -1
    for _ in range(nth + 1):
        p = n.find(a, p + 1)
        if p < 0:
            raise SystemExit('anchor not found: %r' % a[:80])
    if b is None:
        e = p + len(a)
    else:
        q = n.find(b, p + len(a) if b != a else p + 1)
        if q < 0:
            raise SystemExit('end anchor not found after start: %r ... %r' % (a[:60], b[:60]))
        e = q + len(b)
    if e - p > maxlen:
        raise SystemExit('span too long (%d): %r' % (e - p, a[:60]))
    return n[p:e]


def OR_span(part, rec, a, b=None, nth=0, page=None, note=None, maxlen=900):
    P = lib.OF.get_part(part)
    r = OR_IDX[rec]
    # nview positions of the record: map raw offsets to nview indices
    nm = P.nmap
    lo = bisect.bisect_left(nm, r['start_offset'])
    hi = bisect.bisect_right(nm, r['end_offset'])
    n = P.ntext[lo:hi]
    q = _slice(n, norm_query(a), norm_query(b) if b else None, nth, maxlen)
    return cite.OR(part, q, rec=rec, page=page, note=note)


def SV_span(vol, a, b=None, nth=0, page=None, note=None, maxlen=900, section=None):
    V = lib.sv_vol(vol)
    n = V.ntext
    if section:
        # restrict to one section of the volume (id such as 'NY1-S073')
        sec = [s for s in V.secs if s['id'] == section]
        if not sec:
            raise SystemExit('section not found: ' + section)
        lo = bisect.bisect_left(V.nmap, sec[0]['start'])
        hi = bisect.bisect_right(V.nmap, sec[0]['end'])
        n = n[lo:hi]
    q = _slice(n, lib.SF.fold(norm_query(a)), lib.SF.fold(norm_query(b)) if b else None, nth, maxlen)
    return cite.SV(vol, q, page=page, note=note)


def LIB_span(doc, a, b=None, nth=0, page=None, note=None, maxlen=900, title=None, issue=None):
    d = cite.C().docs[doc]
    q = _slice(d.n, corpus.fold(norm_query(a)), corpus.fold(norm_query(b)) if b else None, nth, maxlen)
    return cite.LIB(doc, q, page=page, note=note, title=title, issue=issue)


_WEBDOCS = {}


def WEB_span(path, a, b=None, nth=0, source_id=None, source=None, page=None, note=None, maxlen=900, kind='web', extra=None):
    """Generic local text file (retry pages, newspaper OCR pages)."""
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
    if len(pos) != 1:
        raise SystemExit('WEB quote not unique/found (%d): %r' % (len(pos), q[:80]))
    p = pos[0]
    o0 = d.raw_off(p)
    o1 = d.raw_off(p + len(qq) - 1) + 1
    out = {'source_id': source_id, 'source': source or source_id, 'printed_page': page, 'quote': q, 'offset_start': o0, 'offset_end': o1,
           'offset_basis': 'character offset in the raw text file (utf-8, newline untouched)', 'local_path': os.path.relpath(full, ROOT),
           'text_sha256': cite.sha(full), 'matched': 'exact after whitespace normalisation (run 2026-11-14, round 2)', 'note': note,
           'page_basis': 'printed page not recoverable from the text' if page is None else 'set by hand'}
    if kind == 'nps' and d.pages:
        out['pdf_page'] = d.pdf_page(o0)
    if extra:
        out.update(extra)
    return out


class P:
    """Patcher for one baseline row."""

    def __init__(self, d):
        self.d = copy.deepcopy(d)
        self.sid = self.d['schedule_id']
        self._n = 0
        self.d.setdefault('round2', [])

    # citations
    def cite(self, c):
        self._n += 1
        cid = 'n%d' % self._n
        c = dict(c)
        c['cid'] = cid
        self.d['citations'][cid] = c
        return cid

    def widen(self, cid, c):
        """Replace the citation text of an existing citation id by a longer verbatim quote (new offsets), keep its id and note unless the new dict carries one."""
        old = self.d['citations'][cid]
        new = dict(c)
        if not new.get('note') and old.get('note'):
            new['note'] = old['note']
        new['cid'] = cid
        self.d['citations'][cid] = new
        return cid

    # sub-claims
    def sc(self, n):
        for s in self.d['subclaims']:
            if s['sc'] == '%s.%d' % (self.sid, n):
                return s
        raise SystemExit('no sub-claim %s.%d' % (self.sid, n))

    def edit(self, n, **kw):
        s = self.sc(n)
        add = kw.pop('add_cites', None)
        for k, v in kw.items():
            s[k] = v
        if add:
            for c in add:
                if c not in s['cites']:
                    s['cites'].append(c)
        return s

    def add(self, kind, claim, tier, cites, support='supported', why=None, **extra):
        n = len(self.d['subclaims']) + 1
        s = {'sc': '%s.%d' % (self.sid, n), 'kind': kind, 'claim': claim, 'tier': tier, 'support': support, 'cites': list(cites)}
        if why:
            s['why'] = why
        s.update(extra)
        self.d['subclaims'].append(s)
        return n

    def unsupported_set(self, items):
        self.d['unsupported'] = list(items)

    def lookup(self, query, corpora, result, status='done'):
        self.d['lookups'].append({'query': query, 'corpora': corpora, 'result': result, 'status': status, 'round': 2})

    def amend_lookup(self, i, result, status=None):
        """Mark a round-1 lookup as superseded by a round-2 finding: the old result is kept in round1_result."""
        k = self.d['lookups'][i]
        k['round1_result'] = k['result']
        k['result'] = result
        if status:
            k['status'] = status
        k['amended_round'] = 2

    def verdict(self, verdict=None, status=None, corrected_claim=None):
        if verdict:
            self.d['verdict'] = verdict
        if status:
            self.d['status'] = status
        if corrected_claim:
            self.d['corrected_claim'] = corrected_claim

    def product(self, items):
        self.d['product_consequence'] = list(items)

    def blocked(self, items):
        self.d['blocked_host'] = list(items)

    def register(self, items):
        self.d['register'] = list(items)

    def rev(self, text):
        self.d['round2'].append(text)

    # finish
    def finish(self):
        used = []
        for s in self.d['subclaims']:
            for c in s['cites']:
                if c not in used:
                    used.append(c)
        mapping = {c: 'c%d' % (i + 1) for i, c in enumerate(used)}
        newc = {}
        for c in used:
            if c not in self.d['citations']:
                raise SystemExit('dangling citation %s in %s' % (c, self.sid))
            cc = dict(self.d['citations'][c])
            cc['cid'] = mapping[c]
            newc[mapping[c]] = cc
        for s in self.d['subclaims']:
            s['cites'] = [mapping[x] for x in s['cites']]
        self.d['citations'] = newc
        return self.d


def load_base():
    rows = {}
    for l in open(BASE, encoding='utf-8'):
        d = json.loads(l)
        rows[d['schedule_id']] = d
    return rows
