#!/usr/bin/env python3
"""Check that the counts and id ranges GATE-SPEC-A.md states agree with the files they were counted from, and that its own
numbering is complete: classes of 2.2 against requirements.json; the OA derived gates OA-G01.. against the owner rows;
U-01.., A-01.., DD-G01.. contiguous and the Contents line equal to the last; the 71 requirement-level checks of section 5;
register, timeline, correction-record, library-word and night-minute counts. Reads files only (one `node` call for the night
count, 1 s). Prints one line per check and a JSON summary; exit 1 when any check is a MISMATCH.
Two kinds of check. A hard check (OK or MISMATCH) is on a count or a structure that does not move while the other workstreams work:
the rows of requirements.json, the seed and window files of the timeline, the register, the numbering of the spec. A soft check (OK or STALE)
is on a count of files that other workstreams are still writing (correction records, library status files, photo-match, vegetation,
realization results): a difference is printed as STALE and listed in the summary, and does not fail the run, because the number in the spec
is the one of the date it states; the run that writes a revision must end with no STALE line.
Usage: python3 -I check_counts.py [path-to-spec]"""
import json, os, re, sys, glob, subprocess, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import GOV, ROOT, SPEC

doc = sys.argv[1] if len(sys.argv) > 1 else SPEC
spec = open(doc, encoding='utf-8').read()
J = lambda p: json.load(open(os.path.join(GOV, p), encoding='utf-8'))
JL = lambda p: [json.loads(l) for l in open(os.path.join(GOV, p), encoding='utf-8') if l.strip()]
results = []
stale = []


def soft(name, ok, detail=''):
    if not ok: stale.append(name)
    print(('OK       ' if ok else 'STALE    ') + name + (' :: ' + detail if detail and not ok else ''))


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
check('1.1 origin counts', has(r'\(%d rows on 2026-11-16: %d `origin: pdf`, %d `origin: owner_chat`' % (len(subs), orig['pdf'], orig['owner_chat'])), str(dict(orig)))
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
check('U-01..U-%02d contiguous' % (u[-1] if u else 0), u == list(range(1, len(u) + 1)) and len(u) == 29, str(len(u)))
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
    soft('1.3 timeline correction counts', sentence in spec, sentence)
    sentence = ('`evidence_corrections/` holds {:,} records over {} ids ({} row-level and {:,} supplementary; {} ids have more than one record; {} have supplementary records only)'.format(
        ec['records'], ec['distinct_ids'], ec['kinds']['row-level'], ec['kinds']['supplementary'], ec['ids_with_more_than_one_record'], ec['ids_with_only_supplementary_records']))
    soft('1.3 evidence correction counts', sentence in spec, sentence)
    soft('1.3 records on top rows', has(r'{:,} of the {:,} evidence records carry the id of a top-level row'.format(ec['records_on_a_top_level_row'], ec['records'])))
    tcc = tc['records_with_empty_remains_unsupported_and_verdict_confirmed_or_corrected']; ecc = ec['records_with_empty_remains_unsupported_and_verdict_confirmed_or_corrected']
    tc_all = tc['verdict_words'].get('confirmed', 0) + tc['verdict_words'].get('corrected', 0)
    soft('1.3 confirmed or corrected with nothing left: %d and %d (%d records have the verdict, %d of them list something)' % (tcc, ecc, tc_all, tc_all - tcc),
         has(r'of which %d row-level records' % tcc) and has(r'of which %d have that verdict' % ecc) and has(r'\(%d records have that verdict and %d of them list something in `remains_unsupported`' % (tc_all, tc_all - tcc)))
    check('1.3 no verdict word outside the list of the derivation', not tc['verdict_words_outside_the_known_list'] and not ec['verdict_words_outside_the_known_list'])
    soft('1.3 alias spelling count', has(r'spelled `subclaims` in %d records' % (tc['records_using_the_alias_spelling_subclaims_or_unsupported'] + ec['records_using_the_alias_spelling_subclaims_or_unsupported'])))
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
soft('1.3 row-level records by class', okp and sup_txt in spec and none_txt in spec, str(want))
soft('1.3 / SS-2: all 88 S rows have a row-level record, %d clean' % want['R14.S'][2], want['R14.S'][:2] == (88, 88) and has(r'all 88 have a row-level record, %d of them confirmed or corrected' % want['R14.S'][2]))

# ---------------------------------------------------------------- library status words
lw = subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'library_words.py'), doc], capture_output=True, text=True)
lj = json.loads(lw.stdout) if lw.returncode == 0 else {}
mism_ = lj.get('spec_table_mismatches', {})
check('Q25 every status word in use is a row of the spec table (a word outside the table is FAIL by CT-1 and Q25.2)', bool(lj) and lj.get('words_in_use') == lj.get('spec_table_rows') and all(m['spec'] is not None for m in mism_.values())
      and has(r'%d words, %d of them outside the gate\'s three' % (lj.get('words_in_use', -1), len(lj.get('words_outside_the_three', [])))), str(mism_))
soft('Q25 the status-word table reproduces the counts of the three files', mism_ == {}, str(mism_))
mem_ = lj.get('ids_by_files_they_appear_in', {})
soft('Q25 ids after merging: %s' % lj.get('ids_after_merging'), has(r'\(%d ids on 2026-11-15: %d only in the first, %d only in the second, %d only in the third, %d in the first two[;)]' % (
    lj.get('ids_after_merging', -1), mem_.get('status.json', 0), mem_.get('status_2.json', 0), mem_.get('status_3.json', 0), mem_.get('status.json+status_2.json', 0))), str(mem_))

# ---------------------------------------------------------------- night minutes
nc = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'night_count.mjs')], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
if nc.returncode == 0:
    nj = json.loads(nc.stdout); a = nj['instant_integer_minute']; b = nj['instant_mid_minute']
    check('Q10.1 night minutes 10,380 + 1,694 = 12,074 at the integer minute', (a['battle_window_night'], a['epilogue_night'], a['total_night']) == (10380, 1694, 12074) and has(r'12,074 minutes, 10,380 between 26 June and 14 July and 1,694 on 18 and 19 November'), str(a))
    check('Q10.1 at mid-minute 10,381 + 1,693 = 12,074', (b['battle_window_night'], b['epilogue_night'], b['total_night']) == (10381, 1693, 12074) and has(r'the split is 10,381 and 1,693'), str(b))
    check('Q10.1 grid 27,360 + 2,880 minutes', a['battle_window_minutes'] == 27360 and a['epilogue_minutes'] == 2880 and has(r'27,360 minutes\) and 18 and 19 November, 2,880 minutes') or has(r'27,360 minutes, and 18 and 19 November, 2,880 minutes'), str(a))
else:
    check('night count ran (node)', False, nc.stderr[:200])

# ---------------------------------------------------------------- rows outside the clock (TL-13, SS-12, A-58, revision 4)
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
win = JL('timeline_windows.jsonl')
by_date = sorted(r['id'] for r in win if r['date'] is None or r['date'] < '1863-06-26' or r['date'] > '1863-07-14')
by_cell = sorted(r['id'] for r in seed if 'before Jun 26' in (r.get('time_window_raw') or ''))
outside = sorted(set(by_date) | set(by_cell))
check('TL-13 rows wholly outside the clock are T1-001, T1-002 and T3-209 to T3-219 (%d rows; %d by the date field)' % (len(outside), len(by_date)),
      outside == ['T1-001', 'T1-002'] + ['T3-%d' % n for n in range(209, 220)] and len(by_date) == 12
      and next(r for r in win if r['id'] == 'T1-001')['date'] == '1863-06-26' and has(r'gives T1-001 the date June 26') and has(r'13 timeline rows lie wholly outside it') and has(r'\(12 rows by its `date` field\)') and has(r'T3-209 to T3-218') and has(r'T3-219 \(`Jul-Nov \(summary\)`, no date\)'), str(outside))
ss_rows = json.load(open(os.path.join(BT, 'structures', 'state_schedule.json'), encoding='utf-8'))['rows']
s77 = next(r for r in ss_rows if r['id'] == 'S-077'); s81 = next(r for r in ss_rows if r['id'] == 'S-081')
CLOCK_END = '1863-07-14T23:59'
inside_ph = [p['state'] for p in s77['phases'] if p['window'][1] <= CLOCK_END]
beyond_ph = [p['state'] for p in s77['phases'] if p['window'][0] > CLOCK_END]
check('SS-12 S-077 has the phase Construction inside the clock and Open and Closed beyond it', inside_ph == ['Construction'] and beyond_ph == ['Open', 'Closed'] and has(r'phases Open \(July 20 or 22') and has(r'Closed \(November 20\)'), str((inside_ph, beyond_ph)))
check('SS-12 S-081 is a state of 19 November inside the clock', s81['time']['window'][0].startswith('1863-11-19') and s81['time']['window'][1].startswith('1863-11-19') and has(r'S-081 \(the reburials\) is not such a row'))
oob = sorted(r['id'] for r in ss_rows if r.get('out_of_battle_scope'))
check('SS-10 the rows out of the battle scope are S-078 and S-079', oob == ['S-078', 'S-079'] and has(r'\(S-078, S-079\)'))
clock = open(os.path.join(BT, 'app', 'src', 'clock.mjs'), encoding='utf-8').read()
check('U-06 the clock of the viewer: BATTLE 26 June to 15 July 00:00, EPILOGUE 18 to 20 November 00:00', 'BATTLE = { from: minOf(6, 26), to: minOf(7, 15)' in clock and 'EPILOGUE = { from: minOf(11, 18), to: minOf(11, 20)' in clock
      and has(r'BATTLE from June 26 00:00 to July 15 00:00, EPILOGUE from November 18 00:00 to November 20 00:00'))

# ---------------------------------------------------------------- vegetation (soft: its owner is still writing)
veg = json.load(open(os.path.join(BT, 'app', 'data', 'vegetation.json'), encoding='utf-8'))
vcls = collections.Counter(u.get('cls') for u in veg['units'])
vtxt = ', '.join('%s %d' % (k, n) for k, n in vcls.most_common())
soft('2.3 / Q21 / 9 vegetation: %d units in %d classes, %d claims' % (len(veg['units']), len(vcls), len(veg['claims'])),
     has(r'`app/data/vegetation.json` holds %d units in eight polygon classes \(%s;' % (len(veg['units']), re.escape(vtxt))) and len(vcls) == 8 and has(r'\) and %d claims \|' % len(veg['claims']))
     and has(r'present on 2026-11-16 with %d units in eight polygon classes and %d claims' % (len(veg['units']), len(veg['claims']))) and has(r'`app/data/vegetation.json`: %d units and %d claims on 2026-11-16' % (len(veg['units']), len(veg['claims']))), vtxt)

# ---------------------------------------------------------------- realization results (soft)
rz = J('realizations/RESULTS.json'); q17 = rz['q17']; rzt = rz['totals']['timeline']
soft('Q17 / 9 realization results: digest %s, %d realized, %d with a record, %d without' % (rz['harness_digest'], q17['realized'], rzt['with_record'], rzt['no_record']),
     has(r'harness digest %s, `complete` %s' % (rz['harness_digest'], str(q17['complete']).lower())) and has(r'of the 691 timeline rows %d are realized by scene' % q17['realized_by_scene'])
     and has(r'%d have a record and %d have none' % (rzt['with_record'], rzt['no_record'])) and has(r'counts %d rows as covered by an open register entry only' % q17['covered_by_open_register_entry_only'])
     and has(r'and %d as uncovered \(%d by its strict reading\)' % (q17['uncovered'], q17['uncovered_strict'])) and has(r'harness digest %s: 4 of 691 timeline rows realized by scene' % rz['harness_digest'])
     and has(r'\(%d rows are `night_ambiguous` in the harness\'s results' % sum(1 for x in rz['rows'].values() if 'night_ambiguous' in (x.get('window_flags') or [])))
     and has(r'and %d others differ from the windows file\)' % sum(1 for x in rz['rows'].values() if 'differs_from_windows_file' in (x.get('window_flags') or []))))

# ---------------------------------------------------------------- photo-match: invariants hard, counts soft (the owner was still writing)
PM = os.path.join(ROOT, 'tools', 'bt', 'photomatch')
pmv = json.load(open(os.path.join(PM, 'verdicts.json'), encoding='utf-8')); pms = json.load(open(os.path.join(PM, 'position_statements.json'), encoding='utf-8'))
pmr = json.load(open(os.path.join(PM, 'photograph_registry.json'), encoding='utf-8'))['photographs']; pmp = json.load(open(os.path.join(PM, 'poses.json'), encoding='utf-8'))['poses']
check('Q16 the set P is empty: documented_position_count is 0 and no statement of where the camera stood gives a coordinate', pmv['gate_q16']['documented_position_count'] == 0 and pmv['gate_q16']['passes'] is False
      and not any(s.get('coordinates_published') for s in pms['statements']) and has(r'`documented_position_count` 0') and has(r'`coordinates_published` is false on all of them'))
vc_ = collections.Counter(p['verdict'] for p in pmr)
soft('Q16 photo-match counts: %d registry records, %d statements, %d poses, %d places' % (len(pmr), len(pms['statements']), len(pmp), pmv['gate_q16'].get('documented_place_count', -1)),
     has(r'\(%d records at 23:03 UTC on 2026-11-15' % len(pmr)) and has(r'%d flagged staged' % sum(1 for p in pmr if p['staged_flag'])) and has(r'\(%d statements of where the camera stood, from %d sources' % (len(pms['statements']), len(pms['sources'])))
     and has(r'\(%d poses, none a documented position\)' % len(pmp)) and has(r'`documented_place_count` %d' % pmv['gate_q16'].get('documented_place_count', -1))
     and has(r'the candid verdicts over the %d registry records are %d roughly, %d does not, %d cannot judge and %d that combines two' % (len(pmr), vc_['roughly'], vc_['does not'], vc_['cannot judge'], sum(n for k, n in vc_.items() if k not in ('roughly', 'does not', 'cannot judge')))), str(dict(vc_)))

# ---------------------------------------------------------------- thresholds (section 7)
sec7 = section('## 7. Threshold registry', '## 8. Ambiguity register')
t_rows = re.findall(r'(?m)^\| (T-[A-Z0-9]+-\d+(?: \(T-[A-Z0-9]+-\d+\))?) \|', sec7)
t_ids = [i for row in t_rows for i in re.findall(r'T-[A-Z0-9]+-\d+', row)]   # a row with an alias (`T-Q07-1 (T-SS-1)`) defines two ids
check('7 threshold ids are unique and T-Q21-1 to T-Q21-3 are rows of the registry (%d thresholds)' % len(t_ids), len(t_ids) == len(set(t_ids)) and all(('T-Q21-%d' % i) in t_ids for i in (1, 2, 3)) and has(r'the thresholds \(the same %d ids\)' % len(t_ids)) and len(t_ids) == 42, str(len(t_ids)))


# ---------------------------------------------------------------- revision 5 (2026-11-16): the cavalry states, the owner's order, the runners
# A-61: the table of B.6.15.7 on p. 89 prints 17 rows (states); Q20.6 and A-61 say 17 and no text says 14
from plan_lib import load_pages
_p89 = load_pages()[89]
_i = _p89.index('B.6.15.7 Cavalry state'); _seg = _p89[_i:_p89.index('Fixed facts for the arrival rule', _i)].split('\n')[4:]
_states = [l for l in _seg[0::2] if l.strip()]
check('A-61 the table of B.6.15.7 prints %d state rows (17) and the spec says so, with no "14 states" left' % len(_states),
      len(_states) == 17 and _states[0] == 'march_column' and _states[-1].startswith('absent') and has(r'The 17 states of the table of B\.6\.15\.7') and has(r'the table of 17 rows')
      and not has(r'14 states of B\.6\.15\.7') and not has(r'14-state list') and has(r'\| A-61 \|'), str(len(_states)))
# Q27: the owner's order is recorded where the spec says it is, and the guards the spec names are the guards of Appendix F and of the budget file
_budget = json.load(open(os.path.join(GOV, 'budget', 'phase_budget.json'), encoding='utf-8'))
_od = _budget.get('owner_decision_2026_11_16', {})
_dl = open(os.path.join(GOV, 'decision_log.md'), encoding='utf-8').read()
_pages = load_pages()
_guard_words = ['Per-job turn limit', 'Per-job spend limit', 'Concurrency limit for headless jobs', 'GPU power and temperature guard', 'No-progress halt', 'Cache snapshot interval']
_f = re.sub(r'\s+', ' ', _pages[143] + ' ' + _pages[144])
check('Q27 the owner order: caps none in phase_budget.json, DEC-OWNER-2026-11-16 point 5 in the decision log, the six guards of Appendix F (pp. 143-144) are the six keys of the budget file',
      _od.get('caps') == 'none' and 'DEC-OWNER-2026-11-16' in _dl and 'there is no budget cap' in _dl and '5. Budget: there is no budget cap' in _dl
      and all(w in _f for w in _guard_words) and len(_budget['global_guard']) == 6
      and sorted(_budget['global_guard']) == sorted(['per_job_turn_limit', 'per_job_spend_limit', 'concurrency_limit', 'gpu_power_temp_guard', 'no_progress_halt_sessions', 'cache_snapshot_interval'])
      and has(r'the per-job turn limit, the concurrency limit, the GPU power and temperature guard, the no-progress halt and the cache snapshot interval') and has(r'six global guards') and has(r'`owner_decision_2026_11_16`'), str(_od)[:200])
check('Q27 T-Q27-1 and A-62 say the spend caps are none by the order and name the five other guards', has(r'\| T-Q27-1 \| Q27 spend caps, guards, N sessions \|') and has(r'\| A-62 \|') and has(r'the five other guards') and has(r'`DEC-OWNER-2026-11-16` point 5'))
# DD-G-* ids that the spec names (the runners' decisions, 11.9) are rows of the decisions file
_named = sorted(set(re.findall(r'DD-G-(?:OOB|Q0[3-6])-\d\d', spec)))
_missing_gg = [x for x in _named if not re.search(r'(?m)^\| %s \|' % re.escape(x), decisions)]
check('11.9 every DD-G-* id of the runners that the spec names is a row of the decisions file (%d named)' % len(_named), len(_named) >= 4 and not _missing_gg, str(_missing_gg))
# the result files of the runners and the tests: soft (their owners are still writing)
_RES = {}
for _g in ('Q01', 'Q02', 'Q14', 'Q19', 'Q20', 'Q23', 'Q25'):
    _fp = os.path.join(GOV, 'gate_results', _g + '.json')
    if os.path.exists(_fp):
        _d = json.load(open(_fp, encoding='utf-8')); _c = _d['counts']
        _order = ['PASS', 'FAIL', 'BLOCKED-INPUT', 'NOT-RUN', 'COVERED', 'N/A']
        _txt = ', '.join('{:,} {}'.format(_c[k], k) for k in sorted((k for k in _order if _c.get(k)), key=lambda k: (-_c[k], _order.index(k))))
        _RES[_g] = '`%s.json` (%s UTC): %s; {:,} items = %s'.format(len(_d['items'])) % (_g, _d['finished_utc'][11:16], _d['verdict'], _txt)
_ok = bool(_RES) and all(v in spec for v in _RES.values())
soft('11.9 result files of the runners (%d of 28 gates have one) as the spec states them' % len(_RES), _ok and has(r'a result file exists for 7 of the 28 gates') and len(_RES) == 7, str([v for v in _RES.values() if v not in spec])[:300])
_tests = {}
for _f2 in sorted(glob.glob(os.path.join(ROOT, 'tests', 'governance', 'gates', 'test_q*.py'))):
    _tests[os.path.basename(_f2)] = len(re.findall(r'(?m)^\s*def test_', open(_f2, encoding='utf-8').read()))
_no_res = [g for g in ('Q03', 'Q04', 'Q05', 'Q06') if os.path.exists(os.path.join(GOV, 'gate_results', g + '.json'))]
soft('11.9 no result file for Q03 to Q06 yet (the spec says so; found: %s)' % (', '.join(_no_res) or 'none'), not _no_res and has(r'runners are written for 4 more \(Q03 to Q06, no result file yet'), str(_no_res))
soft('11.9 counts of test functions of the runners: %s' % ', '.join('%s %d' % (k[5:-3], v) for k, v in _tests.items()),
     all(has(r'`%s` \(%d\)' % (re.escape(k), v)) for k, v in _tests.items()), str(_tests))
_cf = os.path.join(GOV, 'conflicts')
_plan = os.path.exists(os.path.join(_cf, 'PLAN.md')); _res = glob.glob(os.path.join(_cf, 'resolutions', 'C-*.json'))
soft('3.8 / 9 the conflicts folder: PLAN.md %s, %d resolution files (the spec says none and no PLAN.md at about 02:50 UTC)' % ('present' if _plan else 'absent', len(_res)),
     (not _plan) and not _res and has(r'no `PLAN\.md`, no dossier and no resolution'))

bad = [r for r in results if not r[1]]
print(json.dumps({'checks': len(results), 'ok': len(results) - len(bad), 'mismatches': len(bad), 'mismatched': [r[0] for r in bad], 'soft_checks_stale': len(stale), 'stale': stale}))
sys.exit(1 if bad else 0)
