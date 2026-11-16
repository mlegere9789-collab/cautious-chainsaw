"""helpers for the per-row data files (rows_a.py, rows_b.py, rows_c.py)"""

BLK_NOTE = ('Read on 2026-11-04 on the owner\'s machine by the first shard run (paraphrase only, no verbatim quote kept); '
            'the host is refused from this container (proxy 403 on 2026-11-13 and again on 2026-11-16), so it was NOT re-read and is not re-asserted.')


def C(src, quote, role='supports', note=None, **kw):
    d = dict(src=src, quote=quote, role=role, note=note)
    d.update(kw)
    return d


def S(sc, kind, claim, tier, support, cites=(), note=None, **kw):
    d = dict(sc=sc, kind=kind, claim=claim, tier=tier, support=support, cites=list(cites), note=note)
    d.update(kw)
    return d


def BLK(sc, kind, claim, earlier, url_note=None):
    """a sub-claim that rests only on a page that cannot be read from here"""
    return S(sc, kind, claim, 'open_gap', 'blocked_host', [], note=url_note, earlier_reading=earlier + ' [' + BLK_NOTE + ']')


def HOST(key, url, what, status='blocked_host'):
    return dict(source_key=key, url=url, status=status, what_to_read=what)
