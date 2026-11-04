#!/bin/sh
# usage: run.sh script.py args...  -> below-normal priority python, stdout/stderr to tmp/library/rosters/C-ALMSTX/out_<script>.txt
S=$1; shift
cd /c/Users/mlege/gettysburg-map
cmd //c "start /low /wait /b python -I -X utf8 docs/battle-theatre/rosters/data/C-ALMSTX/scripts/$S $*" > tmp/library/rosters/C-ALMSTX/out_$S.txt 2>&1
