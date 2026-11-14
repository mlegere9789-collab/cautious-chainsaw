#!/usr/bin/env python3
"""Check that the counts and id ranges GATE-SPEC-A.md states agree with the files they were counted from, and that its own
numbering is complete: classes of 2.2 against requirements.json; the OA derived gates OA-G01.. against the owner rows;
U-01.., A-01.., DD-G01.. contiguous and the Contents line equal to the last; the 71 requirement-level checks of section 5;
register, timeline, correction-record, library-word and night-minute counts. Reads files only (one `node` call for the night
count, 1 s). Prints one line per check and a JSON summary; exit 1 when any check is a MISMATCH.
Usage: python3 -I check_counts.py [path-to-spec]"""
import json, os, re, sys, glob, subprocess, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import GOV, ROOT, SPEC

doc = sys.argv[1] if len(sys.argv) > 1 else SPEC
spec = open(doc, encoding='utf-8').read()
J = lambda p: json.load(open(os.path.join(GOV, p), encoding='utf-8'))
JL = lambda p: [json.loads(l) for l in open(os.path.join(GOV, p), encoding='utf-8') if l.strip()]
results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('OK       ' if ok else 'MISMATCH ') + name + (' :: ' + detail if detail and not ok else ''))


def has(pattern, text=None, flags=0):
    return re.search(pattern, spec if text is None else text, flags) is not None


def section(title_prefix, next_prefix):
    a = spec.index(title_prefix); b = spec.index(next_prefix, a + 1)
    return spec[a:b]


# ---------------------------------------------------------------- requirements.json classes
req = J('requirements.json'); subs = req['sub_requirements']


def klass(sid):
    if re.match(r'R11\.\d{4}$', sid) and not sid.endswith('0000'): return 'TL'
    if re.match(r'R22\.\d{4}$', sid) and not sid.endswith('0000'): return 'EP'
    if re.match(r'R14\.S-', sid): return 'SS'
    if re.match(r'R14\.E-', sid): return 'WK'
    if re.match(r'R13\.G-', sid): return 'GE'
    if re.match(r'R13\.P-', sid): return 'PE'
    if re.match(r'R12\.\d{3}$', sid): return 'CT'
    if re.match(r'R03\.C-', sid): return 'CF'
    if re.match(r'R\d\d\.0000$', sid): return 'TOP'
    if re.match(r'OA\d\d\.0000$', sid): return 'OA'
    return 'OTHER'


cls = collections.Counter(klass(s['id']) for s in subs)
check('no sub-requirement outside the ten classes', cls.get('OTHER', 0) == 0, str(cls))
sec22 = section('### 2.2 The classes in `requirements.json`', '### 2.3')
rows22 = {m.group(1): int(m.group(2)) for m in re.finditer(r'(?m)^\| ([A-Z]{2,3}) \| [^|]+ \| [^|]+ \| (\d+) \|', sec22)}
for k in ('TL', 'EP', 'SS', 'WK', 'GE', 'PE', 'CT', 'CF', 'TOP', 'OA'):
    check(f'2.2 class {k} count {rows22.get(k)} equals requirements.json {cls[k]}', rows22.get(k) == cls[k])
check('2.2 total equals the number of rows', has(r'\| \| Total \| \| %d \|' % len(subs), sec22), f'{len(subs)} rows')
orig = collections.Counter(s['origin'] for s in subs)
check('1.1 origin counts', has(r'\(%d rows on 2026-11-14: %d `origin: pdf`, %d `origin: owner_chat`' % (len(subs), orig['pdf'], orig['owner_chat'])), str(dict(orig)))
check('1.3 "on all N rows" equals the total', has(r'on all %d rows' % len(subs)))
oa = sorted(s['id'][:4] for s in subs if klass(s['id']) == 'OA')
check('OA rows are OA01..OAnn without a gap', oa == [f'OA{i:02d}' for i in range(1, len(oa) + 1)], str(oa))
sec310 = section('### 3.10 OA:', '## 4. The 28 gates')
defined_oag = sorted(set(re.findall(r'(?m)^\| OA\d\d \((OA-G\d\d)\) \|', sec310)))
check('3.10 defines one derived gate per OA row', defined_oag == [f'OA-G{i:02d}' for i in range(1, len(oa) + 1)], str(defined_oag))
check('3.10 says "twelve rows" and OA-G01 to OA-G12 for %d rows' % len(oa), len(oa) == 12 and has(r'These twelve rows') and has(r'OA-G01 to OA-G12'))
single = [r for r, n in collections.Counter(s['requirement_id'] for s in subs).items() if n == 1 and r.startswith('R')]
check('3.9 sixteen requirements have a single row', len(single) == 16 and has(r'16 requirements have a single row'), str(single))

# ---------------------------------------------------------------- the 71 requirement-level checks
sec5 = section('## 5. Requirement-level checks', '## 6.')
rc = re.findall(r'RC-R(\d\d)\.(\d+)', sec5)
per = collections.Counter(r for r, _ in rc)
rc_ids = {f'R{r}.{k}' for r, k in rc}
check('5 RC items: 71', len(rc_ids) == 71, str(len(rc_ids)))
check('5 every requirement R01..R22 has its RC items numbered from 1 without a gap',
      all(sorted(int(k) for r, k in rc if r == f'{n:02d}') == list(range(1, per[f'{n:02d}'] + 1)) for n in range(1, 23)))
single_rc = sum(per[r[1:]] for r in ('R01', 'R02', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R15', 'R16', 'R18', 'R19'))
check('2.3 and 3.9: 39 of the 71 are the children of the 12 single-row requirements', single_rc == 39 and has(r'39 of (?:them|the 71)'), str(single_rc))
check('5 each top row of requirements.json appears in section 5', all(has(r'\| %s \|' % re.escape(s['id']), sec5) for s in subs if klass(s['id']) == 'TOP'))

# ---------------------------------------------------------------- numbering
u = sorted(set(int(x) for x in re.findall(r'(?m)^- \*\*U-(\d\d)\b', spec)))
check('U-01..U-%02d contiguous' % (u[-1] if u else 0), u == list(range(1, len(u) + 1)) and len(u) == 28, str(len(u)))
check('Contents names U-01..U-%02d' % (u[-1] if u else 0), has(r'universal rules U-01\.\.U-%02d' % u[-1]))
a_ids = sorted(int(x) for x in re.findall(r'(?m)^\| A-(\d\d) \|', spec))
check('A-01..A-%02d contiguous' % (a_ids[-1] if a_ids else 0), a_ids == list(range(1, len(a_ids) + 1)), str(a_ids[-3:]))
check('Contents names A-01..A-%02d' % (a_ids[-1] if a_ids else 0), has(r'Ambiguity register A-01\.\.A-%02d' % a_ids[-1]))
dd = sorted(int(x) for x in re.findall(r'(?m)^- \*\*DD-G(\d\d)\*\*', spec))
check('DD-G01..DD-G%02d contiguous in section 7' % (dd[-1] if dd else 0), dd == list(range(1, len(dd) + 1)), str(dd))
check('header names DD-G01 to DD-G%02d' % (dd[-1] if dd else 0), has(r'DD-G01 to DD-G%02d are the gate settings' % dd[-1]))
decisions = open(os.path.join(GOV, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md'), encoding='utf-8').read()
missing_dd = [f'DD-G{n:02d}' for n in dd if not re.search(r'(?m)^\| DD-G%02d \|' % n, decisions)]
check('every DD-G of section 7 is a row of the decisions file', not missing_dd, str(missing_dd))
heads = re.findall(r'(?m)^## (\d+)\. ', spec)
check('sections 1..11 present in order', heads == [str(i) for i in range(1, 12)], str(heads))
q = re.findall(r'(?m)^### (Q\d\d) ', spec)
check('28 gate sections Q01..Q28', q == [f'Q{i:02d}' for i in range(1, 29)])
# plan pages only: a page of the Official Records (`OR27-1-R076 p. 370`) is not a page of the plan
pgs = {int(m.group(1)) for m in re.finditer(r'\bpp?\.\s*(\d{1,3})', spec) if 'OR27' not in spec[max(0, m.start() - 24):m.start()] and not re.search(r'R\d{3}\s*$', spec[max(0, m.start() - 8):m.start()])}
check('no cited page outside 1..144', all(1 <= p <= 144 for p in pgs), str(sorted(p for p in pgs if not 1 <= p <= 144)))

# ---------------------------------------------------------------- register
reg = J('register_index.json')
ph = lambda v: v is None or str(v).strip().lower() in ('', '-', 'none', 'n/a', 'not stated by the shard proposal') or (isinstance(v, list) and not v)
fields = ['title', 'rids', 'cat', 'desc', 'why', 'searched', 'subst', 'recon', 'tier', 'marking', 'status', 'owner_q']
st = collections.Counter(e.get('status') for e in reg)
files = sorted(glob.glob(os.path.join(GOV, 'register', 'EG-*.md')))
fids = {os.path.basename(f)[:-3] for f in files}; iids = {e['id'] for e in reg}
facts = {'entries': len(reg), 'open': st['open'], 'closed': st['closed'], 'owner_q_bad': sum(ph(e.get('owner_q')) for e in reg),
         'owner_q_empty': sum(e.get('owner_q') is None or str(e.get('owner_q')).strip() == '' for e in reg),
         'fail_l1': sum(any(ph(e.get(f)) for f in fields) for e in reg), 'files': len(files), 'not_indexed': len(fids - iids)}
check('1.5 register counts', all(has(r'\b%d entries \(%d open, %d closed' % (facts['entries'], facts['open'], facts['closed'])) for _ in [0])
      and has(r'%d have no usable `owner_q` \(%d of them empty\) and %d fail L1' % (facts['owner_q_bad'], facts['owner_q_empty'], facts['fail_l1'])), str(facts))
check('1.5 register folder: %d files, %d not in the index' % (facts['files'], facts['not_indexed']),
      has(r'holds %d entry files and the index %d entries: %s files are not in' % (facts['files'], facts['entries'], {9: 'nine'}.get(facts['not_indexed'], str(facts['not_indexed'])))))
conf = J('conflict_register.json')
check('3.8 / 9: 47 conflicts and check_governance fixes 691 and 47', len(conf) == 47 and has(r'fixes 691 timeline rows and 47 conflicts'))

# ---------------------------------------------------------------- timeline
seed = JL('timeline_seed.jsonl'); ver = JL('timeline_verified.jsonl')
sc = collections.Counter(r['tier'] for r in seed); vc = collections.Counter(r.get('tier') for r in ver); se = collections.Counter(r.get('status_effective') for r in ver)
check('TL-1 seed tiers', has(r'seed tiers documented %d, inferred %d, open gap %d, plausible-procedural %d' % (sc['documented'], sc['inferred'], sc['open gap'], sc['plausible-procedural'])), str(dict(sc)))
check('TL-1 overlay tiers', has(r'documented %d, inferred %d, open gap %d, plausible-procedural %d and `unclassified` %d' % (vc['documented'], vc['inferred'], vc['open gap'], vc['plausible-procedural'], vc['unclassified'])), str(dict(vc)))
check('TL-1 status_effective counts', has(r'verified_against_or_text %d, partially_verified %d, gap %d, inferred %d, failed_lookup %d, claim_unsupported_by_or_text %d, recheck_failed %d' % (
    se['verified_against_or_text'], se['partially_verified'], se['gap'], se['inferred'], se['failed_lookup'], se['claim_unsupported_by_or_text'], se['recheck_failed'])), str(dict(se)))
unc = sorted(r['id'] for r in ver if r.get('tier') == 'unclassified')
check('1.4 the five unclassified rows are named', all(x in spec for x in unc) and len(unc) == 5, str(unc))

# ---------------------------------------------------------------- correction records
cen = subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'corrections_census.py')], capture_output=True, text=True)
cj = json.loads(cen.stdout) if cen.returncode == 0 else {}
tc, ec = cj.get('timeline_corrections', {}), cj.get('evidence_corrections', {})
if tc and ec:
    sentence = ('`timeline_corrections/` holds %d records over %d row ids (%d row-level and %d supplementary; %d ids have more than one record; %d ids have supplementary records only)' % (
        tc['records'], tc['distinct_ids'], tc['kinds']['row-level'], tc['kinds']['supplementary'], tc['ids_with_more_than_one_record'], tc['ids_with_only_supplementary_records']))
    check('1.3 timeline correction counts', sentence in spec, sentence)
    sentence = ('`evidence_corrections/` holds {:,} records over {} ids ({} row-level and {:,} supplementary; {} ids have more than one record; {} have supplementary records only)'.format(
        ec['records'], ec['distinct_ids'], ec['kinds']['row-level'], ec['kinds']['supplementary'], ec['ids_with_more_than_one_record'], ec['ids_with_only_supplementary_records']))
    check('1.3 evidence correction counts', sentence in spec, sentence)
    check('1.3 records on top rows', has(r'{:,} of the {:,} evidence records carry the id of a top-level row'.format(ec['records_on_a_top_level_row'], ec['records'])))
    check('1.3 confirmed or corrected with nothing left: 39 and 70',
          tc['records_with_empty_remains_unsupported_and_verdict_confirmed_or_corrected'] == 39 and ec['records_with_empty_remains_unsupported_and_verdict_confirmed_or_corrected'] == 70 and has(r'of which 39 row-level records') and has(r'of which 70 have that verdict'))
    check('1.3 no verdict word outside the list of the derivation', not tc['verdict_words_outside_the_known_list'] and not ec['verdict_words_outside_the_known_list'])
    check('1.3 alias spelling count 77', tc['records_using_the_alias_spelling_subclaims_or_unsupported'] + ec['records_using_the_alias_spelling_subclaims_or_unsupported'] == 77 and has(r'spelled `subclaims` in 77 records'))
else:
    check('corrections census ran', False, cen.stderr[:200])

# ---------------------------------------------------------------- row-level records by class (the paragraph of 1.3)
ROWK = ('sub_claims', 'subclaims', 'citations', 'seed', 'before', 'schedule_id', 'lookups')
kind_ = lambda r: 'sup' if 'xid' in r else ('row' if any(k in r for k in ROWK) else 'other')
evr = collections.defaultdict(list)
for f in glob.glob(os.path.join(GOV, 'evidence_corrections', '*.jsonl')):
    for l in open(f, encoding='utf-8'):
        if l.strip(): r = json.loads(l); evr[r['id']].append(r)
tlr = collections.defaultdict(list)
for f in glob.glob(os.path.join(GOV, 'timeline_corrections', '*.jsonl')):
    for l in open(f, encoding='utf-8'):
        if l.strip(): r = json.loads(l); tlr[r['id']].append(r)
clean_ = lambda rs: any(kind_(r) == 'row' and r['verdict'] in ('confirmed', 'corrected') and not r.get('remains_unsupported') for r in rs)
cls_rows = {'R14.S': r'R14\.S-', 'R14.E': r'R14\.E-', 'R13.G': r'R13\.G-', 'R13.P': r'R13\.P-', 'R12': r'R12\.\d{3}$', 'R03.C': r'R03\.C-', 'R22': r'R22\.0\d{3}$'}
want = {}
for name, pat in cls_rows.items():
    rows_ = [s_['id'] for s_ in subs if re.match(pat, s_['id']) and not s_['id'].endswith('0000')]
    rl_ = [i for i in rows_ if any(kind_(r) == 'row' for r in evr.get(i, []))]
    so_ = [i for i in rows_ if evr.get(i) and not any(kind_(r) == 'row' for r in evr[i])]
    nr_ = [i for i in rows_ if not evr.get(i)]
    cl_ = [i for i in rows_ if clean_(evr.get(i, []))]
    want[name] = (len(rows_), len(rl_), len(cl_), len(so_), len(nr_))
tl_rl = [i for i, v in tlr.items() if any(kind_(r) == 'row' for r in v)]; tl_cl = [i for i, v in tlr.items() if clean_(v)]
okp = has(r'timeline %d of 691 rows \(%d clean\)' % (len(tl_rl), len(tl_cl)))
for name, (n, rl_, cl_, so_, nr_) in want.items():
    label = {'R12': 'R12 catalogue', 'R22': 'R22 epilogue'}.get(name, name)
    pat = r'%s %d of %d(?: \(%d clean\))?' % (re.escape(label), rl_, n, cl_) if cl_ else r'%s %d of %d' % (re.escape(label), rl_, n)
    okp = okp and has(pat)
sup_txt = 'Supplementary records only: R13.P %d, R12 %d, R03.C %d, R22 %d' % (want['R13.P'][3], want['R12'][3], want['R03.C'][3], want['R22'][3])
none_txt = 'No record at all: R13.G %d, R13.P %d, R12 %d, R03.C %d' % (want['R13.G'][4], want['R13.P'][4], want['R12'][4], want['R03.C'][4])
check('1.3 row-level records by class', okp and sup_txt in spec and none_txt in spec, str(want))
check('1.3 / SS-2: all 88 S rows have a row-level record, 42 clean', want['R14.S'][:3] == (88, 88, 42) and has(r'all 88 have a row-level record, 42 of them confirmed or corrected'))

# ---------------------------------------------------------------- library status words
lw = subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'library_words.py'), doc], capture_output=True, text=True)
lj = json.loads(lw.stdout) if lw.returncode == 0 else {}
check('Q25 the status-word table reproduces the three files', lj.get('spec_table_mismatches') == {} and lj.get('words_in_use') == 11 and len(lj.get('words_outside_the_three', [])) == 8
      and has(r'11 words, 8 of them outside the gate\'s three') and lj.get('ids_after_merging') == 49 and has(r'49 ids on 2026-11-13: 11 only in the first, 7 only in the second, 6 only in the third, 25 in the first two'), str(lj.get('spec_table_mismatches')))

# ---------------------------------------------------------------- night minutes
nc = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'night_count.mjs')], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
if nc.returncode == 0:
    nj = json.loads(nc.stdout); a = nj['instant_integer_minute']; b = nj['instant_mid_minute']
    check('Q10.1 night minutes 10,380 + 1,694 = 12,074 at the integer minute', (a['battle_window_night'], a['epilogue_night'], a['total_night']) == (10380, 1694, 12074) and has(r'12,074 minutes, 10,380 between 26 June and 14 July and 1,694 on 18 and 19 November'), str(a))
    check('Q10.1 at mid-minute 10,381 + 1,693 = 12,074', (b['battle_window_night'], b['epilogue_night'], b['total_night']) == (10381, 1693, 12074) and has(r'the split is 10,381 and 1,693'), str(b))
    check('Q10.1 grid 27,360 + 2,880 minutes', a['battle_window_minutes'] == 27360 and a['epilogue_minutes'] == 2880 and has(r'27,360 minutes\) and 18 and 19 November, 2,880 minutes') or has(r'27,360 minutes, and 18 and 19 November, 2,880 minutes'), str(a))
else:
    check('night count ran (node)', False, nc.stderr[:200])

bad = [r for r in results if not r[1]]
print(json.dumps({'checks': len(results), 'ok': len(results) - len(bad), 'mismatches': len(bad), 'mismatched': [r[0] for r in bad]}))
sys.exit(1 if bad else 0)
