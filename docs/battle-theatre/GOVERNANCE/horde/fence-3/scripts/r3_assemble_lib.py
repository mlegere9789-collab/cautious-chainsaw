"""Library part of the round-3 assembler for fence-3 (source classes, finalize)."""
from r2_assemble_lib import source_class as _sc2

READ3 = set()   # schedule ids whose rows were read in full in round 3 (filled by r3_assemble via env or by r3_read.py)


def source_class(sid):
    if sid.startswith('NPS-HABS'):
        return 'institutional record (NPS Historic American Buildings Survey record held by the Library of Congress; US Government work)'
    if sid == 'LETTERMAN-1866':
        return 'participant account by the Medical Director of the Army of the Potomac (printed 1866)'
    return _sc2(sid)


def finalize3(d, today, r1, r2, patched2, patched3):
    for c in d['citations'].values():
        c['source_class'] = source_class(c['source_id'])
    v = d['verdict']
    d['tier_after'] = {'confirmed': 'documented', 'corrected': 'documented', 'partially_supported': 'inferred', 'unsupported': 'open gap', 'gap': 'open gap'}[v]
    for b in d['blocked_host']:
        for pr in b.get('hosts_probed', []):
            if 'reprobed' not in pr:
                pr['reprobed'] = '2026-11-14: no HTTP answer (curl code 000, the proxy refused the connection), one request, not retried, not worked around'
    d['date'] = today
    d.setdefault('round2', [])
    d.setdefault('round3', [])
    n_doc = sum(1 for x in d['subclaims'] if x['tier'] == 'documented')
    n_inf = sum(1 for x in d['subclaims'] if x['tier'] == 'inferred')
    n_gap = sum(1 for x in d['subclaims'] if x['tier'] == 'open_gap')
    b = d['before']
    auto = ('Shard row (2026-11-04): verdict %s, tier %s, status %s. First close-out (2026-11-13): verdict %s, status %s, %d sub-claims, %d citations. '
            'Second reading (2026-11-14, interrupted by the usage limit) and third reading (%s): verdict %s, status %s, %d sub-claims (documented %d, inferred %d, open gap %d), %d citations.'
            % (b['verdict'], b['tier'], b['status'], r1['verdict'], r1['status'], r1['subclaims'], r1['citations'], today, d['verdict'], d['status'],
               len(d['subclaims']), n_doc, n_inf, n_gap, len(d['citations'])))
    d['changes_from_shard'] = [auto] + [x for x in d.get('changes_from_shard', []) if not x.startswith('Shard row (')]
    d['method'] = ('every quote anchored in and cut from the local raw text (tools/bt/or27_find.py logic for the Official Records, statevol_find.py logic for the state volumes, the 99-text library, the NPS texts '
                   'and HABS records, the 933 Chronicling America newspaper pages, the Sanitary Commission report, the Medical and Surgical History, Letterman 1866), first close-out 2026-11-13, every row read a second time against its own '
                   'quotes (2026-11-14, interrupted) and a third time with the newly local sources (2026-11-16); independent checks: validate.py (span cut by offset from the raw file and compared with the quote, sha256 of each text) '
                   'and verify_or.py (every Official Records quote re-found by text search with tools/bt/or27_find.py and compared with report id, page and offsets)')
    d['status_rule'] = ('closed = the printed claim is settled by quotes (supported, refined or contradicted) and only detail beyond it stays unsupported; open = part of the printed claim lacks support and no web lead exists; '
                        'blocked_host = part of the printed claim rests on a web page that is not reachable from here (listed with its URL)')
    return d
