"""Append (or replace) the generated results block at the end of data/PA/README.md from stats.json and reconciliation.csv."""
import sys, os, json, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

st = json.load(open(os.path.join(C.DATA, 'stats.json')))
rec = {r['unit_id']: r for r in csv.DictReader(open(os.path.join(C.DATA, 'reconciliation.csv'), encoding='utf-8'))}
ocr = json.load(open(os.path.join(C.DATA, 'datecol_second_ocr.json'))) if os.path.exists(os.path.join(C.DATA, 'datecol_second_ocr.json')) else {}
pages_ocr = len({k.rsplit('|', 1)[0] for k in ocr})
per = st['per_unit']
names_oob = sum(v['rows'] for v in per.values() if v['in_oob'])
extras = sum(v['rows'] for v in per.values() if not v['in_oob'])
unread_oob = sum(v['roll_status'].get('unreadable-or-ambiguous', 0) for v in per.values() if v['in_oob'])
lab = {'Present-Documented': 0, 'Absent-Documented': 0, 'Unknown': 0}
for v in per.values():
    if v['in_oob']:
        for k, n in v['labels'].items():
            lab[k] = lab.get(k, 0) + n
rs = {}
for v in per.values():
    if v['in_oob']:
        for k, n in v['roll_status'].items():
            rs[k] = rs.get(k, 0) + n
lines = []
lines.append('<!-- RESULTS-BEGIN -->')
lines.append('## Generated results (stats.json, %s)' % st['generated'])
lines.append('')
lines.append('* OOB Pennsylvania units: %d; with a roll of names: %d (all); 3 further detachment entries covered through their parent roll; extra units not in the OOB: %s.' % (st['units_in_oob'], st['units_with_names'], ', '.join(st['extra_units_not_in_oob'])))
lines.append('* Names (roll rows as printed, whole-war roll of each regiment, duplicates not merged): %d in OOB units, %d more in the three extra regiments.' % (names_oob, extras))
lines.append('* Labels in OOB units: ' + ', '.join('%s %d (%.1f%%)' % (k, n, 100.0 * n / names_oob) for k, n in lab.items()) + '.')
lines.append('* Roll status: ' + ', '.join('%s %d (%.1f%%)' % (k, n, 100.0 * n / names_oob) for k, n in sorted(rs.items())) + '.')
lines.append('* Rows unreadable or ambiguous (a date lost in the OCR text layer): %d = %.1f%% of OOB rows.' % (unread_oob, 100.0 * unread_oob / names_oob))
lines.append('* Second OCR of the date column applied on %d roll pages (resumable; see above).' % pages_ocr)
lines.append('* Documented strength present (1914 monument inscription) found for %d of %d OOB units; for the other units no "Present at Gettysburg" inscription was found in the cached OCR text of vol II (not determined whether the inscription is absent from that volume or lost in the OCR; see GAPS G-PA6 and G-PA7).' % (sum(1 for u, r in rec.items() if r['S_doc_inscription_total'] and per[u]['in_oob']), st['units_in_oob']))
lines.append('')
lines.append('| unit | rows | Present-Documented | Absent-Documented | Unknown | unreadable | S_doc (inscription) | OOB strength | status |')
lines.append('|---|---|---|---|---|---|---|---|---|')
for u, v in per.items():
    r = rec[u]
    lines.append('| %s | %d | %d | %d | %d | %d | %s | %s | %s |' % (u, v['rows'], v['labels'].get('Present-Documented', 0), v['labels'].get('Absent-Documented', 0), v['labels'].get('Unknown', 0),
                                                                    v['roll_status'].get('unreadable-or-ambiguous', 0), r['S_doc_inscription_total'] or '-', r['S_oob'] or '-', r['status']))
lines.append('<!-- RESULTS-END -->')
p = os.path.join(C.DATA, 'README.md')
s = open(p, encoding='utf-8').read()
if '<!-- RESULTS-BEGIN -->' in s:
    s = s[:s.index('<!-- RESULTS-BEGIN -->')].rstrip('\n') + '\n\n'
else:
    s = s.rstrip('\n') + '\n\n'
s += '\n'.join(lines) + '\n'
open(p, 'w', encoding='utf-8').write(s)
print('ok', names_oob, extras, unread_oob)
