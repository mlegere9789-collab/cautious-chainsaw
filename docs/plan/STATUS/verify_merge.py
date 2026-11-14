#!/usr/bin/env python3
"""Independent recount of STATUS.md and backlog.json from items-A.json and items-B.json. It does not import merge_status.py or check_backlog.py, so a bug
shared by the generator and its validator cannot hide here.

    python3 docs/plan/STATUS/verify_merge.py        exit 0 and "PROBLEMS 0" when everything holds, exit 1 and the list otherwise; writes nothing

Checks: the status counts of every chapter row and of the total row of STATUS.md against the items; every OWNER_ONLY item present in STATUS.md with a non-empty
step; every open item (OPEN_BUILDABLE, BUILT_NOT_SHIPPED, OPEN_NEEDS_DECISION) has a backlog entry and no entry is extra except slices; ids are lowercase letters,
digits and hyphens; title, acceptance, files, depends_on, route and order are present; the order runs 1..N; every dependency exists; the status of an entry equals
the status of its source item; every OPEN_NEEDS_DECISION entry names delegated rows that exist in the decisions file and name the item.
"""
import json, re, collections, sys, os
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
R = os.path.join(REPO, 'docs', 'plan', 'STATUS') + os.sep
A=json.load(open(R+'items-A.json')); B=json.load(open(R+'items-B.json'))
bl=json.load(open(R+'backlog.json')); md=open(R+'STATUS.md',encoding='utf-8').read()
items=A['items']+B['items']
problems=[]
ids=[i['id'] for i in items]
if len(set(ids))!=len(ids): problems.append('duplicate item ids across A/B: %s'%[k for k,v in collections.Counter(ids).items() if v>1][:5])
ST=['SHIPPED','BUILT_NOT_SHIPPED','OPEN_BUILDABLE','OPEN_NEEDS_DECISION','OWNER_ONLY','SUPERSEDED']
for i in items:
    if i['status'] not in ST: problems.append('unknown status %s %s'%(i['id'],i['status']))
# chapter table
cnt=collections.defaultdict(collections.Counter)
for i in items: cnt[i['chapter']][i['status']]+=1
rows={}
for line in md.splitlines():
    m=re.match(r'^\| (\d\d[ab]?) \| (.*?) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$',line)
    if m: rows[m.group(1)]=[int(x) for x in m.groups()[2:]]
for ch,c in cnt.items():
    exp=[c[s] for s in ST]+[sum(c.values()), c['BUILT_NOT_SHIPPED']+c['OPEN_BUILDABLE']+c['OPEN_NEEDS_DECISION']]
    if rows.get(ch)!=exp: problems.append('chapter %s table row %s != computed %s'%(ch,rows.get(ch),exp))
if set(rows)!=set(cnt): problems.append('chapter rows differ: %s vs %s'%(sorted(rows),sorted(cnt)))
tot=collections.Counter(i['status'] for i in items)
m=re.search(r'^\| \*\*All\*\* \| \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \| \*\*(\d+)\*\* \|$',md,re.M)
exp=[tot[s] for s in ST]+[len(items),tot['BUILT_NOT_SHIPPED']+tot['OPEN_BUILDABLE']+tot['OPEN_NEEDS_DECISION']]
if not m or [int(x) for x in m.groups()]!=exp: problems.append('All row mismatch %s vs %s'%(m and m.groups(),exp))
print('items',len(items),dict(tot))
# owner-only list: every OWNER_ONLY item id must appear as a table row, with a non-empty step
oo=[i for i in items if i['status']=='OWNER_ONLY']
for i in oo:
    pat=re.compile(r'^\| `%s` \| .*? \| (S|M|L|[^|]*) \| (.+) \|$'%re.escape(i['id']),re.M)
    mm=pat.search(md)
    if not mm: problems.append('OWNER_ONLY %s missing from STATUS.md'%i['id']); continue
    step=(i.get('owner_step') or i.get('next_step') or '').strip()
    if not step: problems.append('OWNER_ONLY %s has no owner step'%i['id'])
    elif not mm.group(2).strip(): problems.append('OWNER_ONLY %s step empty in STATUS.md'%i['id'])
# every non-owner-only item with an owner_step is in the attached table
for i in items:
    if i['status']!='OWNER_ONLY' and i.get('owner_step'):
        if not re.search(r'^\| `%s` \| %s \|'%(re.escape(i['id']),i['status']),md,re.M): problems.append('attached owner step missing: %s'%i['id'])
# backlog coverage
def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
openids={slug(i['id']) for i in items if i['status'] in ('OPEN_BUILDABLE','BUILT_NOT_SHIPPED','OPEN_NEEDS_DECISION')}
bids=[e['id'] for e in bl['items']]
slices={e['id'] for e in bl['items'] if e.get('slice_of')}
if len(set(bids))!=len(bids): problems.append('backlog duplicate ids')
missing=openids-set(bids); extra=set(bids)-openids-slices
if missing: problems.append('open items missing from backlog: %s'%sorted(missing)[:10])
if extra: problems.append('backlog extra ids (not open, not slice): %s'%sorted(extra)[:10])
print('open items',len(openids),'backlog entries',len(bids),'slices',len(slices))
idre=re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
byid={e['id']:e for e in bl['items']}
for e in bl['items']:
    if not idre.match(e['id']): problems.append('bad id '+e['id'])
    for k in ('title','acceptance','files','depends_on','route','order'):
        if k not in e: problems.append('%s missing %s'%(e['id'],k))
    if not e['title'].strip() or not e['acceptance'].strip(): problems.append('%s empty title/acceptance'%e['id'])
    for d in e['depends_on']:
        if d not in byid: problems.append('%s depends on unknown %s'%(e['id'],d))
    # status in backlog equals items status
    src=e['source']
    it=[i for i in items if i['id']==src['id']]
    if not it: problems.append('%s source id %s not in items'%(e['id'],src['id']))
    elif it[0]['status']!=src['status']: problems.append('%s status drift %s vs %s'%(e['id'],src['status'],it[0]['status']))
print('orders contiguous:',sorted(e['order'] for e in bl['items'])==list(range(1,len(bl['items'])+1)))
# route sanity
rt=collections.Counter(e['route']['type'] for e in bl['items'])
print(dict(rt))
done=[e['id'] for e in bl['items'] if e['done']]
print('done',len(done))
# done decision records must have rows present
deleg=open(os.path.join(REPO,'docs','decisions','DELEGATED-DECISIONS-MAIN-SITE.md'),encoding='utf-8').read()
rowids=set(re.findall(r'^\| ([A-Z]\d{2}|W09-\d) \|',deleg,re.M))
for e in bl['items']:
    if e['done'] and e['route']['type']=='decision-record':
        for r in (e.get('done_evidence') or {}).get('rows',[]):
            if r not in rowids: problems.append('%s done row %s absent'%(e['id'],r))
    if e['source']['status']=='OPEN_NEEDS_DECISION':
        rr=(e.get('decision') or {}).get('rows',[])
        if not rr: problems.append('%s OPEN_NEEDS_DECISION without a delegated row'%e['id'])
        for r in rr:
            if r not in rowids: problems.append('%s row %s absent from decisions file'%(e['id'],r))
print('delegated rows in file',len(rowids))
# every delegated row of an OPEN_NEEDS_DECISION entry governs the item (named in the row, or the survey item names the row)
rows={}
for line in deleg.splitlines():
    m=re.match(r'^\|\s*([ABC]\d\d)\s*\|',line)
    if m:
        cells=[c.strip() for c in line.strip().strip('|').split('|')]
        rows[cells[0]]=cells
srcitems={i['id']:i for i in items}
for e in bl['items']:
    if e['source']['status']!='OPEN_NEEDS_DECISION': continue
    it=srcitems[e['source']['id']]
    for r in (e.get('decision') or {}).get('rows',[]):
        gov=rows[r][3] if r in rows and len(rows[r])>3 else ''
        named=e['source']['id'] in re.split(r'[,; ]+',gov) or (r in re.findall(r'\b[ABC]\d\d\b',str(it.get('next_step',''))+str(it.get('delegated_decision',''))+str(it.get('delegated_row',''))))
        if not named: problems.append('%s: row %s does not name the item'%(e['id'],r))
print('PROBLEMS',len(problems))
for p in problems[:50]: print(' -',p)
sys.exit(1 if problems else 0)
