import csv,glob,json,collections,random,os
csv.field_size_limit(10**8)
os.chdir(r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\NE')
rows=[]
for f in sorted(glob.glob('*/*.csv')):
    if 'pilot-corr' in f or 'unmapped' in f: continue
    for i,r in enumerate(csv.DictReader(open(f,encoding='utf8',newline=''))):
        r['_f']=f.replace(chr(92),'/');r['_i']=i+2;rows.append(r)
print(len(rows))
print(collections.Counter(r['rank_class'] for r in rows))
print(collections.Counter(r['evidence_label'] for r in rows))
rnd=random.Random(41)
byu=collections.defaultdict(list)
for r in rows: byu[r['_f']].append(r)
files=sorted(byu)
samp=[];used=set()
def pick(pool,tag):
    while True:
        r=rnd.choice(pool)
        k=(r['_f'],r['_i'])
        if k not in used:
            used.add(k);r=dict(r);r['_tag']=tag;samp.append(r);return
for f in files: pick(byu[f],'unit')           # 36
off=[r for r in rows if r['rank_class'] in ('field','staff','company_officer')]
pd=[r for r in rows if r['presence_label']=='Present-Documented']
for _ in range(12): pick(off,'officer')
for st in ('maine','massachusetts','new-hampshire'):
    pool=[r for r in pd if r['_f'].startswith(st)]
    for _ in range(4): pick(pool,'present-doc')
print(len(samp))
json.dump(samp,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'audit_sample_rows.json'),'w'),indent=0)
for n,r in enumerate(samp):
    print(n,r['_f'].split('/')[1][:22],r['_i'],r['_tag'],'|',r['company'],'|',r['name_as_printed'],'|',r['rank_as_printed'],'|',r['presence_label'],r['basis_code'])
