#!/usr/bin/env python3
"""Apply one candidate group of train R1h to a scratch overlay of the files it touches.

    python3 candidates/r1h/_lib/apply_group.py <id> [--base release/R1g/dist] [--out tmp/r1h-cand/<id>/green]
                                                    [--group candidates/r1h/<id>/group.json] [--overlay candidates/r1h/<id>/overlay]

What it does (the semantic of tools/t0/build.py, not a re-implementation: it calls t0build.patches.apply_patch):
  * reads <group> (a patch group file in the format of tools/t0/README.md "Patch data files"); every patch is counted against the CURRENT
    text of its target (the base tree, or the scratch copy if an earlier patch of the group already changed it) and the count must equal
    `expect`; a wrong count fails the run and names the patch id (the text is then left unchanged);
  * path targets are patched like the page phase of the build (LF-authored strings adapt to CRLF pages; placeholders {{RID}} {{ENTRY}}
    {{HELP}} {{BOOK}} {{CSS}} {{TRAIN}} come from <base>/version.json);
  * bundle targets (js, help, book, css) are patched in the built bundle files named by <base>/version.json (the text after the release
    rename; a group that patches the bundle must be anchored on that text, and the release workstream re-proves it in a full build);
  * copies <overlay>/** next to the patched files (new files, path relative to the dist root); `delete` entries are listed in _deleted.json;
  * writes ONLY the touched files into <out> (a sparse tree). Tests read it through candidates/r1h/_lib/tree.mjs, which falls back to
    <base> for every file the group did not touch.
Exit codes: 0 every anchor asserted, 2 anchor/format failure (the report names every offending patch id), 64 usage.
The report is written to tmp/r1h-cand/<id>/report.json. Nothing outside tmp/ is written.
"""
import argparse
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 't0'))
from t0build import patches as P  # noqa: E402
from t0build.util import BuildError, read_bytes, read_text, write_bytes, write_text  # noqa: E402


def load_group(path):
    with open(path, encoding='utf-8') as fh:
        g = json.load(fh)
    if not isinstance(g, dict):
        raise BuildError('%s: a group file is a JSON object' % path)
    unknown = set(g) - P.GROUP_KEYS
    if unknown:
        raise BuildError('%s: unknown group keys %s (allowed: %s)' % (path, sorted(unknown), sorted(P.GROUP_KEYS)))
    if not isinstance(g.get('group'), str) or not g['group']:
        raise BuildError('%s: "group" must name the group' % path)
    if not isinstance(g.get('patches', []), list):
        raise BuildError('%s: "patches" must be a list' % path)
    ids = set()
    is_pg = g['group'].startswith('PG-')
    for p in g.get('patches', []):
        P.validate_patch(p, '%s' % path, is_pg)
        if p['id'] in ids:
            raise BuildError('%s: duplicate patch id %s' % (path, p['id']))
        ids.add(p['id'])
        p['_group'] = g['group']
    for d in g.get('delete', []) or []:
        if not P.valid_rel_path(d):
            raise BuildError('%s: delete entry %r is not a relative posix path' % (path, d))
    return g


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('id')
    ap.add_argument('--base', default='release/R1g/dist')
    ap.add_argument('--out')
    ap.add_argument('--group')
    ap.add_argument('--overlay')
    ap.add_argument('--report')
    a = ap.parse_args(argv)
    cdir = os.path.join(REPO, 'candidates', 'r1h', a.id)
    base = os.path.abspath(os.path.join(REPO, a.base))
    out = os.path.abspath(os.path.join(REPO, a.out or os.path.join('tmp', 'r1h-cand', a.id, 'green')))
    group_path = os.path.abspath(os.path.join(REPO, a.group or os.path.join('candidates', 'r1h', a.id, 'group.json')))
    overlay = os.path.abspath(os.path.join(REPO, a.overlay or os.path.join('candidates', 'r1h', a.id, 'overlay')))
    report_path = os.path.abspath(os.path.join(REPO, a.report or os.path.join('tmp', 'r1h-cand', a.id, 'report.json')))
    tmp_root = os.path.join(REPO, 'tmp')
    for p in (out, report_path):
        if not os.path.abspath(p).startswith(tmp_root + os.sep):
            print('refusing to write outside tmp/: %s' % p, file=sys.stderr)
            return 64
    if not os.path.isdir(base):
        print('base tree not found: %s' % base, file=sys.stderr)
        return 64
    try:
        v = json.load(open(os.path.join(base, 'version.json'), encoding='utf-8'))
    except (OSError, ValueError) as e:
        print('base tree has no readable version.json: %s' % e, file=sys.stderr)
        return 64
    rel = {'rid': v['release'], 'entry': v['entry'], 'help': v['help'], 'bookmark': v['bookmark'], 'css': v['css'],
           'train': 'R1h', 'legal_date': None}
    bundle_file = {'js': 'assets/' + v['entry'], 'help': 'assets/' + v['help'], 'book': 'assets/' + v['bookmark'],
                   'css': 'assets/' + v['css']}

    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    records, bad, deleted, copied = [], [], [], []
    has_group = os.path.isfile(group_path)
    group = None
    try:
        if has_group:
            group = load_group(group_path)

        def cur_path(rel_path):
            q = os.path.join(out, rel_path)
            return q if os.path.isfile(q) else os.path.join(base, rel_path)

        for p in (group or {}).get('patches', []):
            is_bundle = p['target'] in P.BUNDLE_TARGETS
            rel_path = bundle_file[p['target']] if is_bundle else p['target']
            src = cur_path(rel_path)
            if not os.path.isfile(src):
                rec = {'group': p['_group'], 'id': p['id'], 'target': p['target'], 'expect': p['expect'], 'found': 0, 'ok': False,
                       'regex': bool(p.get('regex')), 'error': 'target file does not exist: %s' % rel_path}
                records.append(rec)
                bad.append(rec)
                continue
            text = read_text(src)
            new, rec = P.apply_patch(text, p, None if is_bundle else rel)
            rec['file'] = rel_path
            records.append(rec)
            if rec['ok']:
                if new != text or not os.path.isfile(os.path.join(out, rel_path)):
                    write_text(os.path.join(out, rel_path), new)
            else:
                bad.append(rec)
        for d in (group or {}).get('delete', []) or []:
            exists = os.path.isfile(os.path.join(base, d)) or os.path.isfile(os.path.join(out, d))
            rec = {'group': group['group'], 'id': 'delete:' + d, 'target': d, 'expect': 1, 'found': 1 if exists else 0, 'ok': exists,
                   'regex': False}
            records.append(rec)
            if exists:
                deleted.append(d)
            else:
                rec['error'] = 'file to delete does not exist'
                bad.append(rec)
        if os.path.isdir(overlay):
            for root, _dirs, files in os.walk(overlay):
                for fn in sorted(files):
                    full = os.path.join(root, fn)
                    relp = os.path.relpath(full, overlay).replace(os.sep, '/')
                    if relp in P.RESERVED_FILES or any(relp.startswith(x) for x in P.RESERVED_PREFIXES):
                        rec = {'group': 'overlay', 'id': 'overlay:' + relp, 'target': relp, 'expect': 1, 'found': 0, 'ok': False,
                               'error': 'overlay path is generated by the build'}
                        records.append(rec)
                        bad.append(rec)
                        continue
                    replaced = os.path.isfile(os.path.join(base, relp)) or os.path.isfile(os.path.join(out, relp))
                    write_bytes(os.path.join(out, relp), read_bytes(full))
                    copied.append({'path': relp, 'replaced': replaced})
        if deleted:
            write_text(os.path.join(out, '_deleted.json'), json.dumps(sorted(deleted)) + '\n')
    except BuildError as e:
        bad.append({'id': 'group', 'error': str(e), 'ok': False})
    report = {'id': a.id, 'base': os.path.relpath(base, REPO).replace(os.sep, '/'), 'out': os.path.relpath(out, REPO).replace(os.sep, '/'),
              'group': group['group'] if group else None, 'patches': len(records), 'ok': not bad, 'failed': bad, 'records': records,
              'overlay_files': copied, 'deleted': sorted(deleted), 'has_group_file': has_group, 'has_overlay': os.path.isdir(overlay)}
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w', encoding='utf-8') as fh:
        json.dump(report, fh, indent=1)
        fh.write('\n')
    if not has_group and not os.path.isdir(overlay):
        print('%s: neither group.json nor overlay/ exists (nothing to apply)' % a.id)
    ok_n = sum(1 for r in records if r.get('ok'))
    print('%s: %d patch record(s), %d ok, %d failed; overlay files %d; deleted %d; report %s' % (
        a.id, len(records), ok_n, len(bad), len(copied), len(deleted), os.path.relpath(report_path, REPO)))
    for b in bad:
        print('  FAIL %s: expected %s found %s %s' % (b.get('id'), b.get('expect'), b.get('found'), b.get('error', '')))
    return 0 if not bad else 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
