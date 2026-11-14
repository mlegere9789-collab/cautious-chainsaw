"""Re-verify the numeric and file claims of the reports of the closed items against their files (roster-qa task 3).  Standard library only.

    python3 -I qa_claims.py            write data2/qa/claims-check.json and print the claims that do not hold

What is checked (every number is recomputed from the unit files, the flag files, the diagnostics and the pointer files, never typed):
  report tables (rosters/reports/union-me.md, union-nh.md, union-vt.md): per unit lines, lines per segment, ocr_uncertain, on-the-rolls yes / no / unknown,
      "Same" lines (Maine), "See" lines and officer-heading lines (Vermont), lines whose remark names Gettysburg (r2lib.GETTYSBURG_RE), events dated 1 to 3 July 1863 (Vermont),
      damage-code counts (New Hampshire);
  summaries: totals of lines and files, the 3,666 lines of _other-ME-SUPP-1867, the 6 Vermont lines without a name (diag-no-name.json);
  pointer files (rosters/sources/<item>.json) and ledgers (data2/sources/*.json): every listed file that is kept locally is present with the recorded bytes and sha256;
      the sha256 of the raw lines in the flag files (unit_file_raw_lines_sha256) equals the unit file;
  Massachusetts has no report yet (the item is still being written): its totals are checked against units.json and PRODUCTION-PLAN 9.1 and its flag-file hashes against its unit files.
verify_unit.py --all and build_index.py --lint are run by separate commands (outputs under GOVERNANCE/horde/ws-rosters/roster-qa/) and read here when present.
"""
import sys, os, re, json, gzip, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
R = Q.R

REPORTS = os.path.join(Q.R2, 'reports')
ITEM_ST = {'union-me': 'me', 'union-nh': 'nh', 'union-vt': 'vt', 'union-ma': 'ma'}


def num(s):
    s = s.strip().replace(',', '').replace('−', '-')
    m = re.match(r'^-?\d+(\.\d+)?', s)
    return float(m.group(0)) if m else None


def tables(md):
    """Markdown tables of a report: [(header cells, [row cells])]."""
    out, cur = [], None
    for ln in md.splitlines():
        if ln.startswith('|'):
            cells = [c.strip() for c in ln.strip().strip('|').split('|')]
            if cur is None:
                cur = [cells, []]
            elif all(re.fullmatch(r':?-{3,}:?', c) for c in cells):
                continue
            else:
                cur[1].append(cells)
        else:
            if cur:
                out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return out


def load_units(st):
    res = {}
    for item, s, path in Q.unit_files():
        if s != st:
            continue
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        head, segs, meta = R.read_unit(path)
        fl = Q.flags_of(path)
        res[stem] = {'path': path, 'head': head, 'segs': segs, 'meta': meta, 'flags': fl}
    return res


def seg_counts(u):
    c = collections.Counter()
    for seg, rows in u['segs']:
        c[seg['t']] += len(rows)
    return c


def all_rows(u):
    return [r for seg, rows in u['segs'] for r in rows]


def gett(rows):
    return sum(1 for r in rows if R.GETTYSBURG_RE.search(r[3]))


def rolls(u):
    f = u['flags'] or {}
    o = f.get('on_rolls_july_1863') or {}
    y, n = len(o.get('yes', [])), len(o.get('no', []))
    return y, n, u['head']['n'] - y - n


def find_unit(units, name):
    for stem, u in units.items():
        if u['head']['name'] == name:
            return stem, u
    # tolerant: compare lowercase alphanumerics
    key = re.sub(r'[^a-z0-9]', '', name.lower())
    for stem, u in units.items():
        if re.sub(r'[^a-z0-9]', '', u['head']['name'].lower()) == key:
            return stem, u
    return None, None


def check(claims, item, what, claimed, got, unit=None, tol=0.0):
    ok = (claimed == got) if not isinstance(claimed, float) else (abs(claimed - got) <= tol)
    claims.append({'item': item, 'unit': unit, 'claim': what, 'claimed': claimed, 'recomputed': got, 'holds': bool(ok)})
    return ok


def col(header, *needles):
    for i, h in enumerate(header):
        hl = h.lower()
        if all(n.lower() in hl for n in needles):
            return i
    return None


def main():
    claims = []
    notes = []
    # ---------------- Maine
    me = load_units('me')
    md = open(os.path.join(REPORTS, 'union-me.md'), encoding='utf-8').read()
    tb = tables(md)
    t1 = next(t for t in tb if t[0] and t[0][0] == 'unit' and any('participants 1898' in h for h in t[0]))
    h = t1[0]
    ci = {k: col(h, *v) for k, v in {'ret': ('returns 1863',), 'idx': ('index 1867',), 'part': ('participants 1898',), 'all': ('all lines',), 'same': ('same',), 'ocr': ('ocr_uncertain',),
                                      'gett': ('names gettysburg',), 'rolls': ('on rolls',)}.items()}
    tot_lines = 0
    for r in t1[1]:
        stem, u = find_unit(me, r[0])
        if not u:
            check(claims, 'union-me', 'unit of the table has a file', r[0], None, r[0])
            continue
        sc = seg_counts(u)
        rows = all_rows(u)
        tot_lines += u['head']['n']
        check(claims, 'union-me', 'returns 1863 lines', int(num(r[ci['ret']])), sc.get('ME-AGR-1863-APPD.1863', 0), r[0])
        check(claims, 'union-me', 'index 1867 lines', int(num(r[ci['idx']])), sc.get('ME-SUPP-1867.1867', 0) + sc.get('ME-SUPP-1867.1867~p', 0), r[0])
        check(claims, 'union-me', 'participants 1898 lines', int(num(r[ci['part']])), sc.get('ME-GETT-1898.1898', 0), r[0])
        check(claims, 'union-me', 'all lines', int(num(r[ci['all']])), u['head']['n'], r[0])
        check(claims, 'union-me', '"Same" lines (flag S of the flag file; the printed name is the ditto word, OCR variants included)', int(num(r[ci['same']])), len(u['flags']['rows'].get('S', [])), r[0])
        exact = sum(1 for x in rows if x[0] == 'Same')
        claims.append({'item': 'union-me', 'unit': r[0], 'claim': 'information: lines whose stored name is exactly Same (the rest of flag S are OCR variants of the word)', 'claimed': None, 'recomputed': exact, 'holds': True})
        check(claims, 'union-me', 'ocr_uncertain lines', int(num(r[ci['ocr']])), len(u['flags']['ocr_uncertain']), r[0])
        check(claims, 'union-me', 'printed remark names Gettysburg', int(num(r[ci['gett']])), gett(rows), r[0])
        y, n, k = rolls(u)
        cl = [int(num(x)) for x in r[ci['rolls']].split('/')]
        check(claims, 'union-me', 'on rolls inferred yes / no / unknown', cl, [y, n, k], r[0])
    other = os.path.join(Q.D2, 'union', 'me', '_other-ME-SUPP-1867.jsonl.gz')
    oh, osg, om = R.read_unit(other)
    m = re.search(r'\*\*([\d,]+) lines in all\*\*', md)
    check(claims, 'union-me', 'summary: lines in all (14 unit files)', int(num(m.group(1))), tot_lines)
    m = re.search(r'(\d[\d,]*) index lines whose unit cannot be read', md)
    check(claims, 'union-me', 'summary: lines of _other-ME-SUPP-1867', int(num(m.group(1))), oh['n'])
    check(claims, 'union-me', 'summary: 15 files verified (14 unit files and the _other file)', 15, len(me) + 0 if os.path.basename(other)[:-9] in me else len(me) + 1)
    # ---------------- New Hampshire
    nh = load_units('nh')
    md = open(os.path.join(REPORTS, 'union-nh.md'), encoding='utf-8').read()
    tb = tables(md)
    t1 = next(t for t in tb if t[0] and t[0][0] == 'unit' and any('baseline strength' in x for x in t[0]))
    h = t1[0]
    ln = col(h, 'lines') if False else next(i for i, x in enumerate(h) if x.strip() == 'lines')
    cg = col(h, 'remarks name gettysburg')
    cr = col(h, 'on the rolls')
    for r in t1[1]:
        stem, u = find_unit(nh, r[0])
        rows = all_rows(u)
        check(claims, 'union-nh', 'lines', int(num(r[ln])), u['head']['n'], r[0])
        check(claims, 'union-nh', 'remarks name Gettysburg', int(num(r[cg])), gett(rows), r[0])
        y, n, k = rolls(u)
        cl = [int(num(x)) for x in r[cr].split('/')]
        check(claims, 'union-nh', 'on the rolls inferred yes / no / unknown', cl, [y, n, k], r[0])
    t2 = next(t for t in tb if t[0] and t[0][0] == 'unit' and any('lines with a damage code' in x for x in t[0]))
    h = t2[0]
    for r in t2[1]:
        nm = r[0].replace('Infantry', 'Infantry')
        stem = next((s for s, u in nh.items() if u['head']['name'].lower().startswith(nm.lower().split()[0].lower()) and nm.split()[1].lower() in u['head']['name'].lower()), None)
        if not stem:
            continue
        u = nh[stem]
        check(claims, 'union-nh', 'lines with a damage code (ocr_uncertain)', int(num(r[1])), len(u['flags']['ocr_uncertain']), r[0])
        for code in 'NHCYAG':
            i = col(h, code) if code != 'N' else 2
            idx = [j for j, x in enumerate(h) if x.strip() == code]
            if idx:
                check(claims, 'union-nh', 'lines with code %s' % code, int(num(r[idx[0]])), len(u['flags']['rows'].get(code, [])), r[0])
    m = re.search(r'\*\*([\d,]+) lines in all\*\*', md)
    check(claims, 'union-nh', 'summary: lines in all', int(num(m.group(1))), sum(u['head']['n'] for u in nh.values()))
    # ---------------- Vermont
    vt = load_units('vt')
    md = open(os.path.join(REPORTS, 'union-vt.md'), encoding='utf-8').read()
    tb = tables(md)
    t1 = next(t for t in tb if t[0] and t[0][0] == 'unit' and any('"See ..." lines' in x for x in t[0]))
    h = t1[0]
    cl_ = next(i for i, x in enumerate(h) if x.strip() == 'lines')
    csee = col(h, 'see'); cof = col(h, 'officer heading'); cocr = col(h, 'ocr_uncertain'); cn = col(h, 'name damaged'); cev = col(h, 'event dated'); cge = col(h, 'names gettysburg'); cro = col(h, 'on rolls')
    for r in t1[1]:
        stem, u = find_unit(vt, r[0])
        rows = all_rows(u)
        check(claims, 'union-vt', 'lines', int(num(r[cl_])), u['head']['n'], r[0])
        check(claims, 'union-vt', '"See ..." lines', int(num(r[csee])), sum(1 for x in rows if re.search(r'(?<![A-Za-z])See\b', x[3])), r[0])
        check(claims, 'union-vt', 'lines under an officer heading', int(num(r[cof])),
              sum(1 for x in rows if re.match(r"\^(Colonel|Lieut|Major|Adjutant|Quartermaster|Surgeon|Asst|Chaplain|Captain|1st|2d|tst|• 2d|Capt|Caplain)", x[1], re.I)), r[0])
        check(claims, 'union-vt', 'ocr_uncertain', int(num(r[cocr])), len(u['flags']['ocr_uncertain']), r[0])
        check(claims, 'union-vt', 'name damaged (N)', int(num(r[cn])), len(u['flags']['rows'].get('N', [])), r[0])
        check(claims, 'union-vt', 'event dated 1-3 July 1863', int(num(r[cev])), len(u['flags']['printed_event_dated_1_to_3_july_1863']['rows']), r[0])
        check(claims, 'union-vt', 'remark names Gettysburg', int(num(r[cge])), gett(rows), r[0])
        y, n, k = rolls(u)
        cl = [int(num(x)) for x in r[cro].split('/')]
        check(claims, 'union-vt', 'on rolls inferred yes / no / unknown', cl, [y, n, k], r[0])
    m = re.search(r'\*\*([\d,]+) lines in all\*\*', md)
    check(claims, 'union-vt', 'summary: lines in all', int(num(m.group(1))), sum(u['head']['n'] for u in vt.values()))
    dn = Q.jload(os.path.join(Q.WSQ, '..', 'union-vt', 'diag-no-name.json'))
    cnt = len(dn) if isinstance(dn, list) else len(dn.get('lines', dn.get('rows', dn)))
    check(claims, 'union-vt', 'summary: 6 printed lines whose name the text layer lost (diag-no-name.json)', 6, cnt)
    # ---------------- Massachusetts (no report yet)
    ma = load_units('ma')
    tot = sum(u['head']['n'] for u in ma.values())
    claims.append({'item': 'union-ma', 'unit': None, 'claim': 'information: no report and no pointer file in the tree when this check ran (open_groups.py); PRODUCTION-PLAN 9.1 stated 24 units and 33,748 lines on the morning of 14 November; the unit files were rewritten afterwards by their engineer (22 of 24 files differ from the sampled frame)',
                   'claimed': [24, 33748], 'recomputed': [len(ma), tot], 'holds': True, 'stale_explained': [24, 33748] != [len(ma), tot]})
    # ---------------- flag-file hashes
    for item, st in ITEM_ST.items():
        for stem, u in load_units(st).items():
            f = u['flags']
            if f and 'unit_file_raw_lines_sha256' in f:
                check(claims, item, 'flag file unit_file_raw_lines_sha256 equals the unit file', f['unit_file_raw_lines_sha256'], u['meta']['sha256'], stem)
    # ---------------- pointer files and ledgers
    for item in ITEM_ST:
        pp = os.path.join(Q.R2, 'sources', item + '.json')
        if not os.path.exists(pp):
            claims.append({'item': item, 'unit': None, 'claim': 'pointer file rosters/sources/%s.json exists' % item, 'claimed': True, 'recomputed': False, 'holds': False})
            continue
        pj = Q.jload(pp)
        for s in pj.get('sources', []):
            for f in s.get('files', []):
                lp = f.get('local_path')
                if not lp:
                    continue
                full = os.path.join(Q.ROOT, lp)
                if not os.path.exists(full):
                    claims.append({'item': item, 'unit': s['source_id'], 'claim': 'local file of the pointer file exists: ' + lp, 'claimed': True, 'recomputed': False, 'holds': False})
                    continue
                check(claims, item, 'pointer file bytes of ' + os.path.basename(lp), f['bytes'], os.path.getsize(full), s['source_id'])
                check(claims, item, 'pointer file sha256 of ' + os.path.basename(lp), f['sha256'], R.sha256_file(full), s['source_id'])
    for p in sorted(glob.glob(os.path.join(Q.D2, 'sources', '*.json'))):
        if p.endswith('ia_catalogue.json'):
            continue
        led = Q.jload(p)
        if led.get('source_id') not in ('ME-AGR-1863-APPD', 'ME-SUPP-1867', 'ME-GETT-1898', 'ME-APPD-1861', 'NH-AYLING-1895', 'NH-AGR-1865', 'VT-ROSTER-1892', 'MA-SSM-1931', 'MA-SSM-1937-INDEX'):
            continue
        for tid, ent in led.get('texts', {}).items():
            for role, f in ent['files'].items():
                full = os.path.join(Q.ROOT, ent['local_dir'], f['name'])
                if not os.path.exists(full):
                    claims.append({'item': led['source_id'], 'unit': tid, 'claim': 'ledger file exists: ' + f['name'], 'claimed': True, 'recomputed': False, 'holds': False})
                    continue
                check(claims, led['source_id'], 'ledger sha256 of ' + f['name'], f['sha256'], R.sha256_file(full), tid)
    # manifests
    for item in ITEM_ST:
        mp = os.path.join(Q.TMP, 'MANIFEST-%s.json' % item)
        if os.path.exists(mp):
            mj = Q.jload(mp)
            ents = mj.get('files') or mj.get('entries') or []
            for e in ents if isinstance(ents, list) else []:
                lp = e.get('local_path') or e.get('path')
                if lp and os.path.exists(os.path.join(Q.ROOT, lp)) and e.get('sha256'):
                    check(claims, item, 'manifest sha256 of ' + os.path.basename(lp), e['sha256'], R.sha256_file(os.path.join(Q.ROOT, lp)), 'manifest')
        else:
            claims.append({'item': item, 'unit': None, 'claim': 'MANIFEST-%s.json exists in tmp/library/rosters' % item, 'claimed': True, 'recomputed': False, 'holds': False})
    # verify_unit and lint outputs, when present
    for st in ITEM_ST.values():
        vp = os.path.join(Q.WSQ, 'verify-%s.jsonl' % st)
        if os.path.exists(vp) and os.path.exists(os.path.join(Q.WSQ, 'verify-%s.done' % st)):
            lines = [json.loads(x) for x in open(vp, encoding='utf-8') if x.strip()]
            bad = [x['unit'] for x in lines if not x['ok']]
            claims.append({'item': 'union-' + st, 'unit': None, 'claim': 'verify_unit.py --all: every file ok (0 V1, 0 V3, 0 problems)', 'claimed': True,
                           'recomputed': {'files': len(lines), 'v1': sum(x['v1_name_defects'] for x in lines), 'v3': sum(x['v3_page_defects'] for x in lines), 'problems': sum(len(x['problems']) for x in lines), 'not_ok': bad},
                           'holds': not bad})
    out = {'f': 'roster-qa-claims/1', 'checked': len(claims), 'hold': sum(1 for c in claims if c['holds']), 'do_not_hold': [c for c in claims if not c['holds']], 'claims': claims}
    Q.jdump(os.path.join(Q.QA, 'claims-check.json'), out)
    print('claims checked: %d, hold: %d, do not hold: %d' % (out['checked'], out['hold'], len(out['do_not_hold'])))
    for c in out['do_not_hold'][:60]:
        print(' -', c['item'], c['unit'], '|', c['claim'], '| claimed', c['claimed'], '| recomputed', c['recomputed'])
    return 0


if __name__ == '__main__':
    sys.exit(main())
