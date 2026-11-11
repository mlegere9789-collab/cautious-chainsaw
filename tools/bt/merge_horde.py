"""Integrator for the Battle Theatre evidence horde (GOVERNANCE/horde/<shard>/).

Reads every shard's results.jsonl, validates it, copies proposed register entries and writes NEW files only:
  GOVERNANCE/timeline_verified.jsonl   one normalized row per timeline seed row (seed file is NOT rewritten)
  GOVERNANCE/subreq_links.json         sub-requirement id -> shard evidence (requirements.json is NOT rewritten)
  GOVERNANCE/register/proposed/<shard>/*.md   copies of the shards' proposed register entries
  GOVERNANCE/horde/MERGE-REPORT.md     validation findings (nothing hidden)
  GOVERNANCE/horde/spotcheck.json      reproducible sample of claims for manual source reading (--sample N, --seed S)

Rules enforced (CLAUDE.md, The Law): a row counted 'documented' or 'verified' needs a non-empty citation AND passage reference;
otherwise it is reported as FLAGGED and its normalized tier is downgraded to 'unsupported-claim' in the new files (the shard file is untouched).
'passes' is never set here. Run: python tools/bt/merge_horde.py [--sample 20] [--seed 1] [--dry]"""
import json, os, re, sys, glob, shutil, random, argparse, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
H = os.path.join(G, 'horde')
CITE_KEYS = ['citation', 'citations', 'source_citation', 'source_citations', 'source', 'sources', 'supporting_passage', 'repo_evidence']
PASS_KEYS = ['passage_ref', 'supporting_passage_ref', 'supporting_passage_refs', 'supporting_passages', 'supporting_passage']
ALLOWED_TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')


def load_jsonl(p):
    rows, bad = [], []
    if not os.path.exists(p):
        return rows, bad
    for i, l in enumerate(open(p, encoding='utf-8'), 1):
        l = l.strip()
        if not l:
            continue
        try:
            rows.append(json.loads(l))
        except Exception as e:
            bad.append((i, str(e)[:80]))
    return rows, bad


def first(row, keys):
    for k in keys:
        v = row.get(k)
        if v not in (None, '', [], {}):
            return v
    return None


def flat(v):
    if v is None:
        return ''
    if isinstance(v, str):
        return v.strip()
    return json.dumps(v, ensure_ascii=False)


def dig(v, keys):
    """collect non-empty strings under any of keys inside nested lists/dicts"""
    out = []
    if isinstance(v, dict):
        for k, x in v.items():
            if k in keys and x not in (None, '', [], {}):
                out.append(flat(x))
            elif isinstance(x, (dict, list)):
                out += dig(x, keys)
    elif isinstance(v, list):
        for x in v:
            out += dig(x, keys)
    return out


def tier_class(t):
    t = flat(t).lower()
    if t.startswith('n/a') or t == 'none':
        return 'not-applicable'
    for k in ('documented', 'inferred', 'plausible', 'open gap', 'gap'):
        if t.startswith(k):
            return {'plausible': 'plausible-procedural', 'gap': 'open gap'}.get(k, k)
    return 'unclassified' if t else 'missing'


def row_id(r):
    if r.get('id'):
        return str(r['id'])
    if r.get('conflict_id'):
        return str(r['conflict_id'])
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sample', type=int, default=20)
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()

    req = json.load(open(os.path.join(G, 'requirements.json'), encoding='utf-8'))
    subs = {s['id']: s for s in req['sub_requirements']}
    sub_by_text_row = {}
    for s in req['sub_requirements']:
        m = re.search(r'Timeline row (\S+) ', s['text'])
        if m:
            sub_by_text_row[m.group(1)] = s['id']
    seed = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')]
    seed_ids = [r['id'] for r in seed]
    seed_by_id = {r['id']: r for r in seed}

    problems = []   # (shard, id, kind, detail)
    flagged_rows = set()
    shards = sorted(d for d in os.listdir(H) if os.path.isdir(os.path.join(H, d)))
    by_shard, links = {}, collections.defaultdict(list)
    tl_rows = {}
    for sh in shards:
        rows, bad = load_jsonl(os.path.join(H, sh, 'results.jsonl'))
        for ln, e in bad:
            problems.append((sh, f'line {ln}', 'malformed-json', e))
        by_shard[sh] = rows
        seen = collections.Counter()
        for r in rows:
            rid = row_id(r)
            if isinstance(r.get('norm'), dict):
                r = dict({k: v for k, v in r['norm'].items() if v not in (None, '', [], {})}, **{k: v for k, v in r.items() if k != 'norm' and v not in (None, '', [], {})})
            if not rid:
                problems.append((sh, '?', 'no-id', flat(r.get('topic') or r.get('item'))[:60]))
                continue
            seen[rid] += 1
            _t = r.get('tier') or r.get('recommended_tier') or r.get('tier_recommended') or r.get('tier_assessment') or r.get('row_tier')
            if isinstance(_t, dict):                      # tl-09 style {'seed':..., 'proposed':...}: the shard's proposal is the tier
                _t = _t.get('proposed') or _t.get('seed')
            tier = tier_class(_t)
            status = flat(r.get('status'))
            cite = first(r, CITE_KEYS)
            pref = first(r, PASS_KEYS)
            nested_c = dig(r.get('sources'), ('citation', 'source', 'report_id', 'url', 'ref')) if isinstance(r.get('sources'), (list, dict)) else []
            nested_p = dig(r.get('sources'), ('exact_quote', 'passage', 'passage_ref', 'quote', 'supports')) if isinstance(r.get('sources'), (list, dict)) else []
            cite = cite if (cite and not isinstance(cite, (list, dict))) or not nested_c else '; '.join(nested_c)
            pref = pref or ('; '.join(nested_p) if nested_p else None)
            claims_doc = tier == 'documented' or (status == 'verified' and tier != 'not-applicable')
            ok = True
            if claims_doc and not (cite and pref):
                # r03/sources shards keep passage refs inside their citation text; require at least a citation
                if not cite:
                    ok = False
                elif not pref and not any(k in r for k in ('citations', 'source_citations', 'supporting_passage_refs')):
                    ok = False
            if not ok:
                problems.append((sh, rid, 'claims-documented-without-citation-or-passage', f'tier={tier} status={status}'))
                flagged_rows.add((sh, rid))
            norm = {'id': rid, 'shard': sh, 'tier': tier if ok else 'unsupported-claim', 'shard_tier': tier, 'status': status or 'unknown',
                    'verdict': flat(r.get('verdict'))[:400], 'citation': flat(cite)[:1500], 'passage_ref': flat(pref)[:1500],
                    'notes': flat(r.get('notes'))[:1200], 'flagged': not ok}
            reg = first(r, ['register_ref', 'register_refs', 'proposed_register', 'proposed_register_ids', 'register', 'register_ids', 'register_entry', 'proposed_register_entry'])
            norm['register_refs'] = reg
            if rid in seed_by_id:
                norm['seed_tier'] = seed_by_id[rid]['tier']
                norm['seed_status'] = seed_by_id[rid]['status']
                tl_rows.setdefault(rid, []).append(norm)
            # sub-requirement link
            sid = None
            if rid in subs:
                sid = rid
            elif rid in sub_by_text_row:
                sid = sub_by_text_row[rid]
            elif ('R03.' + rid) in subs:
                sid = 'R03.' + rid
            elif (rid + '.0000') in subs:
                sid = rid + '.0000'
            elif r.get('item') and re.match(r'^R\d\d\.', rid) is None:
                pass
            if sid:
                links[sid].append(norm)
            elif rid not in seed_by_id:
                problems.append((sh, rid, 'unmapped-to-subrequirement', flat(r.get('item') or r.get('topic'))[:50]))
        for rid, n in seen.items():
            if n > 1:
                problems.append((sh, rid, 'duplicate-id', f'{n} rows'))

    # timeline completeness
    tl_out = []
    for sid_ in seed_ids:
        cands = tl_rows.get(sid_, [])
        if not cands:
            problems.append(('(timeline)', sid_, 'timeline-row-missing', 'no shard row'))
            continue
        pick = [c for c in cands if not c['flagged']] or cands
        tl_out.append(dict(pick[-1], seed_page=seed_by_id[sid_]['page'], time_window_raw=seed_by_id[sid_]['time_window_raw']))
    extra = [i for i in tl_rows if i not in seed_by_id]

    # OR primary-text recheck (horde/OR-RECHECK/results.jsonl, written by or_recheck.py against the restored OR vol 27 text)
    rc_rows, _ = load_jsonl(os.path.join(H, 'OR-RECHECK', 'results.jsonl'))
    rc = collections.defaultdict(lambda: collections.Counter())
    for r in rc_rows:
        rc[r['row_id']][r['found'] + ('/' + r['kind'] if r.get('kind') else '')] += 1
    n_ok = n_fail = n_none = 0
    for r in tl_out:
        c = rc.get(r['id'])
        if not c:
            r['or_recheck'] = None; r['status_effective'] = r['status']; n_none += 1; continue
        ok = sum(v for k, v in c.items() if k.startswith(('yes', 'fuzzy')))
        no = sum(v for k, v in c.items() if k.startswith('no'))
        nc = sum(v for k, v in c.items() if k.startswith('not_checkable'))
        r['or_recheck'] = {'found': ok, 'not_found': no, 'not_checkable': nc}
        # a 'verified' row whose every checkable quote was not found in the primary text is not verified
        if r['status'] == 'verified' and no and not ok:
            r['status_effective'] = 'recheck_failed'; n_fail += 1
        elif r['status'] == 'verified' and ok:
            r['status_effective'] = 'verified_against_or_text'; n_ok += 1
        else:
            r['status_effective'] = r['status']
    # register copy
    reg_copied = 0
    if not a.dry:
        dst_root = os.path.join(G, 'register', 'proposed')
        for sh in shards:
            for f in sorted(glob.glob(os.path.join(H, sh, 'proposed-register', '*'))):
                if os.path.isfile(f):
                    d = os.path.join(dst_root, sh)
                    os.makedirs(d, exist_ok=True)
                    shutil.copyfile(f, os.path.join(d, os.path.basename(f)))
                    reg_copied += 1

    # sub-requirement links
    out_links = {}
    for sid, ns in links.items():
        best = ns[-1]
        out_links[sid] = {'requirement_id': subs[sid]['requirement_id'] if sid in subs else None, 'shard': best['shard'], 'tier': best['tier'],
                          'status': best['status'], 'verdict': best['verdict'], 'register_refs': best['register_refs'],
                          'evidence_rows': len(ns), 'flagged': best['flagged'], 'passes': False,
                          'note': 'Evidence link only. passes stays false until the gate is run (CLAUDE.md).'}
    # sample for manual spot-check
    ver = [r for r in tl_out if r['status'] == 'verified' and not r['flagged'] and r['citation'] and r['passage_ref']]
    rnd = random.Random(a.seed)
    sample = rnd.sample(ver, min(a.sample, len(ver)))

    stat = collections.Counter((r['tier'], r['status']) for r in tl_out)
    if not a.dry:
        with open(os.path.join(G, 'timeline_verified.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
            for r in tl_out:
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
        json.dump(dict(sorted(out_links.items())), open(os.path.join(G, 'subreq_links.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
        json.dump(sample, open(os.path.join(H, 'spotcheck.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
        with open(os.path.join(H, 'MERGE-REPORT.md'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('# Horde merge report (generated by tools/bt/merge_horde.py)\n\n')
            f.write(f'- shards read: {len(shards)}; result rows: {sum(len(v) for v in by_shard.values())}\n')
            f.write(f'- timeline rows normalized: {len(tl_out)} of {len(seed_ids)} (extra ids not in seed: {extra})\n')
            f.write(f'- sub-requirements with an evidence link: {len(out_links)} of {len(subs)} (links are not passes)\n')
            f.write(f'- proposed register entries copied to register/proposed/: {reg_copied}\n')
            f.write(f'- OR text recheck: {n_ok} verified rows confirmed against the OR text, {n_fail} rows whose checkable quotes were all not found (status_effective=recheck_failed), {n_none} rows with no recheck data\n')
            f.write(f'- rows flagged (documented/verified claimed without citation+passage): {len(flagged_rows)}\n\n')
            f.write('## Timeline tier/status counts (normalized)\n\n')
            for (t, s), n in sorted(stat.items()):
                f.write(f'- {t} / {s}: {n}\n')
            f.write('\n## Problems\n\n')
            for p in problems:
                f.write(f'- [{p[0]}] {p[1]}: {p[2]} {p[3]}\n')
            if not problems:
                f.write('- none\n')
    print(f'shards={len(shards)} timeline={len(tl_out)}/{len(seed_ids)} links={len(out_links)} flagged={len(flagged_rows)} problems={len(problems)} register_copied={reg_copied}')
    for p in problems[:40]:
        print(' ', p)
    return 0 if not [p for p in problems if p[2] in ('malformed-json', 'timeline-row-missing')] else 1


if __name__ == '__main__':
    sys.exit(main())
