"""rows.json (+headings) -> records with regiment n, service block, company, section. usage: assemble.py <vol>
Output: derived/<vol>.records.json  (list of dict)  and derived/<vol>.blocks.json (summary per (n, block))"""
import sys, os, json, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

LETTERS = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'   # Bates companies skip J
CONFUSE = {'C': 'CGO0Q', 'G': 'CGO0QR', 'O': 'CGO0Q', 'B': 'BR8E', 'E': 'EFB', 'F': 'FEP', 'H': 'HNM', 'K': 'KIS', 'I': 'IJL1', 'L': 'LI1', 'D': 'DO0', 'A': 'AR', 'M': 'MNH', 'N': 'NMH', 'P': 'PF'}


def next_letter(cur):
    if cur is None:
        return 'A'
    if cur in LETTERS:
        i = LETTERS.index(cur)
        return LETTERS[i + 1] if i + 1 < len(LETTERS) else None
    return None


def main(vol):
    rows = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.rows.json')))
    pinfo = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.pageinfo.json')))
    rows = [r for r in rows if r['kind'] in ('row', 'heading')]
    rows.sort(key=lambda r: (r['page'], r.get('y', 0)))
    recs = []
    # regiment per page: detections from running heads mapped into the volume's number range, LIS-filtered,
    # then assigned per roll segment (maximal runs of roll pages), gaps filled by sequence
    RANGE = {'01': (1, 50), '02': (51, 84), '03': (85, 118), '04': (119, 179), '00': (180, 215)}
    lo, hi = RANGE[vol]
    dets = []
    for k, v in sorted(pinfo.items(), key=lambda kv: int(kv[0])):
        n0 = v.get('ndet')
        if not n0:
            continue
        cands = [m for m in (n0, n0 + 100, n0 + 200) if lo <= m <= hi]
        if len(cands) == 1:
            dets.append((int(k), cands[0]))
        elif len(cands) > 1:
            dets.append((int(k), max(cands) if vol != '01' else min(cands)))
    # longest non-decreasing subsequence
    import bisect
    tails, idxs, prevs = [], [], []
    for i, (p, n0) in enumerate(dets):
        j = bisect.bisect_right(tails, n0)
        if j == len(tails):
            tails.append(n0); idxs.append(i)
        else:
            tails[j] = n0; idxs[j] = i
        prevs.append(idxs[j - 1] if j > 0 else -1)
    lis = []
    i = idxs[-1] if idxs else -1
    while i >= 0:
        lis.append(dets[i]); i = prevs[i]
    clean = sorted(lis)
    if vol == '01':
        clean = [(p, n0) for (p, n0) in sorted((int(k), v['ndet']) for k, v in pinfo.items() if v.get('ndet'))]
        # vol 1 restarts its numbering (three months then three years): keep the earlier simple outlier filter
        c2 = []
        for i, (p, n0) in enumerate(clean):
            prv = clean[i - 1][1] if i > 0 else None
            nx = clean[i + 1][1] if i + 1 < len(clean) else None
            if prv is not None and nx is not None and prv == nx and n0 != prv:
                continue
            c2.append((p, n0))
        clean = c2
    pages_sorted = sorted(int(k) for k in pinfo)
    isroll = {p: (pinfo[str(p)]['dx'] is not None and not pinfo[str(p)].get('narrative')) for p in pages_sorted}
    page_n = {}
    if True:
        j = -1
        for p in pages_sorted:
            while j + 1 < len(clean) and clean[j + 1][0] <= p:
                j += 1
            page_n[p] = clean[j][1] if j >= 0 else None
    else:
        segs = []
        cur = None
        for p in pages_sorted:
            if isroll[p]:
                if cur and p - cur[1] <= 1:
                    cur[1] = p
                else:
                    cur = [p, p, None]
                    segs.append(cur)
        for sg in segs:
            ds = [n0 for (p, n0) in clean if sg[0] - 14 <= p <= sg[1]]
            if ds:
                sg[2] = collections.Counter(ds).most_common(1)[0][0]
        # fill unresolved by sequence
        for i, sg in enumerate(segs):
            if sg[2] is None:
                prv = next((segs[k][2] for k in range(i - 1, -1, -1) if segs[k][2] is not None), None)
                nxt = next((segs[k][2] for k in range(i + 1, len(segs)) if segs[k][2] is not None), None)
                if prv is not None and nxt is not None and nxt - prv == 2:
                    sg[2] = prv + 1
                    sg.append('inferred-by-sequence')
        for sg in segs:
            for p in range(sg[0], sg[1] + 1):
                page_n[p] = sg[2]
        # non-roll pages keep the previous segment n (for headings), irrelevant for rows
        last = None
        for p in pages_sorted:
            if p in page_n and page_n[p] is not None:
                last = page_n[p]
            elif p not in page_n:
                page_n[p] = last
    def det_allows(page, cur):
        nd = next((cn for (cp, cn) in clean if cp >= page and cp - page <= 16), None)
        return nd is None or (cur is not None and nd > cur)

    st = dict(n=None, block=0, company=None, section=None, letter=None, seen_company=False, svc=None)
    blocks = collections.OrderedDict()
    for ri, r in enumerate(rows):
        k = r['kind']
        if k in ('colhead', 'orphan'):
            continue
        n = page_n.get(r['page'])
        if st.get('override'):
            if n != st.get('override_from'):
                st['override'] = None
            else:
                n = st['override']
        if n != st['n']:
            st.update(n=n, company=None, section=None, letter=None, seen_company=False, block_rows=0)
            st['block'] = 0
        if k == 'heading':
            txt = re.sub(r'\s+', ' ', r['text']).strip(' .,')
            flags = ''
            if r['sub'] == 'recruited':
                last = st.get('last_company_heading')
                if st['section'] == 'COMPANY' and not (last and last[0] == r['page'] and 0 <= r['y'] - last[1] < 300) and st.get('rows_in_co', 0) >= 3:
                    nl = next_letter(st['letter'])
                    if nl:
                        st.update(letter=nl, company=nl, rows_in_co=0, cflag='company-inferred-from-recruited-line')
                continue
            if r['sub'] == 'other':
                if re.search(r'field', txt, re.I):
                    if st['seen_company'] and st.get('block_rows', 0) >= 40 and det_allows(r['page'], st['n']):
                        st['block'] += 1
                        if vol == '01':
                            nxt = [cn for (cp, cn) in clean if cp > r['page'] and cn != st['n']]
                            st['override'] = nxt[0] if nxt else None
                        else:
                            st['override'] = (st['n'] + 1) if st['n'] else None
                        st['override_from'] = page_n.get(r['page'])
                        if st['override']:
                            st['n'] = st['override']
                            st['block'] = 0
                    st.update(company='FS', section='FS', letter=None, seen_company=False, block_rows=0)
                elif re.search(r'unassign', txt, re.I):
                    st.update(company='UNASSIGNED', section='UNASSIGNED')
                elif re.search(r'band|music', txt, re.I):
                    st.update(company='BAND', section='BAND')
                else:
                    pass
            else:
                m = re.match(r'^\S+\s+([A-Za-z0-9]{1,2})\W*$', txt)
                L = (m.group(1) if m else '?').upper().strip('.')
                exp = next_letter(st['letter'])
                if L == exp:
                    st['letter'] = L
                elif exp and L in CONFUSE.get(exp, '') and L != 'I':
                    st['letter'] = exp
                    flags = 'company-letter-ocr:%s' % L
                elif L in LETTERS and st['letter'] and LETTERS.index(L) > LETTERS.index(st['letter']):
                    st['letter'] = L   # a heading was missed in between
                    flags = 'company-heading-skipped'
                elif L in LETTERS and st['letter'] and LETTERS.index(L) <= LETTERS.index(st['letter']):
                    # sequence restarts: new service block
                    st['block'] += 1
                    st['letter'] = L
                    flags = 'new-block-company-restart'
                    if L == 'A' and st.get('block_rows', 0) >= 40 and st['n'] and det_allows(r['page'], st['n']):
                        st['override'] = (st['n'] + 1) if vol != '01' else None
                        st['override_from'] = page_n.get(r['page'])
                        if st['override']:
                            st['n'] = st['override']
                            st['block'] = 0
                            st['block_rows'] = 0
                            flags = 'new-regiment-by-company-A-restart'
                elif exp:
                    st['letter'] = exp
                    flags = 'company-letter-guess:%s' % L
                else:
                    st['letter'] = L
                st.update(company=st['letter'], section='COMPANY', seen_company=True, cflag=flags, rows_in_co=0, last_company_heading=(r['page'], r['y']))
            continue
        # row
        if st['section'] == 'COMPANY' and st.get('rows_in_co', 0) >= 45 and re.match(r'^\W*capt', r['rank'], re.I) and st['letter']:
            nxt = [x for x in rows[ri + 1: ri + 8] if x['kind'] == 'row'][:6]
            offs = sum(1 for x in nxt if re.match(r'^\W*(1st|2d|2nd|lieut|lt|1st\s*l)', x['rank'], re.I))
            if offs >= 2 and next_letter(st['letter']):
                nl = next_letter(st['letter'])
                st.update(letter=nl, company=nl, rows_in_co=0, cflag='company-inferred-from-officer-run')
        pi = pinfo.get(str(r['page']), {})
        r['n'] = n
        svc = pi.get('svc')
        if svc and svc != 'service?':
            svc = re.sub(r'^(\w+?)(years?|months?)\w*$', lambda m: m.group(1) + m.group(2).rstrip('s') + 's', svc)
            if st['svc'] and svc != st['svc']:
                st.update(company=None, section=None, letter=None, seen_company=False, rows_in_co=0)
            st['svc'] = svc
        if st['section'] == 'COMPANY':
            st['rows_in_co'] = st.get('rows_in_co', 0) + 1
        rec = dict(n=n, block=st['block'], company=st['company'] or '?', section=st['section'] or '?', page=r['page'], y=r['y'],
                   name=r['name'], rank=r['rank'], date=r['date'], rem=r['rem'], svc=st['svc'], nodate=r.get('nodate', False), cflag=st.get('cflag', '') if st['section'] == 'COMPANY' else '')
        recs.append(rec)
        st['block_rows'] = st.get('block_rows', 0) + 1
        key = (n, st['svc'], st['block'])
        b = blocks.setdefault(key, dict(n=n, svc_key=st['svc'], block=st['block'], rows=0, pages=[r['page'], r['page']], svc=collections.Counter(), companies=[]))
        b['rows'] += 1
        b['pages'][1] = r['page']
        if st['svc']:
            b['svc'][st['svc']] += 1
        if rec['company'] not in b['companies']:
            b['companies'].append(rec['company'])
    json.dump(recs, open(os.path.join(C.CACHE, 'derived', vol + '.records.json'), 'w'), separators=(',', ':'))
    bl = [dict(v, svc=dict(v['svc'])) for v in blocks.values()]
    json.dump(bl, open(os.path.join(C.CACHE, 'derived', vol + '.blocks.json'), 'w'), indent=0)
    print(vol, len(recs), 'records', len(bl), 'blocks')


if __name__ == '__main__':
    main(sys.argv[1])
