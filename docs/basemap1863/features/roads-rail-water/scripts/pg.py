import re,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from common import *
def clean(s):
    s=re.sub(r'(?m)^[I1l\. ]{1,3}$\n?','',s)
    s=re.sub(r'[ \t]+',' ',s)
    s=re.sub(r'\n(?=[a-z(,])',' ',s)
    return s
def pages(name,a,b=None):
    t=open(CACHE+f'/txt/{name}.txt',encoding='utf8',errors='ignore').read()
    pg=re.split(r'\n=====PAGE (\d+)=====\n',t)
    d={int(pg[i]):pg[i+1] for i in range(1,len(pg),2)}
    for p in range(a,(b or a)+1):
        print(f'=== {name} PAGE {p}'); print(clean(d.get(p,''))[:int(os.environ.get('MAXC',6000))])
if __name__=='__main__':
    pages(sys.argv[1],int(sys.argv[2]),int(sys.argv[3]) if len(sys.argv)>3 else None)
