import json
um=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'))
out={'family':'NY','note':'OOB units of the New York family (union_regiments_*.json, union_cavalry_artillery.json, union_artillery.json) with the NYSMM unit page that carries the Register PDF. roster_from names the unit whose roster file also covers this OOB entry.','units':{}}
alias={'U-14BK':('U-84NY','alias of the 84th NY (14th Brooklyn); same men'),
       'U-2NY-CAV-b':('U-2NY-CAV','detachment of the 2nd NY Cavalry (Richmond\'s brigade); the Register does not say which men were in the detachment'),
       'U-5NY-CAV-b':('U-5NY-CAV','detachment of the 5th NY Cavalry (Richmond\'s brigade); the Register does not say which men were in the detachment'),
       'U-ART-L1NY-I':('U-ART-L1NY','same battery listed a second time under I Corps artillery')}
for k,u in sorted(um.items()):
    e={'designation':u['designation'],'arm':u['arm'],'oob_strength':u['strength'],'oob_casualties':u['casualties'],'brigade':u.get('brigade'),'nysmm_page':u['page']}
    if k in alias: e['roster_from'],e['note']=alias[k]
    else: e['roster_from']=None
    if k=='U-107NY': e['note']='OOB DEFECT: this entry sits in Paul\'s brigade (U-I-2-1). OR 27 pt 1 organisation lists the 107th PENNSYLVANIA in that brigade, not a 107th New York (OR 27/1, I Corps, 2d Div, 1st Brig). The 107th New York is U-107NY-XII (Colgrove\'s brigade). No New York roster is built for this entry.'; e['oob_defect']=True; e['nysmm_page']=None
    out['units'][k]=e
json.dump(out,open(r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\NY\unit_map.json','w',encoding='utf-8'),indent=1)
print(len(out['units']))
