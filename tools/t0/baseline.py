#!/usr/bin/env python3
"""The build baseline: mirror production, reconstruct its source tree (baseline/dist), prove it, pin it, and check live against it.

    python tools/t0/baseline.py verify-live            # RUN THIS IMMEDIATELY BEFORE EVERY DEPLOY: IDENTICAL or DRIFTED (per-file diff)
    python tools/t0/baseline.py verify                 # baseline/dist against tools/t0/baseline.lock.json (no network)
    python tools/t0/baseline.py mirror                 # fetch live into baseline/live-2026-09-30/raw (curl, identity, cache-busted)
    python tools/t0/baseline.py reconstruct            # raw -> baseline/dist (non-html as served; html with Netlify post-processing undone)
    python tools/t0/baseline.py prove                  # post-processing model applied to baseline/dist == every served response
    python tools/t0/baseline.py lock                   # write tools/t0/baseline.lock.json from baseline/dist
    python tools/t0/baseline.py compare-legacy         # every difference between legacy/dist and baseline/dist (source level)

Exit codes: 0 ok / IDENTICAL, 1 DRIFTED or a failed proof, 2 could not run (network, missing tree, altered baseline).  legacy/ is only read.
See tools/t0/README.md ("The baseline") and docs/baseline-drift.md.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from t0build import baseline as B   # noqa: E402
from t0build.util import BuildError, REPO, dump_json, load_json   # noqa: E402

DEFAULT_MIRROR = 'baseline/live-2026-09-30'


def _utf8():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass


def paths():
    cfg = B.cfg()
    base = cfg.get('base', {})
    return {
        'cfg': cfg,
        'dist': os.path.join(REPO, base.get('dir', 'baseline/dist')),
        'mirror': os.path.join(REPO, base.get('mirror', DEFAULT_MIRROR)),
        'origin': base.get('origin', B.DEFAULT_ORIGIN),
        'legacy': os.path.join(REPO, cfg['legacy']['dir']),
        'lock': os.path.join(REPO, base.get('lock', 'tools/t0/baseline.lock.json')),
    }


def print_findings(findings, out=print):
    for f in findings:
        tag = {'drift': 'DRIFT', 'missing': 'MISSING', 'unexpected': 'EXPOSED', 'new': 'NEW ON LIVE', 'config': 'CONFIG', 'ok': 'OK'}[f['state']]
        out('  %-11s %s' % (tag, f['path']))
        for d in f.get('detail', []):
            out('      ' + d)


def cmd_mirror(a, P):
    out = os.path.join(REPO, a.out) if a.out else P['mirror']
    if os.path.isfile(os.path.join(out, 'SHA256.tsv')) and not a.force:
        raise BuildError('%s already holds a mirror (committed evidence); pass --out baseline/live-<date> for a new one, or --force to replace it' % B.rel_to_repo(out))
    seeds = [P['legacy']] + ([P['dist']] if os.path.isdir(P['dist']) else [])
    B.mirror(out, a.origin or P['origin'], seeds, concurrency=a.concurrency)
    return 0


def cmd_reconstruct(a, P):
    out = os.path.join(REPO, a.out) if a.out else P['mirror']
    if os.path.isdir(P['dist']) and not B.check_lock(P['dist'], P['lock']) and not a.replace:
        raise BuildError('%s is the LOCKED baseline; reconstruct would replace it. Pass --replace (the "live drifted" procedure, runbook section 15), then run lock' % B.rel_to_repo(P['dist']))
    seeds = [P['legacy']]
    rep = B.reconstruct(out, seeds, P['dist'])
    dump_json(os.path.join(out, 'RECONSTRUCTION.json'), rep)
    return 0


def cmd_prove(a, P):
    out = os.path.join(REPO, a.out) if a.out else P['mirror']
    ok, rep = B.prove(out, P['dist'])
    dump_json(os.path.join(out, 'PROOF.json'), rep)
    if not ok:
        print_findings(rep['findings'])
    print('PROOF %s' % ('HOLDS: model(baseline/dist) == live bytes for every file' if ok else 'FAILS'))
    return 0 if ok else 1


def cmd_lock(a, P):
    if not os.path.isdir(P['dist']):
        raise BuildError('baseline tree %s does not exist (run reconstruct first)' % B.rel_to_repo(P['dist']))
    leg, bas = B.read_tree(P['legacy']), B.read_tree(P['dist'])
    changed = sorted(p for p in set(leg) | set(bas) if leg.get(p) != bas.get(p))
    meta = {'mirror': B.rel_to_repo(P['mirror']), 'legacy_tree_sha256': P['cfg']['legacy']['tree_sha256'],
            'changed_vs_legacy': changed}
    mj = os.path.join(P['mirror'], 'MIRROR.json')
    if os.path.isfile(mj):
        m = load_json(mj)
        meta['live_deploy_id'] = m.get('rum_deploy_id')
    lock = B.make_lock(P['dist'], P['origin'], meta)
    dump_json(P['lock'], lock)
    print('locked %d files, tree %s -> %s' % (lock['file_count'], lock['tree_sha256'], B.rel_to_repo(P['lock'])))
    return 0


def cmd_verify(a, P):
    problems = B.check_lock(P['dist'], P['lock'])
    if problems:
        print('BASELINE ALTERED: %s differs from %s' % (B.rel_to_repo(P['dist']), B.rel_to_repo(P['lock'])))
        for p in problems:
            print('  ' + p)
        return 2
    lock = load_json(P['lock'])
    print('baseline ok: %s matches %s (%d files, tree %s)' % (B.rel_to_repo(P['dist']), B.rel_to_repo(P['lock']), lock['file_count'], lock['tree_sha256']))
    return 0


def cmd_verify_live(a, P):
    problems = B.check_lock(P['dist'], P['lock'])
    if problems:
        print('BASELINE ALTERED (not a live-drift result): %s no longer matches %s' % (B.rel_to_repo(P['dist']), B.rel_to_repo(P['lock'])))
        for p in problems[:20]:
            print('  ' + p)
        return 2
    hdr = os.path.join(P['mirror'], 'headers.key.json')
    origin = a.origin or P['origin']
    print('verify-live: baseline/dist (tree %s) vs %s ...' % (load_json(P['lock'])['tree_sha256'][:16], origin))
    state, rep = B.verify_live(P['dist'], origin, a.concurrency, hdr if not a.no_headers else None)
    if state == 'ERROR':
        print('ERROR: ' + rep['error'])
        return 2
    if a.out:
        dump_json(os.path.join(REPO, a.out), rep)
    if rep['findings']:
        print_findings([f for f in rep['findings'] if a.verbose or f['state'] != 'config'])
    cfgn = [f for f in rep['findings'] if f['state'] == 'config']
    if cfgn:
        print('  (%d config file(s) are not served and cannot be compared by bytes: %s)' % (len(cfgn), ', '.join(f['path'] for f in cfgn)))
    if rep['headers_changed']:
        print('HEADERS: %d difference(s) from the 2026-09-30 snapshot (netlify.toml/_headers/dashboard change?) - not counted as file drift:' % len(rep['headers_changed']))
        for h in rep['headers_changed'][:25]:
            print('  ' + h)
    if rep['dangling_refs_on_live']:
        print('note: live references paths that answer non-200: %s' % ', '.join(rep['dangling_refs_on_live'][:10]))
    if state == 'IDENTICAL':
        print('IDENTICAL: live == baseline/dist (%d files checked, %d pages in both URL forms, %d requests; live deploy %s). Safe to deploy a release built on this baseline.'
              % (rep['files_checked'], rep['html_pages'], rep['requests'], rep['live_deploy_id']))
        return 0
    print('DRIFTED: %d file(s) differ from baseline/dist (live deploy %s): %s' % (len(rep['drifted']), rep['live_deploy_id'], ', '.join(rep['drifted'])))
    print('DO NOT DEPLOY. Follow "Live drifted" in ops/RELEASE-RUNBOOK.md (re-mirror, reconstruct, re-anchor, rebuild, re-test).')
    return 1


def cmd_compare_legacy(a, P):
    leg = B.read_tree(P['legacy'])
    bas = B.read_tree(P['dist'])
    rows = []
    for p in sorted(set(leg) | set(bas)):
        if p not in bas:
            rows.append((p, 'only in legacy'))
        elif p not in leg:
            rows.append((p, 'only in baseline'))
        elif leg[p] != bas[p]:
            rows.append((p, 'changed'))
    print('legacy/dist %d files, baseline/dist %d files, %d differ' % (len(leg), len(bas), len(rows)))
    for p, why in rows:
        print('%s: %s' % (why.upper(), p))
        if why == 'changed':
            for ln in B.text_diff(leg[p], bas[p], limit=a.limit, label_a='legacy', label_b='baseline'):
                print('    ' + ln)
    return 0


def main(argv=None):
    _utf8()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    for name, fn, help_ in [('mirror', cmd_mirror, 'fetch the live site'), ('reconstruct', cmd_reconstruct, 'raw -> baseline/dist'),
                            ('prove', cmd_prove, 'model(baseline/dist) == live'), ('lock', cmd_lock, 'write baseline.lock.json'),
                            ('verify', cmd_verify, 'baseline/dist vs lock'), ('verify-live', cmd_verify_live, 'baseline/dist vs the live site (pre-deploy gate)'),
                            ('compare-legacy', cmd_compare_legacy, 'legacy/dist vs baseline/dist')]:
        p = sub.add_parser(name, help=help_)
        p.set_defaults(fn=fn)
        p.add_argument('--out', help='mirror directory (default baseline/live-2026-09-30) or, for verify-live, a JSON report path')
        p.add_argument('--origin', help='site origin (default %s)' % B.DEFAULT_ORIGIN)
        p.add_argument('--concurrency', type=int, default=4)
        p.add_argument('--no-headers', action='store_true', help='verify-live: skip the header snapshot comparison')
        p.add_argument('--force', action='store_true', help='mirror: replace an existing mirror folder')
        p.add_argument('--replace', action='store_true', help='reconstruct: replace the locked baseline/dist (then run lock)')
        p.add_argument('--verbose', action='store_true')
        p.add_argument('--limit', type=int, default=60, help='compare-legacy: diff lines per file')
    a = ap.parse_args(argv)
    try:
        return a.fn(a, paths())
    except BuildError as e:
        print('ERROR:', e)
        return 2


if __name__ == '__main__':
    sys.exit(main())
