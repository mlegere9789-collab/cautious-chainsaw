"""Statistics of the Pennsylvania unit files (work item union-pa): every number of the report is computed here, from the files.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_stats.py          (from the repository root)

Reads   data2/union/pa/*.jsonl.gz, *.flags.json.gz, *.cells.json.gz, GOVERNANCE/horde/ws-rosters/union-pa/diag/*.json, reconciliation.json,
        tmp/library/rosters/union-pa-work/unitinfo-*.json, the baseline order of battle, the local text of Pennsylvania at Gettysburg (1914, vol. 2)
Writes  GOVERNANCE/horde/ws-rosters/union-pa/stats.json
"""
import os, sys, json, gzip, re, csv, glob, collections, statistics, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU
import pa_dates as D
R = L.R
OUT = os.path.join(L.D2, 'union', 'pa')
OOB = os.path.join(L.ROOT, 'baseline', 'dist', 'data', 'oob')
GETT_TXT = os.path.join(L.ROOT, 'tmp', 'library', 'misc', 'pennsgettysburg02reynrich_djvu.txt')
EARLIER_INSCR = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'PA', 'strength_present_inscriptions.csv')


def gz_json(p):
    with gzip.open(p, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


def baseline(oob_ids):
    found = {}
    for f in sorted(glob.glob(os.path.join(OOB, '*.json'))):
        d = json.load(open(f, encoding='utf-8'))

        def walk(o):
            if isinstance(o, dict):
                i = o.get('regiment_id') or o.get('battery_id')
                if i in oob_ids:
                    found[i] = o
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(d)
    return found


def inscriptions(units_meta):
    """Monument inscriptions of Pennsylvania at Gettysburg, vol. II (1914), as the earlier family run mapped them to units; each first line is searched again in the local text."""
    raw = open(GETT_TXT, encoding='utf-8', errors='replace').read()
    sha = hashlib.sha256(open(GETT_TXT, 'rb').read()).hexdigest()
    out = {}
    for r in csv.DictReader(open(EARLIER_INSCR, encoding='utf-8')):
        key = r['inscription_text'].split(' / ')[0].strip()
        pat = r'\s+'.join(re.escape(t) for t in key.split())
        ms = [m.start() for m in re.finditer(pat, raw)]
        out.setdefault(r['unit_id'], []).append({'quote': key, 'found_in_local_text': bool(ms), 'offset_in_local_text': ms[0] if ms else None,
                                                 'officers': r['officers'] or None, 'men': r['men'] or None, 'total': int(r['total']) if r['total'] else None,
                                                 'mapping_note': r['note'], 'earlier_locator_line': int(r['locator_txt_line'])})
    return out, {'path': 'tmp/library/misc/pennsgettysburg02reynrich_djvu.txt', 'bytes': len(raw.encode('utf-8')), 'sha256': sha}


def main():
    units_meta = {x['key']: x for x in json.load(open(os.path.join(L.D2, 'units.json'), encoding='utf-8'))['units'] if x['key'].startswith('u-pa-')}
    insc, insc_src = inscriptions(units_meta)
    rec = json.load(open(os.path.join(L.GOV, 'reconciliation.json'))) if os.path.exists(os.path.join(L.GOV, 'reconciliation.json')) else {'units': {}, 'totals': {}}
    ver = {}
    vp = os.path.join(L.GOV, 'verify-union-pa.jsonl')
    if os.path.exists(vp):
        for ln in open(vp, encoding='utf-8'):
            ln = ln.strip()
            if ln.startswith('{'):
                o = json.loads(ln)
                ver[o['unit']] = o
    S = {'units': {}}
    tot = collections.Counter()
    code_tot = collections.Counter()
    for u in PU.U:
        key = u['key']
        path = os.path.join(OUT, key[5:] + '.jsonl.gz')
        if not os.path.exists(path):
            continue
        head, segs, meta = R.read_unit(path)
        rows = [r for _, rr in segs for r in rr]
        n = len(rows)
        text, pm, _ = L.load_text(u['vol'])
        fl = gz_json(path.replace('.jsonl.gz', '.flags.json.gz'))
        diag = json.load(open(os.path.join(L.GOV, 'diag', key[5:] + '.json'), encoding='utf-8'))
        co = collections.Counter(r[2] for r in rows)
        leaves = collections.Counter(pm.leaf(r[5]) for r in rows)
        ls = sorted(leaves)
        pages = [r[4] for r in rows if isinstance(r[4], int)]
        codes = {c: len(v) for c, v in fl['rows'].items()}
        on = fl['on_rolls_july_1863']
        gett = [i for i, r in enumerate(rows) if R.GETTYSBURG_RE.search(r[3])]
        jul = []
        for i, r in enumerate(rows):
            toks = r[3].split()
            dts = D.read_dates(toks)
            for (a, b, dt) in dts[1:] if dts and dts[0][0] <= 1 else dts:
                if dt[0] == 1863 and dt[1] == 7 and dt[2] in (1, 2, 3):
                    jul.append(i)
                    break
        oob_ids = units_meta[key]['registry']['oob']
        be = baseline(set(oob_ids)) if oob_ids else {}
        b = be.get(oob_ids[0]) if oob_ids else None
        insc_for = []
        for oid in oob_ids:
            insc_for += insc.get(oid, [])
        # the three regiments the earlier run read as units of their own
        xmap = {'u-pa-46th-pennsylvania-infantry': 'X-46PA', 'u-pa-107th-pennsylvania-infantry': 'X-107PA', 'u-pa-139th-pennsylvania-infantry': 'X-139PA'}
        if key in xmap:
            insc_for += insc.get(xmap[key], [])
        v = ver.get(key)
        ent = {
            'designation': units_meta[key]['designation'], 'arm': units_meta[key]['arm'], 'volume': u['vol'], 'bates_number': u['n'], 'file': 'union/pa/' + key[5:] + '.jsonl.gz',
            'lines': n, 'raw_bytes': meta['raw'], 'gz_bytes': os.path.getsize(path), 'flags_bytes': os.path.getsize(path.replace('.jsonl.gz', '.flags.json.gz')),
            'cells_bytes': os.path.getsize(path.replace('.jsonl.gz', '.cells.json.gz')), 'sha256_raw': meta['sha256'], 'bytes_per_line': round(meta['raw'] / n, 1) if n else None,
            'company_counts': dict(sorted(co.items())), 'leaves': [ls[0], ls[-1]] if ls else None, 'leaf_range_searched': [u['a'], u['b']] + ([list(x) for x in u['also']] if u['also'] else []),
            'printed_pages': [min(pages), max(pages)] if pages else None, 'rows_per_leaf': {'min': min(leaves.values()), 'median': statistics.median(leaves.values()), 'max': max(leaves.values())} if leaves else None,
            'codes': codes, 'ocr_uncertain': len(fl['ocr_uncertain']), 'on_rolls': {'yes': len(on['yes']), 'no': len(on['no']), 'unknown': n - len(on['yes']) - len(on['no'])},
            'remark_names_gettysburg': len(gett), 'remark_event_dated_1_to_3_july_1863': len(jul),
            'lost_name_lines': len(diag['lost_name_lines']), 'orphan_lines': len(diag['orphans']), 'company_gaps': diag.get('company_gaps', []),
            'oob': {'id': oob_ids[0] if oob_ids else None, 'strength': b.get('strength') if b else None, 'casualties': b.get('casualties') if b else None},
            'inscriptions': insc_for, 'verify': {k: v['stats'][k] for k in ('rows', 'name_ok', 'remark_ok', 'remark_gap_rows', 'page_ok', 'page_null', 'rank_ok', 'rank_empty', 'order_breaks')} if v else None,
            'verify_ok': v['ok'] if v else None, 'reconciliation': rec['units'].get(key),
        }
        S['units'][key] = ent
        for k2 in ('lines', 'raw_bytes', 'gz_bytes', 'flags_bytes', 'cells_bytes', 'ocr_uncertain', 'remark_names_gettysburg', 'remark_event_dated_1_to_3_july_1863', 'lost_name_lines', 'orphan_lines'):
            tot[k2] += ent[k2]
        for c, k2 in codes.items():
            code_tot[c] += k2
        for k2 in ('yes', 'no', 'unknown'):
            tot['on_rolls_' + k2] += ent['on_rolls'][k2]
    S['totals'] = dict(tot)
    S['code_totals'] = dict(code_tot)
    S['inscription_source'] = insc_src
    S['reconciliation_totals'] = rec.get('totals')
    json.dump(S, open(os.path.join(L.GOV, 'stats.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('units', len(S['units']), dict(tot))


if __name__ == '__main__':
    main()
