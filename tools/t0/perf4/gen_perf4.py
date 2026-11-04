#!/usr/bin/env python3
"""Writes the PERF4 patch files into tools/t0/patches-next/ :
    PERF4.json        bundle part  (entry module, T4 layers, ANIM start-up)
    PG-zperf4.json    page part    (index.html: frame governor, hold of the first paint, immediate boot, early font warm)
and checks every anchor against the built R1d dist (release/R1d/dist) so a wrong anchor is found here and not in the build.

    python tools/t0/perf4/gen_perf4.py            write both files
    python tools/t0/perf4/gen_perf4.py --check    exit 1 when the files on disk differ from what this script writes

PERF4 is applied after BASE1863 (and after ACC if that group exists) in train R1e; PG-zperf4 sorts after PG-zperf3, so it anchors on the finished text of the other page groups.
Everything the patches say is in tools/t0/PERF4-README.md.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tools', 't0', 'patches-next')
DIST = os.path.join(REPO, 'release', 'R1d', 'dist')
CRLF = '\r\n'


def jsesc(s):
    """every non-ASCII character as a JavaScript escape (UTF-16), so the patch files and the page stay ASCII"""
    o = []
    for ch in s:
        c = ord(ch)
        if c < 128:
            o.append(ch)
        elif c < 0x10000:
            o.append(chr(92) + 'u%04X' % c)
        else:
            c -= 0x10000
            o.append(chr(92) + 'u%04X' % (0xD800 + (c >> 10)) + chr(92) + 'u%04X' % (0xDC00 + (c & 0x3FF)))
    return ''.join(o)


def crlf(s):
    return s.replace('\n', CRLF)


def dumps(o):
    return json.dumps(o, indent=1, ensure_ascii=False) + '\n'


# ------------------------------------------------------------------------------------------------------------------------------------------------ index.html
GOV = r'''  <script>
  // PERF4 frame governor.  For the first 6 s of a page the animation-frame callbacks of one frame (the map's style load, the map's render, the card placer, the engine) may not
  // use more than 20 ms together: the next callback waits for the next frame (at most two frames).  Three callbacks of 45 + 60 + 40 ms used to share one frame and were one
  // task of 150 ms; now they are three tasks.  Order is kept, nothing is dropped, cancelAnimationFrame works on the ids handed out here, and after 6 s the page's own
  // requestAnimationFrame is used as it is.
  (function () {
    var raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
    if (!raf || !caf || !window.performance) return;
    var END = 6000, BUDGET = 20, seq = 0, live = {}, curT = -1, t0 = 0;
    function now() { return performance.now(); }
    window.requestAnimationFrame = function (cb) {
      if (now() > END) return raf.call(window, cb);
      var id = 1000000000 + (++seq), rec = { n: 0, h: 0 };
      function go() {
        rec.h = raf.call(window, function (t) {
          var n = now();
          if (t !== curT) { curT = t; t0 = n; }
          if (rec.n < 2 && n - t0 > BUDGET && n < END) { rec.n++; go(); return; }
          delete live[id]; cb(t);
        });
      }
      live[id] = rec; go(); return id;
    };
    window.cancelAnimationFrame = function (id) { var r = live[id]; if (r) { caf.call(window, r.h); delete live[id]; } else caf.call(window, id); };
  })();
  </script>
'''

HOLD = r'''  <style id="gtbg-hold">html:not(.gtbg-go) body{visibility:hidden}</style>
  <noscript><style>body{visibility:visible!important}</style></noscript>
  <script>
  // PERF4: the page is painted when the map library inside the entry module has been evaluated (a task of 110-180 ms on a 4x phone that used to land right after the first
  // paint, as a freeze of the splash).  The module is imported at once (see the boot script).  If it has not even arrived 350 ms after the page started (a slow network)
  // the splash is shown as before; once it has arrived the page waits for its evaluation, never longer than 1500 ms in all.  window.__gtbgGo() is called by the entry module.
  (function () {
    var r = document.documentElement, done = 0;
    function go() { if (!done) { done = 1; r.classList.add('gtbg-go'); } }
    window.__gtbgGo = go;
    function arrived() {
      try { var e = performance.getEntriesByType('resource'); for (var i = 0; i < e.length; i++) if (/\/assets\/index-[0-9a-f]+\.js/.test(e[i].name) && e[i].responseEnd > 0) return true; } catch (x) {}
      return false;
    }
    setTimeout(function chk() { if (done) return; if (arrived() && performance.now() < 1500) setTimeout(chk, 40); else go(); }, 350);
  })();
  </script>
'''

# The strings the first open of the phone's Tools sheet lays out (font, text), read from the DOM of the open sheet: the first open was 176-240 ms (event) at 4x and the second 55-120, the difference being first use of the
# faces and words. Shaping the same strings on a detached canvas during boot makes the first open 120-144 ms (event timing, n=6, 4x phone; the same warm with generic text for the story and event cards did not change the first date-jump tap: not shipped).
TOOLS_STEPS = [
 [
  "700 16px Georgia, serif",
  "Tools"
 ],
 [
  "400 22px \"Times New Roman\"",
  "✕ 🔍 F ⚔ ☰ 🗿 🔭 ⭐ 🗺 🗺 ⊞ B ? 📖 👁 🗺️ 💬 🖥"
 ],
 [
  "400 12px sans-serif",
  "Search Filter Order of Battle Unit Roster Monuments Soldier's View Follow Ancestor Map Layers Virtual Walkthrough Legend Bookmarks Help User Guide (PDF) Toggle Units Mini Map Ask the Historian Desktop View"
 ],
 [
  "700 12px system-ui, sans-serif",
  "More tools"
 ],
 [
  "700 12.5px \"Times New Roman\"",
  "Explore Learn Data & Records Experience It Share"
 ],
 [
  "400 12px \"Times New Roman\"",
  "Drive the map yourself Find any regiment, place, or moment by name. Two maps side by side at two different times. Auto-fly to the action, or follow one unit. Real elevation, ranked by vantage point. Drag units and explore hypotheticals, just for fun. Get the"
 ],
 [
  "400 12px \"Times New Roman\"",
  "story explained A search-and-answer assistant built from the map’s own records. All 24 key moments, narrated, in order. Nine decisions historians still argue over. A simple, classroom-friendly walkthrough. What happened after July 3rd. Research a unit or"
 ],
 [
  "400 12px \"Times New Roman\"",
  "ancestor One unit’s whole battle, told as a single story. Search regiments by state or commander’s name. Strength and losses, corps by corps. A printable one-page reference per regiment. Feel the scale of it Live cannon and musket sound tied to real troop"
 ],
 [
  "400 12px \"Times New Roman\"",
  "density. The human cost, rising minute by minute. A heatmap that builds across all three days. Bring others along Build a guided tour and watch it live with someone else. Export a real video of any stretch of the battle."
 ],
 [
  "600 13px \"Times New Roman\"",
  "Search Everything Compare Moments Camera Modes High Ground What-If Sandbox Ask the Historian ★ Documentary Mode Turning Points For Students Aftermath Regimental Biography Find Your Ancestor Casualty Dashboard Regiment Fact Sheets Immersive Mode The Living"
 ],
 [
  "600 13px \"Times New Roman\"",
  "Ledger The Ground Remembers Watch Together Export a Video"
 ],
 [
  "400 12px system-ui, sans-serif",
  "Privacy Terms Created by Mike Legere"
 ]
]
# the PERF2 glyph warm used to run once, 3.2 s after load (after the window of the load metrics).  Its work is the same; it is now cut into tasks of its own and runs while the page boots, so the
# first layout of the app (100 dirty objects, 98-126 ms on a 4x phone, 60 ms of it first-use shaping of the system faces) does not have to pay for it
WARM_OLD = ("    function later() { setTimeout(function () { if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 2000 }); else setTimeout(warm, 300); }, 3200); }\n"
            "    if (document.readyState === 'complete') later(); else window.addEventListener('load', later);")
WARM_NEW = r'''    // PERF4: the same work as warm() plus the faces the first layout of the app uses (the label of the reconstruction, the toolbar, the clock), one face per task, while the page boots
    // (before: one task of 100+ ms at 3.2 s).  A task is 15-40 ms on a 4x phone, none is long.
    var SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var STEPS = [
      ['600 12px ' + SANS, 'Reconstruction of July 1863, not a photograph: a USDA NAIP aerial photograph of 4 June 2013'],
      ['400 12px ' + SANS, 'Kept as photographed: the evidence cannot say whether modern'],
      ['700 14px sans-serif', '⋯ Tools July 1 July 2 July 3 Artillery'],
      ['400 14px monospace', '1 × about 5:00 AM'],
      ['400 28px "Times New Roman"', '▶ ‹'],
      ['600 14px system-ui, sans-serif', 'Skip to the timeline controls'],
      ['22px "Times New Roman"', '🔍 F'],
      ['22px "Times New Roman"', '⚔ ☰'],
      ['22px "Times New Roman"', '🗿'],
      ['22px "Times New Roman"', '🔭 ⭐'],
      ['22px "Times New Roman"', '📏 🗺'],
      ['22px "Times New Roman"', '📍 ? ✕ ⋯'],
      ['12px sans-serif', 'Search Filter Order of Battle Unit Roster Monuments'],
      ['bold 16px Georgia, serif', 'Tools']
    ];
    var MORE = @MORE@;
    STEPS = STEPS.concat(MORE);
    var si = 0;
    function step() {
      try { var c = step.c || (step.c = document.createElement('canvas').getContext('2d')); var s = STEPS[si]; if (c && s) { c.font = s[0]; c.measureText(s[1]); } } catch (e) {}
      if (++si < STEPS.length) setTimeout(step, 0);
    }
    setTimeout(step, 0);
    // PERF4 (phone): the first card the animation layer styles (the event card of the first day jump) cost the first tap 90-130 ms of first-use rendering in the GPU process (shadow, backdrop
    // blur, text; the frame waits for it: event time of the tap on 'July 2' 168-216 ms against 64-96 ms for the same tap with the card already rendered once).  The same style is now rendered
    // once, 3.3 s after load (after the window of the load metrics), by an element that is nearly transparent (opacity 0.01), cannot be reached by the user or a screen reader and is shown for 400 ms.
    // It carries data-gta="warm", which the card style matches (and nothing else in the page or the animation layer queries).
    // R9: the element is put in the page as soon as the shell exists (hidden) and made visible by a Web Animation at the set time: no DOM change at 3.3 s.  Before, the element was added and removed
    // at 3.3 s, and a DOM change that has nothing to do with the user's input arrived 300-400 ms after a tap on a control that changes nothing in the page itself (a link that opens a new tab:
    // 'Sources and licences'), so the input matrix measured that tap as a 340-370 ms response.
    function preCard() {
      var root = document.querySelector('.gtbg-m-root');
      if (!root) { if (++preCard.n < 40) setTimeout(preCard, 300); return; }
      var el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-gta', 'warm');
      el.style.cssText = 'position:absolute;left:8px;bottom:200px;width:374px;height:326px;box-sizing:border-box;padding:12px 16px;opacity:0.01;pointer-events:none;z-index:1;visibility:hidden';
      el.innerHTML = '<div style="font-size:10px;font-weight:bold;letter-spacing:2px;font-family:sans-serif;margin-bottom:8px">HIGH about 4:30 AM</div>'
        + '<div style="font-size:13px;line-height:1.5;margin-bottom:6px;font-family:sans-serif">The quick brown fox jumps over the lazy dog, 0123456789 (p. 358); QUICK BROWN FOX: &#8217;quoted&#8217; words - and a long line of ordinary text so that the paragraph wraps over several lines in the card.</div>'
        + '<div style="font-size:12px;font-style:italic;line-height:1.6;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px">The quick brown fox jumps over the lazy dog, 0123456789 (OR 27/2 p.358), and the italic face wraps over several lines as well.</div>';
      var wait = Math.max(0, preCard.at - performance.now());
      try { if (!el.animate) return; root.appendChild(el); el.animate([{ visibility: 'visible' }, { visibility: 'visible' }], { delay: wait, duration: 400, fill: 'none' }); } catch (e) { if (el.parentNode) el.parentNode.removeChild(el); }
    }
    preCard.n = 0;
    function preCardLater() { preCard.at = performance.now() + 3300; setTimeout(preCard, 0); }
    if (document.readyState === 'complete') preCardLater(); else window.addEventListener('load', preCardLater);'''

BOOT_OLD = "    try { new PerformanceObserver(function (l, o) { if (l.getEntriesByName('first-contentful-paint').length) { o.disconnect(); start(); } })"
BOOT_NEW = ("    start();      // PERF4: the entry module is imported at once (it used to wait for the first contentful paint); the paint waits for the map library instead, see the hold at the top of the page\n"
            + BOOT_OLD)

def _js_steps():
    rows = list(TOOLS_STEPS)
    return '[' + ', '.join("['%s', '%s']" % (f.replace("'", chr(92) + "'"), t.replace(chr(92), chr(92) * 2).replace("'", chr(92) + "'")) for f, t in rows) + ']'


WARM_NEW = WARM_NEW.replace('@MORE@', _js_steps())

VIEWPORT = '  <meta name="mobile-web-app-capable" content="yes" />\n'

page_patches = [
    {
        "id": "PERF4-index-frame-governor", "target": "index.html", "find": crlf(VIEWPORT), "repl": crlf(VIEWPORT + GOV), "expect": 1,
        "note": "First 6 s: the animation-frame callbacks of one frame share a 20 ms budget; the next one waits a frame.  Measured on the 4x phone: the map's style load (45-60 ms), the map's first render (60-70 ms) and the card placer (40-60 ms) were three callbacks of ONE frame, one long task of 150-190 ms; they are three tasks of 40-70 ms.  Together with the other PERF4 patches the median blocking time of / went from 554 to 204 ms (interleaved n=8, tmp/r1e/tbt.mjs)."
    },
    {
        "id": "PERF4-index-glyph-warm-early", "target": "index.html", "find": crlf(WARM_OLD), "repl": crlf(jsesc(WARM_NEW)), "expect": 1,
        "note": "PERF2's glyph warm, cut into tasks of its own and moved from 3.2 s after load to the start of the page: the first layout of the app was 98-126 ms (60 of them first-use shaping of the system faces) and is 54-60 ms.  The same canvas also shapes, one face per task, the strings that the first open of the phone's Tools sheet lays out (read from the DOM of the open sheet): that first open was 240-264 ms by event timing at 4x (the second 64-120) and is 120-144 ms (n=6, interleaved)."
    },
]

# The map sub-pages (camera, ground-remembers, ...) were tried with the same helpers (performanceMetricsCollection off, prewarm, precompile at style load, the heat layer of /ground-remembers in a task of its
# own): interleaved n=5-6 on the shared machine the differences were inside the noise (ground-remembers: R1d 231, with the heat task 222, with the option 245, with both 205; camera 91 against 138), so they are
# NOT shipped: a patch needs a measurement.  tools/t0/PERF4-README.md ("What was tried and dropped").

# ------------------------------------------------------------------------------------------------------------------------------------------------ entry bundle
T4_FIND_START = 'function T4(c){'


def bake_refine(groups):
    """BASE1863's refine(c) (the last slice) hides roads-1863-line and rivers-line and gives roads-1863-label its symbol-sort-key with setLayoutProperty calls.  Inside the map's 'load' event that
    was one task with the addLayer calls, so the first tile of the roads source was not yet requested.  With the slices the roads source is already loading when the last slice runs, and every
    setLayoutProperty on a layer of that source reloads the source: Mapbox then (in about a third of the page loads, measured: PF-07 failed 9 of 12 runs) kept NO symbol bucket for the road labels
    and the ten road names never appeared until the layer was toggled.  The three values are therefore part of the layers' definitions (the state refine() leaves is the same: lines hidden, sort
    key set; its later calls then change nothing, Mapbox returns early when the value is equal) and no layer of a source is changed after the source starts loading."""
    out = []
    hits = {'roads-1863-line': 0, 'rivers-line': 0, 'roads-1863-label': 0}
    for g in groups:
        ng = []
        for x in g:
            for lid in ('roads-1863-line', 'rivers-line'):
                if 'id:"%s"' % lid in x:
                    k = x.index('id:"%s"' % lid)
                    vis = 'layout:{visibility:"visible"}'
                    e = x.index(vis, k)
                    assert e - k < 400, lid
                    x = x[:e] + 'layout:{visibility:"none"}' + x[e + len(vis):]
                    hits[lid] += 1
            if 'id:"roads-1863-label"' in x:
                k = x.index('id:"roads-1863-label"')
                ft = '"text-font":["Open Sans Regular"],'
                e = x.index(ft, k)
                x = x[:e] + '"symbol-sort-key":["get","rank"],' + x[e:]
                hits['roads-1863-label'] += 1
            ng.append(x)
        out.append(ng)
    assert all(v == 1 for v in hits.values()), hits
    return out


def t4_patch(js):
    i = js.find(T4_FIND_START)
    j = js.find('function gtPrecompile')
    assert i > 0 and j > i
    t4 = js[i:j]
    body = t4[len(T4_FIND_START):-1]
    parts = []
    depth = 0
    cur = ''
    for ch in body:
        if ch in '({[':
            depth += 1
        if ch in ')}]':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += ch
    parts.append(cur)
    assert len(parts) == 13, len(parts)
    groups = [parts[0:3], parts[3:6], parts[6:11], parts[11:]]
    groups = [[x.replace('c.addLayer(', 'gtAdd(c,st,') for x in g] for g in groups]
    if 'GTB63.refine(c)' in t4:
        groups = bake_refine(groups)
    repl = ('function T4(c){const st={a:gtLast(c)};gtSlices(c,[' + ','.join('()=>{' + ','.join(g) + '}' for g in groups) + '])}'
            'function gtLast(c){const o=c.style&&c.style._order;return o&&o.length?o[o.length-1]:null}'
            'function gtAdd(c,st,l){const o=c.style&&c.style._order;let b;if(o){if(st.a!=null){const i=o.indexOf(st.a);if(i>=0)b=o[i+1]}else if(o.length)b=o[0]}c.addLayer(l,b);st.a=l.id}'
            'function gtSlices(c,a){let i=0;const go=()=>{if(c._removed)return;try{a[i]()}catch(e){console.warn("T4 slice",e)}i++;i<a.length&&setTimeout(go,0)};setTimeout(go,0)}')
    return {
        "id": "PERF4-T4-slices", "target": "js", "find": t4, "repl": repl, "expect": 1,
        "note": "T4 adds the product's own sources and layers (roads, rivers, breastworks, farms) inside the map's 'load' event, which Mapbox fires inside its render task: 36-45 ms of addSource/addLayer on the 4x phone added to a render of 60-90 ms.  Now four timer tasks (roads, rivers, breastworks + farms, refine + precompile), each after the one before; the statements are the same, in the same order.  gtSlices stops if the map was removed.  The layers keep the place in the stack they had when T4 ran inside the load event: gtAdd inserts each one directly above the one before it (the first above the layer that was on top when T4 was called), so a layer that another handler adds in the meantime (the place labels, gtbg-locs-lbl) stays above them: Mapbox places symbols from the top of the stack, so the order decides which label wins a collision (without this 'Little Round Top' lost to a road label). On a BASE1863 tree the values refine() sets later (roads-1863-line and rivers-line hidden, the sort key of roads-1863-label) are part of the layer definitions: a setLayoutProperty on a layer of a source that is already loading reloads the source and Mapbox then lost the symbol bucket of the road labels in about a third of the page loads (REDS-A, PF-07)."
    }


YIELD = "await new Promise(gtY=>setTimeout(gtY,0));"
GTPRE = ('function gtPre(m){try{const s=m.style,pc=s&&s._programPrecompiler,p=m.painter;if(!pc||!p||!s._order||!s._layers||!p.context.extParallelShaderCompile||!pc.needsBuild())return;'
         'pc.buildQueue(s._order.map(i=>s._layers[i]),{zoom:m.getZoom()},s);pc._executeBatch({timeRemaining:()=>1e9},p,s)}catch(e){}}')

bundle_patches_static = [
    {
        "id": "PERF4-mapbox-umd-async-head",
        "target": "js",
        "find": "(gB,function(){let x,M,P;function z(l,R){if(!x)x=R;else if(!M)M=R;else{const he={};x(void 0,he),P=R(he);const Ee=",
        "repl": "(gB,async function(){let x,M,P;async function z(l,R){if(!x)x=R;else if(!M)M=R;else{const he={};" + YIELD + "x(void 0,he);" + YIELD + "P=R(he);" + YIELD + "const Ee=",
        "expect": 1,
        "note": "The map library (mapbox-gl 3.24.1) sits inside the entry bundle behind a UMD wrapper whose factory runs three things in ONE synchronous task of 105-130 ms on the 4x phone: the shared chunk (x), the main chunk (R) and the worker blob (Ee).  The factory is made async and a timer turn is put between the three, the third call is awaited (next patch) and the exports are awaited at the top of the module (PERF4-mapbox-umd-await).  Same statements in the same order, three tasks of 25-66 ms instead of one of 105-130 (the long task of the blocking-time metric: excess 80 ms -> 17 ms)."
    },
    {
        "id": "PERF4-mapbox-umd-async-main",
        "target": "js",
        "find": "z([\"./shared\"],function(l){var R=\"3.24.1\"",
        "repl": "await z([\"./shared\"],function(l){var R=\"3.24.1\"",
        "expect": 1,
        "note": "see PERF4-mapbox-umd-async-head"
    },
    {
        "id": "PERF4-mapbox-umd-await",
        "target": "js",
        "find": "var R4=Ok.exports;const z_=cS(R4);await new Promise(gtR=>setTimeout(gtR,0));",
        "repl": "var R4=await Ok.exports;const z_=cS(R4);await new Promise(gtR=>setTimeout(gtR,0));try{z_.prewarm()}catch(e){}" + YIELD,
        "expect": 1,
        "note": "The exports of the library are the factory's promise now; PERF3-entry-yield's timer turn follows unchanged.  mapboxgl.prewarm() starts the shared workers after that turn, in a task of its own (their creation was 10-20 ms of the Map constructor's 90-120 ms); the sub-pages have done the same since PERF2."
    },
    {
        "id": "PERF4-precompile-at-style-load",
        "target": "js",
        "find": "let Uc=null;function I4(c){",
        "repl": GTPRE + "let Uc=null;function I4(c){",
        "expect": 1,
        "note": "gtPre(map): when the map's style has loaded (before its first render) Mapbox's own program precompiler is asked for the programs of the layers that exist then (background, raster, clipping mask), so that the GPU process links them while the main thread goes on instead of the first render waiting for them (_finalize: 10-30 ms of the render tasks on the 4x phone).  Only with KHR_parallel_shader_compile, otherwise nothing."
    },
    {
        "id": "PERF4-precompile-desktop",
        "target": "js",
        "find": "return GTB63.attach(Xe,\"desktop\"),",
        "repl": "return GTB63.attach(Xe,\"desktop\"),Xe.once(\"style.load\",()=>gtPre(Xe)),",
        "expect": 1,
        "note": "see PERF4-precompile-at-style-load"
    },
    {
        "id": "PERF4-precompile-phone",
        "target": "js",
        "find": "GTB63.attach($t,\"phone\"),$t.touchZoomRotate.disableRotation(),$t.dragRotate.disable(),$t.addControl(new z_.AttributionControl({compact:!0}),\"top-right\");return $t.on(\"load\",",
        "repl": "$t.once(\"style.load\",()=>gtPre($t)),setTimeout(()=>{try{GTB63.attach($t,\"phone\"),$t.touchZoomRotate.disableRotation(),$t.dragRotate.disable(),$t.addControl(new z_.AttributionControl({compact:!0}),\"top-right\")}catch(e){}},0);return $t.on(\"load\",",
        "expect": 1,
        "note": "Phone map: gtPre is registered for the style load (see PERF4-precompile-at-style-load); the label/placer attach, the two gesture switches and the attribution control (15-20 ms of the 100-140 ms task that creates the map) are set up in the next timer turn, before the style's first frame (a frame is at least a turn away; GTB63.attach and the controls do not depend on it)."
    },
    {
        "id": "PERF4-no-perf-metrics-desktop",
        "target": "js",
        "find": "maxBounds:[[-77.36,39.72],[-77.12,39.91]],dragPan:{inertia:!0",
        "repl": "performanceMetricsCollection:!1,maxBounds:[[-77.36,39.72],[-77.12,39.91]],dragPan:{inertia:!0",
        "expect": 1,
        "note": "Mapbox's documented map option performanceMetricsCollection (default true) switched off for the two main maps: when the map has fully loaded it gathers every resource and mark timing of the page, builds a performance event and queues it for Mapbox (16-23 ms in one render task on the 4x phone).  Billing events (map load, session) are separate and untouched.  Way back: delete the two patches."
    },
    {
        "id": "PERF4-no-perf-metrics-phone",
        "target": "js",
        "find": "attributionControl:!1,maxBounds:[[-77.36,39.72],[-77.12,39.91]]});",
        "repl": "attributionControl:!1,performanceMetricsCollection:!1,maxBounds:[[-77.36,39.72],[-77.12,39.91]]});",
        "expect": 1,
        "note": "see PERF4-no-perf-metrics-desktop"
    },
    {
        "id": "PERF4-anim-swatch-canvas",
        "target": "js",
        "find": "s.width=e*i,s.height=t*i;const r=s.getContext(\"2d\");r.setTransform(i,0,0,i,e*i/2,t*i/2)",
        "repl": "s.width=e*i,s.height=t*i;const r=s.getContext(\"2d\",{willReadFrequently:!0});r.setTransform(i,0,0,i,e*i/2,t*i/2)",
        "expect": 1,
        "note": "ANIM's legend draws each swatch on a 54 x 36 canvas and reads it back with toDataURL.  On the desktop shell the canvas was GPU-backed, so every swatch was a synchronous readback from the GPU process (RasterImplementation::ReadbackImagePixels, 5 of them, 34 ms of an 82 ms legend build, one task of 106 ms in the engine's first frame at 1x).  willReadFrequently asks for a CPU-backed canvas: same pixels (screenshots at six widths: 0 differing), no readback; the desktop blocking time of / goes from 92 to 45 ms in the profile run."
    },
    {
        "id": "PERF4-phone-days-idle",
        "target": "js",
        "find": "zp(1),zp(2),zp(3);const ai=yn.getState();e1(bn,$t",
        "repl": "zp(1),(window.requestIdleCallback||setTimeout)(()=>{zp(2),zp(3)},{timeout:2500});const ai=yn.getState();e1(bn,$t",
        "expect": 1,
        "note": "Phone map 'load' handler: days 2 and 3 (about ten fetch calls, 25 ms of the 150 ms render task on the 4x phone) are requested when the main thread is idle, at the latest 2.5 s later; the engine's own prefetch asks for them after 1.5 s anyway, a jump or a tick past a day loads that day first (setTick / jumpToDay call zp for the days up to the target)."
    },
    {
        "id": "PERF4-anim-dataset-split",
        "target": "js",
        "find": "const t=d(k,e);return x.pbt=e,x.dsGen=x.oobGen,x.counts=t.counts,x.core?x.core.setDataset(t):function(e){let t=null;try{t=window.localStorage",
        "repl": "if(!x.core&&!x.gtDs){x.gtDs=d(k,e),x.gtDk=e;C();return!1}const t=!x.core&&x.gtDs&&x.gtDk===e?x.gtDs:d(k,e);x.gtDs=null;return x.pbt=e,x.dsGen=x.oobGen,x.counts=t.counts,x.core?x.core.setDataset(t):function(e){let t=null;try{t=window.localStorage",
        "expect": 1,
        "note": "ANIM's first frame built the dataset (24 ms on the 4x phone) and the engine (45 ms) in one task of 70-90 ms.  The dataset is built in the first frame, the engine in the next one (the existing later() timer turn; the existing 'engine was just built, the first picture is the next task' rule follows).  Same code, same order, two tasks."
    },
]


def check_anchor(label, text, find, expect):
    n = text.count(find)
    if n != expect:
        raise SystemExit('anchor %s: expected %d, found %d' % (label, expect, n))


def build():
    js_path = None
    for fn in os.listdir(os.path.join(DIST, 'assets')):
        if fn.startswith('index-') and fn.endswith('.js'):
            js_path = os.path.join(DIST, 'assets', fn)
    js = open(js_path, encoding='utf-8', newline='').read()
    html = open(os.path.join(DIST, 'index.html'), encoding='utf-8', newline='').read()
    bundle = [t4_patch(js)] + bundle_patches_static
    for p in bundle:
        check_anchor(p['id'], js, p['find'], p['expect'])
    # page patches are applied one after the other, per page: check each against the text the earlier ones produce (LF-authored patches are adapted to a CRLF page by the builder)
    texts = {}
    for p in page_patches:
        t = p['target']
        if t not in texts:
            texts[t] = open(os.path.join(DIST, t), encoding='utf-8', newline='').read()
        h = texts[t]
        find, repl = p['find'], p['repl']
        if '\r\n' in h and '\r\n' not in find:
            find, repl = find.replace('\n', '\r\n'), repl.replace('\n', '\r\n')
        check_anchor(p['id'], h, find, p['expect'])
        texts[t] = h.replace(find, repl)
    return (
        {"group": "PERF4", "description": "Release 1 round 3: phone blocking time of the app route.  Bundle part (tools/t0/PERF4-README.md); page part PG-zperf4.json.  Apply after BASE1863 (and ACC).", "patches": bundle},
        {"group": "PG-zperf4", "description": "PERF4 page part: index.html (frame governor, hold of the first paint until the map library has run, immediate boot, early glyph warm).  Sorts after PG-zperf3.", "train": "R1e", "patches": page_patches},
    )


def main(argv):
    bundle, page = build()
    files = {'PERF4.json': dumps(bundle), 'PG-zperf4.json': dumps(page)}
    bad = []
    for fn, text in files.items():
        p = os.path.join(OUT, fn)
        cur = open(p, encoding='utf-8', newline='').read() if os.path.isfile(p) else None
        if cur != text:
            bad.append(fn)
            if '--check' not in argv:
                open(p, 'w', encoding='utf-8', newline='').write(text)
    print(('differs: ' if '--check' in argv else 'written: ') + (', '.join(bad) if bad else '(nothing)'))
    return 1 if ('--check' in argv and bad) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
