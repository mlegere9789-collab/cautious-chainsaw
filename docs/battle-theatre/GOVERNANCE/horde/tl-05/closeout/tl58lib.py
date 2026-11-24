"""Close-out library for shards tl-05..tl-08 (timeline rows T2-006 .. T2-235, seed lines 231-460).

Every citation is an OR Ser.I vol.27 passage that is re-matched verbatim (whitespace-normalised, case-sensitive, running heads
removed, line-break hyphens joined) in the local text tmp/library/or27/*.txt by tools/bt/or27_find.py, inside the report the row
names, and then re-read with the SAME check that tools/bt/merge_timeline_verification.py applies (window of the stored offsets).
A quote that is not found, is found twice in the report, or fails the merge check stops the build.
Offsets are character offsets into the raw file decoded as UTF-8 with newline='' (tools/bt/or27_lib.py convention).
"""
import os, re, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find as F
from or27_lib import raw_path, PARTS
import merge_timeline_verification as M

G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
VERDICTS = ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap')
SUPPORT = ('supported', 'contradicted', 'unsupported', 'conflict', 'computed', 'procedural')

INDEX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json'), encoding='utf-8'))['records']}
PART_WORK = {1: 'Official Records of the Union and Confederate Armies, Ser. I, vol. 27, part 1',
             2: 'Official Records of the Union and Confederate Armies, Ser. I, vol. 27, part 2',
             3: 'Official Records of the Union and Confederate Armies, Ser. I, vol. 27, part 3'}
_sha = {}

ROWS = collections.OrderedDict()


def _filesha(part):
    if part not in _sha:
        import hashlib
        _sha[part] = hashlib.sha256(open(raw_path(part), 'rb').read()).hexdigest()
    return _sha[part]


def SUB(claim, tier, support, cites=(), note=None):
    assert tier in TIERS, tier
    assert support in SUPPORT, support
    return (claim, tier, support, list(cites), note)


def SCN(id, value, basis, tier, cites=()):
    assert tier in TIERS, tier
    return dict(id=id, value=value, basis=basis, tier=tier, cites=list(cites))


def SR(pattern, near=None, win=300, what=None, parts=(1, 2, 3)):
    """A search that is executed at build time over the OR text; the real hit count is stored."""
    return dict(pattern=pattern, near=near, win=win, what=what, parts=list(parts))


def ROW(id, verdict, text, subs, cites=None, scenarios=(), remains=(), searched=(), register=None, related=(), tier=None,
        shard_note=None, recheck=None):
    assert id not in ROWS, id
    assert verdict in VERDICTS, (id, verdict)
    ROWS[id] = dict(id=id, verdict=verdict, text=text, subs=list(subs), cites=dict(cites or {}), scenarios=list(scenarios),
                    remains=list(remains), searched=list(searched), register=register, related=list(related), tier=tier,
                    shard_note=shard_note, recheck=recheck)


def resolve(key, rid, quote, note=None):
    """Find the quote once inside report rid; return a citation record (keys as in the tl-01..04 corrections)."""
    part = int(rid.split('-')[1])
    hits = [h for h in F.verify(quote, parts=(part,)) if h['record'] == rid]
    if not hits:
        allh = F.verify(quote)
        where = ['%s p.%s' % (h['record'], h['page']) for h in allh][:5]
        raise SystemExit('QUOTE NOT FOUND in %s: %r (elsewhere: %s)' % (rid, quote[:90], where))
    if len(hits) > 1:
        raise SystemExit('QUOTE NOT UNIQUE in %s (%d hits): %r' % (rid, len(hits), quote[:90]))
    h = hits[0]
    rec = INDEX[rid]
    page = h['page']
    c = {
        'key': key, 'source_id': 'OR27', 'work': PART_WORK[part], 'part': part, 'report_id': rid,
        'author': ((rec.get('rank') or '') + ' ' + (rec.get('author') or '')).strip(),
        'printed_page': page.replace('~', '') if not page.startswith('~') else page,
        'page_basis': 'printed page of the running-head model of the OCR text (tools/bt/or27_pages.py via tools/bt/or27_find.py); a leading ~ marks a page interpolated inside a run of lost running heads and is given with its range',
        'quote': quote, 'text_offset': h['start'], 'text_offset_end': h['end'],
        'source_file': 'tmp/library/or27/%s_djvu.txt' % PARTS[part], 'sha256': _filesha(part),
        'source_class': 'official report, order or dispatch of 1863 (printed 1889)',
        'report_heading': rec.get('toc_text'),
        'report_heading_basis': 'contents entry of the volume as read by OCR (tools/bt/or27_index.py); names the writer and the unit he commanded; OCR errors are not corrected',
    }
    if note:
        c['note'] = note
    ok, why = M.check_quote(c, {}, {'hits': 0, 'misses': 0})
    if not ok:
        raise SystemExit('MERGE CHECK FAILED for %s %s: %s (quote %r)' % (key, rid, why, quote[:80]))
    return c


def run_search(s):
    rx = re.compile(s['pattern'], re.I)
    near = re.compile(s['near'], re.I) if s.get('near') else None
    hits = 0
    by = {}
    sample = []
    for p in s['parts']:
        P = F.get_part(p)
        for m in rx.finditer(P.ntext):
            if m.end() == m.start():
                continue
            if near:
                a = max(0, m.start() - s['win'])
                if not near.search(P.ntext[a:m.end() + s['win']]):
                    continue
            hits += 1
            by['OR27-pt%d' % p] = by.get('OR27-pt%d' % p, 0) + 1
            if len(sample) < 2:
                os_, oe = P.orig_span(m.start(), m.end())
                c = P.cite(os_, oe)
                sample.append({'source': 'OR27-pt%d' % p, 'report': c['record'], 'page': c['page'], 'offset': os_,
                               'context': P.ntext[max(0, m.start() - 90):m.end() + 90]})
    return {'scope': 'OR27', 'pattern': s['pattern'], 'near': s.get('near'), 'window_chars': s['win'], 'what': s.get('what'),
            'hits': hits, 'status': 'run', 'hits_by_source': by, 'sample': sample}
