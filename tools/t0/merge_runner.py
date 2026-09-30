#!/usr/bin/env python3
"""
Dry-run of the merged, de-conflicted Tranche-0 bundle patch runner (chapter 02 verification).
Operates only on scratch copies. Usage: python merge_runner.py <groups comma list> <out_dir>
Groups are applied in the fixed order R0, A, B, DL, C, AX, CP.  Each patch asserts its expected
match count against the CURRENT text (so an overlap with an earlier patch fails loudly).
"""
import json, re, sys, os, shutil, hashlib

PW = 'C:/Users/mlege/AppData/Roaming/Claude/scratch-workspaces/fe20000a-2144-4d85-ac4c-4e19e62f5823/1fb796a8-22ef-47aa-b6e3-227d4048a221/scratch-2026-09-30-719300/plan-work'
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, 'base')

mob = {m['id']: m for m in json.load(open(os.path.join(HERE, 'mobile_patches.json'), encoding='utf8'))}
bug = {m['id']: m for m in json.load(open(os.path.join(HERE, 'bugs_patches.json'), encoding='utf8'))}
a11 = {m['id']: m for m in json.load(open(os.path.join(HERE, 'a11y_patches.json'), encoding='utf8'))}
copy = {r['id']: r for r in json.load(open(PW + '/tmp-docs-copy/copy_patch_table.json', encoding='utf-8'))}

P = []  # (group, id, target, find, repl, expect, regex)


def add(group, pid, find, repl, expect=1, target='js', regex=False):
    P.append((group, pid, target, find, repl, expect, regex))


def from_bug(group, pid, **over):
    b = bug[pid]
    add(group, 'bug:' + pid, b['find'], over.get('repl', b['repl']), over.get('expect', b['expect']))


def from_mob(group, pid_prefix, **over):
    ms = [m for k, m in mob.items() if k.startswith(pid_prefix)]
    assert len(ms) == 1, (pid_prefix, len(ms))
    m = ms[0]
    add(group, 'mob:' + m['id'], over.get('find', m['find']), over.get('repl', m['repl']), over.get('expect', m['expect']), m['target'])


def from_a11(group, pid, **over):
    a = a11[pid]
    add(group, 'a11:' + pid, a['find'], over.get('repl', a['repl']), over.get('expect', a['expect']), 'js', a['regex'])

# ------------------------------------------------------------------ R0 (single boot patch that rides the mechanism release)
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
# merged key guard = bug:E1 (superset find) + a11y:C clauses
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
# heatmap H key removal (D-HEATMAP default delete)
add('A', 'A-wt-attribution (Mapbox ToS, walkthrough map)', 'minZoom:11,maxZoom:18,attributionControl:!1});M.current.on("load",function(){M.current.addSource("wt-stops"', 'minZoom:11,maxZoom:18,attributionControl:!0});M.current.on("load",function(){M.current.addSource("wt-stops"')
add('A', 'A-heatmap-key-remove (D-HEATMAP)', 'case"h":case"H":ut();break;', '')
add('A', 'A-heatmap-tour-row-remove (D-HEATMAP)', '["H","Heatmap"],', '')
from_bug('A', 'G1-locations-start')
from_bug('A', 'G2-locations-deps')
DEEP = r'(?:[?&](?:tick|t|unit|u|vignette|v|ancestor|day|ll|z|lat|lng)=)'
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
add('B', 'B-minimap-draw-carry', '(x[z]||[]).forEach(st=>{var pe;if(!st.lat||!st.lng)return;', 'y1(x,z,0).forEach(st=>{var pe;if(!st.lat||!st.lng)return;')
add('B', 'B-minimap-count-carry', '(x[z]||[]).length," units · tick ",z', 'y1(x,z,0).length," units · tick ",z')

# ------------------------------------------------------------------ DL : deep-link reader (NEW, designed here; untested behaviour)
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
new1a = new1a.replace('V.jsx(iO,{containerRef:wi}),V.jsx(nO,{}),', 'V.jsx(iO,{containerRef:wi}),') if 'V.jsx(iO,{containerRef:wi}),V.jsx(nO,{}),' in new1a else new1a
from_mob('C', 'HF-1a', repl=new1a)
from_mob('C', 'HF-1b')
from_mob('C', 'HF-2')
# HF-3a (mobile canvas) only; 3b/3c are in group A
from_mob('C', 'HF-3a')
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
        from_mob('C', k[:6] if k.startswith('HF-6') and False else k)
# HF-8: fix the padding-shorthand defect (app-mobile MISSED-3)
for k in list(mob):
    if k.startswith('HF-8') and not k.startswith('HF-8c'):
        from_mob('C', k)
m8c = mob['HF-8c topBar']
from_mob('C', 'HF-8c', repl=m8c['repl'].replace('paddingTop:"var(--gt-sat)",', ''))
add('C', 'C-topBar-padding-shorthand (app-mobile MISSED-3)',
    'justifyContent:"space-between",padding:"0 14px",zIndex:200},clock:', 'justifyContent:"space-between",padding:"var(--gt-sat) 14px 0",zIndex:200},clock:')

# ------------------------------------------------------------------ AX : a11y bridge subset (after C; counts adjusted)
from_a11('AX', 'A-slider')
from_a11('AX', 'D-toolbar-vs')
from_a11('AX', 'G-close-generic')
from_a11('AX', 'G-close-mobile', expect=3)      # HF-6l already patched the 4th site
for pid in ('H-filter-range', 'H-search-input', 'H-ancestor-input', 'H-mon-search-1', 'H-mon-search-2'):
    from_a11('AX', pid)
add('AX', 'AX-map-container-id (skip-link target, a11y verifier 01b)', 'V.jsx("div",{ref:f,style:ux.map})', 'V.jsx("div",{ref:f,id:"gt-map",tabIndex:-1,style:ux.map})')
from_a11('AX', 'I-toast-log', repl=a11['I-toast-log']['repl'].replace('role:"log","aria-live":"polite"', 'role:"log","aria-live":"off"'))
from_a11('AX', 'J2-glow-pulse')
from_a11('AX', 'J3-no-subtick-interp')

# ------------------------------------------------------------------ CP : truthful-copy subset (name/time/naming rows HELD)
def cp(cid, find=None, repl=None, expect=None):
    r = copy[cid]
    add('CP', 'cp:' + cid, find or r['find'], repl if repl is not None else r['replace'], expect or r['occurrences_in_minified'])
cp('b01'); cp('b10'); cp('b11'); cp('b13'); cp('b14'); cp('b15'); cp('b16'); cp('b17'); cp('b18')
cp('b41'); cp('b43'); cp('b44'); cp('b49'); cp('b50'); cp('b51'); cp('b52')


# ------------------------------------------------------------------ EB : proposed amendment AMD-T0-1 (error boundary; OFF unless the owner amends the closed list)
EBCODE = ('class GtbgEB extends pt.Component{constructor(p){super(p);this.state={e:null}}static getDerivedStateFromError(e){return{e:e||!0}}'
          'componentDidCatch(e){try{console.error("gtbg boundary:",e&&e.message)}catch(_){}}'
          'render(){return this.state.e?V.jsxs("div",{role:"alert",style:{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,background:"#0a0a14",color:"#e8e6df",fontFamily:"Georgia,serif",textAlign:"center",padding:24},children:'
          '[V.jsx("p",{style:{fontSize:20,margin:0},children:"Something went wrong drawing the map."}),'
          'V.jsx("button",{type:"button",onClick:()=>location.reload(),style:{font:"inherit",minHeight:44,padding:"0 22px",borderRadius:8,border:"1px solid #c9a24b",background:"#12121e",color:"#c9a24b",cursor:"pointer"},children:"Reload"}),'
          'V.jsx("a",{href:"/historian",style:{color:"#c9a24b",minHeight:44,display:"inline-flex",alignItems:"center"},children:"Ask the Historian"})]}):this.props.children}}')
add('EB', 'EB-error-boundary (AMENDMENT)',
    'Rk(document.getElementById("root")).render(V.jsx(pt.StrictMode,{children:V.jsx(AO,{})}));',
    EBCODE + 'Rk(document.getElementById("root")).render(V.jsx(pt.StrictMode,{children:V.jsx(GtbgEB,{children:V.jsx(AO,{})})}));')

ORDER = ['R0', 'A', 'C', 'AX', 'B', 'DL', 'CP', 'EB']

if __name__ == '__main__':
    groups = sys.argv[1].split(',') if len(sys.argv) > 1 else ORDER
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'out')
    js = open(os.path.join(BASE, 'assets', 'index-Cg8FAMXN.js'), encoding='utf8').read()
    n_ok = 0
    bad = []
    for g in ORDER:
        if g not in groups:
            continue
        for (grp, pid, target, find, repl, expect, regex) in P:
            if grp != g or target != 'js':
                continue
            cnt = len(re.findall(find, js)) if regex else js.count(find)
            if cnt != expect:
                bad.append((grp, pid, cnt, expect))
                continue
            js = re.sub(find, lambda m: repl if not regex else m.expand(repl), js) if regex else js.replace(find, repl)
            n_ok += 1
    print('groups', groups, 'applied', n_ok, 'failed', len(bad))
    for b in bad:
        print('  FAIL', b)
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'index.js'), 'w', encoding='utf8').write(js)
    print('bytes', len(js), 'delta', len(js) - 2280438)
