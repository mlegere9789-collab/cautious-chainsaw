import sys, numpy as np, json
sys.path.insert(0,'scripts')
import chamfer3 as c
from scipy import ndimage as ndi
from scipy.interpolate import RectBivariateSpline
from scipy.optimize import minimize
f=json.load(open('chamfer_fit.json')); P=np.array(f['p'])
# denser road points (all selected roads) in px space
E=c.pts[:,0]; N=c.pts[:,1]
x0,y0=c.tf(P,E,N)
gx=np.linspace(0,8878,8); gy=np.linspace(0,9845,9)   # control grid
nx,ny=len(gx),len(gy)
def basis(x,y):
    B=np.zeros((len(x),nx*ny))
    for i in range(ny):
        for j in range(nx):
            Z=np.zeros((ny,nx)); Z[i,j]=1
            sp=RectBivariateSpline(gy,gx,Z,kx=3,ky=3)
            B[:,i*nx+j]=sp.ev(y,x)
    return B
inside=(x0>0)&(x0<8878)&(y0>0)&(y0<9845)
x0=x0[inside]; y0=y0[inside]
B=basis(x0,y0); print('basis',B.shape)
dt=c.dt
gdy,gdx=np.gradient(dt)
LAM=float(sys.argv[1]) if len(sys.argv)>1 else 0.5
def fun(q):
    dx=B@q[:nx*ny]; dy=B@q[nx*ny:]
    X=(x0+dx)*0.5; Y=(y0+dy)*0.5
    ok=(X>1)&(X<dt.shape[1]-2)&(Y>1)&(Y<dt.shape[0]-2)
    v=ndi.map_coordinates(dt,[Y,X],order=1,mode='nearest')
    gxv=ndi.map_coordinates(gdx,[Y,X],order=1,mode='nearest'); gyv=ndi.map_coordinates(gdy,[Y,X],order=1,mode='nearest')
    n=len(x0)
    cost=v.mean()
    gq=np.concatenate([B.T@gxv*0.5/n, B.T@gyv*0.5/n])
    # smoothness: second differences of control displacement + magnitude
    reg=0; greg=np.zeros_like(q)
    for off in (0,nx*ny):
        Q=q[off:off+nx*ny].reshape(ny,nx)
        for ax in (0,1):
            D=np.diff(Q,2,axis=ax); reg+=LAM*(D**2).sum()/1e4
            G=np.zeros_like(Q)
            if ax==0:
                G[:-2]+=2*D; G[1:-1]-=4*D; G[2:]+=2*D
            else:
                G[:,:-2]+=2*D; G[:,1:-1]-=4*D; G[:,2:]+=2*D
            greg[off:off+nx*ny]+=LAM*G.ravel()/1e4
        reg+= 0.0005*(Q**2).sum()/1e4; greg[off:off+nx*ny]+=0.001*Q.ravel()/1e4
    return cost+reg, gq+greg
if __name__=='__main__':
    q0=np.zeros(2*nx*ny)
    print('start',fun(q0)[0])
    r=minimize(fun,q0,jac=True,method='L-BFGS-B',bounds=[(-150,150)]*len(q0),options={'maxiter':400,'maxfun':800})
    print(r.fun,r.message)
    dxs=(B@r.x[:nx*ny]); dys=(B@r.x[nx*ny:])
    print('disp px: mean',np.hypot(dxs,dys).mean(),'max',np.hypot(dxs,dys).max())
    v=ndi.map_coordinates(dt,[(y0+dys)*0.5,(x0+dxs)*0.5],order=1); v0=ndi.map_coordinates(dt,[y0*0.5,x0*0.5],order=1)
    print('mean dt before',v0.mean(),'after',v.mean(),'frac<1.5 before',(v0<1.5).mean(),'after',(v<1.5).mean())
    json.dump({'q':r.x.tolist(),'gx':gx.tolist(),'gy':gy.tolist(),'lam':LAM},open('ffd_fit.json','w'))
