"""Input hashes of the runners of Q04, Q05 and Q06 (GATE-SPEC 1.6: the record names the sha256 of every input; U-12: a record expires when one changes).

* every data file the node child read through fs.readFileSync (the dump's `inputs_read`) is added as a file with its own hash
* the code the run exercised is added as tree digests (sha256 over the sorted pairs of path and file hash): the application's modules (docs/battle-theatre/app/src), the sim cache and the prototype world builder, and the runner's own
  node files; a digest names the number of files it covers
"""
import hashlib
import os

CODE_TREES = ('docs/battle-theatre/app/src', 'docs/battle-theatre/sim', 'docs/battle-theatre/render/prototype/src')
CODE_FILES = ('tools/bt/gates/q456_lib.mjs',)


def _sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def tree_digest(root, rel, exts=('.mjs', '.js', '.json')):
    base = os.path.join(root, *rel.split('/'))
    pairs = []
    if os.path.isdir(base):
        for d, dirs, files in os.walk(base):
            dirs[:] = sorted(x for x in dirs if x not in ('node_modules', '__pycache__', 'tests', 'test', 'results', 'shots-figures3d', 'shots-structures'))
            for fn in sorted(files):
                if fn.endswith(exts):
                    p = os.path.join(d, fn)
                    pairs.append((os.path.relpath(p, base).replace(os.sep, '/'), _sha(p)))
    h = hashlib.sha256()
    for a, b in sorted(pairs):
        h.update(('%s %s\n' % (a, b)).encode('utf-8'))
    return h.hexdigest(), len(pairs)


def register_inputs(rec, env, dump, node_files=()):
    """Add the files the node child read and the digests of the code it ran to the record's inputs."""
    for rel in (dump or {}).get('inputs_read') or []:
        p = os.path.join(env.root, *rel.split('/'))
        if os.path.isfile(p):
            rec.add_input(p, 'data')
    for rel in CODE_TREES:
        dg, n = tree_digest(env.root, rel)
        key = rel + '/'
        rec.inputs[key] = {'path': key, 'sha256': dg, 'files': n, 'role': 'code', 'kind': 'tree digest'}
    for rel in tuple(CODE_FILES) + tuple(node_files):
        p = os.path.join(env.root, *rel.split('/'))
        if os.path.isfile(p):
            rec.add_input(p, 'code')
