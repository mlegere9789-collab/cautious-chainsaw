#!/bin/bash
# Refresh the build-source snapshot horde/tl-02/closeout/ (tmp/ is gitignored) after the final build.
set -e
R=/home/user/cautious-chainsaw
S=$R/docs/battle-theatre/GOVERNANCE/horde/tl-02/closeout
T=$R/tmp/tl-02
mkdir -p $S/audit $S/ver2/patch
for f in rows_a.py rows_b.py rows_c.py tl2lib.py build2.py build3.py build4.py post.py verify_out.py dd.py dd2.py astro_check.py ws9find.py NOTES.md; do cp $T/$f $S/$f; done
for f in audit_strict.py libpages_final.py mk_tmp_corr.py numcheck.py overlap.py compact.py show.py ia_fetch.py ocr2.py ocr2_report.txt ocr2_report.run1.txt viewed_leaves.json shifts.py libheads.py pagediff.py; do [ -f $T/audit/$f ] && cp $T/audit/$f $S/audit/$f; done
for f in tokcheck.py ctxshow.py tryq.py hours_uncited.py hours_or.py lookups_add.py dd3.py eg_update.py snapshot.sh; do cp $T/ver2/$f $S/ver2/$f; done
for f in apply_patch.py apply_patch2.py new_t092_093.py new_t103.py new_t111.py; do cp $T/ver2/patch/$f $S/ver2/patch/$f; done
cp $T/ver2/dd_block3.md $S/ver2/dd_block3.md 2>/dev/null || true
cp $T/ver2/tokcheck.out $S/ver2/tokcheck.out 2>/dev/null || true
echo snapshot done; du -sh $S
