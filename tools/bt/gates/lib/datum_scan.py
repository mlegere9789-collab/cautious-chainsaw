"""datum_scan: the scan over every datum class that the page loads (GATE-SPEC Q02.1 to Q02.9, Q23.2, Q19.1), shared by the runners of Q02, Q19 and Q23.

A *datum class* is one table or file of data that the page loads or draws from (registry: tools/bt/gates/datum_classes.json). Every member of a class is read into one
normalized datum:
    id, tier (canonical, by the app's own `tierName`), tier_raw, tier_exact, sources[], quote, claim_text, reasoning, procedural, register_ids[], render_flag, claim_ids[],
    weak_source, extra{}
The checks run over EVERY member (no sample, K10). An item of a runner carries `scanned`, `failing`, the reasons with their counts, the first 20 failing ids and, beyond that, a sidecar.

Member sources (registry `source.kind`):
    layer   a class of the dump written by q02_layer.mjs (the real history layer built by the app's own code)
    json    a JSON file; `members` is a path such as `places[]` (list), `claims{}` (values of a dict) or `a.b[]`; optional `fields` maps normalized names to key lists
    jsonl   one member per line of one or more files (`files`)
    walk    every dict of a JSON file that has a `tier` key is a member; in a container whose dicts mostly have `tier`, a dict without one is a member with no tier
    file    the file as one datum (a field of its top level gives tier and source)
    timeline  the rows of timeline_seed.jsonl with the evidence of timeline_corrections (row-level records)
    register  the entries of register_index.json
"""
import json
import os
import re

import pq_common as pq

SOURCE_KEYS = ('sources', 'source_keys', 'src', 'source_key', 'sources_keys', 'source')
QUOTE_KEYS = ('quote_or_extract', 'quote', 'extract')
REASON_KEYS = ('reasoning', 'inference')
BASIS_KEYS = ('basis', 'why', 'rationale')
REGISTER_KEYS = ('register', 'register_ids', 'register_id', 'registers')
CLAIM_KEYS = ('claim_ids', 'claims', 'claim_id', 'claim')
LEAD_TYPES = {'encyclopedia-lead', 'forum-lead', 'blog', 'wiki', 'auction', 'memory', 'lead'}
LEAD_KEY = re.compile(r'^(wiki|wikipedia|wp)[-_ ]|forum|blog|auction|ebay|reddit', re.I)
KEY_TOKEN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:/#+-]{0,63}$')


def as_list(v):
    if v is None:
        return []
    return list(v) if isinstance(v, (list, tuple)) else [v]


def first_key(d, keys):
    for k in keys:
        if k in d and not pq.is_placeholder(d[k]):
            return k, d[k]
    return None, None


def split_sources(v):
    """Source ids of a `sources`-like value: a list of ids, a list of records, a 'KEY; KEY' string, one key, or a descriptive sentence (kept whole, flagged descriptive)."""
    out, descriptive = [], False
    for x in as_list(v):
        if isinstance(x, dict):
            sid = x.get('source_id') or x.get('key') or x.get('id') or x.get('report_id') or x.get('record_id') or x.get('work')
            if sid:
                out.append(str(sid))
        elif isinstance(x, str):
            s = x.strip()
            if not s:
                continue
            parts = [p.strip() for p in re.split(r'[;,]\s*(?![^()]*\))', s) if p.strip()] if (';' in s or (',' in s and len(s) < 120)) else [s]
            for p in parts:
                if KEY_TOKEN.match(p):
                    out.append(p)
                else:
                    out.append(p)
                    descriptive = True
        elif isinstance(x, (int, float)) and not isinstance(x, bool):
            out.append(str(x))
    return out, descriptive


def normalize(d, cid, mid, fields=None, tiernames=None, extra=None):
    """One dict of the data to a normalized datum (see the module docstring)."""
    f = fields or {}
    kk = lambda name, default: tuple(f.get(name, default))
    tk, traw = first_key(d, kk('tier', ('tier',)))
    if tk is None and 'tier' in d:
        traw = d.get('tier')
    sk, sval = first_key(d, kk('sources', SOURCE_KEYS))
    sources, descriptive = split_sources(sval) if sk else ([], False)
    inline_quote = None
    if sk and isinstance(sval, dict):
        inline_quote = sval.get('quote') or sval.get('extract')
    qk, qval = first_key(d, kk('quote', QUOTE_KEYS))
    quote = qval if isinstance(qval, str) else inline_quote
    if quote is None and isinstance(d.get('source'), dict):
        quote = d['source'].get('quote') or d['source'].get('extract') or d['source'].get('quote_or_extract')
    rk, reasoning = first_key(d, kk('reasoning', REASON_KEYS))
    bk, basis = first_key(d, kk('basis', BASIS_KEYS))
    pk, proc = first_key(d, kk('procedural', ('procedural',)))
    gk, reg = first_key(d, kk('register', REGISTER_KEYS))
    ck, clm = first_key(d, kk('claims', CLAIM_KEYS))
    rf = d.get('render_flag')
    wk = d.get('weak_source', d.get('weak'))
    tier_raw = traw if isinstance(traw, str) else None
    rec = {'id': mid, 'class': cid, 'tier_raw': tier_raw, 'sources': sources, 'sources_descriptive': descriptive, 'quote': quote if isinstance(quote, str) else None,
           'reasoning': reasoning if isinstance(reasoning, str) else (basis if isinstance(basis, str) else None), 'reasoning_field': 'reasoning' if rk else ('basis' if isinstance(basis, str) else None),
           'procedural': proc if isinstance(proc, dict) else None, 'register_ids': [str(x) for x in as_list(reg) if isinstance(x, str) and x.strip()],
           'render_flag': rf if isinstance(rf, int) and not isinstance(rf, bool) else None, 'claim_ids': [str(x) for x in as_list(clm) if isinstance(x, (str, int)) and not isinstance(x, bool)],
           'weak_source': (bool(wk) if wk is not None else None), 'extra': extra or {}}
    for k in ('valid_from', 'valid_to', 'state_schedule', 'claim_text', 'independent_of', 'flag_single_source', 'visible'):
        if k in d:
            rec['extra'][k] = d[k]
    rec['tier'] = canonical(tier_raw, tiernames)
    rec['tier_exact'] = tier_raw in pq.TIER_ALL
    return rec


def canonical(raw, tiernames):
    """The tier the product reads from a tier statement (app/src/ui/extensions.mjs tierName), or None when it states none."""
    if raw is None:
        return None
    if raw in pq.TIER_ALL:
        return raw
    if tiernames is not None:
        return tiernames.get(raw)
    return None


# ---------------------------------------------------------------------------------------------------------------- member paths
def select(doc, path):
    """`places[]` -> the list items; `claims{}` -> the values of a dict (the key becomes the id); `a.b[]` nested; '' -> the document itself (list or dict values)."""
    if not path:
        return doc if isinstance(doc, list) else list((doc or {}).values()) if isinstance(doc, dict) else []
    node = doc
    parts = path.split('.')
    for i, p in enumerate(parts):
        last = i == len(parts) - 1
        if p.endswith('[]'):
            node = (node or {}).get(p[:-2]) if isinstance(node, dict) else None
            if last:
                return node if isinstance(node, list) else []
        elif p.endswith('{}'):
            node = (node or {}).get(p[:-2]) if isinstance(node, dict) else None
            if last:
                return [dict(v, _key=k) for k, v in node.items() if isinstance(v, dict)] if isinstance(node, dict) else []
        else:
            node = (node or {}).get(p) if isinstance(node, dict) else None
    return []


def walk_members(doc, cid, fname, tiernames, fields=None, skip_paths=()):
    """Every dict with a `tier` key is a member; a dict without `tier` inside a container whose dicts mostly have one is a member with no tier."""
    out = []

    def rec_id(path):
        return '%s:%s' % (fname, path)

    def visit(o, path):
        if isinstance(o, dict):
            if any(path.startswith(s) for s in skip_paths):
                return
            if 'tier' in o and not isinstance(o['tier'], (dict, list)):
                out.append(normalize(o, cid, rec_id(path), fields, tiernames))
            for k, v in o.items():
                visit(v, path + '.' + str(k))
            vals = [v for v in o.values() if isinstance(v, dict)]
            if len(vals) >= 3 and sum(1 for v in vals if 'tier' in v) * 2 > len(vals):
                for k, v in o.items():
                    if isinstance(v, dict) and 'tier' not in v and not any((path + '.' + str(k)).startswith(s) for s in skip_paths):
                        out.append(normalize(dict(v, tier=None), cid, rec_id(path + '.' + str(k)), fields, tiernames))
        elif isinstance(o, list):
            dl = [v for v in o if isinstance(v, dict)]
            for i, v in enumerate(o):
                visit(v, '%s[%d]' % (path, i))
            if len(dl) >= 3 and sum(1 for v in dl if 'tier' in v) * 2 > len(dl):
                for i, v in enumerate(o):
                    if isinstance(v, dict) and 'tier' not in v:
                        out.append(normalize(dict(v, tier=None), cid, rec_id('%s[%d]' % (path, i)), fields, tiernames))

    visit(doc, '$')
    seen, uniq = set(), []
    for m in out:
        if m['id'] not in seen:
            seen.add(m['id'])
            uniq.append(m)
    return uniq


# ---------------------------------------------------------------------------------------------------------------- the scanner
class Scanner:
    def __init__(self, env, rec, registry, layer=None, tiernames=None):
        self.env, self.rec, self.registry, self.layer, self.tiernames = env, rec, registry, layer, tiernames or {}
        self._members = {}
        self._errors = {}
        self.classes = {c['id']: c for c in registry.get('classes', [])}

    def by_source_class(self, name):
        """The registry class whose members are the layer class `name` (the registry id may differ from the layer's own name)."""
        for cid, c in self.classes.items():
            if c['source'].get('kind') == 'layer' and c['source'].get('class') == name:
                return cid
        return None

    def members(self, cid):
        """The normalized members of a class, or None when its input is missing (the reason is in self.error(cid))."""
        if cid in self._members:
            return self._members[cid]
        c = self.classes[cid]
        try:
            m = self._load(c)
        except pq.InputMissing as e:
            self._errors[cid] = str(e)
            m = None
        self._members[cid] = m
        return m

    def error(self, cid):
        return self._errors.get(cid)

    def statements(self):
        """Every tier statement of the loaded classes that is not one of the four exact tier names (the product reads them with tierName)."""
        out = set()
        for cid in self.classes:
            for m in self.members(cid) or []:
                if m['tier_raw'] is not None and m['tier_raw'] not in pq.TIER_ALL:
                    out.add(m['tier_raw'])
        return sorted(out)

    def apply_tiernames(self, names):
        """Set the canonical tier of every member from the app's own reading of the tier statements."""
        self.tiernames = names
        for cid, ms in self._members.items():
            for m in ms or []:
                m['tier'] = canonical(m['tier_raw'], names)

    def _path(self, rel):
        return os.path.join(self.env.root, *rel.split('/'))

    def _load(self, c):
        src = c['source']
        kind = src['kind']
        cid = c['id']
        fields = src.get('fields')
        if kind == 'layer':
            if self.layer is None:
                raise pq.InputMissing('the layer dump (node tools/bt/gates/q02_layer.mjs) was not produced')
            recs = (self.layer.get('classes') or {}).get(src['class'])
            if recs is None:
                raise pq.InputMissing('the layer dump has no class %s' % src['class'])
            out = []
            for r in recs:
                d = {'tier': r['tier'], 'sources': r['sources'], 'reasoning': r['reasoning'], 'basis': r['basis'], 'procedural': r['procedural'], 'register_ids': r['register_ids'], 'render_flag': r['render_flag'],
                     'quote': r['quote'], 'claims': r['claim_ids'], 'weak_source': r['weak_source']}
                m = normalize(d, cid, r['id'], None, self.tiernames, dict(r['extra']))
                m['reasoning'] = r['reasoning'] or r['basis']
                m['reasoning_field'] = 'reasoning' if r['reasoning'] else ('basis' if r['basis'] else None)
                out.append(m)
            return out
        if kind in ('json', 'walk', 'file'):
            p = self._path(src['file'])
            doc = self.rec.read_json(p, 'datum class %s' % cid)
            fname = os.path.basename(src['file'])
            if kind == 'walk':
                return walk_members(doc, cid, fname, self.tiernames, fields, tuple(src.get('skip_paths') or ()))
            if kind == 'file':
                d = dict(doc)
                if 'tier' not in d:
                    d['tier'] = (doc.get('meta') or {}).get('tier') if isinstance(doc.get('meta'), dict) else None
                return [normalize(d, cid, fname, fields, self.tiernames)]
            out = []
            paths = src.get('members', '')
            paths = paths if isinstance(paths, list) else [paths]
            inh = src.get('inherit') or {}
            for pth in paths:
                pth_key, inherit_key = (pth['path'], pth.get('inherit_tier')) if isinstance(pth, dict) else (pth, inh.get('tier'))
                for i, d in enumerate(select(doc, pth_key)):
                    if isinstance(d, dict):
                        d2 = d
                        if 'tier' not in d and inherit_key and isinstance(doc.get(inherit_key), str):
                            d2 = dict(d, tier=doc[inherit_key])
                        mid = '%s:%s:%s' % (fname, pth_key, d.get(src.get('id_field', 'id')) or d.get('_key') or i)
                        out.append(normalize(d2, cid, mid, fields, self.tiernames, {'inherited_tier': bool(d2 is not d)}))
            return out
        if kind == 'jsonl':
            out = []
            for rel in src['files']:
                p = self._path(rel)
                rows = self.rec.read_jsonl(p, 'datum class %s' % cid)
                for i, d in enumerate(rows):
                    m = normalize(d, cid, '%s:%s' % (os.path.basename(rel), d.get(src.get('id_field', 'claim_id')) or d.get('id') or i), fields, self.tiernames)
                    s = d.get('source') if isinstance(d.get('source'), dict) else {}
                    sid = s.get('report_id') or s.get('record_id') or s.get('section') or s.get('volume')
                    if sid:
                        m['sources'] = [str(sid)]
                    m['extra'].update({'report_id': s.get('report_id') or s.get('record_id'), 'printed_page': s.get('printed_page'), 'volume': s.get('volume'), 'section': s.get('section'),
                                       'work': s.get('work'), 'fidelity_check': d.get('fidelity_check'), 'claim_support_verified': d.get('claim_support_verified'), 'ledger': os.path.basename(rel),
                                       'claim_text': d.get('activity') or d.get('claim') or None, 'kind': d.get('kind'), 'claim_id': d.get('claim_id'), 'unit_id': d.get('unit_id')})
                    out.append(m)
            return out
        if kind == 'register':
            idx = self.rec.read_json(self._path(src['file']), 'datum class %s' % cid)
            return [normalize(dict(e), cid, 'register:%s' % e.get('id'), {'sources': ('source',)}, self.tiernames, {'marking': e.get('marking'), 'status': e.get('status'), 'rids': e.get('rids')}) for e in idx if isinstance(e, dict)]
        if kind == 'timeline':
            return load_timeline(self, c)
        raise ValueError('unknown source kind %s' % kind)


def load_timeline(sc, c):
    """The 691 rows of timeline_seed.jsonl (the Events list), the evidence of a row being its row-level correction record (GATE-SPEC 5, A-56)."""
    src = c['source']
    rows = sc.rec.read_jsonl(sc._path(src['file']), 'timeline rows')
    corr = {}
    for rel in src.get('corrections') or []:
        p = sc._path(rel)
        if not os.path.isdir(p):
            continue
        for fn in sorted(os.listdir(p)):
            if not fn.endswith('.jsonl'):
                continue
            for r in sc.rec.read_jsonl(os.path.join(p, fn), 'timeline correction records'):
                if r.get('id') and 'sub_claims' in r or 'subclaims' in r or 'citations' in r:
                    corr.setdefault(r['id'], []).append(r)
    out = []
    for r in rows:
        cells = (r.get('text_raw') or '').split(' | ')
        keycell = cells[-1].strip() if cells else ''
        keys = [k.strip() for k in re.split(r';', keycell) if k.strip()] if keycell and keycell != '-' else []
        recs = corr.get(r['id'], [])
        row = recs[0] if recs else None
        cc = row.get('corrected_claim') if row else None
        cc = cc if isinstance(cc, dict) else {}
        tier = cc.get('tier')
        raw_tier = tier or r.get('tier')
        cites = (row or {}).get('citations') or []
        d = {'tier': raw_tier, 'sources': [c_.get('report_id') or c_.get('source_id') for c_ in cites if isinstance(c_, dict)] or keys}
        m = normalize(d, c['id'], 'timeline:%s' % r['id'], None, sc.tiernames, {'seed_tier': r.get('tier'), 'seed_keys': keys, 'row_level_record': bool(row), 'verdict': (row or {}).get('verdict'),
                                                                                  'remains_unsupported': (row or {}).get('remains_unsupported'), 'citations': [{'key': c_.get('key'), 'source_id': c_.get('source_id'), 'report_id': c_.get('report_id'),
                                                                                                                                                                  'printed_page': c_.get('printed_page'), 'quote': c_.get('quote'), 'local_path': c_.get('source_file')}
                                                                                                                                                                 for c_ in cites if isinstance(c_, dict)]})
        quotes = [c_.get('quote') for c_ in cites if isinstance(c_, dict) and c_.get('quote')]
        m['quote'] = quotes[0] if quotes else None
        m['reasoning'] = None
        m['claim_text'] = cc.get('text') if cc else None
        out.append(m)
    return out


# ---------------------------------------------------------------------------------------------------------------- manifests and source classes
class Manifests:
    """Where a source id resolves, and what kind it is. `layer` is the layer's Source Manifest (key, kind, weak); `kit` the kit file's sources; `library` the ids of the status files and
    acquisition ledgers; `or27` the report ids of the Official Records index; `register` the register ids."""

    def __init__(self, env, rec, layer_manifest=None):
        self.by = {}
        self.fields = {}
        self.origin = {}
        for s in layer_manifest or []:
            self._add(s['key'], 'layer', {'kind': s.get('kind'), 'weak': bool(s.get('weak')), 'type': s.get('type'), 'date_written': s.get('date_written'), 'rights': s.get('rights'),
                                           'reliability_tier': s.get('reliability_tier'), 'independent_of': s.get('independent_of'), 'derived_from': s.get('derived_from')})
        kp = os.path.join(env.bt, 'kit', 'kit_specs.json')
        try:
            kit = rec.read_json(kp, 'kit source manifest')
            for k, v in (kit.get('sources') or {}).items():
                cls = str(v.get('class') or '')
                self._add(k, 'kit', {'kind': 'lead' if cls == 'lead' else ('primary' if cls.startswith('primary') else 'secondary'), 'weak': bool(v.get('weak')), 'type': cls,
                                     'date_written': v.get('date_written') or v.get('date'), 'rights': v.get('rights') or v.get('licence'), 'reliability_tier': v.get('reliability_tier'),
                                     'independent_of': v.get('independent_of'), 'derived_from': v.get('derived_from')})
        except pq.InputMissing:
            pass
        lp = os.path.join(env.bt, 'library', 'or27_index.json')
        try:
            idx = rec.read_json(lp, 'Official Records index')
            for r in idx.get('records') or []:
                self._add(r['id'], 'or27', {'kind': 'primary', 'weak': False, 'type': 'primary-document', 'date_written': r.get('date_raw') or r.get('date'), 'rights': 'US Government publication (public domain)',
                                            'reliability_tier': None, 'independent_of': None, 'derived_from': None})
        except pq.InputMissing:
            pass
        libdir = os.path.join(env.gov, 'library')
        if os.path.isdir(libdir):
            for fn in sorted(os.listdir(libdir)):
                if re.match(r'^status(_\d+)?\.json$', fn):
                    try:
                        for r in rows_of(rec.read_json(os.path.join(libdir, fn), 'status file')):
                            self._add(r['id'], 'library', {'kind': 'lead' if r.get('status') == 'finder-not-authority' else None, 'weak': r.get('status') == 'finder-not-authority', 'type': None,
                                                           'date_written': None, 'rights': None, 'reliability_tier': None, 'independent_of': None, 'derived_from': None}, soft=True)
                    except pq.InputMissing:
                        pass
        rp = os.path.join(env.gov, 'register_index.json')
        try:
            for e in rec.read_json(rp, 'register index'):
                self._add(e['id'], 'register', {'kind': 'register', 'weak': False, 'type': 'register', 'date_written': None, 'rights': None, 'reliability_tier': None, 'independent_of': None, 'derived_from': None})
        except pq.InputMissing:
            pass

    def _add(self, key, origin, f, soft=False):
        if key in self.by and soft:
            return
        self.by.setdefault(key, []).append(origin)
        self.fields.setdefault(key, f)
        self.origin.setdefault(key, origin)

    def resolves(self, sid):
        return sid in self.by

    def klass(self, sid):
        """lead | weak | ok | unresolved"""
        f = self.fields.get(sid)
        if f is None:
            return 'lead' if LEAD_KEY.search(sid or '') else 'unresolved'
        if f.get('kind') == 'lead' or (f.get('type') in LEAD_TYPES) or LEAD_KEY.search(sid or ''):
            return 'lead'
        if f.get('weak'):
            return 'weak'
        if f.get('kind') == 'register':
            return 'register'
        return 'ok'


def rows_of(doc):
    src = doc.get('sources', doc) if isinstance(doc, dict) else doc
    if isinstance(src, dict):
        return [dict(v, id=v.get('id', k)) for k, v in src.items()]
    return list(src or [])


# ---------------------------------------------------------------------------------------------------------------- checks (each returns a list of (member id, reason))
def check_tier_source(m, ctx):
    """Q02.2: a tier of the three and a source id, or the reasoning of an inferred datum, or the procedural block of a plausible-procedural one. Open gaps are register entries and gap markers."""
    t = m['tier']
    if m['tier_raw'] is None and t is None:
        return ['no tier']
    if t is None:
        return ['tier statement %r names no tier the product reads' % (m['tier_raw'][:60],)]
    if t == 'open gap':
        return [] if m['register_ids'] else ['an open gap with no register entry (a gap is a register entry and a visible marker, never a datum)']
    ok_src = bool(m['sources'])
    if t == 'documented' and not ok_src:
        return ['documented with no source id']
    if t == 'inferred' and not (ok_src or m['reasoning']):
        return ['inferred with neither a source id nor reasoning']
    if t == 'plausible-procedural' and not (ok_src or m['procedural']):
        return ['plausible-procedural with neither a source id nor a procedural block']
    return []


def check_documented(m, ctx):
    """Q02.3 (the parts that need no text) and Q02.8."""
    if m['tier'] != 'documented':
        return []
    out = []
    kinds = [ctx.manifests.klass(s) for s in m['sources']]
    if not any(k in ('ok', 'register') for k in kinds):
        out.append('no source that is neither a lead nor weak (sources: %s)' % (', '.join('%s=%s' % (s, k) for s, k in list(zip(m['sources'], kinds))[:4]) or 'none'))
    q = m['quote']
    if not q:
        out.append('no source extract')
    elif not (1 <= pq.words(q) <= pq.MAX_QUOTE_WORDS):
        out.append('extract is %d words (limit %d)' % (pq.words(q), pq.MAX_QUOTE_WORDS))
    return out


def check_inferred(m, ctx):
    """Q02.4: reasoning whose premises are documented data with claim ids."""
    if m['tier'] != 'inferred':
        return []
    out = []
    if pq.is_placeholder(m['reasoning']):
        out.append('no reasoning')
    if not m['claim_ids']:
        out.append('no premise claim ids (the reasoning names no documented claim)')
    else:
        bad = [c for c in m['claim_ids'] if ctx.claim_tier.get(c) not in (None, 'documented') or c not in ctx.claim_tier]
        if bad:
            out.append('premise claim(s) %s are not documented claims of the ledger' % ', '.join(bad[:3]))
    return out


PROC_KEYS = ('generator', 'seed', 'distribution', 'documented_context', 'substitute')


def check_procedural(m, ctx):
    """Q02.5: the complete procedural block and, where the gap affects a requirement, an open register id."""
    if m['tier'] != 'plausible-procedural':
        return []
    out = []
    p = m['procedural']
    if not p:
        out.append('no procedural block')
    else:
        miss = [k for k in PROC_KEYS if k not in p or (k != 'substitute' and pq.is_placeholder(p.get(k)))]
        if miss:
            out.append('procedural block lacks %s' % ', '.join(miss))
    if not m['register_ids']:
        out.append('no register id for the gap')
    else:
        bad = [r for r in m['register_ids'] if r not in ctx.register_open]
        if bad:
            out.append('register id %s is not an open entry of the register' % ', '.join(bad[:3]))
    return out


def check_quarantine(m, ctx):
    """Q02.8: no documented datum rests on a lead (or weak) source alone; a datum that does is inferred or plausible-procedural and flagged weak."""
    if not m['sources']:
        return []
    kinds = [ctx.manifests.klass(s) for s in m['sources']]
    if all(k in ('lead', 'weak') for k in kinds):
        if m['tier'] == 'documented':
            return ['documented and every source is a lead or weak (%s)' % ', '.join(m['sources'][:4])]
        if m['weak_source'] is not True and m['tier'] in ('inferred', 'plausible-procedural') and any(k == 'lead' for k in kinds):
            return ['rests on a lead source alone and is not flagged weak']
    return []


def check_validity(m, ctx, cls):
    """Q02.9: every kit item has valid_from and valid_to; every state change has a state_schedule."""
    kind = cls.get('validity')
    out = []
    if kind == 'kit':
        e = m['extra']
        if pq.is_placeholder(e.get('valid_from') or e.get('kit_valid_from')) or pq.is_placeholder(e.get('valid_to') or e.get('kit_valid_to')):
            out.append('kit item without valid_from and valid_to')
    elif kind == 'state':
        if pq.is_placeholder(m['extra'].get('state_schedule')) and not m['extra'].get('state_rows'):
            out.append('state change without a state_schedule')
    return out
