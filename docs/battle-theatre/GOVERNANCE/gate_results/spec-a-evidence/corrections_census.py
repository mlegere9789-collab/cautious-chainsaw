#!/usr/bin/env python3
"""Census of the correction records that GATE-SPEC-A.md 1.3 reads: GOVERNANCE/timeline_corrections/*.jsonl and
GOVERNANCE/evidence_corrections/*.jsonl.

A record is classified by its fields, never by its file name:
  supplementary  has `xid` (one sub-claim of a row, written by a lookup workstream: `sub_claim`, `support`, `tier_basis`)
  row-level      has no `xid` and has at least one of `sub_claims` (or its spelling `subclaims`), `citations`, `seed`, `before`, `schedule_id`, `lookups`
  other          neither (reported, so that a new kind of record is seen)
Prints counts per directory: records, distinct ids, ids with more than one record, verdict words, and how many records
name a top-level row (`Rnn.0000`) as their id. Read-only. Usage: python3 -I corrections_census.py"""
import json, os, re, sys, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import GOV

ROW_KEYS = ('sub_claims', 'subclaims', 'citations', 'seed', 'before', 'schedule_id', 'lookups')   # `subclaims` and `unsupported` are the spelling of 76 evidence records and 1 timeline record (counted below)
KNOWN_VERDICTS = {'confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap',
                  'no_passage_found_in_saved_pages', 'no_relevant_passage_found_in_saved_pages', 'passages_found_see_hit_pages'}


def kind(r):
    if 'xid' in r: return 'supplementary'
    if any(k in r for k in ROW_KEYS): return 'row-level'
    return 'other'


out = {}
for d in ('timeline_corrections', 'evidence_corrections'):
    recs = []
    for f in sorted(glob.glob(os.path.join(GOV, d, '*.jsonl'))):
        for line in open(f, encoding='utf-8'):
            line = line.strip()
            if line:
                r = json.loads(line); r['_file'] = os.path.basename(f); recs.append(r)
    ids = collections.defaultdict(list)
    for r in recs: ids[r['id']].append(r)
    kinds = collections.Counter(kind(r) for r in recs)
    rowlevel_per_id = collections.Counter(r['id'] for r in recs if kind(r) == 'row-level')
    out[d] = {
        'files': sorted({r['_file'] for r in recs}),
        'records': len(recs),
        'distinct_ids': len(ids),
        'ids_with_more_than_one_record': sum(1 for v in ids.values() if len(v) > 1),
        'kinds': dict(kinds),
        'ids_with_a_row_level_record': len(rowlevel_per_id),
        'ids_with_more_than_one_row_level_record': sum(1 for v in rowlevel_per_id.values() if v > 1),
        'ids_with_only_supplementary_records': sum(1 for i, v in ids.items() if all(kind(r) != 'row-level' for r in v)),
        'verdict_words': dict(collections.Counter(r.get('verdict') for r in recs)),
        'verdict_words_outside_the_known_list': sorted({str(r.get('verdict')) for r in recs} - KNOWN_VERDICTS),
        'records_using_the_alias_spelling_subclaims_or_unsupported': sum(1 for r in recs if 'subclaims' in r or ('unsupported' in r and 'remains_unsupported' not in r)),
        'records_on_a_top_level_row': sum(1 for r in recs if re.match(r'^R\d\d\.0000$', r['id'])),
        'top_level_rows_named': sorted({r['id'] for r in recs if re.match(r'^R\d\d\.0000$', r['id'])}),
        'records_with_empty_remains_unsupported_and_verdict_confirmed_or_corrected': sum(
            1 for r in recs if r.get('verdict') in ('confirmed', 'corrected') and not r.get('remains_unsupported')),
    }
print(json.dumps(out, indent=1, sort_keys=True))
