import re,glob,os,json,sys
sys.stdout.reconfigure(encoding='utf-8')
out=[]
for f in sorted(glob.glob('pdf/cli-*.txt')):
    L=[re.sub(r'\s+',' ',l).strip() for l in open(f,encoding='utf8',errors='replace').read().split('\n')]
    L=[l for l in L]
    i=0
    while i<len(L):
        l=L[i]
        if l.endswith('.') and i+1<len(L):
            # find next nonblank
            j=i+1
            while j<len(L) and not L[j]: j+=1
            if j<len(L) and re.match(r'^\(.*(Contributing|Undetermined|Compatible|Incompatible|Noncontributing|Non Contributing|Non-contributing|Managed|Not Evaluated).*\)',L[j]) :
                # gather body until blank double or next heading
                body=[];k=j+1
                while k<len(L):
                    if k+1<len(L) and L[k] and L[k].endswith('.') and len(L[k])<90:
                        kk=k+1
                        while kk<len(L) and not L[kk]: kk+=1
                        if kk<len(L) and L[kk].startswith('(') and re.search(r'ontribut|Undetermined|Compat',L[kk]): break
                    if L[k]: body.append(L[k])
                    k+=1
                    if len(body)>40: break
                out.append({'src':os.path.basename(f),'line':i+1,'name':l,'meta':L[j],'body':' '.join(body)})
                i=k;continue
        i+=1
json.dump(out,open('cli_entries.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
print(len(out))
import collections
print(collections.Counter(o['src'] for o in out))
