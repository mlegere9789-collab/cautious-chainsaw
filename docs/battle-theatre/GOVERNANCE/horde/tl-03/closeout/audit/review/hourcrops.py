"""Crop the line of each hour-bearing OR quote from the page image (word boxes from the PDF text layer), 130 dpi; montage of N crops per image.
python3 -I hourcrops.py FIRST LAST   (indices into hourquotes.json)"""
import json,re,subprocess,sys,os
from PIL import Image, ImageDraw
ROOT='/home/user/cautious-chainsaw/'
PDF={1:'cu31924077699761',2:'cu31924077728255',3:'cu31924077700262'}
H=json.load(open(ROOT+'tmp/tl-03/rev/hourquotes.json'))
a,b=int(sys.argv[1]),int(sys.argv[2])
OUT=ROOT+'tmp/tl-03/img/hour/'; os.makedirs(OUT,exist_ok=True)
R=130
cache={}
def words(part,leaf):
    k=(part,leaf)
    if k in cache: return cache[k]
    x=subprocess.run(['pdftotext','-f',str(leaf+1),'-l',str(leaf+1),'-bbox',ROOT+'tmp/kit-plan/or27-pdf/%s.pdf'%PDF[part],'-'],capture_output=True,text=True).stdout
    ws=[(float(m.group(1)),float(m.group(2)),float(m.group(3)),float(m.group(4)),m.group(5)) for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>',x)]
    cache[k]=ws; return ws
import html
crops=[]
for i in range(a,min(b,len(H))):
    h=H[i]; ws=words(h['part'],h['leaf'])
    toks=h['quote'].split()
    pre=len(h['quote'][:h['start']].split())
    lo=max(0,pre-2); win=toks[lo:pre+4]
    pw=[html.unescape(w[4]) for w in ws]
    found=None
    for j in range(len(pw)-len(win)+1):
        if pw[j:j+len(win)]==win: found=j; break
    if found is None:
        # looser: match the hour token itself
        cand=[j for j,w in enumerate(pw) if h['token'].split()[0] in w]
        if cand: found=cand[0]; win=[pw[found]]
    if found is None:
        crops.append((i,h,None)); continue
    seg=ws[found:found+len(win)]
    x0=min(s[0] for s in seg)-60; x1=max(s[2] for s in seg)+60; y0=min(s[1] for s in seg)-9; y1=max(s[3] for s in seg)+9
    px=lambda v:int(v*R/72)
    base=OUT+'c%d'%i
    subprocess.run(['pdftoppm','-f',str(h['leaf']+1),'-l',str(h['leaf']+1),'-r',str(R),'-x',str(max(0,px(x0))),'-y',str(max(0,px(y0))),'-W',str(px(x1-x0)),'-H',str(px(y1-y0)),'-gray','-png','-singlefile',ROOT+'tmp/kit-plan/or27-pdf/%s.pdf'%PDF[h['part']],base],check=True)
    crops.append((i,h,base+'.png'))
# montage 8 per image
for m in range(0,len(crops),8):
    ch=crops[m:m+8]; ims=[]
    for i,h,f in ch:
        lab='#%d %s %s p.%s token %r'%(i,h['row'],h['key'],h['page'],h['token'])
        if f is None:
            im=Image.new('L',(900,30),255); ImageDraw.Draw(im).text((4,8),lab+'  [NOT LOCATED]',fill=0); ims.append(im); continue
        c=Image.open(f); w=max(c.width,900); im=Image.new('L',(w,c.height+16),255); ImageDraw.Draw(im).text((2,0),lab,fill=0); im.paste(c,(0,16)); ims.append(im)
    W=max(x.width for x in ims); Ht=sum(x.height for x in ims)+4*len(ims)
    M=Image.new('L',(W,Ht),200); y=0
    for im in ims: M.paste(im,(0,y)); y+=im.height+4
    M.save(OUT+'m_%d_%d.png'%(a,m)); print(OUT+'m_%d_%d.png'%(a,m),[c[0] for c in ch])
