"""Seed the Phase-0 governance files the PDF (Gettysburg Total War animation plan v2) mandates.
Reads tmp/pdf/plan-clean.txt (page markers '=== PAGE n ==='). Idempotent: rewrites generated files.
Never edits requirement wording; wording is copied from PDF Section A. Rows are SEEDED, UNVERIFIED (PDF Section D: verify before use)."""
import re, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'docs', 'battle-theatre', 'BIBLE', 'plan-clean.txt')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
L = open(SRC, encoding='utf-8').read().split('\n')
def page_of(i):
    p = 1
    for j in range(i, -1, -1):
        m = re.match(r'=== PAGE (\d+) ===', L[j])
        if m: return int(m.group(1))
    return 1
def find_after(prefix, start=0):
    return next(i for i,l in enumerate(L) if i >= start and l.startswith(prefix))
def clean(s):
    return re.sub(r'\s+', ' ', s).strip()

# ---- requirements R01..R22 (Section A, binding text) ----
LAW = find_after('THE UNBREAKABLE LAW', 300)
a0 = find_after('A. Assignment and the 22 requirements', LAW)
a1 = next(i for i,l in enumerate(L) if l.startswith('B. Boundaries and definitions') and i > a0)
txt = '\n'.join(L[a0:a1])
reqs = {}
cur = None
for l in L[a0:a1]:
    t = l.strip()
    m = re.match(r'^(R\d{2})', t)
    if m:
        cur = m.group(1); reqs[cur] = []; continue
    if t.startswith('The owner accepts') or t.startswith('Version-2 demands') or t.startswith('Original seven'):
        cur = None; continue
    if cur and t and not t.startswith('Gettysburg Total War') and not t.startswith('=== PAGE'):
        reqs[cur].append(t)
reqs = {k: clean(' '.join(v)) for k, v in reqs.items()}
assert len(reqs) == 22, (len(reqs), sorted(reqs))

# ---- gates Q01..Q28 ----
q0 = find_after('Q. Quality gates', LAW)
q1 = next(i for i,l in enumerate(L) if l.startswith('R. The Evidence-Gap Register') and i > q0)
gates, cur = {}, None
for l in L[q0:q1]:
    m = re.fullmatch(r'Q(\d{2})', l.strip())
    if m: cur = 'Q' + m.group(1); gates[cur] = []; continue
    if cur and not l.startswith('Gettysburg Total War') and not l.startswith('=== PAGE') and l.strip():
        gates[cur].append(l.strip())
gates = {k: clean(' '.join(v)) for k, v in gates.items()}
assert len(gates) == 28, len(gates)

# ---- traceability (App E): requirement -> gates ----
e0 = find_after('Appendix E. The 21-requirement', LAW)
e1 = next(i for i,l in enumerate(L) if l.startswith('Appendix F.') and i > e0)
trace = {}
block = L[e0:e1]
for i, l in enumerate(block):
    if re.fullmatch(r'R\d{2}', l.strip()):
        rid = l.strip(); gs = []
        for nxt in block[i+1:i+14]:
            if re.fullmatch(r'R\d{2}', nxt.strip()): break
            gs += re.findall(r'Q\d{2}', nxt)
        trace[rid] = sorted(set(gs))

# ---- conflict register C-001..C-047 ----
c0 = find_after('B.2.5 Conflict register', 300)
c1 = next(i for i,l in enumerate(L) if l.startswith('Notes on the register:') and i > c0)
conf, cur = [], None
for i in range(c0, c1):
    l = L[i].strip()
    if re.fullmatch(r'C-\d{3}', l):
        cur = {'id': l, 'page': page_of(i), 'lines': []}; conf.append(cur); continue
    if cur and l and not l.startswith('Gettysburg Total War') and not l.startswith('=== PAGE'):
        cur['lines'].append(l)
for c in conf:
    c['topic'] = c['lines'][0] if c['lines'] else ''
    c['text'] = clean(' | '.join(c['lines']))
    del c['lines']
    c['default_status'] = 'PDF_RECOMMENDED_DEFAULT_PENDING_OWNER_DECISION'
assert len(conf) == 47, len(conf)

# ---- timeline rows T1/T2/T3 (SEEDED UNVERIFIED) ----
tiers = {'documented', 'inferred', 'plausible-procedural', 'open gap'}
rows, cur = [], None
for i, l in enumerate(L):
    s = l.strip()
    if re.fullmatch(r'T[123]-\d{3}', s):
        cur = {'id': s, 'page': page_of(i), 'lines': []}; rows.append(cur); continue
    if cur is None: continue
    if s.startswith('Conflict highlights for this period') or s.startswith('B.2.2 July 2') or s.startswith('B.2.3 July 3') or s.startswith('B.2.4 Unit arrival') or s.startswith('Table notes'):
        cur = None; continue
    if s and not s.startswith('Gettysburg Total War') and not s.startswith('=== PAGE'):
        cur['lines'].append(s)
seen = {}
for r in rows:
    ls = r['lines']
    r['tier'] = next((t for x in ls for t in ('documented','inferred','plausible-procedural','open gap') if x == t or x.startswith(t + ' (')), None)
    r['time_window_raw'] = ls[0] if ls else ''
    r['text_raw'] = clean(' | '.join(ls))
    r['status'] = 'seeded_unverified'   # PDF Section D: verify each line against primary source before it enters the product
    del r['lines']
    seen.setdefault(r['id'], []).append(r)
# a row can straddle a page break and show its ID twice; keep the first, merge text
merged = []
for rid, lst in seen.items():
    base = lst[0]
    if len(lst) > 1:
        base['text_raw'] = clean(' | '.join(x['text_raw'] for x in lst))
        base['tier'] = base['tier'] or next((x['tier'] for x in lst if x['tier']), None)
    merged.append(base)
rows = merged
WEAK = re.compile(r'(?<![A-Z0-9-])(EPP|CWT|PADRE|WHB|WOMENHIST-[A-Z]+|CWT-[A-Z]+|ROSEB|CALEF-CWT|DW|HNN)(?![A-Z0-9])')
for r in rows: r['weak_source_flag'] = bool(WEAK.search(r['text_raw'].split('|')[-1] if '|' in r['text_raw'] else ''))
counts = {}
for r in rows: counts[r['id'][:2]] = counts.get(r['id'][:2], 0) + 1

# ---- open research questions (App C.3) ----
o0 = find_after('C.3 Open research questions', LAW)
o1 = next(i for i,l in enumerate(L) if l.startswith('C.4 Total War open questions') and i > o0)
oq = clean(' '.join(l for l in L[o0:o1] if not l.startswith('Gettysburg Total War') and not l.startswith('=== PAGE')))
questions = [clean(x) for x in re.split(r'(?<=[\.\?\)])\s+(?=\d{1,2}\. [A-Z])', oq)]
questions = [q for q in questions if re.match(r'^\d{1,2}\. ', q) or True]

os.makedirs(OUT, exist_ok=True)
json.dump({'requirements': reqs, 'trace_gates': trace}, open(os.path.join(OUT, '_req_src.json'), 'w', encoding='utf-8'), indent=1)
json.dump(gates, open(os.path.join(OUT, 'gates.json'), 'w', encoding='utf-8'), indent=1)
json.dump(conf, open(os.path.join(OUT, 'conflict_register.json'), 'w', encoding='utf-8'), indent=1)
with open(os.path.join(OUT, 'timeline_seed.jsonl'), 'w', encoding='utf-8') as f:
    for r in rows: f.write(json.dumps(r, ensure_ascii=False) + '\n')
json.dump(questions, open(os.path.join(OUT, '_open_questions.json'), 'w', encoding='utf-8'), indent=1)
print('requirements', len(reqs), 'gates', len(gates), 'conflicts', len(conf), 'timeline rows', len(rows), counts, 'questions', len(questions))
print('tier counts', {t: sum(1 for r in rows if r['tier'] == t) for t in list(tiers) + [None]})
