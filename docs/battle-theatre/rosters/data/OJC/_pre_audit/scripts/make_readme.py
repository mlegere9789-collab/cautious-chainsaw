import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re
from ojc_common import *
S = json.load(open(os.path.join(DATA, 'stats.json'), encoding='utf8'))
def fam(u):
    return 'CT' if 'CT' in u else 'NJ' if 'NJ' in u else 'OH'
def numkey(u):
    m = re.search(r'(\d+)', u); return int(m.group(1)) if m else 0
units = sorted(S['units'].items(), key=lambda kv: ({'CT': 0, 'NJ': 1, 'OH': 2}[fam(kv[0])], 1 if 'ART' in kv[0] else (2 if 'CAV' in kv[0] else 0), numkey(kv[0]), kv[0]))
lines = ['| unit_id | unit | source | OOB strength | OOB casualties | rows | Present-Documented | Absent-Documented | Unknown | of which unreadable or ambiguous | rows with a name flag | status (PLAN 2.3) |', '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|']
for uid, st in units:
    l = st['labels']; pd = l.get('Present-Documented', 0); so = st['oob_strength'] or 0
    lines.append('| %s | %s | %s | %s | %s | %d | %d | %d | %d | %d (%.0f%%) | %d | %s |' % (uid, (st['oob_designation'] or '').replace('Volunteer ', ''), ', '.join(st['source_ids']), st['oob_strength'], st['oob_casualties'], st['rows'], pd, l.get('Absent-Documented', 0), l.get('Unknown', 0), st['unreadable_or_ambiguous_rows'], 100 * st['unreadable_share'], st['name_flagged_rows'], 'Short' if pd <= so else 'Contested'))
tbl = '\n'.join(lines) + '\n'
open(os.path.join(DATA, 'unit_table.md'), 'w', encoding='utf8').write(tbl)
t = open(os.path.join(DATA, 'scripts', 'README.template.md'), encoding='utf8').read()
L = S['labels']
t = t.replace('{{UNIT_TABLE}}', tbl).replace('{{TOTAL_ROWS}}', format(S['names'], ',')).replace('{{PD}}', format(L['Present-Documented'], ',')).replace('{{AD}}', format(L['Absent-Documented'], ',')).replace('{{UK}}', format(L['Unknown'], ',')).replace('{{UNR}}', format(S['rows_unreadable_or_ambiguous'], ',')).replace('{{UNRP}}', '%.1f percent' % (100 * S['unreadable_share']))
open(os.path.join(DATA, 'README.md'), 'w', encoding='utf8').write(t)
print(t.count('{{'), len(t))
