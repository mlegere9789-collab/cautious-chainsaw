"""Shared helpers of the conflict-resolution tools (tools/bt/conflicts): paths, the register of the 47 conflicts, the PDF source keys, the ledger
engine (a thin wrapper around the town evidence validator), hashing and a few small utilities.

Run scripts that import this with `python3 -I`; every script inserts its own folder into sys.path.
Nothing here reads the network. Character offsets are offsets into the file decoded as UTF-8 with newline='' (the convention of tools/bt/or27_lib.py).
"""
import hashlib
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
GOV = os.path.join(BT, 'GOVERNANCE')
CONF = os.path.join(GOV, 'conflicts')
DOSSIERS = os.path.join(CONF, 'dossiers')
RESOLUTIONS = os.environ.get('CFL_RESOLUTIONS_DIR') or os.path.join(CONF, 'resolutions')   # the variable is for the self-test only
SOURCES_MD = os.path.join(CONF, 'SOURCES.md')
FAMILIES_JSON = os.path.join(CONF, 'ledger-families.json')
SCHEMA_JSON = os.path.join(CONF, 'schema.json')
PLAN_MD = os.path.join(CONF, 'PLAN.md')
READY_JSON = os.path.join(CONF, 'READY.json')
REGISTER_JSON = os.path.join(GOV, 'conflict_register.json')
STRUCTURED_JSON = os.path.join(GOV, 'conflicts_structured.json')
DEFAULTS_JSON = os.path.join(GOV, 'decisions', 'conflict_defaults.json')
PLAN_TXT = os.path.join(BT, 'BIBLE', 'plan-clean.txt')
TOWN_VALIDATOR = os.path.join(ROOT, 'tools', 'bt', 'town', 'validate_evidence.py')
TMP = os.path.join(ROOT, 'tmp', 'conflicts')

IDS = ['C-%03d' % i for i in range(1, 48)]
ID_RE = re.compile(r'^C-0(0[1-9]|[1-3][0-9]|4[0-7])$')


def utf8_stdout():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def dump_json(path, obj, indent=1):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp%d' % os.getpid()
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)
        f.write('\n')
    os.replace(tmp, path)


def read_text(path):
    with open(path, encoding='utf-8', errors='replace', newline='') as f:
        return f.read()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


# ----------------------------------------------------------------------------------------------------------------------------- the register
_cache = {}


def register():
    """{id: record} of GOVERNANCE/conflict_register.json (id, page, topic, text, default_status)."""
    if 'register' not in _cache:
        _cache['register'] = {r['id']: r for r in load_json(REGISTER_JSON)}
    return _cache['register']


def structured():
    """{id: record} of GOVERNANCE/conflicts_structured.json (the hand transcription of the cells: values, recommended default, alternatives)."""
    if 'structured' not in _cache:
        _cache['structured'] = {r['id']: r for r in load_json(STRUCTURED_JSON)['conflicts']}
    return _cache['structured']


def defaults():
    """{id: record} of decisions/conflict_defaults.json (the first delegated default of 2026-11-11)."""
    if 'defaults' not in _cache:
        _cache['defaults'] = load_json(DEFAULTS_JSON)['conflicts']
    return _cache['defaults']


# ----------------------------------------------------------------------------------------------------------------------------- the town engine
_town = None


def town():
    """The module tools/bt/town/validate_evidence.py loaded under a private name (it shares a file name with tools/bt/life/validate_evidence.py).
    It is imported, never edited; its citation checker (check_cite) and its text normalisation are the engine of the quote checks."""
    global _town
    if _town is None:
        spec = importlib.util.spec_from_file_location('cfl_town_validate_evidence', TOWN_VALIDATOR)
        mod = importlib.util.module_from_spec(spec)
        sys.modules['cfl_town_validate_evidence'] = mod
        spec.loader.exec_module(mod)
        _town = mod
    return _town


_ctx_cls = None


def conflict_ctx_class():
    """ConflictCtx: the town Ctx with the ledger of this workstream (SOURCES.md) and its own family hashes (ledger-families.json)."""
    global _ctx_cls
    if _ctx_cls is None:
        T = town()

        class ConflictCtx(T.Ctx):
            def __init__(self, root=ROOT, ledger_path=None, families_dir=None):
                super().__init__(root)
                conf = os.path.join(root, 'docs', 'battle-theatre', 'GOVERNANCE', 'conflicts')
                self.ledger_path = ledger_path or os.path.join(conf, 'SOURCES.md')
                self.evid = families_dir or conf            # families() reads <evid>/ledger-families.json, then the MANIFEST.sha256 of a template folder
                self.cache_dir = os.path.join(root, 'tmp', 'conflicts', 'validate-cache')

        _ctx_cls = ConflictCtx
    return _ctx_cls


def new_ctx(root=ROOT, ledger_path=None, families_dir=None):
    return conflict_ctx_class()(root, ledger_path, families_dir)


# ----------------------------------------------------------------------------------------------------------------------------- PDF text: the row and the source keys
def plan_lines():
    if 'plan' not in _cache:
        with open(PLAN_TXT, encoding='utf-8', errors='replace') as f:
            _cache['plan'] = f.read().split('\n')
    return _cache['plan']


def pdf_row_lines(cid):
    """The lines of plan-clean.txt that carry the register row of a conflict (from its id line to the line before the next id, a page break kept in)."""
    L = plan_lines()
    start = None
    for i, ln in enumerate(L):
        if ln.strip() == cid and i > 16300 and i < 16830:
            start = i
            break
    if start is None:
        return None
    num = int(cid[2:])
    nxt = 'C-%03d' % (num + 1)
    end = len(L)
    for j in range(start + 1, min(len(L), start + 90)):
        s = L[j].strip()
        if s == nxt or s.startswith('Notes on the register'):
            end = j
            break
    return L[start:end]


_GLOSS = None


def pdf_glossary():
    """{source key: [descriptions]} of the glossaries of the PDF ('KEY:' then a line of text, or 'KEY' ':' then text)."""
    global _GLOSS
    if _GLOSS is not None:
        return _GLOSS
    L = plan_lines()
    g = {}
    key_a = re.compile(r'^([A-Za-z0-9][A-Za-z0-9\-\.]{0,24}):\s*$')
    n = len(L)
    i = 0
    while i < n:
        s = L[i].rstrip()
        m = key_a.match(s)
        if m and i + 1 < n and L[i + 1].strip() and not key_a.match(L[i + 1].rstrip()):
            k, d = m.group(1), L[i + 1].strip()
            j = i + 2
            while j < n and L[j].strip() and not key_a.match(L[j].rstrip()) and not re.match(r'^[A-Za-z0-9][A-Za-z0-9\-\.]{0,24}$', L[j].strip()) and len(d) < 400 and j - i < 4:
                if L[j].startswith('=== PAGE') or 'animation plan, version 2 | page' in L[j]:
                    break
                d += ' ' + L[j].strip()
                j += 1
            g.setdefault(k, [])
            if d not in g[k]:
                g[k].append(d)
            i = j
            continue
        if re.match(r'^[A-Za-z0-9][A-Za-z0-9\-\.]{0,24}$', s.strip()) and i + 2 < n and L[i + 1].strip() == ':' and L[i + 2].strip():
            k, d = s.strip(), L[i + 2].strip()
            j = i + 3
            while j < n and L[j].strip() and L[j].strip() != ':' and not (j + 1 < n and L[j + 1].strip() == ':') and j - i < 5:
                if L[j].startswith('=== PAGE') or 'animation plan, version 2 | page' in L[j]:
                    break
                d += ' ' + L[j].strip()
                j += 1
            g.setdefault(k, [])
            if d not in g[k]:
                g[k].append(d)
            i = j
            continue
        i += 1
    _GLOSS = g
    return g


def keys_in_text(text):
    """The glossary keys that occur as whole tokens in a text (a row of the register)."""
    out = []
    g = pdf_glossary()
    toks = set(re.findall(r'[A-Za-z0-9][A-Za-z0-9\-\.]*[A-Za-z0-9]|[A-Za-z0-9]', text))
    for k in sorted(g):
        if k in toks:
            out.append(k)
    return out


# ----------------------------------------------------------------------------------------------------------------------------- misc
TIER_RANK = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2, 'open gap': 3}


def weakest_tier(tiers):
    tiers = [t for t in tiers if t in TIER_RANK]
    return max(tiers, key=lambda t: TIER_RANK[t]) if tiers else None


def today():
    import datetime
    return datetime.date.today().isoformat()
