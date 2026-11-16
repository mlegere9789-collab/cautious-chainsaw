"""python3 -I tmp/tl-02/ver2/ctxshow.py T1-076:ooba_peg [--b 400 --a 900] ...  prints source context of stored citations (second reader)"""
import os, sys, json, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-02.jsonl'), encoding='utf-8')}
args = sys.argv[1:]; B = 400; A = 900
if '--b' in args: i = args.index('--b'); B = int(args[i+1]); del args[i:i+2]
if '--a' in args: i = args.index('--a'); A = int(args[i+1]); del args[i:i+2]
for a in args:
    rid, key = a.split(':')
    c = next(c for c in rows[rid]['citations'] if c['key'] == key)
    t = open(os.path.join(ROOT, c['source_file']), encoding='utf-8', errors='replace', newline='').read()
    s = t[max(0, c['text_offset'] - B):c['text_offset_end'] + A]
    s = re.sub(r'[ \t]*\n[ \t]*', ' / ', s); s = re.sub(r'\s{2,}', ' ', s)
    print('=====', a, 'p.%s' % c['printed_page'], '@%d' % c['text_offset'])
    print('QUOTE:', c['quote'][:200])
    print('CTX  :', s)
