#!/usr/bin/env python3
"""Generate tools/t0/patches/<GROUP>.json from the specialist source packs in tools/t0/inputs/.

This is the ONE-SHOT, provenance-preserving successor of the scratch `merge_runner.py` (chapter 02 section 7).  The
generated JSON files are the source of truth from now on; this script only documents (and can re-verify) where each
patch came from and which de-conflicting decisions were taken:

  * bugs A/B/D/E/G/H/I/J/K/C  -> groups A (crash/input/storage) and B (clock/data)          [bug:*]
  * app-mobile HF-*           -> groups A (HF-3b/3c) and C (mobile shell, HF-12 html rows)  [mob:*]
  * app-a11y bridge           -> groups A (B-io-wrapper) and AX (a11y bridge)               [a11:*]
  * docs-copy table           -> group CP (16 bundle rows + 2 Help-chunk rows)              [cp:*]
  * NEW (designed in chapter 02 appendix B): R0-intro-delete, key guard, sound neutralisation, heatmap removal,
    walkthrough attribution, onboarding guard, merge fix, stateless i2, minimap reads, DL deep-link reader, topBar
    padding, layout listener, setMapRef+T4, EB error boundary (optional group).

Usage:
    python tools/t0/migrate_packs.py            # write any group file that does not exist yet
    python tools/t0/migrate_packs.py --check    # verify the committed group files equal what this script generates
    python tools/t0/migrate_packs.py --force    # overwrite (destroys hand edits!)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')
OUT = os.path.join(HERE, 'patches')


def load(name):
    with open(os.path.join(INP, name), encoding='utf-8') as fh:
        return json.load(fh)


mob = {m['id']: m for m in load('mobile_patches.json')}
bug = {m['id']: m for m in load('bugs_patches.json')}
a11 = {m['id']: m for m in load('a11y_patches.json')}
copy = {r['id']: r for r in load('copy_patch_table.json')}

G = {}   # group -> list of patch dicts, in application order


def add(group, pid, find, repl, expect=1, target='js', regex=False, note=None):
    p = {'id': pid, 'target': target, 'find': find, 'repl': repl, 'expect': expect}
    if regex:
        p['regex'] = True
    if note:
        p['note'] = note
    G.setdefault(group, []).append(p)


def from_bug(group, pid, **over):
    b = bug[pid]
    add(group, 'bug:' + pid, b['find'], over.get('repl', b['repl']), over.get('expect', b['expect']))


def from_mob(group, prefix, **over):
    ms = [m for k, m in mob.items() if k.startswith(prefix)]
    assert len(ms) == 1, (prefix, len(ms))
    m = ms[0]
    target = {'js': 'js', 'html': 'index.html'}[m['target']]
    add(group, 'mob:' + m['id'], over.get('find', m['find']), over.get('repl', m['repl']),
        over.get('expect', m['expect']), target)


def from_a11(group, pid, **over):
    a = a11[pid]
    add(group, 'a11:' + pid, a['find'], over.get('repl', a['repl']), over.get('expect', a['expect']), 'js', a['regex'])


# ------------------------------------------------------------------ R0 (the single bundle patch that rides the mechanism release)
add('R0', 'R0-intro-delete (perf-cwv-04)',
    'const Ie=setTimeout(()=>{x("playing"),l.current=performance.now(),Se()},800)',
    'const Ie=setTimeout(()=>{x("done"),c()},0)')

# ------------------------------------------------------------------ A : crash / input / storage (desktop-visible, low blast radius)
for pid in ('A1-C5-selectHandler', 'A2-C5-trailSegment', 'A3-C5-changeRegiment', 'A4-honest-copy'):
    from_bug('A', pid)
from_bug('A', 'B-sound-ReferenceError')
add('A', 'A-sound-remove-button (D-SOUND default)', 'function yO(){', 'function yO(){return null}function yO__dead(){')
add('A', 'A-KF-loop-off (perf-runtime-39 A)',
    'function ut(){const kt=c==null?void 0:c.current;if(!kt){Se.current=requestAnimationFrame(ut)',
    'function ut(){return;const kt=c==null?void 0:c.current;if(!kt){Se.current=requestAnimationFrame(ut)')
add('A', 'A-onMapReady-ref (perf-runtime-39 D)',
    'onMapReady:(ii,Ur)=>{Nn.current=ii,wi.current=Ur==null?void 0:Ur.current}',
    'onMapReady:(ii,Ur)=>{Nn.current=ii&&ii.current,wi.current=Ur==null?void 0:Ur.current}')
from_mob('A', 'HF-3b')
from_mob('A', 'HF-3c')
# merged key guard = bug:E1 (superset find) + a11y:C clauses (appendix B.2)
E1 = bug['E1-key-guard']
add('A', 'A-keys-guard (bug:E1 + a11y:C merged)', E1['find'],
    '{if(Ur.defaultPrevented||Ur.ctrlKey||Ur.metaKey||Ur.altKey)return;const t=Ur.target,n=t&&t.tagName;'
    'if(n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||t&&t.isContentEditable){if(Ur.key!=="Escape")return;t.blur&&t.blur()}'
    'else{if((Ur.key===" "||Ur.key==="Enter")&&t&&t.closest&&t.closest(\'button,a,[role="button"]\'))return;'
    'if(t&&t.classList&&t.classList.contains("mapboxgl-canvas")&&/^(Arrow|\\+|=|-|_)/.test(Ur.key))return}'
    'if(Ur.key!=="Escape"&&document.querySelector(\'[role="dialog"][aria-modal="true"]\'))return}'
    'const{currentTick:Bo,isPlaying:cs,playbackSpeed:jr}=yn.getState();switch(Ur.key){')
from_bug('A', 'E2-escape-set')
from_a11('A', 'B-io-wrapper')   # supersedes bug:E3 (same element, adds id/role/name)
from_bug('A', 'E4-day-keys')
add('A', 'A-wt-attribution (Mapbox ToS, walkthrough map)',
    'minZoom:11,maxZoom:18,attributionControl:!1});M.current.on("load",function(){M.current.addSource("wt-stops"',
    'minZoom:11,maxZoom:18,attributionControl:!0});M.current.on("load",function(){M.current.addSource("wt-stops"')
add('A', 'A-heatmap-key-remove (D-HEATMAP)', 'case"h":case"H":ut();break;', '')
add('A', 'A-heatmap-tour-row-remove (D-HEATMAP)', '["H","Heatmap"],', '')
# DEVIATION (documented in README): the Help-chunk row for the deleted H key is removed together with the key in group A,
# not in CP (R1c), so R1a/R1b never document a key that no longer exists.  Net content at R1c is identical to the plan.
add('A', 'A-heatmap-help-row-remove (D-HEATMAP, copy h09)', '{key:"H",desc:"Toggle heatmap"},', '', 1, 'help')
from_bug('A', 'G1-locations-start')
from_bug('A', 'G2-locations-deps')
add('A', 'A-onboarded-guard (bug:H1 + deep-link suppress)',
    'pt.useState(()=>!localStorage.getItem("gtbg_onboarded"))',
    'pt.useState(()=>{try{return!localStorage.getItem("gtbg_onboarded")&&!/[?&](tick|t|unit|u|vignette|ancestor|day|ll|z)=/.test(location.search)}catch(e){return!0}})')
from_bug('A', 'H2-onboarded-write')
from_bug('A', 'I-dt-cap')
from_bug('A', 'K-skip-tour')

# ------------------------------------------------------------------ B : clock / data (changes what is drawn)
for pid in ('D1-hud-date', 'D2-monument-tooltip', 'D3-ancestor-timeline'):
    from_bug('B', pid)
from_bug('B', 'J1-jumpToDay',
         repl='jumpToDay:x=>{for(let i=1;i<=x;i++)zp(i);c({currentTick:x===1?1:x===2?226:451,isPlaying:!1})}')
from_bug('B', 'J2-setTick',
         repl='setTick:x=>{const t=Math.max(1,Math.min(nA,x)),d=t<=225?1:t<=450?2:3;for(let i=1;i<=d;i++)zp(i);c({currentTick:t})}')
from_bug('B', 'J3-zp')
from_bug('B', 'J4-redraw-on-data')
add('B', 'B-M1-addPlacements-merge (app-bugs missed M1)',
    'c(z=>({placementsByTick:{...z.placementsByTick,...P},loadedDays:new Set([...z.loadedDays,x])}))',
    'c(z=>{const m={...z.placementsByTick};for(const k in P){const cur=m[k];if(!cur){m[k]=P[k];continue}const seen=new Map();cur.forEach(r=>seen.set(r.unit_id,r));P[k].forEach(r=>seen.set(r.unit_id,r));m[k]=[...seen.values()]}return{placementsByTick:m,loadedDays:new Set([...z.loadedDays,x])}})')
add('B', 'B-i2-stateless-carry-forward (app-latent-08 / app-bugs-07)',
    'const i2={};function y1(c,f,x){const M=c[f]||[],P=c[f+1]||[];',
    'const i2={};let i2c=null,i2t=0;function y1(c,f,x){if(c!==i2c||f<i2t){for(const k in i2)delete i2[k];i2t=0;i2c=c}for(let t=i2t+1;t<f;t++){const r=c[t];r&&r.forEach(R=>{i2[R.unit_id]=R})}i2t=f;const M=c[f]||[],P=c[f+1]||[];')
from_bug('B', 'C-minimap-GF')
add('B', 'B-minimap-draw-carry', '(x[z]||[]).forEach(st=>{var pe;if(!st.lat||!st.lng)return;',
    'y1(x,z,0).forEach(st=>{var pe;if(!st.lat||!st.lng)return;')
add('B', 'B-minimap-count-carry', '(x[z]||[]).length," units · tick ",z', 'y1(x,z,0).length," units · tick ",z')

# ------------------------------------------------------------------ DL : deep-link reader (NEW, designed in appendix B.4; unit-tested by the DL suite only)
DL = ('pt.useEffect(()=>{try{const q=new URLSearchParams(location.search),g=k=>{const v=q.get(k);return v===null||v===""?null:v};'
      'const t=parseInt(g("tick")??g("t"),10),d=parseInt(g("day"),10),u=g("unit")??g("u"),z=parseFloat(g("z")),'
      'll=(g("ll")||"").split(",").map(Number),la=parseFloat(g("lat")),ln=parseFloat(g("lng")),anc=g("ancestor");'
      'const tk=t>=1&&t<=675?t:d>=1&&d<=3?(d===1?1:d===2?226:451):null;'
      'const okll=ll.length===2&&isFinite(ll[0])&&isFinite(ll[1]),lat=okll?ll[0]:la,lng=okll?ll[1]:ln;'
      'if(tk===null&&!u&&!anc&&!(z>=0)&&!(isFinite(lat)&&isFinite(lng)))return;'
      'const s=yn.getState();if(tk!==null){s.setTick(tk);s.setPlaying(!1)}'
      'if(u&&/^[A-Za-z0-9._-]{1,32}$/.test(u))yn.setState({selectedUnitId:u,pinnedUnitId:u});'
      'if(anc&&/^[A-Za-z0-9._-]{1,32}$/.test(anc))hi(!0);'
      'if(isFinite(lat)&&isFinite(lng)||z>=0){const go=m=>{try{const o={};if(isFinite(lat)&&isFinite(lng))o.center=[lng,lat];if(z>=0)o.zoom=Math.max(11,Math.min(18,z));m.jumpTo(o)}catch(e){}};'
      'const cur=yn.getState().mapRef;if(cur)go(cur);else{const un=yn.subscribe(st=>{if(st.mapRef){un();go(st.mapRef)}})}}}catch(e){}},[]),')
add('DL', 'DL-deeplink-reader (NEW, D-URLSTATE T0 subset)',
    'pt.useEffect(()=>{function ii(Ur){', DL + 'pt.useEffect(()=>{function ii(Ur){')

# ------------------------------------------------------------------ C : mobile shell (app-mobile pack, de-conflicted)
m1a = mob['HF-1a AO gate desktop overlays']
new1a = m1a['repl'].replace('V.jsx(nO,{}),V.jsx(yO,{}),V.jsx(qF,{})]})', 'V.jsx(yO,{}),V.jsx(qF,{})]}),V.jsx(nO,{})')
assert new1a != m1a['repl']
if 'V.jsx(iO,{containerRef:wi}),V.jsx(nO,{}),' in new1a:
    new1a = new1a.replace('V.jsx(iO,{containerRef:wi}),V.jsx(nO,{}),', 'V.jsx(iO,{containerRef:wi}),')
from_mob('C', 'HF-1a', repl=new1a)
from_mob('C', 'HF-1b')
from_mob('C', 'HF-2')
from_mob('C', 'HF-3a')            # HF-3b / HF-3c live in group A
m4 = mob['HF-4 mobile map options']
from_mob('C', 'HF-4', repl=m4['repl'] + 'yn.getState().setMapRef($t),T4($t);')
QRY = '(max-width: 820px) and (pointer: coarse), (max-height: 480px) and (pointer: coarse)'
m5a = mob['HF-5a layout init']
from_mob('C', 'HF-5a', repl=m5a['repl'].replace('(max-width: 820px) and (pointer: coarse)', QRY))
m5b = mob['HF-5b layout attr effect']
LIS = ('pt.useEffect(()=>{try{const q=matchMedia("' + QRY + '"),h=()=>{try{if(sessionStorage.getItem("gtbg_layout")||new URLSearchParams(location.search).get("layout"))return}catch(e){}Dt(q.matches?"mobile":"desktop")};'
       'q.addEventListener?q.addEventListener("change",h):q.addListener(h);return()=>{q.removeEventListener?q.removeEventListener("change",h):q.removeListener(h)}}catch(e){}},[])')
from_mob('C', 'HF-5b', repl=m5b['repl'] + ',' + LIS)
for pid in ('HF-5c', 'HF-5d'):
    from_mob('C', pid)
for k in list(mob):
    if k.startswith(('HF-6', 'HF-7', 'HF-9', 'HF-11')):
        from_mob('C', k)
for k in list(mob):
    if k.startswith('HF-8') and not k.startswith('HF-8c'):
        from_mob('C', k)
m8c = mob['HF-8c topBar']
from_mob('C', 'HF-8c', repl=m8c['repl'].replace('paddingTop:"var(--gt-sat)",', ''))
add('C', 'C-topBar-padding-shorthand (app-mobile MISSED-3)',
    'justifyContent:"space-between",padding:"0 14px",zIndex:200},clock:',
    'justifyContent:"space-between",padding:"var(--gt-sat) 14px 0",zIndex:200},clock:')
# HF-12 (index.html): viewport-fit=cover, no !important map height, css block.  DEVIATIONS from the scratch pack, per chapter 02
# section 7 ("Dropped: ... HF-12a's apple-mobile-web-app-* metas"): the apple-* metas are dropped, and the color-scheme meta is
# dropped too because the R0 mechanism already adds it to index.html (a second copy would be a duplicate).
m12a = mob['HF-12a viewport']
add('C', 'mob:HF-12a viewport (viewport-fit=cover; apple-* and color-scheme metas dropped)', m12a['find'],
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n'
    '  <meta name="mobile-web-app-capable" content="yes" />', 1, 'index.html')
from_mob('C', 'HF-12b')
from_mob('C', 'HF-12c')

# ------------------------------------------------------------------ AX : a11y bridge subset (must follow C; counts adjusted)
from_a11('AX', 'A-slider')
from_a11('AX', 'D-toolbar-vs')
from_a11('AX', 'G-close-generic')
from_a11('AX', 'G-close-mobile', expect=3)      # HF-6l already patched the 4th site
for pid in ('H-filter-range', 'H-search-input', 'H-ancestor-input', 'H-mon-search-1', 'H-mon-search-2'):
    from_a11('AX', pid)
add('AX', 'AX-map-container-id (skip-link target, a11y verifier 01b)',
    'V.jsx("div",{ref:f,style:ux.map})', 'V.jsx("div",{ref:f,id:"gt-map",tabIndex:-1,style:ux.map})')
from_a11('AX', 'I-toast-log', repl=a11['I-toast-log']['repl'].replace('role:"log","aria-live":"polite"', 'role:"log","aria-live":"off"'))
from_a11('AX', 'J2-glow-pulse')
from_a11('AX', 'J3-no-subtick-interp')

# ------------------------------------------------------------------ CP : truthful-copy subset (name/time/naming rows HELD, chapter 02 WP-T0-16)
def cp(cid):
    r = copy[cid]
    add('CP', 'cp:' + cid, r['find'], r['replace'], r['occurrences_in_minified'], 'js')


for cid in ('b01', 'b10', 'b11', 'b13', 'b14', 'b15', 'b16', 'b17', 'b18', 'b41', 'b43', 'b44', 'b49', 'b50', 'b51', 'b52'):
    cp(cid)
# Help-chunk rows.  h09 (heatmap row) moved to group A (see above).  h01 uses the text chapter 02 prescribes (a number needs the
# facts pipeline), h03 as in the copy table.
add('CP', 'cp:h01 (445+ -> hundreds; no number without the facts pipeline)',
    '445+ Union and Confederate units', 'hundreds of Union and Confederate regiments and batteries', 1, 'help')
add('CP', 'cp:h03', copy['h03']['find'], copy['h03']['replace'], copy['h03']['occurrences_in_minified'], 'help')

# ------------------------------------------------------------------ EB : proposed amendment AMD-T0-1 (error boundary; OFF unless the owner accepts it: `--with EB`)
EBCODE = ('class GtbgEB extends pt.Component{constructor(p){super(p);this.state={e:null}}static getDerivedStateFromError(e){return{e:e||!0}}'
          'componentDidCatch(e){try{console.error("gtbg boundary:",e&&e.message)}catch(_){}}'
          'render(){return this.state.e?V.jsxs("div",{role:"alert",style:{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,background:"#0a0a14",color:"#e8e6df",fontFamily:"Georgia,serif",textAlign:"center",padding:24},children:'
          '[V.jsx("p",{style:{fontSize:20,margin:0},children:"Something went wrong drawing the map."}),'
          'V.jsx("button",{type:"button",onClick:()=>location.reload(),style:{font:"inherit",minHeight:44,padding:"0 22px",borderRadius:8,border:"1px solid #c9a24b",background:"#12121e",color:"#c9a24b",cursor:"pointer"},children:"Reload"}),'
          'V.jsx("a",{href:"/historian",style:{color:"#c9a24b",minHeight:44,display:"inline-flex",alignItems:"center"},children:"Ask the Historian"})]}):this.props.children}}')
add('EB', 'EB-error-boundary (AMENDMENT AMD-T0-1)',
    'Rk(document.getElementById("root")).render(V.jsx(pt.StrictMode,{children:V.jsx(AO,{})}));',
    EBCODE + 'Rk(document.getElementById("root")).render(V.jsx(pt.StrictMode,{children:V.jsx(GtbgEB,{children:V.jsx(AO,{})})}));')


def render(group):
    return json.dumps({'group': group, 'patches': G[group]}, indent=1, ensure_ascii=False) + '\n'


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    os.makedirs(OUT, exist_ok=True)
    bad = 0
    for group in G:
        path = os.path.join(OUT, group + '.json')
        text = render(group)
        if mode == '--check':
            cur = open(path, encoding='utf-8', newline='').read() if os.path.exists(path) else None
            same = cur == text
            print('%-3s %s (%d patches)' % (group, 'OK' if same else 'DIFFERS', len(G[group])))
            bad += 0 if same else 1
        elif os.path.exists(path) and mode != '--force':
            print('%-3s exists, kept (%d patches)' % (group, len(G[group])))
        else:
            with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(text)
            print('%-3s written (%d patches)' % (group, len(G[group])))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
