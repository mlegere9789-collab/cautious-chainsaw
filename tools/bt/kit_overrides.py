"""Override layer of the kit tables: evidence corrects the built tables without hand-editing a generated file.

    python -I tools/bt/kit_overrides.py compile [--group G ...] [--dry-run]     accepted evidence lines -> kit/overrides/<group>.json and kit/evidence_index.json
    python -I tools/bt/kit_overrides.py check                                     apply the override files to the base tables in memory and run the kit data checks
    python -I tools/bt/kit_overrides.py status                                    do the committed tables equal base + overrides? (detects hand edits and stale overrides)
Used by tools/bt/build_kit_data.py: build() makes the base tables from the kit_*.py modules, apply_overrides() applies kit/overrides/*.json, then the tables are written.
With no override file present the tables are returned untouched (byte-identical output).

Override document (schema kit-overrides-1): {"schema", "group", "ops": [...], "unapplied": [...]}. Operations, each with "table" (kit_specs | weapons | artillery | cavalry), "path" (keys of the table's JSON),
"evidence_ids" and "why":
    set              {"path": [...], "value": V, "before": B | "before_absent": true}      replace (or create) one value; the guard states what the base holds
    append           {"path": [... list], "value": V, "unique": true}                       add to a list (created if absent)
    remove           {"path": [...], "before": B}
    create           {"path": [... dict], "key": K, "value": V}                              add a new record under a dict; the key must be absent
    register_source  {"key": K, "value": {...}}                                             add a source to the table's sources block
A guard that does not hold (the base changed since the compile) fails the build and names the operation: nothing is skipped silently."""
import argparse, collections, copy, hashlib, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_evidence_lib as K

BT = K.BT
KIT = os.path.join(BT, 'kit')
OV = os.path.join(KIT, 'overrides')
EV = K.EV
SCHEMA = 'kit-overrides-1'
TABLES = ('kit_specs', 'weapons', 'artillery', 'cavalry')
FILES = {'kit_specs': 'kit_specs.json', 'weapons': 'weapons.json', 'artillery': 'artillery_batteries.json', 'cavalry': 'cavalry_units.json'}
WINDOW = re.compile(r'^1863-(06-(2[6-9]|30)|07-(0[1-9]|1[0-6]))')
PRIMARY = ('primary',)
ASSIGNABLE_BLOCK = {'spencer_repeater', 'henry_rifle', 'm1863_rifle_musket', 'whitworth_rifle'}
KIT_FIELD_KIND = {'headgear': 'headgear', 'coat': 'coat', 'shirt': 'shirt', 'trousers': 'trousers', 'shoes': 'shoes', 'accoutrements': 'accoutrement', 'pack_state': 'pack_state', 'badge': 'badge', 'flag_or_instrument': 'flag_or_instrument'}
ARM_CATEGORY = {'weapon': ('long_arm', 'carbine', 'repeater'), 'bayonet': ('bayonet',), 'sidearm_sword': ('handgun', 'edged')}


class OverrideError(Exception):
    pass


def canon(x):
    return json.dumps(x, sort_keys=True, ensure_ascii=False)


def sha16(path):
    return K.sha256_file(path)[:16] if os.path.exists(path) else None


# ---------------------------------------------------------------------------------------------------------------------
# applying
def _nav(tables, table, path, op_id):
    if table not in tables:
        raise OverrideError('%s: unknown table %r' % (op_id, table))
    cur = tables[table]
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            raise OverrideError('%s: no such path %s/%s' % (op_id, table, '/'.join(path)))
        cur = cur[k]
    return cur


def apply_op(tables, op, stale):
    oid = op.get('id') or '?'
    kind, table = op.get('op'), op.get('table')
    path = op.get('path') or []
    if kind == 'register_source':
        src = tables[table].setdefault('sources', {})
        key = op['key']
        if key in src and canon(src[key]) != canon(op['value']):
            stale.append('%s: source %s is already registered with other content' % (oid, key))
        else:
            src[key] = copy.deepcopy(op['value'])
        return
    if kind == 'create':
        parent = _nav(tables, table, path, oid)
        if op['key'] in parent:
            stale.append('%s: %s/%s already has %r' % (oid, table, '/'.join(path), op['key']))
            return
        parent[op['key']] = copy.deepcopy(op['value'])
        return
    if kind == 'append':
        parent = _nav(tables, table, path[:-1], oid)
        lst = parent.setdefault(path[-1], [])
        if not isinstance(lst, list):
            raise OverrideError('%s: %s is not a list' % (oid, '/'.join(path)))
        if op.get('unique') and any(canon(x) == canon(op['value']) for x in lst):
            return
        lst.append(copy.deepcopy(op['value']))
        return
    if kind in ('set', 'remove'):
        parent = _nav(tables, table, path[:-1], oid)
        last = path[-1]
        if op.get('before_absent'):
            if last in parent:
                stale.append('%s: %s/%s exists but the override expected it absent' % (oid, table, '/'.join(path)))
                return
        elif 'before' in op:
            if last not in parent or canon(parent[last]) != canon(op['before']):
                stale.append('%s: %s/%s changed since the override was compiled' % (oid, table, '/'.join(path)))
                return
        else:
            raise OverrideError('%s: a %s needs before or before_absent' % (oid, kind))
        if kind == 'set':
            parent[last] = copy.deepcopy(op['value'])
        else:
            del parent[last]
        return
    raise OverrideError('%s: unknown op %r' % (oid, kind))


def load_docs(ov_dir=OV):
    if not os.path.isdir(ov_dir):
        return []
    docs = []
    names = sorted(n for n in os.listdir(ov_dir) if n.endswith('.json') and n != 'manual.json') + (['manual.json'] if os.path.exists(os.path.join(ov_dir, 'manual.json')) else [])
    for n in names:
        with open(os.path.join(ov_dir, n), encoding='utf-8') as f:
            d = json.load(f)
        if d.get('schema') != SCHEMA:
            raise OverrideError('%s: schema %r is not %s' % (n, d.get('schema'), SCHEMA))
        for op in d.get('ops', []):
            if n == 'manual.json' and not (op.get('why') or op.get('reason')) or n == 'manual.json' and not (op.get('evidence_ids') or op.get('decision')):
                raise OverrideError('manual.json: op %s needs a why and evidence_ids or a decision' % op.get('id'))
        docs.append((n, d))
    return docs


def recount(tables):
    """Counts in the meta blocks that follow the size of a table (only called when an override changed something)."""
    ks, w, a, c = (tables[t] for t in TABLES)
    ks['meta']['counts']['units'] = len(ks['units'])
    ks['meta']['counts']['unit_fields_with_tier'] = sum(len(u.get('fields', {})) + sum(len(v.get('fields', {})) for v in (u.get('variants') or {}).values()) for u in list(ks['units'].values()) + list(a['units'].values()) + list(c['units'].values()))
    w['meta']['counts']['assignments'] = len(w['assignments'])
    a['meta']['counts']['batteries'] = len(a['batteries'])
    a['meta']['counts']['kit_units'] = len(a['units'])
    a['meta']['counts']['with_stated_guns'] = sum(1 for x in a['batteries'].values() if str(x.get('guns_status', '')).startswith('stated'))
    c['meta']['counts']['kit_units'] = len(c['units'])


def apply_overrides(ks, w, a, c, ov_dir=OV):
    """Apply every override file to copies of the base tables. Returns (ks, w, a, c, report); the originals are returned as they are when there is nothing to apply."""
    docs = load_docs(ov_dir)
    rep = {'files': [n for n, _d in docs], 'ops': 0, 'evidence_ids': 0}
    if not docs or not any(d.get('ops') for _n, d in docs):
        return ks, w, a, c, rep
    tables = copy.deepcopy({'kit_specs': ks, 'weapons': w, 'artillery': a, 'cavalry': c})
    stale = []
    ids = set()
    touched = collections.Counter()
    for n, d in docs:
        for op in d.get('ops', []):
            apply_op(tables, op, stale)
            rep['ops'] += 1
            touched[op['table']] += 1
            ids.update(op.get('evidence_ids') or [])
    if stale:
        raise OverrideError('%d override operation(s) no longer fit the base tables (re-run kit_overrides.py compile):\n  ' % len(stale) + '\n  '.join(stale[:40]))
    rep['evidence_ids'] = len(ids)
    recount(tables)
    for t in TABLES:
        if touched[t]:
            tables[t]['meta']['evidence'] = {'override_files': rep['files'], 'operations': touched[t], 'evidence_lines_cited': len(ids), 'rule': 'values taken from evidence carry evidence_ids; kit/evidence_index.json holds source, page, offset and quote of each'}
    return tables['kit_specs'], tables['weapons'], tables['artillery'], tables['cavalry'], rep


# ---------------------------------------------------------------------------------------------------------------------
# compiling
def in_window(as_of):
    return as_of is None or bool(WINDOW.match(as_of))


def decide(old_tier, old_weak, old_primary, same, new_tier):
    """What an evidence value does to an existing value: confirm | weaker | replace | conflict | keep (section 8 of PLAN.md).
    weaker: the value is the same but the record gives it only as an inference, and the kit marks it documented: nothing is confirmed (the line is not cited under a documented field), the kit value stands, and the case is listed for a decision on the tier."""
    old = 'documented' if (old_tier == 'documented' and not old_weak) else (old_tier if old_tier in ('inferred', 'plausible-procedural') else None)
    if same and old == 'documented':
        return 'confirm' if new_tier == 'documented' else 'weaker'
    if new_tier == 'documented':
        return 'conflict' if (old == 'documented' and old_primary and not same) else 'replace'
    return 'replace' if old in (None, 'plausible-procedural') else 'keep'


class Ctx:
    def __init__(self, gdoc, base):
        self.gdoc, self.base = gdoc, base
        self.units = {u['unit_id']: u for g in gdoc['groups'] for u in g['units']}
        self.group_of = {u['unit_id']: g['id'] for g in gdoc['groups'] for u in g['units']}
        self.cards = {}
        for cid in base['artillery']['batteries']:
            self.cards[cid] = ('artillery', 'batteries')
        for cid in base['cavalry']['cards']:
            self.cards[cid] = ('cavalry', 'cards')
        self.card_users = collections.defaultdict(list)
        self.own_users = collections.defaultdict(list)      # kit id -> roster units whose record it is (not the units that only take their brigade's record as a default)
        for uid, u in self.units.items():
            for k in u.get('kit', []):
                self.card_users[k['id']].append(uid)
                if k.get('how') != 'brigade':
                    self.own_users[k['id']].append(uid)
        self.cat = gdoc['catalog']
        self.weapons = base['weapons']['weapons']
        self.items = base['kit_specs']['items']
        self.srcs = {}

    def kit_unit(self, kid):
        for t in ('kit_specs', 'cavalry', 'artillery'):
            if kid in self.base[t]['units']:
                return t, self.base[t]['units'][kid]
        return None, None

    def source_meta(self, sid, declared):
        if sid in self.srcs:
            return self.srcs[sid]
        rec = K.registry().get(sid) or (declared or {}).get(sid)
        self.srcs[sid] = {'label': rec['title'], 'url': rec.get('url'), 'class': rec['class'], 'weak': False, 'claim_support_verified': True, 'text_sha256': rec['sha256'],
                          'origin': 'printed source read for the kit; each cited passage was matched in its text (see evidence_index.json)'}
        return self.srcs[sid]

    def primary_backed(self, table, keys):
        src = self.base[table].get('sources', {})
        return any(str(src.get(k, {}).get('class', '')).startswith(PRIMARY) for k in keys)


def cite(o, declared):
    return {k: o.get(k) for k in ('unit_id', 'field', 'kit_field', 'tier', 'basis', 'as_of', 'source_id', 'part', 'report_id', 'printed_page', 'offset', 'quote', 'quote_mode', 'value', 'conflict') if o.get(k) is not None}


class Out:
    """Collects the operations of one group."""

    def __init__(self, group):
        self.group, self.ops, self.unapplied, self.tables_used = group, [], [], set()
        self.created = {}                   # (table, kit id) -> the create operation of a record this group makes: a later field of the same record joins it (one create per record)

    def op(self, kind, table, path=None, ids=(), why='', **kw):
        d = {'id': '%s:op%04d' % (self.group, len(self.ops) + 1), 'op': kind, 'table': table}
        if path is not None:
            d['path'] = list(path)
        d.update(kw)
        d['evidence_ids'] = sorted(ids)
        d['why'] = why
        self.ops.append(d)
        self.tables_used.add(table)

    def set(self, table, path, value, base_obj, ids, why):
        key = path[-1]
        if key in base_obj:
            self.op('set', table, path, ids, why, value=copy.deepcopy(value), before=copy.deepcopy(base_obj[key]))
        else:
            self.op('set', table, path, ids, why, value=copy.deepcopy(value), before_absent=True)

    def skip(self, lines, reason, routed=False):
        """Lines the compile leaves out of the kit tables. routed=True: by design (the verified tables carry them), not an exception for the integration to review."""
        d = {'evidence_ids': sorted(o['id'] for o in lines), 'reason': reason}
        if routed:
            d['routed'] = True
        self.unapplied.append(d)


def line_keys(lines):
    return sorted({o['source_id'] for o in lines if o.get('source_id')})


def worst_tier(lines):
    return 'documented' if all(o['tier'] == 'documented' for o in lines) else 'inferred'


def c_guns(ctx, out, uid, lines):
    entry = ctx.units[uid]
    cards = [k['id'] for k in entry.get('kit', []) if ctx.cards.get(k['id'], ('', ''))[0] == 'artillery']
    if not cards and uid in ctx.cards and ctx.cards[uid][0] == 'artillery':
        cards = [uid]
    if not cards:
        return out.skip(lines, '%s has no battery card in the kit: its guns go to the verified battery table only' % uid, routed=True)
    cid = cards[0]
    if len(ctx.card_users[cid]) > 1 and uid not in ctx.cards:
        return out.skip(lines, 'card %s joins several roster batteries (%s): its count is not split' % (cid, ', '.join(ctx.card_users[cid])))
    card = ctx.base['artillery']['batteries'][cid]
    sel = [o for o in lines if o['value']['state'] in ('present', 'engaged') and o['value'].get('scope', 'battery') == 'battery' and in_window(o.get('as_of'))]
    if not sel:
        return out.skip(lines, 'no line states the guns present or engaged at the battery level in the battle window')
    path = ['batteries', cid]
    ids = [o['id'] for o in sel]
    if any(o.get('conflict') for o in sel):
        alts = [{'alt': o['conflict']['alt'], 'guns_printed': '; '.join(p['printed'] for p in o['value']['pieces']), 'pieces': o['value']['pieces'], 'total': o['value'].get('total'), 'as_of': o.get('as_of'),
                 'source_keys': [o['source_id']], 'tier': o['tier'], 'evidence_ids': [o['id']]} for o in sel]
        out.set('artillery', path + ['guns_alternatives'], alts, card, ids, 'sources disagree on the guns of this battery: all alternatives kept, the card is unchanged until a decision names a default')
        return out.skip(sel, 'conflict set on the guns of %s: a delegated decision names the default' % cid)
    by_date = collections.OrderedDict()
    for o in sorted(sel, key=lambda x: (x.get('as_of') or '', x['id'])):
        by_date.setdefault(o.get('as_of') or '', []).append(o)
    first = next(iter(by_date.values()))
    vals = {canon([(p.get('type_id'), p['count']) for p in o['value']['pieces']]) for o in first}
    if len(vals) > 1:
        return out.skip(first, 'lines of one date state different guns without a declared conflict')
    o0 = first[0]
    pieces = o0['value']['pieces']
    if any(not p.get('type_id') or p.get('count') is None for p in pieces):
        return out.skip(sel, 'the piece type or count is not resolved to one catalog piece (type_candidates only): the guns stay in the evidence index and the verified battery table')
    new = [{'count': p['count'], 'type_id': p['type_id'], 'printed_type': p['printed']} for p in pieces]
    same = canon(sorted((g['type_id'], g['count']) for g in card.get('guns', []))) == canon(sorted((g['type_id'], g['count']) for g in new))
    act = decide(card.get('tier'), card.get('weak_source'), ctx.primary_backed('artillery', card.get('source_keys', [])), same and card.get('guns_status') != 'gap', worst_tier(first))
    dates = [{'as_of': d or None, 'state': l[0]['value']['state'], 'pieces': l[0]['value']['pieces'], 'total': l[0]['value'].get('total'), 'source_keys': line_keys(l), 'evidence_ids': [x['id'] for x in l]} for d, l in by_date.items()]
    if act == 'confirm':
        out.set('artillery', path + ['source_keys'], sorted(set(card['source_keys']) | set(line_keys(first))), card, ids, 'the Official Records state the same guns: source added')
    elif act == 'weaker':
        return out.skip(first, 'the record gives the guns of %s only as an inference, and the kit marks them documented: the kit value stands, and a delegated decision decides whether its tier is lowered' % cid)
    elif act in ('conflict', 'keep'):
        alt = {'alt': 'evidence', 'guns_printed': '; '.join(p['printed'] for p in pieces), 'pieces': pieces, 'total': o0['value'].get('total'), 'as_of': o0.get('as_of'), 'source_keys': line_keys(first), 'tier': worst_tier(first), 'evidence_ids': [x['id'] for x in first]}
        out.set('artillery', path + ['guns_alternatives'], [alt], card, ids, 'the record differs from a value the kit holds on a primary source (or is only inferred): both kept')
        return out.skip(first, 'evidence differs from a kit value that stands on a primary source (or is inferred): a delegated decision names the default')
    else:
        old = {k: copy.deepcopy(card.get(k)) for k in ('guns', 'guns_printed', 'guns_status', 'tier', 'weak_source', 'source_keys')}
        out.set('artillery', path + ['guns_replaced'], old, card, ids, 'the value the kit held before the record was read')
        out.set('artillery', path + ['guns'], new, card, ids, 'guns as the record states them')
        out.set('artillery', path + ['guns_printed'], '; '.join(p['printed'] for p in pieces), card, ids, 'printed wording of the guns')
        out.set('artillery', path + ['guns_status'], 'stated', card, ids, 'guns are stated')
        out.set('artillery', path + ['tier'], worst_tier(first), card, ids, 'tier of the evidence')
        out.set('artillery', path + ['weak_source'], False, card, ids, 'the record is not a lead source')
        out.set('artillery', path + ['source_keys'], line_keys(first), card, ids, 'sources of the evidence')
    out.set('artillery', path + ['guns_by_date'], dates, card, ids, 'every date the record states guns for')
    out.set('artillery', path + ['evidence_ids'], sorted(ids), card, ids, 'lines this card cites')


def c_commander(ctx, out, uid, lines):
    entry = ctx.units[uid]
    cid = next((k['id'] for k in entry.get('kit', []) if k['id'] in ctx.cards), None) or (uid if uid in ctx.cards else None)
    if cid is None:
        return out.skip(lines, 'no battery or cavalry card for %s: the commanders go to the verified order-of-battle table only' % uid, routed=True)
    table, key = ctx.cards[cid]
    card = ctx.base[table][key][cid]
    if len(ctx.card_users[cid]) > 1 and uid not in ctx.cards:
        return out.skip(lines, 'card %s joins several roster units' % cid)
    ents = []
    for o in sorted(lines, key=lambda x: (x['value']['order'], (x.get('conflict') or {}).get('alt', ''), x['id'])):
        v = o['value']
        e = {'order': v['order'], 'name': v['name'], 'rank': v['rank'], 'tier': o['tier'], 'evidence_ids': [o['id']]}
        for k in ('rank_printed', 'role', 'change', 'from', 'to'):
            if v.get(k) is not None:
                e[k] = v[k]
        if o.get('conflict'):
            e['alt'] = o['conflict']['alt']
        ents.append(e)
    out.set(table, [key, cid, 'commanders_evidence'], ents, card, [o['id'] for o in lines], 'commanders as the record names them, in order; commanders_printed (the plan) is unchanged')
    return None


CAPTURE_RE = re.compile(r'\b(?:captur\w*|seiz\w*|spoils|plunder\w*|appropriat\w*|taken from the (?:enemy|federals?|yankees?))\b', re.I)


def says_captured(o, w):
    """True when the line itself says that an item was captured (in the printed words of the item, or in a note of the item, the value or the line): the kit marks a Union-pattern item of a Confederate unit as captured, and the compile never decides that."""
    return bool(CAPTURE_RE.search(' '.join(str(x) for x in (w.get('printed'), w.get('note'), o['value'].get('note'), o.get('note')) if x)))


def army_problem(unit_army, cat, o, w):
    """Why a catalog item may not be given to a unit of this army by rule, or None: a Union unit gets no Confederate item; a Confederate unit gets a Union-pattern item only where the line says it was captured."""
    if unit_army == 'US' and cat.get('army') == 'confederate':
        return 'a Confederate item is not given to a Union unit by rule; the integration decides'
    if unit_army == 'CS' and cat.get('army') == 'union' and not says_captured(o, w):
        return 'a Union-pattern item on a Confederate unit, and the line does not say it was captured, which the kit requires; the integration decides'
    return None


def support_text(o, n=90):
    """The words that support a line, for the note of a field: its quote, or, for a derived line (which has no quote by contract), the ids it is derived from and its own note."""
    q = o.get('quote')
    if q:
        return q[:n]
    return ('derived from %s: %s' % (', '.join(o.get('derived_from') or ['?']), o.get('note') or ''))[:n + 60]


def new_field(ctx, entry_lines, kf, ids, old, ua=None, army=None):
    A = lambda item, share, detail=None: {'item': item, 'share': share, 'weight': {'value': SHARE_TUNING[share], 'kind': 'tuning_parameter', 'historical_basis': False}, 'detail': detail}
    allowed = []
    for o in entry_lines:
        v = o['value']
        lst = v['weapons'] if 'weapons' in v else v['items']
        for w in lst:
            iid = w.get('weapon_id') or w.get('item_id')
            share = w.get('share') or ('all' if o.get('_n_items', len(lst)) == 1 else 'some')
            if share not in SHARE_TUNING:
                share = 'some'
            if not any(x['item'] == iid for x in allowed):
                e = A(iid, share, w['printed'] + ('' if w.get('share') or o.get('_n_items', len(lst)) == 1 else ' (share not stated)'))
                cat = ctx.weapons.get(iid) or ctx.items.get(iid) or {}
                if army == 'CS' and cat.get('army') == 'union' and says_captured(o, w):
                    e['captured'] = True                                # the kit's own marking of a Union-pattern item in Confederate hands (see check_kit CS_UNIT_ALLOWS_UNCAPTURED_UNION_ITEM)
                allowed.append(e)
    tier = worst_tier(entry_lines)
    f = {'allowed': allowed, 'tier_printed': tier, 'tier': tier, 'weak_source': False, 'source_keys': line_keys(entry_lines), 'source_basis': 'printed_per_row', 'evidence_ids': sorted(ids), 'tier_declared': tier,
         'note': 'from the record: ' + '; '.join(sorted({support_text(o) for o in entry_lines}))[:300]}
    if ua:
        f['assignment_id'] = ua
    if old:
        lv = copy.deepcopy(old)
        lv.pop('lead_value', None)
        f['lead_value'] = lv
    return f


def target_unit(ctx, uid):
    """(table, kit unit id, create?, why not, template). A unit with a record of its own is changed in place. A regiment that takes the record of its brigade (crosswalk how: brigade) gets a record of its
    own that starts as a copy of the brigade record, so that nothing the brigade record says is hidden and the other regiments of the brigade are not changed by one regiment's evidence."""
    e = ctx.units[uid]
    template = None
    for k in e.get('kit', []):
        t, u = ctx.kit_unit(k['id'])
        if u is None:
            continue
        if k.get('how') == 'brigade':
            template = (t, k['id'], u)
            break
        return t, k['id'], False, None, None
    if template is None and ctx.kit_unit(uid)[1] is not None:
        t, u = ctx.kit_unit(uid)
        return t, uid, False, None, None
    if not e.get('in_roster'):
        return None, None, False, 'the kit record %s does not exist' % uid, None
    side = 'US' if e['army'] == 'US' else 'CS'
    if e.get('arm') == 'cavalry' and e['level'] == 'regiment':
        return 'cavalry', '%s.CAV.%s' % (side, uid.split('-')[-1].upper()), True, None, template
    m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+([A-Z]{2})$', e['name'] or '')
    if e.get('arm') == 'infantry' and e['level'] == 'regiment' and m:
        return 'kit_specs', '%s.%s%s' % (side, m.group(1), m.group(2)), True, None, template
    return None, None, False, 'no rule creates a kit record for a %s of this kind' % e['level'], None


def c_fields(ctx, out, uid, field, lines):
    entry = ctx.units[uid]
    by_kf = collections.defaultdict(list)
    for o in lines:
        if in_window(o.get('as_of')):
            by_kf[o['kit_field']].append(o)
    for kf, ls in sorted(by_kf.items()):
        ids = [o['id'] for o in ls]
        if any(o.get('conflict') for o in ls):
            out.skip(ls, 'conflict set on %s of %s: a delegated decision names the default' % (kf, uid))
            continue
        if len({canon(o['value']) for o in ls}) > 1 and len({o.get('as_of') for o in ls}) > 1:
            out.skip(ls, 'the lines of %s.%s differ across dates: review by hand' % (uid, kf))
            continue
        bad, aside, kept_lines = [], [], []
        for o in ls:
            lst = o['value'].get('weapons') or o['value'].get('items') or []
            kept = []
            for w in lst:
                iid = w.get('weapon_id') or w.get('item_id')
                if iid is None:
                    bad.append('%r has no catalog id (a catalog addition is a code change)' % w['printed'][:50])
                elif field == 'arms':
                    wp = ctx.weapons.get(iid)
                    if not wp or wp.get('barred') or wp.get('not_assignable') or wp.get('placeholder') or iid in ASSIGNABLE_BLOCK:
                        bad.append('weapon %s cannot be assigned to %s by rule (barred, restricted, or of another category)' % (iid, kf))
                    elif army_problem(entry['army'], wp, o, w):
                        bad.append('weapon %s: %s' % (iid, army_problem(entry['army'], wp, o, w)))
                    elif wp['category'] not in ARM_CATEGORY[kf]:
                        aside.append((o, 'weapon %s cannot be assigned to %s by rule (barred, restricted, or of another category): its category is %s' % (iid, kf, wp['category'])))
                    else:
                        kept.append(w)
                else:
                    it = ctx.items.get(iid)
                    if not it or it.get('barred') or 'reference_only' in it.get('tags', []):
                        bad.append('item %s is not a %s item that a unit may be given' % (iid, kf))
                    elif army_problem(entry['army'], it, o, w):
                        bad.append('item %s: %s' % (iid, army_problem(entry['army'], it, o, w)))
                    elif it['kind'] != KIT_FIELD_KIND.get(kf, kf):
                        aside.append((o, 'item %s is not a %s item that a unit may be given: its kind is %s' % (iid, kf, it['kind'])))
                    else:
                        kept.append(w)
            if kept:
                o2 = copy.deepcopy(o)                                   # the line as the compile reads it: only the items that are items of this kit field
                o2['value']['weapons' if 'weapons' in o['value'] else 'items'] = kept
                o2['_n_items'] = len(lst)                               # a share word that the line leaves out is read against the whole list, not the kept part
                kept_lines.append(o2)
        if bad:
            out.skip(ls, '; '.join(bad))                                # a barred, restricted, placeholder or unknown item is part of the unit's real mix: the integration decides about the whole line
            continue
        if not kept_lines:
            out.skip(ls, '; '.join(r for _o, r in aside) or 'the line states no item')
            continue
        for o, r in aside:                                              # an item of another category (a cartridge in the weapon field) does not stop the other items of its line
            out.skip([o], 'part of the line is left out: %s; the other items of the line are compiled' % r)
        ls = kept_lines
        ids = [o['id'] for o in ls]                                     # the field cites the lines that were compiled, not a line whose every item was set aside
        table, kid, create, why, template = target_unit(ctx, uid)
        if kid is None:
            out.skip(ls, why)
            continue
        if not create and len(ctx.own_users.get(kid, ())) > 1:
            out.skip(ls, 'kit record %s serves several roster units (%s): evidence about one of them is not applied to the record of all, and two of them would change the same fields; the integration decides' % (kid, ', '.join(sorted(ctx.own_users[kid]))))
            continue
        ua = None
        if field == 'arms' and kf == 'weapon':
            ua = 'UA-EV-' + kid
        units = ctx.base[table]['units']
        old = units[kid]['fields'].get(kf) if kid in units else None
        if old is not None:
            same = canon(sorted(a['item'] for a in old['allowed'])) == canon(sorted((w.get('weapon_id') or w.get('item_id')) for o in ls for w in (o['value'].get('weapons') or o['value'].get('items'))))
            act = decide(old.get('tier'), old.get('weak_source'), ctx.primary_backed(table, old.get('source_keys', [])), same, worst_tier(ls))
            if act in ('conflict', 'keep'):
                out.skip(ls, 'evidence differs from %s.%s that stands on a primary source (or is only inferred): a delegated decision names the default' % (kid, kf))
                continue
            if act == 'weaker':
                out.skip(ls, 'the record gives %s.%s only as an inference, and the kit marks it documented: the kit value stands, and a delegated decision decides whether its tier is lowered' % (kid, kf))
                continue
            if act == 'confirm':
                out.set(table, ['units', kid, 'fields', kf, 'source_keys'], sorted(set(old['source_keys']) | set(line_keys(ls))), old, ids, 'the record states the same: source added')
                for i in sorted(ids):
                    out.op('append', table, ['units', kid, 'fields', kf, 'evidence_ids'], ids, 'line that states it', value=i, unique=True)
                continue
        fld = new_field(ctx, ls, kf, ids, old, ua, entry['army'])
        prior = out.created.get((table, kid)) if create else None
        if prior is not None:
            # a second kit field of a record this group already creates: it joins that create operation (a second create of the same key would fail the build)
            pu = prior['value']
            pu['fields'][kf] = fld
            if ua:
                pu['weapon_assignment_ids'] = sorted(set(pu.get('weapon_assignment_ids', [])) | {ua})
            pu['evidence_ids'] = sorted(set(pu.get('evidence_ids', [])) | set(ids))
            prior['evidence_ids'] = sorted(set(prior['evidence_ids']) | set(ids))
            prior['why'] += '; also %s as the record states it' % kf
        elif create and template is not None:
            _t, tkid, tu = template
            unit = copy.deepcopy(tu)
            unit.update({'id': kid, 'name': entry['name'], 'scope': 'regiment', 'hierarchy_printed': entry.get('parent'), 'evidence_ids': sorted(ids),
                         'notes': ('record of its brigade (%s) with the fields the record states for this regiment replaced' % tkid)})
            for k in ('named_individuals', 'pack_pile_ids', 'variants', 'printed', 'conditional_items', 'raw'):
                unit.pop(k, None)
            unit['fields'][kf] = fld
            unit['weapon_assignment_ids'] = sorted(set(tu.get('weapon_assignment_ids', [])) | ({ua} if ua else set()))
            out.op('create', table, ['units'], ids, 'a kit record for %s: its brigade record with %s as the record states it' % (uid, kf), key=kid, value=unit)
            out.created[(table, kid)] = out.ops[-1]
        elif create:
            side = 'union' if entry['army'] == 'US' else 'confederate'
            arm = 'cavalry' if table == 'cavalry' else 'infantry'
            unit = {'id': kid, 'name': entry['name'], 'army': side, 'scope': 'regiment', 'branch': arm, 'group': None, 'hierarchy_printed': entry.get('parent'), 'corps': None, 'division': None, 'brigade': None, 'state': None,
                    'presence': {'status': 'present_at_gettysburg', 'arrival': None, 'arrival_note': 'arrival/departure windows live in PDF B.2.4 (not in B.6); not checked here'}, 'inherits': 'default.%s.%s' % (side, arm),
                    'fields': {kf: fld}, 'zouave_policy': 'none', 'forbidden_tags': [], 'allowed_tags': [], 'open': [], 'dispute_ids': [], 'parse_status': 'parsed', 'weapon_assignment_ids': [ua] if ua else [],
                    'evidence_ids': sorted(ids)}
            out.op('create', table, ['units'], ids, 'a kit record for %s so that its %s follows the record' % (uid, kf), key=kid, value=unit)
            out.created[(table, kid)] = out.ops[-1]
        elif old is None and kid in units:
            out.set(table, ['units', kid, 'fields', kf], fld, units[kid]['fields'], ids, '%s of %s as the record states it' % (kf, kid))
            if ua:
                out.set(table, ['units', kid, 'weapon_assignment_ids'], sorted(set(units[kid].get('weapon_assignment_ids', [])) | {ua}), units[kid], ids, 'assignment of the record')
        else:
            out.set(table, ['units', kid, 'fields', kf], fld, units[kid]['fields'], ids, '%s of %s as the record states it (the earlier field is kept as lead_value)' % (kf, kid))
            if ua:
                out.set(table, ['units', kid, 'weapon_assignment_ids'], sorted(set(units[kid].get('weapon_assignment_ids', [])) | {ua}), units[kid], ids, 'assignment of the record')
        if ua:
            ws = [w.get('weapon_id') for o in ls for w in o['value']['weapons']]
            a = {'id': ua, 'unit': entry['name'], 'unit_ids': [kid], 'weapon_text': '; '.join(sorted({w['printed'] for o in ls for w in o['value']['weapons']}))[:300], 'confidence_printed': worst_tier(ls), 'source_keys': line_keys(ls),
                 'weapon_ids': sorted(set(ws)), 'status': 'assigned', 'tier': worst_tier(ls), 'weak_source': False, 'gap_ids': [], 'notes': None, 'evidence_ids': sorted(ids)}
            out.op('create', 'weapons', ['assignments'], ids, 'unit-to-weapon record of the evidence', key=ua, value=a)


def walk_keys(v, acc):
    """Collect every list under a key named source_keys inside a value."""
    if isinstance(v, dict):
        for k, x in v.items():
            if k == 'source_keys' and isinstance(x, list):
                acc.update(y for y in x if isinstance(y, str))
            else:
                walk_keys(x, acc)
    elif isinstance(v, list):
        for x in v:
            walk_keys(x, acc)


def audit_blocked(accepted):
    """(blocked, ran): the ids of accepted lines whose own words (the quote, printed names and labels, free text) the packer's copy audit rejects, each with the matched words, and whether the audit could run.
    The validator already rejects a hit in free text; a hit in a quoted member is only a warning there (a quotation cannot be altered), so such a line can arrive here. It is never copied into a shipped table."""
    strings = [(o['id'], s) for o in accepted for _k, _p, s in K.audit_texts(o)]
    hits = K.audit_strings([s for _i, s in strings])
    if hits is None:
        return {}, False
    blocked = collections.defaultdict(list)
    for i, w in hits:
        if w not in blocked[strings[i][0]]:
            blocked[strings[i][0]].append(w)
    return dict(blocked), True


def compile_lines(ctx, group, accepted, declared):
    out = Out(group)
    out.blocked, out.audit_ran = audit_blocked(accepted)
    by = collections.defaultdict(lambda: collections.defaultdict(list))
    for o in accepted:
        by[o['unit_id']][o['field']].append(o)
    for uid in sorted(by):
        for field, lines in sorted(by[uid].items()):
            hit = [o for o in lines if o['id'] in out.blocked]
            if hit:
                out.skip(lines, 'COPY AUDIT: the wording of %s (%s) would be copied into a shipped table and the packer rejects it; the line stays in the evidence index and the verified tables, and the integration decides'
                         % (', '.join(o['id'] for o in hit), '; '.join('"%s"' % w for o in hit for w in out.blocked[o['id']])))
                continue
            if field == 'guns':
                c_guns(ctx, out, uid, lines)
            elif field == 'commander':
                c_commander(ctx, out, uid, lines)
            elif field in ('arms', 'dress'):
                c_fields(ctx, out, uid, field, lines)
    # register, in each table, the evidence sources that its operations cite
    reg = K.registry()
    need = collections.defaultdict(set)
    for op in list(out.ops):
        ks = set()
        walk_keys(op.get('value'), ks)
        if op.get('path') and op['path'][-1] == 'source_keys' and isinstance(op.get('value'), list):
            ks |= {x for x in op['value'] if isinstance(x, str)}
        need[op['table']] |= {x for x in ks if x in reg or x in declared}
    for t in sorted(need):
        for sid in sorted(need[t]):
            out.op('register_source', t, None, [], 'source cited by the evidence of group %s' % group, key=sid, value=ctx.source_meta(sid, declared))
    return out


def load_base():
    import build_kit_data as B
    ks, w, a, c = B.build_tables()
    return {'kit_specs': ks, 'weapons': w, 'artillery': a, 'cavalry': c}


def collisions(docs):
    """[(op id, op id)] of operations, in one document or across documents, that create the same record or set or remove the same path: the second would find its guard changed by the first and fail the build."""
    seen, bad = {}, []
    for gid in sorted(docs):
        for op in docs[gid]['ops']:
            if op['op'] == 'create':
                key = ('create', op['table'], tuple(op['path']), op['key'])
            elif op['op'] in ('set', 'remove'):
                key = ('change', op['table'], tuple(op['path']))
            else:
                continue
            if key in seen:
                bad.append((seen[key], op['id']))
            else:
                seen[key] = op['id']
    return bad


def compile_all(only=None, ev_dir=EV, ov_dir=OV, write=True, base=None):
    import kit_evidence_check as C
    gdoc = K.groups_doc()
    base = base or load_base()
    ctx = Ctx(gdoc, base)
    index, summary, docs = {}, {}, {}
    for g in gdoc['groups']:
        if only and g['id'] not in only:
            continue
        p = os.path.join(ev_dir, g['id'] + '.jsonl')
        if not os.path.exists(p):
            continue
        R = C.check_group(g['id'], p)
        accepted = [R.lines[i] for i in R.accepted if R.lines[i].get('tier') in ('documented', 'inferred') and R.lines[i].get('unit_id')]
        for o in accepted:
            index[o['id']] = cite(o, R.declared)
            if o.get('source_id'):
                ctx.source_meta(o['source_id'], R.declared)
        out = compile_lines(ctx, g['id'], accepted, R.declared)
        summary[g['id']] = {'lines': sum(R.counts.values()), 'accepted': len(R.accepted), 'rejected': len(R.rejected), 'ops': len(out.ops), 'unapplied': len(out.unapplied), 'errors': len(R.errors),
                            'routed': sum(1 for u in out.unapplied if u.get('routed')), 'copy_audit_blocked': len(out.blocked), 'copy_audit_ran': out.audit_ran}
        docs[g['id']] = {'schema': SCHEMA, 'group': g['id'], 'compiled_from': {'evidence_sha256_16': sha16(p), 'groups_sha256_16': sha16(os.path.join(EV, 'groups.json'))}, 'ops': out.ops, 'unapplied': out.unapplied}
    clash = collisions(docs)
    if clash:
        raise OverrideError('two operations make the same change (a record created twice, or one path set twice): %s' % '; '.join('%s and %s' % c for c in clash[:10]))
    if write:
        os.makedirs(ov_dir, exist_ok=True)
        for gid, d in docs.items():
            fp = os.path.join(ov_dir, gid + '.json')
            if d['ops'] or d['unapplied']:
                with open(fp, 'w', encoding='utf-8', newline='\n') as f:
                    json.dump(d, f, ensure_ascii=False, indent=1)
                    f.write('\n')
            elif os.path.exists(fp):
                os.remove(fp)
        if index or os.path.exists(os.path.join(KIT, 'evidence_index.json')) and not only:
            with open(os.path.join(KIT, 'evidence_index.json'), 'w', encoding='utf-8', newline='\n') as f:
                json.dump({'schema': 'kit-evidence-index-1', 'lines': dict(sorted(index.items())), 'sources': {k: v for k, v in sorted(ctx.srcs.items())}}, f, ensure_ascii=False, indent=1)
                f.write('\n')
    return docs, summary, index


# ---------------------------------------------------------------------------------------------------------------------
def diff_paths(a, b, path='', out=None, limit=12):
    out = [] if out is None else out
    if len(out) >= limit:
        return out
    if type(a) != type(b):
        out.append(path or '/')
    elif isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append('%s/%s (%s)' % (path, k, 'only in the committed table' if k in a else 'only in base + overrides'))
            else:
                diff_paths(a[k], b[k], '%s/%s' % (path, k), out, limit)
            if len(out) >= limit:
                break
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append('%s (list of %d vs %d)' % (path, len(a), len(b)))
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                diff_paths(x, y, '%s[%d]' % (path, i), out, limit)
    elif a != b:
        if isinstance(a, str) and isinstance(b, str):
            k = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
            out.append('%s: texts differ at character %d: committed ...%s... vs base ...%s...' % (path, k, a[max(0, k - 18):k + 22], b[max(0, k - 18):k + 22]))
        else:
            out.append('%s: %r vs %r' % (path, a, b))
    return out


def cmd_status(argv):
    base = load_base()
    ks, w, a, c, rep = apply_overrides(base['kit_specs'], base['weapons'], base['artillery'], base['cavalry'])
    want = {'kit_specs': ks, 'weapons': w, 'artillery': a, 'cavalry': c}
    drift = 0
    for t in TABLES:
        p = os.path.join(KIT, FILES[t])
        with open(p, encoding='utf-8') as f:
            have = json.load(f)
        d = diff_paths(have, json.loads(json.dumps(want[t], ensure_ascii=False)))
        print('%-16s %s' % (FILES[t], 'equals base + overrides' if not d else 'DIFFERS: ' + '; '.join(d[:6])))
        drift += bool(d)
    print('override files: %s; operations %d; evidence lines cited %d' % (rep['files'] or 'none', rep['ops'], rep['evidence_ids']))
    if drift:
        print('DRIFT: a committed table differs from what the build makes (a hand edit, or a generator changed): rebuild only after reading the differences above')
    return 1 if drift else 0


def walk_strings(o, path=()):
    """[(path, string)] of every string value of a parsed table."""
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk_strings(v, path + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk_strings(v, path + (i,))
    elif isinstance(o, str):
        yield path, o


def cmd_check(argv):
    import tempfile
    import check_kit as CK
    base = load_base()
    ks, w, a, c, rep = apply_overrides(base['kit_specs'], base['weapons'], base['artillery'], base['cavalry'])
    d = tempfile.mkdtemp(prefix='kit-check-', dir=os.path.join(K.ROOT, 'tmp'))
    try:
        for t, obj in zip(TABLES, (ks, w, a, c)):
            with open(os.path.join(d, FILES[t]), 'w', encoding='utf-8', newline='\n') as f:
                json.dump(obj, f, indent=1, ensure_ascii=False)
        kit = CK.Kit(d)
        errs, warns, info = CK.data_checks(kit)
    finally:
        shutil.rmtree(d, ignore_errors=True)                # the check leaves nothing behind
    errs = list(errs)
    # copy audit of every string of the four tables (they ship), by the packer's own rules; a table that says how it was made must not ship
    tables = dict(zip(TABLES, (ks, w, a, c)))
    flat = [(t, '/'.join(map(str, p)), s) for t in TABLES for p, s in walk_strings(tables[t])]
    hits = K.audit_strings([s for _t, _p, s in flat])
    if hits is None:
        warns = list(warns) + [('AUDIT_SKIPPED', 'the copy audit could not run (no node, or tools/bt/pack_theatre.mjs cannot be loaded): the strings of the four tables were not checked')]
    else:
        for i, word in hits:
            errs.append(('AUDIT', '%s %s has "%s": %s' % (FILES[flat[i][0]], flat[i][1], word, flat[i][2][:120])))
    print('override files %s: %d operations; data checks and copy audit on base + overrides: %d ERROR, %d WARN' % (rep['files'] or 'none', rep['ops'], len(errs), len(warns)))
    for code, msg in errs[:30]:
        print('  ERROR %s: %s' % (code, msg))
    for code, msg in [x for x in warns if x[0] == 'AUDIT_SKIPPED']:
        print('  WARN %s: %s' % (code, msg))
    return 1 if errs else 0


def cmd_compile(argv):
    ap = argparse.ArgumentParser(prog='compile')
    ap.add_argument('--group', action='append')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    try:
        docs, summary, index = compile_all(a.group, write=not a.dry_run)
    except OverrideError as e:                                          # nothing was written: say why, plainly
        print('ERROR compile: %s' % e)
        return 1
    for gid, s in summary.items():
        print('%-22s lines %4d accepted %4d rejected %3d (errors %d) -> %d operations, %d unapplied (%d of them routed to the verified tables by design, %d to review)'
              % (gid, s['lines'], s['accepted'], s['rejected'], s['errors'], s['ops'], s['unapplied'], s['routed'], s['unapplied'] - s['routed']))
        if not s['copy_audit_ran']:
            print('  AUDIT_SKIPPED: the copy audit could not run (no node, or tools/bt/pack_theatre.mjs cannot be loaded): the words of the lines were not checked')
        if s['copy_audit_blocked']:
            print('  COPY AUDIT: %d line(s) not compiled because their wording would ship a word the packer rejects (see unapplied)' % s['copy_audit_blocked'])
    print('%d groups with evidence files, %d evidence lines indexed%s' % (len(summary), len(index), ' (dry run: nothing written)' if a.dry_run else ''))
    for gid, d in docs.items():
        review = [u for u in d['unapplied'] if not u.get('routed')]
        for u in review[:8]:
            print('  to review %s: %s (%s)' % (gid, u['reason'][:140], ', '.join(u['evidence_ids'][:3])))
        if len(review) > 8:
            print('  to review %s: ... and %d more (kit/overrides/%s.json, member unapplied)' % (gid, len(review) - 8, gid))
    return 0


try:
    from kit_items import SHARE_WORD_TUNING as SHARE_TUNING
except ImportError:                                     # pragma: no cover
    SHARE_TUNING = {'all': 1.0, 'most': 6.0, 'majority': 6.0, 'minority': 2.0, 'some': 2.0, 'few': 1.0, 'rare': 0.5}


def main(argv):
    cmds = {'compile': cmd_compile, 'check': cmd_check, 'status': cmd_status}
    if not argv or argv[0] not in cmds:
        print(__doc__)
        return 2
    return cmds[argv[0]](argv[1:])


if __name__ == '__main__':
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    sys.exit(main(sys.argv[1:]))
