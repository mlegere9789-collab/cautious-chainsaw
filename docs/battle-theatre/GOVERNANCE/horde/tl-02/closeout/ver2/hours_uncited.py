"""List clock times in the narrative sources that no citation of the corrections file covers (second reader).
   python3 -I tmp/tl-02/ver2/hours_uncited.py SRC [SRC...]  (source ids of the library) [--kw REGEX] [--w 130]"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tmp', 'tl-02')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import ws9find
args = sys.argv[1:]; KW = r'Buford|Reynolds|Heth|Archer|Calef|cavalry|picket|Gamble|Devin|Wadsworth|Cutler|Meredith|Hall|Howard|Rodes|Ewell|Doubleday|Pegram|Early|Davis|Burns|Pettigrew|Pender|Hill|Seminary|Gettysburg'; W = 130
if '--kw' in args: i = args.index('--kw'); KW = args[i+1]; del args[i:i+2]
if '--w' in args: i = args.index('--w'); W = int(args[i+1]); del args[i:i+2]
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-02.jsonl'), encoding='utf-8')]
cov = {}
for r in rows:
    for c in r['citations']:
        if c['source_id'] != 'COMPUTED':
            cov.setdefault(c['source_id'], []).append((c['text_offset'], c['text_offset_end']))
HR = re.compile(r"(?<![\d.,])(\d{1,2}[.:]\d{2}|\d{1,2}[J½]?) ?(?:[AaPp]\.? ?[Mm]\b|o'clock)|\bnoon\b|\bdaybreak\b|\bsunrise\b|half[- ]past (?:\w+)")
kw = re.compile(KW)
for sid in args:
    text, ntext, nmap, path = ws9find.load(sid)
    n = 0
    seen = set()
    for m in HR.finditer(ntext):
        a, b = nmap[m.start()], nmap[m.end() - 1]
        if any(x - 250 <= a <= y + 250 for x, y in cov.get(sid, [])): continue
        ctx = ntext[max(0, m.start() - W):m.end() + W]
        if not kw.search(ctx): continue
        key = ctx[:60]
        if key in seen: continue
        seen.add(key); n += 1
        print('[%s @%d] ...%s<<%s>>%s...' % (sid, a, ntext[max(0, m.start() - W):m.start()], m.group(0), ntext[m.end():m.end() + W]))
    print('#### %s uncited hour statements with a keyword: %d' % (sid, n))
