"""Scratch repositories for the negative controls of the Q03 runner (tools/bt/gates/q03_anachronism.py, q03_structures.py, q03_scene.mjs).

A `World` is a scratch repository with the layout the runner reads. The kit, the structure records, the schedule, the terrain source catalogue and the roster are COPIES of the real data (so the checks run on
the real shapes and the real validator), the drawn objects, the basemap registry, the register and the requirement rows are small hand-made files, and the dump of the node child is made here in python from the
reference engine of tools/bt/check_structures.py (the app's own test shows that the JS port equals it). Every part can be edited before `write()`; a test injects exactly one defect and asks the runner to find it.
"""
import copy
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(REPO, 'docs', 'battle-theatre')
GATES_DIR = os.environ.get('GATES_DIR') or os.path.join(REPO, 'tools', 'bt', 'gates')
for _p in (os.path.join(REPO, 'tools', 'bt'), os.path.join(REPO, 'tools', 'bt', 'gates'), os.path.join(REPO, 'tools', 'bt', 'gates', 'lib')):
    if _p not in sys.path:
        sys.path.insert(0, _p)

KIT_FILES = ('kit_specs.json', 'weapons.json', 'artillery_batteries.json', 'cavalry_units.json')
STRUCT_FILES = ('structures.json', 'state_schedule.json', 'works_stages.json', 'hospitals.json')
HISTORY_FILES = ('units.json', 'arrivals.json', 'not_on_field.json')
SCENE_DATES = ['1863-06-%02d' % d for d in range(26, 31)] + ['1863-07-%02d' % d for d in range(1, 15)] + ['1863-11-18', '1863-11-19']
_CACHE = {}


def real(rel):
    """The real file, parsed once (a copy is returned)."""
    if rel not in _CACHE:
        with open(os.path.join(BT, *rel.split('/')), encoding='utf-8') as f:
            _CACHE[rel] = json.load(f)
    return copy.deepcopy(_CACHE[rel])


def complete_entry(eid, status='open', **over):
    e = {'id': eid, 'title': 'entry %s' % eid, 'rids': ['R10'], 'cat': 'evidence missing', 'desc': 'what is open', 'why': 'no source', 'searched': 'the acquired library', 'subst': 'reconstruction', 'recon': 'seeded draw',
         'tier': 'plausible-procedural', 'competing': '-', 'marking': 'glyph 2', 'impact': 'unit', 'owner_q': 'Which reading?', 'rec': 'keep both', 'status': status}
    e.update(over)
    return e


def sha(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:24]


class World:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='btq03-')
        self.root = os.path.join(self.dir, 'repo')
        self.out = os.path.join(self.dir, 'out')
        os.makedirs(self.root)
        os.makedirs(self.out)
        self.bt = os.path.join(self.root, 'docs', 'battle-theatre')
        self.kit = {n: real('kit/' + n) for n in KIT_FILES}
        self.struct = {n: real('structures/' + n) for n in STRUCT_FILES}
        self.history = {n: real('history/' + n) for n in HISTORY_FILES}
        self.conflicts = real('GOVERNANCE/conflicts_structured.json')
        self.terrain_sources = real('terrain/terrain_sources.json')
        self.flags_map = {'flags': {
            'DISPUTED_FLAGGED': {'by_dispute': {'DISP-140NY-DRESS': ['EG-9001'], 'DISP-BERDAN-GREEN-BLUE': ['EG-9002']}},
            'FLAG_BADGE_UNRESOLVED': {'register_ids': ['EG-9003']}, 'FLAG_KEPI_PRIVATE_PURCHASE': {'register_ids': ['EG-9004']},
            'FLAG_WHITWORTH_EXCEPTION': {'register_ids': ['EG-9004']}, 'FLAG_SPENCER_DISPUTED_WINDOW': {'register_ids': ['EG-9004']}}}
        self.register = [complete_entry('EG-%d' % n) for n in (9001, 9002, 9003, 9004)]
        self.register_files = {e['id'] for e in self.register}
        self.requirements = {'sub_requirements': [{'id': i, 'gate_ids': ['Q03']} for i in ('R04.0000', 'R10.0000', 'R17.0000', 'R02.0000', 'R13.0000', 'R13.P-01', 'R13.P-02', 'R13.bld-schmucker-hall')]}
        # drawn objects and the registry of the basemap
        self.d3 = {'meta': {}, 'buildings': [], 'points': [], 'fences': [], 'roads': [], 'notDrawn': []}
        self.registry = {}
        self.add_building('STR-TOWN-SCHMUCKER_HALL', 'Schmucker Hall', rec='bld-schmucker-hall', built='1832', status='survives', represents='present building outline, taken as the 1863 building')
        self.add_road('RD-001', 'Baltimore Pike', note='macadamized turnpike in July 1863')
        self.add_fence('FN-0001', rec='FEN-emmitsburg-road')
        self.artillery_train = {'vehicles': {'limber': self.vehicle(), 'caisson': self.vehicle(), 'battery_wagon': self.vehicle(), 'forge': self.vehicle()}}
        self.config = "export const GROUND_NOTE = 'The ground is the 1863 landscape as audited (see the ground audit).';\n"
        self.card = "const flags = Object.entries(s.flags).map(([f, n]) => `${f} (${n})`).join('; ');\n"
        self.ground = {'aerial.jpg': b'AERIAL-corrected', 'height.bin': b'HEIGHT-corrected', 'terrain.json': b'{}'}
        self.audit = None            # a dict written to GOVERNANCE/ground_audit/audit.json, or None
        self.export = None
        self.dump = None
        self.extra_files = {}

    # ----------------------------------------------------------------------------------------- hand-made data
    @staticmethod
    def vehicle(vf='1863-01-01', vt='1865-12-31', army='both'):
        return {'tier': 'inferred', 'basis': 'PDF B.6.14.4', 'valid_from': vf, 'valid_to': vt, 'army': army}

    def add_building(self, sid, name, rec=None, built=None, status='survives', represents='present building outline, taken as the 1863 building', note='', kind='footprint', part=None, present=True, subtype='house', state_id='same'):
        state_id = rec if state_id == 'same' else state_id
        self.d3['buildings'].append({'id': sid, 'name': name, 'subtype': subtype, 'err': 4, 'conf': 'Estimated', 'gk': 'footprint_2023_outline' if kind == 'footprint' else 'map_ink_mass', 'represents': represents, 'status': status, 'built': built,
                                     'src': ['NPS'], 'rec': rec, 'part': part, 'state_id': state_id, 'notes': note, 'present': True, 'tier': 'inferred', 'kind': kind, 'ring': [[-77.2, 39.8], [-77.2, 39.81], [-77.21, 39.81], [-77.2, 39.8]]})
        self.registry[sid] = {'id': sid, 'present_1863': present, 'period_note': note if kind == 'mass' else '', 'built': built, 'status': status, 'geometry_represents': represents, 'subtype': subtype}

    def add_road(self, sid, name, note='macadamized turnpike in July 1863', present=True):
        self.d3['roads'].append({'id': sid, 'cls': 'road', 'name': name, 'subtype': 'turnpike', 'surface': 'macadam', 'err': 22, 'conf': 'Estimated', 'lines': [[[-77.2, 39.8], [-77.21, 39.81]]], 'src': ['NPS'], 'period_note': note, 'tier': 'inferred'})
        self.registry[sid] = {'id': sid, 'present_1863': present, 'period_note': note, 'subtype': 'turnpike', 'name': name}

    def add_fence(self, sid, rec=None, note='A continuous drawn line lies along this mapped fence.', present=True):
        self.d3['fences'].append({'id': sid, 'way': 1, 'style': 'rail', 'recStyle': None, 'coords': [[-77.2, 39.8], [-77.21, 39.81]], 'err': 25, 'conf': 'Estimated', 'check': {'verdict': 'confirmed'}, 'src': ['OSM'], 'len_m': 100, 'rec': ({'id': rec} if rec else None), 'tier': 'inferred'})
        self.registry[sid] = {'id': sid, 'present_1863': present, 'period_note': note, 'notes': ''}

    # ----------------------------------------------------------------------------------------- the dump of the node child, made from the reference engine
    def make_dump(self, mutate=None):
        import check_structures as CS
        CS.DIR = os.path.join(self.bt, 'structures')
        CS._data.cache_clear()
        d = CS._data()
        sched_rows = d['sched']['rows']
        ids = sorted({s['id'] for s in d['structures']['structures']} | {p['id'] for s in d['structures']['structures'] for p in s.get('parts', [])} | {h['id'] for h in d['hosp']['hospitals']})
        rows_of = {i: sorted(r['id'] for r in sched_rows if i in r['object_ids']) for i in ids}
        known = {i: True for i in ids}
        scen = {i: CS.scenarios_for(i) for i in ids}
        asked = {}
        for k in ('buildings', 'points', 'fences', 'roads'):
            for o in self.d3.get(k, []):
                for key in (o.get('rec') if isinstance(o.get('rec'), str) else (o.get('rec') or {}).get('id'), o.get('state_id')):
                    if key:
                        asked[key] = key.split('#')[0] in {i.split('#')[0] for i in ids} or key in ids
                        rows_of.setdefault(key, sorted(r['id'] for r in sched_rows if key in r['object_ids']))
        pre = sorted(s['id'] for s in d['structures']['structures'] if s.get('kind') == 'preexisting_wall_or_fence')
        reg = [i for i in ('bld-mcpherson-farm', 'bld-mcpherson-farm#house', 'bld-mcpherson-farm#barn', 'bld-bliss-farm', 'bld-bliss-farm#house', 'bld-bliss-farm#barn', 'RD-avenues', 'FEN-emmitsburg-road') if i in ids]
        t0 = datetime.datetime(1863, 6, 26)
        times = set()
        for a, b in ((datetime.datetime(1863, 6, 26), datetime.datetime(1863, 7, 14, 23, 59)), (datetime.datetime(1863, 11, 18), datetime.datetime(1863, 11, 19, 23, 59))):
            t = a
            while t <= b:
                times.add(t)
                t += datetime.timedelta(minutes=30)
        for r in sched_rows:
            t = r['time']
            for w in [t.get('window'), t.get('begin'), t.get('finish')] + [x for sc in (r.get('scenarios') or {}).values() for x in (sc.get('window'), sc.get('begin'), sc.get('finish'))]:
                for x in w or []:
                    if x:
                        m = datetime.datetime.fromisoformat(x)
                        for dm in (-1, 0, 1):
                            times.add(m + datetime.timedelta(minutes=dm))
        times = sorted(x for x in times if (datetime.datetime(1863, 6, 26) <= x <= datetime.datetime(1863, 7, 14, 23, 59)) or (datetime.datetime(1863, 11, 18) <= x <= datetime.datetime(1863, 11, 19, 23, 59)))
        series = {}
        for i in pre + reg:
            series[i] = {}
            for sc in scen[i]:
                runs, last = [], None
                for t in times:
                    r = CS.state_at(i, t.isoformat(timespec='minutes'), sc)
                    sig = json.dumps([r['state'], r['status'], r.get('present'), r.get('stage'), None if r.get('progress') is None else round(r['progress'], 3)])
                    if sig != last:
                        runs.append({'iso': t.strftime('%Y-%m-%dT%H:%M'), 's': 0, 'state': r['state'], 'status': r['status'], 'present': r.get('present'), 'stage': r.get('stage'), 'progress': r.get('progress'), 'rows': r.get('rows') or []})
                        last = sig
                series[i][sc] = runs
        objects = []
        for k, cls in (('buildings', 'buildings'), ('points', 'markers'), ('fences', 'fences'), ('roads', 'roads')):
            for o in self.d3.get(k, []):
                c = 'masses' if (k == 'buildings' and o.get('kind') == 'mass') else cls
                rc = o.get('rec')
                rc = rc.get('id') if isinstance(rc, dict) else rc
                objects.append({'oid': len(objects), 'id': o['id'], 'cls': c, 'name': o.get('name') or o['id'], 'tier': o.get('tier'), 'state_id': o.get('state_id') or None, 'rec': rc, 'part': o.get('part'), 'dropped': False,
                                'geometry': {'kind': o.get('gk'), 'represents': o.get('represents')}, 'meta': {'subtype': o.get('subtype'), 'built': o.get('built'), 'status': o.get('status'), 'kind': o.get('kind')}})
        dump = {
            'schema': 'q03-scene-dump/1', 'errors': [], 'sections': {}, 'scene_dates': SCENE_DATES,
            'flags': {'us_stars': 34, 'flag_evidence_us_stars': 34, 'anv_scenarios': {'pdf_p70': 12, 'nps': 13}, 'anv_default': 'nps', 'star_function': 'flagPattern(kind, state = \'intact\', W = 256, Hh = 192, opts = {})', 'star_count_takes_a_date': False,
                      'patterns': {k: {'ok': True} for k in ('us_national', 'us_regimental_gap', 'irish_green_gap', 'anv_battle', 'cav_guidon', 'ambulance_gap')}, 'anv_patterns': {'pdf_p70': {'ok': True}, 'nps': {'ok': True}},
                      'statutory': {dte: (34 if dte <= '1863-07-03' else 35) for dte in SCENE_DATES}, 'statutory_source': 'unionStarsOn of src/figures3d/evidence.mjs'},
            'engine': {'ids': len(ids), 'known': known, 'rows': rows_of, 'scenarios': scen, 'asked_known': asked, 'preexisting': pre, 'regression_ids': reg, 'series': series, 'times': len(times)},
            'model': {'counts': {'objects': len(objects)}, 'classes': ['roads', 'fences', 'buildings', 'masses', 'markers'], 'objects': objects, 'vis_runs': {}, 'vis_times': 0},
            'ext': {'layer': {'id': 'later-memorials', 'defaultOn': False, 'inScene': False, 'tier': 'inferred'}, 'minutes_checked': 30240, 'scene_objects_nonempty': [], 'memorials': {'ok': True, 'problems': [], 'facts': {'memorials': 512}}, 'tour': {'ok': True, 'problems': [], 'facts': {'stops': 16}}},
            'train': {'KIND': {'gun': 0, 'limber': 1, 'caisson': 2, 'wagon': 3, 'forge': 4, 'horse': 5, 'driver': 6}, 'times': ['1863-07-01T14:00', '1863-07-02T12:00', '1863-07-03T14:00'], 'batteries': 3,
                      'by_army': {a: {k: 6 for k in ('gun', 'limber', 'caisson', 'wagon', 'forge', 'horse', 'driver')} for a in ('union', 'confederate')}},
            'works3d': {'works': [], 'preexisting': [{'id': p, 'present': True, 'construction': False, 'progress': 1} for p in pre], 'pre_ids_in_works': []},
        }
        if mutate:
            mutate(dump)
        self.dump = dump
        return dump

    def make_export(self, units=(('us-1c-1d-meredith-2wi', 'US.2WI', 3, '1863-07-01'),), mutate=None):
        """The export of app/tools/export-figures.mjs for a few drawn units, with digests made by the reference generator (so the clean export agrees with it)."""
        import check_kit as CK
        import gen_golden_manifests as GG
        kit = CK.Kit(os.path.join(self.bt, 'kit'))
        GG.add_defaults(kit)
        out = []
        for hid, ku, n, date in units:
            ent = kit.units[ku]
            rec = {'id': hid, 'name': hid, 'side': 'union', 'arm': 'infantry', 'figures': n, 'kit_unit': ku, 'how': 'record', 'default': False, 'date': date, 'earliest_min': 0, 'earliest': '1 Jul 08:00',
                   'earliest_iso': date + 'T08:00', 'disputed': bool(ent.get('variants')), 'variants': list(ent['variants']) if ent.get('variants') else None, 'digest': None, 'variant_digests': {}}
            if ent.get('variants'):
                for v in ent['variants']:
                    rec['variant_digests'][v] = sha(''.join(sha(GG.canon(CK.manifest_for('%s:%04d' % (hid, k), ku, 1863, date=date, rank='private', role='rifleman', variant=v, kit=kit))) for k in range(n)))
            else:
                rec['digest'] = sha(''.join(sha(GG.canon(CK.manifest_for('%s:%04d' % (hid, k), ku, 1863, date=date, rank='private', role='rifleman', kit=kit))) for k in range(n)))
            out.append(rec)
        exp = {'seed': 1863, 'soldier_id': '<history unit id>:<index>', 'rank': 'private', 'role': 'rifleman', 'units': out, 'export_digest': 'x'}
        if mutate:
            mutate(exp)
        self.export = exp
        return exp

    # ----------------------------------------------------------------------------------------- writing and running
    def _w(self, rel, content, binary=False):
        p = os.path.join(self.root, *rel.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if binary or isinstance(content, bytes):
            with open(p, 'wb') as f:
                f.write(content)
        elif isinstance(content, str):
            with open(p, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
        else:
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False)

    def write(self):
        b = 'docs/battle-theatre/'
        for n, c in self.kit.items():
            self._w(b + 'kit/' + n, c)
        for n, c in self.struct.items():
            self._w(b + 'structures/' + n, c)
        for n, c in self.history.items():
            self._w(b + 'history/' + n, c)
        self._w(b + 'GOVERNANCE/conflicts_structured.json', self.conflicts)
        self._w(b + 'terrain/terrain_sources.json', self.terrain_sources)
        self._w(b + 'GOVERNANCE/requirements.json', self.requirements)
        self._w(b + 'GOVERNANCE/register_index.json', self.register)
        for e in self.register:
            if e['id'] in self.register_files:
                self._w(b + 'GOVERNANCE/register/%s.md' % e['id'], '# %s\n' % e['id'])
        self._w(b + 'app/data/structures3d.json', self.d3)
        self._w(b + 'app/data/artillery-train.json', self.artillery_train)
        self._w(b + 'app/src/config.mjs', self.config)
        self._w(b + 'app/src/ui/card-sections.mjs', self.card)
        for n, c in self.ground.items():
            self._w(b + 'render/prototype/data/' + n, c)
        # the basemap registry: one geojson per layer, each feature carrying its properties
        feats = {'structures/structures.geojson': [], 'roads-rail-water/fences.geojson': [], 'roads-rail-water/roads.geojson': [], 'roads-rail-water/lanes.geojson': [], 'roads-rail-water/railways.geojson': [], 'roads-rail-water/bridges.geojson': []}
        for k, o in self.registry.items():
            lay = 'structures/structures.geojson' if k.startswith('STR') else 'roads-rail-water/fences.geojson' if k.startswith('FN') else 'roads-rail-water/roads.geojson'
            feats[lay].append({'type': 'Feature', 'properties': o, 'geometry': None})
        for rel, fs in feats.items():
            self._w('docs/basemap1863/features/' + rel, {'type': 'FeatureCollection', 'features': fs})
        if self.audit is not None:
            self._w(b + 'GOVERNANCE/ground_audit/audit.json', self.audit)
        self._w('flags.json', self.flags_map)
        if self.dump is not None:
            self._w('dump.json', self.dump)
        if self.export is not None:
            self._w('export.json', self.export)
        for rel, c in self.extra_files.items():
            self._w(rel, c)
        return self

    def run(self, *args, timeout=900, units='^(US\\.2WI)$', with_dump=True, with_export=True, extra_env=None):
        """Write the world and run the runner on it. By default: the unit filter of the test (the verdict is then INCOMPLETE), no self-tests, the canned dump and export."""
        self.write()
        a = ['--flags-map', os.path.join(self.root, 'flags.json'), '--skip-selftests']
        if units:
            a += ['--units', units]
        if with_dump:
            if self.dump is None:
                self.make_dump()
                self.write()
            a += ['--scene-dump', os.path.join(self.root, 'dump.json')]
        if with_export:
            if self.export is None:
                self.make_export()
                self.write()
            a += ['--figures-export', os.path.join(self.root, 'export.json')]
        else:
            a += ['--skip-drawn']
        a += list(args)
        cmd = [sys.executable, os.path.join(GATES_DIR, 'q03_anachronism.py'), '--root', self.root, '--out', self.out, '--quiet'] + a
        e = dict(os.environ)
        e.pop('NODE_USE_ENV_PROXY', None)
        if extra_env:
            e.update(extra_env)
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=e, encoding='utf-8')
        rec = None
        fn = os.path.join(self.out, 'Q03.json')
        if os.path.isfile(fn):
            with open(fn, encoding='utf-8') as f:
                rec = json.load(f)
        return p.returncode, rec, p.stdout + p.stderr

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


def by_id(rec):
    return {i['id']: i for i in rec['items']}


def items_of(rec, prefix, result=None):
    return [i for i in rec['items'] if i['id'].startswith(prefix) and (result is None or i['result'] == result)]
