"""NY: read the Gettysburg row of the per-unit 'Battles and Casualties from Phisterer' spreadsheets published by the New York State Military Museum
(a transcription of the table in Phisterer, New York in the War of the Rebellion, 1912). Python 3.11 stdlib only; run with -I -X utf8."""
import zipfile, re, os, json


def _col(ref):
    m = re.match(r'([A-Z]+)', ref)
    return m.group(1)


def read_sheet_rows(path):
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss = [re.sub(r'<[^>]+>', '', x) for x in re.findall(r'<si>(.*?)</si>', z.read('xl/sharedStrings.xml').decode('utf8'), re.S)]
    out = {}
    for name in sorted(n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')):
        sh = z.read(name).decode('utf8')
        rows = []
        for r in re.findall(r'<row [^>]*>(.*?)</row>', sh, re.S):
            cells = {}
            for ref, attr, inner in re.findall(r'<c r="([A-Z]+\d+)"([^>]*?)(?:/>|>(.*?)</c>)', r, re.S):
                v = re.search(r'<v>(.*?)</v>', inner or '')
                val = v.group(1) if v else ''
                if 't="s"' in attr and val != '':
                    val = ss[int(val)]
                cells[_col(ref)] = val
            rows.append(cells)
        out[name] = rows
    return out


def gettysburg(path):
    """-> dict(off_killed, enl_killed, off_wd_died, enl_wd_died, off_wd_rec, enl_wd_rec, off_miss, enl_miss, aggregate) or None"""
    try:
        sheets = read_sheet_rows(path)
    except Exception as e:
        return dict(error=str(e))
    for name, rows in sheets.items():
        hdr = None
        for cells in rows:
            vals = list(cells.values())
            if 'Camp./Battle' in vals and 'Aggregate' in vals:
                hdr = {col: v for col, v in cells.items()}
                continue
            if hdr and any(v == 'Gettysburg' for v in vals):
                rec = {hdr[c]: v for c, v in cells.items() if c in hdr}
                if 'Gettysburg' in (rec.get('Camp./Battle'), rec.get('Place')):
                    def num(k):
                        try:
                            return int(float(rec.get(k, '') or 0))
                        except ValueError:
                            return None
                    return dict(off_killed=num('Off. Killed'), enl_killed=num('Enl. Killed'), off_wd_died=num('Off. Wd. D'), enl_wd_died=num('Enl. Wd. D.'),
                                off_wd_recovered=num('Off. Wd. R.'), enl_wd_recovered=num('Enl. Wd. R.'), off_missing=num('Off. Miss.'), enl_missing=num('Enl. Miss.'), aggregate=num('Aggregate'), date=rec.get('Date'), date_end=rec.get('Date End'))
    return None
