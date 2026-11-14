"""Write the recovered rows of an item (roster-qa task 4): lines that the first text layer lost, read a second time from the page image.

    python3 -I qa_recover.py union-vt          build data2/qa/recovered/union-vt.json from the specs below and check every locator

A recovered row has its OWN locator: the text id of a derived text (ledger data2/sources/QA-PAGEREAD.json: the tesseract reading of that page, pinned by sha256) and the
character offset of the first name character in it.  The checks are those of r2lib (V1 the name tokens stand at the offset, V2 the remark tokens follow in order).  The sample
reader looked at the image of every line before the row was written (the spec says so).  The rows are plain JSON beside the sample results, never lines of a unit file:
verify_unit.py --all globs *.jsonl.gz only, and nothing in data2/union is touched.
"""
import sys, os, re, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_pageread as PR
R = Q.R

VT = [
    {'unit': 'u-vt-2nd-vermont-infantry', 'page': 'cu31924080774148/79', 'name_tokens': ['Higgins,', 'William'], 'span': 2, 'co': 'K', 'rk': 'Privates.',
     'context': 'between the stored rows Hatch, Isaac and Hunter, Truman M. of the same table (company K, Privates)',
     'first_layer': "Shoreham, May '61 June 20/61 |Taken pris.. July 2, '62: Par. Aug. 5. \"62; Prom. Corp. Dec. 31, '62: / killed in action May 4. '63."},
    {'unit': 'u-vt-6th-vermont-infantry', 'page': 'cu31924080774148/202', 'name_tokens': ['Daggett,', 'Charles', 'R.'], 'span': 2, 'co': 'B', 'rk': 'Privates.',
     'context': 'between the stored rows Corev. William H. and Dickinson, Atwood A of the same table (company B, Privates)',
     'first_layer': "Putney. July '3/63 July '3/63 Drafted; joined ambulance train May 17, '64; died , in Hanover / county Va., buried July 29. '64."},
    {'unit': 'u-vt-13th-vermont-infantry', 'page': 'cu31924080774148/514', 'name_tokens': ['Drugg,', 'Cliffus'], 'span': 1, 'co': 'H', 'rk': 'Privates.',
     'context': 'between the stored rows Dow, John R and Emerson, William of the same table (company H, Privates)',
     'first_layer': "Stowe, Aug. 2s,,62lOct. 10/62 Must, out July 21, '63."},
    {'unit': 'u-vt-15th-vermont-infantry', 'page': 'cu31924080774148/543', 'name_tokens': ['Dennis', 'Duhigg,'], 'span': 1, 'co': 'NCS', 'rk': 'Sergeant-Majors.',
     'context': 'directly under the stored row Edwin L. Hovey, of the heading Sergeant-Majors (Non-Commissioned Staff)',
     'first_layer': "Lyndon, Sept 17/62 Oct 22/62 Priv. Co. G. ; Prom. Sergt.-Maj. Nov. 14, \"62; Must out Aug. 5, '63."},
    {'unit': 'u-vt-15th-vermont-infantry', 'page': 'cu31924080774148/559', 'name_tokens': ['Samuel', 'H.', 'Kellogg,'], 'span': 1, 'co': 'K', 'rk': 'Corporals.',
     'context': 'directly under the stored row Albert F. Felch, (company K, Corporals), above the heading Musicians',
     'first_layer': "Concord, Aug. 28/62 Oct. 22/6: Red. May 3. '63 ; Must, out Aug. 5. '63."},
    {'unit': 'u-vt-1st-vermont-cavalry', 'page': 'cu31924080774148/246', 'name_tokens': ['Langdon', 'H.', 'Nichols,'], 'span': 1, 'co': 'C', 'rk': 'Corporals.',
     'context': 'directly under the stored row Edmund Pope, Jr., (company C, Corporals), above the heading Musicians',
     'first_layer': "Roxbury, Oct. 3,-61 Nov. i9,'6i Taken pris. May 24, '62, and died at Lynchburg, Va., July 27, '62."},
]
# Maine index lines whose name the first layer did not read (diag-index.json 'skipped', 106 lines of the units; the first 7 by the order of the draw below were tried).
# y_djvu is the y of the line in the coordinates of the item's word boxes; the page read at 300 dpi has them at y / 1.68 (measured: 1.676 to 1.70 on 7 pages).
ME = [
    {'unit': 'u-me-3rd-maine-infantry', 'page': 'supplementtoannu00main/56', 'y_djvu': 2824, 'name_tokens': ['same'], 'first_layer_cells': ['Corporu-I', 'I', '3', 'do'], 'list': 'vol1'},
    {'unit': 'u-me-3rd-maine-infantry', 'page': 'supplementtoannu00main/126', 'y_djvu': 3401, 'name_tokens': ['Same'], 'first_layer_cells': ['Corporal', 'A', '3', 'UO'], 'list': 'vol1'},
    {'unit': 'u-me-4th-maine-infantry', 'page': 'supplementtoannu00main/78', 'y_djvu': 3274, 'name_tokens': ['Same'], 'first_layer_cells': ['Sergeant', 'B', '4', 'do'], 'list': 'vol1'},
    {'unit': 'u-me-20th-maine-infantry', 'page': 'supplementtoannu00main/103', 'y_djvu': 3310, 'name_tokens': ['Coan', 'Elisha', 'S'], 'first_layer_cells': ['| Private', 'D', '20', 'do'], 'list': 'vol1'},
    {'unit': 'u-me-20th-maine-infantry', 'page': 'supplementtoannu00main/201', 'y_djvu': 2640, 'name_tokens': ['Same'], 'first_layer_cells': ['Lieut. Colonel', '', '20', 'do'], 'list': 'vol1'},
    {'unit': 'u-me-6th-maine-infantry', 'page': 'supplementtoannu00main/31', 'y_djvu': 1260, 'name_tokens': ['Same'], 'first_layer_cells': ['Captain', 'c', '6', 'do'], 'list': 'vol1'},
    {'unit': 'u-me-1st-maine-cavalry', 'page': 'supplementtoannu00main/162', 'y_djvu': 3275, 'name_tokens': ['Ellis', 'Osco', 'A'], 'first_layer_cells': ['lieutenant', 'E', '1', 'do'], 'list': 'vol1'},
]
SPECS = {'union-vt': VT, 'union-me': ME}


def build_me():
    """Index lines of Maine: the line is found by its y position (tesseract TSV) and by its first words; the offset is that of the same line in the derived text."""
    import hashlib
    led = PR.load_ledger()
    out = []
    for sp in SPECS['union-me']:
        stem = PR.RN.page_stem(sp['page'])
        tid = 'QA-PAGEREAD.' + stem
        ent = led['texts'][tid]
        text = PR.derived_text(sp['page'])
        assert hashlib.sha256(open(os.path.join(Q.ROOT, ent['local_dir'], ent['files']['text']['name']), 'rb').read()).hexdigest() == ent['files']['text']['sha256']
        want_top = sp['y_djvu'] / 1.68
        tl = PR.tsv_lines(sp['page'])
        cand = [(abs(top - want_top), top, t) for top, left, h, t in tl if abs(top - want_top) <= 30 and t.split()[:len(sp['name_tokens'])] and
                [w.lower().strip(',.;:') for w in t.split()[:len(sp['name_tokens'])]] == [w.lower() for w in sp['name_tokens']]]
        cand.sort()
        if not cand:
            out.append({'unit': sp['unit'], 'page': sp['page'], 'status': 'not recovered: no line of the second reading starts with %s near y %.0f' % (sp['name_tokens'], want_top)})
            continue
        dist, top, t = cand[0]
        off = 0
        found = None
        for ln in text.split('\n'):
            if ' '.join(ln.split()) == ' '.join(t.split()):
                found = off
                break
            off += len(ln) + 1
        if found is None:
            out.append({'unit': sp['unit'], 'page': sp['page'], 'status': 'not recovered: the line of the TSV is not a line of the text'})
            continue
        toks = t.split()
        name = ' '.join(toks[:len(sp['name_tokens'])])
        rem = ' '.join(toks[len(sp['name_tokens']):])
        v1 = R._match_tokens(text, found, name.split(), 0) is not None
        rd = text.index(toks[len(sp['name_tokens'])], found + len(name)) - found if v1 and rem else 0
        m2 = R._match_tokens(text, found + rd, rem.split(), 200) if v1 and rem else None
        out.append({'unit': sp['unit'], 'status': 'recovered by a second reading (not merged into the unit file)', 'ia_identifier': ent['ia_identifier'], 'leaf': ent['leaf'], 'printed_page': ent['printed_page'],
                    'text_id': tid, 'off': found, 'name': name, 'rank': '', 'co': '', 'remarks': rem, 'rd': rd, 'list': sp['list'],
                    'first_layer_cells_of_the_line': sp['first_layer_cells'], 'y_check': {'first_layer_y_over_1.68': round(want_top), 'second_reading_top_px_300dpi': top, 'distance_px': round(dist)},
                    'checks': {'V1_name_tokens_at_offset': v1, 'V2_remark_tokens_follow': bool(m2), 'derived_text_sha256_matches_ledger': True},
                    'looked_at_image': 'yes: the band of the line was cropped at 300 dpi and looked at with the Read tool; the printed name is the one stored here (OCR tokens of the derived text, never corrected); the word Same is the printed ditto word of the index (the man named above)'})
    doc = {'f': 'roster-qa-recovered/1', 'item': 'union-me', 'about': 'Index lines whose name the first text layer did not read, recovered by a second reading of the page image; 7 of the 106 lines of the units were tried (sample). Each row has its own locator; none is written into a unit file.',
           'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'rows': out}
    Q.jdump(os.path.join(Q.QA, 'recovered', 'union-me.json'), doc)
    for r in out:
        print(r['status'][:40], '|', r.get('name'), '|', r['unit'], '| V1', r.get('checks', {}).get('V1_name_tokens_at_offset'), 'V2', r.get('checks', {}).get('V2_remark_tokens_follow'), '|', r.get('remarks'))
    return doc


def build(item):
    if item == 'union-me':
        return build_me()
    led = PR.load_ledger()
    out = []
    for sp in SPECS[item]:
        stem = PR.RN.page_stem(sp['page'])
        tid = 'QA-PAGEREAD.' + stem
        ent = led['texts'][tid]
        text = PR.derived_text(sp['page'])
        # the checks refer to the pinned text: its sha256 must equal the ledger
        data = text.encode('utf-8')
        import hashlib
        assert hashlib.sha256(open(os.path.join(Q.ROOT, ent['local_dir'], ent['files']['text']['name']), 'rb').read()).hexdigest() == ent['files']['text']['sha256']
        cands = PR.locate(sp['page'], ' '.join(sp['name_tokens']) + ' ' + sp['first_layer'], 3)
        best = None
        for ratio, i, span, off, chunk in cands:
            if chunk.split()[:len(sp['name_tokens'])] == sp['name_tokens']:
                best = (ratio, i, off)
                break
        if best is None:
            out.append({'unit': sp['unit'], 'page': sp['page'], 'status': 'not recovered: the name tokens %s do not stand at the start of a line of the derived text' % sp['name_tokens']})
            continue
        ratio, i, off = best
        lines = text.split('\n')
        chunk = ' '.join(lines[i:i + sp['span']])
        toks = chunk.split()
        name = ' '.join(toks[:len(sp['name_tokens'])])
        rem = ' '.join(toks[len(sp['name_tokens']):])
        # first remark token position
        m = R._match_tokens(text, off, name.split(), 0)
        v1 = m is not None
        rd = (text.index(toks[len(sp['name_tokens'])], off + len(name))) - off if v1 else None
        m2 = R._match_tokens(text, off + rd, rem.split(), 200) if v1 else None
        out.append({'unit': sp['unit'], 'status': 'recovered by a second reading (not merged into the unit file)', 'ia_identifier': ent['ia_identifier'], 'leaf': ent['leaf'],
                    'printed_page': ent['printed_page'], 'text_id': tid, 'off': off, 'name': name, 'rank': '', 'co': sp['co'], 'rk': sp['rk'], 'remarks': rem, 'rd': rd,
                    'context_of_co_and_rk': sp['context'], 'first_layer_text_of_the_line': sp['first_layer'], 'line_similarity_first_layer_vs_second': round(ratio, 3),
                    'checks': {'V1_name_tokens_at_offset': v1, 'V2_remark_tokens_follow': bool(m2), 'derived_text_sha256_matches_ledger': True},
                    'looked_at_image': 'yes: the line was cropped at 300 dpi and looked at with the Read tool; the printed name is the one stored here (OCR tokens of the derived text, never corrected)'})
    doc = {'f': 'roster-qa-recovered/1', 'item': item, 'about': 'Lines that the first text layer lost, recovered by a second reading of the page image. Each row has its own locator (text_id in data2/sources/QA-PAGEREAD.json and offset); '
           'none is written into a unit file; the unit file of the item does not hold them.', 'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'rows': out}
    Q.jdump(os.path.join(Q.QA, 'recovered', item + '.json'), doc)
    for r in out:
        print(r['status'][:40], '|', r.get('name'), '|', r['unit'], '| V1', r.get('checks', {}).get('V1_name_tokens_at_offset'), 'V2', r.get('checks', {}).get('V2_remark_tokens_follow'))
    return doc


if __name__ == '__main__':
    build(sys.argv[1])
