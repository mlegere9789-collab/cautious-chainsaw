"""The sampling frame and the seeded draw of the roster-qa item (PLAN.md 4.4 on the roster2/2 files).  Standard library only.

    python3 -I qa_frame.py build      write data2/qa/frame.json (every page of the four closed items with its strata) and data2/qa/draw.json
    python3 -I qa_frame.py show [STRATUM [N]]   the first N pages of a stratum's draw order with their rows and the damage score

Frame.  A page is a leaf of an Internet Archive item (identifier + 0-based leaf of its page index) that holds at least one stored line of
the four closed items (union-me, union-nh, union-vt, union-ma): unit files and the _other- files beside them.  The text id of a segment
gives the source family; a leaf is one page even where two text ids of the same item (ME-SUPP-1867.1867 and its positional twin .1867~p)
carry lines on it.  Excluded from the frame: the one pilot page that the author of the pilot read in development (pilot/QA-SAMPLE.md:
Maine Adjutant General report 1863, book p. 579, leaf 798); nothing else.

Strata.  Source family by layout (6 families) x page kind (officers pages, other pages).  An officers page holds at least 3 lines and at least
a quarter of its lines are officer lines (rule in OFFICER below).  Inside a stratum the damage score of a page is the share of its lines that
the flag file of the unit marks ocr_uncertain; the lowest OCR-confidence decile is the 10 percent of pages (at least 1) with the highest score.

Draw.  Every page of a stratum is ordered by sha256(seed | stratum | identifier | leaf) (a published, recomputable pseudo-random order); the
decile pages and the other pages are two such lists; the draw order takes a decile page at positions 1, 4, 7, ... and another page at the
positions in between, so that every prefix of m pages holds at least m/3 decile pages (PLAN.md 4.4: at least a third of each stratum's pages
come from the lowest OCR-confidence decile).  A sample is a prefix of the draw order: the smoke sample is the first pages, the full draw
extends the same list, nothing is redrawn.
"""
import sys, os, json, gzip, hashlib, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
R = Q.R

SEED = 'roster-qa-round1-2026-11-14'
EXCLUDED = {('annualreportofad1863main', 798): 'pilot page read by the pilot author (pilot/QA-SAMPLE.md, Maine report 1863 book p. 579)'}

FAMILY = {
    'ME-AGR-1863-APPD': ('ME-RET', 'cols', 'Maine Adjutant General report 1863, Appendix D: company returns'),
    'ME-SUPP-1867': ('ME-IDX', 'cols', 'Maine Supplement 1867: Alphabetical Index of the volunteers'),
    'ME-GETT-1898': ('ME-GET', 'cols', 'Maine at Gettysburg 1898: participants lists'),
    'NH-AYLING-1895': ('NH-AYL', 'flow', 'Ayling, Revised Register of New Hampshire 1895'),
    'VT-ROSTER-1892': ('VT-REV', 'cols', 'Revised Roster of Vermont Volunteers 1892'),
    'MA-SSM-1931': ('MA-SSM', 'flow', 'Massachusetts Soldiers, Sailors and Marines in the Civil War (1931)'),
}
OFFICER_RE = re.compile(r"(colonel|lieut|major|captain|capt\b|adjutant|surgeon|quartermaster|chaplain|commiss.?d officers|field and staff|acting field officer)", re.I)
NH_OFFICER_RE = re.compile(r"\bas\s+(Capt|Lieut|1st Lieut|2d Lieut|Col|Maj|Adjt|Surg|Chap|Q\.?\s?M|Com)", re.I)


def is_officer_row(fam, name, rank, co, rem):
    if fam == 'NH-AYL':
        return co == 'FS' or bool(NH_OFFICER_RE.search(rem[:140]))
    if fam == 'ME-IDX':
        return bool(re.search(r'(lieut|captain|major|colonel)', rank, re.I))
    return co == 'FS' or bool(OFFICER_RE.search(rank.lstrip('^')))


def ordkey(*parts):
    return hashlib.sha256('|'.join(str(p) for p in parts).encode('utf-8')).hexdigest()


def build():
    pages = {}          # (identifier, leaf) -> dict
    inputs = []
    for item, st, path in Q.unit_files():
        head, segs, meta = R.read_unit(path)
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        fl = Q.flags_of(path)
        damaged = set(fl.get('ocr_uncertain', [])) if fl else set()
        inputs.append({'file': Q.rel(path), 'sha256_raw_lines': meta['sha256'], 'rows': head['n'], 'item': item})
        n = 0
        for seg, rows in segs:
            text, pm, ent = Q.load_source(seg['t'])
            sid = seg['s']
            fam, lay, famname = FAMILY[sid]
            ident = ent['ia_identifier']
            for r in rows:
                name, rank, co, rem, page, off, rd = r
                leaf = pm.leaf(off)
                key = (ident, leaf)
                pg = pages.get(key)
                if pg is None:
                    pg = pages[key] = {'identifier': ident, 'leaf': leaf, 'family': fam, 'layout': lay, 'text_ids': set(), 'printed': page,
                                       'rows': 0, 'officer_rows': 0, 'damaged_rows': 0, 'files': collections.Counter(), 'items': set()}
                pg['text_ids'].add(seg['t'])
                pg['rows'] += 1
                pg['files'][stem] += 1
                pg['items'].add(item)
                if is_officer_row(fam, name, rank, co, rem):
                    pg['officer_rows'] += 1
                if n in damaged:
                    pg['damaged_rows'] += 1
                n += 1
    out = []
    for (ident, leaf), pg in sorted(pages.items()):
        if (ident, leaf) in EXCLUDED:
            continue
        kind = 'officers' if (pg['rows'] >= 3 and pg['officer_rows'] >= max(3, 0.25 * pg['rows'])) else 'other'
        out.append({'id': '%s/%d' % (ident, leaf), 'identifier': ident, 'leaf': leaf, 'printed_page': pg['printed'], 'family': pg['family'],
                    'layout': pg['layout'], 'kind': kind, 'stratum': '%s-%s' % (pg['family'], kind), 'text_ids': sorted(pg['text_ids']),
                    'rows': pg['rows'], 'officer_rows': pg['officer_rows'], 'damaged_rows': pg['damaged_rows'],
                    'damage_score': round(pg['damaged_rows'] / pg['rows'], 4), 'items': sorted(pg['items']),
                    'files': dict(sorted(pg['files'].items()))})
    return out, inputs


def draw(frame):
    strata = collections.defaultdict(list)
    for p in frame:
        strata[p['stratum']].append(p)
    result = {}
    for s, pgs in sorted(strata.items()):
        ranked = sorted(pgs, key=lambda p: (-p['damage_score'], ordkey(SEED, s, 'tie', p['identifier'], p['leaf'])))
        k = max(1, int(round(len(pgs) * 0.1)))
        dec = [p['id'] for p in ranked[:k]]
        decset = set(dec)
        dec_order = sorted(dec, key=lambda i: ordkey(SEED, s, 'D', i))
        oth_order = sorted((p['id'] for p in pgs if p['id'] not in decset), key=lambda i: ordkey(SEED, s, 'N', i))
        seq, di, oi = [], 0, 0
        pos = 1
        while di < len(dec_order) or oi < len(oth_order):
            want_dec = (pos - 1) % 3 == 0
            if want_dec and di < len(dec_order):
                seq.append(dec_order[di]); di += 1
            elif oi < len(oth_order):
                seq.append(oth_order[oi]); oi += 1
            elif di < len(dec_order):
                seq.append(dec_order[di]); di += 1
            pos += 1
        result[s] = {'pages': len(pgs), 'rows': sum(p['rows'] for p in pgs), 'decile_pages': len(dec), 'decile_min_score': ranked[k - 1]['damage_score'],
                     'decile': dec_order, 'order': seq}
    return result


def main(argv):
    cmd = argv[0] if argv else 'build'
    frame, inputs = build()
    dr = draw(frame)
    if cmd == 'build':
        Q.jdump(os.path.join(Q.QA, 'frame.json'), {'f': 'roster-qa-frame/1', 'seed': SEED, 'excluded': [{'identifier': k[0], 'leaf': k[1], 'why': v} for k, v in EXCLUDED.items()],
                                                  'inputs': inputs, 'pages': frame})
        Q.jdump(os.path.join(Q.QA, 'draw.json'), {'f': 'roster-qa-draw/1', 'seed': SEED, 'rule': __doc__.split('Draw.')[1].split('\n\n')[0].strip() if 'Draw.' in __doc__ else '', 'strata': dr})
        for s, d in dr.items():
            print('%-18s pages %5d rows %6d decile pages %3d (score >= %.3f)' % (s, d['pages'], d['rows'], d['decile_pages'], d['decile_min_score']))
        return 0
    if cmd == 'show':
        byid = {p['id']: p for p in frame}
        s = argv[1] if len(argv) > 1 else None
        n = int(argv[2]) if len(argv) > 2 else 12
        for st in ([s] if s else sorted(dr)):
            print('==', st)
            for i, pid in enumerate(dr[st]['order'][:n], 1):
                p = byid[pid]
                print('%2d %-34s printed %-6s rows %3d officers %3d damaged %3d (%.2f) %s%s' % (i, pid, p['printed_page'], p['rows'], p['officer_rows'], p['damaged_rows'], p['damage_score'],
                                                                                              'D ' if pid in dr[st]['decile'] else '  ', ','.join(sorted(p['files'])[:2])))
        return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
