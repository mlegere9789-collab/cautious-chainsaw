#!/usr/bin/env bash
cd "$(dirname "$0")/prototype"
cp src/skins/index.mjs ../index.orig.mjs 2>/dev/null
build() { # name, imports, array
  name="$1"; imps="$2"; arr="$3"
  printf "%s\nexport const SKINS = [%s];\n" "$imps" "$arr" > src/skins/index.mjs
  node build.mjs --min > ../build-$name.log 2>&1 || { echo "BUILD FAIL $name"; tail -5 ../build-$name.log; }
  cp battle-studio.html ../out-$name.html
}
REF="import { referenceSkin } from './reference.mjs';
import { MINIMAL } from './minimal.mjs';"
FM="import { FIELD_MANUAL } from './field-manual.mjs';"
WR="import { WAR_ROOM } from './war-room.mjs';"
M63="import { MAP_1863 } from './map-1863.mjs';"
build base "$REF" "referenceSkin, MINIMAL"
build warroom "$REF
$WR" "referenceSkin, MINIMAL, ...WAR_ROOM"
build fieldmanual "$REF
$FM" "referenceSkin, MINIMAL, ...FIELD_MANUAL"
build map1863 "$REF
$M63" "referenceSkin, MINIMAL, ...MAP_1863"
build all "$REF
$FM
$WR
$M63" "referenceSkin, ...FIELD_MANUAL, ...WAR_ROOM, ...MAP_1863, MINIMAL"
cp ../index.orig.mjs src/skins/index.mjs
echo done
