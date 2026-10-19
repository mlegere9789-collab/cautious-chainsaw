import sys,json,numpy as np,cv2,warnings; warnings.filterwarnings('ignore'); sys.path.insert(0,'.')
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
import georef_final as G
from geo import *
t=json.load(open('../../../docs/basemap1863/maps/transforms/warren-1869.json'))
Ai=np.array(t['en_to_px']['A']); Ti=np.array(t['en_to_px']['t'])
H=np.load('mapwork/d_in_a.npy')
M=G.Model(json.load(open('mapwork/gcps_final4.json')),1e4)
im=np.array(Image.open('mapwork/d_in_a.jpg').convert('L'))
ink=cv2.GaussianBlur((im<110).astype(np.float32),(0,0),2.5)
roads=[]
for fn in ('tiger_primary.json','tiger_sec_hwy.json','tiger_sec_72k.json'):
    for f in json.load(open('../modern/vec/'+fn))['features']:
        nm=(f['properties'].get('NAME') or '')
        gm=f['geometry']; lines=[gm['coordinates']] if gm['type']=='LineString' else gm['coordinates']
        for ln in lines: roads.append((nm,np.array([ll2m(*p[:2]) for p in ln])))
def samples(r,step=6):
    out=[]
    for a,b in zip(r[:-1],r[1:]):
        n=max(1,int(np.hypot(*(b-a))/step))
        for k in range(n): out.append(a+(b-a)*k/n)
    return np.array(out)
S=np.vstack([samples(r) for nm,r in roads])
P1=M.m2px(S)
pd=(Ai@S.T).T+Ti; ones=np.c_[pd,np.ones(len(pd))]; P2=(H@ones.T).T; P2=P2[:,:2]/P2[:,2:3]
def best_shift(P,m,R=90,step=3):
    Q=P[m]; res=[]
    for dy in range(-R,R+1,step):
        for dx in range(-R,R+1,step):
            x=np.clip((Q[:,0]+dx).round().astype(int),0,ink.shape[1]-1); y=np.clip((Q[:,1]+dy).round().astype(int),0,ink.shape[0]-1)
            res.append((float(ink[y,x].mean()),dx,dy))
    res.sort(reverse=True); base=None
    x=np.clip(Q[:,0].round().astype(int),0,ink.shape[1]-1); y=np.clip(Q[:,1].round().astype(int),0,ink.shape[0]-1)
    return res[0],float(ink[y,x].mean())
boxes={'north-west (x<3000,y<4500)':(0,3000,0,4500),'north (3000-5000,y<3500)':(3000,5000,0,3500),'north-east (x>5500,y<4500)':(5500,8300,0,4500),'west-centre (x<3000,4500-8000)':(0,3000,4500,8000),'centre (3000-6000,4500-8000)':(3000,6000,4500,8000),'east (x>6000,4500-8000)':(6000,8300,4500,8000),'south (y>8000)':(0,8300,8000,10700)}
out={}
for k,(x0,x1,y0,y1) in boxes.items():
    m1=(P1[:,0]>=x0)&(P1[:,0]<x1)&(P1[:,1]>=y0)&(P1[:,1]<y1)
    m2=(P2[:,0]>=x0)&(P2[:,0]<x1)&(P2[:,1]>=y0)&(P2[:,1]<y1)
    if m1.sum()<200 or m2.sum()<200: continue
    b1,z1=best_shift(P1,m1); b2,z2=best_shift(P2,m2)
    out[k]=dict(n_TPS=int(m1.sum()),TPS=dict(best_shift_px=[b1[1],b1[2]],ink_at_best=round(b1[0],3),ink_at_zero=round(z1,3)),n_affine=int(m2.sum()),affine=dict(best_shift_px=[b2[1],b2[2]],ink_at_best=round(b2[0],3),ink_at_zero=round(z2,3)))
    print(k,out[k])
json.dump(out,open('../../../docs/basemap1863/features/structures/evidence/georef_road_shift_check.json','w'),indent=1)
