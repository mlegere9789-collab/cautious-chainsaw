"""Helpers for the negative-control tests of the gate runners (GATE-SPEC U-25: every check has an injected defect that the runner must report as FAIL).

A *world* is a dict {repo-relative path: content}; content is a str or bytes (written as it is) or any other JSON value (written as JSON, one line per row for `.jsonl`
when it is a list). `write_world(world, root)` lays it out as a scratch repository; `run_runner(script, root, out, *args)` runs a runner of tools/bt/gates against it and
returns (exit code, parsed record, stdout). The runners read the real repository when no --root is given; here they never do.

GATES_DIR (environment) points at another folder holding the runners (used once to show that the tests are red against runners that check nothing).
"""
import copy
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
GATES_DIR = os.environ.get('GATES_DIR') or os.path.join(REPO, 'tools', 'bt', 'gates')


def write_world(world, root):
    for rel, content in world.items():
        p = os.path.join(root, *rel.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if isinstance(content, bytes):
            with open(p, 'wb') as f:
                f.write(content)
        elif isinstance(content, str):
            with open(p, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
        elif rel.endswith('.jsonl') and isinstance(content, list):
            with open(p, 'w', encoding='utf-8') as f:
                for r in content:
                    f.write(json.dumps(r, ensure_ascii=False) + '\n')
        else:
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=1)


def run_runner(script, root, out, *args, timeout=600, env=None):
    cmd = [sys.executable, os.path.join(GATES_DIR, script), '--root', root, '--out', out, '--quiet', *args]
    e = dict(os.environ)
    e.pop('NODE_USE_ENV_PROXY', None)
    if env:
        e.update(env)
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=e, encoding='utf-8')
    gate = None
    rec = None
    for fn in sorted(os.listdir(out)) if os.path.isdir(out) else []:
        if fn.endswith('.json') and not fn.endswith('.prev.json'):
            gate = fn
            with open(os.path.join(out, fn), encoding='utf-8') as f:
                rec = json.load(f)
    return p.returncode, rec, p.stdout + p.stderr


class Scratch:
    """A scratch repository with a world written into it; removed on close."""

    def __init__(self, world):
        self.dir = tempfile.mkdtemp(prefix='btgate-')
        self.root = os.path.join(self.dir, 'repo')
        self.out = os.path.join(self.dir, 'out')
        os.makedirs(self.root)
        os.makedirs(self.out)
        write_world(world, self.root)

    def run(self, script, *args, **kw):
        return run_runner(script, self.root, self.out, *args, **kw)

    def close(self):
        import shutil
        shutil.rmtree(self.dir, ignore_errors=True)


def items_by_id(rec):
    return {i['id']: i for i in rec['items']}


def failing(rec, prefix=''):
    return [i for i in rec['items'] if i['result'] == 'FAIL' and i['id'].startswith(prefix)]


def deep(world):
    return copy.deepcopy(world)
