import json,re,sys,statistics
P=json.load(open('../cache/wis1.pages.json'))
FIRST,LAST=512,555
def lines_of(words):
    ws=sorted(words,key=lambda w:(w[1]+w[3])/2)
    lines=[];cur=[];last=None
    for w in ws:
        yc=(w[1]+w[3])/2
        if last is not None and yc-last>13:
            lines.append(cur);cur=[]
        cur.append(w);last=yc if not cur[:-1] else (last*0.5+yc*0.5)
    if cur: lines.append(cur)
    out=[]
    for l in lines:
        l.sort(key=lambda w:w[0]); out.append(l)
    return out
def clean(t): return re.sub(r'\s+',' ',t).strip()
rows_all=[]
for pn in range(FIRST,LAST+1):
    words=P[str(pn)]
    # drop page header band (y<300?) keep header lines for company detection
    lines=lines_of(words)
    page_text=' '.join(w[4] for w in words)
    # margin fit: lines whose first word has comma and x0<260
    pts=[]
    for l in lines:
        w0=l[0]
        if w0[0]<260 and ',' in ' '.join(x[4] for x in l[:3]) and re.match(r'^[A-Za-z]',w0[4]): pts.append(((w0[1]+w0[3])/2,w0[0]))
    if len(pts)>=3:
        ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
        # robust slope: median of pairwise slopes
        sl=[]
        for i in range(len(pts)):
            for j in range(i+1,len(pts)):
                if abs(ys[j]-ys[i])>300: sl.append((xs[j]-xs[i])/(ys[j]-ys[i]))
        slope=statistics.median(sl) if sl else 0
        b=statistics.median([xs[i]-slope*ys[i] for i in range(len(pts))])
    else:
        slope=-0.01;b=None
    if b is None:
        b=statistics.median([p[1] for p in pts]) if pts else 160
    cur=None
    for l in lines:
        yc=(l[0][1]+l[0][3])/2
        ns=b+slope*yc
        cols={'n':[],'r':[],'d':[],'m':[]}
        for w in l:
            x=w[0]-ns
            c='n' if x<395 else 'r' if x<650 else 'd' if x<895 else 'm'
            cols[c].append(w[4])
        t={k:clean(' '.join(v)) for k,v in cols.items()}
        first=l[0]
        is_start = (first[0]-ns)<48 and re.match(r"^[A-Za-z']",first[4]) is not None and bool(re.search(r',',' '.join(cols['n'])) or len(cols['n'])>0 and (len(t['d'])>3 or len(t['r'])>2))
        rows_all.append(dict(page=pn,y=int(yc),start=is_start,**t,full=clean(' '.join(w[4] for w in l))))
json.dump(rows_all,open('../cache/wis6_lines.json','w'))
print(len(rows_all))
