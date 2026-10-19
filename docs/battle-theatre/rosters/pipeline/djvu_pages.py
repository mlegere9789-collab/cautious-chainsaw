import re,sys,json
# stream-parse djvu xml into pages: list of lines each with words (x0,y0,x1,y1,text)
def pages(path):
    cur=None; idx=0
    word_re=re.compile(r'<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>(.*?)</WORD>')
    with open(path,encoding='utf-8',errors='replace') as f:
        words=[]
        for line in f:
            if '<OBJECT' in line:
                if cur is not None: yield cur,words
                idx+=1; cur=idx; words=[]
            m=word_re.search(line)
            if m:
                x0,yb,x1,yt=map(int,m.groups()[:4]); words.append((x0,yt,x1,yb,m.group(5).replace('&amp;','&').replace('&quot;','"').replace('&apos;',"'")))
        if cur is not None: yield cur,words
if __name__=='__main__':
    path=sys.argv[1]; out={}
    for i,w in pages(path):
        txt=' '.join(x[4] for x in w)
        out[i]=w
    json.dump(out,open(sys.argv[2],'w'))
    print(len(out))
