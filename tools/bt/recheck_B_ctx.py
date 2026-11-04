"""Print the raw OR passage around each claim of the scope-B ledger (frozen pre-recheck copy) so a reader can re-check the claim against the full passage.
    python -I tools/bt/recheck_B_ctx.py --batch II-01 [--report OR27-1-R037] [--ids POS-B-...,...] [--report OR27-1-R037] [--before 1800] [--after 2200] [--whole 14000]
Claims are grouped by cited report. For each group: the claim records (compact), then the normalised report text (running heads removed, hyphenation
joined) with markers <<id ... >> placed around each claim's quote/anchor. A report shorter than --whole characters is printed whole; otherwise
each claim gets --before characters before and --after after its quote (merged windows, gaps marked), clamped to the report record."""
import os, sys, json, bisect, argparse
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find
from or27_find import get_part
from or27_lib import norm_query, utf8_stdout
utf8_stdout()
ap = argparse.ArgumentParser()
ap.add_argument('--batch'); ap.add_argument('--ids'); ap.add_argument('--report')
ap.add_argument('--before', type=int, default=1800); ap.add_argument('--after', type=int, default=2200); ap.add_argument('--whole', type=int, default=14000)
ap.add_argument('--file', help='ledger file (default: frozen pre-recheck B ledger)')
a = ap.parse_args()
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
fn = a.file or os.path.join(POS, '_orig_B', 'positions_B.before_recheck.jsonl')
cl = [json.loads(l) for l in open(fn, encoding='utf-8')]
idx = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json'), encoding='utf-8'))['records']}
if a.batch:
    _ids = [x.strip() for x in open(os.path.join(POS, 'draft_B', 'batches', a.batch + '.txt')) if x.strip()]
    cl = [c for c in cl if c['claim_id'] in set(_ids)]
if a.ids:
    s = set(a.ids.split(',')); cl = [c for c in cl if c['claim_id'] in s]
if a.report:
    cl = [c for c in cl if (c['source'] or {}).get('report_id') == a.report]
groups = {}
for c in cl:
    groups.setdefault((c.get('source') or {}).get('report_id'), []).append(c)


def compact(c):
    w = c['when']; p = c['place']; s = c['source']
    return ('%s | unit %s | kind %s | tier %s | ocr %s\n  WHEN printed=%r date=%s t_iso=%s approx=%s\n  PLACE printed=%r road=%r gz=%s\n  ACT %s\n  QUOTE %r  (extract %r)\n  NOTE %s%s' % (
        c['claim_id'], c['unit_id'], c['kind'], c['tier'], c['ocr_uncertain'], w.get('printed'), w.get('date'), w.get('t_iso'), w.get('approx'),
        p.get('printed'), p.get('direction_or_road'), p.get('gazetteer_ref'), c['activity'], s.get('quote'), s.get('extract'), c.get('note'),
        ('\n  CONFLICTS ' + ','.join(c['conflicts_with'])) if c.get('conflicts_with') else ''))


for rid, cs in groups.items():
    print('=' * 100)
    if rid is None:
        for c in cs:
            print(compact(c)); print('  (open gap: no cited passage)')
        continue
    rec = idx[rid]; P = get_part(rec['part'])
    nm = P.nmap
    ns = bisect.bisect_left(nm, rec['start_offset']); ne = bisect.bisect_left(nm, rec['end_offset'])
    text = P.ntext[ns:ne]
    print('REPORT %s %s %s pp. %s-%s  (%d chars)' % (rid, rec.get('rank'), rec.get('author'), rec['start_page'], rec['end_page'], len(text)))
    print('-' * 100)
    spans = []
    for c in cs:
        print(compact(c))
        s = c['source']; key = s.get('quote') or s.get('extract')
        if not key:
            print('  (no quote/extract)'); continue
        k = norm_query(key); i = text.find(k)
        if i < 0:
            print('  !! quote not found in record text'); continue
        spans.append((i, i + len(k), c['claim_id']))
    print('-' * 100)
    if not spans:
        continue
    if len(text) <= a.whole:
        wins = [(0, len(text))]
    else:
        wins = []
        for i, j, _ in sorted(spans):
            lo, hi = max(0, i - a.before), min(len(text), j + a.after)
            if wins and lo <= wins[-1][1]:
                wins[-1] = (wins[-1][0], max(hi, wins[-1][1]))
            else:
                wins.append((lo, hi))
    marks = []
    for i, j, cid in spans:
        marks.append((i, '<<' + cid.replace('POS-B-', '') + ' ')); marks.append((j, ' >>'))
    marks.sort(key=lambda m: (m[0], 0 if m[1].startswith(' >>') else 1))
    buf = []; last = 0
    for pos, mk in marks:
        buf.append(text[last:pos]); buf.append(mk); last = pos
    buf.append(text[last:])
    # rebuild with offsets: simpler to mark then cut by shifted windows
    shift = []; acc = 0
    for pos, mk in marks:
        shift.append((pos, len(mk)))
    def shifted(p):
        return p + sum(l for q, l in shift if q <= p)
    marked = ''.join(buf)
    prev_end = 0
    for lo, hi in wins:
        slo, shi = shifted(lo - 1) + 1 if lo > 0 else 0, shifted(hi - 1) + 1 if hi > 0 else 0
        if lo > 0:
            print('[... %d chars omitted ...]' % (lo - prev_end))
        print(marked[slo:shi])
        prev_end = hi
    if prev_end < len(text):
        print('[... %d chars omitted to end of report ...]' % (len(text) - prev_end))
