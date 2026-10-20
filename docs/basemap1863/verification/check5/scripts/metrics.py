# Recomputes every number of the check-5 report from the scene rasters (scripts build_scene.py, build_ext2.py) and writes results.json
import sys,json,math,pickle,numpy as np,cv2,warnings
warnings.filterwarnings('ignore')
sys.path.insert(0,'.')
from rasterio import features
from rasterio.transform import from_origin
from pyproj import Transformer
from shapely.geometry import shape,Point
from shapely.ops import transform
import cone, rephoto as R
from cases import CASES
X0,Y1=304500,4413500
res={'method':'check5 rephotography; see docs/basemap1863/verification/check5-rephotography.md'}
rec=np.load('scene/recon.npy',mmap_mode='r'); nai=np.load('scene/naip.npy',mmap_mode='r'); pv=np.load('scene/prov.npy',mmap_mode='r')
# 1 Devil's Den boulder polygon
pj=Transformer.from_crs(4326,32618,always_xy=True).transform
d=json.load(open('C:/Users/mlege/gettysburg-map/docs/basemap1863/features/landcover/boulder_fields_1863.geojson'))
g=transform(pj,shape(d['features'][0]['geometry']))
m=features.rasterize([(g,1)],out_shape=(8000,7000),transform=from_origin(X0,Y1,1,1))>0
ii,jj=np.nonzero(m); r0,r1,c0,c1=ii.min(),ii.max()+1,jj.min(),jj.max()+1; mm=m[r0:r1,c0:c1]
a=np.ascontiguousarray(rec[r0:r1,c0:c1,:3]); b=np.ascontiguousarray(nai[r0:r1,c0:c1,::-1]); p=np.asarray(pv[r0:r1,c0:c1])
def stats(im,mask):
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype('float32'); mu=cv2.blur(gray,(5,5)); sd=np.sqrt(np.maximum(cv2.blur(gray*gray,(5,5))-mu*mu,0))
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); grey=(hsv[...,1]<45)&(hsv[...,2]>70)&(hsv[...,2]<220)
    return float(sd[mask].mean()),float(grey[mask].mean())
sa=stats(a,mm); sb=stats(b,mm); ch=int((np.isin(p,[1,2,3])&mm).sum())
res['devils_den']=dict(polygon_id='LC-BOULD-0001',area_ha=round(mm.sum()/1e4,2),changed_px=ch,changed_share=round(ch/mm.sum(),3),
    local_std_recon=round(sa[0],2),local_std_2013=round(sb[0],2),local_std_ratio=round(sa[0]/sb[0],3),
    rock_grey_share_recon=round(sa[1],3),rock_grey_share_2013=round(sb[1],3),rock_grey_ratio=round(sa[1]/sb[1],3),
    z16_tiles=['16/18706/24860','16/18706/24859'],catalogue_note='Bare rock: keep modern ground texture here')
E0,N0,E1,N1=307972,4407005,308030,4407043
r0=int(Y1-N1); r1=int(Y1-N0); c0=int(E0-X0); c1=int(E1-X0)
A=np.ascontiguousarray(rec[r0-6:r1+6,c0-6:c1+6,:3]); B=np.ascontiguousarray(nai[r0-6:r1+6,c0-6:c1+6,::-1]); P=np.asarray(pv[r0:r1,c0:c1])
def rockish(im):
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype('float32'); mu=cv2.blur(gray,(5,5)); sd=np.sqrt(np.maximum(cv2.blur(gray*gray,(5,5))-mu*mu,0))
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); return (hsv[...,1]<55)&(hsv[...,2]>60)&(hsv[...,2]<235)&(sd>10), sd
ra,sa=rockish(A); rb,sb=rockish(B); ra,rb,sa,sb=[x[6:-6,6:-6] for x in (ra,rb,sa,sb)]
res['devils_den_interior']=dict(box_E=[E0,E1],box_N=[N0,N1],note="interior of the Devil's Den loop, upper part, no pavement",rock_like_recon=round(float(ra.mean()),3),rock_like_2013=round(float(rb.mean()),3),local_std_recon=round(float(sa.mean()),2),local_std_2013=round(float(sb.mean()),2),changed_share=round(float(np.isin(P,[1,2,3]).mean()),3))
# 2 modern roof remnant near Thompson house
E0,N0,E1,N1=307860,4411820,307990,4411910
r0=int(Y1-N1); r1=int(Y1-N0); c0=int(E0-X0); c1=int(E1-X0)
a=np.asarray(rec[r0:r1,c0:c1,:3]).astype(int); b=np.asarray(nai[r0:r1,c0:c1]).astype(int); p=np.asarray(pv[r0:r1,c0:c1])
mr=(a[...,2]>a[...,1]+35)&(a[...,2]>a[...,0]+45); mn=(b[...,0]>b[...,1]+35)&(b[...,0]>b[...,2]+45)
res['thompson_red_roofs']=dict(box_m=[E1-E0,N1-N0],roof_red_px_2013=int(mn.sum()),roof_red_px_recon=int(mr.sum()),share_retained=round(mr.sum()/mn.sum(),3),
    by_provenance={int(k):int(((p==k)&mr).sum()) for k in np.unique(p[mr])},z16_tiles=['16/18705/24849','16/18706/24849'])
# 3 cone ensembles, fences, tiles
cr=json.load(open('cone_results.json')); fn=json.load(open('fence_nearest.json')); tl=json.load(open('case_tiles.json'))
res['cases']={}
for c in CASES:
    if c['pose'] is None: continue
    res['cases'][c['id']]=dict(loc=c['loc'],tier=c['tier'],pose=c['pose'],cone=cr[c['id']],**fn[c['id']],**tl[c['id']])
fence_photos=['C01','C02','C09','C12','C14','C15','C16','C17']
res['c03_position_ambiguity']=json.load(open('c03_grid_summary.json'))
res['fences']=dict(drawn_total=36,candidates=392,photos_showing_fences_within_100m=fence_photos,min_nearest_drawn_fence_m=min(fn[k]['nearest_drawn_fence_m'] for k in fence_photos if k in fn),
    drawn_within_150m_of_camera=sum(1 for k in fence_photos if k in fn and fn[k]['nearest_drawn_fence_m']<=150))
# 4 terrain: skyline of 3DEP for C03
prof=[(30,345),(120,330),(215,300),(295,288),(340,300),(400,330),(460,365),(520,385),(600,410),(680,440),(780,475),(900,490),(945,480)]
prof=[(u-30,v-30) for u,v in prof]; pw,ph=945,910; W=472; H=int(W*ph/pw)
E_,N_,hag,yaw0,pitch0,hf0=308470,4406990,1.7,207.6,-3.1,40.0; best=1e9
for dy in range(-3,4):
  for dp in range(-2,3):
    for dh in (-6,-3,0,3,6):
        img,dd,cl=R.render(E_,N_,hag,yaw0+dy,pitch0+dp,hf0+dh,W=W,H=H,use_ext=False,tmax=3000)
        hit=dd>=0; rows=np.where(hit.any(0),hit.argmax(0),H).astype(float)
        us=np.array([q[0] for q in prof])/pw*W; vs=np.array([q[1] for q in prof])/ph*H; cols=np.arange(int(us.min()),int(us.max())+1)
        e=(rows[cols]-np.interp(cols,us,vs))/H*ph; r=float(np.sqrt(np.mean(e**2)))
        if r<best: best=r; bk=(dy,dp,dh); bdeg=r/ph*(hf0+dh)*ph/pw
res['terrain_skyline_C03']=dict(rms_px_of_910=round(best,1),rms_deg=round(bdeg,2),offsets_yaw_pitch_hfov=bk,photo_profile_points=len(prof))

# 5 drawn structure blobs inside each view cone
from scipy import ndimage as ndi
clsr=np.load('scene/cls.npy',mmap_mode='r')
def cnt(E,N,yaw,hf,r1):
    Rr=r1+5; i0=int(Y1-N-Rr); i1=int(Y1-N+Rr); j0=int(E-X0-Rr); j1=int(E-X0+Rr)
    c=np.asarray(clsr[i0:i1,j0:j1]); ii,jj=np.mgrid[i0:i1,j0:j1]; dx=X0+jj+0.5-E; dy=Y1-ii-0.5-N
    r=np.hypot(dx,dy); d=(np.degrees(np.arctan2(dx,dy))-yaw+180)%360-180; m=(r<=r1)&(np.abs(d)<=hf/2)
    lab,n=ndi.label(np.isin(c,[4,5,6])); return int(len(np.unique(lab[m&(lab>0)])))
for c in CASES:
    if c['pose'] is None: continue
    E_,N_,h_,yw,pt,hf=c['pose']; res['cases'][c['id']]['structure_blobs_in_cone']={'150m':cnt(E_,N_,yw,hf,150),'300m':cnt(E_,N_,yw,hf,300),'600m':cnt(E_,N_,yw,hf,600)}
json.dump(res,open('results.json','w'),indent=1)
print(json.dumps({k:v for k,v in res.items() if k!='cases'},indent=1))
