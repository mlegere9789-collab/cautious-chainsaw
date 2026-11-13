"""Validate kit evidence files (docs/battle-theatre/kit/evidence/<group>.jsonl) against the contract of PLAN.md.

    python -I tools/bt/kit_evidence_check.py <group> [--file PATH] [--json OUT] [--coverage] [--require-complete] [--diff] [--quiet]
    python -I tools/bt/kit_evidence_check.py --all [--json OUT] [--quiet]          every <group>.jsonl that exists
    python -I tools/bt/kit_evidence_check.py examples --any-unit                     the worked examples (examples.jsonl)
    python -I tools/bt/kit_evidence_check.py --contract                              the contract as Markdown (what PLAN.md prints)
Exit code 1 when any line has an ERROR (or, with --require-complete, when a unit's required field is neither evidenced nor recorded as a gap).
A line with an ERROR is reported and never applied. The check re-matches every quote in the local source text: nothing is taken on trust."""
import argparse, collections, copy, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_evidence_lib as K

EV = K.EV
RESULTS = ('not_found', 'ocr_unreadable', 'source_unavailable', 'host_blocked', 'page_missing')
IMAGE_MODES = ('ocr_corrected', 'image_row')
NONSUBSTANTIVE = {'note', 'text_figure', 'scope', 'label_read', 'row', 'detail', 'rank_printed', 'caliber_in'}


class Result:
    def __init__(self, group, path):
        self.group, self.path = group, path
        self.errors, self.warnings = [], []
        self.lines = {}            # id -> obj (all parsed lines with an id)
        self.accepted = []         # ids of evidence lines without an error
        self.rejected = set()
        self.superseded = set()
        self.declared = {}         # declared sources
        self.counts = collections.Counter()
        self.coverage = {}

    def err(self, lineno, lid, code, msg):
        self.errors.append({'line': lineno, 'id': lid, 'code': code, 'msg': msg})
        if lid:
            self.rejected.add(lid)

    def warn(self, lineno, lid, code, msg):
        self.warnings.append({'line': lineno, 'id': lid, 'code': code, 'msg': msg})


def sin(x, container):
    """x in container for a value that may not be hashable (a malformed line)."""
    return isinstance(x, str) and x in container


def canon(v):
    def strip(x):
        if isinstance(x, dict):
            return {k: strip(y) for k, y in x.items() if k not in NONSUBSTANTIVE}
        if isinstance(x, list):
            return [strip(y) for y in x]
        return x
    return json.dumps(strip(v), sort_keys=True, ensure_ascii=False)


def identity(o):
    f, v, u = o['field'], o.get('value') or {}, o.get('unit_id')
    kf, ao = o.get('kit_field'), o.get('as_of')
    if f == 'roster':
        return (u, f)
    if f == 'commander':
        return (u, f, v.get('order'))
    if f == 'officer':
        return (u, f, str(v.get('name', '')).lower(), v.get('role'))
    if f == 'strength':
        return (u, f, o.get('basis'), ao, v.get('men'))
    if f == 'casualties':
        return (u, f, o.get('basis'), v.get('period'))
    if f in ('arms', 'dress'):
        return (u, f, kf, ao)
    if f == 'guns':
        return (u, f, v.get('state'), ao, v.get('scope'))
    return (u, f, ao)


class Kit:
    """Current values of the kit tables, for --diff only."""

    def __init__(self):
        def ld(n):
            with open(os.path.join(K.BT, 'kit', n), encoding='utf-8') as f:
                return json.load(f)
        self.ab = ld('artillery_batteries.json')
        self.cu = ld('cavalry_units.json')
        self.ks = ld('kit_specs.json')

    def now(self, unit_entry, field, kit_field=None):
        for k in (unit_entry or {}).get('kit', []):
            kid = k['id']
            c = self.ab['batteries'].get(kid) or self.cu['cards'].get(kid)
            if field == 'guns' and c and 'guns_printed' in c:
                return 'kit %s: %s (%s, %s)' % (kid, c['guns_printed'], c.get('tier'), ','.join(c.get('source_keys', [])[:3]))
            if field == 'commander' and c:
                return 'kit %s: %s' % (kid, c.get('commanders_printed') or c.get('commander_printed'))
            u = self.ks['units'].get(kid)
            if field in ('arms', 'dress') and u and kit_field in u.get('fields', {}):
                f = u['fields'][kit_field]
                return 'kit %s.%s: %s (%s)' % (kid, kit_field, '; '.join(a['item'] for a in f['allowed']), f['tier'])
        return None


def is_lead(rec):
    return bool(rec.get('lead')) or rec.get('class') in K.LEAD_CLASSES


def check_group(group, path, any_unit=False, want_diff=False):
    gdoc = K.groups_doc()
    R = Result(group, path)
    if any_unit:
        units = {u['unit_id']: (g, u) for g in gdoc['groups'] for u in g['units']}
    else:
        g = next((g for g in gdoc['groups'] if g['id'] == group), None)
        if g is None:
            raise SystemExit('%s is not a group of groups.json (%s)' % (group, ', '.join(x['id'] for x in gdoc['groups'])))
        units = {u['unit_id']: (g, u) for u in g['units']}
    kit = Kit() if want_diff else None
    cat = gdoc['catalog']
    parsed = []
    with open(path, encoding='utf-8') as f:
        for n, raw in enumerate(f, 1):
            if not raw.strip():
                continue
            try:
                o = json.loads(raw)
            except ValueError as e:
                R.err(n, None, 'JSON', 'line %d: %s' % (n, e))
                continue
            if not isinstance(o, dict):
                R.err(n, None, 'JSON', 'line %d is not an object' % n)
                continue
            parsed.append((n, o))
    # pass 1: ids, types, source declarations
    seen = {}
    for n, o in parsed:
        lid = o.get('id')
        t = o.get('type')
        if not sin(t, K.LINE_TYPES):
            R.err(n, lid if isinstance(lid, str) else None, 'TYPE', 'type %r' % (t,))
            continue
        if not isinstance(lid, str) or not K.ID_RE.match(lid) or lid.split(':')[0] != group:
            R.err(n, lid if isinstance(lid, str) else None, 'ID', 'id %r must look like %s:0001' % (lid, group))
            continue
        if lid in seen:
            R.err(n, lid, 'ID', 'id %s is used on lines %d and %d' % (lid, seen[lid], n))
            continue
        seen[lid] = n
        R.lines[lid] = o
        R.counts[t] += 1
        extra = set(o) - K.ALLOWED_KEYS[t]
        if extra:
            R.err(n, lid, 'KEYS', 'keys not allowed on a %s line: %s' % (t, ', '.join(sorted(extra))))
        miss = K.REQUIRED_KEYS[t] - set(o)
        if t == 'evidence' and o.get('basis') == 'derived':
            miss -= {'source_id', 'quote'}
        if t == 'evidence' and o.get('tier') == 'plausible-procedural':
            miss -= {'source_id', 'quote'}
        if miss:
            R.err(n, lid, 'KEYS', 'missing keys: %s' % ', '.join(sorted(miss)))
        if t == 'source':
            declare(R, n, o)
    # pass 2: lines
    order = {lid: n for lid, n in seen.items()}
    for n, o in parsed:
        lid = o.get('id')
        if lid not in seen or seen[lid] != n or lid in R.rejected and o.get('type') == 'source':
            continue
        t = o['type']
        if t == 'gap':
            check_gap(R, n, o, units)
        elif t == 'evidence':
            check_evidence(R, n, o, units, order, kit, cat)
    # pass 3: supersession, conflicts, collisions
    for lid, o in R.lines.items():
        s = o.get('supersedes')
        if s:
            if not sin(s, R.lines) or order.get(s, 1 << 30) >= order[lid]:
                R.err(order[lid], lid, 'SUPERSEDES', 'supersedes %r: no earlier line of this file' % s)
            else:
                R.superseded.add(s)
    active = [(lid, o) for lid, o in R.lines.items() if o['type'] == 'evidence' and lid not in R.rejected and lid not in R.superseded and o.get('tier') in ('documented', 'inferred')]
    groups_by_id = collections.defaultdict(list)
    for lid, o in active:
        if o.get('unit_id') is None or not isinstance(o.get('value'), dict):
            continue
        groups_by_id[identity(o)].append((lid, o))
    sets = collections.defaultdict(list)
    for lid, o in R.lines.items():
        c = o.get('conflict')
        if c is None or o['type'] != 'evidence':
            continue
        if not (isinstance(c, dict) and set(c) == {'key', 'alt'} and isinstance(c['key'], str) and K.CONFLICT_RE.match(c['key']) and isinstance(c['alt'], str) and 0 < len(c['alt']) <= 20):
            R.err(order[lid], lid, 'CONFLICT', 'conflict must be {"key": "<unit>|<field>|<detail>", "alt": "A"}')
            continue
        sets[c['key']].append((lid, o))
    for key, members in sets.items():
        alts = [o['conflict']['alt'] for _l, o in members]
        shape = {(o.get('unit_id'), o.get('field'), o.get('kit_field')) for _l, o in members}
        if len(members) < 2 or len(set(alts)) != len(alts) or len(shape) != 1:
            for lid, _o in members:
                R.err(order[lid], lid, 'CONFLICT', 'conflict set %r needs at least two lines of one unit and field with different alt labels' % key)
    in_set = {lid for ms in sets.values() for lid, _o in ms}
    for ident, members in groups_by_id.items():
        vals = {canon(o['value']) for _l, o in members}
        if len(vals) > 1 and not all(lid in in_set for lid, _o in members):
            ids = ', '.join(l for l, _o in members)
            for lid, _o in members[1:]:
                if lid not in in_set:
                    R.err(order[lid], lid, 'CONFLICT', 'lines %s state different values of the same quantity %s and declare no conflict (set conflict: {"key", "alt"} on each, or supersede the wrong line)' % (ids, ' '.join(str(x) for x in ident)))
    R.accepted = [lid for lid, o in R.lines.items() if o['type'] == 'evidence' and lid not in R.rejected and lid not in R.superseded]
    coverage(R, units)
    return R


def declare(R, n, o):
    lid = o['id']
    reg = K.registry()
    if o['id'] in reg or o['id'] in R.declared:
        R.err(n, lid, 'DECLARE', 'source id %s already exists' % o['id'])
        return
    cls = o.get('class')
    if cls not in K.DECLARABLE_CLASSES:
        R.err(n, lid, 'DECLARE', 'class %r is not one of %s' % (cls, ', '.join(K.DECLARABLE_CLASSES)))
        return
    lp = o.get('local_path')
    p = os.path.join(K.ROOT, lp) if isinstance(lp, str) else None
    if not p or not os.path.isfile(p) or not os.path.abspath(p).startswith(os.path.join(K.ROOT, 'tmp') + os.sep) and not os.path.abspath(p).startswith(os.path.join(K.ROOT, 'docs') + os.sep):
        R.err(n, lid, 'DECLARE', 'local_path %r is not a file under tmp/ or docs/' % lp)
        return
    sha = K.sha256_file(p)
    if o.get('sha256') and o['sha256'] != sha:
        R.err(n, lid, 'DECLARE', 'sha256 differs from the file (%s)' % sha)
        return
    with open(p, encoding='utf-8', newline='') as f:
        chars = len(f.read())
    R.declared[o['id']] = {'title': o['title'], 'class': cls, 'class_note': 'declared in the evidence file of group %s' % R.group, 'lead': cls in K.LEAD_CLASSES, 'local_path': lp, 'sha256': sha, 'chars': chars,
                           'part': o.get('part'), 'index': None, 'page_model': 'none', 'url': o.get('url')}


def src_of(R, sid):
    if not isinstance(sid, str):
        return None
    reg = K.registry()
    return reg.get(sid) or R.declared.get(sid)


def check_gap(R, n, o, units):
    lid = o['id']
    ids = o.get('unit_ids') if o.get('unit_ids') is not None else ([o['unit_id']] if o.get('unit_id') else [])
    fields = o.get('fields') if o.get('fields') is not None else ([o['field']] if o.get('field') else [])
    if not isinstance(ids, list):
        ids = [ids]
    if not ids or any(not sin(u, units) for u in ids):
        R.err(n, lid, 'UNIT', 'a gap line names units of this group in unit_id or unit_ids (unknown: %s)' % ', '.join(str(u) for u in ids if not sin(u, units)) if ids else 'a gap line names units of this group in unit_id or unit_ids')
    if not isinstance(fields, list) or not fields or any(not sin(f, K.FIELDS) for f in fields):
        R.err(n, lid, 'FIELD', 'fields: %s' % ', '.join(K.FIELDS))
    sr = o.get('searched')
    if not isinstance(sr, list) or not sr or not all(isinstance(x, dict) and x.get('terms') and (src_of(R, x.get('source_id')) is not None) for x in sr):
        R.err(n, lid, 'GAP', 'searched: a list of {"source_id": <known source>, "terms": "<what you searched>"}')
    if o.get('result') not in RESULTS:
        R.err(n, lid, 'GAP', 'result is one of %s' % ', '.join(RESULTS))
    if o.get('kit_field') is not None and o['kit_field'] not in K.KIT_FIELDS and o['kit_field'] != '*':
        R.err(n, lid, 'KITFIELD', 'kit_field %r' % o['kit_field'])


def check_evidence(R, n, o, units, order, kit, cat):
    lid = o['id']
    E = lambda code, msg: R.err(n, lid, code, msg)
    W = lambda code, msg: R.warn(n, lid, code, msg)
    # unit
    uid = o.get('unit_id')
    entry = None
    if uid is None:
        if not (isinstance(o.get('unit_name'), str) and sin(o.get('parent_unit_id'), units)):
            E('UNIT', 'unit_id null needs unit_name and a parent_unit_id of this group')
    elif not sin(uid, units):
        E('UNIT', 'unit_id %r is not a unit of this group' % (uid,))
    else:
        entry = units[uid][1]
    f = o.get('field')
    if not sin(f, K.FIELDS):
        E('FIELD', 'field %r' % (f,))
        return
    kf = o.get('kit_field')
    if f == 'arms':
        if kf not in K.ARMS_KIT_FIELDS:
            E('KITFIELD', 'arms needs kit_field in %s' % ', '.join(K.ARMS_KIT_FIELDS))
    elif f == 'dress':
        if kf not in K.DRESS_KIT_FIELDS:
            E('KITFIELD', 'dress needs kit_field in %s' % ', '.join(K.DRESS_KIT_FIELDS))
    elif kf is not None:
        E('KITFIELD', 'kit_field belongs to arms and dress lines only')
    tier = o.get('tier')
    if tier not in K.TIERS:
        E('TIER', 'tier %r is one of %s' % (tier, ', '.join(K.TIERS)))
        return
    basis = o.get('basis')
    if not sin(basis, K.BASES[f]):
        E('BASIS', 'basis %r for %s is one of %s' % (basis, f, ', '.join(K.BASES[f])))
    # value
    errs = []
    K.check_value(K.FIELD_SPECS[f], o.get('value'), 'value', errs)
    for m in errs:
        E('VALUE', m)
    if not errs and isinstance(o.get('value'), dict):
        v = o['value']
        if f == 'arms':
            for w in v['weapons']:
                if w.get('weapon_id') is not None and w['weapon_id'] not in cat['weapons']:
                    E('VALUE', 'weapon_id %r is not in the weapon catalog (groups.json catalog.weapons); use null and describe it in printed' % w['weapon_id'])
        elif f == 'dress':
            for it in v['items']:
                if it.get('item_id') is not None and it['item_id'] not in cat['kit_items']:
                    E('VALUE', 'item_id %r is not in the item catalog (groups.json catalog.kit_items); use null and describe it in printed' % it['item_id'])
        elif f == 'guns':
            for pc in v['pieces']:
                for tid in ([pc['type_id']] if pc.get('type_id') else []) + list(pc.get('type_candidates') or []):
                    if tid not in cat['artillery_pieces']:
                        E('VALUE', 'piece type %r is not in the catalog (groups.json catalog.artillery_pieces)' % tid)
            if v.get('total') is not None and all(isinstance(pc.get('count'), int) for pc in v['pieces']) and sum(pc['count'] for pc in v['pieces']) != v['total']:
                E('VALUE', 'total %d is not the sum of the piece counts %d' % (v['total'], sum(pc['count'] for pc in v['pieces'])))
    if o.get('as_of') is not None and not (isinstance(o['as_of'], str) and K.DATE_RE.match(o['as_of'])):
        E('DATE', 'as_of %r' % (o['as_of'],))
    elif isinstance(o.get('as_of'), str) and not re.match(r'^1863-(06-(2[6-9]|30)|07-(0[1-9]|1[0-6]))', o['as_of']):
        W('OFF_FIELD', 'as_of %s is outside 26 June to 16 July 1863' % o['as_of'])
    if isinstance(o.get('value'), dict):
        for k in ('from', 'to'):
            if isinstance(o['value'].get(k), str) and not K.DATE_RE.match(o['value'][k]):
                E('DATE', 'value.%s %r' % (k, o['value'][k]))
    if f == 'strength' and isinstance(o.get('value'), dict):
        v = o['value']
        if isinstance(v.get('low'), int) and isinstance(v.get('high'), int) and v['low'] > v['high']:
            E('VALUE', 'strength low %d is above high %d' % (v['low'], v['high']))
    if entry is not None and f in ('guns', 'horses', 'ammunition') and entry.get('arm') not in ('artillery', 'cavalry') and f == 'guns' and entry['level'] not in ('artillery_brigade', 'artillery_battalion', 'artillery_group', 'battery'):
        W('UNIT_FIELD', 'guns on a %s' % entry['level'])
    if entry is not None and f == 'arms' and entry.get('arm') == 'artillery':
        W('UNIT_FIELD', 'arms of an artillery unit: the pieces go in a guns line')
    # derived / inferred / procedural
    df = o.get('derived_from')
    if df is not None:
        if not (isinstance(df, list) and df and all(isinstance(x, str) and x in R.lines and order.get(x, 1 << 30) < order[lid] for x in df)):
            E('DERIVED', 'derived_from lists ids of earlier lines of this file')
    if basis == 'derived' and not df:
        E('DERIVED', 'a derived line needs derived_from')
    if tier == 'inferred' and not (df or (isinstance(o.get('note'), str) and o['note'].strip())):
        E('DERIVED', 'an inferred line says in note why the quote supports the value, or lists derived_from')
    if tier == 'plausible-procedural':
        if not (isinstance(o.get('note'), str) and o['note'].strip() and isinstance(o.get('register_proposal'), str) and o['register_proposal'].strip()):
            E('PROCEDURAL', 'plausible-procedural lines need note and register_proposal')
        return
    if basis == 'derived' and not o.get('quote'):
        if tier == 'documented':
            E('TIER', 'a derived line is inferred at most')
        return
    # source and quote
    sid = o.get('source_id')
    rec = src_of(R, sid)
    if rec is None:
        E('SOURCE', 'source_id %r is not in sources.json and not declared' % (sid,))
        return
    if tier in ('documented', 'inferred') and is_lead(rec):
        E('LEAD', 'source %s is a lead (%s): it can support a gap note or a lead value, never a documented or inferred line' % (sid, rec['class']))
    if rec.get('part') is not None and (type(o.get('part')) is not int or o.get('part') != rec['part']):
        E('PART', 'part must be %s for %s' % (rec['part'], sid))
    if rec.get('part') is None and o.get('part') is not None:
        E('PART', 'part is null for %s' % sid)
    q = o.get('quote')
    mode = o.get('quote_mode', 'exact')
    if not sin(mode, K.QUOTE_MODES):
        E('QUOTE', 'quote_mode %r is one of %s' % (mode, ', '.join(K.QUOTE_MODES)))
        return
    qmin = 3 if mode == 'image_row' else K.QUOTE_MIN
    if not isinstance(q, str) or len(K.norm(q)) < qmin or len(K.norm(q)) > K.QUOTE_MAX:
        E('QUOTE', 'quote must be %d to %d characters' % (qmin, K.QUOTE_MAX))
        return
    if len(K.norm(q)) > 400:
        W('LONG_QUOTE', '%d characters' % len(K.norm(q)))
    off = o.get('offset')
    if not isinstance(off, int) or isinstance(off, bool) or off < 0:
        E('OFFSET', 'offset is the character offset of the first character of the quote in the source text')
        return
    try:
        src = K.get_source(sid, R.declared)
    except FileNotFoundError as e:
        E('SOURCE', str(e))
        return
    start = end = None
    hits = src.locate(q)
    if mode in ('exact', 'image_row'):
        if not hits:
            ci = src.locate_ci(q)
            E('QUOTE_NOT_FOUND', 'not in %s (copy the text exactly; the OCR errors stay)%s' % (sid, ' - a case-insensitive match exists at offset %d' % ci if ci is not None else ''))
            return
        good = [h for h in hits if h['start'] == off]
        if not good:
            E('OFFSET', 'the quote starts at offset %s, not %d' % (', '.join(str(h['start']) for h in hits[:6]), off))
            return
        start, end = good[0]['start'], good[0]['end']
        if good[0]['via'] == 'hyphen':
            W('HYPHEN', 'matched with line-end hyphenation ignored')
    else:
        if hits and any(h['start'] == off for h in hits):
            start, end = off, next(h['end'] for h in hits if h['start'] == off)
        else:
            fz = src.fuzzy(q, off)
            if not fz or abs(fz['start'] - off) > 80:
                E('QUOTE_NOT_FOUND', 'ocr_corrected: no passage of %s within 4,000 characters of offset %d matches the quote closely (>= 0.88 per token on average)' % (sid, off))
                return
            start, end = fz['start'], fz['end']
            W('OCR_CORRECTED', 'matched at %.3f similarity at offset %d' % (fz['score'], start))
    if mode in IMAGE_MODES:
        im = o.get('image')
        ok = isinstance(im, dict) and isinstance(im.get('pdf_page'), int) and isinstance(im.get('dpi'), int) and 40 <= im['dpi'] <= 400 and set(im) <= {'pdf_page', 'dpi', 'note'}
        if not ok:
            E('IMAGE', 'quote_mode %s needs image {"pdf_page": N, "dpi": D}' % mode)
        elif src.kind == 'or27' and src.leafmap:
            r = src.leafmap.at(start)
            if r and im['pdf_page'] != r['leaf'] + 1:
                E('IMAGE', 'pdf_page %d is not the scan page of offset %d (it is %d)' % (im['pdf_page'], start, r['leaf'] + 1))
        if mode == 'image_row':
            if f not in ('casualties', 'strength'):
                E('IMAGE', 'image_row is for rows of a return of casualties or an abstract of strength')
            else:
                v = o.get('value') if isinstance(o.get('value'), dict) else {}
                if not isinstance(v.get('row'), list) or not isinstance(v.get('row_columns'), list) or len(v['row']) != len(v['row_columns']):
                    E('IMAGE', 'value.row (the printed figures in print order) and value.row_columns (their column names, same length) are required')
    # page and report
    page, lo, hi, note = src.page_at(start)
    pg = o.get('printed_page')
    rng = re.match(r'^(\d+)-(\d+)$', pg) if isinstance(pg, str) else None
    if pg is not None and not (type(pg) is int or rng):
        E('PAGE', 'printed_page is an integer, or a range "a-b" where the page model of a state volume knows only the range')
    elif src.kind == 'or27':
        if page is None:
            W('PAGE_UNCHECKED', note)
        elif pg != page:
            E('PAGE', 'printed_page is %s by the leaf map, not %r (do not take pages from or27_find: its running-head model can be off by pages)' % (page, pg))
    elif lo is not None:
        if pg is None:
            W('PAGE_UNCHECKED', 'give printed_page (%s by %s)' % ('%s-%s' % (lo, hi) if hi != lo else lo, note))
        elif rng:
            if (int(rng.group(1)), int(rng.group(2))) != (lo, hi):
                E('PAGE', 'printed_page range %s is not the range %s-%s of the page model (%s)' % (pg, lo, hi, note))
        elif not (lo <= pg <= hi):
            E('PAGE', 'printed_page %s is outside %s-%s (%s)' % (pg, lo, hi, note))
        elif hi != lo:
            W('PAGE_RANGE', 'the page model knows only %s-%s; %s is your reading of the running heads near the passage' % (lo, hi, pg))
    else:
        W('PAGE_UNCHECKED', note)
    if page is not None:
        pe, _l, _h, _n = src.page_at(max(start, end - 1))
        if pe is not None and pe != page and o.get('printed_page_end') != pe:
            W('PAGE_END', 'the quote ends on page %s' % pe)
    rid, rs, re_ = src.record_at(start)
    if rid != o.get('report_id'):
        edge = None
        if rid is not None and rs is not None and (start - rs < 2000 or re_ - start < 2000):
            edge = src.record_at(max(0, rs - 1))[0] if start - rs < 2000 else src.record_at(re_)[0]
        if edge is not None and edge == o.get('report_id'):
            W('REPORT_EDGE', 'the quote is near the edge of %s and %s' % (rid, edge))
        else:
            E('REPORT', 'the quote lies in %s, not %r' % (rid, o.get('report_id')))
    # numbers
    if tier == 'documented' and mode in ('exact', 'ocr_corrected') and isinstance(o.get('value'), dict):
        need = K.value_numbers(f, o['value'])
        have = K.numbers_in_text(K.norm(q))
        miss = [x for x in need if x not in have]
        if miss:
            if o.get('waive_numbers'):
                W('NUMBERS_WAIVED', '%s: %s' % (miss, o['waive_numbers']))
            else:
                E('NUMBERS', 'numbers %s of value are not in the quote' % miss)
    if mode == 'image_row' and not errs and isinstance(o.get('value'), dict) and isinstance(o['value'].get('row'), list) and isinstance(o['value'].get('row_columns'), list) and len(o['value']['row']) == len(o['value']['row_columns']):
        v = o['value']
        row, cols = v['row'], v['row_columns']
        waived = bool(o.get('waive_numbers'))
        if f == 'casualties':
            if tuple(cols) not in K.CAS_LAYOUTS:
                E('IMAGE', 'row_columns of a casualty row is one of: %s' % ' / '.join(', '.join(l) for l in K.CAS_LAYOUTS))
            else:
                for name, cell in zip(cols, row):
                    if name == 'aggregate':
                        want = v.get('total')
                    else:
                        cat, _, part = name.partition('_')
                        want = v[cat].get(part or 'total')
                    if (cell or 0) != (want or 0):
                        E('CHECK', 'value.%s is %s but the row figure read for %s is %s' % ('total' if name == 'aggregate' else name.replace('_', '.'), want, name, cell))
                parts = sum((c or 0) for n_, c in zip(cols, row) if n_ != 'aggregate')
                agg = row[cols.index('aggregate')]
                if agg is not None and parts != agg:
                    if waived:
                        W('NUMBERS_WAIVED', 'the figures add to %d, the print says %s: %s' % (parts, agg, o['waive_numbers']))
                    else:
                        E('CHECK', 'the figures add to %d but the printed aggregate is %s: a figure was misread (or the print footnotes the row: waive_numbers with the reason)' % (parts, agg))
        else:
            used = [x for x in (v.get('low'), v.get('high')) if x is not None]
            if any(x not in [c for c in row if c is not None] for x in used):
                E('CHECK', 'low and high must be figures of value.row (the printed figure is the value; a sum of two columns is a derived line)')
            idn = v.get('identity')
            if idn is None:
                W('NO_IDENTITY', 'no identity of the printed row was given (a total that the other cells add up to)')
            elif max(idn['sum'] + [idn['equals']]) >= len(row) or any(row[k] is None for k in idn['sum'] + [idn['equals']]):
                E('CHECK', 'identity points at cells that do not exist or are empty')
            elif sum(row[k] for k in idn['sum']) != row[idn['equals']]:
                if waived:
                    W('NUMBERS_WAIVED', 'identity does not hold in the print: %s' % o['waive_numbers'])
                else:
                    E('CHECK', 'identity fails: cells %s add to %d, cell %d is %d: a figure was misread' % (idn['sum'], sum(row[k] for k in idn['sum']), idn['equals'], row[idn['equals']]))
    if f == 'casualties' and tier == 'documented' and mode == 'exact' and not errs and isinstance(o.get('value'), dict):
        v = o['value']
        tot = sum((v[k].get('total') if v[k].get('total') is not None else (v[k].get('officers') or 0) + (v[k].get('enlisted') or 0)) for k in ('killed', 'wounded', 'missing'))
        if v.get('total') is not None and tot != v['total']:
            E('CHECK', 'killed, wounded and missing add to %d, not the stated total %s' % (tot, v['total']))
        if o.get('basis') == 'casualty_return':
            E('TABLE', 'a row of the Return of Casualties has scrambled columns in the OCR: use quote_mode image_row')
    if kit is not None and tier in ('documented', 'inferred') and entry is not None:
        now = kit.now(entry, f, kf)
        if now:
            R.warn(n, lid, 'KIT_NOW', now)


def coverage(R, units):
    addressed = collections.defaultdict(set)
    for lid, o in R.lines.items():
        if o['type'] == 'evidence' and lid not in R.rejected and lid not in R.superseded and o.get('unit_id') in units:
            addressed[o['unit_id']].add(o['field'])
        elif o['type'] == 'gap' and lid not in R.rejected:
            ids = o.get('unit_ids') if o.get('unit_ids') is not None else ([o['unit_id']] if o.get('unit_id') else [])
            fields = o.get('fields') if o.get('fields') is not None else ([o['field']] if o.get('field') else [])
            for u in ids:
                if u in units:
                    addressed[u].update(fields)
    miss = {}
    n_req = n_done = 0
    for uid, (g, u) in units.items():
        req = u.get('required') or []
        n_req += len(req)
        n_done += sum(1 for x in req if x in addressed[uid])
        m = [x for x in req if x not in addressed[uid]]
        if m:
            miss[uid] = m
    R.coverage = {'required_pairs': n_req, 'addressed_pairs': n_done, 'units_with_open_pairs': len(miss), 'open': miss}


def summarize(R, quiet=False, show_cov=False):
    ev = [o for o in R.lines.values() if o['type'] == 'evidence']
    tiers = collections.Counter(o.get('tier') for o in ev if o['id'] in R.accepted)
    print('%s: %d lines (%d evidence, %d gap, %d source); accepted %d (%s); rejected %d; superseded %d; %d errors, %d warnings' % (
        R.group, sum(R.counts.values()), R.counts['evidence'], R.counts['gap'], R.counts['source'], len(R.accepted), ', '.join('%s %d' % kv for kv in sorted(tiers.items())) or 'none',
        len(R.rejected), len(R.superseded), len(R.errors), len(R.warnings)))
    c = R.coverage
    print('   coverage: %d of %d required (unit, field) pairs evidenced or recorded as gaps; %d units have open pairs' % (c['addressed_pairs'], c['required_pairs'], c['units_with_open_pairs']))
    if not quiet:
        for e in R.errors[:200]:
            print('  ERROR %-16s line %-5s %-18s %s' % (e['code'], e['line'], e['id'], e['msg']))
        for w in R.warnings[:200]:
            if w['code'] in ('KIT_NOW',) or not quiet:
                print('  warn  %-16s line %-5s %-18s %s' % (w['code'], w['line'], w['id'], w['msg']))
    if show_cov:
        for u, m in c['open'].items():
            print('  open  %-44s %s' % (u, ', '.join(m)))


def contract_markdown():
    L = ['**Line types**', '', '| type | meaning |', '|---|---|'] + ['| `%s` | %s |' % (k, v) for k, v in K.LINE_TYPES.items()] + ['']
    L += ['**Keys of an evidence line** (`*` = required)', '', '| key | rule |', '|---|---|']
    rules = {
        'type': 'always `evidence`', 'id': 'unique in the file, `<group>:<4 digits>`, never reused (a correction is a new line with `supersedes`)', 'unit_id': 'a unit id of groups.json for this group, or `null` with `unit_name` and `parent_unit_id` (a unit the plan lacks: reported, never applied)',
        'unit_name': 'printed name of a unit the plan lacks', 'parent_unit_id': 'closest unit of the group that contains it', 'field': 'one of the fields below', 'kit_field': 'required for `arms` (`weapon`, `bayonet`, `sidearm_sword`) and `dress` (the other ten kit fields)',
        'value': 'the structured value of the field (schemas below)', 'basis': 'a basis token of the field (below): what kind of passage or figure this is', 'basis_note': 'free words on the basis (kind of return, who wrote the report)',
        'tier': '`documented`, `inferred` or `plausible-procedural`', 'as_of': 'the date or minute (or range `a/b`) the value is true for; ISO', 'source_id': 'a key of `sources.json`, or the `id` of a `type: source` line of the same file; none for a derived line',
        'part': 'Official Records part (1, 2, 3) of the source, null for other sources', 'report_id': 'the Official Records report (`OR27-1-R037`) or state-volume section (`NY1-S012`) that contains the quote, from the tool',
        'printed_page': 'printed page of the start of the quote, from the tool (leaf map for the Official Records); for a state volume whose page model knows only a range, that range as the string "16-18" or your reading of the running heads as an integer inside it', 'printed_page_end': 'when the quote runs onto the next page', 'offset': 'character offset of the first character of the quote in the source text (UTF-8, newline kept)',
        'quote': '%d to %d characters copied from the source text (whitespace may be collapsed; a row label of an `image_row` line may be as short as 3); the shortest passage that supports exactly this claim' % (K.QUOTE_MIN, K.QUOTE_MAX), 'quote_mode': '`exact` (default), `ocr_corrected`, `image_row`',
        'image': '`{"pdf_page", "dpi"}`: the scanned page you read, required by `ocr_corrected` and `image_row`', 'checks': 'free list of identities you verified by hand (the tool checks casualty rows itself)',
        'conflict': '`{"key": "<unit>|<field>|<detail>", "alt": "A"}`: the line is one alternative of a source conflict; give every alternative the same key', 'supersedes': 'id of an earlier line of this file that this line replaces',
        'derived_from': 'ids of earlier lines this value is computed from (required for `basis: derived`)', 'note': 'why the quote supports the value (required for `inferred` and `plausible-procedural`)', 'register_proposal': 'file name of the proposed register entry (required for `plausible-procedural`)',
        'waive_numbers': 'the reason, when a number of the value cannot appear in the quote (for example a sum of two printed figures)', 'example': 'true only in examples.jsonl'}
    req = K.REQUIRED_KEYS['evidence']
    for k in ['type', 'id', 'unit_id', 'unit_name', 'parent_unit_id', 'field', 'kit_field', 'value', 'basis', 'basis_note', 'tier', 'as_of', 'source_id', 'part', 'report_id', 'printed_page', 'printed_page_end', 'offset', 'quote', 'quote_mode', 'image', 'checks',
              'conflict', 'supersedes', 'derived_from', 'note', 'register_proposal', 'waive_numbers', 'example']:
        L.append('| `%s`%s | %s |' % (k, '*' if k in req else '', rules[k]))
    L += ['', '**A gap line** (`type: gap`) records a failed lookup: `id`*, `unit_id` or `unit_ids`*, `field` or `fields`* (a list is allowed), optional `kit_field` (`*` = every dress field), `searched`* (list of `{"source_id", "terms"}`), `result`* (%s), `note`, `register_proposal`.' % ', '.join('`%s`' % x for x in RESULTS), '']
    L += ['**A source line** (`type: source`) declares a text that `sources.json` lacks; its `id` (a line id) is the `source_id` that evidence lines cite: `id`*, `title`*, `class`* (%s), `local_path`* (under `tmp/`), `sha256` (checked if given), `url`, `part`, `note`.' % ', '.join('`%s`' % x for x in K.DECLARABLE_CLASSES), '']
    L += ['**Fields, bases and values**', '', '| field | meaning | basis tokens | value |', '|---|---|---|---|']

    def show(t, depth=0):
        k = t[0]
        if k == 'null':
            return show(t[1]) + ' or null'
        if k == 'int':
            return 'integer'
        if k == 'num':
            return 'number'
        if k == 'str':
            return 'string'
        if k == 'bool':
            return 'true/false'
        if k == 'date':
            return 'ISO date'
        if k == 'enum':
            return '/'.join(map(str, t[1]))
        if k == 'list':
            return '[%s]' % show(t[1])
        if k == 'map':
            return '{name: %s}' % show(t[1])
        if k == 'obj':
            return '{' + ', '.join(['%s*: %s' % (a, show(b)) for a, b in t[1].items()] + ['%s: %s' % (a, show(b)) for a, b in t[2].items()]) + '}'
        return k
    for f, d in K.FIELDS.items():
        L.append('| `%s` | %s | %s | `%s` |' % (f, d, ', '.join('`%s`' % b for b in K.BASES[f]), show(K.FIELD_SPECS[f]).replace('|', '/')))
    L += ['', '**Quote modes**', '', '| mode | rule |', '|---|---|'] + ['| `%s` | %s |' % (k, v) for k, v in K.QUOTE_MODES.items()] + ['']
    L += ['**Errors** (the line is rejected and never applied)', '', '| code | meaning |', '|---|---|'] + ['| `%s` | %s |' % (k, v) for k, v in K.ERRORS.items()] + ['']
    L += ['**Warnings** (the line is kept and flagged)', '', '| code | meaning |', '|---|---|'] + ['| `%s` | %s |' % (k, v) for k, v in K.WARNINGS.items()]
    return '\n'.join(L)


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('group', nargs='?')
    ap.add_argument('--file')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--json')
    ap.add_argument('--coverage', action='store_true')
    ap.add_argument('--require-complete', action='store_true')
    ap.add_argument('--diff', action='store_true')
    ap.add_argument('--any-unit', action='store_true')
    ap.add_argument('--quiet', action='store_true')
    ap.add_argument('--contract', action='store_true')
    a = ap.parse_args(argv)
    if a.contract:
        print(contract_markdown())
        return 0
    gdoc = K.groups_doc()
    if a.all:
        targets = [(g['id'], os.path.join(EV, g['id'] + '.jsonl')) for g in gdoc['groups'] if os.path.exists(os.path.join(EV, g['id'] + '.jsonl'))]
    elif a.group:
        targets = [(a.group, a.file or os.path.join(EV, a.group + '.jsonl'))]
    else:
        ap.error('a group id or --all')
    bad = 0
    out = {}
    for g, p in targets:
        if not os.path.exists(p):
            print('%s: no file %s' % (g, os.path.relpath(p, K.ROOT)))
            bad += 1
            continue
        R = check_group(g, p, a.any_unit, a.diff)
        summarize(R, a.quiet, a.coverage or a.require_complete)
        out[g] = {'errors': R.errors, 'warnings': R.warnings, 'accepted': R.accepted, 'rejected': sorted(R.rejected), 'superseded': sorted(R.superseded), 'coverage': R.coverage, 'counts': dict(R.counts), 'declared_sources': R.declared}
        if R.errors or (a.require_complete and R.coverage['units_with_open_pairs']):
            bad += 1
    if a.json:
        with open(a.json, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
            f.write('\n')
    return 1 if bad else 0


if __name__ == '__main__':
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    sys.exit(main(sys.argv[1:]))
