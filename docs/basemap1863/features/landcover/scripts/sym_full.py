import numpy as np, cv2, json, sys
from PIL import Image
sys.path.insert(0,'scripts')
from sym import symbols
Image.MAX_IMAGE_PIXELS=None
cv2.setNumThreads(2)
g=np.array(Image.open('warren_full_gray.png')); H,W=g.shape
D=np.zeros((H,W),np.float32); strip=1500; pad=60
for y in range(0,H,strip):
    ya=max(0,y-pad); yb=min(H,y+strip+pad)
    ink,sym=symbols(g[ya:yb])
    dens=cv2.GaussianBlur(sym.astype(np.float32),(0,0),12)
    D[y:min(H,y+strip)]=dens[y-ya:y-ya+min(strip,H-y)]
    print(y,flush=True)
np.save('sym_dens.npy',D.astype(np.float16))
