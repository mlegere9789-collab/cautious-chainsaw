#!/usr/bin/env python3
"""Build GATE-SPEC-B.md of the sixth pass from pass6/GATE-SPEC-B.before-pass6.md (the file as the fifth pass left it), the text blocks of blocks_a.py and blocks_b.py, the gate bullets of
gate_bullets_part*.txt and the run files of this folder.  Idempotent: it always starts from the before-copy, so it can be run again when a locked job has finished.

    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/build_doc.py [--dry]

Tokens in the text: {{T:<run name>}} the test result of a run (light-runs.tsv, heavy-a-runs.tsv), {{R:Qnn}} the re-run of a runner into a scratch folder against the stored record,
{{L:life|town|medical|realize}} the read-only validators and the realization digest, {{LOCKSTATE}} what became of the two locked jobs.  A token whose run file does not exist yet becomes a
plain statement that it was not run when this was written (never a number)."""
import os, re, sys, json, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 6)))
GR = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'gate_results')
DOC = os.path.join(GR, 'GATE-SPEC-B.md')
BEFORE = os.path.join(HERE, 'GATE-SPEC-B.before-pass6.md')
SCR = os.path.join(ROOT, 'tmp', 'bt-gates', 'pass6')
sys.path.insert(0, HERE)
import blocks_a as A, blocks_b as B  # noqa: E402

rd = lambda p: open(p, encoding='utf-8', errors='replace').read()


def tsv(path):
    out = {}
    if not os.path.exists(path):
        return out
    for l in rd(path).split('\n'):
        p = l.split('\t')
        if len(p) < 5 or l.startswith('#') or not re.match(r'\d{4}-', p[0]):
            continue
        m_exit = re.match(r'exit (\d+)', p[2]); m_wall = re.match(r'wall ([\d.]+) s', p[3]); m_cpu = re.match(r'cpu ([\d.]+) s', p[4])
        out[p[1]] = {'start': p[0], 'exit': int(m_exit.group(1)) if m_exit else None, 'wall': float(m_wall.group(1)) if m_wall else None, 'cpu': float(m_cpu.group(1)) if m_cpu else None}
    return out


LIGHT = tsv(os.path.join(HERE, 'light-runs.tsv'))
LIGHT2 = tsv(os.path.join(HERE, 'light2-runs.tsv'))
LIGHT3 = tsv(os.path.join(HERE, 'light3-runs.tsv'))
HEA = tsv(os.path.join(HERE, 'heavy-a-runs.tsv'))
HEC = tsv(os.path.join(HERE, 'heavy-c-runs.tsv'))
RUNS = {}
for d in (LIGHT, LIGHT2, LIGHT3, HEA, HEC):
    RUNS.update(d)
hm = lambda s: s[11:16] if s else '?'
fmt = lambda x: ('%d' % round(x)) if x >= 10 else ('%.1f' % x)


def run_phrase(name):
    r = RUNS.get(name)
    return '' if not r else 'exit %s, %s s of CPU, %s s of wall time, at %s UTC' % (r['exit'], fmt(r['cpu']), fmt(r['wall']), hm(r['start']))


def tap_counts(name):
    p = os.path.join(HERE, name + '.out')
    if not os.path.exists(p):
        return None
    t = rd(p)
    c = {}
    for k in ('tests', 'pass', 'fail', 'skipped'):
        m = re.search(r"^# %s (\d+)" % k, t, re.M) or re.search(r"'%s': '(\d+)'" % k, t)
        if m:
            c[k] = int(m.group(1))
    m = re.search(r'^Ran (\d+) tests? in', t, re.M)
    if m and 'tests' not in c:
        c['tests'] = int(m.group(1)); ok = re.search(r'^OK\b', t, re.M); c['pass'] = int(m.group(1)) if ok else None
        mf = re.search(r'FAILED \((?:failures=(\d+))?(?:, )?(?:errors=(\d+))?', t)
        c['fail'] = (int(mf.group(1) or 0) + int(mf.group(2) or 0)) if mf else 0
        if not ok and c['pass'] is None:
            c['pass'] = c['tests'] - c['fail']
    return c if 'tests' in c else None


TFILE = {'gates_test_q03_scene': 'test_q03_scene.py', 'medical_evidence_test': 'medical-evidence.test.mjs', 'vegetation_test': 'vegetation.test.mjs', 'vegetation_scene_test': 'vegetation-scene.test.mjs', 'weather3d_gpu_test': 'weather3d-gpu.test.mjs', 'crowd_lod_test': 'crowd-lod.test.mjs',
         'photomatch_q16_test': 'photomatch-q16.test.mjs', 'photomatch_old_test': 'tests/photomatch.test.mjs', 'realize_inputs_test': 'realize-inputs.test.mjs', 'bt_pack_test': 'the two pack test files'}


def tok_T(name):
    label = TFILE.get(name, name)
    c = tap_counts(name)
    if not c or name not in RUNS:
        return '%s: not run when this was written (%s).' % (label[0].upper() + label[1:] if label.startswith('the ') else '`%s`' % label, 'its locked job had not started' if name in ('realize_inputs_test', 'bt_pack_test') else 'see 7.8')
    s = '%s at %s UTC: %d tests, %s pass, %s fail%s (%s).' % ((label[0].upper() + label[1:]) if label.startswith('the ') else '`%s`' % label, hm(RUNS[name]['start']), c['tests'], c.get('pass', '?'), c.get('fail', '?'), (', %d skipped' % c['skipped']) if c.get('skipped') else '', run_phrase(name))
    return s


def last_lines(name, n=2):
    p = os.path.join(HERE, name + '.out')
    if not os.path.exists(p):
        return None
    ls = [l.strip() for l in rd(p).split('\n') if l.strip()]
    return ls[-n:]


def tok_L(kind):
    if kind == 'life':
        x = last_lines('life_validate_all', 1)
        return ('`tools/bt/life/validate_evidence.py --all` (%s): "%s".' % (run_phrase('life_validate_all'), x[-1][:200])) if x and 'life_validate_all' in RUNS else 'The OA11 validator was not run when this was written.'
    if kind == 'town':
        t = rd(os.path.join(HERE, 'town_validate_all.out')) if os.path.exists(os.path.join(HERE, 'town_validate_all.out')) else ''
        ls = [l.strip() for l in t.split('\n') if l.strip()]
        nst = len(re.findall(r'no evidence file \(not started\)', t))
        return ('`tools/bt/town/validate_evidence.py --all --allow-missing` (%s): first line "%s", then %d groups with "no evidence file (not started)" as warnings.' % (run_phrase('town_validate_all'), ls[0][:170], nst)) if ls and 'town_validate_all' in RUNS else 'The OA10 validator was not run when this was written.'
    if kind == 'medical':
        x = last_lines('medical_validate_all', 1)
        return ('`tools/bt/medical/validate_evidence.py --all --summary` (%s): "%s".' % (run_phrase('medical_validate_all'), x[-1][:200])) if x and 'medical_validate_all' in RUNS else 'The OA12 validator was not run when this was written.'
    if kind == 'realize':
        p = os.path.join(SCR, 'RESULTS-scratch.json')
        if not os.path.exists(p) or 'realize_scratch' not in RUNS:
            return 'The realization harness was not run when this was written.'
        d = json.load(open(p, encoding='utf-8'))
        q = d.get('q17', {})
        dg = last_lines('realize_digests', 6) or []
        return ('A scratch run of `tools/bt/realize/check.mjs --out tmp/bt-gates/pass6/RESULTS-scratch.json` (%s) gives `q17`: ok %s, ok_strict %s, realized by scene %s, by a card alone %s, covered by an open register entry only %s, uncovered %s (%s strict), epilogue rows uncovered %s; the stored `RESULTS.json` was not rewritten.'
                % (run_phrase('realize_scratch'), q.get('ok'), q.get('ok_strict'), q.get('realized_by_scene'), q.get('realized_by_card_only'), q.get('covered_by_open_register_entry'), q.get('uncovered'), q.get('uncovered_strict'), (q.get('epilogue') or {}).get('uncovered') if isinstance(q.get('epilogue'), dict) else q.get('epilogue_uncovered')))
    return ''


def load(p):
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def tok_R(g):
    stored = load(os.path.join(GR, g + '.json'))
    outdir = os.path.join(SCR, 'results-c') if g in ('Q03', 'Q04', 'Q05', 'Q06') else os.path.join(SCR, 'results')
    cur = load(os.path.join(outdir, g + '.json'))
    name = 'run_%s%s' % (g.lower(), '_full' if g == 'Q03' else '_default' if g in ('Q04', 'Q05', 'Q06') else '')
    if cur is None or name not in RUNS:
        if g in ('Q03', 'Q04', 'Q05', 'Q06'):
            return 'Run at this pass: not done (the locked job C, queued at 02:46:04 UTC, had not started when this was written; see 7.8).'
        return 'Re-run at this pass: not done when this was written.'
    c = cur['counts']
    desc = 'verdict %s, %s items: PASS %s, FAIL %s, BLOCKED-INPUT %s, NOT-RUN %s, N/A %s, COVERED %s' % (cur['verdict'], format(len(cur['items']), ','), format(c['PASS'], ','), format(c['FAIL'], ','), format(c['BLOCKED-INPUT'], ','), format(c['NOT-RUN'], ','), format(c['N/A'], ','), format(c['COVERED'], ','))
    if stored is None:
        scn = cur.get('scenario_set') or {}
        return 'Run at this pass into a scratch folder (%s; no record is stored for this gate): %s%s.' % (run_phrase(name), desc, ('; scenarios %s (%s)' % (scn.get('id'), scn.get('count'))) if scn else '')
    same = (stored['counts'] == c and stored['verdict'] == cur['verdict'])
    if same:
        rel = 'the same verdict and the same counts as the stored record'
    else:
        sc = stored['counts']
        rel = 'it differs from the stored record (%s; %s items): stored PASS %s, FAIL %s, BLOCKED-INPUT %s, N/A %s, NOT-RUN %s' % (stored['verdict'], format(len(stored['items']), ','), format(sc['PASS'], ','), format(sc['FAIL'], ','), format(sc['BLOCKED-INPUT'], ','), format(sc['N/A'], ','), format(sc['NOT-RUN'], ','))
    return 'Re-run at this pass into a scratch folder (%s): %s; %s.' % (run_phrase(name), desc, rel)


def tok_RERUNS():
    same, diff = [], []
    for g in ('Q23', 'Q19', 'Q02', 'Q01', 'Q14', 'Q20', 'Q25'):
        s = load(os.path.join(GR, g + '.json')); c = load(os.path.join(SCR, 'results', g + '.json'))
        if s is None or c is None or ('run_' + g.lower()) not in RUNS:
            continue
        (same if (s['counts'] == c['counts'] and s['verdict'] == c['verdict']) else diff).append((g, len(s['items']), len(c['items'])))
    if not same and not diff:
        return 'the seven re-runs of 7.8 were not done when this was written.'
    out = 'the re-runs of %s into a scratch folder gave the verdict and the counts of their stored records' % ', '.join(g for g, _, _ in same) if same else ''
    for g, a_, b_ in diff:
        tail = tok_CUR(g).rstrip('.').split('; ', 1)[1].replace('; ', ', and ') if '; ' in tok_CUR(g) else 'see 7.8'
        out += ('; ' if out else '') + 'the re-run of %s differs from its stored record (%s items against %s), and its inputs are no longer those of the stored record: %s; that is the likely reason, not a proven one, because a record does not name the version of the runner that made it (2.6)' % (g, format(b_, ','), format(a_, ','), tail)
    return out + '.'


def lockstate():
    parts = []
    for jid, tsvp, desc in (('A', 'heavy-a-runs.tsv', 'the browser probe, the realization inputs test, the pack tests and check_figures'), ('C', 'heavy-c-runs.tsv', 'the runners of Q03 to Q06 into a scratch folder')):
        p = os.path.join(HERE, tsvp)
        if os.path.exists(p) and len(rd(p).strip().split('\n')) > 0 and rd(p).strip():
            rows = [l for l in rd(p).split('\n') if re.match(r'\d{4}-', l)]
            done = 'done ' in rd(p)
            parts.append('job %s (%s) %s: %d of its steps had a result in `%s`' % (jid, desc, 'finished' if done else 'started', len(rows), tsvp))
        else:
            parts.append('job %s (%s) had not started when this was written' % (jid, desc))
    return '; '.join(parts) + '. 7.8 has the table of what each ran.'


def cur_counts(g):
    import hashlib
    r = load(os.path.join(GR, g + '.json'))
    if r is None:
        return None
    same = 0; diff = []; miss_then_miss = []; now_present = []
    for i in r.get('inputs') or []:
        p = i.get('path')
        if not p:
            continue
        full = os.path.join(ROOT, *p.split('/'))
        if i.get('missing') or not i.get('sha256'):
            (now_present if os.path.exists(full) else miss_then_miss).append(p)
            continue
        if not os.path.exists(full):
            diff.append(p + ' (gone)'); continue
        h = hashlib.sha256()
        with open(full, 'rb') as f:
            for blk in iter(lambda: f.read(1 << 20), b''):
                h.update(blk)
        if h.hexdigest() == i['sha256']:
            same += 1
        else:
            diff.append(p)
    return {'same': same, 'diff': diff, 'miss': miss_then_miss, 'now': now_present, 'n': len(r.get('inputs') or [])}


def tok_CUR(g):
    import datetime
    c = cur_counts(g)
    if c is None:
        return 'there is no stored record.'
    same, diff, miss_then_miss, now_present, n = c['same'], c['diff'], c['miss'], c['now'], c['n']
    short = lambda p: p.replace('docs/battle-theatre/', '').replace('GOVERNANCE/', '')
    s = 'at %s UTC %d of the %d files the record hashed equal today\'s files' % (datetime.datetime.now(datetime.timezone.utc).strftime('%H:%M'), same, n)
    if diff:
        s += '; %d differ (%s%s)' % (len(diff), ', '.join('`%s`' % short(x) for x in diff[:4]), (' and %d more' % (len(diff) - 4)) if len(diff) > 4 else '')
    if miss_then_miss:
        s += '; %d %s missing then and %s missing now (%s)' % (len(miss_then_miss), 'was' if len(miss_then_miss) == 1 else 'were', 'is' if len(miss_then_miss) == 1 else 'are', ', '.join('`%s`' % short(x) for x in miss_then_miss[:3]))
    if now_present:
        s += '; %d %s missing then and exist%s now (%s)' % (len(now_present), 'was' if len(now_present) == 1 else 'were', 's' if len(now_present) == 1 else '', ', '.join('`%s`' % short(x) for x in now_present[:3]))
    return s + '.'


def tok_CURSUM():
    import datetime
    parts = []
    for g in ('Q01', 'Q02', 'Q14', 'Q19', 'Q20', 'Q23', 'Q25'):
        c = cur_counts(g)
        if c is not None:
            parts.append('%s %d of %d' % (g, len(c['diff']), c['n']))
    return 'at %s UTC the files that differ from their recorded sha256, over the files each record names, were %s' % (datetime.datetime.now(datetime.timezone.utc).strftime('%H:%M'), ', '.join(parts))


def expand(t):
    t = re.sub(r'\{\{T:([a-z0-9_]+)\}\}', lambda m: tok_T(m.group(1)), t)
    t = re.sub(r'\{\{L:([a-z]+)\}\}', lambda m: tok_L(m.group(1)), t)
    t = re.sub(r'\{\{R:(Q\d\d)\}\}', lambda m: tok_R(m.group(1)), t)
    t = re.sub(r'\{\{CUR:(Q\d\d)\}\}', lambda m: tok_CUR(m.group(1)), t)
    t = t.replace('{{LOCKSTATE}}', lockstate())
    t = t.replace('{{CURSUM}}', tok_CURSUM())
    t = t.replace('{{RERUNS}}', tok_RERUNS())
    qp = os.path.join(HERE, 'quotes_result.txt')
    t = t.replace('{{QUOTES}}', rd(qp).strip() if os.path.exists(qp) else 'it had not been run when this was written.')
    return t


# ------------------------------------------------------------------ the document
text = rd(BEFORE)
lines_n = text.count('\n')


def once(hay, needle):
    assert hay.count(needle) == 1, ('anchor not unique or missing', needle[:90], hay.count(needle))


def replace1(t, old, new):
    once(t, old)
    return t.replace(old, new)


def insert_before(t, anchor, block):
    once(t, anchor)
    return t.replace(anchor, block + anchor)


# header, reading guide
t = text
t = insert_before(t, 'Reading guide. Section 3 is the one-page answer', A.H1 + '\n\n')
t = replace1(t, A.H2_OLD, A.H2_NEW)
# section 1
t = insert_before(t, '\n\n### 1.1 The browser harness', '\n' + A.S1)
t = insert_before(t, '\n## 2. Governance machinery as it stands', '\n' + A.S11 + '\n')
# section 2.1
t = replace1(t, A.GATE_RESULTS_ROW_OLD, A.GATE_RESULTS_ROW_NEW)
t = replace1(t, A.F21_OLD, A.F21_NEW); t = replace1(t, A.F22_OLD, A.F22_NEW); t = replace1(t, A.F23_OLD, A.F23_NEW)
t = insert_before(t, '\n### 2.2 Sub-requirements per gate', '\n' + A.ARRIVED6 + '\n')
t = insert_before(t, '\n### 2.3 The existing checkers of this workstream', '\n' + A.P22 + '\n')
t = insert_before(t, '\n### 2.4 Facts in this code that bind any runner or pass rule', '\n' + A.P23 + '\n')
t = insert_before(t, '\n\n### 2.5 The history layer', '\n' + A.I24)
sec26 = rd(os.path.join(HERE, 'section_26.md')).rstrip('\n')
t = insert_before(t, '\n## 3. Summary', '\n' + A.P25 + '\n\n' + sec26 + '\n')

# section 3: summary table rows
head3 = t.index('\n## 3. Summary')
end3 = t.index('\n### 3.1 What moved since the fourth pass')
sect3 = t[head3:end3]
rows = sect3.split('\n')
for i, l in enumerate(rows):
    m = re.match(r'^\| (Q\d\d) \|', l)
    if m and m.group(1) in B.ROWS:
        cells = [c for c in l.split(' | ')]
        # a row is "| Qnn | c2 | c3 | c4 |": split on ' | ' keeps the outer bars in the first and last cell
        first = cells[0]; last = cells[-1]
        c = [first.lstrip('| ')] + cells[1:-1] + [last.rstrip(' |')]
        assert len(c) == 4, (m.group(1), len(c))
        add3, new4 = B.ROWS[m.group(1)]
        c[2] = c[2] + add3
        if new4 is not None:
            c[3] = new4
        rows[i] = '| ' + ' | '.join(c) + ' |'
sect3 = '\n'.join(rows)
t = t[:head3] + sect3 + t[end3:]

# 3.0, 3.1 (new), 3.1.1 (old renamed)
sec30 = rd(os.path.join(HERE, 'section_30.md')).rstrip('\n') if os.path.exists(os.path.join(HERE, 'section_30.md')) else ''
sec31 = rd(os.path.join(HERE, 'section_31.md')).rstrip('\n') if os.path.exists(os.path.join(HERE, 'section_31.md')) else ''
t = replace1(t, '### 3.1 What moved since the fourth pass, at a glance', '### 3.1.1 What moved since the fourth pass, at a glance (written at the fifth pass)')
t = insert_before(t, '\n### 3.1.1 What moved since the fourth pass', '\n' + sec30 + '\n\n' + sec31 + '\n')
sec32 = rd(os.path.join(HERE, 'section_32.md')).rstrip('\n') if os.path.exists(os.path.join(HERE, 'section_32.md')) else ''
sec33 = rd(os.path.join(HERE, 'section_33.md')).rstrip('\n') if os.path.exists(os.path.join(HERE, 'section_33.md')) else ''
t = insert_before(t, '\n### 3.3 Calls that were tried at the fifth pass', '\n' + sec32 + '\n')
t = insert_before(t, '\n## 4. The gates', '\n' + sec33 + '\n')

# section 4: bullets
bul = {}
cur = None
for part in sorted(glob.glob(os.path.join(HERE, 'gate_bullets_part*.txt'))):
    for line in rd(part).split('\n'):
        m = re.match(r'^@@(Q\d\d)$', line)
        if m:
            cur = m.group(1); assert cur not in bul, cur; bul[cur] = []
        elif cur is not None and line.strip():
            bul[cur].append(line.strip())
assert sorted(bul) == ['Q%02d' % i for i in range(1, 29)], sorted(bul)
bul = {k: expand(' '.join(v)) for k, v in bul.items()}
L = t.split('\n')
starts = [(k, ln) for k, ln in enumerate(L) if re.match(r'^### Q\d\d$', ln)]
assert len(starts) == 28
plan = []
for idx, (k, ln) in enumerate(starts):
    j = k + 1
    while j < len(L) and not L[j].startswith('## ') and not L[j].startswith('### '):
        j += 1
    runs = [x for x in range(k, j) if L[x].startswith('- **Runs.**')]
    assert len(runs) == 1, (ln, len(runs))
    plan.append((runs[0], ln[4:]))
for runs_i, g in sorted(plan, reverse=True):
    L.insert(runs_i, '- **Updated at pass 6.** ' + bul[g])
t = '\n'.join(L)

# section 5
t = insert_before(t, '\n\nNo threshold was changed for this note.', '\n' + B.T51_ROWS)
t = insert_before(t, '\n\n### 5.2 Places where the code shows a stricter reading', '\n\n' + B.T51_AFTER)
t = insert_before(t, '\n\n### 5.3 The twelve owner-chat rows', '\n' + B.R52)
t = insert_before(t, '\n\n### 5.4 What a runner must not do', '\n\n' + B.U53)
t = insert_before(t, '\n\n## 6. Relation to the end-of-mission acceptance', '\n' + B.M54)
t = insert_before(t, '\n\n## 7. What was run for this note', '\n\n- ' + B.P6)

# sections 7.8 and 8.9 to 8.11
sec78 = rd(os.path.join(HERE, 'section_78.md')).rstrip('\n') if os.path.exists(os.path.join(HERE, 'section_78.md')) else ''
sec8 = rd(os.path.join(HERE, 'section_8x.md')).rstrip('\n') if os.path.exists(os.path.join(HERE, 'section_8x.md')) else ''
t = insert_before(t, '\n## 8. The re-verification pass', '\n' + sec78 + '\n')
t = t.rstrip('\n') + '\n\n' + sec8 + '\n'
t = expand(t)

if '--dry' in sys.argv:
    print('dry run: %d characters (before: %d); gates with bullets: %d' % (len(t), len(text), len(bul)))
    sys.exit(0)
open(DOC, 'w', encoding='utf-8').write(t)
print('written %s: %d characters (before-pass-6 copy: %d)' % (DOC, len(t), len(text)))
