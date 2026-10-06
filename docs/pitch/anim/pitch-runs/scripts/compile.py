import json,os,sys,glob
R='docs/pitch/anim/07-verify/results/'
def L(n):
    p=R+n
    return json.load(open(p,encoding='utf8')) if os.path.exists(p) else None
def pct(a,b): return round(100*a/b,1)
def rows(tag_play, tag_motion, tag_gaps, label):
    play=L(tag_play); mot=L(tag_motion); gaps=L(tag_gaps)
    out={}
    if play:
        for r in play['runs']:
            k=(r['scene'],r['speed']); n=r['frames']
            out.setdefault(k,{}).update(dict(ss=r['framesSolidOverlap'],ssPct=pct(r['framesSolidOverlap'],n),ssDepth=r['maxDepthSolidSolidPx'],sd=r['framesSolidDimOverlap'],sdPct=pct(r['framesSolidDimOverlap'],n),sdDepth=r['maxDepthPx'],dimOnlyPct=pct(r['framesUnitDimOnly'],n),maxDimOnly=r['maxUnitsDimOnly'],tiles=r['tilesMean'],chips=r['chipsMean'],playFps=r['fps'],domPct=round(100*r['chipsUnderDomSum']/max(1,r['chipsMean']*n),1),domHalfPct=round(100*r['chipsHalfHiddenSum']/max(1,r['chipsMean']*n),1),engOv=r['engineOverlapFrames']))
    if mot:
        for r in mot['runs']:
            k=(r['scene'],r['speed']); m=r['motion']
            out.setdefault(k,{}).update(dict(fps=r['raf']['fps'],p95=round(r['raf']['p95'],1),over20=r['raf']['over20'],sudden=m['suddenPerSec'],suddenSolid=m['suddenSolidPerSec'],maxStep=m['maxStepPx'],labelToggles=m['labelTogglesPerSec'],flashes=m['flashesPerSec'],blinks=m['blinksPerSec'],steps8=m['stepsOver8PerSec'],still=m['stillShare']))
    if gaps:
        for r in gaps['runs']:
            k=(r['scene'],r['speed'])
            out.setdefault(k,{}).update(dict(gapPct=r['shareFramesWithGap'],gapMaxUnits=r['maxUnitsAtOnce'],gapMaxFr=r['maxFrames']))
    print('###',label)
    for k in sorted(out): print(k, json.dumps(out[k]))
    return out
if __name__=='__main__':
    for st in ['war-room','field-manual','map-1863']:
        rows(f'v3-play-1440x900-{st}.json', f'v4-motion-1440x900-cpu1-{st}.json', f'v3b-gaps-{st}.json', st)
    for tag in ['wr-snap','wr-notravel','fm-instrument']:
        rows(f'v3-play-1440x900-x-{tag}.json', f'v4-motion-1440x900-cpu1-x-{tag}.json', f'x-v3b-gaps-{tag}.json', tag)
