"""Every number of the conf-nc report, computed from the files (unit files, flag files, the build summary, the reconciliation, the Moore recapitulation, the baseline order of
battle).  Nothing is typed by hand.

    python3 -I nc_stats.py       writes GOVERNANCE/horde/ws-rosters/conf-nc/stats.json
"""
import os, sys, json, gzip, collections, re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_units as U
import r2lib as R

OOB = os.path.join(L.ROOT, 'baseline', 'dist', 'data', 'oob')


def jload(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def baseline():
    """oob id -> {designation, strength, casualties}"""
    out = {}
    for fn in ('confederate_regiments_first_corps.json', 'confederate_regiments_second_corps.json', 'confederate_regiments_third_corps.json'):
        for r in jload(os.path.join(OOB, fn))['regiments']:
            out[r['regiment_id']] = {'designation': r['designation'], 'strength': r.get('strength'), 'casualties': r.get('casualties'), 'file': fn}
    art = jload(os.path.join(OOB, 'confederate_artillery.json'))
    for corps in ('first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery'):
        for b in art[corps]['battalions']:
            for bt in b.get('batteries', []):
                out[bt['battery_id']] = {'designation': bt['designation'], 'strength': bt.get('strength'), 'casualties': bt.get('casualties'), 'file': 'confederate_artillery.json'}
    return out


def read_flags(path):
    with gzip.open(path, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


def main():
    units_master = {u['key']: u for u in jload(os.path.join(L.D2, 'units.json'))['units']}
    base = baseline()
    recap = jload(os.path.join(L.WS, 'recap.json'))['entries']
    summ = jload(os.path.join(L.WS, 'build-summary.json'))
    rec = jload(os.path.join(L.WS, 'reconciliation.json'))['units']
    clark = jload(os.path.join(L.D2, 'sources', 'NC-CLARK-1901.json')) if os.path.exists(os.path.join(L.D2, 'sources', 'NC-CLARK-1901.json')) else {}
    cnotes = clark.get('notes', [])
    ccp = os.path.join(L.WS, 'clark-notes-check.json')
    clark_check = jload(ccp) if os.path.exists(ccp) else {}
    out = {'format': 'conf-nc-stats/1', 'units': {}, 'totals': {}}
    tot = collections.Counter()
    gaps = []
    for (key, desig, arm, vol, num, kind, co) in U.UNITS:
        path = os.path.join(L.D2, 'confederate', 'nc', key[len('c-nc-'):] + '.jsonl.gz')
        e = {'key': key, 'designation': desig, 'arm': arm, 'moore': {'volume': vol, 'number': num, 'kind': kind, 'company': co},
             'identification': U.IDENT.get(key)}
        m = units_master.get(key, {})
        e['earlier_rows'] = (m.get('existing') or [{}])[0].get('rows') if m.get('existing') else 0
        oob_ids = (m.get('registry') or {}).get('oob') or []
        b = next((base[i] for i in oob_ids if i in base), None)
        e['baseline'] = {'id': oob_ids[0] if oob_ids else None, 'strength': b['strength'] if b else None, 'casualties': b['casualties'] if b else None, 'designation': b['designation'] if b else None}
        rk = '%s-%s' % (num, kind)
        r = recap.get(rk)
        if r:
            e['printed_total'] = {'value': r['value'], 'status': r['status'], 'covers': 'the whole regiment or battalion, every company' if co else 'the regiment or battalion',
                                  'figures': {sc: v['printed_figure'] for sc, v in r['scans'].items()}, 'quote': {sc: [v['quote'], v['offset'], v['text_id']] for sc, v in r['scans'].items()}}
        if not os.path.exists(path):
            e['file'] = None
            out['units'][key] = e
            gaps.append(key)
            continue
        head, segs, meta = R.read_unit(path)
        rows = [x for sg, rs in segs for x in rs]
        flags = read_flags(path[:-len('.jsonl.gz')] + '.flags.json.gz')
        n = head['n']
        s = summ['units'][key]
        cc = collections.Counter(x[2] for x in rows)
        on = flags['on_rolls_july_1863']
        e.update({
            'file': os.path.relpath(path, L.ROOT).replace(os.sep, '/'), 'lines': n, 'raw_bytes': meta['raw'], 'gz_bytes': os.path.getsize(path), 'sha256_raw': meta['sha256'],
            'segments': [{'t': sg['t'], 'rows': len(rs)} for sg, rs in segs], 'primary': s['primary'], 'primary_text': segs[0][0]['t'],
            'company_counts': dict(sorted(cc.items())), 'rank_printed': sum(1 for x in rows if not x[1].startswith('^') and x[1]), 'with_remarks': sum(1 for x in rows if x[3]),
            'page_null': sum(1 for x in rows if x[4] is None),
            'flags': {c: len(v) for c, v in flags['rows'].items()}, 'ocr_uncertain': len(flags['ocr_uncertain']),
            'on_rolls': {'yes': len(on['yes']), 'no': len(on['no']), 'unknown': n - len(on['yes']) - len(on['no'])},
            'names_gettysburg': len(flags['names_gettysburg']), 'gettysburg_dated': len(flags['gettysburg_dated']),
            'head_kinds': {k: len(v) for k, v in flags['head_kinds'].items()}, 'company_inferred': [{k: c[k] for k in ('first_row', 'last_row', 'n_rows', 'co', 'rule', 'heading')} for c in flags['company_inferred']],
            'company_skips': [{k: c[k] for k in ('first_row', 'last_row', 'n_rows', 'co', 'rule', 'heading')} for c in flags.get('company_skips', [])],
            'verify': {'ok': s['verify_ok'], 'v1': s['v1'], 'v3': s['v3'], 'remark_ok': s['remark_ok'], 'remark_empty': s['remark_empty'], 'remark_gap_rows': s['remark_gap_rows'], 'remarks_not_found': s['rows_with_remarks_not_found']},
            'scan': {'why': s['why'], 'rows_by_scan': s['rows_by_scan'], 'heading_defects': s['heading_defects'], 'dups_dropped': {k: v for k, v in s['dups_dropped'].items()}, 'section': s['section']},
        })
        mine = [x for x in cnotes if key in x['units']]
        cu = (clark_check.get('coverage') or {}).get(key, {})
        sf = [(x['strength_figure'], x['id']) for x in mine if x.get('strength_figure') is not None]
        e['clark'] = {'notes': len(mine), 'by_kind': dict(collections.Counter(x['kind'] for x in mine)), 'ids': [x['id'] for x in mine],
                      'strength_low': min(v for v, i in sf) if sf else None, 'strength_high': max(v for v, i in sf) if sf else None, 'strength_notes': [i for v, i in sf],
                      'scan': cu.get('scan'), 'chapters': [c['label'] for c in cu.get('chapters', [])]}
        rr = rec.get(key)
        if rr:
            e['second_scan'] = rr['second_scan']
            e['earlier'] = rr.get('earlier')
        # notes and heading rules from the diagnostics
        dp = os.path.join(L.WS, 'diagnostics', key + '.json')
        if os.path.exists(dp):
            dg = jload(dp)
            sc = s['primary']
            e['notes'] = [{'off': x['off'], 'co': x.get('co'), 'text': x['text'][:200]} for x in dg['notes'].get(sc, []) if (not co or x.get('co') == co)]
            e['heading_rules'] = dict(collections.Counter(h['rule'] for h in dg['headings'].get(sc, []) if (not co or h['assigned'] == co)))
            e['preamble_tokens'] = dg['preamble_tokens'].get(sc)
        out['units'][key] = e
        tot['lines'] += n
        tot['raw_bytes'] += meta['raw']
        tot['gz_bytes'] += os.path.getsize(path)
        tot['units_with_file'] += 1
        for c, v in e['flags'].items():
            tot['flag_' + c] += v
        tot['ocr_uncertain'] += e['ocr_uncertain']
        for k in ('yes', 'no', 'unknown'):
            tot['on_rolls_' + k] += e['on_rolls'][k]
        tot['names_gettysburg'] += e['names_gettysburg']
        tot['gettysburg_dated'] += e['gettysburg_dated']
        tot['page_null'] += e['page_null']
        tot['primary_' + e['primary_text']] += 1
        for k, v in e['head_kinds'].items():
            tot['head_' + k] += v
    tot['clark_notes'] = len(cnotes)
    tot['clark_units_with_notes'] = sum(1 for u in out['units'].values() if u.get('clark', {}).get('notes'))
    tot['clark_units_without_notes'] = sum(1 for u in out['units'].values() if not u.get('clark', {}).get('notes'))
    tot['clark_notes_second_scan_agrees'] = sum(1 for x in cnotes if x['second_scan'].get('agrees') is True)
    tot['clark_notes_second_scan_other'] = sum(1 for x in cnotes if x['second_scan'].get('agrees') is not True)
    tot['clark_notes_page_image'] = sum(1 for x in cnotes if x.get('page_image_check'))
    tot['clark_notes_page_image_viewed'] = sum(1 for x in cnotes if (x.get('page_image_check') or {}).get('how') == 'viewed')
    tot['clark_notes_with_strength'] = sum(1 for x in cnotes if x.get('strength_figure') is not None)
    out['clark_kinds'] = dict(collections.Counter(x['kind'] for x in cnotes))
    out['totals'] = dict(tot)
    out['units_without_file'] = gaps
    with open(os.path.join(L.WS, 'stats.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('units with a file', tot['units_with_file'], 'lines', tot['lines'], 'raw', tot['raw_bytes'], 'gz', tot['gz_bytes'], 'without file', gaps)
    return 0


if __name__ == '__main__':
    sys.exit(main())
