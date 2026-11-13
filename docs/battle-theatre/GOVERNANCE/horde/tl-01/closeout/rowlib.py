"""Small constructors for the tl-01 close-out row data (see build.py)."""
IMG_C = 'reading confirmed on the page image of page 2 (archive.org PDF of the issue, closeout/acquired_tl01.json)'
IMG_S3 = 'reading confirmed on the page image of page 3 (archive.org PDF of the issue, closeout/acquired_tl01.json)'
IMG_S2 = 'reading confirmed on the page image of page 2 (archive.org PDF of the issue, closeout/acquired_tl01.json)'
LOG = 'every search is logged with pattern and hit counts in horde/tl-01/closeout/search_log.jsonl'
S_OR = 'Official Records vol.27 parts 1-3, OCR text, regex search (tools/bt/or27_find.py)'
S_LIB = 'the 108 local library texts (99 of library/acquired_2.json and 9 earlier state volumes), regex search on whitespace-normalised text'

def OR(quote, report=None, page=None, **kw):
    d = dict(src='OR27', quote=quote, report=report, page=page); d.update(kw); return d

def L(sid, quote, page=None, **kw):
    d = dict(src=sid, quote=quote, page=page); d.update(kw); return d

def CMP(quote, reading, **kw):
    return L('GBG-COMPILER-1863-06-29', quote, reading=reading, image_check=IMG_C, **kw)

def claim(event, unit, place, when, basis, text, tier, start=None, end=None, marking=None):
    return dict(event=event, unit=unit, place=place, when=when, basis=basis, text=text, tier=tier, start=start, end=end, marking=marking)

def sc(id, value, basis, tier, cites=()):
    return dict(id=id, value=value, basis=basis, tier=tier, cites=list(cites))

def reg(title, why, recon, tier, competing='-', impact='-', ask='-', subst='-', rids='R11'):
    return dict(title=title, why=why, recon=recon, tier=tier, competing=competing, impact=impact, ask=ask, subst=subst, rids=rids)
