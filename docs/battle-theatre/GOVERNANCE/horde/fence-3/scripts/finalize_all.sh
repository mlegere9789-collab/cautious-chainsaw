#!/bin/bash
# Rebuilds and installs every output of the fence-3 third reading from the scripts (idempotent).
set -e
cd /home/user/cautious-chainsaw
G=docs/battle-theatre/GOVERNANCE
python3 -I tmp/fence-3/scripts/r3_assemble.py tmp/fence-3/data/r3_out.jsonl | cut -c1-150
python3 -I tmp/fence-3/scripts/validate_r2.py tmp/fence-3/data/r3_out.jsonl | tail -1
python3 -I tmp/fence-3/scripts/check_rows.py tmp/fence-3/data/r3_out.jsonl | tail -1
cp tmp/fence-3/data/r3_out.jsonl $G/evidence_corrections/fence-3.jsonl
python3 -I tmp/fence-3/scripts/gen_register_r3.py | tail -1
cp tmp/fence-3/backup-2026-11-16/world-content-fence-3-structures.md $G/horde/requests/world-content-fence-3-structures.md
python3 -I tmp/fence-3/scripts/update_request.py | cut -c1-120
python3 - <<'PY'
p='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/fence-3/lookups.jsonl'
L=[l for l in open(p,encoding='utf-8').read().split('\n') if l.strip() and 'bt-evidence third reading 2026-11-16' not in l]
open(p,'w',encoding='utf-8').write('\n'.join(L)+'\n')
PY
python3 -I tmp/fence-3/scripts/gen_report3.py
for f in r3_c.py verify_or_light.py r2lib.py r2_a.py r2_b.py r2_c.py r2_assemble.py r2_assemble_lib.py r3lib.py r3_a.py r3_b.py r3_assemble.py r3_assemble_lib.py check_rows.py validate_r2.py verify_or.py triage.py gen_register_r3.py gen_report3.py update_request.py finalize_all.sh; do cp tmp/fence-3/scripts/$f $G/horde/fence-3/scripts/$f; done
python3 -I tmp/fence-3/scripts/validate.py | tail -1
