#!/bin/bash
# polite LOC item-JSON probe: descriptive UA, 6 s between requests (robots Crawl-Delay 5), results to tmp/troopmaps/items
UA='gettysburg-map-research/1.0 (non-commercial historical research; polite, rate-limited, cached)'
cd "$(dirname "$0")/../../.." || exit 1
mkdir -p tmp/troopmaps/items
for id in "$@"; do
  out="tmp/troopmaps/items/$id.json"
  code=$(curl -s -m 60 -A "$UA" -o "$out" -w '%{http_code}' "https://www.loc.gov/item/$id/?fo=json")
  echo "$(date +%H:%M:%S) $id HTTP $code $(stat -c %s "$out" 2>/dev/null) bytes" >> tmp/troopmaps/loc_probe.log
  sleep 6
done
