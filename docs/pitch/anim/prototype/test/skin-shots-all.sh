#!/usr/bin/env bash
# test/skin-shots-all.sh - regenerates every picture of the skins into docs/pitch/anim/shots/prototype/ (about 3 minutes; real Chrome, no network).  Run from the repo root after `node docs/pitch/anim/prototype/build.mjs`.
set -e
T=docs/pitch/anim/prototype/test; OUT=${1:-docs/pitch/anim/shots/prototype}; TMP=tmp/pitch-anim/skins/shots-src; mkdir -p "$OUT" "$TMP"
# 1. specimen sheets: every channel value and state drawn by the skin's own code on real units; paper, dark and imagery-like ground, device-pixel ratio 2; the variants on paper (for the montages)
node $T/skin-sheet.mjs --skins=field-manual,war-room,map-1863,minimal --dpr=2 --bg=paper,ink,imagery --out="$OUT" --prefix=sheet
node $T/skin-sheet.mjs --skins=field-manual/cvd,field-manual/contrast,war-room/cvd,war-room/contrast,map-1863/cvd,map-1863/contrast --dpr=2 --bg=paper --out="$TMP" --prefix=sheet
cp "$OUT"/sheet-field-manual-paper-dpr2.png "$OUT"/sheet-war-room-paper-dpr2.png "$OUT"/sheet-map-1863-paper-dpr2.png "$TMP"/
node $T/skin-sheet.mjs --skins=field-manual,war-room,map-1863 --dpr=1,3 --bg=paper --out="$TMP" --prefix=sheet
# 2. in the Studio: the same scene under each skin (reference first), the dark backdrop, an aggregate-heavy zoom, a close zoom with a selected unit, hover, the legend panel, a phone
node $T/skin-shots.mjs --skins=reference,field-manual,war-room,map-1863 --scenes=fresh2:15 --backdrop=paper --out="$OUT" --prefix=app
node $T/skin-shots.mjs --skins=field-manual,war-room,map-1863 --scenes=fresh2:15 --backdrop=ink --out="$OUT" --prefix=app
node $T/skin-shots.mjs --skins=field-manual,war-room,map-1863 --scenes=field:13.5 --out="$OUT" --prefix=app
node $T/skin-shots.mjs --skins=field-manual,war-room,map-1863 --scenes=fresh2:16.5 --dpr=2 --select=1 --nth=4 --out="$OUT" --prefix=app
node $T/skin-shots.mjs --skins=field-manual,war-room,map-1863 --scenes=fresh2:16.5 --dpr=2 --hover=1 --nth=8 --out="$OUT" --prefix=app
node $T/skin-shots.mjs --skins=field-manual,war-room,map-1863 --scenes=fresh2:15 --dpr=2 --about=1 --out="$OUT" --prefix=app
node $T/skin-shots.mjs --skins=field-manual,war-room,map-1863 --scenes=fresh2:15 --dpr=2 --vp=390x844 --out="$OUT" --prefix=phone
node $T/skin-shots.mjs --skins=field-manual/cvd,war-room/cvd,map-1863/cvd --scenes=fresh2:15 --backdrop=paper --out="$TMP" --prefix=app
cp "$OUT"/app-field-manual-fresh2-z15-paper.png "$OUT"/app-war-room-fresh2-z15-paper.png "$OUT"/app-map-1863-fresh2-z15-paper.png "$OUT"/app-reference-fresh2-z15-paper.png "$TMP"/
# 3. montages: variants, colour-vision-deficiency simulation, side-by-side comparison, crisp edges at DPR 1, 2, 3
python $T/skin-montage.py "$TMP" && cp "$TMP"/variants-*.png "$TMP"/cvd-*.png "$TMP"/compare-z15.png "$TMP"/crisp-*.png "$OUT"/ 2>/dev/null || true
