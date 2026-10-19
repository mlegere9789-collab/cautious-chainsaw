// Independent verification pass 7 of 8 on the 1863 reconstruction: PHOTOREALISM AND TECHNICAL QUALITY.
// RED BY DESIGN: every test below pins a defect measured on the committed pyramid (docs/basemap1863/tiles, PROVENANCE-LAYER/tiles) or on the product map; each FAILS today and should pass once the defect is fixed.
// Report: docs/basemap1863/verification/check7-photorealism-qa.md.  Heavy image work runs at below-normal priority in one python process (4 threads at most).
//
//   node tests/t0/verify-base1863-photorealism-qa.spec.mjs                     all tests (V7-02 needs the pipeline scratch tmp/b1863/build and is skipped without it; V7-04 needs tmp/b1863/group/R1c/dist)
//   node tests/t0/verify-base1863-photorealism-qa.spec.mjs --filter 'V7-0[13]'
//
//   T0-V7-01 [high]   bright, low-saturation residue (concrete pads, pavement, roofs) inside the classes that claim a modern feature was removed: 71 connected components of 150 px or more at z16
//   T0-V7-02 [medium] window seams: the step between neighbouring pixels at the 1024 px window boundaries of the synthesised ground is 50 percent above the median column (builder compared with random lines of all content: 12 percent)
//   T0-V7-03 [high]   TOWN_GROUND is a lawn: the colour variance (Lab a) of the ground between the town roofs is 19 percent of that of photographed open ground (needs more than 60 percent to read as photograph)
//   T0-V7-04 [medium] the map lets the camera go to zoom 18 on a 0.92 m per pixel picture (z16 native): a 4x bilinear enlargement, a smear, not a photograph; a cap at the z17 enlargement (2x) is the most the evidence supports
//   T0-V7-05 [medium] CROP_RECOLOURED (the Wheatfield): the polygon is more yellow-saturated (Lab b) than the 99.9th percentile of all photographed open ground in the pyramid
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
process.env.T0_AGENT ??= 'b1863/check7';
process.env.T0_PORT_BASE ??= '10470';
const { REPO, PORT_BASE, openSession, createSuite, assert, sleep, waitFor, waitForApp, chooseLayout, mapView, Skip } = await import('./lib.mjs');
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const FILTER = opt('filter', null);
const suite = createSuite('verify-base1863-photorealism-qa');

const PY_TILES = String.raw`import sys,os,json,glob
import numpy as np,cv2
from PIL import Image
ROOT=sys.argv[1]
T=os.path.join(ROOT,'docs','basemap1863','tiles','16')
P=os.path.join(ROOT,'docs','basemap1863','PROVENANCE-LAYER','tiles','16')
out={'bright_components_ge150':0,'bright_px':0,'bright_biggest':[]}
labA={'TOWN':[], 'KEPT':[]}
crop_b=[];kept_b=[]
n=0
for f in glob.glob(os.path.join(P,'*','*.png')):
    x=os.path.basename(os.path.dirname(f));y=os.path.basename(f)[:-4]
    t=os.path.join(T,x,y+'.webp')
    if not os.path.exists(t): continue
    c=np.array(Image.open(f));rgb=np.array(Image.open(t).convert('RGB'))
    n+=1
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
    rem=np.isin(c,[1,2,3,5])
    br=((hsv[...,2]>205)&(hsv[...,1]<60)&rem).astype(np.uint8)
    br=cv2.morphologyEx(br,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    nn,lab,st,cen=cv2.connectedComponentsWithStats(br,connectivity=8)
    for i in range(1,nn):
        if st[i,4]>=150:
            out['bright_components_ge150']+=1;out['bright_biggest'].append([int(st[i,4]),int(x),int(y)])
    out['bright_px']+=int(br.sum())
    lab3=cv2.cvtColor(rgb,cv2.COLOR_RGB2LAB).astype(np.float32)
    lum=hsv[...,2]
    er=lambda m: cv2.erode(m.astype(np.uint8),np.ones((7,7),np.uint8))>0
    tm=er(c==5)
    km=er(c==0)&(lum>110)
    if tm.sum()>500: labA['TOWN'].append(lab3[...,1][tm][::7])
    if km.sum()>500: labA['KEPT'].append(lab3[...,1][km][::7])
    cm=er(c==12)
    if cm.sum()>100: crop_b.append(lab3[...,2][cm][::3])
    if km.sum()>500: kept_b.append(lab3[...,2][km][::11])
ta=np.concatenate(labA['TOWN']);ka=np.concatenate(labA['KEPT'])
cb=np.concatenate(crop_b);kb=np.concatenate(kept_b)
out['tiles_scanned']=n
out['town_a_std']=float(ta.std());out['kept_open_a_std']=float(ka.std());out['town_over_kept_a_std']=float(ta.std()/ka.std())
out['crop_b_mean']=float(cb.mean());out['kept_b_p99']=float(np.percentile(kb,99));out['kept_b_p999']=float(np.percentile(kb,99.9))
out['bright_biggest']=sorted(out['bright_biggest'],reverse=True)[:8]
print(json.dumps(out))
`;
const PY_SEAM = String.raw`import sys,os,json
sys.path.insert(0,'tools/b1863')
import common as C
C.lowprio()
import numpy as np, cv2
H,W=C.H,C.W
S=np.memmap(os.path.join(C.BUILD,'stage35.u8'),dtype=np.uint8,mode='r',shape=(H,W,3))
P=np.memmap(os.path.join(C.BUILD,'prov.u8'),dtype=np.uint8,mode='r',shape=(H,W))
syn=np.zeros(256,bool); syn[[1,2,3,5]]=True
# column-wise: for each column c, mean |lum[:,c]-lum[:,c-1]| over rows where both in synth.
sumc=np.zeros(W);cntc=np.zeros(W)
sumr=np.zeros(H);cntr=np.zeros(H)
step=1024
for r0 in range(0,H,step):
    r1=min(H,r0+step+1)
    blk=np.array(S[r0:r1]).astype(np.float32)
    lum=0.299*blk[...,0]+0.587*blk[...,1]+0.114*blk[...,2]
    pm=syn[np.array(P[r0:r1])]
    dc=np.abs(lum[:,1:]-lum[:,:-1]); mc=pm[:,1:]&pm[:,:-1]
    rows=slice(0,(r1-r0) if r1==H else step)
    sumc[1:]+=(dc*mc)[rows].sum(0); cntc[1:]+=mc[rows].sum(0)
    dr=np.abs(lum[1:]-lum[:-1]); mr=pm[1:]&pm[:-1]
    n=dr.shape[0] if r1==H else step
    sumr[r0+1:r0+1+n]+=(dr*mr)[:n].sum(1); cntr[r0+1:r0+1+n]+=mr[:n].sum(1)
mc=sumc/np.maximum(cntc,1); mr=sumr/np.maximum(cntr,1)
ok=cntc>2000
okr=cntr>2000
def phase(m,ok,period=512):
    out=[]
    for ph in range(period):
        idx=np.arange(ph,len(m),period); idx=idx[ok[idx]]
        out.append(m[idx].mean() if len(idx) else np.nan)
    return np.array(out)
pc=phase(mc,ok,1024); pr=phase(mr,okr,1024)
print('col mean',np.nanmean(pc),'median',np.nanmedian(pc))
top=np.argsort(-np.nan_to_num(pc))[:8]; print('col top phases',[(int(i),round(float(pc[i]),2)) for i in top])
top=np.argsort(-np.nan_to_num(pr))[:8]; print('row top phases',[(int(i),round(float(pr[i]),2)) for i in top])
print('row mean',np.nanmean(pr),'median',np.nanmedian(pr))
for nm,p_ in (('col',pc),('row',pr)):
    base=np.nanmedian(p_)
    print(nm,'phase0',p_[0],'z-excess vs median',(p_[0]/base-1)*100,'%')
`;
const py = (code, args = []) => {
  const f = path.join(os.tmpdir(), `v7-${process.pid}-${Math.random().toString(36).slice(2)}.py`);
  fs.writeFileSync(f, code);
  try {
    const r = spawnSync('python', ['-I', f, ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 20 * 60 * 1000 });
    if (r.status !== 0) throw new Error(`python failed: ${(r.stderr || '').slice(-600)}`);
    return r.stdout;
  } finally { try { fs.unlinkSync(f); } catch { /* gone */ } }
};
let tileStats = null;
const tiles = () => { if (!tileStats) tileStats = JSON.parse(py(PY_TILES, [REPO]).trim().split('\n').pop()); return tileStats; };

suite.test('T0-V7-01', 'no bright low-saturation residue of 150 px or more inside the removed classes (z16)', async (t) => {
  const s = tiles(); t.note('components', s.bright_components_ge150); t.note('bright px', s.bright_px); t.note('biggest [px, x, y] z16', s.bright_biggest);
  assert(s.bright_components_ge150 === 0, `${s.bright_components_ge150} bright residue components of 150 px or more inside REMOVED_* classes; biggest ${JSON.stringify(s.bright_biggest.slice(0, 3))} (px, z16 x, y)`);
});

suite.test('T0-V7-02', 'window seams of the synthesised ground are not above 15 percent of the median pixel step', async (t) => {
  const bd = path.join(REPO, 'tmp', 'b1863', 'build', 'stage35.u8');
  if (!fs.existsSync(bd)) throw new Skip('pipeline scratch tmp/b1863/build not present');
  const out = py(PY_SEAM).trim().split('\n');
  const line = out.find((l) => l.startsWith('col phase0')); const rl = out.find((l) => l.startsWith('row phase0'));
  const num = (l) => Number(/excess vs median ([0-9.\-]+)/.exec(l)[1]);
  const c = num(line), r = num(rl); t.note('column seam excess percent', c); t.note('row seam excess percent', r);
  assert(c < 15 && r < 15, `step at window boundaries exceeds the median step by ${c.toFixed(0)} percent (columns) and ${r.toFixed(0)} percent (rows)`);
});

suite.test('T0-V7-03', 'the ground between the town roofs keeps at least 60 percent of the colour variance of photographed open ground', async (t) => {
  const s = tiles(); t.note('Lab a std town / kept open', [s.town_a_std, s.kept_open_a_std]); t.note('ratio', s.town_over_kept_a_std);
  assert(s.town_over_kept_a_std >= 0.6, `Lab a std of TOWN_GROUND is ${(s.town_over_kept_a_std * 100).toFixed(0)} percent of photographed open ground`);
});

suite.test('T0-V7-05', 'the recoloured Wheatfield is not more saturated than 99.9 percent of the photographed ground', async (t) => {
  const s = tiles(); t.note('crop Lab b mean / kept p99 / p99.9', [s.crop_b_mean, s.kept_b_p99, s.kept_b_p999]);
  assert(s.crop_b_mean <= s.kept_b_p999, `Lab b of CROP_RECOLOURED ${s.crop_b_mean.toFixed(1)} against the 99.9th percentile of kept ground ${s.kept_b_p999}`);
});

suite.test('T0-V7-04', 'the product map cannot be zoomed beyond a 2x enlargement of the native (z16) picture', async (t) => {
  const dist = path.join(REPO, 'tmp', 'b1863', 'group', 'R1c', 'dist');
  if (!fs.existsSync(dist)) throw new Skip('scratch tree tmp/b1863/group/R1c/dist not present');
  const { createEmulator } = await import('../../tools/t0/config/emulate.mjs');
  const emu = await createEmulator({ dist, port: PORT_BASE });
  const S = await openSession({ profile: 'v7-zoom', cdpPort: PORT_BASE + 5, viewport: { width: 1440, height: 900, dpr: 1, mobile: false } });
  try {
    const p = S.page; await p.goto(`${emu.url}/`, { waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'desktop');
    await waitFor(async () => !!(await mapView(p)), { timeout: 30000, label: 'map ref' });
    const z = await p.evaluate(() => { const m = window.__t0map; m.jumpTo({ zoom: 22 }); return { max: m.getMaxZoom(), now: m.getZoom() }; });
    t.note('maxZoom / zoom after jumpTo 22', z);
    assert(z.now <= 17.01, `the camera reaches zoom ${z.now.toFixed(2)} (maxZoom ${z.max}) on a picture whose native level is z16`);
  } finally { await S.close(); await emu.close(); }
});

const outFile = path.join(REPO, 'tmp', 'b1863', 'check7', 'test-verify-photorealism-qa.json');
const summary = await suite.run({ filter: FILTER, outFile });
process.exit(summary.failed ? 1 : 0);
