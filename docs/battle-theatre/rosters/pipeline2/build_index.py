"""Index, status and lint of the roster2 data set.  Standard library only; reads the files that exist and types nothing by hand.

    python3 -I build_index.py                 table: one line per work item (units with a file, rows, bytes, report, pointer file)
    python3 -I build_index.py --group ID      the same for one work item, with one line per unit
    python3 -I build_index.py --write         write  data2/INDEX.json  (the index the roster page reads)  and  rosters/status.json
    python3 -I build_index.py --lint          cheap checks, exit 1 on a defect (header counts, orphans, sidecar contract, ledgers, rights)
    python3 -I build_index.py --verify        also run verify_unit.verify_file on every unit file (heavy: run through tools/horde/bench.sh)

Run from anywhere.  The index is rebuilt in full on every run, in the order of data2/units.json (deterministic).

What the index holds, per unit: the file, the rows, raw and gzipped bytes, the sha256 of the raw lines, the segments (source id,
volume, text id, layout, rows), the sidecar files beside the unit file, the roles of the sources read, and a coverage class derived
from those roles only:  none (no file) | roll (a segment of a source whose role is roll or index) | list-only (only commission,
participants, casualty, burial or list segments) | officers-only | unclassified.  "roll" says a roll is read, never that it is
complete: the report of the work item states what is missing.  Rights per name: a row belongs to a segment, a segment to a text
id, and the index section "texts" carries the ledger facts of each text id (item identifier, date, the item's own copyright
flag, access flag) and the rights basis of the pointer file rosters/sources/<work item>.json.
"""
import sys, os, json, gzip, glob, statistics, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D2 = os.path.join(R2, 'data2')
LINE_AIM = 90                 # bytes: "under about 90 bytes a line" (the brief); the remarks as printed are never cut to meet it
RAW_LIMIT = 80 * 1000 * 1000  # bytes: the brief gzips the per-unit files when the total would pass this
ROLL_ROLES = {'roll', 'index'}
LIST_ROLES = {'commission', 'participants', 'casualty', 'burial', 'list', 'compendium'}


def jload(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def gz_json(path):
    with gzip.open(path, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


def row_line_bytes(path):
    """Byte lengths of the row lines (arrays) of a unit file, newline included."""
    with gzip.open(path, 'rb') as f:
        raw = f.read()
    return [len(ln) + 1 for ln in raw.split(b'\n') if ln.startswith(b'[')]


def load_plan():
    units = jload(os.path.join(D2, 'units.json'))['units']
    wi = jload(os.path.join(R2, 'work-items.json'))
    groups = [g for g in wi['groups'] if g.get('units')]
    unit_group, roles = {}, {}
    for g in groups:
        for u in g['units']:
            unit_group[u['key']] = g['id']
        for s in g['sources']:
            roles.setdefault(s['id'], s['role'])
    return units, groups, unit_group, roles


def pointer_rights(group_id):
    """text id -> rights basis, from rosters/sources/<group>.json (written by the work item)."""
    p = os.path.join(R2, 'sources', group_id + '.json')
    if not os.path.exists(p):
        return None, {}
    d = jload(p)
    out = {}
    for s in d.get('sources', []):
        r = s.get('rights')
        if s.get('text_id') and isinstance(r, dict):
            out[s['text_id']] = r.get('basis')
    return rel(p), out


def ledger_text(source_id, text_id, cache={}):
    key = source_id
    if key not in cache:
        p = os.path.join(D2, 'sources', source_id + '.json')
        cache[key] = jload(p) if os.path.exists(p) else None
    led = cache[key]
    return None if led is None else led.get('texts', {}).get(text_id)


def scan():
    units, groups, unit_group, roles = load_plan()
    known_paths = {u['path'] for u in units}
    res = {'units': [], 'texts': {}, 'defects': [], 'warnings': [], 'other': {}, 'groups': groups, 'unit_group': unit_group}
    pointers = {}
    for u in units:
        gid = unit_group.get(u['key'])
        if gid not in pointers:
            pointers[gid] = pointer_rights(gid)
        ent = {'key': u['key'], 'army': u['army'], 'st': u['st'], 'group': gid, 'designation': u['designation'], 'arm': u['arm'], 'file': None,
               'rows': 0, 'raw_bytes': 0, 'gz_bytes': 0, 'sha256_raw': None, 'segments': [], 'flags': None, 'cells': None, 'lists': None, 'roles': [],
               'coverage': 'none', 'line_bytes': None}
        path = os.path.join(D2, u['path'])
        if os.path.exists(path):
            try:
                head, segs, meta = R.read_unit(path)
            except Exception as e:
                res['defects'].append('%s: unreadable (%s)' % (u['path'], e))
                ent['file'] = u['path']
                ent['coverage'] = 'unreadable'
                res['units'].append(ent)
                continue
            if head.get('u') != u['key']:
                res['defects'].append('%s: header unit %r is not %r' % (u['path'], head.get('u'), u['key']))
            ent['file'] = u['path']
            ent['rows'] = head['n']
            ent['raw_bytes'] = meta['raw']
            ent['gz_bytes'] = os.path.getsize(path)
            ent['sha256_raw'] = meta['sha256']
            lb = row_line_bytes(path)
            if lb:
                ent['line_bytes'] = {'mean': round(sum(lb) / len(lb), 1), 'median': statistics.median(lb), 'p90': sorted(lb)[int(0.9 * (len(lb) - 1))],
                                     'share_le_%d' % LINE_AIM: round(sum(1 for x in lb if x <= LINE_AIM) / len(lb), 3), 'n': len(lb)}
            rs = set()
            for seg, rows in segs:
                ent['segments'].append({'s': seg['s'], 'v': seg['v'], 't': seg['t'], 'lay': seg['lay'], 'rows': len(rows)})
                rs.add(roles.get(seg['s'], 'unclassified'))
                tid = seg['t']
                if tid not in res['texts']:
                    lt = ledger_text(seg['s'], tid)
                    if lt is None:
                        res['defects'].append('%s: text id %s has no ledger entry in data2/sources/%s.json' % (u['path'], tid, seg['s']))
                        res['texts'][tid] = {'source_id': seg['s'], 'ledger': 'missing'}
                    else:
                        res['texts'][tid] = {'source_id': seg['s'], 'volume': lt.get('volume'), 'kind': lt.get('kind'), 'ia_identifier': lt.get('ia_identifier'),
                                             'ia_title': lt.get('ia_title'), 'ia_date': lt.get('ia_date'),
                                             'ia_possible_copyright_status': lt.get('ia_possible_copyright_status'),
                                             'ia_access_restricted_item': lt.get('ia_access_restricted_item'),
                                             'text_sha256': (lt.get('files') or {}).get('text', {}).get('sha256'),
                                             'rights_basis': (pointers[gid][1].get(tid) or pointers[gid][1].get(lt.get('base_text_id'))) if pointers.get(gid) else None}
                        if lt.get('base_text_id'):
                            res['texts'][tid]['derived_from'] = lt['base_text_id']
                        if lt.get('ia_access_restricted_item'):
                            res['defects'].append('%s: text %s is an access-restricted item' % (u['path'], tid))
                        if res['texts'][tid]['rights_basis'] is None:
                            res['warnings'].append('%s: no rights basis for text %s in the pointer file of %s' % (u['path'], tid, gid))
            ent['roles'] = sorted(rs)
            if rs & ROLL_ROLES:
                ent['coverage'] = 'roll'
            elif rs and rs <= {'officers'}:
                ent['coverage'] = 'officers-only'
            elif rs and rs <= LIST_ROLES:
                ent['coverage'] = 'list-only'
            else:
                ent['coverage'] = 'unclassified'
            stem = path[:-len('.jsonl.gz')]
            for kind, suffix, fmt in (('flags', '.flags.json.gz', 'roster2-flags/1'), ('cells', '.cells.json.gz', 'roster2-cells/1')):
                sp = stem + suffix
                if os.path.exists(sp):
                    ent[kind] = rel(sp)[len(rel(D2)) + 1:]
                    try:
                        o = gz_json(sp)
                    except Exception as e:
                        res['defects'].append('%s: unreadable (%s)' % (rel(sp), e))
                        continue
                    if o.get('f') != fmt:
                        res['defects'].append('%s: f is %r, expected %r' % (rel(sp), o.get('f'), fmt))
                    if o.get('u') != u['key']:
                        res['defects'].append('%s: u is %r, expected %r' % (rel(sp), o.get('u'), u['key']))
                    if o.get('n') != head['n']:
                        res['defects'].append('%s: n=%r but the unit file has %d rows' % (rel(sp), o.get('n'), head['n']))
                    if kind == 'flags':
                        ou = o.get('ocr_uncertain')
                        if not (isinstance(ou, list) and all(isinstance(i, int) and 0 <= i < head['n'] for i in ou)):
                            res['defects'].append('%s: ocr_uncertain must be a list of row numbers inside the file' % rel(sp))
                        if not isinstance(o.get('on_rolls_july_1863'), dict):
                            res['defects'].append('%s: on_rolls_july_1863 must be an object' % rel(sp))
                        h = o.get('unit_file_raw_lines_sha256')
                        if h and h != meta['sha256']:
                            res['warnings'].append('%s: unit_file_raw_lines_sha256 differs from the unit file now (the file was rewritten after the flags)' % rel(sp))
                    if kind == 'cells' and not isinstance(o.get('rows'), list):
                        res['defects'].append('%s: rows must be a list' % rel(sp))
                elif kind == 'flags':
                    res['warnings'].append('%s: no flags file (ocr_uncertain and on_rolls_july_1863 are asked of every unit)' % u['path'])
            lp = stem + '.lists.jsonl.gz'
            if os.path.exists(lp):
                ent['lists'] = rel(lp)[len(rel(D2)) + 1:]
                try:
                    lh, lsegs, lmeta = R.read_unit(lp)
                    if lh.get('u') != u['key']:
                        res['defects'].append('%s: header unit %r is not %r' % (rel(lp), lh.get('u'), u['key']))
                    ent['lists_rows'] = lh['n']
                    ent['lists_segments'] = [{'s': sg['s'], 'v': sg['v'], 't': sg['t'], 'lay': sg['lay'], 'rows': len(rw)} for sg, rw in lsegs]
                except Exception as e:
                    res['defects'].append('%s: unreadable (%s)' % (rel(lp), e))
        res['units'].append(ent)
    # files that belong to no unit of the list
    for st_dir in sorted(glob.glob(os.path.join(D2, '*', '*'))):
        if not os.path.isdir(st_dir) or os.path.basename(os.path.dirname(st_dir)) not in ('union', 'confederate'):
            continue
        for f in sorted(os.listdir(st_dir)):
            p = rel(os.path.join(st_dir, f))[len(rel(D2)) + 1:]
            if f.endswith('.lists.jsonl.gz') and (p[:-len('.lists.jsonl.gz')] + '.jsonl.gz') in known_paths:
                continue
            if f.endswith('.jsonl.gz') and p not in known_paths:
                if f.startswith('_'):
                    res['other'].setdefault(os.path.basename(os.path.dirname(st_dir)) + '/' + os.path.basename(st_dir), []).append(
                        {'file': p, 'gz_bytes': os.path.getsize(os.path.join(st_dir, f))})
                else:
                    res['defects'].append('%s: a unit file for a unit that is not in data2/units.json (a list file starts with an underscore)' % p)
    return res


def totals(ents):
    t = {'units': len(ents), 'units_with_files': sum(1 for e in ents if e['file']), 'rows': sum(e['rows'] for e in ents),
         'raw_bytes': sum(e['raw_bytes'] for e in ents), 'gz_bytes': sum(e['gz_bytes'] for e in ents)}
    lbs = [e['line_bytes'] for e in ents if e['line_bytes']]
    if lbs:
        n = sum(x['n'] for x in lbs)
        t['row_line_bytes_mean'] = round(sum(x['mean'] * x['n'] for x in lbs) / n, 1)
        t['row_lines_le_%d_share' % LINE_AIM] = round(sum(x['share_le_%d' % LINE_AIM] * x['n'] for x in lbs) / n, 3)
    return t


def group_status(res):
    out = {}
    for g in res['groups']:
        ents = [e for e in res['units'] if e['group'] == g['id']]
        t = totals(ents)
        side = 0
        for e in ents:
            for k in ('flags', 'cells', 'lists'):
                if e[k]:
                    side += os.path.getsize(os.path.join(D2, e[k]))
        stage = 'none' if t['units_with_files'] == 0 else ('files-for-every-unit' if t['units_with_files'] == t['units'] else 'partial')
        stt = res['other'].get(g['army'] + '/' + g['state_code'], [])
        rp = os.path.join(R2, 'reports', g['id'] + '.md')
        pp = os.path.join(R2, 'sources', g['id'] + '.json')
        out[g['id']] = dict(t, sidecar_bytes=side, stage=stage, list_files=[o['file'] for o in stt],
                            report=rel(rp) if os.path.exists(rp) else None, pointer=rel(pp) if os.path.exists(pp) else None,
                            units_without_file=[e['key'] for e in ents if not e['file']] if stage == 'partial' else None,
                            coverage={c: sum(1 for e in ents if e['coverage'] == c) for c in sorted({e['coverage'] for e in ents})})
    return out


def build_index(res):
    armies = {}
    names = {g['id']: g['title'] for g in res['groups']}
    for e in res['units']:
        a = armies.setdefault(e['army'], {})
        st = a.setdefault(e['st'], {'group': e['group'], 'name': names[e['group']], 'units': []})
        u = {k: e[k] for k in ('key', 'designation', 'arm', 'file', 'rows', 'raw_bytes', 'gz_bytes', 'sha256_raw', 'segments', 'flags', 'cells', 'lists', 'roles', 'coverage')}
        st['units'].append(u)
    for a in armies.values():
        for st in a.values():
            st['totals'] = totals([e for e in res['units'] if e['group'] == st['group']])
            st['list_files'] = res['other'].get(('union' if st['group'].startswith('union') else 'confederate') + '/' + st['group'].split('-', 1)[1], [])
    t = totals(res['units'])
    return {'format': 'roster2-index/1',
            'about': 'Built from the unit files under data2/ by pipeline2/build_index.py. A unit entry says which segments (source, volume, text) the file holds, never that the roll is complete. The file of a unit is data2/<file>.',
            'totals': t,
            'size_rule': {'aim_bytes_per_row_line': LINE_AIM, 'raw_limit_bytes': RAW_LIMIT, 'raw_total': t['raw_bytes'], 'gz_total': t['gz_bytes'],
                          'files_are_gzipped': True},
            'armies': armies, 'texts': res['texts']}


def table(res, only=None):
    gs = group_status(res)
    print('%-24s %5s %5s %8s %9s %8s %-20s %s' % ('work item', 'units', 'files', 'rows', 'raw B', 'gz B', 'stage', 'report / pointer'))
    for gid, s in gs.items():
        if only and gid != only:
            continue
        print('%-24s %5d %5d %8d %9d %8d %-20s %s / %s' % (gid, s['units'], s['units_with_files'], s['rows'], s['raw_bytes'], s['gz_bytes'], s['stage'],
                                                         'yes' if s['report'] else 'no', 'yes' if s['pointer'] else 'no'))
    if only:
        for e in res['units']:
            if e['group'] == only:
                lb = e['line_bytes']
                print('  %-52s %-14s rows %6d  line mean %s  segments %s' % (e['key'], e['coverage'], e['rows'], lb['mean'] if lb else '-', ','.join('%s:%d' % (s['t'].split('.')[0], s['rows']) for s in e['segments'])))
    t = totals(res['units'])
    print('TOTAL: %(units_with_files)d of %(units)d units have a file, %(rows)d rows, %(raw_bytes)d raw bytes, %(gz_bytes)d gzipped bytes' % t)
    return gs


def main(argv):
    res = scan()
    only = argv[argv.index('--group') + 1] if '--group' in argv else None
    if '--verify' in argv:
        import verify_unit as V
        bad = 0
        for e in res['units']:
            if e['file']:
                v = V.verify_file(os.path.join(D2, e['file']))
                e['verify'] = {'ok': v['ok'], 'v1_name_defects': v['v1_name_defects'], 'v3_page_defects': v['v3_page_defects'], 'problems': len(v['problems'])}
                if not v['ok']:
                    bad += 1
                    res['defects'].append('%s: verify_unit reports %d name defects, %d page defects, %d problems' % (e['file'], v['v1_name_defects'], v['v3_page_defects'], len(v['problems'])))
    gs = table(res, only)
    if '--write' in argv:
        idx = build_index(res)
        if '--verify' in argv:
            for st in [s for a in idx['armies'].values() for s in a.values()]:
                for u in st['units']:
                    ev = next((e for e in res['units'] if e['key'] == u['key']), None)
                    if ev and 'verify' in ev:
                        u['verify'] = ev['verify']
        with open(os.path.join(D2, 'INDEX.json'), 'w', encoding='utf-8') as f:
            json.dump(idx, f, ensure_ascii=False, indent=1)
            f.write('\n')
        with open(os.path.join(R2, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({'format': 'roster2-status/1', 'about': 'Per work item, from the files that exist (pipeline2/build_index.py). stage: none | partial | files-for-every-unit; it says where files exist, not that a roll is complete: read the report.',
                       'totals': totals(res['units']), 'groups': gs, 'defects': res['defects'], 'warnings_count': len(res['warnings'])}, f, ensure_ascii=False, indent=1)
            f.write('\n')
        print('wrote data2/INDEX.json and rosters/status.json')
    if '--lint' in argv or '--verify' in argv:
        for d in res['defects']:
            print('DEFECT', d)
        for w in res['warnings'][:40]:
            print('warning', w)
        if len(res['warnings']) > 40:
            print('warning ... and %d more' % (len(res['warnings']) - 40))
        print('defects: %d, warnings: %d' % (len(res['defects']), len(res['warnings'])))
        return 1 if res['defects'] else 0
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
