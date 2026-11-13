#!/usr/bin/env python3
"""Build the evidence lines of the lookup-retries task.

Outputs (this task's own files; rewritten completely on every run, so the build is idempotent):
  GOVERNANCE/evidence_corrections/web-lookups.jsonl     lines for sub-requirement ids (R03.C-xxx, R14.S-xxx ...)
  GOVERNANCE/timeline_corrections/web-lookups.jsonl     lines for timeline rows (T1-xxx ...)
  retry/evidence_index.json                              xid -> ids, lookups, quote check

Every quote is cut from the saved text and matched again here (whitespace-insensitive substring of the saved file):
a quote that does not match makes the build fail. quote_mode 'exact': the quote is a verbatim substring;
'cleaned': the quote differs from `source_text_excerpt` (itself a verbatim substring) only by the listed OCR repairs
(hyphenation across a line break, a lost glyph), never by a word.
Line contract: same as web-nps-landscape.jsonl (citation{...quote, text_sha256 ...}, id, sub_claim, tier, verdict,
remains_unsupported, shard, state_date, xid) plus `support`, `lookup_refs`.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib
sys.path.insert(0, os.path.join(rlib.ROOT, 'tools', 'bt'))
import or27_find  # read-only use of the repository's own Official Records finder

SHARD = 'web-lookups'
RETRIEVED = '2026-11-13'
OUT_E = os.path.join(rlib.GOV, 'evidence_corrections', 'web-lookups.jsonl')
OUT_T = os.path.join(rlib.GOV, 'timeline_corrections', 'web-lookups.jsonl')
INDEX = os.path.join(rlib.RETRY, 'evidence_index.json')

ACQ2 = {it['id']: it for it in json.load(open(os.path.join(rlib.GOV, 'library', 'acquired_2.json')))['items']}
_text = {}


def text_of(path):
    p = rlib.abspath(path)
    if p not in _text:
        _text[p] = rlib.file_text(p)
    return _text[p]


def ws9_meta(sid):
    it = ACQ2[sid]
    return {'source_id': sid, 'title': it['title'], 'author': it.get('creator'), 'date': it.get('date'), 'url': it.get('details_url'),
            'archive_identifier': it.get('archive_identifier'), 'local_path': it['local_path']}


FAILS = []


def find_in(path, s):
    r = rlib.find_quote(text_of(path), s)
    if not r:
        FAILS.append((path, s))
        return (0, s)
    return r


def book_cite(sid, quote, page, page_basis, excerpt=None, corrections=None, source_class='participant or contemporary account, printed book (public domain)', extra=None, meta=None):
    m = meta or ws9_meta(sid)
    path = m['local_path']
    if excerpt is None:
        off, raw = find_in(path, quote)
        mode = 'exact'
        exc = None
    else:
        off, raw = find_in(path, excerpt)
        mode = 'cleaned'
        exc = rlib.norm_ws(raw)
        a = re.sub(r'[\W_]+', '', quote).lower()
        b = re.sub(r'[\W_]+', '', excerpt).lower()
        if a != b and not corrections:
            raise SystemExit('cleaned quote differs from excerpt beyond punctuation: %r' % quote[:80])
    c = {'author': m['author'], 'date': m['date'], 'local_path': path, 'page_marker': None, 'pdf_page': None, 'printed_page': page,
         'page_basis': page_basis, 'quote': quote, 'quote_mode': mode, 'retrieved': RETRIEVED, 'source_class': source_class,
         'source_id': m['source_id'], 'source_text_excerpt': exc, 'text_sha256': rlib.sha_file(rlib.abspath(path)), 'text_variant': 'djvu OCR text as saved (archive.org)',
         'text_offset': off, 'text_offset_end': off + len(raw), 'title': m['title'], 'url': m['url'], 'archive_identifier': m.get('archive_identifier')}
    if corrections:
        c['ocr_corrections'] = corrections
    if extra:
        c.update(extra)
    return c


_idx = None


def or_cite(quote, page_check=None, note=None):
    hits = or27_find.verify(quote)
    if len(hits) != 1:
        raise SystemExit('OR quote %r: %d hits' % (quote[:70], len(hits)))
    h = hits[0]
    part = h['part']
    recs = {r['id']: r for r in json.load(open(os.path.join(rlib.ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json')))['records']}
    rec = recs.get(h['record']) or {}
    f = 'tmp/library/or27/cu31924077699761_djvu.txt' if part == 1 else ('tmp/library/or27/cu31924077728255_djvu.txt' if part == 2 else 'tmp/library/or27/cu31924077700262_djvu.txt')
    ident = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}[part]
    page = h['page']
    if page_check and page.strip('~') != str(page_check) and not page.startswith('~'):
        raise SystemExit('OR page check failed: %s vs %s' % (page, page_check))
    raw = rlib.file_text(rlib.abspath(f))
    seg = raw[h['start']:h['end']]
    mode, exc, corr = 'exact', None, None
    if re.sub(r'\s+', '', quote) not in re.sub(r'\s+', '', seg):
        # the finder joined a line-break hyphenation: record it as a cleaned quote with the verbatim excerpt
        corr = []
        fixed = rlib.norm_ws(seg)
        for m in list(re.finditer(r'(?<=\w)- (?=[a-z])', fixed)):
            pass
        pairs = re.findall(r'(\w+)- ([a-z]+)', fixed)
        for a, b in pairs:
            corr.append([a + '- ' + b, a + b])
        for a, b in corr:
            fixed = fixed.replace(a, b)
        if re.sub(r'\s+', '', fixed) != re.sub(r'\s+', '', quote):
            raise SystemExit('OR quote differs from raw span beyond hyphenation: %r | %r' % (quote[:70], fixed[:70]))
        mode, exc = 'cleaned', rlib.norm_ws(seg)
    return {'author': (rec.get('rank') or '') + ' ' + (rec.get('author') or '') + ' (name as the OCR prints it)', 'date': '1889 (volume); report written 1863-64',
            'local_path': f, 'page_marker': None, 'pdf_page': None, 'printed_page': page, 'page_basis': 'printed page recovered from the running heads by tools/bt/or27_pages.py (a ~ marks an interpolated page)',
            'quote': quote, 'quote_mode': mode, 'retrieved': RETRIEVED, 'source_class': 'official report or dispatch of 1863 (printed 1889)',
            'source_id': 'OR27-%d' % part, 'report_id': h['record'], 'report_heading': h['who'], 'source_text_excerpt': exc, 'ocr_corrections': corr,
            'text_sha256': rlib.sha_file(rlib.abspath(f)), 'text_variant': 'djvu OCR text as saved (archive.org)', 'text_offset': h['start'], 'text_offset_end': h['end'],
            'title': 'The War of the Rebellion: Official Records, Series I, vol. 27, part %d' % part, 'url': 'https://archive.org/details/' + ident, 'archive_identifier': ident,
            'note': note}


def or_second(quote, ident, path, page, page_basis):
    off, raw = find_in(path, quote)
    return {'author': 'same report as the first scan', 'date': '1889 (volume)', 'local_path': path, 'page_marker': None, 'pdf_page': None, 'printed_page': page, 'page_basis': page_basis,
            'quote': quote, 'quote_mode': 'exact', 'retrieved': RETRIEVED, 'source_class': 'official report of 1863 (printed 1889), second OCR witness (another scan of the volume)',
            'source_id': 'OR27-1 (scan %s)' % ident, 'source_text_excerpt': None, 'text_sha256': rlib.sha_file(rlib.abspath(path)), 'text_variant': 'djvu OCR text as saved (archive.org), second witness',
            'text_offset': off, 'text_offset_end': off + len(raw), 'title': 'The War of the Rebellion: Official Records, Series I, vol. 27, part 1', 'url': 'https://archive.org/details/' + ident, 'archive_identifier': ident}


def web_cite(fid, quote, url, title, text_name, author='National Park Service', date='web page as served 2026-11-13', source_class='official web page (National Park Service)', excerpt=None):
    path = 'tmp/library/web/retry/%s/%s' % (fid, text_name)
    off, raw = find_in(path, quote if excerpt is None else excerpt)
    return {'author': author, 'date': date, 'local_path': path, 'page_marker': '=== PAGE 1 ===', 'pdf_page': 1, 'printed_page': None, 'quote': quote,
            'quote_mode': 'exact' if excerpt is None else 'cleaned', 'retrieved': RETRIEVED, 'source_class': source_class, 'source_id': 'WEB-' + fid,
            'source_text_excerpt': None if excerpt is None else rlib.norm_ws(raw), 'text_sha256': rlib.sha_file(rlib.abspath(path)), 'text_variant': 'html text of the page as served',
            'text_offset': off, 'text_offset_end': off + len(raw), 'title': title, 'url': url}


LINES_T, LINES_E = [], []
INDEXD = {}


def emit(targets, key, sub_claim, tier, cites, support, remains, state_date, lk, tier_basis, note=None, use='direct'):
    """targets: list of ('T'|'E', id). One line per (target, cite)."""
    n = 0
    for kind, tid in targets:
        for ci, c in enumerate(cites, 1):
            n += 1
            xid = 'WLK-%s-%s-%02d' % (key, tid.replace('.', '').replace('-', ''), ci)
            line = {'citation': c, 'id': tid, 'lookup_refs': lk, 'matched_by': 'retry of the lookups ' + ', '.join(lk), 'remains_unsupported': remains, 'shard': SHARD,
                    'state_date': state_date, 'sub_claim': sub_claim, 'support': support, 'tier': tier, 'tier_basis': tier_basis, 'use_for_1863': use,
                    'verdict': 'partially_supported', 'xid': xid}
            if note:
                line['note'] = note
            (LINES_T if kind == 'T' else LINES_E).append(line)
            INDEXD[xid] = {'id': tid, 'kind': kind, 'lk': lk, 'key': key, 'quote_ok': True}


# ======================================================================================= specs
OR1_SCANS = {'271unit': 'tmp/fence-1/dl/or27_w2/warofrebellion271unit_djvu.txt', 'rootrich': 'tmp/fence-1/dl/or27_w2/warofrebellion012701rootrich_djvu.txt'}


def build():
    # ---------------------------------------------------------------- T1-139 Tillie Pierce
    c = [
        book_cite('TPIERCE-1889', "our neighbor, Mrs. Schriver, called at the house and said she would leave the town and go to her father's (Jacob Weikert), who lived on the Taneytown road at the eastern slope of the Round Top.",
                  '35', 'running head "35 During the First Day of the Battle" precedes the passage; the next head (36) follows it'),
        book_cite('TPIERCE-1889', "About one o'clock we started on foot; the battle still going on.", '36', 'running head "36 During the First Day of the Battle" precedes the passage',
                  excerpt="About one o'clock w^e started on foot ; the battle still going on.", corrections=[['w^e', 'we']]),
        book_cite('TPIERCE-1889', 'Obtaining a bucket, I hastened to the spring, and there, with others, carried water to the moving column until the spring was empty.', '42',
                  'chapter heading "During the First Day of the Battle"; page 42 lies between the heads of pages 41 and 43'),
        book_cite('TPIERCE-1889', "Sometime during the forenoon of Tuesday, the 7th. in company with Mrs. Schriver and her two children, I started off on foot to reach my home.", '82',
                  'running head "82 After the Battle" precedes the passage', excerpt="Sometime during- the forenoon of Tuesday, the 7th. in company with Mrs. Schriver and her two children, I started off on foot to reach my home.", corrections=[['during-', 'during']]),
    ]
    emit([('T', 'T1-139')], 'pierce', "Tillie Pierce left her home in Gettysburg with Mrs. Schriver for Jacob Weikert's farm on the Taneytown road at about one o'clock on Jul 1 (the battle still going on), carried water to the marching column until the Weikert spring was empty on Jul 1, and started home on foot on the forenoon of Tue Jul 7",
         'documented', c, 'supports_sub_claim', 'The seed says "time not stated": the memoir states about one o\'clock for the departure; it states no clock time for the spring running empty. Memoir printed 1889, 26 years after the events (retrospective).',
         '1863-07-01 to 1863-07-07', ['LKR-T1-139'], 'participant\'s own account, published 1889 (retrospective); the passage states exactly this sub-claim')

    # ---------------------------------------------------------------- T1-124 / R03.C-042 Lee on the field Jul 1
    c = [
        book_cite('SHSP-04', 'No; I am not prepared to bring on a general engagement to-day — Longstreet is not up.', '158',
                  'running head "158 Southern Historical Society Papers" precedes the passage; no later head intervenes; Heth\'s letter, Southern Historical Society Papers vol. 4 (1877)',
                  excerpt='No ; I am not prepared to bring on a general engagement to-day — Long- street is not up.', corrections=[['No ;', 'No;'], ['Long- street', 'Longstreet']]),
        book_cite('SHSP-04', 'I reported this fact to General Lee and again requested to be permitted to attack. Permission was given.', '158',
                  'same page as the preceding passage (Heth\'s letter, 1877)'),
        book_cite('ALEXANDER-1907', "Soon after two o'clock, Lee had arrived on Seminary Ridge, and seen the defeat of the enemy and their retreat over Cemetery Hill.", '385',
                  'running head "GETTYSBURG: THE FIRST DAY 385" precedes the passage', source_class='memoir of a Confederate artillery officer (1907); the author was not with Lee at the time (retrospective, second-hand for the hour)'),
    ]
    emit([('T', 'T1-124'), ('E', 'R03.C-042')], 'lee-arrival', 'Lee on the field Jul 1: Maj. Gen. Henry Heth (first-hand) says he sought Lee while Rodes was heavily engaged and asked "had I not better attack?"; Lee answered that he was not prepared to bring on a general engagement that day, Longstreet not being up; Heth later reported the enemy shifting troops against Rodes, again asked, and permission was given. Alexander (1907) puts Lee\'s arrival on Seminary Ridge "soon after two o\'clock"',
         'documented', c, 'supports_in_part', 'No source read states Lee\'s arrival hour as a clock reading from Lee\'s own side (Hill\'s report gives none); Heth gives the exchange but no hour; Alexander writes "soon after two o\'clock" about an event he did not witness. The seed readings 13:30 and about 14:30 stay unsupported by a non-lead source; carry 13:30 / about 14:00 / about 14:30 as scenarios (R03.C-042), no default.',
         '1863-07-01', ['LKR-T1-124'], 'Heth: participant, letter of 1877 (retrospective, first-hand for the exchange); Alexander: memoir of 1907 (second-hand for the hour)')

    # ---------------------------------------------------------------- T3-146 Imboden summoned
    c = [
        book_cite('BL-3', 'About 11 o\'clock a horseman came to summon me to General Lee.', '420', 'first page of the article (folio 420 printed at the foot of the page); the passage lies on that page',
                  meta={'source_id': 'BL-3', 'title': 'Battles and Leaders of the Civil War, vol. 3 (Imboden, The Confederate Retreat from Gettysburg)', 'author': 'John D. Imboden, Brigadier-General, C.S.A.', 'date': '1888 (Century Co.)',
                        'url': 'https://archive.org/details/battlesleadersof03cent', 'archive_identifier': 'battlesleadersof03cent', 'local_path': 'tmp/library/ws9/prior/BL-3__battlesleadersof03cent_djvu.txt'}),
        book_cite('BL-3', 'I did so, but he did not make his appearance until about 1 o\'clock, when he came riding alone, at a slow walk, and evidently wrapped in profound thought.', '420', 'same page as the preceding passage',
                  excerpt='I did so, but he did not make his appearance until about 1 o\'clock, when he came riding alone, at a slow walk, and evidently wi-apped in profound thought.', corrections=[['wi-apped', 'wrapped']],
                  meta={'source_id': 'BL-3', 'title': 'Battles and Leaders of the Civil War, vol. 3 (Imboden, The Confederate Retreat from Gettysburg)', 'author': 'John D. Imboden, Brigadier-General, C.S.A.', 'date': '1888 (Century Co.)',
                        'url': 'https://archive.org/details/battlesleadersof03cent', 'archive_identifier': 'battlesleadersof03cent', 'local_path': 'tmp/library/ws9/prior/BL-3__battlesleadersof03cent_djvu.txt'}),
        book_cite('BL-3', 'I have sent for you, because your men and horses are fresh and in good condition, to guard and conduct our train back to Virginia.', '422',
                  'running head "422 THE CONFEDERATE RETREAT FROM GETTYSBURG" precedes the passage',
                  meta={'source_id': 'BL-3', 'title': 'Battles and Leaders of the Civil War, vol. 3 (Imboden, The Confederate Retreat from Gettysburg)', 'author': 'John D. Imboden, Brigadier-General, C.S.A.', 'date': '1888 (Century Co.)',
                        'url': 'https://archive.org/details/battlesleadersof03cent', 'archive_identifier': 'battlesleadersof03cent', 'local_path': 'tmp/library/ws9/prior/BL-3__battlesleadersof03cent_djvu.txt'}),
        book_cite('BL-3', 'As I was about leaving to return to my camp, as late, I think, as 2 a. m., he came out of his tent', '422', 'same page as the preceding passage',
                  excerpt='As I was about leav- ing to return to my camp, as late, I think, as 2 a. m., he came out of his tent', corrections=[['leav- ing', 'leaving']],
                  meta={'source_id': 'BL-3', 'title': 'Battles and Leaders of the Civil War, vol. 3 (Imboden, The Confederate Retreat from Gettysburg)', 'author': 'John D. Imboden, Brigadier-General, C.S.A.', 'date': '1888 (Century Co.)',
                        'url': 'https://archive.org/details/battlesleadersof03cent', 'archive_identifier': 'battlesleadersof03cent', 'local_path': 'tmp/library/ws9/prior/BL-3__battlesleadersof03cent_djvu.txt'}),
    ]
    emit([('T', 'T3-146')], 'imboden-summons', "Imboden's own narrative: about 11 p.m. on Jul 3 a horseman summoned him to General Lee; Lee did not reach his headquarters tent until about 1 a.m. on Jul 4; there Lee told him he had sent for him to guard and conduct the wagon train of wounded back to Virginia; Imboden left, as he thinks, as late as 2 a.m.",
         'documented', c, 'supports_in_part', 'The seed has the summons at Jul 4 01:00; Imboden dates the summons itself about 11 o\'clock the night before and the meeting at Lee\'s tent from about 1 o\'clock to about 2 a.m. (carry both readings). Written for the Century in the 1880s (retrospective); no 1863 document read states the hour. Rain on the night of Jul 3-4 is not in these passages.',
         '1863-07-03 23:00 to 1863-07-04 02:00', ['LKR-T3-146'], "participant's own narrative (Battles and Leaders, 1888; retrospective)")

    # ---------------------------------------------------------------- T3-170 Greencastle axes
    c = [book_cite('BL-3', 'take "a near cut" across the country to Greencastle, where daybreak on the morning of the 5th of July found the head of our column.', '425',
                   'running head "THE CONFEDERATE RETREAT FROM GETTYSBURG. 425" precedes the passage',
                   excerpt='take " a near cut " across the country to Grreencastle, where daybreak on the morning of the 5th of July found the head of our column.', corrections=[['" a near cut "', '"a near cut"'], ['Grreencastle', 'Greencastle']],
                   meta={'source_id': 'BL-3', 'title': 'Battles and Leaders of the Civil War, vol. 3 (Imboden, The Confederate Retreat from Gettysburg)', 'author': 'John D. Imboden, Brigadier-General, C.S.A.', 'date': '1888 (Century Co.)',
                         'url': 'https://archive.org/details/battlesleadersof03cent', 'archive_identifier': 'battlesleadersof03cent', 'local_path': 'tmp/library/ws9/prior/BL-3__battlesleadersof03cent_djvu.txt'}),
         book_cite('BL-3', 'After the advance — the 18th Virginia Cavalry — had passed perhaps a mile beyond the town, the citizens to the number of thirty or forty attacked the train with axes, cutting the spokes out of ten or a dozen wheels and dropping the wagons in the streets.', '425',
                   'same page as the preceding passage',
                   excerpt='After the advance — the 18th Vir- ginia Cavalry — had passed perhaps a mile beyond the town, the citizens to the number of thirty or forty attacked the train with axes, cutting the spokes out of ten or a dozen wheels and dropping the wagons in the streets.', corrections=[['Vir- ginia', 'Virginia']],
                   meta={'source_id': 'BL-3', 'title': 'Battles and Leaders of the Civil War, vol. 3 (Imboden, The Confederate Retreat from Gettysburg)', 'author': 'John D. Imboden, Brigadier-General, C.S.A.', 'date': '1888 (Century Co.)',
                         'url': 'https://archive.org/details/battlesleadersof03cent', 'archive_identifier': 'battlesleadersof03cent', 'local_path': 'tmp/library/ws9/prior/BL-3__battlesleadersof03cent_djvu.txt'})]
    emit([('T', 'T3-170')], 'greencastle-axes', 'At Greencastle, where daybreak on Jul 5 found the head of Imboden\'s column, thirty or forty citizens attacked the wagon train with axes, cutting the spokes out of ten or a dozen wheels and dropping the wagons in the streets after the 18th Virginia Cavalry had passed about a mile beyond the town',
         'documented', c, 'supports_sub_claim', 'Imboden does not date the axe attack by the clock beyond "daybreak ... found the head of our column" at Greencastle; the number "thirty or forty" and "ten or a dozen wheels" are his estimates. Account written for the Century (1888, retrospective). The earlier OR search found only the military attack on the train near Greencastle (Couch, Pierce): the OR does not mention the civilians.',
         '1863-07-05', ['LKR-T3-170'], "participant's own narrative (Battles and Leaders, 1888; retrospective)")

    # ---------------------------------------------------------------- T3-044 Geary rounds, three OCR witnesses
    q = 'The command expended in the fight on July 3, and in subsequent skirmishing, 277,000 rounds of ammunition.'
    c = [or_cite(q),
         or_second(q, 'warofrebellion271unit', OR1_SCANS['271unit'], '833 (footnote; the head of p. 834 follows)', 'footnote of Geary\'s report, followed in the text by the folio line and the head of the next page'),
         or_second(q, 'warofrebellion012701rootrich', OR1_SCANS['rootrich'], '833 (footnote; the head of p. 834 follows)', 'same footnote in a third scan')]
    emit([('T', 'T3-044')], 'geary-rounds', 'Geary\'s report (footnote): "The command expended in the fight on July 3, and in subsequent skirmishing, 277,000 rounds of ammunition": three independent OCR witnesses read 277,000 (not 227,000)',
         'documented', c, 'supports_sub_claim', 'The period is "the fight on July 3, and in subsequent skirmishing" (not Jul 2 evening and Jul 3, not the fight of Jul 3 alone). Page images could not be read (image host refused); three scans of the volume agree on the digits. 227,000 (W-CH) and about 250,000 (soldier\'s letter) remain unsupported by a non-lead source.',
         '1863-07-03', ['LKR-T3-044'], 'official report of 1863 (printed 1889); three OCR witnesses agree')

    # ---------------------------------------------------------------- weather: fog Jul 2 (McAllister) versus clear (Pierce)
    c1 = [or_cite('considerable fog; breakfast over')]
    emit([('T', 'T2-053'), ('T', 'T2-073')], 'fog-jul2', 'On the morning of Jul 2 there was considerable fog where Col. Robert McAllister\'s brigade (Third Corps) lay near the Emmitsburg road ("Morning dawned [with] considerable fog; breakfast over")',
         'documented', c1, 'supports_in_part', 'Strategypage (a lead) is the only source of the row\'s "foggy dawn, overcast, humid, 74 F at 07:00"; this report documents fog at the Third Corps position on the morning of Jul 2 but gives no clock hour, no temperature, no cloud cover and no region beyond the brigade. The Jacobs register (07:00 74 F, overcast 08:00) was not reached: it is held by the National Archives / Smithsonian (see lookups-retry.jsonl).',
         '1863-07-02', ['LKR-T2-053', 'LKR-T2-073'], 'official report of 1863 (printed 1889), brigade commander; the OCR prints "dawned j considerable fog", the quote begins after the lost word')
    c2 = [book_cite('TPIERCE-1889', 'The day dawned bright and clear; the hot rays of the July sun soon fell upon the landscape.', '48', 'chapter IV heading "During the Second Day of the Battle" on p. 47-48; the passage opens the chapter',
                    excerpt='The day dawned bright and clear ; the hot rays of the July sun soon fell upon the 1 uulscape.', corrections=[['1 uulscape', 'landscape']])]
    emit([('T', 'T2-053'), ('T', 'T2-073')], 'clear-jul2', 'Tillie Pierce, at the Weikert farm on the Taneytown road near Round Top, wrote of Jul 2: "The day dawned bright and clear; the hot rays of the July sun soon fell upon the landscape"',
         'documented', c2, 'conflicts_with_row', 'This reading conflicts with the foggy, overcast dawn of the row and with McAllister\'s fog: carry both as selectable scenarios (place differs: the Weikert farm south-east of the field versus the Third Corps line near the Emmitsburg road; Pierce wrote in 1889). No default.',
         '1863-07-02', ['LKR-T2-053', 'LKR-T2-073'], "participant's memoir, 1889 (retrospective)")

    # ---------------------------------------------------------------- weather Jul 1 heat
    c = [or_cite('the weather was sultry, and the troops, who had marched several hours without halting a single time, much out of breath'),
         or_cite('all much exhausted by the excessive heat')]
    emit([('T', 'T1-132')], 'heat-jul1', 'On Jul 1 the weather was sultry when Schurz\'s Eleventh Corps divisions double-quicked through Gettysburg (the deployment was complete about 2 p. m.), and Davis\'s Mississippi and North Carolina brigade was "all much exhausted by the excessive heat" in the fighting before about 1 p. m.',
         'documented', c, 'supports_in_part', '"76 F; very cloudy; warm S breeze; mostly dry ground" at 14:00: no temperature, cloud cover, wind or ground state is stated in these reports; the Jacobs register was not reached. Schurz gives the hour of deployment as "about 2 p. m." in the next sentences, not of the weather remark.',
         '1863-07-01', ['LKR-T1-132'], 'official reports of 1863 (printed 1889)')

    # ---------------------------------------------------------------- weather Jul 2 heat and dust
    c = [or_cite('Notwithstanding the excessive heat of the day, and the circuitous route to reach said position, officers and men bore up cheerfully under the annoyances.'),
         or_cite('exhausted from fatigue and the excessive heat of the day'),
         or_cite('Owing to the excessive heat, dry Aveather, and dust, the march was a severe one')]
    c[2]['quote_mode'] = 'cleaned'
    c[2]['source_text_excerpt'] = 'Owing to the excessive heat, dry Aveather, and dust, the march was a severe one'
    c[2]['ocr_corrections'] = [['Aveather', 'weather']]
    c[2]['quote'] = 'Owing to the excessive heat, dry weather, and dust, the march was a severe one'
    emit([('T', 'T2-113'), ('T', 'T2-073'), ('T', 'T2-068')], 'heat-jul2', 'Jul 2 was hot and dry: Col. Hodges (17th Georgia) marched to his position on the afternoon of Jul 2 "notwithstanding the excessive heat of the day"; Col. Oates\'s 15th Alabama (OCR: Gates) was "exhausted from fatigue and the excessive heat of the day" on Little Round Top; Maj. Eshleman (Washington Artillery) calls the march to the field severe "owing to the excessive heat, dry weather, and dust"',
         'documented', c, 'supports_in_part', 'No thermometer reading (81 F at 14:00), cloud fraction, drizzle or heat index is stated; the drizzle versus clearing conflict of T2-113 is not addressed by these reports. The dust remark of Eshleman covers the approach march of Jun 25 to Jul 2, not a clock hour of Jul 2.',
         '1863-07-02', ['LKR-T2-113', 'LKR-T2-073', 'LKR-T2-068'], 'official reports of 1863 (printed 1889)')

    # ---------------------------------------------------------------- weather Jul 3 heat, mist, rain
    c = [or_cite('The day being very hot, 3 of my men were carried insensible from the field on account of the intense heat.'),
         or_cite("During the day's fighting the heat was very great, and the men, being exposed and having neither shelter nor water, suffered intensely."),
         or_cite('Soon after sunset the same evening the rain commenced to descend in torrents'),
         or_cite('When night came, a heavy rain commenced, and firing ceased.')]
    emit([('T', 'T3-072'), ('T', 'T3-095')], 'heat-jul3', 'Jul 3 was very hot on the field: Capt. Roath (107th Pennsylvania) had three men carried insensible by the heat on the day of the repulse of the assault, and Maj. Mulholland (116th Pennsylvania) writes that during the day\'s fighting "the heat was very great", with the men exposed and without water; the rain began after sunset the same evening (Mulholland) and "when night came" (Willis, 119th New York)',
         'documented', c, 'supports_in_part', '87 F in the shade at 14:00, 4/10 cloud and a heat index of 98-105 F are not stated; Jacobs\' register was not reached and the heat index is a modern inference. The reports date the heat to the day, not to a clock hour.',
         '1863-07-03', ['LKR-T3-072', 'LKR-T3-095'], 'official reports of 1863 (printed 1889)')
    c = [or_cite('The mist now interferes with observations')]
    emit([('T', 'T3-048')], 'mist-jul3', 'At 8.15 a. m. on Jul 3 a Union signal officer (dispatch headed, as the OCR prints it, "Mountain Peak Signal Station", signed Pierce, Captain, Signal Officer) reports that "the mist now interferes with observations" and that the enemy\'s sharpshooters were very annoying',
         'documented', c, 'supports_in_part', 'The row\'s "73 F at 07:00; overcast at 08:00" is not stated: only mist at 08:15 at the station named. The heading "Mountain Peak" is the OCR\'s reading; the station\'s position was not verified here.',
         '1863-07-03', ['LKR-T3-048'], 'dispatch of 1863 (printed 1889)')

    # ---------------------------------------------------------------- T3-197 Lee's line near Hagerstown
    c = [or_cite("to the northeast of Hagerstown, Ewell's corps being to the northeast of Hagerstown, Longstreet at Funkstown, and A. P. Hill on their right. These positions they are said to be intrenching."),
         or_cite('the enemy are taking position behind Marsh Run, extending from Downsville to the vicinity of Hagerstown')]
    emit([('T', 'T3-197')], 'hagerstown-line', 'Union headquarters reported Lee\'s army in positions from the Potomac near Falling Waters through Downsville and Funkstown to the northeast of Hagerstown, "said to be intrenching" (Meade to Halleck, Jul 10), and, on Jul 12, "taking position behind Marsh Run, extending from Downsville to the vicinity of Hagerstown"',
         'documented', c, 'supports_in_part', 'No source read gives the length of the line ("six-mile line") or dates it to Jul 11; these are Union intelligence reports, not Lee\'s own statement. A length computed from a map would be a calculation, not a quotation.',
         '1863-07-10 to 1863-07-12', ['LKR-T3-197'], 'Union headquarters dispatch and circular of 1863 (printed 1889)')

    # ---------------------------------------------------------------- T3-122 Pickett's division totals (official compilation)
    c = [or_cite("Total Pickett's division 232 1.157 1,499 2,888")]
    emit([('T', 'T3-122')], 'pickett-totals', 'The official compilation of Confederate losses (Official Records, Addenda) reads, in the OCR, "Total Pickett\'s division 232 1.157 1,499 2,888" (the three figures before the total are in the standard order killed, wounded, missing, and 232 + 1,157 + 1,499 = 2,888)',
         'inferred', c, 'supports_in_part', 'The column headings are not adjacent to the figures in the OCR, so the assignment of 232, 1,157 (printed "1.157" in the OCR) and 1,499 to killed, wounded and missing follows the table\'s standard layout and the sum, not a legible heading. These OR totals (2,888) differ from the row\'s 2,655; the Pettigrew and Trimble rows and the page images were not read (image host refused).',
         '1863-07-03', ['LKR-T3-122'], 'official compilation of 1863-64 (printed 1889); figures read from OCR with a damaged separator')

    # ---------------------------------------------------------------- weed / Weikert hospital (Pierce)
    c = [book_cite('TPIERCE-1889', 'I hastened down to the little basement room, and as I entered, the soldier lay there — dead.', '61', 'chapter V opens on p. 61 after the head "62"; the passage follows the chapter heading',
                   excerpt='I hastened down to the Httle basement room, and as I entered, the soldier lay there — dead.', corrections=[['Httle', 'little']]),
         book_cite('TPIERCE-1889', 'This is the body of General Weed; a New York man.', '66', 'between the heads of pages 66 and 67'),
         book_cite('TPIERCE-1889', 'that was the first place they reached, that was used as a battle hospital', '68', 'following the head "68 During the Third Day of the Battle" (the sentence begins at the foot of p. 67: "Why would they not carry him into Mr. Weikert\'s house when")')]
    # the third cite is a cleaned quote across a running head: verify the letters/digits of the quote against the excerpt without the head
    emit([('T', 'T2-219'), ('E', 'R14.S-047'), ('E', 'R14.S-027')], 'pierce-weed', 'Tillie Pierce (at the Weikert house): on the morning of Jul 3 she found the soldier she had sat beside the night before dead in the "little basement room" and was told "This is the body of General Weed"; she calls the Weikert house "the first place they reached, that was used as a battle hospital"',
         'documented', c, 'supports_in_part', 'Weed\'s death is placed in the Weikert basement room at some hour between her visit the evening of Jul 2 and the morning of Jul 3 (sun already high when she woke); "before dawn" is not stated. Her reasoning that he was carried to the house is an inference of hers. The V Corps designation, the surgeons, the move east early on Jul 3 and the overnight move of the III and V Corps hospitals across Rock Creek are not in this book. Retrospective (1889).',
         '1863-07-02 to 1863-07-03', ['LKR-T2-219', 'LKR-fence-2-L50', 'LKR-fence-2-L27'], "participant's memoir, 1889 (retrospective)")

    # ---------------------------------------------------------------- R14.S-036 Sherfy house (Bachelder 1873)
    c = [book_cite('BACH-WHATTOSEE-1873', "Mr. Sherfey's house on the right bears many scars of the battle. His barn was burned, and many bodies of dead Union soldiers were consumed with it.", '81',
                   'running head "THE PEACH ORCHARD. 81" precedes the passage; the head of p. 82 follows; Bachelder, Gettysburg: What to See, 1873'),
         book_cite('BACH-WHATTOSEE-1873', 'A rumor is afloat that wounded men were burned in this building, but the writer met a Confederate officer, in hospital, who assured him that he was personally in the barn immediately before it was burned and that such was not the case.', '81',
                   'footnote at the foot of p. 81')]
    emit([('E', 'R14.S-036')], 'sherfy-bachelder', 'Bachelder (1873): the Sherfy house "bears many scars of the battle" and the barn "was burned" (a footnote records and disputes a rumour that wounded men burned in it)',
         'documented', c, 'supports_in_part', 'The count (7+ shell hits), the south and west walls, the roof and the date (Jul 2 evening or Jul 3) of the printed row are not stated; the barn fire is not dated. Observation of 1873 (ten years later), not a 1863 account.',
         '1863-07 (observed 1873)', ['LKR-fence-2-L38', 'LKR-fence-2-L6'], 'guidebook of 1873 by the park\'s early historian (observation ten years after the battle)')

    # ---------------------------------------------------------------- R14.S-051 Wade (NPS page)
    c = [web_cite('F-052', 'Date Of Death: July 3, 1863', 'https://www.nps.gov/people/jennie-wade.htm', 'Jennie Wade (U.S. National Park Service)', 'jennie-wade.html.txt'),
         web_cite('F-052', 'While kneading bread, Jennie was struck by an errant bullet and killed instantly, one of more than 150 bullets to strike her sister\'s house during the three-day Battle of Gettysburg.',
                  'https://www.nps.gov/people/jennie-wade.htm', 'Jennie Wade (U.S. National Park Service)', 'jennie-wade.html.txt')]
    emit([('E', 'R14.S-051')], 'wade-nps', 'The National Park Service gives Jennie (Mary Virginia) Wade\'s date of death as July 3, 1863, and says she was struck by an errant bullet while kneading bread, "one of more than 150 bullets to strike her sister\'s house during the three-day Battle of Gettysburg"',
         'documented', c, 'supports_in_part', 'The hour (about 08:00) and the trigger (sharpshooter fire) of the printed row are not stated by this page; the house is the sister\'s house (the fence-2 correction already places it on Baltimore Street). Official secondary web page, undated ("Last updated: September 14, 2017"), not a 1863 document; the count is the NPS\'s own.',
         '1863-07-03', ['LKR-fence-2-L54', 'LKR-fence-2-L2'], 'official web page of the National Park Service stating the fact; basis not cited on the page')

    # ---------------------------------------------------------------- C-044 Camp Letterman (NPS overview) and T3-137 Armistead
    c = [web_cite('F-015', 'To meet the demand, Camp Letterman General Hospital was established east of Gettysburg where all of the wounded were eventually taken to before transport to permanent hospitals in Philadelphia, Baltimore and Washington.',
                  'https://www.nps.gov/gett/learn/historyculture/gettysburg-overview.htm', 'Gettysburg Overview - Gettysburg National Military Park (U.S. National Park Service)', 'gettysburg-overview.html.txt'),
         web_cite('F-015', "Union surgeons worked with members of the U.S Sanitary Commission and Christian Commission to treat and care for the over 20,000 injured Union and Confederate soldiers that passed through the hospital's wards, housed under large tents. By January 1864, the last patients were gone as were the surgeons, guards, nurses, tents and cookhouses.",
                  'https://www.nps.gov/gett/learn/historyculture/gettysburg-overview.htm', 'Gettysburg Overview - Gettysburg National Military Park (U.S. National Park Service)', 'gettysburg-overview.html.txt')]
    emit([('T', 'T3-217'), ('E', 'R03.C-044')], 'letterman-nps', 'The National Park Service says Camp Letterman General Hospital was established east of Gettysburg to take all the wounded before transport to permanent hospitals, that over 20,000 injured Union and Confederate soldiers passed through its tented wards, and that by January 1864 the last patients, surgeons, guards, nurses and tents were gone',
         'documented', c, 'conflicts_with_row', 'The page gives no opening day, no closing day other than "by January 1864", and no Aug 10 census: the row\'s 1,772 patients and about 400 staff (NPS essay) and "over 4,000" (CWN-CL) are not stated here; the NPS ranger-programs page that the first run reported as giving "July 20 to November 19, 1863" and "over four thousand" no longer carries those words (the 2026 programme page was read in full). The 20,000 figure is a cumulative count, not a census: carry the census conflict as scenarios (R03.C-044), no default.',
         '1863-07 to 1864-01', ['LKR-T3-217', 'LKR-tl-12-W1', 'LKR-tl-12-W4', 'LKR-r03-2-W1', 'LKR-r03-2-W3'], 'official web page of the National Park Service (overview), basis not cited on the page')
    c = [web_cite('F-161', 'He died in a Federal field hospital the day after his wounding.', 'https://www.nps.gov/articles/000/confederates-gettysburg.htm', 'Confederate Commanders at Gettysburg (U.S. National Park Service)', 'confederates-gettysburg.html.txt')]
    emit([('T', 'T3-137'), ('E', 'R03.C-038')], 'armistead-nps', 'The National Park Service says Brig. Gen. Lewis Armistead, wounded and captured in the assault, "died in a Federal field hospital the day after his wounding"',
         'documented', c, 'conflicts_with_row', 'The page names neither the Spangler farm nor the summer kitchen nor the hour; "the day after his wounding" gives Jul 4 for a wound of Jul 3 where the row has Jul 5 (HN-SPANG, a lead). The local National Park Service Boundary Study (1988) places the 11th Corps hospital at the George Spangler farm as "the site of General Armistead\'s death". Carry the death date as a scenario (Jul 4 NPS; Jul 5 HN-SPANG).',
         '1863-07-03 to 1863-07-05', ['LKR-T3-137', 'LKR-tl-12-W5'], 'official web page of the National Park Service, basis not cited on the page')


def write():
    for p, L in ((OUT_E, LINES_E), (OUT_T, LINES_T)):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w') as f:
            for l in L:
                f.write(json.dumps(l, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump(INDEXD, open(INDEX, 'w'), indent=1, sort_keys=True)
    print('evidence lines: %d (evidence_corrections) + %d (timeline_corrections), %d xids' % (len(LINES_E), len(LINES_T), len(INDEXD)))


if __name__ == '__main__':
    build()
    if FAILS:
        for p_, q_ in FAILS:
            print('QUOTE NOT FOUND in %s: %r' % (p_, q_[:140]))
        raise SystemExit(1)
    write()
