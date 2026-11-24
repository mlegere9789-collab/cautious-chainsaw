"""pq_common: the result record and helpers shared by the runners of gates Q02, Q19, Q23 and Q25.

Format and rules: docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC.md, 1.1 (items, verdicts), 1.6 (record `bt-gate-result/1`), 1.2 (U-21: a run reads
inputs and never a result file as if it were an input; U-26: a scan of every member, never a sample).

* Every runner builds a `Record`, adds items and calls `finish_cli()`. The record carries, per gate: `gate`, `inputs` (path and sha256 of every input file),
  `input_hashes` (the same as a map), `runnable_here`, `items` (id, check, pass, result, reason, evidence ...), `counts` and `totals`, `verdict`, `owed`.
* `pass` is true only for result PASS (COVERED, FAIL, NOT-RUN, BLOCKED-INPUT and N/A are all `pass: false`).
* An item whose input is missing is BLOCKED-INPUT and its reason starts with `input missing:`; it is never a pass.
* Two runs on the same inputs give identical `items`, `counts`, `totals`, `verdict`, `inputs`: items are sorted by id, evidence lists are sorted, and the
  clock, run id and durations live only in the header keys `run_id`, `started_utc`, `finished_utc`, `tool_versions`.
* The runner never writes a `passes` flag and never writes anywhere except `<out>/Qnn.json`, `<out>/Qnn.prev.json` and `<out>/evidence/Qnn/`.

Exit codes of a runner: 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error (nothing is written then, so a good earlier record is not clobbered).
"""
import argparse
import datetime
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile

SCHEMA = 'bt-gate-result/1'
RESULTS = ('PASS', 'COVERED', 'FAIL', 'NOT-RUN', 'BLOCKED-INPUT', 'N/A')
TIERS3 = ('documented', 'inferred', 'plausible-procedural')
TIER_ALL = TIERS3 + ('open gap',)
FLAG_OF = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2}
MAX_QUOTE_WORDS = 14            # T-Q02-1 (GATE-SPEC 10.1): the plan says under 15 words (p. 134, E.6); the repository's working limit is 14
PLACEHOLDERS = {'', '-', 'none', 'n/a', 'na', 'null', 'tbd', 'todo', 'unknown'}
PLACEHOLDER_PREFIXES = ('not stated by the shard proposal',)


class InputMissing(Exception):
    """An input a check needs does not exist (or cannot be read): the check's items are BLOCKED-INPUT, never PASS."""


def default_root():
    # .../tools/bt/gates/lib/pq_common.py -> repository root
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))


class Env:
    """Where things are. `root` is the repository root (tests pass a scratch tree with the same layout); `out` is the folder of the result files."""

    def __init__(self, root=None, out=None):
        self.root = os.path.abspath(root or default_root())
        self.bt = os.path.join(self.root, 'docs', 'battle-theatre')
        self.gov = os.path.join(self.bt, 'GOVERNANCE')
        self.out = os.path.abspath(out or os.path.join(self.gov, 'gate_results'))
        self.tools = os.path.join(self.root, 'tools', 'bt')

    def p(self, rel):                 # repository-relative path
        return os.path.join(self.root, *rel.split('/'))

    def btp(self, rel):               # path relative to docs/battle-theatre
        return os.path.join(self.bt, *rel.split('/'))

    def rel(self, path):
        try:
            r = os.path.relpath(path, self.root)
        except ValueError:
            return path.replace(os.sep, '/')
        return path.replace(os.sep, '/') if r.startswith('..') else r.replace(os.sep, '/')


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def is_placeholder(v):
    """GATE-SPEC 1.4: a placeholder is empty, `-`, `none`, `n/a` or the marker `not stated by the shard proposal`."""
    if v is None:
        return True
    if isinstance(v, (list, tuple, dict, set)):
        return len(v) == 0
    if isinstance(v, bool):
        return False
    s = str(v).strip().lower()
    return s in PLACEHOLDERS or s.startswith(PLACEHOLDER_PREFIXES)


def words(s):
    return len(str(s or '').split())


def first_n(ids, n=20):
    return sorted(set(ids), key=str)[:n]


class Record:
    """One gate's result record. Add inputs with `add_input`, items with `item`, then `finish()` and `write()` (or `finish_cli`)."""

    def __init__(self, gate, env, *, renderer_class='python', covered_counts=False, runnable_here=True, argv=None):
        self.gate = gate
        self.env = env
        self.renderer_class = renderer_class
        self.covered_counts = covered_counts          # K3: COVERED counts toward the verdict only for Q07, Q08, Q17, Q19, Q25, Q28
        self.runnable_here = runnable_here
        self.argv = list(argv if argv is not None else sys.argv)
        self.started = datetime.datetime.now(datetime.timezone.utc)
        self.inputs = {}
        self.items = []
        self.owed = []
        self.notes = []
        self.thresholds = []
        self.extra = {}
        self._incomplete = []
        self._ids = set()
        self.tool_versions = {'python': platform.python_version()}

    # ------------------------------------------------------------------ inputs
    def add_input(self, path, role=None):
        """Register an input file by path; its sha256 is taken now. A file that does not exist is recorded with sha256 null."""
        rel = self.env.rel(path)
        if rel in self.inputs:
            return rel
        if os.path.isfile(path):
            self.inputs[rel] = {'path': rel, 'sha256': sha256_file(path), 'bytes': os.path.getsize(path)}
        else:
            self.inputs[rel] = {'path': rel, 'sha256': None, 'missing': True}
        if role:
            self.inputs[rel]['role'] = role
        return rel

    def read_json(self, path, role=None):
        self.add_input(path, role)
        if not os.path.isfile(path):
            raise InputMissing(self.env.rel(path))
        try:
            with open(path, encoding='utf-8') as f:
                return json.load(f)
        except (OSError, ValueError) as e:
            raise InputMissing('%s (unreadable: %s)' % (self.env.rel(path), str(e)[:120]))

    def read_jsonl(self, path, role=None):
        self.add_input(path, role)
        if not os.path.isfile(path):
            raise InputMissing(self.env.rel(path))
        rows = []
        try:
            with open(path, encoding='utf-8') as f:
                for n, line in enumerate(f, 1):
                    line = line.strip()
                    if line:
                        rows.append(json.loads(line))
        except (OSError, ValueError) as e:
            raise InputMissing('%s (unreadable: %s)' % (self.env.rel(path), str(e)[:120]))
        return rows

    def read_text(self, path, role=None):
        self.add_input(path, role)
        if not os.path.isfile(path):
            raise InputMissing(self.env.rel(path))
        with open(path, encoding='utf-8', newline='') as f:
            return f.read()

    # ------------------------------------------------------------------ items
    def item(self, id, result, reason, evidence=None, check=None, **extra):
        if result not in RESULTS:
            raise ValueError('bad result %r for item %s' % (result, id))
        if id in self._ids:
            raise ValueError('duplicate item id %s' % id)
        self._ids.add(id)
        if result == 'BLOCKED-INPUT' and not str(reason).startswith('input missing:'):
            reason = 'input missing: ' + str(reason)
        it = {'id': id, 'check': check or (id.split('/')[1] if id.count('/') >= 1 else id), 'pass': result == 'PASS', 'result': result,
              'reason': str(reason), 'evidence': evidence if evidence is not None else {}}
        for k, v in extra.items():
            if v is not None:
                it[k] = v
        it.setdefault('renderer_class', self.renderer_class)
        self.items.append(it)
        return it

    def blocked(self, id, missing, what, **extra):
        return self.item(id, 'BLOCKED-INPUT', 'input missing: %s (%s)' % (missing, what), {'missing': missing}, **extra)

    def owe(self, text):
        if text not in self.owed:
            self.owed.append(text)

    def note(self, text):
        if text not in self.notes:
            self.notes.append(text)

    def incomplete(self, reason):
        """Force the verdict to INCOMPLETE (an incomplete scan, an unset threshold, an empty domain)."""
        if reason not in self._incomplete:
            self._incomplete.append(reason)

    def threshold(self, id, value, decision, metric=None):
        t = {'id': id, 'value': value, 'decision': decision}
        if metric:
            t['metric'] = metric
        self.thresholds.append(t)

    def sidecar(self, name, rows, as_jsonl=True):
        """Write a sidecar under <out>/evidence/<gate>/ (deterministic) and return {path, sha256, rows} for an item's evidence."""
        d = os.path.join(self.env.out, 'evidence', self.gate)
        os.makedirs(d, exist_ok=True)
        fn = os.path.join(d, name + ('.jsonl' if as_jsonl else '.json'))
        if as_jsonl:
            body = ''.join(json.dumps(r, sort_keys=True, ensure_ascii=False) + '\n' for r in rows)
        else:
            body = json.dumps(rows, sort_keys=True, ensure_ascii=False, indent=1) + '\n'
        data = body.encode('utf-8')
        with open(fn, 'wb') as f:
            f.write(data)
        return {'path': self.env.rel(fn), 'sha256': sha256_bytes(data), 'rows': len(rows)}

    # ------------------------------------------------------------------ finish
    def finish(self):
        items = sorted(self.items, key=lambda i: (i['id'], i['result']))
        counts = {r: 0 for r in RESULTS}
        by_check = {}
        for it in items:
            counts[it['result']] += 1
            by_check.setdefault(it['check'], {r: 0 for r in RESULTS})[it['result']] += 1
        in_domain = counts['PASS'] + counts['COVERED'] + counts['FAIL'] + counts['NOT-RUN'] + counts['BLOCKED-INPUT']
        incomplete = list(self._incomplete)
        if counts['NOT-RUN'] or counts['BLOCKED-INPUT']:
            incomplete.append('%d item(s) NOT-RUN or BLOCKED-INPUT' % (counts['NOT-RUN'] + counts['BLOCKED-INPUT']))
        if counts['COVERED'] and not self.covered_counts:
            incomplete.append('%d COVERED item(s) in a gate whose text has no register or flag branch (GATE-SPEC K3)' % counts['COVERED'])
        if in_domain == 0:
            incomplete.append('empty domain: no in-domain item (no vacuous pass, U-03)')
        if counts['FAIL']:
            verdict = 'FAIL'
        elif incomplete:
            verdict = 'INCOMPLETE'
        else:
            verdict = 'PASS'
        totals = {'items': len(items), 'pass': counts['PASS'], 'covered': counts['COVERED'], 'fail': counts['FAIL'], 'not_run': counts['NOT-RUN'],
                  'blocked_input': counts['BLOCKED-INPUT'], 'n_a': counts['N/A'], 'not_passing': len(items) - counts['PASS'], 'by_check': by_check}
        fin = datetime.datetime.now(datetime.timezone.utc)
        inputs = [self.inputs[k] for k in sorted(self.inputs)]
        rec = {
            'schema': SCHEMA, 'gate': self.gate, 'run_id': '%s-%s' % (self.started.strftime('%Y%m%dT%H%M%SZ'), self.gate),
            'started_utc': self.started.strftime('%Y-%m-%dT%H:%M:%SZ'), 'finished_utc': fin.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'renderer_class': self.renderer_class, 'runnable_here': self.runnable_here, 'command': ' '.join(self.argv),
            'tool_versions': self.tool_versions, 'inputs': inputs, 'input_hashes': {i['path']: i['sha256'] for i in inputs},
            'thresholds': sorted(self.thresholds, key=lambda t: t['id']), 'verdict': verdict, 'incomplete_reasons': sorted(incomplete),
            'counts': counts, 'totals': totals, 'owed': sorted(self.owed), 'notes': sorted(self.notes), 'items': items,
        }
        rec.update(self.extra)
        return rec

    def write(self, rec):
        os.makedirs(self.env.out, exist_ok=True)
        fn = os.path.join(self.env.out, self.gate + '.json')
        prev = os.path.join(self.env.out, self.gate + '.prev.json')
        body = (json.dumps(rec, sort_keys=True, ensure_ascii=False, indent=1) + '\n').encode('utf-8')
        fd, tmp = tempfile.mkstemp(prefix=self.gate + '.', suffix='.tmp', dir=self.env.out)
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(body)
            if os.path.isfile(fn):
                shutil.copyfile(fn, prev)
            os.replace(tmp, fn)
            os.chmod(fn, 0o644)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
        return fn


def node_version():
    try:
        return subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=20).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def run_node(env, script, args=(), timeout=900, cwd=None, extra_env=None):
    """Run a node child (no network). Returns (returncode, stdout, stderr). The environment is the caller's minus the proxy switches, so a child cannot fetch."""
    e = dict(os.environ)
    for k in ('NODE_USE_ENV_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy'):
        e.pop(k, None)
    e['BT_GATES_NO_NETWORK'] = '1'
    if '--max-old-space-size' not in e.get('NODE_OPTIONS', ''):      # the dense Q04 scan over S* exhausted node's default heap; the full scan is kept whole, never sampled
        e['NODE_OPTIONS'] = (e.get('NODE_OPTIONS', '') + ' --max-old-space-size=' + os.environ.get('BT_GATES_NODE_HEAP_MB', '8192')).strip()
    if extra_env:
        e.update(extra_env)
    p = subprocess.run(['node', script, *args], capture_output=True, text=True, timeout=timeout, cwd=cwd or env.root, env=e, encoding='utf-8')
    return p.returncode, p.stdout, p.stderr


def base_parser(desc):
    ap = argparse.ArgumentParser(description=desc)
    ap.add_argument('--root', default=None, help='repository root (default: this checkout); tests pass a scratch tree with the same layout')
    ap.add_argument('--out', default=None, help='folder for Qnn.json (default: GOVERNANCE/gate_results)')
    ap.add_argument('--quiet', action='store_true')
    ap.add_argument('--no-write', action='store_true', help='compute and print the verdict, write nothing')
    return ap


def exit_code(verdict):
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[verdict]


def finish_cli(rec, args):
    out = rec.finish()
    if not getattr(args, 'no_write', False):
        rec.write(out)
    if not getattr(args, 'quiet', False):
        c = out['counts']
        print('%s verdict %s: %s items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (
            rec.gate, out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return exit_code(out['verdict'])


def guarded_main(fn):
    """Run `fn()` and exit with its code; any exception is exit code 3 with the traceback on stderr (no record is written)."""
    try:
        code = fn()
    except SystemExit:
        raise
    except BaseException:
        import traceback
        traceback.print_exc()
        code = 3
    sys.exit(code)
