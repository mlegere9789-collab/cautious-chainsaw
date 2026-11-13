"""Build rosters/work-items.json and rosters/data2/sources/ia_catalogue.json from the planning tables.

    python3 -I docs/battle-theatre/rosters/pipeline2/make_work_items.py          (run from the repository root)

Inputs: data2/units.json (unit list), pipeline2/work_items_data.py (sources, first tasks, gaps, owner steps),
tmp/library/rosters/_plan/ia_meta/*.json (Internet Archive item metadata read on 2026-11-13) and ia_cands.json (search results).
Every Internet Archive identifier the tables cite must have metadata or a search-result row; an item whose metadata says
access-restricted is allowed only with status "blocked".  Every unit of units.json lands in exactly one group.  Exit 1 on a violation.
"""
import os, sys, json, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import work_items_data as W

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
PLAN = os.path.join(ROOT, 'tmp', 'library', 'rosters', '_plan')
errors = []


def one(v):
    if isinstance(v, list):
        return '; '.join(map(str, v))
    return v


def catalogue_entry(ident):
    p = os.path.join(PLAN, 'ia_meta', ident + '.json')
    if os.path.exists(p):
        d = json.load(open(p, encoding='utf-8'))
        m = d['metadata']
        files = {f['name']: f for f in d['files']}

        def pick(suffix):
            c = [f for n, f in files.items() if n.endswith(suffix)]
            return int(c[0]['size']) if len(c) == 1 and c[0].get('size') else None
        return {'identifier': ident, 'title': one(m.get('title')), 'creator': one(m.get('creator')), 'date': one(m.get('date') or m.get('year')),
                'volume': one(m.get('volume')), 'imagecount': int(m['imagecount']) if str(m.get('imagecount', '')).isdigit() else None,
                'possible_copyright_status': one(m.get('possible-copyright-status')),
                'access_restricted_item': bool(m.get('access-restricted-item')) or bool(d.get('is_dark')),
                'contributor': one(m.get('contributor')), 'ocr': one(m.get('ocr')),
                'hocr_searchtext_gz_bytes': pick('_hocr_searchtext.txt.gz'), 'hocr_pageindex_gz_bytes': pick('_hocr_pageindex.json.gz'),
                'page_numbers_json_bytes': pick('_page_numbers.json'), 'djvu_xml_bytes': pick('_djvu.xml'), 'chocr_gz_bytes': pick('_chocr.html.gz'),
                'basis': 'item metadata read %s' % (d.get('_fetched') or '2026-11-13')}
    cands = json.load(open(os.path.join(PLAN, 'ia_cands.json'), encoding='utf-8'))
    c = cands.get(ident)
    if c:
        return {'identifier': ident, 'title': c['title'], 'creator': c['creator'], 'date': c['year'], 'volume': None,
                'imagecount': int(c['ic']) if str(c['ic']).isdigit() else None, 'possible_copyright_status': c['cr'] or None,
                'access_restricted_item': c['ar'] == 'true', 'basis': 'advancedsearch result 2026-11-13 (item metadata not read)'}
    return None


def main():
    units = json.load(open(os.path.join(R2, 'data2', 'units.json'), encoding='utf-8'))['units']
    by_scope = collections.defaultdict(list)
    for u in units:
        by_scope[(u['army'], u['st'])].append(u)
    assigned = set()
    cat = {}
    groups = []
    for gid in W.SOURCES:
        army, st = W.SCOPE[gid]
        us = sorted(by_scope[(army, st)], key=lambda u: ({'infantry': 0, 'sharpshooters': 1, 'cavalry': 2, 'artillery': 3, 'engineers': 4, 'staff': 5}.get(u['arm'], 6), u['number'] or 0, u['designation']))
        for u in us:
            if u['key'] in assigned:
                errors.append('unit in two groups: ' + u['key'])
            assigned.add(u['key'])
        # sources with catalogue facts
        srcs, dl_text, dl_xml, ids_seen = [], 0, 0, set()
        for s in W.SOURCES[gid]:
            s = dict(s)
            ia = []
            for ident in s['ia']:
                if ident.startswith('('):
                    ia.append({'identifier': None, 'note': ident.strip('()')})
                    continue
                e = cat.get(ident) or catalogue_entry(ident)
                if e is None:
                    errors.append('%s: %s has neither metadata nor a search result' % (gid, ident))
                    continue
                cat[ident] = e
                if e.get('access_restricted_item') and s['status'] != 'blocked':
                    errors.append('%s: %s is access-restricted but the source is not marked blocked' % (gid, ident))
                ia.append({'identifier': ident, 'volume': e.get('volume'), 'date': e.get('date'), 'imagecount': e.get('imagecount'),
                           'ia_flag': e.get('possible_copyright_status'), 'access_restricted': e.get('access_restricted_item')})
                if s['status'] in ('used-earlier', 'verified-meta') and s['role'] in ('roll', 'index', 'commission', 'compendium', 'officers') and ident not in ids_seen:
                    ids_seen.add(ident)
                    dl_text += (e.get('hocr_searchtext_gz_bytes') or 0) + (e.get('hocr_pageindex_gz_bytes') or 0) + (e.get('page_numbers_json_bytes') or 0)
            s['ia'] = ia
            srcs.append(s)
            if s['layout'] == 'cols' and s['status'] in ('used-earlier', 'verified-meta'):
                mx = max([cat[i['identifier']].get('djvu_xml_bytes') or 0 for i in ia if i.get('identifier') in cat] or [0])
                dl_xml = max(dl_xml, mx)
        rows_earlier = sum(e['rows'] for u in us for e in u['existing'])
        zero = [u['key'] for u in us if not u['existing']]
        arms = collections.Counter(u['arm'] for u in us)
        families = len([s for s in srcs if s['role'] in ('roll', 'index') and s['status'] in ('used-earlier', 'verified-meta')])
        tokens = 150000 * max(1, families) + 12000 * len(us)
        groups.append({
            'id': gid, 'title': W.TITLES[gid], 'army': army, 'state_code': st, 'wave': W.WAVE[gid],
            'earlier_family': W.FAM[gid], 'earlier_family_dir': 'docs/battle-theatre/rosters/data/' + W.FAM[gid],
            'unit_counts': dict(arms), 'units_total': len(us),
            'units': [{'key': u['key'], 'designation': u['designation'], 'arm': u['arm'], 'or_check': u['or_check'],
                       'earlier_rows': sum(e['rows'] for e in u['existing']), 'path': u['path']} for u in us],
            'units_without_earlier_rows': zero,
            'sources': srcs,
            'first_tasks': W.FIRST_TASKS[gid], 'gaps_known': W.GAPS.get(gid, []), 'owner_steps': W.OWNER_STEPS.get(gid, []),
            'estimates_modelled': {
                'rows_in_earlier_data': rows_earlier,
                'text_download_gz_bytes': dl_text, 'transient_djvu_xml_bytes_max_one_volume': dl_xml,
                'tokens': tokens, 'agent_hours': round(2 * max(1, families) + 0.1 * len(us), 1),
                'basis': 'PLAN.md 5.2: 150,000 tokens and 1 to 3 agent-hours for the first regiment of a source family (taken as 2 hours), 10,000 to 20,000 tokens (taken as 12,000) and 3 to 10 agent-minutes (taken as 6) for each further unit'},
            'outputs': {'unit_files': 'docs/battle-theatre/rosters/data2/%s/%s/<unit>.jsonl.gz' % (army, st),
                        'ledgers': 'docs/battle-theatre/rosters/data2/sources/<source id>.json',
                        'raw_text': 'tmp/library/rosters/<source id>/ (OCR text only)',
                        'report': 'docs/battle-theatre/GOVERNANCE/horde/ws-rosters/%s/report.md' % gid},
        })
    missing = [u['key'] for u in units if u['key'] not in assigned]
    if missing:
        errors.append('units in no group: %s' % missing[:5])
    if not all(re.fullmatch(r'[a-z0-9-]+', g['id']) for g in groups):
        errors.append('bad group id')
    cross = [
        {'id': 'roster-index', 'title': 'Index, whole-set verification and size report', 'army': 'both', 'wave': 4, 'depends_on': 'every state group (it can run on whatever files exist and is re-run at the end)',
         'tasks': ['Write pipeline2/build_index.py: data2/index.json (per unit: key, path, designation, rows per segment, raw bytes, gz bytes, sha256 of the raw text, source ids, coverage class, gaps, verification result) and data2/index-summary.json (rows, bytes, per army and state).',
                   'Run verify_unit.py --all through tools/horde/bench.sh and publish the counts; fail on any V1 or V3 defect.',
                   'Compare every unit file with its earlier CSV rows (conservation report per unit: rows only in the old data, rows only in the new, rows in both by name and company); list every difference, resolve none silently.',
                   'Check the size rule: if the projected total of raw jsonl passes 80 MB the files stay gzipped; write the measured total to the summary.'],
         'gates': ['R-G6 every row has a locator that resolves (verify_unit.py)', 'R-G7 conservation reported per unit', 'R-G8 no row without a source row']},
        {'id': 'roster-qa', 'title': 'Independent sampling test and second reading of page images', 'army': 'both', 'wave': 4, 'depends_on': 'the state groups of waves 1 to 3',
         'tasks': ['Implement PLAN.md section 4.4 on the new format: seeded draw of pages per stratum (source family by layout, officers pages, lowest OCR-confidence decile), a second agent reads the page image only and compares name, rank, company and remarks with the stored row; counts, bounds and disagreements published in data2/qa/.',
                   'Test a second OCR for the page-image reads and for the rows whose names the text layer lost (Florida 6.1 percent, Warren, Montgomery Greys, Pennsylvania muster years): rapidocr-onnxruntime (PyPI, models in the wheel, CPU) is the first candidate; run it on 20 known pages and report the agreement with the printed page before using it anywhere; page images only through https://archive.org/download/<id>/page/nN_w1500.jpg or the IIIF service, transient, never stored.',
                   'The sample size rule (one-sided 95 percent Clopper-Pearson): 299 rows with zero errors give an upper bound of 1.0 percent; 628 with at most two errors per stratum.'],
         'gates': ['R-G1 names 99 percent or better', 'R-G2 dates', 'R-G9 independent sample passed for every stratum before publication']},
        {'id': 'roster-gettysburg-lists', 'title': 'Statements of presence at Gettysburg that no roll prints: Official Records, National Cemetery, 1863 newspapers', 'army': 'both', 'wave': 4,
         'depends_on': 'units.json only (it can start at once; its segments are added to unit files after the state groups have written theirs)',
         'tasks': ['Officers named in the Official Records vol 27 reports and returns (local text tmp/library/or27, index docs/battle-theatre/library/or27_index.json, tools/bt/or27_find.py): one row per named officer and unit with the printed sentence as the remarks, offsets in the OR text; one segment of each of the 640 unit files that has such a name.',
                   'The Soldiers\' National Cemetery burial lists (PA-CEM-1867, IA revisedreportmad00penn and revisedreportma00cemegoog; ws9 copies CEM-REPORT-1867, CEM-BARTLETT-1874): named dead by state and unit, graves as printed; the Confederate dead reburied in Richmond (lists not located, C15) recorded as a gap.',
                   'The 1863 newspaper casualty lists on chroniclingamerica.loc.gov (one test request, then at most one per second): Richmond and state dailies of July to September 1863 for the Confederate units, the New York, Philadelphia and Boston dailies for the Union units; names as printed.',
                   'Gettysburg commission volumes already local in tmp/library/ws9 (NJ-TOOMBS-1888, NJ-FINAL-1891, VT-MON-1890, OH-DED-1887, OH-8TH-1889, IN-1913, MN-1ST-1916, MA-BURIAL-1863, PA at Gettysburg): lists of named men present, wounded or killed, as segments.'],
         'gates': ['every row locatable (V1 to V3) in its own text', 'a stated presence is only what the list prints: no inference from a name on a roll', 'nothing from a modern compilation']},
        {'id': 'roster-app', 'title': 'Roster section of the web page (docs/battle-theatre/app/roster)', 'army': 'both', 'wave': 4, 'depends_on': 'roster-index (the index and the unit files)',
         'tasks': ['A reader in JavaScript for roster2/2 (gunzip with DecompressionStream, one file per unit, no server): app/roster/reader.mjs and tests app/tests/roster-format.test.mjs that read the two real prototype files and every unit file present.',
                   'The page of PLAN.md section 4.2 without per-man presence labels: search by surname and unit, unit page with the segments and their sources and rights, the printed remark shown as printed, a visible mark where the source states presence at Gettysburg (a remark naming Gettysburg, a participants list, a casualty list, a burial list) and the tier of every non-documented statement; "n present, names not recovered" against the documented strength.',
                   'Rights per name: each row shows its segment source, volume, printed page and the ledger rights text; no file of the page may mention how the data was made.'],
         'gates': ['copy audit (CLAUDE.md): no mention of AI, Claude, Anthropic, agents or the production method in any shipped file', 'keyboard use, phone width, no colour-only marks', 'no per-man presence label is shown unless a source states it']},
    ]
    out = {
        'format': 'roster2-work-items/1', 'generated': '2026-11-13', 'plan': 'docs/battle-theatre/rosters/PRODUCTION-PLAN.md',
        'counts': {'groups': len(groups) + len(cross), 'state_army_groups': len(groups), 'units': len(units),
                   'by_army': dict(collections.Counter(u['army'] for u in units)),
                   'ia_identifiers_cited': len(cat)},
        'common': {
            'format_spec': 'docs/battle-theatre/rosters/pipeline2/r2lib.py (docstring) and PRODUCTION-PLAN.md section 3',
            'tools': {'fetch_text': 'pipeline2/fetch_text.py SOURCE_ID VOLUME IA_IDENTIFIER   (hocr search text, page index, page numbers; ledger entry with sha256)',
                      'xml_text': 'pipeline2/xml_text.py SOURCE_ID VOLUME IA_IDENTIFIER   (text derived from djvu.xml for items without a hocr search text; xml deleted after use)',
                      'writer_reader': 'pipeline2/r2lib.py write_unit / read_unit / verify_rows', 'verify': 'pipeline2/verify_unit.py PATH... | --all',
                      'prototypes': 'pipeline2/proto_flow_moore.py (flow) and pipeline2/proto_cols_vt.py (cols)',
                      'catalogue': 'pipeline2/ia_search.py search|meta (one request at a time, 1.2 s apart, cached)'},
            'steps': [
                '1 Resolve sources: for every source of the group fetch the OCR text (fetch_text.py), pin it in data2/sources/<id>.json with the rights facts of the item metadata, write the volume-to-unit map (printed pages or leaf ranges per unit) into the ledger; a failed lookup is recorded as failed, a blocked host as blocked.',
                '2 Parse: write one parser per layout (flow: lines of the search text; cols: word boxes of the item djvu.xml aligned to the search text, the xml deleted after the run; index: surname entries filtered by unit). A row is exactly what the source prints: name tokens, rank tokens, company from the nearest heading, every other printed token in the remarks, the printed page, the character offset. Never correct, complete, reorder or merge anything.',
                '3 Write: r2lib.write_unit per unit into data2/<army>/<state>/<unit>.jsonl.gz, one segment per source text; a unit with several sources has several segments (a participants list or casualty list is a segment of its own).',
                '4 Verify: verify_unit.py on every file (V1 name, V2 remarks, V3 page, V4 rank); zero V1 or V3 defects; every defect is fixed in the parser, never in the row.',
                '5 Reconcile with the earlier data (rosters/data CSVs): row counts per unit and company, rows only in one of the two readings; write the differences to GOVERNANCE/horde/ws-rosters/<group>/differences.csv; resolve none by guessing.',
                '6 Report: GOVERNANCE/horde/ws-rosters/<group>/report.md (what was run, rows, defects, gaps, what was not run) and one dated line in GOVERNANCE/progress.md (printf >>).'],
            'rules': ['name as printed: the OCR tokens of the source text, joined by single blanks; a garbled name stays garbled and is flagged by the verifier statistics, never repaired',
                      'no label of presence: a man is stated present at Gettysburg only where a printed remark, a participants list, a casualty list or a burial list says so; the row carries that statement as printed',
                      'rights per name come from the segment: source id, volume and the ledger entry (Internet Archive flag, date, state publication); a modern compilation (Henderson, Manarin, Howard, Broadfoot, Busey and Martin) and a lending-restricted item are never opened',
                      'host rules: archive.org only for the OCR text (metadata and /cors/ downloads, one request at a time, 1.2 s apart); a refused or challenged host is recorded as blocked and not retried; no login, no key, no bot-block workaround',
                      'disk: OCR text only under tmp/library/rosters; the djvu.xml of a cols source is a transient file deleted after the run; at most about 1 GB per group; delete scratch you no longer need',
                      'machine: the 4 shared vCPUs; any job above about 30 s of CPU runs through tools/horde/bench.sh; one cols volume (30 to 80 MB of xml) at a time',
                      'unit assignment: a row is filed to a unit only where the source states the unit; an entry that names no Gettysburg unit goes to a list file beside the unit files (data2/<army>/<state>/_other-<source>.jsonl.gz), never to a guessed unit'],
            'gates_per_group': ['verify_unit.py reports zero V1 and V3 defects on every file', 'every unit of the group has a file or a recorded reason (gap, blocked, not found) in the report', 'row counts per unit reconciled against the earlier data with every difference listed', 'copy audit: no file mentions how it was made']},
        'groups': groups + cross,
        'not_done_here': ['No unit file of data2 exists yet except two prototypes kept outside the tree (tmp/library/rosters/_proto).', 'No independent sample (R-G9) was run.', 'Browser or GPU checks are not part of this work.'],
    }
    json.dump(out, open(os.path.join(R2, 'work-items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(R2, 'data2', 'sources'), exist_ok=True)
    json.dump({'format': 'roster2-ia-catalogue/1', 'generated': '2026-11-13',
               'note': 'every Internet Archive identifier cited by work-items.json, with the facts of its metadata or search result; the copyright flag is the item\'s own possible-copyright-status (blank means the field is absent, which is the case for most pre-1931 imprints)',
               'items': {k: cat[k] for k in sorted(cat)}}, open(os.path.join(R2, 'data2', 'sources', 'ia_catalogue.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(out['counts']))
    tot = collections.Counter()
    for g in groups:
        tot['rows_earlier'] += g['estimates_modelled']['rows_in_earlier_data']
        tot['tokens'] += g['estimates_modelled']['tokens']
        tot['hours'] += g['estimates_modelled']['agent_hours']
        tot['text_gz'] += g['estimates_modelled']['text_download_gz_bytes']
    print(dict(tot))
    for e in errors:
        print('ERROR', e)
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
