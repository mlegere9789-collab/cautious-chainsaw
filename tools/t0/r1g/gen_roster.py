#!/usr/bin/env python3
"""Writes the roster part of the R1g group PERF6 (bundle, entry module): the Unit Roster list is virtualised.

    python tools/t0/r1g/gen_roster.py                       write tools/t0/patches-next/PERF6.json   (group PERF6, extension part)
    python tools/t0/r1g/gen_roster.py --check               exit 1 when that file differs from what this script writes
    python tools/t0/r1g/gen_roster.py --scratch DIR         also write DIR/PERF5+roster.json (the same patch as an extension part of PERF5, for a scratch build of train R1f:
                                                            python tools/t0/build.py --train R1f --patches DIR --out tmp/...; the bytes of the entry are those R1g gets)

Anchor: the finished text of the roster column component `gA` in the R1f entry (release/R1f/dist), i.e. after PERF2 (24 + 48 row slices) and AX (role=group, label, tabIndex).
What and why: tools/t0/PERF6-README.md section 1.

The list (one per army, ~410 and ~295 rows of the Union and Confederate columns) used to mount every row (about 5,000 elements) -> a forced layout of ~40 ms in the engine's next frame (check 4 'Unit Roster', 52-53 ms).
Now only the rows in view plus 500 px each side are in the DOM.  Look: the rows are the same component (`gtHO`), in the same order, with the same styles; a row's place is the sum of the heights above it:
measured heights (getBoundingClientRect of every row that has been mounted; they are whole pixels in practice: 49 for nearly all rows) and, for rows never mounted, the median of the measured ones.  The scroll box keeps its own
scroll position when a measurement above the top row changes an offset (the browser's scroll anchoring is switched off for the box, `overflow-anchor: none`, and the correction is made here), and stays at the bottom when it was at the bottom.
Semantics: the box stays the focusable `role=group` with its name (keyboard scrolling is the browser's own: arrows, Page Up/Down, Home/End, Space); the rows are `role=listitem` with `aria-posinset` / `aria-setsize` inside one `role=list`,
so a screen reader still hears 'item 37 of 410'; the two spacers that stand for the rows that are not mounted are `aria-hidden`.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tools', 't0', 'patches-next')
DIST = os.path.join(REPO, 'release', 'R1f', 'dist')


def dumps(o):
    return json.dumps(o, indent=1, ensure_ascii=False) + '\n'


def entry_text():
    d = os.path.join(DIST, 'assets')
    f = [x for x in os.listdir(d) if x.startswith('index-') and x.endswith('.js')][0]
    return open(os.path.join(d, f), encoding='utf-8', newline='').read()


GA_START = 'function gA({units:c,isUnion:f,currentPlacements:x}){'
GA_END = 'function Jk({onClose:c}){'

# the whole new component, one line.  Names: gtHO = the memoised row (PERF2); V = jsx runtime; pt = React.
#   Sr   ref of the per-list state {c: the units array it belongs to, hs: measured height per row (0 = never mounted), es: height assumed for rows never mounted, per class (commander line x placement note), the median of the measured rows of the class, top: scrollTop, vh: viewport height, w: width, ra/rb: the rows mounted}
#   off  prefix sums of the heights (n + 1 numbers);  win(o, top, vh) = [first, end) of the rows within 500 px of the viewport
#   the layout effect (after every commit): measures the mounted rows, keeps the row at the top edge where it was when a height above it changed (or the bottom, when the box was scrolled to the bottom), re-renders when the spacers or the window changed
RENDER = (
    'function gA({units:c,isUnion:f,currentPlacements:x}){'
    'const M=f?"#3a6bc4":"#c43a3a",P=f?"UNION":"CONFEDERATE",n=c.length,el=pt.useRef(null),L=pt.useRef(null),HR=pt.useRef(null),Sr=pt.useRef(null),[,gtB]=pt.useState(0),[hm,setHm]=pt.useState(null);'
    'Sr.current&&Sr.current.c===c||(Sr.current={c,hs:new Float64Array(n),es:[35,35,49,49],top:0,vh:Math.round(window.innerHeight*.75),w:0,ra:0,rb:0,mi:0,fin:0,os:0,ini:0});'
    'const s=Sr.current,cl=i=>(c[i][1]&&c[i][1].commander?2:0)+(x[c[i][0]]&&x[c[i][0]].notes?1:0),off=()=>{const o=new Float64Array(n+1);for(let i=0;i<n;i++)o[i+1]=o[i]+(s.hs[i]||s.es[cl(i)]);return o},'
    'win=(o,t,v)=>{let a=0;for(;a<n&&o[a+1]<t-s.os;)a++;let b=a;for(;b<n&&o[b]<t+v+s.os;)b++;return[a,b]},'
    'o=off(),[a,b]=win(o,s.top,s.vh);'
    'pt.useLayoutEffect(()=>{const e=el.current,l=L.current;if(!e||!l)return;const pa=s.ra,pb=s.rb;s.ra=a;s.rb=b;'
    'if(!s.ini){s.ini=1;requestAnimationFrame(()=>setTimeout(()=>gtB(q=>q+1),0));return}'
    'const vh=e.clientHeight,wd=e.clientWidth,t=e.scrollTop;let ch=0,m=0;'
    'if(vh&&vh!==s.vh){s.vh=vh;ch=1}'
    'if(wd!==s.w){s.w&&(s.hs.fill(0),s.mi=0,s.fin=0);s.w=wd;ch=1}'
    'let k=0;for(;k<n-1&&o[k+1]<=t;)k++;'
    'const dk=t-o[k],end=t>0&&t+s.vh>=o[n]-2,shown=k>=pa&&k<pb&&s.hs[k]>0;'
    'let j=a;for(const r of l.children){const h=r.getBoundingClientRect().height;h&&Math.abs(h-s.hs[j])>.01&&(s.hs[j]=h,m=1);j++}'
    'const hc=HR.current;if(hc&&hm){let g=0;j=hm[0];for(const r of hc.children){const h=r.getBoundingClientRect().height;h&&(g=1,!s.hs[j]&&(s.hs[j]=h,m=1));j++}g||(s.fin=1,setHm(null))}'
    'if(m){const B=[[],[],[],[]],G=[],md=u=>(u.sort((p,q)=>p-q),u[u.length>>1]);for(let i=0;i<n;i++){const h=s.hs[i];h&&(B[cl(i)].push(h),G.push(h))}'
    'const eC=B[2].length?md(B[2]):B[3].length?md(B[3]):md(G),eN=B[0].length?md(B[0]):B[1].length?md(B[1]):(eC-7)*2/3+7;'
    's.es=[eN,B[1].length?md(B[1]):eN,eC,B[3].length?md(B[3]):eC]}'
    'if(!m&&!ch)return;'
    'const o1=off(),nt=end?o1[n]-s.vh:shown?o1[k]+dk:t;'
    'Math.abs(nt-t)>.5&&nt>=0&&(e.scrollTop=nt);s.top=e.scrollTop;'
    'const[a2,b2]=win(o1,s.top,s.vh);'
    '(a2!==a||b2!==b||Math.abs(o1[a]-o[a])>.5||Math.abs(o1[n]-o[n])>.5)&&gtB(q=>q+1)});'
    'pt.useEffect(()=>{if(s.fin)return;const ric=window.requestIdleCallback,go=()=>{let i=s.mi;for(;i<n&&s.hs[i];)i++;s.mi=i;i>=n?(s.fin=1,setHm(null)):setHm([i,Math.min(n,i+10)])},'
    'id=ric?ric(go,{timeout:300}):setTimeout(go,80);return()=>{ric?window.cancelIdleCallback(id):clearTimeout(id)}},[hm,n,s.w]);'
    'pt.useEffect(()=>{if(s.os)return;const ric=window.requestIdleCallback,go=()=>{s.os=500;gtB(q=>q+1)},id=ric?ric(go,{timeout:400}):setTimeout(go,150);return()=>{ric?window.cancelIdleCallback(id):clearTimeout(id)}},[c]);'
    'pt.useEffect(()=>{const e=el.current;if(!e||typeof ResizeObserver>"u")return;let w=e.clientWidth,h=e.clientHeight;'
    'const ro=new ResizeObserver(()=>{(e.clientWidth!==w||e.clientHeight!==h)&&(w=e.clientWidth,h=e.clientHeight,gtB(q=>q+1))});ro.observe(e);return()=>ro.disconnect()},[]);'
    'return V.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"},children:['
    'V.jsxs("div",{style:{padding:"6px 10px",borderBottom:"1px solid #1a1a2a",fontSize:10,fontWeight:"bold",color:M,fontFamily:"sans-serif",letterSpacing:1,flexShrink:0},children:[P," — ",c.length," units"]}),'
    'V.jsxs("div",{ref:el,onScroll:()=>{const e=el.current;if(!e)return;s.os=500;s.top=e.scrollTop;const[p,q]=win(off(),s.top,s.vh);(p!==s.ra||q!==s.rb)&&gtB(v=>v+1)},'
    'style:{flex:1,overflowY:"auto",overflowAnchor:"none"},tabIndex:0,role:"group","aria-label":P+" units",children:['
    'V.jsx("div",{"aria-hidden":"true",style:{height:o[a]}}),'
    'V.jsx("div",{ref:L,role:"list",children:c.slice(a,b).map(([z,H],i)=>{const l=Math.max(0,Math.min((z.match(/-/g)||[]).length-1,4));'
    'return V.jsx("div",{role:"listitem","aria-posinset":a+i+1,"aria-setsize":n,children:V.jsx(gtHO,{id:z,entry:H,placement:x[z],isUnion:f,depth:l})},z)})}),'
    'V.jsx("div",{"aria-hidden":"true",style:{height:o[n]-o[b]}})]}),'
    'hm&&V.jsx("div",{ref:HR,"aria-hidden":"true",inert:"",style:{position:"absolute",left:0,top:0,width:s.w,visibility:"hidden",pointerEvents:"none"},children:c.slice(hm[0],hm[1]).map(([z,H])=>{const l=Math.max(0,Math.min((z.match(/-/g)||[]).length-1,4));return V.jsx(gtHO,{id:z,entry:H,placement:x[z],isUnion:f,depth:l},z)})})]})}'
)


def find_text(txt):
    a = txt.find(GA_START)
    b = txt.find(GA_END, a)
    if a < 0 or b < 0 or txt.count(GA_START) != 1:
        raise SystemExit('gen_roster: cannot find the roster column component in ' + DIST)
    return txt[a:b]


def patches():
    old = find_text(entry_text())
    return [{'id': 'PERF6-roster-virtual', 'target': 'js', 'find': old, 'repl': RENDER, 'expect': 1,
             'note': 'Unit Roster: only the rows in view plus 500 px each side are mounted (was: every row, about 5,000 elements, in slices; the forced layout of the new rows made the 52 ms task of check 4); spacers of measured/median heights, scroll position kept by the code (overflow-anchor none), rows role=listitem with aria-posinset/aria-setsize in a role=list'}]


def wanted():
    p = patches()
    return {'PERF6.json': dumps({'group': 'PERF6', 'description': 'Release 1 round 5: the Unit Roster list is virtualised (tools/t0/r1g/gen_roster.py)', 'patches': p})}, p


def main(argv):
    w, p = wanted()
    if '--scratch' in argv:
        d = argv[argv.index('--scratch') + 1]
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'PERF5+roster.json'), 'w', encoding='utf-8', newline='').write(dumps({'group': 'PERF5', 'patches': p}))
        print('scratch: ' + os.path.join(d, 'PERF5+roster.json'))
    differs = []
    for fn, text in w.items():
        path = os.path.join(OUT, fn)
        cur = open(path, encoding='utf-8', newline='').read() if os.path.isfile(path) else None
        if cur != text:
            differs.append(fn)
            if '--check' not in argv:
                open(path, 'w', encoding='utf-8', newline='').write(text)
    print(('differs: ' if '--check' in argv else 'written: ') + (', '.join(differs) if differs else '(nothing)'))
    return 1 if ('--check' in argv and differs) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
