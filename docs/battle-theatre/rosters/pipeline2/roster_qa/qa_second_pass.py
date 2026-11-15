"""Second sitting of the independent sample (roster-qa closure, 15 November 2026): the pages that the first sitting left thinnest, looked at again.

    python3 -I qa_second_pass.py            write data2/qa/pages/<stem>.addendum.json for the pages below and print what each says

Why these pages.  (1) The plan (PLAN.md 4.4) sends every disagreement to a third reader; the first sitting had one reader.  The two Massachusetts officers pages that decide
MA-SSM-officers (R-G2 and R-G3b rest on 32 lines), page 685 where tesseract agreed with the stored text on three lines that the reader called errors, and page 224 (12 of 14
lines in error) were read again by a second sitting of the same role, which had the first verdict and the stored lines in front of it when it looked at the page: a check of the recorded disagreements against the page, not a blind second reading.  (2) The failure of
VT-REV-officers rested on one page (the lowest-decile page, leaf 88): leaves 117 and 225 had been compared at the name level only because the dates and remarks had
"already failed"; leaf 117 is compared now at the levels D and R.  (3) Draw position 2 of MA-SSM-officers was passed over by the first sitting; it is a verdict of its own
(massachusettssol11931mass-0631.verdict.json, written with qa_verdict.py), not an addendum.

An addendum never rewrites the first verdict (qa_lib.merge_addendum merges them when the statistics and the report are computed).  The text of every difference below is what the
page prints and what the stored line holds, written by the reader looking at the page image (Read tool); no figure here comes from a machine.
"""
import sys, os, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_compare as C
import qa_render as RN
R = Q.R

GATE = {'name-char': 'R-G1', 'name-cut': 'R-G1', 'name-nonperson': 'R-G1', 'rem-date': 'R-G2'}

READER = ('the engineer who closed the item, a later sitting than the one that wrote the first verdicts; the first verdict and the stored lines were in front of the reader when the page image was '
          'looked at with the Read tool (a check of the recorded disagreements against the page, not a blind second reading); every stored line of the page was compared with the print')

# page -> spec.  confirmed: rows of the first verdict that this sitting also finds in error; added: errors at levels the first sitting had not compared
PAGES = {
    'massachusettssol21931mass/143': {
        'levels_added': '', 'compared_rows': 16, 'confirmed': [1, 3, 4, 5, 6, 9, 11, 13, 14, 15], 'added': [],
        'looked': 'full page at 200 dpi (1 Read); all 16 stored entries compared at the levels N, D and R',
        'notes': ['all 10 rows in error of the first verdict are errors against the print (1S63, 1S62 and 1S65 for 1863, 1862 and 1865 in rows 1, 3 and 13: the digit 8 of the typeface read as S; Xov. for Nov. in rows 4 and 5; L\'. S. and f. S. for U. S.; Batten,- for Battery; Millburj- for Millbury; clergjTnan; Gk)rham; disabiUty); the 6 other rows agree with the print (spacing and punctuation apart)']},
    'massachusettssol21931mass/661': {
        'levels_added': '', 'compared_rows': 16, 'confirmed': [4, 10, 13, 15], 'added': [],
        'looked': 'full page at 200 dpi (1 Read) and the line of row 4 at 500 dpi (1 Read: the print is the digit 1 with its flag, the stored rank reads Ist: the two engines agree with each other and not with the print)',
        'notes': ['all 4 rows in error of the first verdict are errors against the print (Ist for 1st in the rank of row 4; Gcnl. for Genl. in row 10; Maiden for Malden in row 13; Ist and let for 1st in row 15); the 12 other rows agree with the print (Charlestow-n differs by a hyphen only)']},
    'annualreportofad1863main/685': {
        'levels_added': '', 'compared_rows': 15, 'confirmed': [5, 6, 11, 13, 14], 'added': [],
        'looked': 'overview at 110 dpi and the table with the notes below it at 300 dpi (2 Reads); all 15 stored rows compared at the levels N, D and R',
        'notes': ['rows 5 and 6: the print shows [Aug. at the right end of the line of Charles Alexander and, on the line below, the remark In charge 2d div. hosp. since of Joseph B Baxter: the run-over belongs to the row below (tesseract and the text layer agree with each other on the stored text and not with the layout of the print); row 13 is the printed note Rank not shown in present organization at close of company returns (no person); row 11 prints Charles H Parlin (stored IT); row 14 prints James D Maxfield with the remark promoted Sergt. Major from company A; disc. for disability Sept. 9 (stored 1) and Sopt.)']},
    'annualreportofad1863main/224': {
        'levels_added': '', 'compared_rows': 14, 'confirmed': [0, 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13], 'added': [],
        'looked': 'overview at 110 dpi, the upper table at 300 dpi and the block Joined Field and Staff since Nov. 1, 1862 at 300 dpi (3 Reads); all 14 stored rows compared at the level N',
        'missed': [
            {'name_tokens': ['Charles', 'H', 'Smith'], 'what': "Charles H Smith, Major, Eastport, Feb 16 '63, remark 'Prom. Lieut. Col. & Col.' (first line of the block Joined Field and Staff since Nov. 1, 1862 of the 1st Maine Cavalry return)"},
            {'name_tokens': ['Stephen', 'Boothby'], 'what': "Stephen Boothby, Major (ditto), Portland (second line of the same block; remark 'Prom. to Lieut. Col.')"}],
        'notes': ['the print shows 19 men: 15 in the table and 4 in the block Joined Field and Staff since Nov. 1, 1862 (Charles H Smith, Stephen Boothby, Addison P Russell, Samuel Fuller); the first verdict counts 15 + 2 = 17 men; the stored rows 0 to 6 hold 17 of the 19 and no stored row holds Charles H Smith or Stephen Boothby, whose names the text layer has (offsets below)',
                  'the 12 rows in error of the first verdict are confirmed: row 0 stored - 1 TT All. for Samuel H Allen; rows 1, 3, 5, 6 hold 3, 2, 7 and 2 printed lines; rows 7 to 13 are fragments of the prose list Discharged and Deceased in 1862']},
    'cu31924080774148/117': {
        'levels_added': 'DR', 'compared_rows': 40, 'confirmed': [20],
        'looked': 'full page at 200 dpi (1 Read) and the Captains block at 300 dpi (1 Read); all 40 stored lines compared at the levels D and R (the first sitting compared the level N only)',
        'added': [
            (0, 'rem-date', "July u ,'6 1 July u,'6i", "July 11,'61 July 11,'61", 'both date cells: 11 read u, 61 read 6i'),
            (1, 'rem-date', "Aug. '3.'6i", "Aug. 13,'61", 'second date cell: the 1 of 13 lost, 61 read 6i'),
            (2, 'rem-extra', "['63, for disab.", None, "the run-over of the remark of the row below (Disch. Dec. 14, ['63, for disab.) is printed at the right of this line and stored on it"),
            (3, 'rem-missing', "Disch. Dec. 14,", "Disch. Dec. 14, ['63, for disab.", 'the run-over of this remark is stored on the row above'),
            (4, 'rem-char', "Sergt. Co. L;", "Sergt. Co. I.;", 'the company letter I read as L'),
            (9, 'rem-date', "June I7.'6S", "June 17,'65", '17 read I7, 65 read 6S'),
            (15, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell: 10 read io, 61 read 6i'),
            (16, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (17, 'rem-date', "July io,16i", "July 10,'61", 'first date cell'),
            (18, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (19, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (20, 'rem-date', "July io,'6l", "July 10,'61", 'first date cell: 10 read io, 61 read 6l'),
            (21, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (23, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (24, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (26, 'rem-char', "wds. reed.", "wds. recd.", 'recd read reed'),
            (27, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (28, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (30, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell'),
            (31, 'rem-date', "Aug.- I2,'62 SepL 22/62", "Aug. 12,'62 Sept. 22,'62", 'both date cells: 12 read I2, Sept. read SepL'),
            (31, 'rem-missing', "Must, out June", "Must. out June [19, '65.", 'the run-over of this remark is stored on the row below'),
            (32, 'rem-extra', "[19, '65.", None, 'the run-over of the remark of the row above is printed at the right of this line and stored on it'),
            (38, 'rem-char', "wds. reed.", "wds. recd.", 'recd read reed'),
            (39, 'rem-date', "July io,'6i", "July 10,'61", 'first date cell')],
        'notes': ['40 stored lines compared at D and R: 17 lines with a date that differs from the print (rows 0, 1, 9, 15 to 21, 23, 24, 27, 28, 30, 31, 39), 7 lines with another remark difference (rows 2, 3, 4, 26, 31, 32, 38); the first sitting\'s one error (row 20, Joshua 0. for Joshua O.) is confirmed; this page is not in the lowest OCR-confidence decile']},
}


# The 13 lines that the first layer lost and that the first sitting recovered from the page (data2/qa/recovered/*.json): the second sitting looked at the stored 300 dpi crop of each line
# (tmp/library/rosters/_qa/img, transient, not tracked) and wrote down the printed name, or the printed ditto word Same, that it reads there; the row stands when the two agree.
RECOVERED_CHECK = [
    ('union-vt', 'u-vt-2nd-vermont-infantry', 'cu31924080774148/79', 'Higgins, William', "Shoreham, May 17,'61 June 20,'61 Taken pris., July 2, '62; Par. Aug. 5, '62; Prom. Corp. Dec. 31, '62; killed in action May 4, '63."),
    ('union-vt', 'u-vt-6th-vermont-infantry', 'cu31924080774148/202', 'Daggett, Charles R.', "Putney, July 13,'63 July 13,'63 Drafted; joined ambulance train May 17, '64; died ----, in Hanover county Va., buried July 29, '64."),
    ('union-vt', 'u-vt-13th-vermont-infantry', 'cu31924080774148/514', 'Drugg, Cliffus', "Stowe, Aug. 25,'62 Oct. 10,'62 Must. out July 21, '63."),
    ('union-vt', 'u-vt-15th-vermont-infantry', 'cu31924080774148/543', 'Dennis Duhigg,', "Lyndon, Sept. 17,'62 Oct. 22,'62 Priv. Co. G.; Prom. Sergt.-Maj. Nov. 14, '62; Must out Aug. 5, '63."),
    ('union-vt', 'u-vt-15th-vermont-infantry', 'cu31924080774148/559', 'Samuel H. Kellogg,', "Concord, Aug. 28,'62 Oct. 22,'62 Recd. May 3, '63; Must. out Aug. 5, '63."),
    ('union-vt', 'u-vt-1st-vermont-cavalry', 'cu31924080774148/246', 'Langdon H. Nichols,', "Roxbury, Oct. 3,'61 Nov. 19,'61 Taken pris. May 24, '62, and died at Lynchburg, Va., July 27, '62."),
    ('union-me', 'u-me-3rd-maine-infantry', 'supplementtoannu00main/56', 'Same', 'Corporal I 3 do (the line under Boynton Wilbert)'),
    ('union-me', 'u-me-3rd-maine-infantry', 'supplementtoannu00main/126', 'Same', 'Corporal A 3 do (the line under Curtis Timothy B)'),
    ('union-me', 'u-me-4th-maine-infantry', 'supplementtoannu00main/78', 'Same', 'Sergeant B 4 do (the line under Butler John, Corporal)'),
    ('union-me', 'u-me-20th-maine-infantry', 'supplementtoannu00main/103', 'Coan Elisha S', 'Private D 20 do'),
    ('union-me', 'u-me-20th-maine-infantry', 'supplementtoannu00main/201', 'Same', 'Lieut. Colonel 20 do (the second Same under Gilmore Charles D, Captain)'),
    ('union-me', 'u-me-6th-maine-infantry', 'supplementtoannu00main/31', 'Same', 'Captain C 6 do (the line under Ballinger John H, Lieutenant)'),
    ('union-me', 'u-me-1st-maine-cavalry', 'supplementtoannu00main/162', 'Ellis Osco A', 'Lieutenant E 1 do'),
]


def check_recovered():
    import re
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.casefold())
    rec = {}
    for item in ('union-vt', 'union-me'):
        for r in Q.jload(os.path.join(Q.QA, 'recovered', item + '.json'))['rows']:
            if r.get('status', '').startswith('recovered'):
                rec[(r['unit'], r.get('leaf'))] = r
    rows = []
    for item, unit, page, read_name, read_rest in RECOVERED_CHECK:
        leaf = int(page.rsplit('/', 1)[1])
        r = rec.get((unit, leaf))
        assert r is not None, (unit, leaf)
        rows.append({'item': item, 'unit': unit, 'page': page, 'recovered_name': r['name'], 'second_sitting_reads_on_the_crop': read_name, 'rest_of_the_line_as_read': read_rest, 'agrees': norm(r['name']) == norm(read_name)})
    doc = {'f': 'roster-qa-recovered-check/1', 'about': 'The second sitting looked at the stored crop of each of the 13 recovered lines and wrote down the printed name (or the printed ditto word Same) that it reads there; no row of a recovered file was changed.',
           'reader': READER, 'rows': rows, 'summary': {'lines': len(rows), 'agree': sum(1 for x in rows if x['agrees'])}}
    Q.jdump(os.path.join(Q.QA, 'recovered', 'second-sitting-check.json'), doc)
    print('recovered lines checked against their crops: %d of %d agree' % (doc['summary']['agree'], doc['summary']['lines']))


def main():
    check_recovered()
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    out = []
    for pid, sp in PAGES.items():
        stem = RN.page_stem(pid)
        v = Q.jload(os.path.join(Q.QA, 'pages', stem + '.verdict.json'))
        pg, rows = C.rows_of_page(pid)
        assert len(rows) == v['rows_stored'], (pid, len(rows), v['rows_stored'])
        first_err = {e['i'] for e in v['errors']}
        for i in sp['confirmed']:
            assert i in first_err, (pid, 'confirmed row is not an error of the first verdict', i)
        added = []
        for i, kind, stored, printed, note in sp['added']:
            r = rows[i]
            e = next((x for x in added if x['i'] == i), None)
            if e is None:
                e = {'i': i, 'kinds': [], 'rid': r['rid'], 'flagged_ocr_uncertain': bool(r['damaged']), 'flag_codes': r['codes'], 'gates': [], 'stored': [], 'printed': [], 'note': ''}
                added.append(e)
            e['kinds'].append(kind)
            e['gates'] = sorted(set(e['gates']) | {GATE.get(kind, 'R-G3')})
            if stored:
                e['stored'].append(stored)
            if printed:
                e['printed'].append(printed)
            e['note'] = (e['note'] + '; ' if e['note'] else '') + note
        for e in added:
            e['stored'] = ' | '.join(e['stored']) or None
            e['printed'] = ' | '.join(e['printed']) or None
        missed = []
        for m in sp.get('missed', []):
            text, pm, ent = Q.load_source(rows[0]['text_id'])
            a, b = pm.span(pg['leaf'])
            toks = m['name_tokens']
            # the names stand in the pinned text of the leaf, tokens separated by white space; the offset of the first token
            import re
            pat = r'\s+'.join(re.escape(t) for t in toks)
            hits = [mm.start() + a for mm in re.finditer(pat, text[a:b])]
            assert len(hits) == 1, (pid, toks, hits)
            assert R._match_tokens(text, hits[0], toks, 0) is not None
            missed.append('%s; the name stands in the pinned text %s at offset %d (leaf %d) and in no stored row of the page' % (m['what'], rows[0]['text_id'], hits[0], pg['leaf']))
        rd = Q.jload(os.path.join(Q.QA, 'pages', stem + '.read.json'))
        # every row of the first verdict that is in error is named in confirmed (asserted above for the rows listed; the check below makes the two lists equal), so nothing is left unconfirmed
        assert sorted(sp['confirmed']) == sorted(first_err), (pid, sorted(first_err), sp['confirmed'])
        a = {'f': 'roster-qa-addendum/1', 'page': pid, 'sitting_utc': now, 'reader': READER + '; ' + sp['looked'], 'levels_added': sp['levels_added'],
             'rows_compared_at_second_sitting': sp['compared_rows'], 'first_verdict_error_rows': sorted(first_err), 'confirmed_rows': sorted(sp['confirmed']), 'not_confirmed_rows': [],
             'errors_added': added, 'missed_lines_added': missed, 'notes': sp['notes'],
             'read': {'pdf_sha256': rd['pdf_sha256'], 'pdf_page': rd['pdf_page'], 'what': 'the page of the item PDF as cut out with pdftoppm at 110, 200, 300 or 500 dpi (transient views, deleted after the reading)'}}
        Q.jdump(os.path.join(Q.QA, 'pages', stem + '.addendum.json'), a)
        out.append(a)
        print('%-34s levels added %-3s | rows compared %2d | first-verdict error rows %2d, confirmed %2d | rows with errors added %2d | missed lines added %d' %
              (pid, sp['levels_added'] or '-', sp['compared_rows'], len(first_err), len(sp['confirmed']), len(added), len(missed)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
