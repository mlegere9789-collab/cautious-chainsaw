# Synthetic oblique-view renderer for rephotography (check pass 5). Pinhole camera over 3DEP bare earth
# with the reconstruction tiles (or the 2013 NAIP) draped; woods/orchards/structures/fences of the catalogues
# are extruded with ASSUMED heights (woods 18 m, orchard 5 m, fence 1.4 m, buildings by subtype).
import os, math, numpy as np, cv2, numba
from numba import njit, prange
numba.set_num_threads(4)
try:
    import psutil; psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception: pass
D='C:/Users/mlege/gettysburg-map/tmp/b1863/check5/scene/'
X0,Y1=304500,4413500
_cache={}
def load():
    if not _cache:
        _cache['dem']=np.load(D+'dem.npy'); _cache['ext']=np.load(D+'ext.npy'); _cache['cls']=np.load(D+'cls.npy')
        rec=np.load(D+'recon.npy'); _cache['recon']=np.ascontiguousarray(rec[...,:3])  # BGR
        nai=np.load(D+'naip.npy'); _cache['naip']=np.ascontiguousarray(nai[...,::-1])  # BGR
    return _cache
def en2ij(E,N): return Y1-N, E-X0   # row (float), col (float)
def ground(E,N):
    c=load(); r,cc=en2ij(E,N); r-=0.5; cc-=0.5
    i=int(math.floor(r)); j=int(math.floor(cc)); fy=r-i; fx=cc-j
    d=c['dem']; return float((1-fy)*((1-fx)*d[i,j]+fx*d[i,j+1])+fy*((1-fx)*d[i+1,j]+fx*d[i+1,j+1]))
def cam_basis(yaw,pitch,roll):
    a=math.radians(yaw); p=math.radians(pitch); r=math.radians(roll)
    f=np.array([math.sin(a)*math.cos(p),math.cos(a)*math.cos(p),math.sin(p)])
    right=np.array([math.cos(a),-math.sin(a),0.0])
    up=np.cross(right,f)
    right2=right*math.cos(r)+up*math.sin(r); up2=-right*math.sin(r)+up*math.cos(r)
    return f,right2,up2
def project(pts,E,N,Z,yaw,pitch,roll,hfov,W,H):
    """pts Nx3 (E,N,Z) -> pixel (u,v), depth"""
    f,r,u=cam_basis(yaw,pitch,roll); F=(W/2)/math.tan(math.radians(hfov)/2)
    d=np.asarray(pts,float)-np.array([E,N,Z]); xc=d@r; yc=d@u; zc=d@f
    return np.stack([W/2+F*xc/zc,H/2-F*yc/zc],1),zc
@njit(cache=True,fastmath=True)
def _bil(a,r,c):
    i=int(math.floor(r)); j=int(math.floor(c)); fy=r-i; fx=c-j
    return (1-fy)*((1-fx)*a[i,j]+fx*a[i,j+1])+fy*((1-fx)*a[i+1,j]+fx*a[i+1,j+1])
@njit(cache=True,fastmath=True)
def _surf(dem,ext,r,c):
    g=_bil(dem,r-0.5,c-0.5)
    e=ext[int(r),int(c)]
    return g,e
@njit(cache=True,fastmath=True)
def _shoot(dem,ext,cls,tex,ox,oy,oz,dx,dy,dz,tmax,sky,use_ext,x0,y1,clr):
    nr,nc=dem.shape; zmax=300.0
    t=0.5; prev=0.0; hit=False
    r=0.0; c=0.0; z=0.0
    while t<tmax:
        x=ox+t*dx; y=oy+t*dy; z=oz+t*dz
        r=y1-y; c=x-x0
        if r<2 or c<2 or r>nr-3 or c>nc-3: break
        if dz>0 and z>zmax: break
        g=_bil(dem,r-0.5,c-0.5)
        e=ext[int(r),int(c)] if (use_ext and t>clr) else 0.0
        if z<g+e:
            lo=prev; hi=t
            for k in range(10):
                m=0.5*(lo+hi)
                xm=ox+m*dx; ym=oy+m*dy; zm=oz+m*dz
                rm=y1-ym; cm=xm-x0
                gm=_bil(dem,rm-0.5,cm-0.5)
                em=ext[int(rm),int(cm)] if (use_ext and m>clr) else 0.0
                if zm<gm+em: hi=m
                else: lo=m
            t=hi; x=ox+t*dx; y=oy+t*dy; z=oz+t*dz; r=y1-y; c=x-x0
            hit=True; break
        prev=t
        t+=0.35+0.0012*t
    res=np.zeros(5,np.float64)
    if hit:
        rr=r-0.5; cc=c-0.5
        i=int(math.floor(rr)); j=int(math.floor(cc)); fy=rr-i; fx=cc-j
        sh=1.0
        eh=ext[int(r),int(c)] if use_ext else 0.0
        if eh>0:
            gh=_bil(dem,r-0.5,c-0.5)
            if z<gh+eh-0.4: sh=0.55+0.4*min(1.0,max(0.0,(z-gh)/eh))
        hz=math.exp(-t/9000.0)
        for ch in range(3):
            val=(1-fy)*((1-fx)*tex[i,j,ch]+fx*tex[i,j+1,ch])+fy*((1-fx)*tex[i+1,j,ch]+fx*tex[i+1,j+1,ch])
            res[ch]=min(255.0,max(0.0,val*sh*hz+sky[ch]*(1-hz)))
        res[3]=t; res[4]=cls[int(r),int(c)]
    else:
        for ch in range(3): res[ch]=sky[ch]
        res[3]=-1.0
    return res
@njit(parallel=True,cache=True,fastmath=True)
def _render(dem,ext,cls,tex,ox,oy,oz,f,rt,up,F,W,H,tmax,sky,use_ext,x0,y1,clr):
    out=np.zeros((H,W,3),np.uint8); depth=np.zeros((H,W),np.float32); cl=np.zeros((H,W),np.uint8)
    for v in prange(H):
        for u in range(W):
            xn=(u+0.5-W/2)/F; yn=-(v+0.5-H/2)/F
            dx=f[0]+xn*rt[0]+yn*up[0]; dy=f[1]+xn*rt[1]+yn*up[1]; dz=f[2]+xn*rt[2]+yn*up[2]
            nrm=math.sqrt(dx*dx+dy*dy+dz*dz)
            res=_shoot(dem,ext,cls,tex,ox,oy,oz,dx/nrm,dy/nrm,dz/nrm,tmax,sky,use_ext,x0,y1,clr)
            out[v,u,0]=res[0]; out[v,u,1]=res[1]; out[v,u,2]=res[2]; depth[v,u]=res[3]; cl[v,u]=res[4]
    return out,depth,cl
def render(E,N,hag,yaw,pitch,hfov,W=900,H=700,layer='recon',roll=0.0,use_ext=True,tmax=7000.0,Z=None,sky=(232,235,238),clear_r=0.0):
    c=load(); g=ground(E,N); oz=(g+hag) if Z is None else Z
    f,r,u=cam_basis(yaw,pitch,roll); F=(W/2)/math.tan(math.radians(hfov)/2)
    tex=c[layer]
    return _render(c['dem'],c['ext'],c['cls'],tex,E-0.0,N-0.0,oz,f,r,u,F,W,H,tmax,np.array(sky,np.float64),use_ext,float(X0),float(Y1),float(clear_r))
