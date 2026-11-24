#!/usr/bin/env python3
"""Q25 follow-up (2026-11-24): id-map rows from ledger evidence, dated re-tests of stale blocks, blocked-host record.

    python3 -I tools/bt/library_q25_followup.py [--root DIR]

Idempotent.  Writes: tools/bt/gates/lib/library_ids.json (map entries), tools/bt/gates/lib/acquisition_list.json (status_ids),
GOVERNANCE/library/status_5.json (rows), work_queue.json (one entry), register EG-LIB-BOT-BLOCKED-HOSTS (md + index).
Every fact below is a ledger/status record or a request made on 2026-11-24 (curl, one request per second, public hosts only).
Nothing for hathitrust or ehistory was requested.  What no record supports is left absent so the gate item stays FAIL.
"""
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
if '--root' in sys.argv:
    ROOT = os.path.abspath(sys.argv[sys.argv.index('--root') + 1])
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
LIB = os.path.join(GOV, 'library')
LIBIDS = os.path.join(ROOT, 'tools', 'bt', 'gates', 'lib', 'library_ids.json')
ACQL = os.path.join(ROOT, 'tools', 'bt', 'gates', 'lib', 'acquisition_list.json')
D = '2026-11-24'


def rj(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def wj(p, d, ascii_only=False):
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(d, f, indent=1, ensure_ascii=ascii_only)
        f.write('\n')


def fill_mod():
    spec = importlib.util.spec_from_file_location('fill', os.path.join(HERE, 'library_status_fill.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# ---- 1. id map and list rows, each from a ledger record
ids = rj(LIBIDS)
a3 = ids['acquired_to_status']['acquired_3.json'].setdefault('map', {})
# the url rule for npshistory.com /publications/ sent these two entries to NPS-CLR; the entry id equals its own status row (rule 5)
a3.update({'PM-NPS-ROT-FIGURES': 'PM-NPS-ROT-FIGURES', 'PM-NPS-SLAUGHTER-PEN-PDF': 'PM-NPS-SLAUGHTER-PEN-PDF'})
# the plan row prints exactly the URL of the ledger entry (acquired_3.json url)
r12 = ids['r12_to_status']
r12.update({'13': ['NPSGOV-BATTLEFIELD-REHAB'], '16': ['NPSGOV-BATTLEFIELD-REHAB'], '42': ['NPSGOV-NATURAL-FEATURES'], '43': ['NPSGOV-PLANTS']})
ids['r12_to_status'] = dict(sorted(r12.items(), key=lambda kv: int(kv[0])))
wj(LIBIDS, ids)

lst = rj(ACQL)
want = {'C12-NPS-NATURAL': ['NPSGOV-NATURAL-FEATURES', 'NPSGOV-PLANTS'],               # acquired_3.json entries of the two nps.gov pages the row names
        'C11-OR27-ALT-HATHI': ['OR-27-1', 'OR-27-2', 'OR-27-3'],                         # status rows whose where/second_witness name HathiTrust ids coo.31924077699761 ...
        'D41-EHISTORY-TEXT-LAYER': ['OR-27-1', 'OR-27-2', 'OR-27-3'],                    # status rows whose where names eHistory serial 043, 044, 045
        'X1-REGIMENTAL-HISTORIES': ['STATE-OTHER'],                                      # row reason names the 8th Ohio and 1st Minnesota regimental histories (acquired_2.json)
        'X1-BIOGRAPHY-MEMOIR-SETS': ['WITNESS']}                                         # row reason names the memoirs and Meade Life and Letters (acquired_2.json)
for r in lst['rows']:
    if r['id'] in want and not r.get('status_ids'):
        r['status_ids'] = want[r['id']]
wj(ACQL, lst)

# ---- 2. status_5.json
p5 = os.path.join(LIB, 'status_5.json')
doc = {'_doc': 'library/status_5.json (2026-11-24 Q25 follow-up, tools/bt/library_q25_followup.py): PRINT reason from the ledger, dated re-tests of stale blocks, the bot-blocked hosts. Later file wins per key.', 'sources': []}
S = doc['sources']
S.append({'id': 'PRINT', 'reason': 'print-only: acquired_2.json blocked_or_failed records these eight works (Coddington, Busey and Martin, Pfanz, Gottfried, Warner, Thomas/Coates, Jensen, Coco) as "not public domain: skipped by instruction"; cited only, no digital copy ingested'})
S.append({'id': 'NPS-SEM', 'status': 'scheduled',
          'reason': 're-tested %s: https://www.npshistory.com/ and https://www.npshistory.com/series/symposia/gettysburg_seminars/ answered HTTP 200 (one request each, one second apart); the 2026-11-11 no-connection no longer holds, and the ledger holds later acquisitions from this host (acquired_3.json 2026-11-13); the seminar papers (vols 4-13, 15, 16) are not yet acquired' % D,
          'retest': [{'host': 'www.npshistory.com', 'locator': '/', 'date': D, 'response': 'HTTP 200, 168295 bytes'},
                     {'host': 'www.npshistory.com', 'locator': '/series/symposia/gettysburg_seminars/', 'date': D, 'response': 'HTTP 200, 15980 bytes'}],
          'next_action': 'Acquire Gettysburg Seminar Papers vols 4-13, 15, 16 from www.npshistory.com (public host, about one request per second), hash-record them in the acquisition ledger, record rights and text quality, then re-run gate Q25.',
          'queue_entry': 'WQ-NPS-SEM'})
S.append({'id': 'LOC-MAPS', 'status': 'blocked-to-prior-research',
          'reason': 'unchanged by this pass (maps, not text); see status.json and TM-HOSTS-BLOCKED; re-tested %s (below)' % D,
          'earlier_research': 'status.json 2026-10-21 (TM-HOSTS-BLOCKED); re-tested %s' % D,
          'failed_lookup': [{'host': 'www.loc.gov', 'locator': '/resource/g3823a.ct000648/ (item page, HTML)', 'date': D, 'response': 'HTTP 403 (5487 bytes)'},
                            {'host': 'www.loc.gov', 'locator': '/maps/ (collection page, HTML)', 'date': D, 'response': 'HTTP 403 (5385 bytes)'},
                            {'host': 'tile.loc.gov', 'locator': '/storage-services/master/pnp/ppmsca/12800/12834/ (directory)', 'date': D, 'response': 'HTTP 403 (535 bytes)'}],
          'retest_answered': [{'host': 'www.loc.gov', 'locator': '/item/99446453/?fo=json (Warren record, open JSON)', 'date': D, 'response': 'HTTP 200, 46593 bytes'},
                              {'host': 'www.loc.gov', 'locator': '/pictures/item/2018671576/?fo=json', 'date': D, 'response': 'HTTP 200, 7879 bytes'}]})
S.append({'id': 'TM-HOSTS-BLOCKED', 'status': 'blocked',
          'failed_lookup': [{'host': 'davidrumsey.com', 'locator': 'https://www.davidrumsey.com/', 'date': D, 'response': 'no connection (curl status 000, proxy refusal); not circumvented'},
                            {'host': 'digitalcommonwealth.org', 'locator': 'https://digitalcommonwealth.org/', 'date': D, 'response': 'no connection (curl status 000, proxy refusal); not circumvented'},
                            {'host': 'geo.btaa.org', 'locator': 'https://geo.btaa.org/', 'date': D, 'response': 'no connection (curl status 000, proxy refusal); not circumvented'},
                            {'host': 'collections.library.yale.edu', 'locator': 'https://collections.library.yale.edu/', 'date': D, 'response': 'no connection (curl status 000, proxy refusal); not circumvented'},
                            {'host': 'loc.gov', 'locator': 'https://www.loc.gov/resource/g3823a.ct000648/ (item page)', 'date': D, 'response': 'HTTP 403'},
                            {'host': 'tile.loc.gov', 'locator': '/storage-services/master/pnp/ppmsca/12800/12834/', 'date': D, 'response': 'HTTP 403'}],
          'retest_answered': [{'host': 'archive.org', 'locator': '/', 'date': D, 'response': 'HTTP 200 (archive.org was never blocked; the row says it was used instead)'},
                              {'host': 'loc.gov', 'locator': 'open JSON records (?fo=json)', 'date': D, 'response': 'HTTP 200'}]})
S.append({'id': 'NARA-WARREN', 'retest_answered': [{'host': 'catalog.archives.gov', 'locator': '/', 'date': D, 'response': 'HTTP 200 (root only; the Warren item itself was not requested)'}]})
S.append({'id': 'TM-BACHELDER-1886-HOURLY',
          'failed_lookup': [{'host': 'archive.org', 'locator': '/advancedsearch.php?q=bachelder AND (hourly OR "tactical maps" OR "twenty-eight")', 'date': D, 'response': 'HTTP 200, numFound 0: no item'},
                            {'host': 'loc.gov', 'locator': 'https://www.loc.gov/search/?q=bachelder+tactical+maps+hourly&fo=json', 'date': D, 'response': 'no answer within 30 s (curl status 000, timeout); not retried'}]})
S.append({'id': 'BOT-BLOCKED-HOSTS', 'title': 'Hosts that answered with a bot block or a throttle breach (recorded, not retried)',
          'where': 'babel.hathitrust.org and ehistory.osu.edu (bot block)',
          'status': 'blocked',
          'note': 'babel.hathitrust.org and ehistory.osu.edu answered with their own bot block on 2026-11-13 (library_ids.json bot_blocked_hosts; task rules of the bt-gates workstream); never retried. Earlier records: ehistory.osu.edu HTTP 403 to scripted requests 2026-10-19 (acquired.json blocked); babel.hathitrust.org no connection 2026-11-11 (status OR-27-1..3 second_witness).',
          'throttle_breach': {'host': 'loc.gov (the www host)', 'entries': ['NPS-HABS-pa0004', 'NPS-HABS-pa0010'], 'fetched_at': '2026-11-15T23:56:08', 'result': 'both ledger entries carry the same second, so two requests fell in one second; the ledger time cannot be changed; gate item Q25/Q25.4/throttle stays FAIL'},
          'register_ids': ['EG-LIB-BOT-BLOCKED-HOSTS'],
          'failed_lookup': [{'host': 'babel.hathitrust.org', 'locator': 'bot block on the HathiTrust page fetch (second witness of OR vol. 27)', 'date': '2026-11-13', 'response': 'bot block (recorded by the task rules; not retried, not circumvented)'},
                            {'host': 'ehistory.osu.edu', 'locator': 'eHistory OR transcription (serials 043 to 045)', 'date': '2026-11-13', 'response': 'bot block (recorded by the task rules; not retried, not circumvented); earlier HTTP 403 to scripted requests 2026-10-19 (acquired.json blocked)'}]})
wj(p5, doc, ascii_only=True)

# ---- 3. work queue
qp = os.path.join(LIB, 'work_queue.json')
q = rj(qp)
if not any(e.get('id') == 'WQ-NPS-SEM' for e in q['entries']):
    q['entries'].append({'id': 'WQ-NPS-SEM', 'source_id': 'NPS-SEM',
                         'next_action': S[1]['next_action'], 'state': 'open',
                         'origin': 'status_5.json: block re-tested %s, npshistory.com answers HTTP 200' % D})
    wj(qp, q)

# ---- 4. register entry
fm = fill_mod()
idxp = os.path.join(GOV, 'register_index.json')
idx = rj(idxp)
rid = 'EG-LIB-BOT-BLOCKED-HOSTS'
if rid not in {e['id'] for e in idx}:
    row = {'id': 'BOT-BLOCKED-HOSTS', '_title': S[-1]['title'], 'where': S[-1]['where'], 'reason': S[-1]['note']}
    e = fm.make_register(row, 'blocked')
    idx.append(e)
    body = fm.REG_TEMPLATE.format(id=e['id'], title=e['title'], rids=', '.join(e['rids']), cat=e['cat'], desc=e['desc'], why=e['why'], searched=e['searched'], subst=e['subst'],
                                  recon=e['recon'], tier=e['tier'], competing=e['competing'], marking=e['marking'], impact=e['impact'],
                                  owner_q=e['owner_q'] or 'none (work continues)', rec=e['rec'] or '-', status=e['status'])
    with open(os.path.join(GOV, 'register', rid + '.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(body)
    fm.dump(idxp, idx)
print('done')
