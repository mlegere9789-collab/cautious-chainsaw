import numpy as np, cv2, sys, json
from PIL import Image
sys.path.insert(0,'scripts')
from glyph import glyph_pts
Image.MAX_IMAGE_PIXELS=None
g=np.array(Image.open('warren_full_gray.png')); H,W=g.shape
pts=[]; strip=1500; pad=60
for y in range(0,H,strip):
    ya=max(0,y-pad); yb=min(H,y+strip+pad)
    for x,yy in glyph_pts(g[ya:yb]):
        cy=yy+ya
        if y<=cy<y+strip: pts.append((x,cy))
    print(y,len(pts),flush=True)
json.dump(pts,open('glyph_pts.json','w'))
