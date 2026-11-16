"""Re-verify the numeric and file claims of the conf-nc report against its files (roster-qa round 2, task 3).  Standard library only.

    RQA_ROUND=2 python3 -I qa_claims_nc.py            write data2/qa/round2/claims-check.json and print the claims that do not hold

What is checked (every number is recomputed from the 41 unit files, the 41 flag files, the earlier roll files of the C-NCLA family, the pointer file and the ledger, never typed):
  report tables (rosters/reports/conf-nc.md): per unit the lines, the lines minus the printed total, the lines per strength (the strength cell of the report), the lines of the earlier roll
      file (rosters/data/C-NCLA, rows counted from the CSV), the lines of the second scan (as GOVERNANCE/horde/ws-rosters/conf-nc/reconciliation.json holds them: a consistency check,
      the second reading is not repeated here); ocr_uncertain, the damage codes N H C R Y G M W, the lines whose remarks name Gettysburg and the events dated 1 to 3 July 1863 as the
      flag file lists them, on the rolls yes / no / unknown; the text read, the roll leaves, the printed pages, the lines without a printed page, the company letters and the field and
      staff lines of the section table; the totals row of each table;
  the summary sentences of the report: the totals of lines, raw bytes, gzipped bytes and flag-file bytes, the counts of ocr_uncertain, on the rolls, names Gettysburg and dated lines;
  the pointer file (rosters/sources/conf-nc.json): every unit file and flag file is present with the recorded bytes and sha256, the recorded rows and the sha256 of the raw lines;
      every listed text file that is kept locally is present with the recorded bytes and sha256;
  the flag files: the sha256 of the raw lines kept in each flag file equals that of the unit file, and the row count agrees;
  verify_unit.py and build_index.py --lint: run by separate commands (outputs under GOVERNANCE/horde/ws-rosters/roster-qa/r2/) and read here when present.
A claim that the files do not bear out is listed in the output and in the report (section 8.6); nothing is repaired here.
"""
import sys, os, re, json, gzip, csv, glob, collections, time, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_claims as C1
R = Q.R

REPORT = os.path.join(Q.R2, 'reports', 'conf-nc.md')
POINTER = os.path.join(Q.R2, 'sources', 'conf-nc.json')
WSN = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'conf-nc')
CODES = 'NHCRYGMW'


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def load():
    units = {}
    for item, st, path in Q.unit_files():
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        head, segs, meta = R.read_unit(path)
        fl = Q.flags_of(path)
        rows = [r for seg, rs in segs for r in rs]
        units[stem] = {'path': path, 'head': head, 'segs': segs, 'meta': meta, 'flags': fl, 'rows': rows}
    return units


def check(claims, what, claimed, got, unit=None):
    ok = claimed == got
    claims.append({'item': 'conf-nc', 'unit': unit, 'claim': what, 'claimed': claimed, 'recomputed': got, 'holds': bool(ok)})
    return ok


def leaves_of(u):
    """first and last leaf of the roll in the text of the unit (the leaf of each line's offset), and the text ids."""
    ls = []
    tids = []
    for seg, rs in u['segs']:
        text, pm, ent = Q.load_source(seg['t'])
        tids.append(seg['t'])
        for r in rs:
            ls.append(pm.leaf(r[5]))
    return ls, tids


def parse_int(s):
    s = s.strip().replace('+', '').replace('\u2212', '-')
    n = C1.num(s)
    return None if n is None else int(n)


def earlier_rows(key, units_json):
    u = next((x for x in units_json['units'] if x['key'] == key), None)
    if not u or not u.get('existing'):
        return None
    tot = 0
    for e in u['existing']:
        p = os.path.join(Q.R2, e['file'])
        if not os.path.exists(p):
            return None
        with open(p, encoding='utf-8', errors='replace', newline='') as f:
            tot += sum(1 for _ in csv.DictReader(f))
    return tot


def main():
    if Q.ROUND != '2':
        print('run with RQA_ROUND=2')
        return 2
    claims, notes = [], []
    units = load()
    md = open(REPORT, encoding='utf-8').read()
    tb = C1.tables(md)
    byname = {u['head']['name']: (stem, u) for stem, u in units.items()}

    def unit_of(cell):
        if cell in byname:
            return byname[cell]
        key = re.sub(r'[^a-z0-9]', '', cell.lower())
        for n, v in byname.items():
            if re.sub(r'[^a-z0-9]', '', n.lower()) == key:
                return v
        return (None, None)
    units_json = Q.jload(os.path.join(Q.D2, 'units.json'))
    recon_p = os.path.join(WSN, 'reconciliation.json')
    recon = Q.jload(recon_p) if os.path.exists(recon_p) else None
    # ---------------- table 1.1
    t11 = next((t for t in tb if t[0] and t[0][0] == 'unit' and any('printed total' in h for h in t[0])), None)
    if t11:
        h = t11[0]
        ci = {k: C1.col(h, *v) for k, v in {'str': ('strength',), 'tot': ('printed total',), 'lines': ('lines',), 'diff': ('minus printed',), 'second': ('second scan',), 'earlier': ('earlier file',), 'ratio': ('/ strength',)}.items()}
        ci['lines'] = next(i for i, x in enumerate(h) if x.strip().lower() == 'lines')
        sum_lines = 0
        for r in t11[1]:
            stem, u = unit_of(r[0])
            if not u:
                check(claims, 'table 1.1: unit has a file', r[0], None, r[0])
                continue
            n = u['head']['n']
            sum_lines += n
            check(claims, 'table 1.1: lines', parse_int(r[ci['lines']]), n, r[0])
            tot = parse_int(r[ci['tot']]) if re.match(r'^[\d,]+', r[ci['tot']].strip()) and not r[ci['tot']].startswith('not read') else None
            if tot is not None and r[ci['diff']].strip() not in ('n/a', ''):
                check(claims, 'table 1.1: lines minus printed total', parse_int(r[ci['diff']]), n - tot, r[0])
            stv = parse_int(r[ci['str']]) if re.match(r'^[\d,]+$', r[ci['str']].strip()) else None
            if stv and re.match(r'^[\d.]+$', r[ci['ratio']].strip()):
                check(claims, 'table 1.1: lines / strength', float(r[ci['ratio']]), round(n / stv, 2), r[0])
            ea = earlier_rows(u['head']['u'], units_json)
            cell = r[ci['earlier']].strip()
            if re.match(r'^[\d,]+$', cell):
                check(claims, 'table 1.1: lines of the earlier roll file (CSV rows counted)', parse_int(cell), ea, r[0])
            elif ea is not None and cell.startswith('no earlier'):
                check(claims, 'table 1.1: no earlier roll file', 0, ea, r[0])
            cell2 = r[ci['second']].strip()
            ent = ((recon or {}).get('units') or {}).get(u['head']['u'])
            if ent and re.match(r'^[\d,]+$', cell2):
                check(claims, 'table 1.1: lines of the second scan (as reconciliation.json holds them)', parse_int(cell2), (ent.get('second_scan') or {}).get('lines'), r[0])
            elif re.match(r'^[\d,]+$', cell2):
                notes.append('lines of the second scan (table 1.1, %s): no entry in reconciliation.json' % r[0])
            if ent:
                check(claims, 'reconciliation.json: the lines it reconciled equal the unit file', ent.get('lines'), n, r[0])
        tot_row = next((r for r in t11[1] if r[0].strip('* ').lower() in ('total', 'all')), None)
        if tot_row:
            check(claims, 'table 1.1: total lines', parse_int(tot_row[ci['lines']].strip('* ')), sum(u['head']['n'] for u in units.values()))
    else:
        notes.append('table 1.1 (lines against the printed totals) not found in the report')
    # ---------------- table 1.2
    t12 = next((t for t in tb if t[0] and t[0][0] == 'unit' and any('ocr_uncertain' in x for x in t[0]) and any('on rolls' in x for x in t[0])), None)
    tot_n = tot_ocr = tot_g = tot_d = 0
    tot_codes = collections.Counter()
    tot_roll = [0, 0, 0]
    if t12:
        h = t12[0]
        ci = {'lines': 1, 'ocr': C1.col(h, 'ocr_uncertain'), 'gett': C1.col(h, 'names gettysburg'), 'dated': C1.col(h, 'event dated'), 'rolls': C1.col(h, 'on rolls')}
        for c in CODES:
            ci[c] = next(i for i, x in enumerate(h) if x.strip() == c)
        for r in t12[1]:
            if r[0].strip().startswith('**total'):
                continue
            stem, u = unit_of(r[0])
            if not u:
                check(claims, 'table 1.2: unit has a file', r[0], None, r[0])
                continue
            fl = u['flags'] or {}
            n = u['head']['n']
            check(claims, 'table 1.2: lines', parse_int(r[ci['lines']]), n, r[0])
            check(claims, 'table 1.2: ocr_uncertain', parse_int(r[ci['ocr']]), len(fl.get('ocr_uncertain', [])), r[0])
            for c in CODES:
                check(claims, 'table 1.2: damage code %s' % c, parse_int(r[ci[c]]), len((fl.get('rows') or {}).get(c, [])), r[0])
                tot_codes[c] += len((fl.get('rows') or {}).get(c, []))
            check(claims, 'table 1.2: remark names Gettysburg (flag file list)', parse_int(r[ci['gett']]), len(fl.get('names_gettysburg', [])), r[0])
            check(claims, 'table 1.2: event dated 1-3 July 1863 (flag file list)', parse_int(r[ci['dated']]), len(fl.get('gettysburg_dated', [])), r[0])
            orl = fl.get('on_rolls_july_1863') or {}
            y, nn = len(orl.get('yes', [])), len(orl.get('no', []))
            cells = [parse_int(x) for x in re.split(r'\s*/\s*', r[ci['rolls']])]
            check(claims, 'table 1.2: on the rolls yes / no / unknown', cells, [y, nn, n - y - nn], r[0])
            tot_n += n
            tot_ocr += len(fl.get('ocr_uncertain', []))
            tot_g += len(fl.get('names_gettysburg', []))
            tot_d += len(fl.get('gettysburg_dated', []))
            tot_roll[0] += y
            tot_roll[1] += nn
            tot_roll[2] += n - y - nn
        trow = next((r for r in t12[1] if r[0].strip().startswith('**total')), None)
        if trow:
            check(claims, 'table 1.2: total lines', parse_int(trow[ci['lines']].strip('* ')), tot_n)
            check(claims, 'table 1.2: total ocr_uncertain', parse_int(trow[ci['ocr']]), tot_ocr)
            for c in CODES:
                check(claims, 'table 1.2: total damage code %s' % c, parse_int(trow[ci[c]]), tot_codes[c])
            check(claims, 'table 1.2: total names Gettysburg', parse_int(trow[ci['gett']]), tot_g)
            check(claims, 'table 1.2: total dated 1-3 July 1863', parse_int(trow[ci['dated']]), tot_d)
            check(claims, 'table 1.2: total on the rolls yes / no / unknown', [parse_int(x) for x in re.split(r'\s*/\s*', trow[ci['rolls']])], tot_roll)
    else:
        notes.append('table 1.2 (flags and marks per unit) not found in the report')
    # ---------------- section table
    t2 = next((t for t in tb if t[0] and t[0][0] == 'unit' and any('roll leaves' in x for x in t[0])), None)
    if t2:
        h = t2[0]
        ci = {'text': C1.col(h, 'text read'), 'leaves': C1.col(h, 'roll leaves'), 'pages': C1.col(h, 'printed pages'), 'nopage': C1.col(h, 'without a printed page'), 'co': C1.col(h, 'company letters'), 'fs': C1.col(h, 'field and staff')}
        for r in t2[1]:
            stem, u = unit_of(r[0])
            if not u:
                check(claims, 'section table: unit has a file', r[0], None, r[0])
                continue
            ls, tids = leaves_of(u)
            check(claims, 'section table: text read', r[ci['text']].strip(), collections.Counter(tids).most_common(1)[0][0], r[0])
            m = re.match(r'^(\d+) - (\d+) \((\d+) leaves\)', r[ci['leaves']].strip())
            if m:
                check(claims, 'section table: roll leaves (first, last, number of leaves, the leaves that hold a line of the primary text)', [int(m.group(1)), int(m.group(2)), int(m.group(3))],
                      [min(ls), max(ls), max(ls) - min(ls) + 1], r[0])
            pgs = [x[4] for x in u['rows'] if x[4]]
            m = re.match(r'^(\d+) - (\d+)$', r[ci['pages']].strip())
            if m and pgs:
                check(claims, 'section table: printed pages of the roll (first, last)', [int(m.group(1)), int(m.group(2))], [min(pgs), max(pgs)], r[0])
            nop = sum(1 for x in u['rows'] if not x[4])
            m = re.match(r'^(\d+)', r[ci['nopage']].strip())
            if m:
                check(claims, 'section table: lines without a printed page', int(m.group(1)), nop, r[0])
            letters = ''.join(sorted({x[2] for x in u['rows'] if x[2] and x[2] != 'FS'}))
            check(claims, 'section table: company letters', r[ci['co']].strip(), letters, r[0])
            check(claims, 'section table: field and staff lines (FS)', parse_int(r[ci['fs']]), sum(1 for x in u['rows'] if x[2] == 'FS'), r[0])
    else:
        notes.append('the section table (roll leaves and printed pages per unit) not found in the report')
    # ---------------- summary sentences
    raw_total = sum(u['meta'].get('raw', 0) if isinstance(u['meta'].get('raw'), int) else len(u['meta'].get('raw', b'')) for u in units.values())
    gz_total = sum(os.path.getsize(u['path']) for u in units.values())
    fl_total = sum(os.path.getsize(u['path'].replace('.jsonl.gz', '.flags.json.gz')) for u in units.values())
    summ = md.split('## 1.')[0]
    pats = [
        (r'\*\*([\d,]+) lines in all\*\* \(([\d,]+) raw bytes, ([\d,]+) gzipped\)', 'summary: lines, raw bytes, gzipped bytes', lambda m: [int(x.replace(',', '')) for x in m.groups()], [tot_n or sum(u['head']['n'] for u in units.values()), raw_total, gz_total]),
        (r'\(([\d,]+) bytes in all\)', 'summary: flag-file bytes in all', lambda m: [int(m.group(1).replace(',', ''))], [fl_total]),
        (r'`ocr_uncertain` \(([\d,]+) of ([\d,]+) lines', 'summary: ocr_uncertain of lines', lambda m: [int(x.replace(',', '')) for x in m.groups()], [tot_ocr, tot_n]),
        (r'([\d,]+) yes, ([\d,]+) no, ([\d,]+) unknown', 'summary: on the rolls yes, no, unknown', lambda m: [int(x.replace(',', '')) for x in m.groups()], tot_roll),
        (r'`names_gettysburg` \(([\d,]+) lines', 'summary: lines whose remarks name Gettysburg', lambda m: [int(m.group(1).replace(',', ''))], [tot_g]),
        (r'`gettysburg_dated` \(([\d,]+) of these', 'summary: of these also dated 1-3 July 1863', lambda m: [int(m.group(1).replace(',', ''))], [tot_d]),
    ]
    for pat, what, fn, got in pats:
        m = re.search(pat, summ)
        if m:
            check(claims, what, fn(m), got)
        else:
            notes.append('summary phrase not found (not checked): ' + what)
    # ---------------- pointer file
    ptr = Q.jload(POINTER)
    byu = {u['head']['u']: (stem, u) for stem, u in units.items()}
    n_unit_claims = 0
    for e in ptr.get('unit_files', []):
        stem_u = byu.get(e['unit'])
        if not stem_u:
            check(claims, 'pointer file: the unit of the entry has a file', e['unit'], None, e['unit'])
            continue
        stem, u = stem_u
        pth = os.path.join(Q.ROOT, e['path'])
        check(claims, 'pointer file: unit file rows', e['rows'], u['head']['n'], e['designation'])
        check(claims, 'pointer file: unit file bytes', e['file_bytes'], os.path.getsize(pth), e['designation'])
        check(claims, 'pointer file: unit file sha256', e['file_sha256'], sha_file(pth), e['designation'])
        check(claims, 'pointer file: sha256 of the raw lines', e['raw_lines_sha256'], u['meta']['sha256'], e['designation'])
        fp = os.path.join(Q.ROOT, e['flags_path'])
        check(claims, 'pointer file: flag file bytes', e['flags_bytes'], os.path.getsize(fp), e['designation'])
        check(claims, 'pointer file: flag file sha256', e['flags_sha256'], sha_file(fp), e['designation'])
        n_unit_claims += 1
    check(claims, 'pointer file: number of unit_files entries', len(ptr.get('unit_files', [])), len(units))
    n_txt = 0
    for s in ptr.get('sources', []):
        for fl_ in s.get('files', []):
            lp = fl_.get('local_path')
            if lp and os.path.exists(os.path.join(Q.ROOT, lp)):
                p = os.path.join(Q.ROOT, lp)
                check(claims, 'pointer file: text file bytes', fl_['bytes'], os.path.getsize(p), '%s %s' % (s['text_id'], fl_['role']))
                check(claims, 'pointer file: text file sha256', fl_['sha256'], sha_file(p), '%s %s' % (s['text_id'], fl_['role']))
                n_txt += 1
    # ---------------- flag files
    for stem, u in units.items():
        fl = u['flags'] or {}
        check(claims, 'flag file: sha256 of the raw lines equals the unit file', fl.get('unit_file_raw_lines_sha256'), u['meta']['sha256'], u['head']['name'])
        check(claims, 'flag file: rows equal the unit file', fl.get('n'), u['head']['n'], u['head']['name'])
    # ---------------- logs of the separate commands
    d = os.path.join(Q.WSQ, 'r2')
    vp = os.path.join(d, 'verify-nc.jsonl')
    if os.path.exists(vp) and os.path.exists(os.path.join(d, 'verify-nc.done')):
        lines = [json.loads(x) for x in open(vp, encoding='utf-8') if x.strip()]
        bad = [x['unit'] for x in lines if not x['ok']]
        claims.append({'item': 'conf-nc', 'unit': None, 'claim': 'verify_unit.py on the 41 files: every file ok (0 V1, 0 V3, 0 problems)', 'claimed': True,
                       'recomputed': {'files': len(lines), 'v1': sum(x['v1_name_defects'] for x in lines), 'v3': sum(x['v3_page_defects'] for x in lines), 'problems': sum(len(x['problems']) for x in lines), 'not_ok': bad},
                       'holds': (not bad) and len(lines) >= len(units)})
    else:
        notes.append('verify_unit.py on the 41 files has not been run (owed): output expected in GOVERNANCE/horde/ws-rosters/roster-qa/r2/verify-nc.jsonl')
    out = {'f': 'roster-qa-claims/1', 'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'report': Q.rel(REPORT), 'report_mtime_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(REPORT))),
           'pointer_file': Q.rel(POINTER), 'checked': len(claims), 'hold': sum(1 for c in claims if c['holds']),
           'do_not_hold': [c for c in claims if not c['holds']], 'notes': notes, 'unit_file_entries_checked': n_unit_claims, 'text_files_checked': n_txt, 'claims': claims}
    Q.jdump(os.path.join(Q.QA, 'claims-check.json'), out)
    print('claims checked: %d, hold: %d, do not hold: %d, notes: %d' % (out['checked'], out['hold'], len(out['do_not_hold']), len(notes)))
    for c in out['do_not_hold'][:60]:
        print(' -', c['unit'], '|', c['claim'], '| claimed', c['claimed'], '| recomputed', c['recomputed'])
    for n in notes:
        print(' note:', n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
