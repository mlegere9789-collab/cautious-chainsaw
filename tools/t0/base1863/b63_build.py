#!/usr/bin/env python3
"""Build one train WITH the optional group BASE1863 (the 1863 reconstruction as the base of the main maps) into a private directory.

    python tools/t0/base1863/b63_build.py --train R1c --out tmp/b1863/group/R1c [--no-gate] [--with MON,CLOCK,DATA] [--without-base]

Like tools/t0/mon/mon_build.py this feeds the UNMODIFIED builder (tools/t0/build.py); nothing is written back to trains.json, tools/t0/patches, tools/t0/overlay or tools/t0/mechanism:
  * trains.json is read in memory and gets  "optional_groups": [<--with groups>, "BASE1863"]  (BASE1863 last: it anchors on the finished text of the others);
  * the patch set is copied to a scratch directory together with tools/t0/patches-next/BASE1863.json (and the --with groups' files) and handed over with the builder's --patches option;
  * the tile set (stage_assets.py: tmp/b1863/group/stage/tiles1863/<ver>/) is hard-linked into a scratch overlay root next to a hard-linked copy of tools/t0/overlay and handed over with --overlay,
    so the tiles ship at /tiles1863/<ver>/ exactly like any overlay file (README "Overlay");
  * the service worker template is extended IN MEMORY (mechanism._tmpl is wrapped; the file tools/t0/mechanism/sw.js.tmpl is not touched): /tiles1863/* is cached cache-first in the release cache,
    at most TILE_MAX entries, oldest first; the asset rules and everything the gate looks for stay as they were;
  * the config hook is tools/t0/base1863/config_hook.mjs: gen.mjs unmodified, then Cache-Control immutable for the versioned /tiles1863/* directory (R1c only: the other trains have no config hook).
Exit codes are the builder's (0 ok, 2 anchors/preconditions, 3 gate).  Nothing under release/ is touched unless --out says so.
"""
import argparse
import copy
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
T0 = os.path.dirname(HERE)
sys.path.insert(0, T0)
import build as B  # noqa: E402
from t0build import mechanism as M  # noqa: E402
from t0build.util import REPO, load_json, rmtree_safe  # noqa: E402

STAGE_DEFAULT = os.path.join('tmp', 'b1863', 'group', 'stage')
TILE_MAX = 600          # entries of /tiles1863/ in the release cache: about 24 MB at the 40 KB average tile (journey budget in BASE1863-README.md section 8)

SW_EDITS = [
    # (find, replace): every find must occur exactly once in tools/t0/mechanism/sw.js.tmpl
    (" * ok, basic responses of hashed /assets/* files (cache-first), purges",
     " * ok, basic responses of hashed /assets/* files and of the versioned /tiles1863/* tiles (cache-first), purges"),
    ("const CACHE = 'gbg-r0-{{RID}}';\n",
     "const CACHE = 'gbg-r0-{{RID}}';\n"
     "/* BASE1863: the reconstruction tiles /tiles1863/<version>/... (immutable names) are cached cache-first in the same release cache, at most TILE_MAX entries, oldest dropped first;\n"
     " * the asset entries are never evicted by it.  Nothing else changed in this worker. */\n"
     "const TILES = '/tiles1863/', TILE_MAX = %d;\n"
     "async function putTile(c, r, res) { await c.put(r, res); const ks = (await c.keys()).filter(function (k) { return new URL(k.url).pathname.indexOf(TILES) === 0; });\n"
     "  if (ks.length > TILE_MAX) await Promise.all(ks.slice(0, ks.length - TILE_MAX).map(function (k) { return c.delete(k); })); }\n" % TILE_MAX),
    ("  const u = new URL(r.url); if (u.origin !== self.location.origin || u.pathname.indexOf('/assets/') !== 0) return;\n",
     "  const u = new URL(r.url); if (u.origin !== self.location.origin) return;\n"
     "  const tile = u.pathname.indexOf(TILES) === 0; if (!tile && u.pathname.indexOf('/assets/') !== 0) return;\n"),
    ("if (res.ok && res.status === 200 && res.type === 'basic') e.waitUntil(c.put(r, res.clone())); return res; })());",
     "if (res.ok && res.status === 200 && res.type === 'basic') e.waitUntil(tile ? putTile(c, r, res.clone()) : c.put(r, res.clone())); return res; })());"),
]


def sw_with_tiles(text):
    for find, repl in SW_EDITS:
        n = text.count(find)
        if n != 1:
            raise B.BuildError('BASE1863 service-worker edit anchor found %d times (expected 1): %r' % (n, find[:70]))
        text = text.replace(find, repl)
    return text


def link_tree(src, dst):
    """hard-link (copy when the volume refuses) every file of src into dst"""
    for dp, dn, fn in os.walk(src):
        rel = os.path.relpath(dp, src)
        os.makedirs(os.path.normpath(os.path.join(dst, rel)), exist_ok=True)
        for f in fn:
            s = os.path.join(dp, f)
            d = os.path.normpath(os.path.join(dst, rel, f))
            try:
                os.link(s, d)
            except OSError:
                shutil.copyfile(s, d)


def stage_patches(dest, with_groups, with_base):
    rmtree_safe(dest)
    os.makedirs(dest)
    src = os.path.join(T0, 'patches')
    for fn in sorted(os.listdir(src)):
        if fn.endswith('.json'):
            shutil.copyfile(os.path.join(src, fn), os.path.join(dest, fn))
    nxt = os.path.join(T0, 'patches-next')
    names = list(with_groups) + (['BASE1863'] if with_base else [])
    for g in names:
        files = [f for f in sorted(os.listdir(nxt)) if f.endswith('.json') and (f == g + '.json' or f.startswith(g + '+'))]
        if not files:
            raise SystemExit('tools/t0/patches-next/%s.json not found' % g)
        for f in files:
            shutil.copyfile(os.path.join(nxt, f), os.path.join(dest, f))
    return names


def stage_overlay(dest, train_cfg, stage, with_base):
    rmtree_safe(dest)
    os.makedirs(dest)
    link_tree(os.path.join(T0, 'overlay'), dest)
    if with_base:
        top = os.path.join(stage, 'tiles1863')
        if not os.path.isdir(top):
            raise SystemExit('no staged tile set in %s: run python tools/t0/base1863/stage_assets.py first' % stage)
        last = train_cfg['overlay'][-1]
        link_tree(top, os.path.join(dest, last, 'tiles1863'))


def lowprio():
    try:
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)      # BELOW_NORMAL_PRIORITY_CLASS (children inherit it)
    except Exception:
        pass


def main(argv=None):
    lowprio()
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--train', choices=['R1a', 'R1b', 'R1c'], required=True)
    ap.add_argument('--out', required=True, help='output directory (under tmp/); NEVER the integrator\'s release/<train>')
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--with', dest='with_groups', default='', help='comma list of other patches-next groups to stack before BASE1863 (e.g. CLOCK,DATA,MON)')
    ap.add_argument('--without-base', action='store_true', help='build the same tree without BASE1863 (control for the red-first proof and the byte measurements)')
    ap.add_argument('--stage', default=STAGE_DEFAULT)
    a = ap.parse_args(argv)
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    if os.path.normcase(out_abs) == os.path.normcase(os.path.join(REPO, 'release', a.train)):
        raise SystemExit('refusing to build into release/%s (the integrator\'s output); use a directory under tmp/' % a.train)
    stage = os.path.abspath(os.path.join(REPO, a.stage))
    with_base = not a.without_base
    others = [g for g in a.with_groups.split(',') if g]
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    names = others + (['BASE1863'] if with_base else [])
    for g in names:
        if g in cfg.get('group_order', []):
            raise SystemExit('%s is registered in trains.json: use tools/t0/build.py --with instead' % g)
    cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + names
    scratch = os.path.join(os.path.dirname(out_abs), '_b63-patches-' + os.path.basename(out_abs))
    stage_patches(scratch, others, with_base)
    scratch_ov = os.path.join(os.path.dirname(out_abs), '_b63-overlay-' + os.path.basename(out_abs))
    stage_overlay(scratch_ov, cfg['trains'][a.train], stage, with_base)
    orig_tmpl = M._tmpl
    if with_base:
        def tmpl(name):
            t = orig_tmpl(name)
            return sw_with_tiles(t) if name == 'sw.js.tmpl' else t
        M._tmpl = tmpl
    hook = os.path.join('tools', 't0', 'base1863', 'config_hook.mjs') if (with_base and cfg['trains'][a.train].get('config')) else None
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=names, record=False, no_gate=a.no_gate, keep_failed=True, order='fixed', dump_stage=None,
                            legacy=None, base_dir=None, base_lock=None, patches=scratch, overlay=scratch_ov, ledger=None, config_hook=hook)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    finally:
        M._tmpl = orig_tmpl
    print('OK: %s=%s%s' % (r['train'], r['rid'], ' (with %s)' % '+'.join(names) if names else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
