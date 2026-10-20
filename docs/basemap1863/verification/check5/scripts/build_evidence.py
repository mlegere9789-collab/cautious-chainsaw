import sys,cv2,numpy as np
sys.path.insert(0,'.')
import topo
OUT='C:/Users/mlege/gettysburg-map/docs/basemap1863/verification/check5/'
def cap(im,t,h=18):
    b=np.full((h,im.shape[1],3),255,np.uint8); cv2.putText(b,t,(4,13),cv2.FONT_HERSHEY_SIMPLEX,0.42,(0,0,0),1,cv2.LINE_AA); return np.vstack([b,im])
def ph(path,box,H):
    im=cv2.imread('photos/'+path); x0,y0,x1,y1=box; im=im[y0:y1,x0:x1]; return cv2.resize(im,(int(im.shape[1]*H/im.shape[0]),H),interpolation=cv2.INTER_AREA)
def fit_h(im,H): return cv2.resize(im,(int(im.shape[1]*H/im.shape[0]),H),interpolation=cv2.INTER_AREA)
def pad(ims):
    H=max(i.shape[0] for i in ims); out=[]
    for i in ims:
        if i.shape[0]<H: i=np.vstack([i,np.full((H-i.shape[0],i.shape[1],3),255,np.uint8)])
        out.append(i)
    return np.hstack(out)
# E1 Devil's Den
E0,N0,E1,N1=307900,4406880,308120,4407080; sc=3
a=topo.crop(E0,N0,E1,N1,'recon',sc,contour=False); b=topo.crop(E0,N0,E1,N1,'naip',sc,contour=False)
H=a.shape[0]
p7=ph('2006692502_12562.jpg',(205,143,742,557),H); p6=ph('2012647709_32843.jpg',(15,15,1005,770),H)
im=pad([cap(p7,"1863: 'Home of a rebel sharpshooter' (O'Sullivan, LoC 2006692502)"),cap(p6,"1863: Plum Run valley, boulder-strewn (LoC 2012647709)"),cap(a,'reconstruction tiles, Devil\'s Den (E307900-308120 N4406880-4407080)'),cap(b,'2013 NAIP, same ground, unchanged')])
im=cv2.resize(im,None,fx=0.62,fy=0.62,interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT+'E1-devils-den-boulders.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,82])
# E2 Thompson house red roofs
E0,N0,E1,N1=307840,4411760,308080,4411900; sc=3
a=topo.crop(E0,N0,E1,N1,'recon',sc,contour=False); b=topo.crop(E0,N0,E1,N1,'naip',sc,contour=False); H=a.shape[0]
p16=ph('2019635468_59848.jpg',(75,25,948,612),H)
im=pad([cap(p16,"1863: Chambersburg Pike (Tyson, LoC 2019635468)"),cap(a,'reconstruction tiles (z16 18705-18706/24849)'),cap(b,'2013 NAIP (hotel with red tile roofs)')])
im=cv2.resize(im,None,fx=0.7,fy=0.7,interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT+'E2-thompson-house-red-roofs.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,82])
# E3 gatehouse
E0,N0,E1,N1=309060,4410120,309340,4410380; sc=2.6
a=topo.crop(E0,N0,E1,N1,'recon',sc,contour=False); b=topo.crop(E0,N0,E1,N1,'naip',sc,contour=False); H=a.shape[0]
p17=ph('2020634839_70979.jpg',(65,30,955,625),H)
im=pad([cap(p17,"1863: Evergreen Cemetery gatehouse (Tyson, LoC 2020634839)"),cap(a,'reconstruction tiles (z16 18708/24852)'),cap(b,'2013 NAIP')])
im=cv2.resize(im,None,fx=0.7,fy=0.7,interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT+'E3-evergreen-gatehouse.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,82])
# E4 Trostle yard
E0,N0,E1,N1=307960,4408110,308110,4408250; sc=5
a=topo.crop(E0,N0,E1,N1,'recon',sc,contour=False); b=topo.crop(E0,N0,E1,N1,'naip',sc,contour=False); H=a.shape[0]
p1=ph('2018670894_00903.jpg',(60,60,990,930),H)
im=pad([cap(p1,"1863: Trostle barn, log building at right (O'Sullivan, LoC 2018670894)"),cap(a,'reconstruction tiles (z16 18706/24857)'),cap(b,'2013 NAIP')])
im=cv2.resize(im,None,fx=0.6,fy=0.6,interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT+'E4-trostle-yard.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,82])
# E5 Rose farm
E0,N0,E1,N1=307250,4407450,307850,4408050; sc=1.4
a=topo.crop(E0,N0,E1,N1,'recon',sc); b=topo.crop(E0,N0,E1,N1,'naip',sc,contour=False); H=a.shape[0]
pa=ph('2011649966_1s02691.jpg',(65,62,508,462),H//2); pb=ph('2018670703_00854.jpg',(35,50,950,760),H//2); pc=ph('2018670852_00888.jpg',(35,110,985,905),H//2)
cw=360; col=np.vstack([cv2.resize(x,(cw,int(cw*x.shape[0]/x.shape[1]))) for x in (pa,pb,pc)]); col=cv2.resize(col,(int(col.shape[1]*H/col.shape[0]),H))
im=pad([cap(col,"1863 Rose farm group (C09, C08, C10)"),cap(a,'reconstruction (yellow canopy, red structures)'),cap(b,'2013 NAIP')])
im=cv2.resize(im,None,fx=0.7,fy=0.7,interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT+'E5-rose-farm.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,82])
print('ok')
