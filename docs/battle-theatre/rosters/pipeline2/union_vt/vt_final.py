"""The printed 'final statement' of each Vermont regiment (Revised Roster, 1892), read from the pinned text, with offsets.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_final.py            (run from the repository root)

Writes docs/battle-theatre/GOVERNANCE/horde/ws-rosters/union-vt/final-statements.json.  Every quote is a substring of the pinned text found at the
recorded character offset (asserted here); numbers are copied as the text layer prints them and read as integers only where they read cleanly.
The statement is the Adjutant General's own count of the men who served in the regiment (original members plus gain = aggregate); the page
prints the aggregate twice (after the gain and after the losses).
"""
import os, sys, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vt_lib as L          # noqa: E402

OUT = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-vt', 'final-statements.json')
UNITS = {'u-vt-2nd-vermont-infantry': (42, 81), 'u-vt-3rd-vermont-infantry': (82, 120), 'u-vt-4th-vermont-infantry': (121, 156),
         'u-vt-5th-vermont-infantry': (157, 191), 'u-vt-6th-vermont-infantry': (192, 228), 'u-vt-1st-vermont-cavalry': (229, 281),
         'u-vt-12th-vermont-infantry': (473, 494), 'u-vt-13th-vermont-infantry': (495, 518), 'u-vt-14th-vermont-infantry': (519, 540),
         'u-vt-15th-vermont-infantry': (541, 561), 'u-vt-16th-vermont-infantry': (562, 584)}
import gzip
import vt_parse as P          # noqa: E402


def toint(s):
    t = re.sub(r'[ ,.]', '', s.strip(' .'))
    return int(t) if re.fullmatch(r'\d+', t) else None


def lines_of(leafrec):
    ws = P.load_words(leafrec)
    t = P.estimate_tilt(ws)
    for w in ws:
        w['yk'] = w['yc'] - t * (w['x0'] - 180)
    return P.cluster_lines(ws)


def main():
    text, pm, ent = L.load_text()
    d = json.load(gzip.open(os.path.join(L.WORK, 'leaves.json.gz'), 'rt', encoding='utf-8'))
    out = {'about': 'the final statement printed at the end of each regiment roll, read from the word boxes of the page (the text layer lists the number '
                    'columns apart from their labels); every number is a word of the text layer found at the offset given in the pinned text (asserted); '
                    'numbers are copied as printed and read as integers only where they read cleanly',
           'text_id': L.TEXT_ID, 'units': {}}
    for key, (a, b) in UNITS.items():
        leaf = None
        for lf in range(a, b + 1):
            s0, s1 = pm.span(lf)
            if re.search(r'final\s+statement\s+of\s+the', text[s0:s1], re.I):
                leaf = lf
                break
        if leaf is None:
            out['units'][key] = {'found': False}
            continue
        lines = lines_of(d[str(leaf)])
        u = {'found': True, 'leaf': leaf, 'printed_page': pm.printed(leaf), 'lines': {}}

        def find(rx, nth=0):
            hits = [l for l in lines if re.search(rx, P.line_text(l))]
            return hits[nth] if len(hits) > nth else None

        def num_of(l, which=-1):
            """(value, printed word, offset) of the last number-like word of a line, or of the word after a label when it stands apart"""
            cand = [w for w in l if re.search(r'\d', w['w']) and w['off'] is not None]
            if not cand:
                return None, None, None
            # the figure after the last "total," (or the last figure of the line); a figure printed with a space ("1 1") is one number
            k = max([i for i, w in enumerate(l) if re.match(r'^total\W*$', w['w'], re.I)] or [-1])
            tail = [w for w in l[k + 1:] if re.fullmatch(r"[0-9][0-9,.]*|[.\u2022\u2014\- ]+", w['w'])] if k >= 0 else []
            nums = [w for w in tail if re.search(r'\d', w['w'])]
            if k >= 0 and nums and all(w['off'] is not None for w in nums):
                for w in nums:
                    assert text[w['off']:w['off'] + len(w['w'])] == w['w']
                joined = ''.join(w['w'] for w in nums)
                return toint(joined), ' '.join(w['w'] for w in nums), nums[0]['off']
            w = cand[which]
            assert text[w['off']:w['off'] + len(w['w'])] == w['w']
            return toint(w['w']), w['w'], w['off']
        for label, rx, nth in (('original_members', r'^\W*Original\s+members', 0), ('gain', r'^\W*Gain\b', 0), ('aggregate_first', r'^\W*Aggregate', 0),
                               ('aggregate_second', r'^\W*Aggregate', 1), ('total_wounded', r'Total\s+wounded', 0),
                               ('total_taken_prisoner', r'Total\s+taken\s+prisoner', 0)):
            l = find(rx, nth)
            if not l:
                continue
            lt = P.line_text(l)
            v, wtxt, off = num_of(l)
            rec = {'line': lt, 'number_word': wtxt, 'number': v, 'number_offset': off}
            first = next((w for w in l if w['off'] is not None), None)
            if first:
                rec['label_offset'] = first['off']
            if label == 'original_members':
                m1 = re.search(r'Officers,\s*([0-9,]+)\s*[;:]\s*Enlisted\s+men,\s*([0-9,]+)', lt)
                if m1:
                    rec['officers'], rec['enlisted'] = toint(m1.group(1)), toint(m1.group(2))
            u['lines'][label] = rec
        # when the number of a label stands on the next line (the page breaks the line), read it from the line below
        for label in ('total_taken_prisoner',):
            r = u['lines'].get(label)
            if r and r['number'] is None:
                l = find(r'Total\s+taken\s+prisoner', 0)
                nxt = lines[lines.index(l) + 1] if l in lines and lines.index(l) + 1 < len(lines) else None
                if nxt:
                    v, wtxt, off = num_of(nxt)
                    r.update({'number_word': wtxt, 'number': v, 'number_offset': off, 'number_on_next_line': True})
        o = u['lines'].get('original_members', {}).get('number')
        g = u['lines'].get('gain', {}).get('number')
        ag = u['lines'].get('aggregate_first', {}).get('number')
        ag2 = u['lines'].get('aggregate_second', {}).get('number')
        oo, oe = u['lines'].get('original_members', {}).get('officers'), u['lines'].get('original_members', {}).get('enlisted')
        ag_use = ag if ag is not None else ag2
        u['aggregate_printed'] = ag_use
        u['checks'] = {
            'officers_plus_enlisted_equals_original_total': (oo + oe == o) if None not in (oo, oe, o) else None,
            'original_plus_gain_equals_aggregate': (o + g == ag_use) if None not in (o, g, ag_use) else None,
            'aggregate_second_equals_first': (ag == ag2) if None not in (ag, ag2) else None}
        out['units'][key] = u
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    for k, u in out['units'].items():
        print(k.replace('u-vt-', ''), u.get('leaf'), u.get('printed_page'), 'aggregate', u.get('aggregate_printed'),
              'original', u.get('lines', {}).get('original_members', {}).get('number'), 'gain', u.get('lines', {}).get('gain', {}).get('number'), u.get('checks'))


if __name__ == '__main__':
    main()
