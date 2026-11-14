#!/usr/bin/env python3
"""Merge docs/plan/STATUS/items-A.json and items-B.json into STATUS.md and backlog.json.

    python3 docs/plan/STATUS/merge_status.py            write STATUS.md and backlog.json
    python3 docs/plan/STATUS/merge_status.py --check    exit 1 when the files on disk differ from what the inputs give (inputs: items-A.json, items-B.json,
                                                        authored_wave*.py, the delegated-decisions file, candidates/r1h/*/STATUS.json)
    python3 docs/plan/STATUS/merge_status.py --stats    print the counts only

What it does, and what it never does:
  * every item of items-A.json and items-B.json that is OPEN_BUILDABLE, BUILT_NOT_SHIPPED or OPEN_NEEDS_DECISION becomes one backlog entry (ids are disjoint
    between the two files, so nothing is merged away); SHIPPED, OWNER_ONLY and SUPERSEDED items are counted in STATUS.md and the OWNER_ONLY steps are listed in full;
  * an entry is `done` only when its record verifies (see done_state): a candidate or source item needs candidates/r1h/<id>/STATUS.json with passes true, a red
    run that failed, a green run that passed, the test and HANDOFF.md on disk; a decision-record item needs its delegated row in docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md;
    an umbrella item needs every child done. `python3 docs/plan/STATUS/check_backlog.py --rerun <id>` re-executes the recorded check;
  * entries with authored text (authored_wave1a.py, authored_wave1b.py) carry the exact acceptance an engineer wrote against the repository; every other entry gets the
    machine-checkable proof clause of its route plus the survey's next step and the plan's own acceptance sentence, quoted (acceptance_basis says which).
Nothing here edits items-A.json, items-B.json or the plan.
"""
import collections
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import plan_text as pt  # noqa: E402
from authored_wave1a import WAVE1A  # noqa: E402
from authored_wave1b import WAVE1B  # noqa: E402
from authored_slices import SLICES  # noqa: E402

REPO = pt.REPO
GENERATED = '2026-11-14'
OPEN = ('OPEN_BUILDABLE', 'BUILT_NOT_SHIPPED', 'OPEN_NEEDS_DECISION')
STATUSES = ['SHIPPED', 'BUILT_NOT_SHIPPED', 'OPEN_BUILDABLE', 'OPEN_NEEDS_DECISION', 'OWNER_ONLY', 'SUPERSEDED']
CHAPTERS = ['01', '02', '03', '04', '05', '06', '07', '08a', '08b', '09', '10', '11', '12', '13', '14', '15', '16']
DELEG = os.path.join(REPO, 'docs', 'decisions', 'DELEGATED-DECISIONS-MAIN-SITE.md')
DECISION_KINDS = {'decision', 'decision (ADR)', 'owner decision (chapter)', 'owner decision (implemented)', 'owner action', 'chapter-decision'}
WP_KINDS = {'work package (finding group)', 'work-package', 'work-package-part', 'decision-support package'}
TRACE_KINDS = {'audit-id', 'new-finding', 'audit-correction', 'exit-criterion'}
SIZE_RANK = {'S': 0, 'M': 1, 'L': 2}
STATUS_RANK = {'BUILT_NOT_SHIPPED': 0, 'OPEN_BUILDABLE': 1, 'OPEN_NEEDS_DECISION': 2}
TIER_RANK = {'survival': 1, 'legacy-a-line': 2, 'grade-a': 3, 'full-a-plus': 4, 'optional': 5}
CHAPTER_TIER = {'01': 'legacy-a-line', '02': 'survival', '03': 'grade-a', '04': 'legacy-a-line', '05': 'legacy-a-line', '06': 'grade-a', '07': 'legacy-a-line',
                '08a': 'legacy-a-line', '08b': 'legacy-a-line', '09': 'legacy-a-line', '10': 'legacy-a-line', '11': 'legacy-a-line', '12': 'legacy-a-line',
                '13': 'legacy-a-line', '14': 'legacy-a-line', '15': 'legacy-a-line', '16': 'legacy-a-line'}
# value order of the first dispatch batch (the 30 entries of authored_wave1a/1b), most valuable first
WAVE1_ORDER = ['ver-hist-node', 'wp-arch-09', 'wp-infra-28b', 'wp-content-09b', 'wp-time-05', 'wp-infra-23b', 'wp-hist-01b', 'wp-data-23a', 'wp-pagec-30', 'audit-h5',
               'wp-pagec-24', 'wp-pagec-33', 'wp-seo-04b', 'wp-page-18', 'wp-time-06', 'wp-data-05b', 'wp-infra-21b', 'wp-data-16', 'wp-data-15a', 'wp-data-14a',
               'wp-data-08d', 'wp-time-18', 'wp-arch-06', 'wp-hist-36', 'wp-data-04a', 'wp-dec-12', 'wp-content-01b', 'wp-time-08', 'wp-hist-22-units', 'wp-pagec-12']
AUTHORED = {}
AUTHORED.update(WAVE1A)
AUTHORED.update(WAVE1B)
for _spec in SLICES.values():
    for _sp in _spec['slices']:
        AUTHORED[_sp['id']] = _sp
# files that two wave-1 entries may both touch; each is changed by small Edit operations only
SHARED_FILES = {'wp-data-23a': ['tools/data/baseline.json', 'tools/data/rules/v2_rules.mjs'], 'wp-data-08d': ['tools/data/baseline.json', 'tools/data/rules/numbers_rules.mjs'],
                'wp-time-06': ['tools/time/relabel-data.mjs'], 'wp-time-18': ['src/lib/time/index.d.ts']}

# decision items whose conservative choice needs a build that no work package of the plan carries: they stay open as build entries
BUILD_DECISIONS = {
    'PROV-R1D-LEGEND': ('candidate-group', 'bundle', 'Selectable legend tab that shows the disposition colours again, beside the shipped legend "What the marks say" (row A25).'),
    'PROV-R1G-I2': ('candidate-group', 'bundle', 'Roster filter box on the virtual Unit Roster list, restoring find-in-page for rows that are not mounted (row A27).'),
    'ARCH-OD-04': ('candidate-group', 'bundle', 'One plain sentence in Help and in the legend that positions between recorded moments are drawn by interpolation (row A44).'),
    'PAGE-OD-07': ('candidate-group', 'bundle', 'Selectable, off-by-default hollow ring for a unit not seen for 24 moments (row A59); no maxAge by default.'),
    'UX-OD-03': ('candidate-group', 'bundle', 'Five-destination header as a selectable candidate, adopted only on a real card-sort and tree-test result (row A51).'),
    'UX-OD-05': ('candidate-group', 'pages', 'education.html folded into the default theme and the PDF button moved into the header More menu as a candidate (row A52).'),
    'PAGEC-OD-11': ('candidate-group', 'pages', 'The /support page (browser support, known problems, how to report; no data collection) as a candidate page (row A65).'),
}
# decision item -> items that carry its consequence (checked by name; a missing one is reported)
MANUAL_IMPL = {
    'ARCH-OD-05': ['WP-ARCH-09'], 'ARCH-OD-07': ['WP-ARCH-08'], 'ARCH-OD-08': ['WP-ARCH-26'], 'ARCH-OD-09': ['WP-ARCH-30'],
    'D-SCOPE-TIERS': ['WP-PAGEC-09', 'WP-PAGEC-10', 'WP-PAGEC-11', 'WP-PAGEC-12', 'WP-PAGEC-13', 'WP-PAGEC-14', 'WP-PAGEC-16', 'WP-PAGEC-17', 'WP-PAGEC-24', 'WP-PAGEC-25', 'WP-PAGE-43'],
    'D-ROOT': ['WP-SEO-10b', 'RM-30'], 'D-NAME': ['WP-SEO-08', 'WP-UX-29', 'RM-25'], 'D-TELEMETRY': ['WP-INFRA-15', 'WP-PERF-03', 'RM-26'],
    'OWNER-ACTION-09': ['D-SCOPE-TIERS'], 'OWNER-ACTION-11': ['D-NAME'], 'REG-FLAG-2': ['WP-SEO-08'], 'O-T0-5': ['AMD-T0-2'], 'O-T0-3': ['WP-ARCH-14'],
    'TIME-OD-08': ['WP-TIME-11'], 'TIME-OD-09': ['WP-TIME-13'], 'TIME-OD-11': ['WP-TIME-16'], 'TIME-OD-12': ['WP-TIME-16'], 'TIME-OD-07': ['WP-TIME-07', 'WP-TIME-23'],
    'UX-OD-02': ['WP-UX-16'], 'UX-OD-04': ['WP-UX-08'], 'A11Y-OD-05': ['WP-A11Y-19'], 'PERF-OD-04': ['WP-PERF-03'], 'PERF-OD-01': ['WP-PERF-28'], 'PERF-OD-02': ['WP-PERF-28'],
    'PAGEC-OD-02': ['WP-PAGEC-32'], 'PAGEC-OD-08': ['WP-PAGEC-26'], 'PAGEC-OD-10': ['WP-PAGEC-16'], 'PAGE-OD-06': ['WP-DEC-01', 'WP-DEC-02'],
    'PAGE-OD-09': ['WP-PAGE-41', 'WP-PAGE-42'], 'PAGE-OD-01': ['WP-PAGE-24'], 'PAGE-OD-11': ['WP-PAGE-28', 'WP-PAGE-33', 'WP-PAGE-37', 'WP-PAGE-39'],
    'PAGE-OD-03': ['WP-PAGE-43'], 'PAGE-OD-04': ['WP-PAGE-45'], 'A11Y-OD-04': ['WP-A11Y-13', 'WP-A11Y-14'], 'A11Y-OD-08': ['WP-A11Y-23'], 'UX-OD-08': ['WP-UX-31'],
    'OD-SEO-9': ['WP-CONTENT-22', 'WP-SEO-24'], 'CD-3': ['WP-CONTENT-11b'], 'CD-8': ['WP-CONTENT-13'], 'CD-2': ['WP-CONTENT-25'], 'QA-OD-7': ['WP-QA-16b'], 'QA-OD-3': ['WP-QA-18', 'WP-INFRA-08b'],
    'O-16-2': ['WP-QA-23'], 'Q-DATA-1': ['WP-DATA-10b'], 'Q-DATA-4': ['WP-DATA-14a'], 'Q-DATA-5': ['WP-DATA-13'], 'Q-DATA-6': ['WP-DATA-08a'], 'Q-DATA-2': ['WP-CONTENT-08'],
    'OD-2': ['WP-SEO-08'], 'OD-9': ['WP-SEO-10b'], 'OD-13': ['WP-QA-10b'], 'OD-12': ['WP-DATA-10b'], 'OD-18': ['WP-TIME-13', 'WP-TIME-11'], 'OD-19': ['WP-DEC-02', 'WP-DEC-04'],
    'INFRA-OD-3': ['WP-INFRA-04d', 'WP-INFRA-03b'], 'INFRA-OD-6': ['WP-INFRA-28b'], 'OD-11': ['WP-INFRA-03b', 'WP-INFRA-04d'],
}
DECISION_ONLY_NODES = {'RM-03': ['A41'], 'RM-98': ['A42']}   # nodes whose own text says "recorded as delegated rows"
SAME_WORK = {'WP-PAGEC-03': 'WP-PAGE-03'}                      # the survey says "Same work."
OWNER_GATE = re.compile(r"(owner's review|owner reads|owner reviews|owner review|owner decides|owner and counsel|owner inputs|owner machine|the owner answers|a person's sign-off|named reviewer|by the reviewer|reviewer's|historian decides|human review|second labeller|someone who did not build|real[- ]browser pass|real[- ]phone|real iphone|real device|counsel|account step|owner step|waits for the owner|owner exports|owner-only|owner enables|owner upload)", re.I)
CLASS_LABEL = {'candidate-group': 'candidate patch group (candidates/r1h/<id>/)', 'source-rebuild': 'source-rebuild (src/, historian-src/, data-src/)',
               'release-request': 'request to the release workstream', 'verification-record': 'verification record (evidence, not a change)', 'decision-record': 'decision record', 'umbrella': 'closes with its children'}


# ------------------------------------------------------------------ loading
def jload(p):
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def load_items():
    A = jload(os.path.join(HERE, 'items-A.json'))
    B = jload(os.path.join(HERE, 'items-B.json'))
    items, order = {}, []
    for part, D in (('A', A), ('B', B)):
        for it in D['items']:
            it = dict(it)
            it['_part'] = part
            if it['id'] in items:
                raise SystemExit('duplicate item id across items-A and items-B: %s' % it['id'])
            items[it['id']] = it
            order.append(it['id'])
    return A, B, items, order


def parse_delegated():
    rows = {}
    if not os.path.isfile(DELEG):
        return rows
    for line in open(DELEG, encoding='utf-8').read().splitlines():
        m = re.match(r'^\|\s*([ABC]\d\d)\s*\|', line)
        if m:
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cells) >= 4:
                rows[cells[0]] = {'id': cells[0], 'title': cells[1], 'choice': cells[2], 'governs': [x.strip() for x in re.split(r'[,;]', cells[3]) if x.strip()]}
    return rows


def rows_of(it, rows, gov):
    out = []
    for k in ('delegated_decision', 'delegated_row'):
        if it.get(k):
            out += re.findall(r'\b[ABC]\d\d\b', str(it[k]) if not isinstance(it[k], list) else ' '.join(it[k]))
    out += sorted(gov.get(it['id'], []))
    out += [r for r in re.findall(r'\brows? ([ABC]\d\d)\b', it['next_step'])]
    out += DECISION_ONLY_NODES.get(it['id'], [])
    seen, res = set(), []
    for r in out:
        if r in rows and r not in seen:
            seen.add(r)
            res.append(r)
    return res


# ------------------------------------------------------------------ mapping helpers
def base_wp(i):
    m = re.match(r'^(WP-[A-Z0-9]+-\d+)', i)
    return m.group(1) if m else i


def resolve_tokens(tokens, items, self_id=None):
    """WP/RM/item ids -> ids of OPEN items; a work package that is split in parts (09 -> 09a, 09b) resolves to its open parts."""
    out = []
    for t in tokens:
        if t == self_id:
            continue
        cand = [t] if t in items else [k for k in items if re.fullmatch(re.escape(t) + r'[a-z]', k)]
        for c in cand:
            if c in items and items[c]['status'] in OPEN and c != self_id and c not in out:
                out.append(c)
    return out


def closing_tokens(text):
    m = re.search(r'[Cc]losing work packages?:?\s*([^\n]*?)(?:\.\s|\.$|$)', text)
    if not m:
        return []
    return pt.expand_wp_tokens(re.sub(r'\([^)]*\)', '', m.group(1))) or pt.WP_RE.findall(m.group(1))


def next_step_deps(it, items):
    ns = it['next_step']
    toks = []
    for m in re.finditer(r'(?:\b[Aa]fter|\b[Oo]nce|[Dd]epends on|\bneeds|\brequires)\s+([^.;]+)', ns):
        clause = m.group(1)
        toks += pt.expand_wp_tokens(clause) + [x for x in re.findall(r'\bRM-\d+\b', clause)]
        toks += pt.WP_RE.findall(clause)
    return resolve_tokens(toks, items, it['id'])


# ------------------------------------------------------------------ classification
def klass(it, impl_map):
    k, st = it['kind'], it['status']
    if slug(it['id']) in AUTHORED:
        return 'leaf'
    if it['id'] in DECISION_ONLY_NODES:
        return 'decision'
    if st == 'OPEN_NEEDS_DECISION' and k in DECISION_KINDS:
        if it['id'] in BUILD_DECISIONS:
            return 'leaf'
        return 'decision'
    if k in ('roadmap-node', 'milestone'):
        return 'umbrella?'
    if k in TRACE_KINDS or k in ('verification-debt', 'verification debt'):
        return 'umbrella?'
    if k in DECISION_KINDS:
        return 'umbrella?' if re.search(r'\bWP-[A-Z0-9]+-\d+', it['next_step']) else 'leaf'
    return 'leaf'


AREA_OVERRIDE = {'OWNER-2026-10-05-3': 'data', 'WP-PERF-22': 'data', 'WP-A11Y-26': 'historian', 'PROV-R1G-I6': 'perf'}


def area_of(it):
    i, ch = it['id'], it['chapter']
    if i in AREA_OVERRIDE:
        return AREA_OVERRIDE[i]
    ns = it['next_step'].lower()
    if i.startswith(('WP-HIST', 'VD14', 'VER-HIST', 'HIST-OD')) or ch == '14' or i in ('WP-A11Y-26', 'WP-PAGEC-08', 'WP-TIME-19', 'D-HIST-ARCH', 'RM-41', 'RM-40', 'RM-74', 'RM-75', 'RM-76', 'RM-96'):
        return 'historian'
    if i.startswith(('WP-DATA', 'HB-', 'VD13', 'Q-DATA')) or ch == '13' or i in ('WP-PERF-22', 'WP-CONTENT-03', 'WP-CONTENT-04', 'WP-CONTENT-08', 'RM-31', 'RM-33'):
        return 'data'
    if i.startswith(('WP-TIME', 'TIME-OD')) or ch == '04':
        return 'time'
    if i.startswith(('WP-ARCH', 'ARCH-OD', 'WP-DEC', 'D-SOURCE', 'D-SHELL', 'D-SITEGEN', 'D-MAP-ENGINE', 'REG-FLAG-6')) or ch == '03':
        return 'rebuild'
    if i.startswith('WP-UX') or (ch in ('06', '07') and ns.startswith('rebuild')) or (ch == '07' and 'rebuild' in ns[:20]):
        return 'rebuild'
    if i.startswith(('WP-PAGE', 'PAGE')) or ch in ('08a', '08b'):
        return 'pages'
    if i.startswith('WP-PERF') or ch == '05':
        return 'perf'
    if i.startswith('WP-A11Y') or ch == '07':
        return 'a11y'
    if i.startswith('WP-INFRA') or ch == '09':
        return 'infra'
    if i.startswith(('WP-SEO', 'OD-SEO', 'VD10')) or ch == '10':
        return 'seo'
    if i.startswith(('WP-CONTENT', 'CD-', 'VD11', 'VER-COPY')) or ch == '11':
        return 'content'
    if i.startswith(('WP-QA', 'QA-OD', 'VD12')) or ch == '12':
        return 'qa'
    return 'audit' if ch in ('15', '16') else 'misc'


CAND_HINT = re.compile(r'candidate (page|bundle|data|bridge|group|overlay|css|rows|patch)|candidate rows|bridge (group|rows)|page group|candidate header|candidate:|^candidate', re.I)


def route_type(it, area):
    ns = it['next_step']
    low = ns.lower()
    if re.search(r'request to the release workstream|^release workstream:|requests/main-site-[a-z0-9-]+\.md', low):
        return 'release-request'
    if it['kind'] in ('verification-debt', 'verification debt', 'exit-criterion', 'audit-correction'):
        return 'verification-record'
    if CAND_HINT.search(ns):
        return 'candidate-group'
    if area in ('historian',):
        if re.search(r'page group|header rules|register(ed)? (the|as)|registration', low) and not re.search(r'engine|corpus|ingest|build', low):
            return 'candidate-group'
        return 'source-rebuild'
    if area in ('data', 'time', 'rebuild'):
        if area == 'time' and re.search(r'page rows|bridge|bundle', low):
            return 'candidate-group'
        if area == 'data' and re.search(r'candidate data patch|data patch|patch group', low):
            return 'candidate-group'
        return 'source-rebuild'
    if area in ('a11y', 'perf') and re.match(r'(rebuild|port|virtualise)', low):
        return 'source-rebuild'
    if area == 'pages' and re.match(r'(rebuild|port)', low):
        return 'source-rebuild'
    return 'candidate-group'


def source_dirs(area):
    return {'historian': ['historian-src/', 'tools/historian/', 'tests/historian/'], 'data': ['data-src/', 'tools/data/', 'tests/data/'],
            'time': ['src/lib/time/', 'data-src/time/', 'tools/time/', 'tests/time/'], 'rebuild': ['src/']}.get(area, ['src/'])


def tests_dir(area):
    return {'historian': 'tests/historian/', 'data': 'tests/data/', 'time': 'tests/time/', 'rebuild': 'src/<area>/tests/'}.get(area, 'src/<area>/tests/')


# ------------------------------------------------------------------ the build
def build():
    A, B, items, order = load_items()
    roadmap = pt.load_roadmap()
    nodes = {n['id']: n for n in roadmap['nodes']}
    node_idx = {n['id']: k for k, n in enumerate(roadmap['nodes'])}
    w2n = pt.wp_to_nodes(roadmap)
    dep_cells = pt.parse_dep_tables()
    secs = pt.plan_sections()
    rows = parse_delegated()
    gov = collections.defaultdict(set)
    for r in rows.values():
        for g in r['governs']:
            gov[g].add(r['id'])
    slugs = {}
    for i in order:
        s = slug(i)
        if s in slugs:
            raise SystemExit('slug collision: %s and %s' % (slugs[s], i))
        slugs[s] = i

    def nodes_of(it):
        out = []
        if it['id'].startswith('RM-'):
            return [it['id']]
        if it.get('roadmap_node'):
            out.append(it['roadmap_node'])
        out += it.get('also_roadmap_nodes', [])
        b = base_wp(it['id'])
        for n in w2n.get(b, []):
            if n not in out:
                out.append(n)
        for t in re.findall(r'\bRM-\d+\b', it['title'] + ' ' + it['next_step']):
            if it['kind'] in ('milestone',) and t not in out:
                out.append(t)
        return out

    def tier_of(it):
        ns = nodes_of(it)
        best = None
        for n in ns:
            nd = nodes.get(n)
            if not nd:
                continue
            pf = nd['path_fraction']
            if nd['tranche'] == 'P7':
                t = 'optional'
            elif pf.get('survival', 0) > 0:
                t = 'survival'
            elif pf.get('legacy_A_line', 0) > 0:
                t = 'legacy-a-line'
            elif pf.get('grade_A', 0) > 0:
                t = 'grade-a'
            else:
                t = 'full-a-plus'
            if best is None or TIER_RANK[t] < TIER_RANK[best]:
                best = t
        return best or CHAPTER_TIER[it['chapter']]

    open_ids = [i for i in order if items[i]['status'] in OPEN]
    # node -> open member items (for umbrellas)
    members = collections.defaultdict(list)
    for i in open_ids:
        it = items[i]
        if it['kind'] in ('roadmap-node',):
            continue
        for n in nodes_of(it):
            members[n].append(i)

    entries = {}
    for i in open_ids:
        it = items[i]
        sid = slug(i)
        kl = klass(it, MANUAL_IMPL)
        area = area_of(it)
        e = {'id': sid, 'source': {'part': it['_part'], 'id': i, 'kind': it['kind'], 'status': it['status'], 'chapter': it['chapter'], 'size': it['size']},
             'title': it['title'], 'size': it['size'], 'chapter': it['chapter'], 'area': area}
        rows_here = rows_of(it, rows, gov)
        if rows_here or it['status'] == 'OPEN_NEEDS_DECISION':
            e['decision'] = {'rows': rows_here, 'recorded': bool(rows_here), 'summary': (rows[rows_here[0]]['choice'][:240] if rows_here else None)}
        e['_klass'] = kl
        e['_it'] = it
        e['_area'] = area
        entries[sid] = e

    # ---- slices: the parent becomes an umbrella over entries that can be built and checked alone
    for parent_id, spec in SLICES.items():
        psid = slug(parent_id)
        if psid not in entries:
            raise SystemExit('slice parent is not an open item: %s' % parent_id)
        pe = entries[psid]
        kids = []
        for sp in spec['slices']:
            sid = sp['id']
            entries[sid] = {'id': sid, 'source': {'part': pe['source']['part'], 'id': pe['source']['id'], 'kind': 'slice of ' + pe['source']['kind'], 'status': pe['source']['status'],
                                                  'chapter': pe['chapter'], 'size': sp['size']},
                            'title': sp.get('title') or '%s: %s' % (pe['title'], sid[len(psid) + 1:]), 'size': sp['size'], 'chapter': pe['chapter'], 'area': sp['area'], '_klass': 'leaf',
                            '_it': pe['_it'], '_area': sp['area'], 'slice_of': psid}
            if 'decision' in pe:
                entries[sid]['decision'] = pe['decision']
            kids.append(sid)
        pe['_klass'] = 'umbrella'
        pe['_children'] = kids
        pe['slices'] = kids
        pe['slice_note'] = spec['note']

    # ---- umbrellas: children
    for sid, e in entries.items():
        it = e['_it']
        kids = []
        if it['id'] in SAME_WORK and slug(SAME_WORK[it['id']]) in entries:
            e['_klass'] = 'umbrella'
            e['_children'] = [slug(SAME_WORK[it['id']])]
            e['same_work_as'] = slug(SAME_WORK[it['id']])
            continue
        if e['_klass'] == 'umbrella?':
            if it['kind'] == 'roadmap-node':
                kids = [slug(x) for x in members.get(it['id'], []) if x != it['id']]
            else:
                toks = closing_tokens(it['evidence'] + ' \n' + it['next_step']) or []
                toks += pt.WP_RE.findall(it['next_step'])
                toks += pt.expand_wp_tokens(it['next_step'])
                toks += re.findall(r'\bRM-\d+\b', it['title'] + ' ' + it['next_step'] + ' ' + it['evidence'][:400]) if it['kind'] in ('milestone', 'exit-criterion') else []
                toks += [t for t in re.findall(r'\b(?:AUDIT|NF|CORR)-[A-Z0-9]+\b', it['next_step'])]
                kids = [slug(x) for x in resolve_tokens(toks, items, it['id'])]
                if it['kind'] == 'milestone':
                    kids += [slug(x) for t in re.findall(r'\bRM-\d+\b', it['title'] + ' ' + it['next_step']) for x in members.get(t, []) if x != it['id']]
            kids = [k for k in dict.fromkeys(kids) if k in entries and k != sid]
            if kids:
                e['_klass'] = 'umbrella'
                e['_children'] = kids
            else:
                e['_klass'] = 'leaf'
                if it['kind'] in ('roadmap-node', 'milestone', 'audit-id', 'new-finding', 'audit-correction', 'exit-criterion'):
                    e['umbrella_without_open_children'] = True

    # ---- decisions: consequences
    for sid, e in entries.items():
        if e['_klass'] != 'decision':
            continue
        it = e['_it']
        toks = pt.WP_RE.findall(it['next_step']) + pt.expand_wp_tokens(it['next_step']) + list(MANUAL_IMPL.get(it['id'], [])) + [x for x in it.get('related', []) if isinstance(x, str)]
        impl = [slug(x) for x in resolve_tokens(toks, items, it['id'])]
        e['implemented_by'] = [x for x in dict.fromkeys(impl) if x in entries]
        verbs = re.search(r'\b(build|builds|add|adds|candidate|write|draft)\b', it['next_step'].lower())
        if verbs and not e['implemented_by']:
            e['consequence_note'] = 'the conservative choice names work, and no other open item carries it (see the row); recorded here, to be split when it is dispatched'

    # ---- route, files, acceptance
    for sid, e in entries.items():
        it = e['_it']
        i = it['id']
        area = e['_area']
        secid = base_wp(i)
        sec = secs.get(secid)
        accept_plan = pt.accept_text(sec['text']) if sec else None
        auth = AUTHORED.get(sid)
        kl = e['_klass']
        if kl == 'decision':
            rt = 'decision-record'
        elif kl == 'umbrella':
            rt = 'umbrella'
        elif auth:
            rt = auth['route']
        elif i in BUILD_DECISIONS:
            rt = BUILD_DECISIONS[i][0]
        else:
            rt = route_type(it, area)
        e['route'] = {'type': rt}
        if rt == 'candidate-group':
            e['route'].update({'dir': 'candidates/r1h/%s/' % sid, 'train': 'R1h (cumulative on R1g, release id 52cec836)', 'register': 'release workstream: tools/t0/trains.json after the proof passes'})
            e['files'] = auth['files'] if auth else ['candidates/r1h/%s/%s' % (sid, f) for f in ('group.json', 'overlay/', 'test.mjs', 'STATUS.json', 'HANDOFF.md')]
        elif rt == 'source-rebuild':
            e['route'].update({'dirs': source_dirs(area), 'record': 'candidates/r1h/%s/' % sid})
            e['files'] = auth['files'] if auth else source_dirs(area) + ['candidates/r1h/%s/STATUS.json' % sid, 'candidates/r1h/%s/HANDOFF.md' % sid]
        elif rt == 'verification-record':
            e['route'].update({'dir': 'candidates/r1h/%s/' % sid, 'record': 'evidence file plus STATUS.json and HANDOFF.md'})
            e['files'] = auth['files'] if auth else ['candidates/r1h/%s/%s' % (sid, f) for f in ('evidence.json', 'STATUS.json', 'HANDOFF.md')]
        elif rt == 'release-request':
            mnote = re.search(r'requests/(main-site-[a-z0-9-]+\.md)', it['next_step'])
            note = 'docs/battle-theatre/GOVERNANCE/horde/requests/' + (mnote.group(1) if mnote else 'main-site-%s.md' % sid)
            e['route'].update({'owner': 'release workstream (tools/t0, tests/t0, tools/accept, tools/ship)', 'record': 'candidates/r1h/%s/' % sid, 'request_note': note})
            e['files'] = [note, 'candidates/r1h/%s/STATUS.json' % sid, 'candidates/r1h/%s/HANDOFF.md' % sid]
        else:
            e['files'] = []
        e['context_files'] = [f for f in it.get('files', []) if f not in e['files']]
        if sid in SHARED_FILES:
            e['shared_files'] = SHARED_FILES[sid]
        e['reads'] = auth.get('reads', []) if auth else []
        if auth:
            e['touches'] = auth.get('touches', [])
        # acceptance
        if auth:
            e['acceptance'] = auth['acceptance']
            e['acceptance_basis'] = 'authored against the repository on 2026-11-13'
            e['short'] = auth['short']
            e['owed'] = auth.get('owed', '')
            e['value'] = auth['value']
        else:
            e['acceptance'], e['acceptance_basis'] = gen_acceptance(e, it, rt, area, accept_plan, rows)
        gate = OWNER_GATE.findall(it['next_step'])
        if gate and rt in ('candidate-group', 'source-rebuild', 'release-request', 'verification-record') and not auth:
            e['owner_gated'] = sorted({g.lower() for g in gate})
        if rt in ('candidate-group', 'source-rebuild') and it['size'] == 'L' and not auth:
            e['needs_split'] = True
            hint = split_hint(sec['text'] if sec else '')
            e['split_hint'] = hint or ['slice by deliverable named in the survey next step; each slice gets its own red-first test and acceptance before dispatch']

    # ---- tier / node
    for sid, e in entries.items():
        it = e['_it']
        ns = nodes_of(it)
        e['roadmap_nodes'] = ns
        e['tier'] = tier_of(it)
        e['tranche'] = min((nodes[n]['tranche'] for n in ns if n in nodes), default=None)

    # ---- depends_on
    for sid, e in entries.items():
        it = e['_it']
        i = it['id']
        deps = []
        cell = dep_cells.get(base_wp(i))
        if cell and e['_klass'] in ('leaf',):
            toks = pt.deps_from_cell(base_wp(i), cell)
            deps += [slug(x) for x in resolve_tokens(toks, items, i)]
        if e['_klass'] in ('leaf', 'umbrella'):
            deps += [slug(x) for x in next_step_deps(it, items)]
        if e['_klass'] == 'umbrella':
            deps += e['_children']
        if e['_area'] == 'rebuild' and sid not in ('wp-arch-09',) and e['route']['type'] == 'source-rebuild' and e['_klass'] == 'leaf':
            m = re.match(r'WP-ARCH-(\d+)', i)
            if (m and int(m.group(1)) >= 10) or i.startswith(('WP-UX', 'WP-A11Y')):   # the spikes (WP-DEC-*) and WP-ARCH-01..08 need no workspace
                deps.append('wp-arch-09')
        if sid in AUTHORED:
            deps = list(AUTHORED[sid].get('depends_on', []))     # an authored entry names its own prerequisites (wave-1 entries have none)
        e['depends_on'] = [d for d in dict.fromkeys(deps) if d in entries and d != sid]

    # ---- two entries that name each other as a prerequisite are one piece of work: the later chapter keeps the edge
    for sid, e in entries.items():
        for d in list(e['depends_on']):
            if sid in entries[d]['depends_on'] and e['chapter'] < entries[d]['chapter']:
                e['depends_on'].remove(d)
                e.setdefault('together_with', []).append(d)
                entries[d].setdefault('together_with', []).append(sid)
    # ---- done state
    for sid, e in entries.items():
        e['done'], e['done_evidence'] = done_state(e, entries, rows)
    changed = True
    while changed:
        changed = False
        for sid, e in entries.items():
            if e['_klass'] == 'umbrella' and not e['done']:
                if all(entries[c]['done'] for c in e['_children']):
                    e['done'], e['done_evidence'] = True, {'basis': 'all children done', 'children': e['_children']}
                    changed = True

    # ---- order
    wave_pos = {s: k for k, s in enumerate(WAVE1_ORDER)}
    for s in WAVE1_ORDER:
        if s not in entries:
            raise SystemExit('wave-1 id not in the backlog: %s' % s)
        entries[s]['wave'] = 1
    for sid, e in entries.items():
        e.setdefault('wave', None)

    def key(sid):
        e = entries[sid]
        it = e['_it']
        done = 1 if e['done'] else 0
        cls = {'leaf': 0, 'umbrella': 1, 'decision': 2}[e['_klass']]
        wave = wave_pos.get(sid, 1000)
        nidx = min([node_idx.get(n, 999) for n in e['roadmap_nodes']] or [999])
        return (done, cls if not done else 0, wave, TIER_RANK[e['tier']], STATUS_RANK.get(it['status'], 3), SIZE_RANK[it['size']], nidx, sid)

    ordered = sorted(entries, key=key)
    # stable topological pass: an entry waits for its open dependencies
    placed, result, pending = set(), [], list(ordered)
    guard = 0
    while pending:
        guard += 1
        progressed = False
        for sid in list(pending):
            e = entries[sid]
            if all((d in placed) or entries[d]['done'] for d in e['depends_on']):
                result.append(sid)
                placed.add(sid)
                pending.remove(sid)
                progressed = True
                break
        if not progressed:
            # cycle: place the lowest-key entry and record the broken edge
            sid = pending.pop(0)
            entries[sid].setdefault('warnings', []).append('dependency cycle broken here: depends_on %s not yet placed' % [d for d in entries[sid]['depends_on'] if d not in placed])
            result.append(sid)
            placed.add(sid)
        if guard > 10 * len(entries) + 100:
            raise SystemExit('ordering did not terminate')
    for n, sid in enumerate(result, 1):
        entries[sid]['order'] = n

    return A, B, items, order, entries, result, rows, gov, nodes


def split_hint(text):
    if not text:
        return []
    steps = re.findall(r'\((\d)\)\s*([^()]{12,140}?)(?=\s*\(\d\)|\.\s|;|$)', text)
    out, seen = [], set()
    for n, t in steps:
        t = re.sub(r'\s+', ' ', t).strip(' .;')
        if t and n not in seen:
            seen.add(n)
            out.append('(%s) %s' % (n, t[:120]))
    return out[:8]


def clean(s):
    return re.sub(r'\s+', ' ', s).strip()


def gen_acceptance(e, it, rt, area, accept_plan, rows):
    sid = e['id']
    parts = []
    basis = []
    if rt == 'candidate-group':
        parts.append('Proof: candidates/r1h/%s/ holds group.json and/or overlay/ with every anchor asserted on release/R1g/dist, test.mjs that FAILS on the untouched tree and PASSES on the scratch tree of the group, HANDOFF.md, and `node candidates/r1h/_lib/prove.mjs %s` exits 0 and writes STATUS.json with passes true (anchors ok, red exit non-zero, green exit 0).' % (sid, sid))
    elif rt == 'source-rebuild':
        parts.append('Proof: a red-first test under %s (it fails before the change; the failing log is kept), the work in %s, and `node candidates/r1h/_lib/record.mjs %s --test "<command>" --red-cmd "<command>" --red-exit 1 --red-log <log>` exits 0 with every test command exiting 0 and HANDOFF.md present; no existing test, gate or baseline is loosened.' % (tests_dir(area), ', '.join(source_dirs(area)), sid))
    elif rt == 'verification-record':
        parts.append('Proof: candidates/r1h/%s/evidence.json states the question, the method (commands run, sources with edition and page, or the measurement), and one outcome per point: confirmed, refuted, not found (a failed lookup is recorded as failed) or blocked (a refused host is recorded as blocked, never worked around); every figure and quotation it cites is re-checked by the test command that `node candidates/r1h/_lib/record.mjs %s --evidence candidates/r1h/%s/evidence.json --test "<command>"` runs (exit 0), HANDOFF.md says what was not run; where the answer needs a person, a device or an account the outcome is blocked and the owner step is named.' % (sid, sid, sid))
    elif rt == 'release-request':
        parts.append('Proof: the request note %s names the exact change (file, lines, text), the red-first check the release workstream runs and its expected result, and candidates/r1h/%s/STATUS.json records passes true once the note exists; the change itself is the release workstream\'s.' % (e['route']['request_note'], sid))
    elif rt == 'decision-record':
        rr = e.get('decision', {}).get('rows', [])
        parts.append('Proof: delegated row%s %s of docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md name%s %s with the conservative choice and the way back%s.' % ('s' if len(rr) > 1 else '', ', '.join(rr) or '(none found)', '' if len(rr) > 1 else 's', it['id'], '; its consequence is carried by ' + ', '.join(e['implemented_by']) if e.get('implemented_by') else '; the choice needs no build step of its own'))
    elif rt == 'umbrella':
        parts.append('Proof: every child is done (%s); then the exit check of the node or finding named in the plan is re-run on the candidate and recorded.' % ', '.join(e['_children'][:12]) + (' ...' if len(e['_children']) > 12 else ''))
    ns = clean(it['next_step'])
    if rt != 'decision-record' and ns and not re.fullmatch(r'(None\.?|Rebuild\.?|N/A)', ns):
        parts.append('Specific check (survey next step, 2026-11-13): %s' % ns)
        basis.append('next-step')
    elif rt != 'decision-record':
        parts.append('Specific check: the plan acceptance below; the survey records no further step (%s).' % (ns or 'none'))
    if accept_plan and rt != 'decision-record':
        parts.append('Plan acceptance (docs/plan/FINAL, %s): %s' % (base_wp(it['id']), accept_plan))
        basis.append('plan-accept')
    if it.get('tests') and rt != 'decision-record':
        parts.append('Existing tests that must stay green: %s.' % ', '.join(it['tests']))
    if rt in ('candidate-group', 'source-rebuild'):
        parts.append('Not claimed: anything that needs a real browser, GPU, device or the live site is listed as owed in HANDOFF.md.')
    if it['status'] == 'OPEN_NEEDS_DECISION' and rt != 'decision-record':
        rr = e.get('decision', {}).get('rows', [])
        parts.append('Decision: delegated row%s %s apply%s; build only the conservative choice and keep the alternative selectable.' % ('s' if len(rr) > 1 else '', ', '.join(rr) or '(see the item)', '' if len(rr) > 1 else 's'))
    return ' '.join(parts), (' + '.join(['machine proof clause'] + basis))


# ------------------------------------------------------------------ done
def done_state(e, entries, rows):
    sid = e['id']
    k = e['_klass']
    if k == 'decision':
        rr = e.get('decision', {}).get('rows', [])
        if rr and all(r in rows for r in rr):
            return True, {'basis': 'delegated decision recorded', 'rows': rr, 'file': 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md', 'consequence_items': e.get('implemented_by', [])}
        return False, None
    if k == 'umbrella':
        return False, None
    p = os.path.join(REPO, 'candidates', 'r1h', sid, 'STATUS.json')
    if not os.path.isfile(p):
        return False, None
    try:
        s = jload(p)
    except ValueError:
        return False, None
    ok, why = verify_status(sid, s, e['route']['type'])
    if ok:
        return True, {'basis': 'STATUS.json verified', 'status_file': 'candidates/r1h/%s/STATUS.json' % sid, 'checked_at': s.get('checked_at')}
    return False, None


def verify_status(sid, s, rt):
    d = os.path.join(REPO, 'candidates', 'r1h', sid)
    if s.get('passes') is not True or s.get('id') != sid:
        return False, 'passes is not true'
    if not os.path.isfile(os.path.join(d, 'HANDOFF.md')):
        return False, 'no HANDOFF.md'
    if rt == 'candidate-group':
        if not (s.get('anchors') or {}).get('ok') or not s.get('test_exists') or not os.path.isfile(os.path.join(REPO, s.get('test', ''))):
            return False, 'anchors or test missing'
        if not s.get('red') or s['red'].get('exit') in (0, None) or not s.get('green') or s['green'].get('exit') != 0:
            return False, 'red/green record missing or wrong'
    elif rt == 'source-rebuild':
        tests = s.get('tests') or []
        if not tests or any(t.get('exit') != 0 for t in tests):
            return False, 'test commands missing or failing'
        rf = s.get('red_first') or {}
        if rf.get('exit') in (0, None) or not rf.get('log') or not os.path.isfile(os.path.join(REPO, rf['log'])):
            return False, 'red-first record missing'
    elif rt == 'verification-record':
        ev = s.get('evidence') or {}
        if not ev.get('file') or not os.path.isfile(os.path.join(REPO, ev['file'])) or ev.get('outcome') not in ('confirmed', 'refuted', 'not-found', 'blocked', 'mixed'):
            return False, 'evidence file or outcome missing'
        tests = s.get('tests') or []
        if not tests or any(t.get('exit') != 0 for t in tests):
            return False, 'test commands missing or failing'
    elif rt == 'release-request':
        note = s.get('request_note')
        if not note or not os.path.isfile(os.path.join(REPO, note)):
            return False, 'request note missing'
    else:
        return False, 'route has no record'
    return True, ''


# ------------------------------------------------------------------ outputs
def chapter_titles():
    out = {}
    for ch, fn in pt.CHAPTER_FILES.items():
        p = os.path.join(pt.FINAL, fn)
        t = ''
        if os.path.isfile(p):
            for line in open(p, encoding='utf-8'):
                if line.startswith('# '):
                    t = re.sub(r'^#\s*(?:Chapter\s*)?\d+[a-z]?\s*[-:.\u2013\u2014]*\s*', '', line.strip()).strip()
                    break
        out[ch] = t or fn
    return out


def backlog_json(A, B, items, order, entries, result, rows):
    out_items = []
    for sid in result:
        e = entries[sid]
        o = {k: v for k, v in e.items() if not k.startswith('_')}
        o['order'] = e['order']
        if e['_klass'] == 'umbrella':
            o['children'] = e['_children']
        # a stable field order
        keys = ['id', 'order', 'wave', 'done', 'title', 'source', 'chapter', 'area', 'tier', 'tranche', 'roadmap_nodes', 'size', 'route', 'files', 'shared_files', 'touches', 'reads',
                'context_files', 'depends_on', 'children', 'implemented_by', 'decision', 'value', 'acceptance', 'acceptance_basis', 'short', 'owed', 'needs_split', 'split_hint',
                'consequence_note', 'owner_gated', 'together_with', 'same_work_as', 'slice_of', 'slices', 'slice_note', 'umbrella_without_open_children', 'warnings', 'done_evidence']
        o = {k: o[k] for k in keys if k in o}
        out_items.append(o)
    counts = collections.Counter()
    for e in entries.values():
        counts[('done' if e['done'] else 'open', e['route']['type'])] += 1
    open_leaf = [s for s in result if not entries[s]['done'] and entries[s]['_klass'] == 'leaf']
    doc = {
        'schema': 1, 'file': 'docs/plan/STATUS/backlog.json', 'generated': GENERATED,
        'generator': 'python3 docs/plan/STATUS/merge_status.py (validate: python3 docs/plan/STATUS/check_backlog.py)',
        'sources': ['docs/plan/STATUS/items-A.json', 'docs/plan/STATUS/items-B.json', 'docs/plan/STATUS/authored_wave1a.py', 'docs/plan/STATUS/authored_wave1b.py', 'docs/plan/STATUS/authored_slices.py',
                    'docs/plan/FINAL/15-roadmap.json', 'docs/plan/FINAL (WP dependency tables and acceptance text)', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md'],
        'scope': 'One entry per OPEN_BUILDABLE, BUILT_NOT_SHIPPED and OPEN_NEEDS_DECISION item of items-A.json (340) and items-B.json (365), plus the slices of items cut into parts (slice_of / slices): %d entries in all. SHIPPED, OWNER_ONLY and SUPERSEDED items are not here (see STATUS.md).' % len(out_items),
        'definitions': {
            'id': 'lowercase letters, digits and hyphens: the source id lowercased (WP-INFRA-23b -> wp-infra-23b); also the folder name candidates/r1h/<id>/',
            'route.type': {k: CLASS_LABEL[k] for k in CLASS_LABEL},
            'done': 'true only when the record verifies (candidates/r1h/<id>/STATUS.json passes with the red and green runs, test and HANDOFF.md on disk; a decision record needs its delegated row; an umbrella needs every child done). Nothing is marked done on a claim.',
            'wave': '1 = the first dispatch batch (30 entries, authored against the repository, pairwise independent: disjoint write sets, no depends_on between them); null = later',
            'order': 'position in the list: open build entries first by wave, value tier (survival, legacy A-line, grade A, full A+, optional), status (built-not-shipped first), size, roadmap node; an entry never precedes its open dependencies; umbrellas and decision records after the build entries; done entries last',
            'tier': 'the lowest path of docs/plan/FINAL/15-roadmap.json in which the entry\'s roadmap node carries work (survival < legacy-a-line < grade-a < full-a-plus; tranche P7 = optional)',
            'depends_on': 'open entries that must be done first: the plan\'s dependency tables, "after/once" clauses of the survey step, the children of an umbrella, and wp-arch-09 for rebuild entries',
            'needs_split': 'size L: slice into entries of at most M before dispatch (split_hint quotes the plan\'s own numbered steps); a slice is done when its own acceptance holds and the entry when every slice is',
            'acceptance_basis': 'authored = written against the repository; otherwise the machine proof clause plus the survey next step and the plan acceptance, quoted',
        },
        'counts': {'entries': len(out_items), 'open_build': len(open_leaf), 'by_route_and_state': {'%s/%s' % k: v for k, v in sorted(counts.items())},
                   'wave_1': sum(1 for e in entries.values() if e.get('wave') == 1), 'done': sum(1 for e in entries.values() if e['done']),
                   'by_source_status': dict(collections.Counter(e['source']['status'] for e in entries.values())), 'by_size_open_build': dict(collections.Counter(entries[s]['size'] for s in open_leaf))},
        'items': out_items,
    }
    return doc


def md_cell(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def status_md(A, B, items, order, entries, result, rows):
    titles = chapter_titles()
    cnt = {ch: collections.Counter() for ch in CHAPTERS}
    for i in order:
        cnt[items[i]['chapter']][items[i]['status']] += 1
    tot = collections.Counter()
    for ch in CHAPTERS:
        tot.update(cnt[ch])
    n_tot = sum(tot.values())
    L = []
    L.append('# Main site: status of the master plan, 2026-11-13')
    L.append('')
    L.append('Merged from `items-A.json` (chapters 01 to 08b, %d items) and `items-B.json` (chapters 09 to 16, %d items) by `python3 docs/plan/STATUS/merge_status.py`; the work list is `backlog.json` (one entry per open item) and the rules for candidates are in `candidates/r1h/README.md`. Nothing in this file is a claim about the live site: **nothing is deployed** (ops/RELEASE-LOG.md has no deploy row, production still serves deploy 6abd6d62); every SHIPPED item is in the release candidate, train R1g (release id 52cec836), only.' % (A['total'], B['total']))
    L.append('')
    L.append('## Where it stands')
    L.append('')
    L.append('| Status | Items | Meaning |')
    L.append('|---|---:|---|')
    meaning = {k: A['status_definitions'][k] for k in STATUSES}
    for s in STATUSES:
        L.append('| %s | %d | %s |' % (s, tot[s], md_cell(meaning[s])))
    L.append('| **Total** | **%d** | A %d + B %d |' % (n_tot, A['total'], B['total']))
    L.append('')
    sa = collections.Counter(items[i]['status'] for i in order if items[i]['_part'] == 'A')
    sb = collections.Counter(items[i]['status'] for i in order if items[i]['_part'] == 'B')
    assert all(sa[s] == A['counts'].get(s, 0) for s in STATUSES), 'items-A counts block differs from its items'
    assert all(sb[s] == B['counts'].get(s, 0) for s in STATUSES), 'items-B counts block differs from its items'
    L.append('Items overlap (a roadmap node, its work packages and an ADR can name the same work), so the counts are items, not days of work; the de-duplicated effort is in `docs/plan/FINAL/15-roadmap.json` (729 to 1,236 AI-assisted person-days for the whole programme, P50 982).')
    L.append('')
    L.append('Ground facts (from the two surveys; run results quoted there are in their `ground_facts`):')
    L.append('')
    seen = set()
    for f in A['ground_facts'] + B['ground_facts']:
        k = f[:60]
        if k in seen:
            continue
        seen.add(k)
        L.append('- ' + f)
    L.append('')
    L.append('## By chapter')
    L.append('')
    L.append('| Chapter | Title | SHIPPED | BUILT_NOT_SHIPPED | OPEN_BUILDABLE | OPEN_NEEDS_DECISION | OWNER_ONLY | SUPERSEDED | Total | Open for building or decision |')
    L.append('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|')
    for ch in CHAPTERS:
        c = cnt[ch]
        L.append('| %s | %s | %s | %d | %d | %d | %d | %d | %d | %d |' % (ch, md_cell(titles.get(ch, '')), c['SHIPPED'], c['BUILT_NOT_SHIPPED'], c['OPEN_BUILDABLE'], c['OPEN_NEEDS_DECISION'], c['OWNER_ONLY'], c['SUPERSEDED'], sum(c.values()), c['BUILT_NOT_SHIPPED'] + c['OPEN_BUILDABLE'] + c['OPEN_NEEDS_DECISION']))
    L.append('| **All** | | **%d** | **%d** | **%d** | **%d** | **%d** | **%d** | **%d** | **%d** |' % (tot['SHIPPED'], tot['BUILT_NOT_SHIPPED'], tot['OPEN_BUILDABLE'], tot['OPEN_NEEDS_DECISION'], tot['OWNER_ONLY'], tot['SUPERSEDED'], n_tot, tot['BUILT_NOT_SHIPPED'] + tot['OPEN_BUILDABLE'] + tot['OPEN_NEEDS_DECISION']))
    L.append('')
    L.append('Chapters 08a and 08b are the two halves of the sub-page chapter (08a Tier-1 pages and shared page work, 08b Tier-2 and Labs pages).')
    L.append('')
    # backlog summary
    open_leaf = [s for s in result if not entries[s]['done'] and entries[s]['_klass'] == 'leaf']
    rt = collections.Counter(entries[s]['route']['type'] for s in result)
    rt_open = collections.Counter(entries[s]['route']['type'] for s in result if not entries[s]['done'])
    L.append('## The backlog (`backlog.json`)')
    L.append('')
    n_leaf = sum(1 for s_ in result if entries[s_]['_klass'] == 'leaf')
    n_leaf_done = sum(1 for s_ in result if entries[s_]['_klass'] == 'leaf' and entries[s_]['done'])
    n_dec = sum(1 for s_ in result if entries[s_]['_klass'] == 'decision')
    n_umb = sum(1 for s_ in result if entries[s_]['_klass'] == 'umbrella')
    n_umb_done = sum(1 for s_ in result if entries[s_]['_klass'] == 'umbrella' and entries[s_]['done'])
    L.append('%d entries: one per open item plus %d slices (an item cut into parts that can be built alone; the parent closes with its slices). %d are build entries (a candidate patch group, source-rebuild work, a verification record or a request to the release workstream); %d are decision records (the delegated row exists, the consequence is carried by other entries); %d are umbrellas that close with their children. Done now: %d decision records, %d of %d build entries (a build entry is done only when candidates/r1h/<id>/STATUS.json verifies), %d of %d umbrellas.' % (len(entries), sum(1 for e_ in entries.values() if e_.get('slice_of')), n_leaf, n_dec, n_umb, sum(1 for s_ in result if entries[s_]['_klass'] == 'decision' and entries[s_]['done']), n_leaf_done, n_leaf, n_umb_done, n_umb))
    L.append('')
    L.append('| Route | Entries | Open |')
    L.append('|---|---:|---:|')
    for k in ('candidate-group', 'source-rebuild', 'verification-record', 'release-request', 'umbrella', 'decision-record'):
        L.append('| %s | %d | %d |' % (CLASS_LABEL[k], rt[k], rt_open[k]))
    L.append('')
    sz = collections.Counter(entries[s]['size'] for s in open_leaf)
    L.append('Open build entries by size: S %d, M %d, L %d (an L entry must be sliced to M or smaller before it is dispatched; `split_hint` quotes the plan\'s own steps).' % (sz['S'], sz['M'], sz['L']))
    L.append('')
    L.append('### Wave 1: the first dispatch batch (30 entries)')
    L.append('')
    L.append('Authored against the repository; pairwise independent (disjoint write sets, no dependency between them; the few shared files are changed by small edits only and named in `shared_files`).')
    L.append('')
    L.append('| # | Id | Route | Size | Why it is first | Check (short) |')
    L.append('|---:|---|---|---|---|---|')
    for n, s in enumerate(WAVE1_ORDER, 1):
        e = entries[s]
        L.append('| %d | `%s` | %s | %s | %s | %s |' % (n, s, e['route']['type'], e['size'], md_cell(e.get('value', '')), md_cell(e.get('short', ''))))
    L.append('')
    nxt = [x for x in result if entries[x]['wave'] is None and not entries[x]['done'] and entries[x]['_klass'] == 'leaf'
           and not any(d in WAVE1_ORDER for d in entries[x]['depends_on'])][:40]   # entries that wait for a wave-1 entry are not in the next batch
    L.append('### After wave 1: the next 40 build entries in order (acceptance is derived, not yet authored against the repository)')
    L.append('')
    L.append('| Order | Id | Route | Size | Tier | Waits for | Note |')
    L.append('|---:|---|---|---|---|---|---|')
    for x in nxt:
        e = entries[x]
        wait = ', '.join('`%s`' % d for d in e['depends_on'] if not entries[d]['done'])
        note = 'owner-gated: ' + ', '.join(e['owner_gated'][:3]) if e.get('owner_gated') else ('size L: slice first' if e.get('needs_split') else '')
        L.append('| %d | `%s` | %s | %s | %s | %s | %s |' % (e['order'], x, e['route']['type'], e['size'], e['tier'], wait, md_cell(note)))
    L.append('')
    L.append('## Delegated decisions')
    L.append('')
    nA = sum(1 for r in rows if r.startswith('A')); nB = sum(1 for r in rows if r.startswith('B')); nC = sum(1 for r in rows if r.startswith('C'))
    L.append('`docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md` holds %d rows (A: %d, B: %d, C: %d). Every OPEN_NEEDS_DECISION item of both files is governed by at least one row (checked by the merge); the C rows record the decisions this merge itself needed (route, layout, closing rules). An override by the owner in writing replaces any row.' % (len(rows), nA, nB, nC))
    L.append('')
    # owner only
    L.append('## OWNER_ONLY: every step only the owner can take')
    L.append('')
    oo = [items[i] for i in order if items[i]['status'] == 'OWNER_ONLY']
    L.append('%d items need a legal act, an account, a key, a DNS change, a payment, a deployment, real hardware or a third party. The step is quoted from the item; a roadmap node and the items beneath it each list their own step, so some steps repeat on purpose.' % len(oo))
    L.append('')
    for ch in CHAPTERS:
        lst = [it for it in oo if it['chapter'] == ch]
        if not lst:
            continue
        L.append('### Chapter %s: %s (%d)' % (ch, titles.get(ch, ''), len(lst)))
        L.append('')
        L.append('| Item | Title | Size | Owner step |')
        L.append('|---|---|---|---|')
        for it in lst:
            L.append('| `%s` | %s | %s | %s |' % (it['id'], md_cell(it['title']), it['size'], md_cell(it.get('owner_step') or it['next_step'])))
        L.append('')
    other = [items[i] for i in order if items[i]['status'] != 'OWNER_ONLY' and items[i].get('owner_step')]
    L.append('### Owner steps attached to items that are not OWNER_ONLY (%d)' % len(other))
    L.append('')
    L.append('These items have buildable or decidable work too; the owner part is:')
    L.append('')
    L.append('| Item | Status | Title | Owner step |')
    L.append('|---|---|---|---|')
    for it in other:
        L.append('| `%s` | %s | %s | %s |' % (it['id'], it['status'], md_cell(it['title']), md_cell(it['owner_step'])))
    L.append('')
    L.append('## Regenerate and check')
    L.append('')
    L.append('```')
    L.append('python3 docs/plan/STATUS/merge_status.py            # rewrite STATUS.md and backlog.json from items-A.json, items-B.json and the repository')
    L.append('python3 docs/plan/STATUS/merge_status.py --check    # exit 1 when they are stale')
    L.append('python3 docs/plan/STATUS/check_backlog.py           # validate backlog.json and every done claim')
    L.append('python3 docs/plan/STATUS/check_backlog.py --rerun <id>   # re-run the recorded check of one entry')
    L.append('```')
    L.append('')
    return '\n'.join(L)


def render():
    A, B, items, order, entries, result, rows, gov, nodes = build()
    bl = json.dumps(backlog_json(A, B, items, order, entries, result, rows), indent=1, ensure_ascii=False) + '\n'
    md = status_md(A, B, items, order, entries, result, rows) + '\n'
    return bl, md, entries, result, items, order, rows


def main(argv):
    bl, md, entries, result, items, order, rows = render()
    p_bl, p_md = os.path.join(HERE, 'backlog.json'), os.path.join(HERE, 'STATUS.md')
    if '--stats' in argv:
        c = collections.Counter((entries[s]['route']['type'], entries[s]['size']) for s in result)
        for k, v in sorted(c.items()):
            print(k, v)
        print('entries', len(entries), 'done', sum(1 for e in entries.values() if e['done']))
        return 0
    if '--check' in argv:
        bad = [p for p, t in ((p_bl, bl), (p_md, md)) if not os.path.isfile(p) or open(p, encoding='utf-8').read() != t]
        if bad:
            print('stale: ' + ', '.join(os.path.relpath(p, REPO) for p in bad))
            return 1
        print('STATUS.md and backlog.json are current')
        return 0
    with open(p_bl, 'w', encoding='utf-8') as fh:
        fh.write(bl)
    with open(p_md, 'w', encoding='utf-8') as fh:
        fh.write(md)
    print('wrote backlog.json (%d entries) and STATUS.md' % len(entries))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
