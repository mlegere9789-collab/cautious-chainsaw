"""Grep one or more OR27 records on the whitespace-normalised, hyphen-joined text with printed-page markers.
   python3 -I rn.py OR27-1-R076,OR27-1-R101 'regex' [width]"""
import sys, re
sys.path.insert(0, '/home/user/cautious-chainsaw/tools/bt')
import or27_dump as D
ids = sys.argv[1].split(','); rx = re.compile(sys.argv[2], re.I); w = int(sys.argv[3]) if len(sys.argv) > 3 else 300
for rid in ids:
    t = ' '.join(D.dump(rid).split())
    print('==', rid, t[:90].replace('###', ''))
    for m in rx.finditer(t):
        a = max(0, m.start() - w // 2); b = min(len(t), m.end() + w // 2)
        pg = t.rfind('[[p.', 0, m.start()); pgs = t[pg:pg + 12].split(']]')[0] + ']]' if pg >= 0 else ''
        print('  %s ...%s<<%s>>%s...' % (pgs, t[a:m.start()], m.group(0), t[m.end():b]))
