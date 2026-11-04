#!/bin/sh
# Re-creates every csv/ file of family C-VASCGA from the cached Internet Archive text (tmp/library/rosters/C-VASCGA/files). Run from this folder.
for p in dolescook_parse salley_parse tompkins14sc_parse irby18va_parse beale9vacav_parse warren11ga_parse loehr1va_parse nichols61ga_parse page_battery_parse paroles_officers_parse gaines_hospital_parse flag_dupes finalize; do
  python -X utf8 $p.py > /dev/null || exit 1
done
