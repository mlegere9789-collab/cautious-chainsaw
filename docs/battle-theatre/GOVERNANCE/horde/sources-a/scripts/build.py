"""sources-a close-out builder (round 2, 2026-11-16). Run with  python3 -I build.py [--check]

Reads  rows_a.py rows_b.py rows_c.py (the per-row data: claims, tiers, quotes)  and the registry written by stexts.py,
matches EVERY quote in the registered local text (whitespace/hyphenation-normalised, case-sensitive; slib.find_quote),
and writes
    docs/battle-theatre/GOVERNANCE/evidence_corrections/sources-a.jsonl   (one line per row of horde/sources-a/results.jsonl)
A quote that is not found stops the build (nothing is written). Statuses and summaries are derived from the sub-claims, not typed.
"""
import os, sys, json, re, datetime, hashlib, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import slib, qlib  # noqa: E402

ROOT = slib.ROOT
SHARD = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/sources-a')
OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/sources-a.jsonl')
BUILT = '2026-11-16'
REG = qlib.REG

CLASS = {
    'LOC': 'primary catalogue record of the holding library (Library of Congress, Geography and Map Division); description derived from published bibliography per the record',
    'IA': 'Internet Archive scan of a printed government publication (OCR text, single witness)',
    'NPS': 'National Park Service document or web page (United States government work), secondary to the 1863 events; primary for what NPS did and used',
    'EPT': 'machine-written metadata of a public USGS lidar dataset (read from the LAZ headers)',
    'OWN': 'own lookup record written by this shard (HTTP response headers)',
    'ROBOTS': 'robots.txt of the host, as fetched',
}


def src_class(key):
    if key.startswith('LOC'):
        return CLASS['LOC']
    if key.startswith('IA'):
        return CLASS['IA']
    if key.startswith('NPS'):
        return CLASS['NPS']
    if key.startswith('EPT'):
        return CLASS['EPT']
    if key.startswith('OWN'):
        return REG[key]['source_class'] if key in ('OWN-EPT-SOURCES-SUMMARY', 'OWN-NPS-MANIFEST') else CLASS['OWN']
    if key.startswith('ROBOTS'):
        return CLASS['ROBOTS']
    if key.startswith('PROJ') or key.startswith('OR-'):
        return REG[key]['source_class']
    return REG[key].get('source_class')


def cite(c):
    """resolve one citation spec {src, quote, role, note, locator} against its registered local text"""
    key = c['src']
    if key not in REG or REG[key].get('missing'):
        raise SystemExit('source %s not registered or missing' % key)
    hits = qlib.find(key, c['quote'], maxn=50)
    if not hits:
        raise SystemExit('QUOTE NOT FOUND in %s: %r' % (key, c['quote'][:160]))
    # first occurrence; a locator may choose a later one ('occurrence': n, 1-based)
    n = c.get('occurrence', 1)
    h = hits[min(n, len(hits)) - 1]
    r = REG[key]
    out = {
        'source_id': key,
        'source_class': src_class(key),
        'part': c.get('part'), 'report_id': c.get('report_id'), 'report_author': c.get('report_author'), 'page_basis': c.get('page_basis'), 'printed_page': c.get('printed_page'),
        'pdf_page': h['pdf_page'],
        'quote': c['quote'],
        'offset': h['offset'],
        'occurrences_in_text': len(hits),
        'local_path': r['local_path'],
        'local_sha256': r['local_sha256'],
        'match': 'exact (whitespace-normalised, case-sensitive)',
        'url': r.get('url'),
        'retrieved': r.get('retrieved'),
        'role': c.get('role', 'supports'),
        'note': c.get('note'),
    }
    if c.get('locator'):
        out['locator'] = c['locator']
    if r.get('raw_sha256'):
        out['raw_sha256'] = r['raw_sha256']
    if r.get('raw_path'):
        out['raw_path'] = r['raw_path']
    return out


def subclaim(sc):
    cites = [cite(c) for c in sc.get('cites', [])]
    d = {'sc': sc['sc'], 'kind': sc['kind'], 'claim': sc['claim'], 'tier': sc['tier'], 'support': sc['support'], 'citations': cites}
    for k in ('note', 'earlier_reading', 'computation', 'source_blocked'):
        if sc.get(k):
            d[k] = sc[k]
    # consistency rules (the Law): 'documented' needs a matched citation that supports; 'supported' needs one
    if sc['tier'] == 'documented' and not any(c['role'] == 'supports' for c in cites):
        raise SystemExit('%s: tier documented without a supporting citation' % sc['sc'])
    if sc['support'] in ('supported', 'partial') and not any(c['role'] == 'supports' for c in cites):
        raise SystemExit('%s: support %s without a supporting citation' % (sc['sc'], sc['support']))
    if sc['support'] == 'blocked_host' and sc['tier'] == 'documented':
        raise SystemExit('%s: blocked_host cannot be documented' % sc['sc'])
    return d


def derive_status(subs, row):
    if any(s['support'] == 'blocked_host' for s in subs) or row.get('blocked_host'):
        return 'blocked_host'
    if any(s['tier'] == 'open_gap' or s['support'] in ('unsupported', 'conflict') for s in subs) or row.get('stays_unsupported'):
        return 'open_gaps'
    return 'closed'


def build_row(row, prev):
    subs = [subclaim(s) for s in row['sub_claims']]
    tiers, sup = {}, {}
    for s in subs:
        tiers[s['tier']] = tiers.get(s['tier'], 0) + 1
        sup[s['support']] = sup.get(s['support'], 0) + 1
    st = derive_status(subs, row)
    d = {
        'id': row['id'],
        'shard': 'sources-a',
        'requirement': 'R12',
        'catalog_row': prev.get('catalog_row'),
        'previous_status': prev.get('status'),
        'previous_tier': prev.get('tier'),
        'previous_verdict': prev.get('verdict'),
        'verdict': row['verdict'],
        'status': st,
        'row_status': st,
        'pdf_claim': row['pdf_claim'],
        'corrected_claim': row['corrected_claim'],
        'tier_summary': tiers,
        'support_summary': sup,
        'sub_claims': subs,
        'stays_unsupported': row.get('stays_unsupported', []),
        'conflicts_carried': row.get('conflicts_carried', []),
        'register_refs': list(row.get('register_refs', [])) + (['sources-a-EG-11'] if (row.get('blocked_host') or any(s['support'] == 'blocked_host' for s in subs)) and 'sources-a-EG-11' not in row.get('register_refs', []) else []),
        'blocked_host': row.get('blocked_host', []),
        'product_consequence': row.get('product_consequence', []),
        'recheck': {
            'or_recheck_lines': 0,
            'or_recheck_note': 'horde/OR-RECHECK/results.jsonl holds no line of shard sources-a (grep: 0); the rows cite no Official Records passage',
            'quotes_matched': sum(len(s['citations']) for s in subs),
            'method': 'slib.find_quote on the registered local text of each source (stexts.py); offsets are characters in that text',
        },
        'lookups': row.get('lookups', []),
        'changes_vs_previous': row.get('changes_vs_previous', []),
        'notes': row.get('notes'),
        'built': BUILT,
    }
    return d


def main():
    check = '--check' in sys.argv
    partial = '--partial' in sys.argv
    prev = {}
    for l in open(os.path.join(SHARD, 'results.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        prev[r['id']] = r
    rows = []
    for mod in ('rows_a', 'rows_b', 'rows_d', 'rows_c'):
        m = importlib.import_module(mod)
        rows += m.ROWS(prev) if callable(getattr(m, 'ROWS', None)) else m.ROWS
    ids = [r['id'] for r in rows]
    assert len(ids) == len(set(ids)), 'duplicate ids'
    missing = [i for i in prev if i not in ids]
    extra = [i for i in ids if i not in prev]
    if extra or (missing and not partial):
        raise SystemExit('rows missing %s extra %s' % (missing, extra))
    order = [i for i in prev.keys() if i in ids]
    out = []
    for i in order:
        row = next(r for r in rows if r['id'] == i)
        out.append(build_row(row, prev[i]))
    if check or partial:
        print('check ok: %d rows, %d citations matched' % (len(out), sum(r['recheck']['quotes_matched'] for r in out)))
        return
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        for d in out:
            f.write(json.dumps(d, ensure_ascii=False) + '\n')
    cnt = {}
    for d in out:
        cnt[(d['verdict'], d['status'])] = cnt.get((d['verdict'], d['status']), 0) + 1
    print('wrote', OUT, len(out), 'rows;', sum(r['recheck']['quotes_matched'] for r in out), 'citations matched')
    for k, v in sorted(cnt.items()):
        print('  ', k, v)


if __name__ == '__main__':
    main()
