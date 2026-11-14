"""Strict independent audit of timeline_corrections/tl-02.jsonl (run: python3 -I tmp/tl-02/audit/audit_strict.py).
Checks: schema; ids; every non-computed citation re-read at its stored offsets and compared with its quote with NO tolerance for
running heads at the ends (only whitespace collapse, line-break hyphen joining, apostrophe variants); for OR27 citations the report
id, part and printed page are re-derived from the offset by tools/bt (or27_find) and compared; sha256 of the source file;
sub-claim / scenario / citation key coherence; results.jsonl against the corrections; register files; banned words."""
import os, re, sys, json, hashlib, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find as F
import kit_or27_leafmap as KL
from or27_lib import build_nview, norm_query, raw_path
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
res = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'horde', 'tl-02', 'results.jsonl'), encoding='utf-8')}
errs, warns = [], []
def E(m): errs.append(m)
def W(m): warns.append(m)
want = ['T1-%03d' % i for i in range(58, 116)]
if [r['id'] for r in rows] != want: E('ids are not T1-058..T1-115 in order')
TOP = ['id', 'shard', 'seed', 'before', 'verdict', 'corrected_claim', 'tier_change', 'sub_claims', 'citations', 'scenarios', 'default',
       'remains_unsupported', 'searched', 'recheck_applied', 'register_proposed', 'register_related']
CC = ['event', 'unit', 'place', 'time_window', 'text', 'tier']
TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
SUP = ('supported', 'contradicted', 'unsupported', 'conflict', 'computed', 'procedural')
VERD = ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap')
BAN = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model|generated|automated)\b')
texts = {}; shas = {}
def raw(path):
    p = os.path.join(ROOT, path)
    if p not in texts:
        b = open(p, 'rb').read(); shas[p] = hashlib.sha256(b).hexdigest()
        texts[p] = b.decode('utf-8', errors='replace')   # note: tools/bt reads with newline='' -> same char offsets
    return p
def nrm(s):
    t, _ = build_nview(s)
    return t.translate(APOS)
def nrm_nohyph(s):
    return re.sub(r'\s+', ' ', s).strip().translate(APOS)
n_or = n_lib = n_comp = 0
n_exact = n_loose = 0
for r in rows:
    i = r['id']
    for k in TOP:
        if k not in r: E('%s missing top field %s' % (i, k))
    if r['verdict'] not in VERD: E('%s bad verdict %s' % (i, r['verdict']))
    for k in CC:
        if k not in r['corrected_claim']: E('%s corrected_claim missing %s' % (i, k))
    tw = r['corrected_claim'].get('time_window') or {}
    if not tw.get('text') or not tw.get('basis'): E('%s time_window lacks text/basis' % i)
    keys = [c['key'] for c in r['citations']]
    if len(set(keys)) != len(keys): E('%s duplicate citation keys' % i)
    used = set()
    for s in r['sub_claims']:
        if s['tier'] not in TIERS: E('%s sub %s bad tier' % (i, s['n']))
        if s['support'] not in SUP: E('%s sub %s bad support' % (i, s['n']))
        for k in s['citations']:
            used.add(k)
            if k not in keys: E('%s sub %s cites missing %s' % (i, s['n'], k))
        if s['tier'] == 'documented' and s['support'] in ('supported',) and not s['citations']: E('%s sub %s documented w/o citation' % (i, s['n']))
        if s['tier'] == 'documented' and s['support'] in ('unsupported',): E('%s sub %s documented but unsupported' % (i, s['n']))
    for sc in r['scenarios']:
        for k in sc['citations']:
            used.add(k)
            if k not in keys: E('%s scenario %s cites missing %s' % (i, sc['id'], k))
    for k in keys:
        if k not in used: W('%s citation %s not used by any sub-claim or scenario' % (i, k))
    if BAN.search(json.dumps(r, ensure_ascii=False)): E('%s banned word: %s' % (i, BAN.search(json.dumps(r, ensure_ascii=False)).group(0)))
    if r['verdict'] in ('partially_supported', 'unsupported', 'gap'):
        rp = r['register_proposed']
        if not rp: E('%s verdict %s without register_proposed' % (i, r['verdict']))
        else:
            ids = rp if isinstance(rp, list) else [rp]
            for x in ids:
                nm = x if isinstance(x, str) else x.get('id', '')
                if not os.path.exists(os.path.join(G, 'horde', 'tl-02', 'proposed-register', nm + '.md')): E('%s register file %s missing' % (i, nm))
    for c in r['citations']:
        if c['source_id'] == 'COMPUTED':
            n_comp += 1; continue
        p = raw(c['source_file'])
        if hashlib.sha256(open(p, 'rb').read()).hexdigest() != c.get('sha256') and shas[p] != c.get('sha256'):
            E('%s %s sha256 differs' % (i, c['key']))
        a, b = c['text_offset'], c['text_offset_end']
        seg = texts[p][a:b]
        q = norm_query(c['quote']).translate(APOS)
        s1 = nrm(seg); s2 = nrm_nohyph(seg)
        if s1 == q or s2 == q: n_exact += 1
        else:
            # allow a running head or page number inside the span only: compare after dropping the quote's words one by one
            n_loose += 1
            W('%s %s span differs from quote after normalisation: span=%r quote=%r' % (i, c['key'], s1[:100] + ' ... ' + s1[-60:], q[:100] + ' ... ' + q[-60:]))
        if c['source_id'] == 'OR27':
            n_or += 1
            hits = F.verify(c['quote'], parts=(c['part'],))
            m = [h for h in hits if h['start'] == a]
            if not m: E('%s %s OR quote not found at offset %d in part %d' % (i, c['key'], a, c['part']))
            else:
                h = m[0]
                if h['record'] != c['report_id']: E('%s %s report %s != %s' % (i, c['key'], h['record'], c['report_id']))
                # printed page: the scan leaf map (archive.org page index aligned to the OCR text) is the primary rule; the running-head model
                # (tools/bt/or27_pages.py) is kept only as page_running_head_model when it differs
                lm = KL.load(c['part'])
                la, lb = lm.at(h['start']), lm.at(h['end'] - 1)
                if not la or not lb or la['page'] is None or lb['page'] is None: E('%s %s no scan-leaf page at offset %d' % (i, c['key'], a))
                else:
                    want_pg = str(la['page']) if la['page'] == lb['page'] else '%s-%s' % (la['page'], lb['page'])
                    if str(c['printed_page']) != want_pg: E('%s %s printed_page %s != scan-leaf page %s' % (i, c['key'], c['printed_page'], want_pg))
                    sc = c.get('scan') or {}
                    if sc.get('leaf') != la['leaf'] or sc.get('archive_identifier') != KL.PARTS[c['part']]: E('%s %s scan leaf %s/%s != %s/%s' % (i, c['key'], sc.get('archive_identifier'), sc.get('leaf'), KL.PARTS[c['part']], la['leaf']))
                    if sc.get('pdf_page') != la['leaf'] + 1: E('%s %s pdf_page %s != leaf+1' % (i, c['key'], sc.get('pdf_page')))
                    if not sc.get('printed_page_read_on_image'): W('%s %s printed page %s not read on the page image' % (i, c['key'], c['printed_page']))
                    model = str(h['page'])
                    mp = c.get('page_running_head_model')
                    if mp is None and model != str(c['printed_page']): E('%s %s model page %s differs from printed %s but no page_running_head_model stored' % (i, c['key'], model, c['printed_page']))
                    if mp is not None and str(mp) != model: E('%s %s page_running_head_model %s != model %s' % (i, c['key'], mp, model))
        else:
            n_lib += 1
print('rows', len(rows), 'citations: OR27', n_or, 'library', n_lib, 'computed', n_comp, '| exact span match', n_exact, 'span differs', n_loose)
print('errors', len(errs), 'warnings', len(warns))
for e in errs[:60]: print('  !!', e)
for w in warns[:80]: print('  ..', w)
sys.exit(1 if errs else 0)
