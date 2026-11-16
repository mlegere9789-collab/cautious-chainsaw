"""independent verifier of evidence_corrections/sources-a.jsonl (run with python3 -I verify.py)

Re-reads every citation WITHOUT the matcher used by build.py: slices the local text at the recorded character offsets
(read as UTF-8, newline=''), collapses whitespace on both sides and compares. Also checks: local_sha256 against the file now,
JSON validity, required fields, one line per row of results.jsonl in the same order, tier/support consistency, that every
blocked_host sub-claim has an earlier_reading and a row-level blocked_host entry with a URL, that no citation of a
'documented' sub-claim is missing, and that no shipped-copy words (AI, Claude, Anthropic, agent) appear in the file.
Exit code 0 only if everything passes.
"""
import os, sys, json, re, hashlib

ROOT = '/home/user/cautious-chainsaw'
OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/sources-a.jsonl')
RES = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/sources-a/results.jsonl')
REQ_ROW = ['id', 'shard', 'requirement', 'verdict', 'status', 'corrected_claim', 'sub_claims', 'stays_unsupported', 'blocked_host', 'register_refs', 'product_consequence', 'built']
VERDICTS = {'confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'}
STATUS = {'closed', 'open_gaps', 'blocked_host'}
TIERS = {'documented', 'inferred', 'plausible-procedural', 'open_gap'}
SUPPORT = {'supported', 'partial', 'conflict', 'unsupported', 'blocked_host', 'derived'}


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


_cache = {}


def raw(path):
    if path not in _cache:
        _cache[path] = open(os.path.join(ROOT, path), encoding='utf-8', newline='', errors='replace').read()
    return _cache[path]


def sha(path):
    h = hashlib.sha256()
    with open(os.path.join(ROOT, path), 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''):
            h.update(ch)
    return h.hexdigest()


def main():
    errs = []
    prev_ids = [json.loads(l)['id'] for l in open(RES, encoding='utf-8')]
    rows = []
    for i, line in enumerate(open(OUT, encoding='utf-8'), 1):
        try:
            rows.append(json.loads(line))
        except Exception as e:
            errs.append('line %d: invalid JSON %s' % (i, e))
    if [r['id'] for r in rows] != prev_ids:
        errs.append('ids/order differ from results.jsonl: %s vs %s' % ([r['id'] for r in rows], prev_ids))
    ncit = 0
    shas = {}
    for r in rows:
        rid = r.get('id')
        for k in REQ_ROW:
            if k not in r:
                errs.append('%s: missing field %s' % (rid, k))
        if r.get('verdict') not in VERDICTS:
            errs.append('%s: bad verdict %r' % (rid, r.get('verdict')))
        if r.get('status') not in STATUS:
            errs.append('%s: bad status %r' % (rid, r.get('status')))
        has_blk_sc = False
        for s in r['sub_claims']:
            sc = s['sc']
            if s['tier'] not in TIERS:
                errs.append('%s: bad tier %r' % (sc, s['tier']))
            if s['support'] not in SUPPORT:
                errs.append('%s: bad support %r' % (sc, s['support']))
            supports = [c for c in s['citations'] if c['role'] == 'supports']
            if s['tier'] == 'documented' and not supports:
                errs.append('%s: documented without supporting citation' % sc)
            if s['support'] in ('supported', 'partial') and not supports:
                errs.append('%s: support %s without supporting citation' % (sc, s['support']))
            if s['support'] == 'blocked_host':
                has_blk_sc = True
                if not s.get('earlier_reading'):
                    errs.append('%s: blocked_host without earlier_reading' % sc)
                if s['tier'] == 'documented':
                    errs.append('%s: blocked_host and documented' % sc)
            for c in s['citations']:
                ncit += 1
                p = c['local_path']
                if p not in shas:
                    shas[p] = sha(p)
                if shas[p] != c['local_sha256']:
                    errs.append('%s: local_sha256 of %s changed' % (sc, p))
                a, b = c['offset']
                span = raw(p)[a:b]
                q = norm(c['quote'])
                sp = norm(span)
                # the matcher also joins end-of-line hyphenation; allow that
                sp2 = norm(re.sub(r'-\s*\n\s*', '', span))
                if q != sp and q != sp2:
                    errs.append('%s: offset text differs from quote\n   quote: %r\n   span:  %r' % (sc, q[:140], sp[:140]))
        if r['status'] == 'blocked_host' and not has_blk_sc and not r['blocked_host']:
            errs.append('%s: status blocked_host without a blocked sub-claim or entry' % rid)
        if has_blk_sc and not r['blocked_host']:
            errs.append('%s: blocked_host sub-claim but no row-level blocked_host entry' % rid)
        for h in r['blocked_host']:
            if not str(h.get('url', '')).startswith('http'):
                errs.append('%s: blocked_host entry without URL' % rid)
            if not h.get('what_to_read'):
                errs.append('%s: blocked_host entry without what_to_read' % rid)
        if r['verdict'] == 'confirmed' and any(s['support'] in ('blocked_host', 'unsupported') for s in r['sub_claims']):
            errs.append('%s: verdict confirmed but a sub-claim is blocked or unsupported' % rid)
        if r['status'] == 'closed' and (r['stays_unsupported'] or any(s['support'] in ('blocked_host', 'unsupported', 'conflict') for s in r['sub_claims'])):
            errs.append('%s: status closed with open items' % rid)
    text = open(OUT, encoding='utf-8').read()
    text = re.sub(r'User-[Aa]gent', 'User-header', text)   # the HTTP request header named in robots.txt is not the banned word
    for w in (r'\bClaude\b', r'\bAnthropic\b', r'\bagents?\b', r'\bA\.I\.', r'\bAI\b', r'generated by', r'subagent'):
        if re.search(w, text):
            errs.append('banned copy word %s found in output' % w)
    print('rows %d, citations re-read %d, errors %d' % (len(rows), ncit, len(errs)))
    for e in errs[:60]:
        print('ERR', e)
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
