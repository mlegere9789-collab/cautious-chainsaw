import json,os,sys
R='docs/pitch/anim/pitch-runs/results/'
def L(n):
    p=R+n
    return json.load(open(p,encoding='utf8')) if os.path.exists(p) else None
def pct(a,b): return round(100*a/b,2)
for st in ['war-room','field-manual','map-1863']:
    P=L(f'v3-play-1440x900-{st}.json'); M=L(f'v4-motion-1440x900-cpu1-{st}.json'); G=L(f'v3b-gaps-{st}.json')
    print('#####',st, 'keys play', list(P.keys())[:12])
    tot=0;ss=0;sd=0;dimonly=0
    for r in P['runs']:
        n=r['frames']; tot+=n; ss+=r['framesSolidOverlap']; sd+=r['framesSolidDimOverlap']; dimonly+=r['framesUnitDimOnly']
        print(' play',r['scene'],r['speed'],'fps',r['fps'],'frames',n,'ss',r['framesSolidOverlap'],pct(r['framesSolidOverlap'],n),'depth',r['maxDepthSolidSolidPx'],'sd',pct(r['framesSolidDimOverlap'],n),'sdDepth',r['maxDepthPx'],'dimOnly',pct(r['framesUnitDimOnly'],n),'maxDimOnly',r['maxUnitsDimOnly'],'tiles',r['tilesMean'],'chips',r['chipsMean'],'domPct',round(100*r['chipsUnderDomSum']/max(1,r['chipsMean']*n),1),'engOv',r['engineOverlapFrames'])
    print(' TOTAL frames',tot,'ss',ss,pct(ss,tot),'sd',sd,pct(sd,tot),'dimonly',dimonly,pct(dimonly,tot))
    for r in M['runs']:
        m=r['motion']
        print(' motion',r['scene'],r['speed'],'fps',r['raf']['fps'],'p95',r['raf']['p95'],'over20',r['raf']['over20'],'suddenSolid',m['suddenSolidPerSec'],'sudden',m['suddenPerSec'],'maxStep',m['maxStepPx'],'labelToggles',m['labelTogglesPerSec'])
    for r in G['runs']:
        print(' gaps',r['scene'],r['speed'],r['shareFramesWithGap'],r['maxUnitsAtOnce'],r.get('frames'))
