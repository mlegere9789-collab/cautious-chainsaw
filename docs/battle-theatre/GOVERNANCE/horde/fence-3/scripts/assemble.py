import sys, json, re, os
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import rows_a, rows_b, rows_c, rows_d, rows_e

ROOT = '/home/user/cautious-chainsaw'
OUT = ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
os.makedirs(os.path.dirname(OUT), exist_ok=True)

ORDER = []
for mod, names in [(rows_a, ['S053', 'S054', 'S055', 'S056', 'S057']),
                   (rows_b, ['S058', 'S059', 'S060', 'S061', 'S062']),
                   (rows_c, ['S063', 'S064', 'S065', 'S066', 'S067', 'S068', 'S069', 'S070', 'S071', 'S072', 'S073', 'S074', 'S075', 'S076']),
                   (rows_d, ['S077', 'S078', 'S079']),
                   (rows_e, ['S080', 'S081', 'S082', 'S083', 'S084', 'S085', 'S086', 'S087', 'S088'])]:
    for n in names:
        ORDER.append(getattr(mod, n))


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
    if sid == 'TPIERCE-1889':
        return 'eyewitness memoir (1889)'
    if sid in ('CEM-REPORT-1867', 'EVERETT-1864', 'CEM-BARTLETT-1874', 'CEM-INDIANA-1865'):
        return 'official report or volume of the cemetery commission (1864-1874)'
    if sid.startswith('NPS-WEB'):
        return 'institutional secondary source: NPS web page (US Government work)'
    if sid.startswith(('LOC-STAR', 'LOC-NYTRIB')):
        return 'contemporary newspaper (1863; Library of Congress Chronicling America, OCR text)'
    if sid.startswith('LOC-'):
        return 'library catalogue record'
    if sid.startswith('NPS-COMMON-PRIDE'):
        return 'institutional secondary source quoting participants (NPS study, 1981)'
    if sid.startswith('NPS'):
        return 'institutional secondary source (US Government work)'
    return 'other'


HOSTS = [('stonesentinels', 'gettysburg.stonesentinels.com'), ('HistoryNet', 'www.historynet.com'), ('Gettysburg Daily', 'www.gettysburgdaily.com'), ('gettysburgdaily', 'www.gettysburgdaily.com'),
         ('savasbeatie', 'www.savasbeatie.com'), ('blogs.loc.gov', 'blogs.loc.gov'), ('American Battlefield Trust', 'www.battlefields.org'), ('ABT', 'www.battlefields.org'), ('Eyewitness to History', 'www.eyewitnesstohistory.com')]
PROBED = {'gettysburg.stonesentinels.com': 'connect_rejected 2026-11-13T21:00:03Z', 'www.historynet.com': 'connect_rejected 2026-11-13T21:00:05Z', 'www.gettysburgdaily.com': 'connect_rejected 2026-11-13T21:00:07Z',
          'www.savasbeatie.com': 'connect_rejected 2026-11-13T21:00:08Z', 'www.battlefields.org': 'connect_rejected 2026-11-13T21:00:10Z', 'blogs.loc.gov': 'connect 403 (curl: CONNECT tunnel failed), 2026-11-13 about 20:5x UTC',
          'www.eyewitnesstohistory.com': 'connect 403 (curl: CONNECT tunnel failed, agent proxy connect_rejected), 2026-11-13 about 21:4x UTC'}

rows = []
for fn in ORDER:
    rows.append(fn())
rows.sort(key=lambda d: d['schedule_id'])
counts = {}
st = {}
for d in rows:
    for c in d['citations'].values():
        c['source_class'] = source_class(c['source_id'])
    v = d['verdict']
    d['tier_after'] = {'confirmed': 'documented', 'corrected': 'documented', 'partially_supported': 'inferred', 'unsupported': 'open gap', 'gap': 'open gap'}[v]
    d['tier_after_rule'] = 'documented = the corrected claim as written is carried by documented sub-claims (leftovers listed under unsupported); inferred = some printed claims lack any source; open gap = nothing supported'
    for b in d['blocked_host']:
        u = b.get('url', '')
        txt = u + ' ' + b.get('what_to_read', '')
        probes = []
        seen = set()
        for key, host in HOSTS:
            if key in txt and host not in seen:
                seen.add(host)
                probes.append({'host': host, 'result': PROBED.get(host, 'refused'), 'probed': '2026-11-13, one request by this close-out, not retried, not worked around'})
        if probes:
            b['hosts_probed'] = probes
        b['url_known'] = u.startswith('http')
        if u.startswith(('Pennsylvania State Archives', 'National Archives')):
            b['kind'] = 'offline_archive'
            b['note'] = 'Archive records, not a web page: a visit or a request by the owner; not done (owner-only act).'
        elif not b['url_known']:
            b['note'] = 'The plan prints the source key and title only; no URL is recorded in the plan text or the shard files, and none is invented here.'
        b['what_to_read'] = b['what_to_read'].replace('at the fence-2 probe', 'at the probes of 2026-11-13 (the fence-2 close-out and this one)').replace('when probed by the fence-2 close-out', 'when probed on 2026-11-13 (the fence-2 close-out and this one)')
    d['date'] = '2026-11-13'
    d['workstream'] = 'bt-evidence'
    d['method'] = ('every quote re-matched in the local raw text (tools/bt/or27_find.py logic, statevol_find.py logic, the 99-text library and the NPS texts) by tmp/fence-3/scripts; '
                   'quote_recheck lines of OR-RECHECK/results.jsonl applied (4 quotes found exactly, 1 low-confidence fragment of the shard\'s own prose); '
                   'NPS pages re-read at www.nps.gov and the Library of Congress API (reachable); 1863 newspaper pages (Evening Star, New-York Daily Tribune, 19-21 Nov 1863) read through the Library of Congress JSON API and tile.loc.gov, page-image regions viewed for two figures; local LOC derivatives viewed; sources: Official Records vol. 27, state regimental volumes, the 99-text library, NPS documents and pages')
    counts[v] = counts.get(v, 0) + 1
    st[d['status']] = st.get(d['status'], 0) + 1

open(OUT, 'w', encoding='utf-8').write('\n'.join(json.dumps(d, ensure_ascii=False) for d in rows) + '\n')
print('wrote', OUT, len(rows), 'lines', counts)
print('status', st)
nsub = sum(len(d['subclaims']) for d in rows)
ncit = sum(len(d['citations']) for d in rows)
tiers = {}
sup = {}
for d in rows:
    for sc in d['subclaims']:
        tiers[sc['tier']] = tiers.get(sc['tier'], 0) + 1
        sup[sc['support']] = sup.get(sc['support'], 0) + 1
print('subclaims', nsub, tiers, sup, 'citations', ncit)
os.makedirs(ROOT + '/tmp/fence-3/data', exist_ok=True)
json.dump({'counts': counts, 'status': st, 'subclaims': nsub, 'tiers': tiers, 'support': sup, 'citations': ncit, 'ids': [d['id'] for d in rows]}, open(ROOT + '/tmp/fence-3/data/summary.json', 'w'), indent=1)
