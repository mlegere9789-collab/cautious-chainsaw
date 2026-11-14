"""All numbers of the report rosters/reports/union-ma.md, computed from the files (nothing typed by hand).

    python3 -I ma_stats.py       writes GOVERNANCE/horde/ws-rosters/union-ma/stats.json

Reads: the 24 unit files and their flag files (rosters/data2/union/ma), parse-diagnostics.json, reconciliation.json, changes-after-reconciliation.json,
verify-union-ma.jsonl, rights-evidence.json, the baseline order of battle (baseline/dist/data/oob) and the Official Records text (tmp/library/or27, through
tools/bt/or27_find.py for the citation of a quote).  Standard library only.
"""
import sys, os, re, json, gzip, glob, statistics, subprocess, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import r2lib as R
from ma_sections import SECTIONS, IDENT

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D2 = os.path.join(R2, 'data2')
OUT = os.path.join(D2, 'union', 'ma')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')
LIB = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MA-SSM-1931')
OOB = os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob')
OR1 = os.path.join(ROOT, 'tmp', 'library', 'or27', 'cu31924077699761_djvu.txt')

# OR 27 part 1 statements of strength (quote, what it says, who it is about).  Each quote is verified against the OR text by tools/bt/or27_find.py --verify.
OR_QUOTES = [
    ('u-ma-2nd-massachusetts-infantry', 'there were 294 enlisted men taken into action by this regiment July 3', 'enlisted men only (Col. Cogswell, 13 August 1863)', 294),
    ('u-ma-2nd-massachusetts-infantry', 'Second Massachusetts, 320', 'officers and men carried into action by the Third Brigade (footnote of the brigade report)', 320),
    ('u-ma-13th-massachusetts-infantry', 'went into action with 260 muskets', 'muskets', 260),
    ('u-ma-15th-massachusetts-infantry', 'We went into action with 18 officers and 221 men', '18 officers and 221 men = 239', 239),
    ('u-ma-28th-massachusetts-infantry', 'out of 224 taken into the engagement', 'taken into the engagement', 224),
    ('u-ma-5th-massachusetts-battery-e', 'E, Massachusetts Artillery, 4 officers and 100 men', 'taken into action by the brigade: 4 officers and 100 men = 104', 104),
    ('u-ma-9th-massachusetts-battery', 'Ninth Massachusetts, 4 officers and 100 men', 'taken into action by the brigade: 4 officers and 100 men = 104', 104),
]
OR_JOINT = [('u-ma-19th-massachusetts-infantry', 'numbering but 290 men together', 'the 19th Massachusetts and the 42nd New York together (Col. Devereux); not a figure of the regiment alone')]


def gz_json(path):
    with gzip.open(path, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


def or_cite(quote):
    p = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'or27_find.py'), '--verify', quote, '--part', '1'], capture_output=True, text=True, cwd=ROOT)
    out = p.stdout.strip().splitlines()
    if not out or not out[0].startswith('[OR '):
        return None
    m = re.search(r'\[OR Ser\.I vol\.27 pt\.1, (OR27-1-R\d+) (.*?), p\. ~?(\d+)', out[0])
    o = re.search(r'offsets (\d+)-(\d+)', out[1]) if len(out) > 1 else None
    return {'cite': out[0].strip('[]'), 'report_id': m.group(1) if m else None, 'author': m.group(2) if m else None, 'page': int(m.group(3)) if m else None,
            'offset_from': int(o.group(1)) if o else None, 'offset_to': int(o.group(2)) if o else None}


def baseline_entry(oob_ids):
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


def main():
    units = {u['key']: u for u in json.load(open(os.path.join(D2, 'units.json'), encoding='utf-8'))['units'] if u['army'] == 'union' and u['st'] == 'ma'}
    diag = json.load(open(os.path.join(GOV, 'parse-diagnostics.json'), encoding='utf-8'))
    rec = json.load(open(os.path.join(GOV, 'reconciliation.json'), encoding='utf-8'))
    chg = json.load(open(os.path.join(GOV, 'changes-after-reconciliation.json'), encoding='utf-8'))
    ver = {json.loads(l)['unit']: json.loads(l) for l in open(os.path.join(GOV, 'verify-union-ma.jsonl'), encoding='utf-8')}
    ordered = [s for s in SECTIONS]
    S = {'format': 'ma-stats/1', 'units': {}, 'totals': {}}
    cites = {}
    for key, q, what, n in OR_QUOTES:
        cites[q] = or_cite(q)
    for key, q, what in OR_JOINT:
        cites[q] = or_cite(q)
    tot = collections.Counter()
    for spec in ordered:
        k = spec['key']
        u = units[k]
        path = os.path.join(OUT, spec['file'] + '.jsonl.gz')
        head, segs, meta = R.read_unit(path)
        rows = [r for _, rr in segs for r in rr]
        fl = gz_json(path.replace('.jsonl.gz', '.flags.json.gz'))
        n = len(rows)
        co = collections.Counter(r[2] for r in rows)
        comp = sum(v for c, v in co.items() if len(c) == 1)
        xref = sum(1 for r in rows if re.search(r'\bSee\b', r[3]))
        agent = [i for i, r in enumerate(rows) if re.search(r'\bagents?\b', r[3] + ' ' + r[1], re.I)]
        copy_other = [i for i, r in enumerate(rows) if re.search(r'\b(AI|Claude|Anthropic|LLM|GPT|chatbot|machine[- ]generated|automat\w+)\b', r[3] + ' ' + r[1] + ' ' + r[0])]
        no_rank = [(i, rows[i][0]) for i in range(n) if not rows[i][1]]
        nopage = sum(1 for r in rows if r[4] is None)
        vol = spec['vol']
        ident = IDENT[vol]
        pm = R.PageMap(os.path.join(LIB, ident + '_hocr_pageindex.json.gz'), os.path.join(LIB, ident + '_page_numbers.json'))
        per_leaf = collections.Counter(pm.leaf(r[5]) for r in rows)
        leaves = sorted(per_leaf)
        inner = [per_leaf[l] for l in leaves[1:-1]]
        pages = [r[4] for r in rows if isinstance(r[4], int)]
        on = fl['on_rolls_july_1863']
        yes, no = len(on['yes']), len(on['no'])
        codes = {c: len(v) for c, v in fl['rows'].items()}
        # strength
        oob_ids = u['registry']['oob']
        be = baseline_entry(set(oob_ids)) if oob_ids else {}
        b = be.get(oob_ids[0]) if oob_ids else None
        orf = [(q, what, nn, cites[q]) for kk, q, what, nn in OR_QUOTES if kk == k]
        vals = []
        if b:
            vals.append(b['strength'])
        vals += [x[2] for x in orf]
        lo, hi = (min(vals), max(vals)) if vals else (None, None)
        d = diag['units'][k]
        r_u = rec['units'][k]
        c_u = chg['units'][k]
        ent = {
            'designation': u['designation'], 'file': os.path.relpath(path, R2).replace(os.sep, '/'), 'volume': vol, 'arm': u['arm'],
            'lines': n, 'raw_bytes': meta['raw'], 'gz_bytes': os.path.getsize(path), 'flags_bytes': os.path.getsize(path.replace('.jsonl.gz', '.flags.json.gz')),
            'sha256_raw': meta['sha256'], 'bytes_per_line': round(meta['raw'] / n, 1),
            'by_section': {'FS': co.get('FS', 0), 'NCS': co.get('NCS', 0), 'BAND': co.get('BAND', 0), 'company': comp, 'UNAS': co.get('UNAS', 0), 'no_heading': co.get('', 0)},
            'company_counts': dict(sorted(co.items())), 'xref_lines': xref, 'agent_rows': agent, 'copy_other_rows': copy_other, 'no_rank_rows': no_rank,
            'rows_without_printed_page': nopage, 'leaves': [leaves[0], leaves[-1]], 'leaf_count': leaves[-1] - leaves[0] + 1,
            'printed_pages': [min(pages), max(pages)] if pages else None, 'rows_per_inner_leaf': {'min': min(inner), 'median': statistics.median(inner), 'max': max(inner)} if inner else None,
            'leaves_with_no_line': [l for l in range(leaves[0], leaves[-1] + 1) if l not in per_leaf],
            'codes': codes, 'ocr_uncertain': len(fl['ocr_uncertain']), 'on_rolls': {'yes': yes, 'no': no, 'unknown': n - yes - no},
            'names_gettysburg': len(fl['names_gettysburg']), 'gettysburg_dated': len(fl['gettysburg_dated']),
            'head_kinds': {kk: len(v) for kk, v in fl['head_kinds'].items()}, 'company_inferred': fl.get('company_inferred', []),
            'reviewed_headings': fl.get('reviewed_headings', []), 'running_head_pages': len(fl.get('printed_page_from_running_head', [])),
            'verify': {kk: ver[k]['stats'][kk] for kk in ('rows', 'name_ok', 'remark_ok', 'remark_gap_rows', 'page_ok', 'page_null', 'rank_ok', 'rank_empty', 'order_breaks')}, 'verify_ok': ver[k]['ok'],
            'oob': {'id': oob_ids[0] if oob_ids else None, 'strength': b['strength'] if b else None, 'casualties': b.get('casualties') if b else None, 'designation': b['designation'] if b else None,
                    'days_engaged': b.get('days_engaged') if b else None},
            'or_strength': [{'quote': q, 'what': what, 'value': nn, **cite} for q, what, nn, cite in orf],
            'strength_range': [lo, hi],
            'reconciliation': r_u, 'changes': {kk: c_u[kk] for kk in ('lines_before', 'lines_now', 'lines_added_by_third_head_rule', 'names_cut_differently', 'company_changed_by_reviewed_heading', 'host_lines_with_shorter_remarks')},
            'diag_leaves': d['leaves'], 'diag_headings': d['section_headings'], 'units_earlier_rows': u['existing'][0]['rows'] if u['existing'] else None,
            'or_note': u['or_note'],
        }
        S['units'][k] = ent
        for kk in ('lines', 'raw_bytes', 'gz_bytes', 'flags_bytes', 'xref_lines', 'ocr_uncertain', 'names_gettysburg', 'gettysburg_dated', 'rows_without_printed_page'):
            tot[kk] += ent[kk]
        for kk, v in codes.items():
            tot['code_' + kk] += v
        for kk in ('yes', 'no', 'unknown'):
            tot['on_rolls_' + kk] += ent['on_rolls'][kk]
    S['totals'] = dict(tot)
    S['or_joint'] = [{'unit': kk, 'quote': q, 'what': what, **(cites[q] or {})} for kk, q, what in OR_JOINT]
    S['reconciliation_totals'] = rec['totals']
    S['changes_totals'] = chg['totals']
    with open(os.path.join(GOV, 'stats.json'), 'w', encoding='utf-8') as f:
        json.dump(S, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('units', len(S['units']), 'totals', S['totals'])
    return 0


if __name__ == '__main__':
    sys.exit(main())
