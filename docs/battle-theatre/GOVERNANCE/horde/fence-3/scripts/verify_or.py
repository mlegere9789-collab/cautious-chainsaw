"""Independent check of every Official Records citation of the fence-3 output: re-find the quote by text search with
tools/bt/or27_find.verify (not by offsets) and compare report id, printed page and offsets. Also compares with OR-RECHECK/results.jsonl
lines of the shard (the original 68 quotes) where the quote text is unchanged."""
import sys, json, os
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/tools/bt')
import or27_find as OF
P = os.environ.get('VPATH', ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl')
rows = [json.loads(l) for l in open(P, encoding='utf-8')]
bad = 0; n = 0; pagediff = 0
seen = set()
for d in rows:
    for cid, c in d['citations'].items():
        if not c['source_id'].startswith('OR-27-'):
            continue
        n += 1
        hits = OF.verify(c['quote'], (c['part'],))
        mine = [h for h in hits if h['record'] == c['report_id']]
        if not hits:
            bad += 1; print('NOT FOUND', d['id'], cid, c['report_id'], repr(c['quote'][:70])); continue
        if len(mine) != 1:
            bad += 1; print('RECORD', d['id'], cid, c['report_id'], 'hits', [(h['record'], h['start']) for h in hits][:4], repr(c['quote'][:60])); continue
        h = mine[0]
        if (h['start'], h['end']) != (c['offset_start'], c['offset_end']):
            bad += 1; print('OFFSET', d['id'], cid, (h['start'], h['end']), (c['offset_start'], c['offset_end']))
        if str(h['page']) != str(c['printed_page']):
            pagediff += 1; print('PAGE', d['id'], cid, c['report_id'], 'tool', h['page'], 'stored', c['printed_page'], '|', c.get('page_basis'))
print('OR citations', n, 'problems', bad, 'page differences', pagediff)
# OR-RECHECK comparison for the original quotes of this shard
rc = [json.loads(l) for l in open(ROOT + '/docs/battle-theatre/GOVERNANCE/horde/OR-RECHECK/results.jsonl') if '"fence-3"' in l]
rc = [r for r in rc if r['shard'] == 'fence-3' and r.get('found') == 'yes']
mine = {}
for d in rows:
    for cid, c in d['citations'].items():
        if c['source_id'].startswith('OR-27-'):
            mine.setdefault(c['quote'], []).append((d['id'], cid, c))
agree = 0; missing = 0; disagree = 0; widened = 0
for r in rc:
    q = r['quote']
    ms = mine.get(q)
    if not ms:
        # the quote may have been widened or merged: check that some stored quote contains it
        cont = [(i, cid) for qq, lst in mine.items() if q in qq for (i, cid, c) in lst if c['report_id'] == r['found_report']]
        if cont:
            widened += 1
        else:
            missing += 1; print('RECHECK quote not in output (neither exact nor contained):', r['row_id'], r['found_report'], repr(q[:70]))
        continue
    ok = any(c['report_id'] == r['found_report'] and str(c['printed_page']) == str(r['found_page']) and c['offset_start'] == r['offset'] for (_, _, c) in ms)
    if ok: agree += 1
    else:
        disagree += 1
        print('RECHECK disagrees', r['row_id'], r['found_report'], r['found_page'], r['offset'], [(i, c['report_id'], c['printed_page'], c['offset_start']) for (i, _, c) in ms][:2])
print('OR-RECHECK lines of fence-3 (found yes):', len(rc), '| agree exactly', agree, '| quote widened/merged (contained in a stored quote of the same report)', widened, '| disagree', disagree, '| missing', missing)
