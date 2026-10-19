import sys, re, json, os
sys.path.insert(0, os.path.dirname(__file__))
from wp import get
API = 'https://en.wikipedia.org/w/api.php'
CAND = [
 ('Union', '5th New York Infantry Regiment'), ('Union', '14th Brooklyn'), ('Union', '84th New York Infantry Regiment'), ('Union', '114th Pennsylvania Infantry Regiment'), ('Union', '140th New York Infantry Regiment'),
 ('Union', '146th New York Infantry Regiment'), ('Union', '155th Pennsylvania Infantry Regiment'), ('Union', '23rd Pennsylvania Infantry Regiment'), ('Union', '95th Pennsylvania Infantry Regiment'),
 ('Union', '72nd Pennsylvania Infantry Regiment'), ('Union', '73rd New York Infantry Regiment'), ('Union', '39th New York Infantry Regiment'), ('Union', '11th New York Infantry Regiment'),
 ('Union', '1st United States Sharpshooters'), ('Union', '2nd United States Sharpshooters'), ('Union', '42nd Pennsylvania Infantry Regiment'), ('Union', '149th Pennsylvania Infantry Regiment'), ('Union', '150th Pennsylvania Infantry Regiment'),
 ('Union', 'Iron Brigade'), ('Union', '24th Michigan Infantry Regiment'), ('Union', '6th Wisconsin Infantry Regiment'), ('Union', '19th Indiana Infantry Regiment'), ('Union', '20th Maine Infantry Regiment'),
 ('Union', '1st Minnesota Infantry Regiment'), ('Union', '69th New York Infantry Regiment'), ('Union', '116th Pennsylvania Infantry Regiment'), ('Union', '88th New York Infantry Regiment'), ('Union', '28th Massachusetts Infantry Regiment'),
 ('Union', '12th New Hampshire Infantry Regiment'), ('Union', '1st Vermont Cavalry Regiment'), ('Union', '6th Michigan Cavalry Regiment'), ('Union', '5th Michigan Cavalry Regiment'), ('Union', '7th Michigan Cavalry Regiment'), ('Union', '1st Maine Cavalry Regiment'),
 ('Union', '8th Illinois Cavalry Regiment'), ('Union', '17th Pennsylvania Cavalry Regiment'), ('Union', '3rd Indiana Cavalry Regiment'), ('Union', '9th New York Cavalry Regiment'), ('Union', '1st New York Dragoons'),
 ('Union', '1st Delaware Infantry Regiment'), ('Union', '12th New York Infantry Regiment'), ('Union', '44th New York Infantry Regiment'), ('Union', '83rd Pennsylvania Infantry Regiment'), ('Union', '16th Michigan Infantry Regiment'),
 ('Union', '2nd New Hampshire Infantry Regiment'), ('Union', '15th Massachusetts Infantry Regiment'), ('Union', '82nd New York Infantry Regiment'), ('Union', '1st Pennsylvania Reserves'), ('Union', '13th Pennsylvania Reserves'), ('Union', '2nd Wisconsin Infantry Regiment'), ('Union', '7th Wisconsin Infantry Regiment'),
 ('Confederate', 'Louisiana Tigers'), ('Confederate', 'Hays\'s Louisiana Brigade'), ('Confederate', '5th Texas Infantry Regiment'), ('Confederate', '1st Texas Infantry Regiment'), ('Confederate', '4th Texas Infantry Regiment'), ('Confederate', 'Texas Brigade'),
 ('Confederate', '15th Alabama Infantry Regiment'), ('Confederate', '26th North Carolina Infantry Regiment'), ('Confederate', '1st Maryland Cavalry Battalion'), ('Confederate', '1st Virginia Cavalry Regiment'), ('Confederate', 'Stonewall Brigade'),
 ('Confederate', '2nd South Carolina Infantry Regiment'), ('Confederate', '1st South Carolina Rifles'), ('Confederate', '9th Louisiana Infantry Regiment'), ('Confederate', '2nd Mississippi Infantry Regiment'), ('Confederate', '21st Mississippi Infantry Regiment'),
 ('Confederate', '8th Alabama Infantry Regiment'), ('Confederate', '11th Mississippi Infantry Regiment'), ('Confederate', '1st North Carolina Cavalry Regiment'), ('Confederate', '18th Virginia Cavalry Regiment'), ('Confederate', 'Phillips Legion'),
 ('Confederate', 'Cobb\'s Legion'), ('Confederate', 'Hampton Legion'), ('Confederate', 'Washington Artillery'), ('Confederate', 'Richmond Howitzers'), ('Confederate', '1st North Carolina Sharpshooter Battalion'), ('Confederate', 'Maryland Line'), ('Confederate', '1st Maryland Infantry Battalion'),
 ('Confederate', 'Wheat\'s Tigers'), ('Confederate', '1st Louisiana Special Battalion'),
]
KW = re.compile(r'[^.]*\b(?:uniform|Zouave|zouave|fez|kepi|Hardee|slouch|jacket|trousers|bucktail|buck-tail|green coat|sharpshooter uniform|red cap|red kepi|red trousers|baggy|gray jackets|gray uniform|butternut|shoeless|barefoot|dressed in|clad|wore|worn|garb)[^.]*\.', re.I)
def clean(t):
    t = re.sub(r'\{\{[^{}]*\}\}', ' ', t)
    t = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', ' ', t, flags=re.S)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"'{2,}", '', t); t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', t)
out = {}
for side, title in CAND:
    d = get(API, {'action': 'query', 'titles': title, 'prop': 'revisions|info', 'rvprop': 'content', 'rvslots': 'main', 'inprop': 'url', 'format': 'json', 'redirects': 1}, delay=1.0)
    p = list(d['query']['pages'].values())[0]
    if 'revisions' not in p:
        out[title] = {'side': side, 'missing': True}; continue
    txt = clean(p['revisions'][0]['slots']['main'].get('*', ''))
    sents = [m.group(0).strip()[:300] for m in KW.finditer(txt)]
    gett = bool(re.search(r'Gettysburg', txt))
    out[title] = {'side': side, 'url': p.get('fullurl'), 'page_title': p['title'], 'gettysburg_mentioned': gett, 'uniform_sentences': sents[:5]}
json.dump(out, open('kit_regiments.json', 'w'), indent=1)
for t, v in out.items():
    print('==', v['side'], t, '|', 'MISSING' if v.get('missing') else ('Gettysburg' if v['gettysburg_mentioned'] else 'no-Gettysburg-mention'))
    for s in v.get('uniform_sentences', [])[:3]:
        print('    -', s[:230])
