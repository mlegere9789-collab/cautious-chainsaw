"""Commander likeness pipeline (all network calls rate-limited, cached, identifying UA; Wikipedia/Commons APIs, read-only).
Inputs: commanders-seed.csv (from the repo OOB json), wp_match.json (OOB-link matches), wp_search_unmatched.json (search fallback).
Outputs: docs/battle-theatre/assets/data/commanders-likeness.csv"""
import sys, json, csv, re, os, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from wp import get
API = 'https://en.wikipedia.org/w/api.php'
COMMONS = 'https://commons.wikimedia.org/w/api.php'
ROOT = 'C:/Users/mlege/gettysburg-map/'
seed = list(csv.DictReader(open(ROOT + 'docs/battle-theatre/assets/data/commanders-seed.csv', encoding='utf8')))
info = json.load(open('wp_links_info.json'))
match = json.load(open('wp_match.json'))
srch = json.load(open('wp_search_unmatched.json'))

# ---- 1. resolve each distinct name -> wikipedia title (or None)
def pick(cands):
    by = {}
    for t in cands:
        v = info[t]
        by.setdefault(v['qid'] or t, t)
    return list(by.values())
resolved = {}
for nm, c in match.items():
    p = pick(c) if c else []
    if len(p) == 1:
        resolved[nm] = (p[0], 'oob-link')
    elif len(p) > 1:
        resolved[nm] = (sorted(p, key=len)[0], 'oob-link-ambiguous')
CIVIL = re.compile(r'Civil War|Confederate|Union Army|Union officer|Gettysburg|brigadier|colonel|regiment', re.I)
for nm, v in srch.items():
    h = v.get('hit')
    if not h:
        continue
    ex = h.get('extract', '')
    m = re.search(r'\((?:[A-Za-z]+ \d+, )?(\d{4})', ex)
    by = int(m.group(1)) if m else None
    if CIVIL.search(ex) and by and 1780 <= by <= 1850:
        resolved[nm] = (h['title'], 'search-verified')
print('resolved', len(resolved), {k: sum(1 for v in resolved.values() if v[1] == k) for k in set(v[1] for v in resolved.values())})

# ---- 2. page images + wikitext facts
titles = sorted(set(v[0] for v in resolved.values()))
page = {}
for i in range(0, len(titles), 40):
    b = titles[i:i + 40]
    d = get(API, {'action': 'query', 'titles': '|'.join(b), 'prop': 'pageimages|pageprops|info', 'piprop': 'name|original', 'ppprop': 'wikibase_item', 'inprop': 'url', 'format': 'json', 'redirects': 1, 'pilimit': 'max'}, delay=1.0)
    q = d['query']
    red = {r['from']: r['to'] for r in q.get('redirects', [])}
    for p in q['pages'].values():
        page[p['title']] = {'img': p.get('pageimage'), 'orig': p.get('original', {}).get('source'), 'qid': p.get('pageprops', {}).get('wikibase_item'), 'url': p.get('fullurl')}
    for f, t in red.items():
        page.setdefault(f, page.get(t))
print('pages', len(page))
text = {}
for i in range(0, len(titles), 12):
    b = titles[i:i + 12]
    d = get(API, {'action': 'query', 'titles': '|'.join(b), 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'format': 'json', 'redirects': 1}, delay=1.0)
    q = d['query']
    red = {r['from']: r['to'] for r in q.get('redirects', [])}
    for p in q['pages'].values():
        rv = p.get('revisions')
        if rv:
            text[p['title']] = rv[0]['slots']['main'].get('*', '')
    for f, t in red.items():
        if t in text:
            text[f] = text[t]
print('texts', len(text))

# ---- 3. file metadata (licence, description) for lead images
files = sorted(set('File:' + v['img'] for v in page.values() if v and v.get('img')))
meta = {}
for i in range(0, len(files), 30):
    b = files[i:i + 30]
    d = get(COMMONS, {'action': 'query', 'titles': '|'.join(b), 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiextmetadatafilter': 'LicenseShortName|ImageDescription|Artist|DateTimeOriginal|Credit|ObjectName|Categories|UsageTerms', 'format': 'json'}, delay=1.0)
    for p in d['query']['pages'].values():
        ii = (p.get('imageinfo') or [{}])[0]
        em = ii.get('extmetadata', {})
        meta[p['title'].replace(' ', '_')[5:]] = {
            'url': ii.get('descriptionurl') or ii.get('url'), 'file_url': ii.get('url'), 'w': ii.get('width'), 'h': ii.get('height'),
            'license': (em.get('LicenseShortName') or {}).get('value'), 'desc': re.sub('<[^>]+>', '', (em.get('ImageDescription') or {}).get('value', ''))[:300],
            'date': re.sub('<[^>]+>', '', (em.get('DateTimeOriginal') or {}).get('value', ''))[:60], 'cats': (em.get('Categories') or {}).get('value', '')[:300]}
print('file meta', len(meta))

def clean_wikitext(t):
    t = re.sub(r'\{\{[^{}]*\}\}', ' ', t)
    t = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', ' ', t, flags=re.S)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"'{2,}", '', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', t)
FACT = {
    'height': re.compile(r'[^.]*\b(?:\d\s?(?:ft|feet|foot)|\d\s?(?:in\.|inches)|tall(?:est)?\b|stood\s+\d|height\b)[^.]*\.', re.I),
    'facial_hair': re.compile(r'[^.]*\b(?:beard|mustache|moustache|whisker|sideburn|side-whisker|goatee|clean-shaven|chin[- ]whisker)[^.]*\.', re.I),
    'horse': re.compile(r'[^.]*\b(?:his horse|horse named|rode (?:a|the|his)|mount(?:ed)? (?:on|named)|charger|stallion|mare named|horse,)[^.]*\.', re.I),
    'build_look': re.compile(r'[^.]*\b(?:stout|portly|slender|slim|thin|burly|heavy[- ]set|stocky|bald|balding|red[- ]haired|blond|blue eyes|gray eyes|dark hair|handsome|short in stature|small in stature|large man|corpulent|obese|lame|one-armed|wooden leg|amputat)[^.]*\.', re.I),
}
facts = {}
for t, wt in text.items():
    ct = clean_wikitext(wt)
    f = {}
    for k, rx in FACT.items():
        hits = [m.group(0).strip()[:260] for m in rx.finditer(ct)]
        # keep sentences that look like physical/horse facts about the man (very light filter: skip ones with other war context for height)
        f[k] = hits[:2]
    facts[t] = f

# ---- 4. likeness classification
def classify(fname, m):
    s = (fname + ' ' + (m or {}).get('desc', '') + ' ' + (m or {}).get('cats', '')).lower()
    if re.search(r'monument|statue|memorial|grave|map|signature|flag|battle of|painting of battle|house|cemetery|logo|seal', s) and not re.search(r'portrait|photograph', s):
        return 'non-portrait-image'
    if re.search(r'engraving|lithograph|woodcut|illustration|etching|print\b|bep|sketch|drawing', s):
        return 'engraving/print'
    if re.search(r'painting|oil on|portrait by|oil portrait', s):
        return 'painting'
    if re.search(r'photograph|carte|cdv|daguerreotype|ambrotype|tintype|lccn|cwpb|brady|gardner|matthew|npg|steele|photo|cabinet|studio', s):
        return 'photograph'
    return 'image (type not auto-classified)'

rows = []
for r in seed:
    nm = r['name']
    row = dict(r)
    res = resolved.get(nm)
    row.update(wp_title='', wp_match_method='', wp_qid='', wp_url='', lead_image='', image_page='', image_license='', image_date='', image_desc='', likeness_status='', likeness_type='', height_facts='', facial_hair_facts='', horse_facts='', build_look_facts='')
    if not r['rank']:
        row['likeness_status'] = 'not-a-person-row'
        rows.append(row); continue
    if res:
        t, how = res
        pg = page.get(t) or {}
        row['wp_title'] = t; row['wp_match_method'] = how; row['wp_qid'] = (pg or {}).get('qid') or ''; row['wp_url'] = (pg or {}).get('url') or ''
        img = (pg or {}).get('img')
        if img:
            m = meta.get(img, {})
            row['lead_image'] = img; row['image_page'] = m.get('url', ''); row['image_license'] = m.get('license') or ''; row['image_date'] = m.get('date', ''); row['image_desc'] = m.get('desc', '')
            row['likeness_type'] = classify(img, m)
            row['likeness_status'] = 'wikipedia-lead-image'
        else:
            row['likeness_status'] = 'wikipedia-page-no-image'
        f = facts.get(t, {})
        row['height_facts'] = ' | '.join(f.get('height', [])); row['facial_hair_facts'] = ' | '.join(f.get('facial_hair', []))
        row['horse_facts'] = ' | '.join(f.get('horse', [])); row['build_look_facts'] = ' | '.join(f.get('build_look', []))
    else:
        row['likeness_status'] = 'no-wikipedia-page-found-in-first-pass'
    rows.append(row)
out = ROOT + 'docs/battle-theatre/assets/data/commanders-likeness.csv'
w = csv.DictWriter(open(out, 'w', newline='', encoding='utf8'), fieldnames=list(rows[0].keys()))
w.writeheader(); w.writerows(rows)
print('wrote', out, len(rows))
from collections import Counter
print(Counter(r['likeness_status'] for r in rows))
print(Counter(r['likeness_type'] for r in rows if r['likeness_type']))
