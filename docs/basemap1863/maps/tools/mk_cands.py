import json, os, random
from common import *
n = json.load(open(os.path.join(TMP, 'ref', 'road_nodes.json')))
maj = {'US Hwy 15','Baltimore Pike','Baltimore St','Biglerville Rd','Buford Ave','Carlisle St','Chambersburg Rd','Chambersburg St','E Broadway','Emmitsburg Rd','Fairfield Rd','Hanover Rd','Hanover St','Harrisburg St','Old Harrisburg Rd','S Washington St','State Rte 116','State Rte 134','State Rte 34','State Rte 97','Steinwehr Ave','Taneytown Rd','US Hwy 15 Bus','US Hwy 30','York Rd','York St','Hunterstown Rd','Sachs Rd','Wheatfield Rd','Millerstown Rd','Knoxlyn Rd','Table Rock Rd','Mummasburg Rd','Cashtown Rd','Spangler Spring Rd','Blacksmith Shop Rd','Granite Schoolhouse Ln','Long Ln','Willoughby Run Rd'}
m = [x for x in n if (x['a'] in maj or x['b'] in maj) and 303700 < x['e'] < 312300 and 4405700 < x['n'] < 4414700 and x['a'] != 'US Hwy 15' and x['b'] != 'US Hwy 15' and x['a'] != 'US Hwy 15 Bus' and x['b'] != 'US Hwy 15 Bus']
# thin to 120 m spacing
random.seed(1); random.shuffle(m); keep = []
for x in m:
    if all((x['e'] - k['e']) ** 2 + (x['n'] - k['n']) ** 2 > 150 ** 2 for k in keep): keep.append(x)
keep.sort(key=lambda k: (-k['n'] // 700, k['e']))
for i, k in enumerate(keep): k['id'] = 'C%03d' % i
json.dump(keep, open(os.path.join(TMP, 'ref', 'cands.json'), 'w'))
print(len(keep))
