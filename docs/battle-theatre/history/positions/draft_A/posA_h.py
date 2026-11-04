def c(u, k, act, r, q=None, w=None, t=None, d='1863-07-01', pp=None, gz=None, rd=None, ap=False, tier='documented', cf=(), note='', ocr=False, lbl=None, why='', anchor=None, cr=False):
    x = dict(u=u, k=k, act=act, r=r, q=q, w=w, t=t, d=d, pp=pp, gz=gz, rd=rd, ap=ap, tier=tier, cf=list(cf), note=note, ocr=ocr, why=why, anchor=anchor)
    if lbl: x['lbl'] = lbl
    if cr: x['close_reading'] = True; x['csv'] = True
    if tier != 'documented': x['csv'] = False
    return x
def gap(u, act, tried, note='', k='position', d='1863-07-01'):
    return dict(u=u, k=k, act=act, r='R006', q=None, w=None, t=None, d=d, pp=None, gz=None, rd=None, ap=False, tier='open gap', cf=[], note='OPEN GAP. Searches tried: ' + tried + ('. ' + note if note else ''), ocr=False, why='', anchor=None, csv=False)
