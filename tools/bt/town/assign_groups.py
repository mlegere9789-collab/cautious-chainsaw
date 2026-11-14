#!/usr/bin/env python3
"""Assign every structure of the product's inventory to one group of the town evidence pass and write evidence/groups.json.

    python3 tools/bt/town/assign_groups.py            # writes docs/battle-theatre/town/evidence/groups.json
    python3 tools/bt/town/assign_groups.py --check    # exit 1 when groups.json differs from what the data and town_groups.py give
    python3 tools/bt/town/assign_groups.py --self-test

Inputs (all in the repository): docs/battle-theatre/structures/structures.json (130 records), docs/battle-theatre/app/data/structures3d-inventory.json
(what the product draws), docs/basemap1863/features/structures/structures.geojson (605 features), roads-rail-water/{bridges,railways,roads,lanes,fences}.geojson,
docs/battle-theatre/structures/hospitals.json, docs/battle-theatre/app/data/gazetteer.json (anchors), tools/bt/photomatch/photograph_registry.json, and
tools/bt/town/town_groups.py (the hand-written definitions). The rule of assignment is the one at the head of town_groups.py. Deterministic: no clock, no random.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import town_groups as TG  # noqa: E402

BT = os.path.join(ROOT, 'docs', 'battle-theatre')
BASE = os.path.join(ROOT, 'docs', 'basemap1863', 'features')
OUT = os.path.join(BT, 'town', 'evidence', 'groups.json')
STREET_TOL_M = 45.0


def jl(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def utm_transformer():
    from pyproj import Transformer
    return Transformer.from_crs(4326, 32618, always_xy=True)


def centroid_xy(geom, T):
    """UTM 18N (x, y) of the centroid of a GeoJSON geometry given in lng/lat."""
    from shapely.geometry import shape
    g = shape(geom)
    if g.is_empty:
        return None
    if g.geom_type in ('LineString', 'MultiLineString'):
        try:
            c = g.interpolate(0.5, normalized=True) if g.geom_type == 'LineString' else g.centroid
        except Exception:
            c = g.centroid
    else:
        c = g.centroid
    return T.transform(c.x, c.y)


def dist_to_axis(x, y, ax):
    """Distance (m) from a point to the finite street axis, or None when outside its extent."""
    (x1, y1), (x2, y2) = ax['p']
    if ax['kind'] == 'ns':
        lo, hi = ax['y']
        if not (lo <= y <= hi):
            return None
        t = (y - y1) / (y2 - y1)
        xa = x1 + t * (x2 - x1)
        return abs(x - xa) * math.cos(math.atan2(x2 - x1, y1 - y2))
    lo, hi = ax['x']
    if not (lo <= x <= hi):
        return None
    t = (x - x1) / (x2 - x1)
    ya = y1 + t * (y2 - y1)
    return abs(y - ya) * math.cos(math.atan2(y2 - y1, x2 - x1))


def street_group(x, y):
    best = None
    for name, ax in TG.STREET_AXES.items():
        d = dist_to_axis(x, y, ax)
        if d is not None and d <= STREET_TOL_M and (best is None or d < best[0]):
            best = (d, name, ax['group'])
    return (best[2], best[1], round(best[0], 1)) if best else None


def in_borough(x, y):
    """The rectangle of the borough grid (Hopkins inset blocks, extended a block each way)."""
    return 308450 <= x <= 309750 and 4410350 <= y <= 4412050


def anchors(gaz, T):
    """[(name, group, x, y)] from gazetteer places and curated farms."""
    out = []
    byname = {p['name']: p for p in gaz['places'] if p.get('center')}
    for grp, names in TG.AREA_ANCHORS.items():
        for n in names:
            p = byname.get(n)
            if p:
                x, y = T.transform(p['center']['lng'], p['center']['lat'])
                out.append((n, grp, x, y))
    return out


def nearest(x, y, anc):
    best = None
    for n, g, ax, ay in anc:
        d = math.hypot(x - ax, y - ay)
        if best is None or d < best[0]:
            best = (d, n, g)
    return best


def main(check=False):
    T = utm_transformer()
    S = jl(os.path.join(BT, 'structures', 'structures.json'))['structures']
    inv = jl(os.path.join(BT, 'app', 'data', 'structures3d-inventory.json'))
    gaz = jl(os.path.join(BT, 'app', 'data', 'gazetteer.json'))
    hosp = jl(os.path.join(BT, 'structures', 'hospitals.json'))
    reg = jl(os.path.join(ROOT, 'tools', 'bt', 'photomatch', 'photograph_registry.json'))['photographs']
    geo = jl(os.path.join(BASE, 'structures', 'structures.geojson'))['features']
    anc = anchors(gaz, T)
    feat_dec = {f['id']: f for f in inv['features']}
    rec_dec = {r['id']: r for r in inv['records']}
    explicit = {}
    for g, ids in TG.EXPLICIT.items():
        for i in ids:
            if i in explicit and explicit[i] != g:
                raise SystemExit('id %s listed in two groups: %s and %s' % (i, explicit[i], g))
            explicit[i] = g

    members = {g['id']: {'records': [], 'record_parts': [], 'basemap_structures': [], 'bridges': [], 'railways': [], 'fences': [], 'roads': [], 'lanes': [], 'hospitals': [], 'other_records': []}
               for g in TG.GROUP_DEFS}
    why = {}          # id -> basis of the assignment
    far = {}          # id -> distance to the nearest anchor when over 1500 m
    unassigned = []   # (id, kind, reason)

    # ---- basemap structures (605): position first
    pos = {}
    for f in geo:
        p = f['properties']
        if f.get('geometry'):
            xy = centroid_xy(f['geometry'], T)
            if xy:
                pos[p['id']] = xy
    farm_of = {f['properties']['id']: f['properties'].get('farm') for f in geo}
    sub_of = {f['properties']['id']: f['properties'].get('subtype') for f in geo}
    for f in geo:
        p = f['properties']
        i = p['id']
        g = explicit.get(i)
        basis = 'explicit'
        if g is None and i in pos:
            x, y = pos[i]
            if sub_of[i] == 'borough_building_mass':
                sg = street_group(x, y)
                if sg:
                    g, basis = sg[0], 'street axis %s at %s m' % (sg[1], sg[2])
                else:
                    g, basis = 'street-middle-high-lanes', 'borough mass beyond %d m of every named street axis' % int(STREET_TOL_M)
            elif farm_of[i] in TG.FARM_GROUP:
                g, basis = TG.FARM_GROUP[farm_of[i]], 'curated farm key %s' % farm_of[i]
            elif in_borough(x, y):
                sg = street_group(x, y)
                g, basis = (sg[0], 'street axis %s at %s m' % (sg[1], sg[2])) if sg else ('street-middle-high-lanes', 'inside the borough grid, off every axis')
            else:
                d, n, g2 = nearest(x, y, anc)
                g, basis = g2, 'nearest anchor %s at %d m' % (n, round(d))
                if d > 1500:
                    far[i] = round(d)
        elif g is None:
            fk = farm_of[i]
            if fk in TG.FARM_GROUP:
                g, basis = TG.FARM_GROUP[fk], 'curated farm key %s (no geometry)' % fk
            else:
                unassigned.append((i, 'basemap structure', 'no geometry and no explicit group'))
                continue
        members[g]['basemap_structures'].append(i)
        why[i] = basis

    # ---- structures.json records
    for r in S:
        i = r['id']
        if i in TG.PART_GROUP:
            parts = TG.PART_GROUP[i]
            for pt, g in parts.items():
                members[g]['record_parts'].append('%s#%s' % (i, pt))
            why[i] = 'split by part: ' + ', '.join('%s -> %s' % (k, v) for k, v in parts.items())
            continue
        g = explicit.get(i)
        if g:
            if r['kind'] in ('building', 'bridge'):
                members[g]['records'].append(i)
            else:
                members[g]['other_records'].append(i)
            why[i] = 'explicit'
            continue
        k = r['kind']
        if k in ('gun_emplacement', 'barricade', 'earthwork', 'breastwork', 'fortification_undetailed', 'traverse', 'line_extension', 'occupation_not_construction',
                 'shelling_damage_state', 'lunette', 'no_construction', 'stone_breastwork', 'gun_position_improvised', 'no_works', 'open_gap'):
            unassigned.append((i, k, 'works and emplacements: the construction chronology of PDF B.7, built on screen by the works pipeline (OA11), not a standing building of this pass'))
        elif k in ('epilogue_state', 'world_state', 'crop', 'person_state', 'group', 'terrain', 'cemetery'):
            unassigned.append((i, k, 'state of the ground, crops, people or sky: not a structure (vegetation, epilogue, history layers)'))
        elif k in ('road', 'railroad'):
            unassigned.append((i, k, 'a road or railway record: its lines are assigned under roads and railways'))
        elif k == 'avenue_not_in_1863':
            unassigned.append((i, k, 'never drawn (RULE-04); see terrain-changes-since-1863'))
        else:
            unassigned.append((i, k, 'no rule matched'))

    # ---- bridges, railways, roads, lanes, fences (geojson lines and points)
    def lay(path, key, idkey='id'):
        d = jl(os.path.join(BASE, 'roads-rail-water', path))
        out = []
        for f in d['features']:
            p = f['properties']
            i = p.get(idkey) or f.get('id')
            xy = centroid_xy(f['geometry'], T) if f.get('geometry') else None
            out.append((i, xy))
        return out

    for i, xy in lay('bridges.geojson', 'bridges'):
        g = explicit.get(i)
        basis = 'explicit'
        if g is None and xy:
            if in_borough(*xy):
                sg = street_group(*xy)
                g, basis = ('town-mills-bridges', 'bridge (specialised group)')
            else:
                g, basis = 'town-mills-bridges', 'bridge (specialised group)'
        if g is None:
            g, basis = 'town-mills-bridges', 'bridge without position'
        members[g]['bridges'].append(i)
        why[i] = basis
    for i, xy in lay('railways.geojson', 'railways'):
        g = explicit.get(i) or 'town-railroad'
        members[g]['railways'].append(i)
        why[i] = 'explicit' if i in explicit else 'railway (specialised group)'
    try:   # railway records with no geometry (a post-1863 line)
        for it in jl(os.path.join(BASE, 'roads-rail-water', 'railways_no_geometry.json')):
            g = explicit.get(it['id']) or 'town-railroad'
            members[g]['railways'].append(it['id'])
            why[it['id']] = 'railway record with no geometry (specialised group)'
    except FileNotFoundError:
        pass
    for fn, key in (('roads.geojson', 'roads'), ('lanes.geojson', 'lanes'), ('fences.geojson', 'fences')):
        for i, xy in lay(fn, key):
            if i in explicit:
                g, basis = explicit[i], 'explicit'
            elif xy is None:
                unassigned.append((i, key, 'no geometry'))
                continue
            elif in_borough(*xy):
                sg = street_group(*xy)
                g, basis = (sg[0], 'street axis %s at %s m' % (sg[1], sg[2])) if sg else ('street-middle-high-lanes', 'inside the borough grid, off every axis')
            else:
                d, n, g = nearest(xy[0], xy[1], anc)
                basis = 'nearest anchor %s at %d m' % (n, round(d))
                g = g
            members[g][key].append(i)
            why[i] = basis
    # lanes with no traced line (inventory only)
    try:
        li = jl(os.path.join(BASE, 'roads-rail-water', 'lanes_inventory.json'))
        arr = li if isinstance(li, list) else li.get('lanes') or li.get('items') or []
        for it in arr:
            i = it.get('id') or it.get('lane_id')
            if i and not any(i in m['lanes'] for m in members.values()):
                members['street-middle-high-lanes']['lanes'].append(i)
                why[i] = 'lane inventory entry with no traced line: named in a text, placed by the pass'
    except Exception:
        pass

    # ---- hospitals: linked to the group of the first host record
    rec_group = {}
    for g, m in members.items():
        for r in m['records']:
            rec_group[r] = g
    for pid, gg in TG.PART_GROUP.items():
        pass
    hosp_unlinked = []
    for h in hosp['hospitals'] if isinstance(hosp, dict) and 'hospitals' in hosp else hosp:
        sids = h.get('structure_ids') or []
        gs = []
        for s in sids:
            base = s.split('#')[0]
            if s in TG.PART_GROUP.get(base, {}):
                gs.append(TG.PART_GROUP[base][s])
            if base in rec_group:
                gs.append(rec_group[base])
            for pid, parts in TG.PART_GROUP.items():
                if base == pid:
                    gs.extend(parts.values())
        if gs:
            members[gs[0]]['hospitals'].append(h['id'])
        else:
            hosp_unlinked.append(h['id'])

    # ---- photographs by group
    ph_by = {}
    for g in TG.GROUP_DEFS:
        ph_by[g['id']] = list(g.get('photos', []))
    known = {p['loc_id'] for p in reg}
    bad_ph = sorted({x for g in TG.GROUP_DEFS for x in g.get('photos', []) if x not in known})

    # ---- counts
    def drawn_class(i):
        d = feat_dec.get(i)
        if not d:
            return 'not in the product inventory'
        if d['decision'] == 'drawn':
            return d['group']
        if d['decision'] == 'marker':
            return 'marker'
        return 'not drawn: ' + d['group']
    groups = []
    for gd in TG.GROUP_DEFS:
        m = members[gd['id']]
        for k in m:
            m[k] = sorted(set(m[k]))
        cnt = {'building_records': len(m['records']), 'record_parts': len(m['record_parts']), 'basemap_structures': len(m['basemap_structures'])}
        by = {}
        for i in m['basemap_structures']:
            c = drawn_class(i)
            by[c] = by.get(c, 0) + 1
        cnt['basemap_structures_by_product_state'] = dict(sorted(by.items()))
        cnt['outside_loaded_ground'] = sum(1 for i in m['basemap_structures'] if (feat_dec.get(i) or {}).get('group') == 'outside')
        cnt['curated_farm_and_named'] = sum(1 for i in m['basemap_structures'] if (feat_dec.get(i) or {}).get('group') in ('footprint', 'point') and not str(i).startswith('STR-MAPSYM'))
        cnt['map_symbols'] = sum(1 for i in m['basemap_structures'] if str(i).startswith('STR-MAPSYM'))
        cnt['borough_masses'] = sum(1 for i in m['basemap_structures'] if str(i).startswith('STR-BORO-MASS'))
        for k in ('bridges', 'railways', 'fences', 'roads', 'lanes', 'hospitals', 'other_records'):
            cnt[k] = len(m[k])
        cnt['photographs_to_read'] = len(gd.get('photos', []))
        cnt['far_from_every_anchor'] = sum(1 for i in m['basemap_structures'] if i in far)
        d = {k: gd[k] for k in ('id', 'title', 'prefix', 'kind', 'scope', 'targets', 'sources', 'queries', 'photos', 'issues')}
        d['twn_id_format'] = 'TWN-%s-NNNN' % gd['prefix']
        d['anchors'] = TG.AREA_ANCHORS.get(gd['id'], [])
        d['counts'] = cnt
        d['members'] = m
        groups.append(d)

    tot = {
        'groups': len(groups),
        'building_records_assigned': sum(len(m['records']) for m in members.values()),
        'record_parts_assigned': sum(len(m['record_parts']) for m in members.values()),
        'basemap_structures_assigned': sum(len(m['basemap_structures']) for m in members.values()),
        'basemap_structures_total': len(geo),
        'bridges': sum(len(m['bridges']) for m in members.values()), 'railways': sum(len(m['railways']) for m in members.values()),
        'fences': sum(len(m['fences']) for m in members.values()), 'roads': sum(len(m['roads']) for m in members.values()),
        'lanes': sum(len(m['lanes']) for m in members.values()), 'hospitals_linked': sum(len(m['hospitals']) for m in members.values()),
        'hospitals_without_building': sorted(hosp_unlinked), 'records_in_structures_json': len(S),
        'unassigned_records': len([u for u in unassigned if u[1] not in ('basemap structure', 'roads', 'lanes', 'fences')]),
    }
    doc = {
        '_doc': 'The 21 groups of the town and buildings evidence pass (OA10) with the structures each one works. Generated by tools/bt/town/assign_groups.py from '
                'tools/bt/town/town_groups.py and the repository data; edit those, not this file. A building is worked in exactly one group: its primary group. '
                'Cross-references are in the evidence rows (field `see_also`).',
        'assignment_rule': ['an id in `explicit` of town_groups.py goes to that group', 'a borough mass or a point inside the borough grid goes to the street group of the nearest street axis within 45 m, else the lanes group',
                            'a structure outside the borough goes to the area group of the nearest anchor (a gazetteer place or a curated farm key), whatever the distance (flag far_from_every_anchor when over 1500 m)',
                            'a building with a specialised group (church, college, seminary, railroad, tavern or hotel, mill or bridge, cemetery, public building) is worked there'],
        'street_axes': {k: {'kind': v['kind'], 'through_utm18n': v['p'], 'group': v['group']} for k, v in TG.STREET_AXES.items()},
        'street_axes_basis': 'eight street junctions of the Hopkins 1858 borough inset, docs/basemap1863/maps/gcps/hopkins_inset.json (fit 1.9 m, leave-one-out 2.9 m); the axes are straight lines through them, extended; a rule for grouping, not a survey',
        'totals': tot,
        'groups_list': groups,
        'not_worked_here': [{'id': i, 'kind': k, 'reason': r} for i, k, r in sorted(unassigned)],
        'photographs_not_in_the_ledger': bad_ph,
        'far_from_every_anchor': dict(sorted(far.items())),
        'basis_of_assignment': dict(sorted(why.items())),
    }
    # every source id named by a group is a row of the ledger
    ledger = os.path.join(BT, 'town', 'SOURCES.md')
    if os.path.exists(ledger):
        sys.path.insert(0, HERE)
        import validate_evidence as V
        led = V.parse_ledger(ledger)
        missing = sorted({(g['id'], x) for g in groups for x in g['sources'] if x not in led})
        if missing:
            raise SystemExit('source ids of groups that are not rows of SOURCES.md: %s' % missing)
    text = json.dumps(doc, indent=1, ensure_ascii=False, sort_keys=False) + '\n'
    if check:
        cur = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        if cur != text:
            print('groups.json differs from what the data give: rerun tools/bt/town/assign_groups.py')
            sys.exit(1)
        print('groups.json is current')
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(text)
    print('wrote', os.path.relpath(OUT, ROOT))
    print('groups', tot['groups'], '| records', tot['building_records_assigned'], '+ parts', tot['record_parts_assigned'], '| basemap structures',
          tot['basemap_structures_assigned'], 'of', tot['basemap_structures_total'], '| bridges', tot['bridges'], 'railways', tot['railways'], 'fences', tot['fences'],
          'roads', tot['roads'], 'lanes', tot['lanes'], '| hospitals linked', tot['hospitals_linked'])
    for g in groups:
        c = g['counts']
        print('%-42s rec %2d part %d struct %3d (masses %3d symbols %3d named %2d outside %3d) br %d rl %d fen %3d rd %2d ln %2d h %d' % (
            g['id'], c['building_records'], c['record_parts'], c['basemap_structures'], c['borough_masses'], c['map_symbols'], c['curated_farm_and_named'],
            c['outside_loaded_ground'], c['bridges'], c['railways'], c['fences'], c['roads'], c['lanes'], c['hospitals']))
    if bad_ph:
        print('photographs not in the ledger:', bad_ph)


def self_test():
    ax = TG.STREET_AXES['Baltimore']
    assert dist_to_axis(309075.4, 4411242.0, ax) < 0.01
    assert dist_to_axis(309075.4 + 30, 4411242.0, ax) is not None and 29.5 < dist_to_axis(309075.4 + 30, 4411242.0, ax) < 30.1
    assert dist_to_axis(309075.4, 4412500.0, ax) is None
    assert street_group(309078 + 10, 4411000)[1] == 'Baltimore'
    assert street_group(308884, 4411000)[1] == 'Washington'
    assert street_group(309000, 4411371)[1] == 'Chambersburg'
    assert street_group(309200, 4411371)[1] == 'York'
    assert street_group(309078, 4411600)[1] == 'Carlisle'
    assert street_group(309000, 4411500 + 400) is None
    assert in_borough(309078, 4411371) and not in_borough(300000, 4411371)
    ids = [g['id'] for g in TG.GROUP_DEFS]
    assert len(ids) == len(set(ids)) == 21
    for g, lst in TG.EXPLICIT.items():
        assert g in ids, g
    flat = [i for lst in TG.EXPLICIT.values() for i in lst]
    assert len(flat) == len(set(flat)), [i for i in flat if flat.count(i) > 1]
    print('assign_groups self-test ok')


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        self_test()
    else:
        main(check='--check' in sys.argv)
