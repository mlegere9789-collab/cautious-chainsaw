import sys, json, urllib.parse
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f

def search(q, name, rows=60):
    u = ('https://archive.org/advancedsearch.php?q=' + urllib.parse.quote(q) +
         '&fl[]=identifier&fl[]=title&fl[]=volume&fl[]=year&fl[]=creator&fl[]=possible-copyright-status&rows=%d&output=json' % rows)
    d = f.getjson(u, name)
    return d['response']['docs'] if d else []

if __name__ == '__main__':
    q = sys.argv[1]
    name = sys.argv[2]
    for x in search(q, name):
        print(x.get('identifier'), '|', x.get('year'), '|', x.get('volume'), '|', (x.get('title') or '')[:90], '|', x.get('possible-copyright-status'))
