"""Merge the verified timeline shards (tl-01..tl-04 and tl-09..tl-12 close-out corrections) into GOVERNANCE/timeline_seed.jsonl.

Input : GOVERNANCE/timeline_corrections/tl-0N.jsonl (one line per seed row, written by the shard close-outs)
Output: GOVERNANCE/timeline_seed.jsonl (same 691 rows, same order; text_raw/tier/page/time_window_raw never touched)
        GOVERNANCE/timeline_merge_report.json (counts, reasons per row), GOVERNANCE/.timeline_merge_cache.json

Rule (CLAUDE.md Law cl.4, never promote on weaker evidence). A row leaves `seeded_unverified` (becomes `verified`) only if ALL hold:
  1. shard verdict is `confirmed` (the seed claim stands as written; `corrected` means the sources support a DIFFERENT claim,
     so the seed row stays unverified and keeps the corrected claim on file);
  2. the seed tier is `documented` and every sub-claim is tier documented, support `supported`;
  3. nothing remains unsupported, no scenario/conflict is carried, no default pending;
  4. every sub-claim cites at least one NON-LEAD source (not COMPUTED, PROJECT-DATA, wiki/forum/blog/auction/EPP/CWT-type ids);
  5. every such citation's quote is re-read in the stored source text at its stored offsets (file sha256 and quote match).
Everything else keeps `seeded_unverified`, gets a `verification` block with state and reasons (the gap stays visible).
Rows of shards without a close-out (those not in SHARDS) are not touched. Idempotent: status is recomputed from the evidence on every run,
never from the previous status. Content-hash cached (quote checks are re-done only if the citation record or source file changed).

Run: python3 -I tools/bt/merge_timeline_verification.py [--check] [--no-cache]
  (no flag) merge and write; --check: exit 1 if the file on disk differs from what the evidence yields, or any verified row fails re-check."""
import hashlib, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
SEED = os.path.join(G, 'timeline_seed.jsonl')
CORR = os.path.join(G, 'timeline_corrections')
REPORT = os.path.join(G, 'timeline_merge_report.json')
CACHE = os.path.join(G, '.timeline_merge_cache.json')
OVERLAY = os.path.join(G, 'timeline_conflict_updates.jsonl')   # conflict-resolution windows/defaults per row (tools/bt/conflicts/apply_readers.py)
SHARDS = ['tl-01', 'tl-02', 'tl-03', 'tl-04', 'tl-09', 'tl-10', 'tl-11', 'tl-12']
RULE_VERSION = 2
NOT_SOURCES = {'COMPUTED', 'PROJECT-DATA'}
LEAD = re.compile(r'^(WIKI|WP-|EPP|CWT|PADRE|WHB|WOMENHIST|ROSEB|CALEF-CWT|DW|HNN|FORUM|BLOG|AUCTION|EBAY)', re.I)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def load_jsonl(p):
    with open(p, encoding='utf-8') as f:
        return [json.loads(l) for l in f if l.strip()]


def is_lead(c):
    sid = c.get('source_id') or ''
    return (not sid) or sid in NOT_SOURCES or bool(LEAD.match(sid))


def norm(s):
    s = s.replace('­', '').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = re.sub(r'-\s*\n\s*', '', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def _file_sha(path, memo):
    if path not in memo:
        st = os.stat(path)
        memo[path] = (st.st_size, st.st_mtime_ns)
    return memo[path]


def check_quote(c, cache, stats):
    """Re-read one citation's quote in the stored text. Returns (ok, why). Cached on the content hash of the citation record
    plus the source file's (size, mtime) and, on a miss, its sha256."""
    key = sha(json.dumps({k: c.get(k) for k in ('source_id', 'quote', 'text_offset', 'text_offset_end', 'source_file', 'sha256')}, sort_keys=True).encode())
    path = os.path.join(ROOT, c.get('source_file') or '')
    if not c.get('source_file') or not os.path.isfile(path):
        return False, 'source file not present: %s' % c.get('source_file')
    st = os.stat(path)
    fp = [st.st_size, st.st_mtime_ns]
    hit = cache.get(key)
    if hit and hit['fp'] == fp:
        stats['hits'] += 1
        return hit['ok'], hit['why']
    stats['misses'] += 1
    data = open(path, 'rb').read()
    ok, why = True, 'ok'
    if c.get('sha256') and sha(data) != c['sha256']:
        ok, why = False, 'source file sha256 differs from the citation'
    else:
        txt = data.decode('utf-8', 'replace')
        a, b = c.get('text_offset'), c.get('text_offset_end')
        if not (isinstance(a, int) and isinstance(b, int)) or not (0 <= a < b <= len(txt)):
            ok, why = False, 'offsets missing or out of range'
        else:
            window = norm(txt[max(0, a - 5):b + 5])
            parts = [p for p in re.split(r'\s*(?:\.\.\.|…)\s*', c.get('quote') or '') if norm(p)]
            if not parts:
                ok, why = False, 'empty quote'
            elif not all(norm(p) in window for p in parts):
                ok, why = False, 'quote not found at the stored offsets'
    cache[key] = {'fp': fp, 'ok': ok, 'why': why}
    return ok, why


def evaluate(corr, seed, cache, stats):
    """-> (promote: bool, verification block)"""
    reasons = []
    v = corr.get('verdict')
    if v != 'confirmed':
        reasons.append('shard verdict is %s: the sources support %s, not the seed claim as written' % (v, 'a corrected claim' if v == 'corrected' else 'only part of it or none of it'))
    if seed.get('tier') != 'documented':
        reasons.append('seed tier is %s, not documented' % seed.get('tier'))
    subs = corr.get('sub_claims') or []
    cites = {c['key']: c for c in corr.get('citations') or [] if 'key' in c}
    if not subs:
        reasons.append('no sub-claims on file')
    for s in subs:
        if s.get('tier') != 'documented' or s.get('support') != 'supported':
            reasons.append('sub-claim %s is %s/%s' % (s.get('n'), s.get('tier'), s.get('support')))
        good = [cites[k] for k in s.get('citations') or [] if k in cites and not is_lead(cites[k])]
        if not good:
            reasons.append('sub-claim %s has no non-lead source citation' % s.get('n'))
    if corr.get('remains_unsupported'):
        reasons.append('remains unsupported: %d item(s)' % len(corr['remains_unsupported']))
    if corr.get('scenarios'):
        reasons.append('%d scenario(s) carried (source conflict, no default)' % len(corr['scenarios']))
    if corr.get('default'):
        reasons.append('a default is recorded')
    used = sorted({k for s in subs for k in s.get('citations') or [] if k in cites and not is_lead(cites[k])})
    if not reasons:
        for k in used:
            ok, why = check_quote(cites[k], cache, stats)
            if not ok:
                reasons.append('citation %s: %s' % (k, why))
    block = {
        'shard': corr.get('shard'),
        'shard_verdict': v,
        'evidence_hash': sha(json.dumps(corr, sort_keys=True, ensure_ascii=False).encode())[:16],
        'sub_claims': len(subs),
        'non_lead_citations': [{'key': k, 'source_id': cites[k].get('source_id'), 'report_id': cites[k].get('report_id'),
                                'printed_page': cites[k].get('printed_page'), 'quote_sha256': sha((cites[k].get('quote') or '').encode())[:16]} for k in used],
        'rule_version': RULE_VERSION,
    }
    if reasons:
        block['state'] = 'not_promoted'
        block['gaps'] = reasons
    else:
        block['state'] = 'verified'
        block['gaps'] = []
    return not reasons, block


def build(use_cache=True):
    seed = load_jsonl(SEED)
    corr = {}
    for s in SHARDS:
        p = os.path.join(CORR, s + '.jsonl')
        for r in load_jsonl(p):
            if r['id'] in corr:
                raise SystemExit('duplicate correction for %s' % r['id'])
            corr[r['id']] = r
    ids = {r['id'] for r in seed}
    extra = sorted(set(corr) - ids)
    if extra:
        raise SystemExit('corrections for ids not in the seed: %s' % extra[:5])
    overlay = {r['id']: r['conflict_updates'] for r in load_jsonl(OVERLAY)} if os.path.exists(OVERLAY) else {}
    cache = {}
    if use_cache and os.path.exists(CACHE):
        try:
            cache = json.load(open(CACHE, encoding='utf-8'))
            if cache.get('_rule_version') != RULE_VERSION:
                cache = {}
        except Exception:
            cache = {}
    cache['_rule_version'] = RULE_VERSION
    stats = {'hits': 0, 'misses': 0}
    out, rep = [], {}
    for r in seed:
        r = dict(r)
        r.pop('verification', None)
        r.pop('conflict_update', None)
        if r['id'] in overlay:
            r['conflict_update'] = overlay[r['id']]
        c = corr.get(r['id'])
        if c is None:
            r['status'] = 'seeded_unverified'
        else:
            ok, blk = evaluate(c, r, cache, stats)
            r['status'] = 'verified' if ok else 'seeded_unverified'
            r['verification'] = blk
            rep[r['id']] = {'state': blk['state'], 'gaps': blk['gaps']}
        out.append(r)
    return out, rep, cache, stats


def dump(rows):
    return ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows)


def summary(rows, rep):
    verified = [r['id'] for r in rows if r['status'] != 'seeded_unverified']
    return {'rows': len(rows), 'verified': len(verified), 'seeded_unverified': len(rows) - len(verified),
            'with_shard_evidence': len(rep), 'not_promoted': len(rep) - len(verified),
            'rows_without_shard_close_out': len(rows) - len(rep), 'verified_ids': verified}


def check(rows=None):
    """Used by check_governance: list of failure strings."""
    fails = []
    new, rep, cache, stats = build()
    cur = open(SEED, encoding='utf-8').read()
    if cur != dump(new):
        fails.append('timeline_seed.jsonl differs from what the shard evidence yields (run tools/bt/merge_timeline_verification.py)')
    return fails


def main(argv):
    use_cache = '--no-cache' not in argv
    new, rep, cache, stats = build(use_cache)
    summ = summary(new, rep)
    if '--check' in argv:
        fails = check()
        print(json.dumps({'ok': not fails, 'fails': fails, **{k: summ[k] for k in summ if k != 'verified_ids'}, 'cache': stats}))
        return 1 if fails else 0
    text = dump(new)
    crlf = b'\r\n' in open(SEED, 'rb').read()   # keep the file's own line endings (no whole-file diff)
    if open(SEED, encoding='utf-8').read() != text:
        with open(SEED, 'w', encoding='utf-8', newline='\r\n' if crlf else '\n') as f:
            f.write(text)
    json.dump({'rule_version': RULE_VERSION, 'summary': summ, 'rows': rep}, open(REPORT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    json.dump(cache, open(CACHE, 'w', encoding='utf-8'), indent=0)
    print(json.dumps({k: summ[k] for k in summ if k != 'verified_ids'} | {'cache': stats}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
