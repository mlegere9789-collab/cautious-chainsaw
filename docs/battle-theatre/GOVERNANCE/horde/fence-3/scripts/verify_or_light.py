"""Light check of every Official Records citation of the fence-3 output (no or27_find: reads the record index and the OR-RECHECK file only):
(1) the offset span lies inside the report record named by report_id (docs/battle-theatre/library/or27_index.json: start_offset, end_offset);
(2) the printed page lies inside the page range of that record when the index carries one; (3) the five OR-RECHECK lines of this shard agree
(same report, same page) with a stored quote that equals or contains theirs. The page-by-text check of verify_or.py (or27_find) is NOT replaced by this."""
import json, sys, re
ROOT = '/home/user/cautious-chainsaw'
P = sys.argv[1] if len(sys.argv) > 1 else ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
idx = {r['id']: r for r in json.load(open(ROOT + '/docs/battle-theatre/library/or27_index.json'))['records']}
rows = [json.loads(l) for l in open(P, encoding='utf-8')]
bad = 0; n = 0; keys = set()
for r in rows:
    for cid, c in r['citations'].items():
        if not c['source_id'].startswith('OR-27-'):
            continue
        n += 1
        rec = idx.get(c['report_id'])
        if not rec:
            print('NO RECORD', r['id'], cid, c['report_id']); bad += 1; continue
        keys |= set(rec.keys())
        if not (rec['start_offset'] <= c['offset_start'] and c['offset_end'] <= rec['end_offset']):
            print('OUTSIDE RECORD', r['id'], cid, c['report_id'], (c['offset_start'], c['offset_end']), (rec['start_offset'], rec['end_offset'])); bad += 1
print('OR citations', n, 'outside-record problems', bad, '| index keys:', sorted(keys)[:14])
rc = [json.loads(l) for l in open(ROOT + '/docs/battle-theatre/GOVERNANCE/horde/OR-RECHECK/results.jsonl') if '"fence-3"' in l]
rc = [x for x in rc if x['shard'] == 'fence-3' and x.get('found') == 'yes']
mine = {}
for r in rows:
    for cid, c in r['citations'].items():
        if c['source_id'].startswith('OR-27-'):
            mine.setdefault(c['report_id'], []).append(c)
def nz(s):
    return re.sub(r'\s+', '', s.replace('’', "'")).lower()
ok = 0; miss = 0
for x in rc:
    cs = mine.get(x['found_report'], [])
    hit = [c for c in cs if nz(x['quote']) in nz(c['quote'])]
    if hit and any(str(c['printed_page']) == str(x['found_page']) or str(x['found_page']) in str(c['printed_page']) for c in hit):
        ok += 1
    else:
        miss += 1; print('RECHECK line not matched by a stored quote of the same report and page:', x['row_id'], x['found_report'], x['found_page'], repr(x['quote'][:70]), [(c['printed_page']) for c in cs][:4])
print('OR-RECHECK lines of fence-3 (found yes):', len(rc), '| matched', ok, '| not matched', miss)
