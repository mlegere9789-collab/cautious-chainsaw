#!/usr/bin/env bash
# Negative controls for the checks of GATE-SPEC-A.md (U-25 applied to the spec's own checks): each control injects one defect into a scratch copy
# of the spec and requires the matching check to report it (report_problems.py exits 1). A check that cannot fail proves nothing.
# Two positive controls first (the unmodified copy must be clean for the checks that do not read moving files), one soft control (a stale count of a
# moving file is listed as STALE and is not a mismatch). Scratch copies go under tmp/bt-gates/spec-a-negctl/ (gitignored).
# Usage: bash negative_controls.sh   (about 30 s of light CPU; exit 1 when a control is missed)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../../.." && pwd)"
SPEC="$HERE/../GATE-SPEC-A.md"
OUT="$ROOT/tmp/bt-gates/spec-a-negctl"; mkdir -p "$OUT"
R="python3 -I $HERE/report_problems.py"
pass=0; fail=0
ctl() {  # name, command...: the command must exit non-zero (the check reported the defect)
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "FAIL  $name: the check did not report the injected defect"; fail=$((fail+1)); else echo "ok    $name"; pass=$((pass+1)); fi
}
pos() {  # name, command...: the command must exit zero (positive control)
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "ok    $name"; pass=$((pass+1)); else echo "FAIL  $name: the unmodified copy is not clean"; fail=$((fail+1)); fi
}
mk() { cp "$SPEC" "$OUT/$1.md"; }
edit() {  # file old new: old must occur exactly once
  python3 - "$1" "$2" "$3" <<'PY'
import sys
p, o, n = sys.argv[1:4]
t = open(p, encoding='utf-8').read()
assert t.count(o) == 1, ('anchor occurs %d times' % t.count(o), o[:60])
open(p, 'w', encoding='utf-8').write(t.replace(o, n, 1))
PY
}
dropline() {  # file prefix: remove the one line that starts with prefix
  python3 - "$1" "$2" <<'PY'
import sys
p, pre = sys.argv[1:3]
t = open(p, encoding='utf-8').read().split('\n')
k = [i for i, l in enumerate(t) if l.startswith(pre)]
assert len(k) == 1, ('lines starting with the prefix', len(k), pre)
del t[k[0]]
open(p, 'w', encoding='utf-8').write('\n'.join(t))
PY
}

# positive controls: the unmodified copy is clean for the checks that read only the plan and the spec
mk p0; for c in check_structure check_gate_parts check_pages check_quotes; do pos "positive: $c on the unmodified copy" $R $c "$OUT/p0.md"; done

# 1 a gate loses its Judges part
mk c1; edit "$OUT/c1.md" "**Judges.** SS rows (building and hospital objects), R02, R13 top rows." ""
ctl "gate parts: Q09 without its Judges part" $R check_gate_parts "$OUT/c1.md"
# 2 a table row with a missing cell
mk c2; edit "$OUT/c2.md" "| A-30 | p. 136 Q27 and the paragraph after the table | is the verification sentence part of Q27 |" "| A-30 | p. 136 Q27 and the paragraph after the table is the verification sentence part of Q27 |"
ctl "structure: a row of the ambiguity table with a missing cell" $R check_structure "$OUT/c2.md"
# 3 an identifier used and not defined
mk c3; printf '\nSee also A-99 and U-99.\n' >> "$OUT/c3.md"
ctl "structure: A-99 and U-99 used and not defined" $R check_structure "$OUT/c3.md"
# 4 a gate text that differs from the plan
mk c4; edit "$OUT/c4.md" "No pre-placed earthworks. Every earthwork, breastwork and gun emplacement is absent before its construction start" "No pre-placed earthworks. Every earthwork, breastwork and gun emplacement is absent after its construction start"
ctl "structure: the text of Q08 changed" $R check_structure "$OUT/c4.md"
# 5 a quotation that is not in the plan, with a page cited
mk c5; printf '\nThe plan says on p. 136 "this sentence is not anywhere in the governing text of the plan".\n' >> "$OUT/c5.md"
ctl "quotes: a made-up quotation with a page cited" $R check_quotes "$OUT/c5.md"
# 6 a real quotation cited to the wrong page
mk c6; printf '\nThe plan says on p. 9 "Do not self-certify what you have not run".\n' >> "$OUT/c6.md"
ctl "quotes: a real quotation cited to the wrong page" $R check_quotes "$OUT/c6.md"
# 7 a page label that is not on the page
mk c7; printf '\nThe gate Q08 is defined there (p. 90, Q08).\n' >> "$OUT/c7.md"
ctl "pages: a Q gate cited to a page that is not p. 136" $R check_pages "$OUT/c7.md"
# 8 a path that does not exist
mk c8; printf '\nThe runner reads `tools/bt/no_such_folder/no_such_file.py`.\n' >> "$OUT/c8.md"
ctl "paths: a path that does not exist" $R check_paths "$OUT/c8.md"
# 9 a count that does not match the files
mk c9; edit "$OUT/c9.md" "(969 rows on 2026-11-15:" "(966 rows on 2026-11-15:"
ctl "counts: 966 rows where the file has 969" $R check_counts "$OUT/c9.md"
# 10 an ambiguity row is missing (numbering not contiguous)
mk c10; dropline "$OUT/c10.md" "| A-30 |"
ctl "counts: A-30 missing from the ambiguity register" $R check_counts "$OUT/c10.md"
# 11 the number of rows outside the clock is wrong
mk c11; edit "$OUT/c11.md" "13 timeline rows lie wholly outside it" "12 timeline rows lie wholly outside it"
ctl "counts: 12 rows outside the clock where the files give 13" $R check_counts "$OUT/c11.md"
# 12 a threshold row of Q21 is missing
mk c12; dropline "$OUT/c12.md" "| T-Q21-2 |"
ctl "counts: T-Q21-2 missing from the threshold registry" $R check_counts "$OUT/c12.md"
# 13 a decision id that is not a row of the decisions file
mk c13; edit "$OUT/c13.md" "- **DD-G20** the rows whose own time lies outside" "- **DD-G21** the rows whose own time lies outside"
ctl "counts: DD-G21 is not a row of the decisions file" $R check_counts "$OUT/c13.md"
# 14 a requirement-level check item removed
mk c14; edit "$OUT/c14.md" "RC-R20.3 photo-match against 1863 photographs where a position is documented" "photo-match against 1863 photographs where a position is documented"
ctl "counts: RC-R20.3 removed (70 items, not 71)" $R check_counts "$OUT/c14.md"
# 15 S-077 phases misdescribed
mk c15; edit "$OUT/c15.md" "Its phases Open (July 20 or 22, the two values of C-044, both selectable) and Closed (November 20)" "Its phases Construction (July 10) and Open (July 20 or 22, the two values of C-044, both selectable)"
ctl "counts: the phases of S-077 beyond the clock misdescribed" $R check_counts "$OUT/c15.md"
# 16 soft: a stale count of a moving file is listed as STALE and does not fail the run
mk c16; edit "$OUT/c16.md" "holds 927 units in eight polygon classes" "holds 900 units in eight polygon classes"
if $R check_counts "$OUT/c16.md" | grep -q '2.3 / Q21 / 9 vegetation'; then echo "ok    soft: a stale vegetation count is listed as STALE"; pass=$((pass+1)); else echo "FAIL  soft: a stale vegetation count was not listed"; fail=$((fail+1)); fi

echo "controls: $((pass+fail)), reported or clean as expected: $pass, missed: $fail"
[ "$fail" -eq 0 ]
