import json,re,sys
PW='C:/Users/mlege/AppData/Roaming/Claude/scratch-workspaces/fe20000a-2144-4d85-ac4c-4e19e62f5823/1fb796a8-22ef-47aa-b6e3-227d4048a221/scratch-2026-09-30-719300/plan-work'
# mobile
src=open(PW+'/tmp-app-mobile/apply_patches.py',encoding='utf8').read()
a=src.index('# ---- HF-1  gate'); b=src.index('# ---- HF-13')
seg=src[a:b]
mob=[]
def rep(tag,find,new,text_name='js',count=1):
    mob.append(dict(id=tag,find=find,repl=new,target=text_name,expect=count))
exec(seg,{'rep':rep})
json.dump(mob,open('mobile_patches.json','w'))
print('mobile',len(mob), sum(1 for m in mob if m['target']=='js'),'js')
# a11y
src=open(PW+'/tmp-app-a11y/bridge_patch_check.py',encoding='utf8').read()
a=src.index('patches = []'); b=src.index('out = s')
seg=src[a:b]
a11=[]
patches=[]
def P(pid,find,repl,n=1,regex=False):
    patches.append(dict(id=pid,find=find,repl=repl,expect=n,regex=regex))
exec(seg.replace('patches = []  # (id, kind, find, replace, expected_count)',''),{'P':P,'patches':patches})
json.dump(patches,open('a11y_patches.json','w'))
print('a11y',len(patches))
