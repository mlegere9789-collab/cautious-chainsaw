"""AUDIT R7 (independent audit, 30 Oct 2026): regiment-boundary repair for pages where the 'FIELD AND STAFF OFFICERS' heading of the NEXT regiment shares a page
with the end of the previous regiment's text (the heading was not detected by layout.py, so the next regiment's field-and-staff rows were attached to the last
company of the previous one, and the narrative lines above the heading were read as roll rows).
usage: audit_boundary.py [vol ...]; reads derived/<vol>.records.json and pages.json, writes derived/<vol>.records_audit.json and data/PA/AUDIT_boundary.json
Rules: heading found from the word boxes of the page (a line reading FIELD AND STAFF); records on that page above the heading with fewer than 30 percent
of rows carrying a month in the date column are narrative lines (dropped, logged); records below the heading whose section is COMPANY, up to the first change
of company, move to the regiment number of the next records of the volume that differ, company FS."""
import sys, os, json, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

MONTH = re.compile(r'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec', re.I)


def main(vols):
    log = {}
    tomb = []
    for vol in vols:
        recs = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.records.json')))
        pages = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.pages.json')))['pages']
        heads = {}
        for pg, words in pages.items():
            lines = collections.defaultdict(list)
            for w in words:
                lines[round(w[1] / 12)].append(w)
            for k, ws in lines.items():
                ws.sort()
                t = ' '.join(w[4] for w in ws)
                if re.search(r'FIEL\w?\s*AND\s*STAF\w?', t) and len(t) < 60 and ws[0][0] > 150:
                    heads[int(pg)] = min(w[1] for w in ws)
        out = []
        moved = dropped = 0
        entries = []
        idx = 0
        byp = collections.defaultdict(list)
        for i, r in enumerate(recs):
            byp[r['page']].append(i)
        drop = set()
        for pg, yh in sorted(heads.items()):
            ids = byp.get(pg, [])
            below = [i for i in ids if recs[i]['y'] > yh]
            above = [i for i in ids if recs[i]['y'] <= yh]
            below_co = [i for i in below if recs[i]['section'] == 'COMPANY']
            if not below_co:
                continue
            n0 = recs[below_co[0]]['n']
            co0 = recs[below_co[0]]['company']
            # next regiment number: first later record with a different n
            last = max(below)
            nxt = next((recs[j]['n'] for j in range(last + 1, len(recs)) if recs[j]['n'] != n0 and recs[j]['n'] is not None), None)
            if nxt is None:
                continue
            run = []
            for i in below_co:
                if recs[i]['company'] != co0:
                    break
                run.append(i)
            # narrative rows above the heading
            nar = []
            if above:
                share = sum(1 for i in above if MONTH.search(recs[i]['date'] or '')) / len(above)
                if share < 0.30:
                    nar = above
            entries.append(dict(page=pg, heading_y=yh, moved_rows=len(run), from_n=n0, from_company=co0, to_n=nxt, narrative_rows_dropped=len(nar),
                                first_moved=recs[run[0]]['name'][:30]))
            for i in run:
                recs[i]['n'] = nxt
                recs[i]['company'] = 'FS'
                recs[i]['section'] = 'FS'
                recs[i]['cflag'] = ''
                recs[i]['audit'] = 'boundary-moved-from-n%s-%s' % (n0, co0)
            drop.update(nar)
            moved += len(run); dropped += len(nar)
        for i in sorted(drop):
            tomb.append(dict(vol=vol, page=recs[i]['page'], y=recs[i]['y'], name=recs[i]['name'], rank=recs[i]['rank'], date=recs[i]['date'], rem=recs[i]['rem'][:200], reason='narrative line above the FIELD AND STAFF heading of the next regiment'))
        recs2 = [r for i, r in enumerate(recs) if i not in drop]
        json.dump(recs2, open(os.path.join(C.CACHE, 'derived', vol + '.records_audit.json'), 'w'), separators=(',', ':'))
        log[vol] = dict(heading_pages=len(heads), pages_repaired=len(entries), rows_moved=moved, narrative_rows_dropped=dropped, entries=entries)
        print(vol, len(heads), 'F&S headings;', len(entries), 'pages repaired;', moved, 'rows moved;', dropped, 'narrative rows dropped')
    json.dump(log, open(os.path.join(C.DATA, 'AUDIT_boundary.json'), 'w'), indent=1)
    import csv
    with open(os.path.join(C.DATA, 'AUDIT_tombstones.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['vol', 'page', 'y', 'name', 'rank', 'date', 'rem', 'reason'])
        w.writeheader(); w.writerows(tomb)


if __name__ == '__main__':
    main(sys.argv[1:] or ['01', '02', '03', '04', '00'])
