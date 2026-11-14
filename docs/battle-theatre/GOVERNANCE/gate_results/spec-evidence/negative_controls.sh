#!/usr/bin/env bash
# Negative controls for the checks of GATE-SPEC.md: each injects one defect into a scratch copy of the spec and requires the matching check to report it.
# A check that cannot fail would prove nothing (U-25). Scratch copies go under tmp/bt-gates/spec-negctl/ (gitignored). Usage: bash negative_controls.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../../.." && pwd)"
SPEC="$HERE/../GATE-SPEC.md"
OUT="$ROOT/tmp/bt-gates/spec-negctl"; mkdir -p "$OUT"
A="$HERE/../spec-a-evidence"
pass=0; fail=0
ctl() {  # name, expected-detector-result (0 = the check must report a problem), command...
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "FAIL  $name: the check did not report the injected defect"; fail=$((fail+1)); else echo "ok    $name"; pass=$((pass+1)); fi
}
mk() { cp "$SPEC" "$OUT/$1.md"; }
# 1 a gate loses its runner part
mk c1; python3 - "$OUT/c1.md" <<'PY'
import sys,re
p=sys.argv[1]; t=open(p).read().split('\n')
t=[l for l in t if not l.startswith('**Runner.** Command: `python3 tools/bt/gates/run_gate.py Q09`')]
open(p,'w').write('\n'.join(t))
PY
ctl "structure: gate Q09 without its runner part" python3 -I "$HERE/check_gs_structure.py" "$OUT/c1.md"
# 2 a table row with a missing cell
mk c2; python3 - "$OUT/c2.md" <<'PY'
import sys
p=sys.argv[1]; t=open(p).read().split('\n')
i=next(n for n,l in enumerate(t) if l.startswith('| X-30 |')); t[i]=t[i].replace(' | ',' ',1)
open(p,'w').write('\n'.join(t))
PY
ctl "structure: a row of the X table with a missing cell" python3 -I "$HERE/check_gs_structure.py" "$OUT/c2.md"
# 3 an X entry is missing
mk c3; python3 - "$OUT/c3.md" <<'PY'
import sys
p=sys.argv[1]; t=open(p).read().split('\n')
t=[l for l in t if not l.startswith('| X-30 |')]
open(p,'w').write('\n'.join(t))
PY
ctl "structure: X-30 missing" python3 -I "$HERE/check_gs_structure.py" "$OUT/c3.md"
# 4 an identifier is used and not defined
mk c4; echo 'See also X-99 and A-99.' >> "$OUT/c4.md"
ctl "structure: X-99 and A-99 used and not defined" python3 -I "$HERE/check_gs_structure.py" "$OUT/c4.md"
# 5 a quotation that is not in the plan, with a page cited
mk c5; printf '\nThe plan says on p. 136 "this sentence is not anywhere in the governing text of the plan".\n' >> "$OUT/c5.md"
ctl "quotes: a made-up quotation with a page cited" bash -c "python3 -I '$A/check_quotes.py' '$OUT/c5.md' | head -1 | python3 -c 'import sys,json; d=json.loads(sys.stdin.readline()); sys.exit(1 if d[\"not_in_plan\"]+d[\"wrong_page\"]+d[\"no_page_cited_not_in_plan\"]==0 else 0)' && exit 1 || exit 0"
# 6 a quotation on the wrong page
mk c6; printf '\nThe plan says on p. 9 "Do not self-certify what you have not run".\n' >> "$OUT/c6.md"
ctl "quotes: a real quotation cited to the wrong page" bash -c "python3 -I '$A/check_quotes.py' '$OUT/c6.md' | head -1 | python3 -c 'import sys,json; d=json.loads(sys.stdin.readline()); sys.exit(1 if d[\"wrong_page\"]+d[\"not_in_plan\"]==0 else 0)' && exit 1 || exit 0"
# 7 a page label that is not on the page
mk c7; printf '\nThe gate Q08 is defined there (p. 90, Q08).\n' >> "$OUT/c7.md"
ctl "pages: a Q gate cited to a page that is not p. 136" bash -c "python3 -I '$A/check_pages.py' '$OUT/c7.md' | tail -1 | python3 -c 'import sys,json; d=json.loads(sys.stdin.readline()); sys.exit(1 if d[\"mismatches\"]==0 else 0)' && exit 1 || exit 0"
# 8 a path that does not exist
mk c8; printf '\nThe runner reads `tools/bt/no_such_folder/no_such_file.py`.\n' >> "$OUT/c8.md"
ctl "paths: a path that does not exist" python3 -I "$HERE/check_gs_paths.py" "$OUT/c8.md"
# 9 a count that does not match the files
mk c9; python3 - "$OUT/c9.md" <<'PY'
import sys
p=sys.argv[1]; t=open(p).read().replace('969 rows on 2026-11-14','966 rows on 2026-11-14',1); open(p,'w').write(t)
PY
ctl "counts: 966 rows where the file has 969" python3 -I "$HERE/check_gs_counts.py" "$OUT/c9.md"
echo "controls: $((pass+fail)), reported: $pass, missed: $fail"
[ "$fail" -eq 0 ]
