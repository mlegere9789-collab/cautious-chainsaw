"""Close-out builder for timeline shard tl-03 (seed rows T1-116..T1-172, 57 rows).

Run:  python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/build.py [--check-only]

Reads the row data in rows_a.py, rows_b.py, rows_c.py (this folder), re-matches EVERY quote verbatim in the local source
text (Official Records vol.27 OCR under tmp/library/or27, library texts under tmp/library/ws9, the National Park Service texts under tmp/library/web/nps, texts added for this close-out under tmp/tl-03/acq) and stops with an error if a quote is not found, is found in another report than stated, or on
another printed page. Then writes:
  GOVERNANCE/timeline_corrections/tl-03.jsonl          one line per seed row (57: T1-116..T1-172)
  GOVERNANCE/horde/tl-03/results.jsonl                 shard rows with the recheck findings applied (57)
  GOVERNANCE/horde/tl-03/proposed-register/tl-03-CO-<row>.md   one entry per row that stays gap, unsupported or partial
  GOVERNANCE/horde/tl-03/closeout/counts.json          counts used by REPORT.md
Nothing outside the shard's ownership list is written. Offsets are character offsets in the raw file decoded as UTF-8
with newline='' (the convention of tools/bt/or27_lib.py)."""
import os, re, sys, json, hashlib, bisect, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
sys.path.insert(0, HERE)
import or27_find as F
from or27_lib import build_nview, norm_query, raw_path

SHARD = 'tl-03'
TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
VERDICTS = ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap')
BANNED = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model)\b')

# ---------------------------------------------------------------- sources
ACQ2 = json.load(open(os.path.join(G, 'library', 'acquired_2.json'), encoding='utf-8'))
ACQ1 = json.load(open(os.path.join(G, 'library', 'acquired.json'), encoding='utf-8'))
LIB = {}
for it in ACQ2['items']:
    LIB[it['id']] = {'path': it['local_path'], 'sha256': it['sha256'], 'title': it['title'], 'date': it.get('date'),
                     'archive_identifier': it.get('archive_identifier'), 'index': 'GOVERNANCE/library/acquired_2.json'}
_t1 = {it['source_id']: it for it in ACQ1['items']}
for it in ACQ2.get('reverified_prior_items', []):
    a = _t1.get(it['source_id'], {})
    LIB[it['source_id']] = {'path': it['local_path'], 'sha256': it['sha256_now'], 'title': a.get('title'), 'date': a.get('date'),
                            'archive_identifier': it.get('archive_identifier'), 'index': 'GOVERNANCE/library/acquired.json'}
_a3 = os.path.join(G, 'library', 'acquired_3.json')   # texts of the National Park Service acquired by another workstream (read only)
if os.path.exists(_a3):
    for it in json.load(open(_a3, encoding='utf-8')).get('items', []):
        if it.get('local_path') and it.get('text_sha256'):
            LIB[it['id']] = {'path': it['local_path'], 'sha256': it['text_sha256'], 'title': it.get('title'), 'date': it.get('date'), 'archive_identifier': None, 'index': 'GOVERNANCE/library/acquired_3.json'}
LOCAL = json.load(open(os.path.join(HERE, 'acquired_tl03.json'), encoding='utf-8'))
for it in LOCAL.get('items', []):          # texts fetched for this close-out (archive.org); sha256 of the text file as saved
    LIB[it['id']] = {'path': it['local_path'], 'sha256': it['sha256'], 'title': it.get('title'), 'date': it.get('date'),
                     'archive_identifier': it.get('archive_identifier'), 'index': 'GOVERNANCE/horde/tl-03/closeout/acquired_tl03.json'}
if os.path.exists(os.path.join(ROOT, 'tmp/library/misc/pennsylvaniaatge04penn_djvu.txt')):   # acquired.json PA-GB-1914a (the title page of the text reads Volume I)
    LIB['PA-GB-1914-v1'] = {'path': 'tmp/library/misc/pennsylvaniaatge04penn_djvu.txt', 'sha256': 'a819817be3edf5cd03f0f306e1b90b7e3c2598859c1ef2c0f2365815e7ac8668',
                            'title': 'Pennsylvania at Gettysburg (1914 printing), vol. 1, 11th to 111th Infantry', 'date': '1914', 'archive_identifier': 'pennsylvaniaatge04penn', 'index': 'GOVERNANCE/library/acquired.json (PA-GB-1914a)'}
OR_SHA = {1: None, 2: None, 3: None}
OR_INDEX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json'), encoding='utf-8'))['records']}

# short labels used in citations (author, short title, year); nothing here is a claim about content
LABEL = {
 'JACOBS-1864': 'M. Jacobs, Notes on the Rebel Invasion of Maryland and Pennsylvania and the Battle of Gettysburg (Philadelphia 1864)',
 'GBG-COMPILER-1863-06-29': 'Gettysburg Compiler, Monday June 29, 1863',
 'GBG-COMPILER-1863-09-21': 'Gettysburg Compiler, September 21, 1863',
 'ADAMS-SENTINEL-1863-07-21': 'Adams Sentinel (Gettysburg), July 21, 1863',
 'ADAMS-SENTINEL-1863-09-08': 'Adams Sentinel (Gettysburg), September 8, 1863',
 'PA-GB-1914-v2': 'Pennsylvania at Gettysburg (1914 edition), vol. 2',
 'PA-GB-1904': 'Pennsylvania at Gettysburg (1904 edition), vol. 2',
 'BL-3': 'Battles and Leaders of the Civil War, vol. 3 (1887-1888)',
 'FREMANTLE-1864': 'A. J. L. Fremantle, Three Months in the Southern States (1864)',
 'ME-GB-1898': 'Maine at Gettysburg (1898)',
 'SHSP-04': 'Southern Historical Society Papers, vol. 4 (1877)',
 'SHSP-06': 'Southern Historical Society Papers, vol. 6 (1878)',
 'MEADE-LL-v2': 'The Life and Letters of George Gordon Meade, vol. 2 (1913)',
 'ALEXANDER-1907': 'E. P. Alexander, Military Memoirs of a Confederate (1907)',
 'LETTERMAN-1866': 'J. Letterman, Medical Recollections of the Army of the Potomac (1866)',
 'NY-GB-1900': 'New York at Gettysburg (1900), vol. 1',
 'MI-GB-1889': 'Michigan at Gettysburg (1889)',
}

def sha_file(p):
    h = hashlib.sha256(); h.update(open(p, 'rb').read()); return h.hexdigest()

_lib = {}
def lib_text(sid):
    """(raw, ntext, nmap, relpath, sha) for a library text or a local newspaper text layer"""
    if sid in _lib: return _lib[sid]
    if sid in LIB:
        rel = LIB[sid]['path']
    else:
        raise KeyError('unknown library source ' + sid)
    p = os.path.join(ROOT, rel)
    raw = open(p, encoding='utf-8', newline='').read()
    sha = sha_file(p)
    if LIB[sid].get('sha256') and LIB[sid]['sha256'] != sha:
        raise SystemExit('sha256 of %s differs from the library index' % rel)
    nt, nm = build_nview(raw)
    _lib[sid] = (raw, nt, nm, rel, sha)
    return _lib[sid]

NPS_PAGE = re.compile(r'=== PAGE (\d+) ===')
HEAD_A = re.compile(r'(?<![\d,.])(\d{1,4}) ([A-Z][A-Za-z\'’.,&-]*(?: [A-Za-z\'’.,&-]+){1,7})')

def lib_page(sid, nt, ni):
    """printed page from the nearest running head before position ni in the normalised text, with the head as evidence"""
    if sid.startswith('NPS') and sid not in PAGE_HEADS:      # National Park Service text layers carry '=== PAGE n ===' markers (the PDF page, not the printed page)
        best = None
        for m in NPS_PAGE.finditer(nt, max(0, ni - 60000), ni):
            best = m
        if best is None: return None, 'no PDF page marker before the passage; offset given'
        return best.group(1), 'PDF page marker of the text layer (=== PAGE %s ===) before the passage; this is the PDF page, not the printed page' % best.group(1)
    spec = PAGE_HEADS.get(sid)
    if not spec: return None, 'no printed page recovered from the text; offset given'
    best = None
    for rx in spec:
        for m in rx.finditer(nt, max(0, ni - 9000), ni):
            if best is None or m.start() > best.start(): best = m
    if best is None: return None, 'no running head within 9000 characters before the passage; offset given'
    pg = next(g for g in best.groups() if g)
    return pg, 'running head before the passage: "%s"' % best.group(0).strip()

PAGE_HEADS = {
 'JACOBS-1864': [re.compile(r'(?<!\d)(\d{1,2}) (?:THE|TIIE|TILE) +REBEL +INVASION +O[FE]'), re.compile(r'MARYLAND +AND +PENNSYLVANIA\. +(\d{1,2})(?!\d)')],
 'PA-GB-1914-v2': [re.compile(r'(?<!\d)(\d{3,4}) Pennsylvania at Gettysburg\.'), re.compile(r'Pennsylvania at Gettysburg\. (\d{3,4})(?!\d)')],
 'ME-GB-1898': [re.compile(r'(?<!\d)(\d{2,3}) MAINE AT GETTYSBURG\.'), re.compile(r'[A-Z]{4,} REGIMENT [A-Za-z]+\. (\d{2,3})(?!\d)')],
 'SHSP-04': [re.compile(r'(?<!\d)(\d{1,3}) Southern Historical Society Papers\.')],
 'SHSP-06': [re.compile(r'(?<!\d)(\d{1,3}) Southern Historical Society Papers\.')],
 'ALEXANDER-1907': [re.compile(r'(?<!\d)(\d{2,3}) MILITARY MEMOIRS')],
 'FREMANTLE-1864': [re.compile(r'(?<!\d)(\d{3}) [A-Z][A-Za-z\'’.-]+(?: [A-Za-z\'’.-]+){0,5}\. (?=[A-Za-z"\'])'), re.compile(r'[A-Z]{3,}[A-Za-z\'’ .-]{3,40}\. (\d{3})(?!\d)')],
 'MEADE-LL-v2': [re.compile(r'THE BATTLE OF GETTYSBURG (\d{1,3})(?!\d)')],
 'BL-3': [re.compile(r'CITIZENS OF GETTYSBURG IN THE UNION ARMY\. (\d{3})(?!\d)'), re.compile(r'THE FIRST DAY AT GETTYSBURG\. (\d{3})(?!\d)'), re.compile(r'(?<!\d)(\d{3}) THE FIRST DAY AT GETTYSBURG')],
 'NY-GB-1900-v2': [re.compile(r'(?<!\d)(\d{3,4}) New York at Gettysburg\.'), re.compile(r'New York at Gettysburg\. (\d{3,4})(?!\d)')],
 'PA-GB-1914-v1': [re.compile(r'(?<!\d)(\d{3,4}) Pennsylvania at Gettys ?burg\.'), re.compile(r'Pennsylvania at Gettys ?burg\. (\d{3,4})(?!\d)')],
}
FIXED_PAGE = {}   # no page-image readings in this close-out

class QuoteError(Exception):
    pass

def resolve(cid, c):
    """verify one citation; returns the full citation record"""
    q = norm_query(c['quote'])
    if len(q) < 8: raise QuoteError('%s: quote too short' % cid)
    if c['src'] == 'OR27':
        hits = F.verify(q)
        if not hits: raise QuoteError('%s: OR quote not found: %r' % (cid, q))
        want = c.get('report')
        if want:
            hs = [h for h in hits if h['record'] == want]
            if not hs: raise QuoteError('%s: OR quote found only in %s, not in %s: %r' % (cid, sorted(set(str(h['record']) for h in hits)), want, q))
        else:
            hs = hits
            if len(set(h['record'] for h in hits)) > 1: raise QuoteError('%s: OR quote occurs in several records %s; state report' % (cid, sorted(set(str(h['record']) for h in hits))))
        h = hs[0]
        if c.get('page') and str(c['page']) not in str(h['page']):
            raise QuoteError('%s: page stated %s, found %s (%s)' % (cid, c['page'], h['page'], h['record']))
        part = h['part']
        if OR_SHA[part] is None: OR_SHA[part] = sha_file(raw_path(part))
        rec = OR_INDEX.get(h['record'] or '', {})
        author = c.get('author') or ((rec.get('rank') or '') + ' ' + (rec.get('author') or '')).strip() or (rec.get('header_raw') or '')[:60]
        out = collections.OrderedDict(key=cid, source_id='OR27', work='Official Records Ser.I vol.27', part=part, report_id=h['record'],
              author=author, printed_page=h['page'], page_basis='running heads of the OCR text (tools/bt/or27_pages.py)',
              quote=q, text_offset=h['start'], text_offset_end=h['end'],
              source_file=os.path.relpath(raw_path(part), ROOT).replace(os.sep, '/'), sha256=OR_SHA[part])
        if len(hs) > 1: out['occurrences_in_report'] = len(hs)
    else:
        sid = c['src']
        raw, nt, nm, rel, sha = lib_text(sid)
        i = nt.find(q)
        if i < 0: raise QuoteError('%s: quote not found in %s: %r' % (cid, sid, q))
        n = nt.count(q)
        pg, basis = FIXED_PAGE.get(sid, (None, None))
        if pg is None: pg, basis = lib_page(sid, nt, i)
        if c.get('page') and pg is not None and str(c['page']) != str(pg):
            raise QuoteError('%s: page stated %s, recovered %s in %s' % (cid, c['page'], pg, sid))
        if c.get('page') and pg is None: pg, basis = str(c['page']), c.get('page_basis') or 'stated from the running head read in the text'
        out = collections.OrderedDict(key=cid, source_id=sid, work=LABEL.get(sid) or LIB[sid].get('title'), part=None, report_id=None,
              author=c.get('author'), printed_page=pg, page_basis=basis,
              quote=q, text_offset=nm[i], text_offset_end=nm[i + len(q) - 1] + 1, source_file=rel, sha256=sha,
              archive_identifier=LIB[sid].get('archive_identifier'), library_index=LIB[sid]['index'])
        if n > 1: out['occurrences_in_text'] = n
    for k in ('reading', 'supports', 'note', 'image_check', 'witness'):
        if c.get(k): out[k] = c[k]
    return out

# ---------------------------------------------------------------- window limits
# What every limit of a corrected window is. tools/bt/realize/timeline.mjs reads start and end as the allowed window of the row and adds its
# own clock tolerance (tolerances.json time.clock_tolerance_min, 20 minutes) at a limit that is a clock time, none at the edge of a date.
# A limit is therefore the plain source time, not a time with a margin. Date edges, the single sun table of tolerances.json and the day-part
# edges of tolerances.json are explained by rule; every other limit needs an entry here and the build stops if one is missing.
SUN_TABLE = {'04:03': 'civil dawn', '04:35': 'sunrise', '19:32': 'sunset', '20:04': 'civil dusk'}
DAY_PART_EDGE = {'18:00': 'the start of evening', '12:00': 'noon, the end of morning and the start of afternoon'}
LIMIT_NOTES = {}   # per-row limit explanations come from the row data (key `limits`: {'start': text, 'end': text})

def window_limits_note(rid, start, end, errs=None, limits=None):
    """One sentence saying what each limit of a corrected window is, so that no limit stands unexplained."""
    parts = []
    sun_used = False
    for name, v in (('start', (start or '')[11:]), ('end', (end or '')[11:])):
        if not v:
            continue
        if (name == 'start' and v == '00:00') or (name == 'end' and v == '23:59'):
            parts.append('the %s %s is the edge of the calendar date' % (name, v))
        elif (limits or {}).get(name):
            parts.append('the %s %s is %s' % (name, v, limits[name]))
        elif (rid, name) in LIMIT_NOTES:
            parts.append('the %s %s is %s' % (name, v, LIMIT_NOTES[(rid, name)]))
        elif v in SUN_TABLE:
            sun_used = True
            parts.append('the %s %s is %s of the sun table of tolerances.json' % (name, v, SUN_TABLE[v]))
        elif v in DAY_PART_EDGE:
            parts.append('the %s %s is %s (tolerances.json time.day_parts)' % (name, v, DAY_PART_EDGE[v]))
        else:
            if errs is not None:
                errs.append('%s window %s %s has no stated origin (add it to LIMIT_NOTES)' % (rid, name, v))
    if not parts:
        return ''
    note = ' Window limits: ' + '; '.join(parts) + '.'
    if sun_used:
        note += ' The sun table has one value for every date; for 1 July the same table gives civil dawn 04:03, sunrise 04:35 and civil dusk 20:04 (PDF p.9).'
    note += ' A limit is an allowed bound, not a claim of when the event happened; the reader adds its own clock tolerance at a clock-time limit.'
    return note

# ---------------------------------------------------------------- build
def main():
    check_only = '--check-only' in sys.argv
    import importlib
    rows = []
    for mod in ('rows_a', 'rows_b', 'rows_c'):
        try:
            rows += importlib.import_module(mod).ROWS
        except ModuleNotFoundError:
            if '--partial' not in sys.argv: raise
    seed = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')][115:172]
    seed_by = {r['id']: r for r in seed}
    # The "before" values must be those of the shard as it was BEFORE the close-out, whatever the number of times this builder runs:
    # results.pre-closeout.jsonl is the shard's own results.jsonl of 2026-11-04 (git 9cd6e3b3), status_effective.pre-closeout.json the
    # status_effective of timeline_verified.jsonl before the close-out. results.jsonl itself is only written, never read as input.
    res_path = os.path.join(G, 'horde', SHARD, 'results.jsonl')
    base_path = os.path.join(HERE, 'results.pre-closeout.jsonl')
    if not os.path.exists(base_path):
        raise SystemExit('missing %s: it is the shard results.jsonl as it was before the close-out (git 9cd6e3b3)' % base_path)
    old = [json.loads(l) for l in open(base_path, encoding='utf-8') if l.strip()]
    if any('verdict_before' in r or 'Close-out 2026-11-13' in json.dumps(r, ensure_ascii=False) for r in old):
        raise SystemExit('%s already carries close-out fields: it must be the shard result as it was before the close-out' % base_path)
    old_by = {r['id']: r for r in old}
    se_path = os.path.join(HERE, 'status_effective.pre-closeout.json')
    if os.path.exists(se_path):
        ver = {k: {'status_effective': v} for k, v in json.load(open(se_path, encoding='utf-8')).items()}
    else:
        ver = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_verified.jsonl'), encoding='utf-8')}
        if not check_only:
            json.dump({k: v.get('status_effective') for k, v in ver.items() if k.startswith('T1-')}, open(se_path, 'w', encoding='utf-8', newline='\n'), indent=1)
    rc1 = collections.defaultdict(list)
    for l in open(os.path.join(G, 'horde', 'OR-RECHECK', 'results.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        if r.get('shard') == SHARD: rc1[r['row_id']].append(r)
    rc2 = {}
    for l in open(os.path.join(G, 'horde', 'OR-RECHECK-2', SHARD, 'results.jsonl'), encoding='utf-8'):
        r = json.loads(l); rc2[r['id']] = r
    ids = [r['id'] for r in rows]
    want_ids = ['T1-%03d' % i for i in range(116, 173)]
    errs = []
    partial = '--partial' in sys.argv
    if not partial and ids != want_ids: errs.append('row ids are not exactly T1-116..T1-172 in order: %s' % [i for i in want_ids if i not in ids])
    if len(set(ids)) != len(ids): errs.append('duplicate row ids')
    out_rows = []; nq = 0
    for r in rows:
        rid = r['id']
        cites = collections.OrderedDict()
        for key, c in r.get('cites', {}).items():
            try:
                cites[key] = resolve(key, c); nq += 1
            except QuoteError as e:
                errs.append('%s %s' % (rid, e))
        if r['verdict'] not in VERDICTS: errs.append('%s bad verdict %s' % (rid, r['verdict']))
        subs = []
        for n, s in enumerate(r['subs'], 1):
            claim, tier, support, keys = s[0], s[1], s[2], list(s[3])
            note = s[4] if len(s) > 4 else None
            if tier not in TIERS: errs.append('%s sub %d bad tier %s' % (rid, n, tier))
            if support not in ('supported', 'contradicted', 'unsupported', 'conflict'): errs.append('%s sub %d bad support %s' % (rid, n, support))
            for k in keys:
                if k not in r.get('cites', {}): errs.append('%s sub %d cites unknown key %s' % (rid, n, k))
            if tier == 'documented' and not keys: errs.append('%s sub %d documented without a citation' % (rid, n))
            d = collections.OrderedDict(n=n, claim=claim, tier=tier, support=support, citations=keys)
            if note: d['note'] = note
            subs.append(d)
        used = set(k for s in subs for k in s['citations']) | set(k for sc in r.get('scenarios', []) for k in sc.get('cites', []))
        for k in r.get('cites', {}):
            if k not in used: errs.append('%s citation %s is not used by any sub-claim or scenario' % (rid, k))
        cc = r['claim']
        for fld in ('event', 'unit', 'place', 'text'):
            if not cc.get(fld): errs.append('%s corrected_claim.%s empty' % (rid, fld))
        prod = json.dumps([cc, [s['claim'] for s in subs], r.get('scenarios', [])], ensure_ascii=False)
        m = BANNED.search(prod)
        if m: errs.append('%s banned word in product text: %s' % (rid, m.group(0)))
        if (r['verdict'] in ('partially_supported', 'unsupported', 'gap') or r.get('remains') or any(s['support'] == 'unsupported' for s in subs)) and not r.get('register'): errs.append('%s needs a proposed register entry' % rid)
        if r['verdict'] == 'confirmed' and r.get('register'): errs.append('%s is confirmed and must not carry a register entry' % rid)
        for k_ in ('start', 'end'):
            v_ = cc.get(k_)
            if v_ is not None and not re.match(r'^1863-\d\d-\d\dT\d\d:\d\d$', v_): errs.append('%s time window %s is not 1863-MM-DDTHH:MM: %r' % (rid, k_, v_))
        if cc.get('start') and cc.get('end') and cc['end'] < cc['start']: errs.append('%s time window ends before it starts' % rid)
        if cc.get('tier') not in TIERS: errs.append('%s corrected_claim tier %r' % (rid, cc.get('tier')))
        if r['verdict'] == 'confirmed' and (r.get('remains') or any(s['support'] != 'supported' for s in subs)): errs.append('%s confirmed but has unsupported parts' % rid)
        v = ver[rid]; o = old_by[rid]
        line = collections.OrderedDict()
        line['id'] = rid; line['shard'] = SHARD
        line['seed'] = {'page': seed_by[rid]['page'], 'tier': seed_by[rid]['tier'], 'time_window_raw': seed_by[rid]['time_window_raw']}
        line['before'] = {'status_effective': v.get('status_effective'), 'shard_verdict': o.get('verdict'), 'shard_tier': o.get('tier'), 'shard_status': o.get('status')}
        line['verdict'] = r['verdict']
        line['corrected_claim'] = collections.OrderedDict(event=cc['event'], unit=cc['unit'], place=cc['place'],
                time_window=collections.OrderedDict(text=cc['when'], start=cc.get('start'), end=cc.get('end'), basis=cc['basis'].rstrip(' .') + '.' + window_limits_note(rid, cc.get('start'), cc.get('end'), errs, r.get('limits'))),
                text=cc['text'], tier=cc['tier'], marking=cc.get('marking') or 'tier glyph on every sub-claim that is not documented')
        line['sub_claims'] = subs
        line['citations'] = list(cites.values())
        line['scenarios'] = [collections.OrderedDict(id=sc['id'], value=sc['value'], basis=sc['basis'], tier=sc['tier'], citations=list(sc.get('cites', []))) for sc in r.get('scenarios', [])]
        line['default'] = r.get('default')
        line['remains_unsupported'] = r.get('remains', [])
        line['searched'] = r.get('searched', [])
        line['recheck_applied'] = r.get('recheck') or 'none needed: every stored quote of this row was found at the stated report and page (OR-RECHECK)'
        line['register_proposed'] = ('tl-03-CO-' + rid) if r.get('register') else None
        line['register_related'] = r.get('related', [])
        out_rows.append((r, line, cites))
    if errs:
        print('ERRORS (%d):' % len(errs))
        for e in errs: print(' -', e)
        sys.exit(1)
    print('rows %d, citations verified verbatim %d' % (len(out_rows), nq))
    if '--show' in sys.argv:
        for r_, line_, cites_ in out_rows:
            for k_, c_ in cites_.items():
                print('  %s %-12s %-26s %-13s p.%-9s @%-8s %s' % (line_['id'], k_, c_['source_id'], c_.get('report_id') or '', c_.get('printed_page'), c_['text_offset'], ('| ' + (c_.get('page_basis') or '')[:60]) if not c_.get('report_id') else ''))
    if check_only: return
    # ---- corrections file
    cdir = os.path.join(G, 'timeline_corrections'); os.makedirs(cdir, exist_ok=True)
    with open(os.path.join(cdir, SHARD + '.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
        for r, line, cites in out_rows: f.write(json.dumps(line, ensure_ascii=False) + '\n')
    # ---- shard results
    import shard_rows
    new_res = shard_rows.apply(old, out_rows, rc1, rc2)
    with open(res_path, 'w', encoding='utf-8', newline='\n') as f:
        for r in new_res: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    # ---- proposed register
    import register_md
    n_reg = register_md.write(os.path.join(G, 'horde', SHARD, 'proposed-register'), out_rows)
    n_conf = register_md.write_conflicts(os.path.join(G, 'horde', SHARD, 'proposed-register'), out_rows)
    # ---- counts
    cnt = collections.OrderedDict()
    cnt['rows'] = len(out_rows)
    cnt['verdict'] = dict(collections.Counter(l['verdict'] for _, l, _ in out_rows))
    cnt['verdict_of_rows_not_verified_before'] = dict(collections.Counter(l['verdict'] for _, l, _ in out_rows if l['before']['status_effective'] != 'verified_against_or_text'))
    cnt['sub_claims_by_tier'] = dict(collections.Counter(s['tier'] for _, l, _ in out_rows for s in l['sub_claims']))
    cnt['sub_claims_by_support'] = dict(collections.Counter(s['support'] for _, l, _ in out_rows for s in l['sub_claims']))
    cnt['citations'] = sum(len(l['citations']) for _, l, _ in out_rows)
    cnt['citations_by_source'] = dict(collections.Counter(c['source_id'] for _, l, _ in out_rows for c in l['citations']))
    cnt['rows_with_scenarios'] = [l['id'] for _, l, _ in out_rows if l['scenarios']]
    cnt['rows_with_default'] = [l['id'] for _, l, _ in out_rows if l['default']]
    cnt['proposed_register_entries'] = n_reg
    cnt['rows_in_conflicts_file'] = n_conf
    cnt['results_tier'] = dict(collections.Counter(r['tier'] for r in new_res))
    cnt['results_status'] = dict(collections.Counter(r['status'] for r in new_res))
    cnt['rows_by_verdict'] = {v: [l['id'] for _, l, _ in out_rows if l['verdict'] == v] for v in VERDICTS}
    json.dump(cnt, open(os.path.join(HERE, 'counts.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    print(json.dumps(cnt, ensure_ascii=False)[:1500])

if __name__ == '__main__':
    main()
