#!/usr/bin/env python3
"""Check GOVERNANCE/horde/ws-web/lookups-retry.jsonl against the inventory, the saved files and the evidence lines.

  (1) one line per inventory row, no duplicates, none missing;
  (2) every outcome is in the vocabulary of retry/r2/decide.py, every row has a reason, a still_failed_* row never claims evidence;
  (3) every attempt that names a saved file or a saved text: the file exists and its sha256 is the recorded one;
  (4) every URL attempt has a time and an HTTP result (0 with a curl error for a refused or unanswered host);
  (5) every evidence xid named by a row exists in the two web-lookups evidence files, and its lookup_refs name the row;
  (6) rows with outcome retrieved have an attempt with HTTP 200 (a page of loc.gov that answers the site's challenge page counts through the JSON interface of the same record, recorded in alt_requests);
  (7) a failed lookup that carries evidence lines (a related statement found while asking) says so in evidence_note.
Run:  python3 -I retry/scripts/verify_retry.py        (exit 1 on any problem)
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib

VOCAB = {'answered_with_evidence', 'retrieved', 'retrieved_no_statement', 'resolved_other_route', 'superseded_by_shard_retry', 'still_failed_host_refused', 'still_failed_http_error',
         'still_failed_no_source_found', 'still_failed_local_hits_unread', 'still_failed_retry_not_run', 'still_failed_no_route', 'not_retried_blocked_host_instruction',
         'not_requested_robots_disallowed', 'owner_only'}
OUT = os.path.join(rlib.GOV, 'horde', 'ws-web', 'lookups-retry.jsonl')
inv = {r['lk_id']: r for r in rlib.read_jsonl(os.path.join(rlib.RETRY, 'lookups-inventory.jsonl'))}
rows = rlib.read_jsonl(OUT)
EV = {}
for p in ('evidence_corrections', 'timeline_corrections'):
    for e in rlib.read_jsonl(os.path.join(rlib.GOV, p, 'web-lookups.jsonl')):
        EV[e['xid']] = e
problems = []


def bad(lk, msg):
    problems.append('%s: %s' % (lk, msg))


seen = set()
for r in rows:
    lk = r['lk_id']
    if lk in seen:
        bad(lk, 'duplicate line')
    seen.add(lk)
    if lk not in inv:
        bad(lk, 'not in the inventory')
    if r['outcome'] not in VOCAB:
        bad(lk, 'outcome %r not in the vocabulary' % r['outcome'])
    if not (r.get('reason') or '').strip():
        bad(lk, 'no reason')
    if r['outcome'].startswith('still_failed') and r.get('evidence') and not r.get('evidence_note'):
        bad(lk, 'a failed lookup carries evidence lines without an evidence_note')
    exact = False
    for a in r.get('attempts', []):
        for fk, hk in (('saved_file', 'file_sha256'), ('text_file', 'text_sha256'), ('search_response_file', 'search_response_sha256'), ('response_file', 'response_sha256')):
            if a.get(fk) and a.get(hk):
                p = rlib.abspath(a[fk])
                if not os.path.exists(p):
                    bad(lk, 'attempt %s: %s missing' % (a.get('attempt'), a[fk]))
                elif rlib.sha_file(p) != a[hk]:
                    bad(lk, 'attempt %s: sha256 of %s differs' % (a.get('attempt'), a[fk]))
        if a['kind'] == 'url_request':
            if not a.get('at') or a.get('http') is None:
                bad(lk, 'attempt %s: no time or no HTTP result' % a.get('attempt'))
            if a.get('http') == 0 and not a.get('error'):
                bad(lk, 'attempt %s: HTTP 0 without an error text' % a.get('attempt'))
            if a.get('http') == 200 or any(x.get('http') == 200 for x in a.get('alt_requests', []) or []):
                exact = True
        for im in a.get('images', []) or []:
            p = rlib.abspath(im['file'])
            if not os.path.exists(p) or rlib.sha_file(p) != im['sha256']:
                bad(lk, 'attempt %s: image %s missing or changed' % (a.get('attempt'), im['file']))
    for e in r.get('evidence', []) or []:
        full = EV.get(e['xid'])
        if not full:
            bad(lk, 'evidence %s not in the evidence files' % e['xid'])
        elif lk not in full.get('lookup_refs', []):
            bad(lk, 'evidence %s does not name this row in lookup_refs' % e['xid'])
    if r['outcome'] == 'retrieved' and not exact:
        bad(lk, 'retrieved without an HTTP 200 attempt')
for lk in inv:
    if lk not in seen:
        bad(lk, 'inventory row without a line')
print('rows', len(rows), 'inventory', len(inv), 'evidence lines', len(EV))
for p in problems[:80]:
    print('PROBLEM', p)
print('problems:', len(problems))
sys.exit(1 if problems else 0)
