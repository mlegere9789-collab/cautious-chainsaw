import sys,numpy as np,math,json
sys.path.insert(0,'.')
import rephoto as R
from scipy.optimize import differential_evolution
def sky_rows(E,N,hag,yaw,pitch,hfov,W,H,use_ext=True,roll=0.0,clear_r=30.0):
    img,d,cl=R.render(E,N,hag,yaw,pitch,hfov,W=W,H=H,use_ext=use_ext,roll=roll,tmax=6000,clear_r=clear_r)
    hit=d>=0
    rows=np.where(hit.any(0),hit.argmax(0),H).astype(float)
    return rows
def fit(profile,size,bounds,hag=1.7,W=160,use_ext=True,seed=1,maxiter=40,pop=12,fixed_pos=None):
    """profile: list of (u,v) in photo px of skyline; size=(w,h) of photo crop. bounds: dict E,N,yaw,pitch,hfov (lo,hi)"""
    pw,ph=size; H=int(round(W*ph/pw)); pf=np.array(profile,float)
    us=pf[:,0]/pw*W; vs=pf[:,1]/ph*H
    cols=np.arange(int(math.ceil(us.min())),int(us.max())+1); tv=np.interp(cols,us,vs)
    def cost(x):
        E,N,yaw,pitch,hfov=x
        r=sky_rows(E,N,hag,yaw,pitch,hfov,W,H,use_ext)
        e=(r[cols]-tv)/H*ph   # photo pixels
        e=np.clip(e,-300,300)
        return float(np.sqrt(np.mean(e**2)))
    b=[bounds[k] for k in ('E','N','yaw','pitch','hfov')]
    res=differential_evolution(cost,b,seed=seed,maxiter=maxiter,popsize=pop,tol=1e-3,polish=False,workers=1,updating='immediate')
    return res.x,res.fun
