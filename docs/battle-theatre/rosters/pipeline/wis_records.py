import json,re
R=json.load(open('../cache/wis6_lines.json'))
hdr_re=re.compile(r'ROSTER\s+(WISCONSIN|^)|VOLUNTEERS\.?$|REGIMENT\s+INFANTRY|^NAME\.?|RESIDENCE\.?\s*DATE|^\W*\d{3}\W*$',re.I)
comp_re=re.compile(r'COMPANY\W*([A-K])',re.I)
recs=[];cur=None;company='FS';section='officers'
for r in R:
    f=r['full']
    if re.search(r'ROSTER\s+OF\s+RECRUITS',f,re.I): company='REC';section='enlisted';cur=None;continue
    m=comp_re.search(f)
    if m and re.search(r'ROSTER\W+OF',f,re.I):
        company=m.group(1).upper();section='officers';cur=None;continue
    if re.search(r'FIELD\s+AND\s+STAFF',f,re.I): company='FS';section='officers';cur=None;continue
    if re.search(r'ENLISTED\s+MEN',f,re.I): section='enlisted';cur=None
    if re.search(r'NON-?\s*COM',f,re.I) and not r['d']: section='nco';cur=None;continue
    stripped=re.sub(r'[^A-Za-z]','',f)
    if re.search(r'ROSTER.{0,8}(WISCONSIN|VOLUNTEERS)|WISCONSIN.{0,3}VOLUNTEERS|SIXTH.{0,8}REGIM',f,re.I) or re.match(r'^[\W\d]*(NAME|RESIDENCE)\b',f,re.I) or re.match(r'^\W*\d{3}\W*(\bNAME.*)?$',f):
        # page header line; also catch "NAME. RESIDENCE. DATE. REMARKS."
        continue
    if re.match(r'^(NAME|RESIDENCE|DATE|REMARKS)\W*(\s+(NAME|RESIDENCE|DATE|REMARKS)\W*)*$',f,re.I): continue
    if r['start']:
        cur=dict(page=r['page'],y=r['y'],company=company,section=section,name=r['n'],res=r['r'],date=r['d'],rem=r['m'],raw=[f])
        recs.append(cur)
    elif cur is not None and r['page']==cur['page'] or (cur is not None and r['y']<500):
        # continuation (or continuation across page: header lines excluded)
        if r['n'] and not r['r'] and not r['d'] and not r['m']:
            # sub-heading (Captains., Sergeants.) or name continuation
            if re.match(r'^[A-Z][a-z]+s?\.?$|^(1st|2nd|Q\.)',r['n']) and len(r['n'].split())<=3 and not re.search(r',',r['n']) and (section!='enlisted'):
                # heading
                if re.search(r'(Captain|Lieut|Sergeant|Corporal|Musician|Wagoner|Private|Surgeon|Chaplain|Colonel|Major|Adjutant|Steward|Quarter|Com\.|Principal)',r['n'],re.I):
                    cur=None;continue
            cur['name']+=' '+r['n']
        else:
            cur['name']+=(' '+r['n'] if r['n'] else '')
            cur['res']+=(' '+r['r'] if r['r'] else '')
            cur['date']+=(' '+r['d'] if r['d'] else '')
            cur['rem']+=(' '+r['m'] if r['m'] else '')
        cur['raw'].append(f)
json.dump(recs,open('../cache/wis6_records.json','w'))
from collections import Counter
print(len(recs),Counter(x['company'] for x in recs))
