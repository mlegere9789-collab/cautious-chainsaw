"""Do the verdicts of the independent sample still describe the stored lines as they are now?  (roster-qa closure check)

    python3 -I qa_current.py            write data2/qa/verdicts-vs-files.json and print one line per page

Every verdict (data2/qa/pages/*.verdict.json) lists the stored lines of its page as they stood when the sample reader compared them with the page image:
rid (unit file stem and row number), name, rank, company, sha256 of the remarks, offset and text id.  This script reads the unit files as they are now, takes the
rows whose offset lies on the leaf of the page (in the files of the frame page and the text ids of the frame page, as qa_compare.rows_of_page does) and compares
the two lists.  A page whose lines are identical (same rows, same order, same fields) is "identical": the verdict stands for the current files.  Any difference is
written out with both texts; the result is never smoothed.  Reads files only; changes nothing under data2/union.
"""
import sys, os, json, glob, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
R = Q.R


def main():
    frame = Q.jload(os.path.join(Q.QA, 'frame.json'))
    fpage = {p['id']: p for p in frame['pages']}
    verdicts = [Q.jload(p) for p in sorted(glob.glob(os.path.join(Q.QA, 'pages', '*.verdict.json')))]
    need = set()
    for v in verdicts:
        need.update(fpage[v['page']]['files'])
    by_stem = {}
    frame_in = {Q.rel(os.path.join(Q.ROOT, i['file'])): i for i in frame['inputs']}
    frame_files = {'files_in_frame': len(frame['inputs']), 'differ_from_frame': [], 'missing_now': [], 'rows_at_frame_by_item': {}, 'rows_now_by_item': {}}
    for fi in frame['inputs']:
        frame_files['rows_at_frame_by_item'][fi['item']] = frame_files['rows_at_frame_by_item'].get(fi['item'], 0) + fi['rows']
    for item, st, path in Q.unit_files():
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        head, segs, meta = R.read_unit(path)
        frame_files['rows_now_by_item'][item] = frame_files['rows_now_by_item'].get(item, 0) + head['n']
        fi = frame_in.get(Q.rel(path))
        if fi is not None and fi['sha256_raw_lines'] != meta['sha256']:
            frame_files['differ_from_frame'].append({'file': Q.rel(path), 'rows_at_frame': fi['rows'], 'rows_now': head['n'], 'item': item})
        if stem not in need:
            continue
        rows = []
        n = 0
        for seg, rs in segs:
            text, pm, ent = Q.load_source(seg['t'])
            for r in rs:
                rows.append({'n': n, 'text_id': seg['t'], 'leaf': pm.leaf(r[5]), 'name': r[0], 'rank': r[1], 'co': r[2], 'remarks': r[3], 'off': r[5]})
                n += 1
        by_stem[stem] = {'rows': rows, 'sha256_of_file_lines': meta['sha256'], 'n': head['n']}
    for fi in frame['inputs']:
        if not os.path.exists(os.path.join(Q.ROOT, fi['file'])):
            frame_files['missing_now'].append(fi['file'])
    out = {'f': 'roster-qa-verdicts-vs-files/1', 'about': 'The stored lines of every page that was looked at, now (unit files as they are in the tree) against the lines the verdict lists (as they stood when the page was compared with its image).',
           'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'frame_files': frame_files, 'pages': [], 'summary': {}}
    nid = 0
    for v in verdicts:
        pg = fpage[v['page']]
        now = []
        for stem in pg['files']:
            if stem not in by_stem:
                continue
            for r in by_stem[stem]['rows']:
                if r['text_id'] in pg['text_ids'] and r['leaf'] == pg['leaf']:
                    now.append((stem, r))
        listed = v['rows_listed']
        diffs = []
        if len(now) != len(listed):
            diffs.append({'what': 'number of lines on the leaf', 'verdict': len(listed), 'now': len(now)})
        for k, (lr, (stem, r)) in enumerate(zip(listed, now)):
            rid = '%s#%d' % (stem, r['n'])
            for fld, a, b in (('rid', lr['rid'], rid), ('name', lr['name'], r['name']), ('rank', lr['rank'], r['rank']), ('co', lr['co'], r['co']),
                              ('remarks_sha256', lr['remarks_sha256'], Q.sha256_bytes(r['remarks'].encode('utf-8'))), ('off', lr['off'], r['off']), ('text_id', lr['text_id'], r['text_id'])):
                if a != b:
                    diffs.append({'row': k, 'field': fld, 'verdict': a, 'now': b})
        ident = not diffs
        nid += ident
        out['pages'].append({'page': v['page'], 'stratum': v['stratum'], 'lines_in_verdict': len(listed), 'lines_now_on_the_leaf': len(now), 'identical': ident, 'differences': diffs[:50]})
        print('%-40s %-16s verdict %3d now %3d %s' % (v['page'], v['stratum'], len(listed), len(now), 'identical' if ident else 'DIFFERENT (%d differences)' % len(diffs)))
    out['summary'] = {'pages': len(verdicts), 'identical': nid, 'different': len(verdicts) - nid, 'lines_in_verdicts': sum(len(v['rows_listed']) for v in verdicts),
                      'files_in_frame': frame_files['files_in_frame'], 'files_differing_from_frame': len(frame_files['differ_from_frame']), 'files_missing_now': len(frame_files['missing_now'])}
    Q.jdump(os.path.join(Q.QA, 'verdicts-vs-files.json'), out)
    print(json.dumps(out['summary']))
    return 0 if nid == len(verdicts) else 1


if __name__ == '__main__':
    sys.exit(main())
