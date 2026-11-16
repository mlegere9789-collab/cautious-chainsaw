import json,sys,re,os
ROOT='/home/user/cautious-chainsaw/'
G=ROOT+'docs/battle-theatre/GOVERNANCE/'
rows={}
for l in open(G+'timeline_corrections/tl-03.jsonl'):
    o=json.loads(l); rows[o['id']]=o
raw={}
def collapse(s): return re.sub(r'\s+',' ',s)
B=int(os.environ.get('B','160')); A=int(os.environ.get('A','420'))
for a in sys.argv[1:]:
    rid,n=a.split(':')
    r=rows[rid]; cit={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if str(s['n'])!=n: continue
        print('==== %s S%s [%s/%s] %s'%(rid,n,s['tier'],s['support'],s['claim']))
        for k in s['citations']:
            c=cit[k]
            if c['source_id']=='COMPUTED':
                print('   [%s] COMPUTED'%k); continue
            p=ROOT+c['source_file']
            if p not in raw: raw[p]=open(p,encoding='utf-8',newline='').read()
            t=raw[p]; a0,b0=c['text_offset'],c['text_offset_end']
            print('   [%s] %s p.%s @%d'%(k,c['source_id'],c['printed_page'],a0))
            print('      BEFORE: ...'+collapse(t[max(0,a0-B):a0]))
            print('      QUOTE : [['+collapse(t[a0:b0])+']]')
            print('      AFTER : '+collapse(t[b0:b0+A])+'...')
