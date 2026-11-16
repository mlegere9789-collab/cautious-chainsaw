"""print compact hits: python3 -I showhits.py qid [width] [filter-regex]"""
import sys,re,os
qid=sys.argv[1]; w=int(sys.argv[2]) if len(sys.argv)>2 else 520
flt=re.compile(sys.argv[3],re.I) if len(sys.argv)>3 else None
txt=open(os.path.join('/home/user/cautious-chainsaw/tmp/terrain-1/r3/hits',qid+'.txt')).read()
head,_,body=txt.partition('\n\n')
print(head)
for blk in body.split('\n[')[0:]:
    blk=blk if blk.startswith('[') else '['+blk
    if not blk.strip('[ \n'): continue
    m=re.match(r'\[(.*?)\]\n\s*\.\.\.(.*)\.\.\.\s*$',blk,re.S)
    if not m: continue
    fid,ctx=m.group(1),m.group(2)
    if flt and not flt.search(ctx): continue
    mid=len(ctx)//2
    print('['+fid+']'); print('   ...'+ctx[max(0,mid-w//2):mid+w//2]+'...')
