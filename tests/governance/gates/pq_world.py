"""A small, complete world for the tests of the Q02, Q19 and Q23 runners: a scratch repository whose data, texts, register and code satisfy every check that the runners make
(so that the clean world gives no FAIL), plus the helpers that run a runner against it. A test copies the world, injects one defect and asks the runner to find it (GATE-SPEC U-25).

The world has: a page that loads app/data/things.json (the census), a datum registry of four classes (layer units, layer kit items, a claim ledger, the things file), a layer dump as
q02_layer.mjs would write it, a Source Manifest with recorded independence, a stored source text, a register with one open entry, conflicts with their delegated defaults, and content classes
with the code the marks are found in.
"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pq_fixtures as fx  # noqa: E402

BT = 'docs/battle-theatre/'
GOV = BT + 'GOVERNANCE/'
TEXT = 'A story of 1863. The quick brown fox jumps over the lazy dog at noon. Another sentence follows here, with eleven soldiers and a flag.\n'
QUOTE = 'the quick brown fox jumps over the lazy dog'


def rec(id, tier, sources=(), **kw):
    d = {'id': id, 'tier': tier, 'sources': list(sources), 'basis': None, 'reasoning': None, 'procedural': None, 'register_ids': [], 'render_flag': None, 'quote': None, 'claim_ids': [], 'weak_source': None, 'extra': {}}
    d.update(kw)
    return d


PROC = {'generator': 'gen v1', 'seed': 1863, 'distribution': 'uniform over the printed range', 'documented_context': 'the regiment was on the field', 'substitute': None}


def manifest_entry(key, **kw):
    d = {'key': key, 'kind': 'primary', 'weak': False, 'label': key, 'citation': 'c', 'date_written': '1864', 'rights': 'public domain', 'reliability_tier': 1, 'independent_of': [], 'derived_from': None, 'type': 'primary-document'}
    d.update(kw)
    return d


def layer_dump():
    return {'schema': 'bt-q02-layer-dump/1', 'layer': {'units': 2}, 'counts': {}, 'contract': {},
            'manifest': [manifest_entry('SRC-A'), manifest_entry('SRC-B'), manifest_entry('LEAD-1', kind='lead', type='encyclopedia-lead')],
            'classes': {
                'layer.units': [rec('unit:u1', 'documented', ['SRC-A', 'SRC-B'], quote=QUOTE, register_ids=['EG-0001']), rec('unit:u2', 'plausible-procedural', ['SRC-A'], procedural=dict(PROC), register_ids=['EG-0001'])],
                'layer.kit_items': [rec('kit:u1:0', 'documented', ['SRC-A'], quote=QUOTE, extra={'valid_from': '1863-06-26', 'valid_to': '1863-07-14'})],
            }}


def world():
    w = {
        BT + 'app/src/config.mjs': "export const URLS = {\n  app: new URL('../', here).href,\n  data: new URL('../data/', here).href,\n  gov: new URL('../../GOVERNANCE/', here).href,\n};\n",
        BT + 'app/src/data.mjs': "import { URLS } from './config.mjs';\nexport const load = () => fetch(URLS.data + 'things.json');\n",
        BT + 'app/src/overlay.mjs': "// marks\nconst S = TIER_STYLE[tier]; // single source flag shown\n",
        BT + 'app/data/things.json': {'things': [
            {'id': 'T1', 'tier': 'documented', 'sources': ['SRC-A', 'SRC-B'], 'quote': QUOTE, 'claim_text': 'a fox jumps over a dog'},
            {'id': 'T2', 'tier': 'inferred', 'sources': ['SRC-A'], 'reasoning': 'T1 shows the fox at noon', 'claims': ['C1']},
            {'id': 'T3', 'tier': 'plausible-procedural', 'sources': [], 'procedural': dict(PROC), 'register': 'EG-0001'},
            {'id': 'T4', 'tier': 'open gap', 'sources': [], 'register': 'EG-0001'}]},
        BT + 'history/positions/positions_A.jsonl': [{'claim_id': 'C1', 'tier': 'documented', 'render_flag': 0, 'weak_source': False, 'flag_single_source': True, 'activity': 'a fox jumps over a dog',
                                              'source': {'report_id': 'SRC-A', 'printed_page': '1', 'quote': QUOTE}}],
        GOV + 'library/acquired_2.json': {'items': [{'id': 'SRC-A', 'local_path': 'tmp/library/src-a.txt', 'sha256': 'x'}]},
        'tmp/library/src-a.txt': TEXT,
        GOV + 'register_index.json': [{'id': 'EG-0001', 'status': 'open', 'tier': 'plausible-procedural', 'marking': 'tier glyph 2', 'searched': 'the Official Records were searched'}],
        GOV + 'register/EG-0001.md': '# EG-0001\n\n| Field | Content |\n|---|---|\n| ID | EG-0001 |\n| Confidence tier | plausible-procedural |\n| Product marking | tier glyph 2 |\n| Status | open |\n',
        GOV + 'conflicts_structured.json': {'conflicts': [{'id': 'C-001', 'topic': 'time', 'values': [{'label': 'noon (SRC-A)'}, {'label': 'one o\'clock (SRC-B)'}], 'pdf_recommended_default': 'noon', 'selectable_alternatives': ['all']}]},
        BT + 'app/data/conflict-defaults.json': {'label': 'Default chosen under delegated authority, reversible by the owner', 'conflicts': {'C-001': {'default_scenario_id': 'v0', 'tier': 'inferred', 'source': ['SRC-A']}}},
        BT + 'app/data/claim-dispositions.json': {'rows': [['C1', 'A', 'u1', 'march', 'placed', '', '', '']]},
        GOV + 'claim_ledger.json': {'claims': []},
        'fixture/layer.json': layer_dump(),
        'fixture/names.json': {},
        'fixture/datum_classes.json': {'schema': 'bt-datum-classes/1', 'classes': [
            {'id': 't.units', 'label': 'units', 'source': {'kind': 'layer', 'class': 'layer.units'}, 'files': [], 'visible': True},
            {'id': 't.kit', 'label': 'kit items', 'source': {'kind': 'layer', 'class': 'layer.kit_items'}, 'files': [], 'visible': True, 'validity': 'kit'},
            {'id': 't.claims', 'label': 'claim ledger', 'source': {'kind': 'jsonl', 'files': [BT + 'history/positions/positions_A.jsonl'], 'id_field': 'claim_id'}, 'files': [], 'visible': True, 'claims': True},
            {'id': 't.things', 'label': 'things', 'source': {'kind': 'json', 'file': BT + 'app/data/things.json', 'members': 'things[]'}, 'files': [BT + 'app/data/things.json'], 'visible': True}]},
        'fixture/content_classes.json': {'schema': 'bt-content-classes/1', 'spec_list': ['units', 'things'], 'non_content': {'ui/': 'chrome'}, 'classes': [
            {'id': 'units', 'label': 'units', 'spec_names': ['units'], 'modules': ['overlay.mjs'], 'datum_classes': ['t.units', 't.kit'], 'present': True, 'node_checks': ['overlay_units'],
             'mark_evidence': [{'file': BT + 'app/src/overlay.mjs', 'patterns': ['TIER_STYLE[tier]'], 'what': 'the overlay draws the tier'}]},
            {'id': 'things', 'label': 'things', 'spec_names': ['things'], 'modules': ['data.mjs'], 'datum_classes': ['t.things', 't.claims'], 'present': True, 'node_checks': [],
             'mark_evidence': [{'file': BT + 'app/src/overlay.mjs', 'patterns': ['single source flag shown'], 'what': 'the flag is shown'}]}]},
        'fixture/app_result.json': app_result(),
    }
    return copy.deepcopy(w)


def app_result():
    tiers = {'documented': {'glyph': 'circle', 'dash': [], 'color': '#6fcf97', 'label': 'Documented'}, 'inferred': {'glyph': 'diamond', 'dash': [7, 4], 'color': '#e0b250', 'label': 'Inferred'},
             'plausible-procedural': {'glyph': 'triangle', 'dash': [2, 4], 'color': '#b79cf2', 'label': 'Plausible-procedural'}, 'open gap': {'glyph': 'square', 'dash': [10, 3, 2, 3], 'color': '#ef7d6b', 'label': 'Open gap'}}
    return {'errors': [], 'style': {'tiers': tiers, 'problems': []}, 'hooks': {'problems': [], 'facts': {}}, 'tier_names': {},
            'overlay_units': {'units': 2, 'modes': {'glyph': {'drawn': 2, 'paths': 2, 'problems': [], 'problem_count': 0}, 'footprint': {'drawn': 2, 'paths': 2, 'problems': [], 'problem_count': 0}}},
            'overlay_objects': {'objects': 0, 'per': [], 'problems': [], 'colour_only': [], 'colour_only_count': 0},
            'audio': {'mode': 'panel-only', 'decision': 'DEC-001', 'decisionStatus': 'x', 'panel_rows': 5, 'disclosure': 'x', 'problems': []}}


def paths(s):
    return ['--registry', os.path.join(s.root, 'fixture', 'datum_classes.json'), '--layer-dump', os.path.join(s.root, 'fixture', 'layer.json'), '--tier-names', os.path.join(s.root, 'fixture', 'names.json')]


def get(world, rel):
    return world[rel]


def things(w):
    return w[BT + 'app/data/things.json']['things']


def layer(w):
    return w['fixture/layer.json']


def manifest(w, key):
    return next(m for m in w['fixture/layer.json']['manifest'] if m['key'] == key)


def world19():
    """The clean world of the Q19 runner: every visible datum links to the ledger claim C1, has two independent sources or a flag that the product shows and a register entry for the second source."""
    w = world()
    for r in layer(w)['classes']['layer.units'] + layer(w)['classes']['layer.kit_items']:
        r['claim_ids'] = ['C1']
        if len(r['sources']) < 2:
            r['sources'] = ['SRC-A', 'SRC-B']
        r['register_ids'] = ['EG-0001']
    for t in things(w):
        t['claims'] = ['C1']
        t['register'] = 'EG-0001'
    things(w)[0]['sources'] = ['SRC-A', 'SRC-B']
    w[BT + 'history/positions/positions_A.jsonl'][0]['register'] = 'EG-0001'
    w[BT + 'app/src/ui.mjs'] = "// the card says: single source\n"
    return w


def paths19(s):
    return ['--registry', os.path.join(s.root, 'fixture', 'datum_classes.json'), '--content-classes', os.path.join(s.root, 'fixture', 'content_classes.json'),
            '--layer-dump', os.path.join(s.root, 'fixture', 'layer.json'), '--tier-names', os.path.join(s.root, 'fixture', 'names.json')]


def world23():
    """The clean world of the Q23 runner: every member carries a tier the product reads, the code shows the marks, the register entries and asset manifests carry their marks. Only the picture parts (frames, night) are not run."""
    w = world()
    w[BT + 'app/src/overlay.mjs'] = "// marks\nconst S = TIER_STYLE[tier]; // single source flag shown\nexport class O { draw(tMin, opts) { for (const individual of []) {} if (!st.present[i]) continue; } ring(c, i) {} }\n"
    w[BT + 'app/data/audio3d/sources.json'] = {'sources': [{'ledgerId': 'A1', 'licence': 'CC0 1.0', 'sourceUrl': 'https://freesound.org/x', 'howRecorded': 'a modern recording of a musket', 'caveats': 'modern reconstruction: not period', 'shippable': True}]}
    w[BT + 'app/data/anim3d/gait-sources.json'] = {'bases': {'modern_range': {'tier': 'plausible-procedural', 'label': 'modern equestrian ranges', 'src': []}, 'wheeler_1863': {'tier': 'documented', 'label': 'Wheeler 1863', 'src': ['GS-W']}}}
    w[BT + 'app/data/figures3d/TIERS.json'] = {'choices': [{'id': 'F-1', 'tier': 'plausible-procedural', 'mark': 'tier overlay'}, {'id': 'F-2', 'tier': 'inferred', 'mark': 'none (internal)'}, {'id': 'F-3', 'tier': 'documented', 'mark': 'none'}]}
    idx = w[GOV + 'register_index.json']
    for i, (eid, title) in enumerate((('EG-0002', 'audio and sound substitutes'), ('EG-0003', 'motion and animation clips'), ('EG-0004', 'textures and models of the figures'))):
        idx.append({'id': eid, 'status': 'open', 'tier': 'plausible-procedural', 'title': title, 'desc': title, 'marking': 'tier glyph 2', 'searched': 'searched'})
        w[GOV + 'register/%s.md' % eid] = '# %s\n\n| Field | Content |\n|---|---|\n| ID | %s |\n| Confidence tier | plausible-procedural |\n| Product marking | tier glyph 2 |\n| Status | open |\n' % (eid, eid)
    return w


def paths23(s):
    return ['--registry', os.path.join(s.root, 'fixture', 'datum_classes.json'), '--content-classes', os.path.join(s.root, 'fixture', 'content_classes.json'),
            '--layer-dump', os.path.join(s.root, 'fixture', 'layer.json'), '--app-result', os.path.join(s.root, 'fixture', 'app_result.json')]
