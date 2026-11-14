"""Candidate sentence-extended quotes for citations whose sub-claims carry tokens that the quote lacks.
usage: python3 -I extend.py [ROW ...]   -> prints, per flagged (row, sub-claim, citation): the old quote, the extended quote (to the sentence start and end in the normalised text) and the claim tokens still missing."""
import sys, re, json, os, unicodedata
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B
import or27_find as F
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
rows = {json.loads(l)['id']: json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')}
exec(open(ROOT + '/tmp/tl-01/audit/tokctx.py').read().split('for r in rows:')[0].split("rows = [json")[0])  # STOP list only
def squash(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).lower())
STOP = set('''The A An On In At By For From To Of And Or But Not No Yes It Its His Her Their They He She We Our I You This That These Those There Then
Jun June Jul July Aug Sept Sep Oct Nov Dec Jan Feb Mar Apr May Monday Tuesday Wednesday Thursday Friday Saturday Sunday NOT OR SEED PDF
Official Records Union Confederate Rebel Rebels Federal Army Corps Division Brigade Regiment Battalion Company Cavalry Infantry Artillery
Gen General Maj Col Capt Lieut Lt Brig Mr Mrs Hon Dr Pvt Private Surg Surgeon Colonel Captain Major Lieutenant Brigadier Itinerary Compiler Jacobs
Richards Early Hill Lee Pierce Fremantle Alexander Stuart'''.split())
def toks(claim):
    t = []
    for m in re.finditer(r'\d[\d,.:]*\d|\d', claim): t.append(m.group(0).strip('.,:'))
    for m in re.finditer(r"\b([A-Z][a-z]+(?:['’][a-z]+)?)\b", claim):
        w = m.group(1)
        if w not in STOP and m.start() > 0: t.append(w)
    out = []; [out.append(x) for x in t if x not in out]; return out
ABBR = ('Gen', 'Col', 'Maj', 'Capt', 'Lieut', 'Lt', 'Brig', 'Mr', 'Mrs', 'Dr', 'Hon', 'Messrs', 'No', 'St', 'Co', 'Regt', 'Gov', 'Sergt', 'Sgt', 'Corp', 'Cav', 'Inf', 'Art', 'Va', 'Pa', 'Md', 'Ga', 'Ala', 'Miss', 'Wm', 'Geo', 'Jas', 'Jno', 'Thos', 'Chas', 'Maj.-Gen', 'Brig.-Gen', 'Lieut.-Col', 'Div', 'Brig', 'Bvt', 'Surg', 'Adjt', 'Ord', 'Comdg', 'Cos', 'Vol', 'Vols', 'Penn', 'Mass', 'Conn', 'Ind', 'Wis', 'Minn', 'Mich', 'Ill', 'Tenn', 'Ky', 'N', 'S', 'E', 'W', 'a', 'p')
_lb = ''.join('(?<!\\b%s[.?!;:])' % re.escape(a) for a in ABBR)
BOUND = re.compile(r'(?<![A-Z]\.)(?<=[a-z0-9)\]"”][.?!;:])' + _lb + r' (?=[A-Z0-9"“(\[])')
def ext(c, maxlen=900):
    if c['source_id'] == 'OR27':
        P = F.get_part(c['part']); nt, nm = P.ntext, P.nmap
    else:
        raw, nt, nm, rel, sha = B.lib_text(c['source_id'])
    q = c['quote']; i = nt.find(q)
    while i >= 0 and nm[i] != c['text_offset']: i = nt.find(q, i + 1)
    if i < 0: return None
    a = i
    for m in BOUND.finditer(nt, max(0, i - 500), i):
        a = m.end()
    if a == i and i > 0 and nt[i - 1] != ' ': a = i
    m = BOUND.search(nt, i + len(q))
    e = m.start() if m else min(len(nt), i + len(q) + 300)
    if e - a > maxlen: e = a + maxlen
    return nt[a:e].strip()
if __name__ == '__main__':
    only = set(sys.argv[1:])
    for l in open(ROOT + '/tmp/tl-01/audit/tokctx.pass3.txt', encoding='utf-8'):
        m = re.match(r'(T1-\d+) sub (\d+)\s+missing (\[.*?\])\s+NOT-NEARBY (\[.*\])', l)
        if not m or (only and m.group(1) not in only): continue
        rid, n = m.group(1), int(m.group(2)); r = rows[rid]; s = r['sub_claims'][n - 1]
        cit = {c['key']: c for c in r['citations']}
        print('=' * 100); print(rid, 'sub', n, '|', s['claim'][:240])
        for k in s['citations']:
            c = cit[k]; e = ext(c)
            blob = squash(c['quote'] + ' ' + (c.get('reading') or '')); eb = squash((e or '') + ' ' + (c.get('reading') or ''))
            miss_old = [t for t in toks(s['claim']) if squash(t) and squash(t) not in squash(' '.join(cit[x]['quote'] + ' ' + (cit[x].get('reading') or '') for x in s['citations']))]
            miss_new = [t for t in miss_old if squash(t) not in eb]
            print('  [%s p.%s] OLD: %s' % (k, c.get('printed_page'), c['quote'][:200]))
            print('       NEW (%d chars): %s' % (len(e or ''), (e or '')[:700]))
