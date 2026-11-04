"""python -I tools/bt/recheck_D_set.py  < json   -- merge {claim_id: {fields}} into tools/bt/positions_D_recheck.json (fields replace per claim), then rebuild positions_D.jsonl"""
import sys, os, json, subprocess
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_D_recheck.json')
cur = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
new = json.loads(sys.stdin.read())
cur.update(new)
json.dump(cur, open(p, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1, sort_keys=False)
r = subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(p), 'positions_build.py'), 'D'], capture_output=True, text=True, encoding='utf-8')
print(r.stdout[-1500:], r.stderr[-500:])
from collections import Counter
print(Counter(v.get('fc') for v in cur.values()))
