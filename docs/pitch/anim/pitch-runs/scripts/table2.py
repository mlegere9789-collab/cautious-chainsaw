import json,os,sys
R='docs/pitch/anim/07-verify/results/'
def L(n):
    p=R+n
    return json.load(open(p,encoding='utf8')) if os.path.exists(p) else None
def get(play,mot,gap,scene,speed):
    out={}
    P=L(play); M=L(mot); G=L(gap)
    if P:
        for r in P['runs']:
            if r['scene']==scene and r['speed']==speed:
                n=r['frames']; out.update(ss=r['framesSolidOverlap'],ssN=n,sd=r['framesSolidDimOverlap'],dimOnly=r['framesUnitDimOnly'],tiles=r['tilesMean'],sdDepth=r['maxDepthPx'])
    if M:
        for r in M['runs']:
            if r['scene']==scene and r['speed']==speed:
                m=r['motion']; out.update(suddenSolid=m['suddenSolidPerSec'],sudden=m['suddenPerSec'],maxStep=m['maxStepPx'],fps=r['raf']['fps'])
    if G:
        for r in G['runs']:
            if r['scene']==scene and r['speed']==speed:
                out.update(gap=r['shareFramesWithGap'],gapUnits=r['maxUnitsAtOnce'])
    return out
cfgs=[('WR default','v3-play-1440x900-war-room.json','v4-motion-1440x900-cpu1-war-room.json','v3b-gaps-war-room.json'),
('FM default','v3-play-1440x900-field-manual.json','v4-motion-1440x900-cpu1-field-manual.json','v3b-gaps-field-manual.json'),
('M63 default','v3-play-1440x900-map-1863.json','v4-motion-1440x900-cpu1-map-1863.json','v3b-gaps-map-1863.json')]
for t in ['wr-snap','wr-notravel','wr-chord','wr-dmax0','wr-dmax12','wr-dmax24','fm-instrument','wr-vis-window','wr-vis-snapshot']:
    cfgs.append((t,f'v3-play-1440x900-x-{t}.json',f'v4-motion-1440x900-cpu1-x-{t}.json',f'x-v3b-gaps-{t}.json'))
for scene in ['the-angle','rose-woods']:
    print('=====',scene,'4x')
    for name,p,m,g in cfgs:
        o=get(p,m,g,scene,4)
        if not o: print(name,'(no data)'); continue
        n=o.get('ssN',1200)
        print(f"{name:14s} ss {o.get('ss')}/{n} ({100*o.get('ss',0)/n:.1f}%)  sd {o.get('sd')} ({100*o.get('sd',0)/n:.1f}%, {o.get('sdDepth')} px)  dimOnly {100*o.get('dimOnly',0)/n:.1f}%  gap {o.get('gap')}% ({o.get('gapUnits')} u)  suddenSolid {o.get('suddenSolid')}/s sudden {o.get('sudden')}/s  maxStep {o.get('maxStep')}  fps {o.get('fps')}  tiles {o.get('tiles')}")
