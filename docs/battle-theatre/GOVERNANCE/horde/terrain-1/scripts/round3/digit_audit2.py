"""Digit audit, second version (read-only): voting alignment of every Official Records quote of the terrain-1 corrections file
against the other archive.org scans (tmp/terrain-1/dl/or27_w2). The quote is cut into short anchors (every 6 characters, 12 characters long,
squashed to letters and digits); every anchor found in the other scan votes for the offset (hit position minus anchor position) and the
offset with most votes (within a 40-character window) is taken as the aligned start. The aligned region is diffed against the quote.
Output: tmp/terrain-1/r3/digit_audit2.json and a printed report of every aligned difference that involves a digit or a number word."""
import os, re, sys, json, unicodedata, difflib, collections
ROOT = '/home/user/cautious-chainsaw'
W2 = os.path.join(ROOT, 'tmp/terrain-1/dl/or27_w2')
WIT = {1: ['warofrebellion271unit', 'warofrebellion012701rootrich'], 2: ['warofrebellion272unit', 'warofrebellionco272unit']}
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-1.jsonl')
def sq(s):
    return ''.join(d.lower() for ch in s for d in unicodedata.normalize('NFKD', ch) if d.isalnum())
_c = {}
def wload(ident):
    if ident not in _c:
        raw = open(os.path.join(W2, ident + '_djvu.txt'), encoding='utf-8', errors='replace').read()
        raw = re.sub(r'-\s*\n\s*(?=[a-z])', '', raw)
        chars = []; idx = []
        for i, ch in enumerate(raw):
            for d in unicodedata.normalize('NFKD', ch):
                if d.isalnum(): chars.append(d.lower()); idx.append(i)
        _c[ident] = (raw, ''.join(chars), idx)
    return _c[ident]
def align(t, q, k=12, step=5):
    votes = collections.Counter()
    for p in range(0, max(1, len(q) - k + 1), step):
        a = q[p:p + k]
        if len(a) < k: continue
        pos = 0; n = 0
        while True:
            i = t.find(a, pos)
            if i < 0 or n > 6: break
            votes[(i - p) // 24] += 1; n += 1
            pos = i + 1
    if not votes: return None
    best, v = votes.most_common(1)[0]
    # merge adjacent buckets
    v += votes.get(best - 1, 0) + votes.get(best + 1, 0)
    return best * 24, v
rows = [json.loads(l) for l in open(src, encoding='utf-8') if l.strip()]
out = []
numrx = re.compile(r'\d')
for r in rows:
    for s in r['sub_claims']:
        for c in s['citations']:
            if not c['source_id'].startswith('OR-27'): continue
            q = sq(c['quote']); part = c['part']
            for ident in WIT[part]:
                raw, t, idx = wload(ident)
                if t.find(q) >= 0:
                    out.append(dict(row=r['id'], sc=s['sc'], report=c['report_id'], page=c['printed_page'], quote=c['quote'], scan=ident, status='identical')); continue
                al = align(t, q)
                nanch = max(1, (len(q) - 12) // 5 + 1)
                if not al or al[1] < max(3, nanch // 3):
                    out.append(dict(row=r['id'], sc=s['sc'], report=c['report_id'], page=c['printed_page'], quote=c['quote'], scan=ident, status='not_aligned', votes=al[1] if al else 0, anchors=nanch)); continue
                start = max(0, al[0] - 6)
                region = t[start: start + len(q) + 40]
                sm = difflib.SequenceMatcher(None, q, region, autojunk=False)
                # trim leading/trailing unmatched region
                ops = sm.get_opcodes()
                diffs = []
                for tag, i1, i2, j1, j2 in ops:
                    if tag == 'equal': continue
                    # ignore the unmatched slack at the start or end of the region
                    if i1 == 0 and tag == 'insert' and j1 == 0: continue
                    if i2 == len(q) and tag == 'insert': continue
                    diffs.append(dict(local=q[i1:i2], other=region[j1:j2], ctx_local=q[max(0, i1 - 14): i2 + 14], ctx_other=region[max(0, j1 - 14): j2 + 14]))
                # printed context of the aligned region in the original text
                a0 = idx[min(len(idx) - 1, start)]; a1 = idx[min(len(idx) - 1, start + len(q) + 40)]
                out.append(dict(row=r['id'], sc=s['sc'], report=c['report_id'], page=c['printed_page'], quote=c['quote'], scan=ident, status='aligned_diff' if diffs else 'aligned_same', votes=al[1], anchors=nanch,
                                diffs=diffs[:10], other_text=re.sub(r'\s+', ' ', raw[a0:a1])[:600]))
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'digit_audit2.json'), 'w'), indent=1)
cnt = collections.Counter(o['status'] for o in out)
print(dict(cnt))
seen = set()
for o in out:
    if o['status'] != 'aligned_diff': continue
    for d in o['diffs']:
        ch = d['local'] + d['other']
        if numrx.search(ch) or re.search(r'(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|forty|fifty|hundred)', d['ctx_local'] + d['ctx_other']) and len(ch) > 0:
            key = (o['report'], o['page'], d['local'], d['other'], o['scan'])
            if key in seen: continue
            seen.add(key)
            print('%s %s %s p.%s %s | local %r other %r | L:%s | O:%s' % (o['row'], o['sc'], o['report'], o['page'], o['scan'][-12:], d['local'], d['other'], d['ctx_local'], d['ctx_other']))
print('not aligned:', cnt['not_aligned'])
for o in out:
    if o['status'] == 'not_aligned':
        print('NOT ALIGNED', o['row'], o['sc'], o['report'], o['page'], o['scan'], 'votes', o['votes'], '/', o['anchors'], '|', o['quote'][:100])
