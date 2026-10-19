import numpy as np, cv2, json, sys
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
res=np.load('uncovered_sym.npy')
n,lab,st,cen=cv2.connectedComponentsWithStats(res,connectivity=8)
rows=[(int(st[i,cv2.CC_STAT_AREA]),i) for i in range(1,n) if st[i,cv2.CC_STAT_AREA]>int(sys.argv[3])]
rows.sort(reverse=True)
a,b=int(sys.argv[1]),int(sys.argv[2])
rows=rows[a:b]
im=Image.open('warren_full_gray.png').convert('RGB')
S=520; cols=3
sh=Image.new('RGB',(cols*S+8,((len(rows)+cols-1)//cols)*S+8),(255,255,255))
meta=[]
for j,(ar,i) in enumerate(rows):
    x,y,w,h=st[i,0],st[i,1],st[i,2],st[i,3]; cx=x+w//2; cy=y+h//2; half=max(w,h)//2+120
    c=im.crop((cx-half,cy-half,cx+half,cy+half)).resize((S,S),Image.LANCZOS); sc=S/(2*half)
    m=(lab[cy-half:cy+half,cx-half:cx+half]==i).astype(np.uint8) if cy-half>=0 and cx-half>=0 else None
    if m is not None and m.size:
        m=cv2.resize(m,(S,S),interpolation=cv2.INTER_NEAREST)
        cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        d=ImageDraw.Draw(c)
        for cc in cs: d.line([tuple(p[0]) for p in cc]+[tuple(cc[0][0])],fill=(0,200,255),width=2)
    d=ImageDraw.Draw(c); d.text((4,4),f'#{a+j} id{i} ({cx},{cy}) a={ar}',fill=(255,0,0))
    sh.paste(c,((j%cols)*(S+4),(j//cols)*(S+4))); meta.append((a+j,int(i),int(cx),int(cy),int(ar)))
sh.save(sys.argv[4]); json.dump(meta,open(sys.argv[4]+'.json','w'))
