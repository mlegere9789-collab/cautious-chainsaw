"""oobgates_common: what the runners of gates Q01, Q14 and Q20 share (workstream bt-gates), on top of lib/pq_common.py (the record format of GATE-SPEC 1.6) and lib/extracts.py.

* paths      the runner directories on sys.path (this folder, lib/, tools/bt)
* node child `layer_dump(...)` runs one of the node children (q01_layer.mjs, q14_layer.mjs, q20_layer.mjs) which build the REAL history layer, world, stage and crowd driver and write a JSON dump;
             a failure of the child is a runner error (exit code 3), never a pass and never a silent skip
* subjects   `sub_requirements_for(env, gate, unit_id)`: the rows of requirements.json whose `gate_ids` name the gate, and the population row `Rnn.U-<unit id>` once such a row exists
* register   `register_state(env, eid)`: whether a register entry exists, is open, has the eleven fields and `owner_q`, and has a dated search log (GATE-SPEC 1.4, link level L3 (b)); COVERED needs it
* names      `surnames(...)` for the commander comparison of Q01.7

Nothing here touches the network; nothing here writes except the temporary dump file of a node child (removed afterwards).
"""
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib'), os.path.abspath(os.path.join(HERE, '..'))):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pq_common import InputMissing, is_placeholder, run_node  # noqa: E402

REGISTER_FIELDS = ('title', 'rids', 'cat', 'desc', 'why', 'searched', 'subst', 'recon', 'tier', 'marking', 'status')       # GATE-SPEC 1.4 L1, with `owner_q`
OPEN_STATUSES = ('open', 'awaiting owner')


class ChildFailed(RuntimeError):
    pass


def layer_dump(env, script, extra_args=(), mutate=None, timeout=1800):
    """Run `node <script> --out <tmp> [args]` and return the parsed dump. Raises ChildFailed (runner error, exit code 3) when the child fails or writes nothing."""
    fd, tmp = tempfile.mkstemp(prefix='gate-dump-', suffix='.json')
    os.close(fd)
    try:
        args = ['--out', tmp] + list(extra_args)
        if mutate:
            args += ['--mutate', mutate]
        rc, out, err = run_node(env, os.path.join(HERE, script), args, timeout=timeout)
        if rc != 0:
            raise ChildFailed('%s exited %d: %s' % (script, rc, (err or out)[-1200:]))
        with open(tmp, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError) as e:
        raise ChildFailed('%s wrote no readable dump: %s' % (script, e))
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass


# ---------------------------------------------------------------- requirement rows
def gate_rows(env, gate):
    """Ids of the sub-requirements of requirements.json whose gate_ids name the gate (the rows an item of the gate bears on), and the whole id set (for population rows)."""
    fn = os.path.join(env.gov, 'requirements.json')
    try:
        with open(fn, encoding='utf-8') as f:
            subs = json.load(f)['sub_requirements']
    except (OSError, ValueError, KeyError):
        return [], set()
    return sorted(s['id'] for s in subs if gate in (s.get('gate_ids') or [])), {s['id'] for s in subs}


def sub_requirements_for(rows, all_ids, subject, populations=('R10', 'R17')):
    """The rows an item about `subject` (a unit id) bears on: the rows that name the gate and the population rows `R10.U-<unit>` (4.11) where they exist."""
    out = list(rows)
    for p in populations:
        rid = '%s.U-%s' % (p, subject)
        if rid in all_ids:
            out.append(rid)
    return sorted(set(out))


# ---------------------------------------------------------------- register
_REG_CACHE = {}


def register_state(env, eid):
    """What the runner can check of a register entry: exists (index and file), open, the eleven fields and owner_q present and not placeholders, a dated search log.
    `marking_in_product` and `reconstruction_in_product` are NOT checked here (they are Q23 and the product build): COVERED is therefore never claimed by this module alone."""
    key = (env.root, eid)
    if key in _REG_CACHE:
        return _REG_CACHE[key]
    idx_fn = os.path.join(env.gov, 'register_index.json')
    entries = {}
    try:
        with open(idx_fn, encoding='utf-8') as f:
            entries = {e['id']: e for e in json.load(f) if isinstance(e, dict) and 'id' in e}
    except (OSError, ValueError):
        pass
    e = entries.get(eid)
    file_ok = os.path.isfile(os.path.join(env.gov, 'register', eid + '.md'))
    st = {'id': eid, 'in_index': e is not None, 'file': file_ok, 'status': (e or {}).get('status'), 'open': bool(e) and (e.get('status') in OPEN_STATUSES), 'fields_ok': False, 'owner_q_ok': False,
          'search_log': False, 'missing_fields': []}
    if e:
        miss = [k for k in REGISTER_FIELDS if is_placeholder(e.get(k))]
        st['missing_fields'] = miss
        st['fields_ok'] = not miss
        st['owner_q_ok'] = not is_placeholder(e.get('owner_q'))
    sl = os.path.join(env.gov, 'register', 'search_logs', eid + '.json')
    if os.path.isfile(sl):
        try:
            with open(sl, encoding='utf-8') as f:
                rows = json.load(f)
            st['search_log'] = isinstance(rows, list) and len(rows) > 0 and all(isinstance(r, dict) and r.get('source_id') and r.get('date_searched') and r.get('result') in ('found', 'negative', 'unreachable') for r in rows)
        except (OSError, ValueError):
            pass
    st['link_level'] = 'L0' if not st['open'] else ('L1+search_log' if st['fields_ok'] and st['owner_q_ok'] and st['search_log'] else 'L1' if st['fields_ok'] and st['owner_q_ok'] else 'L0')
    _REG_CACHE[key] = st
    return st


def covered_by_register(env, eids):
    """(ok, reasons, states): every named entry is open, complete (L1) and has a search log (L3 b). The marking in the product (L2) and the reconstruction in the build (L3 c) are Q23's and the
    build's to show; this runner does not claim them, so a gap whose entries pass this test is reported COVERED only with `product_marking_checked: false` in its evidence."""
    states = [register_state(env, e) for e in eids]
    reasons = []
    if not eids:
        reasons.append('no register entry names this gap')
    for s in states:
        if not s['in_index'] and not s['file']:
            reasons.append('%s: no such register entry' % s['id'])
        elif not s['open']:
            reasons.append('%s: status %s (not open)' % (s['id'], s['status']))
        elif not s['fields_ok'] or not s['owner_q_ok']:
            reasons.append('%s: incomplete record (%s)' % (s['id'], ', '.join(s['missing_fields'] + ([] if s['owner_q_ok'] else ['owner_q'])) or 'owner_q'))
        elif not s['search_log']:
            reasons.append('%s: no dated search log register/search_logs/%s.json (GATE-SPEC 1.4, L3 b)' % (s['id'], s['id']))
    return (not reasons and bool(eids)), reasons, states


# ---------------------------------------------------------------- names
_RANKS = {'mg', 'bg', 'bgen', 'gen', 'brig', 'maj', 'major', 'lt', 'col', 'colonel', 'capt', 'captain', 'cpt', 'lieut', 'lieutenant', 'sgt', 'commodore', 'surg', 'dr', 'hon', 'general', 'brigadier', 'jr', 'sr', 'ii', 'iii', 'iv'}
_NONNAME = {'acting', 'temporary', 'the', 'and', 'of', 'at', 'to', 'killed', 'wounded', 'captured', 'took', 'command', 'commanded', 'later', 'then', 'succeeded', 'relieved', 'chief', 'staff', 'artillery', 'k', 'w', 'c'}


def _clean(s):
    s = re.sub(r'\([^)]*\)', ' ', str(s or ''))                 # printed side notes: "Reynolds (k)", "Meade (took command Jun 28 ...)"
    s = s.replace('’', "'").replace("'", '')
    return s


def surnames(strings):
    """Lower-case surnames named in printed commander strings: ranks, initials and side notes removed; "Col. Samuel J. Williams" -> {williams}; "Doubleday" -> {doubleday};
    "MG George G. Meade; chief of staff Butterfield" -> {meade, butterfield}."""
    out = set()
    for raw in strings or []:
        for part in re.split(r'[;/]|\band\b|,', _clean(raw)):
            toks = [t for t in re.findall(r"[A-Za-z][A-Za-z.\-]*", part)]
            toks = [t.strip('.').strip('-') for t in toks]
            toks = [t for t in toks if t and t.lower() not in _RANKS and len(t) > 1]
            # drop a trailing sentence-like tail ("chief of staff Butterfield" keeps the last capitalised word)
            caps = [t for t in toks if t[0].isupper() and t.lower() not in _NONNAME]
            if caps:
                out.add(caps[-1].lower())
    return out


def table_surname(name):
    toks = [t.strip('.,') for t in re.findall(r"[A-Za-z][A-Za-z.\-']*", str(name or '').replace('’', "'"))]
    toks = [t.replace("'", '') for t in toks if t.lower().strip('.') not in _RANKS and len(t.strip('.')) > 1]
    return toks[-1].lower() if toks else ''


def first_failed(conds):
    return [c['name'] + ((': ' + c['detail']) if c.get('detail') else '') for c in conds if not c['ok']]


def cond(name, ok, detail=None, **extra):
    d = {'name': name, 'ok': bool(ok)}
    if detail:
        d['detail'] = detail
    d.update(extra)
    return d
