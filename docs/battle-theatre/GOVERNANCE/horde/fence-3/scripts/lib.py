"""Helper layer over tools/bt/or27_find.py and tools/bt/statevol_find.py for the fence-3 close-out.
Run with: python3 -I script.py   (script imports this via sys.path.insert)
"""
import os, re, sys, json
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find as OF            # noqa
import statevol_find as SF        # noqa
from or27_lib import norm_query   # noqa

SV_KEYS = {
    'New York at Gettysburg vol.3 (archive cu31924052145475)': 'NY3',
    'Pennsylvania at Gettysburg vol.1 (archive pennsylvaniaatge02lcpenn)': 'PA1',
    'Pennsylvania at Gettysburg 1914 ed. vol.2 (archive pennsgettysburg02reynrich)': 'PA2',
    'Maine at Gettysburg 1898 (archive maineatgettysbu01commgoog)': 'ME',
    'Battles and Leaders vol.3 (archive battlesleadersof03cent)': 'BL3',
}


def or_verify(quote, parts=(1, 2, 3)):
    """Exact (case-sensitive, whitespace-normalised) check. Returns list of dicts."""
    hits = OF.verify(quote, parts)
    out = []
    for h in hits:
        out.append({'part': h['part'], 'record': h['record'], 'who': h['who'], 'page': h['page'], 'start': h['start'], 'end': h['end']})
    return out


def or_search(rx, parts=(1, 2, 3), ctx=200, flags=re.I, max_hits=60):
    hits = OF.search(rx, parts, ctx, flags, max_hits)
    return hits


def sv_vol(key):
    return SF.Vol(key, SF.index())


def sv_verify(quote, vols):
    """Exact check in the state volumes (folded quotes). Returns list of dicts (never prints)."""
    q0 = SF.fold(norm_query(quote))
    J = lambda m: m.group(1) + m.group(2)
    H = lambda m: m.group(1) + '-' + m.group(2)
    cands = [q0, re.sub(r'(\w)- (\w)', J, q0), re.sub(r'(\w)-(\w)', J, q0), re.sub(r'(\w)- (\w)', H, q0)]
    out = []
    for key in vols:
        V = sv_vol(key)
        p = -1
        q = q0
        for cq in cands:
            p = V.ntext.find(cq)
            if p >= 0:
                q = cq
                break
        while p >= 0 and len(out) < 40:
            o = V.orig(p)
            sec, page, interp, cite = V.cite(o)
            out.append({'vol': key, 'offset': o, 'section': sec['id'] if sec else None, 'section_title': (sec['title_ocr'].split(' | ')[0] if sec else None),
                        'page': page, 'interpolated': bool(interp), 'cite': cite, 'ntext_pos': p})
            p = V.ntext.find(q, p + 1)
    return out


def sv_search(rx, vols, ctx=200, flags=re.I, max_hits=60):
    out = []
    r = re.compile(rx, flags)
    for key in vols:
        V = sv_vol(key)
        for m in r.finditer(V.ntext):
            o = V.orig(m.start())
            sec, page, interp, cite = V.cite(o)
            a, b = max(0, m.start() - ctx), min(len(V.ntext), m.end() + ctx)
            out.append({'vol': key, 'offset': o, 'section': sec['id'] if sec else None, 'section_title': (sec['title_ocr'].split(' | ')[0] if sec else None),
                        'page': page, 'interpolated': bool(interp), 'match': m.group(0), 'context': V.ntext[a:b], 'at': [m.start() - a, m.end() - a]})
            if len(out) >= max_hits:
                return out
    return out


def show_or(h, width=None):
    c = h['context']
    a, b = h['context_match_at']
    print('[%s]  (pt %d off %d-%d)' % (h['cite'], h['part'], h['start'], h['end']))
    print('    ...%s<<%s>>%s...' % (c[:a], c[a:b], c[b:]))


def show_sv(h):
    c = h['context']
    a, b = h['at']
    print('[%s %s "%s" p.%s%s off %d]' % (h['vol'], h['section'], (h['section_title'] or '')[:50], h['page'], ' (interp)' if h['interpolated'] else '', h['offset']))
    print('    ...%s<<%s>>%s...' % (c[:a], c[a:b], c[b:]))


def raw_or(part):
    return OF.get_part(part).text


def or_context(part, start, end, before=500, after=500):
    t = raw_or(part)
    a = max(0, start - before)
    b = min(len(t), end + after)
    return ' '.join(t[a:start].split()) + ' <<' + ' '.join(t[start:end].split()) + '>> ' + ' '.join(t[end:b].split())


def sv_raw(key):
    return sv_vol(key).text


def sv_context(key, off, length, before=500, after=500):
    t = sv_raw(key)
    a = max(0, off - before)
    b = min(len(t), off + length + after)
    return ' '.join(t[a:off].split()) + ' <<' + ' '.join(t[off:off + length].split()) + '>> ' + ' '.join(t[off + length:b].split())


def or_record(part, off):
    P = OF.get_part(part)
    r = P.record_at(off)
    return r


def or_pages_for(part, off):
    P = OF.get_part(part)
    return P.pm.page_at(off)
