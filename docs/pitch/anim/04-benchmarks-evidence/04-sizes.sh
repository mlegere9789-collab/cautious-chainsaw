#!/bin/bash
# measures raw and gzip bytes of public CDN builds (body discarded)
measure() { name="$1"; url="$2"; tmp=$(mktemp); code=$(curl -s -L -o "$tmp" -w "%{http_code}" "$url"); raw=$(wc -c < "$tmp"); gz=$(gzip -9 -c "$tmp" | wc -c); echo "$name | HTTP $code | raw $raw | gzip-9 $gz | $url"; rm -f "$tmp"; }
measure "pixi.js 8.22.0"       "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.js"
measure "deck.gl 9.4.0"        "https://cdn.jsdelivr.net/npm/deck.gl@9.4.0/dist.min.js"
measure "tweakpane 4.0.5"      "https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js"
measure "lil-gui 0.21.0"       "https://cdn.jsdelivr.net/npm/lil-gui@0.21.0/dist/lil-gui.umd.min.js"
measure "milsymbol 3.0.4"      "https://cdn.jsdelivr.net/npm/milsymbol@3.0.4/dist/milsymbol.js"
measure "supercluster 9.1.0"   "https://cdn.jsdelivr.net/npm/supercluster@9.1.0/dist/supercluster.min.js"
measure "d3-force 3.0.0"       "https://cdn.jsdelivr.net/npm/d3-force@3.0.0/dist/d3-force.min.js"
measure "maplibre-gl 6.12.0"   "https://cdn.jsdelivr.net/npm/maplibre-gl@6.12.0/dist/maplibre-gl.js"
measure "pixelmatch 7.2.0"     "https://cdn.jsdelivr.net/npm/pixelmatch@7.2.0/index.js"
measure "@react-spring/web"    "https://cdn.jsdelivr.net/npm/@react-spring/web@10.1.2/dist/react-spring_web.umd.min.js"
