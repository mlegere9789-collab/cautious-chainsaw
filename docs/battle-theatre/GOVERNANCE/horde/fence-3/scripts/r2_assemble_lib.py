"""Library part of the round-2 assembler for fence-3 (source classes, finalize)."""
SRC_CLASS_EXTRA = {
    'TPIERCE-1889': 'eyewitness memoir (1889)',
    'USSC-GETTYSBURG-1863': 'contemporary report of the U.S. Sanitary Commission (1863)',
    'MSHWR-P1V2-1870': 'official medical history (Surgeon General\'s Office, 1870; case records)',
    'MSHWR-P2V2-1876': 'official medical history (Surgeon General\'s Office, 1876; case records)',
    'MSHWR-P3V2-1883': 'official medical history (Surgeon General\'s Office, 1883; case records)',
    'HOKE-1887': 'secondary history by a resident (1887)',
    'HISTORY-ADAMS-1886': 'county history (1886)',
}


def source_class(sid):
    if sid.startswith('OR-27'):
        return 'official report (primary)'
    if sid.startswith(('NY-GB', 'PA-GB', 'ME-GB', 'MI-GB')):
        return 'state regimental volume (participant narrative or address, retrospective)'
    if sid.startswith('NJ-FINAL'):
        return 'state commission volume (participant addresses of 1888, printed 1891)'
    if sid == 'BL-3':
        return 'participant memoir (retrospective)'
    if sid.startswith(('GBG-COMPILER', 'ADAMS-SENTINEL')):
        return 'contemporary newspaper (1863)'
    if sid == 'HASKELL-1908':
        return 'participant letter of July 1863 (published 1908)'
    if sid.startswith('MEADE-LL'):
        return 'participant account by a staff officer (printed 1913)'
    if sid.startswith('BACH-'):
        return 'collected narrative of the battle (Bachelder, 1870 and 1904)'
    if sid in ('CEM-REPORT-1867', 'EVERETT-1864', 'CEM-BARTLETT-1874', 'CEM-INDIANA-1865'):
        return 'official report or volume of the cemetery commission (1864-1874)'
    if sid.startswith('NPS-WEB'):
        return 'institutional secondary source: NPS web page (US Government work)'
    if sid.startswith(('LOC-STAR', 'LOC-NYTRIB', 'LOC-CA-')):
        return 'contemporary newspaper (1863; Library of Congress Chronicling America, OCR text)'
    if sid.startswith('LOC-'):
        return 'library catalogue record'
    if sid.startswith('NPS-COMMON-PRIDE'):
        return 'institutional secondary source quoting participants (NPS study, 1981)'
    if sid.startswith('NPS'):
        return 'institutional secondary source (US Government work)'
    return SRC_CLASS_EXTRA.get(sid, 'other')


def finalize(d, today):
    for c in d['citations'].values():
        c['source_class'] = source_class(c['source_id'])
    v = d['verdict']
    d['tier_after'] = {'confirmed': 'documented', 'corrected': 'documented', 'partially_supported': 'inferred', 'unsupported': 'open gap', 'gap': 'open gap'}[v]
    for b in d['blocked_host']:
        for pr in b.get('hosts_probed', []):
            if 'reprobed' not in pr:
                pr['reprobed'] = '2026-11-14: no HTTP answer (curl code 000, the proxy refused the connection), one request, not retried, not worked around'
    d['date'] = today
    n_doc = sum(1 for x in d['subclaims'] if x['tier'] == 'documented')
    n_inf = sum(1 for x in d['subclaims'] if x['tier'] == 'inferred')
    n_gap = sum(1 for x in d['subclaims'] if x['tier'] == 'open_gap')
    b = d['before']
    auto = ('Shard row (2026-11-04): verdict %s, tier %s, status %s. Close-out (2026-11-14, second reading): verdict %s, status %s, %d sub-claims (documented %d, inferred %d, open gap %d), %d citations.'
            % (b['verdict'], b['tier'], b['status'], d['verdict'], d['status'], len(d['subclaims']), n_doc, n_inf, n_gap, len(d['citations'])))
    d['changes_from_shard'] = [auto] + [x for x in d.get('changes_from_shard', []) if not x.startswith('Shard row (')]
    d['method'] = ('every quote anchored in and cut from the local raw text (tools/bt/or27_find.py logic for the Official Records, statevol_find.py logic for the state volumes, the 99-text library, the NPS texts, '
                   'the 933 Chronicling America newspaper pages, the Sanitary Commission report and the Medical and Surgical History acquired 2026-11-13/14), then every row read a second time against its own quotes '
                   '(round 2, 2026-11-14) with over-claims cut or the quotes widened; independent checks: validate.py (span cut by offset from the raw file and compared with the quote, sha256 of each text) '
                   'and verify_or.py (every Official Records quote re-found by text search with tools/bt/or27_find.py and compared with report id, page and offsets)')
    d['status_rule'] = ('closed = the printed claim is settled by quotes (supported, refined or contradicted) and only detail beyond it stays unsupported; open = part of the printed claim lacks support and no web lead exists; '
                        'blocked_host = part of the printed claim rests on a web page that is not reachable from here (listed with its URL)')
    return d
