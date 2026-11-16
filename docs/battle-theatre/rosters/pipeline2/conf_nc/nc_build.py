"""Builder of the conf-nc work item: Moore's Roster of North Carolina Troops -> one roster2/2 file per unit, a flags file beside it, diagnostics.

    python3 -I docs/battle-theatre/rosters/pipeline2/conf_nc/nc_build.py [--unit KEY ...] [--no-write]     (from the repository root; heavy: run through tools/horde/bench.sh)

For every unit the section of the regiment (or battalion, or one company of it) is parsed in both Internet Archive scans of the volume (nc_parse.py).  Pages that a
scan holds twice are dropped from that scan's reading (nc_align.dedupe_leaves).  The primary scan of a unit is the one whose company headings need fewer repairs, then
the one with more rows; the other scan is the second reading: the stretches of at least MIN_SUPPLEMENT rows that only it holds are taken as a second segment of the unit
file (lines read from the second text, each with its own offset), everything else that differs is listed in the diagnostics and never merged.  Every line is asserted:
its name is found at its offset in the text it was read from, its remarks in order from the recorded place, its printed page is that of its leaf.
"""
import os, sys, json, gzip, collections, time, hashlib, csv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_parse as P, nc_cache as C, nc_align as A, nc_flags as F, nc_units as U
import r2lib as R
import verify_unit as V

DEFECT_COST = 15          # rows a defect of a reading is worth (a scan with a damaged heading or a page held twice has lost or doubled about that many entries)
MIN_SUPPLEMENT = 5      # a stretch of at least this many rows that only the second scan holds is listed in the diagnostics (never merged)
BAD_RULES = ('sequence', 'skip', 'out-of-sequence', 'inferred-after-privates')
SRC = L.SOURCE_ID


def measure(key, scan):
    p = C.parse_unit(key, scan)
    kept, dups = A.dedupe_leaves(p['rows'])
    co = p.get('company')
    defects = sum(1 for h in p['headings'] if h['rule'] in BAD_RULES and (not co or h['assigned'] == co))
    second = sum(1 for r in kept if F.second_marker(r['row'][3]))
    return {'scan': scan, 'parse': p, 'kept': kept, 'dups': dups, 'heading_defects': defects, 'second_marks': second,
            'recovered': sum(1 for r in kept if r['kind'] == 'S-recovered'), 'rows': len(kept), 'rows_before_dedupe': len(p['rows'])}


def company_letters(m):
    return collections.Counter(r['row'][2] for r in m['kept'])


def decide(key):
    """Primary and second reading of a unit and the reasons.  Defects of a reading = company headings read by the sequence (nc_parse), plus two for every company letter the
    other reading does not have, plus the pages it held twice.  The reading with fewer defects is the primary; with equal defects the one with more rows; with equal rows the
    item named by the work item (scan a).  The stretches that only the second reading holds are listed (second_only_runs) and never merged into the file: a scan may hold a
    page twice with small differences, so a run that only the other scan has is no proof that the primary lost it."""
    m = {sc: measure(key, sc) for sc in ('a', 'b')}
    ca, cb = company_letters(m['a']), company_letters(m['b'])
    for sc, me, other in (('a', ca, cb), ('b', cb, ca)):
        extra = [c for c in me if c not in other and c != 'FS']
        m[sc]['extra_companies'] = extra
        m[sc]['extra_rows'] = sum(me[c] for c in extra)
        m[sc]['defects'] = m[sc]['heading_defects'] + len(m[sc]['dups'])
    a, b = m['a'], m['b']
    for sc in ('a', 'b'):
        m[sc]['score'] = m[sc]['rows'] - m[sc]['extra_rows'] - DEFECT_COST * m[sc]['defects']
    if a['score'] != b['score']:
        pri = 'a' if a['score'] > b['score'] else 'b'
        oth = 'b' if pri == 'a' else 'a'
        why = ('score %d against %d (rows after the pages held twice were taken out, minus the rows of company letters the other scan does not have, minus %d per defect: %d company headings read by the sequence '
               'or pages held twice, against %d)' % (m[pri]['score'], m[oth]['score'], DEFECT_COST, m[pri]['defects'], m[oth]['defects']))
    else:
        pri = 'a'
        why = 'both readings score the same; the item named by the work item'
    sec = 'b' if pri == 'a' else 'a'
    P1, P2 = m[pri], m[sec]
    al = A.align([r['row'] for r in P1['kept']], [r['row'] for r in P2['kept']])
    runs = [(i, j1, j2) for (i, j1, j2) in al['insert_runs'] if j2 - j1 >= MIN_SUPPLEMENT]
    return {'key': key, 'primary': pri, 'second': sec, 'why': why, 'm': m, 'align': al, 'second_only_runs': runs, 'supplement': [], 'supplement_runs': [], 'P1': P1, 'P2': P2}


def seg_dict(tid, vol):
    return {'s': SRC, 'v': vol, 't': tid, 'lay': 'flow'}


def unit_rows(dec):
    """[(segment dict, [row dicts])] of a unit."""
    u = U.UNIT[dec['key']]
    vol = u[3]
    segs = [(seg_dict(dec['P1']['parse']['tid'], vol), dec['P1']['kept'])]
    if dec['supplement']:
        segs.append((seg_dict(dec['P2']['parse']['tid'], vol), dec['supplement']))
    return segs


def write_unit_file(dec, segs):
    u = U.UNIT[dec['key']]
    key, desig = u[0], u[1]
    path = os.path.join(L.D2, 'confederate', 'nc', key[len('c-nc-'):] + '.jsonl.gz')
    info = R.write_unit(path, key, 'confederate', 'nc', desig, [(sg, [r['row'] for r in rows]) for sg, rows in segs])
    return path, info


def main(argv):
    keys = [u[0] for u in U.UNITS if u[3] is not None]
    if '--unit' in argv:
        sel = []
        i = 0
        while i < len(argv):
            if argv[i] == '--unit':
                sel.append(argv[i + 1])
                i += 2
            else:
                i += 1
        keys = [k for k in keys if k in sel]
    write = '--no-write' not in argv
    vocab_only = '--vocab-only' in argv
    t0 = time.time()
    decs = {}
    for k in keys:
        decs[k] = decide(k)
        d = decs[k]
        print('%-46s primary %s rows %5d second-only runs %2d | a rows %d defects %d b rows %d defects %d | %s' % (k[5:], d['primary'], d['P1']['rows'], len(d['second_only_runs']),
                                                                                         d['m']['a']['rows'], d['m']['a']['defects'], d['m']['b']['rows'], d['m']['b']['defects'], d['why'][:60]), flush=True)
    if not write:
        return 0
    # vocabulary of the remarks of every line written (for the damaged-word mark); computed over all units once and kept, so that a chunked run writes the same marks
    vpath = os.path.join(C.CACHE, 'vocab.%s.json' % C.parser_hash())
    if vocab_only or not os.path.exists(vpath):
        allk = [u[0] for u in U.UNITS if u[3] is not None]
        for k in allk:
            if k not in decs:
                decs[k] = decide(k)
        vocab = F.build_vocab(r['row'][3] for d in decs.values() for sg, rows in unit_rows(d) for r in rows)
        with open(vpath, 'w', encoding='utf-8') as f:
            json.dump(vocab, f)
        print('vocabulary', len(vocab), 'words', flush=True)
        if vocab_only:
            return 0
        decs = {k: v for k, v in decs.items() if k in keys}
    else:
        with open(vpath, encoding='utf-8') as f:
            vocab = collections.Counter(json.load(f))
    os.makedirs(os.path.join(L.WS, 'diagnostics'), exist_ok=True)
    summary = {}
    sp = os.path.join(L.WS, 'build-summary.json')
    if os.path.exists(sp):
        try:
            old = json.load(open(sp, encoding='utf-8'))
            summary = old.get('units', {})
        except Exception:
            summary = {}
    for k, d in decs.items():
        segs = unit_rows(d)
        path, info = write_unit_file(d, segs)
        rows = [r for sg, rs in segs for r in rs]
        extra = {'segment_of_row': {'second_scan': list(range(len(segs[0][1]), len(rows)))} if len(segs) > 1 else {}}
        pr = F.page_readings(k, rows)
        if pr:
            extra['page_image_readings'] = pr
        flags = F.make_flags(k, rows, vocab, info['sha256'], extra=extra)
        fpath = path[:-len('.jsonl.gz')] + '.flags.json.gz'
        raw = (json.dumps(flags, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
        with open(fpath + '.tmp', 'wb') as f:
            with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
                g.write(raw)
        os.replace(fpath + '.tmp', fpath)
        v = V.verify_file(path)
        summary[k] = {'rows': info['n'], 'raw_bytes': info['raw'], 'gz_bytes': info['gz'], 'sha256': info['sha256'], 'verify_ok': v['ok'], 'v1': v['v1_name_defects'], 'v3': v['v3_page_defects'],
                      'remark_ok': v['stats'].get('remark_ok'), 'remark_empty': v['stats'].get('remark_empty'), 'remark_gap_rows': v['stats'].get('remark_gap_rows'), 'rows_with_remarks_not_found': v['rows'] - v['stats'].get('remark_ok', 0) - v['stats'].get('remark_empty', 0),
                      'primary': d['primary'], 'second': d['second'], 'why': d['why'], 'supplement_rows': len(d['supplement']), 'supplement_runs': d['supplement_runs'],
                      'dups_dropped': {sc: d['m'][sc]['dups'] for sc in ('a', 'b')}, 'heading_defects': {sc: d['m'][sc]['heading_defects'] for sc in ('a', 'b')},
                      'rows_by_scan': {sc: {'parsed': d['m'][sc]['rows_before_dedupe'], 'after_dedupe': d['m'][sc]['rows']} for sc in ('a', 'b')},
                      'texts': [sg['t'] for sg, rs in segs], 'section': {sc: [d['m'][sc]['parse']['a'], d['m'][sc]['parse']['b'], d['m'][sc]['parse']['line']] for sc in ('a', 'b')}}
        print('wrote', os.path.relpath(path, L.ROOT), info['n'], 'rows', 'verify', v['ok'], 'v1', v['v1_name_defects'], 'v3', v['v3_page_defects'], 'remarks not found', summary[k]['rows_with_remarks_not_found'], flush=True)
        diag = {'unit': k, 'headings': {sc: d['m'][sc]['parse']['headings'] for sc in ('a', 'b')}, 'notes': {sc: d['m'][sc]['parse']['notes'] for sc in ('a', 'b')},
                'preamble_tokens': {sc: d['m'][sc]['parse']['preamble_tokens'] for sc in ('a', 'b')}}
        with open(os.path.join(L.WS, 'diagnostics', k + '.json'), 'w', encoding='utf-8') as f:
            json.dump(diag, f, ensure_ascii=False, indent=1)
    with open(os.path.join(L.WS, 'build-summary.json'), 'w', encoding='utf-8') as f:
        json.dump({'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'parser_hash': C.parser_hash(), 'units': summary}, f, ensure_ascii=False, indent=1)
    print('done in %.0f s' % (time.time() - t0))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
