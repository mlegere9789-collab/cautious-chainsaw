#!/usr/bin/env python3
"""Writes the PERF5 patch files into tools/t0/patches-next/ :
    PERF5.json        bundle part  (entry module: the first frame of the Virtual Walkthrough and of the Monuments layer)
    PG-zperf5.json    page part    (ground-remembers.html: the heat layer in a task of its own)
and checks every anchor against the built R1e dist (release/R1e/dist) so a wrong anchor is found here and not in the build.

    python tools/t0/perf5/gen_perf5.py            write both files
    python tools/t0/perf5/gen_perf5.py --check    exit 1 when the files on disk differ from what this script writes

PERF5 is applied after ACC (last bundle group) in train R1f; PG-zperf5 sorts after PG-zperf4 and anchors on the finished text of the other page groups.
What the patches say and why is in tools/t0/PERF5-README.md.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tools', 't0', 'patches-next')
DIST = os.path.join(REPO, 'release', 'R1e', 'dist')


def dumps(o):
    return json.dumps(o, indent=1, ensure_ascii=False) + '\n'


def entry_text():
    d = os.path.join(DIST, 'assets')
    f = [x for x in os.listdir(d) if x.startswith('index-') and x.endswith('.js')][0]
    return open(os.path.join(d, f), encoding='utf-8', newline='').read()


# ------------------------------------------------------------------------------------------------------------------------------------------------ bundle
# gtStepper(m, steps, alive, end, pre): runs steps[0], steps[1], ... on map m, each in a task of its own that starts after two Mapbox renders (or 120 ms) of the one before; `pre` waits the same
#   before the first step; `alive()` false (or a removed map) stops it; `end()` is called when it stops or finishes.
# gtPreIds(m, ids, icons): asks Mapbox's program precompiler for the programs of the named circle layers (also while they are hidden, which gtPrecompileExtra skips) and the text-SDF symbol
#   program (and, with icons, the icon variant), with the same parameters gtPrecompile / gtPrecompileExtra use, then executes the batch: the GPU process links them in parallel with the main thread.
STEPPER = (
    'function gtStepper(m,q,alive,end,pre){let i=0;const fin=()=>{try{end&&end()}catch(e){}},'
    'wt=cb=>{let n=0,d=0,t;const nx=()=>{if(d)return;d=1;clearTimeout(t);m.off("render",tk);setTimeout(cb,0)},tk=()=>{++n>=2&&nx()};m.on("render",tk);t=setTimeout(nx,120);m.triggerRepaint()},'
    'go=()=>{if(m._removed||alive&&!alive())return void fin();try{q[i++]()}catch(e){console.warn("step",e)}if(i>=q.length)return void fin();wt(go)};pre?wt(go):go()}'
    'function gtPreIds(m,ids,icons,done,own){const dn=()=>{try{done&&done()}catch(e){}};try{const s=m.style,pc=s&&s._programPrecompiler,p=m.painter;if(m._removed||!pc||!p||!s._layers||!p.context.extParallelShaderCompile)return void dn();'
    'const c=p.context,L=s._mergedLayers||s._layers,q=[],u=rs=>q.push({programId:"symbol",params:{defines:rs.concat(["USE_PAINT_PROPERTIES_UBO","MAX_UBO_SIZE_VEC4 "+Math.floor(Math.floor(c.maxUniformBlockSize/4)/4)+"u"]),overrideFog:!1,overrideTerrain:!1,overrideGlobe:!1,overrideRtt:!1,precompiled:!0}});'
    'if(own&&pc.needsBuild()){pc.buildQueue(s._order.map(i=>s._layers[i]),{zoom:m.getZoom()},s);q.push(...pc._queue.splice(0,pc._queue.length))}'
    'for(const id of ids){const y=L[id];if(!y||y.type!=="circle"||!y.getDefaultProgramParams)continue;const d=y.getDefaultProgramParams("circle",m.getZoom(),s._styleColorTheme&&s._styleColorTheme.lut);'
    'q.push({programId:"circle",params:{config:d.config,defines:(d.defines||[]).concat(["DEPTH_D24"]),overrideFog:!1,overrideTerrain:!1,overrideGlobe:!1,overrideRtt:!1,precompiled:!0}})}'
    'if(!c.disableSymbolUBO){u(["RENDER_SDF"]);icons&&u([])}'
    'const run=()=>{try{if(m._removed||m.style!==s||!q.length)return void dn();pc._queue.unshift(q.shift());pc._executeBatch({timeRemaining:()=>0},p,s);if(pc._idleHandle!=null&&typeof cancelIdleCallback<"u"){cancelIdleCallback(pc._idleHandle);pc._idleHandle=null}}catch(e){return void dn()}setTimeout(run,0)};run()}catch(e){dn()}}'
)


def bundle():
    P = []

    def add(id_, find, repl, note):
        P.append({'id': id_, 'target': 'js', 'find': find, 'repl': repl, 'expect': 1, 'note': note})

    add('PERF5-stepper', 'function gtSlices(c,a){', STEPPER + 'function gtSlices(c,a){',
        "two helpers next to PERF4's gtSlices: gtStepper (steps in tasks of their own, two renders apart) and gtPreIds (program precompile of named layers, hidden or not)")
    # ---- Virtual Walkthrough: its map is created one frame after the overlay is painted; its layers are added hidden when its style has loaded, their programs are queued then, and they are shown at 'load' in two steps
    add('PERF5-wt-defer-map',
        'pt.useEffect(()=>{var el=document.getElementById("gtbg-wt-map");if(!el||M.current)return;z_.accessToken=a2;',
        'pt.useEffect(()=>{var gtq=0,gtr=requestAnimationFrame(function(){gtq=setTimeout(function(){gtq=0;var el=document.getElementById("gtbg-wt-map");if(!el||M.current)return;z_.accessToken=a2;',
        'the Walkthrough map is built in a task after the first paint of the overlay (the click task was React + a forced layout + the Mapbox constructor)')
    add('PERF5-wt-style-load',
        'M.current.on("load",function(){M.current.addSource("wt-stops",{',
        'M.current.once("style.load",function(){if(!M.current)return;M.current.addSource("wt-stops",{',
        'the sources and layers are added when the style has loaded (was: at load)')
    add('PERF5-wt-gated-circle',
        'M.current.addLayer({id:"wt-stops-circle",type:"circle",source:"wt-stops",paint:',
        'M.current.addLayer({id:"wt-stops-circle",type:"circle",source:"wt-stops",minzoom:24,paint:',
        'added out of its zoom range (24 to 24, which the original does not have): Mapbox treats it as hidden, loads no tiles for it and draws nothing, yet its programs can be queued; shown at load by setLayerZoomRange(0, 24), the default range')
    add('PERF5-wt-gated-num',
        'source:"wt-stops",layout:{"text-field"',
        'source:"wt-stops",minzoom:24,layout:{"text-field"',
        'added out of its zoom range, like the circle layer')
    add('PERF5-wt-gated-dots',
        'M.current.addLayer({id:"wt-mons-dots",type:"circle",source:"wt-mons",paint:',
        'M.current.addLayer({id:"wt-mons-dots",type:"circle",source:"wt-mons",minzoom:24,paint:',
        'added out of its zoom range, like the circle layer')
    add('PERF5-wt-reveal',
        '"circle-opacity":0.75}});});return function(){if(M.current){M.current.remove();',
        '"circle-opacity":0.75}});var gtm=M.current;setTimeout(function(){gtPreIds(gtm,["wt-stops-circle","wt-mons-dots"],0,null,1)},0);'
        'gtm.on("load",function(){gtStepper(gtm,[function(){gtm.setLayerZoomRange("wt-stops-circle",0,24);gtm.setLayerZoomRange("wt-stops-num",0,24)},'
        'function(){gtm.setLayerZoomRange("wt-mons-dots",0,24)}],function(){return M.current===gtm})});});},0)});'
        'return function(){cancelAnimationFrame(gtr);clearTimeout(gtq);if(M.current){M.current.remove();',
        'programs of the circle layers and the text-SDF symbol program are queued when the style has loaded, so the GPU process links them while the satellite tiles load; at load the stops (circle + number: one source) are shown, one step later the monument dots, each step in a task of its own after two renders. Both stop layers are revealed in the same task because they share one GeoJSON source: a layer change while that source is loading reloads it and Mapbox can then lose the symbol bucket (PERF4 note T0-P4-10)')
    # ---- Monuments layer: the four layers are added out of their zoom range in the click, their programs queued, shown in two steps
    add('PERF5-mon-layers',
        'layers().forEach(function(L){if(m.getLayer(L.id))m.setLayoutProperty(L.id,"visibility","visible");else m.addLayer(L)});typeof gtPrecompile',
        '(function(){var Ls=layers(),put=function(L){if(m.getLayer(L.id)){m.setLayoutProperty(L.id,"visibility","visible");m.setLayerZoomRange(L.id,0,24)}else m.addLayer(L)},'
        'miss=Ls.filter(function(L){return!m.getLayer(L.id)});'
        'if(typeof gtStepper!=="function"||typeof gtPreIds!=="function"||miss.length!==Ls.length)Ls.forEach(put);'
        'else{Ls.forEach(function(L){m.addLayer(Object.assign({minzoom:24},L))});o.stg=1;'
        'setTimeout(function(){gtPreIds(m,[LD,LG,LR],1)},0);'
        'gtStepper(m,[function(){put(Ls[0])},function(){put(Ls[1]);put(Ls[2]);put(Ls[3])}],function(){return o.enabled},function(){o.stg=0},1)}})();typeof gtPrecompile',
        'first toggle: the four layers are added in the click as before but out of their zoom range (not drawn, no tiles), their programs are queued, the dots are shown two renders later and the glow, ring and stars (one source) two renders after that; the toggle off/on in between or later shows all four at once as before (put() also restores the zoom range)')
    add('PERF5-mon-fix-guard',
        'if(!need)return;o.fixing=true', 'if(!need||o.stg)return;o.fixing=true',
        'the style-data repair of the layers does not run while the first toggle is still showing them')
    return P


# ------------------------------------------------------------------------------------------------------------------------------------------------ ground-remembers.html
GR_A = "  map.on('load', () => {\n    map.addSource('scars'"
GR_B = "  map.on('load', () => { setTimeout(() => {\n    map.addSource('scars'"
GR_END_A = "        clearInterval(intervalId);\n      }\n    });\n  });\n});\n</script>"
GR_END_B = "        clearInterval(intervalId);\n      }\n    });\n  }, 0); });\n});\n</script>"


def pages():
    return [
        {'id': 'PERF5-ground-heat-task', 'target': 'ground-remembers.html', 'find': GR_A, 'repl': GR_B, 'expect': 1,
         'note': "the heat layer (addSource with the placements, addLayer, the program precompile: 20 ms at 4x) and the slider and play handlers are set up in a timer task after the 'load' render instead of inside it"},
        {'id': 'PERF5-ground-heat-task-end', 'target': 'ground-remembers.html', 'find': GR_END_A, 'repl': GR_END_B, 'expect': 1,
         'note': 'closes the timer callback of the patch before'},
    ]


def check_anchors(bundle_patches, page_patches):
    bad = []
    txt = entry_text()
    for p in bundle_patches:
        n = txt.count(p['find'])
        if n != p['expect']:
            bad.append('%s: %d hits in the R1e entry' % (p['id'], n))
    for p in page_patches:
        t = open(os.path.join(DIST, p['target']), encoding='utf-8', newline='').read()
        n = t.count(p['find'])
        if n != p['expect']:
            bad.append('%s: %d hits in %s' % (p['id'], n, p['target']))
    return bad


def wanted():
    b, pg = bundle(), pages()
    return {
        'PERF5.json': dumps({'group': 'PERF5', 'description': 'Release 1 round 4: the first frame of the Virtual Walkthrough and of the Monuments layer in tasks of their own, programs linked before they are drawn (desktop check 4, long task over 50 ms); tools/t0/PERF5-README.md', 'patches': b}),
        'PG-zperf5.json': dumps({'group': 'PG-zperf5', 'description': 'Release 1 round 4: /ground-remembers adds its heat layer in a task of its own (phone blocking time); sorts after PG-zperf4', 'train': 'R1f', 'patches': pg}),
    }, b, pg


def main(argv):
    w, b, pg = wanted()
    bad = check_anchors(b, pg)
    if bad:
        print('ANCHOR FAILURES:\n  ' + '\n  '.join(bad))
        return 2
    differs = []
    for fn, text in w.items():
        p = os.path.join(OUT, fn)
        cur = open(p, encoding='utf-8', newline='').read() if os.path.isfile(p) else None
        if cur != text:
            differs.append(fn)
            if '--check' not in argv:
                open(p, 'w', encoding='utf-8', newline='').write(text)
    print(('differs: ' if '--check' in argv else 'written: ') + (', '.join(differs) if differs else '(nothing)'))
    return 1 if ('--check' in argv and differs) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
