#!/usr/bin/env python3
"""Build the 47 dossiers docs/battle-theatre/GOVERNANCE/conflicts/dossiers/C-001.md .. C-047.md: the first retrieval every researcher starts from.

    python3 -I tools/bt/conflicts/build_dossiers.py                 build all 47 (heavy: reads the whole local library once; run it through tools/horde/bench.sh)
    python3 -I tools/bt/conflicts/build_dossiers.py C-001 C-017     build some
    python3 -I tools/bt/conflicts/build_dossiers.py --check         verify that 47 dossiers exist and have every section

A dossier holds: (1) the register record (the PDF row as printed in plan-clean.txt pages 62-63, its cells, the source keys explained); (2) the first delegated default of
2026-11-11 with tier, basis, rationale and scenarios; (3) what reads the value (arrivals rows, timeline rows, gates, app data and code); (4) what the horde shards and the
correction files already say about it; (5) a first retrieval of candidate passages from the local library (file, offset, 200-character snippet; the Official Records with
record and printed page); (6) the sources worth acquiring that are not local yet, with the result of the probe of archive.org. Nothing in a dossier is a finding: it is where
to start reading. The profiles (names, units, places, clock words) are in dossier_profiles.py.
"""
import collections
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
import cfl_search as S
import dossier_profiles as DP

L.utf8_stdout()
SCOPE_ORDER = ['or', 'books', 'nps', 'news', 'med']
CAPS = {'or': 7, 'books': 6, 'nps': 4, 'news': 3, 'med': 3}
PER_SOURCE = {'or': 12, 'books': 6, 'nps': 4, 'news': 2, 'med': 4}
SCAN_CAP = 12
ARR_JSON = os.path.join(L.BT, 'history', 'arrivals.json')
SECTIONS = ['## 1. The register record', '## 2. The first delegated default', '## 3. What reads the value', '## 4. What the shards and corrections already say',
            '## 5. Candidate passages in the local library', '## 6. Sources worth acquiring that are not local yet', '## 7. Reading hints and next steps']


def page_of_plan_line(idx):
    L_ = L.plan_lines()
    pg = None
    for i in range(min(idx, len(L_) - 1), -1, -1):
        m = re.match(r'^=== PAGE (\d+) ===', L_[i])
        if m:
            return int(m.group(1))
    return pg


def clean_row_lines(lines):
    out = []
    for ln in lines:
        s = ln.rstrip()
        if 'animation plan, version 2 | page' in s:
            out.append('[page break: %s]' % s.strip())
            continue
        if s.startswith('=== PAGE'):
            out.append('[%s]' % s.strip('= ').lower())
            continue
        if s.strip() == '':
            continue
        out.append(s)
    return out


def source_list():
    ctx = L.new_ctx()
    ledger = ctx.ledger()
    scopes = {k: [] for k in SCOPE_ORDER}
    for sid, row in ledger.items():
        if sid == '__duplicates__':
            continue
        t = row.get('text', '')
        cls = row.get('class')
        if cls == 'lead' or not t or t in ('-', 'none'):
            continue
        if '{part}' in t:
            if sid in ('GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863'):
                for part, rel in S.ctx_list_texts(ctx, sid):
                    scopes['news'].append((sid, part, rel, row))
            continue
        if not os.path.exists(os.path.join(L.ROOT, t)):
            continue
        if sid.startswith('OR27-'):
            scopes['or'].append((sid, None, t, row))
        elif sid.startswith('NPS'):
            scopes['nps'].append((sid, None, t, row))
        elif sid.startswith(('MSHWR', 'USSC', 'SOUDER', 'LETTERMAN')):
            scopes['med'].append((sid, None, t, row))
        elif sid.startswith(('OR-', 'ORSER')):
            continue
        else:
            scopes['books'].append((sid, None, t, row))
    return ctx, scopes


def compile_near(near):
    out = []
    for n in near:
        if n == 'CLOCK':
            out.append(S.CLOCK)
        else:
            out.append(n)
    return out


def author_filter(sid, by, event_date):
    """Predicate on a character offset of an Official Records part: the record the offset lies in was written by one of the named officers (the surname of the author of a
    report; the heading or addressee of a letter or order of Part 3, which must be dated in the month of the event or the next)."""
    import datetime
    n = int(sid[-1])
    names = [x.lower() for x in by]
    d = datetime.date.fromisoformat(event_date)
    months = {d.strftime('%B').lower()[:3], (d.replace(day=28) + datetime.timedelta(days=5)).strftime('%B').lower()[:3]}

    def ok(off):
        r = S.or_record_at(n, off)
        if r is None:
            return False
        au = str(r.get('author') or '').lower().strip(' .,')
        if au:
            sur = au.split()[-1] if au.split() else ''
            return any(sur == x or (' ' in x and x in au) or (x == 'fitz' and 'fitz' in au) for x in names)
        blob = ' '.join(str(r.get(k) or '') for k in ('header_raw', 'toc_text', 'addressee')).lower()
        if not any(re.search(r'\b%s\b' % re.escape(x), blob) for x in names):
            return False
        dt = str(r.get('date_raw') or r.get('header_raw') or '').lower()
        return (not re.search(r'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec', dt)) or any(m in dt for m in months)
    return ok


def scan_all(only=None, log=print):
    """{cid: {probe index: {scope: [hit dict]}}} over the whole local library."""
    ctx, scopes = source_list()
    results = {cid: {i: {} for i in range(len(p['probes']))} for cid, p in DP.P.items() if not only or cid in only}
    t0 = time.time()
    n_files = 0
    for scope in SCOPE_ORDER:
        for sid, part, rel, row in scopes[scope]:
            n_files += 1
            try:
                S.raw_text(rel)
            except OSError:
                continue
            for cid, res in results.items():
                for i, pr in enumerate(DP.P[cid]['probes']):
                    if scope not in pr['scope']:
                        continue
                    if pr.get('by') and scope != 'or':
                        continue
                    acc = author_filter(sid, pr['by'], DP.P[cid]['event_date']) if pr.get('by') else None
                    hits = S.probe_hits(rel, pr['anchors'], compile_near(pr['near']), pr['window'], PER_SOURCE[scope], score_terms=DP.P[cid]['terms'], accept=acc)
                    if hits:
                        res[i].setdefault(scope, []).extend([dict(h, sid=sid, part=part, path=rel, scope=scope) for h in hits])
            if n_files % 25 == 0:
                log('  scanned %d files (%s) in %.0f s' % (n_files, scope, time.time() - t0))
    return results, ctx, scopes


def describe_hit(ctx, h):
    row = ctx.ledger().get(h['sid'])
    info = S.describe(row, h['path'], h['off'], 40, h.get('part'))
    return info


def render_hits(ctx, probe_hits):
    lines = []
    for scope in SCOPE_ORDER:
        hs = probe_hits.get(scope) or []
        if not hs:
            continue
        # diversify: at most PER_SOURCE per source (already), cap per scope, prefer different records of the Official Records
        seen_rec, picked = collections.Counter(), []
        for h in sorted(hs, key=lambda x: (-x.get('score', 0), x['off'])):
            info = describe_hit(ctx, h)
            h['info'] = info
            key = info.get('part') or h['sid']
            if seen_rec[key] >= 2:
                continue
            seen_rec[key] += 1
            picked.append(h)
            if len(picked) >= CAPS[scope]:
                break
        for h in picked:
            info = h['info']
            where = h['sid'] + ((' ' + str(h['part'])) if h.get('part') and scope == 'news' else '')
            if scope == 'or':
                head = '%s, p. %s' % (info.get('who') or h['sid'], info.get('page'))
                lines.append('- **OR27** [%s] offset %d: "%s"' % (head, h['off'], h['snippet'].replace('"', "'")))
            else:
                pg = (', page %s (%s)' % (info['page'], info['page_basis'])) if info.get('page') else ''
                lines.append('- **%s** `%s`%s offset %d: "%s"' % (where, h['path'], pg, h['off'], h['snippet'].replace('"', "'")))
    return lines


def load_arrivals():
    a = L.load_json(ARR_JSON)
    by = collections.defaultdict(list)
    for r in a['rows']:
        for c in r.get('conflicts') or []:
            if isinstance(c, dict) and c.get('id'):
                by[c['id']].append(r)
    return by


TOKEN_FILES = None
SUBJ = {}


def token_files():
    """Files searched for the id strings: horde shards, corrections, timeline files, governance and app files."""
    G = L.GOV
    groups = collections.OrderedDict()
    groups['shards'] = []
    for dp, dn, fn in os.walk(os.path.join(G, 'horde')):
        dn[:] = [d for d in dn if d not in ('images', 'scripts', 'ws-conflicts')]
        for f in sorted(fn):
            if f.endswith(('.jsonl', '.md', '.json')):
                p = os.path.join(dp, f)
                if os.path.getsize(p) < 12 * 10 ** 6:
                    groups['shards'].append(p)
    groups['corrections'] = [os.path.join(G, 'evidence_corrections', f) for f in sorted(os.listdir(os.path.join(G, 'evidence_corrections')))] + \
                            [os.path.join(G, 'timeline_corrections', f) for f in sorted(os.listdir(os.path.join(G, 'timeline_corrections')))]
    groups['timeline'] = [os.path.join(G, f) for f in ('timeline_seed.jsonl', 'timeline_verified.jsonl', 'timeline_windows.jsonl')]
    groups['governance'] = [os.path.join(G, 'decision_log.md'), os.path.join(G, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md'), os.path.join(G, 'decisions', 'conflict_defaults.json'),
                            os.path.join(G, 'requirements.json'), os.path.join(G, 'subreq_links.json'), os.path.join(G, 'conflicts_structured.json')]
    for sub in ('gate_results', 'briefs'):
        d = os.path.join(G, sub)
        if os.path.isdir(d):
            groups['governance'] += [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(('.md', '.py'))]
    groups['app'] = []
    for base in (os.path.join(L.BT, 'app'),):
        for dp, dn, fn in os.walk(base):
            dn[:] = [d for d in dn if d not in ('node_modules', 'shots', 'baseline')]
            for f in sorted(fn):
                if f.endswith(('.mjs', '.js', '.json', '.md', '.html')) and os.path.getsize(os.path.join(dp, f)) < 3 * 10 ** 6:
                    groups['app'].append(os.path.join(dp, f))
    groups['history'] = [os.path.join(L.BT, 'history', f) for f in ('arrivals.json', 'ARRIVALS-NOTES.md')]
    groups['tools'] = []
    for dp, dn, fn in os.walk(os.path.join(L.ROOT, 'tools', 'bt')):
        dn[:] = [d for d in dn if d not in ('__pycache__', 'conflicts', 'life', 'town', 'medical', 'photomatch', 'acw')]
        for f in sorted(fn):
            if f.endswith(('.py', '.mjs')):
                groups['tools'].append(os.path.join(dp, f))
    return groups


def token_scan(groups):
    """{cid: {group: [(path, lineno or row id, snippet)]}} for every C-0NN token in the file groups."""
    rx = re.compile(r'(?<![A-Za-z0-9])[Cc]-?(0(?:0[1-9]|[1-3]\d|4[0-7]))(?![0-9A-Za-z])')
    res = collections.defaultdict(lambda: collections.defaultdict(list))
    for g, files in groups.items():
        for p in files:
            try:
                with open(p, encoding='utf-8', errors='replace') as f:
                    for n, line in enumerate(f, 1):
                        if not re.search(r'[Cc]-?0[0-4]\d', line):
                            continue
                        for m in rx.finditer(line):
                            cid = 'C-' + m.group(1)
                            a, b = max(0, m.start() - 140), min(len(line), m.end() + 180)
                            snip = ' '.join(line[a:b].split())
                            rid = None
                            if p.endswith('.jsonl') or line.lstrip().startswith('{'):
                                mm = re.match(r'\s*\{"(?:id|row|conflict_id)":\s*"([^"]+)"', line)
                                rid = mm.group(1) if mm else None
                            res[cid][g].append((L.rel(p), rid or n, snip))
            except OSError:
                continue
    return res


def day_labels(event_date):
    import datetime
    d = datetime.date.fromisoformat(event_date)
    labs = []
    for k in (-1, 0, 1):
        e = d + datetime.timedelta(days=k)
        labs.append('%s %d' % (e.strftime('%b'), e.day))
    return labs


def subject_scan(groups):
    """{cid: [(k, path, line, snippet)]}: lines of the shard and correction files that contain at least two distinct terms of a profile (the shards often name an event, not the id)."""
    prepared = {cid: [t.lower() for t in p['terms'] if len(t) >= 5] for cid, p in DP.P.items()}
    res = {cid: [] for cid in DP.P}
    for p in groups['shards'] + groups['corrections']:
        if p.endswith('.md') and 'proposed-register' not in p and 'REPORT' not in p:
            continue
        try:
            f = open(p, encoding='utf-8', errors='replace')
        except OSError:
            continue
        rp = L.rel(p)
        with f:
            for n, line in enumerate(f, 1):
                if len(line) < 40:
                    continue
                low = line.lower()
                for cid, terms in prepared.items():
                    k = 0
                    first = None
                    for t in terms:
                        i = low.find(t)
                        if i >= 0:
                            k += 1
                            if first is None:
                                first = i
                    if k >= 2:
                        a = max(0, first - 120)
                        res[cid].append((k, rp, n, ' '.join(line[a:a + 330].split())))
        for cid in res:
            if len(res[cid]) > 400:
                res[cid].sort(key=lambda x: -x[0])
                res[cid] = res[cid][:150]
    out = {}
    for cid, lst in res.items():
        lst.sort(key=lambda x: (-x[0], x[1], x[2]))
        per, keep = collections.Counter(), []
        for k, p, n, sn in lst:
            if per[p] >= 2:
                continue
            per[p] += 1
            keep.append((k, p, n, sn))
            if len(keep) >= 8:
                break
        out[cid] = keep
    return out


def subject_rows(terms, event_date):
    """Timeline rows (seed text) with a window within a day of the event date that contain at least two of the profile's terms: (k, row id, window, tier, snippet)."""
    out = []
    labs = day_labels(event_date)
    seedp = os.path.join(L.GOV, 'timeline_seed.jsonl')
    tl = [x.lower() for x in terms]
    with open(seedp, encoding='utf-8') as f:
        for line in f:
            try:
                r = json.loads(line)
            except ValueError:
                continue
            t = r.get('text_raw', '')
            tt = t.lower()
            win = (r.get('time_window_raw') or '')
            if not any(re.search(r'\b%s\b' % re.escape(lb), win) for lb in labs):
                continue
            k = sum(1 for x in tl if x in tt)
            if k >= 2:
                out.append((k, r['id'], r.get('time_window_raw'), r.get('tier'), ' '.join(t.split())[:260]))
    out.sort(key=lambda x: (-x[0], x[1]))
    return out[:10]


def r03_entry(cid):
    for fn in ('r03-1', 'r03-2'):
        p = os.path.join(L.GOV, 'horde', fn, 'results.jsonl')
        for line in open(p, encoding='utf-8'):
            r = json.loads(line)
            if r.get('id') == 'R03.' + cid or r.get('conflict_id') == cid:
                return fn, r
    return None, None


def pdf_notes(cid):
    """The lines of PDF page 63 notes that apply to a conflict."""
    notes = []
    L_ = L.plan_lines()
    try:
        i = next(k for k, l in enumerate(L_) if l.startswith('Notes on the register'))
    except StopIteration:
        return notes
    j = i
    while j < len(L_) and not L_[j].startswith('Open gaps in the ledger'):
        j += 1
    block = [x.strip() for x in L_[i:j] if x.strip()]
    for ln in block:
        if cid in ln or ln.startswith('Where the default is a range') and cid in ('C-034', 'C-046', 'C-047', 'C-014', 'C-021'):
            notes.append(ln)
    return notes


def dossier(cid, ctx, scan_res, tokens, arr, cand, glossary_cache):
    prof = DP.P[cid]
    reg = L.register()[cid]
    st = L.structured()[cid]
    d = L.defaults()[cid]
    out = []
    w = out.append
    w('# %s: %s' % (cid, reg['topic']))
    w('')
    w('Dossier built %s by `tools/bt/conflicts/build_dossiers.py` from the local library and the project files; it is a first retrieval, not a finding. Read `GOVERNANCE/conflicts/PLAN.md` first.' % L.today())
    w('')
    w('| | |')
    w('|---|---|')
    w('| Resolution file | `docs/battle-theatre/GOVERNANCE/conflicts/resolutions/%s.json` (and `%s.md`) |' % (cid, cid))
    w('| Validator | `python3 -I tools/bt/conflicts/validate_resolution.py %s` |' % cid)
    w('| Locate a passage | `python3 -I tools/bt/conflicts/find_passage.py <source id> --quote "..."` / `--regex "..."` / `--all --regex "..."` |')
    w('| Add a source | `python3 -I tools/bt/conflicts/add_source.py ...` (PLAN.md section 4; ledger `conflicts/SOURCES.md`) |')
    w('| Event date for the weighing | %s |' % prof['event_date'])
    w('| Kinds of value expected | %s |' % ', '.join(prof['kinds']))
    w('| In dispute | %s |' % prof['focus'])
    w('')
    # 1. register
    w(SECTIONS[0])
    w('')
    w('- id **%s**, page %d of the PDF, `default_status` `%s` (the PDF recommended default is a hypothesis, not an answer)' % (cid, reg['page'], reg['default_status']))
    w('- topic: %s' % reg['topic'])
    w('')
    lines = L.pdf_row_lines(cid) or []
    w('Row as printed in `docs/battle-theatre/BIBLE/plan-clean.txt` (PDF page %s):' % (reg['page'],))
    w('')
    w('```')
    for ln in clean_row_lines(lines):
        w(ln)
    w('```')
    w('')
    w('Register text (`conflict_register.json`, cells joined by `|`): `%s`' % reg['text'].replace('`', "'"))
    w('')
    w('| cell | value |')
    w('|---|---|')
    w('| All values (with source keys) | %s |' % ' ; '.join(v['label'] for v in st['values']))
    w('| Recommended default (PDF) | %s |' % st['pdf_recommended_default'])
    w('| Selectable alternatives | %s |' % ' ; '.join(st['selectable_alternatives']))
    w('')
    keys = L.keys_in_text(reg['text'])
    if keys:
        w('Source keys of the row, as the PDF glossary defines them:')
        w('')
        g = L.pdf_glossary()
        for k in keys:
            w('- `%s`: %s' % (k, ' / '.join(g.get(k, ['(not defined in the glossary)']))))
        w('')
    else:
        w('The row prints no source keys.')
        w('')
    nt = pdf_notes(cid)
    if nt:
        w('PDF notes on the register that name this conflict: ' + ' '.join('"%s"' % x for x in nt))
        w('')
    w('Standing PDF context (B.2.1 and B.2.2): times are local civil time of 1863 as the source gives them; the Union and Confederate clocks reportedly differed by about 20 minutes '
      '(an unnamed estimate, Stone Sentinels time note) and no row corrects for it; local mean time at Gettysburg is UTC minus 5 h 09 min; sunrise 04:35 and sunset 19:32 on Jul 1-2 (sunrise 04:36 on Jul 3). '
      'PLAN.md section 2 holds the standing notes of the register.')
    w('')
    # 2. first delegated
    w(SECTIONS[1])
    w('')
    w('- default scenario `%s`: **%s**' % (d['default_scenario_id'], d['default_label']))
    w('- tier **%s**, basis `%s`; PDF recommended default at the time: "%s"' % (d['tier'], d['basis'], d['pdf_recommended_default']))
    w('- rationale (first pass, 2026-11-11): %s' % d['rationale'])
    w('- status: %s' % d['status'])
    w('')
    w('| scenario id | label | source |')
    w('|---|---|---|')
    for s in d['scenarios']:
        w('| `%s` | %s | %s |' % (s['id'], s['label'].replace('|', '/'), s['source'].replace('|', '/')))
    w('')
    dd = tokens.get(cid, {}).get('governance', [])
    dd = [x for x in dd if 'DELEGATED-DECISIONS' in x[0] or 'decision_log' in x[0]]
    if dd:
        w('Where the delegated decision and the decision log mention it:')
        w('')
        for p, ln, sn in dd[:5]:
            w('- `%s` line %s: %s' % (p, ln, sn[:420]))
        w('')
    # 3. readers
    w(SECTIONS[2])
    w('')
    ar = arr.get(cid, [])
    if ar:
        w('**Arrival rows** (`docs/battle-theatre/history/arrivals.json`, `rows[].conflicts[]`): %d row(s) carry this conflict; the gates Q04 (arrival), Q05 (speed) and Q06 (march to position) read them.' % len(ar))
        w('')
        w('| row | unit | level | gate kind | gate default | earliest | latest | status of the default |')
        w('|---|---|---|---|---|---|---|---|')
        for r in ar[:30]:
            g = r.get('gate') or {}
            w('| %s | %s | %s | %s | %s | %s | %s | %s |' % (r['id'], (r.get('raw') or {}).get('unit', '')[:50].replace('|', '/'), r.get('level'), g.get('kind'), g.get('default'), g.get('earliest'), g.get('latest'), str(g.get('default_status') or '')[:70].replace('|', '/')))
        w('')
    else:
        w('No row of `arrivals.json` carries this conflict (checked `rows[].conflicts[].id`).')
        w('')
    w('**Gates**: `docs/battle-theatre/GOVERNANCE/gates.json` Q04 "No entity of a unit exists in the scene before its arrival window opens", Q05 position-time plausibility, Q06 march-to-position; '
      'the runners are `tools/bt/gates/q04_arrival.py` (with `q04_arrival.mjs`), `q05_speed.py`, `q06_path.py`. Gate spec section CF (`gate_results/GATE-SPEC-A.md`, CF-1 to CF-8) states what a conflict must carry (every value selectable, the default labelled, two independent non-lead sources or a flag, never a lead-only default).')
    if cid == 'C-021':
        w('')
        w('Named case in `q04_arrival.py` (Q04.6): Pickett\'s division must not be present before `sunrise_jul3` = 1863-07-03T04:36 in the default views ("not shown before dawn Jul 3"); `arrivals.json` meta.named_periods carries the time. A changed default means the gate spec and this expected value are reconciled in the open, never that the gate is lowered.')
    if cid == 'C-023':
        w('')
        w('Named case in `q04_arrival.py` (Q04.6): Stuart\'s brigades must not be present before `evening` = 1863-07-02T19:32 in the default views (Hampton\'s rear guard at Hunterstown exempt); `arrivals.json` meta.named_periods carries the time. A changed default means the gate spec and this expected value are reconciled in the open, never that the gate is lowered.')
    w('')
    # timeline rows by token
    tl = tokens.get(cid, {}).get('timeline', [])
    w('**Timeline rows that cite the id** (`timeline_seed.jsonl`, `timeline_verified.jsonl`, `timeline_windows.jsonl`):')
    w('')
    if tl:
        for p, ln, sn in tl[:12]:
            w('- `%s` %s: %s' % (p.split('/')[-1], ln, sn[:300]))
    else:
        w('- none of the three timeline files names %s in text.' % cid)
    w('')
    sr = subject_rows(prof['terms'], prof['event_date'])
    w('**Timeline rows that match the subject** (seed rows whose window is within a day of %s and that contain at least two of: %s); these are candidates for `readers` in the resolution, to be confirmed by reading the row:' % (prof['event_date'], ', '.join(prof['terms'])))
    w('')
    if sr:
        for k, rid, win, tier, sn in sr:
            w('- `%s` (window "%s", tier %s): %s' % (rid, win, tier, sn))
    else:
        w('- none.')
    w('')
    app = tokens.get(cid, {})
    for g, title in (('app', 'App data, code and tests'), ('history', 'History layer'), ('tools', 'Tools (builders, checkers, gate helpers)'), ('governance', 'Governance files')):
        items = [x for x in app.get(g, []) if not ('DELEGATED-DECISIONS' in x[0] or 'decision_log' in x[0])]
        if not items:
            continue
        w('**%s that mention %s** (id string match; confirm the context):' % (title, cid))
        w('')
        per = collections.Counter()
        n = 0
        for p, ln, sn in items:
            if per[p] >= 2:
                continue
            per[p] += 1
            w('- `%s` %s: %s' % (p, ln, sn[:260]))
            n += 1
            if n >= 14:
                break
        w('')
    # 4. shards
    w(SECTIONS[3])
    w('')
    fn, r = r03_entry(cid)
    if r:
        w('**Shard %s, first research pass of 2026-11-04** (`docs/battle-theatre/GOVERNANCE/horde/%s/results.jsonl`): verdict `%s`, tier `%s`, status `%s`.' % (fn, fn, str(r.get('verdict'))[:200], str(r.get('tier'))[:160], r.get('status')))
        w('')
        for c in (r.get('citations') or [])[:8]:
            w('- %s, %s p. %s: "%s" (%s)' % (c.get('report_id') or c.get('work'), c.get('author') or '', c.get('printed_page'), c.get('quote_under_15_words') or c.get('quote') or '', c.get('passage_ref') or ''))
        if r.get('supporting_passage_ref'):
            w('- supporting passages: %s' % str(r['supporting_passage_ref'])[:900])
        if r.get('or_values_found'):
            w('- values found in the Official Records: %s' % '; '.join(str(x) for x in r['or_values_found']))
        for sc in (r.get('scenarios') or [])[:8]:
            w('- scenario %s: %s (%s)' % (sc.get('value'), sc.get('basis'), sc.get('tier')))
        if r.get('product_marking'):
            w('- product marking of the first pass: %s' % str(r['product_marking'])[:600])
        if r.get('notes'):
            w('- notes: %s' % str(r['notes'])[:700])
        w('')
    shards = tokens.get(cid, {}).get('shards', [])
    corr = tokens.get(cid, {}).get('corrections', [])
    w('**Other shards and correction files that name %s** (%d in the shards, %d in the correction files):' % (cid, len(shards), len(corr)))
    w('')
    per = collections.Counter()
    n = 0
    for p, ln, sn in shards + corr:
        if '/r03-' in p and p.endswith('results.jsonl'):
            continue
        if per[p] >= 2:
            continue
        per[p] += 1
        w('- `%s` %s: %s' % (p, ln, sn[:420]))
        n += 1
        if n >= 18:
            break
    if n == 0:
        w('- none beyond the first pass above.')
    w('')
    ss = SUBJ.get(cid, [])
    w('**Lines of the shards and correction files about the subject** (found by the words of the profile, not by the id; at least two of: %s):' % ', '.join(t for t in prof['terms'] if len(t) >= 5))
    w('')
    if ss:
        for k, p, ln, sn in ss:
            w('- `%s` %s: %s' % (p, ln, sn[:330]))
    else:
        w('- none.')
    w('')
    # 5. passages
    w(SECTIONS[4])
    w('')
    w('Proximity probes over the whole ledger (an anchor word with every `near` pattern in a window of characters; `CLOCK` = a clock expression). Offsets are character offsets into the raw file (the convention of the validator); Official Records pages are the printed page of the scan leaf. '
      'A hit is a place to read, in context, not a quote: read the page before you cite it. Words split by a hyphen at a line end and OCR errors are not found by a literal anchor: also search with `find_passage.py --regex`.')
    w('')
    for i, pr in enumerate(prof['probes']):
        w('### %d.%d %s' % (5, i + 1, pr['label']))
        w('')
        w('anchors: %s; near: %s; scopes: %s%s' % (', '.join('"%s"' % a for a in pr['anchors']), ' AND '.join('`%s`' % n for n in pr['near']) or '-', ', '.join(pr['scope']), ('; only reports, letters and orders written by: %s' % ', '.join(pr['by'])) if pr.get('by') else ''))
        w('')
        hl = render_hits(ctx, scan_res[cid].get(i, {}))
        if hl:
            for x in hl:
                w(x)
        else:
            w('- no hit.')
        w('')
    # 6. acquire
    w(SECTIONS[5])
    w('')
    w('Probed %s with the metadata API of archive.org (SOURCES.md section 9). Reachable hosts for acquisition: archive.org, www.loc.gov, chroniclingamerica.loc.gov, www.nps.gov, www.npshistory.com, www.gutenberg.org, catalog.archives.gov; blocked (their own bot block, do not retry): babel.hathitrust.org, ehistory.osu.edu.' % (cand.get('probed')))
    w('')
    w('| key | title | identifier / host | state | text file | why for %s |' % cid)
    w('|---|---|---|---|---|---|')
    byk = {i['id']: i for i in cand['items']}
    for k in prof['acquire']:
        i = byk.get(k)
        if not i:
            w('| %s | (not in the probe) | - | not probed | - | - |' % k)
            continue
        w('| %s | %s | %s (archive.org) | %s | %s | %s |' % (k, i['title'].replace('|', '/'), i.get('identifier') or '-', i['status'], ('%s, %s bytes' % (i.get('text_file'), i.get('text_bytes'))) if i.get('text_file') else 'none', i['why'].replace('|', '/')[:220]))
    w('')
    w('The Official Records (Ser. I vol. 27 parts 1-3) and the 99 texts of workstream 9 are already local; the reports of the commanders and units named in the profile are in `OR27-1`/`OR27-2`/`OR27-3`. '
      'Other places to look, none fetched: the Library of Congress newspaper collection (chroniclingamerica.loc.gov; pages of July 1863 are already local as `CA-1863`), the National Archives catalog (catalog.archives.gov), the Park Service history pages (www.nps.gov, www.npshistory.com).')
    w('')
    # 7. hints
    w(SECTIONS[6])
    w('')
    for h in prof['hints']:
        w('- %s' % h)
    w('- Weigh by the rubric of PLAN.md section 5: who wrote it, when, where the writer stood, how he knew, which clock; a quote is never stretched beyond what it says.')
    w('- Every value of the PDF row and every scenario of the first delegated default stays selectable (positions `scenario_ids`); say whether the PDF default and the first delegated default hold (`holds`).')
    w('- When the sources cannot settle the point, list the searches that failed (`failed_searches`): class gap or irreducible; never fill a gap in.')
    w('- List the timeline rows, gates and app data that carry the value in `readers` (do not change them: the integration step does).')
    w('')
    return '\n'.join(out)


def write_index():
    """dossiers/INDEX.md: the 47 conflicts at a glance (topic, expected kind of value, PDF row, first delegated default, arrival rows that carry it)."""
    arr = load_arrivals()
    out = ['# The 47 conflicts at a glance', '',
           'Generated %s by `tools/bt/conflicts/build_dossiers.py --index`. One dossier per conflict (`C-0xx.md`); the plan is `../PLAN.md`; the validator is `tools/bt/conflicts/validate_resolution.py`. '
           'A resolution file does not exist yet for any conflict until its researcher writes it (`../resolutions/`).' % L.today(), '',
           '| id | topic | event date | kind of value | PDF values | PDF default | first delegated default (tier, basis) | arrival rows |',
           '|---|---|---|---|---|---|---|---|']
    for cid in L.IDS:
        reg, st, d, pf = L.register()[cid], L.structured()[cid], L.defaults()[cid], DP.P[cid]
        out.append('| [%s](%s.md) | %s | %s | %s | %s | %s | %s (%s, %s) | %s |' % (cid, cid, reg['topic'].replace('|', '/'), pf['event_date'], ', '.join(pf['kinds']), ' ; '.join(v['label'] for v in st['values']).replace('|', '/'),
                                                                                  st['pdf_recommended_default'].replace('|', '/'), d['default_label'].replace('|', '/'), d['tier'], d['basis'], ', '.join(r['id'] for r in arr.get(cid, [])) or '-'))
    out.append('')
    with open(os.path.join(L.DOSSIERS, 'INDEX.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out))
    return len(L.IDS)


def check():
    bad = []
    for cid in L.IDS:
        p = os.path.join(L.DOSSIERS, cid + '.md')
        if not os.path.exists(p):
            bad.append('%s: missing' % cid)
            continue
        t = L.read_text(p)
        for s in SECTIONS:
            if s not in t:
                bad.append('%s: no section %r' % (cid, s))
        if ('# %s: %s' % (cid, L.register()[cid]['topic'])) not in t:
            bad.append('%s: heading differs from the register topic' % cid)
    print('dossiers: %d expected, %d problems' % (len(L.IDS), len(bad)))
    for b in bad[:60]:
        print('  ', b)
    return 0 if not bad else 1


def main(argv):
    if '--check' in argv:
        return check()
    if '--index' in argv:
        os.makedirs(L.DOSSIERS, exist_ok=True)
        print('INDEX.md written for %d conflicts' % write_index())
        return 0
    only = [a for a in argv if L.ID_RE.match(a)] or None
    t0 = time.time()
    print('scanning the library for %d conflicts ...' % (len(only) if only else 47))
    scan_res, ctx, scopes = scan_all(only)
    print('scan done in %.0f s; reading shards, timeline and code ...' % (time.time() - t0))
    groups = token_files()
    tokens = token_scan(groups)
    SUBJ.update(subject_scan(groups))
    arr = load_arrivals()
    cand_path = os.path.join(L.TMP, 'candidates_probe.json')
    cand = L.load_json(cand_path) if os.path.exists(cand_path) else {'probed': 'not probed', 'items': []}
    os.makedirs(L.DOSSIERS, exist_ok=True)
    for cid in (only or L.IDS):
        txt = dossier(cid, ctx, scan_res, tokens, arr, cand, None)
        with open(os.path.join(L.DOSSIERS, cid + '.md'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(txt + '\n')
    if not only:
        write_index()
    print('wrote %d dossiers in %.0f s' % (len(only or L.IDS), time.time() - t0))
    return check() if not only else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
