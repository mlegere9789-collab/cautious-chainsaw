import sys,subprocess,csv,io,os,difflib,re
from PIL import Image, ImageDraw
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','..','..','..'))
PDF={1:'cu31924077699761',2:'cu31924077728255',3:'cu31924077700262'}
def page(part,leaf,dpi=200):
    base=f'{ROOT}/tmp/tl-09-12/p{part}_{leaf}_{dpi}'
    if not os.path.exists(base+'.png'):
        subprocess.run(['pdftoppm','-f',str(leaf+1),'-l',str(leaf+1),'-r',str(dpi),'-gray','-png','-singlefile',f'{ROOT}/tmp/kit-plan/or27-pdf/{PDF[part]}.pdf',base],check=True)
    return base+'.png'
def tsv(part,leaf):
    p=page(part,leaf)
    t=p.replace('.png','.tsv')
    if not os.path.exists(t):
        out=subprocess.run(['tesseract',p,'stdout','-l','eng','--psm','3','tsv'],capture_output=True,text=True,env=dict(os.environ,OMP_THREAD_LIMIT='1')).stdout
        open(t,'w').write(out)
    return [r for r in csv.DictReader(io.StringIO(open(t).read()),delimiter='\t',quoting=csv.QUOTE_NONE) if r.get('text') and r['text'].strip() and r['level']=='5']
def snip(part,leaf,phrase,pad=2):
    w=tsv(part,leaf); words=phrase.split(); n=len(words)
    best=(0,None)
    for i in range(len(w)-n+1):
        s=difflib.SequenceMatcher(None,' '.join(x['text'] for x in w[i:i+n]).lower(),phrase.lower()).ratio()
        if s>best[0]: best=(s,i)
    s,i=best
    seg=w[i:i+n]
    top=min(int(x['top']) for x in seg)-60; bot=max(int(x['top'])+int(x['height']) for x in seg)+60
    im=Image.open(page(part,leaf)).convert('RGB')
    cr=im.crop((0,max(0,top),im.width,min(im.height,bot)))
    return s,cr,' '.join(x['text'] for x in seg)
if __name__=='__main__':
    part,leaf=int(sys.argv[1]),int(sys.argv[2]); outs=[]
    for k,ph in enumerate(sys.argv[3:]):
        s,cr,txt=snip(part,leaf,ph); print(ph,'->',round(s,2),'|',txt); cr.save(f'{ROOT}/tmp/tl-09-12/snip_{part}_{leaf}_{k}.png')
