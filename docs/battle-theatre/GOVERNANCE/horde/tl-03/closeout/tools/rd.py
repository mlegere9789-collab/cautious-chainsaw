"""Read an OR vol.27 report as normalised text with printed-page markers.
  python3 -I tmp/tl-03/tools/rd.py R029 [--page 247] [--len 5000] [--grep 'regex' -C 600] [--part N]
  record ids: R029 (pt.1 default), 2:R470, D0966 (pt.3).  --page N starts at the first text on printed page N (running heads give the markers)."""
import os, sys, re, json, bisect, argparse
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find as F
IDX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/library/or27_index.json'), encoding='utf-8'))['records']}

def resolve(s):
    if re.fullmatch(r'OR27-\d-[RD]\d+', s): return s
    if re.fullmatch(r'\d:[RD]\d+', s): p, r = s.split(':'); return 'OR27-%s-%s' % (p, r)
    if s.startswith('D'): return 'OR27-3-' + s
    return 'OR27-1-' + s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('rec'); ap.add_argument('--page'); ap.add_argument('--len', type=int, default=5000)
    ap.add_argument('--grep'); ap.add_argument('-C', type=int, default=500); ap.add_argument('--max', type=int, default=6)
    ap.add_argument('--start', type=int, default=0, help='start N normalised chars into the report')
    a = ap.parse_args()
    rid = resolve(a.rec); r = IDX[rid]; P = F.get_part(r['part'])
    ns = bisect.bisect_left(P.nmap, r['start_offset']); ne = bisect.bisect_left(P.nmap, r['end_offset'])
    # page markers inside the record
    marks = []
    for off, pg in zip(P.pm.offs, P.pm.pages):
        if r['start_offset'] <= off < r['end_offset']:
            marks.append((bisect.bisect_left(P.nmap, off), pg))
    def text_with_marks(s, e):
        out = []; last = s
        for i, pg in marks:
            if s <= i < e:
                out.append(P.ntext[last:i]); out.append(' [[p.%s]] ' % pg); last = i
        out.append(P.ntext[last:e]); return ''.join(out)
    print('RECORD', rid, r.get('rank'), r.get('author'), '| pp.', r.get('start_page'), '-', r.get('end_page'), '| norm chars', ne - ns, '| offsets', r['start_offset'], r['end_offset'])
    if a.grep:
        rx = re.compile(a.grep, re.I); n = 0
        for m in rx.finditer(P.ntext, ns, ne):
            n += 1
            if n > a.max: break
            s = max(ns, m.start() - a.C); e = min(ne, m.end() + a.C)
            pg = P.pm.page_at(P.nmap[m.start()])
            print('--- hit %d @ p.%s' % (n, pg['page'])); print(text_with_marks(s, e)); print()
        print('hits shown', min(n, a.max), 'of', sum(1 for _ in rx.finditer(P.ntext, ns, ne)))
        return
    s = ns + a.start
    if a.page:
        pg = int(a.page)
        for i, p in marks:
            if p == pg: s = i; break
        else:
            print('page marker', pg, 'not found; markers:', [p for _, p in marks][:40])
    print(text_with_marks(s, min(ne, s + a.len)))

if __name__ == '__main__':
    main()
