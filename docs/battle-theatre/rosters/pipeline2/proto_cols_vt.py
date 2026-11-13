"""Prototype of the roster2/1 writer on one 'cols' source: the Tenth Vermont in the Revised Roster of Vermont Volunteers
(1892, Internet Archive cu31924080774148).  Planning evidence only: it tests whether the word boxes of the item's djvu.xml
can be aligned to the offsets of the hocr search text (the base text of the format) and whether the rows are then
locatable.  It is not the production parser and its output is not product data.

    python3 -I docs/battle-theatre/rosters/pipeline2/proto_cols_vt.py VT_DJVU_XML OUT_DIR       (run from the repository root)

The djvu.xml (70 MB) is a transient download and is deleted after the run; only OCR text is kept in tmp/library/rosters.
Leaves 398-425 hold the roll of the Tenth Regiment (printed pp. 383-408).
"""
import sys, os, re, json, html, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'VT-ROSTER-1892')
IDENT = 'cu31924080774148'
LEAVES = range(398, 426)


def page_words(xml):
    out = {}
    for o in xml.split('<OBJECT ')[1:]:
        m = re.search(r'value="[^"]*_(\d{4})\.djvu"', o)
        if not m or int(m.group(1)) not in LEAVES:
            continue
        ws = []
        for c in re.finditer(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([^<]*)</WORD>', o):
            x0, yb, x1, yt = (int(c.group(i)) for i in range(1, 5))
            w = html.unescape(c.group(5)).strip()
            if w:
                ws.append({'x0': x0, 'x1': x1, 'yt': yt, 'yb': yb, 'yc': (yt + yb) / 2, 'w': w})
        out[int(m.group(1))] = ws
    return out


def align(words, text, a, b):
    """Sequential alignment of xml words to the whitespace tokens of the leaf text; returns (n matched, n unmatched)."""
    tt = [(m.group(), a + m.start()) for m in re.finditer(r'\S+', text[a:b])]
    j, ok, bad = 0, 0, 0
    for w in words:
        if j < len(tt) and tt[j][0] == w['w']:
            w['off'] = tt[j][1]; j += 1; ok += 1
            continue
        for k in range(1, 8):
            if j + k < len(tt) and tt[j + k][0] == w['w']:
                w['off'] = tt[j + k][1]; j += k + 1; ok += 1
                break
        else:
            w['off'] = None; bad += 1
    return ok, bad, len(tt)


def main(xml_path, outdir):
    text = R.load_text(os.path.join(D, IDENT + '_hocr_searchtext.txt.gz'))
    pm = R.PageMap(os.path.join(D, IDENT + '_hocr_pageindex.json.gz'), os.path.join(D, IDENT + '_page_numbers.json'))
    xml = open(xml_path, encoding='utf-8').read()
    pages = page_words(xml)
    rows, co = [], ''
    stats = collections.Counter()
    for leaf in sorted(pages):
        a, b = pm.span(leaf)
        ws = pages[leaf]
        ok, bad, ntok = align(ws, text, a, b)
        stats['xml_words'] += len(ws); stats['aligned'] += ok; stats['unaligned'] += bad; stats['text_tokens'] += ntok
        # header words give the column starts
        hdr = {w['w'].rstrip('.').lower(): w for w in ws if w['yt'] < 340}
        res = hdr.get('residence'); rem = hdr.get('remarks')
        if not res:
            stats['leaves_without_header'] += 1
            continue
        enl = [w for w in ws if w['w'].lower().startswith('enlistment')]
        mus = [w for w in ws if w['w'].lower().startswith('muster')]
        xs = [res['x0'] - 40]
        xs.append((enl[0]['x0'] - 40) if enl else res['x0'] + 190)
        xs.append((mus[0]['x0'] - 40) if mus else res['x0'] + 390)
        xs.append((rem['x0'] - 90) if rem else 1450)
        hy = max(w['yb'] for w in ws if w['w'].rstrip('.').lower() in ('residence', 'remarks'))
        body = [w for w in ws if w['yt'] > hy + 5 and w['w'].upper() != 'COMPANY']
        # company headings
        for w in ws:
            if w['w'] == 'COMPANY':
                nxt = [v for v in ws if abs(v['yc'] - w['yc']) < 12 and v['x0'] > w['x0']]
                if nxt:
                    co = re.sub(r'\W', '', nxt[0]['w'])[:2].upper()
        name_words = sorted([w for w in body if w['x0'] < xs[0] and w['off'] is not None], key=lambda w: (w['yc'], w['x0']))
        if not name_words:
            continue
        margin = min(w['x0'] for w in name_words)
        lines = []
        for w in name_words:
            if lines and abs(w['yc'] - lines[-1][-1]['yc']) < 14:
                lines[-1].append(w)
            else:
                lines.append([w])
        lines = [sorted(l, key=lambda w: w['x0']) for l in lines]      # reading order inside a line
        starts = [i for i, l in enumerate(lines) if l[0]['x0'] <= margin + 30]
        for si, i in enumerate(starts):
            j = starts[si + 1] if si + 1 < len(starts) else len(lines)
            nm = [w for l in lines[i:j] for w in l]
            top = lines[i][0]['yt'] - 18
            bot = (lines[j][0]['yt'] - 18) if j < len(lines) else 10 ** 6
            cells = [w for w in body if w['x0'] >= xs[0] and top <= w['yc'] < bot and w['off'] is not None]
            cells.sort(key=lambda w: w['off'])                          # text order: each column is one block of the text
            nm.sort(key=lambda w: w['off'])
            name = ' '.join(w['w'] for w in nm)
            remarks = ' '.join(w['w'] for w in cells)
            off = nm[0]['off']
            rd = (cells[0]['off'] - off) if cells else 0
            rows.append((R.row(name, '', co, remarks, pm.printed(leaf), off, rd)))
    seg = {'s': 'VT-ROSTER-1892', 'v': '1', 't': 'VT-ROSTER-1892.1', 'lay': 'cols'}
    os.makedirs(outdir, exist_ok=True)
    path = os.path.join(outdir, '10th-vermont-infantry.jsonl.gz')
    info = R.write_unit(path, 'u-vt-10th-vermont-infantry', 'union', 'vt', '10th Vermont Infantry', [(seg, rows)])
    head, segs, meta = R.read_unit(path)
    v = R.verify_rows(segs, {seg['t']: text}, {seg['t']: pm})
    lens = sorted(len(R.dumps_line(r).encode('utf-8')) + 1 for r in rows)
    out = {'unit': head['u'], 'rows': len(rows), 'raw_bytes': info['raw'], 'gz_bytes': info['gz'], 'mean_line': round(sum(lens) / len(lens), 1),
           'median_line': lens[len(lens) // 2], 'p90_line': lens[int(len(lens) * .9)], 'share_over_90': round(sum(1 for x in lens if x > 90) / len(lens), 3),
           'alignment': dict(stats), 'verify': {k: x for k, x in v.items() if k != 'defects'}, 'defect_samples': v['defects'][:8],
           'by_company': dict(collections.Counter(r[2] for r in rows))}
    json.dump(out, open(os.path.join(outdir, 'proto_vt10_stats.json'), 'w'), indent=1)
    with open(os.path.join(outdir, 'proto_vt10_sample.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows[:20] + rows[400:408]:
            f.write(R.dumps_line(r) + '\n')
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
