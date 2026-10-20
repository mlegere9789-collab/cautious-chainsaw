import sys,math,json; sys.path.insert(0,'.')
import numpy as np, rephoto as R
prof=[(30,345),(120,330),(215,300),(295,288),(340,300),(400,330),(460,365),(520,385),(600,410),(680,440),(780,475),(900,490),(945,480)]
prof=[(u-30,v-30) for u,v in prof]; pw,ph=945,910; W=200; H=int(W*ph/pw)
us=np.array([p[0] for p in prof])/pw*W; vs=np.array([p[1] for p in prof])/ph*H; cols=np.arange(int(us.min()),int(us.max())+1); tv=np.interp(cols,us,vs)
def cost(E,N,yaw,pitch,hf,key):
    img,d,cl=R.render(E,N,1.7,yaw,pitch,hf,W=W,H=H,use_ext=True,ext_key=key,tmax=3000,clear_r=35)
    hit=d>=0; rows=np.where(hit.any(0),hit.argmax(0),H).astype(float)
    return float(np.sqrt(np.mean(np.clip((rows[cols]-tv)/H*ph,-300,300)**2)))
out=[]
for E in range(308420,308561,40):
  for N in range(4406880,4407121,40):
    brg=math.degrees(math.atan2(308262-E,4406431-N))%360   # towards BRT summit
    best=1e9
    for dy in (0,4):
      for dp in (-3,0):
        for hf in (36,44):
            c=cost(E,N,brg+dy+8,dp,hf,'ext_base')   # summit left of centre by ~8 deg
            if c<best: best=c; bk=(dy,dp,hf)
    out.append((E,N,round(best,1),bk)); print(E,N,round(best,1),bk,flush=True)
json.dump(out,open('grid_c03.json','w'))
