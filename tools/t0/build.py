#!/usr/bin/env python3
"""Deterministic Tranche-0 release builder (chapter 02 WP-T0-03).

    python tools/t0/build.py --train R0|R1a|R1b|R1c [--out release/<train>]
    python tools/t0/build.py --all

Builds release/<train>/dist FROM the pinned baseline baseline/dist (trains.json "base": what production serves, reconstructed at source
level, per-file sha256 in tools/t0/baseline.lock.json; the build refuses a baseline that differs from its lock).  legacy/dist (the downloaded
deploy 6aa16d61) is never modified and only checked for being unmodified.  Order of work:
  bundle groups (fixed order) -> R0 rename/hash + mechanism -> page groups (path targets, PG-*.json) -> overlay -> config hook
  -> finalize (_ops/asset-manifest.json, version.json, _ops/used-names.txt) -> ledger check -> gates (gate.mjs) -> manifest.
See tools/t0/README.md for the plugin interface.  Exit codes: 0 ok, 2 precondition/anchor/overlay/ledger failure, 3 gate failure.
A build that fails AFTER it started writing never leaves something deployable behind: exit 2 removes release/<train>/dist (and any manifest.json /
gate.json of an earlier build) and writes BUILD-FAILED.json; exit 3 keeps the dist for inspection next to a BUILD-FAILED.json marker (the gate result
is in gate.json).  --keep-failed keeps the partial tree of an exit-2 failure as dist.failed.  Optional page groups (PG-legal) are built with --with.
"""
import argparse
import datetime
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from t0build import baseline as basemod, ledger, mechanism, patches  # noqa: E402
from t0build.util import (BuildError, REPO, T0, copy_tree, dump_json, load_json, md5_bytes, read_bytes, read_text,  # noqa: E402
                          rmtree_safe, sha256_bytes, tree_digest, walk_files, write_bytes, write_text)

SENTINEL = '/*t0:'
SKIP_OVERLAY = ('.gitkeep', 'README.md', 'README.txt')
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


class GateFailed(BuildError):
    """gate.mjs reported a failure (exit code 3); the dist is kept for inspection."""


def rel_to_repo(p):
    return os.path.relpath(p, REPO).replace(os.sep, '/')


def check_ledger_format(path):
    """The used-names ledger must be a well-formed TSV (name, sha256, bytes, zips, source) BEFORE anything is written: a line without tabs used to
    surface as an IndexError traceback from finalize() after the dist had been created (release verifier 2026-09-30)."""
    if not os.path.isfile(path):
        raise BuildError('ledger %s does not exist; run `python tools/t0/ledger.py seed` first' % rel_to_repo(path))
    with open(path, encoding='utf-8') as fh:
        for n, line in enumerate(fh, 1):
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            f = line.split('\t')
            if len(f) < 5 or not f[0] or len(f[1]) != 64 or any(c not in '0123456789abcdef' for c in f[1]) or not f[2].isdigit() or not f[3].isdigit() or not f[4]:
                raise BuildError('ledger %s line %d is malformed (want name<TAB>sha256<TAB>bytes<TAB>zips<TAB>source, got %r); do not hand-edit the '
                                 'ledger: restore it from git or regenerate with `python tools/t0/ledger.py seed`' % (rel_to_repo(path), n, line[:100]))


def legal_date_text(cfg):
    """'November 3, 2026' from the pinned ISO date trains.json legal.effective_date (no wall clock: builds stay deterministic)."""
    v = (cfg.get('legal') or {}).get('effective_date')
    try:
        y, m, d = (int(x) for x in str(v).split('-'))
        datetime.date(y, m, d)
        if len(str(v)) != 10:
            raise ValueError(v)
    except (ValueError, TypeError):
        raise BuildError('trains.json legal.effective_date must be an ISO date YYYY-MM-DD (the day the legal text is published), got %r' % (v,))
    return '%s %d, %d' % (MONTHS[m - 1], d, y)


def mark_failed(out, train, err, exit_code, keep_partial=False):
    """A failed build must not leave a deployable-looking release/<train>/dist.  exit 2 (nothing is shipped): remove dist, manifest.json, gate.json and
    the kill-switch copy of any earlier build, write BUILD-FAILED.json.  exit 3 (gate failed): keep dist and gate.json for inspection, add the marker."""
    os.makedirs(out, exist_ok=True)
    dist = os.path.join(out, 'dist')
    what = 'kept for inspection (the gate failed: see gate.json); NOT deployable'
    if exit_code == 2:
        if os.path.isdir(dist):
            if keep_partial:
                kept = os.path.join(out, 'dist.failed')
                rmtree_safe(kept)
                os.replace(dist, kept)
                what = 'partial tree kept as dist.failed (NOT deployable)'
            else:
                rmtree_safe(dist)
                what = 'removed'
        else:
            what = 'none was written'
        for f in ('manifest.json', 'gate.json'):
            if os.path.isfile(os.path.join(out, f)):
                os.remove(os.path.join(out, f))
        rmtree_safe(os.path.join(out, '_ops'))
    dump_json(os.path.join(out, 'BUILD-FAILED.json'), {'train': train, 'exit': exit_code, 'error': str(err)[:4000], 'dist': what, 'deployable': False})
    print('output marked failed: dist %s; marker %s/BUILD-FAILED.json' % (what, rel_to_repo(out)))


def check_input(base_dir, cfg, strict_tree, lock_path=None):
    """Pinned-input checks: sentinel refusal, main bundle md5, chunk/CSS sha256 (the bundle bytes did not change on 2026-09-30), and - for
    the default baseline - the per-file lock of baseline/dist (tools/t0/baseline.lock.json) plus the immutability of legacy/dist."""
    legacy_dir = base_dir
    if not os.path.isdir(legacy_dir):
        raise BuildError('baseline dist not found: %s' % legacy_dir)
    assets = os.path.join(legacy_dir, 'assets')
    if os.path.isdir(assets):
        for rel in walk_files(assets):
            if rel.endswith('.js'):
                head = read_bytes(os.path.join(assets, rel))[:200].decode('utf-8', 'replace')
                if SENTINEL in head:
                    raise BuildError('input %s already carries a %s sentinel: refusing to patch already-patched output'
                                     % ('assets/' + rel, SENTINEL))
    L = cfg['legacy']
    entry = os.path.join(legacy_dir, L['entry'])
    if not os.path.isfile(entry):
        raise BuildError('pinned entry bundle %s not found in %s' % (L['entry'], rel_to_repo(legacy_dir)))
    md5 = md5_bytes(read_bytes(entry))
    if md5 != L['entry_md5']:
        raise BuildError('entry bundle md5 %s != pinned %s (the anchors are tied to this exact input)' % (md5, L['entry_md5']))
    for rel, want in sorted(L['sha256'].items()):
        p = os.path.join(legacy_dir, rel)
        if not os.path.isfile(p):
            raise BuildError('pinned legacy file %s missing' % rel)
        got = sha256_bytes(read_bytes(p))
        if got != want:
            raise BuildError('legacy file %s sha256 %s != pinned %s' % (rel, got, want))
    if strict_tree:
        lock = lock_path or os.path.join(REPO, cfg['base']['lock'])
        problems = basemod.check_lock(legacy_dir, lock)
        if problems:
            raise BuildError('the baseline %s differs from %s (the build is pinned to it; if live moved, follow "Live drifted" in '
                             'ops/RELEASE-RUNBOOK.md):\n  %s' % (rel_to_repo(legacy_dir), rel_to_repo(lock), '\n  '.join(problems[:20])))
        tree, n, _ = tree_digest(os.path.join(REPO, cfg['legacy']['dir']))
        if tree != L['tree_sha256'] or n != L['file_count']:
            raise BuildError('legacy tree digest %s (%d files) != pinned %s (%d files): legacy/ must stay byte-exact'
                             % (tree, n, L['tree_sha256'], L['file_count']))
    return md5


def apply_overlay(dist, names, overlay_root, records_out, live_changed=()):
    """Copy overlay files over dist.  An overlay file may REPLACE a baseline file only when production itself never changed that file
    (trains.json base.changed_vs_legacy, from baseline.lock.json): a replacement of a live-changed file would silently revert live.  Merge
    such a file with a patch (PG-*.json / C+*.json) instead."""
    applied = []
    for name in names:
        root = os.path.join(overlay_root, name)
        if not os.path.isdir(root):
            continue
        for rel in walk_files(root):
            if os.path.basename(rel) in SKIP_OVERLAY:
                continue
            if rel in patches.RESERVED_FILES or rel.startswith('_ops/'):
                raise BuildError('overlay/%s/%s would replace a file generated by the build' % (name, rel))
            dst = os.path.join(dist, rel)
            replaced = os.path.isfile(dst)
            if replaced and rel in live_changed:
                raise BuildError('overlay/%s/%s would REPLACE a file that production changed after the legacy deploy (%s): merge it with a '
                                 'patch instead of clobbering live' % (name, rel, ', '.join(sorted(live_changed))))
            write_bytes(dst, read_bytes(os.path.join(root, rel)))
            applied.append({'overlay': name, 'path': rel, 'replaced': replaced})
    records_out.extend(applied)
    return applied


def run_config_hook(dist, cfg, rel, train, hook_override=None):
    hook = os.path.abspath(os.path.join(REPO, hook_override)) if hook_override else os.path.join(REPO, cfg['config_hook'])
    if not os.path.isfile(hook):
        raise BuildError('config hook %s missing (train %s requires it)' % (rel_to_repo(hook), train))
    _, _, before = tree_digest(dist)
    env = dict(os.environ, T0_TRAIN=train)
    payload = json.dumps({'rid': rel['rid'], 'entry': rel['entry'], 'help': rel['help'], 'bookmark': rel['bookmark'], 'css': rel['css']})
    r = subprocess.run(['node', hook, dist, payload], cwd=REPO, env=env, capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0:
        raise BuildError('config hook failed (exit %d):\n%s%s' % (r.returncode, r.stdout, r.stderr))
    _, _, after = tree_digest(dist)
    changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
    allowed = cfg['config_allowed_outputs']
    bad = [c for c in changed if not any(c == a or (a.endswith('/') and c.startswith(a)) for a in allowed)]
    if bad:
        raise BuildError('config hook wrote outside its allowed set %s: %s' % (allowed, bad))
    return {'changed': changed, 'stdout': r.stdout.strip()}


def finalize(dist, cfg, rel, train, groups, input_md5, ledger_path, legacy_names):
    """version.json, _ops/asset-manifest.json, _ops/used-names.txt (ledger + this release's new names, not recorded)."""
    assets = {}
    for f in walk_files(os.path.join(dist, 'assets')):
        data = read_bytes(os.path.join(dist, 'assets', f))
        assets['assets/' + f] = {'bytes': len(data), 'sha256': sha256_bytes(data)}
    release = {'release': rel['rid'], 'train': train, 'entry': rel['entry'], 'help': rel['help'], 'bookmark': rel['bookmark'],
               'css': rel['css'], 'groups': groups, 'source_entry_md5': input_md5}
    dump_json(os.path.join(dist, 'version.json'), release)
    dump_json(os.path.join(dist, '_ops', 'asset-manifest.json'), {'assets': assets, 'release': release})
    lines = read_text(ledger_path).rstrip('\n').split('\n') if os.path.isfile(ledger_path) else list(ledger.HEADER)
    have = {(ln.split('\t')[0][len('assets/'):].lower(), ln.split('\t')[1]) for ln in lines if ln and not ln.startswith('#')}
    for name, meta in sorted(assets.items()):
        base = name[len('assets/'):]
        if base.lower() in legacy_names or (base.lower(), meta['sha256']) in have:
            continue
        lines.append('\t'.join([name, meta['sha256'], str(meta['bytes']), '1', 'release:%s:%s' % (train, rel['rid'])]))
    head = [ln for ln in lines if ln.startswith('#')]
    if train not in ('R0', 'R1a', 'R1b', 'R1c'):
        # trains after R1c ship this file to the public site: its header names no build tool (the repository's own ledger, ops/used-names.txt, keeps its wording)
        head = ['# Asset names this site has used: name, sha256, bytes, number of releases that carried it, first release.',
                '# Names are compared case-insensitively. A new asset name must not appear here; an existing name must keep its bytes.']

    def public(ln):
        # the deployed copy names no archive files (zip names are the owner's private filing); releases keep their tag
        f = ln.split('\t')
        return '\t'.join(f[:4] + [f[4] if f[4].startswith('release:') else 'archive'])

    body = sorted((public(ln) for ln in lines if ln and not ln.startswith('#')), key=lambda s: (s.split('\t')[0].lower(), s.split('\t')[1]))
    write_text(os.path.join(dist, '_ops', 'used-names.txt'), '\n'.join(head + body) + '\n')


def build_train(train, args, cfg):
    """One train.  Failures before anything is written leave the previous output alone; once the build has started writing into the output
    directory a failure removes (exit 2) or marks (exit 3) it, so release/<train>/dist is never a half-built tree that looks deployable."""
    out = os.path.abspath(os.path.join(REPO, args.out)) if args.out else os.path.join(REPO, 'release', train)
    state = {'touched': False}
    try:
        return _build_train(train, args, cfg, out, state)
    except GateFailed as e:
        mark_failed(out, train, e, 3)
        raise
    except BuildError as e:
        if state['touched']:
            mark_failed(out, train, e, 2, args.keep_failed)
        raise


def _build_train(train, args, cfg, out, state):
    dist = os.path.join(out, 'dist')
    legacy_dir = os.path.abspath(os.path.join(REPO, args.legacy or args.base_dir or cfg['base']['dir']))
    lock_path = os.path.abspath(os.path.join(REPO, args.base_lock)) if args.base_lock else os.path.join(REPO, cfg['base']['lock'])
    patches_dir = os.path.abspath(os.path.join(REPO, args.patches)) if args.patches else os.path.join(T0, 'patches')
    overlay_root = os.path.abspath(os.path.join(REPO, args.overlay)) if args.overlay else os.path.join(T0, 'overlay')
    ledger_path = os.path.abspath(os.path.join(REPO, args.ledger)) if args.ledger else ledger.LEDGER
    L = cfg['legacy']
    tcfg = cfg['trains'][train]
    print('== build %s -> %s' % (train, rel_to_repo(out)))

    check_ledger_format(ledger_path)
    strict = not args.legacy
    input_md5 = check_input(legacy_dir, cfg, strict_tree=strict, lock_path=lock_path)
    print('input ok: entry md5 %s, %s' % (input_md5, 'baseline %s pinned by %s, legacy/ unmodified' % (cfg['base']['dir'], cfg['base']['lock'])
                                         if strict else 'TREE PIN SKIPPED (--legacy/--base override)'))

    found = patches.load_groups(patches_dir, cfg, train)
    order_cfg = dict(cfg)
    if args.order == 'runbook':
        order_cfg['group_order'] = cfg['runbook_order']
    bundle_groups, page_groups = patches.select_groups(found, order_cfg, train, tuple(args.with_groups))
    print('bundle groups: %s   page groups: %s' % (' '.join(bundle_groups), ' '.join(page_groups) or '(none)'))
    for g in args.with_groups:
        if g not in bundle_groups and g not in page_groups:
            print('note: --with %s is not part of train %s (it starts at a later train); nothing was added' % (g, train))
    skipped_optional = sorted(g for g, v in found.items() if v['pg'] and v.get('optional') and g not in page_groups)
    if skipped_optional and tcfg.get('page_groups'):
        print('optional page group(s) NOT included (opt-in with --with): %s' % ' '.join(skipped_optional))

    texts = {k: read_text(os.path.join(legacy_dir, L[k])) for k in ('entry', 'help', 'book', 'css')}
    texts['js'] = texts.pop('entry')
    records = []
    bad = patches.apply_bundle_phase(texts, bundle_groups, found, records)
    if args.dump_stage:
        os.makedirs(args.dump_stage, exist_ok=True)
        for k, v in texts.items():
            write_text(os.path.join(args.dump_stage, k + '.txt'), v)

    def write_anchors(status):
        state['touched'] = True
        dump_json(os.path.join(out, 'anchors.json'), {
            'train': train, 'status': status, 'groups': bundle_groups + page_groups,
            'summary': {'patches': len(records), 'failed': sum(1 for r in records if not r['ok'] or r['found'] != r['expect'])},
            'patches': [r for r in records if 'overlay' not in r]})

    def fail_anchors(bad_list):
        os.makedirs(out, exist_ok=True)
        write_anchors('failed')
        for b in bad_list:
            print('  ANCHOR FAIL  [%s] %s: expected %d, found %d%s' % (b['group'], b['id'], b['expect'], b['found'],
                                                                   ' (%s)' % b['error'] if b.get('error') else ''))
        raise BuildError('%d patch anchor(s) failed; nothing is deployable: the output holds only %s and BUILD-FAILED.json' % (len(bad_list), os.path.join(out, 'anchors.json').replace(os.sep, '/')))

    if bad:
        fail_anchors(bad)
    print('bundle phase: %d patches applied' % len(records))

    state['touched'] = True
    rmtree_safe(out)
    copy_tree(legacy_dir, dist)
    rel = mechanism.run(dist, texts, cfg, train, records)
    print('release id %s: %s %s %s %s' % (rel['rid'], rel['entry'], rel['help'], rel['bookmark'], rel['css']))

    prel = dict(rel)
    if 'PG-legal' in page_groups:
        prel['legal_date'] = legal_date_text(cfg)       # pinned in trains.json (legal.effective_date); {{LEGAL_DATE}} in the legal patches
        print('legal text dated %s (trains.json legal.effective_date)' % prel['legal_date'])
    bad, deleted = patches.apply_page_phase(dist, bundle_groups + page_groups, found, prel, records)
    if bad:
        fail_anchors(bad)
    if deleted:
        print('deleted from dist: %s' % ', '.join(deleted))
    live_changed = set()
    if strict and os.path.isfile(lock_path):
        live_changed = set(load_json(lock_path).get('changed_vs_legacy', []))
    overlay = apply_overlay(dist, tcfg['overlay'], overlay_root, [], live_changed)
    print('overlay: %d file(s) from %s' % (len(overlay), ', '.join(tcfg['overlay'])))
    hook = None
    if tcfg.get('config'):
        hook = run_config_hook(dist, cfg, rel, train, args.config_hook or tcfg.get('config_hook'))      # trains.json trains.<T>.config_hook: a train's own hook (R1d: gen.mjs + the immutable tile class of BASE1863)
        print('config hook: %d file(s) written/changed %s' % (len(hook['changed']), hook['stdout'][:120]))
    legacy_names = {os.path.basename(p).lower() for p in walk_files(os.path.join(legacy_dir, 'assets'))}
    finalize(dist, cfg, rel, train, bundle_groups + page_groups, input_md5, ledger_path, legacy_names)
    problems = ledger.check(dist, ledger.load(ledger_path), legacy_names)
    if problems:
        raise BuildError('used-names ledger check failed:\n  ' + '\n  '.join(problems))
    # the kill switch is NOT part of the public dist: the build keeps an identical copy beside it (release/<train>/_ops/sw-kill.js)
    kill_src = os.path.join(REPO, 'ops', 'sw-kill.js')
    if not os.path.isfile(kill_src):
        raise BuildError('ops/sw-kill.js (the level-2 kill switch) is missing')
    write_bytes(os.path.join(out, '_ops', 'sw-kill.js'), read_bytes(kill_src))
    write_anchors('ok')
    if args.record:
        added = ledger.record(dist, train, rel['rid'], ledger_path, legacy_names)
        print('ledger: recorded %d new name(s) in %s (commit it)' % (len(added), rel_to_repo(ledger_path)))

    gate_rc = 0
    if not args.no_gate:
        gate = ['node', os.path.join(T0, 'gate.mjs'), '--train', train, '--dist', dist, '--anchors', os.path.join(out, 'anchors.json'),
                '--out', os.path.join(out, 'gate.json'), '--legacy', legacy_dir, '--ledger', ledger_path]
        if not args.out:
            gate += ['--cache', os.path.join(REPO, 'release', '.cache')]     # default layout shares one cache; with --out the gate writes beside it
        gate_rc = subprocess.run(gate, cwd=REPO).returncode
    tree, nfiles, files = tree_digest(dist)
    base_tree, base_n, _ = tree_digest(legacy_dir)
    dump_json(os.path.join(out, 'manifest.json'), {
        'train': train, 'release': rel, 'groups': bundle_groups + page_groups, 'tree_sha256': tree, 'file_count': nfiles,
        'baseline': {'dir': rel_to_repo(legacy_dir), 'tree_sha256': base_tree, 'file_count': base_n, 'locked': strict},
        'total_bytes': sum(v[0] for v in files.values()), 'source_entry_md5': input_md5, 'overlay': overlay,
        'deleted': deleted, 'config_hook': hook,
        'kill_switch': {'path': '_ops/sw-kill.js', 'public': False, 'sha256': sha256_bytes(read_bytes(kill_src))},
        'files': {k: {'bytes': v[0], 'sha256': v[1]} for k, v in sorted(files.items())}})
    print('tree sha256 %s (%d files, %d bytes)' % (tree, nfiles, sum(v[0] for v in files.values())))
    if gate_rc:
        raise GateFailed('gate failed for %s (see %s/gate.json)' % (train, rel_to_repo(out)))
    return {'train': train, 'rid': rel['rid'], 'tree_sha256': tree, 'out': out}


def main(argv=None):
    for _st in (sys.stdout, sys.stderr):      # patch ids / paths may hold non-ASCII text; never die on a cp1252 console
        try:
            _st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--train', choices=['R0', 'R1a', 'R1b', 'R1c', 'R1d', 'R1e', 'R1f', 'R1g'], help='train to build (default R0)')
    ap.add_argument('--all', action='store_true', help='build every train (R0, R1a, R1b, R1c) into release/<train>')
    ap.add_argument('--out', help='output directory (default release/<train>); must be under release/ or tmp/')
    ap.add_argument('--with', dest='with_groups', action='append', default=[], metavar='GROUP',
                    help='include an optional group: a bundle group named in trains.json optional_groups (empty today) or an optional page group such as PG-legal '
                         '(the interim privacy/terms text is OPT-IN since 2026-09-30: python tools/t0/build.py --train R1c --with PG-legal)')
    ap.add_argument('--record', action='store_true', help='append this train\'s new asset names to ops/used-names.txt (owner step at deploy time)')
    ap.add_argument('--no-gate', action='store_true', help='skip gate.mjs (development only)')
    ap.add_argument('--keep-failed', action='store_true', help='after an exit-2 failure keep the partial tree as <out>/dist.failed (default: remove it, so nothing deployable-looking is left)')
    ap.add_argument('--order', choices=['fixed', 'runbook'], default='fixed', help='group order (runbook = the chapter-02 order; gives identical shipped files, only version.json and _ops/asset-manifest.json, which record the order, differ)')
    ap.add_argument('--dump-stage', help='write the bundle texts after the bundle phase to this directory (diagnostics)')
    g = ap.add_argument_group('test overrides (used by tests/t0/build_selftest.py)')
    g.add_argument('--legacy', dest='legacy', help='alternative input tree (skips the baseline lock; the entry md5 pin still applies)')
    g.add_argument('--base-dir', help='alternative baseline tree that is STILL checked against the lock (proves the refusal)')
    g.add_argument('--base-lock', help='alternative lock file for --base-dir / the default baseline')
    g.add_argument('--patches', help='alternative patches directory')
    g.add_argument('--overlay', help='alternative overlay root')
    g.add_argument('--ledger', help='alternative ledger file')
    g.add_argument('--config-hook', help='alternative config hook script')
    args = ap.parse_args(argv)
    cfg = load_json(os.path.join(T0, 'trains.json'))
    trains = cfg['train_order'] if args.all else [args.train or 'R0']
    if args.all and args.out:
        ap.error('--out cannot be combined with --all')
    results = []
    try:
        for t in trains:
            results.append(build_train(t, args, cfg))
    except GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    print('OK: ' + ', '.join('%s=%s' % (r['train'], r['rid']) for r in results))
    return 0


if __name__ == '__main__':
    sys.exit(main())
