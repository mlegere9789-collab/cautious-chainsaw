#!/bin/bash
# polite acquisition (public-domain, allowed hosts): descriptive UA, 5 s spacing, hard 300 s cap per file, sha256 logged
UA='gettysburg-map-research/1.0 (non-commercial historical research; polite, rate-limited, cached)'
cd "$(dirname "$0")/../../.." || exit 1
D=tmp/library/troopmaps; LOG=$D/acquire.log
get() { out="$D/$1"; url="$2"
  if [ -s "$out" ]; then echo "$(date +%F_%T) skip-exists $1" >> $LOG; return; fi
  code=$(curl -s -L -m 300 -A "$UA" -o "$out.part" -w '%{http_code}' "$url")
  if [ "$code" = 200 ] && [ -s "$out.part" ]; then mv "$out.part" "$out"; echo "$(date +%F_%T) OK $1 $(stat -c %s "$out") $(sha256sum "$out" | cut -d' ' -f1) $url" >> $LOG
  else echo "$(date +%F_%T) FAIL http=$code $1 $url" >> $LOG; rm -f "$out.part"; fi
  sleep 5; }
get loc_99447492_cw0326000c.jp2 https://tile.loc.gov/storage-services/service/gmd/gmd382/g3824/g3824g/cw0326000c.jp2
get commons_LOC99447494_july1_2to330pm.jpg 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Battle_of_Gettysburg%2C_July_1%2C_1863._First_day._General_position_of_troops%2C_2_to_3.30_p.m._LOC_99447494.jpg'
get ia_atlastoaccompany00unit.pdf https://archive.org/download/atlastoaccompany00unit/atlastoaccompany00unit.pdf
