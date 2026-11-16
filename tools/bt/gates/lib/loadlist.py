"""loadlist: the page's load list, found by reading the code that loads the data (GATE-SPEC Q02.1: "the census is checked by diffing the page's load list
(app/src/data.mjs loadHistoryData, the URLS of app/src/config.mjs, the modules of app/src/ext/index.mjs) against the registry").

scan(env) returns {repo-relative path: sorted referrers}. Three kinds of reference are found:
  * `URLS.<key> + '<path>'` (data.mjs, structures/index.mjs, ext modules ...): <key> is resolved with the `new URL('<rel>', here)` entries of app/src/config.mjs, so a change
    of the shell's folders changes the list;
  * a bare file name in a loader (`'calls.json'`, `'vegetation.json'`): resolved to the file of that name under app/data when exactly one exists, or the one in the folder named by
    the loader's own directory (audio3d, fx3d, figures3d, anim3d);
  * the renderer prototype's `data/<name>` literals (render/prototype/src/world.mjs and the renderers), resolved against render/prototype.
Every file that exists is returned; a literal that resolves to no file is returned in `unresolved` (a loader that names a file that is not there).
"""
import os
import re

URL_PLUS = re.compile(r"""URLS\.(\w+)\s*\+\s*(['"`])([^'"`]*)\2""")
BARE = re.compile(r"""(['"`])([A-Za-z0-9_./-]+\.(?:jsonl?|bin|png|webp|glb|gltf|ogg|mp3|wav|jpg|jpeg))\1""")
URL_DEF = re.compile(r"""(\w+):\s*new URL\('([^']+)',\s*here\)\.href""")
DATA_DIRS = ('anim3d', 'audio3d', 'figures3d', 'fx3d')


def config_urls(env):
    p = os.path.join(env.bt, 'app', 'src', 'config.mjs')
    if not os.path.isfile(p):
        return None, p
    t = open(p, encoding='utf-8').read()
    out = {}
    for m in URL_DEF.finditer(t):
        out[m.group(1)] = os.path.normpath(os.path.join(env.bt, 'app', 'src', m.group(2)))
    return out, p


def scan(env):
    urls, cfg_path = config_urls(env)
    if urls is None:
        return None
    found, unresolved = {}, {}
    data_root = os.path.join(env.bt, 'app', 'data')
    by_name = {}
    if os.path.isdir(data_root):
        for dp, dn, fn in os.walk(data_root):
            for f in fn:
                by_name.setdefault(f, []).append(os.path.join(dp, f))

    def add(path, ref):
        found.setdefault(env.rel(path), set()).add(ref)

    src_dirs = [(os.path.join(env.bt, 'app', 'src'), 'app/src'), (os.path.join(env.bt, 'render', 'prototype', 'src'), 'render/prototype/src')]
    for base, label in src_dirs:
        for dp, dn, fn in os.walk(base):
            dn.sort()
            for f in sorted(fn):
                if not f.endswith('.mjs'):
                    continue
                p = os.path.join(dp, f)
                try:
                    t = open(p, encoding='utf-8').read()
                except OSError:
                    continue
                ref = '%s/%s' % (label, os.path.relpath(p, base).replace(os.sep, '/'))
                if label == 'app/src':
                    for m in URL_PLUS.finditer(t):
                        key, _, rel = m.groups()
                        if key in urls:
                            target = os.path.normpath(os.path.join(urls[key], rel))
                            if os.path.isfile(target):
                                add(target, ref)
                            elif os.path.isdir(target):
                                for q in sorted(os.listdir(target)):
                                    if os.path.isfile(os.path.join(target, q)):
                                        pass
                                found.setdefault(env.rel(target) + '/', set()).add(ref)      # a folder the loader reads from (its files are named in the loader)
                            else:
                                unresolved.setdefault(env.rel(target), set()).add(ref)
                    for m in BARE.finditer(t):
                        name = m.group(2)
                        if name.startswith(('http', '.', '/')) or '/' in name and not name.startswith('data/'):
                            continue
                        b = os.path.basename(name)
                        cands = by_name.get(b, [])
                        if len(cands) > 1:
                            hint = [c for c in cands if any(('/%s/' % d) in c.replace(os.sep, '/') and (d in ref or d in t[:4000]) for d in DATA_DIRS)]
                            cands = hint or cands
                        if len(cands) == 1:
                            add(cands[0], ref + ' (named in the loader)')
                else:
                    for m in BARE.finditer(t):
                        name = m.group(2)
                        if name.startswith('data/'):
                            target = os.path.join(env.bt, 'render', 'prototype', *name.split('/'))
                            if os.path.isfile(target):
                                add(target, ref)
                            else:
                                unresolved.setdefault(env.rel(target), set()).add(ref)
    return {'files': {k: sorted(v) for k, v in sorted(found.items())}, 'unresolved': {k: sorted(v) for k, v in sorted(unresolved.items())}, 'config': env.rel(cfg_path)}
